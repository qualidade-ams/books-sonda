/**
 * Formulário de cadastro/edição de pesquisas
 */

import { useEffect } from 'react';
import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CalendarIcon, Check, ChevronsUpDown } from 'lucide-react';
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
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from '@/components/ui/command';
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
  const { data: categorias = [], isLoading: categoriasLoading } = useCategorias();
  
  console.log('🔍 [PesquisaForm] Categorias carregadas:', categorias);
  console.log('🔍 [PesquisaForm] Categorias loading:', categoriasLoading);
  console.log('🔍 [PesquisaForm] Quantidade de categorias:', categorias.length);

  // Estado para armazenar consultores manuais
  const [consultoresManuais, setConsultoresManuais] = React.useState<Array<{ label: string; value: string; email?: string }>>([]);

  // Determinar se é pesquisa manual (nova pesquisa ou pesquisa existente com origem manual)
  const isPesquisaManual = !pesquisa || pesquisa.origem === 'manual';

  const form = useForm<PesquisaFormData>({
    resolver: zodResolver(getPesquisaFormSchema(isPesquisaManual)),
    defaultValues: {
      empresa: '',
      cliente: '',
      categoria: '', // String vazia para garantir que o campo seja controlado
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
  const { ids: especialistasIdsRelacionados, isLoading: loadingRelacionados } = useEspecialistasIdsPesquisa(pesquisa?.id) as { ids: string[]; isLoading: boolean };
  
  console.log('🔍 [PesquisaForm] === DADOS DE ESPECIALISTAS ===');
  console.log('🔍 [PesquisaForm] Pesquisa ID:', pesquisa?.id);
  console.log('🔍 [PesquisaForm] Prestador:', pesquisa?.prestador);
  console.log('🔍 [PesquisaForm] IDs Relacionados (do banco):', especialistasIdsRelacionados);
  console.log('🔍 [PesquisaForm] Quantidade de IDs Relacionados:', especialistasIdsRelacionados.length);
  console.log('🔍 [PesquisaForm] Loading Relacionados:', loadingRelacionados);
  
  // Correlação automática baseada no campo prestador
  const correlacaoResult = useCorrelacaoMultiplosEspecialistas(
    pesquisa?.prestador && especialistasIdsRelacionados.length === 0 ? pesquisa.prestador : undefined
  );
  const especialistasIdsCorrelacionados = correlacaoResult.data ?? [];
  const loadingCorrelacao = correlacaoResult.isLoading;
  const loadingEspecialistasBase = correlacaoResult.loadingEspecialistasBase ?? false;
  
  console.log('🔍 [PesquisaForm] IDs Correlacionados (automático):', especialistasIdsCorrelacionados);
  console.log('🔍 [PesquisaForm] Quantidade de IDs Correlacionados:', especialistasIdsCorrelacionados.length);
  console.log('🔍 [PesquisaForm] Loading Correlação:', loadingCorrelacao);
  
  // Combinar loading states - incluir loading dos especialistas base
  const especialistasLoading = loadingRelacionados || loadingCorrelacao || loadingEspecialistasBase;
  console.log('🔍 [PesquisaForm] Especialistas Loading (combinado):', especialistasLoading, { loadingRelacionados, loadingCorrelacao, loadingEspecialistasBase });
  
  // Usar relacionamentos salvos ou correlação automática - GARANTIR UNICIDADE
  const especialistasIdsUnicos = [...new Set<string>(
    (especialistasIdsRelacionados.length > 0 
      ? especialistasIdsRelacionados 
      : especialistasIdsCorrelacionados) as string[]
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
  // Usar key baseada no ID da pesquisa para forçar re-render completo
  useEffect(() => {
    console.log('🔄 [PesquisaForm useEffect reset] === EXECUÇÃO ===');
    console.log('🔄 [PesquisaForm useEffect reset] pesquisa:', pesquisa?.id);
    console.log('🔄 [PesquisaForm useEffect reset] empresas.length:', empresas.length);
    console.log('🔄 [PesquisaForm useEffect reset] categorias.length:', categorias.length);
    console.log('🔄 [PesquisaForm useEffect reset] pesquisa.categoria:', pesquisa?.categoria);
    console.log('🔄 [PesquisaForm useEffect reset] pesquisa.grupo:', pesquisa?.grupo);
    
    // Aguardar empresas E categorias estarem carregadas
    if (pesquisa && empresas.length > 0 && categorias.length > 0) {
      // Tentar encontrar a empresa pelo nome completo ou abreviado
      const empresaEncontrada = empresas.find(
        e => e.nome_completo === pesquisa.empresa || e.nome_abreviado === pesquisa.empresa
      );
      
      // Usar o nome_completo se encontrou, senão usar o valor original
      const empresaValue = empresaEncontrada ? empresaEncontrada.nome_completo : pesquisa.empresa;
      
      const dadosReset = {
        empresa: empresaValue || '',
        cliente: pesquisa.cliente,
        categoria: pesquisa.categoria || '',
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
        especialistas_ids: especialistasIds.length > 0 ? especialistasIds : []
      };
      
      console.log('✅ [PesquisaForm useEffect reset] Dados para reset:', dadosReset);
      
      // Verificar se a categoria existe na lista de categorias disponíveis
      const categoriaExiste = categorias.some(cat => cat.value === pesquisa.categoria);
      
      // Resetar formulário
      form.reset(dadosReset, {
        keepDefaultValues: false,
        keepDirty: false,
        keepTouched: false,
        keepErrors: false,
        keepIsSubmitted: false,
        keepSubmitCount: false
      });
      
      // Resetar flag para permitir que o useEffect de especialistas rode novamente
      especialistasInicializados.current = false;
      processamentoEmAndamento.current = false;
      
      console.log('✅ [PesquisaForm useEffect reset] Reset executado');
      
      // Forçar atualização do campo categoria especificamente
      if (pesquisa.categoria && categoriaExiste) {
        form.setValue('categoria', pesquisa.categoria, {
          shouldValidate: true,
          shouldDirty: false,
          shouldTouch: false
        });
      } else if (pesquisa.categoria && !categoriaExiste) {
        console.warn('⚠️ [PesquisaForm useEffect reset] Categoria não encontrada na lista:', pesquisa.categoria);
      }
    } else {
      console.log('⚠️ [PesquisaForm useEffect reset] Condições não atendidas, pulando reset');
      if (!pesquisa) console.log('  - Sem pesquisa');
      if (empresas.length === 0) console.log('  - Empresas não carregadas');
      if (categorias.length === 0) console.log('  - Categorias não carregadas');
    }
  }, [pesquisa?.id, empresas.length, categorias.length, form]); // Adicionar categorias.length

  // Preencher especialistas separadamente - APENAS uma vez quando carregados
  // NÃO atualizar se o formulário já foi modificado pelo usuário
  // Usar ref para rastrear se já foi inicializado
  const especialistasInicializados = React.useRef(false);
  const processamentoEmAndamento = React.useRef(false);
  
  useEffect(() => {
    console.log('🔄 [PesquisaForm useEffect especialistas] === EXECUÇÃO DO USEEFFECT ===');
    console.log('🔄 [PesquisaForm useEffect especialistas] especialistasIds:', especialistasIds);
    console.log('🔄 [PesquisaForm useEffect especialistas] especialistasIds.length:', especialistasIds.length);
    console.log('🔄 [PesquisaForm useEffect especialistas] especialistasLoading:', especialistasLoading);
    console.log('🔄 [PesquisaForm useEffect especialistas] pesquisa:', pesquisa?.id);
    console.log('🔄 [PesquisaForm useEffect especialistas] form.formState.isDirty:', form.formState.isDirty);
    console.log('🔄 [PesquisaForm useEffect especialistas] form.formState.isSubmitting:', form.formState.isSubmitting);
    console.log('🔄 [PesquisaForm useEffect especialistas] especialistasInicializados.current:', especialistasInicializados.current);
    console.log('🔄 [PesquisaForm useEffect especialistas] processamentoEmAndamento.current:', processamentoEmAndamento.current);
    
    // NÃO atualizar se:
    // 1. Formulário está sendo enviado (isSubmitting)
    // 2. Especialistas já foram inicializados
    // 3. Processamento já está em andamento
    // 4. NOVO: Dados ainda estão carregando
    if (
      form.formState.isSubmitting || 
      especialistasInicializados.current || 
      processamentoEmAndamento.current ||
      especialistasLoading  // ← NOVA CONDIÇÃO: Aguardar dados estarem prontos
    ) {
      console.log('📋 [PesquisaForm useEffect especialistas] ⚠️ Pulando atualização - formulário em uso, já inicializado ou dados carregando');
      if (especialistasLoading) console.log('  - Dados ainda carregando...');
      return;
    }
    
    // Preencher especialistas apenas quando:
    // 1. Há uma pesquisa
    // 2. Há campo prestador
    // 3. Dados não estão mais carregando
    // 4. Há especialistas carregados OU loading terminou (pode não ter especialistas)
    if (pesquisa && pesquisa.prestador && !especialistasLoading) {
      console.log('📋 [PesquisaForm useEffect especialistas] ✅ Condições atendidas, processando...');
      
      // Marcar processamento como em andamento
      processamentoEmAndamento.current = true;
      
      // Função assíncrona para processar especialistas
      const processarEspecialistas = async () => {
        console.log('🔍 [processarEspecialistas] === INÍCIO ===');
        console.log('🔍 [processarEspecialistas] pesquisa.prestador:', pesquisa.prestador);
        console.log('🔍 [processarEspecialistas] especialistasIds:', especialistasIds);
        
        // Aguardar um pouco para garantir que os dados estejam estáveis
        await new Promise(resolve => setTimeout(resolve, 100));
        
        try {
          // Combinar especialistas do banco com consultores manuais extraídos do prestador
          const todosIds: string[] = [...especialistasIds];
          const consultoresManuaisExtraidos: Array<{ label: string; value: string; email?: string }> = [];
          
          // Se há campo prestador, extrair consultores manuais
          if (pesquisa.prestador) {
            console.log('📋 [processarEspecialistas] Prestador encontrado:', pesquisa.prestador);
            
            // Buscar nomes dos especialistas do banco para comparação
            const nomesEspecialistasDb = new Set<string>();
            if (especialistasIds.length > 0) {
              console.log('📋 [processarEspecialistas] Buscando nomes dos especialistas do banco...');
              const { data, error } = await supabase
                .from('especialistas')
                .select('nome')
                .in('id', especialistasIds);
              
              if (error) {
                console.error('❌ [processarEspecialistas] Erro ao buscar nomes:', error);
              } else if (data) {
                console.log('✅ [processarEspecialistas] Dados recebidos do banco:', data);
                data.forEach(esp => {
                  nomesEspecialistasDb.add(esp.nome.toLowerCase().trim());
                  console.log('  ➕ Nome adicionado ao Set:', esp.nome);
                });
                console.log('📋 [processarEspecialistas] Set completo de nomes do banco:', Array.from(nomesEspecialistasDb));
              }
            } else {
              console.log('⚠️ [processarEspecialistas] Nenhum especialista do banco para buscar');
            }
            
            // Separar nomes do prestador
            const nomesPrestador = pesquisa.prestador.split(',').map(n => n.trim()).filter(n => n);
            console.log('📋 [processarEspecialistas] Nomes no prestador (após split):', nomesPrestador);
            console.log('📋 [processarEspecialistas] Quantidade de nomes:', nomesPrestador.length);
            
            // Identificar quais nomes NÃO estão na tabela especialistas (são manuais)
            nomesPrestador.forEach((nome, index) => {
              console.log(`🔍 [processarEspecialistas] Verificando nome ${index + 1}/${nomesPrestador.length}: "${nome}"`);
              const estaNoSet = nomesEspecialistasDb.has(nome.toLowerCase().trim());
              console.log(`  🔍 Está no Set? ${estaNoSet}`);
              
              if (!estaNoSet) {
                // Este é um consultor manual
                const idManual = `manual_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                const consultor = {
                  label: nome,
                  value: idManual,
                  email: undefined
                };
                consultoresManuaisExtraidos.push(consultor);
                todosIds.push(idManual);
                console.log('  ➕ [processarEspecialistas] Consultor manual extraído:', consultor);
              } else {
                console.log('  ✅ [processarEspecialistas] Consultor do banco, ignorando');
              }
            });
            
            console.log('📊 [processarEspecialistas] RESUMO:');
            console.log('  - Total de nomes no prestador:', nomesPrestador.length);
            console.log('  - Nomes do banco:', nomesEspecialistasDb.size);
            console.log('  - Consultores manuais extraídos:', consultoresManuaisExtraidos.length);
            console.log('  - Consultores manuais:', consultoresManuaisExtraidos);
            
            // Atualizar consultores manuais no estado PRIMEIRO
            if (consultoresManuaisExtraidos.length > 0) {
              console.log('📋 [processarEspecialistas] Atualizando estado com consultores manuais:', consultoresManuaisExtraidos);
              setConsultoresManuais(consultoresManuaisExtraidos);
              
              // Aguardar um pouco para garantir que o estado foi atualizado
              await new Promise(resolve => setTimeout(resolve, 100));
            } else {
              console.log('⚠️ [processarEspecialistas] Nenhum consultor manual para adicionar ao estado');
            }
          } else {
            console.log('⚠️ [processarEspecialistas] Sem campo prestador');
          }
          
          // Atualizar campo com todos os IDs (banco + manuais)
          console.log('📋 [processarEspecialistas] Todos os IDs finais (banco + manuais):', todosIds);
          console.log('📋 [processarEspecialistas] Quantidade total de IDs:', todosIds.length);
          
          // Usar setValue com shouldDirty: false para não marcar como modificado
          form.setValue('especialistas_ids', todosIds, {
            shouldValidate: false,
            shouldDirty: false,
            shouldTouch: false
          });
          
          // Aguardar um pouco e forçar re-render
          await new Promise(resolve => setTimeout(resolve, 100));
          
          // Marcar como inicializado
          especialistasInicializados.current = true;
          processamentoEmAndamento.current = false;
          
          console.log('✅ [processarEspecialistas] Campo atualizado e marcado como inicializado');
          console.log('✅ [processarEspecialistas] Estado final do formulário:', form.getValues());
          console.log('🔍 [processarEspecialistas] === FIM ===');
        } catch (error) {
          console.error('❌ [processarEspecialistas] Erro durante processamento:', error);
          processamentoEmAndamento.current = false;
        }
      };
      
      // Executar processamento assíncrono
      processarEspecialistas();
    } else {
      console.log('📋 [PesquisaForm useEffect especialistas] ❌ Condições NÃO atendidas, pulando...');
      if (!pesquisa) console.log('  - Sem pesquisa');
      if (pesquisa && !pesquisa.prestador) console.log('  - Sem campo prestador');
      if (especialistasLoading) console.log('  - Dados ainda carregando');
    }
    console.log('🔄 [PesquisaForm useEffect especialistas] === FIM EXECUÇÃO DO USEEFFECT ===');
  }, [especialistasIds, pesquisa?.id, pesquisa?.prestador, especialistasLoading, form]); // ← Adicionar especialistasLoading nas dependências
  
  // Resetar flags quando pesquisa mudar (abrir outro modal)
  useEffect(() => {
    console.log('🔄 [PesquisaForm] Resetando flags para nova pesquisa:', pesquisa?.id);
    especialistasInicializados.current = false;
    processamentoEmAndamento.current = false;
    setConsultoresManuais([]); // Limpar consultores manuais ao trocar de pesquisa
  }, [pesquisa?.id]);

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
    console.log('📝 [PesquisaForm handleSubmit] === INÍCIO ===');
    console.log('📝 [PesquisaForm handleSubmit] Dados do formulário antes do processamento:', dados);
    console.log('📝 [PesquisaForm handleSubmit] Consultores manuais:', consultoresManuais);
    console.log('📝 [PesquisaForm handleSubmit] form.formState.isValid:', form.formState.isValid);
    console.log('📝 [PesquisaForm handleSubmit] form.formState.errors:', form.formState.errors);
    console.log('📝 [PesquisaForm handleSubmit] form.formState.isSubmitting:', form.formState.isSubmitting);
    
    // Validar manualmente antes de processar
    const isValid = await form.trigger();
    console.log('📝 [PesquisaForm handleSubmit] Validação manual (trigger):', isValid);
    
    if (!isValid) {
      console.error('❌ [PesquisaForm handleSubmit] Formulário inválido após trigger');
      console.error('❌ [PesquisaForm handleSubmit] Erros:', form.formState.errors);
      return; // Não prosseguir se inválido
    }
    
    // Se há especialistas selecionados, converter para nomes e preencher o campo prestador
    if (dados.especialistas_ids && dados.especialistas_ids.length > 0) {
      console.log('🔄 [PesquisaForm handleSubmit] Entrando no bloco de conversão de especialistas');
      try {
        console.log('🔄 [PesquisaForm handleSubmit] Convertendo especialistas IDs para nomes:', dados.especialistas_ids);
        
        // Separar IDs do banco de dados e IDs manuais
        const idsDb = dados.especialistas_ids.filter(id => !id.startsWith('manual_'));
        const idsManuais = dados.especialistas_ids.filter(id => id.startsWith('manual_'));
        
        console.log('🔄 [PesquisaForm handleSubmit] IDs do banco:', idsDb);
        console.log('🔄 [PesquisaForm handleSubmit] IDs manuais:', idsManuais);
        
        const nomes: string[] = [];
        
        // Buscar nomes dos especialistas do banco de dados
        if (idsDb.length > 0) {
          console.log('🔄 [PesquisaForm handleSubmit] Buscando especialistas do banco...');
          const { data: especialistas, error } = await supabase
            .from('especialistas')
            .select('id, nome')
            .in('id', idsDb)
            .order('nome');

          if (error) {
            console.error('❌ [PesquisaForm handleSubmit] Erro ao buscar especialistas:', error);
            throw error;
          }

          if (especialistas) {
            console.log('✅ [PesquisaForm handleSubmit] Especialistas encontrados:', especialistas);
            nomes.push(...especialistas.map(esp => esp.nome));
          }
        } else {
          console.log('⚠️ [PesquisaForm handleSubmit] Nenhum ID do banco para buscar');
        }
        
        // Adicionar nomes dos consultores manuais (apenas os nomes, sem criar no banco)
        if (idsManuais.length > 0) {
          console.log('🔄 [PesquisaForm handleSubmit] Processando consultores manuais...');
          const nomesManuais = consultoresManuais
            .filter(c => idsManuais.includes(c.value))
            .map(c => c.label);
          nomes.push(...nomesManuais);
          console.log('✅ [PesquisaForm handleSubmit] Nomes dos consultores manuais:', nomesManuais);
          console.log('ℹ️ [PesquisaForm handleSubmit] Consultores manuais serão salvos apenas no campo prestador (não na tabela especialistas)');
        } else {
          console.log('⚠️ [PesquisaForm handleSubmit] Nenhum consultor manual para processar');
        }
        
        const nomesConcat = nomes.join(', ');
        
        console.log('✅ [PesquisaForm handleSubmit] Todos os nomes:', nomes);
        console.log('✅ [PesquisaForm handleSubmit] Prestador concatenado:', nomesConcat);
        console.log('✅ [PesquisaForm handleSubmit] IDs para relacionamento (apenas do banco):', idsDb);
        
        // Atualizar o campo prestador com os nomes concatenados (inclui manuais)
        dados.prestador = nomesConcat;
        
        // Usar apenas IDs do banco para relacionamentos (consultores manuais ficam só no prestador)
        dados.especialistas_ids = idsDb;
        
        console.log('✅ [PesquisaForm handleSubmit] Dados atualizados - prestador:', dados.prestador);
        console.log('✅ [PesquisaForm handleSubmit] Dados atualizados - especialistas_ids:', dados.especialistas_ids);
        
      } catch (error) {
        console.error('❌ [PesquisaForm handleSubmit] Erro ao converter especialistas:', error);
        // Em caso de erro, manter o valor original do prestador
      }
    } else {
      console.log('⚠️ [PesquisaForm handleSubmit] Nenhum especialista selecionado');
    }
    
    console.log('📤 [PesquisaForm handleSubmit] Dados finais enviados:', dados);
    console.log('📤 [PesquisaForm handleSubmit] Chamando onSubmit...');
    onSubmit(dados);
    console.log('✅ [PesquisaForm handleSubmit] onSubmit chamado com sucesso');
    console.log('📝 [PesquisaForm handleSubmit] === FIM ===');
  };

  const isOrigemSqlServer = pesquisa?.origem === 'sql_server';
  const anoAtual = new Date().getFullYear();
  const anosDisponiveis = Array.from({ length: 10 }, (_, i) => anoAtual - i);

  return (
    <Form {...form} key={`pesquisa-form-${pesquisa?.id || 'novo'}`}>
      <form 
        onSubmit={(e) => {
          console.log('📝 [PesquisaForm] === EVENTO SUBMIT CAPTURADO ===');
          console.log('📝 [PesquisaForm] Event:', e);
          console.log('📝 [PesquisaForm] form.formState.isSubmitting:', form.formState.isSubmitting);
          console.log('📝 [PesquisaForm] form.formState.isValid:', form.formState.isValid);
          console.log('📝 [PesquisaForm] form.formState.errors:', form.formState.errors);
          form.handleSubmit(handleSubmit)(e);
        }} 
        className="space-y-6"
      >

        {/* Seção: Dados Principais */}
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
                        {empresasComSondaInterno.map(empresa => (
                          <SelectItem key={empresa.id} value={empresa.nome_completo}>
                            {empresa.nome_abreviado}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </FormItem>
                );
              }}
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

            {showSolicitante && (
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
            )}
          </div>

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
                      console.log('📝 [PesquisaForm] Consultores manuais atualizados via callback:', consultores);
                      setConsultoresManuais(consultores);
                    }}
                    initialConsultoresManuais={consultoresManuais}
                    placeholder="Selecione os consultores..."
                    className={cn(
                      fieldState.error && "border-red-500"
                    )}
                    // Usar key para forçar re-render quando consultores manuais mudarem
                    key={`especialistas-${pesquisa?.id || 'novo'}-${consultoresManuais.length}`}
                  />
                </FormControl>
              </FormItem>
            )}
          />
        </div>

        {/* Seção: Categorização */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Categorização</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="categoria"
              render={({ field, fieldState }) => {
                console.log('🎨 [PesquisaForm render categoria] field.value:', field.value);
                console.log('🎨 [PesquisaForm render categoria] fieldState.error:', fieldState.error);
                
                // Estado local para controlar a busca
                const [searchCategoria, setSearchCategoria] = React.useState('');
                
                // Filtrar categorias baseado na busca
                const categoriasFiltradas = React.useMemo(() => {
                  if (!searchCategoria.trim()) {
                    return categorias;
                  }
                  
                  const termoBusca = searchCategoria.toLowerCase().trim();
                  
                  return categorias.filter((categoria) => {
                    const labelLower = categoria.label.toLowerCase();
                    
                    // Busca genérica: verifica se o termo aparece em qualquer parte do label
                    if (labelLower.includes(termoBusca)) return true;
                    
                    // Buscar por início de palavras individuais
                    const palavras = labelLower.split(/[.\s&]+/);
                    
                    return palavras.some(palavra => palavra.startsWith(termoBusca));
                  });
                }, [searchCategoria, categorias]);
                
                return (
                  <FormItem className="flex flex-col">
                    <FormLabel>Categoria <span className="text-foreground">*</span></FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            role="combobox"
                            className={cn(
                              "w-full justify-between",
                              !field.value && "text-muted-foreground",
                              fieldState.error && "border-red-500 focus:border-red-500"
                            )}
                          >
                            {field.value
                              ? categorias.find((categoria) => categoria.value === field.value)?.label
                              : "Selecione a categoria"}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-full p-0" align="start">
                        <Command shouldFilter={false}>
                          <CommandInput 
                            placeholder="Buscar categoria..." 
                            value={searchCategoria}
                            onValueChange={setSearchCategoria}
                          />
                          <CommandList>
                            <CommandEmpty>Nenhuma categoria encontrada.</CommandEmpty>
                            <CommandGroup>
                              {categoriasFiltradas.map((categoria) => (
                                <CommandItem
                                  key={categoria.value}
                                  value={categoria.value}
                                  onSelect={() => {
                                    console.log('📝 [PesquisaForm categoria onChange] Novo valor:', categoria.value);
                                    field.onChange(categoria.value);
                                    setSearchCategoria(''); // Limpar busca após seleção
                                  }}
                                >
                                  <Check
                                    className={cn(
                                      "mr-2 h-4 w-4",
                                      categoria.value === field.value
                                        ? "opacity-100"
                                        : "opacity-0"
                                    )}
                                  />
                                  {categoria.label}
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                );
              }}
            />

            <FormField
              control={form.control}
              name="grupo"
              render={({ field, fieldState }) => (
                <FormItem className="flex flex-col">
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
                      inputMode="numeric"
                      value={field.value || ''}
                      onChange={(e) => {
                        const valor = e.target.value.replace(/\D/g, '');
                        field.onChange(valor);
                      }}
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
          <Button 
            type="submit" 
            disabled={isLoading}
            onClick={(e) => {
              console.log('🖱️ [PesquisaForm] === BOTÃO ATUALIZAR CLICADO ===');
              console.log('🖱️ [PesquisaForm] Event:', e);
              console.log('🖱️ [PesquisaForm] isLoading:', isLoading);
              console.log('🖱️ [PesquisaForm] form.formState.isSubmitting:', form.formState.isSubmitting);
              console.log('🖱️ [PesquisaForm] form.formState.isValid:', form.formState.isValid);
              console.log('🖱️ [PesquisaForm] form.formState.errors:', form.formState.errors);
              console.log('🖱️ [PesquisaForm] form.formState.isDirty:', form.formState.isDirty);
              console.log('🖱️ [PesquisaForm] Valores do formulário:', form.getValues());
              // Não prevenir o comportamento padrão - deixar o submit acontecer naturalmente
            }}
          >
            {isLoading ? 'Salvando...' : pesquisa ? 'Atualizar' : 'Criar'}
          </Button>
        </div>
      </form>
    </Form>
  );
}
