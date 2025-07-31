import { useState, useCallback, useRef } from 'react';
import { Calendar, CalendarEvent, DateRange, AddressBook } from '../types/dav';
import { AuthConfig } from '../types/auth';
import { ErrorMessage as ErrorMessageType } from '../services/ErrorHandlingService';

export interface AppState {
  // Authentication
  isAuthenticated: boolean;
  currentConfig: AuthConfig | null;
  initialLoading: boolean;
  
  // Calendar state
  calendars: Calendar[];
  events: CalendarEvent[];
  visibleCalendars: Set<string>;
  currentDateRange: DateRange | null;
  calendarCurrentDate: Date;
  calendarViewType: 'month' | 'week' | 'day';
  
  // Event form state
  showEventForm: boolean;
  editingEvent: CalendarEvent | null;
  selectedCalendar: Calendar | null;
  initialDate?: Date;
  
  // Calendar management state
  showNewCalendarForm: boolean;
  editingCalendar: Calendar | null;
  
  // Address book state
  addressBooks: AddressBook[];
  visibleAddressBooks: Set<string>;
  showNewAddressBookForm: boolean;
  editingAddressBook: AddressBook | null;
  
  // UI state
  currentView: 'calendar' | 'contacts';
  errors: ErrorMessageType[];
  contactRefreshTrigger: number;
}

export const useAppState = () => {
  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentConfig, setCurrentConfig] = useState<AuthConfig | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  
  // Calendar state
  const [calendars, setCalendars] = useState<Calendar[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [visibleCalendars, setVisibleCalendars] = useState<Set<string>>(new Set());
  const [currentDateRange, setCurrentDateRange] = useState<DateRange | null>(null);
  const [calendarCurrentDate, setCalendarCurrentDate] = useState<Date>(new Date());
  const [calendarViewType, setCalendarViewType] = useState<'month' | 'week' | 'day'>('month');
  
  // Event form state
  const [showEventForm, setShowEventForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [selectedCalendar, setSelectedCalendar] = useState<Calendar | null>(null);
  const [initialDate, setInitialDate] = useState<Date | undefined>(undefined);
  
  // Calendar management state
  const [showNewCalendarForm, setShowNewCalendarForm] = useState(false);
  const [editingCalendar, setEditingCalendar] = useState<Calendar | null>(null);
  
  // Address book state
  const [addressBooks, setAddressBooks] = useState<AddressBook[]>([]);
  const [visibleAddressBooks, setVisibleAddressBooks] = useState<Set<string>>(new Set());
  const [showNewAddressBookForm, setShowNewAddressBookForm] = useState(false);
  const [editingAddressBook, setEditingAddressBook] = useState<AddressBook | null>(null);
  
  // UI state
  const [currentView, setCurrentView] = useState<'calendar' | 'contacts'>('calendar');
  const [errors, setErrors] = useState<ErrorMessageType[]>([]);
  const [contactRefreshTrigger] = useState(0);
  
  // Refs for optimization
  const lastDateRangeRef = useRef<DateRange | null>(null);
  const pendingDateRangeRef = useRef<DateRange | null>(null);
  const hasCheckedStoredCredentials = useRef(false);

  const resetState = useCallback(() => {
    setIsAuthenticated(false);
    setCurrentConfig(null);
    setCalendars([]);
    setEvents([]);
    setAddressBooks([]);
    setVisibleAddressBooks(new Set());
    setVisibleCalendars(new Set());
    setShowEventForm(false);
    setEditingEvent(null);
    setSelectedCalendar(null);
    setInitialDate(undefined);
    setShowNewCalendarForm(false);
    setEditingCalendar(null);
    setShowNewAddressBookForm(false);
    setEditingAddressBook(null);
  }, []);

  return {
    // State
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
    
    // Refs
    lastDateRangeRef,
    pendingDateRangeRef,
    hasCheckedStoredCredentials,
    
    // Setters
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
    
    // Actions
    resetState,
  };
};