/**
 * Tela "Sincronização SQL Server": agendamentos, execução manual e histórico.
 *
 * A sincronização roda no sync-api (em background); esta tela só configura os
 * agendamentos, dispara execuções manuais e acompanha o histórico.
 */

import { Fragment, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  AlertTriangle,
  CalendarClock,
  ChevronDown,
  ChevronRight,
  Database,
  Edit,
  Loader2,
  Plus,
  Trash2,
} from 'lucide-react';
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
import { SyncSelectionModal, type TabelasSincronizacao } from '@/components/admin/pesquisas-satisfacao/SyncSelectionModal';
import { AgendamentoFormModal } from '@/components/admin/sincronizacao/AgendamentoFormModal';
import { useToast } from '@/hooks/use-toast';
import { useApiStatus } from '@/hooks/useApiStatus';
import {
  useAlternarAgendamento,
  useExcluirAgendamento,
  useExecutarSyncAgora,
  useSalvarAgendamento,
  useSyncAgendamentos,
  useSyncExecucoes,
} from '@/hooks/useSyncAgendamentos';
import { descreverRecorrencia } from '@/utils/descreverRecorrencia';
import { TABELAS_SYNC } from '@/schemas/syncAgendamentoSchemas';
import type { StatusExecucaoSync, SyncAgendamento, SyncAgendamentoInput, SyncExecucao } from '@/types/syncAgendamentos';

const SCREEN_KEY = 'sincronizacao_sql_server';

const TAB_TRIGGER =
  'data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm text-gray-500 font-medium';

const COR_STATUS: Record<StatusExecucaoSync, string> = {
  executando: 'bg-blue-100 text-blue-800',
  sucesso: 'bg-green-100 text-green-800',
  parcial: 'bg-yellow-100 text-yellow-800',
  erro: 'bg-red-100 text-red-800',
  ignorada: 'bg-gray-100 text-gray-700',
  interrompida: 'bg-orange-100 text-orange-800',
};

// Ordem de exibição das etapas no resumo da execução
const ETAPAS_RESUMO = [...TABELAS_SYNC, 'validacao', 'inconsistencias', 'ajustesRetroativos'];

