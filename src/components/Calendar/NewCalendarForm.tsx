import React, { useState } from 'react';
import { Modal, ColorPicker } from '../common';
import './NewCalendarForm.css';

interface NewCalendarFormProps {
  onSave: (displayName: string, color: string, description?: string) => Promise<void>;
  onCancel: () => void;
}

export const NewCalendarForm: React.FC<NewCalendarFormProps> = ({
  onSave,
  onCancel,
}) => {
  const [displayName, setDisplayName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#3b82f6');
  const [isSubmitting, setIsSubmitting] = useState(false);
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
      await onSave(displayName.trim(), color, description.trim() || undefined);
    } catch (error) {
      console.error('Error creating calendar:', error);
      setError(error instanceof Error ? error.message : 'Failed to create calendar');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleColorChange = (newColor: string) => {
    setColor(newColor);
  };

  return (
    <>
      <Modal
        isOpen={true}
        title="Create New Calendar"
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
              disabled={isSubmitting}
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
              disabled={isSubmitting}
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
              onClick={onCancel}
              className="form-button form-button-secondary"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="form-button form-button-primary"
              disabled={isSubmitting || !displayName.trim()}
            >
              {isSubmitting ? 'Creating...' : 'Create Calendar'}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
};