/**
 * Error-handling middleware and error classes for the active middleware barrel.
 * The canonical implementation lives in core; this re-export bridges the
 * `src/middleware/*` modules (which import from './errorHandler') to it.
 */
export * from '../core/middleware/errorHandler';