function SincronizacaoSqlServer() {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const { data: apiOnline = false } = useApiStatus();

  const { agendamentos, isLoading: carregandoAgendamentos, error: erroAgendamentos } = useSyncAgendamentos();
  const { execucoes, isLoading: carregandoExecucoes, error: erroExecucoes } = useSyncExecucoes();
  const salvar = useSalvarAgendamento();
  const alternar = useAlternarAgendamento();
  const excluir = useExcluirAgendamento();
  const executar = useExecutarSyncAgora();

  const [modalExecutarAberto, setModalExecutarAberto] = useState(false);
  const [modalAgendamentoAberto, setModalAgendamentoAberto] = useState(false);
  const [agendamentoEditando, setAgendamentoEditando] = useState<SyncAgendamento | null>(null);
  const [agendamentoExcluindo, setAgendamentoExcluindo] = useState<SyncAgendamento | null>(null);
  const [execucaoAberta, setExecucaoAberta] = useState<string | null>(null);

  const emExecucao = execucoes.some((e) => e.status === 'executando');

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

  const formatarDuracao = (inicio: string, fim: string | null) => {
    if (!fim) return '—';
    const segundos = Math.max(0, Math.round((new Date(fim).getTime() - new Date(inicio).getTime()) / 1000));
    const m = Math.floor(segundos / 60);
    return m > 0 ? `${m}m ${segundos % 60}s` : `${segundos}s`;
  };

  const mensagemErro = (e: unknown) => (e instanceof Error ? e.message : undefined);

  // ---------------------------------------------------------------------------
  // Ações
  // ---------------------------------------------------------------------------
  const handleExecutar = async (tabelas: TabelasSincronizacao) => {
    setModalExecutarAberto(false);
    try {
      await executar.mutateAsync({
        pesquisas: tabelas.pesquisas,
        especialistas: tabelas.especialistas,
        apontamentos: tabelas.apontamentos,
        tickets: tabelas.tickets,
        codigoResolucao: tabelas.codigoResolucao,
        detectarInconsistencias: tabelas.detectarInconsistencias,
        ...(tabelas.dataInicial ? { dataInicial: tabelas.dataInicial } : {}),
      });
      toast({ title: t('sincronizacaoSql.toasts.execucaoIniciada') });
    } catch (e) {
      toast({ title: t('sincronizacaoSql.toasts.execucaoErro'), description: mensagemErro(e), variant: 'destructive' });
    }
  };

  const abrirNovo = () => {
    setAgendamentoEditando(null);
    setModalAgendamentoAberto(true);
  };

  const abrirEdicao = (ag: SyncAgendamento) => {
    setAgendamentoEditando(ag);
    setModalAgendamentoAberto(true);
  };

  const handleSalvar = async (dados: SyncAgendamentoInput) => {
    try {
      await salvar.mutateAsync({ id: agendamentoEditando?.id, dados });
      toast({ title: t('sincronizacaoSql.toasts.salvo') });
      setModalAgendamentoAberto(false);
    } catch (e) {
      toast({ title: t('sincronizacaoSql.toasts.erroSalvar'), description: mensagemErro(e), variant: 'destructive' });
    }
  };

  const handleAlternar = async (ag: SyncAgendamento, ativo: boolean) => {
    try {
      await alternar.mutateAsync({ id: ag.id, ativo });
      toast({ title: ativo ? t('sincronizacaoSql.toasts.ativado') : t('sincronizacaoSql.toasts.desativado') });
    } catch (e) {
      toast({ title: t('sincronizacaoSql.toasts.erroAlternar'), description: mensagemErro(e), variant: 'destructive' });
    }
  };

  const handleExcluir = async () => {
    if (!agendamentoExcluindo) return;
    try {
      await excluir.mutateAsync(agendamentoExcluindo.id);
      toast({ title: t('sincronizacaoSql.toasts.excluido') });
    } catch (e) {
      toast({ title: t('sincronizacaoSql.toasts.erroExcluir'), description: mensagemErro(e), variant: 'destructive' });
    } finally {
      setAgendamentoExcluindo(null);
    }
  };

  // ---------------------------------------------------------------------------
  // Render helpers
  // ---------------------------------------------------------------------------
  const badgeStatus = (status: StatusExecucaoSync | null) =>
    status ? (
      <Badge className={`${COR_STATUS[status]} text-xs`}>
        {status === 'executando' && <Loader2 className="h-3 w-3 mr-1 animate-spin" />}
        {t(`sincronizacaoSql.status.${status}`)}
      </Badge>
    ) : (
      <span className="text-gray-400">—</span>
    );

  const badgesTabelas = (tabelas: Record<string, any>) => (
    <div className="flex flex-wrap gap-1">
      {TABELAS_SYNC.filter((tb) => tabelas?.[tb]).map((tb) => (
        <Badge key={tb} className="bg-blue-100 text-blue-800 text-xs">
          {t(`sincronizacaoSql.tabelas.${tb}`)}
        </Badge>
      ))}
    </div>
  );

  const textoEtapa = (etapa: any): string =>
    t('sincronizacaoSql.historico.etapaResumo', {
      processados: etapa.processados ?? 0,
      novos: etapa.novos ?? 0,
      atualizados: etapa.atualizados ?? 0,
      erros: etapa.erros ?? 0,
    });

  const resumoExecucao = (ex: SyncExecucao) => {
    const r = ex.resultado || {};
    if (ex.status === 'ignorada') return <span className="text-sm text-gray-500">{t('sincronizacaoSql.historico.motivoIgnorada')}</span>;
    if (r.erro) return <span className="text-sm text-red-600">{t('sincronizacaoSql.historico.erroGeral', { erro: r.erro })}</span>;

    const etapas = ETAPAS_RESUMO.filter((k) => r[k]);
    if (etapas.length === 0) return <span className="text-gray-400">—</span>;

    return (
      <div className="flex flex-wrap gap-1">
        {etapas.map((k) => (
          <Badge
            key={k}
            className={`text-xs ${r[k].sucesso ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
            title={
              r[k].erro
                ? t('sincronizacaoSql.historico.falhou', { erro: r[k].erro })
                : r[k].processados !== undefined
                  ? textoEtapa(r[k])
                  : undefined
            }
          >
            {t(`sincronizacaoSql.tabelas.${k}`)}
          </Badge>
        ))}
      </div>
    );
  };

  const detalhesExecucao = (ex: SyncExecucao) => {
    const r = ex.resultado || {};
    return (
      <div className="space-y-3 py-2">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {TABELAS_SYNC.filter((k) => r[k]).map((k) => (
            <div key={k} className="text-sm">
              <span className="font-medium">{t(`sincronizacaoSql.tabelas.${k}`)}: </span>
              <span className={r[k].sucesso ? 'text-gray-600' : 'text-red-600'}>
                {r[k].erro
                  ? t('sincronizacaoSql.historico.falhou', { erro: r[k].erro })
                  : textoEtapa(r[k])}
              </span>
            </div>
          ))}
        </div>
        <div>
          <p className="text-xs font-semibold text-gray-700 mb-1">{t('sincronizacaoSql.historico.logs')}</p>
          {ex.logs?.length ? (
            <div className="max-h-64 overflow-y-auto rounded border border-gray-200 bg-white p-2 font-mono text-xs space-y-0.5">
              {ex.logs.map((l, i) => (
                <div key={i} className={l.nivel === 'erro' ? 'text-red-600' : 'text-gray-700'}>
                  <span className="text-gray-400">
                    {new Date(l.em).toLocaleTimeString(i18n.language || 'pt-BR', { timeZone: 'America/Sao_Paulo' })}
                  </span>{' '}
                  {l.mensagem}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-500">{t('sincronizacaoSql.historico.semLogs')}</p>
          )}
        </div>
      </div>
    );
  };

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
                {t('sincronizacaoSql.title')}
              </h1>
              <p className="text-muted-foreground mt-1">{t('sincronizacaoSql.subtitle')}</p>
            </div>
            <div className="flex flex-col items-start sm:items-end gap-2">
              <ProtectedAction screenKey={SCREEN_KEY} requiredLevel="edit">
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setModalExecutarAberto(true)}
                    disabled={!apiOnline || emExecucao || executar.isPending}
                  >
                    {emExecucao || executar.isPending ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Database className="h-4 w-4 mr-2" />
                    )}
                    {t('sincronizacaoSql.executarAgora')}
                  </Button>
                  <Button size="sm" className="bg-sonda-blue hover:bg-sonda-dark-blue" onClick={abrirNovo}>
                    <Plus className="h-4 w-4 mr-2" />
                    {t('sincronizacaoSql.novoAgendamento')}
                  </Button>
                </div>
              </ProtectedAction>
              {!apiOnline && (
                <span className="flex items-center gap-1 text-xs text-red-600">
                  <AlertTriangle className="h-3 w-3" />
                  {t('sincronizacaoSql.apiOffline')}
                </span>
              )}
              {emExecucao && (
                <span className="flex items-center gap-1 text-xs text-sonda-blue">
                  <Loader2 className="h-3 w-3 animate-spin" />
                  {t('sincronizacaoSql.emExecucao')}
                </span>
              )}
            </div>
          </div>

          <Tabs defaultValue="agendamentos" className="w-full">
            <TabsList className="bg-gray-100 p-1 rounded-lg">
              <TabsTrigger value="agendamentos" className={TAB_TRIGGER}>
                {t('sincronizacaoSql.tabs.agendamentos')}
              </TabsTrigger>
              <TabsTrigger value="historico" className={TAB_TRIGGER}>
                {t('sincronizacaoSql.tabs.historico')}
              </TabsTrigger>
            </TabsList>

            {/* Agendamentos */}
            <TabsContent value="agendamentos" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg font-semibold">
                    {t('sincronizacaoSql.agendamentos.titulo', { count: agendamentos.length })}
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
                      <p className="text-sm">{t('sincronizacaoSql.agendamentos.vazio')}</p>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50">
                          <TableHead className="font-semibold text-gray-700">{t('sincronizacaoSql.agendamentos.nome')}</TableHead>
                          <TableHead className="font-semibold text-gray-700">{t('sincronizacaoSql.agendamentos.tabelas')}</TableHead>
                          <TableHead className="font-semibold text-gray-700 text-center">{t('sincronizacaoSql.agendamentos.proxima')}</TableHead>
                          <TableHead className="font-semibold text-gray-700 text-center">{t('sincronizacaoSql.agendamentos.ultima')}</TableHead>
                          <TableHead className="font-semibold text-gray-700 text-center">{t('sincronizacaoSql.agendamentos.status')}</TableHead>
                          <TableHead className="font-semibold text-gray-700 text-center">{t('sincronizacaoSql.agendamentos.ativo')}</TableHead>
                          <TableHead className="font-semibold text-gray-700 text-center w-24">{t('sincronizacaoSql.agendamentos.acoes')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {agendamentos.map((ag) => (
                          <TableRow key={ag.id} className="hover:bg-gray-50">
                            <TableCell>
                              <span className="font-medium">{ag.nome}</span>
                              <div className="text-xs text-gray-500 mt-1">{descreverRecorrencia(ag, t)}</div>
                            </TableCell>
                            <TableCell>{badgesTabelas(ag.tabelas)}</TableCell>
                            <TableCell className="text-center text-sm">
                              {!ag.ativo ? (
                                <span className="text-gray-400">—</span>
                              ) : (
                                formatarData(ag.proxima_execucao) || (
                                  <span className="text-gray-400">{t('sincronizacaoSql.agendamentos.calculando')}</span>
                                )
                              )}
                            </TableCell>
                            <TableCell className="text-center text-sm">
                              {formatarData(ag.ultima_execucao) || (
                                <span className="text-gray-400">{t('sincronizacaoSql.agendamentos.nunca')}</span>
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
                                  aria-label={t('sincronizacaoSql.agendamentos.ativo')}
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
                                    title={t('sincronizacaoSql.agendamentos.editar')}
                                    onClick={() => abrirEdicao(ag)}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 w-8 p-0 text-red-600 hover:text-red-800"
                                    title={t('sincronizacaoSql.agendamentos.excluir')}
                                    onClick={() => setAgendamentoExcluindo(ag)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </ProtectedAction>
                            </TableCell>
                          </TableRow>
                        ))}
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
                  <CardTitle className="text-lg font-semibold">{t('sincronizacaoSql.historico.titulo')}</CardTitle>
                </CardHeader>
                <CardContent className="overflow-x-auto">
                  {carregandoExecucoes ? (
                    carregando
                  ) : erroExecucoes ? (
                    erroCarregamento(erroExecucoes)
                  ) : execucoes.length === 0 ? (
                    <p className="py-12 text-center text-sm text-gray-500">{t('sincronizacaoSql.historico.vazio')}</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50">
                          <TableHead className="w-8" />
                          <TableHead className="font-semibold text-gray-700">{t('sincronizacaoSql.historico.inicio')}</TableHead>
                          <TableHead className="font-semibold text-gray-700 text-center">{t('sincronizacaoSql.historico.duracao')}</TableHead>
                          <TableHead className="font-semibold text-gray-700">{t('sincronizacaoSql.historico.origem')}</TableHead>
                          <TableHead className="font-semibold text-gray-700 text-center">{t('sincronizacaoSql.historico.status')}</TableHead>
                          <TableHead className="font-semibold text-gray-700">{t('sincronizacaoSql.historico.resumo')}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {execucoes.map((ex) => {
                          const aberta = execucaoAberta === ex.id;
                          return (
                            <Fragment key={ex.id}>
                              <TableRow
                                className="hover:bg-gray-50 cursor-pointer"
                                onClick={() => setExecucaoAberta(aberta ? null : ex.id)}
                              >
                                <TableCell>
                                  {aberta ? <ChevronDown className="h-4 w-4 text-gray-500" /> : <ChevronRight className="h-4 w-4 text-gray-500" />}
                                </TableCell>
                                <TableCell className="text-sm">{formatarData(ex.iniciado_em)}</TableCell>
                                <TableCell className="text-center font-mono text-sm">
                                  {formatarDuracao(ex.iniciado_em, ex.finalizado_em)}
                                </TableCell>
                                <TableCell className="text-sm">
                                  {ex.origem === 'agendado'
                                    ? t('sincronizacaoSql.historico.agendado')
                                    : t('sincronizacaoSql.historico.manual')}
                                  {ex.agendamento?.nome && <div className="text-xs text-gray-500 mt-1">{ex.agendamento.nome}</div>}
                                </TableCell>
                                <TableCell className="text-center">{badgeStatus(ex.status)}</TableCell>
                                <TableCell>{resumoExecucao(ex)}</TableCell>
                              </TableRow>
                              {aberta && (
                                <TableRow className="bg-gray-50">
                                  <TableCell />
                                  <TableCell colSpan={5}>{detalhesExecucao(ex)}</TableCell>
                                </TableRow>
                              )}
                            </Fragment>
                          );
                        })}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      <SyncSelectionModal
        open={modalExecutarAberto}
        onOpenChange={setModalExecutarAberto}
        onConfirm={handleExecutar}
        isLoading={executar.isPending}
      />

      <AgendamentoFormModal
        open={modalAgendamentoAberto}
        onOpenChange={setModalAgendamentoAberto}
        agendamento={agendamentoEditando}
        onSalvar={handleSalvar}
        salvando={salvar.isPending}
      />

      <AlertDialog open={!!agendamentoExcluindo} onOpenChange={(v) => !v && setAgendamentoExcluindo(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-xl font-semibold text-sonda-blue">
              {t('sincronizacaoSql.agendamentos.excluirTitulo')}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-gray-500">
              {t('sincronizacaoSql.agendamentos.excluirDescricao', { nome: agendamentoExcluindo?.nome })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('sincronizacaoSql.agendamentos.cancelar')}</AlertDialogCancel>
            <AlertDialogAction className="bg-red-600 hover:bg-red-700" onClick={handleExcluir}>
              {t('sincronizacaoSql.agendamentos.excluir')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}

export default SincronizacaoSqlServer;
