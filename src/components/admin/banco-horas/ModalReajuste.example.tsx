/**
 * Exemplo de uso do componente ModalReajuste
 * 
 * Este arquivo demonstra como integrar o ModalReajuste em uma página
 * de controle de banco de horas.
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Edit } from 'lucide-react';
import { ModalReajuste } from './ModalReajuste';
import { useBancoHorasCalculos } from '@/hooks/useBancoHoras';

export const ExemploUsoModalReajuste: React.FC = () => {
  const [modalReajusteAberto, setModalReajusteAberto] = useState(false);
  
  // Dados de exemplo
  const empresaId = 'uuid-empresa-exemplo';
  const mes = 3;
  const ano = 2024;
  
  // Buscar cálculo atual
  const { calculo, refetch } = useBancoHorasCalculos(empresaId, mes, ano);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Controle de Banco de Horas</h1>
      
      {/* Botão para abrir modal */}
      <Button
        onClick={() => setModalReajusteAberto(true)}
        className="bg-sonda-blue hover:bg-sonda-dark-blue"
      >
        <Edit className="h-4 w-4 mr-2" />
        Criar Reajuste
      </Button>

      {/* Modal de Reajuste */}
      <ModalReajuste
        open={modalReajusteAberto}
        onClose={() => setModalReajusteAberto(false)}
        empresaId={empresaId}
        mes={mes}
        ano={ano}
        calculoAtual={calculo}
        onSuccess={() => {
          // Recarregar dados após sucesso
          refetch();
          console.log('Reajuste criado com sucesso!');
        }}
      />
    </div>
  );
};

/**
 * Exemplo de uso com ProtectedAction (controle de permissões)
 */
export const ExemploComPermissoes: React.FC = () => {
  const [modalReajusteAberto, setModalReajusteAberto] = useState(false);
  
  const empresaId = 'uuid-empresa-exemplo';
  const mes = 3;
  const ano = 2024;
  
  const { calculo, refetch } = useBancoHorasCalculos(empresaId, mes, ano);

  return (
    <div className="p-6">
      {/* Botão protegido por permissão */}
      <ProtectedAction screenKey="BANCO_HORAS" action="CREATE">
        <Button
          onClick={() => setModalReajusteAberto(true)}
          className="bg-sonda-blue hover:bg-sonda-dark-blue"
        >
          <Edit className="h-4 w-4 mr-2" />
          Criar Reajuste
        </Button>
      </ProtectedAction>

      <ModalReajuste
        open={modalReajusteAberto}
        onClose={() => setModalReajusteAberto(false)}
        empresaId={empresaId}
        mes={mes}
        ano={ano}
        calculoAtual={calculo}
        onSuccess={() => refetch()}
      />
    </div>
  );
};

/**
 * Exemplo de uso em tabela de cálculos
 */
export const ExemploEmTabela: React.FC = () => {
  const [modalReajusteAberto, setModalReajusteAberto] = useState(false);
  const [calculoSelecionado, setCalculoSelecionado] = useState<{
    empresaId: string;
    mes: number;
    ano: number;
    calculo?: any;
  } | null>(null);

  const handleAbrirReajuste = (empresaId: string, mes: number, ano: number, calculo: any) => {
    setCalculoSelecionado({ empresaId, mes, ano, calculo });
    setModalReajusteAberto(true);
  };

  return (
    <div className="p-6">
      <table className="w-full">
        <thead>
          <tr>
            <th>Mês/Ano</th>
            <th>Saldo</th>
            <th>Ações</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>03/2024</td>
            <td>10:30</td>
            <td>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleAbrirReajuste(
                  'uuid-empresa',
                  3,
                  2024,
                  { saldo_horas: '10:30' }
                )}
              >
                <Edit className="h-4 w-4" />
              </Button>
            </td>
          </tr>
        </tbody>
      </table>

      {calculoSelecionado && (
        <ModalReajuste
          open={modalReajusteAberto}
          onClose={() => {
            setModalReajusteAberto(false);
            setCalculoSelecionado(null);
          }}
          empresaId={calculoSelecionado.empresaId}
          mes={calculoSelecionado.mes}
          ano={calculoSelecionado.ano}
          calculoAtual={calculoSelecionado.calculo}
          onSuccess={() => {
            // Recarregar dados da tabela
            console.log('Recarregar tabela');
          }}
        />
      )}
    </div>
  );
};
