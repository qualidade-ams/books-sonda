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
    'Empresa Abreviado': cliente.empresa.nome_abreviado,
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
    { wch: 20 }, // Empresa Abreviado
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
    doc.text(`${cliente.empresa.nome_abreviado} - ${cliente.empresa.nome_completo}`, contentX, contentY + 5);

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
  emProjeto?: string; // 'Sim' ou 'Não'
  emailGestor?: string;
  linkSharepoint?: string;
  templatePadrao: string;
  produtos: string; // Produtos separados por vírgula
  temAms?: string; // 'Sim' ou 'Não'
  tipoBook?: string;
  tipoCobranca?: string;
  vigenciaInicial?: string;
  vigenciaFinal?: string;
  bookPersonalizado?: string; // 'Sim' ou 'Não'
  anexo?: string; // 'Sim' ou 'Não'
  observacao?: string;
  // Parâmetros de Banco de Horas
  tipoContrato?: string;
  periodoApuracao?: number;
  inicioVigenciaBancoHoras?: string;
  baselineHorasMensal?: string;
  baselineTicketsMensal?: number;
  possuiRepasseEspecial?: string; // 'Sim' ou 'Não'
  tipoRepasseEspecial?: string; // 'Simples' ou 'Por Período'
  ciclosParaZerar?: number;
  percentualRepasseMensal?: number;
  percentualRepasseEspecial?: number;
  // Configuração de repasse por período
  duracaoPeriodoMeses?: number;
  percentualDentroPeriodo?: number;
  percentualEntrePeriodos?: number;
  periodosAteZerar?: number;
  // Campos de Meta SLA
  metaSlaPercentual?: number;
  quantidadeMinimaChamadosSla?: number;
}

