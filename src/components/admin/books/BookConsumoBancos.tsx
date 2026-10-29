/**
 * Página de consumo do Book para um banco (Fase 5, Modelagem_Fase5.md seção 6.2). Mesmo layout
 * do BookConsumo, repetido por banco que o cliente vê, com o nome do banco e o período de
 * apuração no título. Lê só o snapshot gravado na geração (books_consumo_bancos): nenhuma
 * consulta ao vivo, para o PDF de um Book enviado não mudar com o tempo.
 */
import { useTranslation } from 'react-i18next';
import { CheckCircle2, Clock, FileText, MessageSquare, TrendingUp } from 'lucide-react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { MesAno, Unidade } from '@/services/bancosHoras/calculo';
import type { ResultadoUnidade } from '@/services/bancosHoras/motorBancosHoras';
import type { LinhaConsumoBook } from '@/services/bookConsumoBancosService';

const borda = { borderRadius: '35.5px', borderColor: '#666666' };

const mesmoMes = (a: MesAno, b: MesAno) => a.mes === b.mes && a.ano === b.ano;

function rotuloMes(m: MesAno, idioma: string) {
  const nome = new Date(m.ano, m.mes - 1, 1)
    .toLocaleDateString(idioma, { month: 'short' })
    .replace('.', '');
  return `${nome.charAt(0).toUpperCase()}${nome.slice(1)}/${String(m.ano).slice(-2)}`;
}

/** Horas em HH:MM (negativo com sinal); tickets como quantidade */
function formatar(valor: number | null | undefined, unidade: Unidade) {
  if (valor === null || valor === undefined) return '—';
  if (unidade === 'tickets') return String(valor);
  const abs = Math.abs(valor);
  const hhmm = `${String(Math.floor(abs / 60)).padStart(2, '0')}:${String(abs % 60).padStart(2, '0')}`;
  return valor < 0 ? `-${hhmm}` : hhmm;
}

const cor = (valor: number | null | undefined) =>
  !valor ? '' : valor < 0 ? 'text-red-600' : 'text-green-600';

