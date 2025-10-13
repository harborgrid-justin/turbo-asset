/**
 * Prisma to Sequelize Compatibility Adapter
 * 
 * This adapter provides a compatibility layer to help transition from Prisma to Sequelize.
 * It mimics Prisma's API using Sequelize under the hood, allowing for gradual migration.
 * 
 * NOTE: This is a transitional solution. For production use, define proper Sequelize models.
 */

import { sequelize } from '../config/database';
import { QueryTypes, Transaction } from 'sequelize';
import { logger } from '../config/logger';

/**
 * Generic query result type
 */
type QueryResult<T> = T[];

/**
 * Where clause type
 */
type WhereClause = Record<string, any>;

/**
 * Include/Join configuration
 */
interface IncludeConfig {
  model?: string;
  table?: string;
  as?: string;
  where?: WhereClause;
}

/**
 * Find options
 */
interface FindOptions {
  where?: WhereClause;
  include?: IncludeConfig | IncludeConfig[];
  select?: string[];
  orderBy?: Record<string, 'asc' | 'desc'>;
  take?: number;
  skip?: number;
  cursor?: { id: string };
}

/**
 * Create a Prisma-like model adapter for a table
 */
export function createModelAdapter(tableName: string) {
  return {
    /**
     * Find many records (similar to prisma.model.findMany)
     */
    async findMany(options: FindOptions = {}): Promise<QueryResult<any>> {
      try {
        const { where = {}, take, skip, orderBy, select } = options;
        
        const selectClause = select && select.length > 0 
          ? select.join(', ') 
          : '*';
        
        let sql = `SELECT ${selectClause} FROM "${tableName}"`;
        const replacements: any[] = [];
        
        // Build WHERE clause
        if (Object.keys(where).length > 0) {
          const whereConditions: string[] = [];
          Object.entries(where).forEach(([key, value]) => {
            if (typeof value === 'object' && value !== null) {
              // Handle operators like { contains: 'text' }
              if (value.contains) {
                whereConditions.push(`"${key}" ILIKE ?`);
                replacements.push(`%${value.contains}%`);
              } else if (value.equals !== undefined) {
                whereConditions.push(`"${key}" = ?`);
                replacements.push(value.equals);
              } else if (value.in) {
                whereConditions.push(`"${key}" IN (?)`);
                replacements.push(value.in);
              } else if (value.gt !== undefined) {
                whereConditions.push(`"${key}" > ?`);
                replacements.push(value.gt);
              } else if (value.gte !== undefined) {
                whereConditions.push(`"${key}" >= ?`);
                replacements.push(value.gte);
              } else if (value.lt !== undefined) {
                whereConditions.push(`"${key}" < ?`);
                replacements.push(value.lt);
              } else if (value.lte !== undefined) {
                whereConditions.push(`"${key}" <= ?`);
                replacements.push(value.lte);
              }
            } else {
              whereConditions.push(`"${key}" = ?`);
              replacements.push(value);
            }
          });
          
          if (whereConditions.length > 0) {
            sql += ' WHERE ' + whereConditions.join(' AND ');
          }
        }
        
        // Build ORDER BY clause
        if (orderBy) {
          const orderClauses = Object.entries(orderBy)
            .map(([key, direction]) => `"${key}" ${direction.toUpperCase()}`)
            .join(', ');
          sql += ` ORDER BY ${orderClauses}`;
        }
        
        // Add pagination
        if (take) {
          sql += ` LIMIT ?`;
          replacements.push(take);
        }
        if (skip) {
          sql += ` OFFSET ?`;
          replacements.push(skip);
        }
        
        const results = await sequelize.query(sql, {
          replacements,
          type: QueryTypes.SELECT,
        });
        
        return results;
      } catch (error) {
        logger.error(`Error in findMany for ${tableName}:`, error);
        throw error;
      }
    },

    /**
     * Find first record (similar to prisma.model.findFirst)
     */
    async findFirst(options: FindOptions = {}): Promise<any | null> {
      const results = await this.findMany({ ...options, take: 1 });
      return results.length > 0 ? results[0] : null;
    },

    /**
     * Find unique record (similar to prisma.model.findUnique)
     */
    async findUnique(options: { where: WhereClause }): Promise<any | null> {
      return await this.findFirst(options);
    },

    /**
     * Find by primary key
     */
    async findByPk(id: string | number): Promise<any | null> {
      return await this.findUnique({ where: { id } });
    },

    /**
     * Create a new record (similar to prisma.model.create)
     */
    async create(options: { data: Record<string, any> }): Promise<any> {
      try {
        const { data } = options;
        const columns = Object.keys(data);
        const values = Object.values(data);
        const placeholders = columns.map((_, i) => `?`).join(', ');
        
        const sql = `
          INSERT INTO "${tableName}" (${columns.map(c => `"${c}"`).join(', ')})
          VALUES (${placeholders})
          RETURNING *
        `;
        
        const results = await sequelize.query(sql, {
          replacements: values,
          type: QueryTypes.INSERT,
        }) as any[];
        
        // Sequelize returns [results, metadata] for INSERT
        return Array.isArray(results[0]) && results[0].length > 0 ? results[0][0] : null;
      } catch (error) {
        logger.error(`Error in create for ${tableName}:`, error);
        throw error;
      }
    },

    /**
     * Update records (similar to prisma.model.update)
     */
    async update(options: { where: WhereClause; data: Record<string, any> }): Promise<any> {
      try {
        const { where, data } = options;
        const setClauses: string[] = [];
        const replacements: any[] = [];
        
        Object.entries(data).forEach(([key, value]) => {
          setClauses.push(`"${key}" = ?`);
          replacements.push(value);
        });
        
        const whereConditions: string[] = [];
        Object.entries(where).forEach(([key, value]) => {
          whereConditions.push(`"${key}" = ?`);
          replacements.push(value);
        });
        
        const sql = `
          UPDATE "${tableName}"
          SET ${setClauses.join(', ')}
          WHERE ${whereConditions.join(' AND ')}
          RETURNING *
        `;
        
        const results = await sequelize.query(sql, {
          replacements,
          type: QueryTypes.UPDATE,
        }) as any[];
        
        return Array.isArray(results) && results.length > 0 && Array.isArray(results[0]) && results[0].length > 0 ? results[0][0] : null;
      } catch (error) {
        logger.error(`Error in update for ${tableName}:`, error);
        throw error;
      }
    },

    /**
     * Update many records
     */
    async updateMany(options: { where: WhereClause; data: Record<string, any> }): Promise<{ count: number }> {
      try {
        const { where, data } = options;
        const setClauses: string[] = [];
        const replacements: any[] = [];
        
        Object.entries(data).forEach(([key, value]) => {
          setClauses.push(`"${key}" = ?`);
          replacements.push(value);
        });
        
        const whereConditions: string[] = [];
        Object.entries(where).forEach(([key, value]) => {
          whereConditions.push(`"${key}" = ?`);
          replacements.push(value);
        });
        
        const sql = `
          UPDATE "${tableName}"
          SET ${setClauses.join(', ')}
          ${whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : ''}
        `;
        
        const result = await sequelize.query(sql, {
          replacements,
          type: QueryTypes.UPDATE,
        }) as [any, number];
        
        return { count: result[1] || 0 };
      } catch (error) {
        logger.error(`Error in updateMany for ${tableName}:`, error);
        throw error;
      }
    },

    /**
     * Delete records (similar to prisma.model.delete)
     */
    async delete(options: { where: WhereClause }): Promise<any> {
      try {
        const { where } = options;
        const whereConditions: string[] = [];
        const replacements: any[] = [];
        
        Object.entries(where).forEach(([key, value]) => {
          whereConditions.push(`"${key}" = ?`);
          replacements.push(value);
        });
        
        const sql = `
          DELETE FROM "${tableName}"
          WHERE ${whereConditions.join(' AND ')}
          RETURNING *
        `;
        
        const results = await sequelize.query(sql, {
          replacements,
          type: QueryTypes.DELETE,
        });
        
        return Array.isArray(results) && results.length > 0 ? results[0] : null;
      } catch (error) {
        logger.error(`Error in delete for ${tableName}:`, error);
        throw error;
      }
    },

    /**
     * Delete many records
     */
    async deleteMany(options: { where?: WhereClause } = {}): Promise<{ count: number }> {
      try {
        const { where = {} } = options;
        const whereConditions: string[] = [];
        const replacements: any[] = [];
        
        Object.entries(where).forEach(([key, value]) => {
          whereConditions.push(`"${key}" = ?`);
          replacements.push(value);
        });
        
        const sql = `
          DELETE FROM "${tableName}"
          ${whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : ''}
        `;
        
        const result = await sequelize.query(sql, {
          replacements,
          type: QueryTypes.DELETE,
        }) as any;
        
        // For DELETE queries, Sequelize returns [undefined, count] or similar
        return { count: Array.isArray(result) && result[1] !== undefined ? result[1] : 0 };
      } catch (error) {
        logger.error(`Error in deleteMany for ${tableName}:`, error);
        throw error;
      }
    },

    /**
     * Count records (similar to prisma.model.count)
     */
    async count(options: { where?: WhereClause } = {}): Promise<number> {
      try {
        const { where = {} } = options;
        const whereConditions: string[] = [];
        const replacements: any[] = [];
        
        Object.entries(where).forEach(([key, value]) => {
          whereConditions.push(`"${key}" = ?`);
          replacements.push(value);
        });
        
        const sql = `
          SELECT COUNT(*) as count FROM "${tableName}"
          ${whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : ''}
        `;
        
        const results = await sequelize.query(sql, {
          replacements,
          type: QueryTypes.SELECT,
        }) as any[];
        
        return results[0]?.count ? parseInt(results[0].count, 10) : 0;
      } catch (error) {
        logger.error(`Error in count for ${tableName}:`, error);
        throw error;
      }
    },

    /**
     * Upsert - Insert or update a record (similar to prisma.model.upsert)
     */
    async upsert(options: { 
      where: WhereClause; 
      create: Record<string, any>; 
      update: Record<string, any> 
    }): Promise<any> {
      try {
        const { where, create, update } = options;
        
        // Try to find existing record
        const existing = await this.findFirst({ where });
        
        if (existing) {
          // Update existing record
          return await this.update({ where, data: update });
        } else {
          // Create new record
          return await this.create({ data: create });
        }
      } catch (error) {
        logger.error(`Error in upsert for ${tableName}:`, error);
        throw error;
      }
    },

    /**
     * Create many records (similar to prisma.model.createMany)
     */
    async createMany(options: { data: Record<string, any>[] }): Promise<{ count: number }> {
      try {
        const { data } = options;
        
        if (!data || data.length === 0) {
          return { count: 0 };
        }
        
        const firstRecord = data[0];
        if (!firstRecord) {
          return { count: 0 };
        }
        
        const columns = Object.keys(firstRecord);
        const values: any[] = [];
        
        const valuePlaceholders = data.map(record => {
          const recordValues = columns.map(col => record[col]);
          values.push(...recordValues);
          return `(${columns.map(() => '?').join(', ')})`;
        }).join(', ');
        
        const sql = `
          INSERT INTO "${tableName}" (${columns.map(c => `"${c}"`).join(', ')})
          VALUES ${valuePlaceholders}
        `;
        
        const result = await sequelize.query(sql, {
          replacements: values,
          type: QueryTypes.INSERT,
        }) as [any, number];
        
        return { count: data.length };
      } catch (error) {
        logger.error(`Error in createMany for ${tableName}:`, error);
        throw error;
      }
    },

    /**
     * Aggregate operations (similar to prisma.model.aggregate)
     */
    async aggregate(options: {
      where?: WhereClause;
      _count?: boolean | { [key: string]: boolean };
      _sum?: { [key: string]: boolean };
      _avg?: { [key: string]: boolean };
      _min?: { [key: string]: boolean };
      _max?: { [key: string]: boolean };
    } = {}): Promise<any> {
      try {
        const { where = {}, _count, _sum, _avg, _min, _max } = options;
        
        const aggregations: string[] = [];
        
        // Handle _count
        if (_count) {
          if (typeof _count === 'boolean' && _count) {
            aggregations.push('COUNT(*) as _count');
          } else if (typeof _count === 'object') {
            Object.entries(_count).forEach(([field, include]) => {
              if (include) {
                aggregations.push(`COUNT("${field}") as _count_${field}`);
              }
            });
          }
        }
        
        // Handle _sum
        if (_sum && typeof _sum === 'object') {
          Object.entries(_sum).forEach(([field, include]) => {
            if (include) {
              aggregations.push(`SUM("${field}") as _sum_${field}`);
            }
          });
        }
        
        // Handle _avg
        if (_avg && typeof _avg === 'object') {
          Object.entries(_avg).forEach(([field, include]) => {
            if (include) {
              aggregations.push(`AVG("${field}") as _avg_${field}`);
            }
          });
        }
        
        // Handle _min
        if (_min && typeof _min === 'object') {
          Object.entries(_min).forEach(([field, include]) => {
            if (include) {
              aggregations.push(`MIN("${field}") as _min_${field}`);
            }
          });
        }
        
        // Handle _max
        if (_max && typeof _max === 'object') {
          Object.entries(_max).forEach(([field, include]) => {
            if (include) {
              aggregations.push(`MAX("${field}") as _max_${field}`);
            }
          });
        }
        
        if (aggregations.length === 0) {
          aggregations.push('COUNT(*) as _count');
        }
        
        const whereConditions: string[] = [];
        const replacements: any[] = [];
        
        Object.entries(where).forEach(([key, value]) => {
          whereConditions.push(`"${key}" = ?`);
          replacements.push(value);
        });
        
        const sql = `
          SELECT ${aggregations.join(', ')}
          FROM "${tableName}"
          ${whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : ''}
        `;
        
        const results = await sequelize.query(sql, {
          replacements,
          type: QueryTypes.SELECT,
        }) as any[];
        
        return results[0] || {};
      } catch (error) {
        logger.error(`Error in aggregate for ${tableName}:`, error);
        throw error;
      }
    },

    /**
     * Group by operations (similar to prisma.model.groupBy)
     */
    async groupBy(options: {
      by: string | string[];
      where?: WhereClause;
      _count?: boolean | { [key: string]: boolean };
      _sum?: { [key: string]: boolean };
      _avg?: { [key: string]: boolean };
      _min?: { [key: string]: boolean };
      _max?: { [key: string]: boolean };
      orderBy?: Record<string, 'asc' | 'desc'>;
      take?: number;
      skip?: number;
    }): Promise<any[]> {
      try {
        const { by, where = {}, _count, _sum, _avg, _min, _max, orderBy, take, skip } = options;
        
        const groupByFields = Array.isArray(by) ? by : [by];
        const selectFields = groupByFields.map(f => `"${f}"`).join(', ');
        const aggregations: string[] = [];
        
        // Handle _count
        if (_count) {
          if (typeof _count === 'boolean' && _count) {
            aggregations.push('COUNT(*) as _count');
          } else if (typeof _count === 'object') {
            Object.entries(_count).forEach(([field, include]) => {
              if (include) {
                aggregations.push(`COUNT("${field}") as _count_${field}`);
              }
            });
          }
        }
        
        // Handle _sum
        if (_sum && typeof _sum === 'object') {
          Object.entries(_sum).forEach(([field, include]) => {
            if (include) {
              aggregations.push(`SUM("${field}") as _sum_${field}`);
            }
          });
        }
        
        // Handle _avg
        if (_avg && typeof _avg === 'object') {
          Object.entries(_avg).forEach(([field, include]) => {
            if (include) {
              aggregations.push(`AVG("${field}") as _avg_${field}`);
            }
          });
        }
        
        // Handle _min
        if (_min && typeof _min === 'object') {
          Object.entries(_min).forEach(([field, include]) => {
            if (include) {
              aggregations.push(`MIN("${field}") as _min_${field}`);
            }
          });
        }
        
        // Handle _max
        if (_max && typeof _max === 'object') {
          Object.entries(_max).forEach(([field, include]) => {
            if (include) {
              aggregations.push(`MAX("${field}") as _max_${field}`);
            }
          });
        }
        
        const whereConditions: string[] = [];
        const replacements: any[] = [];
        
        Object.entries(where).forEach(([key, value]) => {
          whereConditions.push(`"${key}" = ?`);
          replacements.push(value);
        });
        
        let sql = `
          SELECT ${selectFields}${aggregations.length > 0 ? ', ' + aggregations.join(', ') : ''}
          FROM "${tableName}"
          ${whereConditions.length > 0 ? 'WHERE ' + whereConditions.join(' AND ') : ''}
          GROUP BY ${selectFields}
        `;
        
        // Build ORDER BY clause
        if (orderBy) {
          const orderClauses = Object.entries(orderBy)
            .map(([key, direction]) => `"${key}" ${direction.toUpperCase()}`)
            .join(', ');
          sql += ` ORDER BY ${orderClauses}`;
        }
        
        // Add pagination
        if (take) {
          sql += ` LIMIT ?`;
          replacements.push(take);
        }
        if (skip) {
          sql += ` OFFSET ?`;
          replacements.push(skip);
        }
        
        const results = await sequelize.query(sql, {
          replacements,
          type: QueryTypes.SELECT,
        });
        
        return results;
      } catch (error) {
        logger.error(`Error in groupBy for ${tableName}:`, error);
        throw error;
      }
    },
  };
}

