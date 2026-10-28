// Tela Produtos e Módulos (Especificação v2.0, seção 5.1): catálogo Solução › Produto › Módulo,
// os grupos do Aranda de cada nível e a correspondência dos módulos de requerimento.
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, Boxes, Layers, Link2, Package, Plus } from 'lucide-react';
import { arrayMove } from '@dnd-kit/sortable';
import AdminLayout from '@/components/admin/LayoutAdmin';
import { cn } from '@/lib/utils';
import { DsPage } from '@/components/ds/DsPage';
import { FaixaPagina } from '@/components/ds/FaixaPagina';
import { SegmentedTabs } from '@/components/ds/SegmentedTabs';
import { EmptyState } from '@/components/ds/EmptyState';
import { Callout } from '@/components/ds/Callout';
import { Button } from '@/components/ds/Button';
import { ConfirmDialog } from '@/components/ds/ConfirmDialog';
import { DicasContext } from '@/components/ds/Dicas';
import { Indicador, TituloFaixa } from '@/components/ds/Formulario';
import { atraso } from '@/components/ds/Visual';
import { MenuExportar } from '@/components/ds/MenuExportar';
import { BotaoImportar, TelaImportacao } from '@/components/ds/TelaImportacao';
import { botaoPrimarioTopo, botaoVidro, faixaDasAbas } from '@/components/ds/estilos';
import { ArvoreCatalogo, type SelecaoCatalogo } from '@/components/admin/catalogo/ArvoreCatalogo';
import { MoverModulo, PainelProduto, PainelSolucao } from '@/components/admin/catalogo/Paineis';
import { AbaModulosRequerimento } from '@/components/admin/catalogo/AbaModulosRequerimento';
import {
  EdicaoModulo,
  EdicaoProduto,
  EdicaoSolucao,
  type MudancasGrupos,
} from '@/components/admin/catalogo/Edicoes';
import { useCatalogo, useModulosRequerimento } from '@/hooks/useCatalogo';
import { useDePara } from '@/hooks/useDePara';
import { usePermissions } from '@/hooks/usePermissions';
import { plural } from '@/utils/plural';
import { exportarTabela } from '@/utils/exportarTabela';
import {
  bancosDoProduto,
  catalogoImportado,
  conferirCatalogo,
  destinoAoDesvincular,
  destinoDoAlvo,
  exportacaoCatalogo,
  gruposDoModulo,
  totaisCatalogo,
  usosDoModulo,
  type AlvoGrupo,
} from '@/utils/catalogoTela';
import type { Catalogo, Modulo, Produto, Solucao } from '@/types/catalogo';

type Edicao =
  | { tipo: 'solucao'; solucao: Solucao | null }
  | { tipo: 'produto'; produto: Produto | null; solucaoId: string }
  | { tipo: 'modulo'; modulo: Modulo | null; produtoId: string }
  | null;

type AlterarStatus =
  { tipo: 'produto'; item: Produto; usos: number } | { tipo: 'modulo'; item: Modulo; usos: number };

/** Rótulo do campo (traduzido) → chave do texto do "i" */
const DICAS: [string, string][] = [
  ['produtosModulos.edicao.solucao.codigo', 'codigo'],
  ['produtosModulos.edicao.solucao.nome', 'nomeSolucao'],
  ['produtosModulos.edicao.solucao.ativa', 'solucaoAtiva'],
  ['produtosModulos.solucao.gruposServico', 'gruposServico'],
  ['produtosModulos.edicao.produto.solucao', 'solucao'],
  ['produtosModulos.edicao.produto.nome', 'nomeProduto'],
  ['produtosModulos.edicao.produto.descricao', 'descricao'],
  ['produtosModulos.edicao.produto.ativo', 'produtoAtivo'],
  ['produtosModulos.edicao.produto.grupos', 'gruposProduto'],
  ['produtosModulos.edicao.modulo.produto', 'produto'],
  ['produtosModulos.edicao.modulo.nome', 'nomeModulo'],
  ['produtosModulos.edicao.modulo.descricao', 'descricao'],
  ['produtosModulos.edicao.modulo.ativo', 'moduloAtivo'],
  ['produtosModulos.edicao.modulo.grupos', 'gruposAranda'],
  ['produtosModulos.edicao.usadoNosBancos', 'usadoNosBancos'],
  ['produtosModulos.requerimentos.colunaModulo', 'moduloRequerimento'],
  ['produtosModulos.requerimentos.colunaDestino', 'produtoEModulo'],
];

