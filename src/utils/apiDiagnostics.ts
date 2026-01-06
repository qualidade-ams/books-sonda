/**
 * Utilitários para diagnóstico de conexão com a API de sincronização
 */

const API_BASE_URL = import.meta.env.VITE_SYNC_API_URL || 'http://SAPSERVDB.sondait.com.br:3001';

export interface DiagnosticoApi {
  url: string;
  healthCheck: boolean;
  testConnection: boolean;
  syncPesquisas: boolean;
  syncEspecialistas: boolean;
  tempos: {
    healthCheck?: number;
    testConnection?: number;
    syncPesquisas?: number;
    syncEspecialistas?: number;
  };
  erros: string[];
}

/**
 * Executa diagnóstico completo da API
 */
export async function diagnosticarApi(): Promise<DiagnosticoApi> {
  const diagnostico: DiagnosticoApi = {
    url: API_BASE_URL,
    healthCheck: false,
    testConnection: false,
    syncPesquisas: false,
    syncEspecialistas: false,
    tempos: {},
    erros: []
  };

  console.log('🔍 Iniciando diagnóstico da API:', API_BASE_URL);

  // 1. Teste de Health Check
  try {
    const inicio = Date.now();
    const response = await fetch(`${API_BASE_URL}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(5000)
    });
    diagnostico.tempos.healthCheck = Date.now() - inicio;
    diagnostico.healthCheck = response.ok;
    
    if (!response.ok) {
      diagnostico.erros.push(`Health check falhou: HTTP ${response.status}`);
    } else {
      console.log('✅ Health check OK');
    }
  } catch (error) {
    diagnostico.erros.push(`Health check erro: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    console.error('❌ Health check falhou:', error);
  }

  // 2. Teste de Conexão com SQL Server
  try {
    const inicio = Date.now();
    const response = await fetch(`${API_BASE_URL}/api/test-connection`, {
      method: 'GET',
      signal: AbortSignal.timeout(10000)
    });
    diagnostico.tempos.testConnection = Date.now() - inicio;
    
    if (response.ok) {
      const data = await response.json();
      diagnostico.testConnection = data.success === true;
      
      if (diagnostico.testConnection) {
        console.log('✅ Teste de conexão SQL Server OK');
      } else {
        diagnostico.erros.push(`Conexão SQL Server falhou: ${data.message || 'Erro desconhecido'}`);
      }
    } else {
      diagnostico.erros.push(`Teste de conexão falhou: HTTP ${response.status}`);
    }
  } catch (error) {
    diagnostico.erros.push(`Teste de conexão erro: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    console.error('❌ Teste de conexão falhou:', error);
  }

  // 3. Teste de Endpoint de Sincronização de Pesquisas
  try {
    const inicio = Date.now();
    const response = await fetch(`${API_BASE_URL}/api/sync-pesquisas`, {
      method: 'HEAD', // Apenas verifica se o endpoint existe
      signal: AbortSignal.timeout(5000)
    });
    diagnostico.tempos.syncPesquisas = Date.now() - inicio;
    diagnostico.syncPesquisas = response.status !== 404;
    
    if (diagnostico.syncPesquisas) {
      console.log('✅ Endpoint sync-pesquisas disponível');
    } else {
      diagnostico.erros.push('Endpoint sync-pesquisas não implementado (HTTP 404)');
      console.log('⚠️ Endpoint sync-pesquisas não implementado');
    }
  } catch (error) {
    diagnostico.erros.push(`Endpoint sync-pesquisas erro: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    console.error('❌ Endpoint sync-pesquisas falhou:', error);
  }

  // 4. Teste de Endpoint de Sincronização de Especialistas
  try {
    const inicio = Date.now();
    const response = await fetch(`${API_BASE_URL}/api/sync-especialistas`, {
      method: 'HEAD', // Apenas verifica se o endpoint existe
      signal: AbortSignal.timeout(5000)
    });
    diagnostico.tempos.syncEspecialistas = Date.now() - inicio;
    diagnostico.syncEspecialistas = response.status !== 404;
    
    if (diagnostico.syncEspecialistas) {
      console.log('✅ Endpoint sync-especialistas disponível');
    } else {
      diagnostico.erros.push('Endpoint sync-especialistas não implementado (HTTP 404)');
      console.log('⚠️ Endpoint sync-especialistas não implementado');
    }
  } catch (error) {
    diagnostico.erros.push(`Endpoint sync-especialistas erro: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    console.error('❌ Endpoint sync-especialistas falhou:', error);
  }

  // Resumo do diagnóstico
  const sucessos = [
    diagnostico.healthCheck,
    diagnostico.testConnection,
    diagnostico.syncPesquisas,
    diagnostico.syncEspecialistas
  ].filter(Boolean).length;

  console.log(`📊 Diagnóstico concluído: ${sucessos}/4 testes passaram`);
  
  if (diagnostico.erros.length > 0) {
    console.log('❌ Erros encontrados:');
    diagnostico.erros.forEach(erro => console.log(`  - ${erro}`));
  }

  return diagnostico;
}

/**
 * Testa conectividade básica com a API
 */
export async function testarConectividade(): Promise<{
  conectado: boolean;
  tempo: number;
  erro?: string;
}> {
  const inicio = Date.now();
  
  try {
    const response = await fetch(`${API_BASE_URL}/health`, {
      method: 'GET',
      signal: AbortSignal.timeout(3000)
    });
    
    return {
      conectado: response.ok,
      tempo: Date.now() - inicio,
      erro: response.ok ? undefined : `HTTP ${response.status}`
    };
  } catch (error) {
    return {
      conectado: false,
      tempo: Date.now() - inicio,
      erro: error instanceof Error ? error.message : 'Erro desconhecido'
    };
  }
}

/**
 * Formata tempo em ms para exibição
 */
export function formatarTempo(ms?: number): string {
  if (!ms) return 'N/A';
  
  if (ms < 1000) {
    return `${ms}ms`;
  } else {
    return `${(ms / 1000).toFixed(1)}s`;
  }
}

/**
 * Gera relatório de diagnóstico em texto
 */
export function gerarRelatorio(diagnostico: DiagnosticoApi): string {
  const linhas = [
    '=== DIAGNÓSTICO DA API DE SINCRONIZAÇÃO ===',
    '',
    `URL: ${diagnostico.url}`,
    '',
    '--- TESTES ---',
    `Health Check: ${diagnostico.healthCheck ? '✅ OK' : '❌ FALHOU'} (${formatarTempo(diagnostico.tempos.healthCheck)})`,
    `Conexão SQL Server: ${diagnostico.testConnection ? '✅ OK' : '❌ FALHOU'} (${formatarTempo(diagnostico.tempos.testConnection)})`,
    `Endpoint Pesquisas: ${diagnostico.syncPesquisas ? '✅ OK' : '❌ FALHOU'} (${formatarTempo(diagnostico.tempos.syncPesquisas)})`,
    `Endpoint Especialistas: ${diagnostico.syncEspecialistas ? '✅ OK' : '❌ FALHOU'} (${formatarTempo(diagnostico.tempos.syncEspecialistas)})`,
    ''
  ];

  if (diagnostico.erros.length > 0) {
    linhas.push('--- ERROS ---');
    diagnostico.erros.forEach(erro => linhas.push(`• ${erro}`));
    linhas.push('');
  }

  const sucessos = [
    diagnostico.healthCheck,
    diagnostico.testConnection,
    diagnostico.syncPesquisas,
    diagnostico.syncEspecialistas
  ].filter(Boolean).length;

  linhas.push(`--- RESUMO ---`);
  linhas.push(`Testes aprovados: ${sucessos}/4`);
  linhas.push(`Status geral: ${sucessos === 4 ? '✅ TUDO OK' : sucessos > 0 ? '⚠️ PARCIAL' : '❌ OFFLINE'}`);

  return linhas.join('\n');
}