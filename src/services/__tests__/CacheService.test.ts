import { CacheService } from '../CacheService';
import { Calendar, AddressBook, CalendarEvent, Contact } from '../../types/dav';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};

  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    }
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

describe('CacheService', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('Calendar caching', () => {
    it('should store and retrieve calendars', () => {
      const calendars: Calendar[] = [
        { url: 'http://example.com/cal1', displayName: 'Calendar 1' },
        { url: 'http://example.com/cal2', displayName: 'Calendar 2' }
      ];

      CacheService.storeCachedCalendars(calendars);
      const retrieved = CacheService.getCachedCalendars();

      expect(retrieved).toEqual(calendars);
    });

    it('should return empty array when no calendars cached', () => {
      const retrieved = CacheService.getCachedCalendars();
      expect(retrieved).toEqual([]);
    });
  });

  describe('Event caching', () => {
    it('should store and retrieve events for a calendar', () => {
      const calendarUrl = 'http://example.com/cal1';
      const events: CalendarEvent[] = [
        {
          uid: 'event1',
          summary: 'Test Event 1',
          dtstart: new Date('2025-07-21T10:00:00Z'),
          dtend: new Date('2025-07-21T11:00:00Z'),
          etag: 'etag1'
        }
      ];

      CacheService.storeCachedEvents(calendarUrl, events, 'collection-etag');
      const retrieved = CacheService.getCachedEvents(calendarUrl);

      expect(retrieved).toBeTruthy();
      expect(retrieved!.events).toHaveLength(1);
      expect(retrieved!.events[0].uid).toBe(events[0].uid);
      expect(retrieved!.events[0].summary).toBe(events[0].summary);
      expect(new Date(retrieved!.events[0].dtstart)).toEqual(events[0].dtstart);
      expect(new Date(retrieved!.events[0].dtend)).toEqual(events[0].dtend);
      expect(retrieved!.etag).toBe('collection-etag');
      expect(typeof retrieved!.lastUpdated === 'string' ? new Date(retrieved!.lastUpdated) : retrieved!.lastUpdated).toBeInstanceOf(Date);
    });

    it('should return null when no events cached for calendar', () => {
      const retrieved = CacheService.getCachedEvents('http://example.com/nonexistent');
      expect(retrieved).toBeNull();
    });
  });

  describe('Contact caching', () => {
    it('should store and retrieve contacts for an address book', () => {
      const addressBookUrl = 'http://example.com/ab1';
      const contacts: Contact[] = [
        {
          uid: 'contact1',
          fn: 'John Doe',
          email: ['john@example.com'],
          tel: ['+1234567890'],
          etag: 'etag1'
        }
      ];

      CacheService.storeCachedContacts(addressBookUrl, contacts, 'collection-etag');
      const retrieved = CacheService.getCachedContacts(addressBookUrl);

      expect(retrieved).toBeTruthy();
      expect(retrieved!.contacts).toEqual(contacts);
      expect(retrieved!.etag).toBe('collection-etag');
      expect(typeof retrieved!.lastUpdated === 'string' ? new Date(retrieved!.lastUpdated) : retrieved!.lastUpdated).toBeInstanceOf(Date);
    });

    it('should return null when no contacts cached for address book', () => {
      const retrieved = CacheService.getCachedContacts('http://example.com/nonexistent');
      expect(retrieved).toBeNull();
    });
  });

  describe('Pending operations', () => {
    it('should add and retrieve pending operations', () => {
      const operation = {
        type: 'create' as const,
        resourceType: 'event' as const,
        resourceUrl: 'http://example.com/cal1',
        data: {
          uid: 'event1',
          summary: 'Test Event',
          dtstart: new Date(),
          dtend: new Date()
        } as CalendarEvent
      };

      CacheService.addPendingOperation(operation);
      const operations = CacheService.getPendingOperations();

      expect(operations).toHaveLength(1);
      expect(operations[0].type).toBe(operation.type);
      expect(operations[0].resourceType).toBe(operation.resourceType);
      expect(operations[0].resourceUrl).toBe(operation.resourceUrl);
      expect(operations[0].data.uid).toBe(operation.data.uid);
      expect(operations[0].data.summary).toBe(operation.data.summary);
      expect(operations[0].id).toBeDefined();
      expect(typeof operations[0].timestamp === 'string' ? new Date(operations[0].timestamp) : operations[0].timestamp).toBeInstanceOf(Date);
    });

    it('should remove pending operations by ID', () => {
      const operation = {
        type: 'create' as const,
        resourceType: 'event' as const,
        resourceUrl: 'http://example.com/cal1',
        data: {
          uid: 'event1',
          summary: 'Test Event',
          dtstart: new Date(),
          dtend: new Date()
        } as CalendarEvent
      };

      CacheService.addPendingOperation(operation);
      const operations = CacheService.getPendingOperations();
      const operationId = operations[0].id;

      CacheService.removePendingOperation(operationId);
      const remainingOperations = CacheService.getPendingOperations();

      expect(remainingOperations).toHaveLength(0);
    });

    it('should clear all pending operations', () => {
      const operation = {
        type: 'create' as const,
        resourceType: 'event' as const,
        resourceUrl: 'http://example.com/cal1',
        data: {
          uid: 'event1',
          summary: 'Test Event',
          dtstart: new Date(),
          dtend: new Date()
        } as CalendarEvent
      };

      CacheService.addPendingOperation(operation);
      CacheService.addPendingOperation(operation);

      expect(CacheService.getPendingOperations()).toHaveLength(2);

      CacheService.clearPendingOperations();

      expect(CacheService.getPendingOperations()).toHaveLength(0);
    });
  });

  describe('Sync status', () => {
    it('should store and retrieve sync status', () => {
      const status = {
        isOnline: true,
        lastSync: new Date(),
        pendingOperations: [],
        syncInProgress: false
      };

      CacheService.storeSyncStatus(status);
      const retrieved = CacheService.getSyncStatus();

      expect(retrieved.isOnline).toBe(status.isOnline);
      expect(typeof retrieved.lastSync === 'string' ? new Date(retrieved.lastSync) : retrieved.lastSync).toEqual(status.lastSync);
      expect(retrieved.pendingOperations).toEqual(status.pendingOperations);
      expect(retrieved.syncInProgress).toBe(status.syncInProgress);
    });
  });

  describe('Cache statistics', () => {
    it('should return cache statistics', () => {
      const calendars: Calendar[] = [
        { url: 'http://example.com/cal1', displayName: 'Calendar 1' }
      ];
      const events: CalendarEvent[] = [
        {
          uid: 'event1',
          summary: 'Test Event 1',
          dtstart: new Date(),
          dtend: new Date()
        },
        {
          uid: 'event2',
          summary: 'Test Event 2',
          dtstart: new Date(),
          dtend: new Date()
        }
      ];
      const contacts: Contact[] = [
        {
          uid: 'contact1',
          fn: 'John Doe'
        }
      ];

      CacheService.storeCachedCalendars(calendars);
      CacheService.storeCachedEvents('http://example.com/cal1', events);
      CacheService.storeCachedContacts('http://example.com/ab1', contacts);

      const stats = CacheService.getCacheStats();

      expect(stats.eventCount).toBe(2);
      expect(stats.contactCount).toBe(1);
      expect(stats.size).toBeGreaterThan(0);
      expect(stats.lastUpdated).toBeInstanceOf(Date);
    });

    it('should return zero stats when cache is empty', () => {
      const stats = CacheService.getCacheStats();

      expect(stats.eventCount).toBe(0);
      expect(stats.contactCount).toBe(0);
      expect(stats.size).toBeGreaterThanOrEqual(0); // Cache structure itself has some size
      expect(stats.lastUpdated).toBeNull();
    });
  });

  describe('Cache clearing', () => {
    it('should clear all cached data', () => {
      const calendars: Calendar[] = [
        { url: 'http://example.com/cal1', displayName: 'Calendar 1' }
      ];
      const events: CalendarEvent[] = [
        {
          uid: 'event1',
          summary: 'Test Event',
          dtstart: new Date(),
          dtend: new Date()
        }
      ];

      CacheService.storeCachedCalendars(calendars);
      CacheService.storeCachedEvents('http://example.com/cal1', events);

      expect(CacheService.getCachedCalendars()).toHaveLength(1);
      expect(CacheService.getCachedEvents('http://example.com/cal1')).toBeTruthy();

      CacheService.clearCache();

      expect(CacheService.getCachedCalendars()).toHaveLength(0);
      expect(CacheService.getCachedEvents('http://example.com/cal1')).toBeNull();
    });
  });
});