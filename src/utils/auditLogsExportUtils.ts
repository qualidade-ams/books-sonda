import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import type { AuditLogWithUser, AuditLogSummary } from '@/types/audit';
import { auditService } from '@/services/auditService';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

// Declaração para o plugin autotable do jsPDF
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

/**
 * Formatar label de ação para exibição
 */
const getActionLabel = (action: string): string => {
  switch (action) {
    case 'INSERT': return 'Criado';
    case 'UPDATE': return 'Atualizado';
    case 'DELETE': return 'Excluído';
    default: return action;
  }
};

/**
 * Exporta logs de auditoria para Excel (XLSX)
 */
export const exportAuditLogsToExcel = async (logs: AuditLogWithUser[]) => {
  if (!logs || logs.length === 0) {
    throw new Error('Nenhum log encontrado para exportar');
  }

  // Preparar dados para exportação
  const dadosExportacao = await Promise.all(
    logs.map(async (log) => {
      const changes = await auditService.formatChanges(log);
      return {
        'Data/Hora': format(new Date(log.changed_at), 'dd/MM/yyyy HH:mm:ss', { locale: ptBR }),
        'Tabela': auditService.getTableDisplayName(log.table_name),
        'Ação': getActionLabel(log.action),
        'Alterações': changes,
        'Usuário': log.user_name || 'Sistema',
        'Email do Usuário': log.user_email || '',
        'ID do Registro': log.record_id
      };
    })
  );

  // Criar workbook
  const wb = XLSX.utils.book_new();

  // Criar worksheet com os dados
  const ws = XLSX.utils.json_to_sheet(dadosExportacao);

  // Ajustar largura das colunas
  const colWidths = [
    { wch: 18 }, // Data/Hora
    { wch: 25 }, // Tabela
    { wch: 12 }, // Ação
    { wch: 60 }, // Alterações
    { wch: 25 }, // Usuário
    { wch: 30 }, // Email do Usuário
    { wch: 15 }  // ID do Registro
  ];

  ws['!cols'] = colWidths;

  // Adicionar worksheet ao workbook
  XLSX.utils.book_append_sheet(wb, ws, 'Logs de Auditoria');

  // Gerar nome do arquivo com data atual
  const dataAtual = new Date().toLocaleDateString('pt-BR').replace(/\//g, '-');
  const nomeArquivo = `logs-auditoria-${dataAtual}.xlsx`;

  // Fazer download do arquivo
  XLSX.writeFile(wb, nomeArquivo);
};

/**
 * Exporta logs de auditoria para PDF seguindo o padrão visual do sistema
 */
export const exportAuditLogsToPDF = async (
  logs: AuditLogWithUser[],
  summary: AuditLogSummary | null
) => {
  if (!logs || logs.length === 0) {
    throw new Error('Nenhum log encontrado para exportar');
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
    const titulo = 'Logs de Auditoria';
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
    const boxHeight = 35;
    const boxY = y;

    // Fundo da caixa de resumo
    doc.setFillColor(...colors.light);
    doc.rect(15, boxY, pageWidth - 30, boxHeight, 'F');

    // Borda da caixa
    doc.setDrawColor(...colors.primary);
    doc.setLineWidth(0.5);
    doc.rect(15, boxY, pageWidth - 30, boxHeight, 'S');

    // Calcular estatísticas dos logs
    const totalLogs = logs.length;
    const logsInsert = logs.filter(l => l.action === 'INSERT').length;
    const logsUpdate = logs.filter(l => l.action === 'UPDATE').length;
    const logsDelete = logs.filter(l => l.action === 'DELETE').length;

    // Texto do resumo
    doc.setTextColor(...colors.dark);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');

    const resumoY = boxY + 8;
    doc.text(`Total de logs: ${totalLogs}`, 25, resumoY);
    doc.text(`Registros criados: ${logsInsert}`, 25, resumoY + 6);
    doc.text(`Registros atualizados: ${logsUpdate}`, 25, resumoY + 12);
    doc.text(`Registros excluídos: ${logsDelete}`, 25, resumoY + 18);

    // Estatísticas adicionais do summary se disponível
    if (summary) {
      doc.text(`Período: Últimos 30 dias`, 25, resumoY + 24);
    }

    return boxY + boxHeight + 10;
  };

  // Função para desenhar card de log seguindo o padrão das outras telas
  const drawLogCard = async (log: AuditLogWithUser, y: number) => {
    const cardHeight = 40;
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

    // Barra lateral colorida baseada na ação
    let actionColor: readonly [number, number, number] = colors.success; // Verde para INSERT
    if (log.action === 'UPDATE') actionColor = colors.warning;
    if (log.action === 'DELETE') actionColor = colors.danger;

    doc.setFillColor(actionColor[0], actionColor[1], actionColor[2]);
    doc.rect(cardMargin, y, 4, cardHeight, 'F');

    // Conteúdo do card
    const contentX = cardMargin + 10;
    let contentY = y + 8;

    // Título: Tabela + Ação
    doc.setTextColor(...colors.dark);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    const titulo = `${auditService.getTableDisplayName(log.table_name)} - ${getActionLabel(log.action)}`;
    doc.text(titulo, contentX, contentY);

    // Data/hora
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 100, 100);
    const dataHora = format(new Date(log.changed_at), 'dd/MM/yyyy HH:mm:ss', { locale: ptBR });
    const dataWidth = doc.getTextWidth(dataHora);
    doc.text(dataHora, pageWidth - cardMargin - dataWidth - 5, contentY);

    contentY += 8;

    // Alterações (texto principal)
    doc.setFontSize(9);
    doc.setTextColor(...colors.dark);
    doc.setFont('helvetica', 'normal');
    
    const changes = await auditService.formatChanges(log);
    const maxWidth = cardWidth - 20;
    
    // Quebrar texto se for muito longo
    const lines = doc.splitTextToSize(changes, maxWidth);
    const maxLines = 2; // Limitar a 2 linhas para manter o card compacto
    
    for (let i = 0; i < Math.min(lines.length, maxLines); i++) {
      doc.text(lines[i], contentX, contentY + (i * 4));
    }
    
    if (lines.length > maxLines) {
      doc.text('...', contentX + doc.getTextWidth(lines[maxLines - 1]) + 2, contentY + ((maxLines - 1) * 4));
    }

    contentY += 12;

    // Usuário responsável
    if (log.user_name) {
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...colors.primary);
      doc.text('Por:', contentX, contentY);
      
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...colors.dark);
      const usuario = `${log.user_name}${log.user_email ? ` (${log.user_email})` : ''}`;
      doc.text(usuario, contentX + 12, contentY);
    }

    return y + cardHeight + 3;
  };

  // Desenhar primeira página
  drawHeader();
  let currentY = 45;

  // Desenhar caixa de resumo
  currentY = drawSummaryBox(currentY);

  // Ordenar logs por data (mais recentes primeiro)
  const sortedLogs = [...logs].sort((a, b) => 
    new Date(b.changed_at).getTime() - new Date(a.changed_at).getTime()
  );

  // Desenhar cards dos logs
  for (const log of sortedLogs) {
    currentY = await drawLogCard(log, currentY);
  }

  // Gerar nome do arquivo com data atual
  const dataArquivo = new Date().toLocaleDateString('pt-BR').replace(/\//g, '-');
  const nomeArquivo = `logs-auditoria-${dataArquivo}.pdf`;

  // Fazer download do arquivo
  doc.save(nomeArquivo);
};