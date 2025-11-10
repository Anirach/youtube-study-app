import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Videos API
export const videosApi = {
  getAll: async (params?: any) => {
    const res = await api.get('/videos', { params });
    // API returns { videos: [...], total, limit, offset }
    return res.data.videos || [];
  },
  getById: async (id: string) => {
    const res = await api.get(`/videos/${id}`);
    return res.data;
  },
  create: async (data: any) => {
    const res = await api.post('/videos', data);
    return res.data;
  },
  update: async (id: string, data: any) => {
    const res = await api.put(`/videos/${id}`, data);
    return res.data;
  },
  delete: async (id: string) => {
    const res = await api.delete(`/videos/${id}`);
    return res.data;
  },
  process: async (id: string) => {
    const res = await api.post(`/videos/${id}/process`);
    return res.data;
  },
  batchImport: async (data: any) => {
    const res = await api.post('/videos/batch', data);
    return res.data;
  },
};

// Categories API
export const categoriesApi = {
  getAll: async () => {
    const res = await api.get('/categories');
    return res.data;
  },
  getById: async (id: string) => {
    const res = await api.get(`/categories/${id}`);
    return res.data;
  },
  create: async (data: any) => {
    const res = await api.post('/categories', data);
    return res.data;
  },
  update: async (id: string, data: any) => {
    const res = await api.put(`/categories/${id}`, data);
    return res.data;
  },
  delete: async (id: string) => {
    const res = await api.delete(`/categories/${id}`);
    return res.data;
  },
  getVideos: async (id: string) => {
    const res = await api.get(`/categories/${id}/videos`);
    return res.data;
  },
};

// Graph API
export const graphApi = {
  getGraph: async (params?: any) => {
    const res = await api.get('/graph', { params });
    return res.data;
  },
  getRelationships: async (id: string) => {
    const res = await api.get(`/graph/relationships/${id}`);
    return res.data;
  },
  rebuild: async () => {
    const res = await api.post('/graph/rebuild');
    return res.data;
  },
  getStats: async () => {
    const res = await api.get('/graph/stats');
    return res.data;
  },
};

// Chat API
export const chatApi = {
  getAll: async () => {
    const res = await api.get('/chat');
    return res.data;
  },
  getById: async (id: string) => {
    const res = await api.get(`/chat/${id}`);
    return res.data;
  },
  create: async (data: any) => {
    const res = await api.post('/chat', data);
    return res.data;
  },
  sendMessage: async (id: string, message: string) => {
    const res = await api.post(`/chat/${id}/message`, { message });
    return res.data;
  },
  sendMessageWithFiles: async (id: string, message: string, files: File[]) => {
    const formData = new FormData();
    formData.append('message', message);
    files.forEach((file) => {
      formData.append('files', file);
    });
    
    const res = await api.post(`/chat/${id}/message`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return res.data;
  },
  query: async (id: string, query: string) => {
    const res = await api.post(`/chat/${id}/query`, { query });
    return res.data;
  },
  delete: async (id: string) => {
    const res = await api.delete(`/chat/${id}`);
    return res.data;
  },
};

export default api;

