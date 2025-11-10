/**
 * Knowledge Graph Service
 * Extracts entities and relationships from video Key Points
 */

class KnowledgeGraphService {
  constructor() {
    this.entityTypes = {
      CONCEPT: 'concept',
      TECHNOLOGY: 'technology',
      PERSON: 'person',
      ORGANIZATION: 'organization',
      FEATURE: 'feature',
      TOOL: 'tool'
    };
  }

  /**
   * Extract entities from Key Points
   */
  extractEntitiesFromKeyPoints(keyPoints, videoId, videoTitle) {
    const entities = [];
    const stopWords = new Set([
      'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
      'of', 'with', 'by', 'from', 'as', 'is', 'are', 'was', 'were', 'been',
      'be', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
      'should', 'could', 'may', 'might', 'can', 'this', 'that', 'these',
      'those', 'it', 'its', 'they', 'their', 'them'
    ]);

    keyPoints.forEach((point, index) => {
      // Extract key phrases (2-4 words)
      const words = point
        .toLowerCase()
        .replace(/[^\w\s]/g, '')
        .split(/\s+/)
        .filter(w => w.length > 2 && !stopWords.has(w));

      // Extract bigrams and trigrams
      for (let i = 0; i < words.length; i++) {
        // Single important words (capitalized in original or technical terms)
        if (point.includes(words[i].charAt(0).toUpperCase() + words[i].slice(1))) {
          entities.push({
            id: `entity_${words[i]}`,
            label: words[i].charAt(0).toUpperCase() + words[i].slice(1),
            type: this.detectEntityType(words[i], point),
            description: point,
            sourceVideo: videoId,
            sourceVideoTitle: videoTitle,
            keyPointIndex: index
          });
        }

        // Bigrams
        if (i < words.length - 1) {
          const bigram = `${words[i]} ${words[i + 1]}`;
          if (this.isSignificantPhrase(bigram, point)) {
            entities.push({
              id: `entity_${bigram.replace(/\s+/g, '_')}`,
              label: this.capitalizePhrase(bigram),
              type: this.detectEntityType(bigram, point),
              description: point,
              sourceVideo: videoId,
              sourceVideoTitle: videoTitle,
              keyPointIndex: index
            });
          }
        }

        // Trigrams
        if (i < words.length - 2) {
          const trigram = `${words[i]} ${words[i + 1]} ${words[i + 2]}`;
          if (this.isSignificantPhrase(trigram, point)) {
            entities.push({
              id: `entity_${trigram.replace(/\s+/g, '_')}`,
              label: this.capitalizePhrase(trigram),
              type: this.detectEntityType(trigram, point),
              description: point,
              sourceVideo: videoId,
              sourceVideoTitle: videoTitle,
              keyPointIndex: index
            });
          }
        }
      }
    });

    // Deduplicate entities
    const uniqueEntities = this.deduplicateEntities(entities);
    return uniqueEntities;
  }

  /**
   * Detect entity type based on context
   */
  detectEntityType(phrase, context) {
    const lowerPhrase = phrase.toLowerCase();
    const lowerContext = context.toLowerCase();

    // Technology indicators
    if (
      lowerContext.includes('version') ||
      lowerContext.includes('update') ||
      lowerContext.includes('release') ||
      lowerPhrase.includes('ai') ||
      lowerPhrase.includes('model') ||
      lowerPhrase.includes('api')
    ) {
      return this.entityTypes.TECHNOLOGY;
    }

    // Feature indicators
    if (
      lowerContext.includes('feature') ||
      lowerContext.includes('capability') ||
      lowerContext.includes('functionality') ||
      lowerContext.includes('mode')
    ) {
      return this.entityTypes.FEATURE;
    }

    // Tool indicators
    if (
      lowerContext.includes('tool') ||
      lowerContext.includes('platform') ||
      lowerContext.includes('service') ||
      lowerContext.includes('application')
    ) {
      return this.entityTypes.TOOL;
    }

    // Person indicators
    if (
      lowerContext.includes('author') ||
      lowerContext.includes('creator') ||
      lowerContext.includes('developer')
    ) {
      return this.entityTypes.PERSON;
    }

    // Default to concept
    return this.entityTypes.CONCEPT;
  }

  /**
   * Check if phrase is significant
   */
  isSignificantPhrase(phrase, context) {
    // Check if phrase appears in title case in context
    const titleCasePhrase = this.capitalizePhrase(phrase);
    if (context.includes(titleCasePhrase)) {
      return true;
    }

    // Check for technical terms
    const technicalPatterns = [
      /\d+\.\d+/, // Version numbers
      /[A-Z]{2,}/, // Acronyms
      /api|sdk|llm|ai|ml/i
    ];

    return technicalPatterns.some(pattern => pattern.test(phrase));
  }

