import { prisma } from '../config/database';
import { logger } from '../config/logger';
import axios, { AxiosInstance } from 'axios';

interface CalendarEvent {
  id?: string;
  title: string;
  description?: string;
  startDateTime: Date;
  endDateTime: Date;
  location?: string;
  attendees?: string[];
  isAllDay?: boolean;
  recurrence?: any;
  externalId?: string;
}

interface CalendarSyncConfig {
  provider: 'OUTLOOK' | 'GOOGLE';
  clientId: string;
  clientSecret: string;
  redirectUri: string;
  scopes: string[];
}

interface UserCalendarAuth {
  userId: string;
  provider: 'OUTLOOK' | 'GOOGLE';
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
  email: string;
}

export class CalendarIntegrationService {
  private outlookClient: AxiosInstance;
  private googleClient: AxiosInstance;

  constructor() {
    // Initialize Outlook Graph API client
    this.outlookClient = axios.create({
      baseURL: 'https://graph.microsoft.com/v1.0',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Initialize Google Calendar API client
    this.googleClient = axios.create({
      baseURL: 'https://www.googleapis.com/calendar/v3',
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Initiate OAuth flow for calendar integration
   */
  async initiateCalendarAuth(
    userId: string,
    provider: 'OUTLOOK' | 'GOOGLE',
    config: CalendarSyncConfig
  ): Promise<string> {
    try {
      let authUrl: string;

      if (provider === 'OUTLOOK') {
        authUrl = 'https://login.microsoftonline.com/common/oauth2/v2.0/authorize?' +
          `client_id=${config.clientId}&` +
          'response_type=code&' +
          `redirect_uri=${encodeURIComponent(config.redirectUri)}&` +
          `scope=${encodeURIComponent(config.scopes.join(' '))}&` +
          `state=${userId}`;
      } else {
        authUrl = 'https://accounts.google.com/o/oauth2/v2/auth?' +
          `client_id=${config.clientId}&` +
          'response_type=code&' +
          `redirect_uri=${encodeURIComponent(config.redirectUri)}&` +
          `scope=${encodeURIComponent(config.scopes.join(' '))}&` +
          'access_type=offline&' +
          `state=${userId}`;
      }

      logger.info('Calendar OAuth initiated', { userId, provider });
      return authUrl;
    } catch (error) {
      logger.error('Failed to initiate calendar auth', error);
      throw error;
    }
  }

  /**
   * Complete OAuth flow and store tokens
   */
  async completeCalendarAuth(
    code: string,
    state: string,
    provider: 'OUTLOOK' | 'GOOGLE',
    config: CalendarSyncConfig
  ): Promise<UserCalendarAuth> {
    try {
      const userId = state; // state parameter contains userId

      let tokenResponse: any;

      if (provider === 'OUTLOOK') {
        tokenResponse = await axios.post('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
          client_id: config.clientId,
          client_secret: config.clientSecret,
          code,
          redirect_uri: config.redirectUri,
          grant_type: 'authorization_code',
        }, {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });
      } else {
        tokenResponse = await axios.post('https://oauth2.googleapis.com/token', {
          client_id: config.clientId,
          client_secret: config.clientSecret,
          code,
          redirect_uri: config.redirectUri,
          grant_type: 'authorization_code',
        });
      }

      const { access_token, refresh_token, expires_in } = tokenResponse.data;
      const expiresAt = new Date(Date.now() + expires_in * 1000);

      // Get user's email from the calendar provider
      const email = await this.getUserEmail(provider, access_token);

      const authData: UserCalendarAuth = {
        userId,
        provider,
        accessToken: access_token,
        refreshToken: refresh_token,
        expiresAt,
        email,
      };

      // Store auth data securely (in a real implementation, encrypt these tokens)
      await prisma.$executeRaw`
        INSERT INTO user_calendar_auth (user_id, provider, access_token, refresh_token, expires_at, email, created_at, updated_at)
        VALUES (${userId}, ${provider}, ${access_token}, ${refresh_token}, ${expiresAt}, ${email}, NOW(), NOW())
        ON CONFLICT (user_id, provider) 
        DO UPDATE SET access_token = ${access_token}, refresh_token = ${refresh_token}, expires_at = ${expiresAt}, email = ${email}, updated_at = NOW()
      `;

      logger.info('Calendar auth completed', { userId, provider, email });
      return authData;
    } catch (error) {
      logger.error('Failed to complete calendar auth', error);
      throw error;
    }
  }

  /**
   * Sync space booking to user's calendar
   */
  async syncBookingToCalendar(bookingId: string): Promise<void> {
    try {
      // Get booking with user details
      const booking = await prisma.spaceBooking.findUnique({
        where: { id: bookingId },
        include: {
          space: {
            include: {
              floor: {
                include: {
                  building: {
                    include: {
                      property: true,
                    },
                  },
                },
              },
            },
          },
          bookedBy: true,
          bookedFor: true,
        },
      });

      if (!booking) {
        throw new Error('Booking not found');
      }

      const users = [booking.bookedBy];
      if (booking.bookedFor && booking.bookedFor.id !== booking.bookedBy.id) {
        users.push(booking.bookedFor);
      }

      // Sync to each user's calendar
      for (const user of users) {
        const calendarAuths = await this.getUserCalendarAuths(user.id);

        for (const auth of calendarAuths) {
          try {
            await this.createCalendarEvent(auth, {
              title: `${booking.bookingType} Booking - ${booking.space.name}`,
              description: `Space booking for ${booking.space.name}\n${booking.purpose || ''}`,
              startDateTime: booking.startDateTime,
              endDateTime: booking.endDateTime,
              location: this.formatSpaceLocation(booking.space),
              attendees: users.map(u => u.email),
            });
          } catch (error) {
            logger.error('Failed to sync booking to calendar', { 
              userId: user.id, 
              provider: auth.provider,
              error: error instanceof Error ? error.message : 'Unknown error'
            });
          }
        }
      }

      logger.info('Booking synced to calendars', { bookingId });
    } catch (error) {
      logger.error('Failed to sync booking to calendar', error);
      throw error;
    }
  }

  /**
   * Create calendar event
   */
  async createCalendarEvent(auth: UserCalendarAuth, event: CalendarEvent): Promise<string> {
    try {
      // Refresh token if needed
      const validAuth = await this.ensureValidToken(auth);

      let response: any;

      if (auth.provider === 'OUTLOOK') {
        response = await this.outlookClient.post('/me/events', {
          subject: event.title,
          body: {
            contentType: 'text',
            content: event.description || '',
          },
          start: {
            dateTime: event.startDateTime.toISOString(),
            timeZone: 'UTC',
          },
          end: {
            dateTime: event.endDateTime.toISOString(),
            timeZone: 'UTC',
          },
          location: {
            displayName: event.location || '',
          },
          attendees: event.attendees?.map(email => ({
            emailAddress: { address: email },
          })) || [],
          isAllDay: event.isAllDay || false,
        }, {
          headers: {
            'Authorization': `Bearer ${validAuth.accessToken}`,
          },
        });

        event.externalId = response.data.id;
      } else {
        response = await this.googleClient.post('/calendars/primary/events', {
          summary: event.title,
          description: event.description || '',
          start: {
            dateTime: event.startDateTime.toISOString(),
            timeZone: 'UTC',
          },
          end: {
            dateTime: event.endDateTime.toISOString(),
            timeZone: 'UTC',
          },
          location: event.location || '',
          attendees: event.attendees?.map(email => ({ email })) || [],
          recurrence: event.recurrence,
        }, {
          headers: {
            'Authorization': `Bearer ${validAuth.accessToken}`,
          },
        });

        event.externalId = response.data.id;
      }

      logger.info('Calendar event created', {
        provider: auth.provider,
        eventId: event.externalId,
        title: event.title,
      });

      return event.externalId!;
    } catch (error) {
      logger.error('Failed to create calendar event', error);
      throw error;
    }
  }

  /**
   * Update calendar event
   */
  async updateCalendarEvent(auth: UserCalendarAuth, eventId: string, event: Partial<CalendarEvent>): Promise<void> {
    try {
      const validAuth = await this.ensureValidToken(auth);

      if (auth.provider === 'OUTLOOK') {
        const updateData: any = {};
        
        if (event.title) {updateData.subject = event.title;}
        if (event.description) {updateData.body = { contentType: 'text', content: event.description };}
        if (event.startDateTime) {updateData.start = { dateTime: event.startDateTime.toISOString(), timeZone: 'UTC' };}
        if (event.endDateTime) {updateData.end = { dateTime: event.endDateTime.toISOString(), timeZone: 'UTC' };}
        if (event.location) {updateData.location = { displayName: event.location };}

        await this.outlookClient.patch(`/me/events/${eventId}`, updateData, {
          headers: {
            'Authorization': `Bearer ${validAuth.accessToken}`,
          },
        });
      } else {
        const updateData: any = {};
        
        if (event.title) {updateData.summary = event.title;}
        if (event.description) {updateData.description = event.description;}
        if (event.startDateTime) {updateData.start = { dateTime: event.startDateTime.toISOString(), timeZone: 'UTC' };}
        if (event.endDateTime) {updateData.end = { dateTime: event.endDateTime.toISOString(), timeZone: 'UTC' };}
        if (event.location) {updateData.location = event.location;}

        await this.googleClient.patch(`/calendars/primary/events/${eventId}`, updateData, {
          headers: {
            'Authorization': `Bearer ${validAuth.accessToken}`,
          },
        });
      }

      logger.info('Calendar event updated', {
        provider: auth.provider,
        eventId,
      });
    } catch (error) {
      logger.error('Failed to update calendar event', error);
      throw error;
    }
  }

  /**
   * Delete calendar event
   */
  async deleteCalendarEvent(auth: UserCalendarAuth, eventId: string): Promise<void> {
    try {
      const validAuth = await this.ensureValidToken(auth);

      if (auth.provider === 'OUTLOOK') {
        await this.outlookClient.delete(`/me/events/${eventId}`, {
          headers: {
            'Authorization': `Bearer ${validAuth.accessToken}`,
          },
        });
      } else {
        await this.googleClient.delete(`/calendars/primary/events/${eventId}`, {
          headers: {
            'Authorization': `Bearer ${validAuth.accessToken}`,
          },
        });
      }

      logger.info('Calendar event deleted', {
        provider: auth.provider,
        eventId,
      });
    } catch (error) {
      logger.error('Failed to delete calendar event', error);
      throw error;
    }
  }

  /**
   * Get user's free/busy schedule
   */
  async getUserFreeBusy(
    userId: string,
    startDate: Date,
    endDate: Date,
    provider?: 'OUTLOOK' | 'GOOGLE'
  ): Promise<any[]> {
    try {
      const calendarAuths = await this.getUserCalendarAuths(userId, provider);
      const freeBusyData: any[] = [];

      for (const auth of calendarAuths) {
        const validAuth = await this.ensureValidToken(auth);

        try {
          let response: any;

          if (auth.provider === 'OUTLOOK') {
            response = await this.outlookClient.post('/me/calendar/getSchedule', {
              schedules: [auth.email],
              startTime: {
                dateTime: startDate.toISOString(),
                timeZone: 'UTC',
              },
              endTime: {
                dateTime: endDate.toISOString(),
                timeZone: 'UTC',
              },
              availabilityViewInterval: 15,
            }, {
              headers: {
                'Authorization': `Bearer ${validAuth.accessToken}`,
              },
            });

            freeBusyData.push({
              provider: 'OUTLOOK',
              email: auth.email,
              schedule: response.data,
            });
          } else {
            response = await this.googleClient.post('/freeBusy', {
              timeMin: startDate.toISOString(),
              timeMax: endDate.toISOString(),
              items: [{ id: 'primary' }],
            }, {
              headers: {
                'Authorization': `Bearer ${validAuth.accessToken}`,
              },
            });

            freeBusyData.push({
              provider: 'GOOGLE',
              email: auth.email,
              schedule: response.data,
            });
          }
        } catch (error) {
          logger.error('Failed to get free/busy data', {
            userId,
            provider: auth.provider,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }

      return freeBusyData;
    } catch (error) {
      logger.error('Failed to get user free/busy', error);
      throw error;
    }
  }

  /**
   * Bulk sync bookings to calendars
   */
  async bulkSyncBookings(organizationId: string, startDate?: Date, endDate?: Date): Promise<void> {
    try {
      const whereClause: any = {
        space: {
          floor: {
            building: {
              property: {
                organizationId,
              },
            },
          },
        },
        status: 'CONFIRMED',
        isActive: true,
      };

      if (startDate || endDate) {
        whereClause.startDateTime = {};
        if (startDate) {whereClause.startDateTime.gte = startDate;}
        if (endDate) {whereClause.startDateTime.lte = endDate;}
      }

      const bookings = await prisma.spaceBooking.findMany({
        where: whereClause,
      });

      logger.info('Starting bulk calendar sync', {
        organizationId,
        bookingCount: bookings.length,
      });

      // Process bookings in batches
      const batchSize = 10;
      for (let i = 0; i < bookings.length; i += batchSize) {
        const batch = bookings.slice(i, i + batchSize);
        
        await Promise.allSettled(
          batch.map((booking: any) => this.syncBookingToCalendar(booking.id))
        );

        // Small delay between batches to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      logger.info('Bulk calendar sync completed', {
        organizationId,
        bookingCount: bookings.length,
      });
    } catch (error) {
      logger.error('Failed to bulk sync bookings', error);
      throw error;
    }
  }

  /**
   * Get user's calendar auth data
   */
  private async getUserCalendarAuths(
    userId: string,
    provider?: 'OUTLOOK' | 'GOOGLE'
  ): Promise<UserCalendarAuth[]> {
    const result = await prisma.$queryRaw`
      SELECT user_id, provider, access_token, refresh_token, expires_at, email
      FROM user_calendar_auth
      WHERE user_id = ${userId}
      ${provider ? `AND provider = ${provider}` : ''}
      AND expires_at > NOW()
    ` as any[];

    return result.map((row: any) => ({
      userId: row.user_id,
      provider: row.provider,
      accessToken: row.access_token,
      refreshToken: row.refresh_token,
      expiresAt: row.expires_at,
      email: row.email,
    }));
  }

  /**
   * Get user's email from calendar provider
   */
  private async getUserEmail(provider: 'OUTLOOK' | 'GOOGLE', accessToken: string): Promise<string> {
    try {
      let response: any;

      if (provider === 'OUTLOOK') {
        response = await this.outlookClient.get('/me', {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        });
        return response.data.mail || response.data.userPrincipalName;
      } else {
        response = await this.googleClient.get('/users/me', {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        });
        return response.data.email;
      }
    } catch (error) {
      logger.error('Failed to get user email', error);
      throw error;
    }
  }

  /**
   * Ensure token is valid and refresh if needed
   */
  private async ensureValidToken(auth: UserCalendarAuth): Promise<UserCalendarAuth> {
    // Check if token expires within next 10 minutes
    if (auth.expiresAt.getTime() - Date.now() < 10 * 60 * 1000) {
      return await this.refreshToken(auth);
    }
    return auth;
  }

  /**
   * Refresh access token
   */
  private async refreshToken(auth: UserCalendarAuth): Promise<UserCalendarAuth> {
    try {
      let response: any;

      if (auth.provider === 'OUTLOOK') {
        response = await axios.post('https://login.microsoftonline.com/common/oauth2/v2.0/token', {
          client_id: process.env.OUTLOOK_CLIENT_ID,
          client_secret: process.env.OUTLOOK_CLIENT_SECRET,
          refresh_token: auth.refreshToken,
          grant_type: 'refresh_token',
        }, {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
        });
      } else {
        response = await axios.post('https://oauth2.googleapis.com/token', {
          client_id: process.env.GOOGLE_CLIENT_ID,
          client_secret: process.env.GOOGLE_CLIENT_SECRET,
          refresh_token: auth.refreshToken,
          grant_type: 'refresh_token',
        });
      }

      const { access_token, expires_in } = response.data;
      const expiresAt = new Date(Date.now() + expires_in * 1000);

      // Update stored token
      await prisma.$executeRaw`
        UPDATE user_calendar_auth 
        SET access_token = ${access_token}, expires_at = ${expiresAt}, updated_at = NOW()
        WHERE user_id = ${auth.userId} AND provider = ${auth.provider}
      `;

      return {
        ...auth,
        accessToken: access_token,
        expiresAt,
      };
    } catch (error) {
      logger.error('Failed to refresh token', error);
      throw error;
    }
  }

  /**
   * Format space location for calendar
   */
  private formatSpaceLocation(space: any): string {
    const building = space.floor?.building;
    const property = building?.property;
    
    const parts = [space.name];
    
    if (space.floor?.name) {
      parts.push(`Floor ${space.floor.name}`);
    }
    
    if (building?.name) {
      parts.push(building.name);
    }
    
    if (property?.address?.street) {
      parts.push(property.address.street);
    }
    
    return parts.join(', ');
  }
}