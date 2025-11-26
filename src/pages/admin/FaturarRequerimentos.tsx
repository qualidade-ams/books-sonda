import { useState, useMemo } from 'react';
import {
  Send,
  Mail,
  FileText,
  Calendar,
  Clock,
  TrendingUp,
  Filter,
  RefreshCw,
  Plus,
  X,
  AlertTriangle,
  Calculator,
  ChevronLeft,
  ChevronRight,
  Check,
  CheckSquare,
  Square
} from 'lucide-react';
import AdminLayout from '@/components/admin/LayoutAdmin';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MultiSelect, Option } from '@/components/ui/multi-select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
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

import ProtectedAction from '@/components/auth/ProtectedAction';
import { FaturamentoExportButtons } from '@/components/admin/requerimentos';
import { toast } from 'sonner';

import { 
  useRequerimentosFaturamento, 
  useRejeitarRequerimento, 
  useMarcarComoFaturados,
  useRequerimentosFaturados 
} from '@/hooks/useRequerimentos';
import { faturamentoService } from '@/services/faturamentoService';
import { getBadgeClasses, getCobrancaIcon, getCobrancaColors } from '@/utils/requerimentosColors';

import {
  Requerimento,
  TipoCobrancaType,
  ModuloType,
  EmailFaturamento,
  TIPO_COBRANCA_OPTIONS,
  MODULO_OPTIONS,
  requerValorHora
} from '@/types/requerimentos';


import { formatarHorasParaExibicao, somarHoras } from '@/utils/horasUtils';

// Interface para dados agrupados por tipo de cobrança
interface RequerimentosAgrupados {
  [key: string]: {
    tipo: TipoCobrancaType;
    requerimentos: Requerimento[];
    totalHoras: string; // Mudado para string (formato HH:MM)
    totalValor: number; // Total em valor monetário
    quantidade: number;
  };
}

// Interface para estatísticas do período
interface EstatisticasPeriodo {
  totalRequerimentos: number;
  totalHoras: string; // Mudado para string (formato HH:MM)
  tiposAtivos: number;
  valorEstimado?: number;
  valorTotalFaturavel: number; // Soma dos tipos com valor monetário
}

