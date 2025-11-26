/**
 * Formulário de cadastro/edição de pesquisas
 */

import { useEffect } from 'react';
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

import { PesquisaFormSchema } from '@/schemas/pesquisasSatisfacaoSchemas';
import type { PesquisaFormData, Pesquisa } from '@/types/pesquisasSatisfacao';
import { MESES_OPTIONS } from '@/types/pesquisasSatisfacao';

interface PesquisaFormProps {
  pesquisa?: Pesquisa | null;
  onSubmit: (dados: PesquisaFormData) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function PesquisaForm({ pesquisa, onSubmit, onCancel, isLoading }: PesquisaFormProps) {
  const form = useForm<PesquisaFormData>({
    resolver: zodResolver(PesquisaFormSchema),
    defaultValues: {
      empresa: '',
      cliente: '',
      categoria: '',
      grupo: '',
      email_cliente: '',
      prestador: '',
      nro_caso: '',
      tipo_caso: '',
      ano_abertura: new Date().getFullYear(),
      mes_abertura: new Date().getMonth() + 1,
      data_resposta: null,
      resposta: '',
      comentario_pesquisa: '',
      observacao: ''
    }
  });

  // Preencher formulário ao editar
  useEffect(() => {
    if (pesquisa) {
      form.reset({
        empresa: pesquisa.empresa,
        cliente: pesquisa.cliente,
        categoria: pesquisa.categoria || '',
        grupo: pesquisa.grupo || '',
        email_cliente: pesquisa.email_cliente || '',
        prestador: pesquisa.prestador || '',
        nro_caso: pesquisa.nro_caso || '',
        tipo_caso: pesquisa.tipo_caso || '',
        ano_abertura: pesquisa.ano_abertura || undefined,
        mes_abertura: pesquisa.mes_abertura || undefined,
        data_resposta: pesquisa.data_resposta ? new Date(pesquisa.data_resposta) : null,
        resposta: pesquisa.resposta || '',
        comentario_pesquisa: pesquisa.comentario_pesquisa || '',
        observacao: pesquisa.observacao || '',
        empresa_id: pesquisa.empresa_id || undefined,
        cliente_id: pesquisa.cliente_id || undefined
      });
    }
  }, [pesquisa, form]);

  const handleSubmit = (dados: PesquisaFormData) => {
    onSubmit(dados);
  };

  const isOrigemSqlServer = pesquisa?.origem === 'sql_server';
  const anoAtual = new Date().getFullYear();
  const anosDisponiveis = Array.from({ length: 10 }, (_, i) => anoAtual - i);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {/* Indicador de origem */}
        {pesquisa && (
          <div className={cn(
            "p-3 rounded-lg border text-sm",
            isOrigemSqlServer 
              ? "bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-950 dark:border-blue-800 dark:text-blue-200"
              : "bg-green-50 border-green-200 text-green-800 dark:bg-green-950 dark:border-green-800 dark:text-green-200"
          )}>
            <strong>Origem:</strong> {isOrigemSqlServer ? 'SQL Server (Sincronizado)' : 'Manual'}
            {isOrigemSqlServer && (
              <p className="text-xs mt-1">
                Alguns campos podem ter restrições de edição
              </p>
            )}
          </div>
        )}

        {/* Seção: Dados Principais */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Dados Principais</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="empresa"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Empresa *</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Nome da empresa" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="cliente"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Cliente *</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Nome do cliente" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="email_cliente"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email do Cliente</FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      type="email" 
                      placeholder="email@exemplo.com"
                      value={field.value || ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="prestador"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Consultor</FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      placeholder="Nome do prestador"
                      value={field.value || ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Seção: Categorização */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Categorização</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField
              control={form.control}
              name="categoria"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Categoria</FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      placeholder="Ex: Atendimento"
                      value={field.value || ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="grupo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Grupo</FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      placeholder="Grupo responsável"
                      value={field.value || ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="tipo_caso"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo do Chamado</FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      placeholder="Tipo do chamado"
                      value={field.value || ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Seção: Caso */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Informações do Caso</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField
              control={form.control}
              name="nro_caso"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Número do Chamado</FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      placeholder="Nº do chamado"
                      value={field.value || ''}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="ano_abertura"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ano de Abertura</FormLabel>
                  <Select
                    value={field.value?.toString()}
                    onValueChange={(value) => field.onChange(parseInt(value))}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o ano" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {anosDisponiveis.map(ano => (
                        <SelectItem key={ano} value={ano.toString()}>
                          {ano}
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
              name="mes_abertura"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Mês de Abertura</FormLabel>
                  <Select
                    value={field.value?.toString()}
                    onValueChange={(value) => field.onChange(parseInt(value))}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o mês" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {MESES_OPTIONS.map(mes => (
                        <SelectItem key={mes.value} value={mes.value.toString()}>
                          {mes.label}
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
            name="data_resposta"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel>Data da Resposta</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full pl-3 text-left font-normal",
                          !field.value && "text-muted-foreground"
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
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Seção: Feedback */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Feedback do Cliente</h3>
          
          <FormField
            control={form.control}
            name="resposta"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Resposta</FormLabel>
                <FormControl>
                  <Textarea 
                    {...field} 
                    placeholder="Resposta/feedback do cliente"
                    rows={4}
                    value={field.value || ''}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="comentario_pesquisa"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Comentário da Pesquisa</FormLabel>
                <FormControl>
                  <Textarea 
                    {...field} 
                    placeholder="Comentários adicionais da pesquisa"
                    rows={3}
                    value={field.value || ''}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="observacao"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Observação Interna</FormLabel>
                <FormControl>
                  <Textarea 
                    {...field} 
                    placeholder="Observações internas (não visível para o cliente)"
                    rows={2}
                    value={field.value || ''}
                  />
                </FormControl>
                <FormMessage />
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
