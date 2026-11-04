/**
 * Banco do requerimento escolhido no lançamento (empresa liberada).
 *
 * Quem lança requerimento não tem acesso ao Controle, então a leitura dos
 * bancos e a gravação em requerimentos_bancos passam pelas funções
 * SECURITY DEFINER da migration 20261104000001, que conferem a permissão de
 * Lançar Requerimentos. Empresa no legado: a lista vem vazia.
 */

import { supabase } from '@/integrations/supabase/client';

type Cliente = typeof supabase;

export interface BancoDoRequerimento {
  id: string;
  nome: string;
  padrao: boolean;
  ordem: number;
  /** AAAA-MM-01 */
  inicioVigencia: string;
  /** AAAA-MM-01; nulo = sem fim */
  fimVigencia: string | null;
  /** Já escolhido para o requerimento consultado (edição) */
  escolhido: boolean;
}

interface LinhaBanco {
  banco_id: string;
  nome: string;
  padrao: boolean;
  ordem: number;
  inicio_vigencia: string;
  fim_vigencia: string | null;
  escolhido: boolean;
}

export class RequerimentoBancoService {
  constructor(private readonly cliente: Cliente = supabase) {}

  async bancosDisponiveis(
    empresaId: string,
    requerimentoId?: string
  ): Promise<BancoDoRequerimento[]> {
    const { data, error } = await this.cliente.rpc('requerimento_bancos_disponiveis', {
      p_empresa_id: empresaId,
      p_requerimento_id: requerimentoId ?? null,
    });
    if (error) throw new Error(`Erro ao carregar os bancos do requerimento: ${error.message}`);
    return ((data ?? []) as LinhaBanco[]).map((b) => ({
      id: b.banco_id,
      nome: b.nome,
      padrao: b.padrao,
      ordem: b.ordem,
      inicioVigencia: b.inicio_vigencia,
      fimVigencia: b.fim_vigencia,
      escolhido: b.escolhido,
    }));
  }

  async definirBanco(requerimentoId: string, bancoId: string): Promise<void> {
    const { error } = await this.cliente.rpc('requerimento_definir_banco', {
      p_requerimento_id: requerimentoId,
      p_banco_id: bancoId,
    });
    if (error) throw new Error(`Erro ao gravar o banco do requerimento: ${error.message}`);
  }
}

export const requerimentoBancoService = new RequerimentoBancoService();
