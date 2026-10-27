/**
 * Empresas, tela nova (Modelagem_Fase3.md, seção 3). Lê a empresa nova (mesmo id
 * do legado) com os satélites da tela atual, e grava o que a transição permite
 * editar aqui: AMS e projeto por solução, ID e organizações do Aranda, ramo e
 * Contrato FISCAL. Os bancos ficam em bancosHorasCadastroService.
 */

import { supabase } from '@/integrations/supabase/client';
import { ErroTraduzivel, falhaDoBanco } from '@/errors/erroTraduzivel';
import type {
  ContratoFiscal,
  EmpresaDetalhe,
  EmpresaLista,
  InformacoesContrato,
  ModeloEmpresa,
  Pendencia,
  SalvarInformacoesInput,
  SolucaoAmsInput,
  SolucaoDaEmpresa,
  TotaisEmpresas,
} from '@/types/empresas';

type Cliente = typeof supabase;
type Linha = Record<string, any>;

const LIMITE_JUSTIFICATIVA = 200;
const LIMITE_DESCRICAO = 500;

const falha = falhaDoBanco;

const chaveNome = (nome: string) => nome.trim().toLowerCase();
const textoOuNulo = (texto: string | null | undefined) => texto?.trim() || null;
const numeroOuNulo = (valor: unknown) =>
  valor === null || valor === undefined ? null : Number(valor);

/** Relação 1:1 do PostgREST: chega como objeto ou como lista de um item */
const umOuNulo = <T>(valor: T | T[] | null | undefined): T | null =>
  Array.isArray(valor) ? (valor[0] ?? null) : (valor ?? null);

// ---------------------------------------------------------------------------
// Regras puras
// ---------------------------------------------------------------------------

export function modeloDaEmpresa(modeloCalculo: string, bancosAtivos: number): ModeloEmpresa {
  if (modeloCalculo === 'multiplo') return 'liberada';
  return bancosAtivos > 1 ? 'multiplo' : 'legado';
}

function fiscalIncompleto(f: ContratoFiscal): boolean {
  if (f.modalidade === null || f.edocs24x7 === null || f.atualizacaoContratada === null)
    return true;
  if (f.atualizacaoContratada && f.atualizacoesPorAno === null) return true;
  if (f.modalidade !== 'on_premise') return false;
  if (f.dba === null || f.bancoDados === null) return true;
  const atendimento = f.dba === 'atendimento' || f.dba === 'atendimento_monitoramento';
  const monitoramento = f.dba === 'monitoramento' || f.dba === 'atendimento_monitoramento';
  return (
    (atendimento && f.minutosAtendimento === null) ||
    (monitoramento && f.minutosMonitoramento === null)
  );
}

/**
 * Informações novas ainda não preenchidas (RN-35). O valor padrão da carga conta
 * como preenchido: só o nulo é pendente.
 */
export function calcularPendencias(e: {
  solucoes: Pick<SolucaoDaEmpresa, 'codigo' | 'temAms' | 'emProjeto'>[];
  informacoes: InformacoesContrato | null;
  organizacoesAtivas: number;
  emProjeto: boolean;
}): Pendencia[] {
  const pendencias: Pendencia[] = [];
  if (!e.informacoes?.ramoId) pendencias.push('ramo');
  // RN-28: o Contrato FISCAL só existe para quem contrata FISCAIS
  if (
    e.solucoes.some((s) => s.codigo === 'FISCAIS') &&
    (!e.informacoes || fiscalIncompleto(e.informacoes.fiscal))
  )
    pendencias.push('contrato_fiscal');
  if (e.solucoes.some((s) => s.temAms) && e.organizacoesAtivas === 0)
    pendencias.push('organizacao');
  if (e.emProjeto && !e.solucoes.some((s) => s.emProjeto)) pendencias.push('projeto_sem_solucao');
  return pendencias;
}

export function totaisEmpresas(
  lista: Pick<EmpresaLista, 'status' | 'pendencias'>[]
): TotaisEmpresas {
  return {
    total: lista.length,
    ativas: lista.filter((e) => e.status === 'ativo').length,
    inativas: lista.filter((e) => e.status === 'inativo').length,
    pendentes: lista.filter((e) => e.pendencias.length > 0).length,
  };
}

