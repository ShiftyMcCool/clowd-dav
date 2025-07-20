import { DAVProvider } from '../types/providers';
import { BaikalProvider } from './BaikalProvider';

/**
 * Registry for managing DAV providers
 * Handles provider registration, auto-detection, and selection
 */
export class ProviderRegistry {
  private providers: Map<string, new () => DAVProvider> = new Map();
  private instances: Map<string, DAVProvider> = new Map();

  constructor() {
    // Register default providers
    this.registerProvider('baikal', BaikalProvider);
  }

  /**
   * Register a new provider class
   */
  registerProvider(name: string, providerClass: new () => DAVProvider): void {
    this.providers.set(name, providerClass);
  }

  /**
   * Get a provider instance by name
   */
  getProvider(name: string): DAVProvider | null {
    if (this.instances.has(name)) {
      return this.instances.get(name)!;
    }

    const ProviderClass = this.providers.get(name);
    if (!ProviderClass) {
      return null;
    }

    const instance = new ProviderClass();
    this.instances.set(name, instance);
    return instance;
  }

  /**
   * Get all registered provider names
   */
  getProviderNames(): string[] {
    return Array.from(this.providers.keys());
  }

  /**
   * Auto-detect the best provider for a given server URL
   * Tests providers in order of preference
   */
  async detectProvider(baseUrl: string): Promise<DAVProvider | null> {
    // Get all registered providers and test them in order
    const providerNames = this.getProviderNames();

    for (const providerName of providerNames) {
      const provider = this.getProvider(providerName);
      if (!provider) {
        continue;
      }

      try {
        const isCompatible = await provider.detectServer(baseUrl);
        if (isCompatible) {
          return provider;
        }
      } catch (error) {
        console.warn(`Provider ${providerName} detection failed:`, error);
        continue;
      }
    }

    return null;
  }

  /**
   * Test all providers against a server URL and return compatibility results
   */
  async testAllProviders(baseUrl: string): Promise<{ [providerName: string]: boolean }> {
    const results: { [providerName: string]: boolean } = {};
    
    const testPromises = this.getProviderNames().map(async (providerName) => {
      const provider = this.getProvider(providerName);
      if (!provider) {
        results[providerName] = false;
        return;
      }

      try {
        results[providerName] = await provider.detectServer(baseUrl);
      } catch (error) {
        results[providerName] = false;
      }
    });

    await Promise.all(testPromises);
    return results;
  }

  /**
   * Clear all cached provider instances
   */
  clearCache(): void {
    this.instances.clear();
  }
}

// Export singleton instance
export const providerRegistry = new ProviderRegistry();