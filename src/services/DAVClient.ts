import { DAVClient as IDAVClient, DAVProvider } from "../types/providers";
import { AuthConfig } from "../types/auth";
import {
  Calendar,
  AddressBook,
  CalendarEvent,
  Contact,
  DateRange,
  DAVRequest,
  DAVResponse,
} from "../types/dav";
import ICAL from "ical.js";
const vcardParser = require("vcard-parser");

export class DAVClient implements IDAVClient {
  private provider: DAVProvider | null = null;
  private authConfig: AuthConfig | null = null;

  private handleError(response: Response): Error {
    const status = response.status;

    switch (status) {
      case 401:
        return new Error(
          "Authentication failed. Please check your credentials."
        );
      case 403:
        return new Error(
          "Access forbidden. You may not have permission to access this resource."
        );
      case 404:
        return new Error("Resource not found. Please check the server URL.");
      case 500:
        return new Error("Server error. Please try again later.");
      default:
        return new Error(`Server error (${status}): ${response.statusText}`);
    }
  }

  private async makeRequest(
    url: string,
    options: RequestInit = {}
  ): Promise<DAVResponse> {
    try {
      // Convert URL for proxy in development
      const requestUrl = this.convertToProxyUrl(url);

      // Prepare headers
      const headers: Record<string, string> = {
        "Content-Type": "application/xml; charset=utf-8",
        "User-Agent": "Clowd-DAV/1.0",
        Prefer: "return-minimal",
        ...(options.headers as Record<string, string>),
      };

      // Only add DAV header for non-CORS requests or if explicitly allowed
      // Many servers don't allow this header in CORS preflight responses
      if (options.method !== "OPTIONS") {
        // Skip DAV header for browser CORS compatibility
        // headers['DAV'] = '1, 2, 3, calendar-access, addressbook';
      }

      // Add authentication if available
      if (this.authConfig) {
        const credentials = btoa(
          `${this.authConfig.username}:${this.authConfig.password}`
        );
        headers["Authorization"] = `Basic ${credentials}`;
      }

      // Allow provider to customize the request
      if (this.provider?.customizeRequest) {
        const davRequest: DAVRequest = {
          method: options.method?.toString() || "GET",
          url,
          headers,
          data: options.body as string,
        };

        const customizedRequest = this.provider.customizeRequest(davRequest);
        Object.assign(headers, customizedRequest.headers);
        options.body = customizedRequest.data;
      }

      const response = await fetch(requestUrl, {
        ...options,
        headers,
      });

      if (!response.ok) {
        throw this.handleError(response);
      }

      const data = await response.text();

      return {
        status: response.status,
        data,
        headers: Object.fromEntries(response.headers.entries()),
      };
    } catch (error) {
      // Re-throw errors that are already properly formatted
      if (
        error instanceof Error &&
        (error.message.includes("Authentication failed") ||
          error.message.includes("Access forbidden") ||
          error.message.includes("Resource not found") ||
          error.message.includes("Server error"))
      ) {
        throw error;
      }
      // Handle network errors and other unexpected errors
      throw new Error(
        "Network error. Please check your connection and server URL."
      );
    }
  }

  public setAuthConfig(authConfig: AuthConfig): void {
    this.authConfig = authConfig;
  }

  public setProvider(provider: DAVProvider): void {
    this.provider = provider;
  }

  public getProvider(): DAVProvider | null {
    return this.provider;
  }

  public getAuthConfig(): AuthConfig | null {
    return this.authConfig;
  }

  /**
   * Convert absolute URLs to relative URLs for proxy in development
   */
  private convertToProxyUrl(url: string): string {
    // In development, use proxy by converting to relative URL
    if (process.env.NODE_ENV === "development") {
      try {
        const urlObj = new URL(url);
        return urlObj.pathname + urlObj.search;
      } catch (error) {
        // If URL parsing fails, return as-is
        return url;
      }
    }
    return url;
  }

  // Basic HTTP methods with DAV headers
  public async get(
    url: string,
    headers?: Record<string, string>
  ): Promise<DAVResponse> {
    return this.makeRequest(url, {
      method: "GET",
      headers,
    });
  }

  public async put(
    url: string,
    data: string,
    headers?: Record<string, string>
  ): Promise<DAVResponse> {
    return this.makeRequest(url, {
      method: "PUT",
      body: data,
      headers,
    });
  }

  public async post(
    url: string,
    data: string,
    headers?: Record<string, string>
  ): Promise<DAVResponse> {
    return this.makeRequest(url, {
      method: "POST",
      body: data,
      headers,
    });
  }

  public async delete(
    url: string,
    headers?: Record<string, string>
  ): Promise<DAVResponse> {
    return this.makeRequest(url, {
      method: "DELETE",
      headers,
    });
  }

  // PROPFIND method for DAV discovery
  public async propfind(
    url: string,
    data: string,
    depth: string = "1",
    headers?: Record<string, string>
  ): Promise<DAVResponse> {
    const davHeaders = {
      Depth: depth,
      "Content-Type": "application/xml; charset=utf-8",
      ...headers,
    };

    return this.makeRequest(url, {
      method: "PROPFIND",
      body: data,
      headers: davHeaders,
    });
  }

  // REPORT method for CalDAV/CardDAV queries
  public async report(
    url: string,
    data: string,
    headers?: Record<string, string>
  ): Promise<DAVResponse> {
    const davHeaders = {
      Depth: "1",
      "Content-Type": "application/xml; charset=utf-8",
      ...headers,
    };

    return this.makeRequest(url, {
      method: "REPORT",
      body: data,
      headers: davHeaders,
    });
  }

