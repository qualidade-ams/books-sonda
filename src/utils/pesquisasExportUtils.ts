/**
 * Utilitários para exportação de pesquisas de satisfação
 */

import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Pesquisa, EstatisticasPesquisas } from '@/types/pesquisasSatisfacao';

interface ExportResult {
  success: boolean;
  message?: string;
  error?: string;
}

/**
 * Formatar data para exibição
 */
function formatarData(data: string | null): string {
  if (!data) return '-';
  try {
    return format(new Date(data), "dd/MM/yyyy HH:mm", { locale: ptBR });
  } catch {
    return '-';
  }
}

/**
 * Exportar pesquisas para Excel
 */
export function exportarPesquisasExcel(
  pesquisas: Pesquisa[],
  estatisticas: EstatisticasPesquisas
): ExportResult {
  try {
    // Criar workbook
    const wb = XLSX.utils.book_new();

    // Aba 1: Resumo Estatístico
    const resumoData = [
      ['RESUMO ESTATÍSTICO - PESQUISAS DE SATISFAÇÃO'],
      [''],
      ['Métrica', 'Valor'],
      ['Total de Pesquisas', estatisticas.total],
      ['Pendentes', estatisticas.pendentes],
      ['Enviados', estatisticas.enviados],
      ['SQL Server', estatisticas.sql_server],
      ['Manuais', estatisticas.manuais],
      [''],
      ['POR EMPRESA'],
      ['Empresa', 'Quantidade'],
      ...Object.entries(estatisticas.por_empresa).map(([empresa, qtd]) => [empresa, qtd]),
      [''],
      ['POR CATEGORIA'],
      ['Categoria', 'Quantidade'],
      ...Object.entries(estatisticas.por_categoria).map(([cat, qtd]) => [cat, qtd]),
    ];

    const wsResumo = XLSX.utils.aoa_to_sheet(resumoData);
    
    // Larguras das colunas
    wsResumo['!cols'] = [
      { wch: 30 },
      { wch: 15 }
    ];

    XLSX.utils.book_append_sheet(wb, wsResumo, 'Resumo');

    // Aba 2: Dados Completos
    const dadosExport = pesquisas.map(p => ({
      'Origem': p.origem === 'sql_server' ? 'SQL Server' : 'Manual',
      'Empresa': p.empresa,
      'Cliente': p.cliente,
      'Categoria': p.categoria || '-',
      'Grupo': p.grupo || '-',
      'Prestador': p.prestador || '-',
      'Tipo Caso': p.tipo_caso || '-',
      'Nº Caso': p.nro_caso || '-',
      'Ano Abertura': p.ano_abertura || '-',
      'Mês Abertura': p.mes_abertura || '-',
      'Data Resposta': formatarData(p.data_resposta),
      'Resposta': p.resposta || '-',
      'Comentário': p.comentario_pesquisa || '-',
      'Observação': p.observacao || '-',
      'Autor': p.autor_nome || '-',
      'Data Criação': formatarData(p.created_at),
    }));

    const wsDados = XLSX.utils.json_to_sheet(dadosExport);
    
    // Larguras das colunas
    wsDados['!cols'] = [
      { wch: 12 }, // Origem
      { wch: 35 }, // Empresa
      { wch: 30 }, // Cliente
      { wch: 25 }, // Categoria
      { wch: 25 }, // Grupo
      { wch: 30 }, // Prestador
      { wch: 15 }, // Tipo Caso
      { wch: 12 }, // Nº Caso
      { wch: 12 }, // Ano
      { wch: 12 }, // Mês
      { wch: 16 }, // Data Resposta
      { wch: 18 }, // Resposta
      { wch: 50 }, // Comentário
      { wch: 30 }, // Observação
      { wch: 25 }, // Autor
      { wch: 16 }, // Data Criação
    ];

    XLSX.utils.book_append_sheet(wb, wsDados, 'Pesquisas');

    // Gerar arquivo
    const timestamp = format(new Date(), 'yyyyMMdd_HHmmss');
    const filename = `pesquisas_satisfacao_${timestamp}.xlsx`;
    XLSX.writeFile(wb, filename);

    return {
      success: true,
      message: `Arquivo Excel exportado com sucesso: ${filename}`
    };
  } catch (error) {
    console.error('Erro ao exportar Excel:', error);
    return {
      success: false,
      error: 'Erro ao gerar arquivo Excel'
    };
  }
}

/**
 * Exportar pesquisas para PDF
 */
