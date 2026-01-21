/**
 * Gerenciador de Alocações de Banco de Horas
 * 
 * Componente para criar, editar e gerenciar alocações internas do baseline
 * da empresa. Permite segmentar o baseline por percentual (ex: por departamento,
 * projeto ou centro de custo).
 * 
 * Funcionalidades:
 * - Lista de alocações com percentuais
 * - Adicionar nova alocação
 * - Editar alocação inline
 * - Remover alocação
 * - Validação automática de soma = 100%
 * - Feedback visual de erros
 * 
 * @module components/admin/banco-horas/GerenciadorAlocacoes
 */

import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, AlertCircle, CheckCircle2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';

import type { Alocacao } from '@/types/bancoHoras';
import { validarAlocacoes } from '@/services/bancoHorasAlocacoesService';

/**
 * Props do componente GerenciadorAlocacoes
 */
export interface GerenciadorAlocacoesProps {
  /** ID da empresa */
  empresaId: string;
  /** Lista de alocações existentes */
  alocacoes: Alocacao[];
  /** Callback quando alocações são atualizadas */
  onUpdate: (alocacoes: Partial<Alocacao>[]) => void;
  /** Se o componente está em modo de carregamento */
  loading?: boolean;
  /** Se o componente está desabilitado */
  disabled?: boolean;
}

/**
 * Alocação temporária para edição (antes de salvar)
 */
interface AlocacaoTemp {
  id?: string;
  nome_alocacao: string;
  percentual_baseline: number;
  isNew?: boolean;
  isEditing?: boolean;
}

/**
 * Componente GerenciadorAlocacoes
 * 
 * Gerencia alocações internas do baseline da empresa com validação
 * automática de soma de percentuais = 100%.
 * 
 * @example
 * ```tsx
 * <GerenciadorAlocacoes
 *   empresaId="123"
 *   alocacoes={alocacoes}
 *   onUpdate={(novasAlocacoes) => salvarAlocacoes(novasAlocacoes)}
 * />
 * ```
 * 
 * **Validates: Requirements 3.1-3.9**
 */
