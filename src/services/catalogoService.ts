/**
 * Catálogo em três níveis: Solução › Produto › Módulo (Modelagem_Fase3.md, seção 2),
 * e a correspondência dos módulos de requerimento. Tela Produtos e Módulos.
 *
 * As regras que não podem ser burladas ficam no banco (gatilhos da migration
 * 20261022000002): código imutável, produto "A classificar" e troca de produto do
 * módulo. As mensagens deles chegam ao usuário como estão.
 */

import { supabase } from '@/integrations/supabase/client';
import { ErroTraduzivel, falhaDoBanco } from '@/errors/erroTraduzivel';
import type {
  Catalogo,
  LinhaImportacaoCatalogo,
  Modulo,
  ModuloInput,
  ModuloRequerimento,
  Produto,
  ProdutoInput,
  Solucao,
  SolucaoInput,
  UsoEmBanco,
} from '@/types/catalogo';

type Cliente = typeof supabase;
type ErroBanco = { message: string; code?: string };

/** Unicidades violadas que têm mensagem própria */
const DUPLICADOS: Record<string, [chave: string, mensagem: string]> = {
  solucoes_nome_uq: ['erros.catalogo.solucaoRepetida', 'Já existe uma solução com este nome.'],
  solucoes_codigo_key: ['erros.catalogo.codigoRepetido', 'Já existe uma solução com este código.'],
  produto_modulos_nome_uq: [
    'erros.catalogo.moduloRepetido',
    'Já existe um módulo com este nome no produto.',
  ],
};

function falha(contexto: string, error: ErroBanco): Error {
  if (error.code === '23505') {
    const restricao = Object.keys(DUPLICADOS).find((r) => error.message.includes(r));
    if (restricao)
      return new ErroTraduzivel(DUPLICADOS[restricao][0], {}, DUPLICADOS[restricao][1]);
  }
  return falhaDoBanco(contexto, error);
}

const textoOuNulo = (texto: string | null) => texto?.trim() || null;

/** Código do produto a partir do nome: sem acento, maiúsculas, palavras unidas por "_" */
function codigoDoNome(nome: string, usados: Set<string>): string {
  const base = nome
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
  let codigo = base;
  for (let n = 2; usados.has(codigo); n++) codigo = `${base}_${n}`;
  return codigo;
}

const proximaOrdem = (linhas: { ordem: number }[]) =>
  linhas.reduce((max, l) => Math.max(max, l.ordem), 0) + 1;

const autoria = (l: { updated_at: string; updated_by: string | null }) => ({
  atualizadoEm: l.updated_at,
  atualizadoPor: l.updated_by,
});

export class CatalogoService {
  constructor(private readonly cliente: Cliente = supabase) {}

  async carregar(): Promise<Catalogo> {
    const [solucoes, produtos, modulos] = await Promise.all([
      this.cliente.from('solucoes').select('*').order('ordem'),
      this.cliente.from('produtos').select('*').order('solucao_id').order('ordem'),
      this.cliente.from('produto_modulos').select('*').order('produto_id').order('ordem'),
    ]);
    const erro = solucoes.error ?? produtos.error ?? modulos.error;
    if (erro) throw falha('carregar o catálogo', erro);

    return {
      solucoes: solucoes.data.map((s): Solucao => ({
        id: s.id,
        codigo: s.codigo,
        nome: s.nome,
        ordem: s.ordem,
        ativo: s.ativo,
        ...autoria(s),
      })),
      produtos: produtos.data.map((p): Produto => ({
        id: p.id,
        solucaoId: p.solucao_id,
        codigo: p.codigo,
        nome: p.nome,
        descricao: p.descricao,
        ordem: p.ordem,
        ativo: p.ativo,
        aClassificar: p.a_classificar,
        ...autoria(p),
      })),
      modulos: modulos.data.map((m): Modulo => ({
        id: m.id,
        produtoId: m.produto_id,
        nome: m.nome,
        descricao: m.descricao,
        ordem: m.ordem,
        ativo: m.ativo,
        ...autoria(m),
      })),
    };
  }

