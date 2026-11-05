// Árvore e processos do site ARPO (Sonda - Sustentação), na mesma ordem do navegador do site.
import type { GrupoArvore, Processo } from '../fluxosProcessos';
import { processoArpo } from './base';

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
                  { id: 'g-solicitacao', nome: '02. Chamado SOLICITAÇÂO', filhos: [] },
                  {
                    id: 'g-03-atendimento-consultor-dedicado-fiscal',
                    nome: '03. Atendimento Consultor Dedicado - Fiscal',
                    filhos: [],
                  },
                  { id: 'g-06-desenvolvimentos', nome: '06. Desenvolvimentos', filhos: [] },
                  { id: 'g-11-aplicacao-de-notas', nome: '11. Aplicação de Notas', filhos: [] },
                  { id: 'g-12-financeiro', nome: '12. Financeiro', filhos: [] },
                  {
                    id: 'g-13-ciclo-de-versao-galllery',
                    nome: '13. Ciclo de Versão Galllery',
                    filhos: [],
                  },
                  { id: 'g-17-historico-de-fluxos', nome: '17. Histórico de fluxos', filhos: [] },
                ],
              },
              { id: 'g-arquitetura-de-informacao', nome: 'Arquitetura de Informação', filhos: [] },
              { id: 'g-coordenador', nome: 'Coordenador', filhos: [] },
              { id: 'g-diretor', nome: 'Diretor', filhos: [] },
              { id: 'g-documentacao', nome: 'Documentação', filhos: [] },
              { id: 'g-financeiro', nome: 'Financeiro', filhos: [] },
              { id: 'g-gerente', nome: 'Gerente', filhos: [] },
              {
                id: 'g-instalacao-e-ciclo-de-vida',
                nome: 'Instalação e Ciclo de Vida',
                filhos: [],
              },
              { id: 'g-portal', nome: 'Portal', filhos: [] },
              { id: 'g-saas', nome: 'SaaS', filhos: [] },
            ],
          },
        ],
      },
    ],
  },
];

