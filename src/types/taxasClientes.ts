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
  prazo_pagamento?: number; // Prazo de pagamento em dias (30, 45, 60, 90, 120)
  personalizado?: boolean; // Flag para indicar se os valores são personalizados
  // Campos específicos por cliente
  valor_ticket?: number; // VOTORANTIM, CSN
  valor_ticket_excedente?: number; // VOTORANTIM, CSN
  ticket_excedente_simples?: number; // EXXONMOBIL
  ticket_excedente_complexo?: number; // EXXONMOBIL
  ticket_excedente_1?: number; // CHIESI
  ticket_excedente_2?: number; // CHIESI
  ticket_excedente?: number; // NIDEC
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
  // Campos para valores personalizados (quando taxa.personalizado = true)
  valor_17h30_19h30?: number;
  valor_apos_19h30?: number;
  valor_fim_semana?: number;
  valor_adicional?: number;
  valor_standby?: number;
  criado_em: string;
  atualizado_em: string;
}

// Interface completa com valores calculados
export interface TaxaClienteCompleta extends TaxaCliente {
  cliente?: {
    id: string;
    nome_completo: string;
    nome_abreviado: string;
    tem_ams?: boolean;
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
  prazo_pagamento?: number; // Prazo de pagamento em dias (30, 45, 60, 90, 120)
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
  // Campos específicos por cliente
  valor_ticket?: number; // VOTORANTIM, CSN
  valor_ticket_excedente?: number; // VOTORANTIM, CSN
  ticket_excedente_simples?: number; // EXXONMOBIL
  ticket_excedente_complexo?: number; // EXXONMOBIL
  ticket_excedente_1?: number; // CHIESI
  ticket_excedente_2?: number; // CHIESI
  ticket_excedente?: number; // NIDEC
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
  tipoProduto?: TipoProduto,
  isLocal: boolean = false // NOVO: indica se é cálculo para valores locais
): ValorTaxaCalculado => {
  // CORREÇÃO: Não aplicar 10% aqui pois os valores locais já vêm com 10% a mais
  // O parâmetro isLocal é mantido para compatibilidade futura, mas não altera o cálculo
  const valorBaseAjustado = valorBase;
  
  // ATUALIZADO: Usar multiplicação direta para maior clareza
  const valor_17h30_19h30 = valorBaseAjustado * 1.75;  // Seg-Sex 17h30-19h30: valor base × 1,75
  const valor_apos_19h30 = valorBaseAjustado * 2.0;    // Seg-Sex Após 19h30: valor base × 2,0
  const valor_fim_semana = valorBaseAjustado * 2.0;    // Sáb/Dom/Feriados: valor base × 2,0
  const valor_standby = valorBaseAjustado * 0.30;      // Stand By: valor base × 0,30
  
  // Cálculo do valor adicional
  let valor_adicional: number;
  
  // REGRA ESPECIAL PARA GALLERY: Funcional e Técnico / ABAP quando tipo de cálculo for 'media'
  if (tipoProduto === 'GALLERY' && (funcao === 'Funcional' || funcao === 'Técnico / ABAP') && tipoCalculo === 'media') {
    // Média de (Funcional + 15%) e (Técnico + 15%) - APENAS 2 LINHAS
    if (todasFuncoes && todasFuncoes.length >= 2) {
      const funcional = todasFuncoes.find(f => f.funcao === 'Funcional');
      const tecnico = todasFuncoes.find(f => f.funcao === 'Técnico / ABAP');
      
      if (funcional && tecnico) {
        // CORREÇÃO: Não aplicar 10% aqui pois os valores locais já vêm com 10% a mais
        const valorFuncionalAjustado = funcional.valor_base;
        const valorTecnicoAjustado = tecnico.valor_base;
        const resultado1 = valorFuncionalAjustado + (valorFuncionalAjustado * 0.15);
        const resultado2 = valorTecnicoAjustado + (valorTecnicoAjustado * 0.15);
        valor_adicional = (resultado1 + resultado2) / 2;
      } else {
        valor_adicional = valorBaseAjustado + (valorBaseAjustado * 0.15);
      }
    } else {
      valor_adicional = valorBaseAjustado + (valorBaseAjustado * 0.15);
    }
  }
  // Se tipo de cálculo for 'normal', todas as funções usam valor base + 15%
  else if (tipoCalculo === 'normal') {
    valor_adicional = valorBaseAjustado + (valorBaseAjustado * 0.15);
  } 
  // Se tipo de cálculo for 'media', usa a lógica antiga
  else if (funcao === 'DBA / Basis' || funcao === 'DBA' || funcao === 'Gestor') {
    // Para DBA e Gestor: valor base + 15%
    valor_adicional = valorBaseAjustado + (valorBaseAjustado * 0.15);
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
        // CORREÇÃO: Não aplicar 10% aqui pois os valores locais já vêm com 10% a mais
        const somaValores = tresPrimeirasFuncoes.reduce((acc, f) => {
          const valorAjustado = f.valor_base;
          const valorCom15 = valorAjustado + (valorAjustado * 0.15);
          return acc + valorCom15;
        }, 0);
        valor_adicional = somaValores / 3;
      } else {
        valor_adicional = valorBaseAjustado + (valorBaseAjustado * 0.15);
      }
    } else {
      valor_adicional = valorBaseAjustado + (valorBaseAjustado * 0.15);
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
        // CORREÇÃO: Não aplicar 10% aqui pois os valores locais já vêm com 10% a mais
        const somaValores = funcoesParaMedia.reduce((acc, f) => {
          const valorAjustado = f.valor_base;
          return acc + (valorAjustado + (valorAjustado * 0.15));
        }, 0);
        valor_adicional = somaValores / funcoesParaMedia.length;
      } else {
        valor_adicional = valorBaseAjustado + (valorBaseAjustado * 0.15);
      }
    } else {
      valor_adicional = valorBaseAjustado + (valorBaseAjustado * 0.15);
    }
  }
  
  return {
    funcao,
    valor_base: valorBaseAjustado, // Retorna valor base sem alteração (10% já aplicado nos valores locais)
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

// NOVA FUNÇÃO: Calcula automaticamente valores locais baseados nos remotos (10% a mais)
export const calcularValoresLocaisAutomaticos = (valoresRemotos: {
  funcional: number;
  tecnico: number;
  abap?: number;
  dba: number;
  gestor: number;
}) => {
  console.log('🔄 [FUNÇÃO] Calculando valores locais para:', valoresRemotos);
  
  const resultado = {
    funcional: (valoresRemotos.funcional || 0) * 1.10,
    tecnico: (valoresRemotos.tecnico || 0) * 1.10,
    abap: valoresRemotos.abap ? valoresRemotos.abap * 1.10 : 0,
    dba: (valoresRemotos.dba || 0) * 1.10,
    gestor: (valoresRemotos.gestor || 0) * 1.10,
  };
  
  console.log('🔄 [FUNÇÃO] Resultado calculado:', resultado);
  return resultado;
};

// =====================================================
// CAMPOS ESPECÍFICOS POR CLIENTE
// =====================================================

// Interface para configuração de campos específicos por cliente
export interface CampoEspecificoCliente {
  campo: keyof TaxaFormData;
  label: string;
  placeholder?: string;
}

// Mapeamento de campos específicos por nome abreviado do cliente
export const getCamposEspecificosPorCliente = (nomeAbreviado: string): CampoEspecificoCliente[] => {
  const nomeUpper = nomeAbreviado?.toUpperCase();
  
  switch (nomeUpper) {
    case 'VOTORANTIM':
      return [
        { campo: 'valor_ticket', label: 'Valor do Ticket', placeholder: 'Ex: 150,00' },
        { campo: 'valor_ticket_excedente', label: 'Valor do Ticket Excedente', placeholder: 'Ex: 200,00' }
      ];
      
    case 'EXXONMOBIL':
      return [
        { campo: 'ticket_excedente_simples', label: 'Ticket Excedente - Ticket Simples', placeholder: 'Ex: 100,00' },
        { campo: 'ticket_excedente_complexo', label: 'Ticket Excedente - Ticket Complexo', placeholder: 'Ex: 250,00' }
      ];
      
    case 'CHIESI':
      return [
        { campo: 'ticket_excedente_1', label: 'Ticket Base', placeholder: 'Ex: 120,00' },
        { campo: 'ticket_excedente_2', label: 'Ticket Excedente', placeholder: 'Ex: 180,00' }
      ];
      
    case 'CSN':
      return [
        { campo: 'valor_ticket', label: 'Valor do Ticket', placeholder: 'Ex: 130,00' },
        { campo: 'valor_ticket_excedente', label: 'Valor do Ticket Excedente', placeholder: 'Ex: 170,00' }
      ];
      
    case 'NIDEC':
      return [
        { campo: 'ticket_excedente', label: 'Ticket Excedente', placeholder: 'Ex: 160,00' }
      ];
      
    default:
      return [];
  }
};

// Função para verificar se um cliente tem campos específicos
export const clienteTemCamposEspecificos = (nomeAbreviado: string): boolean => {
  return getCamposEspecificosPorCliente(nomeAbreviado).length > 0;
};
