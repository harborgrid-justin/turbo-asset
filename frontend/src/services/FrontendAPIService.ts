/**
 * Frontend API Service for centralized data fetching
 * 
 * This service provides a unified interface for fetching data from the backend APIs,
 * replacing hardcoded mock data in frontend components.
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export interface Asset {
  id: string;
  assetTag: string;
  assetName: string;
  category: string;
  status: string;
  condition: string;
  criticality: string;
  location: string;
  building: string;
  manufacturer: string;
  model: string;
  purchasePrice: number;
  purchaseDate: string;
  warrantyExpiry: string;
  lastMaintenanceDate: string;
  nextMaintenanceDate: string;
}

export class FrontendAPIService {
  private static instance: FrontendAPIService;
  
  private constructor() {}

  public static getInstance(): FrontendAPIService {
    if (!FrontendAPIService.instance) {
      FrontendAPIService.instance = new FrontendAPIService();
    }
    return FrontendAPIService.instance;
  }

  /**
   * Get assets from the centralized backend API
   */
  async getAssets(filters?: {
    category?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: Asset[]; pagination: any }> {
    try {
      const queryParams = new URLSearchParams();
      
      if (filters?.category) queryParams.append('category', filters.category);
      if (filters?.status) queryParams.append('status', filters.status);
      if (filters?.page) queryParams.append('page', filters.page.toString());
      if (filters?.limit) queryParams.append('limit', filters.limit.toString());

      const response = await fetch(`${API_BASE_URL}/api/assets?${queryParams}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error('API returned error response');
      }

      // Transform backend data to frontend Asset interface
      const transformedAssets: Asset[] = result.data.map((asset: any) => ({
        id: asset.id,
        assetTag: asset.assetTag || asset.id,
        assetName: asset.assetName || asset.name,
        category: asset.category,
        status: asset.status,
        condition: asset.condition,
        criticality: asset.criticality,
        location: asset.location || 'Unknown',
        building: asset.building || 'Unknown',
        manufacturer: asset.manufacturer || 'Unknown',
        model: asset.model || 'Unknown',
        purchasePrice: asset.purchasePrice || asset.value || 0,
        purchaseDate: asset.purchaseDate || '',
        warrantyExpiry: asset.warrantyExpiry || '',
        lastMaintenanceDate: asset.lastMaintenanceDate ? 
          new Date(asset.lastMaintenanceDate).toISOString().split('T')[0] : '',
        nextMaintenanceDate: asset.nextMaintenanceDate ? 
          new Date(asset.nextMaintenanceDate).toISOString().split('T')[0] : '',
      }));

      return {
        data: transformedAssets,
        pagination: result.pagination
      };
    } catch (error) {
      console.error('Error fetching assets:', error);
      
      // Fallback to a minimal set of mock data for development
      return {
        data: [
          {
            id: '1',
            assetTag: 'HVAC-001',
            assetName: 'Central Air Conditioning Unit A',
            category: 'HVAC',
            status: 'Active',
            condition: 'Good',
            criticality: 'High',
            location: 'Main Building',
            building: 'Building A',
            manufacturer: 'Carrier',
            model: 'CA-2500',
            purchasePrice: 25000,
            purchaseDate: '2020-01-15',
            warrantyExpiry: '2025-01-15',
            lastMaintenanceDate: '2024-10-15',
            nextMaintenanceDate: '2025-04-15'
          }
        ],
        pagination: { page: 1, limit: 10, total: 1, totalPages: 1 }
      };
    }
  }

  /**
   * Get asset statistics from the centralized backend API
   */
  async getAssetStats(): Promise<any> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/assets/stats`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error('API returned error response');
      }

      return result.data;
    } catch (error) {
      console.error('Error fetching asset stats:', error);
      
      // Fallback mock data
      return {
        summary: {
          totalAssets: 0,
          totalValue: 0,
          availabilityRate: '0.0',
          maintenanceDue: 0
        },
        categories: {},
        conditions: {},
        statuses: {},
        criticality: {}
      };
    }
  }

  /**
   * Get work orders from the centralized backend API
   */
  async getWorkOrders(filters?: {
    page?: number;
    limit?: number;
  }): Promise<{ data: any[]; pagination: any }> {
    try {
      const queryParams = new URLSearchParams();
      
      if (filters?.page) queryParams.append('page', filters.page.toString());
      if (filters?.limit) queryParams.append('limit', filters.limit.toString());

      const response = await fetch(`${API_BASE_URL}/api/work-orders?${queryParams}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error('API returned error response');
      }

      return {
        data: result.data,
        pagination: result.pagination
      };
    } catch (error) {
      console.error('Error fetching work orders:', error);
      return {
        data: [],
        pagination: { page: 1, limit: 10, total: 0, totalPages: 0 }
      };
    }
  }

  /**
   * Get portfolio dashboard data
   */
  async getPortfolioDashboard(organizationId: string): Promise<any> {
    try {
      const response = await fetch(`${API_BASE_URL}/api/portfolio/dashboard?organizationId=${organizationId}`);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error('API returned error response');
      }

      return result.data;
    } catch (error) {
      console.error('Error fetching portfolio dashboard:', error);
      
      // Fallback mock data
      return {
        totalProperties: 0,
        totalSpaces: 0,
        occupancyRate: 0,
        utilizationRate: 0,
        totalRevenue: 0,
        netOperatingIncome: 0,
        properties: [],
        alerts: []
      };
    }
  }
}

// Export singleton instance
export const frontendAPIService = FrontendAPIService.getInstance();