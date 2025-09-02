/**
 * Workflow Engine Sub-Service - Comprehensive workflow orchestration and management
 * 
 * This sub-service handles all workflow operations including:
 * - Workflow definition management and validation
 * - Workflow instance lifecycle management
 * - Approval processes and delegation
 * - Step processing for different step types (approval, task, condition, notification)
 * - Workflow metrics and reporting
 * - SLA monitoring and escalation
 * 
 * Part of the Workflow Management domain within Turbo Asset IWMS
 */

// Core workflow services
export { WorkflowDefinitionService } from './WorkflowDefinitionService';
export { WorkflowInstanceService } from './WorkflowInstanceService';
export { WorkflowApprovalService } from './WorkflowApprovalService';
export { WorkflowStepProcessor } from './WorkflowStepProcessor';

// Types and constants
export * from './types/WorkflowTypes';
export * from './constants/WorkflowConstants';

// Import services for internal use
import { WorkflowEngineService } from './WorkflowEngineService';

/**
 * Main Workflow Engine Service - Orchestrates all workflow capabilities
 * 
 * This class provides a unified interface to all workflow functionality,
 * coordinating between the various specialized services to provide comprehensive
 * workflow management and process orchestration capabilities.
 */
export { WorkflowEngineService };

// Create and export default instance for backward compatibility
export const workflowEngine = new WorkflowEngineService();