/**
 * Geração do Book da empresa liberada (Fase 5, Modelagem_Fase5.md seção 5). Usada pelo
 * booksService.gerarBooksLote, que segue igual para as empresas em Legado.
 *
 *   noModeloNovo: empresa liberada e mês depois do fechamento de transição. O mês da transição
 *                 e os anteriores tiveram o Book gerado pelo legado e continuam com ele, inclusive
 *                 na retificação
 *   preparar:     fecha o mês no modelo novo (geracao_book não reabre, D-11; retificacao grava
 *                 nova versão) e monta o snapshot de cada banco
 *   gravar:       grava o snapshot depois que o Book existe
 */

import { supabase } from '@/integrations/supabase/client';
import { falhaDoBanco } from '@/errors/erroTraduzivel';
import type { MesAno } from '@/services/bancosHoras/calculo';
import { fecharMes } from '@/services/bancosHoras/fechamento';
import {
  criarRepositorioSupabase,
  type ClienteSupabase,
} from '@/services/bancosHoras/repositorioSupabase';
import {
  bookConsumoBancosService,
  type BookConsumoBancosService,
  type ConsumoBancoBook,
} from '@/services/bookConsumoBancosService';

type Cliente = typeof supabase;
type Linha = Record<string, any>;

const indice = (m: { mes: number; ano: number }) => m.ano * 12 + (m.mes - 1);

export class GeracaoBookLiberada {
  constructor(
    private readonly cliente: Cliente = supabase,
    private readonly consumo: Pick<
      BookConsumoBancosService,
      'montar' | 'gravar'
    > = bookConsumoBancosService,
    private readonly criarRepositorio = criarRepositorioSupabase,
    private readonly fechar: typeof fecharMes = fecharMes
  ) {}

  private get db() {
    return this.cliente as unknown as ClienteSupabase;
  }

  async noModeloNovo(empresaId: string, mes: MesAno): Promise<boolean> {
    const { data: empresa, error } = await this.db
      .from('empresas')
      .select('modelo_calculo')
      .eq('id', empresaId)
      .maybeSingle();
    if (error) throw falhaDoBanco('carregar o modelo da empresa', error);
    if ((empresa as Linha | null)?.modelo_calculo !== 'multiplo') return false;

    const bancos = await this.bancosDaEmpresa(empresaId);
    if (bancos.length === 0) return true;
    const { data: transicoes, error: erroTransicao } = await this.db
      .from('bancos_horas_fechamentos')
      .select('mes, ano')
      .in('banco_id', bancos)
      .eq('motivo', 'transicao');
    if (erroTransicao) throw falhaDoBanco('carregar a transição da empresa', erroTransicao);
    const ultima = Math.max(-1, ...((transicoes as Linha[]) ?? []).map((t) => indice(t as MesAno)));
    return indice(mes) > ultima;
  }

  async preparar(
    empresaId: string,
    mes: MesAno,
    retificacao: boolean
  ): Promise<ConsumoBancoBook[]> {
    await this.fechar(
      this.criarRepositorio(this.db),
      empresaId,
      mes,
      retificacao ? 'retificacao' : 'geracao_book'
    );
    return this.consumo.montar(empresaId, mes, await this.versoesVigentes(empresaId, mes));
  }

  async gravar(bookId: string, linhas: ConsumoBancoBook[]): Promise<void> {
    await this.consumo.gravar(bookId, linhas);
  }

  private async bancosDaEmpresa(empresaId: string): Promise<string[]> {
    const { data, error } = await this.db
      .from('bancos_horas')
      .select('id')
      .eq('empresa_id', empresaId);
    if (error) throw falhaDoBanco('carregar os bancos da empresa', error);
    return ((data as Linha[]) ?? []).map((b) => b.id);
  }

  /** Banco → fechamento vigente do mês, para o snapshot apontar a versão usada */
  private async versoesVigentes(empresaId: string, mes: MesAno): Promise<Record<string, string>> {
    const bancos = await this.bancosDaEmpresa(empresaId);
    if (bancos.length === 0) return {};
    const { data, error } = await this.db
      .from('bancos_horas_fechamentos')
      .select('id, banco_id')
      .in('banco_id', bancos)
      .eq('mes', mes.mes)
      .eq('ano', mes.ano)
      .eq('vigente', true);
    if (error) throw falhaDoBanco('carregar os fechamentos do mês', error);
    return Object.fromEntries(((data as Linha[]) ?? []).map((f) => [f.banco_id, f.id]));
  }
}

export const geracaoBookLiberada = new GeracaoBookLiberada();
