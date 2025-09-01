import { gql } from 'apollo-server-express';

export const typeDefs = gql`
  # Scalars
  scalar DateTime
  scalar JSON
  scalar Upload

  # Core Types
  type User {
    id: ID!
    email: String!
    username: String!
    firstName: String!
    lastName: String!
    fullName: String!
    role: UserRole!
    language: String!
    timezone: String!
    currency: String!
    isActive: Boolean!
    lastLoginAt: DateTime
    createdAt: DateTime!
    updatedAt: DateTime!
    organization: Organization
    department: Department
    workflowInstances: [WorkflowInstance!]!
    notifications: [Notification!]!
    documents: [Document!]!
  }

  enum UserRole {
    SUPER_ADMIN
    ADMIN
    MANAGER
    USER
    READONLY
  }

  type Organization {
    id: ID!
    name: String!
    description: String
    address: JSON
    defaultCurrency: String!
    defaultLanguage: String!
    defaultTimezone: String!
    isActive: Boolean!
    createdAt: DateTime!
    updatedAt: DateTime!
    users: [User!]!
    departments: [Department!]!
    properties: [Property!]!
    workflows: [WorkflowDefinition!]!
    customFields: [CustomFieldDefinition!]!
  }

  type Department {
    id: ID!
    name: String!
    description: String
    parentId: ID
    isActive: Boolean!
    createdAt: DateTime!
    updatedAt: DateTime!
    parent: Department
    children: [Department!]!
    users: [User!]!
    organization: Organization!
  }

  type Property {
    id: ID!
    name: String!
    address: PropertyAddress!
    type: PropertyType!
    status: PropertyStatus!
    totalArea: Float
    rentableArea: Float
    occupancyRate: Float
    yearBuilt: Int
    isActive: Boolean!
    createdAt: DateTime!
    updatedAt: DateTime!
    organization: Organization!
    buildings: [Building!]!
    assets: [Asset!]!
    customFieldValues: [CustomFieldValue!]!
  }

  type PropertyAddress {
    street1: String!
    street2: String
    city: String!
    state: String!
    zipCode: String!
    country: String!
    latitude: Float
    longitude: Float
  }

  enum PropertyType {
    OFFICE
    RETAIL
    INDUSTRIAL
    WAREHOUSE
    MIXED_USE
    RESIDENTIAL
    HOSPITAL
    SCHOOL
    OTHER
  }

  enum PropertyStatus {
    ACTIVE
    INACTIVE
    UNDER_CONSTRUCTION
    RENOVATION
    DISPOSED
  }

  type Building {
    id: ID!
    name: String!
    code: String!
    floors: Int!
    totalArea: Float
    rentableArea: Float
    isActive: Boolean!
    createdAt: DateTime!
    updatedAt: DateTime!
    property: Property!
    floors: [Floor!]!
    assets: [Asset!]!
  }

  type Floor {
    id: ID!
    name: String!
    level: Int!
    totalArea: Float
    rentableArea: Float
    isActive: Boolean!
    createdAt: DateTime!
    updatedAt: DateTime!
    building: Building!
    spaces: [Space!]!
    assets: [Asset!]!
  }

  type Space {
    id: ID!
    name: String!
    code: String!
    type: SpaceType!
    area: Float
    capacity: Int
    isBookable: Boolean!
    isActive: Boolean!
    createdAt: DateTime!
    updatedAt: DateTime!
    floor: Floor!
    assets: [Asset!]!
    bookings: [SpaceBooking!]!
  }

  enum SpaceType {
    OFFICE
    CONFERENCE_ROOM
    MEETING_ROOM
    DESK
    WORKSTATION
    PHONE_BOOTH
    LOUNGE
    KITCHEN
    RESTROOM
    STORAGE
    SERVER_ROOM
    LOBBY
    CORRIDOR
    OTHER
  }

  type SpaceBooking {
    id: ID!
    title: String!
    description: String
    startTime: DateTime!
    endTime: DateTime!
    status: BookingStatus!
    isRecurring: Boolean!
    recurrenceRule: String
    attendeeCount: Int
    createdAt: DateTime!
    updatedAt: DateTime!
    space: Space!
    bookedBy: User!
    bookedFor: User
    attendees: [User!]!
  }

  enum BookingStatus {
    PENDING
    CONFIRMED
    CANCELLED
    COMPLETED
  }

  type Asset {
    id: ID!
    name: String!
    code: String!
    type: AssetType!
    category: AssetCategory!
    status: AssetStatus!
    condition: AssetCondition!
    purchaseDate: DateTime
    purchasePrice: Float
    currentValue: Float
    depreciationRate: Float
    warrantyExpires: DateTime
    lastMaintenance: DateTime
    nextMaintenance: DateTime
    isActive: Boolean!
    createdAt: DateTime!
    updatedAt: DateTime!
    property: Property
    building: Building
    floor: Floor
    space: Space
    organization: Organization!
    maintenanceRecords: [MaintenanceRecord!]!
    workOrders: [WorkOrder!]!
    customFieldValues: [CustomFieldValue!]!
  }

  enum AssetType {
    EQUIPMENT
    FURNITURE
    VEHICLE
    IT_EQUIPMENT
    BUILDING_SYSTEM
    SECURITY_SYSTEM
    HVAC_SYSTEM
    ELECTRICAL_SYSTEM
    PLUMBING_SYSTEM
    OTHER
  }

  enum AssetCategory {
    CRITICAL
    IMPORTANT
    STANDARD
    NON_CRITICAL
  }

  enum AssetStatus {
    ACTIVE
    INACTIVE
    IN_MAINTENANCE
    OUT_OF_SERVICE
    DISPOSED
    RETIRED
  }

  enum AssetCondition {
    EXCELLENT
    GOOD
    FAIR
    POOR
    CRITICAL
  }

  # Workflow Types
  type WorkflowDefinition {
    id: ID!
    name: String!
    description: String
    version: String!
    isActive: Boolean!
    definition: JSON!
    createdAt: DateTime!
    updatedAt: DateTime!
    organization: Organization!
    instances: [WorkflowInstance!]!
  }

  type WorkflowInstance {
    id: ID!
    status: WorkflowStatus!
    currentStep: String
    data: JSON!
    startedAt: DateTime!
    completedAt: DateTime
    dueDate: DateTime
    priority: WorkflowPriority!
    createdAt: DateTime!
    updatedAt: DateTime!
    definition: WorkflowDefinition!
    initiatedBy: User!
    organization: Organization!
    approvals: [Approval!]!
  }

  enum WorkflowStatus {
    PENDING
    IN_PROGRESS
    COMPLETED
    CANCELLED
    EXPIRED
  }

  enum WorkflowPriority {
    LOW
    NORMAL
    HIGH
    URGENT
  }

  type Approval {
    id: ID!
    stepId: String!
    status: ApprovalStatus!
    comments: String
    approvedAt: DateTime
    dueDate: DateTime
    createdAt: DateTime!
    updatedAt: DateTime!
    workflow: WorkflowInstance!
    approver: User!
  }

  enum ApprovalStatus {
    PENDING
    APPROVED
    REJECTED
    DELEGATED
  }

  # Document Types
  type Document {
    id: ID!
    name: String!
    description: String
    fileName: String!
    fileSize: Int!
    mimeType: String!
    storageUrl: String!
    version: String!
    isActive: Boolean!
    metadata: JSON
    tags: [String!]!
    category: String
    confidentiality: DocumentConfidentiality!
    expirationDate: DateTime
    reviewDate: DateTime
    createdAt: DateTime!
    updatedAt: DateTime!
    organization: Organization!
    createdBy: User!
    versions: [DocumentVersion!]!
    access: [DocumentAccess!]!
    reviews: [DocumentReview!]!
    customFieldValues: [CustomFieldValue!]!
  }

  enum DocumentConfidentiality {
    PUBLIC
    INTERNAL
    CONFIDENTIAL
    RESTRICTED
  }

  type DocumentVersion {
    id: ID!
    version: String!
    fileName: String!
    fileSize: Int!
    storageUrl: String!
    changes: String
    isActive: Boolean!
    createdAt: DateTime!
    document: Document!
    createdBy: User!
  }

  type DocumentAccess {
    id: ID!
    permissions: [DocumentPermission!]!
    createdAt: DateTime!
    updatedAt: DateTime!
    document: Document!
    user: User
    role: String
    department: Department
  }

  enum DocumentPermission {
    READ
    WRITE
    DELETE
    SHARE
    VERSION
    ADMIN
  }

  type DocumentReview {
    id: ID!
    status: ReviewStatus!
    reviewedAt: DateTime
    comments: String
    createdAt: DateTime!
    document: Document!
    reviewer: User!
  }

  enum ReviewStatus {
    PENDING
    APPROVED
    REJECTED
    CHANGES_REQUESTED
  }

  # Custom Field Types
  type CustomFieldDefinition {
    id: ID!
    name: String!
    label: String!
    description: String
    fieldType: CustomFieldType!
    entityType: String!
    category: String
    isRequired: Boolean!
    isActive: Boolean!
    isSearchable: Boolean!
    isSortable: Boolean!
    order: Int!
    validation: JSON!
    options: JSON
    defaultValue: JSON
    helpText: String
    createdAt: DateTime!
    updatedAt: DateTime!
    organization: Organization!
    createdBy: User!
    values: [CustomFieldValue!]!
  }

  enum CustomFieldType {
    TEXT
    TEXTAREA
    RICH_TEXT
    NUMBER
    DECIMAL
    CURRENCY
    PERCENTAGE
    DATE
    DATETIME
    TIME
    BOOLEAN
    DROPDOWN
    MULTI_SELECT
    RADIO
    CHECKBOX
    FILE
    IMAGE
    URL
    EMAIL
    PHONE
    ADDRESS
    LOCATION
    JSON
    LOOKUP
    FORMULA
    RATING
    COLOR
    SIGNATURE
    BARCODE
    QR_CODE
  }

  type CustomFieldValue {
    id: ID!
    value: JSON
    displayValue: String
    metadata: JSON
    createdAt: DateTime!
    updatedAt: DateTime!
    field: CustomFieldDefinition!
    entityId: String!
    entityType: String!
    createdBy: User!
    updatedBy: User!
  }

  # Query Types (Core subset for Phase 2)
  type Query {
    # User queries
    me: User
    users(first: Int, after: String, where: UserWhereInput): UserConnection!
    user(id: ID!): User

    # Organization queries
    organizations(first: Int, after: String): OrganizationConnection!
    organization(id: ID!): Organization

    # Property queries
    properties(first: Int, after: String, where: PropertyWhereInput): PropertyConnection!
    property(id: ID!): Property

    # Asset queries
    assets(first: Int, after: String, where: AssetWhereInput): AssetConnection!
    asset(id: ID!): Asset

    # Workflow queries
    workflowDefinitions(first: Int, after: String): WorkflowDefinitionConnection!
    workflowDefinition(id: ID!): WorkflowDefinition
    workflowInstances(first: Int, after: String, where: WorkflowInstanceWhereInput): WorkflowInstanceConnection!
    workflowInstance(id: ID!): WorkflowInstance

    # Document queries
    documents(first: Int, after: String, where: DocumentWhereInput): DocumentConnection!
    document(id: ID!): Document

    # Custom field queries
    customFieldDefinitions(entityType: String, first: Int, after: String): CustomFieldDefinitionConnection!
    customFieldDefinition(id: ID!): CustomFieldDefinition
  }

  # Input Types
  input UserWhereInput {
    email: String
    role: UserRole
    isActive: Boolean
  }

  input PropertyWhereInput {
    name: String
    type: PropertyType
    status: PropertyStatus
  }

  input AssetWhereInput {
    type: AssetType
    status: AssetStatus
  }

  input WorkflowInstanceWhereInput {
    status: WorkflowStatus
    priority: WorkflowPriority
  }

  input DocumentWhereInput {
    category: String
    confidentiality: DocumentConfidentiality
    tags: [String!]
  }

  # Connection Types
  type UserConnection {
    edges: [UserEdge!]!
    pageInfo: PageInfo!
  }

  type UserEdge {
    node: User!
    cursor: String!
  }

  type OrganizationConnection {
    edges: [OrganizationEdge!]!
    pageInfo: PageInfo!
  }

  type OrganizationEdge {
    node: Organization!
    cursor: String!
  }

  type PropertyConnection {
    edges: [PropertyEdge!]!
    pageInfo: PageInfo!
  }

  type PropertyEdge {
    node: Property!
    cursor: String!
  }

  type AssetConnection {
    edges: [AssetEdge!]!
    pageInfo: PageInfo!
  }

  type AssetEdge {
    node: Asset!
    cursor: String!
  }

  type WorkflowDefinitionConnection {
    edges: [WorkflowDefinitionEdge!]!
    pageInfo: PageInfo!
  }

  type WorkflowDefinitionEdge {
    node: WorkflowDefinition!
    cursor: String!
  }

  type WorkflowInstanceConnection {
    edges: [WorkflowInstanceEdge!]!
    pageInfo: PageInfo!
  }

  type WorkflowInstanceEdge {
    node: WorkflowInstance!
    cursor: String!
  }

  type DocumentConnection {
    edges: [DocumentEdge!]!
    pageInfo: PageInfo!
  }

  type DocumentEdge {
    node: Document!
    cursor: String!
  }

  type CustomFieldDefinitionConnection {
    edges: [CustomFieldDefinitionEdge!]!
    pageInfo: PageInfo!
  }

  type CustomFieldDefinitionEdge {
    node: CustomFieldDefinition!
    cursor: String!
  }

  type PageInfo {
    hasNextPage: Boolean!
    hasPreviousPage: Boolean!
    startCursor: String
    endCursor: String
  }
`;