  /**
   * Discover calendars using PROPFIND requests
   * Implements CalDAV calendar discovery protocol
   */
  public async discoverCalendars(): Promise<Calendar[]> {
    if (!this.provider) {
      throw new Error(
        "Provider not set. Please set a provider before discovering calendars."
      );
    }

    if (!this.authConfig) {
      throw new Error(
        "Authentication not configured. Please set auth config before discovering calendars."
      );
    }

    // Build the calendar discovery URL
    const baseUrl = this.authConfig.caldavUrl.replace(/\/$/, "");
    const discoveryPath = this.provider.getCalendarDiscoveryPath();
    const username = this.authConfig.username;

    // Check if the baseUrl already contains the discovery path to avoid duplication
    let discoveryUrl: string;
    if (baseUrl.includes(discoveryPath.replace(/\/$/, ""))) {
      // URL already contains the discovery path, just ensure it ends with username
      if (baseUrl.endsWith(`/${username}`)) {
        discoveryUrl = `${baseUrl}/`;
      } else {
        discoveryUrl = `${baseUrl}/${username}/`;
      }
    } else {
      // Construct the full discovery URL
      discoveryUrl = `${baseUrl}${discoveryPath}${username}/`;
    }

    // Convert to relative URL for proxy in development
    discoveryUrl = this.convertToProxyUrl(discoveryUrl);

    // PROPFIND request body to discover calendar collections
    const propfindBody = `<?xml version="1.0" encoding="utf-8" ?>
<D:propfind xmlns:D="DAV:" xmlns:C="urn:ietf:params:xml:ns:caldav" xmlns:A="http://apple.com/ns/ical/">
  <D:prop>
    <D:displayname />
    <D:resourcetype />
    <C:calendar-description />
    <C:calendar-color />
    <A:calendar-color />
    <C:supported-calendar-component-set />
  </D:prop>
</D:propfind>`;

    try {
      const response = await this.propfind(discoveryUrl, propfindBody, "1");

      // Use the server base URL (without the path) for constructing full URLs
      const serverBaseUrl = new URL(this.authConfig.caldavUrl).origin;
      const calendars = this.parseCalendarDiscoveryResponse(
        response.data,
        serverBaseUrl
      );
      return calendars;
    } catch (error) {
      if (error instanceof Error) {
        // If it's already a parsing error, re-throw as is
        if (
          error.message.includes("Failed to parse calendar discovery response")
        ) {
          throw error;
        }
        // If it's a network/HTTP error, wrap it with context
        if (
          error.message.includes("Authentication failed") ||
          error.message.includes("Access forbidden") ||
          error.message.includes("Resource not found") ||
          error.message.includes("Server error") ||
          error.message.includes("Network error")
        ) {
          throw new Error(`Calendar discovery failed: ${error.message}`);
        }
        throw new Error(`Calendar discovery failed: ${error.message}`);
      }
      throw new Error("Calendar discovery failed: Unknown error");
    }
  }

