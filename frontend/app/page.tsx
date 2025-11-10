'use client';

import { useState, useEffect } from 'react';
import { FiVideo, FiCheckCircle, FiFolder, FiClock, FiPlus } from 'react-icons/fi';
import { videosApi, categoriesApi } from '@/lib/api';
import { Video, Category } from '@/types';
import VideoCard from '@/components/VideoCard';
import AddVideoModal from '@/components/AddVideoModal';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function Dashboard() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    watched: 0,
    categorized: 0,
    totalDuration: 0,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [videosRes, categoriesRes] = await Promise.all([
        videosApi.getAll({ limit: 12 }),
        categoriesApi.getAll(),
      ]);

      const videosData = Array.isArray(videosRes) ? videosRes : [];
      setVideos(videosData);
      setCategories(Array.isArray(categoriesRes) ? categoriesRes : []);

      // Calculate stats
      const watched = videosData.filter((v: Video) => v.watchStatus === 'watched').length;
      const categorized = videosData.filter((v: Video) => v.categoryId).length;
      const totalDuration = videosData.reduce(
        (sum: number, v: Video) => sum + (v.duration || 0),
        0
      );

      setStats({
        total: videosData.length,
        watched,
        categorized,
        totalDuration,
      });
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">
            Welcome to your YouTube Study Application
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          <FiPlus className="w-5 h-5" />
          <span>Add Video</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Videos</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {stats.total}
              </p>
            </div>
            <div className="bg-primary-100 p-3 rounded-lg">
              <FiVideo className="w-6 h-6 text-primary-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Watched</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {stats.watched}
              </p>
            </div>
            <div className="bg-green-100 p-3 rounded-lg">
              <FiCheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Categories</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {categories.length}
              </p>
            </div>
            <div className="bg-purple-100 p-3 rounded-lg">
              <FiFolder className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Duration</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">
                {formatDuration(stats.totalDuration)}
              </p>
            </div>
            <div className="bg-orange-100 p-3 rounded-lg">
              <FiClock className="w-6 h-6 text-orange-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Recent Videos */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Recent Videos</h2>
          <a
            href="/videos"
            className="text-primary-600 hover:text-primary-700 text-sm font-medium"
          >
            View All →
          </a>
        </div>

        {videos.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm p-12 text-center">
            <FiVideo className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No videos yet
            </h3>
            <p className="text-gray-600 mb-4">
              Start by adding your first YouTube video
            </p>
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              <FiPlus className="w-5 h-5" />
              <span>Add Video</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {videos.map((video) => (
              <VideoCard key={video.id} video={video} />
            ))}
          </div>
        )}
      </div>

      {/* Quick Categories */}
      {categories.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            Categories
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {categories.map((category) => (
              <a
                key={category.id}
                href={`/videos?category=${category.id}`}
                className="bg-white rounded-lg shadow-sm p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center space-x-2">
                  {category.icon && <span className="text-2xl">{category.icon}</span>}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">
                      {category.name}
                    </p>
                    <p className="text-sm text-gray-500">
                      {category.videoCount} videos
                    </p>
                  </div>
                </div>
              </a>
            ))}
          </div>
        </div>
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

