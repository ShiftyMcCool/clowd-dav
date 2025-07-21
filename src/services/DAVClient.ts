import { 
  DAVClient as IDAVClient, 
  DAVProvider 
} from '../types/providers';
import { 
  AuthConfig 
} from '../types/auth';
import { 
  Calendar, 
  AddressBook, 
  CalendarEvent, 
  Contact, 
  DateRange, 
  DAVRequest, 
  DAVResponse 
} from '../types/dav';
const ICAL = require('ical.js');
const vcardParser = require('vcard-parser');

export class DAVClient implements IDAVClient {
  private provider: DAVProvider | null = null;
  private authConfig: AuthConfig | null = null;

  constructor() {
    // No setup needed for fetch-based implementation
  }

  private handleError(response: Response): Error {
    const status = response.status;
    
    switch (status) {
      case 401:
        return new Error('Authentication failed. Please check your credentials.');
      case 403:
        return new Error('Access forbidden. You may not have permission to access this resource.');
      case 404:
        return new Error('Resource not found. Please check the server URL.');
      case 500:
        return new Error('Server error. Please try again later.');
      default:
        return new Error(`Server error (${status}): ${response.statusText}`);
    }
  }

  private async makeRequest(url: string, options: RequestInit = {}): Promise<DAVResponse> {
    try {
      // Prepare headers
      const headers: Record<string, string> = {
        'Content-Type': 'application/xml; charset=utf-8',
        'User-Agent': 'CalDAV-CardDAV-Client/1.0',
        'DAV': '1, 2, 3, calendar-access, addressbook',
        'Prefer': 'return-minimal',
        ...options.headers as Record<string, string>
      };

      // Add authentication if available
      if (this.authConfig) {
        const credentials = btoa(`${this.authConfig.username}:${this.authConfig.password}`);
        headers['Authorization'] = `Basic ${credentials}`;
      }

      // Allow provider to customize the request
      if (this.provider?.customizeRequest) {
        const davRequest: DAVRequest = {
          method: options.method?.toString() || 'GET',
          url,
          headers,
          data: options.body as string
        };
        
        const customizedRequest = this.provider.customizeRequest(davRequest);
        Object.assign(headers, customizedRequest.headers);
        options.body = customizedRequest.data;
      }

      const response = await fetch(url, {
        ...options,
        headers
      });

      if (!response.ok) {
        throw this.handleError(response);
      }

      const data = await response.text();
      
      return {
        status: response.status,
        data,
        headers: Object.fromEntries(response.headers.entries())
      };
    } catch (error) {
      // Re-throw errors that are already properly formatted
      if (error instanceof Error && (
        error.message.includes('Authentication failed') ||
        error.message.includes('Access forbidden') ||
        error.message.includes('Resource not found') ||
        error.message.includes('Server error')
      )) {
        throw error;
      }
      // Handle network errors and other unexpected errors
      throw new Error('Network error. Please check your connection and server URL.');
    }
  }

  public setAuthConfig(authConfig: AuthConfig): void {
    this.authConfig = authConfig;
  }

  public setProvider(provider: DAVProvider): void {
    this.provider = provider;
  }

  // Basic HTTP methods with DAV headers
  public async get(url: string, headers?: Record<string, string>): Promise<DAVResponse> {
    return this.makeRequest(url, {
      method: 'GET',
      headers
    });
  }

  public async put(url: string, data: string, headers?: Record<string, string>): Promise<DAVResponse> {
    return this.makeRequest(url, {
      method: 'PUT',
      body: data,
      headers
    });
  }

  public async post(url: string, data: string, headers?: Record<string, string>): Promise<DAVResponse> {
    return this.makeRequest(url, {
      method: 'POST',
      body: data,
      headers
    });
  }

  public async delete(url: string, headers?: Record<string, string>): Promise<DAVResponse> {
    return this.makeRequest(url, {
      method: 'DELETE',
      headers
    });
  }

  // PROPFIND method for DAV discovery
  public async propfind(url: string, data: string, depth: string = '1', headers?: Record<string, string>): Promise<DAVResponse> {
    const davHeaders = {
      'Depth': depth,
      'Content-Type': 'application/xml; charset=utf-8',
      ...headers
    };
    
    return this.makeRequest(url, {
      method: 'PROPFIND',
      body: data,
      headers: davHeaders
    });
  }

