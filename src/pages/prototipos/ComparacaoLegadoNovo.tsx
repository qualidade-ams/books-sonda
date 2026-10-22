// Protótipo da Comparação Legado x Novo no Design System v2 (docs/especificacoes/design-system-v2).
// Validação visual: sem dados reais, sem service.
import { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  Layers,
  RefreshCw,
  SearchX,
  ShieldCheck,
} from 'lucide-react';
import AdminLayout from '@/components/admin/LayoutAdmin';
import { DsPage } from '@/components/ds/DsPage';
import { PageHeader } from '@/components/ds/PageHeader';
import { Card } from '@/components/ds/Card';
import { StatCard } from '@/components/ds/StatCard';
import { StatusBadge } from '@/components/ds/StatusBadge';
import { FilterBar } from '@/components/ds/FilterBar';
import { Select } from '@/components/ds/Select';
import { DataTable, type ColunaTabela } from '@/components/ds/DataTable';
import { HoursValue } from '@/components/ds/HoursValue';
import { Callout } from '@/components/ds/Callout';
import { EmptyState } from '@/components/ds/EmptyState';
import { Button } from '@/components/ds/Button';
import { ConfirmDialog } from '@/components/ds/ConfirmDialog';
import type { PrototipoProps } from '@/utils/prototipos';
import {
  COMPARACOES_MOCK,
  DIVERGENCIA_MOCK,
  MESES_COMPARACAO,
  type ApontamentoDivergenteMock,
  type ComparacaoMock,
  type SituacaoComparacao,
} from './mocks/comparacaoLegadoNovo';

const SITUACOES: Record<
  SituacaoComparacao,
  { rotulo: string; tom: 'success' | 'danger' | 'neutral' }
> = {
  identico: { rotulo: 'Idêntico', tom: 'success' },
  soma_confere: { rotulo: 'Soma confere', tom: 'success' },
  divergente: { rotulo: 'Divergente', tom: 'danger' },
  liberada: { rotulo: 'Liberada', tom: 'neutral' },
};

