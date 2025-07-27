export interface CalendarEvent {
  uid: string;
  summary: string;
  description?: string;
  dtstart: Date;
  dtend: Date;
  location?: string;
  etag?: string;
  calendarUrl?: string; // Track which calendar this event belongs to
}

export interface Contact {
  uid: string;
  fn: string; // Full name (computed from firstName + lastName)
  firstName?: string; // Given name
  lastName?: string; // Family name
  email?: string[];
  tel?: string[];
  org?: string;
  photo?: string; // Base64 encoded image data or URL
  etag?: string;
  // Optional address book information (added when loading from multiple address books)
  addressBookUrl?: string;
  addressBookName?: string;
}

export interface Calendar {
  url: string;
  displayName: string;
  color?: string;
}

export interface AddressBook {
  url: string;
  displayName: string;
}

export interface DateRange {
  start: Date;
  end: Date;
}

export interface DAVRequest {
  method: string;
  url: string;
  headers?: Record<string, string>;
  data?: string;
}

export interface DAVResponse {
  status: number;
  data: string;
  headers: Record<string, string>;
}