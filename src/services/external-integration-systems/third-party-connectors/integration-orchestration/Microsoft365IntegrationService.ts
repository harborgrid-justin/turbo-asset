/**
 * Microsoft 365 Integration Service - Office 365 and Teams integration
 * 
 * This service handles comprehensive Microsoft 365 integration including SharePoint,
 * Outlook, Teams, OneDrive, and other Office 365 services. Migrated from legacy
 * Microsoft365IntegrationService with enhanced domain architecture.
 */

import { EventEmitter } from 'events';
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
  description?: string;
  createdDateTime: Date;
  lastModifiedDateTime: Date;
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

export interface IntegrationContext {
  organizationId: string;
  userId: string;
  permissions: string[];
}

export class Microsoft365IntegrationService extends EventEmitter {
  private readonly graphClient: AxiosInstance;
  private token: Microsoft365Token | null = null;
  private readonly context?: IntegrationContext;

  constructor(private readonly config: Microsoft365Config, context?: IntegrationContext) {
    super();
    this.context = context;
    
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
        // Client credentials flow
        response = await axios.post(`https://login.microsoftonline.com/${this.config.tenantId}/oauth2/v2.0/token`, {
          client_id: this.config.clientId,
          client_secret: this.config.clientSecret,
          grant_type: 'client_credentials',
          scope: 'https://graph.microsoft.com/.default',
        }, {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });
      }

      this.token = {
        accessToken: response.data.access_token,
        refreshToken: response.data.refresh_token,
        expiresAt: new Date(Date.now() + (response.data.expires_in * 1000)),
        tokenType: response.data.token_type || 'Bearer',
      };

      logger.info('Microsoft 365 authentication successful');
      this.emit('authenticated', { organizationId: this.context?.organizationId });
      
