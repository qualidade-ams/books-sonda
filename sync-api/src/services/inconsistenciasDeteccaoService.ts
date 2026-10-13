/**
 * Serviço de Detecção de Inconsistências - Sync API
 * 
 * Usa uma stored procedure (RPC) no PostgreSQL para detectar inconsistências
 * diretamente no banco, sem timeout do client-side.
 * 
 * A função `detectar_inconsistencias()` executa com statement_timeout de 5 minutos
 * e retorna todas as inconsistências detectadas em JSON.
 */

import { SupabaseClient } from '@supabase/supabase-js';

interface ResultadoDeteccao {
  sucesso: boolean;
  novas: number;
  resolvidas: number;
  mantidas: number;
  atualizadas: number;
  total_detectadas: number;
  por_tipo: Record<string, number>;
  mensagens: string[];
  tempo_execucao?: string;
}

interface InconsistenciaDetectada {
  origem: string;
  nro_chamado: string;
  nro_tarefa: string | null;
  tipo_chamado: string | null;
  item_configuracao: string | null;
  tipo_inconsistencia: string;
  descricao_inconsistencia: string;
  data_abertura: string | null;
  data_atividade: string | null;
  data_sistema: string | null;
  tempo_gasto_horas: string | null;
  tempo_gasto_minutos: number | null;
  empresa: string | null;
  analista: string | null;
  status_chamado: string | null;
  cod_resolucao: string | null;
  cod_resolucao_anterior?: string | null;
  chave_unica: string;
}

/**
 * Campos que pertencem à linha e ao ciclo de vida da inconsistência, não ao dado de
 * origem: nunca são sobrescritos pela detecção. Todo o resto que a detecção devolve
 * (analista, status do chamado, tempo, datas, empresa...) acompanha as tabelas de
 * origem e é atualizado nas inconsistências ativas quando muda.
 */
const CAMPOS_FORA_DA_ATUALIZACAO = new Set([
  'id',
  'chave_unica',
  'status',
  'data_deteccao',
  'data_resolucao',
  'arquivado_manualmente',
  'created_at',
  'updated_at',
]);

const TIMESTAMP_ISO = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/;

/** Compara valores ignorando diferença de formato/fuso em timestamps e de tipo em números */
function mesmoValor(atual: any, detectado: any): boolean {
  if (atual == null || detectado == null) return atual == null && detectado == null;
  if (typeof atual === 'number' || typeof detectado === 'number') return Number(atual) === Number(detectado);
  if (TIMESTAMP_ISO.test(String(atual)) && TIMESTAMP_ISO.test(String(detectado))) {
    return new Date(atual).getTime() === new Date(detectado).getTime();
  }
  return String(atual) === String(detectado);
}

/** Campos que mudaram entre a linha gravada e a detecção atual (só os que a detecção informa) */
function camposAlterados(gravada: Record<string, any>, detectada: InconsistenciaDetectada): Record<string, any> {
  const alterados: Record<string, any> = {};
  for (const campo of Object.keys(detectada)) {
    if (CAMPOS_FORA_DA_ATUALIZACAO.has(campo)) continue;
    const novo = (detectada as any)[campo];
    if (novo === undefined) continue;
    if (!mesmoValor(gravada[campo], novo)) alterados[campo] = novo;
  }
  return alterados;
}

/**
 * Executa detecção completa de inconsistências.
 * 1. Chama RPC no banco (detectar_inconsistencias) para obter todas as inconsistências
 * 2. Compara com ativas existentes
 * 3. Insere novas, atualiza as mantidas cujo dado de origem mudou e marca resolvidas
 */
