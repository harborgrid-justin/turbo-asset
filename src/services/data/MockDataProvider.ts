/**
 * Centralized Mock Data Provider
 * 
 * This service centralizes all mock data generation and provides
 * configurable mock data for the entire application.
 */

import { config } from '../../config';

export interface AssetMockData {
  id: string;
  name: string;
  category: string;
  value: number;
  condition: string;
  status: string;
  criticality: string;
  lastMaintenanceDate: Date;
  nextMaintenanceDate: Date;
  // Extended frontend properties
  assetTag?: string;
  assetName?: string;
  location?: string;
  building?: string;
  manufacturer?: string;
  model?: string;
  purchasePrice?: number;
  purchaseDate?: string;
  warrantyExpiry?: string;
}

export interface WorkOrderMockData {
  id: string;
  title: string;
  assetId: string;
  priority: string;
  status: string;
  type: string;
  assignedTo: string;
  createdDate: Date;
  dueDate: Date;
  description: string;
  estimatedHours: number;
  actualHours: number | null;
}

export interface ServiceHealthMockData {
  name: string;
  napiStatus: 'HEALTHY' | 'UNHEALTHY';
  businessLogic: 'HEALTHY' | 'UNHEALTHY';
  circuitBreaker: 'CLOSED' | 'OPEN';
}

export interface ServiceMetricsMockData {
  name: string;
  callCount: number;
  successRate: number;
  avgResponseTime: number;
  healthStatus: string;
}

export interface PortfolioDashboardMockData {
  totalProperties: number;
  totalSpaces: number;
  occupancyRate: number;
  utilizationRate: number;
  totalRevenue: number;
  netOperatingIncome: number;
  properties: any[];
  alerts: any[];
}

export class MockDataProvider {
  private static instance: MockDataProvider;
  
  // Configuration from central config
  private readonly mockConfig = config.mockData || {
    assetCount: 100,
    workOrderCount: 50,
    spaceCount: 50,
    maintenanceRecordCount: 200,
    auditEntryCount: 20,
    enableRandomization: true,
    seed: 12345
  };

  private constructor() {}

  public static getInstance(): MockDataProvider {
    if (!MockDataProvider.instance) {
      MockDataProvider.instance = new MockDataProvider();
    }
    return MockDataProvider.instance;
  }

