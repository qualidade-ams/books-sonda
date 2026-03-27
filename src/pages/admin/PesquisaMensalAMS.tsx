/**
 * Página para importação e visualização de Pesquisa Mensal AMS
 */

import { useState, useMemo } from 'react';
import {
  Upload, Download, FileSpreadsheet, FileText, ChevronDown,
  ChevronLeft, ChevronRight, Filter, Search, X, Eye, Edit, Trash2,
  BarChart3, CheckCircle, AlertCircle, Star, Users
} from 'lucide-react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from '@/components/ui/table';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from '@/components/ui/dialog';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from '@/components/ui/alert-dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';

import LayoutAdmin from '@/components/admin/LayoutAdmin';
import ProtectedAction from '@/components/auth/ProtectedAction';

import {
  usePesquisasMensalAMS,
  useEstatisticasAMS,
  useFiltrosDistintosAMS,
  useImportarPesquisasAMS,
  useAtualizarPesquisaAMS,
  useExcluirPesquisaAMS,
  useExcluirMultiplasPesquisasAMS,
} from '@/hooks/usePesquisaMensalAMS';

import {
  exportarAMSExcel,
  exportarAMSPDF,
  gerarTemplateImportacaoAMS,
} from '@/utils/pesquisaAMSExportUtils';

import type {
  PesquisaMensalAMS as PesquisaAMSType,
  PesquisaMensalAMSFormData,
  FiltrosPesquisaAMS,
  MESES_NOMES,
} from '@/types/pesquisaMensalAMS';

const MESES: Record<number, string> = {
  1: 'Janeiro', 2: 'Fevereiro', 3: 'Março', 4: 'Abril',
  5: 'Maio', 6: 'Junho', 7: 'Julho', 8: 'Agosto',
  9: 'Setembro', 10: 'Outubro', 11: 'Novembro', 12: 'Dezembro',
};

function parseDataBR(valor: any): string | null {
  if (valor === null || valor === undefined || valor === '') return null;

  // Se for número (serial date do Excel)
  if (typeof valor === 'number') {
    // Excel serial date: dias desde 1/1/1900 (com bug do leap year 1900)
    const excelEpoch = new Date(1899, 11, 30);
    const d = new Date(excelEpoch.getTime() + valor * 86400000);
    if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
    return null;
  }

  const str = String(valor).trim();
  if (!str) return null;

  // DD/MM/AAAA
  const matchBR = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (matchBR) {
    const [, dia, mes, ano] = matchBR;
    return `${ano}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
  }

  // M/D/YY (formato americano curto - padrão do arquivo AMS)
  const matchUS = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2})$/);
  if (matchUS) {
    const [, mes, dia, anoShort] = matchUS;
    const ano = parseInt(anoShort) >= 50 ? `19${anoShort}` : `20${anoShort}`;
    return `${ano}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
  }

  // Tentar ISO ou qualquer formato parseable
  const parsed = Date.parse(str);
  if (!isNaN(parsed)) return new Date(parsed).toISOString().split('T')[0];

  return null;
}

function parseBooleanSN(valor: any): boolean {
  if (typeof valor === 'boolean') return valor;
  const str = String(valor || '').trim().toUpperCase();
  return str === 'SIM' || str === 'S' || str === 'YES' || str === 'Y' || str === '1' || str === 'TRUE';
}

function formatarDataExibicao(data: string | null): string {
  if (!data) return '-';
  try {
    const d = new Date(data);
    return d.toLocaleDateString('pt-BR');
  } catch {
    return data;
  }
}

