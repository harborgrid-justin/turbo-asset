/**
 * Calendar Integration Service - Multi-platform calendar synchronization
 * 
 * This service handles calendar integration with multiple providers including
 * Google Calendar, Outlook Calendar, and other CalDAV/iCal sources.
 * Migrated from legacy CalendarIntegrationService with enhanced domain architecture.
 */

import { EventEmitter } from 'events';
import { prisma } from '../../../../../config/database';
import { logger } from '../../../../../config/logger';
import axios, { AxiosInstance } from 'axios';

export interface CalendarProvider {
  type: 'GOOGLE' | 'OUTLOOK' | 'CALDAV' | 'EXCHANGE';
  name: string;
  config: {
    clientId?: string;
    clientSecret?: string;
    serverUrl?: string;
    username?: string;
    password?: string;
  };
}

export interface CalendarEvent {
  id?: string;
  title: string;
  description?: string;
  startTime: Date;
  endTime: Date;
  allDay?: boolean;
  location?: string;
  attendees?: Array<{
    email: string;
    name?: string;
    status: 'accepted' | 'declined' | 'tentative' | 'needsAction';
    required: boolean;
  }>;
  recurrence?: {
    frequency: 'daily' | 'weekly' | 'monthly' | 'yearly';
    interval: number;
    endDate?: Date;
    count?: number;
  };
  reminders?: Array<{
    method: 'email' | 'popup';
    minutesBefore: number;
  }>;
  visibility: 'public' | 'private' | 'confidential';
  status: 'confirmed' | 'tentative' | 'cancelled';
  organizer?: {
    email: string;
    name?: string;
  };
  created?: Date;
  updated?: Date;
  source: {
    provider: string;
    calendarId: string;
    externalId: string;
  };
}

export interface Calendar {
  id: string;
  name: string;
  description?: string;
  timeZone: string;
  color?: string;
  provider: CalendarProvider['type'];
  isDefault: boolean;
  accessRole: 'owner' | 'reader' | 'writer' | 'freeBusyReader';
  selected: boolean;
  lastSyncTime?: Date;
}

export interface FreeBusyInfo {
  email: string;
  busyTimes: Array<{
    startTime: Date;
    endTime: Date;
  }>;
}

export interface SyncResult {
  syncId: string;
  startedAt: Date;
  completedAt?: Date;
  status: 'running' | 'completed' | 'failed';
  eventsProcessed: number;
  eventsCreated: number;
  eventsUpdated: number;
  eventsDeleted: number;
  conflicts: Array<{
    eventId: string;
    conflictType: 'duplicate' | 'time_overlap' | 'permission';
    description: string;
  }>;
  errors: string[];
}

export interface IntegrationContext {
  organizationId: string;
  userId: string;
  permissions: string[];
}

export class CalendarIntegrationService extends EventEmitter {
  private providers: Map<string, CalendarProvider> = new Map();
  private calendarsCache: Map<string, Calendar[]> = new Map();
  private eventsCache: Map<string, CalendarEvent[]> = new Map();
  private syncOperations: Map<string, SyncResult> = new Map();

  constructor(private context?: IntegrationContext) {
    super();
    this.setupCacheManagement();
    logger.info('Calendar Integration Service initialized', {
      organizationId: context?.organizationId
    });
  }

  private setupCacheManagement(): void {
    // Clear events cache every 15 minutes
    setInterval(() => {
      this.eventsCache.clear();
      logger.debug('Calendar events cache cleared');
    }, 15 * 60 * 1000);

    // Clear calendars cache every hour
    setInterval(() => {
      this.calendarsCache.clear();
      logger.debug('Calendar calendars cache cleared');
    }, 60 * 60 * 1000);
  }

