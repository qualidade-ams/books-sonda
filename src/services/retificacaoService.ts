// =====================================================
// SERVIÇO: VALIDAÇÃO DE MÊS FECHADO E RETIFICAÇÃO
// =====================================================

import { supabase } from '@/integrations/supabase/client';
import { emailService } from './emailService';
import type { EmailData } from './emailService';

interface VerificacaoMesFechado {
  fechado: boolean;
  fechadoEm?: string;
  fechadoPor?: string;
}

interface DadosRetificacao {
  chamado: string;
  clienteNome: string;
  clienteId: string;
  mesCobranca: string; // Formato MM/YYYY
  tipoCobranca: string;
  autorNome: string;
  autorEmail?: string;
}

/**
 * Verificar se o mês/ano está fechado para uma empresa (cliente)
 * Consulta a tabela banco_horas_fechamentos
 */
export async function verificarMesFechado(
  clienteId: string,
  mesCobranca: string // Formato MM/YYYY
): Promise<VerificacaoMesFechado> {
  if (!clienteId || !mesCobranca) {
    return { fechado: false };
  }

  // Extrair mês e ano do formato MM/YYYY
  const partes = mesCobranca.split('/');
  if (partes.length !== 2) {
    return { fechado: false };
  }

  const mes = parseInt(partes[0], 10);
  const ano = parseInt(partes[1], 10);

  if (isNaN(mes) || isNaN(ano)) {
    return { fechado: false };
  }

  const { data, error } = await supabase
    .from('banco_horas_fechamentos' as any)
    .select('id, fechado_em, fechado_por')
    .eq('empresa_id', clienteId)
    .eq('mes', mes)
    .eq('ano', ano)
    .limit(1);

  if (error) {
    console.error('Erro ao verificar mês fechado:', error);
    return { fechado: false };
  }

  if (!data || data.length === 0) {
    return { fechado: false };
  }

  const registro = data[0] as any;

  return {
    fechado: true,
    fechadoEm: registro.fechado_em,
    fechadoPor: registro.fechado_por
  };
}

/**
 * Marcar book como "precisa retificação"
 */
export async function marcarBookRetificacao(
  clienteId: string,
  mesCobranca: string // Formato MM/YYYY
): Promise<boolean> {
  if (!clienteId || !mesCobranca) return false;

  const partes = mesCobranca.split('/');
  if (partes.length !== 2) return false;

  const mes = parseInt(partes[0], 10);
  const ano = parseInt(partes[1], 10);

  if (isNaN(mes) || isNaN(ano)) return false;

  const { error } = await supabase
    .from('books' as any)
    .update({ precisa_retificacao: true })
    .eq('empresa_id', clienteId)
    .eq('mes', mes)
    .eq('ano', ano);

  if (error) {
    console.error('Erro ao marcar book para retificação:', error);
    return false;
  }

  return true;
}

/**
 * Enviar email de notificação de retificação para qualidadeams@sonda.com
 */
