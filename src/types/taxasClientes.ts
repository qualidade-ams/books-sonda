// =====================================================
// TIPOS: SISTEMA DE TAXAS DE CLIENTES
// =====================================================

export type TipoProduto = 'GALLERY' | 'OUTROS';
export type TipoFuncao = 'Funcional' | 'Técnico / ABAP' | 'DBA / Basis' | 'Gestor' | 'Técnico (Instalação / Atualização)' | 'ABAP - PL/SQL' | 'DBA';
export type TipoCalculoAdicional = 'normal' | 'media';

// Interface principal da Taxa
export interface TaxaCliente {
  id: string;
  cliente_id: string;
  vigencia_inicio: string;
  vigencia_fim?: string;
  tipo_produto: TipoProduto;
  tipo_calculo_adicional: TipoCalculoAdicional;
  personalizado?: boolean; // Flag para indicar se os valores são personalizados
  criado_por?: string;
  criado_em: string;
  atualizado_em: string;
}

// Interface para valores de taxa por função
export interface ValorTaxaFuncao {
  id: string;
  taxa_id: string;
  funcao: TipoFuncao;
  tipo_hora: 'remota' | 'local';
  valor_base: number; // Valor hora remota/local - Segunda à sexta-feira - 08h30 às 17h30
  criado_em: string;
  atualizado_em: string;
}

// Interface completa com valores calculados
export interface TaxaClienteCompleta extends TaxaCliente {
  cliente?: {
    id: string;
    nome_completo: string;
    nome_abreviado: string;
    produtos?: { produto: string }[];
  };
  valores_remota?: ValorTaxaCalculado[];
  valores_local?: ValorTaxaCalculado[];
}

// Interface para valores calculados
export interface ValorTaxaCalculado {
  funcao: TipoFuncao;
  valor_base: number;
  valor_17h30_19h30: number;
  valor_apos_19h30: number;
  valor_fim_semana: number;
  valor_adicional: number;
  valor_standby: number;
}

// Interface para formulário de criação/edição
export interface TaxaFormData {
  cliente_id: string;
  vigencia_inicio: Date | string;
  vigencia_fim?: Date | string;
  tipo_produto: TipoProduto;
  tipo_calculo_adicional: TipoCalculoAdicional;
  personalizado?: boolean; // Flag para permitir edição manual de todos os campos
  taxa_reajuste?: number; // Percentual de reajuste (opcional)
  valores_remota: {
    funcional: number;
    tecnico: number;
    abap?: number;
    dba: number;
    gestor: number;
  };
  valores_local: {
    funcional: number;
    tecnico: number;
    abap?: number;
    dba: number;
    gestor: number;
  };
  // Valores personalizados (quando personalizado = true)
  valores_remota_personalizados?: {
    [funcao: string]: {
      valor_base: number;
      valor_17h30_19h30: number;
      valor_apos_19h30: number;
      valor_fim_semana: number;
      valor_adicional: number;
      valor_standby: number;
    };
  };
  valores_local_personalizados?: {
    [funcao: string]: {
      valor_base: number;
      valor_17h30_19h30: number;
      valor_apos_19h30: number;
      valor_fim_semana: number;
    };
  };
}

// Interface para filtros
export interface FiltrosTaxa {
  cliente_id?: string;
  vigente?: boolean; // Filtrar apenas taxas vigentes
  data_referencia?: string; // Data para verificar vigência
}

