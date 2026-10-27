/**
 * Aba "Saldo Parcial" da tela Rotinas Automáticas, no visual novo (Modelagem_Fase3.md, seção 11):
 * agendamentos em cartões, "Executar agora", empresas sem agendamento e histórico de envios.
 *
 * O envio roda no sync-api (em background); esta aba só configura os agendamentos,
 * dispara execuções manuais e acompanha o histórico. Destinatários: contatos do cliente
 * marcados como "Saldo Parcial" ou "Ambos" em Gerenciamento de Clientes, mais o CC.
 *
 * Criar e editar abrem a edição em nível a mais, no lugar da tela: a aba só pede (`onEditar`).
 * O botão "Novo agendamento" fica no cabeçalho da tela.
 * Permissão própria: tela `envio_saldo_parcial` (a mesma das políticas RLS das tabelas).
 */

import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, Building2, CalendarClock, Plus, Send } from 'lucide-react';
import { DsPage } from '@/components/ds/DsPage';
import { Indicador } from '@/components/ds/Formulario';
import { SegmentedTabs } from '@/components/ds/SegmentedTabs';
import { EmptyState } from '@/components/ds/EmptyState';
import { Callout } from '@/components/ds/Callout';
import { Button } from '@/components/ds/Button';
import { ConfirmDialog } from '@/components/ds/ConfirmDialog';
import { CartaoAgendamento } from '@/components/admin/saldoParcial/CartaoAgendamento';
import { HistoricoEnvios } from '@/components/admin/saldoParcial/HistoricoEnvios';
import { useToast } from '@/hooks/use-toast';
import { useApiStatus } from '@/hooks/useApiStatus';
import { usePermissions } from '@/hooks/usePermissions';
import {
  useAgendamentosSaldoParcial,
  useAlternarAgendamentoSaldoParcial,
  useClientesElegiveisSaldoParcial,
  useExcluirAgendamentoSaldoParcial,
  useExecucoesSaldoParcial,
  useExecutarSaldoParcialAgora,
  useSemAgendamentoSaldoParcial,
  useStatusSaldoParcial,
} from '@/hooks/useEnvioSaldoParcial';
import { plural } from '@/utils/plural';
import {
  exportacaoSaldoParcial,
  ordenarAgendamentos,
  receberamHoje,
  totaisSaldoParcial,
} from '@/utils/saldoParcialTela';
import { exportarTabela } from '@/utils/exportarTabela';
import { MenuExportar } from '@/components/ds/MenuExportar';
import type { AgendamentoSaldoParcial } from '@/types/envioSaldoParcial';

export const SCREEN_KEY_SALDO_PARCIAL = 'envio_saldo_parcial';

type Secao = 'agendamentos' | 'historico' | 'sem';
/** O histórico olha os últimos envios: o bastante para os indicadores de 7 dias */
const LIMITE_HISTORICO = 200;

interface AbaSaldoParcialProps {
  /** Abre a edição no lugar da tela; nulo é um agendamento novo */
  onEditar: (agendamento: AgendamentoSaldoParcial | null) => void;
}

