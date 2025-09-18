import { useState, useMemo } from 'react';
import { Eye, EyeOff, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useClientBooksVariables } from '@/hooks/useClientBooksVariables';
import TemplateValidationStatus from './TemplateValidationStatus';
import type { ClientBooksTemplateData } from '@/utils/clientBooksVariableMapping';
import type { EmailTemplate } from '@/types/approval';

interface PreviewEmailClientBooksProps {
  template: {
    assunto: string;
    corpo: string;
    formulario?: string;
  } | EmailTemplate;
  dadosTemplate?: ClientBooksTemplateData;
  className?: string;
}

const PreviewEmailClientBooks = ({ 
  template, 
  dadosTemplate,
  className = '' 
}: PreviewEmailClientBooksProps) => {
  const [mostrarPreview, setMostrarPreview] = useState(false);
  const [usarDadosExemplo, setUsarDadosExemplo] = useState(!dadosTemplate);

  const { 
    processarTemplate, 
    validarTemplate, 
    dadosExemplo 
  } = useClientBooksVariables({
    dadosTemplate,
    usarDadosExemplo
  });

  // Determinar quais dados usar para validação
  const dadosParaUsar = usarDadosExemplo ? dadosExemplo : dadosTemplate;

  // Processar template
  const templateProcessado = useMemo(() => {
    if (!template.assunto && !template.corpo) {
      return { assunto: '', corpo: '' };
    }

    return {
      assunto: processarTemplate(template.assunto || ''),
      corpo: processarTemplate(template.corpo || '')
    };
  }, [template, processarTemplate]);

  // Validar template
  const validacao = useMemo(() => {
    const validacaoAssunto = validarTemplate(template.assunto || '');
    const validacaoCorpo = validarTemplate(template.corpo || '');
    
    const todasVariaveis = [
      ...validacaoAssunto.variaveisNaoEncontradas,
      ...validacaoCorpo.variaveisNaoEncontradas
    ];
    
    // Remover duplicatas
    const variaveisUnicas = [...new Set(todasVariaveis)];
    
    return {
      valido: validacaoAssunto.valido && validacaoCorpo.valido,
      variaveisNaoEncontradas: variaveisUnicas
    };
  }, [template, validarTemplate]);

  const togglePreview = () => {
    setMostrarPreview(!mostrarPreview);
  };

  const toggleDadosExemplo = () => {
    setUsarDadosExemplo(!usarDadosExemplo);
  };

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Status de validação */}
      <TemplateValidationStatus
        template={template as EmailTemplate}
        dadosClientBooks={dadosParaUsar || undefined}
        showDetails={false}
      />

      {/* Controles */}
      <div className="flex items-center justify-between">
        <Button
          type="button"
          variant="outline"
          onClick={togglePreview}
          className="flex items-center gap-2"
        >
          {mostrarPreview ? (
            <>
              <EyeOff className="h-4 w-4" />
              Ocultar Preview
            </>
          ) : (
            <>
              <Eye className="h-4 w-4" />
              Mostrar Preview
            </>
          )}
        </Button>

        {mostrarPreview && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={toggleDadosExemplo}
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            {usarDadosExemplo ? 'Usar Dados Reais' : 'Usar Dados Exemplo'}
          </Button>
        )}
      </div>

      {/* Validação */}
      {!validacao.valido && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <div>
              <p className="font-medium mb-2">Variáveis não encontradas no template:</p>
              <ul className="list-disc list-inside space-y-1">
                {validacao.variaveisNaoEncontradas.map((variavel) => (
                  <li key={variavel} className="font-mono text-sm">
                    {`{{${variavel}}}`}
                  </li>
                ))}
              </ul>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {validacao.valido && mostrarPreview && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            Todas as variáveis do template foram encontradas e processadas com sucesso.
          </AlertDescription>
        </Alert>
      )}

      {/* Preview */}
      {mostrarPreview && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Preview do E-mail
              {usarDadosExemplo && (
                <span className="text-sm font-normal text-muted-foreground">
                  (usando dados de exemplo)
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Dados utilizados */}
            {usarDadosExemplo && (
              <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                <h4 className="font-medium text-blue-900 mb-2">Dados de Exemplo Utilizados:</h4>
                <div className="text-sm text-blue-800 space-y-1">
                  <p><strong>Empresa:</strong> {dadosExemplo.empresa.nome_completo}</p>
                  <p><strong>Cliente:</strong> {dadosExemplo.cliente.nome_completo} ({dadosExemplo.cliente.email})</p>
                  <p><strong>Período:</strong> {dadosExemplo.disparo.mes}/{dadosExemplo.disparo.ano}</p>
                </div>
              </div>
            )}

            {/* Assunto */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Assunto:
              </label>
              <div className="bg-gray-50 p-3 rounded border">
                <p className="text-sm font-medium">
                  {templateProcessado.assunto || 'Sem assunto definido'}
                </p>
              </div>
            </div>

            {/* Corpo */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Corpo do E-mail:
              </label>
              <div className="bg-white border rounded-lg p-4 min-h-[200px]">
                {templateProcessado.corpo ? (
                  <div 
                    className="prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{ 
                      __html: templateProcessado.corpo 
                    }} 
                  />
                ) : (
                  <p className="text-gray-500 italic">Sem conteúdo definido</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PreviewEmailClientBooks;