import { BaseProvider } from './BaseProvider';
import { DAVRequest } from '../types/providers';

/**
 * Baikal DAV server provider implementation
 * Supports Baikal and Sabre/DAV based servers
 */
export class BaikalProvider extends BaseProvider {
  name = 'baikal' as const;

  /**
   * Detect if the server is a Baikal/Sabre server
   * Baikal typically responds with specific headers and URL patterns
   */
  async detectServer(baseUrl: string): Promise<boolean> {
    try {
      const normalizedUrl = this.normalizeUrl(baseUrl);
      
      // Test common Baikal paths
      const testPaths = [
        '/dav.php',
        '/cal.php',
        '/card.php',
        '/.well-known/caldav',
        '/.well-known/carddav'
      ];

      for (const path of testPaths) {
        const testUrl = `${normalizedUrl}${path}`;
        
        // Convert to proxy URL in development
        const requestUrl = process.env.NODE_ENV === 'development' 
          ? new URL(testUrl).pathname 
          : testUrl;
        
        try {
          const response = await fetch(requestUrl, {
            method: 'OPTIONS',
            headers: {
              'Content-Type': 'application/xml',
            },
            mode: 'cors'
          });

          // Check for Sabre/DAV server headers (used by Baikal)
          const serverHeader = response.headers.get('server');
          const davHeader = response.headers.get('dav');
          
          if (serverHeader && serverHeader.toLowerCase().includes('sabre')) {
            return true;
          }
          
          if (davHeader && (davHeader.includes('calendar-access') || davHeader.includes('addressbook'))) {
            return true;
          }

          // If we get a successful response from a typical Baikal path
          if (response.status < 400 && path.includes('.php')) {
            return true;
          }
        } catch (pathError) {
          // Continue to next path
          continue;
        }
      }

      // Fallback: try a basic test request
      return await this.makeTestRequest(normalizedUrl);
    } catch (error) {
      return false;
    }
  }

  /**
   * Get calendar discovery path for Baikal
   * Baikal typically uses /dav.php/calendars/username/ pattern
   */
  getCalendarDiscoveryPath(): string {
    return '/dav.php/calendars/';
  }

  /**
   * Get address book discovery path for Baikal
   * Baikal typically uses /dav.php/addressbooks/username/ pattern
   */
  getAddressBookDiscoveryPath(): string {
    return '/dav.php/addressbooks/';
  }

  /**
   * Customize requests for Baikal-specific requirements
   */
  customizeRequest(request: DAVRequest): DAVRequest {
    // Ensure proper headers for Baikal/Sabre compatibility
    const customizedRequest = { ...request };
    
    if (!customizedRequest.headers) {
      customizedRequest.headers = {};
    }

    // Add User-Agent for better compatibility
    customizedRequest.headers['User-Agent'] = 'Clowd-DAV/1.0';
    
    // Ensure proper Content-Type for DAV requests
    if (customizedRequest.method === 'PROPFIND' || customizedRequest.method === 'REPORT') {
      customizedRequest.headers['Content-Type'] = 'application/xml; charset=utf-8';
    }

    // Remove problematic headers for CORS compatibility
    // The DAV header is often not allowed in CORS preflight responses
    delete customizedRequest.headers['DAV'];

    return customizedRequest;
  }
}