/**
 * Serviço para gerenciamento de versões de Books
 * Controla o ciclo de vida: gerado → enviado → retificação → nova versão
 */

import { supabase } from '@/integrations/supabase/client';

export interface BookVersao {
  id: string;
  book_id: string;
  versao: number;
  dados_capa: any;
  dados_volumetria: any;
  dados_sla: any;
  dados_backlog: any;
  dados_consumo: any;
  dados_pesquisa: any;
  pdf_url: string | null;
  pdf_gerado_em: string | null;
  enviado_em: string;
  enviado_por: string | null;
  destinatarios: string[];
  motivo_retificacao: string | null;
  retificado_por: string | null;
  retificado_em: string | null;
  created_at: string;
}

class BooksVersioningService {
  /**
   * Registra o envio de um book, criando um snapshot imutável
   * e travando o book contra edições futuras.
   */
  async registrarEnvio(
    bookId: string,
    destinatarios: string[]
  ): Promise<{ success: boolean; versaoId?: string; error?: string }> {
    try {
      // Obter usuário atual
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'Usuário não autenticado' };
      }

      // Chamar função RPC do banco
      const { data, error } = await supabase.rpc('registrar_envio_book', {
        p_book_id: bookId,
        p_usuario_id: user.id,
        p_destinatarios: destinatarios
      });

      if (error) {
        console.error('❌ Erro ao registrar envio:', error);
        return { success: false, error: error.message };
      }

      console.log('✅ Envio registrado com sucesso. Versão ID:', data);
      return { success: true, versaoId: data };
    } catch (error) {
      console.error('❌ Erro inesperado ao registrar envio:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Erro desconhecido' 
      };
    }
  }

  /**
   * Inicia o processo de retificação de um book enviado.
   * Desbloqueia o book para regeneração e incrementa a versão.
   */
  async iniciarRetificacao(
    bookId: string,
    motivo: string
  ): Promise<{ success: boolean; novaVersao?: number; error?: string }> {
    try {
      // Obter usuário atual
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { success: false, error: 'Usuário não autenticado' };
      }

      // Validar motivo
      if (!motivo || motivo.trim().length < 10) {
        return { success: false, error: 'Motivo da retificação deve ter pelo menos 10 caracteres' };
      }

      // Chamar função RPC do banco
      const { data, error } = await supabase.rpc('iniciar_retificacao_book', {
        p_book_id: bookId,
        p_usuario_id: user.id,
        p_motivo: motivo.trim()
      });

      if (error) {
        console.error('❌ Erro ao iniciar retificação:', error);
        return { success: false, error: error.message };
      }

      console.log('✅ Retificação iniciada. Nova versão:', data);
      return { success: true, novaVersao: data };
    } catch (error) {
      console.error('❌ Erro inesperado ao iniciar retificação:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Erro desconhecido' 
      };
    }
  }

  /**
   * Busca o histórico de versões de um book
   */
  async buscarVersoes(bookId: string): Promise<BookVersao[]> {
    try {
      const { data, error } = await supabase
        .from('books_versoes')
        .select('*')
        .eq('book_id', bookId)
        .order('versao', { ascending: false });

      if (error) {
        console.error('❌ Erro ao buscar versões:', error);
        return [];
      }

      return (data || []) as BookVersao[];
    } catch (error) {
      console.error('❌ Erro inesperado ao buscar versões:', error);
      return [];
    }
  }

  /**
   * Busca uma versão específica de um book
   */
  async buscarVersao(bookId: string, versao: number): Promise<BookVersao | null> {
    try {
      const { data, error } = await supabase
        .from('books_versoes')
        .select('*')
        .eq('book_id', bookId)
        .eq('versao', versao)
        .single();

      if (error) {
        console.error('❌ Erro ao buscar versão:', error);
        return null;
      }

      return data as BookVersao;
    } catch (error) {
      console.error('❌ Erro inesperado ao buscar versão:', error);
      return null;
    }
  }

  /**
   * Verifica se um book pode ser atualizado (não está enviado)
   */
  isBookEditavel(status: string): boolean {
    return status !== 'enviado';
  }

  /**
   * Verifica se um book pode ser retificado (está enviado)
   */
  isBookRetificavel(status: string): boolean {
    return status === 'enviado';
  }
}

export const booksVersioningService = new BooksVersioningService();