export const PROCESSOS: Processo[] = [
  processoArpo('p-1-1', '1.1', 'Atendimento INCIDENTE N1', 'g-incidente'),
  processoArpo('p-1-2', '1.2', 'Consultoria', 'g-incidente'),
  processoArpo('p-1-3', '1.3', 'Manutenção Standard', 'g-incidente'),
  {
    ...processoArpo('p-1-4', '1.4', 'Incidente T&M', 'g-incidente'),
    // Anotação de texto do diagrama no ARPO.
    escopo:
      'Situações previstas para este fluxo: manutenção específica, atendimentos muito complexos',
  },
  processoArpo('p-2-1', '2.1', 'Atendimento SOLICITAÇÃO N1', 'g-solicitacao'),
  processoArpo('p-2-2', '2.2', 'Desenvolvimento Adicional', 'g-solicitacao'),
  processoArpo('p-2-3', '2.3', 'Manutenção e Desenvolvimento Específico', 'g-solicitacao'),
  {
    ...processoArpo('p-2-4', '2.4', 'Solicitação T&M', 'g-solicitacao'),
    // Anotação de texto do diagrama no ARPO.
    escopo:
      'Situações previstas para este fluxo: alocação de consultor, treinamento, overview, ultrapassa 40 horas, funcionalidade nova que o cliente nunca foi implementada, desenvolvimento/manutenção específica, rollout...',
  },
  processoArpo('p-2-5', '2.5', 'Liberação Licença \\ Pacotes CE', 'g-solicitacao'),
  processoArpo('p-2-6', '2.6', 'Levantamento de Versão \\ Orçamento', 'g-solicitacao'),
  processoArpo(
    'p-2-7',
    '2.7',
    'Dúvida + Parametrização\\Cadastro + Suporte Produto à Equipe de Projetos',
    'g-solicitacao'
  ),
  processoArpo('p-2-8', '2.8', 'Monitoramento de DBA', 'g-solicitacao'),
  processoArpo('p-2-9', '2.9', 'Desenvolvimento de Script', 'g-solicitacao'),
  processoArpo(
    'p-3-1',
    '3.1',
    'Consultor Dedicado ao Cliente',
    'g-03-atendimento-consultor-dedicado-fiscal'
  ),
  processoArpo(
    'p-3-2',
    '3.2',
    'Manutenção e Desenvolvimento Específico para Dedicados',
    'g-03-atendimento-consultor-dedicado-fiscal'
  ),
  processoArpo('p-04', '04', 'Chamado com IC Inativo', 'op-fiscal'),
  processoArpo('p-05', '05', 'Chamado Ciclo de Vida', 'op-fiscal'),
  processoArpo('p-6-1', '6.1', 'Análise de Viabilidade', 'g-06-desenvolvimentos'),
  processoArpo('p-6-2', '6.2', 'Desenvolvimento Standard', 'g-06-desenvolvimentos'),
  processoArpo('p-6-3', '6.3', 'Revisão de Notas - Produto e APP&D', 'g-06-desenvolvimentos'),
  processoArpo('p-6-4', '6.4', 'Geração de Hotfix', 'g-06-desenvolvimentos'),
  processoArpo('p-07', '07', 'Atendimentos sem chamado', 'op-fiscal'),
  processoArpo('p-08', '08', 'Escalation', 'op-fiscal'),
  processoArpo('p-09', '09', 'Books', 'op-fiscal'),
  processoArpo('p-10', '10', 'Outros Processos', 'op-fiscal'),
  processoArpo(
    'p-11-1',
    '11.1',
    'Aplicação de notas \\ licença - contratados',
    'g-11-aplicacao-de-notas'
  ),
  processoArpo(
    'p-11-2',
    '11.2',
    'Aplicação de notas \\ versão - Equipe técnica',
    'g-11-aplicacao-de-notas'
  ),
  processoArpo('p-11-3', '11.3', 'Aplicação de notas ABAP', 'g-11-aplicacao-de-notas'),
  processoArpo('p-11-4', '11.4', 'Aplicação de notas Gallery', 'g-11-aplicacao-de-notas'),
  processoArpo('p-12-1', '12.1', 'Orçamento', 'g-12-financeiro'),
  processoArpo('p-12-2', '12.2', 'Cobrança Clientes sem AMS', 'g-12-financeiro'),
  processoArpo('p-12-3', '12.3', 'Horas extras\\ Sobreaviso', 'g-12-financeiro'),
  processoArpo('p-13-1', '13.1', 'Gallery Gerador de Pacotes', 'g-13-ciclo-de-versao-galllery'),
  processoArpo('p-13-2', '13.2', 'Gallery Instalação em Cliente', 'g-13-ciclo-de-versao-galllery'),
  processoArpo('p-13-3', '13.3', 'Gallery Pacote Corretivo', 'g-13-ciclo-de-versao-galllery'),
  processoArpo('p-14', '14', 'Desalocação de Consultor', 'op-fiscal'),
  processoArpo('p-15', '15', 'Análise de Alteração Legal', 'op-fiscal'),
  processoArpo('p-16', '16', 'Passagem de Conhecimento', 'op-fiscal'),
  processoArpo(
    'p-03',
    '03',
    'Consultor Dedicado ao Cliente - OLD Histórico',
    'g-17-historico-de-fluxos'
  ),
  processoArpo('p-ciclo-de-versao-ce', '', 'Ciclo de versão - CE', 'op-fiscal'),
  processoArpo(
    'p-geracao-do-arquivo-de-instalacao-framework',
    '',
    'Geração do Arquivo de Instalação Framework',
    'op-fiscal'
  ),
  processoArpo('p-geracao-do-binario', '', 'Geração do Binário', 'op-fiscal'),
  processoArpo('p-alocacao', '', 'Alocação', 'g-arquitetura-de-informacao'),
  processoArpo(
    'p-atendimento-sem-chamado',
    '',
    'Atendimento Sem Chamado',
    'g-arquitetura-de-informacao'
  ),
  processoArpo('p-desenho', '', 'Desenho', 'g-arquitetura-de-informacao'),
  processoArpo('p-outras-solicitacoes', '', 'Outras Solicitações', 'g-documentacao'),
  processoArpo('p-produto', '', 'Produto', 'g-documentacao'),
  processoArpo(
    'p-acompanhamento-de-servicos-externos',
    '',
    'Acompanhamento de Serviços Externos',
    'g-financeiro'
  ),
  processoArpo('p-acompanhamento-mensal', '', 'Acompanhamento Mensal', 'g-financeiro'),
  processoArpo('p-alteracao-de-os', '', 'Alteração de OS', 'g-financeiro'),
  processoArpo('p-cancelamento', '', 'Cancelamento', 'g-financeiro'),
  processoArpo('p-cliente-base-instalada', '', 'Cliente Base Instalada', 'g-financeiro'),
  processoArpo('p-clientes-novos', '', 'Clientes Novos', 'g-financeiro'),
  processoArpo('p-fechamento', '', 'Fechamento', 'g-financeiro'),
  processoArpo('p-liberacao-de-licenca', '', 'Liberação de Licença', 'g-financeiro'),
  processoArpo('p-ppto', '', 'PPTO', 'g-financeiro'),
  processoArpo('p-renovacao-prorrogacao', '', 'Renovação \\ Prorrogação', 'g-financeiro'),
  processoArpo('p-time-material', '', 'Time Material', 'g-financeiro'),
  processoArpo(
    'p-criacao-de-requests-task-da',
    '',
    'Criação de requests Task DA',
    'g-instalacao-e-ciclo-de-vida'
  ),
  processoArpo(
    'p-criacao-de-requests-task-dp',
    '',
    'Criação de requests Task DP',
    'g-instalacao-e-ciclo-de-vida'
  ),
  processoArpo(
    'p-geracao-de-agrupamento-descontinuado',
    '',
    'Geração de Agrupamento (descontinuado)',
    'g-instalacao-e-ciclo-de-vida'
  ),
  processoArpo(
    'p-processo-azure-devops',
    '',
    'Processo Azure DevOps',
    'g-instalacao-e-ciclo-de-vida'
  ),
  processoArpo('p-proposta-comercial', '', 'Proposta Comercial', 'g-instalacao-e-ciclo-de-vida'),
  processoArpo('p-t-m', '', 'T&M', 'g-instalacao-e-ciclo-de-vida'),
  processoArpo('p-atendimento', '', 'Atendimento', 'g-portal'),
  processoArpo('p-atualizacao-de-conteudo', '', 'Atualizacao de conteudo', 'g-portal'),
  processoArpo('p-comunicacao', '', 'Comunicação', 'g-portal'),
  processoArpo('p-conectados', '', 'Conectados', 'g-portal'),
  processoArpo('p-criacao-e-desenvolvimento', '', 'Criacao e Desenvolvimento', 'g-portal'),
  processoArpo('p-manutencao-geral-do-portal', '', 'Manutenção geral do portal', 'g-portal'),
  processoArpo('p-atendimento-de-chamados-saas', '', 'Atendimento de chamados SaaS', 'g-saas'),
  processoArpo(
    'p-atualizacoes-periodica-dos-produtos',
    '',
    'Atualizações periódica dos Produtos',
    'g-saas'
  ),
  processoArpo('p-solicitacoes-data-center', '', 'Solicitações Data Center', 'g-saas'),
];
