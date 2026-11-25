/**
 * Rotina "IC Inativos" (Rotinas Automáticas → sync_agendamentos.tipo = ic_inativos).
 *
 * Envia aos Customer Success os chamados do Monitoramento de Chamados do tipo ic_inativo
 * (chamados nas filas ICS INATIVOS de FISCAL, COMEX e GALLERY) que ainda não saíram no dia:
 *
 * - Cada chamado vai no máximo uma vez por dia (Brasília). A primeira execução do dia leva
 *   todos os pendentes; as seguintes, só os que entraram depois. Sem chamado novo, não envia.
 *   No dia seguinte, o que não foi ajustado entra de novo.
 * - Um e-mail só, para todos os Customer Success das empresas ativas (se um estiver de
 *   férias, outro vê), com o CC da rotina.
 * - Cada chamado enviado fica em historico_inconsistencias_chamados: é por ele que a rotina
 *   sabe o que já saiu no dia, e a tela mostra "e-mail enviado".
 * - Não loga e-mails (LGPD): só contagens.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { inicioDoDiaBrasilia } from '../scheduler/agendadorSaldoParcial';
import type { PayloadEmail } from './webhookEmailService';

export const ASSUNTO_IC_INATIVOS = '[AUDITORIA ARANDA] – IC Inativos';
const TIPO = 'ic_inativo';

export interface LinhaIcInativo {
  cliente: string;
  nroChamado: string;
  dataAbertura: string | null;
  customerSuccess: string | null;
}

export interface ResumoEnvioIcInativos {
  /** chamados ic_inativo ativos */
  pendentes: number;
  /** pendentes que ainda não saíram hoje (os que vão no e-mail) */
  novos: number;
  enviado: boolean;
  destinatarios: number;
}

export interface DependenciasEnvioIcInativos {
  supabase: SupabaseClient;
  enviador: { enviarEmail(payload: PayloadEmail): Promise<void> };
  agora?: () => Date;
}

export interface ContextoEnvioIcInativos {
  emailsCc: string[];
  log(mensagem: string, nivel?: 'info' | 'erro'): void;
}

const normalizar = (s: string | null | undefined) => (s ?? '').trim().toUpperCase();

