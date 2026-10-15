// Protótipo do Controle de Banco de Horas no Design System v2 (docs/especificacoes/design-system-v2).
// Validação visual: sem dados reais, sem service. Seções Reajustes, Observações e Histórico ficam para a próxima rodada.
import { useState } from 'react';
import {
  AlertTriangle,
  CalendarClock,
  Clock,
  History,
  RefreshCw,
  Send,
  Sigma,
  TrendingUp,
} from 'lucide-react';
import AdminLayout from '@/components/admin/LayoutAdmin';
import { DsPage } from '@/components/ds/DsPage';
import { PageHeader } from '@/components/ds/PageHeader';
import { Card } from '@/components/ds/Card';
import { StatCard } from '@/components/ds/StatCard';
import { StatusBadge } from '@/components/ds/StatusBadge';
import { SegmentedTabs } from '@/components/ds/SegmentedTabs';
import { MatrixTable, type LinhaMatriz } from '@/components/ds/MatrixTable';
import { DataTable, type ColunaTabela } from '@/components/ds/DataTable';
import { HoursValue } from '@/components/ds/HoursValue';
import { Callout } from '@/components/ds/Callout';
import { EmptyState } from '@/components/ds/EmptyState';
import { Button } from '@/components/ds/Button';
import { Select } from '@/components/ds/Select';
import { PeriodPicker } from '@/components/ds/PeriodPicker';
import { ConfirmDialog } from '@/components/ds/ConfirmDialog';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import type { PrototipoProps } from '@/utils/prototipos';
import {
  BANCOS_MOCK,
  EMPRESAS_MOCK,
  MESES_MOCK,
  QUADRO_MOCK,
  REQUERIMENTOS_MOCK,
  type RequerimentoMock,
} from './mocks/controleBancoHorasV2';

const SECOES = [
  { valor: 'quadro', rotulo: 'Quadro mensal' },
  { valor: 'requerimentos', rotulo: 'Requerimentos', contador: REQUERIMENTOS_MOCK.length },
  { valor: 'reajustes', rotulo: 'Reajustes' },
  { valor: 'observacoes', rotulo: 'Observações' },
  { valor: 'historico', rotulo: 'Histórico' },
];

