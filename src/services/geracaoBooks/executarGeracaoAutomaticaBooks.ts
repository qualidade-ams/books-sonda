/**
 * Geração automática de books (agendamento "Geração de Books" na tela
 * Sincronização SQL Server, executado pelo sync-api).
 *
 * Mesmo critério da tela Geração de Books: período de referência = mês anterior;
 * processa as empresas liberadas (período padrão, ou dia de início de apuração
 * já alcançado) e ainda não enviadas. Cada uma passa pelo ciclo completo de
 * gerarEEnviarBook. Erro em uma empresa não interrompe as demais; como as
 * enviadas são puladas, a próxima execução tenta de novo só as que falharam.
 */

import { booksService } from '@/services/booksService';
import { MESES_LABELS } from '@/types/books';
import { gerarEEnviarBook, type DependenciasGerarEnviarBook } from './gerarEnviarBook';

/** Pausa entre empresas para respeitar o limite de execuções simultâneas do Power Automate */
export const INTERVALO_ENTRE_ENVIOS_MS = 10_000;

const FUSO = 'America/Sao_Paulo';

export interface ResumoGeracaoBooks {
  mes: number;
  ano: number;
  /** empresas processadas (liberadas e ainda não enviadas) */
  total: number;
  gerados: number;
  erros: number;
  /** já enviadas ou ainda não liberadas no dia */
  pulados: number;
  empresas: { empresa: string; sucesso: boolean; erro?: string }[];
}

export interface DependenciasGeracaoAutomaticaBooks extends DependenciasGerarEnviarBook {
  agora?: Date;
  log?: (mensagem: string, nivel?: 'info' | 'erro') => void;
  intervaloEntreEnviosMs?: number;
  esperar?: (ms: number) => Promise<void>;
}

const esperarPadrao = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

/** Mês de referência (anterior ao atual) e dia de hoje, no fuso de São Paulo */
export function periodoReferenciaBooks(agora: Date): { mes: number; ano: number; diaHoje: number } {
  const partes = new Intl.DateTimeFormat('en-US', { timeZone: FUSO, year: 'numeric', month: 'numeric', day: 'numeric' })
    .formatToParts(agora)
    .reduce<Record<string, number>>((acc, p) => (p.type === 'literal' ? acc : { ...acc, [p.type]: Number(p.value) }), {});

  const mes = partes.month === 1 ? 12 : partes.month - 1;
  const ano = partes.month === 1 ? partes.year - 1 : partes.year;
  return { mes, ano, diaHoje: partes.day };
}

/** Empresas com período customizado (ex.: dia 15) só podem ser geradas a partir daquele dia */
export function empresaLiberadaParaGeracao(diaInicioApuracao: number | undefined, diaHoje: number): boolean {
  const diaInicio = diaInicioApuracao ?? 1;
  return diaInicio === 1 || diaHoje >= diaInicio;
}

const mensagemDeErro = (e: unknown) => (e instanceof Error ? e.message : String(e ?? 'Erro desconhecido'));

export async function executarGeracaoAutomaticaBooks(deps: DependenciasGeracaoAutomaticaBooks): Promise<ResumoGeracaoBooks> {
  const { gerarPdf, enviarEmail, responsavelId } = deps;
  const log = deps.log ?? (() => {});
  const esperar = deps.esperar ?? esperarPadrao;
  const intervalo = deps.intervaloEntreEnviosMs ?? INTERVALO_ENTRE_ENVIOS_MS;

  const { mes, ano, diaHoje } = periodoReferenciaBooks(deps.agora ?? new Date());
  const books = await booksService.listarBooks({ mes, ano }, { propagarErro: true });
  const candidatos = books.filter(
    (b) => b.status !== 'enviado' && empresaLiberadaParaGeracao(b.dia_inicio_apuracao, diaHoje)
  );

  const resumo: ResumoGeracaoBooks = {
    mes,
    ano,
    total: candidatos.length,
    gerados: 0,
    erros: 0,
    pulados: books.length - candidatos.length,
    empresas: []
  };

  log(
    `Período de referência ${MESES_LABELS[mes]}/${ano}: ${resumo.total} book(s) a gerar, ` +
      `${resumo.pulados} pulado(s) (já enviados ou ainda não liberados)`
  );

  for (const [i, book] of candidatos.entries()) {
    if (i > 0) await esperar(intervalo);
    const nome = book.empresa_nome_abreviado || book.empresa_nome;

    try {
      await gerarEEnviarBook(book, mes, ano, { gerarPdf, enviarEmail, responsavelId });
      resumo.gerados++;
      resumo.empresas.push({ empresa: nome, sucesso: true });
      log(`[${i + 1}/${resumo.total}] ${nome}: gerado e enviado`);
    } catch (e) {
      resumo.erros++;
      resumo.empresas.push({ empresa: nome, sucesso: false, erro: mensagemDeErro(e) });
      log(`${nome}: ${mensagemDeErro(e)}`, 'erro');
    }
  }

  return resumo;
}
