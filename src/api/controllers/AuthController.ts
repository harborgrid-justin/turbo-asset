import { Router, Request, Response, NextFunction } from 'express';
import { authService } from '@/services/AuthService';
import { authenticateJWT } from '../../middleware/auth';
import { logger } from '@/config/logger';

const router = Router();

/**
 * POST /api/auth/login
 * Exchange email + password for a signed JWT. Public route (rate-limited at mount).
 */
router.post('/login', async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, password } = (req.body ?? {}) as { email?: unknown; password?: unknown };

    if (typeof email !== 'string' || typeof password !== 'string' || !email || !password) {
      res.status(400).json({ success: false, error: 'email and password are required' });
      return;
    }

    const result = await authService.login(email, password);
    logger.info('User logged in', { userId: result.user.id });
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/refresh
 * Re-issue a token from a still-valid bearer token or { token } body.
 */
router.post('/refresh', (req: Request, res: Response, next: NextFunction): void => {
  try {
    const headerToken = req.headers.authorization?.startsWith('Bearer ')
      ? req.headers.authorization.split(' ')[1]
      : undefined;
    const bodyToken = (req.body ?? {}).token as string | undefined;
    const token = headerToken ?? bodyToken;

    if (!token) {
      res.status(400).json({ success: false, error: 'token is required' });
      return;
    }

    const result = authService.refresh(token);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/auth/me
 * Return the authenticated user's token claims.
 */
router.get('/me', authenticateJWT, (req: Request, res: Response): void => {
  res.json({ success: true, data: req.user });
});

export default router;