      return this.token;
    } catch (error: unknown) {
      logger.error('Microsoft 365 authentication failed', error);
      throw error;
    }
  }

  /**
   * Ensure we have a valid access token
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

      this.emit('calendar:eventCreated', {
        userId,
        eventId: response.data.id,
        organizationId: this.context?.organizationId
      });

      return response.data;
    } catch (error: unknown) {
      logger.error('Outlook calendar event creation failed', { userId, event, error });
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

      this.emit('sharepoint:libraryCreated', {
        siteId,
        libraryId: response.data.id,
        organizationId: this.context?.organizationId
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
        fileId: response.data.id
      });

      this.emit('sharepoint:fileUploaded', {
        siteId,
        libraryId,
        fileId: response.data.id,
        fileName,
        organizationId: this.context?.organizationId
      });

      return response.data;
    } catch (error: unknown) {
      logger.error('SharePoint file upload failed', { siteId, libraryId, fileName, error });
      throw error;
    }
  }

  /**
   * Create Teams channel
   */
  async createTeamsChannel(teamId: string, channelName: string, description?: string): Promise<TeamsChannel> {
    try {
      const channel = {
        displayName: channelName,
        description: description || `Channel for ${channelName}`,
        membershipType: 'standard'
      };

      const response = await this.graphClient.post(`/teams/${teamId}/channels`, channel);

      logger.info('Teams channel created', {
        teamId,
        channelId: response.data.id,
        channelName
      });

      this.emit('teams:channelCreated', {
        teamId,
        channelId: response.data.id,
        organizationId: this.context?.organizationId
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
      const messageData = {
        body: {
          contentType: 'text',
          content: message
        }
      };

      const response = await this.graphClient.post(`/teams/${teamId}/channels/${channelId}/messages`, messageData);

      logger.info('Teams message sent', {
        teamId,
        channelId,
        messageId: response.data.id
      });

      this.emit('teams:messageSent', {
        teamId,
        channelId,
        messageId: response.data.id,
        organizationId: this.context?.organizationId
      });

      return response.data;
    } catch (error: unknown) {
      logger.error('Teams message sending failed', { teamId, channelId, error });
      throw error;
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
   * Test connection to Microsoft 365
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.graphClient.get('/me');
      return true;
    } catch (error: unknown) {
      logger.error('Microsoft 365 connection test failed', error);
      return false;
    }
  }

  /**
   * Get current token info
   */
  getTokenInfo(): Microsoft365Token | null {
    return this.token;
  }
}

export interface TeamsChannel {
  id: string;
  displayName: string;
  description?: string;
  webUrl: string;
  membershipType?: 'standard' | 'private' | 'shared';
  createdDateTime: Date;
}

export interface TeamsMessage {
  id?: string;
  body: {
    contentType: 'text' | 'html';
    content: string;
  };
  from?: {
    user: {
      displayName: string;
      id: string;
    };
  };
  attachments?: Array<{
    id: string;
    contentType: string;
    name: string;
    contentUrl: string;
  }>;
  mentions?: Array<{
    id: number;
    mentionText: string;
    mentioned: {
      user: {
        displayName: string;
        id: string;
      };
    };
  }>;
}

export interface OneDriveFile {
  id: string;
  name: string;
  webUrl: string;
  size: number;
  lastModifiedDateTime: Date;
  createdDateTime: Date;
  folder?: {
    childCount: number;
  };
  file?: {
    mimeType: string;
    hashes: {
      sha1Hash?: string;
      sha256Hash?: string;
      quickXorHash?: string;
    };
  };
}

export interface SharePointList {
  id: string;
  displayName: string;
  description?: string;
  webUrl: string;
  createdDateTime: Date;
  lastModifiedDateTime: Date;
  list: {
    template: string;
    hidden: boolean;
  };
}

export interface IntegrationContext {
  organizationId: string;
  userId: string;
  permissions: string[];
}

export class Microsoft365IntegrationService extends EventEmitter {
  private readonly graphClient: AxiosInstance;
  private token: Microsoft365Token | null = null;
  private tokenRefreshPromise: Promise<void> | null = null;
  private readonly integrationCache: Map<string, any> = new Map();
  private readonly subscriptionCache: Map<string, any> = new Map();

  constructor(
    private readonly config: Microsoft365Config,
    private readonly context?: IntegrationContext
  ) {
    super();
    
    this.graphClient = axios.create({
      baseURL: 'https://graph.microsoft.com/v1.0',
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
    this.setupCacheManagement();
    
    logger.info('Microsoft 365 Integration Service initialized', {
      organizationId: context?.organizationId,
      tenantId: config.tenantId
    });
  }

  /**
   * Setup request/response interceptors
   */
  private setupInterceptors(): void {
    // Request interceptor to include access token
    this.graphClient.interceptors.request.use(async (config) => {
      await this.ensureValidToken();
      if (this.token) {
        config.headers.Authorization = `${this.token.tokenType} ${this.token.accessToken}`;
      }
      return config;
    });

    // Response interceptor for error handling and caching
    this.graphClient.interceptors.response.use(
      (response) => {
        // Cache successful responses if appropriate
        return response;
      },
      async (error) => {
        if (error.response?.status === 401) {
          logger.warn('Microsoft 365 token expired, attempting refresh');
          await this.refreshToken();
          
          // Retry the original request
          const originalRequest = error.config;
          if (!originalRequest._retry) {
            originalRequest._retry = true;
            return await this.graphClient.request(originalRequest);
          }
        }
        
        logger.error('Microsoft 365 API error', {
          status: error.response?.status,
          message: (error as Error).message,
          url: error.config?.url
        });
        
        throw error;
      }
    );
  }

  /**
   * Setup cache management with appropriate TTLs
   */
  private setupCacheManagement(): void {
    // Clear cache every hour
    setInterval(() => {
      this.integrationCache.clear();
      logger.debug('Microsoft 365 integration cache cleared');
    }, 60 * 60 * 1000);
  }

  /**
   * Authenticate with Microsoft 365 using various OAuth flows
   */
  async authenticate(authCode?: string, refreshToken?: string): Promise<Microsoft365Token> {
    try {
      let response;

      if (authCode) {
        // Authorization code flow
        response = await axios.post(
          `https://login.microsoftonline.com/${this.config.tenantId}/oauth2/v2.0/token`,
          new URLSearchParams({
            client_id: this.config.clientId,
            client_secret: this.config.clientSecret,
            code: authCode,
            redirect_uri: this.config.redirectUri,
            grant_type: 'authorization_code',
            scope: this.config.scopes.join(' '),
          }),
          {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
          }
        );
      } else if (refreshToken) {
        // Refresh token flow
        response = await axios.post(
          `https://login.microsoftonline.com/${this.config.tenantId}/oauth2/v2.0/token`,
          new URLSearchParams({
            client_id: this.config.clientId,
            client_secret: this.config.clientSecret,
            refresh_token: refreshToken,
            grant_type: 'refresh_token',
            scope: this.config.scopes.join(' '),
          }),
          {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
          }
        );
      } else {
        // Client credentials flow (application-only)
        response = await axios.post(
          `https://login.microsoftonline.com/${this.config.tenantId}/oauth2/v2.0/token`,
          new URLSearchParams({
            client_id: this.config.clientId,
            client_secret: this.config.clientSecret,
            grant_type: 'client_credentials',
            scope: 'https://graph.microsoft.com/.default',
          }),
          {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
          }
        );
      }

      this.token = {
        accessToken: response.data.access_token,
        refreshToken: response.data.refresh_token,
        expiresAt: new Date(Date.now() + response.data.expires_in * 1000),
        tokenType: response.data.token_type || 'Bearer'
      };

      // Store token securely
      await this.storeToken(this.token);

      // Emit authentication success event
      this.emit('authenticated', {
        tenantId: this.config.tenantId,
        organizationId: this.context?.organizationId,
        expiresAt: this.token.expiresAt
      });

      logger.info('Microsoft 365 authentication successful', {
        tenantId: this.config.tenantId,
        expiresAt: this.token.expiresAt,
        hasRefreshToken: !!this.token.refreshToken
      });

      return this.token;
    } catch (error: unknown) {
      logger.error('Microsoft 365 authentication failed', {
        error: error instanceof Error ? (error).message : 'Unknown error',
        tenantId: this.config.tenantId
      });
      throw error;
    }
  }

  /**
   * SharePoint Operations
   */
  async getSharePointSites(): Promise<SharePointSite[]> {
    try {
      const cacheKey = 'sharepoint_sites';
      const cached = this.integrationCache.get(cacheKey);
      if (cached) {return cached;}

      const response = await this.graphClient.get('/sites');
      const sites = response.data.value.map((site: any) => ({
        id: site.id,
        name: site.name,
        webUrl: site.webUrl,
        displayName: site.displayName,
        description: site.description,
        createdDateTime: new Date(site.createdDateTime),
        lastModifiedDateTime: new Date(site.lastModifiedDateTime)
      }));

      this.integrationCache.set(cacheKey, sites);
      
      this.emit('sharepoint:sites_retrieved', {
        count: sites.length,
        organizationId: this.context?.organizationId
      });

      return sites;
    } catch (error: unknown) {
      logger.error('Failed to get SharePoint sites', { error });
      throw error;
    }
  }

  async getSharePointLists(siteId: string): Promise<SharePointList[]> {
    try {
      const cacheKey = `sharepoint_lists_${siteId}`;
      const cached = this.integrationCache.get(cacheKey);
      if (cached) {return cached;}

      const response = await this.graphClient.get(`/sites/${siteId}/lists`);
      const lists = response.data.value.map((list: any) => ({
        id: list.id,
        displayName: list.displayName,
        description: list.description,
        webUrl: list.webUrl,
        createdDateTime: new Date(list.createdDateTime),
        lastModifiedDateTime: new Date(list.lastModifiedDateTime),
        list: list.list
      }));

      this.integrationCache.set(cacheKey, lists);
      
      this.emit('sharepoint:lists_retrieved', {
        siteId,
        count: lists.length,
        organizationId: this.context?.organizationId
      });

      return lists;
    } catch (error: unknown) {
      logger.error('Failed to get SharePoint lists', { siteId, error });
      throw error;
    }
  }

  async createSharePointListItem(siteId: string, listId: string, item: any): Promise<any> {
    try {
      const response = await this.graphClient.post(`/sites/${siteId}/lists/${listId}/items`, {
        fields: item
      });

      this.emit('sharepoint:item_created', {
        siteId,
        listId,
        itemId: response.data.id,
        organizationId: this.context?.organizationId
      });

      return response.data;
    } catch (error: unknown) {
      logger.error('Failed to create SharePoint list item', { siteId, listId, error });
      throw error;
    }
  }

  /**
   * Outlook Calendar Operations
   */
  async getCalendarEvents(startDate: Date, endDate: Date, userId?: string): Promise<OutlookEvent[]> {
    try {
      const userPath = userId ? `/users/${userId}` : '/me';
      const startTime = startDate.toISOString();
      const endTime = endDate.toISOString();

      const response = await this.graphClient.get(`${userPath}/calendar/events`, {
        params: {
          startDateTime: startTime,
          endDateTime: endTime,
          $select: 'id,subject,body,start,end,location,attendees,importance,sensitivity,showAs',
          $orderby: 'start/dateTime'
        }
      });

      const events = response.data.value.map((event: any) => ({
        id: event.id,
        subject: event.subject,
        body: event.body,
        start: event.start,
        end: event.end,
        location: event.location,
        attendees: event.attendees,
        importance: event.importance,
        sensitivity: event.sensitivity,
        showAs: event.showAs
      }));

      this.emit('outlook:events_retrieved', {
        userId: userId || 'me',
        count: events.length,
        dateRange: { startDate, endDate },
        organizationId: this.context?.organizationId
      });

      return events;
    } catch (error: unknown) {
      logger.error('Failed to get calendar events', { userId, error });
      throw error;
    }
  }

  async createCalendarEvent(event: OutlookEvent, userId?: string): Promise<OutlookEvent> {
    try {
      const userPath = userId ? `/users/${userId}` : '/me';
      
      const response = await this.graphClient.post(`${userPath}/calendar/events`, event);

      const createdEvent = {
        id: response.data.id,
        subject: response.data.subject,
        body: response.data.body,
        start: response.data.start,
        end: response.data.end,
        location: response.data.location,
        attendees: response.data.attendees,
        importance: response.data.importance,
        sensitivity: response.data.sensitivity,
        showAs: response.data.showAs
      };

      this.emit('outlook:event_created', {
        eventId: createdEvent.id,
        subject: createdEvent.subject,
        userId: userId || 'me',
        organizationId: this.context?.organizationId
      });

      return createdEvent;
    } catch (error: unknown) {
      logger.error('Failed to create calendar event', { userId, error });
      throw error;
    }
  }

  async sendEmail(to: string[], subject: string, body: string, isHtml: boolean = false, userId?: string): Promise<void> {
    try {
      const userPath = userId ? `/users/${userId}` : '/me';
      
      const message = {
        subject,
        body: {
          contentType: isHtml ? 'HTML' : 'Text',
          content: body
        },
        toRecipients: to.map(email => ({
          emailAddress: {
            address: email
          }
        }))
      };

      await this.graphClient.post(`${userPath}/sendMail`, {
        message,
        saveToSentItems: true
      });

      this.emit('outlook:email_sent', {
        to,
        subject,
        userId: userId || 'me',
        organizationId: this.context?.organizationId
      });

      logger.info('Email sent successfully', {
        to,
        subject,
        userId: userId || 'me'
      });
    } catch (error: unknown) {
      logger.error('Failed to send email', { to, subject, userId, error });
      throw error;
    }
  }

  /**
   * Microsoft Teams Operations
   */
  async getTeamsChannels(teamId: string): Promise<TeamsChannel[]> {
    try {
      const cacheKey = `teams_channels_${teamId}`;
      const cached = this.integrationCache.get(cacheKey);
      if (cached) {return cached;}

      const response = await this.graphClient.get(`/teams/${teamId}/channels`);
      const channels = response.data.value.map((channel: any) => ({
        id: channel.id,
        displayName: channel.displayName,
        description: channel.description,
        webUrl: channel.webUrl,
        membershipType: channel.membershipType,
        createdDateTime: new Date(channel.createdDateTime)
      }));

      this.integrationCache.set(cacheKey, channels);

      this.emit('teams:channels_retrieved', {
        teamId,
        count: channels.length,
        organizationId: this.context?.organizationId
      });

      return channels;
    } catch (error: unknown) {
      logger.error('Failed to get Teams channels', { teamId, error });
      throw error;
    }
  }

  async sendTeamsMessage(teamId: string, channelId: string, message: TeamsMessage): Promise<TeamsMessage> {
    try {
      const response = await this.graphClient.post(
        `/teams/${teamId}/channels/${channelId}/messages`,
        message
      );

      const sentMessage = {
        id: response.data.id,
        body: response.data.body,
        from: response.data.from,
        attachments: response.data.attachments,
        mentions: response.data.mentions
      };

      this.emit('teams:message_sent', {
        teamId,
        channelId,
        messageId: sentMessage.id,
        organizationId: this.context?.organizationId
      });

      return sentMessage;
    } catch (error: unknown) {
      logger.error('Failed to send Teams message', { teamId, channelId, error });
      throw error;
    }
  }

  /**
   * OneDrive Operations
   */
  async getOneDriveFiles(folderId?: string, userId?: string): Promise<OneDriveFile[]> {
    try {
      const userPath = userId ? `/users/${userId}` : '/me';
      const drivePath = folderId ? `/drive/items/${folderId}/children` : '/drive/root/children';

      const response = await this.graphClient.get(`${userPath}${drivePath}`);
      const files = response.data.value.map((file: any) => ({
        id: file.id,
        name: file.name,
        webUrl: file.webUrl,
        size: file.size,
        lastModifiedDateTime: new Date(file.lastModifiedDateTime),
        createdDateTime: new Date(file.createdDateTime),
        folder: file.folder,
        file: file.file
      }));

      this.emit('onedrive:files_retrieved', {
        folderId,
        userId: userId || 'me',
        count: files.length,
        organizationId: this.context?.organizationId
      });

      return files;
    } catch (error: unknown) {
      logger.error('Failed to get OneDrive files', { folderId, userId, error });
      throw error;
    }
  }

  async uploadFileToOneDrive(fileName: string, content: Buffer, folderId?: string, userId?: string): Promise<OneDriveFile> {
    try {
      const userPath = userId ? `/users/${userId}` : '/me';
      const uploadPath = folderId 
        ? `/drive/items/${folderId}:/${fileName}:/content`
        : `/drive/root:/${fileName}:/content`;

      const response = await this.graphClient.put(`${userPath}${uploadPath}`, content, {
        headers: {
          'Content-Type': 'application/octet-stream'
        }
      });

      const uploadedFile = {
        id: response.data.id,
        name: response.data.name,
        webUrl: response.data.webUrl,
        size: response.data.size,
        lastModifiedDateTime: new Date(response.data.lastModifiedDateTime),
        createdDateTime: new Date(response.data.createdDateTime),
        folder: response.data.folder,
        file: response.data.file
      };

      this.emit('onedrive:file_uploaded', {
        fileName,
        fileId: uploadedFile.id,
        size: uploadedFile.size,
        userId: userId || 'me',
        organizationId: this.context?.organizationId
      });

      return uploadedFile;
    } catch (error: unknown) {
      logger.error('Failed to upload file to OneDrive', { fileName, folderId, userId, error });
      throw error;
    }
  }

  /**
   * Webhook and Subscription Management
   */
  async createSubscription(resource: string, notificationUrl: string, expirationDateTime: Date): Promise<any> {
    try {
      const subscription = {
        changeType: 'created,updated,deleted',
        notificationUrl,
        resource,
        expirationDateTime: expirationDateTime.toISOString(),
        clientState: 'subscription-identifier'
      };

      const response = await this.graphClient.post('/subscriptions', subscription);

      // Cache subscription for management
      this.subscriptionCache.set(response.data.id, response.data);

      this.emit('subscription:created', {
        subscriptionId: response.data.id,
        resource,
        organizationId: this.context?.organizationId
      });

      logger.info('Microsoft 365 subscription created', {
        subscriptionId: response.data.id,
        resource,
        expirationDateTime
      });

      return response.data;
    } catch (error: unknown) {
      logger.error('Failed to create subscription', { resource, error });
      throw error;
    }
  }

  async renewSubscription(subscriptionId: string, expirationDateTime: Date): Promise<any> {
    try {
      const response = await this.graphClient.patch(`/subscriptions/${subscriptionId}`, {
        expirationDateTime: expirationDateTime.toISOString()
      });

      // Update cached subscription
      this.subscriptionCache.set(subscriptionId, response.data);

      this.emit('subscription:renewed', {
        subscriptionId,
        expirationDateTime,
        organizationId: this.context?.organizationId
      });

      logger.info('Microsoft 365 subscription renewed', {
        subscriptionId,
        expirationDateTime
      });

      return response.data;
    } catch (error: unknown) {
      logger.error('Failed to renew subscription', { subscriptionId, error });
      throw error;
    }
  }

  /**
   * User and Group Management
   */
  async getUsers(filter?: string): Promise<Array<{
    id: string;
    displayName: string;
    mail: string;
    jobTitle?: string;
    department?: string;
  }>> {
    try {
      const params: any = {
        $select: 'id,displayName,mail,jobTitle,department'
      };
      
      if (filter) {
        params.$filter = filter;
      }

      const response = await this.graphClient.get('/users', { params });

      const users = response.data.value.map((user: any) => ({
        id: user.id,
        displayName: user.displayName,
        mail: user.mail,
        jobTitle: user.jobTitle,
        department: user.department
      }));

      this.emit('users:retrieved', {
        count: users.length,
        filter,
        organizationId: this.context?.organizationId
      });

      return users;
    } catch (error: unknown) {
      logger.error('Failed to get users', { filter, error });
      throw error;
    }
  }

  /**
   * Token management helper methods
   */
  private async ensureValidToken(): Promise<void> {
    if (!this.token || new Date() >= this.token.expiresAt) {
      if (this.tokenRefreshPromise) {
        await this.tokenRefreshPromise;
        return;
      }

      this.tokenRefreshPromise = this.refreshToken();
      await this.tokenRefreshPromise;
      this.tokenRefreshPromise = null;
    }
  }

  private async refreshToken(): Promise<void> {
    try {
      if (!this.token?.refreshToken) {
        logger.warn('No refresh token available, re-authentication required');
        throw new Error('No refresh token available');
      }

      await this.authenticate(undefined, this.token.refreshToken);
    } catch (error: unknown) {
      logger.error('Token refresh failed', { error });
      this.token = null;
      throw error;
    }
  }

  private async storeToken(token: Microsoft365Token): Promise<void> {
    try {
      if (!this.context?.organizationId) {return;}

      await prisma.integrationToken.upsert({
        where: {
          organizationId_service: {
            organizationId: this.context.organizationId,
            service: 'MICROSOFT365'
          }
        },
        update: {
          accessToken: token.accessToken,
          refreshToken: token.refreshToken,
          expiresAt: token.expiresAt,
          tokenType: token.tokenType,
          updatedAt: new Date()
        },
        create: {
          organizationId: this.context.organizationId,
          service: 'MICROSOFT365',
          accessToken: token.accessToken,
          refreshToken: token.refreshToken,
          expiresAt: token.expiresAt,
          tokenType: token.tokenType
        }
      });
    } catch (error: unknown) {
      logger.error('Failed to store Microsoft 365 token', { error });
    }
  }

  /**
   * Integration Health and Monitoring
   */
  async checkIntegrationHealth(): Promise<{
    status: 'healthy' | 'warning' | 'error';
    lastChecked: Date;
    services: {
      graph: 'available' | 'unavailable';
      sharepoint: 'available' | 'unavailable';
      outlook: 'available' | 'unavailable';
      teams: 'available' | 'unavailable';
      onedrive: 'available' | 'unavailable';
    };
    tokenStatus: {
      valid: boolean;
      expiresAt?: Date;
      hasRefreshToken: boolean;
    };
  }> {
    const healthCheck = {
      status: 'healthy' as const,
      lastChecked: new Date(),
      services: {
        graph: 'unavailable' as const,
        sharepoint: 'unavailable' as const,
        outlook: 'unavailable' as const,
        teams: 'unavailable' as const,
        onedrive: 'unavailable' as const
      },
      tokenStatus: {
        valid: false,
        expiresAt: this.token?.expiresAt,
        hasRefreshToken: !!this.token?.refreshToken
      }
    };

    try {
      await this.ensureValidToken();
      healthCheck.tokenStatus.valid = true;

      // Test Graph API
      try {
        await this.graphClient.get('/me');
        healthCheck.services.graph = 'available';
      } catch (error: unknown) {
        logger.warn('Graph API health check failed', { error });
      }

      // Test other services with lightweight operations
      try {
        await this.graphClient.get('/me/drive');
        healthCheck.services.onedrive = 'available';
      } catch (error: unknown) {
        logger.warn('OneDrive health check failed', { error });
      }

      try {
        await this.graphClient.get('/me/calendar');
        healthCheck.services.outlook = 'available';
      } catch (error: unknown) {
        logger.warn('Outlook health check failed', { error });
      }

      // Determine overall status
      const availableServices = Object.values(healthCheck.services).filter(status => status === 'available').length;
      const totalServices = Object.keys(healthCheck.services).length;

      if (availableServices === 0) {
        healthCheck.status = 'error';
      } else if (availableServices < totalServices) {
        healthCheck.status = 'warning';
      }

    } catch (error: unknown) {
      logger.error('Microsoft 365 health check failed', { error });
      healthCheck.status = 'error';
    }

    return healthCheck;
  }

  /**
   * Comprehensive sync operation
   */
  async syncAllData(): Promise<{
    syncId: string;
    startedAt: Date;
    completedAt?: Date;
    status: 'running' | 'completed' | 'failed';
    results: {
      sites: number;
      events: number;
      files: number;
      users: number;
    };
    errors: string[];
  }> {
    const syncId = `sync-${Date.now()}`;
    const syncOperation = {
      syncId,
      startedAt: new Date(),
      status: 'running' as const,
      results: {
        sites: 0,
        events: 0,
        files: 0,
        users: 0
      },
      errors: [] as string[]
    };

    try {
      logger.info('Starting Microsoft 365 data sync', { syncId });

      // Sync SharePoint sites
      try {
        const sites = await this.getSharePointSites();
        syncOperation.results.sites = sites.length;
      } catch (error: unknown) {
        syncOperation.errors.push(`Sites sync failed: ${error instanceof Error ? (error).message : 'Unknown error'}`);
      }

      // Sync calendar events (next 30 days)
      try {
        const startDate = new Date();
        const endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        const events = await this.getCalendarEvents(startDate, endDate);
        syncOperation.results.events = events.length;
      } catch (error: unknown) {
        syncOperation.errors.push(`Events sync failed: ${error instanceof Error ? (error).message : 'Unknown error'}`);
      }

      // Sync OneDrive files (root folder)
      try {
        const files = await this.getOneDriveFiles();
        syncOperation.results.files = files.length;
      } catch (error: unknown) {
        syncOperation.errors.push(`Files sync failed: ${error instanceof Error ? (error).message : 'Unknown error'}`);
      }

      // Sync users
      try {
        const users = await this.getUsers();
        syncOperation.results.users = users.length;
      } catch (error: unknown) {
        syncOperation.errors.push(`Users sync failed: ${error instanceof Error ? (error).message : 'Unknown error'}`);
      }

      syncOperation.completedAt = new Date();
      syncOperation.status = syncOperation.errors.length === 0 ? 'completed' : 'completed';

      this.emit('sync:completed', {
        syncId,
        results: syncOperation.results,
        errors: syncOperation.errors,
        organizationId: this.context?.organizationId
      });

      logger.info('Microsoft 365 data sync completed', {
        syncId,
        results: syncOperation.results,
        errorCount: syncOperation.errors.length
      });

    } catch (error: unknown) {
      syncOperation.status = 'failed';
      syncOperation.completedAt = new Date();
      syncOperation.errors.push(`Sync failed: ${error instanceof Error ? (error).message : 'Unknown error'}`);

      logger.error('Microsoft 365 data sync failed', { syncId, error });
    }

    return syncOperation;
  }

  /**
   * Public API methods
   */
  clearCache(): void {
    this.integrationCache.clear();
    this.subscriptionCache.clear();
    logger.info('Microsoft 365 integration cache cleared');
  }

  getTokenStatus(): { valid: boolean; expiresAt?: Date } {
    return {
      valid: !!this.token && new Date() < this.token.expiresAt,
      expiresAt: this.token?.expiresAt
    };
  }

  async revokeToken(): Promise<void> {
    if (!this.token) {return;}

    try {
      // Revoke the token with Microsoft
      await axios.post(`https://login.microsoftonline.com/${this.config.tenantId}/oauth2/v2.0/logout`);
      
      this.token = null;
      
      // Remove from database
      if (this.context?.organizationId) {
        await prisma.integrationToken.deleteMany({
          where: {
            organizationId: this.context.organizationId,
            service: 'MICROSOFT365'
          }
        });
      }

      this.emit('token:revoked', {
        organizationId: this.context?.organizationId
      });

      logger.info('Microsoft 365 token revoked successfully');
    } catch (error: unknown) {
      logger.error('Failed to revoke Microsoft 365 token', { error });
      throw error;
    }
  }
}