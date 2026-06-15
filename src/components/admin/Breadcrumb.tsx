import { useLocation, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronRight, Home } from 'lucide-react';

const Breadcrumb = () => {
  const location = useLocation();
  const { t } = useTranslation();
  const pathnames = location.pathname.split('/').filter((x) => x);

  // Mapeamento de rotas para chaves de tradução
  const breadcrumbKeyMap: Record<string, string> = {
    admin: 'nav.administration',
    'cadastro-usuarios': 'nav.userManagement',
    dashboard: 'nav.dashboard',
    'email-config': 'nav.emailConfig',
    'user-config': 'nav.userConfig',
    'grupos': 'nav.groups',
    'usuarios-grupos': 'nav.userGroups',
    'audit-logs': 'nav.auditLogs',
    'empresas-clientes': 'nav.companies',
    'clientes': 'nav.clients',
    'grupos-responsaveis': 'nav.responsibleGroups',
    'controle-disparos': 'nav.controlShoots',
    'historico-books': 'nav.historyBooks',
    'disparos-personalizados': 'nav.customShoots',
    'monitoramento-vigencias': 'nav.monitoringTerms',
    'lancar-requerimentos': 'nav.registerRequirements',
    'faturar-requerimentos': 'nav.billingRequirements',
    'lancar-pesquisas': 'nav.registerSurveys',
    'visualizar-pesquisas': 'nav.viewSurveys',
    'plano-acao': 'nav.actionPlan',
    'lancar-elogios': 'nav.registerCompliments',
    'enviar-elogios': 'nav.sendCompliments',
    'cadastro-taxas-clientes': 'nav.clientRates',
    'design-system': 'nav.designSystem',
    'controle-banco-horas': 'nav.controlBankHours',
    'geracao-books': 'nav.generateBooks',
    'inconsistencia-chamados': 'nav.inconsistencies',
    'organograma': 'nav.orgChart',
    'pesquisa-mensal-ams': 'nav.monthlySurveyAMS',
    'ajustes-retroativos': 'nav.retroactiveAdjustments',
    'auditoria': 'nav.auditLogs',
  };

  return (
    <nav className="flex items-center space-x-1 text-sm text-gray-600">
      <Link
        to="/admin/dashboard"
        className="flex items-center hover:text-blue-600 transition-colors"
      >
        <Home className="h-4 w-4" />
      </Link>

      {pathnames.map((name, index) => {
        const routeTo = `/${pathnames.slice(0, index + 1).join('/')}`;
        const isLast = index === pathnames.length - 1;
        const translationKey = breadcrumbKeyMap[name];
        const displayName = translationKey ? t(translationKey) : name;

        return (
          <span key={name} className="flex items-center">
            <ChevronRight className="h-4 w-4 text-gray-400" />
            {isLast ? (
              <span className="font-medium text-blue-600">{displayName}</span>
            ) : (
              <Link
                to={routeTo}
                className="hover:text-blue-600 transition-colors"
              >
                {displayName}
              </Link>
            )}
          </span>
        );
      })}
    </nav>
  );
};

export default Breadcrumb;
