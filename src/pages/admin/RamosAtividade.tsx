// Tela Ramos de Atividade (Especificação v2.0, seção 5.3): lista usada no ramo de atividade e no
// ramo secundário das empresas. Incluir, renomear, reordenar, inativar e excluir ficam pendentes
// até Salvar, na barra do rodapé (decisão de 21/10/2026).
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, Building2, CircleSlash, ListTree, Plus, Search } from 'lucide-react';
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import AdminLayout from '@/components/admin/LayoutAdmin';
import { DsPage } from '@/components/ds/DsPage';
import { FaixaPagina } from '@/components/ds/FaixaPagina';
import { EmptyState } from '@/components/ds/EmptyState';
import { Callout } from '@/components/ds/Callout';
import { Button } from '@/components/ds/Button';
import { ConfirmDialog } from '@/components/ds/ConfirmDialog';
import { DicasContext } from '@/components/ds/Dicas';
import { BarraRodape, DicaDoRotulo, Indicador, TituloFaixa } from '@/components/ds/Formulario';
import { MenuExportar } from '@/components/ds/MenuExportar';
import { BotaoLimparFiltros, FiltroMultiplo } from '@/components/ds/Filtros';
import { atraso } from '@/components/ds/Visual';
import { campo } from '@/components/ds/estilos';
import { LinhaRamo } from '@/components/admin/ramos/LinhaRamo';
import { useRamosAtividade } from '@/hooks/useRamosAtividade';
import { usePermissions } from '@/hooks/usePermissions';
import { cn } from '@/lib/utils';
import { plural } from '@/utils/plural';
import { exportarTabela } from '@/utils/exportarTabela';
import {
  exportacaoRamos,
  filtrarRamos,
  mudancasRamos,
  nomeRepetido,
  novoRamo,
  paraRascunho,
  pendenciaDoRamo,
  totaisRamos,
  usoDoRamo,
  type RamoEdicao,
  type SituacaoRamo,
} from '@/utils/ramosTela';

const primeiraMaiuscula = (texto: string) => texto.replace(/^./, (c) => c.toUpperCase());