export default function ControleBancoHorasV2({ estado }: PrototipoProps) {
  const isCelular = !useMediaQuery('(min-width: 768px)');
  const [empresa, setEmpresa] = useState(EMPRESAS_MOCK[0]);
  const [bancoId, setBancoId] = useState('edocs');
  const [secao, setSecao] = useState('quadro');
  const [modoMobile, setModoMobile] = useState<'rolagem' | 'mes-a-mes'>('mes-a-mes');
  const [requerimentos, setRequerimentos] = useState(REQUERIMENTOS_MOCK);
  const [recalcularAberto, setRecalcularAberto] = useState(false);

  const banco = BANCOS_MOCK.find((b) => b.id === bancoId) ?? BANCOS_MOCK[0];
  const carregando = estado === 'carregando';

  const linhasQuadro: LinhaMatriz[] = QUADRO_MOCK.map((indicador) => ({
    id: indicador.id,
    rotulo: indicador.rotulo,
    enfase: indicador.enfase,
    selo: indicador.selo,
    acao:
      indicador.id === 'reajustes' ? (
        <Button tamanho="sm" variante="fantasma" onClick={() => setSecao('reajustes')}>
          Reajustar
        </Button>
      ) : undefined,
    valores: Object.fromEntries(
      MESES_MOCK.map((mes) => [
        mes.id,
        <HoursValue
          key={mes.id}
          minutos={indicador.valores[mes.id]}
          sinal={indicador.sinal}
          cor={indicador.cor ?? 'neutral'}
        />,
      ])
    ),
  }));

  const colunasRequerimentos: ColunaTabela<RequerimentoMock>[] = [
    {
      id: 'requerimento',
      cabecalho: 'Requerimento',
      mobile: 'titulo',
      celula: (r) => (
        <div>
          <p className="font-medium">{r.codigo}</p>
          <p className="text-xs text-ds-fg-muted">{r.titulo}</p>
        </div>
      ),
    },
    { id: 'modulo', cabecalho: 'Módulo', celula: (r) => r.modulo },
    {
      id: 'horas',
      cabecalho: 'Horas',
      alinhar: 'direita',
      celula: (r) => <HoursValue minutos={r.minutos} />,
    },
    {
      id: 'status',
      cabecalho: 'Status',
      celula: (r) =>
        r.status === 'faturamento' ? (
          <StatusBadge tom="success">Enviado p/ faturamento</StatusBadge>
        ) : (
          <StatusBadge tom="neutral">Em desenvolvimento</StatusBadge>
        ),
    },
    {
      id: 'banco',
      cabecalho: 'Banco',
      celula: (r) => (
        <Select
          aria-label={`Banco do ${r.codigo}`}
          value={r.bancoId}
          className="w-full min-w-[11rem]"
          onChange={(e) =>
            setRequerimentos((lista) =>
              lista.map((item) =>
                item.id === r.id
                  ? {
                      ...item,
                      bancoId: e.target.value,
                      origem: { tipo: 'ajustada', por: 'Usuário Teste', em: '15/10/2026' },
                    }
                  : item
              )
            )
          }
        >
          {BANCOS_MOCK.map((b) => (
            <option key={b.id} value={b.id}>
              {b.nome}
            </option>
          ))}
        </Select>
      ),
    },
    {
      id: 'origem',
      cabecalho: 'Origem da classificação',
      celula: (r) =>
        r.origem.tipo === 'automatica' ? (
          <span className="inline-flex flex-wrap items-center gap-2">
            <StatusBadge tom="info">Automática</StatusBadge>
            <span className="text-xs text-ds-fg-muted">{r.origem.regra}</span>
          </span>
        ) : (
          <span className="inline-flex flex-wrap items-center gap-2">
            <StatusBadge tom="warning">Ajustada</StatusBadge>
            <span className="text-xs text-ds-fg-muted">
              por {r.origem.por} em {r.origem.em}
            </span>
          </span>
        ),
    },
  ];

  const conteudoSecao = () => {
    if (secao === 'quadro') {
      return (
        <Card
          titulo={banco.nome}
          descricao={`Escopo: ${banco.escopo} · Dez/2026 é o mês de fechamento do período de apuração`}
          semPadding
          acoes={
            isCelular ? (
              <SegmentedTabs
                rotulo="Modo no celular (só no protótipo)"
                itens={[
                  { valor: 'mes-a-mes', rotulo: 'Mês a mês' },
                  { valor: 'rolagem', rotulo: 'Rolagem' },
                ]}
                valor={modoMobile}
                onChange={(v) => setModoMobile(v as typeof modoMobile)}
              />
            ) : undefined
          }
        >
          <MatrixTable
            key={modoMobile}
            rotulo={`Quadro mensal — ${banco.nome}`}
            rotuloIndicador="Indicador"
            colunas={MESES_MOCK}
            linhas={linhasQuadro}
            modoMobile={modoMobile}
            colunaInicial="2026-12"
          />
          <div className="p-4 md:p-5">
            <Callout tom="info" titulo="Observação automática — Dez/2026">
              No fechamento do período, <strong>06:30</strong> horas foram consumidas do{' '}
              <strong>Banco FISCAL</strong> para cobrir o saldo negativo deste banco. Não houve
              excedentes.
            </Callout>
          </div>
        </Card>
      );
    }

    if (secao === 'requerimentos') {
      return (
        <Card semPadding>
          <div className="p-4 md:p-5">
            <Callout tom="info" titulo="Classificação automática">
              Os requerimentos de "Banco de Horas" continuam sendo lançados na tela de
              Requerimentos. Aqui aparece em qual banco cada um foi classificado (pelo módulo) e é
              possível corrigir.
            </Callout>
          </div>
          <DataTable
            rotulo="Requerimentos do mês"
            colunas={colunasRequerimentos}
            linhas={requerimentos}
            chaveLinha={(r) => r.id}
          />
          <p className="border-t border-ds-border px-4 py-3 text-xs text-ds-fg-muted md:px-5">
            Ajustes de banco ficam registrados com usuário e data e entram no próximo recálculo;
            meses fechados não são alterados.
          </p>
        </Card>
      );
    }

    return (
      <Card>
        <EmptyState
          icone={<CalendarClock />}
          titulo="Seção fora desta rodada do protótipo"
          descricao="Reajustes, Observações e Histórico entram na próxima rodada, com o formulário em modal e a linha do tempo."
        />
      </Card>
    );
  };

  const corpo = () => {
    if (estado === 'erro') {
      return (
        <Card>
          <Callout tom="danger" titulo="Não foi possível carregar o banco de horas">
            Verifique a conexão e tente novamente.
          </Callout>
          <div className="mt-4">
            <Button>Tentar novamente</Button>
          </div>
        </Card>
      );
    }

    if (estado === 'vazio') {
      return (
        <Card>
          <EmptyState
            icone={<Clock />}
            titulo="Ainda não há cálculo para este período"
            descricao="O cálculo é feito automaticamente todo dia. Você pode calcular agora."
            acao={<Button variante="primario">Calcular agora</Button>}
          />
        </Card>
      );
    }

    return (
      <>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
          <StatCard
            rotulo="Baseline"
            valor={<HoursValue minutos={2400} />}
            icone={<Clock />}
            carregando={carregando}
          />
          <StatCard
            rotulo="Consumo no mês"
            valor={<HoursValue minutos={2640} />}
            icone={<Sigma />}
            carregando={carregando}
          />
          <StatCard
            rotulo="Saldo"
            valor={<HoursValue minutos={-390} />}
            tom="danger"
            icone={<TrendingUp />}
            carregando={carregando}
          />
          <StatCard
            rotulo="Excedentes"
            valor={<HoursValue minutos={0} />}
            icone={<AlertTriangle />}
            carregando={carregando}
          />
        </div>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <SegmentedTabs
            rotulo="Bancos da empresa"
            itens={BANCOS_MOCK.map((b) => ({
              valor: b.id,
              rotulo: b.nome,
              selo: b.padrao ? 'padrão' : undefined,
            }))}
            valor={bancoId}
            onChange={setBancoId}
          />
          <p className="text-xs text-ds-fg-muted">
            Contrato: {banco.contrato}
            {banco.consomeOutros && (
              <>
                {' · '}
                <span className="font-medium text-ds-fg-accent">consome de outros bancos: sim</span>
              </>
            )}
          </p>
        </div>

        <SegmentedTabs
          rotulo="Seções do banco"
          variante="sublinhado"
          itens={SECOES}
          valor={secao}
          onChange={setSecao}
        />

        {carregando ? (
          <Card semPadding>
            <DataTable
              rotulo="Quadro mensal"
              colunas={[]}
              linhas={[]}
              chaveLinha={() => ''}
              carregando
            />
          </Card>
        ) : (
          conteudoSecao()
        )}
      </>
    );
  };

  return (
    <AdminLayout>
      <DsPage>
        <PageHeader
          titulo="Controle de Banco de Horas"
          descricao="Acompanhamento mensal de consumo, saldo e repasse"
          acoes={[
            { rotulo: 'Histórico', onClick: () => setSecao('historico'), icone: <History /> },
            { rotulo: 'Enviar Saldo Parcial', onClick: () => undefined, icone: <Send /> },
            {
              rotulo: 'Recalcular',
              onClick: () => setRecalcularAberto(true),
              icone: <RefreshCw />,
              primaria: true,
            },
          ]}
        />

        <Card>
          <div className="flex flex-col gap-3 md:flex-row md:flex-wrap md:items-center">
            <Select
              aria-label="Empresa"
              value={empresa}
              onChange={(e) => setEmpresa(e.target.value)}
              className="w-full md:w-72"
            >
              {EMPRESAS_MOCK.map((e) => (
                <option key={e}>{e}</option>
              ))}
            </Select>
            <PeriodPicker
              rotulo="Out/2026 – Dez/2026"
              onAnterior={() => undefined}
              onProximo={() => undefined}
              podeProximo={false}
            />
            <StatusBadge tom="success">Modelo: Bancos múltiplos</StatusBadge>
          </div>
        </Card>

        {corpo()}

        <ConfirmDialog
          aberto={recalcularAberto}
          onOpenChange={setRecalcularAberto}
          titulo="Recalcular o banco de horas?"
          descricao="O cálculo do período aberto é refeito com os apontamentos e requerimentos atuais."
          consequencias={[
            'Meses fechados não mudam; para eles, use a retificação do Book',
            'O resultado anterior fica no histórico de versões',
          ]}
          rotuloConfirmar="Recalcular"
          onConfirmar={() => setRecalcularAberto(false)}
        />
      </DsPage>
    </AdminLayout>
  );
}
