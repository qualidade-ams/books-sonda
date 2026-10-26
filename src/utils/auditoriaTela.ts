// Regras de exibição da tela Auditoria (Modelagem_Fase3.md, seção 9): como identificar o registro,
// o resumo do que mudou, a busca nas alterações carregadas e as opções dos filtros.
import type { MesAno } from '@/services/bancosHoras/calculo';
import type { RegistroAuditoria } from '@/types/auditoria';
import { valorTexto } from '@/utils/controleTela';

export type IdentificacaoRegistro =
  { tipo: 'nome'; texto: string } | { tipo: 'mes'; mes: MesAno } | { tipo: 'desde'; data: string };

/** Colunas que dão nome ao registro, na ordem de preferência */
const COLUNAS_DE_NOME = [
  'nome_abreviado',
  'nome',
  'nome_organizacao',
  'grupo_aranda',
  'modulo_requerimento',
  'chave',
  'codigo',
];

/** Campos de autoria: não interessam no detalhe */
const AUTORIA = new Set(['id', 'created_at', 'created_by', 'updated_at', 'updated_by']);

const preenchido = (v: unknown) => v !== null && v !== undefined && v !== '';

/** Pelo nome, pelo mês (reajustes, observações, fechamentos) ou pela vigência (baseline, repasse) */
export function identificacaoDoRegistro(
  dados: Record<string, unknown> | null
): IdentificacaoRegistro | null {
  if (!dados) return null;
  const coluna = COLUNAS_DE_NOME.find((c) => preenchido(dados[c]));
  if (coluna) return { tipo: 'nome', texto: String(dados[coluna]) };
  if (typeof dados.ano === 'number' && typeof dados.mes === 'number')
    return { tipo: 'mes', mes: { ano: dados.ano, mes: dados.mes } };
  if (typeof dados.data_inicio === 'string') return { tipo: 'desde', data: dados.data_inicio };
  return null;
}

/** Para a coluna da lista: o primeiro campo e quantos mais mudaram */
export function resumoDasMudancas(r: Pick<RegistroAuditoria, 'acao' | 'campos'>): string {
  const [primeiro] = r.campos;
  if (!primeiro) return '';
  const texto =
    r.acao === 'insert'
      ? `${primeiro.campo}: ${valorTexto(primeiro.depois)}`
      : r.acao === 'delete'
        ? `${primeiro.campo}: ${valorTexto(primeiro.antes)}`
        : `${primeiro.campo}: ${valorTexto(primeiro.antes)} → ${valorTexto(primeiro.depois)}`;
  return r.campos.length > 1 ? `${texto} · +${r.campos.length - 1}` : texto;
}

export interface CampoDoDetalhe {
  campo: string;
  antes: string;
  depois: string;
  /** Não mudou: aparece só com "todos os campos" */
  igual: boolean;
}

/** O que mudou e, na alteração, o resto do registro como está */
export function todosOsCampos(r: RegistroAuditoria): CampoDoDetalhe[] {
  const mudaram = r.campos.map((c) => ({
    campo: c.campo,
    antes: valorTexto(c.antes),
    depois: valorTexto(c.depois),
    igual: false,
  }));
  if (r.acao !== 'update' || !r.dados) return mudaram;
  const vistos = new Set(r.campos.map((c) => c.campo));
  const iguais = Object.entries(r.dados)
    .filter(([c, v]) => !vistos.has(c) && !AUTORIA.has(c) && preenchido(v))
    .map(([c, v]) => ({ campo: c, antes: valorTexto(v), depois: valorTexto(v), igual: true }));
  return [...mudaram, ...iguais];
}

const normalizar = (texto: string) =>
  texto
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();

/** Busca nas alterações já carregadas: os filtros da lista vão para o banco */
export function buscarNaAuditoria(registros: RegistroAuditoria[], busca: string) {
  const termo = normalizar(busca.trim());
  if (!termo) return registros;
  return registros.filter((r) => {
    const nome = identificacaoDoRegistro(r.dados);
    const texto = [
      r.empresa,
      r.banco,
      r.usuario,
      r.motivo,
      nome?.tipo === 'nome' ? nome.texto : null,
      ...r.campos.flatMap((c) => [c.campo, valorTexto(c.antes), valorTexto(c.depois)]),
    ]
      .filter(Boolean)
      .join(' ');
    return normalizar(texto).includes(termo);
  });
}

export interface OpcoesAuditoria {
  empresas: { valor: string; rotulo: string }[];
  bancos: { valor: string; rotulo: string; empresaId: string | null }[];
  usuarios: { valor: string; rotulo: string }[];
}

export const OPCOES_VAZIAS: OpcoesAuditoria = { empresas: [], bancos: [], usuarios: [] };

const porRotulo = (a: { rotulo: string }, b: { rotulo: string }) =>
  a.rotulo.localeCompare(b.rotulo, 'pt-BR');

/**
 * Opções dos filtros de empresa, banco e quem: o que já apareceu nas alterações carregadas.
 * Sem nada novo, devolve o mesmo objeto (não redesenha a tela).
 */
export function acumularOpcoes(
  anteriores: OpcoesAuditoria,
  registros: RegistroAuditoria[]
): OpcoesAuditoria {
  const empresas = new Map(anteriores.empresas.map((o) => [o.valor, o]));
  const bancos = new Map(anteriores.bancos.map((o) => [o.valor, o]));
  const usuarios = new Map(anteriores.usuarios.map((o) => [o.valor, o]));
  let mudou = false;
  for (const r of registros) {
    if (r.empresaId && r.empresa && !empresas.has(r.empresaId)) {
      empresas.set(r.empresaId, { valor: r.empresaId, rotulo: r.empresa });
      mudou = true;
    }
    if (r.bancoId && r.banco && !bancos.has(r.bancoId)) {
      bancos.set(r.bancoId, { valor: r.bancoId, rotulo: r.banco, empresaId: r.empresaId });
      mudou = true;
    }
    if (r.usuarioId && r.usuario && !usuarios.has(r.usuarioId)) {
      usuarios.set(r.usuarioId, { valor: r.usuarioId, rotulo: r.usuario });
      mudou = true;
    }
  }
  if (!mudou) return anteriores;
  return {
    empresas: [...empresas.values()].sort(porRotulo),
    bancos: [...bancos.values()].sort(porRotulo),
    usuarios: [...usuarios.values()].sort(porRotulo),
  };
}