  async salvarSolucao(input: SolucaoInput): Promise<void> {
    const campos = { nome: input.nome.trim(), ativo: input.ativo };
    if (input.id) {
      const { error } = await this.cliente.from('solucoes').update(campos).eq('id', input.id);
      if (error) throw falha('salvar a solução', error);
      return;
    }
    const { data, error: erroOrdem } = await this.cliente.from('solucoes').select('ordem');
    if (erroOrdem) throw falha('salvar a solução', erroOrdem);
    const { error } = await this.cliente.from('solucoes').insert({
      ...campos,
      codigo: (input.codigo ?? '').trim().toUpperCase(),
      ordem: proximaOrdem(data),
    });
    if (error) throw falha('salvar a solução', error);
  }

  async salvarProduto(input: ProdutoInput): Promise<void> {
    const campos = {
      solucao_id: input.solucaoId,
      nome: input.nome.trim(),
      descricao: textoOuNulo(input.descricao),
      ativo: input.ativo,
    };
    if (input.id) {
      const { error } = await this.cliente.from('produtos').update(campos).eq('id', input.id);
      if (error) throw falha('salvar o produto', error);
      return;
    }
    const { data, error: erroLista } = await this.cliente
      .from('produtos')
      .select('codigo, solucao_id, ordem');
    if (erroLista) throw falha('salvar o produto', erroLista);
    const { error } = await this.cliente.from('produtos').insert({
      ...campos,
      codigo: codigoDoNome(campos.nome, new Set(data.map((p) => p.codigo))),
      ordem: proximaOrdem(data.filter((p) => p.solucao_id === input.solucaoId)),
    });
    if (error) throw falha('salvar o produto', error);
  }

  /**
   * Importação em lote, na ordem das linhas (vira a ordem dos novos): acha o produto pelo nome
   * na solução, e o módulo no produto, sem diferenciar maiúsculas; o que não existe é criado.
   * Sem transação: no erro, as linhas anteriores ficam gravadas e a mensagem diz qual linha
   */
  async importar(linhas: LinhaImportacaoCatalogo[]): Promise<void> {
    for (const linha of linhas) {
      try {
        await this.importarLinha(linha);
      } catch (erro) {
        const rotulo = linha.modulo
          ? `${linha.produto.trim()} › ${linha.modulo.trim()}`
          : linha.produto.trim();
        throw new ErroTraduzivel(
          'erros.daLinha',
          { linha: rotulo, erro },
          `${rotulo}: ${(erro as Error).message}`
        );
      }
    }
  }

  private async importarLinha(l: LinhaImportacaoCatalogo): Promise<void> {
    const mesmoNome = (a: string, b: string) => a.trim().toLowerCase() === b.trim().toLowerCase();
    const buscarProduto = async () => {
      const { data, error } = await this.cliente
        .from('produtos')
        .select('id, nome, descricao, ativo')
        .eq('solucao_id', l.solucaoId);
      if (error) throw falha('importar o produto', error);
      return data.find((p) => mesmoNome(p.nome, l.produto));
    };

    let produto = await buscarProduto();
    if (!produto) {
      await this.salvarProduto({
        solucaoId: l.solucaoId,
        nome: l.produto,
        descricao: l.modulo ? null : l.descricao,
        ativo: true,
      });
      produto = await buscarProduto();
    } else if (!l.modulo && l.descricao && l.descricao !== produto.descricao) {
      await this.salvarProduto({
        id: produto.id,
        solucaoId: l.solucaoId,
        nome: produto.nome,
        descricao: l.descricao,
        ativo: produto.ativo,
      });
    }
    if (!l.modulo) return;

    const { data: modulos, error } = await this.cliente
      .from('produto_modulos')
      .select('id, nome, descricao, ativo')
      .eq('produto_id', produto.id);
    if (error) throw falha('importar o módulo', error);
    const modulo = modulos.find((m) => mesmoNome(m.nome, l.modulo));
    if (!modulo) {
      await this.salvarModulo({
        produtoId: produto.id,
        nome: l.modulo,
        descricao: l.descricao,
        ativo: true,
      });
    } else if (l.descricao && l.descricao !== modulo.descricao) {
      await this.salvarModulo({
        id: modulo.id,
        produtoId: produto.id,
        nome: modulo.nome,
        descricao: l.descricao,
        ativo: modulo.ativo,
      });
    }
  }

