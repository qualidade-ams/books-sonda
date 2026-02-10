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
const mapearTemplatePadrao = async (templateId: string | null | undefined): Promise<string> => {
  // Se não há template ID, retornar vazio
  if (!templateId || templateId.trim() === '') {
    return '';
  }

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
  // ORDEM DAS COLUNAS: Mesma ordem do template de importação
  const dadosExportacao = await Promise.all(
    empresas.map(async (empresa) => ({
      'Nome Completo': empresa.nome_completo,
      'Nome Abreviado': empresa.nome_abreviado,
      'Status': empresa.status,
      'Descrição Status': empresa.descricao_status || '',
      'Em Projeto': empresa.em_projeto ? 'Sim' : 'Não',
      'Email Gestor': empresa.email_gestor || '',
      'Produtos': empresa.produtos?.map(p => p.produto).join(', ') || '',
      'Grupos': empresa.grupos?.map(g => g.grupos_responsaveis?.nome).filter(Boolean).join(', ') || '',
      'Tem AMS': empresa.tem_ams ? 'Sim' : 'Não',
      'Tipo Book': empresa.tipo_book,
      'Template Padrão': await mapearTemplatePadrao(empresa.template_padrao),
      'Link SharePoint': empresa.link_sharepoint || '',
      'Tipo Cobrança': empresa.tipo_cobranca === 'banco_horas' ? 'Banco de Horas' : empresa.tipo_cobranca === 'ticket' ? 'Ticket' : 'Outros',
      'Vigência Inicial': empresa.vigencia_inicial || '',
      'Vigência Final': empresa.vigencia_final || '',
      'Book Personalizado': empresa.book_personalizado ? 'Sim' : 'Não',
      'Anexo': empresa.anexo ? 'Sim' : 'Não',
      'Observação': empresa.observacao || '',
      // Parâmetros de Banco de Horas
      'Tipo de Contrato': empresa.tipo_contrato ? (empresa.tipo_contrato === 'horas' ? 'Horas' : empresa.tipo_contrato === 'tickets' ? 'Tickets' : 'Ambos') : '',
      'Período de Apuração (meses)': empresa.periodo_apuracao || '',
      'Início Vigência Banco Horas': empresa.inicio_vigencia ? (() => {
        const data = new Date(empresa.inicio_vigencia);
        // Usar UTC para evitar problemas de timezone
        const mes = String(data.getUTCMonth() + 1).padStart(2, '0');
        const ano = data.getUTCFullYear();
        return `${mes}/${ano}`;
      })() : '',
      'Baseline Horas Mensal': empresa.baseline_horas_mensal ? (() => {
        // Converter INTERVAL do PostgreSQL para número decimal
        // Formato esperado: '1:50:00' ou '01:50:00'
        const intervalStr = empresa.baseline_horas_mensal.toString();
        const match = intervalStr.match(/(\d+):(\d+):(\d+)/);
        if (match) {
          const horas = parseInt(match[1]);
          const minutos = parseInt(match[2]);
          return (horas + minutos / 60).toFixed(2);
        }
        return intervalStr;
      })() : '',
      'Baseline Tickets Mensal': empresa.baseline_tickets_mensal || '',
      'Possui Repasse Especial': empresa.possui_repasse_especial ? 'Sim' : 'Não',
      'Ciclos para Zerar': empresa.ciclos_para_zerar || '',
      '% Repasse Mensal': empresa.percentual_repasse_mensal || '',
      '% Repasse Especial': empresa.percentual_repasse_especial || '',
      // Campos de Meta SLA
      'Meta SLA (%)': empresa.meta_sla_percentual || '',
      'Qtd Mínima Chamados SLA': empresa.quantidade_minima_chamados_sla || ''
    }))
  );

  // Criar workbook
  const wb = XLSX.utils.book_new();

  // Criar worksheet com os dados
  const ws = XLSX.utils.json_to_sheet(dadosExportacao);

  // Ajustar largura das colunas (mesma ordem do template de importação)
  const colWidths = [
    { wch: 30 }, // Nome Completo
    { wch: 20 }, // Nome Abreviado
    { wch: 12 }, // Status
    { wch: 25 }, // Descrição Status
    { wch: 12 }, // Em Projeto
    { wch: 25 }, // Email Gestor
    { wch: 20 }, // Produtos
    { wch: 25 }, // Grupos
    { wch: 10 }, // Tem AMS
    { wch: 15 }, // Tipo Book
    { wch: 20 }, // Template Padrão
    { wch: 40 }, // Link SharePoint
    { wch: 18 }, // Tipo Cobrança
    { wch: 15 }, // Vigência Inicial
    { wch: 15 }, // Vigência Final
    { wch: 15 }, // Book Personalizado
    { wch: 10 }, // Anexo
    { wch: 40 }, // Observação
    // Parâmetros de Banco de Horas
    { wch: 18 }, // Tipo de Contrato
    { wch: 25 }, // Período de Apuração (meses)
    { wch: 25 }, // Início Vigência Banco Horas
    { wch: 20 }, // Baseline Horas Mensal
    { wch: 22 }, // Baseline Tickets Mensal
    { wch: 20 }, // Possui Repasse Especial
    { wch: 18 }, // Ciclos para Zerar
    { wch: 18 }, // % Repasse Mensal
    { wch: 20 },  // % Repasse Especial
    // Campos de Meta SLA
    { wch: 15 }, // Meta SLA (%)
    { wch: 25 }  // Qtd Mínima Chamados SLA
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
    const cardHeight = 70; // Aumentado para acomodar mais informações
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

    doc.setFont('helvetica', 'bold');
    doc.text('Em Projeto:', contentX, contentY + 10);
    doc.setFont('helvetica', 'normal');
    doc.text(empresa.em_projeto ? 'Sim' : 'Não', contentX + 25, contentY + 10);

    // Coluna direita
    const rightColumnX = contentX + 90;
    doc.setFont('helvetica', 'bold');
    doc.text('Criado em:', rightColumnX, contentY);
    doc.setFont('helvetica', 'normal');
    const criadoEm = new Date(empresa.created_at).toLocaleDateString('pt-BR');
    doc.text(criadoEm, rightColumnX + 25, contentY);

    doc.setFont('helvetica', 'bold');
    doc.text('Tem AMS:', rightColumnX, contentY + 5);
    doc.setFont('helvetica', 'normal');
    doc.text(empresa.tem_ams ? 'Sim' : 'Não', rightColumnX + 25, contentY + 5);

    doc.setFont('helvetica', 'bold');
    doc.text('Tipo Cobrança:', rightColumnX, contentY + 10);
    doc.setFont('helvetica', 'normal');
    const tipoCobranca = empresa.tipo_cobranca === 'banco_horas' ? 'Banco de Horas' : empresa.tipo_cobranca === 'ticket' ? 'Ticket' : 'Outros';
    doc.text(tipoCobranca, rightColumnX + 30, contentY + 10);

    contentY += 15;

    // E-mail do gestor
    if (empresa.email_gestor) {
      doc.setFont('helvetica', 'bold');
      doc.text('E-mail Gestor:', contentX, contentY);
      doc.setFont('helvetica', 'normal');
      doc.text(empresa.email_gestor, contentX + 30, contentY);
    }

    // Produtos (se houver)
    if (empresa.produtos && empresa.produtos.length > 0) {
      const produtos = empresa.produtos.map(p => p.produto).join(', ');
      doc.setFont('helvetica', 'bold');
      doc.text('Produtos:', rightColumnX, contentY);
      doc.setFont('helvetica', 'normal');
      doc.text(produtos, rightColumnX + 25, contentY);
    }

    contentY += 5;

    // Seção de Parâmetros de Banco de Horas (se tem AMS)
    if (empresa.tem_ams) {
      contentY += 3;
      
      // Linha separadora
      doc.setDrawColor(...colors.light);
      doc.setLineWidth(0.2);
      doc.line(contentX, contentY, cardMargin + cardWidth - 10, contentY);
      
      contentY += 5;
      
      // Título da seção
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(...colors.primary);
      doc.text('PARÂMETROS DE BANCO DE HORAS', contentX, contentY);
      
      contentY += 5;
      doc.setFontSize(8);
      doc.setTextColor(...colors.dark);

      // Linha 1: Tipo de Contrato e Período de Apuração
      if (empresa.tipo_contrato) {
        doc.setFont('helvetica', 'bold');
        doc.text('Tipo Contrato:', contentX, contentY);
        doc.setFont('helvetica', 'normal');
        const tipoContrato = empresa.tipo_contrato === 'horas' ? 'Horas' : empresa.tipo_contrato === 'tickets' ? 'Tickets' : 'Ambos';
        doc.text(tipoContrato, contentX + 30, contentY);
      }

      if (empresa.periodo_apuracao) {
        doc.setFont('helvetica', 'bold');
        doc.text('Período Apuração:', rightColumnX, contentY);
        doc.setFont('helvetica', 'normal');
        doc.text(`${empresa.periodo_apuracao} ${empresa.periodo_apuracao === 1 ? 'mês' : 'meses'}`, rightColumnX + 35, contentY);
      }

      contentY += 5;

      // Linha 2: Baseline Horas e Baseline Tickets
      if (empresa.baseline_horas_mensal) {
        doc.setFont('helvetica', 'bold');
        doc.text('Baseline Horas:', contentX, contentY);
        doc.setFont('helvetica', 'normal');
        // Converter INTERVAL para formato legível
        const intervalStr = empresa.baseline_horas_mensal.toString();
        const match = intervalStr.match(/(\d+):(\d+):(\d+)/);
        let horasTexto = intervalStr;
        if (match) {
          const horas = parseInt(match[1]);
          const minutos = parseInt(match[2]);
          horasTexto = `${horas}h${minutos > 0 ? ` ${minutos}min` : ''}`;
        }
        doc.text(horasTexto, contentX + 30, contentY);
      }

      if (empresa.baseline_tickets_mensal) {
        doc.setFont('helvetica', 'bold');
        doc.text('Baseline Tickets:', rightColumnX, contentY);
        doc.setFont('helvetica', 'normal');
        doc.text(empresa.baseline_tickets_mensal.toString(), rightColumnX + 35, contentY);
      }

      contentY += 5;

      // Linha 3: % Repasse Mensal e % Repasse Especial
      if (empresa.percentual_repasse_mensal != null) {
        doc.setFont('helvetica', 'bold');
        doc.text('% Repasse Mensal:', contentX, contentY);
        doc.setFont('helvetica', 'normal');
        doc.text(`${empresa.percentual_repasse_mensal}%`, contentX + 35, contentY);
      }

      if (empresa.possui_repasse_especial && empresa.percentual_repasse_especial != null) {
        doc.setFont('helvetica', 'bold');
        doc.text('% Repasse Especial:', rightColumnX, contentY);
        doc.setFont('helvetica', 'normal');
        doc.text(`${empresa.percentual_repasse_especial}%`, rightColumnX + 40, contentY);
      }

      contentY += 5;

      // Linha 4: Início Vigência e Ciclos para Zerar
      if (empresa.inicio_vigencia) {
        doc.setFont('helvetica', 'bold');
        doc.text('Início Vigência:', contentX, contentY);
        doc.setFont('helvetica', 'normal');
        // Usar UTC para evitar problemas de timezone
        const data = new Date(empresa.inicio_vigencia);
        const mes = String(data.getUTCMonth() + 1).padStart(2, '0');
        const ano = data.getUTCFullYear();
        const inicioVigencia = `${mes}/${ano}`;
        doc.text(inicioVigencia, contentX + 32, contentY);
      }

      if (empresa.ciclos_para_zerar) {
        doc.setFont('helvetica', 'bold');
        doc.text('Ciclos p/ Zerar:', rightColumnX, contentY);
        doc.setFont('helvetica', 'normal');
        doc.text(empresa.ciclos_para_zerar.toString(), rightColumnX + 32, contentY);
      }
    }

    // Seção de Metas de SLA (se configurado)
    if (empresa.meta_sla_percentual != null || empresa.quantidade_minima_chamados_sla != null) {
      contentY += 3;
      
      // Linha separadora
      doc.setDrawColor(...colors.light);
      doc.setLineWidth(0.2);
      doc.line(contentX, contentY, cardMargin + cardWidth - 10, contentY);
      
      contentY += 5;
      
      // Título da seção
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(...colors.primary);
      doc.text('METAS DE SLA', contentX, contentY);
      
      contentY += 5;
      doc.setFontSize(8);
      doc.setTextColor(...colors.dark);

      // Linha 1: Meta SLA e Quantidade Mínima de Chamados
      if (empresa.meta_sla_percentual != null) {
        doc.setFont('helvetica', 'bold');
        doc.text('Meta SLA:', contentX, contentY);
        doc.setFont('helvetica', 'normal');
        doc.text(`${empresa.meta_sla_percentual}%`, contentX + 20, contentY);
      }

      if (empresa.quantidade_minima_chamados_sla != null) {
        doc.setFont('helvetica', 'bold');
        doc.text('Qtd Mín Chamados:', rightColumnX, contentY);
        doc.setFont('helvetica', 'normal');
        doc.text(empresa.quantidade_minima_chamados_sla.toString(), rightColumnX + 35, contentY);
      }
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