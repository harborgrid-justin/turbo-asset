package com.harborgrid.turboasset.repository;

import com.harborgrid.turboasset.model.Asset;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Asset repository with Oracle-optimized queries
 */
@Repository
public interface AssetRepository extends JpaRepository<Asset, UUID> {
    
    /**
     * Find asset by asset tag
     */
    Optional<Asset> findByAssetTag(String assetTag);
    
    /**
     * Find active assets by organization
     */
    @Query("SELECT a FROM Asset a WHERE a.organization.id = :organizationId AND a.isActive = true")
    Page<Asset> findActiveAssetsByOrganization(@Param("organizationId") UUID organizationId, Pageable pageable);
    
    /**
     * Find assets by type and organization
     */
    @Query("SELECT a FROM Asset a WHERE a.assetType = :assetType AND a.organization.id = :organizationId AND a.isActive = true")
    List<Asset> findByAssetTypeAndOrganization(@Param("assetType") String assetType, 
                                              @Param("organizationId") UUID organizationId);
    
    /**
     * Find assets by property
     */
    @Query("SELECT a FROM Asset a WHERE a.property.id = :propertyId AND a.isActive = true")
    List<Asset> findActiveAssetsByProperty(@Param("propertyId") UUID propertyId);
    
    /**
     * Find assets with warranty expiring soon
     */
    @Query("SELECT a FROM Asset a WHERE a.warrantyExpiryDate BETWEEN :startDate AND :endDate AND a.isActive = true")
    List<Asset> findAssetsWithWarrantyExpiringSoon(@Param("startDate") LocalDateTime startDate, 
                                                   @Param("endDate") LocalDateTime endDate);
    
    /**
     * Calculate total asset value by organization
     */
    @Query("SELECT COALESCE(SUM(a.currentValue), 0) FROM Asset a WHERE a.organization.id = :organizationId AND a.isActive = true")
    BigDecimal calculateTotalAssetValueByOrganization(@Param("organizationId") UUID organizationId);
    
    /**
     * Count assets by status and organization
     */
    @Query("SELECT COUNT(a) FROM Asset a WHERE a.status = :status AND a.organization.id = :organizationId")
    long countAssetsByStatusAndOrganization(@Param("status") String status, 
                                           @Param("organizationId") UUID organizationId);
    
    /**
     * Oracle spatial query to find assets within radius
     */
    @Query(value = "SELECT * FROM assets a WHERE " +
           "SDO_WITHIN_DISTANCE(a.location_geom, " +
           "SDO_GEOMETRY(2001, 4326, SDO_POINT_TYPE(:longitude, :latitude, NULL), NULL, NULL), " +
           "'distance=' || :radiusKm || ' unit=KM') = 'TRUE' " +
           "AND a.organization_id = :organizationId " +
           "AND a.is_active = 1", 
           nativeQuery = true)
    List<Asset> findAssetsWithinRadius(@Param("latitude") double latitude, 
                                      @Param("longitude") double longitude,
                                      @Param("radiusKm") double radiusKm,
                                      @Param("organizationId") String organizationId);
    
    /**
     * Oracle text search for assets
     */
    @Query(value = "SELECT * FROM assets a WHERE " +
           "CONTAINS(a.name || ' ' || a.description || ' ' || a.manufacturer || ' ' || a.model, :searchTerm) > 0 " +
           "AND a.organization_id = :organizationId " +
           "AND a.is_active = 1", 
           nativeQuery = true)
    List<Asset> searchAssets(@Param("searchTerm") String searchTerm, 
                            @Param("organizationId") String organizationId);
    
    /**
     * Find assets requiring maintenance
     */
    @Query("SELECT a FROM Asset a WHERE a.status = 'MAINTENANCE' AND a.organization.id = :organizationId")
    List<Asset> findAssetsRequiringMaintenance(@Param("organizationId") UUID organizationId);
}