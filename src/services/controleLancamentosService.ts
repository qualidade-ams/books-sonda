/**
 * Lançamentos do Controle de Banco de Horas (Modelagem_Fase3.md, seção 7):
 * reajustes e observações de cada banco. Em mês fechado eles ficam aguardando a
 * retificação do Book, que o gatilho da migration 20261023000002 já pede.
 */

import { supabase } from '@/integrations/supabase/client';
import { ErroTraduzivel, falhaDoBanco } from '@/errors/erroTraduzivel';
import type { MesAno } from '@/services/bancosHoras/calculo';
import type {
  AjusteRequerimento,
  NovoReajusteInput,
  ObservacaoControle,
  ObservacaoInput,
  ObservacaoParaCliente,
  ReajusteControle,
  ReajusteParaCliente,
} from '@/types/controleBancoHoras';

type Cliente = typeof supabase;
type Linha = Record<string, any>;

const LIMITE_TEXTO = 700;

const falha = falhaDoBanco;

const chave = (mes: number, ano: number) => `${ano}-${mes}`;
const chavesDoPeriodo = (meses: MesAno[]) => new Set(meses.map((m) => chave(m.mes, m.ano)));
const anosDoPeriodo = (meses: MesAno[]) => [...new Set(meses.map((m) => m.ano))];

export class ControleLancamentosService {
  constructor(private readonly cliente: Cliente = supabase) {}

  /** Reajustes do banco no período, inclusive os inativos, com a pendência de retificação */
  async reajustes(bancoId: string, meses: MesAno[]): Promise<ReajusteControle[]> {
    const { linhas, aguardando } = await this.lerReajustes(bancoId, meses, '*');
    return linhas.map((r) => ({
      id: r.id,
      bancoId: r.banco_id,
      mes: { mes: r.mes, ano: r.ano },
      tipo: r.tipo,
      minutos: r.minutos,
      tickets: r.tickets,
      justificativa: r.justificativa,
      anotacaoInterna: r.anotacao_interna ?? null,
      origem: r.origem,
      ativo: r.ativo,
      motivoInativacao: r.motivo_inativacao ?? null,
      inativadoEm: r.inativado_em ?? null,
      criadoEm: r.created_at,
      criadoPor: r.created_by,
      aguardandoRetificacao: aguardando(r),
    }));
  }

  /**
   * Reajustes que o cliente vê no Saldo Parcial: ativos e já valendo (sem os que aguardam a
   * retificação do Book). A anotação interna e o autor nem são lidos (D-08).
   */
  async reajustesParaCliente(bancoId: string, meses: MesAno[]): Promise<ReajusteParaCliente[]> {
    const { linhas, aguardando } = await this.lerReajustes(
      bancoId,
      meses,
      'id, mes, ano, tipo, minutos, tickets, justificativa, ativo'
    );
    return linhas
      .filter((r) => r.ativo && !aguardando(r))
      .sort((a, b) => a.ano * 12 + a.mes - (b.ano * 12 + b.mes))
      .map((r) => ({
        mes: { mes: r.mes, ano: r.ano },
        tipo: r.tipo,
        minutos: r.minutos,
        tickets: r.tickets,
        justificativa: r.justificativa,
      }));
  }

  /**
   * Reajustes do banco no período e quem aguarda a retificação: no mês fechado, o ativo que não
   * está no Book e o inativo que ainda está
   */
  private async lerReajustes(
    bancoId: string,
    meses: MesAno[],
    colunas: string
  ): Promise<{ linhas: Linha[]; aguardando: (r: Linha) => boolean }> {
    const [reajustes, fechamentos] = await Promise.all([
      this.cliente
        .from('bancos_horas_reajustes')
        .select(colunas)
        .eq('banco_id', bancoId)
        .in('ano', anosDoPeriodo(meses))
        .order('created_at'),
      this.cliente
        .from('bancos_horas_fechamentos')
        .select('id, mes, ano')
        .eq('banco_id', bancoId)
        .eq('vigente', true),
    ]);
    const erro = reajustes.error ?? fechamentos.error;
    if (erro) throw falha('carregar os reajustes', erro);

    const fechamentoDoMes = new Map(
      (fechamentos.data as Linha[]).map((f) => [chave(f.mes, f.ano), f.id as string])
    );
    let noBook = new Set<string>();
    if (fechamentoDoMes.size > 0) {
      const { data: itens, error: erroItens } = await this.cliente
        .from('bancos_horas_fechamento_itens')
        .select('item_id, fechamento_id')
        .in('fechamento_id', [...fechamentoDoMes.values()])
        .eq('tipo', 'reajuste');
      if (erroItens) throw falha('carregar os reajustes', erroItens);
      noBook = new Set(itens.map((i) => i.item_id));
    }

    const doPeriodo = chavesDoPeriodo(meses);
    return {
      linhas: (reajustes.data as unknown as Linha[]).filter((r) =>
        doPeriodo.has(chave(r.mes, r.ano))
      ),
      aguardando: (r) =>
        fechamentoDoMes.has(chave(r.mes, r.ano)) &&
        (r.ativo ? !noBook.has(r.id) : noBook.has(r.id)),
    };
  }

