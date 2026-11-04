import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CampoBancoRequerimento } from '../CampoBancoRequerimento';
import { useBancosDoRequerimento } from '@/hooks/useBancosDoRequerimento';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (chave: string) => chave, i18n: { language: 'pt-BR' } }),
}));
vi.mock('@/hooks/useBancosDoRequerimento', () => ({ useBancosDoRequerimento: vi.fn() }));

const hook = vi.mocked(useBancosDoRequerimento);

const banco = (id: string, inicio: string, fim: string | null = null, escolhido = false) => ({
  id,
  nome: `Banco ${id}`,
  padrao: false,
  ordem: 1,
  inicioVigencia: inicio,
  fimVigencia: fim,
  escolhido,
});

function retorno(bancos: ReturnType<typeof banco>[]) {
  return {
    bancos,
    liberada: bancos.length > 0,
    bancoEscolhidoId: bancos.find((b) => b.escolhido)?.id,
    isLoading: false,
    error: null,
  };
}

const bancosLiberada = [
  banco('padrao', '2026-07-01'),
  banco('fiscal', '2026-07-01', null, true),
  banco('encerrado', '2026-07-01', '2026-09-01'),
];

describe('CampoBancoRequerimento', () => {
  const onChange = vi.fn();

  beforeEach(() => {
    onChange.mockReset();
    hook.mockReturnValue(retorno(bancosLiberada));
  });

  it('empresa no legado: o campo não aparece', () => {
    hook.mockReturnValue(retorno([]));

    render(
      <CampoBancoRequerimento empresaId="e1" tipoCobranca="Banco de Horas" onChange={onChange} />
    );

    expect(screen.queryByText('reqForm.bank')).toBeNull();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('empresa liberada com Banco de Horas: o campo aparece, obrigatório', () => {
    render(
      <CampoBancoRequerimento
        empresaId="e1"
        tipoCobranca="Banco de Horas"
        mesCobranca="10/2026"
        onChange={onChange}
      />
    );

    expect(screen.getByText('reqForm.bank')).toBeTruthy();
    expect(screen.getByText('*')).toBeTruthy();
    expect(screen.getByText('reqForm.bankPlaceholder')).toBeTruthy();
  });

  it('tipo que não desconta do banco: o campo some e a escolha é limpa', () => {
    render(
      <CampoBancoRequerimento
        empresaId="e1"
        tipoCobranca="Faturado"
        valor="padrao"
        onChange={onChange}
      />
    );

    expect(screen.queryByText('reqForm.bank')).toBeNull();
    expect(onChange).toHaveBeenCalledWith(undefined);
  });

  it('Reprovado com análise EF: o campo aparece', () => {
    render(
      <CampoBancoRequerimento
        empresaId="e1"
        tipoCobranca="Reprovado"
        horasAnaliseEF="2:00"
        onChange={onChange}
      />
    );

    expect(screen.getByText('reqForm.bank')).toBeTruthy();
  });

  it('banco que não vale no mês de cobrança é limpo', () => {
    render(
      <CampoBancoRequerimento
        empresaId="e1"
        tipoCobranca="Banco de Horas"
        mesCobranca="10/2026"
        valor="encerrado"
        onChange={onChange}
      />
    );

    expect(onChange).toHaveBeenCalledWith(undefined);
  });

  it('banco vigente escolhido fica como está', () => {
    render(
      <CampoBancoRequerimento
        empresaId="e1"
        tipoCobranca="Banco de Horas"
        mesCobranca="10/2026"
        valor="padrao"
        onChange={onChange}
      />
    );

    expect(onChange).not.toHaveBeenCalled();
    expect(screen.getByText('Banco padrao')).toBeTruthy();
  });

  it('na edição, já vem com o banco escolhido antes', () => {
    render(
      <CampoBancoRequerimento
        empresaId="e1"
        requerimentoId="req-1"
        tipoCobranca="Banco de Horas"
        mesCobranca="10/2026"
        onChange={onChange}
      />
    );

    expect(hook).toHaveBeenCalledWith('e1', 'req-1');
    expect(onChange).toHaveBeenCalledWith('fiscal');
  });

  it('nenhum banco vigente no mês: avisa', () => {
    render(
      <CampoBancoRequerimento
        empresaId="e1"
        tipoCobranca="Banco de Horas"
        mesCobranca="01/2026"
        onChange={onChange}
      />
    );

    expect(screen.getByText('reqForm.bankNoneInMonth')).toBeTruthy();
  });

  it('depois de tentar salvar sem banco, mostra o erro', () => {
    render(
      <CampoBancoRequerimento
        empresaId="e1"
        tipoCobranca="Banco de Horas"
        mesCobranca="10/2026"
        onChange={onChange}
        mostrarErro
      />
    );

    expect(screen.getByText('reqForm.bankRequired')).toBeTruthy();
  });
});
