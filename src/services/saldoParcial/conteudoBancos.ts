/**
 * Conteúdo do Saldo Parcial por banco (decisão de 26/10/2026): o HTML das tabelas do e-mail,
 * um bloco por banco, e o Excel com uma aba de resumo e uma aba por banco com os chamados.
 *
 * Os textos vêm de `t` no idioma do e-mail (o do template da empresa, não o da tela). O mês
 * que ainda não começou sai com a projeção do cálculo, marcado no cabeçalho.
 */

import * as XLSX from 'xlsx-js-style';
import { formatarHoras } from '@/components/ds/horas';
import {
  indiceReferencia,
  rotuloMesLocal,
  rotuloPeriodoLocal,
  type MesDoQuadro,
} from '@/utils/controleTela';
import type { Unidade } from '@/services/bancosHoras/calculo';
import type { ResultadoUnidade } from '@/services/bancosHoras/motorBancosHoras';
import type { ChamadoDoBanco, SaldoParcialBanco } from '@/services/controleSaldoParcialService';

type T = (chave: string, valores?: Record<string, unknown>) => string;

export interface OpcoesConteudo {
  t: T;
  idioma: string;
}

type Campo = keyof ResultadoUnidade;

const AZUL = '#1F497D';
const BORDA = '#D9D9D9';
const SEM_VALOR = '—';

