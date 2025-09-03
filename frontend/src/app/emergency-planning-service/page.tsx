'use client';
import React, { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';

interface EmergencyPlan {
  id: string;
  propertyId: string;
  propertyName: string;
  planType: 'Fire' | 'Earthquake' | 'Medical' | 'Security' | 'Flood' | 'Power Outage';
  status: 'Active' | 'Under Review' | 'Outdated' | 'Draft';
  lastUpdated: string;
  reviewDate: string;
  approvedBy: string;
  totalProcedures: number;
  totalContacts: number;
  evacuationRoutes: number;
  drillCompliance: number;
}

interface EmergencyContact {
  id: string;
  name: string;
  role: string;
  department: string;
  phone: string;
  email: string;
  emergencyTypes: string[];
  priority: number;
  availability: '24/7' | 'Business Hours' | 'On Call';
}

interface EvacuationRoute {
  id: string;
  planId: string;
  name: string;
  fromZone: string;
  toZone: string;
  capacity: number;
  estimatedTime: number;
  accessibility: boolean;
  instructions: string;
  alternateRoute?: string;
}

interface DrillRecord {
  id: string;
  planId: string;
  planType: string;
  date: string;
  duration: number;
  participationRate: number;
  issues: string[];
  overallScore: number;
  conductedBy: string;
}

const EmergencyPlanningServicePage = () => {
  const [plans, setPlans] = useState<EmergencyPlan[]>([]);
  const [contacts, setContacts] = useState<EmergencyContact[]>([]);
  const [routes, setRoutes] = useState<EvacuationRoute[]>([]);
  const [drills, setDrills] = useState<DrillRecord[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [activeTab, setActiveTab] = useState<'plans' | 'contacts' | 'routes' | 'drills'>('plans');
  const [selectedPlan, setSelectedPlan] = useState<EmergencyPlan | null>(null);
  const [showContactForm, setShowContactForm] = useState(false);
  const [showRouteForm, setShowRouteForm] = useState(false);
  
  const [newContact, setNewContact] = useState({
    name: '',
    role: '',
    department: '',
    phone: '',
    email: '',
    emergencyTypes: [] as string[],
    priority: 1,
    availability: 'Business Hours' as EmergencyContact['availability']
  });

  const [newRoute, setNewRoute] = useState({
    planId: '',
    name: '',
    fromZone: '',
    toZone: '',
    capacity: 0,
    estimatedTime: 0,
    accessibility: false,
    instructions: '',
    alternateRoute: ''
  });

  const emergencyTypes = ['Fire', 'Earthquake', 'Medical', 'Security', 'Flood', 'Power Outage'];

  useEffect(() => {
    fetchEmergencyData();
  }, []);

  const fetchEmergencyData = async () => {
    try {
      setLoading(true);
      
      // Try to fetch from backend, fallback to mock data
      try {
        const response = await apiClient.get('/emergency-planning?organizationId=demo');
        const emergencyData = response.data.data;
        
        // Use backend data if available
        setPlans(emergencyData.plans || getMockPlans());
        setContacts(emergencyData.contacts || getMockContacts());
        setRoutes(emergencyData.routes || getMockRoutes());
        setDrills(emergencyData.drills || getMockDrills());
      } catch (apiError) {
        console.log('Backend not available, using mock data');
        
        // Use mock data
        setPlans(getMockPlans());
        setContacts(getMockContacts());
        setRoutes(getMockRoutes());
        setDrills(getMockDrills());
      }
      
    } catch (error) {
      console.error('Failed to fetch emergency data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getMockPlans = (): EmergencyPlan[] => [
    {
      id: '1',
      propertyId: 'prop-1',
      propertyName: 'Headquarters Tower',
      planType: 'Fire',
      status: 'Active',
      lastUpdated: '2024-12-15',
      reviewDate: '2025-06-15',
      approvedBy: 'Safety Director',
      totalProcedures: 12,
      totalContacts: 8,
      evacuationRoutes: 6,
      drillCompliance: 95.5
    },
    {
      id: '2',
      propertyId: 'prop-1',
      propertyName: 'Headquarters Tower',
      planType: 'Earthquake',
      status: 'Active',
      lastUpdated: '2024-11-20',
      reviewDate: '2025-05-20',
      approvedBy: 'Emergency Coordinator',
      totalProcedures: 8,
      totalContacts: 6,
      evacuationRoutes: 4,
      drillCompliance: 88.2
    },
    {
      id: '3',
      propertyId: 'prop-2',
      propertyName: 'Manufacturing Plant A',
      planType: 'Fire',
      status: 'Under Review',
      lastUpdated: '2024-10-10',
      reviewDate: '2025-01-31',
      approvedBy: 'Plant Manager',
      totalProcedures: 15,
      totalContacts: 10,
      evacuationRoutes: 8,
      drillCompliance: 92.1
    },
    {
      id: '4',
      propertyId: 'prop-3',
      propertyName: 'Distribution Center',
      planType: 'Security',
      status: 'Outdated',
      lastUpdated: '2024-06-01',
      reviewDate: '2024-12-01',
      approvedBy: 'Security Chief',
      totalProcedures: 6,
      totalContacts: 4,
      evacuationRoutes: 3,
      drillCompliance: 76.3
    }
  ];

  const getMockContacts = (): EmergencyContact[] => [
    {
      id: '1',
      name: 'John Martinez',
      role: 'Emergency Coordinator',
      department: 'Safety',
      phone: '+1 (555) 0100',
      email: 'j.martinez@company.com',
      emergencyTypes: ['Fire', 'Earthquake', 'Medical'],
      priority: 1,
      availability: '24/7'
    },
    {
      id: '2',
      name: 'Sarah Chen',
      role: 'Fire Safety Officer',
      department: 'Safety',
      phone: '+1 (555) 0101',
      email: 's.chen@company.com',
      emergencyTypes: ['Fire'],
      priority: 2,
      availability: 'Business Hours'
    },
    {
      id: '3',
      name: 'Michael Brown',
      role: 'Security Chief',
      department: 'Security',
      phone: '+1 (555) 0102',
      email: 'm.brown@company.com',
      emergencyTypes: ['Security', 'Medical'],
      priority: 1,
      availability: '24/7'
    },
    {
      id: '4',
      name: 'Dr. Emily Watson',
      role: 'Medical Officer',
      department: 'Health Services',
      phone: '+1 (555) 0103',
      email: 'e.watson@company.com',
      emergencyTypes: ['Medical'],
      priority: 1,
      availability: 'On Call'
    }
  ];

  const getMockRoutes = (): EvacuationRoute[] => [
    {
      id: '1',
      planId: '1',
      name: 'Main Stairwell Route A',
      fromZone: 'Floors 1-10',
      toZone: 'Assembly Point A',
      capacity: 200,
      estimatedTime: 8,
      accessibility: true,
      instructions: 'Use main stairwell, proceed to parking lot assembly point',
      alternateRoute: 'Emergency Stairwell Route B'
    },
    {
      id: '2',
      planId: '1',
      name: 'Emergency Stairwell Route B',
      fromZone: 'Floors 11-20',
      toZone: 'Assembly Point B',
      capacity: 150,
      estimatedTime: 12,
      accessibility: false,
      instructions: 'Use emergency stairwell, exit through rear entrance',
      alternateRoute: 'Elevator Route (Emergency Only)'
    },
    {
      id: '3',
      planId: '2',
      name: 'Drop Cover Hold Route',
      fromZone: 'All Floors',
      toZone: 'Secure Areas',
      capacity: 500,
      estimatedTime: 2,
      accessibility: true,
      instructions: 'Drop to floor, take cover under desk, hold position until all-clear',
    }
  ];

  const getMockDrills = (): DrillRecord[] => [
    {
      id: '1',
      planId: '1',
      planType: 'Fire',
      date: '2024-12-10',
      duration: 7.5,
      participationRate: 95.5,
      issues: ['Slow response in accounting department', 'Emergency lighting failure on 3rd floor'],
      overallScore: 87,
      conductedBy: 'John Martinez'
    },
    {
      id: '2',
      planId: '2',
      planType: 'Earthquake',
      date: '2024-11-15',
      duration: 3.2,
      participationRate: 88.2,
      issues: ['Some employees did not take proper cover'],
      overallScore: 82,
      conductedBy: 'Sarah Chen'
    },
    {
      id: '3',
      planId: '3',
      planType: 'Fire',
      date: '2024-10-20',
      duration: 12.3,
      participationRate: 92.1,
      issues: ['Equipment access blocked', 'Communication delay with fire department'],
      overallScore: 78,
      conductedBy: 'Plant Safety Team'
    }
  ];

  const handleContactInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setNewContact(prev => ({
      ...prev,
      [name]: name === 'priority' ? Number(value) : value
    }));
  };

  const handleEmergencyTypeToggle = (type: string) => {
    setNewContact(prev => ({
      ...prev,
      emergencyTypes: prev.emergencyTypes.includes(type)
        ? prev.emergencyTypes.filter(t => t !== type)
        : [...prev.emergencyTypes, type]
    }));
  };

  const handleContactSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const contact: EmergencyContact = {
      id: Date.now().toString(),
      ...newContact
    };
    setContacts(prev => [...prev, contact]);
    setNewContact({
      name: '',
      role: '',
      department: '',
      phone: '',
      email: '',
      emergencyTypes: [],
      priority: 1,
      availability: 'Business Hours'
    });
    setShowContactForm(false);
  };

  const handleRouteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const route: EvacuationRoute = {
      id: Date.now().toString(),
      ...newRoute
    };
    setRoutes(prev => [...prev, route]);
    setNewRoute({
      planId: '',
      name: '',
      fromZone: '',
      toZone: '',
      capacity: 0,
      estimatedTime: 0,
      accessibility: false,
      instructions: '',
      alternateRoute: ''
    });
    setShowRouteForm(false);
  };

  const conductDrill = (planId: string, planType: string) => {
    const newDrill: DrillRecord = {
      id: Date.now().toString(),
      planId,
      planType,
      date: new Date().toISOString().split('T')[0],
      duration: Math.round((Math.random() * 10 + 5) * 10) / 10,
      participationRate: Math.round((Math.random() * 15 + 80) * 10) / 10,
      issues: ['Drill in progress - results pending'],
      overallScore: 0,
      conductedBy: 'Current User'
    };
    setDrills(prev => [newDrill, ...prev]);
    alert('Emergency drill initiated. Results will be updated upon completion.');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active': return 'bg-green-100 text-green-800';
      case 'Under Review': return 'bg-yellow-100 text-yellow-800';
      case 'Outdated': return 'bg-red-100 text-red-800';
      case 'Draft': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPlanTypeColor = (type: string) => {
    switch (type) {
      case 'Fire': return 'bg-red-100 text-red-800';
      case 'Earthquake': return 'bg-orange-100 text-orange-800';
      case 'Medical': return 'bg-blue-100 text-blue-800';
      case 'Security': return 'bg-purple-100 text-purple-800';
      case 'Flood': return 'bg-cyan-100 text-cyan-800';
      case 'Power Outage': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPlanTypeIcon = (type: string) => {
    switch (type) {
      case 'Fire': return '🔥';
      case 'Earthquake': return '🌍';
      case 'Medical': return '⚕️';
      case 'Security': return '🔒';
      case 'Flood': return '💧';
      case 'Power Outage': return '⚡';
      default: return '📋';
    }
  };

  const getComplianceColor = (compliance: number) => {
    if (compliance >= 90) return 'text-green-600';
    if (compliance >= 75) return 'text-yellow-600';
    return 'text-red-600';
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">Loading emergency planning data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Emergency Planning & Safety Management</h1>
        <button
          onClick={fetchEmergencyData}
          className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
        >
          Refresh Data
        </button>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-md">
          <h3 className="text-sm font-semibold text-gray-700">Emergency Plans</h3>
          <p className="text-2xl font-bold text-red-600">{plans.length}</p>
          <p className="text-xs text-gray-500">{plans.filter(p => p.status === 'Active').length} active</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-md">
          <h3 className="text-sm font-semibold text-gray-700">Emergency Contacts</h3>
          <p className="text-2xl font-bold text-blue-600">{contacts.length}</p>
          <p className="text-xs text-gray-500">{contacts.filter(c => c.availability === '24/7').length} available 24/7</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-md">
          <h3 className="text-sm font-semibold text-gray-700">Evacuation Routes</h3>
          <p className="text-2xl font-bold text-green-600">{routes.length}</p>
          <p className="text-xs text-gray-500">{routes.filter(r => r.accessibility).length} accessible</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-md">
          <h3 className="text-sm font-semibold text-gray-700">Avg Compliance</h3>
          <p className="text-2xl font-bold text-yellow-600">
            {Math.round(plans.reduce((sum, p) => sum + p.drillCompliance, 0) / plans.length)}%
          </p>
          <p className="text-xs text-gray-500">Drill participation</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-md">
          <h3 className="text-sm font-semibold text-gray-700">Recent Drills</h3>
          <p className="text-2xl font-bold text-purple-600">{drills.length}</p>
          <p className="text-xs text-gray-500">This quarter</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-lg shadow-md">
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab('plans')}
            className={`px-6 py-3 font-medium text-sm ${
              activeTab === 'plans'
                ? 'border-b-2 border-red-500 text-red-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Emergency Plans ({plans.length})
          </button>
          <button
            onClick={() => setActiveTab('contacts')}
            className={`px-6 py-3 font-medium text-sm ${
              activeTab === 'contacts'
                ? 'border-b-2 border-red-500 text-red-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Emergency Contacts ({contacts.length})
          </button>
          <button
            onClick={() => setActiveTab('routes')}
            className={`px-6 py-3 font-medium text-sm ${
              activeTab === 'routes'
                ? 'border-b-2 border-red-500 text-red-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Evacuation Routes ({routes.length})
          </button>
          <button
            onClick={() => setActiveTab('drills')}
            className={`px-6 py-3 font-medium text-sm ${
              activeTab === 'drills'
                ? 'border-b-2 border-red-500 text-red-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Drill Records ({drills.length})
          </button>
        </div>

        {/* Plans Tab */}
        {activeTab === 'plans' && (
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {plans.map((plan) => (
                <div key={plan.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-2">
                      <span className="text-2xl">{getPlanTypeIcon(plan.planType)}</span>
                      <h3 className="font-semibold text-lg">{plan.propertyName}</h3>
                    </div>
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(plan.status)}`}>
                      {plan.status}
                    </span>
                  </div>
                  
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Plan Type:</span>
                      <span className={`px-2 py-1 text-xs font-semibold rounded ${getPlanTypeColor(plan.planType)}`}>
                        {plan.planType}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Last Updated:</span>
                      <span className="text-sm font-medium">{plan.lastUpdated}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Next Review:</span>
                      <span className="text-sm font-medium">{plan.reviewDate}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Procedures:</span>
                      <span className="text-sm font-medium">{plan.totalProcedures}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">Drill Compliance:</span>
                      <span className={`text-sm font-medium ${getComplianceColor(plan.drillCompliance)}`}>
                        {plan.drillCompliance}%
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => setSelectedPlan(selectedPlan?.id === plan.id ? null : plan)}
                      className="flex-1 bg-blue-500 hover:bg-blue-700 text-white text-xs px-2 py-1 rounded"
                    >
                      {selectedPlan?.id === plan.id ? 'Hide' : 'View'}
                    </button>
                    <button
                      onClick={() => conductDrill(plan.id, plan.planType)}
                      className="flex-1 bg-red-500 hover:bg-red-700 text-white text-xs px-2 py-1 rounded"
                    >
                      Conduct Drill
                    </button>
                  </div>

                  {selectedPlan?.id === plan.id && (
                    <div className="mt-4 pt-4 border-t text-sm space-y-1">
                      <div><strong>Approved By:</strong> {plan.approvedBy}</div>
                      <div><strong>Emergency Contacts:</strong> {plan.totalContacts}</div>
                      <div><strong>Evacuation Routes:</strong> {plan.evacuationRoutes}</div>
                      <div><strong>Property ID:</strong> {plan.propertyId}</div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Contacts Tab */}
        {activeTab === 'contacts' && (
          <div className="p-6">
            <div className="mb-4">
              <button
                onClick={() => setShowContactForm(!showContactForm)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Add Emergency Contact
              </button>
            </div>

            {showContactForm && (
              <div className="mb-6 bg-gray-50 p-4 rounded-lg">
                <h3 className="text-lg font-medium mb-4">Add Emergency Contact</h3>
                <form onSubmit={handleContactSubmit}>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input
                      type="text"
                      name="name"
                      value={newContact.name}
                      onChange={handleContactInputChange}
                      placeholder="Full Name"
                      className="px-3 py-2 border border-gray-300 rounded-md"
                      required
                    />
                    <input
                      type="text"
                      name="role"
                      value={newContact.role}
                      onChange={handleContactInputChange}
                      placeholder="Role/Title"
                      className="px-3 py-2 border border-gray-300 rounded-md"
                      required
                    />
                    <input
                      type="text"
                      name="department"
                      value={newContact.department}
                      onChange={handleContactInputChange}
                      placeholder="Department"
                      className="px-3 py-2 border border-gray-300 rounded-md"
                    />
                    <input
                      type="tel"
                      name="phone"
                      value={newContact.phone}
                      onChange={handleContactInputChange}
                      placeholder="Phone Number"
                      className="px-3 py-2 border border-gray-300 rounded-md"
                      required
                    />
                    <input
                      type="email"
                      name="email"
                      value={newContact.email}
                      onChange={handleContactInputChange}
                      placeholder="Email Address"
                      className="px-3 py-2 border border-gray-300 rounded-md"
                      required
                    />
                    <select
                      name="availability"
                      value={newContact.availability}
                      onChange={handleContactInputChange}
                      className="px-3 py-2 border border-gray-300 rounded-md"
                    >
                      <option value="Business Hours">Business Hours</option>
                      <option value="24/7">24/7</option>
                      <option value="On Call">On Call</option>
                    </select>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Emergency Types</label>
                      <div className="flex flex-wrap gap-2">
                        {emergencyTypes.map(type => (
                          <label key={type} className="flex items-center">
                            <input
                              type="checkbox"
                              checked={newContact.emergencyTypes.includes(type)}
                              onChange={() => handleEmergencyTypeToggle(type)}
                              className="mr-1"
                            />
                            <span className="text-sm">{type}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded-md">
                      Add Contact
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowContactForm(false)}
                      className="px-4 py-2 bg-gray-400 text-white rounded-md"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Role</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Emergency Types</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Availability</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Priority</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {contacts.map((contact) => (
                    <tr key={contact.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{contact.name}</div>
                        <div className="text-sm text-gray-500">{contact.email}</div>
                        <div className="text-sm text-gray-500">{contact.phone}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{contact.role}</div>
                        <div className="text-sm text-gray-500">{contact.department}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {contact.emergencyTypes.map(type => (
                            <span key={type} className={`px-2 py-1 text-xs font-semibold rounded ${getPlanTypeColor(type)}`}>
                              {type}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          contact.availability === '24/7' ? 'bg-green-100 text-green-800' :
                          contact.availability === 'On Call' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {contact.availability}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        Priority {contact.priority}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Routes Tab */}
        {activeTab === 'routes' && (
          <div className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {routes.map((route) => (
                <div key={route.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-3">
                    <h3 className="font-semibold text-lg">{route.name}</h3>
                    {route.accessibility && (
                      <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                        ♿ Accessible
                      </span>
                    )}
                  </div>
                  
                  <div className="space-y-2 text-sm mb-4">
                    <div className="flex justify-between">
                      <span className="text-gray-600">From:</span>
                      <span className="font-medium">{route.fromZone}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">To:</span>
                      <span className="font-medium">{route.toZone}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Capacity:</span>
                      <span className="font-medium">{route.capacity} people</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Est. Time:</span>
                      <span className="font-medium">{route.estimatedTime} minutes</span>
                    </div>
                    {route.alternateRoute && (
                      <div>
                        <span className="text-gray-600">Alternate:</span>
                        <div className="text-sm font-medium mt-1">{route.alternateRoute}</div>
                      </div>
                    )}
                  </div>

                  <div className="mb-4">
                    <h4 className="font-medium text-sm mb-1">Instructions:</h4>
                    <p className="text-sm text-gray-700">{route.instructions}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Drills Tab */}
        {activeTab === 'drills' && (
          <div className="p-6">
            <div className="space-y-4">
              {drills.map((drill) => (
                <div key={drill.id} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-semibold text-lg">{drill.planType} Emergency Drill</h3>
                      <p className="text-sm text-gray-500">Conducted by {drill.conductedBy} on {drill.date}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-blue-600">{drill.overallScore > 0 ? drill.overallScore : 'TBD'}</div>
                      <div className="text-xs text-gray-500">Overall Score</div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div>
                      <span className="text-sm text-gray-600">Duration:</span>
                      <div className="font-medium">{drill.duration} minutes</div>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">Participation:</span>
                      <div className={`font-medium ${getComplianceColor(drill.participationRate)}`}>
                        {drill.participationRate}%
                      </div>
                    </div>
                    <div>
                      <span className="text-sm text-gray-600">Issues Found:</span>
                      <div className="font-medium">{drill.issues.length}</div>
                    </div>
                  </div>

                  {drill.issues.length > 0 && (
                    <div>
                      <h4 className="font-medium text-sm mb-2">Issues Identified:</h4>
                      <ul className="text-sm text-gray-700 space-y-1">
                        {drill.issues.map((issue, index) => (
                          <li key={index} className="flex items-start">
                            <span className="text-red-500 mr-2">•</span>
                            {issue}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmergencyPlanningServicePage;
