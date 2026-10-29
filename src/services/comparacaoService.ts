/**
 * Comparação Legado x Novo (Modelagem_Fase4.md, seções 5 e 9). A rotina do modo
 * sombra (sync-api) grava os resultados; a tela lê, valida pela função
 * validar_comparacao (migration 24) e pede ao sync-api para recalcular uma empresa.
 *
 * Fase 5 (Modelagem_Fase5.md, seção 3): libera a empresa com o fechamento de transição
 * (liberar_empresa, migration 27) e a volta para o legado (voltar_para_legado).
 */

import { supabase } from '@/integrations/supabase/client';
import { falhaDoBanco } from '@/errors/erroTraduzivel';
import { chamarSyncApi } from '@/services/syncAgendamentosService';
import type { MesAno } from '@/services/bancosHoras/calculo';
import type { PayloadFechamento } from '@/services/bancosHoras/fechamento';
import { montarTransicao } from '@/services/bancosHoras/liberacao';
import {
  criarRepositorioSupabase,
  type ClienteSupabase,
} from '@/services/bancosHoras/repositorioSupabase';
import { criarRepositorioSombra } from '@/services/bancosHoras/repositorioSombra';
import type { ComparacaoEmpresa, LancamentosParaLegado, MesComparacao } from '@/types/comparacao';

type Cliente = typeof supabase;
type ErroBanco = { message: string; code?: string };
type Linha = Record<string, any>;
type MontarTransicao = (empresaId: string) => Promise<PayloadFechamento | null>;

const falha = falhaDoBanco;

const umOuNulo = <T>(valor: T | T[] | null | undefined): T | null =>
  Array.isArray(valor) ? (valor[0] ?? null) : (valor ?? null);
const numero = (v: unknown) => (v === null || v === undefined ? 0 : Number(v));
const indice = (m: Linha) => m.ano * 12 + (m.mes - 1);
const mesDoIndice = (i: number): MesAno => ({ mes: (i % 12) + 1, ano: Math.floor(i / 12) });

export class ComparacaoService {
  constructor(
    private readonly cliente: Cliente = supabase,
    private readonly transicao: MontarTransicao = (empresaId) => {
      const db = cliente as unknown as ClienteSupabase;
      return montarTransicao(criarRepositorioSupabase(db), criarRepositorioSombra(db), empresaId);
    }
  ) {}

  private async consultar(promessa: PromiseLike<{ data: unknown; error: ErroBanco | null }>) {
    const { data, error } = await promessa;
    if (error) throw falha('carregar a comparação', error);
    return (data ?? []) as Linha[];
  }

  /** Nome de cada usuário pelo id; sem permissão, nenhum */
  private async nomes(ids: (string | null)[]): Promise<Map<string, string>> {
    const unicos = [...new Set(ids.filter(Boolean))] as string[];
    if (unicos.length === 0) return new Map();
    try {
      const { data, error } = await this.cliente.rpc('perfis_resumo', {
        p_ids: unicos,
        p_emails: null,
      });
      if (error) return new Map();
      return new Map((data ?? []).filter((p) => p.full_name).map((p) => [p.id, p.full_name]));
    } catch {
      return new Map();
    }
  }

  async listar(): Promise<ComparacaoEmpresa[]> {
    const linhas = await this.consultar(
      this.cliente
        .from('bancos_horas_comparacao')
        .select(
          '*, empresas(nome_abreviado, modelo_calculo, modelo_alterado_em, modelo_alterado_por, bancos_horas(id, ativo))'
        )
    );
    const empresaDa = (l: Linha) => umOuNulo(l.empresas) as Linha | null;
    const liberadas = linhas.filter((l) => empresaDa(l)?.modelo_calculo === 'multiplo');
    const [nomes, desde] = await Promise.all([
      this.nomes([
        ...linhas.map((l) => l.validada_por),
        ...liberadas.map((l) => empresaDa(l).modelo_alterado_por),
      ]),
      this.desde(
        liberadas.map((l) => ({ empresaId: l.empresa_id, bancos: empresaDa(l).bancos_horas ?? [] }))
      ),
    ]);

    return linhas
      .map((l): ComparacaoEmpresa => {
        const empresa = empresaDa(l);
        return {
          empresaId: l.empresa_id,
          empresa: empresa?.nome_abreviado ?? '',
          bancosAtivos: (empresa?.bancos_horas ?? []).filter((b: Linha) => b.ativo).length,
          situacao: l.situacao ?? null,
          mesesComparados: numero(l.meses_comparados),
          consumoLegadoMinutos: numero(l.consumo_legado_minutos),
          consumoNovoMinutos: numero(l.consumo_novo_minutos),
          consumoLegadoTickets: numero(l.consumo_legado_tickets),
          consumoNovoTickets: numero(l.consumo_novo_tickets),
          calculadoEm: l.calculado_em ?? null,
          erro: l.erro ?? null,
          erroEm: l.erro_em ?? null,
          validacao: l.validada_em
            ? {
                por: nomes.get(l.validada_por) ?? null,
                em: l.validada_em,
                situacao: l.validacao_situacao,
              }
            : null,
          liberacao:
            empresa?.modelo_calculo === 'multiplo'
              ? {
                  por: nomes.get(empresa.modelo_alterado_por) ?? null,
                  em: empresa.modelo_alterado_em ?? null,
                  desde: desde.get(l.empresa_id) ?? null,
                }
              : null,
        };
      })
      .sort((a, b) => a.empresa.localeCompare(b.empresa, 'pt-BR'));
  }

