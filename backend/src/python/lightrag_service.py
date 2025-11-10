#!/usr/bin/env python3
"""
LightRAG Service for YouTube Study App
Provides knowledge graph generation and querying using LightRAG
"""

import os
import sys
import json
import asyncio
from pathlib import Path
from typing import List, Dict, Any, Optional

# LightRAG imports
try:
    from lightrag import LightRAG, QueryParam
    from lightrag.llm import gpt_4o_mini_complete, gpt_4o_complete
    from lightrag.llm import gemini_complete
except ImportError as e:
    print(f"Error importing LightRAG: {e}", file=sys.stderr)
    print("Please install: pip install lightrag-hku", file=sys.stderr)
    sys.exit(1)


class LightRAGService:
    """Service for managing LightRAG knowledge graph"""
    
    def __init__(self, working_dir: str = "./lightrag_data"):
        """Initialize LightRAG service"""
        self.working_dir = Path(working_dir)
        self.working_dir.mkdir(parents=True, exist_ok=True)
        
        # Get API keys from environment
        self.openai_api_key = os.getenv('OPENAI_API_KEY')
        self.gemini_api_key = os.getenv('GEMINI_API_KEY')
        
        # Determine which LLM to use
        self.llm_provider = os.getenv('LLM_PROVIDER', 'openai').lower()
        
        # Initialize LightRAG
        self.rag = self._initialize_rag()
        
    def _initialize_rag(self) -> LightRAG:
        """Initialize LightRAG with appropriate LLM"""
        
        if self.llm_provider == 'gemini' and self.gemini_api_key:
            print("Using Gemini for LightRAG", file=sys.stderr)
            return LightRAG(
                working_dir=str(self.working_dir),
                llm_model_func=gemini_complete,
                llm_model_name="gemini-2.0-flash-exp",
                embedding_func=gemini_complete,
            )
        elif self.openai_api_key:
            print("Using OpenAI for LightRAG", file=sys.stderr)
            return LightRAG(
                working_dir=str(self.working_dir),
                llm_model_func=gpt_4o_mini_complete,
                llm_model_name="gpt-4o-mini",
            )
        else:
            raise ValueError("No API key found for LLM provider")
    
    async def insert_video(self, video_id: str, content: Dict[str, Any]) -> Dict[str, Any]:
        """
        Insert video content into LightRAG knowledge graph
        
        Args:
            video_id: Unique video identifier
            content: Dict with title, author, transcription, summary, keyPoints
        
        Returns:
            Dict with success status and metadata
        """
        try:
            # Build document from video content
            # Priority: Transcription > Key Points > Summary
            doc_parts = []
            
            # Add metadata header
            doc_parts.append(f"=== Video: {content.get('title', 'Unknown')} ===")
            doc_parts.append(f"Author: {content.get('author', 'Unknown')}")
            doc_parts.append(f"Video ID: {video_id}")
            doc_parts.append("")
            
            # PRIMARY: Add full transcription (this is the most important)
            if content.get('transcription'):
                transcription = content['transcription'].strip()
                doc_parts.append("--- Full Transcript ---")
                doc_parts.append(transcription)
                doc_parts.append("")
            
            # SECONDARY: Add key points for quick reference
            if content.get('keyPoints'):
                doc_parts.append("--- Key Points ---")
                for i, point in enumerate(content['keyPoints'], 1):
                    doc_parts.append(f"{i}. {point}")
                doc_parts.append("")
            
            # TERTIARY: Add summary as additional context
            if content.get('summary'):
                doc_parts.append("--- Summary ---")
                doc_parts.append(content['summary'])
                doc_parts.append("")
            
            document = "\n".join(doc_parts)
            
            print(f"Inserting video {video_id} into LightRAG", file=sys.stderr)
            print(f"Document length: {len(document)} characters", file=sys.stderr)
            print(f"Transcription length: {len(content.get('transcription', ''))} characters", file=sys.stderr)
            
            # Insert into LightRAG (it will extract entities and relationships)
            await self.rag.ainsert(document)
            
            return {
                "success": True,
                "video_id": video_id,
                "document_length": len(document),
                "transcription_length": len(content.get('transcription', ''))
            }
            
        except Exception as e:
            print(f"Error inserting video {video_id}: {str(e)}", file=sys.stderr)
            return {
                "success": False,
                "video_id": video_id,
                "error": str(e)
            }
    
    async def query(self, query_text: str, mode: str = "hybrid") -> Dict[str, Any]:
        """
        Query the knowledge graph
        
        Args:
            query_text: Query string
            mode: Query mode - "naive", "local", "global", or "hybrid"
        
        Returns:
            Dict with query results
        """
        try:
            print(f"Querying LightRAG: '{query_text}' (mode: {mode})", file=sys.stderr)
            
            result = await self.rag.aquery(
                query_text,
                param=QueryParam(mode=mode)
            )
            
            print(f"LightRAG query result length: {len(str(result))} characters", file=sys.stderr)
            
            return {
                "success": True,
                "answer": result,  # The actual answer text
                "result": result,  # Keep for backward compatibility
                "mode": mode
            }
            
        except Exception as e:
            print(f"LightRAG query error: {str(e)}", file=sys.stderr)
            return {
                "success": False,
                "error": str(e)
            }
    
    async def get_graph_data(self) -> Dict[str, Any]:
        """
        Get knowledge graph data (nodes and edges)
        
        Returns:
            Dict with nodes and edges for visualization
        """
        try:
            # LightRAG stores graph in working_dir/graph_chunk_entity_relation.graphml
            import networkx as nx
            
            graphml_path = self.working_dir / "graph_chunk_entity_relation.graphml"
            
            if not graphml_path.exists():
                return {
                    "success": True,
                    "nodes": [],
                    "edges": [],
                    "message": "No graph data yet"
                }
            
            # Load graph
            G = nx.read_graphml(str(graphml_path))
            
            # Extract nodes
            nodes = []
            for node_id, node_data in G.nodes(data=True):
                nodes.append({
                    "id": node_id,
                    "label": node_data.get("entity_name", node_id),
                    "type": node_data.get("entity_type", "unknown"),
                    "description": node_data.get("description", ""),
                })
            
            # Extract edges
            edges = []
            for source, target, edge_data in G.edges(data=True):
                edges.append({
                    "source": source,
                    "target": target,
                    "relation": edge_data.get("relation", "related_to"),
                    "weight": edge_data.get("weight", 1.0),
                    "description": edge_data.get("description", ""),
                })
            
            return {
                "success": True,
                "nodes": nodes,
                "edges": edges,
                "stats": {
                    "total_nodes": len(nodes),
                    "total_edges": len(edges)
                }
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }
    
    async def clear_graph(self) -> Dict[str, Any]:
        """Clear all graph data"""
        try:
            import shutil
            if self.working_dir.exists():
                shutil.rmtree(self.working_dir)
                self.working_dir.mkdir(parents=True, exist_ok=True)
            
            # Reinitialize RAG
            self.rag = self._initialize_rag()
            
            return {
                "success": True,
                "message": "Graph cleared"
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e)
            }