export default function RamosAtividade() {
  const { t } = useTranslation();
  const { hasPermission } = usePermissions();
  const podeEditar = hasPermission('ramos_atividade', 'edit');
  const {
    ramos: salvos,
    totalEmpresas,
    isLoading,
    error,
    recarregar,
    salvar,
    isSalvando,
  } = useRamosAtividade();

  /** Rascunho com as alterações pendentes; volta ao salvo quando a lista recarrega */
  const [rascunho, setRascunho] = useState<RamoEdicao[]>(salvos);
  useEffect(() => setRascunho(salvos), [salvos]);
  const contadorNovos = useRef(0);
  const [busca, setBusca] = useState('');
  const [situacao, setSituacao] = useState<SituacaoRamo[]>([]);
  const [novo, setNovo] = useState('');
  const [tocadoNovo, setTocadoNovo] = useState(false);
  const [confirmar, setConfirmar] = useState(false);

  const dicas = useMemo(
    () => ({ [t('ramosAtividade.lista.titulo')]: t('ramosAtividade.dicas.ramos') }),
    [t]
  );
  const visiveis = filtrarRamos(rascunho, busca, situacao);
  // Exporta o que está gravado, com os filtros da tela; o rascunho só vale depois de salvo
  const paraExportar = filtrarRamos(salvos, busca, situacao);
  const filtrando = !!busca || situacao.length > 0;
  const limpar = () => {
    setBusca('');
    setSituacao([]);
  };
  const totais = totaisRamos(rascunho, totalEmpresas);
  const mudancas = mudancasRamos(rascunho, salvos);

  const resumo = primeiraMaiuscula(
    [
      ...(mudancas.incluidos.length
        ? [plural(t, 'ramosAtividade.mudancas.incluidos', mudancas.incluidos.length)]
        : []),
      ...(mudancas.renomeados.length
        ? [plural(t, 'ramosAtividade.mudancas.renomeados', mudancas.renomeados.length)]
        : []),
      ...(mudancas.inativados.length
        ? [plural(t, 'ramosAtividade.mudancas.inativados', mudancas.inativados.length)]
        : []),
      ...(mudancas.reativados.length
        ? [plural(t, 'ramosAtividade.mudancas.reativados', mudancas.reativados.length)]
        : []),
      ...(mudancas.excluidos.length
        ? [plural(t, 'ramosAtividade.mudancas.excluidos', mudancas.excluidos.length)]
        : []),
      ...(mudancas.ordemAlterada ? [t('ramosAtividade.mudancas.ordem')] : []),
    ].join(', ')
  );

  // Consequências mostradas antes de salvar
  const nomes = (lista: RamoEdicao[]) => lista.map((r) => r.nome).join(', ');
  const usoInativados = mudancas.inativados.reduce((s, r) => s + usoDoRamo(r), 0);
  const usoRenomeados = mudancas.renomeados.reduce((s, r) => s + usoDoRamo(r), 0);
  const consequencias = [
    ...(mudancas.inativados.length
      ? [
          usoInativados
            ? plural(t, 'ramosAtividade.confirmar.inativadosEmUso', mudancas.inativados.length, {
                nomes: nomes(mudancas.inativados),
                empresas: plural(t, 'ramosAtividade.empresas', usoInativados),
              })
            : plural(t, 'ramosAtividade.confirmar.inativados', mudancas.inativados.length, {
                nomes: nomes(mudancas.inativados),
              }),
        ]
      : []),
    ...(usoRenomeados
      ? [
          t('ramosAtividade.confirmar.renomeados', {
            empresas: plural(t, 'ramosAtividade.empresas', usoRenomeados),
          }),
        ]
      : []),
    ...(mudancas.excluidos.length
      ? [t('ramosAtividade.confirmar.excluidos', { nomes: nomes(mudancas.excluidos) })]
      : []),
  ];

  const erroNovo = !novo.trim()
    ? tocadoNovo
      ? t('ramosAtividade.lista.digiteNome')
      : null
    : nomeRepetido(novo, rascunho)
      ? t('ramosAtividade.lista.repetido')
      : null;
  const adicionar = () => {
    setTocadoNovo(true);
    if (!novo.trim() || erroNovo) return;
    contadorNovos.current += 1;
    setRascunho((rs) => [...rs, novoRamo(novo.trim(), contadorNovos.current)]);
    setNovo('');
    setTocadoNovo(false);
  };

  const sensores = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );
  const soltar = (e: DragEndEvent) => {
    if (!e.over || e.active.id === e.over.id) return;
    const sobre = e.over.id;
    setRascunho((rs) =>
      arrayMove(
        rs,
        rs.findIndex((r) => r.id === e.active.id),
        rs.findIndex((r) => r.id === sobre)
      )
    );
  };
  const alterar = (id: string, mudanca: Partial<RamoEdicao>) =>
    setRascunho((rs) => rs.map((r) => (r.id === id ? { ...r, ...mudanca } : r)));

  const gravar = async () => {
    await salvar(paraRascunho(rascunho));
    setConfirmar(false);
  };

  const corpo = () => {
    if (error)
      return (
        <div className="space-y-3 p-4">
          <Callout tom="danger" titulo={t('ramosAtividade.lista.erro')}>
            {t('fase3Comum.verifiqueConexao')}
          </Callout>
          <Button onClick={recarregar}>{t('fase3Comum.tentarNovamente')}</Button>
        </div>
      );
    if (isLoading)
      return (
        <div
          className="space-y-2 p-4"
          role="status"
          aria-label={t('ramosAtividade.lista.carregando')}
        >
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-12 animate-pulse rounded-md bg-ds-bg-subtle" />
          ))}
        </div>
      );
    if (!rascunho.length)
      return (
        <EmptyState
          icone={<ListTree />}
          titulo={t('ramosAtividade.lista.vazioTitulo')}
          descricao={t('ramosAtividade.lista.vazioDescricao')}
        />
      );
    if (!visiveis.length)
      return (
        <EmptyState
          icone={<Search />}
          titulo={t('ramosAtividade.lista.nenhumEncontrado')}
          acao={<Button onClick={limpar}>{t('fase3Comum.limparFiltros')}</Button>}
        />
      );
    return (
      <DndContext sensors={sensores} collisionDetection={closestCenter} onDragEnd={soltar}>
        <SortableContext items={visiveis.map((r) => r.id)} strategy={verticalListSortingStrategy}>
          <ul className="divide-y divide-ds-border" aria-label={t('ramosAtividade.lista.titulo')}>
            {visiveis.map((r) => (
              <LinhaRamo
                key={r.id}
                ramo={r}
                pendencia={pendenciaDoRamo(r, salvos)}
                podeEditar={podeEditar}
                podeArrastar={podeEditar && !filtrando}
                outros={rascunho.filter((x) => x.id !== r.id)}
                onRenomear={(nome) => alterar(r.id, { nome })}
                onAlterarStatus={() => alterar(r.id, { ativo: !r.ativo })}
                onExcluir={() => setRascunho((rs) => rs.filter((x) => x.id !== r.id))}
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>
    );
  };

  return (
    <AdminLayout>
      <DicasContext.Provider value={dicas}>
        <div className="min-h-screen bg-ds-bg-page">
          <DsPage className="px-4 py-4 md:px-6">
            <FaixaPagina>
              <div className="pb-24 pt-3 md:pb-28 md:pt-4">
                <div className="ds-surgir max-w-2xl">
                  <TituloFaixa texto={t('ramosAtividade.titulo')} />
                  <p className="mt-1.5 text-sm text-[#B1B1B1] md:text-[15px]">
                    {t('ramosAtividade.subtitulo')}
                  </p>
                </div>
                <div className="ds-surgir mt-5 flex flex-wrap gap-2" style={atraso(100)}>
                  <MenuExportar
                    descricao={plural(t, 'ramosAtividade.exportar.descricao', paraExportar.length)}
                    onExportar={(formato) =>
                      exportarTabela(exportacaoRamos(paraExportar, t), formato)
                    }
                  />
                </div>
              </div>
            </FaixaPagina>

            <div className="relative -mt-16 grid grid-cols-2 gap-3 md:-mt-20 lg:grid-cols-4">
              <Indicador
                rotulo={t('ramosAtividade.indicadores.ativos')}
                valor={totais.ativos}
                icone={<ListTree />}
              />
              <Indicador
                rotulo={t('ramosAtividade.indicadores.inativos')}
                valor={totais.inativos}
                icone={<CircleSlash />}
                atrasoMs={60}
                selecionado={situacao.length === 1 && situacao[0] === 'inativo'}
                onClick={() =>
                  setSituacao((s) => (s.length === 1 && s[0] === 'inativo' ? [] : ['inativo']))
                }
              />
              <Indicador
                rotulo={t('ramosAtividade.indicadores.comRamo')}
                valor={totais.comRamo}
                icone={<Building2 />}
                tom="success"
                atrasoMs={120}
              />
              <Indicador
                rotulo={t('ramosAtividade.indicadores.semRamo')}
                valor={totais.semRamo}
                icone={<AlertTriangle />}
                tom="warning"
                atrasoMs={180}
              />
            </div>

            <section
              className="ds-surgir mx-auto mt-6 max-w-3xl overflow-hidden rounded-xl border border-ds-border bg-ds-bg-surface"
              style={atraso(240)}
            >
              <header className="flex items-center gap-1.5 border-b border-ds-border px-4 py-4 md:px-5">
                <h2 className="text-xs font-bold uppercase tracking-[0.06em]">
                  {t('ramosAtividade.lista.titulo')}
                </h2>
                <DicaDoRotulo rotulo={t('ramosAtividade.lista.titulo')} />
              </header>

              {/* Inclusão direto na lista: o cadastro é só o nome */}
              {podeEditar && !error && !isLoading && (
                <div className="border-b border-ds-border px-4 py-3 md:px-5">
                  <div className="flex gap-2">
                    <input
                      aria-label={t('ramosAtividade.lista.novo')}
                      placeholder={t('ramosAtividade.lista.novoPlaceholder')}
                      value={novo}
                      onChange={(e) => setNovo(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && adicionar()}
                      aria-invalid={!!erroNovo}
                      className={cn(campo, erroNovo && 'border-ds-danger-fg')}
                    />
                    <Button onClick={adicionar} className="shrink-0">
                      <Plus /> {t('ramosAtividade.lista.incluir')}
                    </Button>
                  </div>
                  {erroNovo && <p className="mt-1.5 text-xs text-ds-danger-fg">{erroNovo}</p>}
                </div>
              )}

              {rascunho.length > 0 && !error && (
                <div className="flex flex-wrap items-center gap-2 border-b border-ds-border px-4 py-3 md:px-5">
                  {filtrando && <BotaoLimparFiltros onClick={limpar} />}
                  <label className="relative block min-w-0 flex-1 md:w-64 md:flex-none">
                    <Search
                      className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ds-fg-muted"
                      aria-hidden
                    />
                    <input
                      type="search"
                      aria-label={t('ramosAtividade.lista.buscar')}
                      placeholder={t('ramosAtividade.lista.buscar')}
                      value={busca}
                      onChange={(e) => setBusca(e.target.value)}
                      className={cn(campo, 'pl-9')}
                    />
                  </label>
                  <FiltroMultiplo<SituacaoRamo>
                    rotulo={t('fase3Comum.situacao')}
                    opcoes={[
                      { valor: 'ativo', rotulo: t('fase3Comum.ativos') },
                      { valor: 'inativo', rotulo: t('fase3Comum.inativos') },
                    ]}
                    selecionados={situacao}
                    onChange={setSituacao}
                  />
                </div>
              )}

              {corpo()}
            </section>

            {mudancas.algo && (
              <BarraRodape>
                <span className="text-sm text-ds-fg-secondary">
                  <span className="font-medium text-ds-fg">{resumo}</span> ·{' '}
                  {t('ramosAtividade.mudancas.naoSalvo')}
                </span>
                <div className="flex gap-2">
                  <Button disabled={isSalvando} onClick={() => setRascunho(salvos)}>
                    {t('fase3Comum.descartar')}
                  </Button>
                  <Button
                    variante="primario"
                    disabled={isSalvando}
                    onClick={() => setConfirmar(true)}
                  >
                    {t('fase3Comum.salvar')}
                  </Button>
                </div>
              </BarraRodape>
            )}

            <ConfirmDialog
              aberto={confirmar}
              onOpenChange={setConfirmar}
              titulo={t('ramosAtividade.confirmar.titulo')}
              descricao={`${resumo}.`}
              consequencias={consequencias.length ? consequencias : undefined}
              rotuloConfirmar={t('ds.formulario.salvar')}
              processando={isSalvando}
              onConfirmar={gravar}
            />
          </DsPage>
        </div>
      </DicasContext.Provider>
    </AdminLayout>
  );
}
