/**
 * Testes para o componente VisaoSegmentada
 *
 * Garante que a troca entre "sem configuração de segmentação" e "com
 * configuração" não quebra a tela (hooks chamados sempre na mesma ordem).
 * Em ControleBancoHoras a config vem de empresaAtual, que começa undefined
 * e é preenchida quando a empresa carrega.
 *
 * @module components/admin/banco-horas/__tests__/VisaoSegmentada
 */

import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { VisaoSegmentada } from '../VisaoSegmentada';
import type { SegmentacaoConfig } from '@/types/clientBooksTypes';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
    i18n: { language: 'pt' },
  }),
}));

// Qualquer cadeia de query do Supabase resolve vazia
vi.mock('@/integrations/supabase/client', () => {
  const resultado = { data: null, error: null };
  const cadeia: any = new Proxy(
    {},
    {
      get: (_alvo, prop) =>
        prop === 'then' ? (resolve: (v: unknown) => void) => resolve(resultado) : () => cadeia,
    }
  );
  return { supabase: { from: () => cadeia } };
});

const config: SegmentacaoConfig = {
  empresas: [
    { nome: 'Empresa A', percentual: 60, filtro_tipo: 'contem', filtro_valor: 'A', ordem: 1 },
    { nome: 'Empresa B', percentual: 40, filtro_tipo: 'nao_contem', filtro_valor: 'A', ordem: 2 },
  ],
};

const propsBase = {
  empresaId: 'empresa-1',
  mesAno: { mes: 10, ano: 2026 },
  periodoApuracao: 1,
  percentualRepasseMensal: 0,
  mesesDoPeriodo: [{ mes: 10, ano: 2026 }],
  requerimentos: [],
};

describe('VisaoSegmentada', () => {
  it('exibe aviso quando não há configuração de segmentação', () => {
    render(<VisaoSegmentada {...propsBase} segmentacaoConfig={undefined} />);
    expect(screen.getByText(/Nenhuma configuração de segmentação encontrada/)).toBeInTheDocument();
  });

  it('não quebra quando a configuração chega depois do primeiro render', () => {
    const { rerender } = render(<VisaoSegmentada {...propsBase} segmentacaoConfig={undefined} />);
    expect(() =>
      rerender(<VisaoSegmentada {...propsBase} segmentacaoConfig={config} />)
    ).not.toThrow();
    expect(
      screen.queryByText(/Nenhuma configuração de segmentação encontrada/)
    ).not.toBeInTheDocument();
  });

  it('não quebra quando a configuração deixa de existir', () => {
    const { rerender } = render(<VisaoSegmentada {...propsBase} segmentacaoConfig={config} />);
    expect(() =>
      rerender(<VisaoSegmentada {...propsBase} segmentacaoConfig={undefined} />)
    ).not.toThrow();
    expect(screen.getByText(/Nenhuma configuração de segmentação encontrada/)).toBeInTheDocument();
  });
});
