/**
 * Utilitário para gerar arquivo Excel com detalhamento de consumo de horas
 * no formato padrão de acompanhamento (similar ao relatório Ternium).
 * 
 * Gera planilha com colunas:
 * chamado, Cod_Resolucao, empresa, item_configuracao, Categoria, estado, tarefa,
 * tipo_tarefa, servicio_tarefa, Data_Sistema, dt_atividade, dt_abertura, dt_solucao,
 * Analista, Responsavel_Pelo_Chamado, solicitante, Horas, tempo_minutos, Ativi_Interna,
 * grupo_solucao, Descricao_tarefa
 * 
 * @module utils/gerarExcelConsumoHoras
 */

import * as XLSX from 'xlsx-js-style';
import { supabase } from '@/integrations/supabase/client';

/**
 * Interface para os dados de apontamento que serão exportados
 */
interface ApontamentoExcel {
  nro_chamado: string | null;
  cod_resolucao: string | null;
  org_us_final: string | null;
  item_configuracao: string | null;
  categoria: string | null;
  caso_estado: string | null;
  nro_tarefa: string | null;
  tipo_chamado: string | null;
  item_configuracao_servico?: string | null;
  data_sistema: string | null;
  data_atividade: string | null;
  data_abertura: string | null;
  data_fechamento: string | null;
  analista_tarefa: string | null;
  analista_caso: string | null;
  solicitante: string | null;
  tempo_gasto_horas: string | null;
  tempo_gasto_minutos: number | null;
  ativi_interna: string | null;
  grupo_tarefa: string | null;
  descricao_tarefa: string | null;
}

/**
 * Formata data ISO para formato DD/MM/YYYY
 */
function formatarData(dataISO: string | null): string {
  if (!dataISO) return '';
  try {
    const data = new Date(dataISO);
    if (isNaN(data.getTime())) return '';
    const dia = String(data.getDate()).padStart(2, '0');
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const ano = data.getFullYear();
    return `${dia}/${mes}/${ano}`;
  } catch {
    return '';
  }
}

/**
 * Formata minutos para formato HH:MM:SS
 */
function formatarHorasMinutos(tempoHoras: string | null, tempoMinutos: number | null): string {
  if (tempoHoras) {
    // Se já está no formato HH:MM, adicionar :00
    const partes = tempoHoras.split(':');
    if (partes.length === 2) return `${tempoHoras}:00`;
    if (partes.length === 3) return tempoHoras;
    return tempoHoras;
  }
  if (tempoMinutos != null && tempoMinutos > 0) {
    const horas = Math.floor(tempoMinutos / 60);
    const mins = tempoMinutos % 60;
    return `${String(horas).padStart(1, '0')}:${String(mins).padStart(2, '0')}:00`;
  }
  return '0:00:00';
}

/**
 * Busca os apontamentos detalhados do período para uma empresa
 * Usa os mesmos filtros do bancoHorasIntegracaoService.buscarConsumo()
 */
