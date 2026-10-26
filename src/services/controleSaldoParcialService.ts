/**
 * Conteúdo do Saldo Parcial enviado pelo Controle (decisão de 26/10/2026): um bloco por banco
 * que o cliente vê, no período atual do banco, e os chamados que consumiram cada um.
 *
 * O que vai ao cliente não leva anotação interna nem autor (D-08), nem reajuste aguardando a
 * retificação do Book. O Banco padrão interno fica de fora (visivel_cliente = false), mas
 * continua na classificação dos chamados, para cada chamado cair no mesmo banco do fechamento.
 */

import { supabase } from '@/integrations/supabase/client';
import { criarClassificador } from '@/services/bancosHoras/classificacao';
import { estaVigente, type MesAno } from '@/services/bancosHoras/calculo';
import { itensDeConsumoPorBanco } from '@/services/bancosHoras/fechamento';
import { periodosDoBanco } from '@/services/bancosHoras/periodos';
import {
  criarRepositorioSupabase,
  type ClienteSupabase,
} from '@/services/bancosHoras/repositorioSupabase';
import type {
  BancoCadastro,
  RepositorioBancosHoras,
} from '@/services/bancosHoras/motorBancosHoras';
import {
  chaveMes,
  controleBancoHorasService,
  type ControleBancoHorasService,
} from '@/services/controleBancoHorasService';
import {
  controleLancamentosService,
  type ControleLancamentosService,
} from '@/services/controleLancamentosService';
import { mesesComSituacao, type MesDoQuadro } from '@/utils/controleTela';
import { isEnglishTemplateByName } from '@/utils/bancoHorasI18n';
import type {
  ObservacaoParaCliente,
  ReajusteParaCliente,
  RequerimentoControle,
} from '@/types/controleBancoHoras';
import type { TipoContrato } from '@/services/bancosHoras/calculo';

type Cliente = typeof supabase;
type ErroBanco = { message: string; code?: string };
type Linha = Record<string, any>;

/** Ids por consulta: a lista vai na URL */
const LOTE = 200;

export type RequerimentoParaCliente = Pick<
  RequerimentoControle,
  'chamado' | 'titulo' | 'modulo' | 'mes' | 'minutos' | 'tickets' | 'situacao'
>;

export interface SaldoParcialBanco {
  bancoId: string;
  nome: string;
  tipoContrato: TipoContrato;
  /** O saldo negativo pode ser coberto pelos outros bancos no fim do período */
  consomeOutrosBancos: boolean;
  /** Período atual do banco, com a situação e o resultado de cada mês */
  meses: MesDoQuadro[];
  requerimentos: RequerimentoParaCliente[];
  reajustes: ReajusteParaCliente[];
  observacoes: ObservacaoParaCliente[];
}

/** Um apontamento ou ticket que consumiu o banco */
export interface ChamadoDoBanco {
  mes: MesAno;
  fonte: 'apontamento' | 'ticket';
  chamado: string | null;
  /** Só no apontamento */
  tarefa: string | null;
  /** Atividade (apontamento) ou solução (ticket) */
  data: string | null;
  grupo: string | null;
  itemConfiguracao: string | null;
  analista: string | null;
  solicitante: string | null;
  descricaoTarefa: string | null;
  descricaoChamado: string | null;
  solucaoChamado: string | null;
  minutos: number;
  tickets: number;
}

interface ItemDoBanco {
  bancoId: string;
  mes: MesAno;
  fonte: 'apontamento' | 'ticket';
  itemId: string;
  minutos: number;
  tickets: number;
}

const falha = (contexto: string, error: ErroBanco) =>
  new Error(`Falha ao ${contexto}: ${error.message}`);

const indice = (m: MesAno) => m.ano * 12 + m.mes;

const emLotes = <T>(lista: T[]) =>
  Array.from({ length: Math.ceil(lista.length / LOTE) }, (_, i) =>
    lista.slice(i * LOTE, (i + 1) * LOTE)
  );

