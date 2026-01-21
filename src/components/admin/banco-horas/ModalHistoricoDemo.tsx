/**
 * Demonstração do componente ModalHistorico
 * 
 * Este arquivo demonstra como usar o ModalHistorico com dados de exemplo
 * para visualização e testes.
 * 
 * @module components/admin/banco-horas/ModalHistoricoDemo
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { History } from 'lucide-react';
import { ModalHistorico } from './ModalHistorico';
import type { BancoHorasVersao } from '@/types/bancoHoras';

/**
 * Dados de exemplo de versões
 */
const versoesExemplo: BancoHorasVersao[] = [
  {
    id: 'versao-1',
    calculo_id: 'calculo-1',
    versao_anterior: 0,
    versao_nova: 1,
    dados_anteriores: {},
    dados_novos: {
      baseline_horas: '160:00',
      consumo_horas: '150:00',
      saldo_horas: '10:00',
      repasse_horas: '5:00',
    },
    motivo: 'Cálculo inicial do mês',
    tipo_mudanca: 'recalculo',
    created_at: new Date('2024-01-15T10:00:00'),
    created_by: 'usuario-1',
  },
  {
    id: 'versao-2',
    calculo_id: 'calculo-1',
    versao_anterior: 1,
    versao_nova: 2,
    dados_anteriores: {
      baseline_horas: '160:00',
      consumo_horas: '150:00',
      saldo_horas: '10:00',
      repasse_horas: '5:00',
    },
    dados_novos: {
      baseline_horas: '160:00',
      consumo_horas: '150:00',
      reajustes_horas: '10:00',
      consumo_total_horas: '140:00',
      saldo_horas: '20:00',
      repasse_horas: '10:00',
    },
    motivo: 'Reajuste de 10 horas aplicado devido a erro no lançamento de apontamentos',
    tipo_mudanca: 'reajuste',
    created_at: new Date('2024-01-16T14:30:00'),
    created_by: 'usuario-2',
  },
  {
    id: 'versao-3',
    calculo_id: 'calculo-1',
    versao_anterior: 2,
    versao_nova: 3,
    dados_anteriores: {
      baseline_horas: '160:00',
      consumo_horas: '150:00',
      reajustes_horas: '10:00',
      consumo_total_horas: '140:00',
      saldo_horas: '20:00',
      repasse_horas: '10:00',
    },
    dados_novos: {
      baseline_horas: '160:00',
      consumo_horas: '155:00',
      reajustes_horas: '10:00',
      consumo_total_horas: '145:00',
      saldo_horas: '15:00',
      repasse_horas: '7:30',
    },
    motivo: 'Recálculo automático após atualização de apontamentos',
    tipo_mudanca: 'recalculo',
    created_at: new Date('2024-01-17T09:15:00'),
    created_by: 'sistema',
  },
  {
    id: 'versao-4',
    calculo_id: 'calculo-1',
    versao_anterior: 3,
    versao_nova: 4,
    dados_anteriores: {
      baseline_horas: '160:00',
      consumo_horas: '155:00',
      reajustes_horas: '10:00',
      consumo_total_horas: '145:00',
      saldo_horas: '15:00',
      repasse_horas: '7:30',
    },
    dados_novos: {
      baseline_horas: '160:00',
      consumo_horas: '155:00',
      reajustes_horas: '10:00',
      consumo_total_horas: '145:00',
      saldo_horas: '15:00',
      repasse_horas: '7:30',
      observacao_publica: 'Saldo positivo confirmado para repasse',
    },
    motivo: 'Correção de observação pública',
    tipo_mudanca: 'correcao',
    created_at: new Date('2024-01-18T11:45:00'),
    created_by: 'usuario-1',
  },
];

/**
 * Componente de demonstração do ModalHistorico
 */
export const ModalHistoricoDemo: React.FC = () => {
  const [modalAberto, setModalAberto] = useState(false);

  /**
   * Função de comparação de exemplo
   */
  const handleCompararVersoes = (versao1: BancoHorasVersao, versao2: BancoHorasVersao) => {
    const dados1 = versao1.dados_novos;
    const dados2 = versao2.dados_novos;

    const camposAdicionados = Object.keys(dados2).filter(
      campo => !(campo in dados1)
    );

    const camposRemovidos = Object.keys(dados1).filter(
      campo => !(campo in dados2)
    );

    const camposModificados: Array<{
      campo: string;
      valor_anterior: any;
      valor_novo: any;
    }> = [];

    for (const campo of Object.keys(dados1)) {
      if (campo in dados2 && dados1[campo] !== dados2[campo]) {
        camposModificados.push({
          campo,
          valor_anterior: dados1[campo],
          valor_novo: dados2[campo],
        });
      }
    }

    return {
      campos_adicionados: camposAdicionados,
      campos_removidos: camposRemovidos,
      campos_modificados: camposModificados,
    };
  };

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-sonda-blue flex items-center gap-2">
            <History className="h-5 w-5" />
            Demonstração - Modal de Histórico de Versões
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <p className="text-gray-600">
              Este componente exibe o histórico completo de versões de um cálculo mensal,
              permitindo visualização de mudanças, comparação entre versões e filtros.
            </p>

            <div className="space-y-2">
              <h4 className="font-medium text-gray-900">Funcionalidades:</h4>
              <ul className="list-disc list-inside space-y-1 text-sm text-gray-600">
                <li>Lista de versões com timestamp e usuário</li>
                <li>Botão "Comparar" entre duas versões</li>
                <li>Diff visual entre versões</li>
                <li>Exibição do motivo da mudança</li>
                <li>Filtros por data e tipo de mudança</li>
                <li>Badges coloridos por tipo (reajuste, recálculo, correção)</li>
                <li>Seleção de até 2 versões para comparação</li>
              </ul>
            </div>

            <div className="pt-4 border-t">
              <Button
                onClick={() => setModalAberto(true)}
                className="bg-sonda-blue hover:bg-sonda-dark-blue"
              >
                <History className="h-4 w-4 mr-2" />
                Abrir Modal de Histórico
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Modal de Histórico */}
      <ModalHistorico
        open={modalAberto}
        onClose={() => setModalAberto(false)}
        empresaId="empresa-exemplo"
        mes={1}
        ano={2024}
        versoes={versoesExemplo}
        isLoading={false}
        onCompararVersoes={handleCompararVersoes}
      />
    </div>
  );
};

export default ModalHistoricoDemo;
