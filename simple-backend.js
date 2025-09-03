const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const port = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Portfolio Dashboard API
app.get('/api/portfolio/dashboard', (req, res) => {
  const { organizationId } = req.query;
  console.log(`Portfolio dashboard requested for org: ${organizationId}`);
  
  const mockDashboard = {
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
        description: 'HVAC system in Tower A requires immediate attention',
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
  
  res.json({
    data: mockDashboard,
    success: true
  });
});

// Move Management API
app.get('/api/move-management', (req, res) => {
  const { organizationId } = req.query;
  console.log(`Move management data requested for org: ${organizationId}`);
  
  const mockMoveData = {
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
  
  res.json({
    data: mockMoveData,
    success: true
  });
});

// API Management endpoints  
app.get('/api/api-management/:organizationId/endpoints', (req, res) => {
  const { organizationId } = req.params;
  console.log(`API endpoints requested for org: ${organizationId}`);
  
  const mockEndpoints = {
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
  
  res.json({
    data: mockEndpoints,
    success: true
  });
});

app.get('/api/api-management/:organizationId/keys', (req, res) => {
  const { organizationId } = req.params;
  console.log(`API keys requested for org: ${organizationId}`);
  
  const mockKeys = {
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
  
  res.json({
    data: mockKeys,
    success: true
  });
});

// Create API endpoint
app.post('/api/api-management/:organizationId/endpoints', (req, res) => {
  const { organizationId } = req.params;
  const newEndpoint = req.body;
  console.log(`Creating API endpoint for org: ${organizationId}`, newEndpoint);
  
  res.json({
    data: {
      id: Date.now(),
      ...newEndpoint,
      status: 'Active',
      responseTime: 0,
      requestCount: 0,
      errorRate: 0,
      lastUpdated: new Date().toISOString()
    },
    success: true
  });
});

// Create API key
app.post('/api/api-management/:organizationId/keys', (req, res) => {
  const { organizationId } = req.params;
  const newKey = req.body;
  console.log(`Creating API key for org: ${organizationId}`, newKey);
  
  res.json({
    data: {
      id: Date.now(),
      ...newKey,
      keyPrefix: 'ta_' + Math.random().toString(36).substr(2, 8) + '_',
      status: 'Active',
      lastUsed: null,
      createdAt: new Date().toISOString()
    },
    success: true
  });
});

// Delete endpoints
app.delete('/api/api-management/:organizationId/endpoints/:endpointId', (req, res) => {
  const { organizationId, endpointId } = req.params;
  console.log(`Deleting endpoint ${endpointId} for org: ${organizationId}`);
  res.json({ success: true, message: 'Endpoint deleted successfully' });
});

app.delete('/api/api-management/:organizationId/keys/:keyId', (req, res) => {
  const { organizationId, keyId } = req.params;
  console.log(`Deleting API key ${keyId} for org: ${organizationId}`);
  res.json({ success: true, message: 'API key deleted successfully' });
});

// Catch-all handler: send back index.html for frontend routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public/index.html'));
});

app.listen(port, () => {
  console.log(`🚀 Backend API server running at http://localhost:${port}`);
  console.log(`📊 Portfolio Dashboard: http://localhost:${port}/api/portfolio/dashboard?organizationId=demo`);
  console.log(`🔧 Move Management: http://localhost:${port}/api/move-management?organizationId=demo`);
  console.log(`🔌 API Management: http://localhost:${port}/api/api-management/demo-org-123/endpoints`);
});

module.exports = app;