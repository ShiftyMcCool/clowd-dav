import { Calendar, CalendarEvent, DateRange } from "../../types/dav";
import { HttpClient } from "./HttpClient";
import { XmlParser } from "./XmlParser";
import { UrlBuilder } from "./UrlBuilder";
import { DataFormatters } from "./DataFormatters";

export class CalendarService {
  private httpClient: HttpClient;
  private xmlParser: XmlParser;
  private urlBuilder: UrlBuilder;
  private dataFormatters: DataFormatters;

  constructor(httpClient: HttpClient) {
    this.httpClient = httpClient;
    this.xmlParser = new XmlParser();
    this.urlBuilder = new UrlBuilder();
    this.dataFormatters = new DataFormatters();
  }

  /**
   * Discover calendars using PROPFIND requests
   * Implements CalDAV calendar discovery protocol
   */
  public async discoverCalendars(): Promise<Calendar[]> {
    const provider = this.httpClient.getProvider();
    const authConfig = this.httpClient.getAuthConfig();

    if (!provider) {
      throw new Error(
        "Provider not set. Please set a provider before discovering calendars."
      );
    }

    if (!authConfig) {
      throw new Error(
        "Authentication not configured. Please set auth config before discovering calendars."
      );
    }

    const discoveryUrl = this.urlBuilder.buildCalendarDiscoveryUrl(authConfig, provider);

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
      const response = await this.httpClient.propfind(discoveryUrl, propfindBody, "1");

      // Use the server base URL (without the path) for constructing full URLs
      const serverBaseUrl = new URL(authConfig.caldavUrl).origin;
      const calendars = this.xmlParser.parseCalendarDiscoveryResponse(
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
   * Retrieve calendar events using REPORT requests with date filtering
   * Implements CalDAV calendar-query protocol
   */
  public async getEvents(
    calendar: Calendar,
    dateRange: DateRange
  ): Promise<CalendarEvent[]> {
    const authConfig = this.httpClient.getAuthConfig();

    if (!authConfig) {
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
      const response = await this.httpClient.report(calendar.url, reportBody);
      return this.dataFormatters.parseCalendarEventsResponse(response.data);
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
   * Create a new calendar event using PUT request with iCalendar data
   * Implements CalDAV event creation protocol
   */
  public async createEvent(
    calendar: Calendar,
    event: CalendarEvent
  ): Promise<void> {
    const authConfig = this.httpClient.getAuthConfig();

    if (!authConfig) {
      throw new Error(
        "Authentication not configured. Please set auth config before creating events."
      );
    }

    // Generate unique URL for the new event
    const eventUrl = this.urlBuilder.generateEventUrl(calendar, event);

    // Generate iCalendar data
    const icalData = this.dataFormatters.generateICalendarData(event);

    try {
      // PUT request to create the event
      const response = await this.httpClient.put(eventUrl, icalData, {
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
    const authConfig = this.httpClient.getAuthConfig();

    if (!authConfig) {
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
    const eventUrl = this.urlBuilder.generateEventUrl(calendar, event);

    // Generate updated iCalendar data
    const icalData = this.dataFormatters.generateICalendarData(event);

    try {
      // PUT request with If-Match header for conflict detection
      const response = await this.httpClient.put(eventUrl, icalData, {
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
    const authConfig = this.httpClient.getAuthConfig();

    if (!authConfig) {
      throw new Error(
        "Authentication not configured. Please set auth config before deleting events."
      );
    }

    // Generate event URL
    const eventUrl = this.urlBuilder.generateEventUrl(calendar, event);

    try {
      // DELETE request with optional If-Match header for conflict detection
      const headers: Record<string, string> = {};
      if (event.etag) {
        headers["If-Match"] = `"${event.etag}"`;
      }

      const response = await this.httpClient.delete(eventUrl, headers);

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
    const authConfig = this.httpClient.getAuthConfig();
    const provider = this.httpClient.getProvider();

    if (!authConfig) {
      throw new Error(
        "Authentication not configured. Please set auth config before creating calendars."
      );
    }

    if (!provider) {
      throw new Error(
        "Provider not set. Please set a provider before creating calendars."
      );
    }

    const calendarUrl = this.urlBuilder.buildCalendarUrl(authConfig, provider, displayName);

    // Convert to relative URL for proxy in development
    const requestUrl = this.urlBuilder.convertToProxyUrl(calendarUrl);

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
      const response = await this.httpClient.makeRequest(requestUrl, {
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
      const serverBaseUrl = new URL(authConfig.caldavUrl).origin;
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
   * Delete an existing calendar using DELETE request
   * Implements CalDAV calendar deletion protocol
   */
  public async deleteCalendar(calendar: Calendar): Promise<void> {
    const authConfig = this.httpClient.getAuthConfig();

    if (!authConfig) {
      throw new Error(
        "Authentication not configured. Please set auth config before deleting calendars."
      );
    }

    // Convert to relative URL for proxy in development
    const requestUrl = this.urlBuilder.convertToProxyUrl(calendar.url);

    try {
      // DELETE request to remove the calendar
      const response = await this.httpClient.delete(requestUrl);

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
    const authConfig = this.httpClient.getAuthConfig();

    if (!authConfig) {
      throw new Error(
        "Authentication not configured. Please set auth config before updating calendar properties."
      );
    }

    // Convert to relative URL for proxy in development
    const requestUrl = this.urlBuilder.convertToProxyUrl(calendar.url);

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
      const response = await this.httpClient.makeRequest(requestUrl, {
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
}