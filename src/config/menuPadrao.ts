// Ordem padrão do menu lateral (Modelagem_Fase3.md, seção 12.1). A tela Organizar Menu guarda só o que
// mudou; sem nada salvo, o menu é este. Tela: a chave é a rota. Menu: a chave é fixa, porque a ordem
// salva aponta para ela. Tela nova entra aqui, no menu em que deve aparecer.
import type { NoMenu } from '@/types/menuOrganizado';

const tela = (chave: string, rotuloI18n: string, icone: string, screenKey: string): NoMenu => ({
  chave,
  tipo: 'tela',
  rotuloI18n,
  icone,
  screenKey,
});

const menu = (chave: string, rotuloI18n: string, icone: string, filhos: NoMenu[]): NoMenu => ({
  chave,
  tipo: 'menu',
  rotuloI18n,
  icone,
  filhos,
});

export const MENU_PADRAO: NoMenu[] = [
  tela('/admin/dashboard', 'nav.dashboard', 'Home', 'dashboard'),
  menu('requerimentos', 'nav.requirements', 'FileText', [
    tela(
      '/admin/lancar-requerimentos',
      'nav.registerRequirements',
      'FileText',
      'lancar_requerimentos'
    ),
    tela(
      '/admin/faturar-requerimentos',
      'nav.billingRequirements',
      'DollarSign',
      'faturar_requerimentos'
    ),
  ]),
  menu('pesquisas', 'nav.surveys', 'MessageSquare', [
    tela('/admin/lancar-pesquisas', 'nav.registerSurveys', 'FileText', 'lancar_pesquisas'),
    tela('/admin/plano-acao', 'nav.actionPlan', 'ClipboardCheck', 'plano_acao'),
    tela('/admin/visualizar-pesquisas', 'nav.viewSurveys', 'Eye', 'visualizar_pesquisas'),
    tela('/admin/pesquisa-mensal-ams', 'nav.monthlySurveyAMS', 'BarChart3', 'pesquisa_mensal_ams'),
  ]),
  menu('elogios', 'nav.compliments', 'ThumbsUp', [
    tela('/admin/lancar-elogios', 'nav.registerCompliments', 'Heart', 'lancar_elogios'),
    tela('/admin/enviar-elogios', 'nav.sendCompliments', 'Send', 'lancar_elogios'),
  ]),
  menu('comunicacao', 'nav.books', 'Speech', [
    tela('/admin/controle-disparos', 'nav.controlShoots', 'Send', 'controle_disparos'),
    tela('/admin/disparos-personalizados', 'nav.customShoots', 'Send', 'controle_disparos'),
    tela('/admin/historico-books', 'nav.historyBooks', 'BarChart3', 'historico_books'),
    tela('/admin/geracao-books', 'nav.generateBooks', 'FileText', 'geracao_books'),
    tela('/admin/controle-banco-horas', 'nav.bankHours', 'Clock', 'controle_banco_horas'),
    tela('/admin/bancos-horas', 'nav.bankHoursNew', 'Clock', 'bancos_horas_controle'),
    tela(
      '/admin/ajustes-retroativos',
      'nav.retroactiveAdjustments',
      'AlertTriangle',
      'banco_horas_ajustes_retroativos'
    ),
    tela(
      '/admin/apontamentos-retroativos',
      'nav.retroactiveNew',
      'AlertTriangle',
      'bancos_horas_retroativos'
    ),
    tela(
      '/admin/auditoria-bancos-horas',
      'nav.bankHoursAuditNew',
      'FileClock',
      'bancos_horas_auditoria'
    ),
    tela('/admin/regras-contagem', 'nav.countingRules', 'ListChecks', 'regras_contagem'),
  ]),
  menu('auditoria', 'nav.auditLogs', 'AlertTriangle', [
    tela(
      '/admin/auditoria/inconsistencia-chamados',
      'nav.inconsistencies',
      'AlertTriangle',
      'inconsistencia_chamados'
    ),
    tela(
      '/admin/auditoria/monitoramento-chamados',
      'nav.ticketMonitoring',
      'RefreshCw',
      'troca_codigo_resolucao'
    ),
  ]),
  menu('clientes', 'nav.clients', 'Building2', [
    tela('/admin/empresas-clientes', 'nav.companies', 'Building2', 'empresas_clientes'),
    tela('/admin/empresas', 'nav.companiesNew', 'Building2', 'empresas'),
    tela('/admin/produtos-modulos', 'nav.productsModules', 'Boxes', 'produtos_modulos'),
    tela('/admin/de-para-grupos', 'nav.groupMapping', 'GitMerge', 'de_para_grupos'),
    tela('/admin/ramos-atividade', 'nav.businessSectors', 'ListTree', 'ramos_atividade'),
    tela('/admin/clientes', 'nav.clientEmails', 'Contact', 'clientes'),
    tela(
      '/admin/cadastro-taxas-clientes',
      'nav.clientRates',
      'DollarSign',
      'cadastro_taxas_clientes'
    ),
  ]),
  menu('configuracoes', 'nav.emailConfig', 'Settings', [
    tela(
      '/admin/grupos-responsaveis',
      'nav.responsibleGroups',
      'UsersRound',
      'grupos_responsaveis'
    ),
    tela('/admin/email-config', 'nav.emailConfig', 'Mail', 'email-config'),
  ]),
  menu('administracao', 'nav.administration', 'Shield', [
    tela('/admin/grupos', 'nav.groups', 'Users', 'grupos'),
    tela('/admin/cadastro-usuarios', 'nav.userManagement', 'UserPlus', 'cadastro-usuarios'),
    tela('/admin/usuarios-grupos', 'nav.userGroups', 'UserCheck', 'usuarios-grupos'),
    tela('/admin/audit-logs', 'nav.auditLogs', 'History', 'audit-logs'),
    tela(
      '/admin/monitoramento-vigencias',
      'nav.monitoringTerms',
      'BarChart3',
      'monitoramento_vigencias'
    ),
    tela(
      '/admin/consultores-coordenadores',
      'nav.consultantsCoordinators',
      'Network',
      'consultores_coordenadores'
    ),
    tela(
      '/admin/rotinas-automaticas',
      'nav.automatedRoutines',
      'DatabaseZap',
      'sincronizacao_sql_server'
    ),
    tela('/admin/design-system', 'nav.designSystem', 'Palette', 'design_system'),
  ]),
];
