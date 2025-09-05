package com.harborgrid.turboasset.controller;

import com.harborgrid.turboasset.model.User;
import com.harborgrid.turboasset.service.UserService;
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
 * User management REST controller
 * Provides enterprise user management APIs for Oracle environments
 */
@RestController
@RequestMapping("/api/users")
@Tag(name = "User Management", description = "User management operations")
public class UserController {

    private final UserService userService;

    @Autowired
    public UserController(UserService userService) {
        this.userService = userService;
    }

    /**
     * Create a new user
     */
    @PostMapping
    @PreAuthorize("hasRole('ADMIN') or hasRole('SUPER_ADMIN')")
    @Operation(summary = "Create a new user", description = "Creates a new user in the system")
    public ResponseEntity<User> createUser(@Valid @RequestBody User user) {
        try {
            User createdUser = userService.createUser(user);
            return ResponseEntity.status(HttpStatus.CREATED).body(createdUser);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        }
    }

    /**
     * Update an existing user
     */
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or hasRole('SUPER_ADMIN') or #id == authentication.principal.id")
    @Operation(summary = "Update user", description = "Updates an existing user")
    public ResponseEntity<User> updateUser(
            @Parameter(description = "User ID") @PathVariable UUID id,
            @Valid @RequestBody User user) {
        try {
            Optional<User> existingUser = userService.findById(id);
            if (existingUser.isPresent()) {
                user.setId(id);
                User updatedUser = userService.updateUser(user);
                return ResponseEntity.ok(updatedUser);
            } else {
                return ResponseEntity.notFound().build();
            }
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        }
    }

    /**
     * Get user by ID
     */
    @GetMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or hasRole('SUPER_ADMIN') or #id == authentication.principal.id")
    @Operation(summary = "Get user by ID", description = "Retrieves a user by their ID")
    public ResponseEntity<User> getUserById(@Parameter(description = "User ID") @PathVariable UUID id) {
        Optional<User> user = userService.findById(id);
        return user.map(ResponseEntity::ok).orElse(ResponseEntity.notFound().build());
    }

    /**
     * Get users by organization with pagination
     */
    @GetMapping("/organization/{organizationId}")
    @PreAuthorize("hasRole('ADMIN') or hasRole('SUPER_ADMIN') or hasRole('MANAGER')")
    @Operation(summary = "Get users by organization", description = "Retrieves users for a specific organization")
    public ResponseEntity<Page<User>> getUsersByOrganization(
            @Parameter(description = "Organization ID") @PathVariable UUID organizationId,
            @Parameter(description = "Page number") @RequestParam(defaultValue = "0") int page,
            @Parameter(description = "Page size") @RequestParam(defaultValue = "20") int size,
            @Parameter(description = "Sort by field") @RequestParam(defaultValue = "lastName") String sortBy,
            @Parameter(description = "Sort direction") @RequestParam(defaultValue = "asc") String sortDir) {
        
        Sort sort = Sort.by(Sort.Direction.fromString(sortDir), sortBy);
        Pageable pageable = PageRequest.of(page, size, sort);
        
        Page<User> users = userService.findActiveUsersByOrganization(organizationId, pageable);
        return ResponseEntity.ok(users);
    }

    /**
     * Get users by role
     */
    @GetMapping("/role/{role}")
    @PreAuthorize("hasRole('ADMIN') or hasRole('SUPER_ADMIN')")
    @Operation(summary = "Get users by role", description = "Retrieves users with a specific role")
    public ResponseEntity<List<User>> getUsersByRole(@Parameter(description = "User role") @PathVariable String role) {
        List<User> users = userService.findByRole(role);
        return ResponseEntity.ok(users);
    }

