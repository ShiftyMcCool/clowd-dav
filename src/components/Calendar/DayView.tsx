import React, { useMemo } from 'react';
import { CalendarEvent, Calendar } from '../../types/dav';
import { getEventCalendarColor } from '../../utils/calendarColors';
import { MiniCalendar } from './MiniCalendar';
import { WeeklyAgenda } from './WeeklyAgenda';
import './DayView.css';

interface DayViewProps {
  date: Date;
  events: CalendarEvent[];
  calendars: Calendar[];
  onEventClick?: (event: CalendarEvent) => void;
  onCreateEvent?: (date: Date) => void;
  onDateChange?: (date: Date) => void;
}

export const DayView: React.FC<DayViewProps> = ({
  date,
  events,
  calendars,
  onEventClick,
  onCreateEvent,
  onDateChange
}) => {
  // Generate time slots for the day (24 hours)
  const timeSlots = useMemo(() => {
    const slots = [];
    for (let hour = 0; hour < 24; hour++) {
      slots.push({
        hour,
        time: new Date(2000, 0, 1, hour, 0).toLocaleTimeString('en-US', {
          hour: 'numeric',
          hour12: true
        })
      });
    }
    return slots;
  }, []);

  // Filter events for the current day
  const dayEvents = useMemo(() => {
    return events.filter(event => {
      const eventDate = new Date(event.dtstart);
      return eventDate.toDateString() === date.toDateString();
    }).sort((a, b) => {
      return new Date(a.dtstart).getTime() - new Date(b.dtstart).getTime();
    });
  }, [events, date]);

  // Get events for a specific hour
  const getEventsForHour = (hour: number) => {
    return dayEvents.filter(event => {
      const eventStart = new Date(event.dtstart);
      const eventEnd = new Date(event.dtend);
      const slotStart = new Date(date);
      slotStart.setHours(hour, 0, 0, 0);
      const slotEnd = new Date(date);
      slotEnd.setHours(hour + 1, 0, 0, 0);
      
      return eventStart < slotEnd && eventEnd > slotStart;
    });
  };

  const handleTimeSlotClick = (hour: number) => {
    if (onCreateEvent) {
      const clickDate = new Date(date);
      clickDate.setHours(hour, 0, 0, 0);
      onCreateEvent(clickDate);
    }
  };

  const handleEventClick = (event: CalendarEvent) => {
    if (onEventClick) {
      onEventClick(event);
    }
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

  return (
    <div className="day-view">
      <div className="day-view-header">
        <h2 className="day-view-title">
          {date.toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}
        </h2>
      </div>

      <div className="day-view-content">
        <div className="day-schedule">
          {/* All-day events section */}
          {dayEvents.some(isAllDay) && (
            <div className="all-day-section">
              <div className="all-day-label">All Day</div>
              <div className="all-day-events">
                {dayEvents.filter(isAllDay).map((event, index) => {
                  const eventColor = getEventCalendarColor(event.calendarUrl, calendars);
                  return (
                    <div
                      key={`${event.uid}-${index}`}
                      className="all-day-event"
                      style={{ 
                        backgroundColor: eventColor,
                        borderLeft: `4px solid ${eventColor}`
                      }}
                      onClick={() => handleEventClick(event)}
                    >
                      <span className="event-title">{event.summary}</span>
                      {event.location && (
                        <span className="event-location">📍 {event.location}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Time slots */}
          <div className="time-slots">
            {timeSlots.map(({ hour, time }) => {
              const hourEvents = getEventsForHour(hour).filter(event => !isAllDay(event));
              return (
                <div key={hour} className="time-slot">
                  <div className="time-label">{time}</div>
                  <div 
                    className="time-content"
                    onClick={() => handleTimeSlotClick(hour)}
                  >
                    {hourEvents.map((event, index) => {
                      const eventColor = getEventCalendarColor(event.calendarUrl, calendars);
                      return (
                        <div
                          key={`${event.uid}-${index}`}
                          className="time-event"
                          style={{ 
                            backgroundColor: eventColor,
                            borderLeft: `4px solid ${eventColor}`
                          }}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEventClick(event);
                          }}
                        >
                          <div className="event-time">
                            {formatDuration(new Date(event.dtstart), new Date(event.dtend))}
                          </div>
                          <div className="event-title">{event.summary}</div>
                          {event.location && (
                            <div className="event-location">📍 {event.location}</div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="day-sidebar">
          <MiniCalendar
            currentDate={date}
            onDateChange={onDateChange}
            events={events}
            calendars={calendars}
          />
          
          <WeeklyAgenda
            currentDate={date}
            events={events}
            calendars={calendars}
            onEventClick={onEventClick}
            onDateChange={onDateChange}
          />
        </div>
      </div>
    </div>
  );
};