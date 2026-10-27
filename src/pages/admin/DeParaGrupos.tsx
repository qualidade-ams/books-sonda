// Tela De-para de Grupos (Especificação v2.0, seção 5.2): liga cada grupo de atendimento do
// Aranda ao Grupo do Book e ao catálogo Solução › Produto › Módulo, que decide o banco de cada hora.
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, GitMerge, Layers, Plus } from 'lucide-react';
import AdminLayout from '@/components/admin/LayoutAdmin';
import { DsPage } from '@/components/ds/DsPage';
import { FaixaPagina } from '@/components/ds/FaixaPagina';
import { SegmentedTabs } from '@/components/ds/SegmentedTabs';
import { DicasContext } from '@/components/ds/Dicas';
import { Indicador, TituloFaixa } from '@/components/ds/Formulario';
import { atraso } from '@/components/ds/Visual';
import { MenuExportar } from '@/components/ds/MenuExportar';
import { BotaoImportar, TelaImportacao } from '@/components/ds/TelaImportacao';
import { Callout } from '@/components/ds/Callout';
import { botaoPrimarioTopo } from '@/components/ds/estilos';
import { AbaMapeamentos } from '@/components/admin/de-para/AbaMapeamentos';
import { AbaNaoMapeados } from '@/components/admin/de-para/AbaNaoMapeados';
import { EdicaoMapeamento } from '@/components/admin/de-para/EdicaoMapeamento';
import { useDePara } from '@/hooks/useDePara';
import { useCatalogo } from '@/hooks/useCatalogo';
import { usePermissions } from '@/hooks/usePermissions';
import { exportarTabela } from '@/utils/exportarTabela';
import { plural } from '@/utils/plural';
import {
  conferirMapeamentos,
  exportacaoMapeamentos,
  mapeamentosImportados,
  filtrarMapeamentos,
  SEM_FILTRO,
  totaisDePara,
  type FiltroMapeamentos,
} from '@/utils/deParaTela';
import type { Catalogo } from '@/types/catalogo';
import type { ClassificacaoGrupo, GrupoNaoMapeado, MapeamentoGrupo } from '@/types/dePara';

type Edicao = { mapeamento: MapeamentoGrupo | null; grupoNovo?: GrupoNaoMapeado } | null;

/** O indicador "Sem módulo" filtra por todas as situações menos "com módulo" */
const SEM_MODULO: ClassificacaoGrupo[] = ['produto', 'solucao', 'nao_se_aplica'];

/** Rótulo do campo (traduzido) → chave do texto do "i" */
const DICAS: [string, string][] = [
  ['deParaGrupos.edicao.grupoAranda', 'grupoAranda'],
  ['deParaGrupos.edicao.grupoBook', 'grupoBook'],
  ['deParaGrupos.destino.solucao', 'solucao'],
  ['deParaGrupos.destino.produto', 'produto'],
  ['deParaGrupos.destino.modulo', 'modulo'],
  ['deParaGrupos.edicao.paraOnde', 'paraOnde'],
  ['deParaGrupos.edicao.uso', 'uso'],
];

