import { logger } from '../config/logger';
import { typeDefs } from '../graphql/schema';
import { print } from 'graphql';
import fs from 'fs/promises';
import path from 'path';

export class APIDocumentationService {
  private static instance: APIDocumentationService;
  private documentationCache: Map<string, any> = new Map();

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

      // Generate different documentation formats
      const [
        restDocs,
        graphqlDocs,
        openApiSpec,
        postmanCollection,
        sdkDocs,
        integrationGuides,
        examples,
      ] = await Promise.all([
        this.generateRESTDocumentation(options),
        this.generateGraphQLDocumentation(options),
        this.generateOpenAPISpecification(organizationId, options),
        this.generatePostmanCollection(organizationId, options),
        this.generateSDKDocumentation(options),
        this.generateIntegrationGuides(options),
        this.generateCodeExamples(options),
      ]);

      // Generate interactive documentation
      const interactiveDocs = await this.generateInteractiveDocumentation(
        organizationId,
        { restDocs, graphqlDocs, examples }
      );

      // Generate API reference
      const apiReference = await this.generateAPIReference(organizationId);

      // Generate changelog and versioning info
      const changelog = await this.generateChangelog(organizationId);

      // Compile comprehensive documentation package
      const documentationPackage = await this.compileDocumentationPackage({
        organizationId,
        restDocs,
        graphqlDocs,
        openApiSpec,
        postmanCollection,
        sdkDocs,
        integrationGuides,
        examples,
        interactiveDocs,
        apiReference,
        changelog,
      });

      const generationTime = Date.now() - startTime;

      logger.info('API documentation generated successfully', {
        organizationId,
        generationTime,
        packageSize: documentationPackage.size,
      });

