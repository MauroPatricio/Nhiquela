export const COLORS = {
  // Cores principais - Azul gradient
  primary: '#1E40AF' as const,
  primaryLight: '#3B82F6' as const, 
  primaryDark: '#1E3A8A' as const,
  
  // Cores secundárias
  secondary: '#10B981' as const,
  secondaryLight: '#34D399' as const,

  gray: '#6B7280' as const, // cor neutra padrão

  
  // Cores de estado
  success: '#10B981' as const,
  warning: '#F59E0B' as const,
  error: '#EF4444' as const,
  
  // Cores neutras
  white: '#FFFFFF' as const,
  black: '#000000' as const,
  gray50: '#F9FAFB' as const,
  gray100: '#F3F4F6' as const,
  gray500: '#6B7280' as const,
  gray800: '#1F2937' as const,

  gray300: '#D1D5DB',
  gray600: '#4B5563',
  
  // Gradientes - Agora como readonly arrays
  // gradientPrimary: ['#1E40AF', '#3B82F6'] as const,
  gradientPrimary: ['#7F00FF', '#1E40AF'] as const, // lilás → preto

  gradientSecondary: ['#10B981', '#34D399'] as const,
  gradientDark: ['#1E3A8A', '#1E40AF'] as const, // Ajustei para usar cores existentes
  
  // Cores adicionais para texto
  textPrimary: '#1F2937' as const,
  textSecondary: '#6B7280' as const,
  textLight: '#9CA3AF' as const,
} as const;

// Tipos para os gradientes (opcional, mas ajuda o TypeScript)
export type GradientColors = readonly [string, string, ...string[]];