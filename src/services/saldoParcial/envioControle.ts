/**
 * Envio manual do Saldo Parcial pelo Controle (decisão de 26/10/2026): um e-mail com um bloco por
 * banco e o Excel com os chamados de cada um, registrado no histórico de envios (migration 22).
 *
 * As tabelas vão como imagem, como no legado, para não distorcerem no Outlook; sem a imagem, vão
 * em HTML. Falha no envio também fica no histórico (e o sino avisa).
 */

import { emailService, type EmailData } from '@/services/emailService';
import { ErroTraduzivel } from '@/errors/erroTraduzivel';
import {
  controleSaldoParcialService,
  type ChamadoDoBanco,
  type SaldoParcialBanco,
} from '@/services/controleSaldoParcialService';
import { gerarExcelBancos, gerarHtmlTabelasBancos } from './conteudoBancos';
import {
  gerarHtmlCorpoComTabelas,
  gerarHtmlEnvioComImagem,
  gerarHtmlRenderizacaoTabelas,
  partesDataSaoPaulo,
} from './emailSaldoParcial';
import {
  uploadAnexosTemporarios,
  uploadImagemTabelas,
  type AnexosWebhook,
} from './storageSaldoParcial';

export interface DependenciasEnvio {
  chamados: (
    empresaId: string,
    bancos: SaldoParcialBanco[]
  ) => Promise<Record<string, ChamadoDoBanco[]>>;
  /** PNG das tabelas em base64, ou null se não der para gerar */
  renderizarImagem: (html: string) => Promise<string | null>;
  /** URL pública da imagem, ou null (o e-mail usa o base64) */
  subirImagem: (base64: string, empresaNome: string) => Promise<string | null>;
  subirAnexos: (arquivos: File[]) => Promise<AnexosWebhook>;
  enviarEmail: (dados: EmailData) => Promise<{ success: boolean; error?: string }>;
  registrar: (
    empresaId: string,
    envio: { sucesso: boolean; destinatarios: number; erro?: string }
  ) => Promise<void>;
}

export interface EnvioControleInput {
  empresaId: string;
  empresaNome: string;
  bancos: SaldoParcialBanco[];
  destinatarios: string[];
  copia: string[];
  assunto: string;
  texto: string;
  idioma: 'pt-BR' | 'en';
  /** Textos no idioma do e-mail */
  t: (chave: string, valores?: Record<string, unknown>) => string;
  agora?: Date;
}

/** Tabelas em PNG pelo endpoint do Puppeteer (o mesmo do envio atual) */
async function renderizarImagemTabelas(html: string): Promise<string | null> {
  try {
    const resposta = await fetch('/api/email/render-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ html, width: 1200 }),
    });
    if (!resposta.ok) return null;
    const dados = await resposta.json();
    return dados.success && dados.image ? dados.image : null;
  } catch {
    return null;
  }
}

export const PADRAO: DependenciasEnvio = {
  chamados: (empresaId, bancos) => controleSaldoParcialService.chamados(empresaId, bancos),
  renderizarImagem: renderizarImagemTabelas,
  subirImagem: uploadImagemTabelas,
  subirAnexos: (arquivos) => uploadAnexosTemporarios(arquivos),
  enviarEmail: (dados) => emailService.sendEmail(dados),
  registrar: (empresaId, envio) => controleSaldoParcialService.registrarEnvio(empresaId, envio),
};

/** O envio de teste da liberação (P7) não entra no histórico de envios da empresa */
export const semHistorico = (dependencias: DependenciasEnvio): DependenciasEnvio => ({
  ...dependencias,
  registrar: async () => undefined,
});

export async function enviarSaldoParcialControle(
  entrada: EnvioControleInput,
  dependencias: DependenciasEnvio = PADRAO
): Promise<void> {
  const agora = entrada.agora ?? new Date();
  const isEnglish = entrada.idioma === 'en';
  const opcoes = { t: entrada.t, idioma: entrada.idioma };
  const quantos = entrada.destinatarios.length + entrada.copia.length;

  try {
    const chamados = await dependencias.chamados(entrada.empresaId, entrada.bancos);
    const hoje = partesDataSaoPaulo(agora);
    const excel = gerarExcelBancos(entrada.bancos, chamados, {
      ...opcoes,
      empresa: entrada.empresaNome,
      data: `${String(hoje.dia).padStart(2, '0')}.${String(hoje.mes).padStart(2, '0')}`,
    });

    const tabelas = gerarHtmlTabelasBancos(entrada.bancos, opcoes);
    const imagem = await dependencias.renderizarImagem(gerarHtmlRenderizacaoTabelas(tabelas));
    let html: string;
    if (imagem) {
      const url = await dependencias.subirImagem(imagem, entrada.empresaNome);
      html = gerarHtmlEnvioComImagem(
        entrada.texto,
        isEnglish,
        url ?? `data:image/png;base64,${imagem}`,
        agora
      );
    } else {
      html = gerarHtmlCorpoComTabelas(entrada.texto, isEnglish, tabelas, agora);
    }

    const anexos = await dependencias.subirAnexos([excel]);
    const resultado = await dependencias.enviarEmail({
      to: entrada.destinatarios,
      cc: entrada.copia.length ? entrada.copia : undefined,
      subject: entrada.assunto,
      html,
      anexos,
    });
    if (!resultado.success)
      throw resultado.error
        ? new Error(resultado.error)
        : new ErroTraduzivel('erros.saldoParcial.naoEnviado', {}, 'O e-mail não foi enviado.');
  } catch (erro) {
    const mensagem = erro instanceof Error ? erro.message : 'O e-mail não foi enviado.';
    // A falha fica no histórico; se nem isso der, vale o erro do envio
    await dependencias
      .registrar(entrada.empresaId, { sucesso: false, destinatarios: quantos, erro: mensagem })
      .catch(() => undefined);
    throw erro instanceof Error ? erro : new Error(mensagem);
  }

  try {
    await dependencias.registrar(entrada.empresaId, { sucesso: true, destinatarios: quantos });
  } catch (erro) {
    const detalhe = erro instanceof Error ? erro.message : String(erro);
    throw new ErroTraduzivel(
      'erros.saldoParcial.semHistorico',
      { detalhe },
      `O e-mail foi enviado, mas não ficou no histórico de envios: ${detalhe}`
    );
  }
}
