import * as XLSX from 'xlsx';
import { GrupoResponsavelCompleto } from '@/types/clientBooksTypes';

// Função para exportar grupos para Excel
export const exportGruposToExcel = (grupos: GrupoResponsavelCompleto[]) => {
  // Preparar dados para exportação
  const dadosExportacao = grupos.map(grupo => ({
    'Nome do Grupo': grupo.nome,
    'Descrição': grupo.descricao || '',
    'Quantidade de E-mails': grupo.emails?.length || 0,
    'E-mails': grupo.emails?.map(email => `${email.nome || ''} <${email.email}>`).join('; ') || '',
    'Data de Criação': new Date(grupo.created_at).toLocaleDateString('pt-BR'),
    'Última Atualização': new Date(grupo.updated_at).toLocaleDateString('pt-BR')
  }));

  // Criar workbook
  const wb = XLSX.utils.book_new();
  
  // Criar worksheet com os dados
  const ws = XLSX.utils.json_to_sheet(dadosExportacao);
  
  // Ajustar largura das colunas
  const colWidths = [
    { wch: 25 }, // Nome do Grupo
    { wch: 40 }, // Descrição
    { wch: 15 }, // Quantidade de E-mails
    { wch: 60 }, // E-mails
    { wch: 15 }, // Data de Criação
    { wch: 18 }  // Última Atualização
  ];
  ws['!cols'] = colWidths;

  // Adicionar worksheet ao workbook
  XLSX.utils.book_append_sheet(wb, ws, 'Grupos Responsáveis');

  // Gerar nome do arquivo com data atual
  const dataAtual = new Date().toISOString().split('T')[0];
  const nomeArquivo = `grupos-responsaveis-${dataAtual}.xlsx`;

  // Fazer download
  XLSX.writeFile(wb, nomeArquivo);
};

