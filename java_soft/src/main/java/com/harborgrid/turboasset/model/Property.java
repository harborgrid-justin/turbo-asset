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
 * Property entity representing real estate properties
 * Optimized for Oracle Database with spatial support
 */
@Entity
@Table(name = "properties", indexes = {
    @Index(name = "idx_property_name", columnList = "name"),
    @Index(name = "idx_property_organization", columnList = "organization_id"),
    @Index(name = "idx_property_type", columnList = "property_type"),
    @Index(name = "idx_property_status", columnList = "status")
})
public class Property {
    
    @Id
    @UuidGenerator
    @Column(name = "id", columnDefinition = "RAW(16)")
    private UUID id;
    
    @NotBlank
    @Size(max = 255)
    @Column(name = "name", nullable = false)
    private String name;
    
    @Size(max = 1000)
    @Column(name = "description")
    private String description;
    
    @Enumerated(EnumType.STRING)
    @Column(name = "property_type", nullable = false)
    private PropertyType propertyType;
    
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private PropertyStatus status = PropertyStatus.ACTIVE;
    
    // Using Oracle JSON for flexible address structure
    @Column(name = "address", columnDefinition = "JSON")
    private String address;
    
    @Column(name = "total_area", precision = 19, scale = 2)
    private BigDecimal totalArea;
    
    @Column(name = "rentable_area", precision = 19, scale = 2)
    private BigDecimal rentableArea;
    
    @Column(name = "usable_area", precision = 19, scale = 2)
    private BigDecimal usableArea;
    
    @Size(max = 3)
    @Column(name = "area_unit")
    private String areaUnit = "SQF";
    
    @Column(name = "year_built")
    private Integer yearBuilt;
    
    @Column(name = "floors_count")
    private Integer floorsCount;
    
    @Column(name = "acquisition_date")
    private LocalDateTime acquisitionDate;
    
    @Column(name = "acquisition_cost", precision = 19, scale = 2)
    private BigDecimal acquisitionCost;
    
    @Column(name = "current_value", precision = 19, scale = 2)
    private BigDecimal currentValue;
    
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
    
    @OneToMany(mappedBy = "property", cascade = CascadeType.ALL, orphanRemoval = true)
    private Set<Building> buildings = new HashSet<>();
    
    @OneToMany(mappedBy = "property", cascade = CascadeType.ALL)
    private Set<Asset> assets = new HashSet<>();
    
    // Constructors
    public Property() {}
    
    public Property(String name, PropertyType propertyType) {
        this.name = name;
        this.propertyType = propertyType;
    }
    
    // Getters and Setters
    public UUID getId() { return id; }
    public void setId(UUID id) { this.id = id; }
    
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    
    public PropertyType getPropertyType() { return propertyType; }
    public void setPropertyType(PropertyType propertyType) { this.propertyType = propertyType; }
    
    public PropertyStatus getStatus() { return status; }
    public void setStatus(PropertyStatus status) { this.status = status; }
    
    public String getAddress() { return address; }
    public void setAddress(String address) { this.address = address; }
    
    public BigDecimal getTotalArea() { return totalArea; }
    public void setTotalArea(BigDecimal totalArea) { this.totalArea = totalArea; }
    
    public BigDecimal getRentableArea() { return rentableArea; }
    public void setRentableArea(BigDecimal rentableArea) { this.rentableArea = rentableArea; }
    
    public BigDecimal getUsableArea() { return usableArea; }
    public void setUsableArea(BigDecimal usableArea) { this.usableArea = usableArea; }
    
    public String getAreaUnit() { return areaUnit; }
    public void setAreaUnit(String areaUnit) { this.areaUnit = areaUnit; }
    
    public Integer getYearBuilt() { return yearBuilt; }
    public void setYearBuilt(Integer yearBuilt) { this.yearBuilt = yearBuilt; }
    
    public Integer getFloorsCount() { return floorsCount; }
    public void setFloorsCount(Integer floorsCount) { this.floorsCount = floorsCount; }
    
    public LocalDateTime getAcquisitionDate() { return acquisitionDate; }
    public void setAcquisitionDate(LocalDateTime acquisitionDate) { this.acquisitionDate = acquisitionDate; }
    
    public BigDecimal getAcquisitionCost() { return acquisitionCost; }
    public void setAcquisitionCost(BigDecimal acquisitionCost) { this.acquisitionCost = acquisitionCost; }
    
    public BigDecimal getCurrentValue() { return currentValue; }
    public void setCurrentValue(BigDecimal currentValue) { this.currentValue = currentValue; }
    
    public Boolean getIsActive() { return isActive; }
    public void setIsActive(Boolean isActive) { this.isActive = isActive; }
    
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
    
    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
    
    public Organization getOrganization() { return organization; }
    public void setOrganization(Organization organization) { this.organization = organization; }
    
    public Set<Building> getBuildings() { return buildings; }
    public void setBuildings(Set<Building> buildings) { this.buildings = buildings; }
    
    public Set<Asset> getAssets() { return assets; }
    public void setAssets(Set<Asset> assets) { this.assets = assets; }
    
    @Override
    public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof Property)) return false;
        Property property = (Property) o;
        return id != null && id.equals(property.getId());
    }
    
    @Override
    public int hashCode() {
        return getClass().hashCode();
    }
}

/**
 * Property type enumeration
 */
enum PropertyType {
    OFFICE,
    WAREHOUSE,
    RETAIL,
    MANUFACTURING,
    MIXED_USE,
    RESIDENTIAL,
    LAND,
    OTHER
}

/**
 * Property status enumeration
 */
enum PropertyStatus {
    ACTIVE,
    INACTIVE,
    UNDER_CONSTRUCTION,
    FOR_SALE,
    SOLD,
    LEASED,
    VACANT
}