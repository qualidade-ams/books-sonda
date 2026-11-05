// Fluxos do grupo 02. Chamado SOLICITAÇÂO.
// Refeitos a partir do site de processos ARPO: posições em coordenadas da imagem original.
import type { FluxoProcesso } from '../fluxosProcessos';
import {
  conexao,
  decisao,
  fim,
  inicio,
  intermediario,
  link,
  paralelo,
  raiaArpo,
  tarefa,
} from './base';

// 2.1. Atendimento SOLICITAÇÃO N1
const FLUXO_2_1: FluxoProcesso = {
  nodes: [
    raiaArpo('r1', 'analista-funcional', 23, 707, 4710),
    link('l1', 182, 128, 'Atendimento SOLICITAÇÃO N1'),
    decisao('g1', 272, 128, 'Chamado é de Projeto?'),
    decisao('g2', 272, 227, 'É chamado Filho?', {}, { posicaoRotulo: 'esquerda' }),
    tarefa(
      't1',
      272,
      353,
      'Desassociar o chamado filho do pai e informar ao consultor que não há necessidade de chamado pai. Atender o chamado do tipo Problema.',
      { raci: { 'analista-funcional': 'R' } }
    ),
    paralelo('p1', 383, 128, ''),
    decisao('g3', 509, 128, 'Cliente possui consultor Dedicado?'),
    decisao(
      'g4',
      509,
      224,
      'Chamado foi aberto pelo Consultor Dedicado?',
      {},
      { posicaoRotulo: 'esquerda' }
    ),
    decisao('g5', 509, 329, 'O chamado é de Fiscal?', {}, { posicaoRotulo: 'esquerda' }),
    tarefa(
      't2',
      509,
      485,
      'Transferir chamado para o grupo AMS APL  DEDICADOS  XX, onde XX é o nome do cliente',
      { raci: { 'analista-funcional': 'R' } }
    ),
    tarefa('t3', 632, 329, 'Transferir o chamado para o consultor dedicado', {
      raci: { 'analista-funcional': 'R' },
    }),
    paralelo('p2', 719, 128, ''),
    tarefa('t4', 845, 128, 'Avaliar descrição do chamado e evidências', {
      descricao:
        'Consultores de N1 recebe o chamado e avalia a descrição do chamado e se existe as evidências necessárias.',
      raci: { 'analista-funcional': 'R' },
    }),
    decisao('g6', 989, 128, 'Foi informado mais de um assunto distinto/ problema?'),
    tarefa(
      't5',
      989,
      242,
      'Pedir permissão para abrir chamado para o outro assunto para o cliente',
      { raci: { 'analista-funcional': 'R' } }
    ),
    decisao('g7', 989, 350, 'Cliente autorizou?', {}, { posicaoRotulo: 'esquerda' }),
    tarefa(
      't6',
      989,
      464,
      'Abrir chamado relatando o outro assunto para o Grupo, Categoria e anexos referentes',
      { raci: { 'analista-funcional': 'R' } }
    ),
    paralelo('p3', 1121, 128, ''),
    tarefa('t7', 1121, 350, 'Questionar o cliente qual dos assuntos será tratado no chamado', {
      raci: { 'analista-funcional': 'R' },
    }),
    link('l2', 1133, 464, 'Atendimento SOLICITAÇÃO N1'),
    tarefa(
      't8',
      1241,
      128,
      'Avaliar se o Grupo e a Categoria são referentes ao Produto/ Módulo mencionado na descrição',
      { raci: { 'analista-funcional': 'R' } }
    ),
    tarefa('t9', 1289, 383, 'Aterar Tipologia para Incidente', {
      raci: { 'analista-funcional': 'R' },
    }),
    paralelo('p4', 1361, 488, ''),
    link('l3', 1361, 578, 'Atendimento INCIDENTE N1', {}, { processoVinculadoId: 'p-1-1' }),
    decisao('g8', 1379, 128, 'Chamado é Solicitação?'),
    decisao('g9', 1379, 266, 'Chamado é de Projeto?', {}, { posicaoRotulo: 'abaixo' }),
    tarefa('t10', 1469, 383, 'Aterar Tipologia para Problema', {
      raci: { 'analista-funcional': 'R' },
    }),
    decisao('g10', 1559, 128, 'Chamado é de Projeto/ Cliente sem AMS ou BPO?'),
    tarefa('t11', 1559, 248, 'Verificar se o Tipo de Serviço é de Manutenção', {
      raci: { 'analista-funcional': 'R' },
    }),
    paralelo('p5', 1691, 248, ''),
    tarefa('t12', 1751, 128, 'Verificar se existe IC APL do Cliente', {
      raci: { 'analista-funcional': 'R' },
    }),
    intermediario('e1', 1781, 248, 'Cliente sem AMS'),
    intermediario('e2', 1781, 368, 'Projeto'),
    intermediario('e3', 1781, 485, 'BPO'),
    tarefa('t13', 1931, 128, 'Classificar o Tipo de Serviço como Suporte', {
      raci: { 'analista-funcional': 'R' },
    }),
    tarefa('t14', 1937, 248, 'Validar se IC de Manutenção está ativo', {
      raci: { 'analista-funcional': 'R' },
    }),
    tarefa('t15', 1937, 368, 'Verificar se IC é 000000 - PROJETOS APL', {
      raci: { 'analista-funcional': 'R' },
    }),
    tarefa('t16', 1937, 485, 'Validar se o IC é 54056 - BPO (R&D  BPO)', {
      raci: { 'analista-funcional': 'R' },
    }),
    paralelo('p6', 2087, 128, ''),
    decisao('g11', 2189, 128, 'IC de APL está ativo?'),
    tarefa(
      't17',
      2189,
      236,
      'Enviar chamado para grupo IC´s Inativos e responsável o Coordenador do Produto',
      { raci: { 'analista-funcional': 'R' } }
    ),
    link('l4', 2189, 338, 'Chamado com IC Inativo', {}, { processoVinculadoId: 'p-04' }),
    tarefa(
      't18',
      2327,
      401,
      'Verificar os campos Solicitante, Cliente, Assunto e Descrição (Ver descrição)',
      {
        descricao:
          'Se Projeto:\nSolicitante: deve ser o consultor\nCliente: [NOME DO CLIENTE] - AMS\n\nSe BPO:\nSolicitante: analista do BPO\nCliente: gestor do analista\nAssunto: [BPO] - [CLIENTE] - [OS] - [ASSUNTO]\n\n\nDescrição: Detalhar cliente , obrigação , etapa do processo , campo , print do erro',
        raci: { 'analista-funcional': 'R' },
      }
    ),
    tarefa(
      't19',
      2351,
      128,
      'Conferir se todos os campos (CATEGORIA, Cód. Resolução) estão preenchidos corretamente e corrigir se houver necessidade. Se for BPO ver descrição',
      {
        descricao: 'Código de resolução = Serviços não contratados',
        raci: { 'analista-funcional': 'R' },
      }
    ),
    decisao('g12', 2489, 128, 'Chamado é de Projeto?'),
    tarefa(
      't20',
      2537,
      278,
      'Classificar conforme a lista com os Códigos de Resolução possíveis para Projeto, para que não seja cobrado do cliente.',
      { raci: { 'analista-funcional': 'R' } }
    ),
    paralelo('p7', 2585, 128, ''),
    tarefa('t21', 2723, 128, 'Verificar evidências', { raci: { 'analista-funcional': 'R' } }),
    decisao('g13', 2867, 185, 'Necessita mais evidências?', {}, { posicaoRotulo: 'abaixo' }),
    tarefa('t22', 3005, 185, 'Solicitar mais evidências e deixar o chamado em HOLD', {
      raci: { 'analista-funcional': 'R' },
    }),
    decisao('g14', 3143, 185, 'Cliente retornou as evidências?'),
    tarefa('t23', 3143, 311, 'Realizar procedimento de Follow-up. ( em 10 dias) (ver descrição)', {
      descricao:
        'Descrever no Assunto da tarefa: FOLLOW UP 1 ou FOLLOW UP 2 ou FOLLOW UP 3\n\n1º Follow-up (segundo dia): questionar o cliente se houve algum retorno e informar que o chamado ficará aberto até o dia (contar 10 dias do envio da orientação/solução);\n\n2º Follow-up (quinto dia): questionar se houve algum retorno e reforçar que o chamado ficará aberto até o dia informado no 1º follow-up;\n\n3º Follow-up (penúltimo dia do prazo informado): informar que o chamado ficará aberto até o dia seguinte e caso não haja retorno será encerrado.',
      raci: { 'analista-funcional': 'R' },
    }),
    paralelo('p8', 3281, 185, ''),
    decisao(
      'g15',
      3281,
      311,
      'Cliente retornou evidências em até 10 dias?',
      {},
      { posicaoRotulo: 'direita' }
    ),
    tarefa('t24', 3281, 449, 'Cancelar/Encerrar Chamado (Verificar texto padrão desta tarefa)', {
      descricao:
        'Devido a solicitação estar sem evidências e não recebermos retorno após 3 notificações, estamos cancelando esse chamado. Assim que todas as evidências estiverem reunidas, peço por gentileza para que seja aberto um novo chamado e me comunique diretamente, para que eu possa encaminhar para a equipe tratar com maior brevidade possível.\n\nou\n\nDevido à falta de retorno dos contatos anteriores, seu chamado encontra-se cancelado em nosso sistema. Caso continue necessitando de suporte, solicitamos que realize a abertura de um novo chamado e insira as informações solicitadas anteriormente.',
      raci: { 'analista-funcional': 'R' },
    }),
    fim('f1', 3413, 449, 'FIM'),
    tarefa('t25', 3419, 185, 'Analisar a solicitação', { raci: { 'analista-funcional': 'R' } }),
    decisao('g16', 3557, 185, 'Chamado será atendido pelo mesmo analista do N1?'),
    tarefa(
      't26',
      3695,
      185,
      'Encaminhar o chamado para o grupo N2 correspondente ao produto/módulo',
      { raci: { 'analista-funcional': 'R' } }
    ),
    tarefa(
      't27',
      3698,
      302,
      'Encaminhar o chamado para o seu nome no grupo N2 correspondente ao produto/módulo',
      { raci: { 'analista-funcional': 'R' } }
    ),
    paralelo('p9', 3833, 185, ''),
    decisao('g17', 3929, 185, 'Existe Nota publicada no Portal para esta solicitação?'),
    tarefa('t28', 3929, 293, 'Seguir para fluxo de aplicação de Notas', {
      raci: { 'analista-funcional': 'R' },
    }),
    decisao('g18', 3929, 401, 'É produto Fiscal?', {}, { posicaoRotulo: 'esquerda' }),
    decisao('g19', 3929, 497, 'É Gallery?', {}, { posicaoRotulo: 'esquerda' }),
    link(
      'l5',
      3929,
      587,
      'Aplicação de notas/ licença contratados',
      {},
      { processoVinculadoId: 'p-11-1' }
    ),
    link('l6', 4019, 401, 'Aplicação de notas ABAP', {}, { processoVinculadoId: 'p-11-3' }),
    link('l7', 4019, 497, 'Aplicaçao de notas Gallery', {}, { processoVinculadoId: 'p-11-4' }),
    tarefa('t29', 4097, 185, 'Classificar o chamado e definir qual fluxo seguir', {
      raci: { 'analista-funcional': 'R' },
    }),
    paralelo('p10', 4235, 185, ''),
    link(
      'l8',
      4373,
      71,
      'Desenvolvimento Adicional',
      {},
      { processoVinculadoId: 'p-2-2', posicaoRotulo: 'direita' }
    ),
    link(
      'l9',
      4373,
      155,
      'Manutenção e Desenvolvimento Específico',
      {},
      { processoVinculadoId: 'p-2-3', posicaoRotulo: 'direita' }
    ),
    link(
      'l10',
      4373,
      239,
      'Solicitação T&M',
      {},
      { processoVinculadoId: 'p-2-4', posicaoRotulo: 'direita' }
    ),
    link(
      'l11',
      4373,
      323,
      'Liberação Licença/ Pacote CE',
      {},
      { processoVinculadoId: 'p-2-5', posicaoRotulo: 'direita' }
    ),
    link(
      'l12',
      4373,
      407,
      'Dúvida + Parametrização/Cadastro + Suporte Produto à Equipe de Projetos',
      {},
      { processoVinculadoId: 'p-2-7', posicaoRotulo: 'direita' }
    ),
    link(
      'l13',
      4373,
      491,
      'Levantamento de Versão/ Orçamento',
      {},
      { processoVinculadoId: 'p-2-6', posicaoRotulo: 'direita' }
    ),
    link(
      'l14',
      4373,
      575,
      'Manutenção Standard',
      {},
      { processoVinculadoId: 'p-1-3', posicaoRotulo: 'direita' }
    ),
    link(
      'l15',
      4376,
      641,
      'Manutenção e Desenvolvimento Específico para Dedicados',
      {},
      { processoVinculadoId: 'p-3-2', posicaoRotulo: 'direita' }
    ),
  ],
  edges: [
    conexao('l1', 'right', 'g1', 'left'),
    conexao('g1', 'bottom', 'g2', 'top', 'Sim'),
    conexao('g1', 'right', 'p1', 'left', 'Não'),
    conexao('g2', 'bottom', 't1', 'top', 'Sim'),
    conexao('g2', 'right', 'p1', 'bottom', 'Não'),
    conexao('t1', 'right', 'p1', 'bottom'),
    conexao('p1', 'right', 'g3', 'left'),
    conexao('g3', 'bottom', 'g4', 'top', 'Sim'),
    conexao('g3', 'right', 'p2', 'left', 'Não'),
    conexao('g4', 'bottom', 'g5', 'top', 'Não'),
    conexao('g4', 'right', 'p2', 'bottom', 'Sim'),
    conexao('g5', 'right', 't3', 'left', 'Não'),
    conexao('g5', 'bottom', 't2', 'top', 'Sim'),
    conexao('t2', 'right', 'p2', 'bottom'),
    conexao('t3', 'right', 'p2', 'bottom'),
    conexao('p2', 'right', 't4', 'left'),
    conexao('t4', 'right', 'g6', 'left'),
    conexao('g6', 'bottom', 't5', 'top', 'Sim'),
    conexao('g6', 'right', 'p3', 'left', 'Não'),
    conexao('t5', 'bottom', 'g7', 'top'),
    conexao('g7', 'bottom', 't6', 'top', 'Sim'),
    conexao('g7', 'right', 't7', 'left', 'Não'),
    conexao('t6', 'right', 'l2', 'left'),
    conexao('p3', 'right', 't8', 'left'),
    conexao('t7', 'top', 'p3', 'bottom'),
    conexao('t8', 'right', 'g8', 'left'),
    conexao('t9', 'bottom', 'p4', 'left'),
    conexao('p4', 'bottom', 'l3', 'top'),
    conexao('g8', 'bottom', 'g9', 'top', 'Não'),
    conexao('g8', 'right', 'g10', 'left', 'Sim'),
    conexao('g9', 'left', 't9', 'top', 'Não'),
    conexao('g9', 'right', 't10', 'top', 'Sim'),
    conexao('t10', 'bottom', 'p4', 'right'),
    conexao('g10', 'right', 't12', 'left', 'Não'),
    conexao('g10', 'bottom', 't11', 'top', 'Sim'),
    conexao('t11', 'right', 'p5', 'left'),
    conexao('p5', 'bottom', 'e3', 'left'),
    conexao('p5', 'right', 'e1', 'left'),
    conexao('p5', 'bottom', 'e2', 'left'),
    conexao('t12', 'right', 't13', 'left'),
    conexao('e1', 'right', 't14', 'left'),
    conexao('e2', 'right', 't15', 'left'),
    conexao('e3', 'right', 't16', 'left'),
    conexao('t13', 'right', 'p6', 'left'),
    conexao('t14', 'right', 'p6', 'bottom'),
    conexao('t15', 'right', 'p6', 'bottom'),
    conexao('t16', 'right', 'p6', 'bottom'),
    conexao('p6', 'right', 'g11', 'left'),
    conexao('g11', 'right', 't19', 'left', 'Sim'),
    conexao('g11', 'bottom', 't17', 'top', 'Não'),
    conexao('t17', 'bottom', 'l4', 'top'),
    conexao('t18', 'right', 'g12', 'left'),
    conexao('t19', 'bottom', 't18', 'top'),
    conexao('g12', 'bottom', 't20', 'top', 'Sim'),
    conexao('g12', 'right', 'p7', 'left', 'Não'),
    conexao('t20', 'right', 'p7', 'bottom'),
    conexao('p7', 'right', 't21', 'left'),
    conexao('t21', 'bottom', 'g13', 'left'),
    conexao('g13', 'right', 't22', 'left', 'Sim'),
    conexao('g13', 'top', 'p8', 'top', 'Não'),
    conexao('t22', 'right', 'g14', 'left'),
    conexao('g14', 'bottom', 't23', 'top', 'Não'),
    conexao('g14', 'right', 'p8', 'left', 'Sim'),
    conexao('t23', 'right', 'g15', 'left'),
    conexao('p8', 'right', 't25', 'left'),
    conexao('g15', 'bottom', 't24', 'top', 'Não'),
    conexao('g15', 'top', 'p8', 'bottom', 'Sim'),
    conexao('t24', 'right', 'f1', 'left'),
    conexao('t25', 'right', 'g16', 'left'),
    conexao('g16', 'bottom', 't27', 'left', 'Sim'),
    conexao('g16', 'right', 't26', 'left', 'Não'),
    conexao('t26', 'right', 'p9', 'left'),
    conexao('t27', 'right', 'p9', 'bottom'),
    conexao('p9', 'right', 'g17', 'left'),
    conexao('g17', 'right', 't29', 'left', 'Não'),
    conexao('g17', 'bottom', 't28', 'top', 'Sim'),
    conexao('t28', 'bottom', 'g18', 'top'),
    conexao('g18', 'right', 'l6', 'left', 'Não'),
    conexao('g18', 'bottom', 'g19', 'top', 'Sim'),
    conexao('g19', 'right', 'l7', 'left', 'Sim'),
    conexao('g19', 'bottom', 'l5', 'top', 'Não'),
    conexao('t29', 'right', 'p10', 'left'),
    conexao('p10', 'top', 'l8', 'left'),
    conexao('p10', 'bottom', 'l12', 'left'),
    conexao('p10', 'bottom', 'l13', 'left'),
    conexao('p10', 'bottom', 'l11', 'left'),
    conexao('p10', 'top', 'l9', 'left'),
    conexao('p10', 'bottom', 'l15', 'left'),
    conexao('p10', 'bottom', 'l14', 'left'),
    conexao('p10', 'bottom', 'l10', 'left'),
  ],
};

