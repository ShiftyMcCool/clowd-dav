import React, { useState, useEffect, useCallback } from 'react';
import { CalendarEvent, Calendar } from '../../types/dav';
import './EventForm.css';

interface EventFormProps {
  event?: CalendarEvent;
  calendars: Calendar[];
  selectedCalendar?: Calendar;
  onSave: (event: CalendarEvent, calendar: Calendar) => Promise<void>;
  onCancel: () => void;
  isEditing?: boolean;
  initialDate?: Date;
}

export const EventForm: React.FC<EventFormProps> = ({
  event,
  calendars,
  selectedCalendar,
  onSave,
  onCancel,
  isEditing = false,
  initialDate
}) => {
  const [formData, setFormData] = useState({
    summary: '',
    description: '',
    location: '',
    startDate: '',
    startTime: '',
    endDate: '',
    endTime: ''
  });
  const [selectedCalendarUrl, setSelectedCalendarUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Initialize form data when event, selectedCalendar, or initialDate changes
  useEffect(() => {
    if (event) {
      // Editing existing event
      const startDate = new Date(event.dtstart);
      const endDate = new Date(event.dtend);
      
      setFormData({
        summary: event.summary || '',
        description: event.description || '',
        location: event.location || '',
        startDate: startDate.toISOString().split('T')[0],
        startTime: startDate.toTimeString().slice(0, 5),
        endDate: endDate.toISOString().split('T')[0],
        endTime: endDate.toTimeString().slice(0, 5)
      });

      // Set the selected calendar URL for editing
      if (event.calendarUrl) {
        setSelectedCalendarUrl(event.calendarUrl);
      }
    } else {
      // Creating new event with default times
      const baseDate = initialDate || new Date();
      const startTime = new Date(baseDate);
      
      // Round to next hour if creating from current time
      if (!initialDate) {
        startTime.setMinutes(0, 0, 0);
        startTime.setHours(startTime.getHours() + 1);
      } else {
        // If specific date provided, start at 9 AM
        startTime.setHours(9, 0, 0, 0);
      }
      
      const endTime = new Date(startTime.getTime() + 60 * 60 * 1000); // 1 hour later
      
      setFormData({
        summary: '',
        description: '',
        location: '',
        startDate: startTime.toISOString().split('T')[0],
        startTime: startTime.toTimeString().slice(0, 5),
        endDate: endTime.toISOString().split('T')[0],
        endTime: endTime.toTimeString().slice(0, 5)
      });
      
      if (selectedCalendar) {
        setSelectedCalendarUrl(selectedCalendar.url);
      }
    }
  }, [event, selectedCalendar, initialDate]);

  // Set default calendar if not editing and no calendar selected
  useEffect(() => {
    if (!isEditing && !selectedCalendarUrl && calendars.length > 0) {
      setSelectedCalendarUrl(calendars[0].url);
    }
  }, [calendars, isEditing, selectedCalendarUrl]);

  const handleInputChange = useCallback((field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
    
    // Auto-adjust end date/time when start date/time changes
    if (field === 'startDate' || field === 'startTime') {
      setFormData(prev => {
        const newData = { ...prev, [field]: value };
        
        // If we have both start date and time, auto-adjust end date/time
        if (newData.startDate && newData.startTime) {
          const startDateTime = new Date(`${newData.startDate}T${newData.startTime}`);
          const currentEndDateTime = newData.endDate && newData.endTime 
            ? new Date(`${newData.endDate}T${newData.endTime}`)
            : null;
          
          // If end time is before start time or not set, set it to 1 hour after start
          if (!currentEndDateTime || currentEndDateTime <= startDateTime) {
            const newEndDateTime = new Date(startDateTime.getTime() + 60 * 60 * 1000);
            newData.endDate = newEndDateTime.toISOString().split('T')[0];
            newData.endTime = newEndDateTime.toTimeString().slice(0, 5);
          }
        }
        
        return newData;
      });
    }
  }, [errors]);

  const validateForm = useCallback((): boolean => {
    const newErrors: Record<string, string> = {};

    // Required fields
    if (!formData.summary.trim()) {
      newErrors.summary = 'Event title is required';
    } else if (formData.summary.trim().length > 255) {
      newErrors.summary = 'Event title must be less than 255 characters';
    }

    if (!formData.startDate) {
      newErrors.startDate = 'Start date is required';
    }

    if (!formData.startTime) {
      newErrors.startTime = 'Start time is required';
    }

    if (!formData.endDate) {
      newErrors.endDate = 'End date is required';
    }

    if (!formData.endTime) {
      newErrors.endTime = 'End time is required';
    }

    if (!selectedCalendarUrl) {
      newErrors.calendar = 'Please select a calendar';
    }

    // Optional field length validation
    if (formData.description && formData.description.length > 2000) {
      newErrors.description = 'Description must be less than 2000 characters';
    }

    if (formData.location && formData.location.length > 255) {
      newErrors.location = 'Location must be less than 255 characters';
    }

    // Date/time validation
    if (formData.startDate && formData.startTime && formData.endDate && formData.endTime) {
      const startDateTime = new Date(`${formData.startDate}T${formData.startTime}`);
      const endDateTime = new Date(`${formData.endDate}T${formData.endTime}`);

      // Check if dates are valid
      if (isNaN(startDateTime.getTime())) {
        newErrors.startDate = 'Invalid start date';
        newErrors.startTime = 'Invalid start time';
      }

      if (isNaN(endDateTime.getTime())) {
        newErrors.endDate = 'Invalid end date';
        newErrors.endTime = 'Invalid end time';
      }

      // Check if end is after start
      if (!isNaN(startDateTime.getTime()) && !isNaN(endDateTime.getTime())) {
        if (endDateTime <= startDateTime) {
          newErrors.endTime = 'End time must be after start time';
        }

        // Check if event is too long (more than 24 hours)
        const duration = endDateTime.getTime() - startDateTime.getTime();
        const maxDuration = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
        if (duration > maxDuration) {
          newErrors.endTime = 'Event duration cannot exceed 24 hours';
        }
      }

      // Check if start date is not too far in the past
      const now = new Date();
      const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
      if (startDateTime < oneYearAgo) {
        newErrors.startDate = 'Start date cannot be more than a year in the past';
      }

      // Check if start date is not too far in the future
      const tenYearsFromNow = new Date(now.getFullYear() + 10, now.getMonth(), now.getDate());
      if (startDateTime > tenYearsFromNow) {
        newErrors.startDate = 'Start date cannot be more than 10 years in the future';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [formData, selectedCalendarUrl]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    setErrors(prev => ({ ...prev, submit: '' })); // Clear previous submit errors

    try {
      // Create Date objects from form data
      const startDateTime = new Date(`${formData.startDate}T${formData.startTime}`);
      const endDateTime = new Date(`${formData.endDate}T${formData.endTime}`);

      // Create event object
      const eventData: CalendarEvent = {
        uid: event?.uid || `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        summary: formData.summary.trim(),
        description: formData.description.trim() || undefined,
        location: formData.location.trim() || undefined,
        dtstart: startDateTime,
        dtend: endDateTime,
        etag: event?.etag
      };

      // Find selected calendar
      const calendar = calendars.find(cal => cal.url === selectedCalendarUrl);
      if (!calendar) {
        throw new Error('Selected calendar not found');
      }

      await onSave(eventData, calendar);
      
      // If we get here, the save was successful and the parent component
      // should handle closing the form and refreshing the calendar
    } catch (error) {
      console.error('Error saving event:', error);
      
      // Provide user-friendly error messages
      let errorMessage = 'Failed to save event';
      if (error instanceof Error) {
        if (error.message.includes('Authentication failed')) {
          errorMessage = 'Authentication failed. Please check your credentials and try again.';
        } else if (error.message.includes('Network error')) {
          errorMessage = 'Network error. Please check your connection and try again.';
        } else if (error.message.includes('conflict')) {
          errorMessage = 'This event has been modified by another user. Please refresh and try again.';
        } else if (error.message.includes('Access forbidden')) {
          errorMessage = 'You do not have permission to modify this calendar.';
        } else {
          errorMessage = error.message;
        }
      }
      
      setErrors({ submit: errorMessage });
    } finally {
      setIsSubmitting(false);
    }
  }, [validateForm, formData, event, calendars, selectedCalendarUrl, onSave]);



  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Escape key to cancel
      if (e.key === 'Escape' && !isSubmitting) {
        onCancel();
      }
      // Ctrl/Cmd + Enter to save
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && !isSubmitting) {
        e.preventDefault();
        handleSubmit(e as any);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isSubmitting, onCancel, handleSubmit]);

  // Focus management
  useEffect(() => {
    // Focus the title field when the form opens
    const titleInput = document.getElementById('summary');
    if (titleInput) {
      titleInput.focus();
    }
  }, []);

  return (
    <div className="event-form-overlay">
      <div className="event-form-modal">
        <div className="event-form-header">
          <h2>{isEditing ? 'Edit Event' : 'Create New Event'}</h2>
          <button 
            type="button" 
            className="close-button"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="event-form" noValidate>
          {/* Event Title */}
          <div className="form-group">
            <label htmlFor="summary">Event Title *</label>
            <input
              id="summary"
              type="text"
              value={formData.summary}
              onChange={(e) => handleInputChange('summary', e.target.value)}
              className={errors.summary ? 'error' : ''}
              disabled={isSubmitting}
              placeholder="Enter event title"
              maxLength={255}
              aria-describedby={errors.summary ? 'summary-error' : undefined}
              aria-invalid={!!errors.summary}
              autoComplete="off"
            />
            {errors.summary && (
              <span id="summary-error" className="error-message" role="alert">
                {errors.summary}
              </span>
            )}
          </div>

          {/* Calendar Selection */}
          <div className="form-group">
            <label htmlFor="calendar">Calendar *</label>
            <select
              id="calendar"
              value={selectedCalendarUrl}
              onChange={(e) => setSelectedCalendarUrl(e.target.value)}
              className={errors.calendar ? 'error' : ''}
              disabled={isSubmitting}
              aria-describedby={errors.calendar ? 'calendar-error' : undefined}
              aria-invalid={!!errors.calendar}
            >
              <option value="">Select a calendar</option>
              {calendars.map(calendar => (
                <option key={calendar.url} value={calendar.url}>
                  {calendar.displayName}
                </option>
              ))}
            </select>
            {errors.calendar && (
              <span id="calendar-error" className="error-message" role="alert">
                {errors.calendar}
              </span>
            )}
          </div>

          {/* Date and Time */}
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="startDate">Start Date *</label>
              <input
                id="startDate"
                type="date"
                value={formData.startDate}
                onChange={(e) => handleInputChange('startDate', e.target.value)}
                className={errors.startDate ? 'error' : ''}
                disabled={isSubmitting}
                aria-describedby={errors.startDate ? 'startDate-error' : undefined}
                aria-invalid={!!errors.startDate}
              />
              {errors.startDate && (
                <span id="startDate-error" className="error-message" role="alert">
                  {errors.startDate}
                </span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="startTime">Start Time *</label>
              <input
                id="startTime"
                type="time"
                value={formData.startTime}
                onChange={(e) => handleInputChange('startTime', e.target.value)}
                className={errors.startTime ? 'error' : ''}
                disabled={isSubmitting}
                aria-describedby={errors.startTime ? 'startTime-error' : undefined}
                aria-invalid={!!errors.startTime}
              />
              {errors.startTime && (
                <span id="startTime-error" className="error-message" role="alert">
                  {errors.startTime}
                </span>
              )}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="endDate">End Date *</label>
              <input
                id="endDate"
                type="date"
                value={formData.endDate}
                onChange={(e) => handleInputChange('endDate', e.target.value)}
                className={errors.endDate ? 'error' : ''}
                disabled={isSubmitting}
                aria-describedby={errors.endDate ? 'endDate-error' : undefined}
                aria-invalid={!!errors.endDate}
              />
              {errors.endDate && (
                <span id="endDate-error" className="error-message" role="alert">
                  {errors.endDate}
                </span>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="endTime">End Time *</label>
              <input
                id="endTime"
                type="time"
                value={formData.endTime}
                onChange={(e) => handleInputChange('endTime', e.target.value)}
                className={errors.endTime ? 'error' : ''}
                disabled={isSubmitting}
                aria-describedby={errors.endTime ? 'endTime-error' : undefined}
                aria-invalid={!!errors.endTime}
              />
              {errors.endTime && (
                <span id="endTime-error" className="error-message" role="alert">
                  {errors.endTime}
                </span>
              )}
            </div>
          </div>

          {/* Location */}
          <div className="form-group">
            <label htmlFor="location">Location</label>
            <input
              id="location"
              type="text"
              value={formData.location}
              onChange={(e) => handleInputChange('location', e.target.value)}
              disabled={isSubmitting}
              placeholder="Enter location (optional)"
              maxLength={255}
              className={errors.location ? 'error' : ''}
              aria-describedby={errors.location ? 'location-error' : undefined}
              aria-invalid={!!errors.location}
              autoComplete="off"
            />
            {errors.location && (
              <span id="location-error" className="error-message" role="alert">
                {errors.location}
              </span>
            )}
          </div>

          {/* Description */}
          <div className="form-group">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleInputChange('description', e.target.value)}
              disabled={isSubmitting}
              placeholder="Enter description (optional)"
              rows={4}
              maxLength={2000}
              className={errors.description ? 'error' : ''}
              aria-describedby={errors.description ? 'description-error' : undefined}
              aria-invalid={!!errors.description}
            />
            {errors.description && (
              <span id="description-error" className="error-message" role="alert">
                {errors.description}
              </span>
            )}
            <div className="character-count">
              {formData.description.length}/2000 characters
            </div>
          </div>

          {/* Submit Error */}
          {errors.submit && (
            <div className="form-group">
              <div className="submit-error" role="alert" aria-live="polite">
                <strong>Error:</strong> {errors.submit}
              </div>
            </div>
          )}

          {/* Form Actions */}
          <div className="form-actions">
            <button
              type="button"
              onClick={onCancel}
              disabled={isSubmitting}
              className="cancel-button"
              aria-label="Cancel event editing"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || Object.keys(errors).some(key => key !== 'submit' && errors[key])}
              className="save-button"
              aria-label={isEditing ? 'Update event' : 'Create new event'}
            >
              {isSubmitting ? (
                <>
                  <span className="loading-spinner" aria-hidden="true"></span>
                  {isEditing ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                isEditing ? 'Update Event' : 'Create Event'
              )}
            </button>
          </div>

          {/* Keyboard shortcuts hint */}
          <div className="keyboard-shortcuts">
            <small>
              Press <kbd>Esc</kbd> to cancel or <kbd>Ctrl+Enter</kbd> to save
            </small>
          </div>
        </form>
      </div>
    </div>
  );
};