// Funções auxiliares para cálculos
export const calcularValores = (
  valorBase: number, 
  funcao: TipoFuncao, 
  todasFuncoes?: { funcao: TipoFuncao; valor_base: number }[],
  tipoCalculo: TipoCalculoAdicional = 'media',
  tipoProduto?: TipoProduto
): ValorTaxaCalculado => {
  const valor_17h30_19h30 = valorBase + (valorBase * 0.75);
  const valor_apos_19h30 = valorBase + (valorBase * 1.0);
  const valor_fim_semana = valorBase + (valorBase * 1.0);
  const valor_standby = valorBase * 0.30;
  
  // Cálculo do valor adicional
  let valor_adicional: number;
  
  // REGRA ESPECIAL PARA GALLERY: Funcional e Técnico / ABAP quando tipo de cálculo for 'media'
  if (tipoProduto === 'GALLERY' && (funcao === 'Funcional' || funcao === 'Técnico / ABAP') && tipoCalculo === 'media') {
    // Média de (Funcional + 15%) e (Técnico + 15%) - APENAS 2 LINHAS
    if (todasFuncoes && todasFuncoes.length >= 2) {
      const funcional = todasFuncoes.find(f => f.funcao === 'Funcional');
      const tecnico = todasFuncoes.find(f => f.funcao === 'Técnico / ABAP');
      
      if (funcional && tecnico) {
        const resultado1 = funcional.valor_base + (funcional.valor_base * 0.15);
        const resultado2 = tecnico.valor_base + (tecnico.valor_base * 0.15);
        valor_adicional = (resultado1 + resultado2) / 2;
      } else {
        valor_adicional = valorBase + (valorBase * 0.15);
      }
    } else {
      valor_adicional = valorBase + (valorBase * 0.15);
    }
  }
  // Se tipo de cálculo for 'normal', todas as funções usam valor base + 15%
  else if (tipoCalculo === 'normal') {
    valor_adicional = valorBase + (valorBase * 0.15);
  } 
  // Se tipo de cálculo for 'media', usa a lógica antiga
  else if (funcao === 'DBA / Basis' || funcao === 'DBA' || funcao === 'Gestor') {
    // Para DBA e Gestor: valor base + 15%
    valor_adicional = valorBase + (valorBase * 0.15);
  } else if (funcao === 'Funcional' || funcao === 'Técnico (Instalação / Atualização)' || funcao === 'ABAP - PL/SQL') {
    // Para Funcional, Técnico (Instalação/Atualização) e ABAP-PL/SQL (produtos OUTROS)
    // Média dos valores base + 15% de cada um
    if (todasFuncoes && todasFuncoes.length >= 3) {
      const tresPrimeirasFuncoes = todasFuncoes.filter(f => 
        f.funcao === 'Funcional' || 
        f.funcao === 'Técnico (Instalação / Atualização)' ||
        f.funcao === 'ABAP - PL/SQL'
      );
      
      if (tresPrimeirasFuncoes.length === 3) {
        // Cada valor base + 15%, depois média dos três
        const somaValores = tresPrimeirasFuncoes.reduce((acc, f) => {
          const valorCom15 = f.valor_base + (f.valor_base * 0.15);
          return acc + valorCom15;
        }, 0);
        valor_adicional = somaValores / 3;
      } else {
        valor_adicional = valorBase + (valorBase * 0.15);
      }
    } else {
      valor_adicional = valorBase + (valorBase * 0.15);
    }
  } else {
    // Para Técnico/ABAP (produtos GALLERY) - fallback caso não tenha tipoProduto
    // Média dos valores base + 15% das funções Funcional, Técnico e DBA
    if (todasFuncoes && todasFuncoes.length >= 3) {
      const funcoesParaMedia = todasFuncoes.filter(f => 
        f.funcao === 'Funcional' || 
        f.funcao === 'Técnico / ABAP' || 
        f.funcao === 'DBA / Basis'
      );
      
      if (funcoesParaMedia.length === 3) {
        const somaValores = funcoesParaMedia.reduce((acc, f) => acc + (f.valor_base + (f.valor_base * 0.15)), 0);
        valor_adicional = somaValores / funcoesParaMedia.length;
      } else {
        valor_adicional = valorBase + (valorBase * 0.15);
      }
    } else {
      valor_adicional = valorBase + (valorBase * 0.15);
    }
  }
  
  return {
    funcao,
    valor_base: valorBase,
    valor_17h30_19h30,
    valor_apos_19h30,
    valor_fim_semana,
    valor_adicional,
    valor_standby
  };
};

// Funções por tipo de produto
export const getFuncoesPorProduto = (tipoProduto: TipoProduto): TipoFuncao[] => {
  if (tipoProduto === 'GALLERY') {
    return ['Funcional', 'Técnico / ABAP', 'DBA / Basis', 'Gestor'];
  } else {
    return ['Funcional', 'Técnico (Instalação / Atualização)', 'ABAP - PL/SQL', 'DBA', 'Gestor'];
  }
};
