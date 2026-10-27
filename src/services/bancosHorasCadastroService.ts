/**
 * Cadastro dos bancos de horas na tela Empresas (Modelagem_Fase3.md, seção 4).
 *
 * Criar, inativar e trocar vigência passam por funções do banco (migration
 * 20261023000001), que fazem tudo numa transação e guardam o motivo na
 * auditoria. Editar, reativar, reordenar e mudar o escopo vão direto nas
 * tabelas. As regras da Fase 1 continuam nos gatilhos; as que dão para
 * antecipar são validadas aqui, antes de gravar.
 */

import { supabase } from '@/integrations/supabase/client';
import { ErroTraduzivel, falhaDoBanco } from '@/errors/erroTraduzivel';
import type {
  BancoCadastro,
  EscopoBancoCadastro,
  NovaVigenciaInput,
  NovoBancoInput,
  ParametrosBanco,
} from '@/types/bancosHorasCadastro';

type Cliente = typeof supabase;
type Linha = Record<string, any>;

const falha = falhaDoBanco;

const diaUm = (data: string | null) => !data || data.endsWith('-01');
const numeroOuNulo = (valor: unknown) =>
  valor === null || valor === undefined ? null : Number(valor);

// ---------------------------------------------------------------------------
// Regras puras
// ---------------------------------------------------------------------------

/** O que dá para conferir antes de gravar; o resto fica com os gatilhos */
export function validarParametros(p: ParametrosBanco): void {
  if (!p.nome.trim()) throw new ErroTraduzivel('erros.bancos.nome', {}, 'Informe o nome do banco.');
  if (p.filtroIc && !p.filtroIc.valor.trim())
    throw new ErroTraduzivel('erros.bancos.valorFiltro', {}, 'Informe o valor do filtro.');
  if (p.padrao && (p.escopo.length > 0 || p.filtroIc)) {
    throw new ErroTraduzivel(
      'erros.bancos.padraoSemEscopo',
      {},
      'O Banco padrão não tem escopo nem filtro: recebe o que não se encaixa nos outros.'
    );
  }
  if (!p.padrao && p.escopo.length === 0 && !p.filtroIc) {
    throw new ErroTraduzivel(
      'erros.bancos.escopoVazio',
      {},
      'Escolha ao menos um produto, módulo ou filtro.'
    );
  }
  if (!diaUm(p.inicioVigencia) || !diaUm(p.fimVigencia)) {
    throw new ErroTraduzivel(
      'erros.bancos.vigenciaDiaUm',
      {},
      'O início da vigência é no dia 1 do mês.'
    );
  }
  if (p.fimVigencia && p.fimVigencia < p.inicioVigencia) {
    throw new ErroTraduzivel(
      'erros.bancos.fimAntesInicio',
      {},
      'O fim não pode ser anterior ao início da vigência.'
    );
  }
  if (p.diaInicioApuracao < 1 || p.diaInicioApuracao > 28) {
    throw new ErroTraduzivel(
      'erros.bancos.diaInicioApuracao',
      {},
      'O dia de início da apuração vai de 1 a 28.'
    );
  }
  if (p.diaFimApuracao < 0 || p.diaFimApuracao > 28) {
    throw new ErroTraduzivel(
      'erros.bancos.diaFimApuracao',
      {},
      'O dia de fim da apuração vai de 0 (último dia) a 28.'
    );
  }
  if (
    p.repasseEspecial === 'por_periodo' &&
    (p.duracaoPeriodoMeses ?? 0) * (p.periodosAteZerar ?? 0) !== p.periodoApuracao
  ) {
    throw new ErroTraduzivel(
      'erros.bancos.duracaoPeriodos',
      { meses: p.periodoApuracao },
      `Duração × períodos precisa ser igual ao período de apuração (${p.periodoApuracao} meses).`
    );
  }
}

/**
 * RN-05: o mesmo módulo não fica em dois bancos ativos da empresa, e o produto
 * inteiro conflita com qualquer módulo dele. Devolve o nome do banco em conflito.
 */
export function conflitoDeEscopo(
  escopo: EscopoBancoCadastro[],
  outros: { nome: string; escopo: EscopoBancoCadastro[] }[]
): string | null {
  for (const outro of outros) {
    const conflita = escopo.some((e) =>
      outro.escopo.some(
        (o) =>
          o.produtoId === e.produtoId &&
          (o.moduloId === null || e.moduloId === null || o.moduloId === e.moduloId)
      )
    );
    if (conflita) return outro.nome;
  }
  return null;
}

