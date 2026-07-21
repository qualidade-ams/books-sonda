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
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: #2563eb; color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
        <img src="http://books-sonda.vercel.app/images/logo-sonda.png" alt="Sonda" style="height: 32px; margin-bottom: 12px; display: block; margin-left: auto; margin-right: auto;" />
        <h2 style="margin: 0;">⚠️ Retificação Necessária</h2>
        <p style="margin: 5px 0 0 0; opacity: 0.9;">Requerimento lançado em mês já fechado</p>
      </div>
      <div style="border: 1px solid #e5e7eb; border-top: none; padding: 24px; border-radius: 0 0 8px 8px;">
        <p>Um requerimento foi lançado em um período que já estava fechado (book enviado). Será necessário <strong>retificar o book</strong> do período.</p>
        
        <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
          <tr>
            <td style="padding: 8px 12px; background: #f9fafb; border: 1px solid #e5e7eb; font-weight: 600; width: 40%;">Chamado</td>
            <td style="padding: 8px 12px; border: 1px solid #e5e7eb;">${dados.chamado}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; background: #f9fafb; border: 1px solid #e5e7eb; font-weight: 600;">Cliente</td>
            <td style="padding: 8px 12px; border: 1px solid #e5e7eb;">${dados.clienteNome}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; background: #f9fafb; border: 1px solid #e5e7eb; font-weight: 600;">Período (Mês/Ano)</td>
            <td style="padding: 8px 12px; border: 1px solid #e5e7eb;">${dados.mesCobranca}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; background: #f9fafb; border: 1px solid #e5e7eb; font-weight: 600;">Tipo de Cobrança</td>
            <td style="padding: 8px 12px; border: 1px solid #e5e7eb;">${dados.tipoCobranca}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; background: #f9fafb; border: 1px solid #e5e7eb; font-weight: 600;">Lançado por</td>
            <td style="padding: 8px 12px; border: 1px solid #e5e7eb;">${dados.autorNome}</td>
          </tr>
        </table>

        <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 6px; padding: 12px; margin-top: 16px;">
          <p style="margin: 0; color: #92400e; font-size: 14px;">
            <strong>Ação necessária:</strong> O book do período ${dados.mesCobranca} do cliente ${dados.clienteNome} foi marcado para retificação no sistema.
          </p>
        </div>

        <p style="color: #6b7280; font-size: 12px; margin-top: 24px;">
          Este é um email automático enviado pelo Sonda Lyze.
        </p>
      </div>
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
