import React, { useState } from 'react';
import { Contact, AddressBook } from '../../types/dav';
import { DAVClient } from '../../services/DAVClient';
import { useLoading } from '../../contexts/LoadingContext';
import './ContactForm.css';

interface ContactFormProps {
  contact?: Contact; // If provided, we're editing an existing contact
  addressBook: AddressBook;
  davClient: DAVClient;
  onSave: (savedContact: Contact) => void;
  onCancel: () => void;
  onDelete?: (contact: Contact) => void;
}

export const ContactForm: React.FC<ContactFormProps> = ({
  contact,
  addressBook,
  davClient,
  onSave,
  onCancel,
  onDelete
}) => {
  const { showLoading, hideLoading } = useLoading();
  const isEditing = !!contact;
  
  // Initialize form state
  const [formData, setFormData] = useState<{
    firstName: string;
    lastName: string;
    org: string;
    email: string[];
    tel: string[];
  }>({
    firstName: contact?.firstName || '',
    lastName: contact?.lastName || '',
    org: contact?.org || '',
    email: contact?.email || [''],
    tel: contact?.tel || ['']
  });
  
  const [errors, setErrors] = useState<{
    firstName?: string;
    lastName?: string;
    email?: string[];
  }>({});
  
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Validate form data
  const validateForm = (): boolean => {
    const newErrors: {
      firstName?: string;
      lastName?: string;
      email?: string[];
    } = {};
    
    // At least first name or last name is required
    if (!formData.firstName.trim() && !formData.lastName.trim()) {
      newErrors.firstName = 'First name or last name is required';
      newErrors.lastName = 'First name or last name is required';
    }
    
    // Validate email format
    const emailErrors: string[] = [];
    formData.email.forEach((email, index) => {
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        emailErrors[index] = 'Invalid email format';
      }
    });
    
    if (emailErrors.length > 0) {
      newErrors.email = emailErrors;
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle contact deletion
  const handleDelete = async () => {
    if (!contact || !onDelete) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete "${contact.fn}"? This action cannot be undone.`
    );

    if (!confirmed) return;

    try {
      showLoading('Deleting contact...', 'medium');
      setDeleteError(null);
      await onDelete(contact);
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete contact');
      console.error('Error deleting contact:', err);
    } finally {
      hideLoading();
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    showLoading(isEditing ? 'Updating contact...' : 'Creating contact...', 'medium');
    setSubmitError(null);
    
    try {
      // Filter out empty email and phone fields
      const filteredData = {
        ...formData,
        email: formData.email.filter(email => email.trim() !== ''),
        tel: formData.tel.filter(tel => tel.trim() !== '')
      };
      
      // Create new contact object
      const fullName = `${formData.firstName} ${formData.lastName}`.trim();
      const contactData: Contact = {
        uid: contact?.uid || `contact-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        fn: fullName || 'Unnamed Contact',
        firstName: formData.firstName || undefined,
        lastName: formData.lastName || undefined,
        org: filteredData.org || undefined,
        email: filteredData.email.length > 0 ? filteredData.email : undefined,
        tel: filteredData.tel.length > 0 ? filteredData.tel : undefined,
        etag: contact?.etag
      };
      
      // Save to server
      if (isEditing) {
        await davClient.updateContact(addressBook, contactData);
      } else {
        await davClient.createContact(addressBook, contactData);
      }
      
      onSave(contactData);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to save contact');
      console.error('Error saving contact:', err);
    } finally {
      hideLoading();
    }
  };

  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  // Handle array field changes (email, tel)
  const handleArrayFieldChange = (
    field: 'email' | 'tel',
    index: number,
    value: string
  ) => {
    setFormData(prev => {
      const newArray = [...prev[field]];
      newArray[index] = value;
      return {
        ...prev,
        [field]: newArray
      };
    });
  };

  // Add new field to an array (email, tel)
  const addArrayField = (field: 'email' | 'tel') => {
    setFormData(prev => ({
      ...prev,
      [field]: [...prev[field], '']
    }));
  };

  // Remove field from an array (email, tel)
  const removeArrayField = (field: 'email' | 'tel', index: number) => {
    setFormData(prev => {
      const newArray = [...prev[field]];
      newArray.splice(index, 1);
      return {
        ...prev,
        [field]: newArray.length > 0 ? newArray : [''] // Always keep at least one field
      };
    });
  };

  return (
    <form onSubmit={handleSubmit} className="contact-form">
        <div className="form-group">
          <label htmlFor="firstName">First Name</label>
          <input
            type="text"
            id="firstName"
            name="firstName"
            value={formData.firstName}
            onChange={handleInputChange}
            className={errors.firstName ? 'error' : ''}
          />
          {errors.firstName && <div className="error-message">{errors.firstName}</div>}
        </div>
        
        <div className="form-group">
          <label htmlFor="lastName">Last Name</label>
          <input
            type="text"
            id="lastName"
            name="lastName"
            value={formData.lastName}
            onChange={handleInputChange}
            className={errors.lastName ? 'error' : ''}
          />
          {errors.lastName && <div className="error-message">{errors.lastName}</div>}
        </div>
        
        <div className="form-group">
          <label htmlFor="org">Organization</label>
          <input
            type="text"
            id="org"
            name="org"
            value={formData.org}
            onChange={handleInputChange}
          />
        </div>
        
        <div className="form-group">
          <label>Email Addresses</label>
          {formData.email.map((email, index) => (
            <div key={`email-${index}`} className="array-field-container">
              <input
                type="email"
                value={email}
                onChange={(e) => handleArrayFieldChange('email', index, e.target.value)}
                className={errors.email && errors.email[index] ? 'error' : ''}
                placeholder="Email address"
              />
              <button
                type="button"
                onClick={() => removeArrayField('email', index)}
                className="remove-field-button"
                disabled={formData.email.length === 1 && !email}
                aria-label="Remove email field"
              >
                -
              </button>
              {errors.email && errors.email[index] && (
                <div className="error-message">{errors.email[index]}</div>
              )}
            </div>
          ))}
          <button
            type="button"
            onClick={() => addArrayField('email')}
            className="add-field-button"
            aria-label="Add email field"
          >
            + Add Email
          </button>
        </div>
        
        <div className="form-group">
          <label>Phone Numbers</label>
          {formData.tel.map((tel, index) => (
            <div key={`tel-${index}`} className="array-field-container">
              <input
                type="tel"
                value={tel}
                onChange={(e) => handleArrayFieldChange('tel', index, e.target.value)}
                placeholder="Phone number"
              />
              <button
                type="button"
                onClick={() => removeArrayField('tel', index)}
                className="remove-field-button"
                disabled={formData.tel.length === 1 && !tel}
                aria-label="Remove phone field"
              >
                -
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => addArrayField('tel')}
            className="add-field-button"
            aria-label="Add phone field"
          >
            + Add Phone
          </button>
        </div>
        
        {submitError && (
          <div className="form-error-message">
            Error: {submitError}
          </div>
        )}

        {deleteError && (
          <div className="form-error-message">
            Error: {deleteError}
          </div>
        )}
        
        <div className="form-actions">
          <div className="form-actions-left">
            {isEditing && onDelete && (
              <button
                type="button"
                onClick={handleDelete}
                className="delete-button"
                aria-label="Delete contact"
              >
                Delete
              </button>
            )}
          </div>
          <div className="form-actions-right">
            <button
              type="button"
              onClick={onCancel}
              className="cancel-button"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="save-button"
            >
              Save Contact
            </button>
          </div>
        </div>
      </form>
  );
};