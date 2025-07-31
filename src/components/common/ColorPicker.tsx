import React, { useState } from 'react';
import './ColorPicker.css';

interface ColorPickerProps {
  currentColor: string;
  onColorChange: (color: string) => void;
  className?: string;
  modal?: boolean;
  onClose?: () => void;
  title?: string;
}

const PRESET_COLORS = [
  '#3b82f6', // Blue
  '#10b981', // Green
  '#f59e0b', // Yellow
  '#ef4444', // Red
  '#8b5cf6', // Purple
  '#06b6d4', // Cyan
  '#f97316', // Orange
  '#84cc16', // Lime
  '#ec4899', // Pink
  '#6b7280', // Gray
  '#14b8a6', // Teal
  '#f43f5e', // Rose
  '#a855f7', // Violet
  '#22c55e', // Emerald
  '#eab308', // Amber
  '#64748b', // Slate
];

export const ColorPicker: React.FC<ColorPickerProps> = ({
  currentColor,
  onColorChange,
  className = '',
  modal = false,
  onClose,
  title = 'Choose Color',
}) => {
  const [customColor, setCustomColor] = useState(currentColor);

  const handlePresetColorClick = (color: string) => {
    onColorChange(color);
    setCustomColor(color);
    if (modal && onClose) {
      onClose();
    }
  };

  const handleCustomColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newColor = e.target.value;
    setCustomColor(newColor);
    if (!modal) {
      onColorChange(newColor);
    }
  };

  const handleCustomColorApply = () => {
    onColorChange(customColor);
    if (modal && onClose) {
      onClose();
    }
  };

  const content = (
    <div className={`color-picker-content ${className}`}>
      <div className="preset-colors">
        {modal && <h4>Preset Colors</h4>}
        <div className="color-grid">
          {PRESET_COLORS.map((color) => (
            <button
              key={color}
              className={`color-option ${currentColor === color ? 'selected' : ''}`}
              style={{ backgroundColor: color }}
              onClick={() => handlePresetColorClick(color)}
              title={color}
              type="button"
            />
          ))}
        </div>
      </div>
      
      <div className="custom-color">
        {modal && <h4>Custom Color</h4>}
        {!modal && <div className="custom-color-label">Custom Color</div>}
        <div className="custom-color-input">
          <input
            type="color"
            value={customColor}
            onChange={handleCustomColorChange}
            className="color-picker-input"
            title="Choose custom color"
          />
          <input
            type="text"
            value={customColor}
            onChange={handleCustomColorChange}
            className="color-text-input"
            placeholder={modal ? "#000000" : "#3b82f6"}
            pattern="^#[0-9A-Fa-f]{6}$"
            title="Enter hex color code"
          />
          {modal && (
            <button
              className="apply-custom-color"
              onClick={handleCustomColorApply}
              type="button"
            >
              Apply
            </button>
          )}
        </div>
      </div>
    </div>
  );

  if (modal) {
    return (
      <div className="color-picker-overlay" onClick={onClose}>
        <div className="color-picker-modal" onClick={(e) => e.stopPropagation()}>
          <div className="color-picker-header">
            <h3>{title}</h3>
            <button className="color-picker-close" onClick={onClose} type="button">
              ×
            </button>
          </div>
          {content}
        </div>
      </div>
    );
  }

  return <div className="color-picker-embedded">{content}</div>;
};