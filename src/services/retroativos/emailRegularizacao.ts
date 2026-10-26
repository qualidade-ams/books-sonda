/**
 * E-mail que pede ao consultor a regularização dos apontamentos retroativos: o mesmo texto e o
 * mesmo layout do aviso da tela atual (AjustesRetroativos), agora com os itens do modelo novo.
 * Vai para a equipe Sonda, sempre em português.
 */
import type { MesAno } from '@/services/bancosHoras/calculo';

export interface ItemRegularizacao {
  empresa: string;
  chamado: string | null;
  tarefa: string | null;
  consultor: string | null;
  minutos: number;
  mes: MesAno;
}

export const ASSUNTO_REGULARIZACAO = 'Ajuste de Apontamento - Banco de Horas';

const escapar = (texto: string | null | undefined) =>
  String(texto ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

const horasTexto = (minutos: number) => {
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  return `${h}h${m > 0 ? `${String(m).padStart(2, '0')}min` : ''}`;
};

const nomeDoMes = (m: MesAno) =>
  new Intl.DateTimeFormat('pt-BR', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(
    new Date(Date.UTC(m.ano, m.mes - 1, 1))
  );

/** Texto editável do e-mail, pelo primeiro nome do consultor */
export function textoRegularizacao(consultor: string, quantidade: number): string {
  const primeiroNome = consultor.trim().split(/\s+/)[0] || 'Consultor';
  const plural = quantidade > 1;

  return `Prezado(a) ${primeiroNome},

Durante a auditoria dos apontamentos, identificamos ${plural ? 'registros de horas realizados' : 'o registro de horas realizado'} após o fechamento do período, ${plural ? 'referentes a atividades executadas em competências anteriores' : 'referente a uma atividade executada em competência anterior'}.

Como o banco de horas do cliente referente ao período já havia sido processado, ${plural ? 'esses apontamentos retroativos não foram considerados' : 'esse apontamento retroativo não foi considerado'} na apuração original. Dessa forma, é necessário regularizar as horas no período vigente, garantindo a atualização correta do saldo do cliente.

Caso ${plural ? 'os chamados ainda estejam Abertos ou com status Resolved' : 'o chamado ainda esteja Aberto ou com status Resolved'}, solicitamos realizar o seguinte ajuste:

- Excluir ${plural ? 'as tarefas que contêm os apontamentos retroativos' : 'a tarefa que contém o apontamento retroativo'};
- Criar ${plural ? 'novas tarefas' : 'uma nova tarefa'} no período vigente;
- Registrar novamente as horas, para que sejam descontadas corretamente do banco de horas atual do cliente.

Os dados ${plural ? 'dos apontamentos que necessitam' : 'do apontamento que necessita'} de regularização estão apresentados abaixo.

Após a conclusão, pedimos que confirme a realização do ajuste.

Em caso de dúvidas ou impossibilidade de realizar a correção, entre em contato com a equipe de Qualidade.

Atenciosamente.`;
}

const P =
  'margin: 12px 0; font-size: 14px; color: #374151; line-height: 1.6; font-family: Arial, sans-serif;';
const TH =
  'padding: 10px 12px; text-align: center; font-size: 12px; font-weight: 600; color: #374151; border-bottom: 2px solid #e5e7eb; background-color: #f3f4f6; font-family: Arial, sans-serif;';
const TD =
  'padding: 8px 12px; border-bottom: 1px solid #e5e7eb; font-size: 13px; font-family: Arial, sans-serif; text-align: center;';

/** E-mail em HTML, compatível com o Outlook, como o aviso atual */
export function gerarHtmlRegularizacao(itens: ItemRegularizacao[], texto: string): string {
  const totalMinutos = itens.reduce((soma, i) => soma + i.minutos, 0);
  const meses = [...new Map(itens.map((i) => [i.mes.ano * 12 + i.mes.mes, i.mes])).entries()]
    .sort(([a], [b]) => a - b)
    .map(([, m]) => nomeDoMes(m))
    .join(', ');

  // Os itens da lista antes dos parágrafos: o primeiro vem depois de uma linha em branco
  const corpo = escapar(texto)
    .replace(/\n- (.+)/g, '<br/>&#8226; <strong>$1</strong>')
    .replace(/\n\n/g, `</p><p style="${P}">`)
    .replace(/\n/g, '<br/>')
    .replace(/Qualidade/g, '<strong>Qualidade</strong>');

  const linhas = itens
    .map(
      (i) => `
          <tr>
            <td style="${TD}">${escapar(i.empresa)}</td>
            <td style="${TD}">${escapar(i.chamado)}</td>
            <td style="${TD} color: #2563eb;">${escapar(i.tarefa) || '-'}</td>
            <td style="${TD}">${escapar(i.consultor) || '-'}</td>
          </tr>`
    )
    .join('');

  return `<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: Arial, sans-serif;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f4f4f5;">
    <tr>
      <td align="center" style="padding: 24px 16px;">
        <!--[if mso]><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="700"><tr><td><![endif]-->
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width: 700px; margin: 0 auto;">
          <tr>
            <td align="center" style="background-color: #2563eb; padding: 24px 16px;">
              <h1 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: bold; font-family: Arial, sans-serif;">Ajuste de Apontamento</h1>
              <p style="color: #bfdbfe; margin: 8px 0 0 0; font-size: 14px; font-family: Arial, sans-serif;">Banco de Horas - ${itens.length} apontamento${itens.length > 1 ? 's' : ''}</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 24px; background-color: #ffffff; border-left: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb;">
              <p style="${P}">${corpo}</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 12px 24px; background-color: #f0f9ff; border-left: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td style="font-size: 13px; color: #1e40af; font-family: Arial, sans-serif; padding-right: 24px;"><strong>Período:</strong> ${meses}</td>
                  <td style="font-size: 13px; color: #1e40af; font-family: Arial, sans-serif; padding-right: 24px;"><strong>Apontamentos:</strong> ${itens.length}</td>
                  <td style="font-size: 13px; color: #1e40af; font-family: Arial, sans-serif;"><strong>Horas:</strong> ${horasTexto(totalMinutos)}</td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding: 16px 24px; background-color: #f9fafb; border-left: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb; border-bottom: 1px solid #e5e7eb;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-bottom: 12px;">
                <tr>
                  <td style="background-color: #f59e0b; color: #ffffff; padding: 8px 16px; font-weight: 600; font-size: 13px; font-family: Arial, sans-serif;">Apontamentos Retroativos Identificados</td>
                  <td style="background-color: #f59e0b; color: #ffffff; padding: 8px 16px; font-size: 12px; font-family: Arial, sans-serif; text-align: right;">${itens.length} item${itens.length > 1 ? 's' : ''}</td>
                </tr>
              </table>
              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse: collapse; background-color: #ffffff; border: 1px solid #e5e7eb;">
                <thead>
                  <tr>
                    <th style="${TH}">Empresa</th>
                    <th style="${TH}">Chamado</th>
                    <th style="${TH}">Tarefa</th>
                    <th style="${TH}">Consultor</th>
                  </tr>
                </thead>
                <tbody>${linhas}
                </tbody>
              </table>
            </td>
          </tr>
        </table>
        <!--[if mso]></td></tr></table><![endif]-->
      </td>
    </tr>
  </table>
</body>
</html>`;
}
