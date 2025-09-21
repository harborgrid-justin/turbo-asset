/**
 * OpenAPI/Swagger Documentation and Validation System
 * Enterprise-grade API documentation with request/response validation
 */

import { Request, Response, NextFunction, Express } from 'express';
import { getEnvironmentConfig } from '@/config/environment-validation';
import { logger } from '@/config/enterprise-logger';
import { ValidationError } from '@/core/errors/error-handler';

interface APIDocumentationConfig {
  title: string;
  version: string;
  description: string;
  contact: {
    name: string;
    url: string;
    email: string;
  };
  license: {
    name: string;
    url: string;
  };
  servers: Array<{
    url: string;
    description: string;
  }>;
}

class APIDocumentationManager {
  private static instance: APIDocumentationManager;
  private config = getEnvironmentConfig();
  private swaggerSpec: any;
  private documentationConfig: APIDocumentationConfig;

  private constructor() {
    this.documentationConfig = {
      title: 'Turbo Asset API',
      version: '1.0.0',
      description: 'Enterprise IWMS Platform - Production-ready API for facilities management, real estate, and asset tracking',
      contact: {
        name: 'Turbo Asset API Support',
        url: 'https://docs.turboasset.com',
        email: 'support@turboasset.com',
      },
      license: {
        name: 'MIT',
        url: 'https://opensource.org/licenses/MIT',
      },
      servers: this.getServers(),
    };

    this.generateSwaggerSpec();
  }

  public static getInstance(): APIDocumentationManager {
    if (!APIDocumentationManager.instance) {
      APIDocumentationManager.instance = new APIDocumentationManager();
    }
    return APIDocumentationManager.instance;
  }

  private getServers(): Array<{ url: string; description: string }> {
    const baseUrl = this.config.NODE_ENV === 'production'
      ? 'https://api.turboasset.com'
      : `http://localhost:${this.config.PORT}`;

    return [
      {
        url: `${baseUrl}/api`,
        description: `${this.config.NODE_ENV} server`,
      },
    ];
  }

