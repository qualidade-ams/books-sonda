// Dados FICTÍCIOS do protótipo de Ramos de Atividade (DS v2). Os ramos são exemplos da
// Especificação (seção 5.3); as contagens de empresas são fictícias.

/** Tabela `ramos_atividade` (Fase 1), com as contagens que a tela mostra */
export interface RamoMock {
  id: string;
  nome: string;
  ativo: boolean;
  /** Empresas com este ramo como principal */
  empresasPrincipal: number;
  /** Empresas com este ramo como secundário */
  empresasSecundario: number;
  alteradoEm: string; // DD/MM/AAAA
  alteradoPor: string;
}

const ramo = (nome: string, principal: number, secundario: number, ativo = true): RamoMock => ({
  id: `r-${nome
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')}`,
  nome,
  ativo,
  empresasPrincipal: principal,
  empresasSecundario: secundario,
  alteradoEm: '20/10/2026',
  alteradoPor: 'Usuário Teste',
});

export const RAMOS_ATIVIDADE_MOCK: RamoMock[] = [
  ramo('Alimentos e Bebidas', 18, 4),
  ramo('Automotivo', 9, 2),
  ramo('Energia', 14, 1),
  ramo('Farmacêutico', 11, 3),
  ramo('Mineração', 7, 0),
  ramo('Químico e Petroquímico', 16, 5),
  ramo('Siderurgia', 6, 1),
  ramo('Varejo', 21, 6),
  // Inativo: não aparece em cadastros novos, mas segue nas empresas que já o usam
  ramo('Têxtil', 2, 0, false),
];

export const TOTAL_EMPRESAS_MOCK = 190;
