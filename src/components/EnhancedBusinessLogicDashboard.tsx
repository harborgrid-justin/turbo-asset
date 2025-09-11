import React, { useState, useEffect } from 'react';

// Types for the dashboard data
interface DashboardData {
  overview: {
    totalRequests: number;
    successRate: string;
    averageResponseTime: string;
    overallHealth: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY';
  };
  services: {
    total: number;
    healthy: number;
    degraded: number;
    unhealthy: number;
  };
  circuitBreakers: {
    open: number;
    closed: number;
  };
  rateLimit: {
    servicesWithLimits: number;
    totalBlocked: number;
  };
  validation: {
    totalValidations: number;
    failedValidations: number;
  };
  topServices: Array<{
    name: string;
    status: string;
    responseTime: number;
    errorRate: string;
  }>;
}

interface ServiceBridge {
  serviceName: string;
  napiServiceName?: string;
  integrationMethods?: string[];
  fallbackEnabled?: boolean;
  metrics?: {
    callCount: number;
    successCount: number;
    failureCount: number;
    avgResponseTime: number;
    circuitBreakerStatus: string;
    lastHealthCheck?: string;
    lastFailureTime?: string;
  };
  rateLimit?: {
    maxRequestsPerMinute: number;
    currentWindowRequests: number;
    blockUntil?: string;
  };
  validation?: {
    enabled: boolean;
    rulesCount: number;
  };
  retry?: {
    maxAttempts: number;
    backoffMultiplier: number;
    baseDelayMs: number;
  };
}

// Health status color mapping
const getHealthColor = (status: string): string => {
  switch (status) {
    case 'HEALTHY': return '#10B981'; // green
    case 'DEGRADED': return '#F59E0B'; // yellow
    case 'UNHEALTHY': return '#EF4444'; // red
    default: return '#6B7280'; // gray
  }
};

// Circuit breaker status color
const getCircuitBreakerColor = (status: string): string => {
  switch (status) {
    case 'CLOSED': return '#10B981'; // green
    case 'HALF_OPEN': return '#F59E0B'; // yellow
    case 'OPEN': return '#EF4444'; // red
    default: return '#6B7280'; // gray
  }
};

/**
 * Enhanced Business Logic Integration Dashboard
 * Real-time monitoring and management interface
 */
