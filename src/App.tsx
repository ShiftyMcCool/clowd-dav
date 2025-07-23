import React, {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo,
} from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
  useNavigate,
  useLocation,
} from "react-router-dom";
import { SetupForm } from "./components/SetupForm";
import { CalendarView } from "./components/Calendar/CalendarView";
import { EventForm } from "./components/Calendar/EventForm";
import { ContactList, ContactDetail, ContactForm } from "./components/Contact";
import { Navigation } from "./components/Navigation";
import {
  LoadingOverlay,
  ErrorMessage,
  OfflineIndicator,
  SyncStatusIndicator,
} from "./components/common";
import { LoadingProvider, useLoading } from "./contexts/LoadingContext";
import { AuthConfig } from "./types/auth";
import { AuthManager } from "./services/AuthManager";
import { DAVClient } from "./services/DAVClient";
import { SyncService } from "./services/SyncService";
import { CacheService } from "./services/CacheService";
import { ProviderFactory } from "./providers/ProviderFactory";
import {
  Calendar,
  CalendarEvent,
  DateRange,
  AddressBook,
  Contact,
} from "./types/dav";
import {
  ErrorHandlingService,
  ErrorMessage as ErrorMessageType,
} from "./services/ErrorHandlingService";
import { useSync } from "./hooks/useSync";
import "./App.css";

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
}> = ({ currentView, username, onLogout }) => {
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

  // Contact state
  const [addressBooks, setAddressBooks] = useState<AddressBook[]>([]);
  const [selectedAddressBook, setSelectedAddressBook] =
    useState<AddressBook | null>(null);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [showContactForm, setShowContactForm] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);

  // Error handling and offline state
  const [errors, setErrors] = useState<ErrorMessageType[]>([]);

  // Track the last date range to prevent duplicate calls
  const lastDateRangeRef = useRef<DateRange | null>(null);
  // Store pending date range when calendars aren't available yet
  const pendingDateRangeRef = useRef<DateRange | null>(null);

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

  useEffect(() => {
    // Check if user has stored credentials and try to load them
    const checkStoredCredentials = async () => {
      try {
        if (authManager.hasStoredCredentials()) {
          // We have stored credentials, but we need the master password
          // For now, just show the setup form
          setInitialLoading(false);
        } else {
          setInitialLoading(false);
        }
      } catch (error) {
        console.error("Error checking stored credentials:", error);
        errorService.reportError(
          "Failed to check stored credentials. Please try again."
        );
        setInitialLoading(false);
      }
    };

    checkStoredCredentials();
  }, [authManager, errorService]);

  const handleSetupComplete = async (config: AuthConfig) => {
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
        errorService.reportError("No compatible provider found for the server");
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
  };

  const loadCalendarsAndAddressBooks = async () => {
    try {
      await sync.syncCalendars();
      await sync.syncAddressBooks();

      // Update local state with cached data
      const cachedCalendars = CacheService.getCachedCalendars();
      const cachedAddressBooks = CacheService.getCachedAddressBooks();

      console.log("Setting calendars:", cachedCalendars.length);
      setCalendars(cachedCalendars);
      console.log("Setting address books:", cachedAddressBooks.length);
      setAddressBooks(cachedAddressBooks);

      // Select first address book by default
      if (cachedAddressBooks.length > 0 && !selectedAddressBook) {
        setSelectedAddressBook(cachedAddressBooks[0]);
      }

      // Events will be loaded by the useEffect when calendars become available
    } catch (error) {
      console.error("Error loading calendars and address books:", error);
      errorService.reportError(
        `Failed to load data: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  };

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

  const handleEventClick = useCallback((event: CalendarEvent) => {
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
  }, [calendars]);

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

      // Select the first address book by default if available
      if (cachedAddressBooks.length > 0 && !selectedAddressBook) {
        setSelectedAddressBook(cachedAddressBooks[0]);
      }
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

  // Handle contact selection
  const handleContactSelect = (contact: Contact) => {
    setSelectedContact(contact);
    setEditingContact(null);
    setShowContactForm(false);
  };

  // Handle adding a new contact
  const handleAddContact = () => {
    setSelectedContact(null);
    setEditingContact(null);
    setShowContactForm(true);
  };

  // Handle editing a contact
  const handleEditContact = (contact: Contact) => {
    setEditingContact(contact);
    setShowContactForm(true);
  };

  // Handle saving a contact (create or update)
  const handleContactSave = async (contactData: Contact) => {
    if (!selectedAddressBook) return;

    try {
      showLoading(
        editingContact ? "Updating contact..." : "Creating contact..."
      );

      if (editingContact) {
        // Update existing contact using sync service
        await sync.updateContact(selectedAddressBook, contactData);
      } else {
        // Create new contact using sync service
        await sync.createContact(selectedAddressBook, contactData);
      }

      // Close form and reset state
      setShowContactForm(false);
      setEditingContact(null);
      setSelectedContact(null);
    } catch (error) {
      console.error("Error saving contact:", error);

      // Report error but don't throw it
      errorService.reportError(
        `Failed to save contact: ${errorService.formatErrorMessage(error)}`,
        "error"
      );

      // Don't close the form so the user can try again
      throw error; // Re-throw to let the form handle the error display
    } finally {
      hideLoading();
    }
  };

  // Handle contact form cancel
  const handleContactFormCancel = () => {
    setShowContactForm(false);
    setEditingContact(null);
  };

  // Handle address book change
  const handleAddressBookChange = (addressBook: AddressBook) => {
    setSelectedAddressBook(addressBook);
    setSelectedContact(null);
    setEditingContact(null);
    setShowContactForm(false);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setCurrentConfig(null);
    // Reset all state
    setCalendars([]);
    setEvents([]);
    setAddressBooks([]);
    setSelectedAddressBook(null);
    setSelectedContact(null);
    setEditingContact(null);
    setShowContactForm(false);
    // Optionally clear stored credentials
    // authManager.clearCredentials();
  };

  const location = useLocation();

  // Update current view based on location
  useEffect(() => {
    if (location.pathname === "/calendar") {
      setCurrentView("calendar");
    } else if (location.pathname === "/contacts") {
      setCurrentView("contacts");
    }
  }, [location.pathname]);

  // Setup component
  const SetupComponent = () => {
    const navigate = useNavigate();

    const handleSetup = async (config: AuthConfig) => {
      await handleSetupComplete(config);
      navigate("/calendar");
    };

    return <SetupForm onSetupComplete={handleSetup} />;
  };

  // Calendar component - using useMemo to prevent recreation
  const CalendarComponent = useMemo(() => {
    const Component = () => {
      return (
        <div className="view-container">
          <CalendarView
            calendars={calendars}
            events={events}
            onDateRangeChange={handleDateRangeChange}
            onEventClick={handleEventClick}
            onCreateEvent={handleCreateEvent}
            loading={false}
            currentDate={calendarCurrentDate}
            onDateChange={setCalendarCurrentDate}
          />

          {/* Event Form Modal */}
          {showEventForm && (
            <EventForm
              event={editingEvent || undefined}
              calendars={calendars}
              selectedCalendar={selectedCalendar || undefined}
              onSave={handleEventSave}
              onCancel={handleEventFormCancel}
              isEditing={!!editingEvent}
              initialDate={initialDate}
            />
          )}
        </div>
      );
    };
    return Component;
  }, [
    calendarCurrentDate,
    calendars,
    editingEvent,
    events,
    handleCreateEvent,
    handleDateRangeChange,
    handleEventClick,
    handleEventSave,
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
              <div className="address-book-selector">
                <label htmlFor="address-book-select">Address Book:</label>
                <select
                  id="address-book-select"
                  value={selectedAddressBook?.url || ""}
                  onChange={(e) => {
                    const selected = addressBooks.find(
                      (ab) => ab.url === e.target.value
                    );
                    if (selected) handleAddressBookChange(selected);
                  }}
                >
                  {addressBooks.map((ab) => (
                    <option key={ab.url} value={ab.url}>
                      {ab.displayName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="contacts-layout">
                {selectedAddressBook && (
                  <ContactList
                    addressBook={selectedAddressBook}
                    syncService={syncService}
                    onContactSelect={handleContactSelect}
                    onAddContact={handleAddContact}
                  />
                )}

                {selectedContact && !showContactForm && (
                  <ContactDetail
                    contact={selectedContact}
                    onEdit={() => handleEditContact(selectedContact)}
                    onClose={() => setSelectedContact(null)}
                  />
                )}

                {showContactForm && selectedAddressBook && (
                  <ContactForm
                    contact={editingContact || undefined}
                    addressBook={selectedAddressBook}
                    davClient={davClient}
                    onSave={handleContactSave}
                    onCancel={handleContactFormCancel}
                  />
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    );
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

      setCalendars(cachedCalendars);
      setAddressBooks(cachedAddressBooks);

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

      {/* Sync status indicator */}
      {isAuthenticated && (
        <SyncStatusIndicator
          syncService={syncService}
          onManualSync={handleManualSync}
        />
      )}
    </div>
  );
};

// Main App wrapper component
function App() {
  return (
    <LoadingProvider>
      <Router>
        <AppContent />
      </Router>
    </LoadingProvider>
  );
}

export default App;
