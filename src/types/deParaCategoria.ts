// =====================================================
// Tipos para tabela DE-PARA Categoria e Grupo
// =====================================================

export interface DeParaCategoria {
  id: string;
  categoria: string;
  grupo: string;
  status: 'ativa' | 'inativa';
  criado_em: string;
  atualizado_em: string;
  criado_por?: string;
}

export interface CategoriaOption {
  value: string;
  label: string;
}

export interface GrupoOption {
  value: string;
  label: string;
}
