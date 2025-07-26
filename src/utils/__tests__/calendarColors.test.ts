import { assignDefaultColors, getCalendarColor, getEventCalendarColor } from '../calendarColors';
import { Calendar } from '../../types/dav';

describe('calendarColors', () => {
  describe('assignDefaultColors', () => {
    it('should assign default colors to calendars without colors', () => {
      const calendars = [
        { url: 'cal1', displayName: 'Calendar 1' },
        { url: 'cal2', displayName: 'Calendar 2', color: '#ff0000' },
        { url: 'cal3', displayName: 'Calendar 3' }
      ];

      const result = assignDefaultColors(calendars);

      expect(result[0].color).toBe('#3b82f6'); // First default color
      expect(result[1].color).toBe('#ff0000'); // Existing color preserved
      expect(result[2].color).toBe('#f59e0b'); // Third default color (index 2)
    });

    it('should handle empty array', () => {
      const result = assignDefaultColors([]);
      expect(result).toEqual([]);
    });
  });

  describe('getCalendarColor', () => {
    it('should return existing color if provided', () => {
      const result = getCalendarColor('test-url', '#ff0000');
      expect(result).toBe('#ff0000');
    });

    it('should generate consistent color for same URL', () => {
      const url = 'https://example.com/calendar1';
      const color1 = getCalendarColor(url);
      const color2 = getCalendarColor(url);
      expect(color1).toBe(color2);
    });

    it('should generate different colors for different URLs', () => {
      const color1 = getCalendarColor('https://example.com/calendar1');
      const color2 = getCalendarColor('https://example.com/calendar2');
      expect(color1).not.toBe(color2);
    });
  });

  describe('getEventCalendarColor', () => {
    const calendars: Calendar[] = [
      { url: 'cal1', displayName: 'Calendar 1', color: '#ff0000' },
      { url: 'cal2', displayName: 'Calendar 2', color: '#00ff00' }
    ];

    it('should return calendar color when calendar is found', () => {
      const result = getEventCalendarColor('cal1', calendars);
      expect(result).toBe('#ff0000');
    });

    it('should return generated color when calendar not found', () => {
      const result = getEventCalendarColor('unknown-cal', calendars);
      expect(result).toMatch(/^#[0-9a-f]{6}$/i); // Should be a valid hex color
    });

    it('should return default color when calendarUrl is undefined', () => {
      const result = getEventCalendarColor(undefined, calendars);
      expect(result).toBe('#3b82f6'); // First default color
    });

    it('should handle empty calendars array', () => {
      const result = getEventCalendarColor('cal1', []);
      expect(result).toMatch(/^#[0-9a-f]{6}$/i); // Should be a valid hex color
    });
  });
});