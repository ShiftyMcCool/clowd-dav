import React from 'react';
import { render, screen } from '@testing-library/react';
import App from './App';

test('renders setup form when not authenticated', () => {
  render(<App />);
  const setupTitle = screen.getByText(/CalDAV\/CardDAV Server Setup/i);
  expect(setupTitle).toBeInTheDocument();
});
