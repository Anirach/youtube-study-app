'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Video } from '@/types';
import { FiClock, FiUser, FiCheckCircle, FiCircle } from 'react-icons/fi';
import CategoryBadge from './CategoryBadge';

interface VideoCardProps {
  video: Video;
  onUpdate?: (video: Video) => void;
}

export default function VideoCard({ video, onUpdate }: VideoCardProps) {
  const formatDuration = (seconds: number | null) => {
    if (!seconds) return 'N/A';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const getWatchStatusIcon = () => {
    switch (video.watchStatus) {
      case 'watched':
        return <FiCheckCircle className="w-5 h-5 text-green-500" />;
      case 'watching':
        return <FiCircle className="w-5 h-5 text-yellow-500" />;
      default:
        return <FiCircle className="w-5 h-5 text-gray-300" />;
    }
  };

  return (
    <Link href={`/videos/${video.id}`}>
      <div className="bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow overflow-hidden cursor-pointer">
        {/* Thumbnail */}
        <div className="relative w-full aspect-video bg-gray-200">
          {video.thumbnail ? (
            <Image
              src={video.thumbnail}
              alt={video.title}
              fill
              className="object-cover"
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <FiCircle className="w-12 h-12 text-gray-400" />
            </div>
          )}
          {video.duration && (
            <div className="absolute bottom-2 right-2 bg-black bg-opacity-75 text-white text-xs px-2 py-1 rounded">
              {formatDuration(video.duration)}
            </div>
          )}
        </div>

        {/* Content */}
        <div className="p-4">
          <div className="flex items-start justify-between mb-2">
            <h3 className="font-semibold text-gray-900 line-clamp-2 flex-1">
              {video.title}
            </h3>
            {getWatchStatusIcon()}
          </div>

          {video.author && (
            <div className="flex items-center text-sm text-gray-600 mb-2">
              <FiUser className="w-4 h-4 mr-1" />
              <span className="truncate">{video.author}</span>
            </div>
          )}

          {video.category && (
            <div className="mb-2">
              <CategoryBadge category={video.category} />
            </div>
          )}

          {video.tags && video.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {video.tags.slice(0, 3).map((tag, index) => (
                <span
                  key={index}
                  className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded"
                >
                  {tag}
                </span>
              ))}
              {video.tags.length > 3 && (
                <span className="text-xs text-gray-500">
                  +{video.tags.length - 3}
                </span>
              )}
            </div>
          )}

          {/* Status indicators */}
          <div className="flex items-center gap-2 text-xs text-gray-500 mt-3">
            {video.transcription && (
              <span className="bg-green-50 text-green-700 px-2 py-1 rounded">
                Transcribed
              </span>
            )}
            {video.summaryJson && (
              <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded">
                Summarized
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}

