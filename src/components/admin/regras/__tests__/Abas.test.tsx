import { render, screen, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeAll, describe, it, expect, vi } from 'vitest';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AbaCodigos } from '../AbaCodigos';
import { AbaSemRegra } from '../AbaSemRegra';
import { AbaFiltros } from '../AbaFiltros';
import type { CodigoResolucao, CodigoSemRegra, FiltrosContagem } from '@/types/regrasContagem';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (chave: string, valores?: Record<string, unknown>) =>
      valores ? `${chave} ${JSON.stringify(valores)}` : chave,
    i18n: { language: 'pt-BR' },
  }),
}));
// O Radix (menu) usa captura de ponteiro e rolagem, que o jsdom não implementa
beforeAll(() => {
  Element.prototype.hasPointerCapture ??= () => false;
  Element.prototype.setPointerCapture ??= () => {};
  Element.prototype.releasePointerCapture ??= () => {};
  Element.prototype.scrollIntoView ??= () => {};
});

const CODIGOS: CodigoResolucao[] = [
  {
    codigo: 'Banco=S|SLA=N',
    contaHoras: true,
    contaTickets: true,
    apontamentos6m: 12,
    tickets6m: 3,
  },
  { codigo: 'Outro', contaHoras: false, contaTickets: true, apontamentos6m: 0, tickets6m: 0 },
];
const FILTROS: FiltrosContagem = {
  gruposQueContam: ['AMS APL'],
  tiposChamado: ['IM', 'RF'],
  ignorarAtividadeInterna: true,
  itensExcluidos: [],
  soTicketsFechados: true,
};
const renderizar = (ui: React.ReactElement) => render(<TooltipProvider>{ui}</TooltipProvider>);
const tabela = () => within(screen.getByRole('list', { name: 'regrasContagem.codigos.titulo' }));

describe('AbaCodigos', () => {
  const props = { codigos: CODIGOS, carregando: false, podeEditar: true, onChange: vi.fn() };

  it('adiciona um código no topo, contando horas e tickets; o mesmo código, com os mesmos espaços, não', () => {
    const onChange = vi.fn();
    renderizar(<AbaCodigos {...props} onChange={onChange} />);
    const campo = screen.getByRole('textbox', { name: 'regrasContagem.codigos.novo' });
    fireEvent.change(campo, { target: { value: 'Banco=S|SLA=N' } });
    expect(screen.getByText('regrasContagem.codigos.repetido')).toBeInTheDocument();
    fireEvent.change(campo, { target: { value: 'Banco=S |SLA=N' } });
    fireEvent.click(screen.getByRole('button', { name: 'regrasContagem.codigos.adicionar' }));
    expect(onChange).toHaveBeenCalledWith([
      {
        codigo: 'Banco=S |SLA=N',
        contaHoras: true,
        contaTickets: true,
        apontamentos6m: 0,
        tickets6m: 0,
      },
      ...CODIGOS,
    ]);
  });

  it('as chaves alternam horas e tickets; desligar as duas pede para tirar da lista', () => {
    const onChange = vi.fn();
    renderizar(<AbaCodigos {...props} onChange={onChange} />);
    fireEvent.click(
      tabela().getByRole('switch', {
        name: 'regrasContagem.codigos.contaHorasDe {"codigo":"Banco=S|SLA=N"}',
      })
    );
    expect(onChange).toHaveBeenCalledWith([{ ...CODIGOS[0], contaHoras: false }, CODIGOS[1]]);

    onChange.mockClear();
    fireEvent.click(
      tabela().getByRole('switch', {
        name: 'regrasContagem.codigos.contaTicketsDe {"codigo":"Outro"}',
      })
    );
    expect(onChange).not.toHaveBeenCalled();
    const dialogo = screen.getByRole('alertdialog', {
      name: 'regrasContagem.remover.titulo {"codigo":"Outro"}',
    });
    expect(within(dialogo).getByText('regrasContagem.remover.semUso')).toBeInTheDocument();
    fireEvent.click(within(dialogo).getByRole('button', { name: 'regrasContagem.codigos.tirar' }));
    expect(onChange).toHaveBeenCalledWith([CODIGOS[0]]);
  });

  it('tirar da lista pelo menu mostra o uso dos últimos 6 meses', async () => {
    renderizar(<AbaCodigos {...props} />);
    await userEvent.click(
      screen.getByRole('button', { name: 'fase3Comum.acoesDe {"nome":"Banco=S|SLA=N"}' })
    );
    await userEvent.click(screen.getByRole('menuitem', { name: 'regrasContagem.codigos.tirar' }));
    expect(
      screen.getByText('regrasContagem.remover.uso {"apontamentos":12,"tickets":3}')
    ).toBeInTheDocument();
  });

  it('busca e filtro por horas', () => {
    renderizar(<AbaCodigos {...props} />);
    fireEvent.change(screen.getByRole('searchbox', { name: 'regrasContagem.codigos.buscar' }), {
      target: { value: 'outro' },
    });
    expect(tabela().queryByText('Banco=S|SLA=N')).not.toBeInTheDocument();
    expect(tabela().getByText('Outro')).toBeInTheDocument();
  });

  it('só visualiza: Sim/Não, sem chaves, sem adicionar e sem menu', () => {
    renderizar(<AbaCodigos {...props} podeEditar={false} />);
    expect(screen.queryByRole('switch')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('textbox', { name: 'regrasContagem.codigos.novo' })
    ).not.toBeInTheDocument();
    expect(tabela().getAllByText('regrasContagem.codigos.sim')).toHaveLength(3);
  });

  it('lista vazia avisa que nada conta', () => {
    renderizar(<AbaCodigos {...props} codigos={[]} />);
    expect(screen.getByText('regrasContagem.codigos.vazioDescricao')).toBeInTheDocument();
  });
});

