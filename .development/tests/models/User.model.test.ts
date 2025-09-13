import { User, UserRole } from '@prisma/client';
import { createTestOrganization, testDb } from '../setup';

describe('User Model', () => {
  let organizationId: string;
  let departmentId: string;

  beforeEach(async () => {
    const organization = await createTestOrganization();
    organizationId = organization.id;

    const department = await testDb.department.create({
      data: {
        name: 'IT Department',
        description: 'Information Technology Department',
        costCenter: 'CC-001',
        organizationId,
      },
    });
    departmentId = department.id;
  });

  describe('User Creation', () => {
    it('should create a new user with required fields', async () => {
      const userData = {
        email: 'john.doe@example.com',
        username: 'john.doe',
        firstName: 'John',
        lastName: 'Doe',
        passwordHash: 'hashed_password_123',
        organizationId,
      };

      const user = await testDb.user.create({
        data: userData,
      });

      expect(user).toBeDefined();
      expect(user.id).toBeDefined();
      expect(user.email).toBe(userData.email);
      expect(user.username).toBe(userData.username);
      expect(user.firstName).toBe(userData.firstName);
      expect(user.lastName).toBe(userData.lastName);
      expect(user.passwordHash).toBe(userData.passwordHash);
      expect(user.organizationId).toBe(organizationId);
      
      // Test default values
      expect(user.role).toBe(UserRole.USER);
      expect(user.language).toBe('en');
      expect(user.timezone).toBe('UTC');
      expect(user.currency).toBe('USD');
      expect(user.isActive).toBe(true);
      expect(user.createdAt).toBeDefined();
      expect(user.updatedAt).toBeDefined();
    });

    it('should enforce unique email constraint', async () => {
      const userData = {
        email: 'unique@example.com',
        username: 'user1',
        firstName: 'User',
        lastName: 'One',
        passwordHash: 'password1',
        organizationId,
      };

      // Create first user
      await testDb.user.create({ data: userData });

      // Attempt to create second user with same email
      await expect(
        testDb.user.create({
          data: { ...userData, username: 'user2' },
        })
      ).rejects.toThrow();
    });

    it('should enforce unique username constraint', async () => {
      const userData = {
        email: 'user1@example.com',
        username: 'unique_username',
        firstName: 'User',
        lastName: 'One',
        passwordHash: 'password1',
        organizationId,
      };

      // Create first user
      await testDb.user.create({ data: userData });

      // Attempt to create second user with same username
      await expect(
        testDb.user.create({
          data: { ...userData, email: 'user2@example.com' },
        })
      ).rejects.toThrow();
    });

    it('should create user with different roles', async () => {
      const roles: UserRole[] = ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'USER', 'READONLY'];

      for (let i = 0; i < roles.length; i++) {
        const user = await testDb.user.create({
          data: {
            email: `user${i}@example.com`,
            username: `user${i}`,
            firstName: 'User',
            lastName: `${i}`,
            passwordHash: 'password',
            role: roles[i],
            organizationId,
          },
        });

        expect(user.role).toBe(roles[i]);
      }
    });

    it('should create user with department assignment', async () => {
      const user = await testDb.user.create({
        data: {
          email: 'dept.user@example.com',
          username: 'dept.user',
          firstName: 'Department',
          lastName: 'User',
          passwordHash: 'password',
          organizationId,
          departmentId,
        },
      });

      expect(user.departmentId).toBe(departmentId);
    });

    it('should create user with custom preferences', async () => {
      const customUser = await testDb.user.create({
        data: {
          email: 'custom@example.com',
          username: 'custom.user',
          firstName: 'Custom',
          lastName: 'User',
          passwordHash: 'password',
          role: UserRole.MANAGER,
          language: 'es',
          timezone: 'America/New_York',
          currency: 'EUR',
          organizationId,
        },
      });

      expect(customUser.role).toBe(UserRole.MANAGER);
      expect(customUser.language).toBe('es');
      expect(customUser.timezone).toBe('America/New_York');
      expect(customUser.currency).toBe('EUR');
    });
  });

  describe('User Relationships', () => {
    let userId: string;

    beforeEach(async () => {
      const user = await testDb.user.create({
        data: {
          email: 'relationship.user@example.com',
          username: 'rel.user',
          firstName: 'Relationship',
          lastName: 'User',
          passwordHash: 'password',
          organizationId,
          departmentId,
        },
      });
      userId = user.id;
    });

    it('should establish relationship with organization', async () => {
      const user = await testDb.user.findUnique({
        where: { id: userId },
        include: { organization: true },
      });

      expect(user?.organization).toBeDefined();
      expect(user?.organization?.name).toBe('Test Organization');
      expect(user?.organization?.id).toBe(organizationId);
    });

    it('should establish relationship with department', async () => {
      const user = await testDb.user.findUnique({
        where: { id: userId },
        include: { department: true },
      });

      expect(user?.department).toBeDefined();
      expect(user?.department?.name).toBe('IT Department');
      expect(user?.department?.id).toBe(departmentId);
    });

    it('should support workflow instance relationships', async () => {
      // Create a workflow definition
      const workflowDef = await testDb.workflowDefinition.create({
        data: {
          name: 'Test Workflow',
          description: 'Test workflow for user relationships',
          definition: { steps: ['step1', 'step2'] },
          organizationId,
        },
      });

      // Create workflow instance initiated by user
      const workflowInstance = await testDb.workflowInstance.create({
        data: {
          status: 'PENDING',
          currentStep: 'step1',
          data: { test: true },
          definitionId: workflowDef.id,
          initiatedById: userId,
        },
      });

      const userWithWorkflows = await testDb.user.findUnique({
        where: { id: userId },
        include: { workflowInstances: true },
      });

      expect(userWithWorkflows?.workflowInstances).toHaveLength(1);
      expect(userWithWorkflows?.workflowInstances[0].status).toBe('PENDING');
    });

    it('should support approval relationships', async () => {
      // Create workflow for approval
      const workflowDef = await testDb.workflowDefinition.create({
        data: {
          name: 'Approval Workflow',
          definition: { steps: ['approval'] },
          organizationId,
        },
      });

      const workflowInstance = await testDb.workflowInstance.create({
        data: {
          status: 'PENDING',
          definitionId: workflowDef.id,
          initiatedById: userId,
          data: { approval_needed: true },
        },
      });

      // Create approval by the user
      const approval = await testDb.approval.create({
        data: {
          status: 'APPROVED',
          comments: 'Approved by test user',
          approvedAt: new Date(),
          workflowId: workflowInstance.id,
          approverId: userId,
        },
      });

      const userWithApprovals = await testDb.user.findUnique({
        where: { id: userId },
        include: { approvals: true },
      });

      expect(userWithApprovals?.approvals).toHaveLength(1);
      expect(userWithApprovals?.approvals[0].status).toBe('APPROVED');
      expect(userWithApprovals?.approvals[0].comments).toBe('Approved by test user');
    });

    it('should support document relationships', async () => {
      const document = await testDb.document.create({
        data: {
          name: 'Test Document',
          description: 'A test document',
          fileName: 'test.pdf',
          filePath: '/path/to/test.pdf',
          fileSize: 1024,
          mimeType: 'application/pdf',
          checksum: 'abc123',
          uploadedById: userId,
        },
      });

      const userWithDocuments = await testDb.user.findUnique({
        where: { id: userId },
        include: { documents: true },
      });

      expect(userWithDocuments?.documents).toHaveLength(1);
      expect(userWithDocuments?.documents[0].name).toBe('Test Document');
      expect(userWithDocuments?.documents[0].fileName).toBe('test.pdf');
    });

    it('should support notification relationships', async () => {
      const notification = await testDb.notification.create({
        data: {
          title: 'Test Notification',
          message: 'This is a test notification',
          type: 'INFO',
          priority: 'NORMAL',
          recipientId: userId,
        },
      });

      const userWithNotifications = await testDb.user.findUnique({
        where: { id: userId },
        include: { notifications: true },
      });

      expect(userWithNotifications?.notifications).toHaveLength(1);
      expect(userWithNotifications?.notifications[0].title).toBe('Test Notification');
      expect(userWithNotifications?.notifications[0].isRead).toBe(false);
    });
  });

  describe('User Queries', () => {
    beforeEach(async () => {
      // Create multiple users for testing
      const usersData = [
        { 
          email: 'admin@example.com', 
          username: 'admin', 
          firstName: 'Admin', 
          lastName: 'User',
          role: UserRole.ADMIN,
          language: 'en',
          isActive: true,
        },
        { 
          email: 'manager@example.com', 
          username: 'manager', 
          firstName: 'Manager', 
          lastName: 'User',
          role: UserRole.MANAGER,
          language: 'es',
          isActive: true,
        },
        { 
          email: 'inactive@example.com', 
          username: 'inactive', 
          firstName: 'Inactive', 
          lastName: 'User',
          role: UserRole.USER,
          language: 'fr',
          isActive: false,
        },
        { 
          email: 'readonly@example.com', 
          username: 'readonly', 
          firstName: 'ReadOnly', 
          lastName: 'User',
          role: UserRole.READONLY,
          language: 'en',
          isActive: true,
        },
      ];

      for (const userData of usersData) {
        await testDb.user.create({
          data: {
            ...userData,
            passwordHash: 'password123',
            organizationId,
          },
        });
      }
    });

    it('should filter users by role', async () => {
      const adminUsers = await testDb.user.findMany({
        where: { role: UserRole.ADMIN },
      });

      const managerUsers = await testDb.user.findMany({
        where: { role: UserRole.MANAGER },
      });

      expect(adminUsers).toHaveLength(1);
      expect(adminUsers[0].firstName).toBe('Admin');

      expect(managerUsers).toHaveLength(1);
      expect(managerUsers[0].firstName).toBe('Manager');
    });

    it('should filter users by active status', async () => {
      const activeUsers = await testDb.user.findMany({
        where: { isActive: true },
      });

      const inactiveUsers = await testDb.user.findMany({
        where: { isActive: false },
      });

      expect(activeUsers).toHaveLength(3);
      expect(inactiveUsers).toHaveLength(1);
      expect(inactiveUsers[0].firstName).toBe('Inactive');
    });

    it('should filter users by organization', async () => {
      const orgUsers = await testDb.user.findMany({
        where: { organizationId },
      });

      expect(orgUsers).toHaveLength(4);
      orgUsers.forEach(user => {
        expect(user.organizationId).toBe(organizationId);
      });
    });

    it('should search users by name', async () => {
      const adminUsers = await testDb.user.findMany({
        where: {
          OR: [
            { firstName: { contains: 'Admin', mode: 'insensitive' } },
            { lastName: { contains: 'Admin', mode: 'insensitive' } },
          ],
        },
      });

      expect(adminUsers).toHaveLength(1);
      expect(adminUsers[0].firstName).toBe('Admin');
    });

    it('should search users by email', async () => {
      const userByEmail = await testDb.user.findUnique({
        where: { email: 'manager@example.com' },
      });

      expect(userByEmail).toBeDefined();
      expect(userByEmail?.firstName).toBe('Manager');
    });

    it('should support complex filtering', async () => {
      const specificUsers = await testDb.user.findMany({
        where: {
          AND: [
            { role: { in: [UserRole.ADMIN, UserRole.MANAGER] } },
            { isActive: true },
            { language: 'en' },
            { organizationId },
          ],
        },
        orderBy: { firstName: 'asc' },
      });

      expect(specificUsers).toHaveLength(1);
      expect(specificUsers[0].firstName).toBe('Admin');
      expect(specificUsers[0].role).toBe(UserRole.ADMIN);
    });

    it('should count users by role', async () => {
      const adminCount = await testDb.user.count({
        where: { role: UserRole.ADMIN },
      });

      const userCount = await testDb.user.count({
        where: { role: UserRole.USER },
      });

      expect(adminCount).toBe(1);
      expect(userCount).toBe(1); // Including the inactive user
    });
  });

  describe('User Updates', () => {
    let userId: string;

    beforeEach(async () => {
      const user = await testDb.user.create({
        data: {
          email: 'update.user@example.com',
          username: 'update.user',
          firstName: 'Update',
          lastName: 'User',
          passwordHash: 'oldpassword',
          organizationId,
        },
      });
      userId = user.id;
    });

    it('should update user basic information', async () => {
      const updatedUser = await testDb.user.update({
        where: { id: userId },
        data: {
          firstName: 'Updated',
          lastName: 'Name',
          language: 'es',
          timezone: 'Europe/Madrid',
          currency: 'EUR',
        },
      });

      expect(updatedUser.firstName).toBe('Updated');
      expect(updatedUser.lastName).toBe('Name');
      expect(updatedUser.language).toBe('es');
      expect(updatedUser.timezone).toBe('Europe/Madrid');
      expect(updatedUser.currency).toBe('EUR');
      expect(updatedUser.updatedAt).not.toBe(updatedUser.createdAt);
    });

    it('should update user role', async () => {
      const updatedUser = await testDb.user.update({
        where: { id: userId },
        data: { role: UserRole.MANAGER },
      });

      expect(updatedUser.role).toBe(UserRole.MANAGER);
    });

    it('should update user active status', async () => {
      const deactivatedUser = await testDb.user.update({
        where: { id: userId },
        data: { isActive: false },
      });

      expect(deactivatedUser.isActive).toBe(false);
    });

    it('should track last login', async () => {
      const loginTime = new Date();
      const updatedUser = await testDb.user.update({
        where: { id: userId },
        data: { lastLoginAt: loginTime },
      });

      expect(updatedUser.lastLoginAt).toEqual(loginTime);
    });

    it('should assign user to department', async () => {
      const updatedUser = await testDb.user.update({
        where: { id: userId },
        data: { departmentId },
      });

      expect(updatedUser.departmentId).toBe(departmentId);

      // Verify relationship
      const userWithDept = await testDb.user.findUnique({
        where: { id: userId },
        include: { department: true },
      });

      expect(userWithDept?.department?.name).toBe('IT Department');
    });
  });

  describe('User Authentication Data', () => {
    it('should store and verify password hash', async () => {
      const user = await testDb.user.create({
        data: {
          email: 'auth@example.com',
          username: 'auth.user',
          firstName: 'Auth',
          lastName: 'User',
          passwordHash: 'bcrypt_hashed_password_here',
          organizationId,
        },
      });

      expect(user.passwordHash).toBe('bcrypt_hashed_password_here');
      
      // In a real application, you would use bcrypt to compare
      // expect(await bcrypt.compare('plaintext_password', user.passwordHash)).toBe(true);
    });

    it('should handle email verification and password reset scenarios', async () => {
      const user = await testDb.user.create({
        data: {
          email: 'verify@example.com',
          username: 'verify.user',
          firstName: 'Verify',
          lastName: 'User',
          passwordHash: 'initial_password',
          isActive: false, // Not activated until email verified
          organizationId,
        },
      });

      expect(user.isActive).toBe(false);

      // Simulate email verification
      const verifiedUser = await testDb.user.update({
        where: { id: user.id },
        data: { isActive: true },
      });

      expect(verifiedUser.isActive).toBe(true);

      // Simulate password reset
      const resetUser = await testDb.user.update({
        where: { id: user.id },
        data: { passwordHash: 'new_hashed_password' },
      });

      expect(resetUser.passwordHash).toBe('new_hashed_password');
    });
  });

  describe('User Deletion and Cleanup', () => {
    it('should handle user deletion with related records', async () => {
      const user = await testDb.user.create({
        data: {
          email: 'delete@example.com',
          username: 'delete.user',
          firstName: 'Delete',
          lastName: 'User',
          passwordHash: 'password',
          organizationId,
        },
      });

      // Create related records
      const notification = await testDb.notification.create({
        data: {
          title: 'User Notification',
          message: 'Test notification',
          type: 'INFO',
          recipientId: user.id,
        },
      });

      // Delete the user
      await testDb.user.delete({
        where: { id: user.id },
      });

      // Verify user is deleted
      const deletedUser = await testDb.user.findUnique({
        where: { id: user.id },
      });
      expect(deletedUser).toBeNull();

      // Verify related notifications are also deleted (cascade)
      const orphanedNotifications = await testDb.notification.findMany({
        where: { recipientId: user.id },
      });
      expect(orphanedNotifications).toHaveLength(0);
    });

    it('should support soft delete by deactivating user', async () => {
      const user = await testDb.user.create({
        data: {
          email: 'softdelete@example.com',
          username: 'softdelete.user',
          firstName: 'SoftDelete',
          lastName: 'User',
          passwordHash: 'password',
          organizationId,
        },
      });

      // Soft delete by deactivating
      const deactivatedUser = await testDb.user.update({
        where: { id: user.id },
        data: { isActive: false },
      });

      expect(deactivatedUser.isActive).toBe(false);

      // User still exists in database
      const existingUser = await testDb.user.findUnique({
        where: { id: user.id },
      });
      expect(existingUser).toBeDefined();

      // But won't appear in active user queries
      const activeUsers = await testDb.user.findMany({
        where: { isActive: true, organizationId },
      });
      expect(activeUsers.find(u => u.id === user.id)).toBeUndefined();
    });
  });
});