import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import { Requerimento } from '@/types/requerimentos';
import { formatarHorasParaExibicao } from '@/utils/horasUtils';
import { getHexColor } from '@/utils/requerimentosColors';

interface EstatisticasRequerimentos {
  total: number;
  totalHoras: string;
  horasSelecionados: string;
  valorSelecionados: number;
  selecionados: number;
  porTipo: Record<string, { quantidade: number; horas: string }>;
}

/**
 * Exporta requerimentos para Excel com duas abas
 */
export const exportarRequerimentosExcel = (
  requerimentosNaoEnviados: Requerimento[],
  requerimentosEnviados: Requerimento[],
  estatisticas: EstatisticasRequerimentos
) => {
  try {
    const workbook = XLSX.utils.book_new();

    // Função auxiliar para criar dados de requerimentos
    const criarDadosRequerimentos = (requerimentos: Requerimento[], titulo: string) => {
      const dados = [
        [titulo],
        [''],
        ['Data de Geração:', new Date().toLocaleDateString('pt-BR')],
        ['Total de Requerimentos:', requerimentos.length],
        [''],
        ['Chamado', 'Cliente', 'Módulo', 'Descrição', 'Linguagem', 'Valor/Hora Funcional', 'Valor/Hora Técnico', 'H.Func', 'H.Téc', 'Total', 'Data Envio', 'Data Aprov.', 'Valor Total', 'Período Cobrança', 'Autor', 'Tipo Cobrança', 'Tickets', 'Observação']
      ];

      requerimentos.forEach(req => {
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

        dados.push([
          req.chamado,
          req.cliente_nome || 'N/A',
          req.modulo,
          req.descricao || '-',
          req.linguagem,
          req.valor_hora_funcional || 0, // Valor/Hora Funcional
          req.valor_hora_tecnico || 0,   // Valor/Hora Técnico
          converterHorasParaExcel(req.horas_funcional),
          converterHorasParaExcel(req.horas_tecnico),
          converterHorasParaExcel(req.horas_total),
          formatarData(req.data_envio),
          req.data_aprovacao ? formatarData(req.data_aprovacao) : '-',
          req.valor_total_geral || 0, // Valor como número
          req.mes_cobranca || '-',
          req.autor_nome || '-',
          req.tipo_cobranca,
          req.quantidade_tickets && req.quantidade_tickets > 0 ? `${req.quantidade_tickets} ticket${req.quantidade_tickets !== 1 ? 's' : ''}` : '-',
          req.observacao || '-'
        ]);
      });

      // Adicionar linha de totalizador
      const totalValor = requerimentos.reduce((acc, req) => acc + (req.valor_total_geral || 0), 0);
      dados.push(['']); // Linha vazia
      dados.push(['', '', '', '', '', '', '', '', '', '', '', 'TOTAL GERAL:', totalValor]); // Movido uma célula para a esquerda

      return dados;
    };

    // Aba 1: Requerimentos Não Enviados
    const dadosNaoEnviados = criarDadosRequerimentos(requerimentosNaoEnviados, 'REQUERIMENTOS NÃO ENVIADOS');
    const sheetNaoEnviados = XLSX.utils.aoa_to_sheet(dadosNaoEnviados);
    
    // Definir larguras das colunas
    sheetNaoEnviados['!cols'] = [
      { width: 12 }, // Chamado
      { width: 25 }, // Cliente
      { width: 12 }, // Módulo
      { width: 30 }, // Descrição
      { width: 12 }, // Linguagem
      { width: 15 }, // Valor/Hora Funcional
      { width: 15 }, // Valor/Hora Técnico
      { width: 10 }, // H.Func
      { width: 10 }, // H.Téc
      { width: 10 }, // Total
      { width: 12 }, // Data Envio
      { width: 12 }, // Data Aprov.
      { width: 15 }, // Valor Total
      { width: 12 }, // Período
      { width: 20 }, // Autor
      { width: 15 }, // Tipo
      { width: 10 }, // Tickets
      { width: 30 }  // Observação
    ];

    // Aplicar formatação às células de horas (colunas H, I, J) e valores (colunas F, G, M)
    const rangeNaoEnviados = XLSX.utils.decode_range(sheetNaoEnviados['!ref'] || 'A1');
    for (let row = 6; row <= rangeNaoEnviados.e.r; row++) { // Começar após cabeçalhos
      // Formatar colunas de horas (H=7, I=8, J=9)
      ['H', 'I', 'J'].forEach(col => {
        const cellAddress = `${col}${row}`;
        if (sheetNaoEnviados[cellAddress] && typeof sheetNaoEnviados[cellAddress].v === 'number') {
          sheetNaoEnviados[cellAddress].t = 'n';
          sheetNaoEnviados[cellAddress].z = '[h]:mm'; // Formato de horas
        }
      });
      
      // Formatar colunas de valor/hora (F=5, G=6) e valor total (M=12)
      ['F', 'G', 'M'].forEach(col => {
        const cellAddress = `${col}${row}`;
        if (sheetNaoEnviados[cellAddress] && typeof sheetNaoEnviados[cellAddress].v === 'number') {
          sheetNaoEnviados[cellAddress].t = 'n';
          sheetNaoEnviados[cellAddress].z = 'R$ #,##0.00'; // Formato de moeda brasileira
        }
      });
    }
    
    // Formatar célula do totalizador (última linha, coluna M=12)
    const ultimaLinha = rangeNaoEnviados.e.r;
    const cellTotalizador = `M${ultimaLinha}`;
    if (sheetNaoEnviados[cellTotalizador] && typeof sheetNaoEnviados[cellTotalizador].v === 'number') {
      sheetNaoEnviados[cellTotalizador].t = 'n';
      sheetNaoEnviados[cellTotalizador].z = 'R$ #,##0.00';
    }

    XLSX.utils.book_append_sheet(workbook, sheetNaoEnviados, 'Não Enviados');

    // Aba 2: Histórico - Requerimentos Enviados
    const dadosEnviados = criarDadosRequerimentos(requerimentosEnviados, 'HISTÓRICO - REQUERIMENTOS ENVIADOS');
    const sheetEnviados = XLSX.utils.aoa_to_sheet(dadosEnviados);
    
    // Definir larguras das colunas
    sheetEnviados['!cols'] = [
      { width: 12 }, // Chamado
      { width: 25 }, // Cliente
      { width: 12 }, // Módulo
      { width: 30 }, // Descrição
      { width: 12 }, // Linguagem
      { width: 15 }, // Valor/Hora Funcional
      { width: 15 }, // Valor/Hora Técnico
      { width: 10 }, // H.Func
      { width: 10 }, // H.Téc
      { width: 10 }, // Total
      { width: 12 }, // Data Envio
      { width: 12 }, // Data Aprov.
      { width: 15 }, // Valor Total
      { width: 12 }, // Período
      { width: 20 }, // Autor
      { width: 15 }, // Tipo
      { width: 10 }, // Tickets
      { width: 30 }  // Observação
    ];

    // Aplicar formatação às células de horas (colunas H, I, J) e valores (colunas F, G, M)
    const rangeEnviados = XLSX.utils.decode_range(sheetEnviados['!ref'] || 'A1');
    for (let row = 6; row <= rangeEnviados.e.r; row++) { // Começar após cabeçalhos
      // Formatar colunas de horas (H=7, I=8, J=9)
      ['H', 'I', 'J'].forEach(col => {
        const cellAddress = `${col}${row}`;
        if (sheetEnviados[cellAddress] && typeof sheetEnviados[cellAddress].v === 'number') {
          sheetEnviados[cellAddress].t = 'n';
          sheetEnviados[cellAddress].z = '[h]:mm'; // Formato de horas
        }
      });
      
      // Formatar colunas de valor/hora (F=5, G=6) e valor total (M=12)
      ['F', 'G', 'M'].forEach(col => {
        const cellAddress = `${col}${row}`;
        if (sheetEnviados[cellAddress] && typeof sheetEnviados[cellAddress].v === 'number') {
          sheetEnviados[cellAddress].t = 'n';
          sheetEnviados[cellAddress].z = 'R$ #,##0.00'; // Formato de moeda brasileira
        }
      });
    }
    
    // Formatar célula do totalizador (última linha, coluna M=12)
    const ultimaLinhaEnviados = rangeEnviados.e.r;
    const cellTotalizadorEnviados = `M${ultimaLinhaEnviados}`;
    if (sheetEnviados[cellTotalizadorEnviados] && typeof sheetEnviados[cellTotalizadorEnviados].v === 'number') {
      sheetEnviados[cellTotalizadorEnviados].t = 'n';
      sheetEnviados[cellTotalizadorEnviados].z = 'R$ #,##0.00';
    }

    XLSX.utils.book_append_sheet(workbook, sheetEnviados, 'Histórico Enviados');

    // Salvar arquivo
    const nomeArquivo = `requerimentos_completo_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, nomeArquivo);

    return { success: true, message: 'Relatório Excel exportado com sucesso!' };
  } catch (error) {
    console.error('Erro ao exportar Excel:', error);
    return { success: false, error: 'Erro ao gerar arquivo Excel' };
  }
};

/**
 * Exporta requerimentos para PDF seguindo o padrão dos demais relatórios
 */
export const exportarRequerimentosPDF = (
  requerimentosNaoEnviados: Requerimento[],
  requerimentosEnviados: Requerimento[],
  estatisticas: EstatisticasRequerimentos
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
      const titulo = 'Gerenciamento de Requerimentos';
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

    // Calcular totalizadores de valores
    const totalValorNaoEnviados = requerimentosNaoEnviados.reduce((acc, req) => acc + (req.valor_total_geral || 0), 0);
    const totalValorEnviados = requerimentosEnviados.reduce((acc, req) => acc + (req.valor_total_geral || 0), 0);
    const totalValorGeral = totalValorNaoEnviados + totalValorEnviados;

    // Função para desenhar caixa de resumo
    const drawSummaryBox = (y: number) => {
      const boxHeight = 42; // Aumentado de 30 para 42 para acomodar linhas de valores
      const boxY = y;

      // Fundo da caixa de resumo
      doc.setFillColor(...colors.light);
      doc.rect(15, boxY, pageWidth - 30, boxHeight, 'F');

      // Borda da caixa
      doc.setDrawColor(...colors.primary);
      doc.setLineWidth(0.5);
      doc.rect(15, boxY, pageWidth - 30, boxHeight, 'S');

      // Calcular estatísticas
      const totalNaoEnviados = requerimentosNaoEnviados.length;
      const totalEnviados = requerimentosEnviados.length;
      const totalGeral = totalNaoEnviados + totalEnviados;

      // Texto do resumo
      doc.setTextColor(...colors.dark);
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');

      const resumoY = boxY + 8;
      doc.text(`Total de requerimentos: ${totalGeral}`, 25, resumoY);
      doc.text(`Requerimentos não enviados: ${totalNaoEnviados}`, 25, resumoY + 6);
      doc.text(`Requerimentos enviados: ${totalEnviados}`, 25, resumoY + 12);
      doc.text(`Total de horas: ${formatarHorasParaExibicao(estatisticas.totalHoras, 'completo')}`, 25, resumoY + 18);

      // Adicionar totalizadores de valores
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Valor não enviados: R$ ${totalValorNaoEnviados.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 25, resumoY + 24);
      doc.text(`Valor enviados: R$ ${totalValorEnviados.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 25, resumoY + 30);

      // Total geral em destaque
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...colors.primary);
      doc.text(`VALOR TOTAL: R$ ${totalValorGeral.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, pageWidth - 85, resumoY + 27);

      return boxY + boxHeight + 10;
    };

    // Função para desenhar card de requerimento seguindo padrão dos demais relatórios
    const drawRequerimentoCard = (req: Requerimento, y: number) => {
      const cardHeight = 50; // Aumentado de 45 para 50 para acomodar linha de valores/hora
      const cardMargin = 15;
      const cardWidth = pageWidth - (cardMargin * 2);

      // Verificar se cabe na página
      if (y + cardHeight > pageHeight - 20) {
        doc.addPage();
        drawHeader();
        y = 45;
      }

      // Obter cores do tipo de cobrança
      const hexColor = getHexColor(req.tipo_cobranca);
      const rgbColor = hexColor?.match(/\w\w/g)?.map(x => parseInt(x, 16)) || colors.primary;

      // Fundo do card
      doc.setFillColor(...colors.white);
      doc.rect(cardMargin, y, cardWidth, cardHeight, 'F');

      // Borda do card
      doc.setDrawColor(...colors.light);
      doc.setLineWidth(0.3);
      doc.rect(cardMargin, y, cardWidth, cardHeight, 'S');

      // Barra lateral colorida baseada no tipo de cobrança
      doc.setFillColor(rgbColor[0], rgbColor[1], rgbColor[2]);
      doc.rect(cardMargin, y, 4, cardHeight, 'F');

      // Conteúdo do card
      const contentX = cardMargin + 10;
      let contentY = y + 8;

      // Linha 1: Chamado (título)
      doc.setTextColor(...colors.dark);
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(req.chamado.toUpperCase(), contentX, contentY);

      // Tipo de cobrança (badge)
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(rgbColor[0], rgbColor[1], rgbColor[2]);
      doc.text(req.tipo_cobranca, pageWidth - 60, contentY);

      contentY += 6;

      // Linha 2: Cliente + Módulo
      doc.setTextColor(100, 100, 100);
      doc.setFontSize(9);
      const clienteText = req.cliente_nome || 'N/A';
      doc.text(`Cliente: ${clienteText}`, contentX, contentY);
      doc.text(`Módulo: ${req.modulo}`, contentX + 80, contentY);

      contentY += 5;

      // Linha 2.5: Descrição (destacada)
      doc.setTextColor(...colors.dark);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      const descricaoText = req.descricao || 'Sem descrição';
      const maxDescricaoWidth = pageWidth - contentX - 30;
      const descricaoLines = doc.splitTextToSize(descricaoText, maxDescricaoWidth);
      
      // Mostrar apenas a primeira linha da descrição para manter o layout compacto
      const descricaoDisplay = Array.isArray(descricaoLines) ? descricaoLines[0] : descricaoLines;
      doc.text(`Descrição: ${descricaoDisplay}`, contentX, contentY);

      contentY += 6;

      // Linha 3: Linguagem + Valores/Hora
      doc.setTextColor(...colors.dark);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      const valorFuncional = req.valor_hora_funcional ? `R$ ${req.valor_hora_funcional.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'N/A';
      const valorTecnico = req.valor_hora_tecnico ? `R$ ${req.valor_hora_tecnico.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : 'N/A';
      const valoresText = `${req.linguagem} | Valor/H Func: ${valorFuncional} | Valor/H Téc: ${valorTecnico}`;
      doc.text(valoresText, contentX, contentY);

      contentY += 5;

      // Linha 3.5: Horas
      const formatarHoras = (horas: string | number): string => {
        if (typeof horas === 'string') {
          // Se já está no formato HH:MM, retornar diretamente
          if (horas.includes(':')) {
            return horas;
          }
          return formatarHorasParaExibicao(horas, 'completo');
        }
        if (typeof horas === 'number') {
          const totalMinutos = Math.round(horas * 60);
          const horasInt = Math.floor(totalMinutos / 60);
          const minutosInt = totalMinutos % 60;
          return `${horasInt.toString().padStart(2, '0')}:${minutosInt.toString().padStart(2, '0')}`;
        }
        return '00:00';
      };

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      const horasText = `Horas - F:${formatarHoras(req.horas_funcional)} | T:${formatarHoras(req.horas_tecnico)} | Total:${formatarHoras(req.horas_total)}`;
      doc.text(horasText, contentX, contentY);

      contentY += 6;

      // Linha 4: Data + Valor + Tickets + Autor
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

      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 100, 100);
      
      let infoText = `Envio: ${formatarData(req.data_envio)}`;
      
      if (req.data_aprovacao) {
        infoText += ` | Aprov: ${formatarData(req.data_aprovacao)}`;
      }
      
      if (req.valor_total_geral) {
        infoText += ` | Valor: R$ ${req.valor_total_geral.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      }
      
      if (req.quantidade_tickets && req.quantidade_tickets > 0) {
        infoText += ` | Tickets: ${req.quantidade_tickets}`;
      }
      
      if (req.autor_nome) {
        infoText += ` | Autor: ${req.autor_nome}`;
      }

      doc.text(infoText, contentX, contentY);

      return y + cardHeight + 5;
    };

    // Desenhar primeira página
    drawHeader();
    let currentY = 45;

    // Desenhar caixa de resumo
    currentY = drawSummaryBox(currentY);

    // Seção de Requerimentos Não Enviados
    if (requerimentosNaoEnviados.length > 0) {
      // Título da seção
      doc.setTextColor(...colors.dark);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('REQUERIMENTOS NÃO ENVIADOS', 15, currentY);
      currentY += 10;

      // Desenhar cards dos requerimentos não enviados
      requerimentosNaoEnviados.forEach((req) => {
        currentY = drawRequerimentoCard(req, currentY);
      });

      currentY += 10;
    }

    // Seção de Requerimentos Enviados
    if (requerimentosEnviados.length > 0) {
      // Verificar se precisa de nova página para o título
      if (currentY > pageHeight - 60) {
        doc.addPage();
        drawHeader();
        currentY = 45;
      }

      // Título da seção
      doc.setTextColor(...colors.dark);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('HISTÓRICO - REQUERIMENTOS ENVIADOS', 15, currentY);
      currentY += 10;

      // Desenhar cards dos requerimentos enviados
      requerimentosEnviados.forEach((req) => {
        currentY = drawRequerimentoCard(req, currentY);
      });
    }

    // Gerar nome do arquivo
    const nomeArquivo = `requerimentos_completo_${new Date().toISOString().split('T')[0]}.pdf`;

    // Fazer download do arquivo
    doc.save(nomeArquivo);

    return { success: true, message: 'Relatório PDF exportado com sucesso!' };
  } catch (error) {
    console.error('Erro ao exportar PDF:', error);
    return { success: false, error: 'Erro ao gerar arquivo PDF' };
  }
};