  /**
   * Capitalize phrase
   */
  capitalizePhrase(phrase) {
    return phrase
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Deduplicate entities
   */
  deduplicateEntities(entities) {
    const entityMap = new Map();

    entities.forEach(entity => {
      const existing = entityMap.get(entity.id);
      if (existing) {
        // Merge descriptions
        if (!existing.description.includes(entity.description)) {
          existing.description += ' | ' + entity.description;
        }
        // Track multiple source videos
        if (!existing.sourceVideos) {
          existing.sourceVideos = [existing.sourceVideo];
        }
        if (!existing.sourceVideos.includes(entity.sourceVideo)) {
          existing.sourceVideos.push(entity.sourceVideo);
        }
      } else {
        entityMap.set(entity.id, entity);
      }
    });

    return Array.from(entityMap.values());
  }

  /**
   * Build relationships between entities
   */
  buildEntityRelationships(entities) {
    const relationships = [];

    // Group entities by source video
    const entitiesByVideo = new Map();
    entities.forEach(entity => {
      const videoId = entity.sourceVideo;
      if (!entitiesByVideo.has(videoId)) {
        entitiesByVideo.set(videoId, []);
      }
      entitiesByVideo.get(videoId).push(entity);
    });

    // Create relationships within same video (co-occurrence)
    entitiesByVideo.forEach((videoEntities, videoId) => {
      for (let i = 0; i < videoEntities.length; i++) {
        for (let j = i + 1; j < videoEntities.length; j++) {
          const entity1 = videoEntities[i];
          const entity2 = videoEntities[j];

          // Check if entities are from nearby key points
          const keyPointDistance = Math.abs(
            entity1.keyPointIndex - entity2.keyPointIndex
          );

          if (keyPointDistance <= 2) {
            relationships.push({
              source: entity1.id,
              target: entity2.id,
              type: 'co-occurs',
              weight: 1 / (keyPointDistance + 1),
              context: videoId
            });
          }
        }
      }
    });

    // Create relationships across videos (same entity)
    entities.forEach(entity => {
      if (entity.sourceVideos && entity.sourceVideos.length > 1) {
        // This entity appears in multiple videos
        entity.sourceVideos.forEach((videoId, i) => {
          entity.sourceVideos.slice(i + 1).forEach(otherVideoId => {
            relationships.push({
              source: entity.id,
              target: `video_${videoId}`,
              type: 'appears-in',
              weight: 0.8,
              context: 'cross-video'
            });
            relationships.push({
              source: entity.id,
              target: `video_${otherVideoId}`,
              type: 'appears-in',
              weight: 0.8,
              context: 'cross-video'
            });
          });
        });
      }
    });

    return relationships;
  }

  /**
   * Build complete knowledge graph from videos
   */
  async buildGraphFromVideos(videos) {
    const allEntities = [];
    const videoNodes = [];

    // Extract entities from each video
    videos.forEach(video => {
      // Add video as a node
      videoNodes.push({
        id: `video_${video.id}`,
        videoId: video.id,
        label: video.title,
        title: video.title,
        author: video.author,
        type: 'video',
        youtubeId: video.youtubeId,
        thumbnail: video.thumbnail,
        watchStatus: video.watchStatus,
        category: video.category?.name || 'Uncategorized',
        categoryColor: video.category?.color || '#6b7280'
      });

      // Extract entities from key points
      if (video.summaryJson) {
        let summaryJson;
        try {
          summaryJson = typeof video.summaryJson === 'string'
            ? JSON.parse(video.summaryJson)
            : video.summaryJson;
        } catch (e) {
          console.error(`Error parsing summaryJson for video ${video.id}:`, e);
          return;
        }

        if (summaryJson.keyPoints && summaryJson.keyPoints.length > 0) {
          const entities = this.extractEntitiesFromKeyPoints(
            summaryJson.keyPoints,
            video.id,
            video.title
          );
          allEntities.push(...entities);
        }
      }
    });

    // Deduplicate all entities
    const uniqueEntities = this.deduplicateEntities(allEntities);

    // Build relationships
    const entityRelationships = this.buildEntityRelationships(uniqueEntities);

    // Combine video nodes and entity nodes
    const allNodes = [...videoNodes, ...uniqueEntities];

    // Build video-to-video relationships based on shared entities
    const videoRelationships = this.buildVideoRelationships(
      videos,
      uniqueEntities
    );

    const allEdges = [...entityRelationships, ...videoRelationships];

    return {
      nodes: allNodes,
      edges: allEdges,
      stats: {
        totalNodes: allNodes.length,
        totalEdges: allEdges.length,
        videoNodes: videoNodes.length,
        entityNodes: uniqueEntities.length
      }
    };
  }

  /**
   * Build relationships between videos based on shared entities
   */
  buildVideoRelationships(videos, entities) {
    const relationships = [];
    const videoEntityMap = new Map();

    // Map entities to videos
    entities.forEach(entity => {
      const videoIds = entity.sourceVideos || [entity.sourceVideo];
      videoIds.forEach(videoId => {
        if (!videoEntityMap.has(videoId)) {
          videoEntityMap.set(videoId, []);
        }
        videoEntityMap.get(videoId).push(entity.id);
      });
    });

    // Calculate similarity between videos
    videos.forEach((video1, i) => {
      videos.slice(i + 1).forEach(video2 => {
        const entities1 = videoEntityMap.get(video1.id) || [];
        const entities2 = videoEntityMap.get(video2.id) || [];

        // Calculate Jaccard similarity
        const intersection = entities1.filter(e => entities2.includes(e));
        const union = new Set([...entities1, ...entities2]);

        if (intersection.length > 0) {
          const similarity = intersection.length / union.size;

          relationships.push({
            source: `video_${video1.id}`,
            target: `video_${video2.id}`,
            type: similarity > 0.3 ? 'strong' : 'moderate',
            weight: similarity,
            sharedEntities: intersection.length,
            reason: `${intersection.length} shared concepts`
          });
        }
      });
    });

    return relationships;
  }
}

module.exports = new KnowledgeGraphService();

