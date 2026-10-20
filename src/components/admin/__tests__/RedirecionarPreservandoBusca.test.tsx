import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom';
import { RedirecionarPreservandoBusca } from '../RedirecionarPreservandoBusca';

function Destino() {
  const { pathname, search } = useLocation();
  return <p>{`${pathname}${search}`}</p>;
}

const renderEm = (rota: string) =>
  render(
    <MemoryRouter initialEntries={[rota]}>
      <Routes>
        <Route
          path="/admin/sincronizacao-sql-server"
          element={<RedirecionarPreservandoBusca para="/admin/rotinas-automaticas" />}
        />
        <Route path="/admin/rotinas-automaticas" element={<Destino />} />
      </Routes>
    </MemoryRouter>
  );

describe('RedirecionarPreservandoBusca', () => {
  it('leva para o endereço novo', () => {
    renderEm('/admin/sincronizacao-sql-server');
    expect(screen.getByText('/admin/rotinas-automaticas')).toBeInTheDocument();
  });

  it('mantém a aba pedida no link antigo', () => {
    renderEm('/admin/sincronizacao-sql-server?aba=books');
    expect(screen.getByText('/admin/rotinas-automaticas?aba=books')).toBeInTheDocument();
  });
});
