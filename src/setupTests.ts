// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

// Mock ICAL.js for testing
jest.mock('ical.js', () => ({
  parse: jest.fn((icalData: string) => {
    // Mock parsing of iCalendar data
    if (icalData.includes('INVALID')) {
      throw new Error('Invalid iCalendar data');
    }
    return [
      'vcalendar',
      [],
      [
        [
          'vevent',
          [],
          [
            ['uid', {}, 'text', 'event1@example.com'],
            ['summary', {}, 'text', 'Test Event'],
            ['description', {}, 'text', 'Test Description'],
            ['location', {}, 'text', 'Test Location'],
            ['dtstart', {}, 'date-time', '2025-07-20T10:00:00Z'],
            ['dtend', {}, 'date-time', '2025-07-20T11:00:00Z']
          ]
        ]
      ]
    ];
  }),
  Component: jest.fn().mockImplementation((jcalData: any) => ({
    getAllSubcomponents: jest.fn((name: string) => {
      if (name === 'vevent') {
        // Return mock VEVENT components that can be used with ICAL.Event
        return [
          {
            // Mock component that ICAL.Event can use
            name: 'vevent',
            jCal: [
              'vevent',
              [],
              [
                ['uid', {}, 'text', 'event1@example.com'],
                ['summary', {}, 'text', 'Test Event'],
                ['description', {}, 'text', 'Test Description'],
                ['location', {}, 'text', 'Test Location'],
                ['dtstart', {}, 'date-time', '2025-07-20T10:00:00Z'],
                ['dtend', {}, 'date-time', '2025-07-20T11:00:00Z']
              ]
            ]
          }
        ];
      }
      return [];
    })
  })),
  Event: jest.fn().mockImplementation((component: any) => ({
    uid: 'event1@example.com',
    summary: 'Test Event',
    description: 'Test Description',
    location: 'Test Location',
    startDate: {
      toJSDate: () => new Date('2025-07-20T10:00:00Z')
    },
    endDate: {
      toJSDate: () => new Date('2025-07-20T11:00:00Z')
    }
  }))
}));

// Mock DOMParser for XML parsing in tests
global.DOMParser = class DOMParser {
  parseFromString(xmlStr: string, mimeType: string): Document {
    // Simple mock implementation for testing
    const mockDoc = {
      getElementsByTagNameNS: (namespace: string, tagName: string) => {
        // Parse the XML string to extract elements
        const elements: any[] = [];
        
        if (tagName === 'response') {
          // Extract response elements from XML
          const responseRegex = /<d:response[^>]*>([\s\S]*?)<\/d:response>/g;
          let match;
          while ((match = responseRegex.exec(xmlStr)) !== null) {
            const responseContent = match[1];
            elements.push({
              getElementsByTagNameNS: (ns: string, tag: string) => {
                if (tag === 'href') {
                  const hrefMatch = responseContent.match(/<d:href[^>]*>(.*?)<\/d:href>/);
                  return hrefMatch ? [{ textContent: hrefMatch[1] }] : [];
                }
                if (tag === 'displayname') {
                  const nameMatch = responseContent.match(/<d:displayname[^>]*>(.*?)<\/d:displayname>/);
                  return nameMatch ? [{ textContent: nameMatch[1] }] : [];
                }
                if (tag === 'resourcetype') {
                  const resourceMatch = responseContent.match(/<d:resourcetype[^>]*>([\s\S]*?)<\/d:resourcetype>/);
                  if (resourceMatch) {
                    return [{
                      getElementsByTagNameNS: (calNs: string, calTag: string) => {
                        if (calTag === 'calendar') {
                          return resourceMatch[1].includes('<c:calendar') ? [{}] : [];
                        }
                        if (calTag === 'addressbook') {
                          return resourceMatch[1].includes('<card:addressbook') ? [{}] : [];
                        }
                        return [];
                      }
                    }];
                  }
                  return [];
                }
                if (tag === 'calendar-color') {
                  const colorMatch = responseContent.match(/<c:calendar-color[^>]*>(.*?)<\/c:calendar-color>/);
                  return colorMatch ? [{ textContent: colorMatch[1] }] : [];
                }
                if (tag === 'getetag') {
                  const etagMatch = responseContent.match(/<d:getetag[^>]*>(.*?)<\/d:getetag>/);
                  return etagMatch ? [{ textContent: etagMatch[1] }] : [];
                }
                if (tag === 'calendar-data') {
                  const dataMatch = responseContent.match(/<c:calendar-data[^>]*>([\s\S]*?)<\/c:calendar-data>/);
                  return dataMatch ? [{ textContent: dataMatch[1] }] : [];
                }
                if (tag === 'address-data') {
                  const dataMatch = responseContent.match(/<card:address-data[^>]*>([\s\S]*?)<\/card:address-data>/);
                  return dataMatch ? [{ textContent: dataMatch[1] }] : [];
                }
                return [];
              }
            });
          }
        }
        
        return elements;
      }
    };
    
    return mockDoc as Document;
  }
};
