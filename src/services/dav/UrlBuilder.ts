import { DAVProvider } from "../../types/providers";
import { AuthConfig } from "../../types/auth";
import { Calendar, AddressBook, CalendarEvent, Contact } from "../../types/dav";

export class UrlBuilder {
  /**
   * Convert absolute URLs to relative URLs for proxy in development
   */
  public convertToProxyUrl(url: string): string {
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

  /**
   * Build calendar discovery URL
   */
  public buildCalendarDiscoveryUrl(
    authConfig: AuthConfig,
    provider: DAVProvider
  ): string {
    const baseUrl = authConfig.caldavUrl.replace(/\/$/, "");
    const discoveryPath = provider.getCalendarDiscoveryPath();
    const username = authConfig.username;

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

    return this.convertToProxyUrl(discoveryUrl);
  }

  /**
   * Build address book discovery URL
   */
  public buildAddressBookDiscoveryUrl(
    authConfig: AuthConfig,
    provider: DAVProvider
  ): string {
    const baseUrl = authConfig.carddavUrl.replace(/\/$/, "");
    const discoveryPath = provider.getAddressBookDiscoveryPath();
    const username = authConfig.username;

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

    return this.convertToProxyUrl(discoveryUrl);
  }

  /**
   * Generate a unique URL for a calendar event
   * Uses the event UID to create a consistent URL
   */
  public generateEventUrl(calendar: Calendar, event: CalendarEvent): string {
    // Ensure calendar URL ends with /
    const calendarUrl = calendar.url.endsWith("/")
      ? calendar.url
      : `${calendar.url}/`;

    // Generate filename from UID, ensuring it's URL-safe
    const filename = `${event.uid}.ics`;

    return `${calendarUrl}${filename}`;
  }

  /**
   * Generate a unique URL for a contact
   * Uses the contact UID to create a consistent URL
   */
  public generateContactUrl(
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
   * Build calendar creation URL
   */
  public buildCalendarUrl(
    authConfig: AuthConfig,
    provider: DAVProvider,
    displayName: string
  ): string {
    const baseUrl = authConfig.caldavUrl.replace(/\/$/, "");
    const discoveryPath = provider.getCalendarDiscoveryPath();
    const username = authConfig.username;
    
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

    return calendarUrl;
  }

  /**
   * Build address book creation URL
   */
  public buildAddressBookUrl(
    authConfig: AuthConfig,
    provider: DAVProvider,
    displayName: string
  ): string {
    const baseUrl = authConfig.carddavUrl.replace(/\/$/, "");
    const discoveryPath = provider.getAddressBookDiscoveryPath();
    const username = authConfig.username;
    
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

    return addressBookUrl;
  }
}