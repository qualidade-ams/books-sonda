/**
 * Componente para exibir nome do cliente com tratamento especial para BRFONSDAGUIRRE
 */

import React from 'react';
import { useVerificarEspecialista } from '@/hooks/useVerificarEspecialista';
import { 
  isClienteEspecialBRFONSDAGUIRRE, 
  processarNomeClienteEspecial, 
  extrairNomeParaVerificacao 
} from '@/utils/clienteEspecialUtils';

interface ClienteNomeDisplayProps {
  nomeEmpresa: string | undefined;
  nomeCliente?: string | undefined;
  className?: string;
  title?: string;
}

export const ClienteNomeDisplay: React.FC<ClienteNomeDisplayProps> = ({
  nomeEmpresa,
  nomeCliente,
  className = '',
  title
}) => {
  // Extrair nome do cliente para verificação na tabela especialistas
  const nomeParaVerificacao = extrairNomeParaVerificacao(nomeEmpresa, nomeCliente);
  
  // Log para debug
  console.log('🎯 [ClienteNomeDisplay] Debug:', {
    nomeEmpresa,
    nomeCliente,
    nomeParaVerificacao,
    isClienteEspecial: isClienteEspecialBRFONSDAGUIRRE(nomeEmpresa)
  });
  
  // Verificar se é especialista (só faz a query se for o cliente especial)
  const { data: isEspecialista = false, isLoading } = useVerificarEspecialista(nomeParaVerificacao);

  // Log do resultado da verificação
  console.log('🎯 [ClienteNomeDisplay] Resultado verificação:', {
    nomeParaVerificacao,
    isEspecialista,
    isLoading
  });

  // Processar o nome da empresa baseado na verificação do cliente
  const { nomeExibicao, isEspecial, corEspecial } = processarNomeClienteEspecial(
    nomeEmpresa,
    nomeCliente,
    isEspecialista
  );

  // Log do processamento final
  console.log('🎯 [ClienteNomeDisplay] Resultado final:', {
    nomeEmpresa,
    nomeCliente,
    nomeExibicao,
    isEspecial,
    isEspecialista
  });

  // Aplicar classe de cor especial se necessário
  const classeFinal = isEspecial && corEspecial 
    ? `${className} ${corEspecial}` 
    : className;

  // Para SONDA e SONDA INTERNO, não exibir tooltip
  const shouldShowTooltip = !isEspecial || (nomeExibicao !== 'SONDA' && nomeExibicao !== 'SONDA INTERNO');
  
  const tooltipText = shouldShowTooltip 
    ? (title || (isEspecial ? `Cliente especial: ${nomeEmpresa} (Cliente: ${nomeCliente}) → ${nomeExibicao}` : nomeEmpresa))
    : undefined;

  return (
    <span 
      className={classeFinal}
      title={tooltipText}
    >
      {nomeExibicao}
    </span>
  );
};

export default ClienteNomeDisplay;