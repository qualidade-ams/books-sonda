/**
 * Serviço de sincronização de especialistas com SQL Server
 * Sincroniza dados da tabela AMSespecialistas do SQL Server para o Supabase
 */

import { supabase } from '@/integrations/supabase/client';
import type { DadosEspecialistaSqlServer, ResultadoSincronizacaoEspecialistas } from '@/types/especialistas';

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
  console.log('✓ Configuração SQL Server para especialistas atualizada');
}

// ============================================
// SINCRONIZAÇÃO
// ============================================

/**
 * Gerar ID único para registro do SQL Server
 */
function gerarIdUnico(registro: DadosEspecialistaSqlServer): string {
  // Combinar campos para criar ID único usando as propriedades corretas da interface
  const partes = [
    'AMSespecialistas', // Prefixo para diferenciar de outras tabelas
    registro.user_name,
    registro.user_email
  ].filter(Boolean);
  
  return partes.join('|');
}

/**
 * Sincronizar dados de especialistas do SQL Server para Supabase
 * Usa a API Node.js que faz todo o processamento
 */
export async function sincronizarEspecialistas(): Promise<ResultadoSincronizacaoEspecialistas> {
  const API_URL = import.meta.env.VITE_SYNC_API_URL || 'https://SAPSERVDB.sondait.com.br:3001';
  
  try {
    console.log('Chamando API de sincronização de especialistas...');
    
    const response = await fetch(`${API_URL}/api/sync-especialistas`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (response.status === 404) {
      return {
        sucesso: false,
        total_processados: 0,
        novos: 0,
        atualizados: 0,
        removidos: 0,
        erros: 1,
        mensagens: [
          'Endpoint de sincronização de especialistas não implementado na API.',
          'A API está online mas o endpoint /api/sync-especialistas não existe.',
          'Verifique se a API foi atualizada com os endpoints de sincronização.'
        ],
        detalhes_erros: []
      };
    }

    if (!response.ok) {
      throw new Error(`Erro HTTP: ${response.status}`);
    }

    const resultado: ResultadoSincronizacaoEspecialistas = await response.json();
    
    console.log('Resultado da sincronização de especialistas:', resultado);
    
    return resultado;

  } catch (erro) {
    console.error('Erro ao sincronizar especialistas:', erro);
    
    return {
      sucesso: false,
      total_processados: 0,
      novos: 0,
      atualizados: 0,
      removidos: 0,
      erros: 1,
      mensagens: [`Erro ao conectar com API: ${erro instanceof Error ? erro.message : 'Erro desconhecido'}`],
      detalhes_erros: []
    };
  }
}

/**
 * Verificar status da última sincronização de especialistas
 */
export async function verificarUltimaSincronizacaoEspecialistas(): Promise<{
  data: string | null;
  total_registros: number;
}> {
  try {
    // @ts-ignore - Supabase type inference issues with complex relationships
    const { data: ultimoRegistro, error } = await (supabase as any)
      .from('especialistas')
      .select('created_at')
      .eq('origem', 'sql_server')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !ultimoRegistro) {
      console.log('Nenhum registro encontrado ou erro:', error);
      return {
        data: null,
        total_registros: 0
      };
    }

    // @ts-ignore - Supabase type inference issues with complex relationships
    const { count } = await (supabase as any)
      .from('especialistas')
      .select('*', { count: 'exact', head: true })
      .eq('origem', 'sql_server');

    return {
      data: ultimoRegistro?.created_at || null,
      total_registros: count || 0
    };
  } catch (error) {
    console.error('Erro ao verificar última sincronização de especialistas:', error);
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
 * Testar conexão com tabela AMSespecialistas via API
 */
export async function testarConexaoEspecialistas(): Promise<boolean> {
  const API_URL = import.meta.env.VITE_SYNC_API_URL || 'https://SAPSERVDB.sondait.com.br:3001';
  
  try {
    console.log('Testando conexão com tabela AMSespecialistas via API...');
    
    const response = await fetch(`${API_URL}/api/test-connection-especialistas`);
    
    if (!response.ok) {
      throw new Error(`Erro HTTP: ${response.status}`);
    }

    const data = await response.json();
    console.log('Teste de conexão especialistas:', data);
    
    return data.success;
    
  } catch (erro) {
    console.error('Erro ao testar conexão especialistas:', erro);
    return false;
  }
}

/**
 * Obter estrutura da tabela AMSespecialistas
 */
export async function obterEstruturaEspecialistas(): Promise<any> {
  const API_URL = import.meta.env.VITE_SYNC_API_URL || 'https://SAPSERVDB.sondait.com.br:3001';
  
  try {
    console.log('Consultando estrutura da tabela AMSespecialistas...');
    
    const response = await fetch(`${API_URL}/api/table-structure-especialistas`);
    
    if (!response.ok) {
      throw new Error(`Erro HTTP: ${response.status}`);
    }

    const data = await response.json();
    console.log('Estrutura da tabela AMSespecialistas:', data);
    
    return data;
    
  } catch (erro) {
    console.error('Erro ao consultar estrutura especialistas:', erro);
    return null;
  }
}