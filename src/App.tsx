import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { SetupForm } from './components/SetupForm';
import { CalendarView } from './components/Calendar/CalendarView';
import { EventForm } from './components/Calendar/EventForm';
import { ContactList, ContactDetail, ContactForm } from './components/Contact';
import { Navigation } from './components/Navigation';
import { LoadingIndicator, ErrorMessage, OfflineIndicator } from './components/common';
import { AuthConfig } from './types/auth';
import { AuthManager } from './services/AuthManager';
import { DAVClient } from './services/DAVClient';
import { ProviderFactory } from './providers/ProviderFactory';
import { Calendar, CalendarEvent, DateRange, AddressBook, Contact } from './types/dav';
import { ErrorHandlingService, ErrorMessage as ErrorMessageType } from './services/ErrorHandlingService';
import { NetworkService } from './services/NetworkService';
import './App.css';

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

// Main App component
function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentConfig, setCurrentConfig] = useState<AuthConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [calendars, setCalendars] = useState<Calendar[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [currentView, setCurrentView] = useState<'calendar' | 'contacts'>('calendar');
  const [showEventForm, setShowEventForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [selectedCalendar, setSelectedCalendar] = useState<Calendar | null>(null);
  const [currentDateRange, setCurrentDateRange] = useState<DateRange | null>(null);
  
  // Contact state
  const [addressBooks, setAddressBooks] = useState<AddressBook[]>([]);
  const [selectedAddressBook, setSelectedAddressBook] = useState<AddressBook | null>(null);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [showContactForm, setShowContactForm] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [contactsLoading, setContactsLoading] = useState(false);
  
  // Error handling and offline state
  const [errors, setErrors] = useState<ErrorMessageType[]>([]);
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const [pendingOperationCount, setPendingOperationCount] = useState(0);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'pending' | 'error'>('synced');

  const authManager = AuthManager.getInstance();
  const davClient = new DAVClient();
  const errorService = ErrorHandlingService.getInstance();
  const networkService = NetworkService.getInstance();

  // Initialize error handling service
  useEffect(() => {
    const unsubscribe = errorService.subscribe((updatedErrors) => {
      setErrors(updatedErrors.filter(error => !error.dismissed));
    });
    
    return () => {
      unsubscribe();
    };
  }, []);

  // Initialize network service
  useEffect(() => {
    const unsubscribe = networkService.subscribe((status) => {
      setIsOffline(!status.online);
      
      // When coming back online, try to execute pending operations
      if (status.online) {
        executePendingOperations();
      }
    });
    
    // Update pending operation count when it changes
    const checkPendingOperations = () => {
      setPendingOperationCount(networkService.getPendingOperationCount());
      
      // Update sync status based on pending operations
      if (networkService.getPendingOperationCount() > 0) {
        if (networkService.isOnline()) {
          setSyncStatus('syncing');
        } else {
          setSyncStatus('pending');
        }
      } else {
        setSyncStatus('synced');
      }
    };
    
    // Check pending operations periodically
    const intervalId = setInterval(checkPendingOperations, 5000);
    
    return () => {
      unsubscribe();
      clearInterval(intervalId);
    };
  }, []);

  // Execute pending operations when back online
  const executePendingOperations = useCallback(async () => {
    if (networkService.isOnline() && networkService.getPendingOperationCount() > 0) {
      setSyncStatus('syncing');
      try {
        await networkService.executePendingOperations();
        setSyncStatus('synced');
      } catch (error) {
        setSyncStatus('error');
        errorService.reportError('Failed to sync some pending changes. Please try again later.');
      }
    }
  }, [errorService, networkService]);

  useEffect(() => {
    // Check if user has stored credentials and try to load them
    const checkStoredCredentials = async () => {
      try {
        if (authManager.hasStoredCredentials()) {
          // We have stored credentials, but we need the master password
          // For now, just show the setup form
          setLoading(false);
        } else {
          setLoading(false);
        }
      } catch (error) {
        console.error('Error checking stored credentials:', error);
        errorService.reportError('Failed to check stored credentials. Please try again.');
        setLoading(false);
      }
    };

    checkStoredCredentials();
  }, [authManager, errorService]);

  const handleSetupComplete = async (config: AuthConfig) => {
    setCurrentConfig(config);
    setIsAuthenticated(true);
    
    // Initialize DAV client with configuration
    davClient.setAuthConfig(config);
    
    // Set up provider
    try {
      const provider = await ProviderFactory.createProvider(config.caldavUrl);
      if (provider) {
        davClient.setProvider(provider);
        
        // Load calendars and address books
        await loadCalendars();
        await loadAddressBooks();
      } else {
        console.error('No compatible provider found for the server');
      }
    } catch (error) {
      console.error('Error setting up DAV client:', error);
    }
  };

  const loadCalendars = async () => {
    try {
      setCalendarLoading(true);
      
      // Check if we're offline
      if (!networkService.isOnline()) {
        // If offline, use cached calendars if available
        const cachedCalendars = localStorage.getItem('cachedCalendars');
        if (cachedCalendars) {
          setCalendars(JSON.parse(cachedCalendars));
          errorService.reportError('You are offline. Showing cached calendars.', 'info');
        } else {
          errorService.reportError('Cannot load calendars while offline.', 'warning');
        }
        setCalendarLoading(false);
        return;
      }
      
      const discoveredCalendars = await davClient.discoverCalendars();
      setCalendars(discoveredCalendars);
      
      // Cache calendars for offline use
      localStorage.setItem('cachedCalendars', JSON.stringify(discoveredCalendars));
    } catch (error) {
      console.error('Error loading calendars:', error);
      
      // Create retry function
      const retryAction = async () => {
        await loadCalendars();
      };
      
      // Report error with retry option
      errorService.reportError(
        `Failed to load calendars: ${errorService.formatErrorMessage(error)}`,
        'error',
        retryAction
      );
      
      // Try to use cached calendars if available
      const cachedCalendars = localStorage.getItem('cachedCalendars');
      if (cachedCalendars) {
        setCalendars(JSON.parse(cachedCalendars));
        errorService.reportError('Showing cached calendars.', 'info');
      }
    } finally {
      setCalendarLoading(false);
    }
  };

  const loadEvents = async (dateRange: DateRange) => {
    if (calendars.length === 0) return;
    
    try {
      setCalendarLoading(true);
      
      // Check if we're offline
      if (!networkService.isOnline()) {
        // If offline, use cached events if available
        const cachedEventsKey = `cachedEvents_${dateRange.start.toISOString()}_${dateRange.end.toISOString()}`;
        const cachedEvents = localStorage.getItem(cachedEventsKey);
        
        if (cachedEvents) {
          const parsedEvents = JSON.parse(cachedEvents);
          // Convert string dates back to Date objects
          const eventsWithDates = parsedEvents.map((event: any) => ({
            ...event,
            dtstart: new Date(event.dtstart),
            dtend: new Date(event.dtend)
          }));
          setEvents(eventsWithDates);
          errorService.reportError('You are offline. Showing cached events.', 'info');
        } else {
          errorService.reportError('Cannot load events while offline.', 'warning');
        }
        setCalendarLoading(false);
        return;
      }
      
      const allEvents: CalendarEvent[] = [];
      const failedCalendars: string[] = [];
      
      // Load events from all calendars
      for (const calendar of calendars) {
        try {
          const calendarEvents = await davClient.getEvents(calendar, dateRange);
          allEvents.push(...calendarEvents);
        } catch (error) {
          console.error(`Error loading events from calendar ${calendar.displayName}:`, error);
          failedCalendars.push(calendar.displayName);
        }
      }
      
      if (failedCalendars.length > 0) {
        // Create retry function for failed calendars
        const retryAction = async () => {
          await loadEvents(dateRange);
        };
        
        errorService.reportError(
          `Failed to load events from ${failedCalendars.join(', ')}.`,
          'warning',
          retryAction
        );
      }
      
      setEvents(allEvents);
      
      // Cache events for offline use
      const cachedEventsKey = `cachedEvents_${dateRange.start.toISOString()}_${dateRange.end.toISOString()}`;
      localStorage.setItem(cachedEventsKey, JSON.stringify(allEvents));
    } catch (error) {
      console.error('Error loading events:', error);
      
      // Create retry function
      const retryAction = async () => {
        await loadEvents(dateRange);
      };
      
      // Report error with retry option
      errorService.reportError(
        `Failed to load events: ${errorService.formatErrorMessage(error)}`,
        'error',
        retryAction
      );
      
      // Try to use cached events if available
      const cachedEventsKey = `cachedEvents_${dateRange.start.toISOString()}_${dateRange.end.toISOString()}`;
      const cachedEvents = localStorage.getItem(cachedEventsKey);
      
      if (cachedEvents) {
        const parsedEvents = JSON.parse(cachedEvents);
        // Convert string dates back to Date objects
        const eventsWithDates = parsedEvents.map((event: any) => ({
          ...event,
          dtstart: new Date(event.dtstart),
          dtend: new Date(event.dtend)
        }));
        setEvents(eventsWithDates);
        errorService.reportError('Showing cached events.', 'info');
      }
    } finally {
      setCalendarLoading(false);
    }
  };

  const handleDateRangeChange = (dateRange: DateRange) => {
    setCurrentDateRange(dateRange);
    loadEvents(dateRange);
  };

  const handleEventClick = (event: CalendarEvent) => {
    setEditingEvent(event);
    setShowEventForm(true);
  };

  const handleCreateEvent = (date: Date) => {
    // Set default calendar and show form
    if (calendars.length > 0) {
      setSelectedCalendar(calendars[0]);
      setEditingEvent(null);
      setShowEventForm(true);
      // Store the initial date for the form
      setInitialDate(date);
    }
  };

  const [initialDate, setInitialDate] = useState<Date | undefined>(undefined);

  const handleEventSave = async (eventData: CalendarEvent, calendar: Calendar) => {
    try {
      // Check if we're offline
      if (!networkService.isOnline()) {
        // If offline, store the operation for later execution
        const operationId = `event_${Date.now()}_${eventData.uid}`;
        const operation = async () => {
          if (editingEvent) {
            await davClient.updateEvent(calendar, eventData);
          } else {
            await davClient.createEvent(calendar, eventData);
          }
        };
        
        networkService.addPendingOperation(operationId, operation);
        
        // Update local cache to reflect the change immediately
        if (currentDateRange) {
          const cachedEventsKey = `cachedEvents_${currentDateRange.start.toISOString()}_${currentDateRange.end.toISOString()}`;
          const cachedEvents = localStorage.getItem(cachedEventsKey);
          
          if (cachedEvents) {
            let parsedEvents = JSON.parse(cachedEvents);
            
            if (editingEvent) {
              // Update existing event in cache
              parsedEvents = parsedEvents.map((event: any) => 
                event.uid === eventData.uid ? eventData : event
              );
            } else {
              // Add new event to cache
              parsedEvents.push(eventData);
            }
            
            localStorage.setItem(cachedEventsKey, JSON.stringify(parsedEvents));
          }
          
          // Update the events state
          if (editingEvent) {
            setEvents(events.map(event => 
              event.uid === eventData.uid ? eventData : event
            ));
          } else {
            setEvents([...events, eventData]);
          }
        }
        
        errorService.reportError(
          `You are offline. ${editingEvent ? 'Changes' : 'New event'} will be saved when you reconnect.`,
          'info'
        );
        
        // Close form
        setShowEventForm(false);
        setEditingEvent(null);
        setSelectedCalendar(null);
        setInitialDate(undefined);
        
        // Update sync status
        setSyncStatus('pending');
        return;
      }
      
      // If online, proceed normally
      if (editingEvent) {
        // Update existing event
        await davClient.updateEvent(calendar, eventData);
      } else {
        // Create new event
        await davClient.createEvent(calendar, eventData);
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
      console.error('Error saving event:', error);
      
      // Report error but don't throw it
      errorService.reportError(
        `Failed to save event: ${errorService.formatErrorMessage(error)}`,
        'error'
      );
      
      // Don't close the form so the user can try again
      throw error; // Re-throw to let the form handle the error display
    }
  };

  const handleEventFormCancel = () => {
    setShowEventForm(false);
    setEditingEvent(null);
    setSelectedCalendar(null);
    setInitialDate(undefined);
  };

  // Load address books
  const loadAddressBooks = async () => {
    try {
      setContactsLoading(true);
      
      // Check if we're offline
      if (!networkService.isOnline()) {
        // If offline, use cached address books if available
        const cachedAddressBooks = localStorage.getItem('cachedAddressBooks');
        if (cachedAddressBooks) {
          const parsedAddressBooks = JSON.parse(cachedAddressBooks);
          setAddressBooks(parsedAddressBooks);
          
          // Select the first address book by default if available
          if (parsedAddressBooks.length > 0 && !selectedAddressBook) {
            setSelectedAddressBook(parsedAddressBooks[0]);
          }
          
          errorService.reportError('You are offline. Showing cached address books.', 'info');
        } else {
          errorService.reportError('Cannot load address books while offline.', 'warning');
        }
        setContactsLoading(false);
        return;
      }
      
      const discoveredAddressBooks = await davClient.discoverAddressBooks();
      setAddressBooks(discoveredAddressBooks);
      
      // Cache address books for offline use
      localStorage.setItem('cachedAddressBooks', JSON.stringify(discoveredAddressBooks));
      
      // Select the first address book by default if available
      if (discoveredAddressBooks.length > 0 && !selectedAddressBook) {
        setSelectedAddressBook(discoveredAddressBooks[0]);
      }
    } catch (error) {
      console.error('Error loading address books:', error);
      
      // Create retry function
      const retryAction = async () => {
        await loadAddressBooks();
      };
      
      // Report error with retry option
      errorService.reportError(
        `Failed to load address books: ${errorService.formatErrorMessage(error)}`,
        'error',
        retryAction
      );
      
      // Try to use cached address books if available
      const cachedAddressBooks = localStorage.getItem('cachedAddressBooks');
      if (cachedAddressBooks) {
        const parsedAddressBooks = JSON.parse(cachedAddressBooks);
        setAddressBooks(parsedAddressBooks);
        
        // Select the first address book by default if available
        if (parsedAddressBooks.length > 0 && !selectedAddressBook) {
          setSelectedAddressBook(parsedAddressBooks[0]);
        }
        
        errorService.reportError('Showing cached address books.', 'info');
      }
    } finally {
      setContactsLoading(false);
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
      // Check if we're offline
      if (!networkService.isOnline()) {
        // If offline, store the operation for later execution
        const operationId = `contact_${Date.now()}_${contactData.uid}`;
        const operation = async () => {
          if (editingContact) {
            await davClient.updateContact(selectedAddressBook, contactData);
          } else {
            await davClient.createContact(selectedAddressBook, contactData);
          }
        };
        
        networkService.addPendingOperation(operationId, operation);
        
        // Update local cache to reflect the change immediately
        const cachedContactsKey = `cachedContacts_${selectedAddressBook.url}`;
        const cachedContacts = localStorage.getItem(cachedContactsKey);
        
        if (cachedContacts) {
          let parsedContacts = JSON.parse(cachedContacts);
          
          if (editingContact) {
            // Update existing contact in cache
            parsedContacts = parsedContacts.map((contact: any) => 
              contact.uid === contactData.uid ? contactData : contact
            );
          } else {
            // Add new contact to cache
            parsedContacts.push(contactData);
          }
          
          localStorage.setItem(cachedContactsKey, JSON.stringify(parsedContacts));
        }
        
        errorService.reportError(
          `You are offline. ${editingContact ? 'Changes' : 'New contact'} will be saved when you reconnect.`,
          'info'
        );
        
        // Close form and reset state
        setShowContactForm(false);
        setEditingContact(null);
        setSelectedContact(null);
        
        // Update sync status
        setSyncStatus('pending');
        return;
      }
      
      // If online, proceed normally
      if (editingContact) {
        // Update existing contact
        await davClient.updateContact(selectedAddressBook, contactData);
      } else {
        // Create new contact
        await davClient.createContact(selectedAddressBook, contactData);
      }
      
      // Close form and reset state
      setShowContactForm(false);
      setEditingContact(null);
      setSelectedContact(null);
      
      // Force refresh the view
      if (currentView === 'contacts') {
        setContactsLoading(true);
        setTimeout(() => setContactsLoading(false), 500);
      }
    } catch (error) {
      console.error('Error saving contact:', error);
      
      // Report error but don't throw it
      errorService.reportError(
        `Failed to save contact: ${errorService.formatErrorMessage(error)}`,
        'error'
      );
      
      // Don't close the form so the user can try again
      throw error; // Re-throw to let the form handle the error display
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

  // Handle view change from navigation
  const handleViewChange = (view: 'calendar' | 'contacts') => {
    setCurrentView(view);
  };

  // Setup component
  const SetupComponent = () => {
    const navigate = useNavigate();
    
    const handleSetup = async (config: AuthConfig) => {
      await handleSetupComplete(config);
      navigate('/calendar');
    };
    
    return <SetupForm onSetupComplete={handleSetup} />;
  };

  // Calendar component
  const CalendarComponent = () => {
    useEffect(() => {
      setCurrentView('calendar');
    }, []);
    
    return (
      <div className="view-container">
        {calendarLoading && <LoadingIndicator overlay text="Loading calendar data..." />}
        <CalendarView
          calendars={calendars}
          events={events}
          onDateRangeChange={handleDateRangeChange}
          onEventClick={handleEventClick}
          onCreateEvent={handleCreateEvent}
          loading={calendarLoading}
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

  // Contacts component
  const ContactsComponent = () => {
    useEffect(() => {
      setCurrentView('contacts');
    }, []);
    
    return (
      <div className="view-container">
        <div className="contacts-view">
          {contactsLoading && <LoadingIndicator overlay text="Loading contacts..." />}
          
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
                  value={selectedAddressBook?.url || ''}
                  onChange={(e) => {
                    const selected = addressBooks.find(ab => ab.url === e.target.value);
                    if (selected) handleAddressBookChange(selected);
                  }}
                >
                  {addressBooks.map(ab => (
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
                    davClient={davClient}
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

  if (loading) {
    return (
      <div className="app-loading">
        <LoadingIndicator size="large" text="Loading application..." />
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

  // Render sync status indicator
  const renderSyncStatus = () => {
    if (!isAuthenticated) return null;
    
    return (
      <div className="sync-status">
        <div className={`sync-icon ${syncStatus}`}></div>
        <span>
          {syncStatus === 'synced' && 'All changes saved'}
          {syncStatus === 'syncing' && 'Syncing...'}
          {syncStatus === 'pending' && `${pendingOperationCount} changes pending`}
          {syncStatus === 'error' && 'Sync error'}
        </span>
      </div>
    );
  };

  return (
    <Router>
      <div className="app">
        {isAuthenticated && (
          <Navigation 
            currentView={currentView}
            onViewChange={handleViewChange}
            username={currentConfig?.username}
            onLogout={handleLogout}
          />
        )}
        
        <main className="app-main">
          <Routes>
            <Route path="/setup" element={
              isAuthenticated ? <Navigate to="/calendar" replace /> : <SetupComponent />
            } />
            
            <Route path="/calendar" element={
              <ProtectedRoute isAuthenticated={isAuthenticated}>
                <CalendarComponent />
              </ProtectedRoute>
            } />
            
            <Route path="/contacts" element={
              <ProtectedRoute isAuthenticated={isAuthenticated}>
                <ContactsComponent />
              </ProtectedRoute>
            } />
            
            <Route path="/" element={
              isAuthenticated ? <Navigate to="/calendar" replace /> : <Navigate to="/setup" replace />
            } />
          </Routes>
        </main>
        
        {/* Error message container */}
        <div className="error-container">
          {errors.map(error => (
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
        {renderSyncStatus()}
      </div>
    </Router>
  );
}

export default App;