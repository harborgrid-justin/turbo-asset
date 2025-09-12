#!/usr/bin/env node

/**
 * Simple Backend Server for Turbo Asset
 * Customer-ready demonstration server with essential endpoints
 */

const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Mock data for demonstrations
const mockAssets = Array.from({ length: 100 }, (_, i) => ({
  id: `A-${String(i + 1).padStart(5, '0')}`,
  name: `Asset ${i + 1}`,
  category: ['HVAC', 'Electrical', 'Mechanical', 'IT Equipment', 'Vehicles', 'Furniture'][i % 6],
  value: Math.floor(Math.random() * 100000) + 10000,
  condition: ['Excellent', 'Good', 'Fair', 'Poor', 'Critical'][Math.floor(Math.random() * 5)],
  status: ['Active', 'Inactive', 'Under Maintenance', 'Retired'][Math.floor(Math.random() * 4)],
  criticality: ['Critical', 'High', 'Medium', 'Low'][Math.floor(Math.random() * 4)],
  lastMaintenanceDate: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000),
  nextMaintenanceDate: new Date(Date.now() + Math.random() * 90 * 24 * 60 * 60 * 1000)
}));

const mockWorkOrders = Array.from({ length: 50 }, (_, i) => ({
  id: `WO-${String(i + 1).padStart(5, '0')}`,
  title: `Work Order ${i + 1}`,
  assetId: mockAssets[Math.floor(Math.random() * mockAssets.length)].id,
  priority: ['Critical', 'High', 'Medium', 'Low'][Math.floor(Math.random() * 4)],
  status: ['Open', 'In Progress', 'Completed', 'On Hold', 'Cancelled'][Math.floor(Math.random() * 5)],
  type: ['Preventive', 'Corrective', 'Emergency', 'Inspection'][Math.floor(Math.random() * 4)],
  assignedTo: `Technician ${Math.floor(Math.random() * 10) + 1}`,
  createdDate: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
  dueDate: new Date(Date.now() + Math.random() * 7 * 24 * 60 * 60 * 1000),
  description: `Maintenance required for asset ${i + 1}`,
  estimatedHours: Math.floor(Math.random() * 8) + 1,
  actualHours: Math.random() < 0.7 ? Math.floor(Math.random() * 8) + 1 : null
}));

const mockServiceHealth = [
  { name: 'contract-lifecycle', napiStatus: 'HEALTHY', businessLogic: 'HEALTHY', circuitBreaker: 'CLOSED' },
  { name: 'budget-forecast', napiStatus: 'HEALTHY', businessLogic: 'HEALTHY', circuitBreaker: 'CLOSED' },
  { name: 'asset-lifecycle', napiStatus: 'HEALTHY', businessLogic: 'HEALTHY', circuitBreaker: 'CLOSED' },
  { name: 'document', napiStatus: 'HEALTHY', businessLogic: 'HEALTHY', circuitBreaker: 'CLOSED' },
  { name: 'vendor-broker', napiStatus: 'UNHEALTHY', businessLogic: 'HEALTHY', circuitBreaker: 'CLOSED' },
  { name: 'financial-consolidation', napiStatus: 'UNHEALTHY', businessLogic: 'UNHEALTHY', circuitBreaker: 'OPEN' }
];

const mockServiceMetrics = [
  { name: 'contract-lifecycle', callCount: 1250, successRate: 98.4, avgResponseTime: 180, healthStatus: 'HEALTHY' },
  { name: 'budget-forecast', callCount: 850, successRate: 96.8, avgResponseTime: 320, healthStatus: 'HEALTHY' },
  { name: 'asset-lifecycle', callCount: 2100, successRate: 99.1, avgResponseTime: 150, healthStatus: 'HEALTHY' },
  { name: 'document', callCount: 3200, successRate: 97.2, avgResponseTime: 280, healthStatus: 'HEALTHY' },
  { name: 'vendor-broker', callCount: 720, successRate: 92.1, avgResponseTime: 410, healthStatus: 'HEALTHY' },
  { name: 'financial-consolidation', callCount: 540, successRate: 89.3, avgResponseTime: 520, healthStatus: 'UNHEALTHY' }
];

// API Routes

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: 'production-demo'
  });
});

// Assets API
app.get('/api/assets', (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  const category = req.query.category;
  const status = req.query.status;
  
  let filteredAssets = mockAssets;
  
  if (category) {
    filteredAssets = filteredAssets.filter(asset => asset.category === category);
  }
  
  if (status) {
    filteredAssets = filteredAssets.filter(asset => asset.status === status);
  }
  
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const paginatedAssets = filteredAssets.slice(startIndex, endIndex);
  
  res.json({
    success: true,
    data: paginatedAssets,
    pagination: {
      page,
      limit,
      total: filteredAssets.length,
      totalPages: Math.ceil(filteredAssets.length / limit)
    }
  });
});

