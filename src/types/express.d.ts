/**
 * Express Request type augmentation
 */

declare global {
  namespace Express {
    export interface Request {
      user?: {
        id: string;
        email: string;
        organizationId: string;
        roles: string[];
        permissions: string[];
        tier?: 'free' | 'premium' | 'enterprise';
      };
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

export {};