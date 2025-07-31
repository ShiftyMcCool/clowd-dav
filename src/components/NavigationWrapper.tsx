import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Navigation } from './Navigation';
import { Calendar, AddressBook } from '../types/dav';
import { SyncService } from '../services/SyncService';

interface NavigationWrapperProps {
  currentView: "calendar" | "contacts";
  username?: string;
  onLogout: () => void;
  syncService?: SyncService;
  onManualSync?: () => void;
  calendars: Calendar[];
  visibleCalendars: Set<string>;
  onCalendarToggle: (calendarUrl: string) => void;
  onCalendarColorChange: (calendarUrl: string, color: string) => void;
  onCreateCalendar: () => void;
  onEditCalendar: (calendar: Calendar) => void;
  addressBooks: AddressBook[];
  visibleAddressBooks: Set<string>;
  onAddressBookToggle: (addressBookUrl: string) => void;
  onAddressBookColorChange: (addressBookUrl: string, color: string) => void;
  onCreateAddressBook: () => void;
  onEditAddressBook: (addressBook: AddressBook) => void;
}

export const NavigationWrapper: React.FC<NavigationWrapperProps> = ({
  currentView,
  username,
  onLogout,
  syncService,
  onManualSync,
  calendars,
  visibleCalendars,
  onCalendarToggle,
  onCalendarColorChange,
  onCreateCalendar,
  onEditCalendar,
  addressBooks,
  visibleAddressBooks,
  onAddressBookToggle,
  onAddressBookColorChange,
  onCreateAddressBook,
  onEditAddressBook,
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
      onCalendarColorChange={onCalendarColorChange}
      onCreateCalendar={onCreateCalendar}
      onEditCalendar={onEditCalendar}
      addressBooks={addressBooks}
      visibleAddressBooks={visibleAddressBooks}
      onAddressBookToggle={onAddressBookToggle}
      onAddressBookColorChange={onAddressBookColorChange}
      onCreateAddressBook={onCreateAddressBook}
      onEditAddressBook={onEditAddressBook}
    />
  );
};