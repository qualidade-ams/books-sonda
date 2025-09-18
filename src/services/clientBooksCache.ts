import { cacheManager } from './cacheManager';
import type {
  EmpresaClienteCompleta,
  ClienteCompleto,
  GrupoResponsavelCompleto,
  HistoricoDisparoCompleto,
  ControleMensalCompleto
} from '@/types/clientBooks';

/**
 * Serviço de cache específico para o sistema de Client Books
 * Implementa estratégias de cache otimizadas para consultas frequentes
 */
export class ClientBooksCacheService {
  // Chaves de cache padronizadas
  private static readonly CACHE_KEYS = {
    EMPRESAS_ATIVAS: 'client_books:empresas:ativas',
    EMPRESAS_ALL: 'client_books:empresas:all',
    CLIENTES_EMPRESA: (empresaId: string) => `client_books:clientes:empresa:${empresaId}`,
    CLIENTES_ATIVOS: 'client_books:clientes:ativos',
    GRUPOS_RESPONSAVEIS: 'client_books:grupos:all',
    GRUPOS_POR_EMPRESA: (empresaId: string) => `client_books:grupos:empresa:${empresaId}`,
    HISTORICO_EMPRESA: (empresaId: string, meses: number) => `client_books:historico:empresa:${empresaId}:${meses}`,
    CONTROLE_MENSAL: (mes: number, ano: number) => `client_books:controle:${ano}:${mes}`,
    METRICAS_MENSAIS: (mes: number, ano: number) => `client_books:metricas:${ano}:${mes}`,
    EMPRESAS_SEM_BOOKS: (mes: number, ano: number) => `client_books:sem_books:${ano}:${mes}`,
    ESTATISTICAS_PERFORMANCE: (inicio: string, fim: string) => `client_books:stats:${inicio}:${fim}`,
  };

  // TTL padrão para diferentes tipos de dados (em segundos)
  private static readonly TTL = {
    EMPRESAS: 10 * 60, // 10 minutos - dados que mudam com frequência moderada
    CLIENTES: 5 * 60, // 5 minutos - dados que podem mudar frequentemente
    GRUPOS: 30 * 60, // 30 minutos - dados que mudam raramente
    HISTORICO: 60 * 60, // 1 hora - dados históricos são estáveis
    CONTROLE_MENSAL: 15 * 60, // 15 minutos - dados de controle podem mudar durante o mês
    METRICAS: 30 * 60, // 30 minutos - métricas calculadas são custosas
    ESTATISTICAS: 60 * 60, // 1 hora - estatísticas de performance são estáveis
  };

  /**
   * Cache para empresas ativas
   */
  async cacheEmpresasAtivas(empresas: EmpresaClienteCompleta[]): Promise<void> {
    cacheManager.set(
      ClientBooksCacheService.CACHE_KEYS.EMPRESAS_ATIVAS,
      empresas,
      ClientBooksCacheService.TTL.EMPRESAS
    );
  }

  async getEmpresasAtivas(): Promise<EmpresaClienteCompleta[] | null> {
    return cacheManager.get<EmpresaClienteCompleta[]>(
      ClientBooksCacheService.CACHE_KEYS.EMPRESAS_ATIVAS
    );
  }

  /**
   * Cache para todas as empresas
   */
  async cacheTodasEmpresas(empresas: EmpresaClienteCompleta[]): Promise<void> {
    cacheManager.set(
      ClientBooksCacheService.CACHE_KEYS.EMPRESAS_ALL,
      empresas,
      ClientBooksCacheService.TTL.EMPRESAS
    );
  }

  async getTodasEmpresas(): Promise<EmpresaClienteCompleta[] | null> {
    return cacheManager.get<EmpresaClienteCompleta[]>(
      ClientBooksCacheService.CACHE_KEYS.EMPRESAS_ALL
    );
  }

  /**
   * Cache para clientes por empresa
   */
  async cacheClientesPorEmpresa(
    empresaId: string, 
    clientes: ClienteCompleto[]
  ): Promise<void> {
    cacheManager.set(
      ClientBooksCacheService.CACHE_KEYS.CLIENTES_EMPRESA(empresaId),
      clientes,
      ClientBooksCacheService.TTL.CLIENTES
    );
  }

  async getClientesPorEmpresa(empresaId: string): Promise<ClienteCompleto[] | null> {
    return cacheManager.get<ClienteCompleto[]>(
      ClientBooksCacheService.CACHE_KEYS.CLIENTES_EMPRESA(empresaId)
    );
  }

  /**
   * Cache para clientes ativos
   */
  async cacheClientesAtivos(clientes: ClienteCompleto[]): Promise<void> {
    cacheManager.set(
      ClientBooksCacheService.CACHE_KEYS.CLIENTES_ATIVOS,
      clientes,
      ClientBooksCacheService.TTL.CLIENTES
    );
  }

