import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderHook } from '@testing-library/react';
import { beforeAll, describe, it, expect, vi } from 'vitest';
import { DestinoNaLista, EscolhaDestino } from '../EscolhaDestino';
import { useTextoDestino } from '../textoDestino';
import type { Catalogo } from '@/types/catalogo';
import type { MapeamentoGrupo } from '@/types/dePara';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (chave: string, valores?: Record<string, unknown>) =>
      valores ? `${chave} ${JSON.stringify(valores)}` : chave,
  }),
}));
// O Radix Select usa captura de ponteiro e rolagem, que o jsdom não implementa
beforeAll(() => {
  Element.prototype.hasPointerCapture ??= () => false;
  Element.prototype.setPointerCapture ??= () => {};
  Element.prototype.releasePointerCapture ??= () => {};
  Element.prototype.scrollIntoView ??= () => {};
});

const autoria = { atualizadoEm: '2026-10-22T12:00:00Z', atualizadoPor: null };
const produto = (id: string, nome: string, extra = {}) => ({
  id,
  solucaoId: 's1',
  codigo: id,
  nome,
  descricao: null,
  ordem: 1,
  ativo: true,
  aClassificar: false,
  ...autoria,
  ...extra,
});
const CATALOGO: Catalogo = {
  solucoes: [
    { id: 's1', codigo: 'COMEX', nome: 'COMEX', ordem: 1, ativo: true, ...autoria },
    { id: 's2', codigo: 'VELHA', nome: 'VELHA', ordem: 2, ativo: false, ...autoria },
  ],
  produtos: [
    produto('ce', 'CE PLUS'),
    produto('fci', 'FCI'),
    produto('legado', 'LEGADO', { ativo: false }),
    produto('prov', 'A classificar', { aClassificar: true }),
  ],
  modulos: [
    {
      id: 'cambio',
      produtoId: 'ce',
      nome: 'Câmbio',
      descricao: null,
      ordem: 1,
      ativo: true,
      ...autoria,
    },
  ],
};
const VAZIO = { solucaoId: null, produtoId: null, moduloId: null };

const abrir = (nome: string) => userEvent.click(screen.getByRole('combobox', { name: nome }));

describe('EscolhaDestino', () => {
  it('cada lista depende da anterior, e trocar a de cima limpa as de baixo', async () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <EscolhaDestino idBase="t" catalogo={CATALOGO} destino={VAZIO} onChange={onChange} />
    );
    expect(screen.getByRole('combobox', { name: 'deParaGrupos.destino.produto' })).toBeDisabled();
    await abrir('deParaGrupos.destino.solucao');
    expect(screen.queryByRole('option', { name: 'VELHA' })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('option', { name: 'COMEX' }));
    expect(onChange).toHaveBeenLastCalledWith({ solucaoId: 's1', produtoId: null, moduloId: null });

    rerender(
      <EscolhaDestino
        idBase="t"
        catalogo={CATALOGO}
        destino={{ solucaoId: 's1', produtoId: 'ce', moduloId: 'cambio' }}
        onChange={onChange}
      />
    );
    await abrir('deParaGrupos.destino.produto');
    expect(screen.queryByRole('option', { name: 'LEGADO' })).not.toBeInTheDocument();
    expect(screen.queryByRole('option', { name: 'A classificar' })).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('option', { name: 'FCI' }));
    expect(onChange).toHaveBeenLastCalledWith({
      solucaoId: 's1',
      produtoId: 'fci',
      moduloId: null,
    });
  });

  it('produto sem módulos diz isso e não deixa escolher módulo', () => {
    render(
      <EscolhaDestino
        idBase="t"
        catalogo={CATALOGO}
        destino={{ solucaoId: 's1', produtoId: 'fci', moduloId: null }}
        onChange={vi.fn()}
      />
    );
    const modulo = screen.getByRole('combobox', { name: 'deParaGrupos.destino.modulo' });
    expect(modulo).toBeDisabled();
    expect(modulo).toHaveTextContent('deParaGrupos.destino.produtoSemModulos');
  });

  it('o destino atual aparece mesmo que o produto seja provisório', () => {
    render(
      <EscolhaDestino
        idBase="t"
        catalogo={CATALOGO}
        destino={{ solucaoId: 's1', produtoId: 'prov', moduloId: null }}
        onChange={vi.fn()}
      />
    );
    expect(
      screen.getByRole('combobox', { name: 'deParaGrupos.destino.produto' })
    ).toHaveTextContent('A classificar');
  });
});

describe('useTextoDestino', () => {
  it('explica para onde vão as horas em cada nível', () => {
    const { result } = renderHook(() => useTextoDestino(CATALOGO));
    expect(result.current({ solucaoId: 's1', produtoId: 'ce', moduloId: 'cambio' })).toBe(
      'deParaGrupos.destino.textoModulo {"produto":"CE PLUS","modulo":"Câmbio"}'
    );
    expect(result.current({ solucaoId: 's1', produtoId: 'ce', moduloId: null })).toBe(
      'deParaGrupos.destino.textoProduto {"produto":"CE PLUS"}'
    );
    expect(result.current({ solucaoId: 's1', produtoId: null, moduloId: null })).toBe(
      'deParaGrupos.destino.textoSolucao {"solucao":"COMEX"}'
    );
    expect(result.current(VAZIO)).toBe('deParaGrupos.destino.textoNenhum');
  });
});

describe('DestinoNaLista', () => {
  const m = (destino: Partial<MapeamentoGrupo>, classificacao: MapeamentoGrupo['classificacao']) =>
    ({ ...VAZIO, ...destino, classificacao }) as MapeamentoGrupo;

  it('solução › produto › módulo, serviço ou não se aplica', () => {
    const { rerender, container } = render(
      <DestinoNaLista
        catalogo={CATALOGO}
        m={m({ solucaoId: 's1', produtoId: 'ce', moduloId: 'cambio' }, 'modulo')}
      />
    );
    expect(container).toHaveTextContent('COMEX › CE PLUS › Câmbio');
    rerender(<DestinoNaLista catalogo={CATALOGO} m={m({ solucaoId: 's1' }, 'solucao')} />);
    expect(container).toHaveTextContent('COMEX · deParaGrupos.destino.servico');
    rerender(<DestinoNaLista catalogo={CATALOGO} m={m({}, 'nao_se_aplica')} />);
    expect(container).toHaveTextContent('deParaGrupos.classificacao.nao_se_aplica');
  });
});
