package com.harborgrid.turboasset.service;

import com.harborgrid.turboasset.model.User;
import com.harborgrid.turboasset.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

/**
 * User service for managing user operations
 * Optimized for Oracle Database transactions
 */
@Service
@Transactional
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Autowired
    public UserService(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    /**
     * Create a new user
     */
    public User createUser(User user) {
        // Encode password before saving
        user.setPasswordHash(passwordEncoder.encode(user.getPasswordHash()));
        return userRepository.save(user);
    }

    /**
     * Update an existing user
     */
    public User updateUser(User user) {
        return userRepository.save(user);
    }

    /**
     * Find user by ID
     */
    @Transactional(readOnly = true)
    public Optional<User> findById(UUID id) {
        return userRepository.findById(id);
    }

    /**
     * Find user by email
     */
    @Transactional(readOnly = true)
    public Optional<User> findByEmail(String email) {
        return userRepository.findByEmail(email);
    }

    /**
     * Find user by username
     */
    @Transactional(readOnly = true)
    public Optional<User> findByUsername(String username) {
        return userRepository.findByUsername(username);
    }

    /**
     * Find user by email or username
     */
    @Transactional(readOnly = true)
    public Optional<User> findByEmailOrUsername(String identifier) {
        return userRepository.findByEmailOrUsername(identifier);
    }

    /**
     * Find active users by organization with pagination
     */
    @Transactional(readOnly = true)
    public Page<User> findActiveUsersByOrganization(UUID organizationId, Pageable pageable) {
        return userRepository.findActiveUsersByOrganization(organizationId, pageable);
    }

    /**
     * Find users by role
     */
    @Transactional(readOnly = true)
    public List<User> findByRole(String role) {
        return userRepository.findByRole(role);
    }

    /**
     * Find active users by department
     */
    @Transactional(readOnly = true)
    public List<User> findActiveUsersByDepartment(UUID departmentId) {
        return userRepository.findActiveUsersByDepartment(departmentId);
    }

    /**
     * Count active users by organization
     */
    @Transactional(readOnly = true)
    public long countActiveUsersByOrganization(UUID organizationId) {
        return userRepository.countActiveUsersByOrganization(organizationId);
    }

    /**
     * Authenticate user
     */
    @Transactional(readOnly = true)
    public boolean authenticateUser(String identifier, String password) {
        Optional<User> userOpt = findByEmailOrUsername(identifier);
        if (userOpt.isPresent()) {
            User user = userOpt.get();
            return user.getIsActive() && passwordEncoder.matches(password, user.getPasswordHash());
        }
        return false;
    }

    /**
     * Update user password
     */
    public void updatePassword(UUID userId, String newPassword) {
        Optional<User> userOpt = userRepository.findById(userId);
        if (userOpt.isPresent()) {
            User user = userOpt.get();
            user.setPasswordHash(passwordEncoder.encode(newPassword));
            userRepository.save(user);
        }
    }

    /**
     * Update last login time
     */
    public void updateLastLoginTime(UUID userId) {
        userRepository.updateLastLoginTime(userId, LocalDateTime.now());
    }

    /**
     * Deactivate user
     */
    public void deactivateUser(UUID userId) {
        Optional<User> userOpt = userRepository.findById(userId);
        if (userOpt.isPresent()) {
            User user = userOpt.get();
            user.setIsActive(false);
            userRepository.save(user);
        }
    }

    /**
     * Activate user
     */
    public void activateUser(UUID userId) {
        Optional<User> userOpt = userRepository.findById(userId);
        if (userOpt.isPresent()) {
            User user = userOpt.get();
            user.setIsActive(true);
            userRepository.save(user);
        }
    }

    /**
     * Delete user (soft delete by deactivating)
     */
    public void deleteUser(UUID userId) {
        deactivateUser(userId);
    }

    /**
     * Search users by name using Oracle Text Search
     */
    @Transactional(readOnly = true)
    public List<User> searchUsersByName(String searchTerm, UUID organizationId) {
        return userRepository.searchUsersByName(searchTerm, organizationId.toString());
    }

    /**
     * Find inactive users since specified date
     */
    @Transactional(readOnly = true)
    public List<User> findUsersNotLoggedInSince(LocalDateTime date) {
        return userRepository.findUsersNotLoggedInSince(date);
    }
}