/**
 * Enterprise Event System
 * Type-safe event handling with comprehensive event definitions
 */

import { EventEmitter } from 'events';
import { logger } from '../config/logger';

/**
 * Base event interface
 */
export interface BaseEvent {
  readonly id: string;
  readonly type: string;
  readonly timestamp: Date;
  readonly source: string;
  readonly version: string;
  readonly correlationId?: string;
  readonly userId?: string;
  readonly organizationId?: string;
}

/**
 * Event payload interface
 */
export interface EventPayload {
  readonly [key: string]: unknown;
}

/**
 * Event handler function type
 */
export type EventHandler<T extends EventPayload = EventPayload> = (event: BaseEvent & { data: T }) => Promise<void> | void;

/**
 * Event handler registration
 */
export interface EventHandlerRegistration {
  readonly handler: EventHandler;
  readonly priority: number;
  readonly once: boolean;
}

/**
 * Event subscription options
 */
export interface EventSubscriptionOptions {
  readonly priority?: number;
  readonly once?: boolean;
  readonly filter?: (event: BaseEvent) => boolean;
}

/**
 * Event publishing options
 */
export interface EventPublishOptions {
  readonly async?: boolean;
  readonly maxRetries?: number;
  readonly retryDelay?: number;
}

/**
 * Event metrics
 */
export interface EventMetrics {
  readonly totalEvents: number;
  readonly successfulEvents: number;
  readonly failedEvents: number;
  readonly averageProcessingTime: number;
  readonly eventsByType: Record<string, number>;
}

/**
 * User-related events
 */
export interface UserCreatedEvent extends EventPayload {
  readonly userId: string;
  readonly email: string;
  readonly role: string;
  readonly organizationId: string;
}

export interface UserUpdatedEvent extends EventPayload {
  readonly userId: string;
  readonly changes: Record<string, { old: unknown; new: unknown }>;
  readonly updatedBy: string;
}

export interface UserDeletedEvent extends EventPayload {
  readonly userId: string;
  readonly deletedBy: string;
  readonly reason?: string;
}

/**
 * Asset-related events
 */
export interface AssetCreatedEvent extends EventPayload {
  readonly assetId: string;
  readonly assetType: string;
  readonly location: string;
  readonly value: number;
  readonly assignedTo?: string;
}

export interface AssetStatusChangedEvent extends EventPayload {
  readonly assetId: string;
  readonly previousStatus: string;
  readonly newStatus: string;
  readonly reason: string;
  readonly changedBy: string;
}

export interface AssetMaintenanceScheduledEvent extends EventPayload {
  readonly assetId: string;
  readonly maintenanceType: string;
  readonly scheduledDate: Date;
  readonly assignedTechnician: string;
  readonly estimatedDuration: number;
}

/**
 * Work order events
 */
export interface WorkOrderCreatedEvent extends EventPayload {
  readonly workOrderId: string;
  readonly assetId?: string;
  readonly spaceId?: string;
  readonly priority: string;
  readonly category: string;
  readonly description: string;
  readonly requestedBy: string;
}

export interface WorkOrderAssignedEvent extends EventPayload {
  readonly workOrderId: string;
  readonly assignedTo: string;
  readonly assignedBy: string;
  readonly estimatedCompletion?: Date;
}

export interface WorkOrderCompletedEvent extends EventPayload {
  readonly workOrderId: string;
  readonly completedBy: string;
  readonly completionNotes: string;
  readonly actualDuration: number;
  readonly materials?: Array<{ name: string; quantity: number; cost: number }>;
}

/**
 * Space-related events  
 */
export interface SpaceReservedEvent extends EventPayload {
  readonly spaceId: string;
  readonly reservedBy: string;
  readonly startDate: Date;
  readonly endDate: Date;
  readonly purpose: string;
  readonly attendees?: number;
}

export interface SpaceOccupancyChangedEvent extends EventPayload {
  readonly spaceId: string;
  readonly previousOccupancy: number;
  readonly newOccupancy: number;
  readonly capacity: number;
  readonly utilizationRate: number;
}

