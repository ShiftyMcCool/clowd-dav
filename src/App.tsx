import React, { useState, useEffect } from 'react';
import { SetupForm } from './components/SetupForm';
import { CalendarView } from './components/Calendar/CalendarView';
import { AuthConfig } from './types/auth';
import { AuthManager } from './services/AuthManager';
import { DAVClient } from './services/DAVClient';
import { ProviderFactory } from './providers/ProviderFactory';
import { Calendar, CalendarEvent, DateRange } from './types/dav';
import './App.css';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentConfig, setCurrentConfig] = useState<AuthConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [calendars, setCalendars] = useState<Calendar[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [currentView, setCurrentView] = useState<'calendar' | 'contacts'>('calendar');

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
        
        // Load calendars
        await loadCalendars();
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
    loadEvents(dateRange);
  };

  const handleEventClick = (event: CalendarEvent) => {
    // TODO: Implement event editing in future tasks
    console.log('Event clicked:', event);
    alert(`Event: ${event.summary}\nTime: ${event.dtstart.toLocaleString()} - ${event.dtend.toLocaleString()}`);
  };

  const handleCreateEvent = (date: Date) => {
    // TODO: Implement event creation in future tasks
    console.log('Create event for date:', date);
    alert(`Create event functionality will be implemented in future tasks.\nSelected date: ${date.toLocaleDateString()}`);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setCurrentConfig(null);
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
          <div className="contacts-placeholder">
            <h2>Contacts</h2>
            <p>Contact management will be implemented in future tasks.</p>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
