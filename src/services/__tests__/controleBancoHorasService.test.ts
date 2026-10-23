import { describe, it, expect, vi } from 'vitest';
import { criarSupabaseEmMemoria } from '@/test/fakes/supabaseEmMemoria';
import { ControleBancoHorasService, comCache, chaveMes } from '../controleBancoHorasService';
import type {
  RepositorioBancosHoras,
  BancoCadastro,
} from '@/services/bancosHoras/motorBancosHoras';

const banco: BancoCadastro = {
  bancoId: 'b1',
  nome: 'Banco padrão',
  ordem: 1,
  padrao: true,
  ativo: true,
  visivelCliente: true,
  tipoContrato: 'horas',
  periodoApuracao: 3,
  inicioVigencia: { mes: 7, ano: 2026 },
  fimVigencia: null,
  diaInicioApuracao: 1,
  diaFimApuracao: 0,
  taxaProduto: 'OUTROS',
  taxaTipoHora: 'excedente',
  repasseEspecial: 'nenhum',
  duracaoPeriodoMeses: null,
  periodosAteZerar: null,
  consomeOutrosBancos: false,
  escopo: [],
  filtroIc: null,
  baselines: [
    {
      dataInicio: '2026-07-01',
      dataFim: null,
      baselineMinutos: 600,
      baselineTickets: null,
      credito: 'mensal',
    },
  ],
  repasses: [
    {
      dataInicio: '2026-07-01',
      dataFim: null,
      percentualMensal: 100,
      percentualDentroPeriodo: null,
      percentualEntrePeriodos: null,
    },
  ],
};

type Espiao = ReturnType<typeof vi.fn>;
type RepoFalso = RepositorioBancosHoras & { [K in keyof RepositorioBancosHoras]: Espiao };

function repoFalso(): RepoFalso {
  return {
    bancos: vi.fn(async () => [banco]),
    dePara: vi.fn(async () => []),
    consumo: vi.fn(async (_e, m) =>
      m.mes === 7
        ? [{ fonte: 'apontamento', grupo: 'G', itemConfiguracao: null, minutos: 100, tickets: 0 }]
        : []
    ),
    requerimentos: vi.fn(async () => []),
    reajustes: vi.fn(async () => []),
    fechamentos: vi.fn(async () => []),
    taxas: vi.fn(async () => []),
  } as unknown as RepoFalso;
}

describe('comCache', () => {
  it('a mesma consulta com os mesmos argumentos vai ao banco uma vez só', async () => {
    const repo = repoFalso();
    const cache = comCache(repo);
    await cache.bancos('e1');
    await cache.bancos('e1');
    await cache.consumo('e1', { mes: 7, ano: 2026 }, 1, 0);
    await cache.consumo('e1', { mes: 7, ano: 2026 }, 1, 0);
    await cache.consumo('e1', { mes: 8, ano: 2026 }, 1, 0);
    expect(repo.bancos).toHaveBeenCalledTimes(1);
    expect(repo.consumo).toHaveBeenCalledTimes(2);
  });

  it('erro não fica guardado: a próxima chamada tenta de novo', async () => {
    const repo = repoFalso();
    repo.bancos.mockRejectedValueOnce(new Error('sem rede'));
    const cache = comCache(repo);
    await expect(cache.bancos('e1')).rejects.toThrow('sem rede');
    await expect(cache.bancos('e1')).resolves.toHaveLength(1);
  });
});

describe('ControleBancoHorasService.quadro', () => {
  it('calcula cada mês pedido, com o repasse em cadeia, sem repetir consultas', async () => {
    const repo = repoFalso();
    const s = new ControleBancoHorasService(criarSupabaseEmMemoria() as any, () => repo);
    const meses = [
      { mes: 7, ano: 2026 },
      { mes: 8, ano: 2026 },
      { mes: 9, ano: 2026 },
    ];
    const quadro = await s.quadro('e1', meses);

    expect(Object.keys(quadro)).toEqual(['2026-07', '2026-08', '2026-09']);
    const horas = (k: string) => quadro[k].bancos[0].horas!;
    // Julho: 600 − 100 = 500, repassa 100%. Agosto: 600 + 500 = 1100. Setembro (fim): 1700, zera
    expect(horas('2026-07')).toMatchObject({ consumo: 100, saldo: 500, repasse: 500 });
    expect(horas('2026-08')).toMatchObject({ repasseAnterior: 500, saldo: 1100 });
    expect(horas('2026-09')).toMatchObject({ saldo: 1700, repasse: 0 });
    expect(quadro['2026-09'].bancos[0].fimPeriodo).toBe(true);

    expect(repo.bancos).toHaveBeenCalledTimes(1);
    expect(repo.consumo).toHaveBeenCalledTimes(3);
  });

  it('chave do mês', () => {
    expect(chaveMes({ mes: 7, ano: 2026 })).toBe('2026-07');
  });
});

describe('ControleBancoHorasService.empresas', () => {
  it('lista as empresas ativas com o modelo, em ordem alfabética', async () => {
    const fake = criarSupabaseEmMemoria({
      empresas: [
        {
          id: 'e2',
          nome_abreviado: 'EMPRESA BETA',
          status: 'ativo',
          modelo_calculo: 'legado',
          bancos_horas: [{ ativo: true }],
        },
        {
          id: 'e1',
          nome_abreviado: 'EMPRESA ALFA',
          status: 'ativo',
          modelo_calculo: 'multiplo',
          bancos_horas: [{ ativo: true }, { ativo: true }],
        },
        {
          id: 'e3',
          nome_abreviado: 'EMPRESA GAMA',
          status: 'ativo',
          modelo_calculo: 'legado',
          bancos_horas: [],
        },
        {
          id: 'e9',
          nome_abreviado: 'INATIVA',
          status: 'inativo',
          modelo_calculo: 'legado',
          bancos_horas: [],
        },
      ],
    });
    const lista = await new ControleBancoHorasService(fake as any).empresas();
    expect(lista).toEqual([
      { id: 'e1', nome: 'EMPRESA ALFA', modelo: 'liberada', bancosAtivos: 2 },
      { id: 'e2', nome: 'EMPRESA BETA', modelo: 'legado', bancosAtivos: 1 },
      { id: 'e3', nome: 'EMPRESA GAMA', modelo: 'legado', bancosAtivos: 0 },
    ]);
  });
});
