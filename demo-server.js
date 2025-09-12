#!/usr/bin/env node

/**
 * Simple Backend Server for Turbo Asset
 * Customer-ready demonstration server with essential endpoints
 */

const express = require('express');
const cors = require('cors');
const path = require('path');

// Import centralized mock data provider
// Note: Using require for CommonJS compatibility
const { mockDataProvider } = require('./src/services/data/index.js');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Initialize mock data from centralized provider
const mockAssets = mockDataProvider.generateAssets();
const mockWorkOrders = mockDataProvider.generateWorkOrders(mockAssets);
const mockServiceHealth = mockDataProvider.generateServiceHealth();
const mockServiceMetrics = mockDataProvider.generateServiceMetrics();

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
        totalCost: process.env.MOCK_TOTAL_COST || '$487,650'
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
  const mockAuditEntries = mockDataProvider.generateAuditEntries();
  
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