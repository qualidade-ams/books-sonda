// Protótipo da tela nova de Regras de contagem (decisão de separação dos setores, 16/10/2026): o
// que hoje está fixo no consumo da Fase 2 vira configuração com tela. Mantém os códigos de
// resolução que contam no banco (codigos_resolucao_banco) e os filtros dos apontamentos e tickets
// do Aranda (grupos, tipos de chamado, atividade interna, itens excluídos, tickets fechados).
// Dados fictícios (mocks/regrasContagem.ts). Sem Supabase.
import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Clock,
  Filter,
  ListChecks,
  MoreHorizontal,
  Plus,
  Search,
  Ticket,
  Trash2,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SegmentedTabs } from '@/components/ds/SegmentedTabs';
import { DataTable, type ColunaTabela } from '@/components/ds/DataTable';
import { EmptyState } from '@/components/ds/EmptyState';
import { Callout } from '@/components/ds/Callout';
import { Button } from '@/components/ds/Button';
import { Card } from '@/components/ds/Card';
import { ConfirmDialog } from '@/components/ds/ConfirmDialog';
import { cn } from '@/lib/utils';
import type { PrototipoProps } from '@/utils/prototipos';
import { atraso } from './compartilhado/visual';
import { FaixaTopo, PaginaV2 } from './compartilhado/shell';
import { BotaoLimparFiltros, FiltroMultiplo } from './compartilhado/filtros';
import { DicasContext } from './compartilhado/dicas';
import { BotaoImportar, MenuExportar, TelaImportacao } from './compartilhado/importacao';
import { IMPORTACAO_CODIGOS } from './mocks/importacoes';
import { campo, itemMenu } from './compartilhado/estilos';
import {
  Ajuda,
  BarraRodape,
  ChaveCompacta,
  ChavePrototipo,
  ChavesPrototipo,
  Chip,
  DicaDoRotulo,
  Indicador,
  Interruptor,
  TituloFaixa,
} from './compartilhado/formulario';
import {
  CODIGOS_RESOLUCAO_MOCK,
  CODIGOS_SEM_REGRA_MOCK,
  FILTROS_CONTAGEM_MOCK,
  type CodigoResolucaoMock,
  type CodigoSemRegraMock,
  type FiltrosContagemMock,
} from './mocks/regrasContagem';

/** Para que serve cada regra, pelo rótulo exibido (Modelagem da Fase 2, seção 3) */
const DICAS: Record<string, string> = {
  'Códigos de resolução':
    'Só contam no banco os apontamentos e tickets cujo código de resolução está nesta lista. O código é comparado exatamente como vem do Aranda.',
  'Conta horas': 'Os apontamentos com este código descontam horas do banco.',
  'Conta tickets': 'Os tickets fechados com este código descontam tickets do banco.',
  'Grupos de atendimento que contam':
    'O grupo do apontamento ou do ticket precisa conter um destes textos (sem diferenciar maiúsculas). Os demais grupos não contam no banco.',
  'Tipos de chamado':
    'Tipos de chamado dos apontamentos que contam. Os demais tipos não descontam do banco.',
  'Atividade interna':
    'Apontamentos marcados como atividade interna no Aranda são trabalho da Sonda, não do cliente.',
  'Itens de configuração que não contam':
    'Apontamentos e tickets com um destes itens de configuração não contam no banco (ex.: projetos).',
  Tickets: 'Quais tickets entram na contagem de tickets dos bancos.',
};

const IMPACTO =
  'Valem para os meses abertos, a partir do próximo recálculo. Meses fechados não mudam.';
const plural = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;

/* ------------------------------------------------------------------ */
/* Aba Códigos de resolução                                             */
/* ------------------------------------------------------------------ */

type Conta = 'horas' | 'tickets';

