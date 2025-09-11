import { Request, Response } from 'express';
import { WhiteLabelService } from '@/services/WhiteLabelService';
import { logger } from '@/config/logger';
import { prisma } from '@/config/database';

const whiteLabelService = new WhiteLabelService();

export class WhiteLabelController {
  /**
   * Get white label configurations
   */
  async getConfigurations(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.params;
      const { page = 1, limit = 20 } = req.query;

      const configs = await prisma.whiteLabelConfig.findMany({
        where: { organizationId },
        include: { subsidiaries: true },
        skip: (Number(page) - 1) * Number(limit),
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
      });

      const total = await prisma.whiteLabelConfig.count({
        where: { organizationId },
      });

      res.json({
        configurations: configs,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit)),
        },
      });
    } catch (error: unknown) {
      logger.error('Failed to get white label configurations', { error });
      res.status(500).json({ error: 'Failed to get white label configurations' });
    }
  }

  /**
   * Create white label configuration
   */
  async createConfiguration(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.params;
      const { name, description, brandingScope, branding, customizations } = req.body;

      const config = await whiteLabelService.createWhiteLabelConfig(
        organizationId,
        name,
        description,
        brandingScope,
        branding,
        customizations
      );

      res.status(201).json(config);
    } catch (error: unknown) {
      logger.error('Failed to create white label configuration', { error });
      res.status(500).json({ error: 'Failed to create white label configuration' });
    }
  }

  /**
   * Update branding
   */
  async updateBranding(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.params;
      const { branding } = req.body;

      await whiteLabelService.updateBranding(organizationId, branding);

      res.json({ message: 'Branding updated successfully' });
    } catch (error: unknown) {
      logger.error('Failed to update branding', { error });
      res.status(500).json({ error: 'Failed to update branding' });
    }
  }

  /**
   * Apply theme
   */
  async applyTheme(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.params;
      const { theme } = req.body;

      await whiteLabelService.applyTheme(organizationId, theme);

      res.json({ message: 'Theme applied successfully' });
    } catch (error: unknown) {
      logger.error('Failed to apply theme', { error });
      res.status(500).json({ error: 'Failed to apply theme' });
    }
  }

  /**
   * Setup custom domain
   */
  async setupCustomDomain(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.params;
      const { domainConfig } = req.body;

      const config = await whiteLabelService.setupCustomDomain(organizationId, domainConfig);

      res.json(config);
    } catch (error: unknown) {
      logger.error('Failed to setup custom domain', { error });
      res.status(500).json({ error: 'Failed to setup custom domain' });
    }
  }

  /**
   * Verify custom domain
   */
  async verifyCustomDomain(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.params;
      const { domain } = req.body;

      const verified = await whiteLabelService.verifyCustomDomain(organizationId, domain);

      res.json({ verified });
    } catch (error: unknown) {
      logger.error('Failed to verify custom domain', { error });
      res.status(500).json({ error: 'Failed to verify custom domain' });
    }
  }

  /**
   * Get organization by domain
   */
  async getOrganizationByDomain(req: Request, res: Response): Promise<void> {
    try {
      const { domain } = req.params;

      const organizationId = await whiteLabelService.getOrganizationByDomain(domain);

      if (!organizationId) {
        res.status(404).json({ error: 'Organization not found for domain' });
        return;
      }

      res.json({ organizationId });
    } catch (error: unknown) {
      logger.error('Failed to get organization by domain', { error });
      res.status(500).json({ error: 'Failed to get organization by domain' });
    }
  }

  /**
   * Generate customized bundle
   */
  async generateBundle(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.params;
      const { platform } = req.query;

      const bundle = await whiteLabelService.generateCustomizedBundle(
        organizationId,
        platform as 'web' | 'mobile' | 'desktop'
      );

      res.setHeader('Content-Type', 'application/octet-stream');
      res.setHeader('Content-Disposition', `attachment; filename=${platform}-bundle.zip`);
      res.send(bundle);
    } catch (error: unknown) {
      logger.error('Failed to generate bundle', { error });
      res.status(500).json({ error: 'Failed to generate bundle' });
    }
  }

  /**
   * Create subsidiary
   */
  async createSubsidiary(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.params;
      const { subsidiaryConfig } = req.body;

      const result = await whiteLabelService.createSubsidiary(
        organizationId,
        subsidiaryConfig,
        req.user?.id || 'system'
      );

      res.status(201).json(result);
    } catch (error: unknown) {
      logger.error('Failed to create subsidiary', { error });
      res.status(500).json({ error: 'Failed to create subsidiary' });
    }
  }

  /**
   * Get subsidiaries
   */
  async getSubsidiaries(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.params;

      const subsidiaries = await prisma.subsidiaryBranding.findMany({
        where: {
          config: { organizationId },
        },
        include: { config: true },
      });

      res.json(subsidiaries);
    } catch (error: unknown) {
      logger.error('Failed to get subsidiaries', { error });
      res.status(500).json({ error: 'Failed to get subsidiaries' });
    }
  }

  /**
   * Create email template
   */
  async createEmailTemplate(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.params;
      const { template } = req.body;

      const createdTemplate = await whiteLabelService.createEmailTemplate(
        organizationId,
        template
      );

      res.status(201).json(createdTemplate);
    } catch (error: unknown) {
      logger.error('Failed to create email template', { error });
      res.status(500).json({ error: 'Failed to create email template' });
    }
  }

  /**
   * Render email template
   */
  async renderEmailTemplate(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId, templateId } = req.params;
      const { data } = req.body;

      const rendered = await whiteLabelService.renderEmailTemplate(
        organizationId,
        templateId,
        data
      );

      res.json(rendered);
    } catch (error: unknown) {
      logger.error('Failed to render email template', { error });
      res.status(500).json({ error: 'Failed to render email template' });
    }
  }

  /**
   * Setup feature flags
   */
  async setupFeatureFlags(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.params;
      const { features } = req.body;

      await whiteLabelService.setupFeatureFlags(organizationId, features);

      res.json({ message: 'Feature flags configured successfully' });
    } catch (error: unknown) {
      logger.error('Failed to setup feature flags', { error });
      res.status(500).json({ error: 'Failed to setup feature flags' });
    }
  }

  /**
   * Check feature flag
   */
  async checkFeatureFlag(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId, featureName } = req.params;
      const { userRole } = req.query;

      const enabled = await whiteLabelService.isFeatureEnabled(
        organizationId,
        featureName,
        userRole as string
      );

      res.json({ enabled });
    } catch (error: unknown) {
      logger.error('Failed to check feature flag', { error });
      res.status(500).json({ error: 'Failed to check feature flag' });
    }
  }

  /**
   * Generate PWA manifest
   */
  async generatePWAManifest(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.params;

      const manifest = await whiteLabelService.generatePWAManifest(organizationId);

      res.json(manifest);
    } catch (error: unknown) {
      logger.error('Failed to generate PWA manifest', { error });
      res.status(500).json({ error: 'Failed to generate PWA manifest' });
    }
  }

  /**
   * Get available themes
   */
  async getAvailableThemes(req: Request, res: Response): Promise<void> {
    try {
      // Mock available themes
      const themes = [
        {
          id: 'corporate',
          name: 'Corporate',
          description: 'Professional corporate theme',
          preview: '/themes/corporate-preview.png',
          colors: {
            primary: '#003366',
            secondary: '#6c757d',
            success: '#28a745',
            warning: '#ffc107',
            error: '#dc3545',
            info: '#17a2b8',
          },
          typography: {
            fontFamily: 'Roboto, sans-serif',
            fontSize: '16px',
            lineHeight: '1.5',
          },
        },
        {
          id: 'modern',
          name: 'Modern',
          description: 'Clean and modern design',
          preview: '/themes/modern-preview.png',
          colors: {
            primary: '#007bff',
            secondary: '#6c757d',
            success: '#28a745',
            warning: '#ffc107',
            error: '#dc3545',
            info: '#17a2b8',
          },
          typography: {
            fontFamily: 'Inter, sans-serif',
            fontSize: '14px',
            lineHeight: '1.6',
          },
        },
        {
          id: 'classic',
          name: 'Classic',
          description: 'Traditional and reliable',
          preview: '/themes/classic-preview.png',
          colors: {
            primary: '#0056b3',
            secondary: '#495057',
            success: '#155724',
            warning: '#856404',
            error: '#721c24',
            info: '#0c5460',
          },
          typography: {
            fontFamily: 'Georgia, serif',
            fontSize: '15px',
            lineHeight: '1.7',
          },
        },
      ];

      res.json(themes);
    } catch (error: unknown) {
      logger.error('Failed to get available themes', { error });
      res.status(500).json({ error: 'Failed to get available themes' });
    }
  }

  /**
   * Get branding analytics
   */
  async getBrandingAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.params;

      const configs = await prisma.whiteLabelConfig.findMany({
        where: { organizationId },
        include: { subsidiaries: true },
      });

      const analytics = {
        totalConfigurations: configs.length,
        activeConfigurations: configs.filter(c => c.isActive).length,
        configurationsByScope: configs.reduce((acc, config) => {
          acc[config.brandingScope] = (acc[config.brandingScope] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        totalSubsidiaries: configs.reduce((sum, config) => sum + config.subsidiaries.length, 0),
        customDomainsCount: configs.filter(c => c.customDomain).length,
        themesUsed: {
          corporate: 12,
          modern: 8,
          classic: 5,
          custom: 3,
        },
        brandingMetrics: {
          logoUploaded: configs.filter(c => c.logoUrl).length,
          customCSSUsed: configs.filter(c => c.customCSS).length,
          emailTemplatesCustomized: configs.length * 5, // Mock average
          featureFlagsActive: configs.length * 15, // Mock average
        },
        usage: {
          webPlatform: 85.2, // percentage
          mobilePlatform: 67.8,
          desktopPlatform: 43.5,
        },
      };

      res.json(analytics);
    } catch (error: unknown) {
      logger.error('Failed to get branding analytics', { error });
      res.status(500).json({ error: 'Failed to get branding analytics' });
    }
  }

  /**
   * Update white label configuration
   */
  async updateConfiguration(req: Request, res: Response): Promise<void> {
    try {
      const { configId } = req.params;
      const updates = req.body;

      const config = await prisma.whiteLabelConfig.update({
        where: { id: configId },
        data: updates,
      });

      res.json(config);
    } catch (error: unknown) {
      logger.error('Failed to update white label configuration', { error });
      res.status(500).json({ error: 'Failed to update white label configuration' });
    }
  }

  /**
   * Delete white label configuration
   */
  async deleteConfiguration(req: Request, res: Response): Promise<void> {
    try {
      const { configId } = req.params;

      await prisma.whiteLabelConfig.delete({
        where: { id: configId },
      });

      res.status(204).send();
    } catch (error: unknown) {
      logger.error('Failed to delete white label configuration', { error });
      res.status(500).json({ error: 'Failed to delete white label configuration' });
    }
  }

  /**
   * Upload logo
   */
  async uploadLogo(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.params;

      if (!req.file) {
        res.status(400).json({ error: 'No logo file provided' });
        return;
      }

      // Mock logo upload (would integrate with actual file storage service)
      const logoUrl = `/uploads/logos/${organizationId}/${req.file.filename}`;

      await prisma.whiteLabelConfig.updateMany({
        where: { organizationId },
        data: { logoUrl },
      });

      res.json({ logoUrl });
    } catch (error: unknown) {
      logger.error('Failed to upload logo', { error });
      res.status(500).json({ error: 'Failed to upload logo' });
    }
  }

  /**
   * Preview theme
   */
  async previewTheme(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.params;
      const { theme } = req.body;

      // Generate theme preview CSS
      const css = `
        :root {
          --primary-color: ${theme.colors.primary};
          --secondary-color: ${theme.colors.secondary};
          --font-family: ${theme.typography.fontFamily};
          --font-size: ${theme.typography.fontSize};
        }
        
        body { 
          font-family: var(--font-family); 
          font-size: var(--font-size);
        }
        
        .preview-header {
          background-color: var(--primary-color);
          color: white;
          padding: 20px;
        }
        
        .preview-content {
          padding: 20px;
        }
        
        .preview-button {
          background-color: var(--primary-color);
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 4px;
        }
      `;

      const html = `
        <html>
          <head>
            <style>${css}</style>
          </head>
          <body>
            <div class="preview-header">
              <h1>Your Company Name</h1>
              <p>Turbo Asset Management Platform</p>
            </div>
            <div class="preview-content">
              <h2>Welcome to your customized platform</h2>
              <p>This is how your application will look with the selected theme.</p>
              <button class="preview-button">Sample Button</button>
            </div>
          </body>
        </html>
      `;

      res.setHeader('Content-Type', 'text/html');
      res.send(html);
    } catch (error: unknown) {
      logger.error('Failed to preview theme', { error });
      res.status(500).json({ error: 'Failed to preview theme' });
    }
  }

  /**
   * Export branding configuration
   */
  async exportConfiguration(req: Request, res: Response): Promise<void> {
    try {
      const { configId } = req.params;

      const config = await prisma.whiteLabelConfig.findUnique({
        where: { id: configId },
        include: { subsidiaries: true },
      });

      if (!config) {
        res.status(404).json({ error: 'Configuration not found' });
        return;
      }

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename=branding-config-${configId}.json`);
      res.json(config);
    } catch (error: unknown) {
      logger.error('Failed to export configuration', { error });
      res.status(500).json({ error: 'Failed to export configuration' });
    }
  }

  /**
   * Import branding configuration
   */
  async importConfiguration(req: Request, res: Response): Promise<void> {
    try {
      const { organizationId } = req.params;
      const { configuration } = req.body;

      // Remove ID fields and timestamps
      const { id, createdAt, updatedAt, ...configData } = configuration;

      const importedConfig = await prisma.whiteLabelConfig.create({
        data: {
          ...configData,
          organizationId,
          name: `${configData.name} (Imported)`,
        },
      });

      res.status(201).json(importedConfig);
    } catch (error: unknown) {
      logger.error('Failed to import configuration', { error });
      res.status(500).json({ error: 'Failed to import configuration' });
    }
  }
}