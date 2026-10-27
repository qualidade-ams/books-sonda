/**
 * Regras da tela Controle de Banco de Horas que não dependem de componente: o resultado de
 * cada banco no quadro calculado, a situação de cada mês e o mês de referência do período.
 */

import { chaveMes, type QuadroEmpresa } from '@/services/controleBancoHorasService';
import { situacaoDoMes, type SituacaoMes } from '@/services/bancosHoras/periodos';
import type { MesAno, TipoContrato, Unidade } from '@/services/bancosHoras/calculo';
import type {
  BancoCadastro,
  ResultadoBancoMes,
  ResultadoUnidade,
} from '@/services/bancosHoras/motorBancosHoras';
import { formatarHoras } from '@/components/ds/horas';
import type { Exportacao, Traduzir, ValorCelula } from '@/utils/exportarTabela';
import type { AjusteRequerimento, RequerimentoControle } from '@/types/controleBancoHoras';

/** A unidade que a tela mostra primeiro: tickets só no banco de tickets */
export const unidadePrincipal = (tipo: TipoContrato): Unidade =>
  tipo === 'tickets' ? 'tickets' : 'horas';

export const resultadoDoBanco = (
  quadro: QuadroEmpresa,
  mes: MesAno,
  bancoId: string
): ResultadoBancoMes | undefined =>
  quadro[chaveMes(mes)]?.bancos.find((b) => b.bancoId === bancoId);

export interface MesDoQuadro {
  mes: MesAno;
  chave: string;
  situacao: SituacaoMes;
  resultado: ResultadoBancoMes | undefined;
}

/** Os meses do período com a situação: fechado pelo resultado congelado; depois de hoje, futuro */
export const mesesComSituacao = (
  meses: MesAno[],
  quadro: QuadroEmpresa,
  bancoId: string,
  hoje: MesAno
): MesDoQuadro[] =>
  meses.map((mes) => {
    const resultado = resultadoDoBanco(quadro, mes, bancoId);
    return {
      mes,
      chave: chaveMes(mes),
      situacao: situacaoDoMes(mes, hoje, !!resultado?.fechado),
      resultado,
    };
  });

/** O mês aberto; sem aberto, o último fechado; sem nenhum, o primeiro */
export function indiceReferencia(meses: Pick<MesDoQuadro, 'situacao'>[]): number {
  const aberto = meses.findIndex((m) => m.situacao === 'aberto');
  if (aberto >= 0) return aberto;
  for (let i = meses.length - 1; i >= 0; i--) if (meses[i].situacao === 'fechado') return i;
  return 0;
}

/** Mês abreviado no idioma, com a primeira maiúscula e sem ponto: "Ago", "Aug", "Ene" */
function mesCurto(mes: number, idioma: string): string {
  const texto = new Intl.DateTimeFormat(idioma, { month: 'short', timeZone: 'UTC' })
    .format(new Date(Date.UTC(2026, mes - 1, 1)))
    .replace('.', '');
  return texto.charAt(0).toUpperCase() + texto.slice(1, 3);
}

/** "Ago/2026" no idioma da tela */
export const rotuloMesLocal = (m: MesAno, idioma: string) => `${mesCurto(m.mes, idioma)}/${m.ano}`;

/** "Jul – Set/2026"; atravessando o ano, "Nov/2026 – Jan/2027"; um mês só, "Out/2026" */
export function rotuloPeriodoLocal(meses: MesAno[], idioma: string): string {
  const primeiro = meses[0];
  const ultimo = meses[meses.length - 1];
  if (meses.length === 1) return rotuloMesLocal(primeiro, idioma);
  if (primeiro.ano === ultimo.ano)
    return `${mesCurto(primeiro.mes, idioma)} – ${rotuloMesLocal(ultimo, idioma)}`;
  return `${rotuloMesLocal(primeiro, idioma)} – ${rotuloMesLocal(ultimo, idioma)}`;
}

/**
 * Escolhas de banco da aba Requerimentos → ajustes a gravar. Só entra o que muda o banco;
 * escolher o banco do módulo tira o ajuste (bancoId nulo).
 */
export function ajustesDosRequerimentos(
  requerimentos: Pick<RequerimentoControle, 'id' | 'bancoId' | 'bancoAutomaticoId'>[],
  escolhas: Record<string, string>
): AjusteRequerimento[] {
  const vistos = new Set<string>();
  return requerimentos.flatMap((r) => {
    const escolhido = escolhas[r.id];
    if (vistos.has(r.id) || escolhido === undefined || escolhido === r.bancoId) return [];
    vistos.add(r.id);
    return [
      { requerimentoId: r.id, bancoId: escolhido === r.bancoAutomaticoId ? null : escolhido },
    ];
  });
}

/** Campos de controle que toda alteração muda; não interessam no histórico */
const CAMPOS_DE_CONTROLE = new Set(['created_at', 'created_by', 'updated_at', 'updated_by']);

export const valorTexto = (v: unknown) =>
  v === null || v === undefined || v === ''
    ? '—'
    : typeof v === 'object'
      ? JSON.stringify(v)
      : String(v);

