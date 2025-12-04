import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { CalendarIcon } from 'lucide-react';

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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { useEmpresas } from '@/hooks/useEmpresas';
import type { TaxaClienteCompleta, TaxaFormData, TipoProduto } from '@/types/taxasClientes';
import { calcularValores, getFuncoesPorProduto } from '@/types/taxasClientes';

interface TaxaFormProps {
  taxa?: TaxaClienteCompleta | null;
  onSubmit: (dados: TaxaFormData) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function TaxaForm({ taxa, onSubmit, onCancel, isLoading }: TaxaFormProps) {
  const { empresas } = useEmpresas();
  const [tipoProdutoSelecionado, setTipoProdutoSelecionado] = useState<TipoProduto>(taxa?.tipo_produto || 'GALLERY');
  const [produtosCliente, setProdutosCliente] = useState<string[]>([]);
  const [clienteSelecionado, setClienteSelecionado] = useState<string>('');
  const [valoresEditando, setValoresEditando] = useState<Record<string, string>>({});
  
  // Função para formatar valor como moeda
  const formatarMoeda = (valor: number): string => {
    return valor.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  // Função para converter moeda para número
  const converterMoedaParaNumero = (valor: string): number => {
    // Remove tudo exceto números, vírgula e ponto
    const limpo = valor.replace(/[^\d,]/g, '');
    const numero = limpo.replace(',', '.');
    return parseFloat(numero) || 0;
  };
  
  const form = useForm<any>({
    defaultValues: {
      cliente_id: '',
      vigencia_inicio: undefined,
      vigencia_fim: undefined,
      tipo_produto: 'GALLERY',
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

  // Buscar produtos do cliente selecionado
  useEffect(() => {
    if (clienteSelecionado) {
      const empresa = empresas.find(e => e.nome_abreviado === clienteSelecionado);
      if (empresa && empresa.produtos) {
        // Extrair lista de produtos da empresa
        const produtos = empresa.produtos.map((p: any) => p.produto);
        setProdutosCliente(produtos);
        
        // Se houver apenas um produto, selecionar automaticamente
        if (produtos.length === 1) {
          const produtoUnico = produtos[0];
          const tipoProduto = produtoUnico === 'GALLERY' ? 'GALLERY' : 'OUTROS';
          form.setValue('tipo_produto', tipoProduto);
          setTipoProdutoSelecionado(tipoProduto);
        }
      } else {
        setProdutosCliente([]);
      }
    }
  }, [clienteSelecionado, empresas, form]);

  // Preencher formulário ao editar
  useEffect(() => {
    if (taxa && empresas.length > 0) {
      const empresa = empresas.find(e => e.id === taxa.cliente_id);
      
      if (empresa) {
        // Carregar produtos do cliente PRIMEIRO
        if (empresa.produtos) {
          const produtos = empresa.produtos.map((p: any) => p.produto);
          setProdutosCliente(produtos);
        }
        setClienteSelecionado(empresa.nome_abreviado);
        
        // Aguardar um tick para garantir que os estados foram atualizados
        setTimeout(() => {
          form.reset({
            cliente_id: empresa.nome_abreviado,
            vigencia_inicio: taxa.vigencia_inicio ? new Date(taxa.vigencia_inicio + 'T00:00:00') : undefined,
            vigencia_fim: taxa.vigencia_fim ? new Date(taxa.vigencia_fim + 'T00:00:00') : undefined,
            tipo_produto: taxa.tipo_produto,
            valores_remota: {
              funcional: taxa.valores_remota?.find(v => v.funcao === 'Funcional')?.valor_base || 0,
              tecnico: taxa.valores_remota?.find(v => 
                v.funcao === 'Técnico / ABAP' || v.funcao === 'Técnico (Instalação / Atualização)'
              )?.valor_base || 0,
              abap: taxa.valores_remota?.find(v => v.funcao === 'ABAP - PL/SQL')?.valor_base || 0,
              dba: taxa.valores_remota?.find(v => 
                v.funcao === 'DBA / Basis' || v.funcao === 'DBA'
              )?.valor_base || 0,
              gestor: taxa.valores_remota?.find(v => v.funcao === 'Gestor')?.valor_base || 0,
            },
            valores_local: {
              funcional: taxa.valores_local?.find(v => v.funcao === 'Funcional')?.valor_base || 0,
              tecnico: taxa.valores_local?.find(v => 
                v.funcao === 'Técnico / ABAP' || v.funcao === 'Técnico (Instalação / Atualização)'
              )?.valor_base || 0,
              abap: taxa.valores_local?.find(v => v.funcao === 'ABAP - PL/SQL')?.valor_base || 0,
              dba: taxa.valores_local?.find(v => 
                v.funcao === 'DBA / Basis' || v.funcao === 'DBA'
              )?.valor_base || 0,
              gestor: taxa.valores_local?.find(v => v.funcao === 'Gestor')?.valor_base || 0,
            },
          });
          
          setTipoProdutoSelecionado(taxa.tipo_produto);
        }, 0);
      }
    }
  }, [taxa, empresas, form]);

  const handleSubmit = (data: any) => {
    // Encontrar ID da empresa pelo nome abreviado
    const empresa = empresas.find(e => e.nome_abreviado === data.cliente_id);
    
    if (!empresa) {
      form.setError('cliente_id', { message: 'Cliente não encontrado' });
      return;
    }

    const dadosFormatados: TaxaFormData = {
      cliente_id: empresa.id,
      vigencia_inicio: data.vigencia_inicio,
      vigencia_fim: data.vigencia_fim || undefined,
      tipo_produto: data.tipo_produto,
      valores_remota: data.valores_remota,
      valores_local: data.valores_local,
    };

    onSubmit(dadosFormatados);
  };

  // Calcular valores em tempo real
  const valoresRemota = form.watch('valores_remota');
  const valoresLocal = form.watch('valores_local');

  const calcularValoresExibicao = (valores: any, tipo: 'remota' | 'local') => {
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

      // Preparar array com todas as funções para cálculo da média
      const todasFuncoes = funcoes.map(f => {
        let vb = 0;
        if (f === 'Funcional') vb = valores.funcional || 0;
        else if (f === 'Técnico / ABAP' || f === 'Técnico (Instalação / Atualização)') vb = valores.tecnico || 0;
        else if (f === 'ABAP - PL/SQL') vb = valores.abap || 0;
        else if (f === 'DBA / Basis' || f === 'DBA') vb = valores.dba || 0;
        else if (f === 'Gestor') vb = valores.gestor || 0;
        return { funcao: f, valor_base: vb };
      });

      resultado[funcao] = calcularValores(valorBase, funcao, todasFuncoes);
    });

    return resultado;
  };

  const valoresCalculadosRemota = calcularValoresExibicao(valoresRemota, 'remota');
  const valoresCalculadosLocal = calcularValoresExibicao(valoresLocal, 'local');

  const funcoes = getFuncoesPorProduto(tipoProdutoSelecionado);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {/* Dados Principais */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Dados Principais</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="cliente_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cliente *</FormLabel>
                  <Select
                    onValueChange={(value) => {
                      field.onChange(value);
                      setClienteSelecionado(value);
                    }}
                    value={field.value}
                    disabled={!!taxa}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o cliente">
                          {field.value || "Selecione o cliente"}
                        </SelectValue>
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {empresas
                        .sort((a, b) => a.nome_abreviado.localeCompare(b.nome_abreviado))
                        .map((empresa) => (
                          <SelectItem key={empresa.id} value={empresa.nome_abreviado}>
                            {empresa.nome_abreviado}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

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
                    disabled={!clienteSelecionado || produtosCliente.length === 0}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder={
                          !clienteSelecionado 
                            ? "Selecione um cliente primeiro" 
                            : produtosCliente.length === 0 
                              ? "Cliente sem produtos cadastrados"
                              : "Selecione o produto"
                        }>
                          {field.value === 'GALLERY' ? 'GALLERY' : field.value === 'OUTROS' ? produtosCliente.filter(p => p !== 'GALLERY').join(', ') : ''}
                        </SelectValue>
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {produtosCliente.includes('GALLERY') && (
                        <SelectItem value="GALLERY">GALLERY</SelectItem>
                      )}
                      {produtosCliente.some(p => p !== 'GALLERY') && (
                        <SelectItem value="OUTROS">
                          {produtosCliente.filter(p => p !== 'GALLERY').join(', ')}
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                  {clienteSelecionado && produtosCliente.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Produtos do cliente: {produtosCliente.join(', ')}
                    </p>
                  )}
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="vigencia_inicio"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Vigência Início *</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className="w-full pl-3 text-left font-normal"
                        >
                          {field.value ? (
                            format(field.value, 'dd/MM/yyyy', { locale: ptBR })
                          ) : (
                            <span>Selecione a data</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        locale={ptBR}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="vigencia_fim"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Vigência Fim</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className="w-full pl-3 text-left font-normal"
                        >
                          {field.value ? (
                            format(field.value, 'dd/MM/yyyy', { locale: ptBR })
                          ) : (
                            <span>Sem data fim (vigência indefinida)</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={field.onChange}
                        locale={ptBR}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
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
            {isLoading ? 'Salvando...' : taxa ? 'Atualizar' : 'Criar'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