const escapar = (texto: string | null | undefined) =>
  String(texto ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

const unidadesDo = (b: SaldoParcialBanco): Unidade[] =>
  b.tipoContrato === 'ambos'
    ? ['horas', 'tickets']
    : [b.tipoContrato === 'tickets' ? 'tickets' : 'horas'];

const quantidade = (u: Unidade, n: number, sinal?: 'sempre') =>
  u === 'horas'
    ? formatarHoras(n, { sinal })
    : sinal === 'sempre' && n > 0
      ? `+${n}`
      : n < 0
        ? `−${-n}`
        : String(n);

const referencia = (b: SaldoParcialBanco) => b.meses[indiceReferencia(b.meses)];

/** Mês da coluna; o que ainda não começou leva a marca de projetado */
const cabecalhoDoMes = (m: MesDoQuadro, { t, idioma }: OpcoesConteudo) => {
  const rotulo = rotuloMesLocal(m.mes, idioma);
  return m.situacao === 'futuro'
    ? `${rotulo} (${t('controleBancoHoras.quadro.projetado')})`
    : rotulo;
};

/** Linhas do quadro, as mesmas da tela, com o valor de cada mês (o futuro, projetado) */
function linhasDoQuadro(b: SaldoParcialBanco, u: Unidade, { t, idioma }: OpcoesConteudo) {
  const q = (chave: string, valores?: Record<string, unknown>) =>
    t(`controleBancoHoras.quadro.${chave}`, valores);
  const doMes = (m: MesDoQuadro) => m.resultado?.[u] ?? null;
  const algum = (campo: Campo) => b.meses.some((m) => Number(doMes(m)?.[campo] ?? 0) !== 0);
  const moeda = (v: number) =>
    new Intl.NumberFormat(idioma, { style: 'currency', currency: 'BRL' }).format(v);

  const linha = (
    campo: Campo,
    rotulo: string,
    sinal?: 'sempre',
    formato?: (n: number) => string
  ) => ({
    rotulo,
    valores: b.meses.map((m) => {
      const r = doMes(m);
      return r
        ? (formato ?? ((n: number) => quantidade(u, n, sinal)))(Number(r[campo]))
        : SEM_VALOR;
    }),
  });

  const linhas = [
    linha('baseline', q('baseline')),
    linha('repasseAnterior', q('repasseAnterior')),
    linha('saldoAUtilizar', q('disponivel')),
    linha('consumo', q('chamados')),
    linha('requerimentos', q('requerimentos')),
    linha('reajustes', q('reajustes'), 'sempre'),
    linha('consumoTotal', q('consumoTotal')),
    linha('saldo', q('saldo')),
    linha('repasse', q('repasse', { n: referencia(b)?.resultado?.percentualRepasse ?? 0 })),
  ];
  if (algum('consumidoDeOutros')) linhas.push(linha('consumidoDeOutros', q('consumidoDeOutros')));
  if (algum('cedidoAOutros')) linhas.push(linha('cedidoAOutros', q('cedidoAOutros')));
  if (algum('consumidoDeOutros') || algum('cedidoAOutros'))
    linhas.push(linha('saldoFinal', q('saldoFinal')));
  if (algum('excedente')) {
    linhas.push(linha('excedente', q('excedente')));
    linhas.push(linha('valorExcedente', q('valorFaturar'), undefined, moeda));
  }
  return linhas;
}

/* ------------------------------------------------------------------ */
/* HTML do e-mail                                                       */
/* ------------------------------------------------------------------ */

const estiloTabela = `border-collapse:collapse;width:100%;margin:8px 0 16px;font-family:Calibri,sans-serif;font-size:11pt;color:${AZUL};`;
const estiloTh = `background:${AZUL};color:#FFFFFF;border:1px solid ${AZUL};padding:6px 8px;font-weight:600;`;
const estiloTd = `border:1px solid ${BORDA};padding:6px 8px;`;
const estiloTitulo = `font-family:Calibri,sans-serif;color:${AZUL};font-size:12pt;font-weight:700;margin:16px 0 4px;`;

/** `direita`: as colunas de número, alinhadas à direita */
const tabelaHtml = (cabecalho: string[], linhas: string[][], direita: (i: number) => boolean) =>
  `<table style="${estiloTabela}"><thead><tr>${cabecalho
    .map(
      (c, i) =>
        `<th style="${estiloTh}text-align:${direita(i) ? 'right' : 'left'};">${escapar(c)}</th>`
    )
    .join('')}</tr></thead><tbody>${linhas
    .map(
      (l) =>
        `<tr>${l
          .map(
            (v, i) =>
              `<td style="${estiloTd}text-align:${direita(i) ? 'right' : 'left'};">${v}</td>`
          )
          .join('')}</tr>`
    )
    .join('')}</tbody></table>`;

function blocoHtml(
  b: SaldoParcialBanco,
  bancos: SaldoParcialBanco[],
  opcoes: OpcoesConteudo
): string {
  const { t, idioma } = opcoes;
  const s = (chave: string, valores?: Record<string, unknown>) =>
    t(`controleBancoHoras.saldoParcial.${chave}`, valores);
  const mesTexto = (m: { ano: number; mes: number }) => rotuloMesLocal(m, idioma);
  const unidades = unidadesDo(b);
  const partes: string[] = [
    `<h3 style="font-family:Calibri,sans-serif;color:${AZUL};font-size:14pt;margin:24px 0 2px;">${escapar(b.nome)}</h3>`,
    `<p style="font-family:Calibri,sans-serif;color:${AZUL};font-size:10pt;margin:0 0 8px;">${escapar(
      s('periodo', {
        periodo: rotuloPeriodoLocal(
          b.meses.map((m) => m.mes),
          idioma
        ),
      })
    )}</p>`,
  ];

  for (const u of unidades) {
    if (unidades.length > 1)
      partes.push(`<p style="${estiloTitulo}">${escapar(t(`controleBancoHoras.quadro.${u}`))}</p>`);
    partes.push(
      tabelaHtml(
        [s('indicador'), ...b.meses.map((m) => cabecalhoDoMes(m, opcoes))],
        linhasDoQuadro(b, u, opcoes).map((l) => [escapar(l.rotulo), ...l.valores.map(escapar)]),
        (i) => i > 0
      )
    );
  }

  const principal = unidades[0];
  const saldoRef = referencia(b)?.resultado?.[principal]?.saldo ?? 0;
  if (b.consomeOutrosBancos && bancos.length > 1 && saldoRef < 0) {
    partes.push(
      `<p style="font-family:Calibri,sans-serif;color:${AZUL};font-size:10pt;margin:0 0 12px;">${escapar(
        s('saldoNegativo', { mes: mesTexto(b.meses[b.meses.length - 1].mes) })
      )}</p>`
    );
  }

  if (b.requerimentos.length) {
    partes.push(`<p style="${estiloTitulo}">${escapar(s('requerimentos'))}</p>`);
    partes.push(
      tabelaHtml(
        [
          s('colunaRequerimento'),
          s('colunaModulo'),
          s('colunaCobranca'),
          s('colunaSituacao'),
          ...unidades.map((u) => s(u === 'horas' ? 'colunaHoras' : 'colunaTickets')),
        ],
        b.requerimentos.map((r) => [
          `<strong>${escapar(r.chamado)}</strong><br/>${escapar(r.titulo)}`,
          escapar(r.modulo),
          escapar(mesTexto(r.mes)),
          escapar(s(r.situacao)),
          ...unidades.map((u) =>
            escapar(u === 'horas' ? formatarHoras(r.minutos) : String(r.tickets))
          ),
        ]),
        (i) => i >= 4
      )
    );
  }

  if (b.reajustes.length) {
    partes.push(`<p style="${estiloTitulo}">${escapar(s('reajustes'))}</p>`);
    partes.push(
      tabelaHtml(
        [s('colunaMes'), s('colunaReajuste'), s('colunaMotivo')],
        b.reajustes.map((r) => {
          const sinal = r.tipo === 'saida' ? 1 : -1;
          const valor = unidades
            .map((u) => quantidade(u, sinal * (u === 'horas' ? r.minutos : r.tickets), 'sempre'))
            .join(' · ');
          return [escapar(mesTexto(r.mes)), escapar(valor), escapar(r.justificativa)];
        }),
        (i) => i === 1
      )
    );
  }

  if (b.observacoes.length) {
    partes.push(`<p style="${estiloTitulo}">${escapar(s('observacoes'))}</p>`);
    partes.push(
      tabelaHtml(
        [s('colunaMes'), s('colunaObservacao')],
        b.observacoes.map((o) => [escapar(mesTexto(o.mes)), escapar(o.texto)]),
        () => false
      )
    );
  }

  return partes.join('');
}

/** As tabelas do e-mail: um bloco por banco, na ordem */
export function gerarHtmlTabelasBancos(
  bancos: SaldoParcialBanco[],
  opcoes: OpcoesConteudo
): string {
  return bancos.map((b) => blocoHtml(b, bancos, opcoes)).join('');
}

/* ------------------------------------------------------------------ */
/* Excel                                                                */
/* ------------------------------------------------------------------ */

const ESTILO_CABECALHO = {
  font: { bold: true, color: { rgb: 'FFFFFF' } },
  fill: { fgColor: { rgb: AZUL.slice(1) } },
  alignment: { vertical: 'center' },
};
const ESTILO_TITULO = { font: { bold: true, sz: 13, color: { rgb: AZUL.slice(1) } } };

const dataBrasilia = (iso: string | null, idioma: string) =>
  iso
    ? new Intl.DateTimeFormat(idioma === 'en' ? 'en-GB' : idioma, {
        timeZone: 'America/Sao_Paulo',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }).format(new Date(iso))
    : '';

/** Nome de aba: sem : \ / ? * [ ], até 31 caracteres e sem repetir */
function nomesDeAba(nomes: string[]): string[] {
  const usados = new Set<string>();
  return nomes.map((nome) => {
    const base =
      nome
        .replace(/[:\\/?*[\]]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 31) || 'Banco';
    let candidato = base;
    for (let i = 2; usados.has(candidato.toLowerCase()); i++) {
      const sufixo = ` (${i})`;
      candidato = `${base.slice(0, 31 - sufixo.length)}${sufixo}`;
    }
    usados.add(candidato.toLowerCase());
    return candidato;
  });
}

/** Linhas da aba e os índices das linhas de título e de cabeçalho, para o estilo */
interface Aba {
  linhas: (string | number)[][];
  titulos: number[];
  cabecalhos: number[];
}

function abaDoBanco(b: SaldoParcialBanco, chamados: ChamadoDoBanco[], opcoes: OpcoesConteudo): Aba {
  const { t, idioma } = opcoes;
  const s = (chave: string, valores?: Record<string, unknown>) =>
    t(`controleBancoHoras.saldoParcial.${chave}`, valores);
  const mesTexto = (m: { ano: number; mes: number }) => rotuloMesLocal(m, idioma);
  const unidades = unidadesDo(b);
  const aba: Aba = { linhas: [], titulos: [], cabecalhos: [] };
  const titulo = (texto: string) => {
    aba.titulos.push(aba.linhas.length);
    aba.linhas.push([texto]);
  };
  const cabecalho = (colunas: string[]) => {
    aba.cabecalhos.push(aba.linhas.length);
    aba.linhas.push(colunas);
  };

  titulo(b.nome);
  aba.linhas.push([
    s('periodo', {
      periodo: rotuloPeriodoLocal(
        b.meses.map((m) => m.mes),
        idioma
      ),
    }),
  ]);
  for (const u of unidades) {
    aba.linhas.push([]);
    if (unidades.length > 1) titulo(t(`controleBancoHoras.quadro.${u}`));
    cabecalho([s('indicador'), ...b.meses.map((m) => cabecalhoDoMes(m, opcoes))]);
    for (const l of linhasDoQuadro(b, u, opcoes)) aba.linhas.push([l.rotulo, ...l.valores]);
  }

  aba.linhas.push([]);
  titulo(s('chamados'));
  cabecalho([
    s('colunaMes'),
    s('colunaOrigem'),
    s('colunaChamado'),
    s('colunaTarefa'),
    s('colunaData'),
    s('colunaGrupo'),
    s('colunaIc'),
    s('colunaAnalista'),
    s('colunaSolicitante'),
    s('colunaDescricaoTarefa'),
    s('colunaDescricaoChamado'),
    s('colunaSolucao'),
    s('colunaHoras'),
    s('colunaTickets'),
  ]);
  for (const c of chamados) {
    aba.linhas.push([
      mesTexto(c.mes),
      s(`origem.${c.fonte}`),
      c.chamado ?? '',
      c.tarefa ?? '',
      dataBrasilia(c.data, idioma),
      c.grupo ?? '',
      c.itemConfiguracao ?? '',
      c.analista ?? '',
      c.solicitante ?? '',
      c.descricaoTarefa ?? '',
      c.descricaoChamado ?? '',
      c.solucaoChamado ?? '',
      formatarHoras(c.minutos),
      c.tickets,
    ]);
  }
  const total = Array<string | number>(14).fill('');
  total[11] = s('total');
  total[12] = formatarHoras(chamados.reduce((soma, c) => soma + c.minutos, 0));
  total[13] = chamados.reduce((soma, c) => soma + c.tickets, 0);
  aba.linhas.push(total);

  if (b.requerimentos.length) {
    aba.linhas.push([]);
    titulo(s('requerimentos'));
    cabecalho([
      s('colunaChamado'),
      s('colunaRequerimento'),
      s('colunaModulo'),
      s('colunaCobranca'),
      s('colunaSituacao'),
      s('colunaHoras'),
      s('colunaTickets'),
    ]);
    for (const r of b.requerimentos)
      aba.linhas.push([
        r.chamado,
        r.titulo,
        r.modulo,
        mesTexto(r.mes),
        s(r.situacao),
        formatarHoras(r.minutos),
        r.tickets,
      ]);
  }
  if (b.reajustes.length) {
    aba.linhas.push([]);
    titulo(s('reajustes'));
    cabecalho([s('colunaMes'), s('colunaHoras'), s('colunaTickets'), s('colunaMotivo')]);
    for (const r of b.reajustes) {
      const sinal = r.tipo === 'saida' ? 1 : -1;
      aba.linhas.push([
        mesTexto(r.mes),
        quantidade('horas', sinal * r.minutos, 'sempre'),
        quantidade('tickets', sinal * r.tickets, 'sempre'),
        r.justificativa,
      ]);
    }
  }
  if (b.observacoes.length) {
    aba.linhas.push([]);
    titulo(s('observacoes'));
    cabecalho([s('colunaMes'), s('colunaObservacao')]);
    for (const o of b.observacoes) aba.linhas.push([mesTexto(o.mes), o.texto]);
  }
  return aba;
}

function abaResumo(bancos: SaldoParcialBanco[], { t, idioma }: OpcoesConteudo): Aba {
  const s = (chave: string) => t(`controleBancoHoras.saldoParcial.${chave}`);
  const q = (chave: string) => t(`controleBancoHoras.quadro.${chave}`);
  const aba: Aba = { linhas: [], titulos: [], cabecalhos: [0] };
  aba.linhas.push([
    s('colunaBanco'),
    s('colunaPeriodo'),
    s('colunaUnidade'),
    q('disponivel'),
    q('consumoTotal'),
    q('saldo'),
  ]);
  for (const b of bancos) {
    const ref = referencia(b);
    for (const u of unidadesDo(b)) {
      const r = ref?.resultado?.[u];
      aba.linhas.push([
        b.nome,
        rotuloPeriodoLocal(
          b.meses.map((m) => m.mes),
          idioma
        ),
        q(u),
        r ? quantidade(u, r.saldoAUtilizar) : SEM_VALOR,
        r ? quantidade(u, r.consumoTotal) : SEM_VALOR,
        r ? quantidade(u, r.saldo) : SEM_VALOR,
      ]);
    }
  }
  return aba;
}

function folha({ linhas, titulos, cabecalhos }: Aba): XLSX.WorkSheet {
  const ws = XLSX.utils.aoa_to_sheet(linhas);
  const colunas = Math.max(...linhas.map((l) => l.length), 1);
  for (const linha of cabecalhos) {
    for (let c = 0; c < linhas[linha].length; c++) {
      const ref = XLSX.utils.encode_cell({ r: linha, c });
      if (ws[ref]) ws[ref].s = ESTILO_CABECALHO;
    }
  }
  for (const linha of titulos) {
    const ref = XLSX.utils.encode_cell({ r: linha, c: 0 });
    if (ws[ref]) ws[ref].s = ESTILO_TITULO;
  }
  ws['!cols'] = Array.from({ length: colunas }, (_, c) => ({
    wch: Math.min(
      50,
      Math.max(10, ...linhas.map((l) => String(l[c] ?? '').length + 2).filter((n) => n < 60))
    ),
  }));
  return ws;
}

/** Excel do Saldo Parcial: resumo e uma aba por banco, com o quadro e os chamados */
export function montarWorkbookBancos(
  bancos: SaldoParcialBanco[],
  chamados: Record<string, ChamadoDoBanco[]>,
  opcoes: OpcoesConteudo
): XLSX.WorkBook {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(
    wb,
    folha(abaResumo(bancos, opcoes)),
    opcoes.t('controleBancoHoras.saldoParcial.abaResumo').slice(0, 31)
  );
  const nomes = nomesDeAba(bancos.map((b) => b.nome));
  bancos.forEach((b, i) =>
    XLSX.utils.book_append_sheet(
      wb,
      folha(abaDoBanco(b, chamados[b.bancoId] ?? [], opcoes)),
      nomes[i]
    )
  );
  return wb;
}

/** O Excel pronto para anexar */
export function gerarExcelBancos(
  bancos: SaldoParcialBanco[],
  chamados: Record<string, ChamadoDoBanco[]>,
  opcoes: OpcoesConteudo & { empresa: string; data: string }
): File {
  const wb = montarWorkbookBancos(bancos, chamados, opcoes);
  const conteudo = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const nome = opcoes
    .t('controleBancoHoras.saldoParcial.arquivo', { empresa: opcoes.empresa, data: opcoes.data })
    .replace(/[\\/:*?"<>|]/g, ' ');
  return new File([conteudo], nome, {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
}
