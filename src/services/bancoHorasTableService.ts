/**
 * Serviço para geração de tabelas HTML do Banco de Horas
 * 
 * Extrai a lógica de geração de tabelas do componente BotaoEnviarEmailBancoHoras
 * para permitir reutilização no disparo de books (geração de imagem).
 * 
 * Usado tanto pelo componente de envio de email de banco de horas quanto
 * pelo booksDisparoService para gerar imagem do banco no email de book.
 */

import { supabase } from '@/integrations/supabase/client';
import type { BancoHorasCalculo } from '@/types/bancoHoras';
import { getLabels, getMonthName, isEnglishTemplateByName } from '@/utils/bancoHorasI18n';

// ==================== Tipos locais ====================

interface Requerimento {
  chamado?: string;
  cliente_nome?: string;
  modulo?: string;
  horas_funcional?: number | string;
  horas_tecnico?: number | string;
  tipo_cobranca?: string;
  data_envio?: string;
  data_aprovacao?: string;
  mes_cobranca?: string;
  valor_total_geral?: number;
  status?: string;
}

interface Observacao {
  texto: string;
  tipo: string;
  tipo_ajuste?: string;
  valor_horas?: string;
  mes?: number;
  ano?: number;
  usuario_nome?: string;
  created_at?: string;
}

// ==================== Constantes ====================

export const MESES_PT = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

const MESES_EN = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

// ==================== Funções de Geração de Tabela ====================

/**
 * Gera a tabela principal do Banco de Horas em HTML (mesma estrutura da tela)
 * 
 * Produz HTML inline-styled para garantir renderização correta em clientes de email.
 */
export function gerarTabelaBancoHoras(
  calculos: BancoHorasCalculo[],
  tipoCobranca: string,
  percentualRepasse: number,
  nomePeriodo: string,
  diaInicioApuracao?: number,
  diaFimApuracao?: number,
  isEnglish: boolean = false
): string {
  // Se mais de 6 meses, dividir em múltiplas tabelas de no máximo 4 meses cada
  if (calculos.length > 6) {
    const tamanhoGrupo = 4;
    const totalPartes = Math.ceil(calculos.length / tamanhoGrupo);
    const tabelas: string[] = [];

    for (let i = 0; i < totalPartes; i++) {
      const parte = calculos.slice(i * tamanhoGrupo, (i + 1) * tamanhoGrupo);
      const tabela = gerarTabelaBancoHoras(parte, tipoCobranca, percentualRepasse, `${nomePeriodo} (${i + 1}/${totalPartes})`, diaInicioApuracao, diaFimApuracao, isEnglish);
      tabelas.push(tabela);
    }

    return tabelas.join('<div style="margin-top:12px;"></div>');
  }

  const labels = getLabels(isEnglish);
  const meses = isEnglish ? MESES_EN : MESES_PT;

  const isTicket = tipoCobranca?.toLowerCase() === 'ticket' || tipoCobranca?.toLowerCase() === 'tickets';
  
  const fmtVal = (horas: string | null | undefined, tickets: number | null | undefined, removerNegativo: boolean = false) => {
    if (isTicket) {
      const val = tickets || 0;
      return removerNegativo ? `${Math.abs(val)}` : `${val}`;
    }
    let h = horas || '00:00';
    const partes = h.split(':');
    if (partes.length >= 2) {
      h = `${partes[0]}:${partes[1].padStart(2, '0')}`;
    }
    if (removerNegativo) h = h.replace('-', '');
    return h;
  };

  const formatarMoeda = (valor: number | null | undefined) => {
    if (!valor || valor === 0) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
  };

  // Estilos base - fonte Inter, peso 600, tamanho 7pt legível
  const cellBase = 'padding:4px 6px;text-align:center;font-size:7pt;font-family:Inter,sans-serif;border:none;font-weight:600;';
  const headerDark = `padding:4px 6px;text-align:center;font-size:7pt;font-family:Inter,sans-serif;border:none;font-weight:600;color:#fff;background:#374151;`;
  const headerBlue = `padding:4px 6px;text-align:center;font-size:7pt;font-family:Inter,sans-serif;border:none;font-weight:600;color:#fff;background:#2563eb;`;
  const cellNormal = `${cellBase}color:#111827;border-bottom:1px solid #e5e7eb;`;
  const cellGreen = `${cellBase}color:#16a34a;border-bottom:1px solid #e5e7eb;`;
  const cellRed = `${cellBase}color:#dc2626;border-bottom:1px solid #e5e7eb;`;

  const headerMeses = calculos.map(c => {
    const anoAbrev = String(c.ano).slice(-2);
    const diaInicio = diaInicioApuracao ?? 1;
    const diaFim = diaFimApuracao ?? 0;
    const temApuracaoCustomizada = diaInicio !== 1 && diaFim !== 0;
    
    if (temApuracaoCustomizada) {
      const mesInicio = c.mes;
      let mesFim = mesInicio + 1;
      let anoFim = c.ano;
      if (mesFim > 12) {
        mesFim = 1;
        anoFim += 1;
      }
      const anoFimAbrev = String(anoFim).slice(-2);
      const mesInicioAbrev = meses[mesInicio - 1].substring(0, 3);
      const mesFimAbrev = meses[mesFim - 1].substring(0, 3);
      const separador = isEnglish ? 'to' : 'à';
      return `<th style="${headerBlue}">${diaInicio} ${mesInicioAbrev}/${anoAbrev} ${separador} ${diaFim} ${mesFimAbrev}/${anoFimAbrev}</th>`;
    }
    return `<th style="${headerBlue}">${meses[c.mes - 1]}/${anoAbrev}</th>`;
  }).join('');

  // Definição das linhas
  const linhasConfig = [
    { label: isTicket ? labels.ticketsContratados : labels.bancoContratado, isDark: true, values: calculos.map(c => fmtVal(c.baseline_horas, c.baseline_tickets)) },
    { label: labels.repasseMesAnterior, isDark: false, bg: '#e5e7eb', values: calculos.map(c => fmtVal(c.repasses_mes_anterior_horas, c.repasses_mes_anterior_tickets)), isColorized: true },
    { label: labels.saldoAUtilizar, isDark: false, bg: '#f9fafb', values: calculos.map(c => fmtVal(c.saldo_a_utilizar_horas, c.saldo_a_utilizar_tickets)), isColorized: true },
    { label: labels.consumoChamados, isDark: false, bg: '#ffffff', values: calculos.map(c => fmtVal(c.consumo_horas, c.consumo_tickets)) },
    { label: `${labels.requerimentos} <span style="color:#2563eb;">*</span>`, isDark: false, bg: '#ffffff', values: calculos.map(c => fmtVal(c.requerimentos_horas, c.requerimentos_tickets)) },
    { label: labels.reajuste, isDark: false, bg: '#ffffff', values: calculos.map(c => fmtVal(c.reajustes_horas, c.reajustes_tickets)) },
    { label: labels.consumoTotal, isDark: false, bg: '#f9fafb', values: calculos.map(c => fmtVal(c.consumo_total_horas, c.consumo_total_tickets, true)) },
    { label: labels.saldo, isDark: false, bg: '#f9fafb', values: calculos.map(c => fmtVal(c.saldo_horas, c.saldo_tickets)), isColorized: true },
    { label: `${labels.repasse} - ${percentualRepasse}%`, isDark: false, bg: '#f9fafb', values: calculos.map(c => fmtVal(c.repasse_horas, c.repasse_tickets)), isColorized: true },
  ];

  const linhasHtml = linhasConfig.map(linha => {
    if (linha.isDark) {
      const cells = linha.values.map(v => `<td style="${headerDark}">${v}</td>`).join('');
      return `<tr><td style="${headerDark}">${linha.label}</td>${cells}</tr>`;
    }
    const bgStyle = linha.bg ? `background:${linha.bg};` : '';
    const cells = linha.values.map(v => {
      let style = cellNormal;
      if (linha.isColorized) {
        if (v.startsWith('-')) style = cellRed;
        else if (v !== '00:00' && v !== '0') style = cellGreen;
        else style = cellNormal;
      }
      return `<td style="${style}">${v}</td>`;
    }).join('');
    return `<tr style="${bgStyle}"><td style="${cellBase}color:#111827;border-bottom:1px solid #e5e7eb;">${linha.label}</td>${cells}</tr>`;
  }).join('');

  // Usar o último cálculo do array para taxa e valor a faturar
  const calculoFim = calculos[calculos.length - 1];
  const taxaHora = isTicket 
    ? (calculoFim?.taxa_ticket_utilizada || calculos.find(c => c.taxa_ticket_utilizada)?.taxa_ticket_utilizada)
    : (calculoFim?.taxa_hora_utilizada || calculos.find(c => c.taxa_hora_utilizada)?.taxa_hora_utilizada);
  const valorFaturar = calculoFim?.valor_a_faturar || 0;
  const colSpanMeio = calculos.length > 1 ? calculos.length - 2 : 1;

  const linhaExcedente = `
    <tr>
      <td style="${headerDark}">${isTicket ? (isEnglish ? 'Surplus Rate/ticket' : 'Taxa/ticket Excedente') : labels.taxaHoraExcedente}</td>
      <td style="${headerDark}">${taxaHora && taxaHora > 0 ? formatarMoeda(taxaHora) : ''}</td>
      <td style="${headerDark}" colspan="${colSpanMeio}">${labels.valorTotal}</td>
      <td style="${headerDark}">${formatarMoeda(valorFaturar)}</td>
    </tr>
  `;

  return `
    <table style="width:100%;border-collapse:collapse;font-family:Calibri,sans-serif;overflow:hidden;">
      <thead>
        <tr>
          <th style="${headerDark}">${labels.periodo}</th>
          <th style="${headerDark}" colspan="${calculos.length}">${nomePeriodo}</th>
        </tr>
        <tr>
          <th style="${headerBlue}">${labels.mes}</th>
          ${headerMeses}
        </tr>
      </thead>
      <tbody>
        ${linhasHtml}
        ${linhaExcedente}
      </tbody>
    </table>
  `;
}

