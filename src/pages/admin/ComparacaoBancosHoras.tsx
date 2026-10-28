// Tela Comparação Legado x Novo (Fase 4; Modelagem_Fase4.md, seção 9): o cálculo novo em
// sombra comparado com o que o cliente recebeu no Book. A rotina do sync-api grava os
// resultados; aqui a área confere, valida e pede o recálculo de uma empresa.
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, CheckCircle2, Info, Search, SearchX, ShieldCheck } from 'lucide-react';
import AdminLayout from '@/components/admin/LayoutAdmin';
import { DsPage } from '@/components/ds/DsPage';
import { FaixaPagina } from '@/components/ds/FaixaPagina';
import { Indicador, TituloFaixa } from '@/components/ds/Formulario';
import { DataTable, type ColunaTabela } from '@/components/ds/DataTable';
import { HoursValue } from '@/components/ds/HoursValue';
import { StatusBadge } from '@/components/ds/StatusBadge';
import { Callout } from '@/components/ds/Callout';
import { EmptyState } from '@/components/ds/EmptyState';
import { Button } from '@/components/ds/Button';
import { MenuExportar } from '@/components/ds/MenuExportar';
import { BotaoLimparFiltros } from '@/components/ds/Filtros';
import { campo } from '@/components/ds/estilos';
import { atraso } from '@/components/ds/Visual';
import { DetalheComparacao } from '@/components/admin/comparacao/DetalheComparacao';
import { useComparacao } from '@/hooks/useComparacao';
import { usePermissions } from '@/hooks/usePermissions';
import { formatarDataHora } from '@/hooks/useUltimaAlteracao';
import { plural } from '@/utils/plural';
import { exportarTabela } from '@/utils/exportarTabela';
import {
  TOM_SITUACAO,
  exportacaoComparacao,
  filtrarComparacoes,
  type FiltroComparacao,
} from '@/utils/comparacaoTela';
import { cn } from '@/lib/utils';
import type { ComparacaoEmpresa, GrupoComparacao } from '@/types/comparacao';

const SEM_FILTRO: FiltroComparacao = { busca: '', grupo: null };

