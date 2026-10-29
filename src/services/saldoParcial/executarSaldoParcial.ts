/**
 * Envio automático do Saldo Parcial de uma empresa.
 *
 * Mesmo resultado do envio manual com o texto padrão:
 * coleta os dados → renderiza as tabelas como imagem (obrigatória: sem imagem não envia) →
 * gera o Excel de consumo → sobe imagem e Excel para o storage → envia pelo webhook.
 * Renderização e envio são injetados: no servidor (sync-api) chamam o render-image
 * e o webhook diretamente.
 *
 * Empresa liberada (Fase 5, Modelagem_Fase5.md seção 8): um e-mail com uma tabela por banco e o
 * Excel com uma aba por banco, o mesmo conteúdo do envio manual do Controle novo. Assunto, texto,
 * destinatários e webhook não mudam (9.3-4).
 */

import { gerarExcelConsumoHoras } from '@/utils/gerarExcelConsumoHoras';
import { coletorSaldoParcialService } from './coletorSaldoParcial';
import {
  getTextoPadraoParcial,
  gerarAssuntoSaldoParcial,
  gerarHtmlTabelasSaldoParcial,
  gerarHtmlRenderizacaoTabelas,
  gerarHtmlEnvioComImagem,
} from './emailSaldoParcial';
import {
  ANEXOS_VAZIOS,
  uploadAnexosTemporarios,
  uploadImagemTabelas,
  type AnexosWebhook,
} from './storageSaldoParcial';
import { gerarExcelBancos, gerarHtmlTabelasBancos } from './conteudoBancos';
import { mesReferenciaSaldoParcial } from './periodoSaldoParcial';
import { partesDataSaoPaulo } from './emailSaldoParcial';
import { supabase } from '@/integrations/supabase/client';
import { controleSaldoParcialService } from '@/services/controleSaldoParcialService';
import { geracaoBookLiberada } from '@/services/geracaoBookLiberada';
import { criarTradutor } from '@/i18n/tradutor';
import type { MesAno } from '@/services/bancosHoras/calculo';

/** Payload aceito pelo webhook de e-mail (Power Automate) */
export interface PayloadEmailWebhook {
  nome: string;
  email: string[];
  email_cc: string[];
  email_bcc: string[];
  mensagem: string;
  anexos: AnexosWebhook;
}

export interface DependenciasEnvioSaldoParcial {
  /** Renderiza o HTML das tabelas e devolve o PNG em base64 (lança erro com o motivo, ou null, se falhar) */
  renderizarImagem(html: string): Promise<string | null>;
  /** Envia o e-mail; lança erro em caso de falha */
  enviarEmail(payload: PayloadEmailWebhook): Promise<void>;
  agora?: Date;
}

export interface ResultadoEnvioSaldoParcial {
  enviados: number;
}

export async function executarEnvioSaldoParcial(
  empresaId: string,
  destinatarios: string[],
  emailsCc: string[],
  deps: DependenciasEnvioSaldoParcial
): Promise<ResultadoEnvioSaldoParcial> {
  if (destinatarios.length === 0) {
    throw new Error('Nenhum destinatário de Saldo Parcial informado');
  }

  const agora = deps.agora ?? new Date();

  const mes = mesReferenciaSaldoParcial(agora);
  if (await geracaoBookLiberada.noModeloNovo(empresaId, mes)) {
    await deps.enviarEmail(
      await montarEmailPorBanco(empresaId, mes, destinatarios, emailsCc, agora, deps)
    );
    return { enviados: 1 };
  }

  const preparados = await coletorSaldoParcialService.coletar(empresaId, agora);

  // 1) Monta todos os e-mails (contrato "ambos" tem dois); só envia se todos ficarem prontos
  const payloads: PayloadEmailWebhook[] = [];
  for (const { empresaNome, mesAno, dados } of preparados) {
    const texto = getTextoPadraoParcial(dados.isEnglish, agora);

    // Tabelas sempre como imagem (o HTML de tabela distorce conforme o cliente de e-mail)
    const imagemBase64 = await renderizarTabelas(
      deps,
      gerarHtmlRenderizacaoTabelas(gerarHtmlTabelasSaldoParcial(dados))
    );
    const urlImagem = await uploadImagemTabelas(imagemBase64, empresaNome);
    const imgSrc = urlImagem || `data:image/png;base64,${imagemBase64}`;
    const mensagem = gerarHtmlEnvioComImagem(texto, dados.isEnglish, imgSrc, agora);

    const excel = await gerarExcelConsumoHoras(
      empresaId,
      empresaNome,
      mesAno.mes,
      mesAno.ano,
      [...dados.requerimentos, ...dados.requerimentosEmDesenvolvimento],
      dados.observacoes,
      dados.diaInicioApuracao,
      dados.diaFimApuracao
    );
    const anexos = excel ? await uploadAnexosTemporarios([excel]) : ANEXOS_VAZIOS;

    payloads.push({
      nome: gerarAssuntoSaldoParcial(empresaNome, mesAno, agora),
      email: destinatarios,
      email_cc: emailsCc,
      email_bcc: [],
      mensagem,
      anexos,
    });
  }

  // 2) Envia
  for (const payload of payloads) {
    await deps.enviarEmail(payload);
  }

  return { enviados: payloads.length };
}

