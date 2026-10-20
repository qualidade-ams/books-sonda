import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import type { ReactNode } from 'react';
import Prototipos from '../Prototipos';
import { montarRegistroPrototipos, type PrototipoProps } from '@/utils/prototipos';

vi.mock('@/components/admin/LayoutAdmin', () => ({
  default: ({ children }: { children: ReactNode }) => <div>{children}</div>,
}));

function PrototipoFalso({ estado }: PrototipoProps) {
  return <p>Estado atual: {estado}</p>;
}

const registro = montarRegistroPrototipos({
  './prototipos/ListaContratos.tsx': () => Promise.resolve({ default: PrototipoFalso }),
});

function renderEm(caminho: string) {
  return render(
    <MemoryRouter initialEntries={[caminho]}>
      <Routes>
        <Route path="/prototipos/:slug?" element={<Prototipos registro={registro} />} />
      </Routes>
    </MemoryRouter>
  );
}

describe('Prototipos', () => {
  it('lista os protótipos disponíveis quando não há slug', () => {
    renderEm('/prototipos');

    const link = screen.getByRole('link', { name: /Lista Contratos/ });
    expect(link).toHaveAttribute('href', '/prototipos/lista-contratos');
  });

  it('avisa quando o slug não corresponde a nenhum protótipo', () => {
    renderEm('/prototipos/nao-existe');

    expect(screen.getByText(/Protótipo não encontrado/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Lista Contratos/ })).toBeInTheDocument();
  });

  it('renderiza o protótipo no estado "dados" por padrão', async () => {
    renderEm('/prototipos/lista-contratos');

    expect(await screen.findByText('Estado atual: dados')).toBeInTheDocument();
  });

  it('troca o estado do protótipo pelo painel de controle', async () => {
    const user = userEvent.setup();
    renderEm('/prototipos/lista-contratos');
    await screen.findByText('Estado atual: dados');

    await user.click(screen.getByRole('button', { name: 'Vazio' }));
    expect(screen.getByText('Estado atual: vazio')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Erro' }));
    expect(screen.getByText('Estado atual: erro')).toBeInTheDocument();
  });
});