export default function ComparacaoBancosHoras() {
  const { t, i18n } = useTranslation();
  const a = (chave: string, valores?: Record<string, unknown>) =>
    t(`comparacaoBancosHoras.${chave}`, valores);
  const { hasPermission } = usePermissions();
  const podeEditar = hasPermission('bancos_horas_comparacao', 'edit');
  const { empresas, contagem, isLoading, error, recarregar, validar, recalcular, recalculando } =
    useComparacao();

  const [filtro, setFiltro] = useState<FiltroComparacao>(SEM_FILTRO);
  const [abertaId, setAbertaId] = useState<string | null>(null);

  const visiveis = filtrarComparacoes(empresas, filtro);
  const filtrando = !!filtro.busca.trim() || !!filtro.grupo;
  const limpar = () => setFiltro(SEM_FILTRO);
  const aberta = empresas.find((e) => e.empresaId === abertaId);
  const ultimaRodada = empresas.reduce<string | null>(
    (ultima, e) => (e.calculadoEm && (!ultima || e.calculadoEm > ultima) ? e.calculadoEm : ultima),
    null
  );

  if (aberta)
    return (
      <AdminLayout>
        <div className="min-h-screen bg-ds-bg-page">
          <DsPage className="px-4 py-4 md:px-6">
            <DetalheComparacao
              empresa={aberta}
              podeEditar={podeEditar}
              recalculando={recalculando === aberta.empresaId}
              onFechar={() => setAbertaId(null)}
              onValidar={() => validar({ empresaId: aberta.empresaId, validar: true })}
              onDesfazer={(motivo) =>
                validar({ empresaId: aberta.empresaId, validar: false, motivo })
              }
              onRecalcular={() => recalcular(aberta.empresaId).catch(() => undefined)}
            />
          </DsPage>
        </div>
      </AdminLayout>
    );

  const colunas: ColunaTabela<ComparacaoEmpresa>[] = [
    {
      id: 'empresa',
      cabecalho: a('colunas.empresa'),
      mobile: 'titulo',
      celula: (e) => (
        <div>
          <button
            type="button"
            onClick={(evento) => {
              evento.stopPropagation();
              setAbertaId(e.empresaId);
            }}
            aria-label={a('ver', { empresa: e.empresa })}
            className="text-left font-medium hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-focus"
          >
            {e.empresa}
          </button>
          {e.validacao && (
            <div className="text-xs text-ds-fg-muted">
              {e.validacao.por
                ? a('validadaPor', {
                    nome: e.validacao.por,
                    data: formatarDataHora(e.validacao.em, i18n.language),
                  })
                : a('validadaEm', { data: formatarDataHora(e.validacao.em, i18n.language) })}
            </div>
          )}
          {e.erro && (
            <div className="text-xs text-ds-warning-fg">{a('erroRotina', { erro: e.erro })}</div>
          )}
        </div>
      ),
    },
    {
      id: 'bancos',
      cabecalho: a('colunas.bancos'),
      alinhar: 'direita',
      celula: (e) => e.bancosAtivos,
    },
    {
      id: 'meses',
      cabecalho: a('colunas.meses'),
      alinhar: 'direita',
      mobile: 'oculta',
      celula: (e) => e.mesesComparados,
    },
    {
      id: 'legado',
      cabecalho: a('colunas.consumoLegado'),
      alinhar: 'direita',
      celula: (e) => <HoursValue minutos={e.consumoLegadoMinutos} />,
    },
    {
      id: 'novo',
      cabecalho: a('colunas.consumoNovo'),
      alinhar: 'direita',
      celula: (e) => <HoursValue minutos={e.consumoNovoMinutos} />,
    },
    {
      id: 'diferenca',
      cabecalho: a('colunas.diferenca'),
      alinhar: 'direita',
      celula: (e) => {
        const diferenca = e.consumoNovoMinutos - e.consumoLegadoMinutos;
        return (
          <HoursValue
            minutos={diferenca}
            sinal="sempre"
            cor={diferenca === 0 ? 'neutral' : 'danger'}
            className={diferenca ? 'font-semibold' : 'text-ds-fg-muted'}
          />
        );
      },
    },
    {
      id: 'situacao',
      cabecalho: t('fase3Comum.situacao'),
      celula: (e) => (
        <div className="flex flex-wrap gap-1">
          {e.situacao ? (
            <StatusBadge tom={TOM_SITUACAO[e.situacao]}>{a(`situacoes.${e.situacao}`)}</StatusBadge>
          ) : (
            <StatusBadge tom="neutral">{a('semResultado')}</StatusBadge>
          )}
          {e.validacao && <StatusBadge tom="success">{a('validada')}</StatusBadge>}
        </div>
      ),
    },
  ];

  const indicadores: {
    grupo: GrupoComparacao;
    icone: React.ReactNode;
    tom?: 'success' | 'warning';
  }[] = [
    { grupo: 'conferem', icone: <CheckCircle2 /> },
    { grupo: 'explicada', icone: <Info /> },
    { grupo: 'divergente', icone: <AlertTriangle />, tom: 'warning' },
    { grupo: 'validada', icone: <ShieldCheck />, tom: 'success' },
  ];

  const conteudo = () => {
    if (error)
      return (
        <div className="space-y-3">
          <Callout tom="danger" titulo={a('erro')}>
            {t('fase3Comum.verifiqueConexao')}
          </Callout>
          <Button onClick={() => recarregar()}>{t('fase3Comum.tentarNovamente')}</Button>
        </div>
      );
    return (
      <DataTable
        rotulo={a('lista')}
        colunas={colunas}
        linhas={visiveis}
        chaveLinha={(e) => e.empresaId}
        carregando={isLoading}
        onLinhaClick={(e) => setAbertaId(e.empresaId)}
        vazio={
          <EmptyState
            icone={<SearchX />}
            titulo={filtrando ? a('vazio.filtro') : a('vazio.semDados')}
            descricao={filtrando ? undefined : a('vazio.semDadosDescricao')}
            acao={
              filtrando ? (
                <Button variante="fantasma" onClick={limpar}>
                  {t('fase3Comum.limparFiltros')}
                </Button>
              ) : undefined
            }
          />
        }
      />
    );
  };

  return (
    <AdminLayout>
      <div className="min-h-screen bg-ds-bg-page">
        <DsPage className="px-4 py-4 md:px-6">
          <FaixaPagina>
            <div className="pb-24 pt-3 md:pb-28 md:pt-4">
              <div className="ds-surgir max-w-2xl">
                <TituloFaixa texto={a('titulo')} />
                <p className="mt-1.5 text-sm text-[#B1B1B1] md:text-[15px]">{a('subtitulo')}</p>
              </div>
              <div
                className="ds-surgir mt-5 flex flex-wrap items-center gap-x-4 gap-y-2"
                style={atraso(100)}
              >
                <MenuExportar
                  descricao={plural(t, 'comparacaoBancosHoras.exportar.descricao', visiveis.length)}
                  onExportar={(formato) =>
                    exportarTabela(exportacaoComparacao(visiveis, t), formato)
                  }
                />
                <span className="text-xs text-[#B1B1B1]">
                  {ultimaRodada
                    ? a('atualizadoEm', { data: formatarDataHora(ultimaRodada, i18n.language) })
                    : a('semRodada')}
                </span>
              </div>
            </div>
          </FaixaPagina>

          <div className="relative !-mt-16 grid grid-cols-2 gap-3 md:!-mt-20 lg:grid-cols-4">
            {indicadores.map((ind, i) => (
              <Indicador
                key={ind.grupo}
                rotulo={a(`grupos.${ind.grupo}`)}
                valor={contagem[ind.grupo]}
                icone={ind.icone}
                tom={ind.tom}
                atrasoMs={i * 60}
                selecionado={filtro.grupo === ind.grupo}
                onClick={() =>
                  setFiltro((f) => ({ ...f, grupo: f.grupo === ind.grupo ? null : ind.grupo }))
                }
              />
            ))}
          </div>

          <div className="mt-6 space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              {filtrando && <BotaoLimparFiltros onClick={limpar} />}
              <label className="relative block min-w-0 flex-1 md:w-72 md:flex-none">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ds-fg-muted"
                  aria-hidden
                />
                <input
                  type="search"
                  aria-label={a('buscar')}
                  placeholder={a('buscar')}
                  value={filtro.busca}
                  onChange={(e) => setFiltro((f) => ({ ...f, busca: e.target.value }))}
                  className={cn(campo, 'pl-9')}
                />
              </label>
            </div>

            {conteudo()}

            <Callout tom="info">
              <strong>{a('criterio.umBanco')}</strong> {a('criterio.umBancoTexto')}{' '}
              <strong>{a('criterio.varios')}</strong> {a('criterio.variosTexto')}
            </Callout>
          </div>
        </DsPage>
      </div>
    </AdminLayout>
  );
}
