/**
 * Tela "Envio Automático de Saldo Parcial": agendamentos por cliente, envio imediato
 * ("Executar agora") e histórico de envios.
 *
 * O envio roda no sync-api (em background); esta tela só configura os agendamentos,
 * dispara execuções manuais e acompanha o histórico. Destinatários: contatos do cliente
 * marcados como "Saldo Parcial" ou "Ambos" em Gerenciamento de Clientes, mais o CC.
 */

import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, CalendarClock, Edit, Loader2, Plus, Send, Trash2 } from 'lucide-react';
import AdminLayout from '@/components/admin/LayoutAdmin';
import { ProtectedAction } from '@/components/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
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
import { AgendamentoSaldoParcialFormModal } from '@/components/admin/banco-horas/AgendamentoSaldoParcialFormModal';
import { useToast } from '@/hooks/use-toast';
import { useApiStatus } from '@/hooks/useApiStatus';
import {
  useAgendamentosSaldoParcial,
  useAlternarAgendamentoSaldoParcial,
  useClientesElegiveisSaldoParcial,
  useExcluirAgendamentoSaldoParcial,
  useExecucoesSaldoParcial,
  useExecutarSaldoParcialAgora,
  useSalvarAgendamentoSaldoParcial,
  useStatusSaldoParcial,
} from '@/hooks/useEnvioSaldoParcial';
import type {
  AgendamentoSaldoParcial,
  AgendamentoSaldoParcialInput,
  StatusAgendamentoSaldoParcial,
  StatusExecucaoSaldoParcial,
} from '@/types/envioSaldoParcial';
import { descreverRecorrencia } from '@/utils/descreverRecorrencia';
import { preverProximaExecucao } from '@/utils/proximaExecucao';

const SCREEN_KEY = 'envio_saldo_parcial';

const TAB_TRIGGER =
  'data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm text-gray-500 font-medium';

const COR_STATUS: Record<StatusExecucaoSaldoParcial | StatusAgendamentoSaldoParcial, string> = {
  executando: 'bg-blue-100 text-blue-800',
  sucesso: 'bg-green-100 text-green-800',
  parcial: 'bg-yellow-100 text-yellow-800',
  erro: 'bg-red-100 text-red-800',
  sem_destinatarios: 'bg-yellow-100 text-yellow-800',
  interrompida: 'bg-orange-100 text-orange-800',
};

