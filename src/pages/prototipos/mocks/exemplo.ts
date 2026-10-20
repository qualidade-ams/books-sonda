// Dados fictícios do protótipo Exemplo. Nunca usar nomes/emails reais de clientes ou usuários.

export interface ItemExemplo {
  id: string;
  chamado: string;
  tipo: string;
  cliente: string;
  modulo: string;
  horas: string;
  status: 'ativo' | 'pendente' | 'inativo';
}

export const ITENS_EXEMPLO: ItemExemplo[] = [
  { id: '1', chamado: 'RF-0001', tipo: 'Melhoria', cliente: 'Empresa Alfa', modulo: 'Comply', horas: '12:30', status: 'ativo' },
  { id: '2', chamado: 'RF-0002', tipo: 'Correção', cliente: 'Empresa Beta', modulo: 'Comply e-DOCS', horas: '03:15', status: 'pendente' },
  { id: '3', chamado: 'RF-0003', tipo: 'Melhoria', cliente: 'Empresa Gama', modulo: 'POOL', horas: '08:00', status: 'ativo' },
  { id: '4', chamado: 'RF-0004', tipo: 'Consultoria', cliente: 'Empresa Delta', modulo: 'Comply', horas: '01:45', status: 'inativo' },
];
