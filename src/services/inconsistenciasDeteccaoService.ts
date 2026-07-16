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
  status_chamado: string | null;
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
   * Tamanho do lote para paginação de queries (Supabase limita a 1000 por padrão)
   */
  private readonly PAGE_SIZE = 1000;

  /**
   * Busca TODOS os registros de uma query paginando automaticamente
   * O Supabase retorna no máximo 1000 registros por request.
   * Esta função faz múltiplas requests para buscar todos.
   */
  private async buscarTodosPaginado<T>(
    queryBuilder: () => any,
    orderColumn: string = 'id'
  ): Promise<T[]> {
    const todosRegistros: T[] = [];
    let offset = 0;
    let continuar = true;

    while (continuar) {
      const { data, error } = await queryBuilder()
        .order(orderColumn, { ascending: true })
        .range(offset, offset + this.PAGE_SIZE - 1);

      if (error) {
        console.error(`❌ [DETECCAO] Erro na paginação (offset ${offset}):`, error);
        break;
      }

      if (!data || data.length === 0) {
        continuar = false;
      } else {
        todosRegistros.push(...(data as T[]));
        if (data.length < this.PAGE_SIZE) {
          continuar = false;
        } else {
          offset += this.PAGE_SIZE;
        }
      }
    }

    return todosRegistros;
  }

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
            status_chamado: inc.status_chamado,
            chave_unica: inc.chave_unica,
            status: 'ativa',
            data_deteccao: new Date().toISOString()
          });
        }
      }

      // 4. Identificar candidatas a resolvidas (existiam como ativas mas não foram detectadas agora)
      // IMPORTANTE: Antes de marcar como resolvida, re-verificar nos dados originais se a
      // inconsistência realmente foi corrigida. Isso previne falsos positivos causados por
      // eventuais falhas de paginação ou filtros.
      const candidatasResolvidas: string[] = [];
      for (const [chave, id] of ativasMap.entries()) {
        if (!chavesDetectadas.has(chave)) {
          candidatasResolvidas.push(id);
        }
      }

      // 4.1. Validar candidatas - buscar dados originais e re-verificar inconsistência
      const chavesResolvidas: string[] = [];
      if (candidatasResolvidas.length > 0) {
        const resolvidasValidadas = await this.validarResolucao(candidatasResolvidas);
        chavesResolvidas.push(...resolvidasValidadas);
        
        const naoResolvidas = candidatasResolvidas.length - resolvidasValidadas.length;
        if (naoResolvidas > 0) {
          console.log(`⚠️ [DETECCAO] ${naoResolvidas} inconsistências NÃO foram resolvidas (dados originais ainda inconsistentes)`);
          resultado.mensagens.push(`${naoResolvidas} inconsistências mantidas (dados ainda inconsistentes)`);
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

      // 7.1 Atualizar status_chamado das inconsistências mantidas (tickets podem ter mudado de status)
      await this.atualizarStatusChamados(inconsistenciasDetectadas, ativasMap);

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
   * Usa paginação para buscar TODOS os registros (tabela pode ter 50k+ linhas)
   */
  private async detectarInconsistenciasApontamentos(): Promise<InconsistenciaDetectada[]> {
    try {
      const mapaEmpresas = await this.buscarMapaEmpresas();

      // Buscar apontamentos do ano atual e anterior (janela de detecção)
      const anoAtual = new Date().getFullYear();
      const dataInicio = `${anoAtual - 1}-01-01`;

      // Buscar TODOS os registros com paginação
      const data = await this.buscarTodosPaginado<any>(
        () => supabase
          .from('apontamentos_aranda' as any)
          .select('id, nro_chamado, nro_tarefa, tipo_chamado, data_abertura, data_atividade, data_sistema, tempo_gasto_horas, tempo_gasto_minutos, org_us_final, analista_tarefa, item_configuracao')
          .gte('data_atividade', dataInicio),
        'id'
      );

      console.log(`🔍 [DETECCAO] Apontamentos buscados: ${data.length} registros (com paginação)`);

      if (data.length === 0) return [];

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
            status_chamado: null, // Apontamentos não têm status próprio
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
   * Usa paginação para buscar TODOS os registros (tabela pode ter 25k+ linhas)
   */
  private async detectarInconsistenciasTickets(): Promise<InconsistenciaDetectada[]> {
    try {
      const mapaEmpresas = await this.buscarMapaEmpresas();

      // Buscar tickets do ano atual e anterior
      const anoAtual = new Date().getFullYear();
      const dataInicio = `${anoAtual - 1}-01-01`;

      // Buscar TODOS os registros com paginação
      // Excluir tickets com status finalizado (Cancelled, Closed, Resolved) 
      // pois não faz sentido monitorar atualização de tickets finalizados
      const data = await this.buscarTodosPaginado<any>(
        () => supabase
          .from('apontamentos_tickets_aranda' as any)
          .select('id, nro_solicitacao, cod_tipo, data_abertura, organizacao, nome_responsavel, item_configuracao, nome_grupo, status, data_ultimo_comentario')
          .gte('data_abertura', dataInicio)
          .neq('nome_grupo', 'CA SDM')
          .not('status', 'in', '("Cancelled","Closed","Resolved")'),
        'id'
      );

      console.log(`🔍 [DETECCAO] Tickets buscados: ${data.length} registros (com paginação)`);

      if (data.length === 0) return [];

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
            status_chamado: ticket.status || null,
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
   * Atualiza o campo status_chamado das inconsistências ativas com base nos dados detectados.
   * Isso garante que o status exibido na interface esteja sempre atualizado.
   */
  private async atualizarStatusChamados(
    inconsistenciasDetectadas: InconsistenciaDetectada[],
    ativasMap: Map<string, string>
  ): Promise<void> {
    try {
      // Mapear chave_unica -> status_chamado das detecções atuais
      const statusPorChave = new Map<string, string | null>();
      for (const inc of inconsistenciasDetectadas) {
        if (inc.status_chamado) {
          statusPorChave.set(inc.chave_unica, inc.status_chamado);
        }
      }

      // Atualizar apenas as que têm chave no ativasMap (existiam antes)
      const updates: { id: string; status_chamado: string }[] = [];
      for (const [chave, id] of ativasMap.entries()) {
        const status = statusPorChave.get(chave);
        if (status) {
          updates.push({ id, status_chamado: status });
        }
      }

      if (updates.length === 0) return;

      // Atualizar em lotes
      const batchSize = 100;
      for (let i = 0; i < updates.length; i += batchSize) {
        const batch = updates.slice(i, i + batchSize);
        for (const item of batch) {
          await supabase
            .from('inconsistencias_chamados' as any)
            .update({ status_chamado: item.status_chamado })
            .eq('id', item.id);
        }
      }

      console.log(`✅ [DETECCAO] ${updates.length} status_chamado atualizados`);
    } catch (error) {
      console.error('❌ [DETECCAO] Erro ao atualizar status_chamado:', error);
    }
  }

  /**
   * Valida se as inconsistências realmente foram resolvidas verificando os dados originais.
   * Retorna apenas os IDs das inconsistências que realmente foram corrigidas.
   * 
   * Para cada tipo de inconsistência, verifica no registro original se a condição
   * que gerou a inconsistência ainda existe:
   * - mes_diferente: verifica se data_atividade e data_sistema agora estão no mesmo mês
   * - tempo_excessivo: verifica se tempo_gasto_horas agora é <= 10h
   * - ic_999999: verifica se item_configuracao não começa mais com 999999
   * - sem_atualizacao: verifica se o ticket foi atualizado nos últimos 16 dias
   */
  private async validarResolucao(idsCandidata: string[]): Promise<string[]> {
    const idsConfirmados: string[] = [];

    try {
      // Buscar detalhes das inconsistências candidatas
      const batchSize = 100;
      const todasCandidatas: any[] = [];

      for (let i = 0; i < idsCandidata.length; i += batchSize) {
        const batch = idsCandidata.slice(i, i + batchSize);
        const { data, error } = await supabase
          .from('inconsistencias_chamados' as any)
          .select('id, origem, nro_chamado, tipo_inconsistencia, data_atividade, data_sistema, tempo_gasto_horas, item_configuracao, chave_unica')
          .in('id', batch);

        if (error) {
          console.error(`❌ [DETECCAO] Erro ao buscar candidatas para validação:`, error);
          // Em caso de erro, NÃO marca como resolvida (seguro por padrão)
          continue;
        }
        if (data) todasCandidatas.push(...data);
      }

      for (const candidata of todasCandidatas) {
        const resolvida = await this.verificarSeRealmenteResolvida(candidata);
        if (resolvida) {
          idsConfirmados.push(candidata.id);
        } else {
          console.log(`⚠️ [DETECCAO] Inconsistência ${candidata.nro_chamado} (${candidata.tipo_inconsistencia}) NÃO resolvida - dados originais ainda inconsistentes`);
        }
      }
    } catch (error) {
      console.error('❌ [DETECCAO] Erro na validação de resolução:', error);
      // Em caso de erro, não marca nenhuma como resolvida (fail-safe)
    }

    return idsConfirmados;
  }

  /**
   * Verifica se uma inconsistência específica foi realmente resolvida
   * consultando o registro original no banco
   */
  private async verificarSeRealmenteResolvida(inconsistencia: any): Promise<boolean> {
    const { origem, nro_chamado, tipo_inconsistencia, data_atividade } = inconsistencia;

    try {
      if (origem === 'apontamentos') {
        // Extrair número do chamado (remover prefixo tipo "RF ", "IM ", etc.)
        const nroLimpo = nro_chamado.replace(/^(RF|IM|PM)\s*/, '');
        
        // Buscar o apontamento original com a mesma data_atividade
        let query = supabase
          .from('apontamentos_aranda' as any)
          .select('data_atividade, data_sistema, tempo_gasto_horas, item_configuracao')
          .eq('nro_chamado', nroLimpo);

        // Se temos data_atividade, usar para filtrar o registro específico
        if (data_atividade) {
          const dtAtividade = new Date(data_atividade);
          const dataStr = dtAtividade.toISOString().split('T')[0];
          query = query.gte('data_atividade', `${dataStr}T00:00:00`)
                       .lt('data_atividade', `${dataStr}T23:59:59`);
        }

        const { data: registros, error } = await query.limit(1);

        if (error) {
          console.error(`❌ [DETECCAO] Erro ao verificar apontamento ${nro_chamado}:`, error);
          // Em caso de erro, NÃO marca como resolvida (seguro por padrão)
          return false;
        }

        if (!registros || registros.length === 0) {
          // Registro não encontrado no banco - pode não ter sido sincronizado ainda
          // NÃO marca como resolvida (conservador - mantém ativa até que o registro
          // reapareça na sync e seja verificado como correto)
          console.log(`⚠️ [DETECCAO] Apontamento ${nro_chamado} não encontrado no banco - mantém ativa`);
          return false;
        }

        const registro = registros[0] as any;
        return this.verificarCorrecao(tipo_inconsistencia, registro);

      } else if (origem === 'tickets') {
        // Extrair número da solicitação
        const nroLimpo = nro_chamado.replace(/^(RF|IM|PM)\s*/, '');
        
        const { data: registros, error } = await supabase
          .from('apontamentos_tickets_aranda' as any)
          .select('data_abertura, item_configuracao, data_ultimo_comentario, status')
          .eq('nro_solicitacao', nroLimpo)
          .limit(1);

        if (error) {
          console.error(`❌ [DETECCAO] Erro ao verificar ticket ${nro_chamado}:`, error);
          return false;
        }

        if (!registros || registros.length === 0) {
          // Registro não encontrado - pode não ter sido sincronizado ainda
          // NÃO marca como resolvida (conservador)
          console.log(`⚠️ [DETECCAO] Ticket ${nro_chamado} não encontrado no banco - mantém ativa`);
          return false;
        }

        const registro = registros[0] as any;
        return this.verificarCorrecaoTicket(tipo_inconsistencia, registro);
      }

      // Origem desconhecida - mantém como ativa por segurança
      return false;
    } catch (error) {
      console.error(`❌ [DETECCAO] Erro ao verificar resolução de ${nro_chamado}:`, error);
      // Em caso de erro, NÃO marca como resolvida (seguro por padrão)
      return false;
    }
  }

  /**
   * Verifica se a condição de inconsistência foi corrigida no apontamento
   */
  private verificarCorrecao(
    tipoInconsistencia: string,
    registro: { data_atividade: string | null; data_sistema: string | null; tempo_gasto_horas: string | null; item_configuracao: string | null }
  ): boolean {
    switch (tipoInconsistencia) {
      case 'mes_diferente': {
        if (!registro.data_atividade || !registro.data_sistema) return true;
        const dtAtividade = new Date(registro.data_atividade);
        const dtSistema = new Date(registro.data_sistema);
        // Resolvida se agora estão no mesmo mês/ano
        return dtAtividade.getMonth() === dtSistema.getMonth() &&
               dtAtividade.getFullYear() === dtSistema.getFullYear();
      }

      case 'tempo_excessivo': {
        if (!registro.tempo_gasto_horas) return true;
        const [horas] = registro.tempo_gasto_horas.split(':').map(Number);
        // Resolvida se agora é <= 10 horas
        return horas <= 10;
      }

      case 'ic_999999': {
        if (!registro.item_configuracao) return true;
        // Resolvida se IC não começa mais com 999999
        return !registro.item_configuracao.trim().startsWith('999999');
      }

      default:
        return true;
    }
  }

  /**
   * Verifica se a condição de inconsistência foi corrigida no ticket
   */
  private verificarCorrecaoTicket(
    tipoInconsistencia: string,
    registro: { data_abertura: string | null; item_configuracao: string | null; data_ultimo_comentario: string | null; status: string | null }
  ): boolean {
    // Tickets com status finalizado (Cancelled, Closed, Resolved) são considerados resolvidos
    const statusFinalizados = ['Cancelled', 'Closed', 'Resolved'];
    if (registro.status && statusFinalizados.includes(registro.status)) {
      return true;
    }

    switch (tipoInconsistencia) {
      case 'ic_999999': {
        if (!registro.item_configuracao) return true;
        return !registro.item_configuracao.trim().startsWith('999999');
      }

      case 'sem_atualizacao': {
        // Resolvida se: status mudou para não-relevante OU foi atualizado nos últimos 16 dias
        const statusRelevantes = ['Open', 'Hold', 'In Progress', 'Acknowledged'];
        if (!registro.status || !statusRelevantes.includes(registro.status)) {
          return true; // Status mudou para um não monitorado
        }
        if (!registro.data_ultimo_comentario) return false;
        const dataUltimoComentario = new Date(registro.data_ultimo_comentario);
        const hoje = new Date();
        const diffMs = hoje.getTime() - dataUltimoComentario.getTime();
        const diffDias = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        return diffDias < 16;
      }

      default:
        return true;
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
