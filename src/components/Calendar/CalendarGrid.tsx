import React from 'react';
import { CalendarEvent } from '../../types/dav';
import { ViewType } from './CalendarView';
import './CalendarGrid.css';

interface CalendarGridProps {
  currentDate: Date;
  viewType: ViewType;
  events: CalendarEvent[];
  onEventClick?: (event: CalendarEvent) => void;
  onDateClick?: (date: Date) => void;
}

export const CalendarGrid: React.FC<CalendarGridProps> = ({
  currentDate,
  viewType,
  events,
  onEventClick,
  onDateClick
}) => {
  const getDaysInView = (): Date[] => {
    const days: Date[] = [];
    
    if (viewType === 'month') {
      // Get first day of month
      const firstDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      // Get first Sunday of the calendar view (might be from previous month)
      const startDate = new Date(firstDay);
      startDate.setDate(startDate.getDate() - firstDay.getDay());
      
      // Generate 42 days (6 weeks) for month view
      for (let i = 0; i < 42; i++) {
        const day = new Date(startDate);
        day.setDate(startDate.getDate() + i);
        days.push(day);
      }
    } else if (viewType === 'week') {
      // Get Sunday of current week
      const startDate = new Date(currentDate);
      startDate.setDate(currentDate.getDate() - currentDate.getDay());
      
      // Generate 7 days for week view
      for (let i = 0; i < 7; i++) {
        const day = new Date(startDate);
        day.setDate(startDate.getDate() + i);
        days.push(day);
      }
    }
    
    return days;
  };

  const getEventsForDate = (date: Date): CalendarEvent[] => {
    return events.filter(event => {
      const eventStart = new Date(event.dtstart);
      const eventEnd = new Date(event.dtend);
      
      // Check if event occurs on this date
      const dateStart = new Date(date);
      dateStart.setHours(0, 0, 0, 0);
      const dateEnd = new Date(date);
      dateEnd.setHours(23, 59, 59, 999);
      
      return (eventStart <= dateEnd && eventEnd >= dateStart);
    });
  };

  const isToday = (date: Date): boolean => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isCurrentMonth = (date: Date): boolean => {
    return date.getMonth() === currentDate.getMonth();
  };

  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const handleDateClick = (date: Date) => {
    if (onDateClick) {
      onDateClick(date);
    }
  };

  const handleEventClick = (event: CalendarEvent, e: React.MouseEvent) => {
    e.stopPropagation();
    if (onEventClick) {
      onEventClick(event);
    }
  };

  const days = getDaysInView();
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  if (viewType === 'week') {
    return (
      <div className="calendar-grid week-view">
        <div className="week-header">
          {weekDays.map((day, index) => {
            const date = days[index];
            return (
              <div key={day} className="week-day-header">
                <div className="day-name">{day}</div>
                <div className={`day-number ${isToday(date) ? 'today' : ''}`}>
                  {date.getDate()}
                </div>
              </div>
            );
          })}
        </div>
        
        <div className="week-content">
          {days.map((date, index) => {
            const dayEvents = getEventsForDate(date);
            return (
              <div 
                key={index} 
                className={`week-day ${isToday(date) ? 'today' : ''}`}
                onClick={() => handleDateClick(date)}
              >
                <div className="day-events">
                  {dayEvents.map((event, eventIndex) => (
                    <div
                      key={`${event.uid}-${eventIndex}`}
                      className="event-item week-event"
                      onClick={(e) => handleEventClick(event, e)}
                      title={`${event.summary}\n${formatTime(new Date(event.dtstart))} - ${formatTime(new Date(event.dtend))}`}
                    >
                      <div className="event-time">
                        {formatTime(new Date(event.dtstart))}
                      </div>
                      <div className="event-title">{event.summary}</div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Month view
  return (
    <div className="calendar-grid month-view">
      <div className="month-header">
        {weekDays.map(day => (
          <div key={day} className="month-day-header">
            {day}
          </div>
        ))}
      </div>
      
      <div className="month-content">
        {days.map((date, index) => {
          const dayEvents = getEventsForDate(date);
          return (
            <div 
              key={index} 
              className={`month-day ${isToday(date) ? 'today' : ''} ${!isCurrentMonth(date) ? 'other-month' : ''}`}
              onClick={() => handleDateClick(date)}
            >
              <div className="day-number">
                {date.getDate()}
              </div>
              <div className="day-events">
                {dayEvents.slice(0, 3).map((event, eventIndex) => (
                  <div
                    key={`${event.uid}-${eventIndex}`}
                    className="event-item month-event"
                    onClick={(e) => handleEventClick(event, e)}
                    title={`${event.summary}\n${formatTime(new Date(event.dtstart))} - ${formatTime(new Date(event.dtend))}`}
                  >
                    <span className="event-title">{event.summary}</span>
                  </div>
                ))}
                {dayEvents.length > 3 && (
                  <div className="more-events">
                    +{dayEvents.length - 3} more
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