import { DAVClient } from './DAVClient';
import { CacheService, PendingOperation } from './CacheService';
import type { SyncStatus } from './CacheService';
import { Calendar, AddressBook, CalendarEvent, Contact, DateRange } from '../types/dav';

export type { SyncStatus } from './CacheService';

export interface SyncOptions {
  forceRefresh?: boolean;
  syncEvents?: boolean;
  syncContacts?: boolean;
  dateRange?: DateRange;
}

export interface SyncResult {
  success: boolean;
  eventsUpdated: number;
  contactsUpdated: number;
  errors: string[];
}

/**
 * Service for handling data synchronization between DAV servers and local cache
 */
export class SyncService {
  private davClient: DAVClient;
  private syncInProgress = false;
  private syncListeners: ((status: SyncStatus) => void)[] = [];

  constructor(davClient: DAVClient) {
    this.davClient = davClient;
    this.setupNetworkListeners();
  }

  /**
   * Performs a full synchronization of calendars, events, and contacts
   */
  async fullSync(options: SyncOptions = {}): Promise<SyncResult> {
    if (this.syncInProgress) {
      throw new Error('Sync already in progress');
    }

    this.syncInProgress = true;
    this.updateSyncStatus({ syncInProgress: true });

    const result: SyncResult = {
      success: true,
      eventsUpdated: 0,
      contactsUpdated: 0,
      errors: []
    };

    try {
      // Sync calendars and address books first
      await this.syncCalendars();
      await this.syncAddressBooks();

      // Sync events if requested
      if (options.syncEvents !== false) {
        const eventResult = await this.syncEvents(options.dateRange, options.forceRefresh);
        result.eventsUpdated = eventResult.updated;
        result.errors.push(...eventResult.errors);
      }

      // Sync contacts if requested
      if (options.syncContacts !== false) {
        const contactResult = await this.syncContacts(options.forceRefresh);
        result.contactsUpdated = contactResult.updated;
        result.errors.push(...contactResult.errors);
      }

      // Process pending operations
      await this.processPendingOperations();

      // Update sync status
      this.updateSyncStatus({
        lastSync: new Date(),
        syncInProgress: false
      });

    } catch (error) {
      result.success = false;
      result.errors.push(error instanceof Error ? error.message : 'Unknown sync error');
      
      this.updateSyncStatus({ syncInProgress: false });
    } finally {
      this.syncInProgress = false;
    }

    return result;
  }

  /**
   * Syncs calendar collections
   */
  async syncCalendars(): Promise<void> {
    try {
      const calendars = await this.davClient.discoverCalendars();
      CacheService.storeCachedCalendars(calendars);
    } catch (error) {
      console.error('Failed to sync calendars:', error);
      throw error;
    }
  }

  /**
   * Syncs address book collections
   */
  async syncAddressBooks(): Promise<void> {
    try {
      const addressBooks = await this.davClient.discoverAddressBooks();
      CacheService.storeCachedAddressBooks(addressBooks);
    } catch (error) {
      console.error('Failed to sync address books:', error);
      throw error;
    }
  }

  /**
   * Syncs events for all calendars
   */
  async syncEvents(dateRange?: DateRange, forceRefresh = false): Promise<{ updated: number; errors: string[] }> {
    const calendars = CacheService.getCachedCalendars();
    const errors: string[] = [];
    let updated = 0;

    // Default date range: current month
    const defaultDateRange: DateRange = dateRange || {
      start: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
      end: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0)
    };

    for (const calendar of calendars) {
      try {
        const shouldSync = forceRefresh || this.shouldSyncResource(calendar.url);
        
        if (shouldSync) {
          const events = await this.davClient.getEvents(calendar, defaultDateRange);
          // Add calendar URL to each event
          const eventsWithCalendar = events.map(event => ({
            ...event,
            calendarUrl: calendar.url
          }));
          CacheService.storeCachedEvents(calendar.url, eventsWithCalendar);
          CacheService.updateLastSync(calendar.url);
          updated += events.length;
        }
      } catch (error) {
        const errorMsg = `Failed to sync events for calendar ${calendar.displayName}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        errors.push(errorMsg);
        console.error(errorMsg);
      }
    }

    return { updated, errors };
  }

  /**
   * Syncs contacts for all address books
   */
  async syncContacts(forceRefresh = false): Promise<{ updated: number; errors: string[] }> {
    const addressBooks = CacheService.getCachedAddressBooks();
    const errors: string[] = [];
    let updated = 0;

    for (const addressBook of addressBooks) {
      try {
        const shouldSync = forceRefresh || this.shouldSyncResource(addressBook.url);
        
        if (shouldSync) {
          const contacts = await this.davClient.getContacts(addressBook);
          CacheService.storeCachedContacts(addressBook.url, contacts);
          CacheService.updateLastSync(addressBook.url);
          updated += contacts.length;
        }
      } catch (error) {
        const errorMsg = `Failed to sync contacts for address book ${addressBook.displayName}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        errors.push(errorMsg);
        console.error(errorMsg);
      }
    }

