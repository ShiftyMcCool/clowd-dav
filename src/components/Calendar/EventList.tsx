import React from 'react';
import { CalendarEvent } from '../../types/dav';
import './EventList.css';

interface EventListProps {
  date: Date;
  events: CalendarEvent[];
  onEventClick?: (event: CalendarEvent) => void;
  onCreateEvent?: () => void;
}

export const EventList: React.FC<EventListProps> = ({
  date,
  events,
  onEventClick,
  onCreateEvent
}) => {
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
    
    // Check if event starts at midnight and duration is in full days
    return start.getHours() === 0 && 
           start.getMinutes() === 0 && 
           start.getSeconds() === 0 &&
           (end.getTime() - start.getTime()) % (24 * 60 * 60 * 1000) === 0;
  };

  const sortedEvents = [...events].sort((a, b) => {
    const aStart = new Date(a.dtstart);
    const bStart = new Date(b.dtstart);
    return aStart.getTime() - bStart.getTime();
  });

  const handleEventClick = (event: CalendarEvent) => {
    if (onEventClick) {
      onEventClick(event);
    }
  };

  return (
    <div className="event-list">
      <div className="event-list-header">
        <h3 className="event-list-title">
          {date.toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}
        </h3>
        {onCreateEvent && (
          <button 
            className="create-event-button"
            onClick={onCreateEvent}
            aria-label="Create new event"
          >
            + New Event
          </button>
        )}
      </div>

      <div className="events-container">
        {sortedEvents.length === 0 ? (
          <div className="no-events">
            <p>No events scheduled for this day.</p>
            {onCreateEvent && (
              <button 
                className="create-first-event-button"
                onClick={onCreateEvent}
              >
                Create your first event
              </button>
            )}
          </div>
        ) : (
          <div className="events-list">
            {sortedEvents.map((event, index) => (
              <div
                key={`${event.uid}-${index}`}
                className="event-list-item"
                onClick={() => handleEventClick(event)}
              >
                <div className="event-time-column">
                  {isAllDay(event) ? (
                    <span className="all-day-badge">All Day</span>
                  ) : (
                    <span className="event-time">
                      {formatDuration(new Date(event.dtstart), new Date(event.dtend))}
                    </span>
                  )}
                </div>
                
                <div className="event-details-column">
                  <h4 className="event-summary">{event.summary}</h4>
                  {event.location && (
                    <p className="event-location">
                      📍 {event.location}
                    </p>
                  )}
                  {event.description && (
                    <p className="event-description">
                      {event.description.length > 100 
                        ? `${event.description.substring(0, 100)}...` 
                        : event.description
                      }
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};