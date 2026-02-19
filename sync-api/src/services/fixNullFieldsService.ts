/**
 * Serviço para Corrigir Campos NULL
 * 
 * Atualiza registros no Supabase que têm data_ult_modificacao_geral NULL
 * buscando os dados corretos do SQL Server
 */

import sql from 'mssql';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Carregar variáveis de ambiente
dotenv.config();

// Validar variáveis de ambiente
if (!process.env.SUPABASE_URL) {
  throw new Error('SUPABASE_URL não está definida no arquivo .env');
}

if (!process.env.SUPABASE_SERVICE_KEY) {
  throw new Error('SUPABASE_SERVICE_KEY não está definida no arquivo .env');
}

// Cliente Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

/**
 * Formata data para ISO string preservando o horário local
 */
function formatarDataSemTimezone(date: Date | string | null | undefined): string | null {
  if (!date) return null;
  
  try {
    const dataObj = date instanceof Date ? date : new Date(date);
    
    if (isNaN(dataObj.getTime())) {
      console.error('❌ Data inválida:', date);
      return null;
    }
    
    const year = dataObj.getFullYear();
    const month = String(dataObj.getMonth() + 1).padStart(2, '0');
    const day = String(dataObj.getDate()).padStart(2, '0');
    const hours = String(dataObj.getHours()).padStart(2, '0');
    const minutes = String(dataObj.getMinutes()).padStart(2, '0');
    const seconds = String(dataObj.getSeconds()).padStart(2, '0');
    
    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
  } catch (erro) {
    console.error('❌ Erro ao formatar data:', erro);
    return null;
  }
}

/**
 * Busca registros com campos NULL no Supabase
 */
async function buscarRegistrosComCamposNull(limite: number = 1000): Promise<Array<{
  id: string;
  id_externo: string;
  nro_chamado: string;
  nro_tarefa: string;
}>> {
  console.log(`📊 [FIX] Buscando até ${limite} registros com campos NULL no Supabase...`);
  
  const { data, error } = await supabase
    .from('apontamentos_aranda')
    .select('id, id_externo, nro_chamado, nro_tarefa')
    .eq('origem', 'sql_server')
    .is('data_ult_modificacao_geral', null)
    .limit(limite);

  if (error) {
    console.error('❌ [FIX] Erro ao buscar registros:', error);
    throw error;
  }

  console.log(`✅ [FIX] ${data?.length || 0} registros encontrados com campos NULL`);
  
  return data || [];
}

/**
 * Busca dados atualizados do SQL Server para um registro específico
 */
async function buscarDadosAtualizadosSqlServer(
  pool: sql.ConnectionPool,
  nroChamado: string,
  nroTarefa: string
): Promise<{
  Data_Ult_Modificacao_Geral: Date | null;
  Data_Ult_Modificacao_tarefa: Date | null;
} | null> {
  const query = `
    SELECT 
      Data_Ult_Modificacao_Geral,
      [Data_Ult_Modificacao_tarefa (Date-Hour-Minute-Second)] as Data_Ult_Modificacao_tarefa
    FROM AMSapontamento
    WHERE Nro_Chamado = @nroChamado
      AND Nro_Tarefa = @nroTarefa
  `;

  const result = await pool.request()
    .input('nroChamado', sql.VarChar, nroChamado)
    .input('nroTarefa', sql.VarChar, nroTarefa)
    .query(query);

  if (result.recordset.length === 0) {
    return null;
  }

  return result.recordset[0];
}

/**
 * Atualiza campos NULL no Supabase
 */
async function atualizarCamposNull(
  id: string,
  dataModGeral: string | null,
  dataModTarefa: string | null
): Promise<void> {
  const { error } = await supabase
    .from('apontamentos_aranda')
    .update({
      data_ult_modificacao_geral: dataModGeral,
      data_ult_modificacao_tarefa: dataModTarefa
    })
    .eq('id', id);

  if (error) {
    console.error('❌ [FIX] Erro ao atualizar registro:', error);
    throw error;
  }
}

/**
 * Função principal para corrigir campos NULL
 */
