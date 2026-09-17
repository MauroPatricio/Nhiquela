// src/providers/LoadingProvider.tsx
import React, { createContext, useContext, ReactNode } from 'react';
import { View } from 'react-native';
import PremiumLoadingOverlay from '../components/PremiumLoading/PremiumLoadingOverlay';
import { useLoading } from '../hooks/useLoading';

interface LoadingContextType {
  showLoading: (message?: string, options?: any) => void;
  hideLoading: () => void;
  showUpload: (message?: string) => void;
  showProcessing: (message?: string) => void;
  showSuccess: (message?: string) => void;
  showDots: (message?: string) => void;
  isLoading: boolean;
}

const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

export const LoadingProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const loading = useLoading();

  return (
    <LoadingContext.Provider value={loading}>
      {children}
      <PremiumLoadingOverlay {...loading.loadingState} />
    </LoadingContext.Provider>
  );
};

export const useGlobalLoading = (): LoadingContextType => {
  const context = useContext(LoadingContext);
  if (context === undefined) {
    throw new Error('useGlobalLoading must be used within a LoadingProvider');
  }
  return context;
};