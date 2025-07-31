import { AddressBook, Contact } from "../../types/dav";
import { HttpClient } from "./HttpClient";
import { XmlParser } from "./XmlParser";
import { UrlBuilder } from "./UrlBuilder";
import { DataFormatters } from "./DataFormatters";

export class ContactService {
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
   * Discover address books using PROPFIND requests
   * Implements CardDAV address book discovery protocol
   */
  public async discoverAddressBooks(): Promise<AddressBook[]> {
    const provider = this.httpClient.getProvider();
    const authConfig = this.httpClient.getAuthConfig();

    if (!provider) {
      throw new Error(
        "Provider not set. Please set a provider before discovering address books."
      );
    }

    if (!authConfig) {
      throw new Error(
        "Authentication not configured. Please set auth config before discovering address books."
      );
    }

    const discoveryUrl = this.urlBuilder.buildAddressBookDiscoveryUrl(authConfig, provider);

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
      const response = await this.httpClient.propfind(discoveryUrl, propfindBody, "1");
      // Use the server base URL (without the path) for constructing full URLs
      const serverBaseUrl = new URL(authConfig.carddavUrl).origin;
      return this.xmlParser.parseAddressBookDiscoveryResponse(
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
   * Retrieve contacts using REPORT requests
   * Implements CardDAV addressbook-query protocol
   */
  public async getContacts(addressBook: AddressBook): Promise<Contact[]> {
    const authConfig = this.httpClient.getAuthConfig();

    if (!authConfig) {
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
      const response = await this.httpClient.report(addressBook.url, reportBody);
      return this.dataFormatters.parseContactsResponse(response.data);
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
   * Create a new contact using PUT request with vCard data
   * Implements CardDAV contact creation protocol
   */
  public async createContact(
    addressBook: AddressBook,
    contact: Contact
  ): Promise<void> {
    const authConfig = this.httpClient.getAuthConfig();

    if (!authConfig) {
      throw new Error(
        "Authentication not configured. Please set auth config before creating contacts."
      );
    }

    // Generate unique URL for the new contact
    const contactUrl = this.urlBuilder.generateContactUrl(addressBook, contact);

    // Generate vCard data
    const vcardData = this.dataFormatters.generateVCardData(contact);

    try {
      // PUT request to create the contact
      const response = await this.httpClient.put(contactUrl, vcardData, {
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
    const authConfig = this.httpClient.getAuthConfig();

    if (!authConfig) {
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
    const contactUrl = this.urlBuilder.generateContactUrl(addressBook, contact);

    // Generate updated vCard data
    const vcardData = this.dataFormatters.generateVCardData(contact);

    try {
      // PUT request with If-Match header for conflict detection
      const response = await this.httpClient.put(contactUrl, vcardData, {
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
    const authConfig = this.httpClient.getAuthConfig();

    if (!authConfig) {
      throw new Error(
        "Authentication not configured. Please set auth config before deleting contacts."
      );
    }

    // Generate contact URL
    const contactUrl = this.urlBuilder.generateContactUrl(addressBook, contact);

    try {
      // DELETE request with optional If-Match header for conflict detection
      const headers: Record<string, string> = {};
      if (contact.etag) {
        headers["If-Match"] = `"${contact.etag}"`;
      }

      const response = await this.httpClient.delete(contactUrl, headers);

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
   * Create a new address book using MKCOL request
   * Implements CardDAV address book creation protocol
   */
  public async createAddressBook(
    displayName: string,
    description?: string
  ): Promise<AddressBook> {
    const authConfig = this.httpClient.getAuthConfig();
    const provider = this.httpClient.getProvider();

    if (!authConfig) {
      throw new Error(
        "Authentication not configured. Please set auth config before creating address books."
      );
    }

    if (!provider) {
      throw new Error(
        "Provider not set. Please set a provider before creating address books."
      );
    }

    const addressBookUrl = this.urlBuilder.buildAddressBookUrl(authConfig, provider, displayName);

    // Convert to relative URL for proxy in development
    const requestUrl = this.urlBuilder.convertToProxyUrl(addressBookUrl);

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
      const response = await this.httpClient.makeRequest(requestUrl, {
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
      const serverBaseUrl = new URL(authConfig.carddavUrl).origin;
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
    const authConfig = this.httpClient.getAuthConfig();

    if (!authConfig) {
      throw new Error(
        "Authentication not configured. Please set auth config before updating address book properties."
      );
    }

    // Convert to relative URL for proxy in development
    const requestUrl = this.urlBuilder.convertToProxyUrl(addressBook.url);

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
      const response = await this.httpClient.makeRequest(requestUrl, {
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
    const authConfig = this.httpClient.getAuthConfig();

    if (!authConfig) {
      throw new Error(
        "Authentication not configured. Please set auth config before deleting address books."
      );
    }

    // Convert to relative URL for proxy in development
    const requestUrl = this.urlBuilder.convertToProxyUrl(addressBook.url);

    try {
      // DELETE request to remove the address book
      const response = await this.httpClient.delete(requestUrl);

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
}