import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Breadcrumb from '../Breadcrumb';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (chave: string) => chave }),
}));

describe('Breadcrumb', () => {
  it('mostra o nome traduzido da tela Rotinas Automáticas, não o trecho do endereço', () => {
    render(
      <MemoryRouter initialEntries={['/admin/rotinas-automaticas']}>
        <Breadcrumb />
      </MemoryRouter>
    );

    expect(screen.getByText('nav.automatedRoutines')).toBeInTheDocument();
    expect(screen.queryByText('rotinas-automaticas')).not.toBeInTheDocument();
  });
});
