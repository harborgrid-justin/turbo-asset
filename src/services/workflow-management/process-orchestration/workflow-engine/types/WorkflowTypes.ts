/**
 * Workflow Management Types - Core workflow and process types
 * 
 * Part of the Workflow Management domain within Turbo Asset IWMS
 */

// Re-export types from main types directory for backward compatibility
export { 
  WorkflowStep, 
  WorkflowDefinition, 
  WorkflowInstanceData, 
  ApprovalData 
} from '../../../../../src/types/workflow';

export interface WorkflowEngineConfiguration {
  maxConcurrentWorkflows: number;
  defaultSlaHours: number;
  escalationTimeoutMinutes: number;
  retryAttempts: number;
  enableNotifications: boolean;
  enableAuditLogging: boolean;
}

export interface WorkflowMetrics {
  totalWorkflows: number;
  completedWorkflows: number;
  pendingWorkflows: number;
  overduWorkflows: number;
  averageCompletionTime: number;
  approvalRate: number;
}

export interface StepExecutionContext {
  instanceId: string;
  stepId: string;
  userId?: string;
  organizationId: string;
  data: Record<string, any>;
  variables: Record<string, any>;
  previousSteps: string[];
}

export interface WorkflowNotificationData {
  workflowInstanceId: string;
  stepId: string;
  type: 'ASSIGNMENT' | 'APPROVAL_REQUEST' | 'DEADLINE_WARNING' | 'COMPLETION' | 'REJECTION';
  recipientId: string;
  templateData: Record<string, any>;
  dueDate?: Date;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
}