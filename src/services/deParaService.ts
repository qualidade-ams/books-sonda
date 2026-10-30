/**
 * De-para de Grupos (Modelagem_Fase3.md, seções 2.4 e 6): mantém `grupos_aranda`.
 * O gatilho da migration 20261022000006 copia cada mudança para a tabela atual
 * (de_para_categoria), lida por Book, Elogios, Pesquisas e Dashboard.
 *
 * Os lugares do grupo no catálogo ficam em `grupos_aranda_vinculos` (migration
 * 20261030000001): o grupo pode estar em vários, um por produto e um serviço por
 * solução. A gravação é pelas funções do banco, que guardam essa regra; as colunas de
 * destino de `grupos_aranda` são só o espelho do primeiro vínculo.
 *
 * "Excluir" grava ativo = false: o grupo volta para os não mapeados. Mapear de
 * novo reativa a mesma linha, porque o grupo do Aranda é único e não muda.
 */

import { supabase } from '@/integrations/supabase/client';
import { ErroTraduzivel, falhaDoBanco } from '@/errors/erroTraduzivel';
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
type Linha = Record<string, any>;

/** Meses da coluna Uso e da aba Não mapeados (seção 6) */
const MESES_USO = 6;
const MESES_NAO_MAPEADOS = 12;

const NENHUM: DestinoGrupo = { solucaoId: null, produtoId: null, moduloId: null };

function falha(contexto: string, error: ErroBanco): Error {
  if (error.code === '23505' && error.message.includes('grupos_aranda_grupo_aranda_key')) {
    return new ErroTraduzivel(
      'erros.dePara.grupoJaMapeado',
      {},
      'Este grupo do Aranda já está no de-para.'
    );
  }
  return falhaDoBanco(contexto, error);
}

/** A classificação vem do nível mais fundo do destino */
export function classificar(destino: DestinoGrupo): ClassificacaoGrupo {
  if (destino.moduloId) return 'modulo';
  if (destino.produtoId) return 'produto';
  if (destino.solucaoId) return 'solucao';
  return 'nao_se_aplica';
}

const argsDestino = (destino: DestinoGrupo) => ({
  p_solucao: destino.solucaoId,
  p_produto: destino.produtoId,
  p_modulo: destino.moduloId,
});

/** Do mais antigo ao mais novo: o primeiro é o principal */
const vinculosDoGrupo = (g: Linha): DestinoGrupo[] =>
  [...(g.grupos_aranda_vinculos ?? [])]
    .sort((a: Linha, b: Linha) => String(a.created_at).localeCompare(String(b.created_at)))
    .map((v: Linha) => ({
      solucaoId: v.solucao_id,
      produtoId: v.produto_id,
      moduloId: v.modulo_id,
    }));

const chaveGrupo = (grupo: string) => grupo.trim().toLowerCase();

export class DeParaService {
  constructor(private readonly cliente: Cliente = supabase) {}

  async listar(): Promise<MapeamentoGrupo[]> {
    const { data, error } = await this.cliente
      .from('grupos_aranda')
      .select('*, grupos_aranda_vinculos(solucao_id, produto_id, modulo_id, created_at)')
      .eq('ativo', true)
      .order('grupo_aranda');
    if (error) throw falha('carregar o de-para', error);
    return (data as Linha[]).map((g) => {
      const vinculos = vinculosDoGrupo(g);
      const principal = vinculos[0] ?? NENHUM;
      return {
        id: g.id,
        grupoAranda: g.grupo_aranda,
        grupoBook: g.grupo_book,
        ...principal,
        classificacao: classificar(principal),
        vinculos,
        atualizadoEm: g.updated_at,
        atualizadoPor: g.updated_by,
      };
    });
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

  /** Grava o grupo e, com destino, troca os vínculos dele por esse destino */
  async salvar(input: MapeamentoInput): Promise<void> {
    const id = await this.gravarGrupo(input, input.grupoBook.trim());
    if (!input.destino) return;
    const { error } = await this.cliente.rpc('grupos_aranda_vincular', {
      p_grupos: [id],
      ...argsDestino(input.destino),
      p_substituir: true,
    });
    if (error) throw falha('salvar o mapeamento', error);
  }

  private async gravarGrupo(input: MapeamentoInput, grupoBook: string): Promise<string> {
    if (input.id) {
      const { error } = await this.cliente
        .from('grupos_aranda')
        .update({ grupo_book: grupoBook })
        .eq('id', input.id);
      if (error) throw falha('salvar o mapeamento', error);
      return input.id;
    }

    const grupo = input.grupoAranda.trim();
    const { data: inativos, error: erroBusca } = await this.cliente
      .from('grupos_aranda')
      .select('id, grupo_aranda')
      .eq('ativo', false);
    if (erroBusca) throw falha('salvar o mapeamento', erroBusca);
    const excluido = inativos.find((g) => chaveGrupo(g.grupo_aranda) === chaveGrupo(grupo));

    if (excluido) {
      const { error } = await this.cliente
        .from('grupos_aranda')
        .update({ grupo_book: grupoBook, ativo: true })
        .eq('id', excluido.id);
      if (error) throw falha('salvar o mapeamento', error);
      return excluido.id;
    }

    // O grupo nasce sem lugar; os vínculos vêm logo depois, pela função do banco
    const { data, error } = await this.cliente
      .from('grupos_aranda')
      .insert({ grupo_aranda: grupo, grupo_book: grupoBook, classificacao: 'nao_se_aplica' })
      .select('id')
      .single();
    if (error) throw falha('salvar o mapeamento', error);
    return data.id;
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
        throw new ErroTraduzivel(
          'erros.daLinha',
          { linha: input.grupoAranda.trim(), erro },
          `${input.grupoAranda.trim()}: ${(erro as Error).message}`
        );
      }
    }
  }

  /** De-para: o mesmo destino para vários grupos, no lugar dos vínculos de cada um */
  async atribuirDestino(ids: string[], destino: DestinoGrupo): Promise<void> {
    const { error } = await this.cliente.rpc('grupos_aranda_vincular', {
      p_grupos: ids,
      ...argsDestino(destino),
      p_substituir: true,
    });
    if (error) throw falha('atribuir o destino', error);
  }

  /** Produtos e Módulos: acrescenta o lugar; outro módulo do mesmo produto move o grupo */
  async vincular(ids: string[], destino: DestinoGrupo): Promise<void> {
    const { error } = await this.cliente.rpc('grupos_aranda_vincular', {
      p_grupos: ids,
      ...argsDestino(destino),
      p_substituir: false,
    });
    if (error) throw falha('vincular os grupos', error);
  }

  /** Tira só este lugar; do módulo, o grupo fica no produto inteiro */
  async desvincular(ids: string[], destino: DestinoGrupo): Promise<void> {
    const { error } = await this.cliente.rpc('grupos_aranda_desvincular', {
      p_grupos: ids,
      ...argsDestino(destino),
    });
    if (error) throw falha('desvincular os grupos', error);
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
