import { render, screen, fireEvent, within } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { TooltipProvider } from '@/components/ui/tooltip';
import { AbaNaoMapeados } from '../AbaNaoMapeados';
import type { GrupoNaoMapeado } from '@/types/dePara';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (chave: string, valores?: Record<string, unknown>) =>
      valores ? `${chave} ${JSON.stringify(valores)}` : chave,
    i18n: { language: 'pt-BR' },
  }),
}));

const GRUPOS: GrupoNaoMapeado[] = [
  {
    grupoAranda: 'AMS NOVO - N2',
    apontamentos: 42,
    tickets: 3,
    empresas: ['ALFA', 'BETA'],
    primeiraOcorrencia: '2026-10-01',
  },
];
const props = {
  naoMapeados: GRUPOS,
  carregando: false,
  erro: null,
  podeEditar: true,
  onMapear: vi.fn(),
  onTentarNovamente: vi.fn(),
};
const renderizar = (extra = {}) =>
  render(
    <TooltipProvider>
      <AbaNaoMapeados {...props} {...extra} />
    </TooltipProvider>
  );

describe('AbaNaoMapeados', () => {
  it('lista com apontamentos, empresas e o primeiro apontamento; mapear abre a edição', () => {
    const onMapear = vi.fn();
    renderizar({ onMapear });
    const lista = within(screen.getByRole('list', { name: 'deParaGrupos.naoMapeados.rotulo' }));
    expect(lista.getByText('42')).toBeInTheDocument();
    expect(lista.getByText('2')).toBeInTheDocument();
    expect(lista.getByText('01/10/2026')).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole('button', {
        name: 'deParaGrupos.naoMapeados.mapearGrupo {"grupo":"AMS NOVO - N2"}',
      })
    );
    expect(onMapear).toHaveBeenCalledWith(GRUPOS[0]);
  });

  it('só visualiza: sem mapear', () => {
    renderizar({ podeEditar: false });
    expect(screen.queryByRole('button', { name: /mapearGrupo/ })).not.toBeInTheDocument();
  });

  it('nenhum grupo sem mapeamento', () => {
    renderizar({ naoMapeados: [] });
    expect(screen.getByText('deParaGrupos.naoMapeados.vazio')).toBeInTheDocument();
  });

  it('erro ao carregar, com tentar novamente', () => {
    const onTentarNovamente = vi.fn();
    renderizar({ erro: new Error('x'), onTentarNovamente });
    expect(screen.getByText('deParaGrupos.naoMapeados.erro')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'fase3Comum.tentarNovamente' }));
    expect(onTentarNovamente).toHaveBeenCalled();
  });
});
