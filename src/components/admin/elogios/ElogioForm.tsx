/**
 * Formulário de cadastro/edição de elogios
 */

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
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

import type { ElogioCompleto } from '@/types/elogios';
import { useEmpresas } from '@/hooks/useEmpresas';
import { useCategorias, useGruposPorCategoria } from '@/hooks/useDeParaCategoria';

interface ElogioFormData {
  empresa: string;
  cliente: string;
  email_cliente?: string;
  prestador?: string;
  categoria?: string;
  grupo?: string;
  tipo_caso?: string;
  nro_caso?: string;
  data_resposta?: Date;
  resposta: string;
  comentario_pesquisa?: string;
  observacao?: string;
}

interface ElogioFormProps {
  elogio?: ElogioCompleto | null;
  onSubmit: (dados: any) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export function ElogioForm({ elogio, onSubmit, onCancel, isLoading }: ElogioFormProps) {
  const { empresas } = useEmpresas();
  
  // Buscar categorias e grupos da tabela DE-PARA
  const { data: categorias = [] } = useCategorias();

  const form = useForm<ElogioFormData>({
    defaultValues: {
      empresa: '',
      cliente: '',
      email_cliente: '',
      prestador: '',
      categoria: '',
      grupo: '',
      tipo_caso: '',
      nro_caso: '',
      data_resposta: undefined,
      resposta: 'Muito Satisfeito',
      comentario_pesquisa: '',
      observacao: ''
    }
  });

  // Observar mudanças na categoria selecionada
  const categoriaSelecionada = form.watch('categoria');
  
  // Buscar grupos baseado na categoria selecionada
  const { data: grupos = [] } = useGruposPorCategoria(categoriaSelecionada);

  const tiposChamado = [
    { value: 'IM', label: 'IM - Incidente' },
    { value: 'PR', label: 'PR - Problema' },
    { value: 'RF', label: 'RF - Requisição' }
  ];

  const opcoesResposta = [
    { value: 'Muito Satisfeito', label: 'Muito Satisfeito' },
    { value: 'Satisfeito', label: 'Satisfeito' }
  ];

  useEffect(() => {
    if (elogio && empresas.length > 0) {
      const empresaEncontrada = empresas.find(
        e => e.nome_completo === elogio.pesquisa?.empresa || e.nome_abreviado === elogio.pesquisa?.empresa
      );
      
      const empresaValue = empresaEncontrada ? empresaEncontrada.nome_abreviado : elogio.pesquisa?.empresa || '';
      
      form.reset({
        empresa: empresaValue,
        cliente: elogio.pesquisa?.cliente || '',
        email_cliente: elogio.pesquisa?.email_cliente || '',
        prestador: elogio.pesquisa?.prestador || '',
        categoria: elogio.pesquisa?.categoria || '',
        grupo: elogio.pesquisa?.grupo || '',
        tipo_caso: elogio.pesquisa?.tipo_caso || '',
        nro_caso: elogio.pesquisa?.nro_caso || elogio.chamado || '',
        data_resposta: elogio.data_resposta ? new Date(elogio.data_resposta) : undefined,
        resposta: elogio.pesquisa?.resposta || 'Muito Satisfeito',
        comentario_pesquisa: elogio.pesquisa?.comentario_pesquisa || '',
        observacao: elogio.observacao || ''
      });
    }
  }, [elogio, form, empresas]);

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
          form.setValue('grupo', '');
        }
      }
    } else if (!categoriaSelecionada) {
      // Se categoria foi limpa, limpa o grupo também
      form.setValue('grupo', '');
    }
  }, [categoriaSelecionada, grupos, form]);

  const handleSubmit = (dados: ElogioFormData) => {
    // Validação manual: comentário obrigatório para elogios (sempre manuais)
    if (!dados.comentario_pesquisa || dados.comentario_pesquisa.trim() === '') {
      form.setError('comentario_pesquisa', {
        type: 'required',
        message: 'Comentário é obrigatório para elogios'
      });
      return;
    }
    
    onSubmit(dados);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">
        {/* Dados Principais */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Dados Principais</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="empresa"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Empresa *</FormLabel>
                  <Select value={field.value || ''} onValueChange={field.onChange}>
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
                    <Input {...field} type="email" placeholder="email@exemplo.com" value={field.value || ''} />
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
                    <Input {...field} placeholder="Nome do consultor" value={field.value || ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Categorização */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Categorização</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="categoria"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Categoria</FormLabel>
                  <Select
                    value={field.value || ''}
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger>
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
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Grupo</FormLabel>
                  <Select
                    value={field.value || ''}
                    onValueChange={field.onChange}
                    disabled={!categoriaSelecionada || grupos.length === 0}
                  >
                    <FormControl>
                      <SelectTrigger>
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
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Informações do Caso */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Informações do Caso</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="tipo_caso"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tipo do Chamado</FormLabel>
                  <Select value={field.value || ''} onValueChange={field.onChange}>
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
                    <Input {...field} placeholder="Número do chamado" value={field.value || ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Feedback do Cliente */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Feedback do Cliente</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="resposta"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Resposta</FormLabel>
                  <Select value={field.value} onValueChange={field.onChange}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
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
                            format(field.value, "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })
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
          </div>

          <FormField
            control={form.control}
            name="comentario_pesquisa"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Comentário da Pesquisa
                  <span className="text-red-500 ml-1">*</span>
                </FormLabel>
                <FormControl>
                  <Textarea 
                    {...field} 
                    placeholder="Comentário obrigatório - descreva o contexto do elogio ou feedback positivo do cliente" 
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
            name="observacao"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Observação Interna</FormLabel>
                <FormControl>
                  <Textarea {...field} placeholder="Observações internas (não visível para o cliente)" rows={4} value={field.value || ''} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Botões */}
        <div className="flex justify-end gap-3 pt-4">
          <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Salvando...' : elogio ? 'Atualizar' : 'Criar'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
