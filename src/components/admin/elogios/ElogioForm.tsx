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
import { supabase } from '@/integrations/supabase/client';

import type { ElogioCompleto } from '@/types/elogios';
import { useEmpresas } from '@/hooks/useEmpresas';
import { useCategorias, useGruposPorCategoria } from '@/hooks/useDeParaCategoria';
import { MultiSelectEspecialistas } from '@/components/ui/multi-select-especialistas';
import { useEspecialistasIdsElogio } from '@/hooks/useEspecialistasRelacionamentos';
import { useCorrelacaoMultiplosEspecialistas } from '@/hooks/useCorrelacaoEspecialistas';

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
  especialistas_ids?: string[]; // Array de IDs dos especialistas selecionados
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
  
  // Debug: verificar se categorias estão sendo carregadas
  console.log('📋 [ELOGIOS] Categorias carregadas:', categorias);
  console.log('📋 [ELOGIOS] Total de categorias:', categorias.length);

  const form = useForm<ElogioFormData>({
    defaultValues: {
      empresa: '',
      cliente: '',
      email_cliente: '',
      prestador: '',
      categoria: undefined,
      grupo: undefined,
      tipo_caso: undefined,
      nro_caso: '',
      data_resposta: undefined,
      resposta: 'Muito Satisfeito',
      comentario_pesquisa: '',
      observacao: '',
      especialistas_ids: []
    }
  });

  // Observar mudanças na categoria selecionada
  const categoriaSelecionada = form.watch('categoria');
  
  // Buscar grupos baseado na categoria selecionada
  const { data: grupos = [] } = useGruposPorCategoria(categoriaSelecionada);

  // Buscar especialistas relacionados ao elogio (para edição)
  const especialistasIdsRelacionados = useEspecialistasIdsElogio(elogio?.id);
  
  // Correlação automática baseada no campo prestador
  const correlacaoResult = useCorrelacaoMultiplosEspecialistas(
    elogio?.pesquisa?.prestador && especialistasIdsRelacionados.length === 0 ? elogio.pesquisa.prestador : undefined
  );
  const especialistasIdsCorrelacionados = correlacaoResult.data ?? [];
  const loadingCorrelacao = correlacaoResult.isLoading;
  
  // Usar relacionamentos salvos ou correlação automática
  const especialistasIds = especialistasIdsRelacionados.length > 0 
    ? especialistasIdsRelacionados 
    : especialistasIdsCorrelacionados;

  // Debug logs
  console.log('🔍 [ElogioForm] Elogio ID:', elogio?.id);
  console.log('🔍 [ElogioForm] Elogio completo:', elogio);
  console.log('🔍 [ElogioForm] Prestador (pesquisa):', elogio?.pesquisa?.prestador);
  console.log('🔍 [ElogioForm] Prestador (pesquisas_satisfacao):', elogio?.pesquisas_satisfacao?.prestador);
  console.log('🔍 [ElogioForm] Especialistas IDs relacionados:', especialistasIdsRelacionados);
  console.log('🔍 [ElogioForm] Especialistas IDs correlacionados:', especialistasIdsCorrelacionados);
  console.log('🔍 [ElogioForm] Especialistas IDs finais:', especialistasIds);
  console.log('🔍 [ElogioForm] Categoria selecionada:', categoriaSelecionada);
  console.log('🔍 [ElogioForm] Grupos disponíveis:', grupos);

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
    console.log('🔄 [ELOGIOS] === PREENCHIMENTO DO FORMULÁRIO ===');
    console.log('🔄 [ELOGIOS] Elogio:', !!elogio);
    console.log('🔄 [ELOGIOS] Empresas carregadas:', empresas.length);
    console.log('🔄 [ELOGIOS] Categorias carregadas:', categorias.length);
    
    // Aguardar carregamento de empresas E categorias antes de preencher
    if (elogio && empresas.length > 0 && categorias.length > 0 && !form.formState.isDirty) {
      console.log('✅ [ELOGIOS] Todas as dependências carregadas, preenchendo formulário');
      
      const empresaEncontrada = empresas.find(
        e => e.nome_completo === elogio.pesquisa?.empresa || e.nome_abreviado === elogio.pesquisa?.empresa
      );
      
      const empresaValue = empresaEncontrada ? empresaEncontrada.nome_completo : elogio.pesquisa?.empresa || '';
      
      console.log('📋 [ELOGIOS] Dados do elogio a serem preenchidos:');
      console.log('  - Categoria:', elogio.pesquisa?.categoria);
      console.log('  - Grupo:', elogio.pesquisa?.grupo);
      
      form.reset({
        empresa: empresaValue,
        cliente: elogio.pesquisa?.cliente || '',
        email_cliente: elogio.pesquisa?.email_cliente || '',
        prestador: elogio.pesquisa?.prestador || '',
        categoria: elogio.pesquisa?.categoria || undefined,
        grupo: elogio.pesquisa?.grupo || undefined,
        tipo_caso: elogio.pesquisa?.tipo_caso || undefined,
        nro_caso: elogio.pesquisa?.nro_caso || elogio.chamado || '',
        data_resposta: elogio.data_resposta ? new Date(elogio.data_resposta) : undefined,
        resposta: elogio.pesquisa?.resposta || 'Muito Satisfeito',
        comentario_pesquisa: elogio.pesquisa?.comentario_pesquisa || '',
        observacao: elogio.observacao || '',
        especialistas_ids: [] // Iniciar vazio, será preenchido pelo próximo useEffect
      });
      
      console.log('✅ [ELOGIOS] Formulário preenchido com sucesso');
    } else {
      console.log('⏳ [ELOGIOS] Aguardando carregamento das dependências...');
    }
  }, [elogio, empresas, categorias]); // Removido 'form' da dependência para evitar loops

  // Preencher especialistas separadamente - APENAS uma vez quando carregados
  useEffect(() => {
    if (!loadingCorrelacao && especialistasIds.length > 0 && elogio && !form.formState.isDirty) {
      console.log('📋 [ELOGIOS] Preenchendo especialistas (apenas uma vez):', especialistasIds);
      form.setValue('especialistas_ids', especialistasIds, {
        shouldValidate: false,
        shouldDirty: false,
        shouldTouch: false
      });
    }
  }, [especialistasIds, elogio, loadingCorrelacao]); // Removido 'form' da dependência para evitar loops

  // Preencher grupo automaticamente quando categoria for selecionada
  useEffect(() => {
    console.log('🔄 [ELOGIOS] === INÍCIO DO PREENCHIMENTO AUTOMÁTICO ===');
    console.log('🔄 [ELOGIOS] Categoria selecionada:', categoriaSelecionada);
    console.log('🔄 [ELOGIOS] Grupos disponíveis:', grupos);
    console.log('🔄 [ELOGIOS] Quantidade de grupos:', grupos.length);
    
    if (categoriaSelecionada && grupos.length > 0) {
      console.log('✅ [ELOGIOS] Condições atendidas para preenchimento automático');
      
      // Se há apenas um grupo para a categoria, seleciona automaticamente
      if (grupos.length === 1) {
        console.log('✅ [ELOGIOS] Apenas 1 grupo disponível, preenchendo automaticamente:', grupos[0].value);
        form.setValue('grupo', grupos[0].value);
      }
      // Se há múltiplos grupos, verifica se o atual é válido
      else {
        const grupoAtual = form.getValues('grupo');
        const grupoValido = grupos.find(g => g.value === grupoAtual);
        console.log('🔍 [ELOGIOS] Múltiplos grupos disponíveis');
        console.log('🔍 [ELOGIOS] Grupo atual:', grupoAtual);
        console.log('🔍 [ELOGIOS] Grupo válido:', !!grupoValido);
        
        if (!grupoValido && grupoAtual) {
          console.log('🧹 [ELOGIOS] Limpando grupo inválido:', grupoAtual);
          form.setValue('grupo', undefined);
        }
      }
    } else if (!categoriaSelecionada) {
      // Se categoria foi limpa, limpa o grupo também
      console.log('🧹 [ELOGIOS] Categoria não selecionada, limpando grupo');
      form.setValue('grupo', undefined);
    } else {
      console.log('⏭️ [ELOGIOS] Condições não atendidas - categoria:', !!categoriaSelecionada, 'grupos:', grupos.length);
    }
    
    console.log('🔄 [ELOGIOS] === FIM DO PREENCHIMENTO AUTOMÁTICO ===');
  }, [categoriaSelecionada, grupos, form]);

  const handleSubmit = async (dados: ElogioFormData) => {
    // Validação manual: comentário obrigatório para elogios (sempre manuais)
    if (!dados.comentario_pesquisa || dados.comentario_pesquisa.trim() === '') {
      form.setError('comentario_pesquisa', {
        type: 'required',
        message: 'Comentário é obrigatório para elogios'
      });
      return;
    }
    
    console.log('📝 [ElogioForm] Dados do formulário antes do processamento:', dados);
    
    // Se há especialistas selecionados, converter para nomes e preencher o campo prestador
    if (dados.especialistas_ids && dados.especialistas_ids.length > 0) {
      try {
        console.log('🔄 [ElogioForm] Convertendo especialistas IDs para nomes:', dados.especialistas_ids);
        
        // Buscar nomes dos especialistas
        const { data: especialistas, error } = await supabase
          .from('especialistas')
          .select('id, nome')
          .in('id', dados.especialistas_ids)
          .order('nome');

        if (error) {
          console.error('❌ [ElogioForm] Erro ao buscar especialistas:', error);
          throw error;
        }

        const nomes = especialistas?.map(esp => esp.nome) || [];
        const nomesConcat = nomes.join(', ');
        
        console.log('✅ [ElogioForm] Nomes dos especialistas:', nomes);
        console.log('✅ [ElogioForm] Prestador concatenado:', nomesConcat);
        
        // Atualizar o campo prestador com os nomes concatenados
        dados.prestador = nomesConcat;
        
      } catch (error) {
        console.error('❌ [ElogioForm] Erro ao converter especialistas:', error);
        // Em caso de erro, manter o valor original do prestador
      }
    }
    
    console.log('📤 [ElogioForm] Dados finais enviados:', dados);
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
              render={({ field, fieldState }) => {
                // Adicionar "SONDA INTERNO" às empresas
                const empresasComSondaInterno = [
                  { 
                    id: 'sonda-interno', 
                    nome_completo: 'SONDA INTERNO', 
                    nome_abreviado: 'SONDA INTERNO',
                    status: 'ativo'
                  },
                  ...empresas.filter((empresa) => empresa.status === 'ativo')
                ].sort((a, b) => a.nome_abreviado.localeCompare(b.nome_abreviado, 'pt-BR'));
                
                return (
                  <FormItem>
                    <FormLabel>Empresa *</FormLabel>
                    <Select value={field.value || ''} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger className={cn(
                          fieldState.error && "border-red-500 focus:border-red-500"
                        )}>
                          <SelectValue placeholder="Selecione a empresa" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {empresasComSondaInterno.map(empresa => (
                          <SelectItem key={empresa.id} value={empresa.nome_completo}>
                            {empresa.nome_abreviado}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                );
              }}
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
              name="especialistas_ids"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Consultores</FormLabel>
                  <FormControl>
                    <MultiSelectEspecialistas
                      value={field.value || []}
                      onValueChange={(newValue) => {
                        console.log('📝 [ElogioForm] Mudança no campo especialistas_ids:', newValue);
                        // Usar setValue com forceUpdate para garantir que a mudança seja persistida
                        form.setValue('especialistas_ids', newValue, { 
                          shouldValidate: true,
                          shouldDirty: true,
                          shouldTouch: true
                        });
                        // Forçar re-render do campo
                        form.trigger('especialistas_ids');
                      }}
                      placeholder="Selecione os consultores..."
                    />
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
                  {grupos.length === 1 ? (
                    // Quando há apenas um grupo, mostra como campo readonly
                    <FormControl>
                      <div className="flex h-10 w-full rounded-md border border-input bg-muted px-3 py-2 text-sm">
                        {grupos[0].label}
                      </div>
                    </FormControl>
                  ) : (
                    // Quando há múltiplos grupos, mostra como select
                    <Select
                      value={field.value || ''}
                      onValueChange={(value) => {
                        console.log('🔄 [ELOGIOS] Grupo selecionado manualmente:', value);
                        field.onChange(value);
                      }}
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
                  )}
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