    return { updated, errors };
  }

  /**
   * Processes pending operations when back online
   */
  async processPendingOperations(): Promise<void> {
    const pendingOperations = CacheService.getPendingOperations();
    
    for (const operation of pendingOperations) {
      try {
        await this.executePendingOperation(operation);
        CacheService.removePendingOperation(operation.id);
      } catch (error) {
        console.error(`Failed to execute pending operation ${operation.id}:`, error);
        // Keep the operation in the queue for retry
      }
    }
  }

  /**
   * Creates an event with offline support
   */
  async createEvent(calendar: Calendar, event: CalendarEvent): Promise<void> {
    // Ensure the event has the correct calendar URL
    const eventWithCalendar = { ...event, calendarUrl: calendar.url };
    
    if (navigator.onLine) {
      try {
        await this.davClient.createEvent(calendar, eventWithCalendar);
        
        // Update cache immediately
        const cachedEvents = CacheService.getCachedEvents(calendar.url);
        if (cachedEvents) {
          cachedEvents.events.push(eventWithCalendar);
          CacheService.storeCachedEvents(calendar.url, cachedEvents.events, cachedEvents.etag);
        }
      } catch (error) {
        // If online but failed, add to pending operations
        CacheService.addPendingOperation({
          type: 'create',
          resourceType: 'event',
          resourceUrl: calendar.url,
          data: eventWithCalendar
        });
        throw error;
      }
    } else {
      // Offline: add to pending operations and update cache optimistically
      CacheService.addPendingOperation({
        type: 'create',
        resourceType: 'event',
        resourceUrl: calendar.url,
        data: eventWithCalendar
      });

      const cachedEvents = CacheService.getCachedEvents(calendar.url);
      if (cachedEvents) {
        cachedEvents.events.push(eventWithCalendar);
        CacheService.storeCachedEvents(calendar.url, cachedEvents.events, cachedEvents.etag);
      }
    }
  }

  /**
   * Updates an event with offline support
   */
  async updateEvent(calendar: Calendar, event: CalendarEvent): Promise<void> {
    // Ensure the event has the correct calendar URL
    const eventWithCalendar = { ...event, calendarUrl: calendar.url };
    
    if (navigator.onLine) {
      try {
        await this.davClient.updateEvent(calendar, eventWithCalendar);
        
        // Update cache immediately
        const cachedEvents = CacheService.getCachedEvents(calendar.url);
        if (cachedEvents) {
          const index = cachedEvents.events.findIndex(e => e.uid === event.uid);
          if (index !== -1) {
            cachedEvents.events[index] = eventWithCalendar;
            CacheService.storeCachedEvents(calendar.url, cachedEvents.events, cachedEvents.etag);
          }
        }
      } catch (error) {
        // If online but failed, add to pending operations
        CacheService.addPendingOperation({
          type: 'update',
          resourceType: 'event',
          resourceUrl: calendar.url,
          data: eventWithCalendar
        });
        throw error;
      }
    } else {
      // Offline: add to pending operations and update cache optimistically
      CacheService.addPendingOperation({
        type: 'update',
        resourceType: 'event',
        resourceUrl: calendar.url,
        data: eventWithCalendar
      });

      const cachedEvents = CacheService.getCachedEvents(calendar.url);
      if (cachedEvents) {
        const index = cachedEvents.events.findIndex(e => e.uid === event.uid);
        if (index !== -1) {
          cachedEvents.events[index] = eventWithCalendar;
          CacheService.storeCachedEvents(calendar.url, cachedEvents.events, cachedEvents.etag);
        }
      }
    }
  }

  /**
   * Deletes an event with offline support
   */
  async deleteEvent(calendar: Calendar, event: CalendarEvent): Promise<void> {
    if (navigator.onLine) {
      try {
        await this.davClient.deleteEvent(calendar, event);
        
        // Remove from cache immediately
        const cachedEvents = CacheService.getCachedEvents(calendar.url);
        if (cachedEvents) {
          const filteredEvents = cachedEvents.events.filter(e => e.uid !== event.uid);
          CacheService.storeCachedEvents(calendar.url, filteredEvents, cachedEvents.etag);
        }
      } catch (error) {
        // If online but failed, add to pending operations
        CacheService.addPendingOperation({
          type: 'delete',
          resourceType: 'event',
          resourceUrl: calendar.url,
          data: event
        });
        throw error;
      }
    } else {
      // Offline: add to pending operations and update cache optimistically
      CacheService.addPendingOperation({
        type: 'delete',
        resourceType: 'event',
        resourceUrl: calendar.url,
        data: event
      });

      const cachedEvents = CacheService.getCachedEvents(calendar.url);
      if (cachedEvents) {
        const filteredEvents = cachedEvents.events.filter(e => e.uid !== event.uid);
        CacheService.storeCachedEvents(calendar.url, filteredEvents, cachedEvents.etag);
      }
    }
  }

  /**
   * Creates a contact with offline support
   */
  async createContact(addressBook: AddressBook, contact: Contact): Promise<void> {
    if (navigator.onLine) {
      try {
        await this.davClient.createContact(addressBook, contact);
        
        // Update cache immediately
        const cachedContacts = CacheService.getCachedContacts(addressBook.url);
        if (cachedContacts) {
          cachedContacts.contacts.push(contact);
          CacheService.storeCachedContacts(addressBook.url, cachedContacts.contacts, cachedContacts.etag);
        }
      } catch (error) {
        // If online but failed, add to pending operations
        CacheService.addPendingOperation({
          type: 'create',
          resourceType: 'contact',
          resourceUrl: addressBook.url,
          data: contact
        });
        throw error;
      }
    } else {
      // Offline: add to pending operations and update cache optimistically
      CacheService.addPendingOperation({
        type: 'create',
        resourceType: 'contact',
        resourceUrl: addressBook.url,
        data: contact
      });

      const cachedContacts = CacheService.getCachedContacts(addressBook.url);
      if (cachedContacts) {
        cachedContacts.contacts.push(contact);
        CacheService.storeCachedContacts(addressBook.url, cachedContacts.contacts, cachedContacts.etag);
      }
    }
  }

  /**
   * Updates a contact with offline support
   */
  async updateContact(addressBook: AddressBook, contact: Contact): Promise<void> {
    if (navigator.onLine) {
      try {
        await this.davClient.updateContact(addressBook, contact);
        
        // Update cache immediately
        const cachedContacts = CacheService.getCachedContacts(addressBook.url);
        if (cachedContacts) {
          const index = cachedContacts.contacts.findIndex(c => c.uid === contact.uid);
          if (index !== -1) {
            cachedContacts.contacts[index] = contact;
            CacheService.storeCachedContacts(addressBook.url, cachedContacts.contacts, cachedContacts.etag);
          }
        }
      } catch (error) {
        // If online but failed, add to pending operations
        CacheService.addPendingOperation({
          type: 'update',
          resourceType: 'contact',
          resourceUrl: addressBook.url,
          data: contact
        });
        throw error;
      }
    } else {
      // Offline: add to pending operations and update cache optimistically
      CacheService.addPendingOperation({
        type: 'update',
        resourceType: 'contact',
        resourceUrl: addressBook.url,
        data: contact
      });

      const cachedContacts = CacheService.getCachedContacts(addressBook.url);
      if (cachedContacts) {
        const index = cachedContacts.contacts.findIndex(c => c.uid === contact.uid);
        if (index !== -1) {
          cachedContacts.contacts[index] = contact;
          CacheService.storeCachedContacts(addressBook.url, cachedContacts.contacts, cachedContacts.etag);
        }
      }
    }
  }

  /**
   * Deletes a contact with offline support
   */
  async deleteContact(addressBook: AddressBook, contact: Contact): Promise<void> {
    if (navigator.onLine) {
      try {
        await this.davClient.deleteContact(addressBook, contact);
        
        // Remove from cache immediately
        const cachedContacts = CacheService.getCachedContacts(addressBook.url);
        if (cachedContacts) {
          const filteredContacts = cachedContacts.contacts.filter(c => c.uid !== contact.uid);
          CacheService.storeCachedContacts(addressBook.url, filteredContacts, cachedContacts.etag);
        }
      } catch (error) {
        // If online but failed, add to pending operations
        CacheService.addPendingOperation({
          type: 'delete',
          resourceType: 'contact',
          resourceUrl: addressBook.url,
          data: contact
        });
        throw error;
      }
    } else {
      // Offline: add to pending operations and remove from cache optimistically
      CacheService.addPendingOperation({
        type: 'delete',
        resourceType: 'contact',
        resourceUrl: addressBook.url,
        data: contact
      });

      const cachedContacts = CacheService.getCachedContacts(addressBook.url);
      if (cachedContacts) {
        const filteredContacts = cachedContacts.contacts.filter(c => c.uid !== contact.uid);
        CacheService.storeCachedContacts(addressBook.url, filteredContacts, cachedContacts.etag);
      }
    }
  }

  /**
   * Gets events with cache fallback
   */
  async getEvents(calendar: Calendar, dateRange: DateRange): Promise<CalendarEvent[]> {
    // Try to get from server first if online
    if (navigator.onLine) {
      try {
        const events = await this.davClient.getEvents(calendar, dateRange);
        // Add calendar URL to each event
        const eventsWithCalendar = events.map(event => ({
          ...event,
          calendarUrl: calendar.url
        }));
        CacheService.storeCachedEvents(calendar.url, eventsWithCalendar);
        CacheService.updateLastSync(calendar.url);
        return eventsWithCalendar;
      } catch (error) {
        console.warn('Failed to fetch events from server, falling back to cache:', error);
      }
    }

    // Fallback to cache
    const cachedEvents = CacheService.getCachedEvents(calendar.url);
    const events = cachedEvents?.events || [];
    // Ensure calendar URL is set for cached events
    return events.map(event => ({
      ...event,
      calendarUrl: event.calendarUrl || calendar.url
    }));
  }

  /**
   * Gets contacts with cache fallback
   */
  async getContacts(addressBook: AddressBook): Promise<Contact[]> {
    // Try to get from server first if online
    if (navigator.onLine) {
      try {
        const contacts = await this.davClient.getContacts(addressBook);
        CacheService.storeCachedContacts(addressBook.url, contacts);
        CacheService.updateLastSync(addressBook.url);
        return contacts;
      } catch (error) {
        console.warn('Failed to fetch contacts from server, falling back to cache:', error);
      }
    }

    // Fallback to cache
    const cachedContacts = CacheService.getCachedContacts(addressBook.url);
    return cachedContacts?.contacts || [];
  }

  /**
   * Adds a sync status listener
   */
  addSyncListener(listener: (status: SyncStatus) => void): void {
    this.syncListeners.push(listener);
  }

  /**
   * Removes a sync status listener
   */
  removeSyncListener(listener: (status: SyncStatus) => void): void {
    const index = this.syncListeners.indexOf(listener);
    if (index !== -1) {
      this.syncListeners.splice(index, 1);
    }
  }

  /**
   * Gets current sync status
   */
  getSyncStatus(): SyncStatus {
    const status = CacheService.getSyncStatus();
    status.isOnline = navigator.onLine;
    status.pendingOperations = CacheService.getPendingOperations();
    status.syncInProgress = this.syncInProgress;
    return status;
  }

  // Private methods

  private shouldSyncResource(resourceUrl: string): boolean {
    const lastSync = CacheService.getLastSync(resourceUrl);
    if (!lastSync) return true;

    // Sync if last sync was more than 5 minutes ago
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    return lastSync < fiveMinutesAgo;
  }

  private async executePendingOperation(operation: PendingOperation): Promise<void> {
    const { type, resourceType, resourceUrl, data } = operation;

    if (resourceType === 'event') {
      const event = data as CalendarEvent;
      const calendar: Calendar = { url: resourceUrl, displayName: '' };

      switch (type) {
        case 'create':
          await this.davClient.createEvent(calendar, event);
          break;
        case 'update':
          await this.davClient.updateEvent(calendar, event);
          break;
        case 'delete':
          await this.davClient.deleteEvent(calendar, event);
          break;
      }
    } else if (resourceType === 'contact') {
      const contact = data as Contact;
      const addressBook: AddressBook = { url: resourceUrl, displayName: '' };

      switch (type) {
        case 'create':
          await this.davClient.createContact(addressBook, contact);
          break;
        case 'update':
          await this.davClient.updateContact(addressBook, contact);
          break;
        case 'delete':
          await this.davClient.deleteContact(addressBook, contact);
          break;
      }
    }
  }

  private updateSyncStatus(updates: Partial<SyncStatus>): void {
    const currentStatus = this.getSyncStatus();
    const newStatus = { ...currentStatus, ...updates };
    
    CacheService.storeSyncStatus(newStatus);
    
    // Notify listeners
    this.syncListeners.forEach(listener => {
      try {
        listener(newStatus);
      } catch (error) {
        console.error('Error in sync listener:', error);
      }
    });
  }

  private setupNetworkListeners(): void {
    const handleOnline = () => {
      this.updateSyncStatus({ isOnline: true });
      // Automatically sync when coming back online
      this.fullSync().catch(error => {
        console.error('Auto-sync failed when coming online:', error);
      });
    };

    const handleOffline = () => {
      this.updateSyncStatus({ isOnline: false });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
  }
}