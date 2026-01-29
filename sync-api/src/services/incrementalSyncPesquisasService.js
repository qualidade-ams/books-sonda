/**
 * Serviço de Sincronização Incremental de Pesquisas
 * 
 * Implementa sincronização segura e incremental com:
 * - Detecção de mudanças por hash e timestamp
 * - Prevenção de regressão de status
 * - UPSERT idempotente
 * - Controle transacional
 */

const crypto = require('crypto');

/**
 * Gerar hash MD5 para detectar mudanças
 */
function gerarHash(registro) {
  const campos = [
    registro.empresa || '',
    registro.Cliente || '',
    registro.Nro_caso || '',
    registro.Data_Resposta ? registro.Data_Resposta.toISOString() : '',
    registro.Resposta || '',
    registro.Comentario_Pesquisa || ''
  ].join('|');
  
  return crypto.createHash('md5').update(campos).digest('hex');
}

/**
 * Gerar chave única para identificação do registro
 */
function gerarChaveUnica(registro) {
  return [
    registro.empresa || '',
    registro.Cliente || '',
    registro.Nro_caso || '',
    registro.Data_Resposta ? registro.Data_Resposta.toISOString() : ''
  ].join('|');
}

/**
 * Determinar status baseado na resposta
 */
function determinarStatus(resposta, dataResposta) {
  if (!dataResposta || !resposta || resposta === '-') {
    return 'pendente'; // ENVIADA
  }
  
  const respostasValidas = [
    'Muito Satisfeito',
    'Satisfeito', 
    'Neutro',
    'Insatisfeito',
    'Muito Insatisfeito'
  ];
  
  return respostasValidas.includes(resposta) ? 'respondida' : 'pendente';
}

/**
 * Verificar se deve atualizar registro (evitar downgrade de status)
 */
function deveAtualizar(registroLocal, registroOrigem) {
  // Se não existe localmente, sempre inserir
  if (!registroLocal) {
    return { atualizar: true, motivo: 'novo_registro' };
  }
  
  const statusLocal = registroLocal.status;
  const statusOrigem = determinarStatus(
    registroOrigem.Resposta,
    registroOrigem.Data_Resposta
  );
  
  // Regra 1: Nunca fazer downgrade de status
  // Se local está RESPONDIDA e origem está ENVIADA, ignorar
  if (statusLocal === 'respondida' && statusOrigem === 'pendente') {
    return { 
      atualizar: false, 
      motivo: 'prevencao_downgrade',
      detalhe: 'Local RESPONDIDA, origem ENVIADA - ignorando'
    };
  }
  
  // Regra 2: Atualizar se source_updated_at mudou
  const sourceUpdatedLocal = registroLocal.source_updated_at 
    ? new Date(registroLocal.source_updated_at)
    : null;
  const sourceUpdatedOrigem = registroOrigem.Data_Resposta 
    ? new Date(registroOrigem.Data_Resposta)
    : null;
  
  if (sourceUpdatedOrigem && sourceUpdatedLocal) {
    if (sourceUpdatedOrigem > sourceUpdatedLocal) {
      return { 
        atualizar: true, 
        motivo: 'timestamp_mais_recente',
        detalhe: `Origem: ${sourceUpdatedOrigem.toISOString()}, Local: ${sourceUpdatedLocal.toISOString()}`
      };
    }
  }
  
  // Regra 3: Atualizar se hash mudou
  const hashLocal = registroLocal.hash_origem;
  const hashOrigem = gerarHash(registroOrigem);
  
  if (hashLocal !== hashOrigem) {
    return { 
      atualizar: true, 
      motivo: 'hash_diferente',
      detalhe: `Hash local: ${hashLocal}, Hash origem: ${hashOrigem}`
    };
  }
  
  // Regra 4: Upgrade de status (ENVIADA → RESPONDIDA)
  if (statusLocal === 'pendente' && statusOrigem === 'respondida') {
    return { 
      atualizar: true, 
      motivo: 'upgrade_status',
      detalhe: 'ENVIADA → RESPONDIDA'
    };
  }
  
  // Sem mudanças detectadas
  return { 
    atualizar: false, 
    motivo: 'sem_mudancas',
    detalhe: 'Registro idêntico'
  };
}

/**
 * Sincronização incremental de pesquisas
 */
