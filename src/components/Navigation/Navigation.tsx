import React, { useState } from "react";
import { ThemeToggle } from "../common/ThemeToggle";
import { SyncStatusButton } from "../common/SyncStatusButton";
import { SyncService } from "../../services/SyncService";
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setMobileMenuOpen(!mobileMenuOpen);
  };

  const handleViewChange = (view: "calendar" | "contacts") => {
    onViewChange(view);
    setMobileMenuOpen(false);
  };

  return (
    <header className="app-header">
      <div className="header-content">
        <div className="logo-container">
          <button
            className="mobile-menu-toggle"
            onClick={toggleMobileMenu}
            aria-label="Toggle navigation menu"
          >
            <span className="menu-icon"></span>
          </button>
        </div>

        <nav
          className={`main-navigation ${mobileMenuOpen ? "mobile-open" : ""}`}
        >
          <ul className="nav-links">
            <li>
              <button
                className={`nav-link ${
                  currentView === "calendar" ? "active" : ""
                }`}
                onClick={() => handleViewChange("calendar")}
              >
                <span className="nav-icon calendar-icon"></span>
                Calendar
              </button>
            </li>
            <li>
              <button
                className={`nav-link ${
                  currentView === "contacts" ? "active" : ""
                }`}
                onClick={() => handleViewChange("contacts")}
              >
                <span className="nav-icon contacts-icon"></span>
                Contacts
              </button>
            </li>
          </ul>

          <h1>Clowd-DAV</h1>

          <div className="nav-controls">
            {syncService && (
              <SyncStatusButton 
                syncService={syncService}
                onManualSync={onManualSync}
              />
            )}
            <ThemeToggle />
            {username && (
              <div className="user-controls">
                <div className="username">
                  <span className="user-icon"></span>
                  {username}
                </div>
                <button onClick={onLogout} className="logout-button">
                  Logout
                </button>
              </div>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
};
