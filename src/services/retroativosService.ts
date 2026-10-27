/**
 * Apontamentos Retroativos, modelo novo por banco (Modelagem_Fase3.md, seção 8).
 * A detecção é do job do sync-api; aqui a tela lê, decide (aprovar ou descartar,
 * com justificativa) e registra o aviso aos consultores, pelas funções da
 * migration 20261022000007. As tabelas são só de leitura direta.
 */

import { supabase } from '@/integrations/supabase/client';
import { ErroTraduzivel, falhaDoBanco } from '@/errors/erroTraduzivel';
import type { Autor, ItemRetroativo, Retroativo } from '@/types/retroativos';

type Cliente = typeof supabase;
type ErroBanco = { message: string; code?: string };
type Linha = Record<string, any>;

const falha = falhaDoBanco;

const umOuNulo = <T>(valor: T | T[] | null | undefined): T | null =>
  Array.isArray(valor) ? (valor[0] ?? null) : (valor ?? null);

export class RetroativosService {
  constructor(private readonly cliente: Cliente = supabase) {}

  private async consultar(promessa: PromiseLike<{ data: unknown; error: ErroBanco | null }>) {
    const { data, error } = await promessa;
    if (error) throw falha('carregar os apontamentos retroativos', error);
    return (data ?? []) as Linha[];
  }

  /** Nome de cada usuário pelo id; sem permissão, nenhum */
  private async nomes(ids: (string | null)[]): Promise<Map<string, string>> {
    const unicos = [...new Set(ids.filter(Boolean))] as string[];
    if (unicos.length === 0) return new Map();
    const { data, error } = await this.cliente.rpc('perfis_resumo', {
      p_ids: unicos,
      p_emails: null,
    });
    if (error) return new Map();
    return new Map((data ?? []).filter((p) => p.full_name).map((p) => [p.id, p.full_name]));
  }

