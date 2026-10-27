// Aba "Módulos de requerimento": para que produto e módulo do catálogo vai cada valor do campo
// Módulo dos requerimentos. As mudanças ficam na tela até salvar pela barra do rodapé.
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Workflow } from 'lucide-react';
import { DataTable, type ColunaTabela } from '@/components/ds/DataTable';
import { EmptyState } from '@/components/ds/EmptyState';
import { Callout } from '@/components/ds/Callout';
import { Button } from '@/components/ds/Button';
import { Select } from '@/components/ds/Select';
import { BarraRodape, DicaDoRotulo } from '@/components/ds/Formulario';
import type { Catalogo, ModuloRequerimento } from '@/types/catalogo';

export interface AlteracaoModuloRequerimento {
  id: string;
  produtoId: string;
  moduloId: string | null;
}

export function AbaModulosRequerimento({
  catalogo,
  linhas,
  carregando,
  erro,
  podeEditar,
  onSalvar,
  onTentarNovamente,
}: {
  catalogo: Catalogo;
  linhas: ModuloRequerimento[];
  carregando: boolean;
  erro: Error | null;
  podeEditar: boolean;
  /** Só as linhas que mudaram */
  onSalvar: (alteradas: AlteracaoModuloRequerimento[]) => Promise<void>;
  onTentarNovamente: () => void;
}) {
  const { t } = useTranslation();
  const [edicao, setEdicao] = useState(linhas);
  const [salvando, setSalvando] = useState(false);
  useEffect(() => setEdicao(linhas), [linhas]);

  const alteradas = edicao.filter((l) => {
    const original = linhas.find((o) => o.id === l.id);
    return original && (original.produtoId !== l.produtoId || original.moduloId !== l.moduloId);
  });
  const alterar = (id: string, mudanca: Partial<ModuloRequerimento>) =>
    setEdicao((ls) => ls.map((l) => (l.id === id ? { ...l, ...mudanca } : l)));
  const salvar = async () => {
    setSalvando(true);
    try {
      await onSalvar(alteradas.map(({ id, produtoId, moduloId }) => ({ id, produtoId, moduloId })));
    } finally {
      setSalvando(false);
    }
  };

  const nome = <T extends { id: string; nome: string }>(lista: T[], id: string | null) =>
    lista.find((x) => x.id === id)?.nome;
  const solucoes = [...catalogo.solucoes].sort((a, b) => a.ordem - b.ordem);

  const colunas: ColunaTabela<ModuloRequerimento>[] = [
    {
      id: 'modulo-req',
      cabecalho: t('produtosModulos.requerimentos.colunaModulo'),
      mobile: 'titulo',
      celula: (l) => <span className="font-semibold">{l.moduloRequerimento}</span>,
    },
    {
      id: 'destino',
      cabecalho: t('produtosModulos.requerimentos.colunaDestino'),
      celula: (l) => {
        const modulos = catalogo.modulos.filter((m) => m.produtoId === l.produtoId && m.ativo);
        if (!podeEditar) {
          const produto = catalogo.produtos.find((p) => p.id === l.produtoId);
          return (
            <span>
              <span className="text-ds-fg-muted">
                {nome(catalogo.solucoes, produto?.solucaoId ?? null)} ›{' '}
              </span>
              {produto?.nome}
              <span className="text-ds-fg-muted">
                {' '}
                ›{' '}
                {nome(catalogo.modulos, l.moduloId) ??
                  t('produtosModulos.requerimentos.todosModulos')}
              </span>
            </span>
          );
        }
        return (
          <div className="flex flex-wrap gap-2">
            <Select
              aria-label={t('produtosModulos.requerimentos.produtoDe', {
                modulo: l.moduloRequerimento,
              })}
              value={l.produtoId}
              onChange={(e) => alterar(l.id, { produtoId: e.target.value, moduloId: null })}
              className="w-52"
            >
              {solucoes.map((s) => (
                <optgroup key={s.id} label={s.nome}>
                  {catalogo.produtos
                    // "A classificar" e inativos não recebem requerimentos; o atual continua visível
                    .filter(
                      (p) =>
                        p.solucaoId === s.id &&
                        ((p.ativo && !p.aClassificar) || p.id === l.produtoId)
                    )
                    .sort((a, b) => a.ordem - b.ordem)
                    .map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nome}
                      </option>
                    ))}
                </optgroup>
              ))}
            </Select>
            <Select
              aria-label={t('produtosModulos.requerimentos.moduloDe', {
                modulo: l.moduloRequerimento,
              })}
              value={l.moduloId ?? ''}
              disabled={!modulos.length}
              onChange={(e) => alterar(l.id, { moduloId: e.target.value || null })}
              className="w-56"
            >
              <option value="">{t('produtosModulos.requerimentos.todosModulos')}</option>
              {modulos.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nome}
                </option>
              ))}
            </Select>
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-4">
      <Callout tom="info">{t('produtosModulos.requerimentos.aviso')}</Callout>
      <section className="overflow-hidden rounded-xl border border-ds-border bg-ds-bg-surface">
        <header className="flex items-center gap-1.5 border-b border-ds-border px-4 py-4 md:px-5">
          <h2 className="text-xs font-bold uppercase tracking-[0.06em]">
            {t('produtosModulos.requerimentos.titulo')}
          </h2>
          <DicaDoRotulo rotulo={t('produtosModulos.requerimentos.colunaDestino')} />
        </header>
        {erro ? (
          <div className="space-y-3 p-4">
            <Callout tom="danger" titulo={t('produtosModulos.requerimentos.erro')}>
              {t('fase3Comum.verifiqueConexao')}
            </Callout>
            <Button onClick={onTentarNovamente}>{t('fase3Comum.tentarNovamente')}</Button>
          </div>
        ) : (
          <DataTable
            rotulo={t('produtosModulos.requerimentos.titulo')}
            colunas={colunas}
            linhas={edicao}
            chaveLinha={(l) => l.id}
            carregando={carregando}
            vazio={
              <EmptyState icone={<Workflow />} titulo={t('produtosModulos.requerimentos.vazio')} />
            }
          />
        )}
      </section>

      {alteradas.length > 0 && (
        <BarraRodape>
          <span className="text-sm text-ds-fg-secondary">{t('fase3Comum.valeMesesAbertos')}</span>
          <div className="flex gap-2">
            <Button disabled={salvando} onClick={() => setEdicao(linhas)}>
              {t('fase3Comum.descartar')}
            </Button>
            <Button variante="primario" disabled={salvando} onClick={salvar}>
              {t('fase3Comum.salvar')}
            </Button>
          </div>
        </BarraRodape>
      )}
    </div>
  );
}
