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
import { botaoPrimarioTopo } from '@/components/ds/estilos';
import { AbaMapeamentos } from '@/components/admin/de-para/AbaMapeamentos';
import { AbaNaoMapeados } from '@/components/admin/de-para/AbaNaoMapeados';
import { EdicaoMapeamento } from '@/components/admin/de-para/EdicaoMapeamento';
import { useDePara } from '@/hooks/useDePara';
import { useCatalogo } from '@/hooks/useCatalogo';
import { usePermissions } from '@/hooks/usePermissions';
import { totaisDePara } from '@/utils/deParaTela';
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
  const [situacao, setSituacao] = useState<ClassificacaoGrupo[]>([]);
  const [editando, setEditando] = useState<Edicao>(null);

  const dicas = useMemo(
    () =>
      Object.fromEntries(
        DICAS.map(([rotulo, dica]) => [t(rotulo), t(`deParaGrupos.dicas.${dica}`)])
      ),
    [t]
  );
  const totais = totaisDePara(mapeamentos, naoMapeados);
  const soSemModulo =
    situacao.length === SEM_MODULO.length && SEM_MODULO.every((c) => situacao.includes(c));

  const conteudo = editando ? (
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
          {podeEditar && (
            <div className="ds-surgir mt-5 flex flex-wrap gap-2" style={atraso(100)}>
              <button
                type="button"
                className={botaoPrimarioTopo}
                onClick={() => setEditando({ mapeamento: null })}
              >
                <Plus className="h-4 w-4" /> {t('deParaGrupos.novoMapeamento')}
              </button>
            </div>
          )}
        </div>
      </FaixaPagina>

      <div className="relative -mt-16 grid grid-cols-2 gap-3 md:-mt-20 lg:grid-cols-4">
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
            setSituacao(soSemModulo ? [] : SEM_MODULO);
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
              situacao={situacao}
              onSituacao={setSituacao}
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
