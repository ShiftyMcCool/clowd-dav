import React, { useState } from "react";
import { ThemeToggle } from "../common/ThemeToggle";
import { SyncStatusButton } from "../common/SyncStatusButton";
import { SyncService } from "../../services/SyncService";
import { useTheme } from "../../contexts/ThemeContext";
import "./Navigation.css";

interface NavigationProps {
  currentView: "calendar" | "contacts";
  onViewChange: (view: "calendar" | "contacts") => void;
  username?: string;
  onLogout: () => void;
  syncService?: SyncService;
  onManualSync?: () => void;
}

export const Navigation: React.FC<NavigationProps> = ({
  currentView,
  onViewChange,
  username,
  onLogout,
  syncService,
  onManualSync,
}) => {
  const { theme, toggleTheme } = useTheme();
  // Initialize sidebar state based on screen size
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    return window.innerWidth > 768;
  });

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
            </li>
            <li>
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
