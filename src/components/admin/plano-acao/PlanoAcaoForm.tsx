// =====================================================
// COMPONENTE: FORMULÁRIO DE PLANO DE AÇÃO - VERSÃO CORRIGIDA
// =====================================================

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { format } from 'date-fns';
import { useEmpresas } from '@/hooks/useEmpresas';
import { useCoordenadores } from '@/hooks/useCoordenadores';
import { MultiSelectEspecialistas } from '@/components/ui/multi-select-especialistas';
import { useCorrelacaoMultiplosEspecialistas } from '@/hooks/useCorrelacaoEspecialistas';
import { useEspecialistasPesquisa } from '@/hooks/useEspecialistasRelacionamentos';
import { ContatosList } from './ContatosList';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { MessageSquare, FileText } from 'lucide-react';
import type { PlanoAcaoFormData, PlanoAcaoCompleto } from '@/types/planoAcao';
import {
  PRIORIDADE_OPTIONS,
  STATUS_PLANO_OPTIONS,
  STATUS_FINAL_OPTIONS,
  TIPO_ACAO_OPTIONS,
} from '@/types/planoAcao';

const formSchema = z.object({
  pesquisa_id: z.string().min(1, 'Pesquisa é obrigatória'),
  chamado: z.string().optional(),
  empresa_id: z.string().optional(),
  especialistas_ids: z.array(z.string()).optional(), // NOVO: IDs dos consultores
  coordenador_id: z.string().optional(), // NOVO: ID do coordenador
  tipo_acao: z.enum(['NC', 'OM']).optional(), // NOVO: Tipo de ação
  comentario_cliente: z.string().optional(), // Campo habilitado para planos manuais
  causa: z.string().optional(), // NOVO: Causa raiz do problema
  descricao_acao_corretiva: z.string().optional(), // NOVO: Descrição da ação corretiva
  acao_preventiva: z.string().optional(),
  prioridade: z.enum(['baixa', 'media', 'alta', 'critica']),
  status_plano: z.enum(['aberto', 'em_andamento', 'aguardando_retorno', 'concluido', 'cancelado']).optional(),
  data_inicio: z.string().min(1, 'Data de início é obrigatória'),
  data_conclusao: z.string().optional(),

  status_final: z.enum(['resolvido', 'nao_resolvido', 'resolvido_parcialmente']).optional().nullable(),
  justificativa_cancelamento: z.string().optional(),
}).superRefine((data, ctx) => {
  // Se status_plano for "cancelado", justificativa é obrigatória
  if (data.status_plano === 'cancelado' && !data.justificativa_cancelamento) {
    ctx.addIssue({
      code: 'custom',
      message: 'Justificativa é obrigatória para cancelamento',
      path: ['justificativa_cancelamento'],
    });
  }
  
  // Se status_plano for "cancelado", não validar outros campos
  if (data.status_plano === 'cancelado') {
    return;
  }
  
  // Se tipo_acao for "NC" e status for "concluido", descricao_acao_corretiva é obrigatória
  if (data.status_plano === 'concluido' && data.tipo_acao === 'NC' && (!data.descricao_acao_corretiva || data.descricao_acao_corretiva.trim() === '')) {
    ctx.addIssue({
      code: 'custom',
      message: 'Ação Corretiva é obrigatória para concluir uma Não Conformidade (NC)',
      path: ['descricao_acao_corretiva'],
    });
  }
  
  // Se tipo_acao for "OM" e status for "concluido", acao_preventiva é obrigatória
  if (data.status_plano === 'concluido' && data.tipo_acao === 'OM' && (!data.acao_preventiva || data.acao_preventiva.trim() === '')) {
    ctx.addIssue({
      code: 'custom',
      message: 'Ação Preventiva/Melhoria é obrigatória para concluir uma Oportunidade de Melhoria (OM)',
      path: ['acao_preventiva'],
    });
  }
  
  // Se status_final for preenchido, data_conclusao é obrigatória
  if (data.status_final && !data.data_conclusao) {
    ctx.addIssue({
      code: 'custom',
      message: 'Data de conclusão é obrigatória quando há um status final',
      path: ['data_conclusao'],
    });
  }
  
  // NOVO: Se data_conclusao for preenchida, causa é obrigatória
  if (data.data_conclusao && (!data.causa || data.causa.trim() === '')) {
    ctx.addIssue({
      code: 'custom',
      message: 'Campo "causa" é obrigatório quando a data de conclusão está preenchida',
      path: ['causa'],
    });
  }
});

