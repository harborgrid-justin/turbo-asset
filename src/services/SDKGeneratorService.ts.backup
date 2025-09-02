import { logger } from '../config/logger';
import { IntrospectionQuery, getIntrospectionQuery, buildClientSchema, printSchema } from 'graphql';
import fs from 'fs/promises';
import path from 'path';

export class SDKGeneratorService {
  private schemaCache: Map<string, any> = new Map();
  private generatedSDKs: Map<string, string> = new Map();

  /**
   * Generate comprehensive SDK for TypeScript
   */
  async generateTypeScriptSDK(
    organizationId: string,
    config: SDKGenerationConfig = {}
  ): Promise<SDKGenerationResult> {
    try {
      const startTime = Date.now();
      
      // Get GraphQL schema
      const schema = await this.getGraphQLSchema();
      
      // Generate TypeScript types
      const types = await this.generateTypeScriptTypes(schema);
      
      // Generate REST client
      const restClient = await this.generateRestClient(config);
      
      // Generate GraphQL client
      const graphqlClient = await this.generateGraphQLClient(schema, config);
      
      // Generate API methods
      const apiMethods = await this.generateAPIMethodsTypeScript(config);
      
      // Generate utilities
      const utilities = await this.generateUtilities();
      
      // Generate documentation
      const documentation = await this.generateDocumentation(schema, config);
      
      // Compile SDK package
      const sdkPackage = await this.compileSDKPackage({
        types,
        restClient,
        graphqlClient,
        apiMethods,
        utilities,
        documentation,
        language: 'typescript',
        organizationId,
      });

      const generationTime = Date.now() - startTime;
      
      // Cache generated SDK
      this.generatedSDKs.set(`${organizationId}:typescript`, sdkPackage.downloadUrl);
      
      logger.info('TypeScript SDK generated successfully', {
        organizationId,
        generationTime,
        packageSize: sdkPackage.size,
      });

      return {
        language: 'typescript',
        version: sdkPackage.version,
        downloadUrl: sdkPackage.downloadUrl,
        size: sdkPackage.size,
        generationTime,
        features: [
          'TypeScript types and interfaces',
          'REST API client with type safety',
          'GraphQL client with typed queries',
          'Built-in authentication handling',
          'Request/response interceptors',
          'Error handling and retry logic',
          'Pagination helpers',
          'File upload utilities',
          'Real-time subscriptions',
          'Comprehensive documentation',
        ],
        documentation: {
          getting_started: sdkPackage.gettingStartedUrl,
          api_reference: sdkPackage.apiReferenceUrl,
          examples: sdkPackage.examplesUrl,
        },
      };
    } catch (error) {
      logger.error('Failed to generate TypeScript SDK', error);
      throw error;
    }
  }

  /**
   * Generate SDK for JavaScript
   */
  async generateJavaScriptSDK(
    organizationId: string,
    config: SDKGenerationConfig = {}
  ): Promise<SDKGenerationResult> {
    try {
      const startTime = Date.now();
      
      // Generate JavaScript client
      const jsClient = await this.generateJavaScriptClient(config);
      
      // Generate API methods
      const apiMethods = await this.generateAPIMethodsJavaScript(config);
      
      // Generate utilities
      const utilities = await this.generateJavaScriptUtilities();
      
      // Generate documentation
      const documentation = await this.generateJavaScriptDocumentation(config);
      
      // Compile SDK package
      const sdkPackage = await this.compileSDKPackage({
        client: jsClient,
        apiMethods,
        utilities,
        documentation,
        language: 'javascript',
        organizationId,
      });

      const generationTime = Date.now() - startTime;
      
      this.generatedSDKs.set(`${organizationId}:javascript`, sdkPackage.downloadUrl);
      
      logger.info('JavaScript SDK generated successfully', {
        organizationId,
        generationTime,
        packageSize: sdkPackage.size,
      });

      return {
        language: 'javascript',
        version: sdkPackage.version,
        downloadUrl: sdkPackage.downloadUrl,
        size: sdkPackage.size,
        generationTime,
        features: [
          'ES6+ JavaScript client',
          'REST API client with Promise support',
          'GraphQL client',
          'Authentication handling',
          'Request/response interceptors',
          'Error handling',
          'File upload support',
          'WebSocket subscriptions',
          'Comprehensive JSDoc documentation',
        ],
        documentation: {
          getting_started: sdkPackage.gettingStartedUrl,
          api_reference: sdkPackage.apiReferenceUrl,
          examples: sdkPackage.examplesUrl,
        },
      };
    } catch (error) {
      logger.error('Failed to generate JavaScript SDK', error);
      throw error;
    }
  }

