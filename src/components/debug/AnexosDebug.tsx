import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { anexoService } from '@/services/anexoService';

interface TestResult {
  test: string;
  status: 'pending' | 'success' | 'error';
  message: string;
  details?: any;
}

export function AnexosDebug() {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);

  const addResult = (test: string, status: TestResult['status'], message: string, details?: any) => {
    setResults(prev => [...prev, { test, status, message, details }]);
  };

  const runTests = async () => {
    setIsRunning(true);
    setResults([]);

    try {
      // Teste 1: Verificar se a tabela existe
      addResult('Verificação da Tabela', 'pending', 'Verificando se a tabela anexos_temporarios existe...');
      
      try {
        const { data, error } = await supabase
          .from('anexos_temporarios')
          .select('*', { count: 'exact', head: true });

        if (error) {
          addResult('Verificação da Tabela', 'error', `Erro: ${error.message}`, error);
        } else {
          addResult('Verificação da Tabela', 'success', `Tabela existe. Total de registros: ${data || 0}`);
        }
      } catch (error) {
        addResult('Verificação da Tabela', 'error', `Erro de conexão: ${(error as Error).message}`, error);
      }

      // Teste 2: Buscar empresa para teste
      addResult('Busca de Empresa', 'pending', 'Buscando empresa para teste...');
      
      const { data: empresas, error: empresasError } = await supabase
        .from('empresas_clientes')
        .select('id, nome_completo, anexo')
        .eq('anexo', true)
        .limit(1);

      if (empresasError || !empresas || empresas.length === 0) {
        addResult('Busca de Empresa', 'error', 'Nenhuma empresa com anexos habilitados encontrada', empresasError);
        return;
      }

      const empresa = empresas[0];
      addResult('Busca de Empresa', 'success', `Empresa encontrada: ${empresa.nome_completo} (${empresa.id})`);

      // Teste 3: Verificar anexos existentes
      addResult('Anexos Existentes', 'pending', 'Verificando anexos existentes da empresa...');
      
      try {
        const anexosExistentes = await anexoService.obterAnexosEmpresa(empresa.id);
        addResult('Anexos Existentes', 'success', `${anexosExistentes.length} anexos encontrados`, anexosExistentes);
      } catch (error) {
        addResult('Anexos Existentes', 'error', `Erro ao buscar anexos: ${(error as Error).message}`, error);
      }

      // Teste 4: Testar inserção direta no banco
      addResult('Inserção Direta', 'pending', 'Testando inserção direta no banco...');
      
      const anexoTeste = {
        empresa_id: empresa.id,
        nome_original: 'teste_debug.pdf',
        nome_arquivo: `debug_${Date.now()}.pdf`,
        tipo_mime: 'application/pdf',
        tamanho_bytes: 1024,
        url_temporaria: 'https://exemplo.com/debug.pdf',
        token_acesso: `debug_token_${Date.now()}`,
        status: 'pendente'
      };

      try {
        const { data: anexoInserido, error: insertError } = await supabase
          .from('anexos_temporarios')
          .insert(anexoTeste)
          .select()
          .single();

        if (insertError) {
          addResult('Inserção Direta', 'error', `Erro na inserção: ${insertError.message}`, insertError);
        } else {
          addResult('Inserção Direta', 'success', `Anexo inserido com ID: ${anexoInserido.id}`, anexoInserido);
          
          // Teste 5: Limpar registro de teste
          addResult('Limpeza', 'pending', 'Removendo registro de teste...');
          
          const { error: deleteError } = await supabase
            .from('anexos_temporarios')
            .delete()
            .eq('id', anexoInserido.id);

          if (deleteError) {
            addResult('Limpeza', 'error', `Erro ao remover: ${deleteError.message}`, deleteError);
          } else {
            addResult('Limpeza', 'success', 'Registro de teste removido com sucesso');
          }
        }
      } catch (error) {
        addResult('Inserção Direta', 'error', `Erro de execução: ${(error as Error).message}`, error);
      }

      // Teste 6: Testar serviço de anexos
      addResult('Serviço de Anexos', 'pending', 'Testando resumo do serviço de anexos...');
      
      try {
        const resumo = await anexoService.obterResumoAnexos(empresa.id);
        addResult('Serviço de Anexos', 'success', 'Resumo obtido com sucesso', resumo);
      } catch (error) {
        addResult('Serviço de Anexos', 'error', `Erro no serviço: ${(error as Error).message}`, error);
      }

    } catch (error) {
      addResult('Erro Geral', 'error', `Erro geral nos testes: ${(error as Error).message}`, error);
    } finally {
      setIsRunning(false);
    }
  };

  const getStatusIcon = (status: TestResult['status']) => {
    switch (status) {
      case 'pending':
        return <Loader2 className="h-4 w-4 animate-spin text-blue-500" />;
      case 'success':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
    }
  };

  const getStatusColor = (status: TestResult['status']) => {
    switch (status) {
      case 'pending':
        return 'bg-blue-100 text-blue-800';
      case 'success':
        return 'bg-green-100 text-green-800';
      case 'error':
        return 'bg-red-100 text-red-800';
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Debug - Sistema de Anexos</span>
          <Button 
            onClick={runTests} 
            disabled={isRunning}
            variant={isRunning ? "secondary" : "default"}
          >
            {isRunning ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Executando...
              </>
            ) : (
              'Executar Testes'
            )}
          </Button>
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {results.length === 0 && !isRunning && (
          <div className="text-center text-muted-foreground py-8">
            Clique em "Executar Testes" para verificar o sistema de anexos
          </div>
        )}

        {results.map((result, index) => (
          <div key={index} className="border rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                {getStatusIcon(result.status)}
                <span className="font-medium">{result.test}</span>
              </div>
              <Badge className={getStatusColor(result.status)}>
                {result.status.toUpperCase()}
              </Badge>
            </div>
            
            <p className="text-sm text-muted-foreground mb-2">
              {result.message}
            </p>
            
            {result.details && (
              <details className="text-xs">
                <summary className="cursor-pointer text-blue-600 hover:text-blue-800">
                  Ver detalhes
                </summary>
                <pre className="mt-2 p-2 bg-gray-100 rounded overflow-auto">
                  {JSON.stringify(result.details, null, 2)}
                </pre>
              </details>
            )}
          </div>
        ))}

        {isRunning && results.length === 0 && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            <span>Iniciando testes...</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}