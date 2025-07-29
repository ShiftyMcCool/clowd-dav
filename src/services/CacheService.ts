import { Calendar, AddressBook, CalendarEvent, Contact } from '../types/dav';

export interface CacheData {
  events: { [calendarUrl: string]: CachedEventData };
  contacts: { [addressBookUrl: string]: CachedContactData };
  calendars: Calendar[];
  addressBooks: AddressBook[];
  lastSync: { [resourceUrl: string]: Date };
}

export interface CachedEventData {
  events: CalendarEvent[];
  lastUpdated: Date;
  etag?: string;
}

export interface CachedContactData {
  contacts: Contact[];
  lastUpdated: Date;
  etag?: string;
}

export interface SyncStatus {
  isOnline: boolean;
  lastSync: Date | null;
  pendingOperations: PendingOperation[];
  syncInProgress: boolean;
}

export interface PendingOperation {
  id: string;
  type: 'create' | 'update' | 'delete';
  resourceType: 'event' | 'contact' | 'calendar';
  resourceUrl: string;
  data: CalendarEvent | Contact | Calendar;
  timestamp: Date;
}

/**
 * Service for managing local storage caching of DAV data
 */
export class CacheService {
  private static readonly CACHE_KEY = 'caldav_cache_data';
  private static readonly PENDING_OPERATIONS_KEY = 'caldav_pending_operations';
  private static readonly SYNC_STATUS_KEY = 'caldav_sync_status';
  private static readonly CACHE_VERSION_KEY = 'caldav_cache_version';
  private static readonly CURRENT_VERSION = '1.0';
  private static readonly MAX_CACHE_AGE = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

  /**
   * Ensures that date properties in an event are proper Date objects
   * This is needed because cached events may have dates serialized as strings
   */
  private static ensureEventDates(event: CalendarEvent): CalendarEvent {
    return {
      ...event,
      dtstart: typeof event.dtstart === 'string' ? new Date(event.dtstart) : event.dtstart,
      dtend: typeof event.dtend === 'string' ? new Date(event.dtend) : event.dtend,
      created: event.created ? (typeof event.created === 'string' ? new Date(event.created) : event.created) : undefined,
      lastModified: event.lastModified ? (typeof event.lastModified === 'string' ? new Date(event.lastModified) : event.lastModified) : undefined,
    };
  }

  /**
   * Stores cached data in local storage
   */
  static storeCacheData(data: CacheData): void {
    if (!this.isLocalStorageAvailable()) {
      console.warn('Local storage not available, caching disabled');
      return;
    }

    try {
      const serializedData = JSON.stringify(data, this.dateReplacer);
      localStorage.setItem(this.CACHE_KEY, serializedData);
      localStorage.setItem(this.CACHE_VERSION_KEY, this.CURRENT_VERSION);
    } catch (error) {
      console.error('Failed to store cache data:', error);
    }
  }

  /**
   * Retrieves cached data from local storage
   */
  static getCacheData(): CacheData | null {
    if (!this.isLocalStorageAvailable()) {
      return null;
    }

    try {
      const storedData = localStorage.getItem(this.CACHE_KEY);
      if (!storedData) {
        return this.getEmptyCacheData();
      }

      const parsed = JSON.parse(storedData, this.dateReviver) as CacheData;
      return this.validateAndMigrateCacheData(parsed);
    } catch (error) {
      console.error('Failed to retrieve cache data:', error);
      return this.getEmptyCacheData();
    }
  }

  /**
   * Stores cached events for a specific calendar
   */
  static storeCachedEvents(calendarUrl: string, events: CalendarEvent[], etag?: string): void {
    const cacheData = this.getCacheData() || this.getEmptyCacheData();
    
    cacheData.events[calendarUrl] = {
      events,
      lastUpdated: new Date(),
      etag
    };

    this.storeCacheData(cacheData);
  }

  /**
   * Retrieves cached events for a specific calendar
   */
  static getCachedEvents(calendarUrl: string): CachedEventData | null {
    const cacheData = this.getCacheData();
    if (!cacheData) return null;

    const cachedEvents = cacheData.events[calendarUrl];
    if (!cachedEvents) return null;

    // Check if cache is still valid
    if (this.isCacheExpired(cachedEvents.lastUpdated)) {
      return null;
    }

    // Ensure date properties are properly converted back to Date objects
    const eventsWithDates = cachedEvents.events.map(event => this.ensureEventDates(event));

    return {
      ...cachedEvents,
      events: eventsWithDates
    };
  }