/**
 * System events
 */
export interface SystemHealthCheckEvent extends EventPayload {
  readonly service: string;
  readonly status: 'healthy' | 'degraded' | 'unhealthy';
  readonly responseTime: number;
  readonly details?: Record<string, unknown>;
}

export interface SystemErrorEvent extends EventPayload {
  readonly errorCode: string;
  readonly errorMessage: string;
  readonly stackTrace?: string;
  readonly requestId?: string;
  readonly endpoint?: string;
  readonly severity: 'low' | 'medium' | 'high' | 'critical';
}

/**
 * Event type registry for type safety
 */
export interface EventTypeRegistry {
  'user.created': UserCreatedEvent;
  'user.updated': UserUpdatedEvent;
  'user.deleted': UserDeletedEvent;
  'asset.created': AssetCreatedEvent;
  'asset.status.changed': AssetStatusChangedEvent;
  'asset.maintenance.scheduled': AssetMaintenanceScheduledEvent;
  'workorder.created': WorkOrderCreatedEvent;
  'workorder.assigned': WorkOrderAssignedEvent;
  'workorder.completed': WorkOrderCompletedEvent;
  'space.reserved': SpaceReservedEvent;
  'space.occupancy.changed': SpaceOccupancyChangedEvent;
  'system.health.check': SystemHealthCheckEvent;
  'system.error': SystemErrorEvent;
}

/**
 * Type-safe event names
 */
export type EventType = keyof EventTypeRegistry;

/**
 * Enterprise event bus implementation
 */
export class EnterpriseEventBus extends EventEmitter {
  private static instance: EnterpriseEventBus;
  private readonly handlerRegistrations = new Map<string, EventHandlerRegistration[]>();
  private readonly metrics: EventMetrics = {
    totalEvents: 0,
    successfulEvents: 0,
    failedEvents: 0,
    averageProcessingTime: 0,
    eventsByType: {}
  };

  private constructor() {
    super();
    this.setMaxListeners(100); // Prevent memory leaks warning for high handler counts
  }

  static getInstance(): EnterpriseEventBus {
    if (!EnterpriseEventBus.instance) {
      EnterpriseEventBus.instance = new EnterpriseEventBus();
    }
    return EnterpriseEventBus.instance;
  }

  /**
   * Subscribe to events with type safety
   */
  subscribe<T extends EventType>(
    eventType: T,
    handler: EventHandler<EventTypeRegistry[T]>,
    options: EventSubscriptionOptions = {}
  ): () => void {
    const registration: EventHandlerRegistration = {
      handler: handler as EventHandler,
      priority: options.priority ?? 0,
      once: options.once ?? false
    };

    if (!this.handlerRegistrations.has(eventType)) {
      this.handlerRegistrations.set(eventType, []);
    }

    const registrations = this.handlerRegistrations.get(eventType)!;
    registrations.push(registration);
    
    // Sort by priority (higher priority first)
    registrations.sort((a, b) => b.priority - a.priority);

    logger.debug(`Event handler subscribed to ${eventType}`, { 
      priority: registration.priority,
      once: registration.once 
    });

    // Return unsubscribe function
    return () => {
      const index = registrations.indexOf(registration);
      if (index > -1) {
        registrations.splice(index, 1);
        logger.debug(`Event handler unsubscribed from ${eventType}`);
      }
    };
  }

