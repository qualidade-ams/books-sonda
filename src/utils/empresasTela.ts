/**
 * Regras da tela Empresas que não dependem de componente: busca e filtros da lista (dentro
 * de um filtro vale qualquer opção marcada; entre filtros, todos) e o rascunho da aba
 * Informações.
 */

import { formatarHoras } from '@/components/ds/horas';
import { converterHorasParaMinutos } from '@/utils/horasUtils';
import type {
  ContratoFiscal,
  EmpresaDetalhe,
  EmpresaLista,
  ModeloEmpresa,
  SalvarInformacoesInput,
} from '@/types/empresas';
import type { Exportacao, Traduzir } from '@/utils/exportarTabela';

export type SimNao = 'sim' | 'nao';

/** Tela atual de empresas, onde a identidade é mantida até a virada (Fase 6) */
export const TELA_ATUAL_EMPRESAS = '/admin/empresas-clientes';

/** A tela atual já com a empresa aberta em edição (useAberturaPeloLink) */
export const telaAtualDaEmpresa = (empresaId: string) =>
  `${TELA_ATUAL_EMPRESAS}?editar=${encodeURIComponent(empresaId)}`;

/** A tela atual já com o cadastro de uma empresa nova aberto */
export const TELA_ATUAL_NOVA_EMPRESA = `${TELA_ATUAL_EMPRESAS}?nova=1`;

export interface FiltroEmpresas {
  busca: string;
  status: EmpresaLista['status'][];
  solucoes: string[];
  temAms: SimNao[];
  emProjeto: SimNao[];
  modelo: ModeloEmpresa[];
  soPendentes: boolean;
}

export const SEM_FILTRO_EMPRESAS: FiltroEmpresas = {
  busca: '',
  status: [],
  solucoes: [],
  temAms: [],
  emProjeto: [],
  modelo: [],
  soPendentes: false,
};

const casaSimNao = (filtro: SimNao[], valor: boolean) =>
  !filtro.length || filtro.includes(valor ? 'sim' : 'nao');

export function filtrarEmpresas(lista: EmpresaLista[], f: FiltroEmpresas): EmpresaLista[] {
  const termo = f.busca.trim().toLowerCase();
  return lista.filter(
    (e) =>
      (!termo || `${e.nomeAbreviado} ${e.nomeCompleto}`.toLowerCase().includes(termo)) &&
      (!f.status.length || f.status.includes(e.status)) &&
      (!f.solucoes.length || e.solucoes.some((s) => f.solucoes.includes(s.codigo))) &&
      casaSimNao(f.temAms, e.temAms) &&
      casaSimNao(f.emProjeto, e.emProjeto) &&
      (!f.modelo.length || f.modelo.includes(e.modelo)) &&
      (!f.soPendentes || e.pendencias.length > 0)
  );
}

/** Quantos filtros (fora a busca) estão aplicados */
export const filtrosAtivosEmpresas = (f: FiltroEmpresas) =>
  [f.status, f.solucoes, f.temAms, f.emProjeto, f.modelo].filter((x) => x.length).length +
  (f.soPendentes ? 1 : 0);

/** Opções do filtro Solução: as que aparecem nas empresas */
export const codigosDeSolucao = (lista: EmpresaLista[]) =>
  [...new Set(lista.flatMap((e) => e.solucoes.map((s) => s.codigo)))].sort((a, b) =>
    a.localeCompare(b)
  );

// ---------------------------------------------------------------------------
// Aba Informações
// ---------------------------------------------------------------------------

/** O que a tela mostra quando o Contrato FISCAL ainda não foi informado */
const FISCAL_PADRAO = {
  modalidade: 'on_premise',
  edocs24x7: false,
  atualizacaoContratada: false,
  dba: 'nao_contratado',
  bancoDados: 'sql_server',
} as const;

export const comPadraoFiscal = (f: ContratoFiscal): ContratoFiscal => ({
  ...f,
  modalidade: f.modalidade ?? FISCAL_PADRAO.modalidade,
  edocs24x7: f.edocs24x7 ?? FISCAL_PADRAO.edocs24x7,
  atualizacaoContratada: f.atualizacaoContratada ?? FISCAL_PADRAO.atualizacaoContratada,
  dba: f.dba ?? FISCAL_PADRAO.dba,
  bancoDados: f.bancoDados ?? FISCAL_PADRAO.bancoDados,
});

