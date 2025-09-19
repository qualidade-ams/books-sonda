import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import type { EmpresaClienteCompleta } from '@/types/clientBooks';
import { supabase } from '@/integrations/supabase/client';

// Declaração para o plugin autotable do jsPDF
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

/**
 * Mapeia o template_padrao para sua descrição legível
 */
const mapearTemplatePadrao = async (templateId: string): Promise<string> => {
  // Templates padrão do sistema
  const templatesDefault: { [key: string]: string } = {
    'portugues': 'Português',
    'ingles': 'Inglês'
  };

  // Se é um template padrão, retornar a descrição
  if (templatesDefault[templateId]) {
    return templatesDefault[templateId];
  }

  // Se é um UUID, buscar o template personalizado no banco
  try {
    const { data: template, error } = await supabase
      .from('email_templates')
      .select('nome')
      .eq('id', templateId)
      .eq('ativo', true)
      .single();

    if (error || !template) {
      return templateId; // Retorna o ID se não encontrar
    }

    return template.nome;
  } catch (error) {
    console.error('Erro ao buscar template:', error);
    return templateId; // Retorna o ID em caso de erro
  }
};

/**
 * Exporta dados de empresas para Excel
 */
export const exportEmpresasToExcel = async (empresas: EmpresaClienteCompleta[]) => {
  if (!empresas || empresas.length === 0) {
    throw new Error('Nenhuma empresa encontrada para exportar');
  }

  // Preparar dados para exportação com mapeamento de templates
  const dadosExportacao = await Promise.all(
    empresas.map(async (empresa) => ({
      'Nome Completo': empresa.nome_completo,
      'Nome Abreviado': empresa.nome_abreviado,
      'Status': empresa.status,
      'Descrição Status': empresa.descricao_status || '',
      'E-mail Gestor': empresa.email_gestor || '',
      'Template Padrão': await mapearTemplatePadrao(empresa.template_padrao),
      'Tem AMS': empresa.tem_ams ? 'Sim' : 'Não',
      'Tipo de Book': empresa.tipo_book,
      'Book Personalizado': empresa.book_personalizado ? 'Sim' : 'Não',
      'Permite Anexo': empresa.anexo ? 'Sim' : 'Não',
      'Vigência Inicial': empresa.vigencia_inicial || '',
      'Vigência Final': empresa.vigencia_final || '',
      'Link SharePoint': empresa.link_sharepoint || '',
      'Produtos': empresa.produtos?.map(p => p.produto).join(', ') || '',
      'Grupos Responsáveis': empresa.grupos?.map(g => g.grupos_responsaveis?.nome).filter(Boolean).join(', ') || '',
      'Data de Criação': new Date(empresa.created_at).toLocaleDateString('pt-BR'),
      'Última Atualização': new Date(empresa.updated_at).toLocaleDateString('pt-BR')
    }))
  );

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
    { wch: 20 }, // Template Padrão
    { wch: 10 }, // Tem AMS
    { wch: 15 }, // Tipo de Book
    { wch: 15 }, // Book Personalizado
    { wch: 15 }, // Permite Anexo
    { wch: 15 }, // Vigência Inicial
    { wch: 15 }, // Vigência Final
    { wch: 40 }, // Link SharePoint
    { wch: 20 }, // Produtos
    { wch: 25 }, // Grupos Responsáveis
    { wch: 15 }, // Data de Criação
    { wch: 15 }  // Última Atualização
  ];

  ws['!cols'] = colWidths;

  // Adicionar worksheet ao workbook
  XLSX.utils.book_append_sheet(wb, ws, 'Empresas');

  // Gerar nome do arquivo com data atual
  const dataAtual = new Date().toLocaleDateString('pt-BR').replace(/\//g, '-');
  const nomeArquivo = `empresas_${dataAtual}.xlsx`;

  // Fazer download do arquivo
  XLSX.writeFile(wb, nomeArquivo);
};

/**
 * Exporta dados de empresas para PDF no padrão visual aprimorado
 */
