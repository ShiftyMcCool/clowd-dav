import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ColorPicker } from '../ColorPicker';

describe('ColorPicker', () => {
  const mockOnColorChange = jest.fn();
  const mockOnClose = jest.fn();

  beforeEach(() => {
    mockOnColorChange.mockClear();
    mockOnClose.mockClear();
  });

  describe('embedded mode', () => {
    it('renders with current color selected', () => {
      render(
        <ColorPicker
          currentColor="#3b82f6"
          onColorChange={mockOnColorChange}
        />
      );

      expect(screen.getByText('Custom Color')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('#3b82f6')).toHaveValue('#3b82f6');
    });

    it('calls onColorChange immediately when preset color is clicked', () => {
      render(
        <ColorPicker
          currentColor="#3b82f6"
          onColorChange={mockOnColorChange}
        />
      );

      const redColorButton = screen.getByRole('button', { name: '#ef4444' });
      fireEvent.click(redColorButton);

      expect(mockOnColorChange).toHaveBeenCalledWith('#ef4444');
    });

    it('calls onColorChange immediately when custom color changes', () => {
      render(
        <ColorPicker
          currentColor="#3b82f6"
          onColorChange={mockOnColorChange}
        />
      );

      const customColorInput = screen.getByPlaceholderText('#3b82f6');
      fireEvent.change(customColorInput, { target: { value: '#123456' } });

      expect(mockOnColorChange).toHaveBeenCalledWith('#123456');
    });
  });

  describe('modal mode', () => {
    it('renders with current color selected and title', () => {
      render(
        <ColorPicker
          modal={true}
          title="Choose Calendar Color"
          currentColor="#3b82f6"
          onColorChange={mockOnColorChange}
          onClose={mockOnClose}
        />
      );

      expect(screen.getByText('Choose Calendar Color')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('#000000')).toHaveValue('#3b82f6');
    });

    it('calls onColorChange and onClose when preset color is clicked', () => {
      render(
        <ColorPicker
          modal={true}
          currentColor="#3b82f6"
          onColorChange={mockOnColorChange}
          onClose={mockOnClose}
        />
      );

      const redColorButton = screen.getByRole('button', { name: '#ef4444' });
      fireEvent.click(redColorButton);

      expect(mockOnColorChange).toHaveBeenCalledWith('#ef4444');
      expect(mockOnClose).toHaveBeenCalled();
    });

    it('calls onClose when close button is clicked', () => {
      render(
        <ColorPicker
          modal={true}
          currentColor="#3b82f6"
          onColorChange={mockOnColorChange}
          onClose={mockOnClose}
        />
      );

      const closeButton = screen.getByText('×');
      fireEvent.click(closeButton);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('calls onClose when overlay is clicked', () => {
      render(
        <ColorPicker
          modal={true}
          currentColor="#3b82f6"
          onColorChange={mockOnColorChange}
          onClose={mockOnClose}
        />
      );

      const overlay = document.querySelector('.color-picker-overlay');
      fireEvent.click(overlay!);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('applies custom color when Apply button is clicked', () => {
      render(
        <ColorPicker
          modal={true}
          currentColor="#3b82f6"
          onColorChange={mockOnColorChange}
          onClose={mockOnClose}
        />
      );

      const customColorInput = screen.getByPlaceholderText('#000000');
      fireEvent.change(customColorInput, { target: { value: '#123456' } });

      const applyButton = screen.getByText('Apply');
      fireEvent.click(applyButton);

      expect(mockOnColorChange).toHaveBeenCalledWith('#123456');
      expect(mockOnClose).toHaveBeenCalled();
    });
  });
});