// =====================================================
// Tipos para tabela DE-PARA Categoria e Grupo
// =====================================================

export interface DeParaCategoria {
  id: string;
  grupo: string;        // Código de resolução (ex: "AMS APL - CAMBIO - N1")
  grupo_book: string;   // Grupo do book (ex: "COMEX - Câmbio")
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
