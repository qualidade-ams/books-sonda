import React, { useEffect, useMemo, useCallback, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Calculator, HelpCircle, AlertCircle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
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
  TipoHoraExtraType,
  ModuloType,
  LinguagemType,
  TipoCobrancaType
} from '@/types/requerimentos';
import { useClientesRequerimentos } from '@/hooks/useRequerimentos';
import { useEmpresasSegmentacao } from '@/hooks/useEmpresasSegmentacao';
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
  console.log('🎨🎨🎨 RequerimentoForm RENDERIZADO 🎨🎨🎨', { requerimento: !!requerimento });
  
  const { data: clientes = [], isLoading: isLoadingClientes } = useClientesRequerimentos();
  const { form: responsiveForm, modal: responsiveModal } = useResponsive();
  const { screenReader, focusManagement } = useAccessibility();
  
  // Estado para taxa vigente do cliente
  const [taxaVigente, setTaxaVigente] = useState<TaxaClienteCompleta | null>(null);
  const [carregandoTaxa, setCarregandoTaxa] = useState(false);
  
  // Ref para controlar se valores foram editados manualmente (não causa re-render)
  const valoresEditadosManualmenteRef = useRef({
    funcional: false,
    tecnico: false
  });
  
  // Estado para controlar indicadores visuais de edição manual
  const [valoresEditadosManualmente, setValoresEditadosManualmente] = useState({
    funcional: false,
    tecnico: false
  });
  
  // Estado para controlar se houve tentativa de submissão (para mostrar erros visuais)
  const [tentouSubmeter, setTentouSubmeter] = useState(false);
  
  // Função helper para obter classes de erro para campos obrigatórios
  const getErrorClasses = (fieldValue: any, isRequired: boolean = true) => {
    if (!tentouSubmeter || !isRequired) return '';
    const isEmpty = !fieldValue || (typeof fieldValue === 'string' && fieldValue.trim() === '');
    return isEmpty ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : '';
  };

  // Função helper específica para o campo Chamado (valida espaços e underscore em tempo real)
  const getChamadoErrorClasses = (fieldValue: string) => {
    if (!fieldValue) return tentouSubmeter ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : '';
    if (/[\s_]/.test(fieldValue) || !/^[A-Za-z0-9\-]+$/.test(fieldValue)) return 'border-red-500 focus:ring-red-500 focus:border-red-500';
    return '';
  };
  
  console.log('📊 Estados iniciais:', {
    taxaVigente: !!taxaVigente,
    carregandoTaxa,
    totalClientes: clientes.length
  });

  const form = useForm<RequerimentoFormData>({
    resolver: zodResolver(requerimentoFormSchema),
    defaultValues: {
      chamado: requerimento?.chamado || '',
      cliente_id: requerimento?.cliente_id || '',
      empresa_segmentacao_nome: requerimento?.empresa_segmentacao_nome || '',
      modulo: (requerimento?.modulo || '') as ModuloType,
      descricao: requerimento?.descricao || '',
      data_envio: requerimento?.data_envio || '',
      data_aprovacao: requerimento?.data_aprovacao || '', // Deixar em branco por padrão
      horas_funcional: requerimento?.horas_funcional || 0,
      horas_tecnico: requerimento?.horas_tecnico || 0,
      linguagem: (requerimento?.linguagem || '') as LinguagemType,
      tipo_cobranca: requerimento?.tipo_cobranca || 'Banco de Horas',
      mes_cobranca: requerimento?.mes_cobranca || '',
      observacao: requerimento?.observacao || '',
      // Campos de valor/hora
      valor_hora_funcional: requerimento?.valor_hora_funcional || undefined,
      valor_hora_tecnico: requerimento?.valor_hora_tecnico || undefined,
      // Campo de tipo de hora extra - mantém o valor existente ao editar (converter null para undefined)
      tipo_hora_extra: (requerimento?.tipo_hora_extra || undefined) as TipoHoraExtraType | undefined,
      // Campos de ticket
      quantidade_tickets: requerimento?.quantidade_tickets || undefined,
      // Campo de horas de análise EF (para tipo Reprovado)
      horas_analise_ef: 0,
      // Campo de atendimento presencial (usa valores locais)
      atendimento_presencial: requerimento?.atendimento_presencial || false
    }
  });

  // Watch clienteId APÓS inicialização do form
  const clienteIdWatch = form.watch('cliente_id');
  
  // Buscar empresas de segmentação (baseline) do cliente selecionado
  const { data: empresasSegmentacao = [], isLoading: isLoadingEmpresasSegmentacao } = useEmpresasSegmentacao(clienteIdWatch);
  
  // Verificar se deve mostrar campo de empresa_segmentacao_id
  const mostrarCampoEmpresaSegmentacao = useMemo(() => {
    const mostrar = empresasSegmentacao.length > 0;
    console.log('🔍 [mostrarCampoEmpresaSegmentacao]:', {
      mostrar,
      empresasSegmentacao: empresasSegmentacao.length,
      clienteId: clienteIdWatch,
      valorAtual: form.getValues('empresa_segmentacao_nome')
    });
    return mostrar;
  }, [empresasSegmentacao, clienteIdWatch, form]);
  
  console.log('📊 Empresas de segmentação:', {
    clienteId: clienteIdWatch,
    empresas: empresasSegmentacao,
    mostrarCampo: mostrarCampoEmpresaSegmentacao
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
  const atendimentoPresencial = form.watch('atendimento_presencial');
  
  // Watch para campos obrigatórios
  const chamado = form.watch('chamado');
  const descricao = form.watch('descricao');
  const dataEnvio = form.watch('data_envio');
  const modulo = form.watch('modulo');
  const linguagem = form.watch('linguagem');
  const quantidadeTickets = form.watch('quantidade_tickets');
  
  console.log('👀 Watch values:', {
    clienteId,
    tipoCobranca,
    linguagem,
    tipoHoraExtra,
    valorHoraFuncional,
    valorHoraTecnico
  });

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

    // Se a empresa tem "Tem AMS" = false, remover "Banco de Horas"
    if (clienteSelecionado.tem_ams === false) {
      return TIPO_COBRANCA_OPTIONS.filter(option => option.value !== 'Banco de Horas');
    }

    // Para outros casos, mostrar todas as opções
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

  // Verificar se deve mostrar campo de atendimento presencial
  // Não exibir para "Sobreaviso"
  const mostrarAtendimentoPresencial = useMemo(() => {
    return mostrarCamposValor && tipoCobranca !== 'Sobreaviso';
  }, [mostrarCamposValor, tipoCobranca]);

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
    console.log('🚀🚀🚀 useEffect de busca de taxa EXECUTADO 🚀🚀🚀');
    
    // Só buscar taxa se o tipo de cobrança requer valores
    const tiposComValorHora = ['Faturado', 'Hora Extra', 'Sobreaviso', 'Bolsão Enel'];
    const precisaTaxa = tipoCobranca && tiposComValorHora.includes(tipoCobranca);
    
    console.log('🔍 Verificando necessidade de buscar taxa:', {
      clienteId,
      tipoCobranca,
      precisaTaxa,
      tiposComValorHora
    });
    
    if (!clienteId || !precisaTaxa) {
      console.log('❌ Não precisa buscar taxa - limpando estado');
      setTaxaVigente(null);
      setCarregandoTaxa(false);
      return;
    }

    console.log('✅ Iniciando busca de taxa vigente para cliente:', clienteId);
    const buscarTaxa = async () => {
      setCarregandoTaxa(true);
      try {
        const taxa = await buscarTaxaVigente(clienteId);
        console.log('✅ Taxa encontrada com sucesso!');
        console.log('📋 Taxa completa:', JSON.stringify(taxa, null, 2));
        setTaxaVigente(taxa);
      } catch (error) {
        console.error('❌ Erro ao buscar taxa vigente:', error);
        setTaxaVigente(null);
      } finally {
        setCarregandoTaxa(false);
      }
    };

    buscarTaxa();
  }, [clienteId, tipoCobranca]);

  // useEffect para limpar campos quando tipo de cobrança não requer
  useEffect(() => {
    const tiposComValorHora = ['Faturado', 'Hora Extra', 'Sobreaviso', 'Bolsão Enel'];
    
    // Se o tipo de cobrança NÃO requer valor/hora, zerar os campos
    if (tipoCobranca && !tiposComValorHora.includes(tipoCobranca)) {
      const valorAtualFuncional = form.getValues('valor_hora_funcional');
      const valorAtualTecnico = form.getValues('valor_hora_tecnico');
      
      // Zerar valores se estiverem preenchidos
      if (valorAtualFuncional !== undefined && valorAtualFuncional !== null && valorAtualFuncional !== 0) {
        form.setValue('valor_hora_funcional', 0, { shouldValidate: true, shouldDirty: true });
      }
      if (valorAtualTecnico !== undefined && valorAtualTecnico !== null && valorAtualTecnico !== 0) {
        form.setValue('valor_hora_tecnico', 0, { shouldValidate: true, shouldDirty: true });
      }
    }
    
    // Se o tipo de cobrança NÃO é Hora Extra, limpar tipo_hora_extra
    if (tipoCobranca && tipoCobranca !== 'Hora Extra') {
      const tipoHoraExtraAtual = form.getValues('tipo_hora_extra');
      if (tipoHoraExtraAtual !== undefined && tipoHoraExtraAtual !== null) {
        form.setValue('tipo_hora_extra', undefined, { shouldValidate: true, shouldDirty: true });
      }
    }
    
    // Se o tipo de cobrança NÃO é Reprovado, limpar horas_analise_ef
    if (tipoCobranca && tipoCobranca !== 'Reprovado') {
      const horasAnaliseAtual = form.getValues('horas_analise_ef');
      if (horasAnaliseAtual !== undefined && horasAnaliseAtual !== null && horasAnaliseAtual !== 0) {
        form.setValue('horas_analise_ef', 0, { shouldValidate: true, shouldDirty: true });
      }
    }
    
    // Se o tipo de cobrança NÃO é Banco de Horas, zerar quantidade_tickets
    if (tipoCobranca && tipoCobranca !== 'Banco de Horas') {
      const quantidadeTicketsAtual = form.getValues('quantidade_tickets');
      if (quantidadeTicketsAtual !== undefined && quantidadeTicketsAtual !== null && quantidadeTicketsAtual !== 0) {
        console.log('🎫 Zerando quantidade_tickets automaticamente - tipo mudou para:', tipoCobranca);
        form.setValue('quantidade_tickets', 0, { shouldValidate: true, shouldDirty: true });
      }
    }
  }, [tipoCobranca, form]);

  // useEffect para preencher valores automaticamente baseado na taxa vigente
  useEffect(() => {
    console.log('='.repeat(80));
    console.log('🔄 INÍCIO DO PREENCHIMENTO AUTOMÁTICO');
    console.log('='.repeat(80));
    console.log('📊 Estado atual:', {
      taxaVigente: !!taxaVigente,
      linguagem,
      tipoCobranca,
      tipoHoraExtra,
      editandoRequerimento: !!requerimento
    });
    
    if (!taxaVigente || !linguagem || !tipoCobranca) {
      console.log('❌ Faltam dados para preencher valores automaticamente');
      return;
    }
    
    if (!['Faturado', 'Hora Extra', 'Sobreaviso'].includes(tipoCobranca)) {
      console.log('❌ Tipo de cobrança não requer preenchimento automático:', tipoCobranca);
      return;
    }

    // CORREÇÃO CRÍTICA: Não preencher automaticamente quando editando requerimento existente
    // EXCETO quando as flags de edição manual foram resetadas (mudança intencional do usuário)
    if (requerimento && valoresEditadosManualmenteRef.current.funcional && valoresEditadosManualmenteRef.current.tecnico) {
      console.log('⏭️ PULANDO PREENCHIMENTO - Editando requerimento existente com valores preservados');
      console.log('📊 Flags de edição manual:', valoresEditadosManualmenteRef.current);
      return;
    }

    console.log('✅ Iniciando preenchimento automático de valores');
    console.log('📋 Taxa vigente completa:', taxaVigente);
    
    const tipoProduto = taxaVigente.tipo_produto;
    console.log('📦 Tipo de produto:', tipoProduto);
    
    // Valor/Hora Funcional SEMPRE usa a linha "Funcional"
    const funcaoFuncional: TipoFuncao = 'Funcional';
    
    // Valor/Hora Técnico usa a linha correspondente à LINGUAGEM selecionada
    const mapearLinguagemParaFuncao = (ling: string): TipoFuncao | null => {
      if (ling === 'Técnico') {
        return tipoProduto === 'GALLERY' ? 'Técnico / ABAP' : 'Técnico (Instalação / Atualização)';
      }
      
      if (ling === 'ABAP' || ling === 'PL/SQL') {
        return tipoProduto === 'GALLERY' ? 'Técnico / ABAP' : 'ABAP - PL/SQL';
      }
      
      if (ling === 'DBA') {
        return tipoProduto === 'GALLERY' ? 'DBA / Basis' : 'DBA';
      }
      
      if (ling === 'Gestor') {
        return 'Gestor';
      }
      
      return null;
    };

    const funcaoTecnico = mapearLinguagemParaFuncao(linguagem);
    console.log('🎯 Funções mapeadas:', {
      funcaoFuncional,
      funcaoTecnico,
      linguagem
    });
    
    if (!funcaoTecnico) {
      console.log('❌ Não foi possível mapear linguagem para função');
      return;
    }

    // Determinar se deve usar valores locais ou remotos
    const usarValoresLocais = atendimentoPresencial || false;
    const valoresParaUsar = usarValoresLocais ? taxaVigente.valores_local : taxaVigente.valores_remota;
    const tipoValor = usarValoresLocais ? 'locais' : 'remotos';
    
    console.log('🔍 Buscando valores na taxa...');
    console.log('📊 Tipo de atendimento:', usarValoresLocais ? 'PRESENCIAL (valores locais)' : 'REMOTO (valores remotos)');
    console.log('📊 Valores disponíveis:', valoresParaUsar);
    console.log('📊 Estrutura completa da taxa:', JSON.stringify(taxaVigente, null, 2));
    
    const valorFuncaoFuncional = valoresParaUsar?.find(v => v.funcao === funcaoFuncional);
    const valorFuncaoTecnico = valoresParaUsar?.find(v => v.funcao === funcaoTecnico);

    console.log('💰 Valores encontrados:', {
      valorFuncaoFuncional,
      valorFuncaoTecnico
    });
    
    console.log('💰 Detalhes do valor funcional:', JSON.stringify(valorFuncaoFuncional, null, 2));
    console.log('💰 Detalhes do valor técnico:', JSON.stringify(valorFuncaoTecnico, null, 2));

    if (!valorFuncaoFuncional || !valorFuncaoTecnico) {
      console.log('❌ ERRO: Valores não encontrados na taxa!');
      console.log('❌ Tipo de valor:', tipoValor);
      console.log('❌ Funções procuradas:', { funcaoFuncional, funcaoTecnico });
      console.log('❌ Funções disponíveis:', valoresParaUsar?.map(v => v.funcao));
      return;
    }
    
    console.log('✅ SUCESSO: Valores encontrados!');
    console.log('✅ Valor Funcional completo:', valorFuncaoFuncional);
    console.log('✅ Valor Técnico completo:', valorFuncaoTecnico);

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

    // Determinar qual valor usar baseado no tipo de cobrança
    if (tipoCobranca === 'Faturado') {
      // Hora Normal - Seg-Sex 08h30-17h30 (valor base)
      valorHoraFuncional = valoresCalculadosFuncional.valor_base;
      valorHoraTecnico = valoresCalculadosTecnico.valor_base;
      console.log('📊 Usando valores de Hora Normal (Seg-Sex 08h30-17h30)');
    } else if (tipoCobranca === 'Hora Extra') {
      // Hora Extra - depende do tipo selecionado
      if (tipoHoraExtra === '17h30-19h30') {
        // Seg-Sex 17h30-19h30
        valorHoraFuncional = valoresCalculadosFuncional.valor_17h30_19h30;
        valorHoraTecnico = valoresCalculadosTecnico.valor_17h30_19h30;
        console.log('📊 Usando valores de Hora Extra (Seg-Sex 17h30-19h30)');
      } else if (tipoHoraExtra === 'apos_19h30') {
        // Seg-Sex Após 19h30
        valorHoraFuncional = valoresCalculadosFuncional.valor_apos_19h30;
        valorHoraTecnico = valoresCalculadosTecnico.valor_apos_19h30;
        console.log('📊 Usando valores de Hora Extra (Seg-Sex Após 19h30)');
      } else if (tipoHoraExtra === 'fim_semana') {
        // Sáb/Dom/Feriados
        valorHoraFuncional = valoresCalculadosFuncional.valor_fim_semana;
        valorHoraTecnico = valoresCalculadosTecnico.valor_fim_semana;
        console.log('📊 Usando valores de Hora Extra (Sáb/Dom/Feriados)');
      } else {
        console.log('⚠️ Tipo de hora extra não selecionado, deixando campos em branco');
        // Não preencher valores se tipo de hora extra não foi selecionado
        return;
      }
    } else if (tipoCobranca === 'Sobreaviso') {
      // Sobreaviso - Stand By
      valorHoraFuncional = valoresCalculadosFuncional.valor_standby;
      valorHoraTecnico = valoresCalculadosTecnico.valor_standby;
      console.log('📊 Usando valores de Sobreaviso (Stand By)');
    }

    // Arredondar para 2 casas decimais
    const valorHoraFuncionalArredondado = Math.round(valorHoraFuncional * 100) / 100;
    const valorHoraTecnicoArredondado = Math.round(valorHoraTecnico * 100) / 100;

    console.log('💵 Valores calculados:', {
      tipoCobranca,
      tipoHoraExtra: tipoCobranca === 'Hora Extra' ? tipoHoraExtra : 'N/A',
      valorHoraFuncional: valorHoraFuncionalArredondado,
      valorHoraTecnico: valorHoraTecnicoArredondado
    });

    // Preencher os campos com os valores correspondentes apenas se estiverem vazios ou zerados
    const valorAtualFuncional = form.getValues('valor_hora_funcional');
    const valorAtualTecnico = form.getValues('valor_hora_tecnico');
    
    console.log('📝 Valores atuais no formulário:', {
      valorAtualFuncional,
      valorAtualTecnico
    });
    
    // Preencher os campos apenas se não foram editados manualmente
    console.log('📝 Valores atuais no formulário:', {
      valorAtualFuncional,
      valorAtualTecnico,
      editadoManualmenteFuncional: valoresEditadosManualmenteRef.current.funcional,
      editadoManualmenteTecnico: valoresEditadosManualmenteRef.current.tecnico
    });
    
    // Preencher valor funcional se não foi editado manualmente
    if (!valoresEditadosManualmenteRef.current.funcional) {
      console.log('✅ PREENCHENDO valor_hora_funcional (automático):', valorHoraFuncionalArredondado);
      form.setValue('valor_hora_funcional', valorHoraFuncionalArredondado, { shouldValidate: false });
      console.log('✅ Valor preenchido com sucesso!');
    } else {
      console.log('⏭️ Valor funcional editado manualmente, mantendo:', valorAtualFuncional);
    }
    
    // Preencher valor técnico se não foi editado manualmente
    if (!valoresEditadosManualmenteRef.current.tecnico) {
      console.log('✅ PREENCHENDO valor_hora_tecnico (automático):', valorHoraTecnicoArredondado);
      form.setValue('valor_hora_tecnico', valorHoraTecnicoArredondado, { shouldValidate: false });
      console.log('✅ Valor preenchido com sucesso!');
    } else {
      console.log('⏭️ Valor técnico editado manualmente, mantendo:', valorAtualTecnico);
    }
    
    console.log('='.repeat(80));
    console.log('🏁 FIM DO PREENCHIMENTO AUTOMÁTICO');
    console.log('='.repeat(80));
  }, [taxaVigente, linguagem, tipoCobranca, tipoHoraExtra, atendimentoPresencial, form]); // Removido valoresEditadosManualmente das dependências

  // Função para marcar valor como editado manualmente
  const handleValorEditadoManualmente = useCallback((campo: 'funcional' | 'tecnico') => {
    console.log('✏️ Valor editado manualmente:', campo);
    // Atualizar ref (não causa re-render)
    valoresEditadosManualmenteRef.current = {
      ...valoresEditadosManualmenteRef.current,
      [campo]: true
    };
    // Atualizar estado para indicadores visuais
    setValoresEditadosManualmente(prev => ({
      ...prev,
      [campo]: true
    }));
  }, []);

  // Resetar flags de edição manual apenas quando cliente, linguagem ou tipo de cobrança principal mudar
  // CORREÇÃO: Não resetar flags ao editar registros existentes - só resetar quando contexto realmente mudar
  useEffect(() => {
    // Só resetar se não estiver editando um requerimento existente
    if (!requerimento) {
      console.log('🔄 Resetando flags de edição manual devido a mudança de contexto (novo requerimento)');
      // Resetar ref
      valoresEditadosManualmenteRef.current = {
        funcional: false,
        tecnico: false
      };
      // Resetar estado para indicadores visuais
      setValoresEditadosManualmente({
        funcional: false,
        tecnico: false
      });
    } else {
      console.log('⏭️ Mantendo flags de edição manual (editando requerimento existente)');
    }
  }, [clienteId, linguagem, tipoCobranca, requerimento]); // Adicionado requerimento para controlar comportamento

  // CORREÇÃO: Forçar sobrescrita de valores manuais quando tipo de hora extra mudar em "Hora Extra"
  useEffect(() => {
    if (tipoCobranca === 'Hora Extra' && tipoHoraExtra) {
      console.log('🔄 FORÇANDO SOBRESCRITA - Tipo de hora extra mudou:', tipoHoraExtra);
      // Resetar flags para permitir preenchimento automático
      valoresEditadosManualmenteRef.current = {
        funcional: false,
        tecnico: false
      };
      // Resetar estado visual
      setValoresEditadosManualmente({
        funcional: false,
        tecnico: false
      });
    }
  }, [tipoHoraExtra]); // Só dispara quando tipoHoraExtra mudar

  // CORREÇÃO: Marcar valores como editados manualmente APENAS se forem diferentes da taxa vigente
  useEffect(() => {
    if (requerimento && taxaVigente && linguagem && (requerimento.valor_hora_funcional || requerimento.valor_hora_tecnico)) {
      console.log('� ANALISVANDO VALORES SALVOS vs TAXA VIGENTE');
      console.log('💰 Valores do requerimento:', {
        valor_hora_funcional: requerimento.valor_hora_funcional,
        valor_hora_tecnico: requerimento.valor_hora_tecnico,
        tipo_cobranca: requerimento.tipo_cobranca,
        tipo_hora_extra: requerimento.tipo_hora_extra,
        atendimento_presencial: requerimento.atendimento_presencial
      });
      
      // Calcular valores esperados da taxa vigente
      const tipoProduto = taxaVigente.tipo_produto;
      const funcaoFuncional: TipoFuncao = 'Funcional';
      
      const mapearLinguagemParaFuncao = (ling: string): TipoFuncao | null => {
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
      
      if (funcaoTecnico && ['Faturado', 'Hora Extra', 'Sobreaviso'].includes(requerimento.tipo_cobranca)) {
        const usarValoresLocais = requerimento.atendimento_presencial || false;
        const valoresParaUsar = usarValoresLocais ? taxaVigente.valores_local : taxaVigente.valores_remota;
        
        const valorFuncaoFuncional = valoresParaUsar?.find(v => v.funcao === funcaoFuncional);
        const valorFuncaoTecnico = valoresParaUsar?.find(v => v.funcao === funcaoTecnico);

        if (valorFuncaoFuncional && valorFuncaoTecnico) {
          let valorEsperadoFuncional = 0;
          let valorEsperadoTecnico = 0;

          if (requerimento.tipo_cobranca === 'Faturado') {
            valorEsperadoFuncional = valorFuncaoFuncional.valor_base;
            valorEsperadoTecnico = valorFuncaoTecnico.valor_base;
          } else if (requerimento.tipo_cobranca === 'Hora Extra' && requerimento.tipo_hora_extra) {
            if (requerimento.tipo_hora_extra === '17h30-19h30') {
              valorEsperadoFuncional = valorFuncaoFuncional.valor_17h30_19h30;
              valorEsperadoTecnico = valorFuncaoTecnico.valor_17h30_19h30;
            } else if (requerimento.tipo_hora_extra === 'apos_19h30') {
              valorEsperadoFuncional = valorFuncaoFuncional.valor_apos_19h30;
              valorEsperadoTecnico = valorFuncaoTecnico.valor_apos_19h30;
            } else if (requerimento.tipo_hora_extra === 'fim_semana') {
              valorEsperadoFuncional = valorFuncaoFuncional.valor_fim_semana;
              valorEsperadoTecnico = valorFuncaoTecnico.valor_fim_semana;
            }
          } else if (requerimento.tipo_cobranca === 'Sobreaviso') {
            valorEsperadoFuncional = valorFuncaoFuncional.valor_standby;
            valorEsperadoTecnico = valorFuncaoTecnico.valor_standby;
          }

          // Arredondar valores esperados
          valorEsperadoFuncional = Math.round(valorEsperadoFuncional * 100) / 100;
          valorEsperadoTecnico = Math.round(valorEsperadoTecnico * 100) / 100;

          // Comparar valores salvos com valores esperados da taxa
          const valorSalvoFuncional = Math.round((requerimento.valor_hora_funcional || 0) * 100) / 100;
          const valorSalvoTecnico = Math.round((requerimento.valor_hora_tecnico || 0) * 100) / 100;

          // ANÁLISE APRIMORADA: Tolerância adequada para cálculos de ponto flutuante e validação de valores significativos
          const tolerancia = 0.01; // Tolerância de 1 centavo para evitar problemas de precisão de ponto flutuante
          const valorMinimoSignificativo = 1.0; // Valores abaixo de R$ 1,00 são considerados não significativos
          
          // Só considera como editado manualmente se:
          // 1. O valor salvo é significativo (> R$ 1,00)
          // 2. A diferença é maior que a tolerância
          // 3. O valor esperado também é significativo (evita comparações com valores zerados)
          const funcionalEditado = valorSalvoFuncional >= valorMinimoSignificativo && 
                                   valorEsperadoFuncional >= valorMinimoSignificativo &&
                                   Math.abs(valorSalvoFuncional - valorEsperadoFuncional) > tolerancia;
                                   
          const tecnicoEditado = valorSalvoTecnico >= valorMinimoSignificativo && 
                                 valorEsperadoTecnico >= valorMinimoSignificativo &&
                                 Math.abs(valorSalvoTecnico - valorEsperadoTecnico) > tolerancia;

          console.log('� COMPAcRAÇÃO INDIVIDUAL DE VALORES:');
          console.log('📊 Funcional:');
          console.log('   - Salvo:', valorSalvoFuncional);
          console.log('   - Esperado:', valorEsperadoFuncional);
          console.log('   - Diferença:', Math.abs(valorSalvoFuncional - valorEsperadoFuncional));
          console.log('   - Editado manualmente:', funcionalEditado);
          console.log('📊 Técnico:');
          console.log('   - Salvo:', valorSalvoTecnico);
          console.log('   - Esperado:', valorEsperadoTecnico);
          console.log('   - Diferença:', Math.abs(valorSalvoTecnico - valorEsperadoTecnico));
          console.log('   - Editado manualmente:', tecnicoEditado);

          // Marcar como editados manualmente APENAS os que foram realmente alterados
          valoresEditadosManualmenteRef.current = {
            funcional: funcionalEditado,
            tecnico: tecnicoEditado
          };
          
          // Atualizar estado visual
          setValoresEditadosManualmente({
            funcional: funcionalEditado,
            tecnico: tecnicoEditado
          });
          
          console.log('✅ FLAGS INTELIGENTES DEFINIDAS (ANÁLISE APRIMORADA):', valoresEditadosManualmenteRef.current);
        }
      }
    } else if (requerimento && (requerimento.valor_hora_funcional || requerimento.valor_hora_tecnico)) {
      // Fallback aprimorado: análise mais criteriosa mesmo sem taxa vigente
      console.log('⚠️ Sem taxa vigente - usando fallback aprimorado');
      const valorMinimoSignificativo = 1.0;
      
      const funcionalEditado = (requerimento.valor_hora_funcional || 0) >= valorMinimoSignificativo;
      const tecnicoEditado = (requerimento.valor_hora_tecnico || 0) >= valorMinimoSignificativo;
      
      console.log('📊 Fallback - Valores significativos:');
      console.log('   - Funcional:', requerimento.valor_hora_funcional, '≥', valorMinimoSignificativo, '=', funcionalEditado);
      console.log('   - Técnico:', requerimento.valor_hora_tecnico, '≥', valorMinimoSignificativo, '=', tecnicoEditado);
      
      valoresEditadosManualmenteRef.current = {
        funcional: funcionalEditado,
        tecnico: tecnicoEditado
      };
      setValoresEditadosManualmente({
        funcional: funcionalEditado,
        tecnico: tecnicoEditado
      });
      
      console.log('✅ FLAGS FALLBACK DEFINIDAS (APRIMORADO):', valoresEditadosManualmenteRef.current);
    }
  }, [requerimento, taxaVigente, linguagem]); // Dependências necessárias para comparação

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
    
    // Validar linguagem técnica apenas se houver horas técnicas
    const horasTecnicoValidacao = typeof horasTecnico === 'string' 
      ? converterParaHorasDecimal(horasTecnico) 
      : horasTecnico || 0;
    if (horasTecnicoValidacao > 0 && (!linguagem || linguagem.trim() === '')) {
      status.camposFaltando.push('Linguagem Técnica');
    }
    
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
      
      // Definir valor padrão baseado no cliente
      let valorPadrao: TipoCobrancaType = 'Banco de Horas'; // Padrão geral
      
      // Se cliente não tem AMS ou tem tipo "outros", usar "Faturado" como padrão
      if (clienteSelecionado?.tem_ams === false || clienteSelecionado?.tipo_cobranca === 'outros') {
        valorPadrao = 'Faturado';
      }
      
      // Se o valor padrão não estiver disponível, usar o primeiro disponível
      if (!opcoesDisponiveis.includes(valorPadrao)) {
        valorPadrao = (opcoesDisponiveis[0] as TipoCobrancaType) || 'Faturado';
      }
      
      console.log('Definindo tipo de cobrança padrão:', valorPadrao);
      form.setValue('tipo_cobranca', valorPadrao);
    }
  }, [tipoCobrancaOptionsFiltradas, form, clienteSelecionado]);

  // Definir tipo de cobrança padrão quando cliente é selecionado
  useEffect(() => {
    const tipoCobrancaAtual = form.getValues('tipo_cobranca');
    
    // Se não há tipo de cobrança definido e há cliente selecionado
    if (!tipoCobrancaAtual && clienteSelecionado) {
      let valorPadrao: TipoCobrancaType = 'Banco de Horas'; // Padrão geral
      
      // Se cliente não tem AMS ou tem tipo "outros", usar "Faturado" como padrão
      if (clienteSelecionado.tem_ams === false || clienteSelecionado.tipo_cobranca === 'outros') {
        valorPadrao = 'Faturado';
      }
      
      // Verificar se o valor padrão está disponível nas opções filtradas
      const opcoesDisponiveis = tipoCobrancaOptionsFiltradas.map(option => option.value);
      if (!opcoesDisponiveis.includes(valorPadrao)) {
        valorPadrao = (opcoesDisponiveis[0] as TipoCobrancaType) || 'Faturado';
      }
      
      console.log('Definindo tipo de cobrança padrão para novo cliente:', valorPadrao);
      form.setValue('tipo_cobranca', valorPadrao);
    }
  }, [clienteSelecionado, tipoCobrancaOptionsFiltradas, form]);

  // Resetar formulário quando requerimento mudar (modo edição)
  // REMOVIDO: Este useEffect estava causando reset indesejado do formulário
  // Os valores iniciais já são definidos nos defaultValues do useForm

  // Cores para tipos de cobrança (bolinhas)
  const getCorTipoCobranca = (tipo: string) => {
    const cores = {
      'Banco de Horas': 'bg-blue-500',
      'Cobro Interno': 'bg-green-500',
      'Contrato': 'bg-gray-500',
      'Faturado': 'bg-orange-500',
      'Hora Extra': 'bg-red-500',
      'Sobreaviso': 'bg-purple-500',
      'Reprovado': 'bg-slate-500',
      'Bolsão Enel': 'bg-yellow-500'
    };
    return cores[tipo as keyof typeof cores] || 'bg-gray-500';
  };

  // Cores para badges (fundo claro)
  const getCorBadgeTipoCobranca = (tipo: string) => {
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
    console.log('✅ FORMULÁRIO SUBMETIDO - Dados completos recebidos:', data);
    console.log('🏢 [FORMULÁRIO] empresa_segmentacao_nome:', data.empresa_segmentacao_nome);
    console.log('📋 Tipo de cobrança:', data.tipo_cobranca);
    console.log('💰 Valor/Hora Funcional:', data.valor_hora_funcional);
    console.log('💰 Valor/Hora Técnico:', data.valor_hora_tecnico);
    console.log('⏰ Horas análise EF:', data.horas_analise_ef);
    console.log('🏢 Empresa tipo cobrança:', clienteSelecionado?.tipo_cobranca);
    console.log('🎫 Quantidade tickets:', data.quantidade_tickets);

    // Inferir linguagem automaticamente quando só há horas funcionais
    const horasFuncionalNum = typeof data.horas_funcional === 'string'
      ? converterParaHorasDecimal(data.horas_funcional)
      : data.horas_funcional || 0;
    const horasTecnicoNum = typeof data.horas_tecnico === 'string'
      ? converterParaHorasDecimal(data.horas_tecnico)
      : data.horas_tecnico || 0;

    if (horasFuncionalNum > 0 && horasTecnicoNum === 0 && !data.linguagem) {
      data.linguagem = 'Funcional';
      console.log('🔧 Linguagem inferida automaticamente: Funcional');
    }
    
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
      test: (value: string) => value.length === 0 || !/\s/.test(value),
      message: 'Chamado não pode conter espaços',
      type: 'error' as const
    },
    {
      test: (value: string) => value.length === 0 || !value.includes('_'),
      message: 'Chamado não pode conter underscore (_)',
      type: 'error' as const
    },
    {
      test: (value: string) => value.length === 0 || /^[A-Za-z0-9\-]+$/.test(value),
      message: 'Use apenas letras, números e hífen (-)',
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
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          {requerimento ? 'Editar Requerimento' : 'Novo Requerimento'}
          {tipoCobranca && (
            <Badge className={cn('ml-2', getCorBadgeTipoCobranca(tipoCobranca))}>
              {tipoCobranca}
            </Badge>
          )}
          <OptimizedTooltip content="Preencha todos os campos obrigatórios para criar o requerimento">
            <HelpCircle className="h-4 w-4 text-blue-500" />
          </OptimizedTooltip>
        </CardTitle>
      </CardHeader>
      <CardContent className={cn(responsiveModal.padding, "pt-0 space-y-6")}>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(
            handleSubmit,
            (errors) => {
              console.error('❌ ERROS DE VALIDAÇÃO:');
              console.error(JSON.stringify(errors, null, 2));
              console.log('📋 Valores atuais do formulário:');
              console.log(JSON.stringify(form.getValues(), null, 2));
            }
          )} className={responsiveForm.spacing}>
            {/* Seção: Informações Básicas */}
            <div className={responsiveForm.spacing}>
              <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                Informações Básicas
                <OptimizedTooltip content="Dados principais do requerimento">
                  <HelpCircle className="h-4 w-4 text-gray-400" />
                </OptimizedTooltip>
              </h4>

              <div className={cn("grid grid-cols-1 md:grid-cols-2 gap-4", responsiveForm.fieldLayout)}>
                {/* Chamado */}
                <FormField
                  control={form.control}
                  name="chamado"
                  render={({ field }) => (
                    <FormFieldHelp
                      label="Chamado"
                      required
                      helpText="Código único do chamado técnico. Use apenas letras, números e hífen (-)."
                      error={form.formState.errors.chamado?.message}
                    >
                      <Input
                        {...field}
                        placeholder="Ex: RF-6017993, Projeto, Treinamento, entre outros"
                        className={cn("uppercase", getChamadoErrorClasses(field.value))}
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
                        <SelectTrigger 
                          aria-describedby="cliente-help"
                          className={cn(getErrorClasses(field.value))}
                        >
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

              {/* Grid 2 colunas: Empresa (Segmentação) e Módulo */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Empresa de Segmentação (Segmentação) - Condicional */}
                {mostrarCampoEmpresaSegmentacao && (
                  <FormField
                    control={form.control}
                    name="empresa_segmentacao_nome"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Empresa (Segmentação) <span className="text-gray-700 dark:text-gray-300">*</span>
                        </FormLabel>
                        <Select
                          onValueChange={(value) => {
                            console.log('🔄 [empresa_segmentacao_nome] onChange:', {
                              valorAntigo: field.value,
                              valorNovo: value
                            });
                            field.onChange(value);
                            console.log('✅ [empresa_segmentacao_nome] Valor atualizado no form:', form.getValues('empresa_segmentacao_nome'));
                          }}
                          value={field.value}
                          disabled={isLoading || isLoadingEmpresasSegmentacao}
                        >
                          <FormControl>
                            <SelectTrigger className={cn(getErrorClasses(field.value))}>
                              <SelectValue placeholder="Selecione uma empresa" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {isLoadingEmpresasSegmentacao ? (
                              <SelectItem value="__loading__" disabled>
                                <LoadingSpinner size="sm" text="Carregando..." />
                              </SelectItem>
                            ) : empresasSegmentacao.length === 0 ? (
                              <SelectItem value="__no_empresas__" disabled>
                                Nenhuma empresa encontrada
                              </SelectItem>
                            ) : (
                              empresasSegmentacao.map((empresa) => (
                                <SelectItem key={empresa.nome} value={empresa.nome}>
                                  {empresa.nome} ({empresa.percentual}%)
                                </SelectItem>
                              ))
                            )}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} 
                  />
                )}

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
                          <SelectTrigger className={cn(getErrorClasses(field.value))}>
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
                        className={cn("min-h-[100px]", getErrorClasses(field.value))}
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
              <h4 className="text-sm font-semibold mb-3">Datas</h4>

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
                          className={cn(getErrorClasses(field.value))}
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
              <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                <Calculator className="h-4 w-4" />
                Controle de Horas
              </h4>

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
              <h4 className="text-sm font-semibold mb-3">Informações de Cobrança</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
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
                          <SelectTrigger className={cn(getErrorClasses(field.value))}>
                            <SelectValue placeholder="Selecione o tipo de cobrança" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {tipoCobrancaOptionsFiltradas.map((tipo) => (
                            <SelectItem key={tipo.value} value={tipo.value}>
                              <div className="flex items-center gap-2">
                                <div className={cn("h-3 w-3 rounded-full", getCorTipoCobranca(tipo.value))} />
                                <span>{tipo.label}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                      {(clienteSelecionado?.tipo_cobranca === 'outros' || clienteSelecionado?.tem_ams === false) && (
                        <FormDescription className="text-amber-600 dark:text-amber-400">
                          ⚠️ A opção "Banco de Horas" não está disponível para esta empresa
                          {clienteSelecionado?.tipo_cobranca === 'outros' && ' (tipo de cobrança "Outros")'}
                          {clienteSelecionado?.tem_ams === false && ' (não possui AMS)'}
                        </FormDescription>
                      )}
                    </FormItem>
                  )}
                />

                {/* Atendimento Presencial (condicional - apenas para tipos que requerem valores, exceto Sobreaviso) */}
                {mostrarAtendimentoPresencial && (
                  <FormField
                    control={form.control}
                    name="atendimento_presencial"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0">
                        <FormControl>
                          <Checkbox
                            checked={field.value || false}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel className="text-sm font-normal cursor-pointer">
                            Atendimento presencial
                          </FormLabel>
                        </div>
                      </FormItem>
                    )}
                  />
                )}
              </div>
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
                        <Select 
                          onValueChange={field.onChange} 
                          value={field.value || ''}
                        >
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

                {/* Linguagem Técnica - Só aparece quando há Horas Técnicas */}
                {(() => {
                  const horasTecnicoCondicional = typeof horasTecnico === 'string' 
                    ? converterParaHorasDecimal(horasTecnico) 
                    : horasTecnico || 0;
                  return horasTecnicoCondicional > 0;
                })() && (
                  <FormField
                    control={form.control}
                    name="linguagem"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          Linguagem Técnica <span className="text-gray-700 dark:text-gray-300">*</span>
                        </FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione uma linguagem técnica" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="ABAP">ABAP</SelectItem>
                            <SelectItem value="DBA">DBA</SelectItem>
                            <SelectItem value="PL/SQL">PL/SQL</SelectItem>
                            <SelectItem value="Técnico">Técnico</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}


              </div>
            </div>

            <Separator />

            {/* Seção: Valores (condicional) */}
            {tipoCobranca && ['Faturado', 'Hora Extra', 'Sobreaviso', 'Bolsão Enel'].includes(tipoCobranca) && (
              <>
                <Separator />
                <div className="space-y-4">
                  <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    💰 Valores por Hora
                    <OptimizedTooltip content="Campos obrigatórios para tipos de cobrança com valor monetário">
                      <HelpCircle className="h-4 w-4 text-blue-500" />
                    </OptimizedTooltip>
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Valor Hora Funcional */}
                    <FormField
                      control={form.control}
                      name="valor_hora_funcional"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>
                            Valor/Hora Funcional <span className="text-gray-700 dark:text-gray-300">*</span>
                            {valoresEditadosManualmente.funcional && (
                              <span className="ml-1 text-xs text-blue-600" title="Editado manualmente">✏️</span>
                            )}
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
                                  // Marcar como editado manualmente
                                  handleValorEditadoManualmente('funcional');
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
                            {valoresEditadosManualmente.tecnico && (
                              <span className="ml-1 text-xs text-blue-600" title="Editado manualmente">✏️</span>
                            )}
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
                                  // Marcar como editado manualmente
                                  handleValorEditadoManualmente('tecnico');
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
                  <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                    🎫 Controle de Tickets
                    <OptimizedTooltip content="Campo automático para empresas do tipo 'ticket' quando selecionado 'Banco de Horas'">
                      <HelpCircle className="h-4 w-4 text-blue-500" />
                    </OptimizedTooltip>
                  </h4>

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
              <h4 className="text-sm font-semibold mb-3">Observações</h4>

              <FormField
                control={form.control}
                name="observacao"
                render={({ field }) => (
                  <FormItem>
                    
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