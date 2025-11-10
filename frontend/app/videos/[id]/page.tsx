'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { FiArrowLeft, FiExternalLink, FiEdit, FiTrash2, FiCheckCircle } from 'react-icons/fi';
import { videosApi, categoriesApi } from '@/lib/api';
import { Video, Category } from '@/types';
import CategoryBadge from '@/components/CategoryBadge';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function VideoDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [video, setVideo] = useState<Video | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'summary' | 'transcript'>('summary');

  useEffect(() => {
    if (params.id) {
      loadVideo(params.id as string);
      loadCategories();
    }
  }, [params.id]);

  const loadVideo = async (id: string) => {
    try {
      setLoading(true);
      const data = await videosApi.getById(id);
      setVideo(data);
    } catch (error) {
      console.error('Error loading video:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const data = await categoriesApi.getAll();
      setCategories(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading categories:', error);
    }
  };

  const handleWatchStatusChange = async (status: string) => {
    if (!video) return;
    try {
      await videosApi.update(video.id, { watchStatus: status });
      setVideo({ ...video, watchStatus: status as any });
    } catch (error) {
      console.error('Error updating watch status:', error);
    }
  };

  const handleDelete = async () => {
    if (!video || !confirm('Are you sure you want to delete this video?')) return;
    try {
      await videosApi.delete(video.id);
      router.push('/videos');
    } catch (error) {
      console.error('Error deleting video:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  if (!video) {
    return (
      <div className="text-center py-12">
        <h2 className="text-2xl font-bold text-gray-900">Video not found</h2>
        <button
          onClick={() => router.push('/videos')}
          className="mt-4 text-primary-600 hover:text-primary-700"
        >
          ← Back to Videos
        </button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Back Button */}
      <button
        onClick={() => router.back()}
        className="flex items-center text-gray-600 hover:text-gray-900"
      >
        <FiArrowLeft className="w-5 h-5 mr-2" />
        Back
      </button>

      {/* Video Header */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              {video.title}
            </h1>
            {video.author && (
              <p className="text-gray-600 mb-3">by {video.author}</p>
            )}
            <div className="flex items-center gap-3">
              {video.category && <CategoryBadge category={video.category} />}
              {video.tags.map((tag, index) => (
                <span
                  key={index}
                  className="text-sm bg-gray-100 text-gray-600 px-3 py-1 rounded"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <a
              href={video.url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 text-gray-600 hover:text-primary-600 transition-colors"
            >
              <FiExternalLink className="w-5 h-5" />
            </a>
            <button
              onClick={handleDelete}
              className="p-2 text-gray-600 hover:text-red-600 transition-colors"
            >
              <FiTrash2 className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Watch Status */}
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Status:</span>
          <select
            value={video.watchStatus}
            onChange={(e) => handleWatchStatusChange(e.target.value)}
            className="text-sm px-3 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="unwatched">Unwatched</option>
            <option value="watching">Watching</option>
            <option value="watched">Watched</option>
          </select>
        </div>
      </div>

      {/* Video Embed */}
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="aspect-video">
          <iframe
            src={`https://www.youtube.com/embed/${video.youtubeId}`}
            className="w-full h-full"
            allowFullScreen
          />
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-sm">
        <div className="border-b">
          <div className="flex">
            <button
              onClick={() => setActiveTab('summary')}
              className={`px-6 py-3 font-medium ${
                activeTab === 'summary'
                  ? 'text-primary-600 border-b-2 border-primary-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Summary
            </button>
            <button
              onClick={() => setActiveTab('transcript')}
              className={`px-6 py-3 font-medium ${
                activeTab === 'transcript'
                  ? 'text-primary-600 border-b-2 border-primary-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Transcript
            </button>
          </div>
        </div>

        <div className="p-6">
          {activeTab === 'summary' && (
            <div className="space-y-6">
              {video.summaryJson ? (
                <>
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">
                      Quick Summary
                    </h3>
                    <p className="text-gray-700">{video.summaryJson.quick}</p>
                  </div>

                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">
                      Detailed Summary
                    </h3>
                    <p className="text-gray-700 whitespace-pre-line">
                      {video.summaryJson.detailed}
                    </p>
                  </div>

                  <div>
                    <h3 className="font-semibold text-gray-900 mb-2">
                      Key Points
                    </h3>
                    <ul className="list-disc list-inside space-y-2 text-gray-700">
                      {video.summaryJson.keyPoints.map((point, index) => (
                        <li key={index}>{point}</li>
                      ))}
                    </ul>
                  </div>
                </>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-600 mb-4">
                    Summary is being generated...
                  </p>
                  <LoadingSpinner />
                </div>
              )}
            </div>
          )}

          {activeTab === 'transcript' && (
            <div>
              {video.transcription ? (
                <div className="prose max-w-none">
                  <p className="text-gray-700 whitespace-pre-line">
                    {video.transcription}
                  </p>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-600 mb-4">
                    Transcript is being fetched...
                  </p>
                  <LoadingSpinner />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