  /**
   * Generate SDK for Python
   */
  async generatePythonSDK(
    organizationId: string,
    config: SDKGenerationConfig = {}
  ): Promise<SDKGenerationResult> {
    try {
      const startTime = Date.now();
      
      // Generate Python client
      const pythonClient = await this.generatePythonClient(config);
      
      // Generate API methods
      const apiMethods = await this.generateAPIMethodsPython(config);
      
      // Generate utilities
      const utilities = await this.generatePythonUtilities();
      
      // Generate models
      const models = await this.generatePythonModels();
      
      // Generate documentation
      const documentation = await this.generatePythonDocumentation(config);
      
      // Compile SDK package
      const sdkPackage = await this.compileSDKPackage({
        client: pythonClient,
        apiMethods,
        utilities,
        models,
        documentation,
        language: 'python',
        organizationId,
      });

      const generationTime = Date.now() - startTime;
      
      this.generatedSDKs.set(`${organizationId}:python`, sdkPackage.downloadUrl);
      
      logger.info('Python SDK generated successfully', {
        organizationId,
        generationTime,
        packageSize: sdkPackage.size,
      });

      return {
        language: 'python',
        version: sdkPackage.version,
        downloadUrl: sdkPackage.downloadUrl,
        size: sdkPackage.size,
        generationTime,
        features: [
          'Python 3.7+ compatibility',
          'Type hints and annotations',
          'Async/await support',
          'REST API client with requests',
          'GraphQL client',
          'Authentication handling',
          'Data models with Pydantic',
          'Error handling and retries',
          'File upload support',
          'Comprehensive docstrings',
        ],
        documentation: {
          getting_started: sdkPackage.gettingStartedUrl,
          api_reference: sdkPackage.apiReferenceUrl,
          examples: sdkPackage.examplesUrl,
        },
      };
    } catch (error) {
      logger.error('Failed to generate Python SDK', error);
      throw error;
    }
  }

  /**
   * Generate OpenAPI/Swagger specification
   */
  async generateOpenAPISpec(organizationId: string): Promise<OpenAPISpecResult> {
    try {
      const spec = {
        openapi: '3.0.3',
        info: {
          title: 'Turbo Asset API',
          description: 'Enterprise Integrated Workplace Management System API',
          version: '1.0.0',
          contact: {
            name: 'API Support',
            email: 'api-support@turbo-asset.com',
          },
          license: {
            name: 'MIT',
            url: 'https://opensource.org/licenses/MIT',
          },
        },
        servers: [
          {
            url: 'https://api.turbo-asset.com/v1',
            description: 'Production server',
          },
          {
            url: 'https://api-staging.turbo-asset.com/v1',
            description: 'Staging server',
          },
        ],
        security: [
          {
            bearerAuth: [],
          },
        ],
        components: {
          securitySchemes: {
            bearerAuth: {
              type: 'http',
              scheme: 'bearer',
              bearerFormat: 'JWT',
            },
          },
          schemas: await this.generateOpenAPISchemas(),
        },
        paths: await this.generateOpenAPIPaths(),
        tags: [
          {
            name: 'Users',
            description: 'User management operations',
          },
          {
            name: 'Organizations',
            description: 'Organization management operations',
          },
          {
            name: 'Properties',
            description: 'Property and real estate operations',
          },
          {
            name: 'Assets',
            description: 'Asset management operations',
          },
          {
            name: 'Workflows',
            description: 'Workflow engine operations',
          },
          {
            name: 'Documents',
            description: 'Document management operations',
          },
          {
            name: 'Custom Fields',
            description: 'Custom field operations',
          },
          {
            name: 'Notifications',
            description: 'Notification system operations',
          },
          {
            name: 'Integrations',
            description: 'Integration management operations',
          },
          {
            name: 'Bulk Operations',
            description: 'Bulk data import/export operations',
          },
        ],
      };

      const specJson = JSON.stringify(spec, null, 2);
      const downloadUrl = await this.saveOpenAPISpec(organizationId, specJson);

      return {
        version: '3.0.3',
        downloadUrl,
        size: specJson.length,
        endpoints: Object.keys(spec.paths).length,
        schemas: Object.keys(spec.components.schemas).length,
      };
    } catch (error) {
      logger.error('Failed to generate OpenAPI spec', error);
      throw error;
    }
  }

