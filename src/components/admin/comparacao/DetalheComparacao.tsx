// Detalhe de uma empresa na Comparação Legado x Novo (Fase 4): resumo da situação, mês a mês
// e as diferenças por chamado do mês escolhido. Validar e recalcular exigem Edição.
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshCw, ShieldCheck, Undo2 } from 'lucide-react';
import { TelaEdicao } from '@/components/ds/Formulario';
import { DataTable, type ColunaTabela } from '@/components/ds/DataTable';
import { HoursValue } from '@/components/ds/HoursValue';
import { StatusBadge } from '@/components/ds/StatusBadge';
import { Callout } from '@/components/ds/Callout';
import { Button } from '@/components/ds/Button';
import { ConfirmDialog } from '@/components/ds/ConfirmDialog';
import { MenuExportar } from '@/components/ds/MenuExportar';
import { useMesesComparacao } from '@/hooks/useComparacao';
import { formatarDataHora } from '@/hooks/useUltimaAlteracao';
import { rotuloMesLocal } from '@/utils/controleTela';
import { plural } from '@/utils/plural';
import { exportarTabela } from '@/utils/exportarTabela';
import { TOM_SITUACAO, exportacaoMesesComparacao, unidadesDosMeses } from '@/utils/comparacaoTela';
import type {
  ComparacaoEmpresa,
  DiferencaItem,
  MesComparacao,
  SituacaoMes,
} from '@/types/comparacao';

type Tom = 'success' | 'info' | 'danger' | 'neutral';

const TOM_MES: Record<SituacaoMes, Tom> = {
  igual: 'neutral',
  explicada: 'info',
  divergente: 'danger',
};

const chave = (m: MesComparacao) => `${m.mes.ano}-${m.mes.mes}`;

function Diferenca({ minutos }: { minutos: number }) {
  return (
    <HoursValue
      minutos={minutos}
      sinal="sempre"
      cor={minutos === 0 ? 'neutral' : 'danger'}
      className={minutos ? 'font-semibold' : 'text-ds-fg-muted'}
    />
  );
}

function LegadoNovo({ legado, novo, horas }: { legado: number; novo: number; horas: boolean }) {
  return (
    <span className="inline-flex gap-1.5 tabular-nums">
      {horas ? <HoursValue minutos={legado} cor="saldo" /> : legado}
      <span className="text-ds-fg-muted">/</span>
      {horas ? <HoursValue minutos={novo} cor="saldo" /> : novo}
    </span>
  );
}

