/**
 * Empresa liberada para o modelo novo (Fase 5, P3): o Controle atual fica só para consulta.
 * O botão de reajuste e a seção de observações não gravam; o resto da tela segue igual.
 */

import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { VisaoConsolidada } from '../VisaoConsolidada';
import type { BancoHorasCalculo } from '@/types/bancoHoras';

vi.mock('react-i18next', () => ({
  useTranslation: () => ({ t: (key: string) => key, i18n: { language: 'pt' } }),
}));

vi.mock('@/integrations/supabase/client', () => {
  const resultado = { data: null, error: null };
  const cadeia: any = new Proxy(
    {},
    {
      get: (_alvo, prop) =>
        prop === 'then' ? (resolve: (v: unknown) => void) => resolve(resultado) : () => cadeia,
    }
  );
  return { supabase: { from: () => cadeia, rpc: () => cadeia } };
});

vi.mock('@/hooks/useAuth', () => ({ useAuth: () => ({ user: null }) }));
vi.mock('@/hooks/useBancoHorasReajustes', () => ({
  useBancoHorasReajustes: () => ({ criarReajuste: vi.fn(), isCreating: false }),
}));
vi.mock('@/hooks/useBancoHorasObservacoes', () => ({
  useBancoHorasObservacoes: () => ({ observacoesUnificadas: [] }),
}));

const reajustes: { disabled?: boolean }[] = [];
const observacoes: { disabled?: boolean }[] = [];
vi.mock('../BotaoReajusteHoras', () => ({
  BotaoReajusteHoras: (props: { disabled?: boolean }) => {
    reajustes.push(props);
    return null;
  },
}));
vi.mock('../SecaoObservacoes', () => ({
  SecaoObservacoes: (props: { disabled?: boolean }) => {
    observacoes.push(props);
    return null;
  },
}));
vi.mock('../BotaoForcarRecalculo', () => ({ BotaoForcarRecalculo: () => null }));
vi.mock('../BotaoEnviarEmailBancoHoras', () => ({ BotaoEnviarEmailBancoHoras: () => null }));

const calculo = {
  id: 'c1',
  empresa_id: 'e1',
  mes: 10,
  ano: 2026,
  baseline_horas: '10:00',
  consumo_horas: '02:00',
  reajustes_horas: '00:00',
} as BancoHorasCalculo;

const renderizar = (lancamentosBloqueados?: boolean) => {
  reajustes.length = 0;
  observacoes.length = 0;
  render(
    <QueryClientProvider client={new QueryClient()}>
      <VisaoConsolidada
        calculos={[calculo]}
        periodoApuracao={1}
        onHistoricoClick={vi.fn()}
        onFiltrosClick={vi.fn()}
        showFilters={false}
        mesAno={{ mes: 10, ano: 2026 }}
        onPeriodoChange={vi.fn()}
        mesesDoPeriodo={[{ mes: 10, ano: 2026 }]}
        tipoCobranca="horas"
        lancamentosBloqueados={lancamentosBloqueados}
      />
    </QueryClientProvider>
  );
};

describe('VisaoConsolidada: empresa liberada (P3)', () => {
  it('sem bloqueio, reajuste e observações seguem como hoje', () => {
    renderizar();
    expect(reajustes.at(-1)?.disabled).toBeFalsy();
    expect(observacoes.at(-1)?.disabled).toBeFalsy();
  });

  it('liberada: reajuste e observações não gravam', () => {
    renderizar(true);
    expect(reajustes.at(-1)?.disabled).toBe(true);
    expect(observacoes.at(-1)?.disabled).toBe(true);
  });
});