  async getClientesAtivos(): Promise<ClienteCompleto[] | null> {
    return cacheManager.get<ClienteCompleto[]>(
      ClientBooksCacheService.CACHE_KEYS.CLIENTES_ATIVOS
    );
  }

  /**
   * Cache para grupos responsáveis
   */
  async cacheGruposResponsaveis(grupos: GrupoResponsavelCompleto[]): Promise<void> {
    cacheManager.set(
      ClientBooksCacheService.CACHE_KEYS.GRUPOS_RESPONSAVEIS,
      grupos,
      ClientBooksCacheService.TTL.GRUPOS
    );
  }

  async getGruposResponsaveis(): Promise<GrupoResponsavelCompleto[] | null> {
    return cacheManager.get<GrupoResponsavelCompleto[]>(
      ClientBooksCacheService.CACHE_KEYS.GRUPOS_RESPONSAVEIS
    );
  }

  /**
   * Cache para grupos por empresa
   */
  async cacheGruposPorEmpresa(
    empresaId: string, 
    grupos: GrupoResponsavelCompleto[]
  ): Promise<void> {
    cacheManager.set(
      ClientBooksCacheService.CACHE_KEYS.GRUPOS_POR_EMPRESA(empresaId),
      grupos,
      ClientBooksCacheService.TTL.GRUPOS
    );
  }

  async getGruposPorEmpresa(empresaId: string): Promise<GrupoResponsavelCompleto[] | null> {
    return cacheManager.get<GrupoResponsavelCompleto[]>(
      ClientBooksCacheService.CACHE_KEYS.GRUPOS_POR_EMPRESA(empresaId)
    );
  }

  /**
   * Cache para histórico de empresa
   */
  async cacheHistoricoEmpresa(
    empresaId: string,
    meses: number,
    historico: HistoricoDisparoCompleto[]
  ): Promise<void> {
    cacheManager.set(
      ClientBooksCacheService.CACHE_KEYS.HISTORICO_EMPRESA(empresaId, meses),
      historico,
      ClientBooksCacheService.TTL.HISTORICO
    );
  }

  async getHistoricoEmpresa(
    empresaId: string, 
    meses: number
  ): Promise<HistoricoDisparoCompleto[] | null> {
    return cacheManager.get<HistoricoDisparoCompleto[]>(
      ClientBooksCacheService.CACHE_KEYS.HISTORICO_EMPRESA(empresaId, meses)
    );
  }

  /**
   * Cache para controle mensal
   */
  async cacheControleMensal(
    mes: number,
    ano: number,
    controles: ControleMensalCompleto[]
  ): Promise<void> {
    cacheManager.set(
      ClientBooksCacheService.CACHE_KEYS.CONTROLE_MENSAL(mes, ano),
      controles,
      ClientBooksCacheService.TTL.CONTROLE_MENSAL
    );
  }

  async getControleMensal(mes: number, ano: number): Promise<ControleMensalCompleto[] | null> {
    return cacheManager.get<ControleMensalCompleto[]>(
      ClientBooksCacheService.CACHE_KEYS.CONTROLE_MENSAL(mes, ano)
    );
  }

  /**
   * Cache para métricas mensais
   */
  async cacheMetricasMensais(
    mes: number,
    ano: number,
    metricas: any
  ): Promise<void> {
    cacheManager.set(
      ClientBooksCacheService.CACHE_KEYS.METRICAS_MENSAIS(mes, ano),
      metricas,
      ClientBooksCacheService.TTL.METRICAS
    );
  }

  async getMetricasMensais(mes: number, ano: number): Promise<any | null> {
    return cacheManager.get(
      ClientBooksCacheService.CACHE_KEYS.METRICAS_MENSAIS(mes, ano)
    );
  }

  /**
   * Cache para empresas sem books
   */
  async cacheEmpresasSemBooks(
    mes: number,
    ano: number,
    empresas: EmpresaClienteCompleta[]
  ): Promise<void> {
    cacheManager.set(
      ClientBooksCacheService.CACHE_KEYS.EMPRESAS_SEM_BOOKS(mes, ano),
      empresas,
      ClientBooksCacheService.TTL.METRICAS
    );
  }

  async getEmpresasSemBooks(mes: number, ano: number): Promise<EmpresaClienteCompleta[] | null> {
    return cacheManager.get<EmpresaClienteCompleta[]>(
      ClientBooksCacheService.CACHE_KEYS.EMPRESAS_SEM_BOOKS(mes, ano)
    );
  }

  /**
   * Cache para estatísticas de performance
   */
  async cacheEstatisticasPerformance(
    dataInicio: Date,
    dataFim: Date,
    estatisticas: any
  ): Promise<void> {
    const chave = ClientBooksCacheService.CACHE_KEYS.ESTATISTICAS_PERFORMANCE(
      dataInicio.toISOString().split('T')[0],
      dataFim.toISOString().split('T')[0]
    );
    
    cacheManager.set(
      chave,
      estatisticas,
      ClientBooksCacheService.TTL.ESTATISTICAS
    );
  }

