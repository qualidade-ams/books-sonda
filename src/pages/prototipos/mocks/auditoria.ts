// Dados FICTÍCIOS do protótipo da Auditoria do Banco de Horas (DS v2), na forma da tabela
// `auditoria_alteracoes` da Fase 1, já com os nomes legíveis que a tela mostra.

export type AcaoAuditoria = 'insert' | 'update' | 'delete';
export type OrigemAuditoria = 'app' | 'sincronizacao' | 'carga' | 'sistema';

export interface CampoAlterado {
  campo: string;
  antes: string | null;
  depois: string | null;
}

export interface RegistroAuditoriaMock {
  id: number;
  em: string; // DD/MM/AAAA HH:MM
  usuario: string | null;
  origem: OrigemAuditoria;
  /** Rótulo da tabela (ex.: "Baseline do banco") */
  area: string;
  /** Como o registro é identificado na tela */
  registro: string;
  empresa: string | null;
  banco: string | null;
  acao: AcaoAuditoria;
  campos: CampoAlterado[];
  /** Motivo, quando a ação pede (reajuste, inativação, regras de contagem) */
  motivo?: string;
}

export const AREAS_AUDITORIA = [
  'Bancos de horas',
  'Escopo do banco',
  'Baseline do banco',
  'Repasse do banco',
  'Reajustes',
  'Observações',
  'Requerimentos do banco',
  'Apontamentos retroativos',
  'Empresas',
  'Organizações do Aranda',
  'Contrato FISCAL',
  'De-para de grupos',
  'Produtos e módulos',
  'Regras de contagem',
  'Ramos de atividade',
];

const r = (
  id: number,
  em: string,
  usuario: string | null,
  origem: OrigemAuditoria,
  area: string,
  registro: string,
  empresa: string | null,
  banco: string | null,
  acao: AcaoAuditoria,
  campos: CampoAlterado[],
  motivo?: string
): RegistroAuditoriaMock => ({
  id,
  em,
  usuario,
  origem,
  area,
  registro,
  empresa,
  banco,
  acao,
  campos,
  motivo,
});

const c = (campo: string, antes: string | null, depois: string | null): CampoAlterado => ({
  campo,
  antes,
  depois,
});

