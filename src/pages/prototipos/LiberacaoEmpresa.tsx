// Protótipo da liberação por empresa (Fase 5, Modelagem_Fase5.md seção 3 e P7) sobre a
// Comparação Legado x Novo no Design System v2. Validação visual: sem dados reais, sem service.
import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  FileText,
  Info,
  RefreshCw,
  Rocket,
  RotateCcw,
  Search,
  SearchX,
  Send,
  ShieldCheck,
  Undo2,
} from 'lucide-react';
import AdminLayout from '@/components/admin/LayoutAdmin';
import { DsPage } from '@/components/ds/DsPage';
import { FaixaPagina } from '@/components/ds/FaixaPagina';
import { Indicador, TelaEdicao, TituloFaixa } from '@/components/ds/Formulario';
import { DataTable, type ColunaTabela } from '@/components/ds/DataTable';
import { HoursValue } from '@/components/ds/HoursValue';
import { StatusBadge } from '@/components/ds/StatusBadge';
import { Callout } from '@/components/ds/Callout';
import { EmptyState } from '@/components/ds/EmptyState';
import { Button, buttonVariants } from '@/components/ds/Button';
import { ConfirmDialog } from '@/components/ds/ConfirmDialog';
import { MenuExportar } from '@/components/ds/MenuExportar';
import { BotaoLimparFiltros } from '@/components/ds/Filtros';
import { campo } from '@/components/ds/estilos';
import { atraso } from '@/components/ds/Visual';
import { cn } from '@/lib/utils';
import type { PrototipoProps } from '@/utils/prototipos';
import {
  ATUALIZADO_EM,
  COMPARACOES_MOCK,
  PROXIMO_MES,
  ULTIMO_FECHADO,
  type ComparacaoMock,
  type ItemDiferencaMock,
  type MesComparacaoMock,
  type SituacaoComparacao,
  type SituacaoMes,
} from './mocks/liberacaoEmpresa';

type Grupo = 'conferem' | 'explicada' | 'divergente' | 'validada' | 'liberada';
type Tom = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

const SITUACOES: Record<SituacaoComparacao, { rotulo: string; tom: Tom }> = {
  identico: { rotulo: 'Idêntico', tom: 'success' },
  soma_confere: { rotulo: 'Soma confere', tom: 'success' },
  explicada: { rotulo: 'Explicada', tom: 'info' },
  divergente: { rotulo: 'Divergente', tom: 'danger' },
};

const SITUACOES_MES: Record<SituacaoMes, { rotulo: string; tom: Tom }> = {
  igual: { rotulo: 'Igual', tom: 'neutral' },
  explicada: { rotulo: 'Explicada', tom: 'info' },
  divergente: { rotulo: 'Divergente', tom: 'danger' },
};

const grupoDa = (e: ComparacaoMock): Grupo =>
  e.liberada
    ? 'liberada'
    : e.validada
      ? 'validada'
      : e.situacao === 'identico' || e.situacao === 'soma_confere'
        ? 'conferem'
        : e.situacao;

const ultimoSaldo = (e: ComparacaoMock) =>
  e.meses.find((m) => m.mes === ULTIMO_FECHADO)?.saldoLegado ?? null;

const formatarHoras = (minutos: number | null) => {
  if (minutos === null) return '—';
  const abs = Math.abs(minutos);
  return `${minutos < 0 ? '-' : ''}${Math.floor(abs / 60)}:${String(abs % 60).padStart(2, '0')}`;
};

const quantos = (n: number, um: string, varios: string) => `${n} ${n === 1 ? um : varios}`;

const soma = (meses: MesComparacaoMock[], campo: 'consumoLegado' | 'consumoNovo') =>
  meses.reduce((s, m) => s + m[campo], 0);

function Diferenca({ minutos }: { minutos: number }) {
  return (
    <HoursValue
      minutos={minutos}
      sinal="sempre"
      cor={minutos === 0 ? 'neutral' : 'danger'}
      className={minutos ? 'font-semibold' : 'text-ds-fg-muted'}
    />
  );
}