export class ControleSaldoParcialService {
  constructor(
    private readonly cliente: Cliente = supabase,
    private readonly controle: Pick<
      ControleBancoHorasService,
      'bancos' | 'quadro' | 'requerimentos'
    > = controleBancoHorasService,
    private readonly lancamentos: Pick<
      ControleLancamentosService,
      'reajustesParaCliente' | 'observacoesParaCliente'
    > = controleLancamentosService,
    private readonly criarRepositorio: (c: ClienteSupabase) => Pick<
      RepositorioBancosHoras,
      'bancos' | 'dePara'
    > & {
      consumoItens: Parameters<typeof itensDeConsumoPorBanco>[0]['consumoItens'];
    } = criarRepositorioSupabase
  ) {}

  /** Bancos que o cliente vê, ativos e vigentes, na ordem, cada um no período atual */
  async bancos(empresaId: string, hoje: MesAno): Promise<SaldoParcialBanco[]> {
    const visiveis = (await this.controle.bancos(empresaId))
      .filter((b) => b.ativo && b.visivelCliente && estaVigente(b, hoje))
      .sort((a, b) => a.ordem - b.ordem);
    if (visiveis.length === 0) return [];

    const periodos = new Map(
      visiveis.map((b) => [b.bancoId, periodosDoBanco(b, hoje).at(-1)?.meses ?? []])
    );
    const todos = [
      ...new Map([...periodos.values()].flat().map((m) => [chaveMes(m), m])).values(),
    ].sort((a, b) => indice(a) - indice(b));
    const [quadro, requerimentos] = await Promise.all([
      this.controle.quadro(empresaId, todos),
      this.controle.requerimentos(empresaId, todos),
    ]);

    return Promise.all(
      visiveis.map(async (b) => {
        const meses = periodos.get(b.bancoId)!;
        const doPeriodo = new Set(meses.map(chaveMes));
        const [reajustes, observacoes] = await Promise.all([
          this.lancamentos.reajustesParaCliente(b.bancoId, meses),
          this.lancamentos.observacoesParaCliente(b.bancoId, meses),
        ]);
        return {
          bancoId: b.bancoId,
          nome: b.nome,
          tipoContrato: b.tipoContrato,
          consomeOutrosBancos: b.consomeOutrosBancos,
          meses: mesesComSituacao(meses, quadro, b.bancoId, hoje),
          requerimentos: requerimentos
            .filter((r) => r.bancoId === b.bancoId && doPeriodo.has(chaveMes(r.mes)))
            .map((r) => ({
              chamado: r.chamado,
              titulo: r.titulo,
              modulo: r.modulo,
              mes: r.mes,
              minutos: r.minutos,
              tickets: r.tickets,
              situacao: r.situacao,
            })),
          reajustes,
          observacoes,
        };
      })
    );
  }

  /**
   * Chamados de cada banco nos meses já iniciados do período. Mês fechado: os itens congelados
   * no fechamento vigente, os mesmos do Book. Mês aberto: a classificação do fechamento, na hora.
   */
  async chamados(
    empresaId: string,
    bancos: SaldoParcialBanco[]
  ): Promise<Record<string, ChamadoDoBanco[]>> {
    const itens = [
      ...(await this.itensFechados(bancos)),
      ...(await this.itensAbertos(empresaId, bancos)),
    ];
    const detalhes = await this.detalhes(itens);
    const porBanco: Record<string, ChamadoDoBanco[]> = Object.fromEntries(
      bancos.map((b) => [b.bancoId, []])
    );
    for (const item of itens) {
      const d = detalhes.get(`${item.fonte}:${item.itemId}`);
      if (!d) continue;
      porBanco[item.bancoId].push({
        ...d,
        mes: item.mes,
        minutos: item.minutos,
        tickets: item.tickets,
      });
    }
    for (const lista of Object.values(porBanco)) {
      lista.sort(
        (a, b) => indice(a.mes) - indice(b.mes) || String(a.data).localeCompare(String(b.data))
      );
    }
    return porBanco;
  }