  async lancarReajuste(input: NovoReajusteInput): Promise<void> {
    const justificativa = input.justificativa.trim();
    const anotacao = input.anotacaoInterna?.trim() || null;
    if (!(input.minutos > 0 || input.tickets > 0) || input.minutos < 0 || input.tickets < 0) {
      throw new ErroTraduzivel(
        'erros.controle.reajusteVazio',
        {},
        'Informe as horas ou os tickets do reajuste.'
      );
    }
    if (!justificativa)
      throw new ErroTraduzivel(
        'erros.controle.motivoReajuste',
        {},
        'Informe o motivo do reajuste.'
      );
    if (justificativa.length > LIMITE_TEXTO) {
      throw new ErroTraduzivel(
        'erros.controle.motivoLongo',
        { limite: LIMITE_TEXTO },
        `O motivo passa de ${LIMITE_TEXTO} caracteres.`
      );
    }
    if ((anotacao?.length ?? 0) > LIMITE_TEXTO) {
      throw new ErroTraduzivel(
        'erros.controle.anotacaoLonga',
        { limite: LIMITE_TEXTO },
        `As anotações internas passam de ${LIMITE_TEXTO} caracteres.`
      );
    }

    const { error } = await this.cliente.from('bancos_horas_reajustes').insert({
      banco_id: input.bancoId,
      mes: input.mes.mes,
      ano: input.mes.ano,
      tipo: input.tipo,
      minutos: input.minutos,
      tickets: input.tickets,
      justificativa,
      anotacao_interna: anotacao,
      origem: 'manual',
    });
    if (error) throw falha('lançar o reajuste', error);
  }

  /** Nada é apagado: o reajuste continua no histórico, com o motivo */
  async inativarReajuste(reajusteId: string, motivo: string): Promise<void> {
    const limpo = motivo.trim();
    if (!limpo)
      throw new ErroTraduzivel(
        'erros.controle.motivoInativacao',
        {},
        'Informe o motivo da inativação.'
      );
    const { error } = await this.cliente
      .from('bancos_horas_reajustes')
      .update({ ativo: false, motivo_inativacao: limpo, inativado_em: new Date().toISOString() })
      .eq('id', reajusteId);
    if (error) throw falha('inativar o reajuste', error);
  }

  /**
   * Observações que o cliente vê no Saldo Parcial: só mês e texto, sem autor (D-08). As de
   * reajuste ficam de fora porque repetem o motivo, que já vai na lista de reajustes.
   */
  async observacoesParaCliente(bancoId: string, meses: MesAno[]): Promise<ObservacaoParaCliente[]> {
    const { data, error } = await this.cliente
      .from('bancos_horas_observacoes')
      .select('mes, ano, texto, origem, created_at')
      .eq('banco_id', bancoId)
      .eq('ativo', true)
      .in('ano', anosDoPeriodo(meses));
    if (error) throw falha('carregar as observações', error);

    const doPeriodo = chavesDoPeriodo(meses);
    return (data as Linha[])
      .filter((o) => o.origem !== 'ajuste' && doPeriodo.has(chave(o.mes, o.ano)))
      .sort(
        (a, b) =>
          a.ano * 12 + a.mes - (b.ano * 12 + b.mes) ||
          String(a.created_at).localeCompare(b.created_at)
      )
      .map((o) => ({ mes: { mes: o.mes, ano: o.ano }, texto: o.texto }));
  }

