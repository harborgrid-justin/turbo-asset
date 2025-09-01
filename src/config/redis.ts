import Redis from 'redis';
import { config } from './index';
import { logger } from './logger';

export const redis = Redis.createClient({
  url: config.redis.url,
});

redis.on('error', (err) => {
  logger.error('Redis Client Error', err);
});

redis.on('connect', () => {
  logger.info('Redis Client Connected');
});

redis.on('disconnect', () => {
  logger.info('Redis Client Disconnected');
});

export const connectRedis = async () => {
  try {
    await redis.connect();
  } catch (error) {
    logger.error('Failed to connect to Redis', error);
    throw error;
  }
};

export default redis;