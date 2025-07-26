import React from 'react';
import { render } from '@testing-library/react';
import { CalendarGrid } from '../CalendarGrid';
import { EventList } from '../EventList';
import { Calendar, CalendarEvent } from '../../../types/dav';

const mockCalendars: Calendar[] = [
  {
    url: 'https://example.com/calendar1',
    displayName: 'Personal Calendar',
    color: '#ff0000'
  },
  {
    url: 'https://example.com/calendar2',
    displayName: 'Work Calendar',
    color: '#00ff00'
  }
];

const mockEvents: CalendarEvent[] = [
  {
    uid: 'event1',
    summary: 'Personal Event',
    description: 'Personal Description',
    dtstart: new Date('2024-01-15T10:00:00Z'),
    dtend: new Date('2024-01-15T11:00:00Z'),
    calendarUrl: 'https://example.com/calendar1'
  },
  {
    uid: 'event2',
    summary: 'Work Event',
    description: 'Work Description',
    dtstart: new Date('2024-01-15T14:00:00Z'),
    dtend: new Date('2024-01-15T15:00:00Z'),
    calendarUrl: 'https://example.com/calendar2'
  }
];

describe('Calendar Color Integration', () => {
  describe('CalendarGrid', () => {
    it('should apply calendar colors to events in month view', () => {
      const { container } = render(
        <CalendarGrid
          currentDate={new Date('2024-01-15')}
          viewType="month"
          events={mockEvents}
          calendars={mockCalendars}
        />
      );

      const eventElements = container.querySelectorAll('.event-item');
      expect(eventElements.length).toBeGreaterThan(0);
      
      // Check that events have background colors applied
      eventElements.forEach(element => {
        const style = window.getComputedStyle(element);
        expect(style.backgroundColor).toBeTruthy();
      });
    });

    it('should apply calendar colors to events in week view', () => {
      const { container } = render(
        <CalendarGrid
          currentDate={new Date('2024-01-15')}
          viewType="week"
          events={mockEvents}
          calendars={mockCalendars}
        />
      );

      const eventElements = container.querySelectorAll('.event-item');
      expect(eventElements.length).toBeGreaterThan(0);
      
      // Check that events have background colors applied
      eventElements.forEach(element => {
        const style = window.getComputedStyle(element);
        expect(style.backgroundColor).toBeTruthy();
      });
    });
  });

  describe('EventList', () => {
    it('should apply calendar colors to events in day view', () => {
      const { container } = render(
        <EventList
          date={new Date('2024-01-15')}
          events={mockEvents}
          calendars={mockCalendars}
        />
      );

      const eventElements = container.querySelectorAll('.event-list-item');
      expect(eventElements.length).toBe(2);
      
      // Check that events have border colors applied
      eventElements.forEach(element => {
        const style = window.getComputedStyle(element);
        expect(style.borderLeftColor).toBeTruthy();
      });

      // Check that color indicators are present
      const colorIndicators = container.querySelectorAll('.event-color-indicator');
      expect(colorIndicators.length).toBe(2);
      
      colorIndicators.forEach(indicator => {
        const style = window.getComputedStyle(indicator);
        expect(style.backgroundColor).toBeTruthy();
      });
    });

    it('should handle events without calendar URLs', () => {
      const eventsWithoutCalendar = [
        {
          uid: 'event-no-cal',
          summary: 'Event without calendar',
          description: 'Description',
          dtstart: new Date('2024-01-15T10:00:00Z'),
          dtend: new Date('2024-01-15T11:00:00Z')
          // No calendarUrl
        }
      ];

      const { container } = render(
        <EventList
          date={new Date('2024-01-15')}
          events={eventsWithoutCalendar}
          calendars={mockCalendars}
        />
      );

      const eventElements = container.querySelectorAll('.event-list-item');
      expect(eventElements.length).toBe(1);
      
      // Should still have color applied (default color)
      const colorIndicator = container.querySelector('.event-color-indicator');
      expect(colorIndicator).toBeTruthy();
      
      if (colorIndicator) {
        const style = window.getComputedStyle(colorIndicator);
        expect(style.backgroundColor).toBeTruthy();
      }
    });
  });
});