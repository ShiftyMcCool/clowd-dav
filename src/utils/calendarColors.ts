// Default calendar colors for when server doesn't provide them
const DEFAULT_COLORS = [
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
];

/**
 * Assigns default colors to calendars that don't have one
 */
export function assignDefaultColors<T extends { url: string; color?: string }>(
  calendars: T[]
): T[] {
  return calendars.map((calendar, index) => ({
    ...calendar,
    color: calendar.color || DEFAULT_COLORS[index % DEFAULT_COLORS.length],
  }));
}

/**
 * Gets a color for a calendar URL (useful for consistent coloring)
 */
export function getCalendarColor(calendarUrl: string, existingColor?: string): string {
  if (existingColor) {
    return existingColor;
  }
  
  // Generate a consistent color based on the URL hash
  let hash = 0;
  for (let i = 0; i < calendarUrl.length; i++) {
    const char = calendarUrl.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  const colorIndex = Math.abs(hash) % DEFAULT_COLORS.length;
  return DEFAULT_COLORS[colorIndex];
}

/**
 * Gets calendar color from a list of calendars by URL
 */
export function getEventCalendarColor(
  calendarUrl: string | undefined, 
  calendars: { url: string; color?: string }[]
): string {
  if (!calendarUrl) {
    return DEFAULT_COLORS[0]; // Default color for events without calendar URL
  }
  
  const calendar = calendars.find(cal => cal.url === calendarUrl);
  return calendar?.color || getCalendarColor(calendarUrl);
}