/**
 * BotaoEnviarEmailBancoHoras Component
 * 
 * Botão com dropdown para enviar email com dados da Visão Consolidada.
 * Oferece duas opções: "Saldo Parcial" e "Saldo do Mês".
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Send, Mail, FileText, ChevronDown, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { emailService } from '@/services/emailService';
import type { BancoHorasCalculo } from '@/types/bancoHoras';
import type { Requerimento } from '@/types/requerimentos';
import { converterParaHorasDecimal } from '@/utils/horasUtils';
import { gerarExcelConsumoHoras } from '@/utils/gerarExcelConsumoHoras';

export type TipoEmailBancoHoras = 'saldo_parcial' | 'saldo_mes';

interface Observacao {
  texto: string;
  tipo: string;
  tipo_ajuste?: string;
  valor_horas?: string;
  valor_tickets?: number;
  mes?: number;
  ano?: number;
  usuario_nome?: string;
  created_at?: string;
}

interface BotaoEnviarEmailBancoHorasProps {
  calculos: BancoHorasCalculo[];
  empresaId?: string;
  empresaNome?: string;
  tipoCobranca?: string;
  periodoApuracao: number;
  mesAno: { mes: number; ano: number };
  percentualRepasse?: number;
  nomePeriodo?: string;
  taxaHoraExcedente?: number;
  horasExcedentes?: string;
  valorExcedentes?: number;
  requerimentos?: Requerimento[];
  requerimentosEmDesenvolvimento?: Requerimento[];
  observacoes?: Observacao[];
  disabled?: boolean;
  diaInicioApuracao?: number;
  diaFimApuracao?: number;
}

const MESES_PT = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

/** Assinatura padrão do email - imagem única */
const ASSINATURA_HTML = `
<div style="margin-top:24px;">
  <img src="https://books-sonda.vercel.app/images/qualidade/assinatura.png" alt="Sonda - Qualidade - Soluções de Negócio" width="500" style="display:block;width:500px;max-width:100%;height:auto;border:0;outline:none;text-decoration:none;" />
</div>
`;

/** Retorna saudação baseada no horário */
function getSaudacao(): string {
  const hora = new Date().getHours();
  if (hora < 12) return 'Bom dia!';
  if (hora < 18) return 'Boa tarde!';
  return 'Boa noite!';
}

/** Formata horas decimais para HH:MM */
function formatarHorasDecimal(decimal: number): string {
  const horas = Math.floor(Math.abs(decimal));
  const minutos = Math.round((Math.abs(decimal) % 1) * 60);
  const sinal = decimal < 0 ? '-' : '';
  return `${sinal}${String(horas).padStart(2, '0')}:${String(minutos).padStart(2, '0')}`;
}

