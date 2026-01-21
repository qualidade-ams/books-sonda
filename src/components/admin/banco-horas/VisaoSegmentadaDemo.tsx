/**
 * VisaoSegmentadaDemo Component
 * 
 * Demonstration component for VisaoSegmentada with sample data.
 * Useful for testing and showcasing the component's features.
 * 
 * @module components/admin/banco-horas/VisaoSegmentadaDemo
 */

import React, { useState } from 'react';
import { VisaoSegmentada } from './VisaoSegmentada';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { BancoHorasCalculoSegmentado, Alocacao } from '@/types/bancoHoras';

/**
 * Sample allocations for demonstration
 */
const alocacoesDemo: Alocacao[] = [
  {
    id: 'aloc-1',
    empresa_id: 'empresa-demo',
    nome_alocacao: 'Departamento de TI',
    percentual_baseline: 40,
    ativo: true,
    created_at: new Date('2024-01-01'),
    updated_at: new Date('2024-01-01'),
  },
  {
    id: 'aloc-2',
    empresa_id: 'empresa-demo',
    nome_alocacao: 'Suporte ao Cliente',
    percentual_baseline: 35,
    ativo: true,
    created_at: new Date('2024-01-01'),
    updated_at: new Date('2024-01-01'),
  },
  {
    id: 'aloc-3',
    empresa_id: 'empresa-demo',
    nome_alocacao: 'Projetos Especiais',
    percentual_baseline: 25,
    ativo: true,
    created_at: new Date('2024-01-01'),
    updated_at: new Date('2024-01-01'),
  },
];

/**
 * Sample segmented calculations for demonstration
 */
const calculosSegmentadosDemo: BancoHorasCalculoSegmentado[] = [
  {
    id: 'seg-1',
    calculo_id: 'calc-demo',
    alocacao_id: 'aloc-1',
    alocacao: alocacoesDemo[0],
    baseline_horas: '64:00', // 40% de 160:00
    repasses_mes_anterior_horas: '08:00', // 40% de 20:00
    saldo_a_utilizar_horas: '72:00', // 40% de 180:00
    consumo_horas: '48:00', // 40% de 120:00
    requerimentos_horas: '12:00', // 40% de 30:00
    reajustes_horas: '00:00',
    consumo_total_horas: '60:00', // 40% de 150:00
    saldo_horas: '12:00', // 40% de 30:00
    repasse_horas: '09:36', // 40% de 24:00 (80% de 30:00)
    baseline_tickets: 40, // 40% de 100
    repasses_mes_anterior_tickets: 4, // 40% de 10
    saldo_a_utilizar_tickets: 44, // 40% de 110
    consumo_tickets: 32, // 40% de 80
    requerimentos_tickets: 8, // 40% de 20
    reajustes_tickets: 0,
    consumo_total_tickets: 40, // 40% de 100
    saldo_tickets: 4, // 40% de 10
    repasse_tickets: 3.2, // 40% de 8 (80% de 10)
    created_at: new Date('2024-01-15'),
  },
  {
    id: 'seg-2',
    calculo_id: 'calc-demo',
    alocacao_id: 'aloc-2',
    alocacao: alocacoesDemo[1],
    baseline_horas: '56:00', // 35% de 160:00
    repasses_mes_anterior_horas: '07:00', // 35% de 20:00
    saldo_a_utilizar_horas: '63:00', // 35% de 180:00
    consumo_horas: '42:00', // 35% de 120:00
    requerimentos_horas: '10:30', // 35% de 30:00
    reajustes_horas: '00:00',
    consumo_total_horas: '52:30', // 35% de 150:00
    saldo_horas: '10:30', // 35% de 30:00
    repasse_horas: '08:24', // 35% de 24:00 (80% de 30:00)
    baseline_tickets: 35, // 35% de 100
    repasses_mes_anterior_tickets: 3.5, // 35% de 10
    saldo_a_utilizar_tickets: 38.5, // 35% de 110
    consumo_tickets: 28, // 35% de 80
    requerimentos_tickets: 7, // 35% de 20
    reajustes_tickets: 0,
    consumo_total_tickets: 35, // 35% de 100
    saldo_tickets: 3.5, // 35% de 10
    repasse_tickets: 2.8, // 35% de 8 (80% de 10)
    created_at: new Date('2024-01-15'),
  },
  {
    id: 'seg-3',
    calculo_id: 'calc-demo',
    alocacao_id: 'aloc-3',
    alocacao: alocacoesDemo[2],
    baseline_horas: '40:00', // 25% de 160:00
    repasses_mes_anterior_horas: '05:00', // 25% de 20:00
    saldo_a_utilizar_horas: '45:00', // 25% de 180:00
    consumo_horas: '30:00', // 25% de 120:00
    requerimentos_horas: '07:30', // 25% de 30:00
    reajustes_horas: '00:00',
    consumo_total_horas: '37:30', // 25% de 150:00
    saldo_horas: '07:30', // 25% de 30:00
    repasse_horas: '06:00', // 25% de 24:00 (80% de 30:00)
    baseline_tickets: 25, // 25% de 100
    repasses_mes_anterior_tickets: 2.5, // 25% de 10
    saldo_a_utilizar_tickets: 27.5, // 25% de 110
    consumo_tickets: 20, // 25% de 80
    requerimentos_tickets: 5, // 25% de 20
    reajustes_tickets: 0,
    consumo_total_tickets: 25, // 25% de 100
    saldo_tickets: 2.5, // 25% de 10
    repasse_tickets: 2, // 25% de 8 (80% de 10)
    created_at: new Date('2024-01-15'),
  },
];

