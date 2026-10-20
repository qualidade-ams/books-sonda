import {
  FINALIDADE_ENVIO,
  FINALIDADE_ENVIO_OPTIONS,
  type FinalidadeEnvio
} from '@/types/clientBooksTypes';

/** Rótulo de exibição da finalidade; valor ausente é tratado como Book (padrão) */
export function getFinalidadeEnvioLabel(finalidade: string | null | undefined): string {
  const opcao = FINALIDADE_ENVIO_OPTIONS.find(o => o.value === finalidade);
  return opcao?.label ?? 'Book';
}

const semAcento = (texto: string) => texto.normalize('NFD').replace(/[̀-ͯ]/g, '');

/**
 * Converte o texto de uma célula (valor interno ou rótulo) para a finalidade.
 * Vazio ou desconhecido vira 'book', o comportamento padrão dos contatos.
 */
export function normalizarFinalidadeEnvio(valor: string | null | undefined): FinalidadeEnvio {
  const texto = semAcento(String(valor ?? '')).trim().toLowerCase().replace(/[\s_]+/g, '_');

  if (texto === FINALIDADE_ENVIO.SALDO_PARCIAL) return FINALIDADE_ENVIO.SALDO_PARCIAL;
  if (texto === FINALIDADE_ENVIO.AMBOS) return FINALIDADE_ENVIO.AMBOS;
  return FINALIDADE_ENVIO.BOOK;
}