  /**
   * Stores cached contacts for a specific address book
   */
  static storeCachedContacts(addressBookUrl: string, contacts: Contact[], etag?: string): void {
    const cacheData = this.getCacheData() || this.getEmptyCacheData();
    
    cacheData.contacts[addressBookUrl] = {
      contacts,
      lastUpdated: new Date(),
      etag
    };

    this.storeCacheData(cacheData);
  }

  /**
   * Retrieves cached contacts for a specific address book
   */
  static getCachedContacts(addressBookUrl: string): CachedContactData | null {
    const cacheData = this.getCacheData();
    if (!cacheData) return null;

    const cachedContacts = cacheData.contacts[addressBookUrl];
    if (!cachedContacts) return null;

    // Check if cache is still valid
    if (this.isCacheExpired(cachedContacts.lastUpdated)) {
      return null;
    }

    return cachedContacts;
  }

  /**
   * Stores cached calendars
   */
  static storeCachedCalendars(calendars: Calendar[]): void {
    const cacheData = this.getCacheData() || this.getEmptyCacheData();
    cacheData.calendars = calendars;
    this.storeCacheData(cacheData);
  }

  /**
   * Retrieves cached calendars
   */
  static getCachedCalendars(): Calendar[] {
    const cacheData = this.getCacheData();
    return cacheData?.calendars || [];
  }

  /**
   * Stores cached address books
   */
  static storeCachedAddressBooks(addressBooks: AddressBook[]): void {
    const cacheData = this.getCacheData() || this.getEmptyCacheData();
    cacheData.addressBooks = addressBooks;
    this.storeCacheData(cacheData);
  }

  /**
   * Retrieves cached address books
   */
  static getCachedAddressBooks(): AddressBook[] {
    const cacheData = this.getCacheData();
    return cacheData?.addressBooks || [];
  }

  /**
   * Updates last sync time for a resource
   */
  static updateLastSync(resourceUrl: string): void {
    const cacheData = this.getCacheData() || this.getEmptyCacheData();
    cacheData.lastSync[resourceUrl] = new Date();
    this.storeCacheData(cacheData);
  }

  /**
   * Gets last sync time for a resource
   */
  static getLastSync(resourceUrl: string): Date | null {
    const cacheData = this.getCacheData();
    if (!cacheData) return null;

    const lastSync = cacheData.lastSync[resourceUrl];
    return lastSync ? new Date(lastSync) : null;
  }

  /**
   * Adds a pending operation to the queue
   */
  static addPendingOperation(operation: Omit<PendingOperation, 'id' | 'timestamp'>): void {
    const operations = this.getPendingOperations();
    const newOperation: PendingOperation = {
      ...operation,
      id: this.generateOperationId(),
      timestamp: new Date()
    };

    operations.push(newOperation);
    this.storePendingOperations(operations);
  }

  /**
   * Retrieves all pending operations
   */
  static getPendingOperations(): PendingOperation[] {
    if (!this.isLocalStorageAvailable()) {
      return [];
    }

    try {
      const storedData = localStorage.getItem(this.PENDING_OPERATIONS_KEY);
      if (!storedData) return [];

      return JSON.parse(storedData, this.dateReviver) as PendingOperation[];
    } catch (error) {
      console.error('Failed to retrieve pending operations:', error);
      return [];
    }
  }

  /**
   * Removes a pending operation by ID
   */
  static removePendingOperation(operationId: string): void {
    const operations = this.getPendingOperations();
    const filteredOperations = operations.filter(op => op.id !== operationId);
    this.storePendingOperations(filteredOperations);
  }

  /**
   * Clears all pending operations
   */
  static clearPendingOperations(): void {
    if (!this.isLocalStorageAvailable()) return;
    localStorage.removeItem(this.PENDING_OPERATIONS_KEY);
  }

  /**
   * Stores sync status
   */
  static storeSyncStatus(status: SyncStatus): void {
    if (!this.isLocalStorageAvailable()) return;

    try {
      const serializedStatus = JSON.stringify(status, this.dateReplacer);
      localStorage.setItem(this.SYNC_STATUS_KEY, serializedStatus);
    } catch (error) {
      console.error('Failed to store sync status:', error);
    }
  }

