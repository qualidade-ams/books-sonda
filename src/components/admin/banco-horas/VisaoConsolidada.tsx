/**
 * VisaoConsolidada Component
 * 
 * Displays all calculated fields for the consolidated view of monthly hours bank calculations
 * in a table format similar to the reference image provided.
 * 
 * @module components/admin/banco-horas/VisaoConsolidada
 */

import React from 'react';
import { 
  Download,
  History,
  Edit
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import ProtectedAction from '@/components/auth/ProtectedAction';
import type { BancoHorasCalculo } from '@/types/bancoHoras';

/**
 * Props for VisaoConsolidada component
 */
export interface VisaoConsolidadaProps {
  /** Array of monthly calculations (one for each month in the period) */
  calculos: BancoHorasCalculo[];
  
  /** Period of appraisal (1=monthly, 3=quarterly, etc.) */
  periodoApuracao: number;
  
  /** Callback when "Criar Reajuste" button is clicked */
  onReajusteClick: () => void;
  
  /** Callback when "Ver Histórico" button is clicked */
  onHistoricoClick: () => void;
  
  /** Callback when "Exportar" button is clicked */
  onExportClick: () => void;
  
  /** Whether actions are disabled (e.g., during loading) */
  disabled?: boolean;
}

/**
 * Formats hours from HH:MM string to display format
 */
const formatarHoras = (horas?: string): string => {
  if (!horas) return '00:00:00';
  // Garantir formato HH:MM:SS
  const parts = horas.split(':');
  if (parts.length === 2) {
    return `${parts[0]}:${parts[1]}:00`;
  }
  return horas;
};

/**
 * Formats monetary values to Brazilian Real
 */
const formatarMoeda = (valor?: number): string => {
  if (valor === undefined || valor === null) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(valor);
};

/**
 * Converts HH:MM to minutes for comparison
 */
const horasParaMinutos = (horas: string): number => {
  const [h, m] = horas.split(':').map(Number);
  return (h * 60) + m;
};

/**
 * Determines color class based on value (positive/negative/zero)
 */
const getColorClass = (horas?: string): string => {
  if (!horas) return 'text-gray-900';
  const minutos = horasParaMinutos(horas);
  if (minutos > 0) return 'text-green-600';
  if (minutos < 0) return 'text-red-600';
  return 'text-gray-900';
};

/**
 * VisaoConsolidada Component
 * 
 * Displays the consolidated view of monthly hours bank calculations in a table format.
 */
export function VisaoConsolidada({
  calculos,
  periodoApuracao,
  onReajusteClick,
  onHistoricoClick,
  onExportClick,
  disabled = false
}: VisaoConsolidadaProps) {
  // Usar primeiro cálculo para informações gerais
  const calculoPrincipal = calculos[0];
  const temExcedentes = calculoPrincipal?.excedentes_horas && horasParaMinutos(calculoPrincipal.excedentes_horas) > 0;
  
  // Nomes dos meses
  const MESES = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <CardTitle className="text-lg">Visão Consolidada</CardTitle>
            <p className="text-sm text-gray-500 mt-1">
              Cálculo mensal completo - Versão {calculoPrincipal?.versao || 1}
            </p>
          </div>
          
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={onHistoricoClick}
              disabled={disabled}
              className="flex items-center gap-2"
            >
              <History className="h-4 w-4" />
              Ver Histórico
            </Button>
            
            <ProtectedAction screenKey="controle_banco_horas" requiredLevel="edit">
              <Button
                variant="outline"
                size="sm"
                onClick={onReajusteClick}
                disabled={disabled}
                className="flex items-center gap-2"
              >
                <Edit className="h-4 w-4" />
                Criar Reajuste
              </Button>
            </ProtectedAction>
            
            <Button
              variant="outline"
              size="sm"
              onClick={onExportClick}
              disabled={disabled}
              className="flex items-center gap-2"
            >
              <Download className="h-4 w-4" />
              Exportar
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-sonda-blue hover:bg-sonda-blue">
                <TableHead className="text-white font-semibold">Mês</TableHead>
                {calculos.map((calculo, index) => (
                  <TableHead key={index} className="text-white font-semibold text-center">
                    {MESES[calculo.mes - 1]}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {/* Banco Contratado (Baseline) */}
              <TableRow className="bg-sonda-blue hover:bg-sonda-blue">
                <TableCell className="font-semibold text-white">Banco Contratado</TableCell>
                {calculos.map((calculo, index) => (
                  <TableCell key={index} className="text-center font-semibold text-white">
                    {formatarHoras(calculo.baseline_horas)}
                  </TableCell>
                ))}
              </TableRow>

              {/* Repasse mês anterior */}
              <TableRow className="bg-gray-50">
                <TableCell className="font-medium">Repasse mês anterior</TableCell>
                {calculos.map((calculo, index) => (
                  <TableCell key={index} className={`text-center font-semibold ${getColorClass(calculo.repasses_mes_anterior_horas)}`}>
                    {formatarHoras(calculo.repasses_mes_anterior_horas)}
                  </TableCell>
                ))}
              </TableRow>

              {/* Saldo a utilizar */}
              <TableRow className="bg-gray-50">
                <TableCell className="font-medium">Saldo a utilizar</TableCell>
                {calculos.map((calculo, index) => (
                  <TableCell key={index} className="text-center font-semibold text-gray-900">
                    {formatarHoras(calculo.saldo_a_utilizar_horas)}
                  </TableCell>
                ))}
              </TableRow>

              {/* Consumo Chamados */}
              <TableRow>
                <TableCell className="font-medium">Consumo Chamados</TableCell>
                {calculos.map((calculo, index) => (
                  <TableCell key={index} className="text-center font-semibold text-gray-900">
                    {formatarHoras(calculo.consumo_horas)}
                  </TableCell>
                ))}
              </TableRow>

              {/* Requerimentos */}
              <TableRow>
                <TableCell className="font-medium">Requerimentos</TableCell>
                {calculos.map((calculo, index) => (
                  <TableCell key={index} className="text-center font-semibold text-gray-900">
                    {formatarHoras(calculo.requerimentos_horas)}
                  </TableCell>
                ))}
              </TableRow>

              {/* Abatimento (Reajustes) */}
              <TableRow>
                <TableCell className="font-medium">Abatimento</TableCell>
                {calculos.map((calculo, index) => (
                  <TableCell key={index} className={`text-center font-semibold ${getColorClass(calculo.reajustes_horas)}`}>
                    {formatarHoras(calculo.reajustes_horas)}
                  </TableCell>
                ))}
              </TableRow>

              {/* Consumo Total */}
              <TableRow className="bg-gray-50">
                <TableCell className="font-medium">Consumo Total</TableCell>
                {calculos.map((calculo, index) => (
                  <TableCell key={index} className="text-center font-semibold text-gray-900">
                    {formatarHoras(calculo.consumo_total_horas)}
                  </TableCell>
                ))}
              </TableRow>

              {/* Saldo */}
              <TableRow className="bg-gray-50">
                <TableCell className="font-medium">Saldo</TableCell>
                {calculos.map((calculo, index) => (
                  <TableCell key={index} className={`text-center font-semibold ${getColorClass(calculo.saldo_horas)}`}>
                    {formatarHoras(calculo.saldo_horas)}
                  </TableCell>
                ))}
              </TableRow>

              {/* Repasse - 100% */}
              <TableRow className="bg-gray-50">
                <TableCell className="font-medium">Repasse - 100%</TableCell>
                {calculos.map((calculo, index) => (
                  <TableCell key={index} className={`text-center font-semibold ${getColorClass(calculo.repasse_horas)}`}>
                    {formatarHoras(calculo.repasse_horas)}
                  </TableCell>
                ))}
              </TableRow>

              {/* Seção de Valor Taxa / Total a Faturar */}
              <TableRow className="bg-sonda-blue hover:bg-sonda-blue">
                <TableCell className="text-white font-semibold text-center" colSpan={calculos.length + 1}>
                  VALOR TAXA / TOTAL A FATURAR
                </TableCell>
              </TableRow>

              {/* Excedente Trimestre */}
              {temExcedentes && (
                <TableRow className="bg-gray-50">
                  <TableCell className="font-medium">Excedente Trimestre</TableCell>
                  <TableCell className="text-center font-semibold text-green-600" colSpan={calculos.length}>
                    {formatarHoras(calculoPrincipal.excedentes_horas)}
                  </TableCell>
                </TableRow>
              )}

              {/* Taxa/hora Excedente */}
              <TableRow>
                <TableCell className="font-medium">Taxa/hora Excedente</TableCell>
                <TableCell className="text-center font-semibold text-gray-900" colSpan={calculos.length}>
                  {calculoPrincipal?.taxa_hora_utilizada ? formatarMoeda(calculoPrincipal.taxa_hora_utilizada) : 'R$ 0,00'}
                </TableCell>
              </TableRow>

              {/* Valor Total */}
              <TableRow>
                <TableCell className="font-medium">Valor Total</TableCell>
                <TableCell className="text-center font-semibold text-gray-900" colSpan={calculos.length}>
                  {formatarMoeda(calculoPrincipal?.valor_a_faturar)}
                </TableCell>
              </TableRow>

              {/* Mensagem de fim de período */}
              {calculoPrincipal?.is_fim_periodo && (
                <TableRow className="bg-blue-50">
                  <TableCell colSpan={calculos.length + 1} className="text-center font-semibold text-blue-800">
                    Final do Trimestre o saldo é zerado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Observação Pública */}
        {calculoPrincipal?.observacao_publica && (
          <div className="mt-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
            <h4 className="text-sm font-semibold text-gray-700 mb-2">Observação Pública</h4>
            <p className="text-sm text-gray-600 whitespace-pre-wrap">
              {calculoPrincipal.observacao_publica}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
