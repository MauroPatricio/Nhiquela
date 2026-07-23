// nhiquelaseller â€” Design System Tokens
// Dark mode roxo/violeta â€” consistente com nhiqueladriver

export const COLORS = {
  // Fundos
  background: '#0D0D14',
  surface: '#1A1A2E',
  surface2: '#16213E',
  surface3: '#0F3460',
  surfaceCard: '#1E1E32',

  // Marca
  primary: '#7F00FF',
  primaryLight: '#A855F7',
  primaryDark: '#5B00B5',
  primaryGlow: 'rgba(127, 0, 255, 0.15)',

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
  text: '#FFFFFF',
  textSecondary: '#A0A0B5',
  textMuted: '#6B6B80',
  textInverse: '#0D0D14',

  // Bordas
  border: '#2A2A4A',
  borderLight: 'rgba(255, 255, 255, 0.08)',

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
    shadowColor: '#7F00FF',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  md: {
    shadowColor: '#7F00FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  lg: {
    shadowColor: '#7F00FF',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
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
    borderRadius: RADIUS.md,
    padding: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
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
    borderColor: COLORS.border,
  },
  primaryButton: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.sm,
    paddingVertical: 15,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.md,
  },
  primaryButtonText: {
    color: COLORS.text,
    fontSize: SIZES.base,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  sectionTitle: {
    fontSize: SIZES.lg,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 12,
  },
  label: {
    fontSize: SIZES.sm,
    color: COLORS.textSecondary,
    marginBottom: 6,
    fontWeight: '500',
  },
};
