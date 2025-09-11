/**
 * Core barrel export for the entire application
 * Following Facebook and Google module system best practices
 */

// Core utilities and configuration
export * from './config';
export * from './core/utils';

// API layer
export * from './api/controllers';
export * from './api/routes';

// Services layer - Domain-driven architecture
export * from './services';

// Shared types and interfaces
export * from './shared/types';
export * from './shared/interfaces';

// Middleware and core functionality
export * from './core/middleware';

// Main application entry
export { default as TurboAssetServer } from './index';