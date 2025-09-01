# Turbo Asset - Enterprise IWMS Platform

[![Phase](https://img.shields.io/badge/Phase-2-blue)](https://github.com/harborgrid-justin/turbo-asset)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3+-blue)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green)](https://nodejs.org/)
[![License](https://img.shields.io/badge/License-MIT-yellow)](LICENSE)

**Turbo Asset** is a comprehensive Enterprise Integrated Workplace Management System (IWMS) designed as a modern alternative to IBM Tririga. Built with cutting-edge technologies, it provides organizations with powerful tools for real estate and facilities management, workflow automation, and enterprise integrations.

## 🚀 Phase 2 Features

### ✅ Core IWMS Data Model & Workflows
- **Comprehensive Real Estate & Facilities Data Model**
  - Properties, Buildings, Floors, Spaces hierarchy
  - Asset management with maintenance tracking
  - Organizational structure (Users, Departments, Organizations)

- **Configurable Workflow Engine**
  - JSON-based workflow definitions
  - Approval chains with role-based routing
  - SLA tracking with automated escalation
  - Real-time workflow state management

- **Multi-currency & Multi-language Support**
  - 20+ languages supported (EN, ES, FR, DE, IT, PT, NL, SV, DA, NO, FI, PL, CS, HU, RU, JA, KO, ZH, AR, HE, HI, TH, VI, TR)
  - Real-time currency conversion
  - Locale-specific formatting for dates, numbers, and currencies

- **Custom Field Builder**
  - Dynamic field creation with 12+ field types
  - Advanced validation rules and field dependencies
  - Runtime field rendering and validation

- **Document Management System**
  - Version control with diff tracking
  - Metadata management and search capabilities
  - Granular access control and permissions
  - Multiple storage backends (Local, S3, Azure, GCP)

- **Integration Middleware**
  - SAP integration connector
  - Oracle integration connector
  - Workday integration connector
  - ServiceNow integration connector
  - Generic REST/SOAP adapter framework

- **REST/GraphQL APIs & SDK**
  - Comprehensive RESTful API endpoints
  - GraphQL schema and resolvers
  - Auto-generated TypeScript SDK
  - OpenAPI documentation

- **Real-time Notifications & Messaging**
  - WebSocket server for real-time updates
  - Message queue system with Redis/Bull
  - Notification templates and delivery
  - Push notification support

- **Bulk Data Import/Export**
  - CSV/Excel import with validation
  - Bulk export capabilities
  - Data transformation pipelines
  - Comprehensive error handling and reporting

## 🏗️ Architecture

- **Backend**: Node.js + TypeScript + Express
- **Database**: PostgreSQL with Prisma ORM
- **API Layer**: REST + GraphQL
- **Real-time**: Socket.IO + Redis
- **File Storage**: Configurable (Local/S3/Azure/GCP)
- **Queue System**: Bull Queue + Redis
- **Testing**: Jest + Supertest
- **Documentation**: OpenAPI + TypeDoc

## 🛠️ Installation

### Prerequisites

- Node.js 18.0.0 or higher
- PostgreSQL 13 or higher
- Redis 6 or higher

### Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/harborgrid-justin/turbo-asset.git
   cd turbo-asset
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment setup**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Database setup**
   ```bash
   npm run db:generate
   npm run db:migrate
   ```

5. **Start development server**
   ```bash
   npm run dev
   ```

## 📊 API Endpoints

### Core Endpoints
- `GET /api/docs` - API documentation
- `GET /health` - Health check

### Properties
- `GET /api/properties` - List properties
- `POST /api/properties` - Create property
- `GET /api/properties/:id` - Get property by ID
- `PUT /api/properties/:id` - Update property
- `DELETE /api/properties/:id` - Delete property

### Workflows
- `POST /api/workflows/definitions` - Create workflow definition
- `POST /api/workflows/instances` - Start workflow instance
- `POST /api/workflows/approvals/:id/process` - Process approval

### Bulk Data
- `POST /api/bulk/import` - Import data from CSV/Excel
- `POST /api/bulk/export` - Export data to CSV/Excel
- `GET /api/bulk/import/:jobId/status` - Get import job status
- `GET /api/bulk/export/:jobId/status` - Get export job status

### Notifications
- `GET /api/notifications` - Get user notifications
- `PUT /api/notifications/:id/read` - Mark notification as read

## 🌐 Multi-language Support

The system supports 20+ languages with complete localization:

| Language | Code | Status |
|----------|------|--------|
| English | en | ✅ Complete |
| Spanish | es | ✅ Complete |
| French | fr | 🔄 In Progress |
| German | de | 🔄 In Progress |
| Italian | it | 🔄 In Progress |
| Portuguese | pt | 🔄 In Progress |
| Dutch | nl | 🔄 In Progress |
| Swedish | sv | 🔄 In Progress |
| Danish | da | 🔄 In Progress |
| Norwegian | no | 🔄 In Progress |
| Finnish | fi | 🔄 In Progress |
| Polish | pl | 🔄 In Progress |
| Czech | cs | 🔄 In Progress |
| Hungarian | hu | 🔄 In Progress |
| Russian | ru | 🔄 In Progress |
| Japanese | ja | 🔄 In Progress |
| Korean | ko | 🔄 In Progress |
| Chinese | zh | 🔄 In Progress |
| Arabic | ar | 🔄 In Progress |
| Hebrew | he | 🔄 In Progress |
| Hindi | hi | 🔄 In Progress |
| Thai | th | 🔄 In Progress |
| Vietnamese | vi | 🔄 In Progress |
| Turkish | tr | 🔄 In Progress |

## 🔗 Enterprise Integrations

### Supported Systems
- **SAP**: Asset and financial data synchronization
- **Oracle**: Facilities and space management integration
- **Workday**: HR and employee data integration
- **ServiceNow**: IT service management integration

### Custom Integrations
The generic API adapter framework allows integration with any REST or SOAP-based system.

## 🧪 Development

### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run test         # Run tests
npm run test:watch   # Run tests in watch mode
npm run lint         # Run ESLint
npm run lint:fix     # Fix ESLint errors
npm run format       # Format code with Prettier
npm run db:generate  # Generate Prisma client
npm run db:migrate   # Run database migrations
npm run db:studio    # Open Prisma Studio
```

### Project Structure

```
src/
├── config/          # Configuration files
├── controllers/     # API route controllers
├── services/        # Business logic services
├── models/          # Data models and types
├── middleware/      # Express middleware
├── utils/           # Utility functions
└── types/           # TypeScript type definitions

prisma/
└── schema.prisma    # Database schema

locales/             # Internationalization files
├── en/
├── es/
└── ...

tests/               # Test files
docs/                # Documentation
logs/                # Log files
```

## 📝 Configuration

### Environment Variables

Key configuration options in `.env`:

```bash
# Database
DATABASE_URL="postgresql://username:password@localhost:5432/turbo_asset"

# Server
PORT=3000
NODE_ENV=development

# Security
JWT_SECRET=your-jwt-secret-key
JWT_EXPIRES_IN=24h

# Redis
REDIS_URL=redis://localhost:6379

# Storage
STORAGE_TYPE=local # local, s3, azure, gcp

# Default Settings
DEFAULT_LANGUAGE=en
DEFAULT_CURRENCY=USD
DEFAULT_TIMEZONE=America/New_York
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

For support, please contact [HarborGrid](mailto:support@harborgrid.com) or open an issue on GitHub.

## 🗺️ Roadmap

- **Phase 3**: Advanced Analytics & Reporting
- **Phase 4**: Mobile Applications
- **Phase 5**: AI/ML Capabilities
- **Phase 6**: IoT Integration
