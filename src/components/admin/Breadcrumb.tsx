import { useLocation, Link } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';

const Breadcrumb = () => {
  const location = useLocation();
  const pathnames = location.pathname.split('/').filter((x) => x);

  const breadcrumbMap: Record<string, string> = {
    admin: 'Administração',
    'cadastro-usuarios': 'Cadastro de Usuários',
    dashboard: 'Dashboard',
    'email-config': 'Configuração de E-mail',
    'user-config': 'Configurações de Usuário',
    'grupos': 'Grupos de Usuários',
    'usuarios-grupos': 'Atribuir Usuários',
    'audit-logs': 'Logs de Auditoria',
    'empresas-clientes': 'Empresas Clientes',
    'clientes': 'Cadastro E-mails Clientes',
    'grupos-responsaveis': 'Grupos Responsáveis',
    'controle-disparos': 'Controle de Disparos',
    'historico-books': 'Histórico de Books',
    'configurar-permissoes-client-books': 'Configurar Permissões - Client Books',
    'disparos-personalizados': 'Disparos Personalizados',
    'monitoramento-vigencias': 'Monitoramento de Vigências',
    'lancar-requerimentos': 'Lançar Requerimentos',
    'faturar-requerimentos': 'Faturar Requerimentos'
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
        const displayName = breadcrumbMap[name] || name;

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