  /** Primeiro mês pelo modelo novo: o seguinte à última transição de cada empresa liberada */
  private async desde(
    empresas: { empresaId: string; bancos: Linha[] }[]
  ): Promise<Map<string, MesAno>> {
    const empresaDoBanco = new Map<string, string>();
    for (const e of empresas) for (const b of e.bancos) empresaDoBanco.set(b.id, e.empresaId);
    if (empresaDoBanco.size === 0) return new Map();
    const transicoes = await this.consultar(
      this.cliente
        .from('bancos_horas_fechamentos')
        .select('banco_id, mes, ano')
        .in('banco_id', [...empresaDoBanco.keys()])
        .eq('motivo', 'transicao')
    );
    const ultima = new Map<string, number>();
    for (const t of transicoes) {
      const e = empresaDoBanco.get(t.banco_id);
      if (e) ultima.set(e, Math.max(ultima.get(e) ?? -1, indice(t)));
    }
    return new Map([...ultima].map(([e, i]) => [e, mesDoIndice(i + 1)]));
  }

  async meses(empresaId: string): Promise<MesComparacao[]> {
    const linhas = await this.consultar(
      this.cliente
        .from('bancos_horas_comparacao_meses')
        .select('*')
        .eq('empresa_id', empresaId)
        .order('ano')
        .order('mes')
    );
    return linhas
      .map((l): MesComparacao => ({
        mes: { mes: l.mes, ano: l.ano },
        situacao: l.situacao,
        legado: l.legado,
        novo: l.novo,
        origemSaldo: l.origem_saldo ?? null,
        itens: l.itens ?? [],
        itensTotal: numero(l.itens_total),
        fechamentoLegadoEm: l.fechamento_legado_em,
      }))
      .sort((a, b) => a.mes.ano * 12 + a.mes.mes - (b.mes.ano * 12 + b.mes.mes));
  }

  /** Marca (true) ou desfaz (false, com motivo) a validação da empresa */
  async validar(empresaId: string, validar: boolean, motivo?: string): Promise<void> {
    const { error } = await this.cliente.rpc('validar_comparacao', {
      p_empresa_id: empresaId,
      p_validar: validar,
      p_motivo: motivo?.trim() || null,
    });
    if (error) throw falha('validar a comparação', error);
  }

  /** Grava o modelo novo e o fechamento de transição (o último mês fechado no legado) */
  async liberar(empresaId: string): Promise<void> {
    const transicao = await this.transicao(empresaId);
    // O payload do fechamento não cabe no tipo Json gerado; o cliente do motor aceita
    const { error } = await (this.cliente as unknown as ClienteSupabase).rpc('liberar_empresa', {
      p_empresa_id: empresaId,
      p_fechamento: transicao,
    });
    if (error) throw falha('liberar a empresa', error);
  }

  /** Quantos reajustes e observações do Controle novo a volta copia para o legado */
  async lancamentosParaLegado(empresaId: string): Promise<LancamentosParaLegado> {
    const { data, error } = await this.cliente.rpc('lancamentos_para_legado', {
      p_empresa_id: empresaId,
    });
    if (error) throw falha('carregar os lançamentos do Controle novo', error);
    const r = (data ?? {}) as Linha;
    return { reajustes: numero(r.reajustes), observacoes: numero(r.observacoes) };
  }

  async voltar(empresaId: string, motivo: string): Promise<void> {
    const { error } = await this.cliente.rpc('voltar_para_legado', {
      p_empresa_id: empresaId,
      p_motivo: motivo.trim(),
    });
    if (error) throw falha('voltar a empresa para o legado', error);
  }

  /** Pede ao sync-api para comparar a empresa de novo; o resultado chega em calculado_em */
  async recalcular(empresaId: string): Promise<void> {
    await chamarSyncApi('/api/comparacao/recalcular', { empresaId });
  }
}

export const comparacaoService = new ComparacaoService();
