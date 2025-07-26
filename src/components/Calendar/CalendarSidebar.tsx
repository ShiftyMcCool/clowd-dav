import React from 'react';
import { Calendar } from '../../types/dav';
import './CalendarSidebar.css';

interface CalendarSidebarProps {
  calendars: Calendar[];
  visibleCalendars: Set<string>;
  onCalendarToggle: (calendarUrl: string) => void;
  isOpen: boolean;
  onToggle: () => void;
}

export const CalendarSidebar: React.FC<CalendarSidebarProps> = ({
  calendars,
  visibleCalendars,
  onCalendarToggle,
  isOpen,
  onToggle
}) => {
  const handleToggleAll = () => {
    const allVisible = calendars.every(cal => visibleCalendars.has(cal.url));
    calendars.forEach(calendar => {
      if (allVisible && visibleCalendars.has(calendar.url)) {
        onCalendarToggle(calendar.url);
      } else if (!allVisible && !visibleCalendars.has(calendar.url)) {
        onCalendarToggle(calendar.url);
      }
    });
  };

  const allVisible = calendars.length > 0 && calendars.every(cal => visibleCalendars.has(cal.url));
  const someVisible = calendars.some(cal => visibleCalendars.has(cal.url));

  return (
    <>
      <aside className={`calendar-sidebar ${isOpen ? 'calendar-sidebar-open' : 'calendar-sidebar-collapsed'}`}>
        <div className="calendar-sidebar-header">
          <button
            className="calendar-sidebar-toggle"
            onClick={onToggle}
            aria-label="Toggle calendar sidebar"
          >
            <span className="calendar-toggle-icon"></span>
          </button>
          {isOpen && <h2 className="calendar-sidebar-title">Calendars</h2>}
        </div>

        {isOpen && (
          <div className="calendar-sidebar-content">
            {calendars.length > 1 && (
              <div className="calendar-controls">
                <button
                  className="calendar-toggle-all"
                  onClick={handleToggleAll}
                  title={allVisible ? 'Hide all calendars' : 'Show all calendars'}
                >
                  <span className={`toggle-all-icon ${allVisible ? 'all-visible' : someVisible ? 'some-visible' : 'none-visible'}`}></span>
                  {allVisible ? 'Hide All' : 'Show All'}
                </button>
              </div>
            )}

            <div className="calendar-list">
              {calendars.map(calendar => (
                <div key={calendar.url} className="calendar-item">
                  <label className="calendar-toggle-label">
                    <input
                      type="checkbox"
                      checked={visibleCalendars.has(calendar.url)}
                      onChange={() => onCalendarToggle(calendar.url)}
                      className="calendar-checkbox"
                    />
                    <span className="calendar-checkbox-custom">
                      <span className="checkbox-checkmark"></span>
                    </span>
                    <span 
                      className="calendar-color-indicator"
                      style={{ backgroundColor: calendar.color || '#3b82f6' }}
                    ></span>
                    <span className="calendar-name" title={calendar.displayName}>
                      {calendar.displayName}
                    </span>
                  </label>
                </div>
              ))}
            </div>

            {calendars.length === 0 && (
              <div className="calendar-empty-state">
                <p>No calendars available</p>
              </div>
            )}
          </div>
        )}
      </aside>
      
      <div 
        className={`calendar-sidebar-overlay ${isOpen ? 'calendar-overlay-visible' : ''}`} 
        onClick={onToggle}
      ></div>
    </>
  );
};