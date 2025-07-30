import React, { useState } from 'react';
import { Modal } from '../common';
import { AddressBook } from '../../types/dav';
import '../Calendar/NewCalendarForm.css'; // Reuse the same styles

interface EditAddressBookFormProps {
  addressBook: AddressBook;
  onSave: (addressBook: AddressBook, displayName: string) => Promise<void>;
  onDelete: (addressBook: AddressBook) => Promise<void>;
  onCancel: () => void;
}

export const EditAddressBookForm: React.FC<EditAddressBookFormProps> = ({
  addressBook,
  onSave,
  onDelete,
  onCancel,
}) => {
  const [displayName, setDisplayName] = useState(addressBook.displayName || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
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
      await onSave(addressBook, displayName.trim());
    } catch (error) {
      console.error('Error updating address book:', error);
      setError(error instanceof Error ? error.message : 'Failed to update address book');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Are you sure you want to delete the address book "${addressBook.displayName}"? This action cannot be undone and will delete all contacts in this address book.`)) {
      return;
    }

    setIsDeleting(true);
    setError(null);

    try {
      await onDelete(addressBook);
    } catch (error) {
      console.error('Error deleting address book:', error);
      setError(error instanceof Error ? error.message : 'Failed to delete address book');
      setIsDeleting(false);
    }
  };

  return (
    <>
      <Modal
        isOpen={true}
        title="Edit Address Book"
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
            <label htmlFor="addressbook-name" className="form-label">
              Address Book Name *
            </label>
            <input
              id="addressbook-name"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="form-input"
              placeholder="Enter address book name"
              disabled={isSubmitting || isDeleting}
              autoFocus
              maxLength={100}
            />
          </div>

          <div className="form-actions">
            <button
              type="button"
              onClick={handleDelete}
              className="form-button form-button-danger"
              disabled={isSubmitting || isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Delete Address Book'}
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