  private generateSwaggerSpec(): void {
    // Simplified swagger spec generation - in production you'd use swagger-jsdoc
    this.swaggerSpec = {
      openapi: '3.0.0',
      info: {
        title: this.documentationConfig.title,
        version: this.documentationConfig.version,
        description: this.documentationConfig.description,
        contact: this.documentationConfig.contact,
        license: this.documentationConfig.license,
      },
      servers: this.documentationConfig.servers,
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
          apiKeyAuth: {
            type: 'apiKey',
            in: 'header',
            name: 'X-API-Key',
          },
        },
        schemas: this.getCommonSchemas(),
      },
      security: [
        { bearerAuth: [] },
        { apiKeyAuth: [] },
      ],
      tags: this.getAPITags(),
      paths: {
        '/health': {
          get: {
            tags: ['Health'],
            summary: 'System health check',
            description: 'Returns comprehensive system health information',
            responses: {
              '200': {
                description: 'System is healthy or degraded',
                content: {
                  'application/json': {
                    schema: { $ref: '#/components/schemas/HealthCheck' }
                  }
                }
              },
              '503': {
                description: 'System is unhealthy',
                content: {
                  'application/json': {
                    schema: { $ref: '#/components/schemas/Error' }
                  }
                }
              }
            }
          }
        }
      }
    };

    logger.info('Swagger specification generated successfully');
  }

  private getCommonSchemas() {
    return {
      Error: {
        type: 'object',
        required: ['error'],
        properties: {
          error: {
            type: 'object',
            required: ['message', 'code', 'status', 'timestamp', 'requestId'],
            properties: {
              message: { type: 'string', description: 'Human-readable error message' },
              code: { type: 'string', description: 'Machine-readable error code' },
              status: { type: 'integer', description: 'HTTP status code' },
              timestamp: { type: 'string', format: 'date-time' },
              requestId: { type: 'string', description: 'Unique request identifier' },
              path: { type: 'string', description: 'Request path' },
              method: { type: 'string', description: 'HTTP method' },
              details: { 
                type: 'object',
                description: 'Additional error details',
                additionalProperties: true,
              },
              validationErrors: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    field: { type: 'string' },
                    message: { type: 'string' },
                    value: { type: 'string' },
                    constraint: { type: 'string' },
                  },
                },
              },
            },
          },
        },
      },
      HealthCheck: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            enum: ['healthy', 'degraded', 'unhealthy'],
          },
          timestamp: { type: 'string', format: 'date-time' },
          uptime: { type: 'number', description: 'Uptime in milliseconds' },
          version: { type: 'string' },
          environment: { type: 'string' },
          checks: {
            type: 'object',
            additionalProperties: {
              type: 'object',
              properties: {
                status: { type: 'string', enum: ['pass', 'fail', 'warn'] },
                duration: { type: 'number' },
                error: { type: 'string' },
                metadata: { type: 'object', additionalProperties: true },
              },
            },
          },
        },
      },
      PaginatedResponse: {
        type: 'object',
        properties: {
          data: {
            type: 'array',
            items: { type: 'object' },
          },
          pagination: {
            type: 'object',
            properties: {
              page: { type: 'integer', minimum: 1 },
              limit: { type: 'integer', minimum: 1, maximum: 100 },
              total: { type: 'integer', minimum: 0 },
              pages: { type: 'integer', minimum: 0 },
              hasNext: { type: 'boolean' },
              hasPrev: { type: 'boolean' },
            },
          },
          meta: {
            type: 'object',
            properties: {
              requestId: { type: 'string' },
              timestamp: { type: 'string', format: 'date-time' },
              duration: { type: 'number', description: 'Response time in milliseconds' },
            },
          },
        },
      },
    };
  }

  private getAPITags() {
    return [
      { name: 'Health', description: 'System health and monitoring endpoints' },
      { name: 'Authentication', description: 'Authentication and authorization' },
      { name: 'Assets', description: 'Asset management operations' },
      { name: 'Work Orders', description: 'Work order management' },
      { name: 'Maintenance', description: 'Maintenance scheduling and tracking' },
      { name: 'Properties', description: 'Property and real estate management' },
      { name: 'Spaces', description: 'Space management and utilization' },
      { name: 'Portfolio', description: 'Portfolio analysis and reporting' },
      { name: 'Reporting', description: 'Business intelligence and reporting' },
      { name: 'Integration', description: 'External system integrations' },
      { name: 'Administration', description: 'System administration' },
    ];
  }

  /**
   * Setup documentation endpoints (simplified for now)
   */
  public setupDocumentation(app: Express): void {
    const docsPath = '/api/docs';
    const specPath = '/api/docs/spec';

    // Serve the OpenAPI spec as JSON
    app.get(specPath, (req: Request, res: Response) => {
      res.setHeader('Content-Type', 'application/json');
      res.json(this.swaggerSpec);
    });

    // API information endpoint
    app.get('/api', (req: Request, res: Response) => {
      res.json({
        name: this.documentationConfig.title,
        version: this.documentationConfig.version,
        description: this.documentationConfig.description,
        specification: `${req.protocol}://${req.get('host')}${specPath}`,
        contact: this.documentationConfig.contact,
        license: this.documentationConfig.license,
        endpoints: {
          health: '/health',
          ready: '/ready',
          live: '/live',
          spec: specPath,
        },
      });
    });

    logger.info('API documentation configured', {
      specUrl: specPath,
      environment: this.config.NODE_ENV,
    });
  }

  /**
   * Validation middleware generator
   */
  public createValidationMiddleware(schema: any) {
    return (req: Request, res: Response, next: NextFunction) => {
      try {
        // Validate request body
        if (schema.body) {
          const bodyValidation = this.validateAgainstSchema(req.body, schema.body);
          if (!bodyValidation.valid) {
            throw new ValidationError(
              'Request body validation failed',
              bodyValidation.errors
            );
          }
        }

        // Validate query parameters
        if (schema.query) {
          const queryValidation = this.validateAgainstSchema(req.query, schema.query);
          if (!queryValidation.valid) {
            throw new ValidationError(
              'Query parameters validation failed',
              queryValidation.errors
            );
          }
        }

        // Validate path parameters
        if (schema.params) {
          const paramsValidation = this.validateAgainstSchema(req.params, schema.params);
          if (!paramsValidation.valid) {
            throw new ValidationError(
              'Path parameters validation failed',
              paramsValidation.errors
            );
          }
        }

        next();
      } catch (error) {
        next(error);
      }
    };
  }

  private validateAgainstSchema(data: any, schema: any): {
    valid: boolean;
    errors: Array<{ field: string; message: string; value?: any }>;
  } {
    // This is a simplified validation - in production you'd use a proper JSON Schema validator
    const errors: Array<{ field: string; message: string; value?: any }> = [];

    if (schema.required) {
      for (const field of schema.required) {
        if (!data || data[field] === undefined || data[field] === null) {
          errors.push({
            field,
            message: `${field} is required`,
            value: data?.[field],
          });
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get the generated Swagger specification
   */
  public getSwaggerSpec(): any {
    return this.swaggerSpec;
  }

  /**
   * Update documentation configuration
   */
  public updateConfiguration(config: Partial<APIDocumentationConfig>): void {
    this.documentationConfig = { ...this.documentationConfig, ...config };
    this.generateSwaggerSpec();
    logger.info('API documentation configuration updated', config);
  }

  /**
   * Health check for documentation system
   */
  public getHealth(): {
    status: 'healthy' | 'degraded' | 'unhealthy';
    timestamp: string;
    details: Record<string, unknown>;
  } {
    const hasSpec = !!this.swaggerSpec;
    const specSize = hasSpec ? JSON.stringify(this.swaggerSpec).length : 0;

    return {
      status: hasSpec ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      details: {
        specificationGenerated: hasSpec,
        specificationSize: specSize,
        documentationTitle: this.documentationConfig.title,
        documentationVersion: this.documentationConfig.version,
        environment: this.config.NODE_ENV,
      },
    };
  }
}

// Export singleton instance
export const apiDocumentation = APIDocumentationManager.getInstance();

// Export types and utilities
export { APIDocumentationManager, APIDocumentationConfig };

// Common validation schemas
export const commonValidationSchemas = {
  uuid: {
    type: 'string',
    pattern: '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$',
  },
  pagination: {
    type: 'object',
    properties: {
      page: { type: 'integer', minimum: 1, default: 1 },
      limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
      sort: { type: 'string' },
      order: { type: 'string', enum: ['asc', 'desc'], default: 'asc' },
    },
  },
  dateRange: {
    type: 'object',
    properties: {
      startDate: { type: 'string', format: 'date-time' },
      endDate: { type: 'string', format: 'date-time' },
    },
  },
};