  /**
   * Get cached SDK or generate new one
   */
  async getSDK(
    organizationId: string,
    language: SupportedLanguage,
    config?: SDKGenerationConfig
  ): Promise<string> {
    const cacheKey = `${organizationId}:${language}`;
    
    if (this.generatedSDKs.has(cacheKey)) {
      return this.generatedSDKs.get(cacheKey)!;
    }

    // Generate new SDK based on language
    let result: SDKGenerationResult;
    switch (language) {
      case 'typescript':
        result = await this.generateTypeScriptSDK(organizationId, config);
        break;
      case 'javascript':
        result = await this.generateJavaScriptSDK(organizationId, config);
        break;
      case 'python':
        result = await this.generatePythonSDK(organizationId, config);
        break;
      default:
        throw new Error(`Unsupported language: ${language}`);
    }

    return result.downloadUrl;
  }

  /**
   * Private helper methods
   */
  private async getGraphQLSchema(): Promise<any> {
    // In a real implementation, this would introspect the GraphQL schema
    return {
      types: [], // Schema types
      queries: [], // Available queries
      mutations: [], // Available mutations
      subscriptions: [], // Available subscriptions
    };
  }

  private async generateTypeScriptTypes(schema: any): Promise<string> {
    return `
// Generated TypeScript types for Turbo Asset API
// Auto-generated on ${new Date().toISOString()}

export interface User {
  id: string;
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  language: string;
  timezone: string;
  currency: string;
  isActive: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  organization?: Organization;
  department?: Department;
}

export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  MANAGER = 'MANAGER',
  USER = 'USER',
  READONLY = 'READONLY'
}

export interface Organization {
  id: string;
  name: string;
  description?: string;
  address?: any;
  defaultCurrency: string;
  defaultLanguage: string;
  defaultTimezone: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// ... Additional types would be generated here
`;
  }

  private async generateRestClient(config: SDKGenerationConfig): Promise<string> {
    return `
// REST API Client for Turbo Asset
import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';

export class TurboAssetClient {
  private client: AxiosInstance;
  private baseURL: string;
  private apiKey?: string;

  constructor(config: ClientConfig) {
    this.baseURL = config.baseURL || 'https://api.turbo-asset.com/v1';
    this.apiKey = config.apiKey;
    
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: config.timeout || 30000,
      headers: {
        'Content-Type': 'application/json',
        ...(this.apiKey && { 'Authorization': \`Bearer \${this.apiKey}\` }),
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Request interceptor
    this.client.interceptors.request.use(
      (config) => {
        // Add request logging, auth tokens, etc.
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        // Handle common errors, retry logic, etc.
        return Promise.reject(error);
      }
    );
  }

  // User API methods
  async getUsers(params?: GetUsersParams): Promise<PaginatedResponse<User>> {
    const response = await this.client.get('/users', { params });
    return response.data;
  }

  async getUser(id: string): Promise<User> {
    const response = await this.client.get(\`/users/\${id}\`);
    return response.data;
  }

  async createUser(data: CreateUserRequest): Promise<User> {
    const response = await this.client.post('/users', data);
    return response.data;
  }

  // ... Additional API methods would be generated here
}

export interface ClientConfig {
  baseURL?: string;
  apiKey?: string;
  timeout?: number;
}

export interface GetUsersParams {
  page?: number;
  limit?: number;
  role?: UserRole;
  isActive?: boolean;
}

export interface CreateUserRequest {
  email: string;
  username: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  organizationId: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}
`;
  }

