export interface Video {
  id: string;
  youtubeId: string;
  url: string;
  title: string;
  author: string | null;
  duration: number | null;
  uploadDate: string | null;
  thumbnail: string | null;
  categoryId: string | null;
  category?: Category;
  tags: string[];
  watchStatus: 'unwatched' | 'watching' | 'watched';
  transcription: string | null;
  summaryJson: Summary | null;
  createdAt: string;
  updatedAt: string;
}

export interface Summary {
  quick: string;
  detailed: string;
  keyPoints: string[];
}

export interface Category {
  id: string;
  name: string;
  parentId: string | null;
  color: string | null;
  icon: string | null;
  videoCount: number;
  createdAt: string;
}

export interface KnowledgeGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
  stats: {
    totalVideos: number;
    totalConnections: number;
    categories: number;
  };
}

export interface GraphNode {
  id: string;
  youtubeId: string;
  title: string;
  author: string;
  category: string;
  categoryColor: string;
  thumbnail: string;
  watchStatus: string;
  hasTranscription: boolean;
  hasSummary: boolean;
}

export interface GraphEdge {
  source: string;
  target: string;
  similarity: number;
  type: 'strong' | 'moderate';
}

export interface ChatSession {
  id: string;
  videoIds: string[];
  videos?: Video[];
  messages: ChatMessage[];
  contextSummary?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface Stats {
  totalVideos: number;
  categorizedVideos: number;
  watchedVideos: number;
  totalDuration: number;
}

