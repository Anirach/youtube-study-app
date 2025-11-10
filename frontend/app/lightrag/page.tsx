'use client';

import { useState, useEffect } from 'react';
import { 
  FiServer, 
  FiUpload, 
  FiRefreshCw, 
  FiSettings, 
  FiSearch,
  FiFile,
  FiCheckCircle,
  FiXCircle,
  FiClock,
  FiActivity,
  FiVideo
} from 'react-icons/fi';
import LoadingSpinner from '@/components/LoadingSpinner';
import { lightragApi, videosApi } from '@/lib/api';

interface ServerStatus {
  status: string;
  version: string;
  llm_model: string;
  embedding_model: string;
  working_dir: string;
}

interface DocumentStatus {
  track_id: string;
  status: 'pending' | 'processing' | 'processed' | 'failed';
  filename: string;
  created_at: string;
  updated_at: string;
  error?: string;
}

interface QueryMode {
  value: string;
  label: string;
  description: string;
}

const queryModes: QueryMode[] = [
  { value: 'naive', label: 'Naive', description: 'Simple vector similarity search' },
  { value: 'local', label: 'Local', description: 'Local graph traversal' },
  { value: 'global', label: 'Global', description: 'Global graph analysis' },
  { value: 'hybrid', label: 'Hybrid', description: 'Combine local and global' },
  { value: 'mix', label: 'Mix', description: 'Advanced mixed mode' }
];

