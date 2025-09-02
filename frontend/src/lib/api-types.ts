// Type definitions for the API responses
export interface Report {
  id: number;
  name: string;
  type: 'Chart' | 'Table' | 'Dashboard' | 'KPI';
  category: 'Financial' | 'Operational' | 'Strategic' | 'Compliance';
  lastRun: string;
  status: 'Ready' | 'Running' | 'Failed' | 'Scheduled';
  schedule: string;
  dataPoints: number;
  reportType?: string;
  description?: string;
  configuration?: {
    schedule?: string;
    description?: string;
  };
}

export interface Dashboard {
  id: string;
  name: string;
  description?: string;
  dashboardType: string;
  layout: unknown;
  isPublic: boolean;
  refreshRate: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateReportRequest {
  name: string;
  type: string;
  category: string;
  schedule: string;
  description: string;
  reportType: string;
  configuration: {
    schedule: string;
    description: string;
  };
}

export interface ApiError {
  error: string;
  message?: string;
}

export interface ApiResponse<T> {
  data: T;
  success: boolean;
  error?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}