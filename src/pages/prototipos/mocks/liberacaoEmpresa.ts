// Dados fictícios do protótipo Liberação de empresa (Fase 5), sobre a Comparação Legado x Novo (DS v2).
// Nunca usar nomes reais de clientes ou usuários. Horas em minutos. Legado = o mês que o cliente
// recebeu no Book (fechamento do legado); Novo = o motor novo calculado em sombra.

export type SituacaoComparacao = 'identico' | 'soma_confere' | 'explicada' | 'divergente';
export type SituacaoMes = 'igual' | 'explicada' | 'divergente';

export interface ValidacaoMock {
  por: string;
  em: string;
}

export interface ConsumoBancoMock {
  banco: string;
  minutos: number;
}

export interface ItemDiferencaMock {
  id: string;
  chamado: string;
  data: string;
  grupo: string;
  /** null: o item não entrou no legado */
  minutosLegado: number | null;
  /** null: o item não entrou no modelo novo */
  minutosNovo: number | null;
  motivo: string;
  /** Motivo reconhecido (correção intencional do modelo novo) */
  explicado: boolean;
}

export interface MesComparacaoMock {
  mes: string;
  consumoLegado: number;
  consumoNovo: number;
  porBanco: ConsumoBancoMock[];
  /** Saldo e repasse só se comparam em empresa de 1 banco */
  saldoLegado: number | null;
  saldoNovo: number | null;
  repasseLegado: number | null;
  repasseNovo: number | null;
  situacao: SituacaoMes;
  itens: ItemDiferencaMock[];
}

export interface LiberacaoMock extends ValidacaoMock {
  /** Primeiro mês pelo modelo novo */
  desde: string;
  /** Lançados no Controle novo desde a liberação: vão para o legado ao voltar */
  reajustes: number;
  observacoes: number;
}

export interface ComparacaoMock {
  id: string;
  empresa: string;
  bancos: number;
  meses: MesComparacaoMock[];
  situacao: SituacaoComparacao;
  validada?: ValidacaoMock;
  liberada?: LiberacaoMock;
}

/** Mês de corte de quem for liberado agora: o primeiro que o legado ainda não fechou */
export const PROXIMO_MES = 'Out/2026';
export const ULTIMO_FECHADO = 'Set/2026';

const h = (horas: number, minutos = 0) => horas * 60 + minutos;

export const ATUALIZADO_EM = 'hoje às 08:12';

export const MESES = [
  'Out/2025',
  'Nov/2025',
  'Dez/2025',
  'Jan/2026',
  'Fev/2026',
  'Mar/2026',
  'Abr/2026',
  'Mai/2026',
  'Jun/2026',
  'Jul/2026',
  'Ago/2026',
  'Set/2026',
];

/** Meses iguais, com consumo variando em torno de uma média, para os casos sem diferença */
function mesesIguais(
  media: number,
  bancos: string[],
  saldoInicial: number | null,
  quantidade = 12
): MesComparacaoMock[] {
  return MESES.slice(-quantidade).map((mes, i) => {
    const consumo = media + ((i * 37) % 90) - 45;
    const terco = Math.floor(consumo / 3);
    const porBanco =
      bancos.length === 1
        ? [{ banco: bancos[0], minutos: consumo }]
        : bancos.map((banco, b) => ({
            banco,
            minutos: b === 0 ? consumo - terco : Math.floor(terco / (bancos.length - 1)),
          }));
    const soma = porBanco.reduce((s, b) => s + b.minutos, 0);
    const saldo = saldoInicial === null ? null : saldoInicial - ((i * 23) % 300);
    const repasse = saldo === null ? null : Math.max(0, Math.round(saldo / 2));
    return {
      mes,
      consumoLegado: soma,
      consumoNovo: soma,
      porBanco,
      saldoLegado: saldo,
      saldoNovo: saldo,
      repasseLegado: repasse,
      repasseNovo: repasse,
      situacao: 'igual',
      itens: [],
    };
  });
}

/** Aplica no mês as diferenças dos itens (no primeiro banco) */
function comDiferenca(
  meses: MesComparacaoMock[],
  mes: string,
  itens: ItemDiferencaMock[]
): MesComparacaoMock[] {
  return meses.map((m) => {
    if (m.mes !== mes) return m;
    const delta = itens.reduce((s, i) => s + (i.minutosNovo ?? 0) - (i.minutosLegado ?? 0), 0);
    return {
      ...m,
      consumoNovo: m.consumoNovo + delta,
      porBanco: m.porBanco.map((b, i) => (i === 0 ? { ...b, minutos: b.minutos + delta } : b)),
      saldoNovo: m.saldoNovo === null ? null : m.saldoNovo - delta,
      situacao: itens.every((i) => i.explicado) ? 'explicada' : 'divergente',
      itens,
    };
  });
}

