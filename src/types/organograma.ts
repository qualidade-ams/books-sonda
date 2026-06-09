// Tipos para o sistema de organograma

export type Cargo = 'Diretor' | 'Gerente' | 'Coordenador' | 'Central Escalação' | 'Customer Success' | 'Comercial';
export type Produto = 'COMEX' | 'FISCAL' | 'GALLERY' | 'CUSTOMER_SUCCESS' | 'COMERCIAL';

export const PRODUTOS: Produto[] = ['COMEX', 'FISCAL', 'GALLERY', 'CUSTOMER_SUCCESS', 'COMERCIAL'];

export const PRODUTO_LABELS: Record<Produto, string> = {
  'COMEX': 'Comex',
  'FISCAL': 'Fiscal',
  'GALLERY': 'Gallery',
  'CUSTOMER_SUCCESS': 'Customer Success',
  'COMERCIAL': 'Comercial'
};

export interface PessoaOrganograma {
  id: string;
  nome: string;
  cargo: Cargo;
  departamento: string;
  email: string;
  telefone?: string;
  foto_url?: string;
  superior_id?: string; // Mantido para compatibilidade (será removido após migração completa)
  ordem_exibicao?: number; // Ordem de exibição no organograma
  created_at: string;
  updated_at: string;
}

export interface PessoaProduto {
  id: string;
  pessoa_id: string;
  produto: Produto;
  superior_id?: string;
  created_at: string;
  updated_at: string;
}

export interface PessoaComProduto extends PessoaOrganograma {
  produto: Produto;
  superior_id?: string;
  produtos?: Produto[]; // Lista de todos os produtos em que a pessoa está
}

export interface PessoaComSubordinados extends PessoaComProduto {
  subordinados?: PessoaComSubordinados[];
}

export interface FormPessoaOrganograma {
  nome: string;
  cargo: Cargo;
  departamento: string;
  email: string;
  telefone?: string;
  foto?: File;
  produtos: Produto[]; // Produtos selecionados
  superiores: Record<Produto, string | undefined>; // Superior para cada produto
}
