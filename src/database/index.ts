/**
 * Database connection and utilities
 */

export { 
  sequelize,
  prisma, // Keep backward compatibility
  connectDatabase, 
  disconnectDatabase 
} from '../config/database';