/** Empresa liberada: um bloco por banco que o cliente vê, no período atual de cada banco */
async function montarEmailPorBanco(
  empresaId: string,
  mes: MesAno,
  destinatarios: string[],
  emailsCc: string[],
  agora: Date,
  deps: DependenciasEnvioSaldoParcial
): Promise<PayloadEmailWebhook> {
  const { data: empresa, error } = await (supabase as any)
    .from('empresas')
    .select('nome_abreviado, nome_completo')
    .eq('id', empresaId)
    .maybeSingle();
  if (error) throw new Error(`Não foi possível carregar a empresa: ${error.message}`);
  const empresaNome = empresa?.nome_abreviado || empresa?.nome_completo || 'Cliente';

  const bancos = await controleSaldoParcialService.bancos(empresaId, mes);
  if (bancos.length === 0) {
    throw new Error('A empresa não tem banco de horas ativo que o cliente vê no mês');
  }
  const idioma = await controleSaldoParcialService.idiomaDoEmail(empresaId);
  const isEnglish = idioma === 'en';
  const opcoes = { t: criarTradutor(idioma), idioma };
  const chamados = await controleSaldoParcialService.chamados(empresaId, bancos);

  const imagemBase64 = await renderizarTabelas(
    deps,
    gerarHtmlRenderizacaoTabelas(gerarHtmlTabelasBancos(bancos, opcoes))
  );
  const urlImagem = await uploadImagemTabelas(imagemBase64, empresaNome);
  const mensagem = gerarHtmlEnvioComImagem(
    getTextoPadraoParcial(isEnglish, agora),
    isEnglish,
    urlImagem || `data:image/png;base64,${imagemBase64}`,
    agora
  );

  const hoje = partesDataSaoPaulo(agora);
  const excel = gerarExcelBancos(bancos, chamados, {
    ...opcoes,
    empresa: empresaNome,
    data: `${String(hoje.dia).padStart(2, '0')}.${String(hoje.mes).padStart(2, '0')}`,
  });

  return {
    nome: gerarAssuntoSaldoParcial(empresaNome, mes, agora),
    email: destinatarios,
    email_cc: emailsCc,
    email_bcc: [],
    mensagem,
    anexos: await uploadAnexosTemporarios([excel]),
  };
}

/** Imagem das tabelas é obrigatória: sem ela o e-mail não sai e o motivo vai para o histórico */
async function renderizarTabelas(
  deps: DependenciasEnvioSaldoParcial,
  html: string
): Promise<string> {
  let imagem: string | null;
  try {
    imagem = await deps.renderizarImagem(html);
  } catch (e) {
    throw new Error(
      `Não foi possível gerar a imagem das tabelas do Saldo Parcial: ${e instanceof Error ? e.message : String(e)}`
    );
  }
  if (!imagem) {
    throw new Error(
      'Não foi possível gerar a imagem das tabelas do Saldo Parcial: o serviço de renderização não devolveu imagem'
    );
  }
  return imagem;
}
