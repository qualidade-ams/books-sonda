// Protótipo da tela nova de Auditoria do Banco de Horas (Especificação v2.0, seção 5.8; Inventário,
// FT-48 a FT-49c), na direção visual aprovada no protótipo de Empresas. Lê `auditoria_alteracoes`
// (Fase 1): quem alterou o quê e quando, nos cadastros novos e nos bancos de horas. Corrige a tela
// atual: mostra o nome do usuário (e não o UUID), filtra por banco e exporta de verdade.
// Dados fictícios (mocks/auditoria.ts). Sem Supabase.
import { useMemo, useState } from 'react';
import {
  Bot,
  ChevronRight,
  FileClock,
  History,
  RefreshCw,
  Search,
  UserRound,
  Users,
} from 'lucide-react';
import { DataTable, type ColunaTabela } from '@/components/ds/DataTable';
import { StatusBadge } from '@/components/ds/StatusBadge';
import { EmptyState } from '@/components/ds/EmptyState';
import { Callout } from '@/components/ds/Callout';
import { Button } from '@/components/ds/Button';
import { cn } from '@/lib/utils';
import type { PrototipoProps } from '@/utils/prototipos';
import { atraso } from './compartilhado/visual';
import { FaixaTopo, PaginaV2 } from './compartilhado/shell';
import { BotaoLimparFiltros, FiltroMultiplo } from './compartilhado/filtros';
import { Paginacao } from './compartilhado/paginacao';
import { DicasContext } from './compartilhado/dicas';
import { campo } from './compartilhado/estilos';
import { Indicador, Interruptor, Secao, TelaEdicao } from './compartilhado/formulario';
import { MenuExportar } from './compartilhado/importacao';
import {
  AREAS_AUDITORIA,
  AUDITORIA_MOCK,
  type AcaoAuditoria,
  type OrigemAuditoria,
  type RegistroAuditoriaMock,
} from './mocks/auditoria';

const ACAO: Record<AcaoAuditoria, { rotulo: string; tom: 'success' | 'info' | 'danger' }> = {
  insert: { rotulo: 'Inclusão', tom: 'success' },
  update: { rotulo: 'Alteração', tom: 'info' },
  delete: { rotulo: 'Exclusão', tom: 'danger' },
};
const ORIGEM: Record<OrigemAuditoria, string> = {
  app: 'Tela',
  sincronizacao: 'Sincronização',
  carga: 'Carga inicial',
  sistema: 'Sistema',
};

const DICAS: Record<string, string> = {
  'Mostrar todos os campos':
    'Por padrão, só os campos que mudaram. Ligado, mostra o registro inteiro antes e depois.',
};

const quem = (r: RegistroAuditoriaMock) =>
  r.usuario ??
  (r.origem === 'sincronizacao'
    ? 'Sincronização com a tela atual'
    : r.origem === 'carga'
      ? 'Carga inicial'
      : 'Sistema');

/** Resumo do que mudou, para a coluna da tabela */
function resumo(r: RegistroAuditoriaMock) {
  const primeiro = r.campos[0];
  if (!primeiro) return '';
  const texto =
    r.acao === 'insert'
      ? `${primeiro.campo}: ${primeiro.depois}`
      : r.acao === 'delete'
        ? `${primeiro.campo}: ${primeiro.antes}`
        : `${primeiro.campo}: ${primeiro.antes ?? '—'} → ${primeiro.depois ?? '—'}`;
  return r.campos.length > 1 ? `${texto} · +${r.campos.length - 1}` : texto;
}

/* ------------------------------------------------------------------ */
/* Detalhe de uma alteração                                             */
/* ------------------------------------------------------------------ */

