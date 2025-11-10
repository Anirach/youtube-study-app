const express = require('express');
const router = express.Router();
const axios = require('axios');

// LightRAG Server URL (from environment or default)
const LIGHTRAG_SERVER = process.env.LIGHTRAG_SERVER_URL || 'http://localhost:9621';

/**
 * POST /api/lightrag-api/documents/text - Upload text to LightRAG
 */
router.post('/documents/text', async (req, res, next) => {
  try {
    const { text, description } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ error: 'Text is required' });
    }

    console.log(`Uploading text to LightRAG: ${description || 'No description'}`);
    console.log(`Text length: ${text.length} characters`);

    // Forward to LightRAG server
    const response = await axios.post(
      `${LIGHTRAG_SERVER}/documents/text`,
      {
        text,
        description: description || 'Video transcript'
      },
      {
        timeout: 30000, // 30 seconds
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('LightRAG response:', response.data);

    res.json({
      success: true,
      track_id: response.data.track_id,
      message: 'Text uploaded to LightRAG successfully'
    });
  } catch (error) {
    console.error('Error uploading to LightRAG:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      return res.status(503).json({ 
        error: 'LightRAG server is not available',
        details: 'Please ensure LightRAG server is running on ' + LIGHTRAG_SERVER
      });
    }

    next(error);
  }
});

/**
 * GET /api/lightrag-api/track_status/:track_id - Check document processing status
 */
router.get('/track_status/:track_id', async (req, res, next) => {
  try {
    const { track_id } = req.params;

    console.log(`Checking LightRAG status for track_id: ${track_id}`);

    // Forward to LightRAG server
    const response = await axios.get(
      `${LIGHTRAG_SERVER}/track_status/${track_id}`,
      {
        timeout: 10000 // 10 seconds
      }
    );

    res.json(response.data);
  } catch (error) {
    console.error('Error checking LightRAG status:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      return res.status(503).json({ 
        error: 'LightRAG server is not available'
      });
    }

    if (error.response && error.response.status === 404) {
      return res.status(404).json({ 
        error: 'Track ID not found'
      });
    }

    next(error);
  }
});

/**
 * POST /api/lightrag-api/query - Query LightRAG
 */
router.post('/query', async (req, res, next) => {
  try {
    const { query, mode = 'hybrid', include_references = true, include_chunk_content = false } = req.body;

    if (!query || !query.trim()) {
      return res.status(400).json({ error: 'Query is required' });
    }

    console.log(`Querying LightRAG: "${query}" (mode: ${mode})`);

    // Forward to LightRAG server
    const response = await axios.post(
      `${LIGHTRAG_SERVER}/query`,
      {
        query,
        mode,
        include_references,
        include_chunk_content
      },
      {
        timeout: 60000, // 60 seconds for query
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    res.json(response.data);
  } catch (error) {
    console.error('Error querying LightRAG:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      return res.status(503).json({ 
        error: 'LightRAG server is not available'
      });
    }

    next(error);
  }
});

/**
 * GET /api/lightrag-api/health - Check LightRAG server health
 */
router.get('/health', async (req, res, next) => {
  try {
    const response = await axios.get(
      `${LIGHTRAG_SERVER}/health`,
      {
        timeout: 5000 // 5 seconds
      }
    );

    res.json({
      status: 'online',
      lightrag_server: LIGHTRAG_SERVER,
      ...response.data
    });
  } catch (error) {
    console.error('LightRAG health check failed:', error.message);
    
    res.status(503).json({
      status: 'offline',
      lightrag_server: LIGHTRAG_SERVER,
      error: error.message
    });
  }
});

module.exports = router;