/** Primeiro produto da primeira solução; sem produto, a própria solução */
function selecaoInicial(catalogo: Catalogo): SelecaoCatalogo | null {
  const solucao = [...catalogo.solucoes].sort((a, b) => a.ordem - b.ordem)[0];
  if (!solucao) return null;
  const produto = catalogo.produtos
    .filter((p) => p.solucaoId === solucao.id)
    .sort((a, b) => a.ordem - b.ordem)[0];
  return produto ? { tipo: 'produto', id: produto.id } : { tipo: 'solucao', id: solucao.id };
}

export default function ProdutosModulos() {
  const { t } = useTranslation();
  const { hasPermission } = usePermissions();
  const podeEditar = hasPermission('produtos_modulos', 'edit');
  const podeEditarGrupos = hasPermission('de_para_grupos', 'edit');

  const {
    solucoes,
    produtos,
    modulos,
    usos,
    isLoading,
    error,
    recarregar,
    salvarSolucao,
    salvarProduto,
    reordenarProdutos,
    salvarModulo,
    moverModulo,
    importar,
    isSalvando,
  } = useCatalogo();
  const requerimentos = useModulosRequerimento();
  const { mapeamentos, atribuirDestino, isLoading: carregandoGrupos } = useDePara();
  const catalogo = useMemo<Catalogo>(
    () => ({ solucoes, produtos, modulos }),
    [solucoes, produtos, modulos]
  );

  const [aba, setAba] = useState('catalogo');
  const [escolhida, setEscolhida] = useState<SelecaoCatalogo | null>(null);
  const [soSemGrupo, setSoSemGrupo] = useState(false);
  const [editando, setEditando] = useState<Edicao>(null);
  const [importando, setImportando] = useState(false);
  const [alterarStatus, setAlterarStatus] = useState<AlterarStatus | null>(null);
  const [movendo, setMovendo] = useState<Modulo | null>(null);

  const dicas = useMemo(
    () =>
      Object.fromEntries(
        DICAS.map(([rotulo, dica]) => [t(rotulo), t(`produtosModulos.dicas.${dica}`)])
      ),
    [t]
  );

  // A seleção escolhida some se o item sumir (ex.: outra pessoa excluiu); volta para a inicial
  const valida = (s: SelecaoCatalogo | null) =>
    s &&
    (s.tipo === 'solucao'
      ? solucoes.some((x) => x.id === s.id)
      : produtos.some((x) => x.id === s.id));
  const selecao = valida(escolhida) ? escolhida : selecaoInicial(catalogo);
  const produtoAtual =
    selecao?.tipo === 'produto' ? produtos.find((p) => p.id === selecao.id) : undefined;
  const solucaoAtual =
    selecao?.tipo === 'solucao'
      ? solucoes.find((s) => s.id === selecao.id)
      : solucoes.find((s) => s.id === produtoAtual?.solucaoId);
  const totais = totaisCatalogo(catalogo, mapeamentos);
  const carregando = isLoading || carregandoGrupos;

  /** Grava o item e depois leva os grupos que entraram e saíram para o destino certo */
  const comGrupos =
    <T extends { id?: string }>(
      tipo: AlvoGrupo['tipo'],
      salvarItem: (dados: T) => Promise<unknown>
    ) =>
    async (dados: T, { vincular, desvincular }: MudancasGrupos) => {
      await salvarItem(dados);
      if (!dados.id) return;
      const alvo: AlvoGrupo = { tipo, id: dados.id };
      if (vincular.length)
        await atribuirDestino({ ids: vincular, destino: destinoDoAlvo(alvo, catalogo) });
      if (desvincular.length)
        await atribuirDestino({ ids: desvincular, destino: destinoAoDesvincular(alvo, catalogo) });
    };

  // A ordem vale dentro da solução: o produto arrastado vai para o lugar do outro
  const reordenar = (id: string, sobreId: string) => {
    const arrastado = produtos.find((p) => p.id === id);
    const daSolucao = produtos
      .filter((p) => p.solucaoId === arrastado?.solucaoId)
      .sort((a, b) => a.ordem - b.ordem)
      .map((p) => p.id);
    const de = daSolucao.indexOf(id);
    const para = daSolucao.indexOf(sobreId);
    if (de < 0 || para < 0) return;
    reordenarProdutos(arrayMove(daSolucao, de, para));
  };

  const confirmarStatus = async () => {
    if (!alterarStatus) return;
    const { tipo, item } = alterarStatus;
    if (tipo === 'produto')
      await salvarProduto({
        id: item.id,
        solucaoId: item.solucaoId,
        nome: item.nome,
        descricao: item.descricao,
        ativo: !item.ativo,
      });
    else
      await salvarModulo({
        id: item.id,
        produtoId: item.produtoId,
        nome: item.nome,
        descricao: item.descricao,
        ativo: !item.ativo,
      });
    setAlterarStatus(null);
  };

  const confirmarMover = async (produtoId: string) => {
    if (!movendo) return;
    await moverModulo({ moduloId: movendo.id, produtoId });
    setMovendo(null);
  };

  const comuns = {
    catalogo,
    mapeamentos,
    usos,
    podeEditarGrupos,
    onFechar: () => setEditando(null),
  };

  const edicao = () => {
    if (importando)
      return (
        <TelaImportacao
          voltarPara={t('produtosModulos.titulo')}
          titulo={t('produtosModulos.importar.titulo')}
          colunas={[
            {
              id: 'solucao',
              rotulo: t('produtosModulos.exportar.colunas.solucao'),
              obrigatoria: true,
            },
            {
              id: 'produto',
              rotulo: t('produtosModulos.exportar.colunas.produto'),
              obrigatoria: true,
            },
            { id: 'modulo', rotulo: t('produtosModulos.exportar.colunas.modulo') },
            { id: 'descricao', rotulo: t('produtosModulos.exportar.colunas.descricao') },
          ]}
          regras={[
            t('produtosModulos.importar.regras.solucao'),
            t('produtosModulos.importar.regras.semModulo'),
            t('produtosModulos.importar.regras.ordem'),
          ]}
          modelo={{
            arquivo: t('produtosModulos.importar.modelo'),
            exemplo: [
              { solucao: 'COMEX', produto: 'CE PLUS', modulo: '', descricao: '' },
              { solucao: 'COMEX', produto: 'CE PLUS', modulo: 'Câmbio', descricao: '' },
            ],
          }}
          conferir={(linhas) => conferirCatalogo(linhas, catalogo, t)}
          onImportar={(linhas) => importar(catalogoImportado(linhas, catalogo))}
          onFechar={() => setImportando(false)}
        />
      );
    if (editando?.tipo === 'solucao')
      return (
        <EdicaoSolucao
          key={editando.solucao?.id ?? 'nova'}
          {...comuns}
          solucao={editando.solucao}
          onSalvar={comGrupos('solucao', salvarSolucao)}
        />
      );
    if (editando?.tipo === 'produto')
      return (
        <EdicaoProduto
          key={editando.produto?.id ?? 'novo'}
          {...comuns}
          produto={editando.produto}
          solucaoId={editando.solucaoId}
          onSalvar={comGrupos('produto', salvarProduto)}
        />
      );
    if (editando?.tipo === 'modulo')
      return (
        <EdicaoModulo
          key={editando.modulo?.id ?? 'novo'}
          {...comuns}
          modulo={editando.modulo}
          produtoId={editando.produtoId}
          onSalvar={comGrupos('modulo', salvarModulo)}
        />
      );
    return null;
  };

  const novaSolucao = () => setEditando({ tipo: 'solucao', solucao: null });
  // Produto novo vai para a solução em foco; módulo novo, para o produto em foco (nunca o "A classificar")
  const novoProduto = () =>
    setEditando({ tipo: 'produto', produto: null, solucaoId: solucaoAtual?.id ?? solucoes[0]?.id });
  const produtoParaModulo =
    produtoAtual && !produtoAtual.aClassificar
      ? produtoAtual
      : produtos.find((p) => p.solucaoId === solucaoAtual?.id && p.ativo && !p.aClassificar);

  const catalogoAba = () => {
    if (error)
      return (
        <div className="space-y-3 rounded-xl border border-ds-border bg-ds-bg-surface p-4">
          <Callout tom="danger" titulo={t('produtosModulos.erroCatalogo')}>
            {t('fase3Comum.verifiqueConexao')}
          </Callout>
          <Button onClick={recarregar}>{t('fase3Comum.tentarNovamente')}</Button>
        </div>
      );
    if (!carregando && !solucoes.length)
      return (
        <div className="rounded-xl border border-ds-border bg-ds-bg-surface">
          <EmptyState
            icone={<Boxes />}
            titulo={t('produtosModulos.vazio.titulo')}
            descricao={t('produtosModulos.vazio.descricao')}
            acao={
              podeEditar ? (
                <Button variante="primario" onClick={novaSolucao}>
                  <Plus /> {t('produtosModulos.novaSolucao')}
                </Button>
              ) : undefined
            }
          />
        </div>
      );
    return (
      <div className="grid items-start gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
        <ArvoreCatalogo
          catalogo={catalogo}
          mapeamentos={mapeamentos}
          selecao={selecao ?? { tipo: 'solucao', id: '' }}
          podeEditar={podeEditar}
          carregando={carregando}
          onSelecionar={setEscolhida}
          onReordenar={reordenar}
        />
        {carregando ? null : selecao?.tipo === 'solucao' && solucaoAtual ? (
          <PainelSolucao
            solucao={solucaoAtual}
            catalogo={catalogo}
            mapeamentos={mapeamentos}
            usos={usos}
            podeEditar={podeEditar}
            onAbrirProduto={(id) => setEscolhida({ tipo: 'produto', id })}
            onEditarSolucao={() => setEditando({ tipo: 'solucao', solucao: solucaoAtual })}
            onEditarProduto={(p) =>
              setEditando({ tipo: 'produto', produto: p, solucaoId: solucaoAtual.id })
            }
            onAlterarStatusProduto={(p) =>
              setAlterarStatus({
                tipo: 'produto',
                item: p,
                usos: bancosDoProduto(usos, p.id).length,
              })
            }
          />
        ) : produtoAtual ? (
          <PainelProduto
            key={produtoAtual.id}
            produto={produtoAtual}
            catalogo={catalogo}
            mapeamentos={mapeamentos}
            usos={usos}
            podeEditar={podeEditar}
            soSemGrupo={soSemGrupo}
            onSoSemGrupo={setSoSemGrupo}
            onEditarProduto={() =>
              setEditando({
                tipo: 'produto',
                produto: produtoAtual,
                solucaoId: produtoAtual.solucaoId,
              })
            }
            onEditarModulo={(m) =>
              setEditando({ tipo: 'modulo', modulo: m, produtoId: produtoAtual.id })
            }
            onAlterarStatus={(m) =>
              setAlterarStatus({ tipo: 'modulo', item: m, usos: usosDoModulo(usos, m).length })
            }
            onMover={setMovendo}
          />
        ) : null}
      </div>
    );
  };

  const lista = (
    <>
      <FaixaPagina>
        <div className="pb-24 pt-3 md:pb-28 md:pt-4">
          <div className="ds-surgir max-w-2xl">
            <TituloFaixa texto={t('produtosModulos.titulo')} />
            <p className="mt-1.5 text-sm text-[#B1B1B1] md:text-[15px]">
              {t('produtosModulos.subtitulo')}
            </p>
          </div>
          <div className="ds-surgir mt-5 flex flex-wrap gap-2" style={atraso(100)}>
            {podeEditar && (
              <>
                <button type="button" className={botaoVidro} onClick={novaSolucao}>
                  <Plus className="h-4 w-4" /> {t('produtosModulos.novaSolucao')}
                </button>
                {solucoes.length > 0 && (
                  <button type="button" className={botaoVidro} onClick={novoProduto}>
                    <Plus className="h-4 w-4" /> {t('produtosModulos.novoProduto')}
                  </button>
                )}
                {produtoParaModulo && (
                  <button
                    type="button"
                    className={botaoPrimarioTopo}
                    onClick={() =>
                      setEditando({ tipo: 'modulo', modulo: null, produtoId: produtoParaModulo.id })
                    }
                  >
                    <Plus className="h-4 w-4" /> {t('produtosModulos.novoModulo')}
                  </button>
                )}
              </>
            )}
            {podeEditar && (
              <BotaoImportar onClick={() => setImportando(true)} desabilitado={isLoading} />
            )}
            <MenuExportar
              descricao={t('produtosModulos.exportar.descricao')}
              onExportar={(formato) => exportarTabela(exportacaoCatalogo(catalogo, t), formato)}
            />
          </div>
        </div>
      </FaixaPagina>

      <div className="relative !-mt-16 grid grid-cols-2 gap-3 md:!-mt-20 lg:grid-cols-4">
        <Indicador
          rotulo={t('produtosModulos.indicadores.produtosAtivos')}
          valor={totais.produtos}
          icone={<Package />}
        />
        <Indicador
          rotulo={t('produtosModulos.indicadores.modulosAtivos')}
          valor={totais.modulos}
          icone={<Layers />}
          atrasoMs={60}
        />
        <Indicador
          rotulo={t('produtosModulos.indicadores.gruposLigados')}
          valor={totais.grupos}
          icone={<Link2 />}
          atrasoMs={120}
        />
        <Indicador
          rotulo={t('produtosModulos.indicadores.modulosSemGrupo')}
          valor={totais.semGrupo}
          icone={<AlertTriangle />}
          tom="warning"
          atrasoMs={180}
          selecionado={soSemGrupo}
          onClick={() => {
            setAba('catalogo');
            setSoSemGrupo((v) => !v);
            // Abre o primeiro produto que tem módulo sem grupo
            const alvo = modulos.find((m) => m.ativo && !gruposDoModulo(mapeamentos, m.id).length);
            if (!soSemGrupo && alvo) setEscolhida({ tipo: 'produto', id: alvo.produtoId });
          }}
        />
      </div>

      <div className="mt-6 space-y-4">
        <div className={cn(faixaDasAbas, 'flex justify-center')}>
          <SegmentedTabs
            rotulo={t('produtosModulos.abas.rotulo')}
            itens={[
              { valor: 'catalogo', rotulo: t('produtosModulos.abas.catalogo') },
              { valor: 'requerimentos', rotulo: t('produtosModulos.abas.requerimentos') },
            ]}
            valor={aba}
            onChange={setAba}
          />
        </div>
        <div key={aba} className="ds-surgir" style={atraso(240)}>
          {aba === 'requerimentos' ? (
            <AbaModulosRequerimento
              catalogo={catalogo}
              linhas={requerimentos.modulosRequerimento}
              carregando={requerimentos.isLoading || isLoading}
              erro={requerimentos.error}
              podeEditar={podeEditar}
              onSalvar={async (alteradas) => {
                for (const a of alteradas) await requerimentos.salvar(a);
              }}
              onTentarNovamente={recarregar}
            />
          ) : (
            catalogoAba()
          )}
        </div>
      </div>

      <ConfirmDialog
        aberto={!!alterarStatus}
        onOpenChange={(v) => !v && setAlterarStatus(null)}
        titulo={t(
          alterarStatus?.item.ativo
            ? 'produtosModulos.edicao.inativarTitulo'
            : 'produtosModulos.edicao.reativarTitulo',
          { nome: alterarStatus?.item.nome ?? '' }
        )}
        descricao={
          alterarStatus?.item.ativo && alterarStatus.usos
            ? t('produtosModulos.edicao.noEscopoDescricao', {
                bancos: plural(t, 'fase3Comum.bancosAtivos', alterarStatus.usos),
              })
            : undefined
        }
        consequencias={
          alterarStatus?.item.ativo
            ? [
                t('produtosModulos.edicao.semEscopoNovo'),
                t('produtosModulos.edicao.bancosNaoMudam'),
                t('produtosModulos.edicao.gruposContinuam'),
              ]
            : [t('produtosModulos.edicao.voltaEscopo')]
        }
        rotuloConfirmar={
          alterarStatus?.item.ativo ? t('fase3Comum.inativar') : t('fase3Comum.reativar')
        }
        tom={alterarStatus?.item.ativo ? 'perigo' : 'padrao'}
        processando={isSalvando}
        onConfirmar={confirmarStatus}
      />
      <MoverModulo
        key={movendo?.id ?? 'fechado'}
        catalogo={catalogo}
        modulo={movendo}
        processando={isSalvando}
        onFechar={() => setMovendo(null)}
        onConfirmar={confirmarMover}
      />
    </>
  );

  return (
    <AdminLayout>
      <DicasContext.Provider value={dicas}>
        <div className="min-h-screen bg-ds-bg-page">
          <DsPage className="px-4 py-4 md:px-6">{edicao() ?? lista}</DsPage>
        </div>
      </DicasContext.Provider>
    </AdminLayout>
  );
}