export const EnhancedBusinessLogicDashboard: React.FC = () => {
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [serviceBridges, setServiceBridges] = useState<ServiceBridge[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshInterval, setRefreshInterval] = useState(30000); // 30 seconds
  const [autoRefresh, setAutoRefresh] = useState(true);

  // Fetch dashboard data
  const fetchDashboardData = async () => {
    try {
      const response = await fetch('/api/enhanced-business-logic-integration/dashboard');
      if (!response.ok) {throw new Error('Failed to fetch dashboard data');}
      
      const result = await response.json();
      if (result.success) {
        setDashboardData(result.data);
        setError(null);
      } else {
        throw new Error(result.error?.message || 'Unknown error');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch dashboard data');
    }
  };

  // Fetch service bridges
  const fetchServiceBridges = async () => {
    try {
      const response = await fetch('/api/enhanced-business-logic-integration/bridges');
      if (!response.ok) {throw new Error('Failed to fetch service bridges');}
      
      const result = await response.json();
      if (result.success) {
        setServiceBridges(result.data.bridges);
      } else {
        throw new Error(result.error?.message || 'Unknown error');
      }
    } catch (err) {
      console.error('Error fetching service bridges:', err);
    }
  };

  // Initial data load
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([
        fetchDashboardData(),
        fetchServiceBridges()
      ]);
      setLoading(false);
    };

    loadData();
  }, []);

  // Auto-refresh setup
  useEffect(() => {
    if (!autoRefresh) {return;}

    const interval = setInterval(() => {
      fetchDashboardData();
      fetchServiceBridges();
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval]);

  // Manual refresh
  const handleRefresh = () => {
    fetchDashboardData();
    fetchServiceBridges();
  };

  // Reset service metrics
  const resetServiceMetrics = async (serviceName: string) => {
    try {
      const response = await fetch(
        `/api/enhanced-business-logic-integration/services/${serviceName}/reset-metrics`,
        { method: 'POST' }
      );
      
      if (response.ok) {
        await fetchServiceBridges();
        await fetchDashboardData();
      } else {
        const result = await response.json();
        alert(`Failed to reset metrics: ${result.error?.message || 'Unknown error'}`);
      }
    } catch (err) {
      alert(`Error resetting metrics: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading dashboard...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="flex">
          <div className="ml-3">
            <h3 className="text-sm font-medium text-red-800">Dashboard Error</h3>
            <div className="mt-2 text-sm text-red-700">{error}</div>
            <div className="mt-3">
              <button
                onClick={handleRefresh}
                className="bg-red-100 hover:bg-red-200 text-red-800 px-3 py-1 text-sm rounded"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Enhanced Business Logic Integration Dashboard
          </h1>
          <p className="text-gray-600 mt-1">
            Production-grade NAPI-RS monitoring and management
          </p>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <label className="text-sm text-gray-600">Auto-refresh:</label>
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="rounded"
            />
          </div>
          
          <select
            value={refreshInterval}
            onChange={(e) => setRefreshInterval(Number(e.target.value))}
            className="border border-gray-300 rounded px-2 py-1 text-sm"
          >
            <option value={10000}>10s</option>
            <option value={30000}>30s</option>
            <option value={60000}>1m</option>
            <option value={300000}>5m</option>
          </select>
          
          <button
            onClick={handleRefresh}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Overview Cards */}
      {dashboardData && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600">Overall Health</p>
                <p className="text-2xl font-bold" style={{ color: getHealthColor(dashboardData.overview.overallHealth) }}>
                  {dashboardData.overview.overallHealth}
                </p>
              </div>
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: getHealthColor(dashboardData.overview.overallHealth) }}
              ></div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600">Total Requests</p>
                <p className="text-2xl font-bold text-gray-900">
                  {dashboardData.overview.totalRequests.toLocaleString()}
                </p>
                <p className="text-sm text-gray-500">
                  {dashboardData.overview.successRate}% success rate
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600">Avg Response Time</p>
                <p className="text-2xl font-bold text-gray-900">
                  {dashboardData.overview.averageResponseTime}ms
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-600">Services</p>
                <p className="text-2xl font-bold text-green-600">
                  {dashboardData.services.healthy}
                </p>
                <p className="text-sm text-gray-500">
                  of {dashboardData.services.total} healthy
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Services Overview */}
      {dashboardData && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Service Status</h3>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-green-600">Healthy</span>
                  <span className="font-medium">{dashboardData.services.healthy}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-yellow-600">Degraded</span>
                  <span className="font-medium">{dashboardData.services.degraded}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-red-600">Unhealthy</span>
                  <span className="font-medium">{dashboardData.services.unhealthy}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Circuit Breakers</h3>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-green-600">Closed</span>
                  <span className="font-medium">{dashboardData.circuitBreakers.closed}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-red-600">Open</span>
                  <span className="font-medium">{dashboardData.circuitBreakers.open}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Service Bridges Table */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Service Bridges</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Service
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Calls
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Success Rate
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Avg Response
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Circuit Breaker
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rate Limit
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {serviceBridges.map((bridge) => (
                <tr key={bridge.serviceName}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {bridge.serviceName}
                      </div>
                      <div className="text-sm text-gray-500">
                        NAPI: {bridge.napiServiceName}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className="inline-flex px-2 py-1 text-xs font-semibold rounded-full"
                      style={{
                        backgroundColor: bridge.fallbackEnabled ? '#D1FAE5' : '#FEE2E2',
                        color: bridge.fallbackEnabled ? '#065F46' : '#991B1B'
                      }}
                    >
                      {bridge.fallbackEnabled ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {bridge.metrics?.callCount || 0}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {bridge.metrics?.callCount ? 
                      `${((bridge.metrics.successCount / bridge.metrics.callCount) * 100).toFixed(1)}%` : 
                      'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {bridge.metrics?.avgResponseTime ? 
                      `${bridge.metrics.avgResponseTime.toFixed(1)}ms` : 
                      'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className="inline-flex px-2 py-1 text-xs font-semibold rounded-full"
                      style={{
                        backgroundColor: bridge.metrics?.circuitBreakerStatus === 'CLOSED' ? '#D1FAE5' : '#FEE2E2',
                        color: bridge.metrics?.circuitBreakerStatus === 'CLOSED' ? '#065F46' : '#991B1B'
                      }}
                    >
                      {bridge.metrics?.circuitBreakerStatus || 'UNKNOWN'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {bridge.rateLimit?.maxRequestsPerMinute || 0}/min
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button
                      onClick={() => resetServiceMetrics(bridge.serviceName)}
                      className="text-indigo-600 hover:text-indigo-900 text-sm"
                    >
                      Reset Metrics
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Top Services by Error Rate */}
      {dashboardData && dashboardData.topServices.length > 0 && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Services by Error Rate</h3>
          </div>
          <div className="p-6">
            <div className="space-y-3">
              {dashboardData.topServices.map((service, index) => (
                <div key={service.name} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <span className="text-sm font-medium text-gray-900 w-4 text-center">
                      {index + 1}
                    </span>
                    <span className="ml-3 text-sm text-gray-900">{service.name}</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <span className="text-sm text-gray-500">
                      {service.responseTime.toFixed(1)}ms
                    </span>
                    <span 
                      className="text-sm font-medium"
                      style={{ color: parseFloat(service.errorRate) > 10 ? '#EF4444' : '#10B981' }}
                    >
                      {service.errorRate}%
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedBusinessLogicDashboard;