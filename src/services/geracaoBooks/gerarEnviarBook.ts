/**
 * Ciclo completo de um book na tela Geração de Books: gera o book do período →
 * gera o PDF → sobe PDF e Excel detalhado → envia para a Qualidade → registra o
 * envio (book fica "Enviado", imutável).
 *
 * Usado pelo botão de gerar/regenerar um book (navegador) e pela geração
 * automática do sync-api (pacote vendor/geracaoBooks.cjs). PDF e e-mail são
 * injetados: no navegador usam o Puppeteer da Vercel e o emailService; no
 * servidor chamam o mesmo endpoint de PDF e o webhook diretamente.
 */

import { supabase } from '@/integrations/supabase/client';
import { booksService } from '@/services/booksService';
import { booksVersioningService } from '@/services/booksVersioningService';
import { gerarExcelDetalhadoBook } from '@/utils/gerarExcelDetalhadoBook';
import { MESES_LABELS } from '@/types/books';
import type { AnexosWebhook } from '@/services/anexosTemporariosStorage';
import type { PayloadEmailWebhook } from '@/services/saldoParcial/executarSaldoParcial';

/** O book desta tela vai para a Qualidade; o disparo ao cliente é feito em Controle de Disparos */
export const DESTINATARIOS_BOOK_QUALIDADE = ['qualidadeams@sonda.com'];

const BUCKET_ANEXOS = 'anexos-temporarios';
const TIPO_PDF = 'application/pdf';
const TIPO_XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

export interface BookParaGeracao {
  empresa_id: string;
  empresa_nome: string;
  empresa_nome_abreviado?: string;
  dia_inicio_apuracao?: number;
  dia_fim_apuracao?: number;
}

export interface DependenciasGerarEnviarBook {
  /** Gera o PDF do book (rota /pdf/book/:id renderizada pelo Puppeteer) */
  gerarPdf(bookId: string): Promise<Blob>;
  /** Envia o e-mail; lança erro em caso de falha */
  enviarEmail(payload: PayloadEmailWebhook): Promise<void>;
  /**
   * Quem fica como "enviado por". Omitido = usuário logado (navegador);
   * no servidor é o usuário do clique ou o criador do agendamento (pode ser null).
   */
  responsavelId?: string | null;
}

/** O book foi gerado, mas o e-mail não saiu (o book continua "gerado", pode ser reenviado) */
export class ErroEnvioEmailBook extends Error {
  constructor(motivo: string) {
    super(`Book gerado, mas o envio do e-mail falhou: ${motivo}`);
    this.name = 'ErroEnvioEmailBook';
  }
}

export function sanitizarNomeArquivo(nome: string): string {
  return nome
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // Remove diacríticos (acentos)
    .replace(/[^a-zA-Z0-9_\-./]/g, '_'); // Substitui caracteres especiais por underscore
}

const mensagemDeErro = (e: unknown) => (e instanceof Error ? e.message : String(e ?? 'Erro desconhecido'));

async function subirAnexo(caminho: string, arquivo: Blob, contentType: string): Promise<string> {
  const { error } = await supabase.storage.from(BUCKET_ANEXOS).upload(caminho, arquivo, { contentType, upsert: true });
  if (error) throw new Error(error.message);

  const { data } = supabase.storage.from(BUCKET_ANEXOS).getPublicUrl(caminho);
  if (!data?.publicUrl) throw new Error('URL pública não gerada');
  return data.publicUrl;
}

export async function gerarEEnviarBook(
  book: BookParaGeracao,
  mes: number,
  ano: number,
  deps: DependenciasGerarEnviarBook
): Promise<{ bookId: string }> {
  const nomeAbreviado = book.empresa_nome_abreviado || book.empresa_nome;

  // 1. Gerar book no banco
  const lote = await booksService.gerarBooksLote({
    empresa_ids: [book.empresa_id],
    mes,
    ano,
    gerar_pdf: true,
    forcar_atualizacao: true
  });
  const gerado = lote.resultados.find((r) => r.sucesso && r.book_id);
  if (!gerado) {
    throw new Error(`Falha ao gerar book: ${lote.resultados[0]?.erro || 'Erro desconhecido na geração'}`);
  }
  const bookId = gerado.book_id!;

  // 2. Gerar PDF
  const nomeFormatado = nomeAbreviado.replace(/\s+/g, '_').toUpperCase();
  const mesFormatado = String(mes).padStart(2, '0');
  const mesNome = MESES_LABELS[mes];
  const assunto = `BOOK: ${nomeFormatado}_${ano}_${mesFormatado}. ${mesNome}`;
  const nomeArquivo = `Book_${nomeFormatado}_${mesNome}_${ano}.pdf`;
  const pastaStorage = `books-temp/${ano}/${mesFormatado}`;

  const pdf = await deps.gerarPdf(bookId);

  // 3. Upload do PDF (URL pública vai como anexo no e-mail)
  let urlPdf: string;
  try {
    urlPdf = await subirAnexo(`${pastaStorage}/${sanitizarNomeArquivo(nomeArquivo)}`, pdf, TIPO_PDF);
  } catch (e) {
    throw new Error(`Erro no upload do PDF: ${mensagemDeErro(e)}`);
  }

  const anexos: AnexosWebhook = {
    totalArquivos: 1,
    tamanhoTotal: pdf.size,
    arquivos: [{ url: urlPdf, nome: nomeArquivo, tipo: TIPO_PDF, tamanho: pdf.size, token: '' }]
  };

  // 4. Excel detalhado (8 abas) — opcional: falha não bloqueia o envio
  try {
    const excel = await gerarExcelDetalhadoBook({
      empresaId: book.empresa_id,
      empresaNome: nomeAbreviado,
      mes,
      ano,
      diaInicioApuracao: book.dia_inicio_apuracao ?? 1,
      diaFimApuracao: book.dia_fim_apuracao ?? 0
    });
    if (excel) {
      const urlExcel = await subirAnexo(`${pastaStorage}/${sanitizarNomeArquivo(excel.name)}`, excel, TIPO_XLSX);
      anexos.arquivos.push({ url: urlExcel, nome: excel.name, tipo: TIPO_XLSX, tamanho: excel.size, token: '' });
      anexos.totalArquivos += 1;
      anexos.tamanhoTotal += excel.size;
    }
  } catch (e) {
    console.warn('⚠️ Excel detalhado não anexado (não bloqueia envio):', mensagemDeErro(e));
  }

  // 5. Enviar e-mail com PDF + Excel
  try {
    await deps.enviarEmail({
      nome: assunto,
      email: DESTINATARIOS_BOOK_QUALIDADE,
      email_cc: [],
      email_bcc: [],
      mensagem: `<p>Segue em anexo o Book de <strong>${nomeAbreviado}</strong> referente a <strong>${mesNome}/${ano}</strong>.</p>`,
      anexos
    });
  } catch (e) {
    throw new ErroEnvioEmailBook(mensagemDeErro(e));
  }

  // 6. Registrar envio no versionamento (trava o book como "Enviado")
  const registro = await booksVersioningService.registrarEnvio(
    bookId,
    DESTINATARIOS_BOOK_QUALIDADE,
    deps.responsavelId === undefined ? undefined : { usuarioId: deps.responsavelId }
  );
  if (!registro.success) {
    throw new Error(`Book enviado, mas não foi possível registrar o envio: ${registro.error || 'erro desconhecido'}`);
  }

  return { bookId };
}