export default function LightRAGPage() {
  const [activeTab, setActiveTab] = useState<'upload' | 'query' | 'status' | 'config'>('upload');
  const [serverStatus, setServerStatus] = useState<ServerStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Upload state
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
  const [trackIds, setTrackIds] = useState<string[]>([]);
  
  // Query state
  const [query, setQuery] = useState('');
  const [queryMode, setQueryMode] = useState('hybrid');
  const [queryResult, setQueryResult] = useState<any>(null);
  const [includeReferences, setIncludeReferences] = useState(true);
  const [includeChunkContent, setIncludeChunkContent] = useState(false);
  
  // Status tracking
  const [documentStatuses, setDocumentStatuses] = useState<DocumentStatus[]>([]);
  
  // Videos state
  const [videos, setVideos] = useState<any[]>([]);
  const [loadingVideos, setLoadingVideos] = useState(false);

  useEffect(() => {
    checkServerStatus();
    loadVideos();
  }, []);

  const checkServerStatus = async () => {
    try {
      const response = await lightragApi.getHealth();
      setServerStatus({
        status: response.status || 'running',
        version: response.lightrag?.version || '1.0.0',
        llm_model: response.lightrag?.llm_model || 'gpt-4o-mini',
        embedding_model: response.lightrag?.embedding_model || 'bge-m3',
        working_dir: response.lightrag?.working_dir || './rag_storage'
      });
    } catch (err: any) {
      setError('Failed to connect to LightRAG server');
      // Set default values even if server is offline
      setServerStatus({
        status: 'offline',
        version: 'N/A',
        llm_model: 'N/A',
        embedding_model: 'N/A',
        working_dir: 'N/A'
      });
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setSelectedFiles(prev => [...prev, ...files]);
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const uploadDocuments = async () => {
    if (selectedFiles.length === 0) return;

    setLoading(true);
    setError('');

    try {
      for (const file of selectedFiles) {
        try {
          const response = await lightragApi.uploadDocument(file);
          const trackId = response.track_id || `track_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          
          setTrackIds(prev => [...prev, trackId]);
          
          setDocumentStatuses(prev => [...prev, {
            track_id: trackId,
            status: 'processing',
            filename: file.name,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }]);
        } catch (fileErr: any) {
          console.error(`Failed to upload ${file.name}:`, fileErr);
          setDocumentStatuses(prev => [...prev, {
            track_id: `error_${Date.now()}`,
            status: 'failed',
            filename: file.name,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            error: fileErr.message
          }]);
        }
      }

      setSelectedFiles([]);
      alert('Documents uploaded successfully! Check Status tab for progress.');
      setActiveTab('status');
    } catch (err: any) {
      setError(err.message || 'Failed to upload documents');
    } finally {
      setLoading(false);
    }
  };

  const executeQuery = async () => {
    if (!query.trim()) return;

    setLoading(true);
    setError('');
    setQueryResult(null);

    try {
      const response = await lightragApi.query(
        query,
        queryMode,
        includeReferences,
        includeChunkContent
      );
      
      setQueryResult(response);
    } catch (err: any) {
      console.error('Query error:', err);
      
      // Handle 503 Service Unavailable (LightRAG server not running)
      if (err.response?.status === 503) {
        const errorData = err.response.data;
        setError(errorData.message || 'LightRAG Server is not available');
        setQueryResult({
          response: errorData.response || 'LightRAG Server is currently not available. Please start the server and try again.',
          suggestion: errorData.suggestion,
          isError: true
        });
      } else {
        setError(err.response?.data?.message || err.message || 'Failed to execute query');
      }
    } finally {
      setLoading(false);
    }
  };

  const loadVideos = async () => {
    try {
      setLoadingVideos(true);
      const videosData = await videosApi.getAll();
      setVideos(Array.isArray(videosData) ? videosData : []);
      
      // Extract LightRAG track IDs from video tags
      const trackStatuses: DocumentStatus[] = [];
      videosData.forEach((video: any) => {
        try {
          const tags = typeof video.tags === 'string' ? JSON.parse(video.tags) : video.tags;
          if (tags?.lightrag_track_id) {
            trackStatuses.push({
              track_id: tags.lightrag_track_id,
              status: 'processed', // Assume processed if track ID exists
              filename: `${video.title} (Video)`,
              created_at: tags.lightrag_uploaded_at || video.createdAt,
              updated_at: tags.lightrag_uploaded_at || video.updatedAt
            });
          }
        } catch (e) {
          // Ignore parse errors
        }
      });
      
      setDocumentStatuses(trackStatuses);
    } catch (err: any) {
      console.error('Failed to load videos:', err);
    } finally {
      setLoadingVideos(false);
    }
  };

  const refreshStatus = async (trackId: string) => {
    try {
      const response = await lightragApi.getTrackStatus(trackId);
      
      setDocumentStatuses(prev => prev.map(doc => 
        doc.track_id === trackId 
          ? { 
              ...doc, 
              status: response.status || 'processed',
              updated_at: response.updated_at || new Date().toISOString(),
              error: response.error
            }
          : doc
      ));
    } catch (err: any) {
      console.error('Failed to refresh status:', err);
    }
  };

  const autoUploadAllVideos = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await lightragApi.autoUploadAllVideos();
      
      const results = response.results;
      
      // Show results
      const message = `Auto-upload completed!\n\n` +
        `Total: ${results.total}\n` +
        `Uploaded: ${results.uploaded}\n` +
        `Skipped: ${results.skipped}\n` +
        `Failed: ${results.failed}` +
        (results.errors.length > 0 ? `\n\nErrors:\n${results.errors.map((e: any) => `- ${e.title}: ${e.error}`).join('\n')}` : '');
      
      alert(message);
      
      // Reload videos to get updated track IDs
      await loadVideos();
      
      setActiveTab('status');
    } catch (err: any) {
      setError(err.message || 'Failed to auto-upload videos');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FiServer className="w-8 h-8 text-purple-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">LightRAG Server</h1>
              <p className="text-sm text-gray-600">Graph-based RAG with Knowledge Graph</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Open LightRAG Web UI Button */}
            <button
              onClick={() => window.open('http://localhost:9621', '_blank')}
              className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 flex items-center gap-2 shadow-md transition-all"
              title="Open LightRAG Web UI"
            >
              <FiServer className="w-4 h-4" />
              <span className="font-medium">Open Web UI</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </button>
            
            {serverStatus && (
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className={`flex items-center gap-2 ${
                    serverStatus.status === 'online' ? 'text-green-600' : 'text-gray-400'
                  }`}>
                    {serverStatus.status === 'online' ? <FiCheckCircle /> : <FiXCircle />}
                    <span className="font-semibold capitalize">{serverStatus.status}</span>
                  </div>
                  <p className="text-xs text-gray-500">v{serverStatus.version}</p>
                </div>
                <button
                  onClick={checkServerStatus}
                  className="p-2 hover:bg-gray-100 rounded-lg"
                  title="Refresh status"
                >
                  <FiRefreshCw className="w-5 h-5 text-gray-600" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Server Info */}
        {serverStatus && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-blue-50 p-3 rounded-lg">
              <p className="text-xs text-blue-600 font-semibold">LLM Model</p>
              <p className="text-sm text-blue-900">{serverStatus.llm_model}</p>
            </div>
            <div className="bg-green-50 p-3 rounded-lg">
              <p className="text-xs text-green-600 font-semibold">Embedding Model</p>
              <p className="text-sm text-green-900">{serverStatus.embedding_model}</p>
            </div>
            <div className="bg-purple-50 p-3 rounded-lg">
              <p className="text-xs text-purple-600 font-semibold">Working Directory</p>
              <p className="text-sm text-purple-900">{serverStatus.working_dir}</p>
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow-md">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab('upload')}
              className={`px-6 py-3 border-b-2 font-medium text-sm flex items-center gap-2 ${
                activeTab === 'upload'
                  ? 'border-purple-600 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <FiUpload />
              Document Upload
            </button>
            <button
              onClick={() => setActiveTab('query')}
              className={`px-6 py-3 border-b-2 font-medium text-sm flex items-center gap-2 ${
                activeTab === 'query'
                  ? 'border-purple-600 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <FiSearch />
              Query
            </button>
            <button
              onClick={() => setActiveTab('status')}
              className={`px-6 py-3 border-b-2 font-medium text-sm flex items-center gap-2 ${
                activeTab === 'status'
                  ? 'border-purple-600 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <FiActivity />
              Status Tracking
            </button>
            <button
              onClick={() => setActiveTab('config')}
              className={`px-6 py-3 border-b-2 font-medium text-sm flex items-center gap-2 ${
                activeTab === 'config'
                  ? 'border-purple-600 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <FiSettings />
              Configuration
            </button>
          </nav>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-4 bg-red-50 text-red-700 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {/* Upload Tab */}
          {activeTab === 'upload' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Upload Documents</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Upload documents to be indexed by LightRAG. Supported formats: PDF, TXT, MD, DOCX
                </p>
              </div>

              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <input
                  type="file"
                  multiple
                  accept=".pdf,.txt,.md,.docx"
                  onChange={handleFileSelect}
                  className="hidden"
                  id="file-upload"
                />
                <label
                  htmlFor="file-upload"
                  className="cursor-pointer flex flex-col items-center"
                >
                  <FiUpload className="w-12 h-12 text-gray-400 mb-3" />
                  <span className="text-sm text-gray-600">
                    Click to upload or drag and drop
                  </span>
                  <span className="text-xs text-gray-500 mt-1">
                    PDF, TXT, MD, DOCX up to 10MB each
                  </span>
                </label>
              </div>

              {selectedFiles.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium text-gray-900">Selected Files:</h4>
                  {selectedFiles.map((file, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between bg-gray-50 p-3 rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <FiFile className="text-blue-600" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">{file.name}</p>
                          <p className="text-xs text-gray-500">
                            {(file.size / 1024).toFixed(1)} KB
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => removeFile(idx)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <FiXCircle />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <button
                onClick={uploadDocuments}
                disabled={loading || selectedFiles.length === 0}
                className="w-full px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <LoadingSpinner />
                    Uploading...
                  </>
                ) : (
                  <>
                    <FiUpload />
                    Upload Documents
                  </>
                )}
              </button>
            </div>
          )}

          {/* Query Tab */}
          {activeTab === 'query' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Query Documents</h3>
                <p className="text-sm text-gray-600 mb-4">
                  Ask questions about your indexed documents using different query modes
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Query Mode
                </label>
                <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
                  {queryModes.map((mode) => (
                    <button
                      key={mode.value}
                      onClick={() => setQueryMode(mode.value)}
                      className={`p-3 rounded-lg border-2 text-left ${
                        queryMode === mode.value
                          ? 'border-purple-600 bg-purple-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      title={mode.description}
                    >
                      <p className="font-semibold text-sm">{mode.label}</p>
                      <p className="text-xs text-gray-600 mt-1">{mode.description}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={includeReferences}
                    onChange={(e) => setIncludeReferences(e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-sm text-gray-700">Include References</span>
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={includeChunkContent}
                    onChange={(e) => setIncludeChunkContent(e.target.checked)}
                    disabled={!includeReferences}
                    className="rounded"
                  />
                  <span className="text-sm text-gray-700">Include Chunk Content</span>
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Your Question
                </label>
                <textarea
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Ask a question about your documents..."
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                />
              </div>

              <button
                onClick={executeQuery}
                disabled={loading || !query.trim()}
                className="w-full px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <LoadingSpinner />
                    Querying...
                  </>
                ) : (
                  <>
                    <FiSearch />
                    Execute Query
                  </>
                )}
              </button>

              {queryResult && (
                <div className="mt-6 space-y-4">
                  <div className={`border rounded-lg p-4 ${
                    queryResult.isError 
                      ? 'bg-yellow-50 border-yellow-200' 
                      : 'bg-green-50 border-green-200'
                  }`}>
                    <h4 className={`font-semibold mb-2 ${
                      queryResult.isError ? 'text-yellow-900' : 'text-green-900'
                    }`}>
                      {queryResult.isError ? 'Notice:' : 'Response:'}
                    </h4>
                    <p className="text-gray-800">{queryResult.response}</p>
                    
                    {queryResult.suggestion && (
                      <div className="mt-3 bg-white border border-yellow-300 rounded p-3">
                        <p className="text-sm font-semibold text-yellow-900">💡 Suggestion:</p>
                        <code className="text-xs text-gray-700 block mt-1 bg-gray-100 p-2 rounded">
                          {queryResult.suggestion}
                        </code>
                      </div>
                    )}
                  </div>

                  {queryResult.references && queryResult.references.length > 0 && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h4 className="font-semibold text-blue-900 mb-2">References:</h4>
                      <div className="space-y-2">
                        {queryResult.references.map((ref: any, idx: number) => (
                          <div key={idx} className="bg-white p-3 rounded border border-blue-100">
                            <p className="text-sm font-medium text-gray-900">
                              [{ref.reference_id}] {ref.file_path}
                            </p>
                            {ref.content && (
                              <div className="mt-2 text-xs text-gray-600">
                                {ref.content.map((chunk: string, cidx: number) => (
                                  <p key={cidx} className="mt-1">{chunk}</p>
                                ))}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Status Tab */}
          {activeTab === 'status' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Document Processing Status</h3>
                  <p className="text-sm text-gray-600">
                    Track the progress of your uploaded documents and videos
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {videos.length} videos total, {documentStatuses.length} uploaded to LightRAG
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={loadVideos}
                    disabled={loadingVideos}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2 disabled:opacity-50"
                  >
                    <FiVideo />
                    {loadingVideos ? 'Loading...' : 'Load Videos'}
                  </button>
                  <button
                    onClick={() => documentStatuses.forEach(doc => refreshStatus(doc.track_id))}
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 flex items-center gap-2"
                  >
                    <FiRefreshCw />
                    Refresh All
                  </button>
                </div>
              </div>

              {/* Auto-Upload All Videos Button */}
              {videos.length > 0 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-blue-900">Auto-Upload Videos</h4>
                      <p className="text-sm text-blue-700 mt-1">
                        Automatically upload all video transcripts to LightRAG Server
                      </p>
                    </div>
                    <button
                      onClick={autoUploadAllVideos}
                      disabled={loading}
                      className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                    >
                      {loading ? (
                        <>
                          <LoadingSpinner />
                          Uploading...
                        </>
                      ) : (
                        <>
                          <FiUpload />
                          Auto-Upload All
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {documentStatuses.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <FiFile className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No documents uploaded yet</p>
                  <p className="text-sm mt-2">Videos will be automatically uploaded when added</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {documentStatuses.map((doc) => (
                    <div
                      key={doc.track_id}
                      className="bg-white border border-gray-200 rounded-lg p-4"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {doc.status === 'processed' && <FiCheckCircle className="text-green-600 w-5 h-5" />}
                          {doc.status === 'processing' && <FiClock className="text-yellow-600 w-5 h-5 animate-spin" />}
                          {doc.status === 'failed' && <FiXCircle className="text-red-600 w-5 h-5" />}
                          {doc.status === 'pending' && <FiClock className="text-gray-400 w-5 h-5" />}
                          
                          <div>
                            <p className="font-medium text-gray-900">{doc.filename}</p>
                            <p className="text-xs text-gray-500">Track ID: {doc.track_id}</p>
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                            doc.status === 'processed' ? 'bg-green-100 text-green-800' :
                            doc.status === 'processing' ? 'bg-yellow-100 text-yellow-800' :
                            doc.status === 'failed' ? 'bg-red-100 text-red-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {doc.status.toUpperCase()}
                          </span>
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(doc.updated_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                      
                      {doc.error && (
                        <div className="mt-3 text-sm text-red-600 bg-red-50 p-2 rounded">
                          {doc.error}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Config Tab */}
          {activeTab === 'config' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Server Configuration</h3>
                <p className="text-sm text-gray-600 mb-4">
                  View and manage LightRAG server settings
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700">LLM Model</span>
                  <span className="text-sm text-gray-900">{serverStatus?.llm_model}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700">Embedding Model</span>
                  <span className="text-sm text-gray-900">{serverStatus?.embedding_model}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700">Working Directory</span>
                  <span className="text-sm text-gray-900">{serverStatus?.working_dir}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700">Server Status</span>
                  <span className="text-sm text-green-600 font-semibold">{serverStatus?.status}</span>
                </div>
              </div>

              {/* LightRAG Web UI Access */}
              <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-lg p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h4 className="font-semibold text-purple-900 mb-2 flex items-center gap-2">
                      <FiServer className="w-5 h-5" />
                      LightRAG Web UI
                    </h4>
                    <p className="text-sm text-purple-800 mb-4">
                      Access the official LightRAG Web UI for advanced features:
                    </p>
                    <ul className="text-sm text-purple-700 space-y-2 mb-4">
                      <li className="flex items-center gap-2">
                        <span className="w-2 h-2 bg-purple-600 rounded-full"></span>
                        <strong>Documents:</strong> Upload and manage documents
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="w-2 h-2 bg-purple-600 rounded-full"></span>
                        <strong>Knowledge Graph:</strong> Interactive graph visualization
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="w-2 h-2 bg-purple-600 rounded-full"></span>
                        <strong>Retrieval:</strong> Advanced query interface with parameters
                      </li>
                      <li className="flex items-center gap-2">
                        <span className="w-2 h-2 bg-purple-600 rounded-full"></span>
                        <strong>API:</strong> REST API documentation and testing
                      </li>
                    </ul>
                    <div className="bg-white border border-purple-300 rounded p-3 mb-3">
                      <p className="text-xs text-gray-600 mb-1">Server URL:</p>
                      <code className="text-sm text-purple-900 font-mono">http://localhost:9621</code>
                    </div>
                  </div>
                  <button
                    onClick={() => window.open('http://localhost:9621', '_blank')}
                    className="ml-4 px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 flex items-center gap-2 shadow-lg transition-all transform hover:scale-105"
                  >
                    <FiServer className="w-5 h-5" />
                    <span className="font-semibold">Open Web UI</span>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Setup Instructions */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h4 className="font-semibold text-yellow-900 mb-2">⚙️ Setup Instructions</h4>
                <p className="text-sm text-yellow-800 mb-3">
                  To use LightRAG Web UI, ensure the server is running:
                </p>
                <div className="bg-white border border-yellow-300 rounded p-3">
                  <p className="text-xs text-gray-600 mb-2">1. Install LightRAG:</p>
                  <code className="text-xs text-gray-800 block bg-gray-100 p-2 rounded mb-3">
                    pip install "lightrag-hku[api]"
                  </code>
                  
                  <p className="text-xs text-gray-600 mb-2">2. Start the server:</p>
                  <code className="text-xs text-gray-800 block bg-gray-100 p-2 rounded mb-3">
                    lightrag-server --port 9621
                  </code>
                  
                  <p className="text-xs text-gray-600 mb-2">3. Access Web UI:</p>
                  <code className="text-xs text-gray-800 block bg-gray-100 p-2 rounded">
                    http://localhost:9621
                  </code>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold text-blue-900 mb-2">📚 Documentation</h4>
                <p className="text-sm text-blue-800 mb-3">
                  For detailed configuration options and API documentation, visit:
                </p>
                <a
                  href="https://github.com/HKUDS/LightRAG/blob/main/lightrag/api/README.md"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:underline"
                >
                  LightRAG API Documentation →
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