const escapar = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const dataBrasilia = (iso: string | null) =>
  iso
    ? new Intl.DateTimeFormat('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }).format(new Date(iso))
    : '—';

/** Mês e ano de referência do envio, no calendário de Brasília */
function mesAnoBrasilia(agora: Date) {
  const [ano, mes] = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' })
    .format(agora)
    .split('-')
    .map(Number);
  return { mes, ano };
}

const ESTILO_TH =
  'padding: 10px 12px; text-align: center; font-size: 12px; font-weight: 600; color: #374151; border-bottom: 2px solid #e5e7eb; background-color: #f3f4f6; font-family: Arial, sans-serif;';
const ESTILO_TD =
  'padding: 8px 12px; border-bottom: 1px solid #e5e7eb; font-size: 13px; font-family: Arial, sans-serif; text-align: center;';

/** HTML do e-mail (compatível com Outlook), no padrão dos e-mails de auditoria */
export function montarHtmlIcInativos(linhas: LinhaIcInativo[]): string {
  const total = linhas.length;
  const cabecalho = ['Cliente', 'Nº do chamado', 'Data de Abertura', 'Customer Success']
    .map((c) => `<th style="${ESTILO_TH}">${c}</th>`)
    .join('');
  const corpoTabela = linhas
    .map(
      (l) => `
              <tr>
                <td style="${ESTILO_TD}">${escapar(l.cliente)}</td>
                <td style="${ESTILO_TD} color: #2563eb;">${escapar(l.nroChamado)}</td>
                <td style="${ESTILO_TD}">${dataBrasilia(l.dataAbertura)}</td>
                <td style="${ESTILO_TD}">${l.customerSuccess ? escapar(l.customerSuccess) : '—'}</td>
              </tr>`
    )
    .join('');

  const introducao = `Prezados(as) Customer Success,<br/><br/>
O SONDA LYZE identificou os chamados abaixo na fila de IC INATIVOS aguardando avaliação.<br/><br/>
Solicitamos a regularização conforme a orientação indicada em cada item, o mais breve possível.<br/><br/>
Em caso de dúvidas, entre em contato com a equipe de <strong>Qualidade</strong>.<br/><br/>
Após a conclusão, confirme a realização dos ajustes.<br/><br/>
Atenciosamente.`;

  const acao = `<strong>Ação:</strong> Identifique na lista acima os chamados dos clientes sob sua responsabilidade e avalie se o IC será prorrogado ou se o chamado será cancelado:<br/><br/>
&bull; <strong>IC prorrogado:</strong> regularize o IC no ARANDA e devolva o chamado ao grupo responsável anterior, com o responsável APPLICATION ADMINISTRATOR, para continuidade do atendimento.<br/>
&bull; <strong>IC não prorrogado:</strong> cancele o chamado e comunique o cliente sobre a inexistência de contrato ativo.`;

  return `<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: Arial, sans-serif;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f4f4f5;">
    <tr>
      <td align="center" style="padding: 24px 16px;">
        <!--[if mso]><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="700"><tr><td><![endif]-->
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width: 700px; margin: 0 auto;">
          <tr>
            <td align="center" style="background-color: #2563eb; padding: 24px 16px;">
              <h1 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: bold; font-family: Arial, sans-serif;">Auditoria de Chamados e Tarefas</h1>
              <p style="color: #bfdbfe; margin: 8px 0 0 0; font-size: 14px; font-family: Arial, sans-serif;">${total} chamado${total > 1 ? 's' : ''} na fila de IC INATIVOS</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 24px; background-color: #ffffff; border-left: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb;">
              <p style="margin: 0; font-size: 14px; color: #374151; line-height: 1.6; font-family: Arial, sans-serif;">${introducao}</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 16px 24px; background-color: #f9fafb; border-left: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb; border-bottom: 1px solid #e5e7eb;">
              <table cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse: collapse; background-color: #ffffff; border: 1px solid #e5e7eb;">
                <thead>
                  <tr>${cabecalho}</tr>
                </thead>
                <tbody>${corpoTabela}
                  <tr>
                    <td colspan="4" style="padding: 10px 12px; font-size: 13px; color: #374151; line-height: 1.6; font-family: Arial, sans-serif; background-color: #ffffff;">
                      ${acao}
                    </td>
                  </tr>
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

export function criarEnvioIcInativos(deps: DependenciasEnvioIcInativos) {
  const db = deps.supabase as any;
  const agora = deps.agora ?? (() => new Date());

  async function consultar<T>(consulta: PromiseLike<{ data: T | null; error: any }>, oQue: string): Promise<T> {
    const { data, error } = await consulta;
    if (error) throw new Error(`Erro ao ler ${oQue}: ${error.message}`);
    return (data ?? []) as T;
  }

  async function executar(contexto: ContextoEnvioIcInativos): Promise<ResumoEnvioIcInativos> {
    const instante = agora();
    const ativas = await consultar<any[]>(
      db
        .from('inconsistencias_chamados')
        .select('id, nro_chamado, empresa, data_abertura, tipo_chamado, descricao_inconsistencia, data_atividade')
        .eq('tipo_inconsistencia', TIPO)
        .eq('status', 'ativa'),
      'os chamados de IC inativo'
    );
    const resumo: ResumoEnvioIcInativos = { pendentes: ativas.length, novos: 0, enviado: false, destinatarios: 0 };
    if (ativas.length === 0) {
      contexto.log('Nenhum chamado de IC inativo pendente');
      return resumo;
    }

    const enviados = await consultar<{ nro_chamado: string }[]>(
      db
        .from('historico_inconsistencias_chamados')
        .select('nro_chamado')
        .eq('tipo_inconsistencia', TIPO)
        .gte('data_envio', inicioDoDiaBrasilia(instante)),
      'os envios de hoje'
    );
    const jaEnviados = new Set(enviados.map((e) => e.nro_chamado));
    const novos = ativas.filter((a) => !jaEnviados.has(a.nro_chamado));
    resumo.novos = novos.length;
    if (novos.length === 0) {
      contexto.log(`${ativas.length} chamado(s) pendente(s), todos já enviados hoje: nada a enviar`);
      return resumo;
    }

    const [organizacoes, empresas] = await Promise.all([
      consultar<{ nome_organizacao: string; empresa_id: string }[]>(
        db.from('empresas_organizacoes_aranda').select('nome_organizacao, empresa_id'),
        'as organizações do Aranda'
      ),
      consultar<{ id: string; nome_abreviado: string; email_gestor: string | null; status: string }[]>(
        db.from('empresas_clientes').select('id, nome_abreviado, email_gestor, status'),
        'as empresas'
      ),
    ]);

    // Todos os CS das empresas ativas, sem repetir
    const destinatarios: string[] = [];
    const vistos = new Set<string>();
    for (const e of empresas) {
      const cs = e.email_gestor?.trim();
      if (e.status !== 'ativo' || !cs || vistos.has(cs.toLowerCase())) continue;
      vistos.add(cs.toLowerCase());
      destinatarios.push(cs);
    }
    if (destinatarios.length === 0) {
      throw new Error('Nenhum Customer Success cadastrado nas empresas ativas: e-mail não enviado');
    }

    const empresaPorId = new Map(empresas.map((e) => [e.id, e]));
    const empresaPorOrganizacao = new Map(
      organizacoes.map((o) => [normalizar(o.nome_organizacao), empresaPorId.get(o.empresa_id)])
    );
    const linhas: LinhaIcInativo[] = novos
      .map((a) => {
        const empresa = empresaPorOrganizacao.get(normalizar(a.empresa));
        return {
          cliente: empresa?.nome_abreviado || a.empresa || '—',
          nroChamado: a.nro_chamado,
          dataAbertura: a.data_abertura,
          customerSuccess: empresa?.email_gestor?.trim() || null,
        };
      })
      .sort((x, y) => x.cliente.localeCompare(y.cliente, 'pt-BR') || x.nroChamado.localeCompare(y.nroChamado));

    await deps.enviador.enviarEmail({
      nome: ASSUNTO_IC_INATIVOS,
      email: destinatarios,
      email_cc: contexto.emailsCc,
      email_bcc: [],
      mensagem: montarHtmlIcInativos(linhas),
      anexos: { totalArquivos: 0, tamanhoTotal: 0, arquivos: [] },
    });
    resumo.enviado = true;
    resumo.destinatarios = destinatarios.length;
    contexto.log(`E-mail enviado com ${novos.length} chamado(s) a ${destinatarios.length} Customer Success`);

    const { mes, ano } = mesAnoBrasilia(instante);
    const { error } = await db.from('historico_inconsistencias_chamados').insert(
      novos.map((a) => ({
        inconsistencia_id: a.id,
        origem: 'tickets',
        nro_chamado: a.nro_chamado,
        tipo_inconsistencia: TIPO,
        tipo_chamado: a.tipo_chamado ?? null,
        descricao_inconsistencia: a.descricao_inconsistencia,
        data_atividade: a.data_atividade ?? a.data_abertura ?? null,
        empresa: a.empresa,
        data_envio: instante.toISOString(),
        email_analista: destinatarios.join('; '),
        email_cc: contexto.emailsCc.length ? contexto.emailsCc.join('; ') : null,
        enviado_por: null,
        enviado_por_nome: 'Rotina automática',
        mes_referencia: mes,
        ano_referencia: ano,
      }))
    );
    if (error) {
      throw new Error(
        `E-mail enviado, mas o histórico não foi gravado (os chamados podem sair de novo hoje): ${error.message}`
      );
    }
    return resumo;
  }

  return { executar };
}
