import { Sequelize } from 'sequelize';
import { logger } from './logger';

declare global {
  var __sequelize: Sequelize | undefined;
}

// Prevent multiple instances of Sequelize in development
export const sequelize = globalThis.__sequelize || new Sequelize(
  process.env.DATABASE_URL || 'postgresql://localhost:5432/turbo_asset',
  {
    dialect: 'postgres',
    logging: process.env.NODE_ENV === 'development' 
      ? (sql: string, timing?: number) => {
          logger.debug('Database Query', {
            query: sql,
            duration: timing ? `${timing}ms` : 'N/A',
          });
        }
      : false,
    pool: {
      max: 20,
      min: 5,
      acquire: 60000,
      idle: 10000,
    },
    dialectOptions: {
      ssl: process.env.DATABASE_SSL === 'true' ? {
        require: true,
        rejectUnauthorized: false,
      } : false,
    },
  }
);

// Database event logging
if (process.env.NODE_ENV === 'development') {
  globalThis.__sequelize = sequelize;
}

// Keep backward compatibility alias
export const prisma = sequelize;

/**
 * Connect to the database
 */
export async function connectDatabase(): Promise<void> {
  try {
    await sequelize.authenticate();
    logger.info('Database connected successfully');
  } catch (error) {
    logger.error('Failed to connect to database:', error);
    throw error;
  }
}

/**
 * Disconnect from the database
 */
export async function disconnectDatabase(): Promise<void> {
  try {
    await sequelize.close();
    logger.info('Database disconnected successfully');
  } catch (error) {
    logger.error('Failed to disconnect from database:', error);
    throw error;
  }
}

export default sequelize;