interface PlanoAcaoFormProps {
  plano?: PlanoAcaoCompleto;
  pesquisaId: string;
  onSubmit: (dados: PlanoAcaoFormData) => void;
  onCancel: () => void;
  isLoading?: boolean;
  onSubModalChange?: (isOpen: boolean) => void;
}

export function PlanoAcaoForm({
  plano,
  pesquisaId,
  onSubmit,
  onCancel,
  isLoading,
  onSubModalChange,
}: PlanoAcaoFormProps) {
  // Buscar empresas para o select
  const { empresas = [], isLoading: isLoadingEmpresas } = useEmpresas({});

  // Buscar coordenadores usando o hook (igual as demais tabelas)
  const { data: coordenadores = [], isLoading: isLoadingCoordenadores } = useCoordenadores();

  // Buscar especialistas relacionados à pesquisa
  const { data: especialistasRelacionados = [] } = useEspecialistasPesquisa(pesquisaId);
  
  // IDs dos especialistas já relacionados
  const especialistasIdsRelacionados = Array.isArray(especialistasRelacionados) 
    ? (especialistasRelacionados as any[]).map((e: any) => e.id)
    : [];
  
  // Correlação automática baseada no campo prestador
  const { data: especialistasIdsCorrelacionados = [] } = useCorrelacaoMultiplosEspecialistas(
    plano?.pesquisa?.prestador && especialistasIdsRelacionados.length === 0 
      ? plano.pesquisa.prestador 
      : undefined
  );

  // Ordenar empresas por nome abreviado
  const empresasOrdenadas = [...empresas].sort((a, b) => 
    a.nome_abreviado.localeCompare(b.nome_abreviado, 'pt-BR')
  );

  // Determinar se é um plano manual (novo plano sem pesquisa associada ou sem dados preenchidos automaticamente)
  const isPlanoManual = !plano || !plano.pesquisa || (!plano.pesquisa.comentario_pesquisa && !plano.pesquisa.nro_caso && !plano.pesquisa.empresa);

  // Flag para evitar que o useEffect sobrescreva a seleção do usuário após a montagem inicial
  const especialistasInitialized = useRef(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      pesquisa_id: pesquisaId,
      chamado: plano?.chamado || plano?.pesquisa?.nro_caso || '',
      empresa_id: plano?.empresa_id || '',
      especialistas_ids: (
        Array.isArray(especialistasIdsRelacionados) && especialistasIdsRelacionados.length > 0 
          ? especialistasIdsRelacionados 
          : Array.isArray(especialistasIdsCorrelacionados) && (especialistasIdsCorrelacionados as string[]).length > 0
          ? (especialistasIdsCorrelacionados as string[])
          : []
      ) as string[],
      coordenador_id: plano?.pesquisa?.coordenador_id || '',
      tipo_acao: plano?.tipo_acao || undefined,
      comentario_cliente: plano?.comentario_cliente || plano?.pesquisa?.comentario_pesquisa || '', 
      causa: plano?.causa || '',
      descricao_acao_corretiva: plano?.descricao_acao_corretiva || '',
      acao_preventiva: plano?.acao_preventiva || '',
      prioridade: plano?.prioridade || 'media',
      status_plano: plano?.status_plano || 'aberto',
      data_inicio: plano?.data_inicio || format(new Date(), 'yyyy-MM-dd'),
      data_conclusao: plano?.data_conclusao || '',
      status_final: plano?.status_final,
      justificativa_cancelamento: plano?.justificativa_cancelamento || '',
    },
  });

  // CORREÇÃO: Preencher campos automaticamente quando dados da pesquisa estiverem disponíveis
  useEffect(() => {
    if (plano?.pesquisa && empresas.length > 0) {
      console.log('🔧 Preenchendo campos automaticamente:', {
        pesquisa: plano.pesquisa,
        empresas: empresas.length
      });

      // Preencher chamado se não estiver preenchido
      if (!form.getValues('chamado') && plano.pesquisa.nro_caso) {
        form.setValue('chamado', plano.pesquisa.nro_caso);
      }

      // Preencher empresa se não estiver preenchida
      if (!form.getValues('empresa_id') && plano.pesquisa.empresa) {
        // Buscar empresa pelo nome
        const empresaEncontrada = empresas.find(
          e => e.nome_completo === plano.pesquisa?.empresa || 
               e.nome_abreviado === plano.pesquisa?.empresa
        );
        
        if (empresaEncontrada) {
          console.log('✅ Empresa encontrada:', empresaEncontrada.nome_abreviado);
          form.setValue('empresa_id', empresaEncontrada.id);
        } else {
          console.log('❌ Empresa não encontrada:', plano.pesquisa.empresa);
        }
      }

      // Preencher comentário do cliente se não estiver preenchido
      if (!form.getValues('comentario_cliente') && plano.pesquisa.comentario_pesquisa) {
        form.setValue('comentario_cliente', plano.pesquisa.comentario_pesquisa);
      }
    }
  }, [plano, empresas, form]);

  // Atualizar especialistas apenas na montagem inicial (não sobrescrever seleção do usuário)
  useEffect(() => {
    if (especialistasInitialized.current) return;
    
    const idsRelacionados = especialistasIdsRelacionados as string[];
    const idsCorrelacionados = (especialistasIdsCorrelacionados as string[]) || [];
    
    if (idsRelacionados.length > 0) {
      console.log('👥 Especialistas relacionados encontrados:', idsRelacionados);
      form.setValue('especialistas_ids', idsRelacionados);
      especialistasInitialized.current = true;
    } else if (idsCorrelacionados.length > 0) {
      console.log('🔗 Especialistas correlacionados encontrados:', idsCorrelacionados);
      form.setValue('especialistas_ids', idsCorrelacionados);
      especialistasInitialized.current = true;
    }
  }, [especialistasIdsRelacionados, especialistasIdsCorrelacionados, form]);

  return (
    <Tabs defaultValue="formulario" className="w-full">
      <TabsList className="bg-gray-100 p-1 rounded-lg mb-4 w-full">
        <TabsTrigger
          value="formulario"
          className="flex-1 data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm text-gray-500 font-medium flex items-center justify-center gap-2"
        >
          <FileText className="h-4 w-4" />
          Plano de Ação
        </TabsTrigger>
        {plano?.id && (
          <TabsTrigger
            value="contatos"
            className="flex-1 data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm text-gray-500 font-medium flex items-center justify-center gap-2"
          >
            <MessageSquare className="h-4 w-4" />
            Contatos com Cliente
          </TabsTrigger>
        )}
      </TabsList>

      <TabsContent value="formulario">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Seção: Informações Básicas */}
        <div className="space-y-4">
          <h3 className="font-semibold text-lg">Informações Básicas</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="chamado"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Chamado</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="Ex: INC123456"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="empresa_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Empresa</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    value={field.value}
                    disabled={isLoadingEmpresas}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a empresa" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {empresasOrdenadas.map((empresa) => (
                        <SelectItem key={empresa.id} value={empresa.id}>
                          {empresa.nome_abreviado}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Campo Consultores */}
          <FormField
            control={form.control}
            name="especialistas_ids"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Consultores</FormLabel>
                <FormControl>
                  <MultiSelectEspecialistas
                    value={field.value || []}
                    onValueChange={field.onChange}
                    placeholder="Selecione os consultores..."
                    className="focus:ring-sonda-blue focus:border-sonda-blue"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Campo Coordenador */}
          <FormField
            control={form.control}
            name="coordenador_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Coordenador</FormLabel>
                <Select 
                  onValueChange={(value) => {
                    // Se selecionar "none", limpar o campo (string vazia)
                    field.onChange(value === "none" ? "" : value);
                  }} 
                  value={field.value || "none"}
                  disabled={isLoadingCoordenadores}
                >
                  <FormControl>
                    <SelectTrigger className="focus:ring-sonda-blue focus:border-sonda-blue">
                      <SelectValue placeholder="Selecione um coordenador(a)" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="none">
                      <span className="text-muted-foreground">Selecione um coordenador(a)</span>
                    </SelectItem>
                    {coordenadores.map((coordenador) => (
                      <SelectItem key={coordenador.id} value={coordenador.id}>
                        {coordenador.nome}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Campo Tipo de Ação - Radio Buttons */}
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="tipo_acao"
            render={({ field }) => (
              <FormItem className="space-y-3">
                <FormLabel className="text-sm font-medium text-gray-700">Tipo de Ação</FormLabel>
                <FormControl>
                  <RadioGroup
                    onValueChange={field.onChange}
                    value={field.value}
                    className="flex items-center gap-6"
                  >
                    {TIPO_ACAO_OPTIONS.map((option) => (
                      <TooltipProvider key={option.value}>
                        <Tooltip delayDuration={300}>
                          <TooltipTrigger asChild>
                            <div className="flex items-center space-x-2 cursor-pointer">
                              <RadioGroupItem 
                                value={option.value} 
                                id={`tipo-${option.value}`}
                                className="border-gray-300"
                              />
                              <Label 
                                htmlFor={`tipo-${option.value}`}
                                className="text-sm cursor-pointer font-normal"
                              >
                                {option.label}
                              </Label>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent 
                            side="bottom" 
                            align="start" 
                            sideOffset={5}
                          >
                            <p className="text-sm">{option.description}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ))}
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="comentario_cliente"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Comentário do Cliente</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    placeholder={
                      isPlanoManual 
                        ? "Descreva o comentário ou feedback do cliente sobre o problema..."
                        : "Cliente não relatou sobre o problema."
                    }
                    rows={3}
                    disabled={!isPlanoManual} // Habilitado apenas para planos manuais
                    className={!isPlanoManual ? "bg-gray-50 dark:bg-gray-900" : ""}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />    

          <FormField
            control={form.control}
            name="descricao_acao_corretiva"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Descrição da Ação Corretiva
                  {form.watch('status_plano') === 'concluido' && form.watch('tipo_acao') === 'NC' && <span className="text-red-500 ml-1">*</span>}
                </FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    placeholder="Descreva detalhadamente o que será feito para resolver o problema..."
                    rows={4}
                    className={form.formState.errors.descricao_acao_corretiva 
                      ? 'border-red-500 focus:ring-red-500 focus:border-red-500' 
                      : 'focus:ring-sonda-blue focus:border-sonda-blue'
                    }
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="acao_preventiva"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Ação Preventiva/Melhoria
                  {form.watch('status_plano') === 'concluido' && form.watch('tipo_acao') === 'OM' && <span className="text-red-500 ml-1">*</span>}
                </FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    placeholder="Descreva o que será feito para evitar que o problema ocorra novamente..."
                    rows={3}
                    className={form.formState.errors.acao_preventiva 
                      ? 'border-red-500 focus:ring-red-500 focus:border-red-500' 
                      : 'focus:ring-sonda-blue focus:border-sonda-blue'
                    }
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Seção: Prioridade e Status */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="prioridade"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Prioridade *</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {PRIORIDADE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
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
            name="status_plano"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Select 
                  onValueChange={field.onChange} 
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {STATUS_PLANO_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          
          {/* Campo de Justificativa de Cancelamento (condicional) */}
          {form.watch('status_plano') === 'cancelado' && (
            <FormField
              control={form.control}
              name="justificativa_cancelamento"
              render={({ field }) => (
                <FormItem className="md:col-span-3">
                  <FormLabel>Justificativa do Cancelamento <span className="text-foreground">*</span></FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Descreva brevemente o motivo do cancelamento..."
                      rows={2}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          <FormField
            control={form.control}
            name="data_inicio"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Data de Início *</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Seção: Conclusão */}
        <div className="space-y-4">
          <h3 className="font-semibold text-lg">Conclusão</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="data_conclusao"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Data de Conclusão
                    {form.watch('status_final') && <span className="text-foreground ml-1">*</span>}
                  </FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="status_final"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Como foi resolvido?</FormLabel>
                  <Select 
                    onValueChange={(value) => {
                      field.onChange(value);
                      // Quando marcar como resolvido, mudar status para concluído
                      if (value === 'resolvido' || value === 'resolvido_parcialmente') {
                        form.setValue('status_plano', 'concluido');
                      }
                    }} 
                    defaultValue={field.value || undefined}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o resultado final" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {STATUS_FINAL_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {/* Campo Causa - obrigatório quando data_conclusao preenchida */}
          <FormField
            control={form.control}
            name="causa"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Causa Raiz
                  {form.watch('data_conclusao') && <span className="text-red-500 ml-1">*</span>}
                </FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    placeholder="Descreva a causa raiz identificada do problema relatado pelo cliente..."
                    rows={3}
                    className={form.formState.errors.causa 
                      ? 'border-red-500 focus:ring-red-500 focus:border-red-500' 
                      : 'focus:ring-sonda-blue focus:border-sonda-blue'
                    }
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Botões */}
        <div className="flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Salvando...' : plano ? 'Atualizar' : 'Criar Plano'}
          </Button>
        </div>
      </form>
    </Form>
      </TabsContent>

      {plano?.id && (
        <TabsContent value="contatos">
          <ContatosList planoAcaoId={plano.id} onSubModalChange={onSubModalChange} />
        </TabsContent>
      )}
    </Tabs>
  );
}