  private async itensFechados(bancos: SaldoParcialBanco[]): Promise<ItemDoBanco[]> {
    const fechados = bancos.flatMap((b) =>
      b.meses.filter((m) => m.situacao === 'fechado').map((m) => ({ bancoId: b.bancoId, m }))
    );
    if (fechados.length === 0) return [];
    const { data: fechamentos, error } = await this.cliente
      .from('bancos_horas_fechamentos')
      .select('id, banco_id, mes, ano')
      .in('banco_id', [...new Set(fechados.map((f) => f.bancoId))])
      .eq('vigente', true);
    if (error) throw falha('carregar os chamados dos meses fechados', error);

    const procurados = new Set(fechados.map((f) => `${f.bancoId}:${f.m.chave}`));
    const doFechamento = new Map<string, { bancoId: string; mes: MesAno }>();
    for (const f of fechamentos as Linha[]) {
      const mes = { mes: f.mes, ano: f.ano };
      if (procurados.has(`${f.banco_id}:${chaveMes(mes)}`)) {
        doFechamento.set(f.id, { bancoId: f.banco_id, mes });
      }
    }

    const itens: ItemDoBanco[] = [];
    for (const lote of emLotes([...doFechamento.keys()])) {
      const { data, error: erroItens } = await this.cliente
        .from('bancos_horas_fechamento_itens')
        .select('fechamento_id, tipo, item_id, minutos, tickets')
        .in('fechamento_id', lote)
        .in('tipo', ['apontamento', 'ticket']);
      if (erroItens) throw falha('carregar os chamados dos meses fechados', erroItens);
      for (const i of data as Linha[]) {
        const origem = doFechamento.get(i.fechamento_id);
        if (!origem) continue;
        itens.push({
          ...origem,
          fonte: i.tipo,
          itemId: i.item_id,
          minutos: i.minutos,
          tickets: i.tickets,
        });
      }
    }
    return itens;
  }

  private async itensAbertos(
    empresaId: string,
    bancos: SaldoParcialBanco[]
  ): Promise<ItemDoBanco[]> {
    const abertos = new Map<string, { mes: MesAno; bancos: string[] }>();
    for (const b of bancos) {
      for (const m of b.meses.filter((x) => x.situacao === 'aberto')) {
        const grupo = abertos.get(m.chave) ?? { mes: m.mes, bancos: [] };
        grupo.bancos.push(b.bancoId);
        abertos.set(m.chave, grupo);
      }
    }
    if (abertos.size === 0) return [];

    const repo = this.criarRepositorio(this.cliente as unknown as ClienteSupabase);
    const [lista, dePara] = await Promise.all([repo.bancos(empresaId), repo.dePara()]);
    const cadastros = new Map<string, BancoCadastro>(lista.map((b) => [b.bancoId, b]));
    const itens: ItemDoBanco[] = [];
    for (const { mes, bancos: pedidos } of abertos.values()) {
      // Todos os bancos do mês classificam, inclusive os que o cliente não vê
      const doMes = lista.filter((b) => b.ativo && estaVigente(b, mes)).map((b) => b.bancoId);
      const classificador = criarClassificador(lista, dePara, mes);
      const porBanco = await itensDeConsumoPorBanco(
        repo,
        empresaId,
        mes,
        cadastros,
        classificador,
        doMes
      );
      for (const bancoId of pedidos) {
        for (const i of porBanco.get(bancoId) ?? []) {
          itens.push({
            bancoId,
            mes,
            fonte: i.fonte as ItemDoBanco['fonte'],
            itemId: i.itemId,
            minutos: i.minutos,
            tickets: i.tickets,
          });
        }
      }
    }
    return itens;
  }

  /**
   * Idioma do e-mail: o do template padrão da empresa ('ingles', ou um template cadastrado com
   * nome em inglês, como no legado); sem template, português
   */
  async idiomaDoEmail(empresaId: string): Promise<'pt-BR' | 'en'> {
    const cliente = this.cliente as unknown as ClienteSupabase;
    const { data: empresa, error } = await cliente
      .from('empresas')
      .select('template_padrao')
      .eq('id', empresaId)
      .maybeSingle();
    if (error) throw falha('carregar o idioma do e-mail', error);
    const template = (empresa as Linha | null)?.template_padrao as string | null;
    if (!template || template === 'portugues') return 'pt-BR';
    if (template === 'ingles') return 'en';

    const { data: cadastrado, error: erroTemplate } = await cliente
      .from('email_templates')
      .select('nome')
      .eq('id', template)
      .maybeSingle();
    if (erroTemplate) throw falha('carregar o idioma do e-mail', erroTemplate);
    return isEnglishTemplateByName((cadastrado as Linha | null)?.nome) ? 'en' : 'pt-BR';
  }

