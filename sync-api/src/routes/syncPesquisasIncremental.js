/**
 * Endpoint de Sincronização Incremental de Pesquisas
 * 
 * POST /api/sync-pesquisas-incremental
 * 
 * Implementa sincronização segura e incremental com:
 * - Detecção de mudanças por hash e timestamp
 * - Prevenção de regressão de status
 * - UPSERT idempotente
 * - Controle transacional
 */

const express = require('express');
const router = express.Router();
const { sincronizarPesquisasIncremental } = require('../services/incrementalSyncPesquisasService');

/**
 * POST /api/sync-pesquisas-incremental
 * Sincroniza pesquisas de forma incremental e segura
 */
router.post('/sync-pesquisas-incremental', async (req, res) => {
  const startTime = Date.now();
  
  try {
    console.log('🚀 [API] Iniciando sincronização incremental de pesquisas...');
    
    // Obter pools de conexão do app
    const sqlPool = req.app.locals.sqlPool;
    const supabaseAdmin = req.app.locals.supabaseAdmin;
    
    if (!sqlPool) {
      return res.status(500).json({
        sucesso: false,
        mensagens: ['Pool de conexão SQL Server não disponível'],
        total_processados: 0,
        novos: 0,
        atualizados: 0,
        erros: 1
      });
    }
    
    if (!supabaseAdmin) {
      return res.status(500).json({
        sucesso: false,
        mensagens: ['Cliente Supabase Admin não disponível'],
        total_processados: 0,
        novos: 0,
        atualizados: 0,
        erros: 1
      });
    }
    
    // Executar sincronização incremental
    const resultado = await sincronizarPesquisasIncremental(sqlPool, supabaseAdmin);
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    resultado.mensagens.push(`Tempo de execução: ${duration}s`);
    
    console.log(`✅ [API] Sincronização incremental concluída em ${duration}s`);
    console.log(`📊 [API] Resultado:`, {
      sucesso: resultado.sucesso,
      total_processados: resultado.total_processados,
      novos: resultado.novos,
      atualizados: resultado.atualizados,
      ignorados: resultado.ignorados,
      erros: resultado.erros
    });
    
    // Retornar resultado
    const statusCode = resultado.sucesso ? 200 : 207; // 207 = Multi-Status (sucesso parcial)
    res.status(statusCode).json(resultado);
    
  } catch (erro) {
    console.error('❌ [API] Erro fatal na sincronização incremental:', erro);
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    res.status(500).json({
      sucesso: false,
      total_processados: 0,
      novos: 0,
      atualizados: 0,
      ignorados: 0,
      erros: 1,
      mensagens: [
        `Erro fatal na sincronização: ${erro.message}`,
        `Tempo de execução: ${duration}s`
      ],
      detalhes_erros: [{
        erro: erro.message,
        stack: process.env.NODE_ENV === 'development' ? erro.stack : undefined
      }]
    });
  }
});

/**
 * GET /api/sync-pesquisas-incremental/status
 * Retorna status da última sincronização
 */
router.get('/sync-pesquisas-incremental/status', async (req, res) => {
  try {
    const supabaseAdmin = req.app.locals.supabaseAdmin;
    
    if (!supabaseAdmin) {
      return res.status(500).json({
        erro: 'Cliente Supabase Admin não disponível'
      });
    }
    
    // Buscar última sincronização
    const { data, error } = await supabaseAdmin
      .rpc('obter_ultima_sincronizacao_pesquisas');
    
    if (error) {
      throw error;
    }
    
    if (!data || data.length === 0) {
      return res.json({
        ultima_sincronizacao: null,
        mensagem: 'Nenhuma sincronização registrada'
      });
    }
    
    res.json({
      ultima_sincronizacao: data[0]
    });
    
  } catch (erro) {
    console.error('❌ [API] Erro ao buscar status da sincronização:', erro);
    res.status(500).json({
      erro: erro.message
    });
  }
});

module.exports = router;