export async function executarDeteccaoInconsistencias(supabase: SupabaseClient): Promise<ResultadoDeteccao> {
  const resultado: ResultadoDeteccao = {
    sucesso: false,
    novas: 0,
    resolvidas: 0,
    mantidas: 0,
    atualizadas: 0,
    total_detectadas: 0,
    por_tipo: {},
    mensagens: []
  };

  try {
    console.log('');
    console.log('🔍 [DETECCAO] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔍 [DETECCAO] Iniciando detecção via RPC (SQL direto)...');
    console.log('🔍 [DETECCAO] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // 1. Executar RPC de detecção (roda direto no banco, sem timeout do client)
    console.log('📊 [DETECCAO] Chamando função detectar_inconsistencias()...');
    const { data: rpcResult, error: rpcError } = await supabase.rpc('detectar_inconsistencias');

    if (rpcError) {
      console.error('❌ [DETECCAO] Erro na RPC:', rpcError.message);
      resultado.mensagens.push(`Erro RPC: ${rpcError.message}`);
      return resultado;
    }

    if (!rpcResult) {
      resultado.mensagens.push('RPC retornou null');
      return resultado;
    }

    const totais = rpcResult.totais || {};
    resultado.total_detectadas = totais.total || 0;
    resultado.por_tipo = {
      ic_999999: totais.ic_999999 || 0,
      sem_atualizacao: totais.sem_atualizacao || 0,
      mes_diferente: totais.mes_diferente || 0,
      tempo_excessivo: totais.tempo_excessivo || 0,
      troca_codigo_resolucao: totais.troca_codigo_resolucao || 0,
      validacao_solucao: totais.validacao_solucao || 0
    };

    console.log(`📊 [DETECCAO] Total detectadas: ${resultado.total_detectadas}`);
    console.log(`   📋 IC 999999: ${totais.ic_999999 || 0}`);
    console.log(`   📋 Sem atualização: ${totais.sem_atualizacao || 0}`);
    console.log(`   📋 Mês diferente: ${totais.mes_diferente || 0}`);
    console.log(`   📋 Tempo excessivo: ${totais.tempo_excessivo || 0}`);
    console.log(`   📋 Troca de código de resolução: ${totais.troca_codigo_resolucao || 0}`);
    console.log(`   📋 Validação campo Solução: ${totais.validacao_solucao || 0}`);
    resultado.mensagens.push(`Total detectadas: ${resultado.total_detectadas}`);

    // 2. Consolidar todas as inconsistências detectadas
    const todasDetectadas: InconsistenciaDetectada[] = [
      ...(rpcResult.ic_999999 || []),
      ...(rpcResult.sem_atualizacao || []),
      ...(rpcResult.mes_diferente || []),
      ...(rpcResult.tempo_excessivo || []),
      ...(rpcResult.troca_codigo_resolucao || []),
      ...(rpcResult.validacao_solucao || [])
    ];

    // 3. Buscar ativas existentes no banco (paginado)
    console.log('📊 [DETECCAO] Comparando com banco de dados...');
    const ativasExistentes: any[] = [];
    let offset = 0;
    const PAGE_SIZE = 1000;

    while (true) {
      const { data, error } = await supabase
        .from('inconsistencias_chamados')
        .select('*')
        .eq('status', 'ativa')
        .range(offset, offset + PAGE_SIZE - 1);

      if (error) {
        console.error(`❌ [DETECCAO] Erro buscar ativas (offset ${offset}):`, error.message);
        break;
      }
      if (!data || data.length === 0) break;
      ativasExistentes.push(...data);
      if (data.length < PAGE_SIZE) break;
      offset += PAGE_SIZE;
    }

    console.log(`   📋 Ativas existentes: ${ativasExistentes.length}`);

    const ativasMap = new Map<string, string>();
    const ativasPorChave = new Map<string, any>();
    for (const ativa of ativasExistentes) {
      ativasMap.set(ativa.chave_unica, ativa.id);
      ativasPorChave.set(ativa.chave_unica, ativa);
    }

    // 4. Buscar arquivadas manualmente (não reinserir)
    const arquivadasManualmente: any[] = [];
    offset = 0;
    while (true) {
      const { data, error } = await supabase
        .from('inconsistencias_chamados')
        .select('chave_unica')
        .eq('arquivado_manualmente', true)
        .range(offset, offset + PAGE_SIZE - 1);

      if (error) break;
      if (!data || data.length === 0) break;
      arquivadasManualmente.push(...data);
      if (data.length < PAGE_SIZE) break;
      offset += PAGE_SIZE;
    }

    const chavesArquivadas = new Set<string>();
    for (const arq of arquivadasManualmente) {
      chavesArquivadas.add(arq.chave_unica);
    }
    console.log(`   📋 Arquivadas manualmente: ${chavesArquivadas.size}`);

    // 5. Determinar novas vs mantidas
    const chavesDetectadas = new Set<string>();
    const novasInconsistencias: any[] = [];

    for (const inc of todasDetectadas) {
      chavesDetectadas.add(inc.chave_unica);

      if (!ativasMap.has(inc.chave_unica) && !chavesArquivadas.has(inc.chave_unica)) {
        novasInconsistencias.push({
          ...inc,
          status: 'ativa',
          data_deteccao: new Date().toISOString()
        });
      }
    }

    // 6. Identificar resolvidas
    const idsResolvidas: string[] = [];
    for (const [chave, id] of ativasMap.entries()) {
      if (!chavesDetectadas.has(chave)) {
        idsResolvidas.push(id);
      }
    }

    // 7. Inserir novas (em lotes de 100, deduplicadas)
    if (novasInconsistencias.length > 0) {
      console.log(`📊 [DETECCAO] Persistindo ${novasInconsistencias.length} novas...`);

      const mapaDeduplicado = new Map<string, any>();
      for (const item of novasInconsistencias) {
        mapaDeduplicado.set(item.chave_unica, item);
      }
      const deduplicadas = Array.from(mapaDeduplicado.values());

      const batchSize = 100;
      for (let i = 0; i < deduplicadas.length; i += batchSize) {
        const batch = deduplicadas.slice(i, i + batchSize);
        const { error } = await supabase
          .from('inconsistencias_chamados')
          .upsert(batch, { onConflict: 'chave_unica' });

        if (error) {
          console.error(`❌ [DETECCAO] Erro inserir batch ${Math.floor(i / batchSize) + 1}:`, error.message);
          resultado.mensagens.push(`Erro lote: ${error.message}`);
        }
      }
      resultado.novas = deduplicadas.length;
      console.log(`✅ [DETECCAO] ${deduplicadas.length} novas inseridas`);
    }

    // 8. Marcar resolvidas (em lotes de 100)
    if (idsResolvidas.length > 0) {
      console.log(`📊 [DETECCAO] Marcando ${idsResolvidas.length} como resolvidas...`);
      const batchSize = 100;
      for (let i = 0; i < idsResolvidas.length; i += batchSize) {
        const batch = idsResolvidas.slice(i, i + batchSize);
        const { error } = await supabase
          .from('inconsistencias_chamados')
          .update({ status: 'resolvida', data_resolucao: new Date().toISOString() })
          .in('id', batch);

        if (error) {
          console.error(`❌ [DETECCAO] Erro resolver batch:`, error.message);
        }
      }
      resultado.resolvidas = idsResolvidas.length;
      console.log(`✅ [DETECCAO] ${idsResolvidas.length} resolvidas`);
    }

    // 8.1 Atualizar mantidas cujo dado de origem mudou desde a detecção
    // (ex.: analista da tarefa trocado no Aranda, status do chamado, tempo apontado)
    const atualizacoes: { id: string; campos: Record<string, any> }[] = [];
    const chavesVistas = new Set<string>();
    for (const inc of todasDetectadas) {
      const gravada = ativasPorChave.get(inc.chave_unica);
      if (!gravada || chavesVistas.has(inc.chave_unica)) continue;
      chavesVistas.add(inc.chave_unica);
      const campos = camposAlterados(gravada, inc);
      if (Object.keys(campos).length > 0) atualizacoes.push({ id: gravada.id, campos });
    }

    if (atualizacoes.length > 0) {
      console.log(`📊 [DETECCAO] Atualizando ${atualizacoes.length} mantidas com dados novos...`);
      for (const { id, campos } of atualizacoes) {
        const { error } = await supabase
          .from('inconsistencias_chamados')
          .update(campos)
          .eq('id', id);

        if (error) {
          console.error('❌ [DETECCAO] Erro atualizar mantida:', error.message);
          continue;
        }
        resultado.atualizadas++;
      }
      console.log(`✅ [DETECCAO] ${resultado.atualizadas} mantidas atualizadas`);
    }

    // 9. Resultado final
    resultado.mantidas = ativasMap.size - idsResolvidas.length;
    resultado.sucesso = true;
    resultado.mensagens.push(
      `Novas: ${resultado.novas}, Resolvidas: ${resultado.resolvidas}, Mantidas: ${resultado.mantidas}, Atualizadas: ${resultado.atualizadas}`
    );

    console.log('');
    console.log('✅ [DETECCAO] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`   🆕 Novas: ${resultado.novas}`);
    console.log(`   ✅ Resolvidas: ${resultado.resolvidas}`);
    console.log(`   🔄 Mantidas: ${resultado.mantidas}`);
    console.log(`   ✏️ Atualizadas: ${resultado.atualizadas}`);
    console.log('✅ [DETECCAO] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    return resultado;
  } catch (error) {
    console.error('❌ [DETECCAO] Erro fatal:', error);
    resultado.mensagens.push(`Erro: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    return resultado;
  }
}