export async function corrigirCamposNull(
  pool: sql.ConnectionPool,
  limite: number = 1000
): Promise<{
  sucesso: boolean;
  total_processados: number;
  atualizados: number;
  nao_encontrados: number;
  erros: number;
  mensagens: string[];
}> {
  const resultado = {
    sucesso: false,
    total_processados: 0,
    atualizados: 0,
    nao_encontrados: 0,
    erros: 0,
    mensagens: [] as string[]
  };

  try {
    console.log('🔧 [FIX] Iniciando correção de campos NULL...');
    resultado.mensagens.push('Iniciando correção de campos NULL');

    // 1. Buscar registros com campos NULL no Supabase
    const registrosNull = await buscarRegistrosComCamposNull(limite);
    resultado.total_processados = registrosNull.length;
    resultado.mensagens.push(`${registrosNull.length} registros com campos NULL encontrados`);

    if (registrosNull.length === 0) {
      console.log('✅ [FIX] Nenhum registro com campos NULL encontrado');
      resultado.sucesso = true;
      resultado.mensagens.push('Nenhum registro com campos NULL para corrigir');
      return resultado;
    }

    // 2. Processar cada registro
    console.log(`🔄 [FIX] Processando ${registrosNull.length} registros...`);
    
    for (let i = 0; i < registrosNull.length; i++) {
      const registro = registrosNull[i];
      
      // Log de progresso a cada 50 registros
      if (i % 50 === 0 && i > 0) {
        console.log(`📊 [FIX] Progresso: ${i}/${registrosNull.length} registros processados`);
      }

      try {
        // Buscar dados atualizados do SQL Server
        const dadosSqlServer = await buscarDadosAtualizadosSqlServer(
          pool,
          registro.nro_chamado,
          registro.nro_tarefa
        );

        if (!dadosSqlServer) {
          console.log(`⚠️ [FIX] Registro ${i + 1}/${registrosNull.length}: Não encontrado no SQL Server (${registro.nro_chamado}/${registro.nro_tarefa})`);
          resultado.nao_encontrados++;
          continue;
        }

        // Formatar datas
        const dataModGeral = formatarDataSemTimezone(dadosSqlServer.Data_Ult_Modificacao_Geral);
        const dataModTarefa = formatarDataSemTimezone(dadosSqlServer.Data_Ult_Modificacao_tarefa);

        // Atualizar no Supabase
        await atualizarCamposNull(registro.id, dataModGeral, dataModTarefa);

        console.log(`✅ [FIX] Registro ${i + 1}/${registrosNull.length}: ATUALIZADO (${registro.nro_chamado}/${registro.nro_tarefa})`);
        console.log(`   data_ult_modificacao_geral: ${dataModGeral || 'NULL'}`);
        console.log(`   data_ult_modificacao_tarefa: ${dataModTarefa || 'NULL'}`);
        
        resultado.atualizados++;

      } catch (erro) {
        console.error(`💥 [FIX] Erro no registro ${i + 1}/${registrosNull.length}:`, erro);
        resultado.erros++;
      }

      // Parar se houver muitos erros consecutivos
      if (resultado.erros >= 10) {
        console.log('🛑 [FIX] Muitos erros detectados, parando correção...');
        resultado.mensagens.push('Correção interrompida devido a múltiplos erros');
        break;
      }
    }

    // 3. Resultado final
    resultado.sucesso = resultado.erros === 0;
    const mensagemFinal = `Correção concluída: ${resultado.atualizados} atualizados, ${resultado.nao_encontrados} não encontrados, ${resultado.erros} erros`;
    resultado.mensagens.push(mensagemFinal);
    
    console.log('✅ [FIX] ' + mensagemFinal);
    console.log('📊 [FIX] Resultado detalhado:', resultado);

    return resultado;

  } catch (erro) {
    console.error('💥 [FIX] Erro crítico na correção de campos NULL:', erro);
    resultado.sucesso = false;
    resultado.mensagens.push(`Erro crítico: ${erro instanceof Error ? erro.message : 'Erro desconhecido'}`);
    return resultado;
  }
}