/** Campos da aba como são editados; as horas de DBA ficam em HH:MM */
export interface RascunhoInformacoes {
  idAranda: string;
  organizacoes: string[];
  ramoId: string | null;
  ramoSecundarioId: string | null;
  descricaoAtividade: string;
  fiscal: ContratoFiscal;
  horasAtendimento: string;
  horasMonitoramento: string;
}

const horasOuVazio = (minutos: number | null) => (minutos === null ? '' : formatarHoras(minutos));

export const rascunhoInformacoes = (
  e: Pick<EmpresaDetalhe, 'idAranda' | 'organizacoes' | 'informacoes'>
): RascunhoInformacoes => ({
  idAranda: e.idAranda ?? '',
  organizacoes: e.organizacoes.map((o) => o.nome),
  ramoId: e.informacoes.ramoId,
  ramoSecundarioId: e.informacoes.ramoSecundarioId,
  descricaoAtividade: e.informacoes.descricaoAtividade ?? '',
  fiscal: comPadraoFiscal(e.informacoes.fiscal),
  horasAtendimento: horasOuVazio(e.informacoes.fiscal.minutosAtendimento),
  horasMonitoramento: horasOuVazio(e.informacoes.fiscal.minutosMonitoramento),
});

const HORAS = /^\d{1,3}:[0-5]\d$/;
const minutosOuNulo = (horas: string) =>
  horas.trim() ? converterHorasParaMinutos(horas.trim()) : null;

/** Horas de DBA vazias ou em HH:MM */
export const horasDoRascunhoValidas = (r: RascunhoInformacoes) =>
  [r.horasAtendimento, r.horasMonitoramento].every((h) => !h.trim() || HORAS.test(h.trim()));

/** Os campos que deixam de se aplicar ficam guardados (RN-33) */
export const informacoesParaSalvar = (r: RascunhoInformacoes): SalvarInformacoesInput => ({
  idAranda: r.idAranda.trim() || null,
  organizacoes: r.organizacoes,
  informacoes: {
    ramoId: r.ramoId,
    ramoSecundarioId: r.ramoSecundarioId,
    descricaoAtividade: r.descricaoAtividade.trim() || null,
    fiscal: {
      ...r.fiscal,
      minutosAtendimento: minutosOuNulo(r.horasAtendimento),
      minutosMonitoramento: minutosOuNulo(r.horasMonitoramento),
    },
  },
});

/** Exportação da lista de empresas, com as soluções pelo código */
export function exportacaoEmpresas(empresas: EmpresaLista[], t: Traduzir): Exportacao {
  const coluna = (rotulo: string, valor: (e: EmpresaLista) => string | null) => ({
    rotulo: t(rotulo),
    valor,
  });
  const codigos = (e: EmpresaLista, filtro: (s: EmpresaLista['solucoes'][number]) => boolean) =>
    e.solucoes
      .filter(filtro)
      .map((s) => s.codigo)
      .join(', ');
  return {
    arquivo: t('empresasCadastro.exportar.arquivo'),
    titulo: t('empresasCadastro.titulo'),
    abas: [
      {
        nome: t('empresasCadastro.titulo'),
        linhas: empresas,
        colunas: [
          coluna('empresasCadastro.exportar.colunas.abreviado', (e) => e.nomeAbreviado),
          coluna('empresasCadastro.exportar.colunas.completo', (e) => e.nomeCompleto),
          coluna('empresasCadastro.filtros.status', (e) =>
            t(
              e.status === 'ativo'
                ? 'empresasCadastro.situacao.ativa'
                : 'empresasCadastro.situacao.inativa'
            )
          ),
          coluna('empresasCadastro.filtros.modelo', (e) =>
            t(`empresasCadastro.modelo.${e.modelo}`)
          ),
          coluna('empresasCadastro.lista.colunaSolucoes', (e) => codigos(e, () => true)),
          coluna('empresasCadastro.exportar.colunas.ams', (e) => codigos(e, (s) => s.temAms)),
          coluna('empresasCadastro.exportar.colunas.projeto', (e) =>
            e.solucoes
              .filter((s) => s.emProjeto)
              .map((s) => `${s.codigo}: ${s.justificativaProjeto ?? ''}`)
              .join(' · ')
          ),
          coluna('empresasCadastro.exportar.colunas.cs', (e) => e.emailCs),
          coluna('empresasCadastro.exportar.colunas.comercial', (e) => e.emailComercial),
          coluna('empresasCadastro.exportar.colunas.observacao', (e) => e.observacao),
        ],
      },
    ],
  };
}
