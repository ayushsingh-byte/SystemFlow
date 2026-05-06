import axios from 'axios';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

const api = axios.create({ baseURL: API_BASE, withCredentials: true });

// Request interceptor: add Authorization header from localStorage token
api.interceptors.request.use((config) => {
  const token =
    typeof window !== 'undefined' ? localStorage.getItem('sf_token') : null;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor: on 401, clear token
api.interceptors.response.use(
  (r) => r,
  (err) => {
    if (err.response?.status === 401) {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('sf_token');
      }
    }
    return Promise.reject(err);
  }
);

export const authAPI = {
  register: (email: string, password: string) =>
    api.post('/auth/register', { email, password }),
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  me: () => api.get('/auth/me'),
};

export const projectsAPI = {
  create: (data: ProjectPayload) => api.post('/projects', data),
  list: (page = 1, limit = 20) =>
    api.get(`/projects?page=${page}&limit=${limit}`),
  get: (id: string) => api.get(`/projects/${id}`),
  update: (id: string, data: Partial<ProjectPayload>) =>
    api.put(`/projects/${id}`, data),
  delete: (id: string) => api.delete(`/projects/${id}`),
  duplicate: (id: string) => api.post(`/projects/${id}/duplicate`),
};

export const simulationsAPI = {
  save: (data: SimPayload) => api.post('/simulations', data),
  history: (projectId: string, page = 1) =>
    api.get(`/simulations/project/${projectId}?page=${page}`),
  get: (id: string) => api.get(`/simulations/${id}`),
  delete: (id: string) => api.delete(`/simulations/${id}`),
  stats: (projectId: string) =>
    api.get(`/simulations/project/${projectId}/stats`),
};

export const analysisAPI = {
  analyze: (nodes: unknown[], edges: unknown[]) =>
    api.post('/analysis/analyze', { nodes, edges }),
  analyzeProject: (projectId: string) =>
    api.get(`/analysis/project/${projectId}`),
};

interface ProjectPayload {
  name: string;
  description?: string;
  nodes: unknown[];
  edges: unknown[];
  tags?: string[];
}

interface SimPayload {
  projectId?: string;
  name?: string;
  config: unknown;
  metrics: unknown;
  requestLog?: unknown[];
  duration?: number;
}

export default api;