function AbaCodigos({
  estado,
  podeEditar,
  codigos,
  onChange,
}: {
  estado: PrototipoProps['estado'];
  podeEditar: boolean;
  codigos: CodigoResolucaoMock[];
  onChange: (c: CodigoResolucaoMock[]) => void;
}) {
  const [busca, setBusca] = useState('');
  const [conta, setConta] = useState<Conta[]>([]);
  const [novo, setNovo] = useState('');
  const [remover, setRemover] = useState<CodigoResolucaoMock | null>(null);

  const linhas = useMemo(
    () =>
      (estado === 'vazio' ? [] : codigos).filter(
        (c) =>
          (!busca || c.codigo.toLowerCase().includes(busca.toLowerCase())) &&
          (!conta.length ||
            (conta.includes('horas') && c.contaHoras) ||
            (conta.includes('tickets') && c.contaTickets))
      ),
    [estado, codigos, busca, conta]
  );
  const erroNovo = codigos.some((c) => c.codigo === novo.trim())
    ? 'Este código já está na lista.'
    : null;

  const alternar = (c: CodigoResolucaoMock, campo: 'contaHoras' | 'contaTickets') => {
    const atualizado = { ...c, [campo]: !c[campo] };
    // Desligar as duas é o mesmo que tirar o código da lista (a tabela exige pelo menos uma)
    if (!atualizado.contaHoras && !atualizado.contaTickets) {
      setRemover(c);
      return;
    }
    onChange(codigos.map((x) => (x.codigo === c.codigo ? atualizado : x)));
  };
  const adicionar = () => {
    if (!novo.trim() || erroNovo) return;
    onChange([
      {
        codigo: novo.trim(),
        contaHoras: true,
        contaTickets: true,
        apontamentos6m: 0,
        tickets6m: 0,
      },
      ...codigos,
    ]);
    setNovo('');
  };

  const colunas: ColunaTabela<CodigoResolucaoMock>[] = [
    {
      id: 'codigo',
      cabecalho: 'Código de resolução',
      mobile: 'titulo',
      // Espaços visíveis: "Banco=S |SLA=N" e "Banco=S| SLA=N" são códigos diferentes
      celula: (c) => <span className="whitespace-pre-wrap font-medium">{c.codigo}</span>,
    },
    {
      id: 'horas',
      cabecalho: 'Conta horas',
      celula: (c) =>
        podeEditar ? (
          <ChaveCompacta
            ligado={c.contaHoras}
            rotulo={`${c.codigo}: conta horas`}
            onClick={() => alternar(c, 'contaHoras')}
          />
        ) : c.contaHoras ? (
          'Sim'
        ) : (
          <span className="text-ds-fg-muted">Não</span>
        ),
    },
    {
      id: 'tickets',
      cabecalho: 'Conta tickets',
      celula: (c) =>
        podeEditar ? (
          <ChaveCompacta
            ligado={c.contaTickets}
            rotulo={`${c.codigo}: conta tickets`}
            onClick={() => alternar(c, 'contaTickets')}
          />
        ) : c.contaTickets ? (
          'Sim'
        ) : (
          <span className="text-ds-fg-muted">Não</span>
        ),
    },
    {
      id: 'uso',
      cabecalho: 'Uso (6 meses)',
      alinhar: 'direita',
      celula: (c) => (
        <span className="text-xs tabular-nums text-ds-fg-secondary">
          {c.apontamentos6m} apont. · {c.tickets6m} tickets
        </span>
      ),
    },
    ...(podeEditar
      ? [
          {
            id: 'acoes',
            cabecalho: '',
            mobile: 'acoes' as const,
            celula: (c: CodigoResolucaoMock) => (
              <div className="flex justify-end">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button tamanho="icone" variante="fantasma" aria-label={`Ações de ${c.codigo}`}>
                      <MoreHorizontal />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    data-ds="v2"
                    align="end"
                    className="min-w-44 border-ds-border bg-ds-bg-raised p-1 font-ds-sans text-ds-fg"
                  >
                    <DropdownMenuItem
                      className={cn(itemMenu, 'text-ds-danger-fg focus:bg-ds-danger-bg')}
                      onSelect={() => setRemover(c)}
                    >
                      <Trash2 className="h-4 w-4" /> Tirar da lista
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ),
          },
        ]
      : []),
  ];

  return (
    <section className="overflow-hidden rounded-xl border border-ds-border bg-ds-bg-surface">
      <header className="flex items-center gap-1.5 border-b border-ds-border px-4 py-4 md:px-5">
        <h2 className="text-xs font-bold uppercase tracking-[0.06em]">Códigos de resolução</h2>
        <DicaDoRotulo rotulo="Códigos de resolução" />
      </header>
      {podeEditar && estado === 'dados' && (
        <div className="border-b border-ds-border px-4 py-3 md:px-5">
          <div className="flex gap-2">
            <input
              aria-label="Novo código de resolução"
              placeholder="Novo código, exatamente como no Aranda"
              value={novo}
              onChange={(e) => setNovo(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && adicionar()}
              aria-invalid={!!erroNovo}
              className={cn(campo, erroNovo && 'border-ds-danger-fg')}
            />
            <Button variante="primario" onClick={adicionar} className="shrink-0">
              <Plus /> Adicionar
            </Button>
          </div>
          {erroNovo ? (
            <p className="mt-1.5 text-xs text-ds-danger-fg">{erroNovo}</p>
          ) : (
            <Ajuda>
              Entra contando horas e tickets; ajuste nas chaves. Espaços contam: "Banco=S |SLA=N" e
              "Banco=S| SLA=N" são códigos diferentes.
            </Ajuda>
          )}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2 border-b border-ds-border px-4 py-3 md:px-5">
        {(busca || conta.length > 0) && (
          <BotaoLimparFiltros
            onClick={() => {
              setBusca('');
              setConta([]);
            }}
          />
        )}
        <label className="relative block min-w-0 flex-1 md:w-80 md:flex-none">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ds-fg-muted"
            aria-hidden
          />
          <input
            type="search"
            aria-label="Buscar código"
            placeholder="Buscar código"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className={cn(campo, 'pl-9')}
          />
        </label>
        <FiltroMultiplo
          rotulo="Conta"
          opcoes={[
            { valor: 'horas', rotulo: 'Horas' },
            { valor: 'tickets', rotulo: 'Tickets' },
          ]}
          selecionados={conta}
          onChange={setConta}
        />
      </div>
      {estado === 'erro' ? (
        <div className="space-y-3 p-4">
          <Callout tom="danger" titulo="Não foi possível carregar os códigos">
            Verifique a conexão e tente novamente.
          </Callout>
          <Button>Tentar novamente</Button>
        </div>
      ) : (
        <DataTable
          rotulo="Códigos de resolução"
          colunas={colunas}
          linhas={linhas}
          chaveLinha={(c) => c.codigo}
          carregando={estado === 'carregando'}
          vazio={
            <EmptyState
              icone={<ListChecks />}
              titulo={estado === 'vazio' ? 'Nenhum código na lista' : 'Nenhum código encontrado'}
              descricao={
                estado === 'vazio'
                  ? 'Sem códigos na lista, nenhum apontamento ou ticket conta nos bancos.'
                  : undefined
              }
            />
          }
        />
      )}
      <ConfirmDialog
        aberto={!!remover}
        onOpenChange={(v) => !v && setRemover(null)}
        titulo={`Tirar "${remover?.codigo ?? ''}" da lista?`}
        consequencias={[
          'Os apontamentos e tickets com este código deixam de contar nos bancos',
          remover && (remover.apontamentos6m || remover.tickets6m)
            ? `Nos últimos 6 meses: ${remover.apontamentos6m} apontamentos e ${remover.tickets6m} tickets`
            : 'Não há uso nos últimos 6 meses',
          IMPACTO,
        ]}
        rotuloConfirmar="Tirar da lista"
        tom="perigo"
        onConfirmar={() => {
          onChange(codigos.filter((x) => x.codigo !== remover?.codigo));
          setRemover(null);
        }}
      />
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Aba Códigos sem regra                                                */
/* ------------------------------------------------------------------ */

function AbaSemRegra({
  estado,
  podeEditar,
  semRegra,
  onIncluir,
}: {
  estado: PrototipoProps['estado'];
  podeEditar: boolean;
  semRegra: CodigoSemRegraMock[];
  onIncluir: (c: CodigoSemRegraMock) => void;
}) {
  const colunas: ColunaTabela<CodigoSemRegraMock>[] = [
    {
      id: 'codigo',
      cabecalho: 'Código de resolução',
      mobile: 'titulo',
      celula: (c) => <span className="whitespace-pre-wrap font-medium">{c.codigo}</span>,
    },
    {
      id: 'apontamentos',
      cabecalho: 'Apontamentos (6 meses)',
      alinhar: 'direita',
      celula: (c) => <span className="tabular-nums">{c.apontamentos6m}</span>,
    },
    {
      id: 'tickets',
      cabecalho: 'Tickets (6 meses)',
      alinhar: 'direita',
      celula: (c) => <span className="tabular-nums">{c.tickets6m}</span>,
    },
    {
      id: 'primeira',
      cabecalho: 'Primeira ocorrência',
      celula: (c) => <span className="tabular-nums">{c.primeiraOcorrencia}</span>,
    },
    ...(podeEditar
      ? [
          {
            id: 'acoes',
            cabecalho: '',
            mobile: 'acoes' as const,
            celula: (c: CodigoSemRegraMock) => (
              <div className="flex justify-end">
                <Button tamanho="sm" onClick={() => onIncluir(c)}>
                  <Plus /> Incluir na lista
                </Button>
              </div>
            ),
          },
        ]
      : []),
  ];
  return (
    <div className="space-y-4">
      <Callout tom="warning">
        Códigos que aparecem nos apontamentos ou tickets AMS e não estão na lista. Enquanto não
        forem incluídos, não contam nos bancos. Se não devem contar, não é preciso fazer nada.
      </Callout>
      <section className="overflow-hidden rounded-xl border border-ds-border bg-ds-bg-surface">
        <DataTable
          rotulo="Códigos sem regra"
          colunas={colunas}
          linhas={estado === 'vazio' ? [] : semRegra}
          chaveLinha={(c) => c.codigo}
          carregando={estado === 'carregando'}
          vazio={<EmptyState icone={<ListChecks />} titulo="Todos os códigos usados têm regra" />}
        />
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Aba Filtros                                                          */
/* ------------------------------------------------------------------ */

function ListaDeTextos({
  rotulo,
  itens,
  podeEditar,
  placeholder,
  onChange,
}: {
  rotulo: string;
  itens: string[];
  podeEditar: boolean;
  placeholder: string;
  onChange: (itens: string[]) => void;
}) {
  const [novo, setNovo] = useState('');
  const repetido = itens.some((i) => i.toLowerCase() === novo.trim().toLowerCase());
  const adicionar = () => {
    if (!novo.trim() || repetido) return;
    onChange([...itens, novo.trim()]);
    setNovo('');
  };
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {itens.map((i) => (
          <Chip
            key={i}
            onRemover={podeEditar ? () => onChange(itens.filter((x) => x !== i)) : undefined}
          >
            {i}
          </Chip>
        ))}
        {!itens.length && <span className="text-sm text-ds-fg-muted">Nenhum.</span>}
      </div>
      {podeEditar && (
        <div>
          <div className="flex gap-2">
            <input
              aria-label={`Incluir em ${rotulo}`}
              placeholder={placeholder}
              value={novo}
              onChange={(e) => setNovo(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && adicionar()}
              aria-invalid={repetido}
              className={cn(campo, repetido && 'border-ds-danger-fg')}
            />
            <Button onClick={adicionar} className="shrink-0">
              <Plus /> Incluir
            </Button>
          </div>
          {repetido && <p className="mt-1.5 text-xs text-ds-danger-fg">Já está na lista.</p>}
        </div>
      )}
    </div>
  );
}

function TituloRegra({ titulo, aplica }: { titulo: string; aplica: string }) {
  return (
    <span className="flex flex-wrap items-center gap-1.5">
      {titulo}
      <DicaDoRotulo rotulo={titulo} />
      <span className="font-normal normal-case tracking-normal text-ds-fg-muted">· {aplica}</span>
    </span>
  );
}

function AbaFiltros({
  estado,
  podeEditar,
  filtros,
  onChange,
}: {
  estado: PrototipoProps['estado'];
  podeEditar: boolean;
  filtros: FiltrosContagemMock;
  onChange: (f: FiltrosContagemMock) => void;
}) {
  if (estado === 'carregando')
    return (
      <div className="grid gap-4 lg:grid-cols-2" role="status" aria-label="Carregando">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-40 animate-pulse rounded-xl bg-ds-bg-surface" />
        ))}
      </div>
    );
  if (estado === 'erro')
    return (
      <div className="space-y-3">
        <Callout tom="danger" titulo="Não foi possível carregar os filtros">
          Verifique a conexão e tente novamente.
        </Callout>
        <Button>Tentar novamente</Button>
      </div>
    );
  const set = <K extends keyof FiltrosContagemMock>(k: K, v: FiltrosContagemMock[K]) =>
    onChange({ ...filtros, [k]: v });

  return (
    <div className="grid items-start gap-4 lg:grid-cols-2">
      <Card
        titulo={
          <TituloRegra titulo="Grupos de atendimento que contam" aplica="apontamentos e tickets" />
        }
      >
        <ListaDeTextos
          rotulo="Grupos de atendimento que contam"
          itens={filtros.gruposQueContam}
          podeEditar={podeEditar}
          placeholder="Texto que o grupo contém (ex.: AMS APL)"
          onChange={(v) => set('gruposQueContam', v)}
        />
        {!filtros.gruposQueContam.length && (
          <div className="mt-3">
            <Callout tom="warning">Sem nenhum grupo, nenhuma hora conta nos bancos.</Callout>
          </div>
        )}
      </Card>

      <Card
        titulo={
          <TituloRegra
            titulo="Itens de configuração que não contam"
            aplica="apontamentos e tickets"
          />
        }
      >
        <ListaDeTextos
          rotulo="Itens de configuração que não contam"
          itens={filtros.itensExcluidos}
          podeEditar={podeEditar}
          placeholder="Item exatamente como no Aranda"
          onChange={(v) => set('itensExcluidos', v)}
        />
      </Card>

      <Card titulo={<TituloRegra titulo="Tipos de chamado" aplica="apontamentos" />}>
        <ul className="space-y-1" aria-label="Tipos de chamado">
          {filtros.tiposChamado.map((t) => (
            <li key={t.valor}>
              <label className="flex min-h-11 items-center gap-3 text-sm md:min-h-9">
                <input
                  type="checkbox"
                  checked={t.conta}
                  disabled={!podeEditar}
                  onChange={() =>
                    set(
                      'tiposChamado',
                      filtros.tiposChamado.map((x) =>
                        x.valor === t.valor ? { ...x, conta: !x.conta } : x
                      )
                    )
                  }
                  className="h-4 w-4 accent-ds-accent"
                />
                {t.rotulo}
              </label>
            </li>
          ))}
        </ul>
        {filtros.tiposChamado.every((t) => !t.conta) && (
          <div className="mt-3">
            <Callout tom="warning">Sem nenhum tipo, nenhum apontamento conta nos bancos.</Callout>
          </div>
        )}
      </Card>

      <Card titulo="Atividade interna e tickets">
        <div className="space-y-5">
          <Interruptor
            rotulo="Atividade interna"
            ligado={filtros.ignorarAtividadeInterna}
            desabilitado={!podeEditar}
            onChange={(v) => set('ignorarAtividadeInterna', v)}
            descricao={
              filtros.ignorarAtividadeInterna
                ? 'Apontamentos de atividade interna não contam.'
                : 'Atenção: apontamentos de atividade interna passam a contar.'
            }
          />
          <Interruptor
            rotulo="Tickets"
            ligado={filtros.soTicketsFechados}
            desabilitado={!podeEditar}
            onChange={(v) => set('soTicketsFechados', v)}
            descricao={
              filtros.soTicketsFechados
                ? 'Só tickets fechados contam, no mês da data de fechamento.'
                : 'Atenção: tickets abertos passam a contar, no mês de abertura.'
            }
          />
        </div>
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Tela                                                                 */
/* ------------------------------------------------------------------ */

export default function RegrasContagem({ estado }: PrototipoProps) {
  const [menuExpandido, setMenuExpandido] = useState(false);
  const [perfil, setPerfil] = useState<'edicao' | 'leitura'>('edicao');
  const [aba, setAba] = useState('codigos');
  const [codigos, setCodigos] = useState(CODIGOS_RESOLUCAO_MOCK);
  const [semRegra, setSemRegra] = useState(CODIGOS_SEM_REGRA_MOCK);
  const [filtros, setFiltros] = useState(FILTROS_CONTAGEM_MOCK);
  const [confirmar, setConfirmar] = useState(false);
  const [importando, setImportando] = useState(false);
  const podeEditar = perfil === 'edicao';

  // O que mudou desde a última gravação, para a barra de salvar e a confirmação
  const mudancas = useMemo(() => {
    const lista: string[] = [];
    const original = new Map(CODIGOS_RESOLUCAO_MOCK.map((c) => [c.codigo, c]));
    const incluidos = codigos.filter((c) => !original.has(c.codigo)).length;
    const retirados = CODIGOS_RESOLUCAO_MOCK.filter(
      (c) => !codigos.some((x) => x.codigo === c.codigo)
    ).length;
    const alterados = codigos.filter((c) => {
      const o = original.get(c.codigo);
      return o && (o.contaHoras !== c.contaHoras || o.contaTickets !== c.contaTickets);
    }).length;
    if (incluidos) lista.push(`${plural(incluidos, 'código incluído', 'códigos incluídos')}`);
    if (retirados) lista.push(`${plural(retirados, 'código retirado', 'códigos retirados')}`);
    if (alterados) lista.push(`${plural(alterados, 'código alterado', 'códigos alterados')}`);
    if (JSON.stringify(filtros) !== JSON.stringify(FILTROS_CONTAGEM_MOCK))
      lista.push('filtros alterados');
    return lista;
  }, [codigos, filtros]);

  const descartar = () => {
    setCodigos(CODIGOS_RESOLUCAO_MOCK);
    setSemRegra(CODIGOS_SEM_REGRA_MOCK);
    setFiltros(FILTROS_CONTAGEM_MOCK);
  };

  const totais = {
    horas: codigos.filter((c) => c.contaHoras).length,
    tickets: codigos.filter((c) => c.contaTickets).length,
    filtros:
      filtros.gruposQueContam.length +
      filtros.itensExcluidos.length +
      filtros.tiposChamado.filter((t) => t.conta).length +
      (filtros.ignorarAtividadeInterna ? 1 : 0) +
      (filtros.soTicketsFechados ? 1 : 0),
    semRegra: semRegra.length,
  };

  return (
    <DicasContext.Provider value={DICAS}>
      <PaginaV2
        menuAtivo="Banco de Horas"
        menuExpandido={menuExpandido}
        onToggleMenu={() => setMenuExpandido((v) => !v)}
      >
        <ChavesPrototipo>
          <ChavePrototipo<typeof perfil>
            rotulo="Perfil"
            opcoes={[
              ['edicao', 'Edita'],
              ['leitura', 'Só visualiza'],
            ]}
            valor={perfil}
            onChange={setPerfil}
          />
        </ChavesPrototipo>

        {importando ? (
          <TelaImportacao
            voltarPara="Regras de contagem"
            titulo="Importar códigos de resolução"
            entidade="códigos de resolução"
            {...IMPORTACAO_CODIGOS}
            aviso={<Callout tom="info">{IMPACTO}</Callout>}
            onFechar={() => setImportando(false)}
          />
        ) : (
          <>
            <FaixaTopo>
              <div className="pb-24 pt-3 md:pb-28 md:pt-4">
                <div className="ds-surgir max-w-2xl">
                  <TituloFaixa texto="Regras de contagem" />
                  <p className="mt-1.5 text-sm text-[#B1B1B1] md:text-[15px]">
                    O que conta nos bancos de horas: códigos de resolução e filtros dos apontamentos
                    e tickets do Aranda.
                  </p>
                </div>
                <div className="ds-surgir mt-5 flex flex-wrap gap-2" style={atraso(100)}>
                  {podeEditar && <BotaoImportar onClick={() => setImportando(true)} />}
                  <MenuExportar entidade="os códigos de resolução e os filtros" />
                </div>
              </div>
            </FaixaTopo>

            <div className="relative -mt-16 grid grid-cols-2 gap-3 md:-mt-20 lg:grid-cols-4">
              <Indicador rotulo="Códigos que contam horas" valor={totais.horas} icone={<Clock />} />
              <Indicador
                rotulo="Códigos que contam tickets"
                valor={totais.tickets}
                icone={<Ticket />}
                atrasoMs={60}
              />
              <Indicador
                rotulo="Filtros ativos"
                valor={totais.filtros}
                icone={<Filter />}
                atrasoMs={120}
                selecionado={aba === 'filtros'}
                onClick={() => setAba('filtros')}
              />
              <Indicador
                rotulo="Códigos sem regra"
                valor={totais.semRegra}
                icone={<AlertTriangle />}
                tom="warning"
                atrasoMs={180}
                selecionado={aba === 'sem-regra'}
                onClick={() => setAba('sem-regra')}
              />
            </div>

            <div className="mt-6 space-y-4">
              <div className="sticky top-0 z-[5] -mx-1 flex justify-center bg-ds-bg-page px-1 py-1.5">
                <SegmentedTabs
                  rotulo="Seções"
                  itens={[
                    { valor: 'codigos', rotulo: 'Códigos de resolução' },
                    { valor: 'sem-regra', rotulo: 'Códigos sem regra', contador: totais.semRegra },
                    { valor: 'filtros', rotulo: 'Filtros' },
                  ]}
                  valor={aba}
                  onChange={setAba}
                />
              </div>
              <div key={aba} className="ds-surgir" style={atraso(240)}>
                {aba === 'codigos' ? (
                  <AbaCodigos
                    estado={estado}
                    podeEditar={podeEditar}
                    codigos={codigos}
                    onChange={setCodigos}
                  />
                ) : aba === 'sem-regra' ? (
                  <AbaSemRegra
                    estado={estado}
                    podeEditar={podeEditar}
                    semRegra={semRegra}
                    onIncluir={(c) => {
                      setCodigos((cs) => [
                        {
                          codigo: c.codigo,
                          contaHoras: true,
                          contaTickets: true,
                          apontamentos6m: c.apontamentos6m,
                          tickets6m: c.tickets6m,
                        },
                        ...cs,
                      ]);
                      setSemRegra((s) => s.filter((x) => x.codigo !== c.codigo));
                      setAba('codigos');
                    }}
                  />
                ) : (
                  <AbaFiltros
                    estado={estado}
                    podeEditar={podeEditar}
                    filtros={filtros}
                    onChange={setFiltros}
                  />
                )}
              </div>
            </div>

            {mudancas.length > 0 && (
              <BarraRodape>
                <span className="text-sm text-ds-fg-secondary">
                  <span className="font-medium text-ds-fg">{mudancas.join(', ')}</span>. {IMPACTO}
                </span>
                <div className="flex gap-2">
                  <Button onClick={descartar}>Descartar</Button>
                  <Button variante="primario" onClick={() => setConfirmar(true)}>
                    Salvar
                  </Button>
                </div>
              </BarraRodape>
            )}

            <ConfirmDialog
              aberto={confirmar}
              onOpenChange={setConfirmar}
              titulo="Salvar as regras de contagem?"
              descricao="As regras valem para todas as empresas com bancos múltiplos."
              consequencias={[...mudancas.map((m) => m[0].toUpperCase() + m.slice(1)), IMPACTO]}
              rotuloConfirmar="Salvar"
              justificativa={{
                rotulo: 'Motivo da alteração',
                placeholder: 'Ex.: novo código criado no Aranda',
              }}
              onConfirmar={() => setConfirmar(false)}
            />
          </>
        )}
      </PaginaV2>
    </DicasContext.Provider>
  );
}
