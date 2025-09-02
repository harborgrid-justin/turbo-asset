/**
 * Messaging Platform Sub-Service - Comprehensive communication and localization management
 * 
 * This sub-service handles all communication operations including:
 * - Multi-channel notification delivery (email, SMS, push, websocket, etc.)
 * - Internationalization and localization management
 * - Template-based messaging and bulk notifications
 * - Delivery status tracking and retry mechanisms
 * - User preferences and channel management
 * - Communication metrics and reporting
 * 
 * Part of the Communication Management domain within Turbo Asset IWMS
 */

// Core communication services
export { NotificationDeliveryService } from './NotificationDeliveryService';
export { LocalizationService } from './LocalizationService';

// Types and constants
export * from './types/CommunicationTypes';
export * from './constants/CommunicationConstants';

// Import services for internal use
import { CommunicationPlatformService } from './CommunicationPlatformService';

/**
 * Main Communication Platform Service - Orchestrates all communication capabilities
 * 
 * This class provides a unified interface to all communication functionality,
 * coordinating between notification delivery, localization, and template management
 * to provide comprehensive communication and messaging capabilities.
 */
export { CommunicationPlatformService };

// Create and export default instance for backward compatibility
export const communicationPlatform = new CommunicationPlatformService();