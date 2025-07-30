import React, { useState } from 'react';
import { Modal, ColorPicker } from '../common';
import { Calendar } from '../../types/dav';
import './NewCalendarForm.css';

interface EditCalendarFormProps {
  calendar: Calendar;
  onSave: (calendar: Calendar, displayName: string, color: string, description?: string) => Promise<void>;
  onDelete: (calendar: Calendar) => Promise<void>;
  onCancel: () => void;
}

export const EditCalendarForm: React.FC<EditCalendarFormProps> = ({
  calendar,
  onSave,
  onDelete,
  onCancel,
}) => {
  const [displayName, setDisplayName] = useState(calendar.displayName || '');
  const [description, setDescription] = useState(calendar.description || '');
  const [color, setColor] = useState(calendar.color || '#3b82f6');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!displayName.trim()) {
      setError('Calendar name is required');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onSave(calendar, displayName.trim(), color, description.trim() || undefined);
    } catch (error) {
      console.error('Error updating calendar:', error);
      setError(error instanceof Error ? error.message : 'Failed to update calendar');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete the calendar "${calendar.displayName}"? This action cannot be undone.`)) {
      return;
    }

    setIsDeleting(true);
    setError(null);

    try {
      await onDelete(calendar);
    } catch (error) {
      console.error('Error deleting calendar:', error);
      setError(error instanceof Error ? error.message : 'Failed to delete calendar');
      setIsDeleting(false);
    }
  };

  const handleColorChange = (newColor: string) => {
    setColor(newColor);
  };

  return (
    <>
      <Modal
        isOpen={true}
        title="Edit Calendar"
        onClose={onCancel}
        size="medium"
      >
        <form onSubmit={handleSubmit} className="new-calendar-form">
          {error && (
            <div className="form-error">
              {error}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="calendar-name" className="form-label">
              Calendar Name *
            </label>
            <input
              id="calendar-name"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="form-input"
              placeholder="Enter calendar name"
              disabled={isSubmitting || isDeleting}
              autoFocus
              maxLength={100}
            />
          </div>

          <div className="form-group">
            <label htmlFor="calendar-description" className="form-label">
              Description
            </label>
            <textarea
              id="calendar-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="form-textarea"
              placeholder="Enter calendar description (optional)"
              disabled={isSubmitting || isDeleting}
              rows={3}
              maxLength={500}
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              Color
            </label>
            <ColorPicker
              currentColor={color}
              onColorChange={handleColorChange}
              className="calendar-color-picker"
            />
          </div>

          <div className="form-actions">
            <button
              type="button"
              onClick={handleDelete}
              className="form-button form-button-danger"
              disabled={isSubmitting || isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Delete Calendar'}
            </button>
            <div className="form-actions-right">
              <button
                type="button"
                onClick={onCancel}
                className="form-button form-button-secondary"
                disabled={isSubmitting || isDeleting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="form-button form-button-primary"
                disabled={isSubmitting || isDeleting || !displayName.trim()}
              >
                {isSubmitting ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </form>
      </Modal>
    </>
  );
};