function PesquisaMensalAMS() {
  const agora = new Date();
  const [mesAtual, setMesAtual] = useState(agora.getMonth() + 1);
  const [anoAtual, setAnoAtual] = useState(agora.getFullYear());
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [filtrosBusca, setFiltrosBusca] = useState({
    busca: '',
    cliente: 'todos',
    vertical: 'todos',
    situacao: 'todas',
  });
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [itensPorPagina, setItensPorPagina] = useState(25);
  const [selecionados, setSelecionados] = useState<string[]>([]);

  // Modais
  const [modalImportAberto, setModalImportAberto] = useState(false);
  const [modalVisualizarAberto, setModalVisualizarAberto] = useState(false);
  const [modalEditarAberto, setModalEditarAberto] = useState(false);
  const [modalExcluirAberto, setModalExcluirAberto] = useState(false);
  const [pesquisaSelecionada, setPesquisaSelecionada] = useState<PesquisaAMSType | null>(null);
  const [dadosEdicao, setDadosEdicao] = useState<Partial<PesquisaMensalAMSFormData>>({});
  const [isExporting, setIsExporting] = useState(false);

  // Import state
  const [dadosImportacao, setDadosImportacao] = useState<PesquisaMensalAMSFormData[]>([]);
  const [errosImportacao, setErrosImportacao] = useState<string[]>([]);

  // Filtros para query
  const filtros: FiltrosPesquisaAMS = {
    mes: mesAtual,
    ano: anoAtual,
    ...(filtrosBusca.busca && { busca: filtrosBusca.busca }),
    ...(filtrosBusca.cliente !== 'todos' && { cliente: filtrosBusca.cliente }),
    ...(filtrosBusca.vertical !== 'todos' && { vertical: filtrosBusca.vertical }),
    ...(filtrosBusca.situacao !== 'todas' && { situacao_resposta: filtrosBusca.situacao }),
  };

  // Queries
  const { data: pesquisas = [], isLoading, refetch } = usePesquisasMensalAMS(filtros);
  const { data: estatisticas } = useEstatisticasAMS({ mes: mesAtual, ano: anoAtual });
  const { data: filtrosDistintos } = useFiltrosDistintosAMS();

  // Mutations
  const importarMutation = useImportarPesquisasAMS();
  const atualizarMutation = useAtualizarPesquisaAMS();
  const excluirMutation = useExcluirPesquisaAMS();
  const excluirMultiplasMutation = useExcluirMultiplasPesquisasAMS();

  // Paginação
  const totalPaginas = Math.ceil(pesquisas.length / itensPorPagina);
  const pesquisasPaginadas = useMemo(() => {
    const inicio = (paginaAtual - 1) * itensPorPagina;
    return pesquisas.slice(inicio, inicio + itensPorPagina);
  }, [pesquisas, paginaAtual, itensPorPagina]);

  // Navegação por mês
  const handleMesAnterior = () => {
    if (mesAtual === 1) { setMesAtual(12); setAnoAtual(a => a - 1); }
    else setMesAtual(m => m - 1);
    setPaginaAtual(1);
  };
  const handleMesProximo = () => {
    if (mesAtual === 12) { setMesAtual(1); setAnoAtual(a => a + 1); }
    else setMesAtual(m => m + 1);
    setPaginaAtual(1);
  };

  const hasActiveFilters = () =>
    filtrosBusca.busca !== '' || filtrosBusca.cliente !== 'todos' ||
    filtrosBusca.vertical !== 'todos' || filtrosBusca.situacao !== 'todas';

  const limparFiltros = () => {
    setFiltrosBusca({ busca: '', cliente: 'todos', vertical: 'todos', situacao: 'todas' });
    setPaginaAtual(1);
  };

  // Seleção
  const handleSelectAll = (checked: boolean) => {
    setSelecionados(checked ? pesquisasPaginadas.map(p => p.id) : []);
  };
  const handleSelectItem = (id: string, checked: boolean) => {
    setSelecionados(prev => checked ? [...prev, id] : prev.filter(i => i !== id));
  };

  // Importação Excel
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array', cellDates: false });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json<any>(sheet, { defval: '' });

        const erros: string[] = [];
        const registros: PesquisaMensalAMSFormData[] = [];

        // Detectar nomes de colunas (pode ter variações)
        const colId = (row: any) => row['Identificador do questionário'] ?? row['Identificador do questionario'] ?? row['identificador_questionario'] ?? '';
        const colNome = (row: any) => row['Nome do questionário'] ?? row['Nome do questionario'] ?? row['nome_questionario'] ?? '';
        const colMes = (row: any) => row['Mês de referência'] ?? row['Mes de referência'] ?? row['Mês de referencia'] ?? row['mes_referencia'] ?? '';
        const colInicioReal = (row: any) => row['Início real do questionário'] ?? row['Inicio real do questionário'] ?? row['Início real do questionario'] ?? row['inicio_real_questionario'] ?? '';
        const colRespondente = (row: any) => row['Nome do respondente'] ?? row['nome_respondente'] ?? '';
        const colEmail = (row: any) => row['E-mail do respondente'] ?? row['Email do respondente'] ?? row['email_respondente'] ?? '';
        const colCliente = (row: any) => row['Cliente'] ?? row['cliente'] ?? '';
        const colFoco = (row: any) => row['Cliente FOCO'] ?? row['Cliente Foco'] ?? row['cliente_foco'] ?? '';
        const colVertical = (row: any) => row['Vertical'] ?? row['vertical'] ?? '';
        const colUN = (row: any) => row['Unidade de Negócio'] ?? row['Unidade de Negocio'] ?? row['unidade_negocio'] ?? '';
        const colNota = (row: any) => row['Nota'] ?? row['nota'] ?? '';
        const colComentario = (row: any) => row['Comentário'] ?? row['Comentario'] ?? row['comentario'] ?? '';
        const colInicioResp = (row: any) => row['Início da resposta'] ?? row['Inicio da resposta'] ?? row['inicio_resposta'] ?? '';
        const colTerminoResp = (row: any) => row['Término da resposta'] ?? row['Termino da resposta'] ?? row['termino_resposta'] ?? '';
        const colSituacao = (row: any) => row['Situação da resposta'] ?? row['Situacao da resposta'] ?? row['situacao_resposta'] ?? '';
        const colIncompleto = (row: any) => row['Incompleto'] ?? row['incompleto'] ?? '';

        jsonData.forEach((row: any, idx: number) => {
          const linha = idx + 2;
          const identificador = String(colId(row)).trim();
          const nomeQuest = String(colNome(row)).trim();
          const mesRefRaw = colMes(row);
          const mesRef = parseInt(String(mesRefRaw));

          // Pular linhas vazias
          if (!identificador && !nomeQuest) return;

          if (!identificador) { erros.push(`Linha ${linha}: Identificador do questionário é obrigatório`); return; }
          if (!nomeQuest) { erros.push(`Linha ${linha}: Nome do questionário é obrigatório`); return; }
          if (isNaN(mesRef) || mesRef < 1 || mesRef > 12) { erros.push(`Linha ${linha}: Mês de referência deve ser entre 1 e 12`); return; }

          const notaRaw = colNota(row);
          const nota = notaRaw !== '' && notaRaw !== undefined && notaRaw !== null ? parseFloat(String(notaRaw)) : null;

          // Calcular ano_referencia a partir de inicio_real_questionario - 1 mês
          // O inicio_real é sempre 1 mês à frente do mês de referência
          const inicioRealParsed = parseDataBR(colInicioReal(row));
          let anoRef = anoAtual;
          if (inicioRealParsed) {
            const dataInicio = new Date(inicioRealParsed);
            // Subtrair 1 mês para obter o mês/ano real de referência
            dataInicio.setMonth(dataInicio.getMonth() - 1);
            const anoCalculado = dataInicio.getFullYear();
            if (!isNaN(anoCalculado) && anoCalculado > 2000) anoRef = anoCalculado;
          }

          registros.push({
            identificador_questionario: identificador,
            nome_questionario: nomeQuest,
            mes_referencia: mesRef,
            inicio_real_questionario: inicioRealParsed || undefined,
            nome_respondente: String(colRespondente(row)).trim() || undefined,
            email_respondente: String(colEmail(row)).trim() || undefined,
            cliente: String(colCliente(row)).trim() || undefined,
            cliente_foco: parseBooleanSN(colFoco(row)),
            vertical: String(colVertical(row)).trim() || undefined,
            unidade_negocio: String(colUN(row)).trim() || undefined,
            nota: nota !== null && !isNaN(nota) ? nota : undefined,
            comentario: String(colComentario(row)).trim() || undefined,
            inicio_resposta: parseDataBR(colInicioResp(row)) || undefined,
            termino_resposta: parseDataBR(colTerminoResp(row)) || undefined,
            situacao_resposta: String(colSituacao(row)).trim() || undefined,
            incompleto: parseBooleanSN(colIncompleto(row)),
            ano_referencia: anoRef,
          });
        });

        setDadosImportacao(registros);
        setErrosImportacao(erros);

        if (registros.length === 0 && erros.length === 0) {
          toast.error('Nenhum dado encontrado no arquivo');
        }
      } catch (error) {
        console.error('Erro ao ler arquivo:', error);
        toast.error('Erro ao ler o arquivo Excel');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleConfirmarImportacao = async () => {
    if (dadosImportacao.length === 0) return;
    try {
      const resultado = await importarMutation.mutateAsync(dadosImportacao);
      toast.success(`${resultado.totalInseridos} registros importados com sucesso`);

      // Navegar para o mês/ano dos dados importados
      const primeiroRegistro = dadosImportacao[0];
      if (primeiroRegistro.mes_referencia) {
        setMesAtual(primeiroRegistro.mes_referencia);
      }
      if (primeiroRegistro.ano_referencia) {
        setAnoAtual(primeiroRegistro.ano_referencia);
      }
      setPaginaAtual(1);

      setModalImportAberto(false);
      setDadosImportacao([]);
      setErrosImportacao([]);
      refetch();
    } catch (error: any) {
      toast.error(`Erro na importação: ${error.message}`);
    }
  };

  // Edição
  const handleAbrirEdicao = (pesquisa: PesquisaAMSType) => {
    setPesquisaSelecionada(pesquisa);
    setDadosEdicao({
      identificador_questionario: pesquisa.identificador_questionario,
      nome_questionario: pesquisa.nome_questionario,
      mes_referencia: pesquisa.mes_referencia,
      inicio_real_questionario: pesquisa.inicio_real_questionario || undefined,
      nome_respondente: pesquisa.nome_respondente || undefined,
      email_respondente: pesquisa.email_respondente || undefined,
      cliente: pesquisa.cliente || undefined,
      cliente_foco: pesquisa.cliente_foco,
      vertical: pesquisa.vertical || undefined,
      unidade_negocio: pesquisa.unidade_negocio || undefined,
      nota: pesquisa.nota ?? undefined,
      comentario: pesquisa.comentario || undefined,
      inicio_resposta: pesquisa.inicio_resposta || undefined,
      termino_resposta: pesquisa.termino_resposta || undefined,
      situacao_resposta: pesquisa.situacao_resposta || undefined,
      incompleto: pesquisa.incompleto,
      ano_referencia: pesquisa.ano_referencia ?? undefined,
    });
    setModalEditarAberto(true);
  };

  const handleSalvarEdicao = async () => {
    if (!pesquisaSelecionada) return;
    try {
      await atualizarMutation.mutateAsync({ id: pesquisaSelecionada.id, dados: dadosEdicao });
      toast.success('Registro atualizado com sucesso');
      setModalEditarAberto(false);
      setPesquisaSelecionada(null);
    } catch (error: any) {
      toast.error(`Erro ao atualizar: ${error.message}`);
    }
  };

  // Exclusão
  const handleConfirmarExclusao = async () => {
    if (!pesquisaSelecionada) return;
    try {
      await excluirMutation.mutateAsync(pesquisaSelecionada.id);
      toast.success('Registro excluído com sucesso');
      setModalExcluirAberto(false);
      setPesquisaSelecionada(null);
    } catch (error: any) {
      toast.error(`Erro ao excluir: ${error.message}`);
    }
  };

  // Exportação
  const handleExportExcel = async () => {
    if (pesquisas.length === 0) { toast.error('Não há dados para exportar'); return; }
    setIsExporting(true);
    try {
      const resultado = await exportarAMSExcel(pesquisas, estatisticas || { total: 0, completas: 0, incompletas: 0, cliente_foco: 0, media_nota: 0 });
      resultado.success ? toast.success(resultado.message) : toast.error(resultado.error);
    } finally { setIsExporting(false); }
  };

  const handleExportPDF = async () => {
    if (pesquisas.length === 0) { toast.error('Não há dados para exportar'); return; }
    setIsExporting(true);
    try {
      const resultado = await exportarAMSPDF(pesquisas, estatisticas || { total: 0, completas: 0, incompletas: 0, cliente_foco: 0, media_nota: 0 });
      resultado.success ? toast.success(resultado.message) : toast.error(resultado.error);
    } finally { setIsExporting(false); }
  };

  return (
    <LayoutAdmin>
      <div className="space-y-6">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">
              Pesquisa Mensal AMS
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Importação e visualização de pesquisas mensais AMS
            </p>
          </div>
          <div className="flex gap-2 items-center">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" disabled={isExporting || pesquisas.length === 0}>
                  <Download className="h-4 w-4 mr-2" />
                  {isExporting ? 'Exportando...' : 'Exportar'}
                  <ChevronDown className="h-4 w-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={handleExportExcel} disabled={isExporting}>
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  Exportar para Excel
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleExportPDF} disabled={isExporting}>
                  <FileText className="mr-2 h-4 w-4" />
                  Exportar para PDF
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Upload className="h-4 w-4 mr-2" />
                  Importar
                  <ChevronDown className="h-4 w-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={gerarTemplateImportacaoAMS}>
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  Baixar Template Excel
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setModalImportAberto(true)}>
                  <Upload className="mr-2 h-4 w-4" />
                  Importar do Excel
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Cards de Estatísticas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 className="h-4 w-4 text-gray-500" />
                <p className="text-xs font-medium text-gray-500">Total</p>
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{estatisticas?.total || 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <p className="text-xs font-medium text-green-500">Completas</p>
              </div>
              <p className="text-2xl font-bold text-green-600">{estatisticas?.completas || 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="h-4 w-4 text-orange-500" />
                <p className="text-xs font-medium text-orange-500">Incompletas</p>
              </div>
              <p className="text-2xl font-bold text-orange-600">{estatisticas?.incompletas || 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Users className="h-4 w-4 text-blue-500" />
                <p className="text-xs font-medium text-blue-500">Cliente Foco</p>
              </div>
              <p className="text-2xl font-bold text-blue-600">{estatisticas?.cliente_foco || 0}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Star className="h-4 w-4 text-purple-500" />
                <p className="text-xs font-medium text-purple-500">Média Nota</p>
              </div>
              <p className="text-2xl font-bold text-purple-600">{estatisticas?.media_nota || 0}</p>
            </CardContent>
          </Card>
        </div>

        {/* Navegação de Período */}
        <Card>
          <CardContent className="py-3">
            <div className="flex items-center justify-between gap-4">
              <Button variant="outline" size="sm" onClick={handleMesAnterior} className="flex items-center gap-2">
                <ChevronLeft className="h-4 w-4" />
                Anterior
              </Button>
              <div className="text-center">
                <div className="text-lg font-semibold text-gray-900 dark:text-white">
                  {MESES[mesAtual]} {anoAtual}
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={handleMesProximo} className="flex items-center gap-2">
                Próximo
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

          {/* Card Principal com Tabela */}
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Pesquisas AMS - {MESES[mesAtual]} {anoAtual}
                </CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => setMostrarFiltros(!mostrarFiltros)} className="flex items-center justify-center space-x-2">
                    <Filter className="h-4 w-4" /><span>Filtros</span>
                  </Button>
                  {hasActiveFilters() && (
                    <Button variant="outline" size="sm" onClick={limparFiltros} className="whitespace-nowrap hover:border-red-300">
                      <X className="h-4 w-4 mr-2 text-red-600" />Limpar Filtro
                    </Button>
                  )}
                </div>
              </div>

              {/* Filtros expansíveis */}
              {mostrarFiltros && (
                <div className="space-y-4 pt-4 border-t">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <div className="text-sm font-medium mb-2">Buscar</div>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          placeholder="Buscar por identificador, nome, cliente..."
                          value={filtrosBusca.busca}
                          onChange={(e) => { setFiltrosBusca(f => ({ ...f, busca: e.target.value })); setPaginaAtual(1); }}
                          className="pl-10 focus:ring-sonda-blue focus:border-sonda-blue"
                        />
                      </div>
                    </div>
                    <div>
                      <div className="text-sm font-medium mb-2">Cliente</div>
                      <Select value={filtrosBusca.cliente} onValueChange={(v) => { setFiltrosBusca(f => ({ ...f, cliente: v })); setPaginaAtual(1); }}>
                        <SelectTrigger className="focus:ring-sonda-blue focus:border-sonda-blue"><SelectValue placeholder="Todos os clientes" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="todos">Todos os clientes</SelectItem>
                          {filtrosDistintos?.clientes.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <div className="text-sm font-medium mb-2">Vertical</div>
                      <Select value={filtrosBusca.vertical} onValueChange={(v) => { setFiltrosBusca(f => ({ ...f, vertical: v })); setPaginaAtual(1); }}>
                        <SelectTrigger className="focus:ring-sonda-blue focus:border-sonda-blue"><SelectValue placeholder="Todas as verticais" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="todos">Todas as verticais</SelectItem>
                          {filtrosDistintos?.verticais.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <div className="text-sm font-medium mb-2">Situação</div>
                      <Select value={filtrosBusca.situacao} onValueChange={(v) => { setFiltrosBusca(f => ({ ...f, situacao: v })); setPaginaAtual(1); }}>
                        <SelectTrigger className="focus:ring-sonda-blue focus:border-sonda-blue"><SelectValue placeholder="Todas as situações" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="todas">Todas as situações</SelectItem>
                          {filtrosDistintos?.situacoes.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )}
            </CardHeader>

            <CardContent className="overflow-x-auto">
              {isLoading ? (
                <div className="flex justify-center items-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sonda-blue" />
                </div>
              ) : pesquisas.length === 0 ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <BarChart3 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 mb-4">Nenhuma pesquisa encontrada para {MESES[mesAtual]} {anoAtual}</p>
                    <Button className="bg-sonda-blue hover:bg-sonda-dark-blue" onClick={() => setModalImportAberto(true)}>
                      <Upload className="h-4 w-4 mr-2" />Importar Excel
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead className="w-12">
                          <Checkbox
                            checked={selecionados.length === pesquisasPaginadas.length && pesquisasPaginadas.length > 0}
                            onCheckedChange={handleSelectAll}
                          />
                        </TableHead>
                        <TableHead className="font-semibold text-gray-700">Identificador do questionário</TableHead>
                        <TableHead className="font-semibold text-gray-700 text-center">Mês de referência</TableHead>
                        <TableHead className="font-semibold text-gray-700">Nome do respondente</TableHead>
                        <TableHead className="font-semibold text-gray-700">Cliente</TableHead>
                        <TableHead className="font-semibold text-gray-700 text-center">Cliente FOCO</TableHead>
                        <TableHead className="font-semibold text-gray-700 text-center">Nota</TableHead>
                        <TableHead className="font-semibold text-gray-700 text-center w-24">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {pesquisasPaginadas.map((p) => (
                        <TableRow key={p.id} className="hover:bg-gray-50">
                          <TableCell>
                            <Checkbox checked={selecionados.includes(p.id)} onCheckedChange={(c) => handleSelectItem(p.id, !!c)} />
                          </TableCell>
                          <TableCell>
                            <span className="font-medium text-gray-900">{p.identificador_questionario}</span>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="text-sm">{MESES[p.mes_referencia] || p.mes_referencia}</span>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm">{p.nome_respondente || '-'}</span>
                          </TableCell>
                          <TableCell><span className="font-medium">{p.cliente || '-'}</span></TableCell>
                          <TableCell className="text-center">
                            <Badge className={p.cliente_foco ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}>
                              {p.cliente_foco ? 'SIM' : 'NÃO'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <span className="font-semibold">{p.nota ?? '-'}</span>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex justify-center gap-1">
                              <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => { setPesquisaSelecionada(p); setModalVisualizarAberto(true); }}>
                                <Eye className="h-4 w-4 text-blue-600" />
                              </Button>
                              <Button variant="outline" size="sm" className="h-8 w-8 p-0" onClick={() => handleAbrirEdicao(p)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button variant="outline" size="sm" className="h-8 w-8 p-0 text-red-600 hover:text-red-800" onClick={() => { setPesquisaSelecionada(p); setModalExcluirAberto(true); }}>
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  {/* Paginação */}
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 pt-4 border-t">
                    {/* Select de itens por página */}
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Mostrar</span>
                      <Select
                        value={itensPorPagina >= pesquisas.length ? 'todos' : itensPorPagina.toString()}
                        onValueChange={(v) => {
                          if (v === 'todos') { setItensPorPagina(pesquisas.length || 9999); }
                          else { setItensPorPagina(parseInt(v)); }
                          setPaginaAtual(1);
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
                    {totalPaginas > 1 && (
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPaginaAtual(p => p - 1)}
                          disabled={paginaAtual === 1}
                          aria-label="Página anterior"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="text-sm px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded">
                          Página {paginaAtual} de {totalPaginas}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPaginaAtual(p => p + 1)}
                          disabled={paginaAtual >= totalPaginas}
                          aria-label="Próxima página"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    )}

                    {/* Contador de registros */}
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {((paginaAtual - 1) * itensPorPagina) + 1}-{Math.min(paginaAtual * itensPorPagina, pesquisas.length)} de {pesquisas.length} pesquisas
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

      {/* Modal Importação */}
      <Dialog open={modalImportAberto} onOpenChange={(open) => { setModalImportAberto(open); if (!open) { setDadosImportacao([]); setErrosImportacao([]); } }}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-sonda-blue">Importar Pesquisa Mensal AMS</DialogTitle>
            <DialogDescription>Faça upload de um arquivo Excel com os dados das pesquisas</DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <Upload className="h-10 w-10 text-gray-400 mx-auto mb-3" />
              <p className="text-sm text-gray-600 mb-4">Arraste o arquivo Excel ou clique para selecionar</p>
              <label className="cursor-pointer">
                <Button variant="outline" asChild>
                  <span><FileSpreadsheet className="h-4 w-4 mr-2" />Selecionar Arquivo Excel</span>
                </Button>
                <input type="file" accept=".xlsx,.xls" onChange={handleFileUpload} className="hidden" />
              </label>
            </div>

            {errosImportacao.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h4 className="font-medium text-red-900 mb-2">Erros encontrados ({errosImportacao.length}):</h4>
                <ul className="text-sm text-red-800 space-y-1 max-h-32 overflow-y-auto">
                  {errosImportacao.map((e, i) => <li key={i}>• {e}</li>)}
                </ul>
              </div>
            )}

            {dadosImportacao.length > 0 && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h4 className="font-medium text-green-900 mb-2">
                  {dadosImportacao.length} registros prontos para importação
                </h4>
                <p className="text-sm text-green-800">
                  Os dados serão importados para o período {MESES[mesAtual]} {anoAtual}.
                </p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setModalImportAberto(false)}>Cancelar</Button>
            <Button
              className="bg-sonda-blue hover:bg-sonda-dark-blue"
              disabled={dadosImportacao.length === 0 || importarMutation.isPending}
              onClick={handleConfirmarImportacao}
            >
              {importarMutation.isPending ? 'Importando...' : `Importar ${dadosImportacao.length} registros`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Visualizar */}
      <Dialog open={modalVisualizarAberto} onOpenChange={setModalVisualizarAberto}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-sonda-blue">Detalhes da Pesquisa</DialogTitle>
          </DialogHeader>
          {pesquisaSelecionada && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div><span className="text-gray-500">Identificador:</span><p className="font-medium">{pesquisaSelecionada.identificador_questionario}</p></div>
                <div><span className="text-gray-500">Questionário:</span><p className="font-medium">{pesquisaSelecionada.nome_questionario}</p></div>
                <div><span className="text-gray-500">Mês Referência:</span><p className="font-medium">{MESES[pesquisaSelecionada.mes_referencia]} {pesquisaSelecionada.ano_referencia}</p></div>
                <div><span className="text-gray-500">Início Real:</span><p className="font-medium">{formatarDataExibicao(pesquisaSelecionada.inicio_real_questionario)}</p></div>
                <div><span className="text-gray-500">Respondente:</span><p className="font-medium">{pesquisaSelecionada.nome_respondente || '-'}</p></div>
                <div><span className="text-gray-500">E-mail:</span><p className="font-medium">{pesquisaSelecionada.email_respondente || '-'}</p></div>
                <div><span className="text-gray-500">Cliente:</span><p className="font-medium">{pesquisaSelecionada.cliente || '-'}</p></div>
                <div><span className="text-gray-500">Cliente FOCO:</span><p className="font-medium">{pesquisaSelecionada.cliente_foco ? 'SIM' : 'NÃO'}</p></div>
                <div><span className="text-gray-500">Vertical:</span><p className="font-medium">{pesquisaSelecionada.vertical || '-'}</p></div>
                <div><span className="text-gray-500">Unidade de Negócio:</span><p className="font-medium">{pesquisaSelecionada.unidade_negocio || '-'}</p></div>
                <div><span className="text-gray-500">Nota:</span><p className="font-medium text-lg">{pesquisaSelecionada.nota ?? '-'}</p></div>
                <div><span className="text-gray-500">Situação:</span><p className="font-medium">{pesquisaSelecionada.situacao_resposta || '-'}</p></div>
                <div><span className="text-gray-500">Início Resposta:</span><p className="font-medium">{formatarDataExibicao(pesquisaSelecionada.inicio_resposta)}</p></div>
                <div><span className="text-gray-500">Término Resposta:</span><p className="font-medium">{formatarDataExibicao(pesquisaSelecionada.termino_resposta)}</p></div>
                <div><span className="text-gray-500">Incompleto:</span><p className="font-medium">{pesquisaSelecionada.incompleto ? 'SIM' : 'NÃO'}</p></div>
              </div>
              {pesquisaSelecionada.comentario && (
                <div>
                  <span className="text-gray-500 text-sm">Comentário:</span>
                  <p className="mt-1 text-sm bg-gray-50 p-3 rounded-lg">{pesquisaSelecionada.comentario}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalVisualizarAberto(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Editar */}
      <Dialog open={modalEditarAberto} onOpenChange={setModalEditarAberto}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-sonda-blue">Editar Pesquisa</DialogTitle>
            <DialogDescription>Altere os dados da pesquisa AMS</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Identificador <span className="text-red-500">*</span></Label>
                <Input value={dadosEdicao.identificador_questionario || ''} onChange={(e) => setDadosEdicao(d => ({ ...d, identificador_questionario: e.target.value }))} className="focus:ring-sonda-blue focus:border-sonda-blue" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Nome Questionário <span className="text-red-500">*</span></Label>
                <Input value={dadosEdicao.nome_questionario || ''} onChange={(e) => setDadosEdicao(d => ({ ...d, nome_questionario: e.target.value }))} className="focus:ring-sonda-blue focus:border-sonda-blue" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Mês Referência <span className="text-red-500">*</span></Label>
                <Select value={String(dadosEdicao.mes_referencia || '')} onValueChange={(v) => setDadosEdicao(d => ({ ...d, mes_referencia: parseInt(v) }))}>
                  <SelectTrigger className="focus:ring-sonda-blue focus:border-sonda-blue"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(MESES).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Início Real Questionário</Label>
                <Input type="date" value={dadosEdicao.inicio_real_questionario || ''} onChange={(e) => setDadosEdicao(d => ({ ...d, inicio_real_questionario: e.target.value }))} className="focus:ring-sonda-blue focus:border-sonda-blue" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Nome Respondente</Label>
                <Input value={dadosEdicao.nome_respondente || ''} onChange={(e) => setDadosEdicao(d => ({ ...d, nome_respondente: e.target.value }))} className="focus:ring-sonda-blue focus:border-sonda-blue" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">E-mail Respondente</Label>
                <Input type="email" value={dadosEdicao.email_respondente || ''} onChange={(e) => setDadosEdicao(d => ({ ...d, email_respondente: e.target.value }))} className="focus:ring-sonda-blue focus:border-sonda-blue" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Cliente</Label>
                <Input value={dadosEdicao.cliente || ''} onChange={(e) => setDadosEdicao(d => ({ ...d, cliente: e.target.value }))} className="focus:ring-sonda-blue focus:border-sonda-blue" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Cliente FOCO</Label>
                <Select value={dadosEdicao.cliente_foco ? 'sim' : 'nao'} onValueChange={(v) => setDadosEdicao(d => ({ ...d, cliente_foco: v === 'sim' }))}>
                  <SelectTrigger className="focus:ring-sonda-blue focus:border-sonda-blue"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sim">SIM</SelectItem>
                    <SelectItem value="nao">NÃO</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Vertical</Label>
                <Input value={dadosEdicao.vertical || ''} onChange={(e) => setDadosEdicao(d => ({ ...d, vertical: e.target.value }))} className="focus:ring-sonda-blue focus:border-sonda-blue" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Unidade de Negócio</Label>
                <Input value={dadosEdicao.unidade_negocio || ''} onChange={(e) => setDadosEdicao(d => ({ ...d, unidade_negocio: e.target.value }))} className="focus:ring-sonda-blue focus:border-sonda-blue" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Nota</Label>
                <Input type="number" value={dadosEdicao.nota ?? ''} onChange={(e) => setDadosEdicao(d => ({ ...d, nota: e.target.value ? parseFloat(e.target.value) : undefined }))} className="focus:ring-sonda-blue focus:border-sonda-blue" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Situação Resposta</Label>
                <Input value={dadosEdicao.situacao_resposta || ''} onChange={(e) => setDadosEdicao(d => ({ ...d, situacao_resposta: e.target.value }))} className="focus:ring-sonda-blue focus:border-sonda-blue" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Início Resposta</Label>
                <Input type="date" value={dadosEdicao.inicio_resposta || ''} onChange={(e) => setDadosEdicao(d => ({ ...d, inicio_resposta: e.target.value }))} className="focus:ring-sonda-blue focus:border-sonda-blue" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Término Resposta</Label>
                <Input type="date" value={dadosEdicao.termino_resposta || ''} onChange={(e) => setDadosEdicao(d => ({ ...d, termino_resposta: e.target.value }))} className="focus:ring-sonda-blue focus:border-sonda-blue" />
              </div>
              <div className="space-y-2">
                <Label className="text-sm font-medium text-gray-700">Incompleto</Label>
                <Select value={dadosEdicao.incompleto ? 'sim' : 'nao'} onValueChange={(v) => setDadosEdicao(d => ({ ...d, incompleto: v === 'sim' }))}>
                  <SelectTrigger className="focus:ring-sonda-blue focus:border-sonda-blue"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sim">SIM</SelectItem>
                    <SelectItem value="nao">NÃO</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">Comentário</Label>
              <Textarea value={dadosEdicao.comentario || ''} onChange={(e) => setDadosEdicao(d => ({ ...d, comentario: e.target.value }))} rows={3} className="focus:ring-sonda-blue focus:border-sonda-blue" />
            </div>
          </div>
          <DialogFooter className="pt-6 border-t">
            <Button variant="outline" onClick={() => setModalEditarAberto(false)}>Cancelar</Button>
            <Button className="bg-sonda-blue hover:bg-sonda-dark-blue" onClick={handleSalvarEdicao} disabled={atualizarMutation.isPending}>
              {atualizarMutation.isPending ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Alert Dialog Exclusão */}
      <AlertDialog open={modalExcluirAberto} onOpenChange={setModalExcluirAberto}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-semibold text-sonda-blue">Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a pesquisa "{pesquisaSelecionada?.identificador_questionario}"? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={handleConfirmarExclusao}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </LayoutAdmin>
  );
}

export default PesquisaMensalAMS;
