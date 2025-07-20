import { ProviderFactory, detectProviderForServer, createProvider } from '../ProviderFactory';
import { BaseProvider } from '../BaseProvider';

// Mock provider for testing
class TestProvider extends BaseProvider {
  name = 'test';

  async detectServer(baseUrl: string): Promise<boolean> {
    return baseUrl.includes('test');
  }

  getCalendarDiscoveryPath(): string {
    return '/test/calendars/';
  }

  getAddressBookDiscoveryPath(): string {
    return '/test/addressbooks/';
  }
}

// Mock the provider registry
jest.mock('../ProviderRegistry', () => {
  const mockRegistry = {
    getProvider: jest.fn(),
    getProviderNames: jest.fn(),
    detectProvider: jest.fn(),
    testAllProviders: jest.fn(),
    registerProvider: jest.fn(),
    clearCache: jest.fn(),
  };

  return {
    providerRegistry: mockRegistry,
  };
});

import { providerRegistry } from '../ProviderRegistry';

describe('ProviderFactory', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createProvider', () => {
    it('should delegate to registry getProvider', () => {
      const mockProvider = new TestProvider();
      (providerRegistry.getProvider as jest.Mock).mockReturnValue(mockProvider);

      const result = ProviderFactory.createProvider('test');
      
      expect(providerRegistry.getProvider).toHaveBeenCalledWith('test');
      expect(result).toBe(mockProvider);
    });

    it('should return null for unknown providers', () => {
      (providerRegistry.getProvider as jest.Mock).mockReturnValue(null);

      const result = ProviderFactory.createProvider('unknown');
      
      expect(result).toBeNull();
    });
  });

  describe('createProviderForServer', () => {
    it('should delegate to registry detectProvider', async () => {
      const mockProvider = new TestProvider();
      (providerRegistry.detectProvider as jest.Mock).mockResolvedValue(mockProvider);

      const result = await ProviderFactory.createProviderForServer('https://test-server.com');
      
      expect(providerRegistry.detectProvider).toHaveBeenCalledWith('https://test-server.com');
      expect(result).toBe(mockProvider);
    });

    it('should return null when no provider is detected', async () => {
      (providerRegistry.detectProvider as jest.Mock).mockResolvedValue(null);

      const result = await ProviderFactory.createProviderForServer('https://unknown-server.com');
      
      expect(result).toBeNull();
    });
  });

  describe('getAvailableProviders', () => {
    it('should delegate to registry getProviderNames', () => {
      const mockNames = ['baikal', 'test'];
      (providerRegistry.getProviderNames as jest.Mock).mockReturnValue(mockNames);

      const result = ProviderFactory.getAvailableProviders();
      
      expect(providerRegistry.getProviderNames).toHaveBeenCalled();
      expect(result).toBe(mockNames);
    });
  });

  describe('testServerCompatibility', () => {
    it('should delegate to registry testAllProviders', async () => {
      const mockResults = { baikal: false, test: true };
      (providerRegistry.testAllProviders as jest.Mock).mockResolvedValue(mockResults);

      const result = await ProviderFactory.testServerCompatibility('https://test-server.com');
      
      expect(providerRegistry.testAllProviders).toHaveBeenCalledWith('https://test-server.com');
      expect(result).toBe(mockResults);
    });
  });

  describe('registerProvider', () => {
    it('should delegate to registry registerProvider', () => {
      ProviderFactory.registerProvider('test', TestProvider);
      
      expect(providerRegistry.registerProvider).toHaveBeenCalledWith('test', TestProvider);
    });
  });

  describe('clearCache', () => {
    it('should delegate to registry clearCache', () => {
      ProviderFactory.clearCache();
      
      expect(providerRegistry.clearCache).toHaveBeenCalled();
    });
  });
});

describe('convenience functions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('detectProviderForServer', () => {
    it('should call ProviderFactory.createProviderForServer', async () => {
      const mockProvider = new TestProvider();
      (providerRegistry.detectProvider as jest.Mock).mockResolvedValue(mockProvider);

      const result = await detectProviderForServer('https://test-server.com');
      
      expect(providerRegistry.detectProvider).toHaveBeenCalledWith('https://test-server.com');
      expect(result).toBe(mockProvider);
    });
  });

  describe('createProvider', () => {
    it('should call ProviderFactory.createProvider', () => {
      const mockProvider = new TestProvider();
      (providerRegistry.getProvider as jest.Mock).mockReturnValue(mockProvider);

      const result = createProvider('test');
      
      expect(providerRegistry.getProvider).toHaveBeenCalledWith('test');
      expect(result).toBe(mockProvider);
    });
  });
});