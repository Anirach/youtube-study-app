const express = require('express');
const router = express.Router();
const ragService = require('../services/rag.service');
const lightragService = require('../services/lightrag.service');
const knowledgeGraphService = require('../services/knowledge-graph.service');
const { cacheMiddleware } = require('../middleware/cache.middleware');

// Use LightRAG if available, otherwise fall back to simple RAG
const USE_LIGHTRAG = process.env.USE_LIGHTRAG === 'true';

/**
 * GET /api/graph - Get knowledge graph data
 */
router.get('/', cacheMiddleware(300), async (req, res, next) => {
  try {
    const { categoryId } = req.query;

    if (USE_LIGHTRAG) {
      // Use LightRAG for graph data
      const graphData = await lightragService.getGraphData();
      
      // Get videos for additional metadata
      const where = {};
      if (categoryId) where.categoryId = categoryId;
      
      const videos = await req.prisma.video.findMany({
        where,
        include: { category: true }
      });

      // Map LightRAG entities to video nodes
      const videoMap = new Map(videos.map(v => [v.title, v]));
      
      const nodes = graphData.nodes.map(node => {
        const video = videoMap.get(node.label) || {};
        return {
          id: node.id,
          label: node.label,
          type: node.type,
          description: node.description,
          // Add video metadata if available
          videoId: video.id,
          youtubeId: video.youtubeId,
          category: video.category?.name || 'Entity',
          categoryColor: video.category?.color || '#6366f1',
          thumbnail: video.thumbnail,
          watchStatus: video.watchStatus || 'unknown'
        };
      });

      const edges = graphData.edges.map(edge => ({
        source: edge.source,
        target: edge.target,
        relation: edge.relation,
        weight: edge.weight,
        description: edge.description,
        type: edge.weight > 0.7 ? 'strong' : 'moderate'
      }));

      res.json({
        nodes,
        edges,
        stats: {
          totalNodes: nodes.length,
          totalEdges: edges.length,
          provider: 'LightRAG'
        }
      });
    } else {
      // Use Knowledge Graph Service (entity extraction from Key Points)
      const where = {};
      if (categoryId) where.categoryId = categoryId;

      const videos = await req.prisma.video.findMany({
        where,
        include: {
          category: true,
          knowledgeGraph: true
        }
      });

      // Parse summaryJson for each video
      const videosWithParsedSummary = videos.map(video => ({
        ...video,
        summaryJson: video.summaryJson ? 
          (typeof video.summaryJson === 'string' ? JSON.parse(video.summaryJson) : video.summaryJson) 
          : null
      }));

      // Build rich knowledge graph from Key Points
      const graphData = await knowledgeGraphService.buildGraphFromVideos(videosWithParsedSummary);
      
      console.log('Graph stats:', graphData.stats);

      res.json({
        nodes: graphData.nodes,
        edges: graphData.edges,
        stats: {
          ...graphData.stats,
          categories: [...new Set(videos.map(v => v.category?.name || 'Uncategorized'))].length,
          provider: 'Knowledge Graph (Key Points)'
        }
      });
    }
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/graph/relationships/:id - Get relationships for specific video
 */
router.get('/relationships/:id', cacheMiddleware(300), async (req, res, next) => {
  try {
    const video = await req.prisma.video.findUnique({
      where: { id: req.params.id },
      include: { knowledgeGraph: true }
    });

    if (!video) {
      return res.status(404).json({ error: 'Video not found' });
    }

    let relationships = [];
    if (video.knowledgeGraph?.relationships) {
      try {
        relationships = JSON.parse(video.knowledgeGraph.relationships);
      } catch (error) {
        console.error('Error parsing relationships:', error);
      }
    }

    // Get details for related videos
    const relatedVideoIds = relationships.map(r => r.targetVideoId);
    const relatedVideos = await req.prisma.video.findMany({
      where: { id: { in: relatedVideoIds } },
      include: { category: true }
    });

    const enrichedRelationships = relationships.map(rel => {
      const relatedVideo = relatedVideos.find(v => v.id === rel.targetVideoId);
      return {
        ...rel,
        video: relatedVideo ? {
          id: relatedVideo.id,
          title: relatedVideo.title,
          author: relatedVideo.author,
          thumbnail: relatedVideo.thumbnail,
          category: relatedVideo.category?.name
        } : null
      };
    });

    res.json({
      videoId: video.id,
      title: video.title,
      relationships: enrichedRelationships
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/graph/rebuild - Rebuild knowledge graph based on Key Points
 */
router.post('/rebuild', async (req, res, next) => {
  try {
    const videos = await req.prisma.video.findMany({
      where: {
        transcription: { not: null }
      }
    });

    let rebuilt = 0;

    for (const video of videos) {
      try {
        // Parse summaryJson to get key points
        let summaryJson = null;
        if (video.summaryJson) {
          try {
            summaryJson = typeof video.summaryJson === 'string' 
              ? JSON.parse(video.summaryJson) 
              : video.summaryJson;
          } catch (e) {
            console.error(`Error parsing summaryJson for video ${video.id}:`, e);
          }
        }

        // Re-index video with key points
        if (video.transcription) {
          const transcription = {
            fullText: video.transcription,
            segments: [],
            wordCount: video.transcription.split(/\s+/).length
          };
          
          await ragService.indexVideo(
            video.id, 
            transcription, 
            {
              title: video.title,
              author: video.author
            },
            summaryJson
          );
        }

        // Rebuild relationships based on key points
        const relationships = await ragService.buildRelationships(video.id, summaryJson);

        // Update or create knowledge graph
        await req.prisma.knowledgeGraph.upsert({
          where: { videoId: video.id },
          update: {
            relationships: JSON.stringify(relationships),
            updatedAt: new Date()
          },
          create: {
            videoId: video.id,
            embeddings: JSON.stringify([]),
            relationships: JSON.stringify(relationships)
          }
        });

        rebuilt++;
      } catch (error) {
        console.error(`Error rebuilding graph for video ${video.id}:`, error);
      }
    }

    res.json({
      message: 'Knowledge graph rebuilt based on Key Points',
      videosProcessed: rebuilt,
      totalVideos: videos.length
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/graph/stats - Get graph statistics
 */
router.get('/stats', cacheMiddleware(60), async (req, res, next) => {
  try {
    const totalVideos = await req.prisma.video.count();
    const indexedVideos = await req.prisma.knowledgeGraph.count();
    const categories = await req.prisma.category.count();
    
    const ragStats = ragService.getStats();

    res.json({
      totalVideos,
      indexedVideos,
      categories,
      ...ragStats
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

