/**
 * RAG (Retrieval-Augmented Generation) Service
 * This is a simplified implementation. For production, integrate with LightRAG or similar.
 */

class RAGService {
  constructor() {
    this.index = new Map(); // Simple in-memory index
    this.embeddings = new Map();
  }

  /**
   * Index video content for RAG
   */
  async indexVideo(videoId, transcription, metadata, summaryJson = null) {
    try {
      // Extract key points from summary if available
      let keyPoints = [];
      if (summaryJson && summaryJson.keyPoints) {
        keyPoints = summaryJson.keyPoints;
      }

      // Store video content
      this.index.set(videoId, {
        id: videoId,
        title: metadata.title,
        author: metadata.author,
        transcription: transcription.fullText,
        segments: transcription.segments,
        keyPoints: keyPoints,
        indexed_at: new Date()
      });

      // Generate embeddings from key points if available, otherwise from transcription
      let embeddingText = transcription.fullText;
      if (keyPoints.length > 0) {
        // Prioritize key points for embedding
        embeddingText = keyPoints.join(' ') + ' ' + transcription.fullText.substring(0, 1000);
      }
      
      const embedding = this.generateSimpleEmbedding(embeddingText);
      this.embeddings.set(videoId, embedding);

      return {
        success: true,
        videoId,
        wordCount: transcription.wordCount,
        keyPointsCount: keyPoints.length
      };
    } catch (error) {
      console.error('Error indexing video:', error);
      throw new Error(`Failed to index video: ${error.message}`);
    }
  }

  /**
   * Query the knowledge base
   */
  async query(queryText, videoIds = null) {
    try {
      const queryEmbedding = this.generateSimpleEmbedding(queryText);
      const results = [];

      // Filter by specific videos if provided
      const searchVideos = videoIds 
        ? Array.from(this.index.entries()).filter(([id]) => videoIds.includes(id))
        : Array.from(this.index.entries());

      for (const [videoId, content] of searchVideos) {
        const videoEmbedding = this.embeddings.get(videoId);
        if (!videoEmbedding) continue;

        // Calculate similarity
        const similarity = this.cosineSimilarity(queryEmbedding, videoEmbedding);

        // Find relevant segments
        const relevantSegments = this.findRelevantSegments(queryText, content.segments);

        if (similarity > 0.1 || relevantSegments.length > 0) {
          results.push({
            videoId,
            title: content.title,
            author: content.author,
            similarity,
            relevantSegments: relevantSegments.slice(0, 3)
          });
        }
      }

      // Sort by similarity
      results.sort((a, b) => b.similarity - a.similarity);

      return results;
    } catch (error) {
      console.error('Error querying RAG:', error);
      throw new Error(`Failed to query: ${error.message}`);
    }
  }

  /**
   * Get context for chat from selected videos
   */
  async getContext(videoIds) {
    const contexts = [];

    for (const videoId of videoIds) {
      const content = this.index.get(videoId);
      if (content) {
        contexts.push({
          videoId,
          title: content.title,
          author: content.author,
          excerpt: content.transcription.substring(0, 1000)
        });
      }
    }

    return contexts;
  }

  /**
   * Build relationships between videos based on Key Points
   */
  async buildRelationships(videoId, summaryJson = null) {
    const content = this.index.get(videoId);
    if (!content) return [];

    const relationships = [];
    
    // Extract key points from summary if available
    let videoKeyPoints = [];
    if (summaryJson && summaryJson.keyPoints) {
      videoKeyPoints = summaryJson.keyPoints;
    }

    // If no key points, fall back to embedding-based similarity
    if (videoKeyPoints.length === 0) {
      const videoEmbedding = this.embeddings.get(videoId);
      
      for (const [otherId, otherContent] of this.index.entries()) {
        if (otherId === videoId) continue;

        const otherEmbedding = this.embeddings.get(otherId);
        if (!otherEmbedding) continue;

        const similarity = this.cosineSimilarity(videoEmbedding, otherEmbedding);

        if (similarity > 0.3) {
          relationships.push({
            targetVideoId: otherId,
            title: otherContent.title,
            similarity,
            type: similarity > 0.6 ? 'strong' : 'moderate',
            reason: 'Content similarity'
          });
        }
      }
    } else {
      // Build relationships based on Key Points similarity
      const videoKeyPointsText = videoKeyPoints.join(' ').toLowerCase();
      const videoKeyPointsEmbedding = this.generateSimpleEmbedding(videoKeyPointsText);

      for (const [otherId, otherContent] of this.index.entries()) {
        if (otherId === videoId) continue;

        // Try to get other video's key points from metadata
        let otherKeyPoints = otherContent.keyPoints || [];
        
        if (otherKeyPoints.length === 0) {
          // Fall back to transcription if no key points
          const otherEmbedding = this.embeddings.get(otherId);
          if (!otherEmbedding) continue;
          
          const similarity = this.cosineSimilarity(videoKeyPointsEmbedding, otherEmbedding);
          
          if (similarity > 0.2) {
            relationships.push({
              targetVideoId: otherId,
              title: otherContent.title,
              similarity,
              type: similarity > 0.5 ? 'strong' : 'moderate',
              reason: 'Key points to content similarity'
            });
          }
        } else {
          // Compare key points to key points
          const otherKeyPointsText = otherKeyPoints.join(' ').toLowerCase();
          const otherKeyPointsEmbedding = this.generateSimpleEmbedding(otherKeyPointsText);
          
          const similarity = this.cosineSimilarity(videoKeyPointsEmbedding, otherKeyPointsEmbedding);
          
          // Find common topics/themes
          const commonThemes = this.findCommonThemes(videoKeyPoints, otherKeyPoints);
          
          if (similarity > 0.2 || commonThemes.length > 0) {
            relationships.push({
              targetVideoId: otherId,
              title: otherContent.title,
              similarity: Math.max(similarity, commonThemes.length * 0.2),
              type: (similarity > 0.5 || commonThemes.length >= 2) ? 'strong' : 'moderate',
              reason: commonThemes.length > 0 
                ? `Common themes: ${commonThemes.slice(0, 3).join(', ')}`
                : 'Key points similarity',
              commonThemes
            });
          }
        }
      }
    }

    return relationships.sort((a, b) => b.similarity - a.similarity);
  }

