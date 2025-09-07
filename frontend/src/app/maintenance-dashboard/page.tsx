'use client';

import React, { useState, useEffect } from 'react';

interface MaintenanceMetrics {
  totalWorkOrders: number;
  completedWorkOrders: number;
  pendingWorkOrders: number;
  overdueWorkOrders: number;
  avgCompletionTime: number;
  totalMaintenanceCost: number;
  preventiveMaintenanceRate: number;
  equipmentAvailability: number;
  workOrdersByPriority: Record<string, number>;
  workOrdersByStatus: Record<string, number>;
  workOrdersByType: Record<string, number>;
  monthlyMaintenanceCost: number[];
  monthlyWorkOrders: number[];
}

interface WorkOrder {
  id: string;
  workOrderNumber: string;
  title: string;
  asset: string;
  assetTag: string;
  priority: string;
  status: string;
  type: string;
  assignedTo: string;
  scheduledDate: string;
  dueDate: string;
  estimatedHours: number;
  actualHours?: number;
  cost?: number;
  location: string;
}

interface TechnicianPerformance {
  id: string;
  name: string;
  activeWorkOrders: number;
  completedThisMonth: number;
  avgCompletionTime: number;
  skillRating: number;
  availability: string;
}

const MaintenanceDashboardPage = () => {
  const [metrics, setMetrics] = useState<MaintenanceMetrics>({
    totalWorkOrders: 2847,
    completedWorkOrders: 2456,
    pendingWorkOrders: 234,
    overdueWorkOrders: 157,
    avgCompletionTime: 4.2,
    totalMaintenanceCost: 487650,
    preventiveMaintenanceRate: 68.5,
    equipmentAvailability: 94.8,
    workOrdersByPriority: {
      'Critical': 45,
      'High': 89,
      'Medium': 156,
      'Low': 234
    },
    workOrdersByStatus: {
      'Open': 234,
      'In Progress': 89,
      'Completed': 2456,
      'On Hold': 34,
      'Cancelled': 34
    },
    workOrdersByType: {
      'Preventive': 1689,
      'Corrective': 987,
      'Emergency': 123,
      'Inspection': 48
    },
    monthlyMaintenanceCost: [42000, 38000, 45000, 52000, 48000, 41000, 39000, 44000, 47000, 43000, 40000, 46000],
    monthlyWorkOrders: [245, 231, 267, 289, 276, 234, 245, 267, 289, 256, 234, 267]
  });

  const [recentWorkOrders, setRecentWorkOrders] = useState<WorkOrder[]>([]);
  const [technicians, setTechnicians] = useState<TechnicianPerformance[]>([]);
  const [selectedTimeframe, setSelectedTimeframe] = useState('30d');
  const [loading, setLoading] = useState(false);

  // Mock data
  useEffect(() => {
    setLoading(true);
    setTimeout(() => {
      setRecentWorkOrders([
        {
          id: '1',
          workOrderNumber: 'WO-2025-0001',
          title: 'HVAC Filter Replacement',
          asset: 'Central Air Unit A',
          assetTag: 'HVAC-001',
          priority: 'Medium',
          status: 'In Progress',
          type: 'Preventive',
          assignedTo: 'Mike Johnson',
          scheduledDate: '2025-01-16',
          dueDate: '2025-01-18',
          estimatedHours: 2,
          actualHours: 1.5,
          cost: 150,
          location: 'Building A - Mech Room'
        },
        {
          id: '2',
          workOrderNumber: 'WO-2025-0002',
          title: 'Emergency Generator Service',
          asset: 'Emergency Generator B',
          assetTag: 'GEN-002',
          priority: 'Critical',
          status: 'Open',
          type: 'Emergency',
          assignedTo: 'Sarah Davis',
          scheduledDate: '2025-01-16',
          dueDate: '2025-01-16',
          estimatedHours: 4,
          location: 'Building B - Basement'
        },
        {
          id: '3',
          workOrderNumber: 'WO-2025-0003',
          title: 'Elevator Safety Inspection',
          asset: 'Passenger Elevator 1',
          assetTag: 'ELV-001',
          priority: 'High',
          status: 'Completed',
          type: 'Inspection',
          assignedTo: 'John Smith',
          scheduledDate: '2025-01-15',
          dueDate: '2025-01-15',
          estimatedHours: 3,
          actualHours: 2.5,
          cost: 275,
          location: 'Building A - Lobby'
        }
      ]);

      setTechnicians([
        {
          id: '1',
          name: 'Mike Johnson',
          activeWorkOrders: 5,
          completedThisMonth: 23,
          avgCompletionTime: 3.8,
          skillRating: 4.8,
          availability: 'Available'
        },
        {
          id: '2',
          name: 'Sarah Davis',
          activeWorkOrders: 3,
          completedThisMonth: 19,
          avgCompletionTime: 4.2,
          skillRating: 4.6,
          availability: 'Busy'
        },
        {
          id: '3',
          name: 'John Smith',
          activeWorkOrders: 2,
          completedThisMonth: 27,
          avgCompletionTime: 3.5,
          skillRating: 4.9,
          availability: 'Available'
        }
      ]);

      setLoading(false);
    }, 1000);
  }, [selectedTimeframe]);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat('en-US').format(value);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric'
    });
  };

  const getPriorityColor = (priority: string) => {
    const colors: Record<string, string> = {
      'Critical': 'bg-red-100 text-red-800',
      'High': 'bg-orange-100 text-orange-800',
      'Medium': 'bg-yellow-100 text-yellow-800',
      'Low': 'bg-green-100 text-green-800'
    };
    return colors[priority] || 'bg-gray-100 text-gray-800';
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'Open': 'bg-blue-100 text-blue-800',
      'In Progress': 'bg-yellow-100 text-yellow-800',
      'Completed': 'bg-green-100 text-green-800',
      'On Hold': 'bg-gray-100 text-gray-800',
      'Cancelled': 'bg-red-100 text-red-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      'Preventive': 'bg-blue-100 text-blue-800',
      'Corrective': 'bg-orange-100 text-orange-800',
      'Emergency': 'bg-red-100 text-red-800',
      'Inspection': 'bg-purple-100 text-purple-800'
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  const getAvailabilityColor = (availability: string) => {
    const colors: Record<string, string> = {
      'Available': 'bg-green-100 text-green-800',
      'Busy': 'bg-yellow-100 text-yellow-800',
      'Unavailable': 'bg-red-100 text-red-800'
    };
    return colors[availability] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Maintenance Dashboard</h1>
              <p className="text-gray-600 mt-2">Monitor and manage all maintenance operations</p>
            </div>
            <div className="flex space-x-4">
              <select
                value={selectedTimeframe}
                onChange={(e) => setSelectedTimeframe(e.target.value)}
                className="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="90d">Last 90 days</option>
                <option value="1y">Last year</option>
              </select>
              <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-semibold">
                Create Work Order
              </button>
            </div>
          </div>
        </div>

        {/* Key Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Work Orders</p>
                <p className="text-3xl font-bold text-gray-900">{formatNumber(metrics.totalWorkOrders)}</p>
              </div>
              <div className="bg-blue-100 p-3 rounded-full">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
            </div>
            <div className="mt-4">
              <span className="text-green-600 text-sm font-medium">+8.2%</span>
              <span className="text-gray-600 text-sm ml-2">vs last month</span>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Completion Rate</p>
                <p className="text-3xl font-bold text-gray-900">
                  {((metrics.completedWorkOrders / metrics.totalWorkOrders) * 100).toFixed(1)}%
                </p>
              </div>
              <div className="bg-green-100 p-3 rounded-full">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="mt-4">
              <span className="text-green-600 text-sm font-medium">+2.1%</span>
              <span className="text-gray-600 text-sm ml-2">vs last month</span>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg Completion Time</p>
                <p className="text-3xl font-bold text-gray-900">{metrics.avgCompletionTime}h</p>
              </div>
              <div className="bg-purple-100 p-3 rounded-full">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="mt-4">
              <span className="text-red-600 text-sm font-medium">-0.3h</span>
              <span className="text-gray-600 text-sm ml-2">vs last month</span>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Cost</p>
                <p className="text-3xl font-bold text-gray-900">{formatCurrency(metrics.totalMaintenanceCost)}</p>
              </div>
              <div className="bg-orange-100 p-3 rounded-full">
                <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                </svg>
              </div>
            </div>
            <div className="mt-4">
              <span className="text-green-600 text-sm font-medium">-5.7%</span>
              <span className="text-gray-600 text-sm ml-2">vs last month</span>
            </div>
          </div>
        </div>

        {/* Charts and Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Work Orders by Priority */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Work Orders by Priority</h3>
            <div className="space-y-4">
              {Object.entries(metrics.workOrdersByPriority).map(([priority, count]) => {
                const percentage = (count / metrics.totalWorkOrders) * 100;
                return (
                  <div key={priority} className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-medium text-gray-700">{priority}</span>
                        <span className="text-sm text-gray-600">{formatNumber(count)} ({percentage.toFixed(1)}%)</span>
                      </div>
                      <div className="bg-gray-200 rounded-full h-2">
                        <div 
                          className={`h-2 rounded-full ${
                            priority === 'Critical' ? 'bg-red-500' :
                            priority === 'High' ? 'bg-orange-500' :
                            priority === 'Medium' ? 'bg-yellow-500' : 'bg-green-500'
                          }`}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Work Orders by Status */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Work Orders by Status</h3>
            <div className="space-y-3">
              {Object.entries(metrics.workOrdersByStatus).map(([status, count]) => (
                <div key={status} className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700">{status}</span>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(status)}`}>
                    {formatNumber(count)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Work Orders by Type and Equipment Availability */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Work Orders by Type */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Work Orders by Type</h3>
            <div className="space-y-3">
              {Object.entries(metrics.workOrdersByType).map(([type, count]) => (
                <div key={type} className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700">{type}</span>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getTypeColor(type)}`}>
                    {formatNumber(count)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Key Performance Indicators */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Key Performance Indicators</h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700">Equipment Availability</span>
                  <span className="text-sm font-bold text-green-600">{metrics.equipmentAvailability}%</span>
                </div>
                <div className="bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-500 h-2 rounded-full" 
                    style={{ width: `${metrics.equipmentAvailability}%` }}
                  />
                </div>
              </div>
              
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700">Preventive Maintenance Rate</span>
                  <span className="text-sm font-bold text-blue-600">{metrics.preventiveMaintenanceRate}%</span>
                </div>
                <div className="bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full" 
                    style={{ width: `${metrics.preventiveMaintenanceRate}%` }}
                  />
                </div>
              </div>

              <div className="pt-2">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center">
                    <p className="text-2xl font-bold text-red-600">{formatNumber(metrics.overdueWorkOrders)}</p>
                    <p className="text-sm text-gray-600">Overdue Work Orders</p>
                  </div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-yellow-600">{formatNumber(metrics.pendingWorkOrders)}</p>
                    <p className="text-sm text-gray-600">Pending Work Orders</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Work Orders and Technician Performance */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Recent Work Orders */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">Recent Work Orders</h3>
                <button className="text-blue-600 hover:text-blue-800 text-sm font-medium">
                  View All
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Work Order
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Asset
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Priority
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Assigned To
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Due Date
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {recentWorkOrders.map((wo) => (
                    <tr key={wo.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <p className="text-sm font-medium text-blue-600">{wo.workOrderNumber}</p>
                          <p className="text-sm text-gray-500">{wo.title}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <p className="text-sm text-gray-900">{wo.asset}</p>
                          <p className="text-sm text-gray-500">{wo.assetTag}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(wo.priority)}`}>
                          {wo.priority}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(wo.status)}`}>
                          {wo.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {wo.assignedTo}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(wo.dueDate)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Technician Performance */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Technician Performance</h3>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {technicians.map((tech) => (
                  <div key={tech.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="text-sm font-medium text-gray-900">{tech.name}</h4>
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getAvailabilityColor(tech.availability)}`}>
                        {tech.availability}
                      </span>
                    </div>
                    <div className="space-y-2 text-sm text-gray-600">
                      <div className="flex justify-between">
                        <span>Active WOs:</span>
                        <span className="font-medium">{tech.activeWorkOrders}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Completed (Month):</span>
                        <span className="font-medium">{tech.completedThisMonth}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Avg Time:</span>
                        <span className="font-medium">{tech.avgCompletionTime}h</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Skill Rating:</span>
                        <div className="flex items-center">
                          <span className="font-medium mr-1">{tech.skillRating}</span>
                          <div className="flex">
                            {[...Array(5)].map((_, i) => (
                              <svg
                                key={i}
                                className={`w-3 h-3 ${i < Math.floor(tech.skillRating) ? 'text-yellow-400' : 'text-gray-300'}`}
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                              </svg>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MaintenanceDashboardPage;