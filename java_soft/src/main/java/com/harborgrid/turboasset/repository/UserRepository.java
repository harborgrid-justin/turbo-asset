package com.harborgrid.turboasset.repository;

import com.harborgrid.turboasset.model.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * User repository with Oracle-optimized queries
 */
@Repository
public interface UserRepository extends JpaRepository<User, UUID> {
    
    /**
     * Find user by email
     */
    Optional<User> findByEmail(String email);
    
    /**
     * Find user by username
     */
    Optional<User> findByUsername(String username);
    
    /**
     * Find user by email or username
     */
    @Query("SELECT u FROM User u WHERE u.email = :identifier OR u.username = :identifier")
    Optional<User> findByEmailOrUsername(@Param("identifier") String identifier);
    
    /**
     * Find active users by organization
     */
    @Query("SELECT u FROM User u WHERE u.organization.id = :organizationId AND u.isActive = true")
    Page<User> findActiveUsersByOrganization(@Param("organizationId") UUID organizationId, Pageable pageable);
    
    /**
     * Find users by role
     */
    List<User> findByRole(String role);
    
    /**
     * Find users by department
     */
    @Query("SELECT u FROM User u WHERE u.department.id = :departmentId AND u.isActive = true")
    List<User> findActiveUsersByDepartment(@Param("departmentId") UUID departmentId);
    
    /**
     * Count active users by organization
     */
    @Query("SELECT COUNT(u) FROM User u WHERE u.organization.id = :organizationId AND u.isActive = true")
    long countActiveUsersByOrganization(@Param("organizationId") UUID organizationId);
    
    /**
     * Find users who haven't logged in since specified date
     */
    @Query("SELECT u FROM User u WHERE u.lastLoginAt < :date OR u.lastLoginAt IS NULL")
    List<User> findUsersNotLoggedInSince(@Param("date") LocalDateTime date);
    
    /**
     * Oracle-specific query for full-text search on user names
     */
    @Query(value = "SELECT * FROM users u WHERE " +
           "CONTAINS(u.first_name || ' ' || u.last_name, :searchTerm) > 0 " +
           "AND u.organization_id = :organizationId " +
           "AND u.is_active = 1", 
           nativeQuery = true)
    List<User> searchUsersByName(@Param("searchTerm") String searchTerm, 
                                @Param("organizationId") String organizationId);
    
    /**
     * Update last login timestamp
     */
    @Query("UPDATE User u SET u.lastLoginAt = :loginTime WHERE u.id = :userId")
    void updateLastLoginTime(@Param("userId") UUID userId, @Param("loginTime") LocalDateTime loginTime);
}