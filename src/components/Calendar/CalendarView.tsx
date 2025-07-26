import React, { useState, useEffect, useRef } from 'react';
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
  currentDate?: Date;
  onDateChange?: (date: Date) => void;
  viewType?: ViewType;
  onViewTypeChange?: (viewType: ViewType) => void;
}

export const CalendarView: React.FC<CalendarViewProps> = ({
  calendars,
  events,
  onDateRangeChange,
  onEventClick,
  onCreateEvent,
  loading = false,
  currentDate: propCurrentDate,
  onDateChange,
  viewType: propViewType = 'month',
  onViewTypeChange
}) => {
  const [currentDate, setCurrentDate] = useState(() => {
    console.log('CalendarView: useState initializer called, propCurrentDate:', propCurrentDate);
    return propCurrentDate || new Date();
  });
  const viewType = propViewType;
  const previousDateRangeRef = useRef<DateRange | null>(null);
  
  console.log('CalendarView render - currentDate:', currentDate, 'viewType:', viewType);
  console.log('CalendarView props - propViewType:', propViewType, 'onViewTypeChange:', !!onViewTypeChange);

  // Update internal state when prop changes
  useEffect(() => {
    if (propCurrentDate && propCurrentDate.getTime() !== currentDate.getTime()) {
      console.log('CalendarView: Updating currentDate from prop:', propCurrentDate);
      setCurrentDate(propCurrentDate);
    }
  }, [propCurrentDate, currentDate]);

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
    console.log('CalendarView: useEffect triggered - currentDate:', currentDate, 'viewType:', viewType);
    const dateRange = getDateRange(currentDate, viewType);
    console.log('CalendarView: Calculated date range:', dateRange);
    
    // Only call onDateRangeChange if the date range actually changed
    const previousDateRange = previousDateRangeRef.current;
    const hasChanged = !previousDateRange || 
        dateRange.start.getTime() !== previousDateRange.start.getTime() ||
        dateRange.end.getTime() !== previousDateRange.end.getTime();
    
    console.log('CalendarView: Date range hasChanged:', hasChanged, 'previous:', previousDateRange);
    
    if (hasChanged) {
      previousDateRangeRef.current = { 
        start: new Date(dateRange.start), 
        end: new Date(dateRange.end) 
      };
      console.log('CalendarView: Calling onDateRangeChange with:', dateRange);
      onDateRangeChange(dateRange);
    }
  }, [currentDate, onDateRangeChange, viewType]); // Removed onDateRangeChange from dependencies

  const handleNavigate = (direction: 'prev' | 'next' | 'today') => {
    console.log('CalendarView: Navigation clicked:', direction, 'from date:', currentDate);
    const newDate = new Date(currentDate);

    if (direction === 'today') {
      const today = new Date();
      console.log('CalendarView: Setting to today:', today);
      console.log('CalendarView: Current date before:', currentDate);
      console.log('CalendarView: Are dates different?', currentDate.toDateString() !== today.toDateString());
      setCurrentDate(today);
      
      // Notify parent of date change
      if (onDateChange) {
        onDateChange(today);
      }
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

    console.log('CalendarView: Setting new date:', newDate);
    setCurrentDate(newDate);
    
    // Notify parent of date change
    if (onDateChange) {
      onDateChange(newDate);
    }
  };

  const handleViewChange = (newView: ViewType) => {
    console.log('CalendarView: handleViewChange called with:', newView, 'current viewType:', viewType);
    if (onViewTypeChange) {
      onViewTypeChange(newView);
    }
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
            calendars={calendars}
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
            calendars={calendars}
            onEventClick={onEventClick}
            onCreateEvent={() => onCreateEvent?.(currentDate)}
          />
        )}
      </div>
    </div>
  );
};