/**
 * Hook para detectar o idioma do template baseado no nome na tabela email_templates
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { isEnglishTemplateByName } from '@/utils/bancoHorasI18n';

/**
 * Hook que busca o nome do template na tabela email_templates
 * e detecta se é em inglês baseado no nome
 */
export function useTemplateLanguage(templateId?: string) {
  const { data: templateData, isLoading } = useQuery({
    queryKey: ['template-language', templateId],
    queryFn: async () => {
      if (!templateId) return null;
      
      console.log('🔍 [useTemplateLanguage] Buscando template:', templateId);
      
      const { data, error } = await supabase
        .from('email_templates')
        .select('id, nome, tipo')
        .eq('id', templateId)
        .single();
      
      if (error) {
        console.error('❌ [useTemplateLanguage] Erro ao buscar template:', error);
        return null;
      }
      
      console.log('✅ [useTemplateLanguage] Template encontrado:', {
        id: data.id,
        nome: data.nome,
        tipo: data.tipo
      });
      
      return data;
    },
    enabled: !!templateId,
    staleTime: 5 * 60 * 1000, // 5 minutos
    cacheTime: 10 * 60 * 1000, // 10 minutos
  });
  
  // Detectar se é inglês baseado no nome do template
  const isEnglish = templateData ? isEnglishTemplateByName(templateData.nome) : false;
  
  console.log('🌐 [useTemplateLanguage] Resultado:', {
    templateId,
    templateName: templateData?.nome,
    isEnglish,
    isLoading
  });
  
  return {
    templateData,
    isEnglish,
    isLoading
  };
}