// Asset statistics
app.get('/api/assets/stats', (req, res) => {
  const totalAssets = mockAssets.length;
  const totalValue = mockAssets.reduce((sum, asset) => sum + asset.value, 0);
  const availableAssets = mockAssets.filter(asset => asset.status === 'Active').length;
  const maintenanceDue = mockAssets.filter(asset => new Date(asset.nextMaintenanceDate) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)).length;
  
  const categoryStats = mockAssets.reduce((acc, asset) => {
    acc[asset.category] = (acc[asset.category] || 0) + 1;
    return acc;
  }, {});
  
  const conditionStats = mockAssets.reduce((acc, asset) => {
    acc[asset.condition] = (acc[asset.condition] || 0) + 1;
    return acc;
  }, {});
  
  const statusStats = mockAssets.reduce((acc, asset) => {
    acc[asset.status] = (acc[asset.status] || 0) + 1;
    return acc;
  }, {});
  
  const criticalityStats = mockAssets.reduce((acc, asset) => {
    acc[asset.criticality] = (acc[asset.criticality] || 0) + 1;
    return acc;
  }, {});
  
  res.json({
    success: true,
    data: {
      summary: {
        totalAssets,
        totalValue,
        availabilityRate: ((availableAssets / totalAssets) * 100).toFixed(1),
        maintenanceDue
      },
      categories: categoryStats,
      conditions: conditionStats,
      statuses: statusStats,
      criticality: criticalityStats
    }
  });
});

// Work Orders API
app.get('/api/work-orders', (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 10;
  
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const paginatedOrders = mockWorkOrders.slice(startIndex, endIndex);
  
  res.json({
    success: true,
    data: paginatedOrders,
    pagination: {
      page,
      limit,
      total: mockWorkOrders.length,
      totalPages: Math.ceil(mockWorkOrders.length / limit)
    }
  });
});

// Work Orders statistics
app.get('/api/work-orders/stats', (req, res) => {
  const totalOrders = mockWorkOrders.length;
  const completedOrders = mockWorkOrders.filter(wo => wo.status === 'Completed').length;
  const completionRate = ((completedOrders / totalOrders) * 100).toFixed(1);
  
  const totalHours = mockWorkOrders.reduce((sum, wo) => sum + (wo.actualHours || wo.estimatedHours), 0);
  const avgCompletionTime = (totalHours / totalOrders).toFixed(1);
  
  const priorityStats = mockWorkOrders.reduce((acc, wo) => {
    acc[wo.priority] = (acc[wo.priority] || 0) + 1;
    return acc;
  }, {});
  
  const statusStats = mockWorkOrders.reduce((acc, wo) => {
    acc[wo.status] = (acc[wo.status] || 0) + 1;
    return acc;
  }, {});
  
  const typeStats = mockWorkOrders.reduce((acc, wo) => {
    acc[wo.type] = (acc[wo.type] || 0) + 1;
    return acc;
  }, {});
  
  res.json({
    success: true,
    data: {
      summary: {
        totalOrders,
        completionRate: parseFloat(completionRate),
        avgCompletionTime: `${avgCompletionTime}h`,
        totalCost: '$487,650'
      },
      priorities: priorityStats,
      statuses: statusStats,
      types: typeStats
    }
  });
});

// Business Logic Integration API
app.get('/api/monitoring/services', (req, res) => {
  res.json({
    success: true,
    data: {
      overall: {
        status: 'HEALTHY',
        totalRequests: 45230,
        successRate: 97.0,
        avgResponseTime: 245,
        napiSuccessRate: 94.2
      },
      services: mockServiceHealth.map(service => ({
        ...service,
        lastCheck: new Date().toLocaleTimeString()
      }))
    }
  });
});

app.get('/api/monitoring/metrics', (req, res) => {
  res.json({
    success: true,
    data: mockServiceMetrics
  });
});

// Audit Trail API
app.get('/api/audit', (req, res) => {
  const mockAuditEntries = Array.from({ length: 20 }, (_, i) => ({
    id: `audit-${i + 1}`,
    timestamp: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000),
    user: `user${Math.floor(Math.random() * 10) + 1}@company.com`,
    action: ['CREATE', 'UPDATE', 'DELETE', 'VIEW'][Math.floor(Math.random() * 4)],
    resource: ['Asset', 'Work Order', 'User', 'Report'][Math.floor(Math.random() * 4)],
    resourceId: `RES-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`,
    ipAddress: `192.168.1.${Math.floor(Math.random() * 255)}`,
    userAgent: 'Mozilla/5.0 (compatible; TurboAsset/1.0)',
    changes: i % 3 === 0 ? { status: { from: 'Active', to: 'Inactive' } } : null
  }));
  
  res.json({
    success: true,
    data: mockAuditEntries
  });
});

// Error handling
app.use((req, res) => {
  res.status(404).json({ 
    success: false, 
    error: 'Endpoint not found',
    message: `${req.method} ${req.path} is not available in this demo environment`
  });
});

app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ 
    success: false, 
    error: 'Internal server error',
    message: 'Please check server logs for details'
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`\n🚀 Turbo Asset Demo Server`);
  console.log(`   Port: ${PORT}`);
  console.log(`   Environment: Production Demo`);
  console.log(`   API Base: http://localhost:${PORT}/api`);
  console.log(`   Health Check: http://localhost:${PORT}/health`);
  console.log(`   Time: ${new Date().toISOString()}\n`);
  console.log('📊 Available Endpoints:');
  console.log('   GET /health - Server health check');
  console.log('   GET /api/assets - Asset management');
  console.log('   GET /api/assets/stats - Asset statistics');
  console.log('   GET /api/work-orders - Work order management');
  console.log('   GET /api/work-orders/stats - Maintenance statistics');
  console.log('   GET /api/monitoring/services - Service health monitoring');
  console.log('   GET /api/monitoring/metrics - Performance metrics');
  console.log('   GET /api/audit - Audit trail logging\n');
});