export function GerenciadorAlocacoes({
  empresaId,
  alocacoes,
  onUpdate,
  loading = false,
  disabled = false
}: GerenciadorAlocacoesProps) {
  // Estado local das alocações (para edição)
  const [alocacoesTemp, setAlocacoesTemp] = useState<AlocacaoTemp[]>([]);
  
  // Estado de validação
  const [validacao, setValidacao] = useState<{
    valido: boolean;
    erros: string[];
    somaPercentuais: number;
  }>({ valido: true, erros: [], somaPercentuais: 0 });
  
  // Sincronizar alocações externas com estado local
  useEffect(() => {
    const temp = alocacoes.map(a => ({
      id: a.id,
      nome_alocacao: a.nome_alocacao,
      percentual_baseline: a.percentual_baseline,
      isNew: false,
      isEditing: false
    }));
    setAlocacoesTemp(temp);
  }, [alocacoes]);
  
  // Validar alocações sempre que mudarem
  useEffect(() => {
    if (alocacoesTemp.length === 0) {
      setValidacao({ valido: true, erros: [], somaPercentuais: 0 });
      return;
    }
    
    const resultado = validarAlocacoes(alocacoesTemp);
    setValidacao(resultado);
  }, [alocacoesTemp]);
  
  /**
   * Adiciona nova alocação vazia
   */
  const handleAdicionarAlocacao = () => {
    const novaAlocacao: AlocacaoTemp = {
      nome_alocacao: '',
      percentual_baseline: 0,
      isNew: true,
      isEditing: true
    };
    
    setAlocacoesTemp([...alocacoesTemp, novaAlocacao]);
  };
  
  /**
   * Remove alocação da lista
   */
  const handleRemoverAlocacao = (index: number) => {
    const novasAlocacoes = alocacoesTemp.filter((_, i) => i !== index);
    setAlocacoesTemp(novasAlocacoes);
    
    // Notificar mudança
    onUpdate(novasAlocacoes.map(a => ({
      id: a.id,
      nome_alocacao: a.nome_alocacao,
      percentual_baseline: a.percentual_baseline
    })));
  };
  
  /**
   * Atualiza nome da alocação
   */
  const handleNomeChange = (index: number, nome: string) => {
    const novasAlocacoes = [...alocacoesTemp];
    novasAlocacoes[index].nome_alocacao = nome;
    setAlocacoesTemp(novasAlocacoes);
  };
  
  /**
   * Atualiza percentual da alocação
   */
  const handlePercentualChange = (index: number, percentual: string) => {
    const valor = parseFloat(percentual) || 0;
    const novasAlocacoes = [...alocacoesTemp];
    novasAlocacoes[index].percentual_baseline = valor;
    setAlocacoesTemp(novasAlocacoes);
  };
  
  /**
   * Ativa modo de edição para alocação
   */
  const handleEditarAlocacao = (index: number) => {
    const novasAlocacoes = [...alocacoesTemp];
    novasAlocacoes[index].isEditing = true;
    setAlocacoesTemp(novasAlocacoes);
  };
  
  /**
   * Salva edição da alocação
   */
  const handleSalvarEdicao = (index: number) => {
    const novasAlocacoes = [...alocacoesTemp];
    novasAlocacoes[index].isEditing = false;
    novasAlocacoes[index].isNew = false;
    setAlocacoesTemp(novasAlocacoes);
    
    // Notificar mudança
    onUpdate(novasAlocacoes.map(a => ({
      id: a.id,
      nome_alocacao: a.nome_alocacao,
      percentual_baseline: a.percentual_baseline
    })));
  };
  
  /**
   * Cancela edição da alocação
   */
  const handleCancelarEdicao = (index: number) => {
    const alocacao = alocacoesTemp[index];
    
    // Se é nova, remove da lista
    if (alocacao.isNew) {
      handleRemoverAlocacao(index);
      return;
    }
    
    // Se é edição, restaura valores originais
    const original = alocacoes.find(a => a.id === alocacao.id);
    if (original) {
      const novasAlocacoes = [...alocacoesTemp];
      novasAlocacoes[index] = {
        id: original.id,
        nome_alocacao: original.nome_alocacao,
        percentual_baseline: original.percentual_baseline,
        isNew: false,
        isEditing: false
      };
      setAlocacoesTemp(novasAlocacoes);
    }
  };
  
  /**
   * Renderiza linha de alocação (modo visualização)
   */
  const renderAlocacaoView = (alocacao: AlocacaoTemp, index: number) => (
    <div
      key={alocacao.id || `temp-${index}`}
      className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
    >
      <div className="flex-1">
        <div className="flex items-center gap-3">
          <span className="font-medium text-gray-900">{alocacao.nome_alocacao}</span>
          <Badge className="bg-blue-100 text-blue-800 text-sm">
            {alocacao.percentual_baseline}%
          </Badge>
        </div>
      </div>
      
      <div className="flex gap-1">
        <Button
          variant="outline"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => handleEditarAlocacao(index)}
          disabled={disabled || loading}
        >
          <Edit className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="h-8 w-8 p-0 text-red-600 hover:text-red-800"
          onClick={() => handleRemoverAlocacao(index)}
          disabled={disabled || loading}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
  
  /**
   * Renderiza linha de alocação (modo edição)
   */
  const renderAlocacaoEdit = (alocacao: AlocacaoTemp, index: number) => (
    <div
      key={alocacao.id || `temp-${index}`}
      className="p-4 border-2 border-sonda-blue rounded-lg bg-blue-50"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {/* Nome da Alocação */}
        <div className="space-y-2">
          <Label htmlFor={`nome-${index}`} className="text-sm font-medium text-gray-700">
            Nome da Alocação <span className="text-red-500">*</span>
          </Label>
          <Input
            id={`nome-${index}`}
            placeholder="Ex: Departamento TI, Projeto Alpha"
            value={alocacao.nome_alocacao}
            onChange={(e) => handleNomeChange(index, e.target.value)}
            className="focus:ring-sonda-blue focus:border-sonda-blue"
            disabled={disabled || loading}
          />
        </div>
        
        {/* Percentual */}
        <div className="space-y-2">
          <Label htmlFor={`percentual-${index}`} className="text-sm font-medium text-gray-700">
            Percentual do Baseline <span className="text-red-500">*</span>
          </Label>
          <div className="relative">
            <Input
              id={`percentual-${index}`}
              type="number"
              min="0"
              max="100"
              step="1"
              placeholder="0"
              value={alocacao.percentual_baseline || ''}
              onChange={(e) => handlePercentualChange(index, e.target.value)}
              className="focus:ring-sonda-blue focus:border-sonda-blue pr-8"
              disabled={disabled || loading}
            />
            <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500">
              %
            </span>
          </div>
        </div>
      </div>
      
      {/* Botões de ação */}
      <div className="flex justify-end gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => handleCancelarEdicao(index)}
          disabled={disabled || loading}
        >
          Cancelar
        </Button>
        <Button
          size="sm"
          className="bg-sonda-blue hover:bg-sonda-dark-blue"
          onClick={() => handleSalvarEdicao(index)}
          disabled={disabled || loading || !alocacao.nome_alocacao.trim()}
        >
          <CheckCircle2 className="h-4 w-4 mr-2" />
          Salvar
        </Button>
      </div>
    </div>
  );
  
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              Alocações Internas
            </CardTitle>
            <CardDescription className="mt-1">
              Segmente o baseline da empresa por percentual (departamento, projeto, etc.)
            </CardDescription>
          </div>
          
          <Button
            size="sm"
            className="bg-sonda-blue hover:bg-sonda-dark-blue"
            onClick={handleAdicionarAlocacao}
            disabled={disabled || loading}
          >
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Alocação
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Indicador de soma de percentuais */}
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
          <span className="text-sm font-medium text-gray-700">
            Soma dos Percentuais:
          </span>
          <div className="flex items-center gap-2">
            <Badge
              className={
                validacao.somaPercentuais === 100
                  ? 'bg-green-100 text-green-800 text-base'
                  : validacao.somaPercentuais > 100
                  ? 'bg-red-100 text-red-800 text-base'
                  : 'bg-yellow-100 text-yellow-800 text-base'
              }
            >
              {validacao.somaPercentuais}%
            </Badge>
            {validacao.somaPercentuais === 100 ? (
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            ) : (
              <AlertCircle className="h-5 w-5 text-red-600" />
            )}
          </div>
        </div>
        
        {/* Alertas de validação */}
        {!validacao.valido && validacao.erros.length > 0 && (
          <Alert className="border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-700">
              <ul className="list-disc list-inside space-y-1">
                {validacao.erros.map((erro, index) => (
                  <li key={index}>{erro}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}
        
        {/* Alerta de sucesso */}
        {validacao.valido && alocacoesTemp.length > 0 && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-700">
              Alocações válidas! A soma dos percentuais é exatamente 100%.
            </AlertDescription>
          </Alert>
        )}
        
        {/* Lista de alocações */}
        <div className="space-y-3">
          {alocacoesTemp.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <AlertCircle className="h-16 w-16 mx-auto" />
              </div>
              <p className="text-gray-500 mb-4">
                Nenhuma alocação cadastrada
              </p>
              <p className="text-sm text-gray-400 mb-4">
                Adicione alocações para segmentar o baseline da empresa
              </p>
              <Button
                className="bg-sonda-blue hover:bg-sonda-dark-blue"
                onClick={handleAdicionarAlocacao}
                disabled={disabled || loading}
              >
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Primeira Alocação
              </Button>
            </div>
          ) : (
            alocacoesTemp.map((alocacao, index) =>
              alocacao.isEditing
                ? renderAlocacaoEdit(alocacao, index)
                : renderAlocacaoView(alocacao, index)
            )
          )}
        </div>
        
        {/* Informação adicional */}
        {alocacoesTemp.length > 0 && (
          <div className="pt-4 border-t">
            <p className="text-xs text-gray-500">
              <strong>Importante:</strong> A soma dos percentuais de todas as alocações deve ser exatamente 100%.
              Os valores da visão segmentada serão calculados proporcionalmente a partir da visão consolidada.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default GerenciadorAlocacoes;
