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
 * Exporta dados de empresas para PDF
 */
export const exportEmpresasToPDF = async (empresas: EmpresaClienteCompleta[]) => {
  if (!empresas || empresas.length === 0) {
    throw new Error('Nenhuma empresa encontrada para exportar');
  }

  // Importar dinamicamente o plugin autotable
  const { default: autoTable } = await import('jspdf-autotable');

  // Criar novo documento PDF
  const doc = new jsPDF('landscape', 'mm', 'a4');
  
  // Configurar fonte
  doc.setFont('helvetica');
  
  // Título do relatório
  doc.setFontSize(16);
  doc.text('Relatório de Empresas Clientes', 20, 20);
  
  // Data de geração
  doc.setFontSize(10);
  const dataAtual = new Date().toLocaleDateString('pt-BR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  doc.text(`Gerado em: ${dataAtual}`, 20, 30);
  
  // Preparar dados para a tabela
  const colunas = [
    'Nome Completo',
    'Nome Abreviado', 
    'Status',
    'E-mail Gestor',
    'Template Padrão',
    'Tem AMS',
    'Tipo de Book',
    'Vigência Final'
  ];
  
  const linhas = await Promise.all(
    empresas.map(async (empresa) => [
      empresa.nome_completo,
      empresa.nome_abreviado,
      empresa.status.toUpperCase(),
      empresa.email_gestor || '-',
      await mapearTemplatePadrao(empresa.template_padrao),
      empresa.tem_ams ? 'Sim' : 'Não',
      empresa.tipo_book,
      empresa.vigencia_final || '-'
    ])
  );
  
  // Criar tabela
  autoTable(doc, {
    head: [colunas],
    body: linhas,
    startY: 40,
    styles: {
      fontSize: 8,
      cellPadding: 2,
    },
    headStyles: {
      fillColor: [41, 128, 185], // Azul
      textColor: 255,
      fontStyle: 'bold'
    },
    alternateRowStyles: {
      fillColor: [245, 245, 245] // Cinza claro
    },
    columnStyles: {
      0: { cellWidth: 35 }, // Nome Completo
      1: { cellWidth: 25 }, // Nome Abreviado
      2: { cellWidth: 15 }, // Status
      3: { cellWidth: 30 }, // E-mail Gestor
      4: { cellWidth: 20 }, // Template Padrão
      5: { cellWidth: 12 }, // Tem AMS
      6: { cellWidth: 20 }, // Tipo de Book
      7: { cellWidth: 20 }  // Vigência Final
    }
  });
  
  // Adicionar rodapé com total de empresas
  const finalY = (doc as any).lastAutoTable?.finalY || 40;
  doc.setFontSize(10);
  doc.text(`Total de empresas: ${empresas.length}`, 20, finalY + 15);
  
  // Gerar nome do arquivo com data atual
  const dataArquivo = new Date().toLocaleDateString('pt-BR').replace(/\//g, '-');
  const nomeArquivo = `relatorio_empresas_${dataArquivo}.pdf`;
  
  // Fazer download do arquivo
  doc.save(nomeArquivo);
};