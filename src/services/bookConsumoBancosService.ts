/**
 * Snapshot do consumo do Book por banco (Fase 5, Modelagem_Fase5.md seção 6). Na geração do Book
 * da empresa liberada, monta uma linha por banco que o cliente vê com o que a página de consumo
 * mostra, e grava em books_consumo_bancos (migration 28). A página lê só daqui, para o PDF de um
 * Book enviado não mudar com o tempo.
 *
 * O conteúdo de cada banco é o do Saldo Parcial do Controle no mês do Book (período, requerimentos,
 * reajustes e observações para o cliente), mais o histórico de 6 meses do gráfico e a divisão
 * incidente/solicitação do mês. Bancos de consolidadas liberadas entram depois, com o nome da
 * empresa (D-15).
 */

import { supabase } from '@/integrations/supabase/client';
import { falhaDoBanco } from '@/errors/erroTraduzivel';
import type { MesAno, TipoContrato } from '@/services/bancosHoras/calculo';
import type { ResultadoBancoMes } from '@/services/bancosHoras/motorBancosHoras';
import type { ClienteSupabase } from '@/services/bancosHoras/repositorioSupabase';
import {
  controleBancoHorasService,
  type ControleBancoHorasService,
} from '@/services/controleBancoHorasService';
import {
  controleSaldoParcialService,
  type ControleSaldoParcialService,
  type RequerimentoParaCliente,
} from '@/services/controleSaldoParcialService';
import { resultadoDoBanco } from '@/utils/controleTela';
import type { SituacaoMes } from '@/services/bancosHoras/periodos';
import type { ObservacaoParaCliente, ReajusteParaCliente } from '@/types/controleBancoHoras';

type Cliente = typeof supabase;
type Linha = Record<string, any>;

/** Meses do gráfico de histórico, terminando no mês do Book */
const MESES_HISTORICO = 6;

export interface Quantidade {
  minutos: number;
  tickets: number;
}

export interface DadosConsumoBanco {
  /** Mês do Book */
  mes: MesAno;
  tipoContrato: TipoContrato;
  /** O período de apuração inteiro, como no Book do legado; depois do mês do Book, projetado */
  meses: { mes: MesAno; situacao: SituacaoMes; resultado: ResultadoBancoMes | null }[];
  historico: (Quantidade & {
    mes: MesAno;
    requerimentosMinutos: number;
    requerimentosTickets: number;
  })[];
  /** Do mês do Book */
  requerimentos: RequerimentoParaCliente[];
  reajustes: ReajusteParaCliente[];
  observacoes: ObservacaoParaCliente[];
  /** Chamados do mês do Book por tipo: IM = incidente, RF = solicitação */
  porTipo: { incidente: Quantidade; solicitacao: Quantidade };
}

export interface ConsumoBancoBook {
  banco_id: string;
  ordem: number;
  nome_banco: string;
  nome_empresa: string;
  fechamento_id: string | null;
  dados: DadosConsumoBanco;
}

const indice = (m: MesAno) => m.ano * 12 + (m.mes - 1);
const doIndice = (i: number): MesAno => ({ mes: (i % 12) + 1, ano: Math.floor(i / 12) });
const mesmoMes = (a: MesAno, b: MesAno) => a.mes === b.mes && a.ano === b.ano;

export class BookConsumoBancosService {
  constructor(
    private readonly cliente: Cliente = supabase,
    private readonly saldoParcial: Pick<
      ControleSaldoParcialService,
      'bancos' | 'chamados'
    > = controleSaldoParcialService,
    private readonly controle: Pick<ControleBancoHorasService, 'quadro'> = controleBancoHorasService
  ) {}

  /**
   * Uma linha por banco que o cliente vê, da empresa e das consolidadas liberadas.
   * `fechamentos`: a versão do fechamento de cada banco no mês, quando já se sabe.
   */
  async montar(
    empresaId: string,
    mes: MesAno,
    fechamentos: Record<string, string>
  ): Promise<ConsumoBancoBook[]> {
    const empresas = await this.empresasDoBook(empresaId);
    const linhas: ConsumoBancoBook[] = [];
    for (const empresa of empresas) {
      for (const dados of await this.bancosDaEmpresa(empresa.id, mes)) {
        linhas.push({
          banco_id: dados.bancoId,
          ordem: linhas.length + 1,
          nome_banco: dados.nome,
          nome_empresa: empresa.nome,
          fechamento_id: fechamentos[dados.bancoId] ?? null,
          dados: dados.conteudo,
        });
      }
    }
    return linhas;
  }

