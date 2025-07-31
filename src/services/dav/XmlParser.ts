import { Calendar, AddressBook } from "../../types/dav";

export class XmlParser {
  /**
   * Parse PROPFIND response to extract calendar information
   */
  public parseCalendarDiscoveryResponse(
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
   * Parse PROPFIND response to extract address book information
   */
  public parseAddressBookDiscoveryResponse(
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
   * Validate PROPPATCH response to ensure properties were updated successfully
   */
  public validateProppatchResponse(xmlData: string): void {
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
  public escapeXmlValue(value: string): string {
    return value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }
}