'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import rehypeRaw from 'rehype-raw';
import { FiUser, FiCpu, FiFile } from 'react-icons/fi';
import 'highlight.js/styles/github-dark.css';

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
            <div className="prose prose-sm max-w-none prose-invert">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeHighlight, rehypeRaw]}
                components={{
                  code({ node, inline, className, children, ...props }: any) {
                    const match = /language-(\w+)/.exec(className || '');
                    return !inline ? (
                      <pre className={`${className} rounded-lg p-4 overflow-x-auto`}>
                        <code className={className} {...props}>
                          {children}
                        </code>
                      </pre>
                    ) : (
                      <code className="bg-gray-700 px-1.5 py-0.5 rounded text-sm" {...props}>
                        {children}
                      </code>
                    );
                  },
                  table({ children, ...props }: any) {
                    return (
                      <div className="overflow-x-auto my-4">
                        <table className="min-w-full divide-y divide-gray-600" {...props}>
                          {children}
                        </table>
                      </div>
                    );
                  },
                  th({ children, ...props }: any) {
                    return (
                      <th className="px-4 py-2 bg-gray-700 text-left text-xs font-medium text-gray-200 uppercase tracking-wider" {...props}>
                        {children}
                      </th>
                    );
                  },
                  td({ children, ...props }: any) {
                    return (
                      <td className="px-4 py-2 border-t border-gray-600 text-sm" {...props}>
                        {children}
                      </td>
                    );
                  },
                  a({ children, href, ...props }: any) {
                    return (
                      <a 
                        href={href} 
                        className="text-blue-400 hover:text-blue-300 underline" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        {...props}
                      >
                        {children}
                      </a>
                    );
                  },
                  blockquote({ children, ...props }: any) {
                    return (
                      <blockquote className="border-l-4 border-blue-500 pl-4 italic my-4 text-gray-300" {...props}>
                        {children}
                      </blockquote>
                    );
                  },
                  ul({ children, ...props }: any) {
                    return (
                      <ul className="list-disc list-inside my-2 space-y-1" {...props}>
                        {children}
                      </ul>
                    );
                  },
                  ol({ children, ...props }: any) {
                    return (
                      <ol className="list-decimal list-inside my-2 space-y-1" {...props}>
                        {children}
                      </ol>
                    );
                  },
                  h1({ children, ...props }: any) {
                    return <h1 className="text-2xl font-bold my-4" {...props}>{children}</h1>;
                  },
                  h2({ children, ...props }: any) {
                    return <h2 className="text-xl font-bold my-3" {...props}>{children}</h2>;
                  },
                  h3({ children, ...props }: any) {
                    return <h3 className="text-lg font-bold my-2" {...props}>{children}</h3>;
                  },
                  p({ children, ...props }: any) {
                    return <p className="my-2" {...props}>{children}</p>;
                  },
                }}
              >
                {content}
              </ReactMarkdown>
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

