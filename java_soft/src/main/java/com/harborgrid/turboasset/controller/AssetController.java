package com.harborgrid.turboasset.controller;

import com.harborgrid.turboasset.model.Asset;
import com.harborgrid.turboasset.service.AssetService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import jakarta.validation.Valid;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * Asset management REST controller
 * Provides enterprise asset management APIs for Oracle environments
 */
@RestController
@RequestMapping("/api/assets")
@Tag(name = "Asset Management", description = "Asset management operations")
public class AssetController {

    private final AssetService assetService;

    @Autowired
    public AssetController(AssetService assetService) {
        this.assetService = assetService;
    }

    /**
     * Create a new asset
     */
    @PostMapping
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    @Operation(summary = "Create a new asset", description = "Creates a new asset in the system")
    public ResponseEntity<Asset> createAsset(@Valid @RequestBody Asset asset) {
        try {
            Asset createdAsset = assetService.createAsset(asset);
            return ResponseEntity.status(HttpStatus.CREATED).body(createdAsset);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        }
    }

    /**
     * Update an existing asset
     */
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    @Operation(summary = "Update asset", description = "Updates an existing asset")
    public ResponseEntity<Asset> updateAsset(
            @Parameter(description = "Asset ID") @PathVariable UUID id,
            @Valid @RequestBody Asset asset) {
        try {
            Optional<Asset> existingAsset = assetService.findById(id);
            if (existingAsset.isPresent()) {
                asset.setId(id);
                Asset updatedAsset = assetService.updateAsset(asset);
                return ResponseEntity.ok(updatedAsset);
            } else {
                return ResponseEntity.notFound().build();
            }
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        }
    }

    /**
     * Get asset by ID
     */
    @GetMapping("/{id}")
    @PreAuthorize("hasRole('USER')")
    @Operation(summary = "Get asset by ID", description = "Retrieves an asset by its ID")
    public ResponseEntity<Asset> getAssetById(@Parameter(description = "Asset ID") @PathVariable UUID id) {
        Optional<Asset> asset = assetService.findById(id);
        return asset.map(ResponseEntity::ok).orElse(ResponseEntity.notFound().build());
    }

    /**
     * Get asset by asset tag
     */
    @GetMapping("/tag/{assetTag}")
    @PreAuthorize("hasRole('USER')")
    @Operation(summary = "Get asset by tag", description = "Retrieves an asset by its asset tag")
    public ResponseEntity<Asset> getAssetByTag(@Parameter(description = "Asset tag") @PathVariable String assetTag) {
        Optional<Asset> asset = assetService.findByAssetTag(assetTag);
        return asset.map(ResponseEntity::ok).orElse(ResponseEntity.notFound().build());
    }

    /**
     * Get assets by organization with pagination
     */
    @GetMapping("/organization/{organizationId}")
    @PreAuthorize("hasRole('USER')")
    @Operation(summary = "Get assets by organization", description = "Retrieves assets for a specific organization")
    public ResponseEntity<Page<Asset>> getAssetsByOrganization(
            @Parameter(description = "Organization ID") @PathVariable UUID organizationId,
            @Parameter(description = "Page number") @RequestParam(defaultValue = "0") int page,
            @Parameter(description = "Page size") @RequestParam(defaultValue = "20") int size,
            @Parameter(description = "Sort by field") @RequestParam(defaultValue = "name") String sortBy,
            @Parameter(description = "Sort direction") @RequestParam(defaultValue = "asc") String sortDir) {
        
        Sort sort = Sort.by(Sort.Direction.fromString(sortDir), sortBy);
        Pageable pageable = PageRequest.of(page, size, sort);
        
        Page<Asset> assets = assetService.findActiveAssetsByOrganization(organizationId, pageable);
        return ResponseEntity.ok(assets);
    }

    /**
     * Get assets by type and organization
     */
    @GetMapping("/organization/{organizationId}/type/{assetType}")
    @PreAuthorize("hasRole('USER')")
    @Operation(summary = "Get assets by type", description = "Retrieves assets of a specific type for an organization")
    public ResponseEntity<List<Asset>> getAssetsByTypeAndOrganization(
            @Parameter(description = "Organization ID") @PathVariable UUID organizationId,
            @Parameter(description = "Asset type") @PathVariable String assetType) {
        List<Asset> assets = assetService.findByAssetTypeAndOrganization(assetType, organizationId);
        return ResponseEntity.ok(assets);
    }

    /**
     * Get assets by property
     */
    @GetMapping("/property/{propertyId}")
    @PreAuthorize("hasRole('USER')")
    @Operation(summary = "Get assets by property", description = "Retrieves assets for a specific property")
    public ResponseEntity<List<Asset>> getAssetsByProperty(@Parameter(description = "Property ID") @PathVariable UUID propertyId) {
        List<Asset> assets = assetService.findActiveAssetsByProperty(propertyId);
        return ResponseEntity.ok(assets);
    }