// ==================== Funções Auxiliares de Formatação ====================

/** Retorna o ordinal em inglês (1st, 2nd, 3rd, 4th, etc.) */
function getOrdinalEn(n: number): string {
  const suffixes = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0]);
}

/** Converte horas decimais (ex: 2.5) para formato HH:MM (ex: 02:30) */
function formatarHorasDecimal(decimal: number): string {
  const horas = Math.floor(Math.abs(decimal));
  const minutos = Math.round((Math.abs(decimal) % 1) * 60);
  const sinal = decimal < 0 ? '-' : '';
  return `${sinal}${String(horas).padStart(2, '0')}:${String(minutos).padStart(2, '0')}`;
}

/** Converte string HH:MM para decimal */
function converterParaHorasDecimal(valor: string | number): number {
  if (typeof valor === 'number') return valor;
  if (!valor || valor === '00:00') return 0;
  const negativo = valor.startsWith('-');
  const limpo = valor.replace('-', '');
  const partes = limpo.split(':');
  if (partes.length < 2) return 0;
  const horas = parseInt(partes[0], 10) || 0;
  const minutos = parseInt(partes[1], 10) || 0;
  const resultado = horas + (minutos / 60);
  return negativo ? -resultado : resultado;
}

// ==================== Tabela de Requerimentos ====================

