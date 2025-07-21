import React, { useState, useEffect } from 'react';
import { SetupForm } from './components/SetupForm';
import { CalendarView } from './components/Calendar/CalendarView';
import { EventForm } from './components/Calendar/EventForm';
import { ContactList, ContactDetail, ContactForm } from './components/Contact';
import { AuthConfig } from './types/auth';
import { AuthManager } from './services/AuthManager';
import { DAVClient } from './services/DAVClient';
import { ProviderFactory } from './providers/ProviderFactory';
import { Calendar, CalendarEvent, DateRange, AddressBook, Contact } from './types/dav';
import './App.css';

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

  const authManager = AuthManager.getInstance();
  const davClient = new DAVClient();

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
        setLoading(false);
      }
    };

    checkStoredCredentials();
  }, [authManager]);

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
      const discoveredCalendars = await davClient.discoverCalendars();
      setCalendars(discoveredCalendars);
    } catch (error) {
      console.error('Error loading calendars:', error);
    } finally {
      setCalendarLoading(false);
    }
  };

  const loadEvents = async (dateRange: DateRange) => {
    if (calendars.length === 0) return;
    
    try {
      setCalendarLoading(true);
      const allEvents: CalendarEvent[] = [];
      
      // Load events from all calendars
      for (const calendar of calendars) {
        try {
          const calendarEvents = await davClient.getEvents(calendar, dateRange);
          allEvents.push(...calendarEvents);
        } catch (error) {
          console.error(`Error loading events from calendar ${calendar.displayName}:`, error);
        }
      }
      
      setEvents(allEvents);
    } catch (error) {
      console.error('Error loading events:', error);
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
      const discoveredAddressBooks = await davClient.discoverAddressBooks();
      setAddressBooks(discoveredAddressBooks);
      
      // Select the first address book by default if available
      if (discoveredAddressBooks.length > 0 && !selectedAddressBook) {
        setSelectedAddressBook(discoveredAddressBooks[0]);
      }
    } catch (error) {
      console.error('Error loading address books:', error);
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

  if (loading) {
    return (
      <div className="App">
        <div className="loading">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="App">
        <SetupForm onSetupComplete={handleSetupComplete} />
      </div>
    );
  }

  return (
    <div className="App">
      <header className="App-header">
        <h1>CalDAV/CardDAV Client</h1>
        <nav className="main-nav">
          <button 
            className={`nav-tab ${currentView === 'calendar' ? 'active' : ''}`}
            onClick={() => setCurrentView('calendar')}
          >
            Calendar
          </button>
          <button 
            className={`nav-tab ${currentView === 'contacts' ? 'active' : ''}`}
            onClick={() => setCurrentView('contacts')}
          >
            Contacts
          </button>
        </nav>
        <div className="user-info">
          Connected as: {currentConfig?.username}
          <button onClick={handleLogout} className="logout-btn">
            Logout
          </button>
        </div>
      </header>
      <main className="App-main">
        {currentView === 'calendar' ? (
          <CalendarView
            calendars={calendars}
            events={events}
            onDateRangeChange={handleDateRangeChange}
            onEventClick={handleEventClick}
            onCreateEvent={handleCreateEvent}
            loading={calendarLoading}
          />
        ) : (
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
        )}

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
      </main>
    </div>
  );
}

export default App;
