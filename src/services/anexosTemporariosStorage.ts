/**
 * Upload de arquivos para o bucket público anexos-temporarios, no formato de anexos
 * que o webhook de e-mail (Power Automate) baixa por link.
 * Usado pelo Saldo Parcial (pasta banco-horas) e pelos e-mails grandes do emailService (pasta emails).
 */

import { supabase } from '@/integrations/supabase/client';

/** Formato de anexos esperado pelo webhook de e-mail */
export interface AnexosWebhook {
  totalArquivos: number;
  tamanhoTotal: number;
  arquivos: Array<{ url: string; nome: string; tipo: string; tamanho: number; token: string }>;
}

export const ANEXOS_VAZIOS: AnexosWebhook = { totalArquivos: 0, tamanhoTotal: 0, arquivos: [] };

/** Sobe os arquivos em anexos-temporarios/<pasta> e devolve o resumo para o webhook */
export async function uploadAnexosTemporarios(files: File[], pasta = 'banco-horas'): Promise<AnexosWebhook> {
  const arquivos: AnexosWebhook['arquivos'] = [];
  let tamanhoTotal = 0;

  for (const file of files) {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(7);
    // Sanitizar nome: remover acentos, substituir espaços e caracteres especiais por underscore
    const nomeSanitizado = file.name
      .normalize('NFD').replace(/[̀-ͯ]/g, '') // remove acentos
      .replace(/[^a-zA-Z0-9._-]/g, '_');               // substitui espaços e especiais por _
    const nomeArquivo = `${pasta}/${timestamp}_${random}_${nomeSanitizado}`;

    const { error } = await supabase.storage
      .from('anexos-temporarios')
      .upload(nomeArquivo, file, { cacheControl: '3600', upsert: false });

    if (error) throw new Error(`Erro ao fazer upload de ${file.name}: ${error.message}`);

    const { data: urlData } = supabase.storage.from('anexos-temporarios').getPublicUrl(nomeArquivo);

    arquivos.push({
      url: urlData.publicUrl,
      nome: file.name,
      tipo: file.type,
      tamanho: file.size,
      token: `${timestamp}_${random}`
    });
    tamanhoTotal += file.size;
  }

  return { totalArquivos: arquivos.length, tamanhoTotal, arquivos };
}
