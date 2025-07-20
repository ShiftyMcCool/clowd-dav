import { ProviderRegistry } from '../ProviderRegistry';
import { BaseProvider } from '../BaseProvider';
import { DAVProvider } from '../../types/providers';

// Mock provider for testing
class MockProvider extends BaseProvider {
  name = 'mock';

  async detectServer(baseUrl: string): Promise<boolean> {
    return baseUrl.includes('mock');
  }

  getCalendarDiscoveryPath(): string {
    return '/mock/calendars/';
  }

  getAddressBookDiscoveryPath(): string {
    return '/mock/addressbooks/';
  }
}

// Another mock provider
class AnotherMockProvider extends BaseProvider {
  name = 'another';

  async detectServer(baseUrl: string): Promise<boolean> {
    return baseUrl.includes('another');
  }

  getCalendarDiscoveryPath(): string {
    return '/another/calendars/';
  }

  getAddressBookDiscoveryPath(): string {
    return '/another/addressbooks/';
  }
}

describe('ProviderRegistry', () => {
  let registry: ProviderRegistry;

  beforeEach(() => {
    registry = new ProviderRegistry();
  });

  describe('provider registration', () => {
    it('should register providers', () => {
      registry.registerProvider('mock', MockProvider);
      expect(registry.getProviderNames()).toContain('mock');
    });

    it('should have baikal provider registered by default', () => {
      expect(registry.getProviderNames()).toContain('baikal');
    });

    it('should allow multiple provider registrations', () => {
      registry.registerProvider('mock', MockProvider);
      registry.registerProvider('another', AnotherMockProvider);
      
      const names = registry.getProviderNames();
      expect(names).toContain('mock');
      expect(names).toContain('another');
      expect(names).toContain('baikal');
    });
  });

  describe('provider instantiation', () => {
    beforeEach(() => {
      registry.registerProvider('mock', MockProvider);
    });

    it('should create provider instances', () => {
      const provider = registry.getProvider('mock');
      expect(provider).toBeInstanceOf(MockProvider);
      expect(provider?.name).toBe('mock');
    });

    it('should return null for unknown providers', () => {
      const provider = registry.getProvider('unknown');
      expect(provider).toBeNull();
    });

    it('should cache provider instances', () => {
      const provider1 = registry.getProvider('mock');
      const provider2 = registry.getProvider('mock');
      expect(provider1).toBe(provider2);
    });

    it('should clear cache when requested', () => {
      const provider1 = registry.getProvider('mock');
      registry.clearCache();
      const provider2 = registry.getProvider('mock');
      expect(provider1).not.toBe(provider2);
    });
  });

  describe('provider detection', () => {
    beforeEach(() => {
      registry.registerProvider('mock', MockProvider);
      registry.registerProvider('another', AnotherMockProvider);
    });

    it('should detect compatible provider', async () => {
      const provider = await registry.detectProvider('https://mock-server.com');
      expect(provider).toBeInstanceOf(MockProvider);
    });

    it('should return null when no provider is compatible', async () => {
      const provider = await registry.detectProvider('https://unknown-server.com');
      expect(provider).toBeNull();
    });

    it('should return first compatible provider', async () => {
      // Both providers would match this URL, but mock should be first
      const provider = await registry.detectProvider('https://mock-another-server.com');
      expect(provider).toBeInstanceOf(MockProvider);
    });

    it('should handle provider detection errors gracefully', async () => {
      // Create a provider that throws during detection
      class ErrorProvider extends BaseProvider {
        name = 'error';
        async detectServer(): Promise<boolean> {
          throw new Error('Detection error');
        }
        getCalendarDiscoveryPath(): string { return '/error/'; }
        getAddressBookDiscoveryPath(): string { return '/error/'; }
      }

      registry.registerProvider('error', ErrorProvider);
      
      // Should still work with other providers
      const provider = await registry.detectProvider('https://mock-server.com');
      expect(provider).toBeInstanceOf(MockProvider);
    });
  });

  describe('testAllProviders', () => {
    beforeEach(() => {
      registry.registerProvider('mock', MockProvider);
      registry.registerProvider('another', AnotherMockProvider);
    });

    it('should test all providers', async () => {
      const results = await registry.testAllProviders('https://mock-server.com');
      
      expect(results).toHaveProperty('baikal');
      expect(results).toHaveProperty('mock');
      expect(results).toHaveProperty('another');
      expect(results.mock).toBe(true);
      expect(results.another).toBe(false);
    });

    it('should handle provider errors in testing', async () => {
      class ErrorProvider extends BaseProvider {
        name = 'error';
        async detectServer(): Promise<boolean> {
          throw new Error('Detection error');
        }
        getCalendarDiscoveryPath(): string { return '/error/'; }
        getAddressBookDiscoveryPath(): string { return '/error/'; }
      }

      registry.registerProvider('error', ErrorProvider);
      
      const results = await registry.testAllProviders('https://test-server.com');
      expect(results.error).toBe(false);
    });
  });
});