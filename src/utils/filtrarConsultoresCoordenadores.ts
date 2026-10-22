import type { ConsultorCoordenador } from '@/types/consultoresCoordenadores';

export interface FiltrosConsultoresCoordenadores {
  busca: string;
  /** 'all', 'sem' (sem coordenador) ou o id do coordenador */
  coordenador: string;
  status: 'all' | 'ativo' | 'inativo';
}

export const FILTROS_CONSULTORES_PADRAO: FiltrosConsultoresCoordenadores = {
  busca: '',
  coordenador: 'all',
  status: 'ativo',
};

const normalizar = (texto: string): string =>
  texto.normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();

export function filtrarConsultoresCoordenadores(
  consultores: ConsultorCoordenador[],
  filtros: FiltrosConsultoresCoordenadores
): ConsultorCoordenador[] {
  const busca = normalizar(filtros.busca);

  return consultores.filter((c) => {
    if (filtros.status !== 'all' && c.status !== filtros.status) return false;
    if (filtros.coordenador === 'sem' && c.coordenadorId) return false;
    if (
      filtros.coordenador !== 'all' &&
      filtros.coordenador !== 'sem' &&
      c.coordenadorId !== filtros.coordenador
    )
      return false;
    if (busca && !normalizar(`${c.nome} ${c.email ?? ''}`).includes(busca)) return false;
    return true;
  });
}
