// Menu lateral de hoje (src/components/admin/Sidebar.tsx), na ordem do código. A chave de cada tela
// é a rota, não a screenKey: duas telas podem dividir a mesma permissão (ex.: Validar e Enviar Elogios).
import {
  AlertTriangle,
  BarChart3,
  Building2,
  ClipboardCheck,
  Clock,
  Contact,
  DatabaseZap,
  DollarSign,
  Eye,
  FileText,
  Heart,
  History,
  Home,
  ListOrdered,
  Mail,
  MessageSquare,
  Palette,
  RefreshCw,
  Send,
  Settings,
  Shield,
  Speech,
  ThumbsUp,
  UserCheck,
  UserPlus,
  Users,
  UsersRound,
  type LucideIcon,
} from 'lucide-react';

export interface TelaMenuMock {
  /** Rota da tela */
  chave: string;
  rotulo: string;
  icone: LucideIcon;
}

export interface ItemMenuMock {
  /** Grupo: chave da seção; item solto (Dashboard): a rota */
  chave: string;
  rotulo: string;
  icone: LucideIcon;
  /** Sem telas, é um item solto no primeiro nível */
  telas?: TelaMenuMock[];
}

export const MENU_PADRAO_MOCK: ItemMenuMock[] = [
  { chave: '/admin/dashboard', rotulo: 'Dashboard', icone: Home },
  {
    chave: 'requerimentos',
    rotulo: 'Requerimentos',
    icone: FileText,
    telas: [
      { chave: '/admin/lancar-requerimentos', rotulo: 'Lançar Requerimentos', icone: FileText },
      { chave: '/admin/faturar-requerimentos', rotulo: 'Enviar Requerimentos', icone: DollarSign },
    ],
  },
  {
    chave: 'pesquisas',
    rotulo: 'Pesquisas de Satisfação',
    icone: MessageSquare,
    telas: [
      { chave: '/admin/lancar-pesquisas', rotulo: 'Lançar Pesquisas', icone: FileText },
      { chave: '/admin/plano-acao', rotulo: 'Plano de Ação', icone: ClipboardCheck },
      { chave: '/admin/visualizar-pesquisas', rotulo: 'Visualizar Pesquisas', icone: Eye },
      { chave: '/admin/pesquisa-mensal-ams', rotulo: 'Pesquisa Mensal AMS', icone: BarChart3 },
    ],
  },
  {
    chave: 'elogios',
    rotulo: 'Elogios',
    icone: ThumbsUp,
    telas: [
      { chave: '/admin/lancar-elogios', rotulo: 'Validar Elogios', icone: Heart },
      { chave: '/admin/enviar-elogios', rotulo: 'Enviar Elogios', icone: Send },
    ],
  },
  {
    chave: 'comunicacao',
    rotulo: 'Books',
    icone: Speech,
    telas: [
      { chave: '/admin/controle-disparos', rotulo: 'Disparos', icone: Send },
      { chave: '/admin/disparos-personalizados', rotulo: 'Disparos Personalizados', icone: Send },
      { chave: '/admin/historico-books', rotulo: 'Histórico de Books', icone: BarChart3 },
      { chave: '/admin/geracao-books', rotulo: 'Geração de Books', icone: FileText },
      { chave: '/admin/controle-banco-horas', rotulo: 'Banco de Horas', icone: Clock },
      {
        chave: '/admin/ajustes-retroativos',
        rotulo: 'Apontamentos Retroativos',
        icone: AlertTriangle,
      },
    ],
  },
  {
    chave: 'auditoria',
    rotulo: 'Auditoria',
    icone: AlertTriangle,
    telas: [
      {
        chave: '/admin/auditoria/inconsistencia-chamados',
        rotulo: 'Inconsistência de Chamados',
        icone: AlertTriangle,
      },
      {
        chave: '/admin/auditoria/monitoramento-chamados',
        rotulo: 'Monitoramento de Chamados',
        icone: RefreshCw,
      },
    ],
  },
  {
    chave: 'clientes',
    rotulo: 'Cadastro de Clientes',
    icone: Building2,
    telas: [
      { chave: '/admin/empresas-clientes', rotulo: 'Cadastro de Empresas', icone: Building2 },
      { chave: '/admin/clientes', rotulo: 'Cadastro E-mails Clientes', icone: Contact },
      {
        chave: '/admin/cadastro-taxas-clientes',
        rotulo: 'Cadastro Taxas Clientes',
        icone: DollarSign,
      },
    ],
  },
  {
    chave: 'configuracoes',
    rotulo: 'Configurações',
    icone: Settings,
    telas: [
      { chave: '/admin/grupos-responsaveis', rotulo: 'Grupos Responsáveis', icone: UsersRound },
      { chave: '/admin/email-config', rotulo: 'Template E-mails', icone: Mail },
    ],
  },
  {
    chave: 'administracao',
    rotulo: 'Administração',
    icone: Shield,
    telas: [
      { chave: '/admin/grupos', rotulo: 'Grupos de Usuários', icone: Users },
      { chave: '/admin/cadastro-usuarios', rotulo: 'Gerenciar Usuários', icone: UserPlus },
      { chave: '/admin/usuarios-grupos', rotulo: 'Atribuir Usuários', icone: UserCheck },
      { chave: '/admin/audit-logs', rotulo: 'Auditoria', icone: History },
      {
        chave: '/admin/monitoramento-vigencias',
        rotulo: 'Monitoramento Vigências',
        icone: BarChart3,
      },
      {
        chave: '/admin/sincronizacao-sql-server',
        rotulo: 'Sincronização SQL Server',
        icone: DatabaseZap,
      },
      { chave: '/admin/organizar-menu', rotulo: 'Organizar Menu', icone: ListOrdered },
      { chave: '/admin/design-system', rotulo: 'Design System', icone: Palette },
    ],
  },
];

export const ULTIMA_ALTERACAO_MOCK = { em: '21/10/2026', por: 'Usuário Teste' };

/** Cada parte do menu tem fundo e texto; o hover vale para itens e subitens */
export interface CoresMenuMock {
  menu: string;
  /** Texto do menu fora dos itens: botão Recolher */
  menuTexto: string;
  item: string;
  itemTexto: string;
  subitem: string;
  subitemTexto: string;
  hover: string;
  hoverTexto: string;
  selecionado: string;
  selecionadoTexto: string;
  /** Logo próprio do menu aberto e do recolhido; sem ele, o da Sonda */
  logo?: string;
  logoRecolhido?: string;
}

/** As cores do menu em pílula do DS v2 (decisão de 22/10/2026): selecionado azul no claro, ciano no escuro */
export const CORES_PADRAO_MOCK: Record<'claro' | 'escuro', CoresMenuMock> = {
  claro: {
    menu: '#FAFBFC',
    menuTexto: '#5F6670',
    item: '#FAFBFC',
    itemTexto: '#5F6670',
    subitem: '#FAFBFC',
    subitemTexto: '#5F6670',
    hover: '#EEF1F4',
    hoverTexto: '#1B1F24',
    selecionado: '#2563EB',
    selecionadoTexto: '#FFFFFF',
  },
  escuro: {
    menu: '#1C1C1C',
    menuTexto: '#B1B1B1',
    item: '#1C1C1C',
    itemTexto: '#B1B1B1',
    subitem: '#1C1C1C',
    subitemTexto: '#B1B1B1',
    hover: '#262626',
    hoverTexto: '#FFFFFF',
    selecionado: '#00D4E8',
    selecionadoTexto: '#000000',
  },
};
