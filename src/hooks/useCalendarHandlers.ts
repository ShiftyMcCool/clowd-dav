import { useCallback } from 'react';
import { Calendar, CalendarEvent, DateRange } from '../types/dav';
import { SyncService } from '../services/SyncService';
import { ErrorHandlingService } from '../services/ErrorHandlingService';
import { NetworkService } from '../services/NetworkService';
import { assignDefaultColorsIfMissing } from '../utils/calendarColors';
import { useLoading } from '../contexts/LoadingContext';

interface UseCalendarHandlersProps {
  calendars: Calendar[];
  setCalendars: (calendars: Calendar[] | ((prev: Calendar[]) => Calendar[])) => void;
  setVisibleCalendars: (calendars: Set<string> | ((prev: Set<string>) => Set<string>)) => void;
  setEvents: (events: CalendarEvent[]) => void;
  setShowNewCalendarForm: (show: boolean) => void;
  setEditingCalendar: (calendar: Calendar | null) => void;
  setShowEventForm: (show: boolean) => void;
  setEditingEvent: (event: CalendarEvent | null) => void;
  setSelectedCalendar: (calendar: Calendar | null) => void;
  setInitialDate: (date: Date | undefined) => void;
  currentDateRange: DateRange | null;
  sync: SyncService;
  loadEvents: (dateRange: DateRange) => Promise<void>;
}