  /**
   * Generate mock assets data
   */
  public generateAssets(count?: number): AssetMockData[] {
    const assetCount = count || this.mockConfig.assetCount;
    const categories = ['HVAC', 'Electrical', 'Mechanical', 'IT Equipment', 'Vehicles', 'Furniture'];
    const conditions = ['Excellent', 'Good', 'Fair', 'Poor', 'Critical'];
    const statuses = ['Active', 'Inactive', 'Under Maintenance', 'Retired'];
    const criticalities = ['Critical', 'High', 'Medium', 'Low'];

    return Array.from({ length: assetCount }, (_, i) => ({
      id: `A-${String(i + 1).padStart(5, '0')}`,
      name: `Asset ${i + 1}`,
      assetTag: `${categories[i % 6].slice(0, 4).toUpperCase()}-${String(i + 1).padStart(3, '0')}`,
      assetName: `${categories[i % 6]} Unit ${String.fromCharCode(65 + (i % 26))}`,
      category: categories[i % 6],
      value: Math.floor(Math.random() * 100000) + 10000,
      purchasePrice: Math.floor(Math.random() * 100000) + 10000,
      condition: conditions[Math.floor(Math.random() * 5)],
      status: statuses[Math.floor(Math.random() * 4)],
      criticality: criticalities[Math.floor(Math.random() * 4)],
      location: `Building ${String.fromCharCode(65 + (i % 3))} - Floor ${((i % 5) + 1)}`,
      building: `Building ${String.fromCharCode(65 + (i % 3))}`,
      manufacturer: ['Carrier', 'Generac', 'Siemens', 'Honeywell', 'Johnson Controls'][i % 5],
      model: `Model-${String(i + 1).padStart(4, '0')}`,
      lastMaintenanceDate: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000),
      nextMaintenanceDate: new Date(Date.now() + Math.random() * 90 * 24 * 60 * 60 * 1000),
      purchaseDate: new Date(2020 + Math.floor(Math.random() * 4), Math.floor(Math.random() * 12), 1).toISOString().split('T')[0],
      warrantyExpiry: new Date(2025 + Math.floor(Math.random() * 3), Math.floor(Math.random() * 12), 1).toISOString().split('T')[0]
    }));
  }

  /**
   * Generate mock work orders data
   */
  public generateWorkOrders(assets?: AssetMockData[], count?: number): WorkOrderMockData[] {
    const workOrderCount = count || this.mockConfig.workOrderCount;
    const assetsList = assets || this.generateAssets();
    const priorities = ['Critical', 'High', 'Medium', 'Low'];
    const statuses = ['Open', 'In Progress', 'Completed', 'On Hold', 'Cancelled'];
    const types = ['Preventive', 'Corrective', 'Emergency', 'Inspection'];

    return Array.from({ length: workOrderCount }, (_, i) => ({
      id: `WO-${String(i + 1).padStart(5, '0')}`,
      title: `Work Order ${i + 1}`,
      assetId: assetsList[Math.floor(Math.random() * assetsList.length)].id,
      priority: priorities[Math.floor(Math.random() * 4)],
      status: statuses[Math.floor(Math.random() * 5)],
      type: types[Math.floor(Math.random() * 4)],
      assignedTo: `Technician ${Math.floor(Math.random() * 10) + 1}`,
      createdDate: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
      dueDate: new Date(Date.now() + Math.random() * 7 * 24 * 60 * 60 * 1000),
      description: `Maintenance required for asset ${i + 1}`,
      estimatedHours: Math.floor(Math.random() * 8) + 1,
      actualHours: Math.random() < 0.7 ? Math.floor(Math.random() * 8) + 1 : null
    }));
  }

  /**
   * Generate service health mock data
   */
  public generateServiceHealth(): ServiceHealthMockData[] {
    return [
      { name: 'contract-lifecycle', napiStatus: 'HEALTHY', businessLogic: 'HEALTHY', circuitBreaker: 'CLOSED' },
      { name: 'budget-forecast', napiStatus: 'HEALTHY', businessLogic: 'HEALTHY', circuitBreaker: 'CLOSED' },
      { name: 'asset-lifecycle', napiStatus: 'HEALTHY', businessLogic: 'HEALTHY', circuitBreaker: 'CLOSED' },
      { name: 'document', napiStatus: 'HEALTHY', businessLogic: 'HEALTHY', circuitBreaker: 'CLOSED' },
      { name: 'vendor-broker', napiStatus: 'UNHEALTHY', businessLogic: 'HEALTHY', circuitBreaker: 'CLOSED' },
      { name: 'financial-consolidation', napiStatus: 'UNHEALTHY', businessLogic: 'UNHEALTHY', circuitBreaker: 'OPEN' }
    ];
  }

  /**
   * Generate service metrics mock data
   */
  public generateServiceMetrics(): ServiceMetricsMockData[] {
    return [
      { name: 'contract-lifecycle', callCount: 1250, successRate: 98.4, avgResponseTime: 180, healthStatus: 'HEALTHY' },
      { name: 'budget-forecast', callCount: 850, successRate: 96.8, avgResponseTime: 320, healthStatus: 'HEALTHY' },
      { name: 'asset-lifecycle', callCount: 2100, successRate: 99.1, avgResponseTime: 150, healthStatus: 'HEALTHY' },
      { name: 'document', callCount: 3200, successRate: 97.2, avgResponseTime: 280, healthStatus: 'HEALTHY' },
      { name: 'vendor-broker', callCount: 720, successRate: 92.1, avgResponseTime: 410, healthStatus: 'HEALTHY' },
      { name: 'financial-consolidation', callCount: 540, successRate: 89.3, avgResponseTime: 520, healthStatus: 'UNHEALTHY' }
    ];
  }

  /**
   * Generate audit trail mock data
   */
  public generateAuditEntries(count?: number): any[] {
    const auditCount = count || this.mockConfig.auditEntryCount;
    const actions = ['CREATE', 'UPDATE', 'DELETE', 'VIEW'];
    const resources = ['Asset', 'Work Order', 'User', 'Report'];

    return Array.from({ length: auditCount }, (_, i) => ({
      id: `audit-${i + 1}`,
      timestamp: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000),
      user: `user${Math.floor(Math.random() * 10) + 1}@company.com`,
      action: actions[Math.floor(Math.random() * 4)],
      resource: resources[Math.floor(Math.random() * 4)],
      resourceId: `RES-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`,
      ipAddress: `192.168.1.${Math.floor(Math.random() * 255)}`,
      userAgent: 'Mozilla/5.0 (compatible; TurboAsset/1.0)',
      changes: i % 3 === 0 ? { status: { from: 'Active', to: 'Inactive' } } : null
    }));
  }

  /**
   * Generate portfolio dashboard mock data
   */
  public generatePortfolioDashboard(): PortfolioDashboardMockData {
    return {
      totalProperties: 42,
      totalSpaces: 2847,
      occupancyRate: 87.3,
      utilizationRate: 73.8,
      totalRevenue: 8750000,
      netOperatingIncome: 6825000,
      properties: [
        {
          id: '1',
          name: 'Tower A - Downtown',
          type: 'Office',
          totalArea: 450000,
          occupiedArea: 392000,
          status: 'Active',
          revenue: 1250000
        },
        {
          id: '2',
          name: 'Corporate Center B',
          type: 'Mixed Use',
          totalArea: 680000,
          occupiedArea: 598000,
          status: 'Active',
          revenue: 1890000
        },
        {
          id: '3',
          name: 'Tech Campus C',
          type: 'Office',
          totalArea: 850000,
          occupiedArea: 731000,
          status: 'Active',
          revenue: 2340000
        }
      ],
      alerts: [
        {
          id: '1',
          type: 'warning',
          title: 'HVAC System Alert',
          description: 'HVAC system in Tower A requires required attention',
          priority: 'High'
        },
        {
          id: '2',
          type: 'info',
          title: 'Low Occupancy Alert',
          description: 'Tech Campus C occupancy below 75% threshold',
          priority: 'Medium'
        }
      ]
    };
  }

  /**
   * Generate move management mock data
   */
  public generateMoveManagement(): any {
    return {
      requests: [
        {
          id: '1',
          requestNumber: 'MR-2025-001',
          type: 'Internal',
          employee: {
            name: 'John Smith',
            department: 'Engineering',
            email: 'john.smith@company.com',
            phone: '+1 (555) 0123'
          },
          fromLocation: {
            building: 'Tower A',
            floor: '3rd Floor',
            space: 'Cubicle 312'
          },
          toLocation: {
            building: 'Tower B',
            floor: '5th Floor',
            space: 'Office 502'
          },
          requestedBy: 'Sarah Johnson',
          requestDate: '2025-01-10',
          scheduledDate: '2025-01-20',
          status: 'Approved',
          priority: 'Medium',
          estimatedCost: 2500,
          actualCost: null,
          notes: 'Employee promotion to Senior Engineer'
        }
      ],
      vendors: [
        {
          id: '1',
          name: 'Professional Movers Inc.',
          contact: 'Mike Wilson',
          email: 'mike@promovers.com',
          phone: '+1 (555) 0456',
          rating: 4.8,
          specialties: ['Office Moves', 'IT Equipment'],
          status: 'Active'
        }
      ]
    };
  }

  /**
   * Generate API endpoints mock data
   */
  public generateAPIEndpoints(): any {
    return {
      endpoints: [
        {
          id: 1,
          name: 'Portfolio Dashboard',
          method: 'GET',
          path: '/api/v1/portfolio/dashboard',
          status: 'Active',
          version: 'v1.2.0',
          description: 'Get comprehensive portfolio metrics and property data',
          responseTime: 245,
          requestCount: 15420,
          errorRate: 0.02,
          lastUpdated: '2025-01-15 11:30:00',
          category: 'Portfolio'
        },
        {
          id: 2,
          name: 'Financial Reports',
          method: 'POST',
          path: '/api/v2/financial/reports',
          status: 'Active',
          version: 'v2.1.0',
          description: 'Generate financial reports and analytics',
          responseTime: 850,
          requestCount: 8960,
          errorRate: 0.05,
          lastUpdated: '2025-01-15 09:15:00',
          category: 'Financial'
        }
      ],
      totalEndpoints: 2,
      activeEndpoints: 2,
      deprecatedEndpoints: 0
    };
  }

  /**
   * Generate API keys mock data
   */
  public generateAPIKeys(): any {
    return {
      keys: [
        {
          id: 1,
          name: 'Production Dashboard',
          key: 'api_key_prod_***********abc123',
          description: 'Main production dashboard API access',
          status: 'Active',
          permissions: ['read', 'write'],
          usage: 25420,
          limit: 50000,
          rateLimits: {
            requestsPerHour: 10000,
            burstLimit: 100
          },
          lastUsed: '2025-01-15 11:45:00',
          createdAt: '2024-11-15 09:30:00',
          expiresAt: '2025-06-15'
        }
      ],
      totalKeys: 1,
      activeKeys: 1,
      expiredKeys: 0
    };
  }

  /**
   * Business Intelligence mock data generators
   */
  
  /**
   * Generate mock asset data for BI
   */
  public generateBIAssetData(count?: number): any[] {
    const assetCount = count || 100;
    const categories = ['Office Equipment', 'HVAC', 'Lighting', 'Security', 'Furniture'];
    const statuses = ['Active', 'Maintenance', 'Retired'];
    const data = [];

    for (let i = 0; i < assetCount; i++) {
      data.push({
        id: `asset_${i + 1}`,
        name: `Asset ${i + 1}`,
        category: categories[Math.floor(Math.random() * categories.length)],
        status: statuses[Math.floor(Math.random() * statuses.length)],
        purchase_price: Math.floor(Math.random() * 10000) + 1000,
        purchase_date: new Date(2020, Math.floor(Math.random() * 48), 1),
        maintenance_cost: Math.floor(Math.random() * 1000),
        utilization: Math.floor(Math.random() * 100),
      });
    }

    return data;
  }

  /**
   * Generate mock space data for BI
   */
  public generateBISpaceData(count?: number): any[] {
    const spaceCount = count || this.mockConfig.spaceCount;
    const spaceTypes = ['Office', 'Conference Room', 'Lobby', 'Storage', 'Kitchen'];
    const data = [];

    for (let i = 0; i < spaceCount; i++) {
      data.push({
        id: `space_${i + 1}`,
        name: `Space ${i + 1}`,
        type: spaceTypes[Math.floor(Math.random() * spaceTypes.length)],
        square_footage: Math.floor(Math.random() * 1000) + 100,
        capacity: Math.floor(Math.random() * 50) + 5,
        occupancy_rate: Math.floor(Math.random() * 100),
        monthly_cost: Math.floor(Math.random() * 5000) + 500,
        utilization_score: Math.floor(Math.random() * 100),
      });
    }

    return data;
  }

  /**
   * Generate mock maintenance data for BI
   */
  public generateBIMaintenanceData(count?: number): any[] {
    const maintenanceCount = count || this.mockConfig.maintenanceRecordCount;
    const priorities = ['Low', 'Medium', 'High', 'Critical'];
    const statuses = ['Pending', 'In Progress', 'Completed', 'Cancelled'];
    const data = [];

    for (let i = 0; i < maintenanceCount; i++) {
      const createdDate = new Date(2024, Math.floor(Math.random() * 12), Math.floor(Math.random() * 28) + 1);
      data.push({
        id: `wo_${i + 1}`,
        work_order_number: `WO-2024-${String(i + 1).padStart(4, '0')}`,
        priority: priorities[Math.floor(Math.random() * priorities.length)],
        status: statuses[Math.floor(Math.random() * statuses.length)],
        created_date: createdDate,
        estimated_cost: Math.floor(Math.random() * 5000) + 100,
        actual_cost: Math.floor(Math.random() * 6000) + 100,
        estimated_hours: Math.floor(Math.random() * 40) + 1,
        actual_hours: Math.floor(Math.random() * 50) + 1,
        completion_rate: Math.floor(Math.random() * 100),
      });
    }

    return data;
  }

  /**
   * Generate generic mock data for BI
   */
  public generateBIGenericData(): any[] {
    const data = [];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    for (let i = 0; i < 12; i++) {
      data.push({
        month: months[i],
        revenue: Math.floor(Math.random() * 100000) + 50000,
        expenses: Math.floor(Math.random() * 80000) + 30000,
        profit: Math.floor(Math.random() * 50000) + 10000,
        occupancy: Math.floor(Math.random() * 30) + 70,
        satisfaction: Math.floor(Math.random() * 20) + 80,
      });
    }

    return data;
  }

  /**
   * Generate mock data based on SQL query pattern
   */
  public generateDataForQuery(sql: string): any[] {
    if (sql.toLowerCase().includes('asset')) {
      return this.generateBIAssetData();
    } else if (sql.toLowerCase().includes('space')) {
      return this.generateBISpaceData();
    } else if (sql.toLowerCase().includes('maintenance')) {
      return this.generateBIMaintenanceData();
    } else {
      return this.generateBIGenericData();
    }
  }
}

// Export singleton instance
export const mockDataProvider = MockDataProvider.getInstance();