/** Gera tabela HTML de Requerimentos do Período ou em Desenvolvimento */
export function gerarTabelaRequerimentos(
  requerimentos: Requerimento[],
  titulo: string,
  corHeader: string,
  isDesenvolvimento: boolean = false,
  isEnglish: boolean = false
): string {
  if (!requerimentos || requerimentos.length === 0) return '';

  let totalHorasDecimal = 0;
  requerimentos.forEach(req => {
    const hFunc = typeof req.horas_funcional === 'string' 
      ? converterParaHorasDecimal(req.horas_funcional) : (req.horas_funcional || 0);
    const hTec = typeof req.horas_tecnico === 'string'
      ? converterParaHorasDecimal(req.horas_tecnico) : (req.horas_tecnico || 0);
    totalHorasDecimal += hFunc + hTec;
  });
  const totalHoras = Math.floor(totalHorasDecimal);
  const totalMinutos = Math.round((totalHorasDecimal % 1) * 60);
  const totalFormatado = `${String(totalHoras).padStart(2, '0')}:${String(totalMinutos).padStart(2, '0')}`;

  const badgeTotalStyle = isDesenvolvimento 
    ? 'background:#fed7aa;color:#9a3412;padding:2px 8px;border-radius:8px;font-size:9px;font-weight:600;font-family:Inter,sans-serif;'
    : 'background:#dbeafe;color:#1e40af;padding:2px 8px;border-radius:8px;font-size:9px;font-weight:600;font-family:Inter,sans-serif;';

  const thStyle = 'padding:5px 6px;text-align:center;font-size:9px;font-family:Inter,sans-serif;color:#6b7280;font-weight:400;border-bottom:1px solid #e5e7eb;';
  const tdStyle = 'padding:6px 5px;text-align:center;font-size:10px;font-family:Inter,sans-serif;color:#111827;font-weight:400;border-bottom:1px solid #e5e7eb;';
  const tdBold = 'padding:6px 5px;text-align:center;font-size:10px;font-family:Inter,sans-serif;color:#111827;font-weight:700;border-bottom:1px solid #e5e7eb;';
  const tdGray = 'padding:6px 5px;text-align:center;font-size:9px;font-family:Inter,sans-serif;color:#6b7280;font-weight:400;border-bottom:1px solid #e5e7eb;';

  const linhas = requerimentos.map(req => {
    const hFunc = typeof req.horas_funcional === 'string' 
      ? converterParaHorasDecimal(req.horas_funcional) : (req.horas_funcional || 0);
    const hTec = typeof req.horas_tecnico === 'string'
      ? converterParaHorasDecimal(req.horas_tecnico) : (req.horas_tecnico || 0);
    const total = hFunc + hTec;
    
    const dataEnvio = req.data_envio ? new Date(req.data_envio).toLocaleDateString(isEnglish ? 'en-US' : 'pt-BR', { timeZone: 'UTC' }) : isDesenvolvimento ? (isEnglish ? 'Not sent' : 'Não enviado') : '-';
    const dataAprov = req.data_aprovacao ? new Date(req.data_aprovacao).toLocaleDateString(isEnglish ? 'en-US' : 'pt-BR', { timeZone: 'UTC' }) : '-';
    const periodo = req.mes_cobranca || '-';
    const tipoCobranca = req.tipo_cobranca || 'Banco de Horas';
    const valorTotal = req.valor_total_geral 
      ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(req.valor_total_geral) 
      : '-';

    return `
      <tr style="background:${isDesenvolvimento ? '#fffdfa' : '#ffffff'};">
        <td style="${tdStyle};white-space:nowrap;">
          <div style="font-weight:500;font-size:10px;color:#111827;white-space:nowrap;">🏛️ ${req.chamado || '-'}</div>
          <div style="margin-top:2px;"><span style="background:#3b82f6;color:#fff;padding:2px 6px;border-radius:6px;font-size:8px;font-family:Inter,sans-serif;display:inline-block;white-space:nowrap;">${tipoCobranca}</span></div>
        </td>
        <td style="${tdStyle};font-weight:600;white-space:nowrap;">${req.cliente_nome || '-'}</td>
        <td style="${tdStyle};white-space:nowrap;"><span style="border:1px solid ${isDesenvolvimento ? '#fdba74' : '#93c5fd'};color:${isDesenvolvimento ? '#ea580c' : '#2563eb'};padding:2px 5px;border-radius:6px;font-size:8px;font-family:Inter,sans-serif;white-space:nowrap;">${req.modulo || '-'}</span></td>
        <td style="${tdStyle}">${formatarHorasDecimal(hFunc)}</td>
        <td style="${tdStyle}">${formatarHorasDecimal(hTec)}</td>
        <td style="${isDesenvolvimento ? 'padding:6px 5px;text-align:center;font-size:10px;font-family:Inter,sans-serif;color:#ea580c;font-weight:700;border-bottom:1px solid #e5e7eb;' : tdBold}">${formatarHorasDecimal(total)}</td>
        <td style="${tdGray}">${isDesenvolvimento ? (req.data_envio ? dataEnvio : `<span style="display:inline-block;white-space:nowrap;background:#f3f4f6;color:#6b7280;padding:2px 6px;border-radius:8px;font-size:8px;line-height:1.4;font-family:Inter,sans-serif;">${isEnglish ? 'Not sent' : 'Não enviado'}</span>`) : dataEnvio}</td>
        <td style="${tdGray}">${isDesenvolvimento ? `<span style="display:inline-block;white-space:nowrap;background:#fed7aa;color:#9a3412;padding:2px 6px;border-radius:8px;font-size:8px;line-height:1.4;font-weight:600;font-family:Inter,sans-serif;">${isEnglish ? 'In development' : 'Em desenvolvimento'}</span>` : dataAprov}</td>
        <td style="${tdGray}">${valorTotal}</td>
        <td style="${tdGray}">${periodo}</td>
      </tr>
    `;
  }).join('');

  const tituloIcone = '📋';
  const asteriscoHtml = isDesenvolvimento 
    ? '<span style="display:inline-block;width:12px;height:12px;border-radius:50%;border:1px solid #ea580c;color:#ea580c;font-size:8px;text-align:center;line-height:11px;margin-left:3px;font-weight:700;">!</span>' 
    : '<span style="color:#2563eb;font-size:11px;margin-left:3px;">*</span>';

  return `
    <div style="margin-top:16px;">
      <table style="width:100%;margin-bottom:0;"><tr><td style="padding:0;border:none;font-family:Inter,sans-serif;">
        <span style="font-size:11px;">${tituloIcone}</span>
        <span style="font-size:11px;font-weight:600;color:#111827;font-family:Inter,sans-serif;margin-left:4px;">${titulo}</span>
        ${asteriscoHtml}
        <span style="${badgeTotalStyle};margin-left:6px;">${totalFormatado}</span>
      </td></tr></table>
      <table style="width:100%;border-collapse:collapse;font-family:Inter,sans-serif;margin-top:8px;">
        <thead>
          <tr${isDesenvolvimento ? ' style="background:#fff7ed;"' : ''}>
            <th style="${thStyle}">${isEnglish ? 'Ticket' : 'Chamado'}</th>
            <th style="${thStyle}">${isEnglish ? 'Client' : 'Cliente'}</th>
            <th style="${thStyle}">${isEnglish ? 'Module' : 'Módulo'}</th>
            <th style="${thStyle}">${isEnglish ? 'Func.H' : 'H.Func'}</th>
            <th style="${thStyle}">${isEnglish ? 'Tech.H' : 'H.Téc'}</th>
            <th style="${thStyle}">${isEnglish ? 'Total' : 'Total'}</th>
            <th style="${thStyle}">${isEnglish ? 'Sent Date' : 'Data Envio'}</th>
            <th style="${thStyle}">${isDesenvolvimento ? 'Status' : (isEnglish ? 'Approval Date' : 'Data Aprovação')}</th>
            <th style="${thStyle}">${isEnglish ? 'Total Amount' : 'Valor Total'}</th>
            <th style="${thStyle}">${isEnglish ? 'Period' : 'Período'}</th>
          </tr>
        </thead>
        <tbody>
          ${linhas}
        </tbody>
      </table>
    </div>
  `;
}