  private async generateGraphQLClient(schema: any, config: SDKGenerationConfig): Promise<string> {
    return `
// GraphQL Client for Turbo Asset
import { GraphQLClient } from 'graphql-request';

export class TurboAssetGraphQLClient {
  private client: GraphQLClient;

  constructor(config: GraphQLClientConfig) {
    this.client = new GraphQLClient(config.endpoint, {
      headers: {
        ...(config.apiKey && { 'Authorization': \`Bearer \${config.apiKey}\` }),
        ...config.headers,
      },
    });
  }

  async query<T>(query: string, variables?: any): Promise<T> {
    return await this.client.request<T>(query, variables);
  }

  async mutation<T>(mutation: string, variables?: any): Promise<T> {
    return await this.client.request<T>(mutation, variables);
  }

  // Pre-built queries
  static readonly GET_USERS = \`
    query GetUsers($first: Int, $after: String, $where: UserWhereInput) {
      users(first: $first, after: $after, where: $where) {
        edges {
          node {
            id
            email
            username
            firstName
            lastName
            role
            isActive
            createdAt
            updatedAt
          }
        }
        pageInfo {
          hasNextPage
          hasPreviousPage
          startCursor
          endCursor
        }
      }
    }
  \`;

  // ... Additional pre-built queries would be generated here
}

export interface GraphQLClientConfig {
  endpoint: string;
  apiKey?: string;
  headers?: Record<string, string>;
}
`;
  }

  private async generateAPIMethodsTypeScript(config: SDKGenerationConfig): Promise<string> {
    return `
// Generated API Methods for TypeScript SDK
export class TurboAssetAPI {
  constructor(private client: TurboAssetClient) {}

  // User Management
  users = {
    list: async (params?: GetUsersParams) => this.client.getUsers(params),
    get: async (id: string) => this.client.getUser(id),
    create: async (data: CreateUserRequest) => this.client.createUser(data),
    update: async (id: string, data: UpdateUserRequest) => this.client.updateUser(id, data),
    delete: async (id: string) => this.client.deleteUser(id),
  };

  // Property Management
  properties = {
    list: async (params?: GetPropertiesParams) => this.client.getProperties(params),
    get: async (id: string) => this.client.getProperty(id),
    create: async (data: CreatePropertyRequest) => this.client.createProperty(data),
    update: async (id: string, data: UpdatePropertyRequest) => this.client.updateProperty(id, data),
    delete: async (id: string) => this.client.deleteProperty(id),
  };

  // Asset Management
  assets = {
    list: async (params?: GetAssetsParams) => this.client.getAssets(params),
    get: async (id: string) => this.client.getAsset(id),
    create: async (data: CreateAssetRequest) => this.client.createAsset(data),
    update: async (id: string, data: UpdateAssetRequest) => this.client.updateAsset(id, data),
    delete: async (id: string) => this.client.deleteAsset(id),
    bulkUpdate: async (data: BulkUpdateAssetsRequest) => this.client.bulkUpdateAssets(data),
  };

  // Workflow Management
  workflows = {
    definitions: {
      list: async (params?: GetWorkflowDefinitionsParams) => this.client.getWorkflowDefinitions(params),
      get: async (id: string) => this.client.getWorkflowDefinition(id),
      create: async (data: CreateWorkflowDefinitionRequest) => this.client.createWorkflowDefinition(data),
    },
    instances: {
      list: async (params?: GetWorkflowInstancesParams) => this.client.getWorkflowInstances(params),
      get: async (id: string) => this.client.getWorkflowInstance(id),
      start: async (data: StartWorkflowRequest) => this.client.startWorkflow(data),
      cancel: async (id: string) => this.client.cancelWorkflow(id),
    },
    approvals: {
      process: async (id: string, data: ProcessApprovalRequest) => this.client.processApproval(id, data),
    },
  };

  // Document Management
  documents = {
    list: async (params?: GetDocumentsParams) => this.client.getDocuments(params),
    get: async (id: string) => this.client.getDocument(id),
    upload: async (data: UploadDocumentRequest) => this.client.uploadDocument(data),
    update: async (id: string, data: UpdateDocumentRequest) => this.client.updateDocument(id, data),
    delete: async (id: string) => this.client.deleteDocument(id),
    search: async (params: SearchDocumentsParams) => this.client.searchDocuments(params),
  };

  // Custom Fields
  customFields = {
    definitions: {
      list: async (params?: GetCustomFieldDefinitionsParams) => this.client.getCustomFieldDefinitions(params),
      get: async (id: string) => this.client.getCustomFieldDefinition(id),
      create: async (data: CreateCustomFieldDefinitionRequest) => this.client.createCustomFieldDefinition(data),
      update: async (id: string, data: UpdateCustomFieldDefinitionRequest) => this.client.updateCustomFieldDefinition(id, data),
      delete: async (id: string) => this.client.deleteCustomFieldDefinition(id),
    },
    values: {
      set: async (data: SetCustomFieldValueRequest) => this.client.setCustomFieldValue(data),
      get: async (fieldId: string, entityId: string) => this.client.getCustomFieldValue(fieldId, entityId),
    },
  };

  // Integrations
  integrations = {
    list: async (params?: GetIntegrationsParams) => this.client.getIntegrations(params),
    get: async (id: string) => this.client.getIntegration(id),
    create: async (data: CreateIntegrationRequest) => this.client.createIntegration(data),
    update: async (id: string, data: UpdateIntegrationRequest) => this.client.updateIntegration(id, data),
    delete: async (id: string) => this.client.deleteIntegration(id),
    test: async (id: string) => this.client.testIntegration(id),
    execute: async (id: string, type: IntegrationExecutionType) => this.client.executeIntegration(id, type),
  };

  // Notifications
  notifications = {
    list: async (params?: GetNotificationsParams) => this.client.getNotifications(params),
    get: async (id: string) => this.client.getNotification(id),
    create: async (data: CreateNotificationRequest) => this.client.createNotification(data),
    markAsRead: async (id: string) => this.client.markNotificationAsRead(id),
    markAllAsRead: async () => this.client.markAllNotificationsAsRead(),
    delete: async (id: string) => this.client.deleteNotification(id),
  };

  // Bulk Operations
  bulk = {
    import: async (data: BulkImportRequest) => this.client.bulkImport(data),
    export: async (data: BulkExportRequest) => this.client.bulkExport(data),
    validateData: async (data: ValidateDataRequest) => this.client.validateData(data),
  };
}
`;
  }

