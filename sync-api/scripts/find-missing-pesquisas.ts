/**
 * Script para Identificar Pesquisas Perdidas na Sincronização
 * 
 * Detecta chamados no SQL Server que passam nos filtros mas não foram
 * sincronizados para o Supabase. Isso ocorre quando a Data_Ultima_Modificacao
 * é anterior à Data_Fechamento (fechamento manual posterior à última modificação),
 * fazendo com que o sync incremental "pule" esses registros.
 * 
 * USO:
 *   npx ts-node scripts/find-missing-pesquisas.ts
 *   npx ts-node scripts/find-missing-pesquisas.ts --sync   (para sincronizar os faltantes)
 * 
 * PRÉ-REQUISITOS:
 *   - VPN ativa (para conectar ao SQL Server 172.26.2.136)
 *   - .env configurado com credenciais do Supabase e SQL Server
 */

import dotenv from 'dotenv';
dotenv.config();

import mssql from 'mssql';
import { createClient } from '@supabase/supabase-js';

// ============================================
// CONFIGURAÇÃO
// ============================================

const sqlConfig: mssql.config = {
  server: process.env.SQL_SERVER || '172.26.2.136',
  port: parseInt(process.env.SQL_PORT || '10443'),
  database: process.env.SQL_DATABASE || 'Aranda',
  user: process.env.SQL_USER || 'amsconsulta',
  password: process.env.SQL_PASSWORD || 'ams@2023',
  options: {
    encrypt: false,
    trustServerCertificate: true,
    connectTimeout: 30000,
    requestTimeout: 60000,
    useUTC: false
  }
};

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

// Flag para executar sincronização
const EXECUTAR_SYNC = process.argv.includes('--sync');

// ============================================
// FUNÇÕES AUXILIARES
// ============================================

function log(emoji: string, msg: string) {
  console.log(`${emoji} ${msg}`);
}

