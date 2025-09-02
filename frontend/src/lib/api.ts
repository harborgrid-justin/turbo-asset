import axios from 'axios';

// Type definitions
export interface Asset {
  id?: number;
  name: string;
  type: string;
  status: 'Active' | 'Inactive' | 'Maintenance' | 'Retired';
  lifecycleStage: string;
  createdDate?: string;
}

export interface APIEndpoint {
  id?: number;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  description: string;
  parameters: string[];
  response: string;
}

export interface Report {
  id?: number;
  name: string;
  type: 'Sales' | 'Financial' | 'Operational' | 'Performance';
  status: 'Draft' | 'Published' | 'Archived';
  lastUpdated?: string;
  dataPoints?: number;
}

export interface Metric {
  name: string;
  value: number;
  change: number;
  trend: 'up' | 'down' | 'stable';
}

// Create axios instance with base configuration
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for adding auth tokens if needed
api.interceptors.request.use(
  (config) => {
    // Add auth token if available
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for handling common errors
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized access
      localStorage.removeItem('authToken');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// API service functions
export const apiService = {
  // Asset Lifecycle Service
  assets: {
    getAll: (): Promise<Asset[]> => api.get('/assets').then(res => res.data),
    getById: (id: number): Promise<Asset> => api.get(`/assets/${id}`).then(res => res.data),
    create: (data: Omit<Asset, 'id'>): Promise<Asset> => api.post('/assets', data).then(res => res.data),
    update: (id: number, data: Partial<Asset>): Promise<Asset> => api.put(`/assets/${id}`, data).then(res => res.data),
    delete: (id: number): Promise<void> => api.delete(`/assets/${id}`).then(() => undefined),
    updateStatus: (id: number, status: Asset['status']): Promise<Asset> => api.patch(`/assets/${id}/status`, { status }).then(res => res.data),
  },

  // API Documentation Service
  apiDocs: {
    getAll: (): Promise<APIEndpoint[]> => api.get('/api-docs/endpoints').then(res => res.data),
    getById: (id: number): Promise<APIEndpoint> => api.get(`/api-docs/endpoints/${id}`).then(res => res.data),
    create: (data: Omit<APIEndpoint, 'id'>): Promise<APIEndpoint> => api.post('/api-docs/endpoints', data).then(res => res.data),
    update: (id: number, data: Partial<APIEndpoint>): Promise<APIEndpoint> => api.put(`/api-docs/endpoints/${id}`, data).then(res => res.data),
    delete: (id: number): Promise<void> => api.delete(`/api-docs/endpoints/${id}`).then(() => undefined),
    search: (query: string): Promise<APIEndpoint[]> => api.get(`/api-docs/search?q=${query}`).then(res => res.data),
  },

  // Business Intelligence Service
  businessIntelligence: {
    getReports: (): Promise<Report[]> => api.get('/bi/reports').then(res => res.data),
    getReportById: (id: number): Promise<Report> => api.get(`/bi/reports/${id}`).then(res => res.data),
    createReport: (data: Omit<Report, 'id'>): Promise<Report> => api.post('/bi/reports', data).then(res => res.data),
    updateReport: (id: number, data: Partial<Report>): Promise<Report> => api.put(`/bi/reports/${id}`, data).then(res => res.data),
    deleteReport: (id: number): Promise<void> => api.delete(`/bi/reports/${id}`).then(() => undefined),
    getMetrics: (): Promise<Metric[]> => api.get('/bi/metrics').then(res => res.data),
    getFilteredReports: (type?: string, status?: string): Promise<Report[]> => {
      const params = new URLSearchParams();
      if (type && type !== 'All') params.append('type', type);
      if (status && status !== 'All') params.append('status', status);
      return api.get(`/bi/reports?${params.toString()}`).then(res => res.data);
    },
  },

  // Generic service methods that can be used for other services
  generic: {
    getAll: <T = unknown>(serviceName: string): Promise<T[]> => api.get(`/${serviceName}`).then(res => res.data),
    getById: <T = unknown>(serviceName: string, id: number): Promise<T> => api.get(`/${serviceName}/${id}`).then(res => res.data),
    create: <T = unknown>(serviceName: string, data: Record<string, unknown>): Promise<T> => api.post(`/${serviceName}`, data).then(res => res.data),
    update: <T = unknown>(serviceName: string, id: number, data: Record<string, unknown>): Promise<T> => api.put(`/${serviceName}/${id}`, data).then(res => res.data),
    delete: (serviceName: string, id: number): Promise<void> => api.delete(`/${serviceName}/${id}`).then(() => undefined),
    search: <T = unknown>(serviceName: string, query: string): Promise<T[]> => api.get(`/${serviceName}/search?q=${query}`).then(res => res.data),
  },
};

export default api;
