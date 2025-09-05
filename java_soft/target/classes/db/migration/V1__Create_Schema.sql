-- Oracle Database Schema for Turbo Asset Enterprise Edition
-- Optimized for Oracle Database 19c and above

-- Create organizations table
CREATE TABLE organizations (
    id RAW(16) DEFAULT SYS_GUID() PRIMARY KEY,
    name VARCHAR2(255) NOT NULL,
    description VARCHAR2(1000),
    address JSON,
    default_currency VARCHAR2(3) DEFAULT 'USD' NOT NULL,
    default_language VARCHAR2(10) DEFAULT 'en' NOT NULL,
    default_timezone VARCHAR2(50) DEFAULT 'UTC' NOT NULL,
    is_active NUMBER(1) DEFAULT 1 NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Create organizations indexes
CREATE INDEX idx_org_name ON organizations(name);
CREATE INDEX idx_org_active ON organizations(is_active);

-- Create trigger for updated_at
CREATE OR REPLACE TRIGGER trg_organizations_updated_at
    BEFORE UPDATE ON organizations
    FOR EACH ROW
BEGIN
    :NEW.updated_at := CURRENT_TIMESTAMP;
END;

-- Create departments table
CREATE TABLE departments (
    id RAW(16) DEFAULT SYS_GUID() PRIMARY KEY,
    name VARCHAR2(255) NOT NULL,
    description VARCHAR2(1000),
    organization_id RAW(16),
    is_active NUMBER(1) DEFAULT 1 NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT fk_dept_organization FOREIGN KEY (organization_id) REFERENCES organizations(id)
);

-- Create departments indexes
CREATE INDEX idx_dept_name ON departments(name);
CREATE INDEX idx_dept_organization ON departments(organization_id);
CREATE INDEX idx_dept_active ON departments(is_active);

-- Create trigger for departments updated_at
CREATE OR REPLACE TRIGGER trg_departments_updated_at
    BEFORE UPDATE ON departments
    FOR EACH ROW
BEGIN
    :NEW.updated_at := CURRENT_TIMESTAMP;
END;

-- Create users table
CREATE TABLE users (
    id RAW(16) DEFAULT SYS_GUID() PRIMARY KEY,
    email VARCHAR2(255) NOT NULL UNIQUE,
    username VARCHAR2(100) NOT NULL UNIQUE,
    first_name VARCHAR2(100) NOT NULL,
    last_name VARCHAR2(100) NOT NULL,
    password_hash VARCHAR2(255) NOT NULL,
    role VARCHAR2(20) DEFAULT 'USER' NOT NULL,
    language VARCHAR2(10) DEFAULT 'en' NOT NULL,
    timezone VARCHAR2(50) DEFAULT 'UTC' NOT NULL,
    currency VARCHAR2(3) DEFAULT 'USD' NOT NULL,
    is_active NUMBER(1) DEFAULT 1 NOT NULL,
    last_login_at TIMESTAMP,
    organization_id RAW(16),
    department_id RAW(16),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT fk_user_organization FOREIGN KEY (organization_id) REFERENCES organizations(id),
    CONSTRAINT fk_user_department FOREIGN KEY (department_id) REFERENCES departments(id),
    CONSTRAINT chk_user_role CHECK (role IN ('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'USER', 'READONLY'))
);

-- Create users indexes
CREATE UNIQUE INDEX idx_user_email ON users(email);
CREATE UNIQUE INDEX idx_user_username ON users(username);
CREATE INDEX idx_user_organization ON users(organization_id);
CREATE INDEX idx_user_department ON users(department_id);
CREATE INDEX idx_user_active ON users(is_active);

-- Create Oracle Text index for user search
CREATE INDEX idx_users_text ON users(first_name || ' ' || last_name) 
INDEXTYPE IS CTXSYS.CONTEXT
PARAMETERS ('SYNC (ON COMMIT)');

-- Create trigger for users updated_at
CREATE OR REPLACE TRIGGER trg_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW
BEGIN
    :NEW.updated_at := CURRENT_TIMESTAMP;
END;

-- Create properties table
CREATE TABLE properties (
    id RAW(16) DEFAULT SYS_GUID() PRIMARY KEY,
    name VARCHAR2(255) NOT NULL,
    description VARCHAR2(1000),
    property_type VARCHAR2(20) NOT NULL,
    status VARCHAR2(20) DEFAULT 'ACTIVE' NOT NULL,
    address JSON,
    total_area NUMBER(19,2),
    rentable_area NUMBER(19,2),
    usable_area NUMBER(19,2),
    area_unit VARCHAR2(3) DEFAULT 'SQF',
    year_built NUMBER(4),
    floors_count NUMBER(3),
    acquisition_date TIMESTAMP,
    acquisition_cost NUMBER(19,2),
    current_value NUMBER(19,2),
    organization_id RAW(16),
    is_active NUMBER(1) DEFAULT 1 NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT fk_property_organization FOREIGN KEY (organization_id) REFERENCES organizations(id),
    CONSTRAINT chk_property_type CHECK (property_type IN ('OFFICE', 'WAREHOUSE', 'RETAIL', 'MANUFACTURING', 'MIXED_USE', 'RESIDENTIAL', 'LAND', 'OTHER')),
    CONSTRAINT chk_property_status CHECK (status IN ('ACTIVE', 'INACTIVE', 'UNDER_CONSTRUCTION', 'FOR_SALE', 'SOLD', 'LEASED', 'VACANT'))
);

-- Create properties indexes
CREATE INDEX idx_property_name ON properties(name);
CREATE INDEX idx_property_organization ON properties(organization_id);
CREATE INDEX idx_property_type ON properties(property_type);
CREATE INDEX idx_property_status ON properties(status);

-- Create trigger for properties updated_at
CREATE OR REPLACE TRIGGER trg_properties_updated_at
    BEFORE UPDATE ON properties
    FOR EACH ROW
BEGIN
    :NEW.updated_at := CURRENT_TIMESTAMP;
END;

-- Create buildings table
CREATE TABLE buildings (
    id RAW(16) DEFAULT SYS_GUID() PRIMARY KEY,
    name VARCHAR2(255) NOT NULL,
    property_id RAW(16),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT fk_building_property FOREIGN KEY (property_id) REFERENCES properties(id)
);

-- Create assets table
CREATE TABLE assets (
    id RAW(16) DEFAULT SYS_GUID() PRIMARY KEY,
    asset_tag VARCHAR2(100) NOT NULL UNIQUE,
    name VARCHAR2(255) NOT NULL,
    description VARCHAR2(1000),
    asset_type VARCHAR2(20) NOT NULL,
    status VARCHAR2(20) DEFAULT 'ACTIVE' NOT NULL,
    purchase_price NUMBER(19,2),
    current_value NUMBER(19,2),
    purchase_date TIMESTAMP,
    warranty_expiry_date TIMESTAMP,
    manufacturer VARCHAR2(255),
    model VARCHAR2(255),
    serial_number VARCHAR2(100),
    location VARCHAR2(255),
    organization_id RAW(16),
    property_id RAW(16),
    is_active NUMBER(1) DEFAULT 1 NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT fk_asset_organization FOREIGN KEY (organization_id) REFERENCES organizations(id),
    CONSTRAINT fk_asset_property FOREIGN KEY (property_id) REFERENCES properties(id),
    CONSTRAINT chk_asset_type CHECK (asset_type IN ('FURNITURE', 'EQUIPMENT', 'VEHICLE', 'TECHNOLOGY', 'INFRASTRUCTURE', 'OTHER')),
    CONSTRAINT chk_asset_status CHECK (status IN ('ACTIVE', 'INACTIVE', 'MAINTENANCE', 'DISPOSED', 'LOST'))
);

-- Create assets indexes
CREATE UNIQUE INDEX idx_asset_tag ON assets(asset_tag);
CREATE INDEX idx_asset_organization ON assets(organization_id);
CREATE INDEX idx_asset_property ON assets(property_id);
CREATE INDEX idx_asset_status ON assets(status);
CREATE INDEX idx_asset_type ON assets(asset_type);

-- Create Oracle Text index for asset search
CREATE INDEX idx_assets_text ON assets(name || ' ' || description || ' ' || manufacturer || ' ' || model) 
INDEXTYPE IS CTXSYS.CONTEXT
PARAMETERS ('SYNC (ON COMMIT)');

-- Create trigger for assets updated_at
CREATE OR REPLACE TRIGGER trg_assets_updated_at
    BEFORE UPDATE ON assets
    FOR EACH ROW
BEGIN
    :NEW.updated_at := CURRENT_TIMESTAMP;
END;

-- Create supporting tables
CREATE TABLE workflow_definitions (
    id RAW(16) DEFAULT SYS_GUID() PRIMARY KEY,
    name VARCHAR2(255) NOT NULL,
    organization_id RAW(16),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT fk_workflow_organization FOREIGN KEY (organization_id) REFERENCES organizations(id)
);

CREATE TABLE workflow_instances (
    id RAW(16) DEFAULT SYS_GUID() PRIMARY KEY,
    status VARCHAR2(50),
    user_id RAW(16),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT fk_workflow_user FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE notifications (
    id RAW(16) DEFAULT SYS_GUID() PRIMARY KEY,
    message VARCHAR2(1000),
    user_id RAW(16),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT fk_notification_user FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE documents (
    id RAW(16) DEFAULT SYS_GUID() PRIMARY KEY,
    name VARCHAR2(255),
    created_by RAW(16),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT fk_document_user FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE maintenance_records (
    id RAW(16) DEFAULT SYS_GUID() PRIMARY KEY,
    description VARCHAR2(1000),
    maintenance_date TIMESTAMP,
    asset_id RAW(16),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT fk_maintenance_asset FOREIGN KEY (asset_id) REFERENCES assets(id)
);

-- Create sequences for ID generation (if needed for legacy compatibility)
CREATE SEQUENCE seq_organizations START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE seq_departments START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE seq_users START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE seq_properties START WITH 1 INCREMENT BY 1;
CREATE SEQUENCE seq_assets START WITH 1 INCREMENT BY 1;

-- Create Oracle XML DB repository (if needed for document management)
BEGIN
    DBMS_XDB_ADMIN.createRepository();
EXCEPTION
    WHEN OTHERS THEN
        IF SQLCODE = -31061 THEN
            NULL; -- Repository already exists
        ELSE
            RAISE;
        END IF;
END;
/

-- Create Oracle Application Express workspace (if needed)
-- This would be done through APEX admin interface

-- Grant necessary privileges for Oracle features
GRANT CTXAPP TO turbo_asset;
GRANT EXECUTE ON CTX_DDL TO turbo_asset;
GRANT EXECUTE ON DBMS_JOB TO turbo_asset;
GRANT EXECUTE ON DBMS_SCHEDULER TO turbo_asset;

-- Commit the schema creation
COMMIT;