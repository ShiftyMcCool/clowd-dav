import { EncryptedCredentials } from './auth';
import { Calendar, AddressBook, CalendarEvent, Contact } from './dav';

export interface StoredData {
  credentials: EncryptedCredentials;
  calendars: Calendar[];
  addressBooks: AddressBook[];
  cachedEvents: { [calendarUrl: string]: CalendarEvent[] };
  cachedContacts: { [addressBookUrl: string]: Contact[] };
  lastSync: { [resourceUrl: string]: Date };
}