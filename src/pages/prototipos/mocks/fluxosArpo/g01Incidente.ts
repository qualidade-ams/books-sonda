// Fluxos do grupo 01. Chamado de INCIDENTE.
// Refeitos a partir do site de processos ARPO: posições em coordenadas da imagem original.
import type { FluxoProcesso } from '../fluxosProcessos';
import { conexao, decisao, fim, link, paralelo, raiaArpo, tarefa } from './base';

// 1.1 Atendimento INCIDENTE N1
const FLUXO_1_1: FluxoProcesso = {
  nodes: [
    raiaArpo('r1', 'analista-funcional', 22, 670, 4554),
    link('l1', 180, 180, 'Atendimento INCIDENTE N1'),
    decisao('g1', 270, 180, 'Chamado é de Projeto?'),
    decisao('g2', 270, 288, 'É chamado Filho?', {}, { posicaoRotulo: 'esquerda' }),
    tarefa(
      't1',
      270,
      414,
      'Desassociar o chamado filho do pai e informar ao consultor que não há necessidade de chamado pai. Atender o chamado do tipo Problema.',
      { raci: { 'analista-funcional': 'R' } }
    ),
    paralelo('p1', 366, 180, ''),
    decisao('g3', 501, 180, 'Cliente possui consultor Dedicado?'),
    decisao(
      'g4',
      501,
      276,
      'Chamado foi aberto pelo Consultor Dedicado?',
      {},
      { posicaoRotulo: 'esquerda' }
    ),
    decisao('g5', 501, 396, 'O chamado é de Fiscal?', {}, { posicaoRotulo: 'esquerda' }),
    tarefa(
      't2',
      501,
      537,
      'Transferir chamado para o grupo AMS APL  DEDICADOS  XX, onde XX é o nome do cliente',
      { raci: { 'analista-funcional': 'R' } }
    ),
    tarefa('t3', 633, 396, 'Transferir o chamado para o consultor dedicado', {
      raci: { 'analista-funcional': 'R' },
    }),
    paralelo('p2', 729, 180, ''),
    tarefa('t4', 849, 180, 'Avaliar descrição do chamado e evidências', {
      descricao:
        'Consultores de N1 recebe o chamado e avalia a descrição do chamado e se existe as evidências necessárias.',
      raci: { 'analista-funcional': 'R' },
    }),
    decisao('g6', 975, 180, 'Foi informado mais de um assunto distinto/ problema?'),
    tarefa(
      't5',
      975,
      294,
      'Pedir permissão para abrir chamado para o outro assunto para o cliente',
      { raci: { 'analista-funcional': 'R' } }
    ),
    decisao('g7', 975, 402, 'Cliente autorizou?', {}, { posicaoRotulo: 'esquerda' }),
    tarefa(
      't6',
      975,
      516,
      'Abrir chamado relatando o outro assunto para o Grupo, Categoria e anexos referentes',
      { raci: { 'analista-funcional': 'R' } }
    ),
    paralelo('p3', 1113, 180, ''),
    tarefa('t7', 1113, 402, 'Questionar o cliente qual dos assuntos será tratado no chamado', {
      raci: { 'analista-funcional': 'R' },
    }),
    link('l2', 1113, 516, 'Atendimento INCIDENTE N1'),
    tarefa(
      't8',
      1227,
      180,
      'Avaliar se o Grupo e a Categoria são referentes ao Produto/ Módulo mencionado na descrição',
      { raci: { 'analista-funcional': 'R' } }
    ),
    decisao('g8', 1302, 321, 'O chamado é de BPO?'),
    decisao('g9', 1410, 180, 'Chamado é Incidente/ Problema?'),
    paralelo('p4', 1410, 390, ''),
    tarefa('t9', 1410, 498, 'Alterar Tipologia para Solicitação', {
      raci: { 'analista-funcional': 'R' },
    }),
    link('l3', 1410, 600, 'Atendimento SOLICITAÇÃO N1', {}, { processoVinculadoId: 'p-2-1' }),
    decisao('g10', 1515, 180, 'Chamado é de Projeto/ Cliente sem AMS?'),
    decisao('g11', 1515, 300, 'Chamado é de Projeto?', {}, { posicaoRotulo: 'esquerda' }),
    tarefa('t10', 1659, 180, 'Classificar o Tipo de Serviço como Suporte', {
      raci: { 'analista-funcional': 'R' },
    }),
    tarefa('t11', 1659, 300, 'Verificar se o Tipo de Serviço é de Manutenção', {
      raci: { 'analista-funcional': 'R' },
    }),
    tarefa('t12', 1659, 420, 'Verificar se o Tipo de Serviço é de Manutenção', {
      raci: { 'analista-funcional': 'R' },
    }),
    tarefa('t13', 1839, 180, 'Verificar se existe IC APL', {
      descricao:
        'Se existir IC AMS APL, o cliente tem contrato de A.M.S., caso contrato precisa classificar com IC de Manutenção.',
      raci: { 'analista-funcional': 'R' },
    }),
    tarefa(
      't14',
      1839,
      420,
      'Enviar e-mail informando que atendmento será cobrado em caso de consultoria (ver texto padrão)',
      {
        descricao:
          'Como seu contrato de Manutenção prevê abertura de chamados apenas para casos de Bug, caso o chamado não seja um erro e sim uma Consultoria, iremos atendê-lo e posteriormente enviaremos o faturamento das horas.\n\nSolicitamos sua aprovação para dar sequência ao atendimento, lembrando que, caso seja um Bug, o mesmo não será cobrado.',
        raci: { 'analista-funcional': 'R' },
      }
    ),
    decisao('g12', 1839, 528, 'Aprova atendimento?', {}, { posicaoRotulo: 'esquerda' }),
    tarefa('t15', 1857, 300, 'Verificar se IC é 000000 - PROJETOS APL', {
      raci: { 'analista-funcional': 'R' },
    }),
    paralelo('p5', 2019, 180, ''),
    tarefa('t16', 2019, 420, 'Validar se IC é de Manutenção', {
      raci: { 'analista-funcional': 'R' },
    }),
    tarefa('t17', 2019, 594, 'Enviar notificação que o chamado será fechado', {
      raci: { 'analista-funcional': 'R' },
    }),
    fim('f1', 2151, 594, 'Fim'),
    decisao('g13', 2178, 180, 'IC está Ativo?'),
    tarefa(
      't18',
      2178,
      288,
      'Enviar chamado para grupo IC´s Inativos no nome do Coordenador Responsável',
      { raci: { 'analista-funcional': 'R' } }
    ),
    link('l4', 2178, 390, 'Chamado com IC Inativo', {}, { processoVinculadoId: 'p-04' }),
    decisao('g14', 2385, 180, 'Cliente tem contrato AMS?'),
    tarefa(
      't19',
      2385,
      288,
      'Enviar e-mail informando que atendmento será cobrado em caso de consultoria (ver texto padrão)',
      {
        descricao:
          'Como seu contrato de Manutenção prevê abertura de chamados apenas para casos de Bug, caso o chamado não seja um erro e sim uma Consultoria, iremos atendê-lo e posteriormente enviaremos o faturamento das horas.\n\nSolicitamos sua aprovação para dar sequência ao atendimento, lembrando que, caso seja um Bug, o mesmo não será cobrado.',
        raci: { 'analista-funcional': 'R' },
      }
    ),
    decisao('g15', 2385, 396, 'Aprova atendimento?', {}, { posicaoRotulo: 'esquerda' }),
    tarefa('t20', 2385, 504, 'Enviar notificação que o chamado será fechado', {
      raci: { 'analista-funcional': 'R' },
    }),
    fim('f2', 2385, 606, 'Fim', {}, { posicaoRotulo: 'esquerda' }),
    paralelo('p6', 2526, 180, ''),
    tarefa('t21', 2670, 180, 'Validar Categoria e Código de Resolução', {
      raci: { 'analista-funcional': 'R' },
    }),
    tarefa('t22', 2850, 180, 'Verificar Evidências', { raci: { 'analista-funcional': 'R' } }),
    decisao('g16', 2994, 180, 'Necessita mais evidências?', {}, { posicaoRotulo: 'abaixo' }),
    tarefa('t23', 3132, 180, 'Solicitar evidência e mudar status para Hold', {
      raci: { 'analista-funcional': 'R' },
    }),
    decisao('g17', 3270, 180, 'Cliente retorno as evidências'),
    tarefa('t24', 3270, 333, 'Realizar procedimento de Follow-up. (em 10 dias) (ver descrição)', {
      descricao:
        'Descrever no Assunto da tarefa: FOLLOW UP 1 ou FOLLOW UP 2 ou FOLLOW UP 3\n\n1º Follow-up (segundo dia): questionar o cliente se houve algum retorno e informar que o chamado ficará aberto até o dia (contar 10 dias do envio da orientação/solução);\n\n2º Follow-up (quinto dia): questionar se houve algum retorno e reforçar que o chamado ficará aberto até o dia informado no 1º follow-up;\n\n3º Follow-up (penúltimo dia do prazo informado): informar que o chamado ficará aberto até o dia seguinte e caso não haja retorno será encerrado.',
      raci: { 'analista-funcional': 'R' },
    }),
    paralelo('p7', 3426, 180, ''),
    decisao(
      'g18',
      3426,
      333,
      'Cliente retornou evidências em até 10 dias?',
      {},
      { posicaoRotulo: 'direita' }
    ),
    tarefa('t25', 3426, 444, 'Cancelar/Encerrar Chamado (Verificar texto padrão desta tarefa)', {
      descricao:
        'Devido a solicitação estar sem evidências e não recebermos retorno após 3 notificações, estamos cancelando esse chamado. Assim que todas as evidências estiverem reunidas, peço por gentileza para que seja aberto um novo chamado e me comunique diretamente, para que eu possa encaminhar para a equipe tratar com maior brevidade possível.\n\nou\n\nDevido à falta de retorno dos contatos anteriores, seu chamado encontra-se cancelado em nosso sistema. Caso continue necessitando de suporte, solicitamos que realize a abertura de um novo chamado e insira as informações solicitadas anteriormente.',
      raci: { 'analista-funcional': 'R' },
    }),
    fim('f3', 3426, 546, 'Fim'),
    tarefa('t26', 3576, 180, 'Análisar o erro', { raci: { 'analista-funcional': 'R' } }),
    decisao('g19', 3714, 180, 'Chamado será atendido pelo mesmo analista do N1?', {
      descricao: 'Atendimento rápido e pode ser feito pela equipe de N1?',
    }),
    tarefa(
      't27',
      3852,
      180,
      'Encaminhar o chamado para o grupo N2 correspondente ao produto/módulo',
      {
        descricao:
          'Encaminhar o chamado para atendimento do grupo N2. Selecionar o produto/módulo correto.',
        raci: { 'analista-funcional': 'R' },
      }
    ),
    tarefa(
      't28',
      3852,
      309,
      'Encaminhar o chamado para o seu nome no grupo N2 correspondente ao produto/módulo',
      { raci: { 'analista-funcional': 'R' } }
    ),
    paralelo('p8', 3990, 180, ''),
    decisao('g20', 4086, 180, 'Existe Nota publicada no Portal para o erro?'),
    tarefa('t29', 4086, 282, 'Seguir para fluxo de aplicação de Notas', {
      raci: { 'analista-funcional': 'R' },
    }),
    decisao('g21', 4086, 381, 'É produto Fiscal?', {}, { posicaoRotulo: 'esquerda' }),
    link(
      'l5',
      4086,
      471,
      'Aplicação de notas/ licença contratados',
      {},
      { processoVinculadoId: 'p-11-1' }
    ),
    link('l6', 4176, 381, 'Aplicação de notas ABAP', {}, { processoVinculadoId: 'p-11-3' }),
    tarefa('t30', 4224, 180, 'Classificar o chamado e definir qual fluxo seguir', {
      descricao: 'Classificar corretamente a categoria, código de resolução.',
      raci: { 'analista-funcional': 'R' },
    }),
    paralelo('p9', 4362, 180, ''),
    link(
      'l7',
      4452,
      84,
      'Manutenção Standard',
      {},
      { processoVinculadoId: 'p-1-3', posicaoRotulo: 'acima' }
    ),
    link(
      'l8',
      4452,
      180,
      'Manutenção e Desenvolvimento Específico',
      {},
      { processoVinculadoId: 'p-2-3', posicaoRotulo: 'acima' }
    ),
    link(
      'l9',
      4452,
      264,
      'Consultoria',
      {},
      { processoVinculadoId: 'p-1-2', posicaoRotulo: 'acima' }
    ),
    link(
      'l10',
      4452,
      348,
      'Desenvolvimento Adicional',
      {},
      { processoVinculadoId: 'p-2-2', posicaoRotulo: 'acima' }
    ),
    link(
      'l11',
      4452,
      432,
      'Incidente T&M',
      {
        descricao:
          'Caso o atendimento seja maior que 40 horas e/ou não seja suportada pela equipe.',
      },
      { processoVinculadoId: 'p-1-4', posicaoRotulo: 'acima' }
    ),
    link(
      'l12',
      4452,
      522,
      'Manutenção e Desenvolvimento Específico para Dedicados',
      {},
      { processoVinculadoId: 'p-3-2' }
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
    conexao('t8', 'bottom', 'g8', 'left'),
    conexao('g8', 'right', 'g9', 'left', 'Não'),
    conexao('g8', 'bottom', 'p4', 'left', 'Sim'),
    conexao('g9', 'right', 'g10', 'left', 'Sim'),
    conexao('g9', 'bottom', 'p4', 'top', 'Não'),
    conexao('p4', 'bottom', 't9', 'top'),
    conexao('t9', 'bottom', 'l3', 'top'),
    conexao('g10', 'right', 't10', 'left', 'Não'),
    conexao('g10', 'bottom', 'g11', 'top', 'Sim'),
    conexao('g11', 'bottom', 't12', 'left', 'Não'),
    conexao('g11', 'right', 't11', 'left', 'Sim'),
    conexao('t10', 'right', 't13', 'left'),
    conexao('t11', 'right', 't15', 'left'),
    conexao('t12', 'right', 't14', 'left'),
    conexao('t13', 'right', 'p5', 'left'),
    conexao('t14', 'bottom', 'g12', 'top'),
    conexao('g12', 'bottom', 't17', 'left', 'Não'),
    conexao('g12', 'right', 't16', 'bottom', 'Sim'),
    conexao('t15', 'right', 'p5', 'bottom'),
    conexao('p5', 'right', 'g13', 'left'),
    conexao('t16', 'top', 'p5', 'bottom'),
    conexao('t17', 'right', 'f1', 'left'),
    conexao('g13', 'bottom', 't18', 'top', 'Não'),
    conexao('g13', 'right', 'g14', 'left', 'Sim'),
    conexao('t18', 'bottom', 'l4', 'top'),
    conexao('g14', 'bottom', 't19', 'top', 'Não'),
    conexao('g14', 'right', 'p6', 'left', 'Sim'),
    conexao('t19', 'bottom', 'g15', 'top'),
    conexao('g15', 'bottom', 't20', 'top', 'Não'),
    conexao('g15', 'right', 'p6', 'bottom', 'Sim'),
    conexao('t20', 'bottom', 'f2', 'top'),
    conexao('p6', 'right', 't21', 'left'),
    conexao('t21', 'right', 't22', 'left'),
    conexao('t22', 'right', 'g16', 'left'),
    conexao('g16', 'right', 't23', 'left', 'Sim'),
    conexao('g16', 'top', 'p7', 'top', 'Não'),
    conexao('t23', 'right', 'g17', 'left'),
    conexao('g17', 'bottom', 't24', 'top', 'Não'),
    conexao('g17', 'right', 'p7', 'left', 'Sim'),
    conexao('t24', 'right', 'g18', 'left'),
    conexao('p7', 'right', 't26', 'left'),
    conexao('g18', 'bottom', 't25', 'top', 'Não'),
    conexao('g18', 'top', 'p7', 'bottom', 'Sim'),
    conexao('t25', 'bottom', 'f3', 'top'),
    conexao('t26', 'right', 'g19', 'left'),
    conexao('g19', 'bottom', 't28', 'left', 'Sim'),
    conexao('g19', 'right', 't27', 'left', 'Não'),
    conexao('t27', 'right', 'p8', 'left'),
    conexao('t28', 'right', 'p8', 'bottom'),
    conexao('p8', 'right', 'g20', 'left'),
    conexao('g20', 'right', 't30', 'left', 'Não'),
    conexao('g20', 'bottom', 't29', 'top', 'Sim'),
    conexao('t29', 'bottom', 'g21', 'top'),
    conexao('g21', 'bottom', 'l5', 'top', 'Sim'),
    conexao('g21', 'right', 'l6', 'left', 'Não'),
    conexao('t30', 'right', 'p9', 'left'),
    conexao('p9', 'bottom', 'l9', 'left'),
    conexao('p9', 'bottom', 'l10', 'left'),
    conexao('p9', 'bottom', 'l11', 'left'),
    conexao('p9', 'right', 'l8', 'left'),
    conexao('p9', 'bottom', 'l12', 'left'),
    conexao('p9', 'top', 'l7', 'left'),
  ],
};

// 1.2 Consultoria
const FLUXO_1_2: FluxoProcesso = {
  nodes: [
    raiaArpo('r1', 'analista-funcional', 23, 755, 4146),
    raiaArpo('r2', 'tecnico', 737, 953, 4146),
    link('l1', 167, 377, 'Consultoria'),
    tarefa('t1', 299, 377, 'Verificar o SLA em Tipos de Serviço > Metas de Serviço', {
      raci: { 'analista-funcional': 'R' },
    }),
    tarefa('t2', 479, 377, 'Entender a demanda', { raci: { 'analista-funcional': 'R' } }),
    tarefa('t3', 659, 377, 'Avaliar as evidências', { raci: { 'analista-funcional': 'R' } }),
    link(
      'l2',
      797,
      74,
      'Incidente T&M',
      {
        descricao:
          'Caso o atendimento seja maior que 40 horas e/ou não seja suportada pela equipe.',
      },
      { processoVinculadoId: 'p-1-4', posicaoRotulo: 'esquerda' }
    ),
    decisao(
      'g1',
      797,
      161,
      'É possível atendimento pela equipe de A.M.S.?',
      {},
      { posicaoRotulo: 'esquerda' }
    ),
    decisao(
      'g2',
      797,
      377,
      'É um atendimento complexo (mais de 40 horas ou consultoria complexa)?',
      {},
      { posicaoRotulo: 'abaixo' }
    ),
    tarefa(
      't4',
      935,
      161,
      'Informar ao cliente que o atendimento é complexo (mais de 40 h) Questionar: Podemos prosseguir com o atendimento?',
      { raci: { 'analista-funcional': 'R' } }
    ),
    decisao('g3', 1073, 161, 'Cliente autorizou o atendimento?'),
    paralelo('p1', 1073, 377, ''),
    tarefa('t5', 1211, 377, 'Pesquisar conexões (ver descrição)', {
      descricao:
        'Pesquisar no Portal de Aplicativos:\nRecursos > Recursos Técnicos > Documentação > Acesso de Clientes\nhttps://aplicativos.sonda.com/Lists/Acessos%20de%20Clientes/AllItems.aspx',
      raci: { 'analista-funcional': 'R' },
    }),
    decisao('g4', 1349, 377, 'Existe acesso?'),
    tarefa('t6', 1349, 518, 'Agendar acesso com cliente', { raci: { 'analista-funcional': 'R' } }),
    tarefa('t7', 1487, 377, 'Acessar o ambiente do cliente', {
      raci: { 'analista-funcional': 'R' },
    }),
    paralelo('p2', 1625, 377, ''),
    tarefa('t8', 1676, 608, 'Encaminhar o chamado ou abrir tarefa com evidência', {
      raci: { 'analista-funcional': 'R' },
    }),
    tarefa('t9', 1676, 869, 'Avaliar demanda', { raci: { tecnico: 'R' } }),
    tarefa('t10', 1763, 377, 'Avaliar cenário', { raci: { 'analista-funcional': 'R' } }),
    tarefa('t11', 1856, 869, 'Confeccionar devolutiva', { raci: { tecnico: 'R' } }),
    decisao('g5', 1901, 377, 'Necessita time técnico?'),
    paralelo('p3', 1997, 377, ''),
    paralelo('p4', 1997, 869, ''),
    tarefa('t12', 2135, 377, 'Confeccionar devolutiva', { raci: { 'analista-funcional': 'R' } }),
    tarefa('t13', 2135, 869, 'Apontar horas no chamado e na tarefa e na OS, se necessário', {
      raci: { tecnico: 'R' },
    }),
    link(
      'l3',
      2189,
      521,
      'Incidente T&M',
      {
        descricao:
          'Caso o atendimento seja maior que 40 horas e/ou não seja suportada pela equipe.',
      },
      { processoVinculadoId: 'p-1-4' }
    ),
    decisao('g6', 2276, 521, 'É possível atendimento pela equipe de A.M.S.?'),
    tarefa('t14', 2315, 377, 'Retornar ao cliente', { raci: { 'analista-funcional': 'R' } }),
    tarefa('t15', 2315, 869, 'Encerrar tarefa', { raci: { tecnico: 'R' } }),
    tarefa(
      't16',
      2405,
      677,
      'Informar ao cliente que o atendimento é complexo (mais de 40 h) Questionar: Podemos prosseguir com o atendimento?',
      { raci: { 'analista-funcional': 'R' } }
    ),
    fim('f1', 2447, 869, ''),
    decisao(
      'g7',
      2453,
      377,
      'É um atendimento complexo (mais de 40 horas ou consultoria complexa)?'
    ),
    paralelo('p5', 2549, 377, ''),
    decisao('g8', 2549, 677, 'Cliente autorizou o atendimento?', {}, { posicaoRotulo: 'abaixo' }),
    tarefa('t17', 2687, 377, 'Efetuar o atendimento', { raci: { 'analista-funcional': 'R' } }),
    tarefa('t18', 2867, 377, 'Apontar horas no chamado', { raci: { 'analista-funcional': 'R' } }),
    tarefa('t19', 3047, 377, 'Alterar status HOLD', { raci: { 'analista-funcional': 'R' } }),
    decisao('g9', 3185, 377, 'Cliente retornou se o chamado foi solucionado?'),
    tarefa('t20', 3185, 494, 'Realizar procedimento de Follow-up. (em 10 dias) (ver descrição)', {
      descricao:
        'Descrever no Assunto da tarefa: FOLLOW UP 1 ou FOLLOW UP 2 ou FOLLOW UP 3\n\n1º Follow-up (segundo dia): questionar o cliente se houve algum retorno e informar que o chamado ficará aberto até o dia (contar 10 dias do envio da orientação/solução);\n\n2º Follow-up (quinto dia): questionar se houve algum retorno e reforçar que o chamado ficará aberto até o dia informado no 1º follow-up;\n\n3º Follow-up (penúltimo dia do prazo informado): informar que o chamado ficará aberto até o dia seguinte e caso não haja retorno será encerrado.',
      raci: { 'analista-funcional': 'R' },
    }),
    decisao('g10', 3185, 611, 'Cliente retornou em 10 dias?', {}, { posicaoRotulo: 'esquerda' }),
    paralelo('p6', 3281, 377, ''),
    tarefa('t21', 3377, 227, 'Retornar status IN PROGRESS', {
      raci: { 'analista-funcional': 'R' },
    }),
    decisao('g11', 3377, 377, 'Solucionado?', {}, { posicaoRotulo: 'abaixo' }),
    tarefa('t22', 3515, 377, 'Incluir a aprovação do cliente no chamado', {
      raci: { 'analista-funcional': 'R' },
    }),
    paralelo('p7', 3653, 377, ''),
    tarefa('t23', 3791, 377, 'Preencher com a Solução (ver descrição)', {
      descricao:
        'CAUSA:\nCENÁRIO:\nSOLUÇÃO PALIATIVA:\nPREVENÇÃO:\nSOLUÇÃO NA CAUSA:\n\nExemplo:\nCAUSA: Procedimento\nCENÁRIO: Após acessar o ambiente, verifiquei que o Evento R2098 estava indicando que não existe período em aberto. Já o Evento R2099 a Receita indicava que já exista protocolo de fechamento e por este motivo não poderia aceita um novo fechamento.\nDiante este cenário entendo que houve um erro de procedimento. Chego a este entendimento porque não localizei nenhum registro da transmissão do Evento R2098 após o envio do R5011 do dia 08/08.\nSOLUÇÃO PALIATIVA: Não aplica-se\nPREVENÇÃO: Não aplica-se.\nSOLUÇÃO NA CAUSA: ara solucionar o problema ajustei o status dos Eventos, após esta ação, consegui fazer o envio do R2099 e R5011 normalmente.',
      raci: { 'analista-funcional': 'R' },
    }),
    paralelo('p8', 3791, 500, ''),
    tarefa('t24', 3929, 500, 'Encerrar chamado', { raci: { 'analista-funcional': 'R' } }),
    fim('f2', 3929, 602, ''),
  ],
  edges: [
    conexao('l1', 'right', 't1', 'left'),
    conexao('t1', 'right', 't2', 'left'),
    conexao('t2', 'right', 't3', 'left'),
    conexao('t3', 'right', 'g2', 'left'),
    conexao('g1', 'right', 't4', 'left', 'Sim'),
    conexao('g1', 'top', 'l2', 'bottom', 'Não'),
    conexao('g2', 'top', 'g1', 'bottom', 'Sim'),
    conexao('g2', 'right', 'p1', 'left', 'Não'),
    conexao('t4', 'right', 'g3', 'left'),
    conexao('g3', 'right', 'p7', 'top', 'Não'),
    conexao('g3', 'bottom', 'p1', 'top', 'Sim'),
    conexao('p1', 'right', 't5', 'left'),
    conexao('t5', 'right', 'g4', 'left'),
    conexao('g4', 'right', 't7', 'left', 'Sim'),
    conexao('g4', 'bottom', 't6', 'top', 'Não'),
    conexao('t6', 'right', 'p2', 'bottom'),
    conexao('t7', 'right', 'p2', 'left'),
    conexao('p2', 'right', 't10', 'left'),
    conexao('t8', 'bottom', 't9', 'top'),
    conexao('t9', 'right', 't11', 'left'),
    conexao('t10', 'right', 'g5', 'left'),
    conexao('t11', 'right', 'p4', 'left'),
    conexao('g5', 'bottom', 't8', 'right', 'Sim'),
    conexao('g5', 'right', 'p3', 'left', 'Não'),
    conexao('p3', 'right', 't12', 'left'),
    conexao('p4', 'right', 't13', 'left'),
    conexao('p4', 'top', 'p3', 'bottom'),
    conexao('t12', 'right', 't14', 'left'),
    conexao('t13', 'right', 't15', 'left'),
    conexao('g6', 'bottom', 't16', 'left', 'Sim'),
    conexao('g6', 'left', 'l3', 'right', 'Não'),
    conexao('t14', 'right', 'g7', 'left'),
    conexao('t15', 'right', 'f1', 'left'),
    conexao('t16', 'right', 'g8', 'left'),
    conexao('g7', 'bottom', 'g6', 'right', 'Sim'),
    conexao('g7', 'right', 'p5', 'left', 'Não'),
    conexao('p5', 'right', 't17', 'left', 'Não'),
    conexao('g8', 'right', 'p8', 'bottom', 'Não'),
    conexao('g8', 'top', 'p5', 'bottom', 'Sim'),
    conexao('t17', 'right', 't18', 'left'),
    conexao('t18', 'right', 't19', 'left'),
    conexao('t19', 'right', 'g9', 'left'),
    conexao('g9', 'bottom', 't20', 'top', 'Não'),
    conexao('g9', 'right', 'p6', 'left', 'Sim'),
    conexao('t20', 'bottom', 'g10', 'top'),
    conexao('g10', 'bottom', 'p7', 'bottom', 'Não'),
    conexao('g10', 'right', 'p6', 'bottom', 'Sim'),
    conexao('p6', 'right', 'g11', 'left'),
    conexao('t21', 'left', 'p2', 'top'),
    conexao('g11', 'right', 't22', 'left', 'Sim'),
    conexao('g11', 'top', 't21', 'bottom', 'Não'),
    conexao('t22', 'right', 'p7', 'left'),
    conexao('p7', 'right', 't23', 'left'),
    conexao('t23', 'bottom', 'p8', 'top'),
    conexao('p8', 'right', 't24', 'left'),
    conexao('t24', 'bottom', 'f2', 'top'),
  ],
};

// 1.3 Manutenção Standard
const FLUXO_1_3: FluxoProcesso = {
  nodes: [
    raiaArpo('r1', 'analista-funcional', 23, 623, 2970),
    raiaArpo('r2', 'tecnico', 611, 803, 2970),
    link('l1', 179, 227, 'Manutenção Standard'),
    tarefa('t1', 311, 227, 'Analisar demanda', {
      descricao: 'Avaliar o cenário e criar o mesmo cenário no produto para identicar erro',
      raci: { 'analista-funcional': 'R' },
    }),
    tarefa('t2', 449, 101, 'Pesquisar conexões (ver descrição)', {
      descricao:
        'Pesquisar no Portal de Aplicativos:\nRecursos > Recursos Técnicos > Documentação > Acesso de Clientes\nhttps://aplicativos.sonda.com/Lists/Acessos%20de%20Clientes/AllItems.aspx',
      raci: { 'analista-funcional': 'R' },
    }),
    decisao(
      'g1',
      449,
      227,
      'Necessário acessar ambiente do cliente?',
      {},
      { posicaoRotulo: 'abaixo' }
    ),
    tarefa('t3', 629, 101, 'Solicitar acesso, se não existir e mudar status do chamado para Hold', {
      descricao:
        'Se não tiver os dados de acesso, deverá solicitar e alterar o status do chamado para Hold.',
      raci: { 'analista-funcional': 'R' },
    }),
    tarefa('t4', 809, 101, 'Aguardar liberação do acesso', { raci: { 'analista-funcional': 'R' } }),
    paralelo('p1', 809, 227, ''),
    decisao('g2', 905, 227, 'Necessário apoio Técnico?'),
    tarefa('t5', 905, 437, 'Abrir Tarefa para o Técnico (se necessario)', {
      descricao: 'Abrir Tarefa no Azure para apontamento de horas caso chamado seja de consultoria',
      raci: { 'analista-funcional': 'R' },
    }),
    tarefa('t6', 905, 695, 'Avaliar erro', { raci: { tecnico: 'R' } }),
    paralelo('p2', 1085, 227, ''),
    tarefa(
      't7',
      1085,
      695,
      'Apontar horas no chamado e na tarefa (no tfs se necessário) caso seja consultoria',
      { raci: { tecnico: 'R' } }
    ),
    tarefa('t8', 1223, 227, 'Abrir Task de Análise, se necessário', {
      descricao:
        'Abrir task de atendimento de chamado se necessário para apontamento de horas no Azure Devops/TFS.',
      raci: { 'analista-funcional': 'R' },
    }),
    decisao('g3', 1361, 227, 'É Bug?'),
    decisao('g4', 1361, 323, 'É Solicitação?', {}, { posicaoRotulo: 'esquerda' }),
    tarefa('t9', 1361, 431, 'Alterar código de resolução para Consultoria', {
      raci: { 'analista-funcional': 'R' },
    }),
    link('l2', 1361, 533, 'Consultoria', {}, { processoVinculadoId: 'p-1-2' }),
    link('l3', 1448, 323, 'Atendimento SOLICITAÇÃO N1', {}, { processoVinculadoId: 'p-2-1' }),
    decisao('g5', 1457, 227, 'É produto Standard?', {}, { posicaoRotulo: 'abaixo' }),
    tarefa('t10', 1595, 119, 'Alterar o código de resolução para Erro Programa Específico', {
      descricao: 'Alterar o código de resolução para Erro Programa Específicio',
      raci: { 'analista-funcional': 'R' },
    }),
    tarefa('t11', 1595, 227, 'Validar código de resolução Erro Programa Standard', {
      descricao: 'Validar se o código de resolução está como Erro Programa Standard',
      raci: { 'analista-funcional': 'R' },
    }),
    link(
      'l4',
      1727,
      119,
      'Manutenção e Desenvolvimento Específico',
      {},
      { processoVinculadoId: 'p-2-3', posicaoRotulo: 'direita' }
    ),
    decisao('g6', 1733, 227, 'Cliente tem AMS?', {}, { posicaoRotulo: 'abaixo' }),
    tarefa('t12', 1883, 227, 'Alterar o IC para o de manutenção', {
      raci: { 'analista-funcional': 'R' },
    }),
    decisao('g7', 2021, 227, 'IC de Manutenção está ativo?'),
    tarefa('t13', 2021, 335, 'Enviar chamado para grupo APL - IC´s Inativos', {
      raci: { 'analista-funcional': 'R' },
    }),
    link('l5', 2021, 449, 'Chamado com IC Inativo', {}, { processoVinculadoId: 'p-04' }),
    paralelo('p3', 2123, 227, ''),
    tarefa('t14', 2273, 227, 'Abrir User Story', { raci: { 'analista-funcional': 'R' } }),
    paralelo('p4', 2411, 227, ''),
    link('l6', 2411, 317, 'Desenvolvimento Standard', {}, { processoVinculadoId: 'p-6-2' }),
    tarefa('t15', 2549, 227, 'Aguardar liberação da Nota', { raci: { 'analista-funcional': 'R' } }),
    tarefa('t16', 2729, 227, 'Fechar chamado Problema se houver', {
      raci: { 'analista-funcional': 'R' },
    }),
    fim('f1', 2861, 227, 'Fim'),
  ],
  edges: [
    conexao('l1', 'right', 't1', 'left'),
    conexao('t1', 'right', 'g1', 'left'),
    conexao('t2', 'right', 't3', 'left'),
    conexao('g1', 'top', 't2', 'bottom', 'Sim'),
    conexao('g1', 'right', 'p1', 'left', 'Não'),
    conexao('t3', 'right', 't4', 'left'),
    conexao('t4', 'bottom', 'p1', 'top'),
    conexao('p1', 'right', 'g2', 'left'),
    conexao('g2', 'bottom', 't5', 'top', 'Sim'),
    conexao('g2', 'right', 'p2', 'left', 'Não'),
    conexao('t5', 'bottom', 't6', 'top'),
    conexao('t6', 'right', 't7', 'left'),
    conexao('p2', 'right', 't8', 'left'),
    conexao('t7', 'top', 'p2', 'bottom'),
    conexao('t8', 'right', 'g3', 'left'),
    conexao('g3', 'right', 'g5', 'left', 'Sim'),
    conexao('g3', 'bottom', 'g4', 'top', 'Não'),
    conexao('g4', 'bottom', 't9', 'top', 'Não'),
    conexao('g4', 'right', 'l3', 'left', 'Sim'),
    conexao('t9', 'bottom', 'l2', 'top'),
    conexao('g5', 'top', 't10', 'left', 'Não'),
    conexao('g5', 'right', 't11', 'left', 'Sim'),
    conexao('t10', 'right', 'l4', 'left'),
    conexao('t11', 'right', 'g6', 'left'),
    conexao('g6', 'right', 't12', 'left', 'Sim'),
    conexao('g6', 'top', 'p3', 'top', 'Não'),
    conexao('t12', 'right', 'g7', 'left'),
    conexao('g7', 'bottom', 't13', 'top', 'Não'),
    conexao('g7', 'right', 'p3', 'left', 'Sim'),
    conexao('t13', 'bottom', 'l5', 'top'),
    conexao('p3', 'right', 't14', 'left'),
    conexao('t14', 'right', 'p4', 'left'),
    conexao('p4', 'right', 't15', 'left'),
    conexao('p4', 'bottom', 'l6', 'top'),
    conexao('t15', 'right', 't16', 'left'),
    conexao('t16', 'right', 'f1', 'left'),
  ],
};

// 1.4 Incidente T&M
const FLUXO_1_4: FluxoProcesso = {
  nodes: [
    raiaArpo('r1', 'equipe-t-m', 22, 322, 1926),
    raiaArpo('r2', 'analista-funcional', 312, 1032, 1926),
    link('l1', 180, 720, 'Incidente T&M', {
      descricao: 'Caso o atendimento seja maior que 40 horas e/ou não seja suportada pela equipe.',
    }),
    decisao('g1', 270, 720, 'Cliente tem AMS?'),
    decisao('g2', 270, 816, 'É uma consultoria rápida?', {}, { posicaoRotulo: 'esquerda' }),
    decisao(
      'g3',
      366,
      720,
      'Suporte está previsto no Contrato de A.M.S?',
      {},
      { posicaoRotulo: 'abaixo' }
    ),
    tarefa(
      't1',
      429,
      921,
      'Informar ao cliente que se trata de uma Consultoria e que ao final do atendimento as horas serão cobradas. Questionar: Podemos prosseguir com o atendimento?',
      { raci: { 'analista-funcional': 'R' } }
    ),
    paralelo('p1', 462, 720, ''),
    tarefa('t2', 600, 720, 'Seguir para o Fluxo de Consultoria', {
      raci: { 'analista-funcional': 'R' },
    }),
    link('l2', 600, 822, 'Consultoria', {}, { processoVinculadoId: 'p-1-2' }),
    paralelo('p2', 708, 519, ''),
    decisao('g4', 708, 921, 'Cliente autorizou a cobrança?', {}, { posicaoRotulo: 'abaixo' }),
    tarefa(
      't3',
      846,
      519,
      'Enviar e-mail da demanda para o Gestor de T&M, Gestor de Projetos e Gestor Comercial para definir para quem será enviada a demanda (ver descrição)',
      {
        descricao:
          'Enviar demanda para Angela Gongora (T&M), Maria Angelica (Projetos) e Gestor Comercial',
        raci: { 'analista-funcional': 'R' },
      }
    ),
    decisao('g5', 984, 519, 'Será tratado por T&M?'),
    tarefa(
      't4',
      984,
      717,
      'Enviar email ao cliente, copiando o Gestor de Projetos ou o Gestor Comercial, informando que o atendimento seguirá com a outra equipe. (ver descrição)',
      {
        descricao: 'Maria Angelica (Projetos) e Gestor Comercial',
        raci: { 'analista-funcional': 'R' },
      }
    ),
    tarefa(
      't5',
      1128,
      519,
      'Enviar email ao cliente, copiando o Gestor de T&M, informando que o atendimento do chamado seguirá com a outra equipe. (ver descrição)',
      { descricao: 'Angela Gongora (T&M) ou Gestor Comercial', raci: { 'analista-funcional': 'R' } }
    ),
    tarefa(
      't6',
      1164,
      717,
      'Encerrar o chamado com o código de resolução: Consultoria (ver descrição)',
      {
        descricao: '*** As horas apontadas serão cobradas pela Gisele/Erica no final do mês',
        raci: { 'analista-funcional': 'R' },
      }
    ),
    decisao(
      'g6',
      1314,
      231,
      'Definida a utilização do banco de horas de A.M.S.?',
      {},
      { posicaoRotulo: 'esquerda' }
    ),
    tarefa('t7', 1314, 396, 'Encaminhar o chamado para o Grupo AMS T&M - TIME & MATERIAL', {
      raci: { 'analista-funcional': 'R' },
    }),
    tarefa('t8', 1314, 519, 'Alterar o código de resolução para Alocação T&M', {
      raci: { 'analista-funcional': 'R' },
    }),
    tarefa(
      't9',
      1452,
      96,
      'Alterar o código de resolução, no chamado para um dos que constam na descrição, para que seja descontado do banco:',
      {
        descricao:
          'AMS SAP\nConsultoria\nConsultoria - Banco de Dados\nConsultoria - Solução Paliativa\nErro de classificação na abertura\nErro de programa específico (SEM SLA)\nConsultoria - Nota Publicada\nValidação de Arquivo',
        raci: { 'equipe-t-m': 'R' },
      }
    ),
    tarefa(
      't10',
      1452,
      231,
      'Alterar o código de resolução, no chamado para um dos que constam na descrição, para que NÃO seja descontado do banco:',
      {
        descricao:
          'Documentação Incompleta\n\nErro de atualização (SEM SLA)\n\nGarantia de programa específico (SEM SLA)\n\nErro Programa Standard\n\nManutenção Legal\n\nServiços não Contratados',
        raci: { 'equipe-t-m': 'R' },
      }
    ),
    paralelo('p3', 1590, 231, ''),
    tarefa('t11', 1728, 231, 'Atender e encerrar o chamado', { raci: { 'equipe-t-m': 'R' } }),
    paralelo('p4', 1728, 519, ''),
    tarefa(
      't12',
      1728,
      921,
      'Encerrar o chamado com código de resolução: Consultoria informando que o cliente não aceitou a cobrança do atendimento. (ver descrição)',
      { raci: { 'analista-funcional': 'R' } }
    ),
    fim('f1', 1815, 519, ''),
  ],
  edges: [
    conexao('l1', 'right', 'g1', 'left'),
    conexao('g1', 'bottom', 'g2', 'top', 'Não'),
    conexao('g1', 'right', 'g3', 'left', 'Sim'),
    conexao('g2', 'bottom', 't1', 'left', 'Não'),
    conexao('g2', 'right', 'p1', 'bottom', 'Sim'),
    conexao('g3', 'right', 'p1', 'left', 'Sim'),
    conexao('g3', 'top', 'p2', 'left', 'Não'),
    conexao('t1', 'right', 'g4', 'left'),
    conexao('p1', 'right', 't2', 'left'),
    conexao('t2', 'bottom', 'l2', 'top'),
    conexao('p2', 'right', 't3', 'left'),
    conexao('g4', 'right', 't12', 'left', 'Não'),
    conexao('g4', 'top', 'p2', 'bottom', 'Sim'),
    conexao('t3', 'right', 'g5', 'left'),
    conexao('g5', 'bottom', 't4', 'top', 'Não'),
    conexao('g5', 'right', 't5', 'left', 'Sim'),
    conexao('t4', 'right', 't6', 'left'),
    conexao('t5', 'right', 't8', 'left'),
    conexao('t6', 'right', 'p4', 'bottom'),
    conexao('g6', 'right', 't10', 'left', 'Não'),
    conexao('g6', 'top', 't9', 'left', 'Sim'),
    conexao('t7', 'top', 'g6', 'bottom'),
    conexao('t8', 'top', 't7', 'bottom'),
    conexao('t9', 'right', 'p3', 'top'),
    conexao('t10', 'right', 'p3', 'left'),
    conexao('p3', 'right', 't11', 'left'),
    conexao('t11', 'bottom', 'p4', 'top'),
    conexao('p4', 'right', 'f1', 'left'),
    conexao('t12', 'top', 'p4', 'bottom'),
  ],
};

export const FLUXOS_INCIDENTE: Record<string, FluxoProcesso> = {
  'p-1-1': FLUXO_1_1,
  'p-1-2': FLUXO_1_2,
  'p-1-3': FLUXO_1_3,
  'p-1-4': FLUXO_1_4,
};
