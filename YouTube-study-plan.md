# YouTube Study App - Phase 1 Implementation Plan

**Version:** 1.0  
**Date:** November 2025  
**Status:** Ready for Development

---

## Technical Architecture

### Stack Decision
- **Backend**: Node.js + Express
- **Frontend**: Next.js 14+ (App Router) + TailwindCSS
- **Database**: Prisma ORM + SQLite
- **RAG**: LightRAG for knowledge management
- **Video Data**: youtube-transcript-api (no API key) + placeholder for YouTube Data API
- **LLM**: Configurable (OpenAI/Gemini API with placeholder for local LLM)
- **Deployment**: Single Docker container with docker-compose

---

## Project Structure

```
youtube-study-app/
├── docker-compose.yml
├── Dockerfile
├── nginx.conf
├── .env.example
├── README.md
├── backend/
│   ├── package.json
│   ├── src/
│   │   ├── server.js
│   │   ├── routes/
│   │   │   ├── videos.routes.js
│   │   │   ├── categories.routes.js
│   │   │   ├── graph.routes.js
│   │   │   └── chat.routes.js
│   │   ├── services/
│   │   │   ├── youtube.service.js
│   │   │   ├── transcription.service.js
│   │   │   ├── llm.service.js
│   │   │   └── rag.service.js
│   │   └── prisma/
│   │       └── schema.prisma
└── frontend/
    ├── package.json
    ├── app/
    │   ├── layout.tsx
    │   ├── page.tsx (Dashboard)
    │   ├── videos/
    │   │   ├── page.tsx
    │   │   └── [id]/
    │   │       └── page.tsx
    │   └── api/
    └── components/
        ├── VideoCard.tsx
        ├── AddVideoModal.tsx
        ├── CategoryBadge.tsx
        └── SearchBar.tsx
```

---

## Database Schema (Prisma)

```prisma
model Video {
  id              String   @id @default(uuid())
  youtubeId       String   @unique
  url             String
  title           String
  author          String?
  duration        Int?
  uploadDate      DateTime?
  categoryId      String?
  category        Category? @relation(fields: [categoryId], references: [id])
  tags            String[]
  watchStatus     String   @default("unwatched")
  transcription   String?
  summaryJson     String?
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt
}

model Category {
  id          String   @id @default(uuid())
  name        String
  parentId    String?
  color       String?
  icon        String?
  videoCount  Int      @default(0)
  videos      Video[]
  createdAt   DateTime @default(now())
}

model KnowledgeGraph {
  id            String   @id @default(uuid())
  videoId       String   @unique
  embeddings    String
  relationships String
  ragIndexRef   String?
}

model ChatSession {
  id             String   @id @default(uuid())
  videoIds       String[]
  messages       String
  contextSummary String?
  createdAt      DateTime @default(now())
}
```

---

## Core Backend Services

### 1. YouTube Service (`backend/src/services/youtube.service.js`)
- Extract video ID from URL
- Fetch video metadata using `ytdl-core` or similar
- Placeholder for YouTube Data API integration
- Duplicate detection

### 2. Transcription Service (`backend/src/services/transcription.service.js`)
- Use `youtube-transcript-api` to fetch captions
- Fallback handling for videos without captions
- Language detection

### 3. LLM Service (`backend/src/services/llm.service.js`)
- Configurable provider (OpenAI/Gemini)
- Generate summaries:
  - Quick summary (50 words)
  - Detailed summary (500 words)
  - Key points extraction
- Chat completion for Q&A
- Environment variable configuration

### 4. RAG Service (`backend/src/services/rag.service.js`)
- LightRAG integration
- Index video transcriptions
- Query knowledge base
- Build relationship graph

---

## API Endpoints

### Videos
```
POST   /api/videos              - Add video by URL
POST   /api/videos/batch        - Batch import from playlist
GET    /api/videos              - List all videos (with filters)
GET    /api/videos/:id          - Get video details
PUT    /api/videos/:id          - Update video metadata
DELETE /api/videos/:id          - Delete video
POST   /api/videos/:id/process  - Trigger transcription + summarization
```

### Categories
```
POST   /api/categories          - Create category
GET    /api/categories          - List categories
PUT    /api/categories/:id      - Update category
DELETE /api/categories/:id      - Delete category
```

### Knowledge Graph
```
GET    /api/graph               - Get knowledge graph data
GET    /api/graph/relationships - Get video relationships
```

