// Dados fictícios exclusivos do protótipo "suave" do Controle de Banco de Horas.
// Bancos, meses e requerimentos vêm de controleBancoHorasEnxuto.ts e controleBancoHorasV2.ts.

export interface AtividadeMock {
  id: string;
  quando: string;
  titulo: string;
  detalhe: string;
  tipo: 'recalculo' | 'envio' | 'fechamento';
}

export const ATIVIDADES_MOCK: AtividadeMock[] = [
  {
    id: 'a1',
    quando: '14/12 · 09:30',
    titulo: 'Recálculo automático',
    detalhe: 'Dez/2026 · 3 bancos',
    tipo: 'recalculo',
  },
  {
    id: 'a2',
    quando: '01/12 · 08:00',
    titulo: 'Nov/2026 fechado',
    detalhe: 'Repasse aplicado nos 3 bancos',
    tipo: 'fechamento',
  },
  {
    id: 'a3',
    quando: '28/11 · 16:10',
    titulo: 'Saldo parcial enviado',
    detalhe: 'FISCAL – e-DOCS · Nov/2026',
    tipo: 'envio',
  },
];
