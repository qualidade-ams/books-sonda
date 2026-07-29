import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Eye, EyeOff } from 'lucide-react';
import { useEmailTemplates } from '@/hooks/useEmailTemplates';
import { useTemplateMappingValidation } from '@/hooks/useTemplateMappingValidation';
import EmailEditor from './EditorEmail';
import EmailPreview from './PreviewEmail';
import VariaveisTemplateExtendido from './VariaveisTemplateExtendido';
import TestEmailDialog from '../DialogTesteEmail';
import TesteVariaveisUnificado from './TesteVariaveisUnificado';
import type { EmailTemplate } from '@/types/approval';
import { FormularioData } from '@/hooks/useEmailVariableMapping';
import { useTemplateTestData } from '@/hooks/useTemplateTestData';

interface EditorTemplateCompletoProps {
  template: EmailTemplate;
  onSuccess: () => void;
}

const EditorTemplateCompleto: React.FC<EditorTemplateCompletoProps> = ({ 
  template, 
  onSuccess 
}) => {
  const { updateTemplate } = useEmailTemplates();
  const [loading, setLoading] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  
  // Hook para carregar dados de teste salvos
  const { testData, loading: loadingTestData, saveTestData } = useTemplateTestData({
    templateId: template.id
  });

  // Estado compartilhado para dados de teste
  const [dadosTeste, setDadosTeste] = useState<FormularioData | null>(null);

  // Atualizar dados de teste quando carregarem do banco
  useEffect(() => {
    if (testData) {
      setDadosTeste(testData);
    }
  }, [testData]);

  // Função para atualizar dados de teste e salvar no banco
  const handleDadosTesteChange = useCallback(async (novosDados: FormularioData) => {
    // Converter FormularioData para FormularioDataLocal (tipo genérico)
    const dadosParaSalvar = novosDados as any;
    // Verificar se os dados realmente mudaram antes de salvar
    const dadosAtuaisString = JSON.stringify(dadosTeste);
    const novosDadosString = JSON.stringify(novosDados);
    
    if (dadosAtuaisString === novosDadosString) {
      console.log('🔄 EditorTemplateCompleto: Dados não mudaram, ignorando salvamento');
      return;
    }
    
    console.log('🔄 EditorTemplateCompleto: Atualizando dados de teste:', novosDados);
    setDadosTeste(novosDados);
    
    // Salvar no banco apenas se os dados mudaram
    try {
      await saveTestData(dadosParaSalvar);
    } catch (error) {
      console.error('❌ Erro ao salvar dados de teste:', error);
    }
  }, [dadosTeste, saveTestData]);
  
  // Hook para validação de mapeamento
  const {
    validationState,
    isValidating,
    validateMapping,
    hasError: hasValidationError
  } = useTemplateMappingValidation({
    showToasts: false, // Não mostrar toasts, usar validação inline
    autoValidate: false // Validar manualmente antes de submeter
  });
  
  const [formData, setFormData] = useState({
    nome: template.nome,
    descricao: template.descricao || '',
    tipo: template.tipo || 'book' as 'book' | 'elogios',
    converter_em_imagem: template.converter_em_imagem ?? false,
    assunto: template.assunto,
    corpo: template.corpo
  });

  useEffect(() => {
    setFormData({
      nome: template.nome,
      descricao: template.descricao || '',
      tipo: template.tipo || 'book' as 'book' | 'elogios',
      converter_em_imagem: template.converter_em_imagem ?? false,
      assunto: template.assunto,
      corpo: template.corpo
    });
  }, [template.id, template.nome, template.assunto, template.corpo, template.descricao, template.tipo]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    
    // Validação básica dos campos obrigatórios
    if (!formData.nome.trim() || !formData.assunto.trim() || !formData.corpo.trim()) {
      console.log('Validação básica falhou na edição:', { 
        nome: formData.nome, 
        assunto: formData.assunto, 
        corpo: formData.corpo.length 
      });
      setValidationError('Todos os campos obrigatórios devem ser preenchidos');
      return;
    }

    setLoading(true);
    
    try {
      const result = await updateTemplate(template.id, {
        nome: formData.nome,
        descricao: formData.descricao || null,
        tipo: formData.tipo,
        assunto: formData.assunto,
        corpo: formData.corpo,
        converter_em_imagem: formData.converter_em_imagem
      });

      if (result.success) {
        onSuccess();
      } else {
        console.error('Erro ao atualizar template:', result.error);
        setValidationError('Erro ao atualizar template. Tente novamente.');
      }
    } catch (error) {
      console.error('Erro inesperado ao atualizar template:', error);
      setValidationError('Erro inesperado ao atualizar template');
    } finally {
      setLoading(false);
    }
  };

  const handleTemplateChange = (newTemplate: { assunto: string; corpo: string }) => {
    console.log('Template sendo alterado no editor:', newTemplate);
    setFormData(prev => {
      const updated = {
        ...prev,
        assunto: newTemplate.assunto,
        corpo: newTemplate.corpo
      };
      console.log('FormData atualizado no editor:', updated);
      return updated;
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Informações do Template</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nome">Nome do Template *</Label>
            <Input
              id="nome"
              value={formData.nome}
              onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
              placeholder="Ex: Template Book Mensal"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="descricao">Descrição</Label>
            <Textarea
              id="descricao"
              value={formData.descricao}
              onChange={(e) => setFormData(prev => ({ ...prev, descricao: e.target.value }))}
              placeholder="Descrição opcional do template"
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="tipo">Tipo de Template *</Label>
            <Select
              value={formData.tipo}
              onValueChange={(value: 'book' | 'elogios') => {
                setFormData(prev => ({ ...prev, tipo: value }))
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo de template" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="book">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                    <span>Book - Templates para cadastro de empresas</span>
                  </div>
                </SelectItem>
                <SelectItem value="elogios">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    <span>Elogios - Templates para disparo de elogios</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Switch para converter em imagem */}
          <div className="flex items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="converter_em_imagem_edit" className="text-sm font-medium text-gray-700">
                Converter em imagem antes de enviar
              </Label>
              <p className="text-xs text-gray-500">
                Quando ativado, o conteúdo do email será convertido em imagem PNG antes do envio
              </p>
            </div>
            <Switch
              id="converter_em_imagem_edit"
              checked={formData.converter_em_imagem}
              onCheckedChange={(checked) => setFormData(prev => ({ ...prev, converter_em_imagem: checked }))}
            />
          </div>

          {/* Exibir erro de validação */}
          {validationError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{validationError}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Conteúdo do E-mail</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs defaultValue="preview" className="space-y-4">
            <TabsList className="w-full grid grid-cols-3">
              <TabsTrigger value="preview" className="flex items-center gap-2">
                <Eye className="h-4 w-4" />
                Preview
              </TabsTrigger>
              <TabsTrigger value="editor" className="flex items-center gap-2">
                <EyeOff className="h-4 w-4" />
                Editor HTML
              </TabsTrigger>
              <TabsTrigger value="teste" className="flex items-center gap-2">
                🧪 Teste Variáveis
              </TabsTrigger>
            </TabsList>

            <TabsContent value="preview">
              {loadingTestData ? (
                <div className="flex items-center justify-center p-8">
                  <div className="flex items-center gap-2 text-gray-500">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-500"></div>
                    Carregando dados de teste...
                  </div>
                </div>
              ) : (
                <EmailPreview 
                  template={formData} 
                  dadosPersonalizados={dadosTeste || undefined}
                />
              )}
            </TabsContent>

            <TabsContent value="editor">
              <EmailEditor 
                template={formData}
                onTemplateChange={handleTemplateChange}
              />
              <VariaveisTemplateExtendido 
                mostrarVariaveisBooks={template.formulario === 'book'}
                mostrarVariaveisFormulario={template.formulario !== 'book'}
              />
            </TabsContent>

            <TabsContent value="teste">
              <TesteVariaveisUnificado 
                template={formData} 
                templateId={template.id}
                dadosFormularioIniciais={dadosTeste}
                onDadosFormularioChange={handleDadosTesteChange}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <div className="flex flex-col sm:flex-row gap-3 justify-end">
        <TestEmailDialog 
          emailTemplate={formData} 
          dadosPersonalizados={dadosTeste}
        />
        <Button 
          type="submit" 
          disabled={loading || isValidating} 
          className="flex-1 sm:flex-initial"
        >
          {loading ? 'Salvando...' : isValidating ? 'Validando...' : 'Salvar Alterações'}
        </Button>
      </div>
    </form>
  );
};

export default EditorTemplateCompleto;