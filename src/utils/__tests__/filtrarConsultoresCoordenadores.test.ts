import { describe, it, expect } from 'vitest';
import {
  filtrarConsultoresCoordenadores,
  FILTROS_CONSULTORES_PADRAO,
} from '../filtrarConsultoresCoordenadores';
import type { ConsultorCoordenador } from '@/types/consultoresCoordenadores';

const consultores: ConsultorCoordenador[] = [
  {
    especialistaId: 'e1',
    nome: 'João Ávila',
    email: 'joao@sonda.com',
    status: 'ativo',
    coordenadorId: 'c1',
  },
  {
    especialistaId: 'e2',
    nome: 'Maria Souza',
    email: 'maria@sonda.com',
    status: 'ativo',
    coordenadorId: null,
  },
  { especialistaId: 'e3', nome: 'Pedro Lima', email: null, status: 'inativo', coordenadorId: 'c2' },
];

const ids = (lista: ConsultorCoordenador[]) => lista.map((c) => c.especialistaId);

describe('filtrarConsultoresCoordenadores', () => {
  it('padrão mostra só os ativos', () => {
    expect(ids(filtrarConsultoresCoordenadores(consultores, FILTROS_CONSULTORES_PADRAO))).toEqual([
      'e1',
      'e2',
    ]);
  });

  it('status "all" mostra todos', () => {
    const r = filtrarConsultoresCoordenadores(consultores, {
      ...FILTROS_CONSULTORES_PADRAO,
      status: 'all',
    });
    expect(ids(r)).toEqual(['e1', 'e2', 'e3']);
  });

  it('busca por nome sem acento e sem caixa, ou por email', () => {
    const porNome = filtrarConsultoresCoordenadores(consultores, {
      ...FILTROS_CONSULTORES_PADRAO,
      busca: 'joao avila',
    });
    const porEmail = filtrarConsultoresCoordenadores(consultores, {
      ...FILTROS_CONSULTORES_PADRAO,
      busca: 'MARIA@',
    });
    expect(ids(porNome)).toEqual(['e1']);
    expect(ids(porEmail)).toEqual(['e2']);
  });

  it('coordenador "sem" mostra quem não tem vínculo', () => {
    const r = filtrarConsultoresCoordenadores(consultores, {
      ...FILTROS_CONSULTORES_PADRAO,
      coordenador: 'sem',
    });
    expect(ids(r)).toEqual(['e2']);
  });

  it('coordenador por id mostra só os consultores dele', () => {
    const r = filtrarConsultoresCoordenadores(consultores, {
      status: 'all',
      busca: '',
      coordenador: 'c2',
    });
    expect(ids(r)).toEqual(['e3']);
  });
});