export default function FaturarRequerimentos() {
  // Estados
  const [mesAtual] = useState(new Date().getMonth() + 1);
  const [anoAtual] = useState(new Date().getFullYear());
  const [mesSelecionado, setMesSelecionado] = useState(mesAtual);
  const [anoSelecionado, setAnoSelecionado] = useState(anoAtual);

  const [modalEmailAberto, setModalEmailAberto] = useState(false);
  const [confirmacaoAberta, setConfirmacaoAberta] = useState(false);


  const [destinatarios, setDestinatarios] = useState<string[]>([]);
  const [destinatariosCC, setDestinatariosCC] = useState<string[]>([]);
  const [assuntoEmail, setAssuntoEmail] = useState('');
  const [corpoEmail, setCorpoEmail] = useState('');
  const [enviandoEmail, setEnviandoEmail] = useState(false);

  const [filtroTipo, setFiltroTipo] = useState<TipoCobrancaType[]>([]);
  const [filtroModulo, setFiltroModulo] = useState<ModuloType[]>([]);
  const [filtrosExpandidos, setFiltrosExpandidos] = useState(false);

  // Estados para rejeição
  const [requerimentoParaRejeitar, setRequerimentoParaRejeitar] = useState<Requerimento | null>(null);
  const [confirmacaoRejeicaoAberta, setConfirmacaoRejeicaoAberta] = useState(false);

  // Estados para controle de abas e seleção
  const [abaAtiva, setAbaAtiva] = useState<'para_faturar' | 'faturados'>('para_faturar');
  const [requerimentosSelecionados, setRequerimentosSelecionados] = useState<string[]>([]);

  // Hooks
  const {
    data: dadosFaturamento,
    isLoading,
    error,
    refetch
  } = useRequerimentosFaturamento(mesSelecionado, anoSelecionado);

  const rejeitarRequerimento = useRejeitarRequerimento();
  const marcarComoFaturados = useMarcarComoFaturados();
  
  // Hook para buscar requerimentos faturados
  const {
    data: dadosFaturados,
    isLoading: isLoadingFaturados,
    error: errorFaturados
  } = useRequerimentosFaturados(`${mesSelecionado.toString().padStart(2, '0')}/${anoSelecionado}`);

  // Dados processados
  const requerimentosAgrupados = useMemo((): RequerimentosAgrupados => {
    if (!dadosFaturamento?.requerimentos) return {};

    const grupos: RequerimentosAgrupados = {};

    dadosFaturamento.requerimentos.forEach(req => {
      const tipo = req.tipo_cobranca;

      if (!grupos[tipo]) {
        grupos[tipo] = {
          tipo,
          requerimentos: [],
          totalHoras: '0:00',
          totalValor: 0,
          quantidade: 0
        };
      }

      grupos[tipo].requerimentos.push(req);
      if (req.horas_total) {
        grupos[tipo].totalHoras = somarHoras(grupos[tipo].totalHoras, req.horas_total.toString());
      }
      if (req.valor_total_geral) {
        grupos[tipo].totalValor += req.valor_total_geral;
      }
      grupos[tipo].quantidade += 1;
    });

    return grupos;
  }, [dadosFaturamento]);

  const estatisticasPeriodo = useMemo((): EstatisticasPeriodo => {
    if (!dadosFaturamento?.requerimentos) {
      return {
        totalRequerimentos: 0,
        totalHoras: '0:00',
        tiposAtivos: 0,
        valorTotalFaturavel: 0
      };
    }

    // Somar horas corretamente usando somarHoras
    let totalHorasString = '0:00';
    let valorTotalFaturavel = 0;

    // Tipos de cobrança que têm valor monetário
    const tiposComValor = ['Faturado', 'Hora Extra', 'Sobreaviso', 'Bolsão Enel'];

    dadosFaturamento.requerimentos.forEach(req => {
      if (req.horas_total) {
        totalHorasString = somarHoras(totalHorasString, req.horas_total.toString());
      }

      // Somar valores dos tipos de cobrança monetários
      if (tiposComValor.includes(req.tipo_cobranca) && req.valor_total_geral) {
        valorTotalFaturavel += req.valor_total_geral;
      }
    });

    return {
      totalRequerimentos: dadosFaturamento.requerimentos.length,
      totalHoras: totalHorasString,
      tiposAtivos: Object.keys(requerimentosAgrupados).length,
      valorTotalFaturavel
    };
  }, [dadosFaturamento, requerimentosAgrupados]);

  const gruposFiltrados = useMemo(() => {
    let grupos = Object.values(requerimentosAgrupados);

    // Filtrar por tipo de cobrança
    if (filtroTipo.length > 0) {
      grupos = grupos.filter(grupo => filtroTipo.includes(grupo.tipo));
    }

    // Filtrar por módulo
    if (filtroModulo.length > 0) {
      grupos = grupos.map(grupo => ({
        ...grupo,
        requerimentos: grupo.requerimentos.filter(req => 
          filtroModulo.includes(req.modulo)
        ),
        quantidade: grupo.requerimentos.filter(req => 
          filtroModulo.includes(req.modulo)
        ).length
      })).filter(grupo => grupo.quantidade > 0);

      // Recalcular totais para grupos filtrados por módulo
      grupos = grupos.map(grupo => {
        let totalHoras = '0:00';
        let totalValor = 0;

        grupo.requerimentos.forEach(req => {
          if (req.horas_total) {
            totalHoras = somarHoras(totalHoras, req.horas_total.toString());
          }
          if (req.valor_total_geral) {
            totalValor += req.valor_total_geral;
          }
        });

        return {
          ...grupo,
          totalHoras,
          totalValor
        };
      });
    }

    return grupos;
  }, [requerimentosAgrupados, filtroTipo, filtroModulo]);

  // Funções
  const nomesMeses = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  // Opções para o MultiSelect de tipos de cobrança
  const tipoCobrancaOptions: Option[] = TIPO_COBRANCA_OPTIONS.map(option => ({
    value: option.value,
    label: option.label
  }));

  // Opções para o MultiSelect de módulos
  const moduloOptions: Option[] = MODULO_OPTIONS.map(option => ({
    value: option.value,
    label: option.label
  }));

  const handleAbrirModalEmail = async () => {
    if (requerimentosSelecionados.length === 0) {
      toast.error('Selecione pelo menos um requerimento para faturamento');
      return;
    }

    try {
      // Filtrar apenas os requerimentos selecionados
      const requerimentosSelecionadosData = dadosFaturamento?.requerimentos.filter(req => 
        requerimentosSelecionados.includes(req.id)
      ) || [];

      if (requerimentosSelecionadosData.length === 0) {
        toast.error('Nenhum requerimento selecionado encontrado');
        return;
      }

      // Gerar relatório HTML apenas com os requerimentos selecionados
      const relatorio = await faturamentoService.gerarRelatorioFaturamentoSelecionados(
        requerimentosSelecionadosData, 
        mesSelecionado, 
        anoSelecionado
      );
      const htmlTemplate = faturamentoService.criarTemplateEmailFaturamento(relatorio);

      // Configurar dados padrão do email
      setAssuntoEmail(`Relatório de Faturamento - ${nomesMeses[mesSelecionado - 1]} ${anoSelecionado} (${requerimentosSelecionados.length} requerimento(s))`);
      setCorpoEmail(htmlTemplate);
      setDestinatarios(['']); // Inicializar com um campo vazio para o usuário preencher
      setDestinatariosCC([]); // Inicializar CC vazio
      setModalEmailAberto(true);
    } catch (error) {
      console.error('Erro ao preparar email:', error);
      toast.error('Erro ao preparar relatório de faturamento');
    }
  };

  const handleAdicionarDestinatario = () => {
    setDestinatarios([...destinatarios, '']);
  };

  const handleRemoverDestinatario = (index: number) => {
    if (destinatarios.length > 1) {
      setDestinatarios(destinatarios.filter((_, i) => i !== index));
    }
  };

  const handleAtualizarDestinatario = (index: number, valor: string) => {
    const novosDestinatarios = [...destinatarios];
    novosDestinatarios[index] = valor;
    setDestinatarios(novosDestinatarios);
  };

  const handleAdicionarDestinatarioCC = () => {
    setDestinatariosCC([...destinatariosCC, '']);
  };

  const handleRemoverDestinatarioCC = (index: number) => {
    if (destinatariosCC.length > 0) {
      setDestinatariosCC(destinatariosCC.filter((_, i) => i !== index));
    }
  };

  const handleAtualizarDestinatarioCC = (index: number, valor: string) => {
    const novosDestinatarios = [...destinatariosCC];
    novosDestinatarios[index] = valor;
    setDestinatariosCC(novosDestinatarios);
  };

  // Funções de navegação de mês
  const navegarMesAnterior = () => {
    if (mesSelecionado === 1) {
      setMesSelecionado(12);
      setAnoSelecionado(anoSelecionado - 1);
    } else {
      setMesSelecionado(mesSelecionado - 1);
    }
  };

  const navegarMesProximo = () => {
    if (mesSelecionado === 12) {
      setMesSelecionado(1);
      setAnoSelecionado(anoSelecionado + 1);
    } else {
      setMesSelecionado(mesSelecionado + 1);
    }
  };

  // Validação silenciosa para habilitar/desabilitar botões
  const isFormularioValido = (): boolean => {
    const emailsValidos = destinatarios.filter(email => email.trim() !== '');

    if (emailsValidos.length === 0) {
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const emailsInvalidos = emailsValidos.filter(email => !emailRegex.test(email));

    // Validar CC também
    const emailsCCValidos = destinatariosCC.filter(email => email.trim() !== '');
    const emailsCCInvalidos = emailsCCValidos.filter(email => !emailRegex.test(email));

    if (emailsInvalidos.length > 0 || emailsCCInvalidos.length > 0) {
      return false;
    }

    if (!assuntoEmail.trim()) {
      return false;
    }

    return true;
  };

  // Validação com mensagens de erro para ações do usuário
  const validarFormularioEmail = (): boolean => {
    const emailsValidos = destinatarios.filter(email => email.trim() !== '');

    if (emailsValidos.length === 0) {
      toast.error('É necessário informar pelo menos um destinatário');
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const emailsInvalidos = emailsValidos.filter(email => !emailRegex.test(email));

    // Validar CC também
    const emailsCCValidos = destinatariosCC.filter(email => email.trim() !== '');
    const emailsCCInvalidos = emailsCCValidos.filter(email => !emailRegex.test(email));

    if (emailsInvalidos.length > 0 || emailsCCInvalidos.length > 0) {
      const todosInvalidos = [...emailsInvalidos, ...emailsCCInvalidos];
      toast.error(`E-mails inválidos: ${todosInvalidos.join(', ')}`);
      return false;
    }

    if (!assuntoEmail.trim()) {
      toast.error('É necessário informar o assunto do email');
      return false;
    }

    return true;
  };

  const handleDispararFaturamento = async () => {
    if (!validarFormularioEmail()) return;

    setEnviandoEmail(true);

    try {
      const emailsValidos = destinatarios.filter(email => email.trim() !== '');
      const emailsCCValidos = destinatariosCC.filter(email => email.trim() !== '');

      // Filtrar apenas os requerimentos selecionados
      const requerimentosSelecionadosData = dadosFaturamento?.requerimentos.filter(req => 
        requerimentosSelecionados.includes(req.id)
      ) || [];

      // Gerar relatório HTML apenas com os requerimentos selecionados
      const relatorio = await faturamentoService.gerarRelatorioFaturamentoSelecionados(
        requerimentosSelecionadosData, 
        mesSelecionado, 
        anoSelecionado
      );
      const htmlTemplate = faturamentoService.criarTemplateEmailFaturamento(relatorio);

      const emailFaturamento: EmailFaturamento = {
        destinatarios: emailsValidos,
        destinatariosCC: emailsCCValidos,
        assunto: assuntoEmail,
        corpo: htmlTemplate
      };

      // 1. Disparar o email
      const resultado = await faturamentoService.dispararFaturamento(emailFaturamento);

      if (resultado.success) {
        // 2. Marcar os requerimentos selecionados como faturados
        await marcarComoFaturados.mutateAsync(requerimentosSelecionados);
        
        toast.success(`Faturamento disparado e ${requerimentosSelecionados.length} requerimento(s) marcado(s) como faturado(s)!`);
        
        // Limpar estados
        setModalEmailAberto(false);
        setConfirmacaoAberta(false);
        setRequerimentosSelecionados([]);
        setDestinatarios(['']);
        setDestinatariosCC([]);
        setAssuntoEmail('');
      } else {
        toast.error(resultado.error || 'Erro ao disparar faturamento');
      }
    } catch (error) {
      console.error('Erro ao disparar faturamento:', error);
      toast.error('Erro inesperado ao disparar faturamento');
    } finally {
      setEnviandoEmail(false);
    }
  };



  const formatarData = (data: string): string => {
    try {
      // Se a data está no formato YYYY-MM-DD, trata como data local
      if (data.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const [year, month, day] = data.split('-');
        const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        return date.toLocaleDateString('pt-BR');
      }
      // Para outros formatos, usa o comportamento padrão
      return new Date(data).toLocaleDateString('pt-BR');
    } catch {
      return data;
    }
  };

  const formatarHoras = (horas: string | number): string => {
    // Se for string (formato HH:MM), usar formatarHorasParaExibicao
    if (typeof horas === 'string') {
      return formatarHorasParaExibicao(horas, 'completo');
    }

    // Se for number (decimal), converter para HH:MM primeiro
    if (typeof horas === 'number') {
      const totalMinutos = Math.round(horas * 60);
      const horasInt = Math.floor(totalMinutos / 60);
      const minutosInt = totalMinutos % 60;
      const horasFormatadas = `${horasInt}:${minutosInt.toString().padStart(2, '0')}`;
      return formatarHorasParaExibicao(horasFormatadas, 'completo');
    }

    return '0:00';
  };

  const handleAbrirConfirmacaoRejeicao = (requerimento: Requerimento) => {
    setRequerimentoParaRejeitar(requerimento);
    setConfirmacaoRejeicaoAberta(true);
  };

  const handleConfirmarRejeicao = async () => {
    if (!requerimentoParaRejeitar) return;

    try {
      await rejeitarRequerimento.mutateAsync(requerimentoParaRejeitar.id);
      setConfirmacaoRejeicaoAberta(false);
      setRequerimentoParaRejeitar(null);
      refetch(); // Atualizar a lista
    } catch (error) {
      console.error('Erro ao rejeitar requerimento:', error);
    }
  };

  // Funções de controle de seleção
  const handleSelecionarRequerimento = (id: string, selecionado: boolean) => {
    if (selecionado) {
      setRequerimentosSelecionados(prev => [...prev, id]);
    } else {
      setRequerimentosSelecionados(prev => prev.filter(reqId => reqId !== id));
    }
  };

  const handleSelecionarTodos = (requerimentos: Requerimento[], selecionado: boolean) => {
    if (selecionado) {
      const novosIds = requerimentos.map(req => req.id);
      setRequerimentosSelecionados(prev => [...new Set([...prev, ...novosIds])]);
    } else {
      const idsParaRemover = requerimentos.map(req => req.id);
      setRequerimentosSelecionados(prev => prev.filter(id => !idsParaRemover.includes(id)));
    }
  };

  const handleMarcarComoFaturados = async () => {
    if (requerimentosSelecionados.length === 0) return;

    try {
      await marcarComoFaturados.mutateAsync(requerimentosSelecionados);
      setRequerimentosSelecionados([]);
    } catch (error) {
      console.error('Erro ao marcar como faturados:', error);
    }
  };

  // Limpar seleção ao trocar de aba
  const handleTrocarAba = (aba: 'para_faturar' | 'faturados') => {
    setAbaAtiva(aba);
    setRequerimentosSelecionados([]);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Cabeçalho */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Enviar Requerimentos
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Visualize e processe requerimentos enviados para faturamento
            </p>
          </div>

          <div className="flex gap-2">
            <FaturamentoExportButtons
              requerimentosAgrupados={requerimentosAgrupados}
              estatisticas={estatisticasPeriodo}
              mesNome={nomesMeses[mesSelecionado - 1]}
              ano={anoSelecionado}
              disabled={isLoading}
            />
            <ProtectedAction screenKey="faturar_requerimentos" requiredLevel="edit">
              <Button
                onClick={handleAbrirModalEmail}
                disabled={isLoading || requerimentosSelecionados.length === 0}
                title={requerimentosSelecionados.length === 0 ? 'Selecione requerimentos para disparar faturamento' : `Disparar faturamento de ${requerimentosSelecionados.length} requerimento(s) selecionado(s)`}
              >
                <Send className="h-4 w-4 mr-2" />
                Disparar Faturamento ({requerimentosSelecionados.length})
              </Button>
            </ProtectedAction>
          </div>
        </div>



        {/* Navegação de Período e Filtros */}
        <Card>
          <CardContent className="py-3 xl:py-4">
            <div className="flex items-center justify-between gap-2 xl:gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={navegarMesAnterior}
                className="flex items-center gap-1 xl:gap-2 px-2 xl:px-3 text-xs xl:text-sm"
              >
                <ChevronLeft className="h-3.5 w-3.5 xl:h-4 xl:w-4" />
                <span className="hidden sm:inline">Anterior</span>
              </Button>

              <div className="text-center flex-1 min-w-0">
                <div className="text-base xl:text-lg font-semibold text-gray-900 dark:text-white truncate">
                  {nomesMeses[mesSelecionado - 1]} {anoSelecionado}
                </div>
              </div>

              <div className="flex items-center gap-2 xl:gap-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={navegarMesProximo}
                  className="flex items-center gap-1 xl:gap-2 px-2 xl:px-3 text-xs xl:text-sm"
                >
                  <span className="hidden sm:inline">Próximo</span>
                  <ChevronRight className="h-3.5 w-3.5 xl:h-4 xl:w-4" />
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setFiltrosExpandidos(!filtrosExpandidos)}
                  className="flex items-center gap-1 xl:gap-2 px-2 xl:px-3 text-xs xl:text-sm"
                  aria-expanded={filtrosExpandidos}
                  aria-controls="filters-section"
                >
                  <Filter className="h-3.5 w-3.5 xl:h-4 xl:w-4" />
                  <span className="hidden sm:inline">Filtros</span>
                  {(filtroTipo.length > 0 || filtroModulo.length > 0) && (
                    <Badge variant="secondary" className="ml-0.5 xl:ml-1 text-[10px] xl:text-xs px-1 xl:px-1.5">
                      {filtroTipo.length + filtroModulo.length}
                    </Badge>
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>



        {/* Estatísticas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 truncate">
                    Total de Requerimentos
                  </p>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                    {estatisticasPeriodo.totalRequerimentos}
                  </p>
                </div>
                <FileText className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600 flex-shrink-0" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 truncate">
                    Total de Horas
                  </p>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                    {formatarHorasParaExibicao(estatisticasPeriodo.totalHoras, 'completo')}
                  </p>
                </div>
                <Clock className="h-6 w-6 sm:h-8 sm:w-8 text-green-600 flex-shrink-0" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 truncate">
                    Tipos Ativos
                  </p>
                  <p className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                    {estatisticasPeriodo.tiposAtivos}
                  </p>
                </div>
                <TrendingUp className="h-6 w-6 sm:h-8 sm:w-8 text-purple-600 flex-shrink-0" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 truncate">
                    Período
                  </p>
                  <p className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
                    {nomesMeses[mesSelecionado - 1]} {anoSelecionado}
                  </p>
                </div>
                <Calendar className="h-6 w-6 sm:h-8 sm:w-8 text-orange-600 flex-shrink-0" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 truncate">
                    Valor Total Faturável
                  </p>
                  <p className="text-lg sm:text-2xl font-bold text-green-600">
                    R$ {estatisticasPeriodo.valorTotalFaturavel.toLocaleString('pt-BR', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })}
                  </p>
                  <p className="text-[10px] sm:text-xs text-gray-500 mt-1 truncate">
                    Faturado + Hora Extra + Sobreaviso + Bolsão Enel
                  </p>
                </div>
                <Calculator className="h-6 w-6 sm:h-8 sm:w-8 text-green-600 flex-shrink-0" />
              </div>
            </CardContent>
          </Card>
        </div>



        {/* Filtros */}
        {filtrosExpandidos && (
          <Card id="filters-section">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filtros de Período, Tipo e Módulo
                <div className="flex gap-2">
                  {filtroTipo.length > 0 && (
                    <Badge variant="secondary">
                      {filtroTipo.length} tipo{filtroTipo.length !== 1 ? 's' : ''}
                    </Badge>
                  )}
                  {filtroModulo.length > 0 && (
                    <Badge variant="secondary">
                      {filtroModulo.length} módulo{filtroModulo.length !== 1 ? 's' : ''}
                    </Badge>
                  )}
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="mes" className="text-sm font-medium">Mês</Label>
                  <Select value={mesSelecionado.toString()} onValueChange={(value) => setMesSelecionado(parseInt(value))}>
                    <SelectTrigger className="h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {nomesMeses.map((nome, index) => (
                        <SelectItem key={index + 1} value={(index + 1).toString()}>
                          {nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="ano" className="text-sm font-medium">Ano</Label>
                  <Select value={anoSelecionado.toString()} onValueChange={(value) => setAnoSelecionado(parseInt(value))}>
                    <SelectTrigger className="h-10">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 5 }, (_, i) => anoAtual - 2 + i).map(ano => (
                        <SelectItem key={ano} value={ano.toString()}>
                          {ano}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tipo" className="text-sm font-medium">Tipos de Cobrança</Label>
                  <div className="h-10">
                    <MultiSelect
                      options={tipoCobrancaOptions}
                      selected={filtroTipo}
                      onChange={(values) => setFiltroTipo(values as TipoCobrancaType[])}
                      placeholder="Selecione os tipos..."
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="modulo" className="text-sm font-medium">Módulos</Label>
                  <div className="h-10">
                    <MultiSelect
                      options={moduloOptions}
                      selected={filtroModulo}
                      onChange={(values) => setFiltroModulo(values as ModuloType[])}
                      placeholder="Selecione os módulos..."
                    />
                  </div>
                </div>
              </div>

              {/* Botões de ação rápida */}
              <div className="flex items-center gap-2 mt-4 pt-4 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setFiltroTipo([]);
                    setFiltroModulo([]);
                  }}
                  disabled={filtroTipo.length === 0 && filtroModulo.length === 0}
                >
                  Limpar Filtros
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setFiltroTipo(tipoCobrancaOptions.map(opt => opt.value as TipoCobrancaType))}
                  disabled={filtroTipo.length === tipoCobrancaOptions.length}
                >
                  Todos os Tipos
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setFiltroModulo(moduloOptions.map(opt => opt.value as ModuloType))}
                  disabled={filtroModulo.length === moduloOptions.length}
                >
                  Todos os Módulos
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Conteúdo Principal */}
        {isLoading ? (
          <Card>
            <CardContent className="p-8">
              <div className="flex items-center justify-center">
                <RefreshCw className="h-6 w-6 animate-spin mr-2" />
                <span>Carregando requerimentos...</span>
              </div>
            </CardContent>
          </Card>
        ) : error ? (
          <Card>
            <CardContent className="p-8">
              <div className="text-center text-red-600">
                <p>Erro ao carregar requerimentos: {error.message}</p>
                <Button onClick={() => refetch()} className="mt-4">
                  Tentar novamente
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Tabs value={abaAtiva} onValueChange={(value) => handleTrocarAba(value as 'para_faturar' | 'faturados')} className="w-full space-y-4">
            <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
              <TabsList className="w-full sm:w-auto">
                <TabsTrigger value="para_faturar" className="flex-1 sm:flex-none text-xs sm:text-sm">
                  Enviar para Faturamento ({dadosFaturamento?.requerimentos?.length || 0})
                </TabsTrigger>
                <TabsTrigger value="faturados" className="flex-1 sm:flex-none text-xs sm:text-sm">
                  Históricos de Enviados ({dadosFaturados?.length || 0})
                </TabsTrigger>
              </TabsList>

              {/* Ações Principais - apenas para aba para_faturar */}
              {abaAtiva === 'para_faturar' && requerimentosSelecionados.length > 0 && (
                <div className="flex flex-wrap gap-4 items-center">
                  <Badge variant="outline" className="text-xs sm:text-sm">
                    {requerimentosSelecionados.length} selecionado{requerimentosSelecionados.length !== 1 ? 's' : ''}
                  </Badge>
                </div>
              )}
            </div>

            <TabsContent value="para_faturar" className="space-y-6">
              {gruposFiltrados.length === 0 ? (
                <Card>
                  <CardContent className="p-8">
                    <div className="text-center text-gray-500">
                      <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <h3 className="text-lg font-medium mb-2">
                        Nenhum requerimento encontrado
                      </h3>
                      <p>
                        Não há requerimentos enviados para faturamento no período de{' '}
                        <strong>{nomesMeses[mesSelecionado - 1]} {anoSelecionado}</strong>.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                gruposFiltrados.map(grupo => {
              const colors = getCobrancaColors(grupo.tipo);
              const icon = getCobrancaIcon(grupo.tipo);

              return (
                <Card key={grupo.tipo} className={`${colors.border} border-l-4`}>
                  <CardHeader className={`${colors.bg} ${colors.text}`}>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-xl flex items-center gap-2">
                        <span className="text-2xl">{icon}</span>
                        {grupo.tipo}
                      </CardTitle>
                      <div className="flex items-center gap-2 text-sm flex-wrap">
                        <Badge variant="secondary" className="bg-white/90 text-gray-800 border border-white/50 font-medium">
                          {grupo.quantidade} requerimento{grupo.quantidade !== 1 ? 's' : ''}
                        </Badge>
                        <Badge variant="secondary" className="bg-white/90 text-gray-800 border border-white/50 font-medium">
                          {formatarHorasParaExibicao(grupo.totalHoras, 'completo')}
                        </Badge>
                        {requerValorHora(grupo.tipo) && grupo.totalValor > 0 && (
                          <Badge variant="secondary" className="bg-green-100 text-green-800 border border-green-200 font-medium">
                            R$ {grupo.totalValor.toLocaleString('pt-BR', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2
                            })}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-10 text-sm py-2 px-3">
                              <Checkbox
                                checked={grupo.requerimentos.length > 0 && grupo.requerimentos.every(req => requerimentosSelecionados.includes(req.id))}
                                onCheckedChange={(checked) => handleSelecionarTodos(grupo.requerimentos, checked as boolean)}
                                aria-label="Selecionar todos os requerimentos deste grupo"
                              />
                            </TableHead>
                            <TableHead className="text-center text-sm xl:text-base py-2 px-3">Chamado</TableHead>
                            <TableHead className="text-center text-sm xl:text-base py-2 px-3">Cliente</TableHead>
                            <TableHead className="text-center text-sm xl:text-base py-2 px-3">Módulo</TableHead>
                            <TableHead className="text-center text-sm xl:text-base py-2 px-3">Horas</TableHead>
                            <TableHead className="text-center text-sm xl:text-base py-2 px-3">Datas</TableHead>
                            <TableHead className="text-center text-sm xl:text-base py-2 px-3">Período</TableHead>
                            <TableHead className="text-center text-sm xl:text-base py-2 px-3">Valor Total</TableHead>
                            <TableHead className="text-center text-sm xl:text-base py-2 px-3">Autor</TableHead>
                            <TableHead className="text-center text-sm xl:text-base py-2 px-3">Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {grupo.requerimentos.map(req => {
                            return (
                              <TableRow key={req.id}>
                                <TableCell className="py-3 px-3">
                                  <Checkbox
                                    checked={requerimentosSelecionados.includes(req.id)}
                                    onCheckedChange={(checked) => handleSelecionarRequerimento(req.id, checked as boolean)}
                                    aria-label={`Selecionar requerimento ${req.chamado}`}
                                  />
                                </TableCell>
                                
                                {/* Coluna Chamado */}
                                <TableCell className="text-center py-3 px-3">
                                  <div className="flex items-center justify-center gap-2 min-w-[120px]">
                                    <span className="text-lg flex-shrink-0">{getCobrancaIcon(req.tipo_cobranca)}</span>
                                    <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-sm font-medium truncate" title={req.chamado}>
                                      {req.chamado}
                                    </code>
                                  </div>
                                </TableCell>

                                {/* Coluna Cliente */}
                                <TableCell className="py-3 px-3">
                                  <span className="text-center text-sm font-medium truncate block min-w-[120px]" title={req.cliente_nome}>
                                    {req.cliente_nome || 'N/A'}
                                  </span>
                                </TableCell>

                                {/* Coluna Módulo */}
                                <TableCell className="text-center py-3 px-3">
                                  <Badge variant="outline" className="text-xs text-blue-600 border-blue-600 px-2 py-0.5 whitespace-nowrap">
                                    {req.modulo}
                                  </Badge>
                                </TableCell>

                                {/* Coluna Horas */}
                                <TableCell className="text-center py-3 px-3">
                                  <div className="flex flex-col items-center gap-1 min-w-[80px]">
                                    <span 
                                      className="text-base font-bold text-gray-900 dark:text-white whitespace-nowrap cursor-help" 
                                      title="Total de Horas"
                                    >
                                      {formatarHoras(req.horas_total)}
                                    </span>
                                    <div className="text-xs text-gray-500 flex items-center gap-1">
                                      <span 
                                        className="text-blue-600 cursor-help" 
                                        title="Horas Funcionais"
                                      >
                                        {formatarHoras(req.horas_funcional)}
                                      </span>
                                      <span>/</span>
                                      <span 
                                        className="text-green-600 cursor-help" 
                                        title="Horas Técnicas"
                                      >
                                        {formatarHoras(req.horas_tecnico)}
                                      </span>
                                    </div>
                                    {req.quantidade_tickets && req.quantidade_tickets > 0 && (
                                      <Badge 
                                        variant="secondary" 
                                        className="text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 whitespace-nowrap cursor-help"
                                        title={`${req.quantidade_tickets} ticket${req.quantidade_tickets !== 1 ? 's' : ''}`}
                                      >
                                        🎫 {req.quantidade_tickets}
                                      </Badge>
                                    )}
                                  </div>
                                </TableCell>

                                {/* Coluna Datas */}
                                <TableCell className="text-center py-3 px-3">
                                  <div className="flex flex-col gap-1 text-xs text-gray-500 min-w-[100px]">
                                    <div className="flex items-center justify-center gap-1">
                                      <span className="text-[10px] text-gray-400">Envio:</span>
                                      <span>{formatarData(req.data_envio)}</span>
                                    </div>
                                    {req.data_aprovacao && (
                                      <div className="flex items-center justify-center gap-1">
                                        <span className="text-[10px] text-gray-400">Aprov:</span>
                                        <span>{formatarData(req.data_aprovacao)}</span>
                                      </div>
                                    )}
                                  </div>
                                </TableCell>

                                {/* Coluna Período */}
                                <TableCell className="text-center py-3 px-3">
                                  <span className="text-sm text-gray-700 dark:text-gray-300 font-medium whitespace-nowrap">
                                    {req.mes_cobranca || '-'}
                                  </span>
                                </TableCell>

                                {/* Coluna Valor Total */}
                                <TableCell className="text-center py-3 px-3">
                                  {req.valor_total_geral ? (
                                    <span className="text-sm font-semibold text-green-600 whitespace-nowrap">
                                      R$ {req.valor_total_geral.toLocaleString('pt-BR', {
                                        minimumFractionDigits: 2,
                                        maximumFractionDigits: 2
                                      })}
                                    </span>
                                  ) : (
                                    <span className="text-sm text-gray-400">-</span>
                                  )}
                                </TableCell>

                                {/* Coluna Autor */}
                                <TableCell className="text-center text-sm text-gray-500 py-3 px-3">
                                  <span className="truncate block max-w-[120px] mx-auto" title={req.autor_nome}>
                                    {req.autor_nome || '-'}
                                  </span>
                                </TableCell>

                                {/* Coluna Ações */}
                                <TableCell className="text-center py-3 px-3">
                                  <ProtectedAction screenKey="faturar_requerimentos" requiredLevel="edit">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleAbrirConfirmacaoRejeicao(req)}
                                      disabled={rejeitarRequerimento.isPending}
                                      className="h-8 px-3 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 text-xs whitespace-nowrap"
                                      title="Rejeitar requerimento"
                                    >
                                      <X className="h-4 w-4 mr-1" />
                                      Rejeitar
                                    </Button>
                                  </ProtectedAction>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              );
            })
              )}
            </TabsContent>

            <TabsContent value="faturados" className="space-y-6">
              {isLoadingFaturados ? (
                <Card>
                  <CardContent className="p-8">
                    <div className="text-center">
                      <RefreshCw className="h-8 w-8 mx-auto mb-4 animate-spin text-blue-500" />
                      <p>Carregando requerimentos faturados...</p>
                    </div>
                  </CardContent>
                </Card>
              ) : errorFaturados ? (
                <Card>
                  <CardContent className="p-8">
                    <div className="text-center text-red-500">
                      <AlertTriangle className="h-8 w-8 mx-auto mb-4" />
                      <p>Erro ao carregar requerimentos faturados</p>
                      <Button onClick={() => window.location.reload()} className="mt-4">
                        Tentar novamente
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : !dadosFaturados || dadosFaturados.length === 0 ? (
                <Card>
                  <CardContent className="p-8">
                    <div className="text-center text-gray-500">
                      <Check className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <h3 className="text-lg font-medium mb-2">
                        Nenhum requerimento faturado
                      </h3>
                      <p>
                        Não há requerimentos faturados no período de{' '}
                        <strong>{nomesMeses[mesSelecionado - 1]} {anoSelecionado}</strong>.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-xl flex items-center gap-2">
                        <Check className="h-5 w-5 text-green-600" />
                        Requerimentos Enviados
                      </CardTitle>
                      <Badge variant="secondary" className="bg-green-100 text-green-800">
                        {dadosFaturados.length} faturado{dadosFaturados.length !== 1 ? 's' : ''}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-10 text-sm py-2 px-3">
                              <Checkbox
                                checked={dadosFaturados.length > 0 && dadosFaturados.every(req => requerimentosSelecionados.includes(req.id))}
                                onCheckedChange={(checked) => handleSelecionarTodos(dadosFaturados, checked as boolean)}
                                aria-label="Selecionar todos os requerimentos faturados"
                              />
                            </TableHead>
                            <TableHead className="text-sm xl:text-base py-2 px-3 text-center">Chamado</TableHead>
                            <TableHead className="text-sm xl:text-base py-2 px-3 text-center">Cliente</TableHead>
                            <TableHead className="text-sm xl:text-base py-2 px-3 text-center">Módulo</TableHead>
                            <TableHead className="text-sm xl:text-base py-2 px-3 text-center">Horas</TableHead>
                            <TableHead className="text-sm xl:text-base py-2 px-3 text-center">Data Faturamento</TableHead>
                            <TableHead className="text-sm xl:text-base py-2 px-3 text-center">Período</TableHead>
                            <TableHead className="text-sm xl:text-base py-2 px-3 text-center">Valor Total</TableHead>
                            <TableHead className="text-sm xl:text-base py-2 px-3 text-center">Autor</TableHead>
                            <TableHead className="text-sm xl:text-base py-2 px-3 text-center">Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {dadosFaturados.map(req => (
                            <TableRow key={req.id}>
                              <TableCell className="py-3 px-3">
                                <Checkbox
                                  checked={requerimentosSelecionados.includes(req.id)}
                                  onCheckedChange={(checked) => handleSelecionarRequerimento(req.id, checked as boolean)}
                                  aria-label={`Selecionar requerimento ${req.chamado}`}
                                />
                              </TableCell>
                              
                              {/* Coluna Chamado */}
                              <TableCell className="text-center py-3 px-3">
                                <div className="flex items-center justify-center gap-2 min-w-[120px]">
                                  <span className="text-lg flex-shrink-0">{getCobrancaIcon(req.tipo_cobranca)}</span>
                                  <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-sm font-medium truncate" title={req.chamado}>
                                    {req.chamado}
                                  </code>
                                </div>
                              </TableCell>

                              {/* Coluna Cliente */}
                              <TableCell className="py-3 px-3">
                                <span className="text-sm font-medium truncate block min-w-[120px]" title={req.cliente_nome}>
                                  {req.cliente_nome || 'N/A'}
                                </span>
                              </TableCell>

                              {/* Coluna Módulo */}
                              <TableCell className="text-center py-3 px-3">
                                <Badge variant="outline" className="text-xs text-blue-600 border-blue-600 px-2 py-0.5 whitespace-nowrap">
                                  {req.modulo}
                                </Badge>
                              </TableCell>

                              {/* Coluna Horas */}
                              <TableCell className="text-center py-3 px-3">
                                <div className="flex flex-col items-center gap-1 min-w-[80px]">
                                  <span 
                                    className="text-base font-bold text-gray-900 dark:text-white whitespace-nowrap cursor-help" 
                                    title="Total de Horas"
                                  >
                                    {formatarHoras(req.horas_total || somarHoras(req.horas_funcional?.toString() || '0', req.horas_tecnico?.toString() || '0'))}
                                  </span>
                                  <div className="text-xs text-gray-500 flex items-center gap-1">
                                    <span 
                                      className="text-blue-600 cursor-help" 
                                      title="Horas Funcionais"
                                    >
                                      {formatarHoras(req.horas_funcional)}
                                    </span>
                                    <span>/</span>
                                    <span 
                                      className="text-green-600 cursor-help" 
                                      title="Horas Técnicas"
                                    >
                                      {formatarHoras(req.horas_tecnico)}
                                    </span>
                                  </div>
                                  {req.quantidade_tickets && req.quantidade_tickets > 0 && (
                                    <Badge 
                                      variant="secondary" 
                                      className="text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 whitespace-nowrap cursor-help"
                                      title={`${req.quantidade_tickets} ticket${req.quantidade_tickets !== 1 ? 's' : ''}`}
                                    >
                                      🎫 {req.quantidade_tickets}
                                    </Badge>
                                  )}
                                </div>
                              </TableCell>

                              {/* Coluna Data Faturamento */}
                              <TableCell className="text-center text-sm text-gray-500 py-3 px-3 whitespace-nowrap">
                                {req.data_faturamento ? new Date(req.data_faturamento).toLocaleDateString('pt-BR') : '-'}
                              </TableCell>

                              {/* Coluna Período */}
                              <TableCell className="text-center py-3 px-3">
                                <span className="text-sm text-gray-700 dark:text-gray-300 font-medium whitespace-nowrap">
                                  {req.mes_cobranca || '-'}
                                </span>
                              </TableCell>

                              {/* Coluna Valor Total */}
                              <TableCell className="text-center text-sm py-3 px-3">
                                {req.valor_total_geral ? (
                                  <span className="font-semibold text-green-600 whitespace-nowrap">
                                    R$ {req.valor_total_geral.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </span>
                                ) : '-'}
                              </TableCell>

                              {/* Coluna Autor */}
                              <TableCell className="text-center text-sm text-gray-500 py-3 px-3">
                                <span className="truncate block max-w-[120px] mx-auto" title={req.autor_nome}>
                                  {req.autor_nome || '-'}
                                </span>
                              </TableCell>

                              {/* Coluna Ações */}
                              <TableCell className="text-center py-3 px-3">
                                <ProtectedAction screenKey="faturar_requerimentos" requiredLevel="edit">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleAbrirConfirmacaoRejeicao(req)}
                                    disabled={rejeitarRequerimento.isPending}
                                    className="h-8 px-3 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 text-xs whitespace-nowrap"
                                    title="Rejeitar requerimento"
                                  >
                                    <X className="h-4 w-4 mr-1" />
                                    Rejeitar
                                  </Button>
                                </ProtectedAction>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        )}

        {/* Modal de Email */}
        <Dialog open={modalEmailAberto} onOpenChange={setModalEmailAberto}>
          <DialogContent className="max-w-7xl max-h-[95vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Disparar Faturamento por Email
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-6">
              {/* Destinatários */}
              <div>
                <Label className="text-base font-medium">Destinatários</Label>
                <div className="space-y-2 mt-2">
                  {destinatarios.map((email, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <Input
                        type="email"
                        placeholder="email@exemplo.com"
                        value={email}
                        onChange={(e) => handleAtualizarDestinatario(index, e.target.value)}
                        className="flex-1"
                      />
                      {destinatarios.length > 1 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleRemoverDestinatario(index)}
                        >
                          Remover
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAdicionarDestinatario}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Destinatário
                  </Button>
                </div>
              </div>

              {/* Campo CC */}
              <div>
                <Label className="text-base font-medium">Destinatários em Cópia (CC)</Label>
                <div className="space-y-2 mt-2">
                  {destinatariosCC.length === 0 ? (
                    <p className="text-sm text-gray-500">Nenhum destinatário em cópia adicionado</p>
                  ) : (
                    destinatariosCC.map((email, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <Input
                          type="email"
                          placeholder="email@exemplo.com"
                          value={email}
                          onChange={(e) => handleAtualizarDestinatarioCC(index, e.target.value)}
                          className="flex-1"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleRemoverDestinatarioCC(index)}
                        >
                          Remover
                        </Button>
                      </div>
                    ))
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAdicionarDestinatarioCC}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar CC
                  </Button>
                </div>
              </div>

              {/* Assunto */}
              <div>
                <Label htmlFor="assunto" className="text-base font-medium">
                  Assunto
                </Label>
                <Input
                  id="assunto"
                  value={assuntoEmail}
                  onChange={(e) => setAssuntoEmail(e.target.value)}
                  placeholder="Assunto do email"
                  className="mt-2"
                />
              </div>

              {/* Preview do Relatório */}
              <div>
                <Label className="text-base font-medium">Preview do Relatório</Label>
                {/* Preview do Relatório */}
                <div className="mt-2">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                    Preview do Relatório
                  </h4>
                  <div className="border rounded-lg overflow-hidden bg-white dark:bg-gray-900">
                    <div className="bg-gray-100 dark:bg-gray-800 p-3 border-b">
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        <strong>Período:</strong> {nomesMeses[mesSelecionado - 1]} {anoSelecionado} |
                        <strong> Requerimentos:</strong> {estatisticasPeriodo.totalRequerimentos} |
                        <strong> Horas:</strong> {formatarHorasParaExibicao(estatisticasPeriodo.totalHoras, 'completo')} |
                        <strong> Valor:</strong> R$ {estatisticasPeriodo.valorTotalFaturavel.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                    </div>
                    <div
                      className="max-h-[600px] overflow-y-auto p-4"
                      dangerouslySetInnerHTML={{ __html: corpoEmail }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setModalEmailAberto(false)}
              >
                Cancelar
              </Button>
              <Button
                onClick={() => setConfirmacaoAberta(true)}
                disabled={!isFormularioValido()}
              >
                <Send className="h-4 w-4 mr-2" />
                Enviar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>



        {/* Confirmação de Envio */}
        <AlertDialog open={confirmacaoAberta} onOpenChange={setConfirmacaoAberta}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <Send className="h-5 w-5 text-blue-600" />
                Confirmar Disparo de Faturamento
              </AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja disparar o faturamento para{' '}
                <strong>{destinatarios.filter(e => e.trim()).length} destinatário(s)</strong>?
                <br /><br />
                <strong>Período:</strong> {nomesMeses[mesSelecionado - 1]} {anoSelecionado}
                <br />
                <strong>Requerimentos selecionados:</strong> {requerimentosSelecionados.length}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={enviandoEmail}>
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDispararFaturamento}
                disabled={enviandoEmail}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {enviandoEmail ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Confirmar Disparo
                  </>
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Confirmação de Rejeição */}
        <AlertDialog open={confirmacaoRejeicaoAberta} onOpenChange={setConfirmacaoRejeicaoAberta}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                Confirmar Rejeição de Requerimento
              </AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja rejeitar este requerimento?
                <br /><br />
                <strong>Chamado:</strong> {requerimentoParaRejeitar?.chamado}
                <br />
                <strong>Cliente:</strong> {requerimentoParaRejeitar?.cliente_nome || 'N/A'}
                <br />
                <strong>Horas Total:</strong> {requerimentoParaRejeitar ? formatarHorasParaExibicao(requerimentoParaRejeitar.horas_total?.toString() || '0', 'completo') : '0:00'}
                <br /><br />
                <span className="text-amber-600">
                  ⚠️ O requerimento voltará para a tela "Lançar Requerimentos" e precisará ser enviado novamente para faturamento.
                </span>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={rejeitarRequerimento.isPending}>
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmarRejeicao}
                disabled={rejeitarRequerimento.isPending}
                className="bg-red-600 hover:bg-red-700"
              >
                {rejeitarRequerimento.isPending ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Rejeitando...
                  </>
                ) : (
                  <>
                    <X className="h-4 w-4 mr-2" />
                    Confirmar Rejeição
                  </>
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>


      </div>
    </AdminLayout>
  );
}