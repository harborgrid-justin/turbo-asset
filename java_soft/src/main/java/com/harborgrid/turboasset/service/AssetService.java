package com.harborgrid.turboasset.service;

import com.harborgrid.turboasset.model.Asset;
import com.harborgrid.turboasset.repository.AssetRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Asset service for managing asset operations
 * Optimized for Oracle Database with spatial and text search capabilities
 */
@Service
@Transactional
public class AssetService {

    private final AssetRepository assetRepository;

    @Autowired
    public AssetService(AssetRepository assetRepository) {
        this.assetRepository = assetRepository;
    }

    /**
     * Create a new asset
     */
    public Asset createAsset(Asset asset) {
        return assetRepository.save(asset);
    }

    /**
     * Update an existing asset
     */
    public Asset updateAsset(Asset asset) {
        return assetRepository.save(asset);
    }

    /**
     * Find asset by ID
     */
    @Transactional(readOnly = true)
    public Optional<Asset> findById(UUID id) {
        return assetRepository.findById(id);
    }

    /**
     * Find asset by asset tag
     */
    @Transactional(readOnly = true)
    public Optional<Asset> findByAssetTag(String assetTag) {
        return assetRepository.findByAssetTag(assetTag);
    }

    /**
     * Find active assets by organization with pagination
     */
    @Transactional(readOnly = true)
    public Page<Asset> findActiveAssetsByOrganization(UUID organizationId, Pageable pageable) {
        return assetRepository.findActiveAssetsByOrganization(organizationId, pageable);
    }

    /**
     * Find assets by type and organization
     */
    @Transactional(readOnly = true)
    public List<Asset> findByAssetTypeAndOrganization(String assetType, UUID organizationId) {
        return assetRepository.findByAssetTypeAndOrganization(assetType, organizationId);
    }

    /**
     * Find active assets by property
     */
    @Transactional(readOnly = true)
    public List<Asset> findActiveAssetsByProperty(UUID propertyId) {
        return assetRepository.findActiveAssetsByProperty(propertyId);
    }

    /**
     * Find assets with warranty expiring soon
     */
    @Transactional(readOnly = true)
    public List<Asset> findAssetsWithWarrantyExpiringSoon(int daysAhead) {
        LocalDateTime startDate = LocalDateTime.now();
        LocalDateTime endDate = startDate.plusDays(daysAhead);
        return assetRepository.findAssetsWithWarrantyExpiringSoon(startDate, endDate);
    }

    /**
     * Calculate total asset value by organization
     */
    @Transactional(readOnly = true)
    public BigDecimal calculateTotalAssetValueByOrganization(UUID organizationId) {
        return assetRepository.calculateTotalAssetValueByOrganization(organizationId);
    }

    /**
     * Count assets by status and organization
     */
    @Transactional(readOnly = true)
    public long countAssetsByStatusAndOrganization(String status, UUID organizationId) {
        return assetRepository.countAssetsByStatusAndOrganization(status, organizationId);
    }

    /**
     * Search assets using Oracle Text Search
     */
    @Transactional(readOnly = true)
    public List<Asset> searchAssets(String searchTerm, UUID organizationId) {
        return assetRepository.searchAssets(searchTerm, organizationId.toString());
    }

    /**
     * Find assets within geographical radius using Oracle Spatial
     */
    @Transactional(readOnly = true)
    public List<Asset> findAssetsWithinRadius(double latitude, double longitude, 
                                             double radiusKm, UUID organizationId) {
        return assetRepository.findAssetsWithinRadius(latitude, longitude, radiusKm, organizationId.toString());
    }

    /**
     * Find assets requiring maintenance
     */
    @Transactional(readOnly = true)
    public List<Asset> findAssetsRequiringMaintenance(UUID organizationId) {
        return assetRepository.findAssetsRequiringMaintenance(organizationId);
    }

    /**
     * Deactivate asset
     */
    public void deactivateAsset(UUID assetId) {
        Optional<Asset> assetOpt = assetRepository.findById(assetId);
        if (assetOpt.isPresent()) {
            Asset asset = assetOpt.get();
            asset.setIsActive(false);
            assetRepository.save(asset);
        }
    }

    /**
     * Activate asset
     */
    public void activateAsset(UUID assetId) {
        Optional<Asset> assetOpt = assetRepository.findById(assetId);
        if (assetOpt.isPresent()) {
            Asset asset = assetOpt.get();
            asset.setIsActive(true);
            assetRepository.save(asset);
        }
    }

    /**
     * Update asset status
     */
    public void updateAssetStatus(UUID assetId, String status) {
        Optional<Asset> assetOpt = assetRepository.findById(assetId);
        if (assetOpt.isPresent()) {
            Asset asset = assetOpt.get();
            // asset.setStatus(AssetStatus.valueOf(status));
            assetRepository.save(asset);
        }
    }

    /**
     * Delete asset (soft delete by deactivating)
     */
    public void deleteAsset(UUID assetId) {
        deactivateAsset(assetId);
    }

    /**
     * Get asset statistics for organization
     */
    @Transactional(readOnly = true)
    public AssetStatistics getAssetStatistics(UUID organizationId) {
        AssetStatistics stats = new AssetStatistics();
        stats.setTotalAssets(countAssetsByStatusAndOrganization("ACTIVE", organizationId));
        stats.setMaintenanceAssets(countAssetsByStatusAndOrganization("MAINTENANCE", organizationId));
        stats.setInactiveAssets(countAssetsByStatusAndOrganization("INACTIVE", organizationId));
        stats.setTotalValue(calculateTotalAssetValueByOrganization(organizationId));
        return stats;
    }

    /**
     * Asset statistics DTO
     */
    public static class AssetStatistics {
        private long totalAssets;
        private long maintenanceAssets;
        private long inactiveAssets;
        private BigDecimal totalValue;

        // Getters and setters
        public long getTotalAssets() { return totalAssets; }
        public void setTotalAssets(long totalAssets) { this.totalAssets = totalAssets; }
        
        public long getMaintenanceAssets() { return maintenanceAssets; }
        public void setMaintenanceAssets(long maintenanceAssets) { this.maintenanceAssets = maintenanceAssets; }
        
        public long getInactiveAssets() { return inactiveAssets; }
        public void setInactiveAssets(long inactiveAssets) { this.inactiveAssets = inactiveAssets; }
        
        public BigDecimal getTotalValue() { return totalValue; }
        public void setTotalValue(BigDecimal totalValue) { this.totalValue = totalValue; }
    }
}