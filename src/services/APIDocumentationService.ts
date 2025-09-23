import { logger } from '@/config/logger';
import { typeDefs } from '../graphql/schema';
import { print } from 'graphql';
import fs from 'fs/promises';
import path from 'path';

export interface DocumentationOptions {
  includeExamples?: boolean;
  format?: 'markdown' | 'html' | 'pdf';
  version?: string;
  organizationId?: string;
}

export interface DocumentationResult {
  restDocs: string;
  graphqlDocs: string;
  openApiSpec: any;
  postmanCollection: any;
  sdkDocs: any;
  integrationGuides: string;
  examples: any;
  interactiveDocs?: string;
  size: number;
  generatedAt: Date;
  version: string;
}

/**
 * Optimized API Documentation Service - Streamlined documentation generation
 * 
 * This service provides essential API documentation functionality with
 * consolidated templates and reduced redundancy.
 */
export class APIDocumentationService {
  private static instance: APIDocumentationService;
  private readonly documentationCache: Map<string, any> = new Map();

  static getInstance(): APIDocumentationService {
    if (!APIDocumentationService.instance) {
      APIDocumentationService.instance = new APIDocumentationService();
    }
    return APIDocumentationService.instance;
  }

  /**
   * Generate comprehensive API documentation
   */
  async generateComprehensiveDocumentation(
    organizationId: string,
    options: DocumentationOptions = {}
  ): Promise<DocumentationResult> {
    try {
      const startTime = Date.now();

      // Generate core documentation components
      const [restDocs, graphqlDocs, openApiSpec, postmanCollection] = await Promise.all([
        this.generateRESTDocumentation(options),
        this.generateGraphQLDocumentation(options),
        this.generateOpenAPISpecification(organizationId, options),
        this.generatePostmanCollection(organizationId, options),
      ]);

      // Generate supporting documentation
      const sdkDocs = await this.generateSDKDocumentation(options);
      const integrationGuides = await this.generateIntegrationGuides(options);
      const examples = await this.generateCodeExamples(options);

      // Create documentation package
      const documentationPackage = {
        restDocs,
        graphqlDocs,
        openApiSpec,
        postmanCollection,
        sdkDocs,
        integrationGuides,
        examples,
        size: JSON.stringify({ restDocs, graphqlDocs, openApiSpec }).length,
        generatedAt: new Date(),
        version: options.version || '1.0.0',
      };

      const processingTime = Date.now() - startTime;
      logger.info('API documentation generated successfully', {
        organizationId,
        processingTime,
        size: documentationPackage.size,
        version: documentationPackage.version,
      });

      return documentationPackage;
    } catch (error: unknown) {
      logger.error('Failed to generate API documentation', error);
      throw error;
    }
  }

  /**
   * Generate REST API documentation
   */
  async generateRESTDocumentation(options: DocumentationOptions): Promise<string> {
    const endpoints = [
      { method: 'GET', path: '/api/assets/{organizationId}/assets', description: 'Get assets' },
      { method: 'POST', path: '/api/assets/{organizationId}/assets', description: 'Create asset' },
      { method: 'GET', path: '/api/documents/{organizationId}/documents', description: 'Get documents' },
      { method: 'POST', path: '/api/documents/{organizationId}/documents/upload', description: 'Upload document' },
      { method: 'GET', path: '/api/workflows/{organizationId}/workflows', description: 'Get workflows' },
      { method: 'POST', path: '/api/workflows/{organizationId}/workflows', description: 'Create workflow' },
    ];

    let documentation = '# Turbo Asset REST API\n\n## Authentication\nUse Bearer token authentication.\n\n## Endpoints\n\n';
    
    endpoints.forEach(endpoint => {
      documentation += `### ${endpoint.method} ${endpoint.path}\n${endpoint.description}\n\n`;
    });

    return documentation;
  }