export const useCalendarHandlers = ({
  calendars,
  setCalendars,
  setVisibleCalendars,
  setEvents,
  setShowNewCalendarForm,
  setEditingCalendar,
  setShowEventForm,
  setEditingEvent,
  setSelectedCalendar,
  setInitialDate,
  currentDateRange,
  sync,
  loadEvents,
}: UseCalendarHandlersProps) => {
  const { showLoading, hideLoading } = useLoading();
  const errorService = ErrorHandlingService.getInstance();

  const handleCreateCalendar = useCallback(() => {
    setShowNewCalendarForm(true);
  }, [setShowNewCalendarForm]);

  const handleEditCalendar = useCallback((calendar: Calendar) => {
    console.log('Edit calendar clicked:', calendar.displayName);
    setEditingCalendar(calendar);
  }, [setEditingCalendar]);

  const handleNewCalendarSave = useCallback(
    async (displayName: string, color: string, description?: string) => {
      try {
        showLoading("Creating calendar...");

        const newCalendar = await sync.createCalendar(displayName, color, description);

        setCalendars((prevCalendars) => {
          const updatedCalendars = [...prevCalendars, newCalendar];
          return assignDefaultColorsIfMissing(updatedCalendars);
        });

        setVisibleCalendars((prev) => {
          const newSet = new Set(prev);
          newSet.add(newCalendar.url);
          return newSet;
        });

        setShowNewCalendarForm(false);

        errorService.reportError(
          `Calendar "${displayName}" created successfully!`,
          "info"
        );
      } catch (error) {
        console.error("Failed to create calendar:", error);
        throw error;
      } finally {
        hideLoading();
      }
    },
    [sync, errorService, showLoading, hideLoading, setCalendars, setVisibleCalendars, setShowNewCalendarForm]
  );

  const handleNewCalendarCancel = useCallback(() => {
    setShowNewCalendarForm(false);
  }, [setShowNewCalendarForm]);

  const handleEditCalendarSave = useCallback(
    async (
      calendar: Calendar,
      displayName: string,
      color: string,
      description?: string
    ) => {
      try {
        showLoading("Updating calendar...");

        const updatedCalendar = await sync.updateCalendar(
          calendar,
          displayName,
          color,
          description
        );

        setCalendars((prevCalendars) => {
          return prevCalendars.map((c) =>
            c.url === calendar.url ? updatedCalendar : c
          );
        });

        setEditingCalendar(null);

        errorService.reportError(
          `Calendar "${displayName}" updated successfully!`,
          "info"
        );
      } catch (error) {
        console.error("Failed to update calendar:", error);
        throw error;
      } finally {
        hideLoading();
      }
    },
    [sync, errorService, showLoading, hideLoading, setCalendars, setEditingCalendar]
  );

  const handleEditCalendarDelete = useCallback(
    async (calendar: Calendar) => {
      try {
        showLoading("Deleting calendar...");

        await sync.deleteCalendar(calendar);

        setCalendars((prevCalendars) => {
          return prevCalendars.filter((c) => c.url !== calendar.url);
        });

        setVisibleCalendars((prev) => {
          const newVisible = new Set(prev);
          newVisible.delete(calendar.url);
          return newVisible;
        });

        await sync.syncEvents();
        setEditingCalendar(null);

        errorService.reportError(
          `Calendar "${calendar.displayName}" deleted successfully!`,
          "info"
        );
      } catch (error) {
        console.error("Failed to delete calendar:", error);
        throw error;
      } finally {
        hideLoading();
      }
    },
    [sync, errorService, showLoading, hideLoading, setCalendars, setVisibleCalendars, setEditingCalendar]
  );

  const handleEditCalendarCancel = useCallback(() => {
    setEditingCalendar(null);
  }, [setEditingCalendar]);

  const handleCalendarToggle = useCallback((calendarUrl: string) => {
    setVisibleCalendars((prev) => {
      const newVisible = new Set(prev);
      if (newVisible.has(calendarUrl)) {
        newVisible.delete(calendarUrl);
      } else {
        newVisible.add(calendarUrl);
      }
      return newVisible;
    });
  }, [setVisibleCalendars]);

  const handleCalendarColorChange = useCallback(
    async (calendarUrl: string, color: string) => {
      const calendar = calendars.find((cal) => cal.url === calendarUrl);
      if (!calendar) {
        console.error("Calendar not found for color update:", calendarUrl);
        return;
      }

      try {
        await sync.updateCalendarColor(calendar, color);

        setCalendars((prevCalendars) =>
          prevCalendars.map((cal) =>
            cal.url === calendarUrl ? { ...cal, color } : cal
          )
        );
      } catch (error) {
        console.error("Failed to update calendar color:", error);
        errorService.reportError(
          `Failed to update calendar color: ${errorService.formatErrorMessage(error)}`,
          "error"
        );
      }
    },
    [calendars, sync, errorService, setCalendars]
  );

  const handleEventClick = useCallback(
    (event: CalendarEvent) => {
      setEditingEvent(event);

      if (event.calendarUrl) {
        const eventCalendar = calendars.find(
          (cal) => cal.url === event.calendarUrl
        );
        if (eventCalendar) {
          setSelectedCalendar(eventCalendar);
        }
      }

      setShowEventForm(true);
    },
    [calendars, setEditingEvent, setSelectedCalendar, setShowEventForm]
  );

  const handleCreateEvent = useCallback(
    (date: Date) => {
      if (calendars.length > 0) {
        setSelectedCalendar(calendars[0]);
        setEditingEvent(null);
        setShowEventForm(true);
        setInitialDate(date);
      }
    },
    [calendars, setSelectedCalendar, setEditingEvent, setShowEventForm, setInitialDate]
  );

  const handleEventSave = useCallback(
    async (eventData: CalendarEvent, calendar: Calendar) => {
      try {
        const networkService = NetworkService.getInstance();
        const isOnline = networkService.isOnline();

        showLoading(
          eventData.uid
            ? isOnline
              ? "Updating event..."
              : "Updating event (offline)..."
            : isOnline
            ? "Creating event..."
            : "Creating event (offline)..."
        );

        if (eventData.uid) {
          // Check if the calendar has changed
          const originalCalendarUrl = eventData.calendarUrl;
          const newCalendarUrl = calendar.url;

          if (originalCalendarUrl && originalCalendarUrl !== newCalendarUrl) {
            showLoading(
              isOnline
                ? "Moving event to different calendar..."
                : "Moving event to different calendar (offline)..."
            );

            const originalCalendar = calendars.find(
              (cal) => cal.url === originalCalendarUrl
            );
            if (originalCalendar) {
              await sync.deleteEvent(originalCalendar, eventData);
            }

            const eventWithNewCalendar = {
              ...eventData,
              calendarUrl: newCalendarUrl,
            };
            await sync.createEvent(calendar, eventWithNewCalendar);
          } else {
            await sync.updateEvent(calendar, eventData);
          }
        } else {
          const eventWithCalendar = { ...eventData, calendarUrl: calendar.url };
          await sync.createEvent(calendar, eventWithCalendar);
        }

        if (currentDateRange) {
          await loadEvents(currentDateRange);
        }

        if (!isOnline) {
          errorService.reportError(
            `Event ${
              eventData.uid ? "updated" : "created"
            } offline. Changes will sync when connection is restored.`,
            "info"
          );
        }

        setShowEventForm(false);
        setEditingEvent(null);
        setSelectedCalendar(null);
        setInitialDate(undefined);
      } catch (error) {
        console.error("Error saving event:", error);

        const networkService = NetworkService.getInstance();
        const isOnline = networkService.isOnline();

        if (!isOnline) {
          setShowEventForm(false);
          setEditingEvent(null);
          setSelectedCalendar(null);
          setInitialDate(undefined);

          errorService.reportError(
            `Event ${
              eventData.uid ? "updated" : "created"
            } offline. Changes will sync when connection is restored.`,
            "info"
          );
        } else {
          errorService.reportError(
            `Failed to save event: ${errorService.formatErrorMessage(error)}`,
            "error"
          );
          throw error;
        }
      } finally {
        hideLoading();
      }
    },
    [calendars, sync, currentDateRange, loadEvents, errorService, showLoading, hideLoading, setShowEventForm, setEditingEvent, setSelectedCalendar, setInitialDate]
  );

  const handleEventDelete = useCallback(
    async (event: CalendarEvent, calendar: Calendar) => {
      try {
        const networkService = NetworkService.getInstance();
        const isOnline = networkService.isOnline();

        showLoading(
          isOnline ? "Deleting event..." : "Deleting event (offline)..."
        );

        await sync.deleteEvent(calendar, event);

        if (currentDateRange) {
          await loadEvents(currentDateRange);
        }

        if (!isOnline) {
          errorService.reportError(
            "Event deleted offline. Changes will sync when connection is restored.",
            "info"
          );
        }

        setShowEventForm(false);
        setEditingEvent(null);
        setSelectedCalendar(null);
        setInitialDate(undefined);
      } catch (error) {
        console.error("Error deleting event:", error);

        const networkService = NetworkService.getInstance();
        const isOnline = networkService.isOnline();

        if (!isOnline) {
          setShowEventForm(false);
          setEditingEvent(null);
          setSelectedCalendar(null);
          setInitialDate(undefined);

          errorService.reportError(
            "Event deleted offline. Changes will sync when connection is restored.",
            "info"
          );
        } else {
          errorService.reportError(
            `Failed to delete event: ${errorService.formatErrorMessage(error)}`,
            "error"
          );
          throw error;
        }
      } finally {
        hideLoading();
      }
    },
    [sync, currentDateRange, loadEvents, errorService, showLoading, hideLoading, setShowEventForm, setEditingEvent, setSelectedCalendar, setInitialDate]
  );

  const handleEventFormCancel = useCallback(() => {
    setShowEventForm(false);
    setEditingEvent(null);
    setSelectedCalendar(null);
    setInitialDate(undefined);
  }, [setShowEventForm, setEditingEvent, setSelectedCalendar, setInitialDate]);

  return {
    handleCreateCalendar,
    handleEditCalendar,
    handleNewCalendarSave,
    handleNewCalendarCancel,
    handleEditCalendarSave,
    handleEditCalendarDelete,
    handleEditCalendarCancel,
    handleCalendarToggle,
    handleCalendarColorChange,
    handleEventClick,
    handleCreateEvent,
    handleEventSave,
    handleEventDelete,
    handleEventFormCancel,
  };
};