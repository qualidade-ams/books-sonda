// Tela Controle de Banco de Horas, nova (Especificação v2.0, seção 5.6): um banco por vez, cada um
// com o seu período de apuração. O mês aberto é calculado na hora; os fechados vêm congelados e os
// futuros do período são projetados (decisão de 23/10/2026). Empresa ainda no cálculo atual
// aparece em modo sombra, só para conferir.
import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import AdminLayout from '@/components/admin/LayoutAdmin';
import { DsPage } from '@/components/ds/DsPage';
import { FaixaPagina } from '@/components/ds/FaixaPagina';
import { SegmentedTabs } from '@/components/ds/SegmentedTabs';
import { Select } from '@/components/ds/Select';
import { Callout } from '@/components/ds/Callout';
import { EmptyState } from '@/components/ds/EmptyState';
import { TituloFaixa } from '@/components/ds/Formulario';
import { atraso } from '@/components/ds/Visual';
import { ListaBancosControle } from '@/components/admin/controle/ListaBancosControle';
import { NavegadorPeriodo } from '@/components/admin/controle/NavegadorPeriodo';
import { IndicadoresControle } from '@/components/admin/controle/IndicadoresControle';
import { QuadroControle } from '@/components/admin/controle/QuadroControle';
import { usePeriodoTexto } from '@/components/admin/empresas/periodoTexto';
import {
  useControleBancos,
  useControleEmpresas,
  useQuadroControle,
} from '@/hooks/useControleBancoHoras';
import { mesAtual, periodosDoBanco } from '@/services/bancosHoras/periodos';
import { mesesComSituacao, resultadoDoBanco, rotuloPeriodoLocal } from '@/utils/controleTela';
import { cn } from '@/lib/utils';

