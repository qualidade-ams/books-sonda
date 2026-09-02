/**
 * Formulário de cadastro/edição de elogios
 */

import { useEffect, useRef, useState } from 'react';
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
import { useCategorias } from '@/hooks/useDeParaCategoria';
import { MultiSelectEspecialistas, type EspecialistaOption } from '@/components/ui/multi-select-especialistas';
import { useEspecialistasIdsElogio } from '@/hooks/useEspecialistasRelacionamentos';
import { useCorrelacaoMultiplosEspecialistas } from '@/hooks/useCorrelacaoEspecialistas';
import { useEspecialistasComBusca } from '@/hooks/useEspecialistasOtimizado';

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
  
  // Flag para controlar se o formulário já foi preenchido com os dados do elogio
  const formPopulatedRef = useRef(false);
  const especialistasPopulatedRef = useRef(false);

  // Consultores manuais (IDs "manual_...") gerados/selecionados no MultiSelect.
  // Estado "vivo" alimentado pelo callback onConsultoresManuaisChange — é a fonte de
  // verdade usada no submit para compor o campo prestador.
  const [consultoresManuais, setConsultoresManuais] = useState<EspecialistaOption[]>([]);

  // Consultores manuais reconstruídos a partir do prestador ao ABRIR para edição.
  // Estado separado (só de entrada) passado como initialConsultoresManuais ao MultiSelect,
  // para evitar ciclo de feedback com o callback onConsultoresManuaisChange.
  const [manuaisIniciais, setManuaisIniciais] = useState<EspecialistaOption[]>([]);

  // Controla se os consultores manuais já foram reconstruídos a partir do prestador
  // (para edição), evitando reprocessar a cada render.
  const manuaisReconstruidosRef = useRef(false);
  
  // Reset da flag quando o elogio muda (ex: abrir outro elogio)
  useEffect(() => {
    formPopulatedRef.current = false;
    especialistasPopulatedRef.current = false;
    manuaisReconstruidosRef.current = false;
    setConsultoresManuais([]);
    setManuaisIniciais([]);
  }, [elogio?.id]);
  
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

  // Lista completa de especialistas do banco (mesma fonte da correlação) —
  // usada para reconstruir consultores manuais de forma confiável, sem query extra.
  const { todosEspecialistas, isLoading: loadingEspecialistasBase } = useEspecialistasComBusca();

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
    console.log('🔄 [ELOGIOS] Formulário já preenchido:', formPopulatedRef.current);
    
    // Aguardar carregamento de empresas E categorias antes de preencher
    if (elogio && empresas.length > 0 && categorias.length > 0 && !formPopulatedRef.current) {
      console.log('✅ [ELOGIOS] Todas as dependências carregadas, preenchendo formulário');
      
      const empresaEncontrada = empresas.find(
        e => e.nome_completo === elogio.pesquisa?.empresa || e.nome_abreviado === elogio.pesquisa?.empresa
      );
      
      const empresaValue = empresaEncontrada ? empresaEncontrada.nome_completo : elogio.pesquisa?.empresa || '';
      
      // Trim nos valores de categoria e grupo para garantir correspondência
      const categoriaValue = elogio.pesquisa?.categoria?.trim() || undefined;
      const grupoValue = elogio.pesquisa?.grupo?.trim() || undefined;
      
      console.log('📋 [ELOGIOS] Dados do elogio a serem preenchidos:');
      console.log('  - Categoria:', categoriaValue);
      console.log('  - Grupo:', grupoValue);
      
      form.reset({
        empresa: empresaValue,
        cliente: elogio.pesquisa?.cliente || '',
        email_cliente: elogio.pesquisa?.email_cliente || '',
        prestador: elogio.pesquisa?.prestador || '',
        categoria: categoriaValue,
        grupo: grupoValue,
        tipo_caso: elogio.pesquisa?.tipo_caso || undefined,
        nro_caso: elogio.pesquisa?.nro_caso || elogio.chamado || '',
        data_resposta: elogio.data_resposta ? new Date(elogio.data_resposta) : undefined,
        resposta: elogio.pesquisa?.resposta || 'Muito Satisfeito',
        comentario_pesquisa: elogio.pesquisa?.comentario_pesquisa || '',
        observacao: elogio.observacao || '',
        especialistas_ids: especialistasIds.length > 0 ? especialistasIds : []
      });
      
      // Se já temos especialistas, marcar como populado para não sobrescrever
      if (especialistasIds.length > 0) {
        especialistasPopulatedRef.current = true;
      }
      
      formPopulatedRef.current = true;
      console.log('✅ [ELOGIOS] Formulário preenchido com sucesso');
    } else {
      console.log('⏳ [ELOGIOS] Aguardando carregamento das dependências...');
    }
  }, [elogio, empresas, categorias]); // Removido 'form' da dependência para evitar loops

  // Preencher especialistas separadamente - APENAS uma vez quando carregados
  useEffect(() => {
    if (!loadingCorrelacao && especialistasIds.length > 0 && elogio && !especialistasPopulatedRef.current) {
      console.log('📋 [ELOGIOS] Preenchendo especialistas (apenas uma vez):', especialistasIds);
      form.setValue('especialistas_ids', especialistasIds, {
        shouldValidate: false,
        shouldDirty: false,
        shouldTouch: false
      });
      especialistasPopulatedRef.current = true;
    }
  }, [especialistasIds, elogio, loadingCorrelacao]); // Removido 'form' da dependência para evitar loops

  // Reconstruir consultores manuais a partir do campo prestador (para edição).
  // Espelha o comportamento do PesquisaForm: os nomes presentes no `prestador` que NÃO
  // correspondem a nenhum especialista do banco são consultores manuais. Recriamos um
  // chip "manual_..." para cada um, de modo que reapareçam no MultiSelect ao reeditar e
  // não sejam perdidos no próximo salvamento.
  useEffect(() => {
    const prestador = elogio?.pesquisa?.prestador;

    // Aguardar as dependências assíncronas estabilizarem antes de reconstruir:
    // - correlação de nomes concluída
    // - lista base de especialistas carregada (para comparar nomes com segurança)
    if (
      !elogio ||
      !prestador ||
      loadingCorrelacao ||
      loadingEspecialistasBase ||
      todosEspecialistas.length === 0 ||
      manuaisReconstruidosRef.current
    ) {
      return;
    }

    // Nomes que já correspondem a especialistas do banco (via IDs relacionados/correlacionados).
    // Resolvidos a partir da lista em memória — sem query assíncrona, evitando timing/RLS.
    const idsDoBanco = new Set(especialistasIds);
    const nomesDoBanco = new Set<string>();
    todosEspecialistas.forEach(esp => {
      if (idsDoBanco.has(esp.id) && esp.nome) {
        nomesDoBanco.add(esp.nome.toLowerCase().trim());
      }
    });

    // Nomes presentes no prestador que NÃO correspondem a especialistas do banco → manuais
    const nomesPrestador = prestador.split(/[,;|\n]/).map(n => n.trim()).filter(Boolean);
    const manuaisExtraidos: EspecialistaOption[] = [];
    const idsManuais: string[] = [];

    nomesPrestador.forEach(nome => {
      if (!nomesDoBanco.has(nome.toLowerCase().trim())) {
        const idManual = `manual_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        manuaisExtraidos.push({ label: nome, value: idManual });
        idsManuais.push(idManual);
      }
    });

    manuaisReconstruidosRef.current = true;

    if (manuaisExtraidos.length > 0) {
      console.log('📋 [ElogioForm] Consultores manuais reconstruídos do prestador:', manuaisExtraidos.map(c => c.label));
      // manuaisIniciais → alimenta o MultiSelect para exibir os chips (M)
      setManuaisIniciais(manuaisExtraidos);
      // consultoresManuais → fonte de verdade para o submit (caso salve sem editar o seletor)
      setConsultoresManuais(manuaisExtraidos);

      // Adicionar os IDs manuais ao campo, preservando os IDs do banco já presentes
      const idsAtuais = form.getValues('especialistas_ids') || [];
      const idsCombinados = [...new Set([...idsAtuais, ...idsManuais])];
      form.setValue('especialistas_ids', idsCombinados, {
        shouldValidate: false,
        shouldDirty: false,
        shouldTouch: false
      });
    }
  }, [elogio, especialistasIds, loadingCorrelacao, loadingEspecialistasBase, todosEspecialistas]); // 'form' omitido intencionalmente

  // Preencher grupo automaticamente quando categoria for selecionada
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

        // Separar IDs do banco de dados e IDs manuais.
        // IDs manuais (começam com "manual_") NÃO são UUIDs válidos e não existem
        // na tabela especialistas — não podem ser usados em queries nem em FKs.
        const idsDb = dados.especialistas_ids.filter(id => !id.startsWith('manual_'));
        const idsManuais = dados.especialistas_ids.filter(id => id.startsWith('manual_'));

        console.log('🔄 [ElogioForm] IDs do banco:', idsDb);
        console.log('🔄 [ElogioForm] IDs manuais:', idsManuais);

        const nomes: string[] = [];

        // Buscar nomes apenas dos especialistas do banco de dados
        if (idsDb.length > 0) {
          const { data: especialistas, error } = await supabase
            .from('especialistas')
            .select('id, nome')
            .in('id', idsDb)
            .order('nome');

          if (error) {
            console.error('❌ [ElogioForm] Erro ao buscar especialistas:', error);
            throw error;
          }

          nomes.push(...(especialistas?.map(esp => esp.nome) || []));
        }

        // Adicionar nomes dos consultores manuais (apenas nomes, sem persistir no banco).
        // Combinar as duas fontes de labels (estado vivo + reconstruídos) para garantir
        // que nenhum consultor manual seja perdido por descompasso de sincronização.
        if (idsManuais.length > 0) {
          const mapaManuais = new Map<string, string>();
          [...manuaisIniciais, ...consultoresManuais].forEach(c => {
            if (c?.value && c?.label) mapaManuais.set(c.value, c.label);
          });

          const nomesManuais = idsManuais
            .map(id => mapaManuais.get(id))
            .filter((label): label is string => Boolean(label));

          nomes.push(...nomesManuais);

          const idsSemNome = idsManuais.filter(id => !mapaManuais.has(id));
          if (idsSemNome.length > 0) {
            console.warn('⚠️ [ElogioForm] IDs manuais sem nome correspondente (ignorados):', idsSemNome.length);
          }
          console.log('ℹ️ [ElogioForm] Consultores manuais salvos apenas no campo prestador:', nomesManuais);
        }

        const nomesConcat = nomes.join(', ');

        console.log('✅ [ElogioForm] Nomes dos especialistas:', nomes);
        console.log('✅ [ElogioForm] Prestador concatenado:', nomesConcat);

        // Atualizar o campo prestador com os nomes concatenados (inclui manuais)
        dados.prestador = nomesConcat;

        // Usar apenas IDs do banco para os relacionamentos em elogio_especialistas
        dados.especialistas_ids = idsDb;

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
                      onConsultoresManuaisChange={setConsultoresManuais}
                      initialConsultoresManuais={manuaisIniciais}
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
                  <FormLabel>Grupo</FormLabel>
                  <Select
                    value={field.value || ''}
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o grupo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categorias.map(grupo => (
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
