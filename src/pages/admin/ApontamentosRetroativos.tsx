// Tela Apontamentos Retroativos, nova (Especificação v2.0, seção 5.8; Modelagem_Fase3.md, seção 8):
// o que chegou do Aranda depois do fechamento do mês, por banco. Aprovar não muda o mês na hora:
// o ajuste entra quando o Book do mês for retificado (D-09); nada é apagado.
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, CheckCircle2, Clock, Mail, Radar, Search, XCircle } from 'lucide-react';
import AdminLayout from '@/components/admin/LayoutAdmin';
import { DsPage } from '@/components/ds/DsPage';
import { FaixaPagina } from '@/components/ds/FaixaPagina';
import { BarraRodape, Indicador, TituloFaixa } from '@/components/ds/Formulario';
import { SegmentedTabs } from '@/components/ds/SegmentedTabs';
import { EmptyState } from '@/components/ds/EmptyState';
import { Callout } from '@/components/ds/Callout';
import { Button } from '@/components/ds/Button';
import { ConfirmDialog } from '@/components/ds/ConfirmDialog';
import { BotaoLimparFiltros, FiltroMultiplo } from '@/components/ds/Filtros';
import { formatarHoras } from '@/components/ds/horas';
import { campo } from '@/components/ds/estilos';
import { CartaoRetroativo } from '@/components/admin/retroativos/CartaoRetroativo';
import { PedirRegularizacao } from '@/components/admin/retroativos/PedirRegularizacao';
import { plural } from '@/utils/plural';
import { useEmailsConsultores, useRetroativos } from '@/hooks/useRetroativos';
import { usePermissions } from '@/hooks/usePermissions';
import { rotuloMesLocal } from '@/utils/controleTela';
import {
  SEM_FILTRO_RETROATIVOS,
  filtrarRetroativos,
  opcoesDosRetroativos,
  type FiltroRetroativos,
} from '@/utils/retroativosTela';
import { cn } from '@/lib/utils';
import type { Retroativo, SituacaoRetroativo } from '@/types/retroativos';

const SITUACOES: SituacaoRetroativo[] = ['pendente', 'aprovado', 'aplicado', 'descartado'];

