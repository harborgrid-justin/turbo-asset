const express = require('express');
const cors = require('cors');
const path = require('path');

// Import centralized mock data provider
const { mockDataProvider } = require('./src/services/data/index.js');

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
  
  const mockDashboard = mockDataProvider.generatePortfolioDashboard();
  
  res.json({
    data: mockDashboard,
    success: true
  });
});

// Move Management API
app.get('/api/move-management', (req, res) => {
  const { organizationId } = req.query;
  console.log(`Move management data requested for org: ${organizationId}`);
  
  const mockMoveData = mockDataProvider.generateMoveManagement();
  
  res.json({
    data: mockMoveData,
    success: true
  });
});

// API Management endpoints  
app.get('/api/api-management/:organizationId/endpoints', (req, res) => {
  const { organizationId } = req.params;
  console.log(`API endpoints requested for org: ${organizationId}`);
  
  const mockEndpoints = mockDataProvider.generateAPIEndpoints();
  
  res.json({
    data: mockEndpoints,
    success: true
  });
});

app.get('/api/api-management/:organizationId/keys', (req, res) => {
  const { organizationId } = req.params;
  console.log(`API keys requested for org: ${organizationId}`);
  
  const mockKeys = mockDataProvider.generateAPIKeys();
  
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