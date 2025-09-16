import * as XLSX from 'xlsx';
import { EmpresaClienteCompleta, ColaboradorCompleto } from '@/types/clientBooksTypes';

// Função para exportar empresas/clientes para Excel
export const exportClientesToExcel = (empresas: EmpresaClienteCompleta[]) => {
  // Preparar dados para exportação
  const dadosExportacao = empresas.map(empresa => ({
    'Nome Completo': empresa.nome_completo,
    'Nome Abreviado': empresa.nome_abreviado,
    'Status': empresa.status,
    'Descrição Status': empresa.descricao_status || '',
    'E-mail Gestor': empresa.email_gestor || '',
    'Link SharePoint': empresa.link_sharepoint || '',
    'Template Padrão': empresa.template_padrao,
    'Produtos': empresa.produtos?.map(p => p.produto).join(', ') || '',
    'Quantidade Colaboradores': empresa.colaboradores?.length || 0,
    'Colaboradores Ativos': empresa.colaboradores?.filter(c => c.status === 'ativo').length || 0,
    'Grupos Associados': empresa.grupos?.length || 0,
    'Data de Criação': new Date(empresa.created_at).toLocaleDateString('pt-BR'),
    'Última Atualização': new Date(empresa.updated_at).toLocaleDateString('pt-BR')
  }));

  // Criar workbook
  const wb = XLSX.utils.book_new();
  
  // Criar worksheet com os dados
  const ws = XLSX.utils.json_to_sheet(dadosExportacao);
  
  // Ajustar largura das colunas
  const colWidths = [
    { wch: 30 }, // Nome Completo
    { wch: 20 }, // Nome Abreviado
    { wch: 12 }, // Status
    { wch: 25 }, // Descrição Status
    { wch: 25 }, // E-mail Gestor
    { wch: 40 }, // Link SharePoint
    { wch: 15 }, // Template Padrão
    { wch: 20 }, // Produtos
    { wch: 15 }, // Quantidade Colaboradores
    { wch: 15 }, // Colaboradores Ativos
    { wch: 15 }, // Grupos Associados
    { wch: 15 }, // Data de Criação
    { wch: 18 }  // Última Atualização
  ];
  ws['!cols'] = colWidths;

  // Adicionar worksheet ao workbook
  XLSX.utils.book_append_sheet(wb, ws, 'Clientes');

  // Gerar nome do arquivo com data atual
  const dataAtual = new Date().toISOString().split('T')[0];
  const nomeArquivo = `clientes-${dataAtual}.xlsx`;

  // Fazer download
  XLSX.writeFile(wb, nomeArquivo);
};

// Função para exportar colaboradores para Excel
export const exportColaboradoresToExcel = (colaboradores: ColaboradorCompleto[]) => {
  // Preparar dados para exportação
  const dadosExportacao = colaboradores.map(colaborador => ({
    'Nome Completo': colaborador.nome_completo,
    'E-mail': colaborador.email,
    'Função': colaborador.funcao || '',
    'Empresa': colaborador.empresa.nome_completo,
    'Status': colaborador.status,
    'Descrição Status': colaborador.descricao_status || '',
    'Principal Contato': colaborador.principal_contato ? 'Sim' : 'Não',
    'Data de Criação': new Date(colaborador.created_at).toLocaleDateString('pt-BR'),
    'Última Atualização': new Date(colaborador.updated_at).toLocaleDateString('pt-BR')
  }));

  // Criar workbook
  const wb = XLSX.utils.book_new();
  
  // Criar worksheet com os dados
  const ws = XLSX.utils.json_to_sheet(dadosExportacao);
  
  // Ajustar largura das colunas
  const colWidths = [
    { wch: 30 }, // Nome Completo
    { wch: 30 }, // E-mail
    { wch: 20 }, // Função
    { wch: 30 }, // Empresa
    { wch: 12 }, // Status
    { wch: 25 }, // Descrição Status
    { wch: 15 }, // Principal Contato
    { wch: 15 }, // Data de Criação
    { wch: 18 }  // Última Atualização
  ];
  ws['!cols'] = colWidths;

  // Adicionar worksheet ao workbook
  XLSX.utils.book_append_sheet(wb, ws, 'Colaboradores');

  // Gerar nome do arquivo com data atual
  const dataAtual = new Date().toISOString().split('T')[0];
  const nomeArquivo = `colaboradores-${dataAtual}.xlsx`;

  // Fazer download
  XLSX.writeFile(wb, nomeArquivo);
};