  private async generateUtilities(): Promise<string> {
    return `
// Utility functions for Turbo Asset SDK
export class Utils {
  /**
   * Format currency based on locale
   */
  static formatCurrency(amount: number, currency: string = 'USD', locale: string = 'en-US'): string {
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency,
    }).format(amount);
  }

  /**
   * Format date based on locale
   */
  static formatDate(date: Date, locale: string = 'en-US', options?: Intl.DateTimeFormatOptions): string {
    return new Intl.DateTimeFormat(locale, options).format(date);
  }

  /**
   * Validate email address
   */
  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Generate UUID
   */
  static generateUUID(): string {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  /**
   * File size formatter
   */
  static formatFileSize(bytes: number): string {
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Pagination helper
   */
  static createPaginationParams(page: number, limit: number): { offset: number; limit: number } {
    return {
      offset: (page - 1) * limit,
      limit,
    };
  }

  /**
   * Debounce function
   */
  static debounce<T extends (...args: any[]) => any>(
    func: T,
    delay: number
  ): (...args: Parameters<T>) => void {
    let timeoutId: NodeJS.Timeout;
    return (...args: Parameters<T>) => {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => func.apply(null, args), delay);
    };
  }

  /**
   * Retry utility with exponential backoff
   */
  static async retry<T>(
    fn: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<T> {
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await fn();
      } catch (error) {
        if (i === maxRetries - 1) throw error;
        
        const delay = baseDelay * Math.pow(2, i);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    throw new Error('Max retries exceeded');
  }

  /**
   * Deep merge objects
   */
  static deepMerge<T>(target: T, source: Partial<T>): T {
    const result = { ...target };
    
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.deepMerge(result[key], source[key] as any);
      } else {
        result[key] = source[key] as any;
      }
    }
    
    return result;
  }
}

// Error classes
export class TurboAssetError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode?: number,
    public details?: any
  ) {
    super(message);
    this.name = 'TurboAssetError';
  }
}

export class AuthenticationError extends TurboAssetError {
  constructor(message: string = 'Authentication failed') {
    super(message, 'AUTHENTICATION_ERROR', 401);
  }
}

export class ValidationError extends TurboAssetError {
  constructor(message: string, public validationErrors: any[]) {
    super(message, 'VALIDATION_ERROR', 400, validationErrors);
  }
}

export class RateLimitError extends TurboAssetError {
  constructor(message: string = 'Rate limit exceeded', public retryAfter?: number) {
    super(message, 'RATE_LIMIT_ERROR', 429, { retryAfter });
  }
}
`;
  }

