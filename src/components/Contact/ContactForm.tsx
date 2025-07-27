import React, { useState, useRef, useCallback } from 'react';
import ReactCrop, { Crop, PixelCrop, centerCrop, makeAspectCrop } from 'react-image-crop';
import { Contact, AddressBook } from '../../types/dav';
import { DAVClient } from '../../services/DAVClient';
import { useLoading } from '../../contexts/LoadingContext';
import 'react-image-crop/dist/ReactCrop.css';
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
    photo?: string;
  }>({
    firstName: contact?.firstName || '',
    lastName: contact?.lastName || '',
    org: contact?.org || '',
    email: contact?.email || [''],
    tel: contact?.tel || [''],
    photo: contact?.photo || undefined
  });
  
  const [errors, setErrors] = useState<{
    firstName?: string;
    lastName?: string;
    email?: string[];
  }>({});
  
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  
  // Image cropping state
  const [imgSrc, setImgSrc] = useState<string>('');
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [showCropper, setShowCropper] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

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
        uid: contact?.uid || `contact-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`,
        fn: fullName || 'Unnamed Contact',
        firstName: formData.firstName || undefined,
        lastName: formData.lastName || undefined,
        org: filteredData.org || undefined,
        email: filteredData.email.length > 0 ? filteredData.email : undefined,
        tel: filteredData.tel.length > 0 ? filteredData.tel : undefined,
        photo: formData.photo || undefined,
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

  // Handle file selection for cropping
  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Check file type
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        setImgSrc(reader.result?.toString() || '');
        setShowCropper(true);
      };
      reader.readAsDataURL(file);
    }
  };

  // Initialize crop when image loads
  const onImageLoad = useCallback((e: React.SyntheticEvent<HTMLImageElement>) => {
    const { width, height } = e.currentTarget;
    const crop = centerCrop(
      makeAspectCrop(
        {
          unit: '%',
          width: 90,
        },
        1, // 1:1 aspect ratio for square avatar
        width,
        height
      ),
      width,
      height
    );
    setCrop(crop);
  }, []);

  // Generate cropped image canvas
  const getCroppedImg = useCallback((
    image: HTMLImageElement,
    crop: PixelCrop,
    fileName: string = 'cropped.jpg'
  ): Promise<string> => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('No 2d context');
    }

    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;

    // Set canvas size to desired output size (300x300 for avatars)
    const outputSize = 300;
    canvas.width = outputSize;
    canvas.height = outputSize;

    ctx.drawImage(
      image,
      crop.x * scaleX,
      crop.y * scaleY,
      crop.width * scaleX,
      crop.height * scaleY,
      0,
      0,
      outputSize,
      outputSize
    );

    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          throw new Error('Canvas is empty');
        }
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      }, 'image/jpeg', 0.9);
    });
  }, []);

  // Apply crop and save
  const applyCrop = useCallback(async () => {
    if (completedCrop && imgRef.current) {
      try {
        const croppedImageUrl = await getCroppedImg(imgRef.current, completedCrop);
        setFormData(prev => ({
          ...prev,
          photo: croppedImageUrl
        }));
        setShowCropper(false);
        setImgSrc('');
      } catch (error) {
        console.error('Error cropping image:', error);
        alert('Failed to crop image. Please try again.');
      }
    }
  }, [completedCrop, getCroppedImg]);

  // Cancel cropping
  const cancelCrop = () => {
    setShowCropper(false);
    setImgSrc('');
    setCrop(undefined);
    setCompletedCrop(undefined);
  };

  // Remove photo
  const removePhoto = () => {
    setFormData(prev => ({
      ...prev,
      photo: undefined
    }));
  };

  // Get initials for avatar fallback
  const getInitials = (firstName: string, lastName: string): string => {
    const first = firstName.charAt(0).toUpperCase();
    const last = lastName.charAt(0).toUpperCase();
    return first + last || 'U';
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
          <label>Photo</label>
          <div className="photo-upload-container">
            <div className="photo-preview">
              {formData.photo ? (
                <img 
                  src={formData.photo} 
                  alt="Contact"
                  className="photo-preview-image"
                />
              ) : (
                <div className="photo-preview-placeholder">
                  {getInitials(formData.firstName, formData.lastName)}
                </div>
              )}
            </div>
            <div className="photo-upload-controls">
              <input
                type="file"
                id="photo"
                accept="image/*"
                onChange={handlePhotoChange}
                className="photo-input"
              />
              <label htmlFor="photo" className="photo-upload-button">
                {formData.photo ? 'Change Photo' : 'Add Photo'}
              </label>
              {formData.photo && (
                <button
                  type="button"
                  onClick={removePhoto}
                  className="photo-remove-button"
                >
                  Remove
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Image Cropping Modal */}
        {showCropper && (
          <div className="crop-modal-overlay">
            <div className="crop-modal">
              <div className="crop-modal-header">
                <h3>Crop Photo</h3>
                <p>Drag to reposition and resize the crop area</p>
              </div>
              <div className="crop-container">
                <ReactCrop
                  crop={crop}
                  onChange={(_, percentCrop) => setCrop(percentCrop)}
                  onComplete={(c) => setCompletedCrop(c)}
                  aspect={1}
                  minWidth={50}
                  minHeight={50}
                  circularCrop
                >
                  <img
                    ref={imgRef}
                    alt="Crop me"
                    src={imgSrc}
                    onLoad={onImageLoad}
                    className="crop-image"
                  />
                </ReactCrop>
              </div>
              <div className="crop-modal-actions">
                <button
                  type="button"
                  onClick={cancelCrop}
                  className="cancel-button"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={applyCrop}
                  className="save-button"
                  disabled={!completedCrop}
                >
                  Apply Crop
                </button>
              </div>
            </div>
          </div>
        )}
        
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