// 2.2 Desenvolvimento Adicional
const FLUXO_2_2: FluxoProcesso = {
  nodes: [
    raiaArpo('r1', 'analista-funcional', 23, 395, 1482),
    link('l1', 200, 128, 'Desenvolvimento Adicional'),
    decisao('g1', 317, 128, 'É DA legal dentro do escopo do Produto?'),
    decisao(
      'g2',
      317,
      224,
      'É DA de Melhoria Standard/ DA Legal fora do escopo do Produto?',
      {},
      { posicaoRotulo: 'esquerda' }
    ),
    link(
      'l2',
      317,
      314,
      'Manutenção e Desenvolvimento Específico',
      {},
      { processoVinculadoId: 'p-2-3' }
    ),
    decisao('g3', 434, 128, 'Foi enviado embasamento legal?'),
    tarefa('t1', 572, 128, 'Solicitar embasamento legal', { raci: { 'analista-funcional': 'R' } }),
    tarefa('t2', 752, 128, 'Realizar procedimento de Follow-up. (em 10 dias) (ver descrição)', {
      descricao:
        'Descrever no Assunto da tarefa: FOLLOW UP 1 ou FOLLOW UP 2 ou FOLLOW UP 3\n\n1º Follow-up (segundo dia): questionar o cliente se houve algum retorno e informar que o chamado ficará aberto até o dia (contar 10 dias do envio da orientação/solução);\n\n2º Follow-up (quinto dia): questionar se houve algum retorno e reforçar que o chamado ficará aberto até o dia informado no 1º follow-up;\n\n3º Follow-up (penúltimo dia do prazo informado): informar que o chamado ficará aberto até o dia seguinte e caso não haja retorno será encerrado.',
      raci: { 'analista-funcional': 'R' },
    }),
    decisao('g4', 890, 128, 'Teve retorno no prazo de 10 dias?'),
    paralelo('p1', 890, 224, ''),
    tarefa('t3', 890, 332, 'Montar a documentação padrão', { raci: { 'analista-funcional': 'R' } }),
    tarefa('t4', 1028, 128, 'Encerrar o chamado por falta de retorno', {
      raci: { 'analista-funcional': 'R' },
    }),
    tarefa('t5', 1070, 332, 'Alterar o IC para o de manutenção do Produto', {
      raci: { 'analista-funcional': 'R' },
    }),
    fim('f1', 1160, 128, 'FIM'),
    tarefa(
      't6',
      1250,
      332,
      'Encaminhar o chamado para o Analista responsável pelo desenvolvimento (se necessário)',
      { raci: { 'analista-funcional': 'R' } }
    ),
    link('l3', 1382, 332, 'Análise de Viabilidade', {}, { processoVinculadoId: 'p-6-1' }),
  ],
  edges: [
    conexao('l1', 'right', 'g1', 'left'),
    conexao('g1', 'bottom', 'g2', 'top', 'Não'),
    conexao('g1', 'right', 'g3', 'left', 'Sim'),
    conexao('g2', 'bottom', 'l2', 'top', 'Não'),
    conexao('g2', 'right', 'p1', 'left', 'Sim'),
    conexao('g3', 'right', 't1', 'left', 'Não'),
    conexao('g3', 'bottom', 'p1', 'left', 'Sim'),
    conexao('t1', 'right', 't2', 'left'),
    conexao('t2', 'right', 'g4', 'left'),
    conexao('g4', 'right', 't4', 'left', 'Não'),
    conexao('g4', 'bottom', 'p1', 'top', 'Sim'),
    conexao('p1', 'bottom', 't3', 'top'),
    conexao('t3', 'right', 't5', 'left'),
    conexao('t4', 'right', 'f1', 'left'),
    conexao('t5', 'right', 't6', 'left'),
    conexao('t6', 'right', 'l3', 'left'),
  ],
};