async function buscarApontamentosDetalhados(
  empresaId: string,
  mes: number,
  ano: number
): Promise<ApontamentoExcel[]> {
  // Buscar dados da empresa
  const { data: empresa, error: empresaError } = await supabase
    .from('empresas_clientes')
    .select('nome_abreviado, nome_completo')
    .eq('id', empresaId)
    .single();

  if (empresaError || !empresa) {
    console.error('❌ Erro ao buscar empresa para Excel:', empresaError);
    return [];
  }

  const nomeCompleto = empresa.nome_completo;
  if (!nomeCompleto) {
    console.error('❌ Nome completo da empresa não cadastrado');
    return [];
  }

  // Calcular período (usar strings de data para evitar problemas de timezone)
  const mesStr = String(mes).padStart(2, '0');
  const ultimoDia = new Date(ano, mes, 0).getDate();
  const dataInicioStr = `${ano}-${mesStr}-01T00:00:00.000Z`;
  const dataFimStr = `${ano}-${mesStr}-${String(ultimoDia).padStart(2, '0')}T23:59:59.999Z`;
  const dataInicio = new Date(dataInicioStr);
  const dataFim = new Date(dataFimStr);

  // Códigos de resolução válidos (mesmos do bancoHorasIntegracaoService)
  const codigosResolucaoValidos = [
    'Alocação - T&M',
    'Alocação - T&M (Banco=S |SLA=N)',
    'Alocação - T&M (Banco=S| SLA=N)',
    'AMS SAP',
    'AMS SAP (Banco=S |SLA=S)',
    'AMS SAP (Banco=S| SLA=S)',
    'Aplicação de Nota / Licença - Contratados',
    'Aplicação de Nota / Licença (Banco=S |SLA=N)',
    'AMS SAP',
    'AMS SAP (Banco=S |SLA=S)',
    'AMS SAP (Banco=S| SLA=S)',
    'Consultoria',
    'Consultoria (Banco=S| SLA=S)',
    'Consultoria (Banco=S |SLA=S)',
    'Consultoria - Banco de Dados',
    'Consultoria - Banco de Dados (Banco=S |SLA=S)',
    'Consultoria - Banco de Dados (Banco=S| SLA=S)',
    'Consultoria - Nota Publicada',
    'Consultoria - Nota Publicada (Banco=S |SLA=S)',
    'Consultoria - Nota Publicada (Banco=S| SLA=S)',
    'Consultoria - Solução Paliativa',
    'Consultoria - Solução Paliativa (Banco=S |SLA=S)',
    'Consultoria - Solução Paliativa (Banco=S| SLA=S)',
    'Dúvida',
    'Dúvida (Banco=S |SLA=N)',
    'Erro de classificação na abertura',
    'Erro de classificação na abertura (Banco=S |SLA=N)',
    'Erro de classificação na abertura (Banco=S| SLA=N)',
    'Erro de programa especifico (SEM SLA)',
    'Erro de programa especifico (Banco=S |SLA=N)',
    'Erro de programa especifico (Banco=S| SLA=N)',
    'Levantamento de Versão / Orçamento',
    'Levantamento de Versão / Orçamento (Banco=S |SLA=N)',
    'Levantamento de Versão /Orçamento (Banco=S |SLA=N)',
    'Monitoramento DBA',
    'Monitoramento DBA (Banco=S |SLA=S)',
    'Nota Publicada',
    'Nota Publicada (Banco=S |SLA=N)',
    'Nota Publicada (Banco=S| SLA=N)',
    'Parametrização / Cadastro',
    'Parametrização / Cadastro (Banco=S |SLA=N)',
    'Parametrização / Funcionalidade',
    'Parametrização / Funcionalidade (Banco=S |SLA=S)',
    'Parametrização / Funcionalidade (Banco=S |SLA=N)',
    'Validação de Arquivo',
    'Validação de Arquivo (Banco=S |SLA=N)',
    'Validação de Arquivo (Banco=S| SLA=N)'
  ];

  // Buscar apontamentos com todos os campos necessários
  // Nota: filtramos cod_resolucao em JS após a query para evitar limite do .in() com muitos itens
  const { data: apontamentos, error } = await supabase
    .from('apontamentos_aranda' as any)
    .select('nro_chamado, cod_resolucao, org_us_final, item_configuracao, categoria, caso_estado, nro_tarefa, tipo_chamado, data_sistema, data_atividade, data_abertura, data_fechamento, analista_tarefa, analista_caso, solicitante, tempo_gasto_horas, tempo_gasto_minutos, ativi_interna, grupo_tarefa, descricao_tarefa')
    .eq('ativi_interna', 'Não')
    .neq('item_configuracao', '000000 - PROJETOS APL')
    .in('tipo_chamado', ['IM', 'RF', 'PM'])
    .or('caso_grupo.ilike.%AMS APL%,caso_grupo.ilike.%AMS - ATENDIMENTO%,caso_grupo.ilike.%AMS T&M%') // Filtrar por grupo do caso
    .gte('data_atividade', dataInicio.toISOString())
    .lte('data_atividade', dataFim.toISOString())
    .ilike('org_us_final', `%${nomeCompleto}%`)
    .order('data_atividade', { ascending: true })
    .limit(10000);

  if (error) {
    console.error('❌ Erro ao buscar apontamentos para Excel:', error);
    return [];
  }

  // Filtrar por códigos de resolução válidos em JS (evita limite do .in() no Supabase)
  const apontamentosComCodigo = (apontamentos || []).filter((apt: any) => {
    if (!apt.cod_resolucao) return false;
    return codigosResolucaoValidos.includes(apt.cod_resolucao);
  });

  // Filtrar: data_atividade e data_sistema devem estar no mesmo mês
  const apontamentosFiltrados = apontamentosComCodigo.filter((apt: any) => {
    if (apt.data_atividade && apt.data_sistema) {
      const dataAtividade = new Date(apt.data_atividade);
      const dataSistema = new Date(apt.data_sistema);
      return (
        dataAtividade.getMonth() === dataSistema.getMonth() &&
        dataAtividade.getFullYear() === dataSistema.getFullYear()
      );
    }
    return true;
  });

  console.log(`📊 Apontamentos após filtros: total=${(apontamentos||[]).length}, com código válido=${apontamentosComCodigo.length}, mesmo mês=${apontamentosFiltrados.length}`);

  return apontamentosFiltrados as unknown as ApontamentoExcel[];
}

