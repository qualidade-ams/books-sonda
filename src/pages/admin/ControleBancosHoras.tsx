// Tela Controle de Banco de Horas, nova (Especificação v2.0, seção 5.6): um banco por vez, cada um
// com o seu período de apuração. O mês aberto é calculado na hora; os fechados vêm congelados e os
// futuros do período são projetados (decisão de 23/10/2026). Empresa ainda no cálculo atual
// aparece em modo sombra, só para conferir.
import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, CheckCircle2, Clock, Send } from 'lucide-react';
import AdminLayout from '@/components/admin/LayoutAdmin';
import { DsPage } from '@/components/ds/DsPage';
import { FaixaPagina } from '@/components/ds/FaixaPagina';
import { SegmentedTabs } from '@/components/ds/SegmentedTabs';
import { Select } from '@/components/ds/Select';
import { Callout } from '@/components/ds/Callout';
import { EmptyState } from '@/components/ds/EmptyState';
import { TituloFaixa } from '@/components/ds/Formulario';
import { atraso } from '@/components/ds/Visual';
import { DicasContext } from '@/components/ds/Dicas';
import { MenuExportar } from '@/components/ds/MenuExportar';
import { ListaBancosControle } from '@/components/admin/controle/ListaBancosControle';
import { NavegadorPeriodo } from '@/components/admin/controle/NavegadorPeriodo';
import { IndicadoresControle } from '@/components/admin/controle/IndicadoresControle';
import { QuadroControle } from '@/components/admin/controle/QuadroControle';
import { AbaReajustes } from '@/components/admin/controle/AbaReajustes';
import { LancarReajuste } from '@/components/admin/controle/LancarReajuste';
import { AbaObservacoes } from '@/components/admin/controle/AbaObservacoes';
import { AbaHistorico } from '@/components/admin/controle/AbaHistorico';
import {
  AbaRequerimentos,
  BarraAjustesRequerimentos,
} from '@/components/admin/controle/AbaRequerimentos';
import { usePeriodoTexto } from '@/components/admin/empresas/periodoTexto';
import {
  useBuscarQuadro,
  useControleBancos,
  useControleEmpresas,
  useLancamentosControle,
  useRequerimentosControle,
  useHistoricoControle,
  useQuadroControle,
  useSaldoParcialControle,
} from '@/hooks/useControleBancoHoras';
import { usePermissions } from '@/hooks/usePermissions';
import { useEmailsClientesPorFinalidade } from '@/hooks/useClientes';
import { FINALIDADES_SALDO_PARCIAL } from '@/types/clientBooksTypes';
import { EnviarSaldoParcial } from '@/components/admin/controle/EnviarSaldoParcial';
import { botaoVidro } from '@/components/ds/estilos';
import { mesAtual, periodosDoBanco } from '@/services/bancosHoras/periodos';
import type { MesAno } from '@/services/bancosHoras/calculo';
import { exportarTabela, type FormatoExportacao } from '@/utils/exportarTabela';
import {
  ajustesDosRequerimentos,
  exportacaoControle,
  mesesComSituacao,
  resultadoDoBanco,
  rotuloPeriodoLocal,
} from '@/utils/controleTela';
import { cn } from '@/lib/utils';

// Rótulo do campo → chave da dica (controleBancoHoras.dicas.*)
const DICAS: [string, string][] = [
  ['controleBancoHoras.lancar.mes', 'mes'],
  ['controleBancoHoras.lancar.efeito', 'efeito'],
  ['controleBancoHoras.lancar.horas', 'horas'],
  ['controleBancoHoras.lancar.tickets', 'tickets'],
  ['controleBancoHoras.lancar.motivo', 'motivo'],
  ['controleBancoHoras.lancar.anotacao', 'anotacao'],
];

