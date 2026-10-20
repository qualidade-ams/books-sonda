/**
 * Coletor do Saldo Parcial: monta, a partir do banco, os mesmos dados que a tela
 * Controle de Banco de Horas usa no envio manual (Visão Consolidada).
 * Usado pelo envio automático (sync-api).
 */

import { supabase } from '@/integrations/supabase/client';
import { bancoHorasService } from '@/services/bancoHorasService';
import { requerimentosService } from '@/services/requerimentosService';
import { bancoHorasObservacoesService } from '@/services/bancoHorasObservacoesService';
import type { BancoHorasCalculo } from '@/types/bancoHoras';
import type { Requerimento } from '@/types/requerimentos';
import { isEnglishTemplateByName } from '@/utils/bancoHorasI18n';
import { calcularNomePeriodoComIdioma } from '@/utils/periodoVigenciaUtils';
import type { DadosEmailSaldoParcial, MesAno } from './emailSaldoParcial';
import {
  calcularMesesDoPeriodo,
  filtrarObservacoesDoPeriodo,
  filtrarRequerimentosDoPeriodo,
  filtrarRequerimentosEmDesenvolvimento,
  mesReferenciaSaldoParcial
} from './periodoSaldoParcial';

/** Campos de empresas_clientes usados pelo Saldo Parcial */
interface EmpresaSaldoParcial {
  id: string;
  nome_abreviado?: string | null;
  nome_completo?: string | null;
  tipo_contrato?: string | null;
  periodo_apuracao?: number | null;
  inicio_vigencia?: string | null;
  percentual_repasse_mensal?: number | null;
  dia_inicio_apuracao?: number | null;
  dia_fim_apuracao?: number | null;
  template_padrao?: string | null;
}

/** Um e-mail de Saldo Parcial pronto para ser montado e enviado */
export interface SaldoParcialPreparado {
  empresaId: string;
  empresaNome: string;
  mesAno: MesAno;
  dados: DadosEmailSaldoParcial;
}

export class ColetorSaldoParcialService {
  /**
   * Prepara o(s) Saldo(s) Parcial(is) da empresa para o mês de ontem.
   * Contrato "ambos" gera dois envios (tickets e horas), como os dois botões da tela.
   */
  async coletar(empresaId: string, agora: Date = new Date()): Promise<SaldoParcialPreparado[]> {
    const empresa = await this.buscarEmpresa(empresaId);
    const mesAno = mesReferenciaSaldoParcial(agora);
    const meses = calcularMesesDoPeriodo(empresa, mesAno);

    // Sequencial: cada mês depende do repasse do mês anterior (igual à tela)
    const calculos: BancoHorasCalculo[] = [];
    for (const { mes, ano } of meses) {
      const calculo = await bancoHorasService.calcularMes(empresaId, mes, ano);
      if (calculo) calculos.push(calculo);
    }

    const [percentualRepasse, requerimentosTodos, observacoesUnificadas, isEnglish] = await Promise.all([
      this.buscarPercentualRepasse(empresa, mesAno),
      requerimentosService.listarRequerimentos({ cliente_id: empresaId } as any) as Promise<Requerimento[]>,
      bancoHorasObservacoesService.listarObservacoesUnificadas(empresaId),
      this.detectarIngles(empresa.template_padrao)
    ]);

    const nomePeriodo = calcularNomePeriodoComIdioma(
      empresa.inicio_vigencia,
      empresa.periodo_apuracao || 1,
      meses[0].mes,
      meses[0].ano,
      isEnglish
    );

    const dadosBase = {
      calculos,
      percentualRepasse,
      nomePeriodo,
      requerimentos: filtrarRequerimentosDoPeriodo(requerimentosTodos || [], meses),
      requerimentosEmDesenvolvimento: filtrarRequerimentosEmDesenvolvimento(requerimentosTodos || [], meses),
      observacoes: filtrarObservacoesDoPeriodo(observacoesUnificadas as any, meses),
      diaInicioApuracao: empresa.dia_inicio_apuracao ?? 1,
      diaFimApuracao: empresa.dia_fim_apuracao ?? 0,
      isEnglish
    };

    const tipoContrato = (empresa.tipo_contrato || '').toLowerCase();
    const tiposCobranca = tipoContrato === 'ambos' ? ['ticket', 'horas'] : [tipoContrato];
    const empresaNome = empresa.nome_abreviado || empresa.nome_completo || 'Cliente';

    return tiposCobranca.map(tipoCobranca => ({
      empresaId,
      empresaNome,
      mesAno,
      dados: { ...dadosBase, tipoCobranca }
    }));
  }

  private async buscarEmpresa(empresaId: string): Promise<EmpresaSaldoParcial> {
    const { data, error } = await supabase
      .from('empresas_clientes')
      .select('id, nome_abreviado, nome_completo, tipo_contrato, periodo_apuracao, inicio_vigencia, percentual_repasse_mensal, dia_inicio_apuracao, dia_fim_apuracao, template_padrao')
      .eq('id', empresaId)
      .single();

    if (error || !data) {
      throw new Error(`Empresa não encontrada para o Saldo Parcial: ${error?.message || empresaId}`);
    }
    return data as unknown as EmpresaSaldoParcial;
  }

  /** Percentual vigente no histórico; sem vigência, o percentual cadastrado na empresa (padrão 100) */
  private async buscarPercentualRepasse(empresa: EmpresaSaldoParcial, mesAno: MesAno): Promise<number> {
    const { data, error } = await supabase.rpc('get_percentual_repasse_vigente' as any, {
      p_empresa_id: empresa.id,
      p_data: `${mesAno.ano}-${String(mesAno.mes).padStart(2, '0')}-01`
    } as any);

    if (error) {
      throw new Error(`Erro ao buscar percentual de repasse vigente: ${error.message}`);
    }

    const vigente = Array.isArray(data) && data.length > 0 ? (data[0] as { percentual?: number | null }) : null;
    if (vigente?.percentual !== undefined && vigente?.percentual !== null) {
      return vigente.percentual;
    }
    return empresa.percentual_repasse_mensal ?? 100;
  }

  /** Idioma do e-mail pelo nome do template padrão da empresa */
  private async detectarIngles(templateId?: string | null): Promise<boolean> {
    if (!templateId) return false;

    const { data, error } = await supabase
      .from('email_templates')
      .select('nome')
      .eq('id', templateId)
      .single();

    if (error || !data) return false;
    return isEnglishTemplateByName((data as { nome?: string }).nome);
  }
}

export const coletorSaldoParcialService = new ColetorSaldoParcialService();
