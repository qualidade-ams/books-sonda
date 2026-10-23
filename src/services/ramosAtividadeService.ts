/**
 * Ramos de Atividade (Modelagem_Fase3.md, seção 6). A tela edita a lista como
 * rascunho e salva tudo de uma vez: o service compara o rascunho com o banco.
 *
 * Exclusão só de ramo sem uso: a FK RESTRICT de empresas_informacoes_contrato
 * (principal e secundário) recusa o que está em uso, e o ramo é inativado.
 */

import { supabase } from '@/integrations/supabase/client';
import type { RamoRascunho, RamosAtividade } from '@/types/ramosAtividade';

type Cliente = typeof supabase;
type ErroBanco = { message: string; code?: string };

function falha(contexto: string, error: ErroBanco): Error {
  if (error.code === '23505' && error.message.includes('ramos_atividade_nome_uq')) {
    return new Error('Já existe um ramo com este nome.');
  }
  return new Error(`Falha ao ${contexto}: ${error.message}`);
}

export class RamosAtividadeService {
  constructor(private readonly cliente: Cliente = supabase) {}

  async listar(): Promise<RamosAtividade> {
    const [ramos, contratos, empresas] = await Promise.all([
      this.cliente.from('ramos_atividade').select('*').order('ordem'),
      this.cliente
        .from('empresas_informacoes_contrato')
        .select('ramo_atividade_id, ramo_secundario_id'),
      this.cliente.from('empresas').select('id'),
    ]);
    const erro = ramos.error ?? contratos.error ?? empresas.error;
    if (erro) throw falha('carregar os ramos', erro);

    const contar = (coluna: 'ramo_atividade_id' | 'ramo_secundario_id', id: string) =>
      contratos.data.filter((c) => c[coluna] === id).length;

    return {
      totalEmpresas: empresas.data.length,
      ramos: ramos.data.map((r) => ({
        id: r.id,
        nome: r.nome,
        ordem: r.ordem,
        ativo: r.ativo,
        empresasPrincipal: contar('ramo_atividade_id', r.id),
        empresasSecundario: contar('ramo_secundario_id', r.id),
        atualizadoEm: r.updated_at,
        atualizadoPor: r.updated_by,
      })),
    };
  }

  /** Grava o rascunho inteiro: a posição na lista é a ordem; o que saiu é excluído */
  async salvar(rascunho: RamoRascunho[]): Promise<void> {
    if (rascunho.some((r) => !r.nome.trim())) throw new Error('Digite o nome do ramo.');

    const { data: salvos, error: erroLista } = await this.cliente
      .from('ramos_atividade')
      .select('id, nome, ordem, ativo');
    if (erroLista) throw falha('salvar os ramos', erroLista);

    const mantidos = new Set(rascunho.filter((r) => r.id).map((r) => r.id));
    for (const ramo of salvos.filter((s) => !mantidos.has(s.id))) {
      const { error } = await this.cliente.from('ramos_atividade').delete().eq('id', ramo.id);
      if (error?.code === '23503') {
        throw new Error(`O ramo ${ramo.nome} está em uso nas empresas: inative em vez de excluir.`);
      }
      if (error) throw falha('excluir o ramo', error);
    }

    for (const [i, r] of rascunho.entries()) {
      const campos = { nome: r.nome.trim(), ativo: r.ativo, ordem: i + 1 };
      const atual = salvos.find((s) => s.id === r.id);
      if (atual) {
        if (
          atual.nome === campos.nome &&
          atual.ativo === campos.ativo &&
          atual.ordem === campos.ordem
        )
          continue;
        const { error } = await this.cliente.from('ramos_atividade').update(campos).eq('id', r.id);
        if (error) throw falha('salvar o ramo', error);
      } else {
        const { error } = await this.cliente.from('ramos_atividade').insert(campos);
        if (error) throw falha('incluir o ramo', error);
      }
    }
  }
}

export const ramosAtividadeService = new RamosAtividadeService();
