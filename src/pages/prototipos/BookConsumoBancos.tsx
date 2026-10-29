// Protótipo da página de consumo do Book por banco (Fase 5, Modelagem_Fase5.md seção 6). O layout é
// o do BookConsumo atual, repetido para cada banco que o cliente vê, com o nome do banco e o período
// de apuração no título. Lê só o snapshot (books_consumo_bancos). Validação visual, sem service.
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
import AdminLayout from '@/components/admin/LayoutAdmin';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import type { PrototipoProps } from '@/utils/prototipos';
import {
  BANCOS_BOOK_MOCK,
  EMPRESA_BOOK,
  MES_BOOK,
  type BancoBookMock,
  type MesBancoMock,
} from './mocks/bookConsumoBancos';

const borda = { borderRadius: '35.5px', borderColor: '#666666' };

const hhmm = (minutos: number) => {
  const abs = Math.abs(minutos);
  return `${minutos < 0 ? '-' : ''}${String(Math.floor(abs / 60)).padStart(2, '0')}:${String(abs % 60).padStart(2, '0')}`;
};

const cor = (minutos: number) =>
  minutos < 0 ? 'text-red-600' : minutos > 0 ? 'text-green-600' : '';

const reais = (valor: number) =>
  `R$ ${valor.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function Metrica({
  titulo,
  valor,
  rodape,
  icone,
  fundo,
}: {
  titulo: string;
  valor: string;
  rodape: string;
  icone: React.ReactNode;
  fundo: string;
}) {
  return (
    <Card className="border-2" style={borda}>
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

function Linha({
  rotulo,
  meses,
  valor,
  classe,
  colorir,
  negrito,
}: {
  rotulo: string;
  meses: MesBancoMock[];
  valor: (m: MesBancoMock) => number;
  classe: string;
  colorir?: boolean;
  negrito?: boolean;
}) {
  return (
    <tr className={classe}>
      <td className={`whitespace-nowrap px-4 py-2 ${negrito ? 'font-semibold' : ''}`}>{rotulo}</td>
      {meses.map((m) => (
        <td
          key={m.mes}
          className={`px-4 py-2 text-center ${negrito ? 'font-bold' : ''} ${colorir ? cor(valor(m)) : ''}`}
        >
          {hhmm(valor(m))}
        </td>
      ))}
    </tr>
  );
}

function PaginaBanco({ banco }: { banco: BancoBookMock }) {
  const ultimo = banco.meses[banco.meses.length - 1];
  const totalMes = ultimo.consumo + ultimo.requerimentos;
  const temEntreBancos = banco.meses.some((m) => m.entreBancos !== 0);

  return (
    <div className="relative flex w-full flex-col bg-white p-8 shadow-sm">
      <div className="flex-1 space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            Consumo de horas <span className="text-blue-600">{banco.nome}</span>
          </h2>
          <p className="text-sm text-gray-500">
            {banco.empresa ? `${banco.empresa} · ` : ''}Período de apuração: {banco.periodo}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-6">
          <Metrica
            titulo="Consumo total"
            valor={hhmm(totalMes)}
            rodape="Chamados + requerimentos"
            icone={<TrendingUp className="h-4 w-4 text-purple-600" />}
            fundo="bg-purple-100"
          />
          <Metrica
            titulo="Horas consumo"
            valor={hhmm(ultimo.consumo)}
            rodape="Chamados do mês"
            icone={<Clock className="h-4 w-4 text-blue-600" />}
            fundo="bg-blue-100"
          />
          <Metrica
            titulo="Horas requerimentos"
            valor={hhmm(ultimo.requerimentos)}
            rodape={`${banco.requerimentos.length} requerimentos`}
            icone={<FileText className="h-4 w-4 text-orange-600" />}
            fundo="bg-orange-100"
          />
          <Metrica
            titulo="Baseline"
            valor={hhmm(ultimo.baseline)}
            rodape={`${Math.round((totalMes / ultimo.baseline) * 100)}% consumido`}
            icone={<TrendingUp className="h-4 w-4 text-purple-600" />}
            fundo="bg-purple-100"
          />
          <Metrica
            titulo="Incidente"
            valor={hhmm(banco.consumoMes.incidente)}
            rodape={`${Math.round((banco.consumoMes.incidente / ultimo.consumo) * 100)}% do total`}
            icone={<CheckCircle2 className="h-4 w-4 text-blue-600" />}
            fundo="bg-blue-100"
          />
          <Metrica
            titulo="Solicitação"
            valor={hhmm(banco.consumoMes.solicitacao)}
            rodape={`${Math.round((banco.consumoMes.solicitacao / ultimo.consumo) * 100)}% do total`}
            icone={<CheckCircle2 className="h-4 w-4 text-green-600" />}
            fundo="bg-green-100"
          />
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card className="border-2 lg:col-span-2" style={borda}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold">Horas mês</CardTitle>
              <p className="text-xs text-gray-500">Histórico de consumo mensal deste banco</p>
            </CardHeader>
            <CardContent className="pt-2">
              <ResponsiveContainer width="100%" height={240}>
                <LineChart
                  data={banco.historico.map((d) => ({
                    ...d,
                    consumoH: d.consumo / 60,
                    requerimentosH: d.requerimentos / 60,
                  }))}
                  margin={{ top: 20, right: 30, left: 10, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="mes" tick={{ fontSize: 12 }} stroke="#666" />
                  <YAxis tick={{ fontSize: 12 }} stroke="#666" />
                  <Tooltip formatter={(v: number) => hhmm(Math.round(v * 60))} />
                  <Line
                    type="monotone"
                    dataKey="consumoH"
                    name="Chamados"
                    stroke="#2563eb"
                    strokeWidth={3}
                    dot={{ fill: '#2563eb', r: 5 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="requerimentosH"
                    name="Requerimentos"
                    stroke="#ea580c"
                    strokeWidth={3}
                    dot={{ fill: '#ea580c', r: 5 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="border-2" style={borda}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <FileText className="h-4 w-4" />
                Requerimentos descontados
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {banco.requerimentos.length ? (
                <div className="space-y-2">
                  {banco.requerimentos.map((r) => (
                    <div
                      key={r.chamado}
                      className="flex items-center justify-between rounded border border-gray-200 p-2"
                    >
                      <span className="text-xs font-semibold text-blue-600">
                        {r.chamado} <span className="font-normal text-gray-600">• {r.modulo}</span>
                      </span>
                      <span className="text-xs font-semibold text-blue-600">{hhmm(r.minutos)}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-6 text-center text-gray-500">
                  <FileText className="mx-auto mb-2 h-10 w-10 text-gray-400" />
                  <p className="text-xs">Nenhum requerimento descontado neste banco</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <Card className="border-2" style={borda}>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base font-semibold">
              <Clock className="h-5 w-5" />
              Banco de horas: {banco.nome}
            </CardTitle>
            <p className="text-xs text-gray-500">Controle do período de apuração</p>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="overflow-x-auto">
              <table
                className="w-full text-sm"
                style={{ borderRadius: '15.5px', overflow: 'hidden' }}
              >
                <thead>
                  <tr className="bg-blue-600 text-white">
                    <th className="whitespace-nowrap px-4 py-3 text-left font-semibold">Período</th>
                    {banco.meses.map((m) => (
                      <th
                        key={m.mes}
                        className="whitespace-nowrap px-4 py-3 text-center font-semibold"
                      >
                        {m.mes}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  <tr className="text-white" style={{ backgroundColor: '#666666' }}>
                    <td className="whitespace-nowrap px-4 py-2 font-semibold">Banco contratado</td>
                    {banco.meses.map((m) => (
                      <td key={m.mes} className="px-4 py-2 text-center font-semibold">
                        {hhmm(m.baseline)}
                      </td>
                    ))}
                  </tr>
                  <Linha
                    rotulo="Repasse mês anterior"
                    meses={banco.meses}
                    valor={(m) => m.repasseAnterior}
                    classe="bg-gray-200"
                    colorir
                  />
                  <Linha
                    rotulo="Saldo a utilizar"
                    meses={banco.meses}
                    valor={(m) => m.baseline + m.repasseAnterior}
                    classe="bg-gray-50"
                    colorir
                    negrito
                  />
                  <Linha
                    rotulo="Consumo chamados"
                    meses={banco.meses}
                    valor={(m) => m.consumo}
                    classe="bg-white"
                  />
                  <Linha
                    rotulo="Requerimentos"
                    meses={banco.meses}
                    valor={(m) => m.requerimentos}
                    classe="bg-white"
                  />
                  <Linha
                    rotulo="Reajuste"
                    meses={banco.meses}
                    valor={(m) => m.reajustes}
                    classe="bg-white"
                    colorir
                  />
                  {temEntreBancos && (
                    <Linha
                      rotulo="Consumo entre bancos"
                      meses={banco.meses}
                      valor={(m) => m.entreBancos}
                      classe="bg-blue-50"
                      colorir
                    />
                  )}
                  <Linha
                    rotulo="Consumo total"
                    meses={banco.meses}
                    valor={(m) => m.consumo + m.requerimentos}
                    classe="bg-white"
                    negrito
                  />
                  <Linha
                    rotulo="Saldo"
                    meses={banco.meses}
                    valor={(m) => m.saldo}
                    classe="bg-gray-200"
                    colorir
                    negrito
                  />
                  <Linha
                    rotulo={`Repasse - ${banco.percentualRepasse}%`}
                    meses={banco.meses}
                    valor={(m) => m.repasse}
                    classe="bg-gray-50"
                    colorir
                  />
                  <tr className="text-white" style={{ backgroundColor: '#666666' }}>
                    <td className="whitespace-nowrap px-4 py-2 font-semibold">
                      Taxa/hora excedente
                    </td>
                    <td className="px-4 py-2 text-center font-semibold">
                      {reais(banco.taxaExcedente)}
                    </td>
                    {banco.meses.length > 3 && <td colSpan={banco.meses.length - 3} />}
                    {banco.meses.length >= 2 && (
                      <td className="px-4 py-2 text-center font-semibold">Valor total</td>
                    )}
                    {banco.meses.length >= 3 && (
                      <td className="px-4 py-2 text-center font-semibold">
                        {reais(banco.valorExcedentes)}
                      </td>
                    )}
                  </tr>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        {banco.observacoes.length > 0 && (
          <Card className="border-2" style={borda}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-sm font-semibold">
                <MessageSquare className="h-4 w-4" />
                Observações
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 pt-0 text-sm text-gray-700">
              {banco.observacoes.map((o) => (
                <p key={o}>
                  <span className="text-gray-500">30/09/2026 · </span>
                  {o}
                </p>
              ))}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

export default function BookConsumoBancos({ estado }: PrototipoProps) {
  return (
    <AdminLayout>
      <div className="min-h-screen bg-bg-secondary">
        <div className="space-y-8 px-6 py-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
              Book de teste: {EMPRESA_BOOK}
            </h1>
            <p className="mt-1 text-muted-foreground">
              {MES_BOOK} · página de consumo pelo modelo novo, uma por banco que o cliente vê. O
              Banco padrão interno não aparece.
            </p>
          </div>

          {estado === 'carregando' && (
            <div className="space-y-3 bg-white p-8">
              <Skeleton className="h-8 w-1/3" />
              <Skeleton className="h-28 w-full" />
              <Skeleton className="h-64 w-full" />
            </div>
          )}
          {estado === 'erro' && (
            <EmptyState
              title="Não foi possível montar o Book de teste"
              description="Tente de novo. O cliente não recebe nada."
            />
          )}
          {estado === 'vazio' && (
            <EmptyState
              title="Nenhum banco para mostrar"
              description="A empresa não tem banco ativo que o cliente vê neste mês."
            />
          )}
          {estado === 'dados' && BANCOS_BOOK_MOCK.map((b) => <PaginaBanco key={b.id} banco={b} />)}
        </div>
      </div>
    </AdminLayout>
  );
}
