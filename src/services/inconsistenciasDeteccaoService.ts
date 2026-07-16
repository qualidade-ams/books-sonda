/**
 * Serviço de Detecção e Persistência de Inconsistências
 * 
 * Este serviço é chamado após a sincronização com o SQL Server para:
 * 1. Detectar inconsistências nos dados sincronizados (apontamentos e tickets)
 * 2. Comparar com inconsistências já persistidas na tabela
 * 3. Inserir novas inconsistências detectadas
 * 4. Marcar como 'resolvida' as que não existem mais (analista corrigiu)
 * 
 * Substitui a detecção em tempo real que era feita no frontend.
 */

import { supabase } from '@/integrations/supabase/client';

interface InconsistenciaDetectada {
  origem: 'apontamentos' | 'tickets';
  nro_chamado: string;
  nro_tarefa: string | null;
  tipo_chamado: string | null;
  item_configuracao: string | null;
  tipo_inconsistencia: 'mes_diferente' | 'tempo_excessivo' | 'ic_999999' | 'sem_atualizacao';
  descricao_inconsistencia: string;
  data_abertura: string | null;
  data_atividade: string | null;
  data_sistema: string | null;
  tempo_gasto_horas: string | null;
  tempo_gasto_minutos: number | null;
  empresa: string | null;
  analista: string | null;
  chave_unica: string;
}

interface ResultadoDeteccao {
  sucesso: boolean;
  novas: number;
  resolvidas: number;
  mantidas: number;
  total_detectadas: number;
  mensagens: string[];
}

class InconsistenciasDeteccaoService {
  private cacheEmpresas: Map<string, string> | null = null;

  /**
   * Busca mapa de empresas para nome abreviado
   */
  private async buscarMapaEmpresas(): Promise<Map<string, string>> {
    if (this.cacheEmpresas) return this.cacheEmpresas;

    const { data, error } = await supabase
      .from('empresas_clientes')
      .select('nome_completo, nome_abreviado');

    if (error || !data) {
      console.error('❌ [DETECCAO] Erro ao buscar empresas:', error);
      return new Map();
    }

    this.cacheEmpresas = new Map();
    for (const emp of data) {
      if (emp.nome_completo && emp.nome_abreviado) {
        this.cacheEmpresas.set(emp.nome_completo.toUpperCase().trim(), emp.nome_abreviado);
      }
    }
    return this.cacheEmpresas;
  }

  /**
   * Retorna nome abreviado da empresa ou o nome original
   */
  private obterNomeAbreviado(nomeCompleto: string | null, mapa: Map<string, string>): string | null {
    if (!nomeCompleto) return null;
    const abreviado = mapa.get(nomeCompleto.toUpperCase().trim());
    return abreviado || nomeCompleto;
  }

  /**
   * Gera chave única para uma inconsistência (evita duplicatas)
   * Usa formato normalizado da data (ISO sem timezone) para garantir consistência
   */
  private gerarChaveUnica(
    origem: string,
    nroChamado: string,
    tipoInconsistencia: string,
    dataAtividade: string | null
  ): string {
    // Normalizar a data para formato consistente (YYYY-MM-DDTHH:mm:ss)
    let dataNormalizada = 'null';
    if (dataAtividade) {
      try {
        const d = new Date(dataAtividade);
        if (!isNaN(d.getTime())) {
          dataNormalizada = d.toISOString().replace('Z', '').split('.')[0];
        } else {
          dataNormalizada = dataAtividade;
        }
      } catch {
        dataNormalizada = dataAtividade;
      }
    }
    return `${origem}-${nroChamado}-${tipoInconsistencia}-${dataNormalizada}`;
  }

