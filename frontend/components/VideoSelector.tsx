'use client';

import { useState, useEffect } from 'react';
import { FiCheck, FiVideo } from 'react-icons/fi';
import { videosApi } from '@/lib/api';
import LoadingSpinner from './LoadingSpinner';

interface VideoSelectorProps {
  selectedVideos: string[];
  onSelect: (videoIds: string[]) => void;
}

export default function VideoSelector({ selectedVideos, onSelect }: VideoSelectorProps) {
  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadVideos();
  }, []);

  const loadVideos = async () => {
    try {
      setLoading(true);
      const data = await videosApi.getAll({ limit: 100 });
      setVideos(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading videos:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleVideo = (videoId: string) => {
    if (selectedVideos.includes(videoId)) {
      onSelect(selectedVideos.filter(id => id !== videoId));
    } else {
      onSelect([...selectedVideos, videoId]);
    }
  };

  const filteredVideos = videos.filter(video =>
    video.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    video.author?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        placeholder="Search videos..."
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      />

      {/* Selection Info */}
      <div className="text-sm text-gray-600">
        {selectedVideos.length} video{selectedVideos.length !== 1 ? 's' : ''} selected
      </div>

      {/* Video List */}
      <div className="space-y-2 max-h-[500px] overflow-y-auto">
        {filteredVideos.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No videos found
          </div>
        ) : (
          filteredVideos.map((video) => (
            <button
              key={video.id}
              onClick={() => toggleVideo(video.id)}
              className={`w-full text-left p-3 rounded-lg border-2 transition-colors ${
                selectedVideos.includes(video.id)
                  ? 'border-blue-600 bg-blue-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-1">
                  {selectedVideos.includes(video.id) ? (
                    <div className="w-5 h-5 rounded bg-blue-600 flex items-center justify-center">
                      <FiCheck className="w-3 h-3 text-white" />
                    </div>
                  ) : (
                    <div className="w-5 h-5 rounded border-2 border-gray-300" />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm text-gray-900 truncate">
                    {video.title}
                  </div>
                  {video.author && (
                    <div className="text-xs text-gray-500 truncate">
                      {video.author}
                    </div>
                  )}
                  <div className="flex items-center gap-2 mt-1">
                    {video.hasSummary && (
                      <span className="text-xs text-green-600">✓ Summarized</span>
                    )}
                    {video.hasTranscription && (
                      <span className="text-xs text-blue-600">✓ Transcribed</span>
                    )}
                  </div>
                </div>
              </div>
            </button>
          ))
        )}
      </div>

      {/* Select All/None */}
      <div className="flex gap-2">
        <button
          onClick={() => onSelect(filteredVideos.map(v => v.id))}
          className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          Select All
        </button>
        <button
          onClick={() => onSelect([])}
          className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
        >
          Clear
        </button>
      </div>
    </div>
  );
}