// 2.3 Manutenção e Desenvolvimento Específico
const FLUXO_2_3: FluxoProcesso = {
  nodes: [
    raiaArpo('r1', 'analista-funcional-dedicado', 23, 311, 4194),
    raiaArpo('r2', 'analista-funcional', 299, 731, 4194),
    raiaArpo('r3', 'tecnico', 716, 1208, 4194),
    link('l1', 182, 464, 'Manutenção e Desenvolvimento Específico'),
    tarefa('t1', 314, 464, 'Análisar Solicitação', {
      descricao:
        'Analisar a solicitação do cliente, verificando se trata-se de um desenvolvimento específico e sua viabilidade',
      raci: { 'analista-funcional': 'R' },
    }),
    decisao('g1', 452, 464, 'Necessária Análise Técnica?'),
    tarefa('t2', 452, 578, 'Abrir task, tarefa ou chamado filho (se necessário)', {
      raci: { 'analista-funcional': 'R' },
    }),
    tarefa('t3', 452, 869, 'Realizar Análise Técnica', { raci: { tecnico: 'R' } }),
    paralelo('p1', 548, 464, ''),
    decisao(
      'g2',
      674,
      464,
      'É Desenvolvimento ou Manutenção Específica?',
      {},
      { posicaoRotulo: 'direita' }
    ),
    decisao(
      'g3',
      674,
      563,
      'É solicitação de Dedicado e do Fiscal?',
      {},
      { posicaoRotulo: 'esquerda' }
    ),
    link('l2', 674, 653, 'Consultor Dedicado ao Cliente 1', {}, { processoVinculadoId: 'p-3-1' }),
    tarefa('t4', 800, 377, 'Classificar o chamado e definir qual fluxo seguir', {
      raci: { 'analista-funcional': 'R' },
    }),
    tarefa('t5', 833, 563, 'Realizar Orçamento Funcional', {
      descricao:
        'Realizar Orçamento Funcional e Técnico para a execução da atividade\nNeste deve conter as horas de Especificação, Desenvolvimento, Testes e Documentação',
      raci: { 'analista-funcional': 'R' },
    }),
    tarefa('t6', 833, 869, 'Realizar Orçamento Técnico', { raci: { tecnico: 'R' } }),
    paralelo('p2', 989, 476, ''),
    link(
      'l3',
      1079,
      386,
      'Manutenção Standard',
      {},
      { processoVinculadoId: 'p-1-3', posicaoRotulo: 'acima' }
    ),
    link(
      'l4',
      1079,
      476,
      'Consultoria',
      {},
      { processoVinculadoId: 'p-1-2', posicaoRotulo: 'acima' }
    ),
    link(
      'l5',
      1079,
      566,
      'Desenvolvimento Adicional',
      {},
      { processoVinculadoId: 'p-2-2', posicaoRotulo: 'acima' }
    ),
    tarefa('t7', 1262, 221, 'Solicitar aprovação do Cliente', {
      raci: { 'analista-funcional-dedicado': 'R' },
    }),
    tarefa(
      't8',
      1262,
      401,
      'Enviar Orçamento ao Coordenador de Orçamentos no grupo conforme descrição.',
      {
        descricao: 'Fiscal - AMS APL - FISCAL  ORÇAMENTOS\nComex - AMS APL - COMEX  ORÇAMENTOS',
        raci: { 'analista-funcional': 'R' },
      }
    ),
    tarefa('t9', 1262, 536, 'Salvar em PDF, o orçamento, e anexar ao chamado', {
      raci: { 'analista-funcional': 'R' },
    }),
    fim('f1', 1403, 134, 'Encerra o Chamado', {}, { posicaoRotulo: 'acima' }),
    decisao('g4', 1403, 221, 'Cliente aprovou o orçamento?', {}, { posicaoRotulo: 'abaixo' }),
    decisao(
      'g5',
      1514,
      221,
      'Será atendido pela equipe de Sustentação?',
      {},
      { posicaoRotulo: 'direita' }
    ),
    paralelo('p3', 1514, 383, ''),
    tarefa('t10', 1514, 482, 'Planejar Entrega do Desenvolvimento', {
      raci: { 'analista-funcional': 'R' },
    }),
    tarefa('t11', 1691, 104, 'Encaminhar Atividade para equipe de Projetos ou T&M', {
      raci: { 'analista-funcional-dedicado': 'R' },
    }),
    tarefa('t12', 1694, 482, 'Informar o Cliente da Data Planejada', {
      raci: { 'analista-funcional': 'R' },
    }),
    link('l6', 1853, 104, 'Solicitação T&M', {}, { processoVinculadoId: 'p-2-4' }),
    decisao('g6', 1886, 482, 'Cliente está de acordo?', {}, { posicaoRotulo: 'abaixo' }),
    tarefa('t13', 2075, 482, 'Criar Users (ME/DE) e Tasks de Desenvolvimento', {
      descricao:
        'Criar Users e Tasks de Desenvolvimento, inserindo as horas necessárias para tal, assim como a data (Sprint) adequada',
      raci: { 'analista-funcional': 'R' },
    }),
    tarefa('t14', 2261, 482, 'Criar Especificação Funcional', {
      raci: { 'analista-funcional': 'R' },
    }),
    tarefa('t15', 2261, 602, 'Transferir o chamado para o técnico, se necessário.', {
      descricao:
        'Se o chamado não for transferido, o técnico deverá saber o número do chamado para apontar as horas do desenvolvimento.',
      raci: { 'analista-funcional': 'R' },
    }),
    tarefa('t16', 2261, 1127, 'Realizar Especificação Técnica (se houver)', {
      descricao:
        'Inserir em cada task as horas orçadas e inserir cada uma delas nas datas previamente planejadas',
      raci: { tecnico: 'R' },
    }),
    tarefa('t17', 2468, 482, 'Aplicar no ambiente do cliente (se necessário)', {
      descricao: 'Produtos não ABAP.',
      raci: { 'analista-funcional': 'R' },
    }),
    paralelo('p4', 2468, 629, ''),
    decisao('g7', 2468, 803, 'Atendimento em hora extra?', {}, { posicaoRotulo: 'esquerda' }),
    tarefa(
      't18',
      2468,
      911,
      'Apontar horas no chamado e transferir para o funcional, se necessário. (ver descrição)',
      {
        descricao:
          'Apontar como Atividade Interna igual à SIM:\nSe for hora extra/ sobreaviso;\n\nApontar como Atividade Interna igual à NÃO:\nSe for em horário comercial',
        raci: { tecnico: 'R' },
      }
    ),
    tarefa('t19', 2468, 1025, 'Realizar Desenvolvimento', {
      descricao:
        'Se for ABAP o desenvolvimento deverá ser feito no ambiente do cliente.\nSe for Fiscal o desenvolvimento deverá ser feito XXXXXX.',
      raci: { tecnico: 'R' },
    }),
    paralelo('p5', 2468, 1127, ''),
    tarefa('t20', 2606, 803, 'Encaminhar horas gastas ao coordenador responsável para cobrança', {
      raci: { tecnico: 'R' },
    }),
    tarefa('t21', 2648, 482, 'Realizar testes pontuais', { raci: { 'analista-funcional': 'R' } }),
    decisao('g8', 2786, 482, 'Validação funcional OK?'),
    tarefa('t22', 2924, 482, 'Criar o Documento Homologação Específico. (Ver descrição)', {
      descricao:
        'Documento disponível no Portal de Análises\n\nDocumento Padrão de Homologação para Desenvolvimento Específico v1.docx\n\nObs.: Se o cliente tiver o documento padrão de homologação, utilizar o mesmo.',
      raci: { 'analista-funcional': 'R' },
    }),
    tarefa('t23', 3110, 482, 'Obter Aprovação do cliente', { raci: { 'analista-funcional': 'R' } }),
    decisao('g9', 3254, 482, 'Cliente aprovou?', {}, { posicaoRotulo: 'direita' }),
    tarefa('t24', 3383, 389, 'Informar o Responsável do módulo sobre finalização da demanda.', {
      raci: { 'analista-funcional': 'R' },
    }),
    tarefa('t25', 3383, 554, 'Apontar horas no chamado (ver descrição)', {
      descricao:
        'Apontar como Atividade Interna igual à SIM:\nSe for hora extra/ sobreaviso;\n\nApontar como Atividade Interna igual à NÃO:\nSe for em horário comercial',
      raci: { 'analista-funcional': 'R' },
    }),
    tarefa('t26', 3551, 389, 'Encaminhar horas gastas ao coordenador responsável para cobrança', {
      raci: { 'analista-funcional': 'R' },
    }),
    decisao('g10', 3551, 554, 'Atendimento em hora extra?', {}, { posicaoRotulo: 'abaixo' }),
    paralelo('p6', 3644, 494, ''),
    tarefa('t27', 3782, 191, 'Encerrar a demanda no SONDA Lyze e efetuar a cobrança das horas', {
      raci: { 'analista-funcional-dedicado': 'R' },
    }),
    paralelo('p7', 3782, 377, ''),
    tarefa(
      't28',
      3782,
      494,
      'Informar ao responsável pelo orçamento para encerramento da demanda',
      { raci: { 'analista-funcional': 'R' } }
    ),
    tarefa('t29', 3944, 497, 'Encerrar o chamado', { raci: { 'analista-funcional': 'R' } }),
    paralelo('p8', 4085, 497, ''),
    fim('f2', 4085, 638, ''),
  ],
  edges: [
    conexao('l1', 'right', 't1', 'left'),
    conexao('t1', 'right', 'g1', 'left'),
    conexao('g1', 'bottom', 't2', 'top', 'Sim'),
    conexao('g1', 'right', 'p1', 'left', 'Não'),
    conexao('t2', 'bottom', 't3', 'top'),
    conexao('t3', 'right', 'p1', 'bottom'),
    conexao('p1', 'right', 'g2', 'left'),
    conexao('g2', 'top', 't4', 'left', 'Não'),
    conexao('g2', 'bottom', 'g3', 'top', 'Sim'),
    conexao('g3', 'right', 't5', 'left', 'Não'),
    conexao('g3', 'bottom', 'l2', 'top', 'Sim'),
    conexao('t4', 'right', 'p2', 'left'),
    conexao('t5', 'bottom', 't6', 'top'),
    conexao('t6', 'right', 't9', 'bottom'),
    conexao('p2', 'right', 'l4', 'left'),
    conexao('p2', 'bottom', 'l5', 'left'),
    conexao('p2', 'top', 'l3', 'left'),
    conexao('t7', 'right', 'g4', 'left'),
    conexao('t8', 'top', 't7', 'bottom'),
    conexao('t9', 'top', 't8', 'bottom'),
    conexao('g4', 'top', 'f1', 'bottom', 'Não'),
    conexao('g4', 'right', 'g5', 'left', 'Sim'),
    conexao('g5', 'top', 't11', 'left', 'Não'),
    conexao('g5', 'bottom', 'p3', 'top', 'Sim'),
    conexao('p3', 'bottom', 't10', 'top'),
    conexao('t10', 'right', 't12', 'left'),
    conexao('t11', 'right', 'l6', 'left'),
    conexao('t12', 'right', 'g6', 'left'),
    conexao('g6', 'right', 't13', 'left', 'Sim'),
    conexao('g6', 'top', 'p3', 'right', 'Não'),
    conexao('t13', 'right', 't14', 'left'),
    conexao('t14', 'bottom', 't15', 'top'),
    conexao('t15', 'bottom', 't16', 'top'),
    conexao('t16', 'right', 'p5', 'left'),
    conexao('t17', 'right', 't21', 'left'),
    conexao('p4', 'top', 't17', 'bottom'),
    conexao('g7', 'right', 't20', 'left', 'Sim'),
    conexao('g7', 'top', 'p4', 'bottom', 'Não'),
    conexao('t18', 'top', 'g7', 'bottom'),
    conexao('t19', 'top', 't18', 'bottom'),
    conexao('p5', 'top', 't19', 'bottom'),
    conexao('t20', 'top', 'p4', 'right'),
    conexao('t21', 'right', 'g8', 'left'),
    conexao('g8', 'right', 't22', 'left', 'Sim'),
    conexao('g8', 'bottom', 'p5', 'right', 'Não'),
    conexao('t22', 'right', 't23', 'left'),
    conexao('t23', 'right', 'g9', 'left'),
    conexao('g9', 'top', 't24', 'left', 'Sim'),
    conexao('g9', 'bottom', 'p5', 'bottom', 'Não'),
    conexao('t24', 'bottom', 't25', 'top'),
    conexao('t25', 'right', 'g10', 'left'),
    conexao('t26', 'right', 'p6', 'top'),
    conexao('g10', 'top', 't26', 'bottom', 'Sim'),
    conexao('g10', 'right', 'p6', 'bottom', 'Não'),
    conexao('p6', 'right', 't28', 'left'),
    conexao('t27', 'right', 'p8', 'top'),
    conexao('p7', 'top', 't27', 'bottom'),
    conexao('p7', 'right', 't29', 'top'),
    conexao('t28', 'top', 'p7', 'bottom'),
    conexao('t29', 'right', 'p8', 'left'),
    conexao('p8', 'bottom', 'f2', 'top'),
  ],
};

