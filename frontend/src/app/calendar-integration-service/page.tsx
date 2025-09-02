import React, { useState, useEffect, useCallback } from 'react';
import { apiService } from '../../lib/api';

interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  startDate: string;
  endDate: string;
  location?: string;
  attendees: string[];
  calendarId: string;
  status: 'confirmed' | 'tentative' | 'cancelled';
  createdAt: string;
  updatedAt: string;
}

interface Calendar {
  id: string;
  name: string;
  description?: string;
  color: string;
  isPrimary: boolean;
  provider: 'Google' | 'Outlook' | 'Apple' | 'Custom';
  syncEnabled: boolean;
  lastSyncAt?: string;
}

const CalendarIntegrationServicePage = () => {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [calendars, setCalendars] = useState<Calendar[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'events' | 'calendars'>('events');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [creating, setCreating] = useState(false);

  // Form state
  const [newEvent, setNewEvent] = useState({
    title: '',
    description: '',
    startDate: '',
    endDate: '',
    location: '',
    attendees: '',
    calendarId: ''
  });

  const loadCalendars = useCallback(async () => {
    try {
      const data = await apiService.generic.getAll<Calendar>('calendar/calendars');
      setCalendars(data);
      // Set default calendar if available
      if (data.length > 0 && !newEvent.calendarId) {
        setNewEvent(prev => ({ ...prev, calendarId: data[0].id }));
      }
    } catch (err) {
      console.error('Error loading calendars:', err);
    }
  }, [newEvent.calendarId]);

  // Load data on component mount
  useEffect(() => {
    loadCalendars();
    loadEvents();
  }, [loadCalendars]);

  const loadEvents = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiService.generic.getAll<CalendarEvent>('calendar/events');
      setEvents(data);
    } catch (err) {
      setError('Failed to load calendar events. Please try again.');
      console.error('Error loading events:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEvent.title || !newEvent.startDate || !newEvent.endDate || !newEvent.calendarId) {
      setError('Please fill in all required fields.');
      return;
    }

    try {
      setCreating(true);
      setError(null);

      const eventData = {
        ...newEvent,
        attendees: newEvent.attendees.split(',').map(email => email.trim()).filter(email => email),
        startDate: new Date(newEvent.startDate).toISOString(),
        endDate: new Date(newEvent.endDate).toISOString()
      };

      const createdEvent = await apiService.generic.create<CalendarEvent>('calendar/events', eventData);

      setEvents(prev => [createdEvent, ...prev]);
      setNewEvent({
        title: '',
        description: '',
        startDate: '',
        endDate: '',
        location: '',
        attendees: '',
        calendarId: calendars[0]?.id || ''
      });
      setShowCreateForm(false);
    } catch (err) {
      setError('Failed to create event. Please try again.');
      console.error('Error creating event:', err);
    } finally {
      setCreating(false);
    }
  };

  const updateEventStatus = async (eventId: string, status: CalendarEvent['status']) => {
    try {
      setError(null);
      await apiService.generic.update<CalendarEvent>('calendar/events', parseInt(eventId), { status });
      setEvents(prev => prev.map(event =>
        event.id === eventId ? { ...event, status } : event
      ));
    } catch (err) {
      setError('Failed to update event status. Please try again.');
      console.error('Error updating event:', err);
    }
  };

  const deleteEvent = async (eventId: string) => {
    if (!confirm('Are you sure you want to delete this event?')) return;

    try {
      setError(null);
      await apiService.generic.delete('calendar/events', parseInt(eventId));
      setEvents(prev => prev.filter(event => event.id !== eventId));
    } catch (err) {
      setError('Failed to delete event. Please try again.');
      console.error('Error deleting event:', err);
    }
  };

  const syncCalendar = async (calendarId: string) => {
    try {
      setError(null);
      await apiService.generic.create(`calendar/calendars/${calendarId}/sync`, {});
      await loadCalendars();
      await loadEvents();
    } catch (err) {
      setError('Failed to sync calendar. Please try again.');
      console.error('Error syncing calendar:', err);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-800';
      case 'tentative': return 'bg-yellow-100 text-yellow-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getProviderColor = (provider: string) => {
    switch (provider) {
      case 'Google': return 'bg-red-100 text-red-800';
      case 'Outlook': return 'bg-blue-100 text-blue-800';
      case 'Apple': return 'bg-gray-100 text-gray-800';
      case 'Custom': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredEvents = events.filter(event => {
    if (!selectedDate) return true;
    const eventDate = new Date(event.startDate).toISOString().split('T')[0];
    return eventDate === selectedDate;
  });

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
      <h1 className="text-3xl font-bold mb-6">Calendar Integration Service</h1>

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

      {/* Tab Navigation */}
      <div className="mb-6">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('events')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'events'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Events
            </button>
            <button
              onClick={() => setActiveTab('calendars')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'calendars'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Calendars
            </button>
          </nav>
        </div>
      </div>

      {/* Events Tab */}
      {activeTab === 'events' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Calendar Events</h2>
            <div className="flex space-x-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Filter by Date</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
              <div className="flex items-end">
                <button
                  onClick={() => setShowCreateForm(!showCreateForm)}
                  className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                  disabled={creating}
                >
                  {showCreateForm ? 'Cancel' : 'Create Event'}
                </button>
              </div>
            </div>
          </div>

          {showCreateForm && (
            <div className="bg-gray-100 p-4 rounded-lg">
              <h3 className="text-lg font-semibold mb-4">Create New Event</h3>
              <form onSubmit={handleCreateEvent} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Title *</label>
                    <input
                      type="text"
                      value={newEvent.title}
                      onChange={(e) => setNewEvent(prev => ({ ...prev, title: e.target.value }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Calendar *</label>
                    <select
                      value={newEvent.calendarId}
                      onChange={(e) => setNewEvent(prev => ({ ...prev, calendarId: e.target.value }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      required
                    >
                      <option value="">Select Calendar</option>
                      {calendars.map(calendar => (
                        <option key={calendar.id} value={calendar.id}>
                          {calendar.name} ({calendar.provider})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Start Date & Time *</label>
                    <input
                      type="datetime-local"
                      value={newEvent.startDate}
                      onChange={(e) => setNewEvent(prev => ({ ...prev, startDate: e.target.value }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">End Date & Time *</label>
                    <input
                      type="datetime-local"
                      value={newEvent.endDate}
                      onChange={(e) => setNewEvent(prev => ({ ...prev, endDate: e.target.value }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Location</label>
                    <input
                      type="text"
                      value={newEvent.location}
                      onChange={(e) => setNewEvent(prev => ({ ...prev, location: e.target.value }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Attendees (comma-separated emails)</label>
                    <input
                      type="text"
                      value={newEvent.attendees}
                      onChange={(e) => setNewEvent(prev => ({ ...prev, attendees: e.target.value }))}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                      placeholder="user1@example.com, user2@example.com"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Description</label>
                  <textarea
                    value={newEvent.description}
                    onChange={(e) => setNewEvent(prev => ({ ...prev, description: e.target.value }))}
                    rows={3}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
                <button
                  type="submit"
                  className="bg-green-500 hover:bg-green-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
                  disabled={creating}
                >
                  {creating ? 'Creating...' : 'Create Event'}
                </button>
              </form>
            </div>
          )}

          <div className="space-y-4">
            {filteredEvents.map((event) => (
              <div key={event.id} className="bg-white shadow rounded-lg p-4 border">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold">{event.title}</h3>
                    <p className="text-sm text-gray-600">
                      {new Date(event.startDate).toLocaleString()} - {new Date(event.endDate).toLocaleString()}
                    </p>
                    {event.location && (
                      <p className="text-sm text-gray-600">📍 {event.location}</p>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 text-xs font-semibold rounded ${getStatusColor(event.status)}`}>
                      {event.status}
                    </span>
                    <div className="flex space-x-1">
                      {event.status !== 'confirmed' && (
                        <button
                          onClick={() => updateEventStatus(event.id, 'confirmed')}
                          className="bg-green-500 hover:bg-green-700 text-white text-xs px-2 py-1 rounded"
                        >
                          Confirm
                        </button>
                      )}
                      {event.status !== 'cancelled' && (
                        <button
                          onClick={() => updateEventStatus(event.id, 'cancelled')}
                          className="bg-red-500 hover:bg-red-700 text-white text-xs px-2 py-1 rounded"
                        >
                          Cancel
                        </button>
                      )}
                      <button
                        onClick={() => deleteEvent(event.id)}
                        className="bg-gray-500 hover:bg-gray-700 text-white text-xs px-2 py-1 rounded"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>

                {event.description && (
                  <p className="text-gray-700 mb-4">{event.description}</p>
                )}

                {event.attendees.length > 0 && (
                  <div className="mb-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">Attendees:</p>
                    <div className="flex flex-wrap gap-2">
                      {event.attendees.map((attendee, index) => (
                        <span key={index} className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                          {attendee}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="text-xs text-gray-500">
                  <p>Created: {new Date(event.createdAt).toLocaleString()}</p>
                  <p>Updated: {new Date(event.updatedAt).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>

          {filteredEvents.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500">
                {selectedDate
                  ? `No events found for ${new Date(selectedDate).toLocaleDateString()}.`
                  : 'No events found. Create your first event to get started.'
                }
              </p>
            </div>
          )}
        </div>
      )}

      {/* Calendars Tab */}
      {activeTab === 'calendars' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Connected Calendars</h2>
            <button
              onClick={loadCalendars}
              className="bg-gray-500 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded"
            >
              Refresh
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {calendars.map((calendar) => (
              <div key={calendar.id} className="bg-white shadow rounded-lg p-4 border">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div
                      className="w-4 h-4 rounded"
                      style={{ backgroundColor: calendar.color }}
                    ></div>
                    <div>
                      <h3 className="text-lg font-semibold">{calendar.name}</h3>
                      <span className={`px-2 py-1 text-xs font-semibold rounded ${getProviderColor(calendar.provider)}`}>
                        {calendar.provider}
                      </span>
                    </div>
                  </div>
                  {calendar.isPrimary && (
                    <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded font-semibold">
                      Primary
                    </span>
                  )}
                </div>

                {calendar.description && (
                  <p className="text-gray-600 mb-4">{calendar.description}</p>
                )}

                <div className="space-y-2 text-sm text-gray-600 mb-4">
                  <p><strong>Sync:</strong> {calendar.syncEnabled ? 'Enabled' : 'Disabled'}</p>
                  {calendar.lastSyncAt && (
                    <p><strong>Last Sync:</strong> {new Date(calendar.lastSyncAt).toLocaleString()}</p>
                  )}
                </div>

                <button
                  onClick={() => syncCalendar(calendar.id)}
                  className="w-full bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                  disabled={!calendar.syncEnabled}
                >
                  Sync Now
                </button>
              </div>
            ))}
          </div>

          {calendars.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500">No calendars connected. Connect a calendar provider to get started.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CalendarIntegrationServicePage;