// Função para exportar grupos para PDF (usando HTML para conversão)
export const exportGruposToPDF = (grupos: GrupoResponsavelCompleto[]) => {
  const dataAtual = new Date().toLocaleDateString('pt-BR');
  
  // Criar HTML para impressão/PDF
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Grupos de Responsáveis - ${dataAtual}</title>
      <style>
        body {
          font-family: Arial, sans-serif;
          margin: 20px;
          color: #333;
        }
        .header {
          text-align: center;
          margin-bottom: 30px;
          border-bottom: 2px solid #007bff;
          padding-bottom: 10px;
        }
        .header h1 {
          color: #007bff;
          margin: 0;
        }
        .header p {
          margin: 5px 0 0 0;
          color: #666;
        }
        .grupo {
          margin-bottom: 25px;
          border: 1px solid #ddd;
          border-radius: 8px;
          padding: 15px;
          page-break-inside: avoid;
        }
        .grupo-header {
          border-bottom: 1px solid #eee;
          padding-bottom: 10px;
          margin-bottom: 10px;
        }
        .grupo-nome {
          font-size: 18px;
          font-weight: bold;
          color: #007bff;
          margin: 0;
        }
        .grupo-descricao {
          color: #666;
          margin: 5px 0 0 0;
          font-style: italic;
        }
        .grupo-info {
          display: flex;
          justify-content: space-between;
          margin-top: 10px;
          font-size: 12px;
          color: #888;
        }
        .emails-section {
          margin-top: 10px;
        }
        .emails-title {
          font-weight: bold;
          margin-bottom: 8px;
          color: #333;
        }
        .email-item {
          background: #f8f9fa;
          padding: 5px 10px;
          margin: 3px 0;
          border-radius: 4px;
          font-size: 14px;
        }
        .no-emails {
          color: #999;
          font-style: italic;
        }
        .summary {
          background: #f0f8ff;
          padding: 15px;
          border-radius: 8px;
          margin-bottom: 20px;
          text-align: center;
        }
        @media print {
          body { margin: 0; }
          .grupo { page-break-inside: avoid; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Grupos de Responsáveis</h1>
        <p>Relatório gerado em ${dataAtual}</p>
      </div>
      
      <div class="summary">
        <strong>Total de grupos: ${grupos.length}</strong><br>
        <strong>Grupos com e-mails: ${grupos.filter(g => g.emails && g.emails.length > 0).length}</strong><br>
        <strong>Total de e-mails cadastrados: ${grupos.reduce((total, g) => total + (g.emails?.length || 0), 0)}</strong>
      </div>

      ${grupos.map(grupo => `
        <div class="grupo">
          <div class="grupo-header">
            <h2 class="grupo-nome">${grupo.nome}</h2>
            ${grupo.descricao ? `<p class="grupo-descricao">${grupo.descricao}</p>` : ''}
            <div class="grupo-info">
              <span>Criado em: ${new Date(grupo.created_at).toLocaleDateString('pt-BR')}</span>
              <span>Atualizado em: ${new Date(grupo.updated_at).toLocaleDateString('pt-BR')}</span>
            </div>
          </div>
          
          <div class="emails-section">
            <div class="emails-title">E-mails (${grupo.emails?.length || 0}):</div>
            ${grupo.emails && grupo.emails.length > 0 
              ? grupo.emails.map(email => `
                  <div class="email-item">
                    ${email.nome ? `${email.nome} - ` : ''}${email.email}
                  </div>
                `).join('')
              : '<div class="no-emails">Nenhum e-mail cadastrado</div>'
            }
          </div>
        </div>
      `).join('')}
    </body>
    </html>
  `;

  // Abrir nova janela para impressão/PDF
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    
    // Aguardar carregamento e abrir diálogo de impressão
    printWindow.onload = () => {
      printWindow.print();
    };
  }
};

// Interface para dados de importação
export interface GrupoImportData {
  nome: string;
  descricao?: string;
  emails: string; // E-mails separados por vírgula ou ponto e vírgula
}

// Função para processar arquivo Excel de importação
export const processImportExcel = (file: File): Promise<GrupoImportData[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        // Pegar a primeira planilha
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Converter para JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
        
        // Processar dados (assumindo que a primeira linha são os cabeçalhos)
        const headers = jsonData[0] as string[];
        const rows = jsonData.slice(1);
        
        // Mapear colunas esperadas
        const nomeIndex = headers.findIndex(h => 
          h && h.toLowerCase().includes('nome')
        );
        const descricaoIndex = headers.findIndex(h => 
          h && (h.toLowerCase().includes('descrição') || h.toLowerCase().includes('descricao'))
        );
        const emailsIndex = headers.findIndex(h => 
          h && (h.toLowerCase().includes('email') || h.toLowerCase().includes('e-mail'))
        );

        if (nomeIndex === -1) {
          throw new Error('Coluna "Nome" não encontrada no arquivo');
        }

        // Processar cada linha
        const grupos: GrupoImportData[] = rows
          .filter(row => row[nomeIndex]) // Filtrar linhas com nome
          .map(row => ({
            nome: String(row[nomeIndex]).trim(),
            descricao: descricaoIndex !== -1 && row[descricaoIndex] 
              ? String(row[descricaoIndex]).trim() 
              : undefined,
            emails: emailsIndex !== -1 && row[emailsIndex] 
              ? String(row[emailsIndex]).trim() 
              : ''
          }));

        resolve(grupos);
      } catch (error) {
        reject(new Error(`Erro ao processar arquivo: ${error}`));
      }
    };

    reader.onerror = () => {
      reject(new Error('Erro ao ler arquivo'));
    };

    reader.readAsArrayBuffer(file);
  });
};

// Função para validar e processar e-mails de uma string
export const processEmailString = (emailsString: string): { email: string; nome?: string }[] => {
  if (!emailsString.trim()) return [];

  // Separar por vírgula, ponto e vírgula ou quebra de linha
  const emailItems = emailsString
    .split(/[,;\n]/)
    .map(item => item.trim())
    .filter(item => item.length > 0);

  return emailItems.map(item => {
    // Verificar se tem formato "Nome <email@domain.com>"
    const matchNomeEmail = item.match(/^(.+?)\s*<(.+?)>$/);
    if (matchNomeEmail) {
      return {
        nome: matchNomeEmail[1].trim(),
        email: matchNomeEmail[2].trim()
      };
    }

    // Verificar se tem formato "Nome - email@domain.com"
    const matchNomeEmailDash = item.match(/^(.+?)\s*-\s*(.+)$/);
    if (matchNomeEmailDash && matchNomeEmailDash[2].includes('@')) {
      return {
        nome: matchNomeEmailDash[1].trim(),
        email: matchNomeEmailDash[2].trim()
      };
    }

    // Assumir que é só o e-mail
    return {
      email: item.trim()
    };
  }).filter(emailObj => {
    // Validação básica de e-mail
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(emailObj.email);
  });
};

// Função para gerar template Excel para importação
export const downloadImportTemplate = () => {
  const templateData = [
    {
      'Nome do Grupo': 'Exemplo Grupo 1',
      'Descrição': 'Descrição do grupo (opcional)',
      'E-mails': 'João Silva <joao@empresa.com>; Maria Santos <maria@empresa.com>'
    },
    {
      'Nome do Grupo': 'Exemplo Grupo 2',
      'Descrição': 'Outro grupo de exemplo',
      'E-mails': 'admin@empresa.com, suporte@empresa.com'
    }
  ];

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(templateData);
  
  // Ajustar largura das colunas
  ws['!cols'] = [
    { wch: 25 }, // Nome do Grupo
    { wch: 40 }, // Descrição
    { wch: 60 }  // E-mails
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Template');
  XLSX.writeFile(wb, 'template-importacao-grupos.xlsx');
};
