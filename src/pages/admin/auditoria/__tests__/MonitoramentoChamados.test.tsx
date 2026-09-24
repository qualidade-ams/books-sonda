import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';

const telaMock = vi.fn<(props: any) => null>(() => null);
vi.mock('../InconsistenciaChamados', () => ({ default: (props: any) => telaMock(props) }));
vi.mock('react-i18next', () => ({ useTranslation: () => ({ t: (chave: string) => chave }) }));

import MonitoramentoChamados from '../MonitoramentoChamados';

describe('MonitoramentoChamados', () => {
  it('abre a tela de inconsistências só com a troca de código de resolução', () => {
    render(<MonitoramentoChamados />);

    expect(telaMock).toHaveBeenCalledWith({
      tipos: ['troca_codigo_resolucao'],
      titulo: 'nav.ticketMonitoring',
      subtitulo: 'inconsistencias.resolutionCodeChangeSubtitle',
    });
  });
});
