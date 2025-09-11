import { logger } from '../../../../config/logger';

/**
 * Portfolio Visualization Service - Generate charts and visualizations for portfolio analytics
 * Handles chart creation, data formatting, and visualization configurations
 * Part of the Portfolio Management domain within Turbo Asset IWMS
 */
export class PortfolioVisualizationService {

  /**
   * Generate portfolio overview charts
   */
  async generatePortfolioOverviewCharts(organizationId: string, data: any): Promise<ChartCollection> {
    try {
      const charts = [];

      // Occupancy rate trend chart
      const occupancyChart = await this.generateOccupancyTrendChart(data.occupancyData);
      charts.push(occupancyChart);

      // Financial performance chart
      const financialChart = await this.generateFinancialPerformanceChart(data.financialData);
      charts.push(financialChart);

      // Space utilization chart
      const utilizationChart = await this.generateSpaceUtilizationChart(data.utilizationData);
      charts.push(utilizationChart);

      // Property value distribution
      const valueChart = await this.generatePropertyValueChart(data.propertyData);
      charts.push(valueChart);

      return {
        organizationId,
        generatedAt: new Date(),
        charts,
        totalCharts: charts.length,
      };

    } catch (error: unknown) {
      logger.error('Failed to generate portfolio overview charts', {
        organizationId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Generate occupancy trend chart
   */
  private async generateOccupancyTrendChart(occupancyData: any): Promise<Chart> {
    return {
      id: 'occupancy_trend',
      type: 'LINE',
      title: 'Occupancy Rate Trend',
      data: {
        labels: occupancyData.labels || [],
        datasets: [{
          label: 'Occupancy Rate %',
          data: occupancyData.values || [],
          borderColor: '#3B82F6',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          fill: true,
        }]
      },
      options: {
        responsive: true,
        scales: {
          y: {
            beginAtZero: true,
            max: 100,
            ticks: {
              callback: (value: number) => `${value}%`
            }
          }
        },
        plugins: {
          legend: {
            display: true,
            position: 'top'
          },
          tooltip: {
            callbacks: {
              label: (context: any) => `${context.label}: ${context.parsed.y}%`
            }
          }
        }
      },
      insights: this.generateOccupancyInsights(occupancyData),
    };
  }

  /**
   * Generate financial performance chart
   */
  private async generateFinancialPerformanceChart(financialData: any): Promise<Chart> {
    return {
      id: 'financial_performance',
      type: 'BAR',
      title: 'Financial Performance',
      data: {
        labels: ['Revenue', 'Operating Costs', 'Net Income'],
        datasets: [{
          label: 'Amount ($)',
          data: [
            financialData.revenue || 0,
            financialData.operatingCosts || 0,
            financialData.netIncome || 0
          ],
          backgroundColor: [
            '#10B981', // Green for revenue
            '#EF4444', // Red for costs
            '#3B82F6'  // Blue for net income
          ]
        }]
      },
      options: {
        responsive: true,
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: (value: number) => `$${value.toLocaleString()}`
            }
          }
        },
        plugins: {
          legend: {
            display: false
          },
          tooltip: {
            callbacks: {
              label: (context: any) => `${context.label}: $${context.parsed.y.toLocaleString()}`
            }
          }
        }
      },
      insights: this.generateFinancialInsights(financialData),
    };
  }

  /**
   * Generate space utilization chart
   */
  private async generateSpaceUtilizationChart(utilizationData: any): Promise<Chart> {
    return {
      id: 'space_utilization',
      type: 'PIE',
      title: 'Space Utilization Distribution',
      data: {
        labels: ['Occupied', 'Available', 'Under Construction'],
        datasets: [{
          data: [
            utilizationData.occupied || 0,
            utilizationData.available || 0,
            utilizationData.underConstruction || 0
          ],
          backgroundColor: [
            '#10B981', // Green for occupied
            '#F59E0B', // Yellow for available
            '#6B7280'  // Gray for under construction
          ]
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            display: true,
            position: 'bottom'
          },
          tooltip: {
            callbacks: {
              label: (context: any) => {
                const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
                const percentage = ((context.parsed / total) * 100).toFixed(1);
                return `${context.label}: ${context.parsed.toLocaleString()} (${percentage}%)`;
              }
            }
          }
        }
      },
      insights: this.generateUtilizationInsights(utilizationData),
    };
  }

  /**
   * Generate property value chart
   */
  private async generatePropertyValueChart(propertyData: any): Promise<Chart> {
    return {
      id: 'property_values',
      type: 'DOUGHNUT',
      title: 'Property Value Distribution',
      data: {
        labels: propertyData.properties?.map((p: any) => p.name) || [],
        datasets: [{
          data: propertyData.properties?.map((p: any) => p.value) || [],
          backgroundColor: [
            '#3B82F6', '#10B981', '#F59E0B', '#EF4444',
            '#8B5CF6', '#EC4899', '#06B6D4', '#84CC16'
          ]
        }]
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            display: true,
            position: 'right'
          },
          tooltip: {
            callbacks: {
              label: (context: any) => {
                const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0);
                const percentage = ((context.parsed / total) * 100).toFixed(1);
                return `${context.label}: $${context.parsed.toLocaleString()} (${percentage}%)`;
              }
            }
          }
        }
      },
      insights: this.generatePropertyValueInsights(propertyData),
    };
  }

  /**
   * Generate KPI dashboard charts
   */
  async generateKPIDashboardCharts(organizationId: string, kpiData: any): Promise<Chart[]> {
    try {
      const charts = [];

      // KPI score gauge
      const scoreGauge = await this.generateKPIScoreGauge(kpiData.overallScore);
      charts.push(scoreGauge);

      // Category performance radar
      const radarChart = await this.generateCategoryRadarChart(kpiData.categories);
      charts.push(radarChart);

      // Trend comparison chart
      const trendChart = await this.generateKPITrendChart(kpiData.trends);
      charts.push(trendChart);

      return charts;

    } catch (error: unknown) {
      logger.error('Failed to generate KPI dashboard charts', {
        organizationId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Generate KPI score gauge
   */
  private async generateKPIScoreGauge(overallScore: number): Promise<Chart> {
    return {
      id: 'kpi_score_gauge',
      type: 'GAUGE',
      title: 'Overall Portfolio Score',
      data: {
        value: overallScore,
        min: 0,
        max: 100,
        thresholds: [
          { value: 60, color: '#EF4444', label: 'Poor' },
          { value: 75, color: '#F59E0B', label: 'Fair' },
          { value: 85, color: '#3B82F6', label: 'Good' },
          { value: 100, color: '#10B981', label: 'Excellent' }
        ]
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            display: false
          }
        }
      },
      insights: [`Overall portfolio performance: ${this.getScoreLabel(overallScore)}`],
    };
  }

  /**
   * Generate category radar chart
   */
  private async generateCategoryRadarChart(categories: any[]): Promise<Chart> {
    return {
      id: 'category_radar',
      type: 'RADAR',
      title: 'Performance by Category',
      data: {
        labels: categories.map(c => c.name),
        datasets: [{
          label: 'Current Performance',
          data: categories.map(c => c.score),
          borderColor: '#3B82F6',
          backgroundColor: 'rgba(59, 130, 246, 0.2)',
          pointBackgroundColor: '#3B82F6',
        }]
      },
      options: {
        responsive: true,
        scales: {
          r: {
            beginAtZero: true,
            max: 100
          }
        }
      },
      insights: this.generateCategoryInsights(categories),
    };
  }

  /**
   * Generate KPI trend chart
   */
  private async generateKPITrendChart(trends: any[]): Promise<Chart> {
    return {
      id: 'kpi_trends',
      type: 'LINE',
      title: 'KPI Trends Over Time',
      data: {
        labels: trends.map(t => t.period),
        datasets: [{
          label: 'Portfolio Score',
          data: trends.map(t => t.score),
          borderColor: '#3B82F6',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          fill: true,
        }]
      },
      options: {
        responsive: true,
        scales: {
          y: {
            beginAtZero: true,
            max: 100
          }
        }
      },
      insights: this.generateTrendInsights(trends),
    };
  }

  /**
   * Generate lease expiration chart
   */
  async generateLeaseExpirationChart(leaseData: any[]): Promise<Chart> {
    try {
      const expirationCounts = this.categorizeLeaseExpirations(leaseData);

      return {
        id: 'lease_expirations',
        type: 'BAR',
        title: 'Upcoming Lease Expirations',
        data: {
          labels: ['Next 30 Days', '31-60 Days', '61-90 Days', '91+ Days'],
          datasets: [{
            label: 'Number of Leases',
            data: [
              expirationCounts.next30Days,
              expirationCounts.next31To60Days,
              expirationCounts.next61To90Days,
              expirationCounts.beyond90Days
            ],
            backgroundColor: [
              '#EF4444', // Red for immediate
              '#F59E0B', // Yellow for near term
              '#3B82F6', // Blue for medium term
              '#6B7280'  // Gray for long term
            ]
          }]
        },
        options: {
          responsive: true,
          scales: {
            y: {
              beginAtZero: true,
              ticks: {
                stepSize: 1
              }
            }
          }
        },
        insights: this.generateLeaseExpirationInsights(expirationCounts),
      };

    } catch (error: unknown) {
      logger.error('Failed to generate lease expiration chart', { error: error.message });
      throw error;
    }
  }

  /**
   * Helper methods for generating insights
   */

  private generateOccupancyInsights(data: any): string[] {
    const insights = [];
    const currentRate = data.currentRate || 0;
    const trend = data.trend || 'stable';

    if (currentRate > 90) {
      insights.push('High occupancy rate indicates strong demand');
    } else if (currentRate < 70) {
      insights.push('Low occupancy rate may indicate market challenges');
    }

    if (trend === 'up') {
      insights.push('Occupancy is trending upward');
    } else if (trend === 'down') {
      insights.push('Occupancy is declining - investigation recommended');
    }

    return insights;
  }

  private generateFinancialInsights(data: any): string[] {
    const insights = [];
    const margin = data.netIncome / data.revenue;

    if (margin > 0.3) {
      insights.push('Strong profit margin indicates efficient operations');
    } else if (margin < 0.1) {
      insights.push('Low profit margin suggests cost optimization needed');
    }

    return insights;
  }

  private generateUtilizationInsights(data: any): string[] {
    const insights = [];
    const total = data.occupied + data.available + data.underConstruction;
    const utilizationRate = (data.occupied / total) * 100;

    if (utilizationRate > 85) {
      insights.push('High utilization indicates efficient space management');
    } else if (utilizationRate < 70) {
      insights.push('Consider strategies to improve space utilization');
    }

    return insights;
  }

  private generatePropertyValueInsights(data: any): string[] {
    const insights = [];
    const properties = data.properties || [];

    if (properties.length > 0) {
      const totalValue = properties.reduce((sum: number, p: any) => sum + p.value, 0);
      const avgValue = totalValue / properties.length;
      insights.push(`Average property value: $${avgValue.toLocaleString()}`);
    }

    return insights;
  }

  private generateCategoryInsights(categories: any[]): string[] {
    const insights = [];
    const sortedCategories = categories.sort((a, b) => b.score - a.score);

    if (sortedCategories.length > 0) {
      insights.push(`Strongest category: ${sortedCategories[0].name} (${sortedCategories[0].score.toFixed(1)})`);
      insights.push(`Needs attention: ${sortedCategories[sortedCategories.length - 1].name} (${sortedCategories[sortedCategories.length - 1].score.toFixed(1)})`);
    }

    return insights;
  }

  private generateTrendInsights(trends: any[]): string[] {
    const insights = [];
    
    if (trends.length >= 2) {
      const current = trends[trends.length - 1].score;
      const previous = trends[trends.length - 2].score;
      const change = current - previous;

      if (change > 2) {
        insights.push('Performance is improving');
      } else if (change < -2) {
        insights.push('Performance is declining');
      } else {
        insights.push('Performance is stable');
      }
    }

    return insights;
  }

  private generateLeaseExpirationInsights(counts: any): string[] {
    const insights = [];
    
    if (counts.next30Days > 0) {
      insights.push(`${counts.next30Days} leases expiring within 30 days - immediate attention required`);
    }
    
    if (counts.next31To60Days > 5) {
      insights.push('High number of leases expiring in next 60 days - begin renewal discussions');
    }

    return insights;
  }

  private categorizeLeaseExpirations(leases: any[]): any {
    const now = new Date();
    const counts = {
      next30Days: 0,
      next31To60Days: 0,
      next61To90Days: 0,
      beyond90Days: 0
    };

    leases.forEach(lease => {
      const daysToExpiration = Math.ceil((lease.endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysToExpiration <= 30) {
        counts.next30Days++;
      } else if (daysToExpiration <= 60) {
        counts.next31To60Days++;
      } else if (daysToExpiration <= 90) {
        counts.next61To90Days++;
      } else {
        counts.beyond90Days++;
      }
    });

    return counts;
  }

  private getScoreLabel(score: number): string {
    if (score >= 85) {return 'Excellent';}
    if (score >= 75) {return 'Good';}
    if (score >= 60) {return 'Fair';}
    return 'Poor';
  }
}

// Type definitions
interface ChartCollection {
  organizationId: string;
  generatedAt: Date;
  charts: Chart[];
  totalCharts: number;
}

interface Chart {
  id: string;
  type: ChartType;
  title: string;
  data: any;
  options?: any;
  insights?: string[];
}

type ChartType = 'LINE' | 'BAR' | 'PIE' | 'DOUGHNUT' | 'AREA' | 'GAUGE' | 'RADAR' | 'HEATMAP';