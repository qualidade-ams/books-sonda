/**
 * Serviço da tela "Envio Automático de Saldo Parcial".
 *
 * - Agendamentos e clientes vinculados: CRUD direto no Supabase, protegido por RLS.
 * - Execuções: só leitura; quem grava é o sync-api.
 * - executarAgora / preverExecucoes / statusSyncApi: chamam o sync-api com o token
 *   da sessão, que valida a permissão na tela antes de agir.
 */

import { supabase } from '@/integrations/supabase/client';
import { chamarSyncApi } from '@/services/syncAgendamentosService';
import type {
  AgendamentoSaldoParcial,
  AgendamentoSaldoParcialInput,
  ClienteElegivelSaldoParcial,
  ExecucaoSaldoParcial,
} from '@/types/envioSaldoParcial';
import type { RegraRecorrencia } from '@/types/syncAgendamentos';
import { FINALIDADES_SALDO_PARCIAL } from '@/types/clientBooksTypes';

// Tabelas novas ainda não estão no types.ts gerado
const db = supabase as any;

const TABELA_AGENDAMENTOS = 'banco_horas_envio_agendamentos';
const TABELA_VINCULOS = 'banco_horas_envio_agendamento_empresas';
const CODIGO_VIOLACAO_UNICA = '23505';

function erroVinculo(error: { code?: string; message?: string }): Error {
  if (error.code === CODIGO_VIOLACAO_UNICA) {
    return new Error('Um dos clientes selecionados já está em outro agendamento de Saldo Parcial');
  }
  return new Error(`Erro ao vincular clientes ao agendamento: ${error.message}`);
}

class EnvioSaldoParcialService {
  async listarAgendamentos(): Promise<AgendamentoSaldoParcial[]> {
    const { data, error } = await db
      .from(TABELA_AGENDAMENTOS)
      .select(`*, empresas:${TABELA_VINCULOS}(empresa_id)`)
      .order('created_at', { ascending: true });
    if (error) throw error;
    return data || [];
  }

  async criarAgendamento(input: AgendamentoSaldoParcialInput): Promise<void> {
    const { empresaIds, ...dados } = input;
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data: criado, error } = await db
      .from(TABELA_AGENDAMENTOS)
      .insert({ ...dados, created_by: user?.id ?? null })
      .select('id')
      .single();
    if (error) throw error;

    if (empresaIds.length > 0) {
      const { error: erroVinc } = await db
        .from(TABELA_VINCULOS)
        .insert(empresaIds.map((empresa_id) => ({ agendamento_id: criado.id, empresa_id })));
      if (erroVinc) {
        // Sem os clientes o agendamento não serve: desfaz para não ficar pela metade
        await db.from(TABELA_AGENDAMENTOS).delete().eq('id', criado.id);
        throw erroVinculo(erroVinc);
      }
    }
  }

  async atualizarAgendamento(id: string, input: AgendamentoSaldoParcialInput): Promise<void> {
    const { empresaIds, ...dados } = input;

    const { error } = await db.from(TABELA_AGENDAMENTOS).update(dados).eq('id', id);
    if (error) throw error;

    const { data: atuais, error: erroAtuais } = await db.from(TABELA_VINCULOS).select('empresa_id').eq('agendamento_id', id);
    if (erroAtuais) throw erroAtuais;

    const idsAtuais: string[] = (atuais || []).map((v: { empresa_id: string }) => v.empresa_id);
    const remover = idsAtuais.filter((e) => !empresaIds.includes(e));
    const incluir = empresaIds.filter((e) => !idsAtuais.includes(e));

    if (remover.length > 0) {
      const { error: erroRemover } = await db
        .from(TABELA_VINCULOS)
        .delete()
        .eq('agendamento_id', id)
        .in('empresa_id', remover);
      if (erroRemover) throw erroRemover;
    }

    if (incluir.length > 0) {
      const { error: erroIncluir } = await db
        .from(TABELA_VINCULOS)
        .insert(incluir.map((empresa_id) => ({ agendamento_id: id, empresa_id })));
      if (erroIncluir) throw erroVinculo(erroIncluir);
    }
  }

  async alternarAtivo(id: string, ativo: boolean): Promise<void> {
    const { error } = await db.from(TABELA_AGENDAMENTOS).update({ ativo }).eq('id', id);
    if (error) throw error;
  }

  /** Os vínculos com clientes são apagados em cascata */
  async excluirAgendamento(id: string): Promise<void> {
    const { error } = await db.from(TABELA_AGENDAMENTOS).delete().eq('id', id);
    if (error) throw error;
  }

  async listarExecucoes(limite = 50): Promise<ExecucaoSaldoParcial[]> {
    const { data, error } = await db
      .from('banco_horas_envio_execucoes')
      .select('*, agendamento:banco_horas_envio_agendamentos(nome), empresa:empresas_clientes(nome_abreviado)')
      .order('iniciado_em', { ascending: false })
      .limit(limite);
    if (error) throw error;
    return data || [];
  }

  /** Clientes ativos com AMS (os mesmos da tela de Banco de Horas) e quantos contatos de Saldo Parcial têm */
  async listarClientesElegiveis(): Promise<ClienteElegivelSaldoParcial[]> {
    const { data: empresas, error } = await supabase
      .from('empresas_clientes')
      .select('id, nome_abreviado, email_gestor')
      .eq('status', 'ativo')
      .eq('tem_ams', true)
      .order('nome_abreviado');
    if (error) throw error;

    const { data: contatos, error: erroContatos } = await supabase
      .from('clientes')
      .select('empresa_id')
      .eq('status', 'ativo')
      .in('finalidade_envio', FINALIDADES_SALDO_PARCIAL);
    if (erroContatos) throw erroContatos;

    const porEmpresa = new Map<string, number>();
    for (const c of contatos || []) {
      if (c.empresa_id) porEmpresa.set(c.empresa_id, (porEmpresa.get(c.empresa_id) || 0) + 1);
    }

    return (empresas || []).map((e) => ({
      id: e.id,
      nome: e.nome_abreviado,
      qtdContatosSaldoParcial: porEmpresa.get(e.id) || 0,
      emailGestor: e.email_gestor?.trim() || null,
    }));
  }

  /** Dispara o envio do agendamento agora no sync-api; segue mesmo se a tela for fechada */
  async executarAgora(agendamentoId: string): Promise<void> {
    await chamarSyncApi('/api/saldo-parcial/executar', { agendamentoId });
  }

  /** Próximas execuções da regra, calculadas pelo sync-api (mesma lógica do agendador) */
  async preverExecucoes(regra: RegraRecorrencia, n = 5): Promise<string[]> {
    const { dados } = await chamarSyncApi<{ execucoes: string[] }>('/api/saldo-parcial/proximas-execucoes', { regra, n });
    return dados?.execucoes || [];
  }

  /** Agendador ligado (SALDO_PARCIAL_SCHEDULER_ENABLED)? Renderização da imagem configurada (RENDER_IMAGE_URL)? */
  async statusSyncApi(): Promise<{ agendadorAtivo: boolean; renderImagemConfigurado: boolean }> {
    const { dados } = await chamarSyncApi<{ agendadorAtivo: boolean; renderImagemConfigurado: boolean }>('/api/saldo-parcial/status');
    return dados;
  }
}

export const envioSaldoParcialService = new EnvioSaldoParcialService();
