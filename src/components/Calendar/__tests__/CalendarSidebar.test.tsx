import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { CalendarSidebar } from '../CalendarSidebar';
import { Calendar } from '../../../types/dav';

const mockCalendars: Calendar[] = [
  {
    url: 'https://example.com/calendar1',
    displayName: 'Personal Calendar',
    color: '#3b82f6'
  },
  {
    url: 'https://example.com/calendar2',
    displayName: 'Work Calendar',
    color: '#10b981'
  },
  {
    url: 'https://example.com/calendar3',
    displayName: 'Family Calendar',
    color: '#f59e0b'
  }
];

describe('CalendarSidebar Component', () => {
  const mockOnCalendarToggle = jest.fn();
  const mockOnToggle = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders calendar list when open', () => {
    const visibleCalendars = new Set(['https://example.com/calendar1', 'https://example.com/calendar2']);
    
    render(
      <CalendarSidebar
        calendars={mockCalendars}
        visibleCalendars={visibleCalendars}
        onCalendarToggle={mockOnCalendarToggle}
        isOpen={true}
        onToggle={mockOnToggle}
      />
    );

    expect(screen.getByText('Calendars')).toBeInTheDocument();
    expect(screen.getByText('Personal Calendar')).toBeInTheDocument();
    expect(screen.getByText('Work Calendar')).toBeInTheDocument();
    expect(screen.getByText('Family Calendar')).toBeInTheDocument();
  });

  it('shows collapsed state when closed', () => {
    const visibleCalendars = new Set(['https://example.com/calendar1']);
    
    render(
      <CalendarSidebar
        calendars={mockCalendars}
        visibleCalendars={visibleCalendars}
        onCalendarToggle={mockOnCalendarToggle}
        isOpen={false}
        onToggle={mockOnToggle}
      />
    );

    expect(screen.queryByText('Calendars')).not.toBeInTheDocument();
    expect(screen.queryByText('Personal Calendar')).not.toBeInTheDocument();
  });

  it('calls onCalendarToggle when calendar checkbox is clicked', () => {
    const visibleCalendars = new Set(['https://example.com/calendar1']);
    
    render(
      <CalendarSidebar
        calendars={mockCalendars}
        visibleCalendars={visibleCalendars}
        onCalendarToggle={mockOnCalendarToggle}
        isOpen={true}
        onToggle={mockOnToggle}
      />
    );

    const workCalendarCheckbox = screen.getByRole('checkbox', { name: /work calendar/i });
    fireEvent.click(workCalendarCheckbox);

    expect(mockOnCalendarToggle).toHaveBeenCalledWith('https://example.com/calendar2');
  });

  it('calls onToggle when sidebar toggle button is clicked', () => {
    const visibleCalendars = new Set();
    
    render(
      <CalendarSidebar
        calendars={mockCalendars}
        visibleCalendars={visibleCalendars}
        onCalendarToggle={mockOnCalendarToggle}
        isOpen={true}
        onToggle={mockOnToggle}
      />
    );

    const toggleButton = screen.getByRole('button', { name: /toggle calendar sidebar/i });
    fireEvent.click(toggleButton);

    expect(mockOnToggle).toHaveBeenCalled();
  });

  it('shows correct checkbox states based on visible calendars', () => {
    const visibleCalendars = new Set(['https://example.com/calendar1', 'https://example.com/calendar3']);
    
    render(
      <CalendarSidebar
        calendars={mockCalendars}
        visibleCalendars={visibleCalendars}
        onCalendarToggle={mockOnCalendarToggle}
        isOpen={true}
        onToggle={mockOnToggle}
      />
    );

    const personalCheckbox = screen.getByRole('checkbox', { name: /personal calendar/i });
    const workCheckbox = screen.getByRole('checkbox', { name: /work calendar/i });
    const familyCheckbox = screen.getByRole('checkbox', { name: /family calendar/i });

    expect(personalCheckbox).toBeChecked();
    expect(workCheckbox).not.toBeChecked();
    expect(familyCheckbox).toBeChecked();
  });

  it('shows toggle all button when multiple calendars exist', () => {
    const visibleCalendars = new Set(['https://example.com/calendar1']);
    
    render(
      <CalendarSidebar
        calendars={mockCalendars}
        visibleCalendars={visibleCalendars}
        onCalendarToggle={mockOnCalendarToggle}
        isOpen={true}
        onToggle={mockOnToggle}
      />
    );

    expect(screen.getByText('Show All')).toBeInTheDocument();
  });

  it('does not show toggle all button when only one calendar exists', () => {
    const singleCalendar = [mockCalendars[0]];
    const visibleCalendars = new Set(['https://example.com/calendar1']);
    
    render(
      <CalendarSidebar
        calendars={singleCalendar}
        visibleCalendars={visibleCalendars}
        onCalendarToggle={mockOnCalendarToggle}
        isOpen={true}
        onToggle={mockOnToggle}
      />
    );

    expect(screen.queryByText('Show All')).not.toBeInTheDocument();
    expect(screen.queryByText('Hide All')).not.toBeInTheDocument();
  });

  it('shows empty state when no calendars are available', () => {
    const visibleCalendars = new Set();
    
    render(
      <CalendarSidebar
        calendars={[]}
        visibleCalendars={visibleCalendars}
        onCalendarToggle={mockOnCalendarToggle}
        isOpen={true}
        onToggle={mockOnToggle}
      />
    );

    expect(screen.getByText('No calendars available')).toBeInTheDocument();
  });
});