export default function ComparacaoLegadoNovo({ estado }: PrototipoProps) {
  const [empresas, setEmpresas] = useState(COMPARACOES_MOCK);
  const [busca, setBusca] = useState('');
  const [mes, setMes] = useState(MESES_COMPARACAO[0]);
  const [situacao, setSituacao] = useState<'' | SituacaoComparacao>('');
  const [detalheId, setDetalheId] = useState<string | undefined>();
  const [liberar, setLiberar] = useState<ComparacaoMock | null>(null);
  const [voltar, setVoltar] = useState<ComparacaoMock | null>(null);

  const linhas = useMemo(() => {
    if (estado === 'vazio') return [];
    return empresas.filter(
      (e) =>
        (!busca || e.empresa.toLowerCase().includes(busca.toLowerCase())) &&
        (!situacao || e.situacao === situacao)
    );
  }, [empresas, busca, situacao, estado]);

  const filtrosAtivos = (situacao ? 1 : 0) + (mes !== MESES_COMPARACAO[0] ? 1 : 0);
  const detalhe = empresas.find((e) => e.id === detalheId);

  const colunas: ColunaTabela<ComparacaoMock>[] = [
    {
      id: 'empresa',
      cabecalho: 'Empresa',
      mobile: 'titulo',
      celula: (e) => <span className="font-medium">{e.empresa}</span>,
    },
    { id: 'bancos', cabecalho: 'Bancos', alinhar: 'direita', celula: (e) => e.bancos },
    {
      id: 'legado',
      cabecalho: 'Consumo legado',
      alinhar: 'direita',
      celula: (e) => <HoursValue minutos={e.consumoLegado} />,
    },
    {
      id: 'novo',
      cabecalho: 'Soma dos bancos',
      alinhar: 'direita',
      celula: (e) => <HoursValue minutos={e.somaBancos} />,
    },
    {
      id: 'diferenca',
      cabecalho: 'Diferença',
      alinhar: 'direita',
      celula: (e) => {
        const diferenca = e.somaBancos - e.consumoLegado;
        return (
          <HoursValue
            minutos={diferenca}
            cor={diferenca === 0 ? 'neutral' : 'danger'}
            className={diferenca ? 'font-bold' : ''}
          />
        );
      },
    },
    {
      id: 'saldo-legado',
      cabecalho: 'Saldo legado',
      alinhar: 'direita',
      mobile: 'oculta',
      celula: (e) => <HoursValue minutos={e.saldoLegado} />,
    },
    {
      id: 'saldo-novo',
      cabecalho: 'Saldo novo (padrão)',
      alinhar: 'direita',
      mobile: 'oculta',
      celula: (e) => <HoursValue minutos={e.saldoNovo} />,
    },
    {
      id: 'situacao',
      cabecalho: 'Situação',
      celula: (e) => (
        <StatusBadge tom={SITUACOES[e.situacao].tom}>
          {SITUACOES[e.situacao].rotulo}
          {e.liberadaEm && ` em ${e.liberadaEm}`}
        </StatusBadge>
      ),
    },
    {
      id: 'acao',
      cabecalho: 'Ação',
      mobile: 'acoes',
      celula: (e) => {
        if (e.situacao === 'liberada')
          return <Button onClick={() => setVoltar(e)}>Voltar para legado</Button>;
        if (e.situacao === 'divergente')
          return <Button onClick={() => setDetalheId(e.id)}>Ver detalhes</Button>;
        return (
          <Button variante="primario" onClick={() => setLiberar(e)}>
            Liberar empresa
          </Button>
        );
      },
    },
  ];

  const colunasDivergencia: ColunaTabela<ApontamentoDivergenteMock>[] = [
    {
      id: 'chamado',
      cabecalho: 'Chamado',
      mobile: 'titulo',
      celula: (a) => <span className="font-medium">{a.chamado}</span>,
    },
    {
      id: 'data',
      cabecalho: 'Data',
      celula: (a) => <span className="tabular-nums">{a.data}</span>,
    },
    {
      id: 'grupo',
      cabecalho: 'Grupo Aranda',
      celula: (a) => <span className="font-ds-mono text-[13px]">{a.grupo}</span>,
    },
    {
      id: 'horas',
      cabecalho: 'Horas',
      alinhar: 'direita',
      celula: (a) => <HoursValue minutos={a.minutos} />,
    },
    { id: 'motivo', cabecalho: 'Motivo provável', celula: (a) => a.motivo },
  ];

  const total = (s: SituacaoComparacao[]) =>
    COMPARACOES_MOCK.filter((e) => s.includes(e.situacao)).length;

  return (
    <AdminLayout>
      <DsPage>
        <PageHeader
          titulo="Comparação Legado x Novo"
          descricao="Validação do novo modelo antes da liberação de cada empresa"
          acoes={[
            { rotulo: 'Exportar', onClick: () => undefined, icone: <Download /> },
            {
              rotulo: 'Recalcular',
              onClick: () => undefined,
              icone: <RefreshCw />,
              primaria: true,
            },
          ]}
        />

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
          <StatCard
            rotulo="Em validação"
            valor={total(['identico', 'soma_confere', 'divergente'])}
            icone={<Layers />}
            carregando={estado === 'carregando'}
          />
          <StatCard
            rotulo="Sem divergência"
            valor={total(['identico', 'soma_confere'])}
            tom="success"
            icone={<CheckCircle2 />}
            carregando={estado === 'carregando'}
          />
          <StatCard
            rotulo="Com divergência"
            valor={total(['divergente'])}
            tom="danger"
            icone={<AlertTriangle />}
            carregando={estado === 'carregando'}
          />
          <StatCard
            rotulo="Já liberadas"
            valor={total(['liberada'])}
            icone={<ShieldCheck />}
            carregando={estado === 'carregando'}
          />
        </div>

        <Card semPadding>
          <div className="border-b border-ds-border p-4 md:p-5">
            <FilterBar
              busca={{ valor: busca, onChange: setBusca, placeholder: 'Buscar empresa…' }}
              filtrosAtivos={filtrosAtivos}
              onLimpar={() => {
                setSituacao('');
                setMes(MESES_COMPARACAO[0]);
              }}
            >
              <Select
                aria-label="Mês"
                value={mes}
                onChange={(e) => setMes(e.target.value)}
                className="md:w-40"
              >
                {MESES_COMPARACAO.map((m) => (
                  <option key={m}>{m}</option>
                ))}
              </Select>
              <Select
                aria-label="Situação"
                value={situacao}
                onChange={(e) => setSituacao(e.target.value as typeof situacao)}
                className="md:w-48"
              >
                <option value="">Todas as situações</option>
                {Object.entries(SITUACOES).map(([valor, s]) => (
                  <option key={valor} value={valor}>
                    {s.rotulo}
                  </option>
                ))}
              </Select>
            </FilterBar>
          </div>

          {estado === 'erro' ? (
            <div className="space-y-4 p-4 md:p-5">
              <Callout tom="danger" titulo="Não foi possível carregar a comparação">
                O cálculo em sombra pode estar em andamento. Tente novamente em instantes.
              </Callout>
              <Button>Tentar novamente</Button>
            </div>
          ) : (
            <DataTable
              rotulo={`Comparação de ${mes}`}
              colunas={colunas}
              linhas={linhas}
              chaveLinha={(e) => e.id}
              carregando={estado === 'carregando'}
              linhaSelecionada={detalheId}
              vazio={
                <EmptyState
                  icone={<SearchX />}
                  titulo={
                    estado === 'vazio'
                      ? 'Nenhuma empresa em validação'
                      : 'Nenhuma empresa encontrada'
                  }
                  descricao={
                    estado === 'vazio'
                      ? 'Todas as empresas já estão liberadas ou nenhuma tem cálculo em sombra neste mês.'
                      : 'Ajuste a busca ou os filtros.'
                  }
                  acao={
                    estado !== 'vazio' && (
                      <Button
                        variante="fantasma"
                        onClick={() => {
                          setBusca('');
                          setSituacao('');
                        }}
                      >
                        Limpar filtros
                      </Button>
                    )
                  }
                />
              }
            />
          )}
        </Card>

        {detalhe && (
          <Card
            titulo={`Divergência — ${detalhe.empresa}`}
            descricao={`${mes} · apontamentos que explicam a diferença de 01:30`}
            semPadding
            acoes={
              <Button variante="fantasma" tamanho="sm" onClick={() => setDetalheId(undefined)}>
                Fechar
              </Button>
            }
          >
            <DataTable
              rotulo="Apontamentos divergentes"
              colunas={colunasDivergencia}
              linhas={DIVERGENCIA_MOCK}
              chaveLinha={(a) => a.id}
            />
          </Card>
        )}

        <Callout tom="info">
          Empresas com <strong>1 banco</strong> precisam ter saldo idêntico ao legado. Empresas com{' '}
          <strong>vários bancos</strong> precisam ter a soma do consumo dos bancos igual ao consumo
          total do legado (nenhuma hora perdida ou duplicada).
        </Callout>

        <ConfirmDialog
          aberto={!!liberar}
          onOpenChange={(aberto) => !aberto && setLiberar(null)}
          titulo={`Liberar ${liberar?.empresa ?? ''}?`}
          descricao="A empresa passa a usar os bancos múltiplos no Book, no Saldo Parcial e nas planilhas."
          consequencias={[
            'Vale a partir do próximo envio',
            'É possível voltar para o legado a qualquer momento',
          ]}
          rotuloConfirmar="Liberar empresa"
          onConfirmar={() => {
            setEmpresas((lista) =>
              lista.map((e) =>
                e.id === liberar?.id ? { ...e, situacao: 'liberada', liberadaEm: '15/10' } : e
              )
            );
            setLiberar(null);
          }}
        />

        <ConfirmDialog
          aberto={!!voltar}
          onOpenChange={(aberto) => !aberto && setVoltar(null)}
          titulo={`Voltar ${voltar?.empresa ?? ''} para o legado?`}
          descricao="A empresa volta imediatamente ao cálculo atual. Os bancos e o histórico continuam guardados."
          rotuloConfirmar="Voltar para legado"
          tom="perigo"
          justificativa={{
            rotulo: 'Motivo',
            placeholder: 'Ex.: divergência encontrada no Book de setembro',
          }}
          onConfirmar={() => {
            setEmpresas((lista) =>
              lista.map((e) =>
                e.id === voltar?.id ? { ...e, situacao: 'soma_confere', liberadaEm: undefined } : e
              )
            );
            setVoltar(null);
          }}
        />
      </DsPage>
    </AdminLayout>
  );
}