/**
 * VisaoSegmentadaDemo Component
 */
export function VisaoSegmentadaDemo() {
  const [mostrarVazio, setMostrarVazio] = useState(false);

  return (
    <div className="space-y-6">
      {/* Controles de demonstração */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Demonstração - VisaoSegmentada</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm text-gray-600 mb-4">
              Visualize diferentes cenários da Visão Segmentada:
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={!mostrarVazio ? 'default' : 'outline'}
                size="sm"
                onClick={() => setMostrarVazio(false)}
                className={!mostrarVazio ? 'bg-sonda-blue hover:bg-sonda-dark-blue' : ''}
              >
                Com Alocações
              </Button>
              <Button
                variant={mostrarVazio ? 'default' : 'outline'}
                size="sm"
                onClick={() => setMostrarVazio(true)}
                className={mostrarVazio ? 'bg-sonda-blue hover:bg-sonda-dark-blue' : ''}
              >
                Sem Alocações
              </Button>
            </div>
          </div>

          {/* Informações sobre o cenário atual */}
          <div className="border-t pt-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Cenário Atual:</h4>
            {!mostrarVazio ? (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge className="bg-sonda-blue/10 text-sonda-blue">
                    3 Alocações
                  </Badge>
                  <span className="text-sm text-gray-600">
                    Departamento de TI (40%), Suporte ao Cliente (35%), Projetos Especiais (25%)
                  </span>
                </div>
                <p className="text-sm text-gray-600">
                  Valores proporcionais calculados a partir de um baseline consolidado de 160:00 horas.
                </p>
                <p className="text-sm text-gray-600">
                  Cada alocação mostra seus valores em um accordion expansível.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <Badge className="bg-gray-100 text-gray-600">
                  Sem Alocações
                </Badge>
                <p className="text-sm text-gray-600">
                  Quando não há alocações configuradas, a visão segmentada não é exibida.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Componente VisaoSegmentada */}
      <VisaoSegmentada
        calculos={mostrarVazio ? [] : calculosSegmentadosDemo}
        alocacoes={mostrarVazio ? [] : alocacoesDemo}
      />

      {/* Informações adicionais */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="py-4">
          <h4 className="text-sm font-medium text-blue-800 mb-2">
            Características da Visão Segmentada:
          </h4>
          <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
            <li>Valores são calculados automaticamente aplicando o percentual de cada alocação</li>
            <li>Todos os campos são somente leitura (não editáveis)</li>
            <li>A soma de todos os valores segmentados é igual ao valor consolidado</li>
            <li>Cada alocação é exibida em um accordion expansível</li>
            <li>Indicadores visuais mostram que os valores são proporcionais</li>
            <li>Bordas coloridas nas laterais dos cards indicam o tipo de valor</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
