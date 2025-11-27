// =====================================================
// COMPONENTE: FORMULÁRIO DE PLANO DE AÇÃO
// =====================================================

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
import { format } from 'date-fns';
import { useEmpresas } from '@/hooks/useEmpresas';
import type { PlanoAcaoFormData, PlanoAcaoCompleto } from '@/types/planoAcao';
import {
  PRIORIDADE_OPTIONS,
  STATUS_PLANO_OPTIONS,
  MEIO_CONTATO_OPTIONS,
  RETORNO_CLIENTE_OPTIONS,
  STATUS_FINAL_OPTIONS,
} from '@/types/planoAcao';

const formSchema = z.object({
  pesquisa_id: z.string().min(1, 'Pesquisa é obrigatória'),
  chamado: z.string().optional(),
  empresa_id: z.string().optional(),
  descricao_acao_corretiva: z.string().min(10, 'Descreva a ação corretiva (mínimo 10 caracteres)'),
  acao_preventiva: z.string().optional(),
  prioridade: z.enum(['baixa', 'media', 'alta', 'critica']),
  status_plano: z.enum(['aberto', 'em_andamento', 'aguardando_retorno', 'concluido', 'cancelado']).optional(),
  data_inicio: z.string().min(1, 'Data de início é obrigatória'),
  data_conclusao: z.string().optional(),
  data_primeiro_contato: z.string().optional(),
  meio_contato: z.enum(['whatsapp', 'email', 'ligacao']).optional().nullable(),
  resumo_comunicacao: z.string().optional(),
  retorno_cliente: z.enum(['aguardando', 'respondeu', 'solicitou_mais_informacoes']).optional().nullable(),
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
  
  // Se status_final for preenchido, data_conclusao é obrigatória
  if (data.status_final && !data.data_conclusao) {
    ctx.addIssue({
      code: 'custom',
      message: 'Data de conclusão é obrigatória quando há um status final',
      path: ['data_conclusao'],
    });
  }
  
  // Se status_final for "resolvido" ou "resolvido_parcialmente", campos de contato são obrigatórios
  if (data.status_final === 'resolvido' || data.status_final === 'resolvido_parcialmente') {
    if (!data.data_primeiro_contato) {
      ctx.addIssue({
        code: 'custom',
        message: 'Data do primeiro contato é obrigatória para casos resolvidos',
        path: ['data_primeiro_contato'],
      });
    }
    if (!data.meio_contato) {
      ctx.addIssue({
        code: 'custom',
        message: 'Meio de contato é obrigatório para casos resolvidos',
        path: ['meio_contato'],
      });
    }
    if (!data.retorno_cliente) {
      ctx.addIssue({
        code: 'custom',
        message: 'Retorno do cliente é obrigatório para casos resolvidos',
        path: ['retorno_cliente'],
      });
    }
  }
});

interface PlanoAcaoFormProps {
  plano?: PlanoAcaoCompleto;
  pesquisaId: string;
  onSubmit: (dados: PlanoAcaoFormData) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function PlanoAcaoForm({
  plano,
  pesquisaId,
  onSubmit,
  onCancel,
  isLoading,
}: PlanoAcaoFormProps) {
  // Buscar empresas para o select
  const { empresas = [], isLoading: isLoadingEmpresas } = useEmpresas({});

  // Ordenar empresas por nome abreviado
  const empresasOrdenadas = [...empresas].sort((a, b) => 
    a.nome_abreviado.localeCompare(b.nome_abreviado, 'pt-BR')
  );

  const form = useForm<PlanoAcaoFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      pesquisa_id: pesquisaId,
      chamado: plano?.chamado || '',
      empresa_id: plano?.empresa_id || '',
      descricao_acao_corretiva: plano?.descricao_acao_corretiva || '',
      acao_preventiva: plano?.acao_preventiva || '',
      prioridade: plano?.prioridade || 'media',
      status_plano: plano?.status_plano || 'aberto',
      data_inicio: plano?.data_inicio || format(new Date(), 'yyyy-MM-dd'),
      data_conclusao: plano?.data_conclusao || '',
      data_primeiro_contato: plano?.data_primeiro_contato || '',
      meio_contato: plano?.meio_contato,
      resumo_comunicacao: plano?.resumo_comunicacao || '',
      retorno_cliente: plano?.retorno_cliente,
      status_final: plano?.status_final,
      justificativa_cancelamento: plano?.justificativa_cancelamento || '',
    },
  });

  return (
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
        </div>

        {/* Seção: Ação Corretiva */}
        <div className="space-y-4">
          <h3 className="font-semibold text-lg">Ação Corretiva</h3>
          
          <FormField
            control={form.control}
            name="descricao_acao_corretiva"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Descrição da Ação Corretiva *</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    placeholder="Descreva detalhadamente o que será feito para resolver o problema..."
                    rows={4}
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
                <FormLabel>Ação Preventiva</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    placeholder="Descreva o que será feito para evitar que o problema ocorra novamente..."
                    rows={3}
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

        {/* Seção: Contato com Cliente */}
        <div className="space-y-4">
          <h3 className="font-semibold text-lg">Contato com Cliente</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField
              control={form.control}
              name="data_primeiro_contato"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Quando entrou em contato?
                    {(form.watch('status_final') === 'resolvido' || form.watch('status_final') === 'resolvido_parcialmente') && (
                      <span className="text-foreground ml-1">*</span>
                    )}
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
              name="meio_contato"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Como entrou em contato?
                    {(form.watch('status_final') === 'resolvido' || form.watch('status_final') === 'resolvido_parcialmente') && (
                      <span className="text-foreground ml-1">*</span>
                    )}
                  </FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value || undefined}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o meio de contato" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {MEIO_CONTATO_OPTIONS.map((opt) => (
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
              name="retorno_cliente"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    O cliente respondeu?
                    {(form.watch('status_final') === 'resolvido' || form.watch('status_final') === 'resolvido_parcialmente') && (
                      <span className="text-foreground ml-1">*</span>
                    )}
                  </FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value || undefined}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o retorno" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {RETORNO_CLIENTE_OPTIONS.map((opt) => (
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

          <FormField
            control={form.control}
            name="resumo_comunicacao"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Resumo da Comunicação</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    placeholder="Descreva o que foi conversado com o cliente..."
                    rows={3}
                  />
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
  );
}
