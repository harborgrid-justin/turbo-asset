# Turbo Asset - Oracle Enterprise Edition

**Java-based Enterprise IWMS Platform optimized for Oracle environments**

This is a complete Java reimplementation of the Turbo Asset Enterprise IWMS platform, specifically designed for Oracle enterprise environments including Oracle Database, Oracle WebLogic Server, and Oracle middleware components.

## 🏢 Oracle Enterprise Features

### Database Integration
- **Oracle Database 19c+** support with advanced features
- **Oracle UCP** (Universal Connection Pool) for enterprise connection management
- **Oracle JSON** support for flexible data structures
- **Oracle Spatial** for geographical asset tracking
- **Oracle Text Search** for full-text asset and user search
- **Oracle XML DB** for document management

### Oracle Middleware Integration
- **Oracle SOA Suite** integration for enterprise workflows
- **Oracle Service Bus (OSB)** for service orchestration
- **Oracle ADF** (Application Development Framework) compatibility
- **Oracle WebLogic Server** deployment optimization
- **Oracle Coherence** distributed caching support

### Enterprise Java Technologies
- **Spring Boot 3.2** with Java 17
- **Spring Security** with JWT authentication
- **Spring Data JPA** with Hibernate
- **Oracle JDBC** driver with optimizations
- **Swagger/OpenAPI 3** for API documentation

## 🚀 Quick Start

### Prerequisites
- Java 17 or higher
- Maven 3.8+
- Oracle Database 19c+ (or Oracle XE for development)
- Oracle WebLogic Server 14c (for production deployment)

### Local Development Setup

1. **Clone and navigate to the Java application:**
   ```bash
   cd java_soft
   ```

2. **Configure Oracle Database:**
   ```bash
   # Update src/main/resources/application.properties
   spring.datasource.url=jdbc:oracle:thin:@//localhost:1521/XEPDB1
   spring.datasource.username=turbo_asset
   spring.datasource.password=your_password
   ```

3. **Build the application:**
   ```bash
   mvn clean compile
   ```

4. **Run database migrations:**
   ```bash
   mvn flyway:migrate
   ```

5. **Run the application:**
   ```bash
   mvn spring-boot:run
   ```

6. **Access the application:**
   - API: http://localhost:8080/turbo-asset/api
   - Swagger UI: http://localhost:8080/turbo-asset/swagger-ui.html
   - Health Check: http://localhost:8080/turbo-asset/actuator/health

### Testing

```bash
# Run all tests
mvn test

# Run with test coverage
mvn test jacoco:report
```

## 🏗️ Architecture

### Package Structure
```
com.harborgrid.turboasset/
├── config/           # Spring configuration classes
├── controller/       # REST API controllers
├── service/          # Business logic services
├── repository/       # Data access layer
├── model/           # JPA entity classes
├── dto/             # Data transfer objects
├── security/        # Authentication & authorization
├── oracle/          # Oracle-specific integrations
└── util/            # Utility classes
```

### Key Components

1. **OracleDatabaseConfig** - Oracle UCP and Hibernate configuration
2. **SecurityConfig** - JWT-based security for WebLogic environments
3. **OracleEnterpriseIntegrationService** - Oracle middleware integration
4. **UserService/AssetService** - Core business services
5. **UserController/AssetController** - REST API endpoints

## 🔧 Oracle Database Features

### Advanced Oracle Features Used
- **JSON columns** for flexible address and metadata storage
- **Oracle Text Search** for full-text search capabilities
- **Oracle Spatial** for geographical asset tracking
- **PL/SQL stored procedures** for complex business logic
- **Oracle triggers** for audit trails and automatic timestamps
- **Oracle sequences** for ID generation (legacy compatibility)

### Sample Oracle Queries
```sql
-- Full-text search using Oracle Text
SELECT * FROM assets WHERE CONTAINS(name || ' ' || description, 'equipment') > 0;

-- Spatial query using Oracle Spatial
SELECT * FROM assets WHERE SDO_WITHIN_DISTANCE(location_geom, 
  SDO_GEOMETRY(2001, 4326, SDO_POINT_TYPE(-122.4194, 37.7749, NULL), NULL, NULL), 
  'distance=10 unit=KM') = 'TRUE';

-- JSON query using Oracle JSON
SELECT * FROM organizations WHERE JSON_VALUE(address, '$.city') = 'San Francisco';
```