export default function DeParaGrupos() {
  const { t } = useTranslation();
  const { hasPermission } = usePermissions();
  const podeEditar = hasPermission('de_para_grupos', 'edit');

  const {
    mapeamentos,
    uso,
    naoMapeados,
    isLoading,
    error,
    recarregar,
    salvar,
    atribuirDestino,
    excluir,
    importar,
  } = useDePara();
  const catalogoHook = useCatalogo();
  const { solucoes, produtos, modulos } = catalogoHook;
  const catalogo = useMemo<Catalogo>(
    () => ({ solucoes, produtos, modulos }),
    [solucoes, produtos, modulos]
  );
  const carregando = isLoading || catalogoHook.isLoading;
  const erro = error || catalogoHook.error;
  const tentarNovamente = () => {
    recarregar();
    if (catalogoHook.error) catalogoHook.recarregar();
  };

  const [aba, setAba] = useState('mapeamentos');
  const [filtro, setFiltro] = useState<FiltroMapeamentos>(SEM_FILTRO);
  const { situacao } = filtro;
  const [editando, setEditando] = useState<Edicao>(null);
  const [importando, setImportando] = useState(false);

  const dicas = useMemo(
    () =>
      Object.fromEntries(
        DICAS.map(([rotulo, dica]) => [t(rotulo), t(`deParaGrupos.dicas.${dica}`)])
      ),
    [t]
  );
  const totais = totaisDePara(mapeamentos, naoMapeados);
  const paraExportar = filtrarMapeamentos(mapeamentos, filtro);
  const soSemModulo =
    situacao.length === SEM_MODULO.length && SEM_MODULO.every((c) => situacao.includes(c));

  const colunasImportacao = [
    { id: 'grupo', rotulo: t('deParaGrupos.lista.colunaGrupo'), obrigatoria: true },
    { id: 'book', rotulo: t('deParaGrupos.lista.colunaBook'), obrigatoria: true },
    { id: 'solucao', rotulo: t('deParaGrupos.destino.solucao') },
    { id: 'produto', rotulo: t('deParaGrupos.destino.produto') },
    { id: 'modulo', rotulo: t('deParaGrupos.destino.modulo') },
  ];

  const conteudo = importando ? (
    <TelaImportacao
      voltarPara={t('deParaGrupos.titulo')}
      titulo={t('deParaGrupos.importar.titulo')}
      colunas={colunasImportacao}
      regras={[
        t('deParaGrupos.importar.regras.grupo'),
        t('deParaGrupos.importar.regras.destino'),
        t('deParaGrupos.importar.regras.catalogo'),
      ]}
      modelo={{
        arquivo: t('deParaGrupos.importar.modelo'),
        exemplo: [
          {
            grupo: 'AMS APL - CAMBIO - N2',
            book: 'COMEX - Câmbio',
            solucao: 'COMEX',
            produto: 'CE PLUS',
            modulo: 'Câmbio',
          },
        ],
      }}
      aviso={
        <Callout tom="warning" titulo={t('deParaGrupos.importar.aviso.titulo')}>
          {t('deParaGrupos.importar.aviso.texto')}
        </Callout>
      }
      conferir={(linhas) => conferirMapeamentos(linhas, mapeamentos, catalogo, t)}
      onImportar={(linhas) => importar(mapeamentosImportados(linhas, mapeamentos, catalogo))}
      onFechar={() => setImportando(false)}
    />
  ) : editando ? (
    <EdicaoMapeamento
      key={editando.mapeamento?.id ?? editando.grupoNovo?.grupoAranda ?? 'novo'}
      mapeamento={editando.mapeamento}
      grupoNovo={editando.grupoNovo}
      mapeamentos={mapeamentos}
      catalogo={catalogo}
      uso={uso}
      onFechar={() => setEditando(null)}
      onSalvar={salvar}
    />
  ) : (
    <>
      <FaixaPagina>
        <div className="pb-24 pt-3 md:pb-28 md:pt-4">
          <div className="ds-surgir max-w-2xl">
            <TituloFaixa texto={t('deParaGrupos.titulo')} />
            <p className="mt-1.5 text-sm text-[#B1B1B1] md:text-[15px]">
              {t('deParaGrupos.subtitulo')}
            </p>
          </div>
          <div className="ds-surgir mt-5 flex flex-wrap gap-2" style={atraso(100)}>
            {podeEditar && (
              <button
                type="button"
                className={botaoPrimarioTopo}
                onClick={() => setEditando({ mapeamento: null })}
              >
                <Plus className="h-4 w-4" /> {t('deParaGrupos.novoMapeamento')}
              </button>
            )}
            {podeEditar && (
              <BotaoImportar onClick={() => setImportando(true)} desabilitado={carregando} />
            )}
            <MenuExportar
              descricao={plural(t, 'deParaGrupos.exportar.descricao', paraExportar.length)}
              onExportar={(formato) =>
                exportarTabela(exportacaoMapeamentos(paraExportar, catalogo, uso, t), formato)
              }
            />
          </div>
        </div>
      </FaixaPagina>

      <div className="relative !-mt-16 grid grid-cols-2 gap-3 md:!-mt-20 lg:grid-cols-4">
        <Indicador
          rotulo={t('deParaGrupos.indicadores.mapeados')}
          valor={totais.mapeados}
          icone={<GitMerge />}
        />
        <Indicador
          rotulo={t('deParaGrupos.indicadores.comModulo')}
          valor={totais.comModulo}
          icone={<Layers />}
          tom="success"
          atrasoMs={60}
        />
        <Indicador
          rotulo={t('deParaGrupos.indicadores.semModulo')}
          valor={totais.semModulo}
          icone={<AlertTriangle />}
          atrasoMs={120}
          selecionado={aba === 'mapeamentos' && soSemModulo}
          onClick={() => {
            setAba('mapeamentos');
            setFiltro((f) => ({ ...f, situacao: soSemModulo ? [] : SEM_MODULO }));
          }}
        />
        <Indicador
          rotulo={t('deParaGrupos.indicadores.naoMapeados')}
          valor={totais.naoMapeados}
          icone={<AlertTriangle />}
          tom="warning"
          atrasoMs={180}
          selecionado={aba === 'nao-mapeados'}
          onClick={() => setAba('nao-mapeados')}
        />
      </div>

      <div className="mt-6 space-y-4">
        <div className="sticky top-0 z-[5] -mx-1 flex justify-center bg-ds-bg-page px-1 py-1.5">
          <SegmentedTabs
            rotulo={t('deParaGrupos.abas.rotulo')}
            itens={[
              { valor: 'mapeamentos', rotulo: t('deParaGrupos.abas.mapeamentos') },
              {
                valor: 'nao-mapeados',
                rotulo: t('deParaGrupos.abas.naoMapeados'),
                contador: totais.naoMapeados,
              },
            ]}
            valor={aba}
            onChange={setAba}
          />
        </div>
        <div key={aba} className="ds-surgir" style={atraso(240)}>
          {aba === 'mapeamentos' ? (
            <AbaMapeamentos
              mapeamentos={mapeamentos}
              catalogo={catalogo}
              uso={uso}
              carregando={carregando}
              erro={erro}
              podeEditar={podeEditar}
              filtro={filtro}
              onFiltro={setFiltro}
              onEditar={(m) => setEditando({ mapeamento: m })}
              onAtribuir={(ids, destino) => atribuirDestino({ ids, destino })}
              onExcluir={(m) => excluir(m.id)}
              onTentarNovamente={tentarNovamente}
            />
          ) : (
            <AbaNaoMapeados
              naoMapeados={naoMapeados}
              carregando={carregando}
              erro={erro}
              podeEditar={podeEditar}
              onMapear={(g) => setEditando({ mapeamento: null, grupoNovo: g })}
              onTentarNovamente={tentarNovamente}
            />
          )}
        </div>
      </div>
    </>
  );

  return (
    <AdminLayout>
      <DicasContext.Provider value={dicas}>
        <div className="min-h-screen bg-ds-bg-page">
          <DsPage className="px-4 py-4 md:px-6">{conteudo}</DsPage>
        </div>
      </DicasContext.Provider>
    </AdminLayout>
  );
}