// ==================== Seção de Excedentes ====================

interface ExcedenteInfo {
  horasExcedentes: string;
  valorHoraExcedente: number;
  valorTotalExcedentes: number;
}

/**
 * Gera seção HTML de Excedentes quando há horas excedentes no período.
 * Exibe no formato padrão do email de saldo mensal:
 * - Horas Excedentes: HH:MM
 * - Valor Hora Excedentes: R$ X,XX
 * - Valor total dos Excedentes: R$ X,XX
 */
export function gerarSecaoExcedentes(info: ExcedenteInfo | null, isEnglish: boolean = false): string {
  if (!info) return '';

  // Não exibir o quadro se o valor total dos excedentes for zero ou inexistente
  if (!info.valorTotalExcedentes || info.valorTotalExcedentes === 0) return '';

  const formatarMoeda = (valor: number) => {
    if (!valor || valor === 0) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
  };

  const labelHorasExcedentes = isEnglish ? 'Surplus Hours' : 'Horas Excedentes';
  const labelValorHora = isEnglish ? 'Surplus Rate/Hour' : 'Valor Hora Excedentes';
  const labelValorTotal = isEnglish ? 'Total Surplus Amount' : 'Valor total dos Excedentes';
  const textoAguardo = isEnglish
    ? 'We await the PO or your approval to proceed with billing.'
    : 'Ficamos no aguardo da PO ou o "de acordo" para seguir com o faturamento.';

  return `
    <div style="margin-top:16px;padding:12px 16px;background:#fefce8;border:1px solid #fde68a;border-radius:8px;font-family:Inter,sans-serif;">
      <p style="margin:0 0 6px 0;font-size:11px;font-weight:700;color:#92400e;">
        ${labelHorasExcedentes}: ${info.horasExcedentes}
      </p>
      <p style="margin:0 0 6px 0;font-size:11px;font-weight:700;color:#92400e;">
        ${labelValorHora}: ${formatarMoeda(info.valorHoraExcedente)}
      </p>
      <p style="margin:0 0 8px 0;font-size:11px;font-weight:700;color:#92400e;">
        ${labelValorTotal}: ${formatarMoeda(info.valorTotalExcedentes)}
      </p>
      <p style="margin:0;font-size:11px;font-weight:700;color:#475569;">
        ${textoAguardo}
      </p>
    </div>
  `;
}

// ==================== Seção de Observações ====================

