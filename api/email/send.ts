/**
 * API Route para envio de e-mail
 * Endpoint: POST /api/email/send
 *
 * Proxy autenticado para o webhook do Power Automate. A URL assinada do webhook
 * fica só no servidor (webhook_config, lida com service role) e nunca chega ao navegador.
 * Body: o mesmo payload que antes era enviado direto ao webhook.
 *
 * Compatível com Vercel Serverless Functions (Node.js runtime)
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';
import { encaminharEmail } from './_lib/encaminharEmail';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '';

  if (!supabaseUrl || !supabaseServiceRoleKey || !supabaseAnonKey) {
    console.error('api/email/send: variáveis de ambiente do Supabase não configuradas');
    return res.status(500).json({ success: false, error: 'Serviço de e-mail não configurado' });
  }

  const opcoesSemSessao = { auth: { autoRefreshToken: false, persistSession: false } };
  const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, opcoesSemSessao);
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, opcoesSemSessao);

  const resposta = await encaminharEmail(req.headers['authorization'] as string | undefined, req.body, {
    validarToken: async (token) => {
      const { data, error } = await supabaseAuth.auth.getUser(token);
      return !error && !!data?.user;
    },
    buscarWebhookUrl: async () => {
      const { data, error } = await supabaseAdmin
        .from('webhook_config')
        .select('webhook_url')
        .eq('ativo', true)
        .limit(1)
        .maybeSingle();
      if (error) {
        console.error('api/email/send: erro ao ler webhook_config:', error.message);
        return null;
      }
      return data?.webhook_url || null;
    },
    fetch
  });

  res.status(resposta.status);
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  return res.send(resposta.corpo);
}
