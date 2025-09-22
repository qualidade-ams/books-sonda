import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { EmailTemplate } from '@/types/approval';
import type { FormularioType, ModalidadeType } from '@/types/formTypes';

// Função helper para mapear dados do Supabase para EmailTemplate
const mapSupabaseToEmailTemplate = (data: any): EmailTemplate => {

  const result = {
    id: data.id,
    nome: data.nome,
    assunto: data.assunto,
    corpo: data.corpo,
    descricao: data.descricao || null,
    tipo: data.tipo || 'book',
    ativo: data.ativo !== undefined ? data.ativo : true,
    vinculado_formulario: data.vinculado_formulario !== undefined ? data.vinculado_formulario : true,
    formulario: data.formulario as FormularioType | null,
    modalidade: data.modalidade as ModalidadeType,
    created_at: data.created_at,
    updated_at: data.updated_at
  };
  return result;
};

export const useEmailTemplates = () => {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('email_templates')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao buscar templates de e-mail:', error);
        setTemplates([]);
        return;
      }

      // Filtrar apenas templates válidos (book) e atualizar templates antigos
      const validTemplates = (data || []).filter(template => {
        // Aceitar templates sem formulário definido (templates antigos) ou com formulário 'book'
        return !template.formulario || template.formulario === 'book';
      });

      const mappedTemplates = validTemplates.map(mapSupabaseToEmailTemplate);

      // ✅ CORREÇÃO: Remover duplicatas por nome
      const uniqueTemplates = mappedTemplates.filter((template, index, self) =>
        index === self.findIndex(t => t.nome === template.nome)
      );

      console.log('📧 Templates antes da deduplicação:', mappedTemplates.length);
      console.log('📧 Templates após deduplicação:', uniqueTemplates.length);

      if (mappedTemplates.length !== uniqueTemplates.length) {
        console.warn('⚠️ Templates duplicados removidos:', mappedTemplates.length - uniqueTemplates.length);
      }

      setTemplates(uniqueTemplates);

      // Atualizar templates antigos que não têm formulário definido
      const templatesParaAtualizar = (data || []).filter(template =>
        !template.formulario && template.nome
      );

      if (templatesParaAtualizar.length > 0) {
        for (const template of templatesParaAtualizar) {
          await supabase
            .from('email_templates')
            .update({
              formulario: 'book',
              vinculado_formulario: true,
              tipo: 'book'
            })
            .eq('id', template.id);
        }
      }
    } catch (error) {
      console.error('Erro ao buscar templates:', error);
      setTemplates([]);
    }
  };

  const createTemplate = async (template: Omit<EmailTemplate, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      console.log('Criando template com dados:', template);

      // Verificar se já existe um template com o mesmo nome
      const { data: existingTemplates, error: checkError } = await supabase
        .from('email_templates')
        .select('id, nome')
        .eq('nome', template.nome)
        .eq('formulario', template.formulario || 'book');

      if (checkError) {
        console.error('Erro ao verificar templates existentes:', checkError);
        throw checkError;
      }

      if (existingTemplates && existingTemplates.length > 0) {
        toast({
          title: "Template duplicado",
          description: `Já existe um template com o nome "${template.nome}" para este formulário.`,
          variant: "destructive",
        });
        return { success: false, error: 'Template duplicado' };
      }

      const templateData = {
        nome: template.nome,
        assunto: template.assunto,
        corpo: template.corpo,
        descricao: template.descricao,
        tipo: template.tipo || 'book',
        ativo: template.ativo !== undefined ? template.ativo : true,
        vinculado_formulario: template.vinculado_formulario !== undefined ? template.vinculado_formulario : true,
        formulario: template.formulario || 'book',
        modalidade: template.modalidade === 'todas' ? null : template.modalidade,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('email_templates')
        .insert([templateData])
        .select()
        .single();

      if (error) {
        console.error('Erro do Supabase:', error);
        throw error;
      }

      await fetchTemplates();

      toast({
        title: "Template criado",
        description: "O template de e-mail foi criado com sucesso.",
      });

      return { success: true, data };
    } catch (error) {
      console.error('Erro ao criar template:', error);
      toast({
        title: "Erro ao criar template",
        description: "Ocorreu um erro ao criar o template de e-mail.",
        variant: "destructive",
      });
      return { success: false, error };
    }
  };

  const updateTemplate = async (id: string, template: Partial<EmailTemplate>) => {
    try {

      const updateData: any = {
        updated_at: new Date().toISOString()
      };

      // Só incluir campos que existem na tabela e foram fornecidos
      if (template.nome !== undefined) {
        updateData.nome = template.nome;
      }
      if (template.assunto !== undefined) {
        updateData.assunto = template.assunto;
      }
      if (template.corpo !== undefined) {
        updateData.corpo = template.corpo;
      }
      if (template.descricao !== undefined) {
        updateData.descricao = template.descricao;
      }
      if (template.tipo !== undefined) {
        updateData.tipo = template.tipo;
      }
      if (template.ativo !== undefined) {
        updateData.ativo = template.ativo;
      }
      if (template.vinculado_formulario !== undefined) {
        updateData.vinculado_formulario = template.vinculado_formulario;
      }
      if (template.formulario !== undefined) {
        updateData.formulario = template.formulario;
      }
      if (template.modalidade !== undefined) {
        updateData.modalidade = template.modalidade === 'todas' ? null : template.modalidade;
      }

      const { error } = await supabase
        .from('email_templates')
        .update(updateData)
        .eq('id', id);

      if (error) {
        console.error('Erro do Supabase na atualização:', error);
        throw error;
      }

      await fetchTemplates();

      toast({
        title: "Template atualizado",
        description: "O template de e-mail foi atualizado com sucesso.",
      });

      return { success: true };
    } catch (error) {
      console.error('Erro ao atualizar template:', error);
      toast({
        title: "Erro ao atualizar template",
        description: "Ocorreu um erro ao atualizar o template de e-mail.",
        variant: "destructive",
      });
      return { success: false, error };
    }
  };

  const deleteTemplate = async (id: string) => {
    try {
      const { error } = await supabase
        .from('email_templates')
        .delete()
        .eq('id', id);

      if (error) throw error;

      await fetchTemplates();

      toast({
        title: "Template excluído",
        description: "O template de e-mail foi excluído com sucesso.",
      });

      return { success: true };
    } catch (error) {
      console.error('Erro ao excluir template:', error);
      toast({
        title: "Erro ao excluir template",
        description: "Ocorreu um erro ao excluir o template de e-mail.",
        variant: "destructive",
      });
      return { success: false, error };
    }
  };

  const toggleTemplateStatus = async (id: string, ativo: boolean) => {
    return updateTemplate(id, { ativo });
  };

  const getTemplateByFormAndModality = async (
    formulario: FormularioType,
    modalidade?: string
  ): Promise<EmailTemplate | null> => {
    try {
      // Buscar templates pelo campo formulario (incluindo templates sem formulário definido para compatibilidade)
      const { data, error } = await supabase
        .from('email_templates')
        .select('*')
        .eq('ativo', true)
        .or(`formulario.eq.${formulario},formulario.is.null`)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao buscar template específico:', error);
        return null;
      }

      if (!data || data.length === 0) {
        return null;
      }

      // Filtrar pelo template mais específico
      const mappedTemplates = data.map(mapSupabaseToEmailTemplate);

      // Primeiro, tentar encontrar um template específico para a modalidade
      if (modalidade) {
        const specificTemplate = mappedTemplates.find(t =>
          t.modalidade === modalidade
        );
        if (specificTemplate) {
          return specificTemplate;
        }
      }

      // Se não encontrar específico, buscar template geral (sem modalidade específica)
      const generalTemplate = mappedTemplates.find(t =>
        !t.modalidade || t.modalidade === null
      );

      return generalTemplate || mappedTemplates[0];
    } catch (error) {
      console.error('Erro ao buscar template por formulário e modalidade:', error);
      return null;
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await fetchTemplates();
      setLoading(false);
    };

    loadData();
  }, []);

  return {
    templates,
    loading,
    createTemplate,
    updateTemplate,
    deleteTemplate,
    toggleTemplateStatus,
    getTemplateByFormAndModality,
    refreshTemplates: fetchTemplates
  };
};