/**
 * Modo sombra da Fase 4 (docs/especificacoes/Modelagem_Fase4.md, seção 8): liga o
 * pacote vendor/comparacao.cjs (gerado a partir de src/services/bancosHoras do front)
 * ao client service role do sync-api.
 *
 * Etapa da sincronização: a comparação completa (todas as empresas em Legado, 12
 * meses) roda uma vez por dia, na primeira sincronização depois das 6h de Brasília
 * (P3). Nas demais, só o fechamento em sombra do que o legado fechou.
 *
 * MODO_SOMBRA_FECHAR_DESDE (data ISO) liga o fechamento em sombra: só os meses que
 * o legado fechar a partir dela (P5). Sem ela, a rotina só compara.
 */

import path from 'path';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { ResumoModoSombra } from '../scheduler/orquestradorSync';

type ResumoPacote = Omit<ResumoModoSombra, 'completa'>;

export interface OpcoesPacote {
  hoje: { mes: number; ano: number };
  fecharDesde: string | null;
  somenteFechamento: boolean;
  empresaId?: string;
}

export interface PacoteComparacao {
  rodarModoSombra(cliente: SupabaseClient, opcoes: OpcoesPacote): Promise<ResumoPacote>;
}

/** vendor/ fica na raiz do sync-api: ../../vendor a partir de src/services e de dist/services */
export function carregarPacoteComparacao(): PacoteComparacao {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  return require(path.resolve(__dirname, '..', '..', 'vendor', 'comparacao.cjs'));
}

const HORA_DA_RODADA_COMPLETA = 6;

/** Dia (AAAA-MM-DD), mês e hora em Brasília */
function emBrasilia(data: Date) {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(data);
  const valor = (tipo: string) => partes.find((p) => p.type === tipo)?.value ?? '';
  return {
    dia: `${valor('year')}-${valor('month')}-${valor('day')}`,
    mes: { mes: Number(valor('month')), ano: Number(valor('year')) },
    hora: Number(valor('hour')),
  };
}

export function criarModoSombra({
  supabase,
  pacote = carregarPacoteComparacao(),
  fecharDesde,
  agora = () => new Date(),
}: {
  supabase: SupabaseClient;
  pacote?: PacoteComparacao;
  fecharDesde: string | null;
  agora?: () => Date;
}) {
  // Dia da última comparação completa; reiniciar o serviço faz uma rodada a mais no dia
  let ultimaCompleta: string | null = null;

  return {
    async executarEtapa(): Promise<ResumoModoSombra> {
      const { dia, mes, hora } = emBrasilia(agora());
      const completa = hora >= HORA_DA_RODADA_COMPLETA && ultimaCompleta !== dia;
      const resumo = await pacote.rodarModoSombra(supabase, {
        hoje: mes,
        fecharDesde,
        somenteFechamento: !completa,
      });
      if (completa) ultimaCompleta = dia;
      return { ...resumo, completa };
    },

    /** "Recalcular" da tela: compara (e fecha em sombra) uma empresa */
    async recalcularEmpresa(empresaId: string): Promise<ResumoPacote> {
      return pacote.rodarModoSombra(supabase, {
        hoje: emBrasilia(agora()).mes,
        fecharDesde,
        somenteFechamento: false,
        empresaId,
      });
    },
  };
}
