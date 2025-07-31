import { CalendarEvent, Contact } from "../../types/dav";
import ICAL from "ical.js";
const vcardParser = require("vcard-parser");

export class DataFormatters {
  /**
   * Parse REPORT response to extract calendar events using ICAL.js
   */
  public parseCalendarEventsResponse(xmlData: string): CalendarEvent[] {
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
   * Parse REPORT response to extract contacts using VCF library
   */
  public parseContactsResponse(xmlData: string): Contact[] {
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
   * Generate iCalendar data from CalendarEvent
   */
  public generateICalendarData(event: CalendarEvent): string {
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
   * Generate vCard data from Contact
   */
  public generateVCardData(contact: Contact): string {
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