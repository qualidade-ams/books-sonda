import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, describe, it, expect, vi } from 'vitest';
import { DndContext } from '@dnd-kit/core';
import { SortableContext } from '@dnd-kit/sortable';
import { LinhaRamo } from '../LinhaRamo';
import type { RamoAtividade } from '@/types/ramosAtividade';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (chave: string, valores?: Record<string, unknown>) =>
      valores ? `${chave} ${JSON.stringify(valores)}` : chave,
  }),
}));
// O Radix (menu) usa captura de ponteiro e rolagem, que o jsdom não implementa
beforeAll(() => {
  Element.prototype.hasPointerCapture ??= () => false;
  Element.prototype.setPointerCapture ??= () => {};
  Element.prototype.releasePointerCapture ??= () => {};
  Element.prototype.scrollIntoView ??= () => {};
});

const ramo = (extra: Partial<RamoAtividade> = {}): RamoAtividade => ({
  id: 'r1',
  nome: 'Agronegócio',
  ordem: 1,
  ativo: true,
  empresasPrincipal: 2,
  empresasSecundario: 1,
  atualizadoEm: '2026-10-22T12:00:00Z',
  atualizadoPor: null,
  ...extra,
});
const OUTROS = [ramo({ id: 'r2', nome: 'Indústria' })];
const props = {
  ramo: ramo(),
  pendencia: null,
  podeEditar: true,
  podeArrastar: true,
  outros: OUTROS,
  onRenomear: vi.fn(),
  onAlterarStatus: vi.fn(),
  onExcluir: vi.fn(),
};
const renderizar = (extra = {}) => {
  const p = { ...props, ...extra };
  return render(
    <DndContext>
      <SortableContext items={[p.ramo.id]}>
        <ul>
          <LinhaRamo {...p} />
        </ul>
      </SortableContext>
    </DndContext>
  );
};
const abrirMenu = () =>
  userEvent.click(
    screen.getByRole('button', { name: 'fase3Comum.acoesDe {"nome":"Agronegócio"}' })
  );

describe('LinhaRamo', () => {
  it('mostra o uso nas empresas e o que está pendente', () => {
    renderizar({ pendencia: 'inativado', ramo: ramo({ ativo: false }) });
    expect(
      screen.getByText(
        'ramosAtividade.linha.uso {"principal":"ramosAtividade.empresas.varios {\\"n\\":2}","secundario":1}'
      )
    ).toBeInTheDocument();
    expect(screen.getByText('ramosAtividade.selo.inativado')).toBeInTheDocument();
    expect(screen.queryByText('fase3Comum.inativo')).not.toBeInTheDocument();
  });

  it('renomear: Enter aplica, nome repetido não, Esc desfaz', async () => {
    const onRenomear = vi.fn();
    renderizar({ onRenomear });
    await abrirMenu();
    await userEvent.click(screen.getByRole('menuitem', { name: 'ramosAtividade.linha.renomear' }));
    const campo = screen.getByRole('textbox', {
      name: 'ramosAtividade.linha.novoNome {"nome":"Agronegócio"}',
    });

    fireEvent.change(campo, { target: { value: 'indústria' } });
    expect(screen.getByText('ramosAtividade.lista.repetido')).toBeInTheDocument();
    fireEvent.keyDown(campo, { key: 'Enter' });
    expect(onRenomear).not.toHaveBeenCalled();

    fireEvent.change(campo, { target: { value: ' Agro ' } });
    fireEvent.keyDown(campo, { key: 'Enter' });
    expect(onRenomear).toHaveBeenCalledWith('Agro');
  });

  it('Esc desfaz a edição do nome', async () => {
    const onRenomear = vi.fn();
    renderizar({ onRenomear });
    await abrirMenu();
    await userEvent.click(screen.getByRole('menuitem', { name: 'ramosAtividade.linha.renomear' }));
    const campo = screen.getByRole('textbox');
    fireEvent.change(campo, { target: { value: 'Outro' } });
    fireEvent.keyDown(campo, { key: 'Escape' });
    expect(onRenomear).not.toHaveBeenCalled();
    expect(screen.getByText('Agronegócio')).toBeInTheDocument();
  });

  it('em uso, não exclui; sem uso, exclui', async () => {
    const onExcluir = vi.fn();
    const { unmount } = renderizar({ onExcluir });
    await abrirMenu();
    expect(screen.getByRole('menuitem', { name: /ramosAtividade.linha.excluir/ })).toHaveAttribute(
      'data-disabled'
    );
    unmount();

    renderizar({ onExcluir, ramo: ramo({ empresasPrincipal: 0, empresasSecundario: 0 }) });
    await abrirMenu();
    await userEvent.click(screen.getByRole('menuitem', { name: /ramosAtividade.linha.excluir/ }));
    expect(onExcluir).toHaveBeenCalled();
  });

  it('com busca ou filtro, não reordena; só visualiza, nem alça nem menu', () => {
    const { unmount } = renderizar({ podeArrastar: false });
    const alca = screen.getByRole('button', {
      name: 'fase3Comum.reordenar {"nome":"Agronegócio"}',
    });
    expect(alca).toBeDisabled();
    expect(alca).toHaveAttribute('title', 'ramosAtividade.linha.limpeParaReordenar');
    unmount();

    renderizar({ podeEditar: false });
    expect(screen.queryByRole('button', { name: /fase3Comum.reordenar/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /fase3Comum.acoesDe/ })).not.toBeInTheDocument();
  });
});
