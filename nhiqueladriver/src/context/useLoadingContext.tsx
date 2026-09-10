// src/contexts/LoadingContext.tsx
import React, { createContext, useContext } from 'react';
import { useLoading } from '../hooks/useLoading';
import PremiumLoadingOverlay from '../components/PremiumLoading/PremiumLoadingOverlay';

const LoadingContext = createContext<ReturnType<typeof useLoading> | null>(null);

export const LoadingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const loading = useLoading();

  return (
    <LoadingContext.Provider value={loading}>
      {children}
      <PremiumLoadingOverlay
        visible={loading.loadingState.visible}
        message={loading.loadingState.message}
        type={loading.loadingState.type}
      />
    </LoadingContext.Provider>
  );
};

export const useLoadingContext = () => {
  const context = useContext(LoadingContext);
  if (!context) {
    throw new Error('useLoadingContext must be used within LoadingProvider');
  }
  return context;
};