// Função para exportar clientes para PDF
export const exportClientesToPDF = (empresas: EmpresaClienteCompleta[]) => {
  const dataAtual = new Date().toLocaleDateString('pt-BR');
  
  // Criar HTML para impressão/PDF
  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Gerenciamento de Clientes - ${dataAtual}</title>
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
        .empresa {
          margin-bottom: 25px;
          border: 1px solid #ddd;
          border-radius: 8px;
          padding: 15px;
          page-break-inside: avoid;
        }
        .empresa-header {
          border-bottom: 1px solid #eee;
          padding-bottom: 10px;
          margin-bottom: 10px;
        }
        .empresa-nome {
          font-size: 18px;
          font-weight: bold;
          color: #007bff;
          margin: 0;
        }
        .empresa-abreviado {
          color: #666;
          margin: 5px 0 0 0;
          font-style: italic;
        }
        .empresa-info {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          margin-top: 10px;
        }
        .info-item {
          display: flex;
          justify-content: space-between;
          padding: 5px 0;
          border-bottom: 1px dotted #ddd;
        }
        .info-label {
          font-weight: bold;
          color: #555;
        }
        .info-value {
          color: #333;
        }
        .status-ativo { color: #28a745; }
        .status-inativo { color: #dc3545; }
        .status-suspenso { color: #ffc107; }
        .produtos-section, .colaboradores-section {
          margin-top: 15px;
          padding: 10px;
          background: #f8f9fa;
          border-radius: 4px;
        }
        .section-title {
          font-weight: bold;
          margin-bottom: 8px;
          color: #333;
        }
        .colaborador-item {
          background: white;
          padding: 8px;
          margin: 5px 0;
          border-radius: 4px;
          border-left: 3px solid #007bff;
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
          .empresa { page-break-inside: avoid; }
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Gerenciamento de Clientes</h1>
        <p>Relatório gerado em ${dataAtual}</p>
      </div>
      
      <div class="summary">
        <strong>Total de clientes: ${empresas.length}</strong><br>
        <strong>Clientes ativos: ${empresas.filter(e => e.status === 'ativo').length}</strong><br>
        <strong>Total de colaboradores: ${empresas.reduce((total, e) => total + (e.colaboradores?.length || 0), 0)}</strong>
      </div>

      ${empresas.map(empresa => `
        <div class="empresa">
          <div class="empresa-header">
            <h2 class="empresa-nome">${empresa.nome_completo}</h2>
            <p class="empresa-abreviado">${empresa.nome_abreviado}</p>
          </div>
          
          <div class="empresa-info">
            <div class="info-item">
              <span class="info-label">Status:</span>
              <span class="info-value status-${empresa.status}">${empresa.status.toUpperCase()}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Template:</span>
              <span class="info-value">${empresa.template_padrao}</span>
            </div>
            <div class="info-item">
              <span class="info-label">E-mail Gestor:</span>
              <span class="info-value">${empresa.email_gestor || 'Não informado'}</span>
            </div>
            <div class="info-item">
              <span class="info-label">Criado em:</span>
              <span class="info-value">${new Date(empresa.created_at).toLocaleDateString('pt-BR')}</span>
            </div>
          </div>

          ${empresa.produtos && empresa.produtos.length > 0 ? `
            <div class="produtos-section">
              <div class="section-title">Produtos (${empresa.produtos.length}):</div>
              ${empresa.produtos.map(produto => `<span style="background: #e9ecef; padding: 2px 8px; border-radius: 12px; margin: 2px; display: inline-block;">${produto.produto}</span>`).join('')}
            </div>
          ` : ''}

          ${empresa.colaboradores && empresa.colaboradores.length > 0 ? `
            <div class="colaboradores-section">
              <div class="section-title">Colaboradores (${empresa.colaboradores.length}):</div>
              ${empresa.colaboradores.map(colab => `
                <div class="colaborador-item">
                  <strong>${colab.nome_completo}</strong> - ${colab.email}<br>
                  <small>Função: ${colab.funcao || 'Não informada'} | Status: ${colab.status}${colab.principal_contato ? ' | Principal Contato' : ''}</small>
                </div>
              `).join('')}
            </div>
          ` : ''}
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

// Interface para dados de importação de empresas
export interface EmpresaImportData {
  nomeCompleto: string;
  nomeAbreviado: string;
  status: string;
  descricaoStatus?: string;
  emailGestor?: string;
  linkSharepoint?: string;
  templatePadrao: string;
  produtos: string; // Produtos separados por vírgula
}

// Interface para dados de importação de colaboradores
export interface ColaboradorImportData {
  nomeCompleto: string;
  email: string;
  funcao?: string;
  empresaNome: string; // Nome da empresa para associação
  status: string;
  descricaoStatus?: string;
  principalContato: string; // 'Sim' ou 'Não'
}

// Função para processar arquivo Excel de importação de empresas
export const processImportEmpresasExcel = (file: File): Promise<EmpresaImportData[]> => {
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
        const nomeCompletoIndex = headers.findIndex(h => 
          h && h.toLowerCase().includes('nome completo')
        );
        const nomeAbreviadoIndex = headers.findIndex(h => 
          h && h.toLowerCase().includes('nome abreviado')
        );
        const statusIndex = headers.findIndex(h => 
          h && h.toLowerCase().includes('status') && !h.toLowerCase().includes('descrição')
        );
        const descricaoStatusIndex = headers.findIndex(h => 
          h && h.toLowerCase().includes('descrição') && h.toLowerCase().includes('status')
        );
        const emailGestorIndex = headers.findIndex(h => 
          h && h.toLowerCase().includes('email') && h.toLowerCase().includes('gestor')
        );
        const linkSharepointIndex = headers.findIndex(h => 
          h && h.toLowerCase().includes('sharepoint')
        );
        const templatePadraoIndex = headers.findIndex(h => 
          h && h.toLowerCase().includes('template')
        );
        const produtosIndex = headers.findIndex(h => 
          h && h.toLowerCase().includes('produto')
        );

        if (nomeCompletoIndex === -1) {
          throw new Error('Coluna "Nome Completo" não encontrada no arquivo');
        }
        if (nomeAbreviadoIndex === -1) {
          throw new Error('Coluna "Nome Abreviado" não encontrada no arquivo');
        }

        // Processar cada linha
        const empresas: EmpresaImportData[] = rows
          .filter(row => row[nomeCompletoIndex]) // Filtrar linhas com nome
          .map(row => ({
            nomeCompleto: String(row[nomeCompletoIndex]).trim(),
            nomeAbreviado: String(row[nomeAbreviadoIndex]).trim(),
            status: statusIndex !== -1 && row[statusIndex] 
              ? String(row[statusIndex]).trim().toLowerCase() 
              : 'ativo',
            descricaoStatus: descricaoStatusIndex !== -1 && row[descricaoStatusIndex] 
              ? String(row[descricaoStatusIndex]).trim() 
              : undefined,
            emailGestor: emailGestorIndex !== -1 && row[emailGestorIndex] 
              ? String(row[emailGestorIndex]).trim() 
              : undefined,
            linkSharepoint: linkSharepointIndex !== -1 && row[linkSharepointIndex] 
              ? String(row[linkSharepointIndex]).trim() 
              : undefined,
            templatePadrao: templatePadraoIndex !== -1 && row[templatePadraoIndex] 
              ? String(row[templatePadraoIndex]).trim() 
              : 'portugues',
            produtos: produtosIndex !== -1 && row[produtosIndex] 
              ? String(row[produtosIndex]).trim() 
              : ''
          }));

        resolve(empresas);
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

// Função para processar arquivo Excel de importação de colaboradores
export const processImportColaboradoresExcel = (file: File): Promise<ColaboradorImportData[]> => {
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
        const nomeCompletoIndex = headers.findIndex(h => 
          h && h.toLowerCase().includes('nome')
        );
        const emailIndex = headers.findIndex(h => 
          h && h.toLowerCase().includes('email') && !h.toLowerCase().includes('gestor')
        );
        const funcaoIndex = headers.findIndex(h => 
          h && h.toLowerCase().includes('função') || h.toLowerCase().includes('funcao')
        );
        const empresaIndex = headers.findIndex(h => 
          h && h.toLowerCase().includes('empresa')
        );
        const statusIndex = headers.findIndex(h => 
          h && h.toLowerCase().includes('status') && !h.toLowerCase().includes('descrição')
        );
        const descricaoStatusIndex = headers.findIndex(h => 
          h && h.toLowerCase().includes('descrição') && h.toLowerCase().includes('status')
        );
        const principalContatoIndex = headers.findIndex(h => 
          h && h.toLowerCase().includes('principal') && h.toLowerCase().includes('contato')
        );

        if (nomeCompletoIndex === -1) {
          throw new Error('Coluna "Nome" não encontrada no arquivo');
        }
        if (emailIndex === -1) {
          throw new Error('Coluna "E-mail" não encontrada no arquivo');
        }
        if (empresaIndex === -1) {
          throw new Error('Coluna "Empresa" não encontrada no arquivo');
        }

        // Processar cada linha
        const colaboradores: ColaboradorImportData[] = rows
          .filter(row => row[nomeCompletoIndex] && row[emailIndex]) // Filtrar linhas com nome e email
          .map(row => ({
            nomeCompleto: String(row[nomeCompletoIndex]).trim(),
            email: String(row[emailIndex]).trim(),
            funcao: funcaoIndex !== -1 && row[funcaoIndex] 
              ? String(row[funcaoIndex]).trim() 
              : undefined,
            empresaNome: String(row[empresaIndex]).trim(),
            status: statusIndex !== -1 && row[statusIndex] 
              ? String(row[statusIndex]).trim().toLowerCase() 
              : 'ativo',
            descricaoStatus: descricaoStatusIndex !== -1 && row[descricaoStatusIndex] 
              ? String(row[descricaoStatusIndex]).trim() 
              : undefined,
            principalContato: principalContatoIndex !== -1 && row[principalContatoIndex] 
              ? String(row[principalContatoIndex]).trim().toLowerCase() 
              : 'não'
          }));

        resolve(colaboradores);
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

// Função para processar string de produtos
export const processProdutosString = (produtosString: string): string[] => {
  if (!produtosString.trim()) return [];

  // Separar por vírgula, ponto e vírgula ou quebra de linha
  const produtos = produtosString
    .split(/[,;\n]/)
    .map(item => item.trim().toUpperCase())
    .filter(item => item.length > 0);

  // Mapear produtos válidos
  const produtosValidos = ['CE_PLUS', 'FISCAL', 'GALLERY'];
  const produtosMapeados: { [key: string]: string } = {
    'CE PLUS': 'CE_PLUS',
    'CE-PLUS': 'CE_PLUS',
    'CEPLUS': 'CE_PLUS',
    'CE': 'CE_PLUS'
  };

  return produtos
    .map(produto => produtosMapeados[produto] || produto)
    .filter(produto => produtosValidos.includes(produto));
};

// Função para gerar template Excel para importação de empresas
export const downloadImportEmpresasTemplate = () => {
  const templateData = [
    {
      'Nome Completo': 'Exemplo Empresa LTDA',
      'Nome Abreviado': 'EXEMPLO',
      'Status': 'ativo',
      'Descrição Status': 'Cliente ativo (opcional)',
      'E-mail Gestor': 'gestor@exemplo.com',
      'Link SharePoint': 'https://sharepoint.exemplo.com',
      'Template Padrão': 'portugues',
      'Produtos': 'CE_PLUS, FISCAL'
    },
    {
      'Nome Completo': 'Outra Empresa S.A.',
      'Nome Abreviado': 'OUTRA',
      'Status': 'ativo',
      'Descrição Status': '',
      'E-mail Gestor': 'admin@outra.com',
      'Link SharePoint': '',
      'Template Padrão': 'ingles',
      'Produtos': 'GALLERY'
    }
  ];

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(templateData);
  
  // Ajustar largura das colunas
  ws['!cols'] = [
    { wch: 30 }, // Nome Completo
    { wch: 20 }, // Nome Abreviado
    { wch: 12 }, // Status
    { wch: 25 }, // Descrição Status
    { wch: 25 }, // E-mail Gestor
    { wch: 40 }, // Link SharePoint
    { wch: 15 }, // Template Padrão
    { wch: 20 }  // Produtos
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Template');
  XLSX.writeFile(wb, 'template-importacao-empresas.xlsx');
};

// Função para gerar template Excel para importação de colaboradores
export const downloadImportColaboradoresTemplate = () => {
  const templateData = [
    {
      'Nome Completo': 'João Silva',
      'E-mail': 'joao@exemplo.com',
      'Função': 'Gerente',
      'Empresa': 'Exemplo Empresa LTDA',
      'Status': 'ativo',
      'Descrição Status': 'Colaborador ativo (opcional)',
      'Principal Contato': 'Sim'
    },
    {
      'Nome Completo': 'Maria Santos',
      'E-mail': 'maria@outra.com',
      'Função': 'Analista',
      'Empresa': 'Outra Empresa S.A.',
      'Status': 'ativo',
      'Descrição Status': '',
      'Principal Contato': 'Não'
    }
  ];

  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.json_to_sheet(templateData);
  
  // Ajustar largura das colunas
  ws['!cols'] = [
    { wch: 25 }, // Nome Completo
    { wch: 30 }, // E-mail
    { wch: 20 }, // Função
    { wch: 30 }, // Empresa
    { wch: 12 }, // Status
    { wch: 25 }, // Descrição Status
    { wch: 15 }  // Principal Contato
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Template');
  XLSX.writeFile(wb, 'template-importacao-colaboradores.xlsx');
};
