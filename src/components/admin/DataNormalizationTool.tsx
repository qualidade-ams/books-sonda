import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle, AlertCircle, Database, RefreshCw } from 'lucide-react';
import { DataFixUtils } from '@/utils/dataFixUtils';

interface NormalizationResult {
  produtos: { success: boolean; updated: number; errors: string[] };
  emails: { success: boolean; updated: number; errors: string[] };
}

interface ConsistencyCheck {
  produtosInconsistentes: number;
  emailsInconsistentes: number;
  detalhes: string[];
}

const DataNormalizationTool: React.FC = () => {
  const [isChecking, setIsChecking] = useState(false);
  const [isNormalizing, setIsNormalizing] = useState(false);
  const [consistencyData, setConsistencyData] = useState<ConsistencyCheck | null>(null);
  const [normalizationResult, setNormalizationResult] = useState<NormalizationResult | null>(null);

  const handleCheckConsistency = async () => {
    setIsChecking(true);
    try {
      const result = await DataFixUtils.checkDataConsistency();
      setConsistencyData(result);
    } catch (error) {
      console.error('Erro ao verificar consistência:', error);
    } finally {
      setIsChecking(false);
    }
  };

  const handleNormalizeData = async () => {
    setIsNormalizing(true);
    try {
      const result = await DataFixUtils.normalizeAllData();
      setNormalizationResult(result);
      // Recheck consistency after normalization
      const newConsistency = await DataFixUtils.checkDataConsistency();
      setConsistencyData(newConsistency);
    } catch (error) {
      console.error('Erro ao normalizar dados:', error);
    } finally {
      setIsNormalizing(false);
    }
  };

  const hasInconsistencies = consistencyData && 
    (consistencyData.produtosInconsistentes > 0 || consistencyData.emailsInconsistentes > 0);

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Ferramenta de Normalização de Dados
        </CardTitle>
        <p className="text-sm text-gray-600">
          Verifica e corrige a consistência dos dados no banco de dados (produtos em uppercase, emails em lowercase)
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Verificação de Consistência */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium">Verificação de Consistência</h3>
            <Button
              onClick={handleCheckConsistency}
              disabled={isChecking || isNormalizing}
              variant="outline"
              className="flex items-center gap-2"
            >
              {isChecking ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              {isChecking ? 'Verificando...' : 'Verificar Dados'}
            </Button>
          </div>

          {consistencyData && (
            <div className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <span className="text-sm font-medium">Produtos Inconsistentes:</span>
                  <Badge variant={consistencyData.produtosInconsistentes > 0 ? "destructive" : "default"}>
                    {consistencyData.produtosInconsistentes}
                  </Badge>
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg">
                  <span className="text-sm font-medium">Emails Inconsistentes:</span>
                  <Badge variant={consistencyData.emailsInconsistentes > 0 ? "destructive" : "default"}>
                    {consistencyData.emailsInconsistentes}
                  </Badge>
                </div>
              </div>

              {consistencyData.detalhes.length > 0 && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    <div className="space-y-1">
                      {consistencyData.detalhes.map((detalhe, index) => (
                        <div key={index} className="text-sm">• {detalhe}</div>
                      ))}
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {!hasInconsistencies && (
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    Todos os dados estão consistentes! Produtos em uppercase e emails em lowercase.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </div>

        {/* Normalização */}
        {hasInconsistencies && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">Normalização de Dados</h3>
              <Button
                onClick={handleNormalizeData}
                disabled={isChecking || isNormalizing}
                className="flex items-center gap-2"
              >
                {isNormalizing ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4" />
                )}
                {isNormalizing ? 'Normalizando...' : 'Normalizar Dados'}
              </Button>
            </div>

            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Esta operação irá:
                <ul className="list-disc list-inside mt-2 space-y-1">
                  <li>Converter todos os produtos para UPPERCASE (CE_PLUS, FISCAL, GALLERY)</li>
                  <li>Converter todos os emails para lowercase</li>
                  <li>Aplicar trim em campos de texto</li>
                </ul>
              </AlertDescription>
            </Alert>
          </div>
        )}

        {/* Resultado da Normalização */}
        {normalizationResult && (
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Resultado da Normalização</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Produtos</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Status:</span>
                      <Badge variant={normalizationResult.produtos.success ? "default" : "destructive"}>
                        {normalizationResult.produtos.success ? 'Sucesso' : 'Erro'}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Atualizados:</span>
                      <span className="font-medium">{normalizationResult.produtos.updated}</span>
                    </div>
                    {normalizationResult.produtos.errors.length > 0 && (
                      <div className="text-sm text-red-600">
                        <div className="font-medium">Erros:</div>
                        {normalizationResult.produtos.errors.map((error, index) => (
                          <div key={index} className="text-xs">• {error}</div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Emails</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Status:</span>
                      <Badge variant={normalizationResult.emails.success ? "default" : "destructive"}>
                        {normalizationResult.emails.success ? 'Sucesso' : 'Erro'}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Atualizados:</span>
                      <span className="font-medium">{normalizationResult.emails.updated}</span>
                    </div>
                    {normalizationResult.emails.errors.length > 0 && (
                      <div className="text-sm text-red-600">
                        <div className="font-medium">Erros:</div>
                        {normalizationResult.emails.errors.map((error, index) => (
                          <div key={index} className="text-xs">• {error}</div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Instruções */}
        <div className="text-sm text-gray-600 space-y-2">
          <p><strong>Como usar:</strong></p>
          <ol className="list-decimal list-inside space-y-1">
            <li>Clique em "Verificar Dados" para identificar inconsistências</li>
            <li>Se houver dados inconsistentes, clique em "Normalizar Dados"</li>
            <li>Aguarde a conclusão e verifique os resultados</li>
            <li>Execute uma nova verificação para confirmar que tudo está correto</li>
          </ol>
        </div>
      </CardContent>
    </Card>
  );
};

export default DataNormalizationTool;