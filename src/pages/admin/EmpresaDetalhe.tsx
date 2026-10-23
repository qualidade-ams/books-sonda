// Detalhe da empresa na tela nova de Empresas. Na transição (Fases 3 a 5) a identidade vem da
// tela atual só para leitura; aqui se editam AMS e projetos (e, nas abas, o contrato e os bancos).
import { useMemo, useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, ArrowLeft, CheckCircle2, ExternalLink, Eye, XCircle } from 'lucide-react';
import AdminLayout from '@/components/admin/LayoutAdmin';
import { DsPage } from '@/components/ds/DsPage';
import { FaixaPagina } from '@/components/ds/FaixaPagina';
import { Callout } from '@/components/ds/Callout';
import { EmptyState } from '@/components/ds/EmptyState';
import { DicasContext } from '@/components/ds/Dicas';
import { atraso } from '@/components/ds/Visual';
import { botaoVidro } from '@/components/ds/estilos';
import { IdentidadeEmpresa } from '@/components/admin/empresas/IdentidadeEmpresa';
import { EdicaoAmsProjetos } from '@/components/admin/empresas/EdicaoAmsProjetos';
import { useEmpresaCadastro } from '@/hooks/useEmpresasCadastro';
import { useEmpresaAnexos } from '@/hooks/useEmpresaAnexos';
import { usePermissions } from '@/hooks/usePermissions';
import { cn } from '@/lib/utils';
import { TELA_ATUAL_EMPRESAS } from '@/utils/empresasTela';
import type { Anexo, ModeloEmpresa } from '@/types/empresas';
import type { EmpresaAnexo } from '@/services/empresaAnexosService';

/** Rótulo do campo (traduzido) → chave do texto do "i" */
const DICAS: [string, string][] = [
  ['empresasCadastro.identidade.nomeCompleto', 'nomeCompleto'],
  ['empresasCadastro.identidade.nomeAbreviado', 'nomeAbreviado'],
  ['empresasCadastro.identidade.grupoEmpresarial', 'grupoEmpresarial'],
  ['empresasCadastro.identidade.vigencia', 'vigencia'],
  ['empresasCadastro.identidade.solucoes', 'solucoes'],
  ['empresasCadastro.identidade.emailCs', 'emailCs'],
  ['empresasCadastro.identidade.emailComercial', 'emailComercial'],
  ['empresasCadastro.identidade.emailTm', 'emailTm'],
  ['empresasCadastro.identidade.observacao', 'observacao'],
  ['empresasCadastro.identidade.anexos', 'anexos'],
];

const TOM_DO_MODELO: Record<ModeloEmpresa, 'neutral' | 'warning' | 'info'> = {
  legado: 'neutral',
  multiplo: 'warning',
  liberada: 'info',
};

/** Selo em vidro, para a faixa escura */
function SeloTopo({
  tom,
  children,
}: {
  tom: 'success' | 'warning' | 'info' | 'neutral' | 'danger';
  children: ReactNode;
}) {
  const cores = {
    success: 'border-[#4CC77A]/35 bg-[#4CC77A]/10 text-[#4CC77A]',
    warning: 'border-[#F0A43A]/35 bg-[#F0A43A]/10 text-[#F0A43A]',
    info: 'border-[#00D4E8]/35 bg-[#00D4E8]/10 text-[#00D4E8]',
    danger: 'border-[#FF8A80]/35 bg-[#FF8A80]/10 text-[#FF8A80]',
    neutral: 'border-white/20 bg-white/[0.06] text-white/80',
  }[tom];
  return (
    <span
      className={cn(
        'inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-xs font-medium',
        cores
      )}
    >
      {children}
    </span>
  );
}

