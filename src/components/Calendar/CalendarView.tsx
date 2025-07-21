import React, { useState, useEffect } from 'react';
import { CalendarEvent, Calendar, DateRange } from '../../types/dav';
import { CalendarGrid } from './CalendarGrid';
import { CalendarNavigation } from './CalendarNavigation';
import { EventList } from './EventList';
import './CalendarView.css';

export type ViewType = 'month' | 'week' | 'day';

interface CalendarViewProps {
  calendars: Calendar[];
  events: CalendarEvent[];
  onDateRangeChange: (dateRange: DateRange) => void;
  onEventClick?: (event: CalendarEvent) => void;
  onCreateEvent?: (date: Date) => void;
  loading?: boolean;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  calendars,
  events,
  onDateRangeChange,
  onEventClick,
  onCreateEvent,
  loading = false
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewType, setViewType] = useState<ViewType>('month');

  // Calculate date range based on current date and view type
  const getDateRange = (date: Date, view: ViewType): DateRange => {
    const start = new Date(date);
    const end = new Date(date);

    switch (view) {
      case 'day':
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        break;
      case 'week':
        // Start of week (Sunday)
        const dayOfWeek = start.getDay();
        start.setDate(start.getDate() - dayOfWeek);
        start.setHours(0, 0, 0, 0);
        // End of week (Saturday)
        end.setDate(start.getDate() + 6);
        end.setHours(23, 59, 59, 999);
        break;
      case 'month':
        // Start of month
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
        // End of month
        end.setMonth(end.getMonth() + 1, 0);
        end.setHours(23, 59, 59, 999);
        break;
    }

    return { start, end };
  };

  // Update date range when current date or view type changes
  useEffect(() => {
    const dateRange = getDateRange(currentDate, viewType);
    onDateRangeChange(dateRange);
  }, [currentDate, viewType, onDateRangeChange]);

  const handleNavigate = (direction: 'prev' | 'next' | 'today') => {
    const newDate = new Date(currentDate);

    if (direction === 'today') {
      setCurrentDate(new Date());
      return;
    }

    const increment = direction === 'next' ? 1 : -1;

    switch (viewType) {
      case 'day':
        newDate.setDate(newDate.getDate() + increment);
        break;
      case 'week':
        newDate.setDate(newDate.getDate() + (increment * 7));
        break;
      case 'month':
        newDate.setMonth(newDate.getMonth() + increment);
        break;
    }

    setCurrentDate(newDate);
  };

  const handleViewChange = (newView: ViewType) => {
    setViewType(newView);
  };

  const handleDateClick = (date: Date) => {
    if (onCreateEvent) {
      onCreateEvent(date);
    }
  };

  if (loading) {
    return (
      <div className="calendar-view">
        <div className="calendar-loading">
          <div className="loading-spinner"></div>
          <p>Loading calendar...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="calendar-view">
      <CalendarNavigation
        currentDate={currentDate}
        viewType={viewType}
        onNavigate={handleNavigate}
        onViewChange={handleViewChange}
      />
      
      <div className="calendar-content">
        {viewType === 'month' || viewType === 'week' ? (
          <CalendarGrid
            currentDate={currentDate}
            viewType={viewType}
            events={events}
            onEventClick={onEventClick}
            onDateClick={handleDateClick}
          />
        ) : (
          <EventList
            date={currentDate}
            events={events.filter(event => {
              const eventDate = new Date(event.dtstart);
              return eventDate.toDateString() === currentDate.toDateString();
            })}
            onEventClick={onEventClick}
            onCreateEvent={() => onCreateEvent?.(currentDate)}
          />
        )}
      </div>

      {/* Floating Action Button for creating events (month/week view) */}
      {(viewType === 'month' || viewType === 'week') && onCreateEvent && (
        <button 
          className="fab-create-event"
          onClick={() => onCreateEvent(currentDate)}
          aria-label="Create new event"
          title="Create new event"
        >
          +
        </button>
      )}
    </div>
  );
};