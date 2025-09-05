package com.harborgrid.turboasset.model;

import jakarta.persistence.*;
import org.hibernate.annotations.UuidGenerator;

import java.time.LocalDateTime;
import java.util.UUID;

// Placeholder entities to satisfy relationships

@Entity
@Table(name = "buildings")
class Building {
    @Id
    @UuidGenerator
    @Column(name = "id", columnDefinition = "RAW(16)")
    private UUID id;
    
    @Column(name = "name")
    private String name;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "property_id")
    private Property property;
    
    // Basic getters and setters
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public Property getProperty() { return property; }
    public void setProperty(Property property) { this.property = property; }
}

@Entity
@Table(name = "workflow_definitions")
class WorkflowDefinition {
    @Id
    @UuidGenerator
    @Column(name = "id", columnDefinition = "RAW(16)")
    private UUID id;
    
    @Column(name = "name")
    private String name;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "organization_id")
    private Organization organization;
    
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public Organization getOrganization() { return organization; }
    public void setOrganization(Organization organization) { this.organization = organization; }
}

@Entity
@Table(name = "workflow_instances")
class WorkflowInstance {
    @Id
    @UuidGenerator
    @Column(name = "id", columnDefinition = "RAW(16)")
    private UUID id;
    
    @Column(name = "status")
    private String status;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;
    
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }
}

@Entity
@Table(name = "notifications")
class Notification {
    @Id
    @UuidGenerator
    @Column(name = "id", columnDefinition = "RAW(16)")
    private UUID id;
    
    @Column(name = "message")
    private String message;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user;
    
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }
}

@Entity
@Table(name = "documents")
class Document {
    @Id
    @UuidGenerator
    @Column(name = "id", columnDefinition = "RAW(16)")
    private UUID id;
    
    @Column(name = "name")
    private String name;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by")
    private User createdBy;
    
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public User getCreatedBy() { return createdBy; }
    public void setCreatedBy(User createdBy) { this.createdBy = createdBy; }
}

@Entity
@Table(name = "maintenance_records")
class MaintenanceRecord {
    @Id
    @UuidGenerator
    @Column(name = "id", columnDefinition = "RAW(16)")
    private UUID id;
    
    @Column(name = "description")
    private String description;
    
    @Column(name = "maintenance_date")
    private LocalDateTime maintenanceDate;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "asset_id")
    private Asset asset;
    
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public LocalDateTime getMaintenanceDate() { return maintenanceDate; }
    public void setMaintenanceDate(LocalDateTime maintenanceDate) { this.maintenanceDate = maintenanceDate; }
    public Asset getAsset() { return asset; }
    public void setAsset(Asset asset) { this.asset = asset; }
}