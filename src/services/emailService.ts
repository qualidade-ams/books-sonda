
export interface EmailData {
  to: string | string[];  // ✅ CORREÇÃO: Aceita string ou array de e-mails
  cc?: string | string[];  // Aceita um único e-mail ou array de e-mails
  bcc?: string | string[];  // ✅ NOVO: Aceita um único e-mail ou array de e-mails em cópia oculta
  subject: string;
  html: string;
  attachments?: Array<{
    filename: string;
    content: string;
    contentType: string;
  }>;
  // ✅ ADICIONAR: Suporte a anexos do sistema de books personalizados
  anexos?: {
    totalArquivos: number;
    tamanhoTotal: number;
    arquivos: Array<{
      url: string;
      nome: string;
      tipo: string;
      tamanho: number;
      token: string;
    }>;
  };
}

export interface EmailResponse {
  success: boolean;
  message?: string;
  error?: string;
  retryAfter?: number; // Tempo em ms para aguardar antes de tentar novamente (429)
}

// ✅ Configuração de Rate Limiting para Power Automate
export const RATE_LIMIT_CONFIG = {
  /** Delay base entre envios em ms (10 segundos - respeita limite de 11 runs simultâneas do Power Automate) */
  DELAY_ENTRE_ENVIOS_MS: 10000,
  /** Máximo de retries por email */
  MAX_RETRIES: 5,
  /** Delay inicial para backoff exponencial em ms (60 segundos) */
  BACKOFF_INICIAL_MS: 60000,
  /** Multiplicador do backoff exponencial */
  BACKOFF_MULTIPLIER: 2,
  /** Delay máximo de backoff em ms (5 minutos) */
  BACKOFF_MAX_MS: 300000,
  /** Delay extra após erro 429 em ms (90 segundos) */
  DELAY_APOS_429_MS: 90000,
};

import { supabase } from '@/integrations/supabase/client';
import type { EmailTemplate } from '@/types/approval';
import type { FormularioType, ModalidadeType } from '@/types/formTypes';
import { emailTemplateMappingService, EmailTemplateError } from './emailTemplateMappingService';

// URL padrão do Power Automate para envio de e-mails (fallback)
const POWER_AUTOMATE_URL = 'https://defaultf149d0bc0eb54f9a9e8224a76eacf8.de.environment.api.powerplatform.com:443/powerautomate/automations/direct/workflows/6dcbd557c39b4d74afe41a7f223caf2e/triggers/manual/paths/invoke?api-version=1&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=YocumRps2l3lHcxPtOCb8B1GBU9Hip4mDPzmPl2tLMg';

// Utilitário para mapear número do mês (1..12, ou string '01'..'12') para nome em PT-BR
const getMesPorExtenso = (mes: number | string | null | undefined): string | undefined => {
  if (mes === null || mes === undefined) return undefined;
  const n = typeof mes === 'string' ? parseInt(mes, 10) : mes;
  if (!Number.isFinite(n)) return undefined;
  const idx = (n as number) - 1;
  const nomes = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  return nomes[idx] ?? undefined;
};

// Escapar caracteres especiais para uso em RegExp (inclusive ponto em chaves como 'disparo.mes')
const escapeRegex = (str: string) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Função para buscar URL do webhook configurado
const getWebhookUrl = async (): Promise<string> => {
  try {
    const { data: webhookConfig } = await supabase
      .from('webhook_config')
      .select('webhook_url')
      .eq('ativo', true)
      .limit(1)
      .single();

    return webhookConfig?.webhook_url || POWER_AUTOMATE_URL;
  } catch (error) {
    console.warn('Usando URL padrão do webhook:', error);
    return POWER_AUTOMATE_URL;
  }
};

// Função para registrar log de envio
const logEmail = async (destinatario: string, assunto: string, status: 'enviado' | 'erro', erro?: string) => {
  try {
    await supabase
      .from('email_logs')
      .insert([{
        destinatario,
        assunto,
        status,
        erro,
        enviado_em: new Date().toISOString()
      }]);
  } catch (error) {
    console.error('Erro ao registrar log de e-mail:', error);
  }
};

