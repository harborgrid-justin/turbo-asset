package com.harborgrid.turboasset.model;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.annotations.UuidGenerator;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

/**
 * Asset entity representing physical assets in the system
 * Optimized for Oracle Database with proper indexing
 */
@Entity
@Table(name = "assets", indexes = {
    @Index(name = "idx_asset_tag", columnList = "asset_tag", unique = true),
    @Index(name = "idx_asset_organization", columnList = "organization_id"),
    @Index(name = "idx_asset_property", columnList = "property_id"),
    @Index(name = "idx_asset_status", columnList = "status"),
    @Index(name = "idx_asset_type", columnList = "asset_type")
})
public class Asset {
    
    @Id
    @UuidGenerator
    @Column(name = "id", columnDefinition = "RAW(16)")
    private UUID id;
    
    @NotBlank
    @Size(max = 100)
    @Column(name = "asset_tag", nullable = false, unique = true)
    private String assetTag;
    
    @NotBlank
    @Size(max = 255)
    @Column(name = "name", nullable = false)
    private String name;
    
    @Size(max = 1000)
    @Column(name = "description")
    private String description;
    
    @Enumerated(EnumType.STRING)
    @Column(name = "asset_type", nullable = false)
    private AssetType assetType;
    
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private AssetStatus status = AssetStatus.ACTIVE;
    
    @Column(name = "purchase_price", precision = 19, scale = 2)
    private BigDecimal purchasePrice;
    
    @Column(name = "current_value", precision = 19, scale = 2)
    private BigDecimal currentValue;
    
    @Column(name = "purchase_date")
    private LocalDateTime purchaseDate;
    
    @Column(name = "warranty_expiry_date")
    private LocalDateTime warrantyExpiryDate;
    
    @Size(max = 255)
    @Column(name = "manufacturer")
    private String manufacturer;
    
    @Size(max = 255)
    @Column(name = "model")
    private String model;
    
    @Size(max = 100)
    @Column(name = "serial_number")
    private String serialNumber;
    
    @Size(max = 255)
    @Column(name = "location")
    private String location;
    
    @Column(name = "is_active", nullable = false)
    private Boolean isActive = true;
    
    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
    
    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
    
    // Relationships
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "organization_id")
    private Organization organization;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "property_id")
    private Property property;
    
    @OneToMany(mappedBy = "asset", cascade = CascadeType.ALL, orphanRemoval = true)
    private Set<MaintenanceRecord> maintenanceRecords = new HashSet<>();
    
    // Constructors
    public Asset() {}
    
    public Asset(String assetTag, String name, AssetType assetType) {
        this.assetTag = assetTag;
        this.name = name;
        this.assetType = assetType;
    }
    
    // Getters and Setters
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    
    public String getAssetTag() { return assetTag; }
    public void setAssetTag(String assetTag) { this.assetTag = assetTag; }
    
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    
    public AssetType getAssetType() { return assetType; }
    public void setAssetType(AssetType assetType) { this.assetType = assetType; }
    
    public AssetStatus getStatus() { return status; }
    public void setStatus(AssetStatus status) { this.status = status; }
    
    public BigDecimal getPurchasePrice() { return purchasePrice; }
    public void setPurchasePrice(BigDecimal purchasePrice) { this.purchasePrice = purchasePrice; }
    
    public BigDecimal getCurrentValue() { return currentValue; }
    public void setCurrentValue(BigDecimal currentValue) { this.currentValue = currentValue; }
    
    public LocalDateTime getPurchaseDate() { return purchaseDate; }
    public void setPurchaseDate(LocalDateTime purchaseDate) { this.purchaseDate = purchaseDate; }
    
    public LocalDateTime getWarrantyExpiryDate() { return warrantyExpiryDate; }
    public void setWarrantyExpiryDate(LocalDateTime warrantyExpiryDate) { this.warrantyExpiryDate = warrantyExpiryDate; }
    
    public String getManufacturer() { return manufacturer; }
    public void setManufacturer(String manufacturer) { this.manufacturer = manufacturer; }
    
    public String getModel() { return model; }
    public void setModel(String model) { this.model = model; }
    
    public String getSerialNumber() { return serialNumber; }
    public void setSerialNumber(String serialNumber) { this.serialNumber = serialNumber; }
    
    public String getLocation() { return location; }
    public void setLocation(String location) { this.location = location; }
    
    public Boolean getIsActive() { return isActive; }
    public void setIsActive(Boolean isActive) { this.isActive = isActive; }
    
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
    
    public Organization getOrganization() { return organization; }
    public void setOrganization(Organization organization) { this.organization = organization; }
    
    public Property getProperty() { return property; }
    public void setProperty(Property property) { this.property = property; }
    
    public Set<MaintenanceRecord> getMaintenanceRecords() { return maintenanceRecords; }
    public void setMaintenanceRecords(Set<MaintenanceRecord> maintenanceRecords) { this.maintenanceRecords = maintenanceRecords; }
    
    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof Asset)) return false;
        Asset asset = (Asset) o;
        return id != null && id.equals(asset.getId());
    }
    
    @Override
    public int hashCode() {
        return getClass().hashCode();
    }
}

/**
 * Asset type enumeration
 */
enum AssetType {
    FURNITURE,
    EQUIPMENT,
    VEHICLE,
    TECHNOLOGY,
    INFRASTRUCTURE,
    OTHER
}

/**
 * Asset status enumeration
 */
enum AssetStatus {
    ACTIVE,
    INACTIVE,
    MAINTENANCE,
    DISPOSED,
    LOST
}