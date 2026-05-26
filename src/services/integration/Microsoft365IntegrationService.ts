import { prisma } from '@/config/database';
import { logger } from '@/config/logger';
import axios, { AxiosInstance } from 'axios';

export interface Microsoft365Config {
  clientId: string;
  clientSecret: string;
  tenantId: string;
  redirectUri: string;
  scopes: string[];
}

export interface Microsoft365Token {
  accessToken: string;
  refreshToken?: string;
  expiresAt: Date;
  tokenType: string;
}

export interface SharePointSite {
  id: string;
  name: string;
  webUrl: string;
  displayName: string;
}

export interface OutlookEvent {
  id?: string;
  subject: string;
  body: {
    contentType: string;
    content: string;
  };
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
  location?: {
    displayName: string;
  };
  attendees?: Array<{
    emailAddress: {
      address: string;
      name: string;
    };
  }>;
}

export interface TeamsChannel {
  id: string;
  displayName: string;
  description?: string;
  webUrl: string;
}

export class Microsoft365IntegrationService {
  private readonly graphClient: AxiosInstance;
  private token: Microsoft365Token | null = null;

  constructor(private readonly config: Microsoft365Config) {
    this.graphClient = axios.create({
      baseURL: 'https://graph.microsoft.com/v1.0',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add request interceptor to include access token
    this.graphClient.interceptors.request.use(async (config) => {
      await this.ensureValidToken();
      if (this.token) {
        config.headers.Authorization = `${this.token.tokenType} ${this.token.accessToken}`;
      }
      return config;
    });
  }

  /**
   * Authenticate with Microsoft 365 using client credentials flow
   */
  async authenticate(authCode?: string, refreshToken?: string): Promise<Microsoft365Token> {
    try {
      let response;

      if (authCode) {
        // Authorization code flow
        response = await axios.post(`https://login.microsoftonline.com/${this.config.tenantId}/oauth2/v2.0/token`, {
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret,
          code: authCode,
          redirect_uri: this.config.redirectUri,
          grant_type: 'authorization_code',
          scope: this.config.scopes.join(' '),
        }, {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });
      } else if (refreshToken) {
        // Refresh token flow
        response = await axios.post(`https://login.microsoftonline.com/${this.config.tenantId}/oauth2/v2.0/token`, {
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret,
          refresh_token: refreshToken,
          grant_type: 'refresh_token',
          scope: this.config.scopes.join(' '),
        }, {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });
      } else {
        // Client credentials flow for app-only access
        response = await axios.post(`https://login.microsoftonline.com/${this.config.tenantId}/oauth2/v2.0/token`, {
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret,
          scope: 'https://graph.microsoft.com/.default',
          grant_type: 'client_credentials',
        }, {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });
      }

      this.token = {
        accessToken: response.data.access_token,
        refreshToken: response.data.refresh_token,
        expiresAt: new Date(Date.now() + (response.data.expires_in * 1000)),
        tokenType: response.data.token_type,
      };

      logger.info('Microsoft 365 authentication successful', {
        expiresAt: this.token.expiresAt,
        hasRefreshToken: !!this.token.refreshToken,
      });

      return this.token;
    } catch (error: unknown) {
      logger.error('Microsoft 365 authentication failed', { error });
      throw error;
    }
  }

  /**
   * Ensure token is valid, refresh if necessary
   */
  private async ensureValidToken(): Promise<void> {
    if (!this.token || new Date() >= this.token.expiresAt) {
      if (this.token?.refreshToken) {
        await this.authenticate(undefined, this.token.refreshToken);
      } else {
        await this.authenticate();
      }
    }
  }

  /**
   * Get authorization URL for OAuth2 flow
   */
  getAuthorizationUrl(state?: string): string {
    const params = new URLSearchParams({
      client_id: this.config.clientId,
      response_type: 'code',
      redirect_uri: this.config.redirectUri,
      scope: this.config.scopes.join(' '),
      response_mode: 'query',
      state: state || '',
    });

    return `https://login.microsoftonline.com/${this.config.tenantId}/oauth2/v2.0/authorize?${params.toString()}`;
  }

  /**
   * Create calendar event in Outlook
   */
  async createCalendarEvent(userId: string, event: OutlookEvent): Promise<OutlookEvent> {
    try {
      const response = await this.graphClient.post(`/users/${userId}/events`, event);
      
      logger.info('Outlook calendar event created', {
        userId,
        eventId: response.data.id,
        subject: event.subject,
      });

      return response.data;
    } catch (error: unknown) {
      logger.error('Outlook calendar event creation failed', { userId, event, error });
      throw error;
    }
  }

  /**
   * Update calendar event in Outlook
   */
  async updateCalendarEvent(userId: string, eventId: string, event: Partial<OutlookEvent>): Promise<void> {
    try {
      await this.graphClient.patch(`/users/${userId}/events/${eventId}`, event);
      
      logger.info('Outlook calendar event updated', {
        userId,
        eventId,
      });
    } catch (error: unknown) {
      logger.error('Outlook calendar event update failed', { userId, eventId, event, error });
      throw error;
    }
  }

  /**
   * Delete calendar event from Outlook
   */
  async deleteCalendarEvent(userId: string, eventId: string): Promise<void> {
    try {
      await this.graphClient.delete(`/users/${userId}/events/${eventId}`);
      
      logger.info('Outlook calendar event deleted', {
        userId,
        eventId,
      });
    } catch (error: unknown) {
      logger.error('Outlook calendar event deletion failed', { userId, eventId, error });
      throw error;
    }
  }

  /**
   * Get calendar events from Outlook
   */
  async getCalendarEvents(userId: string, startDate?: Date, endDate?: Date): Promise<OutlookEvent[]> {
    try {
      const url = `/users/${userId}/events`;
      const params: any = {};

      if (startDate && endDate) {
        params.$filter = `start/dateTime ge '${startDate.toISOString()}' and end/dateTime le '${endDate.toISOString()}'`;
      }

      const response = await this.graphClient.get(url, { params });
      return response.data.value;
    } catch (error: unknown) {
      logger.error('Outlook calendar events retrieval failed', { userId, error });
      throw error;
    }
  }

  /**
   * Create SharePoint document library for property documents
   */
  async createDocumentLibrary(siteId: string, libraryName: string, description?: string): Promise<any> {
    try {
      const library = {
        name: libraryName,
        description: description || `Document library for ${libraryName}`,
        '@odata.type': 'microsoft.graph.list',
        list: {
          template: 'documentLibrary',
        },
      };

      const response = await this.graphClient.post(`/sites/${siteId}/lists`, library);

      logger.info('SharePoint document library created', {
        siteId,
        libraryName,
        libraryId: response.data.id,
      });

      return response.data;
    } catch (error: unknown) {
      logger.error('SharePoint document library creation failed', { siteId, libraryName, error });
      throw error;
    }
  }

  /**
   * Upload file to SharePoint
   */
  async uploadFileToSharePoint(
    siteId: string,
    libraryId: string,
    fileName: string,
    fileContent: Buffer,
    folderPath?: string
  ): Promise<any> {
    try {
      const uploadPath = folderPath 
        ? `/sites/${siteId}/lists/${libraryId}/drive/root:/${folderPath}/${fileName}:/content`
        : `/sites/${siteId}/lists/${libraryId}/drive/root:/${fileName}:/content`;

      const response = await this.graphClient.put(uploadPath, fileContent, {
        headers: {
          'Content-Type': 'application/octet-stream',
        },
      });

      logger.info('File uploaded to SharePoint', {
        siteId,
        libraryId,
        fileName,
        fileId: response.data.id,
      });

      return response.data;
    } catch (error: unknown) {
      logger.error('SharePoint file upload failed', { siteId, libraryId, fileName, error });
      throw error;
    }
  }

  /**
   * Get SharePoint sites
   */
  async getSharePointSites(): Promise<SharePointSite[]> {
    try {
      const response = await this.graphClient.get('/sites?search=*');
      return response.data.value;
    } catch (error: unknown) {
      logger.error('SharePoint sites retrieval failed', { error });
      throw error;
    }
  }

  /**
   * Create Teams channel for property management
   */
  async createTeamsChannel(teamId: string, channelName: string, description?: string): Promise<TeamsChannel> {
    try {
      const channel = {
        displayName: channelName,
        description: description || `Channel for ${channelName}`,
        membershipType: 'standard',
      };

      const response = await this.graphClient.post(`/teams/${teamId}/channels`, channel);

      logger.info('Teams channel created', {
        teamId,
        channelName,
        channelId: response.data.id,
      });

      return response.data;
    } catch (error: unknown) {
      logger.error('Teams channel creation failed', { teamId, channelName, error });
      throw error;
    }
  }

  /**
   * Send Teams message
   */
  async sendTeamsMessage(teamId: string, channelId: string, message: string): Promise<any> {
    try {
      const chatMessage = {
        body: {
          contentType: 'text',
          content: message,
        },
      };

      const response = await this.graphClient.post(`/teams/${teamId}/channels/${channelId}/messages`, chatMessage);

      logger.info('Teams message sent', {
        teamId,
        channelId,
        messageId: response.data.id,
      });

      return response.data;
    } catch (error: unknown) {
      logger.error('Teams message sending failed', { teamId, channelId, message, error });
      throw error;
    }
  }

  /**
   * Get user profile information
   */
  async getUserProfile(userId: string): Promise<any> {
    try {
      const response = await this.graphClient.get(`/users/${userId}`);
      return response.data;
    } catch (error: unknown) {
      logger.error('User profile retrieval failed', { userId, error });
      throw error;
    }
  }

  /**
   * Search for users in the organization
   */
  async searchUsers(query: string): Promise<any[]> {
    try {
      const response = await this.graphClient.get(`/users?$search="displayName:${query}"`, {
        headers: {
          'ConsistencyLevel': 'eventual',
        },
      });

      return response.data.value;
    } catch (error: unknown) {
      logger.error('User search failed', { query, error });
      throw error;
    }
  }

  /**
   * Sync space booking to Outlook calendar
   */
  async syncBookingToOutlook(bookingData: any): Promise<void> {
    try {
      const event: OutlookEvent = {
        subject: `Space Booking: ${bookingData.space.name}`,
        body: {
          contentType: 'html',
          content: `
            <div>
              <h3>Space Booking Details</h3>
              <p><strong>Space:</strong> ${bookingData.space.name}</p>
              <p><strong>Building:</strong> ${bookingData.space.building?.name}</p>
              <p><strong>Floor:</strong> ${bookingData.space.floor?.name}</p>
              <p><strong>Capacity:</strong> ${bookingData.space.capacity}</p>
              <p><strong>Purpose:</strong> ${bookingData.purpose}</p>
              ${bookingData.notes ? `<p><strong>Notes:</strong> ${bookingData.notes}</p>` : ''}
            </div>
          `,
        },
        start: {
          dateTime: bookingData.startTime,
          timeZone: bookingData.timeZone || 'UTC',
        },
        end: {
          dateTime: bookingData.endTime,
          timeZone: bookingData.timeZone || 'UTC',
        },
        location: {
          displayName: `${bookingData.space.name} - ${bookingData.space.building?.name}`,
        },
      };

      if (bookingData.attendees && bookingData.attendees.length > 0) {
        event.attendees = bookingData.attendees.map((attendee: any) => ({
          emailAddress: {
            address: attendee.email,
            name: attendee.name,
          },
        }));
      }

      const createdEvent = await this.createCalendarEvent(bookingData.bookedBy.email, event);

      // Update local booking with Outlook event ID
      await prisma.spaceBooking.update({
        where: { id: bookingData.id },
        data: {
          externalIntegrations: {
            ...bookingData.externalIntegrations,
            outlookEventId: createdEvent.id,
          },
        },
      });

      logger.info('Booking synced to Outlook', {
        bookingId: bookingData.id,
        eventId: createdEvent.id,
      });
    } catch (error: unknown) {
      logger.error('Booking sync to Outlook failed', { bookingData, error });
      throw error;
    }
  }

  /**
   * Sync maintenance work order to Teams
   */
  async syncWorkOrderToTeams(workOrderData: any, teamId: string, channelId: string): Promise<void> {
    try {
      const message = `
🔧 **New Work Order Created**

**ID:** ${workOrderData.workOrderNumber}
**Priority:** ${workOrderData.priority}
**Status:** ${workOrderData.status}
**Asset:** ${workOrderData.asset?.name || 'N/A'}
**Location:** ${workOrderData.location?.name || 'N/A'}
**Description:** ${workOrderData.description}

**Assigned Technician:** ${workOrderData.assignedTechnician?.name || 'Unassigned'}
**Due Date:** ${workOrderData.dueDate ? new Date(workOrderData.dueDate).toLocaleDateString() : 'Not set'}
      `;

      await this.sendTeamsMessage(teamId, channelId, message);

      logger.info('Work order synced to Teams', {
        workOrderId: workOrderData.id,
        teamId,
        channelId,
      });
    } catch (error: unknown) {
      logger.error('Work order sync to Teams failed', { workOrderData, error });
      throw error;
    }
  }

  /**
   * Create Office 365 group for property management team
   */
  async createPropertyManagementGroup(propertyName: string, description?: string): Promise<any> {
    try {
      const group = {
        displayName: `${propertyName} - Property Management`,
        description: description || `Property management group for ${propertyName}`,
        mailNickname: propertyName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
        groupTypes: ['Unified'],
        mailEnabled: true,
        securityEnabled: false,
        visibility: 'Private',
      };

      const response = await this.graphClient.post('/groups', group);

      logger.info('Office 365 group created', {
        propertyName,
        groupId: response.data.id,
        displayName: response.data.displayName,
      });

      return response.data;
    } catch (error: unknown) {
      logger.error('Office 365 group creation failed', { propertyName, error });
      throw error;
    }
  }

  /**
   * Bulk operations for better performance
   */
  async batchRequest(requests: Array<{ url: string; method: string; body?: any }>): Promise<any> {
    try {
      const batchPayload = {
        requests: requests.map((req, index) => ({
          id: index.toString(),
          method: req.method.toUpperCase(),
          url: req.url,
          body: req.body,
          headers: {
            'Content-Type': 'application/json',
          },
        })),
      };

      const response = await this.graphClient.post('/$batch', batchPayload);

      logger.info('Microsoft 365 batch request completed', {
        requestCount: requests.length,
      });

      return response.data;
    } catch (error: unknown) {
      logger.error('Microsoft 365 batch request failed', { requests, error });
      throw error;
    }
  }
}