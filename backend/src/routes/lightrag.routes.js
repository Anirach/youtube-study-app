const express = require('express');
const router = express.Router();
const axios = require('axios');

const LIGHTRAG_SERVER = process.env.LIGHTRAG_SERVER_URL || 'http://localhost:9621';

/**
 * POST /api/lightrag/documents/text - Upload text to LightRAG
 */
router.post('/documents/text', async (req, res, next) => {
  try {
    const { text, description } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'Text is required' });
    }

    console.log(`Uploading text to LightRAG: ${description || 'No description'}`);
    console.log(`Text length: ${text.length} characters`);

    try {
      // Forward to LightRAG server
      const response = await axios.post(
        `${LIGHTRAG_SERVER}/documents/text`,
        { text, description },
        {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 30000
        }
      );

      console.log('LightRAG response:', response.data);

      res.json({
        success: true,
        track_id: response.data.track_id,
        message: 'Text uploaded to LightRAG successfully'
      });
    } catch (axiosError) {
      console.error('LightRAG Server connection error:', axiosError.message);
      
      if (axiosError.code === 'ECONNREFUSED' || axiosError.code === 'ENOTFOUND') {
        return res.status(503).json({
          error: 'LightRAG Server is not available',
          message: 'Please ensure LightRAG Server is running on ' + LIGHTRAG_SERVER,
          suggestion: 'Start LightRAG server with: lightrag-server --port 9621'
        });
      }
      
      throw axiosError;
    }
  } catch (error) {
    console.error('Error uploading to LightRAG:', error.message);
    next(error);
  }
});

/**
 * GET /api/lightrag/track_status/:id - Get document processing status
 */
router.get('/track_status/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    try {
      const response = await axios.get(
        `${LIGHTRAG_SERVER}/track_status/${id}`,
        { timeout: 10000 }
      );

      res.json(response.data);
    } catch (axiosError) {
      console.error('LightRAG Server connection error:', axiosError.message);
      
      if (axiosError.code === 'ECONNREFUSED' || axiosError.code === 'ENOTFOUND') {
        return res.status(503).json({
          error: 'LightRAG Server is not available',
          message: 'Please ensure LightRAG Server is running on ' + LIGHTRAG_SERVER,
          track_id: id,
          status: 'unknown'
        });
      }
      
      throw axiosError;
    }
  } catch (error) {
    console.error('Error getting track status:', error.message);
    next(error);
  }
});

/**
 * POST /api/lightrag/query - Query LightRAG
 */
router.post('/query', async (req, res, next) => {
  try {
    const { 
      query, 
      mode = 'hybrid',
      include_references = true,
      include_chunk_content = false
    } = req.body;

    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    console.log(`Querying LightRAG: "${query}" (mode: ${mode})`);

    try {
      const response = await axios.post(
        `${LIGHTRAG_SERVER}/query`,
        {
          query,
          mode,
          include_references,
          include_chunk_content
        },
        {
          headers: {
            'Content-Type': 'application/json'
          },
          timeout: 60000
        }
      );

      res.json(response.data);
    } catch (axiosError) {
      console.error('LightRAG Server connection error:', axiosError.message);
      
      // Return friendly error if LightRAG server is not available
      if (axiosError.code === 'ECONNREFUSED' || axiosError.code === 'ENOTFOUND') {
        return res.status(503).json({
          error: 'LightRAG Server is not available',
          message: 'Please ensure LightRAG Server is running on ' + LIGHTRAG_SERVER,
          response: 'I apologize, but the LightRAG server is currently not available. Please ensure the server is running and try again.',
          suggestion: 'Start LightRAG server with: lightrag-server --port 9621'
        });
      }
      
      throw axiosError;
    }
  } catch (error) {
    console.error('Error querying LightRAG:', error.message);
    next(error);
  }
});

/**
 * POST /api/lightrag/auto-upload-videos - Auto-upload all videos to LightRAG
 */
router.post('/auto-upload-videos', async (req, res, next) => {
  try {
    const prisma = req.prisma;
    
    // Get all videos with transcription
    const videos = await prisma.video.findMany({
      where: {
        transcription: {
          not: null
        }
      }
    });

    console.log(`Auto-uploading ${videos.length} videos to LightRAG Server...`);

    const results = {
      total: videos.length,
      uploaded: 0,
      skipped: 0,
      failed: 0,
      errors: []
    };

    for (const video of videos) {
      try {
        // Check if already uploaded
        const tags = video.tags ? JSON.parse(video.tags) : {};
        if (tags.lightrag_track_id) {
          console.log(`Video ${video.id} already uploaded, skipping...`);
          results.skipped++;
          continue;
        }

        // Parse summary
        let summaryJson = null;
        if (video.summaryJson) {
          try {
            summaryJson = JSON.parse(video.summaryJson);
          } catch (e) {
            console.error(`Failed to parse summaryJson for video ${video.id}`);
          }
        }

        // Build document
        const documentParts = [];
        documentParts.push(`=== YouTube Video: ${video.title} ===`);
        documentParts.push(`Author: ${video.author}`);
        documentParts.push(`Video ID: ${video.youtubeId}`);
        documentParts.push(`URL: ${video.url}`);
        documentParts.push(`Duration: ${video.duration || 'Unknown'}`);
        documentParts.push(`Upload Date: ${video.uploadDate || 'Unknown'}`);
        documentParts.push('');

        // Key Points
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

        // Full Transcript
        documentParts.push('--- Full Transcript ---');
        documentParts.push(video.transcription);

        const documentText = documentParts.join('\n');
        const description = `YouTube: ${video.title} by ${video.author}`;

        // Upload to LightRAG Server
        try {
          const response = await axios.post(
            `${LIGHTRAG_SERVER}/documents/text`,
            { text: documentText, description },
            {
              headers: {
                'Content-Type': 'application/json'
              },
              timeout: 120000
            }
          );

          const trackId = response.data?.track_id;
          
          if (trackId) {
            // Store track ID
            await prisma.video.update({
              where: { id: video.id },
              data: {
                tags: JSON.stringify({
                  ...tags,
                  lightrag_track_id: trackId,
                  lightrag_uploaded_at: new Date().toISOString()
                })
              }
            });

            console.log(`Video ${video.id} uploaded successfully, track ID: ${trackId}`);
            results.uploaded++;
          }
        } catch (uploadError) {
          console.error(`Failed to upload video ${video.id}:`, uploadError.message);
          results.failed++;
          results.errors.push({
            videoId: video.id,
            title: video.title,
            error: uploadError.message
          });
        }
      } catch (videoError) {
        console.error(`Error processing video ${video.id}:`, videoError.message);
        results.failed++;
        results.errors.push({
          videoId: video.id,
          title: video.title,
          error: videoError.message
        });
      }
    }

    console.log(`Auto-upload completed: ${results.uploaded} uploaded, ${results.skipped} skipped, ${results.failed} failed`);

    res.json({
      success: true,
      message: `Auto-upload completed`,
      results
    });
  } catch (error) {
    console.error('Error in auto-upload-videos:', error.message);
    next(error);
  }
});

/**
 * GET /api/lightrag/health - Check LightRAG server health
 */
router.get('/health', async (req, res, next) => {
  try {
    const response = await axios.get(
      `${LIGHTRAG_SERVER}/health`,
      { timeout: 5000 }
    );

    res.json({
      status: 'online',
      lightrag_server: LIGHTRAG_SERVER,
      ...response.data
    });
  } catch (error) {
    res.json({
      status: 'offline',
      lightrag_server: LIGHTRAG_SERVER,
      error: error.message
    });
  }
});

module.exports = router;