/** Gera seção HTML de Observações do período */
export function gerarSecaoObservacoes(observacoes: Observacao[], isEnglish: boolean = false): string {
  if (!observacoes || observacoes.length === 0) return '';

  const meses = isEnglish ? MESES_EN : MESES_PT;
  const thStyle = 'padding:5px 6px;text-align:center;font-size:9px;font-family:Inter,sans-serif;color:#6b7280;font-weight:400;border-bottom:1px solid #e5e7eb;';
  const tdStyle = 'padding:6px 5px;text-align:center;font-size:10px;font-family:Inter,sans-serif;color:#111827;font-weight:400;border-bottom:1px solid #e5e7eb;';
  const tdGray = 'padding:6px 5px;text-align:center;font-size:9px;font-family:Inter,sans-serif;color:#6b7280;font-weight:400;border-bottom:1px solid #e5e7eb;';

  const linhas = observacoes.map(obs => {
    const periodo = obs.mes && obs.ano ? `${meses[(obs.mes || 1) - 1]}/${obs.ano}` : '-';
    const data = obs.created_at ? new Date(obs.created_at).toLocaleString(isEnglish ? 'en-US' : 'pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).replace(',', isEnglish ? ' at' : ' às') : '-';
    const usuario = obs.usuario_nome || '-';
    
    let tipoBadge = '';
    if (obs.tipo === 'manual') {
      tipoBadge = `<span style="background:#dbeafe;color:#1e40af;padding:2px 6px;border-radius:6px;font-size:8px;font-family:Inter,sans-serif;">${isEnglish ? 'Manual' : 'Manual'}</span>`;
    } else {
      tipoBadge = `<span style="background:#dcfce7;color:#166534;padding:2px 6px;border-radius:6px;font-size:8px;font-family:Inter,sans-serif;">${isEnglish ? 'Adjustment' : 'Ajuste'}</span>`;
      if (obs.valor_horas && obs.valor_horas !== '00:00') {
        tipoBadge += `<br/><span style="background:#dbeafe;color:#1e40af;padding:2px 4px;border-radius:5px;font-size:7px;font-family:Inter,sans-serif;margin-top:2px;display:inline-block;">🕐 ${obs.tipo_ajuste === 'entrada' ? '+' : '-'}${obs.valor_horas}</span>`;
      }
    }

    return `
      <tr>
        <td style="${tdStyle}">${tipoBadge}</td>
        <td style="${tdStyle};font-weight:500;">${periodo}</td>
        <td style="${tdStyle}">${obs.texto}</td>
        <td style="${tdGray}">${usuario}</td>
        <td style="${tdGray}">${data}</td>
      </tr>
    `;
  }).join('');

  return `
    <div style="margin-top:16px;">
      <table style="width:100%;margin-bottom:0;"><tr><td style="padding:0;border:none;font-family:Inter,sans-serif;">
        <span style="font-size:11px;">💬</span>
        <span style="font-size:11px;font-weight:600;color:#111827;font-family:Inter,sans-serif;margin-left:4px;">${isEnglish ? 'Notes' : 'Observações'}</span>
      </td></tr></table>
      <table style="width:100%;border-collapse:collapse;font-family:Inter,sans-serif;margin-top:3px;">
        <thead>
          <tr>
            <th style="${thStyle}">${isEnglish ? 'Type' : 'Tipo'}</th>
            <th style="${thStyle}">${isEnglish ? 'Period' : 'Período'}</th>
            <th style="${thStyle}">${isEnglish ? 'Note' : 'Observação'}</th>
            <th style="${thStyle}">${isEnglish ? 'User' : 'Usuário'}</th>
            <th style="${thStyle}">${isEnglish ? 'Date' : 'Data'}</th>
          </tr>
        </thead>
        <tbody>
          ${linhas}
        </tbody>
      </table>
    </div>
  `;
}

// ==================== Geração de Imagem do Banco de Horas ====================

/**
 * Parâmetros para buscar dados do banco de horas de uma empresa
 */
export interface BancoHorasImagemParams {
  empresaId: string;
  empresaNome: string;
  mes: number;
  ano: number;
  /** Se true, gera a tabela em inglês. Se omitido, detecta automaticamente pelo template_padrao da empresa. */
  isEnglish?: boolean;
}

/**
 * Resultado da geração de imagem do banco de horas
 */
export interface BancoHorasImagemResult {
  sucesso: boolean;
  imagemUrl?: string;
  largura?: number;
  erro?: string;
}

/**
 * Busca os dados do banco de horas de uma empresa para o período do trimestre
 * e gera a tabela HTML correspondente.
 * 
 * Retorna o HTML da tabela pronto para ser renderizado como imagem.
 */
export async function buscarDadosEGerarTabelaBancoHoras(
  empresaId: string,
  mes: number,
  ano: number,
  isEnglish: boolean = false
): Promise<{ html: string; calculos: BancoHorasCalculo[] } | null> {
  try {
    // Buscar dados da empresa para obter tipo_cobranca, periodo_apuracao, percentual_repasse
    const { data: empresa, error: empresaError } = await supabase
      .from('empresas_clientes')
      .select('tipo_cobranca, periodo_apuracao, percentual_repasse_mensal, dia_inicio_apuracao, dia_fim_apuracao, inicio_vigencia')
      .eq('id', empresaId)
      .single();

    if (empresaError || !empresa) {
      console.warn(`⚠️ Empresa ${empresaId} não encontrada para gerar tabela banco de horas`);
      return null;
    }

    const tipoCobranca = (empresa as any).tipo_cobranca || 'horas';
    const periodoApuracao = (empresa as any).periodo_apuracao || 3;
    const percentualRepasse = (empresa as any).percentual_repasse_mensal || 100;
    const diaInicioApuracao = (empresa as any).dia_inicio_apuracao || 1;
    const diaFimApuracao = (empresa as any).dia_fim_apuracao || 0;
    const inicioVigencia = (empresa as any).inicio_vigencia;

    // O mês de referência do book é o mês anterior ao mês de disparo
    const mesReferencia = mes === 1 ? 12 : mes - 1;
    const anoReferencia = mes === 1 ? ano - 1 : ano;

    // Calcular os meses do período usando a MESMA lógica da tela de banco de horas:
    // O período é alinhado ao inicio_vigencia da empresa
    const mesesParaBuscar: { mes: number; ano: number }[] = [];

    if (inicioVigencia && periodoApuracao) {
      // Lógica alinhada com a tela de banco de horas (ControleBancoHoras.tsx)
      const dataVigencia = new Date(inicioVigencia);
      const mesInicio = dataVigencia.getUTCMonth() + 1;
      const anoInicio = dataVigencia.getUTCFullYear();

      // Calcular quantos meses se passaram desde o início da vigência até o mês de referência
      const mesesPassados = ((anoReferencia - anoInicio) * 12) + (mesReferencia - mesInicio);

      // Calcular o início do período que contém o mês de referência
      const periodosCompletos = Math.floor(mesesPassados / periodoApuracao);
      const mesesAteInicioPeriodo = periodosCompletos * periodoApuracao;

      // Calcular o primeiro mês do período
      let mesInicioPeriodo = mesInicio + mesesAteInicioPeriodo;
      let anoInicioPeriodo = anoInicio;

      while (mesInicioPeriodo > 12) {
        mesInicioPeriodo -= 12;
        anoInicioPeriodo += 1;
      }

      // Gerar array com todos os meses do período
      for (let i = 0; i < periodoApuracao; i++) {
        let m = mesInicioPeriodo + i;
        let a = anoInicioPeriodo;

        while (m > 12) {
          m -= 12;
          a += 1;
        }

        mesesParaBuscar.push({ mes: m, ano: a });
      }
    } else {
      // Fallback: últimos periodoApuracao meses a partir do mês de referência
      for (let i = periodoApuracao - 1; i >= 0; i--) {
        let m = mesReferencia - i;
        let a = anoReferencia;
        if (m <= 0) {
          m += 12;
          a -= 1;
        }
        mesesParaBuscar.push({ mes: m, ano: a });
      }
    }

    // Buscar cálculos do banco de horas apenas para meses com dados reais.
    // Meses futuros (sem registro em banco_horas_calculos) são simplesmente ignorados —
    // a tabela do email exibe apenas o que foi efetivamente calculado.
    const calculos: BancoHorasCalculo[] = [];

    for (const periodo of mesesParaBuscar) {
      const { data: calculo, error: calculoError } = await supabase
        .from('banco_horas_calculos')
        .select('*')
        .eq('empresa_id', empresaId)
        .eq('mes', periodo.mes)
        .eq('ano', periodo.ano)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!calculoError && calculo) {
        calculos.push(calculo as unknown as BancoHorasCalculo);
      } else {
        console.log(`ℹ️ Sem dados para ${periodo.mes}/${periodo.ano} — coluna omitida da tabela`);
      }
    }

    // Zerar campos de consumo, requerimentos e reajuste para meses POSTERIORES ao
    // mês de referência do book (mesReferencia). Esses meses ainda não foram fechados,
    // então seus valores são provisórios e não devem aparecer no email.
    for (let i = 0; i < calculos.length; i++) {
      const c = calculos[i];
      const isFuturo = (c.ano > anoReferencia) || (c.ano === anoReferencia && c.mes > mesReferencia);
      if (isFuturo) {
        console.log(`ℹ️ Zerando consumo/req/reajuste do mês ${c.mes}/${c.ano} (posterior ao mês de referência ${mesReferencia}/${anoReferencia})`);
        calculos[i] = {
          ...c,
          consumo_horas: '00:00',
          consumo_tickets: 0,
          requerimentos_horas: '00:00',
          requerimentos_tickets: 0,
          reajustes_horas: '00:00',
          reajustes_tickets: 0,
          consumo_total_horas: '00:00',
          consumo_total_tickets: 0,
          saldo_horas: c.saldo_a_utilizar_horas || c.baseline_horas || '00:00',
          saldo_tickets: c.saldo_a_utilizar_tickets || c.baseline_tickets || 0,
          repasse_horas: c.saldo_a_utilizar_horas || c.baseline_horas || '00:00',
          repasse_tickets: c.saldo_a_utilizar_tickets || c.baseline_tickets || 0,
          excedentes_horas: '00:00',
          excedentes_tickets: 0,
          valor_excedentes_horas: 0,
          valor_excedentes_tickets: 0,
          valor_a_faturar: 0,
        };
      }
    }

    if (calculos.length === 0) {
      console.log(`ℹ️ Nenhum dado de banco de horas encontrado para empresa ${empresaId} no período`);
      return null;
    }

    // Gerar o nome do período usando a mesma lógica da tela
    let nomePeriodo: string;
    if (inicioVigencia && periodoApuracao) {
      const dataVigencia = new Date(inicioVigencia);
      const mesInicioVig = dataVigencia.getUTCMonth() + 1;
      const anoInicioVig = dataVigencia.getUTCFullYear();
      const mesesPassados = ((anoReferencia - anoInicioVig) * 12) + (mesReferencia - mesInicioVig);
      const periodosCompletos = Math.floor(mesesPassados / periodoApuracao);
      const periodosNoAno = Math.floor(12 / periodoApuracao);
      const periodoNoAno = (periodosCompletos % periodosNoAno) + 1;
      
      if (periodoApuracao === 1) {
        nomePeriodo = isEnglish ? 'Monthly' : 'Mensal';
      } else if (periodoApuracao === 3) {
        nomePeriodo = isEnglish ? `${getOrdinalEn(periodoNoAno)} Quarter` : `${periodoNoAno}º Trimestre`;
      } else if (periodoApuracao === 6) {
        nomePeriodo = isEnglish ? `${getOrdinalEn(periodoNoAno)} Semester` : `${periodoNoAno}º Semestre`;
      } else if (periodoApuracao === 12) {
        nomePeriodo = isEnglish ? 'Annual' : 'Anual';
      } else {
        nomePeriodo = isEnglish ? `${getOrdinalEn(periodoNoAno)} Period (${periodoApuracao} months)` : `${periodoNoAno}º Período (${periodoApuracao} meses)`;
      }
    } else {
      const trimestre = Math.ceil(mesReferencia / 3);
      nomePeriodo = isEnglish ? `${getOrdinalEn(trimestre)} Quarter` : `${trimestre}º Trimestre`;
    }

    // Gerar tabela HTML principal do banco de horas
    const tabelaBancoHoras = gerarTabelaBancoHoras(
      calculos,
      tipoCobranca,
      percentualRepasse,
      nomePeriodo,
      diaInicioApuracao,
      diaFimApuracao,
      isEnglish
    );

    // Buscar requerimentos do período (mesmo comportamento do email Saldo do Mês)
    const mesRef = mesesParaBuscar[mesesParaBuscar.length - 1]; // Último mês do período
    const mesCobranca = `${String(mesRef.mes).padStart(2, '0')}/${mesRef.ano}`;
    
    // Buscar nome abreviado da empresa
    const { data: empresaNomeData } = await supabase
      .from('empresas_clientes')
      .select('nome_abreviado, nome_completo')
      .eq('id', empresaId)
      .single();
    const empresaNome = (empresaNomeData as any)?.nome_abreviado || (empresaNomeData as any)?.nome_completo || '';

    // Requerimentos do período (aprovados/faturados)
    const { data: requerimentosData } = await supabase
      .from('requerimentos')
      .select('*')
      .eq('cliente_id', empresaId)
      .eq('mes_cobranca', mesCobranca)
      .in('status', ['enviado_faturamento', 'faturado', 'concluido']);

    // Requerimentos em desenvolvimento
    const { data: requerimentosDesenvData } = await supabase
      .from('requerimentos')
      .select('*')
      .eq('cliente_id', empresaId)
      .eq('mes_cobranca', mesCobranca)
      .eq('status', 'em_desenvolvimento');

    // Formatar requerimentos
    const requerimentos: Requerimento[] = (requerimentosData || []).map((req: any) => ({
      chamado: req.chamado,
      cliente_nome: empresaNome,
      modulo: req.modulo,
      horas_funcional: req.horas_funcional,
      horas_tecnico: req.horas_tecnico,
      tipo_cobranca: req.tipo_cobranca,
      data_envio: req.data_envio,
      data_aprovacao: req.data_aprovacao,
      mes_cobranca: req.mes_cobranca,
      valor_total_geral: req.valor_total_geral,
      status: req.status
    }));

    const requerimentosDesenv: Requerimento[] = (requerimentosDesenvData || []).map((req: any) => ({
      chamado: req.chamado,
      cliente_nome: empresaNome,
      modulo: req.modulo,
      horas_funcional: req.horas_funcional,
      horas_tecnico: req.horas_tecnico,
      tipo_cobranca: req.tipo_cobranca,
      data_envio: req.data_envio,
      data_aprovacao: req.data_aprovacao,
      mes_cobranca: req.mes_cobranca,
      valor_total_geral: req.valor_total_geral,
      status: req.status
    }));

    // Buscar observações manuais de TODOS os meses do período (não apenas o último)
    const observacoesManuaisAll: any[] = [];
    for (const periodo of mesesParaBuscar) {
      const { data: obsData } = await (supabase
        .from('banco_horas_observacoes' as any)
        .select('*')
        .eq('empresa_id', empresaId)
        .eq('mes', periodo.mes)
        .eq('ano', periodo.ano)
        .order('created_at', { ascending: false }) as any);
      if (obsData) observacoesManuaisAll.push(...obsData);
    }
    const observacoesManuais = observacoesManuaisAll;

    // Buscar reajustes com observações de TODOS os meses do período
    const reajustesAll: any[] = [];
    for (const periodo of mesesParaBuscar) {
      const { data: reaData } = await (supabase
        .from('banco_horas_reajustes' as any)
        .select('id, mes, ano, observacao, tipo_reajuste, valor_reajuste_horas, valor_reajuste_tickets, created_by, created_at')
        .eq('empresa_id', empresaId)
        .eq('mes', periodo.mes)
        .eq('ano', periodo.ano)
        .eq('ativo', true)
        .not('observacao', 'is', null)
        .neq('observacao', '')
        .order('created_at', { ascending: false }) as any);
      if (reaData) reajustesAll.push(...reaData);
    }
    const reajustesData = reajustesAll;

    // Buscar nomes dos usuários das observações
    const allObs = [...(observacoesManuais || []), ...(reajustesData || [])];
    const userIds = [...new Set(allObs.map((o: any) => o.created_by).filter(Boolean))];
    let profilesMap = new Map<string, any>();
    if (userIds.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', userIds);
      profilesMap = new Map((profiles || []).map((p: any) => [p.id, p]));
    }

    // Formatar observações (apenas manuais - tipo "ajuste" é desconsiderado no book)
    const observacoes: Observacao[] = [
      ...(observacoesManuais || []).map((obs: any) => ({
        tipo: 'manual',
        mes: obs.mes,
        ano: obs.ano,
        texto: obs.observacao || '',
        usuario_nome: profilesMap.get(obs.created_by)?.full_name || '',
        created_at: obs.created_at || '',
        tipo_ajuste: '',
        valor_horas: '',
      })),
    ];

    // Gerar HTML das tabelas de requerimentos e observações
    const tabelaReqPeriodo = gerarTabelaRequerimentos(requerimentos, isEnglish ? 'Period Requirements' : 'Requerimentos do Período', '#2563eb', false, isEnglish);
    const tabelaReqDesenv = gerarTabelaRequerimentos(requerimentosDesenv, isEnglish ? 'Requirements in Development' : 'Requerimentos em Desenvolvimento', '#ea580c', true, isEnglish);
    const secaoObs = gerarSecaoObservacoes(observacoes, isEnglish);

    // Determinar o cálculo de fim de período para exibição de excedentes
    const calculoFimPeriodo = calculos[calculos.length - 1];
    const isTicketMode = tipoCobranca?.toLowerCase() === 'ticket' || tipoCobranca?.toLowerCase() === 'tickets';
    
    // Verificar se o mês de referência é o último mês do período de apuração.
    // O quadro de excedentes só é exibido no último mês do período (ex: no 3º mês de um trimestre).
    const ultimoMesPeriodo = mesesParaBuscar[mesesParaBuscar.length - 1];
    const isUltimoMesDoPeriodo = ultimoMesPeriodo 
      ? (mesReferencia === ultimoMesPeriodo.mes && anoReferencia === ultimoMesPeriodo.ano)
      : true; // Fallback: se não conseguir determinar, exibe normalmente
    
    let secaoExcedentes = '';
    if (calculoFimPeriodo && isUltimoMesDoPeriodo) {
      const temExcedente = isTicketMode
        ? (calculoFimPeriodo.excedentes_tickets && calculoFimPeriodo.excedentes_tickets > 0)
        : (calculoFimPeriodo.excedentes_horas && calculoFimPeriodo.excedentes_horas !== '00:00' && calculoFimPeriodo.excedentes_horas !== '0:00');

      if (temExcedente) {
        const horasExcedentes = isTicketMode
          ? String(calculoFimPeriodo.excedentes_tickets || 0)
          : (calculoFimPeriodo.excedentes_horas || '00:00');
        const valorHora = isTicketMode
          ? (calculoFimPeriodo.taxa_ticket_utilizada || 0)
          : (calculoFimPeriodo.taxa_hora_utilizada || 0);
        const valorTotal = calculoFimPeriodo.valor_a_faturar || 0;

        // Só exibe o quadro de excedentes se o valor total a faturar for maior que zero
        if (valorTotal > 0) {
          secaoExcedentes = gerarSecaoExcedentes({
            horasExcedentes,
            valorHoraExcedente: valorHora,
            valorTotalExcedentes: valorTotal,
          }, isEnglish);
        }
      }
    }

    // Montar HTML completo (tabela banco + excedentes + requerimentos do período + observações)
    // Nota: Requerimentos em Desenvolvimento NÃO são incluídos no email
    const html = `${tabelaBancoHoras}${secaoExcedentes}${tabelaReqPeriodo}${secaoObs}`;

    return { html, calculos };
  } catch (error) {
    console.error(`❌ Erro ao buscar dados do banco de horas para empresa ${empresaId}:`, error);
    return null;
  }
}

