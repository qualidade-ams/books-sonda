/**
 * Regras de contagem (Modelagem_Fase3.md, seção 5). Lê a linha única de
 * regras_contagem e o uso dos códigos de resolução; grava tudo numa chamada a
 * salvar_regras_contagem, que exige o motivo e o registra na auditoria.
 */

import { supabase } from '@/integrations/supabase/client';
import { ErroTraduzivel, falhaDoBanco } from '@/errors/erroTraduzivel';
import type { FiltrosContagem, RegrasContagem, SalvarRegrasInput } from '@/types/regrasContagem';

type Cliente = typeof supabase;

/** Meses do uso dos códigos (coluna "Últimos 6 meses") */
const MESES_USO = 6;

const falha = falhaDoBanco;

const filtrosParaBanco = (f: FiltrosContagem) => ({
  grupos_que_contam: f.gruposQueContam,
  tipos_chamado: f.tiposChamado,
  ignorar_atividade_interna: f.ignorarAtividadeInterna,
  itens_excluidos: f.itensExcluidos,
  so_tickets_fechados: f.soTicketsFechados,
});

export class RegrasContagemService {
  constructor(private readonly cliente: Cliente = supabase) {}

  async carregar(): Promise<RegrasContagem> {
    const [regras, uso] = await Promise.all([
      this.cliente.from('regras_contagem').select('*').eq('id', 1).single(),
      this.cliente.rpc('codigos_resolucao_uso', { p_meses: MESES_USO }),
    ]);
    const erro = regras.error ?? uso.error;
    if (erro) throw falha('carregar as regras de contagem', erro);

    const r = regras.data;
    return {
      filtros: {
        gruposQueContam: r.grupos_que_contam,
        tiposChamado: r.tipos_chamado,
        ignorarAtividadeInterna: r.ignorar_atividade_interna,
        itensExcluidos: r.itens_excluidos,
        soTicketsFechados: r.so_tickets_fechados,
      },
      codigos: uso.data
        .filter((c) => c.tem_regra)
        .map((c) => ({
          codigo: c.codigo,
          contaHoras: c.conta_horas,
          contaTickets: c.conta_tickets,
          apontamentos6m: c.apontamentos,
          tickets6m: c.tickets,
        })),
      codigosSemRegra: uso.data
        .filter((c) => !c.tem_regra)
        .map((c) => ({
          codigo: c.codigo,
          apontamentos6m: c.apontamentos,
          tickets6m: c.tickets,
          primeiraOcorrencia: c.primeira_ocorrencia,
        })),
      atualizadoEm: r.updated_at,
      atualizadoPor: r.updated_by,
    };
  }

  async salvar(input: SalvarRegrasInput): Promise<void> {
    const motivo = input.motivo.trim();
    if (!motivo) throw new ErroTraduzivel('erros.motivo', {}, 'Informe o motivo da alteração.');

    const { error } = await this.cliente.rpc('salvar_regras_contagem', {
      p_motivo: motivo,
      p_regras: input.filtros ? filtrosParaBanco(input.filtros) : null,
      p_codigos: input.codigos
        ? input.codigos.map((c) => ({
            codigo: c.codigo,
            conta_horas: c.contaHoras,
            conta_tickets: c.contaTickets,
          }))
        : null,
    });
    if (error) throw falha('salvar as regras de contagem', error);
  }
}

export const regrasContagemService = new RegrasContagemService();
