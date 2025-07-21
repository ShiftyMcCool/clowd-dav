import React from 'react';
import { ViewType } from './CalendarView';
import './CalendarNavigation.css';

interface CalendarNavigationProps {
  currentDate: Date;
  viewType: ViewType;
  onNavigate: (direction: 'prev' | 'next' | 'today') => void;
  onViewChange: (view: ViewType) => void;
}

export const CalendarNavigation: React.FC<CalendarNavigationProps> = ({
  currentDate,
  viewType,
  onNavigate,
  onViewChange
}) => {
  const formatTitle = (date: Date, view: ViewType): string => {
    const options: Intl.DateTimeFormatOptions = {};
    
    switch (view) {
      case 'day':
        options.weekday = 'long';
        options.year = 'numeric';
        options.month = 'long';
        options.day = 'numeric';
        break;
      case 'week':
        // Show week range
        const weekStart = new Date(date);
        const dayOfWeek = weekStart.getDay();
        weekStart.setDate(weekStart.getDate() - dayOfWeek);
        const weekEnd = new Date(weekStart);
        weekEnd.setDate(weekEnd.getDate() + 6);
        
        if (weekStart.getMonth() === weekEnd.getMonth()) {
          return `${weekStart.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { day: 'numeric', year: 'numeric' })}`;
        } else {
          return `${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
        }
      case 'month':
        options.year = 'numeric';
        options.month = 'long';
        break;
    }
    
    return date.toLocaleDateString('en-US', options);
  };

  return (
    <div className="calendar-navigation">
      <div className="nav-controls">
        <button 
          className="nav-button"
          onClick={() => onNavigate('prev')}
          aria-label="Previous"
        >
          &#8249;
        </button>
        
        <button 
          className="nav-button today-button"
          onClick={() => onNavigate('today')}
        >
          Today
        </button>
        
        <button 
          className="nav-button"
          onClick={() => onNavigate('next')}
          aria-label="Next"
        >
          &#8250;
        </button>
      </div>

      <h2 className="calendar-title">
        {formatTitle(currentDate, viewType)}
      </h2>

      <div className="view-controls">
        <button
          className={`view-button ${viewType === 'month' ? 'active' : ''}`}
          onClick={() => onViewChange('month')}
        >
          Month
        </button>
        <button
          className={`view-button ${viewType === 'week' ? 'active' : ''}`}
          onClick={() => onViewChange('week')}
        >
          Week
        </button>
        <button
          className={`view-button ${viewType === 'day' ? 'active' : ''}`}
          onClick={() => onViewChange('day')}
        >
          Day
        </button>
      </div>
    </div>
  );
};