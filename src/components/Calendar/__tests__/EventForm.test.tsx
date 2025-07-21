import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EventForm } from '../EventForm';
import { Calendar, CalendarEvent } from '../../../types/dav';

// Mock calendars
const mockCalendars: Calendar[] = [
  {
    url: 'http://example.com/calendar1',
    displayName: 'Personal Calendar',
    color: '#ff0000'
  },
  {
    url: 'http://example.com/calendar2',
    displayName: 'Work Calendar',
    color: '#0000ff'
  }
];

// Mock event
const mockEvent: CalendarEvent = {
  uid: 'test-event-123',
  summary: 'Test Event',
  description: 'Test Description',
  location: 'Test Location',
  dtstart: new Date('2024-01-15T10:00:00'),
  dtend: new Date('2024-01-15T11:00:00'),
  etag: 'test-etag'
};

describe('EventForm', () => {
  const mockOnSave = jest.fn();
  const mockOnCancel = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Creating new event', () => {
    it('should render form for creating new event', () => {
      render(
        <EventForm
          calendars={mockCalendars}
          selectedCalendar={mockCalendars[0]}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          isEditing={false}
        />
      );

      expect(screen.getByText('Create New Event')).toBeInTheDocument();
      expect(screen.getByLabelText(/Event Title/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Calendar/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Start Date/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Start Time/)).toBeInTheDocument();
      expect(screen.getByLabelText(/End Date/)).toBeInTheDocument();
      expect(screen.getByLabelText(/End Time/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Location/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Description/)).toBeInTheDocument();
    });

    it('should populate calendar dropdown with available calendars', () => {
      render(
        <EventForm
          calendars={mockCalendars}
          selectedCalendar={mockCalendars[0]}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          isEditing={false}
        />
      );

      const calendarSelect = screen.getByLabelText(/Calendar/);
      expect(calendarSelect).toBeInTheDocument();
      
      // Check that calendar options are present
      expect(screen.getByText('Personal Calendar')).toBeInTheDocument();
      expect(screen.getByText('Work Calendar')).toBeInTheDocument();
    });

    it('should use initialDate when provided', () => {
      const initialDate = new Date('2024-02-20T00:00:00');
      
      render(
        <EventForm
          calendars={mockCalendars}
          selectedCalendar={mockCalendars[0]}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          isEditing={false}
          initialDate={initialDate}
        />
      );

      const startDateInput = screen.getByLabelText(/Start Date/) as HTMLInputElement;
      expect(startDateInput.value).toBe('2024-02-20');
      
      const startTimeInput = screen.getByLabelText(/Start Time/) as HTMLInputElement;
      expect(startTimeInput.value).toBe('09:00');
    });

    it('should auto-adjust end time when start time changes', async () => {
      
      render(
        <EventForm
          calendars={mockCalendars}
          selectedCalendar={mockCalendars[0]}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          isEditing={false}
        />
      );

      const startTimeInput = screen.getByLabelText(/Start Time/);
      const endTimeInput = screen.getByLabelText(/End Time/) as HTMLInputElement;

      // Set a specific start time
      fireEvent.change(startTimeInput, { target: { value: '14:30' } });

      // Wait for the auto-adjustment to happen
      await waitFor(() => {
        // End time should be automatically set to 1 hour later
        expect(endTimeInput.value).toBe('15:30');
      });
    });
  });

  describe('Editing existing event', () => {
    it('should render form for editing existing event', () => {
      render(
        <EventForm
          event={mockEvent}
          calendars={mockCalendars}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          isEditing={true}
        />
      );

      expect(screen.getByText('Edit Event')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Test Event')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Test Description')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Test Location')).toBeInTheDocument();
    });

    it('should not show calendar selector when editing', () => {
      render(
        <EventForm
          event={mockEvent}
          calendars={mockCalendars}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          isEditing={true}
        />
      );

      expect(screen.queryByLabelText(/Calendar \*/)).not.toBeInTheDocument();
    });

    it('should populate form with event data', () => {
      render(
        <EventForm
          event={mockEvent}
          calendars={mockCalendars}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          isEditing={true}
        />
      );

      const titleInput = screen.getByLabelText(/Event Title/) as HTMLInputElement;
      const descriptionInput = screen.getByLabelText(/Description/) as HTMLTextAreaElement;
      const locationInput = screen.getByLabelText(/Location/) as HTMLInputElement;
      const startDateInput = screen.getByLabelText(/Start Date/) as HTMLInputElement;
      const startTimeInput = screen.getByLabelText(/Start Time/) as HTMLInputElement;

      expect(titleInput.value).toBe('Test Event');
      expect(descriptionInput.value).toBe('Test Description');
      expect(locationInput.value).toBe('Test Location');
      expect(startDateInput.value).toBe('2024-01-15');
      expect(startTimeInput.value).toBe('10:00');
    });
  });

  describe('Form validation', () => {
    it('should show validation errors for required fields', async () => {
      render(
        <EventForm
          calendars={mockCalendars}
          selectedCalendar={mockCalendars[0]}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          isEditing={false}
        />
      );

      const submitButton = screen.getByRole('button', { name: /Create new event/ });
      await userEvent.click(submitButton);

      expect(screen.getByText('Event title is required')).toBeInTheDocument();
    });

    it('should validate end time is after start time', async () => {
      render(
        <EventForm
          calendars={mockCalendars}
          selectedCalendar={mockCalendars[0]}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          isEditing={false}
        />
      );

      const titleInput = screen.getByLabelText(/Event Title/);
      const startTimeInput = screen.getByLabelText(/Start Time/);
      const endTimeInput = screen.getByLabelText(/End Time/);
      const submitButton = screen.getByRole('button', { name: /Create new event/ });

      await userEvent.type(titleInput, 'Test Event');
      await userEvent.clear(startTimeInput);
      await userEvent.type(startTimeInput, '15:00');
      await userEvent.clear(endTimeInput);
      await userEvent.type(endTimeInput, '14:00');

      await userEvent.click(submitButton);

      expect(screen.getByText('End time must be after start time')).toBeInTheDocument();
    });

    it('should validate character limits', async () => {
      render(
        <EventForm
          calendars={mockCalendars}
          selectedCalendar={mockCalendars[0]}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          isEditing={false}
        />
      );

      const titleInput = screen.getByLabelText(/Event Title/) as HTMLInputElement;
      const longTitle = 'a'.repeat(256); // Exceeds 255 character limit

      // Manually set the value to bypass maxLength attribute
      fireEvent.change(titleInput, { target: { value: longTitle } });

      const submitButton = screen.getByRole('button', { name: /Create new event/ });
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Event title must be less than 255 characters')).toBeInTheDocument();
      });
    });
  });

  describe('Form submission', () => {
    it('should call onSave with correct data when form is valid', async () => {
      render(
        <EventForm
          calendars={mockCalendars}
          selectedCalendar={mockCalendars[0]}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          isEditing={false}
        />
      );

      const titleInput = screen.getByLabelText(/Event Title/);
      const submitButton = screen.getByRole('button', { name: /Create new event/ });

      await userEvent.type(titleInput, 'New Test Event');
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalledWith(
          expect.objectContaining({
            summary: 'New Test Event',
            uid: expect.any(String)
          }),
          mockCalendars[0]
        );
      });
    });

    it('should handle save errors gracefully', async () => {
      mockOnSave.mockRejectedValue(new Error('Network error'));
      
      render(
        <EventForm
          calendars={mockCalendars}
          selectedCalendar={mockCalendars[0]}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          isEditing={false}
        />
      );

      const titleInput = screen.getByLabelText(/Event Title/);
      const submitButton = screen.getByRole('button', { name: /Create new event/ });

      await userEvent.type(titleInput, 'New Test Event');
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/Network error/)).toBeInTheDocument();
      });
    });
  });

  describe('Keyboard shortcuts', () => {
    it('should cancel form when Escape is pressed', () => {
      render(
        <EventForm
          calendars={mockCalendars}
          selectedCalendar={mockCalendars[0]}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          isEditing={false}
        />
      );

      fireEvent.keyDown(document, { key: 'Escape' });
      expect(mockOnCancel).toHaveBeenCalled();
    });

    it('should submit form when Ctrl+Enter is pressed', async () => {
      render(
        <EventForm
          calendars={mockCalendars}
          selectedCalendar={mockCalendars[0]}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          isEditing={false}
        />
      );

      const titleInput = screen.getByLabelText(/Event Title/);
      await userEvent.type(titleInput, 'Test Event');

      fireEvent.keyDown(document, { key: 'Enter', ctrlKey: true });

      await waitFor(() => {
        expect(mockOnSave).toHaveBeenCalled();
      });
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(
        <EventForm
          calendars={mockCalendars}
          selectedCalendar={mockCalendars[0]}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          isEditing={false}
        />
      );

      const titleInput = screen.getByLabelText(/Event Title/);
      expect(titleInput).toHaveAttribute('aria-invalid', 'false');
      expect(titleInput).toHaveAttribute('autoComplete', 'off');
    });

    it('should focus title input when form opens', () => {
      render(
        <EventForm
          calendars={mockCalendars}
          selectedCalendar={mockCalendars[0]}
          onSave={mockOnSave}
          onCancel={mockOnCancel}
          isEditing={false}
        />
      );

      const titleInput = screen.getByLabelText(/Event Title/);
      expect(titleInput).toHaveFocus();
    });
  });
});