function DetalheAlteracao({
  registro,
  onFechar,
  onVerHistorico,
}: {
  registro: RegistroAuditoriaMock;
  onFechar: () => void;
  onVerHistorico: () => void;
}) {
  const [todos, setTodos] = useState(false);
  // No protótipo, "todos os campos" acrescenta campos fixos de exemplo, sem mudança
  const campos = todos
    ? [
        ...registro.campos,
        { campo: 'Empresa', antes: registro.empresa, depois: registro.empresa, igual: true },
        { campo: 'Banco', antes: registro.banco, depois: registro.banco, igual: true },
      ].filter((c) => c.antes || c.depois)
    : registro.campos;

  return (
    <TelaEdicao
      voltarPara="Auditoria"
      titulo={`${ACAO[registro.acao].rotulo} · ${registro.area}`}
      subtitulo={`${registro.em} · ${quem(registro)} · origem: ${ORIGEM[registro.origem]}`}
      onFechar={onFechar}
    >
      <Secao titulo="Registro">
        <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-xs text-ds-fg-muted">Registro</dt>
            <dd className="font-medium">{registro.registro}</dd>
          </div>
          <div>
            <dt className="text-xs text-ds-fg-muted">Empresa</dt>
            <dd>{registro.empresa ?? <span className="text-ds-fg-muted">—</span>}</dd>
          </div>
          <div>
            <dt className="text-xs text-ds-fg-muted">Banco</dt>
            <dd>{registro.banco ?? <span className="text-ds-fg-muted">—</span>}</dd>
          </div>
        </dl>
        {registro.motivo && (
          <Callout tom="info" titulo="Motivo informado">
            {registro.motivo}
          </Callout>
        )}
        <Button tamanho="sm" variante="fantasma" onClick={onVerHistorico}>
          <History /> Ver todo o histórico deste registro
        </Button>
      </Secao>

      <Secao titulo="O que mudou">
        <Interruptor ligado={todos} onChange={setTodos} rotulo="Mostrar todos os campos" />
        <div className="overflow-hidden rounded-lg border border-ds-border">
          <table className="w-full text-sm">
            <thead className="bg-ds-bg-subtle text-left text-xs font-medium uppercase tracking-[0.04em] text-ds-fg-muted">
              <tr>
                <th className="px-3 py-2">Campo</th>
                <th className="px-3 py-2">Antes</th>
                <th className="px-3 py-2">Depois</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ds-border">
              {campos.map((c) => {
                const igual = 'igual' in c;
                return (
                  <tr key={c.campo} className={igual ? 'text-ds-fg-muted' : undefined}>
                    <td className="px-3 py-2 font-medium">{c.campo}</td>
                    <td
                      className={cn(
                        'px-3 py-2',
                        !igual &&
                          c.antes &&
                          'text-ds-danger-fg line-through decoration-ds-danger-fg/40'
                      )}
                    >
                      {c.antes ?? <span className="text-ds-fg-muted">—</span>}
                    </td>
                    <td
                      className={cn(
                        'px-3 py-2',
                        !igual && c.depois && 'font-medium text-ds-success-fg'
                      )}
                    >
                      {c.depois ?? <span className="text-ds-fg-muted">—</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Secao>
    </TelaEdicao>
  );
}

/* ------------------------------------------------------------------ */
/* Tela                                                                 */
/* ------------------------------------------------------------------ */

export default function AuditoriaBancoHoras({ estado }: PrototipoProps) {
  const [menuExpandido, setMenuExpandido] = useState(false);
  const [busca, setBusca] = useState('');
  const [periodo, setPeriodo] = useState({ de: '2026-09-21', ate: '2026-10-21' });
  const [empresa, setEmpresa] = useState<string[]>([]);
  const [banco, setBanco] = useState<string[]>([]);
  const [area, setArea] = useState<string[]>([]);
  const [acao, setAcao] = useState<AcaoAuditoria[]>([]);
  const [origem, setOrigem] = useState<OrigemAuditoria[]>([]);
  const [usuario, setUsuario] = useState<string[]>([]);
  const [registroDoHistorico, setRegistroDoHistorico] = useState<string | null>(null);
  const [aberto, setAberto] = useState<RegistroAuditoriaMock | null>(null);
  const [pagina, setPagina] = useState(1);
  const [porPagina, setPorPagina] = useState(50);

  const empresas = [
    ...new Set(AUDITORIA_MOCK.map((r) => r.empresa).filter(Boolean) as string[]),
  ].sort();
  const bancos = [
    ...new Set(
      AUDITORIA_MOCK.filter((r) => !empresa.length || (r.empresa && empresa.includes(r.empresa)))
        .map((r) => r.banco)
        .filter(Boolean) as string[]
    ),
  ].sort();
  const usuarios = [...new Set(AUDITORIA_MOCK.map(quem))].sort();

  const linhas = useMemo(
    () =>
      (estado === 'vazio' ? [] : AUDITORIA_MOCK).filter(
        (r) =>
          (!registroDoHistorico || r.registro === registroDoHistorico) &&
          (!empresa.length || (r.empresa && empresa.includes(r.empresa))) &&
          (!banco.length || (r.banco && banco.includes(r.banco))) &&
          (!area.length || area.includes(r.area)) &&
          (!acao.length || acao.includes(r.acao)) &&
          (!origem.length || origem.includes(r.origem)) &&
          (!usuario.length || usuario.includes(quem(r))) &&
          (!busca ||
            `${r.registro} ${r.area} ${r.campos.map((c) => `${c.campo} ${c.antes} ${c.depois}`).join(' ')} ${r.motivo ?? ''}`
              .toLowerCase()
              .includes(busca.toLowerCase()))
      ),
    [estado, registroDoHistorico, empresa, banco, area, acao, origem, usuario, busca]
  );
  const filtrosAtivos =
    [empresa, banco, area, acao, origem, usuario].filter((f) => f.length).length +
    (registroDoHistorico ? 1 : 0);
  const limpar = () => {
    setBusca('');
    setEmpresa([]);
    setBanco([]);
    setArea([]);
    setAcao([]);
    setOrigem([]);
    setUsuario([]);
    setRegistroDoHistorico(null);
  };

  const totais = {
    alteracoes: linhas.length,
    tela: linhas.filter((r) => r.origem === 'app').length,
    automaticas: linhas.filter((r) => r.origem !== 'app').length,
    usuarios: new Set(linhas.filter((r) => r.usuario).map((r) => r.usuario)).size,
  };

  const colunas: ColunaTabela<RegistroAuditoriaMock>[] = [
    {
      id: 'em',
      cabecalho: 'Data e hora',
      celula: (r) => <span className="whitespace-nowrap tabular-nums">{r.em}</span>,
    },
    {
      id: 'quem',
      cabecalho: 'Quem',
      celula: (r) => (
        <span className="flex items-center gap-1.5">
          {r.usuario ? (
            <UserRound className="h-3.5 w-3.5 text-ds-fg-muted" aria-hidden />
          ) : (
            <Bot className="h-3.5 w-3.5 text-ds-fg-muted" aria-hidden />
          )}
          <span className={cn(!r.usuario && 'text-ds-fg-secondary')}>{quem(r)}</span>
        </span>
      ),
    },
    {
      id: 'registro',
      cabecalho: 'Registro',
      mobile: 'titulo',
      celula: (r) => (
        <div className="min-w-0">
          <p className="font-medium">{r.registro}</p>
          <p className="text-xs text-ds-fg-muted">
            {r.area}
            {r.empresa && ` · ${r.empresa}`}
            {r.banco && ` › ${r.banco}`}
          </p>
        </div>
      ),
    },
    {
      id: 'acao',
      cabecalho: 'Ação',
      celula: (r) => <StatusBadge tom={ACAO[r.acao].tom}>{ACAO[r.acao].rotulo}</StatusBadge>,
    },
    {
      id: 'mudou',
      cabecalho: 'O que mudou',
      celula: (r) => (
        <span className="block max-w-[22rem] truncate text-sm text-ds-fg-secondary">
          {resumo(r)}
        </span>
      ),
    },
    {
      id: 'abrir',
      cabecalho: '',
      mobile: 'oculta',
      celula: () => <ChevronRight className="ml-auto h-4 w-4 text-ds-fg-muted" aria-hidden />,
    },
  ];

  return (
    <DicasContext.Provider value={DICAS}>
      <PaginaV2
        menuAtivo="Banco de Horas"
        menuExpandido={menuExpandido}
        onToggleMenu={() => setMenuExpandido((v) => !v)}
      >
        {aberto ? (
          <DetalheAlteracao
            registro={aberto}
            onFechar={() => setAberto(null)}
            onVerHistorico={() => {
              setRegistroDoHistorico(aberto.registro);
              setAberto(null);
            }}
          />
        ) : (
          <>
            <FaixaTopo>
              <div className="pb-24 pt-3 md:pb-28 md:pt-4">
                <div className="ds-surgir max-w-2xl">
                  <h1 className="font-ds-title text-[26px] font-semibold leading-8 tracking-tight md:text-[34px] md:leading-[42px]">
                    <span className="bg-gradient-to-r from-[#00D4E8] to-[#7CEBF5] bg-clip-text text-transparent">
                      Auditoria
                    </span>{' '}
                    do Banco de Horas
                  </h1>
                  <p className="mt-1.5 text-sm text-[#B1B1B1] md:text-[15px]">
                    Quem alterou o quê e quando, nos cadastros e nos bancos de horas.
                  </p>
                </div>
                <div className="ds-surgir mt-5 flex flex-wrap gap-2" style={atraso(100)}>
                  <MenuExportar total={linhas.length} entidade="alterações" />
                </div>
              </div>
            </FaixaTopo>

            <div className="relative -mt-16 grid grid-cols-2 gap-3 md:-mt-20 lg:grid-cols-4">
              <Indicador
                rotulo="Alterações no período"
                valor={totais.alteracoes}
                icone={<FileClock />}
              />
              <Indicador
                rotulo="Feitas na tela"
                valor={totais.tela}
                icone={<UserRound />}
                atrasoMs={60}
                selecionado={origem.length === 1 && origem[0] === 'app'}
                onClick={() => setOrigem((o) => (o.length === 1 && o[0] === 'app' ? [] : ['app']))}
              />
              <Indicador
                rotulo="Automáticas"
                valor={totais.automaticas}
                icone={<RefreshCw />}
                atrasoMs={120}
                selecionado={origem.length === 3}
                onClick={() =>
                  setOrigem((o) => (o.length === 3 ? [] : ['sincronizacao', 'carga', 'sistema']))
                }
              />
              <Indicador
                rotulo="Usuários"
                valor={totais.usuarios}
                icone={<Users />}
                atrasoMs={180}
              />
            </div>

            <section
              className="ds-surgir mt-6 overflow-hidden rounded-xl border border-ds-border bg-ds-bg-surface"
              style={atraso(240)}
            >
              <div className="space-y-3 border-b border-ds-border p-3 md:p-4">
                <div className="flex flex-wrap items-center gap-2">
                  {(filtrosAtivos > 0 || busca) && <BotaoLimparFiltros onClick={limpar} />}
                  <label className="relative block min-w-0 flex-1 md:w-72 md:flex-none">
                    <Search
                      className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ds-fg-muted"
                      aria-hidden
                    />
                    <input
                      type="search"
                      aria-label="Buscar registro, campo ou valor"
                      placeholder="Buscar registro, campo ou valor"
                      value={busca}
                      onChange={(e) => setBusca(e.target.value)}
                      className={cn(campo, 'pl-9')}
                    />
                  </label>
                  <span className="flex items-center gap-2 text-sm">
                    <input
                      type="date"
                      aria-label="De"
                      value={periodo.de}
                      onChange={(e) => setPeriodo((p) => ({ ...p, de: e.target.value }))}
                      className={cn(campo, 'w-auto')}
                    />
                    <span className="text-ds-fg-muted">até</span>
                    <input
                      type="date"
                      aria-label="Até"
                      value={periodo.ate}
                      onChange={(e) => setPeriodo((p) => ({ ...p, ate: e.target.value }))}
                      className={cn(campo, 'w-auto')}
                    />
                  </span>
                </div>
                <div className="flex flex-wrap gap-2 [&>*]:flex-1 sm:[&>*]:flex-none">
                  <FiltroMultiplo
                    rotulo="Empresa"
                    opcoes={empresas.map((e) => ({ valor: e, rotulo: e }))}
                    selecionados={empresa}
                    onChange={(v) => {
                      setEmpresa(v);
                      setBanco([]);
                    }}
                  />
                  <FiltroMultiplo
                    rotulo="Banco"
                    opcoes={bancos.map((b) => ({ valor: b, rotulo: b }))}
                    selecionados={banco}
                    onChange={setBanco}
                  />
                  <FiltroMultiplo
                    rotulo="Área"
                    opcoes={AREAS_AUDITORIA.map((a) => ({ valor: a, rotulo: a }))}
                    selecionados={area}
                    onChange={setArea}
                  />
                  <FiltroMultiplo
                    rotulo="Ação"
                    opcoes={(Object.keys(ACAO) as AcaoAuditoria[]).map((a) => ({
                      valor: a,
                      rotulo: ACAO[a].rotulo,
                    }))}
                    selecionados={acao}
                    onChange={setAcao}
                  />
                  <FiltroMultiplo
                    rotulo="Origem"
                    opcoes={(Object.keys(ORIGEM) as OrigemAuditoria[]).map((o) => ({
                      valor: o,
                      rotulo: ORIGEM[o],
                    }))}
                    selecionados={origem}
                    onChange={setOrigem}
                  />
                  <FiltroMultiplo
                    rotulo="Quem"
                    opcoes={usuarios.map((u) => ({ valor: u, rotulo: u }))}
                    selecionados={usuario}
                    onChange={setUsuario}
                  />
                </div>
                {registroDoHistorico && (
                  <Callout tom="info" titulo={`Histórico de "${registroDoHistorico}"`}>
                    Mostrando só as alterações deste registro.{' '}
                    <button
                      type="button"
                      className="font-medium text-ds-fg-accent hover:underline"
                      onClick={() => setRegistroDoHistorico(null)}
                    >
                      Ver todas
                    </button>
                  </Callout>
                )}
              </div>

              {estado === 'erro' ? (
                <div className="space-y-3 p-4">
                  <Callout tom="danger" titulo="Não foi possível carregar a auditoria">
                    Verifique a conexão e tente novamente.
                  </Callout>
                  <Button>Tentar novamente</Button>
                </div>
              ) : (
                <DataTable
                  rotulo="Alterações"
                  colunas={colunas}
                  linhas={linhas}
                  chaveLinha={(r) => String(r.id)}
                  carregando={estado === 'carregando'}
                  onLinhaClick={(r) => setAberto(r)}
                  vazio={
                    <EmptyState
                      icone={<FileClock />}
                      titulo="Nenhuma alteração encontrada"
                      descricao={
                        filtrosAtivos || busca
                          ? 'Nenhuma alteração atende aos filtros.'
                          : 'Nenhuma alteração no período.'
                      }
                      acao={
                        filtrosAtivos || busca ? (
                          <Button onClick={limpar}>Limpar filtros</Button>
                        ) : undefined
                      }
                    />
                  }
                />
              )}
              {estado === 'dados' && linhas.length > 0 && (
                <Paginacao
                  total={linhas.length}
                  pagina={pagina}
                  porPagina={porPagina}
                  onPagina={setPagina}
                  onPorPagina={setPorPagina}
                />
              )}
            </section>
          </>
        )}
      </PaginaV2>
    </DicasContext.Provider>
  );
}
