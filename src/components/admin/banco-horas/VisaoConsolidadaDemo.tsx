/**
 * VisaoConsolidadaDemo Component
 * 
 * Demonstration component for VisaoConsolidada with sample data.
 * Useful for testing and showcasing the component's features.
 * 
 * @module components/admin/banco-horas/VisaoConsolidadaDemo
 */

import React, { useState } from 'react';
import { VisaoConsolidada } from './VisaoConsolidada';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import type { BancoHorasCalculo } from '@/types/bancoHoras';

/**
 * Sample calculation data for demonstration
 */
const calculoExemplo: BancoHorasCalculo = {
  id: 'demo-calculo-123',
  empresa_id: 'demo-empresa-456',
  mes: 1,
  ano: 2026,
  versao: 1,
  
  // Valores calculados - Horas
  baseline_horas: '160:00',
  repasses_mes_anterior_horas: '20:00',
  saldo_a_utilizar_horas: '180:00',
  consumo_horas: '150:00',
  requerimentos_horas: '30:00',
  reajustes_horas: '10:00',
  consumo_total_horas: '170:00',
  saldo_horas: '10:00',
  repasse_horas: '05:00',
  excedentes_horas: '00:00',
  valor_excedentes_horas: 0,
  
  // Valores calculados - Tickets
  baseline_tickets: 50,
  repasses_mes_anterior_tickets: 5,
  saldo_a_utilizar_tickets: 55,
  consumo_tickets: 45,
  requerimentos_tickets: 8,
  reajustes_tickets: 3,
  consumo_total_tickets: 50,
  saldo_tickets: 5,
  repasse_tickets: 2.5,
  excedentes_tickets: 0,
  valor_excedentes_tickets: 0,
  
  // Metadados
  valor_a_faturar: 0,
  observacao_publica: 'Mês com consumo dentro do esperado. Saldo positivo será repassado para o próximo período.',
  is_fim_periodo: false,
  taxa_hora_utilizada: 100,
  taxa_ticket_utilizada: 50,
  
  created_at: new Date('2026-01-15T10:00:00'),
  updated_at: new Date('2026-01-15T10:00:00'),
  created_by: 'demo-user-789',
  updated_by: 'demo-user-789'
};

/**
 * Sample calculation with negative balance (overages)
 */
const calculoComExcedentes: BancoHorasCalculo = {
  ...calculoExemplo,
  id: 'demo-calculo-excedentes',
  versao: 2,
  consumo_horas: '200:00',
  consumo_total_horas: '220:00',
  saldo_horas: '-40:00',
  repasse_horas: '-40:00',
  excedentes_horas: '40:00',
  valor_excedentes_horas: 4000,
  valor_a_faturar: 4000,
  is_fim_periodo: true,
  observacao_publica: 'Saldo negativo detectado. Excedente de 40 horas será faturado no valor de R$ 4.000,00.',
  updated_at: new Date('2026-01-20T14:30:00')
};

/**
 * Sample calculation at end of period
 */
const calculoFimPeriodo: BancoHorasCalculo = {
  ...calculoExemplo,
  id: 'demo-calculo-fim-periodo',
  versao: 1,
  is_fim_periodo: true,
  observacao_publica: 'Último mês do período de apuração. Saldo positivo será zerado conforme regras contratuais.',
  updated_at: new Date('2026-01-25T16:45:00')
};

/**
 * VisaoConsolidadaDemo Component
 */
export function VisaoConsolidadaDemo() {
  const { toast } = useToast();
  const [cenarioAtual, setCenarioAtual] = useState<'normal' | 'excedentes' | 'fim-periodo'>('normal');
  
  const calculos = {
    normal: calculoExemplo,
    excedentes: calculoComExcedentes,
    'fim-periodo': calculoFimPeriodo
  };
  
  const calculo = calculos[cenarioAtual];
  
  const handleReajusteClick = () => {
    toast({
      title: 'Criar Reajuste',
      description: 'Modal de criação de reajuste seria aberto aqui.',
    });
  };
  
  const handleHistoricoClick = () => {
    toast({
      title: 'Ver Histórico',
      description: 'Modal de histórico de versões seria aberto aqui.',
    });
  };
  
  const handleExportClick = () => {
    toast({
      title: 'Exportar',
      description: 'Exportação para PDF/Excel seria iniciada aqui.',
    });
  };
  
  return (
    <div className="space-y-6">
      {/* Controles de demonstração */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Demonstração - VisaoConsolidada</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm text-gray-600 mb-3">
              Selecione um cenário para visualizar diferentes estados do componente:
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={cenarioAtual === 'normal' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCenarioAtual('normal')}
                className={cenarioAtual === 'normal' ? 'bg-sonda-blue hover:bg-sonda-dark-blue' : ''}
              >
                Cenário Normal
              </Button>
              <Button
                variant={cenarioAtual === 'excedentes' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCenarioAtual('excedentes')}
                className={cenarioAtual === 'excedentes' ? 'bg-sonda-blue hover:bg-sonda-dark-blue' : ''}
              >
                Com Excedentes
              </Button>
              <Button
                variant={cenarioAtual === 'fim-periodo' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCenarioAtual('fim-periodo')}
                className={cenarioAtual === 'fim-periodo' ? 'bg-sonda-blue hover:bg-sonda-dark-blue' : ''}
              >
                Fim de Período
              </Button>
            </div>
          </div>
          
          <div className="pt-4 border-t">
            <p className="text-sm font-medium text-gray-700 mb-2">Cenário Atual:</p>
            <div className="flex items-center gap-2">
              {cenarioAtual === 'normal' && (
                <>
                  <Badge className="bg-green-100 text-green-800">Normal</Badge>
                  <span className="text-sm text-gray-600">
                    Saldo positivo, sem excedentes
                  </span>
                </>
              )}
              {cenarioAtual === 'excedentes' && (
                <>
                  <Badge className="bg-red-100 text-red-800">Com Excedentes</Badge>
                  <span className="text-sm text-gray-600">
                    Saldo negativo, valor a faturar
                  </span>
                </>
              )}
              {cenarioAtual === 'fim-periodo' && (
                <>
                  <Badge className="bg-blue-100 text-blue-800">Fim de Período</Badge>
                  <span className="text-sm text-gray-600">
                    Último mês do período de apuração
                  </span>
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Componente VisaoConsolidada */}
      <VisaoConsolidada
        calculo={calculo}
        onReajusteClick={handleReajusteClick}
        onHistoricoClick={handleHistoricoClick}
        onExportClick={handleExportClick}
      />
      
      {/* Debug info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dados do Cálculo (Debug)</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="text-xs bg-gray-50 p-4 rounded-lg overflow-auto max-h-96">
            {JSON.stringify(calculo, null, 2)}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}
