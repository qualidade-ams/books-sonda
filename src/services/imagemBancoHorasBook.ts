/**
 * Imagem do banco de horas no e-mail do Book da empresa liberada (Fase 5, Modelagem_Fase5.md
 * seção 7): uma tabela por banco na mesma imagem, montada do snapshot do Book do mês
 * (books_consumo_bancos). Não recalcula nada: a imagem mostra o que o Book mostra.
 *
 * Empresa em Legado: nulo, e o e-mail segue com a imagem atual (bancoHorasTableService).
 */

import { supabase } from '@/integrations/supabase/client';
import { falhaDoBanco } from '@/errors/erroTraduzivel';
import type { MesAno } from '@/services/bancosHoras/calculo';
import {
  bookConsumoBancosService,
  type LinhaConsumoBook,
} from '@/services/bookConsumoBancosService';
import { chaveMes } from '@/services/controleBancoHorasService';
import type { SaldoParcialBanco } from '@/services/controleSaldoParcialService';
import { geracaoBookLiberada } from '@/services/geracaoBookLiberada';
import {
  gerarHtmlTabelasBancos,
  type OpcoesConteudo,
} from '@/services/saldoParcial/conteudoBancos';
import { gerarHtmlRenderizacaoTabelas } from '@/services/saldoParcial/emailSaldoParcial';
import { uploadImagemTabelas } from '@/services/saldoParcial/storageSaldoParcial';
import { criarTradutor } from '@/i18n/tradutor';

export interface DependenciasImagemBook {
  noModeloNovo: (empresaId: string, mes: MesAno) => Promise<boolean>;
  /** Id do Book da empresa no mês */
  bookDoMes: (empresaId: string, mes: MesAno) => Promise<string | null>;
  doBook: (bookId: string) => Promise<LinhaConsumoBook[]>;
  tabelas: (bancos: SaldoParcialBanco[], opcoes: OpcoesConteudo) => string;
  /** PNG das tabelas em base64, ou null se não der para gerar */
  renderizar: (html: string) => Promise<string | null>;
  /** URL pública da imagem, ou null */
  subir: (base64: string, empresaNome: string) => Promise<string | null>;
}

/** O snapshot do Book no formato das tabelas do Saldo Parcial (conteudoBancos) */
export const bancosDoSnapshot = (linhas: LinhaConsumoBook[]): SaldoParcialBanco[] =>
  linhas.map((l) => ({
    bancoId: l.banco_id,
    nome: l.nome_banco,
    tipoContrato: l.dados.tipoContrato,
    // O aviso de saldo coberto pelos outros bancos é do Saldo Parcial, durante o período
    consomeOutrosBancos: false,
    meses: l.dados.meses.map((m) => ({
      mes: m.mes,
      chave: chaveMes(m.mes),
      situacao: m.situacao,
      resultado: m.resultado ?? undefined,
    })),
    requerimentos: l.dados.requerimentos,
    reajustes: l.dados.reajustes,
    observacoes: l.dados.observacoes,
  }));

async function bookDoMes(empresaId: string, mes: MesAno): Promise<string | null> {
  const { data, error } = await (supabase as any)
    .from('books')
    .select('id')
    .eq('empresa_id', empresaId)
    .eq('mes', mes.mes)
    .eq('ano', mes.ano)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw falhaDoBanco('carregar o Book do mês', error);
  return data?.id ?? null;
}

/** Tabelas em PNG pelo endpoint do Puppeteer (o mesmo da imagem atual) */
async function renderizar(html: string): Promise<string | null> {
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

const PADRAO: DependenciasImagemBook = {
  noModeloNovo: (empresaId, mes) => geracaoBookLiberada.noModeloNovo(empresaId, mes),
  bookDoMes,
  doBook: (bookId) => bookConsumoBancosService.doBook(bookId),
  tabelas: gerarHtmlTabelasBancos,
  renderizar,
  subir: uploadImagemTabelas,
};

export async function imagemBancoHorasDoBook(
  entrada: MesAno & { empresaId: string; empresaNome: string; idioma: 'pt-BR' | 'en' },
  dependencias: DependenciasImagemBook = PADRAO
): Promise<{ url: string | null; html: string } | null> {
  const mes = { mes: entrada.mes, ano: entrada.ano };
  if (!(await dependencias.noModeloNovo(entrada.empresaId, mes))) return null;

  const bookId = await dependencias.bookDoMes(entrada.empresaId, mes);
  const linhas = bookId ? await dependencias.doBook(bookId) : [];
  if (linhas.length === 0) {
    throw new Error(
      'O Book do mês não tem o consumo por banco: gere o Book de novo antes de enviar o e-mail.'
    );
  }

  const html = dependencias.tabelas(bancosDoSnapshot(linhas), {
    t: criarTradutor(entrada.idioma),
    idioma: entrada.idioma,
  });
  const imagem = await dependencias.renderizar(gerarHtmlRenderizacaoTabelas(html));
  if (!imagem) return { url: null, html };
  return { url: await dependencias.subir(imagem, entrada.empresaNome), html };
}

/** Troca {{bancoHoras.imagemUrl}} e {{bancoHoras.imagem}} no corpo do e-mail do Book */
export function aplicarImagemNoCorpo(
  corpo: string,
  resultado: { url: string | null; html: string },
  empresaNome: string
): string {
  const largura = 700;
  const imagem = resultado.url
    ? `<img src="${resultado.url}" alt="Banco de Horas - ${empresaNome}" width="${largura}" style="display:block;width:100%;max-width:${largura}px;height:auto;border:0;margin:8px 0;" />`
    : resultado.html;
  return corpo
    .replace(/\{\{bancoHoras\.imagemUrl\}\}/g, resultado.url ?? '')
    .replace(/\{\{bancoHoras\.imagem\}\}/g, imagem);
}
