import React, { Suspense, lazy } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthConfig } from '../types/auth';

const SetupForm = lazy(() =>
  import('./SetupForm').then((module) => ({
    default: module.SetupForm,
  }))
);

interface SetupComponentProps {
  onSetupComplete?: (config: AuthConfig, masterPassword?: string) => Promise<void>;
}

export const SetupComponent: React.FC<SetupComponentProps> = ({ 
  onSetupComplete 
}) => {
  const navigate = useNavigate();

  const handleSetup = async (config: AuthConfig, masterPassword?: string) => {
    if (onSetupComplete) {
      await onSetupComplete(config, masterPassword);
    }
    navigate("/calendar");
  };

  return (
    <Suspense fallback={<div />}>
      <SetupForm onSetupComplete={handleSetup} />
    </Suspense>
  );
};