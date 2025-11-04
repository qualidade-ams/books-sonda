import { TipoCobrancaType } from '@/types/requerimentos';

// Interface para definição de cores
export interface CobrancaColors {
  bg: string;
  border: string;
  text: string;
  badge: string;
  hover: string;
  ring: string;
}

// Sistema de cores para tipos de cobrança
export const COBRANCA_COLORS: Record<TipoCobrancaType, CobrancaColors> = {
  'Banco de Horas': {
    bg: 'bg-blue-50',
    border: 'border-blue-200',
    text: 'text-blue-800',
    badge: 'bg-blue-500',
    hover: 'hover:bg-blue-100',
    ring: 'ring-blue-200'
  },
  'Cobro Interno': {
    bg: 'bg-green-50',
    border: 'border-green-200',
    text: 'text-green-800',
    badge: 'bg-green-500',
    hover: 'hover:bg-green-100',
    ring: 'ring-green-200'
  },
  'Contrato': {
    bg: 'bg-gray-50',
    border: 'border-gray-200',
    text: 'text-gray-800',
    badge: 'bg-gray-500',
    hover: 'hover:bg-gray-100',
    ring: 'ring-gray-200'
  },
  'Faturado': {
    bg: 'bg-orange-50',
    border: 'border-orange-200',
    text: 'text-orange-800',
    badge: 'bg-orange-500',
    hover: 'hover:bg-orange-100',
    ring: 'ring-orange-200'
  },
  'Hora Extra': {
    bg: 'bg-red-50',
    border: 'border-red-200',
    text: 'text-red-800',
    badge: 'bg-red-500',
    hover: 'hover:bg-red-100',
    ring: 'ring-red-200'
  },
  'Sobreaviso': {
    bg: 'bg-purple-50',
    border: 'border-purple-200',
    text: 'text-purple-800',
    badge: 'bg-purple-500',
    hover: 'hover:bg-purple-100',
    ring: 'ring-purple-200'
  },
  'Reprovado': {
    bg: 'bg-slate-50',
    border: 'border-slate-200',
    text: 'text-slate-800',
    badge: 'bg-slate-500',
    hover: 'hover:bg-slate-100',
    ring: 'ring-slate-200'
  },
  'Bolsão Enel': {
    bg: 'bg-yellow-50',
    border: 'border-yellow-200',
    text: 'text-yellow-800',
    badge: 'bg-yellow-500',
    hover: 'hover:bg-yellow-100',
    ring: 'ring-yellow-200'
  }
} as const;

// Função para obter cores de um tipo de cobrança
export const getCobrancaColors = (tipoCobranca: TipoCobrancaType): CobrancaColors => {
  return COBRANCA_COLORS[tipoCobranca];
};

// Função para obter classe CSS completa para card
export const getCardClasses = (tipoCobranca: TipoCobrancaType): string => {
  const colors = getCobrancaColors(tipoCobranca);
  return `${colors.bg} ${colors.border} ${colors.text} ${colors.hover} border-2 rounded-lg transition-colors duration-200`;
};

// Função para obter classe CSS para badge
export const getBadgeClasses = (tipoCobranca: TipoCobrancaType): string => {
  const colors = getCobrancaColors(tipoCobranca);
  return `${colors.badge} text-white px-2 py-1 rounded-full text-xs font-medium`;
};

// Função para obter classe CSS para botão
export const getButtonClasses = (tipoCobranca: TipoCobrancaType, variant: 'primary' | 'secondary' = 'primary'): string => {
  const colors = getCobrancaColors(tipoCobranca);

  if (variant === 'primary') {
    return `${colors.badge} hover:opacity-90 text-white px-4 py-2 rounded-md font-medium transition-opacity duration-200`;
  }

  return `${colors.bg} ${colors.border} ${colors.text} ${colors.hover} border px-4 py-2 rounded-md font-medium transition-colors duration-200`;
};

// Função para obter classe CSS para input focus
export const getInputFocusClasses = (tipoCobranca: TipoCobrancaType): string => {
  const colors = getCobrancaColors(tipoCobranca);
  return `focus:${colors.ring} focus:ring-2 focus:ring-opacity-50`;
};

// Função para obter cor hexadecimal (para gráficos)
export const getHexColor = (tipoCobranca: TipoCobrancaType): string => {
  const colorMap: Record<TipoCobrancaType, string> = {
    'Banco de Horas': '#3B82F6',    // blue-500
    'Cobro Interno': '#10B981',     // green-500
    'Contrato': '#6B7280',          // gray-500
    'Faturado': '#F59E0B',          // orange-500
    'Hora Extra': '#EF4444',        // red-500
    'Sobreaviso': '#8B5CF6',        // purple-500
    'Reprovado': '#64748B',         // slate-500
    'Bolsão Enel': '#EAB308'        // yellow-500
  };

  return colorMap[tipoCobranca];
};

// Função para obter todas as cores disponíveis (útil para gráficos)
export const getAllColors = (): { tipo: TipoCobrancaType; color: string }[] => {
  return Object.keys(COBRANCA_COLORS).map(tipo => ({
    tipo: tipo as TipoCobrancaType,
    color: getHexColor(tipo as TipoCobrancaType)
  }));
};

// Função para verificar se um tipo de cobrança é válido
export const isValidTipoCobranca = (tipo: string): tipo is TipoCobrancaType => {
  return tipo in COBRANCA_COLORS;
};

// Função para obter contraste de texto (claro/escuro) baseado na cor de fundo
export const getTextContrast = (tipoCobranca: TipoCobrancaType): 'light' | 'dark' => {
  // Tipos com cores mais escuras precisam de texto claro
  const darkBackgrounds: TipoCobrancaType[] = ['Reprovado'];
  return darkBackgrounds.includes(tipoCobranca) ? 'light' : 'dark';
};

// Função para obter ícone associado ao tipo de cobrança (opcional)
export const getCobrancaIcon = (tipoCobranca: TipoCobrancaType): string => {
  const iconMap: Record<TipoCobrancaType, string> = {
    'Banco de Horas': '🏦',
    'Cobro Interno': '🏢',
    'Contrato': '📋',
    'Faturado': '💰',
    'Hora Extra': '⏰',
    'Sobreaviso': '🚨',
    'Reprovado': '❌',
    'Bolsão Enel': '⚡'
  };

  return iconMap[tipoCobranca] || '📄'; // Ícone padrão se não encontrar
};

// Constantes para uso em componentes
export const COBRANCA_COLOR_CLASSES = {
  CARD: 'border-2 rounded-lg transition-colors duration-200',
  BADGE: 'text-white px-2 py-1 rounded-full text-xs font-medium',
  BUTTON_PRIMARY: 'text-white px-4 py-2 rounded-md font-medium transition-opacity duration-200 hover:opacity-90',
  BUTTON_SECONDARY: 'border px-4 py-2 rounded-md font-medium transition-colors duration-200',
  INPUT_FOCUS: 'focus:ring-2 focus:ring-opacity-50'
} as const;