function formatarDataSemTimezone(date: Date | string | null | undefined): string | null {
  if (!date) return null;
  try {
    const dataObj = date instanceof Date ? date : new Date(date);
    if (isNaN(dataObj.getTime())) return null;
    const year = dataObj.getFullYear();
    const month = String(dataObj.getMonth() + 1).padStart(2, '0');
    const day = String(dataObj.getDate()).padStart(2, '0');
    const hours = String(dataObj.getHours()).padStart(2, '0');
    const minutes = String(dataObj.getMinutes()).padStart(2, '0');
    const seconds = String(dataObj.getSeconds()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
  } catch {
    return null;
  }
}

// ============================================
// SCRIPT PRINCIPAL
// ============================================

async function main() {
  console.log('');
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║  DETECTOR DE PESQUISAS PERDIDAS NA SINCRONIZAÇÃO          ║');
  console.log('║  Identifica chamados que não foram sincronizados           ║');
  console.log('╚════════════════════════════════════════════════════════════╝');
  console.log('');

  let pool: mssql.ConnectionPool | null = null;

  try {
    // 1. Conectar ao SQL Server
    log('🔌', 'Conectando ao SQL Server...');
    pool = await mssql.connect(sqlConfig);
    log('✅', `Conectado ao SQL Server: ${sqlConfig.server}:${sqlConfig.port}`);

    // 2. Buscar TODOS os Nro_Caso válidos do SQL Server (com os mesmos filtros do sync)
    log('📊', 'Buscando todos os chamados válidos no SQL Server...');
    
    const querySQL = `
      SELECT 
        Nro_Caso,
        Empresa,
        Grupo,
        Tipo_Caso,
        Cliente,
        Solicitante,
        [Data_Fechamento (Date-Hour-Minute-Second)] as Data_Fechamento,
        [Data_Ultima_Modificacao (Year)] as Data_Ultima_Modificacao,
        [Data_Resposta (Date-Hour-Minute-Second)] as Data_Resposta,
        Resposta,
        Categoria,
        Email_Cliente,
        Prestador,
        Ano_Abertura,
        Mes_abertura,
        Comentario_Pesquisa,
        Servico,
        Nome_Pesquisa,
        Autor_Notificacao,
        Estado,
        Descricao,
        Pesquisa_Recebida,
        Pergunta,
        SequenciaPregunta,
        LOG
      FROM ${process.env.SQL_TABLE || 'AMSpesquisa'}
      WHERE (Grupo NOT LIKE 'AMS SAP%' OR Grupo IS NULL)
        AND [Data_Fechamento (Date-Hour-Minute-Second)] >= '2026-01-01 00:00:00'
        AND LOWER(LTRIM(RTRIM(Cliente))) != 'user - ams - teste'
        AND Nro_Caso IS NOT NULL
        AND LTRIM(RTRIM(Nro_Caso)) != ''
      ORDER BY Empresa, Nro_Caso
    `;

    const resultSQL = await pool.request().query(querySQL);
    const registrosSQL = resultSQL.recordset;
    log('✅', `Total de chamados válidos no SQL Server: ${registrosSQL.length}`);

    // 3. Buscar todos os nro_caso existentes no Supabase
    log('📊', 'Buscando chamados existentes no Supabase...');
    
    const nroCasosSupabase = new Set<string>();
    let offset = 0;
    const pageSize = 1000;
    
    while (true) {
      const { data, error } = await supabase
        .from('pesquisas_satisfacao')
        .select('nro_caso')
        .eq('origem', 'sql_server')
        .not('nro_caso', 'is', null)
        .range(offset, offset + pageSize - 1);

      if (error) {
        log('❌', `Erro ao buscar do Supabase: ${error.message}`);
        break;
      }

      if (!data || data.length === 0) break;
      
      data.forEach(r => {
        if (r.nro_caso) nroCasosSupabase.add(r.nro_caso.trim());
      });
      
      offset += pageSize;
      if (data.length < pageSize) break;
    }

    log('✅', `Total de chamados no Supabase: ${nroCasosSupabase.size}`);

    // 4. Identificar chamados FALTANTES
    const faltantes = registrosSQL.filter(r => {
      const nroCaso = (r.Nro_Caso || '').trim();
      return nroCaso && !nroCasosSupabase.has(nroCaso);
    });

    log('🔍', `Chamados FALTANTES (no SQL Server mas NÃO no Supabase): ${faltantes.length}`);
    console.log('');

    if (faltantes.length === 0) {
      log('🎉', 'Nenhum chamado faltante! Sincronização está completa.');
      return;
    }

    // 5. Analisar por empresa
    const porEmpresa: Record<string, typeof faltantes> = {};
    faltantes.forEach(r => {
      const empresa = r.Empresa || 'SEM EMPRESA';
      if (!porEmpresa[empresa]) porEmpresa[empresa] = [];
      porEmpresa[empresa].push(r);
    });

    console.log('═══════════════════════════════════════════════════════════');
    console.log('  RESUMO POR EMPRESA');
    console.log('═══════════════════════════════════════════════════════════');
    
    const empresasOrdenadas = Object.entries(porEmpresa)
      .sort((a, b) => b[1].length - a[1].length);

    empresasOrdenadas.forEach(([empresa, registros]) => {
      console.log(`  📋 ${empresa}: ${registros.length} chamados faltantes`);
    });

    console.log('');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('  DETALHES DOS CHAMADOS FALTANTES (primeiros 50)');
    console.log('═══════════════════════════════════════════════════════════');

    // 6. Analisar a causa (Data_Ultima_Modificacao vs Data_Fechamento)
    let comDataModNull = 0;
    let comDataModAnteriorFechamento = 0;
    let outroMotivo = 0;

    faltantes.slice(0, 50).forEach((r, i) => {
      const dataFech = r.Data_Fechamento ? new Date(r.Data_Fechamento) : null;
      const dataMod = r.Data_Ultima_Modificacao ? new Date(r.Data_Ultima_Modificacao) : null;
      
      let causa = '';
      if (!dataMod) {
        causa = '⚠️ Data_Ultima_Modificacao = NULL';
        comDataModNull++;
      } else if (dataFech && dataMod < dataFech) {
        causa = '🔄 Data_Modificacao < Data_Fechamento (fechamento manual)';
        comDataModAnteriorFechamento++;
      } else {
        causa = '❓ Outro motivo (janela temporal do sync)';
        outroMotivo++;
      }

      console.log(`  ${i + 1}. [${(r.Nro_Caso || '').trim()}] ${r.Empresa}`);
      console.log(`     Grupo: ${r.Grupo || 'N/A'}`);
      console.log(`     Data Fechamento: ${dataFech ? dataFech.toLocaleString('pt-BR') : 'NULL'}`);
      console.log(`     Data Modificação: ${dataMod ? dataMod.toLocaleString('pt-BR') : 'NULL'}`);
      console.log(`     Causa: ${causa}`);
      console.log('');
    });

    // Contar causas para todos os faltantes (não só primeiros 50)
    faltantes.forEach(r => {
      const dataFech = r.Data_Fechamento ? new Date(r.Data_Fechamento) : null;
      const dataMod = r.Data_Ultima_Modificacao ? new Date(r.Data_Ultima_Modificacao) : null;
      
      if (!dataMod) comDataModNull++;
      else if (dataFech && dataMod < dataFech) comDataModAnteriorFechamento++;
      else outroMotivo++;
    });

    // Ajustar (contou 2x os primeiros 50)
    if (faltantes.length > 50) {
      // Os primeiros 50 foram contados no loop de detalhes, recalcular tudo
      comDataModNull = 0;
      comDataModAnteriorFechamento = 0;
      outroMotivo = 0;
      faltantes.forEach(r => {
        const dataFech = r.Data_Fechamento ? new Date(r.Data_Fechamento) : null;
        const dataMod = r.Data_Ultima_Modificacao ? new Date(r.Data_Ultima_Modificacao) : null;
        if (!dataMod) comDataModNull++;
        else if (dataFech && dataMod < dataFech) comDataModAnteriorFechamento++;
        else outroMotivo++;
      });
    }

    console.log('═══════════════════════════════════════════════════════════');
    console.log('  ANÁLISE DE CAUSAS');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`  ⚠️  Data_Ultima_Modificacao = NULL:        ${comDataModNull}`);
    console.log(`  🔄 Data_Modificacao < Data_Fechamento:     ${comDataModAnteriorFechamento}`);
    console.log(`  ❓ Outro motivo (janela temporal):         ${outroMotivo}`);
    console.log(`  ─────────────────────────────────────────`);
    console.log(`  📊 TOTAL FALTANTES:                        ${faltantes.length}`);
    console.log('');

    // 7. Se flag --sync, sincronizar os faltantes
    if (EXECUTAR_SYNC) {
      console.log('═══════════════════════════════════════════════════════════');
      console.log('  🚀 SINCRONIZANDO CHAMADOS FALTANTES...');
      console.log('═══════════════════════════════════════════════════════════');

      let inseridos = 0;
      let erros = 0;

      for (let i = 0; i < faltantes.length; i++) {
        const r = faltantes[i];
        const nroCaso = (r.Nro_Caso || '').trim();

        try {
          // Aplicar transformação AMS
          let empresa = r.Empresa || '';
          let cliente = r.Cliente || '';
          let solicitante = r.Solicitante || null;

          if (cliente.includes('-AMS')) {
            empresa = 'SONDA INTERNO';
            cliente = solicitante || cliente;
          }

          const idExterno = [
            empresa.trim() || 'sem_empresa',
            cliente.trim() || 'sem_cliente',
            nroCaso || 'sem_caso'
          ].filter(Boolean).join('|');

          const dados = {
            id_externo: idExterno,
            origem: 'sql_server' as const,
            empresa: empresa,
            categoria: r.Categoria || null,
            grupo: r.Grupo || null,
            cliente: cliente,
            email_cliente: r.Email_Cliente || null,
            prestador: r.Prestador || null,
            solicitante: solicitante,
            nro_caso: nroCaso,
            tipo_caso: r.Tipo_Caso || null,
            ano_abertura: r.Ano_Abertura ? parseInt(r.Ano_Abertura) : null,
            mes_abertura: r.Mes_abertura ? parseInt(r.Mes_abertura) : null,
            data_resposta: formatarDataSemTimezone(r.Data_Resposta),
            resposta: r.Resposta || null,
            comentario_pesquisa: r.Comentario_Pesquisa || null,
            status: 'pendente' as const,
            servico: r.Servico || null,
            nome_pesquisa: r.Nome_Pesquisa || null,
            data_fechamento: formatarDataSemTimezone(r.Data_Fechamento),
            data_ultima_modificacao: formatarDataSemTimezone(r.Data_Ultima_Modificacao),
            autor_notificacao: r.Autor_Notificacao || null,
            estado: r.Estado || null,
            descricao: r.Descricao || null,
            pesquisa_recebida: r.Pesquisa_Recebida || null,
            pergunta: r.Pergunta || null,
            sequencia_pergunta: r.SequenciaPregunta || null,
            log: formatarDataSemTimezone(r.LOG),
            autor_id: null,
            autor_nome: 'Script find-missing-pesquisas'
          };

          const { error } = await supabase
            .from('pesquisas_satisfacao')
            .insert(dados);

          if (error) {
            // Se duplicado, ignorar silenciosamente
            if (error.code === '23505') {
              continue;
            }
            log('❌', `Erro ao inserir ${nroCaso}: ${error.message}`);
            erros++;
          } else {
            inseridos++;
            if (inseridos % 50 === 0) {
              log('📊', `Progresso: ${inseridos} inseridos de ${faltantes.length}...`);
            }
          }
        } catch (err: any) {
          log('❌', `Erro ao processar ${nroCaso}: ${err.message}`);
          erros++;
        }
      }

      console.log('');
      console.log('═══════════════════════════════════════════════════════════');
      console.log('  RESULTADO DA SINCRONIZAÇÃO');
      console.log('═══════════════════════════════════════════════════════════');
      console.log(`  ✅ Inseridos: ${inseridos}`);
      console.log(`  ❌ Erros: ${erros}`);
      console.log(`  📊 Total processados: ${faltantes.length}`);
      console.log('');
    } else {
      console.log('');
      log('💡', 'Para sincronizar os chamados faltantes, execute:');
      console.log('    npx ts-node scripts/find-missing-pesquisas.ts --sync');
      console.log('');
    }

  } catch (error: any) {
    log('❌', `Erro fatal: ${error.message}`);
    console.error(error);
  } finally {
    if (pool) {
      await pool.close();
      log('🔌', 'Conexão SQL Server fechada.');
    }
  }
}

// Executar
main().catch(console.error);
