# YouTube Study App - Phase 2-3 Implementation Plan

## Overview

Phase 1 เสร็จสมบูรณ์แล้ว ✅ ตอนนี้จะพัฒนาฟีเจอร์ขั้นสูง:
- **Phase 2**: Enhanced Content Processing & RAG Optimization
- **Phase 3**: Knowledge Graph Visualization & AI Chat Interface

---

## Phase 2: Enhanced Content Processing (Week 3-4)

### 2.1 Enhanced RAG Service

**ปัจจุบัน**: ใช้ simple word-frequency based embeddings
**เป้าหมาย**: ใช้ proper embeddings และ vector search

**Implementation:**

```javascript
// backend/src/services/rag.service.js - Enhanced version
class RAGService {
  constructor() {
    this.vectorStore = null; // Use Faiss or similar
    this.embeddings = null;   // Use OpenAI/Gemini embeddings
  }

  async indexVideo(videoId, transcription, metadata) {
    // Generate embeddings using LLM
    const embedding = await this.generateEmbedding(transcription.fullText);
    
    // Store in vector database
    await this.vectorStore.add({
      id: videoId,
      embedding,
      metadata: {
        title: metadata.title,
        author: metadata.author,
        chunks: this.chunkText(transcription.fullText)
      }
    });
  }

  async semanticSearch(query, topK = 5) {
    const queryEmbedding = await this.generateEmbedding(query);
    return await this.vectorStore.search(queryEmbedding, topK);
  }
}
```

**Tasks:**
1. Install vector database library (faiss-node or chromadb)
2. Implement proper embedding generation using OpenAI/Gemini
3. Add text chunking for better retrieval
4. Implement semantic search
5. Update knowledge graph relationships using embeddings

### 2.2 Batch Processing & Queue System

**Problem**: Processing videos one-by-one is slow
**Solution**: Background job queue

**Implementation:**

```javascript
// backend/src/services/queue.service.js
const Bull = require('bull');

class QueueService {
  constructor() {
    this.videoQueue = new Bull('video-processing', {
      redis: { host: 'localhost', port: 6379 }
    });
    
    this.setupProcessors();
  }

  async addVideoToQueue(videoId) {
    await this.videoQueue.add({
      videoId,
      priority: 'normal'
    });
  }

  setupProcessors() {
    this.videoQueue.process(async (job) => {
      const { videoId } = job.data;
      await this.processVideo(videoId);
    });
  }
}
```

**Alternative (Simpler)**: Use in-memory queue without Redis

**Tasks:**
1. Implement simple in-memory queue
2. Add job status tracking
3. Update UI to show processing status
4. Add retry logic for failed jobs

### 2.3 Caching Layer

**Implementation:**

```javascript
// backend/src/middleware/cache.middleware.js
const NodeCache = require('node-cache');
const cache = new NodeCache({ stdTTL: 600 }); // 10 minutes

function cacheMiddleware(duration) {
  return (req, res, next) => {
    const key = req.originalUrl;
    const cached = cache.get(key);
    
    if (cached) {
      return res.json(cached);
    }
    
    res.originalJson = res.json;
    res.json = (data) => {
      cache.set(key, data, duration);
      res.originalJson(data);
    };
    
    next();
  };
}
```

**Tasks:**
1. Install node-cache
2. Add caching middleware
3. Cache expensive operations (graph data, search results)
4. Add cache invalidation on updates

---

## Phase 3: Advanced Features (Week 5-6)

### 3.1 Knowledge Graph Visualization

**Technology**: D3.js or Cytoscape.js

**Frontend Implementation:**

```typescript
// frontend/app/graph/page.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { graphApi } from '@/lib/api';

export default function GraphPage() {
  const svgRef = useRef<SVGSVGElement>(null);
  const [graphData, setGraphData] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('');

  useEffect(() => {
    loadGraph();
  }, [selectedCategory]);

  const loadGraph = async () => {
    const data = await graphApi.getGraph({ 
      categoryId: selectedCategory 
    });
    setGraphData(data);
    renderGraph(data);
  };

  const renderGraph = (data) => {
    if (!svgRef.current) return;

    const width = 1200;
    const height = 800;

    // D3 force simulation
    const simulation = d3.forceSimulation(data.nodes)
      .force('link', d3.forceLink(data.edges).id(d => d.id))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(width / 2, height / 2));

    // Render nodes and edges
    // ... D3 rendering code
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Knowledge Graph</h1>
        <div className="flex gap-4">
          <select 
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-4 py-2 border rounded-lg"
          >
            <option value="">All Categories</option>
            {/* Category options */}
          </select>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-4">
        <svg 
          ref={svgRef}
          width="100%"
          height="800"
          className="border rounded"
        />
      </div>

      {/* Legend and Controls */}
      <div className="bg-white rounded-lg shadow-sm p-4">
        <h3 className="font-semibold mb-2">Legend</h3>
        <div className="flex gap-4">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded-full bg-blue-500" />
            <span className="text-sm">Video Node</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-0.5 bg-gray-400" />
            <span className="text-sm">Strong Connection</span>
          </div>
        </div>
      </div>
    </div>
  );
}
```