const parametrosParaBanco = (p: ParametrosBanco) => ({
  nome: p.nome.trim(),
  descricao: p.descricao?.trim() || null,
  padrao: p.padrao,
  tipo_contrato: p.tipoContrato,
  periodo_apuracao: p.periodoApuracao,
  inicio_vigencia: p.inicioVigencia,
  fim_vigencia: p.fimVigencia,
  dia_inicio_apuracao: p.diaInicioApuracao,
  dia_fim_apuracao: p.diaFimApuracao,
  taxa_produto: p.taxaProduto,
  taxa_tipo_hora: p.taxaTipoHora,
  repasse_especial: p.repasseEspecial,
  duracao_periodo_meses: p.repasseEspecial === 'por_periodo' ? p.duracaoPeriodoMeses : null,
  periodos_ate_zerar: p.repasseEspecial === 'por_periodo' ? p.periodosAteZerar : null,
  consome_outros_bancos: p.consomeOutrosBancos,
  filtro_ic_operador: p.filtroIc?.operador ?? null,
  filtro_ic_valor: p.filtroIc ? p.filtroIc.valor.trim() : null,
});

const chaveEscopo = (e: { produtoId: string; moduloId: string | null }) =>
  `${e.produtoId}|${e.moduloId ?? '*'}`;

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export class BancosHorasCadastroService {
  constructor(private readonly cliente: Cliente = supabase) {}

  async listar(empresaId: string): Promise<BancoCadastro[]> {
    const { data: bancos, error } = await this.cliente
      .from('bancos_horas')
      .select('*')
      .eq('empresa_id', empresaId)
      .order('ordem');
    if (error) throw falha('carregar os bancos', error);
    if (bancos.length === 0) return [];

    const ids = bancos.map((b) => b.id);
    const [escopos, baselines, repasses] = await Promise.all([
      this.cliente.from('bancos_horas_escopo').select('*').in('banco_id', ids),
      this.cliente
        .from('bancos_horas_baseline')
        .select('*')
        .in('banco_id', ids)
        .order('data_inicio', { ascending: false }),
      this.cliente
        .from('bancos_horas_repasse')
        .select('*')
        .in('banco_id', ids)
        .order('data_inicio', { ascending: false }),
    ]);
    const erro = escopos.error ?? baselines.error ?? repasses.error;
    if (erro) throw falha('carregar os bancos', erro);

    return (bancos as Linha[]).map((b) => ({
      id: b.id,
      empresaId: b.empresa_id,
      nome: b.nome,
      descricao: b.descricao,
      padrao: b.padrao,
      visivelCliente: b.visivel_cliente,
      ordem: b.ordem,
      ativo: b.ativo,
      tipoContrato: b.tipo_contrato,
      periodoApuracao: b.periodo_apuracao,
      inicioVigencia: b.inicio_vigencia,
      fimVigencia: b.fim_vigencia ?? null,
      diaInicioApuracao: b.dia_inicio_apuracao,
      diaFimApuracao: b.dia_fim_apuracao,
      taxaProduto: b.taxa_produto,
      taxaTipoHora: b.taxa_tipo_hora,
      repasseEspecial: b.repasse_especial,
      duracaoPeriodoMeses: b.duracao_periodo_meses,
      periodosAteZerar: b.periodos_ate_zerar,
      consomeOutrosBancos: b.consome_outros_bancos,
      filtroIc: b.filtro_ic_operador
        ? { operador: b.filtro_ic_operador, valor: b.filtro_ic_valor }
        : null,
      espelhaLegado: b.espelha_legado,
      escopo: escopos.data
        .filter((e) => e.banco_id === b.id)
        .map((e) => ({ produtoId: e.produto_id, moduloId: e.modulo_id })),
      baselines: baselines.data
        .filter((v) => v.banco_id === b.id)
        .map((v) => ({
          id: v.id,
          dataInicio: v.data_inicio,
          dataFim: v.data_fim,
          baselineMinutos: v.baseline_minutos,
          baselineTickets: v.baseline_tickets,
          credito: v.credito as 'mensal' | 'anual',
          motivo: v.motivo,
          atualizadoEm: v.updated_at,
          atualizadoPor: v.updated_by,
        })),
      repasses: repasses.data
        .filter((v) => v.banco_id === b.id)
        .map((v) => ({
          id: v.id,
          dataInicio: v.data_inicio,
          dataFim: v.data_fim,
          percentualMensal: Number(v.percentual_mensal),
          percentualDentroPeriodo: numeroOuNulo(v.percentual_dentro_periodo),
          percentualEntrePeriodos: numeroOuNulo(v.percentual_entre_periodos),
          motivo: v.motivo,
          atualizadoEm: v.updated_at,
          atualizadoPor: v.updated_by,
        })),
      atualizadoEm: b.updated_at,
      atualizadoPor: b.updated_by,
    }));
  }

  /** Recusa o escopo que outro banco ativo da empresa já cobre */
  private async exigirSemConflito(
    empresaId: string,
    bancoId: string | null,
    escopo: EscopoBancoCadastro[]
  ) {
    if (escopo.length === 0) return;
    const outros = (await this.listar(empresaId)).filter((b) => b.ativo && b.id !== bancoId);
    const conflito = conflitoDeEscopo(escopo, outros);
    if (conflito) {
      throw new ErroTraduzivel(
        'erros.bancos.conflitoEscopo',
        { banco: conflito },
        `Conflito de escopo: o banco "${conflito}" já cobre este produto ou módulo.`
      );
    }
  }

  async criar(input: NovoBancoInput): Promise<string> {
    validarParametros(input);
    await this.exigirSemConflito(input.empresaId, null, input.escopo);

    const { data, error } = await this.cliente.rpc('bancos_horas_criar', {
      p_banco: { empresa_id: input.empresaId, ...parametrosParaBanco(input) },
      p_escopo: input.escopo.map((e) => ({ produto_id: e.produtoId, modulo_id: e.moduloId })),
      p_baseline: {
        baseline_minutos: input.baseline.baselineMinutos,
        baseline_tickets: input.baseline.baselineTickets,
        credito: input.baseline.credito,
      },
      p_repasse: {
        percentual_mensal: input.repasse.percentualMensal,
        percentual_dentro_periodo: input.repasse.percentualDentroPeriodo,
        percentual_entre_periodos: input.repasse.percentualEntrePeriodos,
      },
    });
    if (error) throw falha('criar o banco', error);
    return data as string;
  }

  /** Parâmetros e escopo de um banco existente; baseline e repasse mudam por novaVigencia */
  async salvar(banco: { id: string; empresaId: string }, p: ParametrosBanco): Promise<void> {
    validarParametros(p);
    await this.exigirSemConflito(banco.empresaId, banco.id, p.escopo);

    const { error } = await this.cliente
      .from('bancos_horas')
      .update(parametrosParaBanco(p))
      .eq('id', banco.id);
    if (error) throw falha('salvar o banco', error);

    const { data: atuais, error: erroEscopo } = await this.cliente
      .from('bancos_horas_escopo')
      .select('id, produto_id, modulo_id')
      .eq('banco_id', banco.id);
    if (erroEscopo) throw falha('salvar o escopo', erroEscopo);

    const desejados = new Set(p.escopo.map(chaveEscopo));
    const chaveAtual = (e: Linha) =>
      chaveEscopo({ produtoId: e.produto_id, moduloId: e.modulo_id });
    const existentes = new Set(atuais.map(chaveAtual));

    // Tira antes de incluir: o gatilho de conflito olha o escopo gravado
    for (const e of atuais.filter((a) => !desejados.has(chaveAtual(a)))) {
      const { error: erro } = await this.cliente
        .from('bancos_horas_escopo')
        .delete()
        .eq('id', e.id);
      if (erro) throw falha('salvar o escopo', erro);
    }
    const novos = p.escopo.filter((e) => !existentes.has(chaveEscopo(e)));
    if (novos.length > 0) {
      const { error: erro } = await this.cliente
        .from('bancos_horas_escopo')
        .insert(
          novos.map((e) => ({ banco_id: banco.id, produto_id: e.produtoId, modulo_id: e.moduloId }))
        );
      if (erro) throw falha('salvar o escopo', erro);
    }
  }

  /** A posição na lista é a prioridade na classificação (RN-06) */
  async reordenar(bancoIds: string[]): Promise<void> {
    for (const [i, id] of bancoIds.entries()) {
      const { error } = await this.cliente
        .from('bancos_horas')
        .update({ ordem: i + 1 })
        .eq('id', id);
      if (error) throw falha('reordenar os bancos', error);
    }
  }

  async inativar(bancoId: string, motivo: string): Promise<void> {
    const limpo = motivo.trim();
    if (!limpo) throw new ErroTraduzivel('erros.motivo', {}, 'Informe o motivo da alteração.');
    const { error } = await this.cliente.rpc('bancos_horas_inativar', {
      p_banco_id: bancoId,
      p_motivo: limpo,
    });
    if (error) throw falha('inativar o banco', error);
  }

  async reativar(bancoId: string): Promise<void> {
    const { error } = await this.cliente
      .from('bancos_horas')
      .update({ ativo: true, inativado_em: null, inativado_por: null })
      .eq('id', bancoId);
    if (error) throw falha('reativar o banco', error);
  }

  /** Fecha a vigência aberta no mês anterior e abre a nova, com motivo */
  async novaVigencia(input: NovaVigenciaInput): Promise<void> {
    const valores =
      input.tipo === 'baseline'
        ? {
            baseline_minutos: input.valores.baselineMinutos,
            baseline_tickets: input.valores.baselineTickets,
            credito: input.valores.credito,
          }
        : {
            percentual_mensal: input.valores.percentualMensal,
            percentual_dentro_periodo: input.valores.percentualDentroPeriodo,
            percentual_entre_periodos: input.valores.percentualEntrePeriodos,
          };
    const { error } = await this.cliente.rpc('bancos_horas_nova_vigencia', {
      p_banco_id: input.bancoId,
      p_tipo: input.tipo,
      p_desde: input.desde,
      p_valores: valores,
      p_motivo: input.motivo.trim(),
    });
    if (error) throw falha('registrar a vigência', error);
  }
}

export const bancosHorasCadastroService = new BancosHorasCadastroService();