// 2.4 Solicitação T&M
const FLUXO_2_4: FluxoProcesso = {
  nodes: [
    raiaArpo('r1', 'equipe-t-m', 23, 359, 1770),
    raiaArpo('r2', 'analista-funcional', 350, 914, 1770),
    link('l1', 182, 758, 'Solicitação T&M'),
    decisao('g1', 275, 758, 'Cliente tem AMS?', {}, { posicaoRotulo: 'abaixo' }),
    paralelo('p1', 389, 590, ''),
    decisao(
      'g2',
      389,
      758,
      'Solicitação está prevista no contrato de AMS?',
      {},
      { posicaoRotulo: 'abaixo' }
    ),
    tarefa(
      't1',
      527,
      590,
      'Enviar e-mail da demanda para o Gestor de T&M, Gestor de Projetos e Gestor Comercial para definir para quem será enviada a demanda (ver descrição)',
      {
        descricao: 'Enviar demanda para Angela Gongora (T&M) ou Gestor Comercial',
        raci: { 'analista-funcional': 'R' },
      }
    ),
    tarefa('t2', 527, 758, 'Seguir para o Fluxo de Dúvida + Parametrização/ Cadastro', {
      raci: { 'analista-funcional': 'R' },
    }),
    decisao('g3', 665, 590, 'Será tratado por T&M?'),
    link(
      'l2',
      668,
      815,
      'Dúvida + Parametrização/Cadastro + Suporte Produto à Equipe de Projetos',
      {},
      { processoVinculadoId: 'p-2-7' }
    ),
    tarefa(
      't3',
      809,
      590,
      'Enviar email ao cliente, copiando o Gestor de T&M, informando que o atendimento do chamado seguirá com a outra equipe. (ver descrição)',
      { descricao: 'Angela Gongora (T&M) ou Gestor Comercial', raci: { 'analista-funcional': 'R' } }
    ),
    tarefa(
      't4',
      809,
      761,
      'Enviar email ao cliente, copiando o Gestor de Projetos ou o Gestor Comercial, informando que o atendimento seguirá com a outra equipe. (ver descrição)',
      { raci: { 'analista-funcional': 'R' } }
    ),
    tarefa(
      't5',
      989,
      761,
      'Encerrar o chamado com o código de resolução: Consultoria (ver descrição)',
      { raci: { 'analista-funcional': 'R' } }
    ),
    tarefa('t6', 995, 470, 'Encaminhar o chamado para o Grupo AMS T&M - TIME & MATERIAL', {
      raci: { 'analista-funcional': 'R' },
    }),
    tarefa('t7', 995, 590, 'Alterar o código de resolução para Alocação T&M', {
      raci: { 'analista-funcional': 'R' },
    }),
    decisao(
      'g4',
      1055,
      188,
      'Definida a utilização do banco de horas de A.M.S.?',
      {},
      { posicaoRotulo: 'direita' }
    ),
    tarefa(
      't8',
      1337,
      122,
      'Alterar o código de resolução, no chamado para um dos que constam na descrição, para que seja descontado do banco:',
      {
        descricao:
          'AMS SAP\n\nAplicação de Nota / Licença - Contratados\n\nLevantamento de Versão / Orçamento\n\nMonitoramento DBA\n\nParametrização / Cadastro\n\nParametrização Funcionalidade\n\nNota Publicada',
        raci: { 'equipe-t-m': 'R' },
      }
    ),
    tarefa(
      't9',
      1337,
      257,
      'Alterar o código de resolução, no chamado para um dos que constam na descrição, para que NÃO seja descontado do banco:',
      {
        descricao:
          'Alocação\nAplicação de Nota ABAP\nAtualização Fiscal - Contratado\nSuporte Produto\nDesenvolvimento de Script\nDesenvolvimento Adicional Específico\nDocumentação Incompleta\nErro de programa (Produto)\nLiberação Licença / Pacote CE\nManutenção de Específico\nMelhoria ou Desenvolvimento Legal (Standard)\nServiços não Contratados',
        raci: { 'equipe-t-m': 'R' },
      }
    ),
    paralelo('p2', 1475, 188, ''),
    tarefa('t10', 1613, 188, 'Atender e encerrar o chamado', { raci: { 'equipe-t-m': 'R' } }),
    paralelo('p3', 1613, 761, ''),
    fim('f1', 1613, 851, ''),
  ],
  edges: [
    conexao('l1', 'right', 'g1', 'left'),
    conexao('g1', 'top', 'p1', 'left', 'Não'),
    conexao('g1', 'right', 'g2', 'left', 'Sim'),
    conexao('p1', 'right', 't1', 'left'),
    conexao('g2', 'right', 't2', 'left', 'Sim'),
    conexao('g2', 'top', 'p1', 'bottom', 'Não'),
    conexao('t1', 'right', 'g3', 'left'),
    conexao('t2', 'bottom', 'l2', 'left'),
    conexao('g3', 'bottom', 't4', 'left', 'Não'),
    conexao('g3', 'right', 't3', 'left', 'Sim'),
    conexao('t3', 'right', 't7', 'left'),
    conexao('t4', 'right', 't5', 'left'),
    conexao('t5', 'right', 'p3', 'left'),
    conexao('t6', 'top', 'g4', 'left'),
    conexao('t7', 'top', 't6', 'bottom'),
    conexao('g4', 'bottom', 't9', 'left', 'Não'),
    conexao('g4', 'top', 't8', 'left', 'Sim'),
    conexao('t8', 'right', 'p2', 'top'),
    conexao('t9', 'right', 'p2', 'bottom'),
    conexao('p2', 'right', 't10', 'left'),
    conexao('t10', 'bottom', 'p3', 'top'),
    conexao('p3', 'bottom', 'f1', 'top'),
  ],
};

// 2.5 Liberação Licença / Pacotes CE
const FLUXO_2_5: FluxoProcesso = {
  nodes: [
    raiaArpo('r1', 'tecnico', 23, 587, 2046),
    link('l1', 182, 191, 'Liberação Licença/ Pacote CE'),
    decisao('g1', 308, 191, 'É Produto Fiscal?'),
    tarefa('t1', 308, 302, 'Solicitar ao cliente versão CE/SAP e se utiliza Fiori', {
      raci: { tecnico: 'R' },
    }),
    fim('f1', 485, 302, 'Encerrar chamado'),
    tarefa('t2', 488, 191, 'Verificar planilha de licenças', {
      descricao:
        '\\\\corarqida02\\sft\\PWS\\PWS\\Produto\\Projects\\Transfer_Restore_11594581\\Transfer\\18-GCV\\Licenças',
      raci: { tecnico: 'R' },
    }),
    decisao('g2', 626, 191, 'Licença vigente?'),
    tarefa('t3', 626, 302, 'Informar numero do chamado anterior que possui licença vigente', {
      raci: { tecnico: 'R' },
    }),
    decisao('g3', 821, 191, 'Tem acesso a planilha gerencial renovação ajuste?'),
    paralelo('p1', 821, 365, ''),
    tarefa('t4', 821, 491, 'Solicitar nova vigencia para equipe de contratos (ver descrição)', {
      descricao: 'Erica Leite',
      raci: { tecnico: 'R' },
    }),
    decisao('g4', 974, 491, 'Cliente tem contrago vigente?', {}, { posicaoRotulo: 'abaixo' }),
    tarefa('t5', 980, 191, 'Verificar Planilha Gerencial de Renovação e Reajuste', {
      descricao:
        'Verificar Planilha Gerencial de Renovação e Reajuste, solicitar essa planilha para a Marcelle Silva dos Santos ou a Fabiane Fernandes',
      raci: { tecnico: 'R' },
    }),
    decisao('g5', 1118, 191, 'Tem contrato vigente?'),
    tarefa('t6', 1151, 491, 'Aguardar renovação do contrato', { raci: { tecnico: 'R' } }),
    paralelo('p2', 1289, 191, ''),
    paralelo('p3', 1289, 491, 'Contrato renovado?', {}, { posicaoRotulo: 'abaixo' }),
    tarefa('t7', 1385, 83, 'Abrir Task DP_Deploy', { raci: { tecnico: 'R' } }),
    paralelo('p4', 1385, 191, 'É produto Fiscal?', {}, { posicaoRotulo: 'abaixo' }),
    tarefa('t8', 1454, 491, 'Avisar no chamado para entrar em contato com o gestor comercial', {
      raci: { tecnico: 'R' },
    }),
    tarefa('t9', 1535, 191, 'Gerar licença framework', { raci: { tecnico: 'R' } }),
    tarefa('t10', 1565, 83, 'Enviar e-mail com link do Portal de Aplicativos (ver descrição)', {
      descricao:
        'Link do Portal de Aplicativos onde são disponibilizados os pacotes/agrupamentos.\nhttps://aplicativos.sonda.com/SitePages/produto3.aspx?produto=ce&page=versoes',
      raci: { tecnico: 'R' },
    }),
    tarefa('t11', 1715, 191, 'Anexar no chamado a licença e o manual', { raci: { tecnico: 'R' } }),
    tarefa('t12', 1745, 83, 'Anexar e-mail ao chamado', { raci: { tecnico: 'R' } }),
    paralelo('p5', 1841, 257, ''),
    fim('f2', 1937, 257, 'Encerrar chamado'),
  ],
  edges: [
    conexao('l1', 'right', 'g1', 'left'),
    conexao('g1', 'bottom', 't1', 'top', 'Não'),
    conexao('g1', 'right', 't2', 'left', 'Sim'),
    conexao('t1', 'bottom', 'p1', 'left'),
    conexao('t2', 'right', 'g2', 'left'),
    conexao('g2', 'bottom', 't3', 'top', 'Sim'),
    conexao('g2', 'right', 'g3', 'left', 'Não'),
    conexao('t3', 'left', 'f1', 'right'),
    conexao('g3', 'right', 't5', 'left', 'Sim'),
    conexao('g3', 'bottom', 'p1', 'top', 'Não'),
    conexao('p1', 'bottom', 't4', 'top'),
    conexao('t4', 'right', 'g4', 'left'),
    conexao('g4', 'right', 't6', 'left', 'Não'),
    conexao('g4', 'top', 'p2', 'bottom', 'Sim'),
    conexao('t5', 'right', 'g5', 'left'),
    conexao('g5', 'right', 'p2', 'left', 'Sim'),
    conexao('g5', 'bottom', 'p1', 'right', 'Não'),
    conexao('t6', 'right', 'p3', 'left'),
    conexao('p2', 'right', 'p4', 'left'),
    conexao('p3', 'right', 't8', 'left', 'Não'),
    conexao('p3', 'top', 'p2', 'bottom', 'Sim'),
    conexao('t7', 'right', 't10', 'left'),
    conexao('p4', 'top', 't7', 'bottom', 'Não'),
    conexao('p4', 'right', 't9', 'left', 'Sim'),
    conexao('t8', 'right', 'p5', 'bottom'),
    conexao('t9', 'right', 't11', 'left'),
    conexao('t10', 'right', 't12', 'left'),
    conexao('t11', 'right', 'p5', 'top'),
    conexao('t12', 'right', 'p5', 'top'),
    conexao('p5', 'right', 'f2', 'left'),
  ],
};