  /** Grava a ordem dos produtos de uma solução, na sequência recebida */
  async reordenarProdutos(produtoIds: string[]): Promise<void> {
    for (const [i, id] of produtoIds.entries()) {
      const { error } = await this.cliente
        .from('produtos')
        .update({ ordem: i + 1 })
        .eq('id', id);
      if (error) throw falha('reordenar os produtos', error);
    }
  }

  /** O produto do módulo não muda por aqui: só "A classificar" muda, por moverModulo */
  async salvarModulo(input: ModuloInput): Promise<void> {
    const campos = {
      nome: input.nome.trim(),
      descricao: textoOuNulo(input.descricao),
      ativo: input.ativo,
    };
    if (input.id) {
      const { error } = await this.cliente
        .from('produto_modulos')
        .update(campos)
        .eq('id', input.id);
      if (error) throw falha('salvar o módulo', error);
      return;
    }
    const { data, error: erroOrdem } = await this.cliente
      .from('produto_modulos')
      .select('ordem')
      .eq('produto_id', input.produtoId);
    if (erroOrdem) throw falha('salvar o módulo', erroOrdem);
    const { error } = await this.cliente
      .from('produto_modulos')
      .insert({ ...campos, produto_id: input.produtoId, ordem: proximaOrdem(data) });
    if (error) throw falha('salvar o módulo', error);
  }

  /**
   * Leva um módulo "A classificar" para o produto certo, da mesma solução (P8). O
   * produto provisório que fica sem módulos ativos é inativado.
   */
  async moverModulo(
    moduloId: string,
    produtoId: string
  ): Promise<{ provisorioInativado: boolean }> {
    const { data: modulo, error: erroModulo } = await this.cliente
      .from('produto_modulos')
      .select('produto_id')
      .eq('id', moduloId)
      .single();
    if (erroModulo) throw falha('mover o módulo', erroModulo);

    const { error } = await this.cliente
      .from('produto_modulos')
      .update({ produto_id: produtoId })
      .eq('id', moduloId);
    if (error) throw falha('mover o módulo', error);

    const origem = modulo.produto_id;
    const { data: restantes, error: erroRestantes } = await this.cliente
      .from('produto_modulos')
      .select('id')
      .eq('produto_id', origem)
      .eq('ativo', true);
    if (erroRestantes) throw falha('mover o módulo', erroRestantes);
    if (restantes.length > 0) return { provisorioInativado: false };

    const { data: inativados, error: erroInativar } = await this.cliente
      .from('produtos')
      .update({ ativo: false })
      .eq('id', origem)
      .eq('a_classificar', true)
      .select('id');
    if (erroInativar) throw falha('inativar o produto "A classificar"', erroInativar);
    return { provisorioInativado: inativados.length > 0 };
  }

  /** Bancos ativos que alcançam cada produto ou módulo (avisos de inativação) */
  async usosEmBancos(): Promise<UsoEmBanco[]> {
    const { data, error } = await this.cliente
      .from('bancos_horas_escopo')
      .select(
        'produto_id, modulo_id, bancos_horas!inner(id, nome, ativo, empresas(nome_abreviado))'
      );
    if (error) throw falha('carregar os bancos que usam o catálogo', error);
    return data
      .filter((e) => e.bancos_horas.ativo)
      .map((e) => ({
        produtoId: e.produto_id,
        moduloId: e.modulo_id,
        bancoId: e.bancos_horas.id,
        banco: e.bancos_horas.nome,
        empresa: e.bancos_horas.empresas?.nome_abreviado ?? '',
      }));
  }

  async modulosRequerimento(): Promise<ModuloRequerimento[]> {
    const { data, error } = await this.cliente
      .from('modulos_requerimento_produto')
      .select('id, modulo_requerimento, produto_id, modulo_id')
      .order('modulo_requerimento');
    if (error) throw falha('carregar os módulos de requerimento', error);
    return data.map((r) => ({
      id: r.id,
      moduloRequerimento: r.modulo_requerimento,
      produtoId: r.produto_id,
      moduloId: r.modulo_id,
    }));
  }

  async salvarModuloRequerimento(
    id: string,
    produtoId: string,
    moduloId: string | null
  ): Promise<void> {
    const { error } = await this.cliente
      .from('modulos_requerimento_produto')
      .update({ produto_id: produtoId, modulo_id: moduloId })
      .eq('id', id);
    if (error) throw falha('salvar o módulo de requerimento', error);
  }
}

export const catalogoService = new CatalogoService();
