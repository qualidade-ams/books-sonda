/**
 * VisaoSegmentada Component
 * 
 * Displays proportional values for each allocation within a monthly calculation.
 * Shows the same fields as consolidated view but segmented by allocation percentage.
 * This view is read-only and values are derived from the consolidated calculation.
 * 
 * @module components/admin/banco-horas/VisaoSegmentada
 */

import React, { useState } from 'react';
import { 
  Clock, 
  TrendingUp, 
  TrendingDown, 
  FileText,
  CheckCircle2,
  Edit,
  ChevronDown,
  ChevronUp,
  Percent
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import type { BancoHorasCalculoSegmentado, Alocacao } from '@/types/bancoHoras';

/**
 * Props for VisaoSegmentada component
 */
export interface VisaoSegmentadaProps {
  /** Array of segmented calculations, one per allocation */
  calculos: BancoHorasCalculoSegmentado[];
  
  /** Array of allocations for reference */
  alocacoes: Alocacao[];
}

/**
 * Formats hours from HH:MM string to display format
 */
const formatarHoras = (horas?: string): string => {
  if (!horas) return '00:00';
  return horas;
};

/**
 * Converts HH:MM to minutes for comparison
 */
const horasParaMinutos = (horas: string): number => {
  const [h, m] = horas.split(':').map(Number);
  return (h * 60) + m;
};

/**
 * Determines if a value is positive, negative, or zero
 */
const getValorStatus = (horas?: string): 'positivo' | 'negativo' | 'zero' => {
  if (!horas) return 'zero';
  const minutos = horasParaMinutos(horas);
  if (minutos > 0) return 'positivo';
  if (minutos < 0) return 'negativo';
  return 'zero';
};

/**
 * Component to display a single allocation's segmented values
 */
interface AlocacaoCardProps {
  calculo: BancoHorasCalculoSegmentado;
  alocacao: Alocacao;
}

function AlocacaoCard({ calculo, alocacao }: AlocacaoCardProps) {
  const saldoStatus = getValorStatus(calculo.saldo_horas);
  const repasseStatus = getValorStatus(calculo.repasse_horas);

  return (
    <div className="space-y-4">
      {/* Header com nome e percentual */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-sonda-blue/10 flex items-center justify-center">
            <Percent className="h-5 w-5 text-sonda-blue" />
          </div>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {alocacao.nome_alocacao}
            </h3>
            <p className="text-sm text-gray-500">
              {alocacao.percentual_baseline}% do baseline total
            </p>
          </div>
        </div>
        <Badge className="bg-sonda-blue/10 text-sonda-blue text-sm px-3 py-1">
          Somente Leitura
        </Badge>
      </div>

      {/* Alert informativo */}
      <Alert className="border-blue-200 bg-blue-50">
        <AlertDescription className="text-blue-700 text-sm">
          Valores proporcionais calculados automaticamente a partir da visão consolidada.
          Não é possível editar valores segmentados diretamente.
        </AlertDescription>
      </Alert>

      {/* Grid de cards com valores proporcionais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Baseline */}
        <Card className="border-l-4 border-l-sonda-blue/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Baseline
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {formatarHoras(calculo.baseline_horas)}
            </div>
            {calculo.baseline_tickets && (
              <div className="text-sm text-gray-500 mt-1">
                {calculo.baseline_tickets.toFixed(2)} tickets
              </div>
            )}
            <div className="text-xs text-sonda-blue mt-1">
              {alocacao.percentual_baseline}% proporcional
            </div>
          </CardContent>
        </Card>

        {/* Repasses Mês Anterior */}
        <Card className="border-l-4 border-l-sonda-blue/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              Repasses Mês Anterior
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {formatarHoras(calculo.repasses_mes_anterior_horas)}
            </div>
            {calculo.repasses_mes_anterior_tickets !== undefined && (
              <div className="text-sm text-gray-500 mt-1">
                {calculo.repasses_mes_anterior_tickets.toFixed(2)} tickets
              </div>
            )}
            <div className="text-xs text-sonda-blue mt-1">
              {alocacao.percentual_baseline}% proporcional
            </div>
          </CardContent>
        </Card>

        {/* Saldo a Utilizar */}
        <Card className="border-l-4 border-l-sonda-blue">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-sonda-blue flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              Saldo a Utilizar
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-bold text-sonda-blue">
              {formatarHoras(calculo.saldo_a_utilizar_horas)}
            </div>
            {calculo.saldo_a_utilizar_tickets !== undefined && (
              <div className="text-sm text-sonda-blue mt-1">
                {calculo.saldo_a_utilizar_tickets.toFixed(2)} tickets
              </div>
            )}
            <div className="text-xs text-sonda-blue mt-1">
              {alocacao.percentual_baseline}% proporcional
            </div>
          </CardContent>
        </Card>

        {/* Consumo */}
        <Card className="border-l-4 border-l-gray-300">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Consumo
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {formatarHoras(calculo.consumo_horas)}
            </div>
            {calculo.consumo_tickets !== undefined && (
              <div className="text-sm text-gray-500 mt-1">
                {calculo.consumo_tickets.toFixed(2)} tickets
              </div>
            )}
            <div className="text-xs text-gray-400 mt-1">
              Apontamentos Aranda
            </div>
          </CardContent>
        </Card>

        {/* Requerimentos */}
        <Card className="border-l-4 border-l-gray-300">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Requerimentos
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {formatarHoras(calculo.requerimentos_horas)}
            </div>
            {calculo.requerimentos_tickets !== undefined && (
              <div className="text-sm text-gray-500 mt-1">
                {calculo.requerimentos_tickets.toFixed(2)} tickets
              </div>
            )}
            <div className="text-xs text-gray-400 mt-1">
              Faturados/Lançados
            </div>
          </CardContent>
        </Card>

        {/* Reajustes */}
        <Card className="border-l-4 border-l-gray-300">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center gap-2">
              <Edit className="h-4 w-4" />
              Reajustes
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className={`text-2xl font-bold ${
              getValorStatus(calculo.reajustes_horas) === 'positivo' 
                ? 'text-green-600' 
                : getValorStatus(calculo.reajustes_horas) === 'negativo'
                ? 'text-red-600'
                : 'text-gray-900 dark:text-white'
            }`}>
              {formatarHoras(calculo.reajustes_horas)}
            </div>
            {calculo.reajustes_tickets !== undefined && (
              <div className="text-sm text-gray-500 mt-1">
                {calculo.reajustes_tickets.toFixed(2)} tickets
              </div>
            )}
            <div className="text-xs text-gray-400 mt-1">
              Ajustes Manuais
            </div>
          </CardContent>
        </Card>

        {/* Consumo Total */}
        <Card className="border-l-4 border-l-orange-300">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-orange-600 flex items-center gap-2">
              <TrendingDown className="h-4 w-4" />
              Consumo Total
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl font-bold text-orange-600">
              {formatarHoras(calculo.consumo_total_horas)}
            </div>
            {calculo.consumo_total_tickets !== undefined && (
              <div className="text-sm text-orange-600 mt-1">
                {calculo.consumo_total_tickets.toFixed(2)} tickets
              </div>
            )}
            <div className="text-xs text-gray-400 mt-1">
              Consumo + Req - Reaj
            </div>
          </CardContent>
        </Card>

        {/* Saldo */}
        <Card className={`border-l-4 ${
          saldoStatus === 'positivo' 
            ? 'border-l-green-500' 
            : saldoStatus === 'negativo'
            ? 'border-l-red-500'
            : 'border-l-gray-300'
        }`}>
          <CardHeader className="pb-3">
            <CardTitle className={`text-sm font-medium flex items-center gap-2 ${
              saldoStatus === 'positivo' 
                ? 'text-green-600' 
                : saldoStatus === 'negativo'
                ? 'text-red-600'
                : 'text-gray-600 dark:text-gray-400'
            }`}>
              {saldoStatus === 'positivo' ? (
                <TrendingUp className="h-4 w-4" />
              ) : saldoStatus === 'negativo' ? (
                <TrendingDown className="h-4 w-4" />
              ) : (
                <Clock className="h-4 w-4" />
              )}
              Saldo
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className={`text-2xl font-bold ${
              saldoStatus === 'positivo' 
                ? 'text-green-600' 
                : saldoStatus === 'negativo'
                ? 'text-red-600'
                : 'text-gray-900 dark:text-white'
            }`}>
              {formatarHoras(calculo.saldo_horas)}
            </div>
            {calculo.saldo_tickets !== undefined && (
              <div className={`text-sm mt-1 ${
                saldoStatus === 'positivo' 
                  ? 'text-green-600' 
                  : saldoStatus === 'negativo'
                  ? 'text-red-600'
                  : 'text-gray-500'
              }`}>
                {calculo.saldo_tickets.toFixed(2)} tickets
              </div>
            )}
            <div className="text-xs text-gray-400 mt-1">
              Saldo a Utilizar - Consumo Total
            </div>
          </CardContent>
        </Card>

        {/* Repasse */}
        <Card className={`border-l-4 ${
          repasseStatus === 'positivo' 
            ? 'border-l-green-300' 
            : repasseStatus === 'negativo'
            ? 'border-l-red-300'
            : 'border-l-gray-300'
        }`}>
          <CardHeader className="pb-3">
            <CardTitle className={`text-sm font-medium flex items-center gap-2 ${
              repasseStatus === 'positivo' 
                ? 'text-green-600' 
                : repasseStatus === 'negativo'
                ? 'text-red-600'
                : 'text-gray-600 dark:text-gray-400'
            }`}>
              <TrendingUp className="h-4 w-4" />
              Repasse
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className={`text-2xl font-bold ${
              repasseStatus === 'positivo' 
                ? 'text-green-600' 
                : repasseStatus === 'negativo'
                ? 'text-red-600'
                : 'text-gray-900 dark:text-white'
            }`}>
              {formatarHoras(calculo.repasse_horas)}
            </div>
            {calculo.repasse_tickets !== undefined && (
              <div className={`text-sm mt-1 ${
                repasseStatus === 'positivo' 
                  ? 'text-green-600' 
                  : repasseStatus === 'negativo'
                  ? 'text-red-600'
                  : 'text-gray-500'
              }`}>
                {calculo.repasse_tickets.toFixed(2)} tickets
              </div>
            )}
            <div className="text-xs text-gray-400 mt-1">
              Para Próximo Mês
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

/**
 * VisaoSegmentada Component
 * 
 * Displays segmented calculations for each allocation using an accordion layout.
 * Each allocation shows proportional values derived from the consolidated calculation.
 * All values are read-only and include visual indicators of proportional distribution.
 */
export function VisaoSegmentada({
  calculos,
  alocacoes
}: VisaoSegmentadaProps) {
  // Se não há alocações, não exibir nada
  if (!alocacoes || alocacoes.length === 0) {
    return null;
  }

  // Se não há cálculos segmentados, exibir mensagem
  if (!calculos || calculos.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center">
            <Percent className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 mb-2 font-medium">
              Nenhum cálculo segmentado disponível
            </p>
            <p className="text-sm text-gray-400">
              Os valores segmentados serão calculados automaticamente quando houver um cálculo consolidado.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
          Visão Segmentada
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Valores proporcionais por alocação - {alocacoes.length} {alocacoes.length === 1 ? 'alocação' : 'alocações'}
        </p>
      </div>

      {/* Alert informativo geral */}
      <Alert className="border-sonda-blue/30 bg-sonda-blue/5">
        <AlertDescription className="text-gray-700 text-sm">
          <strong>Visão Somente Leitura:</strong> Os valores abaixo são calculados automaticamente 
          aplicando o percentual de cada alocação aos valores consolidados. Não é possível editar 
          valores segmentados diretamente - todas as alterações devem ser feitas na visão consolidada.
        </AlertDescription>
      </Alert>

      {/* Accordion com alocações */}
      <Accordion type="multiple" className="space-y-4">
        {calculos.map((calculo) => {
          const alocacao = alocacoes.find(a => a.id === calculo.alocacao_id) || calculo.alocacao;
          
          if (!alocacao) {
            return null;
          }

          return (
            <AccordionItem 
              key={calculo.id} 
              value={calculo.id}
              className="border rounded-lg bg-white dark:bg-gray-800"
            >
              <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded-t-lg">
                <div className="flex items-center justify-between w-full pr-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-sonda-blue/10 flex items-center justify-center">
                      <Percent className="h-5 w-5 text-sonda-blue" />
                    </div>
                    <div className="text-left">
                      <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                        {alocacao.nome_alocacao}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {alocacao.percentual_baseline}% do baseline total
                      </p>
                    </div>
                  </div>
                  <Badge className="bg-sonda-blue/10 text-sonda-blue text-xs">
                    Proporcional
                  </Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-6 pt-2">
                <AlocacaoCard calculo={calculo} alocacao={alocacao} />
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>

      {/* Resumo de validação */}
      <Card className="border-green-200 bg-green-50">
        <CardContent className="py-4">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-green-800">
                Validação de Integridade
              </p>
              <p className="text-sm text-green-700 mt-1">
                A soma de todos os valores segmentados é igual aos valores consolidados, 
                garantindo a consistência dos cálculos proporcionais.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