function EnvioSaldoParcial() {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const { data: apiOnline = false } = useApiStatus();

  const { agendamentos, isLoading: carregandoAgendamentos, error: erroAgendamentos } = useAgendamentosSaldoParcial();
  const { execucoes, isLoading: carregandoExecucoes, error: erroExecucoes } = useExecucoesSaldoParcial();
  const { clientes } = useClientesElegiveisSaldoParcial();
  // undefined = ainda sem resposta do sync-api; só avisamos com false confirmado
  const { agendadorAtivo, renderImagemConfigurado } = useStatusSaldoParcial();
  const agendadorDesligado = agendadorAtivo === false;
  const semRenderImagem = renderImagemConfigurado === false;
  const salvar = useSalvarAgendamentoSaldoParcial();
  const alternar = useAlternarAgendamentoSaldoParcial();
  const excluir = useExcluirAgendamentoSaldoParcial();
  const executar = useExecutarSaldoParcialAgora();

  const [modalAberto, setModalAberto] = useState(false);
  const [agendamentoEditando, setAgendamentoEditando] = useState<AgendamentoSaldoParcial | null>(null);
  const [agendamentoExcluindo, setAgendamentoExcluindo] = useState<AgendamentoSaldoParcial | null>(null);
  const [agendamentoExecutando, setAgendamentoExecutando] = useState<AgendamentoSaldoParcial | null>(null);

  // Clientes sem nenhum contato "Saldo Parcial"/"Ambos": o envio para eles é pulado
  const clientesSemContato = useMemo(
    () => new Set(clientes.filter((c) => c.qtdContatosSaldoParcial === 0).map((c) => c.id)),
    [clientes]
  );

  const formatarData = (iso: string | null) =>
    iso
      ? new Date(iso).toLocaleString(i18n.language || 'pt-BR', {
          timeZone: 'America/Sao_Paulo',
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        })
      : null;

  const mensagemErro = (e: unknown) => (e instanceof Error ? e.message : undefined);

  // ---------------------------------------------------------------------------
  // Ações
  // ---------------------------------------------------------------------------
  const abrirNovo = () => {
    setAgendamentoEditando(null);
    setModalAberto(true);
  };

  const abrirEdicao = (ag: AgendamentoSaldoParcial) => {
    setAgendamentoEditando(ag);
    setModalAberto(true);
  };

  const handleSalvar = async (dados: AgendamentoSaldoParcialInput) => {
    try {
      await salvar.mutateAsync({ id: agendamentoEditando?.id, dados });
      toast({ title: t('envioSaldoParcial.toasts.salvo') });
      setModalAberto(false);
    } catch (e) {
      toast({ title: t('envioSaldoParcial.toasts.erroSalvar'), description: mensagemErro(e), variant: 'destructive' });
    }
  };

  const handleAlternar = async (ag: AgendamentoSaldoParcial, ativo: boolean) => {
    try {
      await alternar.mutateAsync({ id: ag.id, ativo });
      toast({ title: ativo ? t('envioSaldoParcial.toasts.ativado') : t('envioSaldoParcial.toasts.desativado') });
    } catch (e) {
      toast({ title: t('envioSaldoParcial.toasts.erroAlternar'), description: mensagemErro(e), variant: 'destructive' });
    }
  };

  const handleExcluir = async () => {
    if (!agendamentoExcluindo) return;
    try {
      await excluir.mutateAsync(agendamentoExcluindo.id);
      toast({ title: t('envioSaldoParcial.toasts.excluido') });
    } catch (e) {
      toast({ title: t('envioSaldoParcial.toasts.erroExcluir'), description: mensagemErro(e), variant: 'destructive' });
    } finally {
      setAgendamentoExcluindo(null);
    }
  };

  const handleExecutar = async () => {
    if (!agendamentoExecutando) return;
    try {
      await executar.mutateAsync(agendamentoExecutando.id);
      toast({ title: t('envioSaldoParcial.toasts.execucaoIniciada') });
    } catch (e) {
      toast({ title: t('envioSaldoParcial.toasts.execucaoErro'), description: mensagemErro(e), variant: 'destructive' });
    } finally {
      setAgendamentoExecutando(null);
    }
  };

  // ---------------------------------------------------------------------------
  // Render helpers
  // ---------------------------------------------------------------------------
  const badgeStatus = (status: StatusExecucaoSaldoParcial | StatusAgendamentoSaldoParcial | null) =>
    status ? (
      <Badge className={`${COR_STATUS[status]} text-xs`}>
        {status === 'executando' && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
        {t(`envioSaldoParcial.status.${status}`)}
      </Badge>
    ) : (
      <span className="text-gray-400">—</span>
    );

  const erroCarregamento = (erro: unknown) => (
    <div className="flex items-center gap-2 py-8 justify-center text-sm text-red-600">
      <AlertTriangle className="h-4 w-4" />
      {mensagemErro(erro)}
    </div>
  );

  const carregando = (
    <div className="flex justify-center py-8">
      <Loader2 className="h-6 w-6 animate-spin text-sonda-blue" />
    </div>
  );

  return (
    <AdminLayout>
      <div className="min-h-screen bg-bg-secondary">
        <div className="px-6 py-6 space-y-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
                {t('envioSaldoParcial.title')}
              </h1>
              <p className="text-muted-foreground mt-1">{t('envioSaldoParcial.subtitle')}</p>
            </div>
            <div className="flex flex-col items-start sm:items-end gap-2">
              <ProtectedAction screenKey={SCREEN_KEY} requiredLevel="edit">
                <Button size="sm" className="bg-sonda-blue hover:bg-sonda-dark-blue" onClick={abrirNovo}>
                  <Plus className="h-4 w-4 mr-2" />
                  {t('envioSaldoParcial.novoAgendamento')}
                </Button>
              </ProtectedAction>
              {!apiOnline && (
                <span className="flex items-center gap-1 text-xs text-red-600">
                  <AlertTriangle className="h-3 w-3" />
                  {t('envioSaldoParcial.apiOffline')}
                </span>
              )}
            </div>
          </div>

          {semRenderImagem && (
            <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{t('envioSaldoParcial.renderImagemNaoConfigurado')}</span>
            </div>
          )}

          {agendadorDesligado && (
            <div className="flex items-start gap-2 rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-sm text-yellow-800">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{t('envioSaldoParcial.agendadorDesligado')}</span>
            </div>
          )}

          <Tabs defaultValue="agendamentos" className="w-full">
            <TabsList className="bg-gray-100 p-1 rounded-lg">
              <TabsTrigger value="agendamentos" className={TAB_TRIGGER}>
                {t('envioSaldoParcial.tabs.agendamentos')}
              </TabsTrigger>
              <TabsTrigger value="historico" className={TAB_TRIGGER}>
                {t('envioSaldoParcial.tabs.historico')}
              </TabsTrigger>
            </TabsList>

            {/* Agendamentos */}
            <TabsContent value="agendamentos" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-semibold">
                    {t('envioSaldoParcial.agendamentos.titulo', { count: agendamentos.length })}
                  </CardTitle>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                  {carregandoAgendamentos ? (
                    carregando
                  ) : erroAgendamentos ? (
                    erroCarregamento(erroAgendamentos)
                  ) : agendamentos.length === 0 ? (
                    <div className="flex flex-col items-center gap-2 py-12 text-gray-500">
                      <CalendarClock className="h-8 w-8 text-gray-400" />
                      <p className="text-sm">{t('envioSaldoParcial.agendamentos.vazio')}</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50">
                          <TableHead className="font-semibold text-gray-700">{t('envioSaldoParcial.agendamentos.nome')}</TableHead>
                          <TableHead className="font-semibold text-gray-700">{t('envioSaldoParcial.agendamentos.clientes')}</TableHead>
                          <TableHead className="font-semibold text-gray-700">{t('envioSaldoParcial.agendamentos.emailsCc')}</TableHead>
                          <TableHead className="font-semibold text-gray-700 text-center">{t('envioSaldoParcial.agendamentos.proxima')}</TableHead>
                          <TableHead className="font-semibold text-gray-700 text-center">{t('envioSaldoParcial.agendamentos.ultima')}</TableHead>
                          <TableHead className="font-semibold text-gray-700 text-center">{t('envioSaldoParcial.agendamentos.status')}</TableHead>
                          <TableHead className="font-semibold text-gray-700 text-center">{t('envioSaldoParcial.agendamentos.ativo')}</TableHead>
                          <TableHead className="font-semibold text-gray-700 text-center w-32">{t('envioSaldoParcial.agendamentos.acoes')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {agendamentos.map((ag) => {
                          const semContato = (ag.empresas || []).filter((e) => clientesSemContato.has(e.empresa_id)).length;
                          return (
                            <TableRow key={ag.id} className="hover:bg-gray-50">
                              <TableCell>
                                <span className="font-medium">{ag.nome}</span>
                                <div className="text-xs text-gray-500 mt-1">{descreverRecorrencia(ag, t)}</div>
                              </TableCell>
                              <TableCell className="text-sm">
                                {t('envioSaldoParcial.agendamentos.qtdClientes', { count: (ag.empresas || []).length })}
                                {semContato > 0 && (
                                  <div className="flex items-center gap-1 text-xs text-yellow-700 mt-1">
                                    <AlertTriangle className="h-3 w-3" />
                                    <span>{t('envioSaldoParcial.agendamentos.clientesSemContato', { count: semContato })}</span>
                                  </div>
                                )}
                              </TableCell>
                              <TableCell className="text-xs text-gray-600">
                                {ag.emails_cc?.length ? (
                                  ag.emails_cc.map((email) => <div key={email}>{email}</div>)
                                ) : (
                                  <span className="text-gray-400">—</span>
                                )}
                              </TableCell>
                              <TableCell className="text-center text-sm">
                                {!ag.ativo ? (
                                  <span className="text-gray-400">—</span>
                                ) : (
                                  // Logo após salvar, o servidor ainda não recalculou: mostra a previsão (mesma regra do agendador)
                                  formatarData(ag.proxima_execucao || (agendadorDesligado ? null : preverProximaExecucao(ag))) || (
                                    <span className="text-gray-400">
                                      {agendadorDesligado
                                        ? t('envioSaldoParcial.agendamentos.aguardandoAgendador')
                                        : t('envioSaldoParcial.agendamentos.calculando')}
                                    </span>
                                  )
                                )}
                              </TableCell>
                              <TableCell className="text-center text-sm">
                                {formatarData(ag.ultima_execucao) || (
                                  <span className="text-gray-400">{t('envioSaldoParcial.agendamentos.nunca')}</span>
                                )}
                              </TableCell>
                              <TableCell className="text-center">{badgeStatus(ag.ultimo_status)}</TableCell>
                              <TableCell className="text-center">
                                <ProtectedAction
                                  screenKey={SCREEN_KEY}
                                  requiredLevel="edit"
                                  fallback={<Switch checked={ag.ativo} disabled />}
                                >
                                  <Switch
                                    checked={ag.ativo}
                                    disabled={alternar.isPending}
                                    onCheckedChange={(v) => handleAlternar(ag, v)}
                                    aria-label={t('envioSaldoParcial.agendamentos.ativo')}
                                  />
                                </ProtectedAction>
                              </TableCell>
                              <TableCell className="text-center">
                                <ProtectedAction screenKey={SCREEN_KEY} requiredLevel="edit">
                                  <div className="flex justify-center gap-1">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-8 w-8 p-0"
                                      title={t('envioSaldoParcial.agendamentos.executarAgora')}
                                      disabled={!apiOnline || executar.isPending}
                                      onClick={() => setAgendamentoExecutando(ag)}
                                    >
                                      <Send className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-8 w-8 p-0"
                                      title={t('envioSaldoParcial.agendamentos.editar')}
                                      onClick={() => abrirEdicao(ag)}
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-8 w-8 p-0 text-red-600 hover:text-red-800"
                                      title={t('envioSaldoParcial.agendamentos.excluir')}
                                      onClick={() => setAgendamentoExcluindo(ag)}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </ProtectedAction>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Histórico */}
            <TabsContent value="historico" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-semibold">{t('envioSaldoParcial.historico.titulo')}</CardTitle>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                  {carregandoExecucoes ? (
                    carregando
                  ) : erroExecucoes ? (
                    erroCarregamento(erroExecucoes)
                  ) : execucoes.length === 0 ? (
                    <p className="py-12 text-center text-sm text-gray-500">{t('envioSaldoParcial.historico.vazio')}</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50">
                          <TableHead className="font-semibold text-gray-700">{t('envioSaldoParcial.historico.inicio')}</TableHead>
                          <TableHead className="font-semibold text-gray-700">{t('envioSaldoParcial.historico.cliente')}</TableHead>
                          <TableHead className="font-semibold text-gray-700">{t('envioSaldoParcial.historico.origem')}</TableHead>
                          <TableHead className="font-semibold text-gray-700 text-center">{t('envioSaldoParcial.historico.status')}</TableHead>
                          <TableHead className="font-semibold text-gray-700 text-center">{t('envioSaldoParcial.historico.destinatarios')}</TableHead>
                          <TableHead className="font-semibold text-gray-700 text-center">{t('envioSaldoParcial.historico.emails')}</TableHead>
                          <TableHead className="font-semibold text-gray-700">{t('envioSaldoParcial.historico.erro')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {execucoes.map((ex) => (
                          <TableRow key={ex.id} className="hover:bg-gray-50">
                            <TableCell className="text-sm">{formatarData(ex.iniciado_em)}</TableCell>
                            <TableCell className="text-sm font-medium">{ex.empresa?.nome_abreviado || '—'}</TableCell>
                            <TableCell className="text-sm">
                              {ex.origem === 'agendado'
                                ? t('envioSaldoParcial.historico.agendado')
                                : t('envioSaldoParcial.historico.manual')}
                              {ex.agendamento?.nome && <div className="text-xs text-gray-500 mt-1">{ex.agendamento.nome}</div>}
                            </TableCell>
                            <TableCell className="text-center">{badgeStatus(ex.status)}</TableCell>
                            <TableCell className="text-center text-sm">{ex.qtd_destinatarios ?? '—'}</TableCell>
                            <TableCell className="text-center text-sm">{ex.qtd_emails ?? '—'}</TableCell>
                            <TableCell className="text-xs text-red-600 max-w-xs break-words">{ex.erro || ''}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <AgendamentoSaldoParcialFormModal
        open={modalAberto}
        onOpenChange={setModalAberto}
        agendamento={agendamentoEditando}
        onSalvar={handleSalvar}
        salvando={salvar.isPending}
      />

      <AlertDialog open={!!agendamentoExecutando} onOpenChange={(v) => !v && setAgendamentoExecutando(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-semibold text-sonda-blue">
              {t('envioSaldoParcial.agendamentos.executarTitulo')}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-gray-500">
              {t('envioSaldoParcial.agendamentos.executarDescricao', {
                nome: agendamentoExecutando?.nome,
                count: agendamentoExecutando?.empresas?.length ?? 0,
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('envioSaldoParcial.agendamentos.cancelar')}</AlertDialogCancel>
            <AlertDialogAction className="bg-sonda-blue hover:bg-sonda-dark-blue" onClick={handleExecutar}>
              {t('envioSaldoParcial.agendamentos.confirmarExecutar')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!agendamentoExcluindo} onOpenChange={(v) => !v && setAgendamentoExcluindo(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-semibold text-sonda-blue">
              {t('envioSaldoParcial.agendamentos.excluirTitulo')}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-gray-500">
              {t('envioSaldoParcial.agendamentos.excluirDescricao', { nome: agendamentoExcluindo?.nome })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('envioSaldoParcial.agendamentos.cancelar')}</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={handleExcluir}>
              {t('envioSaldoParcial.agendamentos.excluir')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}

export default EnvioSaldoParcial;
