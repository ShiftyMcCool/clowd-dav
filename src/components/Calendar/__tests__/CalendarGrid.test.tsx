import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { CalendarGrid } from '../CalendarGrid';
import { CalendarEvent } from '../../../types/dav';

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

const mockOnEventClick = jest.fn();
const mockOnDateClick = jest.fn();

describe('CalendarGrid', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render month view', () => {
    render(
      <CalendarGrid
        currentDate={new Date('2024-01-15')}
        viewType="month"
        events={mockEvents}
        onEventClick={mockOnEventClick}
        onDateClick={mockOnDateClick}
      />
    );

    // Should show weekday headers
    expect(screen.getByText('Sun')).toBeInTheDocument();
    expect(screen.getByText('Mon')).toBeInTheDocument();
    expect(screen.getByText('Tue')).toBeInTheDocument();
    expect(screen.getByText('Wed')).toBeInTheDocument();
    expect(screen.getByText('Thu')).toBeInTheDocument();
    expect(screen.getByText('Fri')).toBeInTheDocument();
    expect(screen.getByText('Sat')).toBeInTheDocument();
  });

  it('should render week view', () => {
    render(
      <CalendarGrid
        currentDate={new Date('2024-01-15')}
        viewType="week"
        events={mockEvents}
        onEventClick={mockOnEventClick}
        onDateClick={mockOnDateClick}
      />
    );

    // Should show weekday headers with dates
    expect(screen.getByText('Sun')).toBeInTheDocument();
    expect(screen.getByText('15')).toBeInTheDocument(); // 15th is a Monday in 2024
  });

  it('should display events in month view', () => {
    render(
      <CalendarGrid
        currentDate={new Date('2024-01-15')}
        viewType="month"
        events={mockEvents}
        onEventClick={mockOnEventClick}
        onDateClick={mockOnDateClick}
      />
    );

    expect(screen.getByText('Test Event')).toBeInTheDocument();
  });

  it('should call onEventClick when event is clicked', () => {
    render(
      <CalendarGrid
        currentDate={new Date('2024-01-15')}
        viewType="month"
        events={mockEvents}
        onEventClick={mockOnEventClick}
        onDateClick={mockOnDateClick}
      />
    );

    const eventElement = screen.getByText('Test Event');
    fireEvent.click(eventElement);

    expect(mockOnEventClick).toHaveBeenCalledWith(mockEvents[0]);
  });

  it('should call onDateClick when date is clicked', () => {
    render(
      <CalendarGrid
        currentDate={new Date('2024-01-15')}
        viewType="month"
        events={[]}
        onEventClick={mockOnEventClick}
        onDateClick={mockOnDateClick}
      />
    );

    // Click on a date cell (find by day number)
    const dateCell = screen.getByText('15').closest('.month-day');
    if (dateCell) {
      fireEvent.click(dateCell);
      expect(mockOnDateClick).toHaveBeenCalled();
    }
  });

  it('should show more events indicator when there are many events', () => {
    const manyEvents: CalendarEvent[] = Array.from({ length: 5 }, (_, i) => ({
      uid: `event${i}`,
      summary: `Event ${i}`,
      dtstart: new Date('2024-01-15T10:00:00Z'),
      dtend: new Date('2024-01-15T11:00:00Z')
    }));

    render(
      <CalendarGrid
        currentDate={new Date('2024-01-15')}
        viewType="month"
        events={manyEvents}
        onEventClick={mockOnEventClick}
        onDateClick={mockOnDateClick}
      />
    );

    expect(screen.getByText('+2 more')).toBeInTheDocument();
  });
});