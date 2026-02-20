/**
 * Página para gerenciamento de taxas de clientes
 */

import { useState, useMemo } from 'react';
import { Plus, Edit, Trash2, Eye, ArrowUpDown, ArrowUp, ArrowDown, Filter, Download, ChevronDown, FileSpreadsheet, FileText, Search, ChevronLeft, ChevronRight, X, AlertTriangle, Check } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import LayoutAdmin from '@/components/admin/LayoutAdmin';
import { TaxaForm, TaxaPadraoForm, TaxaPadraoHistorico } from '@/components/admin/taxas';
import type { TaxaPadraoData } from '@/components/admin/taxas/TaxaPadraoForm';
import { useTaxas, useCriarTaxa, useAtualizarTaxa, useDeletarTaxa } from '@/hooks/useTaxasClientes';
import { useEmpresas } from '@/hooks/useEmpresas';
import { useCriarTaxaPadrao } from '@/hooks/useTaxasPadrao';
import type { TaxaClienteCompleta, TaxaFormData } from '@/types/taxasClientes';
import { calcularValores, getFuncoesPorProduto, getCamposEspecificosPorCliente, clienteTemCamposEspecificos } from '@/types/taxasClientes';
import { useVirtualPagination } from '@/utils/requerimentosPerformance';

type OrdenacaoColuna = 'cliente' | 'tipo_produto' | 'vigencia_inicio' | 'vigencia_fim' | 'status';
type DirecaoOrdenacao = 'asc' | 'desc' | null;

