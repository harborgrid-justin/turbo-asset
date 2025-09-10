'use client';

import { useState, useEffect } from 'react';

interface ServiceMetrics {
  serviceName: string;
  callCount: number;
  successRate: number;
  avgResponseTime: number;
  isHealthy: boolean;
}

interface ProductionMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  napiSuccessRate: number;
  fallbackUsageRate: number;
  detailedMetrics: ServiceMetrics[];
}

interface HealthStatus {
  overallHealth: 'HEALTHY' | 'DEGRADED' | 'UNHEALTHY';
  serviceStatuses: Array<{
    serviceName: string;
    napiStatus: 'HEALTHY' | 'UNHEALTHY' | 'UNKNOWN';
    businessLogicStatus: 'HEALTHY' | 'UNHEALTHY' | 'UNKNOWN';
    circuitBreakerStatus: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
    lastHealthCheck: string;
  }>;
}

export default function BusinessLogicIntegrationDashboard() {
  const [metrics, setMetrics] = useState<ProductionMetrics | null>(null);
  const [healthStatus, setHealthStatus] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // In a real implementation, these would be actual API calls
      // For now, we'll simulate the data structure
      const mockMetrics: ProductionMetrics = {
        totalRequests: 45230,
        successfulRequests: 43892,
        failedRequests: 1338,
        averageResponseTime: 245,
        napiSuccessRate: 94.2,
        fallbackUsageRate: 12.5,
        detailedMetrics: [
          { serviceName: 'contract-lifecycle', callCount: 1250, successRate: 98.4, avgResponseTime: 180, isHealthy: true },
          { serviceName: 'budget-forecast', callCount: 850, successRate: 96.8, avgResponseTime: 320, isHealthy: true },
          { serviceName: 'asset-lifecycle', callCount: 2100, successRate: 99.1, avgResponseTime: 150, isHealthy: true },
          { serviceName: 'document', callCount: 3200, successRate: 97.2, avgResponseTime: 280, isHealthy: true },
          { serviceName: 'vendor-broker', callCount: 720, successRate: 92.1, avgResponseTime: 410, isHealthy: true },
          { serviceName: 'financial-consolidation', callCount: 540, successRate: 89.3, avgResponseTime: 520, isHealthy: false },
          { serviceName: 'space-standards', callCount: 980, successRate: 95.7, avgResponseTime: 200, isHealthy: true },
          { serviceName: 'critical-date', callCount: 1100, successRate: 97.8, avgResponseTime: 120, isHealthy: true },
        ]
      };

      const mockHealthStatus: HealthStatus = {
        overallHealth: 'HEALTHY',
        serviceStatuses: [
          { serviceName: 'contract-lifecycle', napiStatus: 'HEALTHY', businessLogicStatus: 'HEALTHY', circuitBreakerStatus: 'CLOSED', lastHealthCheck: new Date().toISOString() },
          { serviceName: 'budget-forecast', napiStatus: 'HEALTHY', businessLogicStatus: 'HEALTHY', circuitBreakerStatus: 'CLOSED', lastHealthCheck: new Date().toISOString() },
          { serviceName: 'asset-lifecycle', napiStatus: 'HEALTHY', businessLogicStatus: 'HEALTHY', circuitBreakerStatus: 'CLOSED', lastHealthCheck: new Date().toISOString() },
          { serviceName: 'document', napiStatus: 'HEALTHY', businessLogicStatus: 'HEALTHY', circuitBreakerStatus: 'CLOSED', lastHealthCheck: new Date().toISOString() },
          { serviceName: 'vendor-broker', napiStatus: 'UNHEALTHY', businessLogicStatus: 'HEALTHY', circuitBreakerStatus: 'CLOSED', lastHealthCheck: new Date().toISOString() },
          { serviceName: 'financial-consolidation', napiStatus: 'UNHEALTHY', businessLogicStatus: 'UNHEALTHY', circuitBreakerStatus: 'OPEN', lastHealthCheck: new Date().toISOString() },
        ]
      };

      setMetrics(mockMetrics);
      setHealthStatus(mockHealthStatus);
    } catch (err) {
      setError('Failed to fetch dashboard data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getHealthColor = (status: string) => {
    switch (status) {
      case 'HEALTHY': return 'text-green-600 bg-green-100';
      case 'UNHEALTHY': return 'text-red-600 bg-red-100';
      case 'DEGRADED': return 'text-yellow-600 bg-yellow-100';
      case 'UNKNOWN': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getCircuitBreakerColor = (status: string) => {
    switch (status) {
      case 'CLOSED': return 'text-green-600 bg-green-100';
      case 'OPEN': return 'text-red-600 bg-red-100';
      case 'HALF_OPEN': return 'text-yellow-600 bg-yellow-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading Business Logic Integration Dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 text-xl mb-4">⚠️ Error</div>
          <p className="text-gray-600">{error}</p>
          <button 
            onClick={fetchData}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Business Logic Integration Dashboard
          </h1>
          <p className="text-gray-600">
            Production monitoring for NAPI-RS services and TypeScript business logic integration
          </p>
        </div>

        {/* Overall Health Status */}
        {healthStatus && (
          <div className="mb-8">
            <div className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-medium ${getHealthColor(healthStatus.overallHealth)}`}>
              Overall System Health: {healthStatus.overallHealth}
            </div>
          </div>
        )}

        {/* Key Metrics Cards */}
        {metrics && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Total Requests</h3>
              <p className="text-3xl font-bold text-gray-900">{metrics.totalRequests.toLocaleString()}</p>
              <p className="text-sm text-gray-600 mt-1">All-time requests</p>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Success Rate</h3>
              <p className="text-3xl font-bold text-green-600">
                {((metrics.successfulRequests / metrics.totalRequests) * 100).toFixed(1)}%
              </p>
              <p className="text-sm text-gray-600 mt-1">Success rate</p>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Avg Response Time</h3>
              <p className="text-3xl font-bold text-blue-600">{metrics.averageResponseTime}ms</p>
              <p className="text-sm text-gray-600 mt-1">Average response</p>
            </div>
            
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-medium text-gray-500 mb-2">NAPI Success Rate</h3>
              <p className="text-3xl font-bold text-purple-600">{metrics.napiSuccessRate.toFixed(1)}%</p>
              <p className="text-sm text-gray-600 mt-1">NAPI performance</p>
            </div>
          </div>
        )}

        {/* Service Health Status Table */}
        {healthStatus && (
          <div className="bg-white rounded-lg shadow mb-8">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Service Health Status</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Service Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      NAPI Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Business Logic
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Circuit Breaker
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Last Check
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {healthStatus.serviceStatuses.map((service) => (
                    <tr key={service.serviceName}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {service.serviceName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getHealthColor(service.napiStatus)}`}>
                          {service.napiStatus}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getHealthColor(service.businessLogicStatus)}`}>
                          {service.businessLogicStatus}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getCircuitBreakerColor(service.circuitBreakerStatus)}`}>
                          {service.circuitBreakerStatus}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(service.lastHealthCheck).toLocaleTimeString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Detailed Service Metrics */}
        {metrics && (
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Service Performance Metrics</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Service Name
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Call Count
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Success Rate
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Avg Response Time
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Health Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {metrics.detailedMetrics.map((service) => (
                    <tr key={service.serviceName}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {service.serviceName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {service.callCount.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <span className={`font-semibold ${service.successRate >= 95 ? 'text-green-600' : service.successRate >= 90 ? 'text-yellow-600' : 'text-red-600'}`}>
                          {service.successRate.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {service.avgResponseTime}ms
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${service.isHealthy ? 'text-green-600 bg-green-100' : 'text-red-600 bg-red-100'}`}>
                          {service.isHealthy ? 'HEALTHY' : 'UNHEALTHY'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}