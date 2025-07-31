import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { ProtectedRoute } from './ProtectedRoute';

interface AppRoutesProps {
  isAuthenticated: boolean;
  setupComponent: React.ReactNode;
  calendarComponent: React.ReactNode;
  contactsComponent: React.ReactNode;
}

export const AppRoutes: React.FC<AppRoutesProps> = ({ 
  isAuthenticated,
  setupComponent,
  calendarComponent,
  contactsComponent,
}) => {
  return (
    <Routes>
      <Route
        path="/setup"
        element={
          isAuthenticated ? (
            <Navigate to="/calendar" replace />
          ) : (
            setupComponent
          )
        }
      />

      <Route
        path="/calendar"
        element={
          <ProtectedRoute isAuthenticated={isAuthenticated}>
            {calendarComponent}
          </ProtectedRoute>
        }
      />

      <Route
        path="/contacts"
        element={
          <ProtectedRoute isAuthenticated={isAuthenticated}>
            {contactsComponent}
          </ProtectedRoute>
        }
      />

      <Route
        path="/"
        element={
          isAuthenticated ? (
            <Navigate to="/calendar" replace />
          ) : (
            <Navigate to="/setup" replace />
          )
        }
      />
    </Routes>
  );
};