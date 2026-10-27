import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useState } from 'react';
import { TooltipProvider } from '@/components/ui/tooltip';
import {
  BarraRodape,
  CampoHoras,
  CampoNumero,
  Rotulo,
  TelaEdicao,
  TituloFaixa,
} from '@/components/ds/Formulario';
import { DicasContext } from '@/components/ds/Dicas';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (chave: string, valores?: Record<string, unknown>) =>
      valores ? `${chave} ${JSON.stringify(valores)}` : chave,
  }),
}));

// O jsdom não implementa a rolagem da janela
window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;

function HorasControladas({ onChange }: { onChange?: (v: string) => void }) {
  const [valor, setValor] = useState('');
  return (
    <CampoHoras
      id="h"
      valor={valor}
      onChange={(v) => {
        setValor(v);
        onChange?.(v);
      }}
    />
  );
}

describe('CampoHoras', () => {
  it('formata o que é digitado como HH:MM', () => {
    const onChange = vi.fn();
    render(<HorasControladas onChange={onChange} />);
    fireEvent.change(screen.getByPlaceholderText('00:00'), { target: { value: '2000' } });
    expect(onChange).toHaveBeenLastCalledWith('20:00');
    fireEvent.change(screen.getByPlaceholderText('00:00'), { target: { value: '1a2b345' } });
    expect(onChange).toHaveBeenLastCalledWith('123:45');
  });

  it('avisa minutos inválidos só depois de sair do campo', () => {
    render(<HorasControladas />);
    const campo = screen.getByPlaceholderText('00:00');
    fireEvent.change(campo, { target: { value: '1075' } });
    expect(screen.queryByText('ds.formulario.horasInvalidas')).not.toBeInTheDocument();
    fireEvent.blur(campo);
    expect(screen.getByText('ds.formulario.horasInvalidas')).toBeInTheDocument();
    expect(campo).toHaveAttribute('aria-invalid', 'true');
  });
});

describe('CampoNumero', () => {
  it('as setas respeitam o mínimo e o máximo', () => {
    render(<CampoNumero rotuloAcessivel="Quantidade" valorInicial={2} min={1} max={3} />);
    const campo = screen.getByLabelText('Quantidade');
    fireEvent.click(screen.getByRole('button', { name: 'ds.formulario.aumentar' }));
    expect(campo).toHaveValue(3);
    expect(screen.getByRole('button', { name: 'ds.formulario.aumentar' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'ds.formulario.diminuir' }));
    fireEvent.click(screen.getByRole('button', { name: 'ds.formulario.diminuir' }));
    expect(campo).toHaveValue(1);
    expect(screen.getByRole('button', { name: 'ds.formulario.diminuir' })).toBeDisabled();
  });
});

describe('TituloFaixa e Rotulo', () => {
  it('só a primeira palavra do título vai em destaque', () => {
    render(<TituloFaixa texto="Produtos e Módulos" />);
    const titulo = screen.getByRole('heading', { level: 1 });
    expect(titulo).toHaveTextContent('Produtos e Módulos');
    expect(titulo.querySelector('span')).toHaveTextContent(/^Produtos$/);
  });

  it('o rótulo mostra a dica do dicionário da tela', () => {
    render(
      <TooltipProvider>
        <DicasContext.Provider value={{ Nome: 'Nome exibido nas telas.' }}>
          <Rotulo htmlFor="n" obrigatorio>
            Nome
          </Rotulo>
          <Rotulo htmlFor="d">Descrição</Rotulo>
        </DicasContext.Provider>
      </TooltipProvider>
    );
    expect(
      screen.getByRole('button', { name: 'ds.formulario.paraQueServe {"assunto":"Nome"}' })
    ).toBeInTheDocument();
    // Sem texto no dicionário, sem o "i"
    expect(screen.getAllByRole('button')).toHaveLength(1);
  });
});

describe('TelaEdicao e BarraRodape', () => {
  it('volta, cancela e salva; sem permissão de salvar, o botão fica desabilitado', () => {
    const onFechar = vi.fn();
    const onSalvar = vi.fn();
    const { rerender } = render(
      <TelaEdicao
        voltarPara="Produtos e Módulos"
        titulo="Editar CE PLUS"
        podeSalvar={false}
        onFechar={onFechar}
        onSalvar={onSalvar}
      >
        <p>conteúdo</p>
      </TelaEdicao>
    );
    expect(screen.getByRole('heading', { name: 'Editar CE PLUS' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'ds.formulario.salvar' })).toBeDisabled();

    fireEvent.click(screen.getByRole('button', { name: 'Produtos e Módulos' }));
    fireEvent.click(screen.getByRole('button', { name: 'ds.cancel' }));
    expect(onFechar).toHaveBeenCalledTimes(2);

    rerender(
      <TelaEdicao
        voltarPara="Produtos e Módulos"
        titulo="Editar CE PLUS"
        podeSalvar
        onFechar={onFechar}
        onSalvar={onSalvar}
        rotuloSalvar="Criar"
      >
        <p>conteúdo</p>
      </TelaEdicao>
    );
    fireEvent.click(screen.getByRole('button', { name: 'Criar' }));
    expect(onSalvar).toHaveBeenCalled();
  });

  it('só leitura: sem onSalvar não há barra de salvar', () => {
    render(
      <TelaEdicao voltarPara="Voltar" titulo="Detalhe" onFechar={vi.fn()}>
        <p>conteúdo</p>
      </TelaEdicao>
    );
    expect(screen.queryByRole('button', { name: 'ds.cancel' })).not.toBeInTheDocument();
  });

  it('a barra de rodapé fica grudada no fim da área de conteúdo', () => {
    render(<BarraRodape>Alterações não salvas</BarraRodape>);
    const barra = screen.getByText('Alterações não salvas').closest('[data-barra-rodape]');
    expect(barra).toHaveClass('sticky', 'bottom-0');
  });
});