export async function enviarEmailRetificacao(dados: DadosRetificacao): Promise<boolean> {
  const html = `
    <div style="font-family: Arial, sans-serif; width: 600px; margin: 0 auto;">

  <table width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px; border-collapse:collapse;">
    <tr>
      <td 
        align="center"
        bgcolor="#2563eb"
        style="background-color:#2563eb; padding:12px 20px 10px 20px; text-align:center;"
      >

        <img
          src="http://books-sonda.vercel.app/images/logo-sonda.png"
          alt="Sonda"
          width="90"
          height="29"
          style="display:block; width:90px !important; height:29px !important; margin:0 auto 5px auto;"
        />

        <div style="font-family:Arial,sans-serif; font-size:18px; line-height:22px; font-weight:bold; color:#ffffff;">
          ⚠️ Retificação Necessária
        </div>

        <div style="font-family:Arial,sans-serif; font-size:11px; line-height:16px; color:#ffffff; margin-top:2px;">
          Requerimento lançado em mês já fechado
        </div>

      </td>
    </tr>
  </table>


  <table width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px; border-collapse:collapse; border:1px solid #e5e7eb;">
    <tr>
      <td style="padding:14px 16px;">

        <div style="font-family:Arial,sans-serif; font-size:12px; line-height:18px; color:#222222; margin-bottom:12px;">
          Um requerimento foi lançado em um período que já estava fechado
          (book enviado). Será necessário <strong>retificar o book</strong> do período.
        </div>


        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%; border-collapse:collapse; font-family:Arial,sans-serif; font-size:11px;">

          <tr>
            <td width="35%" style="width:35%; padding:6px 9px; background-color:#f9fafb; border:1px solid #e5e7eb; font-weight:bold;">
              Chamado
            </td>
            <td style="padding:6px 9px; border:1px solid #e5e7eb;">
              ${dados.chamado}
            </td>
          </tr>

          <tr>
            <td width="35%" style="width:35%; padding:6px 9px; background-color:#f9fafb; border:1px solid #e5e7eb; font-weight:bold;">
              Cliente
            </td>
            <td style="padding:6px 9px; border:1px solid #e5e7eb;">
              ${dados.clienteNome}
            </td>
          </tr>

          <tr>
            <td width="35%" style="width:35%; padding:6px 9px; background-color:#f9fafb; border:1px solid #e5e7eb; font-weight:bold;">
              Período
            </td>
            <td style="padding:6px 9px; border:1px solid #e5e7eb;">
              ${dados.mesCobranca}
            </td>
          </tr>

          <tr>
            <td width="35%" style="width:35%; padding:6px 9px; background-color:#f9fafb; border:1px solid #e5e7eb; font-weight:bold;">
              Tipo de Cobrança
            </td>
            <td style="padding:6px 9px; border:1px solid #e5e7eb;">
              ${dados.tipoCobranca}
            </td>
          </tr>

          <tr>
            <td width="35%" style="width:35%; padding:6px 9px; background-color:#f9fafb; border:1px solid #e5e7eb; font-weight:bold;">
              Lançado por
            </td>
            <td style="padding:6px 9px; border:1px solid #e5e7eb;">
              ${dados.autorNome}
            </td>
          </tr>

        </table>


        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%; margin-top:10px;">
          <tr>
            <td
              style="padding:8px 10px; background-color:#fef3c7; border:1px solid #f59e0b; font-family:Arial,sans-serif; font-size:11px; line-height:16px; color:#92400e;"
            >
              <strong>Ação necessária:</strong>
              O book do período ${dados.mesCobranca} do cliente
              ${dados.clienteNome} foi marcado para retificação no sistema.
            </td>
          </tr>
        </table>


        <div style="font-family:Arial,sans-serif; font-size:9px; line-height:13px; color:#6b7280; text-align:center; margin-top:12px;">
          Este é um e-mail automático enviado pelo Sonda Lyze.
        </div>

      </td>
    </tr>
  </table>

</div>
  `;

  const emailData: EmailData = {
    to: 'qualidadeams@sonda.com',
    subject: `[Retificação] Requerimento ${dados.chamado} - ${dados.clienteNome} - ${dados.mesCobranca}`,
    html
  };

  try {
    const resultado = await emailService.sendEmail(emailData);
    if (!resultado.success) {
      console.error('Erro ao enviar email de retificação:', resultado.error);
    }
    return resultado.success;
  } catch (error) {
    console.error('Erro ao enviar email de retificação:', error);
    return false;
  }
}

/**
 * Fluxo completo: verificar, notificar e marcar retificação
 * Retorna true se o mês estava fechado e as ações foram executadas
 */
export async function processarRetificacao(dados: DadosRetificacao): Promise<boolean> {
  // 1. Enviar email de notificação
  await enviarEmailRetificacao(dados);

  // 2. Marcar book como precisa retificação
  await marcarBookRetificacao(dados.clienteId, dados.mesCobranca);

  return true;
}
