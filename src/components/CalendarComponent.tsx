import React, { Suspense, lazy, useMemo } from 'react';
import { Calendar, CalendarEvent, DateRange } from '../types/dav';

const CalendarView = lazy(() =>
  import('./Calendar/CalendarView').then((module) => ({
    default: module.CalendarView,
  }))
);
const EventForm = lazy(() =>
  import('./Calendar/EventForm').then((module) => ({
    default: module.EventForm,
  }))
);
const NewCalendarForm = lazy(() =>
  import('./Calendar/NewCalendarForm').then((module) => ({
    default: module.NewCalendarForm,
  }))
);
const EditCalendarForm = lazy(() =>
  import('./Calendar/EditCalendarForm').then((module) => ({
    default: module.EditCalendarForm,
  }))
);

interface CalendarComponentProps {
  calendars: Calendar[];
  events: CalendarEvent[];
  visibleCalendars: Set<string>;
  calendarCurrentDate: Date;
  calendarViewType: 'month' | 'week' | 'day';
  showEventForm: boolean;
  editingEvent: CalendarEvent | null;
  selectedCalendar: Calendar | null;
  initialDate?: Date;
  showNewCalendarForm: boolean;
  editingCalendar: Calendar | null;
  onDateRangeChange: (dateRange: DateRange) => void;
  onEventClick: (event: CalendarEvent) => void;
  onCreateEvent: (date: Date) => void;
  onDateChange: (date: Date) => void;
  onViewTypeChange: (viewType: 'month' | 'week' | 'day') => void;
  onEventSave: (eventData: CalendarEvent, calendar: Calendar) => Promise<void>;
  onEventFormCancel: () => void;
  onEventDelete: (event: CalendarEvent, calendar: Calendar) => Promise<void>;
  onNewCalendarSave: (displayName: string, color: string, description?: string) => Promise<void>;
  onNewCalendarCancel: () => void;
  onEditCalendarSave: (calendar: Calendar, displayName: string, color: string, description?: string) => Promise<void>;
  onEditCalendarDelete: (calendar: Calendar) => Promise<void>;
  onEditCalendarCancel: () => void;
}

export const CalendarComponent: React.FC<CalendarComponentProps> = ({
  calendars,
  events,
  visibleCalendars,
  calendarCurrentDate,
  calendarViewType,
  showEventForm,
  editingEvent,
  selectedCalendar,
  initialDate,
  showNewCalendarForm,
  editingCalendar,
  onDateRangeChange,
  onEventClick,
  onCreateEvent,
  onDateChange,
  onViewTypeChange,
  onEventSave,
  onEventFormCancel,
  onEventDelete,
  onNewCalendarSave,
  onNewCalendarCancel,
  onEditCalendarSave,
  onEditCalendarDelete,
  onEditCalendarCancel,
}) => {
  const filteredEvents = useMemo(() => 
    events.filter((event) =>
      event.calendarUrl
        ? visibleCalendars.has(event.calendarUrl)
        : true
    ), [events, visibleCalendars]
  );

  return (
    <Suspense fallback={<div />}>
      <div className="view-container">
        <CalendarView
          calendars={calendars}
          events={filteredEvents}
          onDateRangeChange={onDateRangeChange}
          onEventClick={onEventClick}
          onCreateEvent={onCreateEvent}
          loading={false}
          currentDate={calendarCurrentDate}
          onDateChange={onDateChange}
          viewType={calendarViewType}
          onViewTypeChange={onViewTypeChange}
        />

        {/* Event Form Modal */}
        {showEventForm && (
          <Suspense fallback={<div />}>
            <EventForm
              event={editingEvent || undefined}
              calendars={calendars}
              selectedCalendar={selectedCalendar || undefined}
              onSave={onEventSave}
              onCancel={onEventFormCancel}
              onDelete={onEventDelete}
              isEditing={!!editingEvent}
              initialDate={initialDate}
            />
          </Suspense>
        )}

        {/* New Calendar Form Modal */}
        {showNewCalendarForm && (
          <Suspense fallback={<div />}>
            <NewCalendarForm
              onSave={onNewCalendarSave}
              onCancel={onNewCalendarCancel}
            />
          </Suspense>
        )}

        {/* Edit Calendar Form Modal */}
        {editingCalendar && (
          <Suspense fallback={<div />}>
            <EditCalendarForm
              calendar={editingCalendar}
              onSave={onEditCalendarSave}
              onDelete={onEditCalendarDelete}
              onCancel={onEditCalendarCancel}
            />
          </Suspense>
        )}
      </div>
    </Suspense>
  );
};