  /**
   * Generate GraphQL documentation
   */
  async generateGraphQLDocumentation(options: DocumentationOptions): Promise<string> {
    try {
      const schema = print(typeDefs);
      return `# GraphQL API\n\n## Schema\n\n\`\`\`graphql\n${schema}\n\`\`\`\n`;
    } catch (error: unknown) {
      return '# GraphQL API\n\nSchema generation failed';
    }
  }

  /**
   * Generate OpenAPI specification
   */
  async generateOpenAPISpecification(organizationId: string, options: DocumentationOptions): Promise<any> {
    return {
      openapi: '3.0.0',
      info: {
        title: 'Turbo Asset API',
        version: options.version || '1.0.0',
        description: 'Enterprise IWMS Platform API',
      },
      servers: [
        { url: 'https://api.turbo-asset.com/v1', description: 'Production server' },
      ],
      paths: {
        '/assets/{organizationId}/assets': {
          get: { summary: 'Get assets', parameters: [{ name: 'organizationId', in: 'path', required: true, schema: { type: 'string' } }] },
          post: { summary: 'Create asset' },
        },
        '/documents/{organizationId}/documents': {
          get: { summary: 'Get documents' },
          post: { summary: 'Upload document' },
        },
      },
    };
  }

  /**
   * Generate Postman collection
   */
  async generatePostmanCollection(organizationId: string, options: DocumentationOptions): Promise<any> {
    return {
      info: { name: 'Turbo Asset API', version: options.version || '1.0.0' },
      auth: { type: 'bearer', bearer: [{ key: 'token', value: '{{apiToken}}' }] },
      item: [
        {
          name: 'Assets',
          item: [
            { name: 'Get Assets', request: { method: 'GET', url: '{{baseUrl}}/api/assets/{{organizationId}}/assets' } },
            { name: 'Create Asset', request: { method: 'POST', url: '{{baseUrl}}/api/assets/{{organizationId}}/assets' } },
          ],
        },
        {
          name: 'Documents',
          item: [
            { name: 'Get Documents', request: { method: 'GET', url: '{{baseUrl}}/api/documents/{{organizationId}}/documents' } },
            { name: 'Upload Document', request: { method: 'POST', url: '{{baseUrl}}/api/documents/{{organizationId}}/documents/upload' } },
          ],
        },
      ],
    };
  }

  /**
   * Generate SDK documentation
   */
  async generateSDKDocumentation(options: DocumentationOptions): Promise<any> {
    return {
      languages: ['JavaScript', 'Python', 'Java', 'C#'],
      installation: {
        javascript: 'npm install turbo-asset-js-sdk',
        python: 'pip install turbo-asset-python-sdk',
        java: 'Add Maven dependency',
        csharp: 'Install-Package TurboAsset.SDK',
      },
      quickStart: 'See examples in respective SDK packages',
    };
  }

  /**
   * Generate integration guides
   */
  async generateIntegrationGuides(options: DocumentationOptions): Promise<string> {
    return '# Integration Guides\n\n## Common Integrations\n\n- SAP Integration\n- Oracle Integration\n- Workday Integration\n- ServiceNow Integration\n';
  }

  /**
   * Generate code examples
   */
  async generateCodeExamples(options: DocumentationOptions): Promise<any> {
    return {
      javascript: [
        'const client = new TurboAssetClient(apiKey);\nconst assets = await client.getAssets(organizationId);',
      ],
      python: [
        'client = TurboAssetClient(api_key)\nassets = client.get_assets(organization_id)',
      ],
      curl: [
        'curl -H "Authorization: Bearer $API_KEY" https://api.turbo-asset.com/v1/api/assets/$ORG_ID/assets',
      ],
    };
  }

  /**
   * Get cached documentation or generate new
   */
  async getCachedDocumentation(organizationId: string, options: DocumentationOptions): Promise<DocumentationResult> {
    const cacheKey = `${organizationId}-${JSON.stringify(options)}`;
    
    if (this.documentationCache.has(cacheKey)) {
      return this.documentationCache.get(cacheKey);
    }

    const documentation = await this.generateComprehensiveDocumentation(organizationId, options);
    this.documentationCache.set(cacheKey, documentation);
    
    return documentation;
  }
}