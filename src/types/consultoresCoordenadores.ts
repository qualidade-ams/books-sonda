/**
 * Tipos da tela "Consultores x Coordenadores": cada consultor (especialistas) tem no
 * máximo um responsável do organograma, copiado no email de inconsistências de chamados.
 */

export const CARGOS_RESPONSAVEL = ['Coordenador', 'Gerente', 'Diretor'] as const;
export type CargoResponsavel = (typeof CARGOS_RESPONSAVEL)[number];

/** Pessoa do organograma que pode ser coordenador de consultor */
export interface ResponsavelOrganograma {
  id: string;
  nome: string;
  cargo: CargoResponsavel;
  email: string;
}

/** Consultor com o coordenador vinculado (ou null) */
export interface ConsultorCoordenador {
  especialistaId: string;
  nome: string;
  email: string | null;
  status: 'ativo' | 'inativo';
  coordenadorId: string | null;
}

/** Consultor com o email do coordenador, usado para montar destinatário e CC do email */
export interface EspecialistaParaEmail {
  nome: string | null;
  email: string | null;
  email_coordenador: string | null;
}
