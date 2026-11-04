/**
 * Edge Function consulta-empresas: leitura de empresas para sistemas externos.
 *
 * GET /functions/v1/consulta-empresas[?status=ativo|inativo]
 * Header obrigatório: x-api-key: <EMPRESAS_LEITURA_API_KEY>
 * Resposta: { data: [{ nome_completo, nome_abreviado, status }] }
 *
 * Deploy sem verificação de JWT (o acesso é pela chave própria):
 *   supabase secrets set EMPRESAS_LEITURA_API_KEY=<chave gerada>
 *   supabase functions deploy consulta-empresas --no-verify-jwt
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { tratarRequisicao, type EmpresaLeitura, type FiltroEmpresas } from './logica.ts';

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  { auth: { autoRefreshToken: false, persistSession: false } }
);

async function buscarEmpresas(filtro: FiltroEmpresas): Promise<EmpresaLeitura[]> {
  let consulta = supabaseAdmin
    .from('empresas')
    .select('nome_completo, nome_abreviado, status')
    .order('nome_abreviado', { ascending: true });

  if (filtro.status) consulta = consulta.eq('status', filtro.status);

  const { data, error } = await consulta;
  if (error) throw new Error(error.message);
  return data ?? [];
}

serve((req) =>
  tratarRequisicao(req, {
    chaveEsperada: Deno.env.get('EMPRESAS_LEITURA_API_KEY') ?? '',
    buscarEmpresas,
  })
);
