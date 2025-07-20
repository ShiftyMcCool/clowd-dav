import { DAVProvider } from '../types/providers';
import { providerRegistry } from './ProviderRegistry';

/**
 * Factory for creating and managing DAV providers
 * Provides high-level API for provider selection and instantiation
 */
export class ProviderFactory {
  /**
   * Create a provider by name
   */
  static createProvider(name: string): DAVProvider | null {
    return providerRegistry.getProvider(name);
  }

  /**
   * Auto-detect and create the best provider for a server URL
   */
  static async createProviderForServer(baseUrl: string): Promise<DAVProvider | null> {
    return await providerRegistry.detectProvider(baseUrl);
  }

  /**
   * Get all available provider names
   */
  static getAvailableProviders(): string[] {
    return providerRegistry.getProviderNames();
  }

  /**
   * Test server compatibility with all providers
   */
  static async testServerCompatibility(baseUrl: string): Promise<{ [providerName: string]: boolean }> {
    return await providerRegistry.testAllProviders(baseUrl);
  }

  /**
   * Register a custom provider
   */
  static registerProvider(name: string, providerClass: new () => DAVProvider): void {
    providerRegistry.registerProvider(name, providerClass);
  }

  /**
   * Clear provider cache (useful for testing)
   */
  static clearCache(): void {
    providerRegistry.clearCache();
  }
}

/**
 * Convenience function for auto-detecting provider
 */
export async function detectProviderForServer(baseUrl: string): Promise<DAVProvider | null> {
  return ProviderFactory.createProviderForServer(baseUrl);
}

/**
 * Convenience function for creating provider by name
 */
export function createProvider(name: string): DAVProvider | null {
  return ProviderFactory.createProvider(name);
}