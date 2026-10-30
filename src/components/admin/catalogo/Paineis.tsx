// Painéis à direita da tela Produtos e Módulos: o da solução (produtos e grupos de serviço), o
// do produto (módulos, com busca e filtros) e a confirmação de mover um módulo "A classificar".
import { useId, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ArrowRightLeft,
  ChevronRight,
  Layers,
  Link2,
  Package,
  Pencil,
  Plus,
  Search,
  Wrench,
} from 'lucide-react';
import { DropdownMenuItem } from '@/components/ui/dropdown-menu';
import { DataTable, type ColunaTabela } from '@/components/ds/DataTable';
import { StatusBadge } from '@/components/ds/StatusBadge';
import { EmptyState } from '@/components/ds/EmptyState';
import { Callout } from '@/components/ds/Callout';
import { Button } from '@/components/ds/Button';
import { Select } from '@/components/ds/Select';
import { ConfirmDialog } from '@/components/ds/ConfirmDialog';
import { DicaDoRotulo } from '@/components/ds/Formulario';
import { BotaoLimparFiltros, FiltroAlternar, FiltroMultiplo } from '@/components/ds/Filtros';
import { campo, itemMenu } from '@/components/ds/estilos';
import { cn } from '@/lib/utils';
import { plural } from '@/utils/plural';
import {
  bancosDoProduto,
  gruposDaSolucao,
  gruposDoModulo,
  gruposSoDoProduto,
  usosDoModulo,
} from '@/utils/catalogoTela';
import type { Catalogo, Modulo, Produto, Solucao, UsoEmBanco } from '@/types/catalogo';
import type { MapeamentoGrupo } from '@/types/dePara';
import { ComLista, ListaGrupos, ListaUsos, MenuAcoes } from './Partes';

type Situacao = 'ativo' | 'inativo';

interface DadosCatalogo {
  catalogo: Catalogo;
  mapeamentos: MapeamentoGrupo[];
  usos: UsoEmBanco[];
}

