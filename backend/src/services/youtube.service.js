const ytdl = require('@distube/ytdl-core');
const axios = require('axios');

class YouTubeService {
  constructor() {
    this.apiKey = process.env.YOUTUBE_API_KEY;
  }

  /**
   * Extract YouTube video ID from URL
   */
  extractVideoId(url) {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/,
      /^([a-zA-Z0-9_-]{11})$/
    ];

    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }

    throw new Error('Invalid YouTube URL or video ID');
  }

  /**
   * Get video metadata using ytdl-core (no API key required)
   */
  async getVideoMetadata(videoId) {
    try {
      const url = `https://www.youtube.com/watch?v=${videoId}`;
      const info = await ytdl.getInfo(url);

      const videoDetails = info.videoDetails;

      return {
        youtubeId: videoId,
        url: url,
        title: videoDetails.title,
        author: videoDetails.author.name,
        duration: parseInt(videoDetails.lengthSeconds),
        uploadDate: videoDetails.uploadDate ? new Date(videoDetails.uploadDate) : null,
        thumbnail: videoDetails.thumbnails[videoDetails.thumbnails.length - 1]?.url || null,
        description: videoDetails.description
      };
    } catch (error) {
      console.error('Error fetching video metadata:', error);
      throw new Error(`Failed to fetch video metadata: ${error.message}`);
    }
  }

  /**
   * Get video metadata using YouTube Data API (if API key is available)
   */
  async getVideoMetadataWithAPI(videoId) {
    if (!this.apiKey) {
      return this.getVideoMetadata(videoId);
    }

    try {
      const response = await axios.get('https://www.googleapis.com/youtube/v3/videos', {
        params: {
          part: 'snippet,contentDetails,statistics',
          id: videoId,
          key: this.apiKey
        }
      });

      if (!response.data.items || response.data.items.length === 0) {
        throw new Error('Video not found');
      }

      const video = response.data.items[0];
      const snippet = video.snippet;
      const contentDetails = video.contentDetails;

      // Parse ISO 8601 duration
      const duration = this.parseDuration(contentDetails.duration);

      return {
        youtubeId: videoId,
        url: `https://www.youtube.com/watch?v=${videoId}`,
        title: snippet.title,
        author: snippet.channelTitle,
        duration: duration,
        uploadDate: new Date(snippet.publishedAt),
        thumbnail: snippet.thumbnails.high?.url || snippet.thumbnails.default?.url,
        description: snippet.description
      };
    } catch (error) {
      console.error('Error fetching video metadata with API:', error);
      // Fallback to ytdl-core
      return this.getVideoMetadata(videoId);
    }
  }

  /**
   * Parse ISO 8601 duration to seconds
   */
  parseDuration(duration) {
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return 0;

    const hours = parseInt(match[1] || 0);
    const minutes = parseInt(match[2] || 0);
    const seconds = parseInt(match[3] || 0);

    return hours * 3600 + minutes * 60 + seconds;
  }

  /**
   * Get playlist videos (requires API key)
   */
  async getPlaylistVideos(playlistId) {
    if (!this.apiKey) {
      throw new Error('YouTube API key is required for playlist import');
    }

    try {
      const videoIds = [];
      let nextPageToken = null;

      do {
        const response = await axios.get('https://www.googleapis.com/youtube/v3/playlistItems', {
          params: {
            part: 'contentDetails',
            playlistId: playlistId,
            maxResults: 50,
            pageToken: nextPageToken,
            key: this.apiKey
          }
        });

        response.data.items.forEach(item => {
          videoIds.push(item.contentDetails.videoId);
        });

        nextPageToken = response.data.nextPageToken;
      } while (nextPageToken);

      return videoIds;
    } catch (error) {
      console.error('Error fetching playlist videos:', error);
      throw new Error(`Failed to fetch playlist: ${error.message}`);
    }
  }

  /**
   * Validate if video exists and is accessible
   */
  async validateVideo(videoId) {
    try {
      await this.getVideoMetadata(videoId);
      return true;
    } catch (error) {
      return false;
    }
  }
}

module.exports = new YouTubeService();

