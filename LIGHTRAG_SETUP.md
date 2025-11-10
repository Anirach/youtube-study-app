# LightRAG Integration Guide

## Overview

YouTube Study App ตอนนี้รองรับ **LightRAG** - framework ที่ทรงพลังสำหรับการสร้าง Knowledge Graph แบบ entity-relationship จากเนื้อหาวิดีโอ

## Features

### 🎯 LightRAG vs Simple RAG

| Feature | Simple RAG | LightRAG |
|---------|-----------|----------|
| Entity Extraction | ❌ | ✅ Automatic |
| Relationship Detection | Basic similarity | ✅ Advanced semantic |
| Graph Structure | Simple nodes/edges | ✅ Rich entity-relationship |
| Query Modes | Basic | ✅ Naive, Local, Global, Hybrid |
| Performance | Fast | Slower but more accurate |

### 📊 LightRAG Capabilities

1. **Automatic Entity Extraction**
   - สกัด entities (คน, สถานที่, แนวคิด) จากเนื้อหาวิดีโอ
   - สร้าง relationships ระหว่าง entities อัตโนมัติ

2. **Advanced Query Modes**
   - **Naive**: Simple keyword matching
   - **Local**: Context-aware local search
   - **Global**: Broad semantic search
   - **Hybrid**: Combined approach (recommended)

3. **Knowledge Graph Visualization**
   - แสดง entities เป็น nodes
   - แสดง relationships เป็น edges
   - รองรับ zoom, pan, และ interaction

## Setup

### 1. Environment Variables

เพิ่มใน `.env`:

```bash
# Enable LightRAG
USE_LIGHTRAG=true

# LightRAG Working Directory
LIGHTRAG_WORKING_DIR=./lightrag_data

# LLM Provider (openai or gemini)
LLM_PROVIDER=openai
OPENAI_API_KEY=your_openai_key
# OR
LLM_PROVIDER=gemini
GEMINI_API_KEY=your_gemini_key
```

### 2. Install Python Dependencies

```bash
cd backend
pip3 install -r requirements.txt
```

Dependencies include:
- `lightrag-hku>=1.4.9` - LightRAG framework
- `networkx>=3.0` - Graph processing
- `numpy>=1.24.0` - Numerical operations
- `openai>=1.0.0` - OpenAI API
- `google-generativeai>=0.3.0` - Gemini API

### 3. Docker Build

```bash
docker-compose down
docker-compose build
docker-compose up -d
```

## Usage

### Adding Videos

เมื่อเพิ่มวิดีโอใหม่:

1. ระบบจะ transcribe วิดีโอ
2. สร้าง summary พร้อม Key Points
3. **LightRAG จะ extract entities และ relationships อัตโนมัติ**
4. เก็บข้อมูลใน Knowledge Graph

### Viewing Knowledge Graph

1. ไปที่ **Knowledge Graph** page: `http://localhost:3001/graph`
2. คลิก **Rebuild Graph** เพื่อสร้าง graph จาก LightRAG
3. Graph จะแสดง:
   - **Nodes**: Entities ที่ extract ได้ (คน, สถานที่, แนวคิด)
   - **Edges**: Relationships ระหว่าง entities
   - **Colors**: แยกตาม entity type หรือ category

### Interacting with Graph

- **Zoom**: Scroll wheel
- **Pan**: Click and drag
- **Node Click**: ดูรายละเอียด entity
- **Edge Hover**: ดู relationship details

### Querying Knowledge

ใช้ Chat interface เพื่อ query Knowledge Graph:

```javascript
// Example queries
"What are the main topics discussed in the videos?"
"How are AI and machine learning related?"
"Show me connections between different concepts"
```

## Architecture

### Backend Components

1. **`lightrag_service.py`** - Python service สำหรับ LightRAG
   - `insert_video()` - เพิ่มวิดีโอเข้า graph
   - `query()` - Query graph
   - `get_graph_data()` - ดึงข้อมูล graph สำหรับ visualization
   - `clear_graph()` - ล้างข้อมูล graph

2. **`lightrag.service.js`** - Node.js wrapper
   - เชื่อมต่อ Node.js กับ Python service
   - จัดการ subprocess execution
   - Handle errors และ JSON parsing

3. **`graph.routes.js`** - API routes
   - `GET /api/graph` - ดึงข้อมูล graph
   - `POST /api/graph/rebuild` - Rebuild graph
   - `GET /api/graph/stats` - สถิติ graph

### Frontend Components

1. **`GraphCanvas.tsx`** - D3.js visualization
   - Force-directed graph layout
   - Interactive nodes and edges
   - Zoom and pan support

2. **`graph/page.tsx`** - Knowledge Graph page
   - Graph controls
   - Filters
   - Export functionality

## Data Flow

```
Video Added
    ↓
Transcription
    ↓
Summarization (Key Points)
    ↓
LightRAG Processing
    ├── Entity Extraction
    ├── Relationship Detection
    └── Graph Building
    ↓
Knowledge Graph Storage
    ↓
Visualization
```

## Performance Considerations

### LightRAG vs Simple RAG

**LightRAG:**
- ✅ More accurate entity and relationship detection
- ✅ Better semantic understanding
- ✅ Advanced query capabilities
- ❌ Slower processing (requires LLM calls)
- ❌ Higher API costs

**Simple RAG:**
- ✅ Fast processing
- ✅ Lower costs
- ✅ Good for basic similarity matching
- ❌ Less accurate relationships
- ❌ No entity extraction

### Recommendations

- **Use LightRAG** for:
  - Academic/research content
  - Complex topics with many interconnected concepts
  - When accuracy is more important than speed

- **Use Simple RAG** for:
  - Large video collections
  - Simple content
  - When speed is critical

## Troubleshooting

### Python Module Not Found

```bash
pip3 install --break-system-packages -r backend/requirements.txt
```

### LightRAG Not Working

1. Check environment variables:
   ```bash
   echo $USE_LIGHTRAG
   echo $OPENAI_API_KEY
   ```

2. Check Python script:
   ```bash
   cd backend
   python3 src/python/lightrag_service.py get_graph
   ```

3. Check logs:
   ```bash
   docker-compose logs app
   ```

### Graph Not Displaying

1. Rebuild graph:
   - Go to Knowledge Graph page
   - Click "Rebuild Graph"

2. Check data:
   ```bash
   curl http://localhost:8000/api/graph
   ```

## API Reference

### Python Service

```python
# Insert video
python3 lightrag_service.py insert <video_id> '<json_content>'

# Query
python3 lightrag_service.py query "your query" hybrid

# Get graph
python3 lightrag_service.py get_graph

# Clear graph
python3 lightrag_service.py clear
```

### Node.js Service

```javascript
const lightragService = require('./services/lightrag.service');

// Insert video
await lightragService.insertVideo(videoId, {
  title: 'Video Title',
  author: 'Author',
  transcription: 'Full text...',
  summary: 'Summary...',
  keyPoints: ['Point 1', 'Point 2']
});

// Query
const result = await lightragService.query('your query', 'hybrid');

// Get graph
const graph = await lightragService.getGraphData();
```

## Future Enhancements

- [ ] Real-time graph updates
- [ ] Custom entity types
- [ ] Relationship strength visualization
- [ ] Graph export (GraphML, JSON)
- [ ] Advanced filtering
- [ ] Time-based graph evolution
- [ ] Multi-language support

## References

- [LightRAG GitHub](https://github.com/HKUDS/LightRAG)
- [LightRAG Documentation](https://lightrag.readthedocs.io/)
- [D3.js Force Layout](https://d3js.org/d3-force)
- [NetworkX Documentation](https://networkx.org/)