      return {
        organizationId,
        version: documentationPackage.version,
        generationTime,
        formats: documentationPackage.formats,
        urls: documentationPackage.urls,
        size: documentationPackage.size,
        lastUpdated: new Date(),
      };
    } catch (error) {
      logger.error('Failed to generate API documentation', error);
      throw error;
    }
  }

  /**
   * Generate REST API documentation
   */
  async generateRESTDocumentation(options: DocumentationOptions): Promise<string> {
    return `
# Turbo Asset REST API Documentation

## Overview

The Turbo Asset REST API provides comprehensive access to all platform functionality through RESTful endpoints. This API follows REST principles and uses standard HTTP methods and status codes.

### Base URL
\`\`\`
https://api.turbo-asset.com/v1
\`\`\`

### Authentication

All API requests must include authentication via bearer token:

\`\`\`http
Authorization: Bearer <your-api-token>
\`\`\`

### Response Format

All responses are in JSON format and follow a consistent structure:

\`\`\`json
{
  "data": {},
  "meta": {
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100,
      "hasNext": true,
      "hasPrev": false
    }
  },
  "error": null
}
\`\`\`

## Endpoints

### Users API

#### GET /api/users
Get a list of users with optional filtering and pagination.

**Parameters:**
- \`page\` (integer): Page number (default: 1)
- \`limit\` (integer): Items per page (default: 20, max: 100)
- \`role\` (string): Filter by user role
- \`isActive\` (boolean): Filter by active status
- \`search\` (string): Search in name, email, or username

**Example Request:**
\`\`\`http
GET /api/users?page=1&limit=10&role=USER&isActive=true
\`\`\`

**Example Response:**
\`\`\`json
{
  "data": [
    {
      "id": "user-123",
      "email": "john.doe@example.com",
      "username": "johndoe",
      "firstName": "John",
      "lastName": "Doe",
      "role": "USER",
      "isActive": true,
      "createdAt": "2024-01-01T00:00:00Z",
      "updatedAt": "2024-01-01T00:00:00Z",
      "organization": {
        "id": "org-456",
        "name": "Acme Corp"
      },
      "department": {
        "id": "dept-789",
        "name": "IT Department"
      }
    }
  ],
  "meta": {
    "pagination": {
      "page": 1,
      "limit": 10,
      "total": 45,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
\`\`\`

#### POST /api/users
Create a new user.

**Request Body:**
\`\`\`json
{
  "email": "jane.doe@example.com",
  "username": "janedoe",
  "firstName": "Jane",
  "lastName": "Doe",
  "password": "securePassword123",
  "role": "USER",
  "organizationId": "org-456",
  "departmentId": "dept-789",
  "language": "en",
  "timezone": "UTC",
  "currency": "USD"
}
\`\`\`

**Example Response:**
\`\`\`json
{
  "data": {
    "id": "user-124",
    "email": "jane.doe@example.com",
    "username": "janedoe",
    "firstName": "Jane",
    "lastName": "Doe",
    "role": "USER",
    "isActive": true,
    "createdAt": "2024-01-02T10:30:00Z",
    "updatedAt": "2024-01-02T10:30:00Z"
  }
}
\`\`\`

### Properties API

#### GET /api/properties
Get a list of properties with optional filtering.

**Parameters:**
- \`type\` (string): Property type (OFFICE, RETAIL, INDUSTRIAL, etc.)
- \`status\` (string): Property status (ACTIVE, INACTIVE, etc.)
- \`search\` (string): Search in property name or address

#### POST /api/properties
Create a new property.

**Request Body:**
\`\`\`json
{
  "name": "Downtown Office Complex",
  "type": "OFFICE",
  "status": "ACTIVE",
  "address": {
    "street1": "123 Business Street",
    "street2": "Suite 100",
    "city": "New York",
    "state": "NY",
    "zipCode": "10001",
    "country": "USA",
    "latitude": 40.7128,
    "longitude": -74.0060
  },
  "totalArea": 50000.0,
  "rentableArea": 45000.0,
  "yearBuilt": 2020,
  "organizationId": "org-456"
}
\`\`\`

### Assets API

#### GET /api/assets
Get a list of assets with advanced filtering options.

**Parameters:**
- \`type\` (string): Asset type
- \`category\` (string): Asset category (CRITICAL, IMPORTANT, etc.)
- \`status\` (string): Asset status
- \`condition\` (string): Asset condition
- \`propertyId\` (string): Filter by property
- \`buildingId\` (string): Filter by building

#### PATCH /api/assets/bulk
Bulk update multiple assets.

**Request Body:**
\`\`\`json
{
  "assetIds": ["asset-1", "asset-2", "asset-3"],
  "updates": {
    "status": "IN_MAINTENANCE",
    "condition": "FAIR",
    "lastMaintenance": "2024-01-01T00:00:00Z"
  }
}
\`\`\`

### Workflows API

#### POST /api/workflows/definitions
Create a new workflow definition.

**Request Body:**
\`\`\`json
{
  "name": "Asset Purchase Approval",
  "description": "Multi-step approval process for asset purchases",
  "version": "1.0",
  "definition": {
    "startStep": "budget-check",
    "steps": [
      {
        "id": "budget-check",
        "name": "Budget Verification",
        "type": "condition",
        "condition": "data.amount <= 5000",
        "nextSteps": ["manager-approval"]
      },
      {
        "id": "manager-approval",
        "name": "Manager Approval",
        "type": "approval",
        "roles": ["MANAGER"],
        "sla": {
          "duration": 24,
          "unit": "hours"
        },
        "nextSteps": ["finance-approval"]
      },
      {
        "id": "finance-approval",
        "name": "Finance Approval", 
        "type": "approval",
        "roles": ["FINANCE_MANAGER"],
        "sla": {
          "duration": 48,
          "unit": "hours"
        }
      }
    ]
  },
  "organizationId": "org-456"
}
\`\`\`

#### POST /api/workflows/instances
Start a new workflow instance.

**Request Body:**
\`\`\`json
{
  "definitionId": "workflow-def-123",
  "data": {
    "entityType": "Asset",
    "entityId": "asset-456",
    "amount": 2500,
    "reason": "Replace broken printer"
  },
  "priority": "NORMAL",
  "dueDate": "2024-01-05T17:00:00Z"
}
\`\`\`

### Documents API

#### POST /api/documents/upload
Upload a new document with metadata.

**Request (multipart/form-data):**
- \`file\`: The document file
- \`name\`: Document name
- \`category\`: Document category
- \`confidentiality\`: PUBLIC, INTERNAL, CONFIDENTIAL, RESTRICTED
- \`tags\`: Comma-separated tags
- \`metadata\`: JSON metadata object

#### GET /api/documents/search
Search documents with advanced filtering.

**Parameters:**
- \`q\` (string): Search query
- \`category\` (string): Document category
- \`confidentiality\` (string): Confidentiality level
- \`tags\` (array): Filter by tags
- \`dateFrom\` (string): Start date filter (ISO 8601)
- \`dateTo\` (string): End date filter (ISO 8601)
- \`fileType\` (string): Filter by file type

### Custom Fields API

#### POST /api/custom-fields/definitions
Create a new custom field definition.

**Request Body:**
\`\`\`json
{
  "name": "warranty_expiration",
  "label": "Warranty Expiration Date",
  "fieldType": "DATE",
  "entityType": "Asset",
  "isRequired": false,
  "validation": {
    "minDate": "2024-01-01"
  },
  "helpText": "Enter the warranty expiration date for this asset",
  "organizationId": "org-456"
}
\`\`\`

#### PUT /api/custom-fields/values
Set a custom field value for an entity.

**Request Body:**
\`\`\`json
{
  "fieldId": "field-123",
  "entityId": "asset-456",
  "entityType": "Asset",
  "value": "2025-12-31"
}
\`\`\`

### Notifications API

#### GET /api/notifications
Get user notifications with filtering.

**Parameters:**
- \`type\` (string): Notification type
- \`priority\` (string): Priority level
- \`isRead\` (boolean): Read status
- \`category\` (string): Notification category

#### POST /api/notifications
Create a new notification.

**Request Body:**
\`\`\`json
{
  "title": "Maintenance Due",
  "message": "Asset XYZ requires maintenance within 7 days",
  "type": "REMINDER",
  "priority": "HIGH",
  "recipientIds": ["user-123", "user-124"],
  "actionUrl": "/assets/xyz",
  "actionLabel": "View Asset",
  "scheduledFor": "2024-01-03T09:00:00Z",
  "metadata": {
    "assetId": "asset-xyz",
    "maintenanceType": "preventive"
  }
}
\`\`\`

### Integration API

#### POST /api/integrations
Create a new integration configuration.

**Request Body:**
\`\`\`json
{
  "name": "SAP S/4HANA Integration",
  "type": "SAP_S4HANA",
  "endpoint": "https://your-sap-instance.com/api",
  "credentials": {
    "authType": "OAUTH2",
    "clientId": "your-client-id",
    "clientSecret": "your-client-secret",
    "tokenEndpoint": "https://your-sap-instance.com/oauth/token"
  },
  "settings": {
    "syncFrequency": "DAILY",
    "retryAttempts": 3,
    "timeout": 30000,
    "batchSize": 100,
    "dataMapping": [
      {
        "sourceField": "Material",
        "targetField": "name",
        "dataType": "string",
        "isRequired": true
      }
    ]
  },
  "organizationId": "org-456"
}
\`\`\`

#### POST /api/integrations/{id}/execute
Execute an integration sync.

**Request Body:**
\`\`\`json
{
  "type": "SYNC",
  "options": {
    "fullSync": false,
    "entityTypes": ["Asset", "WorkOrder"]
  }
}
\`\`\`

## Error Handling

### HTTP Status Codes

- \`200\` - OK: Request successful
- \`201\` - Created: Resource created successfully
- \`400\` - Bad Request: Invalid request parameters
- \`401\` - Unauthorized: Authentication required
- \`403\` - Forbidden: Insufficient permissions
- \`404\` - Not Found: Resource not found
- \`409\` - Conflict: Resource already exists
- \`422\` - Unprocessable Entity: Validation errors
- \`429\` - Too Many Requests: Rate limit exceeded
- \`500\` - Internal Server Error: Server error

### Error Response Format

\`\`\`json
{
  "data": null,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": [
      {
        "field": "email",
        "message": "Email is required",
        "code": "REQUIRED"
      }
    ]
  }
}
\`\`\`

## Rate Limiting

API requests are rate-limited to prevent abuse:

- **Free tier**: 1,000 requests per hour
- **Professional**: 10,000 requests per hour  
- **Enterprise**: 100,000 requests per hour

Rate limit headers are included in responses:

\`\`\`http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1609459200
\`\`\`

## Pagination

List endpoints support cursor-based pagination:

**Request Parameters:**
- \`page\`: Page number (default: 1)
- \`limit\`: Items per page (default: 20, max: 100)

**Response Format:**
\`\`\`json
{
  "data": [...],
  "meta": {
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 150,
      "hasNext": true,
      "hasPrev": false
    }
  }
}
\`\`\`

## Webhooks

Configure webhooks to receive real-time notifications:

### Supported Events

- \`user.created\`
- \`user.updated\`
- \`property.created\`
- \`asset.status_changed\`
- \`workflow.completed\`
- \`document.uploaded\`
- \`maintenance.due\`

### Webhook Configuration

\`\`\`json
{
  "url": "https://your-app.com/webhook",
  "events": ["asset.status_changed", "workflow.completed"],
  "secret": "your-webhook-secret",
  "active": true
}
\`\`\`

### Webhook Payload

\`\`\`json
{
  "event": "asset.status_changed",
  "timestamp": "2024-01-01T12:00:00Z",
  "data": {
    "id": "asset-123",
    "previousStatus": "ACTIVE",
    "newStatus": "IN_MAINTENANCE",
    "updatedBy": "user-456"
  },
  "organizationId": "org-789"
}
\`\`\`
`;
  }

  /**
   * Generate GraphQL documentation
   */
  async generateGraphQLDocumentation(options: DocumentationOptions): Promise<string> {
    return `
# Turbo Asset GraphQL API Documentation

## Overview

The Turbo Asset GraphQL API provides a flexible, efficient way to query and mutate data. It offers strong typing, introspection, and the ability to request exactly the data you need.

### Endpoint
\`\`\`
https://api.turbo-asset.com/graphql
\`\`\`

### Authentication

Include your API token in the Authorization header:

\`\`\`http
Authorization: Bearer <your-api-token>
\`\`\`

## Schema Overview

### Core Types

\`\`\`graphql
type User {
  id: ID!
  email: String!
  username: String!
  firstName: String!
  lastName: String!
  fullName: String!
  role: UserRole!
  organization: Organization
  department: Department
  workflowInstances: [WorkflowInstance!]!
  notifications: [Notification!]!
  documents: [Document!]!
}

type Organization {
  id: ID!
  name: String!
  description: String
  users: [User!]!
  properties: [Property!]!
  workflows: [WorkflowDefinition!]!
}

type Property {
  id: ID!
  name: String!
  address: PropertyAddress!
  type: PropertyType!
  status: PropertyStatus!
  buildings: [Building!]!
  assets: [Asset!]!
}

type Asset {
  id: ID!
  name: String!
  type: AssetType!
  status: AssetStatus!
  condition: AssetCondition!
  property: Property
  maintenanceRecords: [MaintenanceRecord!]!
  workOrders: [WorkOrder!]!
}
\`\`\`

## Queries

### Get Current User

\`\`\`graphql
query Me {
  me {
    id
    email
    firstName
    lastName
    role
    organization {
      id
      name
    }
    department {
      id
      name
    }
  }
}
\`\`\`

### List Users with Pagination

\`\`\`graphql
query GetUsers($first: Int, $after: String, $where: UserWhereInput) {
  users(first: $first, after: $after, where: $where) {
    edges {
      node {
        id
        email
        firstName
        lastName
        role
        isActive
        organization {
          name
        }
      }
      cursor
    }
    pageInfo {
      hasNextPage
      hasPreviousPage
      startCursor
      endCursor
    }
  }
}
\`\`\`

**Variables:**
\`\`\`json
{
  "first": 20,
  "where": {
    "role": "USER",
    "isActive": true
  }
}
\`\`\`

### Get Property with Nested Data

\`\`\`graphql
query GetPropertyDetails($id: ID!) {
  property(id: $id) {
    id
    name
    type
    status
    address {
      street1
      city
      state
      country
    }
    buildings {
      id
      name
      floors {
        id
        name
        level
        spaces {
          id
          name
          type
          capacity
          isBookable
        }
      }
    }
    assets {
      id
      name
      type
      status
      condition
    }
  }
}
\`\`\`

### Search Assets with Filters

\`\`\`graphql
query SearchAssets($where: AssetWhereInput, $first: Int) {
  assets(where: $where, first: $first) {
    edges {
      node {
        id
        name
        code
        type
        category
        status
        condition
        purchaseDate
        currentValue
        property {
          name
        }
        building {
          name
        }
        maintenanceRecords(first: 5) {
          id
          type
          status
          cost
          startDate
          endDate
        }
      }
    }
  }
}
\`\`\`

**Variables:**
\`\`\`json
{
  "where": {
    "type": "IT_EQUIPMENT",
    "status": "ACTIVE",
    "condition": "GOOD"
  },
  "first": 50
}
\`\`\`

### Get Workflow Instances

\`\`\`graphql
query GetWorkflowInstances($where: WorkflowInstanceWhereInput) {
  workflowInstances(where: $where, first: 20) {
    edges {
      node {
        id
        status
        priority
        startedAt
        completedAt
        dueDate
        definition {
          name
          version
        }
        initiatedBy {
          firstName
          lastName
        }
        approvals {
          id
          status
          approver {
            firstName
            lastName
          }
          approvedAt
          comments
        }
      }
    }
  }
}
\`\`\`

### Search Documents

\`\`\`graphql
query SearchDocuments($where: DocumentWhereInput, $first: Int) {
  documents(where: $where, first: $first) {
    edges {
      node {
        id
        name
        fileName
        fileSize
        category
        confidentiality
        tags
        createdAt
        createdBy {
          firstName
          lastName
        }
        versions(first: 1) {
          version
          createdAt
        }
      }
    }
  }
}
\`\`\`

## Mutations

### Create User

\`\`\`graphql
mutation CreateUser($input: CreateUserInput!) {
  createUser(input: $input) {
    id
    email
    firstName
    lastName
    role
    organization {
      name
    }
  }
}
\`\`\`

**Variables:**
\`\`\`json
{
  "input": {
    "email": "john.doe@example.com",
    "username": "johndoe",
    "firstName": "John",
    "lastName": "Doe",
    "password": "securePassword123",
    "role": "USER",
    "organizationId": "org-123"
  }
}
\`\`\`

### Create Property

\`\`\`graphql
mutation CreateProperty($input: CreatePropertyInput!) {
  createProperty(input: $input) {
    id
    name
    type
    status
    address {
      street1
      city
      state
    }
    createdAt
  }
}
\`\`\`

### Start Workflow

\`\`\`graphql
mutation StartWorkflow($input: StartWorkflowInput!) {
  startWorkflow(input: $input) {
    id
    status
    priority
    startedAt
    dueDate
    definition {
      name
    }
    initiatedBy {
      firstName
      lastName
    }
  }
}
\`\`\`

**Variables:**
\`\`\`json
{
  "input": {
    "definitionId": "workflow-def-123",
    "data": {
      "entityType": "Asset",
      "entityId": "asset-456",
      "requestType": "maintenance"
    },
    "priority": "HIGH"
  }
}
\`\`\`

### Process Approval

\`\`\`graphql
mutation ProcessApproval($input: ProcessApprovalInput!) {
  processApproval(input: $input) {
    id
    status
    approvedAt
    comments
    workflow {
      id
      status
    }
  }
}
\`\`\`

### Upload Document

\`\`\`graphql
mutation UploadDocument($input: UploadDocumentInput!) {
  uploadDocument(input: $input) {
    id
    name
    fileName
    fileSize
    category
    confidentiality
    version
    createdAt
  }
}
\`\`\`

### Bulk Update Assets

\`\`\`graphql
mutation BulkUpdateAssets($ids: [ID!]!, $input: BulkUpdateAssetInput!) {
  bulkUpdateAssets(ids: $ids, input: $input) {
    totalCount
    successCount
    failedCount
    errors
  }
}
\`\`\`

## Subscriptions

### Real-time Notifications

\`\`\`graphql
subscription NotificationAdded($userId: ID!) {
  notificationAdded(userId: $userId) {
    id
    title
    message
    type
    priority
    createdAt
  }
}
\`\`\`

### Workflow Status Changes

\`\`\`graphql
subscription WorkflowStatusChanged($workflowId: ID!) {
  workflowStatusChanged(workflowId: $workflowId) {
    id
    status
    currentStep
    completedAt
  }
}
\`\`\`

### Document Updates

\`\`\`graphql
subscription DocumentUpdated($documentId: ID!) {
  documentUpdated(documentId: $documentId) {
    id
    name
    version
    updatedAt
    updatedBy {
      firstName
      lastName
    }
  }
}
\`\`\`

## Error Handling

GraphQL errors are returned in the \`errors\` field:

\`\`\`json
{
  "data": null,
  "errors": [
    {
      "message": "User not found",
      "locations": [
        {
          "line": 2,
          "column": 3
        }
      ],
      "path": ["user"],
      "extensions": {
        "code": "NOT_FOUND",
        "userId": "invalid-id"
      }
    }
  ]
}
\`\`\`

## Introspection

Get the complete schema:

\`\`\`graphql
query GetSchema {
  __schema {
    types {
      name
      description
      fields {
        name
        type {
          name
        }
      }
    }
  }
}
\`\`\`

## Best Practices

### 1. Request Only What You Need

\`\`\`graphql
# Good: Only request needed fields
query GetUsers {
  users {
    edges {
      node {
        id
        firstName
        lastName
      }
    }
  }
}

# Avoid: Over-fetching data
query GetUsers {
  users {
    edges {
      node {
        id
        email
        firstName
        lastName
        role
        organization {
          id
          name
          description
          users {
            id
            firstName
            lastName
          }
        }
      }
    }
  }
}
\`\`\`

### 2. Use Fragments for Reusability

\`\`\`graphql
fragment UserInfo on User {
  id
  firstName
  lastName
  email
  role
}

query GetCurrentUser {
  me {
    ...UserInfo
    organization {
      name
    }
  }
}

query GetUsers {
  users(first: 10) {
    edges {
      node {
        ...UserInfo
      }
    }
  }
}
\`\`\`

### 3. Handle Pagination Properly

\`\`\`graphql
query GetAllUsers($after: String) {
  users(first: 20, after: $after) {
    edges {
      node {
        id
        firstName
        lastName
      }
      cursor
    }
    pageInfo {
      hasNextPage
      endCursor
    }
  }
}
\`\`\`

### 4. Use Variables for Dynamic Queries

\`\`\`graphql
query GetAssetsByType($type: AssetType!, $status: AssetStatus) {
  assets(where: { type: $type, status: $status }) {
    edges {
      node {
        id
        name
        type
        status
      }
    }
  }
}
\`\`\`
`;
  }

  /**
   * Generate OpenAPI specification with comprehensive details
   */
  async generateOpenAPISpecification(
    organizationId: string,
    options: DocumentationOptions
  ): Promise<any> {
    return {
      openapi: '3.0.3',
      info: {
        title: 'Turbo Asset API',
        description: 'Enterprise Integrated Workplace Management System API',
        version: '1.0.0',
        termsOfService: 'https://turbo-asset.com/terms',
        contact: {
          name: 'API Support',
          url: 'https://turbo-asset.com/support',
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
        {
          url: 'http://localhost:3000/api',
          description: 'Development server',
        },
      ],
      security: [
        {
          bearerAuth: [],
        },
        {
          apiKeyAuth: [],
        },
      ],
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
        schemas: {
          User: {
            type: 'object',
            required: ['id', 'email', 'firstName', 'lastName', 'role'],
            properties: {
              id: {
                type: 'string',
                format: 'uuid',
                example: '123e4567-e89b-12d3-a456-426614174000',
              },
              email: {
                type: 'string',
                format: 'email',
                example: 'john.doe@example.com',
              },
              username: {
                type: 'string',
                example: 'johndoe',
              },
              firstName: {
                type: 'string',
                example: 'John',
              },
              lastName: {
                type: 'string',
                example: 'Doe',
              },
              role: {
                $ref: '#/components/schemas/UserRole',
              },
              isActive: {
                type: 'boolean',
                example: true,
              },
              createdAt: {
                type: 'string',
                format: 'date-time',
                example: '2024-01-01T00:00:00Z',
              },
              updatedAt: {
                type: 'string',
                format: 'date-time',
                example: '2024-01-01T00:00:00Z',
              },
            },
          },
          UserRole: {
            type: 'string',
            enum: ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'USER', 'READONLY'],
            example: 'USER',
          },
          Property: {
            type: 'object',
            required: ['id', 'name', 'type', 'status', 'address'],
            properties: {
              id: {
                type: 'string',
                format: 'uuid',
              },
              name: {
                type: 'string',
                example: 'Downtown Office Complex',
              },
              type: {
                $ref: '#/components/schemas/PropertyType',
              },
              status: {
                $ref: '#/components/schemas/PropertyStatus',
              },
              address: {
                $ref: '#/components/schemas/PropertyAddress',
              },
              totalArea: {
                type: 'number',
                format: 'double',
                example: 50000.0,
              },
              rentableArea: {
                type: 'number',
                format: 'double',
                example: 45000.0,
              },
              yearBuilt: {
                type: 'integer',
                example: 2020,
              },
            },
          },
          PropertyType: {
            type: 'string',
            enum: ['OFFICE', 'RETAIL', 'INDUSTRIAL', 'WAREHOUSE', 'MIXED_USE', 'RESIDENTIAL', 'HOSPITAL', 'SCHOOL', 'OTHER'],
            example: 'OFFICE',
          },
          PropertyStatus: {
            type: 'string',
            enum: ['ACTIVE', 'INACTIVE', 'UNDER_CONSTRUCTION', 'RENOVATION', 'DISPOSED'],
            example: 'ACTIVE',
          },
          PropertyAddress: {
            type: 'object',
            required: ['street1', 'city', 'state', 'zipCode', 'country'],
            properties: {
              street1: {
                type: 'string',
                example: '123 Business Street',
              },
              street2: {
                type: 'string',
                example: 'Suite 100',
              },
              city: {
                type: 'string',
                example: 'New York',
              },
              state: {
                type: 'string',
                example: 'NY',
              },
              zipCode: {
                type: 'string',
                example: '10001',
              },
              country: {
                type: 'string',
                example: 'USA',
              },
              latitude: {
                type: 'number',
                format: 'double',
                example: 40.7128,
              },
              longitude: {
                type: 'number',
                format: 'double',
                example: -74.0060,
              },
            },
          },
          Error: {
            type: 'object',
            required: ['code', 'message'],
            properties: {
              code: {
                type: 'string',
                example: 'VALIDATION_ERROR',
              },
              message: {
                type: 'string',
                example: 'Request validation failed',
              },
              details: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    field: {
                      type: 'string',
                      example: 'email',
                    },
                    message: {
                      type: 'string',
                      example: 'Email is required',
                    },
                    code: {
                      type: 'string',
                      example: 'REQUIRED',
                    },
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
                items: {},
              },
              meta: {
                type: 'object',
                properties: {
                  pagination: {
                    $ref: '#/components/schemas/Pagination',
                  },
                },
              },
            },
          },
          Pagination: {
            type: 'object',
            properties: {
              page: {
                type: 'integer',
                example: 1,
              },
              limit: {
                type: 'integer',
                example: 20,
              },
              total: {
                type: 'integer',
                example: 100,
              },
              hasNext: {
                type: 'boolean',
                example: true,
              },
              hasPrev: {
                type: 'boolean',
                example: false,
              },
            },
          },
        },
        responses: {
          NotFound: {
            description: 'Resource not found',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Error',
                },
                example: {
                  code: 'NOT_FOUND',
                  message: 'The requested resource was not found',
                },
              },
            },
          },
          ValidationError: {
            description: 'Validation error',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Error',
                },
                example: {
                  code: 'VALIDATION_ERROR',
                  message: 'Request validation failed',
                  details: [
                    {
                      field: 'email',
                      message: 'Email is required',
                      code: 'REQUIRED',
                    },
                  ],
                },
              },
            },
          },
          Unauthorized: {
            description: 'Authentication required',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Error',
                },
                example: {
                  code: 'UNAUTHORIZED',
                  message: 'Authentication required',
                },
              },
            },
          },
          Forbidden: {
            description: 'Insufficient permissions',
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Error',
                },
                example: {
                  code: 'FORBIDDEN',
                  message: 'Insufficient permissions',
                },
              },
            },
          },
          RateLimit: {
            description: 'Rate limit exceeded',
            headers: {
              'X-RateLimit-Limit': {
                schema: {
                  type: 'integer',
                },
                description: 'The rate limit ceiling for that given request',
              },
              'X-RateLimit-Remaining': {
                schema: {
                  type: 'integer',
                },
                description: 'The number of requests left for the time window',
              },
              'X-RateLimit-Reset': {
                schema: {
                  type: 'integer',
                },
                description: 'The time at which the rate limit resets (UTC epoch seconds)',
              },
            },
            content: {
              'application/json': {
                schema: {
                  $ref: '#/components/schemas/Error',
                },
                example: {
                  code: 'RATE_LIMIT_EXCEEDED',
                  message: 'Too many requests',
                },
              },
            },
          },
        },
        parameters: {
          Page: {
            name: 'page',
            in: 'query',
            description: 'Page number for pagination',
            required: false,
            schema: {
              type: 'integer',
              minimum: 1,
              default: 1,
            },
            example: 1,
          },
          Limit: {
            name: 'limit',
            in: 'query',
            description: 'Number of items per page',
            required: false,
            schema: {
              type: 'integer',
              minimum: 1,
              maximum: 100,
              default: 20,
            },
            example: 20,
          },
          Search: {
            name: 'search',
            in: 'query',
            description: 'Search term for filtering results',
            required: false,
            schema: {
              type: 'string',
            },
            example: 'office equipment',
          },
        },
      },
      paths: {
        '/users': {
          get: {
            tags: ['Users'],
            summary: 'List users',
            description: 'Retrieve a paginated list of users with optional filtering',
            parameters: [
              {
                $ref: '#/components/parameters/Page',
              },
              {
                $ref: '#/components/parameters/Limit',
              },
              {
                name: 'role',
                in: 'query',
                description: 'Filter by user role',
                schema: {
                  $ref: '#/components/schemas/UserRole',
                },
              },
              {
                name: 'isActive',
                in: 'query',
                description: 'Filter by active status',
                schema: {
                  type: 'boolean',
                },
              },
            ],
            responses: {
              '200': {
                description: 'List of users',
                content: {
                  'application/json': {
                    schema: {
                      allOf: [
                        {
                          $ref: '#/components/schemas/PaginatedResponse',
                        },
                        {
                          type: 'object',
                          properties: {
                            data: {
                              type: 'array',
                              items: {
                                $ref: '#/components/schemas/User',
                              },
                            },
                          },
                        },
                      ],
                    },
                  },
                },
              },
              '401': {
                $ref: '#/components/responses/Unauthorized',
              },
              '429': {
                $ref: '#/components/responses/RateLimit',
              },
            },
          },
          post: {
            tags: ['Users'],
            summary: 'Create user',
            description: 'Create a new user account',
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    required: ['email', 'username', 'firstName', 'lastName', 'password', 'role', 'organizationId'],
                    properties: {
                      email: {
                        type: 'string',
                        format: 'email',
                      },
                      username: {
                        type: 'string',
                      },
                      firstName: {
                        type: 'string',
                      },
                      lastName: {
                        type: 'string',
                      },
                      password: {
                        type: 'string',
                        format: 'password',
                        minLength: 8,
                      },
                      role: {
                        $ref: '#/components/schemas/UserRole',
                      },
                      organizationId: {
                        type: 'string',
                        format: 'uuid',
                      },
                    },
                  },
                },
              },
            },
            responses: {
              '201': {
                description: 'User created successfully',
                content: {
                  'application/json': {
                    schema: {
                      $ref: '#/components/schemas/User',
                    },
                  },
                },
              },
              '400': {
                $ref: '#/components/responses/ValidationError',
              },
              '401': {
                $ref: '#/components/responses/Unauthorized',
              },
              '403': {
                $ref: '#/components/responses/Forbidden',
              },
            },
          },
        },
        '/users/{id}': {
          get: {
            tags: ['Users'],
            summary: 'Get user',
            description: 'Retrieve a specific user by ID',
            parameters: [
              {
                name: 'id',
                in: 'path',
                required: true,
                description: 'User ID',
                schema: {
                  type: 'string',
                  format: 'uuid',
                },
              },
            ],
            responses: {
              '200': {
                description: 'User details',
                content: {
                  'application/json': {
                    schema: {
                      $ref: '#/components/schemas/User',
                    },
                  },
                },
              },
              '404': {
                $ref: '#/components/responses/NotFound',
              },
            },
          },
          put: {
            tags: ['Users'],
            summary: 'Update user',
            description: 'Update an existing user',
            parameters: [
              {
                name: 'id',
                in: 'path',
                required: true,
                schema: {
                  type: 'string',
                  format: 'uuid',
                },
              },
            ],
            requestBody: {
              required: true,
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      firstName: {
                        type: 'string',
                      },
                      lastName: {
                        type: 'string',
                      },
                      role: {
                        $ref: '#/components/schemas/UserRole',
                      },
                      isActive: {
                        type: 'boolean',
                      },
                    },
                  },
                },
              },
            },
            responses: {
              '200': {
                description: 'User updated successfully',
                content: {
                  'application/json': {
                    schema: {
                      $ref: '#/components/schemas/User',
                    },
                  },
                },
              },
              '400': {
                $ref: '#/components/responses/ValidationError',
              },
              '404': {
                $ref: '#/components/responses/NotFound',
              },
            },
          },
          delete: {
            tags: ['Users'],
            summary: 'Delete user',
            description: 'Delete a user account',
            parameters: [
              {
                name: 'id',
                in: 'path',
                required: true,
                schema: {
                  type: 'string',
                  format: 'uuid',
                },
              },
            ],
            responses: {
              '204': {
                description: 'User deleted successfully',
              },
              '404': {
                $ref: '#/components/responses/NotFound',
              },
              '403': {
                $ref: '#/components/responses/Forbidden',
              },
            },
          },
        },
      },
      tags: [
        {
          name: 'Users',
          description: 'User management operations',
          externalDocs: {
            description: 'Find more info',
            url: 'https://docs.turbo-asset.com/users',
          },
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
      ],
      externalDocs: {
        description: 'Find more info about Turbo Asset API',
        url: 'https://docs.turbo-asset.com',
      },
    };
  }

  /**
   * Generate additional helper methods
   */
  private async generatePostmanCollection(organizationId: string, options: DocumentationOptions): Promise<any> {
    return {
      info: {
        name: 'Turbo Asset API',
        description: 'Complete Postman collection for Turbo Asset API',
        version: '1.0.0',
      },
      variable: [
        {
          key: 'baseUrl',
          value: 'https://api.turbo-asset.com/v1',
        },
        {
          key: 'apiKey',
          value: 'your-api-key-here',
        },
      ],
      // Collection items would be generated here
      item: [],
    };
  }

  private async generateSDKDocumentation(options: DocumentationOptions): Promise<string> {
    return '# SDK Documentation\n\nComprehensive SDK documentation for all supported languages.';
  }

  private async generateIntegrationGuides(options: DocumentationOptions): Promise<string> {
    return '# Integration Guides\n\nStep-by-step integration guides for popular platforms.';
  }

  private async generateCodeExamples(options: DocumentationOptions): Promise<string> {
    return '# Code Examples\n\nPractical code examples for common use cases.';
  }

  private async generateInteractiveDocumentation(
    organizationId: string,
    components: any
  ): Promise<string> {
    return 'Interactive documentation with live API explorer.';
  }

  private async generateAPIReference(organizationId: string): Promise<string> {
    return '# API Reference\n\nComplete API reference documentation.';
  }

  private async generateChangelog(organizationId: string): Promise<string> {
    return '# API Changelog\n\nDetailed changelog of API changes and updates.';
  }

  private async compileDocumentationPackage(components: any): Promise<any> {
    return {
      version: '1.0.0',
      size: JSON.stringify(components).length,
      formats: ['html', 'pdf', 'markdown'],
      urls: {
        html: '/docs/api/html',
        pdf: '/docs/api/pdf',
        markdown: '/docs/api/markdown',
      },
    };
  }
}

// Types and interfaces
export interface DocumentationOptions {
  includeExamples?: boolean;
  includeSDK?: boolean;
  format?: 'html' | 'markdown' | 'pdf';
  language?: string;
  theme?: string;
}

export interface DocumentationResult {
  organizationId: string;
  version: string;
  generationTime: number;
  formats: string[];
  urls: Record<string, string>;
  size: number;
  lastUpdated: Date;
}