export default function ControleBancosHoras() {
  const { t, i18n } = useTranslation();
  const c = (chave: string, valores?: Record<string, unknown>) =>
    t(`controleBancoHoras.${chave}`, valores);
  const periodoTexto = usePeriodoTexto();
  const [parametros, setParametros] = useSearchParams();
  const hoje = useMemo(() => mesAtual(), []);

  const { empresas, isLoading: carregandoEmpresas, error: erroEmpresas } = useControleEmpresas();
  const empresaId = parametros.get('empresa') ?? empresas[0]?.id;
  const empresa = empresas.find((e) => e.id === empresaId);
  const {
    bancos: todos,
    isLoading: carregandoBancos,
    error: erroBancos,
  } = useControleBancos(empresaId);
  const bancos = useMemo(
    () => todos.filter((b) => b.ativo).sort((a, b) => a.ordem - b.ordem),
    [todos]
  );
  const banco = bancos.find((b) => b.bancoId === parametros.get('banco')) ?? bancos[0];

  // Período escolhido por banco (cada banco tem a sua periodicidade); sem escolha, o atual
  const [periodoPorBanco, setPeriodoPorBanco] = useState<Record<string, number>>({});
  const periodos = useMemo(() => (banco ? periodosDoBanco(banco, hoje) : []), [banco, hoje]);
  const indice = banco ? (periodoPorBanco[banco.bancoId] ?? periodos.length - 1) : 0;
  const meses = periodos[indice]?.meses ?? [];
  const rotuloPeriodo = meses.length ? rotuloPeriodoLocal(meses, i18n.language) : '';

  const {
    quadro,
    isLoading: carregandoQuadro,
    error: erroQuadro,
  } = useQuadroControle(empresaId, meses);
  const { quadro: quadroAtual } = useQuadroControle(empresaId, [hoje]);
  const mesesDoQuadro = banco ? mesesComSituacao(meses, quadro, banco.bancoId, hoje) : [];
  const resultadosAtuais = Object.fromEntries(
    bancos.map((b) => [b.bancoId, resultadoDoBanco(quadroAtual, hoje, b.bancoId)])
  );

  // Empresa ainda no cálculo atual: o novo aparece só para conferir, sem editar
  const sombra = !!empresa && empresa.modelo !== 'liberada';
  const erro = erroEmpresas || erroBancos || erroQuadro;
  const [secao, setSecao] = useState('quadro');

  const avisoSombra =
    sombra && empresa ? (
      <div className="mt-6">
        <Callout tom="warning" titulo={c('legado.titulo', { empresa: empresa.nome })}>
          {c('legado.texto')}
        </Callout>
      </div>
    ) : null;

  const escolher = (mudanca: Record<string, string | null>) => {
    const novo = new URLSearchParams(parametros);
    for (const [k, v] of Object.entries(mudanca)) {
      if (v === null) novo.delete(k);
      else novo.set(k, v);
    }
    setParametros(novo, { replace: true });
  };

  const corpo = () => {
    if (erro)
      return (
        <div className="mt-6">
          <Callout tom="danger" titulo={c('erro')}>
            {t('fase3Comum.verifiqueConexao')}
          </Callout>
        </div>
      );
    if (carregandoEmpresas || carregandoBancos)
      return (
        <div
          className="relative -mt-16 grid grid-cols-2 gap-3 md:-mt-20 lg:grid-cols-4"
          role="status"
          aria-label={c('carregando')}
        >
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-[116px] animate-pulse rounded-xl border border-ds-border bg-ds-bg-surface"
            />
          ))}
        </div>
      );
    if (!banco)
      return (
        <>
          <div className="ds-surgir relative -mt-16 rounded-xl border border-ds-border bg-ds-bg-surface shadow-[0_8px_24px_-12px_rgba(0,0,0,0.2)] md:-mt-20">
            <EmptyState
              icone={<Clock />}
              titulo={empresas.length ? c('vazioTitulo') : c('semEmpresas')}
              descricao={empresas.length ? c('vazioDescricao') : undefined}
            />
          </div>
          {avisoSombra}
        </>
      );

    return (
      <>
        <div key={banco.bancoId + rotuloPeriodo}>
          <IndicadoresControle banco={banco} meses={mesesDoQuadro} />
        </div>
        {avisoSombra}

        <div className="mt-6 grid gap-6 xl:grid-cols-[260px_minmax(0,1fr)]">
          <section aria-labelledby="titulo-bancos" className="space-y-3">
            <div className="flex h-[54px] items-center">
              <h2 id="titulo-bancos" className="text-sm font-medium text-ds-fg">
                {c('bancos.titulo')}{' '}
                <span className="font-normal text-ds-fg-muted">· {bancos.length}</span>
              </h2>
            </div>
            <ListaBancosControle
              bancos={bancos}
              resultados={resultadosAtuais}
              mes={hoje}
              selecionado={banco.bancoId}
              onSelecionar={(id) => escolher({ banco: id })}
            />
          </section>

          <section aria-labelledby="titulo-banco" className="min-w-0 space-y-4">
            <div className="sticky top-0 z-[5] -mx-1 bg-ds-bg-page px-1 py-1.5">
              <div className="flex flex-wrap items-center justify-between gap-x-5 gap-y-2">
                <div className="min-w-0">
                  <h2
                    key={banco.bancoId}
                    id="titulo-banco"
                    className="ds-surgir font-ds-title text-xl font-semibold tracking-tight text-ds-fg"
                  >
                    {banco.nome}
                  </h2>
                  <p className="truncate text-xs text-ds-fg-muted">
                    {c(`tipoBanco.${banco.tipoContrato}`)}
                  </p>
                </div>
                <SegmentedTabs
                  rotulo={c('secoes.rotulo')}
                  itens={[{ valor: 'quadro', rotulo: c('secoes.quadro') }]}
                  valor={secao}
                  onChange={setSecao}
                />
              </div>
            </div>
            <NavegadorPeriodo
              rotulos={periodos.map((p) => rotuloPeriodoLocal(p.meses, i18n.language))}
              indice={indice}
              periodicidade={periodoTexto(banco.periodoApuracao)}
              onIndice={(i) => setPeriodoPorBanco((p) => ({ ...p, [banco.bancoId]: i }))}
            />
            <div key={`${banco.bancoId}-${indice}-${secao}`}>
              {carregandoQuadro ? (
                <div
                  className="h-96 animate-pulse rounded-xl bg-ds-bg-surface"
                  role="status"
                  aria-label={c('carregando')}
                />
              ) : (
                <QuadroControle
                  banco={banco}
                  meses={mesesDoQuadro}
                  rotuloPeriodo={rotuloPeriodo}
                  // O lançamento de reajuste entra na próxima parte da tela
                  podeEditar={false}
                  onReajuste={() => undefined}
                />
              )}
            </div>
          </section>
        </div>
      </>
    );
  };

  return (
    <AdminLayout>
      <div className="min-h-screen bg-ds-bg-page">
        <DsPage className="px-4 py-4 md:px-6">
          <FaixaPagina>
            <div className="pb-24 pt-3 md:pb-28 md:pt-4">
              <div className="ds-surgir max-w-2xl">
                <TituloFaixa texto={c('titulo')} />
                <p className="mt-1.5 text-sm text-[#B1B1B1] md:text-[15px]">{c('subtitulo')}</p>
              </div>
              {empresas.length > 0 && (
                <div
                  className="ds-surgir relative mt-5 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center"
                  style={atraso(100)}
                >
                  <Select
                    variante="vidro"
                    aria-label={c('empresa')}
                    value={empresaId ?? ''}
                    onChange={(e) => escolher({ empresa: e.target.value, banco: null })}
                    className="w-full sm:w-64"
                  >
                    {empresas.map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.nome}
                      </option>
                    ))}
                  </Select>
                  {empresa && (
                    <span
                      className={cn(
                        'inline-flex h-7 items-center gap-1.5 self-start rounded-full border px-2.5 text-xs font-medium sm:self-auto',
                        sombra
                          ? 'border-[#F0A43A]/35 bg-[#F0A43A]/10 text-[#F0A43A]'
                          : 'border-[#4CC77A]/35 bg-[#4CC77A]/10 text-[#4CC77A]'
                      )}
                    >
                      {sombra ? (
                        <AlertTriangle className="h-3.5 w-3.5" />
                      ) : (
                        <CheckCircle2 className="h-3.5 w-3.5" />
                      )}
                      {c(`modelo.${empresa.modelo}`)}
                    </span>
                  )}
                </div>
              )}
            </div>
          </FaixaPagina>

          {corpo()}
        </DsPage>
      </div>
    </AdminLayout>
  );
}
