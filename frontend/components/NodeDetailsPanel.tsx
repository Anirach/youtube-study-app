'use client';

import { FiX, FiExternalLink, FiTag, FiFileText } from 'react-icons/fi';

interface NodeDetailsPanelProps {
  node: any;
  onClose: () => void;
}

export default function NodeDetailsPanel({ node, onClose }: NodeDetailsPanelProps) {
  if (!node) return null;

  return (
    <div className="absolute top-4 right-4 w-96 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden z-10">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-3 flex items-center justify-between">
        <h3 className="text-white font-semibold">Node Details</h3>
        <button
          onClick={onClose}
          className="text-white hover:bg-white/20 p-1 rounded transition-colors"
        >
          <FiX className="w-5 h-5" />
        </button>
      </div>

      {/* Content */}
      <div className="p-4 max-h-[600px] overflow-y-auto">
        {/* ID & Label */}
        <div className="mb-4">
          <div className="text-xs text-gray-500 mb-1">ID</div>
          <div className="font-mono text-sm text-gray-900 break-all">{node.id}</div>
        </div>

        {/* Title/Label */}
        {(node.label || node.title) && (
          <div className="mb-4">
            <div className="text-xs text-gray-500 mb-1">Label</div>
            <div className="text-lg font-semibold text-gray-900">
              {node.label || node.title}
            </div>
          </div>
        )}

        {/* Type */}
        {node.type && (
          <div className="mb-4">
            <div className="text-xs text-gray-500 mb-1">Type</div>
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-100 text-indigo-700 rounded-full text-sm">
              <FiTag className="w-4 h-4" />
              {node.type}
            </div>
          </div>
        )}

        {/* Category */}
        {node.category && (
          <div className="mb-4">
            <div className="text-xs text-gray-500 mb-1">Category</div>
            <div 
              className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm"
              style={{ 
                backgroundColor: node.categoryColor ? `${node.categoryColor}20` : '#e0e7ff',
                color: node.categoryColor || '#4f46e5'
              }}
            >
              {node.category}
            </div>
          </div>
        )}

        {/* Description */}
        {node.description && (
          <div className="mb-4">
            <div className="text-xs text-gray-500 mb-1">Description</div>
            <div className="text-sm text-gray-700 leading-relaxed">
              {node.description}
            </div>
          </div>
        )}

        {/* Author */}
        {node.author && (
          <div className="mb-4">
            <div className="text-xs text-gray-500 mb-1">Author</div>
            <div className="text-sm text-gray-900">{node.author}</div>
          </div>
        )}

        {/* Watch Status */}
        {node.watchStatus && (
          <div className="mb-4">
            <div className="text-xs text-gray-500 mb-1">Status</div>
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${
                node.watchStatus === 'watched' ? 'bg-green-500' :
                node.watchStatus === 'watching' ? 'bg-yellow-500' :
                'bg-gray-400'
              }`} />
              <span className="text-sm capitalize">{node.watchStatus}</span>
            </div>
          </div>
        )}

        {/* Metadata */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          {node.hasTranscription !== undefined && (
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="text-xs text-gray-500 mb-1">Transcription</div>
              <div className={`text-sm font-medium ${node.hasTranscription ? 'text-green-600' : 'text-gray-400'}`}>
                {node.hasTranscription ? 'Available' : 'N/A'}
              </div>
            </div>
          )}
          {node.hasSummary !== undefined && (
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="text-xs text-gray-500 mb-1">Summary</div>
              <div className={`text-sm font-medium ${node.hasSummary ? 'text-green-600' : 'text-gray-400'}`}>
                {node.hasSummary ? 'Available' : 'N/A'}
              </div>
            </div>
          )}
        </div>

        {/* Degree (connections) */}
        {node.degree !== undefined && (
          <div className="mb-4">
            <div className="text-xs text-gray-500 mb-1">Connections</div>
            <div className="text-2xl font-bold text-indigo-600">{node.degree || 0}</div>
          </div>
        )}

        {/* Relations */}
        {node.relations && node.relations.length > 0 && (
          <div className="mb-4">
            <div className="text-xs text-gray-500 mb-2">Relations (within subgraph)</div>
            <div className="space-y-2">
              {node.relations.map((rel: any, idx: number) => (
                <div key={idx} className="flex items-center gap-2 text-sm">
                  <FiExternalLink className="w-3 h-3 text-gray-400" />
                  <span className="text-gray-700">{rel}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Video Link */}
        {node.videoId && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <a
              href={`/videos/${node.videoId}`}
              className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <FiFileText className="w-4 h-4" />
              View Video Details
            </a>
          </div>
        )}

        {/* YouTube Link */}
        {node.youtubeId && (
          <div className="mt-2">
            <a
              href={`https://www.youtube.com/watch?v=${node.youtubeId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <FiExternalLink className="w-4 h-4" />
              Open in YouTube
            </a>
          </div>
        )}
      </div>
    </div>
  );
}

