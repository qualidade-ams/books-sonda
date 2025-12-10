import React, { useState, useMemo } from 'react';
import { Plus, Calculator } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { TipoCobrancaBloco, TipoCobrancaBlocoData } from './TipoCobrancaBloco';
import { useClientesRequerimentos } from '@/hooks/useRequerimentos';
import { MODULO_OPTIONS, TIPO_COBRANCA_OPTIONS } from '@/types/requerimentos';
import { formatarHorasParaExibicao, converterParaHorasDecimal } from '@/utils/horasUtils';
import { LoadingSpinner } from './LoadingStates';
import { toast } from 'sonner';

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
  const { data: clientes = [], isLoading: isLoadingClientes } = useClientesRequerimentos();

  // Estados para dados compartilhados
  const [chamado, setChamado] = useState('');
  const [clienteId, setClienteId] = useState('');
  const [modulo, setModulo] = useState('Comply');
  const [descricao, setDescricao] = useState('');
  const [dataEnvio, setDataEnvio] = useState('');
  const [dataAprovacao, setDataAprovacao] = useState('');
  const [linguagem, setLinguagem] = useState('Funcional');
  const [observacao, setObservacao] = useState('');

  // Estado para blocos de tipos de cobrança
  const [blocos, setBlocos] = useState<TipoCobrancaBlocoData[]>([
    {
      id: crypto.randomUUID(),
      tipo_cobranca: 'Banco de Horas',
      horas_funcional: 0,
      horas_tecnico: 0
    }
  ]);

  // Buscar dados do cliente selecionado
  const clienteSelecionado = useMemo(() => {
    if (!clienteId || !clientes.length) return null;
    return clientes.find(cliente => cliente.id === clienteId);
  }, [clienteId, clientes]);

  // Filtrar opções de tipo de cobrança baseado no tipo de cobrança da empresa
  const tipoCobrancaOptionsFiltradas = useMemo(() => {
    if (!clienteSelecionado) {
      return TIPO_COBRANCA_OPTIONS;
    }

    if (clienteSelecionado.tipo_cobranca === 'outros') {
      return TIPO_COBRANCA_OPTIONS.filter(option => option.value !== 'Banco de Horas');
    }

    return TIPO_COBRANCA_OPTIONS;
  }, [clienteSelecionado]);

  // Adicionar novo bloco
  const handleAdicionarBloco = () => {
    const novoBloco: TipoCobrancaBlocoData = {
      id: crypto.randomUUID(),
      tipo_cobranca: 'Banco de Horas',
      horas_funcional: 0,
      horas_tecnico: 0
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
    setBlocos(blocos.map(b => {
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
          
          // Se mudou PARA "Hora Extra", limpar valores até que tipo de hora extra seja selecionado
          if (valor === 'Hora Extra') {
            blocoAtualizado.valor_hora_funcional = 0;
            blocoAtualizado.valor_hora_tecnico = 0;
            blocoAtualizado.tipo_hora_extra = undefined;
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
        
        return blocoAtualizado;
      }
      return b;
    }));
  };

  // Calcular totalizadores
  const totalizadores = useMemo(() => {
    let totalHoras = 0;
    let totalValor = 0;

    blocos.forEach(bloco => {
      const horasFuncional = typeof bloco.horas_funcional === 'string'
        ? converterParaHorasDecimal(bloco.horas_funcional)
        : bloco.horas_funcional || 0;
      
      const horasTecnico = typeof bloco.horas_tecnico === 'string'
        ? converterParaHorasDecimal(bloco.horas_tecnico)
        : bloco.horas_tecnico || 0;

      totalHoras += horasFuncional + horasTecnico;

      // Calcular valor apenas para tipos com valor/hora
      if (['Faturado', 'Hora Extra', 'Sobreaviso', 'Bolsão Enel'].includes(bloco.tipo_cobranca)) {
        totalValor += (horasFuncional * (bloco.valor_hora_funcional || 0)) +
                      (horasTecnico * (bloco.valor_hora_tecnico || 0));
      }
    });

    return { totalHoras, totalValor };
  }, [blocos]);

  // Validar formulário
  const validarFormulario = (): { valido: boolean; erros: string[] } => {
    const erros: string[] = [];

    // Validar campos compartilhados
    if (!chamado.trim()) erros.push('Chamado é obrigatório');
    if (!clienteId) erros.push('Cliente é obrigatório');
    if (!modulo) erros.push('Módulo é obrigatório');
    if (!descricao.trim()) erros.push('Descrição é obrigatória');
    if (!dataEnvio) erros.push('Data de envio é obrigatória');
    if (!linguagem) erros.push('Linguagem é obrigatória');

    // Validar cada bloco
    blocos.forEach((bloco, index) => {
      if (!bloco.tipo_cobranca) {
        erros.push(`Bloco ${index + 1}: Tipo de cobrança é obrigatório`);
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
    const tiposUsados = blocos.map(b => b.tipo_cobranca);
    const tiposDuplicados = tiposUsados.filter((tipo, index) => tiposUsados.indexOf(tipo) !== index);
    if (tiposDuplicados.length > 0) {
      erros.push(`Tipos de cobrança duplicados: ${[...new Set(tiposDuplicados)].join(', ')}`);
    }

    return { valido: erros.length === 0, erros };
  };

  // Submeter formulário
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const { valido, erros } = validarFormulario();

    if (!valido) {
      erros.forEach(erro => toast.error(erro));
      return;
    }

    // Preparar dados compartilhados
    const dadosCompartilhados = {
      chamado: chamado.trim().toUpperCase(),
      cliente_id: clienteId,
      modulo,
      descricao: descricao.trim(),
      data_envio: dataEnvio,
      data_aprovacao: dataAprovacao || undefined,
      linguagem,
      observacao: observacao.trim() || undefined
    };

    // Criar array de requerimentos
    const requerimentos = blocos.map(bloco => ({
      ...dadosCompartilhados,
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
          <CardTitle>Informações Básicas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Chamado e Cliente */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>
                Chamado <span className="text-red-500">*</span>
              </Label>
              <Input
                value={chamado}
                onChange={(e) => setChamado(e.target.value)}
                placeholder="Ex: RF-6017993"
                className="uppercase"
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <Label>
                Cliente <span className="text-red-500">*</span>
              </Label>
              <Select
                value={clienteId}
                onValueChange={setClienteId}
                disabled={isLoading || isLoadingClientes}
              >
                <SelectTrigger>
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
            </div>
          </div>

          {/* Módulo e Linguagem */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>
                Módulo <span className="text-red-500">*</span>
              </Label>
              <Select value={modulo} onValueChange={setModulo} disabled={isLoading}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um módulo" />
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

            <div className="space-y-2">
              <Label>
                Linguagem <span className="text-red-500">*</span>
              </Label>
              <Select value={linguagem} onValueChange={setLinguagem} disabled={isLoading}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma linguagem" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ABAP">ABAP</SelectItem>
                  <SelectItem value="DBA">DBA</SelectItem>
                  <SelectItem value="Funcional">Funcional</SelectItem>
                  <SelectItem value="PL/SQL">PL/SQL</SelectItem>
                  <SelectItem value="Técnico">Técnico</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Descrição */}
          <div className="space-y-2">
            <Label>
              Descrição <span className="text-red-500">*</span>
            </Label>
            <Textarea
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Descreva o requerimento..."
              className="min-h-[100px]"
              disabled={isLoading}
            />
            <p className="text-sm text-muted-foreground">
              Máximo 500 caracteres ({descricao.length}/500)
            </p>
          </div>

          {/* Datas */}
          <div>
            <h4 className="text-sm font-semibold mb-3">Datas</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>
                  Data de Envio do Orçamento <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="date"
                  value={dataEnvio}
                  onChange={(e) => setDataEnvio(e.target.value)}
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <Label>Data de Aprovação do Orçamento</Label>
                <Input
                  type="date"
                  value={dataAprovacao}
                  onChange={(e) => setDataAprovacao(e.target.value)}
                  min={dataEnvio}
                  disabled={isLoading}
                />
                <p className="text-xs text-muted-foreground">
                  Campo opcional. Deve ser igual ou posterior à data de envio.
                </p>
              </div>
            </div>
          </div>

          {/* Seção: Tipos de Cobrança */}
          <Separator className="my-6" />
          
          <div className="space-y-6">
            <h3 className="text-lg font-semibold">Tipos de Cobrança</h3>
            
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
                  linguagem={linguagem}
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
              Adicionar Tipo de Cobrança
            </Button>
          </div>

          {/* Observações */}
          <Separator className="my-6" />
          
          <div>
            <h4 className="text-sm font-semibold mb-3">Observações</h4>
            <div className="space-y-2">
              
              <Textarea
                value={observacao}
                onChange={(e) => setObservacao(e.target.value)}
                placeholder="Observações adicionais (opcional)..."
                className="min-h-[80px]"
                disabled={isLoading}
              />
              <p className="text-sm text-muted-foreground">
                Máximo 1000 caracteres ({observacao.length}/1000)
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
            Totalizador Geral
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-muted-foreground mb-1">Total de Horas</p>
              <p className="text-lg font-semibold">
                {formatarHorasParaExibicao(totalizadores.totalHoras.toString(), 'completo')}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Total de Valores</p>
              <p className="text-lg font-semibold text-green-600">
                R$ {totalizadores.totalValor.toLocaleString('pt-BR', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">Requerimentos a Criar</p>
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
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={isLoading}
          className="min-w-[200px] bg-blue-600 hover:bg-blue-700"
        >
          {isLoading ? (
            <LoadingSpinner size="sm" text="Criando..." />
          ) : (
            `Criar ${blocos.length} Requerimento${blocos.length > 1 ? 's' : ''}`
          )}
        </Button>
      </div>
    </form>
  );
}