// 2.6 Levantamento de Versão / Orçamento
const FLUXO_2_6: FluxoProcesso = {
  nodes: [
    raiaArpo('r1', 'equipe-produto-tecnica-funcional', 23, 791, 2790),
    raiaArpo('r2', 'analista-funcional-dedicado', 776, 1052, 2790),
    link('l1', 181, 104, 'Levantamento de Versão/ Orçamento'),
    decisao('g1', 295, 104, 'Cliente é SaaS?'),
    tarefa(
      't1',
      295,
      230,
      'Coordenador equipe técnica verifica se o cliente tem atualização contratada na proposta',
      {
        descricao: 'Exemplo: Sonda, Bacaardi, BRP Bombadier, Confab, Henkel',
        raci: { 'equipe-produto-tecnica-funcional': 'R' },
      }
    ),
    decisao(
      'g2',
      295,
      356,
      'Cliente tem atualização contratada em proposta?',
      {},
      { posicaoRotulo: 'esquerda' }
    ),
    tarefa(
      't2',
      297,
      476,
      'Fazer levantamento, orçamento, criar EF, anexar ao chamado em PDF e apontar horas como INTERNO',
      { raci: { 'equipe-produto-tecnica-funcional': 'R' } }
    ),
    tarefa('t3', 297, 608, 'Verificar Fluxo Financeiro', {
      raci: { 'equipe-produto-tecnica-funcional': 'R' },
    }),
    link('l2', 297, 710, 'Orçamento', {}, { processoVinculadoId: 'p-12-1' }),
    tarefa('t4', 463, 104, 'Abrir chamado para SaaS', {
      raci: { 'equipe-produto-tecnica-funcional': 'R' },
    }),
    tarefa('t5', 472, 356, 'Realizar levantamento de esforço', {
      raci: { 'equipe-produto-tecnica-funcional': 'R' },
    }),
    link(
      'l3',
      622,
      104,
      'Atendimento SaaS',
      {},
      { processoVinculadoId: 'p-atendimento-de-chamados-saas' }
    ),
    tarefa(
      't6',
      652,
      356,
      'Atualizar chamado código de resolução Atualização Fiscal - Contratada',
      {
        descricao:
          'Código de Resolução: Atualização Fiscal - Contratada (Não sai do banco de horas - cliente já paga mensalmente)',
        raci: { 'equipe-produto-tecnica-funcional': 'R' },
      }
    ),
    tarefa(
      't7',
      832,
      356,
      'Enviar chamado para coordenação de orçamento com a quantidade de horas e informando que o cliente tem autalização contratada',
      { raci: { 'equipe-produto-tecnica-funcional': 'R' } }
    ),
    tarefa(
      't8',
      1027,
      932,
      'Coordenação de orçamento enviar orçamento ao cliente informando que o mesmo tem atualização contratada e inclui na planilha de controle',
      { raci: { 'analista-funcional-dedicado': 'R' } }
    ),
    tarefa('t9', 1207, 932, 'Coordenação responsável pelo orçamento devolve o chamado', {
      raci: { 'analista-funcional-dedicado': 'R' },
    }),
    tarefa('t10', 1345, 356, 'Verificar cronograma e alinhar com o cliente', {
      raci: { 'equipe-produto-tecnica-funcional': 'R' },
    }),
    link('l4', 1447, 488, 'Segunda etapa do fluxo Financeiro'),
    fim('f1', 1447, 647, 'Encerrar chamado'),
    tarefa('t11', 1525, 356, 'Abrir chamado filho para técnico atualizar ambiente', {
      raci: { 'equipe-produto-tecnica-funcional': 'R' },
    }),
    paralelo('p1', 1576, 566, ''),
    link(
      'l5',
      1657,
      356,
      'Aplicação de notas/ versão - Equipe Técnica',
      {},
      { processoVinculadoId: 'p-11-2', posicaoRotulo: 'acima' }
    ),
    tarefa(
      't12',
      1714,
      566,
      'Enviar e-mail para coordenação de orçamento informando a finalização da demanda',
      { raci: { 'equipe-produto-tecnica-funcional': 'R' } }
    ),
    paralelo('p2', 1747, 356, ''),
    tarefa('t13', 1885, 356, 'Funcional faz validações pontuais', {
      descricao:
        'Durante a validação do cliente, caso apresente inconsistências deve ser aberto chamado de incidentes para equipes responsáveis e aguardar retorno.',
      raci: { 'equipe-produto-tecnica-funcional': 'R' },
    }),
    tarefa(
      't14',
      1894,
      566,
      'Verificar quantidade de horas utilizadas e se necessário, atualizar orçamento enviado',
      { raci: { 'equipe-produto-tecnica-funcional': 'R' } }
    ),
    tarefa(
      't15',
      2023,
      248,
      'Abrir chamado de incidente para equipe responsável e acompanhar até resolver',
      { raci: { 'equipe-produto-tecnica-funcional': 'R' } }
    ),
    decisao('g3', 2023, 356, 'Validação OK?', {}, { posicaoRotulo: 'abaixo' }),
    tarefa('t16', 2074, 566, 'Fazer teste de tela e avisar cliente que ambiente está atualizado', {
      raci: { 'equipe-produto-tecnica-funcional': 'R' },
    }),
    paralelo('p3', 2128, 356, ''),
    paralelo('p4', 2215, 566, ''),
    tarefa('t17', 2266, 356, 'Enviar documentação para o cliente e liberar para validação', {
      raci: { 'equipe-produto-tecnica-funcional': 'R' },
    }),
    link(
      'l6',
      2287,
      503,
      'Atendimento SaaS',
      {},
      { processoVinculadoId: 'p-atendimento-de-chamados-saas', posicaoRotulo: 'acima' }
    ),
    link(
      'l7',
      2305,
      635,
      'Aplicação de notas/ versão - Equipe Técnica',
      {},
      { processoVinculadoId: 'p-11-2' }
    ),
    tarefa(
      't18',
      2404,
      248,
      'Abrir chamado de incidente para equipe responsável e acompanhar até resolver',
      {
        descricao:
          'Durante os atendimento manter a equipe de atualização em cópia dos e-mails para acompanhamento das atividades',
        raci: { 'equipe-produto-tecnica-funcional': 'R' },
      }
    ),
    decisao('g4', 2404, 356, 'Cliente validou?', {}, { posicaoRotulo: 'abaixo' }),
    tarefa('t19', 2437, 503, 'Abrir chamado para equipe SaaS atualizar PRD', {
      raci: { 'equipe-produto-tecnica-funcional': 'R' },
    }),
    tarefa('t20', 2437, 635, 'Abrir chamado filho para técnico atualizar ambiente PRD', {
      raci: { 'equipe-produto-tecnica-funcional': 'R' },
    }),
    paralelo('p5', 2500, 356, ''),
    decisao('g5', 2575, 566, 'É SaaS?', {}, { posicaoRotulo: 'esquerda' }),
    tarefa('t21', 2641, 356, 'Verificar cronograma para atualizar PRD e alinhar com o cliente', {
      raci: { 'equipe-produto-tecnica-funcional': 'R' },
    }),
  ],
  edges: [
    conexao('l1', 'right', 'g1', 'left'),
    conexao('g1', 'right', 't4', 'left', 'Sim'),
    conexao('g1', 'bottom', 't1', 'top', 'Não'),
    conexao('t1', 'bottom', 'g2', 'top'),
    conexao('g2', 'bottom', 't2', 'top', 'Não'),
    conexao('g2', 'right', 't5', 'left', 'Sim'),
    conexao('t2', 'bottom', 't3', 'top'),
    conexao('t3', 'bottom', 'l2', 'top'),
    conexao('t4', 'right', 'l3', 'left'),
    conexao('t5', 'right', 't6', 'left'),
    conexao('l3', 'right', 'p2', 'top'),
    conexao('t6', 'right', 't7', 'left'),
    conexao('t7', 'right', 't8', 'top'),
    conexao('t8', 'right', 't9', 'left'),
    conexao('t9', 'top', 't10', 'left'),
    conexao('t10', 'right', 't11', 'left'),
    conexao('t11', 'right', 'l5', 'left'),
    conexao('p1', 'bottom', 'f1', 'right'),
    conexao('p1', 'top', 'l4', 'right'),
    conexao('l5', 'right', 'p2', 'left'),
    conexao('t12', 'left', 'p1', 'right'),
    conexao('p2', 'right', 't13', 'left'),
    conexao('t13', 'right', 'g3', 'left'),
    conexao('t14', 'left', 't12', 'right'),
    conexao('t15', 'right', 'p3', 'top'),
    conexao('g3', 'top', 't15', 'bottom', 'Não'),
    conexao('g3', 'right', 'p3', 'left', 'Sim'),
    conexao('t16', 'left', 't14', 'right'),
    conexao('p3', 'right', 't17', 'left'),
    conexao('p4', 'left', 't16', 'right'),
    conexao('t17', 'right', 'g4', 'left'),
    conexao('l6', 'left', 'p4', 'top'),
    conexao('l7', 'left', 'p4', 'bottom'),
    conexao('t18', 'right', 'p5', 'top'),
    conexao('g4', 'top', 't18', 'bottom', 'Não'),
    conexao('g4', 'right', 'p5', 'left', 'Sim'),
    conexao('t19', 'left', 'l6', 'right'),
    conexao('t20', 'left', 'l7', 'right'),
    conexao('p5', 'right', 't21', 'left'),
    conexao('g5', 'bottom', 't20', 'right', 'Não'),
    conexao('g5', 'top', 't19', 'right', 'Sim'),
    conexao('t21', 'bottom', 'g5', 'right'),
  ],
};