export function exportarPesquisasPDF(
  pesquisas: Pesquisa[],
  estatisticas: EstatisticasPesquisas
): ExportResult {
  try {
    const doc = new jsPDF('portrait', 'mm', 'a4');
    const corAzulSonda = '#2563eb';
    let yPos = 20;

    // Cabeçalho
    doc.setFillColor(corAzulSonda);
    doc.rect(0, 0, 210, 30, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text('Pesquisas de Satisfação', 105, 15, { align: 'center' });
    
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Gerado em: ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`, 105, 22, { align: 'center' });

    yPos = 40;

    // Card de Resumo Estatístico (estilo similar ao da imagem)
    const cardResumoHeight = 35;
    
    // Borda azul do card de resumo
    doc.setDrawColor(37, 99, 235); // Azul Sonda
    doc.setLineWidth(1.5);
    doc.rect(15, yPos, 180, cardResumoHeight);
    
    // Fundo cinza claro
    doc.setFillColor(240, 248, 255); // Azul muito claro
    doc.rect(15.5, yPos + 0.5, 179, cardResumoHeight - 1, 'F');
    
    // Título do resumo
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('RESUMO ESTATÍSTICO - PESQUISAS DE SATISFAÇÃO', 20, yPos + 8);
    
    // Estatísticas em linhas
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(80, 80, 80);
    
    let resumoY = yPos + 14;
    doc.text(`Total de pesquisas: ${estatisticas.total}`, 20, resumoY);
    resumoY += 4;
    doc.text(`Pesquisas pendentes: ${estatisticas.pendentes}`, 20, resumoY);
    resumoY += 4;
    doc.text(`Pesquisas enviadas: ${estatisticas.enviados}`, 20, resumoY);
    resumoY += 4;
    doc.text(`Origem SQL Server: ${estatisticas.sql_server}`, 20, resumoY);
    resumoY += 4;
    doc.text(`Origem Manual: ${estatisticas.manuais}`, 20, resumoY);
    
    // Valor total destacado em azul (canto direito)
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(37, 99, 235); // Azul Sonda
    doc.text(`TOTAL: ${estatisticas.total}`, 185, yPos + 25, { align: 'right' });
    
    yPos += cardResumoHeight + 10;

    // Título da seção de pesquisas
    doc.setTextColor(80, 80, 80);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('PESQUISAS DE SATISFAÇÃO', 20, yPos);
    
    yPos += 10;

    // Renderizar cada pesquisa como card
    pesquisas.forEach((pesquisa, index) => {
      // Verificar se precisa de nova página
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }

      // Card da pesquisa (estilo similar ao da imagem)
      const cardHeight = 50;
      
      // Borda lateral azul (mais larga)
      doc.setFillColor(37, 99, 235); // Azul Sonda
      doc.rect(15, yPos, 6, cardHeight, 'F');
      
      // Fundo cinza claro do card
      doc.setFillColor(248, 250, 252);
      doc.rect(21, yPos, 174, cardHeight, 'F');
      
      // Borda sutil do card
      doc.setDrawColor(220, 220, 220);
      doc.setLineWidth(0.5);
      doc.rect(15, yPos, 180, cardHeight);

      let cardY = yPos + 8;

      // Linha 1: ID/Número da pesquisa (estilo similar ao RF-7713780)
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      const idPesquisa = pesquisa.nro_caso || `PS-${pesquisa.id.substring(0, 8)}`;
      doc.text(idPesquisa, 25, cardY);
      
      // Tipo no canto direito (estilo "Banco de Horas")
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(37, 99, 235); // Azul Sonda
      const tipoPesquisa = pesquisa.origem === 'sql_server' ? 'Pesquisa Automática' : 'Pesquisa Manual';
      doc.text(tipoPesquisa, 185, cardY, { align: 'right' });

      cardY += 6;

      // Linha 2: Cliente e empresa
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 100, 100);
      doc.text(`Cliente: ${pesquisa.cliente}`, 25, cardY);
      
      if (pesquisa.resposta) {
        doc.text(`Resposta: ${pesquisa.resposta}`, 120, cardY);
      }

      cardY += 5;

      // Linha 3: Empresa e categoria
      doc.text(`Empresa: ${pesquisa.empresa}`, 25, cardY);
      if (pesquisa.categoria) {
        doc.text(`Categoria: ${pesquisa.categoria}`, 120, cardY);
      }

      cardY += 5;

      // Linha 4: Comentário (truncado)
      if (pesquisa.comentario_pesquisa) {
        const comentario = pesquisa.comentario_pesquisa.length > 70 
          ? pesquisa.comentario_pesquisa.substring(0, 70) + '...'
          : pesquisa.comentario_pesquisa;
        doc.setFontSize(8);
        doc.setTextColor(80, 80, 80);
        doc.text(`Descrição: ${comentario}`, 25, cardY);
      }

      cardY += 5;

      // Linha 5: Data e autor (estilo similar ao "Envio: 12/12/2025 | Autor: Willian Betin Faria")
      doc.setFontSize(8);
      doc.setTextColor(120, 120, 120);
      let infoLinha = '';
      if (pesquisa.data_resposta) {
        infoLinha += `Resposta: ${formatarData(pesquisa.data_resposta)}`;
      }
      if (pesquisa.autor_nome) {
        if (infoLinha) infoLinha += ' | ';
        infoLinha += `Autor: ${pesquisa.autor_nome}`;
      }
      if (infoLinha) {
        doc.text(infoLinha, 25, cardY);
      }

      yPos += cardHeight + 3;
    });

    // Rodapé
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(150, 150, 150);
      doc.text(
        `Página ${i} de ${totalPages}`,
        105,
        290,
        { align: 'center' }
      );
    }

    // Salvar
    const timestamp = format(new Date(), 'yyyyMMdd_HHmmss');
    const filename = `pesquisas_satisfacao_${timestamp}.pdf`;
    doc.save(filename);

    return {
      success: true,
      message: `Arquivo PDF exportado com sucesso: ${filename}`
    };
  } catch (error) {
    console.error('Erro ao exportar PDF:', error);
    return {
      success: false,
      error: 'Erro ao gerar arquivo PDF'
    };
  }
}
