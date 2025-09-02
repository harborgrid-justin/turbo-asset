// API Client for TurboAsset Backend Services
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

class ApiClient {
  private baseUrl: string;
  private defaultHeaders: Record<string, string>;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    this.defaultHeaders = {
      'Content-Type': 'application/json',
    };
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}/api${endpoint}`;
    
    const config: RequestInit = {
      headers: {
        ...this.defaultHeaders,
        ...options.headers,
      },
      ...options,
    };

    // Add auth token if available (from localStorage or session)
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('auth_token');
      if (token) {
        config.headers = {
          ...config.headers,
          Authorization: `Bearer ${token}`,
        };
      }
    }

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        return await response.json();
      }
      
      return response.text() as unknown as T;
    } catch (error) {
      console.error(`API request failed: ${endpoint}`, error);
      throw error;
    }
  }

  // Generic REST methods
  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  async patch<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  // Set auth token
  setAuthToken(token: string) {
    if (typeof window !== 'undefined') {
      localStorage.setItem('auth_token', token);
    }
  }

  // Remove auth token
  clearAuthToken() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('auth_token');
    }
  }
}

// Create singleton instance
export const apiClient = new ApiClient();

// Service-specific API methods
export const businessIntelligenceApi = {
  getReports: (organizationId: string, params?: { page?: number; limit?: number; type?: string }) => {
    const query = new URLSearchParams();
    if (params?.page) query.append('page', params.page.toString());
    if (params?.limit) query.append('limit', params.limit.toString());
    if (params?.type) query.append('type', params.type);
    
    const queryString = query.toString();
    return apiClient.get<PaginatedResponse<any>>(`/business-intelligence/${organizationId}/reports${queryString ? `?${queryString}` : ''}`);
  },

  createReport: (organizationId: string, report: any) =>
    apiClient.post<any>(`/business-intelligence/${organizationId}/reports`, report),

  executeReport: (organizationId: string, reportId: string) =>
    apiClient.post<any>(`/business-intelligence/${organizationId}/reports/${reportId}/execute`),

  getDashboards: (organizationId: string) =>
    apiClient.get<any[]>(`/business-intelligence/${organizationId}/dashboards`),

  getDashboardData: (organizationId: string, dashboardId: string) =>
    apiClient.get<any>(`/business-intelligence/${organizationId}/dashboards/${dashboardId}/data`),
};

export const apiManagementApi = {
  getEndpoints: (organizationId: string) =>
    apiClient.get<any[]>(`/api-management/${organizationId}/endpoints`),

  createEndpoint: (organizationId: string, endpoint: any) =>
    apiClient.post<any>(`/api-management/${organizationId}/endpoints`, endpoint),

  getApiKeys: (organizationId: string) =>
    apiClient.get<any[]>(`/api-management/${organizationId}/keys`),

  createApiKey: (organizationId: string, keyData: any) =>
    apiClient.post<any>(`/api-management/${organizationId}/keys`, keyData),

  getUsageAnalytics: (organizationId: string) =>
    apiClient.get<any>(`/api-management/${organizationId}/analytics`),
};

export const integrationApi = {
  getIntegrations: (organizationId: string) =>
    apiClient.get<any[]>(`/integrations/${organizationId}`),

  createIntegration: (organizationId: string, integration: any) =>
    apiClient.post<any>(`/integrations/${organizationId}`, integration),

  testConnection: (organizationId: string, integrationId: string) =>
    apiClient.post<any>(`/integrations/${organizationId}/${integrationId}/test`),

  getSyncLogs: (organizationId: string, integrationId: string) =>
    apiClient.get<any[]>(`/integrations/${organizationId}/${integrationId}/logs`),
};

export const enterpriseServiceBusApi = {
  getFlows: (organizationId: string) =>
    apiClient.get<any[]>(`/enterprise-integrations/${organizationId}/flows`),

  createFlow: (organizationId: string, flow: any) =>
    apiClient.post<any>(`/enterprise-integrations/${organizationId}/flows`, flow),

  getMetrics: (organizationId: string) =>
    apiClient.get<any>(`/enterprise-integrations/${organizationId}/esb/metrics`),

  getEndpoints: (organizationId: string) =>
    apiClient.get<any[]>(`/enterprise-integrations/${organizationId}/endpoints`),

  createEndpoint: (organizationId: string, endpoint: any) =>
    apiClient.post<any>(`/enterprise-integrations/${organizationId}/endpoints`, endpoint),
};

export const salesforceIntegrationApi = {
  getObjects: (organizationId: string) =>
    apiClient.get<any[]>(`/enterprise-integrations/${organizationId}/salesforce/objects`),

  sync: (organizationId: string) =>
    apiClient.post<any>(`/enterprise-integrations/${organizationId}/salesforce/sync`, {}),

  testConnection: (organizationId: string) =>
    apiClient.post<any>(`/enterprise-integrations/${organizationId}/salesforce/test`, {}),

  getSettings: (organizationId: string) =>
    apiClient.get<any>(`/enterprise-integrations/${organizationId}/salesforce/settings`),

  updateSettings: (organizationId: string, settings: any) =>
    apiClient.put<any>(`/enterprise-integrations/${organizationId}/salesforce/settings`, settings),
};