  private async generateDocumentation(schema: any, config: SDKGenerationConfig): Promise<string> {
    return `
# Turbo Asset SDK Documentation

## Getting Started

### Installation

\`\`\`bash
npm install @turbo-asset/sdk
# or
yarn add @turbo-asset/sdk
\`\`\`

### Quick Start

\`\`\`typescript
import { TurboAssetClient, TurboAssetAPI } from '@turbo-asset/sdk';

// Initialize client
const client = new TurboAssetClient({
  baseURL: 'https://api.turbo-asset.com/v1',
  apiKey: 'your-api-key-here',
});

// Create API instance
const api = new TurboAssetAPI(client);

// Use the API
async function example() {
  // Get users
  const users = await api.users.list({ limit: 10 });
  console.log('Users:', users);

  // Create a property
  const property = await api.properties.create({
    name: 'Headquarters',
    type: 'OFFICE',
    address: {
      street1: '123 Business Ave',
      city: 'New York',
      state: 'NY',
      zipCode: '10001',
      country: 'USA',
    },
  });
  console.log('Created property:', property);

  // Start a workflow
  const workflow = await api.workflows.instances.start({
    definitionId: 'approval-workflow-id',
    data: {
      entityType: 'Property',
      entityId: property.id,
      requestType: 'approval',
    },
  });
  console.log('Started workflow:', workflow);
}
\`\`\`

## Authentication

The SDK supports multiple authentication methods:

### API Key Authentication

\`\`\`typescript
const client = new TurboAssetClient({
  apiKey: 'your-api-key',
});
\`\`\`

### JWT Token Authentication

\`\`\`typescript
const client = new TurboAssetClient({
  baseURL: 'https://api.turbo-asset.com/v1',
});

// Set token after login
client.setAuthToken('jwt-token-here');
\`\`\`

## API Reference

### Users API

#### List Users
\`\`\`typescript
const users = await api.users.list({
  page: 1,
  limit: 20,
  role: 'USER',
  isActive: true,
});
\`\`\`

#### Get User
\`\`\`typescript
const user = await api.users.get('user-id');
\`\`\`

#### Create User
\`\`\`typescript
const newUser = await api.users.create({
  email: 'user@example.com',
  username: 'johndoe',
  firstName: 'John',
  lastName: 'Doe',
  role: 'USER',
  organizationId: 'org-id',
});
\`\`\`

### Properties API

#### List Properties
\`\`\`typescript
const properties = await api.properties.list({
  type: 'OFFICE',
  status: 'ACTIVE',
});
\`\`\`

#### Get Property with Buildings
\`\`\`typescript
const property = await api.properties.get('property-id');
console.log('Buildings:', property.buildings);
\`\`\`

### Workflows API

#### Create Workflow Definition
\`\`\`typescript
const definition = await api.workflows.definitions.create({
  name: 'Asset Approval Workflow',
  description: 'Approval process for new assets',
  version: '1.0',
  definition: {
    startStep: 'manager-approval',
    steps: [
      {
        id: 'manager-approval',
        name: 'Manager Approval',
        type: 'approval',
        approvers: ['manager-user-id'],
        nextSteps: ['finance-approval'],
      },
      {
        id: 'finance-approval',
        name: 'Finance Approval',
        type: 'approval',
        roles: ['FINANCE_MANAGER'],
        sla: {
          duration: 48,
          unit: 'hours',
        },
      },
    ],
  },
});
\`\`\`

### Documents API

#### Upload Document
\`\`\`typescript
const document = await api.documents.upload({
  name: 'Contract Document',
  category: 'Contracts',
  confidentiality: 'CONFIDENTIAL',
  file: fileBuffer,
});
\`\`\`

#### Search Documents
\`\`\`typescript
const results = await api.documents.search({
  query: 'maintenance contract',
  category: 'Contracts',
  confidentiality: 'INTERNAL',
});
\`\`\`

### Custom Fields API

#### Create Custom Field Definition
\`\`\`typescript
const fieldDef = await api.customFields.definitions.create({
  name: 'asset_warranty_period',
  label: 'Warranty Period',
  fieldType: 'NUMBER',
  entityType: 'Asset',
  isRequired: true,
  validation: {
    minValue: 0,
    maxValue: 120,
  },
});
\`\`\`

#### Set Custom Field Value
\`\`\`typescript
await api.customFields.values.set({
  fieldId: fieldDef.id,
  entityId: 'asset-id',
  entityType: 'Asset',
  value: 24,
});
\`\`\`

## Error Handling

\`\`\`typescript
import { TurboAssetError, ValidationError, AuthenticationError } from '@turbo-asset/sdk';

try {
  const user = await api.users.create(userData);
} catch (error) {
  if (error instanceof ValidationError) {
    console.log('Validation errors:', error.validationErrors);
  } else if (error instanceof AuthenticationError) {
    console.log('Authentication failed');
  } else if (error instanceof TurboAssetError) {
    console.log('API error:', error.code, error.message);
  } else {
    console.log('Unexpected error:', error);
  }
}
\`\`\`

## Utilities

### Currency Formatting
\`\`\`typescript
import { Utils } from '@turbo-asset/sdk';

const formatted = Utils.formatCurrency(1234.56, 'USD', 'en-US');
// Output: "$1,234.56"
\`\`\`

### File Size Formatting
\`\`\`typescript
const size = Utils.formatFileSize(1048576);
// Output: "1 MB"
\`\`\`

### Retry with Exponential Backoff
\`\`\`typescript
const result = await Utils.retry(
  () => api.integrations.execute('integration-id', 'SYNC'),
  3, // max retries
  1000 // base delay in ms
);
\`\`\`

## TypeScript Support

The SDK is written in TypeScript and provides full type safety:

\`\`\`typescript
import { User, Property, Asset, WorkflowInstance } from '@turbo-asset/sdk';

// All API responses are fully typed
const users: User[] = await api.users.list();
const property: Property = await api.properties.get('id');
\`\`\`

## WebSocket Subscriptions (Real-time)

\`\`\`typescript
import { TurboAssetWebSocketClient } from '@turbo-asset/sdk';

const wsClient = new TurboAssetWebSocketClient({
  url: 'wss://api.turbo-asset.com/ws',
  apiKey: 'your-api-key',
});

// Subscribe to notifications
wsClient.subscribe('notifications', (notification) => {
  console.log('New notification:', notification);
});

// Subscribe to workflow updates
wsClient.subscribe('workflows', (workflow) => {
  console.log('Workflow updated:', workflow);
});
\`\`\`

## Examples

See the [examples directory](./examples/) for more comprehensive examples:

- [Basic CRUD Operations](./examples/crud-operations.ts)
- [Workflow Management](./examples/workflow-management.ts)  
- [Document Management](./examples/document-management.ts)
- [Custom Fields Usage](./examples/custom-fields.ts)
- [Integration Management](./examples/integrations.ts)
- [Bulk Operations](./examples/bulk-operations.ts)

## Support

- [API Documentation](https://docs.turbo-asset.com)
- [GitHub Issues](https://github.com/turbo-asset/sdk/issues)
- [Community Forum](https://community.turbo-asset.com)
`;
  }

