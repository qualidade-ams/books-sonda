import React, { useEffect, useMemo, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Calculator, HelpCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
import { InputHoras } from '@/components/ui/input-horas';
import { MonthYearPicker } from '@/components/ui/month-year-picker';
import { somarHoras, formatarHorasParaExibicao, converterParaHorasDecimal } from '@/utils/horasUtils';

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
      data_envio: requerimento?.data_envio || '',
      data_aprovacao: requerimento?.data_aprovacao || '', // Deixar em branco por padrão
      horas_funcional: requerimento?.horas_funcional || 0,
      horas_tecnico: requerimento?.horas_tecnico || 0,
      linguagem: requerimento?.linguagem || 'Funcional',
      tipo_cobranca: requerimento?.tipo_cobranca || 'Selecione',
      mes_cobranca: requerimento?.mes_cobranca || (() => {
        const hoje = new Date();
        const mes = String(hoje.getMonth() + 1).padStart(2, '0');
        const ano = hoje.getFullYear();
        return `${mes}/${ano}`;
      })(),
      observacao: requerimento?.observacao || '',
      // Campos de valor/hora
      valor_hora_funcional: requerimento?.valor_hora_funcional || undefined,
      valor_hora_tecnico: requerimento?.valor_hora_tecnico || undefined,
      // Campos de ticket
      quantidade_tickets: requerimento?.quantidade_tickets || undefined
    }
  });

  // Watch para calcular horas total e valores automaticamente
  const horasFuncional = form.watch('horas_funcional');
  const horasTecnico = form.watch('horas_tecnico');
  const tipoCobranca = form.watch('tipo_cobranca');
  const clienteId = form.watch('cliente_id');
  const valorHoraFuncional = form.watch('valor_hora_funcional');
  const valorHoraTecnico = form.watch('valor_hora_tecnico');

  // Buscar dados do cliente selecionado para verificar tipo de cobrança da empresa
  const clienteSelecionado = useMemo(() => {
    if (!clienteId || !clientes.length) return null;
    return clientes.find(cliente => cliente.id === clienteId);
  }, [clienteId, clientes]);

  // Verificar se deve mostrar campo de tickets automaticamente
  const mostrarCampoTickets = useMemo(() => {
    // Só mostra se tipo de cobrança for "Banco de Horas" E a empresa for do tipo "ticket"
    return tipoCobranca === 'Banco de Horas' &&
      clienteSelecionado?.tipo_cobranca === 'ticket';
  }, [tipoCobranca, clienteSelecionado]);

  // Verificar se o tipo de cobrança requer campos de valor/hora
  const mostrarCamposValor = useMemo(() => {
    return tipoCobranca !== 'Selecione' && requerValorHora(tipoCobranca);
  }, [tipoCobranca]);

  // Cálculo automático das horas totais (suporta formato HH:MM)
  const horasTotal = useMemo(() => {
    try {
      const funcionalStr = typeof horasFuncional === 'string' ? horasFuncional : (horasFuncional?.toString() || '0');
      const tecnicoStr = typeof horasTecnico === 'string' ? horasTecnico : (horasTecnico?.toString() || '0');

      const totalFormatado = somarHoras(funcionalStr, tecnicoStr);
      return totalFormatado;
    } catch (error) {
      return '0:00';
    }
  }, [horasFuncional, horasTecnico]);

  // Cálculos automáticos de valores (suporta formato HH:MM)
  const valoresCalculados = useMemo(() => {
    if (!mostrarCamposValor) {
      return {
        valorTotalFuncional: 0,
        valorTotalTecnico: 0,
        valorTotalGeral: 0
      };
    }

    try {
      // Converter horas para decimal para cálculos monetários
      const funcionalStr = typeof horasFuncional === 'string' ? horasFuncional : (horasFuncional?.toString() || '0');
      const tecnicoStr = typeof horasTecnico === 'string' ? horasTecnico : (horasTecnico?.toString() || '0');

      const hFunc = converterParaHorasDecimal(funcionalStr);
      const hTec = converterParaHorasDecimal(tecnicoStr);
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
    } catch (error) {
      return {
        valorTotalFuncional: 0,
        valorTotalTecnico: 0,
        valorTotalGeral: 0
      };
    }
  }, [horasFuncional, horasTecnico, valorHoraFuncional, valorHoraTecnico, mostrarCamposValor]);



  // Cores para tipos de cobrança
  const getCorTipoCobranca = (tipo: string) => {
    const cores = {
      'Selecione': 'bg-gray-50 text-gray-500 border-gray-200',
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
                      error={form.formState.errors.chamado?.message}
                    >
                      <Input
                        {...field}
                        placeholder="Ex: RF-6017993, Projeto, Treinamento, entre outros"
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
                                {cliente.nome_abreviado}
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
                    <FormItem>
                      <FormLabel>Data de Envio do Orçamento *</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          {...field}
                          disabled={isLoading}
                          min="1900-01-01"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Data de Aprovação */}
                <FormField
                  control={form.control}
                  name="data_aprovacao"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Data de Aprovação do Orçamento</FormLabel>
                      <FormControl>
                        <Input
                          type="date"
                          {...field}
                          disabled={isLoading}
                          min={form.getValues('data_envio') || "1900-01-01"} // Não permite data anterior à data de envio
                        />
                      </FormControl>
                      <FormDescription>
                        Campo opcional. Deve ser igual ou posterior à data de envio.
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
                        <InputHoras
                          value={field.value}
                          onChange={(valorString, horasDecimal) => {
                            field.onChange(valorString);
                          }}
                          placeholder="Ex: 111:30 ou 120"
                          disabled={isLoading}
                        />
                      </FormControl>
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
                        <InputHoras
                          value={field.value}
                          onChange={(valorString) => {
                            field.onChange(valorString);
                          }}
                          placeholder="Ex: 80:45 ou 80"
                          disabled={isLoading}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Horas Total (calculado automaticamente) */}
                <div className="space-y-2">
                  <Label>Horas Total</Label>
                  <div className="flex items-center h-10 px-3 py-2 border border-input bg-muted rounded-md">
                    <span className="font-semibold text-lg">
                      {formatarHorasParaExibicao(horasTotal, 'completo')}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Calculado automaticamente
                  </p>
                </div>
              </div>
            </div>

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
                      <FormLabel>Mês/Ano de Cobrança *</FormLabel>
                      <FormControl>
                        <MonthYearPicker
                          value={field.value}
                          onChange={field.onChange}
                          placeholder="Selecione mês e ano"
                          format="MM/YYYY"
                          allowFuture={true}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            <Separator />

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
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Valor Total Estimado */}
                    <div className="space-y-2">
                      <Label>Valor Total Estimado</Label>
                      <div className="flex items-center h-10 px-3 py-2 border border-input bg-muted rounded-md">
                        <span className="font-semibold text-lg text-green-600">
                          R$ {valoresCalculados.valorTotalGeral.toLocaleString('pt-BR', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                          })}
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

            {/* Seção: Tickets (automática baseada no tipo de cobrança da empresa) */}
            {mostrarCampoTickets && (
              <>
                <Separator />
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    🎫 Controle de Tickets
                    <OptimizedTooltip content="Campo automático para empresas do tipo 'ticket' quando selecionado 'Banco de Horas'">
                      <HelpCircle className="h-4 w-4 text-blue-500" />
                    </OptimizedTooltip>
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Quantidade de Tickets (sempre visível quando mostrarCampoTickets for true) */}
                    <FormField
                      control={form.control}
                      name="quantidade_tickets"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Quantidade de Tickets *</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="1"
                              max="9999"
                              placeholder="Digite a quantidade"
                              {...field}
                              onChange={(e) => field.onChange(parseInt(e.target.value) || undefined)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </>
            )}

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