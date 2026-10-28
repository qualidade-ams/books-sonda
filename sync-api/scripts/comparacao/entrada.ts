/**
 * Ponto de entrada do pacote vendor/comparacao.cjs (gerado por build-comparacao.mjs).
 * Reexporta o modo sombra do front (src/services/bancosHoras/sombra.ts) para o sync-api,
 * com os repositórios sobre o client service role que o servidor passa.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { executarModoSombra, type OpcoesSombra, type ResumoSombra } from '@/services/bancosHoras/sombra';
import { criarRepositorioSupabase, type ClienteSupabase } from '@/services/bancosHoras/repositorioSupabase';
import { criarRepositorioSombra } from '@/services/bancosHoras/repositorioSombra';

export function rodarModoSombra(
  cliente: SupabaseClient,
  opcoes: OpcoesSombra & { empresaId?: string }
): Promise<ResumoSombra> {
  const c = cliente as unknown as ClienteSupabase;
  return executarModoSombra(
    // Um repositório por empresa: o cache de leituras não passa de uma empresa para outra
    { motor: () => criarRepositorioSupabase(c), sombra: criarRepositorioSombra(c) },
    opcoes
  );
}
