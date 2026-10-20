/**
 * Envio automático do Saldo Parcial de uma empresa.
 *
 * Mesmo resultado do envio manual com o texto padrão:
 * coleta os dados → renderiza as tabelas como imagem (obrigatória: sem imagem não envia) →
 * gera o Excel de consumo → sobe imagem e Excel para o storage → envia pelo webhook.
 * Renderização e envio são injetados: no servidor (sync-api) chamam o render-image
 * e o webhook diretamente.
 */

import { gerarExcelConsumoHoras } from '@/utils/gerarExcelConsumoHoras';
import { coletorSaldoParcialService } from './coletorSaldoParcial';
import {
  getTextoPadraoParcial,
  gerarAssuntoSaldoParcial,
  gerarHtmlTabelasSaldoParcial,
  gerarHtmlRenderizacaoTabelas,
  gerarHtmlEnvioComImagem
} from './emailSaldoParcial';
import { ANEXOS_VAZIOS, uploadAnexosTemporarios, uploadImagemTabelas, type AnexosWebhook } from './storageSaldoParcial';

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
  const preparados = await coletorSaldoParcialService.coletar(empresaId, agora);

  // 1) Monta todos os e-mails (contrato "ambos" tem dois); só envia se todos ficarem prontos
  const payloads: PayloadEmailWebhook[] = [];
  for (const { empresaNome, mesAno, dados } of preparados) {
    const texto = getTextoPadraoParcial(dados.isEnglish, agora);

    // Tabelas sempre como imagem (o HTML de tabela distorce conforme o cliente de e-mail)
    const imagemBase64 = await renderizarTabelas(deps, gerarHtmlRenderizacaoTabelas(gerarHtmlTabelasSaldoParcial(dados)));
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
      anexos
    });
  }

  // 2) Envia
  for (const payload of payloads) {
    await deps.enviarEmail(payload);
  }

  return { enviados: payloads.length };
}

/** Imagem das tabelas é obrigatória: sem ela o e-mail não sai e o motivo vai para o histórico */
async function renderizarTabelas(deps: DependenciasEnvioSaldoParcial, html: string): Promise<string> {
  let imagem: string | null;
  try {
    imagem = await deps.renderizarImagem(html);
  } catch (e) {
    throw new Error(`Não foi possível gerar a imagem das tabelas do Saldo Parcial: ${e instanceof Error ? e.message : String(e)}`);
  }
  if (!imagem) {
    throw new Error('Não foi possível gerar a imagem das tabelas do Saldo Parcial: o serviço de renderização não devolveu imagem');
  }
  return imagem;
}
