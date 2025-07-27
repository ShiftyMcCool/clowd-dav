import React, { useMemo } from 'react';
import { CalendarEvent, Calendar } from '../../types/dav';
import { getEventCalendarColor } from '../../utils/calendarColors';
import './WeeklyAgenda.css';

interface WeeklyAgendaProps {
  currentDate: Date;
  events: CalendarEvent[];
  calendars: Calendar[];
  onEventClick?: (event: CalendarEvent) => void;
  onDateChange?: (date: Date) => void;
}

export const WeeklyAgenda: React.FC<WeeklyAgendaProps> = ({
  currentDate,
  events,
  calendars,
  onEventClick,
  onDateChange
}) => {
  const weekDays = useMemo(() => {
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
    
    const days = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      days.push(day);
    }
    
    return days;
  }, [currentDate]);

  const getEventsForDate = (date: Date): CalendarEvent[] => {
    return events.filter(event => {
      const eventStart = new Date(event.dtstart);
      const eventEnd = new Date(event.dtend);
      
      const dateStart = new Date(date);
      dateStart.setHours(0, 0, 0, 0);
      const dateEnd = new Date(date);
      dateEnd.setHours(23, 59, 59, 999);
      
      return (eventStart <= dateEnd && eventEnd >= dateStart);
    }).sort((a, b) => {
      return new Date(a.dtstart).getTime() - new Date(b.dtstart).getTime();
    });
  };

  const isToday = (date: Date): boolean => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isSelectedDate = (date: Date): boolean => {
    return date.toDateString() === currentDate.toDateString();
  };

  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const formatDuration = (start: Date, end: Date): string => {
    const startTime = formatTime(start);
    const endTime = formatTime(end);
    return `${startTime} - ${endTime}`;
  };

  const isAllDay = (event: CalendarEvent): boolean => {
    const start = new Date(event.dtstart);
    const end = new Date(event.dtend);
    
    return start.getHours() === 0 && 
           start.getMinutes() === 0 && 
           start.getSeconds() === 0 &&
           (end.getTime() - start.getTime()) % (24 * 60 * 60 * 1000) === 0;
  };

  const handleDateClick = (date: Date) => {
    if (onDateChange) {
      onDateChange(date);
    }
  };

  const handleEventClick = (event: CalendarEvent) => {
    if (onEventClick) {
      onEventClick(event);
    }
  };

  return (
    <div className="weekly-agenda">
      <div className="weekly-agenda-header">
        <h3 className="weekly-agenda-title">This Week</h3>
      </div>
      
      <div className="weekly-agenda-content">
        {weekDays.map((date, index) => {
          const dayEvents = getEventsForDate(date);
          const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
          const dayNumber = date.getDate();
          
          return (
            <div key={index} className="agenda-day">
              <div 
                className={`agenda-day-header ${isToday(date) ? 'today' : ''} ${isSelectedDate(date) ? 'selected' : ''}`}
                onClick={() => handleDateClick(date)}
              >
                <span className="agenda-day-name">{dayName}</span>
                <span className="agenda-day-number">{dayNumber}</span>
              </div>
              
              <div className="agenda-day-events">
                {dayEvents.length === 0 ? (
                  <div className="no-events-day">No events</div>
                ) : (
                  dayEvents.slice(0, 3).map((event, eventIndex) => {
                    const eventColor = getEventCalendarColor(event.calendarUrl, calendars);
                    return (
                      <div
                        key={`${event.uid}-${eventIndex}`}
                        className="agenda-event"
                        onClick={() => handleEventClick(event)}
                      >
                        <div 
                          className="agenda-event-indicator"
                          style={{ backgroundColor: eventColor }}
                        />
                        <div className="agenda-event-details">
                          <div className="agenda-event-title">{event.summary}</div>
                          <div className="agenda-event-time">
                            {isAllDay(event) ? (
                              <span className="all-day-badge">All Day</span>
                            ) : (
                              formatDuration(new Date(event.dtstart), new Date(event.dtend))
                            )}
                          </div>
                          {event.location && (
                            <div className="agenda-event-location">
                              📍 {event.location}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
                {dayEvents.length > 3 && (
                  <div className="agenda-more-events">
                    +{dayEvents.length - 3} more events
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};