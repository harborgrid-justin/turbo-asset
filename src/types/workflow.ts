export interface WorkflowStep {
  id: string;
  name: string;
  type: 'approval' | 'task' | 'condition' | 'notification';
  approvers?: string[];
  roles?: string[];
  condition?: string;
  sla?: {
    duration: number;
    unit: 'minutes' | 'hours' | 'days';
    escalation?: WorkflowStep;
  };
  nextSteps?: string[];
}

export interface WorkflowDefinition {
  id: string;
  name: string;
  description?: string;
  version: string;
  startStep: string;
  steps: WorkflowStep[];
  variables?: Record<string, any>;
}

export interface WorkflowInstanceData {
  instanceId: string;
  definitionId: string;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'EXPIRED';
  currentStepId?: string;
  data: Record<string, any>;
  startedAt: Date;
  completedAt?: Date;
  dueDate?: Date;
  priority: 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';
  initiatedById: string;
}

export interface ApprovalData {
  id: string;
  workflowInstanceId: string;
  stepId: string;
  approverId: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'DELEGATED';
  comments?: string;
  approvedAt?: Date;
  dueDate?: Date;
}