function NomeComSituacao({
  nome,
  ativo,
  descricao,
}: {
  nome: string;
  ativo: boolean;
  descricao?: string | null;
}) {
  const { t } = useTranslation();
  return (
    <div className="min-w-0">
      <p className={cn('flex items-center gap-2 font-semibold', !ativo && 'text-ds-fg-muted')}>
        {nome}
        {!ativo && <StatusBadge>{t('fase3Comum.inativo')}</StatusBadge>}
      </p>
      {descricao && <p className="truncate text-xs text-ds-fg-muted">{descricao}</p>}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Painel da solução                                                    */
/* ------------------------------------------------------------------ */

export function PainelSolucao({
  solucao,
  catalogo,
  mapeamentos,
  usos,
  podeEditar,
  onAbrirProduto,
  onEditarSolucao,
  onEditarProduto,
  onAlterarStatusProduto,
  podeExcluirProduto,
  onExcluirProduto,
}: DadosCatalogo & {
  solucao: Solucao;
  podeEditar: boolean;
  onAbrirProduto: (id: string) => void;
  onEditarSolucao: () => void;
  /** null = produto novo nesta solução */
  onEditarProduto: (p: Produto | null) => void;
  onAlterarStatusProduto: (p: Produto) => void;
  /** Produto que nunca foi usado: pode ser excluído de vez */
  podeExcluirProduto?: (p: Produto) => boolean;
  onExcluirProduto?: (p: Produto) => void;
}) {
  const { t } = useTranslation();
  const daSolucao = catalogo.produtos
    .filter((p) => p.solucaoId === solucao.id)
    .sort((a, b) => a.ordem - b.ordem);
  const servico = gruposDaSolucao(mapeamentos, solucao.id);

  const colunas: ColunaTabela<Produto>[] = [
    {
      id: 'produto',
      cabecalho: t('produtosModulos.solucao.colunaProduto'),
      mobile: 'titulo',
      celula: (p) => <NomeComSituacao nome={p.nome} ativo={p.ativo} descricao={p.descricao} />,
    },
    {
      id: 'modulos',
      cabecalho: t('produtosModulos.solucao.colunaModulos'),
      celula: (p) => {
        const n = catalogo.modulos.filter((m) => m.produtoId === p.id && m.ativo).length;
        return n ? (
          <span className="tabular-nums">{n}</span>
        ) : (
          <span className="text-ds-fg-muted">{t('produtosModulos.solucao.semModulos')}</span>
        );
      },
    },
    {
      id: 'grupos',
      cabecalho: t('produtosModulos.solucao.colunaGrupos'),
      celula: (p) => (
        <ListaGrupos
          titulo={t('produtosModulos.solucao.gruposLigadosA', { produto: p.nome })}
          grupos={gruposSoDoProduto(mapeamentos, p.id)}
        />
      ),
    },
    {
      id: 'uso',
      cabecalho: t('produtosModulos.solucao.colunaUso'),
      celula: (p) => <ListaUsos usos={bancosDoProduto(usos, p.id)} />,
    },
    {
      id: 'acoes',
      cabecalho: '',
      mobile: 'acoes',
      celula: (p) =>
        podeEditar ? (
          <MenuAcoes
            nome={p.nome}
            ativo={p.ativo}
            onEditar={() => onEditarProduto(p)}
            onAlterarStatus={() => onAlterarStatusProduto(p)}
            onExcluir={
              onExcluirProduto && podeExcluirProduto?.(p) ? () => onExcluirProduto(p) : undefined
            }
          />
        ) : (
          <ChevronRight className="ml-auto h-4 w-4 text-ds-fg-muted" aria-hidden />
        ),
    },
  ];

  return (
    <div className="space-y-4">
      <section className="min-w-0 overflow-hidden rounded-xl border border-ds-border bg-ds-bg-surface">
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-ds-border px-4 py-4 md:px-5">
          <div className="min-w-0">
            <p className="text-xs font-medium text-ds-fg-muted">
              {t('produtosModulos.solucao.rotulo')}
            </p>
            <h2 className="flex items-center gap-2 text-lg font-semibold">
              {solucao.nome}
              {!solucao.ativo && <StatusBadge>{t('fase3Comum.inativa')}</StatusBadge>}
            </h2>
          </div>
          {podeEditar && (
            <div className="flex flex-wrap gap-2">
              <Button tamanho="sm" variante="fantasma" onClick={onEditarSolucao}>
                <Pencil /> {t('produtosModulos.solucao.editar')}
              </Button>
              <Button tamanho="sm" variante="primario" onClick={() => onEditarProduto(null)}>
                <Plus /> {t('produtosModulos.novoProduto')}
              </Button>
            </div>
          )}
        </header>
        <DataTable
          rotulo={t('produtosModulos.arvore.produtosDe', { solucao: solucao.nome })}
          colunas={colunas}
          linhas={daSolucao}
          chaveLinha={(p) => p.id}
          onLinhaClick={(p) => onAbrirProduto(p.id)}
          vazio={
            <EmptyState icone={<Package />} titulo={t('produtosModulos.solucao.nenhumProduto')} />
          }
        />
      </section>

      <section className="overflow-hidden rounded-xl border border-ds-border bg-ds-bg-surface">
        <header className="flex items-center gap-1.5 border-b border-ds-border px-4 py-4 md:px-5">
          <Wrench className="h-4 w-4 text-ds-fg-muted" aria-hidden />
          <h2 className="text-xs font-bold uppercase tracking-[0.06em]">
            {t('produtosModulos.solucao.gruposServico')}
          </h2>
          <DicaDoRotulo rotulo={t('produtosModulos.solucao.gruposServico')} />
        </header>
        {servico.length ? (
          <ul className="divide-y divide-ds-border">
            {servico.map((g) => (
              <li key={g} className="truncate px-4 py-2 font-mono text-xs md:px-5">
                {g}
              </li>
            ))}
          </ul>
        ) : (
          <p className="px-4 py-4 text-sm text-ds-fg-muted md:px-5">
            {t('produtosModulos.solucao.nenhumGrupoServico')}
          </p>
        )}
        <p className="border-t border-ds-border px-4 py-2.5 text-xs text-ds-fg-muted md:px-5">
          {t('produtosModulos.solucao.horasServico')}
        </p>
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Painel do produto                                                    */
/* ------------------------------------------------------------------ */

export function PainelProduto({
  produto,
  catalogo,
  mapeamentos,
  usos,
  podeEditar,
  soSemGrupo,
  onSoSemGrupo,
  onEditarProduto,
  onEditarModulo,
  onAlterarStatus,
  onMover,
  podeExcluir,
  onExcluir,
}: DadosCatalogo & {
  produto: Produto;
  podeEditar: boolean;
  soSemGrupo: boolean;
  onSoSemGrupo: (v: boolean) => void;
  onEditarProduto: () => void;
  /** null = módulo novo */
  onEditarModulo: (m: Modulo | null) => void;
  onAlterarStatus: (m: Modulo) => void;
  /** Só no produto "A classificar" */
  onMover: (m: Modulo) => void;
  /** Módulo que nunca foi usado: pode ser excluído de vez */
  podeExcluir?: (m: Modulo) => boolean;
  onExcluir?: (m: Modulo) => void;
}) {
  const { t } = useTranslation();
  const [busca, setBusca] = useState('');
  const [situacao, setSituacao] = useState<Situacao[]>(['ativo']);
  const doProduto = useMemo(
    () =>
      catalogo.modulos.filter((m) => m.produtoId === produto.id).sort((a, b) => a.ordem - b.ordem),
    [catalogo.modulos, produto.id]
  );
  const gruposProduto = gruposSoDoProduto(mapeamentos, produto.id);
  const bancos = bancosDoProduto(usos, produto.id);
  const solucao = catalogo.solucoes.find((s) => s.id === produto.solucaoId);

  const linhas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return doProduto.filter((m) => {
      const grupos = gruposDoModulo(mapeamentos, m.id);
      return (
        (!situacao.length || situacao.includes(m.ativo ? 'ativo' : 'inativo')) &&
        (!soSemGrupo || !grupos.length) &&
        (!termo ||
          `${m.nome} ${m.descricao ?? ''} ${grupos.join(' ')}`.toLowerCase().includes(termo))
      );
    });
  }, [doProduto, mapeamentos, situacao, soSemGrupo, busca]);
  const filtrosAtivos =
    (situacao.length !== 1 || situacao[0] !== 'ativo' ? 1 : 0) + (soSemGrupo ? 1 : 0);
  const limpar = () => {
    setBusca('');
    setSituacao(['ativo']);
    onSoSemGrupo(false);
  };

  const colunas: ColunaTabela<Modulo>[] = [
    {
      id: 'modulo',
      cabecalho: t('produtosModulos.produto.colunaModulo'),
      mobile: 'titulo',
      celula: (m) => <NomeComSituacao nome={m.nome} ativo={m.ativo} descricao={m.descricao} />,
    },
    {
      id: 'grupos',
      cabecalho: t('produtosModulos.produto.colunaGrupos'),
      celula: (m) => (
        <ListaGrupos
          titulo={t('produtosModulos.produto.gruposEm', { modulo: m.nome })}
          grupos={gruposDoModulo(mapeamentos, m.id)}
        />
      ),
    },
    {
      id: 'uso',
      cabecalho: t('produtosModulos.produto.colunaUso'),
      celula: (m) => <ListaUsos usos={usosDoModulo(usos, m)} />,
    },
    {
      id: 'acoes',
      cabecalho: '',
      mobile: podeEditar ? 'acoes' : 'oculta',
      celula: (m) =>
        podeEditar ? (
          <MenuAcoes
            nome={m.nome}
            ativo={m.ativo}
            onEditar={() => onEditarModulo(m)}
            onAlterarStatus={() => onAlterarStatus(m)}
            onExcluir={onExcluir && podeExcluir?.(m) ? () => onExcluir(m) : undefined}
            extras={
              produto.aClassificar && m.ativo ? (
                <DropdownMenuItem className={itemMenu} onSelect={() => onMover(m)}>
                  <ArrowRightLeft className="h-4 w-4" /> {t('produtosModulos.produto.moverPara')}
                </DropdownMenuItem>
              ) : undefined
            }
          />
        ) : (
          <ChevronRight className="ml-auto h-4 w-4 text-ds-fg-muted" aria-hidden />
        ),
    },
  ];

  return (
    <section className="min-w-0 overflow-hidden rounded-xl border border-ds-border bg-ds-bg-surface">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-ds-border px-4 py-4 md:px-5">
        <div className="min-w-0">
          <p className="text-xs font-medium text-ds-fg-muted">{solucao?.nome} ›</p>
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            {produto.nome}
            {!produto.ativo && <StatusBadge>{t('fase3Comum.inativo')}</StatusBadge>}
          </h2>
          <p className="text-xs text-ds-fg-muted">
            {produto.descricao || t('produtosModulos.produto.semDescricao')}
            {' · '}
            {gruposProduto.length ? (
              <ComLista
                rotulo={t('produtosModulos.solucao.gruposLigadosA', { produto: produto.nome })}
                itens={gruposProduto}
              >
                {plural(t, 'produtosModulos.produto.gruposDoProduto', gruposProduto.length)}
              </ComLista>
            ) : (
              t('produtosModulos.produto.nenhumGrupoProduto')
            )}
            {bancos.length > 0 && (
              <>
                {' · '}
                <ListaUsos usos={bancos} />
              </>
            )}
          </p>
        </div>
        {podeEditar && (
          <div className="flex flex-wrap gap-2">
            <Button tamanho="sm" variante="fantasma" onClick={onEditarProduto}>
              <Pencil /> {t('produtosModulos.produto.editar')}
            </Button>
            {!produto.aClassificar && (
              <Button tamanho="sm" variante="primario" onClick={() => onEditarModulo(null)}>
                <Plus /> {t('produtosModulos.novoModulo')}
              </Button>
            )}
          </div>
        )}
      </header>

      {produto.aClassificar && (
        <div className="border-b border-ds-border p-3 md:px-4">
          <Callout tom="warning">{t('produtosModulos.produto.aClassificar')}</Callout>
        </div>
      )}

      {doProduto.length === 0 ? (
        <EmptyState
          icone={<Layers />}
          titulo={t('produtosModulos.produto.semModulosTitulo')}
          descricao={t('produtosModulos.produto.semModulosDescricao')}
          acao={
            podeEditar ? (
              <Button onClick={onEditarProduto}>
                <Link2 /> {t('produtosModulos.produto.verGrupos')}
              </Button>
            ) : undefined
          }
        />
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2 border-b border-ds-border p-3 md:px-4">
            {(filtrosAtivos > 0 || busca) && <BotaoLimparFiltros onClick={limpar} />}
            <label className="relative block min-w-0 flex-1 md:w-72 md:flex-none">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ds-fg-muted"
                aria-hidden
              />
              <input
                type="search"
                aria-label={t('produtosModulos.produto.buscar')}
                placeholder={t('produtosModulos.produto.buscar')}
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className={cn(campo, 'pl-9')}
              />
            </label>
            <FiltroMultiplo<Situacao>
              rotulo={t('fase3Comum.situacao')}
              opcoes={[
                { valor: 'ativo', rotulo: t('fase3Comum.ativos') },
                { valor: 'inativo', rotulo: t('fase3Comum.inativos') },
              ]}
              selecionados={situacao}
              onChange={setSituacao}
            />
            <FiltroAlternar
              rotulo={t('produtosModulos.produto.filtroSemGrupo')}
              ativo={soSemGrupo}
              onChange={onSoSemGrupo}
            />
          </div>

          <DataTable
            rotulo={t('produtosModulos.produto.modulosDe', { produto: produto.nome })}
            colunas={colunas}
            linhas={linhas}
            chaveLinha={(m) => m.id}
            onLinhaClick={podeEditar ? (m) => onEditarModulo(m) : undefined}
            vazio={
              <EmptyState
                icone={<Layers />}
                titulo={t('produtosModulos.produto.nenhumModulo')}
                descricao={
                  filtrosAtivos || busca ? t('produtosModulos.produto.nenhumNoFiltro') : undefined
                }
                acao={
                  filtrosAtivos || busca ? (
                    <Button onClick={limpar}>{t('fase3Comum.limparFiltros')}</Button>
                  ) : undefined
                }
              />
            }
          />
        </>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Mover módulo "A classificar"                                         */
/* ------------------------------------------------------------------ */

/** Escolhe o produto que recebe o módulo; só produtos ativos e definitivos da mesma solução */
export function MoverModulo({
  catalogo,
  modulo,
  processando,
  onFechar,
  onConfirmar,
}: {
  catalogo: Catalogo;
  /** null = fechado */
  modulo: Modulo | null;
  processando?: boolean;
  onFechar: () => void;
  onConfirmar: (produtoId: string) => void;
}) {
  const { t } = useTranslation();
  const id = useId();
  const [destino, setDestino] = useState('');
  const solucaoId = catalogo.produtos.find((p) => p.id === modulo?.produtoId)?.solucaoId;
  const destinos = catalogo.produtos
    .filter((p) => p.solucaoId === solucaoId && p.ativo && !p.aClassificar)
    .sort((a, b) => a.ordem - b.ordem);

  return (
    <ConfirmDialog
      aberto={!!modulo}
      onOpenChange={(aberto) => !aberto && onFechar()}
      titulo={t('produtosModulos.mover.titulo', { modulo: modulo?.nome ?? '' })}
      descricao={t('produtosModulos.mover.descricao')}
      rotuloConfirmar={t('produtosModulos.mover.confirmar')}
      processando={processando}
      confirmarDesabilitado={!destino}
      onConfirmar={() => onConfirmar(destino)}
    >
      {destinos.length ? (
        <div>
          <label htmlFor={id} className="mb-1.5 block text-sm font-medium">
            {t('produtosModulos.mover.destino')}
          </label>
          <Select
            id={id}
            value={destino}
            onChange={(e) => setDestino(e.target.value)}
            className="w-full"
          >
            <option value="">{t('fase3Comum.selecione')}</option>
            {destinos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}
              </option>
            ))}
          </Select>
        </div>
      ) : (
        <Callout tom="warning">{t('produtosModulos.mover.nenhumDestino')}</Callout>
      )}
    </ConfirmDialog>
  );
}
