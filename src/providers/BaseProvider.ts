import { DAVProvider, DAVRequest } from '../types/providers';

/**
 * Abstract base class for DAV providers
 * Provides common functionality and enforces interface implementation
 */
export abstract class BaseProvider implements DAVProvider {
  abstract name: string;

  /**
   * Detect if the given URL is compatible with this provider
   */
  abstract detectServer(baseUrl: string): Promise<boolean>;

  /**
   * Get the path for calendar discovery (PROPFIND)
   */
  abstract getCalendarDiscoveryPath(): string;

  /**
   * Get the path for address book discovery (PROPFIND)
   */
  abstract getAddressBookDiscoveryPath(): string;

  /**
   * Optional method to customize requests for provider-specific needs
   */
  customizeRequest?(request: DAVRequest): DAVRequest;

  /**
   * Normalize URL by removing trailing slashes and ensuring proper format
   */
  protected normalizeUrl(url: string): string {
    return url.replace(/\/+$/, '');
  }

  /**
   * Make a test request to check server compatibility
   */
  protected async makeTestRequest(url: string, path: string = ''): Promise<boolean> {
    try {
      const testUrl = `${this.normalizeUrl(url)}${path}`;
      const response = await fetch(testUrl, {
        method: 'OPTIONS',
        headers: {
          'Content-Type': 'application/xml',
        },
      });
      
      return response.status < 500; // Accept any non-server-error response
    } catch (error) {
      return false;
    }
  }
}