  async getEstatisticasPerformance(
    dataInicio: Date,
    dataFim: Date
  ): Promise<any | null> {
    const chave = ClientBooksCacheService.CACHE_KEYS.ESTATISTICAS_PERFORMANCE(
      dataInicio.toISOString().split('T')[0],
      dataFim.toISOString().split('T')[0]
    );
    
    return cacheManager.get(chave);
  }

  /**
   * Invalidação de cache por padrões
   */
  
  /**
   * Invalida cache relacionado a uma empresa específica
   */
  invalidateEmpresaCache(empresaId: string): void {
    // Invalidar cache específico da empresa
    cacheManager.clear(ClientBooksCacheService.CACHE_KEYS.CLIENTES_EMPRESA(empresaId));
    cacheManager.clear(ClientBooksCacheService.CACHE_KEYS.GRUPOS_POR_EMPRESA(empresaId));
    
    // Invalidar histórico da empresa (todos os períodos)
    cacheManager.invalidatePattern(`client_books:historico:empresa:${empresaId}:`);
    
    // Invalidar cache geral de empresas
    cacheManager.clear(ClientBooksCacheService.CACHE_KEYS.EMPRESAS_ATIVAS);
    cacheManager.clear(ClientBooksCacheService.CACHE_KEYS.EMPRESAS_ALL);
  }

  /**
   * Invalida cache relacionado a clientes
   */
  invalidateClientesCache(empresaId?: string): void {
    if (empresaId) {
      cacheManager.clear(ClientBooksCacheService.CACHE_KEYS.CLIENTES_EMPRESA(empresaId));
    }
    
    cacheManager.clear(ClientBooksCacheService.CACHE_KEYS.CLIENTES_ATIVOS);
  }

  /**
   * Invalida cache relacionado a grupos
   */
  invalidateGruposCache(empresaId?: string): void {
    cacheManager.clear(ClientBooksCacheService.CACHE_KEYS.GRUPOS_RESPONSAVEIS);
    
    if (empresaId) {
      cacheManager.clear(ClientBooksCacheService.CACHE_KEYS.GRUPOS_POR_EMPRESA(empresaId));
    } else {
      // Invalidar todos os grupos por empresa
      cacheManager.invalidatePattern('client_books:grupos:empresa:');
    }
  }

  /**
   * Invalida cache relacionado a histórico e métricas
   */
  invalidateHistoricoCache(mes?: number, ano?: number): void {
    if (mes && ano) {
      // Invalidar cache específico do mês
      cacheManager.clear(ClientBooksCacheService.CACHE_KEYS.CONTROLE_MENSAL(mes, ano));
      cacheManager.clear(ClientBooksCacheService.CACHE_KEYS.METRICAS_MENSAIS(mes, ano));
      cacheManager.clear(ClientBooksCacheService.CACHE_KEYS.EMPRESAS_SEM_BOOKS(mes, ano));
    } else {
      // Invalidar todo o cache de histórico e métricas
      cacheManager.invalidatePattern('client_books:historico:');
      cacheManager.invalidatePattern('client_books:controle:');
      cacheManager.invalidatePattern('client_books:metricas:');
      cacheManager.invalidatePattern('client_books:sem_books:');
      cacheManager.invalidatePattern('client_books:stats:');
    }
  }

  /**
   * Limpa todo o cache do sistema de books
   */
  clearAllCache(): void {
    cacheManager.invalidatePattern('client_books:');
  }

  /**
   * Pré-aquecimento de cache com dados essenciais
   */
  async warmupCache(): Promise<void> {
    console.info('🔥 Iniciando pré-aquecimento do cache do sistema de books...');
    
    try {
      // Este método será chamado pelos serviços para pré-aquecer dados críticos
      // A implementação específica será feita nos serviços que usam este cache
      console.info('✅ Pré-aquecimento do cache concluído');
    } catch (error) {
      console.error('❌ Erro no pré-aquecimento do cache:', error);
    }
  }

  /**
   * Obtém estatísticas do cache específicas do sistema de books
   */
  getClientBooksStats(): {
    totalEntries: number;
    empresasEntries: number;
    clientesEntries: number;
    gruposEntries: number;
    historicoEntries: number;
    metricas: any;
  } {
    const stats = cacheManager.getStats();
    
    // Contar entradas por categoria
    let empresasEntries = 0;
    let clientesEntries = 0;
    let gruposEntries = 0;
    let historicoEntries = 0;

    // Esta é uma aproximação - o cache manager atual não expõe as chaves
    // Em uma implementação futura, poderíamos adicionar essa funcionalidade
    
    return {
      totalEntries: stats.totalEntries,
      empresasEntries,
      clientesEntries,
      gruposEntries,
      historicoEntries,
      metricas: stats
    };
  }
}

// Instância singleton
export const clientBooksCacheService = new ClientBooksCacheService();