/**
 * Exemplo de uso do serviço Puppeteer PDF
 * Demonstra como gerar PDFs com fidelidade visual total
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Download, Eye, FileText, Loader2 } from 'lucide-react';
import { puppeteerPDFService } from '@/services/puppeteerPDFService';
import { useToast } from '@/hooks/use-toast';

export default function ExemploPDFPuppeteer() {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // HTML de exemplo com estilos modernos
  const htmlExemplo = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Relatório de Exemplo</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: #1f2937;
      padding: 40px;
    }

    @media print {
      body {
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }
    }

    .container {
      max-width: 800px;
      margin: 0 auto;
      background: white;
      border-radius: 16px;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
      overflow: hidden;
    }

    .header {
      background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
      color: white;
      padding: 40px;
      text-align: center;
    }

    .header h1 {
      font-size: 36px;
      font-weight: 700;
      margin-bottom: 10px;
    }

    .header p {
      font-size: 16px;
      opacity: 0.9;
    }

    .content {
      padding: 40px;
    }

    .section {
      margin-bottom: 30px;
    }

    .section h2 {
      font-size: 24px;
      font-weight: 600;
      color: #2563eb;
      margin-bottom: 15px;
      border-bottom: 2px solid #e5e7eb;
      padding-bottom: 10px;
    }

    .metrics {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 20px;
      margin-top: 20px;
    }

    .metric-card {
      background: linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%);
      border-radius: 12px;
      padding: 20px;
      text-align: center;
    }

    .metric-value {
      font-size: 32px;
      font-weight: 700;
      color: #2563eb;
      margin-bottom: 5px;
    }

    .metric-label {
      font-size: 14px;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 20px;
    }

    thead {
      background: #2563eb;
      color: white;
    }

    th, td {
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid #e5e7eb;
    }

    tbody tr:hover {
      background: #f9fafb;
    }

    .footer {
      background: #f3f4f6;
      padding: 20px 40px;
      text-align: center;
      font-size: 12px;
      color: #6b7280;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📊 Relatório de Exemplo</h1>
      <p>Gerado com Puppeteer - Fidelidade Visual Total</p>
    </div>

    <div class="content">
      <div class="section">
        <h2>Métricas Principais</h2>
        <div class="metrics">
          <div class="metric-card">
            <div class="metric-value">1,234</div>
            <div class="metric-label">Total</div>
          </div>
          <div class="metric-card">
            <div class="metric-value">856</div>
            <div class="metric-label">Ativos</div>
          </div>
          <div class="metric-card">
            <div class="metric-value">378</div>
            <div class="metric-label">Pendentes</div>
          </div>
        </div>
      </div>

      <div class="section">
        <h2>Dados Detalhados</h2>
        <table>
          <thead>
            <tr>
              <th>Item</th>
              <th>Quantidade</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Produto A</td>
              <td>150</td>
              <td>✅ Ativo</td>
            </tr>
            <tr>
              <td>Produto B</td>
              <td>230</td>
              <td>✅ Ativo</td>
            </tr>
            <tr>
              <td>Produto C</td>
              <td>89</td>
              <td>⏳ Pendente</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="footer">
      Gerado em ${new Date().toLocaleDateString('pt-BR')} - Sistema Books SND
    </div>
  </div>
</body>
</html>
  `.trim();

  const gerarPDFExemplo = async () => {
    try {
      setLoading(true);
      
      await puppeteerPDFService.gerarEBaixarPDFDeHTML({
        html: htmlExemplo,
        filename: `exemplo_puppeteer_${Date.now()}.pdf`,
        options: {
          format: 'A4',
          orientation: 'portrait',
          printBackground: true,
          margin: {
            top: '0mm',
            bottom: '0mm',
            left: '0mm',
            right: '0mm'
          }
        }
      });

      toast({
        title: 'PDF gerado com sucesso!',
        description: 'O download foi iniciado automaticamente.',
      });
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      toast({
        title: 'Erro ao gerar PDF',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const abrirPDFExemplo = async () => {
    try {
      setLoading(true);
      
      await puppeteerPDFService.gerarEAbrirPDFDeHTML({
        html: htmlExemplo,
        filename: `exemplo_puppeteer_${Date.now()}.pdf`,
        options: {
          format: 'A4',
          orientation: 'portrait',
          printBackground: true
        }
      });

      toast({
        title: 'PDF aberto em nova aba!',
        description: 'Se não abriu, permita popups no navegador.',
      });
    } catch (error) {
      console.error('Erro ao abrir PDF:', error);
      toast({
        title: 'Erro ao abrir PDF',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">
          Exemplo: Geração de PDF com Puppeteer
        </h1>
        <p className="text-gray-600 mt-2">
          Demonstração de geração de PDF com fidelidade visual total ao HTML/CSS
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card: Vantagens */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              Vantagens do Puppeteer
            </CardTitle>
            <CardDescription>
              Por que migramos de @react-pdf/renderer
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <span className="text-green-600 font-bold">✓</span>
                <span>Fidelidade visual 100% ao HTML/CSS</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 font-bold">✓</span>
                <span>Suporte completo a fontes customizadas (Google Fonts)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 font-bold">✓</span>
                <span>Gradientes e sombras preservados</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 font-bold">✓</span>
                <span>CSS moderno (Grid, Flexbox, etc.)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 font-bold">✓</span>
                <span>Desenvolvimento mais rápido (HTML/CSS normal)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600 font-bold">✓</span>
                <span>Debug facilitado (preview no navegador)</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        {/* Card: Ações */}
        <Card>
          <CardHeader>
            <CardTitle>Testar Geração de PDF</CardTitle>
            <CardDescription>
              Clique nos botões abaixo para testar
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              onClick={gerarPDFExemplo}
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Gerando PDF...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Baixar PDF de Exemplo
                </>
              )}
            </Button>

            <Button
              onClick={abrirPDFExemplo}
              disabled={loading}
              variant="outline"
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Gerando PDF...
                </>
              ) : (
                <>
                  <Eye className="h-4 w-4 mr-2" />
                  Abrir PDF em Nova Aba
                </>
              )}
            </Button>

            <div className="text-xs text-gray-500 mt-4 p-3 bg-gray-50 rounded">
              <strong>Nota:</strong> O PDF será gerado com layout moderno,
              gradientes, fontes Google (Inter) e cores preservadas.
              Experimente e compare com a versão antiga!
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Preview do HTML */}
      <Card>
        <CardHeader>
          <CardTitle>Preview do HTML</CardTitle>
          <CardDescription>
            Este é o HTML que será convertido em PDF
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div 
            className="border rounded-lg overflow-hidden"
            dangerouslySetInnerHTML={{ __html: htmlExemplo }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