**Features:**
- Interactive force-directed graph
- Node clustering by category
- Zoom and pan
- Click to view video details
- Filter by category, date, author
- Export as PNG/SVG

**Tasks:**
1. Install D3.js or Cytoscape.js
2. Create GraphCanvas component
3. Implement force simulation
4. Add node interactions (click, hover, drag)
5. Add filters and controls
6. Implement export functionality

### 3.2 AI Chat Interface

**Frontend Implementation:**

```typescript
// frontend/app/chat/page.tsx
'use client';

import { useState, useEffect, useRef } from 'react';
import { chatApi, videosApi } from '@/lib/api';
import { FiSend, FiVideo } from 'react-icons/fi';

export default function ChatPage() {
  const [sessions, setSessions] = useState([]);
  const [currentSession, setCurrentSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [selectedVideos, setSelectedVideos] = useState([]);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const createSession = async () => {
    if (selectedVideos.length === 0) {
      alert('Please select at least one video');
      return;
    }

    const session = await chatApi.create({
      videoIds: selectedVideos
    });
    
    setCurrentSession(session);
    setMessages([]);
  };

  const sendMessage = async () => {
    if (!input.trim() || !currentSession) return;

    const userMessage = {
      role: 'user',
      content: input,
      timestamp: new Date().toISOString()
    };

    setMessages([...messages, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await chatApi.sendMessage(
        currentSession.id,
        input
      );

      setMessages(prev => [...prev, response.message]);
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-12 gap-6 h-[calc(100vh-200px)]">
      {/* Video Selector Sidebar */}
      <div className="col-span-3 bg-white rounded-lg shadow-sm p-4 overflow-y-auto">
        <h3 className="font-semibold mb-4">Select Videos</h3>
        <VideoSelector
          selectedVideos={selectedVideos}
          onSelect={setSelectedVideos}
        />
        <button
          onClick={createSession}
          className="w-full mt-4 px-4 py-2 bg-primary-600 text-white rounded-lg"
        >
          Start Chat
        </button>
      </div>

      {/* Chat Area */}
      <div className="col-span-9 bg-white rounded-lg shadow-sm flex flex-col">
        {/* Messages */}
        <div className="flex-1 p-6 overflow-y-auto">
          {messages.map((msg, idx) => (
            <ChatMessage key={idx} message={msg} />
          ))}
          {loading && <LoadingIndicator />}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="border-t p-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Ask about your videos..."
              className="flex-1 px-4 py-2 border rounded-lg"
            />
            <button
              onClick={sendMessage}
              disabled={loading || !currentSession}
              className="px-6 py-2 bg-primary-600 text-white rounded-lg"
            >
              <FiSend />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
```

**Features:**
- Multi-video context selection
- Real-time chat with GPT-4/Gemini
- Source attribution with timestamps
- Chat history persistence
- Export chat transcripts
- Suggested questions

**Tasks:**
1. Create chat UI components
2. Implement video selector
3. Add message rendering with markdown support
4. Implement source citation display
5. Add chat history management
6. Implement export functionality

### 3.3 Advanced Search

**Implementation:**

```typescript
// frontend/components/AdvancedSearch.tsx
export default function AdvancedSearch() {
  const [filters, setFilters] = useState({
    query: '',
    categories: [],
    dateRange: { start: null, end: null },
    duration: { min: 0, max: 3600 },
    watchStatus: '',
    hasTranscript: null,
    hasSummary: null
  });

  const search = async () => {
    const results = await videosApi.getAll(filters);
    // Display results
  };

  return (
    <div className="space-y-4">
      {/* Search input */}
      {/* Category multi-select */}
      {/* Date range picker */}
      {/* Duration slider */}
      {/* Status filters */}
    </div>
  );
}
```

**Tasks:**
1. Create advanced search UI
2. Add date range picker
3. Add duration slider
4. Implement multi-select for categories
5. Add search result highlighting

