# Calendar Color Selector Feature

## Overview
Added a comprehensive color selector feature that allows users to customize calendar colors with both preset and custom color options. The selected colors are stored on the CalDAV server using the standard `calendar-color` property and synchronized across all devices and clients.

## Features

### 🎨 Color Selector Component
- **Preset Colors**: 16 predefined colors matching the existing default palette
- **Custom Colors**: Color picker and hex input for unlimited color choices
- **Visual Feedback**: Selected color is highlighted with a checkmark
- **Responsive Design**: Works on both desktop and mobile devices

### 🔧 Integration Points
- **Navigation Sidebar**: Click on any calendar's color indicator to open the color selector
- **Server Storage**: Colors are stored on the CalDAV server using PROPPATCH requests
- **Real-time Updates**: Calendar colors update immediately throughout the app
- **Offline Support**: Color changes work offline and sync when connection is restored

### 📱 User Experience
- **Intuitive Interface**: Click the small colored circle next to any calendar name
- **Modal Design**: Non-intrusive overlay that can be closed by clicking outside
- **Hover Effects**: Color indicators have subtle hover animations for better discoverability

## Technical Implementation

### New Components
- `ColorPicker.tsx` - Unified color picker component supporting both embedded and modal modes
- `ColorPicker.css` - Responsive styling with theme support for both modes

### Enhanced Services
- `DAVClient.ts` - Added server color management:
  - `updateCalendarProperties()` - Update calendar properties on server
  - Enhanced calendar discovery to parse `calendar-color` property
- `SyncService.ts` - Added offline-capable color updates:
  - `updateCalendarColor()` - Update colors with offline support
  - Pending operations support for calendar property updates
- `calendarColors.ts` - Simplified to work with server colors:
  - `assignDefaultColorsIfMissing()` - Apply defaults only when server has no color

### Updated Components
- `Navigation.tsx` - Added color selector integration
- `App.tsx` - Added color change handler and state management

### Storage
- Calendar colors are stored on the CalDAV server using the `calendar-color` property
- Colors are synchronized across all devices and clients that support CalDAV
- Offline color changes are queued and synchronized when connection is restored
- Server-provided colors take precedence over default colors

## Usage Instructions

1. **Open Calendar View**: Navigate to the calendar section in the sidebar
2. **Expand Calendar List**: Click the expand arrow next to "Calendar" 
3. **Select Color**: Click on the small colored circle next to any calendar name
4. **Choose Color**: 
   - Click any preset color for instant application
   - Use the color picker or hex input for custom colors
   - Click "Apply" for custom colors
5. **Close**: Click outside the modal or the × button to close

## Color Palette
The preset colors include:
- Blue (#3b82f6) - Default
- Green (#10b981)
- Yellow (#f59e0b) 
- Red (#ef4444)
- Purple (#8b5cf6)
- Cyan (#06b6d4)
- Orange (#f97316)
- Lime (#84cc16)
- Pink (#ec4899)
- Gray (#6b7280)
- Teal (#14b8a6)
- Rose (#f43f5e)
- Violet (#a855f7)
- Emerald (#22c55e)
- Amber (#eab308)
- Slate (#64748b)

## Testing
- Comprehensive unit tests for ColorPicker component covering both embedded and modal modes
- Existing calendar color utility tests continue to pass
- Build process validates TypeScript integration

## CalDAV Compatibility
- Uses standard CalDAV `calendar-color` property (RFC 4791 extension)
- Compatible with most modern CalDAV servers (Nextcloud, Radicale, etc.)
- Graceful fallback to default colors if server doesn't support color property
- Offline color changes are queued and synchronized when online

## Browser Compatibility
- Modern browsers with CSS custom properties support
- HTML5 color input support for enhanced color picker
- Graceful fallback for older browsers

## Future Enhancements
- Color themes/palettes for quick calendar organization
- Calendar color suggestions based on calendar names
- Accessibility improvements for color-blind users
- Support for additional calendar properties (description, timezone)