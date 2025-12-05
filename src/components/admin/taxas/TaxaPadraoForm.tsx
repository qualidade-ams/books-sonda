import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { format } from 'date-fns';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { TipoProduto } from '@/types/taxasClientes';
import { calcularValores, getFuncoesPorProduto } from '@/types/taxasClientes';

export interface TaxaPadraoData {
  tipo_produto: TipoProduto;
  vigencia_inicio: Date | string;
  vigencia_fim?: Date | string;
  tipo_calculo_adicional?: 'normal' | 'media';
  valores_remota: {
    funcional: number;
    tecnico: number;
    abap?: number;
    dba: number;
    gestor: number;
  };
  valores_local: {
    funcional: number;
    tecnico: number;
    abap?: number;
    dba: number;
    gestor: number;
  };
}

interface TaxaPadraoFormProps {
  taxaPadrao?: TaxaPadraoData | null;
  onSubmit: (dados: TaxaPadraoData) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function TaxaPadraoForm({ taxaPadrao, onSubmit, onCancel, isLoading }: TaxaPadraoFormProps) {
  const [tipoProdutoSelecionado, setTipoProdutoSelecionado] = useState<TipoProduto>(taxaPadrao?.tipo_produto || 'GALLERY');
  const [tipoCalculoAdicional, setTipoCalculoAdicional] = useState<'normal' | 'media'>(taxaPadrao?.tipo_calculo_adicional || 'media');
  const [valoresEditando, setValoresEditando] = useState<Record<string, string>>({});
  const [valoresOriginais, setValoresOriginais] = useState<any>(null);
  
  // Função para formatar valor como moeda
  const formatarMoeda = (valor: number): string => {
    return valor.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  // Função para converter moeda para número
  const converterMoedaParaNumero = (valor: string): number => {
    const limpo = valor.replace(/[^\d,]/g, '');
    const numero = limpo.replace(',', '.');
    return parseFloat(numero) || 0;
  };
  
  const form = useForm<any>({
    defaultValues: {
      tipo_produto: 'GALLERY',
      vigencia_inicio: undefined,
      vigencia_fim: undefined,
      tipo_calculo_adicional: 'media',
      taxa_reajuste: undefined,
      valores_remota: {
        funcional: 0,
        tecnico: 0,
        abap: 0,
        dba: 0,
        gestor: 0,
      },
      valores_local: {
        funcional: 0,
        tecnico: 0,
        abap: 0,
        dba: 0,
        gestor: 0,
      },
    },
  });

  // Preencher formulário ao editar
  useEffect(() => {
    if (taxaPadrao) {
      const valoresIniciais = {
        tipo_produto: taxaPadrao.tipo_produto,
        vigencia_inicio: taxaPadrao.vigencia_inicio ? new Date(taxaPadrao.vigencia_inicio) : undefined,
        vigencia_fim: taxaPadrao.vigencia_fim ? new Date(taxaPadrao.vigencia_fim) : undefined,
        tipo_calculo_adicional: taxaPadrao.tipo_calculo_adicional || 'media',
        taxa_reajuste: undefined,
        valores_remota: taxaPadrao.valores_remota,
        valores_local: taxaPadrao.valores_local,
      };
      
      // Salvar valores originais para referência
      setValoresOriginais({
        valores_remota: { ...valoresIniciais.valores_remota },
        valores_local: { ...valoresIniciais.valores_local },
        vigencia_inicio: valoresIniciais.vigencia_inicio,
        vigencia_fim: valoresIniciais.vigencia_fim,
      });
      
      form.reset(valoresIniciais);
      setTipoProdutoSelecionado(taxaPadrao.tipo_produto);
      setTipoCalculoAdicional(taxaPadrao.tipo_calculo_adicional || 'media');
    }
  }, [taxaPadrao, form]);

  const handleSubmit = (data: any) => {
    onSubmit(data);
  };

  // Calcular valores em tempo real
  const valoresRemota = form.watch('valores_remota');
  const valoresLocal = form.watch('valores_local');
  const taxaReajuste = form.watch('taxa_reajuste');

  // Recalcular valores e vigências quando taxa de reajuste mudar (apenas em edição)
  useEffect(() => {
    if (taxaPadrao && valoresOriginais && taxaReajuste && taxaReajuste > 0) {
      const percentual = taxaReajuste / 100;
      
      // Recalcular valores remotos
      const novosValoresRemota = {
        funcional: valoresOriginais.valores_remota.funcional + (valoresOriginais.valores_remota.funcional * percentual),
        tecnico: valoresOriginais.valores_remota.tecnico + (valoresOriginais.valores_remota.tecnico * percentual),
        abap: (valoresOriginais.valores_remota.abap || 0) + ((valoresOriginais.valores_remota.abap || 0) * percentual),
        dba: valoresOriginais.valores_remota.dba + (valoresOriginais.valores_remota.dba * percentual),
        gestor: valoresOriginais.valores_remota.gestor + (valoresOriginais.valores_remota.gestor * percentual),
      };
      
      // Recalcular valores locais
      const novosValoresLocal = {
        funcional: valoresOriginais.valores_local.funcional + (valoresOriginais.valores_local.funcional * percentual),
        tecnico: valoresOriginais.valores_local.tecnico + (valoresOriginais.valores_local.tecnico * percentual),
        abap: (valoresOriginais.valores_local.abap || 0) + ((valoresOriginais.valores_local.abap || 0) * percentual),
        dba: valoresOriginais.valores_local.dba + (valoresOriginais.valores_local.dba * percentual),
        gestor: valoresOriginais.valores_local.gestor + (valoresOriginais.valores_local.gestor * percentual),
      };
      
      // Recalcular vigências
      const dataFimOriginal = valoresOriginais.vigencia_fim || valoresOriginais.vigencia_inicio;
      if (dataFimOriginal) {
        const novaDataInicio = new Date(dataFimOriginal);
        novaDataInicio.setDate(novaDataInicio.getDate() + 1);
        
        const novaDataFim = new Date(novaDataInicio);
        novaDataFim.setFullYear(novaDataFim.getFullYear() + 1);
        novaDataFim.setDate(novaDataFim.getDate() - 1);
        
        form.setValue('vigencia_inicio', novaDataInicio);
        form.setValue('vigencia_fim', novaDataFim);
      }
      
      // Atualizar valores no formulário
      form.setValue('valores_remota', novosValoresRemota);
      form.setValue('valores_local', novosValoresLocal);
    } else if (taxaPadrao && valoresOriginais && (!taxaReajuste || taxaReajuste === 0)) {
      // Se taxa de reajuste for zerada, restaurar valores originais
      form.setValue('valores_remota', valoresOriginais.valores_remota);
      form.setValue('valores_local', valoresOriginais.valores_local);
      form.setValue('vigencia_inicio', valoresOriginais.vigencia_inicio);
      form.setValue('vigencia_fim', valoresOriginais.vigencia_fim);
    }
  }, [taxaReajuste, taxaPadrao, valoresOriginais, form]);

  const calcularValoresExibicao = (valores: any) => {
    const funcoes = getFuncoesPorProduto(tipoProdutoSelecionado);
    const resultado: any = {};

    funcoes.forEach(funcao => {
      let valorBase = 0;
      
      if (funcao === 'Funcional') {
        valorBase = valores.funcional || 0;
      } else if (funcao === 'Técnico / ABAP' || funcao === 'Técnico (Instalação / Atualização)') {
        valorBase = valores.tecnico || 0;
      } else if (funcao === 'ABAP - PL/SQL') {
        valorBase = valores.abap || 0;
      } else if (funcao === 'DBA / Basis' || funcao === 'DBA') {
        valorBase = valores.dba || 0;
      } else if (funcao === 'Gestor') {
        valorBase = valores.gestor || 0;
      }

      const todasFuncoes = funcoes.map(f => {
        let vb = 0;
        if (f === 'Funcional') vb = valores.funcional || 0;
        else if (f === 'Técnico / ABAP' || f === 'Técnico (Instalação / Atualização)') vb = valores.tecnico || 0;
        else if (f === 'ABAP - PL/SQL') vb = valores.abap || 0;
        else if (f === 'DBA / Basis' || f === 'DBA') vb = valores.dba || 0;
        else if (f === 'Gestor') vb = valores.gestor || 0;
        return { funcao: f, valor_base: vb };
      });

      resultado[funcao] = calcularValores(valorBase, funcao, todasFuncoes, tipoCalculoAdicional, tipoProdutoSelecionado);
    });

    return resultado;
  };

  const valoresCalculadosRemota = calcularValoresExibicao(valoresRemota);
  const valoresCalculadosLocal = calcularValoresExibicao(valoresLocal);

  const funcoes = getFuncoesPorProduto(tipoProdutoSelecionado);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {/* Configuração */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Configuração</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="tipo_produto"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Produto *</FormLabel>
                  <Select
                    onValueChange={(value) => {
                      field.onChange(value);
                      setTipoProdutoSelecionado(value as TipoProduto);
                    }}
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo de produto" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="GALLERY">GALLERY</SelectItem>
                      <SelectItem value="OUTROS">COMEX, FISCAL</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="tipo_calculo_adicional"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo de Cálculo - Hora Adicional</FormLabel>
                  <Select
                    onValueChange={(value) => {
                      field.onChange(value);
                      setTipoCalculoAdicional(value as 'normal' | 'media');
                    }}
                    value={field.value}
                    defaultValue="media"
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue>
                          {field.value === 'normal' ? 'Normal (Valor Base + 15%)' : 'Média (Cálculo por Média)'}
                        </SelectValue>
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="normal">Normal (Valor Base + 15%)</SelectItem>
                      <SelectItem value="media">Média (Cálculo por Média)</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="vigencia_inicio"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Vigência Início *</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      value={field.value ? format(field.value, 'yyyy-MM-dd') : ''}
                      onChange={(e) => {
                        const date = e.target.value ? new Date(e.target.value + 'T00:00:00') : undefined;
                        field.onChange(date);
                        // Sempre que a data início mudar, atualizar a data fim para 1 ano - 1 dia
                        if (date) {
                          // Criar nova data para data fim
                          const dataFim = new Date(date.getTime());
                          // Adicionar 1 ano e subtrair 1 dia
                          dataFim.setFullYear(dataFim.getFullYear() + 1);
                          dataFim.setDate(dataFim.getDate() - 1);
                          form.setValue('vigencia_fim', dataFim);
                        }
                      }}
                      disabled={isLoading}
                      min="2020-01-01"
                      max="2030-12-31"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="vigencia_fim"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Vigência Fim</FormLabel>
                  <FormControl>
                    <Input
                      type="date"
                      value={field.value ? format(field.value, 'yyyy-MM-dd') : ''}
                      onChange={(e) => {
                        const date = e.target.value ? new Date(e.target.value + 'T00:00:00') : undefined;
                        field.onChange(date);
                      }}
                      disabled={isLoading}
                      min="2020-01-01"
                      max="2030-12-31"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Campo de Taxa de Reajuste - Apenas ao editar */}
          {taxaPadrao && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="taxa_reajuste"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Taxa de Reajuste (%)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="Ex: 5.5"
                        {...field}
                        onChange={(e) => {
                          const valor = e.target.value ? parseFloat(e.target.value) : undefined;
                          field.onChange(valor);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          )}
        </div>

        {/* Tabela de Valores Remotos */}
        <div className="space-y-3">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">Valores Hora Remota</h3>
          
          <div className="overflow-x-auto rounded-lg border-gray-200 dark:border-gray-700">
            <table className="w-full border-collapse table-fixed">
              <colgroup>
                <col style={{ width: '200px' }} />
                <col style={{ width: '150px' }} />
                <col style={{ width: '150px' }} />
                <col style={{ width: '150px' }} />
                <col style={{ width: '150px' }} />
                <col style={{ width: '150px' }} />
                <col style={{ width: '130px' }} />
              </colgroup>
              <thead>
                <tr className="bg-[#0066FF] text-white">
                  <th className="border-r border-white/20 px-3 py-2.5 text-left text-xs font-semibold">Função</th>
                  <th className="border-r border-white/20 px-3 py-2.5 text-center text-xs font-semibold">Seg-Sex<br/>08h30-17h30</th>
                  <th className="border-r border-white/20 px-3 py-2.5 text-center text-xs font-semibold">Seg-Sex<br/>17h30-19h30</th>
                  <th className="border-r border-white/20 px-3 py-2.5 text-center text-xs font-semibold">Seg-Sex<br/>Após 19h30</th>
                  <th className="border-r border-white/20 px-3 py-2.5 text-center text-xs font-semibold">Sáb/Dom/<br/>Feriados</th>
                  <th className="border-r border-white/20 px-3 py-2.5 text-center text-xs font-semibold">Hora Adicional <br/>(Excedente do Banco)</th>
                  <th className="px-3 py-2.5 text-center text-xs font-semibold">Stand<br/>By</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800">
                {funcoes.map((funcao, index) => {
                  const valores = valoresCalculadosRemota[funcao];
                  const campoNome = funcao === 'Funcional' ? 'funcional' 
                    : (funcao === 'Técnico / ABAP' || funcao === 'Técnico (Instalação / Atualização)') ? 'tecnico'
                    : funcao === 'ABAP - PL/SQL' ? 'abap'
                    : (funcao === 'DBA / Basis' || funcao === 'DBA') ? 'dba'
                    : 'gestor';

                  return (
                    <tr key={funcao} className={index % 2 === 0 ? 'bg-gray-50 dark:bg-gray-900/50' : 'bg-white dark:bg-gray-800'}>
                      <td className="border-r border-gray-200 dark:border-gray-700 px-3 py-2 text-xs font-medium text-gray-900 dark:text-white">{funcao}</td>
                      <td className="border-r border-gray-200 dark:border-gray-700 px-2 py-2">
                        <FormField
                          control={form.control}
                          name={`valores_remota.${campoNome}`}
                          render={({ field }) => {
                            const fieldKey = `remota_${campoNome}`;
                            const isEditing = valoresEditando[fieldKey] !== undefined;
                            
                            return (
                              <Input
                                type="text"
                                value={isEditing ? valoresEditando[fieldKey] : formatarMoeda(field.value || 0)}
                                onChange={(e) => {
                                  setValoresEditando({ ...valoresEditando, [fieldKey]: e.target.value });
                                }}
                                onFocus={(e) => {
                                  e.target.select();
                                  setValoresEditando({ ...valoresEditando, [fieldKey]: formatarMoeda(field.value || 0) });
                                }}
                                onBlur={(e) => {
                                  const valor = converterMoedaParaNumero(e.target.value);
                                  field.onChange(valor);
                                  const newValues = { ...valoresEditando };
                                  delete newValues[fieldKey];
                                  setValoresEditando(newValues);
                                }}
                                className="text-right text-xs h-8 pr-3"
                                placeholder="0,00"
                              />
                            );
                          }}
                        />
                      </td>
                      <td className="border-r border-gray-200 dark:border-gray-700 px-3 py-2 text-center text-xs text-gray-700 dark:text-gray-300 bg-blue-50 dark:bg-blue-900/20">
                        R$ {formatarMoeda(valores?.valor_17h30_19h30 || 0)}
                      </td>
                      <td className="border-r border-gray-200 dark:border-gray-700 px-3 py-2 text-center text-xs text-gray-700 dark:text-gray-300 bg-blue-50 dark:bg-blue-900/20">
                        R$ {formatarMoeda(valores?.valor_apos_19h30 || 0)}
                      </td>
                      <td className="border-r border-gray-200 dark:border-gray-700 px-3 py-2 text-center text-xs text-gray-700 dark:text-gray-300 bg-blue-50 dark:bg-blue-900/20">
                        R$ {formatarMoeda(valores?.valor_fim_semana || 0)}
                      </td>
                      <td className="border-r border-gray-200 dark:border-gray-700 px-3 py-2 text-center text-xs text-gray-700 dark:text-gray-300 bg-blue-50 dark:bg-blue-900/20">
                        R$ {formatarMoeda(valores?.valor_adicional || 0)}
                      </td>
                      <td className="px-3 py-2 text-center text-xs text-gray-700 dark:text-gray-300 bg-blue-50 dark:bg-blue-900/20">
                        R$ {formatarMoeda(valores?.valor_standby || 0)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Tabela de Valores Locais */}
        <div className="space-y-3">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">Valores Hora Local</h3>
          
          <div className="rounded-lg border-gray-200 dark:border-gray-700 overflow-hidden">
            <table className="w-full border-collapse table-fixed">
              <colgroup>
                <col style={{ width: '200px' }} />
                <col style={{ width: '150px' }} />
                <col style={{ width: '150px' }} />
                <col style={{ width: '150px' }} />
                <col style={{ width: '150px' }} />
                <col style={{ width: '280px' }} />
              </colgroup>
              <thead>
                <tr className="bg-[#0066FF] text-white">
                  <th className="border-r border-white/20 px-3 py-2.5 text-left text-xs font-semibold rounded-tl-lg">Função</th>
                  <th className="border-r border-white/20 px-3 py-2.5 text-center text-xs font-semibold">Seg-Sex<br/>08h30-17h30</th>
                  <th className="border-r border-white/20 px-3 py-2.5 text-center text-xs font-semibold">Seg-Sex<br/>17h30-19h30</th>
                  <th className="border-r border-white/20 px-3 py-2.5 text-center text-xs font-semibold">Seg-Sex<br/>Após 19h30</th>
                  <th className="px-3 py-2.5 text-center text-xs font-semibold rounded-tr-lg">Sáb/Dom/<br/>Feriados</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800">
                {funcoes.map((funcao, index) => {
                  const valores = valoresCalculadosLocal[funcao];
                  const campoNome = funcao === 'Funcional' ? 'funcional' 
                    : (funcao === 'Técnico / ABAP' || funcao === 'Técnico (Instalação / Atualização)') ? 'tecnico'
                    : funcao === 'ABAP - PL/SQL' ? 'abap'
                    : (funcao === 'DBA / Basis' || funcao === 'DBA') ? 'dba'
                    : 'gestor';

                  return (
                    <tr key={funcao} className={index % 2 === 0 ? 'bg-gray-50 dark:bg-gray-900/50' : 'bg-white dark:bg-gray-800'}>
                      <td className="border-r border-gray-200 dark:border-gray-700 px-3 py-2 text-xs font-medium text-gray-900 dark:text-white">{funcao}</td>
                      <td className="border-r border-gray-200 dark:border-gray-700 px-2 py-2">
                        <FormField
                          control={form.control}
                          name={`valores_local.${campoNome}`}
                          render={({ field }) => {
                            const fieldKey = `local_${campoNome}`;
                            const isEditing = valoresEditando[fieldKey] !== undefined;
                            
                            return (
                              <Input
                                type="text"
                                value={isEditing ? valoresEditando[fieldKey] : formatarMoeda(field.value || 0)}
                                onChange={(e) => {
                                  setValoresEditando({ ...valoresEditando, [fieldKey]: e.target.value });
                                }}
                                onFocus={(e) => {
                                  e.target.select();
                                  setValoresEditando({ ...valoresEditando, [fieldKey]: formatarMoeda(field.value || 0) });
                                }}
                                onBlur={(e) => {
                                  const valor = converterMoedaParaNumero(e.target.value);
                                  field.onChange(valor);
                                  const newValues = { ...valoresEditando };
                                  delete newValues[fieldKey];
                                  setValoresEditando(newValues);
                                }}
                                className="text-right text-xs h-8 pr-3"
                                placeholder="0,00"
                              />
                            );
                          }}
                        />
                      </td>
                      <td className="border-r border-gray-200 dark:border-gray-700 px-3 py-2 text-center text-xs text-gray-700 dark:text-gray-300 bg-blue-50 dark:bg-blue-900/20">
                        R$ {formatarMoeda(valores?.valor_17h30_19h30 || 0)}
                      </td>
                      <td className="border-r border-gray-200 dark:border-gray-700 px-3 py-2 text-center text-xs text-gray-700 dark:text-gray-300 bg-blue-50 dark:bg-blue-900/20">
                        R$ {formatarMoeda(valores?.valor_apos_19h30 || 0)}
                      </td>
                      <td className={`px-3 py-2 text-center text-xs text-gray-700 dark:text-gray-300 bg-blue-50 dark:bg-blue-900/20 ${index === funcoes.length - 1 ? 'rounded-br-lg' : ''}`}>
                        R$ {formatarMoeda(valores?.valor_fim_semana || 0)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Botões */}
        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Salvando...' : 'Salvar Taxa Padrão'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