/** Gera a tabela principal do Banco de Horas (mesma estrutura da tela) */
function gerarTabelaBancoHoras(
  calculos: BancoHorasCalculo[],
  tipoCobranca: string,
  percentualRepasse: number,
  nomePeriodo: string,
  diaInicioApuracao?: number,
  diaFimApuracao?: number
): string {
  const isTicket = tipoCobranca?.toLowerCase() === 'ticket' || tipoCobranca?.toLowerCase() === 'tickets';
  
  const fmtVal = (horas: string | null | undefined, tickets: number | null | undefined, removerNegativo: boolean = false) => {
    if (isTicket) {
      const val = tickets || 0;
      return removerNegativo ? `${Math.abs(val)}` : `${val}`;
    }
    // Remover segundos se formato HH:MM:SS e garantir zero à esquerda nos minutos
    let h = horas || '00:00';
    const partes = h.split(':');
    if (partes.length >= 2) {
      // Garante que os minutos sempre tenham 2 dígitos (ex: "101:3" → "101:30" não, mas "101:3" → "101:03")
      // IMPORTANTE: padStart garante o zero à esquerda quando há apenas 1 dígito
      h = `${partes[0]}:${partes[1].padStart(2, '0')}`;
    }
    // Remover sinal negativo se solicitado
    if (removerNegativo) h = h.replace('-', '');
    return h;
  };

  const formatarMoeda = (valor: number | null | undefined) => {
    if (!valor || valor === 0) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(valor);
  };

  // Estilos base - fonte Inter, peso 600 (semi-bold), tamanho 10pt
  const cellBase = 'padding:10px 16px;text-align:center;font-size:10pt;font-family:Inter,sans-serif;border:none;font-weight:600;';
  const headerDark = `padding:10px 16px;text-align:center;font-size:10pt;font-family:Inter,sans-serif;border:none;font-weight:600;color:#fff;background:#374151;`;
  const headerBlue = `padding:10px 16px;text-align:center;font-size:10pt;font-family:Inter,sans-serif;border:none;font-weight:600;color:#fff;background:#2563eb;`;
  const cellNormal = `${cellBase}color:#111827;border-bottom:1px solid #e5e7eb;`;
  const cellGreen = `${cellBase}color:#16a34a;border-bottom:1px solid #e5e7eb;`;
  const cellRed = `${cellBase}color:#dc2626;border-bottom:1px solid #e5e7eb;`;

  const headerMeses = calculos.map(c => {
    const anoAbrev = String(c.ano).slice(-2);
    const diaInicio = diaInicioApuracao ?? 1;
    const diaFim = diaFimApuracao ?? 0;
    const temApuracaoCustomizada = diaInicio !== 1 && diaFim !== 0;
    
    if (temApuracaoCustomizada) {
      // Formato: "16-Mai/26 à 15-Jun/26"
      const mesInicio = c.mes;
      let mesFim = mesInicio + 1;
      let anoFim = c.ano;
      if (mesFim > 12) {
        mesFim = 1;
        anoFim += 1;
      }
      const anoFimAbrev = String(anoFim).slice(-2);
      const mesInicioAbrev = MESES_PT[mesInicio - 1].substring(0, 3);
      const mesFimAbrev = MESES_PT[mesFim - 1].substring(0, 3);
      return `<th style="${headerBlue}">${diaInicio} ${mesInicioAbrev}/${anoAbrev} à ${diaFim} ${mesFimAbrev}/${anoFimAbrev}</th>`;
    }
    return `<th style="${headerBlue}">${MESES_PT[c.mes - 1]}/${anoAbrev}</th>`;
  }).join('');

  // Definição das linhas
  const linhasConfig = [
    { label: isTicket ? 'Tickets Contratados' : 'Banco Contratado', isDark: true, values: calculos.map(c => fmtVal(c.baseline_horas, c.baseline_tickets)) },
    { label: 'Repasse mês anterior', isDark: false, bg: '#e5e7eb', values: calculos.map(c => fmtVal(c.repasses_mes_anterior_horas, c.repasses_mes_anterior_tickets)), isColorized: true },
    { label: 'Saldo a utilizar', isDark: false, bg: '#f9fafb', values: calculos.map(c => fmtVal(c.saldo_a_utilizar_horas, c.saldo_a_utilizar_tickets)), isColorized: true },
    { label: 'Consumo Chamados', isDark: false, bg: '#ffffff', values: calculos.map(c => fmtVal(c.consumo_horas, c.consumo_tickets)) },
    { label: 'Requerimentos <span style="color:#2563eb;">*</span>', isDark: false, bg: '#ffffff', values: calculos.map(c => fmtVal(c.requerimentos_horas, c.requerimentos_tickets)) },
    { label: 'Reajuste', isDark: false, bg: '#ffffff', values: calculos.map(c => fmtVal(c.reajustes_horas, c.reajustes_tickets)) },
    { label: 'Consumo Total', isDark: false, bg: '#f9fafb', values: calculos.map(c => fmtVal(c.consumo_total_horas, c.consumo_total_tickets, true)) },
    { label: 'Saldo', isDark: false, bg: '#f9fafb', values: calculos.map(c => fmtVal(c.saldo_horas, c.saldo_tickets)), isColorized: true },
    { label: `Repasse - ${percentualRepasse}%`, isDark: false, bg: '#f9fafb', values: calculos.map(c => fmtVal(c.repasse_horas, c.repasse_tickets)), isColorized: true },
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

  // Linha de Excedente/Taxa/Valor Total (última linha cinza escuro)
  const calculoFim = calculos[calculos.length - 1];
  const taxaHora = isTicket 
    ? (calculoFim?.taxa_ticket_utilizada || calculos.find(c => c.taxa_ticket_utilizada)?.taxa_ticket_utilizada)
    : (calculoFim?.taxa_hora_utilizada || calculos.find(c => c.taxa_hora_utilizada)?.taxa_hora_utilizada);
  const valorFaturar = calculoFim?.valor_a_faturar || 0;
  const colSpanMeio = calculos.length > 1 ? calculos.length - 2 : 1;

  const linhaExcedente = `
    <tr>
      <td style="${headerDark}">${isTicket ? 'Taxa/ticket Excedente' : 'Taxa/hora Excedente'}</td>
      <td style="${headerDark}">${taxaHora && taxaHora > 0 ? formatarMoeda(taxaHora) : ''}</td>
      <td style="${headerDark}" colspan="${colSpanMeio}">Valor Total</td>
      <td style="${headerDark}">${formatarMoeda(valorFaturar)}</td>
    </tr>
  `;

  return `
    <table style="width:100%;border-collapse:collapse;font-family:Calibri,sans-serif;overflow:hidden;">
      <thead>
        <tr>
          <th style="${headerDark}">Período</th>
          <th style="${headerDark}" colspan="${calculos.length}">${nomePeriodo}</th>
        </tr>
        <tr>
          <th style="${headerBlue}">Mês</th>
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

/** Gera tabela de Requerimentos do Período */
function gerarTabelaRequerimentos(
  requerimentos: Requerimento[],
  titulo: string,
  corHeader: string,
  isDesenvolvimento: boolean = false
): string {
  if (!requerimentos || requerimentos.length === 0) return '';

  // Calcular total de horas
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
    ? 'background:#fed7aa;color:#9a3412;padding:3px 12px;border-radius:12px;font-size:11px;font-weight:600;font-family:Inter,sans-serif;'
    : 'background:#dbeafe;color:#1e40af;padding:3px 12px;border-radius:12px;font-size:11px;font-weight:600;font-family:Inter,sans-serif;';

  const thStyle = 'padding:10px 12px;text-align:center;font-size:12px;font-family:Inter,sans-serif;color:#6b7280;font-weight:400;border-bottom:2px solid #e5e7eb;';
  const tdStyle = 'padding:14px 10px;text-align:center;font-size:13px;font-family:Inter,sans-serif;color:#111827;font-weight:400;border-bottom:1px solid #e5e7eb;';
  const tdBold = 'padding:14px 10px;text-align:center;font-size:13px;font-family:Inter,sans-serif;color:#111827;font-weight:700;border-bottom:1px solid #e5e7eb;';
  const tdGray = 'padding:14px 10px;text-align:center;font-size:12px;font-family:Inter,sans-serif;color:#6b7280;font-weight:400;border-bottom:1px solid #e5e7eb;';

  const linhas = requerimentos.map(req => {
    const hFunc = typeof req.horas_funcional === 'string' 
      ? converterParaHorasDecimal(req.horas_funcional) : (req.horas_funcional || 0);
    const hTec = typeof req.horas_tecnico === 'string'
      ? converterParaHorasDecimal(req.horas_tecnico) : (req.horas_tecnico || 0);
    const total = hFunc + hTec;
    
    const dataEnvio = req.data_envio ? new Date(req.data_envio).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : isDesenvolvimento ? 'Não enviado' : '-';
    const dataAprov = req.data_aprovacao ? new Date(req.data_aprovacao).toLocaleDateString('pt-BR', { timeZone: 'UTC' }) : '-';
    const periodo = req.mes_cobranca || '-';
    const tipoCobranca = req.tipo_cobranca || 'Banco de Horas';
    const valorTotal = req.valor_total_geral 
      ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(req.valor_total_geral) 
      : '-';

    return `
      <tr style="background:${isDesenvolvimento ? '#fffdfa' : '#ffffff'};">
        <td style="${tdStyle};white-space:nowrap;">
          <div style="font-weight:500;font-size:13px;color:#111827;white-space:nowrap;">🏛️ ${req.chamado || '-'}</div>
          <div style="margin-top:5px;"><span style="background:#3b82f6;color:#fff;padding:2px 10px;border-radius:10px;font-size:11px;font-family:Inter,sans-serif;display:inline-block;white-space:nowrap;">${tipoCobranca}</span></div>
        </td>
        <td style="${tdStyle};font-weight:600;white-space:nowrap;">${req.cliente_nome || '-'}</td>
        <td style="${tdStyle};white-space:nowrap;"><span style="border:1px solid ${isDesenvolvimento ? '#fdba74' : '#93c5fd'};color:${isDesenvolvimento ? '#ea580c' : '#2563eb'};padding:2px 8px;border-radius:10px;font-size:11px;font-family:Inter,sans-serif;white-space:nowrap;">${req.modulo || '-'}</span></td>
        <td style="${tdStyle}">${formatarHorasDecimal(hFunc)}</td>
        <td style="${tdStyle}">${formatarHorasDecimal(hTec)}</td>
        <td style="${isDesenvolvimento ? 'padding:14px 10px;text-align:center;font-size:13px;font-family:Inter,sans-serif;color:#ea580c;font-weight:700;border-bottom:1px solid #e5e7eb;' : tdBold}">${formatarHorasDecimal(total)}</td>
        <td style="${tdGray}">${isDesenvolvimento ? (req.data_envio ? dataEnvio : '<span style="display:inline-block;white-space:nowrap;background:#f3f4f6;color:#6b7280;padding:4px 12px;border-radius:12px;font-size:11px;line-height:1.4;font-family:Inter,sans-serif;">Não enviado</span>') : dataEnvio}</td>
        <td style="${tdGray}">${isDesenvolvimento ? '<span style="display:inline-block;white-space:nowrap;background:#fed7aa;color:#9a3412;padding:4px 12px;border-radius:12px;font-size:11px;line-height:1.4;font-weight:600;font-family:Inter,sans-serif;">Em desenvolvimento</span>' : dataAprov}</td>
        <td style="${tdGray}">${valorTotal}</td>
        <td style="${tdGray}">${periodo}</td>
      </tr>
    `;
  }).join('');

  // Título com emojis - prancheta para ambos, círculo de exclamação laranja para desenvolvimento
  const tituloIcone = isDesenvolvimento ? '📋' : '📋';
  const asteriscoHtml = isDesenvolvimento 
    ? '<span style="display:inline-block;width:16px;height:16px;border-radius:50%;border:2px solid #ea580c;color:#ea580c;font-size:10px;text-align:center;line-height:14px;margin-left:4px;font-weight:700;">!</span>' 
    : '<span style="color:#2563eb;font-size:14px;margin-left:4px;">*</span>';

  return `
    <div style="margin-top:28px;">
      <table style="width:100%;margin-bottom:0;"><tr><td style="padding:0;border:none;font-family:Inter,sans-serif;">
        <span style="font-size:14px;">${tituloIcone}</span>
        <span style="font-size:14px;font-weight:600;color:#111827;font-family:Inter,sans-serif;margin-left:6px;">${titulo}</span>
        ${asteriscoHtml}
        <span style="${badgeTotalStyle};margin-left:10px;">${totalFormatado}</span>
      </td></tr></table>
      <table style="width:100%;border-collapse:collapse;font-family:Inter,sans-serif;margin-top:12px;">
        <thead>
          <tr${isDesenvolvimento ? ' style="background:#fff7ed;"' : ''}>
            <th style="${thStyle}">Chamado</th>
            <th style="${thStyle}">Cliente</th>
            <th style="${thStyle}">Módulo</th>
            <th style="${thStyle}">H.Func</th>
            <th style="${thStyle}">H.Téc</th>
            <th style="${thStyle}">Total</th>
            <th style="${thStyle}">Data Envio</th>
            <th style="${thStyle}">${isDesenvolvimento ? 'Status' : 'Data Aprovação'}</th>
            <th style="${thStyle}">Valor Total</th>
            <th style="${thStyle}">Período</th>
          </tr>
        </thead>
        <tbody>
          ${linhas}
        </tbody>
      </table>
    </div>
  `;
}

/** Gera seção de Observações */
function gerarSecaoObservacoes(observacoes: Observacao[]): string {
  if (!observacoes || observacoes.length === 0) return '';

  const thStyle = 'padding:10px 12px;text-align:center;font-size:12px;font-family:Inter,sans-serif;color:#6b7280;font-weight:400;border-bottom:2px solid #e5e7eb;';
  const tdStyle = 'padding:12px 10px;text-align:center;font-size:13px;font-family:Inter,sans-serif;color:#111827;font-weight:400;border-bottom:1px solid #e5e7eb;';
  const tdGray = 'padding:12px 10px;text-align:center;font-size:12px;font-family:Inter,sans-serif;color:#6b7280;font-weight:400;border-bottom:1px solid #e5e7eb;';

  const linhas = observacoes.map(obs => {
    const periodo = obs.mes && obs.ano ? `${MESES_PT[(obs.mes || 1) - 1]}/${obs.ano}` : '-';
    const data = obs.created_at ? new Date(obs.created_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).replace(',', ' às') : '-';
    const usuario = obs.usuario_nome || '-';
    
    // Badge de tipo
    let tipoBadge = '';
    if (obs.tipo === 'manual') {
      tipoBadge = '<span style="background:#dbeafe;color:#1e40af;padding:2px 8px;border-radius:10px;font-size:11px;font-family:Inter,sans-serif;">Manual</span>';
    } else {
      tipoBadge = '<span style="background:#dcfce7;color:#166534;padding:2px 8px;border-radius:10px;font-size:11px;font-family:Inter,sans-serif;">Ajuste</span>';
      if (obs.valor_horas && obs.valor_horas !== '00:00') {
        tipoBadge += `<br/><span style="background:#dbeafe;color:#1e40af;padding:2px 6px;border-radius:8px;font-size:10px;font-family:Inter,sans-serif;margin-top:3px;display:inline-block;">🕐 ${obs.tipo_ajuste === 'entrada' ? '+' : '-'}${obs.valor_horas}</span>`;
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
    <div style="margin-top:28px;">
      <table style="width:100%;margin-bottom:0;"><tr><td style="padding:0;border:none;font-family:Inter,sans-serif;">
        <span style="font-size:14px;">💬</span>
        <span style="font-size:14px;font-weight:600;color:#111827;font-family:Inter,sans-serif;margin-left:6px;">Observações</span>
      </td></tr></table>
      <table style="width:100%;border-collapse:collapse;font-family:Inter,sans-serif;margin-top:12px;">
        <thead>
          <tr>
            <th style="${thStyle}">Tipo</th>
            <th style="${thStyle}">Período</th>
            <th style="${thStyle}">Observação</th>
            <th style="${thStyle}">Usuário</th>
            <th style="${thStyle}">Data</th>
          </tr>
        </thead>
        <tbody>
          ${linhas}
        </tbody>
      </table>
    </div>
  `;
}

/** Gera HTML completo do email de Saldo Parcial */
function gerarHtmlSaldoParcial(
  calculos: BancoHorasCalculo[],
  empresaNome: string,
  tipoCobranca: string,
  mesAno: { mes: number; ano: number },
  percentualRepasse: number,
  nomePeriodo: string,
  requerimentos: Requerimento[],
  requerimentosEmDesenvolvimento: Requerimento[],
  observacoes: Observacao[],
  diaInicioApuracao: number = 1,
  diaFimApuracao: number = 0
): string {
  const saudacao = getSaudacao();
  const tabelaBancoHoras = gerarTabelaBancoHoras(calculos, tipoCobranca, percentualRepasse, nomePeriodo, diaInicioApuracao, diaFimApuracao);
  const tabelaReqPeriodo = gerarTabelaRequerimentos(requerimentos, 'Requerimentos do Período', '#2563eb', false);
  const tabelaReqDesenv = gerarTabelaRequerimentos(requerimentosEmDesenvolvimento, 'Requerimentos em Desenvolvimento', '#ea580c', true);
  const secaoObs = gerarSecaoObservacoes(observacoes);

  return `
    <div style="font-family:Calibri,sans-serif;max-width:1100px;margin:0;color:#1F497D;font-size:12pt;">
      <p style="font-size:12pt;margin-bottom:16px;"><strong>${saudacao}</strong></p>
      
      <p style="font-size:12pt;margin-bottom:12px;">
        Segue abaixo a previsão parcial das horas contabilizadas até o momento.
      </p>
      
      <p style="font-size:12pt;margin-bottom:12px;">
        Ressaltamos que o fechamento oficial será realizado no início do próximo mês, ocasião em que serão disponibilizados o Book mensal e o quadro oficial de consumo do período.
      </p>
      
      <p style="font-size:12pt;margin-bottom:8px;">
        Informamos que este demonstrativo contempla:
      </p>
      
      <p style="font-size:12pt;margin-bottom:24px;">
        Dessa forma, os valores e quantidades apresentados poderão sofrer alterações até o fechamento oficial do mês.
      </p>

      ${tabelaBancoHoras}
      ${tabelaReqPeriodo}
      ${tabelaReqDesenv}
      ${secaoObs}

      <p style="font-size:12pt;margin-top:24px;">
        Ficamos à disposição em caso de dúvidas.
      </p>
      <p style="font-size:12pt;margin-top:8px;">
        Atenciosamente
      </p>

      ${ASSINATURA_HTML}
    </div>
  `;
}

/** Gera HTML completo do email de Saldo do Mês (fechamento) */
function gerarHtmlSaldoMes(
  calculos: BancoHorasCalculo[],
  empresaNome: string,
  tipoCobranca: string,
  mesAno: { mes: number; ano: number },
  percentualRepasse: number,
  nomePeriodo: string,
  requerimentos: Requerimento[],
  requerimentosEmDesenvolvimento: Requerimento[],
  observacoes: Observacao[],
  diaInicioApuracao: number = 1,
  diaFimApuracao: number = 0
): string {
  const saudacao = getSaudacao();
  const isTicket = tipoCobranca?.toLowerCase() === 'ticket' || tipoCobranca?.toLowerCase() === 'tickets';
  const calculoRef = calculos[calculos.length - 1];
  
  const saldoFinal = (() => {
    if (isTicket) return `${calculoRef?.saldo_tickets || 0} tickets`;
    const h = calculoRef?.saldo_horas || '00:00';
    const partes = h.split(':');
    if (partes.length >= 2) return `${partes[0]}:${partes[1].padStart(2, '0')}`;
    return h;
  })();
  
  const saldoColor = (() => {
    if (isTicket) return (calculoRef?.saldo_tickets || 0) >= 0 ? '#10b981' : '#ef4444';
    return (calculoRef?.saldo_horas || '00:00').startsWith('-') ? '#ef4444' : '#10b981';
  })();

  const tabelaBancoHoras = gerarTabelaBancoHoras(calculos, tipoCobranca, percentualRepasse, nomePeriodo, diaInicioApuracao, diaFimApuracao);
  const tabelaReqPeriodo = gerarTabelaRequerimentos(requerimentos, 'Requerimentos do Período', '#2563eb', false);
  const tabelaReqDesenv = gerarTabelaRequerimentos(requerimentosEmDesenvolvimento, 'Requerimentos em Desenvolvimento', '#ea580c', true);
  const secaoObs = gerarSecaoObservacoes(observacoes);

  return `
    <div style="font-family:Calibri,sans-serif;max-width:1100px;margin:0;color:#1F497D;font-size:12pt;">
      <p style="font-size:12pt;margin-bottom:16px;"><strong>${saudacao}</strong></p>
      
      <p style="font-size:12pt;margin-bottom:12px;">
        Segue abaixo o saldo consolidado do banco de horas referente ao fechamento de <strong>${MESES_PT[mesAno.mes - 1]} ${mesAno.ano}</strong>.
      </p>

      <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:8px;padding:16px;margin-bottom:24px;text-align:center;">
        <p style="color:#0369a1;font-size:10pt;margin:0 0 4px 0;text-transform:uppercase;letter-spacing:0.5px;font-family:Calibri,sans-serif;">Saldo Final do Período</p>
        <p style="color:${saldoColor};font-size:28px;font-weight:700;margin:0;font-family:Calibri,sans-serif;">${saldoFinal}</p>
      </div>

      ${tabelaBancoHoras}
      ${tabelaReqPeriodo}
      ${tabelaReqDesenv}
      ${secaoObs}

      <p style="font-size:12pt;margin-top:24px;">
        Ficamos à disposição em caso de dúvidas.
      </p>
      <p style="font-size:12pt;margin-top:8px;">
        Atenciosamente,
      </p>

      ${ASSINATURA_HTML}
    </div>
  `;
}

export function BotaoEnviarEmailBancoHoras({
  calculos,
  empresaId,
  empresaNome = 'Cliente',
  tipoCobranca = 'Banco de Horas',
  periodoApuracao,
  mesAno,
  percentualRepasse = 100,
  nomePeriodo = '',
  taxaHoraExcedente = 0,
  horasExcedentes = '00:00',
  valorExcedentes = 0,
  requerimentos = [],
  requerimentosEmDesenvolvimento = [],
  observacoes = [],
  disabled = false,
  diaInicioApuracao = 1,
  diaFimApuracao = 0,
}: BotaoEnviarEmailBancoHorasProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  
  const [modalAberto, setModalAberto] = useState(false);
  const [tipoEmail, setTipoEmail] = useState<TipoEmailBancoHoras>('saldo_parcial');
  const [destinatariosTexto, setDestinatariosTexto] = useState('');
  const [destinatariosCCTexto, setDestinatariosCCTexto] = useState('');
  const [assuntoEmail, setAssuntoEmail] = useState('');
  const [corpoEmail, setCorpoEmail] = useState('');
  const [textoIntrodutorio, setTextoIntrodutorio] = useState('');
  const [anexos, setAnexos] = useState<File[]>([]);
  const [enviandoEmail, setEnviandoEmail] = useState(false);
  const [confirmacaoAberta, setConfirmacaoAberta] = useState(false);
  
  // Estados para renderização de tabelas como imagem (evitar distorção no Outlook)
  const [gerandoImagem, setGerandoImagem] = useState(false);
  const [tabelasImagemUrl, setTabelasImagemUrl] = useState<string | null>(null);
  const [tabelasImagemBase64, setTabelasImagemBase64] = useState<string | null>(null);

  /**
   * Renderiza as tabelas (banco de horas, requerimentos, observações) como imagem PNG
   * usando o endpoint /api/email/render-image (Puppeteer).
   * Faz upload para Supabase Storage e retorna URL pública.
   */
  const renderizarTabelasComoImagem = async (htmlTabelas: string) => {
    setGerandoImagem(true);
    setTabelasImagemUrl(null);
    setTabelasImagemBase64(null);
    
    try {
      // Envolver as tabelas em um container com fundo branco para renderização limpa
      // overflow:hidden no container contém margens dos filhos e evita espaço em branco extra
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
          <div style="font-family:Calibri,sans-serif;max-width:1100px;margin:0;padding:20px;overflow:hidden;background:#ffffff;color:#1F497D;font-size:12pt;">
            ${htmlTabelas}
          </div>
        </body>
        </html>
      `;
      
      const response = await fetch('/api/email/render-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ html: htmlParaRenderizar, width: 1100 })
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.image) {
          setTabelasImagemBase64(data.image);
          
          // Upload da imagem para Supabase Storage
          try {
            const { supabase } = await import('@/integrations/supabase/client');
            const byteCharacters = atob(data.image);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
              byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            const byteArray = new Uint8Array(byteNumbers);
            const blob = new Blob([byteArray], { type: 'image/png' });
            
            const fileName = `banco-horas-${empresaNome.replace(/\s+/g, '-')}-${Date.now()}.png`;
            const { error: uploadError } = await supabase.storage
              .from('email-images')
              .upload(fileName, blob, {
                contentType: 'image/png',
                upsert: false
              });
            
            if (uploadError) {
              console.warn('⚠️ Erro ao fazer upload da imagem:', uploadError.message);
            } else {
              const { data: urlData } = supabase.storage
                .from('email-images')
                .getPublicUrl(fileName);
              
              if (urlData?.publicUrl) {
                setTabelasImagemUrl(urlData.publicUrl);
                console.log('✅ Imagem das tabelas salva no Storage:', urlData.publicUrl);
              }
            }
          } catch (uploadErr) {
            console.warn('⚠️ Erro ao salvar imagem no Storage:', uploadErr);
          }
          
          console.log('✅ Tabelas renderizadas como imagem com sucesso');
        }
      } else {
        console.warn('⚠️ Falha ao renderizar tabelas como imagem, email será enviado como HTML');
      }
    } catch (error) {
      console.warn('⚠️ Erro ao renderizar tabelas como imagem:', error);
    } finally {
      setGerandoImagem(false);
    }
  };

  // Texto padrão do saldo parcial
  const getTextoPadraoParcial = () => {
    const saudacao = getSaudacao();
    return `${saudacao}\n\nSegue abaixo a previsão parcial das horas contabilizadas até o momento.\n\nRessaltamos que o fechamento oficial será realizado no início do próximo mês, ocasião em que serão disponibilizados o Book mensal e o quadro oficial de consumo do período.\n\nInformamos que este demonstrativo contempla:\n• Apontamentos automáticos;\n• Requerimentos do período já contabilizados no quadro de consumo;\n• Requerimentos em desenvolvimento, ainda não contabilizados no quadro de consumo;\n\nDessa forma, os valores e quantidades apresentados poderão sofrer alterações até o fechamento oficial do mês.`;
  };

  // Texto padrão do saldo do mês
  const getTextoPadraoMes = () => {
    const saudacao = getSaudacao();
    
    let texto = `${saudacao}\n\nComplementando o e-mail dos indicadores, segue fechamento do banco de horas:`;
    
    return texto;
  };

  // Gera apenas o HTML das tabelas (para renderizar como imagem)
  const gerarHtmlTabelas = () => {
    const tabelaBancoHoras = gerarTabelaBancoHoras(calculos, tipoCobranca, percentualRepasse, nomePeriodo, diaInicioApuracao, diaFimApuracao);
    const tabelaReqPeriodo = gerarTabelaRequerimentos(requerimentos, 'Requerimentos do Período', '#2563eb', false);
    const tabelaReqDesenv = gerarTabelaRequerimentos(requerimentosEmDesenvolvimento, 'Requerimentos em Desenvolvimento', '#ea580c', true);
    const secaoObs = gerarSecaoObservacoes(observacoes);
    
    return `${tabelaBancoHoras}${tabelaReqPeriodo}${tabelaReqDesenv}${secaoObs}`;
  };

  // Gera o HTML final combinando texto editável + tabelas
  const gerarHtmlFinal = (texto: string, tipo: TipoEmailBancoHoras) => {
    const tabelaBancoHoras = gerarTabelaBancoHoras(calculos, tipoCobranca, percentualRepasse, nomePeriodo, diaInicioApuracao, diaFimApuracao);
    const tabelaReqPeriodo = gerarTabelaRequerimentos(requerimentos, 'Requerimentos do Período', '#2563eb', false);
    const tabelaReqDesenv = gerarTabelaRequerimentos(requerimentosEmDesenvolvimento, 'Requerimentos em Desenvolvimento', '#ea580c', true);
    const secaoObs = gerarSecaoObservacoes(observacoes);

    // Converter quebras de linha em parágrafos HTML
    const paragrafos = texto.split('\n').filter(l => l.trim()).map(linha => {
      if (linha.startsWith('•')) {
        return `<li style="margin-bottom:4px;font-size:12pt;font-family:Calibri,sans-serif;color:#1F497D;">${linha.substring(1).trim()}</li>`;
      }
      // Linhas de excedente ficam em negrito
      const isExcedente = linha.startsWith('Horas Excedentes:') || linha.startsWith('Valor Hora Excedentes:') || linha.startsWith('Valor total dos Excedentes:');
      const isBold = linha === getSaudacao() || isExcedente;
      return `<p style="font-size:12pt;font-family:Calibri,sans-serif;color:#1F497D;margin-bottom:12px;${isBold ? 'font-weight:700;' : ''}">${linha}</p>`;
    }).join('\n');

    // Verificar se tem itens de lista e envolver em <ul>
    const htmlTexto = paragrafos.replace(/(<li[^>]*>.*?<\/li>\n?)+/g, (match) => {
      return `<ul style="font-size:12pt;margin-bottom:16px;padding-left:24px;color:#1F497D;list-style-type:disc;">\n${match}</ul>`;
    });

    // Encerramento diferenciado por tipo
    let encerramento = '';
    if (tipo === 'saldo_mes' && valorExcedentes > 0) {
      const formatarMoeda = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
      // Remover segundos do horasExcedentes se formato HH:MM:SS
      let horasExc = horasExcedentes;
      const partes = horasExc.split(':');
      if (partes.length >= 3) horasExc = `${partes[0]}:${partes[1]}`;
      
      encerramento = `
        <p style="font-size:12pt;margin-top:24px;font-family:Calibri,sans-serif;color:#1F497D;font-weight:700;">Horas Excedentes: ${horasExc}</p>
        <p style="font-size:12pt;font-family:Calibri,sans-serif;color:#1F497D;font-weight:700;margin-bottom:12px;">Valor Hora Excedentes: ${formatarMoeda(taxaHoraExcedente)}</p>
        <p style="font-size:12pt;font-family:Calibri,sans-serif;color:#1F497D;font-weight:700;margin-bottom:12px;">Valor total dos Excedentes: ${formatarMoeda(valorExcedentes)}</p>
        <p style="font-size:12pt;margin-top:24px;font-family:Calibri,sans-serif;color:#1F497D;">
          Ficamos no aguardo da PO ou o "de acordo" para seguir com o faturamento.
        </p>
        <p style="font-size:12pt;margin-top:12px;font-family:Calibri,sans-serif;color:#1F497D;">
          <strong>Atenção:</strong> O prazo para validação do Banco é 20 dias corridos a partir do recebimento deste e-mail.
        </p>
        <p style="font-size:12pt;margin-top:12px;font-family:Calibri,sans-serif;color:#1F497D;">Atenciosamente</p>
        ${ASSINATURA_HTML}
      `;
    } else {
      encerramento = `
        <p style="font-size:12pt;margin-top:24px;font-family:Calibri,sans-serif;color:#1F497D;">Ficamos à disposição em caso de dúvidas.</p>
        <p style="font-size:12pt;margin-top:8px;font-family:Calibri,sans-serif;color:#1F497D;">Atenciosamente</p>
        ${ASSINATURA_HTML}
      `;
    }

    return `
      <div style="font-family:Calibri,sans-serif;max-width:1100px;margin:0;color:#1F497D;font-size:12pt;text-align:left;">
        ${htmlTexto}

        ${tabelaBancoHoras}
        ${tabelaReqPeriodo}
        ${tabelaReqDesenv}
        ${secaoObs}

        ${encerramento}
      </div>
    `;
  };

  const handleAbrirModal = (tipo: TipoEmailBancoHoras) => {
    setTipoEmail(tipo);
    const periodo = `${MESES_PT[mesAno.mes - 1]} ${mesAno.ano}`;
    
    // Determinar o mês para o assunto do email:
    // Usar o último mês do trimestre, ou o mês corrente se ainda não chegou no último
    const ultimoMesTrimestre = mesAno.mes + periodoApuracao - 1;
    const hoje = new Date();
    const mesCorrente = hoje.getMonth() + 1; // 1-12
    const anoCorrente = hoje.getFullYear();
    
    let mesAssunto: number;
    let anoAssunto: number;
    
    // Calcular o último mês/ano do trimestre (pode ultrapassar dezembro)
    let ultimoMes = ultimoMesTrimestre;
    let ultimoAno = mesAno.ano;
    if (ultimoMes > 12) {
      ultimoMes = ultimoMes - 12;
      ultimoAno = mesAno.ano + 1;
    }
    
    // Se o último mês do trimestre ainda é futuro, usar o mês corrente
    if (ultimoAno > anoCorrente || (ultimoAno === anoCorrente && ultimoMes > mesCorrente)) {
      mesAssunto = mesCorrente;
      anoAssunto = anoCorrente;
    } else {
      mesAssunto = ultimoMes;
      anoAssunto = ultimoAno;
    }
    
    if (tipo === 'saldo_parcial') {
      // Se o mês selecionado é o mês atual, usa "ontem" como referência de data.
      // Se é um mês passado ou futuro, usa o último dia do mês selecionado.
      const mesSelecionado = mesAno.mes;
      const anoSelecionado = mesAno.ano;
      const isMesAtual = mesSelecionado === hoje.getMonth() + 1 && anoSelecionado === hoje.getFullYear();

      let dia: string;
      let mesAtual: string;

      if (isMesAtual) {
        // Mês corrente: usar ontem como data de referência
        const ontem = new Date(hoje);
        ontem.setDate(ontem.getDate() - 1);
        dia = String(ontem.getDate()).padStart(2, '0');
        mesAtual = String(ontem.getMonth() + 1).padStart(2, '0');
      } else {
        // Mês diferente: usar o último dia do mês selecionado
        const ultimoDia = new Date(anoSelecionado, mesSelecionado, 0).getDate();
        dia = String(ultimoDia).padStart(2, '0');
        mesAtual = String(mesSelecionado).padStart(2, '0');
      }

      setAssuntoEmail(`${empresaNome} - Saldo Parcial ${dia}.${mesAtual}`);
      const texto = getTextoPadraoParcial();
      setTextoIntrodutorio(texto);
      setCorpoEmail(gerarHtmlFinal(texto, tipo));
    } else {
      setAssuntoEmail(`Book | ${empresaNome} | ${MESES_PT[mesAno.mes - 1]} - ${mesAno.ano}`);
      const texto = getTextoPadraoMes();
      setTextoIntrodutorio(texto);
      setCorpoEmail(gerarHtmlFinal(texto, tipo));
    }
    
    setDestinatariosTexto('');
    setDestinatariosCCTexto('');
    setAnexos([]);
    setModalAberto(true);
    
    // Gerar Excel de consumo de horas automaticamente e adicionar aos anexos
    if (empresaId) {
      gerarExcelConsumoHoras(
        empresaId,
        empresaNome,
        mesAno.mes,
        mesAno.ano,
        [...requerimentos, ...requerimentosEmDesenvolvimento],
        observacoes,
        diaInicioApuracao,
        diaFimApuracao
      ).then(excelFile => {
        if (excelFile) {
          setAnexos(prev => [...prev, excelFile]);
          console.log('✅ Excel de consumo de horas adicionado aos anexos do modal');
        }
      }).catch(err => {
        console.warn('⚠️ Não foi possível gerar Excel de consumo:', err);
      });
    }
    
    // Renderizar tabelas como imagem (assíncrono, não bloqueia abertura do modal)
    const htmlTabelas = gerarHtmlTabelas();
    renderizarTabelasComoImagem(htmlTabelas);
  };

  // Atualizar preview quando texto introdutório muda
  const handleTextoChange = (novoTexto: string) => {
    setTextoIntrodutorio(novoTexto);
    setCorpoEmail(gerarHtmlFinal(novoTexto, tipoEmail));
  };

  // Funções de anexo
  const handleAdicionarAnexos = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const tamanhoAtual = anexos.reduce((acc, f) => acc + f.size, 0);
    const tamanhoNovos = files.reduce((acc, f) => acc + f.size, 0);
    const LIMITE_25MB = 25 * 1024 * 1024;
    
    if (tamanhoAtual + tamanhoNovos > LIMITE_25MB) {
      toast({ title: 'Limite excedido', description: 'O total de anexos não pode ultrapassar 25MB.', variant: 'destructive' });
      return;
    }
    setAnexos([...anexos, ...files]);
    e.target.value = '';
  };

  const handleRemoverAnexo = (index: number) => {
    setAnexos(anexos.filter((_, i) => i !== index));
  };

  const formatarTamanhoArquivo = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  // Upload de anexos para Supabase Storage
  const uploadArquivosParaStorage = async (files: File[]) => {
    const { supabase } = await import('@/integrations/supabase/client');
    const arquivosUpload = [];
    let tamanhoTotal = 0;

    for (const file of files) {
      const timestamp = Date.now();
      const random = Math.random().toString(36).substring(7);
      // Sanitizar nome: remover acentos, substituir espaços e caracteres especiais por underscore
      const nomeSanitizado = file.name
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // remove acentos
        .replace(/[^a-zA-Z0-9._-]/g, '_');               // substitui espaços e especiais por _
      const nomeArquivo = `banco-horas/${timestamp}_${random}_${nomeSanitizado}`;

      const { error } = await supabase.storage
        .from('anexos-temporarios')
        .upload(nomeArquivo, file, { cacheControl: '3600', upsert: false });

      if (error) throw new Error(`Erro ao fazer upload de ${file.name}: ${error.message}`);

      const { data: urlData } = supabase.storage
        .from('anexos-temporarios')
        .getPublicUrl(nomeArquivo);

      arquivosUpload.push({
        url: urlData.publicUrl,
        nome: file.name,
        tipo: file.type,
        tamanho: file.size,
        token: `${timestamp}_${random}`
      });
      tamanhoTotal += file.size;
    }

    return { totalArquivos: arquivosUpload.length, tamanhoTotal, arquivos: arquivosUpload };
  };

  const extrairEmails = (texto: string): string[] => {
    return texto.split(/[;,]/).map(e => e.trim()).filter(e => e.length > 0);
  };

  const isFormularioValido = () => {
    const emails = extrairEmails(destinatariosTexto);
    return emails.length > 0 && assuntoEmail.trim().length > 0;
  };

  const handleEnviarEmail = async () => {
    try {
      setEnviandoEmail(true);
      const destinatarios = extrairEmails(destinatariosTexto);
      const destinatariosCC = extrairEmails(destinatariosCCTexto);
      
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const emailsInvalidos = [...destinatarios, ...destinatariosCC].filter(e => !emailRegex.test(e));
      
      if (emailsInvalidos.length > 0) {
        toast({ title: 'Emails inválidos', description: `Emails inválidos: ${emailsInvalidos.join(', ')}`, variant: 'destructive' });
        setEnviandoEmail(false);
        return;
      }

      // Upload de anexos se houver
      let dadosAnexos = undefined;
      if (anexos.length > 0) {
        try {
          dadosAnexos = await uploadArquivosParaStorage(anexos);
        } catch (error) {
          console.error('Erro ao fazer upload dos anexos:', error);
          toast({ title: 'Erro', description: 'Erro ao fazer upload dos anexos.', variant: 'destructive' });
          setEnviandoEmail(false);
          return;
        }
      }

      // Montar HTML final para envio
      // Se temos imagem das tabelas, usar imagem; senão fallback para HTML
      let htmlParaEnvio = corpoEmail;
      
      if (tabelasImagemUrl || tabelasImagemBase64) {
        // Reconstruir o email com texto como HTML + tabelas como imagem
        const texto = textoIntrodutorio;
        
        // Converter texto em parágrafos HTML
        const paragrafos = texto.split('\n').filter(l => l.trim()).map(linha => {
          if (linha.startsWith('•')) {
            return `<li style="margin-bottom:4px;font-size:12pt;font-family:Calibri,sans-serif;color:#1F497D;">${linha.substring(1).trim()}</li>`;
          }
          const isExcedente = linha.startsWith('Horas Excedentes:') || linha.startsWith('Valor Hora Excedentes:') || linha.startsWith('Valor total dos Excedentes:');
          const isBold = linha === getSaudacao() || isExcedente;
          return `<p style="font-size:12pt;font-family:Calibri,sans-serif;color:#1F497D;margin-bottom:12px;${isBold ? 'font-weight:700;' : ''}">${linha}</p>`;
        }).join('\n');
        
        const htmlTexto = paragrafos.replace(/(<li[^>]*>.*?<\/li>\n?)+/g, (match) => {
          return `<ul style="font-size:12pt;margin-bottom:16px;padding-left:24px;color:#1F497D;list-style-type:disc;">\n${match}</ul>`;
        });
        
        // Encerramento
        let encerramento = '';
        if (tipoEmail === 'saldo_mes' && valorExcedentes > 0) {
          const formatarMoedaLocal = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
          let horasExc = horasExcedentes;
          const partes = horasExc.split(':');
          if (partes.length >= 3) horasExc = `${partes[0]}:${partes[1]}`;
          
          encerramento = `
            <p style="font-size:12pt;margin-top:24px;font-family:Calibri,sans-serif;color:#1F497D;font-weight:700;">Horas Excedentes: ${horasExc}</p>
            <p style="font-size:12pt;font-family:Calibri,sans-serif;color:#1F497D;font-weight:700;margin-bottom:12px;">Valor Hora Excedentes: ${formatarMoedaLocal(taxaHoraExcedente)}</p>
            <p style="font-size:12pt;font-family:Calibri,sans-serif;color:#1F497D;font-weight:700;margin-bottom:12px;">Valor total dos Excedentes: ${formatarMoedaLocal(valorExcedentes)}</p>
            <p style="font-size:12pt;margin-top:24px;font-family:Calibri,sans-serif;color:#1F497D;">
              Ficamos no aguardo da PO ou o "de acordo" para seguir com o faturamento.
            </p>
            <p style="font-size:12pt;margin-top:12px;font-family:Calibri,sans-serif;color:#1F497D;">
              <strong>Atenção:</strong> O prazo para validação do Banco é 20 dias corridos a partir do recebimento deste e-mail.
            </p>
            <p style="font-size:12pt;margin-top:12px;font-family:Calibri,sans-serif;color:#1F497D;">Atenciosamente</p>
            ${ASSINATURA_HTML}
          `;
        } else {
          encerramento = `
            <p style="font-size:12pt;margin-top:24px;font-family:Calibri,sans-serif;color:#1F497D;">Ficamos à disposição em caso de dúvidas.</p>
            <p style="font-size:12pt;margin-top:8px;font-family:Calibri,sans-serif;color:#1F497D;">Atenciosamente</p>
            ${ASSINATURA_HTML}
          `;
        }
        
        // Montar imagem das tabelas
        const imgSrc = tabelasImagemUrl || `data:image/png;base64,${tabelasImagemBase64}`;
        const imgHtml = `
          <!--[if gte mso 9]><table cellpadding="0" cellspacing="0" border="0" width="1100"><tr><td><![endif]-->
          <table cellpadding="0" cellspacing="0" border="0" width="1100" style="width:1100px;min-width:1100px;max-width:1100px;margin-top:16px;">
          <tr>
          <td style="padding:0;margin:0;line-height:0;font-size:0;">
          <img src="${imgSrc}" alt="Banco de Horas" width="1100" style="display:block;width:1100px;min-width:1100px;max-width:1100px;height:auto;border:0;outline:none;text-decoration:none;" />
          </td>
          </tr>
          </table>
          <!--[if gte mso 9]></td></tr></table><![endif]-->
        `;
        
        htmlParaEnvio = `<!DOCTYPE html>
<html xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<!--[if gte mso 9]>
<xml>
<o:OfficeDocumentSettings>
<o:AllowPNG/>
<o:PixelsPerInch>96</o:PixelsPerInch>
</o:OfficeDocumentSettings>
</xml>
<style>
table { border-collapse: collapse; }
img { -ms-interpolation-mode: bicubic; }
</style>
<![endif]-->
</head>
<body style="margin:0;padding:0;width:100%;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
<div style="font-family:Calibri,sans-serif;max-width:1100px;margin:0;color:#1F497D;font-size:12pt;text-align:left;padding:20px;">
  ${htmlTexto}
  ${imgHtml}
  ${encerramento}
</div>
</body>
</html>`;
        console.log(`📸 Enviando email com tabelas como imagem via ${tabelasImagemUrl ? 'URL pública' : 'base64'}`);
      } else {
        console.log('📧 Enviando email como HTML (sem imagem renderizada das tabelas)');
      }

      const resultado = await emailService.sendEmail({
        to: destinatarios,
        cc: destinatariosCC.length > 0 ? destinatariosCC : undefined,
        subject: assuntoEmail,
        html: htmlParaEnvio,
        anexos: dadosAnexos,
      });

      if (resultado.success) {
        toast({ title: 'Email enviado!', description: `${tipoEmail === 'saldo_parcial' ? 'Saldo parcial' : 'Saldo do mês'} enviado para ${destinatarios.length} destinatário(s).` });
        setModalAberto(false);
        setConfirmacaoAberta(false);
      } else {
        toast({ title: 'Erro ao enviar', description: resultado.error || 'Erro desconhecido.', variant: 'destructive' });
      }
    } catch (error) {
      console.error('Erro ao enviar email banco de horas:', error);
      toast({ title: 'Erro', description: 'Erro inesperado ao enviar email.', variant: 'destructive' });
    } finally {
      setEnviandoEmail(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            disabled={disabled || calculos.length === 0}
            className="flex items-center gap-2 text-xs sm:text-sm print:hidden"
          >
            <Mail className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline">{t('bankHours.sendEmail')}</span>
            <ChevronDown className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => handleAbrirModal('saldo_parcial')}>
            <FileText className="h-4 w-4 mr-2 text-blue-600" />
            <div>
              <p className="font-medium">{t('bankHours.partialBalance')}</p>
              <p className="text-xs text-gray-500">{t('bankHours.partialBalanceDesc')}</p>
            </div>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => handleAbrirModal('saldo_mes')}>
            <Send className="h-4 w-4 mr-2 text-green-600" />
            <div>
              <p className="font-medium">{t('bankHours.monthBalance')}</p>
              <p className="text-xs text-gray-500">{t('bankHours.monthBalanceDesc')}</p>
            </div>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={modalAberto} onOpenChange={setModalAberto}>
        <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5 text-blue-600" />
              {tipoEmail === 'saldo_parcial' ? t('bankHours.sendPartialBalance') : t('bankHours.sendMonthBalance')}
              <Badge className={tipoEmail === 'saldo_parcial' ? 'bg-blue-100 text-blue-800 text-xs' : 'bg-green-100 text-green-800 text-xs'}>
                {tipoEmail === 'saldo_parcial' ? t('bankHours.partial') : t('bankHours.closing')}
              </Badge>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            <div>
              <Label className="text-base font-medium">{t('bankHours.recipients')}</Label>
              <div className="mt-2">
                <textarea
                  placeholder={t('bankHours.recipientsPlaceholder')}
                  className="w-full p-3 border rounded-md text-sm min-h-[80px] bg-white dark:bg-gray-800 font-mono focus:ring-sonda-blue focus:border-sonda-blue"
                  value={destinatariosTexto}
                  onChange={(e) => setDestinatariosTexto(e.target.value)}
                />
                {extrairEmails(destinatariosTexto).length > 0 && (
                  <p className="text-sm text-gray-600 mt-2">✓ {extrairEmails(destinatariosTexto).length} email(s)</p>
                )}
              </div>
            </div>

            <div>
              <Label className="text-base font-medium">{t('bankHours.ccOptional')}</Label>
              <div className="mt-2">
                <textarea
                  placeholder={t('bankHours.ccPlaceholder')}
                  className="w-full p-3 border rounded-md text-sm min-h-[60px] bg-white dark:bg-gray-800 font-mono focus:ring-sonda-blue focus:border-sonda-blue"
                  value={destinatariosCCTexto}
                  onChange={(e) => setDestinatariosCCTexto(e.target.value)}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="assunto-bh" className="text-base font-medium">{t('bankHours.subject')}</Label>
              <Input
                id="assunto-bh"
                value={assuntoEmail}
                onChange={(e) => setAssuntoEmail(e.target.value)}
                placeholder={t('bankHours.subjectPlaceholder')}
                className="mt-2 focus:ring-sonda-blue focus:border-sonda-blue"
              />
            </div>

            <div>
              <Label className="text-base font-medium">{t('bankHours.emailText')}</Label>
              <p className="text-xs text-gray-500 mt-1 mb-2">{t('bankHours.emailTextDesc')}</p>
              <textarea
                className="w-full p-3 border rounded-md text-sm min-h-[180px] bg-white dark:bg-gray-800 focus:ring-sonda-blue focus:border-sonda-blue"
                value={textoIntrodutorio}
                onChange={(e) => handleTextoChange(e.target.value)}
              />
            </div>

            {/* Anexos */}
            <div>
              <Label className="text-base font-medium">{t('bankHours.attachments')}</Label>
              <div className="mt-2">
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => document.getElementById('file-input-bh')?.click()}
                    className="flex items-center gap-2"
                  >
                    <FileText className="h-4 w-4" />
                    {t('bankHours.addFiles')}
                  </Button>
                  <input
                    id="file-input-bh"
                    type="file"
                    multiple
                    className="hidden"
                    onChange={handleAdicionarAnexos}
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.jpg,.jpeg,.png"
                  />
                  <span className="text-xs text-gray-500">{t('bankHours.sizeLimit')}</span>
                </div>

                {anexos.length > 0 && (
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center justify-between text-sm font-medium text-gray-700 dark:text-gray-300">
                      <span>{t('bankHours.filesAttached', { count: anexos.length })}</span>
                      <span className="text-xs text-gray-500">
                        {t('bankHours.totalSize', { size: formatarTamanhoArquivo(anexos.reduce((acc, file) => acc + file.size, 0)) })}
                      </span>
                    </div>
                    <div className="border rounded-lg divide-y dark:divide-gray-700">
                      {anexos.map((file, index) => (
                        <div key={index} className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-800">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <FileText className="h-5 w-5 text-blue-600 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{file.name}</p>
                              <p className="text-xs text-gray-500">{formatarTamanhoArquivo(file.size)}</p>
                            </div>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoverAnexo(index)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div>
              <Label className="text-base font-medium">{t('bankHours.emailPreview')}</Label>
              <div className="mt-2 border rounded-lg overflow-hidden bg-white dark:bg-gray-900">
                <div className="bg-gray-100 dark:bg-gray-800 p-3 border-b">
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    <strong>{t('bankHours.previewType')}:</strong> {tipoEmail === 'saldo_parcial' ? t('bankHours.partialBalance') : t('bankHours.monthBalance')} |{' '}
                    <strong>{t('bankHours.previewCompany')}:</strong> {empresaNome} |{' '}
                    <strong>{t('bankHours.previewPeriod')}:</strong> {MESES_PT[mesAno.mes - 1]} {mesAno.ano}
                  </div>
                </div>
                <div
                  className="max-h-[500px] overflow-y-auto p-4"
                  dangerouslySetInnerHTML={{ __html: corpoEmail }}
                />
              </div>
            </div>
          </div>

          <DialogFooter className="flex items-center gap-2">
            {gerandoImagem && (
              <span className="text-xs text-gray-500 mr-2">{t('bankHours.generatingImage')}</span>
            )}
            <Button type="button" variant="outline" onClick={() => setModalAberto(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              onClick={() => setConfirmacaoAberta(true)}
              disabled={!isFormularioValido() || enviandoEmail || gerandoImagem}
              className="bg-sonda-blue hover:bg-sonda-dark-blue"
            >
              <Send className="h-4 w-4 mr-2" />
              {gerandoImagem ? t('bankHours.wait') : t('common.send')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmacaoAberta} onOpenChange={setConfirmacaoAberta}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Send className="h-5 w-5 text-blue-600" />
              {t('bankHours.confirmSend')}
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <p>
                {t('bankHours.confirmSendDescPre')}{' '}
                <strong>{tipoEmail === 'saldo_parcial' ? t('bankHours.partialBalance') : t('bankHours.monthBalance')}</strong>{' '}
                {t('bankHours.confirmSendDescMid')}{' '}
                <strong>{extrairEmails(destinatariosTexto).length} {t('bankHours.recipientsCount')}</strong>?
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={enviandoEmail}>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleEnviarEmail}
              disabled={enviandoEmail}
              className="bg-sonda-blue hover:bg-sonda-dark-blue"
            >
              {enviandoEmail ? t('bankHours.sending') : t('bankHours.confirmSend')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
