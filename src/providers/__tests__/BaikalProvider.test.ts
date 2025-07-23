import { BaikalProvider } from '../BaikalProvider';

// Mock fetch globally
global.fetch = jest.fn();

describe('BaikalProvider', () => {
  let provider: BaikalProvider;

  beforeEach(() => {
    provider = new BaikalProvider();
    jest.clearAllMocks();
  });

  describe('basic properties', () => {
    it('should have correct name', () => {
      expect(provider.name).toBe('baikal');
    });

    it('should return correct discovery paths', () => {
      expect(provider.getCalendarDiscoveryPath()).toBe('/dav.php/calendars/');
      expect(provider.getAddressBookDiscoveryPath()).toBe('/dav.php/addressbooks/');
    });
  });

  describe('detectServer', () => {
    it('should detect server with Sabre header', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        status: 200,
        headers: {
          get: jest.fn((header: string) => {
            if (header === 'server') return 'sabre/dav 4.0.0';
            return null;
          }),
        },
      });

      const result = await provider.detectServer('https://example.com');
      expect(result).toBe(true);
    });

    it('should detect server with DAV calendar-access header', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        status: 200,
        headers: {
          get: jest.fn((header: string) => {
            if (header === 'dav') return '1, 2, calendar-access';
            return null;
          }),
        },
      });

      const result = await provider.detectServer('https://example.com');
      expect(result).toBe(true);
    });

    it('should detect server with DAV addressbook header', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        status: 200,
        headers: {
          get: jest.fn((header: string) => {
            if (header === 'dav') return '1, 2, addressbook';
            return null;
          }),
        },
      });

      const result = await provider.detectServer('https://example.com');
      expect(result).toBe(true);
    });

    it('should detect server with .php path and successful response', async () => {
      (fetch as jest.Mock)
        .mockRejectedValueOnce(new Error('Not found')) // /dav.php
        .mockResolvedValueOnce({
          status: 200,
          headers: {
            get: jest.fn(() => null),
          },
        }); // /cal.php

      const result = await provider.detectServer('https://example.com');
      expect(result).toBe(true);
    });

    it('should fallback to basic test request', async () => {
      // Mock all specific path tests to fail
      (fetch as jest.Mock)
        .mockRejectedValueOnce(new Error('Not found')) // /dav.php
        .mockRejectedValueOnce(new Error('Not found')) // /cal.php
        .mockRejectedValueOnce(new Error('Not found')) // /card.php
        .mockRejectedValueOnce(new Error('Not found')) // /.well-known/caldav
        .mockRejectedValueOnce(new Error('Not found')) // /.well-known/carddav
        .mockResolvedValueOnce({
          status: 200,
        }); // fallback test

      const result = await provider.detectServer('https://example.com');
      expect(result).toBe(true);
    });

    it('should return false when all tests fail', async () => {
      (fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      const result = await provider.detectServer('https://example.com');
      expect(result).toBe(false);
    });

    it('should normalize URL before testing', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        status: 200,
        headers: {
          get: jest.fn((header: string) => {
            if (header === 'server') return 'sabre/dav 4.0.0';
            return null;
          }),
        },
      });

      await provider.detectServer('https://example.com/');
      
      // Check that the first call was made with normalized URL
      expect(fetch).toHaveBeenCalledWith(
        'https://example.com/dav.php',
        expect.any(Object)
      );
    });
  });

  describe('customizeRequest', () => {
    it('should add User-Agent header', () => {
      const request = {
        method: 'GET',
        url: 'https://example.com',
      };

      const customized = provider.customizeRequest(request);
      expect(customized.headers?.['User-Agent']).toBe('Clowd-DAV/1.0');
    });

    it('should set Content-Type for PROPFIND requests', () => {
      const request = {
        method: 'PROPFIND',
        url: 'https://example.com',
      };

      const customized = provider.customizeRequest(request);
      expect(customized.headers?.['Content-Type']).toBe('application/xml; charset=utf-8');
    });

    it('should set Content-Type for REPORT requests', () => {
      const request = {
        method: 'REPORT',
        url: 'https://example.com',
      };

      const customized = provider.customizeRequest(request);
      expect(customized.headers?.['Content-Type']).toBe('application/xml; charset=utf-8');
    });

    it('should preserve existing headers', () => {
      const request = {
        method: 'GET',
        url: 'https://example.com',
        headers: {
          'Authorization': 'Basic dGVzdA==',
        },
      };

      const customized = provider.customizeRequest(request);
      expect(customized.headers?.['Authorization']).toBe('Basic dGVzdA==');
      expect(customized.headers?.['User-Agent']).toBe('Clowd-DAV/1.0');
    });

    it('should not modify original request object', () => {
      const request = {
        method: 'GET',
        url: 'https://example.com',
      };

      const customized = provider.customizeRequest(request);
      expect(customized).not.toBe(request);
      expect(request.headers).toBeUndefined();
    });
  });
});