/**
 * Utilitário de sleep (aguardar)
 */
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Verifica se o erro é um 429 (Too Many Requests) do Power Automate
 */
const is429Error = (error: unknown): boolean => {
  if (error instanceof Error) {
    return error.message.includes('429') || error.message.includes('Too Many Requests');
  }
  return false;
};

/**
 * Calcula o delay de backoff exponencial
 */
const calcularBackoff = (tentativa: number): number => {
  const delay = RATE_LIMIT_CONFIG.BACKOFF_INICIAL_MS * Math.pow(RATE_LIMIT_CONFIG.BACKOFF_MULTIPLIER, tentativa);
  // Adicionar jitter (variação aleatória de ±20%) para evitar thundering herd
  const jitter = delay * 0.2 * (Math.random() * 2 - 1);
  return Math.min(delay + jitter, RATE_LIMIT_CONFIG.BACKOFF_MAX_MS);
};

/**
 * Envia email com retry automático e backoff exponencial para erros 429
 * @param emailData - Dados do email
 * @param tentativa - Número da tentativa atual (0-indexed)
 * @returns Resultado do envio
 */
const sendEmailComRetry = async (
  emailData: EmailData,
  tentativa: number = 0
): Promise<EmailResponse> => {
  try {
    const result = await emailServiceInternal.sendEmailSingle(emailData);
    return result;
  } catch (error) {
    if (is429Error(error) && tentativa < RATE_LIMIT_CONFIG.MAX_RETRIES) {
      const backoffDelay = calcularBackoff(tentativa);
      console.warn(
        `⚠️ Rate limit (429) - Tentativa ${tentativa + 1}/${RATE_LIMIT_CONFIG.MAX_RETRIES}. ` +
        `Aguardando ${(backoffDelay / 1000).toFixed(1)}s antes de tentar novamente...`
      );
      await sleep(backoffDelay);
      return sendEmailComRetry(emailData, tentativa + 1);
    }
    throw error;
  }
};

/**
 * Serviço interno com a lógica de envio sem retry (usado pelo wrapper com retry)
 */
const emailServiceInternal = {
  async sendEmailSingle(emailData: EmailData): Promise<EmailResponse> {
    // Buscar URL do webhook configurado
    const webhookUrl = await getWebhookUrl();

    // Construir payload
    const payload: any = {
      nome: emailData.subject,
      email: Array.isArray(emailData.to) ? emailData.to : [emailData.to],
      email_cc: emailData.cc ? (Array.isArray(emailData.cc) ? emailData.cc : [emailData.cc]) : [],
      email_bcc: emailData.bcc ? (Array.isArray(emailData.bcc) ? emailData.bcc : [emailData.bcc]) : [],
      mensagem: emailData.html
    };

    if (emailData.attachments && emailData.attachments.length > 0) {
      payload.attachments = emailData.attachments;
    }

    if (emailData.anexos && emailData.anexos.totalArquivos > 0) {
      payload.anexos = {
        totalArquivos: emailData.anexos.totalArquivos,
        tamanhoTotal: emailData.anexos.tamanhoTotal,
        arquivos: emailData.anexos.arquivos.map(arquivo => ({
          url: arquivo.url,
          nome: arquivo.nome,
          tipo: arquivo.tipo,
          tamanho: arquivo.tamanho,
          token: arquivo.token
        }))
      };
    } else {
      payload.anexos = {
        totalArquivos: 0,
        tamanhoTotal: 0,
        arquivos: []
      };
    }

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      let errorDetails = `${response.status} - ${response.statusText}`;
      try {
        const errorBody = await response.text();
        if (errorBody) {
          errorDetails += ` | Detalhes: ${errorBody}`;
        }
      } catch (parseError) {
        // Ignorar erro ao ler body
      }
      throw new Error(`Erro HTTP: ${errorDetails}`);
    }

    return { success: true, message: 'E-mail enviado com sucesso via Power Automate' };
  }
};

