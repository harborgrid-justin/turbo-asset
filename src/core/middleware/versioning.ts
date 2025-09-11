import { Request, Response, NextFunction } from 'express';
import { ValidationError } from './errorHandler';
import { logger } from '../config/logger';

export interface VersionConfig {
  current: string;
  supported: string[];
  deprecated: string[];
  sunset?: { [version: string]: Date };
}

export interface VersionedRequest extends Request {
  version?: string;
  isDeprecated?: boolean;
  sunsetDate?: Date;
}

/**
 * API Version Manager
 */
export class APIVersionManager {
  private config: VersionConfig;

  constructor(config: VersionConfig) {
    this.config = config;
    this.validateConfig();
  }

  private validateConfig(): void {
    if (!this.config.current || !this.config.supported.includes(this.config.current)) {
      throw new Error('Current version must be included in supported versions');
    }
  }

  /**
   * Extract version from different sources
   */
  private extractVersion(req: Request): string | null {
    // 1. URL path versioning: /api/v1/resources
    const pathMatch = req.path.match(/^\/api\/v(\d+(?:\.\d+)*)\//);
    if (pathMatch) {
      return pathMatch[1];
    }

    // 2. Accept header versioning: Accept: application/vnd.turboasset.v1+json
    const acceptHeader = req.headers.accept;
    if (acceptHeader) {
      const acceptMatch = acceptHeader.match(/application\/vnd\.turboasset\.v(\d+(?:\.\d+)*)\+json/);
      if (acceptMatch) {
        return acceptMatch[1];
      }
    }

    // 3. Custom header versioning: X-API-Version: 1.0
    const customHeader = req.headers['x-api-version'] as string;
    if (customHeader) {
      return customHeader;
    }

    // 4. Query parameter versioning: ?version=1.0
    const queryVersion = req.query.version as string;
    if (queryVersion) {
      return queryVersion;
    }

    return null;
  }

  /**
   * Validate version format
   */
  private isValidVersionFormat(version: string): boolean {
    return /^\d+(?:\.\d+)*$/.test(version);
  }

  /**
   * Compare version strings (semantic versioning)
   */
  private compareVersions(a: string, b: string): number {
    const aParts = a.split('.').map(Number);
    const bParts = b.split('.').map(Number);
    const length = Math.max(aParts.length, bParts.length);

    for (let i = 0; i < length; i++) {
      const aPart = aParts[i] || 0;
      const bPart = bParts[i] || 0;

      if (aPart < bPart) {return -1;}
      if (aPart > bPart) {return 1;}
    }

    return 0;
  }

  /**
   * Find the best matching supported version
   */
  private findBestMatch(requestedVersion: string): string {
    // Exact match
    if (this.config.supported.includes(requestedVersion)) {
      return requestedVersion;
    }

    // Find the highest compatible version
    const compatibleVersions = this.config.supported
      .filter(v => this.compareVersions(v, requestedVersion) <= 0)
      .sort((a, b) => this.compareVersions(b, a));

    return compatibleVersions[0] || this.config.current;
  }

  /**
   * Main versioning middleware
   */
  middleware() {
    return (req: VersionedRequest, res: Response, next: NextFunction): void => {
      try {
        let requestedVersion = this.extractVersion(req);

        // Use current version if none specified
        if (!requestedVersion) {
          requestedVersion = this.config.current;
        }

        // Validate version format
        if (!this.isValidVersionFormat(requestedVersion)) {
          throw new ValidationError(`Invalid version format: ${requestedVersion}`);
        }

        // Find best matching version
        const matchedVersion = this.findBestMatch(requestedVersion);

        // Check if version is supported
        if (!this.config.supported.includes(matchedVersion)) {
          throw new ValidationError(
            `Unsupported API version: ${requestedVersion}. Supported versions: ${this.config.supported.join(', ')}`
          );
        }

        // Set version info on request
        req.version = matchedVersion;
        req.isDeprecated = this.config.deprecated.includes(matchedVersion);
        req.sunsetDate = this.config.sunset?.[matchedVersion];

        // Add version headers to response
        res.setHeader('X-API-Version', matchedVersion);
        res.setHeader('X-Supported-Versions', this.config.supported.join(', '));

        // Add deprecation warnings
        if (req.isDeprecated) {
          res.setHeader('X-API-Deprecated', 'true');
          res.setHeader('X-API-Current-Version', this.config.current);
          
          if (req.sunsetDate) {
            res.setHeader('X-API-Sunset-Date', req.sunsetDate.toISOString());
            res.setHeader('Sunset', req.sunsetDate.toUTCString());
          }

          logger.warn('Deprecated API version used', {
            requestedVersion,
            matchedVersion,
            sunsetDate: req.sunsetDate,
            path: req.path,
            userAgent: req.get('User-Agent'),
            ip: req.ip,
          });
        }

        // Log version usage for analytics
        logger.debug('API version resolved', {
          requestedVersion,
          matchedVersion,
          isDeprecated: req.isDeprecated,
          path: req.path,
        });

        next();
      } catch (error) {
        next(error);
      }
    };
  }

  /**
   * Version-specific route handler wrapper
   */
  route(versionHandlers: { [version: string]: any }) {
    return (req: VersionedRequest, res: Response, next: NextFunction): void => {
      const version = req.version || this.config.current;
      const handler = versionHandlers[version];

      if (!handler) {
        // Try to find a compatible handler
        const compatibleVersions = Object.keys(versionHandlers)
          .filter(v => this.compareVersions(v, version) <= 0)
          .sort((a, b) => this.compareVersions(b, a));

        const compatibleHandler = compatibleVersions.length > 0 
          ? versionHandlers[compatibleVersions[0]]
          : null;

        if (compatibleHandler) {
          return compatibleHandler(req, res, next);
        }

        throw new ValidationError(`No handler available for version ${version}`);
      }

      handler(req, res, next);
    };
  }

  /**
   * Update version configuration
   */
  updateConfig(newConfig: Partial<VersionConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.validateConfig();
  }

  /**
   * Get version configuration
   */
  getConfig(): VersionConfig {
    return { ...this.config };
  }
}

/**
 * Content negotiation for versioned responses
 */
export const versionedResponse = (req: VersionedRequest, res: Response, data: any): void => {
  const version = req.version || '1.0';
  
  // Transform data based on version
  let responseData = data;
  
  if (version.startsWith('1.')) {
    // Version 1.x response format
    responseData = {
      success: true,
      data,
      version,
      timestamp: new Date().toISOString(),
    };
  } else if (version.startsWith('2.')) {
    // Version 2.x response format (example with different structure)
    responseData = {
      status: 'success',
      result: data,
      meta: {
        version,
        timestamp: new Date().toISOString(),
        deprecated: req.isDeprecated || false,
        ...(req.sunsetDate && { sunsetDate: req.sunsetDate }),
      },
    };
  }

  res.json(responseData);
};

/**
 * Default version configuration for Turbo Asset
 */
export const defaultVersionConfig: VersionConfig = {
  current: '1.0',
  supported: ['1.0', '1.1', '2.0'],
  deprecated: ['1.0'],
  sunset: {
    '1.0': new Date('2025-12-31'),
  },
};

/**
 * Create versioned API manager instance
 */
export const apiVersionManager = new APIVersionManager(defaultVersionConfig);

/**
 * Version-aware middleware for backward compatibility
 */
export const handleBackwardCompatibility = (req: VersionedRequest, res: Response, next: NextFunction): void => {
  const version = req.version || '1.0';

  // Handle breaking changes between versions
  if (version.startsWith('1.')) {
    // Convert new field names to old ones for v1.x clients
    const originalJson = res.json;
    res.json = function(data: any) {
      if (data && typeof data === 'object') {
        // Example: Convert 'organizationId' to 'orgId' for v1.x
        if (data.organizationId && !data.orgId) {
          data.orgId = data.organizationId;
        }
        
        // Example: Remove fields that didn't exist in v1.x
        if (data.newFieldInV2) {
          delete data.newFieldInV2;
        }
      }
      
      return originalJson.call(this, data);
    };
  }

  next();
};

/**
 * Version-specific validation middleware
 */
export const versionedValidation = (validationRules: { [version: string]: any }) => {
  return (req: VersionedRequest, res: Response, next: NextFunction): void => {
    const version = req.version || '1.0';
    const rules = validationRules[version];

    if (rules) {
      // Apply version-specific validation
      try {
        // This is a placeholder - integrate with your validation library
        // For example, with Joi:
        // const { error } = rules.validate(req.body);
        // if (error) throw new ValidationError(error.details[0].message);
        
        next();
      } catch (error) {
        next(error);
      }
    } else {
      next();
    }
  };
};

/**
 * Middleware to handle version-specific rate limits
 */
export const versionedRateLimit = (rateLimits: { [version: string]: { windowMs: number; max: number } }) => {
  return (req: VersionedRequest, res: Response, next: NextFunction): void => {
    const version = req.version || '1.0';
    const limits = rateLimits[version];

    if (limits) {
      // Set version-specific rate limit headers
      res.setHeader('X-RateLimit-Version', version);
      res.setHeader('X-RateLimit-Window', limits.windowMs);
      res.setHeader('X-RateLimit-Max', limits.max);
    }

    next();
  };
};