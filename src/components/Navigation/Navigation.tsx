import React, { useState } from "react";
import { ThemeToggle } from "../common/ThemeToggle";
import { SyncStatusButton } from "../common/SyncStatusButton";
import { SyncService } from "../../services/SyncService";
import { useTheme } from "../../contexts/ThemeContext";
import { Calendar } from "../../types/dav";
import "./Navigation.css";

interface NavigationProps {
  currentView: "calendar" | "contacts";
  onViewChange: (view: "calendar" | "contacts") => void;
  username?: string;
  onLogout: () => void;
  syncService?: SyncService;
  onManualSync?: () => void;
  // Calendar-specific props
  calendars?: Calendar[];
  visibleCalendars?: Set<string>;
  onCalendarToggle?: (calendarUrl: string) => void;
}

export const Navigation: React.FC<NavigationProps> = ({
  currentView,
  onViewChange,
  username,
  onLogout,
  syncService,
  onManualSync,
  calendars = [],
  visibleCalendars = new Set(),
  onCalendarToggle,
}) => {
  const { theme, toggleTheme } = useTheme();
  // Initialize sidebar state based on screen size
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    return window.innerWidth > 768;
  });
  
  // Track expanded sections
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  const toggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  const handleViewChange = (view: "calendar" | "contacts") => {
    onViewChange(view);
    // Close sidebar on mobile after navigation
    if (window.innerWidth <= 768) {
      setSidebarOpen(false);
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const newExpanded = new Set(prev);
      if (newExpanded.has(section)) {
        newExpanded.delete(section);
      } else {
        newExpanded.add(section);
      }
      return newExpanded;
    });
  };

  const handleCalendarToggleAll = () => {
    if (!onCalendarToggle) return;
    
    const allVisible = calendars.every(cal => visibleCalendars.has(cal.url));
    calendars.forEach(calendar => {
      if (allVisible && visibleCalendars.has(calendar.url)) {
        onCalendarToggle(calendar.url);
      } else if (!allVisible && !visibleCalendars.has(calendar.url)) {
        onCalendarToggle(calendar.url);
      }
    });
  };

  // Update app-main class based on sidebar state
  React.useEffect(() => {
    const appMain = document.querySelector('.app-main');
    if (appMain) {
      if (sidebarOpen) {
        appMain.classList.remove('sidebar-collapsed');
      } else {
        appMain.classList.add('sidebar-collapsed');
      }
    }
  }, [sidebarOpen]);

  // Handle window resize
  React.useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth <= 768) {
        setSidebarOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <>
      <aside className={`sidebar ${sidebarOpen ? "sidebar-open" : "sidebar-collapsed"}`}>
        <div className="sidebar-header">
          <button
            className="sidebar-toggle"
            onClick={toggleSidebar}
            aria-label="Toggle sidebar"
          >
            <span className="toggle-icon"></span>
          </button>
          {sidebarOpen && <h1 className="sidebar-title">Clowd-DAV</h1>}
        </div>

        <nav className="sidebar-navigation">
          <ul className="sidebar-nav-links">
            <li>
              <div className="nav-section">
                <div className="nav-section-header">
                  <button
                    className={`sidebar-nav-link ${
                      currentView === "calendar" ? "active" : ""
                    }`}
                    onClick={() => handleViewChange("calendar")}
                    title="Calendar"
                  >
                    <span className="nav-icon calendar-icon"></span>
                    {sidebarOpen && <span className="nav-text">Calendar</span>}
                  </button>
                  {sidebarOpen && currentView === "calendar" && calendars.length > 0 && (
                    <button
                      className={`section-expand-button ${
                        expandedSections.has("calendar") ? "expanded" : ""
                      }`}
                      onClick={() => toggleSection("calendar")}
                      title={expandedSections.has("calendar") ? "Collapse calendar options" : "Expand calendar options"}
                    >
                      <span className="expand-icon"></span>
                    </button>
                  )}
                </div>
                
                {sidebarOpen && currentView === "calendar" && expandedSections.has("calendar") && (
                  <div className="nav-section-content">
                    {calendars.length > 1 && (
                      <div className="calendar-controls">
                        <button
                          className="calendar-toggle-all"
                          onClick={handleCalendarToggleAll}
                          title={calendars.every(cal => visibleCalendars.has(cal.url)) ? 'Hide all calendars' : 'Show all calendars'}
                        >
                          <span className={`toggle-all-icon ${
                            calendars.every(cal => visibleCalendars.has(cal.url)) 
                              ? 'all-visible' 
                              : calendars.some(cal => visibleCalendars.has(cal.url)) 
                                ? 'some-visible' 
                                : 'none-visible'
                          }`}></span>
                          {calendars.every(cal => visibleCalendars.has(cal.url)) ? 'Hide All' : 'Show All'}
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
                              onChange={() => onCalendarToggle?.(calendar.url)}
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
              </div>
            </li>
            <li>
              <div className="nav-section">
                <div className="nav-section-header">
                  <button
                    className={`sidebar-nav-link ${
                      currentView === "contacts" ? "active" : ""
                    }`}
                    onClick={() => handleViewChange("contacts")}
                    title="Contacts"
                  >
                    <span className="nav-icon contacts-icon"></span>
                    {sidebarOpen && <span className="nav-text">Contacts</span>}
                  </button>
                  {sidebarOpen && currentView === "contacts" && (
                    <button
                      className={`section-expand-button ${
                        expandedSections.has("contacts") ? "expanded" : ""
                      }`}
                      onClick={() => toggleSection("contacts")}
                      title={expandedSections.has("contacts") ? "Collapse contact options" : "Expand contact options"}
                    >
                      <span className="expand-icon"></span>
                    </button>
                  )}
                </div>
                
                {sidebarOpen && currentView === "contacts" && expandedSections.has("contacts") && (
                  <div className="nav-section-content">
                    <div className="contacts-placeholder">
                      <p>Contact options will appear here</p>
                    </div>
                  </div>
                )}
              </div>
            </li>
          </ul>
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-bottom-row">
            <button
              className="sidebar-icon-button theme-button"
              onClick={toggleTheme}
              title={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
            >
              <span className="button-icon theme-icon"></span>
            </button>
            
            {username && (
              <button
                className="sidebar-icon-button user-button"
                title={`Logged in as ${username}`}
              >
                <span className="button-icon user-icon"></span>
              </button>
            )}
            
            {syncService && (
              <SyncStatusButton 
                syncService={syncService}
                onManualSync={onManualSync}
                iconOnly={true}
              />
            )}
            
            <button
              className="sidebar-icon-button logout-button"
              onClick={onLogout}
              title="Logout"
            >
              <span className="button-icon logout-icon"></span>
            </button>
          </div>
          
          {/* Hidden theme toggle for functionality */}
          <div style={{ display: 'none' }}>
            <ThemeToggle />
          </div>
        </div>
      </aside>
      
      <div className={`sidebar-overlay ${sidebarOpen ? "overlay-visible" : ""}`} onClick={toggleSidebar}></div>
    </>
  );
};