export default function ApontamentosRetroativos() {
  const { t, i18n } = useTranslation();
  const a = (chave: string, valores?: Record<string, unknown>) =>
    t(`apontamentosRetroativos.${chave}`, valores);
  const { hasPermission } = usePermissions();
  const podeEditar = hasPermission('bancos_horas_retroativos', 'edit');
  const { retroativos, contagem, isLoading, error, recarregar, decidir, pedirRegularizacao } =
    useRetroativos();

  const [aba, setAba] = useState<SituacaoRetroativo>('pendente');
  const [filtro, setFiltro] = useState<FiltroRetroativos>(SEM_FILTRO_RETROATIVOS);
  const [abertos, setAbertos] = useState<string[]>([]);
  const [decisao, setDecisao] = useState<{
    retroativo: Retroativo;
    acao: 'aprovar' | 'descartar';
  } | null>(null);
  const [decidindo, setDecidindo] = useState(false);
  // Apontamentos marcados para pedir a regularização aos consultores (ids das linhas)
  const [selecionados, setSelecionados] = useState<string[]>([]);
  const [pedindo, setPedindo] = useState(false);
  const itensSelecionados = useMemo(
    () =>
      retroativos.flatMap((rt) =>
        rt.itens
          .filter((i) => selecionados.includes(i.id))
          .map((i) => ({
            id: i.id,
            retroativoId: rt.id,
            itemId: i.itemId,
            empresa: rt.empresa,
            chamado: i.chamado,
            tarefa: i.tarefa,
            consultor: i.consultor,
            minutos: i.minutos,
            mes: rt.mes,
          }))
      ),
    [retroativos, selecionados]
  );
  const consultores = useMemo(
    () => [...new Set(itensSelecionados.map((i) => i.consultor).filter(Boolean))] as string[],
    [itensSelecionados]
  );
  const emails = useEmailsConsultores(consultores, pedindo);

  const opcoes = opcoesDosRetroativos(retroativos);
  const visiveis = filtrarRetroativos(retroativos, aba, filtro);
  const filtrando =
    !!filtro.busca.trim() || filtro.empresas.length > 0 || filtro.consultores.length > 0;
  const limpar = () => setFiltro(SEM_FILTRO_RETROATIVOS);

  const confirmar = async (justificativa?: string) => {
    if (!decisao) return;
    setDecidindo(true);
    try {
      await decidir({
        retroativoId: decisao.retroativo.id,
        decisao: decisao.acao,
        justificativa: justificativa ?? '',
      });
      setDecisao(null);
    } catch {
      // O aviso do erro vem do hook; o diálogo fica aberto para tentar de novo
    } finally {
      setDecidindo(false);
    }
  };

  const indicadores: {
    situacao: SituacaoRetroativo;
    icone: React.ReactNode;
    tom?: 'warning' | 'success';
  }[] = [
    { situacao: 'pendente', icone: <AlertTriangle />, tom: 'warning' },
    { situacao: 'aprovado', icone: <Clock /> },
    { situacao: 'aplicado', icone: <CheckCircle2 />, tom: 'success' },
    { situacao: 'descartado', icone: <XCircle /> },
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
    if (isLoading)
      return (
        <div className="space-y-3" role="status" aria-label={a('carregando')}>
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-xl bg-ds-bg-surface" />
          ))}
        </div>
      );
    if (visiveis.length === 0)
      return (
        <div className="rounded-xl border border-ds-border bg-ds-bg-surface">
          <EmptyState
            icone={<CheckCircle2 />}
            titulo={
              filtrando
                ? a('vazio.filtro')
                : aba === 'pendente'
                  ? a('vazio.pendente')
                  : a('vazio.outros', { aba: a(`abas.${aba}`) })
            }
            descricao={!filtrando && aba === 'pendente' ? a('vazio.pendenteDescricao') : undefined}
            acao={
              filtrando ? (
                <Button onClick={limpar}>{t('fase3Comum.limparFiltros')}</Button>
              ) : undefined
            }
          />
        </div>
      );
    return (
      <ul className="space-y-3" aria-label={a('lista')}>
        {visiveis.map((r) => (
          <CartaoRetroativo
            key={r.id}
            retroativo={r}
            aberto={abertos.includes(r.id)}
            onAlternar={() =>
              setAbertos((l) => (l.includes(r.id) ? l.filter((x) => x !== r.id) : [...l, r.id]))
            }
            podeEditar={podeEditar}
            onAprovar={() => setDecisao({ retroativo: r, acao: 'aprovar' })}
            onDescartar={() => setDecisao({ retroativo: r, acao: 'descartar' })}
            selecionados={selecionados}
            onSelecionar={(ids, marcar) =>
              setSelecionados((s) =>
                marcar ? [...new Set([...s, ...ids])] : s.filter((x) => !ids.includes(x))
              )
            }
          />
        ))}
      </ul>
    );
  };

  const r = decisao?.retroativo;
  const mesDecisao = r ? rotuloMesLocal(r.mes, i18n.language) : '';

  if (pedindo)
    return (
      <AdminLayout>
        <div className="min-h-screen bg-ds-bg-page">
          <DsPage className="px-4 py-4 md:px-6">
            <PedirRegularizacao
              itens={itensSelecionados}
              emails={emails.emails}
              carregandoEmails={emails.isLoading}
              onFechar={() => setPedindo(false)}
              onEnviar={async (input) => {
                await pedirRegularizacao(input);
                setSelecionados([]);
              }}
            />
          </DsPage>
        </div>
      </AdminLayout>
    );

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
            </div>
          </FaixaPagina>

          <div className="relative !-mt-16 grid grid-cols-2 gap-3 md:!-mt-20 lg:grid-cols-4">
            {indicadores.map((ind, i) => (
              <Indicador
                key={ind.situacao}
                rotulo={a(`abas.${ind.situacao}`)}
                valor={contagem[ind.situacao]}
                icone={ind.icone}
                tom={ind.tom}
                atrasoMs={i * 60}
                selecionado={aba === ind.situacao}
                onClick={() => setAba(ind.situacao)}
              />
            ))}
          </div>

          <div className="mt-6 space-y-4">
            <Callout tom="info">
              <span className="flex flex-wrap items-center gap-x-1.5">
                <Radar className="h-4 w-4" aria-hidden />
                {a('deteccao')}
              </span>
            </Callout>

            <div className="sticky top-0 z-[5] -mx-1 flex justify-center bg-ds-bg-page px-1 py-1.5">
              <SegmentedTabs
                rotulo={a('abas.rotulo')}
                itens={SITUACOES.map((s) => ({
                  valor: s,
                  rotulo: a(`abas.${s}`),
                  contador: contagem[s],
                }))}
                valor={aba}
                onChange={(v) => setAba(v as SituacaoRetroativo)}
              />
            </div>

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
              <FiltroMultiplo
                rotulo={a('filtroEmpresa')}
                opcoes={opcoes.empresas}
                selecionados={filtro.empresas}
                onChange={(empresas) => setFiltro((f) => ({ ...f, empresas }))}
              />
              <FiltroMultiplo
                rotulo={a('filtroConsultor')}
                opcoes={opcoes.consultores.map((c) => ({ valor: c, rotulo: c }))}
                selecionados={filtro.consultores}
                onChange={(consultores) => setFiltro((f) => ({ ...f, consultores }))}
              />
            </div>

            {conteudo()}
          </div>

          {itensSelecionados.length > 0 && (
            <BarraRodape>
              <span className="text-sm font-medium text-ds-fg">
                {plural(
                  t,
                  'apontamentosRetroativos.selecao.selecionados',
                  itensSelecionados.length
                )}
              </span>
              <div className="flex gap-2">
                <Button onClick={() => setSelecionados([])}>{a('selecao.limpar')}</Button>
                <Button variante="primario" onClick={() => setPedindo(true)}>
                  <Mail /> {a('selecao.pedir')}
                </Button>
              </div>
            </BarraRodape>
          )}

          <ConfirmDialog
            aberto={!!decisao}
            onOpenChange={(v) => !v && setDecisao(null)}
            titulo={
              r
                ? a(
                    decisao.acao === 'aprovar'
                      ? 'decidir.aprovarTitulo'
                      : 'decidir.descartarTitulo',
                    {
                      empresa: r.empresa,
                      banco: r.banco,
                    }
                  )
                : ''
            }
            descricao={
              r
                ? a('decidir.descricao', {
                    mes: mesDecisao,
                    de: formatarHoras(r.consumoAntesMinutos),
                    para: formatarHoras(r.consumoDepoisMinutos),
                  })
                : undefined
            }
            consequencias={
              decisao?.acao === 'aprovar'
                ? [a('decidir.aprovarAguarda', { mes: mesDecisao }), a('decidir.aprovarRecalcula')]
                : [a('decidir.descartarNaoMuda'), a('decidir.descartarNaoVolta')]
            }
            rotuloConfirmar={a(decisao?.acao === 'aprovar' ? 'cartao.aprovar' : 'cartao.descartar')}
            tom={decisao?.acao === 'descartar' ? 'perigo' : 'padrao'}
            justificativa={{
              rotulo: a('decidir.justificativa'),
              placeholder: a(
                decisao?.acao === 'aprovar'
                  ? 'decidir.aprovarPlaceholder'
                  : 'decidir.descartarPlaceholder'
              ),
            }}
            processando={decidindo}
            onConfirmar={confirmar}
          />
        </DsPage>
      </div>
    </AdminLayout>
  );
}
