/**
 * Uploads usados pelo e-mail de Saldo Parcial (envio manual e automático):
 * imagem das tabelas (bucket email-images) e anexos (bucket anexos-temporarios, pasta banco-horas).
 */

import { supabase } from '@/integrations/supabase/client';
import { uploadAnexosTemporarios as uploadAnexos } from '@/services/anexosTemporariosStorage';
import type { AnexosWebhook } from '@/services/anexosTemporariosStorage';

export { ANEXOS_VAZIOS, type AnexosWebhook } from '@/services/anexosTemporariosStorage';

/**
 * Sobe a imagem PNG (base64) das tabelas e devolve a URL pública.
 * Retorna null se o upload falhar (o chamador usa a imagem em base64).
 */
export async function uploadImagemTabelas(imagemBase64: string, empresaNome: string): Promise<string | null> {
  try {
    const byteCharacters = atob(imagemBase64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const blob = new Blob([new Uint8Array(byteNumbers)], { type: 'image/png' });

    const fileName = `banco-horas-${empresaNome.replace(/\s+/g, '-')}-${Date.now()}.png`;
    const { error: uploadError } = await supabase.storage
      .from('email-images')
      .upload(fileName, blob, {
        contentType: 'image/png',
        upsert: false
      });

    if (uploadError) {
      console.warn('⚠️ Erro ao fazer upload da imagem:', uploadError.message);
      return null;
    }

    const { data: urlData } = supabase.storage.from('email-images').getPublicUrl(fileName);
    return urlData?.publicUrl || null;
  } catch (error) {
    console.warn('⚠️ Erro ao salvar imagem no Storage:', error instanceof Error ? error.message : error);
    return null;
  }
}

/** Sobe os arquivos em anexos-temporarios/banco-horas e devolve o resumo para o webhook */
export function uploadAnexosTemporarios(files: File[]): Promise<AnexosWebhook> {
  return uploadAnexos(files, 'banco-horas');
}