// ---------------------------------------------------------------------------
// Conversões
// ---------------------------------------------------------------------------

const solucoesDaLinha = (linhas: Linha[] | null): SolucaoDaEmpresa[] =>
  [...(linhas ?? [])]
    .sort((a, b) => (a.solucoes?.ordem ?? 0) - (b.solucoes?.ordem ?? 0))
    .map((s) => ({
      id: s.id,
      solucaoId: s.solucao_id,
      codigo: s.solucoes?.codigo ?? '',
      nome: s.solucoes?.nome ?? '',
      temAms: s.tem_ams,
      emProjeto: s.em_projeto,
      justificativaProjeto: s.justificativa_projeto,
    }));

function informacoesDaLinha(c: Linha | null): InformacoesContrato {
  return {
    ramoId: c?.ramo_atividade_id ?? null,
    ramoSecundarioId: c?.ramo_secundario_id ?? null,
    descricaoAtividade: c?.descricao_atividade ?? null,
    fiscal: {
      modalidade: c?.fiscal_modalidade ?? null,
      edocs24x7: c?.fiscal_edocs_24x7 ?? null,
      atualizacaoContratada: c?.fiscal_atualizacao_contratada ?? null,
      atualizacoesPorAno: c?.fiscal_atualizacoes_por_ano ?? null,
      dba: c?.fiscal_dba ?? null,
      minutosAtendimento: c?.fiscal_dba_minutos_atendimento ?? null,
      minutosMonitoramento: c?.fiscal_dba_minutos_monitoramento ?? null,
      bancoDados: c?.fiscal_banco_dados ?? null,
    },
  };
}

const informacoesParaBanco = (empresaId: string, i: InformacoesContrato) => ({
  empresa_id: empresaId,
  ramo_atividade_id: i.ramoId,
  ramo_secundario_id: i.ramoSecundarioId,
  descricao_atividade: textoOuNulo(i.descricaoAtividade),
  fiscal_modalidade: i.fiscal.modalidade,
  fiscal_edocs_24x7: i.fiscal.edocs24x7,
  fiscal_atualizacao_contratada: i.fiscal.atualizacaoContratada,
  fiscal_atualizacoes_por_ano: i.fiscal.atualizacoesPorAno,
  fiscal_dba: i.fiscal.dba,
  fiscal_dba_minutos_atendimento: i.fiscal.minutosAtendimento,
  fiscal_dba_minutos_monitoramento: i.fiscal.minutosMonitoramento,
  fiscal_banco_dados: i.fiscal.bancoDados,
});