  /** Observações ativas do banco no período, das mais recentes */
  async observacoes(bancoId: string, meses: MesAno[]): Promise<ObservacaoControle[]> {
    const { data, error } = await this.cliente
      .from('bancos_horas_observacoes')
      .select('*')
      .eq('banco_id', bancoId)
      .eq('ativo', true)
      .in('ano', anosDoPeriodo(meses));
    if (error) throw falha('carregar as observações', error);

    const doPeriodo = chavesDoPeriodo(meses);
    return (data as Linha[])
      .filter((o) => doPeriodo.has(chave(o.mes, o.ano)))
      .sort(
        (a, b) =>
          b.ano * 12 + b.mes - (a.ano * 12 + a.mes) ||
          String(b.created_at).localeCompare(a.created_at)
      )
      .map((o) => ({
        id: o.id,
        bancoId: o.banco_id,
        mes: { mes: o.mes, ano: o.ano },
        texto: o.texto,
        origem: o.origem,
        reajusteId: o.reajuste_id ?? null,
        criadoEm: o.created_at,
        criadoPor: o.created_by,
        editada: !!o.updated_at && o.updated_at !== o.created_at,
      }));
  }

  /** Observação manual; em mês fechado, pede a retificação do Book (gatilho) */
  async salvarObservacao(input: ObservacaoInput): Promise<void> {
    const texto = input.texto.trim();
    if (!texto)
      throw new ErroTraduzivel('erros.controle.observacaoVazia', {}, 'Escreva a observação.');
    if (texto.length > LIMITE_TEXTO) {
      throw new ErroTraduzivel(
        'erros.controle.observacaoLonga',
        { limite: LIMITE_TEXTO },
        `A observação passa de ${LIMITE_TEXTO} caracteres.`
      );
    }
    const campos = { texto, mes: input.mes.mes, ano: input.mes.ano };
    const { error } = input.id
      ? await this.cliente.from('bancos_horas_observacoes').update(campos).eq('id', input.id)
      : await this.cliente
          .from('bancos_horas_observacoes')
          .insert({ ...campos, banco_id: input.bancoId, origem: 'manual' });
    if (error) throw falha('salvar a observação', error);
  }

  /**
   * Troca o banco dos requerimentos, com um motivo para todos (decisão de
   * 23/10/2026). Banco nulo apaga o ajuste: volta para o banco pelo módulo.
   */
  async salvarAjustesRequerimentos(ajustes: AjusteRequerimento[], motivo: string): Promise<void> {
    const limpo = motivo.trim();
    if (ajustes.length === 0)
      throw new ErroTraduzivel(
        'erros.controle.semAjustes',
        {},
        'Nenhum requerimento com banco alterado.'
      );
    if (!limpo)
      throw new ErroTraduzivel(
        'erros.controle.motivoTroca',
        {},
        'Informe o motivo da troca de banco.'
      );

    const voltam = ajustes.filter((a) => a.bancoId === null).map((a) => a.requerimentoId);
    if (voltam.length > 0) {
      const { error } = await this.cliente
        .from('requerimentos_bancos')
        .delete()
        .in('requerimento_id', voltam);
      if (error) throw falha('salvar a troca de banco', error);
    }
    const trocados = ajustes.filter((a) => a.bancoId !== null);
    if (trocados.length > 0) {
      const { error } = await this.cliente.from('requerimentos_bancos').upsert(
        trocados.map((a) => ({
          requerimento_id: a.requerimentoId,
          banco_id: a.bancoId!,
          motivo: limpo,
        })),
        { onConflict: 'requerimento_id' }
      );
      if (error) throw falha('salvar a troca de banco', error);
    }
  }

  /** Sai do Controle; a exclusão fica registrada na auditoria */
  async excluirObservacao(observacaoId: string): Promise<void> {
    const { error } = await this.cliente
      .from('bancos_horas_observacoes')
      .update({ ativo: false, inativado_em: new Date().toISOString() })
      .eq('id', observacaoId);
    if (error) throw falha('excluir a observação', error);
  }
}

export const controleLancamentosService = new ControleLancamentosService();
