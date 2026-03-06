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
  const API_URL = import.meta.env.VITE_SYNC_API_URL || 'https://sync-api-p3jr.onrender.com:3001';
  
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
 * Buscar totais reais do banco Supabase
 * INCLUI TODOS os registros (origem sql_server + manual)
 */
async function buscarTotaisReaisBanco(): Promise<{
  pesquisas: number;
  especialistas: number;
  apontamentos: number;
  tickets: number;
}> {
  try {
    // Buscar total de pesquisas (TODAS as origens)
    const { count: totalPesquisas } = await supabase
      .from('pesquisas_satisfacao')
      .select('*', { count: 'exact', head: true });
      // ↑ Removido filtro .eq('origem', 'sql_server')

    // Buscar total de especialistas (TODAS as origens)
    const { count: totalEspecialistas } = await supabase
      .from('especialistas' as any)
      .select('*', { count: 'exact', head: true });
      // ↑ Removido filtro .eq('origem', 'sql_server')

    // Buscar total de apontamentos (já estava sem filtro)
    const { count: totalApontamentos } = await supabase
      .from('apontamentos_aranda' as any)
      .select('*', { count: 'exact', head: true });

    // Buscar total de tickets (já estava sem filtro)
    const { count: totalTickets } = await supabase
      .from('apontamentos_tickets_aranda' as any)
      .select('*', { count: 'exact', head: true });

    console.log('📊 Totais reais (TODAS as origens):', {
      pesquisas: totalPesquisas,
      especialistas: totalEspecialistas,
      apontamentos: totalApontamentos,
      tickets: totalTickets
    });

    return {
      pesquisas: totalPesquisas || 0,
      especialistas: totalEspecialistas || 0,
      apontamentos: totalApontamentos || 0,
      tickets: totalTickets || 0
    };
  } catch (error) {
    console.error('Erro ao buscar totais reais do banco:', error);
    return {
      pesquisas: 0,
      especialistas: 0,
      apontamentos: 0,
      tickets: 0
    };
  }
}

/**
 * Sincronizar dados do SQL Server para Supabase
 * Agora usa a API Node.js que faz todo o processamento
 * INCLUI sincronização de pesquisas, especialistas, apontamentos E tickets
 * @param tabelas - Objeto indicando quais tabelas sincronizar (opcional - se não fornecido, sincroniza todas)
 */
