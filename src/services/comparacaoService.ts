/**
 * Comparação Legado x Novo (Modelagem_Fase4.md, seções 5 e 9). A rotina do modo
 * sombra (sync-api) grava os resultados; a tela lê, valida pela função
 * validar_comparacao (migration 24) e pede ao sync-api para recalcular uma empresa.
 */

import { supabase } from '@/integrations/supabase/client';
import { falhaDoBanco } from '@/errors/erroTraduzivel';
import { chamarSyncApi } from '@/services/syncAgendamentosService';
import type { ComparacaoEmpresa, MesComparacao } from '@/types/comparacao';

type Cliente = typeof supabase;
type ErroBanco = { message: string; code?: string };
type Linha = Record<string, any>;

const falha = falhaDoBanco;

const umOuNulo = <T>(valor: T | T[] | null | undefined): T | null =>
  Array.isArray(valor) ? (valor[0] ?? null) : (valor ?? null);
const numero = (v: unknown) => (v === null || v === undefined ? 0 : Number(v));

export class ComparacaoService {
  constructor(private readonly cliente: Cliente = supabase) {}

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
        .select('*, empresas(nome_abreviado, bancos_horas(ativo))')
    );
    const nomes = await this.nomes(linhas.map((l) => l.validada_por));

    return linhas
      .map((l): ComparacaoEmpresa => {
        const empresa = umOuNulo(l.empresas) as Linha | null;
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
        };
      })
      .sort((a, b) => a.empresa.localeCompare(b.empresa, 'pt-BR'));
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

  /** Pede ao sync-api para comparar a empresa de novo; o resultado chega em calculado_em */
  async recalcular(empresaId: string): Promise<void> {
    await chamarSyncApi('/api/comparacao/recalcular', { empresaId });
  }
}

export const comparacaoService = new ComparacaoService();
