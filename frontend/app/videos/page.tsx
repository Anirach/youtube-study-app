'use client';

import { useState, useEffect } from 'react';
import { FiGrid, FiList, FiPlus } from 'react-icons/fi';
import { videosApi, categoriesApi } from '@/lib/api';
import { Video, Category } from '@/types';
import VideoCard from '@/components/VideoCard';
import AddVideoModal from '@/components/AddVideoModal';
import AdvancedSearch from '@/components/AdvancedSearch';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function VideosPage() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filters, setFilters] = useState<any>({});

  useEffect(() => {
    loadData();
  }, [filters]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [videosRes, categoriesRes] = await Promise.all([
        videosApi.getAll(filters),
        categoriesApi.getAll(),
      ]);

      setVideos(Array.isArray(videosRes) ? videosRes : []);
      setCategories(Array.isArray(categoriesRes) ? categoriesRes : []);
    } catch (error) {
      console.error('Error loading videos:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (newFilters: any) => {
    setFilters(newFilters);
  };

  const handleClearSearch = () => {
    setFilters({});
  };

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Videos</h1>
          <p className="text-gray-600 mt-1">
            Manage your YouTube video collection
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <FiPlus className="w-5 h-5" />
          <span>Add Video</span>
        </button>
      </div>

      {/* Advanced Search */}
      <div className="bg-white rounded-lg shadow-sm p-4">
        <AdvancedSearch
          onSearch={handleSearch}
          onClear={handleClearSearch}
        />
      </div>

      {/* Stats and View Toggle */}
      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Showing <span className="font-semibold">{videos.length}</span> video{videos.length !== 1 ? 's' : ''}
          </div>
          <div className="flex items-center gap-2 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded ${
                viewMode === 'grid'
                  ? 'bg-white shadow-sm text-blue-600'
                  : 'text-gray-600'
              }`}
            >
              <FiGrid className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded ${
                viewMode === 'list'
                  ? 'bg-white shadow-sm text-blue-600'
                  : 'text-gray-600'
              }`}
            >
              <FiList className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Videos Grid/List */}
      {loading ? (
        <div className="flex items-center justify-center h-96">
          <LoadingSpinner />
        </div>
      ) : videos.length === 0 ? (
        <div className="bg-white rounded-lg shadow-sm p-12 text-center">
          <FiPlus className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No videos found
          </h3>
          <p className="text-gray-600 mb-4">
            Try adjusting your filters or add a new video
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <FiPlus className="w-5 h-5" />
            <span>Add Video</span>
          </button>
        </div>
      ) : (
        <>
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {videos.map((video) => (
                <VideoCard key={video.id} video={video} onUpdate={loadData} />
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {videos.map((video) => (
                <div
                  key={video.id}
                  className="bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start space-x-4">
                    <img
                      src={video.thumbnail || '/placeholder.png'}
                      alt={video.title}
                      className="w-40 h-24 object-cover rounded"
                    />
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-1">
                        {video.title}
                      </h3>
                      <p className="text-sm text-gray-600 mb-2">
                        {video.author}
                      </p>
                      <div className="flex items-center gap-2 text-xs">
                        {video.category && (
                          <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded">
                            {video.category.name}
                          </span>
                        )}
                        <span className="text-gray-500 capitalize">
                          {video.watchStatus}
                        </span>
                        {video.transcription && (
                          <span className="bg-green-50 text-green-700 px-2 py-1 rounded">
                            Transcribed
                          </span>
                        )}
                        {video.summaryJson && (
                          <span className="bg-purple-50 text-purple-700 px-2 py-1 rounded">
                            Summarized
                          </span>
                        )}
                      </div>
                    </div>
                    <a
                      href={`/videos/${video.id}`}
                      className="px-4 py-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      View
                    </a>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Add Video Modal */}
      <AddVideoModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onSuccess={loadData}
        categories={categories}
      />
    </div>
  );
}