  /**
   * Find common themes between two sets of key points
   */
  findCommonThemes(keyPoints1, keyPoints2) {
    const commonThemes = [];
    
    // Extract important words from key points (excluding common words)
    const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'as', 'is', 'are', 'was', 'were', 'been', 'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'should', 'could', 'may', 'might', 'can', 'this', 'that', 'these', 'those']);
    
    const extractKeywords = (points) => {
      const keywords = new Set();
      points.forEach(point => {
        const words = point.toLowerCase()
          .replace(/[^\w\s]/g, '')
          .split(/\s+/)
          .filter(w => w.length > 3 && !stopWords.has(w));
        words.forEach(w => keywords.add(w));
      });
      return keywords;
    };

    const keywords1 = extractKeywords(keyPoints1);
    const keywords2 = extractKeywords(keyPoints2);

    // Find intersection
    for (const keyword of keywords1) {
      if (keywords2.has(keyword)) {
        commonThemes.push(keyword);
      }
    }

    return commonThemes;
  }

  /**
   * Generate simple word-frequency based embedding
   */
  generateSimpleEmbedding(text) {
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(w => w.length > 3); // Filter short words

    const frequency = {};
    words.forEach(word => {
      frequency[word] = (frequency[word] || 0) + 1;
    });

    // Get top 100 words
    const topWords = Object.entries(frequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 100);

    return new Map(topWords);
  }

  /**
   * Calculate cosine similarity between embeddings
   */
  cosineSimilarity(embedding1, embedding2) {
    const allWords = new Set([...embedding1.keys(), ...embedding2.keys()]);
    
    let dotProduct = 0;
    let magnitude1 = 0;
    let magnitude2 = 0;

    for (const word of allWords) {
      const val1 = embedding1.get(word) || 0;
      const val2 = embedding2.get(word) || 0;

      dotProduct += val1 * val2;
      magnitude1 += val1 * val1;
      magnitude2 += val2 * val2;
    }

    if (magnitude1 === 0 || magnitude2 === 0) return 0;

    return dotProduct / (Math.sqrt(magnitude1) * Math.sqrt(magnitude2));
  }

  /**
   * Find relevant segments in transcript
   */
  findRelevantSegments(query, segments) {
    const queryWords = query.toLowerCase().split(/\s+/);
    const relevant = [];

    segments.forEach(segment => {
      const segmentText = segment.text.toLowerCase();
      const matchCount = queryWords.filter(word => segmentText.includes(word)).length;

      if (matchCount > 0) {
        relevant.push({
          timestamp: segment.start,
          text: segment.text,
          relevance: matchCount / queryWords.length
        });
      }
    });

    return relevant.sort((a, b) => b.relevance - a.relevance);
  }

  /**
   * Remove video from index
   */
  async removeVideo(videoId) {
    this.index.delete(videoId);
    this.embeddings.delete(videoId);
    return { success: true };
  }

  /**
   * Get index statistics
   */
  getStats() {
    return {
      totalVideos: this.index.size,
      totalEmbeddings: this.embeddings.size,
      indexSize: JSON.stringify([...this.index.entries()]).length
    };
  }
}

module.exports = new RAGService();

