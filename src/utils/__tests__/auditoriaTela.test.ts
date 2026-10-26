import { describe, it, expect } from 'vitest';
import {
  OPCOES_VAZIAS,
  acumularOpcoes,
  buscarNaAuditoria,
  identificacaoDoRegistro,
  resumoDasMudancas,
  todosOsCampos,
} from '../auditoriaTela';
import type { RegistroAuditoria } from '@/types/auditoria';

const registro = (extra: Partial<RegistroAuditoria> = {}): RegistroAuditoria => ({
  id: 1,
  em: '2026-10-21T13:12:00Z',
  usuarioId: 'u1',
  usuario: 'Pessoa A',
  origem: 'app',
  tabela: 'bancos_horas',
  area: 'bancos',
  registroId: 'r1',
  empresaId: 'e1',
  empresa: 'EMPRESA ALFA',
  bancoId: 'b1',
  banco: 'Banco FISCAL',
  acao: 'update',
  campos: [
    { campo: 'ordem', antes: 3, depois: 2 },
    { campo: 'consome_outros_bancos', antes: false, depois: true },
  ],
  dados: { nome: 'Banco FISCAL', ordem: 2, consome_outros_bancos: true, updated_at: 'x' },
  motivo: null,
  ...extra,
});

describe('identificacaoDoRegistro', () => {
  it('pelo nome, pelo mês ou pela vigência; sem nada, nulo', () => {
    expect(identificacaoDoRegistro({ nome_abreviado: 'ALFA', nome: 'x' })).toEqual({
      tipo: 'nome',
      texto: 'ALFA',
    });
    expect(identificacaoDoRegistro({ grupo_aranda: 'AMS APL - ETL - N2' })).toEqual({
      tipo: 'nome',
      texto: 'AMS APL - ETL - N2',
    });
    expect(identificacaoDoRegistro({ codigo: 12 })).toEqual({ tipo: 'nome', texto: '12' });
    expect(identificacaoDoRegistro({ ano: 2026, mes: 10, minutos: 60 })).toEqual({
      tipo: 'mes',
      mes: { ano: 2026, mes: 10 },
    });
    expect(identificacaoDoRegistro({ data_inicio: '2026-11-01', baseline_minutos: 60 })).toEqual({
      tipo: 'desde',
      data: '2026-11-01',
    });
    expect(identificacaoDoRegistro({ requerimento_id: 'q1' })).toBeNull();
    expect(identificacaoDoRegistro(null)).toBeNull();
  });
});

describe('resumoDasMudancas', () => {
  it('o primeiro campo, com quantos mais', () => {
    expect(resumoDasMudancas(registro())).toBe('ordem: 3 → 2 · +1');
    expect(
      resumoDasMudancas(
        registro({ acao: 'insert', campos: [{ campo: 'nome', antes: null, depois: 'Agro' }] })
      )
    ).toBe('nome: Agro');
    expect(
      resumoDasMudancas(
        registro({ acao: 'delete', campos: [{ campo: 'texto', antes: 'Conferir', depois: null }] })
      )
    ).toBe('texto: Conferir');
    expect(resumoDasMudancas(registro({ campos: [] }))).toBe('');
  });
});

describe('todosOsCampos', () => {
  it('na alteração, junta os campos que não mudaram, sem autoria', () => {
    expect(todosOsCampos(registro())).toEqual([
      { campo: 'ordem', antes: '3', depois: '2', igual: false },
      { campo: 'consome_outros_bancos', antes: 'false', depois: 'true', igual: false },
      { campo: 'nome', antes: 'Banco FISCAL', depois: 'Banco FISCAL', igual: true },
    ]);
  });

  it('na inclusão, só os campos preenchidos', () => {
    expect(
      todosOsCampos(
        registro({ acao: 'insert', campos: [{ campo: 'nome', antes: null, depois: 'Agro' }] })
      )
    ).toEqual([{ campo: 'nome', antes: '—', depois: 'Agro', igual: false }]);
  });
});

describe('buscarNaAuditoria', () => {
  const lista = [
    registro(),
    registro({
      id: 2,
      empresa: 'EMPRESA GAMA',
      banco: null,
      usuario: null,
      motivo: 'Lançado em duplicidade',
      campos: [{ campo: 'texto', antes: 'Conferir horas', depois: 'Conferir as horas de março' }],
      dados: { texto: 'x' },
    }),
  ];

  it('procura sem acento em empresa, banco, quem, campos, valores, motivo e nome do registro', () => {
    expect(buscarNaAuditoria(lista, '').map((r) => r.id)).toEqual([1, 2]);
    expect(buscarNaAuditoria(lista, 'gama').map((r) => r.id)).toEqual([2]);
    expect(buscarNaAuditoria(lista, 'MARCO').map((r) => r.id)).toEqual([2]);
    expect(buscarNaAuditoria(lista, 'duplicidade').map((r) => r.id)).toEqual([2]);
    expect(buscarNaAuditoria(lista, 'consome_outros').map((r) => r.id)).toEqual([1]);
    expect(buscarNaAuditoria(lista, 'pessoa a').map((r) => r.id)).toEqual([1]);
    expect(buscarNaAuditoria(lista, 'banco fiscal').map((r) => r.id)).toEqual([1]);
  });
});

describe('acumularOpcoes', () => {
  it('junta empresas, bancos e pessoas já vistos, em ordem, sem repetir', () => {
    const primeira = acumularOpcoes(OPCOES_VAZIAS, [registro()]);
    const segunda = acumularOpcoes(primeira, [
      registro({ id: 2, empresaId: 'e0', empresa: 'EMPRESA ABC', bancoId: null, banco: null }),
      registro({ id: 3, usuarioId: 'u2', usuario: null }),
    ]);
    expect(segunda).toEqual({
      empresas: [
        { valor: 'e0', rotulo: 'EMPRESA ABC' },
        { valor: 'e1', rotulo: 'EMPRESA ALFA' },
      ],
      bancos: [{ valor: 'b1', rotulo: 'Banco FISCAL', empresaId: 'e1' }],
      usuarios: [{ valor: 'u1', rotulo: 'Pessoa A' }],
    });
  });

  it('sem nada novo, devolve as mesmas opções', () => {
    const primeira = acumularOpcoes(OPCOES_VAZIAS, [registro()]);
    expect(acumularOpcoes(primeira, [registro({ id: 9 })])).toBe(primeira);
  });
});
