export const COLORS = {
  // Cores principais - Nhiquela Roxo
  primary: '#7F00FF' as const,
  primaryLight: '#9b4dff' as const, 
  primaryDark: '#7F00FF' as const,
  
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
  
  // Gradientes
  gradientPrimary: ['#7F00FF', '#7F00FF'] as const, 

  gradientSecondary: ['#10B981', '#34D399'] as const,
  gradientDark: ['#7F00FF', '#7F00FF'] as const,
  
  // Cores adicionais para texto
  textPrimary: '#1F2937' as const,
  textSecondary: '#6B7280' as const,
  textLight: '#9CA3AF' as const,
} as const;

// Tipos para os gradientes (opcional, mas ajuda o TypeScript)
export type GradientColors = readonly [string, string, ...string[]];