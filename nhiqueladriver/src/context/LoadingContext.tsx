// src/contexts/LoadingContext.tsx
import React, { createContext, useContext, ReactNode } from 'react';
import { useLoading } from '../hooks/useLoading';
import PremiumLoadingOverlay from '../components/PremiumLoading/PremiumLoadingOverlay';

// Cria o contexto
const LoadingContext = createContext<ReturnType<typeof useLoading> | null>(null);

// Props do Provider
interface LoadingProviderProps {
  children: ReactNode;
}

// Componente Provider
export const LoadingProvider: React.FC<LoadingProviderProps> = ({ children }) => {
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

// Hook para usar o contexto
export const useLoadingContext = () => {
  const context = useContext(LoadingContext);
  if (!context) {
    throw new Error('useLoadingContext must be used within LoadingProvider');
  }
  return context;
};