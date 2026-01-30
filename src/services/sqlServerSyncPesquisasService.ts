/**
 * Serviço de sincronização com SQL Server
 * Sincroniza dados de pesquisas do SQL Server para o Supabase
 */

import { supabase } from '@/integrations/supabase/client';
import { safeFetch } from '@/utils/apiConfig';
import type { DadosSqlServer, ResultadoSincronizacao } from '@/types/pesquisasSatisfacao';

// ============================================
// CONFIGURAÇÃO
// ============================================

interface ConfigSqlServer {
  server: string;
  database: string;
  user: string;
  password: string;
  table: string;
}

// Esta configuração será fornecida quando necessário
let configSqlServer: ConfigSqlServer | null = null;

/**
 * Configurar conexão com SQL Server
 */
export function configurarSqlServer(config: ConfigSqlServer): void {
  configSqlServer = config;
  console.log('✓ Configuração SQL Server atualizada');
}

// ============================================
// SINCRONIZAÇÃO
// ============================================

/**
 * Buscar dados do SQL Server via API Node.js
 */
async function buscarDadosSqlServer(): Promise<DadosSqlServer[]> {
  // URL da API de sincronização
  const API_URL = import.meta.env.VITE_SYNC_API_URL || 'http://SAPSERVDB.sondait.com.br:3001';
  
  try {
    const response = await safeFetch(`${API_URL}/api/sync-pesquisas`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`Erro HTTP: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.sucesso) {
      throw new Error(data.mensagens?.join(', ') || 'Erro na sincronização');
    }

    return [];
  } catch (error) {
    console.error('Erro ao buscar dados do SQL Server:', error);
    throw error;
  }
}

/**
 * Gerar ID único para registro do SQL Server
 */
function gerarIdUnico(registro: DadosSqlServer): string {
  // Combinar campos para criar ID único
  const partes = [
    registro.empresa,
    registro.Cliente,
    registro.Nro_caso,
    registro.Data_Resposta?.toISOString()
  ].filter(Boolean);
  
  return partes.join('|');
}

/**
 * Sincronizar dados do SQL Server para Supabase
 * Agora usa a API Node.js que faz todo o processamento
 * INCLUI sincronização de pesquisas, especialistas E apontamentos
 */
export async function sincronizarDados(): Promise<ResultadoSincronizacao & { especialistas?: any; apontamentos?: any }> {
  const API_URL = import.meta.env.VITE_SYNC_API_URL || 'http://SAPSERVDB.sondait.com.br:3001';
  
  try {
    console.log('Iniciando sincronização completa (pesquisas + especialistas + apontamentos)...');
    
    // 1. Sincronizar pesquisas (funcionalidade existente)
    console.log('1/3 - Sincronizando pesquisas...');
    const responsePesquisas = await safeFetch(`${API_URL}/api/sync-pesquisas`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    let resultadoPesquisas: ResultadoSincronizacao;

    if (responsePesquisas.status === 404) {
      resultadoPesquisas = {
        sucesso: false,
        total_processados: 0,
        novos: 0,
        atualizados: 0,
        erros: 1,
        mensagens: [
          'Endpoint de sincronização de pesquisas não implementado na API.',
          'A API está online mas o endpoint /api/sync-pesquisas não existe.',
          'Verifique se a API foi atualizada com os endpoints de sincronização.'
        ],
        detalhes_erros: []
      };
    } else if (!responsePesquisas.ok) {
      throw new Error(`Erro HTTP na sincronização de pesquisas: ${responsePesquisas.status}`);
    } else {
      resultadoPesquisas = await responsePesquisas.json();
    }

    console.log('Resultado da sincronização de pesquisas:', resultadoPesquisas);

    // 2. Sincronizar especialistas
    console.log('2/3 - Sincronizando especialistas...');
    const responseEspecialistas = await safeFetch(`${API_URL}/api/sync-especialistas`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    let resultadoEspecialistas = null;
    if (responseEspecialistas.status === 404) {
      resultadoEspecialistas = {
        sucesso: false,
        mensagens: [
          'Endpoint de sincronização de especialistas não implementado na API.',
          'A API está online mas o endpoint /api/sync-especialistas não existe.'
        ]
      };
    } else if (responseEspecialistas.ok) {
      resultadoEspecialistas = await responseEspecialistas.json();
      console.log('Resultado da sincronização de especialistas:', resultadoEspecialistas);
      
      // Limpar cache de especialistas após sincronização bem-sucedida
      if (resultadoEspecialistas.sucesso) {
        try {
          const { limparCacheEspecialistas } = await import('@/integrations/supabase/admin-client');
          limparCacheEspecialistas();
          console.log('✅ Cache de especialistas limpo após sincronização');
        } catch (error) {
          console.warn('⚠️ Erro ao limpar cache de especialistas:', error);
        }
      }
    } else {
      console.warn('Erro na sincronização de especialistas, continuando...');
      resultadoEspecialistas = {
        sucesso: false,
        mensagens: [`Erro HTTP: ${responseEspecialistas.status}`]
      };
    }

    // 3. Sincronizar apontamentos (nova funcionalidade)
    console.log('3/4 - Sincronizando apontamentos...');
    const responseApontamentos = await safeFetch(`${API_URL}/api/sync-apontamentos`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    let resultadoApontamentos = null;
    if (responseApontamentos.status === 404) {
      resultadoApontamentos = {
        sucesso: false,
        mensagens: [
          'Endpoint de sincronização de apontamentos não implementado na API.',
          'A API está online mas o endpoint /api/sync-apontamentos não existe.'
        ]
      };
    } else if (responseApontamentos.ok) {
      resultadoApontamentos = await responseApontamentos.json();
      console.log('✅ [APONTAMENTOS] Resultado da sincronização de apontamentos:', resultadoApontamentos);
      console.log('📊 [DEBUG] Apontamentos - Total:', resultadoApontamentos.total_processados);
      console.log('📊 [DEBUG] Apontamentos - Novos:', resultadoApontamentos.novos);
      console.log('📊 [DEBUG] Apontamentos - Atualizados:', resultadoApontamentos.atualizados);
      console.log('📊 [DEBUG] Apontamentos - Erros:', resultadoApontamentos.erros);
      console.log('📊 [DEBUG] Apontamentos - Objeto completo:', JSON.stringify(resultadoApontamentos, null, 2));
    } else {
      console.warn('Erro na sincronização de apontamentos, continuando...');
      resultadoApontamentos = {
        sucesso: false,
        mensagens: [`Erro HTTP: ${responseApontamentos.status}`]
      };
    }

    // 4. Sincronizar tickets (nova funcionalidade)
    console.log('4/4 - Sincronizando tickets...');
    const responseTickets = await safeFetch(`${API_URL}/api/sync-tickets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    let resultadoTickets = null;
    if (responseTickets.status === 404) {
      resultadoTickets = {
        sucesso: false,
        mensagens: [
          'Endpoint de sincronização de tickets não implementado na API.',
          'A API está online mas o endpoint /api/sync-tickets não existe.'
        ]
      };
    } else if (responseTickets.ok) {
      resultadoTickets = await responseTickets.json();
      console.log('✅ [TICKETS] Resultado da sincronização de tickets:', resultadoTickets);
      console.log('📊 [DEBUG] Tickets - Total:', resultadoTickets.total_processados);
      console.log('📊 [DEBUG] Tickets - Novos:', resultadoTickets.novos);
      console.log('📊 [DEBUG] Tickets - Atualizados:', resultadoTickets.atualizados);
      console.log('📊 [DEBUG] Tickets - Erros:', resultadoTickets.erros);
      console.log('📊 [DEBUG] Tickets - Objeto completo:', JSON.stringify(resultadoTickets, null, 2));
    } else {
      console.warn('Erro na sincronização de tickets, continuando...');
      resultadoTickets = {
        sucesso: false,
        mensagens: [`Erro HTTP: ${responseTickets.status}`]
      };
    }

    // 5. Combinar resultados
    const resultadoCombinado = {
      ...resultadoPesquisas,
      especialistas: resultadoEspecialistas,
      apontamentos: resultadoApontamentos,
      tickets: resultadoTickets,
      mensagens: [
        ...resultadoPesquisas.mensagens,
        '--- Especialistas ---',
        ...(resultadoEspecialistas?.mensagens || ['Erro na sincronização de especialistas']),
        '--- Apontamentos ---',
        ...(resultadoApontamentos?.mensagens || ['Erro na sincronização de apontamentos']),
        '--- Tickets ---',
        ...(resultadoTickets?.mensagens || ['Erro na sincronização de tickets'])
      ]
    };

    console.log('✅ [FINAL] Sincronização completa finalizada');
    console.log('📊 [DEBUG] Resultado final - apontamentos:', resultadoCombinado.apontamentos);
    console.log('📊 [DEBUG] Resultado final - apontamentos.total_processados:', resultadoCombinado.apontamentos?.total_processados);
    console.log('📊 [DEBUG] Resultado final completo:', JSON.stringify(resultadoCombinado, null, 2));
    return resultadoCombinado;

  } catch (erro) {
    console.error('Erro ao sincronizar:', erro);
    
    return {
      sucesso: false,
      total_processados: 0,
      novos: 0,
      atualizados: 0,
      erros: 1,
      mensagens: [`Erro ao conectar com API: ${erro instanceof Error ? erro.message : 'Erro desconhecido'}`],
      detalhes_erros: [],
      especialistas: null,
      apontamentos: null
    };
  }
}

/**
 * Verificar status da última sincronização
 */
export async function verificarUltimaSincronizacao(): Promise<{
  data: string | null;
  total_registros: number;
}> {
  try {
    const { data: ultimoRegistro, error } = await supabase
      .from('pesquisas_satisfacao')
      .select('created_at')
      .eq('origem', 'sql_server')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Erro ao buscar última sincronização:', error);
      return {
        data: null,
        total_registros: 0
      };
    }

    if (!ultimoRegistro) {
      return {
        data: null,
        total_registros: 0
      };
    }

    const { count } = await supabase
      .from('pesquisas_satisfacao')
      .select('*', { count: 'exact', head: true })
      .eq('origem', 'sql_server');

    return {
      data: ultimoRegistro.created_at,
      total_registros: count || 0
    };
  } catch (error) {
    console.error('Erro ao verificar última sincronização:', error);
    return {
      data: null,
      total_registros: 0
    };
  }
}

// ============================================
// FUNÇÕES AUXILIARES
// ============================================

/**
 * Testar conexão com SQL Server via API
 */
export async function testarConexao(): Promise<boolean> {
  const API_URL = import.meta.env.VITE_SYNC_API_URL || 'http://SAPSERVDB.sondait.com.br:3001';
  
  try {
    console.log('Testando conexão com SQL Server via API...');
    
    const response = await safeFetch(`${API_URL}/api/test-connection`);
    
    if (!response.ok) {
      throw new Error(`Erro HTTP: ${response.status}`);
    }

    const data = await response.json();
    console.log('Teste de conexão:', data);
    
    return data.success;
    
  } catch (erro) {
    console.error('Erro ao testar conexão:', erro);
    return false;
  }
}