## 🚀 WebLogic Deployment

### WAR Deployment
```bash
# Build WAR file
mvn clean package

# Deploy to WebLogic
# Copy target/turbo-asset-oracle.war to WebLogic deployments directory
# Or use WebLogic Admin Console for deployment
```

### WebLogic Configuration
1. **DataSource Configuration:**
   - Create Oracle UCP DataSource with JNDI name: `TurboAssetDataSource`
   - Configure connection pool settings

2. **Work Manager Configuration:**
   - Create work manager: `TurboAssetWorkManager`
   - Configure thread constraints

3. **Security Realm:**
   - Configure authentication providers
   - Set up user groups and roles

## 🔐 Security

### Authentication
- JWT-based authentication compatible with Oracle WebLogic
- Role-based access control (RBAC)
- Integration with Oracle Identity Management (optional)

### Roles
- `SUPER_ADMIN` - Full system access
- `ADMIN` - Administrative functions
- `MANAGER` - Management operations
- `USER` - Standard user access
- `READONLY` - Read-only access

## 📊 Monitoring

### Oracle Enterprise Monitoring
- **Oracle Enterprise Manager** integration
- **JMX** metrics exposure
- **WebLogic diagnostics** integration
- **Spring Boot Actuator** endpoints

### Health Checks
- Database connectivity
- Oracle middleware services
- Cache status
- Application metrics

## 🔧 Configuration

### Oracle-Specific Properties
```properties
# Oracle Database
spring.datasource.url=jdbc:oracle:thin:@//host:port/service
spring.datasource.oracleucp.initial-pool-size=5
spring.datasource.oracleucp.max-pool-size=20

# Oracle Middleware
oracle.middleware.soa.enabled=true
oracle.middleware.soa.endpoint=http://host:port/soa-infra
oracle.middleware.osb.enabled=true
oracle.middleware.osb.endpoint=http://host:port/osb

# Oracle Enterprise Features
oracle.enterprise.adf.enabled=true
oracle.enterprise.jet.enabled=true
oracle.enterprise.database.features.json=true
oracle.enterprise.database.features.spatial=true
oracle.enterprise.database.features.text=true
```

## 🤝 Migration from TypeScript Version

This Java implementation provides equivalent functionality to the original TypeScript/Node.js version with Oracle enterprise optimizations:

- **Enhanced performance** with Oracle UCP and Hibernate optimizations
- **Enterprise scalability** with Oracle WebLogic clustering
- **Advanced Oracle features** like Spatial, Text Search, and JSON
- **Enterprise security** with Oracle Identity Management integration
- **Monitoring integration** with Oracle Enterprise Manager

## 📝 API Documentation

The application includes comprehensive API documentation accessible via Swagger UI:
- **Swagger UI:** `/swagger-ui.html`
- **OpenAPI JSON:** `/v3/api-docs`

### Key API Endpoints
- `GET /api/users` - User management
- `GET /api/assets` - Asset management
- `GET /api/properties` - Property management
- `GET /api/oracle/health` - Oracle components health check

## 🤖 Oracle Integration Examples

### SOA Composite Invocation
```java
Map<String, Object> result = oracleService.invokeSOAComposite(
    "AssetManagementComposite", 
    "processAssetUpdate", 
    assetData
);
```

### Oracle Spatial Query
```java
List<Asset> nearbyAssets = assetService.findAssetsWithinRadius(
    37.7749, -122.4194, 10.0, organizationId
);
```

### Oracle Text Search
```java
List<Asset> searchResults = assetService.searchAssets(
    "HVAC equipment", organizationId
);
```

## 📞 Support

For Oracle enterprise deployment support:
- Contact: enterprise-support@harborgrid.com
- Documentation: [Oracle Integration Guide](./docs/oracle-integration.md)
- Training: Oracle WebLogic deployment workshops available

---

**Built for Oracle Enterprise Environments** 🏢
*Maximizing Oracle Database and Middleware capabilities for enterprise IWMS*