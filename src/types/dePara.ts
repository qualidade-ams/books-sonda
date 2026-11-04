/**
 * De-para de Grupos: cada grupo de atendimento do Aranda ligado ao Grupo do Book
 * e ao catálogo, que decide o banco de cada hora (Modelagem_Fase3.md, seções 2.4 e 6).
 */

import type { Autoria } from '@/types/catalogo';

/**
 * modulo → banco do módulo ou do produto inteiro · produto → banco do produto
 * inteiro · nao_se_aplica → sempre o Banco padrão. Sem banco que cubra, o Banco padrão.
 * O grupo de serviço da solução deixou de existir em 03/11/2026: o grupo que atende a
 * solução toda é vinculado aos produtos dela, como qualquer outro.
 */
export type ClassificacaoGrupo = 'modulo' | 'produto' | 'nao_se_aplica';

/** Onde o grupo está ligado; tudo nulo = não se aplica. Com solução, o produto é obrigatório */
export interface DestinoGrupo {
  solucaoId: string | null;
  produtoId: string | null;
  moduloId: string | null;
}

/**
 * O grupo pode estar em vários lugares (decisões de 28/10 e 03/11/2026): produtos
 * inteiros e módulos, sem repetir o mesmo lugar. O destino e a classificação de nível são os do vínculo principal
 * (o primeiro), usado na edição do De-para.
 */
export interface MapeamentoGrupo extends Autoria, DestinoGrupo {
  id: string;
  grupoAranda: string;
  grupoBook: string;
  classificacao: ClassificacaoGrupo;
  /** Todos os lugares do grupo, o principal primeiro; vazio = não se aplica */
  vinculos: DestinoGrupo[];
}

/** Consumo do grupo nos últimos 6 meses (coluna Uso) */
export interface UsoGrupo {
  apontamentos: number;
  tickets: number;
  /** Empresas com mais de um banco ativo que têm esse consumo */
  empresasMultiplos: string[];
}

/** Grupo que conta, com consumo nos últimos 12 meses e sem mapeamento ativo */
export interface GrupoNaoMapeado {
  grupoAranda: string;
  apontamentos: number;
  tickets: number;
  empresas: string[];
  /** YYYY-MM-DD */
  primeiraOcorrencia: string;
}

export interface MapeamentoInput {
  /** Ausente = mapeamento novo */
  id?: string;
  /** Só na criação: o grupo do Aranda não muda depois */
  grupoAranda: string;
  grupoBook: string;
  /** Troca todos os vínculos por este destino; ausente = os vínculos não mudam */
  destino?: DestinoGrupo;
}