    /**
     * Get users by department
     */
    @GetMapping("/department/{departmentId}")
    @PreAuthorize("hasRole('ADMIN') or hasRole('SUPER_ADMIN') or hasRole('MANAGER')")
    @Operation(summary = "Get users by department", description = "Retrieves users in a specific department")
    public ResponseEntity<List<User>> getUsersByDepartment(@Parameter(description = "Department ID") @PathVariable UUID departmentId) {
        List<User> users = userService.findActiveUsersByDepartment(departmentId);
        return ResponseEntity.ok(users);
    }

    /**
     * Search users by name using Oracle Text Search
     */
    @GetMapping("/search")
    @PreAuthorize("hasRole('ADMIN') or hasRole('SUPER_ADMIN') or hasRole('MANAGER')")
    @Operation(summary = "Search users", description = "Search users by name using Oracle Text Search")
    public ResponseEntity<List<User>> searchUsers(
            @Parameter(description = "Search term") @RequestParam String searchTerm,
            @Parameter(description = "Organization ID") @RequestParam UUID organizationId) {
        List<User> users = userService.searchUsersByName(searchTerm, organizationId);
        return ResponseEntity.ok(users);
    }

    /**
     * Deactivate user
     */
    @PutMapping("/{id}/deactivate")
    @PreAuthorize("hasRole('ADMIN') or hasRole('SUPER_ADMIN')")
    @Operation(summary = "Deactivate user", description = "Deactivates a user account")
    public ResponseEntity<Void> deactivateUser(@Parameter(description = "User ID") @PathVariable UUID id) {
        try {
            userService.deactivateUser(id);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * Activate user
     */
    @PutMapping("/{id}/activate")
    @PreAuthorize("hasRole('ADMIN') or hasRole('SUPER_ADMIN')")
    @Operation(summary = "Activate user", description = "Activates a user account")
    public ResponseEntity<Void> activateUser(@Parameter(description = "User ID") @PathVariable UUID id) {
        try {
            userService.activateUser(id);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * Update user password
     */
    @PutMapping("/{id}/password")
    @PreAuthorize("hasRole('ADMIN') or hasRole('SUPER_ADMIN') or #id == authentication.principal.id")
    @Operation(summary = "Update password", description = "Updates user password")
    public ResponseEntity<Void> updatePassword(
            @Parameter(description = "User ID") @PathVariable UUID id,
            @RequestBody PasswordUpdateRequest request) {
        try {
            userService.updatePassword(id, request.getNewPassword());
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            return ResponseEntity.badRequest().build();
        }
    }

    /**
     * Delete user (soft delete)
     */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or hasRole('SUPER_ADMIN')")
    @Operation(summary = "Delete user", description = "Soft deletes a user (deactivates)")
    public ResponseEntity<Void> deleteUser(@Parameter(description = "User ID") @PathVariable UUID id) {
        try {
            userService.deleteUser(id);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * Get user statistics for organization
     */
    @GetMapping("/organization/{organizationId}/statistics")
    @PreAuthorize("hasRole('ADMIN') or hasRole('SUPER_ADMIN') or hasRole('MANAGER')")
    @Operation(summary = "Get user statistics", description = "Gets user statistics for an organization")
    public ResponseEntity<UserStatistics> getUserStatistics(@Parameter(description = "Organization ID") @PathVariable UUID organizationId) {
        long activeUsers = userService.countActiveUsersByOrganization(organizationId);
        UserStatistics stats = new UserStatistics(activeUsers);
        return ResponseEntity.ok(stats);
    }

    /**
     * Password update request DTO
     */
    public static class PasswordUpdateRequest {
        private String newPassword;

        public String getNewPassword() { return newPassword; }
        public void setNewPassword(String newPassword) { this.newPassword = newPassword; }
    }

    /**
     * User statistics DTO
     */
    public static class UserStatistics {
        private long activeUsers;

        public UserStatistics(long activeUsers) {
            this.activeUsers = activeUsers;
        }

        public long getActiveUsers() { return activeUsers; }
        public void setActiveUsers(long activeUsers) { this.activeUsers = activeUsers; }
    }
}