import { DAVClient as IDAVClient, DAVProvider } from "../types/providers";
import { AuthConfig } from "../types/auth";
import {
  Calendar,
  AddressBook,
  CalendarEvent,
  Contact,
  DateRange,
} from "../types/dav";
import { HttpClient } from "./dav/HttpClient";
import { CalendarService } from "./dav/CalendarService";
import { ContactService } from "./dav/ContactService";

export class DAVClient implements IDAVClient {
  private httpClient: HttpClient;
  private calendarService: CalendarService;
  private contactService: ContactService;

  constructor() {
    this.httpClient = new HttpClient();
    this.calendarService = new CalendarService(this.httpClient);
    this.contactService = new ContactService(this.httpClient);
  }

  public setAuthConfig(authConfig: AuthConfig): void {
    this.httpClient.setAuthConfig(authConfig);
  }

  public setProvider(provider: DAVProvider): void {
    this.httpClient.setProvider(provider);
  }

  public getProvider(): DAVProvider | null {
    return this.httpClient.getProvider();
  }

  public getAuthConfig(): AuthConfig | null {
    return this.httpClient.getAuthConfig();
  }

  // Basic HTTP methods - delegate to HttpClient
  public async get(url: string, headers?: Record<string, string>) {
    return this.httpClient.get(url, headers);
  }

  public async put(url: string, data: string, headers?: Record<string, string>) {
    return this.httpClient.put(url, data, headers);
  }

  public async post(url: string, data: string, headers?: Record<string, string>) {
    return this.httpClient.post(url, data, headers);
  }

  public async delete(url: string, headers?: Record<string, string>) {
    return this.httpClient.delete(url, headers);
  }

  public async propfind(url: string, data: string, depth?: string, headers?: Record<string, string>) {
    return this.httpClient.propfind(url, data, depth, headers);
  }

  public async report(url: string, data: string, headers?: Record<string, string>) {
    return this.httpClient.report(url, data, headers);
  }

  // Calendar operations - delegate to CalendarService
  public async discoverCalendars(): Promise<Calendar[]> {
    return this.calendarService.discoverCalendars();
  }

  public async getEvents(calendar: Calendar, dateRange: DateRange): Promise<CalendarEvent[]> {
    return this.calendarService.getEvents(calendar, dateRange);
  }

  public async createEvent(calendar: Calendar, event: CalendarEvent): Promise<void> {
    return this.calendarService.createEvent(calendar, event);
  }

  public async updateEvent(calendar: Calendar, event: CalendarEvent): Promise<void> {
    return this.calendarService.updateEvent(calendar, event);
  }

  public async deleteEvent(calendar: Calendar, event: CalendarEvent): Promise<void> {
    return this.calendarService.deleteEvent(calendar, event);
  }

  public async createCalendar(displayName: string, color?: string, description?: string): Promise<Calendar> {
    return this.calendarService.createCalendar(displayName, color, description);
  }

  public async deleteCalendar(calendar: Calendar): Promise<void> {
    return this.calendarService.deleteCalendar(calendar);
  }

  public async updateCalendarProperties(
    calendar: Calendar,
    properties: { displayName?: string; color?: string; description?: string }
  ): Promise<void> {
    return this.calendarService.updateCalendarProperties(calendar, properties);
  }

  // Contact operations - delegate to ContactService
  public async discoverAddressBooks(): Promise<AddressBook[]> {
    return this.contactService.discoverAddressBooks();
  }

  public async getContacts(addressBook: AddressBook): Promise<Contact[]> {
    return this.contactService.getContacts(addressBook);
  }

  public async createContact(addressBook: AddressBook, contact: Contact): Promise<void> {
    return this.contactService.createContact(addressBook, contact);
  }

  public async updateContact(addressBook: AddressBook, contact: Contact): Promise<void> {
    return this.contactService.updateContact(addressBook, contact);
  }

  public async deleteContact(addressBook: AddressBook, contact: Contact): Promise<void> {
    return this.contactService.deleteContact(addressBook, contact);
  }

  public async createAddressBook(displayName: string, description?: string): Promise<AddressBook> {
    return this.contactService.createAddressBook(displayName, description);
  }

  public async updateAddressBookProperties(
    addressBook: AddressBook,
    properties: { displayName?: string }
  ): Promise<void> {
    return this.contactService.updateAddressBookProperties(addressBook, properties);
  }

  public async deleteAddressBook(addressBook: AddressBook): Promise<void> {
    return this.contactService.deleteAddressBook(addressBook);
  }
}