import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
  Suspense,
  lazy,
} from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useNavigate,
  useLocation,
} from "react-router-dom";
import { Navigation } from "./components/Navigation";
import {
  LoadingOverlay,
  ErrorMessage,
  OfflineIndicator,
} from "./components/common";
import { LoadingProvider, useLoading } from "./contexts/LoadingContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { AuthConfig } from "./types/auth";
import { AuthManager } from "./services/AuthManager";
import { DAVClient } from "./services/DAVClient";
import { SyncService } from "./services/SyncService";
import { CacheService } from "./services/CacheService";
import { ProviderFactory } from "./providers/ProviderFactory";
import { Calendar, CalendarEvent, DateRange, AddressBook } from "./types/dav";
import {
  ErrorHandlingService,
  ErrorMessage as ErrorMessageType,
} from "./services/ErrorHandlingService";
import { useSync } from "./hooks/useSync";
import { ContactCardGrid } from "./components/Contact";
import { assignDefaultColors } from "./utils/calendarColors";
import "./styles/themes.css";
import "./App.css";

// Lazy load components for code splitting
const SetupForm = lazy(() =>
  import("./components/SetupForm").then((module) => ({
    default: module.SetupForm,
  }))
);
const CalendarView = lazy(() =>
  import("./components/Calendar/CalendarView").then((module) => ({
    default: module.CalendarView,
  }))
);
const EventForm = lazy(() =>
  import("./components/Calendar/EventForm").then((module) => ({
    default: module.EventForm,
  }))
);