// 2.7 Dúvida + Parametrização/Cadastro + Suporte Produto à Equipe de Projetos
const FLUXO_2_7: FluxoProcesso = {
  nodes: [
    raiaArpo('r1', 'analista-funcional', 23, 707, 4410),
    raiaArpo('r2', 'tecnico', 698, 962, 4410),
    link('l1', 245, 302, 'Dúvida + Parametrização/Cadastro + Suporte Produto à Equipe de Projetos'),
    decisao('g1', 446, 302, 'Chamado é de Projeto?'),
    tarefa(
      't1',
      446,
      410,
      'Alterar o Código de Resolução para Suporte Produto à Equipe de Projetos',
      { raci: { 'analista-funcional': 'R' } }
    ),
    paralelo('p1', 542, 302, ''),
    decisao('g2', 632, 302, 'Cliente tem contrato AMS?'),
    tarefa(
      't2',
      632,
      416,
      'Enviar e-mail informando que atendmento será cobrado em caso de consultoria (ver texto padrão)',
      {
        descricao:
          'Como seu contrato de Manutenção prevê abertura de chamados apenas para casos de Bug, caso o chamado não seja um erro e sim uma Consultoria, iremos atendê-lo e posteriormente enviaremos o faturamento das horas.\n\nSolicitamos sua aprovação para dar sequência ao atendimento, lembrando que, caso seja um Bug, o mesmo não será cobrado.',
        raci: { 'analista-funcional': 'R' },
      }
    ),
    decisao('g3', 632, 524, 'Aprovado atendimento?', {}, { posicaoRotulo: 'esquerda' }),
    tarefa('t3', 632, 632, 'Enviar notificação que o chamado será fechado', {
      raci: { 'analista-funcional': 'R' },
    }),
    paralelo('p2', 728, 302, ''),
    fim('f1', 764, 632, 'Fim'),
    tarefa('t4', 866, 302, 'Avaliar as evidencias', { raci: { 'analista-funcional': 'R' } }),
    link(
      'l2',
      875,
      119,
      'Solicitação T&M',
      {},
      { processoVinculadoId: 'p-2-4', posicaoRotulo: 'esquerda' }
    ),
    decisao(
      'g4',
      995,
      119,
      'É possível atendimento pela equipe de A.M.S.?',
      {},
      { posicaoRotulo: 'acima' }
    ),
    decisao(
      'g5',
      995,
      302,
      'É um atendimento complexo (mais de 40 horas ou consultoria complexa)?',
      {},
      { posicaoRotulo: 'abaixo' }
    ),
    tarefa(
      't6',
      1163,
      119,
      'Informar ao cliente que o atendimento é complexo (mais de 40 h) Questionar: Podemos prosseguir com o atendimento?',
      { raci: { 'analista-funcional': 'R' } }
    ),
    decisao('g6', 1301, 119, 'Cliente autorizou o atendimento?'),
    paralelo('p3', 1301, 302, ''),
    tarefa('t7', 1301, 410, 'Pesquisar conexões (ver descrição)', {
      descricao:
        'Pesquisar no Portal de Aplicativos:\nRecursos > Recursos Técnicos > Documentação > Acesso de Clientes\nhttps://aplicativos.sonda.com/Lists/Acessos%20de%20Clientes/AllItems.aspx',
      raci: { 'analista-funcional': 'R' },
    }),
    decisao('g7', 1511, 410, 'Existe acesso?', {}, { posicaoRotulo: 'direita' }),
    tarefa('t8', 1649, 350, 'Acessar o ambiente do cliente', {
      raci: { 'analista-funcional': 'R' },
    }),
    tarefa('t9', 1649, 470, 'Agendar acesso com cliente', { raci: { 'analista-funcional': 'R' } }),
    paralelo('p4', 1787, 350, ''),
    tarefa('t10', 1841, 878, 'Avaliar Demanda', { raci: { tecnico: 'R' } }),
    tarefa('t11', 1925, 350, 'Avaliar cenário', { raci: { 'analista-funcional': 'R' } }),
    tarefa('t12', 2021, 878, 'Confeccionar devolutiva', { raci: { tecnico: 'R' } }),
    decisao('g8', 2063, 350, 'Necessita time técnico?'),
    tarefa('t13', 2063, 509, 'Abrir tarefa', { raci: { 'analista-funcional': 'R' } }),
    paralelo('p5', 2159, 350, ''),
    paralelo('p6', 2159, 878, ''),
    tarefa('t14', 2297, 350, 'Confeccionar devolutiva', { raci: { 'analista-funcional': 'R' } }),
    tarefa('t15', 2297, 878, 'Apontar horas', {
      descricao: 'Apontamento de horas nas ferramentas necessárias',
      raci: { tecnico: 'R' },
    }),
    link('l3', 2396, 470, 'Solicitação T&M', {}, { processoVinculadoId: 'p-2-4' }),
    tarefa('t16', 2477, 350, 'Retornar ao cliente', { raci: { 'analista-funcional': 'R' } }),
    tarefa('t17', 2477, 878, 'Encerrar tarefa', { raci: { tecnico: 'R' } }),
    decisao('g9', 2522, 470, 'É possível atendimento pela equipe de A.M.S.?'),
    tarefa(
      't18',
      2522,
      602,
      'Informar ao cliente que o atendimento é complexo (mais de 40 h) Questionar: Podemos prosseguir com o atendimento?',
      { raci: { 'analista-funcional': 'R' } }
    ),
    fim('f2', 2609, 878, ''),
    decisao(
      'g10',
      2618,
      350,
      'É um atendimento complexo (mais de 40 horas ou consultoria complexa)?'
    ),
    paralelo('p7', 2714, 350, ''),
    decisao('g11', 2714, 602, 'Cliente autorizou o atendimento?', {}, { posicaoRotulo: 'direita' }),
    tarefa('t19', 2852, 350, 'Efetuar o atendimento', { raci: { 'analista-funcional': 'R' } }),
    tarefa('t20', 3017, 350, 'Apontar horas', {
      descricao: 'Apontamento de horas nas ferramentas necessárias',
      raci: { 'analista-funcional': 'R' },
    }),
    tarefa('t21', 3197, 350, 'Alterar status HOLD', { raci: { 'analista-funcional': 'R' } }),
    decisao('g12', 3335, 350, 'Cliente retornou se o chamado foi solucionado?'),
    tarefa('t22', 3335, 464, 'Realizar procedimento de Follow-up. (em 10 dias) (ver descrição)', {
      descricao:
        'Descrever no Assunto da tarefa: FOLLOW UP 1 ou FOLLOW UP 2 ou FOLLOW UP 3\n\n1º Follow-up (segundo dia): questionar o cliente se houve algum retorno e informar que o chamado ficará aberto até o dia (contar 10 dias do envio da orientação/solução);\n\n2º Follow-up (quinto dia): questionar se houve algum retorno e reforçar que o chamado ficará aberto até o dia informado no 1º follow-up;\n\n3º Follow-up (penúltimo dia do prazo informado): informar que o chamado ficará aberto até o dia seguinte e caso não haja retorno será encerrado.',
      raci: { 'analista-funcional': 'R' },
    }),
    decisao('g13', 3335, 578, 'Cliente retornou em 10 dias?', {}, { posicaoRotulo: 'esquerda' }),
    paralelo('p8', 3431, 350, ''),
    tarefa('t23', 3527, 239, 'Retornar status IN PROGRESS', {
      raci: { 'analista-funcional': 'R' },
    }),
    decisao('g14', 3527, 350, 'Solucionado?', {}, { posicaoRotulo: 'abaixo' }),
    tarefa('t24', 3665, 350, 'Incluir a aprovação do cliente no chamado', {
      raci: { 'analista-funcional': 'R' },
    }),
    paralelo('p9', 3803, 350, ''),
    tarefa('t25', 3941, 350, 'Preencher com a solução (ver descrição)', {
      descricao:
        'CAUSA:\nCENÁRIO:\nSOLUÇÃO PALIATIVA:\nPREVENÇÃO:\nSOLUÇÃO NA CAUSA:\nExemplo:\nCAUSA: Procedimento\nCENÁRIO: Após acessar o ambiente, verifiquei que o Evento R2098 estava indicando que não existe período em aberto. Já o Evento R2099 a Receita indicava que já exista protocolo de fechamento e por este motivo não poderia aceita um novo fechamento.\nDiante este cenário entendo que houve um erro de procedimento. Chego a este entendimento porque não localizei nenhum registro da transmissão do Evento R2098 após o envio do R5011 do dia 08/08.\nSOLUÇÃO PALIATIVA: Não aplica-se\nPREVENÇÃO: Não aplica-se.\nSOLUÇÃO NA CAUSA: ara solucionar o problema ajustei o status dos Eventos, após esta ação, consegui fazer o envio do R2099 e R5011 normalmente.',
      raci: { 'analista-funcional': 'R' },
    }),
    tarefa('t26', 4121, 350, 'Fechar o chamado', { raci: { 'analista-funcional': 'R' } }),
    fim('f3', 4253, 350, ''),
  ],
  edges: [
    conexao('l1', 'right', 'g1', 'left'),
    conexao('g1', 'bottom', 't1', 'top', 'Sim'),
    conexao('g1', 'right', 'p1', 'left', 'Não'),
    conexao('t1', 'right', 'p1', 'bottom'),
    conexao('p1', 'right', 'g2', 'left'),
    conexao('g2', 'bottom', 't2', 'top', 'Não'),
    conexao('g2', 'right', 'p2', 'left', 'Sim'),
    conexao('t2', 'bottom', 'g3', 'top'),
    conexao('g3', 'bottom', 't3', 'top', 'Não'),
    conexao('g3', 'right', 'p2', 'bottom', 'Sim'),
    conexao('t3', 'right', 'f1', 'left'),
    conexao('p2', 'right', 't4', 'left'),
    conexao('t4', 'right', 'g5', 'left'),
    conexao('g4', 'right', 't6', 'left', 'Sim'),
    conexao('g4', 'left', 'l2', 'right', 'Não'),
    conexao('g5', 'top', 'g4', 'bottom', 'Sim'),
    conexao('g5', 'right', 'p3', 'left', 'Não'),
    conexao('t6', 'right', 'g6', 'left'),
    conexao('g6', 'bottom', 'p3', 'top', 'Sim'),
    conexao('g6', 'right', 'p9', 'top', 'Não'),
    conexao('p3', 'bottom', 't7', 'top'),
    conexao('t7', 'right', 'g7', 'left'),
    conexao('g7', 'top', 't8', 'left', 'Sim'),
    conexao('g7', 'bottom', 't9', 'left', 'Não'),
    conexao('t8', 'right', 'p4', 'left'),
    conexao('t9', 'right', 'p4', 'bottom'),
    conexao('p4', 'right', 't11', 'left'),
    conexao('t10', 'right', 't12', 'left'),
    conexao('t11', 'right', 'g8', 'left'),
    conexao('t12', 'right', 'p6', 'left'),
    conexao('g8', 'bottom', 't13', 'top', 'Sim'),
    conexao('g8', 'right', 'p5', 'left', 'Não'),
    conexao('t13', 'left', 't10', 'top'),
    conexao('p5', 'right', 't14', 'left'),
    conexao('p6', 'right', 't15', 'left'),
    conexao('p6', 'top', 'p5', 'bottom'),
    conexao('t14', 'right', 't16', 'left'),
    conexao('t15', 'right', 't17', 'left'),
    conexao('t16', 'right', 'g10', 'left'),
    conexao('t17', 'right', 'f2', 'left'),
    conexao('g9', 'bottom', 't18', 'top', 'Sim'),
    conexao('g9', 'left', 'l3', 'right', 'Não'),
    conexao('t18', 'right', 'g11', 'left'),
    conexao('g10', 'bottom', 'g9', 'right', 'Sim'),
    conexao('g10', 'right', 'p7', 'left', 'Não'),
    conexao('p7', 'right', 't19', 'left'),
    conexao('g11', 'bottom', 'p9', 'bottom', 'Não'),
    conexao('g11', 'top', 'p7', 'bottom', 'Sim'),
    conexao('t19', 'right', 't20', 'left'),
    conexao('t20', 'right', 't21', 'left'),
    conexao('t21', 'right', 'g12', 'left'),
    conexao('g12', 'bottom', 't22', 'top', 'Não'),
    conexao('g12', 'right', 'p8', 'left', 'Sim'),
    conexao('t22', 'bottom', 'g13', 'top'),
    conexao('g13', 'right', 'p8', 'bottom', 'Sim'),
    conexao('g13', 'bottom', 'p9', 'bottom', 'Não'),
    conexao('p8', 'right', 'g14', 'left'),
    conexao('t23', 'left', 'p4', 'top'),
    conexao('g14', 'right', 't24', 'left', 'Sim'),
    conexao('g14', 'top', 't23', 'bottom', 'Não'),
    conexao('t24', 'right', 'p9', 'left'),
    conexao('p9', 'right', 't25', 'left'),
    conexao('t25', 'right', 't26', 'left'),
    conexao('t26', 'right', 'f3', 'left'),
  ],
};

