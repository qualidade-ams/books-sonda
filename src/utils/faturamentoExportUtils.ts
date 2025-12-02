import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import { Requerimento } from '@/types/requerimentos';
import { formatarHorasParaExibicao } from '@/utils/horasUtils';

interface RequerimentosAgrupados {
  [key: string]: {
    tipo: string;
    requerimentos: Requerimento[];
    totalHoras: string;
    totalValor: number;
    quantidade: number;
  };
}

interface EstatisticasPeriodo {
  totalRequerimentos: number;
  totalHoras: string;
  tiposAtivos: number;
  valorTotalFaturavel: number;
}

/**
 * Exporta requerimentos de faturamento para Excel
 */
export const exportarFaturamentoExcel = (
  requerimentosAgrupados: RequerimentosAgrupados,
  estatisticas: EstatisticasPeriodo,
  mesNome: string,
  ano: number
) => {
  try {
    const workbook = XLSX.utils.book_new();

    // Aba 1: Resumo Estatístico
    const resumoData = [
      ['RELATÓRIO DE FATURAMENTO - RESUMO ESTATÍSTICO'],
      [''],
      ['Período:', `${mesNome} ${ano}`],
      ['Total de Requerimentos:', estatisticas.totalRequerimentos],
      ['Total de Horas:', formatarHorasParaExibicao(estatisticas.totalHoras, 'completo')],
      ['Tipos de Cobrança Ativos:', estatisticas.tiposAtivos],
      ['Valor Total Faturável:', `R$ ${estatisticas.valorTotalFaturavel.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`],
      [''],
      ['RESUMO POR TIPO DE COBRANÇA'],
      ['Tipo', 'Quantidade', 'Total Horas', 'Valor Total']
    ];

    // Adicionar dados por tipo
    Object.values(requerimentosAgrupados).forEach(grupo => {
      resumoData.push([
        grupo.tipo,
        grupo.quantidade,
        formatarHorasParaExibicao(grupo.totalHoras, 'completo'),
        grupo.totalValor > 0 ? `R$ ${grupo.totalValor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'
      ]);
    });

    const resumoSheet = XLSX.utils.aoa_to_sheet(resumoData);
    
    // Definir larguras das colunas
    resumoSheet['!cols'] = [
      { width: 25 },
      { width: 15 },
      { width: 15 },
      { width: 20 }
    ];

    XLSX.utils.book_append_sheet(workbook, resumoSheet, 'Resumo');

    // Aba 2: Detalhamento Completo
    const detalhesData = [
      ['RELATÓRIO DE FATURAMENTO - DETALHAMENTO COMPLETO'],
      [''],
      ['Período:', `${mesNome} ${ano}`],
      [''],
      ['Chamado', 'Cliente', 'Módulo', 'Linguagem', 'H.Func', 'H.Téc', 'Total', 'Data Envio', 'Data Aprov.', 'Valor Total', 'Período Cobrança', 'Observação', 'Autor', 'Tipo Cobrança']
    ];

    // Adicionar todos os requerimentos agrupados por tipo
    Object.values(requerimentosAgrupados).forEach(grupo => {
      // Cabeçalho do grupo
      detalhesData.push(['']);
      detalhesData.push([`=== ${grupo.tipo.toUpperCase()} ===`]);
      
      grupo.requerimentos.forEach(req => {
        const formatarData = (data: string): string => {
          try {
            if (data.match(/^\d{4}-\d{2}-\d{2}$/)) {
              const [year, month, day] = data.split('-');
              const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
              return date.toLocaleDateString('pt-BR');
            }
            return new Date(data).toLocaleDateString('pt-BR');
          } catch {
            return data;
          }
        };

        // Converter horas para formato decimal do Excel (horas/24)
        const converterHorasParaExcel = (horas: string | number): number => {
          if (typeof horas === 'string') {
            if (horas.includes(':')) {
              const [h, m] = horas.split(':').map(Number);
              return (h + m / 60) / 24; // Formato de tempo do Excel
            }
            return 0;
          }
          if (typeof horas === 'number') {
            return horas / 24; // Formato de tempo do Excel
          }
          return 0;
        };

        detalhesData.push([
          req.chamado,
          req.cliente_nome || 'N/A',
          req.modulo,
          req.linguagem,
          converterHorasParaExcel(req.horas_funcional),
          converterHorasParaExcel(req.horas_tecnico),
          converterHorasParaExcel(req.horas_total),
          formatarData(req.data_envio),
          req.data_aprovacao ? formatarData(req.data_aprovacao) : '-',
          req.valor_total_geral || 0, // Valor como número
          req.mes_cobranca || '-',
          req.observacao || '-',
          req.autor_nome || '-',
          req.tipo_cobranca
        ]);
      });
    });

    const detalhesSheet = XLSX.utils.aoa_to_sheet(detalhesData);
    
    // Definir larguras das colunas para detalhes
    detalhesSheet['!cols'] = [
      { width: 12 }, // Chamado
      { width: 25 }, // Cliente
      { width: 12 }, // Módulo
      { width: 12 }, // Linguagem
      { width: 10 }, // H.Func
      { width: 10 }, // H.Téc
      { width: 10 }, // Total
      { width: 12 }, // Data Envio
      { width: 12 }, // Data Aprov.
      { width: 15 }, // Valor Total
      { width: 12 }, // Período
      { width: 30 }, // Observação
      { width: 20 }, // Autor
      { width: 15 }  // Tipo
    ];

    // Aplicar formatação às células de horas (colunas E, F, G) e valores (coluna J)
    const range = XLSX.utils.decode_range(detalhesSheet['!ref'] || 'A1');
    for (let row = 6; row <= range.e.r; row++) { // Começar após cabeçalhos
      // Formatar colunas de horas (E=4, F=5, G=6)
      ['E', 'F', 'G'].forEach(col => {
        const cellAddress = `${col}${row}`;
        if (detalhesSheet[cellAddress] && typeof detalhesSheet[cellAddress].v === 'number') {
          detalhesSheet[cellAddress].t = 'n';
          detalhesSheet[cellAddress].z = '[h]:mm'; // Formato de horas
        }
      });
      
      // Formatar coluna de valor (J=9)
      const valorCell = `J${row}`;
      if (detalhesSheet[valorCell] && typeof detalhesSheet[valorCell].v === 'number') {
        detalhesSheet[valorCell].t = 'n';
        detalhesSheet[valorCell].z = 'R$ #,##0.00'; // Formato de moeda brasileira
      }
    }

    XLSX.utils.book_append_sheet(workbook, detalhesSheet, 'Detalhamento');

    // Salvar arquivo
    const nomeArquivo = `faturamento_${mesNome.toLowerCase()}_${ano}.xlsx`;
    XLSX.writeFile(workbook, nomeArquivo);

    return { success: true, message: 'Relatório Excel exportado com sucesso!' };
  } catch (error) {
    console.error('Erro ao exportar Excel:', error);
    return { success: false, error: 'Erro ao gerar arquivo Excel' };
  }
};

/**
 * Exporta requerimentos de faturamento para PDF seguindo o padrão do sistema
 */
export const exportarFaturamentoPDF = (
  requerimentosAgrupados: RequerimentosAgrupados,
  estatisticas: EstatisticasPeriodo,
  mesNome: string,
  ano: number
) => {
  try {
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
      const titulo = 'Relatório de Faturamento';
      const tituloWidth = doc.getTextWidth(titulo);
      doc.text(titulo, (pageWidth - tituloWidth) / 2, 20);

      // Subtítulo com período
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      const subtitulo = `${mesNome} ${ano} - Gerado em ${new Date().toLocaleDateString('pt-BR')}`;
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

      // Texto do resumo
      doc.setTextColor(...colors.dark);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');

      const resumoY = boxY + 8;
      doc.text(`Total de Requerimentos: ${estatisticas.totalRequerimentos}`, 25, resumoY);
      doc.text(`Tipos de Cobrança Ativos: ${estatisticas.tiposAtivos}`, 25, resumoY + 6);
      doc.text(`Total de Horas: ${formatarHorasParaExibicao(estatisticas.totalHoras, 'completo')}`, 25, resumoY + 12);
      doc.text(`Valor Total Faturável: R$ ${estatisticas.valorTotalFaturavel.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 25, resumoY + 18);

      return boxY + boxHeight + 10;
    };

    // Função para desenhar card de grupo de requerimentos
    const drawGrupoCard = (grupo: any, y: number) => {
      const cardHeight = 25 + (grupo.requerimentos.length * 6); // Altura dinâmica baseada no número de requerimentos
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

      // Barra lateral colorida
      doc.setFillColor(...colors.primary);
      doc.rect(cardMargin, y, 4, cardHeight, 'F');

      // Cabeçalho do grupo
      const contentX = cardMargin + 10;
      let contentY = y + 8;

      // Nome do tipo de cobrança (título)
      doc.setTextColor(...colors.dark);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(`${grupo.tipo}`, contentX, contentY);

      // Estatísticas do grupo
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 100, 100);
      doc.text(`${grupo.quantidade} requerimento${grupo.quantidade !== 1 ? 's' : ''} - ${formatarHorasParaExibicao(grupo.totalHoras, 'completo')}`, contentX, contentY + 5);

      if (grupo.totalValor > 0) {
        doc.text(`Valor Total: R$ ${grupo.totalValor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, contentX, contentY + 10);
        contentY += 5;
      }

      contentY += 12;

      // Lista de requerimentos
      doc.setFontSize(8);
      doc.setTextColor(...colors.dark);

      grupo.requerimentos.forEach((req: any, index: number) => {
        const formatarData = (data: string): string => {
          try {
            if (data.match(/^\d{4}-\d{2}-\d{2}$/)) {
              const [year, month, day] = data.split('-');
              const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
              return date.toLocaleDateString('pt-BR');
            }
            return new Date(data).toLocaleDateString('pt-BR');
          } catch {
            return data;
          }
        };

        const formatarHoras = (horas: string | number): string => {
          if (typeof horas === 'string') {
            return formatarHorasParaExibicao(horas, 'completo');
          }
          if (typeof horas === 'number') {
            const totalMinutos = Math.round(horas * 60);
            const horasInt = Math.floor(totalMinutos / 60);
            const minutosInt = totalMinutos % 60;
            const horasFormatadas = `${horasInt}:${minutosInt.toString().padStart(2, '0')}`;
            return formatarHorasParaExibicao(horasFormatadas, 'completo');
          }
          return '0:00';
        };

        // Linha do requerimento
        doc.setFont('helvetica', 'bold');
        doc.text(`${req.chamado}`, contentX, contentY);
        
        doc.setFont('helvetica', 'normal');
        const clienteText = req.cliente_nome || 'N/A';
        doc.text(`${clienteText} - ${req.modulo}/${req.linguagem}`, contentX + 25, contentY);
        
        const horasText = `${formatarHoras(req.horas_total)} - ${formatarData(req.data_envio)}`;
        doc.text(horasText, contentX + 100, contentY);

        if (req.valor_total_geral) {
          const valorText = `R$ ${req.valor_total_geral.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
          doc.text(valorText, contentX + 140, contentY);
        }

        contentY += 6;
      });

      return y + cardHeight + 5;
    };

    // Desenhar primeira página
    drawHeader();
    let currentY = 45;

    // Desenhar caixa de resumo
    currentY = drawSummaryBox(currentY);

    // Desenhar cards dos grupos
    Object.values(requerimentosAgrupados).forEach((grupo) => {
      currentY = drawGrupoCard(grupo, currentY);
    });

    // Gerar nome do arquivo
    const nomeArquivo = `faturamento_${mesNome.toLowerCase()}_${ano}.pdf`;

    // Fazer download do arquivo
    doc.save(nomeArquivo);

    return { success: true, message: 'Relatório PDF exportado com sucesso!' };
  } catch (error) {
    console.error('Erro ao exportar PDF:', error);
    return { success: false, error: 'Erro ao gerar arquivo PDF' };
  }
};