// Interface para dados de importação de clientes
export interface ClienteImportData {
  nomeCompleto: string;
  email: string;
  funcao?: string;
  empresaNome: string; // Nome abreviado da empresa para associação
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
        const emProjetoIndex = headers.findIndex(h =>
          h && h.toLowerCase().includes('em projeto')
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
        const temAmsIndex = headers.findIndex(h =>
          h && h.toLowerCase().includes('tem ams')
        );
        const tipoBookIndex = headers.findIndex(h =>
          h && h.toLowerCase().includes('tipo book')
        );
        const tipoCobrancaIndex = headers.findIndex(h =>
          h && h.toLowerCase().includes('tipo cobrança') || h.toLowerCase().includes('tipo cobranca')
        );
        const vigenciaInicialIndex = headers.findIndex(h =>
          h && h.toLowerCase().includes('vigência inicial') || h.toLowerCase().includes('vigencia inicial')
        );
        const vigenciaFinalIndex = headers.findIndex(h =>
          h && h.toLowerCase().includes('vigência final') || h.toLowerCase().includes('vigencia final')
        );
        const bookPersonalizadoIndex = headers.findIndex(h =>
          h && h.toLowerCase().includes('book personalizado')
        );
        const anexoIndex = headers.findIndex(h =>
          h && h.toLowerCase() === 'anexo'
        );
        const observacaoIndex = headers.findIndex(h =>
          h && h.toLowerCase().includes('observação') || h.toLowerCase().includes('observacao')
        );
        // Parâmetros de Banco de Horas
        const tipoContratoIndex = headers.findIndex(h =>
          h && h.toLowerCase().includes('tipo de contrato') || h.toLowerCase().includes('tipo contrato')
        );
        const periodoApuracaoIndex = headers.findIndex(h =>
          h && h.toLowerCase().includes('período de apuração') || h.toLowerCase().includes('periodo de apuracao')
        );
        const inicioVigenciaBancoHorasIndex = headers.findIndex(h =>
          h && h.toLowerCase().includes('início vigência banco') || h.toLowerCase().includes('inicio vigencia banco')
        );
        const baselineHorasMensalIndex = headers.findIndex(h =>
          h && h.toLowerCase().includes('baseline horas mensal')
        );
        const baselineTicketsMensalIndex = headers.findIndex(h =>
          h && h.toLowerCase().includes('baseline tickets mensal')
        );
        const possuiRepasseEspecialIndex = headers.findIndex(h =>
          h && h.toLowerCase().includes('possui repasse especial')
        );
        const tipoRepasseEspecialIndex = headers.findIndex(h =>
          h && h.toLowerCase().includes('tipo repasse especial')
        );
        const ciclosParaZerarIndex = headers.findIndex(h =>
          h && h.toLowerCase().includes('ciclos para zerar')
        );
        const percentualRepasseMensalIndex = headers.findIndex(h =>
          h && h.toLowerCase().includes('% repasse mensal')
        );
        const percentualRepasseEspecialIndex = headers.findIndex(h =>
          h && h.toLowerCase().includes('% repasse especial')
        );
        // Configuração de repasse por período
        const duracaoPeriodoMesesIndex = headers.findIndex(h =>
          h && h.toLowerCase().includes('duração período') || h.toLowerCase().includes('duracao periodo')
        );
        const percentualDentroPeriodoIndex = headers.findIndex(h =>
          h && h.toLowerCase().includes('% dentro do período') || h.toLowerCase().includes('% dentro do periodo')
        );
        const percentualEntrePeriodosIndex = headers.findIndex(h =>
          h && h.toLowerCase().includes('% entre períodos') || h.toLowerCase().includes('% entre periodos')
        );
        const periodosAteZerarIndex = headers.findIndex(h =>
          h && h.toLowerCase().includes('períodos até zerar') || h.toLowerCase().includes('periodos ate zerar')
        );
        // Campos de Meta SLA
        const metaSlaPercentualIndex = headers.findIndex(h =>
          h && h.toLowerCase().includes('meta sla')
        );
        const quantidadeMinimaChamadosSlaIndex = headers.findIndex(h =>
          h && h.toLowerCase().includes('qtd mínima chamados') || h.toLowerCase().includes('qtd minima chamados')
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
            emProjeto: emProjetoIndex !== -1 && row[emProjetoIndex]
              ? String(row[emProjetoIndex]).trim()
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
              : '',
            temAms: temAmsIndex !== -1 && row[temAmsIndex]
              ? String(row[temAmsIndex]).trim()
              : undefined,
            tipoBook: tipoBookIndex !== -1 && row[tipoBookIndex]
              ? String(row[tipoBookIndex]).trim()
              : undefined,
            tipoCobranca: tipoCobrancaIndex !== -1 && row[tipoCobrancaIndex]
              ? String(row[tipoCobrancaIndex]).trim()
              : undefined,
            vigenciaInicial: vigenciaInicialIndex !== -1 && row[vigenciaInicialIndex]
              ? String(row[vigenciaInicialIndex]).trim()
              : undefined,
            vigenciaFinal: vigenciaFinalIndex !== -1 && row[vigenciaFinalIndex]
              ? String(row[vigenciaFinalIndex]).trim()
              : undefined,
            bookPersonalizado: bookPersonalizadoIndex !== -1 && row[bookPersonalizadoIndex]
              ? String(row[bookPersonalizadoIndex]).trim()
              : undefined,
            anexo: anexoIndex !== -1 && row[anexoIndex]
              ? String(row[anexoIndex]).trim()
              : undefined,
            observacao: observacaoIndex !== -1 && row[observacaoIndex]
              ? String(row[observacaoIndex]).trim()
              : undefined,
            // Parâmetros de Banco de Horas
            tipoContrato: tipoContratoIndex !== -1 && row[tipoContratoIndex]
              ? String(row[tipoContratoIndex]).trim()
              : undefined,
            periodoApuracao: periodoApuracaoIndex !== -1 && row[periodoApuracaoIndex]
              ? Number(row[periodoApuracaoIndex])
              : undefined,
            inicioVigenciaBancoHoras: inicioVigenciaBancoHorasIndex !== -1 && row[inicioVigenciaBancoHorasIndex]
              ? String(row[inicioVigenciaBancoHorasIndex]).trim()
              : undefined,
            baselineHorasMensal: baselineHorasMensalIndex !== -1 && row[baselineHorasMensalIndex]
              ? String(row[baselineHorasMensalIndex]).trim()
              : undefined,
            baselineTicketsMensal: baselineTicketsMensalIndex !== -1 && row[baselineTicketsMensalIndex]
              ? Number(row[baselineTicketsMensalIndex])
              : undefined,
            possuiRepasseEspecial: possuiRepasseEspecialIndex !== -1 && row[possuiRepasseEspecialIndex]
              ? String(row[possuiRepasseEspecialIndex]).trim()
              : undefined,
            tipoRepasseEspecial: tipoRepasseEspecialIndex !== -1 && row[tipoRepasseEspecialIndex]
              ? String(row[tipoRepasseEspecialIndex]).trim()
              : undefined,
            ciclosParaZerar: ciclosParaZerarIndex !== -1 && row[ciclosParaZerarIndex]
              ? Number(row[ciclosParaZerarIndex])
              : undefined,
            percentualRepasseMensal: percentualRepasseMensalIndex !== -1 && row[percentualRepasseMensalIndex]
              ? Number(row[percentualRepasseMensalIndex])
              : undefined,
            percentualRepasseEspecial: percentualRepasseEspecialIndex !== -1 && row[percentualRepasseEspecialIndex]
              ? Number(row[percentualRepasseEspecialIndex])
              : undefined,
            // Configuração de repasse por período
            duracaoPeriodoMeses: duracaoPeriodoMesesIndex !== -1 && row[duracaoPeriodoMesesIndex]
              ? Number(row[duracaoPeriodoMesesIndex])
              : undefined,
            percentualDentroPeriodo: percentualDentroPeriodoIndex !== -1 && row[percentualDentroPeriodoIndex]
              ? Number(row[percentualDentroPeriodoIndex])
              : undefined,
            percentualEntrePeriodos: percentualEntrePeriodosIndex !== -1 && row[percentualEntrePeriodosIndex]
              ? Number(row[percentualEntrePeriodosIndex])
              : undefined,
            periodosAteZerar: periodosAteZerarIndex !== -1 && row[periodosAteZerarIndex]
              ? Number(row[periodosAteZerarIndex])
              : undefined,
            // Campos de Meta SLA
            metaSlaPercentual: metaSlaPercentualIndex !== -1 && row[metaSlaPercentualIndex]
              ? Number(row[metaSlaPercentualIndex])
              : undefined,
            quantidadeMinimaChamadosSla: quantidadeMinimaChamadosSlaIndex !== -1 && row[quantidadeMinimaChamadosSlaIndex]
              ? Number(row[quantidadeMinimaChamadosSlaIndex])
              : undefined,
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
          h && (h.toLowerCase().includes('empresa abreviada') || h.toLowerCase().includes('empresa abreviado'))
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
          throw new Error('Coluna "Empresa Abreviada" não encontrada no arquivo');
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
            empresaNome: String(row[empresaIndex]).trim(), // Nome abreviado da empresa
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
  const produtosValidos = ['COMEX', 'FISCAL', 'GALLERY'];
  const produtosMapeados: { [key: string]: string } = {
    'CE PLUS': 'COMEX',
    'CE-PLUS': 'COMEX',
    'CEPLUS': 'COMEX',
    'CE': 'COMEX',
    'COMEX': 'COMEX'
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
      'Produtos': 'COMEX, FISCAL'
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
      'Empresa Abreviada': 'EXEMPLO',
      'Status': 'ativo',
      'Descrição Status': 'Cliente ativo (opcional)',
      'Principal Contato': 'Sim'
    },
    {
      'Nome Completo': 'Maria Santos',
      'E-mail': 'maria@outra.com',
      'Função': 'Analista',
      'Empresa Abreviada': 'OUTRA',
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
    { wch: 20 }, // Empresa Abreviada
    { wch: 12 }, // Status
    { wch: 25 }, // Descrição Status
    { wch: 15 }  // Principal Contato
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'Template');
  XLSX.writeFile(wb, 'template-importacao-clientes.xlsx');
};
