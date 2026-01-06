/**
 * Página para gerenciamento de taxas de clientes
 */

import { useState, useMemo } from 'react';
import { Plus, Edit, Trash2, Eye, ArrowUpDown, ArrowUp, ArrowDown, Filter, Download, ChevronDown, FileSpreadsheet, FileText, Search, ChevronLeft, ChevronRight } from 'lucide-react';
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
import { useCriarTaxaPadrao } from '@/hooks/useTaxasPadrao';
import type { TaxaClienteCompleta, TaxaFormData } from '@/types/taxasClientes';
import { calcularValores, getFuncoesPorProduto } from '@/types/taxasClientes';
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
  
  // Estados de filtro
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [filtroCliente, setFiltroCliente] = useState('');
  const [filtroTipoProduto, setFiltroTipoProduto] = useState<string>('todos');
  const [filtroStatus, setFiltroStatus] = useState<string>('todos');
  const [exportando, setExportando] = useState(false);
  
  // Estados de paginação
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);

  // Queries e mutations
  const { data: taxas = [], isLoading, refetch } = useTaxas();
  const criarTaxa = useCriarTaxa();
  const atualizarTaxa = useAtualizarTaxa();
  const deletarTaxa = useDeletarTaxa();
  const criarTaxaPadrao = useCriarTaxaPadrao();

  const handleNovaTaxa = () => {
    setTaxaEditando(null);
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

  const handleDeletarTaxa = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir esta taxa?')) {
      try {
        await deletarTaxa.mutateAsync(id);
        await refetch();
      } catch (error) {
        console.error('Erro ao deletar taxa:', error);
      }
    }
  };

  const handleSubmit = async (dados: TaxaFormData) => {
    try {
      if (taxaEditando) {
        await atualizarTaxa.mutateAsync({ id: taxaEditando.id, dados });
      } else {
        await criarTaxa.mutateAsync(dados);
      }
      setModalAberto(false);
      setTaxaEditando(null);
      await refetch();
    } catch (error) {
      console.error('Erro ao salvar taxa:', error);
      toast.error(`Erro ao salvar taxa: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  };

  const verificarVigente = (vigenciaInicio: string, vigenciaFim?: string) => {
    const hoje = new Date().toISOString().split('T')[0];
    const inicioValido = vigenciaInicio <= hoje;
    const fimValido = !vigenciaFim || vigenciaFim >= hoje;
    return inicioValido && fimValido;
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
    setFiltroStatus('todos');
    setCurrentPage(1);
  };

  // Filtrar e ordenar taxas
  const taxasFiltradas = useMemo(() => {
    let resultado = [...taxas];

    // Filtro por cliente
    if (filtroCliente) {
      resultado = resultado.filter(taxa =>
        taxa.cliente?.nome_abreviado?.toLowerCase().includes(filtroCliente.toLowerCase()) ||
        taxa.cliente?.nome_completo?.toLowerCase().includes(filtroCliente.toLowerCase())
      );
    }

    // Filtro por tipo de produto
    if (filtroTipoProduto !== 'todos') {
      resultado = resultado.filter(taxa => taxa.tipo_produto === filtroTipoProduto);
    }

    // Filtro por status
    if (filtroStatus !== 'todos') {
      resultado = resultado.filter(taxa => {
        const vigente = verificarVigente(taxa.vigencia_inicio, taxa.vigencia_fim);
        return filtroStatus === 'vigente' ? vigente : !vigente;
      });
    }

    return resultado;
  }, [taxas, filtroCliente, filtroTipoProduto, filtroStatus]);

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

  // Funções de exportação
  const exportarParaExcel = async () => {
    try {
      setExportando(true);
      
      const XLSX = await import('xlsx');
      
      // Aba 1: Resumo das Taxas
      const dadosResumo = taxasOrdenadas.map(taxa => ({
        'Cliente': taxa.cliente?.nome_abreviado || '-',
        'Tipo de Produto': taxa.tipo_produto === 'GALLERY' ? 'GALLERY' : 'COMEX, FISCAL',
        'Vigência Início': format(new Date(taxa.vigencia_inicio + 'T00:00:00'), 'dd/MM/yyyy', { locale: ptBR }),
        'Vigência Fim': taxa.vigencia_fim ? format(new Date(taxa.vigencia_fim + 'T00:00:00'), 'dd/MM/yyyy', { locale: ptBR }) : 'Indefinida',
        'Status': verificarVigente(taxa.vigencia_inicio, taxa.vigencia_fim) ? 'Vigente' : 'Não Vigente',
        'Tipo de Cálculo': taxa.tipo_calculo_adicional === 'normal' ? 'Normal' : 'Média'
      }));

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

      // Criar workbook com duas abas
      const wb = XLSX.utils.book_new();
      
      const wsResumo = XLSX.utils.json_to_sheet(dadosResumo);
      XLSX.utils.book_append_sheet(wb, wsResumo, 'Resumo');
      
      const wsDetalhes = XLSX.utils.json_to_sheet(dadosDetalhes);
      XLSX.utils.book_append_sheet(wb, wsDetalhes, 'Detalhes das Taxas');

      const dataAtual = new Date().toLocaleDateString('pt-BR').replace(/\//g, '-');
      XLSX.writeFile(wb, `taxas-clientes-${dataAtual}.xlsx`);

      toast.success(`${taxasOrdenadas.length} taxas exportadas para Excel com sucesso!`);
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
      const colWidths = [45, 35, 28, 28, 22, 22]; // Ajustado para incluir Tipo de Cálculo

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
      doc.text('Tipo Cálculo', margin + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + colWidths[4] + 2, yPos + 5);

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

        doc.text(taxa.cliente?.nome_abreviado || '-', margin + 2, yPos + 4.5);
        doc.text(taxa.tipo_produto === 'GALLERY' ? 'GALLERY' : 'COMEX, FISCAL', margin + colWidths[0] + 2, yPos + 4.5);
        doc.text(format(new Date(taxa.vigencia_inicio + 'T00:00:00'), 'dd/MM/yyyy'), margin + colWidths[0] + colWidths[1] + 2, yPos + 4.5);
        doc.text(taxa.vigencia_fim ? format(new Date(taxa.vigencia_fim + 'T00:00:00'), 'dd/MM/yyyy') : 'Indefinida', margin + colWidths[0] + colWidths[1] + colWidths[2] + 2, yPos + 4.5);
        doc.text(verificarVigente(taxa.vigencia_inicio, taxa.vigencia_fim) ? 'Vigente' : 'Não Vigente', margin + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + 2, yPos + 4.5);
        doc.text(taxa.tipo_calculo_adicional === 'normal' ? 'Normal' : 'Média', margin + colWidths[0] + colWidths[1] + colWidths[2] + colWidths[3] + colWidths[4] + 2, yPos + 4.5);

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
        doc.text(`${taxa.cliente?.nome_abreviado || '-'} - ${taxa.tipo_produto === 'GALLERY' ? 'GALLERY' : 'COMEX, FISCAL'}`, margin + 2, yPos + 5.5);
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

      const dataArquivo = new Date().toLocaleDateString('pt-BR').replace(/\//g, '-');
      doc.save(`taxas-clientes-${dataArquivo}.pdf`);

      toast.success(`Relatório PDF gerado com ${taxasOrdenadas.length} taxas!`);
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

        {/* Tabela de Taxas */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg lg:text-xl">Taxas Cadastradas ({taxasOrdenadas.length})</CardTitle>
              {/* Botão de Filtros */}
              <div className="flex flex-col sm:flex-row gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setMostrarFiltros(!mostrarFiltros)}
                  className="flex items-center justify-center space-x-2"
                >
                  <Filter className="h-4 w-4" />
                  <span>Filtros</span>
                </Button>
              </div>
            </div>
            {/* Filtros */}
            {mostrarFiltros && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
              {/* Filtro por Cliente */}
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Buscar
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Buscar por cliente..."
                    value={filtroCliente}
                    onChange={(e) => {
                      setFiltroCliente(e.target.value);
                      setCurrentPage(1); // Reset página ao filtrar
                    }}
                    className="pl-10"
                  />
                </div>
              </div>

              {/* Filtro por Tipo de Produto */}
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Tipo de Produto
                </label>
                <Select value={filtroTipoProduto} onValueChange={(value) => {
                  setFiltroTipoProduto(value);
                  setCurrentPage(1); // Reset página ao filtrar
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os tipos" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os tipos</SelectItem>
                    <SelectItem value="GALLERY">GALLERY</SelectItem>
                    <SelectItem value="OUTROS">COMEX, FISCAL</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Filtro por Status */}
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Status
                </label>
                <Select value={filtroStatus} onValueChange={(value) => {
                  setFiltroStatus(value);
                  setCurrentPage(1); // Reset página ao filtrar
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os status</SelectItem>
                    <SelectItem value="vigente">Vigente</SelectItem>
                    <SelectItem value="nao_vigente">Não Vigente</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Botão Limpar Filtros */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Ações</label>
                <Button
                  variant="outline"
                  onClick={limparFiltros}
                  disabled={filtroCliente === '' && filtroTipoProduto === 'todos' && filtroStatus === 'todos'}
                  className="w-full h-10"
                >
                  Limpar Filtros
                </Button>
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
                    <TableHead className="text-center">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                        Carregando...
                      </TableCell>
                    </TableRow>
                  ) : taxasOrdenadas.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                        Nenhuma taxa cadastrada
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedData.items.map((taxa) => {
                      const vigente = verificarVigente(taxa.vigencia_inicio, taxa.vigencia_fim);
                      
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
                                ? 'bg-[#0066FF] text-white hover:bg-[#0052CC]' 
                                : 'border-[#0066FF] text-[#0066FF] bg-white hover:bg-blue-50'
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
                            <Badge variant={vigente ? 'default' : 'secondary'} className={vigente ? 'bg-green-600' : ''}>
                              {vigente ? 'Vigente' : 'Não Vigente'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleVisualizarTaxa(taxa)}
                                title="Visualizar"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleEditarTaxa(taxa)}
                                title="Editar"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={() => handleDeletarTaxa(taxa.id)}
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
              }}
              isLoading={criarTaxa.isPending || atualizarTaxa.isPending}
            />
          </DialogContent>
        </Dialog>

        {/* Modal de Visualização */}
        <Dialog open={modalVisualizarAberto} onOpenChange={setModalVisualizarAberto}>
          <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Detalhes da Taxa</DialogTitle>
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
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Cliente</p>
                    <p className="text-lg font-semibold">{taxaVisualizando.cliente?.nome_completo}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Tipo de Produto</p>
                    <Badge 
                      variant={taxaVisualizando.tipo_produto === 'GALLERY' ? 'default' : 'outline'}
                      className={taxaVisualizando.tipo_produto === 'GALLERY' 
                        ? 'bg-[#0066FF] text-white hover:bg-[#0052CC]' 
                        : 'border-[#0066FF] text-[#0066FF] bg-white hover:bg-blue-50'
                      }
                    >
                      {tipoProdutoTexto}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Vigência Início</p>
                    <p className="text-lg">
                      {format(new Date(taxaVisualizando.vigencia_inicio + 'T00:00:00'), 'dd/MM/yyyy', { locale: ptBR })}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Vigência Fim</p>
                    <p className="text-lg">
                      {taxaVisualizando.vigencia_fim 
                        ? format(new Date(taxaVisualizando.vigencia_fim + 'T00:00:00'), 'dd/MM/yyyy', { locale: ptBR })
                        : 'Indefinida'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Tipo de Taxa</p>
                    <div className="flex items-center gap-2">
                      <Badge 
                        variant={taxaVisualizando.personalizado ? 'default' : 'secondary'}
                        className={taxaVisualizando.personalizado 
                          ? 'bg-orange-600 text-white hover:bg-orange-700' 
                          : 'bg-gray-200 text-gray-700'
                        }
                      >
                        {taxaVisualizando.personalizado ? 'Personalizada' : 'Automática'}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Tabela de Valores Remotos */}
                <div>
                  <h3 className="text-base font-semibold mb-3 text-gray-900 dark:text-white">Valores Hora Remota</h3>
                  <div className="overflow-x-auto rounded-lg border-gray-200 dark:border-gray-700">
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
                        <tr className="bg-[#0066FF] text-white">
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
                  <h3 className="text-base font-semibold mb-3 text-gray-900 dark:text-white">Valores Hora Local</h3>
                  <div className="rounded-lg border-gray-200 dark:border-gray-700 overflow-hidden">
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
                        <tr className="bg-[#0066FF] text-white">
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

                <div className="flex justify-end">
                  <Button onClick={() => setModalVisualizarAberto(false)}>
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
      </div>
    </LayoutAdmin>
  );
}

export default CadastroTaxasClientes;
