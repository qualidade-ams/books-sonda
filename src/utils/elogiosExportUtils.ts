/**
 * Utilitários para exportação de elogios
 * Seguindo o padrão do sistema para Excel e PDF
 */

import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import type { ElogioCompleto } from '@/types/elogios';
import type { DeParaCategoria } from '@/types/deParaCategoria';

// Declaração para o plugin autotable do jsPDF
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF;
  }
}

/**
 * Função para fazer de-para da categoria para grupo
 */
const obterGrupoPorCategoria = (categoria: string, deParaCategorias: DeParaCategoria[]): string => {
  if (!categoria) return '-';
  
  // Busca exata primeiro
  let deParaEncontrado = deParaCategorias.find(
    dp => dp.categoria === categoria
  );
  
  // Se não encontrar, tentar busca parcial (mais flexível)
  if (!deParaEncontrado) {
    deParaEncontrado = deParaCategorias.find(
      dp => categoria.includes(dp.categoria) || dp.categoria.includes(categoria)
    );
  }
  
  return deParaEncontrado?.grupo || '-';
};

/**
 * Exporta elogios para Excel
 */
export const exportarElogiosExcel = (
  elogios: ElogioCompleto[],
  periodo: string,
  deParaCategorias: DeParaCategoria[] = []
) => {
  try {
    // Preparar dados para exportação
    const dadosExcel = elogios.map((elogio, index) => {
      const categoria = elogio.pesquisa?.categoria || '';
      const grupoMapeado = obterGrupoPorCategoria(categoria, deParaCategorias);
      
      return {
        'Nº': index + 1,
        'Chamado': elogio.pesquisa?.nro_caso || '-',
        'Tipo Caso': elogio.pesquisa?.tipo_caso || '-',
        'Cliente': elogio.pesquisa?.cliente || '-',
        'Empresa': elogio.pesquisa?.empresa || '-',
        'Prestador': elogio.pesquisa?.prestador || '-',
        'Categoria': categoria || '-',
        'Grupo': elogio.pesquisa?.grupo || '-',
        'Grupo de x para': grupoMapeado,
        'Resposta': elogio.pesquisa?.resposta || '-',
        'Comentário': elogio.pesquisa?.comentario_pesquisa || '-',
        'Data Resposta': elogio.data_resposta ? new Date(elogio.data_resposta).toLocaleDateString('pt-BR') : '-',
        'Status': elogio.status === 'compartilhado' ? 'Validado' : 
                  elogio.status === 'enviado' ? 'Enviado por Email' : 
                  'Registrado',
        'Criado em': elogio.criado_em ? new Date(elogio.criado_em).toLocaleDateString('pt-BR') : '-'
      };
    });

    // Criar workbook
    const wb = XLSX.utils.book_new();
    
    // Criar worksheet com os dados
    const ws = XLSX.utils.json_to_sheet(dadosExcel);
    
    // Definir larguras das colunas
    const colWidths = [
      { wch: 5 },   // Nº
      { wch: 15 },  // Chamado
      { wch: 12 },  // Tipo Caso
      { wch: 25 },  // Cliente
      { wch: 20 },  // Empresa
      { wch: 25 },  // Prestador
      { wch: 30 },  // Categoria
      { wch: 35 },  // Grupo
      { wch: 20 },  // Grupo de x para
      { wch: 15 },  // Resposta
      { wch: 50 },  // Comentário
      { wch: 12 },  // Data Resposta
      { wch: 15 },  // Status
      { wch: 12 }   // Criado em
    ];
    ws['!cols'] = colWidths;

    // Adicionar worksheet ao workbook
    XLSX.utils.book_append_sheet(wb, ws, 'Elogios');

    // Gerar nome do arquivo
    const dataAtual = new Date().toLocaleDateString('pt-BR').replace(/\//g, '-');
    const nomeArquivo = `Relatorio_Elogios_${periodo}_${dataAtual}.xlsx`;

    // Fazer download
    XLSX.writeFile(wb, nomeArquivo);

    return { success: true, message: 'Relatório Excel exportado com sucesso!' };
  } catch (error) {
    console.error('Erro ao exportar Excel:', error);
    return { success: false, error: 'Erro ao gerar arquivo Excel' };
  }
};

/**
 * Exporta elogios para PDF seguindo o padrão do sistema
 */
export const exportarElogiosPDF = (
  elogios: ElogioCompleto[],
  periodo: string,
  deParaCategorias: DeParaCategoria[] = []
) => {
  try {
    const doc = new jsPDF('l', 'mm', 'a4'); // Landscape para mais espaço
    const dataAtual = new Date().toLocaleDateString('pt-BR');
    
    // Configurações de estilo
    const corPrimaria = [41, 128, 185]; // Azul
    const corSecundaria = [52, 73, 94]; // Cinza escuro
    
    // Cabeçalho
    doc.setFillColor(...corPrimaria);
    doc.rect(0, 0, 297, 25, 'F');
    
    // Título
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('RELATÓRIO DE ELOGIOS', 148.5, 15, { align: 'center' });
    
    // Informações do relatório
    doc.setTextColor(...corSecundaria);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`Período: ${periodo}`, 20, 35);
    doc.text(`Data de Geração: ${dataAtual}`, 20, 42);
    doc.text(`Total de Elogios: ${elogios.length}`, 20, 49);
    
    // Preparar dados para a tabela
    const colunas = [
      'Nº',
      'Chamado',
      'Cliente',
      'Empresa', 
      'Prestador',
      'Grupo de x para',
      'Resposta',
      'Status',
      'Data Resposta'
    ];
    
    const linhas = elogios.map((elogio, index) => {
      const categoria = elogio.pesquisa?.categoria || '';
      const grupoMapeado = obterGrupoPorCategoria(categoria, deParaCategorias);
      
      return [
        (index + 1).toString(),
        elogio.pesquisa?.nro_caso || '-',
        elogio.pesquisa?.cliente || '-',
        elogio.pesquisa?.empresa || '-',
        elogio.pesquisa?.prestador || '-',
        grupoMapeado,
        elogio.pesquisa?.resposta || '-',
        elogio.status === 'compartilhado' ? 'Validado' : 
        elogio.status === 'enviado' ? 'Enviado' : 'Registrado',
        elogio.data_resposta ? new Date(elogio.data_resposta).toLocaleDateString('pt-BR') : '-'
      ];
    });
    
    // Criar tabela
    doc.autoTable({
      head: [colunas],
      body: linhas,
      startY: 55,
      theme: 'striped',
      headStyles: {
        fillColor: corPrimaria,
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        fontSize: 9
      },
      bodyStyles: {
        fontSize: 8,
        textColor: corSecundaria
      },
      alternateRowStyles: {
        fillColor: [245, 245, 245]
      },
      columnStyles: {
        0: { cellWidth: 15 }, // Nº
        1: { cellWidth: 25 }, // Chamado
        2: { cellWidth: 35 }, // Cliente
        3: { cellWidth: 30 }, // Empresa
        4: { cellWidth: 35 }, // Prestador
        5: { cellWidth: 30 }, // Grupo de x para
        6: { cellWidth: 20 }, // Resposta
        7: { cellWidth: 20 }, // Status
        8: { cellWidth: 25 }  // Data Resposta
      },
      margin: { left: 20, right: 20 },
      didDrawPage: (data) => {
        // Rodapé
        const pageCount = doc.getNumberOfPages();
        const pageSize = doc.internal.pageSize;
        const pageHeight = pageSize.height ? pageSize.height : pageSize.getHeight();
        
        doc.setFontSize(8);
        doc.setTextColor(128, 128, 128);
        doc.text(
          `Página ${data.pageNumber} de ${pageCount}`,
          pageSize.width / 2,
          pageHeight - 10,
          { align: 'center' }
        );
        
        doc.text(
          `Gerado em ${dataAtual} - Sistema Books SND`,
          pageSize.width - 20,
          pageHeight - 10,
          { align: 'right' }
        );
      }
    });
    
    // Gerar nome do arquivo
    const dataArquivo = new Date().toLocaleDateString('pt-BR').replace(/\//g, '-');
    const nomeArquivo = `Relatorio_Elogios_${periodo}_${dataArquivo}.pdf`;
    
    // Fazer download
    doc.save(nomeArquivo);
    
    return { success: true, message: 'Relatório PDF exportado com sucesso!' };
  } catch (error) {
    console.error('Erro ao exportar PDF:', error);
    return { success: false, error: 'Erro ao gerar arquivo PDF' };
  }
};