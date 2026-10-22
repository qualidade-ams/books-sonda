// Dados FICTÍCIOS do protótipo de Ajustes Retroativos (DS v2). Empresas, bancos, consultores,
// chamados e horas são fictícios. Horas em minutos.

/**
 * pendente: detectado, aguardando análise · aprovado: aprovado, aguardando a retificação do Book
 * do mês (D-09) · aplicado: entrou na retificação · descartado: não conta e não volta a ser detectado
 */
export type SituacaoAjuste = 'pendente' | 'aprovado' | 'aplicado' | 'descartado';

export interface ApontamentoRetroativoMock {
  id: string;
  chamado: string;
  tarefa: string;
  /** Data do trabalho (data_atividade), dentro do mês já fechado */
  dataAtividade: string;
  /** Quando foi lançado no Aranda (data_sistema), depois do fechamento */
  lancadoEm: string;
  consultor: string;
  /** Estado do chamado no Aranda (caso_estado), como vem de lá */
  statusChamado: string;
  minutos: number;
  emailEnviado?: { em: string; por: string };
}

export interface AjusteRetroativoMock {
  id: string;
  empresa: string;
  banco: string;
  mesReferencia: string; // Set/2026
  /** Consumo do mês no fechamento e com os apontamentos retroativos */
  consumoAntes: number;
  consumoDepois: number;
  detectadoEm: string;
  situacao: SituacaoAjuste;
  decisao?: { por: string; em: string; justificativa: string };
  retificacao?: { em: string; por: string };
  apontamentos: ApontamentoRetroativoMock[];
}

const h = (horas: number, minutos = 0) => horas * 60 + minutos;
const soma = (a: ApontamentoRetroativoMock[]) => a.reduce((s, x) => s + x.minutos, 0);

function ajuste(dados: Omit<AjusteRetroativoMock, 'consumoDepois'>): AjusteRetroativoMock {
  return { ...dados, consumoDepois: dados.consumoAntes + soma(dados.apontamentos) };
}

export const AJUSTES_RETROATIVOS_MOCK: AjusteRetroativoMock[] = [
  ajuste({
    id: 'aj1',
    empresa: 'EMPRESA ALFA',
    banco: 'Banco FISCAL',
    mesReferencia: 'Set/2026',
    consumoAntes: h(52, 30),
    detectadoEm: '21/10/2026 08:15',
    situacao: 'pendente',
    apontamentos: [
      {
        id: 'a1',
        chamado: 'IM-2210431',
        tarefa: 'T-88120',
        dataAtividade: '24/09/2026',
        lancadoEm: '20/10/2026',
        consultor: 'Consultor Teste Um',
        statusChamado: 'Closed',
        minutos: h(2, 30),
      },
      {
        id: 'a2',
        chamado: 'IM-2210431',
        tarefa: 'T-88133',
        dataAtividade: '25/09/2026',
        lancadoEm: '20/10/2026',
        consultor: 'Consultor Teste Um',
        statusChamado: 'Resolved',
        minutos: h(1),
      },
      {
        id: 'a3',
        chamado: 'RF-1050977',
        tarefa: 'T-88201',
        dataAtividade: '29/09/2026',
        lancadoEm: '21/10/2026',
        consultor: 'Consultor Teste Dois',
        statusChamado: 'In Progress',
        minutos: h(0, 45),
      },
    ],
  }),
  ajuste({
    id: 'aj2',
    empresa: 'EMPRESA ALFA',
    banco: 'FISCAL – e-DOCS',
    mesReferencia: 'Ago/2026',
    consumoAntes: h(23, 50),
    detectadoEm: '18/10/2026 08:15',
    situacao: 'pendente',
    apontamentos: [
      {
        id: 'a4',
        chamado: 'IM-2209876',
        tarefa: 'T-87010',
        dataAtividade: '30/08/2026',
        lancadoEm: '17/10/2026',
        consultor: 'Consultor Teste Três',
        statusChamado: 'Closed',
        minutos: h(3),
        emailEnviado: { em: '18/10/2026 10:02', por: 'Usuário Teste' },
      },
    ],
  }),
  ajuste({
    id: 'aj3',
    empresa: 'EMPRESA GAMA',
    banco: 'Banco COMEX',
    mesReferencia: 'Set/2026',
    consumoAntes: h(38, 10),
    detectadoEm: '14/10/2026 08:15',
    situacao: 'aprovado',
    decisao: {
      por: 'Usuário Teste',
      em: '15/10/2026',
      justificativa: 'Atendimento confirmado com o cliente; entra na retificação de setembro.',
    },
    apontamentos: [
      {
        id: 'a5',
        chamado: 'RF-1050811',
        tarefa: 'T-86500',
        dataAtividade: '22/09/2026',
        lancadoEm: '13/10/2026',
        consultor: 'Consultor Teste Dois',
        statusChamado: 'Closed',
        minutos: h(4),
      },
      {
        id: 'a6',
        chamado: 'RF-1050811',
        tarefa: 'T-86512',
        dataAtividade: '23/09/2026',
        lancadoEm: '13/10/2026',
        consultor: 'Consultor Teste Dois',
        statusChamado: 'Resolved',
        minutos: h(1, 30),
      },
    ],
  }),
  ajuste({
    id: 'aj4',
    empresa: 'EMPRESA TETA',
    banco: 'Banco SPED',
    mesReferencia: 'Ago/2026',
    consumoAntes: h(41),
    detectadoEm: '05/10/2026 08:15',
    situacao: 'aplicado',
    decisao: {
      por: 'Usuário Teste',
      em: '06/10/2026',
      justificativa: 'Horas devidas; cliente avisado.',
    },
    retificacao: { em: '08/10/2026', por: 'Usuário Teste' },
    apontamentos: [
      {
        id: 'a7',
        chamado: 'IM-2208890',
        tarefa: 'T-85002',
        dataAtividade: '27/08/2026',
        lancadoEm: '04/10/2026',
        consultor: 'Consultor Teste Um',
        statusChamado: 'Open',
        minutos: h(2),
      },
    ],
  }),
  ajuste({
    id: 'aj5',
    empresa: 'EMPRESA ÉPSILON',
    banco: 'Câmbio e Drawback',
    mesReferencia: 'Set/2026',
    consumoAntes: h(18, 20),
    detectadoEm: '09/10/2026 08:15',
    situacao: 'descartado',
    decisao: {
      por: 'Usuário Teste',
      em: '10/10/2026',
      justificativa:
        'Apontamento interno lançado no chamado errado; consultor vai relançar no mês vigente.',
    },
    apontamentos: [
      {
        id: 'a8',
        chamado: 'RF-1050702',
        tarefa: 'T-84410',
        dataAtividade: '18/09/2026',
        lancadoEm: '08/10/2026',
        consultor: 'Consultor Teste Três',
        statusChamado: 'Closed',
        minutos: h(1, 15),
        emailEnviado: { em: '09/10/2026 15:40', por: 'Usuário Teste' },
      },
    ],
  }),
];

/** E-mail do consultor (especialistas), para o envio do pedido de regularização */
export const EMAIL_CONSULTOR_MOCK: Record<string, string> = {
  'Consultor Teste Um': 'consultor.um@exemplo.com',
  'Consultor Teste Dois': 'consultor.dois@exemplo.com',
  'Consultor Teste Três': '',
};

export const ULTIMA_DETECCAO_MOCK = '21/10/2026 08:15';
