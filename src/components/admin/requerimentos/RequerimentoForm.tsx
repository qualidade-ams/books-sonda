import React, { useEffect, useMemo, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CalendarIcon, Calculator, HelpCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';

import { requerimentoFormSchema } from '@/schemas/requerimentosSchemas';
import {
  RequerimentoFormData,
  Requerimento,
  MODULO_OPTIONS,
  LINGUAGEM_OPTIONS,
  TIPO_COBRANCA_OPTIONS,
  requerValorHora
} from '@/types/requerimentos';
import { useClientesRequerimentos } from '@/hooks/useRequerimentos';
import { cn } from '@/lib/utils';
import { useResponsive } from '@/hooks/useResponsive';
import { useAccessibility } from '@/hooks/useAccessibility';
import { FormFieldHelp, OptimizedTooltip, ValidationFeedback } from './HelpSystem';
import { LoadingSpinner } from '@/components/admin/requerimentos/LoadingStates';

interface RequerimentoFormProps {
  requerimento?: Requerimento;
  onSubmit: (data: RequerimentoFormData) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export function RequerimentoForm({
  requerimento,
  onSubmit,
  onCancel,
  isLoading = false
}: RequerimentoFormProps) {
  const { data: clientes = [], isLoading: isLoadingClientes } = useClientesRequerimentos();
  const { form: responsiveForm, modal: responsiveModal } = useResponsive();
  const { screenReader, focusManagement } = useAccessibility();

  const form = useForm<RequerimentoFormData>({
    resolver: zodResolver(requerimentoFormSchema),
    defaultValues: {
      chamado: requerimento?.chamado || '',
      cliente_id: requerimento?.cliente_id || '',
      modulo: requerimento?.modulo || 'Comply',
      descricao: requerimento?.descricao || '',
      data_envio: requerimento?.data_envio || format(new Date(), 'yyyy-MM-dd'),
      data_aprovacao: requerimento?.data_aprovacao || '', // Deixar em branco por padrão
      horas_funcional: requerimento?.horas_funcional || 0,
      horas_tecnico: requerimento?.horas_tecnico || 0,
      linguagem: requerimento?.linguagem || 'Funcional',
      tipo_cobranca: requerimento?.tipo_cobranca || 'Faturado',
      mes_cobranca: requerimento?.mes_cobranca || new Date().getMonth() + 1,
      observacao: requerimento?.observacao || '',
      // Campos de valor/hora
      valor_hora_funcional: requerimento?.valor_hora_funcional || undefined,
      valor_hora_tecnico: requerimento?.valor_hora_tecnico || undefined
    }
  });

  // Watch para calcular horas total e valores automaticamente
  const horasFuncional = form.watch('horas_funcional');
  const horasTecnico = form.watch('horas_tecnico');
  const tipoCobranca = form.watch('tipo_cobranca');
  const valorHoraFuncional = form.watch('valor_hora_funcional');
  const valorHoraTecnico = form.watch('valor_hora_tecnico');

  // Verificar se o tipo de cobrança requer campos de valor/hora
  const mostrarCamposValor = useMemo(() => {
    return requerValorHora(tipoCobranca);
  }, [tipoCobranca]);

  // Cálculo automático das horas totais
  const horasTotal = useMemo(() => {
    const funcional = Number(horasFuncional) || 0;
    const tecnico = Number(horasTecnico) || 0;
    return funcional + tecnico;
  }, [horasFuncional, horasTecnico]);

  // Cálculos automáticos de valores
  const valoresCalculados = useMemo(() => {
    if (!mostrarCamposValor) {
      return {
        valorTotalFuncional: 0,
        valorTotalTecnico: 0,
        valorTotalGeral: 0
      };
    }

    const hFunc = Number(horasFuncional) || 0;
    const hTec = Number(horasTecnico) || 0;
    const vFunc = Number(valorHoraFuncional) || 0;
    const vTec = Number(valorHoraTecnico) || 0;

    const valorTotalFuncional = hFunc * vFunc;
    const valorTotalTecnico = hTec * vTec;
    const valorTotalGeral = valorTotalFuncional + valorTotalTecnico;

    return {
      valorTotalFuncional,
      valorTotalTecnico,
      valorTotalGeral
    };
  }, [horasFuncional, horasTecnico, valorHoraFuncional, valorHoraTecnico, mostrarCamposValor]);

  // Opções de mês para select
  const mesesOptions = [
    { value: 1, label: 'Janeiro' },
    { value: 2, label: 'Fevereiro' },
    { value: 3, label: 'Março' },
    { value: 4, label: 'Abril' },
    { value: 5, label: 'Maio' },
    { value: 6, label: 'Junho' },
    { value: 7, label: 'Julho' },
    { value: 8, label: 'Agosto' },
    { value: 9, label: 'Setembro' },
    { value: 10, label: 'Outubro' },
    { value: 11, label: 'Novembro' },
    { value: 12, label: 'Dezembro' }
  ];

  // Cores para tipos de cobrança
  const getCorTipoCobranca = (tipo: string) => {
    const cores = {
      'Banco de Horas': 'bg-blue-100 text-blue-800 border-blue-300',
      'Cobro Interno': 'bg-green-100 text-green-800 border-green-300',
      'Contrato': 'bg-gray-100 text-gray-800 border-gray-300',
      'Faturado': 'bg-orange-100 text-orange-800 border-orange-300',
      'Hora Extra': 'bg-red-100 text-red-800 border-red-300',
      'Sobreaviso': 'bg-purple-100 text-purple-800 border-purple-300',
      'Reprovado': 'bg-slate-100 text-slate-800 border-slate-300',
      'Bolsão Enel': 'bg-yellow-100 text-yellow-800 border-yellow-300'
    };
    return cores[tipo as keyof typeof cores] || 'bg-gray-100 text-gray-800 border-gray-300';
  };

  const handleSubmit = useCallback(async (data: RequerimentoFormData) => {
    try {
      screenReader.announceLoading('Salvando requerimento...');
      await onSubmit(data);
      if (!requerimento) {
        form.reset();
        screenReader.announceSuccess('Requerimento criado com sucesso');
      } else {
        screenReader.announceSuccess('Requerimento atualizado com sucesso');
      }
    } catch (error) {
      console.error('Erro ao submeter formulário:', error);
      screenReader.announceError('Erro ao salvar requerimento');
    }
  }, [onSubmit, requerimento, form, screenReader]);

  // Validações em tempo real
  const chamadoValidation = useMemo(() => [
    {
      test: (value: string) => value.length > 0,
      message: 'Chamado é obrigatório',
      type: 'error' as const
    },
    {
      test: (value: string) => /^[A-Za-z0-9\-]+$/.test(value),
      message: 'Use apenas letras, números e hífen',
      type: 'error' as const
    },
    {
      test: (value: string) => value.length >= 3,
      message: 'Mínimo 3 caracteres',
      type: 'warning' as const
    }
  ], []);

  return (
    <Card className={cn("w-full mx-auto", responsiveModal.maxWidth)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {requerimento ? 'Editar Requerimento' : 'Novo Requerimento'}
          {tipoCobranca && (
            <Badge className={cn('ml-2', getCorTipoCobranca(tipoCobranca))}>
              {tipoCobranca}
            </Badge>
          )}
          <OptimizedTooltip content="Preencha todos os campos obrigatórios para criar o requerimento">
            <HelpCircle className="h-4 w-4 text-blue-500" />
          </OptimizedTooltip>
        </CardTitle>
      </CardHeader>
      <CardContent className={responsiveModal.padding}>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className={responsiveForm.spacing}>
            {/* Seção: Informações Básicas */}
            <div className={responsiveForm.spacing}>
              <h3 className="text-lg font-semibold flex items-center gap-2">
                Informações Básicas
                <OptimizedTooltip content="Dados principais do requerimento">
                  <HelpCircle className="h-4 w-4 text-gray-400" />
                </OptimizedTooltip>
              </h3>

              <div className={cn("grid gap-4", responsiveForm.fieldLayout)}>
                {/* Chamado */}
                <FormField
                  control={form.control}
                  name="chamado"
                  render={({ field }) => (
                    <FormFieldHelp
                      label="Chamado"
                      required
                      helpText="Código único do chamado técnico. Use apenas letras, números e hífen."
                      description="Formato: letras, números e hífen (ex: RF-6017993)"
                      error={form.formState.errors.chamado?.message}
                    >
                      <Input
                        {...field}
                        placeholder="Ex: RF-6017993"
                        className="uppercase"
                        aria-describedby="chamado-help"
                        disabled={isLoading}
                      />
                      <ValidationFeedback
                        value={field.value || ''}
                        rules={chamadoValidation}
                        showOnlyErrors
                      />
                    </FormFieldHelp>
                  )}
                />

                {/* Cliente */}
                <FormField
                  control={form.control}
                  name="cliente_id"
                  render={({ field }) => (
                    <FormFieldHelp
                      label="Cliente"
                      required
                      helpText="Selecione o cliente responsável pelo requerimento da lista de empresas ativas."
                      error={form.formState.errors.cliente_id?.message}
                    >
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                        disabled={isLoading || isLoadingClientes}
                      >
                        <SelectTrigger aria-describedby="cliente-help">
                          <SelectValue placeholder="Selecione um cliente" />
                        </SelectTrigger>
                        <SelectContent>
                          {isLoadingClientes ? (
                            <SelectItem value="__loading__" disabled>
                              <LoadingSpinner size="sm" text="Carregando..." />
                            </SelectItem>
                          ) : clientes.length === 0 ? (
                            <SelectItem value="__no_clients__" disabled>
                              Nenhum cliente encontrado
                            </SelectItem>
                          ) : (
                            clientes.map((cliente) => (
                              <SelectItem key={cliente.id} value={cliente.id}>
                                {cliente.nome_completo}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </FormFieldHelp>
                  )}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Módulo */}
                <FormField
                  control={form.control}
                  name="modulo"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Módulo *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione um módulo" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {MODULO_OPTIONS.map((modulo) => (
                            <SelectItem key={modulo.value} value={modulo.value}>
                              {modulo.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Linguagem */}
                <FormField
                  control={form.control}
                  name="linguagem"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Linguagem *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione uma linguagem" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {LINGUAGEM_OPTIONS.map((linguagem) => (
                            <SelectItem key={linguagem.value} value={linguagem.value}>
                              {linguagem.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Descrição */}
              <FormField
                control={form.control}
                name="descricao"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição *</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Descreva o requerimento..."
                        className="min-h-[100px]"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Máximo 500 caracteres ({(field.value || '').length}/500)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <Separator />

            {/* Seção: Datas */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Datas</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Data de Envio */}
                <FormField
                  control={form.control}
                  name="data_envio"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Data de Envio *</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(new Date(field.value), "dd/MM/yyyy", { locale: ptBR })
                              ) : (
                                <span>Selecione uma data</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value ? new Date(field.value) : undefined}
                            onSelect={(date) => field.onChange(date ? format(date, 'yyyy-MM-dd') : '')}
                            disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Data de Aprovação */}
                <FormField
                  control={form.control}
                  name="data_aprovacao"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Data de Aprovação</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(new Date(field.value), "dd/MM/yyyy", { locale: ptBR })
                              ) : (
                                <span>Selecione uma data (opcional)</span>
                              )}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value ? new Date(field.value) : undefined}
                            onSelect={(date) => field.onChange(date ? format(date, 'yyyy-MM-dd') : '')}
                            disabled={(date) => {
                              const dataEnvio = form.getValues('data_envio');
                              return date < new Date(dataEnvio) || date > new Date() || date < new Date("1900-01-01");
                            }}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormDescription>
                        Data opcional. Se informada, deve ser igual ou posterior à data de envio.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <Separator />

            {/* Seção: Horas */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Calculator className="h-5 w-5" />
                Controle de Horas
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Horas Funcionais */}
                <FormField
                  control={form.control}
                  name="horas_funcional"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Horas Funcionais *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="1"
                          min="0"
                          max="9999"
                          placeholder="0"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormDescription>
                        Número inteiro de horas (ex: 120)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Horas Técnicas */}
                <FormField
                  control={form.control}
                  name="horas_tecnico"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Horas Técnicas *</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="1"
                          min="0"
                          max="9999"
                          placeholder="0"
                          {...field}
                          onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormDescription>
                        Número inteiro de horas (ex: 80)
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Horas Total (calculado automaticamente) */}
                <div className="space-y-2">
                  <Label>Horas Total</Label>
                  <div className="flex items-center h-10 px-3 py-2 border border-input bg-muted rounded-md">
                    <span className="font-semibold text-lg">
                      {horasTotal}h
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Calculado automaticamente
                  </p>
                </div>
              </div>
            </div>

            {/* Seção: Valores (condicional) */}
            {tipoCobranca && ['Faturado', 'Hora Extra', 'Sobreaviso', 'Bolsão Enel'].includes(tipoCobranca) && (
              <>
                <Separator />
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    💰 Valores por Hora
                    <OptimizedTooltip content="Campos obrigatórios para tipos de cobrança com valor monetário">
                      <HelpCircle className="h-4 w-4 text-blue-500" />
                    </OptimizedTooltip>
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Valor Hora Funcional */}
                    <FormField
                      control={form.control}
                      name="valor_hora_funcional"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Valor/Hora Funcional *</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                                R$
                              </span>
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                max="99999.99"
                                placeholder="0,00"
                                className="pl-8"
                                {...field}
                                onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                              />
                            </div>
                          </FormControl>
                          <FormDescription>
                            Valor em reais por hora funcional
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Valor Hora Técnico */}
                    <FormField
                      control={form.control}
                      name="valor_hora_tecnico"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Valor/Hora Técnico *</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">
                                R$
                              </span>
                              <Input
                                type="number"
                                step="0.01"
                                min="0"
                                max="99999.99"
                                placeholder="0,00"
                                className="pl-8"
                                {...field}
                                onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                              />
                            </div>
                          </FormControl>
                          <FormDescription>
                            Valor em reais por hora técnica
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Valor Total Estimado */}
                    <div className="space-y-2">
                      <Label>Valor Total Estimado</Label>
                      <div className="flex items-center h-10 px-3 py-2 border border-input bg-muted rounded-md">
                        <span className="font-semibold text-lg text-green-600">
                          R$ {(() => {
                            const valorFuncional = (form.watch('valor_hora_funcional') || 0) * horasFuncional;
                            const valorTecnico = (form.watch('valor_hora_tecnico') || 0) * horasTecnico;
                            const total = valorFuncional + valorTecnico;
                            return total.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                          })()}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Calculado automaticamente
                      </p>
                    </div>
                  </div>
                </div>
              </>
            )}

            <Separator />

            {/* Seção: Cobrança */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Informações de Cobrança</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Tipo de Cobrança */}
                <FormField
                  control={form.control}
                  name="tipo_cobranca"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo de Cobrança *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o tipo de cobrança" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {TIPO_COBRANCA_OPTIONS.map((tipo) => (
                            <SelectItem key={tipo.value} value={tipo.value}>
                              <div className="flex items-center gap-2">
                                <div className={cn(
                                  "w-3 h-3 rounded-full",
                                  getCorTipoCobranca(tipo.value).split(' ')[0].replace('bg-', 'bg-')
                                )} />
                                {tipo.label}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Mês de Cobrança */}
                <FormField
                  control={form.control}
                  name="mes_cobranca"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mês de Cobrança *</FormLabel>
                      <Select
                        onValueChange={(value) => field.onChange(parseInt(value))}
                        defaultValue={field.value?.toString()}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o mês" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {mesesOptions.map((mes) => (
                            <SelectItem key={mes.value} value={mes.value.toString()}>
                              {mes.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <Separator />

            {/* Seção: Observações */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Observações</h3>

              <FormField
                control={form.control}
                name="observacao"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Observação</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Observações adicionais (opcional)..."
                        className="min-h-[80px]"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Máximo 1000 caracteres ({(field.value || '').length}/1000)
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Botões de Ação */}
            <div className={cn(
              "flex gap-4 pt-6",
              responsiveForm.buttonSize === 'sm' ? 'flex-col' : 'justify-end'
            )}>
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                disabled={isLoading}
                size={responsiveForm.buttonSize as any}
                aria-label="Cancelar edição do requerimento"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isLoading || !form.formState.isValid}
                className="min-w-[120px]"
                size={responsiveForm.buttonSize as any}
                aria-label={requerimento ? 'Atualizar requerimento' : 'Criar novo requerimento'}
              >
                {isLoading ? (
                  <LoadingSpinner
                    size="sm"
                    text={requerimento ? 'Atualizando...' : 'Criando...'}
                  />
                ) : (
                  requerimento ? 'Atualizar' : 'Criar Requerimento'
                )}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}