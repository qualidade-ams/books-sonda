// Grupos do Aranda vinculados a uma solução, produto ou módulo, na tela de edição. A lista é
// controlada pela edição, que grava as mudanças junto com o item ao salvar.
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link2, Unlink } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ds/Button';
import { Callout } from '@/components/ds/Callout';
import { Ajuda } from '@/components/ds/Formulario';
import { campo } from '@/components/ds/estilos';
import { cn } from '@/lib/utils';
import type { AlvoGrupo } from '@/utils/catalogoTela';
import type { Catalogo } from '@/types/catalogo';
import type { DestinoGrupo, MapeamentoGrupo } from '@/types/dePara';

/** Quantos grupos o seletor mostra de uma vez */
const LIMITE_CANDIDATOS = 40;

/** Onde o grupo está hoje, em texto: todos os lugares dele */
function useOndeEsta(catalogo: Catalogo) {
  const { t } = useTranslation();
  const nome = <T extends { id: string; nome: string }>(lista: T[], id: string | null) =>
    lista.find((x) => x.id === id)?.nome ?? '';
  const lugar = (v: DestinoGrupo) =>
    v.moduloId
      ? t('produtosModulos.grupos.emModulo', {
          produto: nome(catalogo.produtos, v.produtoId),
          modulo: nome(catalogo.modulos, v.moduloId),
        })
      : v.produtoId
        ? t('produtosModulos.grupos.emProduto', { produto: nome(catalogo.produtos, v.produtoId) })
        : t('produtosModulos.grupos.servicoDe', { solucao: nome(catalogo.solucoes, v.solucaoId) });
  return (g: MapeamentoGrupo) =>
    g.vinculos.length ? g.vinculos.map(lugar).join(' · ') : t('produtosModulos.grupos.semSolucao');
}

/** Produto do item: vincular move o grupo que já está nesse produto (um lugar por produto) */
function produtoDoAlvo(alvo: AlvoGrupo, catalogo: Catalogo): string | null {
  if (alvo.tipo === 'produto') return alvo.id;
  if (alvo.tipo === 'modulo')
    return catalogo.modulos.find((m) => m.id === alvo.id)?.produtoId ?? null;
  return null;
}

function VincularGrupo({
  alvo,
  catalogo,
  mapeamentos,
  vinculados,
  onVincular,
}: {
  alvo: AlvoGrupo;
  catalogo: Catalogo;
  mapeamentos: MapeamentoGrupo[];
  vinculados: string[];
  onVincular: (grupo: string) => void;
}) {
  const { t } = useTranslation();
  const ondeEsta = useOndeEsta(catalogo);
  const produto = produtoDoAlvo(alvo, catalogo);
  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState('');
  const candidatos = mapeamentos.filter(
    (g) =>
      !vinculados.includes(g.grupoAranda) &&
      (!busca || g.grupoAranda.toLowerCase().includes(busca.toLowerCase()))
  );

  return (
    <Popover open={aberto} onOpenChange={setAberto}>
      <PopoverTrigger asChild>
        <Button tamanho="sm">
          <Link2 /> {t('produtosModulos.grupos.vincular')}
        </Button>
      </PopoverTrigger>
      <PopoverContent
        data-ds="v2"
        align="end"
        className="w-[min(92vw,420px)] border-ds-border bg-ds-bg-raised p-2 font-ds-sans text-ds-fg"
      >
        <input
          type="search"
          autoFocus
          aria-label={t('produtosModulos.grupos.buscar')}
          placeholder={t('produtosModulos.grupos.buscar')}
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className={campo}
        />
        <ul
          className="mt-2 max-h-72 overflow-y-auto"
          aria-label={t('produtosModulos.grupos.lista')}
        >
          {candidatos.slice(0, LIMITE_CANDIDATOS).map((g) => {
            // Sai do outro lugar só se for no mesmo produto; senão, fica nos dois
            const sai = !!produto && g.vinculos.some((v) => v.produtoId === produto);
            return (
              <li key={g.id}>
                <button
                  type="button"
                  onClick={() => {
                    onVincular(g.grupoAranda);
                    setAberto(false);
                    setBusca('');
                  }}
                  className="flex w-full flex-col rounded-md px-2.5 py-2 text-left hover:bg-ds-bg-subtle focus-visible:bg-ds-bg-subtle focus-visible:outline-none"
                >
                  <span className="font-mono text-xs">{g.grupoAranda}</span>
                  <span className={cn('text-xs', sai ? 'text-ds-warning-fg' : 'text-ds-fg-muted')}>
                    {ondeEsta(g)}
                    {sai
                      ? ` · ${t('produtosModulos.grupos.saiParaCa')}`
                      : g.vinculos.length > 0 && ` · ${t('produtosModulos.grupos.ficaTambem')}`}
                  </span>
                </button>
              </li>
            );
          })}
          {!candidatos.length && (
            <li className="px-2.5 py-3 text-sm text-ds-fg-muted">
              {t('produtosModulos.grupos.nenhumEncontrado')}
            </li>
          )}
        </ul>
      </PopoverContent>
    </Popover>
  );
}

/** Lista de grupos vinculados, com desvincular e o aviso de impacto */
export function EditorGrupos({
  alvo,
  catalogo,
  mapeamentos,
  inicial,
  grupos,
  onChange,
  vazioTexto,
  ajuda,
  somenteLeitura,
}: {
  alvo: AlvoGrupo;
  catalogo: Catalogo;
  mapeamentos: MapeamentoGrupo[];
  /** Como estava ao abrir: diferente dela, avisa que pode mover horas */
  inicial: string[];
  grupos: string[];
  onChange: (grupos: string[]) => void;
  vazioTexto: string;
  ajuda: string;
  /** Sem Edição no De-para: só lista */
  somenteLeitura?: boolean;
}) {
  const { t } = useTranslation();
  const mudaram = [...inicial].sort().join('|') !== [...grupos].sort().join('|');
  return (
    <>
      {grupos.length ? (
        <ul className="divide-y divide-ds-border rounded-lg border border-ds-border">
          {grupos.map((g) => (
            <li key={g} className="flex items-center justify-between gap-3 px-3 py-2">
              <span className="min-w-0 truncate font-mono text-xs">{g}</span>
              {!somenteLeitura && (
                <Button
                  tamanho="sm"
                  variante="fantasma"
                  onClick={() => onChange(grupos.filter((x) => x !== g))}
                  aria-label={t('produtosModulos.grupos.desvincularGrupo', { grupo: g })}
                >
                  <Unlink /> {t('produtosModulos.grupos.desvincular')}
                </Button>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <Callout tom="warning">{vazioTexto}</Callout>
      )}
      {somenteLeitura ? (
        <Ajuda>{t('produtosModulos.grupos.soLeitura')}</Ajuda>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <VincularGrupo
            alvo={alvo}
            catalogo={catalogo}
            mapeamentos={mapeamentos}
            vinculados={grupos}
            onVincular={(g) => onChange([...grupos, g])}
          />
          <Ajuda>{ajuda}</Ajuda>
        </div>
      )}
      {mudaram && (
        <Callout tom="warning" titulo={t('produtosModulos.grupos.podeMoverTitulo')}>
          {t('produtosModulos.grupos.podeMoverTexto')}
        </Callout>
      )}
    </>
  );
}
