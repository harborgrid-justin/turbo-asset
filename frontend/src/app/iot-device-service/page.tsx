import React, { useState, useEffect } from 'react';
import { apiService } from '../../lib/api';

// Interfaces
interface IoTDevice {
  id: string;
  deviceId: string;
  name: string;
  type: 'Sensor' | 'Actuator' | 'Gateway' | 'Controller';
  status: 'Active' | 'Inactive' | 'Maintenance' | 'Offline';
  location: {
    building: string;
    floor: string;
    room: string;
    coordinates?: {
      latitude: number;
      longitude: number;
    };
  };
  specifications: {
    manufacturer: string;
    model: string;
    firmwareVersion: string;
    powerSource: 'Battery' | 'Wired' | 'Solar';
    connectivity: 'WiFi' | 'Bluetooth' | 'Zigbee' | 'LoRa' | 'Cellular';
  };
  sensors: Sensor[];
  lastSeen: string;
  batteryLevel?: number;
  signalStrength?: number;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

interface Sensor {
  id: string;
  deviceId: string;
  name: string;
  type: 'Temperature' | 'Humidity' | 'Pressure' | 'Motion' | 'Light' | 'Sound' | 'Vibration' | 'Gas' | 'Current' | 'Voltage';
  unit: string;
  minValue?: number;
  maxValue?: number;
  currentValue?: number;
  lastReading: string;
  status: 'Normal' | 'Warning' | 'Critical' | 'Offline';
}

interface SensorReading {
  id: string;
  sensorId: string;
  deviceId: string;
  value: number;
  unit: string;
  timestamp: string;
  quality: 'Good' | 'Fair' | 'Poor';
  metadata?: Record<string, unknown>;
}

interface DeviceAlert {
  id: string;
  deviceId: string;
  sensorId?: string;
  type: 'DeviceOffline' | 'LowBattery' | 'SensorFailure' | 'ThresholdExceeded' | 'MaintenanceRequired';
  severity: 'Low' | 'Medium' | 'High' | 'Critical';
  message: string;
  timestamp: string;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
}

const IoTDeviceServicePage = () => {
  const [devices, setDevices] = useState<IoTDevice[]>([]);
  const [sensors, setSensors] = useState<Sensor[]>([]);
  const [readings, setReadings] = useState<SensorReading[]>([]);
  const [alerts, setAlerts] = useState<DeviceAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('devices');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');
  const [filterLocation, setFilterLocation] = useState('All');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState<IoTDevice | null>(null);
  const [selectedSensor, setSelectedSensor] = useState<Sensor | null>(null);
  const [selectedAlert, setSelectedAlert] = useState<DeviceAlert | null>(null);

  // Form states
  const [newDevice, setNewDevice] = useState({
    deviceId: '',
    name: '',
    type: 'Sensor' as IoTDevice['type'],
    building: '',
    floor: '',
    room: '',
    manufacturer: '',
    model: '',
    firmwareVersion: '',
    powerSource: 'Battery' as IoTDevice['specifications']['powerSource'],
    connectivity: 'WiFi' as IoTDevice['specifications']['connectivity'],
    tags: ''
  });

  const [newSensor, setNewSensor] = useState({
    deviceId: '',
    name: '',
    type: 'Temperature' as Sensor['type'],
    unit: '°C',
    minValue: '',
    maxValue: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [devicesRes, sensorsRes, readingsRes, alertsRes] = await Promise.all([
        apiService.generic.getAll<IoTDevice>('iot-devices'),
        apiService.generic.getAll<Sensor>('sensors'),
        apiService.generic.getAll<SensorReading>('sensor-readings'),
        apiService.generic.getAll<DeviceAlert>('device-alerts')
      ]);

      setDevices(devicesRes);
      setSensors(sensorsRes);
      setReadings(readingsRes);
      setAlerts(alertsRes);
    } catch (err) {
      setError('Failed to load IoT device data. Please try again.');
      console.error('Error loading data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDevice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (creating) return;

    try {
      setCreating(true);
      setError(null);

      const deviceData = {
        deviceId: newDevice.deviceId,
        name: newDevice.name,
        type: newDevice.type,
        location: {
          building: newDevice.building,
          floor: newDevice.floor,
          room: newDevice.room
        },
        specifications: {
          manufacturer: newDevice.manufacturer,
          model: newDevice.model,
          firmwareVersion: newDevice.firmwareVersion,
          powerSource: newDevice.powerSource,
          connectivity: newDevice.connectivity
        },
        tags: newDevice.tags.split(',').map(tag => tag.trim()).filter(tag => tag)
      };

      const createdDevice = await apiService.generic.create<IoTDevice>('iot-devices', deviceData);
      setDevices(prev => [...prev, createdDevice]);

      setNewDevice({
        deviceId: '',
        name: '',
        type: 'Sensor',
        building: '',
        floor: '',
        room: '',
        manufacturer: '',
        model: '',
        firmwareVersion: '',
        powerSource: 'Battery',
        connectivity: 'WiFi',
        tags: ''
      });
      setShowCreateForm(false);
    } catch (err) {
      setError('Failed to create IoT device. Please try again.');
      console.error('Error creating device:', err);
    } finally {
      setCreating(false);
    }
  };

  const handleCreateSensor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (creating) return;

    try {
      setCreating(true);
      setError(null);

      const sensorData = {
        deviceId: newSensor.deviceId,
        name: newSensor.name,
        type: newSensor.type,
        unit: newSensor.unit,
        minValue: newSensor.minValue ? parseFloat(newSensor.minValue) : undefined,
        maxValue: newSensor.maxValue ? parseFloat(newSensor.maxValue) : undefined
      };

      const createdSensor = await apiService.generic.create<Sensor>('sensors', sensorData);
      setSensors(prev => [...prev, createdSensor]);

      setNewSensor({
        deviceId: '',
        name: '',
        type: 'Temperature',
        unit: '°C',
        minValue: '',
        maxValue: ''
      });
      setShowCreateForm(false);
    } catch (err) {
      setError('Failed to create sensor. Please try again.');
      console.error('Error creating sensor:', err);
    } finally {
      setCreating(false);
    }
  };

  const updateDeviceStatus = async (deviceId: string, status: IoTDevice['status']) => {
    try {
      setError(null);
      await apiService.generic.update<IoTDevice>('iot-devices', parseInt(deviceId), { status });
      setDevices(prev => prev.map(device =>
        device.id === deviceId ? { ...device, status } : device
      ));
    } catch (err) {
      setError('Failed to update device status. Please try again.');
      console.error('Error updating device:', err);
    }
  };

  const acknowledgeAlert = async (alertId: string) => {
    try {
      setError(null);
      const updateData: Partial<DeviceAlert> = {
        acknowledged: true,
        acknowledgedAt: new Date().toISOString()
      };
      await apiService.generic.update<DeviceAlert>('device-alerts', parseInt(alertId), updateData);
      setAlerts(prev => prev.map(alert =>
        alert.id === alertId ? { ...alert, ...updateData } : alert
      ));
    } catch (err) {
      setError('Failed to acknowledge alert. Please try again.');
      console.error('Error acknowledging alert:', err);
    }
  };

  const deleteDevice = async (deviceId: string) => {
    if (!confirm('Are you sure you want to delete this IoT device? This action cannot be undone.')) return;

    try {
      setError(null);
      await apiService.generic.delete('iot-devices', parseInt(deviceId));
      setDevices(prev => prev.filter(device => device.id !== deviceId));
    } catch (err) {
      setError('Failed to delete IoT device. Please try again.');
      console.error('Error deleting device:', err);
    }
  };

  const deleteSensor = async (sensorId: string) => {
    if (!confirm('Are you sure you want to delete this sensor? This action cannot be undone.')) return;

    try {
      setError(null);
      await apiService.generic.delete('sensors', parseInt(sensorId));
      setSensors(prev => prev.filter(sensor => sensor.id !== sensorId));
    } catch (err) {
      setError('Failed to delete sensor. Please try again.');
      console.error('Error deleting sensor:', err);
    }
  };

  const deleteAlert = async (alertId: string) => {
    if (!confirm('Are you sure you want to delete this alert? This action cannot be undone.')) return;

    try {
      setError(null);
      await apiService.generic.delete('device-alerts', parseInt(alertId));
      setAlerts(prev => prev.filter(alert => alert.id !== alertId));
    } catch (err) {
      setError('Failed to delete alert. Please try again.');
      console.error('Error deleting alert:', err);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active': return 'bg-green-100 text-green-800';
      case 'Inactive': return 'bg-gray-100 text-gray-800';
      case 'Maintenance': return 'bg-yellow-100 text-yellow-800';
      case 'Offline': return 'bg-red-100 text-red-800';
      case 'Normal': return 'bg-green-100 text-green-800';
      case 'Warning': return 'bg-yellow-100 text-yellow-800';
      case 'Critical': return 'bg-red-100 text-red-800';
      case 'Low': return 'bg-blue-100 text-blue-800';
      case 'Medium': return 'bg-yellow-100 text-yellow-800';
      case 'High': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getDeviceTypeColor = (type: string) => {
    switch (type) {
      case 'Sensor': return 'bg-blue-100 text-blue-800';
      case 'Actuator': return 'bg-purple-100 text-purple-800';
      case 'Gateway': return 'bg-green-100 text-green-800';
      case 'Controller': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getSensorTypeColor = (type: string) => {
    switch (type) {
      case 'Temperature': return 'bg-red-100 text-red-800';
      case 'Humidity': return 'bg-blue-100 text-blue-800';
      case 'Pressure': return 'bg-green-100 text-green-800';
      case 'Motion': return 'bg-purple-100 text-purple-800';
      case 'Light': return 'bg-yellow-100 text-yellow-800';
      case 'Sound': return 'bg-orange-100 text-orange-800';
      case 'Vibration': return 'bg-pink-100 text-pink-800';
      case 'Gas': return 'bg-indigo-100 text-indigo-800';
      case 'Current': return 'bg-teal-100 text-teal-800';
      case 'Voltage': return 'bg-cyan-100 text-cyan-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredDevices = devices.filter(device => {
    const typeMatch = filterType === 'All' || device.type === filterType;
    const statusMatch = filterStatus === 'All' || device.status === filterStatus;
    const locationMatch = filterLocation === 'All' || device.location.building === filterLocation;
    const searchMatch = !searchQuery ||
      device.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      device.deviceId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      device.specifications.manufacturer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      device.specifications.model.toLowerCase().includes(searchQuery.toLowerCase());
    return typeMatch && statusMatch && locationMatch && searchMatch;
  });

  const filteredSensors = sensors.filter(sensor => {
    const searchMatch = !searchQuery ||
      sensor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sensor.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      devices.find(d => d.id === sensor.deviceId)?.name.toLowerCase().includes(searchQuery.toLowerCase());
    return searchMatch;
  });

  const filteredAlerts = alerts.filter(alert => {
    const searchMatch = !searchQuery ||
      alert.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
      alert.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      devices.find(d => d.id === alert.deviceId)?.name.toLowerCase().includes(searchQuery.toLowerCase());
    return searchMatch;
  });

  const getStats = () => {
    const totalDevices = devices.length;
    const activeDevices = devices.filter(d => d.status === 'Active').length;
    const offlineDevices = devices.filter(d => d.status === 'Offline').length;
    const totalSensors = sensors.length;
    const activeSensors = sensors.filter(s => s.status === 'Normal').length;
    const criticalAlerts = alerts.filter(a => a.severity === 'Critical' && !a.acknowledged).length;
    const unacknowledgedAlerts = alerts.filter(a => !a.acknowledged).length;
    const recentReadings = readings.filter(r => {
      const readingDate = new Date(r.timestamp);
      const hourAgo = new Date();
      hourAgo.setHours(hourAgo.getHours() - 1);
      return readingDate >= hourAgo;
    }).length;

    return {
      totalDevices,
      activeDevices,
      offlineDevices,
      totalSensors,
      activeSensors,
      criticalAlerts,
      unacknowledgedAlerts,
      recentReadings
    };
  };

  const stats = getStats();

  if (loading) {
    return (
      <div className="container mx-auto p-4">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">IoT Device Service</h1>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
          <button
            onClick={() => setError(null)}
            className="float-right ml-4 font-bold"
          >
            ×
          </button>
        </div>
      )}

      {/* IoT Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white shadow rounded-lg p-4 border">
          <h3 className="text-lg font-semibold text-gray-700">Total Devices</h3>
          <p className="text-2xl font-bold text-blue-600">{stats.totalDevices}</p>
          <p className="text-sm text-gray-600">{stats.activeDevices} active</p>
        </div>
        <div className="bg-white shadow rounded-lg p-4 border">
          <h3 className="text-lg font-semibold text-gray-700">Device Health</h3>
          <p className="text-2xl font-bold text-green-600">{stats.activeSensors}</p>
          <p className="text-sm text-gray-600">of {stats.totalSensors} sensors</p>
        </div>
        <div className="bg-white shadow rounded-lg p-4 border">
          <h3 className="text-lg font-semibold text-gray-700">Critical Alerts</h3>
          <p className="text-2xl font-bold text-red-600">{stats.criticalAlerts}</p>
          <p className="text-sm text-gray-600">{stats.unacknowledgedAlerts} unacknowledged</p>
        </div>
        <div className="bg-white shadow rounded-lg p-4 border">
          <h3 className="text-lg font-semibold text-gray-700">Recent Activity</h3>
          <p className="text-2xl font-bold text-purple-600">{stats.recentReadings}</p>
          <p className="text-sm text-gray-600">readings in last hour</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex space-x-1 mb-6">
        <button
          onClick={() => setActiveTab('devices')}
          className={`px-4 py-2 rounded-t-lg font-medium ${
            activeTab === 'devices'
              ? 'bg-white border-t border-l border-r text-blue-600'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Devices ({devices.length})
        </button>
        <button
          onClick={() => setActiveTab('sensors')}
          className={`px-4 py-2 rounded-t-lg font-medium ${
            activeTab === 'sensors'
              ? 'bg-white border-t border-l border-r text-blue-600'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Sensors ({sensors.length})
        </button>
        <button
          onClick={() => setActiveTab('readings')}
          className={`px-4 py-2 rounded-t-lg font-medium ${
            activeTab === 'readings'
              ? 'bg-white border-t border-l border-r text-blue-600'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Readings ({readings.length})
        </button>
        <button
          onClick={() => setActiveTab('alerts')}
          className={`px-4 py-2 rounded-t-lg font-medium ${
            activeTab === 'alerts'
              ? 'bg-white border-t border-l border-r text-blue-600'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          Alerts ({alerts.length})
        </button>
      </div>

      {/* Devices Tab */}
      {activeTab === 'devices' && (
        <div className="bg-white shadow rounded-lg p-6 border">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">IoT Devices</h2>
            <div className="flex space-x-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Search devices..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="All">All Types</option>
                  <option value="Sensor">Sensor</option>
                  <option value="Actuator">Actuator</option>
                  <option value="Gateway">Gateway</option>
                  <option value="Controller">Controller</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="All">All Status</option>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                  <option value="Maintenance">Maintenance</option>
                  <option value="Offline">Offline</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Building</label>
                <select
                  value={filterLocation}
                  onChange={(e) => setFilterLocation(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                >
                  <option value="All">All Buildings</option>
                  {Array.from(new Set(devices.map(d => d.location.building))).map(building => (
                    <option key={building} value={building}>{building}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <button
                  onClick={() => setShowCreateForm(!showCreateForm)}
                  className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                  disabled={creating}
                >
                  {showCreateForm ? 'Cancel' : 'Add Device'}
                </button>
              </div>
            </div>
          </div>

          {showCreateForm && (
            <div className="bg-gray-100 p-4 rounded-lg mb-6">
              <h3 className="text-lg font-semibold mb-4">Add New IoT Device</h3>
              <form onSubmit={handleCreateDevice} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Device ID *</label>
                    <input
                      type="text"
                      value={newDevice.deviceId}
                      onChange={(e) => setNewDevice(prev => ({ ...prev, deviceId: e.target.value }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Device Name *</label>
                    <input
                      type="text"
                      value={newDevice.name}
                      onChange={(e) => setNewDevice(prev => ({ ...prev, name: e.target.value }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Device Type *</label>
                    <select
                      value={newDevice.type}
                      onChange={(e) => setNewDevice(prev => ({ ...prev, type: e.target.value as IoTDevice['type'] }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      required
                    >
                      <option value="Sensor">Sensor</option>
                      <option value="Actuator">Actuator</option>
                      <option value="Gateway">Gateway</option>
                      <option value="Controller">Controller</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Building *</label>
                    <input
                      type="text"
                      value={newDevice.building}
                      onChange={(e) => setNewDevice(prev => ({ ...prev, building: e.target.value }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Floor</label>
                    <input
                      type="text"
                      value={newDevice.floor}
                      onChange={(e) => setNewDevice(prev => ({ ...prev, floor: e.target.value }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Room</label>
                    <input
                      type="text"
                      value={newDevice.room}
                      onChange={(e) => setNewDevice(prev => ({ ...prev, room: e.target.value }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Manufacturer *</label>
                    <input
                      type="text"
                      value={newDevice.manufacturer}
                      onChange={(e) => setNewDevice(prev => ({ ...prev, manufacturer: e.target.value }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Model *</label>
                    <input
                      type="text"
                      value={newDevice.model}
                      onChange={(e) => setNewDevice(prev => ({ ...prev, model: e.target.value }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Firmware Version</label>
                    <input
                      type="text"
                      value={newDevice.firmwareVersion}
                      onChange={(e) => setNewDevice(prev => ({ ...prev, firmwareVersion: e.target.value }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Power Source</label>
                    <select
                      value={newDevice.powerSource}
                      onChange={(e) => setNewDevice(prev => ({ ...prev, powerSource: e.target.value as IoTDevice['specifications']['powerSource'] }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="Battery">Battery</option>
                      <option value="Wired">Wired</option>
                      <option value="Solar">Solar</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Connectivity</label>
                    <select
                      value={newDevice.connectivity}
                      onChange={(e) => setNewDevice(prev => ({ ...prev, connectivity: e.target.value as IoTDevice['specifications']['connectivity'] }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    >
                      <option value="WiFi">WiFi</option>
                      <option value="Bluetooth">Bluetooth</option>
                      <option value="Zigbee">Zigbee</option>
                      <option value="LoRa">LoRa</option>
                      <option value="Cellular">Cellular</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Tags (comma-separated)</label>
                  <input
                    type="text"
                    value={newDevice.tags}
                    onChange={(e) => setNewDevice(prev => ({ ...prev, tags: e.target.value }))}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="temperature, critical, production"
                  />
                </div>
                <button
                  type="submit"
                  className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
                  disabled={creating}
                >
                  {creating ? 'Adding...' : 'Add IoT Device'}
                </button>
              </form>
            </div>
          )}

          <div className="space-y-4">
            {filteredDevices.map((device) => (
              <div key={device.id} className="bg-gray-50 shadow rounded-lg p-6 border">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-xl font-semibold">{device.name}</h3>
                      <span className="px-2 py-1 text-xs font-semibold rounded bg-gray-100 text-gray-800">
                        {device.deviceId}
                      </span>
                      <span className={`px-2 py-1 text-xs font-semibold rounded ${getDeviceTypeColor(device.type)}`}>
                        {device.type}
                      </span>
                      <span className={`px-2 py-1 text-xs font-semibold rounded ${getStatusColor(device.status)}`}>
                        {device.status}
                      </span>
                    </div>
                    <p className="text-gray-600">{device.specifications.manufacturer} {device.specifications.model}</p>
                    <div className="flex items-center space-x-4 text-sm text-gray-500 mt-2">
                      <span>Location: {device.location.building} {device.location.floor} {device.location.room}</span>
                      <span>Connectivity: {device.specifications.connectivity}</span>
                      <span>Power: {device.specifications.powerSource}</span>
                      {device.batteryLevel && <span>Battery: {device.batteryLevel}%</span>}
                      <span>Last Seen: {new Date(device.lastSeen).toLocaleString()}</span>
                    </div>
                    {device.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {device.tags.map((tag, index) => (
                          <span key={index} className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="text-right">
                      <p className="text-sm text-gray-600">
                        {device.sensors.length} sensors
                      </p>
                      <p className="text-sm text-gray-600">
                        Firmware: {device.specifications.firmwareVersion}
                      </p>
                    </div>
                    <div className="flex space-x-1">
                      {device.status === 'Active' && (
                        <button
                          onClick={() => updateDeviceStatus(device.id, 'Maintenance')}
                          className="bg-yellow-500 hover:bg-yellow-700 text-white text-xs px-2 py-1 rounded"
                        >
                          Maintenance
                        </button>
                      )}
                      {device.status === 'Maintenance' && (
                        <button
                          onClick={() => updateDeviceStatus(device.id, 'Active')}
                          className="bg-green-500 hover:bg-green-700 text-white text-xs px-2 py-1 rounded"
                        >
                          Activate
                        </button>
                      )}
                      <button
                        onClick={() => setSelectedDevice(selectedDevice?.id === device.id ? null : device)}
                        className="bg-gray-500 hover:bg-gray-700 text-white text-xs px-2 py-1 rounded"
                      >
                        {selectedDevice?.id === device.id ? 'Hide' : 'Details'}
                      </button>
                      <button
                        onClick={() => deleteDevice(device.id)}
                        className="bg-gray-500 hover:bg-gray-700 text-white text-xs px-2 py-1 rounded"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>

                {selectedDevice?.id === device.id && (
                  <div className="mt-6 border-t pt-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                      <div>
                        <p className="text-sm text-gray-600">Device ID</p>
                        <p className="font-semibold">{device.deviceId}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Type</p>
                        <p className="font-semibold">{device.type}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Status</p>
                        <p className="font-semibold">{device.status}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Last Seen</p>
                        <p className="font-semibold">{new Date(device.lastSeen).toLocaleString()}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                      <div>
                        <p className="text-sm text-gray-600">Manufacturer</p>
                        <p className="font-semibold">{device.specifications.manufacturer}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Model</p>
                        <p className="font-semibold">{device.specifications.model}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Firmware</p>
                        <p className="font-semibold">{device.specifications.firmwareVersion}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Power Source</p>
                        <p className="font-semibold">{device.specifications.powerSource}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                      <div>
                        <p className="text-sm text-gray-600">Building</p>
                        <p className="font-semibold">{device.location.building}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Floor</p>
                        <p className="font-semibold">{device.location.floor || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Room</p>
                        <p className="font-semibold">{device.location.room || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Connectivity</p>
                        <p className="font-semibold">{device.specifications.connectivity}</p>
                      </div>
                    </div>

                    {device.sensors.length > 0 && (
                      <div className="mb-6">
                        <h4 className="text-md font-medium mb-4">Sensors ({device.sensors.length})</h4>
                        <div className="space-y-2">
                          {device.sensors.map((sensor, index) => (
                            <div key={index} className="flex justify-between items-center bg-white p-3 rounded border">
                              <div className="flex-1">
                                <p className="font-medium">{sensor.name}</p>
                                <p className="text-sm text-gray-600">Type: {sensor.type} | Status: {sensor.status}</p>
                              </div>
                              <div className="text-right">
                                <p className="text-sm font-semibold">{sensor.currentValue} {sensor.unit}</p>
                                <p className="text-xs text-gray-500">Last: {new Date(sensor.lastReading).toLocaleString()}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {device.tags.length > 0 && (
                      <div className="mb-6">
                        <h4 className="text-md font-medium mb-4">Tags ({device.tags.length})</h4>
                        <div className="flex flex-wrap gap-2">
                          {device.tags.map((tag, index) => (
                            <span key={index} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="text-xs text-gray-500 mt-4">
                  <p>Created: {new Date(device.createdAt).toLocaleString()}</p>
                  <p>Updated: {new Date(device.updatedAt).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>

          {filteredDevices.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500">
                {filterType === 'All' && filterStatus === 'All' && filterLocation === 'All' && !searchQuery
                  ? 'No IoT devices found. Add your first device to get started.'
                  : 'No devices match the selected filters.'
                }
              </p>
            </div>
          )}
        </div>
      )}

      {/* Sensors Tab */}
      {activeTab === 'sensors' && (
        <div className="bg-white shadow rounded-lg p-6 border">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">Sensors</h2>
            <div className="flex space-x-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Search sensors..."
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={() => setShowCreateForm(!showCreateForm)}
                  className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                  disabled={creating}
                >
                  {showCreateForm ? 'Cancel' : 'Add Sensor'}
                </button>
              </div>
            </div>
          </div>

          {showCreateForm && (
            <div className="bg-gray-100 p-4 rounded-lg mb-6">
              <h3 className="text-lg font-semibold mb-4">Add New Sensor</h3>
              <form onSubmit={handleCreateSensor} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Device *</label>
                    <select
                      value={newSensor.deviceId}
                      onChange={(e) => setNewSensor(prev => ({ ...prev, deviceId: e.target.value }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      required
                    >
                      <option value="">Select device...</option>
                      {devices.map(device => (
                        <option key={device.id} value={device.id}>{device.name} ({device.deviceId})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Sensor Name *</label>
                    <input
                      type="text"
                      value={newSensor.name}
                      onChange={(e) => setNewSensor(prev => ({ ...prev, name: e.target.value }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Sensor Type *</label>
                    <select
                      value={newSensor.type}
                      onChange={(e) => setNewSensor(prev => ({ ...prev, type: e.target.value as Sensor['type'] }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      required
                    >
                      <option value="Temperature">Temperature</option>
                      <option value="Humidity">Humidity</option>
                      <option value="Pressure">Pressure</option>
                      <option value="Motion">Motion</option>
                      <option value="Light">Light</option>
                      <option value="Sound">Sound</option>
                      <option value="Vibration">Vibration</option>
                      <option value="Gas">Gas</option>
                      <option value="Current">Current</option>
                      <option value="Voltage">Voltage</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Unit *</label>
                    <input
                      type="text"
                      value={newSensor.unit}
                      onChange={(e) => setNewSensor(prev => ({ ...prev, unit: e.target.value }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Min Value</label>
                    <input
                      type="number"
                      value={newSensor.minValue}
                      onChange={(e) => setNewSensor(prev => ({ ...prev, minValue: e.target.value }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      step="0.01"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Max Value</label>
                    <input
                      type="number"
                      value={newSensor.maxValue}
                      onChange={(e) => setNewSensor(prev => ({ ...prev, maxValue: e.target.value }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      step="0.01"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
                  disabled={creating}
                >
                  {creating ? 'Adding...' : 'Add Sensor'}
                </button>
              </form>
            </div>
          )}

          <div className="space-y-4">
            {filteredSensors.map((sensor) => (
              <div key={sensor.id} className="bg-gray-50 shadow rounded-lg p-6 border">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-xl font-semibold">{sensor.name}</h3>
                      <span className={`px-2 py-1 text-xs font-semibold rounded ${getSensorTypeColor(sensor.type)}`}>
                        {sensor.type}
                      </span>
                      <span className={`px-2 py-1 text-xs font-semibold rounded ${getStatusColor(sensor.status)}`}>
                        {sensor.status}
                      </span>
                    </div>
                    <p className="text-gray-600">Device: {devices.find(d => d.id === sensor.deviceId)?.name || 'Unknown'}</p>
                    <div className="flex items-center space-x-4 text-sm text-gray-500 mt-2">
                      <span>Current: {sensor.currentValue} {sensor.unit}</span>
                      {sensor.minValue && <span>Min: {sensor.minValue} {sensor.unit}</span>}
                      {sensor.maxValue && <span>Max: {sensor.maxValue} {sensor.unit}</span>}
                      <span>Last Reading: {new Date(sensor.lastReading).toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="text-right">
                      <p className="text-sm text-gray-600">
                        {sensor.currentValue} {sensor.unit}
                      </p>
                      <p className="text-sm text-gray-600">
                        Status: {sensor.status}
                      </p>
                    </div>
                    <div className="flex space-x-1">
                      <button
                        onClick={() => setSelectedSensor(selectedSensor?.id === sensor.id ? null : sensor)}
                        className="bg-gray-500 hover:bg-gray-700 text-white text-xs px-2 py-1 rounded"
                      >
                        {selectedSensor?.id === sensor.id ? 'Hide' : 'Details'}
                      </button>
                      <button
                        onClick={() => deleteSensor(sensor.id)}
                        className="bg-gray-500 hover:bg-gray-700 text-white text-xs px-2 py-1 rounded"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>

                {selectedSensor?.id === sensor.id && (
                  <div className="mt-6 border-t pt-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                      <div>
                        <p className="text-sm text-gray-600">Sensor Name</p>
                        <p className="font-semibold">{sensor.name}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Type</p>
                        <p className="font-semibold">{sensor.type}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Unit</p>
                        <p className="font-semibold">{sensor.unit}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Status</p>
                        <p className="font-semibold">{sensor.status}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                      <div>
                        <p className="text-sm text-gray-600">Current Value</p>
                        <p className="font-semibold">{sensor.currentValue} {sensor.unit}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Min Value</p>
                        <p className="font-semibold">{sensor.minValue || 'N/A'} {sensor.unit}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Max Value</p>
                        <p className="font-semibold">{sensor.maxValue || 'N/A'} {sensor.unit}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Last Reading</p>
                        <p className="font-semibold">{new Date(sensor.lastReading).toLocaleString()}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {filteredSensors.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500">
                {!searchQuery
                  ? 'No sensors found. Add your first sensor to get started.'
                  : 'No sensors match the search query.'
                }
              </p>
            </div>
          )}
        </div>
      )}

      {/* Readings Tab */}
      {activeTab === 'readings' && (
        <div className="bg-white shadow rounded-lg p-6 border">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">Sensor Readings</h2>
            <div className="flex space-x-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Search readings..."
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {readings.slice(0, 100).map((reading) => (
              <div key={reading.id} className="bg-gray-50 shadow rounded-lg p-6 border">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-xl font-semibold">Reading #{reading.id}</h3>
                      <span className={`px-2 py-1 text-xs font-semibold rounded ${getStatusColor(reading.quality === 'Good' ? 'Normal' : reading.quality === 'Fair' ? 'Warning' : 'Critical')}`}>
                        {reading.quality}
                      </span>
                    </div>
                    <p className="text-gray-600">Device: {devices.find(d => d.id === reading.deviceId)?.name || 'Unknown'} | Sensor: {sensors.find(s => s.id === reading.sensorId)?.name || 'Unknown'}</p>
                    <div className="flex items-center space-x-4 text-sm text-gray-500 mt-2">
                      <span>Value: {reading.value} {reading.unit}</span>
                      <span>Timestamp: {new Date(reading.timestamp).toLocaleString()}</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="text-right">
                      <p className="text-sm text-gray-600">
                        {reading.value} {reading.unit}
                      </p>
                      <p className="text-sm text-gray-600">
                        Quality: {reading.quality}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {readings.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500">No sensor readings found.</p>
            </div>
          )}
        </div>
      )}

      {/* Alerts Tab */}
      {activeTab === 'alerts' && (
        <div className="bg-white shadow rounded-lg p-6 border">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold">Device Alerts</h2>
            <div className="flex space-x-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="Search alerts..."
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {filteredAlerts.map((alert) => (
              <div key={alert.id} className="bg-gray-50 shadow rounded-lg p-6 border">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-xl font-semibold">{alert.type}</h3>
                      <span className={`px-2 py-1 text-xs font-semibold rounded ${getStatusColor(alert.severity === 'Critical' ? 'Critical' : alert.severity === 'High' ? 'Warning' : 'Normal')}`}>
                        {alert.severity}
                      </span>
                      {!alert.acknowledged && (
                        <span className="px-2 py-1 text-xs font-semibold rounded bg-red-100 text-red-800">
                          Unacknowledged
                        </span>
                      )}
                    </div>
                    <p className="text-gray-600">{alert.message}</p>
                    <div className="flex items-center space-x-4 text-sm text-gray-500 mt-2">
                      <span>Device: {devices.find(d => d.id === alert.deviceId)?.name || 'Unknown'}</span>
                      {alert.sensorId && <span>Sensor: {sensors.find(s => s.id === alert.sensorId)?.name || 'Unknown'}</span>}
                      <span>Time: {new Date(alert.timestamp).toLocaleString()}</span>
                      {alert.acknowledged && alert.acknowledgedAt && (
                        <span>Acknowledged: {new Date(alert.acknowledgedAt).toLocaleString()}</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="flex space-x-1">
                      {!alert.acknowledged && (
                        <button
                          onClick={() => acknowledgeAlert(alert.id)}
                          className="bg-blue-500 hover:bg-blue-700 text-white text-xs px-2 py-1 rounded"
                        >
                          Acknowledge
                        </button>
                      )}
                      <button
                        onClick={() => setSelectedAlert(selectedAlert?.id === alert.id ? null : alert)}
                        className="bg-gray-500 hover:bg-gray-700 text-white text-xs px-2 py-1 rounded"
                      >
                        {selectedAlert?.id === alert.id ? 'Hide' : 'Details'}
                      </button>
                      <button
                        onClick={() => deleteAlert(alert.id)}
                        className="bg-gray-500 hover:bg-gray-700 text-white text-xs px-2 py-1 rounded"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>

                {selectedAlert?.id === alert.id && (
                  <div className="mt-6 border-t pt-6">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                      <div>
                        <p className="text-sm text-gray-600">Alert Type</p>
                        <p className="font-semibold">{alert.type}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Severity</p>
                        <p className="font-semibold">{alert.severity}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Status</p>
                        <p className="font-semibold">{alert.acknowledged ? 'Acknowledged' : 'Unacknowledged'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Timestamp</p>
                        <p className="font-semibold">{new Date(alert.timestamp).toLocaleString()}</p>
                      </div>
                    </div>

                    <div className="mb-6">
                      <h4 className="text-md font-medium mb-2">Message</h4>
                      <div className="bg-white p-4 rounded border">
                        <p className="text-gray-700">{alert.message}</p>
                      </div>
                    </div>

                    {alert.acknowledged && alert.acknowledgedBy && (
                      <div className="mb-6">
                        <h4 className="text-md font-medium mb-2">Acknowledged By</h4>
                        <div className="bg-white p-4 rounded border">
                          <p className="text-gray-700">{alert.acknowledgedBy}</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          {filteredAlerts.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500">
                {!searchQuery
                  ? 'No alerts found. All systems are running normally.'
                  : 'No alerts match the search query.'
                }
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default IoTDeviceServicePage;
