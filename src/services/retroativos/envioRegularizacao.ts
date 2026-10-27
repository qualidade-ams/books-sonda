/**
 * Pedido de regularização aos consultores (Apontamentos Retroativos): um e-mail por consultor,
 * como na tela atual. Quem recebeu tem os itens marcados como avisados, para toda a equipe ver;
 * quem não tem e-mail no cadastro de especialistas é pulado. Uma falha não para os outros envios.
 */
import { emailService, type EmailData } from '@/services/emailService';
import { retroativosService } from '@/services/retroativosService';
import {
  ASSUNTO_REGULARIZACAO,
  gerarHtmlRegularizacao,
  textoRegularizacao,
  type ItemRegularizacao,
} from './emailRegularizacao';

export interface EnvelopeRegularizacao {
  consultor: string;
  /** Do cadastro de especialistas; nulo: o consultor não recebe */
  email: string | null;
  itens: (ItemRegularizacao & {
    retroativoId: string;
    /** apontamentos_aranda.id ou apontamentos_tickets_aranda.id (marca o aviso) */
    itemId: string;
  })[];
}

export interface ResultadoRegularizacao {
  enviados: string[];
  semEmail: string[];
  falhas: { consultor: string; erro: string }[];
}

export interface DependenciasRegularizacao {
  enviarEmail: (dados: EmailData) => Promise<{ success: boolean; error?: string }>;
  registrarAviso: (retroativoId: string, itemIds: string[]) => Promise<void>;
}

const PADRAO: DependenciasRegularizacao = {
  enviarEmail: (dados) => emailService.sendEmail(dados),
  registrarAviso: (retroativoId, itemIds) =>
    retroativosService.registrarAviso(retroativoId, itemIds),
};

const mensagem = (erro: unknown) => (erro instanceof Error ? erro.message : 'erro desconhecido');

export async function pedirRegularizacao(
  { envelopes, copia }: { envelopes: EnvelopeRegularizacao[]; copia: string[] },
  dependencias: DependenciasRegularizacao = PADRAO
): Promise<ResultadoRegularizacao> {
  const resultado: ResultadoRegularizacao = { enviados: [], semEmail: [], falhas: [] };

  for (const envelope of envelopes) {
    if (!envelope.email) {
      resultado.semEmail.push(envelope.consultor);
      continue;
    }
    const texto = textoRegularizacao(envelope.consultor, envelope.itens.length);
    const envio = await dependencias
      .enviarEmail({
        to: [envelope.email],
        cc: copia.length ? copia : undefined,
        subject: ASSUNTO_REGULARIZACAO,
        html: gerarHtmlRegularizacao(envelope.itens, texto),
      })
      .catch((erro) => ({ success: false, error: mensagem(erro) }));
    if (!envio.success) {
      resultado.falhas.push({
        consultor: envelope.consultor,
        erro: envio.error || 'O e-mail não foi enviado.',
      });
      continue;
    }

    const porRetroativo = new Map<string, string[]>();
    for (const i of envelope.itens) {
      porRetroativo.set(i.retroativoId, [...(porRetroativo.get(i.retroativoId) ?? []), i.itemId]);
    }
    try {
      for (const [retroativoId, itemIds] of porRetroativo) {
        await dependencias.registrarAviso(retroativoId, itemIds);
      }
      resultado.enviados.push(envelope.consultor);
    } catch (erro) {
      resultado.falhas.push({
        consultor: envelope.consultor,
        erro: `O e-mail foi enviado, mas não ficou marcado como avisado: ${mensagem(erro)}`,
      });
    }
  }
  return resultado;
}
