/**
 * Financial Management Sub-Service - Complete financial planning and operations
 * 
 * This sub-service handles all financial management operations including:
 * - Budget forecasting and planning
 * - Chargeback allocation and management
 * - Financial consolidation and reporting
 * - Cost tracking and analysis
 * - Financial workflow automation
 * 
 * Part of the Financial Management domain within Turbo Asset IWMS
 */

// Core financial management services
export { BudgetForecastService } from './BudgetForecastService';
export { ChargebackService } from './ChargebackService';
export { FinancialConsolidationService } from './FinancialConsolidationService';

// Import services for internal use
import { BudgetForecastService } from './BudgetForecastService';
import { ChargebackService } from './ChargebackService';
import { FinancialConsolidationService } from './FinancialConsolidationService';

/**
 * Main Financial Planning Service - Orchestrates all financial operations
 * 
 * This class provides a unified interface to all financial management capabilities,
 * coordinating between budget forecasting, chargeback management, and financial consolidation.
 */
export class FinancialPlanningService {
  private budgetService: BudgetForecastService;
  private chargebackService: ChargebackService;
  private consolidationService: FinancialConsolidationService;

  constructor() {
    // Initialize all sub-services
    this.budgetService = new BudgetForecastService();
    this.chargebackService = new ChargebackService();
    this.consolidationService = new FinancialConsolidationService();
  }

  // Expose service getters for direct access when needed
  get budget() { return this.budgetService; }
  get chargeback() { return this.chargebackService; }
  get consolidation() { return this.consolidationService; }

  // Convenience methods that delegate to appropriate sub-services
  
  /**
   * Create comprehensive budget with forecast
   */
  async createBudget(organizationId: string, budgetData: any) {
    return this.budgetService.createBudget(organizationId, budgetData);
  }

  /**
   * Generate budget forecast
   */
  async generateForecast(organizationId: string, forecastOptions: any) {
    return this.budgetService.generateForecast(organizationId, forecastOptions);
  }

  /**
   * Create chargeback rule
   */
  async createChargebackRule(ruleData: any) {
    return this.chargebackService.createChargebackRule(ruleData);
  }

  /**
   * Process chargeback allocation
   */
  async processChargebackAllocation(organizationId: string, period: string) {
    return this.chargebackService.processChargebackAllocation(organizationId, period);
  }

  /**
   * Create consolidation rule
   */
  async createConsolidationRule(organizationId: string, ruleData: any) {
    return this.consolidationService.createConsolidationRule(organizationId, ruleData);
  }

  /**
   * Process financial consolidation
   */
  async processConsolidation(organizationId: string, period: string) {
    return this.consolidationService.processConsolidation(organizationId, period);
  }

  /**
   * Get comprehensive financial analytics
   */
  async getFinancialAnalytics(organizationId: string, options: any = {}) {
    const [budgetAnalytics, chargebackAnalytics, consolidationAnalytics] = await Promise.all([
      this.budgetService.getBudgetAnalytics?.(organizationId, options),
      this.chargebackService.getChargebackAnalytics?.(organizationId, options),
      this.consolidationService.getConsolidationAnalytics?.(organizationId, options),
    ]);

    return {
      budget: budgetAnalytics,
      chargeback: chargebackAnalytics,
      consolidation: consolidationAnalytics,
      generatedAt: new Date(),
    };
  }
}