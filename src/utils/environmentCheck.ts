/**
 * Utilitário para verificar se o ambiente está configurado corretamente
 */

export interface EnvironmentCheckResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export const checkEnvironment = (): EnvironmentCheckResult => {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Verificar variáveis de ambiente do Supabase
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  if (!supabaseUrl) {
    errors.push('VITE_SUPABASE_URL não está definida');
  } else if (!supabaseUrl.startsWith('https://')) {
    warnings.push('VITE_SUPABASE_URL deve começar com https://');
  }

  if (!supabaseKey) {
    errors.push('VITE_SUPABASE_ANON_KEY não está definida');
  } else if (supabaseKey.length < 100) {
    warnings.push('VITE_SUPABASE_ANON_KEY parece ser muito curta');
  }

  // Verificar se estamos em produção
  const isProduction = import.meta.env.PROD;
  if (isProduction && errors.length > 0) {
    console.error('❌ Configuração de ambiente inválida em produção:', errors);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
};

export const logEnvironmentStatus = (): void => {
  const result = checkEnvironment();

  if (result.isValid) {
  } else {
    console.error('❌ Problemas na configuração do ambiente:');
    result.errors.forEach(error => console.error(`  - ${error}`));
  }

  if (result.warnings.length > 0) {
    console.warn('⚠️ Avisos de configuração:');
    result.warnings.forEach(warning => console.warn(`  - ${warning}`));
  }
};

// Executar verificação automaticamente em desenvolvimento
if (import.meta.env.DEV) {
  logEnvironmentStatus();
}