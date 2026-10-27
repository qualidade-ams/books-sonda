// Tela Empresas, nova (Especificação v2.0, seções 5.3 e 5.4): lista. Na transição (Fases 3 a 5)
// a identidade continua sendo cadastrada na tela atual; aqui se veem as empresas e se abre o
// detalhe, onde ficam as organizações do Aranda, o contrato e os bancos de horas.
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, Building2, CheckCircle2, CircleSlash, ExternalLink } from 'lucide-react';
import AdminLayout from '@/components/admin/LayoutAdmin';
import { DsPage } from '@/components/ds/DsPage';
import { FaixaPagina } from '@/components/ds/FaixaPagina';
import { Indicador, TituloFaixa } from '@/components/ds/Formulario';
import { atraso } from '@/components/ds/Visual';
import { botaoVidro } from '@/components/ds/estilos';
import { MenuExportar } from '@/components/ds/MenuExportar';
import { ListaEmpresas } from '@/components/admin/empresas/ListaEmpresas';
import { useEmpresasCadastro } from '@/hooks/useEmpresasCadastro';
import { usePermissions } from '@/hooks/usePermissions';
import { exportarTabela } from '@/utils/exportarTabela';
import { plural } from '@/utils/plural';
import {
  exportacaoEmpresas,
  filtrarEmpresas,
  SEM_FILTRO_EMPRESAS,
  TELA_ATUAL_NOVA_EMPRESA,
  type FiltroEmpresas,
} from '@/utils/empresasTela';

export default function Empresas() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();
  const podeEditar = hasPermission('empresas', 'edit');
  const { empresas, totais, isLoading, error, recarregar } = useEmpresasCadastro();
  const [filtro, setFiltro] = useState<FiltroEmpresas>(SEM_FILTRO_EMPRESAS);
  const paraExportar = filtrarEmpresas(empresas, filtro);

  return (
    <AdminLayout>
      <div className="min-h-screen bg-ds-bg-page">
        <DsPage className="px-4 py-4 md:px-6">
          <FaixaPagina>
            <div className="pb-24 pt-3 md:pb-28 md:pt-4">
              <div className="ds-surgir max-w-2xl">
                <TituloFaixa texto={t('empresasCadastro.titulo')} />
                <p className="mt-1.5 text-sm text-[#B1B1B1] md:text-[15px]">
                  {t('empresasCadastro.subtitulo')}
                </p>
              </div>
              <div className="ds-surgir mt-5 flex flex-wrap gap-2" style={atraso(100)}>
                {podeEditar && (
                  <Link
                    to={TELA_ATUAL_NOVA_EMPRESA}
                    className={botaoVidro}
                    title={t('empresasCadastro.telaAtualDica')}
                  >
                    <ExternalLink className="h-4 w-4" /> {t('empresasCadastro.novaNaTelaAtual')}
                  </Link>
                )}
                <MenuExportar
                  descricao={plural(t, 'empresasCadastro.exportar.descricao', paraExportar.length)}
                  onExportar={(formato) =>
                    exportarTabela(exportacaoEmpresas(paraExportar, t), formato)
                  }
                />
              </div>
            </div>
          </FaixaPagina>

          <div className="relative !-mt-16 grid grid-cols-2 gap-3 md:!-mt-20 lg:grid-cols-4">
            <Indicador
              rotulo={t('empresasCadastro.indicadores.total')}
              valor={totais.total}
              icone={<Building2 />}
            />
            <Indicador
              rotulo={t('empresasCadastro.indicadores.ativas')}
              valor={totais.ativas}
              icone={<CheckCircle2 />}
              tom="success"
              atrasoMs={60}
            />
            <Indicador
              rotulo={t('empresasCadastro.indicadores.inativas')}
              valor={totais.inativas}
              icone={<CircleSlash />}
              atrasoMs={120}
            />
            <Indicador
              rotulo={t('empresasCadastro.indicadores.pendentes')}
              valor={totais.pendentes}
              icone={<AlertTriangle />}
              tom="warning"
              atrasoMs={180}
              selecionado={filtro.soPendentes}
              onClick={() => setFiltro((f) => ({ ...f, soPendentes: !f.soPendentes }))}
            />
          </div>

          <div className="ds-surgir mt-6" style={atraso(240)}>
            <ListaEmpresas
              empresas={empresas}
              carregando={isLoading}
              erro={error}
              podeEditar={podeEditar}
              filtro={filtro}
              onFiltro={setFiltro}
              onAbrir={(id) => navigate(`/admin/empresas/${id}`)}
              onTentarNovamente={() => recarregar()}
            />
          </div>
        </DsPage>
      </div>
    </AdminLayout>
  );
}
