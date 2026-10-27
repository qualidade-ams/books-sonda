// Aba "Códigos de resolução" das Regras de contagem: os códigos que contam no banco, com as chaves
// de horas e tickets. As mudanças ficam na tela até salvar pela barra do rodapé.
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ListChecks, MoreHorizontal, Plus, Search, Trash2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DataTable, type ColunaTabela } from '@/components/ds/DataTable';
import { EmptyState } from '@/components/ds/EmptyState';
import { Button } from '@/components/ds/Button';
import { ConfirmDialog } from '@/components/ds/ConfirmDialog';
import { Ajuda, ChaveCompacta, DicaDoRotulo } from '@/components/ds/Formulario';
import { BotaoLimparFiltros, FiltroMultiplo } from '@/components/ds/Filtros';
import { campo, itemMenu } from '@/components/ds/estilos';
import { cn } from '@/lib/utils';
import { codigoNovo, filtrarCodigos, type ContaCodigo } from '@/utils/regrasTela';
import type { CodigoResolucao } from '@/types/regrasContagem';

export function AbaCodigos({
  codigos,
  carregando,
  podeEditar,
  onChange,
}: {
  codigos: CodigoResolucao[];
  carregando: boolean;
  podeEditar: boolean;
  onChange: (c: CodigoResolucao[]) => void;
}) {
  const { t } = useTranslation();
  const [busca, setBusca] = useState('');
  const [conta, setConta] = useState<ContaCodigo[]>([]);
  const [novo, setNovo] = useState('');
  const [remover, setRemover] = useState<CodigoResolucao | null>(null);

  const linhas = filtrarCodigos(codigos, busca, conta);
  const filtrando = !!busca || conta.length > 0;
  // O código é comparado exatamente como vem do Aranda: só tira os espaços das pontas
  const erroNovo = codigos.some((c) => c.codigo === novo.trim())
    ? t('regrasContagem.codigos.repetido')
    : null;

  const alternar = (c: CodigoResolucao, chave: 'contaHoras' | 'contaTickets') => {
    const atualizado = { ...c, [chave]: !c[chave] };
    // Desligar as duas é o mesmo que tirar da lista (a tabela exige pelo menos uma)
    if (!atualizado.contaHoras && !atualizado.contaTickets) {
      setRemover(c);
      return;
    }
    onChange(codigos.map((x) => (x.codigo === c.codigo ? atualizado : x)));
  };
  const adicionar = () => {
    if (!novo.trim() || erroNovo) return;
    onChange([codigoNovo(novo.trim()), ...codigos]);
    setNovo('');
  };
  const simNao = (v: boolean) =>
    v ? (
      t('regrasContagem.codigos.sim')
    ) : (
      <span className="text-ds-fg-muted">{t('regrasContagem.codigos.nao')}</span>
    );

  const colunas: ColunaTabela<CodigoResolucao>[] = [
    {
      id: 'codigo',
      cabecalho: t('regrasContagem.codigos.colunaCodigo'),
      mobile: 'titulo',
      // Espaços visíveis: "Banco=S |SLA=N" e "Banco=S| SLA=N" são códigos diferentes
      celula: (c) => <span className="whitespace-pre-wrap font-medium">{c.codigo}</span>,
    },
    {
      id: 'horas',
      cabecalho: t('regrasContagem.codigos.colunaHoras'),
      celula: (c) =>
        podeEditar ? (
          <ChaveCompacta
            ligado={c.contaHoras}
            rotulo={t('regrasContagem.codigos.contaHorasDe', { codigo: c.codigo })}
            onClick={() => alternar(c, 'contaHoras')}
          />
        ) : (
          simNao(c.contaHoras)
        ),
    },
    {
      id: 'tickets',
      cabecalho: t('regrasContagem.codigos.colunaTickets'),
      celula: (c) =>
        podeEditar ? (
          <ChaveCompacta
            ligado={c.contaTickets}
            rotulo={t('regrasContagem.codigos.contaTicketsDe', { codigo: c.codigo })}
            onClick={() => alternar(c, 'contaTickets')}
          />
        ) : (
          simNao(c.contaTickets)
        ),
    },
    {
      id: 'uso',
      cabecalho: t('regrasContagem.codigos.colunaUso'),
      alinhar: 'direita',
      celula: (c) => (
        <span className="text-xs tabular-nums text-ds-fg-secondary">
          {t('regrasContagem.codigos.uso', {
            apontamentos: c.apontamentos6m,
            tickets: c.tickets6m,
          })}
        </span>
      ),
    },
    ...(podeEditar
      ? [
          {
            id: 'acoes',
            cabecalho: '',
            mobile: 'acoes' as const,
            celula: (c: CodigoResolucao) => (
              <div className="flex justify-end">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      tamanho="icone"
                      variante="fantasma"
                      aria-label={t('fase3Comum.acoesDe', { nome: c.codigo })}
                    >
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
                      <Trash2 className="h-4 w-4" /> {t('regrasContagem.codigos.tirar')}
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
        <h2 className="text-xs font-bold uppercase tracking-[0.06em]">
          {t('regrasContagem.codigos.titulo')}
        </h2>
        <DicaDoRotulo rotulo={t('regrasContagem.codigos.titulo')} />
      </header>
      {podeEditar && !carregando && (
        <div className="border-b border-ds-border px-4 py-3 md:px-5">
          <div className="flex gap-2">
            <input
              aria-label={t('regrasContagem.codigos.novo')}
              placeholder={t('regrasContagem.codigos.novoPlaceholder')}
              value={novo}
              onChange={(e) => setNovo(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && adicionar()}
              aria-invalid={!!erroNovo}
              className={cn(campo, erroNovo && 'border-ds-danger-fg')}
            />
            <Button variante="primario" onClick={adicionar} className="shrink-0">
              <Plus /> {t('regrasContagem.codigos.adicionar')}
            </Button>
          </div>
          {erroNovo ? (
            <p className="mt-1.5 text-xs text-ds-danger-fg">{erroNovo}</p>
          ) : (
            <Ajuda>{t('regrasContagem.codigos.ajudaNovo')}</Ajuda>
          )}
        </div>
      )}
      {codigos.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 border-b border-ds-border px-4 py-3 md:px-5">
          {filtrando && (
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
              aria-label={t('regrasContagem.codigos.buscar')}
              placeholder={t('regrasContagem.codigos.buscar')}
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className={cn(campo, 'pl-9')}
            />
          </label>
          <FiltroMultiplo<ContaCodigo>
            rotulo={t('regrasContagem.codigos.conta')}
            opcoes={[
              { valor: 'horas', rotulo: t('regrasContagem.codigos.horas') },
              { valor: 'tickets', rotulo: t('regrasContagem.codigos.tickets') },
            ]}
            selecionados={conta}
            onChange={setConta}
          />
        </div>
      )}
      <DataTable
        rotulo={t('regrasContagem.codigos.titulo')}
        colunas={colunas}
        linhas={linhas}
        chaveLinha={(c) => c.codigo}
        carregando={carregando}
        vazio={
          <EmptyState
            icone={<ListChecks />}
            titulo={
              codigos.length
                ? t('regrasContagem.codigos.nenhumEncontrado')
                : t('regrasContagem.codigos.vazioTitulo')
            }
            descricao={codigos.length ? undefined : t('regrasContagem.codigos.vazioDescricao')}
          />
        }
      />
      <ConfirmDialog
        aberto={!!remover}
        onOpenChange={(v) => !v && setRemover(null)}
        titulo={t('regrasContagem.remover.titulo', { codigo: remover?.codigo ?? '' })}
        consequencias={[
          t('regrasContagem.remover.deixamDeContar'),
          remover && (remover.apontamentos6m || remover.tickets6m)
            ? t('regrasContagem.remover.uso', {
                apontamentos: remover.apontamentos6m,
                tickets: remover.tickets6m,
              })
            : t('regrasContagem.remover.semUso'),
          t('fase3Comum.valeMesesAbertos'),
        ]}
        rotuloConfirmar={t('regrasContagem.codigos.tirar')}
        tom="perigo"
        onConfirmar={() => {
          onChange(codigos.filter((x) => x.codigo !== remover?.codigo));
          setRemover(null);
        }}
      />
    </section>
  );
}
