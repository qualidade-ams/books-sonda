/**
 * Montagem do e-mail de Saldo Parcial do banco de horas.
 *
 * Funções puras (sem React, sem Supabase), usadas pelo envio manual
 * (BotaoEnviarEmailBancoHoras) e pelo envio automático (sync-api).
 * O HTML gerado é coberto por teste de caracterização: qualquer mudança de
 * espaço ou texto aqui altera o e-mail enviado aos clientes.
 */

import { gerarTabelaBancoHoras, gerarTabelaRequerimentos, gerarSecaoObservacoes } from '@/services/bancoHorasTableService';
import type { BancoHorasCalculo } from '@/types/bancoHoras';
import type { Requerimento } from '@/types/requerimentos';

/** Fuso de referência para saudação e datas do e-mail */
export const FUSO_SALDO_PARCIAL = 'America/Sao_Paulo';

/** Observação exibida na seção de observações do e-mail */
export interface ObservacaoSaldoParcial {
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

/** Dados que alimentam as tabelas do e-mail (os mesmos exibidos na Visão Consolidada) */
export interface DadosEmailSaldoParcial {
  calculos: BancoHorasCalculo[];
  tipoCobranca: string;
  percentualRepasse: number;
  nomePeriodo: string;
  requerimentos: Requerimento[];
  requerimentosEmDesenvolvimento: Requerimento[];
  observacoes: ObservacaoSaldoParcial[];
  diaInicioApuracao: number;
  diaFimApuracao: number;
  isEnglish: boolean;
}

export interface MesAno {
  mes: number;
  ano: number;
}

/** Assinatura padrão do email - imagem única */
export const ASSINATURA_HTML = `
<div style="margin-top:24px;">
  <img src="https://www.sondalyze.com.br/images/qualidade/assinatura_nova.png" alt="Sonda - Qualidade - Soluções de Negócio" width="500" style="display:block;width:500px;max-width:100%;height:auto;border:0;outline:none;text-decoration:none;" />
</div>
`;

const formatadorSaoPaulo = new Intl.DateTimeFormat('en-US', {
  timeZone: FUSO_SALDO_PARCIAL,
  hourCycle: 'h23',
  year: 'numeric',
  month: 'numeric',
  day: 'numeric',
  hour: 'numeric'
});

/** Data e hora de um instante no fuso de São Paulo */
export function partesDataSaoPaulo(instante: Date): { ano: number; mes: number; dia: number; hora: number } {
  const p: Record<string, number> = {};
  for (const parte of formatadorSaoPaulo.formatToParts(instante)) {
    if (parte.type !== 'literal') p[parte.type] = Number(parte.value);
  }
  return { ano: p.year, mes: p.month, dia: p.day, hora: p.hour };
}

/** Dia anterior (no calendário de São Paulo) ao instante informado */
export function ontemSaoPaulo(agora: Date): { ano: number; mes: number; dia: number } {
  const hoje = partesDataSaoPaulo(agora);
  const ontem = new Date(Date.UTC(hoje.ano, hoje.mes - 1, hoje.dia - 1));
  return { ano: ontem.getUTCFullYear(), mes: ontem.getUTCMonth() + 1, dia: ontem.getUTCDate() };
}

/** Retorna saudação baseada no horário de São Paulo */
export function getSaudacao(isEnglish: boolean = false, agora: Date = new Date()): string {
  const { hora } = partesDataSaoPaulo(agora);
  if (isEnglish) {
    if (hora < 12) return 'Good morning!';
    if (hora < 18) return 'Good afternoon!';
    return 'Good evening!';
  }
  if (hora < 12) return 'Bom dia!';
  if (hora < 18) return 'Boa tarde!';
  return 'Boa noite!';
}

/** Texto padrão (editável no envio manual) do e-mail de Saldo Parcial */
export function getTextoPadraoParcial(isEnglish: boolean, agora: Date = new Date()): string {
  const saudacao = getSaudacao(isEnglish, agora);
  if (isEnglish) {
    return `${saudacao}\n\nBelow is the partial forecast of hours accounted for so far.\n\nPlease note that the official closing will be done at the beginning of next month, when the monthly Book and the official consumption table for the period will be made available.\n\nWe inform that this statement includes:\n• Automatic entries;\n• Period requirements already accounted for in the consumption table;\n• Requirements in development, not yet accounted for in the consumption table;\n\nTherefore, the values and quantities presented may change until the official month-end closing.`;
  }
  return `${saudacao}\n\nSegue abaixo a previsão parcial das horas contabilizadas até o momento.\n\nRessaltamos que o fechamento oficial será realizado no início do próximo mês, ocasião em que serão disponibilizados o Book mensal e o quadro oficial de consumo do período.\n\nInformamos que este demonstrativo contempla:\n• Apontamentos automáticos;\n• Requerimentos do período já contabilizados no quadro de consumo;\n• Requerimentos em desenvolvimento, ainda não contabilizados no quadro de consumo;\n\nDessa forma, os valores e quantidades apresentados poderão sofrer alterações até o fechamento oficial do mês.`;
}

/**
 * Assunto: "{Empresa} - Saldo Parcial DD.MM".
 * Mês corrente → data de ontem; outro mês → último dia daquele mês.
 */
export function gerarAssuntoSaldoParcial(empresaNome: string, mesAno: MesAno, agora: Date = new Date()): string {
  const hoje = partesDataSaoPaulo(agora);
  const isMesAtual = mesAno.mes === hoje.mes && mesAno.ano === hoje.ano;

  let dia: number;
  let mes: number;
  if (isMesAtual) {
    const ontem = ontemSaoPaulo(agora);
    dia = ontem.dia;
    mes = ontem.mes;
  } else {
    dia = new Date(Date.UTC(mesAno.ano, mesAno.mes, 0)).getUTCDate();
    mes = mesAno.mes;
  }

  return `${empresaNome} - Saldo Parcial ${String(dia).padStart(2, '0')}.${String(mes).padStart(2, '0')}`;
}

/** Tabelas do e-mail: banco de horas, requerimentos do período, em desenvolvimento e observações */
export function gerarHtmlTabelasSaldoParcial(dados: DadosEmailSaldoParcial): string {
  // Usa os cálculos exatamente como exibidos na tela de Banco de Horas (sem mascarar
  // meses futuros). O email de Saldo Parcial deve refletir a tela 1:1.
  // A regra de mascaramento de meses futuros permanece exclusiva do fluxo de Disparo
  // (bancoHorasTableService.buscarDadosEGerarTabelaBancoHoras), sem impacto aqui.
  const { tabelaBancoHoras, tabelaReqPeriodo, tabelaReqDesenv, secaoObs } = gerarSecoes(dados);
  return `${tabelaBancoHoras}${tabelaReqPeriodo}${tabelaReqDesenv}${secaoObs}`;
}

function gerarSecoes(dados: DadosEmailSaldoParcial) {
  const { isEnglish } = dados;
  return {
    tabelaBancoHoras: gerarTabelaBancoHoras(dados.calculos, dados.tipoCobranca, dados.percentualRepasse, dados.nomePeriodo, dados.diaInicioApuracao, dados.diaFimApuracao, isEnglish),
    tabelaReqPeriodo: gerarTabelaRequerimentos(dados.requerimentos, isEnglish ? 'Period Requirements' : 'Requerimentos do Período', '#2563eb', false, isEnglish),
    tabelaReqDesenv: gerarTabelaRequerimentos(dados.requerimentosEmDesenvolvimento, isEnglish ? 'Requirements in Development' : 'Requerimentos em Desenvolvimento', '#ea580c', true, isEnglish),
    secaoObs: gerarSecaoObservacoes(dados.observacoes, isEnglish)
  };
}

/** Converte o texto (linhas e "•" de lista) em parágrafos HTML */
function textoParaHtml(texto: string, isEnglish: boolean, agora: Date): string {
  const saudacao = getSaudacao(isEnglish, agora);
  const paragrafos = texto.split('\n').filter(l => l.trim()).map(linha => {
    if (linha.startsWith('•')) {
      return `<li style="margin-bottom:4px;font-size:12pt;font-family:Calibri,sans-serif;color:#1F497D;">${linha.substring(1).trim()}</li>`;
    }
    // Linhas de excedente ficam em negrito
    const isExcedente = linha.startsWith('Horas Excedentes:') || linha.startsWith('Valor Hora Excedentes:') || linha.startsWith('Valor total dos Excedentes:') || linha.startsWith('Surplus Hours:') || linha.startsWith('Surplus Rate/Hour:') || linha.startsWith('Total Surplus Amount:');
    const isBold = linha === saudacao || isExcedente;
    return `<p style="font-size:12pt;font-family:Calibri,sans-serif;color:#1F497D;margin-bottom:12px;${isBold ? 'font-weight:700;' : ''}">${linha}</p>`;
  }).join('\n');

  // Verificar se tem itens de lista e envolver em <ul>
  return paragrafos.replace(/(<li[^>]*>.*?<\/li>\n?)+/g, (match) => {
    return `<ul style="font-size:12pt;margin-bottom:16px;padding-left:24px;color:#1F497D;list-style-type:disc;">\n${match}</ul>`;
  });
}

function textosEncerramento(isEnglish: boolean) {
  return {
    disposicao: isEnglish
      ? 'We remain at your disposal should you have any questions.'
      : 'Ficamos à disposição em caso de dúvidas.',
    encerramento: isEnglish ? 'Best regards' : 'Atenciosamente'
  };
}

/** E-mail completo em HTML (texto + tabelas em HTML), também usado como preview */
export function gerarHtmlCorpoSaldoParcial(texto: string, dados: DadosEmailSaldoParcial, agora: Date = new Date()): string {
  const { tabelaBancoHoras, tabelaReqPeriodo, tabelaReqDesenv, secaoObs } = gerarSecoes(dados);
  const htmlTexto = textoParaHtml(texto, dados.isEnglish, agora);
  const { disposicao, encerramento: textoEncerramento } = textosEncerramento(dados.isEnglish);

  const encerramento = `
        <p style="font-size:12pt;margin-top:24px;font-family:Calibri,sans-serif;color:#1F497D;">${disposicao}</p>
        <p style="font-size:12pt;margin-top:8px;font-family:Calibri,sans-serif;color:#1F497D;">${textoEncerramento}</p>
        ${ASSINATURA_HTML}
      `;

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
}

/** Página enviada ao /api/email/render-image para virar a imagem das tabelas */
export function gerarHtmlRenderizacaoTabelas(htmlTabelas: string): string {
  // Envolver as tabelas em um container com fundo branco para renderização limpa
  // overflow:hidden no container contém margens dos filhos e evita espaço em branco extra
  return `
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
          <div style="font-family:Calibri,sans-serif;max-width:1200px;margin:0;padding:20px;overflow:hidden;background:#ffffff;color:#1F497D;font-size:12pt;">
            ${htmlTabelas}
          </div>
        </body>
        </html>
      `;
}

/** E-mail final com as tabelas como imagem (evita distorção no Outlook) */
export function gerarHtmlEnvioComImagem(texto: string, isEnglish: boolean, imgSrc: string, agora: Date = new Date()): string {
  const htmlTexto = textoParaHtml(texto, isEnglish, agora);
  const { disposicao, encerramento: textoEncerramento } = textosEncerramento(isEnglish);

  const encerramento = `
            <p style="font-size:12pt;margin-top:24px;font-family:Calibri,sans-serif;color:#1F497D;">${disposicao}</p>
            <p style="font-size:12pt;margin-top:8px;font-family:Calibri,sans-serif;color:#1F497D;">${textoEncerramento}</p>
            ${ASSINATURA_HTML}
          `;

  const imgHtml = `
          <!--[if gte mso 9]><table cellpadding="0" cellspacing="0" border="0" width="1200"><tr><td><![endif]-->
          <table cellpadding="0" cellspacing="0" border="0" width="1200" style="width:1200px;min-width:1200px;max-width:1200px;margin-top:16px;">
          <tr>
          <td style="padding:0;margin:0;line-height:0;font-size:0;">
          <img src="${imgSrc}" alt="Banco de Horas" width="1200" style="display:block;width:1200px;min-width:1200px;max-width:1200px;height:auto;border:0;outline:none;text-decoration:none;" />
          </td>
          </tr>
          </table>
          <!--[if gte mso 9]></td></tr></table><![endif]-->
        `;

  return `<!DOCTYPE html>
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
}