export default function ControleBancosHoras() {
  const { t, i18n } = useTranslation();
  const c = (chave: string, valores?: Record<string, unknown>) =>
    t(`controleBancoHoras.${chave}`, valores);
  const periodoTexto = usePeriodoTexto();
  const { hasPermission } = usePermissions();
  const dicas = useMemo(
    () =>
      Object.fromEntries(
        DICAS.map(([rotulo, dica]) => [t(rotulo), t(`controleBancoHoras.dicas.${dica}`)])
      ),
    [t]
  );
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
  const buscarQuadro = useBuscarQuadro(empresaId);
  // Todos os bancos, cada um no período escolhido nele (sem escolha, o atual)
  const exportar = async (formato: FormatoExportacao) => {
    const abas = [];
    for (const b of bancos) {
      const doBanco = periodosDoBanco(b, hoje);
      const mesesDoBanco = doBanco[periodoPorBanco[b.bancoId] ?? doBanco.length - 1]?.meses ?? [];
      const quadroDoBanco = await buscarQuadro(mesesDoBanco);
      abas.push({
        banco: b,
        meses: mesesComSituacao(mesesDoBanco, quadroDoBanco, b.bancoId, hoje),
      });
    }
    await exportarTabela(exportacaoControle(empresa?.nome ?? '', abas, t, i18n.language), formato);
  };
  const mesesDoQuadro = banco ? mesesComSituacao(meses, quadro, banco.bancoId, hoje) : [];
  const resultadosAtuais = Object.fromEntries(
    bancos.map((b) => [b.bancoId, resultadoDoBanco(quadroAtual, hoje, b.bancoId)])
  );

  // Empresa ainda no cálculo atual: o novo aparece só para conferir, sem editar
  const sombra = !!empresa && empresa.modelo !== 'liberada';
  const podeEditar = hasPermission('bancos_horas_controle', 'edit') && !sombra;
  const erro = erroEmpresas || erroBancos || erroQuadro;
  const [secao, setSecao] = useState('quadro');
  // Nível a mais na tela: lançamento de reajuste, no mês do quadro ou no de referência
  const [lancando, setLancando] = useState<{ mes?: MesAno } | null>(null);
  const lancamentos = useLancamentosControle(banco?.bancoId, meses);
  const reqs = useRequerimentosControle(empresaId, meses);
  // Até 500 alterações: só busca com a aba aberta
  const historico = useHistoricoControle(secao === 'historico' ? banco?.bancoId : undefined);
  // Outro nível: envio do Saldo Parcial da empresa (todos os bancos que o cliente vê)
  const [enviandoSaldo, setEnviandoSaldo] = useState(false);
  const saldo = useSaldoParcialControle(empresaId, enviandoSaldo);
  const { emails: contatosSaldo } = useEmailsClientesPorFinalidade(
    enviandoSaldo ? empresaId : undefined,
    FINALIDADES_SALDO_PARCIAL
  );
  // O e-mail sai no idioma do template da empresa, não no da tela
  const tEmail = useMemo(() => i18n.getFixedT(saldo.idioma), [i18n, saldo.idioma]);
  // Trocas de banco dos requerimentos ainda não salvas; valem para a empresa e o período em que
  // foram feitas (trocar qualquer um dos dois descarta)
  const chaveRascunho = `${empresaId}|${rotuloPeriodo}`;
  const [rascunho, setRascunho] = useState<{ chave: string; escolhas: Record<string, string> }>({
    chave: '',
    escolhas: {},
  });
  const escolhas = rascunho.chave === chaveRascunho ? rascunho.escolhas : {};
  const ajustes = podeEditar ? ajustesDosRequerimentos(reqs.requerimentos, escolhas) : [];
  const descartarAjustes = () => setRascunho({ chave: '', escolhas: {} });

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
          className="relative !-mt-16 grid grid-cols-2 gap-3 md:!-mt-20 lg:grid-cols-4"
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
          <div className="ds-surgir relative !-mt-16 rounded-xl border border-ds-border bg-ds-bg-surface shadow-[0_8px_24px_-12px_rgba(0,0,0,0.2)] md:!-mt-20">
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
                  itens={[
                    { valor: 'quadro', rotulo: c('secoes.quadro') },
                    {
                      valor: 'requerimentos',
                      rotulo: c('secoes.requerimentos'),
                      contador: reqs.requerimentos.filter((r) => r.bancoId === banco.bancoId)
                        .length,
                    },
                    { valor: 'reajustes', rotulo: c('secoes.reajustes') },
                    { valor: 'observacoes', rotulo: c('secoes.observacoes') },
                    { valor: 'historico', rotulo: c('secoes.historico') },
                  ]}
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
              {secao === 'reajustes' ? (
                <AbaReajustes
                  reajustes={lancamentos.reajustes}
                  tipoContrato={banco.tipoContrato}
                  carregando={lancamentos.isLoading}
                  erro={lancamentos.error}
                  podeEditar={podeEditar}
                  mesesFechados={mesesDoQuadro
                    .filter((m) => m.situacao === 'fechado')
                    .map((m) => m.chave)}
                  onLancar={() => setLancando({})}
                  onInativar={async (r, motivo) => {
                    await lancamentos.inativarReajuste({ reajusteId: r.id, motivo });
                  }}
                  onTentarNovamente={() => void lancamentos.recarregar()}
                />
              ) : secao === 'requerimentos' ? (
                <AbaRequerimentos
                  requerimentos={reqs.requerimentos}
                  bancos={bancos}
                  bancoAtualId={banco.bancoId}
                  carregando={reqs.isLoading}
                  erro={reqs.error}
                  podeEditar={podeEditar}
                  escolhas={escolhas}
                  onEscolher={(id, bancoId) =>
                    setRascunho({ chave: chaveRascunho, escolhas: { ...escolhas, [id]: bancoId } })
                  }
                  onTentarNovamente={() => void reqs.recarregar()}
                />
              ) : secao === 'observacoes' ? (
                <AbaObservacoes
                  observacoes={lancamentos.observacoes}
                  meses={mesesDoQuadro}
                  carregando={lancamentos.isLoading}
                  erro={lancamentos.error}
                  podeEditar={podeEditar}
                  onSalvar={async (input) => {
                    await lancamentos.salvarObservacao({ ...input, bancoId: banco.bancoId });
                  }}
                  onExcluir={async (o) => {
                    await lancamentos.excluirObservacao(o.id);
                  }}
                  onTentarNovamente={() => void lancamentos.recarregar()}
                />
              ) : secao === 'historico' ? (
                <AbaHistorico
                  eventos={historico.eventos}
                  carregando={historico.isLoading}
                  erro={historico.error}
                  onTentarNovamente={() => void historico.recarregar()}
                />
              ) : carregandoQuadro ? (
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
                  podeEditar={podeEditar}
                  onReajuste={(mes) => setLancando({ mes })}
                />
              )}
            </div>
          </section>
        </div>
      </>
    );
  };

  if (enviandoSaldo && empresa)
    return (
      <AdminLayout>
        <div className="min-h-screen bg-ds-bg-page">
          <DsPage className="px-4 py-4 md:px-6">
            <EnviarSaldoParcial
              empresaNome={empresa.nome}
              bancos={saldo.bancos}
              idioma={saldo.idioma}
              tEmail={tEmail}
              carregando={saldo.isLoading}
              erro={saldo.error}
              destinatariosPadrao={contatosSaldo}
              onTentarNovamente={() => void saldo.recarregar()}
              onFechar={() => setEnviandoSaldo(false)}
              onEnviar={(dados) =>
                saldo.enviar({
                  ...dados,
                  empresaId: empresa.id,
                  empresaNome: empresa.nome,
                  bancos: saldo.bancos,
                  idioma: saldo.idioma,
                  t: tEmail,
                })
              }
            />
          </DsPage>
        </div>
      </AdminLayout>
    );

  if (lancando && banco)
    return (
      <AdminLayout>
        <DicasContext.Provider value={dicas}>
          <div className="min-h-screen bg-ds-bg-page">
            <DsPage className="px-4 py-4 md:px-6">
              <LancarReajuste
                banco={banco}
                meses={mesesDoQuadro}
                rotuloPeriodo={rotuloPeriodo}
                mesInicial={lancando.mes}
                onFechar={() => setLancando(null)}
                onLancar={async (input) => {
                  await lancamentos.lancarReajuste(input);
                }}
              />
            </DsPage>
          </div>
        </DicasContext.Provider>
      </AdminLayout>
    );

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
                  {bancos.length > 0 && (
                    <div className="flex flex-wrap gap-2 sm:ml-auto">
                      <MenuExportar
                        descricao={c('exportar.descricao')}
                        onExportar={exportar}
                        className="h-9 md:h-8"
                      />
                      {podeEditar && (
                        <button
                          type="button"
                          onClick={() => setEnviandoSaldo(true)}
                          className={cn(botaoVidro, 'h-9 md:h-8')}
                        >
                          <Send className="h-4 w-4" /> {c('enviarSaldo.botao')}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </FaixaPagina>

          {corpo()}
          {ajustes.length > 0 && (
            <BarraAjustesRequerimentos
              quantidade={ajustes.length}
              onDescartar={descartarAjustes}
              onSalvar={async (motivo) => {
                await reqs.salvarAjustes({ ajustes, motivo });
                descartarAjustes();
              }}
            />
          )}
        </DsPage>
      </div>
    </AdminLayout>
  );
}