  /**
   * Publish events with type safety
   */
  async publish<T extends EventType>(
    eventType: T,
    data: EventTypeRegistry[T],
    options: EventPublishOptions = {}
  ): Promise<void> {
    const event: BaseEvent & { data: EventTypeRegistry[T] } = {
      id: this.generateEventId(),
      type: eventType,
      timestamp: new Date(),
      source: 'turbo-asset-system',
      version: '1.0.0',
      data,
      ...this.extractContextFromData(data)
    };

    const startTime = Date.now();

    try {
      logger.debug(`Publishing event: ${eventType}`, { eventId: event.id });

      this.metrics.totalEvents++;
      this.metrics.eventsByType[eventType] = (this.metrics.eventsByType[eventType] || 0) + 1;

      const registrations = this.handlerRegistrations.get(eventType) || [];
      
      if (registrations.length === 0) {
        logger.warn(`No handlers registered for event: ${eventType}`, { eventId: event.id });
        return;
      }

      const handlerPromises = registrations.map(async (registration) => {
        try {
          if (registration.once) {
            // Remove handler after execution for once-only subscriptions
            const index = registrations.indexOf(registration);
            if (index > -1) {
              registrations.splice(index, 1);
            }
          }

          const result = registration.handler(event);
          if (result instanceof Promise) {
            await result;
          }
        } catch (error) {
          logger.error(`Event handler error for ${eventType}`, {
            eventId: event.id,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
          throw error;
        }
      });

      if (options.async === false) {
        // Execute handlers synchronously
        for (const promise of handlerPromises) {
          await promise;
        }
      } else {
        // Execute handlers asynchronously
        await Promise.allSettled(handlerPromises);
      }

      this.metrics.successfulEvents++;
      
      const processingTime = Date.now() - startTime;
      this.updateAverageProcessingTime(processingTime);

      logger.debug(`Event published successfully: ${eventType}`, { 
        eventId: event.id,
        handlerCount: registrations.length,
        processingTime
      });

    } catch (error) {
      this.metrics.failedEvents++;
      
      logger.error(`Failed to publish event: ${eventType}`, {
        eventId: event.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      throw error;
    }
  }

  /**
   * Get event metrics
   */
  getMetrics(): EventMetrics {
    return { ...this.metrics };
  }

  /**
   * Clear all event handlers
   */
  clearAllHandlers(): void {
    this.handlerRegistrations.clear();
    this.removeAllListeners();
    logger.info('All event handlers cleared');
  }

  /**
   * Get handler count for event type
   */
  getHandlerCount(eventType: string): number {
    return this.handlerRegistrations.get(eventType)?.length ?? 0;
  }

  /**
   * Generate unique event ID
   */
  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Extract context information from event data
   */
  private extractContextFromData(data: EventPayload): Partial<BaseEvent> {
    const context: Partial<BaseEvent> = {};
    
    if ('userId' in data && typeof data.userId === 'string') {
      context.userId = data.userId;
    }
    
    if ('organizationId' in data && typeof data.organizationId === 'string') {
      context.organizationId = data.organizationId;
    }
    
    if ('correlationId' in data && typeof data.correlationId === 'string') {
      context.correlationId = data.correlationId;
    }
    
    return context;
  }

  /**
   * Update average processing time using exponential moving average
   */
  private updateAverageProcessingTime(processingTime: number): void {
    const alpha = 0.1; // Smoothing factor
    const previousAverage = this.metrics.averageProcessingTime;
    
    this.metrics.averageProcessingTime = previousAverage === 0 
      ? processingTime 
      : alpha * processingTime + (1 - alpha) * previousAverage;
  }
}

/**
 * Event bus singleton instance
 */
export const eventBus = EnterpriseEventBus.getInstance();

/**
 * Convenience functions for common operations
 */
export const publishEvent = eventBus.publish.bind(eventBus);
export const subscribeToEvent = eventBus.subscribe.bind(eventBus);

/**
 * Event decorators for method-level event publishing
 */
export function PublishEvent<T extends EventType>(eventType: T) {
  return function (
    target: unknown,
    propertyName: string,
    descriptor: PropertyDescriptor
  ) {
    const method = descriptor.value;

    descriptor.value = async function (this: unknown, ...args: unknown[]) {
      const result = await method.apply(this, args);
      
      // Extract event data from result or method context
      if (result && typeof result === 'object') {
        await publishEvent(eventType, result as EventTypeRegistry[T]);
      }
      
      return result;
    };

    return descriptor;
  };
}