export function AbaSaldoParcial({ onEditar }: AbaSaldoParcialProps) {
  const { t } = useTranslation();
  const s = (chave: string, valores?: Record<string, unknown>) =>
    t(`rotinasSaldoParcial.${chave}`, valores);
  const { toast } = useToast();
  const { data: apiOnline = false } = useApiStatus();
  const { hasPermission } = usePermissions();
  const podeEditar = hasPermission(SCREEN_KEY_SALDO_PARCIAL, 'edit');

  const {
    agendamentos,
    isLoading: carregandoAgendamentos,
    error: erroAgendamentos,
    refetch,
  } = useAgendamentosSaldoParcial();
  const { execucoes, isLoading: carregandoExecucoes } = useExecucoesSaldoParcial(LIMITE_HISTORICO);
  const { clientes } = useClientesElegiveisSaldoParcial();
  const { empresas: semAgendamento } = useSemAgendamentoSaldoParcial();
  // undefined = ainda sem resposta do sync-api; só avisamos com false confirmado
  const { agendadorAtivo, renderImagemConfigurado } = useStatusSaldoParcial();
  const agendadorDesligado = agendadorAtivo === false;
  const alternar = useAlternarAgendamentoSaldoParcial();
  const excluir = useExcluirAgendamentoSaldoParcial();
  const executar = useExecutarSaldoParcialAgora();

  const [secao, setSecao] = useState<Secao>('agendamentos');
  const [executando, setExecutando] = useState<AgendamentoSaldoParcial | null>(null);
  const [desativando, setDesativando] = useState<AgendamentoSaldoParcial | null>(null);
  const [excluindo, setExcluindo] = useState<AgendamentoSaldoParcial | null>(null);
  const [processando, setProcessando] = useState(false);

  const ordenados = useMemo(
    () => ordenarAgendamentos(agendamentos, agendadorDesligado),
    [agendamentos, agendadorDesligado]
  );
  const totais = totaisSaldoParcial(agendamentos, execucoes);
  // Clientes sem nenhum contato "Saldo Parcial"/"Ambos": o envio para eles é pulado
  const semContato = useMemo(
    () => new Set(clientes.filter((c) => c.qtdContatosSaldoParcial === 0).map((c) => c.id)),
    [clientes]
  );
  const nomeDaEmpresa = (id: string) => clientes.find((c) => c.id === id)?.nome ?? id;

  const mensagemErro = (e: unknown) => (e instanceof Error ? e.message : undefined);
  const avisarErro = (titulo: string, e: unknown) =>
    toast({ title: t(titulo), description: mensagemErro(e), variant: 'destructive' });

  /** Executa uma ação confirmada; o diálogo fecha no fim (o erro vira aviso na própria ação) */
  const confirmar = async (acao: () => Promise<void>, fechar: () => void) => {
    setProcessando(true);
    try {
      await acao();
    } finally {
      setProcessando(false);
      fechar();
    }
  };

  const mudarAtivo = async (ag: AgendamentoSaldoParcial, ativo: boolean) => {
    try {
      await alternar.mutateAsync({ id: ag.id, ativo });
      toast({
        title: t(
          ativo ? 'envioSaldoParcial.toasts.ativado' : 'envioSaldoParcial.toasts.desativado'
        ),
      });
    } catch (e) {
      avisarErro('envioSaldoParcial.toasts.erroAlternar', e);
    }
  };

  const executarAgora = async (ag: AgendamentoSaldoParcial) => {
    try {
      await executar.mutateAsync(ag.id);
      toast({ title: t('envioSaldoParcial.toasts.execucaoIniciada') });
    } catch (e) {
      avisarErro('envioSaldoParcial.toasts.execucaoErro', e);
    }
  };

  const excluirAgendamento = async (ag: AgendamentoSaldoParcial) => {
    try {
      await excluir.mutateAsync(ag.id);
      toast({ title: t('envioSaldoParcial.toasts.excluido') });
    } catch (e) {
      avisarErro('envioSaldoParcial.toasts.erroExcluir', e);
    }
  };

  const jaReceberam = executando
    ? receberamHoje(
        (executando.empresas ?? []).map((e) => e.empresa_id),
        execucoes
      ).map(nomeDaEmpresa)
    : [];

  const agendamentosConteudo = () => {
    if (erroAgendamentos)
      return (
        <div className="space-y-3">
          <Callout tom="danger" titulo={s('erro')}>
            {t('fase3Comum.verifiqueConexao')}
          </Callout>
          <Button onClick={() => refetch?.()}>{t('fase3Comum.tentarNovamente')}</Button>
        </div>
      );
    if (carregandoAgendamentos)
      return (
        <div className="space-y-3" role="status" aria-label={s('carregando')}>
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-ds-bg-surface" />
          ))}
        </div>
      );
    if (ordenados.length === 0)
      return (
        <div className="rounded-xl border border-ds-border bg-ds-bg-surface">
          <EmptyState
            icone={<CalendarClock />}
            titulo={s('vazio.titulo')}
            descricao={s('vazio.descricao')}
            acao={
              podeEditar ? (
                <Button variante="primario" onClick={() => onEditar(null)}>
                  <Plus /> {t('envioSaldoParcial.novoAgendamento')}
                </Button>
              ) : undefined
            }
          />
        </div>
      );
    return (
      <ul className="space-y-3" aria-label={s('abas.agendamentos')}>
        {ordenados.map(({ agendamento, proximoEnvio }) => (
          <CartaoAgendamento
            key={agendamento.id}
            agendamento={agendamento}
            proximoEnvio={proximoEnvio}
            semContato={
              (agendamento.empresas ?? []).filter((e) => semContato.has(e.empresa_id)).length
            }
            agendadorDesligado={agendadorDesligado}
            podeEditar={podeEditar}
            podeExecutar={apiOnline}
            onAtivo={() =>
              agendamento.ativo ? setDesativando(agendamento) : mudarAtivo(agendamento, true)
            }
            onEditar={() => onEditar(agendamento)}
            onExecutar={() => setExecutando(agendamento)}
            onExcluir={() => setExcluindo(agendamento)}
          />
        ))}
      </ul>
    );
  };

  return (
    <DsPage className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Indicador
          rotulo={s('indicadores.ativos')}
          valor={totais.ativos}
          icone={<CalendarClock />}
        />
        <Indicador
          rotulo={s('indicadores.empresas')}
          valor={totais.empresas}
          icone={<Building2 />}
          atrasoMs={60}
        />
        <Indicador
          rotulo={s('indicadores.enviados')}
          valor={totais.enviados}
          icone={<Send />}
          tom="success"
          atrasoMs={120}
          onClick={() => setSecao('historico')}
        />
        <Indicador
          rotulo={s('indicadores.falhas')}
          valor={totais.falhas}
          icone={<AlertTriangle />}
          tom="warning"
          atrasoMs={180}
          onClick={() => setSecao('historico')}
        />
      </div>

      {renderImagemConfigurado === false && (
        <Callout tom="danger" titulo={s('servico.semImagem')}>
          {s('servico.semImagemTexto')}
        </Callout>
      )}
      {agendadorDesligado ? (
        <Callout tom="danger" titulo={s('servico.desligado')}>
          {s('servico.desligadoTexto')}
        </Callout>
      ) : (
        agendadorAtivo && (
          <p className="flex items-center gap-2 text-xs text-ds-fg-muted">
            <span className="h-2 w-2 rounded-full bg-ds-success-fg" aria-hidden />
            {s('servico.ligado')}
          </p>
        )
      )}

      <div className="relative flex flex-wrap items-center justify-center gap-3">
        <SegmentedTabs
          rotulo={s('abas.rotulo')}
          itens={[
            {
              valor: 'agendamentos',
              rotulo: s('abas.agendamentos'),
              contador: agendamentos.length,
            },
            { valor: 'historico', rotulo: s('abas.historico') },
            { valor: 'sem', rotulo: s('abas.sem'), contador: semAgendamento.length },
          ]}
          valor={secao}
          onChange={(v) => setSecao(v as Secao)}
        />
        <div className="sm:absolute sm:right-0">
          <MenuExportar
            variante="secundario"
            descricao={s('exportar.descricao')}
            onExportar={(formato) =>
              exportarTabela(
                exportacaoSaldoParcial(ordenados, execucoes, nomeDaEmpresa, t),
                formato
              )
            }
          />
        </div>
      </div>

      {secao === 'historico' ? (
        <HistoricoEnvios execucoes={execucoes} carregando={carregandoExecucoes} />
      ) : secao === 'sem' ? (
        <div className="space-y-3">
          <Callout tom="warning">{s('sem.aviso')}</Callout>
          {semAgendamento.length === 0 ? (
            <div className="rounded-xl border border-ds-border bg-ds-bg-surface">
              <EmptyState icone={<Building2 />} titulo={s('sem.vazio')} />
            </div>
          ) : (
            <ul
              aria-label={s('abas.sem')}
              className="divide-y divide-ds-border overflow-hidden rounded-xl border border-ds-border bg-ds-bg-surface"
            >
              {semAgendamento.map((e) => (
                <li key={e.id} className="px-4 py-3">
                  <span className="font-medium">{e.nome}</span>
                  <span className="block text-xs text-ds-fg-muted">
                    {e.qtdContatosSaldoParcial ? (
                      plural(t, 'rotinasSaldoParcial.sem.contatos', e.qtdContatosSaldoParcial)
                    ) : (
                      <span className="text-ds-warning-fg">{s('sem.semContato')}</span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : (
        agendamentosConteudo()
      )}

      <ConfirmDialog
        aberto={!!executando}
        onOpenChange={(v) => !v && setExecutando(null)}
        titulo={s('executar.titulo', { nome: executando?.nome ?? '' })}
        descricao={
          executando
            ? plural(t, 'rotinasSaldoParcial.executar.empresas', executando.empresas?.length ?? 0)
            : undefined
        }
        consequencias={[
          ...(jaReceberam.length
            ? [
                plural(t, 'rotinasSaldoParcial.executar.recebeuHoje', jaReceberam.length, {
                  empresas: jaReceberam.join(', '),
                }),
              ]
            : []),
          s('executar.semContato'),
          s('executar.historico'),
        ]}
        rotuloConfirmar={s('executar.confirmar')}
        processando={processando}
        onConfirmar={() =>
          confirmar(
            () => executarAgora(executando!),
            () => setExecutando(null)
          )
        }
      />
      <ConfirmDialog
        aberto={!!desativando}
        onOpenChange={(v) => !v && setDesativando(null)}
        titulo={s('desativar.titulo', { nome: desativando?.nome ?? '' })}
        consequencias={[s('desativar.deixam'), s('desativar.manual')]}
        rotuloConfirmar={s('desativar.confirmar')}
        tom="perigo"
        processando={processando}
        onConfirmar={() =>
          confirmar(
            () => mudarAtivo(desativando!, false),
            () => setDesativando(null)
          )
        }
      />
      <ConfirmDialog
        aberto={!!excluindo}
        onOpenChange={(v) => !v && setExcluindo(null)}
        titulo={s('excluir.titulo', { nome: excluindo?.nome ?? '' })}
        consequencias={[s('excluir.semAgendamento'), s('excluir.historico')]}
        rotuloConfirmar={s('excluir.confirmar')}
        tom="perigo"
        processando={processando}
        onConfirmar={() =>
          confirmar(
            () => excluirAgendamento(excluindo!),
            () => setExcluindo(null)
          )
        }
      />
    </DsPage>
  );
}
