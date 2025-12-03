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
import { useEmpresas } from '@/hooks/useEmpresas';

interface PesquisaFormProps {
  pesquisa?: Pesquisa | null;
  onSubmit: (dados: PesquisaFormData) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function PesquisaForm({ pesquisa, onSubmit, onCancel, isLoading }: PesquisaFormProps) {
  // Buscar empresas para o select
  const { empresas } = useEmpresas();

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
      data_resposta: undefined, // Vem em branco
      resposta: '',
      comentario_pesquisa: '',
      observacao: ''
    }
  });

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

  // Preencher formulário ao editar
  useEffect(() => {
    if (pesquisa && empresas.length > 0) {
      // Tentar encontrar a empresa pelo nome completo ou abreviado
      const empresaEncontrada = empresas.find(
        e => e.nome_completo === pesquisa.empresa || e.nome_abreviado === pesquisa.empresa
      );
      
      // Usar o nome_abreviado se encontrou, senão usar o valor original
      const empresaValue = empresaEncontrada ? empresaEncontrada.nome_abreviado : pesquisa.empresa;
      
      form.reset({
        empresa: empresaValue || '',
        cliente: pesquisa.cliente,
        categoria: pesquisa.categoria || '',
        grupo: pesquisa.grupo || '',
        email_cliente: pesquisa.email_cliente || '',
        prestador: pesquisa.prestador || '',
        nro_caso: pesquisa.nro_caso || '',
        tipo_caso: pesquisa.tipo_caso || '',
        data_resposta: pesquisa.data_resposta ? new Date(pesquisa.data_resposta) : undefined,
        resposta: pesquisa.resposta || '',
        comentario_pesquisa: pesquisa.comentario_pesquisa || '',
        observacao: pesquisa.observacao || '',
        empresa_id: pesquisa.empresa_id || undefined,
        cliente_id: pesquisa.cliente_id || undefined
      });
    }
  }, [pesquisa, form, empresas]);

  const handleSubmit = (dados: PesquisaFormData) => {
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
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Empresa *</FormLabel>
                  <Select
                    value={field.value || ''}
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a empresa" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {empresas
                        .sort((a, b) => a.nome_abreviado.localeCompare(b.nome_abreviado, 'pt-BR'))
                        .map(empresa => (
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
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo do Chamado</FormLabel>
                  <Select
                    value={field.value || ''}
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {tiposChamado.map(tipo => (
                        <SelectItem key={tipo.value} value={tipo.value}>
                          {tipo.label}
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
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Resposta</FormLabel>
                  <Select
                    value={field.value || ''}
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger>
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
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="data_resposta"
              render={({ field }) => (
                <FormItem>
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
