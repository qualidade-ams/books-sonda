import React, { useEffect, useMemo, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Calculator, HelpCircle, AlertCircle } from 'lucide-react';

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
  TIPO_COBRANCA_OPTIONS,
  TIPO_HORA_EXTRA_OPTIONS,
  requerValorHora,
  TipoHoraExtraType
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
import { buscarTaxaVigente } from '@/services/taxasClientesService';
import type { TaxaClienteCompleta, TipoFuncao } from '@/types/taxasClientes';
import { calcularValores } from '@/types/taxasClientes';
import { useState } from 'react';

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
  
  // Estado para taxa vigente do cliente
  const [taxaVigente, setTaxaVigente] = useState<TaxaClienteCompleta | null>(null);
  const [carregandoTaxa, setCarregandoTaxa] = useState(false);

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
      tipo_cobranca: requerimento?.tipo_cobranca || 'Banco de Horas',
      mes_cobranca: requerimento?.mes_cobranca || '',
      observacao: requerimento?.observacao || '',
      // Campos de valor/hora
      valor_hora_funcional: requerimento?.valor_hora_funcional || undefined,
      valor_hora_tecnico: requerimento?.valor_hora_tecnico || undefined,
      // Campo de tipo de hora extra
      tipo_hora_extra: requerimento?.tipo_hora_extra || undefined,
      // Campos de ticket
      quantidade_tickets: requerimento?.quantidade_tickets || undefined,
      // Campo de horas de análise EF (para tipo Reprovado)
      horas_analise_ef: 0
    }
  });

  // Watch para calcular horas total e valores automaticamente
  const horasFuncional = form.watch('horas_funcional');
  const horasTecnico = form.watch('horas_tecnico');
  const tipoCobranca = form.watch('tipo_cobranca');
  const clienteId = form.watch('cliente_id');
  const valorHoraFuncional = form.watch('valor_hora_funcional');
  const valorHoraTecnico = form.watch('valor_hora_tecnico');
  const tipoHoraExtra = form.watch('tipo_hora_extra');
  const horasAnaliseEF = form.watch('horas_analise_ef');
  
  // Watch para campos obrigatórios
  const chamado = form.watch('chamado');
  const descricao = form.watch('descricao');
  const dataEnvio = form.watch('data_envio');
  const modulo = form.watch('modulo');
  const linguagem = form.watch('linguagem');
  const quantidadeTickets = form.watch('quantidade_tickets');

  // Buscar dados do cliente selecionado para verificar tipo de cobrança da empresa
  const clienteSelecionado = useMemo(() => {
    if (!clienteId || !clientes.length) return null;
    return clientes.find(cliente => cliente.id === clienteId);
  }, [clienteId, clientes]);

  // Filtrar opções de tipo de cobrança baseado no tipo de cobrança da empresa
  const tipoCobrancaOptionsFiltradas = useMemo(() => {
    // Se não há cliente selecionado, mostrar todas as opções
    if (!clienteSelecionado) {
      return TIPO_COBRANCA_OPTIONS;
    }

    // Se a empresa tem tipo de cobrança "outros", remover "Banco de Horas"
    if (clienteSelecionado.tipo_cobranca === 'outros') {
      return TIPO_COBRANCA_OPTIONS.filter(option => option.value !== 'Banco de Horas');
    }

    // Para outros tipos de cobrança da empresa, mostrar todas as opções
    return TIPO_COBRANCA_OPTIONS;
  }, [clienteSelecionado]);

  // Verificar se deve mostrar campo de tickets automaticamente
  const mostrarCampoTickets = useMemo(() => {
    // Só mostra se tipo de cobrança for "Banco de Horas" E a empresa for do tipo "ticket"
    return tipoCobranca === 'Banco de Horas' &&
      clienteSelecionado?.tipo_cobranca === 'ticket';
  }, [tipoCobranca, clienteSelecionado]);

  // Verificar se o tipo de cobrança requer campos de valor/hora
  const mostrarCamposValor = useMemo(() => {
    return tipoCobranca && requerValorHora(tipoCobranca);
  }, [tipoCobranca]);

  // Verificar se deve mostrar campo de tipo de hora extra
  const mostrarTipoHoraExtra = useMemo(() => {
    return tipoCobranca === 'Hora Extra';
  }, [tipoCobranca]);

  // Verificar se deve mostrar campo de horas de análise EF
  const mostrarCampoAnaliseEF = useMemo(() => {
    return tipoCobranca === 'Reprovado';
  }, [tipoCobranca]);

  // useEffect para buscar taxa vigente quando cliente mudar
  useEffect(() => {
    if (!clienteId) {
      setTaxaVigente(null);
      return;
    }

    const buscarTaxa = async () => {
      setCarregandoTaxa(true);
      try {
        const taxa = await buscarTaxaVigente(clienteId);
        setTaxaVigente(taxa);
      } catch (error) {
        console.error('Erro ao buscar taxa vigente:', error);
        setTaxaVigente(null);
      } finally {
        setCarregandoTaxa(false);
      }
    };

    buscarTaxa();
  }, [clienteId]);

  // useEffect para preencher valores automaticamente baseado na taxa vigente
  useEffect(() => {
    if (!taxaVigente || !linguagem || !tipoCobranca) return;
    if (!['Faturado', 'Hora Extra', 'Sobreaviso'].includes(tipoCobranca)) return;

    const tipoProduto = taxaVigente.tipo_produto;
    
    // Valor/Hora Funcional SEMPRE usa a linha "Funcional"
    const funcaoFuncional: TipoFuncao = 'Funcional';
    
    // Valor/Hora Técnico usa a linha correspondente à LINGUAGEM selecionada
    // Quando linguagem é "Funcional", SEMPRE usa linha "Técnico" para o campo Valor/Hora Técnico
    const mapearLinguagemParaFuncao = (ling: string): TipoFuncao | null => {
      // Se linguagem é Funcional, usar linha Técnico para o campo Valor/Hora Técnico
      if (ling === 'Funcional') {
        return tipoProduto === 'GALLERY' ? 'Técnico / ABAP' : 'Técnico (Instalação / Atualização)';
      }
      
      if (ling === 'Técnico') {
        return tipoProduto === 'GALLERY' ? 'Técnico / ABAP' : 'Técnico (Instalação / Atualização)';
      }
      
      if (ling === 'ABAP' || ling === 'PL/SQL') {
        return tipoProduto === 'GALLERY' ? 'Técnico / ABAP' : 'ABAP - PL/SQL';
      }
      
      if (ling === 'DBA') {
        return tipoProduto === 'GALLERY' ? 'DBA / Basis' : 'DBA';
      }
      
      return null;
    };

    const funcaoTecnico = mapearLinguagemParaFuncao(linguagem);
    if (!funcaoTecnico) return;

    // Buscar valores das funções na taxa (remota por padrão)
    const valorFuncaoFuncional = taxaVigente.valores_remota?.find(v => v.funcao === funcaoFuncional);
    const valorFuncaoTecnico = taxaVigente.valores_remota?.find(v => v.funcao === funcaoTecnico);

    if (!valorFuncaoFuncional || !valorFuncaoTecnico) return;

    // Preparar array com todas as funções para cálculos
    const todasFuncoes = taxaVigente.valores_remota?.map(v => ({
      funcao: v.funcao,
      valor_base: v.valor_base
    })) || [];

    // Calcular valores para Funcional
    const valoresCalculadosFuncional = calcularValores(valorFuncaoFuncional.valor_base, funcaoFuncional, todasFuncoes);
    
    // Calcular valores para Técnico (baseado na linguagem)
    const valoresCalculadosTecnico = calcularValores(valorFuncaoTecnico.valor_base, funcaoTecnico, todasFuncoes);

    let valorHoraFuncional = 0;
    let valorHoraTecnico = 0;

    if (tipoCobranca === 'Faturado') {
      // Usar valor base
      valorHoraFuncional = valoresCalculadosFuncional.valor_base;
      valorHoraTecnico = valoresCalculadosTecnico.valor_base;
    } else if (tipoCobranca === 'Hora Extra') {
      // Usar valor baseado no tipo de hora extra selecionado
      if (tipoHoraExtra === '17h30-19h30') {
        valorHoraFuncional = valoresCalculadosFuncional.valor_17h30_19h30;
        valorHoraTecnico = valoresCalculadosTecnico.valor_17h30_19h30;
      } else if (tipoHoraExtra === 'apos_19h30') {
        valorHoraFuncional = valoresCalculadosFuncional.valor_apos_19h30;
        valorHoraTecnico = valoresCalculadosTecnico.valor_apos_19h30;
      } else if (tipoHoraExtra === 'fim_semana') {
        valorHoraFuncional = valoresCalculadosFuncional.valor_fim_semana;
        valorHoraTecnico = valoresCalculadosTecnico.valor_fim_semana;
      }
    } else if (tipoCobranca === 'Sobreaviso') {
      // Usar valor de stand by
      valorHoraFuncional = valoresCalculadosFuncional.valor_standby;
      valorHoraTecnico = valoresCalculadosTecnico.valor_standby;
    }

    // Arredondar para 2 casas decimais
    const valorHoraFuncionalArredondado = Math.round(valorHoraFuncional * 100) / 100;
    const valorHoraTecnicoArredondado = Math.round(valorHoraTecnico * 100) / 100;

    // Preencher os campos com os valores correspondentes
    form.setValue('valor_hora_funcional', valorHoraFuncionalArredondado);
    form.setValue('valor_hora_tecnico', valorHoraTecnicoArredondado);
  }, [taxaVigente, linguagem, tipoCobranca, tipoHoraExtra, horasTecnico, form]);

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

  // Validação customizada para habilitar/desabilitar botão
  const validationStatus = useMemo(() => {
    const status = {
      isValid: true,
      camposFaltando: [] as string[]
    };

    // Campos obrigatórios básicos
    if (!chamado || chamado.trim() === '') status.camposFaltando.push('Chamado');
    if (!clienteId || clienteId.trim() === '') status.camposFaltando.push('Cliente');
    if (!descricao || descricao.trim() === '') status.camposFaltando.push('Descrição');
    if (!dataEnvio || dataEnvio.trim() === '') status.camposFaltando.push('Data de Envio');
    if (!modulo || modulo.trim() === '') status.camposFaltando.push('Módulo');
    if (!linguagem || linguagem.trim() === '') status.camposFaltando.push('Linguagem');
    if (!tipoCobranca || tipoCobranca.trim() === '') status.camposFaltando.push('Tipo de Cobrança');

    // Validação de horas - pelo menos uma deve ser maior que zero
    const horasFuncionalNum = typeof horasFuncional === 'string' 
      ? converterParaHorasDecimal(horasFuncional) 
      : horasFuncional || 0;
    const horasTecnicoNum = typeof horasTecnico === 'string' 
      ? converterParaHorasDecimal(horasTecnico) 
      : horasTecnico || 0;

    if (horasFuncionalNum === 0 && horasTecnicoNum === 0) {
      status.camposFaltando.push('Horas Funcionais ou Horas Técnicas (pelo menos uma deve ser maior que zero)');
    }

    // Validação condicional de tickets
    if (mostrarCampoTickets) {
      const ticketsValidos = quantidadeTickets !== undefined && 
                            quantidadeTickets !== null && 
                            quantidadeTickets > 0;
      if (!ticketsValidos) {
        status.camposFaltando.push('Quantidade de Tickets');
      }
    }

    // Validação condicional de valores/hora
    if (mostrarCamposValor) {
      const horasFuncionalNum = typeof horasFuncional === 'string' 
        ? parseFloat(horasFuncional) || 0 
        : horasFuncional || 0;
      const horasTecnicoNum = typeof horasTecnico === 'string' 
        ? parseFloat(horasTecnico) || 0 
        : horasTecnico || 0;

      // Se tem horas funcionais, deve ter valor/hora funcional
      if (horasFuncionalNum > 0 && (!valorHoraFuncional || valorHoraFuncional <= 0)) {
        status.camposFaltando.push('Valor/Hora Funcional');
      }
      // Se tem horas técnicas, deve ter valor/hora técnico
      if (horasTecnicoNum > 0 && (!valorHoraTecnico || valorHoraTecnico <= 0)) {
        status.camposFaltando.push('Valor/Hora Técnico');
      }
    }

    status.isValid = status.camposFaltando.length === 0;
    return status;
  }, [
    chamado, clienteId, descricao, dataEnvio, modulo, linguagem, tipoCobranca,
    mostrarCampoTickets, quantidadeTickets,
    mostrarCamposValor, horasFuncional, horasTecnico, valorHoraFuncional, valorHoraTecnico
  ]);

  // Não é necessário armazenar empresa_tipo_cobranca no formulário
  // Usamos clienteSelecionado?.tipo_cobranca diretamente na validação

  // Limpar tipo de cobrança se a opção atual não estiver mais disponível
  useEffect(() => {
    const tipoCobrancaAtual = form.getValues('tipo_cobranca');
    const opcoesDisponiveis = tipoCobrancaOptionsFiltradas.map(option => option.value);
    
    if (tipoCobrancaAtual && !opcoesDisponiveis.includes(tipoCobrancaAtual)) {
      console.log('Limpando tipo de cobrança não disponível:', tipoCobrancaAtual);
      // Define para o primeiro valor disponível ou 'Banco de Horas' como padrão
      const valorPadrao = opcoesDisponiveis[0] || 'Banco de Horas';
      form.setValue('tipo_cobranca', valorPadrao as any);
    }
  }, [tipoCobrancaOptionsFiltradas, form]);

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
    console.log('📋 FORMULÁRIO - Dados completos recebidos:', data);
    console.log('📋 FORMULÁRIO - Tipo de cobrança:', data.tipo_cobranca);
    console.log('📋 FORMULÁRIO - Horas análise EF:', data.horas_analise_ef);
    console.log('📋 FORMULÁRIO - Tipo de horas_analise_ef:', typeof data.horas_analise_ef);
    console.log('📋 FORMULÁRIO - Empresa tipo cobrança:', clienteSelecionado?.tipo_cobranca);
    console.log('📋 FORMULÁRIO - Quantidade tickets:', data.quantidade_tickets);
    console.log('📋 FORMULÁRIO - Mostrar campo tickets:', mostrarCampoTickets);
    
    screenReader.announceLoading('Salvando requerimento...');
    
    try {
      // Criar o requerimento (o serviço já gerencia a criação do segundo requerimento se necessário)
      await onSubmit(data);
      
      // ✅ Só reseta o formulário se for criação E teve sucesso
      if (!requerimento) {
        form.reset();
        const mensagemSucesso = data.tipo_cobranca === 'Reprovado' && data.horas_analise_ef && 
          (typeof data.horas_analise_ef === 'string' ? converterParaHorasDecimal(data.horas_analise_ef) : data.horas_analise_ef) > 0
          ? 'Requerimentos criados com sucesso (principal + análise EF)'
          : 'Requerimento criado com sucesso';
        screenReader.announceSuccess(mensagemSucesso);
      } else {
        screenReader.announceSuccess('Requerimento atualizado com sucesso');
      }
    } catch (error) {
      // ❌ NÃO reseta o formulário em caso de erro - mantém os dados preenchidos
      console.error('Erro ao submeter formulário:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro ao salvar requerimento';
      screenReader.announceError(errorMessage);
      
      // Propagar o erro para que o React Hook Form saiba que houve falha
      throw error;
    }
  }, [onSubmit, requerimento, form, screenReader, mostrarCampoTickets, clienteSelecionado]);

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
                        value={field.value}
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
                      <FormLabel>
                        Módulo <span className="text-gray-700 dark:text-gray-300">*</span>
                      </FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
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
                      <FormLabel>
                        Linguagem <span className="text-gray-700 dark:text-gray-300">*</span>
                      </FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione uma linguagem" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="ABAP">ABAP</SelectItem>
                          <SelectItem value="DBA">DBA</SelectItem>
                          <SelectItem value="Funcional">Funcional</SelectItem>
                          <SelectItem value="PL/SQL">PL/SQL</SelectItem>
                          <SelectItem value="Técnico">Técnico</SelectItem>
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
                    <FormLabel>
                      Descrição <span className="text-gray-700 dark:text-gray-300">*</span>
                    </FormLabel>
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
                      <FormLabel>
                        Data de Envio do Orçamento <span className="text-gray-700 dark:text-gray-300">*</span>
                      </FormLabel>
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
                      <FormLabel>
                        Horas Funcionais <span className="text-gray-700 dark:text-gray-300">*</span>
                      </FormLabel>
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
                      <FormLabel>
                        Horas Técnicas <span className="text-gray-700 dark:text-gray-300">*</span>
                      </FormLabel>
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
                      <FormLabel>
                        Tipo de Cobrança <span className="text-gray-700 dark:text-gray-300">*</span>
                      </FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o tipo de cobrança" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {tipoCobrancaOptionsFiltradas.map((tipo) => (
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
                      {clienteSelecionado?.tipo_cobranca === 'outros' && (
                        <FormDescription className="text-amber-600 dark:text-amber-400">
                          ⚠️ A opção "Banco de Horas" não está disponível para empresas com tipo de cobrança "Outros"
                        </FormDescription>
                      )}
                    </FormItem>
                  )}
                />

                {/* Tipo de Hora Extra - Aparece apenas quando tipo_cobranca === 'Hora Extra' */}
                {mostrarTipoHoraExtra && (
                  <FormField
                    control={form.control}
                    name="tipo_hora_extra"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Tipo de Hora Extra <span className="text-gray-700 dark:text-gray-300">*</span>
                        </FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o tipo de hora extra" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {TIPO_HORA_EXTRA_OPTIONS.map((tipo) => (
                              <SelectItem key={tipo.value} value={tipo.value}>
                                {tipo.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                        {!taxaVigente && (
                          <FormDescription className="text-amber-600 dark:text-amber-400">
                            ⚠️ Cliente não possui taxa vigente cadastrada
                          </FormDescription>
                        )}
                      </FormItem>
                    )}
                  />
                )}

                {/* Horas de Análise EF - Aparece apenas quando tipo_cobranca === 'Reprovado' */}
                {mostrarCampoAnaliseEF && (
                  <FormField
                    control={form.control}
                    name="horas_analise_ef"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Horas de Análise EF
                        </FormLabel>
                        <FormControl>
                          <InputHoras
                            value={field.value}
                            onChange={(valorString) => {
                              field.onChange(valorString);
                            }}
                            placeholder="Ex: 8:00 ou 8"
                            disabled={isLoading}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}

                {/* Mês de Cobrança */}
                <FormField
                  control={form.control}
                  name="mes_cobranca"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Mês/Ano de Cobrança</FormLabel>
                      <FormControl>
                        <MonthYearPicker
                          value={field.value}
                          onChange={field.onChange}
                          placeholder="Selecione mês e ano (opcional)"
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
                          <FormLabel>
                            Valor/Hora Funcional <span className="text-gray-700 dark:text-gray-300">*</span>
                          </FormLabel>
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
                                onChange={(e) => {
                                  const value = e.target.value;
                                  field.onChange(value === '' ? undefined : parseFloat(value) || 0);
                                }}
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
                          <FormLabel>
                            Valor/Hora Técnico <span className="text-gray-700 dark:text-gray-300">*</span>
                          </FormLabel>
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
                                onChange={(e) => {
                                  const value = e.target.value;
                                  field.onChange(value === '' ? undefined : parseFloat(value) || 0);
                                }}
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
                          <FormLabel>
                            Quantidade de Tickets <span className="text-gray-700 dark:text-gray-300">*</span>
                          </FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="1"
                              max="9999"
                              placeholder="Digite a quantidade"
                              {...field}
                              value={field.value || ''}
                              onChange={(e) => {
                                const value = e.target.value;
                                if (value === '' || value === null) {
                                  field.onChange(undefined);
                                } else {
                                  const num = parseInt(value, 10);
                                  field.onChange(isNaN(num) ? undefined : num);
                                }
                              }}
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
                disabled={isLoading || !validationStatus.isValid}
                className="min-w-[120px]"
                size={responsiveForm.buttonSize as any}
                aria-label={requerimento ? 'Atualizar requerimento' : 'Criar novo requerimento'}
                title={!validationStatus.isValid ? `Campos obrigatórios: ${validationStatus.camposFaltando.join(', ')}` : undefined}
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

            {/* Indicador de Validação */}
            {!validationStatus.isValid && validationStatus.camposFaltando.length > 0 && (
              <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-md">
                <div className="flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                  <div className="text-sm">
                    <p className="font-medium text-amber-800 dark:text-amber-200 mb-1">
                      Campos obrigatórios pendentes:
                    </p>
                    <ul className="text-amber-700 dark:text-amber-300 space-y-1">
                      {validationStatus.camposFaltando.map((campo, index) => (
                        <li key={index} className="flex items-center gap-1">
                          <span className="w-1 h-1 bg-amber-600 dark:bg-amber-400 rounded-full"></span>
                          {campo}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}