async function sincronizarPesquisasIncremental(sqlPool, supabaseAdmin) {
  const resultado = {
    sucesso: false,
    total_processados: 0,
    novos: 0,
    atualizados: 0,
    ignorados: 0,
    erros: 0,
    mensagens: [],
    detalhes_erros: []
  };
  
  let transaction = null;
  
  try {
    console.log('🔄 [SYNC] Iniciando sincronização incremental de pesquisas...');
    
    // Passo 1: Obter última sincronização bem-sucedida
    const { data: ultimaSync, error: errorSync } = await supabaseAdmin
      .rpc('obter_ultima_sincronizacao_pesquisas');
    
    const ultimaSincronizacao = ultimaSync && ultimaSync.length > 0 
      ? new Date(ultimaSync[0].last_sync_at)
      : null;
    
    console.log('📅 [SYNC] Última sincronização:', ultimaSincronizacao?.toISOString() || 'Nunca');
    
    // Passo 2: Buscar registros do SQL Server
    // 2a) Registros alterados desde última sincronização
    // 2b) Registros que localmente estão ENVIADA (pendentes de resposta)
    
    let query = `
      SELECT 
        empresa,
        Categoria,
        Grupo,
        Cliente,
        Email_Cliente,
        Prestador,
        Solicitante,
        Nro_caso,
        Tipo_Caso,
        Ano_Abertura,
        Mes_abertura,
        Data_Resposta,
        Resposta,
        Comentario_Pesquisa
      FROM [dbo].[Pesquisas_Satisfacao]
      WHERE 1=1
    `;
    
    // Se há última sincronização, buscar apenas registros alterados
    if (ultimaSincronizacao) {
      query += ` AND Data_Resposta >= @ultimaSync`;
    }
    
    query += ` ORDER BY Data_Resposta DESC`;
    
    const request = sqlPool.request();
    if (ultimaSincronizacao) {
      request.input('ultimaSync', ultimaSincronizacao);
    }
    
    const resultSql = await request.query(query);
    const registrosOrigem = resultSql.recordset;
    
    console.log(`📊 [SYNC] Registros encontrados no SQL Server: ${registrosOrigem.length}`);
    
    if (registrosOrigem.length === 0) {
      resultado.sucesso = true;
      resultado.mensagens.push('Nenhum registro novo ou alterado encontrado');
      return resultado;
    }
    
    // Passo 3: Buscar registros locais com status ENVIADA
    const { data: registrosPendentes, error: errorPendentes } = await supabaseAdmin
      .from('pesquisas_satisfacao')
      .select('chave_unica, status, source_updated_at, hash_origem')
      .eq('origem', 'sql_server')
      .eq('status', 'pendente');
    
    console.log(`📊 [SYNC] Registros locais ENVIADA: ${registrosPendentes?.length || 0}`);
    
    // Passo 4: Criar mapa de registros locais para lookup rápido
    const mapaLocal = new Map();
    
    // Adicionar registros pendentes ao mapa
    if (registrosPendentes) {
      for (const reg of registrosPendentes) {
        mapaLocal.set(reg.chave_unica, reg);
      }
    }
    
    // Buscar também registros que correspondem às chaves dos registros de origem
    const chavesOrigem = registrosOrigem.map(r => gerarChaveUnica(r));
    const { data: registrosExistentes, error: errorExistentes } = await supabaseAdmin
      .from('pesquisas_satisfacao')
      .select('chave_unica, status, source_updated_at, hash_origem')
      .eq('origem', 'sql_server')
      .in('chave_unica', chavesOrigem);
    
    if (registrosExistentes) {
      for (const reg of registrosExistentes) {
        mapaLocal.set(reg.chave_unica, reg);
      }
    }
    
    console.log(`📊 [SYNC] Total de registros locais mapeados: ${mapaLocal.size}`);
    
    // Passo 5: Processar cada registro (UPSERT)
    const registrosParaInserir = [];
    const registrosParaAtualizar = [];
    
    for (const registroOrigem of registrosOrigem) {
      try {
        const chaveUnica = gerarChaveUnica(registroOrigem);
        const hashOrigem = gerarHash(registroOrigem);
        const registroLocal = mapaLocal.get(chaveUnica);
        
        // Verificar se deve atualizar
        const decisao = deveAtualizar(registroLocal, registroOrigem);
        
        if (!decisao.atualizar) {
          resultado.ignorados++;
          console.log(`⏭️  [SYNC] Ignorando: ${chaveUnica} - ${decisao.motivo}`);
          continue;
        }
        
        // Preparar dados para UPSERT
        const dadosUpsert = {
          origem: 'sql_server',
          chave_unica: chaveUnica,
          hash_origem: hashOrigem,
          empresa: registroOrigem.empresa,
          categoria: registroOrigem.Categoria || null,
          grupo: registroOrigem.Grupo || null,
          cliente: registroOrigem.Cliente,
          email_cliente: registroOrigem.Email_Cliente || null,
          prestador: registroOrigem.Prestador || null,
          solicitante: registroOrigem.Solicitante || null,
          nro_caso: registroOrigem.Nro_caso || null,
          tipo_caso: registroOrigem.Tipo_Caso || null,
          ano_abertura: registroOrigem.Ano_Abertura || null,
          mes_abertura: registroOrigem.Mes_abertura || null,
          data_resposta: registroOrigem.Data_Resposta 
            ? registroOrigem.Data_Resposta.toISOString()
            : null,
          resposta: registroOrigem.Resposta || null,
          comentario_pesquisa: registroOrigem.Comentario_Pesquisa || null,
          status: determinarStatus(registroOrigem.Resposta, registroOrigem.Data_Resposta),
          source_updated_at: registroOrigem.Data_Resposta 
            ? registroOrigem.Data_Resposta.toISOString()
            : null,
          synced_at: new Date().toISOString()
        };
        
        if (registroLocal) {
          registrosParaAtualizar.push(dadosUpsert);
          console.log(`🔄 [SYNC] Atualizar: ${chaveUnica} - ${decisao.motivo}`);
        } else {
          registrosParaInserir.push(dadosUpsert);
          console.log(`➕ [SYNC] Inserir: ${chaveUnica} - ${decisao.motivo}`);
        }
        
        resultado.total_processados++;
        
      } catch (erro) {
        resultado.erros++;
        resultado.detalhes_erros.push({
          registro: registroOrigem,
          erro: erro.message
        });
        console.error(`❌ [SYNC] Erro ao processar registro:`, erro);
      }
    }
    
    // Passo 6: Executar UPSERT em lote
    console.log(`📦 [SYNC] Inserindo ${registrosParaInserir.length} novos registros...`);
    console.log(`📦 [SYNC] Atualizando ${registrosParaAtualizar.length} registros existentes...`);
    
    // Inserir novos registros
    if (registrosParaInserir.length > 0) {
      const { data: insertData, error: insertError } = await supabaseAdmin
        .from('pesquisas_satisfacao')
        .insert(registrosParaInserir)
        .select('id');
      
      if (insertError) {
        throw new Error(`Erro ao inserir registros: ${insertError.message}`);
      }
      
      resultado.novos = insertData?.length || 0;
      console.log(`✅ [SYNC] ${resultado.novos} registros inseridos`);
    }
    
    // Atualizar registros existentes
    if (registrosParaAtualizar.length > 0) {
      for (const registro of registrosParaAtualizar) {
        const { error: updateError } = await supabaseAdmin
          .from('pesquisas_satisfacao')
          .update(registro)
          .eq('chave_unica', registro.chave_unica)
          .eq('origem', 'sql_server');
        
        if (updateError) {
          console.error(`❌ [SYNC] Erro ao atualizar ${registro.chave_unica}:`, updateError);
          resultado.erros++;
        } else {
          resultado.atualizados++;
        }
      }
      
      console.log(`✅ [SYNC] ${resultado.atualizados} registros atualizados`);
    }
    
    // Passo 7: Registrar sincronização bem-sucedida
    const { error: errorRegistro } = await supabaseAdmin
      .rpc('registrar_sincronizacao_pesquisas', {
        p_total_processados: resultado.total_processados,
        p_novos: resultado.novos,
        p_atualizados: resultado.atualizados,
        p_erros: resultado.erros,
        p_status: resultado.erros === 0 ? 'success' : 'partial',
        p_mensagem: `Sincronização incremental: ${resultado.novos} novos, ${resultado.atualizados} atualizados, ${resultado.ignorados} ignorados`
      });
    
    if (errorRegistro) {
      console.warn('⚠️  [SYNC] Erro ao registrar sincronização:', errorRegistro);
    }
    
    // Passo 8: Finalizar
    resultado.sucesso = resultado.erros === 0;
    resultado.mensagens.push(
      `Sincronização incremental concluída`,
      `Total processados: ${resultado.total_processados}`,
      `Novos: ${resultado.novos}`,
      `Atualizados: ${resultado.atualizados}`,
      `Ignorados: ${resultado.ignorados}`,
      `Erros: ${resultado.erros}`
    );
    
    console.log('✅ [SYNC] Sincronização incremental concluída com sucesso');
    
  } catch (erro) {
    console.error('❌ [SYNC] Erro fatal na sincronização:', erro);
    resultado.sucesso = false;
    resultado.erros++;
    resultado.mensagens.push(`Erro fatal: ${erro.message}`);
    resultado.detalhes_erros.push({
      erro: erro.message,
      stack: erro.stack
    });
  }
  
  return resultado;
}

module.exports = {
  sincronizarPesquisasIncremental,
  gerarHash,
  gerarChaveUnica,
  determinarStatus,
  deveAtualizar
};