  // REPORT method for CalDAV/CardDAV queries
  public async report(url: string, data: string, headers?: Record<string, string>): Promise<DAVResponse> {
    const davHeaders = {
      'Depth': '1',
      'Content-Type': 'application/xml; charset=utf-8',
      ...headers
    };
    
    return this.makeRequest(url, {
      method: 'REPORT',
      body: data,
      headers: davHeaders
    });
  }

  /**
   * Discover calendars using PROPFIND requests
   * Implements CalDAV calendar discovery protocol
   */
  public async discoverCalendars(): Promise<Calendar[]> {
    if (!this.provider) {
      throw new Error('Provider not set. Please set a provider before discovering calendars.');
    }
    
    if (!this.authConfig) {
      throw new Error('Authentication not configured. Please set auth config before discovering calendars.');
    }

    // Build the calendar discovery URL
    const baseUrl = this.authConfig.caldavUrl.replace(/\/$/, '');
    const discoveryPath = this.provider.getCalendarDiscoveryPath();
    const username = this.authConfig.username;
    const discoveryUrl = `${baseUrl}${discoveryPath}${username}/`;

    // PROPFIND request body to discover calendar collections
    const propfindBody = `<?xml version="1.0" encoding="utf-8" ?>
<D:propfind xmlns:D="DAV:" xmlns:C="urn:ietf:params:xml:ns:caldav">
  <D:prop>
    <D:displayname />
    <D:resourcetype />
    <C:calendar-description />
    <C:calendar-color />
    <C:supported-calendar-component-set />
  </D:prop>
</D:propfind>`;

    try {
      const response = await this.propfind(discoveryUrl, propfindBody, '1');
      return this.parseCalendarDiscoveryResponse(response.data, baseUrl);
    } catch (error) {
      if (error instanceof Error) {
        // If it's already a parsing error, re-throw as is
        if (error.message.includes('Failed to parse calendar discovery response')) {
          throw error;
        }
        // If it's a network/HTTP error, re-throw as is
        if (error.message.includes('Authentication failed') ||
            error.message.includes('Access forbidden') ||
            error.message.includes('Resource not found') ||
            error.message.includes('Server error') ||
            error.message.includes('Network error')) {
          throw error;
        }
        throw new Error(`Calendar discovery failed: ${error.message}`);
      }
      throw new Error('Calendar discovery failed: Unknown error');
    }
  }

  /**
   * Discover address books using PROPFIND requests
   * Implements CardDAV address book discovery protocol
   */
  public async discoverAddressBooks(): Promise<AddressBook[]> {
    if (!this.provider) {
      throw new Error('Provider not set. Please set a provider before discovering address books.');
    }
    
    if (!this.authConfig) {
      throw new Error('Authentication not configured. Please set auth config before discovering address books.');
    }

    // Build the address book discovery URL
    const baseUrl = this.authConfig.carddavUrl.replace(/\/$/, '');
    const discoveryPath = this.provider.getAddressBookDiscoveryPath();
    const username = this.authConfig.username;
    const discoveryUrl = `${baseUrl}${discoveryPath}${username}/`;

    // PROPFIND request body to discover address book collections
    const propfindBody = `<?xml version="1.0" encoding="utf-8" ?>
<D:propfind xmlns:D="DAV:" xmlns:CARD="urn:ietf:params:xml:ns:carddav">
  <D:prop>
    <D:displayname />
    <D:resourcetype />
    <CARD:addressbook-description />
    <CARD:supported-address-data />
  </D:prop>
</D:propfind>`;

    try {
      const response = await this.propfind(discoveryUrl, propfindBody, '1');
      return this.parseAddressBookDiscoveryResponse(response.data, baseUrl);
    } catch (error) {
      if (error instanceof Error) {
        // If it's already a parsing error, re-throw as is
        if (error.message.includes('Failed to parse address book discovery response')) {
          throw error;
        }
        // If it's a network/HTTP error, re-throw as is
        if (error.message.includes('Authentication failed') ||
            error.message.includes('Access forbidden') ||
            error.message.includes('Resource not found') ||
            error.message.includes('Server error') ||
            error.message.includes('Network error')) {
          throw error;
        }
        throw new Error(`Address book discovery failed: ${error.message}`);
      }
      throw new Error('Address book discovery failed: Unknown error');
    }
  }