/**
 * Gera imagem PNG da tabela do banco de horas via /api/email/render-image
 * e faz upload no Supabase Storage.
 * 
 * Retorna a URL pública da imagem ou null em caso de erro.
 * 
 * IMPORTANTE: Esta função só deve ser chamada se o template usar {{bancoHoras.imagemUrl}}.
 */
export async function gerarImagemBancoHoras(
  params: BancoHorasImagemParams
): Promise<BancoHorasImagemResult> {
  try {
    console.log(`📊 Gerando imagem do banco de horas para ${params.empresaNome}...`);

    // Detectar idioma: usar isEnglish do params ou buscar template_padrao da empresa
    let isEnglish = params.isEnglish ?? false;
    if (params.isEnglish === undefined) {
      // Buscar template_padrao da empresa para detectar idioma
      const { data: empresaTemplate } = await supabase
        .from('empresas_clientes')
        .select('template_padrao')
        .eq('id', params.empresaId)
        .single();
      
      if (empresaTemplate) {
        const templatePadrao = (empresaTemplate as any).template_padrao;
        if (templatePadrao) {
          // Buscar nome do template na tabela email_templates
          const { data: templateData } = await supabase
            .from('email_templates')
            .select('nome')
            .eq('id', templatePadrao)
            .single();
          
          if (templateData) {
            isEnglish = isEnglishTemplateByName((templateData as any).nome);
            console.log(`🌐 [gerarImagemBancoHoras] Template: ${(templateData as any).nome}, isEnglish: ${isEnglish}`);
          }
        }
      }
    }

    // 1. Buscar dados e gerar tabela HTML
    const resultado = await buscarDadosEGerarTabelaBancoHoras(
      params.empresaId,
      params.mes,
      params.ano,
      isEnglish
    );

    if (!resultado) {
      return {
        sucesso: false,
        erro: 'Nenhum dado de banco de horas encontrado para o período'
      };
    }

    // 2. Calcular largura ideal baseado no número de meses/colunas visíveis por tabela
    // Com a divisão automática em tabelas de 4 meses para >6 meses, max 4 colunas por tabela
    const numColunas = Math.min(resultado.calculos.length, 4); // máximo 4 por tabela após split
    let viewportWidth = 600; // padrão para até 3 meses
    if (numColunas >= 4) {
      viewportWidth = 700;
    }

    // Preparar HTML completo para renderização
    const htmlParaRenderizar = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          * { box-sizing: border-box; }
          html, body { margin: 0; padding: 0; background: #ffffff; }
        </style>
      </head>
      <body>
        <div style="font-family:Calibri,sans-serif;max-width:${viewportWidth}px;width:${viewportWidth}px;margin:0;padding:6px;background:#ffffff;color:#1F497D;font-size:7pt;">
          ${resultado.html}
        </div>
      </body>
      </html>
    `;

    // 3. Chamar endpoint de renderização de imagem
    const response = await fetch('/api/email/render-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ html: htmlParaRenderizar, width: viewportWidth })
    });

    if (!response.ok) {
      console.warn(`⚠️ Falha ao renderizar imagem do banco de horas (HTTP ${response.status})`);
      return {
        sucesso: false,
        erro: `Falha na renderização (HTTP ${response.status})`
      };
    }

    const data = await response.json();

    if (!data.success || !data.image) {
      return {
        sucesso: false,
        erro: 'Resposta inválida do serviço de renderização'
      };
    }

    // 4. Upload da imagem para Supabase Storage
    const byteCharacters = atob(data.image);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: 'image/png' });

    const fileName = `banco-horas-book-${params.empresaNome.replace(/[^a-zA-Z0-9-]/g, '-')}-${params.mes}-${params.ano}-${Date.now()}.png`;

    const { error: uploadError } = await supabase.storage
      .from('email-images')
      .upload(fileName, blob, {
        contentType: 'image/png',
        upsert: false
      });

    if (uploadError) {
      console.warn(`⚠️ Erro ao fazer upload da imagem do banco de horas: ${uploadError.message}`);
      return {
        sucesso: false,
        erro: `Upload falhou: ${uploadError.message}`
      };
    }

    // 5. Obter URL pública
    const { data: urlData } = supabase.storage
      .from('email-images')
      .getPublicUrl(fileName);

    if (!urlData?.publicUrl) {
      return {
        sucesso: false,
        erro: 'Não foi possível obter URL pública da imagem'
      };
    }

    console.log(`✅ Imagem do banco de horas gerada: ${urlData.publicUrl}`);

    return {
      sucesso: true,
      imagemUrl: urlData.publicUrl,
      largura: data.width || viewportWidth
    };
  } catch (error) {
    console.error(`❌ Erro ao gerar imagem do banco de horas:`, error);
    return {
      sucesso: false,
      erro: error instanceof Error ? error.message : 'Erro desconhecido'
    };
  }
}
