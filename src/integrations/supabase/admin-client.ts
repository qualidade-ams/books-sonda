/**
 * Cliente Supabase com service role para operações administrativas
 * ATENÇÃO: Usar apenas para operações que não expõem dados sensíveis
 */

import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_SECRET_KEY = import.meta.env.VITE_SUPABASE_SECRET_KEY;

// Validar se as variáveis de ambiente estão definidas
if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) {
  throw new Error('Variáveis de ambiente VITE_SUPABASE_URL e VITE_SUPABASE_SECRET_KEY são obrigatórias');
}

// Cliente com secret key - USAR COM CUIDADO!
export const supabaseAdmin = createClient<Database>(SUPABASE_URL, SUPABASE_SECRET_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Cache em memória para especialistas (válido por 10 minutos)
let especialistasCache: {
  data: any[];
  timestamp: number;
  ttl: number;
} | null = null;

const CACHE_TTL = 10 * 60 * 1000; // 10 minutos

// Função otimizada para buscar especialistas ativos com cache
export async function buscarEspecialistasAtivos() {
  // Verificar cache
  if (especialistasCache && 
      (Date.now() - especialistasCache.timestamp) < especialistasCache.ttl) {
    console.log('✅ [Cache] Retornando especialistas do cache');
    return especialistasCache.data;
  }

  console.log('🔄 [DB] Buscando especialistas no banco...');
  
  const { data, error } = await supabaseAdmin
    .from('especialistas')
    .select(`
      id,
      nome,
      email,
      codigo,
      empresa,
      departamento,
      cargo
    `)
    .eq('status', 'ativo')
    .order('nome', { ascending: true })
    .limit(1000); // Limitar para evitar consultas muito grandes

  if (error) {
    console.error('Erro ao buscar especialistas ativos:', error);
    throw error;
  }

  // Atualizar cache
  especialistasCache = {
    data: data || [],
    timestamp: Date.now(),
    ttl: CACHE_TTL
  };

  console.log(`✅ [DB] ${data?.length || 0} especialistas carregados e armazenados em cache`);
  return data || [];
}

// Função para limpar cache (útil após sincronização)
export function limparCacheEspecialistas() {
  especialistasCache = null;
  console.log('🧹 Cache de especialistas limpo');
}

// Função para buscar especialista por ID (operação segura)
export async function buscarEspecialistaPorId(id: string) {
  const { data, error } = await supabaseAdmin
    .from('especialistas')
    .select('id, nome, email, codigo, empresa, departamento, cargo')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return null; // Não encontrado
    }
    console.error('Erro ao buscar especialista por ID:', error);
    throw error;
  }

  return data;
}