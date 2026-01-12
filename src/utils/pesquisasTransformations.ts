/**
 * Utilitários para transformações automáticas de dados de pesquisas
 */

export interface DadosPesquisaTransformacao {
  empresa: string;
  cliente: string;
  solicitante?: string | null;
}

export interface ResultadoTransformacao {
  dadosTransformados: DadosPesquisaTransformacao;
  foiTransformado: boolean;
  motivoTransformacao?: string;
}

/**
 * Aplica transformação automática para clientes com "-AMS"
 * 
 * Regra: Se cliente contém "-AMS":
 * 1. Empresa → "SONDA INTERNO"
 * 2. Cliente → valor do campo solicitante
 */
export function aplicarTransformacaoAMS(dados: DadosPesquisaTransformacao): ResultadoTransformacao {
  // Verificar se cliente contém "-AMS"
  const clienteContemAMS = dados.cliente && dados.cliente.includes('-AMS');
  
  if (!clienteContemAMS) {
    return {
      dadosTransformados: dados,
      foiTransformado: false
    };
  }

  // Verificar se há solicitante para substituir o cliente
  if (!dados.solicitante || dados.solicitante.trim() === '') {
    console.warn('⚠️ [TRANSFORMAÇÃO] Cliente contém "-AMS" mas solicitante está vazio:', {
      cliente: dados.cliente,
      solicitante: dados.solicitante
    });
    
    return {
      dadosTransformados: dados,
      foiTransformado: false,
      motivoTransformacao: 'Solicitante vazio - transformação não aplicada'
    };
  }

  // Aplicar transformação
  const dadosTransformados = {
    ...dados,
    empresa: 'SONDA INTERNO',
    cliente: dados.solicitante.trim()
  };

  console.log('✅ [TRANSFORMAÇÃO] Aplicada transformação AMS:', {
    original: {
      empresa: dados.empresa,
      cliente: dados.cliente,
      solicitante: dados.solicitante
    },
    transformado: {
      empresa: dadosTransformados.empresa,
      cliente: dadosTransformados.cliente,
      solicitante: dadosTransformados.solicitante
    }
  });

  return {
    dadosTransformados,
    foiTransformado: true,
    motivoTransformacao: `Cliente "${dados.cliente}" contém "-AMS" - transformado para SONDA INTERNO`
  };
}

/**
 * Aplica todas as transformações disponíveis
 */
export function aplicarTodasTransformacoes(dados: DadosPesquisaTransformacao): ResultadoTransformacao {
  // Por enquanto, apenas a transformação AMS
  // Futuras transformações podem ser adicionadas aqui
  return aplicarTransformacaoAMS(dados);
}