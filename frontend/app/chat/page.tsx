'use client';

import { useState, useEffect, useRef } from 'react';
import { FiSend, FiTrash2, FiDownload, FiPlus, FiPaperclip, FiX, FiFile } from 'react-icons/fi';
import ChatMessage from '@/components/ChatMessage';
import VideoSelector from '@/components/VideoSelector';
import LoadingSpinner from '@/components/LoadingSpinner';
import ErrorBoundary from '@/components/ErrorBoundary';
import { chatApi } from '@/lib/api';

export default function ChatPage() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [currentSession, setCurrentSession] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState('');
  const [selectedVideos, setSelectedVideos] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSelector, setShowSelector] = useState(true);
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const createSession = async () => {
    if (selectedVideos.length === 0) {
      alert('Please select at least one video');
      return;
    }

    try {
      setLoading(true);
      const session = await chatApi.create({
        videoIds: selectedVideos
      });

      setCurrentSession(session);
      setMessages([]);
      setShowSelector(false);
    } catch (error: any) {
      console.error('Error creating session:', error);
      alert('Failed to create chat session: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setAttachedFiles(prev => [...prev, ...files]);
  };

  const removeFile = (index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const sendMessage = async () => {
    if ((!input.trim() && attachedFiles.length === 0) || !currentSession) return;

    const userMessage = {
      role: 'user' as const,
      content: input,
      timestamp: new Date().toISOString(),
      attachments: attachedFiles.map(f => ({ name: f.name, size: f.size, type: f.type }))
    };

    setMessages([...messages, userMessage]);
    const currentInput = input;
    const currentFiles = [...attachedFiles];
    setInput('');
    setAttachedFiles([]);
    setLoading(true);

    try {
      const response = await chatApi.sendMessageWithFiles(
        currentSession.id,
        currentInput,
        currentFiles
      );

      console.log('Chat API response:', response);

      // Validate and extract message content
      let messageContent = 'No response received';
      
      // Try different response structures
      if (typeof response === 'string') {
        messageContent = response;
      } else if (response?.message) {
        messageContent = typeof response.message === 'string' 
          ? response.message 
          : JSON.stringify(response.message);
      } else if (response?.data?.message) {
        messageContent = typeof response.data.message === 'string'
          ? response.data.message
          : JSON.stringify(response.data.message);
      } else if (response?.response) {
        messageContent = typeof response.response === 'string'
          ? response.response
          : JSON.stringify(response.response);
      } else if (response?.content) {
        messageContent = typeof response.content === 'string'
          ? response.content
          : JSON.stringify(response.content);
      }

      const messageSources = response?.sources || response?.data?.sources || [];

      setMessages(prev => [...prev, {
        role: 'assistant' as const,
        content: messageContent,
        timestamp: new Date().toISOString(),
        sources: messageSources
      }]);
    } catch (error: any) {
      console.error('Error sending message:', error);
      const errorMessage = error?.response?.data?.error || error?.message || 'Unknown error occurred';
      setMessages(prev => [...prev, {
        role: 'assistant' as const,
        content: 'Sorry, I encountered an error: ' + errorMessage,
        timestamp: new Date().toISOString()
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    if (confirm('Clear current chat?')) {
      setMessages([]);
      setCurrentSession(null);
      setShowSelector(true);
    }
  };

  const exportChat = () => {
    const text = messages.map(m => 
      `[${m.role.toUpperCase()}] ${m.content}\n`
    ).join('\n');

    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `chat-${new Date().toISOString()}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="container mx-auto px-4 py-6 h-[calc(100vh-120px)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">AI Chat</h1>
          <p className="text-gray-600 mt-1">
            Chat with your video content using AI
          </p>
        </div>

        {currentSession && (
          <div className="flex gap-2">
            <button
              onClick={() => setShowSelector(!showSelector)}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <FiPlus />
              {showSelector ? 'Hide' : 'Show'} Videos
            </button>
            <button
              onClick={exportChat}
              disabled={messages.length === 0}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
            >
              <FiDownload />
              Export
            </button>
            <button
              onClick={clearChat}
              className="flex items-center gap-2 px-4 py-2 border border-red-300 text-red-600 rounded-lg hover:bg-red-50"
            >
              <FiTrash2 />
              Clear
            </button>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-12 gap-6 h-[calc(100%-100px)]">
        {/* Video Selector Sidebar */}
        {showSelector && (
          <div className="col-span-3 bg-white rounded-lg shadow-sm p-4 overflow-y-auto">
            <h3 className="font-semibold mb-4">Select Videos</h3>
            <VideoSelector
              selectedVideos={selectedVideos}
              onSelect={setSelectedVideos}
            />
            {!currentSession && (
              <button
                onClick={createSession}
                disabled={selectedVideos.length === 0 || loading}
                className="w-full mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Creating...' : 'Start Chat'}
              </button>
            )}
          </div>
        )}

        {/* Chat Area */}
        <div className={`${showSelector ? 'col-span-9' : 'col-span-12'} bg-white rounded-lg shadow-sm flex flex-col`}>
          {!currentSession ? (
            <div className="flex-1 flex items-center justify-center text-gray-500">
              <div className="text-center">
                <FiSend className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium">Select videos and start chatting</p>
                <p className="text-sm mt-2">Choose one or more videos from the sidebar</p>
              </div>
            </div>
          ) : (
            <>
              {/* Messages */}
              <div className="flex-1 p-6 overflow-y-auto">
                {messages.length === 0 ? (
                  <div className="text-center text-gray-500 mt-8">
                    <p className="text-lg font-medium mb-2">Chat started!</p>
                    <p className="text-sm">Ask me anything about the selected videos</p>
                    <div className="mt-6 space-y-2">
                      <p className="text-xs text-gray-400">Suggested questions:</p>
                      <button
                        onClick={() => setInput('What are the main topics covered in these videos?')}
                        className="block w-full text-left px-4 py-2 text-sm bg-gray-50 rounded-lg hover:bg-gray-100"
                      >
                        What are the main topics covered in these videos?
                      </button>
                      <button
                        onClick={() => setInput('Can you summarize the key points?')}
                        className="block w-full text-left px-4 py-2 text-sm bg-gray-50 rounded-lg hover:bg-gray-100"
                      >
                        Can you summarize the key points?
                      </button>
                      <button
                        onClick={() => setInput('What are the connections between these videos?')}
                        className="block w-full text-left px-4 py-2 text-sm bg-gray-50 rounded-lg hover:bg-gray-100"
                      >
                        What are the connections between these videos?
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    {messages.map((msg, idx) => (
                      <ErrorBoundary key={idx} fallback={
                        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-sm text-yellow-800">
                          Failed to render message
                        </div>
                      }>
                        <ChatMessage message={msg} />
                      </ErrorBoundary>
                    ))}
                    {loading && (
                      <div className="flex items-center gap-3 text-gray-500">
                        <LoadingSpinner />
                        <span className="text-sm">Thinking...</span>
                      </div>
                    )}
                  </>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="border-t p-4">
                {/* Attached Files */}
                {attachedFiles.length > 0 && (
                  <div className="mb-3 flex flex-wrap gap-2">
                    {attachedFiles.map((file, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2 px-3 py-2 bg-blue-50 border border-blue-200 rounded-lg text-sm"
                      >
                        <FiFile className="text-blue-600" />
                        <span className="text-blue-900">{file.name}</span>
                        <span className="text-blue-600 text-xs">
                          ({(file.size / 1024).toFixed(1)} KB)
                        </span>
                        <button
                          onClick={() => removeFile(idx)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <FiX />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-2">
                  {/* File Upload Button */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".txt,.pdf,.doc,.docx,.jpg,.jpeg,.png,.md"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 flex items-center gap-2"
                    title="Attach files"
                  >
                    <FiPaperclip />
                  </button>

                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Ask about your videos... (Press Enter to send, Shift+Enter for new line)"
                    rows={2}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  />
                  <button
                    onClick={sendMessage}
                    disabled={loading || (!input.trim() && attachedFiles.length === 0)}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                  >
                    <FiSend />
                    Send
                  </button>
                </div>
                <div className="text-xs text-gray-500 mt-2">
                  {selectedVideos.length} video{selectedVideos.length !== 1 ? 's' : ''} in context
                  {attachedFiles.length > 0 && ` · ${attachedFiles.length} file${attachedFiles.length !== 1 ? 's' : ''} attached`}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