export async function sincronizarDados(tabelas?: {
  pesquisas?: boolean;
  especialistas?: boolean;
  apontamentos?: boolean;
  tickets?: boolean;
}): Promise<ResultadoSincronizacao & { 
  especialistas?: any; 
  apontamentos?: any; 
  tickets?: any;
  totais_reais_banco?: {
    pesquisas: number;
    especialistas: number;
    apontamentos: number;
    tickets: number;
  };
}> {
  const API_URL = import.meta.env.VITE_SYNC_API_URL || 'https://sync-api-p3jr.onrender.com:3001';
  
  // Se não foram especificadas tabelas, sincronizar todas por padrão (comportamento anterior)
  const tabelasParaSincronizar = tabelas || {
    pesquisas: true,
    especialistas: true,
    apontamentos: true,
    tickets: true
  };
  
  try {
    console.log('Iniciando sincronização seletiva:', tabelasParaSincronizar);
    
    // Buscar totais reais do banco ANTES da sincronização
    console.log('📊 Buscando totais reais do banco...');
    const totaisReaisBanco = await buscarTotaisReaisBanco();
    console.log('📊 Totais reais do banco:', totaisReaisBanco);
    
    let resultadoPesquisas: ResultadoSincronizacao | null = null;
    let resultadoEspecialistas = null;
    let resultadoApontamentos = null;
    let resultadoTickets = null;

    // 1. Sincronizar pesquisas (se selecionado)
    if (tabelasParaSincronizar.pesquisas) {
      console.log('1/4 - Sincronizando pesquisas...');
      const responsePesquisas = await safeFetch(`${API_URL}/api/sync-pesquisas`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

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
    } else {
      console.log('1/4 - Pesquisas: PULADO (não selecionado)');
      resultadoPesquisas = {
        sucesso: true,
        total_processados: 0,
        novos: 0,
        atualizados: 0,
        erros: 0,
        mensagens: ['Pesquisas não foram selecionadas para sincronização'],
        detalhes_erros: []
      };
    }

    // 2. Sincronizar especialistas (se selecionado)
    if (tabelasParaSincronizar.especialistas) {
      console.log('2/4 - Sincronizando especialistas...');
      const responseEspecialistas = await safeFetch(`${API_URL}/api/sync-especialistas`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

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
    } else {
      console.log('2/4 - Especialistas: PULADO (não selecionado)');
      resultadoEspecialistas = {
        sucesso: true,
        selecionado: false, // ← Indica que não foi selecionado
        mensagens: ['Especialistas não foram selecionados para sincronização']
      };
    }

    // 3. Sincronizar apontamentos (se selecionado)
    if (tabelasParaSincronizar.apontamentos) {
      console.log('3/4 - Sincronizando apontamentos...');
      const responseApontamentos = await safeFetch(`${API_URL}/api/sync-apontamentos-incremental`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (responseApontamentos.status === 404) {
        resultadoApontamentos = {
          sucesso: false,
          mensagens: [
            'Endpoint de sincronização incremental de apontamentos não implementado na API.',
            'A API está online mas o endpoint /api/sync-apontamentos-incremental não existe.'
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
    } else {
      console.log('3/4 - Apontamentos: PULADO (não selecionado)');
      resultadoApontamentos = {
        sucesso: true,
        selecionado: false, // ← Indica que não foi selecionado
        mensagens: ['Apontamentos não foram selecionados para sincronização']
      };
    }

    // 4. Sincronizar tickets (se selecionado)
    if (tabelasParaSincronizar.tickets) {
      console.log('4/4 - Sincronizando tickets...');
      const responseTickets = await safeFetch(`${API_URL}/api/sync-tickets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

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
    } else {
      console.log('4/4 - Tickets: PULADO (não selecionado)');
      resultadoTickets = {
        sucesso: true,
        selecionado: false, // ← Indica que não foi selecionado
        mensagens: ['Tickets não foram selecionados para sincronização']
      };
    }

    // 5. Combinar resultados - INCLUIR APENAS MENSAGENS DAS TABELAS SELECIONADAS
    const mensagensCombinadas: string[] = [];
    
    // Adicionar mensagens de pesquisas (se selecionado)
    if (tabelasParaSincronizar.pesquisas) {
      mensagensCombinadas.push('--- Pesquisas ---');
      mensagensCombinadas.push(...(resultadoPesquisas?.mensagens || ['Erro na sincronização de pesquisas']));
    }
    
    // Adicionar mensagens de especialistas (se selecionado)
    if (tabelasParaSincronizar.especialistas) {
      mensagensCombinadas.push('--- Especialistas ---');
      mensagensCombinadas.push(...(resultadoEspecialistas?.mensagens || ['Erro na sincronização de especialistas']));
    }
    
    // Adicionar mensagens de apontamentos (se selecionado)
    if (tabelasParaSincronizar.apontamentos) {
      mensagensCombinadas.push('--- Apontamentos ---');
      mensagensCombinadas.push(...(resultadoApontamentos?.mensagens || ['Erro na sincronização de apontamentos']));
    }
    
    // Adicionar mensagens de tickets (se selecionado)
    if (tabelasParaSincronizar.tickets) {
      mensagensCombinadas.push('--- Tickets ---');
      mensagensCombinadas.push(...(resultadoTickets?.mensagens || ['Erro na sincronização de tickets']));
    }
    
    const resultadoCombinado = {
      ...resultadoPesquisas,
      especialistas: resultadoEspecialistas,
      apontamentos: resultadoApontamentos,
      tickets: resultadoTickets,
      totais_reais_banco: totaisReaisBanco,
      mensagens: mensagensCombinadas
    };

    console.log('✅ [FINAL] Sincronização seletiva finalizada');
    console.log('📊 [DEBUG] Tabelas sincronizadas:', tabelasParaSincronizar);
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
      apontamentos: null,
      tickets: null,
      totais_reais_banco: {
        pesquisas: 0,
        especialistas: 0,
        apontamentos: 0,
        tickets: 0
      }
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
  const API_URL = import.meta.env.VITE_SYNC_API_URL || 'https://sync-api-p3jr.onrender.com:3001';
  
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
