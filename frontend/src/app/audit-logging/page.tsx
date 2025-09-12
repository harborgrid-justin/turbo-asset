'use client';

import { useState, useEffect } from 'react';

// Enhanced audit trail interface for enterprise compliance
interface AuditLogEntry {
  id: string;
  timestamp: Date;
  userId: string;
  userName: string;
  userEmail: string;
  organizationId: string;
  entityType: string;
  entityId: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'VIEW' | 'EXPORT' | 'IMPORT' | 'LOGIN' | 'LOGOUT';
  description: string;
  oldValues?: Record<string, any>;
  newValues?: Record<string, any>;
  ipAddress: string;
  userAgent: string;
  sessionId: string;
  module: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  riskLevel: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH';
  complianceCategory: string[];
  metadata?: Record<string, any>;
}

interface AuditFilters {
  dateRange: {
    start: string;
    end: string;
  };
  userId?: string;
  entityType?: string;
  action?: string;
  module?: string;
  severity?: string;
  riskLevel?: string;
  complianceCategory?: string;
  searchTerm?: string;
}

export default function AuditLoggingPage() {
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<AuditLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<AuditFilters>({
    dateRange: {
      start: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      end: new Date().toISOString().split('T')[0],
    },
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedEntry, setSelectedEntry] = useState<AuditLogEntry | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const itemsPerPage = 50;

  // Mock data for demonstration - in production, this would come from your audit service
  const generateMockAuditLogs = (): AuditLogEntry[] => {
    const users = [
      { id: '1', name: 'John Smith', email: 'john.smith@company.com' },
      { id: '2', name: 'Sarah Johnson', email: 'sarah.johnson@company.com' },
      { id: '3', name: 'Mike Davis', email: 'mike.davis@company.com' },
      { id: '4', name: 'Lisa Wilson', email: 'lisa.wilson@company.com' },
    ];

    const entityTypes = ['Asset', 'Work Order', 'User', 'Space', 'Lease', 'Vendor', 'Document'];
    const actions = ['CREATE', 'UPDATE', 'DELETE', 'VIEW', 'EXPORT', 'IMPORT'] as const;
    const modules = ['Asset Management', 'Work Order System', 'Space Management', 'User Management', 'Document Management', 'Financial Management'];
    const severities = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const;
    const riskLevels = ['NONE', 'LOW', 'MEDIUM', 'HIGH'] as const;
    const complianceCategories = ['SOX', 'GDPR', 'HIPAA', 'SOC2', 'ISO27001', 'Financial', 'Data Protection'];

    const logs: AuditLogEntry[] = [];

    for (let i = 0; i < 500; i++) {
      const user = users[Math.floor(Math.random() * users.length)];
      const entityType = entityTypes[Math.floor(Math.random() * entityTypes.length)];
      const action = actions[Math.floor(Math.random() * actions.length)];
      const moduleType = modules[Math.floor(Math.random() * modules.length)];
      const severity = severities[Math.floor(Math.random() * severities.length)];
      const riskLevel = riskLevels[Math.floor(Math.random() * riskLevels.length)];
      
      logs.push({
        id: `audit_${i + 1}`,
        timestamp: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
        userId: user.id,
        userName: user.name,
        userEmail: user.email,
        organizationId: 'org_1',
        entityType,
        entityId: `${entityType.toLowerCase()}_${Math.floor(Math.random() * 1000)}`,
        action,
        description: `${action} ${entityType} - ${Math.random() > 0.5 ? 'Successful' : 'Failed'}`,
        ipAddress: `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        sessionId: `session_${Math.random().toString(36).substr(2, 9)}`,
        module: moduleType,
        severity,
        riskLevel,
        complianceCategory: [complianceCategories[Math.floor(Math.random() * complianceCategories.length)]],
        oldValues: action === 'UPDATE' ? { status: 'Active', lastModified: new Date(Date.now() - 3600000).toISOString() } : undefined,
        newValues: action === 'UPDATE' ? { status: 'Inactive', lastModified: new Date().toISOString() } : undefined,
        metadata: {
          browserVersion: 'Chrome 119.0.0.0',
          platform: 'Windows',
          referrer: 'https://turbo-asset.internal',
        },
      });
    }

    return logs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  };

  useEffect(() => {
    const mockLogs = generateMockAuditLogs();
    setAuditLogs(mockLogs);
    setLoading(false);
  }, []);

  useEffect(() => {
    let filtered = auditLogs;

    // Apply filters
    if (filters.dateRange.start && filters.dateRange.end) {
      const startDate = new Date(filters.dateRange.start);
      const endDate = new Date(filters.dateRange.end);
      filtered = filtered.filter(log => {
        const logDate = new Date(log.timestamp);
        return logDate >= startDate && logDate <= endDate;
      });
    }

    if (filters.userId) {
      filtered = filtered.filter(log => log.userId === filters.userId);
    }

    if (filters.entityType) {
      filtered = filtered.filter(log => log.entityType === filters.entityType);
    }

    if (filters.action) {
      filtered = filtered.filter(log => log.action === filters.action);
    }

    if (filters.module) {
      filtered = filtered.filter(log => log.module === filters.module);
    }

    if (filters.severity) {
      filtered = filtered.filter(log => log.severity === filters.severity);
    }

    if (filters.riskLevel) {
      filtered = filtered.filter(log => log.riskLevel === filters.riskLevel);
    }

    if (filters.searchTerm) {
      const term = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(log => 
        log.description.toLowerCase().includes(term) ||
        log.userName.toLowerCase().includes(term) ||
        log.entityType.toLowerCase().includes(term) ||
        log.entityId.toLowerCase().includes(term)
      );
    }

    setFilteredLogs(filtered);
    setCurrentPage(1);
  }, [auditLogs, filters]);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'CRITICAL': return 'text-red-600 bg-red-50';
      case 'HIGH': return 'text-orange-600 bg-orange-50';
      case 'MEDIUM': return 'text-yellow-600 bg-yellow-50';
      case 'LOW': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'DELETE': return 'text-red-600 bg-red-50';
      case 'UPDATE': return 'text-blue-600 bg-blue-50';
      case 'CREATE': return 'text-green-600 bg-green-50';
      case 'VIEW': return 'text-gray-600 bg-gray-50';
      case 'EXPORT': return 'text-purple-600 bg-purple-50';
      case 'IMPORT': return 'text-indigo-600 bg-indigo-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const exportAuditLogs = () => {
    const csv = [
      ['Timestamp', 'User', 'Action', 'Entity Type', 'Entity ID', 'Description', 'IP Address', 'Severity', 'Risk Level'].join(','),
      ...filteredLogs.map(log => [
        log.timestamp.toISOString(),
        log.userName,
        log.action,
        log.entityType,
        log.entityId,
        `"${log.description}"`,
        log.ipAddress,
        log.severity,
        log.riskLevel
      ].join(','))
    ].join('\\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit_log_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const paginatedLogs = filteredLogs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage);

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading audit logs...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">Enterprise Audit Trail</h1>
        <p className="text-gray-600">Comprehensive audit logging for compliance and security monitoring</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h2 className="text-lg font-semibold mb-4">Filter Audit Logs</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
            <input
              type="date"
              value={filters.dateRange.start}
              onChange={(e) => setFilters({ ...filters, dateRange: { ...filters.dateRange, start: e.target.value } })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
            <input
              type="date"
              value={filters.dateRange.end}
              onChange={(e) => setFilters({ ...filters, dateRange: { ...filters.dateRange, end: e.target.value } })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Action</label>
            <select
              value={filters.action || ''}
              onChange={(e) => setFilters({ ...filters, action: e.target.value || undefined })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Actions</option>
              <option value="CREATE">Create</option>
              <option value="UPDATE">Update</option>
              <option value="DELETE">Delete</option>
              <option value="VIEW">View</option>
              <option value="EXPORT">Export</option>
              <option value="IMPORT">Import</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Severity</label>
            <select
              value={filters.severity || ''}
              onChange={(e) => setFilters({ ...filters, severity: e.target.value || undefined })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Severities</option>
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="CRITICAL">Critical</option>
            </select>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
            <input
              type="text"
              placeholder="Search by description, user, entity..."
              value={filters.searchTerm || ''}
              onChange={(e) => setFilters({ ...filters, searchTerm: e.target.value || undefined })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={exportAuditLogs}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
            >
              Export CSV
            </button>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 rounded-full">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-2xl font-bold text-gray-800">{filteredLogs.length}</p>
              <p className="text-gray-600">Total Events</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <div className="p-3 bg-red-100 rounded-full">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-2xl font-bold text-gray-800">
                {filteredLogs.filter(log => log.severity === 'CRITICAL' || log.severity === 'HIGH').length}
              </p>
              <p className="text-gray-600">High Risk Events</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 rounded-full">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-2xl font-bold text-gray-800">
                {new Set(filteredLogs.map(log => log.userId)).size}
              </p>
              <p className="text-gray-600">Active Users</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center">
            <div className="p-3 bg-purple-100 rounded-full">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-2xl font-bold text-gray-800">
                {new Set(filteredLogs.map(log => log.module)).size}
              </p>
              <p className="text-gray-600">Active Modules</p>
            </div>
          </div>
        </div>
      </div>

      {/* Rest of the component continues with audit log table, pagination, and details modal... */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4">Recent Audit Events</h2>
        <div className="space-y-4">
          {paginatedLogs.slice(0, 10).map((log) => (
            <div key={log.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
              <div className="flex items-center space-x-4">
                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getActionColor(log.action)}`}>
                  {log.action}
                </span>
                <div>
                  <p className="font-medium text-gray-900">{log.description}</p>
                  <p className="text-sm text-gray-500">
                    {log.userName} • {log.timestamp.toLocaleString()}
                  </p>
                </div>
              </div>
              <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getSeverityColor(log.severity)}`}>
                {log.severity}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}