  /**
   * Retrieve calendar events using REPORT requests with date filtering
   * Implements CalDAV calendar-query protocol
   */
  public async getEvents(calendar: Calendar, dateRange: DateRange): Promise<CalendarEvent[]> {
    if (!this.authConfig) {
      throw new Error('Authentication not configured. Please set auth config before retrieving events.');
    }

    // Format dates for CalDAV query (YYYYMMDDTHHMMSSZ format)
    const formatDate = (date: Date): string => {
      return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    };

    const startDate = formatDate(dateRange.start);
    const endDate = formatDate(dateRange.end);

    // REPORT request body for calendar query with date range
    const reportBody = `<?xml version="1.0" encoding="utf-8" ?>
<C:calendar-query xmlns:D="DAV:" xmlns:C="urn:ietf:params:xml:ns:caldav">
  <D:prop>
    <D:getetag />
    <C:calendar-data />
  </D:prop>
  <C:filter>
    <C:comp-filter name="VCALENDAR">
      <C:comp-filter name="VEVENT">
        <C:time-range start="${startDate}" end="${endDate}"/>
      </C:comp-filter>
    </C:comp-filter>
  </C:filter>
</C:calendar-query>`;

    try {
      const response = await this.report(calendar.url, reportBody);
      return this.parseCalendarEventsResponse(response.data);
    } catch (error) {
      if (error instanceof Error) {
        // If it's already a parsing error, re-throw as is
        if (error.message.includes('Failed to parse calendar events response')) {
          throw error;
        }
        // If it's a network/HTTP error, re-throw as is
        if (error.message.includes('Authentication failed') ||
            error.message.includes('Access forbidden') ||
            error.message.includes('Resource not found') ||
            error.message.includes('Server error') ||
            error.message.includes('Network error')) {
          throw error;
        }
        throw new Error(`Event retrieval failed: ${error.message}`);
      }
      throw new Error('Event retrieval failed: Unknown error');
    }
  }

  /**
   * Retrieve contacts using REPORT requests
   * Implements CardDAV addressbook-query protocol
   */
  public async getContacts(addressBook: AddressBook): Promise<Contact[]> {
    if (!this.authConfig) {
      throw new Error('Authentication not configured. Please set auth config before retrieving contacts.');
    }

    // REPORT request body for address book query
    const reportBody = `<?xml version="1.0" encoding="utf-8" ?>
<CARD:addressbook-query xmlns:D="DAV:" xmlns:CARD="urn:ietf:params:xml:ns:carddav">
  <D:prop>
    <D:getetag />
    <CARD:address-data />
  </D:prop>
  <CARD:filter>
    <CARD:prop-filter name="FN" />
  </CARD:filter>
</CARD:addressbook-query>`;

    try {
      const response = await this.report(addressBook.url, reportBody);
      return this.parseContactsResponse(response.data);
    } catch (error) {
      if (error instanceof Error) {
        // If it's already a parsing error, re-throw as is
        if (error.message.includes('Failed to parse contacts response')) {
          throw error;
        }
        // If it's a network/HTTP error, re-throw as is
        if (error.message.includes('Authentication failed') ||
            error.message.includes('Access forbidden') ||
            error.message.includes('Resource not found') ||
            error.message.includes('Server error') ||
            error.message.includes('Network error')) {
          throw error;
        }
        throw new Error(`Contact retrieval failed: ${error.message}`);
      }
      throw new Error('Contact retrieval failed: Unknown error');
    }
  }

  public async createEvent(calendar: Calendar, event: CalendarEvent): Promise<void> {
    throw new Error('Not implemented yet - will be implemented in task 9');
  }

  public async updateEvent(calendar: Calendar, event: CalendarEvent): Promise<void> {
    throw new Error('Not implemented yet - will be implemented in task 9');
  }

