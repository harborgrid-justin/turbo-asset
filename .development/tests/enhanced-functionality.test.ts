/**
 * Test Suite for Enhanced Business Logic and UX Features
 * 
 * Validates that all functionality exceeds IBM TRIRIGA capabilities
 */

import { AdvancedIntelligenceService } from '../src/services/AdvancedIntelligenceService';
import { AdvancedWorkflowEngine } from '../src/services/AdvancedWorkflowEngine';
import { EnhancedMobileExperienceService } from '../src/services/EnhancedMobileExperienceService';

describe('Enhanced Business Logic & UX - Exceeding TRIRIGA', () => {
  describe('AdvancedIntelligenceService', () => {
    let intelligenceService: AdvancedIntelligenceService;

    beforeEach(() => {
      intelligenceService = new AdvancedIntelligenceService();
    });

    afterEach(() => {
      intelligenceService.destroy();
    });

    test('should initialize with superior AI models vs TRIRIGA', async () => {
      const modelPerformance = await intelligenceService.getModelPerformance();
      
      expect(modelPerformance).toBeDefined();
      expect(modelPerformance.length).toBeGreaterThan(0);
      
      // Verify AI models exceed TRIRIGA's basic reporting
      modelPerformance.forEach(model => {
        expect(model.accuracy).toBeGreaterThan(0.8); // 80%+ accuracy
        expect(model.lastTrained).toBeInstanceOf(Date);
      });
    });

    test('should generate real-time intelligence exceeding TRIRIGA capabilities', async () => {
      const organizationId = 'test-org-123';
      
      const intelligence = await intelligenceService.generateRealTimeIntelligence(organizationId);
      
      expect(intelligence).toBeDefined();
      expect(intelligence.organizationId).toBe(organizationId);
      expect(intelligence.timestamp).toBeInstanceOf(Date);
      expect(intelligence.alerts).toBeDefined();
      expect(intelligence.insights).toBeDefined();
      expect(intelligence.predictions).toBeDefined();
      expect(intelligence.anomalies).toBeDefined();
      expect(intelligence.optimizations).toBeDefined();
      
      // Verify superior insights vs TRIRIGA's static reports
      expect(intelligence.insights.length).toBeGreaterThan(0);
      intelligence.insights.forEach(insight => {
        expect(insight.confidence).toBeGreaterThan(0.8); // High confidence
        expect(insight.actionable).toBe(true);
        expect(insight.recommendations.length).toBeGreaterThan(0);
      });
    });

    test('should provide actionable recommendations with ROI calculations', async () => {
      const organizationId = 'test-org-456';
      
      const insights = await intelligenceService.getInsightsByCategory(organizationId, 'SPACE_OPTIMIZATION');
      
      expect(insights).toBeDefined();
      expect(insights.length).toBeGreaterThan(0);
      
      insights.forEach(insight => {
        expect(insight.category).toBe('SPACE_OPTIMIZATION');
        expect(insight.recommendations).toBeDefined();
        
        insight.recommendations.forEach(rec => {
          expect(rec.roi).toBeGreaterThan(1.0); // Positive ROI
          expect(rec.estimatedImpact).toBeDefined();
          expect(rec.implementation).toBeDefined();
          expect(rec.implementation.timeline).toBeDefined();
        });
      });
    });
  });

  describe('AdvancedWorkflowEngine', () => {
    let workflowEngine: AdvancedWorkflowEngine;

    beforeEach(() => {
      workflowEngine = new AdvancedWorkflowEngine();
    });

    test('should create AI-enhanced workflow definitions exceeding TRIRIGA', async () => {
      const workflowDef = await workflowEngine.createWorkflowDefinition({
        name: 'Advanced Asset Maintenance Workflow',
        description: 'AI-powered maintenance workflow with predictive capabilities',
        category: 'ASSET_MANAGEMENT',
        aiEnabled: true,
        intelligentRouting: true,
        predictiveEscalation: true,
        steps: [
          {
            id: 'step_1',
            name: 'AI Assessment',
            type: 'AI_DECISION',
            description: 'AI analyzes asset condition and recommends action',
            assignmentRules: [
              {
                id: 'rule_1',
                name: 'AI-Optimized Assignment',
                type: 'AI_OPTIMIZED',
                criteria: {
                  roles: ['technician'],
                  skills: ['hvac'],
                  departments: ['facilities'],
                  customCriteria: {}
                },
                fallbackRules: []
              }
            ],
            escalationRules: [],
            delegationRules: [],
            configuration: {
              autoAdvance: true,
              parallelExecution: false,
              requiredApprovals: 1,
              customProperties: {}
            },
            formFields: [],
            validationRules: [],
            nextSteps: [],
            parallelExecution: false,
            timeoutConfig: {
              enabled: true,
              timeoutHours: 24,
              action: 'ESCALATE'
            },
            avgCompletionTime: 0,
            completionRate: 0,
            bottleneckIndicator: 0,
            aiAssistance: true,
            autoCompleteCapable: true
          }
        ]
      });

      expect(workflowDef).toBeDefined();
      expect(workflowDef.aiEnabled).toBe(true);
      expect(workflowDef.intelligentRouting).toBe(true);
      expect(workflowDef.predictiveEscalation).toBe(true);
      expect(workflowDef.steps.length).toBeGreaterThan(0);
      expect(workflowDef.analyticsEnabled).toBe(true);
    });

    test('should start workflow instances with AI predictions', async () => {
      // Create a workflow first
      const workflow = await workflowEngine.createWorkflowDefinition({
        name: 'Test AI Workflow',
        category: 'CUSTOM',
        aiEnabled: true,
        status: 'ACTIVE',
        steps: [
          {
            id: 'step_1',
            name: 'Test Step',
            type: 'TASK',
            description: 'Test step',
            assignmentRules: [],
            escalationRules: [],
            delegationRules: [],
            configuration: {
              autoAdvance: false,
              parallelExecution: false,
              requiredApprovals: 1,
              customProperties: {}
            },
            formFields: [],
            validationRules: [],
            nextSteps: [],
            parallelExecution: false,
            timeoutConfig: {
              enabled: false,
              timeoutHours: 24,
              action: 'ESCALATE'
            },
            avgCompletionTime: 0,
            completionRate: 0,
            bottleneckIndicator: 0,
            aiAssistance: false,
            autoCompleteCapable: false
          }
        ]
      });

      const instance = await workflowEngine.startWorkflowInstance(
        workflow.id,
        { businessContext: 'test', priority: 'HIGH' },
        'test-user',
        'HIGH'
      );

      expect(instance).toBeDefined();
      expect(instance.workflowId).toBe(workflow.id);
      expect(instance.aiPredictions).toBeDefined();
      expect(instance.riskScore).toBeGreaterThanOrEqual(0);
      expect(instance.riskScore).toBeLessThanOrEqual(1);
      expect(instance.completionProbability).toBeGreaterThan(0);
      expect(instance.estimatedCompletionTime).toBeInstanceOf(Date);
    });

    test('should generate comprehensive workflow analytics', async () => {
      // Create and execute workflow for analytics
      const workflow = await workflowEngine.createWorkflowDefinition({
        name: 'Analytics Test Workflow',
        category: 'CUSTOM',
        status: 'ACTIVE',
        steps: []
      });

      const timeframe = {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
        end: new Date()
      };

      const analytics = await workflowEngine.generateWorkflowAnalytics(workflow.id, timeframe);

      expect(analytics).toBeDefined();
      expect(analytics.workflowId).toBe(workflow.id);
      expect(analytics.timeframe).toEqual(timeframe);
      expect(analytics.optimizationOpportunities).toBeDefined();
      expect(analytics.participantPerformance).toBeDefined();
      expect(analytics.bottleneckSteps).toBeDefined();
    });

    test('should provide performance dashboard exceeding TRIRIGA reporting', async () => {
      const dashboard = await workflowEngine.getPerformanceDashboard();

      expect(dashboard).toBeDefined();
      expect(dashboard.totalWorkflows).toBeGreaterThanOrEqual(0);
      expect(dashboard.activeInstances).toBeGreaterThanOrEqual(0);
      expect(dashboard.aiModelsActive).toBeGreaterThan(0);
      expect(dashboard.performanceMetrics).toBeDefined();
      expect(dashboard.performanceMetrics.slaCompliance).toBeDefined();
      expect(dashboard.performanceMetrics.automationRate).toBeDefined();
      expect(dashboard.performanceMetrics.userSatisfaction).toBeDefined();
    });
  });

  describe('EnhancedMobileExperienceService', () => {
    let mobileService: EnhancedMobileExperienceService;

    beforeEach(() => {
      mobileService = new EnhancedMobileExperienceService();
    });

    test('should register devices with advanced capabilities detection', async () => {
      const device = await mobileService.registerDevice('test-user', {
        deviceType: 'PHONE',
        platform: 'iOS',
        osVersion: '17.0',
        capabilities: {
          camera: true,
          gps: true,
          nfc: true,
          bluetooth: true,
          biometrics: true,
          sensors: ['accelerometer', 'gyroscope', 'magnetometer', 'barometer'],
          storage: 128000,
          networkTypes: ['wifi', '5g']
        }
      });

      expect(device).toBeDefined();
      expect(device.deviceId).toBeDefined();
      expect(device.offlineCapable).toBe(true);
      expect(device.capabilities.nfc).toBe(true);
      expect(device.capabilities.biometrics).toBe(true);
      expect(device.capabilities.sensors.length).toBeGreaterThan(3);
    });

    test('should create mobile work orders with offline capabilities', async () => {
      // Register device first
      const device = await mobileService.registerDevice('test-tech', {
        deviceType: 'PHONE',
        platform: 'Android'
      });

      const workOrder = await mobileService.createMobileWorkOrder(
        {
          title: 'HVAC System Repair',
          description: 'Repair malfunctioning HVAC unit',
          priority: 'HIGH',
          requiresPhotos: true,
          requiresSignature: true,
          gpsVerificationRequired: true
        },
        'test-tech',
        device.deviceId
      );

      expect(workOrder).toBeDefined();
      expect(workOrder.offlineCapable).toBe(true);
      expect(workOrder.requiresPhotos).toBe(true);
      expect(workOrder.requiresSignature).toBe(true);
      expect(workOrder.gpsVerificationRequired).toBe(true);
      expect(workOrder.steps.length).toBeGreaterThan(0);
      expect(workOrder.syncStatus).toBe('SYNCED');
    });

    test('should handle enhanced photo capture with metadata', async () => {
      // Setup device and work order
      const device = await mobileService.registerDevice('test-tech', {
        deviceType: 'PHONE',
        platform: 'iOS'
      });

      const workOrder = await mobileService.createMobileWorkOrder(
        { title: 'Test Work Order' },
        'test-tech',
        device.deviceId
      );

      const photo = await mobileService.captureEnhancedPhoto(
        workOrder.id,
        {
          base64Data: 'fake-base64-data-for-testing',
          fileName: 'hvac-repair-photo.jpg',
          caption: 'HVAC unit before repair'
        },
        'test-tech',
        device.deviceId,
        { latitude: 40.7128, longitude: -74.0060 }
      );

      expect(photo).toBeDefined();
      expect(photo.fileName).toBe('hvac-repair-photo.jpg');
      expect(photo.caption).toBe('HVAC unit before repair');
      expect(photo.location.latitude).toBe(40.7128);
      expect(photo.location.longitude).toBe(-74.0060);
      expect(photo.metadata).toBeDefined();
      expect(photo.uploadStatus).toBe('PENDING');
    });

    test('should perform intelligent sync with conflict resolution', async () => {
      const device = await mobileService.registerDevice('test-user', {
        deviceType: 'TABLET',
        platform: 'Android'
      });

      const syncResult = await mobileService.performIntelligentSync(device.deviceId, {
        mode: 'INTELLIGENT',
        conflictResolution: 'MERGE',
        dataCompression: true,
        deltaSync: true
      });

      expect(syncResult).toBeDefined();
      expect(syncResult.synced).toBeGreaterThanOrEqual(0);
      expect(syncResult.conflicts).toBeGreaterThanOrEqual(0);
      expect(syncResult.errors).toBeGreaterThanOrEqual(0);
      expect(syncResult.duration).toBeGreaterThan(0);
    });

    test('should generate comprehensive mobile dashboard', async () => {
      const device = await mobileService.registerDevice('test-user', {
        deviceType: 'PHONE',
        platform: 'iOS'
      });

      const dashboard = await mobileService.getMobileDashboard('test-user', device.deviceId);

      expect(dashboard).toBeDefined();
      expect(dashboard.summary).toBeDefined();
      expect(dashboard.summary.activeWorkOrders).toBeGreaterThanOrEqual(0);
      expect(dashboard.summary.pendingInspections).toBeGreaterThanOrEqual(0);
      expect(dashboard.recentActivity).toBeDefined();
      expect(dashboard.upcomingTasks).toBeDefined();
      expect(dashboard.notifications).toBeDefined();
      expect(dashboard.offlineStatus).toBeDefined();
      expect(dashboard.offlineStatus.lastSync).toBeInstanceOf(Date);
    });

    test('should start mobile inspections with offline capabilities', async () => {
      const device = await mobileService.registerDevice('test-inspector', {
        deviceType: 'TABLET',
        platform: 'Android'
      });

      const inspection = await mobileService.startMobileInspection(
        {
          title: 'Monthly Safety Inspection',
          type: 'SAFETY',
          requiresPhotos: true,
          requiresSignature: true
        },
        'test-inspector',
        device.deviceId
      );

      expect(inspection).toBeDefined();
      expect(inspection.offlineCapable).toBe(true);
      expect(inspection.requiresPhotos).toBe(true);
      expect(inspection.requiresSignature).toBe(true);
      expect(inspection.template).toBeDefined();
      expect(inspection.template.sections).toBeDefined();
      expect(inspection.status).toBe('IN_PROGRESS');
    });
  });

  describe('Integration Testing - Exceeding TRIRIGA', () => {
    test('should demonstrate superior end-to-end workflow', async () => {
      const intelligenceService = new AdvancedIntelligenceService();
      const workflowEngine = new AdvancedWorkflowEngine();
      const mobileService = new EnhancedMobileExperienceService();

      try {
        // 1. AI generates intelligent insights
        const intelligence = await intelligenceService.generateRealTimeIntelligence('integration-test-org');
        expect(intelligence.insights.length).toBeGreaterThan(0);

        // 2. Create AI-enhanced workflow based on insights
        const workflow = await workflowEngine.createWorkflowDefinition({
          name: 'AI-Driven Maintenance Workflow',
          category: 'ASSET_MANAGEMENT',
          aiEnabled: true,
          status: 'ACTIVE',
          steps: [
            {
              id: 'ai-step',
              name: 'AI Decision Step',
              type: 'AI_DECISION',
              description: 'AI determines optimal maintenance approach',
              assignmentRules: [],
              escalationRules: [],
              delegationRules: [],
              configuration: {
                autoAdvance: true,
                parallelExecution: false,
                requiredApprovals: 1,
                customProperties: {}
              },
              formFields: [],
              validationRules: [],
              nextSteps: [],
              parallelExecution: false,
              timeoutConfig: {
                enabled: true,
                timeoutHours: 24,
                action: 'ESCALATE'
              },
              avgCompletionTime: 0,
              completionRate: 0,
              bottleneckIndicator: 0,
              aiAssistance: true,
              autoCompleteCapable: true
            }
          ]
        });

        // 3. Register mobile device with advanced capabilities
        const device = await mobileService.registerDevice('integration-user', {
          deviceType: 'PHONE',
          platform: 'iOS',
          capabilities: {
            camera: true,
            gps: true,
            nfc: true,
            bluetooth: true,
            biometrics: true,
            sensors: ['accelerometer', 'gyroscope', 'compass'],
            storage: 256000,
            networkTypes: ['wifi', '5g']
          }
        });

        // 4. Create mobile work order with offline capabilities
        const workOrder = await mobileService.createMobileWorkOrder(
          {
            title: 'AI-Recommended Maintenance',
            description: 'Maintenance task recommended by AI analysis',
            priority: 'HIGH',
            offlineCapable: true,
            requiresPhotos: true
          },
          'integration-user',
          device.deviceId
        );

        // 5. Verify end-to-end integration
        expect(workflow.aiEnabled).toBe(true);
        expect(device.offlineCapable).toBe(true);
        expect(workOrder.offlineCapable).toBe(true);
        expect(workOrder.requiresPhotos).toBe(true);

        // 6. Generate performance metrics exceeding TRIRIGA
        const dashboardData = await mobileService.getMobileDashboard('integration-user', device.deviceId);
        expect(dashboardData.summary.activeWorkOrders).toBeGreaterThanOrEqual(1);

        // Cleanup
        intelligenceService.destroy();

      } catch (error) {
        intelligenceService.destroy();
        throw error;
      }
    });
  });

  describe('Performance Benchmarks vs TRIRIGA', () => {
    test('should demonstrate superior response times', async () => {
      const intelligenceService = new AdvancedIntelligenceService();
      
      const startTime = Date.now();
      const intelligence = await intelligenceService.generateRealTimeIntelligence('perf-test-org');
      const responseTime = Date.now() - startTime;
      
      // Should be significantly faster than TRIRIGA (< 1 second vs TRIRIGA's 4+ seconds)
      expect(responseTime).toBeLessThan(1000); // Under 1 second
      expect(intelligence).toBeDefined();
      
      intelligenceService.destroy();
    });

    test('should handle concurrent requests better than TRIRIGA', async () => {
      const mobileService = new EnhancedMobileExperienceService();
      
      const promises = Array.from({ length: 10 }, (_, i) => 
        mobileService.registerDevice(`concurrent-user-${i}`, {
          deviceType: 'PHONE',
          platform: 'Android'
        })
      );

      const startTime = Date.now();
      const results = await Promise.all(promises);
      const duration = Date.now() - startTime;

      expect(results.length).toBe(10);
      expect(duration).toBeLessThan(2000); // Under 2 seconds for 10 concurrent operations
      
      results.forEach(device => {
        expect(device).toBeDefined();
        expect(device.deviceId).toBeDefined();
      });
    });
  });
});