  async addCalendarProvider(provider: CalendarProvider): Promise<void> {
    try {
      this.providers.set(provider.name, provider);
      
      // Test connection
      await this.testProviderConnection(provider);

      // Store provider configuration
      if (this.context?.organizationId) {
        await this.storeProviderConfig(provider);
      }

      this.emit('provider:added', {
        providerName: provider.name,
        providerType: provider.type,
        organizationId: this.context?.organizationId
      });

      logger.info('Calendar provider added successfully', {
        name: provider.name,
        type: provider.type
      });
    } catch (error) {
      logger.error('Failed to add calendar provider', {
        providerName: provider.name,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  async getCalendars(providerName?: string): Promise<Calendar[]> {
    try {
      const cacheKey = providerName || 'all';
      const cached = this.calendarsCache.get(cacheKey);
      if (cached) return cached;

      const calendars: Calendar[] = [];
      const providersToQuery = providerName 
        ? [this.providers.get(providerName)].filter(Boolean) as CalendarProvider[]
        : Array.from(this.providers.values());

      for (const provider of providersToQuery) {
        const providerCalendars = await this.getCalendarsFromProvider(provider);
        calendars.push(...providerCalendars);
      }

      this.calendarsCache.set(cacheKey, calendars);

      this.emit('calendars:retrieved', {
        count: calendars.length,
        providerName,
        organizationId: this.context?.organizationId
      });

      return calendars;
    } catch (error) {
      logger.error('Failed to get calendars', {
        providerName,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  async getEvents(
    calendarId: string,
    startDate: Date,
    endDate: Date,
    providerName?: string
  ): Promise<CalendarEvent[]> {
    try {
      const cacheKey = `events_${calendarId}_${startDate.toISOString()}_${endDate.toISOString()}`;
      const cached = this.eventsCache.get(cacheKey);
      if (cached) return cached;

      const provider = providerName 
        ? this.providers.get(providerName)
        : this.findProviderByCalendar(calendarId);

      if (!provider) {
        throw new Error(`Provider not found for calendar: ${calendarId}`);
      }

      const events = await this.getEventsFromProvider(provider, calendarId, startDate, endDate);
      this.eventsCache.set(cacheKey, events);

      this.emit('events:retrieved', {
        calendarId,
        count: events.length,
        dateRange: { startDate, endDate },
        organizationId: this.context?.organizationId
      });

      return events;
    } catch (error) {
      logger.error('Failed to get calendar events', {
        calendarId,
        startDate,
        endDate,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  async createEvent(
    calendarId: string,
    event: Omit<CalendarEvent, 'id' | 'created' | 'updated' | 'source'>,
    providerName?: string
  ): Promise<CalendarEvent> {
    try {
      const provider = providerName 
        ? this.providers.get(providerName)
        : this.findProviderByCalendar(calendarId);

      if (!provider) {
        throw new Error(`Provider not found for calendar: ${calendarId}`);
      }

      const createdEvent = await this.createEventInProvider(provider, calendarId, event);
      
      // Clear related caches
      this.eventsCache.clear();

      this.emit('event:created', {
        eventId: createdEvent.id,
        calendarId,
        title: createdEvent.title,
        startTime: createdEvent.startTime,
        organizationId: this.context?.organizationId
      });

      return createdEvent;
    } catch (error) {
      logger.error('Failed to create calendar event', {
        calendarId,
        eventTitle: event.title,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  async updateEvent(
    eventId: string,
    calendarId: string,
    updates: Partial<CalendarEvent>,
    providerName?: string
  ): Promise<CalendarEvent> {
    try {
      const provider = providerName 
        ? this.providers.get(providerName)
        : this.findProviderByCalendar(calendarId);

      if (!provider) {
        throw new Error(`Provider not found for calendar: ${calendarId}`);
      }

      const updatedEvent = await this.updateEventInProvider(provider, eventId, calendarId, updates);
      
      // Clear related caches
      this.eventsCache.clear();

      this.emit('event:updated', {
        eventId,
        calendarId,
        updates: Object.keys(updates),
        organizationId: this.context?.organizationId
      });

      return updatedEvent;
    } catch (error) {
      logger.error('Failed to update calendar event', {
        eventId,
        calendarId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  async deleteEvent(eventId: string, calendarId: string, providerName?: string): Promise<void> {
    try {
      const provider = providerName 
        ? this.providers.get(providerName)
        : this.findProviderByCalendar(calendarId);

      if (!provider) {
        throw new Error(`Provider not found for calendar: ${calendarId}`);
      }

      await this.deleteEventInProvider(provider, eventId, calendarId);
      
      // Clear related caches
      this.eventsCache.clear();

      this.emit('event:deleted', {
        eventId,
        calendarId,
        organizationId: this.context?.organizationId
      });

      logger.info('Calendar event deleted successfully', { eventId, calendarId });
    } catch (error) {
      logger.error('Failed to delete calendar event', {
        eventId,
        calendarId,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  async getFreeBusyInfo(
    emails: string[],
    startTime: Date,
    endTime: Date,
    providerName?: string
  ): Promise<FreeBusyInfo[]> {
    try {
      const freeBusyData: FreeBusyInfo[] = [];
      const providersToQuery = providerName 
        ? [this.providers.get(providerName)].filter(Boolean) as CalendarProvider[]
        : Array.from(this.providers.values());

      for (const provider of providersToQuery) {
        const providerFreeBusy = await this.getFreeBusyFromProvider(
          provider,
          emails,
          startTime,
          endTime
        );
        freeBusyData.push(...providerFreeBusy);
      }

      this.emit('freebusy:retrieved', {
        emails,
        startTime,
        endTime,
        resultCount: freeBusyData.length,
        organizationId: this.context?.organizationId
      });

      return freeBusyData;
    } catch (error) {
      logger.error('Failed to get free/busy information', {
        emails,
        startTime,
        endTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  async syncCalendars(): Promise<SyncResult> {
    const syncId = `calendar-sync-${Date.now()}`;
    const syncResult: SyncResult = {
      syncId,
      startedAt: new Date(),
      status: 'running',
      eventsProcessed: 0,
      eventsCreated: 0,
      eventsUpdated: 0,
      eventsDeleted: 0,
      conflicts: [],
      errors: []
    };

    this.syncOperations.set(syncId, syncResult);

    try {
      logger.info('Starting calendar synchronization', { syncId });

      const calendars = await this.getCalendars();
      const endDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000); // 90 days ahead
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days back

      for (const calendar of calendars) {
        try {
          const events = await this.getEvents(calendar.id, startDate, endDate);
          
          for (const event of events) {
            syncResult.eventsProcessed++;
            
            // Sync logic would go here - for demo, we'll just count
            if (event.created && event.created > new Date(Date.now() - 24 * 60 * 60 * 1000)) {
              syncResult.eventsCreated++;
            } else {
              syncResult.eventsUpdated++;
            }
          }

          // Update calendar sync time
          await this.updateCalendarSyncTime(calendar.id);

        } catch (error) {
          syncResult.errors.push(
            `Calendar ${calendar.name}: ${error instanceof Error ? error.message : 'Unknown error'}`
          );
        }
      }

      syncResult.completedAt = new Date();
      syncResult.status = 'completed';

      this.emit('sync:completed', {
        syncId,
        results: syncResult,
        organizationId: this.context?.organizationId
      });

      logger.info('Calendar synchronization completed', {
        syncId,
        eventsProcessed: syncResult.eventsProcessed,
        errorCount: syncResult.errors.length
      });

    } catch (error) {
      syncResult.status = 'failed';
      syncResult.completedAt = new Date();
      syncResult.errors.push(`Sync failed: ${error instanceof Error ? error.message : 'Unknown error'}`);

      logger.error('Calendar synchronization failed', { syncId, error });
    }

    return syncResult;
  }

  // Provider-specific implementations
  private async testProviderConnection(provider: CalendarProvider): Promise<void> {
    switch (provider.type) {
      case 'GOOGLE':
        await this.testGoogleConnection(provider);
        break;
      case 'OUTLOOK':
        await this.testOutlookConnection(provider);
        break;
      case 'CALDAV':
        await this.testCalDAVConnection(provider);
        break;
      case 'EXCHANGE':
        await this.testExchangeConnection(provider);
        break;
    }
  }

  private async testGoogleConnection(provider: CalendarProvider): Promise<void> {
    // Google Calendar API connection test
    try {
      const client = axios.create({
        baseURL: 'https://www.googleapis.com/calendar/v3',
        timeout: 10000,
        headers: {
          'Authorization': `Bearer ${provider.config.clientSecret}` // In real implementation, would use OAuth token
        }
      });

      await client.get('/users/me/calendarList');
      logger.info('Google Calendar connection test successful');
    } catch (error) {
      logger.error('Google Calendar connection test failed', { error });
      throw new Error('Failed to connect to Google Calendar');
    }
  }

  private async testOutlookConnection(provider: CalendarProvider): Promise<void> {
    // Microsoft Graph API connection test
    try {
      const client = axios.create({
        baseURL: 'https://graph.microsoft.com/v1.0',
        timeout: 10000,
        headers: {
          'Authorization': `Bearer ${provider.config.clientSecret}` // In real implementation, would use OAuth token
        }
      });

      await client.get('/me/calendars');
      logger.info('Outlook Calendar connection test successful');
    } catch (error) {
      logger.error('Outlook Calendar connection test failed', { error });
      throw new Error('Failed to connect to Outlook Calendar');
    }
  }

  private async testCalDAVConnection(provider: CalendarProvider): Promise<void> {
    // CalDAV connection test
    try {
      const client = axios.create({
        baseURL: provider.config.serverUrl,
        timeout: 10000,
        auth: {
          username: provider.config.username || '',
          password: provider.config.password || ''
        }
      });

      await client.request({
        method: 'PROPFIND',
        url: '/',
        headers: {
          'Depth': '0',
          'Content-Type': 'application/xml'
        }
      });

      logger.info('CalDAV connection test successful');
    } catch (error) {
      logger.error('CalDAV connection test failed', { error });
      throw new Error('Failed to connect to CalDAV server');
    }
  }

  private async testExchangeConnection(provider: CalendarProvider): Promise<void> {
    // Exchange Web Services connection test
    logger.info('Exchange connection test - placeholder implementation');
    // In real implementation, would test EWS connection
  }

  private async getCalendarsFromProvider(provider: CalendarProvider): Promise<Calendar[]> {
    switch (provider.type) {
      case 'GOOGLE':
        return this.getGoogleCalendars(provider);
      case 'OUTLOOK':
        return this.getOutlookCalendars(provider);
      case 'CALDAV':
        return this.getCalDAVCalendars(provider);
      case 'EXCHANGE':
        return this.getExchangeCalendars(provider);
      default:
        return [];
    }
  }

  private async getGoogleCalendars(provider: CalendarProvider): Promise<Calendar[]> {
    // Simplified Google Calendar implementation
    return [
      {
        id: 'google-primary',
        name: 'Primary Calendar',
        timeZone: 'UTC',
        provider: 'GOOGLE',
        isDefault: true,
        accessRole: 'owner',
        selected: true
      }
    ];
  }

  private async getOutlookCalendars(provider: CalendarProvider): Promise<Calendar[]> {
    // Simplified Outlook Calendar implementation
    return [
      {
        id: 'outlook-primary',
        name: 'Calendar',
        timeZone: 'UTC',
        provider: 'OUTLOOK',
        isDefault: true,
        accessRole: 'owner',
        selected: true
      }
    ];
  }

  private async getCalDAVCalendars(provider: CalendarProvider): Promise<Calendar[]> {
    // Simplified CalDAV implementation
    return [
      {
        id: 'caldav-default',
        name: 'Default Calendar',
        timeZone: 'UTC',
        provider: 'CALDAV',
        isDefault: true,
        accessRole: 'owner',
        selected: true
      }
    ];
  }

  private async getExchangeCalendars(provider: CalendarProvider): Promise<Calendar[]> {
    // Simplified Exchange implementation
    return [
      {
        id: 'exchange-primary',
        name: 'Mailbox Calendar',
        timeZone: 'UTC',
        provider: 'EXCHANGE',
        isDefault: true,
        accessRole: 'owner',
        selected: true
      }
    ];
  }

  private async getEventsFromProvider(
    provider: CalendarProvider,
    calendarId: string,
    startDate: Date,
    endDate: Date
  ): Promise<CalendarEvent[]> {
    // Simplified implementation - in real version would call provider APIs
    const mockEvents: CalendarEvent[] = [
      {
        id: `event-${Date.now()}`,
        title: 'Sample Event',
        startTime: new Date(),
        endTime: new Date(Date.now() + 60 * 60 * 1000), // 1 hour later
        visibility: 'public',
        status: 'confirmed',
        source: {
          provider: provider.name,
          calendarId,
          externalId: `ext-${Date.now()}`
        }
      }
    ];

    return mockEvents;
  }

  private async createEventInProvider(
    provider: CalendarProvider,
    calendarId: string,
    event: Omit<CalendarEvent, 'id' | 'created' | 'updated' | 'source'>
  ): Promise<CalendarEvent> {
    // Simplified implementation - in real version would call provider APIs
    const createdEvent: CalendarEvent = {
      ...event,
      id: `event-${Date.now()}`,
      created: new Date(),
      updated: new Date(),
      source: {
        provider: provider.name,
        calendarId,
        externalId: `ext-${Date.now()}`
      }
    };

    return createdEvent;
  }

  private async updateEventInProvider(
    provider: CalendarProvider,
    eventId: string,
    calendarId: string,
    updates: Partial<CalendarEvent>
  ): Promise<CalendarEvent> {
    // Simplified implementation - in real version would call provider APIs
    const updatedEvent: CalendarEvent = {
      id: eventId,
      title: updates.title || 'Updated Event',
      startTime: updates.startTime || new Date(),
      endTime: updates.endTime || new Date(Date.now() + 60 * 60 * 1000),
      visibility: updates.visibility || 'public',
      status: updates.status || 'confirmed',
      updated: new Date(),
      source: {
        provider: provider.name,
        calendarId,
        externalId: `ext-${eventId}`
      }
    };

    return updatedEvent;
  }

  private async deleteEventInProvider(
    provider: CalendarProvider,
    eventId: string,
    calendarId: string
  ): Promise<void> {
    // Simplified implementation - in real version would call provider APIs
    logger.info('Event deleted from provider', { eventId, calendarId, provider: provider.name });
  }

  private async getFreeBusyFromProvider(
    provider: CalendarProvider,
    emails: string[],
    startTime: Date,
    endTime: Date
  ): Promise<FreeBusyInfo[]> {
    // Simplified implementation
    return emails.map(email => ({
      email,
      busyTimes: [
        {
          startTime: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
          endTime: new Date(Date.now() + 3 * 60 * 60 * 1000)    // 3 hours from now
        }
      ]
    }));
  }

  private findProviderByCalendar(calendarId: string): CalendarProvider | undefined {
    // Simplified provider lookup based on calendar ID pattern
    if (calendarId.includes('google')) {
      return Array.from(this.providers.values()).find(p => p.type === 'GOOGLE');
    } else if (calendarId.includes('outlook')) {
      return Array.from(this.providers.values()).find(p => p.type === 'OUTLOOK');
    }
    
    // Return first available provider as fallback
    return Array.from(this.providers.values())[0];
  }

  private async storeProviderConfig(provider: CalendarProvider): Promise<void> {
    try {
      if (!this.context?.organizationId) return;

      await prisma.calendarProvider.upsert({
        where: {
          organizationId_name: {
            organizationId: this.context.organizationId,
            name: provider.name
          }
        },
        update: {
          type: provider.type,
          config: JSON.stringify(provider.config),
          updatedAt: new Date()
        },
        create: {
          organizationId: this.context.organizationId,
          name: provider.name,
          type: provider.type,
          config: JSON.stringify(provider.config)
        }
      });
    } catch (error) {
      logger.error('Failed to store provider config', { providerName: provider.name, error });
    }
  }

  private async updateCalendarSyncTime(calendarId: string): Promise<void> {
    try {
      if (!this.context?.organizationId) return;

      await prisma.calendarSyncStatus.upsert({
        where: {
          organizationId_calendarId: {
            organizationId: this.context.organizationId,
            calendarId
          }
        },
        update: {
          lastSyncTime: new Date()
        },
        create: {
          organizationId: this.context.organizationId,
          calendarId,
          lastSyncTime: new Date()
        }
      });
    } catch (error) {
      logger.error('Failed to update calendar sync time', { calendarId, error });
    }
  }

  // Public API methods
  getSyncStatus(syncId: string): SyncResult | null {
    return this.syncOperations.get(syncId) || null;
  }

  getProviders(): CalendarProvider[] {
    return Array.from(this.providers.values());
  }

  removeProvider(providerName: string): void {
    this.providers.delete(providerName);
    this.calendarsCache.clear();
    this.eventsCache.clear();
    
    this.emit('provider:removed', {
      providerName,
      organizationId: this.context?.organizationId
    });

    logger.info('Calendar provider removed', { providerName });
  }

  clearCache(): void {
    this.calendarsCache.clear();
    this.eventsCache.clear();
    logger.info('Calendar integration cache cleared');
  }

  async checkIntegrationHealth(): Promise<{
    status: 'healthy' | 'warning' | 'error';
    providers: Array<{
      name: string;
      type: string;
      status: 'connected' | 'disconnected' | 'error';
      lastChecked: Date;
    }>;
  }> {
    const healthCheck = {
      status: 'healthy' as const,
      providers: [] as Array<{
        name: string;
        type: string;
        status: 'connected' | 'disconnected' | 'error';
        lastChecked: Date;
      }>
    };

    let healthyCount = 0;
    const totalProviders = this.providers.size;

    for (const [name, provider] of this.providers) {
      const providerHealth = {
        name,
        type: provider.type,
        status: 'connected' as const,
        lastChecked: new Date()
      };

      try {
        await this.testProviderConnection(provider);
        healthyCount++;
      } catch (error) {
        providerHealth.status = 'error';
        logger.warn(`Calendar provider ${name} health check failed`, { error });
      }

      healthCheck.providers.push(providerHealth);
    }

    // Determine overall health
    if (healthyCount === 0) {
      healthCheck.status = 'error';
    } else if (healthyCount < totalProviders) {
      healthCheck.status = 'warning';
    }

    return healthCheck;
  }
}