# Turbo Asset - Enterprise IWMS Platform

[![Phase](https://img.shields.io/badge/Phase-3-green)](https://github.com/harborgrid-justin/turbo-asset)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3+-blue)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green)](https://nodejs.org/)
[![License](https://img.shields.io/badge/License-MIT-yellow)](LICENSE)

**Turbo Asset** is a comprehensive Enterprise Integrated Workplace Management System (IWMS) designed as a modern alternative to IBM Tririga. Built with cutting-edge technologies, it provides organizations with powerful tools for real estate and facilities management, workflow automation, and enterprise integrations.

## 🚀 Phase 3 Features

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

### ✅ Space Management & Portfolio Tracking
- **Interactive Floor Plans with CAD Integration**
  - AutoCAD (DWG/DXF), Revit (RVT), ArchiCAD (PLN) support
  - IFC (Industry Foundation Classes) compatibility
  - Vector and raster format support (SVG, PDF, JPG, PNG)
  - Layer management and coordinate system integration

- **Space Allocation & Occupancy Management**
  - Hoteling and desk booking system with conflict detection
  - Outlook/Google Calendar integration for seamless scheduling
  - Recurring booking patterns and guest management
  - Real-time check-in/check-out capabilities
  - Support for 100,000+ employees with scalable architecture

- **Move Management with Cost Tracking**
  - Comprehensive move request workflow (Internal, External, New Hire, Termination)
  - Vendor coordination with performance tracking and ratings
  - Detailed cost breakdown by category (Labor, Materials, Transportation)
  - Invoice management and payment tracking
  - Move analytics and cost variance reporting

- **Portfolio Dashboard with Drill-down Capabilities**
  - Executive-level portfolio overview with key metrics
  - Property-level drill-down to building, floor, and space details
  - Real-time occupancy rates and utilization statistics
  - Financial performance tracking (NOI, Cost per SqFt, ROI)
  - Interactive visualizations and trend analysis

- **Space Utilization Reporting & Sensor Integration**
  - IoT sensor data processing (Occupancy, Temperature, CO2, Foot Traffic)
  - Multiple data sources (Manual, Badge Scan, WiFi, Camera AI)
  - Utilization analytics with trend analysis and recommendations
  - Heat maps for peak usage identification
  - Capacity planning and optimization insights

- **Chargeback & Cost Allocation System**
  - Flexible allocation methods (Square Footage, Headcount, Usage-based, Fixed %)
  - Department and business unit cost distribution
  - Automated monthly allocation processing
  - Comprehensive cost reporting and analytics
  - Rate management with effective date controls

- **Space Standards & Planning Templates**
  - Standardized space configurations by type and capacity
  - Compliance tracking (Safety, Accessibility, Building Codes)
  - Cost estimation for space setup and fit-out
  - Template-based space planning and allocation

- **Emergency Planning & Compliance Reporting**
  - Building-specific evacuation plans and procedures
  - Emergency contact management and zone mapping
  - Evacuation drill tracking and compliance scoring
  - Capacity management for safety compliance
  - Regulatory reporting and audit trails

- **Advanced Calendar Integration**
  - Microsoft Outlook and Google Calendar sync
  - Free/busy schedule integration for optimal booking
  - Automated calendar event creation and updates
  - Bulk synchronization capabilities
  - Cross-platform compatibility

- **Real-time Analytics & Insights**
  - Live occupancy monitoring and alerts
  - Predictive analytics for space planning
  - Cost optimization recommendations
  - Usage pattern analysis and forecasting
  - Automated reporting and notifications

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

### Space Bookings & Hoteling
- `GET /api/space-bookings` - List space bookings with filtering
- `POST /api/space-bookings` - Create new space booking
- `GET /api/space-bookings/:id` - Get booking details
- `PATCH /api/space-bookings/:id/status` - Update booking status (check-in/out, cancel)
- `GET /api/space-bookings/availability/check` - Check space availability

### Move Management
- `GET /api/move-management` - List move requests with filtering
- `POST /api/move-management` - Create new move request
- `GET /api/move-management/:id` - Get move request details
- `PATCH /api/move-management/:id/process` - Approve/reject move request
- `PATCH /api/move-management/:id/status` - Update move status
- `POST /api/move-management/:id/vendors` - Add vendor to move
- `POST /api/move-management/:id/costs` - Add cost to move
- `GET /api/move-management/analytics/summary` - Move analytics

### Portfolio & Analytics
- `GET /api/portfolio/dashboard` - Comprehensive portfolio dashboard
- `GET /api/portfolio/properties/:id/drilldown` - Property drill-down data
- `GET /api/portfolio/utilization/analytics` - Space utilization analytics
- `GET /api/portfolio/occupancy/realtime` - Real-time occupancy data
- `GET /api/portfolio/chargeback/analytics` - Chargeback cost analytics
- `GET /api/portfolio/chargeback/report` - Generate chargeback reports
- `POST /api/portfolio/utilization/record` - Record utilization data
- `POST /api/portfolio/utilization/sensor-data` - Process IoT sensor data

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

- **✅ Phase 1**: Core IWMS Foundation
- **✅ Phase 2**: Workflow Engine & Integrations  
- **✅ Phase 3**: Space Management & Portfolio Tracking (COMPLETED)
- **Phase 4**: Advanced Analytics & AI-Powered Insights
- **Phase 5**: Mobile Applications & Field Management
- **Phase 6**: IoT Integration & Smart Building Management
- **Phase 7**: Sustainability & ESG Reporting
