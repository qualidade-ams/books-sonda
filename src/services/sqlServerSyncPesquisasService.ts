/**
 * Serviço de sincronização com SQL Server
 * Sincroniza dados de pesquisas do SQL Server para o Supabase
 */

import { supabase } from '@/integrations/supabase/client';
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
  const API_URL = import.meta.env.VITE_SYNC_API_URL || 'https://SAPSERVDB.sondait.com.br:3001';
  
  try {
    const response = await fetch(`${API_URL}/api/sync-pesquisas`, {
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
 * INCLUI sincronização de pesquisas E especialistas
 */
export async function sincronizarDados(): Promise<ResultadoSincronizacao & { especialistas?: any }> {
  const API_URL = import.meta.env.VITE_SYNC_API_URL || 'https://SAPSERVDB.sondait.com.br:3001';
  
  try {
    console.log('Iniciando sincronização completa (pesquisas + especialistas)...');
    
    // 1. Sincronizar pesquisas (funcionalidade existente)
    console.log('1/2 - Sincronizando pesquisas...');
    const responsePesquisas = await fetch(`${API_URL}/api/sync-pesquisas`, {
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

    // 2. Sincronizar especialistas (nova funcionalidade)
    console.log('2/2 - Sincronizando especialistas...');
    const responseEspecialistas = await fetch(`${API_URL}/api/sync-especialistas`, {
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
      console.warn('Erro na sincronização de especialistas, continuando apenas com pesquisas');
      resultadoEspecialistas = {
        sucesso: false,
        mensagens: [`Erro HTTP: ${responseEspecialistas.status}`]
      };
    }

    // 3. Combinar resultados
    const resultadoCombinado = {
      ...resultadoPesquisas,
      especialistas: resultadoEspecialistas,
      mensagens: [
        ...resultadoPesquisas.mensagens,
        '--- Especialistas ---',
        ...(resultadoEspecialistas?.mensagens || ['Erro na sincronização de especialistas'])
      ]
    };

    console.log('Sincronização completa finalizada:', resultadoCombinado);
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
      especialistas: null
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
      .single<{ created_at: string }>();

    if (error || !ultimoRegistro) {
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
  const API_URL = import.meta.env.VITE_SYNC_API_URL || 'https://SAPSERVDB.sondait.com.br:3001';
  
  try {
    console.log('Testando conexão com SQL Server via API...');
    
    const response = await fetch(`${API_URL}/api/test-connection`);
    
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
