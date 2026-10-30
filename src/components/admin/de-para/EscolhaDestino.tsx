// Destino de um grupo do Aranda no catálogo: Solução › Produto › Módulo, em três listas que
// dependem da anterior. Usado na edição do mapeamento e na atribuição em lote.
import { useTranslation } from 'react-i18next';
import { Select } from '@/components/ds/Select';
import { StatusBadge } from '@/components/ds/StatusBadge';
import { Rotulo } from '@/components/ds/Formulario';
import type { Catalogo } from '@/types/catalogo';
import type { DestinoGrupo, MapeamentoGrupo } from '@/types/dePara';

const VAZIO: DestinoGrupo = { solucaoId: null, produtoId: null, moduloId: null };

const porOrdem = <T extends { ordem: number }>(lista: T[]) =>
  [...lista].sort((a, b) => a.ordem - b.ordem);

export function EscolhaDestino({
  idBase,
  catalogo,
  destino,
  onChange,
  compacto,
}: {
  idBase: string;
  catalogo: Catalogo;
  destino: DestinoGrupo;
  onChange: (d: DestinoGrupo) => void;
  /** Sem rótulos visíveis, lado a lado (barra de atribuição em lote) */
  compacto?: boolean;
}) {
  const { t } = useTranslation();
  const { solucaoId, produtoId, moduloId } = destino;
  // Só itens ativos (e produtos definitivos) para escolher; o destino atual continua visível
  const solucoes = porOrdem(catalogo.solucoes.filter((s) => s.ativo || s.id === solucaoId));
  const produtos = porOrdem(
    catalogo.produtos.filter(
      (p) => p.solucaoId === solucaoId && ((p.ativo && !p.aClassificar) || p.id === produtoId)
    )
  );
  const modulos = porOrdem(
    catalogo.modulos.filter((m) => m.produtoId === produtoId && (m.ativo || m.id === moduloId))
  );

  const listas = [
    {
      id: `${idBase}-solucao`,
      rotulo: t('deParaGrupos.destino.solucao'),
      el: (id: string, rotulo?: string) => (
        <Select
          id={id}
          aria-label={rotulo}
          value={solucaoId ?? ''}
          onChange={(e) => onChange({ ...VAZIO, solucaoId: e.target.value || null })}
          className="w-full"
        >
          <option value="">{t('deParaGrupos.destino.nenhumaSolucao')}</option>
          {solucoes.map((s) => (
            <option key={s.id} value={s.id}>
              {s.nome}
            </option>
          ))}
        </Select>
      ),
    },
    {
      id: `${idBase}-produto`,
      rotulo: t('deParaGrupos.destino.produto'),
      el: (id: string, rotulo?: string) => (
        <Select
          id={id}
          aria-label={rotulo}
          value={produtoId ?? ''}
          disabled={!solucaoId}
          onChange={(e) =>
            onChange({ solucaoId, produtoId: e.target.value || null, moduloId: null })
          }
          className="w-full"
        >
          <option value="">{t('deParaGrupos.destino.nenhumProduto')}</option>
          {produtos.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nome}
            </option>
          ))}
        </Select>
      ),
    },
    {
      id: `${idBase}-modulo`,
      rotulo: t('deParaGrupos.destino.modulo'),
      el: (id: string, rotulo?: string) => (
        <Select
          id={id}
          aria-label={rotulo}
          value={moduloId ?? ''}
          disabled={!produtoId || !modulos.length}
          onChange={(e) => onChange({ solucaoId, produtoId, moduloId: e.target.value || null })}
          className="w-full"
        >
          <option value="">
            {produtoId && !modulos.length
              ? t('deParaGrupos.destino.produtoSemModulos')
              : t('deParaGrupos.destino.todosModulos')}
          </option>
          {modulos.map((m) => (
            <option key={m.id} value={m.id}>
              {m.nome}
            </option>
          ))}
        </Select>
      ),
    },
  ];

  if (compacto)
    return (
      <div className="flex flex-wrap gap-2 [&>*]:w-full sm:[&>*]:w-44">
        {listas.map((l) => (
          <span key={l.id}>{l.el(l.id, l.rotulo)}</span>
        ))}
      </div>
    );
  return (
    <div className="grid items-start gap-4 sm:grid-cols-3">
      {listas.map((l) => (
        <div key={l.id}>
          <Rotulo htmlFor={l.id}>{l.rotulo}</Rotulo>
          {l.el(l.id)}
        </div>
      ))}
    </div>
  );
}

/**
 * Destino na linha da lista: cada lugar do grupo numa linha (solução › produto › módulo ou
 * "serviço"); sem lugar, "não se aplica"
 */
export function DestinoNaLista({ m, catalogo }: { m: MapeamentoGrupo; catalogo: Catalogo }) {
  const { t } = useTranslation();
  if (!m.vinculos.length)
    return <StatusBadge>{t('deParaGrupos.classificacao.nao_se_aplica')}</StatusBadge>;
  const nome = <T extends { id: string; nome: string }>(lista: T[], id: string | null) =>
    lista.find((x) => x.id === id)?.nome;
  return (
    <span className="flex min-w-0 flex-col gap-0.5">
      {m.vinculos.map((v) => (
        <span
          key={`${v.solucaoId}|${v.produtoId ?? ''}|${v.moduloId ?? ''}`}
          data-testid="lugar-do-grupo"
        >
          <span className="text-ds-fg-muted">{nome(catalogo.solucoes, v.solucaoId)}</span>
          {v.produtoId ? (
            <>
              <span className="text-ds-fg-muted"> › </span>
              <span className="font-medium">{nome(catalogo.produtos, v.produtoId)}</span>
              {v.moduloId && (
                <span className="text-ds-fg-secondary">
                  {' '}
                  › {nome(catalogo.modulos, v.moduloId)}
                </span>
              )}
            </>
          ) : (
            <span className="text-ds-fg-secondary"> · {t('deParaGrupos.destino.servico')}</span>
          )}
        </span>
      ))}
    </span>
  );
}
