/**
 * Aba Histórico do Controle (Modelagem_Fase3.md, seção 7; decisão de 23/10/2026):
 * a auditoria das alterações do banco, as versões de cada mês fechado (geração
 * do Book e retificações) e as transferências de consumo entre bancos. O mês
 * aberto não tem versões: é calculado na hora.
 */

import { supabase } from '@/integrations/supabase/client';
import { falhaDoBanco } from '@/errors/erroTraduzivel';
import type { EventoHistorico } from '@/types/controleBancoHoras';

type Cliente = typeof supabase;
type Linha = Record<string, any>;

/** Até onde a aba volta na auditoria */
const LIMITE_ALTERACOES = 500;

const falha = falhaDoBanco;

export class ControleHistoricoService {
  constructor(private readonly cliente: Cliente = supabase) {}

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

  async historico(bancoId: string): Promise<EventoHistorico[]> {
    const [auditoria, fechamentos] = await Promise.all([
      this.cliente
        .from('auditoria_alteracoes')
        .select('*')
        .eq('banco_id', bancoId)
        // O fechamento entra como versão, com o resultado do mês
        .neq('tabela', 'bancos_horas_fechamentos')
        .order('created_at', { ascending: false })
        .limit(LIMITE_ALTERACOES),
      this.cliente.from('bancos_horas_fechamentos').select('*').eq('banco_id', bancoId),
    ]);
    const erro = auditoria.error ?? fechamentos.error;
    if (erro) throw falha('carregar o histórico', erro);

    const proprios = fechamentos.data as Linha[];
    const transferencias = await this.transferencias(proprios);
    const nomes = await this.nomes([
      ...(auditoria.data as Linha[]).map((a) => a.usuario_id),
      ...proprios.map((f) => f.fechado_por),
    ]);
    const nome = (id: string | null) => (id ? (nomes.get(id) ?? null) : null);

    const eventos: EventoHistorico[] = [
      ...(auditoria.data as Linha[]).map((a): EventoHistorico => ({
        tipo: 'alteracao',
        id: String(a.id),
        em: a.created_at,
        usuarioId: a.usuario_id ?? null,
        usuario: nome(a.usuario_id),
        tabela: a.tabela,
        acao: a.acao,
        campos: a.campos_alterados ?? [],
        antes: a.dados_antes ?? null,
        depois: a.dados_depois ?? null,
        motivo: a.motivo ?? null,
        origem: a.origem,
      })),
      ...proprios.map((f): EventoHistorico => ({
        tipo: 'versao',
        id: f.id,
        em: f.fechado_em,
        usuarioId: f.fechado_por ?? null,
        usuario: nome(f.fechado_por),
        mes: { mes: f.mes, ano: f.ano },
        versao: f.versao,
        vigente: f.vigente,
        motivo: f.motivo,
        saldoFinalMinutos: f.saldo_final_minutos ?? null,
        saldoFinalTickets: f.saldo_final_tickets ?? null,
        excedenteMinutos: f.excedente_minutos ?? null,
      })),
      ...transferencias,
    ];
    return eventos.sort((a, b) => b.em.localeCompare(a.em));
  }

  /** Consumo entre bancos nos fechamentos do banco, com o nome do outro lado */
  private async transferencias(proprios: Linha[]): Promise<EventoHistorico[]> {
    if (proprios.length === 0) return [];
    const ids = proprios.map((f) => f.id);
    const [cedidas, consumidas] = await Promise.all([
      this.cliente.from('bancos_horas_transferencias').select('*').in('fechamento_cedente_id', ids),
      this.cliente
        .from('bancos_horas_transferencias')
        .select('*')
        .in('fechamento_consumidor_id', ids),
    ]);
    const erro = cedidas.error ?? consumidas.error;
    if (erro) throw falha('carregar o consumo entre bancos', erro);

    const linhas = [
      ...(cedidas.data as Linha[]).map((t) => ({ t, papel: 'cedeu' as const })),
      ...(consumidas.data as Linha[]).map((t) => ({ t, papel: 'consumiu' as const })),
    ];
    if (linhas.length === 0) return [];

    const outrosIds = linhas.map(({ t, papel }) =>
      papel === 'cedeu' ? t.fechamento_consumidor_id : t.fechamento_cedente_id
    );
    const { data: outros, error } = await this.cliente
      .from('bancos_horas_fechamentos')
      .select('id, nome_banco')
      .in('id', [...new Set(outrosIds)]);
    if (error) throw falha('carregar o consumo entre bancos', error);
    const nomeDoOutro = new Map((outros as Linha[]).map((f) => [f.id, f.nome_banco]));
    const doMes = new Map(proprios.map((f) => [f.id, { mes: f.mes, ano: f.ano }]));

    return linhas.map(({ t, papel }) => {
      const proprio = papel === 'cedeu' ? t.fechamento_cedente_id : t.fechamento_consumidor_id;
      const outro = papel === 'cedeu' ? t.fechamento_consumidor_id : t.fechamento_cedente_id;
      return {
        tipo: 'transferencia',
        id: t.id,
        em: t.created_at,
        mes: doMes.get(proprio)!,
        unidade: t.unidade,
        quantidade: t.quantidade,
        papel,
        outroBanco: nomeDoOutro.get(outro) ?? '',
      };
    });
  }
}

export const controleHistoricoService = new ControleHistoricoService();