function validarInformacoes(i: InformacoesContrato) {
  if (i.ramoId && i.ramoSecundarioId === i.ramoId) {
    throw new ErroTraduzivel(
      'erros.empresas.ramoSecundarioIgual',
      {},
      'O ramo secundário precisa ser diferente do principal.'
    );
  }
  if ((i.descricaoAtividade?.trim().length ?? 0) > LIMITE_DESCRICAO) {
    throw new ErroTraduzivel(
      'erros.empresas.descricaoLonga',
      { limite: LIMITE_DESCRICAO },
      `A descrição da atividade passa de ${LIMITE_DESCRICAO} caracteres.`
    );
  }
  if (i.fiscal.atualizacoesPorAno !== null && i.fiscal.atualizacoesPorAno < 1) {
    throw new ErroTraduzivel(
      'erros.empresas.atualizacoesPorAno',
      {},
      'Informe ao menos uma atualização por ano.'
    );
  }
  if ((i.fiscal.minutosAtendimento ?? 0) < 0 || (i.fiscal.minutosMonitoramento ?? 0) < 0) {
    throw new ErroTraduzivel(
      'erros.empresas.dbaNegativo',
      {},
      'As horas de DBA não podem ser negativas.'
    );
  }
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

const COLUNAS_LISTA = `id, nome_abreviado, nome_completo, status, modelo_calculo, email_gestor,
  email_comercial, observacao, em_projeto,
  empresas_solucoes(id, solucao_id, tem_ams, em_projeto, justificativa_projeto, solucoes(codigo, nome, ordem)),
  empresas_informacoes_contrato(*),
  empresas_organizacoes_aranda(ativo),
  bancos_horas(ativo)`;

const COLUNAS_SOLUCAO =
  'id, solucao_id, tem_ams, em_projeto, justificativa_projeto, solucoes(codigo, nome, ordem)';

export class EmpresasService {
  constructor(private readonly cliente: Cliente = supabase) {}

  /** Nome de cada e-mail (minúsculo) pelo cadastro de usuários; sem permissão, nenhum */
  private async nomesPorEmail(emails: (string | null)[]): Promise<Map<string, string>> {
    const unicos = [...new Set(emails.filter(Boolean).map((e) => e!.toLowerCase()))];
    if (unicos.length === 0) return new Map();
    const { data, error } = await this.cliente.rpc('perfis_resumo', {
      p_ids: null,
      p_emails: unicos,
    });
    if (error) return new Map();
    return new Map(
      (data ?? []).filter((p) => p.full_name).map((p) => [p.email.toLowerCase(), p.full_name])
    );
  }

  async listar(): Promise<EmpresaLista[]> {
    const { data, error } = await this.cliente
      .from('empresas')
      .select(COLUNAS_LISTA)
      .order('nome_abreviado');
    if (error) throw falha('carregar as empresas', error);

    const linhas = data as Linha[];
    const nomes = await this.nomesPorEmail(
      linhas.flatMap((e) => [e.email_gestor, e.email_comercial])
    );
    const nomeDe = (email: string | null) =>
      email ? (nomes.get(email.toLowerCase()) ?? null) : null;

    return linhas.map((e) => {
      const solucoes = solucoesDaLinha(e.empresas_solucoes);
      const contrato = umOuNulo<Linha>(e.empresas_informacoes_contrato);
      return {
        id: e.id,
        nomeAbreviado: e.nome_abreviado,
        nomeCompleto: e.nome_completo,
        status: e.status,
        modelo: modeloDaEmpresa(
          e.modelo_calculo,
          (e.bancos_horas ?? []).filter((b: Linha) => b.ativo).length
        ),
        solucoes,
        temAms: solucoes.some((s) => s.temAms),
        emProjeto: e.em_projeto,
        pendencias: calcularPendencias({
          solucoes,
          informacoes: contrato ? informacoesDaLinha(contrato) : null,
          organizacoesAtivas: (e.empresas_organizacoes_aranda ?? []).filter((o: Linha) => o.ativo)
            .length,
          emProjeto: e.em_projeto,
        }),
        emailCs: e.email_gestor,
        emailComercial: e.email_comercial,
        nomeCs: nomeDe(e.email_gestor),
        nomeComercial: nomeDe(e.email_comercial),
        observacao: e.observacao,
      };
    });
  }

  async carregar(empresaId: string): Promise<EmpresaDetalhe> {
    const [empresa, solucoes, contrato, organizacoes, contatos, grupos, anexos, bancos] =
      await Promise.all([
        this.cliente.from('empresas').select('*').eq('id', empresaId).single(),
        this.cliente.from('empresas_solucoes').select(COLUNAS_SOLUCAO).eq('empresa_id', empresaId),
        this.cliente
          .from('empresas_informacoes_contrato')
          .select('*')
          .eq('empresa_id', empresaId)
          .maybeSingle(),
        this.cliente
          .from('empresas_organizacoes_aranda')
          .select('id, nome_organizacao')
          .eq('empresa_id', empresaId)
          .eq('ativo', true)
          .order('nome_organizacao'),
        this.cliente
          .from('clientes')
          .select('id, nome_completo, email, finalidade_envio, principal_contato, status')
          .eq('empresa_id', empresaId)
          .order('nome_completo'),
        this.cliente
          .from('empresa_grupos')
          .select('grupos_responsaveis(id, nome, descricao)')
          .eq('empresa_id', empresaId),
        this.cliente
          .from('empresa_anexos')
          .select('id, nome_original, tamanho_bytes, storage_path, ordem')
          .eq('empresa_id', empresaId)
          .order('ordem'),
        this.cliente.from('bancos_horas').select('ativo').eq('empresa_id', empresaId),
      ]);
    const erro =
      empresa.error ??
      solucoes.error ??
      contrato.error ??
      organizacoes.error ??
      contatos.error ??
      grupos.error ??
      anexos.error ??
      bancos.error;
    if (erro) throw falha('carregar a empresa', erro);

    const e = empresa.data as Linha;
    let consolidadora: EmpresaDetalhe['book']['consolidadora'] = null;
    if (e.empresa_consolidadora_id) {
      const { data, error } = await this.cliente
        .from('empresas')
        .select('id, nome_abreviado')
        .eq('id', e.empresa_consolidadora_id)
        .maybeSingle();
      if (error) throw falha('carregar a empresa', error);
      if (data) consolidadora = { id: data.id, nomeAbreviado: data.nome_abreviado };
    }

    const listaSolucoes = solucoesDaLinha(solucoes.data as Linha[]);
    const informacoes = informacoesDaLinha(contrato.data as Linha | null);

    return {
      id: e.id,
      nomeAbreviado: e.nome_abreviado,
      nomeCompleto: e.nome_completo,
      grupoEmpresarial: e.grupo_empresarial ?? null,
      status: e.status,
      modelo: modeloDaEmpresa(e.modelo_calculo, bancos.data.filter((b) => b.ativo).length),
      vigenciaInicio: e.vigencia_inicio ?? null,
      vigenciaFim: e.vigencia_fim ?? null,
      emailCs: e.email_gestor ?? null,
      emailComercial: e.email_comercial ?? null,
      emailTm: e.email_tm ?? null,
      observacao: e.observacao ?? null,
      emProjeto: e.em_projeto,
      idAranda: e.id_aranda ?? null,
      solucoes: listaSolucoes,
      informacoes,
      organizacoes: organizacoes.data.map((o) => ({ id: o.id, nome: o.nome_organizacao })),
      contatos: contatos.data.map((c) => ({
        id: c.id,
        nome: c.nome_completo,
        email: c.email,
        finalidade: c.finalidade_envio,
        principal: !!c.principal_contato,
        ativo: c.status === 'ativo',
      })),
      grupos: (grupos.data as Linha[])
        .map((g) => umOuNulo<Linha>(g.grupos_responsaveis))
        .filter(Boolean)
        .map((g) => ({ id: g.id, nome: g.nome, descricao: g.descricao })),
      anexos: anexos.data.map((a) => ({
        id: a.id,
        nome: a.nome_original,
        tamanhoBytes: a.tamanho_bytes,
        storagePath: a.storage_path,
      })),
      book: {
        tipoBook: e.tipo_book,
        templatePadrao: e.template_padrao ?? null,
        linkSharepoint: e.link_sharepoint ?? null,
        bookPersonalizado: !!e.book_personalizado,
        bookAnexo: !!e.book_anexo,
        consolidadora,
        metaSlaPercentual: numeroOuNulo(e.meta_sla_percentual),
        quantidadeMinimaChamadosSla: numeroOuNulo(e.quantidade_minima_chamados_sla),
      },
      pendencias: calcularPendencias({
        solucoes: listaSolucoes,
        informacoes: contrato.data ? informacoes : null,
        organizacoesAtivas: organizacoes.data.length,
        emProjeto: e.em_projeto,
      }),
      atualizadoEm: e.updated_at,
      atualizadoPor: e.updated_by,
    };
  }

  /** AMS e projeto por solução; quais soluções a empresa contrata vem da tela atual */
  async salvarSolucoes(solucoes: SolucaoAmsInput[]): Promise<void> {
    for (const s of solucoes) {
      if (!s.emProjeto) continue;
      const justificativa = s.justificativaProjeto?.trim() ?? '';
      if (!justificativa)
        throw new ErroTraduzivel(
          'erros.empresas.justificativaVazia',
          {},
          'Explique brevemente o projeto.'
        );
      if (justificativa.length > LIMITE_JUSTIFICATIVA) {
        throw new ErroTraduzivel(
          'erros.empresas.justificativaLonga',
          { limite: LIMITE_JUSTIFICATIVA },
          `A justificativa do projeto passa de ${LIMITE_JUSTIFICATIVA} caracteres.`
        );
      }
    }
    for (const s of solucoes) {
      const { error } = await this.cliente
        .from('empresas_solucoes')
        .update({
          tem_ams: s.temAms,
          em_projeto: s.emProjeto,
          justificativa_projeto: s.emProjeto ? s.justificativaProjeto!.trim() : null,
        })
        .eq('id', s.id);
      if (error) throw falha('salvar AMS e projetos', error);
    }
  }

  /** Aba Informações: ID e organizações do Aranda, ramo e Contrato FISCAL */
  async salvarInformacoes(empresaId: string, input: SalvarInformacoesInput): Promise<void> {
    validarInformacoes(input.informacoes);

    const { error: erroEmpresa } = await this.cliente
      .from('empresas')
      .update({ id_aranda: textoOuNulo(input.idAranda) })
      .eq('id', empresaId);
    if (erroEmpresa) throw falha('salvar as informações', erroEmpresa);

    const { error: erroContrato } = await this.cliente
      .from('empresas_informacoes_contrato')
      .upsert(informacoesParaBanco(empresaId, input.informacoes), { onConflict: 'empresa_id' });
    if (erroContrato) throw falha('salvar as informações do contrato', erroContrato);

    await this.salvarOrganizacoes(empresaId, input.organizacoes);
  }

  private async salvarOrganizacoes(empresaId: string, nomes: string[]): Promise<void> {
    const desejadas = new Map<string, string>();
    for (const nome of nomes) {
      const limpo = nome.trim().toUpperCase();
      if (limpo) desejadas.set(chaveNome(limpo), limpo);
    }

    const { data: atuais, error } = await this.cliente
      .from('empresas_organizacoes_aranda')
      .select('id, nome_organizacao, ativo')
      .eq('empresa_id', empresaId);
    if (error) throw falha('salvar as organizações', error);

    // Inativa antes de incluir: libera o nome para a mesma empresa reutilizar
    for (const o of atuais.filter(
      (o) => o.ativo && !desejadas.has(chaveNome(o.nome_organizacao))
    )) {
      const { error: e } = await this.cliente
        .from('empresas_organizacoes_aranda')
        .update({ ativo: false })
        .eq('id', o.id);
      if (e) throw falha('salvar as organizações', e);
    }

    for (const [chave, nome] of desejadas) {
      const existentes = atuais.filter((o) => chaveNome(o.nome_organizacao) === chave);
      if (existentes.some((o) => o.ativo)) continue;
      const inativa = existentes[0];
      const { error: e } = inativa
        ? await this.cliente
            .from('empresas_organizacoes_aranda')
            .update({ ativo: true })
            .eq('id', inativa.id)
        : await this.cliente
            .from('empresas_organizacoes_aranda')
            .insert({ empresa_id: empresaId, nome_organizacao: nome });
      if (e?.code === '23505') throw await this.organizacaoDeOutra(nome);
      if (e) throw falha('salvar as organizações', e);
    }
  }

  /** Um nome de organização pertence a uma única empresa: diz qual */
  private async organizacaoDeOutra(nome: string): Promise<Error> {
    const { data } = await this.cliente
      .from('empresas_organizacoes_aranda')
      .select('nome_organizacao, empresas(nome_abreviado)')
      .eq('ativo', true);
    const dona = (data as Linha[] | null)?.find(
      (o) => chaveNome(o.nome_organizacao) === chaveNome(nome)
    );
    const empresa = umOuNulo<Linha>(dona?.empresas)?.nome_abreviado;
    return empresa
      ? new ErroTraduzivel(
          'erros.empresas.organizacaoDeOutra',
          { organizacao: nome, empresa },
          `A organização ${nome} já pertence à ${empresa}.`
        )
      : new ErroTraduzivel(
          'erros.empresas.organizacaoDeOutraEmpresa',
          { organizacao: nome },
          `A organização ${nome} já pertence a outra empresa.`
        );
  }
}

export const empresasService = new EmpresasService();
