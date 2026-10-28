// Regras de apresentação da tela Comparação Legado x Novo (Fase 4)
import type { ComparacaoEmpresa, GrupoComparacao } from '@/types/comparacao';

/** Grupo dos indicadores: validada vale mais que a situação; sem resultado, nenhum */
export function grupoDaComparacao(e: ComparacaoEmpresa): GrupoComparacao | null {
  if (!e.situacao) return null;
  if (e.validacao) return 'validada';
  if (e.situacao === 'identico' || e.situacao === 'soma_confere') return 'conferem';
  return e.situacao;
}