/**
 * Prisma-like client adapter
 * Provides access to common models using Prisma-like API
 */
export const prismaAdapter = {
  // Core models
  user: createModelAdapter('users'),
  organization: createModelAdapter('organizations'),
  department: createModelAdapter('departments'),
  property: createModelAdapter('properties'),
  building: createModelAdapter('buildings'),
  floor: createModelAdapter('floors'),
  space: createModelAdapter('spaces'),
  asset: createModelAdapter('assets'),
  workflowDefinition: createModelAdapter('workflow_definitions'),
  workflowInstance: createModelAdapter('workflow_instances'),
  approval: createModelAdapter('approvals'),
  document: createModelAdapter('documents'),
  documentVersion: createModelAdapter('document_versions'),
  notification: createModelAdapter('notifications'),
  auditLog: createModelAdapter('audit_logs'),
  customFieldDefinition: createModelAdapter('custom_field_definitions'),
  customFieldValue: createModelAdapter('custom_field_values'),
  
  // Phase 3 models
  spaceBooking: createModelAdapter('space_bookings'),
  spaceUtilization: createModelAdapter('space_utilizations'),
  moveRequest: createModelAdapter('move_requests'),
  moveDetail: createModelAdapter('move_details'),
  chargebackRule: createModelAdapter('chargeback_rules'),
  emergencyPlan: createModelAdapter('emergency_plans'),
  cADFile: createModelAdapter('cad_files'),
  
  // Phase 4 models
  lease: createModelAdapter('leases'),
  leasePayment: createModelAdapter('lease_payments'),
  criticalDate: createModelAdapter('critical_dates'),
  
  // Phase 5 models
  workOrder: createModelAdapter('work_orders'),
  maintenanceSchedule: createModelAdapter('maintenance_schedules'),
  
  // Additional models
  bIReport: createModelAdapter('bi_reports'),
  dashboard: createModelAdapter('dashboards'),
  reportSchedule: createModelAdapter('report_schedules'),
  aPIQuota: createModelAdapter('api_quotas'),
  aPIUsage: createModelAdapter('api_usage'),
  
  // Extended models - Asset Management
  maintenanceRecord: createModelAdapter('maintenance_records'),
  assetDepreciation: createModelAdapter('asset_depreciations'),
  assetConditionRecord: createModelAdapter('asset_condition_records'),
  preventiveMaintenance: createModelAdapter('preventive_maintenances'),
  
  // Extended models - Inventory
  inventoryItem: createModelAdapter('inventory_items'),
  inventoryTransaction: createModelAdapter('inventory_transactions'),
  reorderAlert: createModelAdapter('reorder_alerts'),
  
  // Extended models - Energy & Sustainability
  energyMeter: createModelAdapter('energy_meters'),
  energyReading: createModelAdapter('energy_readings'),
  sustainabilityMetric: createModelAdapter('sustainability_metrics'),
  
  // Extended models - Capital Projects
  capitalProject: createModelAdapter('capital_projects'),
  projectTask: createModelAdapter('project_tasks'),
  projectBudget: createModelAdapter('project_budgets'),
  
  // Extended models - IoT
  ioTDevice: createModelAdapter('iot_devices'),
  ioTSensorReading: createModelAdapter('iot_sensor_readings'),
  conditionMonitoring: createModelAdapter('condition_monitorings'),
  
  // Extended models - Move Management
  moveVendor: createModelAdapter('move_vendors'),
  moveCost: createModelAdapter('move_costs'),
  
  // Extended models - Chargeback
  chargebackAllocation: createModelAdapter('chargeback_allocations'),
  
  // Extended models - Space
  spaceTemplate: createModelAdapter('space_templates'),
  
  // Extended models - Documents
  documentPermission: createModelAdapter('document_permissions'),
  
  // Extended models - System
  systemConfig: createModelAdapter('system_configs'),
  integrationRecord: createModelAdapter('integration_records'),
  
  // Extended models - SLA
  serviceLevelAgreement: createModelAdapter('service_level_agreements'),
  sLAPerformanceReport: createModelAdapter('sla_performance_reports'),
  
  // Extended models - Enterprise Integration
  enterpriseIntegration: createModelAdapter('enterprise_integrations'),
  integrationFlow: createModelAdapter('integration_flows'),
  
  // Extended models - Data Warehouse & BI
  dataWarehouse: createModelAdapter('data_warehouses'),
  eTLProcess: createModelAdapter('etl_processes'),
  
  // Extended models - Governance
  dataGovernanceRule: createModelAdapter('data_governance_rules'),
  masterDataRecord: createModelAdapter('master_data_records'),
  
  // Extended models - White Label
  whiteLabelConfig: createModelAdapter('white_label_configs'),
  subsidiaryBranding: createModelAdapter('subsidiary_brandings'),

  /**
   * Execute raw query (similar to prisma.$queryRaw)
   */
  $queryRaw: async (sql: string, ...params: any[]) => {
    return await sequelize.query(sql, {
      replacements: params,
      type: QueryTypes.RAW,
    });
  },

  /**
   * Execute raw query with specific type
   */
  $queryRawUnsafe: async (sql: string) => {
    return await sequelize.query(sql, {
      type: QueryTypes.RAW,
    });
  },

  /**
   * Execute transaction (similar to prisma.$transaction)
   */
  $transaction: async <T>(callback: (tx: Transaction) => Promise<T>): Promise<T> => {
    return await sequelize.transaction(callback);
  },

  /**
   * Connect to database (similar to prisma.$connect)
   */
  $connect: async () => {
    await sequelize.authenticate();
  },

  /**
   * Disconnect from database (similar to prisma.$disconnect)
   */
  $disconnect: async () => {
    await sequelize.close();
  },
};

/**
 * For backward compatibility, export as default
 */
export default prismaAdapter;
