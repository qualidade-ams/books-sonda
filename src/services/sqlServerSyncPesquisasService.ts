/**
 * Serviço de sincronização com SQL Server
 * Sincroniza dados de pesquisas do SQL Server para o Supabase
 */

import { supabase } from '@/integrations/supabase/client';
import { safeFetch } from '@/utils/apiConfig';
import type { DadosSqlServer } from '@/types/pesquisasSatisfacao';

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
  const API_URL = import.meta.env.VITE_SYNC_API_URL || 'https://sync-api.sondalyze.com.br';
  
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
 * Buscar última data de sincronização de cada tabela
 * Usa a tabela sync_metadata que registra quando cada sincronização foi executada
 */
export async function verificarUltimasSincronizacoesPorTabela(): Promise<{
  pesquisas: string | null;
  especialistas: string | null;
  apontamentos: string | null;
  tickets: string | null;
}> {
  try {
    const { data, error } = await supabase
      .from('sync_metadata' as any)
      .select('tabela, ultima_execucao')
      .in('tabela', ['pesquisas', 'especialistas', 'apontamentos', 'tickets']);

    if (error) {
      console.error('Erro ao buscar sync_metadata:', error);
      return { pesquisas: null, especialistas: null, apontamentos: null, tickets: null };
    }

    const resultado = {
      pesquisas: null as string | null,
      especialistas: null as string | null,
      apontamentos: null as string | null,
      tickets: null as string | null,
    };

    if (data) {
      for (const row of data as any[]) {
        if (row.tabela === 'pesquisas') resultado.pesquisas = row.ultima_execucao;
        if (row.tabela === 'especialistas') resultado.especialistas = row.ultima_execucao;
        if (row.tabela === 'apontamentos') resultado.apontamentos = row.ultima_execucao;
        if (row.tabela === 'tickets') resultado.tickets = row.ultima_execucao;
      }
    }

    return resultado;
  } catch (error) {
    console.error('Erro ao verificar últimas sincronizações por tabela:', error);
    return { pesquisas: null, especialistas: null, apontamentos: null, tickets: null };
  }
}

/**
 * Testar conexão com SQL Server via API
 */
export async function testarConexao(): Promise<boolean> {
  const API_URL = import.meta.env.VITE_SYNC_API_URL || 'https://sync-api.sondalyze.com.br';
  
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
