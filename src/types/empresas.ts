/**
 * Empresas, tela nova (Modelagem_Fase3.md, seção 3). Na transição (Fases 3 a 5),
 * identidade, contatos, grupos, anexos e Book chegam da tela atual só para
 * leitura; aqui se editam AMS e projeto por solução, organizações do Aranda,
 * ramo e Contrato FISCAL (e os bancos, em bancosHorasCadastro).
 */

import type { Autoria } from '@/types/catalogo';

/**
 * legado: modelo atual com um banco · multiplo: modelo atual, já com mais de um
 * banco em validação · liberada: já usa bancos múltiplos (modelo_calculo = multiplo)
 */
export type ModeloEmpresa = 'legado' | 'multiplo' | 'liberada';

/** Informação nova ainda não preenchida (RN-35) */
export type Pendencia = 'ramo' | 'contrato_fiscal' | 'organizacao' | 'projeto_sem_solucao';

export interface SolucaoDaEmpresa {
  /** id da linha em empresas_solucoes */
  id: string;
  solucaoId: string;
  codigo: string;
  nome: string;
  temAms: boolean;
  emProjeto: boolean;
  justificativaProjeto: string | null;
}

export interface EmpresaLista {
  id: string;
  nomeAbreviado: string;
  nomeCompleto: string;
  status: 'ativo' | 'inativo';
  modelo: ModeloEmpresa;
  solucoes: SolucaoDaEmpresa[];
  /** Alguma solução com AMS */
  temAms: boolean;
  /** Empresa marcada em projeto (espelha a tela atual na transição) */
  emProjeto: boolean;
  pendencias: Pendencia[];
  emailCs: string | null;
  emailComercial: string | null;
  /** Nome pelo e-mail (profiles); nulo = e-mail sem cadastro */
  nomeCs: string | null;
  nomeComercial: string | null;
  observacao: string | null;
}

export interface TotaisEmpresas {
  total: number;
  ativas: number;
  inativas: number;
  pendentes: number;
}

export type FiscalModalidade = 'saas' | 'on_premise';
export type FiscalDba =
  'atendimento' | 'monitoramento' | 'atendimento_monitoramento' | 'nao_contratado';
export type FiscalBancoDados = 'sql_server' | 'oracle';

/** Nulo = não informado (pendente). Campos que deixam de se aplicar ficam guardados (RN-33) */
export interface ContratoFiscal {
  modalidade: FiscalModalidade | null;
  edocs24x7: boolean | null;
  atualizacaoContratada: boolean | null;
  atualizacoesPorAno: number | null;
  dba: FiscalDba | null;
  /** Horas contratadas por mês, em minutos (P2) */
  minutosAtendimento: number | null;
  minutosMonitoramento: number | null;
  bancoDados: FiscalBancoDados | null;
}

export interface InformacoesContrato {
  ramoId: string | null;
  ramoSecundarioId: string | null;
  descricaoAtividade: string | null;
  fiscal: ContratoFiscal;
}

export interface Organizacao {
  id: string;
  nome: string;
}

export interface Contato {
  id: string;
  nome: string;
  email: string;
  finalidade: string;
  principal: boolean;
  ativo: boolean;
}

export interface GrupoResponsavel {
  id: string;
  nome: string;
  descricao: string | null;
}

export interface Anexo {
  id: string;
  nome: string;
  tamanhoBytes: number;
  storagePath: string;
}

export interface BookEmpresa {
  tipoBook: 'nao_tem_book' | 'qualidade' | 'outros';
  /** 'portugues', 'ingles' ou id de email_templates */
  templatePadrao: string | null;
  linkSharepoint: string | null;
  bookPersonalizado: boolean;
  bookAnexo: boolean;
  consolidadora: { id: string; nomeAbreviado: string } | null;
  metaSlaPercentual: number | null;
  quantidadeMinimaChamadosSla: number | null;
}

export interface EmpresaDetalhe extends Autoria {
  id: string;
  nomeAbreviado: string;
  nomeCompleto: string;
  grupoEmpresarial: string | null;
  status: 'ativo' | 'inativo';
  modelo: ModeloEmpresa;
  /** YYYY-MM-DD */
  vigenciaInicio: string | null;
  vigenciaFim: string | null;
  emailCs: string | null;
  emailComercial: string | null;
  emailTm: string | null;
  observacao: string | null;
  emProjeto: boolean;
  idAranda: string | null;
  solucoes: SolucaoDaEmpresa[];
  informacoes: InformacoesContrato;
  organizacoes: Organizacao[];
  contatos: Contato[];
  grupos: GrupoResponsavel[];
  anexos: Anexo[];
  book: BookEmpresa;
  pendencias: Pendencia[];
}

/** AMS e projeto de uma solução já contratada (a solução em si vem da tela atual) */
export interface SolucaoAmsInput {
  id: string;
  temAms: boolean;
  emProjeto: boolean;
  justificativaProjeto: string | null;
}

export interface SalvarInformacoesInput {
  idAranda: string | null;
  /** Lista completa dos nomes das organizações ativas */
  organizacoes: string[];
  informacoes: InformacoesContrato;
}
