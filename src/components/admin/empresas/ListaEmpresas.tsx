// Lista da tela Empresas: busca, filtros, paginação e o atalho para a tela atual, onde a
// identidade é mantida até a virada (Fase 6).
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Building2,
  Check,
  ChevronRight,
  ClipboardPen,
  Copy,
  ExternalLink,
  FolderKanban,
  MoreHorizontal,
  Search,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { DataTable, type ColunaTabela } from '@/components/ds/DataTable';
import { EmptyState } from '@/components/ds/EmptyState';
import { Callout } from '@/components/ds/Callout';
import { Button } from '@/components/ds/Button';
import { Paginacao } from '@/components/ds/Paginacao';
import {
  BotaoFiltros,
  BotaoLimparFiltros,
  FiltroAlternar,
  FiltroMultiplo,
} from '@/components/ds/Filtros';
import { Chip, IconeComDica } from '@/components/ds/Formulario';
import { campo, itemMenu } from '@/components/ds/estilos';
import { cn } from '@/lib/utils';
import {
  SEM_FILTRO_EMPRESAS,
  telaAtualDaEmpresa,
  codigosDeSolucao,
  filtrarEmpresas,
  filtrosAtivosEmpresas,
  type FiltroEmpresas,
  type SimNao,
} from '@/utils/empresasTela';
import type { EmpresaLista, ModeloEmpresa } from '@/types/empresas';

const ID_FILTROS = 'filtros-empresas';
const MODELOS: ModeloEmpresa[] = ['legado', 'multiplo', 'liberada'];

const dicaClasse = 'border-ds-border bg-ds-bg-raised font-ds-sans text-xs text-ds-fg';

/** Verde = ativa; amarela = ativa com informação pendente (RN-35); vermelha = inativa */
function BolinhaSituacao({ empresa }: { empresa: EmpresaLista }) {
  const { t } = useTranslation();
  const situacao =
    empresa.status === 'inativo'
      ? { dica: t('empresasCadastro.situacao.inativa'), fundo: 'var(--ds-danger-fg)' }
      : empresa.pendencias.length
        ? {
            dica: t('empresasCadastro.situacao.pendente', {
              pendencias: empresa.pendencias
                .map((p) => t(`empresasCadastro.pendencia.${p}`))
                .join(', '),
            }),
            fundo: 'var(--ds-warning-fg)',
          }
        : { dica: t('empresasCadastro.situacao.ativa'), fundo: 'var(--ds-success-fg)' };
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          role="img"
          tabIndex={0}
          aria-label={situacao.dica}
          className="grid h-5 w-2.5 shrink-0 place-items-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-focus"
        >
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: situacao.fundo }} />
        </span>
      </TooltipTrigger>
      <TooltipContent data-ds="v2" className={dicaClasse}>
        {situacao.dica}
      </TooltipContent>
    </Tooltip>
  );
}

/** "Sim"/"Não"; a dica diz em quais soluções há AMS */
function AmsDaEmpresa({ empresa }: { empresa: EmpresaLista }) {
  const { t } = useTranslation();
  const com = empresa.solucoes.filter((s) => s.temAms).map((s) => s.codigo);
  if (!com.length)
    return <span className="text-ds-fg-muted">{t('empresasCadastro.lista.nao')}</span>;
  const sem = empresa.solucoes.filter((s) => !s.temAms).map((s) => s.codigo);
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          tabIndex={0}
          className="cursor-help underline decoration-ds-border-strong decoration-dotted underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-focus"
        >
          {t('empresasCadastro.lista.sim')}
        </span>
      </TooltipTrigger>
      <TooltipContent data-ds="v2" className={cn(dicaClasse, 'leading-5')}>
        <p>{t('empresasCadastro.lista.amsEm', { solucoes: com.join(', ') })}</p>
        {sem.length > 0 && (
          <p className="text-ds-fg-muted">
            {t('empresasCadastro.lista.semAms', { solucoes: sem.join(', ') })}
          </p>
        )}
      </TooltipContent>
    </Tooltip>
  );
}

/** Nome do responsável; o clique copia o e-mail sem abrir a empresa. Sem cadastro, o próprio e-mail */
function NomeCopiaEmail({ nome, email }: { nome: string | null; email: string | null }) {
  const { t } = useTranslation();
  const [copiado, setCopiado] = useState(false);
  useEffect(() => {
    if (!copiado) return;
    const espera = setTimeout(() => setCopiado(false), 1500);
    return () => clearTimeout(espera);
  }, [copiado]);

  if (!email) return <span className="text-ds-fg-muted">—</span>;
  const exibido = nome || email;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            navigator.clipboard?.writeText(email).catch(() => undefined);
            setCopiado(true);
          }}
          onKeyDown={(e) => e.stopPropagation()}
          aria-label={t('empresasCadastro.lista.copiarEmail', { nome: exibido, email })}
          className="group inline-flex max-w-[14rem] items-center gap-1.5 rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-focus"
        >
          <span className="truncate">{exibido}</span>
          {copiado ? (
            <Check className="h-3.5 w-3.5 shrink-0 text-ds-success-fg" />
          ) : (
            <Copy className="h-3.5 w-3.5 shrink-0 text-ds-fg-muted opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100" />
          )}
        </button>
      </TooltipTrigger>
      <TooltipContent data-ds="v2" className={dicaClasse}>
        {copiado
          ? t('empresasCadastro.lista.emailCopiado')
          : t('empresasCadastro.lista.cliqueCopiar', { email })}
      </TooltipContent>
    </Tooltip>
  );
}

