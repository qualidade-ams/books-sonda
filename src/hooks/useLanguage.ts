import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from './useAuth';
import { supabase } from '@/integrations/supabase/client';
import type { SupportedLanguage } from '@/i18n';

/**
 * Hook para gerenciar a preferência de idioma do usuário.
 * Sincroniza com localStorage (para resposta imediata) e com o Supabase (persistência).
 */
export const useLanguage = () => {
  const { i18n } = useTranslation();
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [currentLanguage, setCurrentLanguage] = useState<SupportedLanguage>(
    (i18n.language as SupportedLanguage) || 'pt-BR'
  );

  // Carregar idioma do perfil do usuário no Supabase ao fazer login
  const loadLanguageFromProfile = useCallback(async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('language')
        .eq('id', user.id)
        .single();

      if (error) {
        console.warn('⚠️ Erro ao buscar idioma do perfil:', error.message);
        return;
      }

      if (data?.language && data.language !== i18n.language) {
        await i18n.changeLanguage(data.language);
        setCurrentLanguage(data.language as SupportedLanguage);
        localStorage.setItem('books-snd-language', data.language);
      }
    } catch (err) {
      console.warn('⚠️ Erro ao carregar idioma:', err);
    }
  }, [user?.id, i18n]);

  // Carregar idioma quando o user fizer login
  useEffect(() => {
    if (user?.id) {
      loadLanguageFromProfile();
    }
  }, [user?.id, loadLanguageFromProfile]);

  // Alterar idioma (salva no localStorage + Supabase)
  const changeLanguage = useCallback(async (language: SupportedLanguage): Promise<boolean> => {
    setIsLoading(true);

    try {
      // 1. Alterar imediatamente no i18n (feedback instantâneo)
      await i18n.changeLanguage(language);
      setCurrentLanguage(language);
      localStorage.setItem('books-snd-language', language);

      // 2. Persistir no Supabase (se logado)
      if (user?.id) {
        const { error } = await supabase
          .from('profiles')
          .update({ language, updated_at: new Date().toISOString() })
          .eq('id', user.id);

        if (error) {
          console.error('❌ Erro ao salvar idioma no perfil:', error.message);
          return false;
        }
      }

      return true;
    } catch (err) {
      console.error('❌ Erro ao alterar idioma:', err);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [i18n, user?.id]);

  return {
    currentLanguage,
    changeLanguage,
    isLoading,
  };
};
