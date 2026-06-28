// src/hooks/useLoading.ts
import { useState, useCallback } from 'react';
import { PremiumLoadingProps } from '../components/PremiumLoading/PremiumLoadingOverlay';

interface LoadingState extends Omit<PremiumLoadingProps, 'visible'> {
  visible: boolean;
  id?: string;
}

export const useLoading = () => {
  const [loadingState, setLoadingState] = useState<LoadingState>({ 
    visible: false,
    message: 'Processando...',
    type: 'default'
  });

  const showLoading = useCallback((
    message?: string, 
    options?: Omit<PremiumLoadingProps, 'visible' | 'message'>
  ) => {
    setLoadingState({
      visible: true,
      message: message || 'Processando...',
      type: 'default',
      ...options
    });
  }, []);

  const hideLoading = useCallback(() => {
    setLoadingState(prev => ({ ...prev, visible: false }));
  }, []);

  const showUpload = useCallback((message: string = 'Enviando arquivos...') => {
    showLoading(message, { type: 'upload' });
  }, [showLoading]);

  const showProcessing = useCallback((message: string = 'Processando dados...') => {
    showLoading(message, { type: 'processing' });
  }, [showLoading]);

  const showSuccess = useCallback((message: string = 'Concluído!') => {
    showLoading(message, { type: 'success' });
    
    // Auto-hide após sucesso (opcional)
    setTimeout(() => {
      hideLoading();
    }, 2000);
  }, [showLoading, hideLoading]);

  const showDots = useCallback((message: string = 'Carregando...') => {
    showLoading(message, { type: 'dots' });
  }, [showLoading]);

  // Função para atualizar mensagem sem alterar visibilidade
  const updateMessage = useCallback((message: string) => {
    setLoadingState(prev => ({ ...prev, message }));
  }, []);

  return {
    loadingState,
    showLoading,
    hideLoading,
    showUpload,
    showProcessing,
    showSuccess,
    showDots,
    updateMessage,
    isLoading: loadingState.visible
  };
};