/** Na transição a identidade, inclusive o status, é mantida na tela atual: o menu leva para lá */
function MenuLinha({ empresa }: { empresa: EmpresaLista }) {
  const { t } = useTranslation();
  return (
    <div
      className="flex justify-end"
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            tamanho="icone"
            variante="fantasma"
            aria-label={t('fase3Comum.acoesDe', { nome: empresa.nomeAbreviado })}
          >
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          data-ds="v2"
          align="end"
          className="min-w-52 border-ds-border bg-ds-bg-raised p-1 font-ds-sans text-ds-fg"
        >
          <DropdownMenuItem asChild className={itemMenu}>
            <Link to={telaAtualDaEmpresa(empresa.id)}>
              <ExternalLink className="h-4 w-4" /> {t('empresasCadastro.editarNaTelaAtual')}
            </Link>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export function ListaEmpresas({
  empresas,
  carregando,
  erro,
  podeEditar,
  filtro,
  onFiltro,
  onAbrir,
  onTentarNovamente,
}: {
  empresas: EmpresaLista[];
  carregando: boolean;
  erro: Error | null;
  podeEditar: boolean;
  /** Controlado pela tela: o indicador "Informações pendentes" também filtra */
  filtro: FiltroEmpresas;
  onFiltro: (f: FiltroEmpresas) => void;
  onAbrir: (id: string) => void;
  onTentarNovamente: () => void;
}) {
  const { t } = useTranslation();
  const ativos = filtrosAtivosEmpresas(filtro);
  const [filtrosAbertos, setFiltrosAbertos] = useState(ativos > 0);
  const [pagina, setPagina] = useState(1);
  const [porPagina, setPorPagina] = useState(50);
  // Filtro aplicado de fora abre os filtros; qualquer mudança volta para a primeira página
  useEffect(() => {
    if (ativos > 0) setFiltrosAbertos(true);
    setPagina(1);
  }, [filtro, ativos]);

  const linhas = filtrarEmpresas(empresas, filtro);
  const visiveis = linhas.slice((pagina - 1) * porPagina, pagina * porPagina);
  const filtrando = ativos > 0 || !!filtro.busca;
  const mudar = <K extends keyof FiltroEmpresas>(k: K, v: FiltroEmpresas[K]) =>
    onFiltro({ ...filtro, [k]: v });
  const simNao = [
    { valor: 'sim' as SimNao, rotulo: t('empresasCadastro.lista.sim') },
    { valor: 'nao' as SimNao, rotulo: t('empresasCadastro.lista.nao') },
  ];

  const colunas: ColunaTabela<EmpresaLista>[] = [
    {
      id: 'empresa',
      cabecalho: t('empresasCadastro.lista.colunaEmpresa'),
      mobile: 'titulo',
      celula: (e) => {
        const projetos = e.solucoes.filter((s) => s.emProjeto);
        return (
          <div className="min-w-0">
            <p className="flex items-center gap-1.5 font-semibold">
              <BolinhaSituacao empresa={e} />
              {e.nomeAbreviado}
              {e.emProjeto && (
                <IconeComDica
                  rotulo={t('empresasCadastro.lista.emProjeto')}
                  dica={
                    projetos
                      .map((s) => `${s.codigo}: ${s.justificativaProjeto ?? ''}`)
                      .join(' · ') || '—'
                  }
                >
                  <FolderKanban className="h-3.5 w-3.5" />
                </IconeComDica>
              )}
              {e.observacao && (
                <IconeComDica rotulo={t('empresasCadastro.lista.observacao')} dica={e.observacao}>
                  <ClipboardPen className="h-3.5 w-3.5" />
                </IconeComDica>
              )}
            </p>
            <p className="max-w-[18rem] truncate pl-4 text-xs text-ds-fg-muted">{e.nomeCompleto}</p>
          </div>
        );
      },
    },
    {
      id: 'solucoes',
      cabecalho: t('empresasCadastro.lista.colunaSolucoes'),
      celula: (e) => (
        <div className="flex flex-wrap gap-1">
          {e.solucoes.map((s) => (
            <Chip key={s.id}>{s.codigo}</Chip>
          ))}
        </div>
      ),
    },
    {
      id: 'ams',
      cabecalho: t('empresasCadastro.lista.colunaAms'),
      celula: (e) => <AmsDaEmpresa empresa={e} />,
    },
    {
      id: 'cs',
      cabecalho: t('empresasCadastro.lista.colunaCs'),
      celula: (e) => <NomeCopiaEmail nome={e.nomeCs} email={e.emailCs} />,
    },
    {
      id: 'comercial',
      cabecalho: t('empresasCadastro.lista.colunaComercial'),
      celula: (e) => <NomeCopiaEmail nome={e.nomeComercial} email={e.emailComercial} />,
    },
    {
      id: 'acoes',
      cabecalho: '',
      mobile: podeEditar ? 'acoes' : 'oculta',
      celula: (e) =>
        podeEditar ? (
          <MenuLinha empresa={e} />
        ) : (
          <ChevronRight className="ml-auto h-4 w-4 text-ds-fg-muted" aria-hidden />
        ),
    },
  ];

  return (
    <section className="overflow-hidden rounded-xl border border-ds-border bg-ds-bg-surface">
      <div className="border-b border-ds-border p-3 md:p-4">
        <div className="flex flex-wrap items-center gap-2">
          <BotaoFiltros
            abertos={filtrosAbertos}
            ativos={ativos}
            controla={ID_FILTROS}
            onClick={() => setFiltrosAbertos((v) => !v)}
          />
          {filtrando && <BotaoLimparFiltros onClick={() => onFiltro(SEM_FILTRO_EMPRESAS)} />}
          <label className="relative block min-w-0 flex-1 md:w-72 md:flex-none">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ds-fg-muted"
              aria-hidden
            />
            <input
              type="search"
              aria-label={t('empresasCadastro.lista.buscar')}
              placeholder={t('empresasCadastro.lista.buscar')}
              value={filtro.busca}
              onChange={(e) => mudar('busca', e.target.value)}
              className={cn(campo, 'pl-9')}
            />
          </label>
          {filtrosAbertos && (
            <div
              id={ID_FILTROS}
              className="ds-surgir flex w-full flex-wrap gap-2 md:w-auto [&>*]:flex-1 sm:[&>*]:flex-none"
            >
              <FiltroMultiplo<EmpresaLista['status']>
                rotulo={t('empresasCadastro.filtros.status')}
                opcoes={[
                  { valor: 'ativo', rotulo: t('empresasCadastro.filtros.ativas') },
                  { valor: 'inativo', rotulo: t('empresasCadastro.filtros.inativas') },
                ]}
                selecionados={filtro.status}
                onChange={(v) => mudar('status', v)}
              />
              <FiltroMultiplo
                rotulo={t('empresasCadastro.filtros.solucao')}
                opcoes={codigosDeSolucao(empresas).map((c) => ({ valor: c, rotulo: c }))}
                selecionados={filtro.solucoes}
                onChange={(v) => mudar('solucoes', v)}
              />
              <FiltroMultiplo<SimNao>
                rotulo={t('empresasCadastro.filtros.temAms')}
                opcoes={simNao}
                selecionados={filtro.temAms}
                onChange={(v) => mudar('temAms', v)}
              />
              <FiltroMultiplo<SimNao>
                rotulo={t('empresasCadastro.filtros.emProjeto')}
                opcoes={simNao}
                selecionados={filtro.emProjeto}
                onChange={(v) => mudar('emProjeto', v)}
              />
              <FiltroMultiplo<ModeloEmpresa>
                rotulo={t('empresasCadastro.filtros.modelo')}
                opcoes={MODELOS.map((m) => ({
                  valor: m,
                  rotulo: t(`empresasCadastro.modelo.${m}`),
                }))}
                selecionados={filtro.modelo}
                onChange={(v) => mudar('modelo', v)}
              />
              <FiltroAlternar
                rotulo={t('empresasCadastro.filtros.soPendentes')}
                ativo={filtro.soPendentes}
                onChange={(v) => mudar('soPendentes', v)}
              />
            </div>
          )}
        </div>
      </div>

      {erro ? (
        <div className="space-y-3 p-4">
          <Callout tom="danger" titulo={t('empresasCadastro.lista.erro')}>
            {t('fase3Comum.verifiqueConexao')}
          </Callout>
          <Button onClick={onTentarNovamente}>{t('fase3Comum.tentarNovamente')}</Button>
        </div>
      ) : (
        <DataTable
          rotulo={t('empresasCadastro.lista.rotulo')}
          colunas={colunas}
          linhas={visiveis}
          chaveLinha={(e) => e.id}
          carregando={carregando}
          onLinhaClick={(e) => onAbrir(e.id)}
          vazio={
            <EmptyState
              icone={<Building2 />}
              titulo={t('empresasCadastro.lista.nenhuma')}
              descricao={filtrando ? t('empresasCadastro.lista.nenhumaNoFiltro') : undefined}
              acao={
                filtrando ? (
                  <Button onClick={() => onFiltro(SEM_FILTRO_EMPRESAS)}>
                    {t('fase3Comum.limparFiltros')}
                  </Button>
                ) : undefined
              }
            />
          }
        />
      )}

      {!erro && !carregando && linhas.length > 0 && (
        <Paginacao
          total={linhas.length}
          pagina={pagina}
          porPagina={porPagina}
          onPagina={setPagina}
          onPorPagina={(q) => {
            setPorPagina(q);
            setPagina(1);
          }}
        />
      )}
    </section>
  );
}
