import React, { useMemo } from 'react';
import { CalendarEvent, Calendar } from '../../types/dav';
import { getEventCalendarColor } from '../../utils/calendarColors';
import './MiniCalendar.css';

interface MiniCalendarProps {
  currentDate: Date;
  onDateChange?: (date: Date) => void;
  events: CalendarEvent[];
  calendars: Calendar[];
}

export const MiniCalendar: React.FC<MiniCalendarProps> = ({
  currentDate,
  onDateChange,
  events,
  calendars
}) => {
  const { days, monthName, year } = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const monthName = currentDate.toLocaleDateString('en-US', { month: 'long' });
    
    // Get first day of month
    const firstDay = new Date(year, month, 1);
    // Get first Sunday of the calendar view
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    // Generate 42 days (6 weeks) for month view
    const days = [];
    for (let i = 0; i < 42; i++) {
      const day = new Date(startDate);
      day.setDate(startDate.getDate() + i);
      days.push(day);
    }
    
    return { days, monthName, year };
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
    });
  };

  const isToday = (date: Date): boolean => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const isCurrentMonth = (date: Date): boolean => {
    return date.getMonth() === currentDate.getMonth();
  };

  const isSelectedDate = (date: Date): boolean => {
    return date.toDateString() === currentDate.toDateString();
  };

  const handleDateClick = (date: Date) => {
    if (onDateChange) {
      onDateChange(date);
    }
  };

  const handlePrevMonth = () => {
    if (onDateChange) {
      const prevMonth = new Date(currentDate);
      prevMonth.setMonth(prevMonth.getMonth() - 1);
      onDateChange(prevMonth);
    }
  };

  const handleNextMonth = () => {
    if (onDateChange) {
      const nextMonth = new Date(currentDate);
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      onDateChange(nextMonth);
    }
  };

  const weekDays = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

  return (
    <div className="mini-calendar">
      <div className="mini-calendar-header">
        <button 
          className="nav-button"
          onClick={handlePrevMonth}
          aria-label="Previous month"
        >
          ‹
        </button>
        <h3 className="mini-calendar-title">
          {monthName} {year}
        </h3>
        <button 
          className="nav-button"
          onClick={handleNextMonth}
          aria-label="Next month"
        >
          ›
        </button>
      </div>
      
      <div className="mini-calendar-weekdays">
        {weekDays.map(day => (
          <div key={day} className="mini-weekday">
            {day}
          </div>
        ))}
      </div>
      
      <div className="mini-calendar-days">
        {days.map((date, index) => {
          const dayEvents = getEventsForDate(date);
          const hasEvents = dayEvents.length > 0;
          
          return (
            <div 
              key={index} 
              className={`mini-day ${isToday(date) ? 'today' : ''} ${!isCurrentMonth(date) ? 'other-month' : ''} ${isSelectedDate(date) ? 'selected' : ''}`}
              onClick={() => handleDateClick(date)}
            >
              <span className="mini-day-number">
                {date.getDate()}
              </span>
              {hasEvents && (
                <div className="mini-day-events">
                  {dayEvents.slice(0, 3).map((event, eventIndex) => {
                    const eventColor = getEventCalendarColor(event.calendarUrl, calendars);
                    return (
                      <div
                        key={`${event.uid}-${eventIndex}`}
                        className="mini-event-dot"
                        style={{ backgroundColor: eventColor }}
                        title={event.summary}
                      />
                    );
                  })}
                  {dayEvents.length > 3 && (
                    <div className="mini-more-events">+</div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};