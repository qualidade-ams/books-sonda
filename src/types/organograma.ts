// Tipos para o sistema de organograma

export type Cargo = 'Diretor' | 'Gerente' | 'Coordenador' | 'Central Escalação';
export type Produto = 'COMEX' | 'FISCAL' | 'GALLERY';

export const PRODUTOS: Produto[] = ['COMEX', 'FISCAL', 'GALLERY'];

export const PRODUTO_LABELS: Record<Produto, string> = {
  'COMEX': 'Comex',
  'FISCAL': 'Fiscal',
  'GALLERY': 'Gallery'
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
