import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface EmpresaVigencia {
  id: string;
  nome_completo: string;
  nome_abreviado: string;
  vigencia_inicial: string | null;
  vigencia_final: string | null;
  status: string;
}

export interface VigenciaResult {
  empresasVencidas: EmpresaVigencia[];
  empresasProximasVencimento: EmpresaVigencia[];
  totalProcessadas: number;
  totalInativadas: number;
}

/**
 * Verifica empresas com vigência vencida e próximas do vencimento
 */
export async function verificarVigenciasEmpresas(diasAlerta: number = 30): Promise<VigenciaResult> {
  try {
    const hoje = new Date();
    const dataAlerta = new Date();
    dataAlerta.setDate(hoje.getDate() + diasAlerta);

    // Tentar buscar empresas ativas - se as colunas não existirem, retornar resultado vazio
    const { data: empresas, error } = await supabase
      .from('empresas_clientes')
      .select('id, nome_completo, nome_abreviado, status')
      .eq('status', 'ativo');

    if (error) {
      console.error('Erro ao buscar empresas:', error);
      throw new Error('Erro ao buscar empresas para verificação de vigência');
    }

    // Se não há empresas ou as colunas de vigência não existem ainda, retornar resultado vazio
    if (!empresas || empresas.length === 0) {
      return {
        empresasVencidas: [],
        empresasProximasVencimento: [],
        totalProcessadas: 0,
        totalInativadas: 0
      };
    }

    // Tentar buscar com colunas de vigência - se falhar, significa que ainda não foram criadas
    const { data: empresasComVigencia, error: errorVigencia } = await supabase
      .from('empresas_clientes')
      .select('id, nome_completo, nome_abreviado, vigencia_inicial, vigencia_final, status')
      .eq('status', 'ativo')
      .not('vigencia_final', 'is', null);

    if (errorVigencia) {
      console.warn('Colunas de vigência ainda não foram criadas. Execute a migração primeiro.');
      return {
        empresasVencidas: [],
        empresasProximasVencimento: [],
        totalProcessadas: empresas.length,
        totalInativadas: 0
      };
    }

    const empresasVencidas: EmpresaVigencia[] = [];
    const empresasProximasVencimento: EmpresaVigencia[] = [];

    if (empresasComVigencia) {
      for (const empresa of empresasComVigencia) {
        // Type guard para garantir que temos os campos necessários
        if (!empresa || typeof empresa !== 'object') continue;
        if (!('vigencia_final' in empresa) || !empresa.vigencia_final) continue;

        const vigenciaFinal = new Date(empresa.vigencia_final);
        
        // Verificar se a vigência já venceu
        if (vigenciaFinal < hoje) {
          empresasVencidas.push(empresa as EmpresaVigencia);
        }
        // Verificar se está próxima do vencimento
        else if (vigenciaFinal <= dataAlerta) {
          empresasProximasVencimento.push(empresa as EmpresaVigencia);
        }
      }
    }

    return {
      empresasVencidas,
      empresasProximasVencimento,
      totalProcessadas: empresasComVigencia?.length || 0,
      totalInativadas: 0
    };

  } catch (error) {
    console.error('Erro na verificação de vigências:', error);
    // Retornar resultado vazio em caso de erro para não quebrar a aplicação
    return {
      empresasVencidas: [],
      empresasProximasVencimento: [],
      totalProcessadas: 0,
      totalInativadas: 0
    };
  }
}

/**
 * Inativa automaticamente empresas com vigência vencida
 */
export async function inativarEmpresasVencidas(empresasVencidas: EmpresaVigencia[]): Promise<number> {
  if (empresasVencidas.length === 0) return 0;

  try {
    let totalInativadas = 0;
    const descricaoInativacao = `Inativada automaticamente por vigência vencida em ${new Date().toLocaleDateString('pt-BR')}`;

    for (const empresa of empresasVencidas) {
      const { error } = await supabase
        .from('empresas_clientes')
        .update({
          status: 'inativo',
          descricao_status: descricaoInativacao,
          data_status: new Date().toISOString()
        })
        .eq('id', empresa.id);

      if (error) {
        console.error(`Erro ao inativar empresa ${empresa.nome_completo}:`, error);
        continue;
      }

      totalInativadas++;
      console.log(`Empresa ${empresa.nome_completo} inativada por vigência vencida`);
    }

    return totalInativadas;

  } catch (error) {
    console.error('Erro ao inativar empresas vencidas:', error);
    throw error;
  }
}

/**
 * Executa verificação completa de vigências e inativa empresas vencidas
 */
export async function executarVerificacaoVigencia(
  diasAlerta: number = 30,
  inativarAutomaticamente: boolean = true
): Promise<VigenciaResult> {
  try {
    console.log('Iniciando verificação de vigências...');
    
    const resultado = await verificarVigenciasEmpresas(diasAlerta);
    
    if (inativarAutomaticamente && resultado.empresasVencidas.length > 0) {
      console.log(`Encontradas ${resultado.empresasVencidas.length} empresas com vigência vencida`);
      
      const totalInativadas = await inativarEmpresasVencidas(resultado.empresasVencidas);
      resultado.totalInativadas = totalInativadas;
      
      console.log(`${totalInativadas} empresas inativadas automaticamente`);
    }

    if (resultado.empresasProximasVencimento.length > 0) {
      console.log(`${resultado.empresasProximasVencimento.length} empresas próximas do vencimento`);
    }

    return resultado;

  } catch (error) {
    console.error('Erro na execução da verificação de vigência:', error);
    throw error;
  }
}

/**
 * Verifica se uma empresa específica está com vigência vencida ou próxima do vencimento
 */
export function verificarVigenciaEmpresa(
  vigenciaFinal: string | null,
  diasAlerta: number = 30
): {
  vencida: boolean;
  proximaVencimento: boolean;
  diasRestantes: number | null;
} {
  if (!vigenciaFinal) {
    return {
      vencida: false,
      proximaVencimento: false,
      diasRestantes: null
    };
  }

  const hoje = new Date();
  const vigencia = new Date(vigenciaFinal);
  const diffTime = vigencia.getTime() - hoje.getTime();
  const diasRestantes = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return {
    vencida: diasRestantes < 0,
    proximaVencimento: diasRestantes >= 0 && diasRestantes <= diasAlerta,
    diasRestantes
  };
}
