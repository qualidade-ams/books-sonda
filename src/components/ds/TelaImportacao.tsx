// Importação em lote das telas novas: baixar o modelo, enviar a planilha, conferir as linhas
// (novas, que mudam, sem mudança e com erro) e só então gravar as válidas.
import { useMemo, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Download, FileSpreadsheet, RefreshCw, Upload } from 'lucide-react';
import { DataTable, type ColunaTabela } from '@/components/ds/DataTable';
import { StatusBadge } from '@/components/ds/StatusBadge';
import { Callout } from '@/components/ds/Callout';
import { Button } from '@/components/ds/Button';
import { ConfirmDialog } from '@/components/ds/ConfirmDialog';
import { Ajuda, Escolha, Secao, TelaEdicao } from '@/components/ds/Formulario';
import { botaoVidro } from '@/components/ds/estilos';
import { cn } from '@/lib/utils';
import { plural } from '@/utils/plural';
import { exportarTabela } from '@/utils/exportarTabela';
import {
  lerPlanilha,
  linhasDaPlanilha,
  type ColunaImportacao,
  type LinhaImportacao,
  type LinhaPlanilha,
} from '@/utils/importarPlanilha';

type Situacao = LinhaImportacao['situacao'];

const TOM: Record<Situacao, 'success' | 'info' | 'neutral' | 'danger'> = {
  novo: 'success',
  atualiza: 'info',
  igual: 'neutral',
  erro: 'danger',
};
const SITUACOES: Situacao[] = ['novo', 'atualiza', 'igual', 'erro'];

/** "Importar" da faixa do topo; só para quem edita */
export function BotaoImportar({
  onClick,
  desabilitado,
}: {
  onClick: () => void;
  desabilitado?: boolean;
}) {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      className={cn(botaoVidro, 'disabled:cursor-not-allowed disabled:opacity-50')}
      onClick={onClick}
      disabled={desabilitado}
    >
      <Upload className="h-4 w-4" aria-hidden /> {t('ds.importar.botao')}
    </button>
  );
}

