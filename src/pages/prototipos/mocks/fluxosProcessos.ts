// Dados fictícios do protótipo FluxosProcessos. Nunca usar nomes/emails reais de clientes ou usuários.
import { MarkerType, type Edge, type Node } from '@xyflow/react';

export type PapelRaci = 'R' | 'A' | 'C' | 'I';
export type StatusProcesso = 'rascunho' | 'em_revisao' | 'publicado';
export type TipoNo = 'inicio' | 'fim' | 'link' | 'tarefa' | 'decisao' | 'paralelo' | 'raia';
export type PosicaoRotulo = 'acima' | 'esquerda' | 'abaixo';

export interface CargoProcesso {
  id: string;
  nome: string;
}

export interface AnexoEtapa {
  id: string;
  nome: string;
  tamanho: string;
}

export interface DocumentacaoEtapa {
  descricao: string;
  raci: Record<string, PapelRaci>;
  prazo: string;
  entradas: string[];
  saidas: string[];
  sistemas: string[];
  anexos: AnexoEtapa[];
}

export interface DadosNo {
  [chave: string]: unknown;
  rotulo: string;
  posicaoRotulo?: PosicaoRotulo;
  processoVinculadoId?: string;
  cargoId?: string;
  doc?: DocumentacaoEtapa;
}

export type NoFluxo = Node<DadosNo>;
export type ArestaFluxo = Edge;

export interface FluxoProcesso {
  nodes: NoFluxo[];
  edges: ArestaFluxo[];
}

export interface VersaoProcesso {
  versao: string;
  status: StatusProcesso;
  autor: string;
  data: string;
  observacao: string;
}

export interface Processo {
  id: string;
  codigo: string;
  nome: string;
  grupoId: string;
  status: StatusProcesso;
  versao: string;
  donoCargoId: string;
  objetivo: string;
  escopo: string;
  gatilho: string;
  indicadores: string[];
  regras: string[];
  atualizadoEm: string;
  atualizadoPor: string;
  versoes: VersaoProcesso[];
}

export interface GrupoArvore {
  id: string;
  nome: string;
  filhos: GrupoArvore[];
}

export const CARGOS: CargoProcesso[] = [
  { id: 'analista-funcional', nome: 'Analista Funcional' },
  { id: 'analista-desenvolvimento', nome: 'Analista de Desenvolvimento' },
  { id: 'central-escalacao', nome: 'Central Escalação' },
  { id: 'coordenador', nome: 'Coordenador' },
  { id: 'gerente', nome: 'Gerente' },
  { id: 'customer-success', nome: 'Customer Success' },
];

