import { Request } from 'express';

export interface UserPayload {
  id: string;
  email: string;
  organizationId: string;
  roles: string[];
  permissions: string[];
  tier?: 'free' | 'premium' | 'enterprise';
}

declare global {
  namespace Express {
    interface Request {
      user?: UserPayload;
      apiKey?: {
        id: string;
        organizationId: string;
        permissions: string[];
        rateLimit?: {
          windowMs: number;
          max: number;
        };
      };
    }
  }
}