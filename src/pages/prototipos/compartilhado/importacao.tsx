// Importação em lote e exportação (Excel e PDF) EXPLORATÓRIAS, compartilhadas pelas telas novas
// (pedido de 21/10/2026). Seguem o fluxo da tela atual de Empresas (EmpresaImportExportButtons):
// baixar o modelo, enviar a planilha, conferir as linhas válidas e com erro, e só então gravar.
// Quando aprovadas, viram componentes em src/components/ds, com teste.
import { useMemo, useState, type ReactNode } from 'react';
import { Download, FileSpreadsheet, FileText, RefreshCw, Upload } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DataTable, type ColunaTabela } from '@/components/ds/DataTable';
import { StatusBadge } from '@/components/ds/StatusBadge';
import { Callout } from '@/components/ds/Callout';
import { Button } from '@/components/ds/Button';
import { ConfirmDialog } from '@/components/ds/ConfirmDialog';
import { cn } from '@/lib/utils';
import { itemMenu } from './estilos';
import { Ajuda, Escolha, Secao, TelaEdicao } from './formulario';
import { botaoVidro } from './shell';

/* ------------------------------------------------------------------ */
/* Botões da faixa do topo                                              */
/* ------------------------------------------------------------------ */

/** "Exportar" com Excel e PDF; exporta o que está filtrado na tela */
export function MenuExportar({ total, entidade }: { total?: number; entidade: string }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" className={botaoVidro}>
          <Download className="h-4 w-4" /> Exportar
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        data-ds="v2"
        align="start"
        className="min-w-56 border-ds-border bg-ds-bg-raised p-1 font-ds-sans text-ds-fg"
      >
        <DropdownMenuLabel className="px-2.5 py-1.5 text-xs font-normal text-ds-fg-muted">
          {total === undefined
            ? `Exporta ${entidade} como estão na tela`
            : `Exporta ${total} ${entidade}, com os filtros aplicados`}
        </DropdownMenuLabel>
        <DropdownMenuItem className={itemMenu}>
          <FileSpreadsheet className="h-4 w-4" /> Excel (.xlsx)
        </DropdownMenuItem>
        <DropdownMenuItem className={itemMenu}>
          <FileText className="h-4 w-4" /> PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function BotaoImportar({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" className={botaoVidro} onClick={onClick}>
      <Upload className="h-4 w-4" /> Importar
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Tela de importação                                                   */
/* ------------------------------------------------------------------ */

export interface ColunaImportacao {
  id: string;
  rotulo: string;
  obrigatoria?: boolean;
}

/** Uma linha da planilha, já conferida contra o cadastro */
export interface LinhaImportacao {
  /** Número da linha na planilha (a 1 é o cabeçalho) */
  linha: number;
  valores: Record<string, string>;
  /** novo: será incluído · atualiza: já existe e muda · igual: já existe sem mudança · erro */
  situacao: 'novo' | 'atualiza' | 'igual' | 'erro';
  erros?: string[];
}

const SITUACAO: Record<
  LinhaImportacao['situacao'],
  { rotulo: string; tom: 'success' | 'info' | 'neutral' | 'danger' }
> = {
  novo: { rotulo: 'Novo', tom: 'success' },
  atualiza: { rotulo: 'Atualiza', tom: 'info' },
  igual: { rotulo: 'Sem mudança', tom: 'neutral' },
  erro: { rotulo: 'Com erro', tom: 'danger' },
};

export function TelaImportacao({
  voltarPara,
  titulo,
  entidade,
  colunas,
  linhas,
  regras,
  podeAtualizar = true,
  aviso,
  onFechar,
}: {
  voltarPara: string;
  titulo: string;
  /** Plural do que se importa, em minúsculas (ex.: "ramos") */
  entidade: string;
  colunas: ColunaImportacao[];
  /** Resultado da conferência da planilha (no protótipo, fixo) */
  linhas: LinhaImportacao[];
  /** Regras da planilha, mostradas antes do envio */
  regras: string[];
  /** false: o que já existe é sempre ignorado (ex.: ramos, que só têm nome) */
  podeAtualizar?: boolean;
  /** Aviso de impacto específico da tela (ex.: horas que mudam de banco) */
  aviso?: ReactNode;
  onFechar: () => void;
}) {
  const [arquivo, setArquivo] = useState<string | null>(null);
  const [existentes, setExistentes] = useState<'atualizar' | 'ignorar'>(
    podeAtualizar ? 'atualizar' : 'ignorar'
  );
  const [ver, setVer] = useState<LinhaImportacao['situacao'] | 'todas'>('todas');
  const [confirmar, setConfirmar] = useState(false);

  const conta = (s: LinhaImportacao['situacao']) => linhas.filter((l) => l.situacao === s).length;
  const totais = {
    novo: conta('novo'),
    atualiza: conta('atualiza'),
    igual: conta('igual'),
    erro: conta('erro'),
  };
  const gravadas = totais.novo + (existentes === 'atualizar' ? totais.atualiza : 0);
  const visiveis = ver === 'todas' ? linhas : linhas.filter((l) => l.situacao === ver);

  const tabela: ColunaTabela<LinhaImportacao>[] = useMemo(
    () => [
      {
        id: 'linha',
        cabecalho: 'Linha',
        celula: (l) => <span className="tabular-nums text-ds-fg-muted">{l.linha}</span>,
      },
      ...colunas.map((c, i) => ({
        id: c.id,
        cabecalho: c.rotulo,
        mobile: i === 0 ? ('titulo' as const) : undefined,
        celula: (l: LinhaImportacao) =>
          l.valores[c.id] ? (
            <span className={i === 0 ? 'font-medium' : undefined}>{l.valores[c.id]}</span>
          ) : (
            <span className="text-ds-fg-muted">—</span>
          ),
      })),
      {
        id: 'situacao',
        cabecalho: 'Situação',
        celula: (l) => (
          <div className="min-w-0">
            <StatusBadge
              tom={
                l.situacao === 'atualiza' && existentes === 'ignorar'
                  ? 'neutral'
                  : SITUACAO[l.situacao].tom
              }
            >
              {l.situacao === 'atualiza' && existentes === 'ignorar'
                ? 'Ignorada'
                : SITUACAO[l.situacao].rotulo}
            </StatusBadge>
            {l.erros?.map((e) => (
              <p key={e} className="mt-1 text-xs text-ds-danger-fg">
                {e}
              </p>
            ))}
          </div>
        ),
      },
    ],
    [colunas, existentes]
  );

  return (
    <TelaEdicao
      voltarPara={voltarPara}
      titulo={titulo}
      subtitulo="Baixe o modelo, preencha e envie. Nada é gravado antes da conferência."
      podeSalvar={!!arquivo && gravadas > 0}
      rotuloSalvar={
        arquivo ? `Importar ${gravadas} ${gravadas === 1 ? 'linha' : 'linhas'}` : 'Importar'
      }
      onFechar={onFechar}
      onSalvar={() => setConfirmar(true)}
    >
      <Secao titulo="Planilha">
        <div className="flex flex-wrap items-center gap-3">
          <Button>
            <Download /> Baixar modelo Excel
          </Button>
          <Ajuda>O modelo já vem com as colunas e um exemplo de preenchimento.</Ajuda>
        </div>
        <ul className="list-disc space-y-1 pl-5 text-sm text-ds-fg-secondary">
          <li>
            Colunas:{' '}
            {colunas.map((c, i) => (
              <span key={c.id}>
                {i > 0 && ', '}
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
        {arquivo ? (
          <div className="flex flex-wrap items-center gap-3 rounded-lg border border-ds-border bg-ds-bg-subtle px-3 py-2.5">
            <FileSpreadsheet className="h-5 w-5 text-ds-fg-accent" aria-hidden />
            <span className="min-w-0 flex-1 truncate text-sm font-medium">{arquivo}</span>
            <Button tamanho="sm" variante="fantasma" onClick={() => setArquivo(null)}>
              <RefreshCw /> Trocar arquivo
            </Button>
          </div>
        ) : (
          <label className="flex cursor-pointer flex-col items-center gap-1 rounded-lg border border-dashed border-ds-border-strong px-4 py-8 text-center text-ds-fg-secondary transition focus-within:ring-2 focus-within:ring-ds-focus hover:border-[#00D4E8] hover:bg-ds-accent-subtle">
            <Upload className="h-6 w-6" aria-hidden />
            <span className="text-sm font-medium">Escolher planilha ou arrastar para cá</span>
            <span className="text-xs text-ds-fg-muted">Excel (.xlsx) ou CSV</span>
            <input
              type="file"
              accept=".xlsx,.csv"
              className="sr-only"
              onChange={(e) => {
                setArquivo(e.target.files?.[0]?.name ?? `${entidade}.xlsx`);
                e.target.value = '';
              }}
            />
          </label>
        )}
        {!arquivo && (
          <button
            type="button"
            onClick={() => setArquivo(`${entidade.replace(/\s/g, '-')}-exemplo.xlsx`)}
            className="text-sm font-medium text-ds-fg-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-focus"
          >
            Protótipo: usar uma planilha de exemplo
          </button>
        )}
      </Secao>

      {arquivo && (
        <Secao titulo="Conferência">
          <div className="flex flex-wrap gap-2" role="group" aria-label="Mostrar linhas">
            {(
              [
                ['todas', `Todas · ${linhas.length}`],
                ['novo', `Novos · ${totais.novo}`],
                ['atualiza', `Já existem e mudam · ${totais.atualiza}`],
                ['igual', `Sem mudança · ${totais.igual}`],
                ['erro', `Com erro · ${totais.erro}`],
              ] as [typeof ver, string][]
            ).map(([v, r]) => (
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
                {r}
              </button>
            ))}
          </div>

          {podeAtualizar && totais.atualiza > 0 && (
            <div className="max-w-md">
              <p className="mb-1.5 text-sm font-medium">Linhas que já existem</p>
              <Escolha<typeof existentes>
                rotulo="Linhas que já existem"
                opcoes={[
                  { valor: 'atualizar', rotulo: 'Atualizar' },
                  { valor: 'ignorar', rotulo: 'Ignorar' },
                ]}
                valor={existentes}
                onChange={setExistentes}
              />
            </div>
          )}

          {totais.erro > 0 && (
            <Callout
              tom="warning"
              titulo={`${totais.erro} ${totais.erro === 1 ? 'linha com erro não será importada' : 'linhas com erro não serão importadas'}`}
            >
              Corrija na planilha e envie de novo, ou importe só as linhas válidas.
            </Callout>
          )}
          {aviso}

          <div className="overflow-hidden rounded-lg border border-ds-border">
            <DataTable
              rotulo="Linhas da planilha"
              colunas={tabela}
              linhas={visiveis}
              chaveLinha={(l) => String(l.linha)}
              vazio={<p className="p-4 text-sm text-ds-fg-muted">Nenhuma linha nesta situação.</p>}
            />
          </div>
        </Secao>
      )}

      <ConfirmDialog
        aberto={confirmar}
        onOpenChange={setConfirmar}
        titulo={`Importar ${gravadas} ${gravadas === 1 ? 'linha' : 'linhas'}?`}
        consequencias={[
          ...(totais.novo ? [`${totais.novo} ${totais.novo === 1 ? 'novo' : 'novos'}`] : []),
          ...(existentes === 'atualizar' && totais.atualiza
            ? [`${totais.atualiza} ${totais.atualiza === 1 ? 'atualizado' : 'atualizados'}`]
            : []),
          ...(totais.erro
            ? [`${totais.erro} com erro ${totais.erro === 1 ? 'fica' : 'ficam'} de fora`]
            : []),
          'A importação fica registrada na auditoria, com o arquivo e o usuário',
        ]}
        rotuloConfirmar="Importar"
        onConfirmar={() => {
          setConfirmar(false);
          onFechar();
        }}
      />
    </TelaEdicao>
  );
}
