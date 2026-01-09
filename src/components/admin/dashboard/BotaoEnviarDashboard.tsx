/**
 * Componente para botão de envio de dashboard por email
 * Visível apenas para usuários com perfil Administrador ou Qualidade
 */

import { useState } from 'react';
import { Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import ProtectedAction from '@/components/auth/ProtectedAction';
import { ModalEnvioDashboard } from './ModalEnvioDashboard';

interface BotaoEnviarDashboardProps {
  abaAtiva: string;
  filtros: {
    ano: number;
    mes: number | 'todos';
    modulo?: string;
  };
  dadosDashboard?: any;
}

export function BotaoEnviarDashboard({ 
  abaAtiva, 
  filtros, 
  dadosDashboard 
}: BotaoEnviarDashboardProps) {
  const [modalAberto, setModalAberto] = useState(false);

  // Mapear nomes das abas para títulos mais amigáveis
  const getTituloAba = (aba: string): string => {
    const titulos: Record<string, string> = {
      'requerimentos': 'Requerimentos',
      'planos-acao': 'Planos de Ação',
      'elogios': 'Elogios',
      'empresas': 'Empresas'
    };
    return titulos[aba] || aba;
  };

  return (
    <>
      <ProtectedAction 
        screenKey="dashboard" 
        requiredLevel="edit"
      >
        <Button
          onClick={() => setModalAberto(true)}
          size="sm"
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          <Send className="h-4 w-4 mr-2" />
          Enviar Email
        </Button>
      </ProtectedAction>

      <ModalEnvioDashboard
        aberto={modalAberto}
        onFechar={() => setModalAberto(false)}
        abaAtiva={abaAtiva}
        tituloAba={getTituloAba(abaAtiva)}
        filtros={filtros}
        dadosDashboard={dadosDashboard}
      />
    </>
  );
}