export default function LiberacaoEmpresa({ estado }: PrototipoProps) {
  const [empresas, setEmpresas] = useState(COMPARACOES_MOCK);
  const [busca, setBusca] = useState('');
  const [grupo, setGrupo] = useState<Grupo | null>(null);
  const [abertaId, setAbertaId] = useState<string | null>(null);
  const [mesAberto, setMesAberto] = useState<string | null>(null);
  const [validar, setValidar] = useState(false);
  const [desfazer, setDesfazer] = useState(false);
  const [liberar, setLiberar] = useState(false);
  const [voltar, setVoltar] = useState(false);
  const [testeEnviado, setTesteEnviado] = useState(false);
  const [atualizado, setAtualizado] = useState<Record<string, string>>({});

  const linhas = useMemo(() => {
    if (estado === 'vazio') return [];
    const termo = busca.trim().toLowerCase();
    return empresas.filter(
      (e) => (!termo || e.empresa.toLowerCase().includes(termo)) && (!grupo || grupoDa(e) === grupo)
    );
  }, [empresas, busca, grupo, estado]);

  const contagem = (g: Grupo) => COMPARACOES_MOCK.filter((e) => grupoDa(e) === g).length;
  const filtrando = !!busca.trim() || !!grupo;
  const limpar = () => {
    setBusca('');
    setGrupo(null);
  };

  const aberta = empresas.find((e) => e.id === abertaId);

  const abrir = (e: ComparacaoMock) => {
    setAbertaId(e.id);
    // Abre no mês mais recente com diferença
    setMesAberto([...e.meses].reverse().find((m) => m.situacao !== 'igual')?.mes ?? null);
  };

  const colunas: ColunaTabela<ComparacaoMock>[] = [
    {
      id: 'empresa',
      cabecalho: 'Empresa',
      mobile: 'titulo',
      celula: (e) => (
        <div>
          <span className="font-medium">{e.empresa}</span>
          {e.liberada ? (
            <div className="text-xs text-ds-fg-muted">
              Liberada por {e.liberada.por} em {e.liberada.em}
            </div>
          ) : (
            e.validada && (
              <div className="text-xs text-ds-fg-muted">
                Validada por {e.validada.por} em {e.validada.em}
              </div>
            )
          )}
        </div>
      ),
    },
    { id: 'bancos', cabecalho: 'Bancos', alinhar: 'direita', celula: (e) => e.bancos },
    {
      id: 'meses',
      cabecalho: 'Meses',
      alinhar: 'direita',
      mobile: 'oculta',
      celula: (e) => e.meses.length,
    },
    {
      id: 'legado',
      cabecalho: 'Consumo legado',
      alinhar: 'direita',
      celula: (e) => <HoursValue minutos={soma(e.meses, 'consumoLegado')} />,
    },
    {
      id: 'novo',
      cabecalho: 'Consumo novo',
      alinhar: 'direita',
      celula: (e) => <HoursValue minutos={soma(e.meses, 'consumoNovo')} />,
    },
    {
      id: 'diferenca',
      cabecalho: 'Diferença',
      alinhar: 'direita',
      celula: (e) => (
        <Diferenca minutos={soma(e.meses, 'consumoNovo') - soma(e.meses, 'consumoLegado')} />
      ),
    },
    {
      id: 'situacao',
      cabecalho: 'Situação',
      celula: (e) => (
        <div className="flex flex-wrap gap-1">
          <StatusBadge tom={SITUACOES[e.situacao].tom}>{SITUACOES[e.situacao].rotulo}</StatusBadge>
          {e.liberada ? (
            <StatusBadge tom="info">Liberada</StatusBadge>
          ) : (
            e.validada && <StatusBadge tom="success">Validada</StatusBadge>
          )}
        </div>
      ),
    },
  ];

  if (aberta) {
    const umBanco = aberta.bancos === 1;
    const mes = aberta.meses.find((m) => m.mes === mesAberto);
    const divergentes = aberta.meses.filter((m) => m.situacao === 'divergente').length;

    const colunasMes: ColunaTabela<MesComparacaoMock>[] = [
      {
        id: 'mes',
        cabecalho: 'Mês',
        mobile: 'titulo',
        celula: (m) => <span className="font-medium tabular-nums">{m.mes}</span>,
      },
      {
        id: 'legado',
        cabecalho: 'Consumo legado',
        alinhar: 'direita',
        celula: (m) => <HoursValue minutos={m.consumoLegado} />,
      },
      {
        id: 'novo',
        cabecalho: umBanco ? 'Consumo novo' : 'Soma dos bancos',
        alinhar: 'direita',
        celula: (m) => <HoursValue minutos={m.consumoNovo} />,
      },
      {
        id: 'diferenca',
        cabecalho: 'Diferença',
        alinhar: 'direita',
        celula: (m) => <Diferenca minutos={m.consumoNovo - m.consumoLegado} />,
      },
      ...(umBanco
        ? ([
            {
              id: 'saldo',
              cabecalho: 'Saldo legado / novo',
              alinhar: 'direita',
              mobile: 'detalhe',
              celula: (m) => (
                <span className="inline-flex gap-1.5">
                  <HoursValue minutos={m.saldoLegado} cor="saldo" />
                  <span className="text-ds-fg-muted">/</span>
                  <HoursValue minutos={m.saldoNovo} cor="saldo" />
                </span>
              ),
            },
            {
              id: 'repasse',
              cabecalho: 'Repasse legado / novo',
              alinhar: 'direita',
              mobile: 'oculta',
              celula: (m) => (
                <span className="inline-flex gap-1.5">
                  <HoursValue minutos={m.repasseLegado} />
                  <span className="text-ds-fg-muted">/</span>
                  <HoursValue minutos={m.repasseNovo} />
                </span>
              ),
            },
          ] as ColunaTabela<MesComparacaoMock>[])
        : ([
            {
              id: 'bancos',
              cabecalho: 'Por banco',
              mobile: 'detalhe',
              celula: (m) => (
                <span className="text-[13px] text-ds-fg-secondary">
                  {m.porBanco.map((b, i) => (
                    <span key={b.banco}>
                      {i > 0 && ' · '}
                      {b.banco} <HoursValue minutos={b.minutos} />
                    </span>
                  ))}
                </span>
              ),
            },
          ] as ColunaTabela<MesComparacaoMock>[])),
      {
        id: 'situacao',
        cabecalho: 'Situação',
        celula: (m) => (
          <StatusBadge tom={SITUACOES_MES[m.situacao].tom}>
            {SITUACOES_MES[m.situacao].rotulo}
          </StatusBadge>
        ),
      },
    ];

    const colunasItem: ColunaTabela<ItemDiferencaMock>[] = [
      {
        id: 'chamado',
        cabecalho: 'Chamado',
        mobile: 'titulo',
        celula: (i) => <span className="font-medium">{i.chamado}</span>,
      },
      {
        id: 'data',
        cabecalho: 'Data',
        celula: (i) => <span className="tabular-nums">{i.data}</span>,
      },
      {
        id: 'grupo',
        cabecalho: 'Grupo do Aranda',
        mobile: 'detalhe',
        celula: (i) => <span className="font-ds-mono text-[13px]">{i.grupo}</span>,
      },
      {
        id: 'legado',
        cabecalho: 'Legado',
        alinhar: 'direita',
        celula: (i) =>
          i.minutosLegado === null ? (
            <span className="text-ds-fg-muted">—</span>
          ) : (
            <HoursValue minutos={i.minutosLegado} />
          ),
      },
      {
        id: 'novo',
        cabecalho: 'Novo',
        alinhar: 'direita',
        celula: (i) =>
          i.minutosNovo === null ? (
            <span className="text-ds-fg-muted">—</span>
          ) : (
            <HoursValue minutos={i.minutosNovo} />
          ),
      },
      {
        id: 'motivo',
        cabecalho: 'Motivo',
        celula: (i) => (
          <div className="flex flex-col items-start gap-1">
            <StatusBadge tom={i.explicado ? 'info' : 'danger'}>
              {i.explicado ? 'Explicado' : 'Sem explicação'}
            </StatusBadge>
            <span className="text-[13px] text-ds-fg-secondary">{i.motivo}</span>
          </div>
        ),
      },
    ];

    const resumo = {
      identico: {
        tom: 'success' as const,
        texto: 'Consumo, saldo e repasse iguais ao legado em todos os meses comparados.',
      },
      soma_confere: {
        tom: 'success' as const,
        texto: 'A soma dos bancos é igual ao consumo do legado em todos os meses comparados.',
      },
      explicada: {
        tom: 'info' as const,
        texto: 'As diferenças vêm de correções do modelo novo. A empresa pode ser validada.',
      },
      divergente: {
        tom: 'danger' as const,
        texto: `${divergentes} ${divergentes === 1 ? 'mês tem' : 'meses têm'} diferença sem explicação. Corrija a causa (De-para, Regras de contagem, cadastro do banco) e recalcule.`,
      },
    }[aberta.situacao];

    return (
      <AdminLayout>
        <div className="min-h-screen bg-ds-bg-page">
          <DsPage className="px-4 py-4 md:px-6">
            <TelaEdicao
              voltarPara="Comparação Legado x Novo"
              titulo={aberta.empresa}
              subtitulo={`${aberta.bancos} ${aberta.bancos === 1 ? 'banco' : 'bancos'} · ${aberta.meses.length} meses comparados · atualizado ${atualizado[aberta.id] ?? ATUALIZADO_EM}`}
              onFechar={() => setAbertaId(null)}
            >
              <div className="space-y-4 border-b border-ds-border px-4 py-5 md:px-6">
                {aberta.liberada ? (
                  <Callout tom="info" titulo="Liberada">
                    Book, imagem do e-mail e Saldo Parcial saem pelo modelo novo, um bloco por
                    banco, desde {aberta.liberada.desde}. Liberada por {aberta.liberada.por} em{' '}
                    {aberta.liberada.em}.
                  </Callout>
                ) : (
                  <Callout tom={resumo.tom} titulo={SITUACOES[aberta.situacao].rotulo}>
                    {resumo.texto}
                    {aberta.validada && (
                      <>
                        {' '}
                        Validada por {aberta.validada.por} em {aberta.validada.em}.
                      </>
                    )}
                  </Callout>
                )}
                <div className="flex flex-wrap gap-2">
                  {aberta.liberada ? (
                    <Button variante="perigo" onClick={() => setVoltar(true)}>
                      <RotateCcw /> Voltar para legado
                    </Button>
                  ) : (
                    <>
                      <Button
                        onClick={() => setAtualizado((a) => ({ ...a, [aberta.id]: 'agora mesmo' }))}
                      >
                        <RefreshCw /> Recalcular
                      </Button>
                      {aberta.validada ? (
                        <>
                          <Button onClick={() => setDesfazer(true)}>
                            <Undo2 /> Desfazer validação
                          </Button>
                          <a
                            href="/prototipos/book-consumo-bancos"
                            target="_blank"
                            rel="noreferrer"
                            className={buttonVariants()}
                          >
                            <FileText /> Ver Book de teste
                          </a>
                          <Button onClick={() => setTesteEnviado(true)}>
                            <Send /> Enviar Saldo Parcial de teste para mim
                          </Button>
                          <Button
                            variante="primario"
                            disabled={aberta.situacao === 'divergente'}
                            onClick={() => setLiberar(true)}
                          >
                            <Rocket /> Liberar
                          </Button>
                        </>
                      ) : (
                        <Button
                          variante="primario"
                          disabled={aberta.situacao === 'divergente'}
                          onClick={() => setValidar(true)}
                        >
                          <ShieldCheck /> Marcar como validada
                        </Button>
                      )}
                    </>
                  )}
                </div>
                {testeEnviado && !aberta.liberada && (
                  <Callout tom="success">
                    Saldo Parcial de teste enviado para o seu e-mail, com um bloco por banco. O
                    cliente não recebe nada.
                  </Callout>
                )}
              </div>

              <div className="space-y-3 px-4 py-5 md:px-6">
                <h3 className="text-xs font-bold uppercase tracking-[0.06em] text-ds-fg-secondary">
                  Mês a mês
                </h3>
                <DataTable
                  rotulo="Comparação mês a mês"
                  colunas={colunasMes}
                  linhas={[...aberta.meses].reverse()}
                  chaveLinha={(m) => m.mes}
                  linhaSelecionada={mesAberto ?? undefined}
                  onLinhaClick={(m) => m.itens.length > 0 && setMesAberto(m.mes)}
                />
              </div>

              {mes && mes.itens.length > 0 && (
                <div className="space-y-3 border-t border-ds-border px-4 py-5 md:px-6">
                  <h3 className="text-xs font-bold uppercase tracking-[0.06em] text-ds-fg-secondary">
                    Diferenças em {mes.mes}
                  </h3>
                  <DataTable
                    rotulo={`Diferenças em ${mes.mes}`}
                    colunas={colunasItem}
                    linhas={mes.itens}
                    chaveLinha={(i) => i.id}
                  />
                </div>
              )}
            </TelaEdicao>

            <ConfirmDialog
              aberto={validar}
              onOpenChange={setValidar}
              titulo={`Validar ${aberta.empresa}?`}
              descricao="Fica registrado que a área conferiu a comparação dos meses acima."
              consequencias={[
                'Se um mês novo divergir, a validação cai e a empresa volta para Divergente',
                'O cliente continua recebendo o Book e o Saldo Parcial do legado até a liberação',
              ]}
              rotuloConfirmar="Marcar como validada"
              onConfirmar={() => {
                setEmpresas((l) =>
                  l.map((e) =>
                    e.id === aberta.id
                      ? { ...e, validada: { por: 'Usuário Teste', em: '27/10/2026' } }
                      : e
                  )
                );
                setValidar(false);
              }}
            />
            <ConfirmDialog
              aberto={desfazer}
              onOpenChange={setDesfazer}
              titulo={`Desfazer a validação de ${aberta.empresa}?`}
              rotuloConfirmar="Desfazer validação"
              tom="perigo"
              justificativa={{
                rotulo: 'Motivo',
                placeholder: 'Ex.: o Book de setembro foi retificado',
              }}
              onConfirmar={() => {
                setEmpresas((l) =>
                  l.map((e) => (e.id === aberta.id ? { ...e, validada: undefined } : e))
                );
                setDesfazer(false);
              }}
            />
            <ConfirmDialog
              aberto={liberar}
              onOpenChange={setLiberar}
              titulo={`Liberar ${aberta.empresa}?`}
              descricao={`A partir de ${PROXIMO_MES}, o cliente recebe o Book e o Saldo Parcial pelo modelo novo.`}
              consequencias={[
                umBanco
                  ? `O saldo continua do último Book do legado (${ULTIMO_FECHADO}): ${formatarHoras(ultimoSaldo(aberta))}`
                  : `Cada banco parte do saldo do modelo novo. A diferença para o saldo do legado (${ULTIMO_FECHADO}) vai para o Banco padrão`,
                'Book, imagem do e-mail e Saldo Parcial passam a ter um bloco por banco que o cliente vê',
                'Os Books já enviados não mudam',
                'O Controle atual fica só para consulta desta empresa',
              ]}
              rotuloConfirmar="Liberar"
              onConfirmar={() => {
                setEmpresas((l) =>
                  l.map((e) =>
                    e.id === aberta.id
                      ? {
                          ...e,
                          liberada: {
                            por: 'Usuário Teste',
                            em: '29/10/2026',
                            desde: PROXIMO_MES,
                            reajustes: 0,
                            observacoes: 0,
                          },
                        }
                      : e
                  )
                );
                setLiberar(false);
              }}
            />
            {aberta.liberada && (
              <ConfirmDialog
                aberto={voltar}
                onOpenChange={setVoltar}
                titulo={`Voltar ${aberta.empresa} para o legado?`}
                descricao="O cliente volta a receber o Book e o Saldo Parcial do legado a partir do próximo envio."
                consequencias={[
                  ...(aberta.liberada.reajustes || aberta.liberada.observacoes
                    ? [
                        `${quantos(aberta.liberada.reajustes, 'reajuste', 'reajustes')} e ${quantos(aberta.liberada.observacoes, 'observação', 'observações')} lançados no Controle novo vão para o Controle atual`,
                      ]
                    : []),
                  'Os Books já enviados pelo modelo novo continuam como foram enviados',
                  'A validação é desfeita e a empresa volta para a comparação',
                ]}
                rotuloConfirmar="Voltar para legado"
                tom="perigo"
                justificativa={{
                  rotulo: 'Motivo',
                  placeholder: 'Ex.: o Book de outubro saiu com o banco errado',
                }}
                onConfirmar={() => {
                  setEmpresas((l) =>
                    l.map((e) =>
                      e.id === aberta.id ? { ...e, liberada: undefined, validada: undefined } : e
                    )
                  );
                  setVoltar(false);
                }}
              />
            )}
          </DsPage>
        </div>
      </AdminLayout>
    );
  }

  const indicadores: {
    grupo: Grupo;
    rotulo: string;
    icone: React.ReactNode;
    tom?: 'success' | 'warning';
  }[] = [
    { grupo: 'conferem', rotulo: 'Conferem', icone: <CheckCircle2 /> },
    { grupo: 'explicada', rotulo: 'Explicadas', icone: <Info /> },
    { grupo: 'divergente', rotulo: 'Divergentes', icone: <AlertTriangle />, tom: 'warning' },
    { grupo: 'validada', rotulo: 'Validadas', icone: <ShieldCheck />, tom: 'success' },
    { grupo: 'liberada', rotulo: 'Liberadas', icone: <Rocket /> },
  ];

  return (
    <AdminLayout>
      <div className="min-h-screen bg-ds-bg-page">
        <DsPage className="px-4 py-4 md:px-6">
          <FaixaPagina>
            <div className="pb-24 pt-3 md:pb-28 md:pt-4">
              <div className="ds-surgir max-w-2xl">
                <TituloFaixa texto="Comparação Legado x Novo" />
                <p className="mt-1.5 text-sm text-[#B1B1B1] md:text-[15px]">
                  O cálculo novo, em sombra, comparado com o que o cliente recebeu no Book nos
                  últimos 12 meses fechados
                </p>
              </div>
              <div
                className="ds-surgir mt-5 flex flex-wrap items-center gap-x-4 gap-y-2"
                style={atraso(100)}
              >
                <MenuExportar
                  descricao={`${linhas.length} empresas`}
                  onExportar={() => undefined}
                />
                <span className="text-xs text-[#B1B1B1]">Atualizado {ATUALIZADO_EM}</span>
              </div>
            </div>
          </FaixaPagina>

          <div className="relative !-mt-16 grid grid-cols-2 gap-3 md:!-mt-20 lg:grid-cols-5">
            {indicadores.map((ind, i) => (
              <Indicador
                key={ind.grupo}
                rotulo={ind.rotulo}
                valor={estado === 'vazio' ? 0 : contagem(ind.grupo)}
                icone={ind.icone}
                tom={ind.tom}
                atrasoMs={i * 60}
                selecionado={grupo === ind.grupo}
                onClick={() => setGrupo((g) => (g === ind.grupo ? null : ind.grupo))}
              />
            ))}
          </div>

          <div className="mt-6 space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              {filtrando && <BotaoLimparFiltros onClick={limpar} />}
              <label className="relative block min-w-0 flex-1 md:w-72 md:flex-none">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ds-fg-muted"
                  aria-hidden
                />
                <input
                  type="search"
                  aria-label="Buscar empresa"
                  placeholder="Buscar empresa"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className={cn(campo, 'pl-9')}
                />
              </label>
            </div>

            {estado === 'erro' ? (
              <div className="space-y-3">
                <Callout tom="danger" titulo="Não foi possível carregar a comparação">
                  Verifique a conexão e tente de novo.
                </Callout>
                <Button>Tentar novamente</Button>
              </div>
            ) : (
              <DataTable
                rotulo="Empresas em validação"
                colunas={colunas}
                linhas={linhas}
                chaveLinha={(e) => e.id}
                carregando={estado === 'carregando'}
                onLinhaClick={abrir}
                vazio={
                  <EmptyState
                    icone={<SearchX />}
                    titulo={
                      estado === 'vazio'
                        ? 'Nenhuma empresa com mês fechado para comparar'
                        : 'Nenhuma empresa encontrada'
                    }
                    acao={
                      filtrando && (
                        <Button variante="fantasma" onClick={limpar}>
                          Limpar filtros
                        </Button>
                      )
                    }
                  />
                }
              />
            )}

            <Callout tom="info">
              <strong>1 banco:</strong> consumo, saldo e repasse iguais ao legado.{' '}
              <strong>Vários bancos:</strong> a soma do consumo dos bancos igual ao consumo do
              legado.
            </Callout>
          </div>
        </DsPage>
      </div>
    </AdminLayout>
  );
}
