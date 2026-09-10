// nhiquelaseller â€” Design System Tokens
// Dark mode roxo/violeta â€” consistente com nhiqueladriver

export const COLORS = {
  // Fundos
  background: '#FFFFFF',
  surface: '#F8F9FA',
  surface2: '#F3F4F6',
  surface3: '#E5E7EB',
  surfaceCard: '#FFFFFF',

  // Marca
  primary: '#7F00FF',
  primaryLight: '#A855F7',
  primaryDark: '#5B00B5',
  primaryGlow: 'rgba(127, 0, 255, 0.15)',
  primaryTransparent: 'rgba(127, 0, 255, 0.3)',

  // Accent
  accent: '#00D4FF',
  accentGlow: 'rgba(0, 212, 255, 0.15)',

  // Semânticas
  success: '#34C759',
  successBg: 'rgba(52, 199, 89, 0.12)',
  warning: '#FF9F0A',
  warningBg: 'rgba(255, 159, 10, 0.12)',
  error: '#FF3B30',
  errorBg: 'rgba(255, 59, 48, 0.12)',
  info: '#007AFF',
  infoBg: 'rgba(0, 122, 255, 0.12)',

  // Texto
  text: '#111827',
  textSecondary: '#4B5563',
  textMuted: '#9CA3AF',
  textInverse: '#FFFFFF',

  // Bordas e Glass
  border: '#E5E7EB',
  borderLight: 'rgba(0, 0, 0, 0.08)',
  glassBg: 'rgba(255, 255, 255, 0.85)',

  // Status pedidos
  statusPendente: '#FF9F0A',
  statusTransito: '#007AFF',
  statusEntregue: '#34C759',
  statusCancelado: '#FF3B30',
  statusAceite: '#A855F7',
};

export const SIZES = {
  xs: 10,
  sm: 12,
  md: 14,
  base: 16,
  lg: 18,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 40,
};

export const FONTS = {
  regular: { fontWeight: '400' },
  medium: { fontWeight: '500' },
  semibold: { fontWeight: '600' },
  bold: { fontWeight: '700' },
  extrabold: { fontWeight: '800' },
};

export const SHADOWS = {
  sm: {
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  md: {
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  lg: {
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  glow: {
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 10,
  }
};

export const RADIUS = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  full: 999,
};

// Helpers
export const getStatusColor = (status) => {
  switch (status) {
    case 'Pendente': return COLORS.statusPendente;
    case 'Em trânsito':
    case 'Em Trânsito':
    case 'A caminho': return COLORS.statusTransito;
    case 'Entregue':
    case 'Entregue com sucesso': return COLORS.statusEntregue;
    case 'Cancelado':
    case 'Cancelada': return COLORS.statusCancelado;
    case 'Aceite':
    case 'Aceite pelo vendedor':
    case 'Pedido aceite': return COLORS.statusAceite;
    default: return COLORS.primary;
  }
};

export const getStatusBg = (status) => {
  switch (status) {
    case 'Pendente': return COLORS.warningBg;
    case 'Em trânsito':
    case 'Em Trânsito': return COLORS.infoBg;
    case 'Entregue': return COLORS.successBg;
    case 'Cancelado': return COLORS.errorBg;
    case 'Aceite':
    case 'Aceite pelo vendedor': return COLORS.primaryGlow;
    default: return COLORS.primaryGlow;
  }
};

// Estilos comuns reutilizáveis
export const COMMON_STYLES = {
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  card: {
    backgroundColor: COLORS.surfaceCard,
    borderRadius: RADIUS.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    ...SHADOWS.md,
  },
  glassCard: {
    backgroundColor: COLORS.glassBg,
    borderRadius: RADIUS.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    overflow: 'hidden',
    ...SHADOWS.sm,
  },
  input: {
    backgroundColor: COLORS.surface2,
    borderRadius: RADIUS.sm,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: COLORS.text,
    fontSize: SIZES.base,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  inputFocus: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.surface,
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.full,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.glow,
  },
  primaryButtonText: {
    color: COLORS.textInverse,
    fontSize: SIZES.base,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  secondaryButton: {
    backgroundColor: COLORS.surface2,
    borderRadius: RADIUS.full,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  secondaryButtonText: {
    color: COLORS.text,
    fontSize: SIZES.base,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: SIZES.lg,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 16,
  },
  label: {
    fontSize: SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: 8,
    fontWeight: '600',
  },
};
