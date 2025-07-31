import React from "react";
import { Contact } from "../../types/dav";
import { EditIcon } from "./EditIcon";
import "./ContactCard.css";

interface ContactCardProps {
  contact: Contact;
  onClick: (contact: Contact) => void;
  onEdit: (contact: Contact) => void;
  addressBookColor?: string;
}

export const ContactCard: React.FC<ContactCardProps> = ({
  contact,
  onClick,
  onEdit,
  addressBookColor,
}) => {
  const handleEditClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit(contact);
  };

  const getInitials = (name: string): string => {
    return name
      .split(" ")
      .map((word) => word.charAt(0))
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const primaryEmail = contact.email?.[0];
  const primaryPhone = contact.tel?.[0];

  // Convert hex color to rgba for transparency
  const getColorWithOpacity = (color: string, opacity: number): string => {
    if (!color || color === 'transparent') return 'transparent';
    
    // Handle hex colors
    if (color.startsWith('#')) {
      const hex = color.slice(1);
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      return `rgba(${r}, ${g}, ${b}, ${opacity})`;
    }
    
    // Handle rgb/rgba colors - just append opacity
    if (color.startsWith('rgb')) {
      return color.replace('rgb(', 'rgba(').replace(')', `, ${opacity})`);
    }
    
    return color;
  };

  return (
    <div 
      className="contact-card" 
      onClick={() => onClick(contact)}
      style={{
        '--address-book-color-light': getColorWithOpacity(addressBookColor || '', 0.15),
        '--address-book-color-hover': getColorWithOpacity(addressBookColor || '', 0.25)
      } as React.CSSProperties}
    >
      <div className="contact-card-header">
        <div className="contact-header-left">
          <div className="contact-avatar">
            {contact.photo ? (
              <img
                src={contact.photo}
                alt={contact.fn}
                className="contact-avatar-image"
                onError={(e) => {
                  // Fallback to initials if image fails to load
                  const target = e.target as HTMLImageElement;
                  target.style.display = "none";
                  const parent = target.parentElement;
                  if (parent) {
                    parent.classList.add("contact-avatar-fallback");
                    parent.textContent = getInitials(contact.fn);
                  }
                }}
              />
            ) : (
              getInitials(contact.fn)
            )}
          </div>
          <div
            className={`contact-header-info ${
              contact.org ? "has-company" : "no-company"
            }`}
          >
            <h3 className="contact-name">{contact.fn}</h3>
            {contact.org && <p className="contact-org">{contact.org}</p>}
            {contact.addressBookName && (
              <p className="contact-address-book" title={`From: ${contact.addressBookName}`}>
                {contact.addressBookName}
              </p>
            )}
          </div>
        </div>
        <button
          className="contact-card-edit-btn"
          onClick={handleEditClick}
          aria-label="Edit contact"
          title="Edit contact"
        >
          <EditIcon size={16} />
        </button>
      </div>

      <div className="contact-card-content">
        {primaryEmail && (
          <p className="contact-email" title={primaryEmail}>
            {primaryEmail}
          </p>
        )}

        {primaryPhone && (
          <p className="contact-phone" title={primaryPhone}>
            {primaryPhone}
          </p>
        )}
      </div>
    </div>
  );
};