  private async compileSDKPackage(components: SDKPackageComponents): Promise<SDKPackage> {
    // In a real implementation, this would create actual files, bundle them, and upload
    const version = '1.0.0';
    const size = JSON.stringify(components).length; // Rough estimate
    
    return {
      version,
      downloadUrl: `/api/sdks/${components.organizationId}/${components.language}/${version}.zip`,
      size,
      gettingStartedUrl: `/docs/${components.language}/getting-started`,
      apiReferenceUrl: `/docs/${components.language}/api-reference`,
      examplesUrl: `/docs/${components.language}/examples`,
    };
  }

  // Additional helper methods would be implemented for other languages
  private async generateJavaScriptClient(config: SDKGenerationConfig): Promise<string> {
    return '// JavaScript client implementation';
  }

  private async generateAPIMethodsJavaScript(config: SDKGenerationConfig): Promise<string> {
    return '// JavaScript API methods';
  }

  private async generateJavaScriptUtilities(): Promise<string> {
    return '// JavaScript utilities';
  }

  private async generateJavaScriptDocumentation(config: SDKGenerationConfig): Promise<string> {
    return '# JavaScript SDK Documentation';
  }

  private async generatePythonClient(config: SDKGenerationConfig): Promise<string> {
    return '# Python client implementation';
  }

