/**
 * Regras da aba Bancos de Horas da tela Empresas que não dependem de componente: vigências,
 * escopo em árvore, conflitos com os outros bancos (RN-05) e quem pode ceder saldo (RN-19).
 */

import type {
  BancoCadastro,
  EscopoBancoCadastro,
  ParametrosBanco,
  TipoContrato,
} from '@/types/bancosHorasCadastro';

/** produtoId → 'todos' (produto inteiro, inclusive módulos futuros) ou ids dos módulos */
export type SelecaoEscopo = Record<string, 'todos' | string[]>;

/** "AAAA-MM-DD" do banco → "AAAA-MM" do campo mês */
export const paraMes = (data: string | null) => (data ? data.slice(0, 7) : '');
/** "AAAA-MM" do campo mês → dia 1 do mês, como as vigências exigem */
export const deMes = (mes: string) => (mes ? `${mes}-01` : null);
/** Mês para exibir: "MM/AAAA" */
export const mesTexto = (data: string | null) =>
  data ? `${data.slice(5, 7)}/${data.slice(0, 4)}` : '';

/** A vigência aberta; se nenhuma está aberta, a que começou por último */
export function vigente<T extends { dataInicio: string; dataFim: string | null }>(
  lista: T[]
): T | undefined {
  const porInicio = [...lista].sort((a, b) => b.dataInicio.localeCompare(a.dataInicio));
  return porInicio.find((v) => v.dataFim === null) ?? porInicio[0];
}

export function selecaoDoEscopo(escopo: EscopoBancoCadastro[]): SelecaoEscopo {
  const s: SelecaoEscopo = {};
  for (const e of escopo) {
    if (e.moduloId === null) s[e.produtoId] = 'todos';
    else if (s[e.produtoId] !== 'todos')
      s[e.produtoId] = [...((s[e.produtoId] as string[]) ?? []), e.moduloId];
  }
  return s;
}

export const escopoDaSelecao = (s: SelecaoEscopo): EscopoBancoCadastro[] =>
  Object.entries(s).flatMap(([produtoId, v]) =>
    v === 'todos' ? [{ produtoId, moduloId: null }] : v.map((moduloId) => ({ produtoId, moduloId }))
  );

/** "produtoId|*" (produto inteiro) ou "produtoId|moduloId" → nome do outro banco ativo que já cobre */
export function cobertosPorOutros(
  bancos: BancoCadastro[],
  bancoId: string | null
): Record<string, string> {
  const cobertos: Record<string, string> = {};
  for (const b of bancos) {
    if (b.id === bancoId || !b.ativo || b.padrao) continue;
    for (const e of b.escopo) cobertos[`${e.produtoId}|${e.moduloId ?? '*'}`] = b.nome;
  }
  return cobertos;
}

/** Outros bancos ativos e por que não podem ceder saldo (null = pode) */
export const elegiveisParaConsumo = (
  bancos: BancoCadastro[],
  bancoId: string | null,
  tipo: TipoContrato,
  periodo: number
) =>
  bancos
    .filter((b) => b.id !== bancoId && b.ativo)
    .map((b) => ({
      banco: b,
      motivo:
        b.tipoContrato !== tipo
          ? ('tipo' as const)
          : b.periodoApuracao !== periodo
            ? ('periodo' as const)
            : null,
    }));

/** Parâmetros de um banco novo; o primeiro banco da empresa é o padrão */
export const novoBanco = (bancos: BancoCadastro[], inicioVigencia: string): ParametrosBanco => ({
  nome: '',
  descricao: null,
  padrao: bancos.length === 0,
  tipoContrato: 'horas',
  periodoApuracao: 1,
  inicioVigencia,
  fimVigencia: null,
  diaInicioApuracao: 1,
  diaFimApuracao: 0,
  taxaProduto: 'OUTROS',
  taxaTipoHora: 'excedente',
  repasseEspecial: 'nenhum',
  duracaoPeriodoMeses: null,
  periodosAteZerar: null,
  consomeOutrosBancos: false,
  filtroIc: null,
  escopo: [],
});

export const parametrosDoBanco = (b: BancoCadastro): ParametrosBanco => ({
  nome: b.nome,
  descricao: b.descricao,
  padrao: b.padrao,
  tipoContrato: b.tipoContrato,
  periodoApuracao: b.periodoApuracao,
  inicioVigencia: b.inicioVigencia,
  fimVigencia: b.fimVigencia,
  diaInicioApuracao: b.diaInicioApuracao,
  diaFimApuracao: b.diaFimApuracao,
  taxaProduto: b.taxaProduto,
  taxaTipoHora: b.taxaTipoHora,
  repasseEspecial: b.repasseEspecial,
  duracaoPeriodoMeses: b.duracaoPeriodoMeses,
  periodosAteZerar: b.periodosAteZerar,
  consomeOutrosBancos: b.consomeOutrosBancos,
  filtroIc: b.filtroIc,
  escopo: b.escopo,
});
