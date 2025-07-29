import React, { useState } from 'react';
import './ColorSelector.css';

interface ColorSelectorProps {
  currentColor: string;
  onColorChange: (color: string) => void;
  onClose: () => void;
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

export const ColorSelector: React.FC<ColorSelectorProps> = ({
  currentColor,
  onColorChange,
  onClose,
}) => {
  const [customColor, setCustomColor] = useState(currentColor);

  const handlePresetColorClick = (color: string) => {
    onColorChange(color);
    onClose();
  };

  const handleCustomColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomColor(e.target.value);
  };

  const handleCustomColorApply = () => {
    onColorChange(customColor);
    onClose();
  };

  return (
    <div className="color-selector-overlay" onClick={onClose}>
      <div className="color-selector" onClick={(e) => e.stopPropagation()}>
        <div className="color-selector-header">
          <h3>Choose Calendar Color</h3>
          <button className="color-selector-close" onClick={onClose}>
            ×
          </button>
        </div>
        
        <div className="color-selector-content">
          <div className="preset-colors">
            <h4>Preset Colors</h4>
            <div className="color-grid">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color}
                  className={`color-option ${currentColor === color ? 'selected' : ''}`}
                  style={{ backgroundColor: color }}
                  onClick={() => handlePresetColorClick(color)}
                  title={color}
                />
              ))}
            </div>
          </div>
          
          <div className="custom-color">
            <h4>Custom Color</h4>
            <div className="custom-color-input">
              <input
                type="color"
                value={customColor}
                onChange={handleCustomColorChange}
                className="color-picker"
              />
              <input
                type="text"
                value={customColor}
                onChange={handleCustomColorChange}
                className="color-text-input"
                placeholder="#000000"
              />
              <button
                className="apply-custom-color"
                onClick={handleCustomColorApply}
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};