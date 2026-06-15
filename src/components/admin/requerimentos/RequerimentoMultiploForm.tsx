import React, { useState, useMemo, useEffect } from 'react';
import { Plus, Calculator } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { TipoCobrancaBloco, TipoCobrancaBlocoData } from './TipoCobrancaBloco';
import { useClientesRequerimentos } from '@/hooks/useRequerimentos';
import { useEmpresasSegmentacao } from '@/hooks/useEmpresasSegmentacao';
import { useTranslatedTipoCobranca } from '@/hooks/useTranslatedOptions';
import { MODULO_OPTIONS, TIPO_COBRANCA_OPTIONS } from '@/types/requerimentos';
import { formatarHorasParaExibicao, converterParaHorasDecimal } from '@/utils/horasUtils';
import { LoadingSpinner } from './LoadingStates';
import { ValidationFeedback } from './HelpSystem';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface RequerimentoMultiploFormProps {
  onSubmit: (requerimentos: any[]) => Promise<void>;
  onCancel: () => void;
  isLoading?: boolean;
}

export function RequerimentoMultiploForm({
  onSubmit,
  onCancel,
  isLoading = false
}: RequerimentoMultiploFormProps) {
  const { t } = useTranslation();
  const { data: clientes = [], isLoading: isLoadingClientes } = useClientesRequerimentos();
  const translatedTipoCobranca = useTranslatedTipoCobranca();

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

  // Validações em tempo real para o campo Chamado
  const chamadoValidation = useMemo(() => [
    {
      test: (value: string) => value.length > 0,
      message: t('reqForm.validation.ticketRequired'),
      type: 'error' as const
    },
    {
      test: (value: string) => value.length === 0 || !/\s/.test(value),
      message: t('reqForm.validation.ticketNoSpaces'),
      type: 'error' as const
    },
    {
      test: (value: string) => value.length === 0 || !value.includes('_'),
      message: t('reqForm.validation.ticketNoUnderscore'),
      type: 'error' as const
    },
    {
      test: (value: string) => value.length === 0 || /^[A-Za-z0-9\-]+$/.test(value),
      message: t('reqForm.validation.ticketOnlyAlphanumeric'),
      type: 'error' as const
    },
    {
      test: (value: string) => value.length === 0 || value.length >= 3,
      message: t('reqForm.validation.ticketMinLength'),
      type: 'warning' as const
    }
  ], [t]);

  // Estados para dados compartilhados
  const [chamado, setChamado] = useState('');
  const [clienteId, setClienteId] = useState('');
  const [empresaSegmentacaoNome, setEmpresaSegmentacaoNome] = useState('');
  const [modulo, setModulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [dataEnvio, setDataEnvio] = useState('');
  const [dataAprovacao, setDataAprovacao] = useState('');
  const [observacao, setObservacao] = useState('');
  
  // Buscar empresas de segmentação (baseline) do cliente selecionado
  const { data: empresasSegmentacao = [], isLoading: isLoadingEmpresasSegmentacao } = useEmpresasSegmentacao(clienteId);
  
  // Verificar se deve mostrar campo de empresa_segmentacao_id
  const mostrarCampoEmpresaSegmentacao = useMemo(() => {
    return empresasSegmentacao.length > 0;
  }, [empresasSegmentacao]);
  
  console.log('📊 Empresas de segmentação (Múltiplo):', {
    clienteId,
    empresas: empresasSegmentacao,
    mostrarCampo: mostrarCampoEmpresaSegmentacao
  });

  // Estado para blocos de tipos de cobrança
  const [blocos, setBlocos] = useState<TipoCobrancaBlocoData[]>([
    {
      id: crypto.randomUUID(),
      tipo_cobranca: 'Banco de Horas', // Será atualizado pelo useEffect
      horas_funcional: 0,
      horas_tecnico: 0,
      linguagem: ''
    }
  ]);

  // Buscar dados do cliente selecionado
  const clienteSelecionado = useMemo(() => {
    if (!clienteId || !clientes.length) return null;
    return clientes.find(cliente => cliente.id === clienteId);
  }, [clienteId, clientes]);

  // Função para determinar o tipo de cobrança padrão baseado no cliente
  const getTipoCobrancaPadrao = () => {
    if (!clienteSelecionado) {
      return 'Banco de Horas'; // Padrão quando não há cliente
    }
    
    // Se cliente não tem AMS ou tem tipo "outros", usar "Faturado" como padrão
    if (clienteSelecionado.tem_ams === false || clienteSelecionado.tipo_cobranca === 'outros') {
      return 'Faturado';
    }
    
    return 'Banco de Horas'; // Padrão para clientes com AMS
  };

  // Filtrar opções de tipo de cobrança baseado no tipo de cobrança da empresa
  const tipoCobrancaOptionsFiltradas = useMemo(() => {
    if (!clienteSelecionado) {
      return translatedTipoCobranca;
    }

    // Se a empresa tem tipo de cobrança "outros", remover "Banco de Horas"
    if (clienteSelecionado.tipo_cobranca === 'outros') {
      return translatedTipoCobranca.filter(option => option.value !== 'Banco de Horas');
    }

    // Se a empresa tem "Tem AMS" = false, remover "Banco de Horas"
    if (clienteSelecionado.tem_ams === false) {
      return translatedTipoCobranca.filter(option => option.value !== 'Banco de Horas');
    }

    return translatedTipoCobranca;
  }, [clienteSelecionado, translatedTipoCobranca]);

  // Atualizar tipo de cobrança padrão do primeiro bloco quando cliente mudar
  useEffect(() => {
    if (blocos.length > 0 && clienteSelecionado) {
      const primeiroBloco = blocos[0];
      const tipoPadrao = getTipoCobrancaPadrao();
      
      // Sempre atualizar para o tipo padrão do cliente selecionado
      // Isso garante que ao trocar de cliente SEM AMS para COM AMS (ou vice-versa),
      // o tipo de cobrança seja atualizado corretamente
      if (primeiroBloco.tipo_cobranca !== tipoPadrao) {
        console.log('🔄 Cliente alterado. Atualizando tipo de cobrança do primeiro bloco de', 
                    primeiroBloco.tipo_cobranca, 'para:', tipoPadrao);
        handleAtualizarBloco(primeiroBloco.id, 'tipo_cobranca', tipoPadrao);
      }
    }
  }, [clienteSelecionado, tipoCobrancaOptionsFiltradas]);

  // Adicionar novo bloco
  const handleAdicionarBloco = () => {
    const novoBloco: TipoCobrancaBlocoData = {
      id: crypto.randomUUID(),
      tipo_cobranca: getTipoCobrancaPadrao(),
      horas_funcional: 0,
      horas_tecnico: 0,
      linguagem: ''
    };
    setBlocos([...blocos, novoBloco]);
  };

  // Remover bloco
  const handleRemoverBloco = (id: string) => {
    if (blocos.length === 1) {
      toast.error('Deve haver pelo menos um tipo de cobrança');
      return;
    }
    setBlocos(blocos.filter(b => b.id !== id));
  };

  // Atualizar campo de um bloco
  const handleAtualizarBloco = (id: string, campo: string, valor: any) => {
    console.log('🔄 Atualizando bloco:', { id, campo, valor });
    setBlocos(prevBlocos => {
      const novosBlocos = prevBlocos.map(b => {
      if (b.id === id) {
        const blocoAtualizado = { ...b, [campo]: valor };
        
        // Limpar campos condicionais quando tipo de cobrança mudar
        if (campo === 'tipo_cobranca') {
          const tiposComValorHora = ['Faturado', 'Hora Extra', 'Sobreaviso', 'Bolsão Enel'];
          
          // Limpar valores se tipo não requer valores/hora
          if (!tiposComValorHora.includes(valor)) {
            blocoAtualizado.valor_hora_funcional = undefined;
            blocoAtualizado.valor_hora_tecnico = undefined;
          }
          
          // Se mudou PARA "Hora Extra", apenas limpar tipo_hora_extra para forçar seleção
          if (valor === 'Hora Extra') {
            blocoAtualizado.tipo_hora_extra = undefined;
            // Não limpar valores/hora - deixar o TipoCobrancaBloco gerenciar isso
          }
          
          // Se mudou DE "Hora Extra" para outro tipo, limpar tipo_hora_extra
          if (valor !== 'Hora Extra') {
            blocoAtualizado.tipo_hora_extra = undefined;
          }
          
          if (valor !== 'Banco de Horas') {
            blocoAtualizado.quantidade_tickets = undefined;
          }
          
          if (valor !== 'Reprovado') {
            blocoAtualizado.horas_analise_ef = undefined;
          }
        }
        
        console.log('📊 Bloco atualizado:', blocoAtualizado);
        return blocoAtualizado;
      }
      return b;
      });
      console.log('📋 Todos os blocos após atualização:', novosBlocos);
      return novosBlocos;
    });
  };

  // Calcular totalizadores
  const totalizadores = useMemo(() => {
    let totalMinutos = 0;
    let totalValor = 0;

    blocos.forEach(bloco => {
      const horasFuncional = typeof bloco.horas_funcional === 'string'
        ? converterParaHorasDecimal(bloco.horas_funcional)
        : bloco.horas_funcional || 0;
      
      const horasTecnico = typeof bloco.horas_tecnico === 'string'
        ? converterParaHorasDecimal(bloco.horas_tecnico)
        : bloco.horas_tecnico || 0;

      // Converter horas decimais para minutos e somar
      totalMinutos += Math.round((horasFuncional + horasTecnico) * 60);

      // Calcular valor apenas para tipos com valor/hora
      if (['Faturado', 'Hora Extra', 'Sobreaviso', 'Bolsão Enel'].includes(bloco.tipo_cobranca)) {
        totalValor += (horasFuncional * (bloco.valor_hora_funcional || 0)) +
                      (horasTecnico * (bloco.valor_hora_tecnico || 0));
      }
    });

    // Converter total de minutos para formato HH:MM
    const horas = Math.floor(totalMinutos / 60);
    const minutos = totalMinutos % 60;
    const totalHorasFormatado = `${horas}:${minutos.toString().padStart(2, '0')}`;

    return { totalHoras: totalHorasFormatado, totalValor };
  }, [blocos]);

  // Validar formulário
  const validarFormulario = (): { valido: boolean; erros: string[] } => {
    const erros: string[] = [];

    // Validar campos compartilhados
    if (!chamado.trim()) erros.push('Chamado é obrigatório');
    if (chamado.trim() && /\s/.test(chamado)) erros.push('Chamado não pode conter espaços');
    if (chamado.trim() && chamado.includes('_')) erros.push('Chamado não pode conter underscore (_)');
    if (chamado.trim() && !/^[A-Za-z0-9\-]+$/.test(chamado.trim())) erros.push('Chamado: use apenas letras, números e hífen (-)');
    if (!clienteId) erros.push('Cliente é obrigatório');
    if (mostrarCampoEmpresaSegmentacao && !empresaSegmentacaoNome) {
      erros.push('Empresa (Baseline) é obrigatória para este cliente');
    }
    if (!modulo) erros.push('Módulo é obrigatório');
    if (!descricao.trim()) erros.push('Descrição é obrigatória');
    if (!dataEnvio) erros.push('Data de envio é obrigatória');

    // Validar cada bloco
    blocos.forEach((bloco, index) => {
      if (!bloco.tipo_cobranca) {
        erros.push(`Bloco ${index + 1}: Tipo de cobrança é obrigatório`);
      }

      // Validar linguagem técnica apenas se houver horas técnicas
      const horasTecnicoValidacao = typeof bloco.horas_tecnico === 'string'
        ? converterParaHorasDecimal(bloco.horas_tecnico)
        : bloco.horas_tecnico || 0;

      if (horasTecnicoValidacao > 0 && !bloco.linguagem) {
        erros.push(`Bloco ${index + 1}: Linguagem Técnica é obrigatória quando há Horas Técnicas`);
      }

      const horasFuncional = typeof bloco.horas_funcional === 'string'
        ? converterParaHorasDecimal(bloco.horas_funcional)
        : bloco.horas_funcional || 0;
      
      const horasTecnico = typeof bloco.horas_tecnico === 'string'
        ? converterParaHorasDecimal(bloco.horas_tecnico)
        : bloco.horas_tecnico || 0;

      if (horasFuncional === 0 && horasTecnico === 0) {
        erros.push(`Bloco ${index + 1}: Deve haver pelo menos uma hora`);
      }

      // Validar campos condicionais
      if (['Faturado', 'Hora Extra', 'Sobreaviso', 'Bolsão Enel'].includes(bloco.tipo_cobranca)) {
        if (horasFuncional > 0 && (!bloco.valor_hora_funcional || bloco.valor_hora_funcional <= 0)) {
          erros.push(`Bloco ${index + 1}: Valor/hora funcional é obrigatório`);
        }
        if (horasTecnico > 0 && (!bloco.valor_hora_tecnico || bloco.valor_hora_tecnico <= 0)) {
          erros.push(`Bloco ${index + 1}: Valor/hora técnico é obrigatório`);
        }
      }

      if (bloco.tipo_cobranca === 'Hora Extra' && !bloco.tipo_hora_extra) {
        erros.push(`Bloco ${index + 1}: Tipo de hora extra é obrigatório`);
      }

      if (bloco.tipo_cobranca === 'Banco de Horas' && 
          clienteSelecionado?.tipo_cobranca === 'ticket' && 
          (!bloco.quantidade_tickets || bloco.quantidade_tickets <= 0)) {
        erros.push(`Bloco ${index + 1}: Quantidade de tickets é obrigatória`);
      }
    });

    // Verificar tipos de cobrança duplicados
    // Para "Hora Extra", considerar também tipo_hora_extra e linguagem_tecnica
    const combinacoesUsadas = new Map<string, number>();
    
    blocos.forEach((bloco, index) => {
      let chave: string;
      
      if (bloco.tipo_cobranca === 'Hora Extra') {
        // Para Hora Extra, a chave única é: tipo_cobranca + tipo_hora_extra + linguagem
        chave = `${bloco.tipo_cobranca}|${bloco.tipo_hora_extra || ''}|${bloco.linguagem || ''}`;
      } else {
        // Para outros tipos, apenas tipo_cobranca
        chave = bloco.tipo_cobranca;
      }
      
      if (combinacoesUsadas.has(chave)) {
        const primeiroIndex = combinacoesUsadas.get(chave)!;
        
        if (bloco.tipo_cobranca === 'Hora Extra') {
          erros.push(
            `Blocos ${primeiroIndex + 1} e ${index + 1}: Combinação duplicada de Hora Extra ` +
            `(${bloco.tipo_hora_extra || 'não definido'} + ${bloco.linguagem || 'sem linguagem'})`
          );
        } else {
          erros.push(`Blocos ${primeiroIndex + 1} e ${index + 1}: Tipo de cobrança "${bloco.tipo_cobranca}" duplicado`);
        }
      } else {
        combinacoesUsadas.set(chave, index);
      }
    });

    return { valido: erros.length === 0, erros };
  };

  // Submeter formulário
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Marcar que houve tentativa de submissão
    setTentouSubmeter(true);

    const { valido, erros } = validarFormulario();

    if (!valido) {
      erros.forEach(erro => toast.error(erro));
      return;
    }

    // Preparar dados compartilhados
    const dadosCompartilhados = {
      chamado: chamado.trim().toUpperCase(),
      cliente_id: clienteId,
      empresa_segmentacao_nome: empresaSegmentacaoNome || undefined,
      modulo,
      descricao: descricao.trim(),
      data_envio: dataEnvio,
      data_aprovacao: dataAprovacao || undefined,
      observacao: observacao.trim() || undefined
    };

    // Criar array de requerimentos
    const requerimentos = blocos.map(bloco => ({
      ...dadosCompartilhados,
      linguagem: bloco.linguagem,
      tipo_cobranca: bloco.tipo_cobranca,
      horas_funcional: bloco.horas_funcional,
      horas_tecnico: bloco.horas_tecnico,
      valor_hora_funcional: bloco.valor_hora_funcional,
      valor_hora_tecnico: bloco.valor_hora_tecnico,
      tipo_hora_extra: bloco.tipo_hora_extra,
      quantidade_tickets: bloco.quantidade_tickets,
      horas_analise_ef: bloco.horas_analise_ef,
      mes_cobranca: bloco.mes_cobranca || undefined
    }));

    try {
      await onSubmit(requerimentos);
      toast.success(`${requerimentos.length} requerimento(s) criado(s) com sucesso!`);
      // Resetar flag de tentativa após sucesso
      setTentouSubmeter(false);
    } catch (error) {
      console.error('Erro ao criar requerimentos:', error);
      toast.error('Erro ao criar requerimentos');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Card Principal */}
      <Card>
        <CardHeader>
          <CardTitle>{t('reqForm.basicInfo')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Chamado e Cliente */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>
                {t('requirements.ticket')} <span className="text-red-500">*</span>
              </Label>
              <Input
                value={chamado}
                onChange={(e) => setChamado(e.target.value)}
                placeholder="Ex: RF-6017993"
                className={cn("uppercase", getChamadoErrorClasses(chamado))}
                disabled={isLoading}
              />
              <ValidationFeedback
                value={chamado}
                rules={chamadoValidation}
                showOnlyErrors
              />
            </div>

            <div className="space-y-2">
              <Label>
                {t('requirements.client')} <span className="text-red-500">*</span>
              </Label>
              <Select
                value={clienteId}
                onValueChange={setClienteId}
                disabled={isLoading || isLoadingClientes}
              >
                <SelectTrigger className={cn(getErrorClasses(clienteId))}>
                  <SelectValue placeholder={t('reqForm.selectClient')} />
                </SelectTrigger>
                <SelectContent>
                  {isLoadingClientes ? (
                    <SelectItem value="__loading__" disabled>
                      <LoadingSpinner size="sm" text={t('common.loading')} />
                    </SelectItem>
                  ) : clientes.length === 0 ? (
                    <SelectItem value="__no_clients__" disabled>
                      {t('common.noData')}
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
            </div>
          </div>

          {/* Módulo */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Empresa de Segmentação (Segmentação) - Condicional */}
          {mostrarCampoEmpresaSegmentacao && (
            <div className="space-y-2">
              <Label>
                Empresa (Segmentação) <span className="text-red-500">*</span>
              </Label>
              <Select
                value={empresaSegmentacaoNome}
                onValueChange={setEmpresaSegmentacaoNome}
                disabled={isLoading || isLoadingEmpresasSegmentacao}
              >
                <SelectTrigger className={cn(getErrorClasses(empresaSegmentacaoNome))}>
                  <SelectValue placeholder="Selecione uma empresa" />
                </SelectTrigger>
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
            </div>
          )}


            <div className="space-y-2">
              <Label>
                {t('requirements.module')} <span className="text-red-500">*</span>
              </Label>
              <Select value={modulo} onValueChange={setModulo} disabled={isLoading}>
                <SelectTrigger className={cn(getErrorClasses(modulo))}>
                  <SelectValue placeholder={t('reqForm.selectModule')} />
                </SelectTrigger>
                <SelectContent>
                  {MODULO_OPTIONS.map((mod) => (
                    <SelectItem key={mod.value} value={mod.value}>
                      {mod.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Descrição */}
          <div className="space-y-2">
            <Label>
              {t('requirements.description')} <span className="text-red-500">*</span>
            </Label>
            <Textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder={t('reqForm.descriptionPlaceholder')}
              className={cn("min-h-[100px]", getErrorClasses(descricao))}
              disabled={isLoading}
            />
            <p className="text-sm text-muted-foreground">
              {t('reqForm.maxChars', { count: 500 })} ({descricao.length}/500)
            </p>
          </div>

          {/* Datas */}
          <div>
            <h4 className="text-sm font-semibold mb-3">{t('reqForm.dates')}</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>
                  {t('reqForm.sendDate')} <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="date"
                  value={dataEnvio}
                  onChange={(e) => setDataEnvio(e.target.value)}
                  className={cn(getErrorClasses(dataEnvio))}
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label>{t('reqForm.approvalDate')}</Label>
                <Input
                  type="date"
                  value={dataAprovacao}
                  onChange={(e) => setDataAprovacao(e.target.value)}
                  min={dataEnvio}
                  disabled={isLoading}
                />
                <p className="text-xs text-muted-foreground">
                  {t('reqForm.approvalDateHelp')}
                </p>
              </div>
            </div>
          </div>

          {/* Seção: Tipos de Cobrança */}
          <Separator className="my-6" />
          
          <div className="space-y-6">
            <h3 className="text-lg font-semibold">{t('reqForm.billingTypes')}</h3>
            
            {blocos.map((bloco, index) => (
              <React.Fragment key={bloco.id}>
                {index > 0 && <Separator className="my-4" />}
                <TipoCobrancaBloco
                  bloco={bloco}
                  index={index}
                  tiposDisponiveis={tipoCobrancaOptionsFiltradas}
                  onUpdate={handleAtualizarBloco}
                  onRemove={handleRemoverBloco}
                  canRemove={blocos.length > 1}
                  empresaTipoCobranca={clienteSelecionado?.tipo_cobranca}
                  clienteId={clienteId}
                  tentouSubmeter={tentouSubmeter}
                />
              </React.Fragment>
            ))}

            <Button
              type="button"
              variant="outline"
              onClick={handleAdicionarBloco}
              className="w-full border-dashed border-2"
              disabled={isLoading}
            >
              <Plus className="h-4 w-4 mr-2" />
              {t('reqForm.addBillingType')}
            </Button>
          </div>

          {/* Observações */}
          <Separator className="my-6" />
          
          <div>
            <h4 className="text-sm font-semibold mb-3">{t('requirements.observation')}</h4>
            <div className="space-y-2">
              
              <Textarea
                value={observacao}
                onChange={(e) => setObservacao(e.target.value)}
                placeholder={t('reqForm.observationPlaceholder')}
                className="min-h-[80px]"
                disabled={isLoading}
              />
              <p className="text-sm text-muted-foreground">
                {t('reqForm.maxChars', { count: 1000 })} ({observacao.length}/1000)
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Separator />

      {/* Totalizador Geral */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Calculator className="h-4 w-4" />
            {t('reqForm.generalTotal')}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-muted-foreground mb-1">{t('requirements.totalHours')}</p>
              <p className="text-lg font-semibold">
                {formatarHorasParaExibicao(totalizadores.totalHoras, 'completo')}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">{t('reqForm.totalValues')}</p>
              <p className="text-lg font-semibold text-green-600">
                R$ {totalizadores.totalValor.toLocaleString('pt-BR', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">{t('reqForm.requirementsToCreate')}</p>
              <p className="text-lg font-semibold">
                {blocos.length}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Botões de Ação */}
      <div className="flex gap-4 justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isLoading}
        >
          {t('common.cancel')}
        </Button>
        <Button
          type="submit"
          disabled={isLoading}
          className="min-w-[200px] bg-blue-600 hover:bg-blue-700"
        >
          {isLoading ? (
            <LoadingSpinner size="sm" text={t('common.loading')} />
          ) : (
            `${t('reqForm.create')} ${blocos.length} ${blocos.length > 1 ? t('reqForm.requirementsPlural') : t('reqForm.requirementSingular')}`
          )}
        </Button>
      </div>
    </form>
  );
}
