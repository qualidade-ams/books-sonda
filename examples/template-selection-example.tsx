/**
 * Exemplo de uso da funcionalidade de seleção de templates para empresas
 * 
 * Este arquivo demonstra como integrar a seleção de templates no cadastro
 * de empresas e como usar os componentes criados.
 */

import React, { useState } from 'react';
import { EmpresaForm } from '@/components/admin/client-books';
import { useBookTemplates } from '@/hooks/useBookTemplates';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { EmpresaFormData } from '@/types/clientBooks';

/**
 * Exemplo 1: Formulário de empresa com seleção de template
 */
export const ExemploFormularioEmpresa: React.FC = () => {
  const [empresaData, setEmpresaData] = useState<Partial<EmpresaFormData>>({
    nomeCompleto: '',
    nomeAbreviado: '',
    templatePadrao: '',
    status: 'ativo',
    produtos: [],
    grupos: []
  });

  const handleSubmit = async (data: EmpresaFormData) => {
    console.log('Dados da empresa com template selecionado:', data);
    
    // Exemplo de como processar o template selecionado
    if (data.templatePadrao === 'portugues' || data.templatePadrao === 'ingles') {
      console.log('Template padrão selecionado:', data.templatePadrao);
    } else {
      console.log('Template personalizado selecionado (ID):', data.templatePadrao);
    }
    
    // Aqui você chamaria o serviço para salvar a empresa
    // await empresasClientesService.criarEmpresa(data);
  };

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Cadastro de Empresa com Template</h1>
      
      <EmpresaForm
        mode="create"
        onSubmit={handleSubmit}
        onCancel={() => console.log('Cancelado')}
        grupos={[]} // Lista de grupos disponíveis
      />
    </div>
  );
};

/**
 * Exemplo 2: Visualização de templates disponíveis
 */
export const ExemploListaTemplates: React.FC = () => {
  const { 
    bookTemplateOptions, 
    loading, 
    getDefaultTemplates, 
    getCustomTemplates 
  } = useBookTemplates();

  if (loading) {
    return <div>Carregando templates...</div>;
  }

  const defaultTemplates = getDefaultTemplates();
  const customTemplates = getCustomTemplates();

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-bold">Templates Disponíveis</h1>
      
      {/* Templates Padrão */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Templates Padrão do Sistema
            <Badge variant="secondary">{defaultTemplates.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {defaultTemplates.map((template) => (
              <div key={template.value} className="p-4 border rounded-lg">
                <h3 className="font-medium">{template.label}</h3>
                <p className="text-sm text-muted-foreground">{template.description}</p>
                <Badge variant="outline" className="mt-2">Padrão</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Templates Personalizados */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Templates Personalizados
            <Badge variant="default">{customTemplates.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {customTemplates.length === 0 ? (
            <p className="text-muted-foreground">
              Nenhum template personalizado encontrado. 
              Crie templates na seção "Configuração de E-mail".
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {customTemplates.map((template) => (
                <div key={template.value} className="p-4 border rounded-lg">
                  <h3 className="font-medium">{template.label}</h3>
                  <p className="text-sm text-muted-foreground">{template.description}</p>
                  <Badge variant="default" className="mt-2">Personalizado</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

/**
 * Exemplo 3: Prévia de template com seleção dinâmica
 */
export const ExemploPreviewTemplate: React.FC = () => {
  const [templateSelecionado, setTemplateSelecionado] = useState<string>('');
  const { bookTemplateOptions } = useBookTemplates();

  return (
    <div className="max-w-6xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Prévia de Templates</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Seleção de Template */}
        <Card>
          <CardHeader>
            <CardTitle>Selecionar Template</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {bookTemplateOptions.map((template) => (
              <Button
                key={template.value}
                variant={templateSelecionado === template.value ? "default" : "outline"}
                className="w-full justify-start"
                onClick={() => setTemplateSelecionado(template.value)}
              >
                <div className="flex flex-col items-start">
                  <span>{template.label}</span>
                  <span className="text-xs opacity-70">{template.description}</span>
                </div>
              </Button>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

/**
 * Exemplo 4: Validação de template antes do envio
 */
export const ExemploValidacaoTemplate = () => {
  const { getTemplateById, isDefaultTemplate } = useBookTemplates();

  const validarTemplate = (templateId: string): { valido: boolean; mensagem: string } => {
    if (!templateId || templateId.trim() === '') {
      return { valido: false, mensagem: 'Template é obrigatório' };
    }

    const template = getTemplateById(templateId);
    if (!template) {
      return { valido: false, mensagem: 'Template não encontrado' };
    }

    if (isDefaultTemplate(templateId)) {
      return { valido: true, mensagem: `Template padrão "${template.label}" válido` };
    }

    // Para templates personalizados, verificar se é UUID válido
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!templateId.match(uuidRegex)) {
      return { valido: false, mensagem: 'ID do template personalizado inválido' };
    }

    return { valido: true, mensagem: `Template personalizado "${template.label}" válido` };
  };

  // Exemplos de uso
  const exemplosValidacao = [
    'portugues',
    'ingles',
    'f47ac10b-58cc-4372-a567-0e02b2c3d479', // UUID válido
    'template-invalido',
    '',
    'uuid-malformado'
  ];

  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Validação de Templates</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>Exemplos de Validação</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {exemplosValidacao.map((templateId, index) => {
              const resultado = validarTemplate(templateId);
              return (
                <div key={index} className="flex items-center justify-between p-3 border rounded">
                  <code className="text-sm bg-muted px-2 py-1 rounded">
                    {templateId || '(vazio)'}
                  </code>
                  <div className="flex items-center gap-2">
                    <Badge variant={resultado.valido ? "default" : "destructive"}>
                      {resultado.valido ? "Válido" : "Inválido"}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {resultado.mensagem}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

/**
 * Exemplo 5: Integração completa em uma página
 */
export const ExemploIntegracaoCompleta: React.FC = () => {
  return (
    <div className="space-y-8">
      <ExemploListaTemplates />
      <ExemploPreviewTemplate />
      <ExemploValidacaoTemplate />
    </div>
  );
};

export default ExemploIntegracaoCompleta;