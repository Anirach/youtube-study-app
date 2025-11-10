const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const llmService = require('../services/llm.service');
const ragService = require('../services/rag.service');
const lightragService = require('../services/lightrag.service');
const fileParserService = require('../services/file-parser.service');

const USE_LIGHTRAG = process.env.USE_LIGHTRAG === 'true';

// Configure multer for file uploads
const upload = multer({
  dest: path.join(__dirname, '../../uploads/chat'),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'text/plain',
      'text/markdown',
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'image/jpeg',
      'image/png',
      'image/jpg'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}`));
    }
  }
});

/**
 * POST /api/chat - Create new chat session
 */
router.post('/', async (req, res, next) => {
  try {
    const { videoIds = [] } = req.body;

    if (!Array.isArray(videoIds) || videoIds.length === 0) {
      return res.status(400).json({ error: 'At least one video ID is required' });
    }

    // Verify videos exist
    const videos = await req.prisma.video.findMany({
      where: { id: { in: videoIds } }
    });

    if (videos.length !== videoIds.length) {
      return res.status(404).json({ error: 'One or more videos not found' });
    }

    // Create chat session
    const session = await req.prisma.chatSession.create({
      data: {
        videoIds: JSON.stringify(videoIds),
        messages: JSON.stringify([])
      }
    });

    res.status(201).json({
      id: session.id,
      videoIds: JSON.parse(session.videoIds),
      messages: [],
      createdAt: session.createdAt
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/chat/:id - Get chat session
 */
router.get('/:id', async (req, res, next) => {
  try {
    const session = await req.prisma.chatSession.findUnique({
      where: { id: req.params.id }
    });

    if (!session) {
      return res.status(404).json({ error: 'Chat session not found' });
    }

    const videoIds = JSON.parse(session.videoIds);
    const videos = await req.prisma.video.findMany({
      where: { id: { in: videoIds } },
      select: {
        id: true,
        title: true,
        author: true,
        thumbnail: true
      }
    });

    res.json({
      id: session.id,
      videoIds,
      videos,
      messages: JSON.parse(session.messages),
      contextSummary: session.contextSummary,
      createdAt: session.createdAt
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/chat/:id/message - Send message to chat (with optional file attachments)
 */
router.post('/:id/message', upload.array('files', 5), async (req, res, next) => {
  try {
    const { message } = req.body;
    const files = req.files || [];

    if ((!message || !message.trim()) && files.length === 0) {
      return res.status(400).json({ error: 'Message or files are required' });
    }

    const session = await req.prisma.chatSession.findUnique({
      where: { id: req.params.id }
    });

    if (!session) {
      return res.status(404).json({ error: 'Chat session not found' });
    }

    const videoIds = JSON.parse(session.videoIds);
    const messages = JSON.parse(session.messages);

    // Get videos with full data
    const videos = await req.prisma.video.findMany({
      where: { id: { in: videoIds } },
      include: { category: true }
    });

    console.log(`Chat: Processing ${videos.length} videos for query: "${message}"`);
    console.log(`Chat: ${files.length} file(s) attached`);

    // Parse attached files
    let fileContents = [];
    if (files.length > 0) {
      console.log('Parsing attached files...');
      for (const file of files) {
        try {
          const parsed = await fileParserService.parseFile(file.path, file.mimetype);
          fileContents.push({
            filename: file.originalname,
            text: parsed.text,
            metadata: parsed.metadata
          });
          console.log(`Parsed ${file.originalname}: ${parsed.text.length} characters`);
          
          // Clean up uploaded file
          await fs.unlink(file.path);
        } catch (error) {
          console.error(`Failed to parse ${file.originalname}:`, error);
          fileContents.push({
            filename: file.originalname,
            text: `[Failed to parse file: ${error.message}]`,
            metadata: { error: true }
          });
        }
      }
    }

    let fileContextText = '';
    let videoContextText = '';
    let contexts = [];
    let response = '';

    // Build context from attached files
    if (fileContents.length > 0) {
      fileContextText = '=== Attached Files ===\n\n';
      fileContents.forEach(fc => {
        fileContextText += `File: ${fc.filename}\n`;
        fileContextText += `Content:\n${fc.text}\n\n---\n\n`;
      });
      console.log(`File context length: ${fileContextText.length} characters`);
    }

    if (USE_LIGHTRAG && videos.length > 0) {
      // Use LightRAG for intelligent query
      console.log('Using LightRAG for chat query');
      try {
        const lightragResponse = await lightragService.query(message, videoIds);
        response = lightragResponse.answer || lightragResponse;
        
        // Extract sources from LightRAG response
        contexts = videos.map(v => ({
          videoId: v.id,
          title: v.title,
          author: v.author,
          excerpt: v.summaryJson ? 
            (typeof v.summaryJson === 'string' ? JSON.parse(v.summaryJson) : v.summaryJson).summary?.substring(0, 200) 
            : 'No summary available'
        }));
      } catch (error) {
        console.error('LightRAG query failed, falling back to simple RAG:', error);
        // Fall back to simple RAG
        contexts = await ragService.getContext(videoIds);
        videoContextText = '\n\n=== Video Context ===\n\n' + contexts
          .map(c => `Video: ${c.title} by ${c.author}\n${c.excerpt}`)
          .join('\n\n---\n\n');
      }
    } else {
      // Use simple RAG
      console.log('Using simple RAG for chat query');
      contexts = await ragService.getContext(videoIds);
      
      // If no contexts from RAG, build from video data
      if (!contexts || contexts.length === 0) {
        console.log('No RAG contexts, building from video data');
        contexts = videos.map(v => {
          let summary = 'No summary available';
          let keyPoints = [];
          
          if (v.summaryJson) {
            try {
              const summaryData = typeof v.summaryJson === 'string' 
                ? JSON.parse(v.summaryJson) 
                : v.summaryJson;
              summary = summaryData.summary || summary;
              keyPoints = summaryData.keyPoints || [];
            } catch (e) {
              console.error('Error parsing summaryJson:', e);
            }
          }
          
          return {
            videoId: v.id,
            title: v.title,
            author: v.author,
            excerpt: summary.substring(0, 500),
            keyPoints: keyPoints.slice(0, 5)
          };
        });
      }
      
      videoContextText = '\n\n=== Video Context ===\n\n' + contexts
        .map(c => {
          let text = `Video: ${c.title} by ${c.author}\n${c.excerpt}`;
          if (c.keyPoints && c.keyPoints.length > 0) {
            text += '\n\nKey Points:\n' + c.keyPoints.map((kp, i) => `${i + 1}. ${kp}`).join('\n');
          }
          return text;
        })
        .join('\n\n---\n\n');
    }

    // Combine file context and video context
    const contextText = fileContextText + videoContextText;
    console.log(`Total context length: ${contextText.length} characters`);

    // Add user message with file attachments info
    const userMessage = {
      role: 'user',
      content: message,
      timestamp: new Date().toISOString()
    };
    
    if (fileContents.length > 0) {
      userMessage.attachments = fileContents.map(fc => ({
        filename: fc.filename,
        type: fc.metadata.type,
        length: fc.text.length
      }));
    }
    
    messages.push(userMessage);

    // Get AI response if not already from LightRAG
    if (!response) {
      const chatMessages = messages.map(m => ({
        role: m.role,
        content: m.content
      }));

      // Send combined context (files + videos) to LLM
      console.log('Sending to LLM with combined context');
      response = await llmService.chat(chatMessages, contextText);
    }

    // Add assistant message
    messages.push({
      role: 'assistant',
      content: response,
      timestamp: new Date().toISOString()
    });

    // Update session
    await req.prisma.chatSession.update({
      where: { id: req.params.id },
      data: {
        messages: JSON.stringify(messages),
        updatedAt: new Date()
      }
    });

    res.json({
      message: response,
      role: 'assistant',
      timestamp: new Date().toISOString(),
      sources: contexts.map(c => ({
        videoId: c.videoId,
        title: c.title,
        excerpt: c.excerpt
      })),
      attachedFiles: fileContents.length > 0 ? fileContents.map(fc => ({
        filename: fc.filename,
        type: fc.metadata.type,
        length: fc.text.length
      })) : undefined
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/chat/:id - Delete chat session
 */
router.delete('/:id', async (req, res, next) => {
  try {
    await req.prisma.chatSession.delete({
      where: { id: req.params.id }
    });

    res.json({ message: 'Chat session deleted' });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/chat - List all chat sessions
 */
router.get('/', async (req, res, next) => {
  try {
    const sessions = await req.prisma.chatSession.findMany({
      orderBy: { createdAt: 'desc' }
    });

    const enrichedSessions = await Promise.all(
      sessions.map(async session => {
        const videoIds = JSON.parse(session.videoIds);
        const videos = await req.prisma.video.findMany({
          where: { id: { in: videoIds } },
          select: { id: true, title: true, thumbnail: true }
        });

        const messages = JSON.parse(session.messages);

        return {
          id: session.id,
          videoCount: videoIds.length,
          videos,
          messageCount: messages.length,
          lastMessage: messages.length > 0 ? messages[messages.length - 1] : null,
          createdAt: session.createdAt,
          updatedAt: session.updatedAt
        };
      })
    );

    res.json(enrichedSessions);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/chat/:id/query - Query videos without adding to chat history
 */
router.post('/:id/query', async (req, res, next) => {
  try {
    const { query } = req.body;

    if (!query || !query.trim()) {
      return res.status(400).json({ error: 'Query is required' });
    }

    const session = await req.prisma.chatSession.findUnique({
      where: { id: req.params.id }
    });

    if (!session) {
      return res.status(404).json({ error: 'Chat session not found' });
    }

    const videoIds = JSON.parse(session.videoIds);

    // Query RAG system
    const results = await ragService.query(query, videoIds);

    res.json({
      query,
      results: results.slice(0, 5) // Top 5 results
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;