/**
 * Gera o arquivo Excel com os apontamentos e retorna como Blob
 */
function gerarWorkbook(
  apontamentos: ApontamentoExcel[],
  empresaNome: string,
  mes: number,
  ano: number,
  requerimentos?: any[],
  observacoes?: any[]
): XLSX.WorkBook {
  const workbook = XLSX.utils.book_new();

  // ===== Sheet 1: Consumo de Horas =====
  const headers = [
    'CHAMADO',
    'CÓDIGO RESOLUÇÃO',
    'EMPRESA',
    'ITEM CONFIGURAÇÃO',
    'CATEGORIA',
    'ESTADO',
    'TAREFA',
    'TIPO TAREFA',
    'SERVIÇO TAREFA',
    'DATA SISTEMA',
    'DATA ATIVIDADE',
    'DATA ABERTURA',
    'DATA SOLUÇÃO',
    'ANALISTA',
    'RESPONSÁVEL PELO CHAMADO',
    'SOLICITANTE',
    'HORAS',
    'TEMPO (MINUTOS)',
    'ATIVIDADE INTERNA',
    'GRUPO SOLUÇÃO',
    'DESCRIÇÃO TAREFA',
  ];

  const rows = apontamentos.map(apt => [
    apt.nro_chamado || '',
    apt.cod_resolucao ? apt.cod_resolucao.replace(/\s*\(Banco.*$/i, '') : '',
    apt.org_us_final || '',
    apt.item_configuracao || '',
    apt.categoria || '',
    apt.caso_estado || '',
    apt.nro_tarefa || '',
    apt.tipo_chamado || '',
    apt.item_configuracao || '', // servicio_tarefa = item_configuracao
    formatarData(apt.data_sistema),
    formatarData(apt.data_atividade),
    formatarData(apt.data_abertura),
    formatarData(apt.data_fechamento),
    apt.analista_tarefa || '',
    apt.analista_caso || apt.analista_tarefa || '',
    apt.solicitante || '',
    formatarHorasMinutos(apt.tempo_gasto_horas, apt.tempo_gasto_minutos),
    apt.tempo_gasto_minutos || 0,
    apt.ativi_interna || '',
    apt.grupo_tarefa || '',
    apt.descricao_tarefa || '',
  ]);

  // Calcular total de horas
  let totalMinutos = 0;
  apontamentos.forEach(apt => {
    if (apt.tempo_gasto_minutos) {
      totalMinutos += apt.tempo_gasto_minutos;
    } else if (apt.tempo_gasto_horas) {
      const partes = apt.tempo_gasto_horas.split(':');
      if (partes.length >= 2) {
        totalMinutos += parseInt(partes[0]) * 60 + parseInt(partes[1]);
      }
    }
  });
  const totalHoras = Math.floor(totalMinutos / 60);
  const totalMins = totalMinutos % 60;
  const totalFormatado = `${String(totalHoras).padStart(1, '0')}:${String(totalMins).padStart(2, '0')}:00`;

  // Adicionar linha de total
  const linhaTotal = Array(headers.length).fill('');
  linhaTotal[headers.indexOf('HORAS') - 1] = 'Total de Horas:';
  linhaTotal[headers.indexOf('HORAS')] = totalFormatado;

  const sheetData = [headers, ...rows, [], linhaTotal];
  const sheet = XLSX.utils.aoa_to_sheet(sheetData);

  // Aplicar estilos nos headers (fundo azul Sonda com texto branco em negrito)
  const headerStyle = {
    font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 11 },
    fill: { fgColor: { rgb: '2563EB' } },
    alignment: { horizontal: 'center', vertical: 'center' },
  };
  
  for (let col = 0; col < headers.length; col++) {
    const cellRef = XLSX.utils.encode_cell({ r: 0, c: col });
    if (sheet[cellRef]) {
      sheet[cellRef].s = headerStyle;
    }
  }

  // Definir larguras das colunas
  sheet['!cols'] = [
    { width: 12 },  // CHAMADO
    { width: 35 },  // CÓDIGO RESOLUÇÃO
    { width: 30 },  // EMPRESA
    { width: 35 },  // ITEM CONFIGURAÇÃO
    { width: 30 },  // CATEGORIA
    { width: 10 },  // ESTADO
    { width: 14 },  // TAREFA
    { width: 12 },  // TIPO TAREFA
    { width: 35 },  // SERVIÇO TAREFA
    { width: 14 },  // DATA SISTEMA
    { width: 14 },  // DATA ATIVIDADE
    { width: 14 },  // DATA ABERTURA
    { width: 14 },  // DATA SOLUÇÃO
    { width: 30 },  // ANALISTA
    { width: 30 },  // RESPONSÁVEL PELO CHAMADO
    { width: 30 },  // SOLICITANTE
    { width: 10 },  // HORAS
    { width: 16 },  // TEMPO (MINUTOS)
    { width: 16 },  // ATIVIDADE INTERNA
    { width: 30 },  // GRUPO SOLUÇÃO
    { width: 60 },  // DESCRIÇÃO TAREFA
  ];

  XLSX.utils.book_append_sheet(workbook, sheet, 'Consumo de Horas');

  // ===== Sheet 2: Requerimentos (se houver) =====
  if (requerimentos && requerimentos.length > 0) {
    const reqHeaders = [
      'CHAMADO',
      'CLIENTE',
      'MÓDULO',
      'DESCRIÇÃO',
      'H. FUNCIONAL',
      'H. TÉCNICO',
      'H. TOTAL',
      'TIPO COBRANÇA',
      'DATA ENVIO',
      'DATA APROVAÇÃO',
      'MÊS COBRANÇA',
      'VALOR TOTAL',
      'OBSERVAÇÃO',
    ];

    const reqRows = requerimentos.map(req => [
      req.chamado || '',
      req.cliente_nome || '',
      req.modulo || '',
      req.descricao || '',
      req.horas_funcional || '',
      req.horas_tecnico || '',
      req.horas_total || '',
      req.tipo_cobranca || '',
      req.data_envio ? new Date(req.data_envio).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '',
      req.data_aprovacao ? new Date(req.data_aprovacao).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '',
      req.mes_cobranca || '',
      req.valor_total_geral || '',
      req.observacao || '',
    ]);

    const reqSheetData = [reqHeaders, ...reqRows];
    const reqSheet = XLSX.utils.aoa_to_sheet(reqSheetData);

    // Aplicar estilos nos headers
    for (let col = 0; col < reqHeaders.length; col++) {
      const cellRef = XLSX.utils.encode_cell({ r: 0, c: col });
      if (reqSheet[cellRef]) {
        reqSheet[cellRef].s = headerStyle;
      }
    }

    reqSheet['!cols'] = [
      { width: 14 },  // CHAMADO
      { width: 25 },  // CLIENTE
      { width: 15 },  // MÓDULO
      { width: 50 },  // DESCRIÇÃO
      { width: 14 },  // H. FUNCIONAL
      { width: 14 },  // H. TÉCNICO
      { width: 12 },  // H. TOTAL
      { width: 18 },  // TIPO COBRANÇA
      { width: 14 },  // DATA ENVIO
      { width: 16 },  // DATA APROVAÇÃO
      { width: 14 },  // MÊS COBRANÇA
      { width: 14 },  // VALOR TOTAL
      { width: 40 },  // OBSERVAÇÃO
    ];

    XLSX.utils.book_append_sheet(workbook, reqSheet, 'Requerimentos');
  }

  // ===== Sheet 3: Observações (se houver) =====
  if (observacoes && observacoes.length > 0) {
    const obsHeaders = [
      'TIPO',
      'PERÍODO',
      'OBSERVAÇÃO',
      'USUÁRIO',
      'DATA',
      'TIPO AJUSTE',
      'VALOR HORAS',
    ];

    const MESES_PT = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];

    const obsRows = observacoes.map(obs => [
      obs.tipo === 'manual' ? 'Manual' : 'Ajuste',
      obs.mes && obs.ano ? `${MESES_PT[(obs.mes || 1) - 1]}/${obs.ano}` : '',
      obs.texto || '',
      obs.usuario_nome || '',
      obs.created_at ? new Date(obs.created_at).toLocaleDateString('pt-BR') : '',
      obs.tipo_ajuste || '',
      obs.valor_horas || '',
    ]);

    const obsSheetData = [obsHeaders, ...obsRows];
    const obsSheet = XLSX.utils.aoa_to_sheet(obsSheetData);

    // Aplicar estilos nos headers
    for (let col = 0; col < obsHeaders.length; col++) {
      const cellRef = XLSX.utils.encode_cell({ r: 0, c: col });
      if (obsSheet[cellRef]) {
        obsSheet[cellRef].s = headerStyle;
      }
    }

    obsSheet['!cols'] = [
      { width: 12 },  // TIPO
      { width: 18 },  // PERÍODO
      { width: 60 },  // OBSERVAÇÃO
      { width: 25 },  // USUÁRIO
      { width: 14 },  // DATA
      { width: 14 },  // TIPO AJUSTE
      { width: 14 },  // VALOR HORAS
    ];

    XLSX.utils.book_append_sheet(workbook, obsSheet, 'Observações');
  }

  return workbook;
}

