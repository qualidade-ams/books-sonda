/**
 * Auditoria do banco de horas e dos cadastros novos (Modelagem_Fase3.md, seção 9).
 * Lê auditoria_alteracoes com os filtros no banco e pagina pelo momento do
 * último registro (a tabela só cresce). A "área" agrupa as tabelas na tela.
 */

import { supabase } from '@/integrations/supabase/client';
import type {
  AcaoAuditoria,
  CampoAlterado,
  FiltrosAuditoria,
  PaginaAuditoria,
} from '@/types/auditoria';

type Cliente = typeof supabase;
type Linha = Record<string, any>;

const TAMANHO_PAGINA = 100;
/** Brasília não tem horário de verão desde 2019 */
const UTC_MEIA_NOITE_BRASILIA = 'T03:00:00Z';
const AUTORIA = new Set(['id', 'created_at', 'created_by', 'updated_at', 'updated_by']);

const TABELAS_POR_AREA: Record<string, string[]> = {
  'Bancos de horas': ['bancos_horas'],
  'Escopo do banco': ['bancos_horas_escopo'],
  'Baseline do banco': ['bancos_horas_baseline'],
  'Repasse do banco': ['bancos_horas_repasse'],
  Reajustes: ['bancos_horas_reajustes'],
  Observações: ['bancos_horas_observacoes'],
  'Requerimentos do banco': ['requerimentos_bancos'],
  'Fechamentos do mês': ['bancos_horas_fechamentos'],
  'Apontamentos retroativos': ['bancos_horas_retroativos', 'bancos_horas_retroativos_itens'],
  Empresas: ['empresas', 'empresas_solucoes'],
  'Organizações do Aranda': ['empresas_organizacoes_aranda'],
  'Contrato FISCAL': ['empresas_informacoes_contrato'],
  'De-para de grupos': ['grupos_aranda'],
  'Produtos e módulos': ['solucoes', 'produtos', 'produto_modulos', 'modulos_requerimento_produto'],
  'Regras de contagem': ['regras_contagem', 'codigos_resolucao_banco'],
  'Ramos de atividade': ['ramos_atividade'],
  'Organizar Menu': ['menu_itens', 'menu_aparencia'],
};

export const AREAS = Object.keys(TABELAS_POR_AREA);

const AREA_DA_TABELA = new Map(
  Object.entries(TABELAS_POR_AREA).flatMap(([area, tabelas]) => tabelas.map((t) => [t, area]))
);

/** Tabela sem área conhecida aparece pelo próprio nome */
export const areaDaTabela = (tabela: string) => AREA_DA_TABELA.get(tabela) ?? tabela;

/**
 * Alteração: os campos que mudaram. Inclusão e exclusão: os campos preenchidos
 * da linha. Sem colunas de autoria.
 */
export function camposAlterados(
  acao: AcaoAuditoria,
  campos: string[] | null,
  antes: Linha | null,
  depois: Linha | null
): CampoAlterado[] {
  if (acao === 'update') {
    return (campos ?? [])
      .filter((c) => !AUTORIA.has(c))
      .map((c) => ({ campo: c, antes: antes?.[c] ?? null, depois: depois?.[c] ?? null }));
  }
  const linha = (acao === 'insert' ? depois : antes) ?? {};
  return Object.entries(linha)
    .filter(([c, v]) => !AUTORIA.has(c) && v !== null && v !== undefined)
    .map(([c, v]) =>
      acao === 'insert'
        ? { campo: c, antes: null, depois: v }
        : { campo: c, antes: v, depois: null }
    );
}

