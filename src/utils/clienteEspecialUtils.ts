/**
 * Utilitários para tratamento de clientes especiais
 */

/**
 * Verifica se um cliente é o caso especial BRFONSDAGUIRRE
 */
export function isClienteEspecialBRFONSDAGUIRRE(nomeCliente: string | undefined): boolean {
  if (!nomeCliente) return false;
  
  const nomeNormalizado = nomeCliente.toLowerCase().trim();
  return nomeNormalizado.includes('brfonsdaguirre') && 
         nomeNormalizado.includes('sonda') && 
         nomeNormalizado.includes('procwork');
}

/**
 * Processa o nome do cliente especial BRFONSDAGUIRRE baseado na verificação de especialista
 */
export function processarNomeClienteEspecial(
  nomeEmpresa: string | undefined,
  nomeCliente: string | undefined,
  isEspecialista: boolean
): {
  nomeExibicao: string;
  isEspecial: boolean;
  corEspecial?: string;
} {
  // Se não é o cliente especial, retorna o nome original da empresa
  if (!isClienteEspecialBRFONSDAGUIRRE(nomeEmpresa)) {
    return {
      nomeExibicao: nomeEmpresa || 'N/A',
      isEspecial: false
    };
  }

  console.log('🎯 [processarNomeClienteEspecial] Processando cliente especial:', {
    empresa: nomeEmpresa,
    cliente: nomeCliente,
    isEspecialista
  });

  // É o cliente especial BRFONSDAGUIRRE
  // Se o NOME DO CLIENTE está na tabela especialistas → "SONDA INTERNO"
  // Se o NOME DO CLIENTE NÃO está na tabela especialistas → "SONDA"
  const nomeProcessado = isEspecialista ? 'SONDA INTERNO' : 'SONDA';
  
  console.log('✅ [processarNomeClienteEspecial] Resultado:', {
    empresaOriginal: nomeEmpresa,
    clienteVerificado: nomeCliente,
    nomeProcessado,
    isEspecialista,
    logica: isEspecialista ? 'Cliente encontrado na tabela especialistas' : 'Cliente NÃO encontrado na tabela especialistas'
  });
  
  return {
    nomeExibicao: nomeProcessado,
    isEspecial: true,
    corEspecial: 'text-black' // Cor preta para cliente especial
  };
}

/**
 * Extrai o nome do cliente para verificação na tabela especialistas
 * Para BRFONSDAGUIRRE, retorna o nome do cliente (não da empresa) para verificação
 */
export function extrairNomeParaVerificacao(nomeEmpresa: string | undefined, nomeCliente?: string | undefined): string | undefined {
  // Se não é o cliente especial BRFONSDAGUIRRE, não faz verificação
  if (!nomeEmpresa || !isClienteEspecialBRFONSDAGUIRRE(nomeEmpresa)) {
    return undefined;
  }

  console.log('🔍 [extrairNomeParaVerificacao] Processando cliente especial:', {
    empresa: nomeEmpresa,
    cliente: nomeCliente
  });

  // Para o cliente especial BRFONSDAGUIRRE, verificamos se o NOME DO CLIENTE
  // está cadastrado na tabela especialistas
  if (nomeCliente && nomeCliente.trim() !== '') {
    console.log('✅ [extrairNomeParaVerificacao] Usando nome do cliente para verificação:', nomeCliente);
    return nomeCliente.trim();
  }

  console.log('❌ [extrairNomeParaVerificacao] Nome do cliente não fornecido para empresa especial:', nomeEmpresa);
  return undefined;
}