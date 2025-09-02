'use client';
import React, { useState, useEffect } from 'react';
import { apiClient } from '@/lib/api-client';

interface Space {
  id: string;
  name: string;
  type: string;
  capacity: number;
  area: number;
  building: string;
  floor: string;
  utilization: number;
  currentBookings: number;
  status: 'Available' | 'Occupied' | 'Maintenance';
}

interface Booking {
  id: string;
  spaceName: string;
  userName: string;
  startTime: string;
  endTime: string;
  purpose: string;
  status: 'Confirmed' | 'In Progress' | 'Completed';
}

interface UtilizationMetrics {
  overallUtilization: number;
  totalSpaces: number;
  occupiedSpaces: number;
  availableSpaces: number;
  maintenanceSpaces: number;
}

const SpaceUtilizationServicePage = () => {
  const [spaces, setSpaces] = useState<Space[]>([]);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [metrics, setMetrics] = useState<UtilizationMetrics>({
    overallUtilization: 0,
    totalSpaces: 0,
    occupiedSpaces: 0,
    availableSpaces: 0,
    maintenanceSpaces: 0
  });
  const [loading, setLoading] = useState(true);
  const [selectedSpace, setSelectedSpace] = useState<Space | null>(null);
  const [showBookingForm, setShowBookingForm] = useState(false);
  const [newBooking, setNewBooking] = useState({
    spaceName: '',
    userName: '',
    startTime: '',
    endTime: '',
    purpose: ''
  });

  useEffect(() => {
    fetchSpaceData();
  }, []);

  const fetchSpaceData = async () => {
    try {
      setLoading(true);
      
      // Try to fetch from backend, fallback to mock data
      try {
        const response = await apiClient.get('/portfolio/utilization/analytics?organizationId=demo');
        // Handle response data
      } catch (apiError) {
        console.log('Backend not available, using mock data');
      }
      
      // Use mock data for now
      const mockSpaces = getMockSpaces();
      const mockBookings = getMockBookings();
      
      setSpaces(mockSpaces);
      setBookings(mockBookings);
      
      // Calculate metrics
      const totalSpaces = mockSpaces.length;
      const occupiedSpaces = mockSpaces.filter(s => s.status === 'Occupied').length;
      const availableSpaces = mockSpaces.filter(s => s.status === 'Available').length;
      const maintenanceSpaces = mockSpaces.filter(s => s.status === 'Maintenance').length;
      const overallUtilization = mockSpaces.reduce((sum, space) => sum + space.utilization, 0) / totalSpaces;
      
      setMetrics({
        overallUtilization: Math.round(overallUtilization * 100) / 100,
        totalSpaces,
        occupiedSpaces,
        availableSpaces,
        maintenanceSpaces
      });
      
    } catch (error) {
      console.error('Failed to fetch space data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getMockSpaces = (): Space[] => [
    {
      id: '1',
      name: 'Conference Room A',
      type: 'Meeting Room',
      capacity: 12,
      area: 300,
      building: 'Headquarters Tower',
      floor: '5th Floor',
      utilization: 78.5,
      currentBookings: 6,
      status: 'Available'
    },
    {
      id: '2',
      name: 'Open Workspace 1',
      type: 'Open Office',
      capacity: 40,
      area: 1200,
      building: 'Headquarters Tower',
      floor: '3rd Floor',
      utilization: 85.2,
      currentBookings: 34,
      status: 'Occupied'
    },
    {
      id: '3',
      name: 'Private Office 201',
      type: 'Private Office',
      capacity: 2,
      area: 150,
      building: 'Headquarters Tower',
      floor: '2nd Floor',
      utilization: 92.1,
      currentBookings: 1,
      status: 'Occupied'
    },
    {
      id: '4',
      name: 'Training Room B',
      type: 'Training Room',
      capacity: 25,
      area: 600,
      building: 'Headquarters Tower',
      floor: '4th Floor',
      utilization: 45.8,
      currentBookings: 0,
      status: 'Maintenance'
    },
    {
      id: '5',
      name: 'Collaboration Hub',
      type: 'Collaboration Space',
      capacity: 8,
      area: 200,
      building: 'Headquarters Tower',
      floor: '6th Floor',
      utilization: 67.3,
      currentBookings: 3,
      status: 'Available'
    }
  ];

  const getMockBookings = (): Booking[] => [
    {
      id: '1',
      spaceName: 'Conference Room A',
      userName: 'John Smith',
      startTime: '2025-01-16T09:00',
      endTime: '2025-01-16T10:30',
      purpose: 'Weekly Team Meeting',
      status: 'Confirmed'
    },
    {
      id: '2',
      spaceName: 'Conference Room A',
      userName: 'Sarah Johnson',
      startTime: '2025-01-16T14:00',
      endTime: '2025-01-16T15:00',
      purpose: 'Client Presentation',
      status: 'In Progress'
    },
    {
      id: '3',
      spaceName: 'Training Room B',
      userName: 'Mike Davis',
      startTime: '2025-01-15T10:00',
      endTime: '2025-01-15T12:00',
      purpose: 'Security Training',
      status: 'Completed'
    }
  ];

  const handleBookingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const booking: Booking = {
      id: Date.now().toString(),
      ...newBooking,
      status: 'Confirmed'
    };
    setBookings(prev => [...prev, booking]);
    setNewBooking({
      spaceName: '',
      userName: '',
      startTime: '',
      endTime: '',
      purpose: ''
    });
    setShowBookingForm(false);
  };

  const getUtilizationColor = (utilization: number) => {
    if (utilization >= 80) return 'text-red-600 bg-red-50';
    if (utilization >= 60) return 'text-yellow-600 bg-yellow-50';
    return 'text-green-600 bg-green-50';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Available': return 'bg-green-100 text-green-800';
      case 'Occupied': return 'bg-blue-100 text-blue-800';
      case 'Maintenance': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">Loading space utilization data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900">Space Utilization Analytics</h1>
        <div className="space-x-2">
          <button 
            onClick={() => setShowBookingForm(true)}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            New Booking
          </button>
          <button 
            onClick={fetchSpaceData}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Refresh Data
          </button>
        </div>
      </div>

      {/* Utilization Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-md">
          <h3 className="text-sm font-semibold text-gray-700">Overall Utilization</h3>
          <p className={`text-2xl font-bold ${getUtilizationColor(metrics.overallUtilization)}`}>
            {metrics.overallUtilization}%
          </p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-md">
          <h3 className="text-sm font-semibold text-gray-700">Total Spaces</h3>
          <p className="text-2xl font-bold text-blue-600">{metrics.totalSpaces}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-md">
          <h3 className="text-sm font-semibold text-gray-700">Available</h3>
          <p className="text-2xl font-bold text-green-600">{metrics.availableSpaces}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-md">
          <h3 className="text-sm font-semibold text-gray-700">Occupied</h3>
          <p className="text-2xl font-bold text-blue-600">{metrics.occupiedSpaces}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow-md">
          <h3 className="text-sm font-semibold text-gray-700">Maintenance</h3>
          <p className="text-2xl font-bold text-red-600">{metrics.maintenanceSpaces}</p>
        </div>
      </div>

      {/* Booking Form Modal */}
      {showBookingForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <h3 className="text-lg font-medium text-gray-900 mb-4">New Space Booking</h3>
            <form onSubmit={handleBookingSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Space</label>
                <select
                  value={newBooking.spaceName}
                  onChange={(e) => setNewBooking(prev => ({...prev, spaceName: e.target.value}))}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                  required
                >
                  <option value="">Select a space</option>
                  {spaces.filter(s => s.status === 'Available').map(space => (
                    <option key={space.id} value={space.name}>{space.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">User Name</label>
                <input
                  type="text"
                  value={newBooking.userName}
                  onChange={(e) => setNewBooking(prev => ({...prev, userName: e.target.value}))}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Start Time</label>
                <input
                  type="datetime-local"
                  value={newBooking.startTime}
                  onChange={(e) => setNewBooking(prev => ({...prev, startTime: e.target.value}))}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">End Time</label>
                <input
                  type="datetime-local"
                  value={newBooking.endTime}
                  onChange={(e) => setNewBooking(prev => ({...prev, endTime: e.target.value}))}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Purpose</label>
                <input
                  type="text"
                  value={newBooking.purpose}
                  onChange={(e) => setNewBooking(prev => ({...prev, purpose: e.target.value}))}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                  required
                />
              </div>
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setShowBookingForm(false)}
                  className="px-4 py-2 text-gray-500 bg-gray-200 rounded-md hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Book Space
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Spaces Table */}
      <div className="bg-white rounded-lg shadow-md">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Space Inventory</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Space</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Capacity</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Utilization</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Current Bookings</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {spaces.map((space) => (
                <tr key={space.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{space.name}</div>
                      <div className="text-sm text-gray-500">{space.building} - {space.floor}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{space.type}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{space.capacity} people</div>
                    <div className="text-sm text-gray-500">{space.area} sq ft</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getUtilizationColor(space.utilization)}`}>
                      {space.utilization}%
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{space.currentBookings}</td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(space.status)}`}>
                      {space.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <button 
                      onClick={() => setSelectedSpace(space)}
                      className="text-blue-600 hover:text-blue-900"
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Bookings */}
      <div className="bg-white rounded-lg shadow-md">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Recent Bookings</h2>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {bookings.slice(0, 5).map((booking) => (
              <div key={booking.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div>
                  <h3 className="text-sm font-medium text-gray-900">{booking.spaceName}</h3>
                  <p className="text-sm text-gray-500">{booking.userName} - {booking.purpose}</p>
                  <p className="text-xs text-gray-400">
                    {new Date(booking.startTime).toLocaleDateString()} {new Date(booking.startTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - 
                    {new Date(booking.endTime).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                  </p>
                </div>
                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                  booking.status === 'Confirmed' ? 'bg-green-100 text-green-800' :
                  booking.status === 'In Progress' ? 'bg-blue-100 text-blue-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {booking.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Space Details Modal */}
      {selectedSpace && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <h3 className="text-lg font-medium text-gray-900 mb-4">{selectedSpace.name}</h3>
            <div className="space-y-2 text-sm">
              <p><span className="font-medium">Type:</span> {selectedSpace.type}</p>
              <p><span className="font-medium">Building:</span> {selectedSpace.building}</p>
              <p><span className="font-medium">Floor:</span> {selectedSpace.floor}</p>
              <p><span className="font-medium">Capacity:</span> {selectedSpace.capacity} people</p>
              <p><span className="font-medium">Area:</span> {selectedSpace.area} sq ft</p>
              <p><span className="font-medium">Utilization:</span> {selectedSpace.utilization}%</p>
              <p><span className="font-medium">Current Bookings:</span> {selectedSpace.currentBookings}</p>
              <p><span className="font-medium">Status:</span> {selectedSpace.status}</p>
            </div>
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setSelectedSpace(null)}
                className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SpaceUtilizationServicePage;