    /**
     * Search assets using Oracle Text Search
     */
    @GetMapping("/search")
    @PreAuthorize("hasRole('USER')")
    @Operation(summary = "Search assets", description = "Search assets using Oracle Text Search")
    public ResponseEntity<List<Asset>> searchAssets(
            @Parameter(description = "Search term") @RequestParam String searchTerm,
            @Parameter(description = "Organization ID") @RequestParam UUID organizationId) {
        List<Asset> assets = assetService.searchAssets(searchTerm, organizationId);
        return ResponseEntity.ok(assets);
    }

    /**
     * Find assets within geographical radius using Oracle Spatial
     */
    @GetMapping("/location")
    @PreAuthorize("hasRole('USER')")
    @Operation(summary = "Find assets by location", description = "Find assets within geographical radius using Oracle Spatial")
    public ResponseEntity<List<Asset>> getAssetsWithinRadius(
            @Parameter(description = "Latitude") @RequestParam double latitude,
            @Parameter(description = "Longitude") @RequestParam double longitude,
            @Parameter(description = "Radius in kilometers") @RequestParam double radiusKm,
            @Parameter(description = "Organization ID") @RequestParam UUID organizationId) {
        List<Asset> assets = assetService.findAssetsWithinRadius(latitude, longitude, radiusKm, organizationId);
        return ResponseEntity.ok(assets);
    }

    /**
     * Get assets with warranty expiring soon
     */
    @GetMapping("/warranty-expiring")
    @PreAuthorize("hasRole('USER')")
    @Operation(summary = "Get assets with expiring warranty", description = "Get assets with warranty expiring within specified days")
    public ResponseEntity<List<Asset>> getAssetsWithWarrantyExpiringSoon(
            @Parameter(description = "Days ahead to check") @RequestParam(defaultValue = "30") int daysAhead) {
        List<Asset> assets = assetService.findAssetsWithWarrantyExpiringSoon(daysAhead);
        return ResponseEntity.ok(assets);
    }

    /**
     * Get assets requiring maintenance
     */
    @GetMapping("/maintenance-required/{organizationId}")
    @PreAuthorize("hasRole('USER')")
    @Operation(summary = "Get assets requiring maintenance", description = "Get assets that require maintenance")
    public ResponseEntity<List<Asset>> getAssetsRequiringMaintenance(@Parameter(description = "Organization ID") @PathVariable UUID organizationId) {
        List<Asset> assets = assetService.findAssetsRequiringMaintenance(organizationId);
        return ResponseEntity.ok(assets);
    }

    /**
     * Update asset status
     */
    @PutMapping("/{id}/status")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    @Operation(summary = "Update asset status", description = "Updates the status of an asset")
    public ResponseEntity<Void> updateAssetStatus(
            @Parameter(description = "Asset ID") @PathVariable UUID id,
            @RequestBody StatusUpdateRequest request) {
        try {
            assetService.updateAssetStatus(id, request.getStatus());
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    /**
     * Deactivate asset
     */
    @PutMapping("/{id}/deactivate")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    @Operation(summary = "Deactivate asset", description = "Deactivates an asset")
    public ResponseEntity<Void> deactivateAsset(@Parameter(description = "Asset ID") @PathVariable UUID id) {
        try {
            assetService.deactivateAsset(id);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * Activate asset
     */
    @PutMapping("/{id}/activate")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    @Operation(summary = "Activate asset", description = "Activates an asset")
    public ResponseEntity<Void> activateAsset(@Parameter(description = "Asset ID") @PathVariable UUID id) {
        try {
            assetService.activateAsset(id);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * Delete asset (soft delete)
     */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or hasRole('MANAGER')")
    @Operation(summary = "Delete asset", description = "Soft deletes an asset (deactivates)")
    public ResponseEntity<Void> deleteAsset(@Parameter(description = "Asset ID") @PathVariable UUID id) {
        try {
            assetService.deleteAsset(id);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * Get asset statistics for organization
     */
    @GetMapping("/organization/{organizationId}/statistics")
    @PreAuthorize("hasRole('USER')")
    @Operation(summary = "Get asset statistics", description = "Gets asset statistics for an organization")
    public ResponseEntity<AssetService.AssetStatistics> getAssetStatistics(@Parameter(description = "Organization ID") @PathVariable UUID organizationId) {
        AssetService.AssetStatistics stats = assetService.getAssetStatistics(organizationId);
        return ResponseEntity.ok(stats);
    }

    /**
     * Status update request DTO
     */
    public static class StatusUpdateRequest {
        private String status;

        public String getStatus() { return status; }
        public void setStatus(String status) { this.status = status; }
    }
}