  async gravar(bookId: string, linhas: ConsumoBancoBook[]): Promise<void> {
    const { error } = await (this.cliente as unknown as ClienteSupabase).rpc(
      'gravar_consumo_bancos_do_book',
      { p_book_id: bookId, p_bancos: linhas }
    );
    if (error) throw falhaDoBanco('gravar o consumo do Book', error);
  }

  /** O snapshot do Book, na ordem; vazio para Book de empresa em Legado */
  async doBook(bookId: string): Promise<Linha[]> {
    const { data, error } = await (this.cliente as unknown as ClienteSupabase).rpc(
      'consumo_bancos_do_book',
      { p_book_id: bookId }
    );
    if (error) throw falhaDoBanco('carregar o consumo do Book', error);
    return (data as Linha[]) ?? [];
  }

  /** A empresa do Book e, depois, as consolidadas dela que já estão liberadas */
  private async empresasDoBook(empresaId: string): Promise<{ id: string; nome: string }[]> {
    const cliente = this.cliente as unknown as ClienteSupabase;
    const [principal, consolidadas] = await Promise.all([
      cliente.from('empresas').select('id, nome_abreviado').eq('id', empresaId).maybeSingle(),
      cliente
        .from('empresas')
        .select('id, nome_abreviado')
        .eq('empresa_consolidadora_id', empresaId)
        .eq('modelo_calculo', 'multiplo')
        .order('nome_abreviado'),
    ]);
    const erro = principal.error ?? consolidadas.error;
    if (erro) throw falhaDoBanco('carregar as empresas do Book', erro);
    return [principal.data as Linha | null, ...((consolidadas.data as Linha[]) ?? [])]
      .filter(Boolean)
      .map((e) => ({ id: e.id, nome: e.nome_abreviado ?? '' }));
  }

  private async bancosDaEmpresa(empresaId: string, mes: MesAno) {
    const bancos = await this.saldoParcial.bancos(empresaId, mes);
    if (bancos.length === 0) return [];

    const meses = Array.from({ length: MESES_HISTORICO }, (_, i) =>
      doIndice(indice(mes) - MESES_HISTORICO + 1 + i)
    );
    const [quadro, chamados] = await Promise.all([
      this.controle.quadro(empresaId, meses),
      this.saldoParcial.chamados(empresaId, bancos),
    ]);

    return bancos.map((b) => {
      const doMes = (chamados[b.bancoId] ?? []).filter((c) => mesmoMes(c.mes, mes));
      const somaTipo = (tipo: 'IM' | 'RF'): Quantidade =>
        doMes
          .filter((c) => c.tipoChamado === tipo)
          .reduce((s, c) => ({ minutos: s.minutos + c.minutos, tickets: s.tickets + c.tickets }), {
            minutos: 0,
            tickets: 0,
          });
      const conteudo: DadosConsumoBanco = {
        mes,
        tipoContrato: b.tipoContrato,
        meses: b.meses.map((m) => ({
          mes: m.mes,
          situacao: m.situacao,
          resultado: m.resultado ?? null,
        })),
        historico: meses.map((m) => {
          const r = resultadoDoBanco(quadro, m, b.bancoId);
          return {
            mes: m,
            minutos: r?.horas?.consumo ?? 0,
            tickets: r?.tickets?.consumo ?? 0,
            requerimentosMinutos: r?.horas?.requerimentos ?? 0,
            requerimentosTickets: r?.tickets?.requerimentos ?? 0,
          };
        }),
        requerimentos: b.requerimentos.filter((r) => mesmoMes(r.mes, mes)),
        reajustes: b.reajustes,
        observacoes: b.observacoes,
        porTipo: { incidente: somaTipo('IM'), solicitacao: somaTipo('RF') },
      };
      return { bancoId: b.bancoId, nome: b.nome, conteudo };
    });
  }
}

export const bookConsumoBancosService = new BookConsumoBancosService();