const proximoDia = (dia: string) => {
  const d = new Date(`${dia}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
};

export class AuditoriaService {
  constructor(
    private readonly cliente: Cliente = supabase,
    private readonly tamanhoPagina = TAMANHO_PAGINA
  ) {}

  async buscar(filtros: FiltrosAuditoria): Promise<PaginaAuditoria> {
    let consulta = this.cliente.from('auditoria_alteracoes').select('*');
    if (filtros.desde)
      consulta = consulta.gte('created_at', `${filtros.desde}${UTC_MEIA_NOITE_BRASILIA}`);
    if (filtros.ate)
      consulta = consulta.lt('created_at', `${proximoDia(filtros.ate)}${UTC_MEIA_NOITE_BRASILIA}`);
    if (filtros.antesDe) consulta = consulta.lt('created_at', filtros.antesDe);
    if (filtros.empresaId) consulta = consulta.eq('empresa_id', filtros.empresaId);
    if (filtros.bancoId) consulta = consulta.eq('banco_id', filtros.bancoId);
    if (filtros.areas?.length) {
      consulta = consulta.in(
        'tabela',
        filtros.areas.flatMap((a) => TABELAS_POR_AREA[a] ?? [a])
      );
    }
    if (filtros.acoes?.length) consulta = consulta.in('acao', filtros.acoes);
    if (filtros.origens?.length) consulta = consulta.in('origem', filtros.origens);
    if (filtros.usuarioId) consulta = consulta.eq('usuario_id', filtros.usuarioId);

    // Um a mais para saber se há outra página
    const { data, error } = await consulta
      .order('created_at', { ascending: false })
      .limit(this.tamanhoPagina + 1);
    if (error) throw new Error(`Falha ao carregar a auditoria: ${error.message}`);

    const linhas = (data as Linha[]).slice(0, this.tamanhoPagina);
    const [usuarios, empresas, bancos] = await Promise.all([
      this.nomesDeUsuarios(linhas.map((l) => l.usuario_id)),
      this.nomes(
        'empresas',
        'nome_abreviado',
        linhas.map((l) => l.empresa_id)
      ),
      this.nomes(
        'bancos_horas',
        'nome',
        linhas.map((l) => l.banco_id)
      ),
    ]);

    return {
      temMais: (data as Linha[]).length > this.tamanhoPagina,
      registros: linhas.map((l) => ({
        id: l.id,
        em: l.created_at,
        usuarioId: l.usuario_id ?? null,
        usuario: l.usuario_id ? (usuarios.get(l.usuario_id) ?? null) : null,
        origem: l.origem,
        tabela: l.tabela,
        area: areaDaTabela(l.tabela),
        registroId: l.registro_id,
        empresaId: l.empresa_id ?? null,
        empresa: l.empresa_id ? (empresas.get(l.empresa_id) ?? null) : null,
        bancoId: l.banco_id ?? null,
        banco: l.banco_id ? (bancos.get(l.banco_id) ?? null) : null,
        acao: l.acao,
        campos: camposAlterados(l.acao, l.campos_alterados, l.dados_antes, l.dados_depois),
        dados: l.dados_depois ?? l.dados_antes ?? null,
        motivo: l.motivo ?? null,
      })),
    };
  }

  /** Sem permissão para os nomes, nenhum: a auditoria continua legível */
  private async nomesDeUsuarios(ids: (string | null)[]): Promise<Map<string, string>> {
    const unicos = [...new Set(ids.filter(Boolean))] as string[];
    if (unicos.length === 0) return new Map();
    const { data, error } = await this.cliente.rpc('perfis_resumo', {
      p_ids: unicos,
      p_emails: null,
    });
    if (error) return new Map();
    return new Map((data ?? []).filter((p) => p.full_name).map((p) => [p.id, p.full_name]));
  }

  private async nomes(
    tabela: 'empresas' | 'bancos_horas',
    coluna: string,
    ids: (string | null)[]
  ): Promise<Map<string, string>> {
    const unicos = [...new Set(ids.filter(Boolean))] as string[];
    if (unicos.length === 0) return new Map();
    const { data, error } = await this.cliente
      .from(tabela)
      .select(`id, ${coluna}`)
      .in('id', unicos);
    if (error) return new Map();
    return new Map((data as Linha[]).map((l) => [l.id, l[coluna]]));
  }
}

export const auditoriaService = new AuditoriaService();
