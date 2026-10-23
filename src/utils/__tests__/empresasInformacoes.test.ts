import { describe, it, expect } from 'vitest';
import {
  comPadraoFiscal,
  horasDoRascunhoValidas,
  informacoesParaSalvar,
  rascunhoInformacoes,
} from '../empresasTela';
import type { ContratoFiscal, EmpresaDetalhe } from '@/types/empresas';

const FISCAL_VAZIO: ContratoFiscal = {
  modalidade: null,
  edocs24x7: null,
  atualizacaoContratada: null,
  atualizacoesPorAno: null,
  dba: null,
  minutosAtendimento: null,
  minutosMonitoramento: null,
  bancoDados: null,
};
const EMPRESA = {
  idAranda: null,
  organizacoes: [
    { id: 'o1', nome: 'ALFA SA' },
    { id: 'o2', nome: 'ALFA FILIAL' },
  ],
  informacoes: {
    ramoId: 'r1',
    ramoSecundarioId: null,
    descricaoAtividade: null,
    fiscal: { ...FISCAL_VAZIO, dba: 'atendimento', minutosAtendimento: 90 },
  },
} as unknown as EmpresaDetalhe;

describe('comPadraoFiscal', () => {
  it('preenche com o padrão só o que não foi informado', () => {
    expect(comPadraoFiscal({ ...FISCAL_VAZIO, modalidade: 'saas' })).toEqual({
      ...FISCAL_VAZIO,
      modalidade: 'saas',
      edocs24x7: false,
      atualizacaoContratada: false,
      dba: 'nao_contratado',
      bancoDados: 'sql_server',
    });
  });
});

describe('rascunhoInformacoes', () => {
  it('organizações pelo nome, padrão no FISCAL e horas no formato HH:MM', () => {
    const r = rascunhoInformacoes(EMPRESA);
    expect(r.organizacoes).toEqual(['ALFA SA', 'ALFA FILIAL']);
    expect(r.idAranda).toBe('');
    expect(r.fiscal.modalidade).toBe('on_premise');
    expect(r.fiscal.dba).toBe('atendimento');
    expect(r.horasAtendimento).toBe('01:30');
    expect(r.horasMonitoramento).toBe('');
  });
});

describe('informacoesParaSalvar', () => {
  it('converte as horas para minutos e vazio para nulo', () => {
    const r = {
      ...rascunhoInformacoes(EMPRESA),
      idAranda: ' 123 ',
      descricaoAtividade: '  ',
      horasMonitoramento: '10:00',
    };
    const s = informacoesParaSalvar(r);
    expect(s.idAranda).toBe('123');
    expect(s.organizacoes).toEqual(['ALFA SA', 'ALFA FILIAL']);
    expect(s.informacoes.descricaoAtividade).toBeNull();
    expect(s.informacoes.fiscal.minutosAtendimento).toBe(90);
    expect(s.informacoes.fiscal.minutosMonitoramento).toBe(600);
  });
});

describe('horasDoRascunhoValidas', () => {
  it('vazio ou HH:MM com minutos até 59', () => {
    const r = rascunhoInformacoes(EMPRESA);
    expect(horasDoRascunhoValidas(r)).toBe(true);
    expect(horasDoRascunhoValidas({ ...r, horasAtendimento: '10:75' })).toBe(false);
    expect(horasDoRascunhoValidas({ ...r, horasMonitoramento: '1' })).toBe(false);
  });
});
