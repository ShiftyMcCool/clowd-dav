import { DAVRequest, Calendar, AddressBook, CalendarEvent, Contact, DateRange } from './dav';

export type { DAVRequest };

export interface DAVProvider {
  name: string;
  detectServer(baseUrl: string): Promise<boolean>;
  getCalendarDiscoveryPath(): string;
  getAddressBookDiscoveryPath(): string;
  customizeRequest?(request: DAVRequest): DAVRequest;
}

export interface DAVClient {
  setProvider(provider: DAVProvider): void;
  discoverCalendars(): Promise<Calendar[]>;
  discoverAddressBooks(): Promise<AddressBook[]>;
  getEvents(calendar: Calendar, dateRange: DateRange): Promise<CalendarEvent[]>;
  getContacts(addressBook: AddressBook): Promise<Contact[]>;
  createEvent(calendar: Calendar, event: CalendarEvent): Promise<void>;
  updateEvent(calendar: Calendar, event: CalendarEvent): Promise<void>;
  deleteEvent(calendar: Calendar, event: CalendarEvent): Promise<void>;
  createCalendar(displayName: string, color?: string, description?: string): Promise<Calendar>;
  deleteCalendar(calendar: Calendar): Promise<void>;
  createContact(addressBook: AddressBook, contact: Contact): Promise<void>;
  updateContact(addressBook: AddressBook, contact: Contact): Promise<void>;
}

// Initial provider implementations
export interface BaikalProvider extends DAVProvider {
  name: 'baikal';
}

export interface RadicaleProvider extends DAVProvider {
  name: 'radicale';
}