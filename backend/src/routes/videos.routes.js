const express = require('express');
const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const youtubeService = require('../services/youtube.service');
const transcriptionService = require('../services/transcription.service');
const llmService = require('../services/llm.service');
const ragService = require('../services/rag.service');
const lightragService = require('../services/lightrag.service');

// Use LightRAG if enabled
const USE_LIGHTRAG = process.env.USE_LIGHTRAG === 'true';

// Create prisma instance for background processing
const prisma = new PrismaClient();

/**
 * GET /api/videos - List all videos with filters
 */
router.get('/', async (req, res, next) => {
  try {
    const { categoryId, watchStatus, search, limit = 50, offset = 0 } = req.query;

    const where = {};
    if (categoryId) where.categoryId = categoryId;
    if (watchStatus) where.watchStatus = watchStatus;
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { author: { contains: search } }
      ];
    }

    const videos = await req.prisma.video.findMany({
      where,
      include: { category: true },
      orderBy: { createdAt: 'desc' },
      take: parseInt(limit),
      skip: parseInt(offset)
    });

    const total = await req.prisma.video.count({ where });

    res.json({
      videos: videos.map(v => ({
        ...v,
        tags: JSON.parse(v.tags || '[]'),
        summaryJson: v.summaryJson ? JSON.parse(v.summaryJson) : null
      })),
      total,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/videos/:id - Get video details
 */
router.get('/:id', async (req, res, next) => {
  try {
    const video = await req.prisma.video.findUnique({
      where: { id: req.params.id },
      include: { category: true, knowledgeGraph: true }
    });

    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }

    res.json({
      ...video,
      tags: JSON.parse(video.tags || '[]'),
      summaryJson: video.summaryJson ? JSON.parse(video.summaryJson) : null
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/videos - Add new video
 */
router.post('/', async (req, res, next) => {
  try {
    const { url, categoryId, tags = [] } = req.body;

    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    // Extract video ID
    const videoId = youtubeService.extractVideoId(url);

    // Check if video already exists
    const existing = await req.prisma.video.findUnique({
      where: { youtubeId: videoId }
    });

    if (existing) {
      return res.status(409).json({ 
        error: 'Video already exists',
        videoId: existing.id,
        video: {
          id: existing.id,
          title: existing.title,
          author: existing.author
        }
      });
    }

    // Get video metadata
    const metadata = await youtubeService.getVideoMetadataWithAPI(videoId);

    // Create video record
    const video = await req.prisma.video.create({
      data: {
        youtubeId: metadata.youtubeId,
        url: metadata.url,
        title: metadata.title,
        author: metadata.author,
        duration: metadata.duration,
        uploadDate: metadata.uploadDate,
        thumbnail: metadata.thumbnail,
        categoryId: categoryId || null,
        tags: JSON.stringify(tags)
      },
      include: { category: true }
    });

    // Start background processing
    processVideo(video.id).catch(err => 
      console.error('Background processing error:', err)
    );

    res.status(201).json({
      ...video,
      tags: JSON.parse(video.tags)
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/videos/batch - Batch import from playlist
 */
router.post('/batch', async (req, res, next) => {
  try {
    const { playlistId, categoryId } = req.body;

    if (!playlistId) {
      return res.status(400).json({ error: 'Playlist ID is required' });
    }

    // Get video IDs from playlist
    const videoIds = await youtubeService.getPlaylistVideos(playlistId);

    const results = {
      added: [],
      skipped: [],
      failed: []
    };

    for (const videoId of videoIds) {
      try {
        // Check if exists
        const existing = await req.prisma.video.findUnique({
          where: { youtubeId: videoId }
        });

        if (existing) {
          results.skipped.push(videoId);
          continue;
        }

        // Get metadata
        const metadata = await youtubeService.getVideoMetadataWithAPI(videoId);

        // Create video
        const video = await req.prisma.video.create({
          data: {
            youtubeId: metadata.youtubeId,
            url: metadata.url,
            title: metadata.title,
            author: metadata.author,
            duration: metadata.duration,
            uploadDate: metadata.uploadDate,
            thumbnail: metadata.thumbnail,
            categoryId: categoryId || null,
            tags: JSON.stringify([])
          }
        });

        results.added.push(video.id);

        // Start background processing
        processVideo(video.id).catch(err => 
          console.error('Background processing error:', err)
        );
      } catch (error) {
        console.error(`Failed to add video ${videoId}:`, error);
        results.failed.push(videoId);
      }
    }

    res.json(results);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/videos/:id/process - Trigger transcription and summarization
 */
router.post('/:id/process', async (req, res, next) => {
  try {
    const video = await req.prisma.video.findUnique({
      where: { id: req.params.id }
    });

    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }

    // Process in background
    processVideo(video.id)
      .then(() => console.log(`Video ${video.id} processed successfully`))
      .catch(err => console.error(`Error processing video ${video.id}:`, err));

    res.json({ message: 'Processing started', videoId: video.id });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/videos/:id - Update video
 */
router.put('/:id', async (req, res, next) => {
  try {
    const { title, categoryId, tags, watchStatus } = req.body;

    const updateData = {};
    if (title !== undefined) updateData.title = title;
    if (categoryId !== undefined) updateData.categoryId = categoryId;
    if (tags !== undefined) updateData.tags = JSON.stringify(tags);
    if (watchStatus !== undefined) updateData.watchStatus = watchStatus;

    const video = await req.prisma.video.update({
      where: { id: req.params.id },
      data: updateData,
      include: { category: true }
    });

    res.json({
      ...video,
      tags: JSON.parse(video.tags || '[]'),
      summaryJson: video.summaryJson ? JSON.parse(video.summaryJson) : null
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/videos/:id - Delete video
 */
router.delete('/:id', async (req, res, next) => {
  try {
    await req.prisma.video.delete({
      where: { id: req.params.id }
    });

    // Remove from RAG index
    await ragService.removeVideo(req.params.id);

    res.json({ message: 'Video deleted successfully' });
  } catch (error) {
    next(error);
  }
});

/**
 * Background processing function
 */
async function processVideo(videoId) {
  try {
    const video = await prisma.video.findUnique({
      where: { id: videoId }
    });

    if (!video) return;

    console.log(`Processing video: ${video.title}`);

    // Get transcription
    let transcription;
    try {
      transcription = await transcriptionService.getTranscript(video.youtubeId);
      
      await prisma.video.update({
        where: { id: videoId },
        data: { transcription: transcription.fullText }
      });
    } catch (error) {
      console.error(`Failed to get transcription for ${videoId}:`, error);
      return;
    }

    // Generate summary
    let summaryJson = null;
    try {
      const summary = await llmService.generateSummary(
        transcription.fullText,
        video.title
      );

      summaryJson = summary;

      await prisma.video.update({
        where: { id: videoId },
        data: { summaryJson: JSON.stringify(summary) }
      });
    } catch (error) {
      console.error(`Failed to generate summary for ${videoId}:`, error);
    }

    // Index for RAG/LightRAG
    try {
      if (USE_LIGHTRAG) {
        // Use LightRAG for knowledge graph
        console.log(`Indexing video ${videoId} with LightRAG...`);
        
        const content = {
          title: video.title,
          author: video.author,
          transcription: transcription.fullText,
          summary: summaryJson?.detailed || summaryJson?.quick || '',
          keyPoints: summaryJson?.keyPoints || []
        };

        await lightragService.insertVideo(videoId, content);
        
        // LightRAG automatically creates relationships, so we just mark it as indexed
        await prisma.knowledgeGraph.create({
          data: {
            videoId: videoId,
            embeddings: JSON.stringify({ provider: 'LightRAG' }),
            relationships: JSON.stringify([])
          }
        });
        
        console.log(`Video ${videoId} indexed with LightRAG successfully`);
        
        // Auto-upload to LightRAG Server if configured
        const LIGHTRAG_SERVER = process.env.LIGHTRAG_SERVER_URL;
        if (LIGHTRAG_SERVER) {
          try {
            console.log(`Auto-uploading video ${videoId} transcript to LightRAG Server...`);
            
            const axios = require('axios');
            const documentParts = [];
            
            // Document header
            documentParts.push(`=== YouTube Video: ${video.title} ===`);
            documentParts.push(`Author: ${video.author}`);
            documentParts.push(`Video ID: ${video.youtubeId}`);
            documentParts.push(`URL: ${video.url}`);
            documentParts.push(`Duration: ${video.duration || 'Unknown'}`);
            documentParts.push(`Upload Date: ${video.uploadDate || 'Unknown'}`);
            documentParts.push('');
            
            // Key Points (highest priority for knowledge extraction)
            if (summaryJson?.keyPoints && summaryJson.keyPoints.length > 0) {
              documentParts.push('--- Key Points ---');
              summaryJson.keyPoints.forEach((point, i) => {
                documentParts.push(`${i + 1}. ${point}`);
              });
              documentParts.push('');
            }
            
            // Summary
            if (summaryJson?.summary) {
              documentParts.push('--- Summary ---');
              documentParts.push(summaryJson.summary);
              documentParts.push('');
            }
            
            // Full Transcript (most important for LightRAG)
            documentParts.push('--- Full Transcript ---');
            documentParts.push(transcription.fullText);
            
            const documentText = documentParts.join('\n');
            const description = `YouTube: ${video.title} by ${video.author}`;

            console.log(`Document length: ${documentText.length} characters`);
            console.log(`Transcript length: ${transcription.fullText.length} characters`);

            const response = await axios.post(
              `${LIGHTRAG_SERVER}/documents/text`,
              { text: documentText, description },
              {
                headers: {
                  'Content-Type': 'application/json',
                  ...(process.env.LIGHTRAG_API_KEY ? { 'Authorization': `Bearer ${process.env.LIGHTRAG_API_KEY}` } : {})
                },
                timeout: 120000
              }
            );
            
            const trackId = response.data?.track_id;
            console.log(`Video ${videoId} auto-uploaded to LightRAG Server successfully`);
            console.log(`LightRAG Track ID: ${trackId}`);
            
            // Store track ID in video metadata
            if (trackId) {
              await prisma.video.update({
                where: { id: videoId },
                data: {
                  tags: JSON.stringify({
                    ...(JSON.parse(video.tags || '{}')),
                    lightrag_track_id: trackId,
                    lightrag_uploaded_at: new Date().toISOString()
                  })
                }
              });
            }
          } catch (uploadError) {
            console.error(`Failed to auto-upload video ${videoId} to LightRAG Server:`, uploadError.message);
            // Don't fail the whole process if upload fails
          }
        }
      } else {
        // Use simple RAG with Key Points
        await ragService.indexVideo(
          videoId, 
          transcription, 
          {
            title: video.title,
            author: video.author
          },
          summaryJson  // Pass summaryJson with key points
        );

        // Build relationships based on Key Points
        const relationships = await ragService.buildRelationships(videoId, summaryJson);

        await prisma.knowledgeGraph.create({
          data: {
            videoId: videoId,
            embeddings: JSON.stringify([]),
            relationships: JSON.stringify(relationships)
          }
        });
        
        console.log(`Video ${videoId} indexed with simple RAG successfully`);
      }
    } catch (error) {
      console.error(`Failed to index video ${videoId}:`, error);
    }

    console.log(`Video ${videoId} processed successfully`);
  } catch (error) {
    console.error(`Error in processVideo for ${videoId}:`, error);
  }
}

module.exports = router;

