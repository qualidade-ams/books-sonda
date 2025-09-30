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
  Eye,
  Plus
} from 'lucide-react';
import AdminLayout from '@/components/admin/LayoutAdmin';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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

import { useRequerimentosFaturamento } from '@/hooks/useRequerimentos';
import { faturamentoService } from '@/services/faturamentoService';

import {
  Requerimento,
  TipoCobrancaType,
  EmailFaturamento,
  TIPO_COBRANCA_OPTIONS
} from '@/types/requerimentos';

import { 
  getCobrancaColors, 
  getCobrancaIcon
} from '@/utils/requerimentosColors';

// Interface para dados agrupados por tipo de cobrança
interface RequerimentosAgrupados {
  [key: string]: {
    tipo: TipoCobrancaType;
    requerimentos: Requerimento[];
    totalHoras: number;
    quantidade: number;
  };
}

// Interface para estatísticas do período
interface EstatisticasPeriodo {
  totalRequerimentos: number;
  totalHoras: number;
  tiposAtivos: number;
  valorEstimado?: number;
}

export default function FaturarRequerimentos() {
  // Estados
  const [mesAtual] = useState(new Date().getMonth() + 1);
  const [anoAtual] = useState(new Date().getFullYear());
  const [mesSelecionado, setMesSelecionado] = useState(mesAtual);
  const [anoSelecionado, setAnoSelecionado] = useState(anoAtual);
  
  const [modalEmailAberto, setModalEmailAberto] = useState(false);
  const [confirmacaoAberta, setConfirmacaoAberta] = useState(false);
  const [previewAberto, setPreviewAberto] = useState(false);
  
  const [destinatarios, setDestinatarios] = useState<string[]>(['']);
  const [assuntoEmail, setAssuntoEmail] = useState('');
  const [corpoEmail, setCorpoEmail] = useState('');
  const [enviandoEmail, setEnviandoEmail] = useState(false);
  
  const [filtroTipo, setFiltroTipo] = useState<TipoCobrancaType | 'todos'>('todos');

  // Hooks
  const { 
    data: dadosFaturamento, 
    isLoading, 
    error, 
    refetch 
  } = useRequerimentosFaturamento(mesSelecionado);

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
          totalHoras: 0,
          quantidade: 0
        };
      }

      grupos[tipo].requerimentos.push(req);
      grupos[tipo].totalHoras += Number(req.horas_total);
      grupos[tipo].quantidade += 1;
    });

    return grupos;
  }, [dadosFaturamento]);

  const estatisticasPeriodo = useMemo((): EstatisticasPeriodo => {
    if (!dadosFaturamento?.requerimentos) {
      return {
        totalRequerimentos: 0,
        totalHoras: 0,
        tiposAtivos: 0
      };
    }

    return {
      totalRequerimentos: dadosFaturamento.requerimentos.length,
      totalHoras: dadosFaturamento.requerimentos.reduce((acc, req) => acc + Number(req.horas_total), 0),
      tiposAtivos: Object.keys(requerimentosAgrupados).length
    };
  }, [dadosFaturamento, requerimentosAgrupados]);

  const gruposFiltrados = useMemo(() => {
    if (filtroTipo === 'todos') {
      return Object.values(requerimentosAgrupados);
    }
    
    const grupo = requerimentosAgrupados[filtroTipo];
    return grupo ? [grupo] : [];
  }, [requerimentosAgrupados, filtroTipo]);

  // Funções
  const nomesMeses = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

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
      setDestinatarios(['']);
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

  const validarFormularioEmail = (): boolean => {
    const emailsValidos = destinatarios.filter(email => email.trim() !== '');
    
    if (emailsValidos.length === 0) {
      toast.error('É necessário informar pelo menos um destinatário');
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const emailsInvalidos = emailsValidos.filter(email => !emailRegex.test(email));
    
    if (emailsInvalidos.length > 0) {
      toast.error(`E-mails inválidos: ${emailsInvalidos.join(', ')}`);
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
      
      const emailFaturamento: EmailFaturamento = {
        destinatarios: emailsValidos,
        assunto: assuntoEmail,
        corpo: corpoEmail
      };

      const resultado = await faturamentoService.dispararFaturamento(emailFaturamento);

      if (resultado.success) {
        toast.success(resultado.message || 'Faturamento disparado com sucesso!');
        setModalEmailAberto(false);
        setConfirmacaoAberta(false);
        
        // Limpar formulário
        setDestinatarios(['']);
        setAssuntoEmail('');
        setCorpoEmail('');
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

  const handlePreviewEmail = () => {
    if (!validarFormularioEmail()) return;
    setPreviewAberto(true);
  };

  const formatarData = (data: string): string => {
    return new Date(data).toLocaleDateString('pt-BR');
  };

  const formatarHoras = (horas: number): string => {
    return horas.toFixed(1);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Cabeçalho */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <DollarSign className="h-6 w-6 text-green-600" />
              Faturar Requerimentos
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Visualize e processe requerimentos enviados para faturamento
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
              Atualizar
            </Button>
          </div>
        </div>

        {/* Filtros */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="mes">Mês</Label>
                <Select value={mesSelecionado.toString()} onValueChange={(value) => setMesSelecionado(parseInt(value))}>
                  <SelectTrigger>
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

              <div>
                <Label htmlFor="ano">Ano</Label>
                <Select value={anoSelecionado.toString()} onValueChange={(value) => setAnoSelecionado(parseInt(value))}>
                  <SelectTrigger>
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

              <div>
                <Label htmlFor="tipo">Tipo de Cobrança</Label>
                <Select value={filtroTipo} onValueChange={(value) => setFiltroTipo(value as TipoCobrancaType | 'todos')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos os tipos</SelectItem>
                    {TIPO_COBRANCA_OPTIONS.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end">
                <ProtectedAction screenKey="faturar_requerimentos" requiredLevel="edit">
                  <Button
                    onClick={handleAbrirModalEmail}
                    disabled={isLoading || estatisticasPeriodo.totalRequerimentos === 0}
                    className="w-full"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Disparar Faturamento
                  </Button>
                </ProtectedAction>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                    {formatarHoras(estatisticasPeriodo.totalHoras)}
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
                      <div className="flex items-center gap-4 text-sm">
                        <Badge variant="secondary" className="bg-white/20">
                          {grupo.quantidade} requerimento{grupo.quantidade !== 1 ? 's' : ''}
                        </Badge>
                        <Badge variant="secondary" className="bg-white/20">
                          {formatarHoras(grupo.totalHoras)} horas
                        </Badge>
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
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              Horas Func.
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              Horas Téc.
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              Total
                            </th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                              Data Envio
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
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                {req.modulo}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                                {req.linguagem}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                                {formatarHoras(Number(req.horas_funcional))}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-600">
                                {formatarHoras(Number(req.horas_tecnico))}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 dark:text-white">
                                {formatarHoras(Number(req.horas_total))}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                                {formatarData(req.data_envio)}
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
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
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

              {/* Corpo do Email */}
              <div>
                <Label htmlFor="corpo" className="text-base font-medium">
                  Corpo do Email (HTML)
                </Label>
                <Textarea
                  id="corpo"
                  value={corpoEmail}
                  onChange={(e) => setCorpoEmail(e.target.value)}
                  placeholder="Conteúdo HTML do email"
                  className="mt-2 min-h-[200px] font-mono text-sm"
                />
              </div>
            </div>

            <DialogFooter className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handlePreviewEmail}
                disabled={!assuntoEmail || !corpoEmail}
              >
                <Eye className="h-4 w-4 mr-2" />
                Preview
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => setModalEmailAberto(false)}
              >
                Cancelar
              </Button>
              <Button
                onClick={() => setConfirmacaoAberta(true)}
                disabled={!validarFormularioEmail()}
              >
                <Send className="h-4 w-4 mr-2" />
                Enviar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal de Preview */}
        <Dialog open={previewAberto} onOpenChange={setPreviewAberto}>
          <DialogContent className="max-w-6xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle>Preview do Email</DialogTitle>
            </DialogHeader>
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-gray-100 p-4 border-b">
                <p><strong>Para:</strong> {destinatarios.filter(e => e.trim()).join(', ')}</p>
                <p><strong>Assunto:</strong> {assuntoEmail}</p>
              </div>
              <div 
                className="p-4 max-h-[60vh] overflow-y-auto"
                dangerouslySetInnerHTML={{ __html: corpoEmail }}
              />
            </div>
            <DialogFooter>
              <Button onClick={() => setPreviewAberto(false)}>
                Fechar
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
                <strong>Total de horas:</strong> {formatarHoras(estatisticasPeriodo.totalHoras)}
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
      </div>
    </AdminLayout>
  );
}