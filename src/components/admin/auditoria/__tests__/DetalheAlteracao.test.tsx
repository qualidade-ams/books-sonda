import { render, screen, fireEvent, within } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { TooltipProvider } from '@/components/ui/tooltip';
import { DetalheAlteracao } from '../DetalheAlteracao';
import type { RegistroAuditoria } from '@/types/auditoria';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (chave: string, valores?: Record<string, unknown>) =>
      valores ? `${chave} ${JSON.stringify(valores)}` : chave,
    i18n: { language: 'pt-BR' },
  }),
}));
window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;

const REGISTRO: RegistroAuditoria = {
  id: 7,
  em: '2026-10-21T13:12:00Z',
  usuarioId: 'u1',
  usuario: 'Pessoa A',
  origem: 'app',
  tabela: 'bancos_horas_reajustes',
  area: 'reajustes',
  registroId: 'r1',
  empresaId: 'e1',
  empresa: 'EMPRESA ALFA',
  bancoId: 'b1',
  banco: 'Banco FISCAL',
  acao: 'update',
  campos: [{ campo: 'ativo', antes: true, depois: false }],
  dados: { ano: 2026, mes: 10, minutos: 60, ativo: false },
  motivo: 'Lançado em duplicidade.',
};

const renderizar = (onVerHistorico = vi.fn()) =>
  render(
    <TooltipProvider>
      <DetalheAlteracao registro={REGISTRO} onFechar={vi.fn()} onVerHistorico={onVerHistorico} />
    </TooltipProvider>
  );

describe('DetalheAlteracao', () => {
  it('mostra o registro, o motivo e só o que mudou; ligado, todos os campos', () => {
    renderizar();
    expect(screen.getByText('EMPRESA ALFA')).toBeInTheDocument();
    expect(screen.getByText('Banco FISCAL')).toBeInTheDocument();
    expect(screen.getByText('Lançado em duplicidade.')).toBeInTheDocument();

    const tabela = screen.getByRole('table');
    expect(within(tabela).getByText('ativo')).toBeInTheDocument();
    expect(within(tabela).queryByText('minutos')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('switch', { name: /auditoriaBancosHoras.detalhe.todos/ }));
    expect(within(tabela).getByText('minutos')).toBeInTheDocument();
    expect(within(tabela).getAllByText('60')).toHaveLength(2);
  });

  it('leva ao histórico do registro', () => {
    const onVerHistorico = vi.fn();
    renderizar(onVerHistorico);
    fireEvent.click(
      screen.getByRole('button', { name: /auditoriaBancosHoras.detalhe.verHistorico/ })
    );
    expect(onVerHistorico).toHaveBeenCalled();
  });
});
