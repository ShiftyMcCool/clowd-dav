import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import './ThemeToggle.css';

export const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useTheme();

  // Debug: Log current theme and check if data-theme is set
  console.log('Current theme:', theme);
  console.log('HTML data-theme attribute:', document.documentElement.getAttribute('data-theme'));

  return (
    <button
      className="theme-toggle"
      onClick={toggleTheme}
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
      title={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
    >
      <span className={`theme-icon ${theme === 'light' ? 'sun-icon' : 'moon-icon'}`}></span>
    </button>
  );
};