export default function EmpresaDetalhe() {
  const { t } = useTranslation();
  const { empresaId } = useParams();
  const { hasPermission } = usePermissions();
  const podeEditarEmpresa = hasPermission('empresas', 'edit');
  const podeEditarBancos = hasPermission('bancos_horas_parametros', 'edit');
  const soLeitura = !podeEditarEmpresa && !podeEditarBancos;
  const { empresa, isLoading, error, salvarSolucoes } = useEmpresaCadastro(empresaId);
  // Só o download: sem id, o hook não busca a lista de anexos
  const { downloadAnexo } = useEmpresaAnexos();
  const [editando, setEditando] = useState<'ams' | null>(null);

  const dicas = useMemo(
    () =>
      Object.fromEntries(
        DICAS.map(([rotulo, dica]) => [t(rotulo), t(`empresasCadastro.dicas.${dica}`)])
      ),
    [t]
  );
  const baixar = (a: Anexo) =>
    downloadAnexo({ storage_path: a.storagePath, nome_original: a.nome } as EmpresaAnexo);

  const voltar = (
    <Link to="/admin/empresas" className={cn(botaoVidro, 'h-9 md:h-8')}>
      <ArrowLeft className="h-4 w-4" /> {t('empresasCadastro.detalhe.voltar')}
    </Link>
  );

  const conteudo = () => {
    if (isLoading)
      return (
        <div
          className="space-y-4"
          role="status"
          aria-label={t('empresasCadastro.detalhe.carregando')}
        >
          <div className="h-40 animate-pulse rounded-2xl bg-ds-bg-subtle" />
          <div className="h-80 animate-pulse rounded-xl bg-ds-bg-surface" />
        </div>
      );
    if (error || !empresa)
      return (
        <>
          <FaixaPagina>
            <div className="pb-8 pt-1">{voltar}</div>
          </FaixaPagina>
          <div className="mt-4 rounded-xl border border-ds-border bg-ds-bg-surface p-4">
            {error ? (
              <Callout tom="danger" titulo={t('empresasCadastro.detalhe.erro')}>
                {t('fase3Comum.verifiqueConexao')}
              </Callout>
            ) : (
              <EmptyState
                icone={<AlertTriangle />}
                titulo={t('empresasCadastro.detalhe.naoEncontrada')}
              />
            )}
          </div>
        </>
      );

    // Um nível a mais: a edição ocupa a tela; "voltar" retorna para a empresa
    if (editando === 'ams')
      return (
        <EdicaoAmsProjetos
          empresa={empresa}
          onFechar={() => setEditando(null)}
          onSalvar={salvarSolucoes}
        />
      );

    const ativa = empresa.status === 'ativo';
    return (
      <>
        <FaixaPagina>
          <div className="pb-24 pt-1 md:pb-28">
            {voltar}
            <div className="ds-surgir mt-4 max-w-3xl">
              <h1 className="font-ds-title text-[26px] font-semibold leading-8 tracking-tight md:text-[34px] md:leading-[42px]">
                {empresa.nomeAbreviado}
              </h1>
            </div>
            <div className="ds-surgir mt-3 flex flex-wrap gap-2" style={atraso(100)}>
              <SeloTopo tom={ativa ? 'success' : 'danger'}>
                {ativa ? (
                  <CheckCircle2 className="h-3.5 w-3.5" />
                ) : (
                  <XCircle className="h-3.5 w-3.5" />
                )}
                {ativa
                  ? t('empresasCadastro.situacao.ativa')
                  : t('empresasCadastro.situacao.inativa')}
              </SeloTopo>
              <SeloTopo tom={TOM_DO_MODELO[empresa.modelo]}>
                {t(`empresasCadastro.detalhe.seloModelo.${empresa.modelo}`)}
              </SeloTopo>
              {soLeitura && (
                <SeloTopo tom="neutral">
                  <Eye className="h-3.5 w-3.5" />{' '}
                  {t('empresasCadastro.detalhe.somenteVisualizacao')}
                </SeloTopo>
              )}
              {podeEditarEmpresa && (
                <Link
                  to={TELA_ATUAL_EMPRESAS}
                  title={t('empresasCadastro.telaAtualDica')}
                  className={cn(botaoVidro, 'h-7 rounded-full px-2.5 text-xs md:h-7')}
                >
                  <ExternalLink className="h-3.5 w-3.5" /> {t('empresasCadastro.abrirNaTelaAtual')}
                </Link>
              )}
            </div>
          </div>
        </FaixaPagina>

        <IdentidadeEmpresa
          empresa={empresa}
          podeEditar={podeEditarEmpresa}
          onEditarAms={() => setEditando('ams')}
          onBaixarAnexo={baixar}
        />
      </>
    );
  };

  return (
    <AdminLayout>
      <DicasContext.Provider value={dicas}>
        <div className="min-h-screen bg-ds-bg-page">
          <DsPage className="px-4 py-4 md:px-6">{conteudo()}</DsPage>
        </div>
      </DicasContext.Provider>
    </AdminLayout>
  );
}