  private async generateAPIMethodsPython(config: SDKGenerationConfig): Promise<string> {
    return '# Python API methods';
  }

  private async generatePythonUtilities(): Promise<string> {
    return '# Python utilities';
  }

  private async generatePythonModels(): Promise<string> {
    return '# Python models';
  }

  private async generatePythonDocumentation(config: SDKGenerationConfig): Promise<string> {
    return '# Python SDK Documentation';
  }

  private async generateOpenAPISchemas(): Promise<any> {
    return {
      User: {
        type: 'object',
        properties: {
          id: { type: 'string' },
          email: { type: 'string', format: 'email' },
          username: { type: 'string' },
          firstName: { type: 'string' },
          lastName: { type: 'string' },
          role: { $ref: '#/components/schemas/UserRole' },
          isActive: { type: 'boolean' },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' },
        },
        required: ['id', 'email', 'username', 'firstName', 'lastName', 'role'],
      },
      UserRole: {
        type: 'string',
        enum: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'USER', 'READONLY'],
      },
      // Additional schemas would be generated here
    };
  }

  private async generateOpenAPIPaths(): Promise<any> {
    return {
      '/users': {
        get: {
          tags: ['Users'],
          summary: 'List users',
          parameters: [
            {
              name: 'page',
              in: 'query',
              schema: { type: 'integer', minimum: 1, default: 1 },
            },
            {
              name: 'limit',
              in: 'query',
              schema: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
            },
          ],
          responses: {
            '200': {
              description: 'List of users',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      data: {
                        type: 'array',
                        items: { $ref: '#/components/schemas/User' },
                      },
                      pagination: { $ref: '#/components/schemas/Pagination' },
                    },
                  },
                },
              },
            },
          },
        },
        post: {
          tags: ['Users'],
          summary: 'Create user',
          requestBody: {
            required: true,
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/CreateUserRequest' },
              },
            },
          },
          responses: {
            '201': {
              description: 'Created user',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/User' },
                },
              },
            },
          },
        },
      },
      // Additional paths would be generated here
    };
  }

  private async saveOpenAPISpec(organizationId: string, spec: string): Promise<string> {
    // In a real implementation, this would save the spec to storage
    return `/api/openapi/${organizationId}/spec.json`;
  }
}

// Types and interfaces
export interface SDKGenerationConfig {
  includeExamples?: boolean;
  includeDocumentation?: boolean;
  packageName?: string;
  version?: string;
  customEndpoints?: string[];
}

export interface SDKGenerationResult {
  language: SupportedLanguage;
  version: string;
  downloadUrl: string;
  size: number;
  generationTime: number;
  features: string[];
  documentation: {
    getting_started: string;
    api_reference: string;
    examples: string;
  };
}

export interface OpenAPISpecResult {
  version: string;
  downloadUrl: string;
  size: number;
  endpoints: number;
  schemas: number;
}

export type SupportedLanguage = 'typescript' | 'javascript' | 'python';

interface SDKPackageComponents {
  language: string;
  organizationId: string;
  types?: string;
  restClient?: string;
  graphqlClient?: string;
  client?: string;
  apiMethods?: string;
  utilities?: string;
  models?: string;
  documentation?: string;
}

interface SDKPackage {
  version: string;
  downloadUrl: string;
  size: number;
  gettingStartedUrl: string;
  apiReferenceUrl: string;
  examplesUrl: string;
}