// Protected route component
const ProtectedRoute: React.FC<{
  isAuthenticated: boolean;
  children: React.ReactNode;
}> = ({ isAuthenticated, children }) => {
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/setup" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

// Navigation wrapper component that has access to useNavigate
const NavigationWrapper: React.FC<{
  currentView: "calendar" | "contacts";
  username?: string;
  onLogout: () => void;
  syncService?: SyncService;
  onManualSync?: () => void;
  calendars: Calendar[];
  visibleCalendars: Set<string>;
  onCalendarToggle: (calendarUrl: string) => void;
  addressBooks: AddressBook[];
  visibleAddressBooks: Set<string>;
  onAddressBookToggle: (addressBookUrl: string) => void;
}> = ({
  currentView,
  username,
  onLogout,
  syncService,
  onManualSync,
  calendars,
  visibleCalendars,
  onCalendarToggle,
  addressBooks,
  visibleAddressBooks,
  onAddressBookToggle,
}) => {
  const navigate = useNavigate();

  const handleViewChange = (view: "calendar" | "contacts") => {
    navigate(`/${view}`);
  };

  return (
    <Navigation
      currentView={currentView}
      onViewChange={handleViewChange}
      username={username}
      onLogout={onLogout}
      syncService={syncService}
      onManualSync={onManualSync}
      calendars={calendars}
      visibleCalendars={visibleCalendars}
      onCalendarToggle={onCalendarToggle}
      addressBooks={addressBooks}
      visibleAddressBooks={visibleAddressBooks}
      onAddressBookToggle={onAddressBookToggle}
    />
  );
};

// App content component that has access to router hooks
const AppContent: React.FC = () => {
  const { showLoading, hideLoading, loadingState } = useLoading();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentConfig, setCurrentConfig] = useState<AuthConfig | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [calendars, setCalendars] = useState<Calendar[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [currentView, setCurrentView] = useState<"calendar" | "contacts">(
    "calendar"
  );
  const [showEventForm, setShowEventForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [selectedCalendar, setSelectedCalendar] = useState<Calendar | null>(
    null
  );
  const [currentDateRange, setCurrentDateRange] = useState<DateRange | null>(
    null
  );
  const [calendarCurrentDate, setCalendarCurrentDate] = useState<Date>(
    new Date()
  );
  const [calendarViewType, setCalendarViewType] = useState<
    "month" | "week" | "day"
  >("month");

  const [visibleCalendars, setVisibleCalendars] = useState<Set<string>>(
    new Set()
  );

  // Contact state
  const [addressBooks, setAddressBooks] = useState<AddressBook[]>([]);
  const [visibleAddressBooks, setVisibleAddressBooks] = useState<Set<string>>(
    new Set()
  );

  const [contactRefreshTrigger, setContactRefreshTrigger] = useState(0);

  // Error handling and offline state
  const [errors, setErrors] = useState<ErrorMessageType[]>([]);

  // Track the last date range to prevent duplicate calls
  const lastDateRangeRef = useRef<DateRange | null>(null);
  // Store pending date range when calendars aren't available yet
  const pendingDateRangeRef = useRef<DateRange | null>(null);
  // Track if we've already checked for stored credentials to prevent infinite loops
  const hasCheckedStoredCredentials = useRef(false);

  const [authManager] = useState(() => AuthManager.getInstance());
  const [errorService] = useState(() => ErrorHandlingService.getInstance());

  // Initialize DAV client and sync service - will be configured when authenticated
  const [davClient] = useState(() => new DAVClient());
  const [syncService] = useState(() => new SyncService(davClient));
  const sync = useSync(syncService);

  // Initialize error handling service
  useEffect(() => {
    const unsubscribe = errorService.subscribe((updatedErrors) => {
      setErrors(updatedErrors.filter((error) => !error.dismissed));
    });

    return () => {
      unsubscribe();
    };
  }, [errorService]);

  // Note: Initial sync is handled in handleSetupComplete after provider setup

  const loadCalendarsAndAddressBooks = useCallback(async () => {
    try {
      await sync.syncCalendars();
      await sync.syncAddressBooks();

      // Update local state with cached data
      const cachedCalendars = CacheService.getCachedCalendars();
      const cachedAddressBooks = CacheService.getCachedAddressBooks();

      console.log("Setting calendars:", cachedCalendars.length);
      const calendarsWithColors = assignDefaultColors(cachedCalendars);
      setCalendars(calendarsWithColors);

      // Initialize all calendars as visible by default
      setVisibleCalendars(new Set(calendarsWithColors.map((cal) => cal.url)));

      console.log("Setting address books:", cachedAddressBooks.length);
      setAddressBooks(cachedAddressBooks);

      // Initialize all address books as visible by default
      setVisibleAddressBooks(new Set(cachedAddressBooks.map((ab) => ab.url)));

      // Events will be loaded by the useEffect when calendars become available
    } catch (error) {
      console.error("Error loading calendars and address books:", error);
      errorService.reportError(
        `Failed to load data: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }, [sync, errorService]);

  const handleSetupComplete = useCallback(
    async (config: AuthConfig, masterPassword?: string) => {
      showLoading("Setting up connection...", "large");

      try {
        setCurrentConfig(config);
        setIsAuthenticated(true);

        // Initialize DAV client with configuration
        davClient.setAuthConfig(config);

        // Set up provider
        const provider = await ProviderFactory.createProviderForServer(
          config.caldavUrl
        );
        if (provider) {
          davClient.setProvider(provider);

          // Load calendars and address books using sync service
          await loadCalendarsAndAddressBooks();
        } else {
          console.error("No compatible provider found for the server");
          errorService.reportError(
            "No compatible provider found for the server"
          );
        }
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
    ]
  );

  // Check for stored credentials and session on app startup
  useEffect(() => {
    const checkStoredCredentials = async () => {
      // Prevent infinite loops by checking if we've already done this
      if (hasCheckedStoredCredentials.current) {
        return;
      }
      hasCheckedStoredCredentials.current = true;

      try {
        console.log("Checking for stored credentials and session...");

        // Check if we have a stored session token
        const sessionToken = authManager.getStoredSessionToken();
        console.log("Session token found:", !!sessionToken);

        if (sessionToken) {
          try {
            console.log("Attempting to restore session with token...");

            // If we have stored credentials, try to decrypt them
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

            // If no stored credentials but we have a session token, check if it's a temporary session
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

    // Only run this effect once on mount
    checkStoredCredentials();
  }, [authManager, errorService, handleSetupComplete]);

  const loadEvents = useCallback(
    async (dateRange: DateRange) => {
      if (calendars.length === 0) {
        console.log("No calendars available, storing date range for later");
        // Store the date range for when calendars become available
        pendingDateRangeRef.current = dateRange;
        return;
      }

      try {
        // Temporarily disable global loading to prevent infinite loops
        // showLoading("Loading calendar events...");

        const allEvents: CalendarEvent[] = [];
        const failedCalendars: string[] = [];

        // Load events from all calendars using sync service
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

        if (failedCalendars.length > 0) {
          errorService.reportError(
            `Failed to load events from ${failedCalendars.join(", ")}.`,
            "warning"
          );
        }

        setEvents(allEvents);
      } catch (error) {
        console.error("Error loading events:", error);

        // Report error without retry to avoid circular dependency
        errorService.reportError(
          `Failed to load events: ${errorService.formatErrorMessage(error)}`,
          "error"
        );
      } finally {
        // hideLoading();
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [calendars, sync, errorService]
  );

  // Load events when calendars become available and we have a pending date range
  useEffect(() => {
    console.log(
      "useEffect triggered - calendars.length:",
      calendars.length,
      "pendingDateRange:",
      pendingDateRangeRef.current
    );
    if (calendars.length > 0 && pendingDateRangeRef.current) {
      const dateRangeToLoad = pendingDateRangeRef.current;
      pendingDateRangeRef.current = null; // Clear the pending range

      console.log(
        "Calendars now available, loading events for pending date range:",
        dateRangeToLoad
      );

      // Call loadEvents which will now work since calendars are available
      loadEvents(dateRangeToLoad);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [calendars.length]);

  const handleDateRangeChange = useCallback(
    (dateRange: DateRange) => {
      // Check if this is the same date range as the last call
      const lastDateRange = lastDateRangeRef.current;
      if (
        lastDateRange &&
        dateRange.start.getTime() === lastDateRange.start.getTime() &&
        dateRange.end.getTime() === lastDateRange.end.getTime()
      ) {
        console.log("Date range unchanged, skipping");
        return;
      }

      // Update the last date range
      lastDateRangeRef.current = {
        start: new Date(dateRange.start),
        end: new Date(dateRange.end),
      };

      console.log("Date range changed:", dateRange);
      setCurrentDateRange(dateRange);

      // Always try to load events - loadEvents will handle the case where calendars aren't available yet
      loadEvents(dateRange);
    },
    [loadEvents]
  );

  const handleEventClick = useCallback(
    (event: CalendarEvent) => {
      setEditingEvent(event);

      // Find the calendar this event belongs to
      if (event.calendarUrl) {
        const eventCalendar = calendars.find(
          (cal) => cal.url === event.calendarUrl
        );
        if (eventCalendar) {
          setSelectedCalendar(eventCalendar);
        }
      }

      setShowEventForm(true);
    },
    [calendars]
  );

  const handleCreateEvent = useCallback(
    (date: Date) => {
      // Set default calendar and show form
      if (calendars.length > 0) {
        setSelectedCalendar(calendars[0]);
        setEditingEvent(null);
        setShowEventForm(true);
        // Store the initial date for the form
        setInitialDate(date);
      }
    },
    [calendars]
  );

  const [initialDate, setInitialDate] = useState<Date | undefined>(undefined);

  const handleEventSave = useCallback(
    async (eventData: CalendarEvent, calendar: Calendar) => {
      try {
        showLoading(editingEvent ? "Updating event..." : "Creating event...");

        if (editingEvent) {
          // Check if the calendar has changed (moving event to different calendar)
          const originalCalendarUrl = editingEvent.calendarUrl;
          const newCalendarUrl = calendar.url;

          if (originalCalendarUrl && originalCalendarUrl !== newCalendarUrl) {
            // Moving event to different calendar: delete from original, create in new
            showLoading("Moving event to different calendar...");

            // Find the original calendar
            const originalCalendar = calendars.find(
              (cal) => cal.url === originalCalendarUrl
            );
            if (originalCalendar) {
              // Delete from original calendar
              await sync.deleteEvent(originalCalendar, editingEvent);
            }

            // Create in new calendar with new calendar URL
            const eventWithNewCalendar = {
              ...eventData,
              calendarUrl: newCalendarUrl,
            };
            await sync.createEvent(calendar, eventWithNewCalendar);
          } else {
            // Same calendar: just update
            await sync.updateEvent(calendar, eventData);
          }
        } else {
          // Create new event using sync service
          const eventWithCalendar = { ...eventData, calendarUrl: calendar.url };
          await sync.createEvent(calendar, eventWithCalendar);
        }

        // Refresh events after successful save
        if (currentDateRange) {
          await loadEvents(currentDateRange);
        }

        // Close form
        setShowEventForm(false);
        setEditingEvent(null);
        setSelectedCalendar(null);
        setInitialDate(undefined);
      } catch (error) {
        console.error("Error saving event:", error);

        // Report error but don't throw it
        errorService.reportError(
          `Failed to save event: ${errorService.formatErrorMessage(error)}`,
          "error"
        );

        // Don't close the form so the user can try again
        throw error; // Re-throw to let the form handle the error display
      } finally {
        hideLoading();
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [editingEvent, sync, currentDateRange, loadEvents, errorService]
  );

  const handleEventDelete = useCallback(
    async (event: CalendarEvent, calendar: Calendar) => {
      try {
        showLoading("Deleting event...");

        await sync.deleteEvent(calendar, event);

        // Refresh events after successful delete
        if (currentDateRange) {
          await loadEvents(currentDateRange);
        }

        // Close form
        setShowEventForm(false);
        setEditingEvent(null);
        setSelectedCalendar(null);
        setInitialDate(undefined);
      } catch (error) {
        console.error("Error deleting event:", error);

        // Report error but don't throw it
        errorService.reportError(
          `Failed to delete event: ${errorService.formatErrorMessage(error)}`,
          "error"
        );

        // Don't close the form so the user can try again
        throw error; // Re-throw to let the form handle the error display
      } finally {
        hideLoading();
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [sync, currentDateRange, loadEvents, errorService]
  );

  const handleEventFormCancel = () => {
    setShowEventForm(false);
    setEditingEvent(null);
    setSelectedCalendar(null);
    setInitialDate(undefined);
  };

  // Load address books using sync service
  const loadAddressBooks = async () => {
    try {
      showLoading("Loading address books...");
      await sync.syncAddressBooks();

      const cachedAddressBooks = CacheService.getCachedAddressBooks();
      setAddressBooks(cachedAddressBooks);

      // Initialize all address books as visible by default
      setVisibleAddressBooks(new Set(cachedAddressBooks.map((ab) => ab.url)));
    } catch (error) {
      console.error("Error loading address books:", error);

      // Create retry function
      const retryAction = async () => {
        await loadAddressBooks();
      };

      // Report error with retry option
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

  // Handle address book toggle
  const handleAddressBookToggle = useCallback((addressBookUrl: string) => {
    setVisibleAddressBooks((prev) => {
      const newVisible = new Set(prev);
      if (newVisible.has(addressBookUrl)) {
        newVisible.delete(addressBookUrl);
      } else {
        newVisible.add(addressBookUrl);
      }
      return newVisible;
    });
  }, []);

  const handleLogout = () => {
    setIsAuthenticated(false);
    setCurrentConfig(null);
    // Reset all state
    setCalendars([]);
    setEvents([]);
    setAddressBooks([]);
    setVisibleAddressBooks(new Set());
    // Reset calendar state
    setVisibleCalendars(new Set());
    // Optionally clear stored credentials
    // authManager.clearCredentials();
  };

  // Setup component
  const SetupComponent = () => {
    const navigate = useNavigate();

    const handleSetup = async (config: AuthConfig, masterPassword?: string) => {
      await handleSetupComplete(config, masterPassword);
      navigate("/calendar");
    };

    return (
      <Suspense fallback={<div />}>
        <SetupForm onSetupComplete={handleSetup} />
      </Suspense>
    );
  };

  // Calendar component - using useMemo to prevent recreation
  const CalendarComponent = useMemo(() => {
    const Component = () => {
      return (
        <Suspense fallback={<div />}>
          <div className="view-container">
            <CalendarView
              calendars={calendars}
              events={events.filter((event) =>
                event.calendarUrl
                  ? visibleCalendars.has(event.calendarUrl)
                  : true
              )}
              onDateRangeChange={handleDateRangeChange}
              onEventClick={handleEventClick}
              onCreateEvent={handleCreateEvent}
              loading={false}
              currentDate={calendarCurrentDate}
              onDateChange={setCalendarCurrentDate}
              viewType={calendarViewType}
              onViewTypeChange={setCalendarViewType}
            />

            {/* Event Form Modal */}
            {showEventForm && (
              <Suspense fallback={<div />}>
                <EventForm
                  event={editingEvent || undefined}
                  calendars={calendars}
                  selectedCalendar={selectedCalendar || undefined}
                  onSave={handleEventSave}
                  onCancel={handleEventFormCancel}
                  onDelete={handleEventDelete}
                  isEditing={!!editingEvent}
                  initialDate={initialDate}
                />
              </Suspense>
            )}
          </div>
        </Suspense>
      );
    };
    return Component;
  }, [
    calendarCurrentDate,
    calendarViewType,
    calendars,
    editingEvent,
    events,
    visibleCalendars,
    handleCreateEvent,
    handleDateRangeChange,
    handleEventClick,
    handleEventSave,
    handleEventDelete,
    initialDate,
    selectedCalendar,
    showEventForm,
  ]);

  // Contacts component
  const ContactsComponent = () => {
    return (
      <div className="view-container">
        <div className="contacts-view">
          {addressBooks.length === 0 ? (
            <div className="no-address-books">
              <h2>No Address Books Found</h2>
              <p>No address books were found on your CardDAV server.</p>
              <button onClick={loadAddressBooks}>Refresh</button>
            </div>
          ) : (
            <div className="contacts-container">
              <div className="contacts-layout">
                <ContactCardGrid
                  addressBooks={addressBooks.filter((ab) =>
                    visibleAddressBooks.has(ab.url)
                  )}
                  syncService={syncService}
                  davClient={davClient}
                  refreshTrigger={contactRefreshTrigger}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  // Calendar handlers
  const handleCalendarToggle = useCallback((calendarUrl: string) => {
    setVisibleCalendars((prev) => {
      const newVisible = new Set(prev);
      if (newVisible.has(calendarUrl)) {
        newVisible.delete(calendarUrl);
      } else {
        newVisible.add(calendarUrl);
      }
      return newVisible;
    });
  }, []);

  // Update current view based on location
  const location = useLocation();
  useEffect(() => {
    if (location.pathname.includes("/calendar")) {
      setCurrentView("calendar");
    } else if (location.pathname.includes("/contacts")) {
      setCurrentView("contacts");
    }
  }, [location.pathname]);

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

  // Handle error dismissal
  const handleDismissError = (id: string) => {
    errorService.dismissError(id);
  };

  // Handle error retry
  const handleRetryError = async (id: string) => {
    await errorService.retryOperation(id);
  };

  // Handle manual sync
  const handleManualSync = async () => {
    try {
      showLoading("Syncing data...");
      await sync.fullSync({ forceRefresh: true });

      // Update local state with fresh data
      const cachedCalendars = CacheService.getCachedCalendars();
      const cachedAddressBooks = CacheService.getCachedAddressBooks();

      const calendarsWithColors = assignDefaultColors(cachedCalendars);
      setCalendars(calendarsWithColors);

      // Update visible calendars to include any new calendars
      setVisibleCalendars((prev) => {
        const newVisible = new Set(prev);
        calendarsWithColors.forEach((cal) => {
          if (!newVisible.has(cal.url)) {
            newVisible.add(cal.url); // New calendars are visible by default
          }
        });
        return newVisible;
      });

      setAddressBooks(cachedAddressBooks);

      // Update visible address books to include any new address books
      setVisibleAddressBooks((prev) => {
        const newVisible = new Set(prev);
        cachedAddressBooks.forEach((ab) => {
          if (!newVisible.has(ab.url)) {
            newVisible.add(ab.url); // New address books are visible by default
          }
        });
        return newVisible;
      });

      // Refresh current view
      if (currentDateRange) {
        await loadEvents(currentDateRange);
      }
    } catch (error) {
      console.error("Manual sync failed:", error);
    } finally {
      hideLoading();
    }
  };

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
          onCalendarToggle={handleCalendarToggle}
          addressBooks={addressBooks}
          visibleAddressBooks={visibleAddressBooks}
          onAddressBookToggle={handleAddressBookToggle}
        />
      )}

      <main className="app-main">
        <Routes>
          <Route
            path="/setup"
            element={
              isAuthenticated ? (
                <Navigate to="/calendar" replace />
              ) : (
                <SetupComponent />
              )
            }
          />

          <Route
            path="/calendar"
            element={
              <ProtectedRoute isAuthenticated={isAuthenticated}>
                <CalendarComponent />
              </ProtectedRoute>
            }
          />

          <Route
            path="/contacts"
            element={
              <ProtectedRoute isAuthenticated={isAuthenticated}>
                <ContactsComponent />
              </ProtectedRoute>
            }
          />

          <Route
            path="/"
            element={
              isAuthenticated ? (
                <Navigate to="/calendar" replace />
              ) : (
                <Navigate to="/setup" replace />
              )
            }
          />
        </Routes>
      </main>

      {/* Global Loading Overlay */}
      <LoadingOverlay
        isVisible={loadingState.isLoading}
        text={loadingState.text}
        size={loadingState.size}
      />

      {/* Error message container */}
      <div className="error-container">
        {errors.map((error) => (
          <ErrorMessage
            key={error.id}
            error={error}
            onDismiss={handleDismissError}
            onRetry={handleRetryError}
          />
        ))}
      </div>

      {/* Offline indicator */}
      <OfflineIndicator />
    </div>
  );
};

// Main App wrapper component
function App() {
  return (
    <ThemeProvider>
      <LoadingProvider>
        <Router>
          <AppContent />
        </Router>
      </LoadingProvider>
    </ThemeProvider>
  );
}

export default App;