/**
 * Gera o Excel e retorna como File para upload
 */
export async function gerarExcelConsumoHoras(
  empresaId: string,
  empresaNome: string,
  mes: number,
  ano: number,
  requerimentos?: any[],
  observacoes?: any[]
): Promise<File | null> {
  try {
    console.log('📊 Gerando Excel de consumo de horas...', { empresaId, empresaNome, mes, ano });

    // Buscar apontamentos detalhados
    const apontamentos = await buscarApontamentosDetalhados(empresaId, mes, ano);

    if (apontamentos.length === 0) {
      console.warn('⚠️ Nenhum apontamento encontrado para o período — gerando Excel com planilha vazia');
    } else {
      console.log(`✅ ${apontamentos.length} apontamentos encontrados para o Excel`);
    }

    // Gerar workbook
    const workbook = gerarWorkbook(apontamentos, empresaNome, mes, ano, requerimentos, observacoes);

    // Converter para buffer
    const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

    // Criar nome do arquivo
    const MESES_PT = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    const mesNome = MESES_PT[mes - 1];
    const nomeArquivo = `Consumo de Horas ${empresaNome} - ${mesNome} ${ano}.xlsx`;

    // Criar File a partir do Blob
    const file = new File([blob], nomeArquivo, {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });

    console.log(`✅ Excel gerado: ${nomeArquivo} (${(file.size / 1024).toFixed(1)} KB)`);
    return file;
  } catch (error) {
    console.error('❌ Erro ao gerar Excel de consumo de horas:', error);
    return null;
  }
}
