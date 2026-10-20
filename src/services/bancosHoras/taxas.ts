/**
 * Taxas do excedente (RC-71 a RC-77, 9.3-1b; Modelagem_Fase2.md seção 5). Funções puras.
 *
 * Mudanças em relação ao cálculo atual:
 *   - a tabela de taxa é a do produto do banco (taxa_produto), não a mais recente de qualquer produto
 *   - a taxa do ticket vale também para contrato "ambos" (corrige RC-74)
 *   - a média do modo "média" é arredondada a 2 casas, a mesma taxa exibida e usada
 */

import type { MesAno, Unidade } from './calculo';

export interface FuncaoTaxa {
  funcao: string;
  valorBase: number;
  valorAdicional: number | null;
}

export interface TaxaCliente {
  id: string;
  /** YYYY-MM-DD */
  vigenciaInicio: string;
  tipoProduto: string;
  tipoCalculoAdicional: 'normal' | 'media' | null;
  valorTicketExcedente: number | null;
  ticketExcedente2: number | null;
  ticketExcedente: number | null;
  /** Valores da hora remota por função */
  funcoesRemotas: FuncaoTaxa[];
}

const FUNCOES_MEDIA = ['Funcional', 'Técnico (Instalação / Atualização)', 'ABAP - PL/SQL'];

const arredondar = (valor: number) => Math.round(valor * 100) / 100;
const preenchido = (valor: number | null | undefined): valor is number =>
  valor !== null && valor !== undefined && valor > 0;

/**
 * Tabela de taxa do mês: a do produto do banco com o início de vigência mais
 * recente até o dia 1 do mês. O fim de vigência é ignorado, como hoje (Q5).
 */
export function escolherTaxa(
  taxas: TaxaCliente[],
  m: MesAno,
  taxaProduto: string
): TaxaCliente | null {
  const dia = `${m.ano}-${String(m.mes).padStart(2, '0')}-01`;
  const candidatas = taxas
    .filter((t) => t.tipoProduto === taxaProduto && t.vigenciaInicio <= dia)
    .sort((a, b) => b.vigenciaInicio.localeCompare(a.vigenciaInicio));
  return candidatas[0] ?? null;
}

const horaExcedenteDaFuncao = (f: FuncaoTaxa) =>
  preenchido(f.valorAdicional) ? f.valorAdicional : arredondar(f.valorBase * 1.15);

/**
 * Taxa da hora. "excedente": hora adicional (RC-72). "normal": valor base da
 * função Funcional (9.3-1b, Banco padrão interno).
 */
export function taxaHora(taxa: TaxaCliente, tipoHora: 'excedente' | 'normal'): number | null {
  const funcional = taxa.funcoesRemotas.find((f) => f.funcao === 'Funcional');
  if (!funcional) return null;
  if (tipoHora === 'normal') return funcional.valorBase;

  if (preenchido(funcional.valorAdicional)) return funcional.valorAdicional;
  if (taxa.tipoCalculoAdicional === 'normal') return arredondar(funcional.valorBase * 1.15);

  const principais = taxa.funcoesRemotas.filter((f) => FUNCOES_MEDIA.includes(f.funcao));
  const soma = principais.reduce((s, f) => s + horaExcedenteDaFuncao(f), 0);
  return arredondar(soma / principais.length);
}

/** Taxa do ticket excedente: o primeiro campo preenchido (RC-73) */
export function taxaTicket(taxa: TaxaCliente): number | null {
  const valor = [taxa.valorTicketExcedente, taxa.ticketExcedente2, taxa.ticketExcedente].find(
    preenchido
  );
  return valor ?? null;
}

const formatarHoras = (minutos: number) =>
  `${Math.floor(minutos / 60)}:${String(minutos % 60).padStart(2, '0')}`;

/** Observação pública de faturamento, no texto atual (RC-36) */
export function descricaoFaturamento(
  quantidade: number,
  unidade: Unidade,
  m: MesAno,
  valor: number
): string {
  const periodo = `${String(m.mes).padStart(2, '0')}/${m.ano}`;
  const valorFormatado = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(valor);
  const qtd = unidade === 'horas' ? formatarHoras(quantidade) : String(quantidade);
  return `Excedente de ${qtd} ${unidade} no período ${periodo} - Valor: ${valorFormatado}`;
}

export const ALERTA_SEM_TAXA =
  'Taxa não encontrada para o período. Excedente não pode ser calculado.';
