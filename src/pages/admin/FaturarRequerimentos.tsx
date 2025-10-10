import { useState, useMemo } from 'react';
import {
  Send,
  Mail,
  FileText,
  Calendar,
  Clock,
  DollarSign,
  TrendingUp,
  Filter,
  RefreshCw,

  Plus,
  X,
  AlertTriangle,
  Paperclip,
  Calculator
} from 'lucide-react';
import AdminLayout from '@/components/admin/LayoutAdmin';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MultiSelect, Option } from '@/components/ui/multi-select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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

import ProtectedAction from '@/components/auth/ProtectedAction';
import { toast } from 'sonner';

import { useRequerimentosFaturamento, useRejeitarRequerimento } from '@/hooks/useRequerimentos';
import { faturamentoService } from '@/services/faturamentoService';

import {
  Requerimento,
  TipoCobrancaType,
  EmailFaturamento,
  TIPO_COBRANCA_OPTIONS,
  requerValorHora
} from '@/types/requerimentos';

import {
  getCobrancaColors,
  getCobrancaIcon
} from '@/utils/requerimentosColors';
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
  const [filtrosExpandidos, setFiltrosExpandidos] = useState(false);

  // Estados para rejeição
  const [requerimentoParaRejeitar, setRequerimentoParaRejeitar] = useState<Requerimento | null>(null);
  const [confirmacaoRejeicaoAberta, setConfirmacaoRejeicaoAberta] = useState(false);

  // Hooks
  const {
    data: dadosFaturamento,
    isLoading,
    error,
    refetch
  } = useRequerimentosFaturamento(mesSelecionado, anoSelecionado);

  const rejeitarRequerimento = useRejeitarRequerimento();

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
    if (filtroTipo.length === 0) {
      return Object.values(requerimentosAgrupados);
    }

    return Object.values(requerimentosAgrupados).filter(grupo =>
      filtroTipo.includes(grupo.tipo)
    );
  }, [requerimentosAgrupados, filtroTipo]);

  // Funções
  const nomesMeses = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  // Opções para o MultiSelect de tipos de cobrança
  const tipoCobrancaOptions: Option[] = TIPO_COBRANCA_OPTIONS
    .filter(option => option.value !== 'Selecione')
    .map(option => ({
      value: option.value,
      label: option.label
    }));

  const handleAbrirModalEmail = async () => {
    if (estatisticasPeriodo.totalRequerimentos === 0) {
      toast.error('Não há requerimentos para faturamento no período selecionado');
      return;
    }

    try {
      // Gerar relatório HTML
      const relatorio = await faturamentoService.gerarRelatorioFaturamento(mesSelecionado, anoSelecionado);
      const htmlTemplate = faturamentoService.criarTemplateEmailFaturamento(relatorio);

      // Configurar dados padrão do email
      setAssuntoEmail(`Relatório de Faturamento - ${nomesMeses[mesSelecionado - 1]} ${anoSelecionado}`);
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

      // Gerar relatório HTML automaticamente
      const relatorio = await faturamentoService.gerarRelatorioFaturamento(mesSelecionado, anoSelecionado);
      const htmlTemplate = faturamentoService.criarTemplateEmailFaturamento(relatorio);

      const emailFaturamento: EmailFaturamento = {
        destinatarios: emailsValidos,
        destinatariosCC: emailsCCValidos,
        assunto: assuntoEmail,
        corpo: htmlTemplate
      };

      const resultado = await faturamentoService.dispararFaturamento(emailFaturamento);

      if (resultado.success) {
        toast.success(resultado.message || 'Faturamento disparado com sucesso!');
        setModalEmailAberto(false);
        setConfirmacaoAberta(false);

        // Limpar formulário
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
    return new Date(data).toLocaleDateString('pt-BR');
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

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Cabeçalho */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">
              Faturar Requerimentos
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Visualize e processe requerimentos enviados para faturamento
            </p>
          </div>

          <div className="flex items-center gap-2">
            {filtroTipo.length > 0 && (
              <Badge variant="outline" className="text-sm">
                Filtrado por {filtroTipo.length} tipo{filtroTipo.length !== 1 ? 's' : ''}
              </Badge>
            )}
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <ProtectedAction screenKey="faturar_requerimentos" requiredLevel="edit">
              <Button
                onClick={handleAbrirModalEmail}
                disabled={isLoading || estatisticasPeriodo.totalRequerimentos === 0}
                className="flex items-center gap-2"
                title={estatisticasPeriodo.totalRequerimentos === 0 ? 'Não há requerimentos para faturamento no período selecionado' : undefined}
              >
                <Send className="h-4 w-4" />
                Disparar Faturamento
              </Button>
            </ProtectedAction>
          </div>
        </div>

        {/* Ações Principais */}
        <div className="flex flex-wrap gap-4 items-center justify-end">

          <Button
            variant="outline"
            size="sm"
            onClick={() => setFiltrosExpandidos(!filtrosExpandidos)}
            className="flex items-center justify-center space-x-2"
            aria-expanded={filtrosExpandidos}
            aria-controls="filters-section"
          >
            <Filter className="h-4 w-4" />
            <span>Filtros</span>
            {filtroTipo.length > 0 && (
              <Badge variant="secondary" className="ml-1">
                {filtroTipo.length}
              </Badge>
            )}
          </Button>
        </div>

        {/* Filtros */}
        {filtrosExpandidos && (
          <Card id="filters-section">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Filtros de Período e Tipo
                {filtroTipo.length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {filtroTipo.length} tipo{filtroTipo.length !== 1 ? 's' : ''} selecionado{filtroTipo.length !== 1 ? 's' : ''}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
              </div>

              {/* Botões de ação rápida */}
              <div className="flex items-center gap-2 mt-4 pt-4 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setFiltroTipo([])}
                  disabled={filtroTipo.length === 0}
                >
                  Limpar Filtros
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setFiltroTipo(tipoCobrancaOptions.map(opt => opt.value as TipoCobrancaType))}
                  disabled={filtroTipo.length === tipoCobrancaOptions.length}
                >
                  Selecionar Todos
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Total de Requerimentos
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {estatisticasPeriodo.totalRequerimentos}
                  </p>
                </div>
                <FileText className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Total de Horas
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {formatarHorasParaExibicao(estatisticasPeriodo.totalHoras, 'completo')}
                  </p>
                </div>
                <Clock className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Tipos Ativos
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {estatisticasPeriodo.tiposAtivos}
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Período
                  </p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">
                    {nomesMeses[mesSelecionado - 1]} {anoSelecionado}
                  </p>
                </div>
                <Calendar className="h-8 w-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    Valor Total Faturável
                  </p>
                  <p className="text-2xl font-bold text-green-600">
                    R$ {estatisticasPeriodo.valorTotalFaturavel.toLocaleString('pt-BR', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Faturado + Hora Extra + Sobreaviso + Bolsão Enel
                  </p>
                </div>
                <Calculator className="h-8 w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
        </div>

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
        ) : estatisticasPeriodo.totalRequerimentos === 0 ? (
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
          <div className="space-y-6">
            {gruposFiltrados.map(grupo => {
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
                      <table className="w-full">
                        <thead className="bg-gray-50 dark:bg-gray-800">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              Chamado
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              Cliente
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              Módulo
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              Linguagem
                            </th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              H.Func
                            </th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              H.Téc
                            </th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              Total
                            </th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              Data Envio
                            </th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              Data Aprov.
                            </th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              Valor Total
                            </th>
                            <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              Ações
                            </th>
                          </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
                          {grupo.requerimentos.map(req => (
                            <tr key={req.id} className="hover:bg-gray-50 dark:hover:bg-gray-800">
                              <td className="px-6 py-4 whitespace-nowrap">
                                <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-sm">
                                  {req.chamado}
                                </code>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                {req.cliente_nome || 'N/A'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm">
                                <Badge variant="outline" className="text-xs">
                                  {req.modulo}
                                </Badge>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm">
                                <Badge variant="outline" className="text-xs">
                                  {req.linguagem}
                                </Badge>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600 text-center">
                                {formatarHoras(req.horas_funcional)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600 text-center">
                                {formatarHoras(req.horas_tecnico)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 dark:text-white text-center">
                                {formatarHoras(req.horas_total)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 text-center">
                                {formatarData(req.data_envio)}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 text-center">
                                {req.data_aprovacao ? formatarData(req.data_aprovacao) : '-'}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                                {req.valor_total_geral ? (
                                  <span className="font-medium text-green-600">
                                    R$ {req.valor_total_geral.toLocaleString('pt-BR', {
                                      minimumFractionDigits: 2,
                                      maximumFractionDigits: 2
                                    })}
                                  </span>
                                ) : (
                                  <span className="text-gray-400">-</span>
                                )}
                              </td>

                              <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                                <ProtectedAction screenKey="faturar_requerimentos" requiredLevel="edit">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleAbrirConfirmacaoRejeicao(req)}
                                    disabled={rejeitarRequerimento.isPending}
                                    className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                                  >
                                    <X className="h-4 w-4 mr-1" />
                                    Rejeitar
                                  </Button>
                                </ProtectedAction>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
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
              <AlertDialogTitle>Confirmar Envio de Faturamento</AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja enviar o relatório de faturamento para{' '}
                <strong>{destinatarios.filter(e => e.trim()).length} destinatário(s)</strong>?
                <br /><br />
                <strong>Período:</strong> {nomesMeses[mesSelecionado - 1]} {anoSelecionado}
                <br />
                <strong>Total de requerimentos:</strong> {estatisticasPeriodo.totalRequerimentos}
                <br />
                <strong>Total de horas:</strong> {formatarHorasParaExibicao(estatisticasPeriodo.totalHoras, 'completo')}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={enviandoEmail}>
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDispararFaturamento}
                disabled={enviandoEmail}
              >
                {enviandoEmail ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Confirmar Envio
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