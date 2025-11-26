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
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
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
  descricao_acao_corretiva: z.string().min(10, 'Descreva a ação corretiva (mínimo 10 caracteres)'),
  acao_preventiva: z.string().optional(),
  prioridade: z.enum(['baixa', 'media', 'alta', 'critica']),
  status_plano: z.enum(['aberto', 'em_andamento', 'aguardando_retorno', 'concluido', 'cancelado']).optional(),
  data_inicio: z.string().min(1, 'Data de início é obrigatória'),
  data_conclusao: z.string().optional(),
  data_primeiro_contato: z.string().optional(),
  meio_contato: z.enum(['whatsapp', 'email', 'ligacao']).optional(),
  resumo_comunicacao: z.string().optional(),
  retorno_cliente: z.enum(['aguardando', 'respondeu', 'solicitou_mais_informacoes']).optional(),
  status_final: z.enum(['resolvido', 'nao_resolvido', 'resolvido_parcialmente']).optional(),
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
  const form = useForm<PlanoAcaoFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      pesquisa_id: pesquisaId,
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
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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
                <FormLabel>Ação Preventiva (Opcional)</FormLabel>
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
                <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                  <FormLabel>Data do Primeiro Contato</FormLabel>
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
                  <FormLabel>Meio de Contato</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
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
                  <FormLabel>Retorno do Cliente</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
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
                  <FormLabel>Data de Conclusão</FormLabel>
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
                  <FormLabel>Status Final</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione" />
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
