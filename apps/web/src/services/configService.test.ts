import { describe, it, expect } from 'vitest';
import { SiteConfigSchema } from '@simple-site/interfaces';

describe('SiteConfig Validation', () => {
  it('should validate a correct configuration', () => {
    const validConfig = {
      site: {
        siteName: 'Test Site',
        logoUrl: '/logo.svg',
        containerMaxWidth: 'lg',
      },
      themes: [
        {
          themeName: 'Dark',
          primaryColor: '#90caf9',
          secondaryColor: '#f48fb1',
          linkColor: '#90caf9',
          linkHoverColor: '#64b5f6',
          backgroundColor: '#121212',
          menuBackgroundColor: '#1e1e1e',
          menuHoverColor: '#2c2c2c',
        },
      ],
      pages: [
        {
          pageName: 'home',
          menuTitle: 'Home',
          route: '/',
          sections: [
            {
              sectionName: 'hero',
              type: 'hero',
              content: {
                title: 'Welcome',
              },
              design: {},
            },
          ],
        },
      ],
      i18n: {
        en: {
          'home.title': 'Welcome',
        },
      },
    };

    const result = SiteConfigSchema.safeParse(validConfig);
    expect(result.success).toBe(true);
  });

  it('should reject invalid configuration', () => {
    const invalidConfig = {
      site: {
        name: 'Test Site',
      },
      // Missing required fields
      themes: [],
      pages: 'not an array', // Invalid type
      i18n: {},
    };

    const result = SiteConfigSchema.safeParse(invalidConfig);
    expect(result.success).toBe(false);
  });

  it('should reject configuration with invalid theme colors', () => {
    const invalidConfig = {
      site: {
        name: 'Test Site',
      },
      themes: [
        {
          themeName: 'Dark',
          // Missing required color fields
          primaryColor: '#90caf9',
        },
      ],
      pages: [],
      i18n: {},
    };

    const result = SiteConfigSchema.safeParse(invalidConfig);
    expect(result.success).toBe(false);
  });
});
