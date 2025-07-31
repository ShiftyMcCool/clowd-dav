import { CacheService } from '../services/CacheService';
import { NetworkService } from '../services/NetworkService';
import { ErrorHandlingService } from '../services/ErrorHandlingService';
import { AddressBookColorService } from '../services/AddressBookColorService';
import { assignDefaultColorsIfMissing } from './calendarColors';
import { Calendar, AddressBook } from '../types/dav';
import { SyncService } from '../services/SyncService';

export const syncUtils = {
  /**
   * Performs a full manual sync and returns updated data
   */
  async performManualSync(syncService: SyncService): Promise<{
    calendars: Calendar[];
    addressBooks: AddressBook[];
  }> {
    const networkService = NetworkService.getInstance();
    
    if (!networkService.isOnline()) {
      throw new Error("Cannot sync while offline. Please check your internet connection.");
    }

    await syncService.fullSync({ forceRefresh: true });

    const cachedCalendars = CacheService.getCachedCalendars();
    const cachedAddressBooks = CacheService.getCachedAddressBooks();

    const calendarsWithColors = assignDefaultColorsIfMissing(cachedCalendars);
    const addressBooksWithColors = AddressBookColorService.applyColorsToAddressBooks(cachedAddressBooks);

    return {
      calendars: calendarsWithColors,
      addressBooks: addressBooksWithColors,
    };
  },

  /**
   * Loads calendars and address books from cache and optionally syncs with server
   */
  async loadDataWithSync(syncService: SyncService): Promise<{
    calendars: Calendar[];
    addressBooks: AddressBook[];
  }> {
    const networkService = NetworkService.getInstance();
    const isOnline = networkService.isOnline();

    // Always load from cache first
    const cachedCalendars = CacheService.getCachedCalendars();
    const cachedAddressBooks = CacheService.getCachedAddressBooks();

    console.log("Setting calendars from cache:", cachedCalendars.length);
    const calendarsWithColors = assignDefaultColorsIfMissing(cachedCalendars);

    console.log("Setting address books from cache:", cachedAddressBooks.length);
    const addressBooksWithColors = AddressBookColorService.applyColorsToAddressBooks(cachedAddressBooks);

    if (isOnline) {
      try {
        console.log("Online: attempting background sync...");
        await syncService.syncCalendars();
        await syncService.syncAddressBooks();

        // Get fresh data after sync
        const freshCalendars = CacheService.getCachedCalendars();
        const freshAddressBooks = CacheService.getCachedAddressBooks();

        if (freshCalendars.length !== cachedCalendars.length || 
            freshAddressBooks.length !== cachedAddressBooks.length) {
          const freshCalendarsWithColors = assignDefaultColorsIfMissing(freshCalendars);
          const freshAddressBooksWithColors = AddressBookColorService.applyColorsToAddressBooks(freshAddressBooks);
          
          console.log("Background sync completed successfully");
          return {
            calendars: freshCalendarsWithColors,
            addressBooks: freshAddressBooksWithColors,
          };
        }

        console.log("Background sync completed successfully");
      } catch (syncError) {
        console.warn("Background sync failed, continuing with cached data:", syncError);
      }
    } else {
      console.log("Offline: using cached data only");
    }

    return {
      calendars: calendarsWithColors,
      addressBooks: addressBooksWithColors,
    };
  },

  /**
   * Updates visible sets to include new items
   */
  updateVisibleSets<T extends { url: string }>(
    currentVisible: Set<string>,
    newItems: T[]
  ): Set<string> {
    const newVisible = new Set(currentVisible);
    newItems.forEach((item) => {
      if (!newVisible.has(item.url)) {
        newVisible.add(item.url); // New items are visible by default
      }
    });
    return newVisible;
  },
};