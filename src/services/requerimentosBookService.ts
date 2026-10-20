/**
 * Requerimentos exibidos nas abas do book (Requerimentos em Desenvolvimento e
 * Requerimentos Faturados): consulta e formatação de cada linha da tabela.
 */

import { supabase } from '@/integrations/supabase/client';
import type { RequerimentoEmDesenvolvimentoData } from '@/types/books';

/** Status que contam como requerimento faturado no mês (mesma regra dos Requerimentos Descontados do Consumo) */
const STATUS_FATURADOS = ['enviado_faturamento', 'faturado', 'concluido'];

/** Converte horas do requerimento (decimal ou "HH:MM") em minutos */
function paraMinutos(valor: string | number | null | undefined): number {
  if (!valor) return 0;
  if (typeof valor === 'string' && valor.includes(':')) {
    const [h, m] = valor.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  }
  return Math.round((Number(valor) || 0) * 60);
}

function formatarMinutos(minutos: number): string {
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** "2026-06-11" → "11/06/2026" (parse manual para evitar o problema de timezone de +1 dia) */
function formatarData(data: string | null | undefined): string {
  if (!data) return '--';
  const [ano, mes, dia] = data.split('-');
  return `${dia}/${mes}/${ano}`;
}

export function formatarRequerimentoParaBook(
  req: Record<string, any>,
  opcoes: { nomeCliente: string; ticketExterno: string; status: string }
): RequerimentoEmDesenvolvimentoData {
  const minutosFuncional = paraMinutos(req.horas_funcional);
  const minutosTecnico = paraMinutos(req.horas_tecnico);

  return {
    id: req.id,
    numero_chamado: req.chamado || '--',
    ticket_externo: opcoes.ticketExterno,
    cliente: opcoes.nomeCliente,
    modulo: req.modulo || '--',
    descricao: req.descricao || '',
    tipo_cobranca: req.tipo_cobranca || '--',
    horas_funcional: formatarMinutos(minutosFuncional),
    horas_tecnica: formatarMinutos(minutosTecnico),
    total_horas: formatarMinutos(minutosFuncional + minutosTecnico),
    data_envio: formatarData(req.data_envio),
    status: opcoes.status,
    valor_total:
      (Number(req.valor_total_funcional) || 0) + (Number(req.valor_total_tecnico) || 0) ||
      undefined,
    periodo_cobranca: req.mes_cobranca || undefined,
  };
}

/** Ticket externo (Aranda) de cada chamado, pelo número sem o prefixo "RF-" */
async function buscarTicketsExternos(chamados: string[]): Promise<Record<string, string>> {
  const numeros = chamados.map((chamado) => (chamado || '').replace('RF-', '')).filter(Boolean);
  if (numeros.length === 0) return {};

  const { data } = await supabase
    .from('apontamentos_tickets_aranda')
    .select('nro_solicitacao, ticket_externo')
    .in('nro_solicitacao', numeros);

  const mapa: Record<string, string> = {};
  (data || []).forEach((t) => {
    if (t.nro_solicitacao && t.ticket_externo) {
      mapa[t.nro_solicitacao] = t.ticket_externo.trim();
    }
  });
  return mapa;
}

/**
 * Requerimentos de Banco de Horas faturados com mês de cobrança igual ao mês do book.
 * Lança o erro da consulta (quem chama decide o fallback).
 */
export async function buscarRequerimentosFaturadosParaBook(
  empresaId: string,
  mes: number,
  ano: number
): Promise<RequerimentoEmDesenvolvimentoData[]> {
  const mesCobranca = `${String(mes).padStart(2, '0')}/${ano}`;

  const { data: requerimentos, error } = await supabase
    .from('requerimentos')
    .select('*')
    .eq('cliente_id', empresaId)
    .eq('mes_cobranca', mesCobranca)
    .eq('tipo_cobranca', 'Banco de Horas')
    .in('status', STATUS_FATURADOS)
    .order('chamado', { ascending: true });

  if (error) throw error;
  if (!requerimentos || requerimentos.length === 0) return [];

  const ticketsExternos = await buscarTicketsExternos(requerimentos.map((req) => req.chamado));

  const { data: empresa } = await supabase
    .from('empresas_clientes')
    .select('nome_abreviado')
    .eq('id', empresaId)
    .single();
  const nomeCliente = empresa?.nome_abreviado || '--';

  return requerimentos.map((req) =>
    formatarRequerimentoParaBook(req, {
      nomeCliente,
      ticketExterno: ticketsExternos[(req.chamado || '').replace('RF-', '')] || '',
      status: 'Faturado',
    })
  );
}
