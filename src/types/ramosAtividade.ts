/** Ramos de Atividade (Modelagem_Fase3.md, seção 6): lista ordenada, editada como rascunho */

import type { Autoria } from '@/types/catalogo';

export interface RamoAtividade extends Autoria {
  id: string;
  nome: string;
  ordem: number;
  ativo: boolean;
  /** Empresas com este ramo como principal */
  empresasPrincipal: number;
  /** Empresas com este ramo como secundário */
  empresasSecundario: number;
}

export interface RamosAtividade {
  ramos: RamoAtividade[];
  /** Total de empresas, para mostrar quantas estão sem ramo */
  totalEmpresas: number;
}

/** Linha do rascunho; sem id = ramo novo. A posição na lista é a ordem */
export interface RamoRascunho {
  id?: string;
  nome: string;
  ativo: boolean;
}