function CadastroTaxasClientes() {
  const [modalAberto, setModalAberto] = useState(false);
  const [taxaEditando, setTaxaEditando] = useState<TaxaClienteCompleta | null>(null);
  const [taxaVisualizando, setTaxaVisualizando] = useState<TaxaClienteCompleta | null>(null);
  const [modalVisualizarAberto, setModalVisualizarAberto] = useState(false);
  const [modalTaxaPadraoAberto, setModalTaxaPadraoAberto] = useState(false);
  const [tipoProdutoTaxaPadrao, setTipoProdutoTaxaPadrao] = useState<'GALLERY' | 'OUTROS'>('GALLERY');
  const [colunaOrdenacao, setColunaOrdenacao] = useState<OrdenacaoColuna>('cliente');
  const [direcaoOrdenacao, setDirecaoOrdenacao] = useState<DirecaoOrdenacao>('asc');
  
  // Estados para modal de exclusão
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [taxaParaExcluir, setTaxaParaExcluir] = useState<TaxaClienteCompleta | null>(null);
  
  // Estado para dados iniciais ao criar taxa a partir da aba "Clientes Sem Taxa"
  const [dadosIniciaisTaxa, setDadosIniciaisTaxa] = useState<{
    clienteId?: string;
    tipoProduto?: 'GALLERY' | 'OUTROS';
  } | null>(null);
  
  // Estado da aba ativa
  const [abaAtiva, setAbaAtiva] = useState<'taxas_cadastradas' | 'clientes_sem_taxa'>('taxas_cadastradas');
  
  // Estados de filtro - Aba 1
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [filtroCliente, setFiltroCliente] = useState('');
  const [filtroTipoProduto, setFiltroTipoProduto] = useState<string>('todos');
  const [filtroStatus, setFiltroStatus] = useState<string>('vigente'); // ✅ PADRÃO: Vigente (query otimizada)
  const [filtroTipoTaxa, setFiltroTipoTaxa] = useState<string>('todos');
  const [filtroTipoCalculo, setFiltroTipoCalculo] = useState<string>('todos');
  const [exportando, setExportando] = useState(false);
  
  // Estados de filtro - Aba 2 (Clientes Sem Taxa)
  const [mostrarFiltrosAba2, setMostrarFiltrosAba2] = useState(false);
  const [filtroClienteAba2, setFiltroClienteAba2] = useState('');
  const [filtroTipoProdutoAba2, setFiltroTipoProdutoAba2] = useState<string>('todos');
  const [filtroStatusAba2, setFiltroStatusAba2] = useState<string>('todos');
  
  // Estados de paginação
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  // Queries e mutations
  // ✅ OTIMIZADO: Query dinâmica baseada no filtro de status
  // - Se filtro = "vigente": Busca apenas vigentes (otimizado)
  // - Se filtro != "vigente": Busca todas as taxas (permite filtrar não vigentes e vencidas)
  const { data: taxasBackend = [], isLoading, refetch } = useTaxas({ 
    vigente: filtroStatus === 'vigente' ? true : undefined 
  });
  const { empresas = [], isLoading: isLoadingEmpresas } = useEmpresas({ status: ['ativo'] });
  const criarTaxa = useCriarTaxa();
  const atualizarTaxa = useAtualizarTaxa();
  const deletarTaxa = useDeletarTaxa();
  const criarTaxaPadrao = useCriarTaxaPadrao();

  const handleNovaTaxa = () => {
    setTaxaEditando(null);
    setDadosIniciaisTaxa(null);
    setModalAberto(true);
  };

  const handleAbrirTaxaPadrao = () => {
    setModalTaxaPadraoAberto(true);
  };

  const handleSalvarTaxaPadrao = async (dados: TaxaPadraoData) => {
    await criarTaxaPadrao.mutateAsync(dados);
    setModalTaxaPadraoAberto(false);
  };

  const handleEditarTaxa = (taxa: TaxaClienteCompleta) => {
    setTaxaEditando(taxa);
    setModalAberto(true);
  };

  const handleVisualizarTaxa = (taxa: TaxaClienteCompleta) => {
    setTaxaVisualizando(taxa);
    setModalVisualizarAberto(true);
  };

  const handleDeletarTaxa = (taxa: TaxaClienteCompleta) => {
    setTaxaParaExcluir(taxa);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!taxaParaExcluir) return;
    
    try {
      console.log('🗑️ [HANDLE DELETE] Iniciando deleção da taxa ID:', taxaParaExcluir.id);
      
      await deletarTaxa.mutateAsync(taxaParaExcluir.id);
      
      console.log('✅ [HANDLE DELETE] Taxa deletada com sucesso via mutation');
      
      setShowDeleteModal(false);
      setTaxaParaExcluir(null);
      
      // Aguardar um pouco para garantir que a deleção foi processada no servidor
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Forçar refetch imediato
      await refetch();
      
      console.log('✅ [HANDLE DELETE] Cache invalidado e dados recarregados');
      
    } catch (error) {
      console.error('❌ [HANDLE DELETE] Erro ao deletar taxa:', error);
      
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      console.error('❌ [HANDLE DELETE] Mensagem de erro:', errorMessage);
      
      toast.error(`Erro ao deletar taxa: ${errorMessage}`);
      
      if (errorMessage.includes('RLS') || errorMessage.includes('permiss')) {
        toast.error('Possível problema de permissões. Verifique se você tem acesso para deletar esta taxa.', {
          duration: 5000
        });
      }
    }
  };

  const handleSubmit = async (dados: TaxaFormData) => {
    console.log('🔄 [CADASTRO TAXAS] handleSubmit chamado');
    console.log('📊 [CADASTRO TAXAS] Dados recebidos:', dados);
    console.log('🔧 [CADASTRO TAXAS] Taxa editando:', taxaEditando);
    console.log('🔧 [CADASTRO TAXAS] ID da taxa:', taxaEditando?.id);
    
    try {
      if (taxaEditando) {
        console.log('✏️ [CADASTRO TAXAS] Atualizando taxa existente...');
        await atualizarTaxa.mutateAsync({ id: taxaEditando.id, dados });
        console.log('✅ [CADASTRO TAXAS] Taxa atualizada com sucesso');
      } else {
        console.log('➕ [CADASTRO TAXAS] Criando nova taxa...');
        await criarTaxa.mutateAsync(dados);
        console.log('✅ [CADASTRO TAXAS] Taxa criada com sucesso');
      }
      setModalAberto(false);
      setTaxaEditando(null);
      setDadosIniciaisTaxa(null); // Limpar dados iniciais após salvar
      await refetch();
    } catch (error) {
      console.error('❌ [CADASTRO TAXAS] Erro ao salvar taxa:', error);
      toast.error(`Erro ao salvar taxa: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  };

  const verificarVigente = (vigenciaInicio: string, vigenciaFim?: string) => {
    const hoje = new Date().toISOString().split('T')[0];
    const inicioValido = vigenciaInicio <= hoje;
    const fimValido = !vigenciaFim || vigenciaFim >= hoje;
    return inicioValido && fimValido;
  };

  // Função para obter o status detalhado da taxa
  const obterStatusTaxa = (vigenciaInicio: string, vigenciaFim?: string): 'vigente' | 'nao_vigente' | 'vencida' => {
    const hoje = new Date().toISOString().split('T')[0];
    const inicioValido = vigenciaInicio <= hoje;
    const fimValido = !vigenciaFim || vigenciaFim >= hoje;
    
    // Taxa vigente: já começou e ainda não terminou
    if (inicioValido && fimValido) {
      return 'vigente';
    }
    
    // Taxa vencida: data de fim já passou
    if (vigenciaFim && vigenciaFim < hoje) {
      return 'vencida';
    }
    
    // Taxa não vigente: data de início ainda não chegou
    return 'nao_vigente';
  };

  // Função para alternar ordenação
  const handleOrdenar = (coluna: OrdenacaoColuna) => {
    if (colunaOrdenacao === coluna) {
      // Se já está ordenando por esta coluna, alternar direção
      if (direcaoOrdenacao === 'asc') {
        setDirecaoOrdenacao('desc');
      } else if (direcaoOrdenacao === 'desc') {
        setDirecaoOrdenacao(null);
        setColunaOrdenacao('cliente'); // Voltar para ordenação padrão
      } else {
        setDirecaoOrdenacao('asc');
      }
    } else {
      // Nova coluna, começar com ascendente
      setColunaOrdenacao(coluna);
      setDirecaoOrdenacao('asc');
    }
  };

  // Renderizar ícone de ordenação
  const renderIconeOrdenacao = (coluna: OrdenacaoColuna) => {
    if (colunaOrdenacao !== coluna || !direcaoOrdenacao) {
      return <ArrowUpDown className="h-3 w-3 ml-1 opacity-50" />;
    }
    return direcaoOrdenacao === 'asc' 
      ? <ArrowUp className="h-3 w-3 ml-1" />
      : <ArrowDown className="h-3 w-3 ml-1" />;
  };

  // Função para limpar todos os filtros
  const limparFiltros = () => {
    setFiltroCliente('');
    setFiltroTipoProduto('todos');
    setFiltroStatus('vigente'); // ✅ PADRÃO: Voltar para vigente (query otimizada)
    setFiltroTipoTaxa('todos');
    setFiltroTipoCalculo('todos');
    setCurrentPage(1);
  };

  // Função para limpar filtros da Aba 2
  const limparFiltrosAba2 = () => {
    setFiltroClienteAba2('');
    setFiltroTipoProdutoAba2('todos');
    setFiltroStatusAba2('todos');
    setCurrentPage(1);
  };

  // Filtrar e ordenar taxas
  const taxasFiltradas = useMemo(() => {
    let resultado = [...taxasBackend];

    // Filtro por cliente
    if (filtroCliente) {
      resultado = resultado.filter(taxa =>
        taxa.cliente?.nome_abreviado?.toLowerCase().includes(filtroCliente.toLowerCase()) ||
        taxa.cliente?.nome_completo?.toLowerCase().includes(filtroCliente.toLowerCase())
      );
    }

    // Filtro por tipo de produto
    if (filtroTipoProduto !== 'todos') {
      resultado = resultado.filter(taxa => {
        if (filtroTipoProduto === 'GALLERY') {
          return taxa.tipo_produto === 'GALLERY';
        } else {
          // Para COMEX ou FISCAL, verificar se o cliente tem esse produto
          if (taxa.tipo_produto === 'OUTROS') {
            const cliente = taxa.cliente as TaxaClienteCompleta['cliente'];
            const produtosCliente = cliente?.produtos?.map((p) => p.produto) || [];
            return produtosCliente.includes(filtroTipoProduto);
          }
          return false;
        }
      });
    }

    // Filtro por status
    if (filtroStatus !== 'todos') {
      resultado = resultado.filter(taxa => {
        const statusTaxa = obterStatusTaxa(taxa.vigencia_inicio, taxa.vigencia_fim);
        
        if (filtroStatus === 'vigente') return statusTaxa === 'vigente';
        if (filtroStatus === 'nao_vigente') return statusTaxa === 'nao_vigente';
        if (filtroStatus === 'vencida') return statusTaxa === 'vencida';
        
        return true;
      });
    }

    // Filtro por tipo de taxa (Personalizada/Padrão/Automática)
    if (filtroTipoTaxa !== 'todos') {
      resultado = resultado.filter(taxa => {
        const isPersonalizada = taxa.personalizado === true;
        const isPadrao = !taxa.personalizado && taxa.cliente?.tem_ams === false;
        const isAutomatica = !taxa.personalizado && taxa.cliente?.tem_ams !== false;
        
        if (filtroTipoTaxa === 'personalizada') return isPersonalizada;
        if (filtroTipoTaxa === 'padrao') return isPadrao;
        if (filtroTipoTaxa === 'automatica') return isAutomatica;
        
        return true;
      });
    }

    // Filtro por tipo de cálculo
    if (filtroTipoCalculo !== 'todos') {
      resultado = resultado.filter(taxa => taxa.tipo_calculo_adicional === filtroTipoCalculo);
    }

    return resultado;
  }, [taxasBackend, filtroCliente, filtroTipoProduto, filtroStatus, filtroTipoTaxa, filtroTipoCalculo]);

  // Ordenar taxas filtradas
  const taxasOrdenadas = useMemo(() => {
    if (!direcaoOrdenacao) return taxasFiltradas;

    return [...taxasFiltradas].sort((a, b) => {
      let valorA: any;
      let valorB: any;

      switch (colunaOrdenacao) {
        case 'cliente':
          valorA = a.cliente?.nome_abreviado || '';
          valorB = b.cliente?.nome_abreviado || '';
          break;
        case 'tipo_produto':
          valorA = a.tipo_produto;
          valorB = b.tipo_produto;
          break;
        case 'vigencia_inicio':
          valorA = a.vigencia_inicio;
          valorB = b.vigencia_inicio;
          break;
        case 'vigencia_fim':
          valorA = a.vigencia_fim || '9999-12-31'; // Indefinida vai para o final
          valorB = b.vigencia_fim || '9999-12-31';
          break;
        case 'status':
          valorA = verificarVigente(a.vigencia_inicio, a.vigencia_fim) ? 1 : 0;
          valorB = verificarVigente(b.vigencia_inicio, b.vigencia_fim) ? 1 : 0;
          break;
        default:
          return 0;
      }

      if (valorA < valorB) return direcaoOrdenacao === 'asc' ? -1 : 1;
      if (valorA > valorB) return direcaoOrdenacao === 'asc' ? 1 : -1;
      return 0;
    });
  }, [taxasFiltradas, colunaOrdenacao, direcaoOrdenacao]);

  // Paginação
  const paginatedData = useVirtualPagination(taxasOrdenadas, itemsPerPage, currentPage);

  // Identificar clientes sem taxa ou com taxa vencida - AGORA POR TIPO DE PRODUTO
  // COMEX e FISCAL são agrupados como um único tipo
  const clientesSemTaxa = useMemo(() => {
    if (!empresas || empresas.length === 0) return [];

    const resultado: Array<{
      empresa: typeof empresas[0];
      tipoProduto: 'GALLERY' | 'COMEX';
      produtosOriginais: string[]; // Para exibir os badges originais
      temTaxa: boolean;
      taxaVencida: boolean;
    }> = [];
    
    empresas.forEach(empresa => {
      // Agrupar produtos: GALLERY separado, COMEX+FISCAL juntos
      const produtos = empresa.produtos || [];
      const temGallery = produtos.some(p => p.produto === 'GALLERY');
      const temComexOuFiscal = produtos.some(p => p.produto === 'COMEX' || p.produto === 'FISCAL');
      
      // Verificar GALLERY (apenas se o cliente TEM este produto)
      if (temGallery) {
        const taxasGallery = taxasBackend.filter(taxa => 
          taxa.cliente_id === empresa.id && 
          taxa.tipo_produto === 'GALLERY'
        );
        
        // Verificar se tem pelo menos uma taxa vigente OU futura (não vigente mas com início futuro)
        const temTaxaVigenteOuFutura = taxasGallery.some(taxa => {
          const statusTaxa = obterStatusTaxa(taxa.vigencia_inicio, taxa.vigencia_fim);
          return statusTaxa === 'vigente' || statusTaxa === 'nao_vigente';
        });
        
        // Se não tem taxa vigente nem futura, incluir na lista
        if (!temTaxaVigenteOuFutura) {
          // Verificar se tem taxa mas está vencida
          const temTaxaVencida = taxasGallery.length > 0 && taxasGallery.some(taxa => {
            const statusTaxa = obterStatusTaxa(taxa.vigencia_inicio, taxa.vigencia_fim);
            return statusTaxa === 'vencida';
          });
          
          resultado.push({
            empresa,
            tipoProduto: 'GALLERY',
            produtosOriginais: ['GALLERY'],
            temTaxa: taxasGallery.length > 0,
            taxaVencida: temTaxaVencida
          });
        }
      }
      
      // Verificar COMEX/FISCAL (agrupados) - apenas se o cliente TEM estes produtos
      if (temComexOuFiscal) {
        // Buscar taxas que servem para COMEX/FISCAL
        // COMEX e FISCAL são armazenados como 'OUTROS' no banco de dados
        const taxasComex = taxasBackend.filter(taxa => {
          if (taxa.cliente_id !== empresa.id) return false;
          
          // Aceitar taxas com tipo_produto 'OUTROS' (que serve para COMEX/FISCAL)
          if (taxa.tipo_produto === 'OUTROS') {
            return true;
          }
          
          return false;
        });
        
        const produtosComexFiscal = produtos
          .filter(p => p.produto === 'COMEX' || p.produto === 'FISCAL')
          .map(p => p.produto);
        
        // Verificar se tem pelo menos uma taxa vigente OU futura (não vigente mas com início futuro)
        const temTaxaVigenteOuFutura = taxasComex.some(taxa => {
          const statusTaxa = obterStatusTaxa(taxa.vigencia_inicio, taxa.vigencia_fim);
          return statusTaxa === 'vigente' || statusTaxa === 'nao_vigente';
        });
        
        // Se não tem taxa vigente nem futura, incluir na lista
        if (!temTaxaVigenteOuFutura) {
          // Verificar se tem taxa mas está vencida
          const temTaxaVencida = taxasComex.length > 0 && taxasComex.some(taxa => {
            const statusTaxa = obterStatusTaxa(taxa.vigencia_inicio, taxa.vigencia_fim);
            return statusTaxa === 'vencida';
          });
          
          resultado.push({
            empresa,
            tipoProduto: 'COMEX',
            produtosOriginais: produtosComexFiscal,
            temTaxa: taxasComex.length > 0,
            taxaVencida: temTaxaVencida
          });
        }
      }
    });
    
    return resultado;
  }, [empresas, taxasBackend]);

  // Filtrar clientes sem taxa (Aba 2)
  const clientesSemTaxaFiltrados = useMemo(() => {
    let resultado = [...clientesSemTaxa];

    // Filtro por cliente
    if (filtroClienteAba2) {
      resultado = resultado.filter(item =>
        item.empresa.nome_abreviado?.toLowerCase().includes(filtroClienteAba2.toLowerCase()) ||
        item.empresa.nome_completo?.toLowerCase().includes(filtroClienteAba2.toLowerCase())
      );
    }

    // Filtro por tipo de produto
    if (filtroTipoProdutoAba2 !== 'todos') {
      resultado = resultado.filter(item => {
        // Se filtro é GALLERY, mostrar apenas linhas GALLERY
        if (filtroTipoProdutoAba2 === 'GALLERY') {
          return item.tipoProduto === 'GALLERY';
        }
        // Se filtro é COMEX ou FISCAL, mostrar linhas COMEX (que agrupa ambos)
        if (filtroTipoProdutoAba2 === 'COMEX' || filtroTipoProdutoAba2 === 'FISCAL') {
          return item.tipoProduto === 'COMEX';
        }
        return false;
      });
    }

    // Filtro por status
    if (filtroStatusAba2 !== 'todos') {
      if (filtroStatusAba2 === 'taxa_vencida') {
        resultado = resultado.filter(item => item.taxaVencida);
      } else {
        resultado = resultado.filter(item => !item.temTaxa);
      }
    }

    return resultado;
  }, [clientesSemTaxa, filtroClienteAba2, filtroTipoProdutoAba2, filtroStatusAba2]);

  // Paginação para clientes sem taxa
  const paginatedClientesSemTaxa = useVirtualPagination(clientesSemTaxaFiltrados, itemsPerPage, currentPage);

  // Funções de exportação
  const exportarParaExcel = async () => {
    try {
      setExportando(true);
      
      const XLSX = await import('xlsx');
      
      // Aba 1: Resumo das Taxas
      const dadosResumo = taxasOrdenadas.map(taxa => {
        const statusTaxa = obterStatusTaxa(taxa.vigencia_inicio, taxa.vigencia_fim);
        const statusTexto = statusTaxa === 'vigente' ? 'Vigente' : statusTaxa === 'vencida' ? 'Taxa Vencida' : 'Não Vigente';
        
        return {
          'Cliente': taxa.cliente?.nome_abreviado || '-',
          'Tipo de Produto': taxa.tipo_produto === 'GALLERY' ? 'GALLERY' : 'COMEX, FISCAL',
          'Vigência Início': format(new Date(taxa.vigencia_inicio + 'T00:00:00'), 'dd/MM/yyyy', { locale: ptBR }),
          'Vigência Fim': taxa.vigencia_fim ? format(new Date(taxa.vigencia_fim + 'T00:00:00'), 'dd/MM/yyyy', { locale: ptBR }) : 'Indefinida',
          'Status': statusTexto,
          'Tipo de Taxa': taxa.personalizado ? 'Personalizada' : (taxa.cliente?.tem_ams === false ? 'Padrão' : 'Automática'),
          'Tipo de Cálculo': taxa.tipo_calculo_adicional === 'normal' ? 'Normal' : 'Média'
        };
      });

      // Aba 2: Detalhes das Taxas (Valores por Função)
      const dadosDetalhes: any[] = [];
      
      taxasOrdenadas.forEach(taxa => {
        const funcoes = getFuncoesPorProduto(taxa.tipo_produto);
        
        // Adicionar valores remotos
        funcoes.forEach(funcao => {
          const valorRemoto = taxa.valores_remota?.find(v => v.funcao === funcao);
          if (valorRemoto) {
            const valoresCalculados = calcularValores(
              valorRemoto.valor_base,
              funcao,
              taxa.valores_remota?.map(v => ({ funcao: v.funcao, valor_base: v.valor_base })) || [],
              taxa.tipo_calculo_adicional,
              taxa.tipo_produto
            );
            
            dadosDetalhes.push({
              'Cliente': taxa.cliente?.nome_abreviado || '-',
              'Vigência Início': taxa.vigencia_inicio ? format(new Date(taxa.vigencia_inicio + 'T00:00:00'), 'dd/MM/yyyy', { locale: ptBR }) : '-',
              'Vigência Fim': taxa.vigencia_fim ? format(new Date(taxa.vigencia_fim + 'T00:00:00'), 'dd/MM/yyyy', { locale: ptBR }) : '-',
              'Tipo Produto': taxa.tipo_produto === 'GALLERY' ? 'GALLERY' : 'COMEX, FISCAL',
              'Tipo Hora': 'Remota',
              'Função': funcao,
              'Valor Base': parseFloat(valorRemoto.valor_base.toFixed(2)),
              'Seg-Sex 17h30-19h30': parseFloat(valoresCalculados.valor_17h30_19h30.toFixed(2)),
              'Seg-Sex Após 19h30': parseFloat(valoresCalculados.valor_apos_19h30.toFixed(2)),
              'Sáb/Dom/Feriados': parseFloat(valoresCalculados.valor_fim_semana.toFixed(2)),
              'Hora Adicional': parseFloat(valoresCalculados.valor_adicional.toFixed(2)),
              'Stand By': parseFloat(valoresCalculados.valor_standby.toFixed(2))
            });
          }
        });
        
        // Adicionar valores locais
        funcoes.forEach(funcao => {
          const valorLocal = taxa.valores_local?.find(v => v.funcao === funcao);
          if (valorLocal) {
            const valoresCalculados = calcularValores(
              valorLocal.valor_base,
              funcao,
              taxa.valores_local?.map(v => ({ funcao: v.funcao, valor_base: v.valor_base })) || [],
              taxa.tipo_calculo_adicional,
              taxa.tipo_produto
            );
            
            dadosDetalhes.push({
              'Cliente': taxa.cliente?.nome_abreviado || '-',
              'Vigência Início': taxa.vigencia_inicio ? format(new Date(taxa.vigencia_inicio + 'T00:00:00'), 'dd/MM/yyyy', { locale: ptBR }) : '-',
              'Vigência Fim': taxa.vigencia_fim ? format(new Date(taxa.vigencia_fim + 'T00:00:00'), 'dd/MM/yyyy', { locale: ptBR }) : '-',
              'Tipo Produto': taxa.tipo_produto === 'GALLERY' ? 'GALLERY' : 'COMEX, FISCAL',
              'Tipo Hora': 'Local',
              'Função': funcao,
              'Valor Base': parseFloat(valorLocal.valor_base.toFixed(2)),
              'Seg-Sex 17h30-19h30': parseFloat(valoresCalculados.valor_17h30_19h30.toFixed(2)),
              'Seg-Sex Após 19h30': parseFloat(valoresCalculados.valor_apos_19h30.toFixed(2)),
              'Sáb/Dom/Feriados': parseFloat(valoresCalculados.valor_fim_semana.toFixed(2)),
              'Hora Adicional': parseFloat(valoresCalculados.valor_adicional.toFixed(2)),
              'Stand By': parseFloat(valoresCalculados.valor_standby.toFixed(2))
            });
          }
        });
      });

      // ✅ NOVO: Aba 3 - Clientes Sem Taxa
      const dadosClientesSemTaxa = clientesSemTaxaFiltrados.map(item => ({
        'Cliente': item.empresa.nome_abreviado,
        'Nome Completo': item.empresa.nome_completo,
        // ✅ CORREÇÃO: Extrair o nome do produto do objeto
        'Produtos': Array.isArray(item.empresa.produtos) 
          ? item.empresa.produtos.map((p: any) => p.produto || p).join(', ')
          : '-',
        'Status': item.empresa.status === 'ativo' ? 'Ativo' : item.empresa.status === 'inativo' ? 'Inativo' : 'Suspenso',
        'Tem AMS': item.empresa.tem_ams ? 'Sim' : 'Não',
        'Email Gestor': item.empresa.email_gestor || '-',
        'Vigência Inicial': item.empresa.vigencia_inicial ? format(new Date(item.empresa.vigencia_inicial + 'T00:00:00'), 'dd/MM/yyyy', { locale: ptBR }) : '-',
        'Vigência Final': item.empresa.vigencia_final ? format(new Date(item.empresa.vigencia_final + 'T00:00:00'), 'dd/MM/yyyy', { locale: ptBR }) : '-'
      }));

      // Criar workbook com três abas
      const wb = XLSX.utils.book_new();
      
      const wsResumo = XLSX.utils.json_to_sheet(dadosResumo);
      XLSX.utils.book_append_sheet(wb, wsResumo, 'Resumo');
      
      const wsDetalhes = XLSX.utils.json_to_sheet(dadosDetalhes);
      XLSX.utils.book_append_sheet(wb, wsDetalhes, 'Detalhes das Taxas');

      // ✅ NOVO: Adicionar aba de Clientes Sem Taxa
      const wsClientesSemTaxa = XLSX.utils.json_to_sheet(dadosClientesSemTaxa);
      XLSX.utils.book_append_sheet(wb, wsClientesSemTaxa, 'Clientes Sem Taxa');

      const dataAtual = new Date().toLocaleDateString('pt-BR').replace(/\//g, '-');
      XLSX.writeFile(wb, `taxas-clientes-${dataAtual}.xlsx`);

      toast.success(`${taxasOrdenadas.length} taxas e ${clientesSemTaxaFiltrados.length} clientes sem taxa exportados para Excel com sucesso!`);
    } catch (error) {
      console.error('Erro ao exportar para Excel:', error);
      toast.error('Erro ao exportar para Excel');
    } finally {
      setExportando(false);
    }
  };

  const exportarParaPDF = async () => {
    try {
      setExportando(true);
      
      const jsPDF = (await import('jspdf')).default;
      const doc = new jsPDF('landscape'); // Modo paisagem para mais espaço

      // Configurações
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 10;

      // Cabeçalho
      doc.setFillColor(0, 102, 255);
      doc.rect(0, 0, pageWidth, 25, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      const titulo = 'Taxas de Clientes';
      const tituloWidth = doc.getTextWidth(titulo);
      doc.text(titulo, (pageWidth - tituloWidth) / 2, 16);

      // Informações do relatório
      doc.setTextColor(100, 100, 100);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      const dataAtual = format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
      doc.text(`Gerado em: ${dataAtual}`, margin, 35);
      doc.text(`Total de registros: ${taxasOrdenadas.length}`, margin, 40);

      // Tabela Resumo
      let yPos = 48;
      const lineHeight = 7;
      const colWidths = [40, 30, 25, 25, 20, 20, 20]; // Ajustado para incluir Tipo de Taxa e Tipo de Cálculo

      // Cabeçalho da tabela
      doc.setFillColor(0, 102, 255);
      doc.rect(margin, yPos, pageWidth - 2 * margin, lineHeight, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      doc.text('Cliente', margin + 2, yPos + 5);
      doc.text('Tipo Produto', margin + colWidths[0] + 2, yPos + 5);
      doc.text('Vigência Início', margin + colWidths[0] + colWidths[1] + 2, yPos + 5);
      doc.text('Vigência Fim', margin + colWidths[0] + colWidths[1] + colWidths[2] + 2, yPos + 5);
      doc.text('Status', margin + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + 2, yPos + 5);
      doc.text('Tipo Taxa', margin + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + colWidths[4] + 2, yPos + 5);
      doc.text('Tipo Cálculo', margin + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + colWidths[4] + colWidths[5] + 2, yPos + 5);

      yPos += lineHeight;

      // Dados do resumo
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      
      taxasOrdenadas.forEach((taxa, index) => {
        if (yPos > pageHeight - 15) {
          doc.addPage();
          yPos = 15;
        }

        doc.setTextColor(0, 0, 0);
        const bgColor = index % 2 === 0 ? [245, 245, 245] : [255, 255, 255];
        doc.setFillColor(bgColor[0], bgColor[1], bgColor[2]);
        doc.rect(margin, yPos, pageWidth - 2 * margin, lineHeight, 'F');

        const statusTaxa = obterStatusTaxa(taxa.vigencia_inicio, taxa.vigencia_fim);
        const statusTexto = statusTaxa === 'vigente' ? 'Vigente' : statusTaxa === 'vencida' ? 'Taxa Vencida' : 'Não Vigente';

        doc.text(taxa.cliente?.nome_abreviado || '-', margin + 2, yPos + 4.5);
        doc.text(taxa.tipo_produto === 'GALLERY' ? 'GALLERY' : 'COMEX, FISCAL', margin + colWidths[0] + 2, yPos + 4.5);
        doc.text(format(new Date(taxa.vigencia_inicio + 'T00:00:00'), 'dd/MM/yyyy'), margin + colWidths[0] + colWidths[1] + 2, yPos + 4.5);
        doc.text(taxa.vigencia_fim ? format(new Date(taxa.vigencia_fim + 'T00:00:00'), 'dd/MM/yyyy') : 'Indefinida', margin + colWidths[0] + colWidths[1] + colWidths[2] + 2, yPos + 4.5);
        doc.text(statusTexto, margin + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + 2, yPos + 4.5);
        doc.text(taxa.personalizado ? 'Personalizada' : (taxa.cliente?.tem_ams === false ? 'Padrão' : 'Automática'), margin + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + colWidths[4] + 2, yPos + 4.5);
        doc.text(taxa.tipo_calculo_adicional === 'normal' ? 'Normal' : 'Média', margin + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + colWidths[4] + colWidths[5] + 2, yPos + 4.5);

        yPos += lineHeight;
      });

      // Adicionar página com detalhes das taxas
      doc.addPage();
      yPos = 15;

      doc.setFillColor(0, 102, 255);
      doc.rect(0, 0, pageWidth, 25, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      const tituloDetalhes = 'Detalhes das Taxas por Função';
      const tituloDetalhesWidth = doc.getTextWidth(tituloDetalhes);
      doc.text(tituloDetalhes, (pageWidth - tituloDetalhesWidth) / 2, 16);

      yPos = 30;

      // Para cada taxa, adicionar detalhes
      taxasOrdenadas.forEach((taxa) => {
        const funcoes = getFuncoesPorProduto(taxa.tipo_produto);
        
        // Cabeçalho da taxa
        if (yPos > pageHeight - 60) {
          doc.addPage();
          yPos = 15;
        }

        doc.setFillColor(0, 102, 255);
        doc.rect(margin, yPos, pageWidth - 2 * margin, 8, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        const vigenciaTexto = taxa.vigencia_inicio && taxa.vigencia_fim 
          ? ` (${format(new Date(taxa.vigencia_inicio + 'T00:00:00'), 'dd/MM/yyyy', { locale: ptBR })} - ${format(new Date(taxa.vigencia_fim + 'T00:00:00'), 'dd/MM/yyyy', { locale: ptBR })})`
          : '';
        doc.text(`${taxa.cliente?.nome_abreviado || '-'} - ${taxa.tipo_produto === 'GALLERY' ? 'GALLERY' : 'COMEX, FISCAL'}${vigenciaTexto}`, margin + 2, yPos + 5.5);
        yPos += 12; // Aumentado de 10 para 12 para dar mais espaço

        // Tabela de valores remotos
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(8);
        doc.text('Valores Hora Remota:', margin + 2, yPos);
        yPos += 6; // Aumentado de 5 para 6 para dar mais espaço

        const colWidthsDetalhes = [35, 20, 20, 20, 20, 20, 20];
        
        // Cabeçalho
        doc.setFillColor(200, 200, 200);
        doc.rect(margin, yPos, pageWidth - 2 * margin, 6, 'F');
        doc.setFontSize(6);
        doc.setFont('helvetica', 'bold');
        doc.text('Função', margin + 1, yPos + 4);
        doc.text('Base', margin + colWidthsDetalhes[0], yPos + 4);
        doc.text('17h30-19h30', margin + colWidthsDetalhes[0] + colWidthsDetalhes[1], yPos + 4);
        doc.text('Após 19h30', margin + colWidthsDetalhes[0] + colWidthsDetalhes[1] + colWidthsDetalhes[2], yPos + 4);
        doc.text('Fim Semana', margin + colWidthsDetalhes[0] + colWidthsDetalhes[1] + colWidthsDetalhes[2] + colWidthsDetalhes[3], yPos + 4);
        doc.text('Adicional', margin + colWidthsDetalhes[0] + colWidthsDetalhes[1] + colWidthsDetalhes[2] + colWidthsDetalhes[3] + colWidthsDetalhes[4], yPos + 4);
        doc.text('Stand By', margin + colWidthsDetalhes[0] + colWidthsDetalhes[1] + colWidthsDetalhes[2] + colWidthsDetalhes[3] + colWidthsDetalhes[4] + colWidthsDetalhes[5], yPos + 4);
        yPos += 6;

        // Dados remotos
        doc.setFont('helvetica', 'normal');
        funcoes.forEach((funcao) => {
          const valorRemoto = taxa.valores_remota?.find(v => v.funcao === funcao);
          if (valorRemoto) {
            const valoresCalculados = calcularValores(
              valorRemoto.valor_base,
              funcao,
              taxa.valores_remota?.map(v => ({ funcao: v.funcao, valor_base: v.valor_base })) || [],
              taxa.tipo_calculo_adicional,
              taxa.tipo_produto
            );

            doc.text(funcao, margin + 1, yPos + 4);
            doc.text(valorRemoto.valor_base.toFixed(2), margin + colWidthsDetalhes[0], yPos + 4);
            doc.text(valoresCalculados.valor_17h30_19h30.toFixed(2), margin + colWidthsDetalhes[0] + colWidthsDetalhes[1], yPos + 4);
            doc.text(valoresCalculados.valor_apos_19h30.toFixed(2), margin + colWidthsDetalhes[0] + colWidthsDetalhes[1] + colWidthsDetalhes[2], yPos + 4);
            doc.text(valoresCalculados.valor_fim_semana.toFixed(2), margin + colWidthsDetalhes[0] + colWidthsDetalhes[1] + colWidthsDetalhes[2] + colWidthsDetalhes[3], yPos + 4);
            doc.text(valoresCalculados.valor_adicional.toFixed(2), margin + colWidthsDetalhes[0] + colWidthsDetalhes[1] + colWidthsDetalhes[2] + colWidthsDetalhes[3] + colWidthsDetalhes[4], yPos + 4);
            doc.text(valoresCalculados.valor_standby.toFixed(2), margin + colWidthsDetalhes[0] + colWidthsDetalhes[1] + colWidthsDetalhes[2] + colWidthsDetalhes[3] + colWidthsDetalhes[4] + colWidthsDetalhes[5], yPos + 4);
            yPos += 5;
          }
        });

        yPos += 5; // Aumentado de 3 para 5 para dar mais espaço entre tabelas

        // Tabela de valores locais
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.text('Valores Hora Local:', margin + 2, yPos);
        yPos += 6; // Aumentado de 5 para 6 para dar mais espaço

        // Cabeçalho
        doc.setFillColor(200, 200, 200);
        doc.rect(margin, yPos, pageWidth - 2 * margin, 6, 'F');
        doc.setFontSize(6);
        doc.text('Função', margin + 1, yPos + 4);
        doc.text('Base', margin + colWidthsDetalhes[0], yPos + 4);
        doc.text('17h30-19h30', margin + colWidthsDetalhes[0] + colWidthsDetalhes[1], yPos + 4);
        doc.text('Após 19h30', margin + colWidthsDetalhes[0] + colWidthsDetalhes[1] + colWidthsDetalhes[2], yPos + 4);
        doc.text('Fim Semana', margin + colWidthsDetalhes[0] + colWidthsDetalhes[1] + colWidthsDetalhes[2] + colWidthsDetalhes[3], yPos + 4);
        yPos += 6;

        // Dados locais
        doc.setFont('helvetica', 'normal');
        funcoes.forEach((funcao) => {
          const valorLocal = taxa.valores_local?.find(v => v.funcao === funcao);
          if (valorLocal) {
            const valoresCalculados = calcularValores(
              valorLocal.valor_base,
              funcao,
              taxa.valores_local?.map(v => ({ funcao: v.funcao, valor_base: v.valor_base })) || [],
              taxa.tipo_calculo_adicional,
              taxa.tipo_produto
            );

            doc.text(funcao, margin + 1, yPos + 4);
            doc.text(valorLocal.valor_base.toFixed(2), margin + colWidthsDetalhes[0], yPos + 4);
            doc.text(valoresCalculados.valor_17h30_19h30.toFixed(2), margin + colWidthsDetalhes[0] + colWidthsDetalhes[1], yPos + 4);
            doc.text(valoresCalculados.valor_apos_19h30.toFixed(2), margin + colWidthsDetalhes[0] + colWidthsDetalhes[1] + colWidthsDetalhes[2], yPos + 4);
            doc.text(valoresCalculados.valor_fim_semana.toFixed(2), margin + colWidthsDetalhes[0] + colWidthsDetalhes[1] + colWidthsDetalhes[2] + colWidthsDetalhes[3], yPos + 4);
            yPos += 5;
          }
        });

        yPos += 8;
      });

      // ✅ NOVO: Adicionar página com Clientes Sem Taxa
      if (clientesSemTaxaFiltrados.length > 0) {
        doc.addPage();
        yPos = 15;

        // Cabeçalho da seção
        doc.setFillColor(0, 102, 255);
        doc.rect(0, 0, pageWidth, 25, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(16);
        doc.setFont('helvetica', 'bold');
        const tituloClientesSemTaxa = 'Clientes Sem Taxa Cadastrada';
        const tituloClientesSemTaxaWidth = doc.getTextWidth(tituloClientesSemTaxa);
        doc.text(tituloClientesSemTaxa, (pageWidth - tituloClientesSemTaxaWidth) / 2, 16);

        // Informações da seção
        doc.setTextColor(100, 100, 100);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text(`Total de clientes sem taxa: ${clientesSemTaxaFiltrados.length}`, margin, 35);

        yPos = 43;
        const lineHeightClientes = 7;
        const colWidthsClientes = [50, 40, 30, 20, 20, 30]; // Cliente, Produtos, Status, AMS, Vigência Inicial, Vigência Final

        // Cabeçalho da tabela
        doc.setFillColor(0, 102, 255);
        doc.rect(margin, yPos, pageWidth - 2 * margin, lineHeightClientes, 'F');
        
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        doc.text('Cliente', margin + 2, yPos + 5);
        doc.text('Produtos', margin + colWidthsClientes[0] + 2, yPos + 5);
        doc.text('Status', margin + colWidthsClientes[0] + colWidthsClientes[1] + 2, yPos + 5);
        doc.text('AMS', margin + colWidthsClientes[0] + colWidthsClientes[1] + colWidthsClientes[2] + 2, yPos + 5);
        doc.text('Vigência Inicial', margin + colWidthsClientes[0] + colWidthsClientes[1] + colWidthsClientes[2] + colWidthsClientes[3] + 2, yPos + 5);
        doc.text('Vigência Final', margin + colWidthsClientes[0] + colWidthsClientes[1] + colWidthsClientes[2] + colWidthsClientes[3] + colWidthsClientes[4] + 2, yPos + 5);

        yPos += lineHeightClientes;

        // Dados dos clientes sem taxa
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        
        clientesSemTaxaFiltrados.forEach((item, index) => {
          if (yPos > pageHeight - 15) {
            doc.addPage();
            yPos = 15;
          }

          doc.setTextColor(0, 0, 0);
          const bgColor = index % 2 === 0 ? [245, 245, 245] : [255, 255, 255];
          doc.setFillColor(bgColor[0], bgColor[1], bgColor[2]);
          doc.rect(margin, yPos, pageWidth - 2 * margin, lineHeightClientes, 'F');

          // Truncar nome do cliente se for muito longo
          const nomeCliente = item.empresa.nome_abreviado.length > 25 
            ? item.empresa.nome_abreviado.substring(0, 22) + '...' 
            : item.empresa.nome_abreviado;
          
          doc.text(nomeCliente, margin + 2, yPos + 4.5);
          // ✅ CORREÇÃO: Extrair o nome do produto do objeto
          const produtosTexto = Array.isArray(item.empresa.produtos) 
            ? item.empresa.produtos.map((p: any) => p.produto || p).join(', ')
            : '-';
          doc.text(produtosTexto, margin + colWidthsClientes[0] + 2, yPos + 4.5);
          
          // Status com cor
          const statusTexto = item.empresa.status === 'ativo' ? 'Ativo' : item.empresa.status === 'inativo' ? 'Inativo' : 'Suspenso';
          if (item.empresa.status === 'ativo') {
            doc.setTextColor(0, 128, 0); // Verde
          } else if (item.empresa.status === 'inativo') {
            doc.setTextColor(255, 0, 0); // Vermelho
          } else {
            doc.setTextColor(255, 165, 0); // Laranja
          }
          doc.text(statusTexto, margin + colWidthsClientes[0] + colWidthsClientes[1] + 2, yPos + 4.5);
          doc.setTextColor(0, 0, 0); // Voltar para preto
          
          doc.text(item.empresa.tem_ams ? 'Sim' : 'Não', margin + colWidthsClientes[0] + colWidthsClientes[1] + colWidthsClientes[2] + 2, yPos + 4.5);
          doc.text(
            item.empresa.vigencia_inicial ? format(new Date(item.empresa.vigencia_inicial + 'T00:00:00'), 'dd/MM/yyyy') : '-',
            margin + colWidthsClientes[0] + colWidthsClientes[1] + colWidthsClientes[2] + colWidthsClientes[3] + 2,
            yPos + 4.5
          );
          doc.text(
            item.empresa.vigencia_final ? format(new Date(item.empresa.vigencia_final + 'T00:00:00'), 'dd/MM/yyyy') : '-',
            margin + colWidthsClientes[0] + colWidthsClientes[1] + colWidthsClientes[2] + colWidthsClientes[3] + colWidthsClientes[4] + 2,
            yPos + 4.5
          );

          yPos += lineHeightClientes;
        });
      }

      const dataArquivo = new Date().toLocaleDateString('pt-BR').replace(/\//g, '-');
      doc.save(`taxas-clientes-${dataArquivo}.pdf`);

      toast.success(`Relatório PDF gerado com ${taxasOrdenadas.length} taxas e ${clientesSemTaxaFiltrados.length} clientes sem taxa!`);
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      toast.error('Erro ao gerar relatório PDF');
    } finally {
      setExportando(false);
    }
  };

  return (
    <LayoutAdmin>
      <div className="space-y-6">
        {/* Cabeçalho */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Cadastro de Taxas dos Clientes
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Gerenciamento de taxas por cliente e vigência
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleAbrirTaxaPadrao} variant="outline" size="sm" className="flex items-center gap-2">
              Taxa Padrão
            </Button>
            
            {/* Botão de Exportação */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={exportando || taxasOrdenadas.length === 0}
                  className="flex items-center gap-2"
                >
                  <Download className="h-4 w-4" />
                  Exportar
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={exportarParaExcel} disabled={exportando}>
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Exportar para Excel
                </DropdownMenuItem>
                <DropdownMenuItem onClick={exportarParaPDF} disabled={exportando}>
                  <FileText className="h-4 w-4 mr-2" />
                  Exportar para PDF
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            
            <Button onClick={handleNovaTaxa} className="flex items-center gap-2" size="sm">
              <Plus className="h-4 w-4" />
              Nova Taxa
            </Button>
          </div>
        </div>

        {/* Sistema de Abas - Taxas Cadastradas e Clientes Sem Taxa */}
        <Tabs value={abaAtiva} onValueChange={(value) => {
          setAbaAtiva(value as 'taxas_cadastradas' | 'clientes_sem_taxa');
          setCurrentPage(1);
        }} className="w-full space-y-4">
          <TabsList>
            <TabsTrigger value="taxas_cadastradas">
              Taxas Cadastradas ({taxasOrdenadas.length})
            </TabsTrigger>
            <TabsTrigger value="clientes_sem_taxa">
              Clientes Sem Taxa ({clientesSemTaxa.length})
            </TabsTrigger>
          </TabsList>

          {/* Aba 1: Taxas Cadastradas */}
          <TabsContent value="taxas_cadastradas">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Taxas Cadastradas
                  </CardTitle>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setMostrarFiltros(!mostrarFiltros)}
                  className="flex items-center justify-center space-x-2"
                >
                  <Filter className="h-4 w-4" />
                  <span>Filtros</span>
                </Button>
                
                {/* Botão Limpar Filtro - só aparece se há filtros ativos */}
                {(filtroCliente !== '' || filtroTipoProduto !== 'todos' || filtroStatus !== 'todos' || filtroTipoTaxa !== 'todos' || filtroTipoCalculo !== 'todos') && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={limparFiltros}
                    className="whitespace-nowrap hover:border-red-300"
                  >
                    <X className="h-4 w-4 mr-2 text-red-600" />
                    Limpar Filtro
                  </Button>
                )}
              </div>
            </div>

            {/* Área de filtros expansível - PADRÃO DESIGN SYSTEM */}
            {mostrarFiltros && (
              <div className="space-y-4 pt-4 border-t">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  {/* Campo de busca com ícone */}
                  <div>
                    <div className="text-sm font-medium mb-2">Buscar</div>
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        placeholder="Buscar por cliente..."
                        value={filtroCliente}
                        onChange={(e) => {
                          setFiltroCliente(e.target.value);
                          setCurrentPage(1);
                        }}
                        className="pl-10 focus:ring-sonda-blue focus:border-sonda-blue"
                      />
                    </div>
                  </div>

                  {/* Filtro Tipo de Produto */}
                  <div>
                    <div className="text-sm font-medium mb-2">Tipo de Produto</div>
                    <Select 
                      value={filtroTipoProduto} 
                      onValueChange={(value) => {
                        setFiltroTipoProduto(value);
                        setCurrentPage(1);
                      }}
                    >
                      <SelectTrigger className="focus:ring-sonda-blue focus:border-sonda-blue">
                        <SelectValue placeholder="Todos os tipos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todos os tipos</SelectItem>
                        <SelectItem value="GALLERY">GALLERY</SelectItem>
                        <SelectItem value="COMEX">COMEX</SelectItem>
                        <SelectItem value="FISCAL">FISCAL</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Filtro Status */}
                  <div>
                    <div className="text-sm font-medium mb-2">Status</div>
                    <Select 
                      value={filtroStatus} 
                      onValueChange={(value) => {
                        setFiltroStatus(value);
                        setCurrentPage(1);
                      }}
                    >
                      <SelectTrigger className="focus:ring-sonda-blue focus:border-sonda-blue">
                        <SelectValue placeholder="Todos os status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todos os status</SelectItem>
                        <SelectItem value="vigente">Vigente</SelectItem>
                        <SelectItem value="nao_vigente">Não Vigente</SelectItem>
                        <SelectItem value="vencida">Taxa Vencida</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Filtro Tipo de Taxa */}
                  <div>
                    <div className="text-sm font-medium mb-2">Tipo de Taxa</div>
                    <Select 
                      value={filtroTipoTaxa} 
                      onValueChange={(value) => {
                        setFiltroTipoTaxa(value);
                        setCurrentPage(1);
                      }}
                    >
                      <SelectTrigger className="focus:ring-sonda-blue focus:border-sonda-blue">
                        <SelectValue placeholder="Todos os tipos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todos os tipos</SelectItem>
                        <SelectItem value="personalizada">Personalizada</SelectItem>
                        <SelectItem value="padrao">Padrão</SelectItem>
                        <SelectItem value="automatica">Automática</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Filtro Tipo de Cálculo */}
                  <div>
                    <div className="text-sm font-medium mb-2">Tipo de Cálculo</div>
                    <Select 
                      value={filtroTipoCalculo} 
                      onValueChange={(value) => {
                        setFiltroTipoCalculo(value);
                        setCurrentPage(1);
                      }}
                    >
                      <SelectTrigger className="focus:ring-sonda-blue focus:border-sonda-blue">
                        <SelectValue placeholder="Todos os tipos" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="todos">Todos os tipos</SelectItem>
                        <SelectItem value="normal">Normal</SelectItem>
                        <SelectItem value="media">Média</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}
          </CardHeader>

          <CardContent>
            <div className="rounded-md overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead 
                      className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 select-none"
                      onClick={() => handleOrdenar('cliente')}
                    >
                      <div className="flex items-center">
                        Cliente
                        {renderIconeOrdenacao('cliente')}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 select-none"
                      onClick={() => handleOrdenar('tipo_produto')}
                    >
                      <div className="flex items-center">
                        Tipo Produto
                        {renderIconeOrdenacao('tipo_produto')}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 select-none"
                      onClick={() => handleOrdenar('vigencia_inicio')}
                    >
                      <div className="flex items-center">
                        Vigência Início
                        {renderIconeOrdenacao('vigencia_inicio')}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 select-none"
                      onClick={() => handleOrdenar('vigencia_fim')}
                    >
                      <div className="flex items-center">
                        Vigência Fim
                        {renderIconeOrdenacao('vigencia_fim')}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 select-none"
                      onClick={() => handleOrdenar('status')}
                    >
                      <div className="flex items-center">
                        Status
                        {renderIconeOrdenacao('status')}
                      </div>
                    </TableHead>
                    <TableHead className="text-center">Tipo de Taxa</TableHead>
                    <TableHead className="text-center">Tipo de Cálculo</TableHead>
                    <TableHead className="text-center">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                        Carregando...
                      </TableCell>
                    </TableRow>
                  ) : taxasOrdenadas.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                        Nenhuma taxa cadastrada
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedData.items.map((taxa) => {
                      const statusTaxa = obterStatusTaxa(taxa.vigencia_inicio, taxa.vigencia_fim);
                      
                      // Obter nomes dos produtos do cliente
                      const cliente = taxa.cliente as TaxaClienteCompleta['cliente'];
                      const produtosCliente = cliente?.produtos?.map((p) => p.produto) || [];
                      
                      // Determinar o texto a exibir para tipo_produto
                      let tipoProdutoTexto: string = taxa.tipo_produto;
                      if (taxa.tipo_produto === 'OUTROS') {
                        // Filtrar produtos que não são GALLERY
                        const produtosOutros = produtosCliente.filter((p) => p !== 'GALLERY');
                        tipoProdutoTexto = produtosOutros.length > 0 ? produtosOutros.join(', ') : 'OUTROS';
                      }
                      
                      return (
                        <TableRow key={taxa.id}>
                          <TableCell className="font-medium">
                            {taxa.cliente?.nome_abreviado || '-'}
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={taxa.tipo_produto === 'GALLERY' ? 'default' : 'outline'}
                              className={taxa.tipo_produto === 'GALLERY' 
                                ? 'bg-sonda-blue text-white hover:bg-sonda-dark-blue' 
                                : 'border-sonda-blue text-sonda-blue bg-white hover:bg-blue-50'
                              }
                            >
                              {tipoProdutoTexto}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {format(new Date(taxa.vigencia_inicio + 'T00:00:00'), 'dd/MM/yyyy', { locale: ptBR })}
                          </TableCell>
                          <TableCell>
                            {taxa.vigencia_fim 
                              ? format(new Date(taxa.vigencia_fim + 'T00:00:00'), 'dd/MM/yyyy', { locale: ptBR })
                              : 'Indefinida'}
                          </TableCell>
                          <TableCell>
                            {statusTaxa === 'vigente' ? (
                              <Badge className="bg-green-600 text-white hover:bg-green-700">
                                Vigente
                              </Badge>
                            ) : statusTaxa === 'vencida' ? (
                              <Badge variant="outline" className="border-orange-600 text-orange-600 bg-orange-50">
                                Taxa Vencida
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="border-red-600 text-red-600">
                                Não Vigente
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge 
                              variant={taxa.personalizado ? 'default' : 'secondary'}
                              className={
                                taxa.personalizado 
                                  ? 'bg-orange-600 text-white hover:bg-orange-700' 
                                  : taxa.cliente?.tem_ams === false
                                    ? 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                                    : 'bg-gray-200 text-gray-700'
                              }
                            >
                              {taxa.personalizado 
                                ? 'Personalizada' 
                                : (taxa.cliente?.tem_ams === false ? 'Padrão' : 'Automática')
                              }
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge 
                              variant="outline"
                              className="border-sonda-blue text-sonda-blue bg-white hover:bg-blue-50"
                            >
                              {taxa.tipo_calculo_adicional === 'normal' ? 'Normal' : 'Média'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-center gap-1">
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() => handleVisualizarTaxa(taxa)}
                                title="Visualizar"
                              >
                                <Eye className="h-4 w-4 text-blue-600" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() => handleEditarTaxa(taxa)}
                                title="Editar"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 w-8 p-0 text-red-600 hover:text-red-800"
                                onClick={() => handleDeletarTaxa(taxa)}
                                title="Excluir"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Controles de Paginação */}
            {!isLoading && taxasOrdenadas.length > 0 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 border-t">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Mostrar</span>
                  <Select
                    value={itemsPerPage.toString()}
                    onValueChange={(value) => {
                      const newValue = value === 'todos' ? taxasOrdenadas.length : parseInt(value);
                      setItemsPerPage(newValue);
                      setCurrentPage(1);
                    }}
                  >
                    <SelectTrigger className="w-[100px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="25">25</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                      <SelectItem value="500">500</SelectItem>
                      <SelectItem value="todos">Todos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Navegação de páginas */}
                {paginatedData.totalPages > 1 && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={!paginatedData.hasPrevPage}
                      aria-label="Página anterior"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="text-sm px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded">
                      Página {currentPage} de {paginatedData.totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(paginatedData.totalPages, prev + 1))}
                      disabled={!paginatedData.hasNextPage}
                      aria-label="Próxima página"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}

                {/* Contador de registros */}
                <div className="text-sm text-gray-600 dark:text-gray-400">
                  {paginatedData.startIndex}-{paginatedData.endIndex} de {paginatedData.totalItems} taxas
                </div>
              </div>
            )}
              </CardContent>
            </Card>
            </TabsContent>

            {/* Aba 2: Clientes Sem Taxa */}
            <TabsContent value="clientes_sem_taxa">
              <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5 text-orange-600" />
                    Clientes Sem Taxa ou com Taxa Vencida
                  </CardTitle>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setMostrarFiltrosAba2(!mostrarFiltrosAba2)}
                      className="flex items-center justify-center space-x-2"
                    >
                      <Filter className="h-4 w-4" />
                      <span>Filtros</span>
                    </Button>
                    
                    {/* Botão Limpar Filtro - só aparece se há filtros ativos */}
                    {(filtroClienteAba2 !== '' || filtroTipoProdutoAba2 !== 'todos' || filtroStatusAba2 !== 'todos') && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={limparFiltrosAba2}
                        className="whitespace-nowrap hover:border-red-300"
                      >
                        <X className="h-4 w-4 mr-2 text-red-600" />
                        Limpar Filtro
                      </Button>
                    )}
                  </div>
                </div>

                {/* Área de filtros expansível - PADRÃO DESIGN SYSTEM */}
                {mostrarFiltrosAba2 && (
                  <div className="space-y-4 pt-4 border-t">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Campo de busca com ícone */}
                      <div>
                        <div className="text-sm font-medium mb-2">Buscar</div>
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <Input
                            placeholder="Buscar por cliente..."
                            value={filtroClienteAba2}
                            onChange={(e) => {
                              setFiltroClienteAba2(e.target.value);
                              setCurrentPage(1);
                            }}
                            className="pl-10 focus:ring-sonda-blue focus:border-sonda-blue"
                          />
                        </div>
                      </div>

                      {/* Filtro Tipo de Produto */}
                      <div>
                        <div className="text-sm font-medium mb-2">Tipo de Produto</div>
                        <Select 
                          value={filtroTipoProdutoAba2} 
                          onValueChange={(value) => {
                            setFiltroTipoProdutoAba2(value);
                            setCurrentPage(1);
                          }}
                        >
                          <SelectTrigger className="focus:ring-sonda-blue focus:border-sonda-blue">
                            <SelectValue placeholder="Todos os tipos" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="todos">Todos os tipos</SelectItem>
                            <SelectItem value="GALLERY">GALLERY</SelectItem>
                            <SelectItem value="COMEX">COMEX</SelectItem>
                            <SelectItem value="FISCAL">FISCAL</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Filtro Status */}
                      <div>
                        <div className="text-sm font-medium mb-2">Status</div>
                        <Select 
                          value={filtroStatusAba2} 
                          onValueChange={(value) => {
                            setFiltroStatusAba2(value);
                            setCurrentPage(1);
                          }}
                        >
                          <SelectTrigger className="focus:ring-sonda-blue focus:border-sonda-blue">
                            <SelectValue placeholder="Todos os status" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="todos">Todos os status</SelectItem>
                            <SelectItem value="sem_taxa">Sem Taxa</SelectItem>
                            <SelectItem value="taxa_vencida">Taxa Vencida</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                )}
              </CardHeader>

              <CardContent>
                <div className="rounded-md overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead className="font-semibold text-gray-700">Cliente</TableHead>
                        <TableHead className="font-semibold text-gray-700">Produtos</TableHead>
                        <TableHead className="font-semibold text-gray-700 text-center">Status</TableHead>
                        <TableHead className="font-semibold text-gray-700 text-center">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {isLoadingEmpresas ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-12 text-muted-foreground">
                            Carregando...
                          </TableCell>
                        </TableRow>
                      ) : clientesSemTaxaFiltrados.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center py-12 text-muted-foreground">
                            <div className="flex flex-col items-center gap-2">
                              <Check className="h-12 w-12 text-green-600" />
                              <p className="font-medium">
                                {filtroClienteAba2 || filtroTipoProdutoAba2 !== 'todos' || filtroStatusAba2 !== 'todos'
                                  ? 'Nenhum cliente encontrado com os filtros aplicados'
                                  : 'Todos os clientes ativos possuem taxas vigentes!'}
                              </p>
                            </div>
                          </TableCell>
                        </TableRow>
                      ) : (
                        paginatedClientesSemTaxa.items.map((item, index) => {
                          const uniqueKey = `${item.empresa.id}-${item.tipoProduto}`;
                          
                          return (
                            <TableRow key={uniqueKey} className="hover:bg-gray-50">
                              <TableCell className="font-medium">
                                {item.empresa.nome_abreviado}
                              </TableCell>
                              <TableCell>
                                <div className="flex flex-wrap gap-1">
                                  {item.tipoProduto === 'GALLERY' ? (
                                    <Badge 
                                      variant="default"
                                      className="bg-sonda-blue text-white hover:bg-sonda-dark-blue text-xs"
                                    >
                                      GALLERY
                                    </Badge>
                                  ) : (
                                    <Badge 
                                      variant="outline"
                                      className="border-sonda-blue text-sonda-blue bg-white hover:bg-blue-50 text-xs"
                                    >
                                      {item.produtosOriginais.join(', ')}
                                    </Badge>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="text-center">
                                {item.taxaVencida ? (
                                  <Badge variant="outline" className="border-orange-600 text-orange-600">
                                    Taxa Vencida
                                  </Badge>
                                ) : (
                                  <Badge variant="outline" className="border-red-600 text-red-600">
                                    Sem Taxa
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center justify-center gap-1">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 w-8 p-0 text-blue-600 hover:text-blue-800"
                                    onClick={() => {
                                      const dadosIniciais = {
                                        clienteId: item.empresa.id,
                                        // CORREÇÃO: Usar 'OUTROS' em vez de 'COMEX, FISCAL' para corresponder ao valor do Select
                                        tipoProduto: (item.tipoProduto === 'GALLERY' ? 'GALLERY' : 'OUTROS') as 'GALLERY' | 'OUTROS'
                                      };
                                      
                                      setTaxaEditando(null);
                                      setDadosIniciaisTaxa(dadosIniciais);
                                      setModalAberto(true);
                                    }}
                                    title="Cadastrar Taxa"
                                  >
                                    <Plus className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>

                {/* Controles de Paginação */}
                {!isLoadingEmpresas && clientesSemTaxaFiltrados.length > 0 && (
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-6 py-4 border-t">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Mostrar</span>
                      <Select
                        value={itemsPerPage.toString()}
                        onValueChange={(value) => {
                          const newValue = value === 'todos' ? clientesSemTaxaFiltrados.length : parseInt(value);
                          setItemsPerPage(newValue);
                          setCurrentPage(1);
                        }}
                      >
                        <SelectTrigger className="w-[100px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="25">25</SelectItem>
                          <SelectItem value="50">50</SelectItem>
                          <SelectItem value="100">100</SelectItem>
                          <SelectItem value="500">500</SelectItem>
                          <SelectItem value="todos">Todos</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Navegação de páginas */}
                    {paginatedClientesSemTaxa.totalPages > 1 && (
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                          disabled={!paginatedClientesSemTaxa.hasPrevPage}
                          aria-label="Página anterior"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="text-sm px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded">
                          Página {currentPage} de {paginatedClientesSemTaxa.totalPages}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(prev => Math.min(paginatedClientesSemTaxa.totalPages, prev + 1))}
                          disabled={!paginatedClientesSemTaxa.hasNextPage}
                          aria-label="Próxima página"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    )}

                    {/* Contador de registros */}
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {paginatedClientesSemTaxa.startIndex}-{paginatedClientesSemTaxa.endIndex} de {paginatedClientesSemTaxa.totalItems} clientes
                    </div>
                  </div>
                )}
              </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

        {/* Modal de Criar/Editar */}
        <Dialog open={modalAberto} onOpenChange={setModalAberto}>
          <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{taxaEditando ? 'Editar Taxa' : 'Nova Taxa'}</DialogTitle>
            </DialogHeader>
            <TaxaForm
              taxa={taxaEditando}
              onSubmit={handleSubmit}
              onCancel={() => {
                setModalAberto(false);
                setTaxaEditando(null);
                setDadosIniciaisTaxa(null);
              }}
              isLoading={criarTaxa.isPending || atualizarTaxa.isPending}
              dadosIniciais={dadosIniciaisTaxa}
            />
          </DialogContent>
        </Dialog>

        {/* Modal de Visualização */}
        <Dialog open={modalVisualizarAberto} onOpenChange={setModalVisualizarAberto}>
          <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-xl font-semibold text-sonda-blue">Detalhes da Taxa</DialogTitle>
            </DialogHeader>
            {taxaVisualizando && (() => {
              // Obter nomes dos produtos do cliente
              const cliente = taxaVisualizando.cliente as TaxaClienteCompleta['cliente'];
              const produtosCliente = cliente?.produtos?.map((p) => p.produto) || [];
              
              // Determinar o texto a exibir para tipo_produto
              let tipoProdutoTexto: string = taxaVisualizando.tipo_produto;
              if (taxaVisualizando.tipo_produto === 'OUTROS') {
                // Filtrar produtos que não são GALLERY
                const produtosOutros = produtosCliente.filter((p) => p !== 'GALLERY');
                tipoProdutoTexto = produtosOutros.length > 0 ? produtosOutros.join(', ') : 'OUTROS';
              }
              
              return (
              <div className="space-y-6">
                {/* Informações Gerais */}
                <Card className="bg-gray-50">
                  <CardContent className="pt-6">
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                      {/* Todos os campos em uma única linha */}
                      <div>
                        <p className="text-sm font-medium text-gray-500">Cliente</p>
                        <p className="text-lg font-semibold text-gray-900">{taxaVisualizando.cliente?.nome_completo}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500 mb-2">Tipo de Produto</p>
                        <Badge 
                          variant={taxaVisualizando.tipo_produto === 'GALLERY' ? 'default' : 'outline'}
                          className={taxaVisualizando.tipo_produto === 'GALLERY' 
                            ? 'bg-sonda-blue text-white hover:bg-sonda-dark-blue' 
                            : 'border-sonda-blue text-sonda-blue bg-white hover:bg-blue-50'
                          }
                        >
                          {tipoProdutoTexto}
                        </Badge>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500 mb-2">Tipo de Taxa</p>
                        <Badge 
                          variant={taxaVisualizando.personalizado ? 'default' : 'secondary'}
                          className={
                            taxaVisualizando.personalizado 
                              ? 'bg-orange-600 text-white hover:bg-orange-700' 
                              : taxaVisualizando.cliente?.tem_ams === false
                                ? 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                                : 'bg-gray-200 text-gray-700'
                          }
                        >
                          {taxaVisualizando.personalizado 
                            ? 'Personalizada' 
                            : (taxaVisualizando.cliente?.tem_ams === false ? 'Padrão' : 'Automática')
                          }
                        </Badge>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">Vigência Início</p>
                        <p className="text-lg text-gray-900">
                          {format(new Date(taxaVisualizando.vigencia_inicio + 'T00:00:00'), 'dd/MM/yyyy', { locale: ptBR })}
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">Vigência Fim</p>
                        <p className="text-lg text-gray-900">
                          {taxaVisualizando.vigencia_fim 
                            ? format(new Date(taxaVisualizando.vigencia_fim + 'T00:00:00'), 'dd/MM/yyyy', { locale: ptBR })
                            : 'Indefinida'}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Campos Específicos por Cliente */}
                {taxaVisualizando.cliente?.nome_abreviado && clienteTemCamposEspecificos(taxaVisualizando.cliente.nome_abreviado) && (
                  <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-semibold text-gray-900 dark:text-white">
                        Campos Específicos - {taxaVisualizando.cliente.nome_abreviado}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="grid grid-cols-2 gap-4">
                        {getCamposEspecificosPorCliente(taxaVisualizando.cliente.nome_abreviado).map((campoConfig) => {
                          // Buscar valor do campo específico na taxa
                          const valor = (taxaVisualizando as any)[campoConfig.campo];
                          
                          return (
                            <div key={campoConfig.campo}>
                              <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                                {campoConfig.label}
                              </p>
                              <p className="text-base font-semibold text-gray-900 dark:text-white">
                                {valor !== null && valor !== undefined 
                                  ? `R$ ${Number(valor).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                                  : '-'
                                }
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Tabela de Valores Remotos */}
                <div>
                  <h3 className="text-base font-semibold mb-3 text-gray-900 dark:text-white flex items-center gap-2">
                    <FileText className="h-5 w-5 text-sonda-blue" />
                    Valores Hora Remota
                  </h3>
                  <div className="overflow-x-auto rounded-lg">
                    <table className="w-full border-collapse table-fixed">
                      <colgroup>
                        <col style={{ width: '200px' }} />
                        <col style={{ width: '150px' }} />
                        <col style={{ width: '150px' }} />
                        <col style={{ width: '150px' }} />
                        <col style={{ width: '150px' }} />
                        <col style={{ width: '150px' }} />
                        <col style={{ width: '130px' }} />
                      </colgroup>
                      <thead>
                        <tr className="bg-sonda-blue text-white">
                          <th className="border-r border-white/20 px-3 py-2.5 text-left text-xs font-semibold">Função</th>
                          <th className="border-r border-white/20 px-3 py-2.5 text-center text-xs font-semibold">Seg-Sex<br/>08h30-17h30</th>
                          <th className="border-r border-white/20 px-3 py-2.5 text-center text-xs font-semibold">Seg-Sex<br/>17h30-19h30</th>
                          <th className="border-r border-white/20 px-3 py-2.5 text-center text-xs font-semibold">Seg-Sex<br/>Após 19h30</th>
                          <th className="border-r border-white/20 px-3 py-2.5 text-center text-xs font-semibold">Sáb/Dom/<br/>Feriados</th>
                          <th className="border-r border-white/20 px-3 py-2.5 text-center text-xs font-semibold">Hora Adicional <br/>(Excedente do Banco)</th>
                          <th className="px-3 py-2.5 text-center text-xs font-semibold">Stand<br/>By</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-800">
                        {getFuncoesPorProduto(taxaVisualizando.tipo_produto).map((funcao, index) => {
                          const valorSalvo = taxaVisualizando.valores_remota?.find(v => v.funcao === funcao);
                          if (!valorSalvo) return null;

                          // LÓGICA CORRIGIDA: Se taxa é personalizada, usar valores salvos no banco
                          let valores;
                          if (taxaVisualizando.personalizado) {
                            // Para taxas personalizadas, usar EXATAMENTE os valores do banco
                            valores = {
                              valor_base: valorSalvo.valor_base,
                              valor_17h30_19h30: valorSalvo.valor_17h30_19h30 || 0,
                              valor_apos_19h30: valorSalvo.valor_apos_19h30 || 0,
                              valor_fim_semana: valorSalvo.valor_fim_semana || 0,
                              valor_adicional: valorSalvo.valor_adicional || 0,
                              valor_standby: valorSalvo.valor_standby || 0
                            };
                          } else {
                            // Para taxas não-personalizadas, calcular automaticamente
                            const todasFuncoes = taxaVisualizando.valores_remota?.map(v => ({
                              funcao: v.funcao,
                              valor_base: v.valor_base
                            })) || [];

                            valores = calcularValores(
                              valorSalvo.valor_base, 
                              funcao, 
                              todasFuncoes, 
                              taxaVisualizando.tipo_calculo_adicional,
                              taxaVisualizando.tipo_produto
                            );
                          }

                          return (
                            <tr key={funcao} className={index % 2 === 0 ? 'bg-gray-50 dark:bg-gray-900/50' : 'bg-white dark:bg-gray-800'}>
                              <td className="border-r border-gray-200 dark:border-gray-700 px-3 py-2 text-xs font-medium text-gray-900 dark:text-white">{funcao}</td>
                              <td className="border-r border-gray-200 dark:border-gray-700 px-3 py-2 text-center text-xs font-semibold text-gray-900 dark:text-white">
                                R$ {valores.valor_base.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                              <td className="border-r border-gray-200 dark:border-gray-700 px-3 py-2 text-center text-xs text-gray-700 dark:text-gray-300 bg-blue-50 dark:bg-blue-900/20">
                                R$ {valores.valor_17h30_19h30.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                              <td className="border-r border-gray-200 dark:border-gray-700 px-3 py-2 text-center text-xs text-gray-700 dark:text-gray-300 bg-blue-50 dark:bg-blue-900/20">
                                R$ {valores.valor_apos_19h30.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                              <td className="border-r border-gray-200 dark:border-gray-700 px-3 py-2 text-center text-xs text-gray-700 dark:text-gray-300 bg-blue-50 dark:bg-blue-900/20">
                                R$ {valores.valor_fim_semana.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                              <td className="border-r border-gray-200 dark:border-gray-700 px-3 py-2 text-center text-xs text-gray-700 dark:text-gray-300 bg-blue-50 dark:bg-blue-900/20">
                                R$ {valores.valor_adicional.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                              <td className="px-3 py-2 text-center text-xs text-gray-700 dark:text-gray-300 bg-blue-50 dark:bg-blue-900/20">
                                R$ {valores.valor_standby.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Tabela de Valores Locais */}
                <div>
                  <h3 className="text-base font-semibold mb-3 text-gray-900 dark:text-white flex items-center gap-2">
                    <FileText className="h-5 w-5 text-sonda-blue" />
                    Valores Hora Local
                  </h3>
                  <div className="rounded-lg overflow-hidden">
                    <table className="w-full border-collapse table-fixed">
                      <colgroup>
                        <col style={{ width: '200px' }} />
                        <col style={{ width: '150px' }} />
                        <col style={{ width: '150px' }} />
                        <col style={{ width: '150px' }} />
                        <col style={{ width: '150px' }} />
                        <col style={{ width: '150px' }} />
                        <col style={{ width: '130px' }} />
                      </colgroup>
                      <thead>
                        <tr className="bg-sonda-blue text-white">
                          <th className="border-r border-white/20 px-3 py-2.5 text-left text-xs font-semibold rounded-tl-lg">Função</th>
                          <th className="border-r border-white/20 px-3 py-2.5 text-center text-xs font-semibold">Seg-Sex<br/>08h30-17h30</th>
                          <th className="border-r border-white/20 px-3 py-2.5 text-center text-xs font-semibold">Seg-Sex<br/>17h30-19h30</th>
                          <th className="border-r border-white/20 px-3 py-2.5 text-center text-xs font-semibold">Seg-Sex<br/>Após 19h30</th>
                          <th className="px-3 py-2.5 text-center text-xs font-semibold rounded-tr-lg">Sáb/Dom/<br/>Feriados</th>
                          <th className="px-3 py-2.5 text-center text-xs font-semibold invisible"></th>
                          <th className="px-3 py-2.5 text-center text-xs font-semibold invisible"></th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-800">
                        {getFuncoesPorProduto(taxaVisualizando.tipo_produto).map((funcao, index) => {
                          const valorSalvo = taxaVisualizando.valores_local?.find(v => v.funcao === funcao);
                          if (!valorSalvo) return null;

                          // LÓGICA CORRIGIDA: Se taxa é personalizada, usar valores salvos no banco
                          let valores;
                          if (taxaVisualizando.personalizado) {
                            // Para taxas personalizadas, usar EXATAMENTE os valores do banco
                            valores = {
                              valor_base: valorSalvo.valor_base,
                              valor_17h30_19h30: valorSalvo.valor_17h30_19h30 || 0,
                              valor_apos_19h30: valorSalvo.valor_apos_19h30 || 0,
                              valor_fim_semana: valorSalvo.valor_fim_semana || 0,
                              valor_adicional: 0, // Valores locais não têm adicional
                              valor_standby: 0    // Valores locais não têm standby
                            };
                          } else {
                            // Para taxas não-personalizadas, calcular automaticamente
                            const todasFuncoes = taxaVisualizando.valores_local?.map(v => ({
                              funcao: v.funcao,
                              valor_base: v.valor_base
                            })) || [];

                            valores = calcularValores(
                              valorSalvo.valor_base, 
                              funcao, 
                              todasFuncoes, 
                              taxaVisualizando.tipo_calculo_adicional,
                              taxaVisualizando.tipo_produto,
                              true // isLocal = true para valores locais
                            );
                          }

                          return (
                            <tr key={funcao} className={index % 2 === 0 ? 'bg-gray-50 dark:bg-gray-900/50' : 'bg-white dark:bg-gray-800'}>
                              <td className="border-r border-gray-200 dark:border-gray-700 px-3 py-2 text-xs font-medium text-gray-900 dark:text-white">{funcao}</td>
                              <td className="border-r border-gray-200 dark:border-gray-700 px-3 py-2 text-center text-xs font-semibold text-gray-900 dark:text-white">
                                R$ {valores.valor_base.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                              <td className="border-r border-gray-200 dark:border-gray-700 px-3 py-2 text-center text-xs text-gray-700 dark:text-gray-300 bg-blue-50 dark:bg-blue-900/20">
                                R$ {valores.valor_17h30_19h30.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                              <td className="border-r border-gray-200 dark:border-gray-700 px-3 py-2 text-center text-xs text-gray-700 dark:text-gray-300 bg-blue-50 dark:bg-blue-900/20">
                                R$ {valores.valor_apos_19h30.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                              <td className={`px-3 py-2 text-center text-xs text-gray-700 dark:text-gray-300 bg-blue-50 dark:bg-blue-900/20 ${index === getFuncoesPorProduto(taxaVisualizando.tipo_produto).length - 1 ? 'rounded-br-lg' : ''}`}>
                                R$ {valores.valor_fim_semana.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                              <td className="px-3 py-2 invisible"></td>
                              <td className="px-3 py-2 invisible"></td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <Button 
                    onClick={() => setModalVisualizarAberto(false)}
                    className="bg-sonda-blue hover:bg-sonda-dark-blue"
                  >
                    Fechar
                  </Button>
                </div>
              </div>
              );
            })()}
          </DialogContent>
        </Dialog>

        {/* Modal de Taxa Padrão */}
        <Dialog open={modalTaxaPadraoAberto} onOpenChange={setModalTaxaPadraoAberto}>
          <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Configurar Taxa Padrão</DialogTitle>
              <p className="text-sm text-muted-foreground mt-2">
                Configure as taxas padrão que serão aplicadas automaticamente para clientes sem AMS
              </p>
            </DialogHeader>
            
            {/* Abas principais: Configuração e Histórico */}
            <Tabs defaultValue="configuracao" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="configuracao">Configuração</TabsTrigger>
                <TabsTrigger value="historico">Histórico de Parametrizações</TabsTrigger>
              </TabsList>
              
              {/* Aba de Configuração */}
              <TabsContent value="configuracao" className="mt-6">
                <TaxaPadraoForm
                  onSubmit={handleSalvarTaxaPadrao}
                  onCancel={() => setModalTaxaPadraoAberto(false)}
                  isLoading={criarTaxaPadrao.isPending}
                />
              </TabsContent>
              
              {/* Aba de Histórico */}
              <TabsContent value="historico" className="mt-6">
                <Tabs value={tipoProdutoTaxaPadrao} onValueChange={(value) => setTipoProdutoTaxaPadrao(value as 'GALLERY' | 'OUTROS')} className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="GALLERY">GALLERY</TabsTrigger>
                    <TabsTrigger value="OUTROS">COMEX, FISCAL</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="GALLERY" className="mt-4">
                    <TaxaPadraoHistorico tipoProduto="GALLERY" />
                  </TabsContent>
                  
                  <TabsContent value="OUTROS" className="mt-4">
                    <TaxaPadraoHistorico tipoProduto="OUTROS" />
                  </TabsContent>
                </Tabs>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>

        {/* Modal de Confirmação de Exclusão */}
        <AlertDialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja excluir a taxa do cliente "{taxaParaExcluir?.cliente?.nome_abreviado}"?
                Esta ação não pode ser desfeita.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={confirmDelete}
                disabled={deletarTaxa.isPending}
                className="bg-red-600 hover:bg-red-700"
              >
                {deletarTaxa.isPending ? 'Excluindo...' : 'Excluir'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </LayoutAdmin>
  );
}

export default CadastroTaxasClientes;
