import { beforeAll, beforeEach, describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CampoBancoRequerimento } from '../CampoBancoRequerimento';
import {
  useDestinosDoRequerimento,
  useProdutosDosModulosLegados,
} from '@/hooks/useDestinosDoRequerimento';
import type { OpcaoDestino } from '@/services/requerimentoBancoService';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (chave: string, valores?: Record<string, unknown>) =>
      valores ? `${chave} ${JSON.stringify(valores)}` : chave,
    i18n: { language: 'pt-BR' },
  }),
}));
vi.mock('@/hooks/useDestinosDoRequerimento', () => ({
  useDestinosDoRequerimento: vi.fn(),
  useProdutosDosModulosLegados: vi.fn(),
}));

beforeAll(() => {
  Element.prototype.hasPointerCapture ??= () => false;
  Element.prototype.setPointerCapture ??= () => {};
  Element.prototype.releasePointerCapture ??= () => {};
  Element.prototype.scrollIntoView ??= () => {};
});

const hook = vi.mocked(useDestinosDoRequerimento);
const dePara = vi.mocked(useProdutosDosModulosLegados);

const opcao = (
  banco: [id: string, nome: string, ordem: number, fim?: string],
  produto: [id: string, nome: string],
  modulo: [id: string, nome: string] | null,
  totalModulos: number
): OpcaoDestino => ({
  bancoId: banco[0],
  bancoNome: banco[1],
  bancoOrdem: banco[2],
  inicioVigencia: '2026-07-01',
  fimVigencia: banco[3] ?? null,
  produtoId: produto[0],
  produtoNome: produto[1],
  produtoOrdem: 1,
  moduloId: modulo?.[0] ?? null,
  moduloNome: modulo?.[1] ?? null,
  moduloOrdem: 1,
  totalModulos,
});

// O cliente da tela: GALLERY inteiro; CE PLUS só Exportação e Importação; TP ONE até Set/2026
const OPCOES = [
  opcao(['b-gallery', 'GALLERY', 2], ['p-gallery', 'GALLERY'], null, 0),
  opcao(['b-comex', 'COMEX', 3], ['p-ceplus', 'CE PLUS'], ['m-export', 'Exportação'], 4),
  opcao(['b-comex', 'COMEX', 3], ['p-ceplus', 'CE PLUS'], ['m-import', 'Importação'], 4),
  opcao(['b-enc', 'ENCERRADO', 5, '2026-09-01'], ['p-tpone', 'TP ONE'], null, 0),
];

function retorno(
  opcoes: OpcaoDestino[],
  extra: Partial<ReturnType<typeof useDestinosDoRequerimento>> = {}
) {
  return {
    opcoes,
    liberada: true,
    escolhido: null,
    isLoading: false,
    error: null,
    ...extra,
  } as ReturnType<typeof useDestinosDoRequerimento>;
}

const produto = () => screen.getByRole('combobox', { name: 'reqForm.bankProduct' });
const modulo = () => screen.queryByRole('combobox', { name: 'reqForm.bankModule' });

