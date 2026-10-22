/**
 * Testes para o campo de Grupo com busca do formulário de pesquisas
 *
 * O campo foi extraído do render do FormField em PesquisaForm (hooks não
 * podem ser chamados dentro de callback); o comportamento é o mesmo.
 *
 * @module components/admin/pesquisas-satisfacao/__tests__/CampoGrupoComBusca
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useForm } from 'react-hook-form';
import { Form, FormField } from '@/components/ui/form';
import { CampoGrupoComBusca } from '../CampoGrupoComBusca';

const categorias = [
  { value: 'FINANCEIRO', label: 'Financeiro' },
  { value: 'RH', label: 'Recursos Humanos' },
  { value: 'SAP-FI', label: 'SAP - Contas a Pagar' },
];

function Formulario({ valorInicial = '' }: { valorInicial?: string }) {
  const form = useForm({ defaultValues: { categoria: valorInicial } });
  return (
    <Form {...form}>
      <FormField
        control={form.control}
        name="categoria"
        render={({ field, fieldState }) => (
          <CampoGrupoComBusca
            field={field}
            fieldState={fieldState}
            categorias={categorias}
            label="Grupo"
          />
        )}
      />
    </Form>
  );
}

beforeAll(() => {
  // cmdk rola o item selecionado para a vista; jsdom não implementa
  Element.prototype.scrollIntoView = () => {};
});

describe('CampoGrupoComBusca', () => {
  it('mostra o placeholder quando não há grupo selecionado', () => {
    render(<Formulario />);
    expect(screen.getByRole('combobox')).toHaveTextContent('Selecione o grupo');
  });

  it('mostra o rótulo do grupo selecionado', () => {
    render(<Formulario valorInicial="RH" />);
    expect(screen.getByRole('combobox')).toHaveTextContent('Recursos Humanos');
  });

  it('filtra pelo trecho do rótulo ou pelo início de cada palavra e seleciona o grupo', async () => {
    const user = userEvent.setup();
    render(<Formulario />);

    await user.click(screen.getByRole('combobox'));
    await user.type(screen.getByPlaceholderText('Buscar grupo...'), 'pag');

    expect(screen.getByRole('option', { name: 'SAP - Contas a Pagar' })).toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Financeiro' })).not.toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'Recursos Humanos' })).not.toBeInTheDocument();

    await user.click(screen.getByRole('option', { name: 'SAP - Contas a Pagar' }));
    expect(screen.getAllByRole('combobox')[0]).toHaveTextContent('SAP - Contas a Pagar');
  });

  it('mostra todos os grupos quando a busca está vazia', async () => {
    const user = userEvent.setup();
    render(<Formulario />);

    await user.click(screen.getByRole('combobox'));

    expect(screen.getAllByRole('option')).toHaveLength(3);
  });
});
