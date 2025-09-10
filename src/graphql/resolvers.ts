import { GraphQLResolveInfo, GraphQLScalarType, Kind } from 'graphql';
import { Upload } from 'graphql-upload';
import { prisma } from '../config/database';
import { logger } from '../config/logger';
import { WorkflowEngine } from '../services/WorkflowEngine';
import { DocumentService } from '../services/DocumentService';
import { CustomFieldService } from '../services/CustomFieldService';
import { NotificationService } from '../services/NotificationService';

// Custom scalar types
const DateTimeScalar = new GraphQLScalarType({
  name: 'DateTime',
  description: 'Date custom scalar type',
  serialize(value: any) {
    return value instanceof Date ? value.toISOString() : null;
  },
  parseValue(value: any) {
    return new Date(value);
  },
  parseLiteral(ast) {
    if (ast.kind === Kind.STRING) {
      return new Date(ast.value);
    }
    return null;
  },
});

const JSONScalar = new GraphQLScalarType({
  name: 'JSON',
  description: 'JSON custom scalar type',
  serialize(value: any) {
    return value;
  },
  parseValue(value: any) {
    return value;
  },
  parseLiteral(ast) {
    switch (ast.kind) {
      case Kind.STRING:
      case Kind.BOOLEAN:
        return ast.value;
      case Kind.INT:
      case Kind.FLOAT:
        return parseFloat(ast.value);
      case Kind.OBJECT:
      case Kind.LIST:
        return ast;
      case Kind.NULL:
        return null;
      default:
        return undefined;
    }
  },
});

// Initialize services
const workflowEngine = new WorkflowEngine();
const documentService = new DocumentService();
const customFieldService = new CustomFieldService();
const notificationService = new NotificationService();