describe('CampoBancoRequerimento', () => {
  const onChange = vi.fn();

  beforeEach(() => {
    onChange.mockReset();
    hook.mockReturnValue(retorno(OPCOES));
    dePara.mockReturnValue({});
  });

  it('empresa no legado: o campo não aparece', () => {
    hook.mockReturnValue(retorno([], { liberada: false }));

    render(
      <CampoBancoRequerimento empresaId="e1" tipoCobranca="Banco de Horas" onChange={onChange} />
    );

    expect(screen.queryByText('reqForm.bankProduct')).toBeNull();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('empresa liberada: o produto é obrigatório e lista só os produtos dos bancos vigentes', async () => {
    render(
      <CampoBancoRequerimento
        empresaId="e1"
        tipoCobranca="Banco de Horas"
        mesCobranca="10/2026"
        onChange={onChange}
      />
    );

    expect(screen.getByText('*')).toBeTruthy();
    expect(screen.getByText('reqForm.bankProductPlaceholder')).toBeTruthy();
    expect(modulo()).toBeNull();
    await userEvent.click(produto());
    expect(screen.getByRole('option', { name: 'GALLERY' })).toBeTruthy();
    expect(screen.getByRole('option', { name: 'CE PLUS' })).toBeTruthy();
    expect(screen.queryByRole('option', { name: 'TP ONE' })).toBeNull();
  });

  it('produto sem módulos: escolher já define o destino e mostra o banco', async () => {
    render(
      <CampoBancoRequerimento
        empresaId="e1"
        tipoCobranca="Banco de Horas"
        mesCobranca="10/2026"
        onChange={onChange}
      />
    );

    await userEvent.click(produto());
    await userEvent.click(screen.getByRole('option', { name: 'GALLERY' }));

    expect(onChange).toHaveBeenLastCalledWith('p-gallery|');
    expect(modulo()).toBeNull();
  });

  it('produto por módulo: pede o módulo (só os marcados) e só então define o destino', async () => {
    render(
      <CampoBancoRequerimento
        empresaId="e1"
        tipoCobranca="Banco de Horas"
        mesCobranca="10/2026"
        onChange={onChange}
      />
    );

    await userEvent.click(produto());
    await userEvent.click(screen.getByRole('option', { name: 'CE PLUS' }));
    expect(onChange).not.toHaveBeenCalledWith(expect.stringMatching(/^p-ceplus/));

    await userEvent.click(modulo()!);
    expect(screen.getByRole('option', { name: 'Exportação' })).toBeTruthy();
    expect(screen.getByRole('option', { name: 'Importação' })).toBeTruthy();
    expect(screen.queryByRole('option', { name: 'Câmbio' })).toBeNull();
    await userEvent.click(screen.getByRole('option', { name: 'Importação' }));

    expect(onChange).toHaveBeenLastCalledWith('p-ceplus|m-import');
  });

  it('destino escolhido: mostra o produto, o módulo e o banco que recebe o desconto', () => {
    render(
      <CampoBancoRequerimento
        empresaId="e1"
        tipoCobranca="Banco de Horas"
        mesCobranca="10/2026"
        valor="p-ceplus|m-export"
        onChange={onChange}
      />
    );

    expect(produto()).toHaveTextContent('CE PLUS');
    expect(modulo()).toHaveTextContent('Exportação');
    expect(screen.getByText('reqForm.bankDiscountsFrom {"banco":"COMEX"}')).toBeTruthy();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('tipo que não desconta do banco: o campo some e a escolha é limpa', () => {
    render(
      <CampoBancoRequerimento
        empresaId="e1"
        tipoCobranca="Faturado"
        valor="p-gallery|"
        onChange={onChange}
      />
    );

    expect(screen.queryByText('reqForm.bankProduct')).toBeNull();
    expect(onChange).toHaveBeenCalledWith(undefined);
  });

  it('Reprovado com análise EF: o campo aparece', () => {
    render(
      <CampoBancoRequerimento
        empresaId="e1"
        tipoCobranca="Reprovado"
        horasAnaliseEF="2:00"
        mesCobranca="10/2026"
        onChange={onChange}
      />
    );

    expect(produto()).toBeTruthy();
  });

  it('destino que não vale no mês de cobrança é limpo', () => {
    render(
      <CampoBancoRequerimento
        empresaId="e1"
        tipoCobranca="Banco de Horas"
        mesCobranca="10/2026"
        valor="p-tpone|"
        onChange={onChange}
      />
    );

    expect(onChange).toHaveBeenCalledWith(undefined);
  });

  it('na edição, já vem com o produto e o módulo escolhidos antes', () => {
    hook.mockReturnValue(
      retorno(OPCOES, {
        escolhido: { produtoId: 'p-ceplus', moduloId: 'm-export', bancoId: 'b-comex' },
      })
    );

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
    expect(onChange).toHaveBeenCalledWith('p-ceplus|m-export');
  });

  it('lançamento novo: o produto vem do campo Módulo antigo', () => {
    dePara.mockReturnValue({ Gallery: { produtoId: 'p-gallery', moduloId: null } });

    render(
      <CampoBancoRequerimento
        empresaId="e1"
        tipoCobranca="Banco de Horas"
        mesCobranca="10/2026"
        moduloLegado="Gallery"
        onChange={onChange}
      />
    );

    expect(onChange).toHaveBeenCalledWith('p-gallery|');
  });

  it('o Módulo antigo aponta para produto por módulo: preenche o produto e pede o módulo', () => {
    dePara.mockReturnValue({ Comex: { produtoId: 'p-ceplus', moduloId: null } });

    render(
      <CampoBancoRequerimento
        empresaId="e1"
        tipoCobranca="Banco de Horas"
        mesCobranca="10/2026"
        moduloLegado="Comex"
        onChange={onChange}
      />
    );

    expect(produto()).toHaveTextContent('CE PLUS');
    expect(modulo()).toBeTruthy();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('o Módulo antigo aponta para módulo marcado: preenche os dois', () => {
    dePara.mockReturnValue({ 'Comex Exp': { produtoId: 'p-ceplus', moduloId: 'm-export' } });

    render(
      <CampoBancoRequerimento
        empresaId="e1"
        tipoCobranca="Banco de Horas"
        mesCobranca="10/2026"
        moduloLegado="Comex Exp"
        onChange={onChange}
      />
    );

    expect(onChange).toHaveBeenCalledWith('p-ceplus|m-export');
  });

  it('nenhum produto com banco vigente no mês: avisa', () => {
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

  it('cliente sem banco cadastrado para requerimentos (só o padrão): bloqueia e avisa para cadastrar', () => {
    hook.mockReturnValue(retorno([]));

    render(
      <CampoBancoRequerimento
        empresaId="e1"
        tipoCobranca="Banco de Horas"
        mesCobranca="10/2026"
        onChange={onChange}
        mostrarErro
      />
    );

    expect(produto()).toBeDisabled();
    expect(screen.getByText('reqForm.bankNotRegistered')).toBeTruthy();
    expect(screen.queryByText('reqForm.bankRequired')).toBeNull();
    expect(screen.queryByText('reqForm.bankHelp')).toBeNull();
  });

  it('depois de tentar salvar sem produto, mostra o erro', () => {
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

  it('depois de tentar salvar com produto e sem módulo, o erro é do módulo', async () => {
    render(
      <CampoBancoRequerimento
        empresaId="e1"
        tipoCobranca="Banco de Horas"
        mesCobranca="10/2026"
        onChange={onChange}
        mostrarErro
      />
    );

    await userEvent.click(produto());
    await userEvent.click(screen.getByRole('option', { name: 'CE PLUS' }));

    expect(screen.getByText('reqForm.bankModuleRequired')).toBeTruthy();
  });
});