/** O que mudou numa alteração auditada: antes → depois de cada campo */
export function camposAlterados(evento: {
  campos: string[];
  antes: Record<string, unknown> | null;
  depois: Record<string, unknown> | null;
}): { campo: string; antes: string; depois: string }[] {
  if (!evento.antes || !evento.depois) return [];
  return evento.campos
    .filter((campo) => !CAMPOS_DE_CONTROLE.has(campo))
    .map((campo) => ({
      campo,
      antes: valorTexto(evento.antes[campo]),
      depois: valorTexto(evento.depois[campo]),
    }));
}

type CampoQuadro = keyof Pick<
  ResultadoUnidade,
  | 'baseline'
  | 'repasseAnterior'
  | 'saldoAUtilizar'
  | 'consumo'
  | 'requerimentos'
  | 'reajustes'
  | 'consumoTotal'
  | 'saldo'
  | 'repasse'
  | 'consumidoDeOutros'
  | 'cedidoAOutros'
  | 'saldoFinal'
  | 'excedente'
  | 'valorExcedente'
>;

/** Linhas do quadro na ordem da tela: campo do resultado → rótulo em controleBancoHoras.quadro */
const LINHAS_QUADRO: [CampoQuadro, string][] = [
  ['baseline', 'baseline'],
  ['repasseAnterior', 'repasseAnterior'],
  ['saldoAUtilizar', 'disponivel'],
  ['consumo', 'chamados'],
  ['requerimentos', 'requerimentos'],
  ['reajustes', 'reajustes'],
  ['consumoTotal', 'consumoTotal'],
  ['saldo', 'saldo'],
  ['repasse', 'repasse'],
];

export interface BancoParaExportar {
  banco: Pick<BancoCadastro, 'nome' | 'tipoContrato'>;
  meses: MesDoQuadro[];
}

type LinhaQuadro = { rotulo: string; valores: Record<string, ValorCelula> };

/**
 * Exportação do Controle: uma aba por banco, com as linhas do quadro como na tela e os meses
 * do período nas colunas. Banco de horas e tickets traz as duas unidades, uma depois da outra.
 */
export function exportacaoControle(
  empresa: string,
  bancos: BancoParaExportar[],
  t: Traduzir,
  idioma: string
): Exportacao {
  const q = (chave: string, valores?: Record<string, unknown>) =>
    t(`controleBancoHoras.quadro.${chave}`, valores);

  const linhasDoBanco = ({ banco, meses }: BancoParaExportar): LinhaQuadro[] => {
    const unidades: Unidade[] =
      banco.tipoContrato === 'ambos'
        ? ['horas', 'tickets']
        : [unidadePrincipal(banco.tipoContrato)];
    const ref = meses[indiceReferencia(meses)];
    return unidades.flatMap((unidade) => {
      const doMes = (m: MesDoQuadro) => m.resultado?.[unidade] ?? null;
      const algum = (campo: CampoQuadro) => meses.some((m) => (doMes(m)?.[campo] ?? 0) !== 0);
      // No Excel o sinal de menos tipográfico da tela atrapalha; vai o hífen
      const formatar = (n: number, sinal: 'auto' | 'sempre') =>
        unidade === 'horas' ? formatarHoras(n, { sinal }).replace('−', '-') : n;
      const linha = (campo: CampoQuadro, rotulo: string): LinhaQuadro => ({
        rotulo: unidades.length > 1 ? `${rotulo} · ${q(unidade)}` : rotulo,
        valores: Object.fromEntries(
          meses.map((m) => {
            const u = doMes(m);
            if (!u) return [m.chave, ''];
            if (campo === 'valorExcedente') return [m.chave, u.valorExcedente || ''];
            return [m.chave, formatar(u[campo], campo === 'reajustes' ? 'sempre' : 'auto')];
          })
        ),
      });

      const linhas = LINHAS_QUADRO.map(([campo, chave]) =>
        linha(
          campo,
          chave === 'repasse' ? q(chave, { n: ref?.resultado?.percentualRepasse ?? 0 }) : q(chave)
        )
      );
      if (algum('consumidoDeOutros'))
        linhas.push(linha('consumidoDeOutros', q('consumidoDeOutros')));
      if (algum('cedidoAOutros')) linhas.push(linha('cedidoAOutros', q('cedidoAOutros')));
      if (algum('consumidoDeOutros') || algum('cedidoAOutros'))
        linhas.push(linha('saldoFinal', q('saldoFinal')));
      if (meses.some((m) => (doMes(m)?.excedente ?? 0) > 0))
        linhas.push(linha('excedente', q('excedente')), linha('valorExcedente', q('valorFaturar')));
      return linhas;
    });
  };

  return {
    arquivo: t('controleBancoHoras.exportar.arquivo', { empresa }),
    titulo: t('controleBancoHoras.exportar.titulo', { empresa }),
    abas: bancos.map((b) => ({
      nome: b.banco.nome,
      linhas: linhasDoBanco(b),
      colunas: [
        { rotulo: t('controleBancoHoras.exportar.linha'), valor: (l: LinhaQuadro) => l.rotulo },
        ...b.meses.map((m) => ({
          rotulo: rotuloMesLocal(m.mes, idioma),
          valor: (l: LinhaQuadro) => l.valores[m.chave],
        })),
      ],
    })),
  };
}
