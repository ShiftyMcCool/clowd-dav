export interface CalendarEvent {
  uid: string;
  summary: string;
  description?: string;
  dtstart: Date;
  dtend: Date;
  location?: string;
  etag?: string;
}

export interface Contact {
  uid: string;
  fn: string; // Full name
  email?: string[];
  tel?: string[];
  org?: string;
  etag?: string;
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