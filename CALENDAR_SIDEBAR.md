# Calendar Sidebar Feature

## Overview

The Calendar Sidebar is a new feature that allows users to show and hide individual calendars in the calendar view. It appears as a collapsible sidebar on the right side of the screen when viewing the calendar.

## Features

### Calendar Visibility Toggle
- **Individual Calendar Control**: Each calendar can be shown or hidden independently using checkboxes
- **Visual Indicators**: Each calendar has a color indicator that matches the calendar's color
- **Toggle All**: When multiple calendars are available, users can show/hide all calendars at once

### Responsive Design
- **Desktop**: Sidebar is open by default on screens wider than 1024px
- **Mobile/Tablet**: Sidebar is collapsed by default and can be toggled open
- **Overlay**: On mobile, an overlay appears when the sidebar is open to allow easy closing

### Visual Design
- **Consistent Styling**: Matches the existing navigation sidebar design
- **Color Coding**: Each calendar displays with its server-provided color or a default color
- **Smooth Animations**: Sidebar opens/closes with smooth transitions

## Usage

### Opening/Closing the Sidebar
- Click the calendar icon in the sidebar header to toggle open/closed
- On mobile, tap outside the sidebar to close it

### Managing Calendar Visibility
1. **Show/Hide Individual Calendars**: Click the checkbox next to any calendar name
2. **Show/Hide All Calendars**: Use the "Show All" or "Hide All" button at the top of the calendar list
3. **Visual Feedback**: Checked calendars are visible, unchecked calendars are hidden

### Calendar Colors
- Calendars use colors provided by the CalDAV server when available
- Default colors are automatically assigned to calendars without server-provided colors
- Colors are consistent across sessions and calendar reloads
- **Event Color-Coding**: All calendar events are automatically color-coded to match their respective calendar colors
  - Month view: Events have colored backgrounds and left borders
  - Week view: Events have colored backgrounds and left borders
  - Day view: Events have colored left borders and color indicators

## Technical Implementation

### Components
- **CalendarSidebar**: Main sidebar component with calendar list and controls
- **Calendar Filtering**: Events are filtered based on visible calendar selection
- **State Management**: Calendar visibility state is managed in the main App component

### State Management
```typescript
// Calendar visibility is tracked using a Set of calendar URLs
const [visibleCalendars, setVisibleCalendars] = useState<Set<string>>(new Set());

// Sidebar open/closed state
const [calendarSidebarOpen, setCalendarSidebarOpen] = useState(false);
```

### Event Filtering
Events are filtered in real-time based on visible calendars:
```typescript
events={events.filter(event => 
  event.calendarUrl ? visibleCalendars.has(event.calendarUrl) : true
)}
```

### Event Color-Coding
Events are automatically colored based on their calendar:
```typescript
// Get event color from calendar
const eventColor = getEventCalendarColor(event.calendarUrl, calendars);

// Apply color styling
<div style={{ 
  backgroundColor: eventColor,
  borderLeft: `4px solid ${eventColor}`,
  color: '#ffffff'
}}>
```

## Default Behavior

### Initial State
- All calendars are visible by default when first loaded
- Sidebar is open on desktop (>1024px) and closed on mobile/tablet
- New calendars discovered during sync are automatically made visible

### Persistence
- Calendar visibility state is maintained during the session
- State is reset when the user logs out
- Sidebar open/closed preference adapts to screen size changes

## Accessibility

### Keyboard Navigation
- All controls are keyboard accessible
- Proper ARIA labels for screen readers
- Focus management for sidebar toggle

### Screen Reader Support
- Calendar names are properly labeled
- Checkbox states are announced
- Toggle buttons have descriptive labels

## Browser Compatibility

The calendar sidebar works on all modern browsers and is fully responsive across different screen sizes and devices.