export const ARVORE_GRUPOS: GrupoArvore[] = [
  {
    id: 'raiz',
    nome: 'Sonda - Sustentação',
    filhos: [
      {
        id: 'dim-01',
        nome: 'Dimensão 01: Processos de Negócio',
        filhos: [
          {
            id: 'proc-01-1',
            nome: '01.1 Processos - Sustentação',
            filhos: [
              {
                id: 'op-fiscal',
                nome: '01-Operação Produtos Fiscal e CE+',
                filhos: [
                  { id: 'g-incidente', nome: '01. Chamado de INCIDENTE', filhos: [] },
                  { id: 'g-solicitacao', nome: '02. Chamado SOLICITAÇÃO', filhos: [] },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
];

export function docVazia(parcial: Partial<DocumentacaoEtapa> = {}): DocumentacaoEtapa {
  return {
    descricao: '',
    raci: {},
    prazo: '',
    entradas: [],
    saidas: [],
    sistemas: [],
    anexos: [],
    ...parcial,
  };
}

const tarefa = (
  id: string,
  x: number,
  y: number,
  rotulo: string,
  doc: Partial<DocumentacaoEtapa> = {}
): NoFluxo => ({
  id,
  type: 'tarefa',
  position: { x, y },
  data: { rotulo, doc: docVazia(doc) },
});

const evento = (
  id: string,
  type: 'inicio' | 'fim' | 'link',
  x: number,
  y: number,
  rotulo: string,
  extra: Partial<DadosNo> = {}
): NoFluxo => ({
  id,
  type,
  position: { x, y },
  data: { rotulo, posicaoRotulo: 'abaixo', doc: docVazia(), ...extra },
});

const gateway = (
  id: string,
  type: 'decisao' | 'paralelo',
  x: number,
  y: number,
  rotulo: string,
  criterio = '',
  posicaoRotulo: PosicaoRotulo = 'acima'
): NoFluxo => ({
  id,
  type,
  position: { x, y },
  data: { rotulo, posicaoRotulo, doc: docVazia({ descricao: criterio }) },
});

export const raia = (
  id: string,
  cargoId: string,
  x: number,
  y: number,
  width: number,
  height: number
): NoFluxo => ({
  id,
  type: 'raia',
  position: { x, y },
  width,
  height,
  zIndex: -1,
  draggable: false,
  data: { rotulo: CARGOS.find((c) => c.id === cargoId)?.nome ?? 'Nova raia', cargoId },
});

export const ESTILO_ARESTA: Partial<ArestaFluxo> = {
  type: 'smoothstep',
  markerEnd: { type: MarkerType.ArrowClosed, color: '#6b7280' },
  labelStyle: { fontSize: 11, fontWeight: 600, fill: '#374151' },
  labelBgStyle: { fill: '#ffffff' },
  labelBgPadding: [4, 2],
  labelBgBorderRadius: 4,
};

export const conexao = (
  source: string,
  sourceHandle: string,
  target: string,
  targetHandle: string,
  label?: string
): ArestaFluxo => ({
  ...ESTILO_ARESTA,
  id: `e-${source}-${target}`,
  source,
  sourceHandle,
  target,
  targetHandle,
  label,
});

// 2.2 Desenvolvimento Adicional — reproduz o diagrama BPMN de referência.
const FLUXO_DESENVOLVIMENTO_ADICIONAL: FluxoProcesso = {
  nodes: [
    raia('raia-af', 'analista-funcional', 0, 0, 1560, 480),
    evento('in-da', 'link', 90, 86, 'Desenvolvimento Adicional', { processoVinculadoId: 'p-2-1' }),
    gateway(
      'g-legal',
      'decisao',
      220,
      82,
      'É DA legal dentro do escopo do Produto?',
      'Verificar se a demanda decorre de obrigação legal coberta pelo escopo contratado do produto.'
    ),
    gateway(
      'g-embasamento',
      'decisao',
      360,
      82,
      'Foi enviado embasamento legal?',
      'Conferir se o chamado tem anexado o documento legal que fundamenta a demanda.'
    ),
    tarefa('t-solicitar', 470, 74, 'Solicitar embasamento legal', {
      descricao:
        'Solicitar ao cliente o documento legal (lei, decreto ou instrução normativa) que fundamenta a demanda de Desenvolvimento Adicional.',
      raci: { 'analista-funcional': 'R', coordenador: 'A', 'customer-success': 'I' },
      prazo: '1 dia útil',
      entradas: ['Chamado de DA sem embasamento'],
      saidas: ['Solicitação registrada no chamado'],
      sistemas: ['Aranda'],
      anexos: [{ id: 'a1', nome: 'Modelo_solicitacao_embasamento.docx', tamanho: '24 KB' }],
    }),
    tarefa('t-followup', 680, 74, 'Realizar procedimento de Follow-up (em 10 dias)', {
      descricao:
        'Acompanhar o retorno do cliente com lembretes a cada 3 dias úteis, por até 10 dias corridos.',
      raci: { 'analista-funcional': 'R', coordenador: 'A', 'customer-success': 'C' },
      prazo: '10 dias corridos',
      entradas: ['Solicitação de embasamento enviada'],
      saidas: ['Embasamento recebido ou prazo expirado'],
      sistemas: ['Aranda', 'E-mail'],
    }),
    gateway(
      'g-retorno',
      'decisao',
      900,
      82,
      'Teve retorno no prazo de 10 dias?',
      'Considerar respondido apenas se o cliente anexou o embasamento dentro do prazo.'
    ),
    tarefa('t-encerrar', 1010, 74, 'Encerrar o chamado por falta de retorno', {
      descricao:
        'Encerrar o chamado registrando a justificativa de ausência de retorno do cliente.',
      raci: { 'analista-funcional': 'R', coordenador: 'A', 'customer-success': 'I' },
      prazo: '1 dia útil',
      entradas: ['Prazo de 10 dias expirado'],
      saidas: ['Chamado encerrado com justificativa'],
      sistemas: ['Aranda'],
    }),
    evento('fim-da', 'fim', 1230, 86, 'Fim'),
    gateway(
      'g-melhoria',
      'decisao',
      220,
      222,
      'É DA de Melhoria Standard / DA Legal fora do escopo do Produto?',
      'Classificar a demanda conforme o catálogo de melhorias standard do produto.',
      'esquerda'
    ),
    gateway('p-documentacao', 'paralelo', 900, 222, ''),
    evento('out-manutencao', 'link', 224, 366, 'Manutenção e Desenvolvimento Específico', {
      processoVinculadoId: 'p-2-3',
    }),
    tarefa('t-documentacao', 848, 354, 'Montar a documentação padrão', {
      descricao:
        'Elaborar a especificação funcional a partir do template padrão, com escopo, regras e evidências do embasamento.',
      raci: { 'analista-funcional': 'R', coordenador: 'A', 'analista-desenvolvimento': 'C' },
      prazo: '3 dias úteis',
      entradas: ['Embasamento legal', 'Escopo do produto'],
      saidas: ['Documento de especificação funcional'],
      sistemas: ['Aranda', 'SharePoint'],
      anexos: [{ id: 'a2', nome: 'Template_EF_Desenvolvimento.docx', tamanho: '58 KB' }],
    }),
    tarefa('t-ic', 1050, 354, 'Alterar o IC para o de manutenção do Produto', {
      descricao:
        'Atualizar o item de configuração do chamado para a fila de manutenção do produto.',
      raci: { 'analista-funcional': 'R', coordenador: 'A' },
      prazo: 'Imediato',
      entradas: ['Documentação padrão concluída'],
      saidas: ['IC atualizado no chamado'],
      sistemas: ['Aranda'],
    }),
    tarefa(
      't-encaminhar',
      1250,
      354,
      'Encaminhar o chamado para o Analista responsável pelo desenvolvimento (se necessário)',
      {
        descricao:
          'Direcionar o chamado ao analista de desenvolvimento do produto quando houver alteração de código.',
        raci: {
          'analista-funcional': 'R',
          coordenador: 'A',
          'analista-desenvolvimento': 'I',
          'customer-success': 'I',
        },
        prazo: '1 dia útil',
        entradas: ['IC atualizado'],
        saidas: ['Chamado na fila de desenvolvimento'],
        sistemas: ['Aranda'],
      }
    ),
    evento('out-viabilidade', 'link', 1460, 366, 'Análise de Viabilidade', {
      processoVinculadoId: 'p-2-9',
    }),
  ],
  edges: [
    conexao('in-da', 'right', 'g-legal', 'left'),
    conexao('g-legal', 'right', 'g-embasamento', 'left', 'Sim'),
    conexao('g-legal', 'bottom', 'g-melhoria', 'top', 'Não'),
    conexao('g-embasamento', 'right', 't-solicitar', 'left', 'Não'),
    conexao('g-embasamento', 'bottom', 'p-documentacao', 'left', 'Sim'),
    conexao('t-solicitar', 'right', 't-followup', 'left'),
    conexao('t-followup', 'right', 'g-retorno', 'left'),
    conexao('g-retorno', 'right', 't-encerrar', 'left', 'Não'),
    conexao('g-retorno', 'bottom', 'p-documentacao', 'top', 'Sim'),
    conexao('t-encerrar', 'right', 'fim-da', 'left'),
    conexao('g-melhoria', 'right', 'p-documentacao', 'left', 'Sim'),
    conexao('g-melhoria', 'bottom', 'out-manutencao', 'top', 'Não'),
    conexao('p-documentacao', 'bottom', 't-documentacao', 'top'),
    conexao('t-documentacao', 'right', 't-ic', 'left'),
    conexao('t-ic', 'right', 't-encaminhar', 'left'),
    conexao('t-encaminhar', 'right', 'out-viabilidade', 'left'),
  ],
};

// 1.1 Atendimento INCIDENTE N1 — exemplo com duas raias.
const FLUXO_INCIDENTE_N1: FluxoProcesso = {
  nodes: [
    raia('raia-ce', 'central-escalacao', 0, 0, 980, 200),
    raia('raia-af', 'analista-funcional', 0, 200, 980, 200),
    evento('ini-inc', 'inicio', 90, 76, 'Chamado aberto'),
    tarefa('t-classificar', 190, 64, 'Classificar e priorizar o chamado', {
      descricao:
        'Classificar o incidente por produto e criticidade e definir a prioridade conforme o SLA contratado.',
      raci: { 'central-escalacao': 'R', coordenador: 'A', 'analista-funcional': 'I' },
      prazo: '30 minutos',
      entradas: ['Chamado aberto pelo cliente'],
      saidas: ['Chamado classificado e priorizado'],
      sistemas: ['Aranda'],
    }),
    gateway(
      'g-n1',
      'decisao',
      410,
      72,
      'Resolve no N1?',
      'Existe solução conhecida na base de conhecimento para o sintoma relatado?'
    ),
    tarefa('t-solucao', 530, 64, 'Aplicar solução conhecida', {
      descricao:
        'Aplicar o procedimento documentado na base de conhecimento e registrar a evidência no chamado.',
      raci: { 'central-escalacao': 'R', coordenador: 'A', 'customer-success': 'I' },
      prazo: '4 horas',
      entradas: ['Artigo da base de conhecimento'],
      saidas: ['Incidente resolvido'],
      sistemas: ['Aranda', 'Base de conhecimento'],
    }),
    evento('fim-inc', 'fim', 820, 76, 'Chamado resolvido'),
    tarefa('t-analisar', 380, 264, 'Analisar o incidente', {
      descricao: 'Reproduzir o problema em ambiente de homologação e identificar a causa raiz.',
      raci: { 'analista-funcional': 'R', coordenador: 'A', 'analista-desenvolvimento': 'C' },
      prazo: '1 dia útil',
      entradas: ['Chamado escalado pelo N1'],
      saidas: ['Diagnóstico registrado'],
      sistemas: ['Aranda'],
    }),
    tarefa('t-corrigir', 600, 264, 'Aplicar correção e validar com o cliente', {
      descricao: 'Aplicar a correção e solicitar ao cliente a validação antes de encerrar.',
      raci: { 'analista-funcional': 'R', coordenador: 'A', 'customer-success': 'C' },
      prazo: '2 dias úteis',
      entradas: ['Diagnóstico registrado'],
      saidas: ['Correção validada'],
      sistemas: ['Aranda'],
    }),
  ],
  edges: [
    conexao('ini-inc', 'right', 't-classificar', 'left'),
    conexao('t-classificar', 'right', 'g-n1', 'left'),
    conexao('g-n1', 'right', 't-solucao', 'left', 'Sim'),
    conexao('g-n1', 'bottom', 't-analisar', 'top', 'Não'),
    conexao('t-solucao', 'right', 'fim-inc', 'left'),
    conexao('t-analisar', 'right', 't-corrigir', 'left'),
    conexao('t-corrigir', 'right', 'fim-inc', 'bottom'),
  ],
};

export const FLUXOS_INICIAIS: Record<string, FluxoProcesso> = {
  'p-1-1': FLUXO_INCIDENTE_N1,
  'p-2-2': FLUXO_DESENVOLVIMENTO_ADICIONAL,
};

const processoSimples = (
  id: string,
  codigo: string,
  nome: string,
  grupoId: string,
  status: StatusProcesso,
  versao = '1.0'
): Processo => ({
  id,
  codigo,
  nome,
  grupoId,
  status,
  versao,
  donoCargoId: 'coordenador',
  objetivo: '',
  escopo: '',
  gatilho: '',
  indicadores: [],
  regras: [],
  atualizadoEm: '2026-08-14T13:00:00Z',
  atualizadoPor: 'Usuário Teste',
  versoes: [
    {
      versao,
      status,
      autor: 'Usuário Teste',
      data: '2026-08-14T13:00:00Z',
      observacao: 'Versão inicial',
    },
  ],
});

export const PROCESSOS: Processo[] = [
  {
    ...processoSimples(
      'p-1-1',
      '1.1',
      'Atendimento INCIDENTE N1',
      'g-incidente',
      'publicado',
      '1.2'
    ),
    objetivo:
      'Restabelecer o serviço do cliente o mais rápido possível, resolvendo no primeiro nível sempre que houver solução conhecida.',
    escopo: 'Incidentes abertos para os produtos Fiscal e CE+.',
    gatilho: 'Abertura de chamado do tipo Incidente.',
    indicadores: ['% de resolução no N1', 'Tempo médio de atendimento'],
    regras: [
      'Prioridade definida pelo SLA do contrato',
      'Escalar ao Analista Funcional se não houver solução conhecida',
    ],
    versoes: [
      {
        versao: '1.0',
        status: 'publicado',
        autor: 'Usuário Teste',
        data: '2025-02-03T12:00:00Z',
        observacao: 'Versão inicial',
      },
      {
        versao: '1.1',
        status: 'publicado',
        autor: 'Usuário Revisor',
        data: '2025-09-22T15:30:00Z',
        observacao: 'Inclusão da validação com o cliente',
      },
      {
        versao: '1.2',
        status: 'publicado',
        autor: 'Usuário Teste',
        data: '2026-08-14T13:00:00Z',
        observacao: 'Ajuste de prazos da classificação',
      },
    ],
  },
  processoSimples('p-1-2', '1.2', 'Consultoria', 'g-incidente', 'publicado'),
  processoSimples('p-1-3', '1.3', 'Manutenção Standard', 'g-incidente', 'em_revisao', '1.1'),
  processoSimples('p-1-4', '1.4', 'Incidente T&M', 'g-incidente', 'rascunho', '0.1'),
  processoSimples('p-2-1', '2.1', 'Atendimento SOLICITAÇÃO N1', 'g-solicitacao', 'publicado'),
  {
    ...processoSimples(
      'p-2-2',
      '2.2',
      'Desenvolvimento Adicional',
      'g-solicitacao',
      'rascunho',
      '2.0'
    ),
    objetivo:
      'Tratar solicitações de Desenvolvimento Adicional (DA), validando se a demanda é legal e está no escopo do produto antes de encaminhá-la para desenvolvimento.',
    escopo:
      'Chamados de solicitação classificados como Desenvolvimento Adicional nos produtos Fiscal e CE+.',
    gatilho: 'Chamado classificado como DA no atendimento N1 (processo 2.1).',
    indicadores: [
      '% de DAs encerradas por falta de retorno',
      'Tempo médio até a documentação padrão',
    ],
    regras: [
      'DA legal exige embasamento legal enviado pelo cliente',
      'Prazo máximo de retorno do cliente: 10 dias',
      'DA de melhoria standard segue para a manutenção do produto',
    ],
    atualizadoEm: '2026-10-02T14:20:00Z',
    versoes: [
      {
        versao: '1.0',
        status: 'publicado',
        autor: 'Usuário Teste',
        data: '2025-03-10T12:00:00Z',
        observacao: 'Versão inicial',
      },
      {
        versao: '1.1',
        status: 'publicado',
        autor: 'Usuário Revisor',
        data: '2025-11-18T16:45:00Z',
        observacao: 'Inclusão do follow-up de 10 dias',
      },
      {
        versao: '2.0',
        status: 'rascunho',
        autor: 'Usuário Teste',
        data: '2026-10-02T14:20:00Z',
        observacao: 'Revisão do fluxo de DA legal',
      },
    ],
  },
  processoSimples(
    'p-2-3',
    '2.3',
    'Manutenção e Desenvolvimento Específico',
    'g-solicitacao',
    'publicado'
  ),
  processoSimples('p-2-4', '2.4', 'Solicitação T&M', 'g-solicitacao', 'em_revisao'),
  processoSimples('p-2-5', '2.5', 'Liberação Licença \\ Pacotes CE', 'g-solicitacao', 'publicado'),
  processoSimples(
    'p-2-6',
    '2.6',
    'Levantamento de Versão \\ Orçamento',
    'g-solicitacao',
    'rascunho',
    '0.1'
  ),
  processoSimples(
    'p-2-7',
    '2.7',
    'Dúvida + Parametrização \\ Cadastro',
    'g-solicitacao',
    'publicado'
  ),
  processoSimples('p-2-8', '2.8', 'Monitoramento de DBA', 'g-solicitacao', 'publicado'),
  processoSimples('p-2-9', '2.9', 'Análise de Viabilidade', 'g-solicitacao', 'em_revisao'),
];