export const resolvers = {
  // Custom Scalars
  DateTime: DateTimeScalar,
  JSON: JSONScalar,
  Upload: Upload,

  // Root Query Resolvers
  Query: {
    // User Queries
    me: async (_: any, __: any, context: any) => {
      if (!context.user) {
        throw new Error('Authentication required');
      }
      return await prisma.user.findUnique({
        where: { id: context.user.id },
        include: {
          organization: true,
          department: true,
        },
      });
    },

    users: async (_: any, args: any, context: any) => {
      const { first = 20, after, where } = args;
      
      const whereClause: any = {};
      if (where) {
        if (where.email) whereClause.email = { contains: where.email };
        if (where.role) whereClause.role = where.role;
        if (where.isActive !== undefined) whereClause.isActive = where.isActive;
      }

      const users = await prisma.user.findMany({
        where: whereClause,
        take: first,
        skip: after ? 1 : 0,
        cursor: after ? { id: after } : undefined,
        include: {
          organization: true,
          department: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      const edges = users.map(user => ({
        node: user,
        cursor: user.id,
      }));

      const hasNextPage = users.length === first;
      const endCursor = edges.length > 0 ? edges[edges.length - 1].cursor : null;

      return {
        edges,
        pageInfo: {
          hasNextPage,
          hasPreviousPage: !!after,
          startCursor: edges.length > 0 ? edges[0].cursor : null,
          endCursor,
        },
      };
    },

    user: async (_: any, args: any) => {
      return await prisma.user.findUnique({
        where: { id: args.id },
        include: {
          organization: true,
          department: true,
        },
      });
    },

    // Organization Queries
    organizations: async (_: any, args: any, context: any) => {
      const { first = 20, after } = args;

      const organizations = await prisma.organization.findMany({
        take: first,
        skip: after ? 1 : 0,
        cursor: after ? { id: after } : undefined,
        orderBy: { createdAt: 'desc' },
      });

      const edges = organizations.map(org => ({
        node: org,
        cursor: org.id,
      }));

      return {
        edges,
        pageInfo: {
          hasNextPage: organizations.length === first,
          hasPreviousPage: !!after,
          startCursor: edges.length > 0 ? edges[0].cursor : null,
          endCursor: edges.length > 0 ? edges[edges.length - 1].cursor : null,
        },
      };
    },

    organization: async (_: any, args: any) => {
      return await prisma.organization.findUnique({
        where: { id: args.id },
      });
    },

    // Property Queries
    properties: async (_: any, args: any, context: any) => {
      const { first = 20, after, where } = args;
      
      const whereClause: any = {};
      if (where) {
        if (where.name) whereClause.name = { contains: where.name };
        if (where.type) whereClause.type = where.type;
        if (where.status) whereClause.status = where.status;
      }

      const properties = await prisma.property.findMany({
        where: whereClause,
        take: first,
        skip: after ? 1 : 0,
        cursor: after ? { id: after } : undefined,
        include: {
          organization: true,
          buildings: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      const edges = properties.map(property => ({
        node: property,
        cursor: property.id,
      }));

      return {
        edges,
        pageInfo: {
          hasNextPage: properties.length === first,
          hasPreviousPage: !!after,
          startCursor: edges.length > 0 ? edges[0].cursor : null,
          endCursor: edges.length > 0 ? edges[edges.length - 1].cursor : null,
        },
      };
    },

    property: async (_: any, args: any) => {
      return await prisma.property.findUnique({
        where: { id: args.id },
        include: {
          organization: true,
          buildings: {
            include: {
              floors: {
                include: {
                  spaces: true,
                },
              },
            },
          },
          assets: true,
        },
      });
    },

    // Asset Queries
    assets: async (_: any, args: any, context: any) => {
      const { first = 20, after, where } = args;
      
      const whereClause: any = {};
      if (where) {
        if (where.type) whereClause.type = where.type;
        if (where.status) whereClause.status = where.status;
      }

      const assets = await prisma.asset.findMany({
        where: whereClause,
        take: first,
        skip: after ? 1 : 0,
        cursor: after ? { id: after } : undefined,
        include: {
          organization: true,
          property: true,
          building: true,
          floor: true,
          space: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      const edges = assets.map(asset => ({
        node: asset,
        cursor: asset.id,
      }));

      return {
        edges,
        pageInfo: {
          hasNextPage: assets.length === first,
          hasPreviousPage: !!after,
          startCursor: edges.length > 0 ? edges[0].cursor : null,
          endCursor: edges.length > 0 ? edges[edges.length - 1].cursor : null,
        },
      };
    },

    asset: async (_: any, args: any) => {
      return await prisma.asset.findUnique({
        where: { id: args.id },
        include: {
          organization: true,
          property: true,
          building: true,
          floor: true,
          space: true,
          maintenanceRecords: true,
          workOrders: {
            include: {
              requestedBy: true,
              assignedTo: true,
            },
          },
        },
      });
    },

    // Workflow Queries
    workflowDefinitions: async (_: any, args: any, context: any) => {
      const { first = 20, after } = args;

      const definitions = await prisma.workflowDefinition.findMany({
        take: first,
        skip: after ? 1 : 0,
        cursor: after ? { id: after } : undefined,
        include: {
          organization: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      const edges = definitions.map(def => ({
        node: def,
        cursor: def.id,
      }));

      return {
        edges,
        pageInfo: {
          hasNextPage: definitions.length === first,
          hasPreviousPage: !!after,
          startCursor: edges.length > 0 ? edges[0].cursor : null,
          endCursor: edges.length > 0 ? edges[edges.length - 1].cursor : null,
        },
      };
    },

    workflowDefinition: async (_: any, args: any) => {
      return await prisma.workflowDefinition.findUnique({
        where: { id: args.id },
        include: {
          organization: true,
          instances: {
            include: {
              initiatedBy: true,
              approvals: {
                include: {
                  approver: true,
                },
              },
            },
          },
        },
      });
    },

    workflowInstances: async (_: any, args: any, context: any) => {
      const { first = 20, after, where } = args;
      
      const whereClause: any = {};
      if (where) {
        if (where.status) whereClause.status = where.status;
        if (where.priority) whereClause.priority = where.priority;
      }

      const instances = await prisma.workflowInstance.findMany({
        where: whereClause,
        take: first,
        skip: after ? 1 : 0,
        cursor: after ? { id: after } : undefined,
        include: {
          definition: true,
          initiatedBy: true,
          organization: true,
          approvals: {
            include: {
              approver: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      const edges = instances.map(instance => ({
        node: instance,
        cursor: instance.id,
      }));

      return {
        edges,
        pageInfo: {
          hasNextPage: instances.length === first,
          hasPreviousPage: !!after,
          startCursor: edges.length > 0 ? edges[0].cursor : null,
          endCursor: edges.length > 0 ? edges[edges.length - 1].cursor : null,
        },
      };
    },

    workflowInstance: async (_: any, args: any) => {
      return await prisma.workflowInstance.findUnique({
        where: { id: args.id },
        include: {
          definition: true,
          initiatedBy: true,
          organization: true,
          approvals: {
            include: {
              approver: true,
            },
          },
        },
      });
    },

    // Document Queries
    documents: async (_: any, args: any, context: any) => {
      const { first = 20, after, where } = args;
      
      const whereClause: any = {};
      if (where) {
        if (where.category) whereClause.category = where.category;
        if (where.confidentiality) whereClause.confidentiality = where.confidentiality;
        if (where.tags && where.tags.length > 0) {
          whereClause.tags = { hasSome: where.tags };
        }
      }

      const documents = await prisma.document.findMany({
        where: whereClause,
        take: first,
        skip: after ? 1 : 0,
        cursor: after ? { id: after } : undefined,
        include: {
          organization: true,
          createdBy: true,
          versions: true,
        },
        orderBy: { createdAt: 'desc' },
      });

      const edges = documents.map(doc => ({
        node: doc,
        cursor: doc.id,
      }));

      return {
        edges,
        pageInfo: {
          hasNextPage: documents.length === first,
          hasPreviousPage: !!after,
          startCursor: edges.length > 0 ? edges[0].cursor : null,
          endCursor: edges.length > 0 ? edges[edges.length - 1].cursor : null,
        },
      };
    },

    document: async (_: any, args: any) => {
      return await prisma.document.findUnique({
        where: { id: args.id },
        include: {
          organization: true,
          createdBy: true,
          versions: {
            include: {
              createdBy: true,
            },
          },
          access: {
            include: {
              user: true,
              department: true,
            },
          },
          reviews: {
            include: {
              reviewer: true,
            },
          },
        },
      });
    },

    // Custom Field Queries
    customFieldDefinitions: async (_: any, args: any, context: any) => {
      const { entityType, first = 20, after } = args;
      
      const whereClause: any = {};
      if (entityType) {
        whereClause.entityType = entityType;
      }

      const definitions = await prisma.customFieldDefinition.findMany({
        where: whereClause,
        take: first,
        skip: after ? 1 : 0,
        cursor: after ? { id: after } : undefined,
        include: {
          organization: true,
          createdBy: true,
        },
        orderBy: { order: 'asc' },
      });

      const edges = definitions.map(def => ({
        node: def,
        cursor: def.id,
      }));

      return {
        edges,
        pageInfo: {
          hasNextPage: definitions.length === first,
          hasPreviousPage: !!after,
          startCursor: edges.length > 0 ? edges[0].cursor : null,
          endCursor: edges.length > 0 ? edges[edges.length - 1].cursor : null,
        },
      };
    },

    customFieldDefinition: async (_: any, args: any) => {
      return await prisma.customFieldDefinition.findUnique({
        where: { id: args.id },
        include: {
          organization: true,
          createdBy: true,
          values: {
            include: {
              createdBy: true,
              updatedBy: true,
            },
          },
        },
      });
    },
  },

  // Type Resolvers
  User: {
    fullName: (parent: any) => `${parent.firstName} ${parent.lastName}`,
    
    workflowInstances: async (parent: any) => {
      return await prisma.workflowInstance.findMany({
        where: { initiatedById: parent.id },
        include: {
          definition: true,
        },
        orderBy: { createdAt: 'desc' },
      });
    },

    notifications: async (parent: any) => {
      return await prisma.notification.findMany({
        where: { recipientId: parent.id },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
    },

    documents: async (parent: any) => {
      return await prisma.document.findMany({
        where: { createdById: parent.id },
        orderBy: { createdAt: 'desc' },
        take: 50,
      });
    },
  },

  Organization: {
    users: async (parent: any) => {
      return await prisma.user.findMany({
        where: { organizationId: parent.id },
        include: {
          department: true,
        },
        orderBy: { lastName: 'asc' },
      });
    },

    departments: async (parent: any) => {
      return await prisma.department.findMany({
        where: { organizationId: parent.id },
        orderBy: { name: 'asc' },
      });
    },

    properties: async (parent: any) => {
      return await prisma.property.findMany({
        where: { organizationId: parent.id },
        include: {
          buildings: true,
        },
        orderBy: { name: 'asc' },
      });
    },

    workflows: async (parent: any) => {
      return await prisma.workflowDefinition.findMany({
        where: { organizationId: parent.id },
        orderBy: { name: 'asc' },
      });
    },

    customFields: async (parent: any) => {
      return await prisma.customFieldDefinition.findMany({
        where: { organizationId: parent.id },
        orderBy: { name: 'asc' },
      });
    },
  },

  Property: {
    buildings: async (parent: any) => {
      return await prisma.building.findMany({
        where: { propertyId: parent.id },
        include: {
          floors: {
            include: {
              spaces: true,
            },
          },
        },
        orderBy: { name: 'asc' },
      });
    },

    assets: async (parent: any) => {
      return await prisma.asset.findMany({
        where: { propertyId: parent.id },
        orderBy: { name: 'asc' },
      });
    },

    customFieldValues: async (parent: any) => {
      return await prisma.customFieldValue.findMany({
        where: { 
          entityId: parent.id,
          entityType: 'Property',
        },
        include: {
          field: true,
        },
      });
    },
  },

  Building: {
    floors: async (parent: any) => {
      return await prisma.floor.findMany({
        where: { buildingId: parent.id },
        include: {
          spaces: true,
        },
        orderBy: { level: 'asc' },
      });
    },

    assets: async (parent: any) => {
      return await prisma.asset.findMany({
        where: { buildingId: parent.id },
        orderBy: { name: 'asc' },
      });
    },
  },

  Floor: {
    spaces: async (parent: any) => {
      return await prisma.space.findMany({
        where: { floorId: parent.id },
        orderBy: { name: 'asc' },
      });
    },

    assets: async (parent: any) => {
      return await prisma.asset.findMany({
        where: { floorId: parent.id },
        orderBy: { name: 'asc' },
      });
    },
  },

  Space: {
    assets: async (parent: any) => {
      return await prisma.asset.findMany({
        where: { spaceId: parent.id },
        orderBy: { name: 'asc' },
      });
    },

    bookings: async (parent: any) => {
      return await prisma.spaceBooking.findMany({
        where: { spaceId: parent.id },
        include: {
          bookedBy: true,
          bookedFor: true,
        },
        orderBy: { startTime: 'asc' },
      });
    },
  },

  Asset: {
    maintenanceRecords: async (parent: any) => {
      return await prisma.maintenanceRecord.findMany({
        where: { assetId: parent.id },
        orderBy: { startDate: 'desc' },
      });
    },

    workOrders: async (parent: any) => {
      return await prisma.workOrder.findMany({
        where: { assetId: parent.id },
        include: {
          requestedBy: true,
          assignedTo: true,
        },
        orderBy: { createdAt: 'desc' },
      });
    },

    customFieldValues: async (parent: any) => {
      return await prisma.customFieldValue.findMany({
        where: { 
          entityId: parent.id,
          entityType: 'Asset',
        },
        include: {
          field: true,
        },
      });
    },
  },

  WorkflowDefinition: {
    instances: async (parent: any) => {
      return await prisma.workflowInstance.findMany({
        where: { definitionId: parent.id },
        include: {
          initiatedBy: true,
          approvals: {
            include: {
              approver: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    },
  },

  Document: {
    versions: async (parent: any) => {
      return await prisma.documentVersion.findMany({
        where: { documentId: parent.id },
        include: {
          createdBy: true,
        },
        orderBy: { createdAt: 'desc' },
      });
    },

    access: async (parent: any) => {
      return await prisma.documentAccess.findMany({
        where: { documentId: parent.id },
        include: {
          user: true,
          department: true,
        },
      });
    },

    reviews: async (parent: any) => {
      return await prisma.documentReview.findMany({
        where: { documentId: parent.id },
        include: {
          reviewer: true,
        },
        orderBy: { createdAt: 'desc' },
      });
    },

    customFieldValues: async (parent: any) => {
      return await prisma.customFieldValue.findMany({
        where: { 
          entityId: parent.id,
          entityType: 'Document',
        },
        include: {
          field: true,
        },
      });
    },
  },

  CustomFieldDefinition: {
    values: async (parent: any) => {
      return await prisma.customFieldValue.findMany({
        where: { fieldId: parent.id },
        include: {
          createdBy: true,
          updatedBy: true,
        },
        orderBy: { createdAt: 'desc' },
      });
    },
  },

  // Additional nested resolvers for relationships
  Department: {
    parent: async (parent: any) => {
      if (!parent.parentId) return null;
      return await prisma.department.findUnique({
        where: { id: parent.parentId },
      });
    },

    children: async (parent: any) => {
      return await prisma.department.findMany({
        where: { parentId: parent.id },
        orderBy: { name: 'asc' },
      });
    },

    users: async (parent: any) => {
      return await prisma.user.findMany({
        where: { departmentId: parent.id },
        orderBy: { lastName: 'asc' },
      });
    },
  },

  SpaceBooking: {
    attendees: async (parent: any) => {
      // This would require a join table for booking attendees
      // For now, return empty array or implement based on your schema
      return [];
    },
  },

  WorkflowInstance: {
    approvals: async (parent: any) => {
      return await prisma.approval.findMany({
        where: { workflowId: parent.id },
        include: {
          approver: true,
        },
        orderBy: { createdAt: 'asc' },
      });
    },
  },
};

export default resolvers;