  public async createContact(addressBook: AddressBook, contact: Contact): Promise<void> {
    throw new Error('Not implemented yet - will be implemented in task 10');
  }

  public async updateContact(addressBook: AddressBook, contact: Contact): Promise<void> {
    throw new Error('Not implemented yet - will be implemented in task 10');
  }

  /**
   * Parse PROPFIND response to extract calendar information
   */
  private parseCalendarDiscoveryResponse(xmlData: string, baseUrl: string): Calendar[] {
    const calendars: Calendar[] = [];
    
    try {
      // Parse XML response using DOMParser
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlData, 'text/xml');
      
      // Find all response elements
      const responses = xmlDoc.getElementsByTagNameNS('DAV:', 'response');
      
      for (let i = 0; i < responses.length; i++) {
        const response = responses[i];
        
        // Get the href (URL) of the resource
        const hrefElement = response.getElementsByTagNameNS('DAV:', 'href')[0];
        if (!hrefElement) continue;
        
        const href = hrefElement.textContent?.trim();
        if (!href) continue;
        
        // Check if this is a calendar collection
        const resourceTypeElement = response.getElementsByTagNameNS('DAV:', 'resourcetype')[0];
        if (!resourceTypeElement) continue;
        
        const isCalendar = resourceTypeElement.getElementsByTagNameNS('urn:ietf:params:xml:ns:caldav', 'calendar').length > 0;
        if (!isCalendar) continue;
        
        // Get display name
        const displayNameElement = response.getElementsByTagNameNS('DAV:', 'displayname')[0];
        const displayName = displayNameElement?.textContent?.trim() || 'Unnamed Calendar';
        
        // Get calendar color if available
        const colorElement = response.getElementsByTagNameNS('urn:ietf:params:xml:ns:caldav', 'calendar-color')[0];
        const color = colorElement?.textContent?.trim();
        
        // Build full URL
        const fullUrl = href.startsWith('http') ? href : `${baseUrl}${href}`;
        
        calendars.push({
          url: fullUrl,
          displayName,
          color
        });
      }
      
      return calendars;
    } catch (error) {
      throw new Error(`Failed to parse calendar discovery response: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Parse REPORT response to extract calendar events using ICAL.js
   */
  private parseCalendarEventsResponse(xmlData: string): CalendarEvent[] {
    const events: CalendarEvent[] = [];
    
    try {
      // Parse XML response using DOMParser
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlData, 'text/xml');
      
      // Find all response elements
      const responses = xmlDoc.getElementsByTagNameNS('DAV:', 'response');
      
      for (let i = 0; i < responses.length; i++) {
        const response = responses[i];
        
        // Get ETag for conflict detection
        const etagElement = response.getElementsByTagNameNS('DAV:', 'getetag')[0];
        const etag = etagElement?.textContent?.trim().replace(/"/g, '');
        
        // Get calendar data
        const calendarDataElement = response.getElementsByTagNameNS('urn:ietf:params:xml:ns:caldav', 'calendar-data')[0];
        if (!calendarDataElement) continue;
        
        const icalData = calendarDataElement.textContent?.trim();
        if (!icalData) continue;
        
        try {
          // Parse iCalendar data using ICAL.js
          const jcalData = ICAL.parse(icalData);
          const comp = new ICAL.Component(jcalData);
          
          // Find VEVENT components
          const vevents = comp.getAllSubcomponents('vevent');
          
          for (const vevent of vevents) {
            const event = new ICAL.Event(vevent);
            
            // Extract event properties
            const calendarEvent: CalendarEvent = {
              uid: event.uid || '',
              summary: event.summary || '',
              description: event.description || undefined,
              dtstart: event.startDate.toJSDate(),
              dtend: event.endDate.toJSDate(),
              location: event.location || undefined,
              etag
            };
            
            events.push(calendarEvent);
          }
        } catch (icalError) {
          console.warn('Failed to parse iCalendar data:', icalError);
          // Continue processing other events
        }
      }
      
      return events;
    } catch (error) {
      throw new Error(`Failed to parse calendar events response: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Parse PROPFIND response to extract address book information
   */
  private parseAddressBookDiscoveryResponse(xmlData: string, baseUrl: string): AddressBook[] {
    const addressBooks: AddressBook[] = [];
    
    try {
      // Parse XML response using DOMParser
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlData, 'text/xml');
      
      // Find all response elements
      const responses = xmlDoc.getElementsByTagNameNS('DAV:', 'response');
      
      for (let i = 0; i < responses.length; i++) {
        const response = responses[i];
        
        // Get the href (URL) of the resource
        const hrefElement = response.getElementsByTagNameNS('DAV:', 'href')[0];
        if (!hrefElement) continue;
        
        const href = hrefElement.textContent?.trim();
        if (!href) continue;
        
        // Check if this is an address book collection
        const resourceTypeElement = response.getElementsByTagNameNS('DAV:', 'resourcetype')[0];
        if (!resourceTypeElement) continue;
        
        const isAddressBook = resourceTypeElement.getElementsByTagNameNS('urn:ietf:params:xml:ns:carddav', 'addressbook').length > 0;
        if (!isAddressBook) continue;
        
        // Get display name
        const displayNameElement = response.getElementsByTagNameNS('DAV:', 'displayname')[0];
        const displayName = displayNameElement?.textContent?.trim() || 'Unnamed Address Book';
        
        // Build full URL
        const fullUrl = href.startsWith('http') ? href : `${baseUrl}${href}`;
        
        addressBooks.push({
          url: fullUrl,
          displayName
        });
      }
      
      return addressBooks;
    } catch (error) {
      throw new Error(`Failed to parse address book discovery response: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Parse REPORT response to extract contacts using VCF library
   */
  private parseContactsResponse(xmlData: string): Contact[] {
    const contacts: Contact[] = [];
    
    try {
      // Parse XML response using DOMParser
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlData, 'text/xml');
      
      // Find all response elements
      const responses = xmlDoc.getElementsByTagNameNS('DAV:', 'response');
      
      for (let i = 0; i < responses.length; i++) {
        const response = responses[i];
        
        // Get ETag for conflict detection
        const etagElement = response.getElementsByTagNameNS('DAV:', 'getetag')[0];
        const etag = etagElement?.textContent?.trim().replace(/"/g, '');
        
        // Get address data
        const addressDataElement = response.getElementsByTagNameNS('urn:ietf:params:xml:ns:carddav', 'address-data')[0];
        if (!addressDataElement) continue;
        
        const vcardData = addressDataElement.textContent?.trim();
        if (!vcardData) continue;
        
        try {
          // Parse vCard data using vcard-parser library
          const vcard = vcardParser.parse(vcardData);
          
          // Extract contact properties
          const contact: Contact = {
            uid: this.getVCardProperty(vcard, 'uid') || '',
            fn: this.getVCardProperty(vcard, 'fn') || 'Unnamed Contact',
            email: this.getVCardPropertyArray(vcard, 'email'),
            tel: this.getVCardPropertyArray(vcard, 'tel'),
            org: this.getVCardProperty(vcard, 'org'),
            etag
          };
          
          contacts.push(contact);
        } catch (vcardError) {
          console.warn('Failed to parse vCard data:', vcardError);
          // Continue processing other contacts
        }
      }
      
      return contacts;
    } catch (error) {
      throw new Error(`Failed to parse contacts response: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Helper method to extract a single property value from vCard
   */
  private getVCardProperty(vcard: any, propertyName: string): string | undefined {
    try {
      const property = vcard[propertyName.toLowerCase()];
      if (property && Array.isArray(property) && property.length > 0) {
        return property[0].value;
      }
    } catch (error) {
      // Property doesn't exist or error accessing it
    }
    return undefined;
  }

  /**
   * Helper method to extract multiple property values from vCard as an array
   */
  private getVCardPropertyArray(vcard: any, propertyName: string): string[] | undefined {
    try {
      const properties = vcard[propertyName.toLowerCase()];
      if (properties && Array.isArray(properties)) {
        const values = properties.map(prop => prop.value).filter(val => val);
        return values.length > 0 ? values : undefined;
      }
    } catch (error) {
      // Property doesn't exist or error accessing it
    }
    return undefined;
  }
}