  async listar(): Promise<Retroativo[]> {
    const retroativos = await this.consultar(
      this.cliente
        .from('bancos_horas_retroativos')
        .select('*, bancos_horas(nome, empresa_id, empresas(nome_abreviado))')
        .order('detectado_em', { ascending: false })
    );
    if (retroativos.length === 0) return [];

    const itens = await this.consultar(
      this.cliente
        .from('bancos_horas_retroativos_itens')
        .select('*')
        .in(
          'retroativo_id',
          retroativos.map((r) => r.id)
        )
    );
    const idsDe = (tipo: string) => itens.filter((i) => i.tipo === tipo).map((i) => i.item_id);
    const aplicados = retroativos.map((r) => r.fechamento_aplicado_id).filter(Boolean);
    const nenhum: Linha[] = [];

    const [apontamentos, tickets, fechamentos] = await Promise.all([
      idsDe('apontamento').length
        ? this.consultar(
            this.cliente
              .from('apontamentos_aranda')
              .select(
                'id, nro_chamado, nro_tarefa, analista_tarefa, data_atividade, data_sistema, caso_estado'
              )
              .in('id', idsDe('apontamento'))
          )
        : nenhum,
      idsDe('ticket').length
        ? this.consultar(
            this.cliente
              .from('apontamentos_tickets_aranda')
              .select('id, nro_solicitacao, nome_responsavel, data_fechamento, status')
              .in('id', idsDe('ticket'))
          )
        : nenhum,
      aplicados.length
        ? this.consultar(
            this.cliente
              .from('bancos_horas_fechamentos')
              .select('id, fechado_em, fechado_por')
              .in('id', aplicados)
          )
        : nenhum,
    ]);

    const apontamentoPorId = new Map(apontamentos.map((a) => [a.id, a]));
    const ticketPorId = new Map(tickets.map((t) => [t.id, t]));
    const fechamentoPorId = new Map(fechamentos.map((f) => [f.id, f]));
    const nomes = await this.nomes([
      ...retroativos.map((r) => r.decidido_por),
      ...itens.map((i) => i.aviso_enviado_por),
      ...fechamentos.map((f) => f.fechado_por),
    ]);
    const autor = (em: string | null, porId: string | null): Autor | null =>
      em ? { em, porId: porId ?? null, por: porId ? (nomes.get(porId) ?? null) : null } : null;

    const doAranda = (
      i: Linha
    ): Pick<
      ItemRetroativo,
      'chamado' | 'tarefa' | 'consultor' | 'dataAtividade' | 'lancadoEm' | 'statusChamado'
    > => {
      if (i.tipo === 'ticket') {
        const t = ticketPorId.get(i.item_id);
        return {
          chamado: t?.nro_solicitacao ?? null,
          tarefa: null,
          consultor: t?.nome_responsavel ?? null,
          dataAtividade: t?.data_fechamento ?? null,
          lancadoEm: null,
          statusChamado: t?.status ?? null,
        };
      }
      const a = apontamentoPorId.get(i.item_id);
      return {
        chamado: a?.nro_chamado ?? null,
        tarefa: a?.nro_tarefa ?? null,
        consultor: a?.analista_tarefa ?? null,
        dataAtividade: a?.data_atividade ?? null,
        lancadoEm: a?.data_sistema ?? null,
        statusChamado: a?.caso_estado ?? null,
      };
    };

    return retroativos.map((r) => {
      const banco = umOuNulo<Linha>(r.bancos_horas);
      const aplicado = r.fechamento_aplicado_id
        ? fechamentoPorId.get(r.fechamento_aplicado_id)
        : null;
      const decisao = autor(r.decidido_em, r.decidido_por);
      return {
        id: r.id,
        empresaId: banco?.empresa_id ?? '',
        empresa: umOuNulo<Linha>(banco?.empresas)?.nome_abreviado ?? '',
        bancoId: r.banco_id,
        banco: banco?.nome ?? '',
        mes: { mes: r.mes, ano: r.ano },
        consumoAntesMinutos: r.consumo_antes_minutos,
        consumoDepoisMinutos: r.consumo_depois_minutos,
        consumoAntesTickets: r.consumo_antes_tickets,
        consumoDepoisTickets: r.consumo_depois_tickets,
        detectadoEm: r.detectado_em,
        atualizadoEm: r.atualizado_em,
        situacao: r.situacao,
        decisao: decisao ? { ...decisao, justificativa: r.justificativa ?? '' } : null,
        retificacao: aplicado ? autor(aplicado.fechado_em, aplicado.fechado_por) : null,
        itens: itens
          .filter((i) => i.retroativo_id === r.id)
          .map((i) => ({
            id: i.id,
            tipo: i.tipo,
            itemId: i.item_id,
            ...doAranda(i),
            minutos: i.minutos,
            tickets: i.tickets,
            aviso: autor(i.aviso_enviado_em ?? null, i.aviso_enviado_por ?? null),
          })),
      };
    });
  }

  /** Só o pendente; a justificativa vai para a auditoria como motivo */
  async decidir(retroativoId: string, decisao: 'aprovar' | 'descartar', justificativa: string) {
    const limpa = justificativa.trim();
    if (!limpa)
      throw new ErroTraduzivel('erros.retroativos.justificativa', {}, 'Informe a justificativa.');
    const { error } = await this.cliente.rpc('decidir_retroativo', {
      p_retroativo_id: retroativoId,
      p_decisao: decisao,
      p_justificativa: limpa,
    });
    if (error) throw falha(decisao === 'aprovar' ? 'aprovar' : 'descartar', error);
  }

  /** Marca como avisados os itens cujo e-mail saiu */
  async registrarAviso(retroativoId: string, itemIds: string[]): Promise<void> {
    const { error } = await this.cliente.rpc('registrar_aviso_retroativo', {
      p_retroativo_id: retroativoId,
      p_item_ids: itemIds,
    });
    if (error) throw falha('registrar o aviso aos consultores', error);
  }

  /**
   * E-mail de cada consultor pelos especialistas ativos, pelo nome contido, como
   * a tela atual. Sem cadastro ou sem e-mail, nulo.
   */
  async emailsDosConsultores(nomes: string[]): Promise<Record<string, string | null>> {
    const { data, error } = await this.cliente
      .from('especialistas')
      .select('nome, email')
      .eq('status', 'ativo');
    if (error) throw falha('buscar o e-mail dos consultores', error);
    const especialistas = data as Linha[];
    return Object.fromEntries(
      nomes.map((nome) => {
        const achado = especialistas.find((e) =>
          String(e.nome ?? '')
            .toLowerCase()
            .includes(nome.toLowerCase())
        );
        return [nome, achado?.email || null];
      })
    );
  }
}

export const retroativosService = new RetroativosService();
