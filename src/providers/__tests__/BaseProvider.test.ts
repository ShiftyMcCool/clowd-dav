import { BaseProvider } from '../BaseProvider';
import { DAVProvider } from '../../types/providers';

// Mock implementation for testing
class TestProvider extends BaseProvider {
  name = 'test';

  async detectServer(baseUrl: string): Promise<boolean> {
    return baseUrl.includes('test-server');
  }

  getCalendarDiscoveryPath(): string {
    return '/test/calendars/';
  }

  getAddressBookDiscoveryPath(): string {
    return '/test/addressbooks/';
  }
}

// Mock fetch globally
global.fetch = jest.fn();

describe('BaseProvider', () => {
  let provider: TestProvider;

  beforeEach(() => {
    provider = new TestProvider();
    jest.clearAllMocks();
  });

  describe('normalizeUrl', () => {
    it('should remove trailing slashes', () => {
      const result = (provider as any).normalizeUrl('https://example.com/');
      expect(result).toBe('https://example.com');
    });

    it('should remove multiple trailing slashes', () => {
      const result = (provider as any).normalizeUrl('https://example.com///');
      expect(result).toBe('https://example.com');
    });

    it('should not modify URLs without trailing slashes', () => {
      const result = (provider as any).normalizeUrl('https://example.com');
      expect(result).toBe('https://example.com');
    });
  });

  describe('makeTestRequest', () => {
    it('should return true for successful responses', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        status: 200,
      });

      const result = await (provider as any).makeTestRequest('https://example.com');
      expect(result).toBe(true);
      expect(fetch).toHaveBeenCalledWith('https://example.com', {
        method: 'OPTIONS',
        headers: {
          'Content-Type': 'application/xml',
        },
      });
    });

    it('should return true for client errors (4xx)', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        status: 404,
      });

      const result = await (provider as any).makeTestRequest('https://example.com');
      expect(result).toBe(true);
    });

    it('should return false for server errors (5xx)', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        status: 500,
      });

      const result = await (provider as any).makeTestRequest('https://example.com');
      expect(result).toBe(false);
    });

    it('should return false for network errors', async () => {
      (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const result = await (provider as any).makeTestRequest('https://example.com');
      expect(result).toBe(false);
    });

    it('should append path to URL', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        status: 200,
      });

      await (provider as any).makeTestRequest('https://example.com', '/test');
      expect(fetch).toHaveBeenCalledWith('https://example.com/test', expect.any(Object));
    });
  });

  describe('abstract methods implementation', () => {
    it('should implement all required methods', () => {
      expect(provider.name).toBe('test');
      expect(typeof provider.detectServer).toBe('function');
      expect(typeof provider.getCalendarDiscoveryPath).toBe('function');
      expect(typeof provider.getAddressBookDiscoveryPath).toBe('function');
    });

    it('should return correct discovery paths', () => {
      expect(provider.getCalendarDiscoveryPath()).toBe('/test/calendars/');
      expect(provider.getAddressBookDiscoveryPath()).toBe('/test/addressbooks/');
    });

    it('should detect test servers', async () => {
      const result = await provider.detectServer('https://test-server.com');
      expect(result).toBe(true);
    });

    it('should not detect non-test servers', async () => {
      const result = await provider.detectServer('https://other-server.com');
      expect(result).toBe(false);
    });
  });
});