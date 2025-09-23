import * as XLSX from 'xlsx';
import { EmpresaClienteCompleta, ClienteCompleto } from '@/types/clientBooksTypes';
import jsPDF from 'jspdf';

// Função para exportar empresas para Excel
export const exportEmpresasToExcel = (empresas: EmpresaClienteCompleta[]) => {
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
    'Quantidade Clientes': empresa.clientes?.length || 0,
    'Clientes Ativos': empresa.clientes?.filter(c => c.status === 'ativo').length || 0,
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
    { wch: 15 }, // Quantidade Clientes
    { wch: 15 }, // Clientes Ativos
    { wch: 15 }, // Grupos Associados
    { wch: 15 }, // Data de Criação
    { wch: 18 }  // Última Atualização
  ];
  ws['!cols'] = colWidths;

  // Adicionar worksheet ao workbook
  XLSX.utils.book_append_sheet(wb, ws, 'Empresas');

  // Gerar nome do arquivo com data atual
  const dataAtual = new Date().toISOString().split('T')[0];
  const nomeArquivo = `empresas-${dataAtual}.xlsx`;

  // Fazer download
  XLSX.writeFile(wb, nomeArquivo);
};

// Função para exportar clientes para Excel
export const exportClientesToExcel = (clientes: ClienteCompleto[]) => {
  // Preparar dados para exportação
  const dadosExportacao = clientes.map(cliente => ({
    'Nome Completo': cliente.nome_completo,
    'E-mail': cliente.email,
    'Função': cliente.funcao || '',
    'Empresa': cliente.empresa.nome_completo,
    'Status': cliente.status,
    'Descrição Status': cliente.descricao_status || '',
    'Principal Contato': cliente.principal_contato ? 'Sim' : 'Não',
    'Data de Criação': new Date(cliente.created_at).toLocaleDateString('pt-BR'),
    'Última Atualização': new Date(cliente.updated_at).toLocaleDateString('pt-BR')
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
  XLSX.utils.book_append_sheet(wb, ws, 'Clientes');

  // Gerar nome do arquivo com data atual
  const dataAtual = new Date().toISOString().split('T')[0];
  const nomeArquivo = `clientes-${dataAtual}.xlsx`;

  // Fazer download
  XLSX.writeFile(wb, nomeArquivo);
};

// Função para exportar clientes para PDF seguindo exatamente o padrão visual das empresas
export const exportClientesToPDF = async (
  clientes: ClienteCompleto[],
  empresas: EmpresaClienteCompleta[]
) => {
  if (!clientes || clientes.length === 0) {
    throw new Error('Nenhum cliente encontrado para exportar');
  }

  if (!empresas || empresas.length === 0) {
    throw new Error('Nenhuma empresa encontrada para exportar');
  }

  // Mapear clientes com suas empresas
  const todosClientes: Array<ClienteCompleto & { empresa: EmpresaClienteCompleta }> = [];
  clientes.forEach(cliente => {
    const empresa = empresas.find(e => e.id === cliente.empresa_id);
    if (empresa) {
      todosClientes.push({
        ...cliente,
        empresa: empresa
      });
    }
  });

  if (todosClientes.length === 0) {
    throw new Error('Nenhum cliente com empresa associada encontrado para exportar');
  }

  // Criar novo documento PDF
  const doc = new jsPDF('portrait', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Configurar fonte
  doc.setFont('helvetica');

  // Cores do tema (usando a cor azul padrão do sistema - igual às empresas)
  const colors = {
    primary: [37, 99, 235] as const,      // Azul Sonda (#2563eb) - cor padrão do sistema
    secondary: [59, 130, 246] as const,   // Azul claro derivado
    success: [46, 204, 113] as const,     // Verde
    warning: [241, 196, 15] as const,     // Amarelo
    danger: [231, 76, 60] as const,       // Vermelho
    light: [236, 240, 241] as const,      // Cinza claro
    dark: [52, 73, 94] as const,          // Cinza escuro
    white: [255, 255, 255] as const       // Branco
  };

  // Função para desenhar cabeçalho
  const drawHeader = () => {
    // Fundo do cabeçalho
    doc.setFillColor(...colors.primary);
    doc.rect(0, 0, pageWidth, 35, 'F');

    // Título principal
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    const titulo = 'Gerenciamento de Clientes';
    const tituloWidth = doc.getTextWidth(titulo);
    doc.text(titulo, (pageWidth - tituloWidth) / 2, 20);

    // Subtítulo com data
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const dataAtual = new Date().toLocaleDateString('pt-BR');
    const subtitulo = `Relatório gerado em ${dataAtual}`;
    const subtituloWidth = doc.getTextWidth(subtitulo);
    doc.text(subtitulo, (pageWidth - subtituloWidth) / 2, 28);
  };

  // Função para desenhar caixa de resumo
  const drawSummaryBox = (y: number) => {
    const boxHeight = 30;
    const boxY = y;

    // Fundo da caixa de resumo
    doc.setFillColor(...colors.light);
    doc.rect(15, boxY, pageWidth - 30, boxHeight, 'F');

    // Borda da caixa
    doc.setDrawColor(...colors.primary);
    doc.setLineWidth(0.5);
    doc.rect(15, boxY, pageWidth - 30, boxHeight, 'S');

    // Calcular estatísticas dos clientes
    const totalClientes = todosClientes.length;
    const clientesAtivos = todosClientes.filter(c => c.status === 'ativo').length;
    const clientesInativos = todosClientes.filter(c => c.status === 'inativo').length;
    const clientesSuspensos = todosClientes.filter(c => c.status === 'suspenso').length;

    // Texto do resumo
    doc.setTextColor(...colors.dark);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');

    const resumoY = boxY + 8;
    doc.text(`Total de clientes: ${totalClientes}`, 25, resumoY);
    doc.text(`Clientes ativos: ${clientesAtivos}`, 25, resumoY + 6);
    doc.text(`Clientes inativos: ${clientesInativos}`, 25, resumoY + 12);
    doc.text(`Clientes suspensos: ${clientesSuspensos}`, 25, resumoY + 18);

    return boxY + boxHeight + 10;
  };

  // Função para desenhar card de cliente seguindo o padrão das empresas
  const drawClienteCard = (cliente: ClienteCompleto & { empresa: EmpresaClienteCompleta }, y: number) => {
    const cardHeight = 45;
    const cardMargin = 15;
    const cardWidth = pageWidth - (cardMargin * 2);

    // Verificar se cabe na página
    if (y + cardHeight > pageHeight - 20) {
      doc.addPage();
      drawHeader();
      y = 45;
    }

    // Fundo do card
    doc.setFillColor(...colors.white);
    doc.rect(cardMargin, y, cardWidth, cardHeight, 'F');

    // Borda do card
    doc.setDrawColor(...colors.light);
    doc.setLineWidth(0.3);
    doc.rect(cardMargin, y, cardWidth, cardHeight, 'S');

    // Barra lateral colorida baseada no status do cliente
    let statusColor: readonly [number, number, number] = colors.success; // Verde para ativo
    if (cliente.status === 'inativo') statusColor = colors.danger;
    if (cliente.status === 'suspenso') statusColor = colors.warning;

    doc.setFillColor(statusColor[0], statusColor[1], statusColor[2]);
    doc.rect(cardMargin, y, 4, cardHeight, 'F');

    // Conteúdo do card
    const contentX = cardMargin + 10;
    let contentY = y + 8;

    // Nome do cliente (título principal)
    doc.setTextColor(...colors.dark);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(cliente.nome_completo.toUpperCase(), contentX, contentY);

    // Empresa do cliente (subtítulo)
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text(cliente.empresa.nome_abreviado, contentX, contentY + 5);

    contentY += 12;

    // Informações em duas colunas (seguindo padrão das empresas)
    doc.setFontSize(8);
    doc.setTextColor(...colors.dark);

    // Coluna esquerda
    doc.setFont('helvetica', 'bold');
    doc.text('Status:', contentX, contentY);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(statusColor[0], statusColor[1], statusColor[2]);
    doc.text(cliente.status.toUpperCase(), contentX + 20, contentY);

    doc.setTextColor(...colors.dark);
    doc.setFont('helvetica', 'bold');
    doc.text('E-mail:', contentX, contentY + 5);
    doc.setFont('helvetica', 'normal');
    doc.text(cliente.email, contentX + 20, contentY + 5);

    // Coluna direita
    const rightColumnX = contentX + 90;
    doc.setFont('helvetica', 'bold');
    doc.text('Criado em:', rightColumnX, contentY);
    doc.setFont('helvetica', 'normal');
    const criadoEm = new Date(cliente.created_at).toLocaleDateString('pt-BR');
    doc.text(criadoEm, rightColumnX + 25, contentY);

    // Função do cliente
    if (cliente.funcao) {
      doc.setFont('helvetica', 'bold');
      doc.text('Função:', rightColumnX, contentY + 5);
      doc.setFont('helvetica', 'normal');
      // Truncar função se for muito longa
      const funcao = cliente.funcao.length > 20
        ? cliente.funcao.substring(0, 20) + '...'
        : cliente.funcao;
      doc.text(funcao, rightColumnX + 20, contentY + 5);
    }

    // Principal contato (se aplicável)
    if (cliente.principal_contato) {
      doc.setTextColor(...colors.primary);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.text('PRINCIPAL CONTATO', contentX, contentY + 15);
    }

    return y + cardHeight + 5;
  };

  // Desenhar primeira página
  drawHeader();
  let currentY = 45;

  // Desenhar caixa de resumo
  currentY = drawSummaryBox(currentY);

  // Ordenar clientes por nome
  todosClientes.sort((a, b) => a.nome_completo.localeCompare(b.nome_completo));

  // Desenhar cards dos clientes
  for (const cliente of todosClientes) {
    currentY = drawClienteCard(cliente, currentY);
  }

  // Gerar nome do arquivo com data atual
  const dataArquivo = new Date().toLocaleDateString('pt-BR').replace(/\//g, '-');
  const nomeArquivo = `gerenciamento_clientes_${dataArquivo}.pdf`;

  // Fazer download do arquivo
  doc.save(nomeArquivo);
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

// Interface para dados de importação de clientes
export interface ClienteImportData {
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

// Função para processar arquivo Excel de importação de clientes
export const processImportClientesExcel = (file: File): Promise<ClienteImportData[]> => {
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
          h && (h.toLowerCase().includes('email') || h.toLowerCase().includes('e-mail')) && !h.toLowerCase().includes('gestor')
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
        const clientes: ClienteImportData[] = rows
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

        resolve(clientes);
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

// Função para gerar template Excel para importação de clientes
export const downloadImportClientesTemplate = () => {
  const templateData = [
    {
      'Nome Completo': 'João Silva',
      'E-mail': 'joao@exemplo.com',
      'Função': 'Gerente',
      'Empresa': 'Exemplo Empresa LTDA',
      'Status': 'ativo',
      'Descrição Status': 'Cliente ativo (opcional)',
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
  XLSX.writeFile(wb, 'template-importacao-clientes.xlsx');
};
