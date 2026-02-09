import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Plus, Trash2, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import type { EmpresaFormData, EmpresaSegmentada, FILTRO_TIPOS_OPTIONS } from '@/types/clientBooksTypes';
import { FILTRO_TIPOS_OPTIONS as FILTRO_OPTIONS } from '@/types/clientBooksTypes';

interface SegmentacaoBaselineFormProps {
  form: UseFormReturn<EmpresaFormData>;
  isFieldDisabled: boolean;
}

export const SegmentacaoBaselineForm: React.FC<SegmentacaoBaselineFormProps> = ({
  form,
  isFieldDisabled,
}) => {
  const watchBaselineSegmentado = form.watch('baselineSegmentado');
  const watchSegmentacaoConfig = form.watch('segmentacaoConfig');

  // Adicionar nova empresa segmentada
  const adicionarEmpresa = () => {
    const empresasAtuais = watchSegmentacaoConfig?.empresas || [];
    const novaEmpresa: EmpresaSegmentada = {
      nome: '',
      percentual: 0,
      filtro_tipo: 'contem',
      filtro_valor: '',
      ordem: empresasAtuais.length + 1,
    };

    form.setValue('segmentacaoConfig', {
      empresas: [...empresasAtuais, novaEmpresa],
    });
  };

  // Remover empresa segmentada
  const removerEmpresa = (index: number) => {
    const empresasAtuais = watchSegmentacaoConfig?.empresas || [];
    const novasEmpresas = empresasAtuais.filter((_, i) => i !== index);
    
    // Reordenar
    novasEmpresas.forEach((empresa, i) => {
      empresa.ordem = i + 1;
    });

    form.setValue('segmentacaoConfig', {
      empresas: novasEmpresas,
    });
  };

  // Atualizar campo de uma empresa específica
  const atualizarEmpresa = (index: number, campo: keyof EmpresaSegmentada, valor: any) => {
    const empresasAtuais = watchSegmentacaoConfig?.empresas || [];
    const novasEmpresas = [...empresasAtuais];
    novasEmpresas[index] = {
      ...novasEmpresas[index],
      [campo]: valor,
    };

    form.setValue('segmentacaoConfig', {
      empresas: novasEmpresas,
    });
  };

  // Calcular total de percentuais
  const calcularTotalPercentual = (): number => {
    const empresas = watchSegmentacaoConfig?.empresas || [];
    return empresas.reduce((total, empresa) => total + (empresa.percentual || 0), 0);
  };

  const totalPercentual = calcularTotalPercentual();
  const percentualValido = totalPercentual === 100;

  return (
    <div className="space-y-6">
      {/* Switch para ativar/desativar segmentação */}
      <FormField
        control={form.control}
        name="baselineSegmentado"
        render={({ field }) => (
          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <FormLabel className="text-base font-medium">
                Baseline Segmentado
              </FormLabel>
              <FormDescription>
                Ative para dividir o baseline entre múltiplas empresas com base em filtros de item_configuracao
              </FormDescription>
            </div>
            <FormControl>
              <Switch
                checked={field.value}
                onCheckedChange={field.onChange}
                disabled={isFieldDisabled}
              />
            </FormControl>
          </FormItem>
        )}
      />

      {/* Configuração de empresas segmentadas */}
      {watchBaselineSegmentado && (
        <div className="space-y-4">
          {/* Alert de validação de percentual */}
          {watchSegmentacaoConfig?.empresas && watchSegmentacaoConfig.empresas.length > 0 && (
            <Alert className={percentualValido ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
              <AlertCircle className={`h-4 w-4 ${percentualValido ? 'text-green-600' : 'text-red-600'}`} />
              <AlertDescription className={percentualValido ? 'text-green-700' : 'text-red-700'}>
                {percentualValido ? (
                  <span className="font-semibold">✅ Total: {totalPercentual}% - Configuração válida!</span>
                ) : (
                  <span className="font-semibold">
                    ⚠️ Total: {totalPercentual}% - A soma deve ser exatamente 100%
                  </span>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* Lista de empresas segmentadas */}
          {watchSegmentacaoConfig?.empresas?.map((empresa, index) => (
            <Card key={index}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-medium">
                    Empresa {index + 1}
                  </CardTitle>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => removerEmpresa(index)}
                    disabled={isFieldDisabled}
                    className="h-8 w-8 p-0 text-red-600 hover:text-red-800"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Nome da Empresa */}
                <div>
                  <FormLabel className="text-sm font-medium text-gray-700">
                    Nome da Empresa *
                  </FormLabel>
                  <Input
                    placeholder="Ex: NÍQUEL, IOB"
                    value={empresa.nome}
                    onChange={(e) => atualizarEmpresa(index, 'nome', e.target.value.toUpperCase())}
                    disabled={isFieldDisabled}
                    className="focus:ring-sonda-blue focus:border-sonda-blue mt-2"
                  />
                </div>

                {/* Percentual do Baseline */}
                <div>
                  <FormLabel className="text-sm font-medium text-gray-700">
                    Percentual do Baseline *
                  </FormLabel>
                  <div className="relative mt-2">
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      placeholder="Ex: 60"
                      value={empresa.percentual || ''}
                      onChange={(e) => atualizarEmpresa(index, 'percentual', parseFloat(e.target.value) || 0)}
                      disabled={isFieldDisabled}
                      className="focus:ring-sonda-blue focus:border-sonda-blue pr-8"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
                      %
                    </span>
                  </div>
                </div>

                {/* Tipo de Filtro */}
                <div>
                  <FormLabel className="text-sm font-medium text-gray-700">
                    Tipo de Filtro *
                  </FormLabel>
                  <Select
                    value={empresa.filtro_tipo}
                    onValueChange={(value) => atualizarEmpresa(index, 'filtro_tipo', value)}
                    disabled={isFieldDisabled}
                  >
                    <SelectTrigger className="focus:ring-sonda-blue focus:border-sonda-blue mt-2">
                      <SelectValue placeholder="Selecione o tipo de filtro" />
                    </SelectTrigger>
                    <SelectContent>
                      {FILTRO_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Valor do Filtro */}
                <div>
                  <FormLabel className="text-sm font-medium text-gray-700">
                    Valor do Filtro *
                  </FormLabel>
                  <Input
                    placeholder="Ex: NIQUEL"
                    value={empresa.filtro_valor}
                    onChange={(e) => atualizarEmpresa(index, 'filtro_valor', e.target.value.toUpperCase())}
                    disabled={isFieldDisabled}
                    className="focus:ring-sonda-blue focus:border-sonda-blue mt-2"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Palavra-chave para filtrar registros pelo campo item_configuracao
                  </p>
                </div>
              </CardContent>
            </Card>
          ))}

          {/* Botão para adicionar nova empresa */}
          <Button
            type="button"
            variant="outline"
            onClick={adicionarEmpresa}
            disabled={isFieldDisabled}
            className="w-full border-dashed border-2 hover:border-sonda-blue hover:bg-sonda-blue/5"
          >
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Empresa Segmentada
          </Button>
        </div>
      )}
    </div>
  );
};
