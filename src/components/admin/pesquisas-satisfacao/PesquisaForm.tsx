/**
 * Formulário de cadastro/edição de pesquisas
 */

import { useEffect } from 'react';
import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

import { getPesquisaFormSchema } from '@/schemas/pesquisasSatisfacaoSchemas';
import type { PesquisaFormData, Pesquisa } from '@/types/pesquisasSatisfacao';
import { MESES_OPTIONS } from '@/types/pesquisasSatisfacao';
import { useEmpresas } from '@/hooks/useEmpresas';
import { useCategorias, useGruposPorCategoria } from '@/hooks/useDeParaCategoria';
import { MultiSelectEspecialistas } from '@/components/ui/multi-select-especialistas';
import { useEspecialistasIdsPesquisa } from '@/hooks/useEspecialistasRelacionamentos';
import { useCorrelacaoMultiplosEspecialistas } from '@/hooks/useCorrelacaoEspecialistas';

interface PesquisaFormProps {
  pesquisa?: Pesquisa | null;
  onSubmit: (dados: PesquisaFormData) => void;
  onCancel: () => void;
  isLoading?: boolean;
  showSolicitante?: boolean; // Controla se o campo Solicitante deve ser exibido
}

export function PesquisaForm({ pesquisa, onSubmit, onCancel, isLoading, showSolicitante = true }: PesquisaFormProps) {
  // Buscar empresas para o select
  const { empresas } = useEmpresas();
  
  // Buscar categorias e grupos da tabela DE-PARA
  const { data: categorias = [] } = useCategorias();

  // Estado para armazenar consultores manuais
  const [consultoresManuais, setConsultoresManuais] = React.useState<Array<{ label: string; value: string; email?: string }>>([]);

  // Determinar se é pesquisa manual (nova pesquisa ou pesquisa existente com origem manual)
  const isPesquisaManual = !pesquisa || pesquisa.origem === 'manual';

  const form = useForm<PesquisaFormData>({
    resolver: zodResolver(getPesquisaFormSchema(isPesquisaManual)),
    defaultValues: {
      empresa: '',
      cliente: '',
      categoria: '', // Mudado de undefined para string vazia
      grupo: undefined,
      email_cliente: '',
      prestador: '',
      solicitante: '',
      nro_caso: '',
      tipo_caso: undefined,
      data_resposta: undefined, // Vem em branco
      resposta: undefined,
      comentario_pesquisa: '',
      observacao: '',
      especialistas_ids: []
    }
  });

  // Observar mudanças na categoria selecionada
  const categoriaSelecionada = form.watch('categoria');
  
  // Buscar grupos baseado na categoria selecionada
  const { data: grupos = [] } = useGruposPorCategoria(categoriaSelecionada);

  // Buscar especialistas relacionados à pesquisa (para edição)
  const especialistasIdsRelacionados = useEspecialistasIdsPesquisa(pesquisa?.id);
  
  console.log('🔍 [PesquisaForm] === DADOS DE ESPECIALISTAS ===');
  console.log('🔍 [PesquisaForm] Pesquisa ID:', pesquisa?.id);
  console.log('🔍 [PesquisaForm] Prestador:', pesquisa?.prestador);
  console.log('🔍 [PesquisaForm] IDs Relacionados (do banco):', especialistasIdsRelacionados);
  console.log('🔍 [PesquisaForm] Quantidade de IDs Relacionados:', especialistasIdsRelacionados.length);
  
  // Correlação automática baseada no campo prestador
  const { data: especialistasIdsCorrelacionados = [] } = useCorrelacaoMultiplosEspecialistas(
    pesquisa?.prestador && especialistasIdsRelacionados.length === 0 ? pesquisa.prestador : undefined
  );
  
  console.log('🔍 [PesquisaForm] IDs Correlacionados (automático):', especialistasIdsCorrelacionados);
  console.log('🔍 [PesquisaForm] Quantidade de IDs Correlacionados:', especialistasIdsCorrelacionados.length);
  
  // Usar relacionamentos salvos ou correlação automática - GARANTIR UNICIDADE
  const especialistasIdsUnicos = [...new Set(
    especialistasIdsRelacionados.length > 0 
      ? especialistasIdsRelacionados 
      : especialistasIdsCorrelacionados
  )];
  
  console.log('🔍 [PesquisaForm] IDs Únicos (após Set):', especialistasIdsUnicos);
  console.log('🔍 [PesquisaForm] Quantidade de IDs Únicos:', especialistasIdsUnicos.length);
  console.log('🔍 [PesquisaForm] === FIM DADOS DE ESPECIALISTAS ===');
  
  const especialistasIds = especialistasIdsUnicos;

  // Opções de tipo de chamado
  const tiposChamado = [
    { value: 'IM', label: 'IM - Incidente' },
    { value: 'PR', label: 'PR - Problema' },
    { value: 'RF', label: 'RF - Requisição' }
  ];

  // Opções de resposta
  const opcoesResposta = [
    { value: 'Muito Satisfeito', label: 'Muito Satisfeito' },
    { value: 'Satisfeito', label: 'Satisfeito' },
    { value: 'Neutro', label: 'Neutro' },
    { value: 'Insatisfeito', label: 'Insatisfeito' },
    { value: 'Muito Insatisfeito', label: 'Muito Insatisfeito' }
  ];

  // Preencher formulário ao editar (sem especialistas)
  useEffect(() => {
    if (pesquisa && empresas.length > 0 && !form.formState.isDirty) {
      // Tentar encontrar a empresa pelo nome completo ou abreviado
      const empresaEncontrada = empresas.find(
        e => e.nome_completo === pesquisa.empresa || e.nome_abreviado === pesquisa.empresa
      );
      
      // Usar o nome_completo se encontrou, senão usar o valor original
      const empresaValue = empresaEncontrada ? empresaEncontrada.nome_completo : pesquisa.empresa;
      
      form.reset({
        empresa: empresaValue || '',
        cliente: pesquisa.cliente,
        categoria: pesquisa.categoria || undefined,
        grupo: pesquisa.grupo || undefined,
        email_cliente: pesquisa.email_cliente || '',
        prestador: pesquisa.prestador || '',
        solicitante: pesquisa.solicitante || '',
        nro_caso: pesquisa.nro_caso || '',
        tipo_caso: pesquisa.tipo_caso || undefined,
        data_resposta: pesquisa.data_resposta ? new Date(pesquisa.data_resposta) : undefined,
        resposta: pesquisa.resposta || undefined,
        comentario_pesquisa: pesquisa.comentario_pesquisa || '',
        observacao: pesquisa.observacao || '',
        empresa_id: pesquisa.empresa_id || undefined,
        cliente_id: pesquisa.cliente_id || undefined,
        especialistas_ids: [] // Iniciar vazio, será preenchido pelo próximo useEffect
      });
    }
  }, [pesquisa, form, empresas]);

  // Preencher especialistas separadamente - APENAS uma vez quando carregados
  useEffect(() => {
    console.log('🔄 [PesquisaForm useEffect] === EXECUÇÃO DO USEEFFECT ===');
    console.log('🔄 [PesquisaForm useEffect] especialistasIds:', especialistasIds);
    console.log('🔄 [PesquisaForm useEffect] especialistasIds.length:', especialistasIds.length);
    console.log('🔄 [PesquisaForm useEffect] pesquisa:', pesquisa?.id);
    
    if (especialistasIds.length > 0 && pesquisa) {
      console.log('📋 [PesquisaForm useEffect] ✅ Condições atendidas, processando...');
      console.log('📋 [PesquisaForm useEffect] Preenchendo especialistas:', especialistasIds);
      console.log('📋 [PesquisaForm useEffect] Valor atual do campo:', form.getValues('especialistas_ids'));
      
      // Verificar se os valores já estão corretos para evitar duplicação
      const valoresAtuais = form.getValues('especialistas_ids') || [];
      console.log('📋 [PesquisaForm useEffect] Valores atuais:', valoresAtuais);
      console.log('📋 [PesquisaForm useEffect] Valores atuais (sorted):', [...valoresAtuais].sort());
      console.log('📋 [PesquisaForm useEffect] Valores novos (sorted):', [...especialistasIds].sort());
      
      const valoresIguais = JSON.stringify([...valoresAtuais].sort()) === JSON.stringify([...especialistasIds].sort());
      console.log('📋 [PesquisaForm useEffect] Valores são iguais?', valoresIguais);
      
      if (!valoresIguais) {
        console.log('📋 [PesquisaForm useEffect] ⚠️ Valores diferentes, atualizando...');
        form.setValue('especialistas_ids', especialistasIds, {
          shouldValidate: false,
          shouldDirty: false,
          shouldTouch: false
        });
        console.log('📋 [PesquisaForm useEffect] ✅ Campo atualizado com:', especialistasIds);
      } else {
        console.log('📋 [PesquisaForm useEffect] ✅ Valores já estão corretos, não atualizando');
      }
    } else {
      console.log('📋 [PesquisaForm useEffect] ❌ Condições NÃO atendidas, pulando...');
    }
    console.log('🔄 [PesquisaForm useEffect] === FIM EXECUÇÃO DO USEEFFECT ===');
  }, [especialistasIds, pesquisa?.id]); // Usar pesquisa?.id em vez de pesquisa completo

  // Preencher grupo automaticamente quando categoria for selecionada
  useEffect(() => {
    if (categoriaSelecionada && grupos.length > 0) {
      // Se há apenas um grupo para a categoria, seleciona automaticamente
      if (grupos.length === 1) {
        form.setValue('grupo', grupos[0].value);
      }
      // Se o grupo atual não está na lista de grupos válidos, limpa o campo
      else {
        const grupoAtual = form.getValues('grupo');
        const grupoValido = grupos.find(g => g.value === grupoAtual);
        if (!grupoValido) {
          form.setValue('grupo', undefined);
        }
      }
    } else if (!categoriaSelecionada) {
      // Se categoria foi limpa, limpa o grupo também
      form.setValue('grupo', undefined);
    }
  }, [categoriaSelecionada, grupos, form]);

  const handleSubmit = async (dados: PesquisaFormData) => {
    console.log('📝 [PesquisaForm] Dados do formulário antes do processamento:', dados);
    console.log('📝 [PesquisaForm] Consultores manuais:', consultoresManuais);
    
    // Se há especialistas selecionados, converter para nomes e preencher o campo prestador
    if (dados.especialistas_ids && dados.especialistas_ids.length > 0) {
      try {
        console.log('🔄 [PesquisaForm] Convertendo especialistas IDs para nomes:', dados.especialistas_ids);
        
        // Separar IDs do banco de dados e IDs manuais
        const idsDb = dados.especialistas_ids.filter(id => !id.startsWith('manual_'));
        const idsManuais = dados.especialistas_ids.filter(id => id.startsWith('manual_'));
        
        const nomes: string[] = [];
        
        // Buscar nomes dos especialistas do banco de dados
        if (idsDb.length > 0) {
          const { data: especialistas, error } = await supabase
            .from('especialistas')
            .select('id, nome')
            .in('id', idsDb)
            .order('nome');

          if (error) {
            console.error('❌ [PesquisaForm] Erro ao buscar especialistas:', error);
            throw error;
          }

          if (especialistas) {
            nomes.push(...especialistas.map(esp => esp.nome));
          }
        }
        
        // Adicionar nomes dos consultores manuais
        if (idsManuais.length > 0) {
          const nomesManuais = consultoresManuais
            .filter(c => idsManuais.includes(c.value))
            .map(c => c.label);
          nomes.push(...nomesManuais);
          console.log('✅ [PesquisaForm] Nomes dos consultores manuais:', nomesManuais);
        }
        
        const nomesConcat = nomes.join(', ');
        
        console.log('✅ [PesquisaForm] Nomes dos especialistas do banco:', nomes);
        console.log('✅ [PesquisaForm] Prestador concatenado:', nomesConcat);
        
        // Atualizar o campo prestador com os nomes concatenados
        dados.prestador = nomesConcat;
        
        // Filtrar apenas IDs do banco de dados para salvar no relacionamento
        dados.especialistas_ids = idsDb;
        
      } catch (error) {
        console.error('❌ [PesquisaForm] Erro ao converter especialistas:', error);
        // Em caso de erro, manter o valor original do prestador
      }
    }
    
    console.log('📤 [PesquisaForm] Dados finais enviados:', dados);
    onSubmit(dados);
  };

  const isOrigemSqlServer = pesquisa?.origem === 'sql_server';
  const anoAtual = new Date().getFullYear();
  const anosDisponiveis = Array.from({ length: 10 }, (_, i) => anoAtual - i);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">

        {/* Seção: Dados Principais */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Dados Principais</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="empresa"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel>Empresa *</FormLabel>
                  <Select
                    value={field.value || ''}
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger className={cn(
                        fieldState.error && "border-red-500 focus:border-red-500"
                      )}>
                        <SelectValue placeholder="Selecione a empresa" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {empresas
                        .filter((empresa) => empresa.status === 'ativo')
                        .sort((a, b) => a.nome_abreviado.localeCompare(b.nome_abreviado, 'pt-BR'))
                        .map(empresa => (
                          <SelectItem key={empresa.id} value={empresa.nome_completo}>
                            {empresa.nome_abreviado}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="cliente"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel>Cliente *</FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      placeholder="Nome do cliente"
                      className={cn(
                        fieldState.error && "border-red-500 focus:border-red-500"
                      )}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="email_cliente"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel>Email do Cliente</FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      type="email" 
                      placeholder="email@exemplo.com"
                      value={field.value || ''}
                      className={cn(
                        fieldState.error && "border-red-500 focus:border-red-500"
                      )}
                    />
                  </FormControl>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="especialistas_ids"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel>Consultores</FormLabel>
                  <FormControl>
                    <MultiSelectEspecialistas
                      value={field.value || []}
                      onValueChange={(newValue) => {
                        console.log('📝 [PesquisaForm] Mudança no campo especialistas_ids:', newValue);
                        // Usar setValue com forceUpdate para garantir que a mudança seja persistida
                        form.setValue('especialistas_ids', newValue, { 
                          shouldValidate: true,
                          shouldDirty: true,
                          shouldTouch: true
                        });
                        // Forçar re-render do campo
                        form.trigger('especialistas_ids');
                      }}
                      onConsultoresManuaisChange={(consultores) => {
                        console.log('📝 [PesquisaForm] Consultores manuais atualizados:', consultores);
                        setConsultoresManuais(consultores);
                      }}
                      placeholder="Selecione os consultores..."
                      className={cn(
                        fieldState.error && "border-red-500"
                      )}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>

          {showSolicitante && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="solicitante"
                render={({ field, fieldState }) => (
                  <FormItem>
                    <FormLabel>Solicitante</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        placeholder="Nome do solicitante"
                        value={field.value || ''}
                        className={cn(
                          fieldState.error && "border-red-500 focus:border-red-500"
                        )}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
          )}
        </div>

        {/* Seção: Categorização */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Categorização</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="categoria"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel>Categoria <span className="text-foreground">*</span></FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger className={cn(
                        fieldState.error && "border-red-500 focus:border-red-500"
                      )}>
                        <SelectValue placeholder="Selecione a categoria" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categorias.map(categoria => (
                        <SelectItem key={categoria.value} value={categoria.value}>
                          {categoria.label}
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
              name="grupo"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel>Grupo</FormLabel>
                  {grupos.length === 1 ? (
                    // Quando há apenas um grupo, mostra como campo readonly
                    <FormControl>
                      <div className={cn(
                        "flex h-10 w-full rounded-md border border-input bg-muted px-3 py-2 text-sm",
                        fieldState.error && "border-red-500"
                      )}>
                        {grupos[0].label}
                      </div>
                    </FormControl>
                  ) : (
                    // Quando há múltiplos grupos, mostra como select
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={!categoriaSelecionada || grupos.length === 0}
                    >
                      <FormControl>
                        <SelectTrigger className={cn(
                          fieldState.error && "border-red-500 focus:border-red-500"
                        )}>
                          <SelectValue placeholder={
                            !categoriaSelecionada 
                              ? "Selecione uma categoria primeiro" 
                              : grupos.length === 0 
                              ? "Nenhum grupo disponível" 
                              : "Selecione o grupo"
                          } />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {grupos.map(grupo => (
                          <SelectItem key={grupo.value} value={grupo.value}>
                            {grupo.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Seção: Caso */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Informações do Caso</h3>
          
          {/* Linha com Tipo do Chamado e Número do Chamado */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="tipo_caso"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel>Tipo do Chamado</FormLabel>
                  <Select
                    value={field.value || 'none'}
                    onValueChange={(value) => field.onChange(value === 'none' ? undefined : value)}
                  >
                    <FormControl>
                      <SelectTrigger className={cn(
                        fieldState.error && "border-red-500 focus:border-red-500"
                      )}>
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">Selecione o tipo</SelectItem>
                      {tiposChamado.map(tipo => (
                        <SelectItem key={tipo.value} value={tipo.value}>
                          {tipo.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="nro_caso"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel>Número do Chamado</FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      placeholder="Nº do chamado"
                      value={field.value || ''}
                      className={cn(
                        fieldState.error && "border-red-500 focus:border-red-500"
                      )}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Seção: Feedback */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Feedback do Cliente</h3>
          
          {/* Linha com Resposta e Data da Resposta */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="resposta"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel>
                    Resposta
                    {isPesquisaManual && <span className="text-foreground ml-1">*</span>}
                  </FormLabel>
                  <Select
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger className={cn(
                        fieldState.error && "border-red-500 focus:border-red-500"
                      )}>
                        <SelectValue placeholder="Selecione a resposta" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {opcoesResposta.map(opcao => (
                        <SelectItem key={opcao.value} value={opcao.value}>
                          {opcao.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="data_resposta"
              render={({ field, fieldState }) => (
                <FormItem>
                  <FormLabel>Data da Resposta</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            !field.value && "text-muted-foreground",
                            fieldState.error && "border-red-500 focus:border-red-500"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "PPP 'às' HH:mm", { locale: ptBR })
                          ) : (
                            <span>Selecione a data e hora</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        selected={field.value || undefined}
                        onSelect={field.onChange}
                        disabled={(date) =>
                          date > new Date() || date < new Date("2000-01-01")
                        }
                        initialFocus
                        locale={ptBR}
                      />
                    </PopoverContent>
                  </Popover>
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name="comentario_pesquisa"
            render={({ field, fieldState }) => (
              <FormItem>
                <FormLabel>
                  Comentário da Pesquisa
                  {isPesquisaManual && <span className="text-foreground ml-1">*</span>}
                </FormLabel>
                <FormControl>
                  <Textarea 
                    {...field} 
                    placeholder={
                      isPesquisaManual 
                        ? "Comentário obrigatório para pesquisas manuais - descreva o contexto ou motivo da pesquisa"
                        : "Comentários adicionais da pesquisa"
                    }
                    rows={3}
                    value={field.value || ''}
                    className={cn(
                      fieldState.error && "border-red-500 focus:border-red-500"
                    )}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="observacao"
            render={({ field, fieldState }) => (
              <FormItem>
                <FormLabel>Observação Interna</FormLabel>
                <FormControl>
                  <Textarea 
                    {...field} 
                    placeholder="Observações internas (não visível para o cliente)"
                    rows={2}
                    value={field.value || ''}
                    className={cn(
                      fieldState.error && "border-red-500 focus:border-red-500"
                    )}
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </div>

        {/* Botões de ação */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Salvando...' : pesquisa ? 'Atualizar' : 'Criar'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