export const COMPARACOES_MOCK: ComparacaoMock[] = [
  {
    id: '1',
    empresa: 'EMPRESA ALFA',
    bancos: 3,
    meses: mesesIguais(h(142, 35), ['Banco padrão', 'Projetos', 'Fiscal'], null),
    situacao: 'soma_confere',
    validada: { por: 'Usuário Teste', em: '28/10/2026' },
  },
  {
    id: '2',
    empresa: 'EMPRESA BETA',
    bancos: 1,
    meses: mesesIguais(h(58, 10), ['Banco padrão'], h(21, 50)),
    situacao: 'identico',
    validada: { por: 'Usuário Teste', em: '24/10/2026' },
  },
  {
    id: '3',
    empresa: 'EMPRESA GAMA',
    bancos: 1,
    meses: comDiferenca(
      comDiferenca(mesesIguais(h(96, 40), ['Banco padrão'], -h(16, 40)), 'Set/2026', [
        {
          id: 'g1',
          chamado: 'CH-204511',
          data: '30/09/2026 22:40',
          grupo: 'AMS APL - COMEX - DUIMP - N1',
          minutosLegado: null,
          minutosNovo: h(1),
          motivo: 'Fuso de Brasília: no legado caiu em outubro (UTC)',
          explicado: true,
        },
        {
          id: 'g2',
          chamado: 'CH-204630',
          data: '12/09/2026 10:15',
          grupo: 'AMS APL - COMEX - CAMBIO - N2',
          minutosLegado: h(0, 30),
          minutosNovo: null,
          motivo: 'Só no legado: o código de resolução não conta nas Regras de contagem',
          explicado: false,
        },
      ]),
      'Ago/2026',
      [
        {
          id: 'g3',
          chamado: 'CH-201877',
          data: '18/08/2026 14:05',
          grupo: 'AMS SUPORTE - PORTAL',
          minutosLegado: h(2),
          minutosNovo: null,
          motivo: 'Só no legado: grupo do Aranda sem mapeamento no De-para',
          explicado: false,
        },
      ]
    ),
    situacao: 'divergente',
  },
  {
    id: '4',
    empresa: 'EMPRESA DELTA',
    bancos: 2,
    meses: comDiferenca(mesesIguais(h(40), ['Banco padrão', 'Sustentação'], null), 'Mai/2026', [
      {
        id: 'd1',
        chamado: 'CH-188120',
        data: '31/05/2026 23:10',
        grupo: 'AMS APL - FISCAL - N2',
        minutosLegado: null,
        minutosNovo: h(1, 20),
        motivo: 'Fuso de Brasília: no legado caiu em junho (UTC)',
        explicado: true,
      },
    ]),
    situacao: 'explicada',
  },
  {
    id: '5',
    empresa: 'EMPRESA ÉPSILON',
    bancos: 1,
    meses: comDiferenca(mesesIguais(h(12, 20), ['Banco padrão'], h(27, 40)), 'Fev/2026', [
      {
        id: 'e1',
        chamado: 'CH-170342',
        data: '09/02/2026 08:00',
        grupo: 'AMS APL - GALLERY - N1',
        minutosLegado: h(1, 30),
        minutosNovo: h(25, 30),
        motivo: 'Apontamento acima de 24 h: o legado perde os dias inteiros',
        explicado: true,
      },
    ]),
    situacao: 'explicada',
  },
  {
    id: '6',
    empresa: 'EMPRESA ZETA',
    bancos: 1,
    meses: mesesIguais(h(33, 15), ['Banco padrão'], h(6, 45)),
    situacao: 'identico',
    validada: { por: 'Usuário Teste', em: '20/10/2026' },
    liberada: {
      por: 'Usuário Teste',
      em: '01/10/2026',
      desde: 'Set/2026',
      reajustes: 2,
      observacoes: 1,
    },
  },
  {
    id: '7',
    empresa: 'EMPRESA ETA',
    bancos: 1,
    meses: mesesIguais(h(20), ['Banco padrão'], h(10), 4),
    situacao: 'identico',
  },
];
