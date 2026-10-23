import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { Select } from '@/components/ds/Select';

// O Radix Select usa captura de ponteiro e rolagem, que o jsdom não implementa
beforeAll(() => {
  Element.prototype.hasPointerCapture ??= () => false;
  Element.prototype.setPointerCapture ??= () => {};
  Element.prototype.releasePointerCapture ??= () => {};
  Element.prototype.scrollIntoView ??= () => {};
});

const meses = (
  <>
    <option value="2026-09">Set/2026</option>
    <option value="2026-10">Out/2026</option>
    <option value="2026-11" disabled>
      Nov/2026
    </option>
  </>
);

describe('Select (DS v2)', () => {
  it('mostra no gatilho o rótulo da opção escolhida', () => {
    render(
      <Select aria-label="Mês" value="2026-10" onChange={() => {}}>
        {meses}
      </Select>
    );
    expect(screen.getByRole('combobox', { name: 'Mês' })).toHaveTextContent('Out/2026');
  });

  it('abre a lista no padrão do DS e devolve o valor escolhido como no select nativo', async () => {
    const onChange = vi.fn();
    render(
      <Select aria-label="Mês" value="2026-10" onChange={onChange}>
        {meses}
      </Select>
    );
    await userEvent.click(screen.getByRole('combobox', { name: 'Mês' }));
    const lista = screen.getByRole('listbox');
    expect(lista.closest('[data-ds="v2"]')).not.toBeNull();
    await userEvent.click(screen.getByRole('option', { name: 'Set/2026' }));
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ target: { value: '2026-09' } })
    );
  });

  it('aceita a opção de valor vazio ("Selecione", "Nenhum")', async () => {
    const onChange = vi.fn();
    render(
      <Select aria-label="Ramo" value="Energia" onChange={onChange}>
        <option value="">Nenhum</option>
        <option>Energia</option>
      </Select>
    );
    await userEvent.click(screen.getByRole('combobox', { name: 'Ramo' }));
    await userEvent.click(screen.getByRole('option', { name: 'Nenhum' }));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ target: { value: '' } }));
  });

  it('agrupa as opções de <optgroup>, com o nome do grupo', async () => {
    const onChange = vi.fn();
    render(
      <Select aria-label="Produto" value="ce" onChange={onChange}>
        <optgroup label="COMEX">
          <option value="ce">CE PLUS</option>
          <option value="fci">FCI</option>
        </optgroup>
        <optgroup label="FISCAIS">
          <option value="comply">COMPLY</option>
        </optgroup>
      </Select>
    );
    expect(screen.getByRole('combobox', { name: 'Produto' })).toHaveTextContent('CE PLUS');
    await userEvent.click(screen.getByRole('combobox', { name: 'Produto' }));
    expect(screen.getByRole('group', { name: 'FISCAIS' })).toBeInTheDocument();
    await userEvent.click(screen.getByRole('option', { name: 'COMPLY' }));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ target: { value: 'comply' } }));
  });

  it('mostra a opção vazia quando o valor é vazio', () => {
    render(
      <Select aria-label="Ramo" value="" onChange={() => {}}>
        <option value="">Selecione</option>
        <option>Energia</option>
      </Select>
    );
    expect(screen.getByRole('combobox', { name: 'Ramo' })).toHaveTextContent('Selecione');
  });

  it('usa o texto como valor quando a opção não tem value, e aceita valor numérico', async () => {
    const onChange = vi.fn();
    render(
      <Select aria-label="Período" value={3} onChange={onChange}>
        <option value={1}>Mensal</option>
        <option value={3}>Trimestral</option>
      </Select>
    );
    expect(screen.getByRole('combobox', { name: 'Período' })).toHaveTextContent('Trimestral');
    await userEvent.click(screen.getByRole('combobox', { name: 'Período' }));
    await userEvent.click(screen.getByRole('option', { name: 'Mensal' }));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ target: { value: '1' } }));
  });

  it('liga o id ao gatilho, para o rótulo do campo funcionar', () => {
    render(
      <>
        <label htmlFor="mes-reajuste">Mês do reajuste</label>
        <Select id="mes-reajuste" value="2026-10" onChange={() => {}}>
          {meses}
        </Select>
      </>
    );
    expect(screen.getByLabelText('Mês do reajuste')).toHaveAttribute('role', 'combobox');
  });

  it('desabilitado não abre', async () => {
    render(
      <Select aria-label="Mês" value="2026-10" disabled onChange={() => {}}>
        {meses}
      </Select>
    );
    const gatilho = screen.getByRole('combobox', { name: 'Mês' });
    expect(gatilho).toBeDisabled();
    await userEvent.click(gatilho);
    expect(screen.queryByRole('listbox')).not.toBeInTheDocument();
  });
});
