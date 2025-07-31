import React, { useState, useEffect, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { LoadingOverlay, OfflineIndicator } from "./components/common";
import { useLoading } from "./contexts/LoadingContext";
import { AuthConfig } from "./types/auth";
import { AuthManager } from "./services/AuthManager";
import { DAVClient } from "./services/DAVClient";
import { SyncService } from "./services/SyncService";
import { CacheService } from "./services/CacheService";
import { NetworkService } from "./services/NetworkService";
import { ProviderFactory } from "./providers/ProviderFactory";
import { DateRange } from "./types/dav";
import { ErrorHandlingService } from "./services/ErrorHandlingService";
import { AddressBookColorService } from "./services/AddressBookColorService";
import { syncUtils } from "./utils/syncUtils";

// Components
import { AppRoutes } from "./components/AppRoutes";
import { NavigationWrapper } from "./components/NavigationWrapper";
import { GlobalModals } from "./components/GlobalModals";
import { ErrorContainer } from "./components/ErrorContainer";
import { SetupComponent } from "./components/SetupComponent";
import { CalendarComponent } from "./components/CalendarComponent";
import { ContactsComponent } from "./components/ContactsComponent";

// Hooks
import { useAppState } from "./hooks/useAppState";
import { useCalendarHandlers } from "./hooks/useCalendarHandlers";
import { useAddressBookHandlers } from "./hooks/useAddressBookHandlers";
import { useDataLoader } from "./hooks/useDataLoader";

export const AppContent: React.FC = () => {
  const { showLoading, hideLoading, loadingState } = useLoading();
  const location = useLocation();
  
  // App state
  const {
    isAuthenticated,
    currentConfig,
    initialLoading,
    calendars,
    events,
    visibleCalendars,
    currentDateRange,
    calendarCurrentDate,
    calendarViewType,
    showEventForm,
    editingEvent,
    selectedCalendar,
    initialDate,
    showNewCalendarForm,
    editingCalendar,
    addressBooks,
    visibleAddressBooks,
    showNewAddressBookForm,
    editingAddressBook,
    currentView,
    errors,
    contactRefreshTrigger,
    lastDateRangeRef,
    pendingDateRangeRef,
    hasCheckedStoredCredentials,
    setIsAuthenticated,
    setCurrentConfig,
    setInitialLoading,
    setCalendars,
    setEvents,
    setVisibleCalendars,
    setCurrentDateRange,
    setCalendarCurrentDate,
    setCalendarViewType,
    setShowEventForm,
    setEditingEvent,
    setSelectedCalendar,
    setInitialDate,
    setShowNewCalendarForm,
    setEditingCalendar,
    setAddressBooks,
    setVisibleAddressBooks,
    setShowNewAddressBookForm,
    setEditingAddressBook,
    setCurrentView,
    setErrors,
    resetState,
  } = useAppState();

  // Services
  const [authManager] = useState(() => AuthManager.getInstance());
  const [errorService] = useState(() => ErrorHandlingService.getInstance());
  const [davClient] = useState(() => new DAVClient());
  const [syncService] = useState(() => new SyncService(davClient));

  // Data loader
  const { loadCalendarsAndAddressBooks, loadEvents } = useDataLoader({
    setCalendars,
    setVisibleCalendars,
    setAddressBooks,
    setVisibleAddressBooks,
    setEvents,
    calendars,
    pendingDateRangeRef,
    syncService,
  });

  // Calendar handlers
  const calendarHandlers = useCalendarHandlers({
    calendars,
    setCalendars,
    setVisibleCalendars,
    setEvents,
    setShowNewCalendarForm,
    setEditingCalendar,
    setShowEventForm,
    setEditingEvent,
    setSelectedCalendar,
    setInitialDate,
    currentDateRange,
    sync: syncService,
    loadEvents,
  });

  // Address book handlers
  const addressBookHandlers = useAddressBookHandlers({
    addressBooks,
    setAddressBooks,
    setVisibleAddressBooks,
    setShowNewAddressBookForm,
    setEditingAddressBook,
    sync: syncService,
  });

  // Initialize error handling service
  useEffect(() => {
    const unsubscribe = errorService.subscribe((updatedErrors) => {
      setErrors(updatedErrors.filter((error) => !error.dismissed));
    });

    return () => {
      unsubscribe();
    };
  }, [errorService, setErrors]);

  const handleSetupComplete = useCallback(
    async (config: AuthConfig, masterPassword?: string) => {
      showLoading("Setting up connection...", "large");

      try {
        setCurrentConfig(config);
        setIsAuthenticated(true);

        davClient.setAuthConfig(config);

        const networkService = NetworkService.getInstance();
        const isOnline = networkService.isOnline();

        if (isOnline) {
          const provider = await ProviderFactory.createProviderForServer(
            config.caldavUrl
          );
          if (provider) {
            davClient.setProvider(provider);
          } else {
            console.error("No compatible provider found for the server");
            errorService.reportError(
              "No compatible provider found for the server"
            );
          }
        } else {
          console.log("Offline: skipping provider setup, will use cached data");
        }

        await loadCalendarsAndAddressBooks();
      } catch (error) {
        console.error("Error setting up DAV client:", error);
        errorService.reportError(
          `Failed to setup connection: ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );
      } finally {
        hideLoading();
      }
    },
    [
      davClient,
      errorService,
      hideLoading,
      showLoading,
      loadCalendarsAndAddressBooks,
      setCurrentConfig,
      setIsAuthenticated,
    ]
  );

  // Check for stored credentials on startup
  useEffect(() => {
    const checkStoredCredentials = async () => {
      if (hasCheckedStoredCredentials.current) {
        return;
      }
      hasCheckedStoredCredentials.current = true;

      try {
        console.log("Checking for stored credentials and session...");

        const sessionToken = authManager.getStoredSessionToken();
        console.log("Session token found:", !!sessionToken);

        if (sessionToken) {
          try {
            console.log("Attempting to restore session with token...");

            if (authManager.hasStoredCredentials()) {
              const credentials = await authManager.getStoredCredentials(
                sessionToken
              );
              if (credentials) {
                console.log(
                  "Successfully restored session from stored credentials..."
                );
                await handleSetupComplete(credentials, sessionToken);
                setInitialLoading(false);
                return;
              }
            }

            const currentCredentials = authManager.getCurrentCredentials();
            if (currentCredentials) {
              console.log("Found credentials in memory, restoring session...");
              await handleSetupComplete(currentCredentials, sessionToken);
              setInitialLoading(false);
              return;
            }

            console.log(
              "No valid credentials found for session token, clearing session"
            );
            authManager.clearSession();
          } catch (error) {
            console.log("Error restoring session:", error);
            authManager.clearSession();
          }
        } else {
          console.log("No session token found");
        }

        console.log("No valid session found, user needs to login");
        setInitialLoading(false);
      } catch (error) {
        console.error("Error checking stored credentials:", error);
        errorService.reportError(
          "Failed to check stored credentials. Please try again."
        );
        setInitialLoading(false);
      }
    };

    checkStoredCredentials();
  }, [authManager, errorService, handleSetupComplete, setInitialLoading]);

  // Load events when calendars become available
  useEffect(() => {
    console.log(
      "useEffect triggered - calendars.length:",
      calendars.length,
      "pendingDateRange:",
      pendingDateRangeRef.current
    );
    if (calendars.length > 0 && pendingDateRangeRef.current) {
      const dateRangeToLoad = pendingDateRangeRef.current;
      pendingDateRangeRef.current = null;

      console.log(
        "Calendars now available, loading events for pending date range:",
        dateRangeToLoad
      );

      loadEvents(dateRangeToLoad);
    }
  }, [calendars.length, loadEvents]);

  const handleDateRangeChange = useCallback(
    (dateRange: DateRange) => {
      const lastDateRange = lastDateRangeRef.current;
      if (
        lastDateRange &&
        dateRange.start.getTime() === lastDateRange.start.getTime() &&
        dateRange.end.getTime() === lastDateRange.end.getTime()
      ) {
        console.log("Date range unchanged, skipping");
        return;
      }

      lastDateRangeRef.current = {
        start: new Date(dateRange.start),
        end: new Date(dateRange.end),
      };

      console.log("Date range changed:", dateRange);
      setCurrentDateRange(dateRange);
      loadEvents(dateRange);
    },
    [lastDateRangeRef, loadEvents, setCurrentDateRange]
  );

  const handleLogout = () => {
    resetState();
  };

  // Update current view based on location
  useEffect(() => {
    if (location.pathname.includes("/calendar")) {
      setCurrentView("calendar");
    } else if (location.pathname.includes("/contacts")) {
      setCurrentView("contacts");
    }
  }, [location.pathname, setCurrentView]);

  // Handle manual sync
  const handleManualSync = async () => {
    try {
      showLoading("Syncing data...");
      
      const { calendars: freshCalendars, addressBooks: freshAddressBooks } = 
        await syncUtils.performManualSync(syncService);

      setCalendars(freshCalendars);
      setVisibleCalendars((prev) => syncUtils.updateVisibleSets(prev, freshCalendars));

      setAddressBooks(freshAddressBooks);
      setVisibleAddressBooks((prev) => syncUtils.updateVisibleSets(prev, freshAddressBooks));

      if (currentDateRange) {
        await loadEvents(currentDateRange);
      }
    } catch (error) {
      console.error("Manual sync failed:", error);
      errorService.reportError(
        error instanceof Error ? error.message : "Unknown sync error",
        "error"
      );
    } finally {
      hideLoading();
    }
  };

  // Handle error actions
  const handleDismissError = (id: string) => {
    errorService.dismissError(id);
  };

  const handleRetryError = async (id: string) => {
    await errorService.retryOperation(id);
  };

  // Load address books function for contacts component
  const loadAddressBooks = async () => {
    try {
      showLoading("Loading address books...");
      await syncService.syncAddressBooks();

      const cachedAddressBooks = CacheService.getCachedAddressBooks();
      const addressBooksWithColors = AddressBookColorService.applyColorsToAddressBooks(cachedAddressBooks);
      setAddressBooks(addressBooksWithColors);
      setVisibleAddressBooks(new Set(addressBooksWithColors.map((ab) => ab.url)));
    } catch (error) {
      console.error("Error loading address books:", error);

      const retryAction = async () => {
        await loadAddressBooks();
      };

      errorService.reportError(
        `Failed to load address books: ${errorService.formatErrorMessage(
          error
        )}`,
        "error",
        retryAction
      );
    } finally {
      hideLoading();
    }
  };

  if (initialLoading) {
    return (
      <div className="app-loading">
        <div className="loading-container">
          <div className="loading-spinner large"></div>
          <div className="loading-text">Loading application...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      {isAuthenticated && (
        <NavigationWrapper
          currentView={currentView}
          username={currentConfig?.username}
          onLogout={handleLogout}
          syncService={syncService}
          onManualSync={handleManualSync}
          calendars={calendars}
          visibleCalendars={visibleCalendars}
          onCalendarToggle={calendarHandlers.handleCalendarToggle}
          onCalendarColorChange={calendarHandlers.handleCalendarColorChange}
          onCreateCalendar={calendarHandlers.handleCreateCalendar}
          onEditCalendar={calendarHandlers.handleEditCalendar}
          addressBooks={addressBooks}
          visibleAddressBooks={visibleAddressBooks}
          onCreateAddressBook={addressBookHandlers.handleCreateAddressBook}
          onEditAddressBook={addressBookHandlers.handleEditAddressBook}
          onAddressBookToggle={addressBookHandlers.handleAddressBookToggle}
          onAddressBookColorChange={addressBookHandlers.handleAddressBookColorChange}
        />
      )}

      <main className="app-main">
        <AppRoutes 
          isAuthenticated={isAuthenticated}
          setupComponent={<SetupComponent onSetupComplete={handleSetupComplete} />}
          calendarComponent={
            <CalendarComponent
              calendars={calendars}
              events={events}
              visibleCalendars={visibleCalendars}
              calendarCurrentDate={calendarCurrentDate}
              calendarViewType={calendarViewType}
              showEventForm={showEventForm}
              editingEvent={editingEvent}
              selectedCalendar={selectedCalendar}
              initialDate={initialDate}
              showNewCalendarForm={showNewCalendarForm}
              editingCalendar={editingCalendar}
              onDateRangeChange={handleDateRangeChange}
              onEventClick={calendarHandlers.handleEventClick}
              onCreateEvent={calendarHandlers.handleCreateEvent}
              onDateChange={setCalendarCurrentDate}
              onViewTypeChange={setCalendarViewType}
              onEventSave={calendarHandlers.handleEventSave}
              onEventFormCancel={calendarHandlers.handleEventFormCancel}
              onEventDelete={calendarHandlers.handleEventDelete}
              onNewCalendarSave={calendarHandlers.handleNewCalendarSave}
              onNewCalendarCancel={calendarHandlers.handleNewCalendarCancel}
              onEditCalendarSave={calendarHandlers.handleEditCalendarSave}
              onEditCalendarDelete={calendarHandlers.handleEditCalendarDelete}
              onEditCalendarCancel={calendarHandlers.handleEditCalendarCancel}
            />
          }
          contactsComponent={
            <ContactsComponent
              addressBooks={addressBooks}
              visibleAddressBooks={visibleAddressBooks}
              syncService={syncService}
              davClient={davClient}
              contactRefreshTrigger={contactRefreshTrigger}
              onLoadAddressBooks={loadAddressBooks}
            />
          }
        />
      </main>

      <LoadingOverlay
        isVisible={loadingState.isLoading}
        text={loadingState.text}
        size={loadingState.size}
      />

      <GlobalModals
        showNewAddressBookForm={showNewAddressBookForm}
        editingAddressBook={editingAddressBook}
        onNewAddressBookSave={addressBookHandlers.handleNewAddressBookSave}
        onNewAddressBookCancel={addressBookHandlers.handleNewAddressBookCancel}
        onEditAddressBookSave={addressBookHandlers.handleEditAddressBookSave}
        onEditAddressBookDelete={addressBookHandlers.handleEditAddressBookDelete}
        onEditAddressBookCancel={addressBookHandlers.handleEditAddressBookCancel}
      />

      <ErrorContainer
        errors={errors}
        onDismissError={handleDismissError}
        onRetryError={handleRetryError}
      />

      <OfflineIndicator />
    </div>
  );
};