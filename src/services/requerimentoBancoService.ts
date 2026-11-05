/**
 * Produto/módulo do requerimento escolhido no lançamento (empresa liberada).
 *
 * Quem lança escolhe o produto (e o módulo, quando o banco do produto é por
 * módulo) entre os que os bancos do cliente cobrem; o banco sai dessa escolha
 * e nunca é o Banco padrão. Quem lança requerimento não tem acesso ao
 * Controle, então a leitura e a gravação passam pelas funções SECURITY
 * DEFINER da migration 20261105000001, que conferem a permissão de Lançar
 * Requerimentos. Empresa no legado: liberada = false, sem opções.
 */

import { supabase } from '@/integrations/supabase/client';

type Cliente = typeof supabase;

/** Um produto/módulo coberto por um banco ativo e não padrão do cliente */
export interface OpcaoDestino {
  bancoId: string;
  bancoNome: string;
  bancoOrdem: number;
  /** AAAA-MM-01 */
  inicioVigencia: string;
  /** AAAA-MM-01; nulo = sem fim */
  fimVigencia: string | null;
  produtoId: string;
  produtoNome: string;
  produtoOrdem: number;
  /** Nulo = produto sem módulos */
  moduloId: string | null;
  moduloNome: string | null;
  moduloOrdem: number | null;
  /** Módulos ativos do produto no catálogo */
  totalModulos: number;
}

export interface Destino {
  produtoId: string;
  /** Nulo = produto inteiro */
  moduloId: string | null;
}

export interface DestinosDoRequerimento {
  liberada: boolean;
  /** Já escolhido para o requerimento consultado (edição) */
  escolhido: (Destino & { bancoId: string }) | null;
  opcoes: OpcaoDestino[];
}

export class RequerimentoBancoService {
  constructor(private readonly cliente: Cliente = supabase) {}

  async destinos(empresaId: string, requerimentoId?: string): Promise<DestinosDoRequerimento> {
    const { data, error } = await this.cliente.rpc('requerimento_destinos', {
      p_empresa_id: empresaId,
      p_requerimento_id: requerimentoId ?? null,
    });
    if (error) throw new Error(`Erro ao carregar os produtos do requerimento: ${error.message}`);
    const resposta = (data ?? {}) as Partial<DestinosDoRequerimento>;
    return {
      liberada: !!resposta.liberada,
      escolhido: resposta.escolhido ?? null,
      opcoes: resposta.opcoes ?? [],
    };
  }

  /** Grava o produto/módulo; o banco é calculado no servidor e devolvido */
  async definirDestino(requerimentoId: string, destino: Destino): Promise<string> {
    const { data, error } = await this.cliente.rpc('requerimento_definir_destino', {
      p_requerimento_id: requerimentoId,
      p_produto_id: destino.produtoId,
      p_modulo_id: destino.moduloId,
    });
    if (error) throw new Error(`Erro ao gravar o produto do requerimento: ${error.message}`);
    return data as string;
  }

  /** De-para do campo Módulo antigo (Comex, Comply…) para produto/módulo do catálogo */
  async produtosDosModulosLegados(): Promise<Record<string, Destino>> {
    const { data, error } = await this.cliente
      .from('modulos_requerimento_produto')
      .select('modulo_requerimento, produto_id, modulo_id');
    if (error) throw new Error(`Erro ao carregar os módulos de requerimento: ${error.message}`);
    return Object.fromEntries(
      (data ?? []).map((l) => [
        l.modulo_requerimento,
        { produtoId: l.produto_id, moduloId: l.modulo_id ?? null },
      ])
    );
  }
}

export const requerimentoBancoService = new RequerimentoBancoService();
