import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { Navigation } from '../Navigation';

describe('Navigation Component', () => {
  const mockViewChange = jest.fn();
  const mockLogout = jest.fn();
  
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  it('renders navigation with calendar and contacts tabs', () => {
    render(
      <Navigation 
        currentView="calendar" 
        onViewChange={mockViewChange} 
        username="testuser" 
        onLogout={mockLogout} 
      />
    );
    
    expect(screen.getByText('Calendar')).toBeInTheDocument();
    expect(screen.getByText('Contacts')).toBeInTheDocument();
    expect(screen.getByText('testuser')).toBeInTheDocument();
  });
  
  it('highlights the active tab', () => {
    render(
      <Navigation 
        currentView="calendar" 
        onViewChange={mockViewChange} 
        username="testuser" 
        onLogout={mockLogout} 
      />
    );
    
    const calendarButton = screen.getByText('Calendar').closest('button');
    const contactsButton = screen.getByText('Contacts').closest('button');
    
    expect(calendarButton).toHaveClass('active');
    expect(contactsButton).not.toHaveClass('active');
  });
  
  it('calls onViewChange when a tab is clicked', () => {
    render(
      <Navigation 
        currentView="calendar" 
        onViewChange={mockViewChange} 
        username="testuser" 
        onLogout={mockLogout} 
      />
    );
    
    fireEvent.click(screen.getByText('Contacts'));
    expect(mockViewChange).toHaveBeenCalledWith('contacts');
  });
  
  it('calls onLogout when logout button is clicked', () => {
    render(
      <Navigation 
        currentView="calendar" 
        onViewChange={mockViewChange} 
        username="testuser" 
        onLogout={mockLogout} 
      />
    );
    
    fireEvent.click(screen.getByText('Logout'));
    expect(mockLogout).toHaveBeenCalled();
  });
});