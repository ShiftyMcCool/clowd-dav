import { useState, useEffect, useCallback } from 'react';
import { SyncService, SyncStatus, SyncResult, SyncOptions } from '../services/SyncService';
import { Calendar, AddressBook, CalendarEvent, Contact, DateRange } from '../types/dav';

export interface UseSyncReturn {
  syncStatus: SyncStatus;
  isLoading: boolean;
  error: string | null;
  fullSync: (options?: SyncOptions) => Promise<SyncResult>;
  syncCalendars: () => Promise<void>;
  syncAddressBooks: () => Promise<void>;
  syncEvents: (dateRange?: DateRange, forceRefresh?: boolean) => Promise<void>;
  syncContacts: (forceRefresh?: boolean) => Promise<void>;
  createEvent: (calendar: Calendar, event: CalendarEvent) => Promise<void>;
  updateEvent: (calendar: Calendar, event: CalendarEvent) => Promise<void>;
  createContact: (addressBook: AddressBook, contact: Contact) => Promise<void>;
  updateContact: (addressBook: AddressBook, contact: Contact) => Promise<void>;
  getEvents: (calendar: Calendar, dateRange: DateRange) => Promise<CalendarEvent[]>;
  getContacts: (addressBook: AddressBook) => Promise<Contact[]>;
  clearError: () => void;
}

/**
 * React hook for managing synchronization state and operations
 */
export const useSync = (syncService: SyncService): UseSyncReturn => {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>(syncService.getSyncStatus());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleSyncStatusChange = (status: SyncStatus) => {
      setSyncStatus(status);
      setIsLoading(status.syncInProgress);
    };

    syncService.addSyncListener(handleSyncStatusChange);

    return () => {
      syncService.removeSyncListener(handleSyncStatusChange);
    };
  }, [syncService]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const handleAsyncOperation = useCallback(async <T>(
    operation: () => Promise<T>,
    loadingState = true
  ): Promise<T> => {
    try {
      if (loadingState) setIsLoading(true);
      setError(null);
      return await operation();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(errorMessage);
      throw err;
    } finally {
      if (loadingState) setIsLoading(false);
    }
  }, []);

  const fullSync = useCallback(async (options?: SyncOptions): Promise<SyncResult> => {
    return handleAsyncOperation(() => syncService.fullSync(options), false);
  }, [syncService, handleAsyncOperation]);

  const syncCalendars = useCallback(async (): Promise<void> => {
    await handleAsyncOperation(() => syncService.syncCalendars());
  }, [syncService, handleAsyncOperation]);

  const syncAddressBooks = useCallback(async (): Promise<void> => {
    await handleAsyncOperation(() => syncService.syncAddressBooks());
  }, [syncService, handleAsyncOperation]);

  const syncEvents = useCallback(async (dateRange?: DateRange, forceRefresh = false): Promise<void> => {
    await handleAsyncOperation(async () => {
      const result = await syncService.syncEvents(dateRange, forceRefresh);
      if (result.errors.length > 0) {
        throw new Error(`Sync completed with errors: ${result.errors.join(', ')}`);
      }
    });
  }, [syncService, handleAsyncOperation]);

  const syncContacts = useCallback(async (forceRefresh = false): Promise<void> => {
    await handleAsyncOperation(async () => {
      const result = await syncService.syncContacts(forceRefresh);
      if (result.errors.length > 0) {
        throw new Error(`Sync completed with errors: ${result.errors.join(', ')}`);
      }
    });
  }, [syncService, handleAsyncOperation]);

  const createEvent = useCallback(async (calendar: Calendar, event: CalendarEvent): Promise<void> => {
    await handleAsyncOperation(() => syncService.createEvent(calendar, event));
  }, [syncService, handleAsyncOperation]);

  const updateEvent = useCallback(async (calendar: Calendar, event: CalendarEvent): Promise<void> => {
    await handleAsyncOperation(() => syncService.updateEvent(calendar, event));
  }, [syncService, handleAsyncOperation]);

  const createContact = useCallback(async (addressBook: AddressBook, contact: Contact): Promise<void> => {
    await handleAsyncOperation(() => syncService.createContact(addressBook, contact));
  }, [syncService, handleAsyncOperation]);

  const updateContact = useCallback(async (addressBook: AddressBook, contact: Contact): Promise<void> => {
    await handleAsyncOperation(() => syncService.updateContact(addressBook, contact));
  }, [syncService, handleAsyncOperation]);

  const getEvents = useCallback(async (calendar: Calendar, dateRange: DateRange): Promise<CalendarEvent[]> => {
    return handleAsyncOperation(() => syncService.getEvents(calendar, dateRange));
  }, [syncService, handleAsyncOperation]);

  const getContacts = useCallback(async (addressBook: AddressBook): Promise<Contact[]> => {
    return handleAsyncOperation(() => syncService.getContacts(addressBook));
  }, [syncService, handleAsyncOperation]);

  return {
    syncStatus,
    isLoading,
    error,
    fullSync,
    syncCalendars,
    syncAddressBooks,
    syncEvents,
    syncContacts,
    createEvent,
    updateEvent,
    createContact,
    updateContact,
    getEvents,
    getContacts,
    clearError
  };
};