export function DetalheComparacao({
  empresa,
  podeEditar,
  recalculando,
  onFechar,
  onValidar,
  onDesfazer,
  onRecalcular,
}: {
  empresa: ComparacaoEmpresa;
  podeEditar: boolean;
  recalculando: boolean;
  onFechar: () => void;
  onValidar: () => Promise<unknown>;
  onDesfazer: (motivo: string) => Promise<unknown>;
  onRecalcular: () => void;
}) {
  const { t, i18n } = useTranslation();
  const a = (chaveTexto: string, valores?: Record<string, unknown>) =>
    t(`comparacaoBancosHoras.${chaveTexto}`, valores);
  const { meses, isLoading, error, recarregar } = useMesesComparacao(empresa.empresaId);
  const [mesAberto, setMesAberto] = useState<string | null>(null);
  const [validando, setValidando] = useState(false);
  const [desfazendo, setDesfazendo] = useState(false);

  // Abre no mês mais recente com diferença
  useEffect(() => {
    const comDiferenca = [...meses].reverse().find((m) => m.situacao !== 'igual');
    setMesAberto(comDiferenca ? chave(comDiferenca) : null);
  }, [meses]);

  const unidades = useMemo(() => unidadesDosMeses(meses), [meses]);
  const comHoras = unidades.includes('horas');
  const comTickets = unidades.includes('tickets');
  const umBanco = empresa.bancosAtivos <= 1;
  const mes = meses.find((m) => chave(m) === mesAberto);
  const divergentes = meses.filter((m) => m.situacao === 'divergente').length;
  const rotulo = (m: MesComparacao) => rotuloMesLocal(m.mes, i18n.language);

  const colunasMes: ColunaTabela<MesComparacao>[] = [
    {
      id: 'mes',
      cabecalho: a('colunasMes.mes'),
      mobile: 'titulo',
      celula: (m) =>
        m.situacao === 'igual' ? (
          <span className="font-medium tabular-nums">{rotulo(m)}</span>
        ) : (
          <button
            type="button"
            onClick={() => setMesAberto(chave(m))}
            aria-label={a('detalhe.verDiferencas', { mes: rotulo(m) })}
            className="font-medium tabular-nums text-ds-fg-accent underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-focus"
          >
            {rotulo(m)}
          </button>
        ),
    },
    ...(comHoras
      ? ([
          {
            id: 'legado',
            cabecalho: a('colunasMes.consumoLegado'),
            alinhar: 'direita',
            celula: (m) => <HoursValue minutos={m.legado.horas.consumo} />,
          },
          {
            id: 'novo',
            cabecalho: umBanco ? a('colunasMes.consumoNovo') : a('colunasMes.somaBancos'),
            alinhar: 'direita',
            celula: (m) => <HoursValue minutos={m.novo.horas.consumo} />,
          },
          {
            id: 'diferenca',
            cabecalho: a('colunasMes.diferenca'),
            alinhar: 'direita',
            celula: (m) => <Diferenca minutos={m.novo.horas.consumo - m.legado.horas.consumo} />,
          },
        ] as ColunaTabela<MesComparacao>[])
      : []),
    ...(comTickets
      ? ([
          {
            id: 'tickets',
            cabecalho: a('colunasMes.tickets'),
            alinhar: 'direita',
            celula: (m) => (
              <LegadoNovo
                legado={m.legado.tickets.consumo}
                novo={m.novo.tickets.consumo}
                horas={false}
              />
            ),
          },
        ] as ColunaTabela<MesComparacao>[])
      : []),
    ...(umBanco && comHoras
      ? ([
          {
            id: 'saldo',
            cabecalho: a('colunasMes.saldo'),
            alinhar: 'direita',
            mobile: 'detalhe',
            celula: (m) => (
              <LegadoNovo legado={m.legado.horas.saldo} novo={m.novo.horas.saldo} horas />
            ),
          },
          {
            id: 'repasse',
            cabecalho: a('colunasMes.repasse'),
            alinhar: 'direita',
            mobile: 'oculta',
            celula: (m) => (
              <LegadoNovo legado={m.legado.horas.repasse} novo={m.novo.horas.repasse} horas />
            ),
          },
        ] as ColunaTabela<MesComparacao>[])
      : []),
    ...(!umBanco
      ? ([
          {
            id: 'porBanco',
            cabecalho: a('colunasMes.porBanco'),
            mobile: 'detalhe',
            celula: (m) => (
              <span className="text-[13px] text-ds-fg-secondary">
                {m.novo.porBanco.map((b, i) => (
                  <span key={b.bancoId}>
                    {i > 0 && ' · '}
                    {b.nome} {comHoras ? <HoursValue minutos={b.minutos} /> : b.tickets}
                  </span>
                ))}
              </span>
            ),
          },
        ] as ColunaTabela<MesComparacao>[])
      : []),
    {
      id: 'situacao',
      cabecalho: t('fase3Comum.situacao'),
      celula: (m) => (
        <div className="flex flex-col items-start gap-0.5">
          <StatusBadge tom={TOM_MES[m.situacao]}>{a(`situacoesMes.${m.situacao}`)}</StatusBadge>
          {m.origemSaldo && (
            <span className="text-xs text-ds-fg-muted">
              {a('detalhe.origemSaldo', { mes: rotuloMesLocal(m.origemSaldo, i18n.language) })}
            </span>
          )}
        </div>
      ),
    },
  ];

  const quantidade = (minutos: number | null, tickets: number | null) =>
    minutos !== null ? (
      <HoursValue minutos={minutos} />
    ) : tickets !== null ? (
      <span className="tabular-nums">{tickets}</span>
    ) : (
      <span className="text-ds-fg-muted">—</span>
    );

  const colunasItem: ColunaTabela<DiferencaItem>[] = [
    {
      id: 'chamado',
      cabecalho: a('colunasItem.chamado'),
      mobile: 'titulo',
      celula: (i) => <span className="font-medium">{i.chamado ?? '—'}</span>,
    },
    {
      id: 'data',
      cabecalho: a('colunasItem.data'),
      celula: (i) => (
        <span className="tabular-nums">
          {i.data ? formatarDataHora(i.data, i18n.language) : '—'}
        </span>
      ),
    },
    {
      id: 'grupo',
      cabecalho: a('colunasItem.grupo'),
      mobile: 'detalhe',
      celula: (i) => <span className="font-ds-mono text-[13px]">{i.grupo ?? '—'}</span>,
    },
    {
      id: 'legado',
      cabecalho: a('colunasItem.legado'),
      alinhar: 'direita',
      celula: (i) => quantidade(i.minutosLegado, i.ticketsLegado),
    },
    {
      id: 'novo',
      cabecalho: a('colunasItem.novo'),
      alinhar: 'direita',
      celula: (i) => quantidade(i.minutosNovo, i.ticketsNovo),
    },
    {
      id: 'motivo',
      cabecalho: a('colunasItem.motivo'),
      celula: (i) => (
        <div className="flex flex-col items-start gap-1">
          <StatusBadge tom={i.explicado ? 'info' : 'danger'}>
            {i.explicado ? a('explicado') : a('semExplicacao')}
          </StatusBadge>
          <span className="text-[13px] text-ds-fg-secondary">{a(`motivos.${i.motivo}`)}</span>
        </div>
      ),
    },
  ];

  const resumo = () => {
    if (!empresa.situacao) return null;
    const texto =
      empresa.situacao === 'divergente'
        ? plural(t, 'comparacaoBancosHoras.resumo.divergente', divergentes)
        : a(`resumo.${empresa.situacao}`);
    return (
      <Callout tom={TOM_SITUACAO[empresa.situacao]} titulo={a(`situacoes.${empresa.situacao}`)}>
        {texto}
        {empresa.validacao && (
          <>
            {' '}
            {empresa.validacao.por
              ? a('validadaPor', {
                  nome: empresa.validacao.por,
                  data: formatarDataHora(empresa.validacao.em, i18n.language),
                })
              : a('validadaEm', { data: formatarDataHora(empresa.validacao.em, i18n.language) })}
          </>
        )}
      </Callout>
    );
  };

  const subtitulo = [
    plural(t, 'fase3Comum.bancosAtivos', empresa.bancosAtivos),
    plural(t, 'comparacaoBancosHoras.detalhe.meses', empresa.mesesComparados),
    empresa.calculadoEm
      ? a('detalhe.atualizado', { data: formatarDataHora(empresa.calculadoEm, i18n.language) })
      : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <>
      <TelaEdicao
        voltarPara={a('titulo')}
        titulo={empresa.empresa}
        subtitulo={subtitulo}
        onFechar={onFechar}
      >
        <div className="space-y-4 border-b border-ds-border px-4 py-5 md:px-6">
          {resumo()}
          {empresa.erro && (
            <Callout tom="warning">{a('erroRotina', { erro: empresa.erro })}</Callout>
          )}
          <div className="flex flex-wrap gap-2">
            {podeEditar && (
              <>
                <Button onClick={onRecalcular} disabled={recalculando}>
                  <RefreshCw className={recalculando ? 'animate-spin' : undefined} />
                  {recalculando ? a('acoes.recalculando') : a('acoes.recalcular')}
                </Button>
                {empresa.validacao ? (
                  <Button onClick={() => setDesfazendo(true)}>
                    <Undo2 /> {a('acoes.desfazer')}
                  </Button>
                ) : (
                  <Button
                    variante="primario"
                    disabled={!empresa.situacao || empresa.situacao === 'divergente'}
                    onClick={() => setValidando(true)}
                  >
                    <ShieldCheck /> {a('acoes.validar')}
                  </Button>
                )}
              </>
            )}
            <MenuExportar
              variante="secundario"
              descricao={a('exportar.descricaoEmpresa', { empresa: empresa.empresa })}
              onExportar={(formato) =>
                exportarTabela(
                  exportacaoMesesComparacao(empresa.empresa, meses, t, i18n.language),
                  formato
                )
              }
            />
          </div>
        </div>

        <div className="space-y-3 px-4 py-5 md:px-6">
          <h3 className="text-xs font-bold uppercase tracking-[0.06em] text-ds-fg-secondary">
            {a('detalhe.mesAMes')}
          </h3>
          {error ? (
            <div className="space-y-3">
              <Callout tom="danger" titulo={a('detalhe.erro')}>
                {t('fase3Comum.verifiqueConexao')}
              </Callout>
              <Button onClick={() => recarregar()}>{t('fase3Comum.tentarNovamente')}</Button>
            </div>
          ) : (
            <DataTable
              rotulo={a('detalhe.mesAMes')}
              colunas={colunasMes}
              linhas={[...meses].reverse()}
              chaveLinha={chave}
              carregando={isLoading}
              linhaSelecionada={mesAberto ?? undefined}
              onLinhaClick={(m) => m.situacao !== 'igual' && setMesAberto(chave(m))}
            />
          )}
        </div>

        {mes && (
          <div className="space-y-3 border-t border-ds-border px-4 py-5 md:px-6">
            <h3 className="text-xs font-bold uppercase tracking-[0.06em] text-ds-fg-secondary">
              {a('detalhe.diferencasEm', { mes: rotulo(mes) })}
            </h3>
            {mes.itens.length === 0 ? (
              <p className="text-sm text-ds-fg-secondary">{a('detalhe.semItens')}</p>
            ) : (
              <>
                {mes.itensTotal > mes.itens.length && (
                  <p className="text-sm text-ds-fg-secondary">
                    {a('detalhe.mostrando', { n: mes.itens.length, total: mes.itensTotal })}
                  </p>
                )}
                <DataTable
                  rotulo={a('detalhe.diferencasEm', { mes: rotulo(mes) })}
                  colunas={colunasItem}
                  linhas={mes.itens}
                  chaveLinha={(i) => `${i.fonte}:${i.chave}`}
                />
              </>
            )}
          </div>
        )}
      </TelaEdicao>

      <ConfirmDialog
        aberto={validando}
        onOpenChange={setValidando}
        titulo={a('validar.titulo', { empresa: empresa.empresa })}
        descricao={a('validar.descricao')}
        consequencias={[a('validar.caiValidacao'), a('validar.clienteContinua')]}
        rotuloConfirmar={a('acoes.validar')}
        onConfirmar={async () => {
          try {
            await onValidar();
            setValidando(false);
          } catch {
            // O aviso do erro vem do hook; o diálogo fica aberto para tentar de novo
          }
        }}
      />
      <ConfirmDialog
        aberto={desfazendo}
        onOpenChange={setDesfazendo}
        titulo={a('desfazer.titulo', { empresa: empresa.empresa })}
        rotuloConfirmar={a('acoes.desfazer')}
        tom="perigo"
        justificativa={{ rotulo: a('desfazer.motivo'), placeholder: a('desfazer.placeholder') }}
        onConfirmar={async (motivo) => {
          try {
            await onDesfazer(motivo ?? '');
            setDesfazendo(false);
          } catch {
            // O aviso do erro vem do hook; o diálogo fica aberto para tentar de novo
          }
        }}
      />
    </>
  );
}