### Chat
```
POST   /api/chat                - Start chat session
POST   /api/chat/:id/message    - Send message to chat
GET    /api/chat/:id            - Get chat history
```

---

## Frontend Pages & Components

### Dashboard (`app/page.tsx`)
- Video statistics cards
- Recent additions carousel
- Quick category navigation
- Search bar with filters

### Video Management (`app/videos/page.tsx`)
- Grid/List view toggle
- Add video form/modal
- Bulk selection tools
- Inline editing
- Quick summary preview

### Video Detail (`app/videos/[id]/page.tsx`)
- Full transcription view
- Summary display (quick/detailed/key points)
- Category and tags management
- Watch status toggle

### UI Components
- `VideoCard.tsx` - Display video thumbnail and metadata
- `CategoryBadge.tsx` - Category label with color
- `SearchBar.tsx` - Search with filters
- `AddVideoModal.tsx` - Modal for adding videos

---

## Docker Configuration

### Dockerfile
- Multi-stage build for frontend
- Node.js runtime for backend
- Python runtime for youtube-transcript-api
- SQLite database in volume
- NGINX for reverse proxy

### docker-compose.yml
- Single service with all components
- Volume mounts for data persistence
- Port 3000 exposed
- Environment variables for API keys

---

## Environment Configuration

### .env.example
```bash
# Optional - for enhanced features
YOUTUBE_API_KEY=your_key_here
OPENAI_API_KEY=your_key_here
GEMINI_API_KEY=your_key_here

# LLM Provider: openai, gemini, or local
LLM_PROVIDER=openai

# Local LLM settings (if using Ollama)
LOCAL_LLM_URL=http://localhost:11434
LOCAL_LLM_MODEL=llama2

# Database
DATABASE_URL=file:./data/app.db
```

---

## Implementation Tasks

### Phase 1: Core Foundation

1. ✅ **Docker Setup**
   - Create Dockerfile
   - Create docker-compose.yml
   - Configure nginx.conf

2. ✅ **Backend Structure**
   - Initialize Node.js project
   - Setup Express server
   - Configure middleware

3. ✅ **Database Setup**
   - Create Prisma schema
   - Initialize SQLite database
   - Setup migrations

4. ✅ **Core Services**
   - Implement YouTube service
   - Implement Transcription service
   - Implement LLM service
   - Implement RAG service (basic)

5. ✅ **API Routes**
   - Videos CRUD endpoints
   - Categories CRUD endpoints
   - Processing endpoints

6. ✅ **Frontend Setup**
   - Initialize Next.js project
   - Setup TailwindCSS
   - Create layout structure

7. ✅ **UI Components**
   - Build VideoCard component
   - Build AddVideoModal component
   - Build CategoryBadge component
   - Build SearchBar component

8. ✅ **Pages**
   - Implement Dashboard
   - Implement Video Management page
   - Implement Video Detail page

9. ✅ **Configuration**
   - Create .env.example
   - Write setup documentation

10. ✅ **Testing & Validation**
    - Test video addition
    - Test transcription retrieval
    - Test summarization
    - Validate Docker deployment

---

## Key Features Implemented

✅ Add videos via URL or YouTube ID  
✅ Automatic metadata extraction (without API key)  
✅ Transcription retrieval  
✅ Multi-level summarization using LLM  
✅ Category management (CRUD)  
✅ Tag support  
✅ Watch status tracking  
✅ Duplicate detection  
✅ Basic web interface  
✅ Docker deployment  
✅ Data persistence  

---

## Success Criteria

- ✅ Single `docker-compose up` command starts everything
- ✅ Access app at http://localhost:3000
- ✅ Can add YouTube videos and see metadata
- ✅ Transcriptions are retrieved automatically
- ✅ Summaries are generated using LLM
- ✅ Categories can be created and assigned
- ✅ Data persists between restarts
- ✅ All operations complete in < 2 seconds

---

## Testing Workflow

1. Start Docker container: `docker-compose up`
2. Access app at http://localhost:3000
3. Add a YouTube video via URL
4. Verify metadata is displayed
5. Check transcription is retrieved
6. Verify summary is generated
7. Create categories and assign to video
8. Restart container and verify data persistence

---

## Next Steps After Phase 1

- Phase 2: Advanced content processing
- Phase 3: Knowledge graph visualization
- Phase 4: Chat interface with RAG
- Phase 5: Polish and optimization

---

**Document Status:** Ready for Implementation  
**Start Date:** November 2025  
**Estimated Completion:** 2 weeks

