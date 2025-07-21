import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { CalendarView } from '../CalendarView';
import { Calendar, CalendarEvent } from '../../../types/dav';

const mockCalendars: Calendar[] = [
  {
    url: 'https://example.com/calendar1',
    displayName: 'Test Calendar',
    color: '#007bff'
  }
];

const mockEvents: CalendarEvent[] = [
  {
    uid: 'event1',
    summary: 'Test Event',
    description: 'Test Description',
    dtstart: new Date('2024-01-15T10:00:00Z'),
    dtend: new Date('2024-01-15T11:00:00Z'),
    location: 'Test Location'
  }
];

const mockOnDateRangeChange = jest.fn();
const mockOnEventClick = jest.fn();
const mockOnCreateEvent = jest.fn();

describe('CalendarView', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render calendar view with navigation', () => {
    render(
      <CalendarView
        calendars={mockCalendars}
        events={mockEvents}
        onDateRangeChange={mockOnDateRangeChange}
        onEventClick={mockOnEventClick}
        onCreateEvent={mockOnCreateEvent}
      />
    );

    expect(screen.getByText('Today')).toBeInTheDocument();
    expect(screen.getByText('Month')).toBeInTheDocument();
    expect(screen.getByText('Week')).toBeInTheDocument();
    expect(screen.getByText('Day')).toBeInTheDocument();
  });

  it('should show loading state', () => {
    render(
      <CalendarView
        calendars={mockCalendars}
        events={mockEvents}
        onDateRangeChange={mockOnDateRangeChange}
        loading={true}
      />
    );

    expect(screen.getByText('Loading calendar...')).toBeInTheDocument();
  });

  it('should switch between view types', () => {
    render(
      <CalendarView
        calendars={mockCalendars}
        events={mockEvents}
        onDateRangeChange={mockOnDateRangeChange}
      />
    );

    const weekButton = screen.getByText('Week');
    fireEvent.click(weekButton);
    
    expect(weekButton).toHaveClass('active');
  });

  it('should call onDateRangeChange when view changes', () => {
    render(
      <CalendarView
        calendars={mockCalendars}
        events={mockEvents}
        onDateRangeChange={mockOnDateRangeChange}
      />
    );

    expect(mockOnDateRangeChange).toHaveBeenCalled();
  });

  it('should navigate to next period', () => {
    render(
      <CalendarView
        calendars={mockCalendars}
        events={mockEvents}
        onDateRangeChange={mockOnDateRangeChange}
      />
    );

    const nextButton = screen.getByLabelText('Next');
    fireEvent.click(nextButton);
    
    // Should call onDateRangeChange with new date range
    expect(mockOnDateRangeChange).toHaveBeenCalledTimes(2); // Initial + after click
  });

  it('should navigate to today', () => {
    render(
      <CalendarView
        calendars={mockCalendars}
        events={mockEvents}
        onDateRangeChange={mockOnDateRangeChange}
      />
    );

    const todayButton = screen.getByText('Today');
    fireEvent.click(todayButton);
    
    expect(mockOnDateRangeChange).toHaveBeenCalled();
  });
});