async def main():
    """Main entry point for CLI usage"""
    if len(sys.argv) < 2:
        print(json.dumps({
            "error": "Usage: python lightrag_service.py <command> [args...]"
        }))
        sys.exit(1)
    
    command = sys.argv[1]
    
    # Initialize service
    working_dir = os.getenv('LIGHTRAG_WORKING_DIR', './lightrag_data')
    service = LightRAGService(working_dir=working_dir)
    
    result = {}
    
    try:
        if command == "insert":
            # Insert video: python lightrag_service.py insert <video_id> <json_content>
            video_id = sys.argv[2]
            content = json.loads(sys.argv[3])
            result = await service.insert_video(video_id, content)
            
        elif command == "query":
            # Query: python lightrag_service.py query <query_text> [mode]
            query_text = sys.argv[2]
            mode = sys.argv[3] if len(sys.argv) > 3 else "hybrid"
            result = await service.query(query_text, mode)
            
        elif command == "get_graph":
            # Get graph: python lightrag_service.py get_graph
            result = await service.get_graph_data()
            
        elif command == "clear":
            # Clear graph: python lightrag_service.py clear
            result = await service.clear_graph()
            
        else:
            result = {"error": f"Unknown command: {command}"}
    
    except Exception as e:
        result = {"error": str(e)}
    
    print(json.dumps(result, ensure_ascii=False))


if __name__ == "__main__":
    asyncio.run(main())