  /**
   * Discover address books using PROPFIND requests
   * Implements CardDAV address book discovery protocol
   */
  public async discoverAddressBooks(): Promise<AddressBook[]> {
    if (!this.provider) {
      throw new Error(
        "Provider not set. Please set a provider before discovering address books."
      );
    }

    if (!this.authConfig) {
      throw new Error(
        "Authentication not configured. Please set auth config before discovering address books."
      );
    }

    // Build the address book discovery URL
    const baseUrl = this.authConfig.carddavUrl.replace(/\/$/, "");
    const discoveryPath = this.provider.getAddressBookDiscoveryPath();
    const username = this.authConfig.username;

    // Check if the baseUrl already contains the discovery path to avoid duplication
    let discoveryUrl: string;
    if (baseUrl.includes(discoveryPath.replace(/\/$/, ""))) {
      // URL already contains the discovery path, just ensure it ends with username
      if (baseUrl.endsWith(`/${username}`)) {
        discoveryUrl = `${baseUrl}/`;
      } else {
        discoveryUrl = `${baseUrl}/${username}/`;
      }
    } else {
      // Construct the full discovery URL
      discoveryUrl = `${baseUrl}${discoveryPath}${username}/`;
    }

    // Convert to relative URL for proxy in development
    discoveryUrl = this.convertToProxyUrl(discoveryUrl);

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
      const response = await this.propfind(discoveryUrl, propfindBody, "1");
      // Use the server base URL (without the path) for constructing full URLs
      const serverBaseUrl = new URL(this.authConfig.carddavUrl).origin;
      return this.parseAddressBookDiscoveryResponse(
        response.data,
        serverBaseUrl
      );
    } catch (error) {
      if (error instanceof Error) {
        // If it's already a parsing error, re-throw as is
        if (
          error.message.includes(
            "Failed to parse address book discovery response"
          )
        ) {
          throw error;
        }
        // If it's a network/HTTP error, wrap it with context
        if (
          error.message.includes("Authentication failed") ||
          error.message.includes("Access forbidden") ||
          error.message.includes("Resource not found") ||
          error.message.includes("Server error") ||
          error.message.includes("Network error")
        ) {
          throw new Error(`Address book discovery failed: ${error.message}`);
        }
        throw new Error(`Address book discovery failed: ${error.message}`);
      }
      throw new Error("Address book discovery failed: Unknown error");
    }
  }

  /**
   * Retrieve calendar events using REPORT requests with date filtering
   * Implements CalDAV calendar-query protocol
   */
  public async getEvents(
    calendar: Calendar,
    dateRange: DateRange
  ): Promise<CalendarEvent[]> {
    if (!this.authConfig) {
      throw new Error(
        "Authentication not configured. Please set auth config before retrieving events."
      );
    }

    // Format dates for CalDAV query (YYYYMMDDTHHMMSSZ format)
    const formatDate = (date: Date): string => {
      return date
        .toISOString()
        .replace(/[-:]/g, "")
        .replace(/\.\d{3}/, "");
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
        if (
          error.message.includes("Failed to parse calendar events response")
        ) {
          throw error;
        }
        // If it's a network/HTTP error, wrap it with context
        if (
          error.message.includes("Authentication failed") ||
          error.message.includes("Access forbidden") ||
          error.message.includes("Resource not found") ||
          error.message.includes("Server error") ||
          error.message.includes("Network error")
        ) {
          throw new Error(`Event retrieval failed: ${error.message}`);
        }
        throw new Error(`Event retrieval failed: ${error.message}`);
      }
      throw new Error("Event retrieval failed: Unknown error");
    }
  }

  /**
   * Retrieve contacts using REPORT requests
   * Implements CardDAV addressbook-query protocol
   */
  public async getContacts(addressBook: AddressBook): Promise<Contact[]> {
    if (!this.authConfig) {
      throw new Error(
        "Authentication not configured. Please set auth config before retrieving contacts."
      );
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
        if (error.message.includes("Failed to parse contacts response")) {
          throw error;
        }
        // If it's a network/HTTP error, wrap it with context
        if (
          error.message.includes("Authentication failed") ||
          error.message.includes("Access forbidden") ||
          error.message.includes("Resource not found") ||
          error.message.includes("Server error") ||
          error.message.includes("Network error")
        ) {
          throw new Error(`Contact retrieval failed: ${error.message}`);
        }
        throw new Error(`Contact retrieval failed: ${error.message}`);
      }
      throw new Error("Contact retrieval failed: Unknown error");
    }
  }

  /**
   * Create a new calendar event using PUT request with iCalendar data
   * Implements CalDAV event creation protocol
   */
  public async createEvent(
    calendar: Calendar,
    event: CalendarEvent
  ): Promise<void> {
    if (!this.authConfig) {
      throw new Error(
        "Authentication not configured. Please set auth config before creating events."
      );
    }

    // Generate unique URL for the new event
    const eventUrl = this.generateEventUrl(calendar, event);

    // Generate iCalendar data
    const icalData = this.generateICalendarData(event);

    try {
      // PUT request to create the event
      const response = await this.put(eventUrl, icalData, {
        "Content-Type": "text/calendar; charset=utf-8",
      });

      // Check if creation was successful (201 Created or 204 No Content)
      if (response.status !== 201 && response.status !== 204) {
        throw new Error(`Event creation failed with status ${response.status}`);
      }
    } catch (error) {
      if (error instanceof Error) {
        // If it's a network/HTTP error, wrap it with context
        if (
          error.message.includes("Authentication failed") ||
          error.message.includes("Access forbidden") ||
          error.message.includes("Resource not found") ||
          error.message.includes("Server error") ||
          error.message.includes("Network error")
        ) {
          throw new Error(`Event creation failed: ${error.message}`);
        }
        throw new Error(`Event creation failed: ${error.message}`);
      }
      throw new Error("Event creation failed: Unknown error");
    }
  }

  /**
   * Update an existing calendar event using PUT request with ETag handling
   * Implements CalDAV event update protocol with conflict detection
   */
  public async updateEvent(
    calendar: Calendar,
    event: CalendarEvent
  ): Promise<void> {
    if (!this.authConfig) {
      throw new Error(
        "Authentication not configured. Please set auth config before updating events."
      );
    }

    if (!event.etag) {
      throw new Error(
        "Event ETag is required for updates to detect conflicts."
      );
    }

    // Generate event URL (should be the same as the original)
    const eventUrl = this.generateEventUrl(calendar, event);

    // Generate updated iCalendar data
    const icalData = this.generateICalendarData(event);

    try {
      // PUT request with If-Match header for conflict detection
      const response = await this.put(eventUrl, icalData, {
        "Content-Type": "text/calendar; charset=utf-8",
        "If-Match": `"${event.etag}"`,
      });

      // Check if update was successful (200 OK or 204 No Content)
      if (response.status !== 200 && response.status !== 204) {
        if (response.status === 412) {
          throw new Error(
            "Event update conflict: The event has been modified by another client. Please refresh and try again."
          );
        }
        throw new Error(`Event update failed with status ${response.status}`);
      }
    } catch (error) {
      if (error instanceof Error) {
        // If it's already a conflict error, re-throw as is
        if (error.message.includes("Event update conflict")) {
          throw error;
        }
        // Handle 412 Precondition Failed specifically
        if (error.message.includes("Server error (412)")) {
          throw new Error(
            "Event update conflict: The event has been modified by another client. Please refresh and try again."
          );
        }
        // If it's a network/HTTP error, wrap it with context
        if (
          error.message.includes("Authentication failed") ||
          error.message.includes("Access forbidden") ||
          error.message.includes("Resource not found") ||
          error.message.includes("Server error") ||
          error.message.includes("Network error")
        ) {
          throw new Error(`Event update failed: ${error.message}`);
        }
        throw new Error(`Event update failed: ${error.message}`);
      }
      throw new Error("Event update failed: Unknown error");
    }
  }

  /**
   * Delete an existing calendar event using DELETE request with ETag handling
   * Implements CalDAV event deletion protocol with conflict detection
   */
  public async deleteEvent(
    calendar: Calendar,
    event: CalendarEvent
  ): Promise<void> {
    if (!this.authConfig) {
      throw new Error(
        "Authentication not configured. Please set auth config before deleting events."
      );
    }

    // Generate event URL
    const eventUrl = this.generateEventUrl(calendar, event);

    try {
      // DELETE request with optional If-Match header for conflict detection
      const headers: Record<string, string> = {};
      if (event.etag) {
        headers["If-Match"] = `"${event.etag}"`;
      }

      const response = await this.delete(eventUrl, headers);

      // Check if deletion was successful (200 OK, 204 No Content, or 404 Not Found)
      if (
        response.status !== 200 &&
        response.status !== 204 &&
        response.status !== 404
      ) {
        if (response.status === 412) {
          throw new Error(
            "Event deletion conflict: The event has been modified by another client. Please refresh and try again."
          );
        }
        throw new Error(`Event deletion failed with status ${response.status}`);
      }
    } catch (error) {
      if (error instanceof Error) {
        // If it's already a conflict error, re-throw as is
        if (error.message.includes("Event deletion conflict")) {
          throw error;
        }
        // Handle 412 Precondition Failed specifically
        if (error.message.includes("Server error (412)")) {
          throw new Error(
            "Event deletion conflict: The event has been modified by another client. Please refresh and try again."
          );
        }
        // If it's a network/HTTP error, wrap it with context
        if (
          error.message.includes("Authentication failed") ||
          error.message.includes("Access forbidden") ||
          error.message.includes("Resource not found") ||
          error.message.includes("Server error") ||
          error.message.includes("Network error")
        ) {
          throw new Error(`Event deletion failed: ${error.message}`);
        }
        throw new Error(`Event deletion failed: ${error.message}`);
      }
      throw new Error("Event deletion failed: Unknown error");
    }
  }

  /**
   * Create a new calendar using MKCALENDAR request
   * Implements CalDAV calendar creation protocol
   */
  public async createCalendar(
    displayName: string,
    color?: string,
    description?: string
  ): Promise<Calendar> {
    if (!this.authConfig) {
      throw new Error(
        "Authentication not configured. Please set auth config before creating calendars."
      );
    }

    if (!this.provider) {
      throw new Error(
        "Provider not set. Please set a provider before creating calendars."
      );
    }

    // Generate unique calendar URL
    const baseUrl = this.authConfig.caldavUrl.replace(/\/$/, "");
    const discoveryPath = this.provider.getCalendarDiscoveryPath();
    const username = this.authConfig.username;
    
    // Generate a unique calendar ID based on display name
    const calendarId = displayName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') + '-' + Date.now();

    let calendarUrl: string;
    if (baseUrl.includes(discoveryPath.replace(/\/$/, ""))) {
      if (baseUrl.endsWith(`/${username}`)) {
        calendarUrl = `${baseUrl}/${calendarId}/`;
      } else {
        calendarUrl = `${baseUrl}/${username}/${calendarId}/`;
      }
    } else {
      calendarUrl = `${baseUrl}${discoveryPath}${username}/${calendarId}/`;
    }

    // Convert to relative URL for proxy in development
    const requestUrl = this.convertToProxyUrl(calendarUrl);

    // MKCALENDAR request body
    const mkcalendarBody = `<?xml version="1.0" encoding="utf-8" ?>
<C:mkcalendar xmlns:D="DAV:" xmlns:C="urn:ietf:params:xml:ns:caldav" xmlns:A="http://apple.com/ns/ical/">
  <D:set>
    <D:prop>
      <D:displayname>${displayName}</D:displayname>
      ${description ? `<C:calendar-description>${description}</C:calendar-description>` : ''}
      ${color ? `<A:calendar-color>${color}</A:calendar-color>` : ''}
      <C:supported-calendar-component-set>
        <C:comp name="VEVENT"/>
        <C:comp name="VTODO"/>
      </C:supported-calendar-component-set>
    </D:prop>
  </D:set>
</C:mkcalendar>`;

    try {
      // MKCALENDAR request to create the calendar
      const response = await this.makeRequest(requestUrl, {
        method: "MKCALENDAR",
        body: mkcalendarBody,
        headers: {
          "Content-Type": "application/xml; charset=utf-8",
        },
      });

      // Check if creation was successful (201 Created)
      if (response.status !== 201) {
        throw new Error(`Calendar creation failed with status ${response.status}`);
      }

      // Return the created calendar object
      const serverBaseUrl = new URL(this.authConfig.caldavUrl).origin;
      return {
        url: `${serverBaseUrl}${calendarUrl.replace(serverBaseUrl, '')}`,
        displayName,
        color: color || '#3b82f6',
      };
    } catch (error) {
      if (error instanceof Error) {
        // If it's a network/HTTP error, wrap it with context
        if (
          error.message.includes("Authentication failed") ||
          error.message.includes("Access forbidden") ||
          error.message.includes("Resource not found") ||
          error.message.includes("Server error") ||
          error.message.includes("Network error")
        ) {
          throw new Error(`Calendar creation failed: ${error.message}`);
        }
        throw new Error(`Calendar creation failed: ${error.message}`);
      }
      throw new Error("Calendar creation failed: Unknown error");
    }
  }

  /**
   * Create a new address book using MKCOL request
   * Implements CardDAV address book creation protocol
   */
  public async createAddressBook(
    displayName: string,
    description?: string
  ): Promise<AddressBook> {
    if (!this.authConfig) {
      throw new Error(
        "Authentication not configured. Please set auth config before creating address books."
      );
    }

    if (!this.provider) {
      throw new Error(
        "Provider not set. Please set a provider before creating address books."
      );
    }

    // Generate unique address book URL
    const baseUrl = this.authConfig.carddavUrl.replace(/\/$/, "");
    const discoveryPath = this.provider.getAddressBookDiscoveryPath();
    const username = this.authConfig.username;
    
    // Generate a unique address book ID based on display name
    const addressBookId = displayName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') + '-' + Date.now();

    let addressBookUrl: string;
    if (baseUrl.includes(discoveryPath.replace(/\/$/, ""))) {
      if (baseUrl.endsWith(`/${username}`)) {
        addressBookUrl = `${baseUrl}/${addressBookId}/`;
      } else {
        addressBookUrl = `${baseUrl}/${username}/${addressBookId}/`;
      }
    } else {
      addressBookUrl = `${baseUrl}${discoveryPath}${username}/${addressBookId}/`;
    }

    // Convert to relative URL for proxy in development
    const requestUrl = this.convertToProxyUrl(addressBookUrl);

    // MKCOL request body for address book creation
    const mkcolBody = `<?xml version="1.0" encoding="utf-8" ?>
<D:mkcol xmlns:D="DAV:" xmlns:CARD="urn:ietf:params:xml:ns:carddav">
  <D:set>
    <D:prop>
      <D:resourcetype>
        <D:collection/>
        <CARD:addressbook/>
      </D:resourcetype>
      <D:displayname>${displayName}</D:displayname>
      ${description ? `<CARD:addressbook-description>${description}</CARD:addressbook-description>` : ''}
    </D:prop>
  </D:set>
</D:mkcol>`;

    try {
      // MKCOL request to create the address book
      const response = await this.makeRequest(requestUrl, {
        method: "MKCOL",
        body: mkcolBody,
        headers: {
          "Content-Type": "application/xml; charset=utf-8",
        },
      });

      // Check if creation was successful (201 Created)
      if (response.status !== 201) {
        throw new Error(`Address book creation failed with status ${response.status}`);
      }

      // Return the created address book object
      const serverBaseUrl = new URL(this.authConfig.carddavUrl).origin;
      return {
        url: `${serverBaseUrl}${addressBookUrl.replace(serverBaseUrl, '')}`,
        displayName,
      };
    } catch (error) {
      if (error instanceof Error) {
        // If it's a network/HTTP error, wrap it with context
        if (
          error.message.includes("Authentication failed") ||
          error.message.includes("Access forbidden") ||
          error.message.includes("Resource not found") ||
          error.message.includes("Server error") ||
          error.message.includes("Network error")
        ) {
          throw new Error(`Address book creation failed: ${error.message}`);
        }
        throw new Error(`Address book creation failed: ${error.message}`);
      }
      throw new Error("Address book creation failed: Unknown error");
    }
  }

  /**
   * Update address book properties using PROPPATCH request
   * Implements CardDAV address book property update protocol
   */
  public async updateAddressBookProperties(
    addressBook: AddressBook,
    properties: { displayName?: string }
  ): Promise<void> {
    if (!this.authConfig) {
      throw new Error(
        "Authentication not configured. Please set auth config before updating address book properties."
      );
    }

    // Convert to relative URL for proxy in development
    const requestUrl = this.convertToProxyUrl(addressBook.url);

    // Build PROPPATCH request body
    let propsToSet = '';
    if (properties.displayName) {
      propsToSet += `<D:displayname>${properties.displayName}</D:displayname>`;
    }

    const proppatchBody = `<?xml version="1.0" encoding="utf-8" ?>
<D:propertyupdate xmlns:D="DAV:" xmlns:CARD="urn:ietf:params:xml:ns:carddav">
  <D:set>
    <D:prop>
      ${propsToSet}
    </D:prop>
  </D:set>
</D:propertyupdate>`;

    try {
      // PROPPATCH request to update address book properties
      const response = await this.makeRequest(requestUrl, {
        method: "PROPPATCH",
        body: proppatchBody,
        headers: {
          "Content-Type": "application/xml; charset=utf-8",
        },
      });

      // Check if update was successful (200 OK or 207 Multi-Status)
      if (response.status !== 200 && response.status !== 207) {
        throw new Error(`Address book property update failed with status ${response.status}`);
      }
    } catch (error) {
      if (error instanceof Error) {
        // If it's a network/HTTP error, wrap it with context
        if (
          error.message.includes("Authentication failed") ||
          error.message.includes("Access forbidden") ||
          error.message.includes("Resource not found") ||
          error.message.includes("Server error") ||
          error.message.includes("Network error")
        ) {
          throw new Error(`Address book property update failed: ${error.message}`);
        }
        throw new Error(`Address book property update failed: ${error.message}`);
      }
      throw new Error("Address book property update failed: Unknown error");
    }
  }

  /**
   * Delete an existing address book using DELETE request
   * Implements CardDAV address book deletion protocol
   */
  public async deleteAddressBook(addressBook: AddressBook): Promise<void> {
    if (!this.authConfig) {
      throw new Error(
        "Authentication not configured. Please set auth config before deleting address books."
      );
    }

    // Convert to relative URL for proxy in development
    const requestUrl = this.convertToProxyUrl(addressBook.url);

    try {
      // DELETE request to remove the address book
      const response = await this.delete(requestUrl);

      // Check if deletion was successful (200 OK, 204 No Content, or 404 Not Found)
      if (
        response.status !== 200 &&
        response.status !== 204 &&
        response.status !== 404
      ) {
        throw new Error(`Address book deletion failed with status ${response.status}`);
      }
    } catch (error) {
      if (error instanceof Error) {
        // If it's a network/HTTP error, wrap it with context
        if (
          error.message.includes("Authentication failed") ||
          error.message.includes("Access forbidden") ||
          error.message.includes("Resource not found") ||
          error.message.includes("Server error") ||
          error.message.includes("Network error")
        ) {
          throw new Error(`Address book deletion failed: ${error.message}`);
        }
        throw new Error(`Address book deletion failed: ${error.message}`);
      }
      throw new Error("Address book deletion failed: Unknown error");
    }
  }

  /**
   * Delete an existing calendar using DELETE request
   * Implements CalDAV calendar deletion protocol
   */
  public async deleteCalendar(calendar: Calendar): Promise<void> {
    if (!this.authConfig) {
      throw new Error(
        "Authentication not configured. Please set auth config before deleting calendars."
      );
    }

    // Convert to relative URL for proxy in development
    const requestUrl = this.convertToProxyUrl(calendar.url);

    try {
      // DELETE request to remove the calendar
      const response = await this.delete(requestUrl);

      // Check if deletion was successful (200 OK, 204 No Content, or 404 Not Found)
      if (
        response.status !== 200 &&
        response.status !== 204 &&
        response.status !== 404
      ) {
        throw new Error(`Calendar deletion failed with status ${response.status}`);
      }
    } catch (error) {
      if (error instanceof Error) {
        // If it's a network/HTTP error, wrap it with context
        if (
          error.message.includes("Authentication failed") ||
          error.message.includes("Access forbidden") ||
          error.message.includes("Resource not found") ||
          error.message.includes("Server error") ||
          error.message.includes("Network error")
        ) {
          throw new Error(`Calendar deletion failed: ${error.message}`);
        }
        throw new Error(`Calendar deletion failed: ${error.message}`);
      }
      throw new Error("Calendar deletion failed: Unknown error");
    }
  }

  /**
   * Update calendar properties using PROPPATCH request
   * Implements CalDAV calendar property update protocol
   */
  public async updateCalendarProperties(
    calendar: Calendar,
    properties: { displayName?: string; color?: string; description?: string }
  ): Promise<void> {
    if (!this.authConfig) {
      throw new Error(
        "Authentication not configured. Please set auth config before updating calendar properties."
      );
    }

    // Convert to relative URL for proxy in development
    const requestUrl = this.convertToProxyUrl(calendar.url);

    // Build PROPPATCH request body
    let propsToSet = '';
    if (properties.displayName) {
      propsToSet += `<D:displayname>${properties.displayName}</D:displayname>`;
    }
    if (properties.color) {
      propsToSet += `<A:calendar-color>${properties.color}</A:calendar-color>`;
    }
    if (properties.description) {
      propsToSet += `<C:calendar-description>${properties.description}</C:calendar-description>`;
    }

    const proppatchBody = `<?xml version="1.0" encoding="utf-8" ?>
<D:propertyupdate xmlns:D="DAV:" xmlns:C="urn:ietf:params:xml:ns:caldav" xmlns:A="http://apple.com/ns/ical/">
  <D:set>
    <D:prop>
      ${propsToSet}
    </D:prop>
  </D:set>
</D:propertyupdate>`;

    try {
      // PROPPATCH request to update calendar properties
      const response = await this.makeRequest(requestUrl, {
        method: "PROPPATCH",
        body: proppatchBody,
        headers: {
          "Content-Type": "application/xml; charset=utf-8",
        },
      });

      // Check if update was successful (207 Multi-Status is typical for PROPPATCH)
      if (response.status !== 207 && response.status !== 200) {
        throw new Error(`Calendar property update failed with status ${response.status}`);
      }
    } catch (error) {
      if (error instanceof Error) {
        // If it's a network/HTTP error, wrap it with context
        if (
          error.message.includes("Authentication failed") ||
          error.message.includes("Access forbidden") ||
          error.message.includes("Resource not found") ||
          error.message.includes("Server error") ||
          error.message.includes("Network error")
        ) {
          throw new Error(`Calendar property update failed: ${error.message}`);
        }
        throw new Error(`Calendar property update failed: ${error.message}`);
      }
      throw new Error("Calendar property update failed: Unknown error");
    }
  }

  /**
   * Create a new contact using PUT request with vCard data
   * Implements CardDAV contact creation protocol
   */
  public async createContact(
    addressBook: AddressBook,
    contact: Contact
  ): Promise<void> {
    if (!this.authConfig) {
      throw new Error(
        "Authentication not configured. Please set auth config before creating contacts."
      );
    }

    // Generate unique URL for the new contact
    const contactUrl = this.generateContactUrl(addressBook, contact);

    // Generate vCard data
    const vcardData = this.generateVCardData(contact);

    try {
      // PUT request to create the contact
      const response = await this.put(contactUrl, vcardData, {
        "Content-Type": "text/vcard; charset=utf-8",
      });

      // Check if creation was successful (201 Created or 204 No Content)
      if (response.status !== 201 && response.status !== 204) {
        throw new Error(
          `Contact creation failed with status ${response.status}`
        );
      }
    } catch (error) {
      if (error instanceof Error) {
        // If it's a network/HTTP error, wrap it with context
        if (
          error.message.includes("Authentication failed") ||
          error.message.includes("Access forbidden") ||
          error.message.includes("Resource not found") ||
          error.message.includes("Server error") ||
          error.message.includes("Network error")
        ) {
          throw new Error(`Contact creation failed: ${error.message}`);
        }
        throw new Error(`Contact creation failed: ${error.message}`);
      }
      throw new Error("Contact creation failed: Unknown error");
    }
  }

  /**
   * Update an existing contact using PUT request with ETag handling
   * Implements CardDAV contact update protocol with conflict detection
   */
  public async updateContact(
    addressBook: AddressBook,
    contact: Contact
  ): Promise<void> {
    if (!this.authConfig) {
      throw new Error(
        "Authentication not configured. Please set auth config before updating contacts."
      );
    }

    if (!contact.etag) {
      throw new Error(
        "Contact ETag is required for updates to detect conflicts."
      );
    }

    // Generate contact URL (should be the same as the original)
    const contactUrl = this.generateContactUrl(addressBook, contact);

    // Generate updated vCard data
    const vcardData = this.generateVCardData(contact);

    try {
      // PUT request with If-Match header for conflict detection
      const response = await this.put(contactUrl, vcardData, {
        "Content-Type": "text/vcard; charset=utf-8",
        "If-Match": `"${contact.etag}"`,
      });

      // Check if update was successful (200 OK or 204 No Content)
      if (response.status !== 200 && response.status !== 204) {
        if (response.status === 412) {
          throw new Error(
            "Contact update conflict: The contact has been modified by another client. Please refresh and try again."
          );
        }
        throw new Error(`Contact update failed with status ${response.status}`);
      }

      // Update the contact's ETag with the new one from the response
      const newETag = response.headers?.etag?.replace(/"/g, "");
      if (newETag) {
        contact.etag = newETag;
      }
    } catch (error) {
      if (error instanceof Error) {
        // If it's already a conflict error, re-throw as is
        if (error.message.includes("Contact update conflict")) {
          throw error;
        }
        // Handle 412 Precondition Failed specifically
        if (error.message.includes("Server error (412)")) {
          throw new Error(
            "Contact update conflict: The contact has been modified by another client. Please refresh and try again."
          );
        }
        // If it's a network/HTTP error, wrap it with context
        if (
          error.message.includes("Authentication failed") ||
          error.message.includes("Access forbidden") ||
          error.message.includes("Resource not found") ||
          error.message.includes("Server error") ||
          error.message.includes("Network error")
        ) {
          throw new Error(`Contact update failed: ${error.message}`);
        }
        throw new Error(`Contact update failed: ${error.message}`);
      }
      throw new Error("Contact update failed: Unknown error");
    }
  }

  /**
   * Delete an existing contact using DELETE request with ETag handling
   * Implements CardDAV contact deletion protocol with conflict detection
   */
  public async deleteContact(
    addressBook: AddressBook,
    contact: Contact
  ): Promise<void> {
    if (!this.authConfig) {
      throw new Error(
        "Authentication not configured. Please set auth config before deleting contacts."
      );
    }

    // Generate contact URL
    const contactUrl = this.generateContactUrl(addressBook, contact);

    try {
      // DELETE request with optional If-Match header for conflict detection
      const headers: Record<string, string> = {};
      if (contact.etag) {
        headers["If-Match"] = `"${contact.etag}"`;
      }

      const response = await this.delete(contactUrl, headers);

      // Check if deletion was successful (200 OK, 204 No Content, or 404 Not Found)
      if (
        response.status !== 200 &&
        response.status !== 204 &&
        response.status !== 404
      ) {
        if (response.status === 412) {
          throw new Error(
            "Contact deletion conflict: The contact has been modified by another client. Please refresh and try again."
          );
        }
        throw new Error(
          `Contact deletion failed with status ${response.status}`
        );
      }
    } catch (error) {
      if (error instanceof Error) {
        // If it's already a conflict error, re-throw as is
        if (error.message.includes("Contact deletion conflict")) {
          throw error;
        }
        // Handle 412 Precondition Failed specifically
        if (error.message.includes("Server error (412)")) {
          throw new Error(
            "Contact deletion conflict: The contact has been modified by another client. Please refresh and try again."
          );
        }
        // If it's a network/HTTP error, wrap it with context
        if (
          error.message.includes("Authentication failed") ||
          error.message.includes("Access forbidden") ||
          error.message.includes("Resource not found") ||
          error.message.includes("Server error") ||
          error.message.includes("Network error")
        ) {
          throw new Error(`Contact deletion failed: ${error.message}`);
        }
        throw new Error(`Contact deletion failed: ${error.message}`);
      }
      throw new Error("Contact deletion failed: Unknown error");
    }
  }

  /**
   * Parse PROPFIND response to extract calendar information
   */
  private parseCalendarDiscoveryResponse(
    xmlData: string,
    baseUrl: string
  ): Calendar[] {
    const calendars: Calendar[] = [];

    try {
      // Parse XML response using DOMParser
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlData, "text/xml");

      // Find all response elements
      const responses = xmlDoc.getElementsByTagNameNS("DAV:", "response");

      for (let i = 0; i < responses.length; i++) {
        const response = responses[i];

        // Get the href (URL) of the resource
        const hrefElement = response.getElementsByTagNameNS("DAV:", "href")[0];
        if (!hrefElement) continue;

        const href = hrefElement.textContent?.trim();
        if (!href) continue;

        // Check if this is a calendar collection
        const resourceTypeElement = response.getElementsByTagNameNS(
          "DAV:",
          "resourcetype"
        )[0];
        if (!resourceTypeElement) continue;

        const isCalendar =
          resourceTypeElement.getElementsByTagNameNS(
            "urn:ietf:params:xml:ns:caldav",
            "calendar"
          ).length > 0;
        if (!isCalendar) continue;

        // Get display name
        const displayNameElement = response.getElementsByTagNameNS(
          "DAV:",
          "displayname"
        )[0];
        const displayName =
          displayNameElement?.textContent?.trim() || "Unnamed Calendar";

        // Get calendar color if available - try multiple namespaces
        let colorElement = response.getElementsByTagNameNS(
          "urn:ietf:params:xml:ns:caldav",
          "calendar-color"
        )[0];
        
        // Try alternative namespaces if not found
        if (!colorElement) {
          colorElement = response.getElementsByTagNameNS(
            "http://apple.com/ns/ical/",
            "calendar-color"
          )[0];
        }
        
        // Try without namespace (some servers don't use proper namespaces)
        if (!colorElement) {
          const allElements = response.getElementsByTagName("*");
          for (let j = 0; j < allElements.length; j++) {
            const element = allElements[j];
            if (element.localName === "calendar-color" || element.tagName.endsWith(":calendar-color")) {
              colorElement = element;
              break;
            }
          }
        }
        
        const color = colorElement?.textContent?.trim();

        // Build full URL
        const fullUrl = href.startsWith("http") ? href : `${baseUrl}${href}`;

        calendars.push({
          url: fullUrl,
          displayName,
          color,
        });
      }

      return calendars;
    } catch (error) {
      throw new Error(
        `Failed to parse calendar discovery response: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
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
      const xmlDoc = parser.parseFromString(xmlData, "text/xml");

      // Find all response elements
      const responses = xmlDoc.getElementsByTagNameNS("DAV:", "response");

      for (let i = 0; i < responses.length; i++) {
        const response = responses[i];

        // Get ETag for conflict detection
        const etagElement = response.getElementsByTagNameNS(
          "DAV:",
          "getetag"
        )[0];
        const etag = etagElement?.textContent?.trim().replace(/"/g, "");

        // Get calendar data
        const calendarDataElement = response.getElementsByTagNameNS(
          "urn:ietf:params:xml:ns:caldav",
          "calendar-data"
        )[0];
        if (!calendarDataElement) continue;

        const icalData = calendarDataElement.textContent?.trim();
        if (!icalData) continue;

        try {
          // Parse iCalendar data using ICAL.js
          const jcalData = ICAL.parse(icalData);
          const comp = new ICAL.Component(jcalData);

          // Find VEVENT components
          const vevents = comp.getAllSubcomponents("vevent");

          for (const vevent of vevents) {
            const event = new ICAL.Event(vevent);

            // Extract event properties
            const calendarEvent: CalendarEvent = {
              uid: event.uid || "",
              summary: event.summary || "",
              description: event.description || undefined,
              dtstart: event.startDate
                ? event.startDate.toJSDate()
                : new Date(),
              dtend: event.endDate ? event.endDate.toJSDate() : new Date(),
              location: event.location || undefined,
              etag,
            };

            events.push(calendarEvent);
          }
        } catch (icalError) {
          console.warn("Failed to parse iCalendar data:", icalError);
          // Continue processing other events
        }
      }

      return events;
    } catch (error) {
      throw new Error(
        `Failed to parse calendar events response: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Parse PROPFIND response to extract address book information
   */
  private parseAddressBookDiscoveryResponse(
    xmlData: string,
    baseUrl: string
  ): AddressBook[] {
    const addressBooks: AddressBook[] = [];

    try {
      // Parse XML response using DOMParser
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlData, "text/xml");

      // Find all response elements
      const responses = xmlDoc.getElementsByTagNameNS("DAV:", "response");

      for (let i = 0; i < responses.length; i++) {
        const response = responses[i];

        // Get the href (URL) of the resource
        const hrefElement = response.getElementsByTagNameNS("DAV:", "href")[0];
        if (!hrefElement) continue;

        const href = hrefElement.textContent?.trim();
        if (!href) continue;

        // Check if this is an address book collection
        const resourceTypeElement = response.getElementsByTagNameNS(
          "DAV:",
          "resourcetype"
        )[0];
        if (!resourceTypeElement) continue;

        const isAddressBook =
          resourceTypeElement.getElementsByTagNameNS(
            "urn:ietf:params:xml:ns:carddav",
            "addressbook"
          ).length > 0;
        if (!isAddressBook) continue;

        // Get display name
        const displayNameElement = response.getElementsByTagNameNS(
          "DAV:",
          "displayname"
        )[0];
        const displayName =
          displayNameElement?.textContent?.trim() || "Unnamed Address Book";

        // Build full URL
        const fullUrl = href.startsWith("http") ? href : `${baseUrl}${href}`;

        addressBooks.push({
          url: fullUrl,
          displayName,
        });
      }

      return addressBooks;
    } catch (error) {
      throw new Error(
        `Failed to parse address book discovery response: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
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
      const xmlDoc = parser.parseFromString(xmlData, "text/xml");

      // Find all response elements
      const responses = xmlDoc.getElementsByTagNameNS("DAV:", "response");

      for (let i = 0; i < responses.length; i++) {
        const response = responses[i];

        // Get ETag for conflict detection
        const etagElement = response.getElementsByTagNameNS(
          "DAV:",
          "getetag"
        )[0];
        const etag = etagElement?.textContent?.trim().replace(/"/g, "");

        // Get address data
        const addressDataElement = response.getElementsByTagNameNS(
          "urn:ietf:params:xml:ns:carddav",
          "address-data"
        )[0];
        if (!addressDataElement) continue;

        const vcardData = addressDataElement.textContent?.trim();
        if (!vcardData) continue;

        try {
          // Parse vCard data using vcard-parser library
          const vcard = vcardParser.parse(vcardData);

          // Extract contact properties
          const nProperty = this.getVCardProperty(vcard, "n");
          const fnProperty =
            this.getVCardProperty(vcard, "fn") || "Unnamed Contact";
          let firstName = "";
          let lastName = "";

          console.log(`Parsing contact: FN="${fnProperty}", N="${nProperty}"`);

          // Parse N property (structured name: LastName;FirstName;MiddleName;Prefix;Suffix)
          if (nProperty && typeof nProperty === "string") {
            const nameParts = nProperty.split(";");
            lastName = nameParts[0] || "";
            firstName = nameParts[1] || "";
            console.log(
              `From N property: firstName="${firstName}", lastName="${lastName}"`
            );
          } else {
            // Fallback: try to parse FN field for backward compatibility
            const nameParts = fnProperty.trim().split(" ");
            if (nameParts.length === 1) {
              firstName = nameParts[0];
            } else if (nameParts.length >= 2) {
              firstName = nameParts[0];
              lastName = nameParts.slice(1).join(" ");
            }
            console.log(
              `From FN fallback: firstName="${firstName}", lastName="${lastName}"`
            );
          }

          const contact: Contact = {
            uid: this.getVCardProperty(vcard, "uid") || "",
            fn: fnProperty,
            firstName: firstName || undefined,
            lastName: lastName || undefined,
            email: this.getVCardPropertyArray(vcard, "email"),
            tel: this.getVCardPropertyArray(vcard, "tel"),
            org: this.getVCardProperty(vcard, "org"),
            photo: this.getVCardPhoto(vcard),
            etag,
          };

          console.log(`Successfully parsed contact:`, contact);
          contacts.push(contact);
        } catch (vcardError) {
          console.warn("Failed to parse vCard data:", vcardError);
          console.warn("vCard data was:", vcardData);
          // Continue processing other contacts
        }
      }

      return contacts;
    } catch (error) {
      throw new Error(
        `Failed to parse contacts response: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Helper method to extract a single property value from vCard
   */
  private getVCardProperty(
    vcard: any,
    propertyName: string
  ): string | undefined {
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
  private getVCardPropertyArray(
    vcard: any,
    propertyName: string
  ): string[] | undefined {
    try {
      const properties = vcard[propertyName.toLowerCase()];
      if (properties && Array.isArray(properties)) {
        const values = properties
          .map((prop) => prop.value)
          .filter((val) => val);
        return values.length > 0 ? values : undefined;
      }
    } catch (error) {
      // Property doesn't exist or error accessing it
    }
    return undefined;
  }

  /**
   * Helper method to extract photo data from vCard
   */
  private getVCardPhoto(vcard: any): string | undefined {
    try {
      const photoProperty = vcard.photo;
      if (photoProperty && Array.isArray(photoProperty) && photoProperty.length > 0) {
        const photo = photoProperty[0];
        
        // Handle different photo formats
        if (photo.value) {
          // If it's already a data URL or URL, return as is
          if (photo.value.startsWith('data:') || photo.value.startsWith('http')) {
            return photo.value;
          }
          
          // If it's base64 data, construct data URL
          if (photo.params && photo.params.type) {
            return `data:${photo.params.type};base64,${photo.value}`;
          }
          
          // Default to JPEG if no type specified
          return `data:image/jpeg;base64,${photo.value}`;
        }
      }
    } catch (error) {
      console.warn("Failed to parse photo from vCard:", error);
    }
    return undefined;
  }

  /**
   * Generate a unique URL for a calendar event
   * Uses the event UID to create a consistent URL
   */
  private generateEventUrl(calendar: Calendar, event: CalendarEvent): string {
    // Ensure calendar URL ends with /
    const calendarUrl = calendar.url.endsWith("/")
      ? calendar.url
      : `${calendar.url}/`;

    // Generate filename from UID, ensuring it's URL-safe
    const filename = `${event.uid}.ics`;

    return `${calendarUrl}${filename}`;
  }

  /**
   * Generate iCalendar data from CalendarEvent
   */
  private generateICalendarData(event: CalendarEvent): string {
    try {
      // Format dates to iCalendar format (YYYYMMDDTHHMMSSZ)
      const formatDate = (date: Date): string => {
        return date
          .toISOString()
          .replace(/[-:]/g, "")
          .replace(/\.\d{3}/, "");
      };

      const now = new Date();
      const dtstart = formatDate(event.dtstart);
      const dtend = formatDate(event.dtend);
      const dtstamp = formatDate(now);
      const created = formatDate(now);
      const lastModified = formatDate(now);

      // Build iCalendar string manually for reliability
      let icalData = "BEGIN:VCALENDAR\r\n";
      icalData += "VERSION:2.0\r\n";
      icalData += "PRODID:-//Clowd-DAV//EN\r\n";
      icalData += "CALSCALE:GREGORIAN\r\n";
      icalData += "BEGIN:VEVENT\r\n";
      icalData += `UID:${event.uid}\r\n`;
      icalData += `SUMMARY:${this.escapeICalValue(event.summary)}\r\n`;

      if (event.description) {
        icalData += `DESCRIPTION:${this.escapeICalValue(
          event.description
        )}\r\n`;
      }

      if (event.location) {
        icalData += `LOCATION:${this.escapeICalValue(event.location)}\r\n`;
      }

      icalData += `DTSTART:${dtstart}\r\n`;
      icalData += `DTEND:${dtend}\r\n`;
      icalData += `DTSTAMP:${dtstamp}\r\n`;
      icalData += `CREATED:${created}\r\n`;
      icalData += `LAST-MODIFIED:${lastModified}\r\n`;
      icalData += "END:VEVENT\r\n";
      icalData += "END:VCALENDAR\r\n";

      return icalData;
    } catch (error) {
      throw new Error(
        `Failed to generate iCalendar data: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Escape special characters in iCalendar values
   */
  private escapeICalValue(value: string): string {
    return value
      .replace(/\\/g, "\\\\") // Escape backslashes
      .replace(/;/g, "\\;") // Escape semicolons
      .replace(/,/g, "\\,") // Escape commas
      .replace(/\n/g, "\\n") // Escape newlines
      .replace(/\r/g, ""); // Remove carriage returns
  }

  /**
   * Generate a unique URL for a contact
   * Uses the contact UID to create a consistent URL
   */
  private generateContactUrl(
    addressBook: AddressBook,
    contact: Contact
  ): string {
    // Ensure address book URL ends with /
    const addressBookUrl = addressBook.url.endsWith("/")
      ? addressBook.url
      : `${addressBook.url}/`;

    // Generate filename from UID, ensuring it's URL-safe
    const filename = `${contact.uid}.vcf`;

    return `${addressBookUrl}${filename}`;
  }

  /**
   * Generate vCard data from Contact
   */
  private generateVCardData(contact: Contact): string {
    try {
      // Build vCard string manually for reliability
      let vcardData = "BEGIN:VCARD\r\n";
      vcardData += "VERSION:3.0\r\n";
      vcardData += `UID:${contact.uid}\r\n`;
      vcardData += `FN:${this.escapeVCardValue(contact.fn)}\r\n`;

      // Add structured name (N property: LastName;FirstName;MiddleName;Prefix;Suffix)
      const lastName = contact.lastName || "";
      const firstName = contact.firstName || "";
      vcardData += `N:${this.escapeVCardValue(
        lastName
      )};${this.escapeVCardValue(firstName)};;;\r\n`;

      // Add email addresses
      if (contact.email && contact.email.length > 0) {
        for (const email of contact.email) {
          vcardData += `EMAIL:${this.escapeVCardValue(email)}\r\n`;
        }
      }

      // Add phone numbers
      if (contact.tel && contact.tel.length > 0) {
        for (const tel of contact.tel) {
          vcardData += `TEL:${this.escapeVCardValue(tel)}\r\n`;
        }
      }

      // Add organization
      if (contact.org) {
        vcardData += `ORG:${this.escapeVCardValue(contact.org)}\r\n`;
      }

      // Add photo
      if (contact.photo) {
        // Handle different photo formats
        if (contact.photo.startsWith('data:')) {
          // Extract base64 data and MIME type from data URL
          const matches = contact.photo.match(/^data:([^;]+);base64,(.+)$/);
          if (matches) {
            const mimeType = matches[1];
            const base64Data = matches[2];
            vcardData += `PHOTO;TYPE=${mimeType};ENCODING=BASE64:${base64Data}\r\n`;
          }
        } else if (contact.photo.startsWith('http')) {
          // URL reference
          vcardData += `PHOTO;VALUE=URL:${contact.photo}\r\n`;
        } else {
          // Assume it's base64 data without data URL wrapper
          vcardData += `PHOTO;TYPE=JPEG;ENCODING=BASE64:${contact.photo}\r\n`;
        }
      }

      vcardData += "END:VCARD\r\n";

      return vcardData;
    } catch (error) {
      throw new Error(
        `Failed to generate vCard data: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }



  /**
   * Validate PROPPATCH response to ensure properties were updated successfully
   */
  private validateProppatchResponse(xmlData: string): void {
    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlData, "text/xml");

      // Find all propstat elements
      const propstats = xmlDoc.getElementsByTagNameNS("DAV:", "propstat");

      for (let i = 0; i < propstats.length; i++) {
        const propstat = propstats[i];
        const statusElement = propstat.getElementsByTagNameNS("DAV:", "status")[0];
        
        if (statusElement) {
          const status = statusElement.textContent?.trim();
          // Check if status indicates success (2xx status codes)
          if (status && !status.includes("200") && !status.includes("204")) {
            throw new Error(`Property update failed with status: ${status}`);
          }
        }
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes("Property update failed")) {
        throw error;
      }
      // If we can't parse the response, assume success (some servers don't return detailed responses)
      console.warn("Could not parse PROPPATCH response, assuming success");
    }
  }

  /**
   * Escape special characters in XML values
   */
  private escapeXmlValue(value: string): string {
    return value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  /**
   * Escape special characters in vCard values
   */
  private escapeVCardValue(value: string): string {
    return value
      .replace(/\\/g, "\\\\") // Escape backslashes
      .replace(/;/g, "\\;") // Escape semicolons
      .replace(/,/g, "\\,") // Escape commas
      .replace(/\n/g, "\\n") // Escape newlines
      .replace(/\r/g, ""); // Remove carriage returns
  }
}
