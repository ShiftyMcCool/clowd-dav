import { useCallback } from 'react';
import { Calendar, CalendarEvent, DateRange, AddressBook } from '../types/dav';
import { SyncService } from '../services/SyncService';
import { CacheService } from '../services/CacheService';
import { NetworkService } from '../services/NetworkService';
import { ErrorHandlingService } from '../services/ErrorHandlingService';
import { syncUtils } from '../utils/syncUtils';
import { useSync } from './useSync';

interface UseDataLoaderProps {
  setCalendars: (calendars: Calendar[]) => void;
  setVisibleCalendars: (calendars: Set<string>) => void;
  setAddressBooks: (addressBooks: AddressBook[]) => void;
  setVisibleAddressBooks: (addressBooks: Set<string>) => void;
  setEvents: (events: CalendarEvent[]) => void;
  calendars: Calendar[];
  pendingDateRangeRef: React.MutableRefObject<DateRange | null>;
  syncService: SyncService;
}

export const useDataLoader = ({
  setCalendars,
  setVisibleCalendars,
  setAddressBooks,
  setVisibleAddressBooks,
  setEvents,
  calendars,
  pendingDateRangeRef,
  syncService,
}: UseDataLoaderProps) => {
  const sync = useSync(syncService);
  const errorService = ErrorHandlingService.getInstance();

  const loadCalendarsAndAddressBooks = useCallback(async () => {
    try {
      const { calendars, addressBooks } = await syncUtils.loadDataWithSync(syncService);
      
      setCalendars(calendars);
      setVisibleCalendars(new Set(calendars.map((cal) => cal.url)));
      
      setAddressBooks(addressBooks);
      setVisibleAddressBooks(new Set(addressBooks.map((ab) => ab.url)));
    } catch (error) {
      console.error("Error loading calendars and address books:", error);
      
      const cachedCalendars = CacheService.getCachedCalendars();
      const cachedAddressBooks = CacheService.getCachedAddressBooks();

      if (cachedCalendars.length === 0 && cachedAddressBooks.length === 0) {
        errorService.reportError(
          `Failed to load data: ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );
      }
    }
  }, [syncService, errorService, setCalendars, setVisibleCalendars, setAddressBooks, setVisibleAddressBooks]);

  const loadEvents = useCallback(
    async (dateRange: DateRange) => {
      if (calendars.length === 0) {
        console.log("No calendars available, storing date range for later");
        pendingDateRangeRef.current = dateRange;
        return;
      }

      try {
        const allEvents: CalendarEvent[] = [];
        const failedCalendars: string[] = [];
        const networkService = NetworkService.getInstance();
        const isOnline = networkService.isOnline();

        for (const calendar of calendars) {
          try {
            const calendarEvents = await sync.getEvents(calendar, dateRange);
            allEvents.push(...calendarEvents);
          } catch (error) {
            console.error(
              `Error loading events from calendar ${calendar.displayName}:`,
              error
            );
            failedCalendars.push(calendar.displayName);
          }
        }

        if (failedCalendars.length > 0 && isOnline) {
          errorService.reportError(
            `Failed to load events from ${failedCalendars.join(", ")}.`,
            "warning"
          );
        }

        setEvents(allEvents);
      } catch (error) {
        console.error("Error loading events:", error);
        errorService.reportError(
          `Failed to load events: ${errorService.formatErrorMessage(error)}`,
          "error"
        );
      }
    },
    [calendars, sync, errorService, setEvents, pendingDateRangeRef]
  );

  return {
    loadCalendarsAndAddressBooks,
    loadEvents,
  };
};