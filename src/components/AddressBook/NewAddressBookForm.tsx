import React, { useState } from 'react';
import { Modal } from '../common';
import './NewAddressBookForm.css';

interface NewAddressBookFormProps {
  onSave: (displayName: string, description?: string) => Promise<void>;
  onCancel: () => void;
}

export const NewAddressBookForm: React.FC<NewAddressBookFormProps> = ({
  onSave,
  onCancel,
}) => {
  const [displayName, setDisplayName] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!displayName.trim()) {
      setError('Address book name is required');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await onSave(displayName.trim(), description.trim() || undefined);
    } catch (error) {
      console.error('Error creating address book:', error);
      setError(error instanceof Error ? error.message : 'Failed to create address book');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Modal
        isOpen={true}
        title="Create New Address Book"
        onClose={onCancel}
        size="medium"
      >
        <form onSubmit={handleSubmit} className="new-address-book-form">
          {error && (
            <div className="form-error">
              {error}
            </div>
          )}

          <div className="form-group">
            <label htmlFor="address-book-name" className="form-label">
              Address Book Name *
            </label>
            <input
              id="address-book-name"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="form-input"
              placeholder="Enter address book name"
              disabled={isSubmitting}
              autoFocus
              maxLength={100}
            />
          </div>

          <div className="form-group">
            <label htmlFor="address-book-description" className="form-label">
              Description
            </label>
            <textarea
              id="address-book-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="form-textarea"
              placeholder="Enter address book description (optional)"
              disabled={isSubmitting}
              rows={3}
              maxLength={500}
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
              {isSubmitting ? 'Creating...' : 'Create Address Book'}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
};