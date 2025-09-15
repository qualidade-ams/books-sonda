import { AlertCircle, CheckCircle, AlertTriangle, Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { useTemplateValidation } from '@/hooks/useTemplateValidation';
import type { EmailTemplate } from '@/types/approval';
import type { ClientBooksTemplateData } from '@/utils/clientBooksVariableMapping';
import type { FormularioData } from '@/utils/emailVariableMapping';

interface TemplateValidationStatusProps {
  template: EmailTemplate;
  dadosClientBooks?: ClientBooksTemplateData;
  dadosFormulario?: FormularioData;
  showDetails?: boolean;
  className?: string;
}

const TemplateValidationStatus = ({
  template,
  dadosClientBooks,
  dadosFormulario,
  showDetails = true,
  className = ''
}: TemplateValidationStatusProps) => {
  const [showFullDetails, setShowFullDetails] = useState(false);

  const {
    validacao,
    isValid,
    hasWarnings,
    hasErrors,
    canSend,
    validationSummary
  } = useTemplateValidation({
    template,
    dadosClientBooks,
    dadosFormulario
  });

  // Determinar ícone e cor baseado no status
  const getStatusIcon = () => {
    if (hasErrors) {
      return <AlertCircle className="h-4 w-4 text-red-500" />;
    }
    if (hasWarnings) {
      return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
    }
    if (isValid) {
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
    return <Info className="h-4 w-4 text-blue-500" />;
  };

  const getStatusVariant = () => {
    if (hasErrors) return 'destructive';
    if (hasWarnings) return 'default';
    return 'default';
  };

  const getStatusColor = () => {
    if (hasErrors) return 'text-red-700 bg-red-50 border-red-200';
    if (hasWarnings) return 'text-yellow-700 bg-yellow-50 border-yellow-200';
    if (isValid) return 'text-green-700 bg-green-50 border-green-200';
    return 'text-blue-700 bg-blue-50 border-blue-200';
  };

  return (
    <div className={className}>
      {/* Status resumido */}
      <Alert variant={getStatusVariant()} className={getStatusColor()}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getStatusIcon()}
            <AlertDescription className="font-medium">
              {validationSummary}
            </AlertDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={canSend ? 'default' : 'secondary'}>
              {canSend ? 'Pronto para envio' : 'Requer atenção'}
            </Badge>
            {showDetails && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowFullDetails(!showFullDetails)}
              >
                {showFullDetails ? 'Ocultar' : 'Detalhes'}
              </Button>
            )}
          </div>
        </div>
      </Alert>

      {/* Detalhes expandidos */}
      {showDetails && (
        <Collapsible open={showFullDetails} onOpenChange={setShowFullDetails}>
          <CollapsibleContent className="mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Detalhes da Validação</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Erros */}
                {validacao.erros.length > 0 && (
                  <div>
                    <h4 className="font-medium text-red-700 mb-2 flex items-center gap-2">
                      <AlertCircle className="h-4 w-4" />
                      Erros ({validacao.erros.length})
                    </h4>
                    <ul className="list-disc list-inside space-y-1 text-sm text-red-600">
                      {validacao.erros.map((erro, index) => (
                        <li key={index}>{erro}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Avisos */}
                {validacao.avisos.length > 0 && (
                  <div>
                    <h4 className="font-medium text-yellow-700 mb-2 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      Avisos ({validacao.avisos.length})
                    </h4>
                    <ul className="list-disc list-inside space-y-1 text-sm text-yellow-600">
                      {validacao.avisos.map((aviso, index) => (
                        <li key={index}>{aviso}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Variáveis não encontradas */}
                {validacao.variaveisNaoEncontradas.length > 0 && (
                  <div>
                    <h4 className="font-medium text-gray-700 mb-2">
                      Variáveis não encontradas ({validacao.variaveisNaoEncontradas.length})
                    </h4>
                    <div className="flex flex-wrap gap-1">
                      {validacao.variaveisNaoEncontradas.map((variavel) => (
                        <Badge key={variavel} variant="outline" className="font-mono text-xs">
                          {`{{${variavel}}}`}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Variáveis obrigatórias ausentes */}
                {validacao.variaveisObrigatoriasAusentes.length > 0 && (
                  <div>
                    <h4 className="font-medium text-red-700 mb-2">
                      Variáveis obrigatórias ausentes ({validacao.variaveisObrigatoriasAusentes.length})
                    </h4>
                    <div className="flex flex-wrap gap-1">
                      {validacao.variaveisObrigatoriasAusentes.map((variavel) => (
                        <Badge key={variavel} variant="destructive" className="font-mono text-xs">
                          {`{{${variavel}}}`}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Fallbacks aplicados */}
                {Object.keys(validacao.fallbacksAplicados).length > 0 && (
                  <div>
                    <h4 className="font-medium text-blue-700 mb-2">
                      Fallbacks aplicados ({Object.keys(validacao.fallbacksAplicados).length})
                    </h4>
                    <div className="space-y-2">
                      {Object.entries(validacao.fallbacksAplicados).map(([variavel, valor]) => (
                        <div key={variavel} className="flex items-center gap-2 text-sm">
                          <Badge variant="outline" className="font-mono">
                            {`{{${variavel}}}`}
                          </Badge>
                          <span className="text-gray-500">→</span>
                          <span className="text-blue-600 font-medium">{valor}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Status geral */}
                <div className="pt-2 border-t">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Status geral:</span>
                    <div className="flex items-center gap-2">
                      {getStatusIcon()}
                      <span className={isValid ? 'text-green-600' : 'text-red-600'}>
                        {isValid ? 'Válido' : 'Inválido'}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-sm mt-1">
                    <span className="text-gray-600">Pronto para envio:</span>
                    <span className={canSend ? 'text-green-600' : 'text-red-600'}>
                      {canSend ? 'Sim' : 'Não'}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
};

export default TemplateValidationStatus;