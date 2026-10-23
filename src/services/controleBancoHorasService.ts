/**
 * Controle de Banco de Horas, tela nova (Modelagem_Fase3.md, seção 7). O mês
 * aberto é calculado na hora pelo motor da Fase 2, no navegador; o mês fechado
 * devolve o resultado congelado. Os meses futuros do período são projetados
 * pelo mesmo cálculo (decisão de 23/10/2026).
 */

import { supabase } from '@/integrations/supabase/client';
import {
  calcularEmpresaMes,
  type BancoCadastro,
  type RepositorioBancosHoras,
  type ResultadoEmpresaMes,
} from '@/services/bancosHoras/motorBancosHoras';
import {
  criarRepositorioSupabase,
  type ClienteSupabase,
} from '@/services/bancosHoras/repositorioSupabase';
import { modeloDaEmpresa } from '@/services/empresasService';
import type { MesAno } from '@/services/bancosHoras/calculo';
import type { ModeloEmpresa } from '@/types/empresas';

type Cliente = typeof supabase;

export interface EmpresaControle {
  id: string;
  nome: string;
  modelo: ModeloEmpresa;
  bancosAtivos: number;
}

/** Resultado de cada mês, pela chave AAAA-MM */
export type QuadroEmpresa = Record<string, ResultadoEmpresaMes>;

export const chaveMes = (m: MesAno) => `${m.ano}-${String(m.mes).padStart(2, '0')}`;

/**
 * Repositório que guarda cada consulta pelos argumentos. Calcular um mês refaz a
 * cadeia desde o início do período: sem o cache, montar o quadro de um semestre
 * repetiria as mesmas consultas várias vezes. Erro não fica guardado.
 */
export function comCache(repo: RepositorioBancosHoras): RepositorioBancosHoras {
  const guardadas = new Map<string, Promise<unknown>>();
  const embrulhado = {} as RepositorioBancosHoras;
  for (const nome of Object.keys(repo) as (keyof RepositorioBancosHoras)[]) {
    const original = repo[nome] as (...args: unknown[]) => Promise<unknown>;
    (embrulhado as unknown as Record<string, unknown>)[nome] = (...args: unknown[]) => {
      const chave = `${nome}:${JSON.stringify(args)}`;
      if (!guardadas.has(chave)) {
        const promessa = original.apply(repo, args);
        promessa.catch(() => guardadas.delete(chave));
        guardadas.set(chave, promessa);
      }
      return guardadas.get(chave);
    };
  }
  return embrulhado;
}

export class ControleBancoHorasService {
  constructor(
    private readonly cliente: Cliente = supabase,
    private readonly criarRepositorio: (
      c: ClienteSupabase
    ) => RepositorioBancosHoras = criarRepositorioSupabase
  ) {}

  async empresas(): Promise<EmpresaControle[]> {
    const { data, error } = await this.cliente
      .from('empresas')
      .select('id, nome_abreviado, modelo_calculo, bancos_horas(ativo)')
      .eq('status', 'ativo')
      .order('nome_abreviado');
    if (error) throw new Error(`Falha ao carregar as empresas: ${error.message}`);
    return (data as Record<string, any>[]).map((e) => {
      const bancosAtivos = (e.bancos_horas ?? []).filter((b: { ativo: boolean }) => b.ativo).length;
      return {
        id: e.id,
        nome: e.nome_abreviado,
        modelo: modeloDaEmpresa(e.modelo_calculo, bancosAtivos),
        bancosAtivos,
      };
    });
  }

  /** Bancos da empresa no formato do motor (períodos e vigências em MesAno) */
  async bancos(empresaId: string): Promise<BancoCadastro[]> {
    return this.criarRepositorio(this.cliente as unknown as ClienteSupabase).bancos(empresaId);
  }

  /** Um cálculo por mês, em sequência, sobre um repositório com cache */
  async quadro(empresaId: string, meses: MesAno[]): Promise<QuadroEmpresa> {
    const repo = comCache(this.criarRepositorio(this.cliente as unknown as ClienteSupabase));
    const quadro: QuadroEmpresa = {};
    for (const m of meses) {
      quadro[chaveMes(m)] = await calcularEmpresaMes(repo, empresaId, m);
    }
    return quadro;
  }
}

export const controleBancoHorasService = new ControleBancoHorasService();