describe('AbaSemRegra', () => {
  const SEM_REGRA: CodigoSemRegra[] = [
    { codigo: 'Novo=S', apontamentos6m: 4, tickets6m: 1, primeiraOcorrencia: '2026-10-01' },
  ];

  it('lista com uso e primeira ocorrência; incluir chama a tela', () => {
    const onIncluir = vi.fn();
    renderizar(
      <AbaSemRegra semRegra={SEM_REGRA} carregando={false} podeEditar onIncluir={onIncluir} />
    );
    expect(screen.getByText('01/10/2026')).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole('button', {
        name: 'regrasContagem.semRegra.incluirCodigo {"codigo":"Novo=S"}',
      })
    );
    expect(onIncluir).toHaveBeenCalledWith(SEM_REGRA[0]);
  });

  it('só visualiza: sem incluir; vazio diz que todos têm regra', () => {
    const { rerender } = renderizar(
      <AbaSemRegra semRegra={SEM_REGRA} carregando={false} podeEditar={false} onIncluir={vi.fn()} />
    );
    expect(screen.queryByRole('button', { name: /incluirCodigo/ })).not.toBeInTheDocument();
    rerender(
      <TooltipProvider>
        <AbaSemRegra semRegra={[]} carregando={false} podeEditar onIncluir={vi.fn()} />
      </TooltipProvider>
    );
    expect(screen.getByText('regrasContagem.semRegra.vazio')).toBeInTheDocument();
  });
});

describe('AbaFiltros', () => {
  it('inclui e tira grupos; sem nenhum, avisa que nada conta', () => {
    const onChange = vi.fn();
    const { rerender } = renderizar(
      <AbaFiltros filtros={FILTROS} podeEditar onChange={onChange} />
    );
    const campo = screen.getByRole('textbox', {
      name: 'regrasContagem.filtros.incluirEm {"lista":"regrasContagem.filtros.grupos"}',
    });
    fireEvent.change(campo, { target: { value: 'ams apl' } });
    expect(screen.getByText('regrasContagem.filtros.jaNaLista')).toBeInTheDocument();
    fireEvent.change(campo, { target: { value: 'AMS T&M' } });
    fireEvent.keyDown(campo, { key: 'Enter' });
    expect(onChange).toHaveBeenLastCalledWith({
      ...FILTROS,
      gruposQueContam: ['AMS APL', 'AMS T&M'],
    });

    rerender(
      <TooltipProvider>
        <AbaFiltros filtros={{ ...FILTROS, gruposQueContam: [] }} podeEditar onChange={onChange} />
      </TooltipProvider>
    );
    expect(screen.getByText('regrasContagem.filtros.semGrupos')).toBeInTheDocument();
  });

  it('tipos de chamado como caixas, na ordem conhecida', () => {
    const onChange = vi.fn();
    renderizar(<AbaFiltros filtros={FILTROS} podeEditar onChange={onChange} />);
    const pm = screen.getByRole('checkbox', { name: 'regrasContagem.filtros.tipo.PM' });
    expect(pm).not.toBeChecked();
    fireEvent.click(pm);
    expect(onChange).toHaveBeenLastCalledWith({ ...FILTROS, tiposChamado: ['IM', 'RF', 'PM'] });
    fireEvent.click(screen.getByRole('checkbox', { name: 'regrasContagem.filtros.tipo.IM' }));
    expect(onChange).toHaveBeenLastCalledWith({ ...FILTROS, tiposChamado: ['RF'] });
  });

  it('atividade interna e tickets fechados explicam o efeito', () => {
    const onChange = vi.fn();
    renderizar(
      <AbaFiltros
        filtros={{ ...FILTROS, soTicketsFechados: false }}
        podeEditar
        onChange={onChange}
      />
    );
    expect(screen.getByText('regrasContagem.filtros.fechadosDesligado')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('switch', { name: /regrasContagem.filtros.atividade$/ }));
    expect(onChange).toHaveBeenLastCalledWith({
      ...FILTROS,
      soTicketsFechados: false,
      ignorarAtividadeInterna: false,
    });
  });

  it('só visualiza: nada editável', () => {
    renderizar(<AbaFiltros filtros={FILTROS} podeEditar={false} onChange={vi.fn()} />);
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.getByRole('checkbox', { name: 'regrasContagem.filtros.tipo.IM' })).toBeDisabled();
  });
});
