export interface UserPayload {
  id: string;
  email: string;
  organizationId: string;
  roles: string[];
  permissions: string[];
  tier?: 'free' | 'premium' | 'enterprise';
}

export interface APIKeyData {
  id: string;
  organizationId: string;
  permissions: string[];
  rateLimit?: {
    windowMs: number;
    max: number;
  };
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: UserPayload;
      apiKey?: APIKeyData;
    }
  }
}