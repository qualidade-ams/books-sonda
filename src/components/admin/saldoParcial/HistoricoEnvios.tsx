// Histórico de envios do Saldo Parcial: agendados, "Executar agora" e o envio manual do Controle,
// com busca pela empresa e filtros de situação e origem.
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, Send } from 'lucide-react';
import { DataTable, type ColunaTabela } from '@/components/ds/DataTable';
import { StatusBadge } from '@/components/ds/StatusBadge';
import { EmptyState } from '@/components/ds/EmptyState';
import { Button } from '@/components/ds/Button';
import { BotaoLimparFiltros, FiltroMultiplo } from '@/components/ds/Filtros';
import { campo } from '@/components/ds/estilos';
import { cn } from '@/lib/utils';
import { origemDaExecucao } from '@/services/envioSaldoParcialService';
import {
  SEM_FILTRO_HISTORICO,
  filtrarHistorico,
  type FiltroHistorico,
} from '@/utils/saldoParcialTela';
import type {
  ExecucaoSaldoParcial,
  OrigemEnvioSaldoParcial,
  StatusExecucaoSaldoParcial,
} from '@/types/envioSaldoParcial';
import { dataHoraBrasilia } from './formato';

const TOM_DA_SITUACAO: Record<
  StatusExecucaoSaldoParcial,
  'success' | 'danger' | 'info' | 'warning' | 'neutral'
> = {
  sucesso: 'success',
  erro: 'danger',
  executando: 'info',
  interrompida: 'warning',
  sem_destinatarios: 'warning',
  pulado: 'neutral',
};
const ORIGENS: OrigemEnvioSaldoParcial[] = ['agendamento', 'executar_agora', 'controle'];

export function HistoricoEnvios({
  execucoes,
  carregando,
}: {
  execucoes: ExecucaoSaldoParcial[];
  carregando: boolean;
}) {
  const { t, i18n } = useTranslation();
  const h = (chave: string, valores?: Record<string, unknown>) =>
    t(`rotinasSaldoParcial.historico.${chave}`, valores);
  const situacao = (s: string) => t(`rotinasSaldoParcial.situacoes.${s}`);
  const [filtro, setFiltro] = useState<FiltroHistorico>(SEM_FILTRO_HISTORICO);
  const linhas = filtrarHistorico(execucoes, filtro);
  const filtrando =
    !!filtro.busca.trim() || filtro.situacoes.length > 0 || filtro.origens.length > 0;
  const limpar = () => setFiltro(SEM_FILTRO_HISTORICO);

  const origem = (e: ExecucaoSaldoParcial) => {
    const tipo = origemDaExecucao(e);
    if (tipo === 'controle') return h('controle');
    const nome = e.agendamento?.nome ?? '—';
    return tipo === 'executar_agora' ? h('executadoAgora', { nome }) : nome;
  };

  const colunas: ColunaTabela<ExecucaoSaldoParcial>[] = [
    {
      id: 'quando',
      cabecalho: h('colunas.quando'),
      celula: (e) => (
        <span className="whitespace-nowrap tabular-nums">
          {dataHoraBrasilia(e.iniciado_em, i18n.language)}
        </span>
      ),
    },
    {
      id: 'empresa',
      cabecalho: h('colunas.empresa'),
      mobile: 'titulo',
      celula: (e) => <span className="font-medium">{e.empresa?.nome_abreviado ?? '—'}</span>,
    },
    {
      id: 'origem',
      cabecalho: h('colunas.origem'),
      celula: (e) => <span className="text-sm text-ds-fg-secondary">{origem(e)}</span>,
    },
    {
      id: 'situacao',
      cabecalho: h('colunas.situacao'),
      celula: (e) => (
        <span className="flex flex-col items-start gap-0.5">
          <StatusBadge tom={TOM_DA_SITUACAO[e.status] ?? 'neutral'}>
            {situacao(e.status)}
          </StatusBadge>
          {e.erro && (
            <span className="max-w-[18rem] break-words text-[11px] text-ds-fg-muted">{e.erro}</span>
          )}
        </span>
      ),
    },
    {
      id: 'destinatarios',
      cabecalho: h('colunas.destinatarios'),
      alinhar: 'direita',
      celula: (e) => <span className="tabular-nums">{e.qtd_destinatarios ?? '—'}</span>,
    },
    {
      id: 'emails',
      cabecalho: h('colunas.emails'),
      alinhar: 'direita',
      celula: (e) => <span className="tabular-nums">{e.qtd_emails ?? '—'}</span>,
    },
  ];

  return (
    <section className="overflow-hidden rounded-xl border border-ds-border bg-ds-bg-surface">
      <div className="flex flex-wrap items-center gap-2 border-b border-ds-border p-3 md:p-4">
        {filtrando && <BotaoLimparFiltros onClick={limpar} />}
        <label className="relative block min-w-0 flex-1 md:w-64 md:flex-none">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ds-fg-muted"
            aria-hidden
          />
          <input
            type="search"
            aria-label={h('buscar')}
            placeholder={h('buscar')}
            value={filtro.busca}
            onChange={(e) => setFiltro((f) => ({ ...f, busca: e.target.value }))}
            className={cn(campo, 'pl-9')}
          />
        </label>
        <FiltroMultiplo
          rotulo={h('situacao')}
          opcoes={(Object.keys(TOM_DA_SITUACAO) as StatusExecucaoSaldoParcial[]).map((s) => ({
            valor: s,
            rotulo: situacao(s),
          }))}
          selecionados={filtro.situacoes}
          onChange={(situacoes) => setFiltro((f) => ({ ...f, situacoes }))}
        />
        <FiltroMultiplo
          rotulo={h('origem')}
          opcoes={ORIGENS.map((o) => ({ valor: o, rotulo: h(`origens.${o}`) }))}
          selecionados={filtro.origens}
          onChange={(origens) => setFiltro((f) => ({ ...f, origens }))}
        />
      </div>
      <DataTable
        rotulo={h('lista')}
        colunas={colunas}
        linhas={linhas}
        chaveLinha={(e) => e.id}
        carregando={carregando}
        vazio={
          <EmptyState
            icone={<Send />}
            titulo={h('vazio')}
            acao={
              filtrando ? (
                <Button onClick={limpar}>{t('fase3Comum.limparFiltros')}</Button>
              ) : undefined
            }
          />
        }
      />
    </section>
  );
}