  /**
   * Executa detecção completa de inconsistências e persiste na tabela
   * Deve ser chamado após a sincronização com SQL Server
   */
  async executarDeteccao(): Promise<ResultadoDeteccao> {
    const resultado: ResultadoDeteccao = {
      sucesso: false,
      novas: 0,
      resolvidas: 0,
      mantidas: 0,
      total_detectadas: 0,
      mensagens: []
    };

    try {
      console.log('🔍 [DETECCAO] Iniciando detecção de inconsistências...');
      resultado.mensagens.push('Iniciando detecção de inconsistências...');

      // 1. Detectar inconsistências nos dados atuais
      const inconsistenciasDetectadas: InconsistenciaDetectada[] = [];

      // Detectar em apontamentos
      const apontamentos = await this.detectarInconsistenciasApontamentos();
      inconsistenciasDetectadas.push(...apontamentos);
      resultado.mensagens.push(`Apontamentos: ${apontamentos.length} inconsistências detectadas`);

      // Detectar em tickets
      const tickets = await this.detectarInconsistenciasTickets();
      inconsistenciasDetectadas.push(...tickets);
      resultado.mensagens.push(`Tickets: ${tickets.length} inconsistências detectadas`);

      resultado.total_detectadas = inconsistenciasDetectadas.length;
      console.log(`🔍 [DETECCAO] Total detectadas: ${resultado.total_detectadas}`);

      // 2. Buscar inconsistências ativas existentes na tabela
      const { data: ativasExistentes, error: erroAtivas } = await supabase
        .from('inconsistencias_chamados' as any)
        .select('id, chave_unica')
        .eq('status', 'ativa');

      if (erroAtivas) {
        console.error('❌ [DETECCAO] Erro ao buscar ativas existentes:', erroAtivas);
        resultado.mensagens.push(`Erro ao buscar ativas: ${erroAtivas.message}`);
        return resultado;
      }

      const ativasMap = new Map<string, string>();
      for (const ativa of (ativasExistentes as any[]) || []) {
        ativasMap.set(ativa.chave_unica, ativa.id);
      }

      // 3. Determinar quais são novas, quais se mantêm e quais foram resolvidas
      const chavesDetectadas = new Set<string>();
      const novasInconsistencias: any[] = [];

      for (const inc of inconsistenciasDetectadas) {
        chavesDetectadas.add(inc.chave_unica);

        if (!ativasMap.has(inc.chave_unica)) {
          // Nova inconsistência - verificar se não está já resolvida (caso de regressão)
          novasInconsistencias.push({
            origem: inc.origem,
            nro_chamado: inc.nro_chamado,
            nro_tarefa: inc.nro_tarefa,
            tipo_chamado: inc.tipo_chamado,
            item_configuracao: inc.item_configuracao,
            tipo_inconsistencia: inc.tipo_inconsistencia,
            descricao_inconsistencia: inc.descricao_inconsistencia,
            data_abertura: inc.data_abertura,
            data_atividade: inc.data_atividade,
            data_sistema: inc.data_sistema,
            tempo_gasto_horas: inc.tempo_gasto_horas,
            tempo_gasto_minutos: inc.tempo_gasto_minutos,
            empresa: inc.empresa,
            analista: inc.analista,
            chave_unica: inc.chave_unica,
            status: 'ativa',
            data_deteccao: new Date().toISOString()
          });
        }
      }

      // 4. Identificar resolvidas (existiam como ativas mas não foram detectadas agora)
      const chavesResolvidas: string[] = [];
      for (const [chave, id] of ativasMap.entries()) {
        if (!chavesDetectadas.has(chave)) {
          chavesResolvidas.push(id);
        }
      }

      // 5. Inserir novas inconsistências (em lotes de 100)
      if (novasInconsistencias.length > 0) {
        const batchSize = 100;
        for (let i = 0; i < novasInconsistencias.length; i += batchSize) {
          const batch = novasInconsistencias.slice(i, i + batchSize);
          const { error: erroInsert } = await supabase
            .from('inconsistencias_chamados' as any)
            .upsert(batch, { onConflict: 'chave_unica' });

          if (erroInsert) {
            console.error(`❌ [DETECCAO] Erro ao inserir batch ${i / batchSize + 1}:`, erroInsert);
            resultado.mensagens.push(`Erro ao inserir lote: ${erroInsert.message}`);
          }
        }
        resultado.novas = novasInconsistencias.length;
        console.log(`✅ [DETECCAO] ${novasInconsistencias.length} novas inconsistências inseridas`);
      }

      // 6. Marcar resolvidas (em lotes de 100)
      if (chavesResolvidas.length > 0) {
        const batchSize = 100;
        for (let i = 0; i < chavesResolvidas.length; i += batchSize) {
          const batch = chavesResolvidas.slice(i, i + batchSize);
          const { error: erroUpdate } = await supabase
            .from('inconsistencias_chamados' as any)
            .update({
              status: 'resolvida',
              data_resolucao: new Date().toISOString()
            })
            .in('id', batch);

          if (erroUpdate) {
            console.error(`❌ [DETECCAO] Erro ao resolver batch ${i / batchSize + 1}:`, erroUpdate);
            resultado.mensagens.push(`Erro ao resolver lote: ${erroUpdate.message}`);
          }
        }
        resultado.resolvidas = chavesResolvidas.length;
        console.log(`✅ [DETECCAO] ${chavesResolvidas.length} inconsistências marcadas como resolvidas`);
      }

      // 7. Calcular mantidas
      resultado.mantidas = ativasMap.size - chavesResolvidas.length;

      resultado.sucesso = true;
      resultado.mensagens.push(
        `Resultado: ${resultado.novas} novas, ${resultado.resolvidas} resolvidas, ${resultado.mantidas} mantidas`
      );

      console.log('✅ [DETECCAO] Detecção finalizada:', resultado);
      return resultado;

    } catch (error) {
      console.error('❌ [DETECCAO] Erro na detecção:', error);
      resultado.mensagens.push(`Erro: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      return resultado;
    }
  }

  /**
   * Detecta inconsistências na tabela apontamentos_aranda
   */
  private async detectarInconsistenciasApontamentos(): Promise<InconsistenciaDetectada[]> {
    try {
      const mapaEmpresas = await this.buscarMapaEmpresas();

      // Buscar apontamentos do ano atual e anterior (janela de detecção)
      const anoAtual = new Date().getFullYear();
      const dataInicio = `${anoAtual - 1}-01-01`;

      const { data, error } = await supabase
        .from('apontamentos_aranda' as any)
        .select('id, nro_chamado, nro_tarefa, tipo_chamado, data_abertura, data_atividade, data_sistema, tempo_gasto_horas, tempo_gasto_minutos, org_us_final, analista_tarefa, item_configuracao')
        .gte('data_atividade', dataInicio);

      if (error) {
        console.error('❌ [DETECCAO] Erro ao buscar apontamentos:', error);
        return [];
      }

      if (!data || data.length === 0) return [];

      const inconsistencias: InconsistenciaDetectada[] = [];

      for (const apt of data as any[]) {
        const tipos = this.detectarTiposInconsistencia(
          apt.data_atividade,
          apt.data_sistema,
          apt.tempo_gasto_horas,
          null // IC 999999 apenas em tickets
        );

        for (const tipo of tipos) {
          const tipoChamado = apt.tipo_chamado || '';
          const nroChamado = apt.nro_chamado || 'N/A';
          const nroFormatado = tipoChamado ? `${tipoChamado} ${nroChamado}` : nroChamado;
          const empresaAbreviada = this.obterNomeAbreviado(apt.org_us_final, mapaEmpresas);

          inconsistencias.push({
            origem: 'apontamentos',
            nro_chamado: nroFormatado,
            nro_tarefa: apt.nro_tarefa || null,
            tipo_chamado: apt.tipo_chamado || null,
            item_configuracao: apt.item_configuracao || null,
            tipo_inconsistencia: tipo,
            descricao_inconsistencia: this.gerarDescricao(
              tipo,
              apt.data_atividade,
              apt.data_sistema,
              apt.tempo_gasto_horas,
              apt.item_configuracao
            ),
            data_abertura: apt.data_abertura || null,
            data_atividade: apt.data_atividade,
            data_sistema: apt.data_sistema,
            tempo_gasto_horas: apt.tempo_gasto_horas,
            tempo_gasto_minutos: apt.tempo_gasto_minutos,
            empresa: empresaAbreviada,
            analista: apt.analista_tarefa,
            chave_unica: this.gerarChaveUnica('apontamentos', nroFormatado, tipo, apt.data_atividade)
          });
        }
      }

      return inconsistencias;
    } catch (error) {
      console.error('❌ [DETECCAO] Erro ao detectar em apontamentos:', error);
      return [];
    }
  }

  /**
   * Detecta inconsistências na tabela apontamentos_tickets_aranda
   */
  private async detectarInconsistenciasTickets(): Promise<InconsistenciaDetectada[]> {
    try {
      const mapaEmpresas = await this.buscarMapaEmpresas();

      // Buscar tickets do ano atual e anterior
      const anoAtual = new Date().getFullYear();
      const dataInicio = `${anoAtual - 1}-01-01`;

      const { data, error } = await supabase
        .from('apontamentos_tickets_aranda' as any)
        .select('id, nro_solicitacao, cod_tipo, data_abertura, organizacao, nome_responsavel, item_configuracao, nome_grupo, status, data_ultimo_comentario')
        .gte('data_abertura', dataInicio)
        .neq('nome_grupo', 'CA SDM');

      if (error) {
        console.error('❌ [DETECCAO] Erro ao buscar tickets:', error);
        return [];
      }

      if (!data || data.length === 0) return [];

      const inconsistencias: InconsistenciaDetectada[] = [];

      for (const ticket of data as any[]) {
        const tipos = this.detectarTiposInconsistencia(
          ticket.data_abertura,
          null, // Tickets não têm data_sistema
          null, // Tickets não têm tempo_gasto_horas para essa validação
          ticket.item_configuracao
        );

        // Regra: Sem atualização há 16+ dias
        const statusRelevantes = ['Open', 'Hold', 'In Progress', 'Acknowledged'];
        if (
          ticket.status &&
          statusRelevantes.includes(ticket.status) &&
          ticket.data_ultimo_comentario
        ) {
          const dataUltimoComentario = new Date(ticket.data_ultimo_comentario);
          const hoje = new Date();
          const diffMs = hoje.getTime() - dataUltimoComentario.getTime();
          const diffDias = Math.floor(diffMs / (1000 * 60 * 60 * 24));
          if (diffDias >= 16) {
            tipos.push('sem_atualizacao');
          }
        }

        for (const tipo of tipos) {
          // Mapear cod_tipo para prefixo
          const codTipo = ticket.cod_tipo || '';
          let prefixo = '';
          if (codTipo === 'Solicitação') prefixo = 'RF';
          else if (codTipo === 'Incidente') prefixo = 'IM';
          else if (codTipo === 'Problema') prefixo = 'PM';

          const nroSolicitacao = ticket.nro_solicitacao || 'N/A';
          const nroFormatado = prefixo ? `${prefixo} ${nroSolicitacao}` : nroSolicitacao;
          const empresaAbreviada = this.obterNomeAbreviado(ticket.organizacao, mapaEmpresas);
          const isIc999999 = tipo === 'ic_999999';

          inconsistencias.push({
            origem: 'tickets',
            nro_chamado: nroFormatado,
            nro_tarefa: null,
            tipo_chamado: prefixo || null,
            item_configuracao: ticket.item_configuracao || null,
            tipo_inconsistencia: tipo,
            descricao_inconsistencia: this.gerarDescricao(
              tipo,
              ticket.data_abertura,
              null,
              null,
              ticket.item_configuracao,
              ticket.data_ultimo_comentario,
              ticket.status
            ),
            data_abertura: ticket.data_abertura || null,
            data_atividade: isIc999999 ? null : ticket.data_abertura,
            data_sistema: null,
            tempo_gasto_horas: null,
            tempo_gasto_minutos: null,
            empresa: empresaAbreviada,
            analista: ticket.nome_responsavel || null,
            chave_unica: this.gerarChaveUnica('tickets', nroFormatado, tipo, isIc999999 ? null : ticket.data_abertura)
          });
        }
      }

      return inconsistencias;
    } catch (error) {
      console.error('❌ [DETECCAO] Erro ao detectar em tickets:', error);
      return [];
    }
  }

  /**
   * Detecta tipos de inconsistências em um registro
   */
  private detectarTiposInconsistencia(
    dataAtividade: string | null,
    dataSistema: string | null,
    tempoGastoHoras: string | null,
    itemConfiguracao: string | null
  ): ('mes_diferente' | 'tempo_excessivo' | 'ic_999999' | 'sem_atualizacao')[] {
    const tipos: ('mes_diferente' | 'tempo_excessivo' | 'ic_999999' | 'sem_atualizacao')[] = [];

    // Regra: Item de configuração começa com 999999
    if (itemConfiguracao && itemConfiguracao.trim().startsWith('999999')) {
      tipos.push('ic_999999');
    }

    // Regras que dependem de datas
    if (!dataAtividade || !dataSistema) {
      return tipos;
    }

    const dtAtividade = new Date(dataAtividade);
    const dtSistema = new Date(dataSistema);

    // Regra: Mês diferente entre data atividade e data sistema
    if (
      dtAtividade.getMonth() !== dtSistema.getMonth() ||
      dtAtividade.getFullYear() !== dtSistema.getFullYear()
    ) {
      tipos.push('mes_diferente');
    }

    // Regra: Tempo excessivo (> 10 horas)
    if (tempoGastoHoras) {
      const [horas] = tempoGastoHoras.split(':').map(Number);
      if (horas > 10) {
        tipos.push('tempo_excessivo');
      }
    }

    return tipos;
  }

  /**
   * Gera descrição legível da inconsistência
   */
  private gerarDescricao(
    tipo: string,
    dataAtividade: string | null,
    dataSistema: string | null,
    tempoGastoHoras: string | null,
    itemConfiguracao: string | null = null,
    dataUltimoComentario: string | null = null,
    status: string | null = null
  ): string {
    switch (tipo) {
      case 'mes_diferente': {
        const dtAtividade = dataAtividade ? new Date(dataAtividade) : null;
        const dtSistema = dataSistema ? new Date(dataSistema) : null;
        const fmtAtividade = dtAtividade ? dtAtividade.toLocaleDateString('pt-BR') : '-';
        const fmtSistema = dtSistema ? dtSistema.toLocaleDateString('pt-BR') : '-';
        return `Data Atividade (${fmtAtividade}) e Data Sistema (${fmtSistema}) em meses diferentes`;
      }

      case 'tempo_excessivo':
        return `Tempo gasto (${tempoGastoHoras}) excede o limite de 10 horas`;

      case 'ic_999999':
        return `Item de Configuração inválido: ${itemConfiguracao}`;

      case 'sem_atualizacao': {
        const dtComentario = dataUltimoComentario ? new Date(dataUltimoComentario) : null;
        const hoje = new Date();
        const dias = dtComentario ? Math.floor((hoje.getTime() - dtComentario.getTime()) / (1000 * 60 * 60 * 24)) : 0;
        const dataFormatada = dtComentario ? dtComentario.toLocaleDateString('pt-BR') : '-';
        return `Chamado com status "${status || '-'}" sem atualização há ${dias} dia(s). Último comentário: ${dataFormatada}`;
      }

      default:
        return 'Inconsistência detectada';
    }
  }

  /**
   * Limpa o cache de empresas (chamar quando empresas forem atualizadas)
   */
  limparCache(): void {
    this.cacheEmpresas = null;
  }
}

// Exportar instância singleton
export const inconsistenciasDeteccaoService = new InconsistenciasDeteccaoService();

// Registrar limpeza de cache no logout
import { registerCacheCleanup } from '@/services/clearAllAppCache';
registerCacheCleanup(() => inconsistenciasDeteccaoService.limparCache());