  /**
   * Retrieves sync status
   */
  static getSyncStatus(): SyncStatus {
    if (!this.isLocalStorageAvailable()) {
      return this.getDefaultSyncStatus();
    }

    try {
      const storedData = localStorage.getItem(this.SYNC_STATUS_KEY);
      if (!storedData) return this.getDefaultSyncStatus();

      return JSON.parse(storedData, this.dateReviver) as SyncStatus;
    } catch (error) {
      console.error('Failed to retrieve sync status:', error);
      return this.getDefaultSyncStatus();
    }
  }

  /**
   * Clears all cached data
   */
  static clearCache(): void {
    if (!this.isLocalStorageAvailable()) return;

    localStorage.removeItem(this.CACHE_KEY);
    localStorage.removeItem(this.PENDING_OPERATIONS_KEY);
    localStorage.removeItem(this.SYNC_STATUS_KEY);
    localStorage.removeItem(this.CACHE_VERSION_KEY);
  }

  /**
   * Gets cache statistics
   */
  static getCacheStats(): { size: number; eventCount: number; contactCount: number; lastUpdated: Date | null } {
    const cacheData = this.getCacheData();
    if (!cacheData) {
      return { size: 0, eventCount: 0, contactCount: 0, lastUpdated: null };
    }

    let eventCount = 0;
    let contactCount = 0;
    let lastUpdated: Date | null = null;

    // Count events and find most recent update
    Object.values(cacheData.events).forEach(eventData => {
      eventCount += eventData.events.length;
      const eventLastUpdated = typeof eventData.lastUpdated === 'string' 
        ? new Date(eventData.lastUpdated) 
        : eventData.lastUpdated;
      if (!lastUpdated || eventLastUpdated > lastUpdated) {
        lastUpdated = eventLastUpdated;
      }
    });

    // Count contacts and find most recent update
    Object.values(cacheData.contacts).forEach(contactData => {
      contactCount += contactData.contacts.length;
      const contactLastUpdated = typeof contactData.lastUpdated === 'string' 
        ? new Date(contactData.lastUpdated) 
        : contactData.lastUpdated;
      if (!lastUpdated || contactLastUpdated > lastUpdated) {
        lastUpdated = contactLastUpdated;
      }
    });

    // Calculate approximate size
    const size = JSON.stringify(cacheData).length;

    return { size, eventCount, contactCount, lastUpdated };
  }

  // Private helper methods

  private static storePendingOperations(operations: PendingOperation[]): void {
    if (!this.isLocalStorageAvailable()) return;

    try {
      const serializedOperations = JSON.stringify(operations, this.dateReplacer);
      localStorage.setItem(this.PENDING_OPERATIONS_KEY, serializedOperations);
    } catch (error) {
      console.error('Failed to store pending operations:', error);
    }
  }

  private static getEmptyCacheData(): CacheData {
    return {
      events: {},
      contacts: {},
      calendars: [],
      addressBooks: [],
      lastSync: {}
    };
  }

  private static getDefaultSyncStatus(): SyncStatus {
    return {
      isOnline: navigator.onLine,
      lastSync: null,
      pendingOperations: [],
      syncInProgress: false
    };
  }

  private static isCacheExpired(lastUpdated: Date | string): boolean {
    const now = new Date();
    const lastUpdateDate = typeof lastUpdated === 'string' ? new Date(lastUpdated) : lastUpdated;
    return (now.getTime() - lastUpdateDate.getTime()) > this.MAX_CACHE_AGE;
  }

  private static generateOperationId(): string {
    return `op_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private static validateAndMigrateCacheData(data: any): CacheData {
    // Basic validation and migration logic
    if (!data || typeof data !== 'object') {
      return this.getEmptyCacheData();
    }

    return {
      events: data.events || {},
      contacts: data.contacts || {},
      calendars: data.calendars || [],
      addressBooks: data.addressBooks || [],
      lastSync: data.lastSync || {}
    };
  }

  private static isLocalStorageAvailable(): boolean {
    try {
      const testKey = '__localStorage_test__';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      return true;
    } catch {
      return false;
    }
  }

  private static dateReplacer(key: string, value: any): any {
    if (value instanceof Date) {
      return { __type: 'Date', value: value.toISOString() };
    }
    return value;
  }

  private static dateReviver(key: string, value: any): any {
    if (value && typeof value === 'object' && value.__type === 'Date') {
      return new Date(value.value);
    }
    return value;
  }
}