/**
 * Componente para demonstração visual das variáveis do template de elogios
 * Mostra como as variáveis ficam quando processadas
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Eye, 
  Code, 
  Calendar, 
  Image, 
  Type, 
  Layers,
  Copy,
  Check
} from 'lucide-react';
import { elogiosTemplateService, ElogiosTemplateService } from '@/services/elogiosTemplateService';
import { toast } from 'sonner';

interface TemplateVariablesDemoProps {
  onClose?: () => void;
}

export default function TemplateVariablesDemo({ onClose }: TemplateVariablesDemoProps) {
  const [copiedVariable, setCopiedVariable] = useState<string | null>(null);
  const [exampleHtml, setExampleHtml] = useState<string>('');

  // Obter variáveis disponíveis
  const variaveisDisponiveis = ElogiosTemplateService.getVariaveisDisponiveis();

  // Agrupar variáveis por categoria
  const variaveisPorCategoria = variaveisDisponiveis.reduce((acc, variavel) => {
    if (!acc[variavel.categoria]) {
      acc[variavel.categoria] = [];
    }
    acc[variavel.categoria].push(variavel);
    return acc;
  }, {} as Record<string, typeof variaveisDisponiveis>);

  // Gerar exemplo de HTML processado
  useEffect(() => {
    const gerarExemploHtml = () => {
      const nomesMeses = [
        'JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO',
        'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'
      ];
      
      const mesAtual = new Date().getMonth();
      const anoAtual = new Date().getFullYear();
      
      return `
        <div style="text-align: center; padding: 24px 48px; background: #f8f9fa; border-radius: 8px; margin: 20px 0;">
          <h1 style="font-size: 16px; font-weight: bold; margin: 0 0 8px 0; color: #000000;">
            ELOGIOS AOS COLABORADORES
          </h1>
          <h2 style="font-size: 14px; font-weight: bold; margin: 0 0 8px 0; color: #000000;">
            DE SOLUÇÕES DE NEGÓCIOS
          </h2>
          <h3 style="font-size: 18px; font-weight: bold; margin: 0; color: #000000; letter-spacing: 1px;">
            ${nomesMeses[mesAtual]}
          </h3>
        </div>
        
        <div style="display: flex; gap: 10px; margin: 20px 0;">
          <div style="flex: 1; border: 1px solid #e5e7eb; padding: 16px; border-radius: 8px; background: white;">
            <h4 style="color: #0066FF; font-weight: bold; font-size: 14px; margin-bottom: 16px; text-transform: uppercase;">
              JOÃO SILVA
            </h4>
            <p style="font-weight: bold; margin-bottom: 8px; color: #28a745;">
              Muito Satisfeito
            </p>
            <p style="margin-bottom: 16px; font-size: 12px; line-height: 1.5; color: #666;">
              Excelente atendimento! O consultor foi muito prestativo e resolveu nosso problema rapidamente.
            </p>
            <div style="font-size: 12px; color: #000000; font-weight: bold;">
              <p><strong>Cliente:</strong> Maria Santos</p>
              <p><strong>Empresa:</strong> VOTORANTIM</p>
            </div>
          </div>
          
          <div style="flex: 1; border: 1px solid #e5e7eb; padding: 16px; border-radius: 8px; background: white;">
            <h4 style="color: #0066FF; font-weight: bold; font-size: 14px; margin-bottom: 16px; text-transform: uppercase;">
              ANA COSTA
            </h4>
            <p style="font-weight: bold; margin-bottom: 8px; color: #28a745;">
              Satisfeito
            </p>
            <p style="margin-bottom: 16px; font-size: 12px; line-height: 1.5; color: #666;">
              Ótimo suporte técnico. A solução foi implementada conforme esperado.
            </p>
            <div style="font-size: 12px; color: #000000; font-weight: bold;">
              <p><strong>Cliente:</strong> Pedro Oliveira</p>
              <p><strong>Empresa:</strong> EXXONMOBIL</p>
            </div>
          </div>
        </div>
      `;
    };

    setExampleHtml(gerarExemploHtml());
  }, []);

  // Função para copiar variável
  const handleCopyVariable = async (variavel: string) => {
    try {
      await navigator.clipboard.writeText(variavel);
      setCopiedVariable(variavel);
      toast.success('Variável copiada!');
      
      // Limpar estado após 2 segundos
      setTimeout(() => setCopiedVariable(null), 2000);
    } catch (error) {
      toast.error('Erro ao copiar variável');
    }
  };

  // Ícones por categoria
  const getIconeCategoria = (categoria: string) => {
    switch (categoria) {
      case 'Sistema':
        return <Calendar className="h-4 w-4" />;
      case 'Cabeçalho':
        return <Type className="h-4 w-4" />;
      case 'Conteúdo':
        return <Layers className="h-4 w-4" />;
      default:
        return <Code className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Eye className="h-6 w-6 text-blue-600" />
            Demonstração das Variáveis
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Veja como as variáveis ficam quando processadas no template de elogios
          </p>
        </div>
        
        {onClose && (
          <Button variant="outline" onClick={onClose}>
            Fechar
          </Button>
        )}
      </div>

      {/* Exemplo Visual */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5 text-green-600" />
            Exemplo Visual - Como Fica o Template Processado
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div 
            className="border rounded-lg p-4 bg-white"
            dangerouslySetInnerHTML={{ __html: exampleHtml }}
          />
          
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <h4 className="font-semibold text-blue-900 mb-2">💡 Como Funciona</h4>
            <p className="text-blue-800 text-sm">
              O sistema substitui automaticamente as variáveis pelos valores reais quando o template é processado. 
              Por exemplo, <code className="bg-blue-100 px-1 rounded">{'{{sistema.mesNomeAtual}}'}</code> vira <strong>DEZEMBRO</strong>.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Variáveis por Categoria */}
      {Object.entries(variaveisPorCategoria).map(([categoria, variaveis]) => (
        <Card key={categoria}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {getIconeCategoria(categoria)}
              Variáveis de {categoria}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {variaveis.map((variavel, index) => (
                <div key={index} className="border rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-sm font-mono text-purple-600 dark:text-purple-400">
                          {variavel.variavel}
                        </code>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleCopyVariable(variavel.variavel)}
                          className="h-6 w-6 p-0"
                          title="Copiar variável"
                        >
                          {copiedVariable === variavel.variavel ? (
                            <Check className="h-3 w-3 text-green-600" />
                          ) : (
                            <Copy className="h-3 w-3" />
                          )}
                        </Button>
                      </div>
                      
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        {variavel.descricao}
                      </p>
                      
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">Exemplo:</span>
                        <Badge variant="secondary" className="text-xs">
                          {variavel.exemplo}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      ))}

      {/* Exemplo de Código HTML */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Code className="h-5 w-5 text-orange-600" />
            Exemplo de Código HTML do Template
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto">
            <pre className="text-sm">
{`<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Elogios - {{sistema.mesNomeAtual}} {{sistema.anoAtual}}</title>
</head>
<body>
    <!-- Header -->
    <img src="{{HEADER_IMAGE_URL}}" alt="Header">
    
    <!-- Título -->
    <div style="text-align: center; padding: 24px 48px;">
        <h1>{{TITULO_PRINCIPAL}}</h1>
        <h2>{{SUBTITULO}}</h2>
        <h3>{{sistema.mesNomeAtual}}</h3>
    </div>
    
    <!-- Container de Elogios -->
    <div style="max-width: 1200px; margin: 0 auto; padding: 40px 48px;">
        {{ELOGIOS_LOOP}}
    </div>
    
    <!-- Footer -->
    <img src="{{FOOTER_IMAGE_URL}}" alt="Footer">
</body>
</html>`}
            </pre>
          </div>
          
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <h4 className="font-semibold text-yellow-900 mb-2">⚠️ Importante</h4>
            <ul className="text-yellow-800 text-sm space-y-1">
              <li>• <strong>{'{{ELOGIOS_LOOP}}'}</strong> é processado automaticamente - você não precisa criar o HTML dos elogios manualmente</li>
              <li>• As <strong>variáveis de sistema</strong> são atualizadas automaticamente baseadas na data atual</li>
              <li>• As <strong>URLs das imagens</strong> apontam para o servidor de produção</li>
              <li>• O sistema organiza automaticamente os elogios em <strong>linhas de 3 cards</strong> com divisores decorativos</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Instruções de Uso */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Image className="h-5 w-5 text-blue-600" />
            Como Usar no Template
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="bg-blue-100 text-blue-600 rounded-full p-1 mt-0.5">
                <span className="text-xs font-bold px-1">1</span>
              </div>
              <div>
                <h4 className="font-semibold">Acesse Templates de Email</h4>
                <p className="text-sm text-gray-600">Vá em Admin → Templates de Email</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="bg-blue-100 text-blue-600 rounded-full p-1 mt-0.5">
                <span className="text-xs font-bold px-1">2</span>
              </div>
              <div>
                <h4 className="font-semibold">Edite o Template de Elogios</h4>
                <p className="text-sm text-gray-600">Procure por "Template Elogios" ou crie um novo</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="bg-blue-100 text-blue-600 rounded-full p-1 mt-0.5">
                <span className="text-xs font-bold px-1">3</span>
              </div>
              <div>
                <h4 className="font-semibold">Use as Variáveis</h4>
                <p className="text-sm text-gray-600">Copie e cole as variáveis acima no seu template HTML</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="bg-blue-100 text-blue-600 rounded-full p-1 mt-0.5">
                <span className="text-xs font-bold px-1">4</span>
              </div>
              <div>
                <h4 className="font-semibold">Teste o Resultado</h4>
                <p className="text-sm text-gray-600">Vá em Admin → Enviar Elogios para ver o resultado final</p>
              </div>
            </div>
          </div>
          
          <Separator className="my-4" />
          
          <div className="text-center p-4 bg-green-50 border border-green-200 rounded-lg">
            <h4 className="font-semibold text-green-900 mb-2">🚀 Pronto para Usar!</h4>
            <p className="text-green-800 text-sm">
              O sistema já tem um template padrão funcional. Você pode personalizá-lo usando essas variáveis!
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}