const reais = (valor: number, idioma: string) =>
  `R$ ${valor.toLocaleString(idioma, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function Metrica({
  id,
  titulo,
  valor,
  rodape,
  icone,
  fundo,
}: {
  id: string;
  titulo: string;
  valor: string;
  rodape: string;
  icone: React.ReactNode;
  fundo: string;
}) {
  return (
    <Card className="border-2" style={borda} data-testid={`card-${id}`}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-xs font-medium text-gray-600">
          <div className={`flex h-8 w-8 items-center justify-center rounded-full ${fundo}`}>
            {icone}
          </div>
          {titulo}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold text-black">{valor}</div>
        <div className="mt-2 text-xs text-gray-600">{rodape}</div>
      </CardContent>
    </Card>
  );
}

export default function BookConsumoBancos({
  banco,
  empresaDoBook,
}: {
  banco: LinhaConsumoBook;
  /** Empresa do Book: o banco de outra empresa é de uma consolidada e mostra o nome dela */
  empresaDoBook: string;
}) {
  const { t, i18n } = useTranslation();
  const c = (chave: string, valores?: Record<string, unknown>) =>
    t(`books.bookContent.${chave}`, valores);
  const idioma = i18n.language;
  const { dados } = banco;

  // D-02: no contrato "ambos", os chamados contam em tickets
  const principal: Unidade = dados.tipoContrato === 'horas' ? 'horas' : 'tickets';
  const unidades = (['horas', 'tickets'] as Unidade[]).filter((u) =>
    dados.meses.some((m) => m.resultado?.[u])
  );
  const doMes = dados.meses.find((m) => mesmoMes(m.mes, dados.mes))?.resultado ?? null;
  const atual: ResultadoUnidade | null = doMes?.[principal] ?? null;
  const percentual = (parte: number, todo: number) =>
    todo > 0 ? Math.round((parte / todo) * 100) : 0;
  const fmt = (v: number | null | undefined) => formatar(v, principal);

  const periodo =
    dados.meses.length > 1
      ? `${rotuloMes(dados.meses[0].mes, idioma)} – ${rotuloMes(dados.meses.at(-1)!.mes, idioma)}`
      : rotuloMes(dados.mes, idioma);
  const porTipo = (tipo: 'incidente' | 'solicitacao') =>
    principal === 'horas' ? dados.porTipo[tipo].minutos : dados.porTipo[tipo].tickets;
  const consumoChamados = atual?.consumo ?? 0;

  return (
    <div className="relative flex h-full w-full flex-col bg-white p-8">
      <div className="flex-1 space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            {c('consumptionTitle')} <span className="text-blue-600">{banco.nome_banco}</span>
          </h2>
          <p className="text-sm text-gray-500">
            {banco.empresa_id !== empresaDoBook ? `${banco.nome_empresa} · ` : ''}
            {c('bankPeriod', { periodo })}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-6">
          <Metrica
            id="consumo-total"
            titulo={c('totalConsumption')}
            valor={fmt(atual?.consumoTotal)}
            rodape={c('consumptionPlusRequirements')}
            icone={<TrendingUp className="h-4 w-4 text-purple-600" />}
            fundo="bg-purple-100"
          />
          <Metrica
            id="consumo"
            titulo={c('hoursConsumption')}
            valor={fmt(atual?.consumo)}
            rodape={c('ticketsLegend')}
            icone={<Clock className="h-4 w-4 text-blue-600" />}
            fundo="bg-blue-100"
          />
          <Metrica
            id="requerimentos"
            titulo={c('hoursRequirements')}
            valor={fmt(atual?.requerimentos)}
            rodape={c('requirementsCount', { count: dados.requerimentos.length })}
            icone={<FileText className="h-4 w-4 text-orange-600" />}
            fundo="bg-orange-100"
          />
          <Metrica
            id="baseline"
            titulo={c('baselineAPL')}
            valor={fmt(atual?.baseline)}
            rodape={c('percentConsumed', {
              percent: percentual(atual?.consumoTotal ?? 0, atual?.baseline ?? 0),
            })}
            icone={<TrendingUp className="h-4 w-4 text-purple-600" />}
            fundo="bg-purple-100"
          />
          <Metrica
            id="incidente"
            titulo={c('incident')}
            valor={fmt(porTipo('incidente'))}
            rodape={c('percentOfTotal', {
              percent: percentual(porTipo('incidente'), consumoChamados),
            })}
            icone={<CheckCircle2 className="h-4 w-4 text-blue-600" />}
            fundo="bg-blue-100"
          />
          <Metrica
            id="solicitacao"
            titulo={c('request')}
            valor={fmt(porTipo('solicitacao'))}
            rodape={c('percentOfTotal', {
              percent: percentual(porTipo('solicitacao'), consumoChamados),
            })}
            icone={<CheckCircle2 className="h-4 w-4 text-green-600" />}
            fundo="bg-green-100"
          />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card className="border-2 lg:col-span-2" style={borda}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">{c('hoursMonth')}</CardTitle>
              <p className="text-xs text-gray-500">{c('bankConsumptionHistory')}</p>
            </CardHeader>
            <CardContent className="pt-2">
              <ResponsiveContainer width="100%" height={240}>
                <LineChart
                  data={dados.historico.map((h) => ({
                    mes: rotuloMes(h.mes, idioma),
                    consumo: principal === 'horas' ? h.minutos / 60 : h.tickets,
                    requerimentos:
                      principal === 'horas' ? h.requerimentosMinutos / 60 : h.requerimentosTickets,
                  }))}
                  margin={{ top: 20, right: 30, left: 10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="mes" tick={{ fontSize: 12 }} stroke="#666" />
                  <YAxis tick={{ fontSize: 12 }} stroke="#666" />
                  <Tooltip
                    formatter={(v: number) => (principal === 'horas' ? fmt(Math.round(v * 60)) : v)}
                  />
                  <Line
                    type="monotone"
                    dataKey="consumo"
                    name={c('ticketsLegend')}
                    stroke="#2563eb"
                    strokeWidth={3}
                    dot={{ fill: '#2563eb', r: 5 }}
                    isAnimationActive={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="requerimentos"
                    name={c('requirementsLegend')}
                    stroke="#ea580c"
                    strokeWidth={3}
                    dot={{ fill: '#ea580c', r: 5 }}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="border-2" style={borda}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <FileText className="h-4 w-4" />
                {c('discountedRequirements')}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {dados.requerimentos.length ? (
                <div className="space-y-2">
                  {dados.requerimentos.slice(0, 6).map((r) => (
                    <div
                      key={r.chamado}
                      className="flex items-center justify-between rounded border border-gray-200 p-2"
                    >
                      <span className="flex min-w-0 items-center gap-1.5 text-xs">
                        <span className="font-semibold text-blue-600">{r.chamado}</span>
                        {r.modulo && <span className="truncate text-gray-600">• {r.modulo}</span>}
                      </span>
                      <span className="ml-2 text-xs font-semibold text-blue-600">
                        {principal === 'horas' ? fmt(r.minutos) : r.tickets}
                      </span>
                    </div>
                  ))}
                  {dados.requerimentos.length > 6 && (
                    <p className="rounded border border-blue-200 bg-blue-50 p-2 text-center text-xs text-blue-700">
                      {c('additionalRequirements', { count: dados.requerimentos.length - 6 })}
                    </p>
                  )}
                </div>
              ) : (
                <div className="py-6 text-center text-gray-500">
                  <FileText className="mx-auto mb-2 h-10 w-10 text-gray-400" />
                  <p className="text-xs">{c('noDiscountedRequirements')}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {unidades.map((u) => (
          <QuadroDoPeriodo key={u} banco={banco} unidade={u} />
        ))}

        {dados.observacoes.length > 0 && (
          <Card className="border-2" style={borda}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <MessageSquare className="h-4 w-4" />
                {c('observationsTitle')}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 pt-0 text-sm text-gray-700">
              {dados.observacoes.map((o, i) => (
                <p key={i}>
                  <span className="text-gray-500">{rotuloMes(o.mes, idioma)} · </span>
                  {o.texto}
                </p>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

/** O quadro do período de apuração, como o do Book atual, numa unidade */
function QuadroDoPeriodo({ banco, unidade }: { banco: LinhaConsumoBook; unidade: Unidade }) {
  const { t, i18n } = useTranslation();
  const c = (chave: string) => t(`books.bookContent.${chave}`);
  const { meses } = banco.dados;
  const valor = (campo: (r: ResultadoUnidade) => number) =>
    meses.map((m) => {
      const r = m.resultado?.[unidade];
      return r ? campo(r) : null;
    });
  const entreBancos = valor((r) => r.consumidoDeOutros - r.cedidoAOutros);
  const comResultado = meses.filter((m) => m.resultado?.[unidade]);
  const ultimo = comResultado.at(-1)?.resultado;
  const taxa = ultimo?.[unidade]?.taxa ?? null;
  const percentualRepasse = ultimo?.percentualRepasse ?? 0;

  const linha = (
    rotulo: string,
    valores: (number | null)[],
    classe: string,
    opcoes: { colorir?: boolean; negrito?: boolean } = {}
  ) => (
    <tr className={classe}>
      <td className={`whitespace-nowrap px-4 py-2 ${opcoes.negrito ? 'font-semibold' : ''}`}>
        {rotulo}
      </td>
      {valores.map((v, i) => (
        <td
          key={i}
          className={`px-4 py-2 text-center ${opcoes.negrito ? 'font-bold' : ''} ${opcoes.colorir ? cor(v) : ''}`}
        >
          {formatar(v, unidade)}
        </td>
      ))}
    </tr>
  );

  return (
    <Card className="border-2" style={borda}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <Clock className="h-5 w-5" />
          {c('bankHoursTitle')}: {banco.nome_banco}
        </CardTitle>
        <p className="text-xs text-gray-500">{c('bankPeriodControl')}</p>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{ borderRadius: '15.5px', overflow: 'hidden' }}>
            <thead>
              <tr className="bg-blue-600 text-white">
                <th className="whitespace-nowrap px-4 py-3 text-left font-semibold">
                  {c('period')}
                </th>
                {meses.map((m) => (
                  <th
                    key={`${m.mes.ano}-${m.mes.mes}`}
                    className="whitespace-nowrap px-4 py-3 text-center font-semibold"
                  >
                    {rotuloMes(m.mes, i18n.language)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {linha(
                c(unidade === 'horas' ? 'contractedBank' : 'contractedTickets'),
                valor((r) => r.baseline),
                'bg-[#666666] font-semibold text-white'
              )}
              {linha(
                c('previousMonthCarryover'),
                valor((r) => r.repasseAnterior),
                'bg-gray-200',
                {
                  colorir: true,
                }
              )}
              {linha(
                c('balanceToUse'),
                valor((r) => r.saldoAUtilizar),
                'bg-gray-50',
                {
                  colorir: true,
                  negrito: true,
                }
              )}
              {linha(
                c('ticketConsumption'),
                valor((r) => r.consumo),
                'bg-white'
              )}
              {linha(
                c('requirementsLabel'),
                valor((r) => r.requerimentos),
                'bg-white'
              )}
              {linha(
                c('adjustment'),
                valor((r) => r.reajustes),
                'bg-white',
                { colorir: true }
              )}
              {entreBancos.some((v) => v) &&
                linha(c('crossBankConsumption'), entreBancos, 'bg-blue-50', { colorir: true })}
              {linha(
                c('totalConsumptionLabel'),
                valor((r) => r.consumoTotal),
                'bg-white',
                {
                  negrito: true,
                }
              )}
              {linha(
                c('balance'),
                valor((r) => r.saldoFinal),
                'bg-gray-200',
                {
                  colorir: true,
                  negrito: true,
                }
              )}
              {linha(
                `${c('carryover')} - ${percentualRepasse}%`,
                valor((r) => r.repasse),
                'bg-gray-50',
                { colorir: true }
              )}
              <tr className="bg-[#666666] text-white">
                <td className="whitespace-nowrap px-4 py-2 font-semibold">
                  {c(unidade === 'horas' ? 'surplusRate' : 'ticketSurplusRate')}
                </td>
                <td className="px-4 py-2 text-center font-semibold">
                  {taxa ? reais(taxa, i18n.language) : ''}
                </td>
                {meses.length > 3 && <td colSpan={meses.length - 3} />}
                {meses.length >= 3 && (
                  <td className="px-4 py-2 text-center font-semibold">{c('totalValue')}</td>
                )}
                {meses.length >= 2 && (
                  <td className="px-4 py-2 text-center font-semibold">
                    {reais(ultimo?.[unidade]?.valorExcedente ?? 0, i18n.language)}
                  </td>
                )}
              </tr>
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