export const AUDITORIA_MOCK: RegistroAuditoriaMock[] = [
  r(
    1021,
    '21/10/2026 10:12',
    'Usuário Teste',
    'app',
    'Reajustes',
    'Reajuste de Out/2026',
    'EMPRESA ALFA',
    'Banco FISCAL',
    'update',
    [c('Situação', 'Ativo', 'Inativo')],
    'Lançado em duplicidade.'
  ),
  r(
    1020,
    '21/10/2026 09:40',
    'Usuário Teste',
    'app',
    'Requerimentos do banco',
    'RF-1051402',
    'EMPRESA ALFA',
    'Banco FISCAL',
    'update',
    [c('Banco', 'FISCAL – e-DOCS', 'Banco FISCAL'), c('Classificação', 'Pelo módulo', 'Ajustada')]
  ),
  r(
    1019,
    '21/10/2026 08:15',
    null,
    'sincronizacao',
    'Empresas',
    'EMPRESA BETA',
    'EMPRESA BETA',
    null,
    'update',
    [c('E-mail do Comercial', 'comercial.antigo@exemplo.com', 'comercial.beta@exemplo.com')]
  ),
  r(
    1018,
    '21/10/2026 08:15',
    null,
    'sistema',
    'Apontamentos retroativos',
    'Set/2026 · 3 apontamentos',
    'EMPRESA ALFA',
    'Banco FISCAL',
    'insert',
    [c('Situação', null, 'Pendente'), c('Diferença', null, '+04:15')]
  ),
  r(
    1017,
    '20/10/2026 17:02',
    'Usuário Teste',
    'app',
    'Baseline do banco',
    'Baseline a partir de 11/2026',
    'EMPRESA GAMA',
    'Banco COMEX',
    'insert',
    [c('Baseline', null, '45:00/mês'), c('Vigente desde', null, '11/2026')]
  ),
  r(
    1016,
    '20/10/2026 16:48',
    'Usuário Teste',
    'app',
    'Escopo do banco',
    'Banco e-DOCS',
    'EMPRESA GAMA',
    'Banco e-DOCS',
    'update',
    [c('Produtos e módulos', 'COMPLY e-DOCS', 'COMPLY e-DOCS, COMPLY › Monitor NF-e')]
  ),
  r(
    1015,
    '20/10/2026 15:30',
    'Usuário Teste',
    'app',
    'Regras de contagem',
    'Treinamento (Banco=N |SLA=N)',
    null,
    null,
    'insert',
    [c('Conta horas', null, 'Sim'), c('Conta tickets', null, 'Não')],
    'Novo código criado no Aranda.'
  ),
  r(
    1014,
    '20/10/2026 14:05',
    'Usuário Teste',
    'app',
    'De-para de grupos',
    'AMS APL - ETL - N2',
    null,
    null,
    'update',
    [
      c('Produto', 'COMPLY', 'COMPLY'),
      c('Módulo', null, 'ETL'),
      c('Situação', 'Todos os módulos', 'Com módulo'),
    ]
  ),
  r(
    1013,
    '20/10/2026 11:20',
    'Usuário Teste',
    'app',
    'Organizações do Aranda',
    'EMPRESA ALFA INDUSTRIA LTDA',
    'EMPRESA ALFA',
    null,
    'insert',
    [c('Organização', null, 'EMPRESA ALFA INDUSTRIA LTDA')]
  ),
  r(
    1012,
    '19/10/2026 18:44',
    'Usuário Teste',
    'app',
    'Contrato FISCAL',
    'EMPRESA ALFA',
    'EMPRESA ALFA',
    null,
    'update',
    [c('DBA', 'Não contratado', 'Atendimento'), c('Horas de atendimento', null, '10:00/mês')]
  ),
  r(
    1011,
    '19/10/2026 10:02',
    'Usuário Teste',
    'app',
    'Reajustes',
    'Reajuste de Set/2026',
    'EMPRESA ALFA',
    'Banco FISCAL',
    'insert',
    [
      c('Mês', null, 'Set/2026'),
      c('Reajuste', null, '−01:00'),
      c('Situação', null, 'Aguardando retificação'),
    ],
    'Duplicidade de apontamento.'
  ),
  r(
    1010,
    '18/10/2026 14:33',
    'Usuário Teste',
    'app',
    'Observações',
    'Observação de Out/2026',
    'EMPRESA ALFA',
    'Banco FISCAL',
    'update',
    [
      c(
        'Texto',
        'Cliente pediu o detalhamento do consumo.',
        'Cliente pediu o detalhamento do consumo de outubro por módulo.'
      ),
    ]
  ),
  r(
    1009,
    '17/10/2026 09:12',
    'Usuário Teste',
    'app',
    'Repasse do banco',
    'Repasse a partir de 01/2027',
    'EMPRESA ALFA',
    'Banco COMEX',
    'insert',
    [c('Repasse', null, '70%'), c('Vigente desde', null, '01/2027')]
  ),
  r(
    1008,
    '16/10/2026 16:00',
    'Usuário Teste',
    'app',
    'Bancos de horas',
    'Banco FISCAL',
    'EMPRESA ALFA',
    'Banco FISCAL',
    'update',
    [c('Ordem', '3', '2'), c('Consome de outros bancos', 'Não', 'Sim')]
  ),
  r(
    1007,
    '16/10/2026 11:41',
    'Usuário Teste',
    'app',
    'Ramos de atividade',
    'Agronegócio',
    null,
    null,
    'insert',
    [c('Nome', null, 'Agronegócio'), c('Situação', null, 'Ativo')]
  ),
  r(
    1006,
    '15/10/2026 22:10',
    null,
    'carga',
    'Bancos de horas',
    'Banco FISCAL',
    'EMPRESA TETA',
    'Banco FISCAL',
    'insert',
    [c('Nome', null, 'Banco FISCAL'), c('Padrão', null, 'Sim'), c('Baseline', null, '50:00/mês')]
  ),
  r(
    1005,
    '15/10/2026 22:10',
    null,
    'carga',
    'Produtos e módulos',
    'COMPLY › SPED',
    null,
    null,
    'insert',
    [c('Solução', null, 'FISCAIS'), c('Produto', null, 'COMPLY'), c('Módulo', null, 'SPED')]
  ),
  r(
    1004,
    '14/10/2026 13:25',
    'Usuário Teste',
    'app',
    'Observações',
    'Observação de Set/2026',
    'EMPRESA GAMA',
    'Banco COMEX',
    'delete',
    [c('Texto', 'Conferir horas do chamado RF-1050811.', null)]
  ),
];

export const USUARIOS_AUDITORIA = ['Usuário Teste'];