  /**
   * Registra o envio no histórico de envios do Saldo Parcial (manual, sem agendamento). O app
   * não grava direto na tabela: a função do banco confere a permissão e o modelo da empresa.
   */
  async registrarEnvio(
    empresaId: string,
    envio: { sucesso: boolean; destinatarios: number; erro?: string }
  ): Promise<void> {
    const { error } = await (this.cliente as unknown as ClienteSupabase).rpc(
      'registrar_envio_saldo_parcial_controle',
      {
        p_empresa_id: empresaId,
        p_sucesso: envio.sucesso,
        p_qtd_destinatarios: envio.destinatarios,
        p_erro: envio.erro ?? null,
      }
    );
    if (error) throw falha('registrar o envio do Saldo Parcial', error);
  }

  /** Dados de cada chamado, pela fonte e pelo id do item */
  private async detalhes(
    itens: ItemDoBanco[]
  ): Promise<Map<string, Omit<ChamadoDoBanco, 'mes' | 'minutos' | 'tickets'>>> {
    const ids = (fonte: ItemDoBanco['fonte']) => [
      ...new Set(itens.filter((i) => i.fonte === fonte).map((i) => i.itemId)),
    ];
    const ler = async (tabela: string, colunas: string, coluna: string, valores: string[]) => {
      const linhas: Linha[] = [];
      for (const lote of emLotes(valores)) {
        const { data, error } = await (this.cliente as unknown as ClienteSupabase)
          .from(tabela)
          .select(colunas)
          .in(coluna, lote);
        if (error) throw falha('carregar os chamados', error);
        linhas.push(...(data as unknown as Linha[]));
      }
      return linhas;
    };

    const [apontamentos, tickets] = await Promise.all([
      ler(
        'apontamentos_aranda',
        'id, nro_chamado, nro_tarefa, data_atividade, analista_tarefa, solicitante, grupo_tarefa, item_configuracao, descricao_tarefa',
        'id',
        ids('apontamento')
      ),
      ler(
        'apontamentos_tickets_aranda',
        'id, nro_solicitacao, data_solucao, data_fechamento, nome_responsavel, solicitante, nome_grupo, item_configuracao, descricao, solucao',
        'id',
        ids('ticket')
      ),
    ]);
    // Descrição e solução do chamado de cada apontamento, como no Excel do legado
    const nros = [...new Set(apontamentos.map((a) => a.nro_chamado).filter(Boolean))];
    const chamados = new Map(
      (
        await ler(
          'apontamentos_tickets_aranda',
          'nro_solicitacao, descricao, solucao',
          'nro_solicitacao',
          nros
        )
      ).map((t) => [t.nro_solicitacao, t])
    );

    const mapa = new Map<string, Omit<ChamadoDoBanco, 'mes' | 'minutos' | 'tickets'>>();
    for (const a of apontamentos) {
      const chamado = chamados.get(a.nro_chamado);
      mapa.set(`apontamento:${a.id}`, {
        fonte: 'apontamento',
        chamado: a.nro_chamado ?? null,
        tarefa: a.nro_tarefa ?? null,
        data: a.data_atividade ?? null,
        grupo: a.grupo_tarefa ?? null,
        itemConfiguracao: a.item_configuracao ?? null,
        analista: a.analista_tarefa ?? null,
        solicitante: a.solicitante ?? null,
        descricaoTarefa: a.descricao_tarefa ?? null,
        descricaoChamado: chamado?.descricao ?? null,
        solucaoChamado: chamado?.solucao ?? null,
      });
    }
    for (const t of tickets) {
      mapa.set(`ticket:${t.id}`, {
        fonte: 'ticket',
        chamado: t.nro_solicitacao ?? null,
        tarefa: null,
        data: t.data_solucao ?? t.data_fechamento ?? null,
        grupo: t.nome_grupo ?? null,
        itemConfiguracao: t.item_configuracao ?? null,
        analista: t.nome_responsavel ?? null,
        solicitante: t.solicitante ?? null,
        descricaoTarefa: null,
        descricaoChamado: t.descricao ?? null,
        solucaoChamado: t.solucao ?? null,
      });
    }
    return mapa;
  }
}

export const controleSaldoParcialService = new ControleSaldoParcialService();
