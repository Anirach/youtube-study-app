'use client';

import ReactMarkdown from 'react-markdown';
import { FiUser, FiCpu, FiFile } from 'react-icons/fi';

interface ChatMessageProps {
  message: {
    role: 'user' | 'assistant';
    content: string;
    timestamp?: string;
    sources?: Array<{
      videoId: string;
      title: string;
      timestamp?: string;
    }>;
    attachments?: Array<{
      name?: string;
      filename?: string;
      size?: number;
      type?: string;
      length?: number;
    }>;
  };
}

export default function ChatMessage({ message }: ChatMessageProps) {
  const isUser = message.role === 'user';
  
  // Validate message content
  if (!message || !message.content) {
    return null;
  }

  // Ensure content is a string
  const content = String(message.content || '');

  return (
    <div className={`flex gap-4 mb-6 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div className="flex-shrink-0">
          <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center">
            <FiCpu className="w-5 h-5 text-white" />
          </div>
        </div>
      )}

      <div className={`flex-1 max-w-3xl ${isUser ? 'text-right' : 'text-left'}`}>
        <div
          className={`inline-block px-4 py-3 rounded-lg ${
            isUser
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-900'
          }`}
        >
          {isUser ? (
            <p className="whitespace-pre-wrap">{content}</p>
          ) : (
            <div className="prose prose-sm max-w-none">
              <ReactMarkdown>{content}</ReactMarkdown>
            </div>
          )}
        </div>

        {message.attachments && message.attachments.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {message.attachments.map((attachment, idx) => (
              <div
                key={idx}
                className="flex items-center gap-2 px-2 py-1 bg-white bg-opacity-20 rounded text-xs"
              >
                <FiFile />
                <span>{attachment.name || attachment.filename}</span>
                {(attachment.size || attachment.length) && (
                  <span className="opacity-75">
                    ({((attachment.size || attachment.length || 0) / 1024).toFixed(1)} KB)
                  </span>
                )}
              </div>
            ))}
          </div>
        )}

        {message.sources && message.sources.length > 0 && (
          <div className="mt-2 text-xs text-gray-500">
            <div className="font-semibold mb-1">Sources:</div>
            {message.sources.map((source, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <a
                  href={`/videos/${source.videoId}`}
                  className="text-blue-600 hover:underline"
                >
                  {source.title}
                </a>
                {source.timestamp && (
                  <span className="text-gray-400">@ {source.timestamp}</span>
                )}
              </div>
            ))}
          </div>
        )}

        {message.timestamp && (
          <div className="text-xs text-gray-400 mt-1">
            {new Date(message.timestamp).toLocaleTimeString()}
          </div>
        )}
      </div>

      {isUser && (
        <div className="flex-shrink-0">
          <div className="w-10 h-10 rounded-full bg-gray-600 flex items-center justify-center">
            <FiUser className="w-5 h-5 text-white" />
          </div>
        </div>
      )}
    </div>
  );
}

