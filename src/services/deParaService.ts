/**
 * De-para de Grupos (Modelagem_Fase3.md, seções 2.4 e 6): mantém `grupos_aranda`.
 * O gatilho da migration 20261022000006 copia cada mudança para a tabela atual
 * (de_para_categoria), lida por Book, Elogios, Pesquisas e Dashboard.
 *
 * "Excluir" grava ativo = false: o grupo volta para os não mapeados. Mapear de
 * novo reativa a mesma linha, porque o grupo do Aranda é único e não muda.
 */

import { supabase } from '@/integrations/supabase/client';
import type {
  ClassificacaoGrupo,
  DestinoGrupo,
  GrupoNaoMapeado,
  MapeamentoGrupo,
  MapeamentoInput,
  UsoGrupo,
} from '@/types/dePara';

type Cliente = typeof supabase;
type ErroBanco = { message: string; code?: string };

/** Meses da coluna Uso e da aba Não mapeados (seção 6) */
const MESES_USO = 6;
const MESES_NAO_MAPEADOS = 12;

function falha(contexto: string, error: ErroBanco): Error {
  if (error.code === '23505' && error.message.includes('grupos_aranda_grupo_aranda_key')) {
    return new Error('Este grupo do Aranda já está no de-para.');
  }
  return new Error(`Falha ao ${contexto}: ${error.message}`);
}

/** A classificação vem do nível mais fundo do destino */
export function classificar(destino: DestinoGrupo): ClassificacaoGrupo {
  if (destino.moduloId) return 'modulo';
  if (destino.produtoId) return 'produto';
  if (destino.solucaoId) return 'solucao';
  return 'nao_se_aplica';
}

const colunasDestino = (destino: DestinoGrupo) => ({
  solucao_id: destino.solucaoId,
  produto_id: destino.produtoId,
  modulo_id: destino.moduloId,
  classificacao: classificar(destino),
});

const chaveGrupo = (grupo: string) => grupo.trim().toLowerCase();

export class DeParaService {
  constructor(private readonly cliente: Cliente = supabase) {}

  async listar(): Promise<MapeamentoGrupo[]> {
    const { data, error } = await this.cliente
      .from('grupos_aranda')
      .select('*')
      .eq('ativo', true)
      .order('grupo_aranda');
    if (error) throw falha('carregar o de-para', error);
    return data.map((g) => ({
      id: g.id,
      grupoAranda: g.grupo_aranda,
      grupoBook: g.grupo_book,
      solucaoId: g.solucao_id,
      produtoId: g.produto_id,
      moduloId: g.modulo_id,
      classificacao: g.classificacao as ClassificacaoGrupo,
      atualizadoEm: g.updated_at,
      atualizadoPor: g.updated_by,
    }));
  }

  /** Uso de cada grupo com consumo no período, pelo id do grupo */
  async uso(): Promise<Record<string, UsoGrupo>> {
    const { data, error } = await this.cliente.rpc('grupos_aranda_uso', { p_meses: MESES_USO });
    if (error) throw falha('carregar o uso dos grupos', error);
    return Object.fromEntries(
      data.map((u) => [
        u.grupo_aranda_id,
        {
          apontamentos: u.apontamentos,
          tickets: u.tickets,
          empresasMultiplos: u.empresas_multiplos ?? [],
        },
      ])
    );
  }

  async naoMapeados(): Promise<GrupoNaoMapeado[]> {
    const { data, error } = await this.cliente.rpc('grupos_aranda_nao_mapeados', {
      p_meses: MESES_NAO_MAPEADOS,
    });
    if (error) throw falha('carregar os grupos não mapeados', error);
    return data.map((g) => ({
      grupoAranda: g.grupo_aranda,
      apontamentos: g.apontamentos,
      tickets: g.tickets,
      empresas: g.empresas ?? [],
      primeiraOcorrencia: g.primeira_ocorrencia,
    }));
  }

  async salvar(input: MapeamentoInput): Promise<void> {
    const campos = { grupo_book: input.grupoBook.trim(), ...colunasDestino(input.destino) };
    if (input.id) {
      const { error } = await this.cliente.from('grupos_aranda').update(campos).eq('id', input.id);
      if (error) throw falha('salvar o mapeamento', error);
      return;
    }

    const grupo = input.grupoAranda.trim();
    const { data: inativos, error: erroBusca } = await this.cliente
      .from('grupos_aranda')
      .select('id, grupo_aranda')
      .eq('ativo', false);
    if (erroBusca) throw falha('salvar o mapeamento', erroBusca);
    const excluido = inativos.find((g) => chaveGrupo(g.grupo_aranda) === chaveGrupo(grupo));

    const { error } = excluido
      ? await this.cliente
          .from('grupos_aranda')
          .update({ ...campos, ativo: true })
          .eq('id', excluido.id)
      : await this.cliente.from('grupos_aranda').insert({ ...campos, grupo_aranda: grupo });
    if (error) throw falha('salvar o mapeamento', error);
  }

  /**
   * Importação em lote: linha a linha, com a mesma regra do salvar (inclusive reativar o grupo
   * excluído). Sem transação: no erro, as linhas anteriores ficam gravadas e a mensagem diz o grupo
   */
  async importar(inputs: MapeamentoInput[]): Promise<void> {
    for (const input of inputs) {
      try {
        await this.salvar(input);
      } catch (erro) {
        throw new Error(`${input.grupoAranda.trim()}: ${(erro as Error).message}`);
      }
    }
  }

  /** Mesmo destino para vários grupos; o Grupo do Book de cada um não muda */
  async atribuirDestino(ids: string[], destino: DestinoGrupo): Promise<void> {
    const { error } = await this.cliente
      .from('grupos_aranda')
      .update(colunasDestino(destino))
      .in('id', ids);
    if (error) throw falha('atribuir o destino', error);
  }

  async excluir(id: string): Promise<void> {
    const { error } = await this.cliente
      .from('grupos_aranda')
      .update({ ativo: false })
      .eq('id', id);
    if (error) throw falha('excluir o mapeamento', error);
  }
}

export const deParaService = new DeParaService();
