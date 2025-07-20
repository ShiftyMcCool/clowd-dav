import { DAVClient } from '../DAVClient';
import { DAVProvider } from '../../types/providers';
import { AuthConfig } from '../../types/auth';
import { Calendar, DateRange } from '../../types/dav';

// Mock fetch globally
global.fetch = jest.fn();

describe('DAVClient', () => {
  let davClient: DAVClient;
  let mockFetch: jest.MockedFunction<typeof fetch>;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    mockFetch = fetch as jest.MockedFunction<typeof fetch>;
    davClient = new DAVClient();
  });

  describe('constructor', () => {
    it('should create DAVClient instance', () => {
      expect(davClient).toBeInstanceOf(DAVClient);
    });
  });

  describe('setAuthConfig', () => {
    it('should store authentication configuration', () => {
      const authConfig: AuthConfig = {
        caldavUrl: 'https://example.com/caldav',
        carddavUrl: 'https://example.com/carddav',
        username: 'testuser',
        password: 'testpass'
      };

      davClient.setAuthConfig(authConfig);
      
      // We can't directly test private properties, but we can test the behavior
      // by checking if auth is added to requests (tested in HTTP method tests)
    });
  });

  describe('setProvider', () => {
    it('should store DAV provider', () => {
      const mockProvider: DAVProvider = {
        name: 'test-provider',
        detectServer: jest.fn(),
        getCalendarDiscoveryPath: jest.fn(),
        getAddressBookDiscoveryPath: jest.fn(),
        customizeRequest: jest.fn()
      };

      davClient.setProvider(mockProvider);
      
      // Provider behavior will be tested in HTTP method tests
    });
  });

  describe('HTTP methods', () => {
    beforeEach(() => {
      // Setup common mock response
      const mockResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        text: jest.fn().mockResolvedValue('<xml>test</xml>'),
        headers: new Map([['content-type', 'application/xml']])
      };
      
      mockFetch.mockResolvedValue(mockResponse as any);
    });

    describe('get', () => {
      it('should make GET request and return DAVResponse', async () => {
        const url = 'https://example.com/test';
        const headers = { 'Custom-Header': 'value' };

        const response = await davClient.get(url, headers);

        expect(mockFetch).toHaveBeenCalledWith(url, {
          method: 'GET',
          headers: expect.objectContaining({
            'Content-Type': 'application/xml; charset=utf-8',
            'User-Agent': 'CalDAV-CardDAV-Client/1.0',
            'DAV': '1, 2, 3, calendar-access, addressbook',
            'Prefer': 'return-minimal',
            'Custom-Header': 'value'
          })
        });
        
        expect(response).toEqual({
          status: 200,
          data: '<xml>test</xml>',
          headers: { 'content-type': 'application/xml' }
        });
      });
    });

    describe('put', () => {
      it('should make PUT request with data and return DAVResponse', async () => {
        const url = 'https://example.com/test';
        const data = '<xml>put data</xml>';
        const headers = { 'Custom-Header': 'value' };

        const response = await davClient.put(url, data, headers);

        expect(mockFetch).toHaveBeenCalledWith(url, {
          method: 'PUT',
          body: data,
          headers: expect.objectContaining({
            'Content-Type': 'application/xml; charset=utf-8',
            'User-Agent': 'CalDAV-CardDAV-Client/1.0',
            'DAV': '1, 2, 3, calendar-access, addressbook',
            'Prefer': 'return-minimal',
            'Custom-Header': 'value'
          })
        });
        
        expect(response).toEqual({
          status: 200,
          data: '<xml>test</xml>',
          headers: { 'content-type': 'application/xml' }
        });
      });
    });

    describe('post', () => {
      it('should make POST request with data and return DAVResponse', async () => {
        const url = 'https://example.com/test';
        const data = '<xml>post data</xml>';
        const headers = { 'Custom-Header': 'value' };

        const response = await davClient.post(url, data, headers);

        expect(mockFetch).toHaveBeenCalledWith(url, {
          method: 'POST',
          body: data,
          headers: expect.objectContaining({
            'Content-Type': 'application/xml; charset=utf-8',
            'User-Agent': 'CalDAV-CardDAV-Client/1.0',
            'DAV': '1, 2, 3, calendar-access, addressbook',
            'Prefer': 'return-minimal',
            'Custom-Header': 'value'
          })
        });
        
        expect(response).toEqual({
          status: 200,
          data: '<xml>test</xml>',
          headers: { 'content-type': 'application/xml' }
        });
      });
    });

    describe('delete', () => {
      it('should make DELETE request and return DAVResponse', async () => {
        const url = 'https://example.com/test';
        const headers = { 'Custom-Header': 'value' };

        const response = await davClient.delete(url, headers);

        expect(mockFetch).toHaveBeenCalledWith(url, {
          method: 'DELETE',
          headers: expect.objectContaining({
            'Content-Type': 'application/xml; charset=utf-8',
            'User-Agent': 'CalDAV-CardDAV-Client/1.0',
            'DAV': '1, 2, 3, calendar-access, addressbook',
            'Prefer': 'return-minimal',
            'Custom-Header': 'value'
          })
        });
        
        expect(response).toEqual({
          status: 200,
          data: '<xml>test</xml>',
          headers: { 'content-type': 'application/xml' }
        });
      });
    });

    describe('propfind', () => {
      it('should make PROPFIND request with correct headers', async () => {
        const url = 'https://example.com/test';
        const data = '<propfind>test</propfind>';
        const depth = '1';
        const customHeaders = { 'Custom-Header': 'value' };

        const response = await davClient.propfind(url, data, depth, customHeaders);

        expect(mockFetch).toHaveBeenCalledWith(url, {
          method: 'PROPFIND',
          body: data,
          headers: expect.objectContaining({
            'Content-Type': 'application/xml; charset=utf-8',
            'User-Agent': 'CalDAV-CardDAV-Client/1.0',
            'DAV': '1, 2, 3, calendar-access, addressbook',
            'Prefer': 'return-minimal',
            'Depth': '1',
            'Custom-Header': 'value'
          })
        });
        
        expect(response).toEqual({
          status: 200,
          data: '<xml>test</xml>',
          headers: { 'content-type': 'application/xml' }
        });
      });

      it('should use default depth of 1 when not specified', async () => {
        const url = 'https://example.com/test';
        const data = '<propfind>test</propfind>';

        await davClient.propfind(url, data);

        expect(mockFetch).toHaveBeenCalledWith(url, {
          method: 'PROPFIND',
          body: data,
          headers: expect.objectContaining({
            'Depth': '1'
          })
        });
      });
    });

    describe('report', () => {
      it('should make REPORT request with correct headers', async () => {
        const url = 'https://example.com/test';
        const data = '<report>test</report>';
        const customHeaders = { 'Custom-Header': 'value' };

        const response = await davClient.report(url, data, customHeaders);

        expect(mockFetch).toHaveBeenCalledWith(url, {
          method: 'REPORT',
          body: data,
          headers: expect.objectContaining({
            'Content-Type': 'application/xml; charset=utf-8',
            'User-Agent': 'CalDAV-CardDAV-Client/1.0',
            'DAV': '1, 2, 3, calendar-access, addressbook',
            'Prefer': 'return-minimal',
            'Depth': '1',
            'Custom-Header': 'value'
          })
        });
        
        expect(response).toEqual({
          status: 200,
          data: '<xml>test</xml>',
          headers: { 'content-type': 'application/xml' }
        });
      });
    });

    describe('authentication', () => {
      it('should add Basic authentication header when auth config is set', async () => {
        const authConfig: AuthConfig = {
          caldavUrl: 'https://example.com/caldav',
          carddavUrl: 'https://example.com/carddav',
          username: 'testuser',
          password: 'testpass'
        };

        davClient.setAuthConfig(authConfig);

        await davClient.get('https://example.com/test');

        const expectedAuth = btoa('testuser:testpass');
        expect(mockFetch).toHaveBeenCalledWith('https://example.com/test', {
          method: 'GET',
          headers: expect.objectContaining({
            'Authorization': `Basic ${expectedAuth}`
          })
        });
      });
    });

    describe('provider customization', () => {
      it('should allow provider to customize requests', async () => {
        const mockProvider: DAVProvider = {
          name: 'test-provider',
          detectServer: jest.fn(),
          getCalendarDiscoveryPath: jest.fn(),
          getAddressBookDiscoveryPath: jest.fn(),
          customizeRequest: jest.fn().mockImplementation((request) => ({
            ...request,
            headers: {
              ...request.headers,
              'X-Custom-Header': 'provider-value'
            }
          }))
        };

        davClient.setProvider(mockProvider);

        await davClient.get('https://example.com/test');

        expect(mockProvider.customizeRequest).toHaveBeenCalledWith({
          method: 'GET',
          url: 'https://example.com/test',
          headers: expect.any(Object),
          data: undefined
        });

        expect(mockFetch).toHaveBeenCalledWith('https://example.com/test', {
          method: 'GET',
          headers: expect.objectContaining({
            'X-Custom-Header': 'provider-value'
          })
        });
      });
    });
  });

  describe('error handling', () => {
    it('should handle 401 authentication errors', async () => {
      const mockResponse = {
        ok: false,
        status: 401,
        statusText: 'Unauthorized'
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      await expect(davClient.get('https://example.com/test')).rejects.toThrow(
        'Authentication failed. Please check your credentials.'
      );
    });

    it('should handle 403 forbidden errors', async () => {
      const mockResponse = {
        ok: false,
        status: 403,
        statusText: 'Forbidden'
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      await expect(davClient.get('https://example.com/test')).rejects.toThrow(
        'Access forbidden. You may not have permission to access this resource.'
      );
    });

    it('should handle 404 not found errors', async () => {
      const mockResponse = {
        ok: false,
        status: 404,
        statusText: 'Not Found'
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      await expect(davClient.get('https://example.com/test')).rejects.toThrow(
        'Resource not found. Please check the server URL.'
      );
    });

    it('should handle 500 server errors', async () => {
      const mockResponse = {
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      await expect(davClient.get('https://example.com/test')).rejects.toThrow(
        'Server error. Please try again later.'
      );
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValue(new Error('Network Error'));

      await expect(davClient.get('https://example.com/test')).rejects.toThrow(
        'Network error. Please check your connection and server URL.'
      );
    });

    it('should handle other HTTP status codes', async () => {
      const mockResponse = {
        ok: false,
        status: 418,
        statusText: "I'm a teapot"
      };
      mockFetch.mockResolvedValue(mockResponse as any);

      await expect(davClient.get('https://example.com/test')).rejects.toThrow(
        "Server error (418): I'm a teapot"
      );
    });
  });

  describe('calendar discovery', () => {
    beforeEach(() => {
      const mockProvider = {
        name: 'test-provider',
        detectServer: jest.fn(),
        getCalendarDiscoveryPath: jest.fn().mockReturnValue('/dav.php/calendars/'),
        getAddressBookDiscoveryPath: jest.fn(),
        customizeRequest: jest.fn()
      };
      
      const authConfig: AuthConfig = {
        caldavUrl: 'https://example.com/dav.php',
        carddavUrl: 'https://example.com/dav.php',
        username: 'testuser',
        password: 'testpass'
      };
      
      davClient.setProvider(mockProvider);
      davClient.setAuthConfig(authConfig);
    });

    it('should discover calendars successfully', async () => {
      const mockXmlResponse = `<?xml version="1.0" encoding="utf-8"?>
<d:multistatus xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav">
  <d:response>
    <d:href>/dav.php/calendars/testuser/personal/</d:href>
    <d:propstat>
      <d:prop>
        <d:displayname>Personal Calendar</d:displayname>
        <d:resourcetype>
          <d:collection/>
          <c:calendar/>
        </d:resourcetype>
        <c:calendar-color>#FF0000</c:calendar-color>
      </d:prop>
      <d:status>HTTP/1.1 200 OK</d:status>
    </d:propstat>
  </d:response>
  <d:response>
    <d:href>/dav.php/calendars/testuser/work/</d:href>
    <d:propstat>
      <d:prop>
        <d:displayname>Work Calendar</d:displayname>
        <d:resourcetype>
          <d:collection/>
          <c:calendar/>
        </d:resourcetype>
      </d:prop>
      <d:status>HTTP/1.1 200 OK</d:status>
    </d:propstat>
  </d:response>
</d:multistatus>`;

      const mockResponse = {
        ok: true,
        status: 207,
        statusText: 'Multi-Status',
        text: jest.fn().mockResolvedValue(mockXmlResponse),
        headers: new Map([['content-type', 'application/xml']])
      };
      
      mockFetch.mockResolvedValue(mockResponse as any);

      const calendars = await davClient.discoverCalendars();

      expect(calendars).toHaveLength(2);
      expect(calendars[0]).toEqual({
        url: 'https://example.com/dav.php/calendars/testuser/personal/',
        displayName: 'Personal Calendar',
        color: '#FF0000'
      });
      expect(calendars[1]).toEqual({
        url: 'https://example.com/dav.php/calendars/testuser/work/',
        displayName: 'Work Calendar',
        color: undefined
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://example.com/dav.php/calendars/testuser/',
        expect.objectContaining({
          method: 'PROPFIND',
          headers: expect.objectContaining({
            'Depth': '1'
          })
        })
      );
    });

    it('should throw error when provider is not set', async () => {
      davClient.setProvider(null as any);
      
      await expect(davClient.discoverCalendars()).rejects.toThrow(
        'Provider not set. Please set a provider before discovering calendars.'
      );
    });

    it('should throw error when auth config is not set', async () => {
      davClient.setAuthConfig(null as any);
      
      await expect(davClient.discoverCalendars()).rejects.toThrow(
        'Authentication not configured. Please set auth config before discovering calendars.'
      );
    });

    it('should handle calendar discovery errors', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));
      
      await expect(davClient.discoverCalendars()).rejects.toThrow(
        'Calendar discovery failed: Network error. Please check your connection and server URL.'
      );
    });

    it('should handle malformed XML response', async () => {
      const mockResponse = {
        ok: true,
        status: 207,
        statusText: 'Multi-Status',
        text: jest.fn().mockResolvedValue('invalid xml'),
        headers: new Map([['content-type', 'application/xml']])
      };
      
      mockFetch.mockResolvedValue(mockResponse as any);

      await expect(davClient.discoverCalendars()).rejects.toThrow(
        'Failed to parse calendar discovery response:'
      );
    });
  });

  describe('calendar events retrieval', () => {
    beforeEach(() => {
      const authConfig: AuthConfig = {
        caldavUrl: 'https://example.com/dav.php',
        carddavUrl: 'https://example.com/dav.php',
        username: 'testuser',
        password: 'testpass'
      };
      
      davClient.setAuthConfig(authConfig);
    });

    it('should retrieve calendar events successfully', async () => {
      const mockXmlResponse = `<?xml version="1.0" encoding="utf-8"?>
<d:multistatus xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav">
  <d:response>
    <d:href>/dav.php/calendars/testuser/personal/event1.ics</d:href>
    <d:propstat>
      <d:prop>
        <d:getetag>"12345"</d:getetag>
        <c:calendar-data>BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Test//Test//EN
BEGIN:VEVENT
UID:event1@example.com
DTSTART:20250720T100000Z
DTEND:20250720T110000Z
SUMMARY:Test Event
DESCRIPTION:Test Description
LOCATION:Test Location
END:VEVENT
END:VCALENDAR</c:calendar-data>
      </d:prop>
      <d:status>HTTP/1.1 200 OK</d:status>
    </d:propstat>
  </d:response>
</d:multistatus>`;

      const mockResponse = {
        ok: true,
        status: 207,
        statusText: 'Multi-Status',
        text: jest.fn().mockResolvedValue(mockXmlResponse),
        headers: new Map([['content-type', 'application/xml']])
      };
      
      mockFetch.mockResolvedValue(mockResponse as any);

      const calendar: Calendar = {
        url: 'https://example.com/dav.php/calendars/testuser/personal/',
        displayName: 'Personal Calendar'
      };

      const dateRange: DateRange = {
        start: new Date('2025-07-20T00:00:00Z'),
        end: new Date('2025-07-21T00:00:00Z')
      };

      const events = await davClient.getEvents(calendar, dateRange);

      expect(events).toHaveLength(1);
      expect(events[0]).toEqual({
        uid: 'event1@example.com',
        summary: 'Test Event',
        description: 'Test Description',
        dtstart: new Date('2025-07-20T10:00:00Z'),
        dtend: new Date('2025-07-20T11:00:00Z'),
        location: 'Test Location',
        etag: '12345'
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://example.com/dav.php/calendars/testuser/personal/',
        expect.objectContaining({
          method: 'REPORT',
          headers: expect.objectContaining({
            'Depth': '1'
          })
        })
      );
    });

    it('should throw error when auth config is not set', async () => {
      davClient.setAuthConfig(null as any);
      
      const calendar: Calendar = {
        url: 'https://example.com/test',
        displayName: 'Test Calendar'
      };
      
      const dateRange: DateRange = {
        start: new Date(),
        end: new Date()
      };
      
      await expect(davClient.getEvents(calendar, dateRange)).rejects.toThrow(
        'Authentication not configured. Please set auth config before retrieving events.'
      );
    });

    it('should handle event retrieval errors', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));
      
      const calendar: Calendar = {
        url: 'https://example.com/test',
        displayName: 'Test Calendar'
      };
      
      const dateRange: DateRange = {
        start: new Date(),
        end: new Date()
      };
      
      await expect(davClient.getEvents(calendar, dateRange)).rejects.toThrow(
        'Event retrieval failed: Network error. Please check your connection and server URL.'
      );
    });

    it('should handle malformed iCalendar data gracefully', async () => {
      const mockXmlResponse = `<?xml version="1.0" encoding="utf-8"?>
<d:multistatus xmlns:d="DAV:" xmlns:c="urn:ietf:params:xml:ns:caldav">
  <d:response>
    <d:href>/dav.php/calendars/testuser/personal/event1.ics</d:href>
    <d:propstat>
      <d:prop>
        <d:getetag>"12345"</d:getetag>
        <c:calendar-data>INVALID ICAL DATA</c:calendar-data>
      </d:prop>
      <d:status>HTTP/1.1 200 OK</d:status>
    </d:propstat>
  </d:response>
</d:multistatus>`;

      const mockResponse = {
        ok: true,
        status: 207,
        statusText: 'Multi-Status',
        text: jest.fn().mockResolvedValue(mockXmlResponse),
        headers: new Map([['content-type', 'application/xml']])
      };
      
      mockFetch.mockResolvedValue(mockResponse as any);

      const calendar: Calendar = {
        url: 'https://example.com/test',
        displayName: 'Test Calendar'
      };
      
      const dateRange: DateRange = {
        start: new Date(),
        end: new Date()
      };

      // Should not throw error but return empty array (malformed events are skipped)
      const events = await davClient.getEvents(calendar, dateRange);
      expect(events).toHaveLength(0);
    });
  });

  describe('placeholder methods', () => {
    it('should throw not implemented error for discoverAddressBooks', async () => {
      await expect(davClient.discoverAddressBooks()).rejects.toThrow(
        'Not implemented yet - will be implemented in task 6'
      );
    });

    it('should throw not implemented error for getContacts', async () => {
      const addressBook = { url: 'test', displayName: 'test' };
      
      await expect(davClient.getContacts(addressBook)).rejects.toThrow(
        'Not implemented yet - will be implemented in task 6'
      );
    });

    it('should throw not implemented error for createEvent', async () => {
      const calendar = { url: 'test', displayName: 'test' };
      const event = { uid: 'test', summary: 'test', dtstart: new Date(), dtend: new Date() };
      
      await expect(davClient.createEvent(calendar, event)).rejects.toThrow(
        'Not implemented yet - will be implemented in task 9'
      );
    });

    it('should throw not implemented error for updateEvent', async () => {
      const calendar = { url: 'test', displayName: 'test' };
      const event = { uid: 'test', summary: 'test', dtstart: new Date(), dtend: new Date() };
      
      await expect(davClient.updateEvent(calendar, event)).rejects.toThrow(
        'Not implemented yet - will be implemented in task 9'
      );
    });

    it('should throw not implemented error for createContact', async () => {
      const addressBook = { url: 'test', displayName: 'test' };
      const contact = { uid: 'test', fn: 'test' };
      
      await expect(davClient.createContact(addressBook, contact)).rejects.toThrow(
        'Not implemented yet - will be implemented in task 10'
      );
    });

    it('should throw not implemented error for updateContact', async () => {
      const addressBook = { url: 'test', displayName: 'test' };
      const contact = { uid: 'test', fn: 'test' };
      
      await expect(davClient.updateContact(addressBook, contact)).rejects.toThrow(
        'Not implemented yet - will be implemented in task 10'
      );
    });
  });
});