export function TelaImportacao({
  voltarPara,
  titulo,
  colunas,
  regras,
  modelo,
  podeAtualizar = true,
  aviso,
  conferir,
  onImportar,
  onFechar,
}: {
  voltarPara: string;
  titulo: string;
  colunas: ColunaImportacao[];
  /** Regras da planilha, mostradas antes do envio */
  regras: string[];
  /** Modelo para baixar: nome do arquivo e linhas de exemplo, pelo id da coluna */
  modelo: { arquivo: string; exemplo: Record<string, string>[] };
  /** false: o que já existe é sempre ignorado (ex.: ramos, que só têm nome) */
  podeAtualizar?: boolean;
  /** Aviso de impacto da tela (ex.: horas que mudam de banco) */
  aviso?: ReactNode;
  /** Confere as linhas da planilha contra o cadastro */
  conferir: (linhas: LinhaPlanilha[]) => LinhaImportacao[];
  /** Grava as linhas válidas escolhidas (novas e, se for o caso, as que mudam) */
  onImportar: (linhas: LinhaImportacao[]) => Promise<void>;
  onFechar: () => void;
}) {
  const { t } = useTranslation();
  const i = (chave: string, valores?: Record<string, unknown>) =>
    t(`ds.importar.${chave}`, valores);
  const [arquivo, setArquivo] = useState<string | null>(null);
  const [linhas, setLinhas] = useState<LinhaImportacao[] | null>(null);
  const [problema, setProblema] = useState<string | null>(null);
  const [lendo, setLendo] = useState(false);
  const [existentes, setExistentes] = useState<'atualizar' | 'ignorar'>(
    podeAtualizar ? 'atualizar' : 'ignorar'
  );
  const [ver, setVer] = useState<Situacao | 'todas'>('todas');
  const [confirmar, setConfirmar] = useState(false);
  const [importando, setImportando] = useState(false);

  const todas = linhas ?? [];
  const conta = (s: Situacao) => todas.filter((l) => l.situacao === s).length;
  const totais = {
    novo: conta('novo'),
    atualiza: conta('atualiza'),
    igual: conta('igual'),
    erro: conta('erro'),
  };
  const atualizando = podeAtualizar && existentes === 'atualizar';
  const gravar = todas.filter(
    (l) => l.situacao === 'novo' || (atualizando && l.situacao === 'atualiza')
  );
  const visiveis = ver === 'todas' ? todas : todas.filter((l) => l.situacao === ver);

  const enviar = async (escolhido: File) => {
    setArquivo(escolhido.name);
    setLinhas(null);
    setProblema(null);
    setVer('todas');
    setLendo(true);
    try {
      const lidas = linhasDaPlanilha(await lerPlanilha(escolhido), colunas);
      if (lidas.faltando.length) setProblema(i('faltando', { colunas: lidas.faltando.join(', ') }));
      else if (!lidas.linhas.length) setProblema(i('vazia'));
      else setLinhas(conferir(lidas.linhas));
    } catch {
      setProblema(i('erroLeitura'));
    } finally {
      setLendo(false);
    }
  };

  const baixarModelo = () =>
    exportarTabela(
      {
        arquivo: modelo.arquivo,
        titulo,
        abas: [
          {
            nome: titulo,
            linhas: modelo.exemplo,
            colunas: colunas.map((c) => ({
              rotulo: c.rotulo,
              valor: (l: Record<string, string>) => l[c.id],
            })),
          },
        ],
      },
      'xlsx'
    );

  const importar = async () => {
    setImportando(true);
    try {
      await onImportar(gravar);
      setConfirmar(false);
      onFechar();
    } catch {
      // O hook já avisa o erro; a tela fica aberta para tentar de novo
      setConfirmar(false);
    } finally {
      setImportando(false);
    }
  };

  const tabela: ColunaTabela<LinhaImportacao>[] = useMemo(
    () => [
      {
        id: 'linha',
        cabecalho: t('ds.importar.linha'),
        celula: (l) => <span className="tabular-nums text-ds-fg-muted">{l.linha}</span>,
      },
      ...colunas.map((c, n) => ({
        id: c.id,
        cabecalho: c.rotulo,
        mobile: n === 0 ? ('titulo' as const) : undefined,
        celula: (l: LinhaImportacao) =>
          l.valores[c.id] ? (
            <span className={n === 0 ? 'font-medium' : undefined}>{l.valores[c.id]}</span>
          ) : (
            <span className="text-ds-fg-muted">—</span>
          ),
      })),
      {
        id: 'situacao',
        cabecalho: t('ds.importar.situacaoColuna'),
        celula: (l) => {
          const ignorada = l.situacao === 'atualiza' && !atualizando;
          return (
            <div className="min-w-0">
              <StatusBadge tom={ignorada ? 'neutral' : TOM[l.situacao]}>
                {t(`ds.importar.situacao.${ignorada ? 'ignorada' : l.situacao}`)}
              </StatusBadge>
              {l.erros?.map((e) => (
                <p key={e} className="mt-1 text-xs text-ds-danger-fg">
                  {e}
                </p>
              ))}
            </div>
          );
        },
      },
    ],
    [colunas, atualizando, t]
  );

  return (
    <TelaEdicao
      voltarPara={voltarPara}
      titulo={titulo}
      subtitulo={i('subtitulo')}
      podeSalvar={!!linhas && gravar.length > 0}
      rotuloSalvar={linhas ? plural(t, 'ds.importar.importarN', gravar.length) : i('botao')}
      onFechar={onFechar}
      onSalvar={() => setConfirmar(true)}
    >
      <Secao titulo={i('planilha')}>
        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={baixarModelo}>
            <Download /> {i('baixarModelo')}
          </Button>
          <Ajuda>{i('modeloAjuda')}</Ajuda>
        </div>
        <ul className="list-disc space-y-1 pl-5 text-sm text-ds-fg-secondary">
          <li>
            {i('colunas')}{' '}
            {colunas.map((c, n) => (
              <span key={c.id}>
                {n > 0 && ', '}
                <span className="font-medium text-ds-fg">{c.rotulo}</span>
                {c.obrigatoria && <span className="text-ds-danger-fg">*</span>}
              </span>
            ))}
            .
          </li>
          {regras.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>
        {arquivo && !lendo ? (
          <div className="flex flex-wrap items-center gap-3 rounded-lg border border-ds-border bg-ds-bg-subtle px-3 py-2.5">
            <FileSpreadsheet className="h-5 w-5 text-ds-fg-accent" aria-hidden />
            <span className="min-w-0 flex-1 truncate text-sm font-medium">{arquivo}</span>
            <Button
              tamanho="sm"
              variante="fantasma"
              onClick={() => {
                setArquivo(null);
                setLinhas(null);
                setProblema(null);
              }}
            >
              <RefreshCw /> {i('trocar')}
            </Button>
          </div>
        ) : (
          <label className="flex cursor-pointer flex-col items-center gap-1 rounded-lg border border-dashed border-ds-border-strong px-4 py-8 text-center text-ds-fg-secondary transition focus-within:ring-2 focus-within:ring-ds-focus hover:border-[#00D4E8] hover:bg-ds-accent-subtle">
            <Upload className="h-6 w-6" aria-hidden />
            <span className="text-sm font-medium">{lendo ? i('lendo') : i('escolher')}</span>
            <span className="text-xs text-ds-fg-muted">{i('formatos')}</span>
            <input
              type="file"
              accept=".xlsx,.xls,.csv"
              className="sr-only"
              disabled={lendo}
              onChange={(e) => {
                const escolhido = e.target.files?.[0];
                e.target.value = '';
                if (escolhido) enviar(escolhido);
              }}
            />
          </label>
        )}
        {problema && <Callout tom="danger" titulo={problema} />}
      </Secao>

      {linhas && (
        <Secao titulo={i('conferencia')}>
          <div className="flex flex-wrap gap-2" role="group" aria-label={i('mostrar')}>
            {(['todas', ...SITUACOES] as const).map((v) => (
              <button
                key={v}
                type="button"
                aria-pressed={ver === v}
                onClick={() => setVer(v)}
                className={cn(
                  'h-8 rounded-full border px-3 text-xs font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-focus',
                  ver === v
                    ? 'border-[#00D4E8] bg-ds-accent-subtle text-ds-fg-accent'
                    : 'border-ds-border-strong text-ds-fg-secondary hover:text-ds-fg',
                  v === 'erro' && totais.erro > 0 && ver !== v && 'text-ds-danger-fg'
                )}
              >
                {i(`ver.${v}`, { n: v === 'todas' ? todas.length : totais[v] })}
              </button>
            ))}
          </div>

          {podeAtualizar && totais.atualiza > 0 && (
            <div className="max-w-md">
              <p className="mb-1.5 text-sm font-medium">{i('existentes')}</p>
              <Escolha<typeof existentes>
                rotulo={i('existentes')}
                opcoes={[
                  { valor: 'atualizar', rotulo: i('atualizar') },
                  { valor: 'ignorar', rotulo: i('ignorar') },
                ]}
                valor={existentes}
                onChange={setExistentes}
              />
            </div>
          )}

          {totais.erro > 0 && (
            <Callout tom="warning" titulo={plural(t, 'ds.importar.comErro', totais.erro)}>
              {i('comErroTexto')}
            </Callout>
          )}
          {aviso}

          <div className="overflow-hidden rounded-lg border border-ds-border">
            <DataTable
              rotulo={i('rotuloTabela')}
              colunas={tabela}
              linhas={visiveis}
              chaveLinha={(l) => String(l.linha)}
              vazio={<p className="p-4 text-sm text-ds-fg-muted">{i('nenhumaNaSituacao')}</p>}
            />
          </div>
        </Secao>
      )}

      <ConfirmDialog
        aberto={confirmar}
        onOpenChange={setConfirmar}
        titulo={plural(t, 'ds.importar.confirmar', gravar.length)}
        consequencias={[
          ...(totais.novo ? [plural(t, 'ds.importar.novos', totais.novo)] : []),
          ...(atualizando && totais.atualiza
            ? [plural(t, 'ds.importar.atualizados', totais.atualiza)]
            : []),
          ...(totais.erro ? [plural(t, 'ds.importar.ficamDeFora', totais.erro)] : []),
          i('auditoria'),
        ]}
        rotuloConfirmar={i('botao')}
        processando={importando}
        onConfirmar={importar}
      />
    </TelaEdicao>
  );
}
