/**
 * Workflow Management Constants
 * 
 * Part of the Workflow Management domain within Turbo Asset IWMS
 */

export const WORKFLOW_CONSTANTS = {
  DEFAULT_SLA_HOURS: 24,
  MAX_CONCURRENT_WORKFLOWS: 100,
  ESCALATION_TIMEOUT_MINUTES: 15,
  MAX_RETRY_ATTEMPTS: 3,
  
  STEP_TYPES: {
    APPROVAL: 'approval',
    TASK: 'task',
    CONDITION: 'condition',
    NOTIFICATION: 'notification'
  } as const,

  WORKFLOW_STATUS: {
    PENDING: 'PENDING',
    IN_PROGRESS: 'IN_PROGRESS',
    COMPLETED: 'COMPLETED',
    CANCELLED: 'CANCELLED',
    EXPIRED: 'EXPIRED'
  } as const,

  APPROVAL_STATUS: {
    PENDING: 'PENDING',
    APPROVED: 'APPROVED',
    REJECTED: 'REJECTED',
    DELEGATED: 'DELEGATED'
  } as const,

  PRIORITY_LEVELS: {
    LOW: 'LOW',
    NORMAL: 'NORMAL',
    HIGH: 'HIGH',
    URGENT: 'URGENT'
  } as const
};

export const WORKFLOW_EVENTS = {
  WORKFLOW_STARTED: 'workflow.started',
  WORKFLOW_COMPLETED: 'workflow.completed',
  WORKFLOW_CANCELLED: 'workflow.cancelled',
  STEP_STARTED: 'step.started',
  STEP_COMPLETED: 'step.completed',
  APPROVAL_REQUESTED: 'approval.requested',
  APPROVAL_COMPLETED: 'approval.completed',
  SLA_BREACH_WARNING: 'sla.breach.warning',
  SLA_BREACHED: 'sla.breached'
};

export const DEFAULT_WORKFLOW_CONFIG: WorkflowEngineConfiguration = {
  maxConcurrentWorkflows: WORKFLOW_CONSTANTS.MAX_CONCURRENT_WORKFLOWS,
  defaultSlaHours: WORKFLOW_CONSTANTS.DEFAULT_SLA_HOURS,
  escalationTimeoutMinutes: WORKFLOW_CONSTANTS.ESCALATION_TIMEOUT_MINUTES,
  retryAttempts: WORKFLOW_CONSTANTS.MAX_RETRY_ATTEMPTS,
  enableNotifications: true,
  enableAuditLogging: true
};

// Import the type for the default config
import { WorkflowEngineConfiguration } from '../types/WorkflowTypes';