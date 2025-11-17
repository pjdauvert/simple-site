import type { SiteConfig } from '@simple-site/interfaces';
import { SiteConfigSchema } from '@simple-site/interfaces';
/**
 * Simulates loading configuration from an API endpoint
 * In a real application, this would be a fetch call to an API
 */
export async function loadSiteConfig(): Promise<SiteConfig> {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // In production, this would be: return fetch('/api/config').then(res => res.json());
  // For now, we dynamically import the JSON file
  const config = await import('../config/siteConfig.json');
  
  // Validate configuration with Zod - this ensures runtime type safety
  // The parse() method will throw a ZodError if validation fails
  const validatedConfig = SiteConfigSchema.parse(config.default);
  
  // Safe cast: Zod has validated the structure matches our schema
  // This bridges the Zod-inferred type to our TypeScript interface
  return validatedConfig as SiteConfig;
}