---

## Performance Optimization

### 4.1 Database Optimization

**Tasks:**
1. Add indexes to frequently queried fields
2. Implement pagination for large result sets
3. Add database connection pooling
4. Optimize Prisma queries (use select, include wisely)

```prisma
// Add indexes
model Video {
  // ... fields
  @@index([categoryId])
  @@index([watchStatus])
  @@index([createdAt])
  @@index([title]) // For search
}
```

### 4.2 Frontend Optimization

**Tasks:**
1. Implement lazy loading for video list
2. Add image optimization (Next.js Image component)
3. Implement virtual scrolling for large lists
4. Add loading skeletons
5. Optimize bundle size (code splitting)

### 4.3 API Optimization

**Tasks:**
1. Add request rate limiting
2. Implement API response compression
3. Add ETag caching
4. Optimize JSON payloads (remove unnecessary fields)

---

## Testing & Quality Assurance

### 5.1 Unit Tests

**Tasks:**
1. Add tests for services (YouTube, Transcription, LLM, RAG)
2. Add tests for API routes
3. Add tests for frontend components

```javascript
// backend/tests/services/youtube.service.test.js
describe('YouTubeService', () => {
  it('should extract video ID from URL', () => {
    const id = youtubeService.extractVideoId(
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
    );
    expect(id).toBe('dQw4w9WgXcQ');
  });
});
```

### 5.2 Integration Tests

**Tasks:**
1. Test video addition workflow
2. Test transcription + summarization pipeline
3. Test chat functionality
4. Test graph generation

### 5.3 E2E Tests

**Tasks:**
1. Setup Playwright or Cypress
2. Test critical user flows
3. Test across different browsers

---

## Documentation

### 6.1 API Documentation

**Tasks:**
1. Add Swagger/OpenAPI documentation
2. Document all endpoints with examples
3. Add error response documentation

### 6.2 User Guide

**Tasks:**
1. Create user guide with screenshots
2. Add video tutorials
3. Document keyboard shortcuts
4. Add FAQ section

---

## Deployment & DevOps

### 7.1 Docker Optimization

**Tasks:**
1. Optimize Docker image size
2. Add multi-stage builds
3. Add health checks
4. Optimize startup time

### 7.2 Monitoring

**Tasks:**
1. Add logging (Winston or Pino)
2. Add error tracking (Sentry)
3. Add performance monitoring
4. Add usage analytics

---

## Success Criteria

### Phase 2:
- ✅ Enhanced RAG with proper embeddings
- ✅ Background processing queue
- ✅ Caching layer implemented
- ✅ Performance improved by 50%

### Phase 3:
- ✅ Interactive knowledge graph visualization
- ✅ Functional AI chat interface
- ✅ Advanced search with filters
- ✅ All features working smoothly

### Overall:
- ✅ 95% of operations complete in < 2 seconds
- ✅ Support for 1000+ videos
- ✅ Intuitive UI requiring no training
- ✅ Comprehensive documentation

---

## Timeline

**Week 3-4 (Phase 2):**
- Days 1-3: Enhanced RAG service
- Days 4-6: Background processing
- Days 7-10: Caching and optimization
- Days 11-14: Testing and refinement

**Week 5-6 (Phase 3):**
- Days 1-4: Knowledge graph visualization
- Days 5-8: AI chat interface
- Days 9-10: Advanced search
- Days 11-12: Performance optimization
- Days 13-14: Testing and polish

---

## Dependencies

**New Packages to Install:**

**Backend:**
```json
{
  "node-cache": "^5.1.2",      // Caching
  "compression": "^1.7.4",     // Response compression
  "winston": "^3.11.0"         // Logging
}
```

**Frontend:**
```json
{
  "d3": "^7.8.5",              // Graph visualization
  "react-markdown": "^9.0.1",  // Markdown rendering
  "react-icons": "^5.0.1",     // Icons
  "date-fns": "^3.0.0"         // Date utilities
}
```

---

## Risk Mitigation

**Risks:**
1. **Graph rendering performance** - Mitigate: Limit nodes, use canvas instead of SVG
2. **LLM API costs** - Mitigate: Implement caching, rate limiting
3. **Vector DB complexity** - Mitigate: Start simple, upgrade later
4. **Chat context limits** - Mitigate: Implement smart chunking

---

## Post-Phase 3 Enhancements

- Browser extension
- Mobile app
- Export to Obsidian/Notion
- Collaborative features
- Multi-language support
- Video platform expansion (Vimeo, Coursera)