export const exportEmpresasToPDF = async (empresas: EmpresaClienteCompleta[]) => {
  if (!empresas || empresas.length === 0) {
    throw new Error('Nenhuma empresa encontrada para exportar');
  }

  // Criar novo documento PDF
  const doc = new jsPDF('portrait', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // Configurar fonte
  doc.setFont('helvetica');

  // Cores do tema (usando a cor azul padrão do sistema)
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
    const titulo = 'Gerenciamento de Empresas';
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

    // Calcular estatísticas
    const total = empresas.length;
    const ativas = empresas.filter(e => e.status === 'ativo').length;
    const inativas = empresas.filter(e => e.status === 'inativo').length;
    const suspensas = empresas.filter(e => e.status === 'suspenso').length;

    // Texto do resumo
    doc.setTextColor(...colors.dark);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');

    const resumoY = boxY + 8;
    doc.text(`Total de empresas: ${total}`, 25, resumoY);
    doc.text(`Empresas ativas: ${ativas}`, 25, resumoY + 6);
    doc.text(`Empresas inativas: ${inativas}`, 25, resumoY + 12);
    doc.text(`Empresas suspensas: ${suspensas}`, 25, resumoY + 18);

    return boxY + boxHeight + 10;
  };

  // Função para desenhar card de empresa
  const drawEmpresaCard = async (empresa: EmpresaClienteCompleta, y: number) => {
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

    // Barra lateral colorida baseada no status
    let statusColor: readonly [number, number, number] = colors.success; // Verde para ativo
    if (empresa.status === 'inativo') statusColor = colors.danger;
    if (empresa.status === 'suspenso') statusColor = colors.warning;

    doc.setFillColor(statusColor[0], statusColor[1], statusColor[2]);
    doc.rect(cardMargin, y, 4, cardHeight, 'F');

    // Conteúdo do card
    const contentX = cardMargin + 10;
    let contentY = y + 8;

    // Nome da empresa (título)
    doc.setTextColor(...colors.dark);
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.text(empresa.nome_completo.toUpperCase(), contentX, contentY);

    // Nome abreviado
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    doc.text(empresa.nome_abreviado, contentX, contentY + 5);

    contentY += 12;

    // Informações em duas colunas
    doc.setFontSize(8);
    doc.setTextColor(...colors.dark);

    // Coluna esquerda
    doc.setFont('helvetica', 'bold');
    doc.text('Status:', contentX, contentY);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(statusColor[0], statusColor[1], statusColor[2]);
    doc.text(empresa.status.toUpperCase(), contentX + 20, contentY);

    doc.setTextColor(...colors.dark);
    doc.setFont('helvetica', 'bold');
    doc.text('Template:', contentX, contentY + 5);
    doc.setFont('helvetica', 'normal');
    const templateText = await mapearTemplatePadrao(empresa.template_padrao);
    doc.text(templateText, contentX + 25, contentY + 5);

    // Coluna direita
    const rightColumnX = contentX + 90;
    doc.setFont('helvetica', 'bold');
    doc.text('Criado em:', rightColumnX, contentY);
    doc.setFont('helvetica', 'normal');
    const criadoEm = new Date(empresa.created_at).toLocaleDateString('pt-BR');
    doc.text(criadoEm, rightColumnX + 25, contentY);

    // E-mail do gestor
    if (empresa.email_gestor) {
      doc.setFont('helvetica', 'bold');
      doc.text('E-mail Gestor:', contentX, contentY + 10);
      doc.setFont('helvetica', 'normal');
      doc.text(empresa.email_gestor, contentX + 30, contentY + 10);
    }

    // Produtos (se houver)
    if (empresa.produtos && empresa.produtos.length > 0) {
      const produtos = empresa.produtos.map(p => p.produto).join(', ');
      doc.setFont('helvetica', 'bold');
      doc.text('Produtos (2):', rightColumnX, contentY + 5);
      doc.setFont('helvetica', 'normal');
      doc.text(produtos, rightColumnX + 25, contentY + 5);
    }

    return y + cardHeight + 5;
  };

  // Desenhar primeira página
  drawHeader();
  let currentY = 45;

  // Desenhar caixa de resumo
  currentY = drawSummaryBox(currentY);

  // Desenhar cards das empresas
  for (const empresa of empresas) {
    currentY = await drawEmpresaCard(empresa, currentY);
  }

  // Gerar nome do arquivo com data atual
  const dataArquivo = new Date().toLocaleDateString('pt-BR').replace(/\//g, '-');
  const nomeArquivo = `gerenciamento_empresas_${dataArquivo}.pdf`;

  // Fazer download do arquivo
  doc.save(nomeArquivo);
};