export const emailService = {
  /**
   * Envia e-mail usando template específico baseado no formulário e modalidade
   * @param formulario - Tipo do formulário
   * @param modalidade - Modalidade selecionada
   * @param destinatario - E-mail do destinatário
   * @param dadosFormulario - Dados do formulário para substituição de variáveis
   * @returns Resultado do envio
   */
  async sendEmailWithMapping(
    formulario: FormularioType,
    modalidade: ModalidadeType,
    destinatario: string,
    dadosFormulario: any
  ): Promise<EmailResponse & { templateUsed?: EmailTemplate; isDefault?: boolean }> {
    try {
      console.log(`Enviando e-mail com mapeamento: ${formulario} + ${modalidade} para ${destinatario}`);

      // Buscar template usando o serviço de mapeamento
      const mappingResult = await emailTemplateMappingService.findWithFallback(
        formulario as FormularioType,
        modalidade as ModalidadeType
      );

      if (!mappingResult.template) {
        const error = 'Nenhum template disponível para envio de e-mail';
        console.error(error);
        await logEmail(destinatario, 'Erro - Template não encontrado', 'erro', error);
        return {
          success: false,
          error
        };
      }

      // Log do tipo de template usado
      if (mappingResult.mappingFound) {
        console.log('✅ Usando template específico para a combinação');
      } else if (mappingResult.isDefault) {
        console.log('⚠️ Usando template padrão (fallback)');
      } else {
        console.log('⚠️ Usando template genérico (último recurso)');
      }

      // Substituir variáveis no template
      let assuntoFinal = mappingResult.template.assunto;
      let corpoFinal = mappingResult.template.corpo;

      // Substituir variáveis básicas
      const variaveisSubstituicao = {
        razaoSocial: dadosFormulario.razaoSocial || '',
        responsavel: dadosFormulario.responsavel || '',
        cnpj: dadosFormulario.cnpj || '',
        email: dadosFormulario.email || destinatario,
        segmento: dadosFormulario.segmento || '',
        modalidade: dadosFormulario.modalidade || modalidade,
        formulario: formulario === 'book' ? 'Book' : '',
        ...dadosFormulario // Incluir todos os dados do formulário
      };

      // Variáveis especiais derivadas (ex.: disparo.mes → nome do mês)
      const variaveisEspeciais: Record<string, string> = {};
      const mesDisparo = getMesPorExtenso(dadosFormulario?.disparo?.mes);
      if (mesDisparo) {
        variaveisEspeciais['disparo.mes'] = mesDisparo;
      }

      Object.entries({ ...variaveisSubstituicao, ...variaveisEspeciais }).forEach(([key, value]) => {
        const safeKey = escapeRegex(key);
        const regex = new RegExp(`{{${safeKey}}}`, 'g');
        assuntoFinal = assuntoFinal.replace(regex, String(value ?? ''));
        corpoFinal = corpoFinal.replace(regex, String(value ?? ''));
      });

      // Enviar e-mail usando o método existente
      const emailData: EmailData = {
        to: destinatario,
        subject: assuntoFinal,
        html: corpoFinal
      };

      const result = await this.sendEmail(emailData);

      return {
        ...result,
        templateUsed: mappingResult.template,
        isDefault: mappingResult.isDefault
      };
    } catch (error) {
      if (error instanceof EmailTemplateError) {
        console.error(`Erro do serviço de mapeamento: ${error.message} (${error.code})`);
        await logEmail(destinatario, 'Erro - Mapeamento de template', 'erro', error.message);
        return {
          success: false,
          error: `Erro no mapeamento de template: ${error.message}`
        };
      }

      console.error('Erro inesperado no envio com mapeamento:', error);
      await logEmail(destinatario, 'Erro - Envio com mapeamento', 'erro',
        error instanceof Error ? error.message : 'Erro desconhecido');

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido no envio com mapeamento'
      };
    }
  },

  async sendEmail(emailData: EmailData): Promise<EmailResponse> {
    try {
      console.log('Enviando e-mail via Power Automate:', {
        to: emailData.to,
        subject: emailData.subject,
        anexos: emailData.anexos ? `${emailData.anexos.totalArquivos} arquivo(s)` : 'nenhum'
      });

      // ✅ Usar envio com retry automático para erros 429
      const result = await sendEmailComRetry(emailData);

      // Registrar log de sucesso
      await logEmail(
        Array.isArray(emailData.to) ? emailData.to.join(', ') : emailData.to,
        emailData.subject,
        'enviado'
      );

      return result;
    } catch (error) {
      console.error('Erro ao enviar e-mail via Power Automate:', error);

      // FALLBACK: Se erro 400 com anexos, tentar enviar sem anexos
      if (error instanceof Error &&
        error.message.includes('400') &&
        emailData.anexos &&
        emailData.anexos.totalArquivos > 0) {

        console.warn('🔄 Tentando reenvio sem anexos devido ao erro 400...');

        try {
          const emailSemAnexos: EmailData = {
            to: emailData.to,
            cc: emailData.cc,
            bcc: emailData.bcc,
            subject: emailData.subject + ' (sem anexos)',
            html: emailData.html + '<br><br><em>Nota: Os anexos não puderam ser processados e serão enviados separadamente.</em>'
          };

          const resultFallback = await sendEmailComRetry(emailSemAnexos);

          if (resultFallback.success) {
            console.log('✅ E-mail enviado sem anexos como fallback');
            await logEmail(
              Array.isArray(emailData.to) ? emailData.to.join(', ') : emailData.to,
              emailData.subject + ' (sem anexos)',
              'enviado'
            );
            return {
              success: true,
              message: 'E-mail enviado sem anexos (fallback devido a erro no processamento dos anexos)'
            };
          }
        } catch (fallbackError) {
          console.error('❌ Fallback também falhou:', fallbackError);
        }
      }

      // Se for erro 429 que esgotou retries, retornar com indicação de retry
      if (is429Error(error)) {
        await logEmail(
          Array.isArray(emailData.to) ? emailData.to.join(', ') : emailData.to,
          emailData.subject,
          'erro',
          'Rate limit excedido (429) - todas as tentativas esgotadas'
        );
        return {
          success: false,
          error: 'Rate limit excedido no Power Automate. Aguarde alguns minutos e tente novamente.',
          retryAfter: RATE_LIMIT_CONFIG.DELAY_APOS_429_MS
        };
      }

      // Registrar log de erro
      await logEmail(
        Array.isArray(emailData.to) ? emailData.to.join(', ') : emailData.to,
        emailData.subject,
        'erro',
        error instanceof Error ? error.message : 'Erro desconhecido'
      );

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido no envio via Power Automate'
      };
    }
  },

  /**
   * Método de teste específico para anexos
   */
  async testAnexosIntegration(emailData: EmailData): Promise<EmailResponse & { payloadSent?: any }> {
    try {
      console.log('🧪 TESTE DE INTEGRAÇÃO DE ANEXOS');
      console.log('📧 Destinatário:', emailData.to);
      console.log('📎 Anexos:', emailData.anexos ? `${emailData.anexos.totalArquivos} arquivo(s)` : 'nenhum');

      const webhookUrl = await getWebhookUrl();

      // Payload de teste simplificado
      const testPayload = {
        nome: '[TESTE ANEXOS] ' + emailData.subject,
        email: emailData.to,
        email_cc: emailData.cc || '',
        email_bcc: emailData.bcc || [],
        mensagem: emailData.html,
        // Incluir anexos apenas se habilitado
        ...(emailData.anexos && {
          anexos_teste: {
            total: emailData.anexos.totalArquivos,
            tamanho: emailData.anexos.tamanhoTotal,
            lista: emailData.anexos.arquivos.map(a => ({
              nome: a.nome,
              tipo: a.tipo,
              tamanho: a.tamanho,
              url_length: a.url.length,
              token_length: a.token.length
            }))
          }
        })
      };

      console.log('📋 Payload de teste:', JSON.stringify(testPayload, null, 2));

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(testPayload)
      });

      if (!response.ok) {
        const errorBody = await response.text();
        console.error('❌ Erro no teste:', errorBody);

        return {
          success: false,
          error: `Teste falhou: ${response.status} - ${errorBody}`,
          payloadSent: testPayload
        };
      }

      console.log('✅ Teste de anexos bem-sucedido');

      return {
        success: true,
        message: 'Teste de integração de anexos bem-sucedido',
        payloadSent: testPayload
      };
    } catch (error) {
      console.error('💥 Erro no teste de anexos:', error);

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro no teste de anexos'
      };
    }
  },

  async sendTestEmail(to: string, template: { assunto: string; corpo: string }, dadosPersonalizados?: any): Promise<EmailResponse> {
    // Dados de teste padrão
    const dadosPadrao = {
      razaoSocial: 'Empresa de Teste Ltda',
      responsavel: 'João da Silva',
      cnpj: '12.345.678/0001-90',
      segmento: 'Indústria',
      modalidade: 'SaaS',
      valor: 'R$ 5.000,00',
      localizacao: 'São Paulo/SP',
      data: new Date().toLocaleDateString('pt-BR'),
      valorLicencaUso: 'R$ 2.500,00',
      valorMAMensal: 'R$ 800,00',
      valorSPMensal: 'R$ 1.200,00',
      valorTotalMensal: 'R$ 2.000,00', // MA Mensal + SP Mensal (800 + 1200)
      escopo: 'Fiscal, Contábil, SPED REINF',
      qtdEmpresas: '3',
      qtdUfs: '2',
      volumetria: 'Até 20.000 documentos/mês',
      email: to,
      telefone: '(11) 99999-9999',
      endereco: 'Rua das Empresas, 123 - Centro',
      cidade: 'São Paulo',
      uf: 'SP',
      cep: '01234-567',
      dataVencimento: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR'),
      numeroOrcamento: 'ORC-2025-001',
      vendedor: 'Maria Santos',
      tempoContrato: '12',
      horasAtendimento: '8 horas/mês',
      observacoes: 'Proposta válida por 30 dias'
    };

    // Função para converter códigos em textos legíveis
    const getSegmentoTexto = (segmento: string) => {
      switch (segmento) {
        case 'industria': return 'Indústria, Varejo ou Outros';
        case 'utilities': return 'Utilities (Serviços Públicos - Energia, Água, Gás, Saneamento)';
        case 'servico': return 'Serviço';
        default: return segmento;
      }
    };

    const getModalidadeTexto = (modalidade: string) => {
      switch (modalidade) {
        case 'saas': return 'SaaS (Software as a Service)';
        case 'on-premise': return 'On-premise (Instalação local)';
        default: return modalidade;
      }
    };

    const getEscopoTexto = (escopo: string) => {
      const mapeamento: { [key: string]: string } = {
        'sped_fiscal': 'Fiscal',
        'sped_contribuicoes': 'Contábil',
        'reinf': 'SPED REINF',
        'bloco_k': 'Bloco K',
        'sped_contabil': 'Contábil'
      };
      return mapeamento[escopo] || escopo;
    };

    const processarEscopo = (escopo: any) => {
      if (Array.isArray(escopo)) {
        return escopo.map(item => getEscopoTexto(item.trim())).join(', ');
      } else if (typeof escopo === 'string') {
        // Se for string separada por vírgulas, processar cada item
        return escopo.split(',').map(item => getEscopoTexto(item.trim())).join(', ');
      }
      return escopo;
    };

    // Usar dados personalizados se fornecidos, senão usar dados padrão
    const dadosTeste = dadosPersonalizados ? {
      ...dadosPadrao,
      ...dadosPersonalizados,
      email: to, // Sempre usar o e-mail do destinatário
      data: new Date().toLocaleDateString('pt-BR'), // Sempre usar data atual
      // Converter códigos para textos legíveis
      segmento: dadosPersonalizados.segmento ?
        getSegmentoTexto(dadosPersonalizados.segmento) :
        dadosPadrao.segmento,
      modalidade: dadosPersonalizados.modalidade ?
        getModalidadeTexto(dadosPersonalizados.modalidade) :
        dadosPadrao.modalidade,
      // Converter valores numéricos para string formatada se necessário
      valorLicencaUso: dadosPersonalizados.valorLicencaUso ?
        `R$ ${dadosPersonalizados.valorLicencaUso.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` :
        dadosPadrao.valorLicencaUso,
      valorMAMensal: dadosPersonalizados.valorManutencao ?
        `R$ ${(dadosPersonalizados.valorManutencao / (dadosPersonalizados.tempoContrato || 12)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` :
        dadosPadrao.valorMAMensal,
      valorSPMensal: dadosPersonalizados.valorSuporte ?
        `R$ ${(dadosPersonalizados.valorSuporte / (dadosPersonalizados.tempoContrato || 12)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` :
        dadosPadrao.valorSPMensal,
      valorTotalMensal: dadosPersonalizados.valorManutencao && dadosPersonalizados.valorSuporte ?
        `R$ ${((dadosPersonalizados.valorManutencao + dadosPersonalizados.valorSuporte) / (dadosPersonalizados.tempoContrato || 12)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` :
        dadosPadrao.valorTotalMensal,
      escopo: dadosPersonalizados.escopo ?
        processarEscopo(dadosPersonalizados.escopo) :
        dadosPadrao.escopo,
      qtdEmpresas: dadosPersonalizados.qtdEmpresas?.toString() || dadosPadrao.qtdEmpresas,
      qtdUfs: dadosPersonalizados.qtdUfs?.toString() || dadosPadrao.qtdUfs,
      tempoContrato: dadosPersonalizados.tempoContrato?.toString() || dadosPadrao.tempoContrato,
      horasAtendimento: dadosPersonalizados.horasAtendimento ?
        `${dadosPersonalizados.horasAtendimento} horas/mês` :
        dadosPadrao.horasAtendimento
    } : dadosPadrao;

    // Substituir variáveis no template
    let assuntoFinal = template.assunto;
    let corpoFinal = template.corpo;

    // Variáveis especiais: disparo.mes (usa personalizado se houver, senão mês atual)
    const mesAtualNome = getMesPorExtenso(new Date().getMonth() + 1) || '';
    const mesDisparoTeste = getMesPorExtenso(dadosPersonalizados?.disparo?.mes) || mesAtualNome;
    const variaveisEspeciaisTeste: Record<string, string> = {
      'disparo.mes': mesDisparoTeste
    };

    Object.entries({ ...dadosTeste, ...variaveisEspeciaisTeste }).forEach(([key, value]) => {
      const safeKey = escapeRegex(key);
      const regex = new RegExp(`{{${safeKey}}}`, 'g');
      const valorString = String(value || '');

      // Log específico para campos problemáticos
      if (['segmento', 'modalidade', 'escopo'].includes(key)) {
      }

      assuntoFinal = assuntoFinal.replace(regex, valorString);
      corpoFinal = corpoFinal.replace(regex, valorString);
    });

    try {
      // Buscar URL do webhook configurado
      const webhookUrl = await getWebhookUrl();

      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          nome: assuntoFinal, // Usar o assunto processado
          email: Array.isArray(to) ? to : [to], // ✅ CORREÇÃO: Garantir que email seja sempre array para Power Automate
          email_cc: [], // ✅ CORREÇÃO: Garantir que email_cc seja sempre array (ou array vazio)
          email_bcc: [], // ✅ CORREÇÃO: Garantir que email_bcc seja sempre array para Power Automate
          mensagem: corpoFinal, // Enviar HTML do template
          // ✅ SEMPRE INCLUIR CAMPO ANEXOS (mesmo que vazio) para compatibilidade com Power Automate
          anexos: {
            totalArquivos: 0,
            tamanhoTotal: 0,
            arquivos: []
          }
        })
      });

      // Verificar se a resposta foi bem-sucedida
      if (!response.ok) {
        throw new Error(`Erro HTTP: ${response.status} - ${response.statusText}`);
      }

      // Registrar log de teste
      await logEmail(to, `[TESTE] ${assuntoFinal}`, 'enviado');

      return {
        success: true,
        message: 'E-mail de teste enviado com sucesso via Power Automate'
      };
    } catch (error) {
      console.error('Erro ao enviar e-mail de teste:', error);

      // Registrar log de erro
      await logEmail(
        to,
        `[TESTE] ${assuntoFinal}`,
        'erro',
        error instanceof Error ? error.message : 'Erro ao enviar e-mail de teste'
      );

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao enviar e-mail de teste via Power Automate'
      };
    }
  },

  /**
   * Envia e-mail de teste usando o sistema de mapeamento
   * @param formulario - Tipo do formulário
   * @param modalidade - Modalidade selecionada
   * @param destinatario - E-mail do destinatário
   * @returns Resultado do envio de teste
   */
  async sendTestEmailWithMapping(
    formulario: FormularioType,
    modalidade: ModalidadeType,
    destinatario: string
  ): Promise<EmailResponse & { templateUsed?: EmailTemplate; isDefault?: boolean }> {
    // Função para converter modalidade para texto legível
    const getModalidadeTexto = (modalidade: string) => {
      switch (modalidade) {
        case 'saas': return 'SaaS (Software as a Service)';
        case 'on-premise': return 'On-premise (Instalação local)';
        default: return modalidade;
      }
    };

    // Dados de teste completos
    const dadosTeste = {
      razaoSocial: 'Empresa de Teste Ltda',
      responsavel: 'João da Silva',
      cnpj: '12.345.678/0001-90',
      email: destinatario,
      segmento: 'Indústria, Varejo ou Outros',
      modalidade: getModalidadeTexto(modalidade),
      quantidadeEmpresas: 3,
      quantidadeUfs: 2,
      volumetriaNotas: 'ate_20000',
      prazoContratacao: 12,
      valor: 'R$ 5.000,00',
      localizacao: 'São Paulo/SP',
      data: new Date().toLocaleDateString('pt-BR'),
      valorLicencaUso: 'R$ 2.500,00',
      valorMAMensal: 'R$ 800,00',
      valorSPMensal: 'R$ 1.200,00',
      valorTotalMensal: 'R$ 2.000,00', // MA Mensal + SP Mensal (800 + 1200)
      escopo: 'Fiscal, Contábil, SPED REINF',
      qtdEmpresas: '3',
      qtdUfs: '2',
      volumetria: 'Até 20.000 documentos/mês',
      telefone: '(11) 99999-9999',
      endereco: 'Rua das Empresas, 123 - Centro',
      cidade: 'São Paulo',
      uf: 'SP',
      cep: '01234-567',
      dataVencimento: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('pt-BR'),
      numeroOrcamento: 'ORC-2025-001',
      vendedor: 'Maria Santos',
      observacoes: 'Proposta válida por 30 dias',
      // Fornece "disparo.mes" como número para permitir substituição do nome do mês
      disparo: { mes: new Date().getMonth() + 1 }
    };

    console.log(`Enviando e-mail de teste com mapeamento: ${formulario} + ${modalidade}`);

    try {
      const result = await this.sendEmailWithMapping(formulario, modalidade, destinatario, dadosTeste);

      // Adicionar prefixo [TESTE] no log
      if (result.success && result.templateUsed) {
        await logEmail(destinatario, `[TESTE] ${result.templateUsed.assunto}`, 'enviado');
      }

      return {
        ...result,
        message: result.success ?
          `E-mail de teste enviado com sucesso usando template: ${result.templateUsed?.nome}` :
          result.error
      };
    } catch (error) {
      console.error('Erro ao enviar e-mail de teste com mapeamento:', error);

      await logEmail(
        destinatario,
        '[TESTE] Erro no mapeamento',
        'erro',
        error instanceof Error ? error.message : 'Erro ao enviar e-mail de teste com mapeamento'
      );

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro ao enviar e-mail de teste com mapeamento'
      };
    }
  }
};