// 2.8 Monitoramento de DBA
const FLUXO_2_8: FluxoProcesso = {
  nodes: [
    raiaArpo('r1', 'dba', 23, 767, 1602),
    inicio('i1', 182, 122, 'Inicio'),
    tarefa(
      't1',
      314,
      122,
      'Abrir chamado de solicitação mensal para ele mesmo para apontar as atividades. Cód. Resolução Monitoramento DBA',
      { raci: { dba: 'R' } }
    ),
    tarefa(
      't2',
      494,
      122,
      'Realizar o monitoramento no ambiente do cliente de acordo com a peridiocidade alinhado com o cliente',
      { raci: { dba: 'R' } }
    ),
    decisao('g1', 632, 122, 'Ocorreu erro?'),
    tarefa('t3', 632, 230, 'Destacar inconsistências para enviar ao cliente', {
      raci: { dba: 'R' },
    }),
    tarefa(
      't4',
      632,
      350,
      'Criar documento referente ao monitoramento/erros e enviar por e-mail ao cliente',
      { raci: { dba: 'R' } }
    ),
    tarefa(
      't5',
      632,
      470,
      'Verificar se cliente solicitou a atuação do nosso DBA para correção dos erros',
      { raci: { dba: 'R' } }
    ),
    decisao('g2', 632, 578, 'Solicitou nosso DBA?', {}, { posicaoRotulo: 'esquerda' }),
    tarefa('t6', 632, 686, 'Solicitar abertura de chamado solicitação ao cliente', {
      raci: { dba: 'R' },
    }),
    tarefa(
      't7',
      770,
      122,
      'Criar documento referente ao monitoramento e enviar por e-mail ao cliente',
      { raci: { dba: 'R' } }
    ),
    link('l1', 839, 686, 'Atendimento SOLICITAÇÃO N1', {}, { processoVinculadoId: 'p-2-1' }),
    paralelo('p1', 908, 122, ''),
    paralelo('p2', 1046, 686, ''),
    tarefa('t8', 1184, 686, 'Apontar tempo gasto no chamado', { raci: { dba: 'R' } }),
    tarefa('t9', 1364, 686, 'Aguardar final do mês e encerrar chamado mensal', {
      raci: { dba: 'R' },
    }),
    fim('f1', 1505, 686, 'Encerrar chamado'),
  ],
  edges: [
    conexao('i1', 'right', 't1', 'left'),
    conexao('t1', 'right', 't2', 'left'),
    conexao('t2', 'right', 'g1', 'left'),
    conexao('g1', 'right', 't7', 'left', 'Não'),
    conexao('g1', 'bottom', 't3', 'top', 'Sim'),
    conexao('t3', 'bottom', 't4', 'top'),
    conexao('t4', 'bottom', 't5', 'top'),
    conexao('t5', 'bottom', 'g2', 'top'),
    conexao('g2', 'bottom', 't6', 'top', 'Sim'),
    conexao('g2', 'right', 'p1', 'bottom', 'Não'),
    conexao('t6', 'right', 'l1', 'left'),
    conexao('t7', 'right', 'p1', 'left'),
    conexao('l1', 'right', 'p2', 'left'),
    conexao('p1', 'right', 'p2', 'top'),
    conexao('p2', 'right', 't8', 'left'),
    conexao('t8', 'right', 't9', 'left'),
    conexao('t9', 'right', 'f1', 'left'),
  ],
};

