import { DAVClient } from '../DAVClient';
import { DAVProvider } from '../../types/providers';
import { AuthConfig } from '../../types/auth';
import { Calendar, AddressBook, DateRange } from '../../types/dav';

// Mock fetch globally
const mockFetch = jest.fn();
global.fetch = mockFetch;

describe('DAVClient', () => {
  let davClient: DAVClient;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
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

  describe('address book discovery', () => {
    beforeEach(() => {
      // Setup common mock response
      const mockResponse = {
        ok: true,
        status: 207,
        statusText: 'Multi-Status',
        text: jest.fn().mockResolvedValue('<xml>test</xml>'),
        headers: new Map([['content-type', 'application/xml']])
      };
      
      mockFetch.mockResolvedValue(mockResponse as any);

      const mockProvider = {
        name: 'test-provider',
        detectServer: jest.fn(),
        getCalendarDiscoveryPath: jest.fn(),
        getAddressBookDiscoveryPath: jest.fn().mockReturnValue('/dav.php/addressbooks/'),
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

    it('should discover address books successfully', async () => {
      const mockXmlResponse = `<?xml version="1.0" encoding="utf-8"?>
<d:multistatus xmlns:d="DAV:" xmlns:card="urn:ietf:params:xml:ns:carddav">
  <d:response>
    <d:href>/dav.php/addressbooks/testuser/contacts/</d:href>
    <d:propstat>
      <d:prop>
        <d:displayname>Personal Contacts</d:displayname>
        <d:resourcetype>
          <d:collection/>
          <card:addressbook/>
        </d:resourcetype>
        <card:addressbook-description>My personal contacts</card:addressbook-description>
      </d:prop>
      <d:status>HTTP/1.1 200 OK</d:status>
    </d:propstat>
  </d:response>
  <d:response>
    <d:href>/dav.php/addressbooks/testuser/work/</d:href>
    <d:propstat>
      <d:prop>
        <d:displayname>Work Contacts</d:displayname>
        <d:resourcetype>
          <d:collection/>
          <card:addressbook/>
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

      const addressBooks = await davClient.discoverAddressBooks();

      expect(addressBooks).toHaveLength(2);
      expect(addressBooks[0]).toEqual({
        url: 'https://example.com/dav.php/addressbooks/testuser/contacts/',
        displayName: 'Personal Contacts'
      });
      expect(addressBooks[1]).toEqual({
        url: 'https://example.com/dav.php/addressbooks/testuser/work/',
        displayName: 'Work Contacts'
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://example.com/dav.php/addressbooks/testuser/',
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
      
      await expect(davClient.discoverAddressBooks()).rejects.toThrow(
        'Provider not set. Please set a provider before discovering address books.'
      );
    });

    it('should throw error when auth config is not set', async () => {
      davClient.setAuthConfig(null as any);
      
      await expect(davClient.discoverAddressBooks()).rejects.toThrow(
        'Authentication not configured. Please set auth config before discovering address books.'
      );
    });

    it('should handle address book discovery errors', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));
      
      await expect(davClient.discoverAddressBooks()).rejects.toThrow(
        'Address book discovery failed: Network error. Please check your connection and server URL.'
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

      await expect(davClient.discoverAddressBooks()).rejects.toThrow(
        'Failed to parse address book discovery response:'
      );
    });
  });

  describe('contacts retrieval', () => {
    beforeEach(() => {
      const authConfig: AuthConfig = {
        caldavUrl: 'https://example.com/dav.php',
        carddavUrl: 'https://example.com/dav.php',
        username: 'testuser',
        password: 'testpass'
      };
      
      davClient.setAuthConfig(authConfig);
    });

    it('should retrieve contacts successfully', async () => {
      const mockXmlResponse = `<?xml version="1.0" encoding="utf-8"?>
<d:multistatus xmlns:d="DAV:" xmlns:card="urn:ietf:params:xml:ns:carddav">
  <d:response>
    <d:href>/dav.php/addressbooks/testuser/contacts/contact1.vcf</d:href>
    <d:propstat>
      <d:prop>
        <d:getetag>"12345"</d:getetag>
        <card:address-data>BEGIN:VCARD
VERSION:3.0
UID:contact1@example.com
FN:John Doe
EMAIL:john@example.com
TEL:+1234567890
ORG:Example Corp
END:VCARD</card:address-data>
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

      const addressBook = {
        url: 'https://example.com/dav.php/addressbooks/testuser/contacts/',
        displayName: 'Personal Contacts'
      };

      const contacts = await davClient.getContacts(addressBook);

      expect(contacts).toHaveLength(1);
      expect(contacts[0]).toEqual({
        uid: 'contact1@example.com',
        fn: 'John Doe',
        email: ['john@example.com'],
        tel: ['+1234567890'],
        org: 'Example Corp',
        etag: '12345'
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://example.com/dav.php/addressbooks/testuser/contacts/',
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
      
      const addressBook = {
        url: 'https://example.com/test',
        displayName: 'Test Address Book'
      };
      
      await expect(davClient.getContacts(addressBook)).rejects.toThrow(
        'Authentication not configured. Please set auth config before retrieving contacts.'
      );
    });

    it('should handle contact retrieval errors', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));
      
      const addressBook = {
        url: 'https://example.com/test',
        displayName: 'Test Address Book'
      };
      
      await expect(davClient.getContacts(addressBook)).rejects.toThrow(
        'Contact retrieval failed: Network error. Please check your connection and server URL.'
      );
    });

    it('should handle malformed vCard data gracefully', async () => {
      const mockXmlResponse = `<?xml version="1.0" encoding="utf-8"?>
<d:multistatus xmlns:d="DAV:" xmlns:card="urn:ietf:params:xml:ns:carddav">
  <d:response>
    <d:href>/dav.php/addressbooks/testuser/contacts/contact1.vcf</d:href>
    <d:propstat>
      <d:prop>
        <d:getetag>"12345"</d:getetag>
        <card:address-data>INVALID VCARD DATA</card:address-data>
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

      const addressBook = {
        url: 'https://example.com/test',
        displayName: 'Test Address Book'
      };

      // Should not throw error but return empty array (malformed contacts are skipped)
      const contacts = await davClient.getContacts(addressBook);
      expect(contacts).toHaveLength(0);
    });

    it('should handle contacts with missing properties', async () => {
      const mockXmlResponse = `<?xml version="1.0" encoding="utf-8"?>
<d:multistatus xmlns:d="DAV:" xmlns:card="urn:ietf:params:xml:ns:carddav">
  <d:response>
    <d:href>/dav.php/addressbooks/testuser/contacts/contact1.vcf</d:href>
    <d:propstat>
      <d:prop>
        <d:getetag>"12345"</d:getetag>
        <card:address-data>BEGIN:VCARD
VERSION:3.0
UID:contact1@example.com
FN:John Doe
END:VCARD</card:address-data>
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

      const addressBook = {
        url: 'https://example.com/test',
        displayName: 'Test Address Book'
      };

      const contacts = await davClient.getContacts(addressBook);

      expect(contacts).toHaveLength(1);
      expect(contacts[0]).toEqual({
        uid: 'contact1@example.com',
        fn: 'John Doe',
        email: undefined,
        tel: undefined,
        org: undefined,
        etag: '12345'
      });
    });
  });

  describe('event creation', () => {
    beforeEach(() => {
      const authConfig: AuthConfig = {
        caldavUrl: 'https://example.com/dav.php',
        carddavUrl: 'https://example.com/dav.php',
        username: 'testuser',
        password: 'testpass'
      };
      
      davClient.setAuthConfig(authConfig);
    });

    it('should create event successfully with 201 status', async () => {
      const mockResponse = {
        ok: true,
        status: 201,
        statusText: 'Created',
        text: jest.fn().mockResolvedValue(''),
        headers: new Map([['content-type', 'text/calendar']])
      };
      
      mockFetch.mockResolvedValue(mockResponse as any);

      const calendar: Calendar = {
        url: 'https://example.com/dav.php/calendars/testuser/personal/',
        displayName: 'Personal Calendar'
      };

      const event = {
        uid: 'test-event-123',
        summary: 'Test Event',
        description: 'Test Description',
        dtstart: new Date('2025-07-20T10:00:00Z'),
        dtend: new Date('2025-07-20T11:00:00Z'),
        location: 'Test Location'
      };

      await davClient.createEvent(calendar, event);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://example.com/dav.php/calendars/testuser/personal/test-event-123.ics',
        expect.objectContaining({
          method: 'PUT',
          headers: expect.objectContaining({
            'Content-Type': 'text/calendar; charset=utf-8'
          }),
          body: expect.stringContaining('BEGIN:VCALENDAR')
        })
      );

      // Verify the iCalendar content
      const putCall = mockFetch.mock.calls[0];
      const icalData = putCall[1].body;
      expect(icalData).toContain('UID:test-event-123');
      expect(icalData).toContain('SUMMARY:Test Event');
      expect(icalData).toContain('DESCRIPTION:Test Description');
      expect(icalData).toContain('LOCATION:Test Location');
      expect(icalData).toContain('DTSTART:20250720T100000Z');
      expect(icalData).toContain('DTEND:20250720T110000Z');
    });

    it('should create event successfully with 204 status', async () => {
      const mockResponse = {
        ok: true,
        status: 204,
        statusText: 'No Content',
        text: jest.fn().mockResolvedValue(''),
        headers: new Map([['content-type', 'text/calendar']])
      };
      
      mockFetch.mockResolvedValue(mockResponse as any);

      const calendar: Calendar = {
        url: 'https://example.com/dav.php/calendars/testuser/personal/',
        displayName: 'Personal Calendar'
      };

      const event = {
        uid: 'test-event-123',
        summary: 'Test Event',
        dtstart: new Date('2025-07-20T10:00:00Z'),
        dtend: new Date('2025-07-20T11:00:00Z')
      };

      await expect(davClient.createEvent(calendar, event)).resolves.not.toThrow();
    });

    it('should generate proper URL for event with calendar URL ending with slash', async () => {
      const mockResponse = {
        ok: true,
        status: 201,
        statusText: 'Created',
        text: jest.fn().mockResolvedValue(''),
        headers: new Map()
      };
      
      mockFetch.mockResolvedValue(mockResponse as any);

      const calendar: Calendar = {
        url: 'https://example.com/dav.php/calendars/testuser/personal/',
        displayName: 'Personal Calendar'
      };

      const event = {
        uid: 'test-event-123',
        summary: 'Test Event',
        dtstart: new Date('2025-07-20T10:00:00Z'),
        dtend: new Date('2025-07-20T11:00:00Z')
      };

      await davClient.createEvent(calendar, event);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://example.com/dav.php/calendars/testuser/personal/test-event-123.ics',
        expect.any(Object)
      );
    });

    it('should generate proper URL for event with calendar URL not ending with slash', async () => {
      const mockResponse = {
        ok: true,
        status: 201,
        statusText: 'Created',
        text: jest.fn().mockResolvedValue(''),
        headers: new Map()
      };
      
      mockFetch.mockResolvedValue(mockResponse as any);

      const calendar: Calendar = {
        url: 'https://example.com/dav.php/calendars/testuser/personal',
        displayName: 'Personal Calendar'
      };

      const event = {
        uid: 'test-event-123',
        summary: 'Test Event',
        dtstart: new Date('2025-07-20T10:00:00Z'),
        dtend: new Date('2025-07-20T11:00:00Z')
      };

      await davClient.createEvent(calendar, event);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://example.com/dav.php/calendars/testuser/personal/test-event-123.ics',
        expect.any(Object)
      );
    });

    it('should create minimal event without optional fields', async () => {
      const mockResponse = {
        ok: true,
        status: 201,
        statusText: 'Created',
        text: jest.fn().mockResolvedValue(''),
        headers: new Map()
      };
      
      mockFetch.mockResolvedValue(mockResponse as any);

      const calendar: Calendar = {
        url: 'https://example.com/dav.php/calendars/testuser/personal/',
        displayName: 'Personal Calendar'
      };

      const event = {
        uid: 'minimal-event-123',
        summary: 'Minimal Event',
        dtstart: new Date('2025-07-20T10:00:00Z'),
        dtend: new Date('2025-07-20T11:00:00Z')
      };

      await davClient.createEvent(calendar, event);

      const putCall = mockFetch.mock.calls[0];
      const icalData = putCall[1].body;
      expect(icalData).toContain('UID:minimal-event-123');
      expect(icalData).toContain('SUMMARY:Minimal Event');
      expect(icalData).not.toContain('DESCRIPTION:');
      expect(icalData).not.toContain('LOCATION:');
    });

    it('should throw error when auth config is not set', async () => {
      davClient.setAuthConfig(null as any);
      
      const calendar: Calendar = {
        url: 'https://example.com/test',
        displayName: 'Test Calendar'
      };
      
      const event = {
        uid: 'test-event-123',
        summary: 'Test Event',
        dtstart: new Date(),
        dtend: new Date()
      };
      
      await expect(davClient.createEvent(calendar, event)).rejects.toThrow(
        'Authentication not configured. Please set auth config before creating events.'
      );
    });

    it('should handle event creation failure with non-success status', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        text: jest.fn().mockResolvedValue(''),
        headers: new Map()
      };
      
      mockFetch.mockResolvedValue(mockResponse as any);

      const calendar: Calendar = {
        url: 'https://example.com/test',
        displayName: 'Test Calendar'
      };
      
      const event = {
        uid: 'test-event-123',
        summary: 'Test Event',
        dtstart: new Date(),
        dtend: new Date()
      };
      
      await expect(davClient.createEvent(calendar, event)).rejects.toThrow(
        'Event creation failed with status 200'
      );
    });

    it('should handle network errors during event creation', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));
      
      const calendar: Calendar = {
        url: 'https://example.com/test',
        displayName: 'Test Calendar'
      };
      
      const event = {
        uid: 'test-event-123',
        summary: 'Test Event',
        dtstart: new Date(),
        dtend: new Date()
      };
      
      await expect(davClient.createEvent(calendar, event)).rejects.toThrow(
        'Event creation failed: Network error. Please check your connection and server URL.'
      );
    });

    it('should handle HTTP errors during event creation', async () => {
      const mockResponse = {
        ok: false,
        status: 403,
        statusText: 'Forbidden'
      };
      mockFetch.mockResolvedValue(mockResponse as any);
      
      const calendar: Calendar = {
        url: 'https://example.com/test',
        displayName: 'Test Calendar'
      };
      
      const event = {
        uid: 'test-event-123',
        summary: 'Test Event',
        dtstart: new Date(),
        dtend: new Date()
      };
      
      await expect(davClient.createEvent(calendar, event)).rejects.toThrow(
        'Access forbidden. You may not have permission to access this resource.'
      );
    });
  });

  describe('event updates', () => {
    beforeEach(() => {
      const authConfig: AuthConfig = {
        caldavUrl: 'https://example.com/dav.php',
        carddavUrl: 'https://example.com/dav.php',
        username: 'testuser',
        password: 'testpass'
      };
      
      davClient.setAuthConfig(authConfig);
    });

    it('should update event successfully with 200 status', async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        text: jest.fn().mockResolvedValue(''),
        headers: new Map([['content-type', 'text/calendar']])
      };
      
      mockFetch.mockResolvedValue(mockResponse as any);

      const calendar: Calendar = {
        url: 'https://example.com/dav.php/calendars/testuser/personal/',
        displayName: 'Personal Calendar'
      };

      const event = {
        uid: 'test-event-123',
        summary: 'Updated Test Event',
        description: 'Updated Description',
        dtstart: new Date('2025-07-20T10:00:00Z'),
        dtend: new Date('2025-07-20T11:00:00Z'),
        location: 'Updated Location',
        etag: 'original-etag-123'
      };

      await davClient.updateEvent(calendar, event);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://example.com/dav.php/calendars/testuser/personal/test-event-123.ics',
        expect.objectContaining({
          method: 'PUT',
          headers: expect.objectContaining({
            'Content-Type': 'text/calendar; charset=utf-8',
            'If-Match': '"original-etag-123"'
          }),
          body: expect.stringContaining('BEGIN:VCALENDAR')
        })
      );

      // Verify the updated iCalendar content
      const putCall = mockFetch.mock.calls[0];
      const icalData = putCall[1].body;
      expect(icalData).toContain('UID:test-event-123');
      expect(icalData).toContain('SUMMARY:Updated Test Event');
      expect(icalData).toContain('DESCRIPTION:Updated Description');
      expect(icalData).toContain('LOCATION:Updated Location');
    });

    it('should update event successfully with 204 status', async () => {
      const mockResponse = {
        ok: true,
        status: 204,
        statusText: 'No Content',
        text: jest.fn().mockResolvedValue(''),
        headers: new Map([['content-type', 'text/calendar']])
      };
      
      mockFetch.mockResolvedValue(mockResponse as any);

      const calendar: Calendar = {
        url: 'https://example.com/dav.php/calendars/testuser/personal/',
        displayName: 'Personal Calendar'
      };

      const event = {
        uid: 'test-event-123',
        summary: 'Updated Test Event',
        dtstart: new Date('2025-07-20T10:00:00Z'),
        dtend: new Date('2025-07-20T11:00:00Z'),
        etag: 'original-etag-123'
      };

      await expect(davClient.updateEvent(calendar, event)).resolves.not.toThrow();
    });

    it('should throw error when ETag is missing', async () => {
      const calendar: Calendar = {
        url: 'https://example.com/test',
        displayName: 'Test Calendar'
      };
      
      const event = {
        uid: 'test-event-123',
        summary: 'Test Event',
        dtstart: new Date(),
        dtend: new Date()
        // Missing etag
      };
      
      await expect(davClient.updateEvent(calendar, event)).rejects.toThrow(
        'Event ETag is required for updates to detect conflicts.'
      );
    });

    it('should handle conflict error (412 Precondition Failed)', async () => {
      const mockResponse = {
        ok: true,
        status: 412,
        statusText: 'Precondition Failed',
        text: jest.fn().mockResolvedValue(''),
        headers: new Map()
      };
      
      mockFetch.mockResolvedValue(mockResponse as any);

      const calendar: Calendar = {
        url: 'https://example.com/test',
        displayName: 'Test Calendar'
      };
      
      const event = {
        uid: 'test-event-123',
        summary: 'Test Event',
        dtstart: new Date(),
        dtend: new Date(),
        etag: 'outdated-etag'
      };
      
      await expect(davClient.updateEvent(calendar, event)).rejects.toThrow(
        'Event update conflict: The event has been modified by another client. Please refresh and try again.'
      );
    });

    it('should throw error when auth config is not set', async () => {
      davClient.setAuthConfig(null as any);
      
      const calendar: Calendar = {
        url: 'https://example.com/test',
        displayName: 'Test Calendar'
      };
      
      const event = {
        uid: 'test-event-123',
        summary: 'Test Event',
        dtstart: new Date(),
        dtend: new Date(),
        etag: 'some-etag'
      };
      
      await expect(davClient.updateEvent(calendar, event)).rejects.toThrow(
        'Authentication not configured. Please set auth config before updating events.'
      );
    });

    it('should handle event update failure with non-success status', async () => {
      const mockResponse = {
        ok: true,
        status: 201,
        statusText: 'Created',
        text: jest.fn().mockResolvedValue(''),
        headers: new Map()
      };
      
      mockFetch.mockResolvedValue(mockResponse as any);

      const calendar: Calendar = {
        url: 'https://example.com/test',
        displayName: 'Test Calendar'
      };
      
      const event = {
        uid: 'test-event-123',
        summary: 'Test Event',
        dtstart: new Date(),
        dtend: new Date(),
        etag: 'some-etag'
      };
      
      await expect(davClient.updateEvent(calendar, event)).rejects.toThrow(
        'Event update failed with status 201'
      );
    });

    it('should handle network errors during event update', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));
      
      const calendar: Calendar = {
        url: 'https://example.com/test',
        displayName: 'Test Calendar'
      };
      
      const event = {
        uid: 'test-event-123',
        summary: 'Test Event',
        dtstart: new Date(),
        dtend: new Date(),
        etag: 'some-etag'
      };
      
      await expect(davClient.updateEvent(calendar, event)).rejects.toThrow(
        'Event update failed: Network error. Please check your connection and server URL.'
      );
    });

    it('should handle HTTP errors during event update', async () => {
      const mockResponse = {
        ok: false,
        status: 404,
        statusText: 'Not Found'
      };
      mockFetch.mockResolvedValue(mockResponse as any);
      
      const calendar: Calendar = {
        url: 'https://example.com/test',
        displayName: 'Test Calendar'
      };
      
      const event = {
        uid: 'test-event-123',
        summary: 'Test Event',
        dtstart: new Date(),
        dtend: new Date(),
        etag: 'some-etag'
      };
      
      await expect(davClient.updateEvent(calendar, event)).rejects.toThrow(
        'Resource not found. Please check the server URL.'
      );
    });
  });

  describe('iCalendar generation', () => {
    beforeEach(() => {
      const authConfig: AuthConfig = {
        caldavUrl: 'https://example.com/dav.php',
        carddavUrl: 'https://example.com/dav.php',
        username: 'testuser',
        password: 'testpass'
      };
      
      davClient.setAuthConfig(authConfig);

      // Mock successful response for all tests in this describe block
      const mockResponse = {
        ok: true,
        status: 201,
        statusText: 'Created',
        text: jest.fn().mockResolvedValue(''),
        headers: new Map()
      };
      
      mockFetch.mockResolvedValue(mockResponse as any);
    });

    it('should generate valid iCalendar with all properties', async () => {
      const calendar: Calendar = {
        url: 'https://example.com/dav.php/calendars/testuser/personal/',
        displayName: 'Personal Calendar'
      };

      const event = {
        uid: 'full-event-123',
        summary: 'Full Event',
        description: 'Event with all properties',
        dtstart: new Date('2025-07-20T10:00:00Z'),
        dtend: new Date('2025-07-20T11:00:00Z'),
        location: 'Conference Room A'
      };

      await davClient.createEvent(calendar, event);

      const putCall = mockFetch.mock.calls[0];
      const icalData = putCall[1].body;
      
      // Check VCALENDAR structure
      expect(icalData).toContain('BEGIN:VCALENDAR');
      expect(icalData).toContain('END:VCALENDAR');
      expect(icalData).toContain('VERSION:2.0');
      expect(icalData).toContain('PRODID:-//CalDAV-CardDAV-Client//EN');
      expect(icalData).toContain('CALSCALE:GREGORIAN');
      
      // Check VEVENT structure
      expect(icalData).toContain('BEGIN:VEVENT');
      expect(icalData).toContain('END:VEVENT');
      
      // Check event properties
      expect(icalData).toContain('UID:full-event-123');
      expect(icalData).toContain('SUMMARY:Full Event');
      expect(icalData).toContain('DESCRIPTION:Event with all properties');
      expect(icalData).toContain('LOCATION:Conference Room A');
      expect(icalData).toContain('DTSTART:20250720T100000Z');
      expect(icalData).toContain('DTEND:20250720T110000Z');
      
      // Check timestamp properties are present
      expect(icalData).toContain('DTSTAMP:');
      expect(icalData).toContain('CREATED:');
      expect(icalData).toContain('LAST-MODIFIED:');
    });

    it('should generate valid iCalendar with minimal properties', async () => {
      const calendar: Calendar = {
        url: 'https://example.com/dav.php/calendars/testuser/personal/',
        displayName: 'Personal Calendar'
      };

      const event = {
        uid: 'minimal-event-123',
        summary: 'Minimal Event',
        dtstart: new Date('2025-07-20T14:00:00Z'),
        dtend: new Date('2025-07-20T15:00:00Z')
      };

      await davClient.createEvent(calendar, event);

      const putCall = mockFetch.mock.calls[0];
      const icalData = putCall[1].body;
      
      // Check required properties are present
      expect(icalData).toContain('UID:minimal-event-123');
      expect(icalData).toContain('SUMMARY:Minimal Event');
      expect(icalData).toContain('DTSTART:20250720T140000Z');
      expect(icalData).toContain('DTEND:20250720T150000Z');
      
      // Check optional properties are not present
      expect(icalData).not.toContain('DESCRIPTION:');
      expect(icalData).not.toContain('LOCATION:');
    });

    it('should handle special characters in event properties', async () => {
      const calendar: Calendar = {
        url: 'https://example.com/dav.php/calendars/testuser/personal/',
        displayName: 'Personal Calendar'
      };

      const event = {
        uid: 'special-chars-123',
        summary: 'Event with "quotes" & symbols',
        description: 'Description with\nnewlines and special chars: àáâãäå',
        dtstart: new Date('2025-07-20T10:00:00Z'),
        dtend: new Date('2025-07-20T11:00:00Z'),
        location: 'Room #1 (Building A)'
      };

      await davClient.createEvent(calendar, event);

      const putCall = mockFetch.mock.calls[0];
      const icalData = putCall[1].body;
      
      // Verify the content is properly encoded in the iCalendar
      expect(icalData).toContain('SUMMARY:Event with "quotes" & symbols');
      expect(icalData).toContain('LOCATION:Room #1 (Building A)');
      // Note: ICAL.js handles proper escaping of special characters
    });
  });

  describe('contact creation', () => {
    beforeEach(() => {
      const authConfig: AuthConfig = {
        caldavUrl: 'https://example.com/dav.php',
        carddavUrl: 'https://example.com/dav.php',
        username: 'testuser',
        password: 'testpass'
      };
      
      davClient.setAuthConfig(authConfig);

      // Setup successful creation response
      const mockResponse = {
        ok: true,
        status: 201,
        statusText: 'Created',
        text: jest.fn().mockResolvedValue(''),
        headers: new Map([['content-type', 'text/vcard']])
      };
      
      mockFetch.mockResolvedValue(mockResponse as any);
    });

    it('should create contact successfully', async () => {
      const addressBook = {
        url: 'https://example.com/dav.php/addressbooks/testuser/contacts/',
        displayName: 'Personal Contacts'
      };

      const contact = {
        uid: 'contact-123',
        fn: 'John Doe',
        email: ['john@example.com', 'john.doe@work.com'],
        tel: ['+1234567890', '+0987654321'],
        org: 'Example Corp'
      };

      await davClient.createContact(addressBook, contact);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://example.com/dav.php/addressbooks/testuser/contacts/contact-123.vcf',
        expect.objectContaining({
          method: 'PUT',
          headers: expect.objectContaining({
            'Content-Type': 'text/vcard; charset=utf-8'
          })
        })
      );

      const putCall = mockFetch.mock.calls[0];
      const vcardData = putCall[1].body;
      
      expect(vcardData).toContain('BEGIN:VCARD');
      expect(vcardData).toContain('VERSION:3.0');
      expect(vcardData).toContain('UID:contact-123');
      expect(vcardData).toContain('FN:John Doe');
      expect(vcardData).toContain('EMAIL:john@example.com');
      expect(vcardData).toContain('EMAIL:john.doe@work.com');
      expect(vcardData).toContain('TEL:+1234567890');
      expect(vcardData).toContain('TEL:+0987654321');
      expect(vcardData).toContain('ORG:Example Corp');
      expect(vcardData).toContain('END:VCARD');
    });

    it('should create contact with minimal data', async () => {
      const addressBook = {
        url: 'https://example.com/dav.php/addressbooks/testuser/contacts/',
        displayName: 'Personal Contacts'
      };

      const contact = {
        uid: 'minimal-contact-123',
        fn: 'Jane Smith'
      };

      await davClient.createContact(addressBook, contact);

      const putCall = mockFetch.mock.calls[0];
      const vcardData = putCall[1].body;
      
      expect(vcardData).toContain('BEGIN:VCARD');
      expect(vcardData).toContain('UID:minimal-contact-123');
      expect(vcardData).toContain('FN:Jane Smith');
      expect(vcardData).toContain('END:VCARD');
      expect(vcardData).not.toContain('EMAIL:');
      expect(vcardData).not.toContain('TEL:');
      expect(vcardData).not.toContain('ORG:');
    });

    it('should handle address book URL without trailing slash', async () => {
      const addressBook = {
        url: 'https://example.com/dav.php/addressbooks/testuser/contacts',
        displayName: 'Personal Contacts'
      };

      const contact = {
        uid: 'contact-123',
        fn: 'John Doe'
      };

      await davClient.createContact(addressBook, contact);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://example.com/dav.php/addressbooks/testuser/contacts/contact-123.vcf',
        expect.any(Object)
      );
    });

    it('should throw error when auth config is not set', async () => {
      davClient.setAuthConfig(null as any);
      
      const addressBook = { url: 'test', displayName: 'test' };
      const contact = { uid: 'test', fn: 'test' };
      
      await expect(davClient.createContact(addressBook, contact)).rejects.toThrow(
        'Authentication not configured. Please set auth config before creating contacts.'
      );
    });

    it('should handle contact creation errors', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));
      
      const addressBook = { url: 'test', displayName: 'test' };
      const contact = { uid: 'test', fn: 'test' };
      
      await expect(davClient.createContact(addressBook, contact)).rejects.toThrow(
        'Contact creation failed: Network error. Please check your connection and server URL.'
      );
    });

    it('should handle HTTP error responses', async () => {
      const mockResponse = {
        ok: false,
        status: 403,
        statusText: 'Forbidden'
      };
      mockFetch.mockResolvedValue(mockResponse as any);
      
      const addressBook = { url: 'test', displayName: 'test' };
      const contact = { uid: 'test', fn: 'test' };
      
      await expect(davClient.createContact(addressBook, contact)).rejects.toThrow(
        'Contact creation failed: Access forbidden. You may not have permission to access this resource.'
      );
    });

    it('should handle special characters in contact properties', async () => {
      const addressBook = {
        url: 'https://example.com/dav.php/addressbooks/testuser/contacts/',
        displayName: 'Personal Contacts'
      };

      const contact = {
        uid: 'special-chars-123',
        fn: 'José María García',
        email: ['josé@example.com'],
        tel: ['+34 123 456 789'],
        org: 'Empresa & Compañía, S.L.'
      };

      await davClient.createContact(addressBook, contact);

      const putCall = mockFetch.mock.calls[0];
      const vcardData = putCall[1].body;
      
      expect(vcardData).toContain('FN:José María García');
      expect(vcardData).toContain('EMAIL:josé@example.com');
      expect(vcardData).toContain('TEL:+34 123 456 789');
      expect(vcardData).toContain('ORG:Empresa & Compañía\\, S.L.');
    });
  });

  describe('contact update', () => {
    beforeEach(() => {
      const authConfig: AuthConfig = {
        caldavUrl: 'https://example.com/dav.php',
        carddavUrl: 'https://example.com/dav.php',
        username: 'testuser',
        password: 'testpass'
      };
      
      davClient.setAuthConfig(authConfig);

      // Setup successful update response
      const mockResponse = {
        ok: true,
        status: 204,
        statusText: 'No Content',
        text: jest.fn().mockResolvedValue(''),
        headers: new Map([['content-type', 'text/vcard']])
      };
      
      mockFetch.mockResolvedValue(mockResponse as any);
    });

    it('should update contact successfully', async () => {
      const addressBook = {
        url: 'https://example.com/dav.php/addressbooks/testuser/contacts/',
        displayName: 'Personal Contacts'
      };

      const contact = {
        uid: 'contact-123',
        fn: 'John Doe Updated',
        email: ['john.updated@example.com'],
        tel: ['+1234567890'],
        org: 'New Company',
        etag: 'abc123'
      };

      await davClient.updateContact(addressBook, contact);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://example.com/dav.php/addressbooks/testuser/contacts/contact-123.vcf',
        expect.objectContaining({
          method: 'PUT',
          headers: expect.objectContaining({
            'Content-Type': 'text/vcard; charset=utf-8',
            'If-Match': '"abc123"'
          })
        })
      );

      const putCall = mockFetch.mock.calls[0];
      const vcardData = putCall[1].body;
      
      expect(vcardData).toContain('FN:John Doe Updated');
      expect(vcardData).toContain('EMAIL:john.updated@example.com');
      expect(vcardData).toContain('ORG:New Company');
    });

    it('should throw error when ETag is missing', async () => {
      const addressBook = { url: 'test', displayName: 'test' };
      const contact = { uid: 'test', fn: 'test' }; // No etag
      
      await expect(davClient.updateContact(addressBook, contact)).rejects.toThrow(
        'Contact ETag is required for updates to detect conflicts.'
      );
    });

    it('should throw error when auth config is not set', async () => {
      davClient.setAuthConfig(null as any);
      
      const addressBook = { url: 'test', displayName: 'test' };
      const contact = { uid: 'test', fn: 'test', etag: 'abc123' };
      
      await expect(davClient.updateContact(addressBook, contact)).rejects.toThrow(
        'Authentication not configured. Please set auth config before updating contacts.'
      );
    });

    it('should handle conflict errors (412 Precondition Failed)', async () => {
      const mockResponse = {
        ok: false,
        status: 412,
        statusText: 'Precondition Failed'
      };
      mockFetch.mockResolvedValue(mockResponse as any);
      
      const addressBook = { url: 'test', displayName: 'test' };
      const contact = { uid: 'test', fn: 'test', etag: 'abc123' };
      
      await expect(davClient.updateContact(addressBook, contact)).rejects.toThrow(
        'Contact update conflict: The contact has been modified by another client. Please refresh and try again.'
      );
    });

    it('should handle other HTTP error responses', async () => {
      const mockResponse = {
        ok: false,
        status: 404,
        statusText: 'Not Found'
      };
      mockFetch.mockResolvedValue(mockResponse as any);
      
      const addressBook = { url: 'test', displayName: 'test' };
      const contact = { uid: 'test', fn: 'test', etag: 'abc123' };
      
      await expect(davClient.updateContact(addressBook, contact)).rejects.toThrow(
        'Contact update failed: Resource not found. Please check the server URL.'
      );
    });

    it('should handle network errors', async () => {
      mockFetch.mockRejectedValue(new Error('Network error'));
      
      const addressBook = { url: 'test', displayName: 'test' };
      const contact = { uid: 'test', fn: 'test', etag: 'abc123' };
      
      await expect(davClient.updateContact(addressBook, contact)).rejects.toThrow(
        'Contact update failed: Network error. Please check your connection and server URL.'
      );
    });
  });
});