/**
 * Utilitários para badges de resposta de satisfação
 * Padroniza as cores dos badges entre diferentes telas
 */

import React from 'react';
import { Badge } from '@/components/ui/badge';

/**
 * Função para obter badge de resposta padronizado
 * Hierarquia de cores do pior para o melhor:
 * - Muito Insatisfeito: Vermelho (bg-red-600)
 * - Insatisfeito: Laranja (bg-orange-500)
 * - Neutro: Amarelo (bg-yellow-500)
 * - Satisfeito: Azul (bg-blue-500)
 * - Muito Satisfeito: Verde (bg-green-600)
 */
export const getBadgeResposta = (resposta: string | null | undefined) => {
  if (!resposta) return null;

  const respostaNormalizada = resposta.trim().toLowerCase();

  // Muito Insatisfeito (Pior)
  if (respostaNormalizada.includes('muito insatisfeito')) {
    return (
      <Badge variant="destructive" className="text-xs px-2 py-1 bg-red-600 hover:bg-red-700 whitespace-nowrap">
        Muito Insatisfeito
      </Badge>
    );
  }

  // Insatisfeito
  if (respostaNormalizada.includes('insatisfeito') && !respostaNormalizada.includes('muito')) {
    return (
      <Badge variant="destructive" className="text-xs px-2 py-1 bg-orange-500 hover:bg-orange-600 whitespace-nowrap">
        Insatisfeito
      </Badge>
    );
  }

  // Neutro
  if (respostaNormalizada.includes('neutro')) {
    return (
      <Badge variant="secondary" className="text-xs px-2 py-1 bg-yellow-500 hover:bg-yellow-600 text-white whitespace-nowrap">
        Neutro
      </Badge>
    );
  }

  // Satisfeito
  if (respostaNormalizada.includes('satisfeito') && !respostaNormalizada.includes('muito')) {
    return (
      <Badge variant="default" className="text-xs px-2 py-1 bg-blue-500 hover:bg-blue-600 whitespace-nowrap">
        Satisfeito
      </Badge>
    );
  }

  // Muito Satisfeito (Melhor)
  if (respostaNormalizada.includes('muito satisfeito')) {
    return (
      <Badge variant="default" className="text-xs px-2 py-1 bg-green-600 hover:bg-green-700 whitespace-nowrap">
        Muito Satisfeito
      </Badge>
    );
  }

  // Resposta não reconhecida - usar badge outline
  return (
    <Badge variant="outline" className="text-xs px-2 py-1 whitespace-nowrap">
      {resposta}
    </Badge>
  );
};