// 2.9 Desenvolvimento de Script
const FLUXO_2_9: FluxoProcesso = {
  nodes: [
    raiaArpo('r1', 'equipe-tecnica-pl-sql', 23, 287, 4494),
    raiaArpo('r2', 'analista-funcional', 275, 923, 4494),
    raiaArpo('r3', 'coordenador', 908, 1244, 4494),
    inicio('i1', 167, 647, ''),
    paralelo('p1', 257, 647, ''),
    decisao('g1', 353, 647, 'Existe Chamado?', {}, { posicaoRotulo: 'direita' }),
    tarefa('t1', 353, 803, 'Solicitar abertura do chamado solicitação', {
      raci: { 'analista-funcional': 'R' },
    }),
    decisao('g2', 560, 551, 'Tem AMS?', {}, { posicaoRotulo: 'direita' }),
    tarefa('t2', 560, 659, 'Ofertar atendimento via T&M', { raci: { 'analista-funcional': 'R' } }),
    decisao('g3', 560, 767, 'Cliente aceitou', {}, { posicaoRotulo: 'esquerda' }),
    link('l1', 560, 857, 'Solicitação T&M', {}, { processoVinculadoId: 'p-2-4' }),
    paralelo('p2', 671, 500, ''),
    decisao(
      'g4',
      788,
      500,
      'Com as evidências enviada é possível desenvolver o script?',
      {},
      { posicaoRotulo: 'abaixo' }
    ),
    tarefa('t3', 926, 425, 'Levantar todas as tabelas necessárias para elaborar o script', {
      raci: { 'analista-funcional': 'R' },
    }),
    tarefa(
      't4',
      926,
      581,
      'Solicitar mais evidências e se necessário agendar reunião para entendimento',
      { raci: { 'analista-funcional': 'R' } }
    ),
    decisao('g5', 1049, 644, 'Cliente retornou?', {}, { posicaoRotulo: 'direita' }),
    tarefa('t5', 1049, 758, 'Fazer até 3 follow-ups dentro de 10 dias (ver descrição)', {
      descricao:
        'Descrever no Assunto da tarefa: FOLLOW UP 1 ou FOLLOW UP 2 ou FOLLOW UP 3\n\n1º Follow-up (segundo dia): questionar o cliente se houve algum retorno e informar que o chamado ficará aberto até o dia (contar 10 dias do envio da orientação/solução);\n\n2º Follow-up (quinto dia): questionar se houve algum retorno e reforçar que o chamado ficará aberto até o dia informado no 1º follow-up;\n\n3º Follow-up (penúltimo dia do prazo informado): informar que o chamado ficará aberto até o dia seguinte e caso não haja retorno será encerrado.',
      raci: { 'analista-funcional': 'R' },
    }),
    decisao(
      'g6',
      1088,
      425,
      'Será necessário verificação de viabilidade?',
      {},
      { posicaoRotulo: 'direita' }
    ),
    paralelo('p3', 1220, 860, ''),
    tarefa(
      't6',
      1226,
      185,
      'PL/SQL analisa e retorna no chamado com o documento e explicações de viabilidade',
      { raci: { 'equipe-tecnica-pl-sql': 'R' } }
    ),
    tarefa('t7', 1226, 350, 'Encaminhar chamado de solicitação para análise PL/SQL', {
      raci: { 'analista-funcional': 'R' },
    }),
    paralelo('p4', 1226, 530, ''),
    fim('f1', 1310, 860, 'Encerrar o chamado', {}, { posicaoRotulo: 'direita' }),
    tarefa('t8', 1364, 530, 'Criar User e Tasks', { raci: { 'analista-funcional': 'R' } }),
    decisao('g7', 1427, 356, 'É viável?', {}, { posicaoRotulo: 'esquerda' }),
    tarefa('t9', 1544, 530, 'Criar Especificação Funcional', {
      raci: { 'analista-funcional': 'R' },
    }),
    tarefa('t10', 1601, 356, 'Retorna justificativa para o cliente e encerra o chamado', {
      raci: { 'analista-funcional': 'R' },
    }),
    tarefa('t11', 1724, 530, 'Enviar Especificação por e-mail para o cliente aprovar o escopo', {
      raci: { 'analista-funcional': 'R' },
    }),
    fim('f2', 1733, 356, 'Encerrar chamado'),
    decisao('g8', 1862, 530, 'Cliente retornou?'),
    tarefa('t12', 1862, 644, 'Fazer até 3 follow-ups dentro de 10 dias (ver descrição)', {
      descricao:
        'Descrever no Assunto da tarefa: FOLLOW UP 1 ou FOLLOW UP 2 ou FOLLOW UP 3\n\n1º Follow-up (segundo dia): questionar o cliente se houve algum retorno e informar que o chamado ficará aberto até o dia (contar 10 dias do envio da orientação/solução);\n\n2º Follow-up (quinto dia): questionar se houve algum retorno e reforçar que o chamado ficará aberto até o dia informado no 1º follow-up;\n\n3º Follow-up (penúltimo dia do prazo informado): informar que o chamado ficará aberto até o dia seguinte e caso não haja retorno será encerrado.',
      raci: { 'analista-funcional': 'R' },
    }),
    paralelo('p5', 1958, 530, ''),
    decisao('g9', 2054, 530, 'Cliente aprovou o escopo?', {}, { posicaoRotulo: 'direita' }),
    tarefa('t13', 2231, 467, 'Encaminhar chamado de solicitação para PL/SQL orçar', {
      raci: { 'analista-funcional': 'R' },
    }),
    tarefa(
      't14',
      2231,
      587,
      'Funcional ajusta a Especificação e encaminha novamente para aprovação do escopo',
      { raci: { 'analista-funcional': 'R' } }
    ),
    tarefa('t15', 2273, 1076, 'Coordenador avalia a Especificação e o orçamento', {
      raci: { coordenador: 'R' },
    }),
    tarefa(
      't16',
      2411,
      191,
      'Equipe Ténica PL/SQL faz o orçamento e retorna o chamado para o funcional orçar',
      { raci: { 'equipe-tecnica-pl-sql': 'R' } }
    ),
    tarefa('t17', 2411, 467, 'Editar orçamento, incluindo as horas funcionais', {
      raci: { 'analista-funcional': 'R' },
    }),
    tarefa(
      't18',
      2411,
      740,
      'Anexar orçamento e EF em PDF, no chamado pai, e encaminhar para coordenador ou lider com status (Acknowledged)',
      { raci: { 'analista-funcional': 'R' } }
    ),
    decisao(
      'g10',
      2411,
      1076,
      'Coordenador e/ou líder está de acordo com Especificação e orçamento?',
      {},
      { posicaoRotulo: 'direita' }
    ),
    paralelo('p6', 2549, 467, ''),
    tarefa(
      't19',
      2549,
      986,
      'Encaminhar chamado para funcional revisar a Especificação e/ou orçamento',
      { raci: { coordenador: 'R' } }
    ),
    tarefa(
      't20',
      2549,
      1160,
      'Registrar comentário no chamado, com o de acordo e seguir para o fluxo orçamento',
      { raci: { coordenador: 'R' } }
    ),
    link('l2', 2684, 1160, 'Orçamento', {}, { processoVinculadoId: 'p-12-1' }),
    tarefa('t21', 2816, 104, 'Desenvolver Script', { raci: { 'equipe-tecnica-pl-sql': 'R' } }),
    tarefa('t22', 2816, 545, 'Encaminhar chamado para desenvolvimento', {
      raci: { 'analista-funcional': 'R' },
    }),
    tarefa(
      't23',
      2816,
      1160,
      'Encaminhar chamado para Analista se for aprovado o orçamento no fluxo orçamento',
      { raci: { coordenador: 'R' } }
    ),
    tarefa('t24', 2996, 104, 'Enviar o script e passo a passo para aplicação em HML', {
      raci: { 'equipe-tecnica-pl-sql': 'R' },
    }),
    paralelo('p7', 2996, 350, ''),
    decisao('g11', 2996, 452, 'O Cliente aplica o script?', {}, { posicaoRotulo: 'esquerda' }),
    tarefa(
      't25',
      3167,
      452,
      'Enviar para o Cliente o script e passo a passo para aplicação em HML',
      { raci: { 'analista-funcional': 'R' } }
    ),
    tarefa('t26', 3167, 572, 'Solicitar autorização para aplicar em HML', {
      raci: { 'analista-funcional': 'R' },
    }),
    paralelo('p8', 3305, 512, ''),
    tarefa('t27', 3443, 182, 'PL/SQL efetua os ajustes e devolve ao funcional', {
      raci: { 'equipe-tecnica-pl-sql': 'R' },
    }),
    tarefa(
      't28',
      3443,
      512,
      'Efetuar pré validação e encaminha as evidências para o cliente validar',
      { raci: { 'analista-funcional': 'R' } }
    ),
    paralelo('p9', 3581, 182, ''),
    tarefa('t29', 3581, 389, 'Encaminhar para o PL/SQL efetuar os ajustes', {
      raci: { 'analista-funcional': 'R' },
    }),
    decisao('g12', 3581, 512, 'Script aplicado com sucesso?', {}, { posicaoRotulo: 'abaixo' }),
    tarefa('t30', 3719, 512, 'Solicitar autorização para aplicar em PRD', {
      raci: { 'analista-funcional': 'R' },
    }),
    decisao('g13', 3863, 512, 'Aplicação do script', {}, { posicaoRotulo: 'direita' }),
    tarefa('t31', 4016, 404, 'Enviar o script e passo a passo para aplicação em PRD', {
      raci: { 'analista-funcional': 'R' },
    }),
    paralelo('p10', 4016, 512, ''),
    tarefa('t32', 4016, 620, 'Aplicar o script em PRD', { raci: { 'analista-funcional': 'R' } }),
    tarefa(
      't33',
      4196,
      512,
      'Funcional efetua pré validação e encaminha as evidências para o cliente validar',
      { raci: { 'analista-funcional': 'R' } }
    ),
    tarefa('t34', 4334, 404, 'Encaminhar para o técnico efetuar os ajustes', {
      raci: { 'analista-funcional': 'R' },
    }),
    decisao('g14', 4334, 512, 'Script aplicado com sucesso?', {}, { posicaoRotulo: 'direita' }),
    fim('f3', 4334, 602, 'Encerrar o chamado', {}, { posicaoRotulo: 'direita' }),
  ],
  edges: [
    conexao('i1', 'right', 'p1', 'left'),
    conexao('p1', 'right', 'g1', 'left'),
    conexao('g1', 'bottom', 't1', 'top', 'Não'),
    conexao('g1', 'top', 'g2', 'left', 'Sim'),
    conexao('t1', 'left', 'p1', 'bottom'),
    conexao('g2', 'bottom', 't2', 'top', 'Não'),
    conexao('g2', 'top', 'p2', 'left', 'Sim'),
    conexao('t2', 'bottom', 'g3', 'top'),
    conexao('g3', 'bottom', 'l1', 'top', 'Sim'),
    conexao('g3', 'right', 'p3', 'left', 'Não'),
    conexao('p2', 'right', 'g4', 'left'),
    conexao('g4', 'top', 't3', 'left', 'Sim'),
    conexao('g4', 'bottom', 't4', 'left', 'Não'),
    conexao('t3', 'right', 'g6', 'left'),
    conexao('t4', 'right', 'g5', 'top'),
    conexao('g5', 'bottom', 't5', 'top', 'Não'),
    conexao('g5', 'left', 'p2', 'bottom', 'Sim'),
    conexao('t5', 'bottom', 'p3', 'left'),
    conexao('g6', 'top', 't7', 'left', 'Sim'),
    conexao('g6', 'bottom', 'p4', 'left', 'Não'),
    conexao('p3', 'right', 'f1', 'left'),
    conexao('t6', 'right', 'g7', 'top'),
    conexao('t7', 'top', 't6', 'bottom'),
    conexao('p4', 'right', 't8', 'left'),
    conexao('t8', 'right', 't9', 'left'),
    conexao('g7', 'right', 't10', 'left', 'Não'),
    conexao('g7', 'bottom', 'p4', 'top', 'Sim'),
    conexao('t9', 'right', 't11', 'left'),
    conexao('t10', 'right', 'f2', 'left'),
    conexao('t11', 'right', 'g8', 'left'),
    conexao('g8', 'bottom', 't12', 'top', 'Não'),
    conexao('g8', 'right', 'p5', 'left', 'Sim'),
    conexao('t12', 'bottom', 'p3', 'top'),
    conexao('p5', 'right', 'g9', 'left'),
    conexao('g9', 'top', 't13', 'left', 'Sim'),
    conexao('g9', 'bottom', 't14', 'left', 'Não'),
    conexao('t13', 'top', 't16', 'left'),
    conexao('t14', 'bottom', 'p5', 'bottom'),
    conexao('t15', 'right', 'g10', 'left'),
    conexao('t16', 'right', 'p6', 'top'),
    conexao('t17', 'bottom', 't18', 'top'),
    conexao('t18', 'left', 't15', 'top'),
    conexao('g10', 'top', 't19', 'left', 'Não'),
    conexao('g10', 'bottom', 't20', 'left', 'Sim'),
    conexao('p6', 'left', 't17', 'right'),
    conexao('t19', 'top', 'p6', 'bottom'),
    conexao('t20', 'right', 'l2', 'left'),
    conexao('l2', 'right', 't23', 'left'),
    conexao('t21', 'right', 't24', 'left'),
    conexao('t22', 'top', 't21', 'bottom'),
    conexao('t23', 'top', 't22', 'bottom'),
    conexao('t24', 'bottom', 'p7', 'top'),
    conexao('p7', 'bottom', 'g11', 'top'),
    conexao('g11', 'right', 't25', 'left', 'Sim'),
    conexao('g11', 'bottom', 't26', 'left', 'Não'),
    conexao('t25', 'right', 'p8', 'top'),
    conexao('t26', 'right', 'p8', 'bottom'),
    conexao('p8', 'right', 't28', 'left'),
    conexao('t27', 'left', 'p7', 'top'),
    conexao('t28', 'right', 'g12', 'left'),
    conexao('p9', 'left', 't27', 'right'),
    conexao('t29', 'top', 'p9', 'bottom'),
    conexao('g12', 'top', 't29', 'bottom', 'Não'),
    conexao('g12', 'right', 't30', 'left', 'Sim'),
    conexao('t30', 'right', 'g13', 'left'),
    conexao('g13', 'bottom', 't32', 'left', 'Funcional'),
    conexao('g13', 'top', 't31', 'left', 'Cliente'),
    conexao('t31', 'bottom', 'p10', 'top'),
    conexao('p10', 'right', 't33', 'left'),
    conexao('t32', 'top', 'p10', 'bottom'),
    conexao('t33', 'right', 'g14', 'left'),
    conexao('t34', 'top', 'p9', 'right'),
    conexao('g14', 'top', 't34', 'bottom', 'Não'),
    conexao('g14', 'bottom', 'f3', 'top', 'Sim'),
  ],
};

export const FLUXOS_SOLICITACAO: Record<string, FluxoProcesso> = {
  'p-2-1': FLUXO_2_1,
  'p-2-2': FLUXO_2_2,
  'p-2-3': FLUXO_2_3,
  'p-2-4': FLUXO_2_4,
  'p-2-5': FLUXO_2_5,
  'p-2-6': FLUXO_2_6,
  'p-2-7': FLUXO_2_7,
  'p-2-8': FLUXO_2_8,
  'p-2-9': FLUXO_2_9,
};
