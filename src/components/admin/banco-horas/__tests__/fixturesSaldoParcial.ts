/** Dados fixos para os testes do e-mail de Saldo Parcial */
import type { BancoHorasCalculo } from '@/types/bancoHoras';
import type { Requerimento } from '@/types/requerimentos';

const calculoBase = {
  empresa_id: 'empresa-1',
  ano: 2026,
  baseline_horas: '24:00',
  reajustes_horas: '00:00',
  excedentes_horas: '00:00',
  valor_excedentes_horas: 0,
  valor_a_faturar: 0,
  is_fim_periodo: false,
  versao: 1
};

export const calculosFixture = [
  {
    ...calculoBase,
    id: 'calc-10',
    mes: 10,
    repasses_mes_anterior_horas: '14:00',
    saldo_a_utilizar_horas: '38:00',
    consumo_horas: '05:30',
    requerimentos_horas: '02:00',
    consumo_total_horas: '07:30',
    saldo_horas: '30:30',
    repasse_horas: '15:15'
  },
  {
    ...calculoBase,
    id: 'calc-11',
    mes: 11,
    repasses_mes_anterior_horas: '15:15',
    saldo_a_utilizar_horas: '39:15',
    consumo_horas: '00:00',
    requerimentos_horas: '00:00',
    consumo_total_horas: '00:00',
    saldo_horas: '39:15',
    repasse_horas: '19:37'
  },
  {
    ...calculoBase,
    id: 'calc-12',
    mes: 12,
    repasses_mes_anterior_horas: '19:37',
    saldo_a_utilizar_horas: '43:37',
    consumo_horas: '00:00',
    requerimentos_horas: '00:00',
    consumo_total_horas: '00:00',
    saldo_horas: '43:37',
    repasse_horas: '00:00',
    is_fim_periodo: true
  }
] as unknown as BancoHorasCalculo[];

export const requerimentosFixture = [
  {
    id: 'req-1',
    chamado: 'RF-0001',
    cliente_id: 'empresa-1',
    modulo: 'Comply',
    descricao: 'Ajuste de relatório fiscal',
    data_envio: '2026-10-01',
    data_aprovacao: '2026-10-01',
    valor_hora: 0,
    horas_funcional: '02:00',
    horas_tecnico: '00:00',
    horas_total: '02:00',
    linguagem: 'Funcional',
    tipo_cobranca: 'Banco de Horas',
    mes_cobranca: '10/2026',
    status: 'enviado_faturamento',
    enviado_faturamento: true
  }
] as unknown as Requerimento[];

export const observacoesFixture = [
  {
    texto: 'Observação de teste do período',
    tipo: 'manual',
    mes: 10,
    ano: 2026,
    usuario_nome: 'Usuário Teste',
    created_at: '2026-10-01T12:00:00.000Z'
  }
];
