// =====================================================
// COMPONENTE: FORMULÁRIO DE PLANO DE AÇÃO - VERSÃO CORRIGIDA
// =====================================================

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useEffect } from 'react';
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
import { ContatosList } from './ContatosList';
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
  comentario_cliente: z.string().optional(), // Campo habilitado para planos manuais
  causa: z.string().optional(), // NOVO: Causa raiz do problema
  descricao_acao_corretiva: z.string().min(10, 'Descreva a ação corretiva (mínimo 10 caracteres)'), // NOVO: Descrição da ação corretiva
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

  // Determinar se é um plano manual (novo plano sem pesquisa associada ou sem dados preenchidos automaticamente)
  const isPlanoManual = !plano || !plano.pesquisa || (!plano.pesquisa.comentario_pesquisa && !plano.pesquisa.nro_caso && !plano.pesquisa.empresa);

  const form = useForm<PlanoAcaoFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      pesquisa_id: pesquisaId,
      chamado: plano?.chamado || plano?.pesquisa?.nro_caso || '', // CORREÇÃO: Buscar da pesquisa se não tiver no plano
      empresa_id: plano?.empresa_id || '', // CORREÇÃO: Será preenchido via useEffect
      comentario_cliente: plano?.comentario_cliente || plano?.pesquisa?.comentario_pesquisa || '', 
      causa: plano?.causa || '', // NOVO: Campo causa
      descricao_acao_corretiva: plano?.descricao_acao_corretiva || '', // NOVO: Campo em branco para ação corretiva
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

        {/* Seção: Histórico de Contatos */}
        {plano?.id && (
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Contatos com Cliente</h3>
            <ContatosList planoAcaoId={plano.id} />
          </div>
        )}

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
                  Causa Raiz do Problema
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
                <p className="text-xs text-gray-500">
                  Campo obrigatório quando a data de conclusão estiver preenchida
                </p>
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
  );
}
