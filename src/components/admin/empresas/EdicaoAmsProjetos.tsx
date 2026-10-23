// Transição: as soluções contratadas vêm da tela atual (COMEX; FISCAL e GALLERY viram FISCAIS),
// mas AMS e Em projeto por solução já são ajustados aqui (decisão de 21/10/2026).
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pencil } from 'lucide-react';
import { Callout } from '@/components/ds/Callout';
import { ConfirmDialog } from '@/components/ds/ConfirmDialog';
import { ChaveCompacta, Rotulo, Secao, TelaEdicao } from '@/components/ds/Formulario';
import type { EmpresaDetalhe, SolucaoAmsInput } from '@/types/empresas';

const LIMITE_JUSTIFICATIVA = 200;

export function EdicaoAmsProjetos({
  empresa,
  onFechar,
  onSalvar,
}: {
  empresa: Pick<EmpresaDetalhe, 'nomeAbreviado' | 'solucoes'>;
  onFechar: () => void;
  /** Sem tratar o erro aqui: o aviso vem do hook e a tela continua aberta */
  onSalvar: (solucoes: SolucaoAmsInput[]) => Promise<void>;
}) {
  const { t } = useTranslation();
  const [solucoes, setSolucoes] = useState<SolucaoAmsInput[]>(
    empresa.solucoes.map((s) => ({
      id: s.id,
      temAms: s.temAms,
      emProjeto: s.emProjeto,
      justificativaProjeto: s.justificativaProjeto,
    }))
  );
  /** Solução cuja justificativa está sendo escrita, com o texto em edição */
  const [projeto, setProjeto] = useState<{ id: string; texto: string; editando: boolean } | null>(
    null
  );
  const [salvando, setSalvando] = useState(false);

  const codigoDe = (id: string) => empresa.solucoes.find((s) => s.id === id)?.codigo ?? '';
  const alterar = (id: string, mudanca: Partial<SolucaoAmsInput>) =>
    setSolucoes((ss) => ss.map((s) => (s.id === id ? { ...s, ...mudanca } : s)));
  const inicialComAms = empresa.solucoes.some((s) => s.temAms);
  const semAms = !solucoes.some((s) => s.temAms);

  const salvar = async () => {
    setSalvando(true);
    try {
      await onSalvar(solucoes);
      onFechar();
    } finally {
      setSalvando(false);
    }
  };

  return (
    <TelaEdicao
      voltarPara={empresa.nomeAbreviado}
      titulo={t('empresasCadastro.ams.titulo')}
      subtitulo={t('empresasCadastro.ams.subtitulo')}
      podeSalvar={!salvando}
      onFechar={onFechar}
      onSalvar={salvar}
    >
      <Secao titulo={t('empresasCadastro.ams.secao')}>
        <div className="space-y-3">
          <Rotulo>{t('empresasCadastro.identidade.solucoes')}</Rotulo>
          {solucoes.length ? (
            <ul
              aria-label={t('empresasCadastro.identidade.solucoes')}
              className="divide-y divide-ds-border rounded-lg border border-ds-border"
            >
              {solucoes.map((s) => {
                const codigo = codigoDe(s.id);
                return (
                  <li
                    key={s.id}
                    className="grid min-h-12 grid-cols-2 items-center gap-x-3 gap-y-2 px-3 py-2 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]"
                  >
                    <span className="col-span-2 py-1 text-sm font-medium sm:col-span-1">
                      {codigo}
                    </span>
                    <span className="flex items-center gap-2 text-sm text-ds-fg-secondary sm:justify-self-center">
                      {t('empresasCadastro.identidade.ams')}
                      <ChaveCompacta
                        ligado={s.temAms}
                        rotulo={t('empresasCadastro.ams.amsEm', { solucao: codigo })}
                        onClick={() => alterar(s.id, { temAms: !s.temAms })}
                      />
                    </span>
                    <span className="flex items-center gap-2 justify-self-end text-sm text-ds-fg-secondary">
                      {t('empresasCadastro.identidade.emProjeto')}
                      <ChaveCompacta
                        ligado={s.emProjeto}
                        rotulo={t('empresasCadastro.ams.projetoDe', { solucao: codigo })}
                        onClick={() =>
                          s.emProjeto
                            ? alterar(s.id, { emProjeto: false, justificativaProjeto: null })
                            : setProjeto({ id: s.id, texto: '', editando: false })
                        }
                      />
                    </span>
                    {s.emProjeto && (
                      <div className="col-span-full -mt-1 flex items-start gap-1.5 pl-5 text-xs text-ds-fg-muted">
                        <button
                          type="button"
                          onClick={() =>
                            setProjeto({
                              id: s.id,
                              texto: s.justificativaProjeto ?? '',
                              editando: true,
                            })
                          }
                          aria-label={t('empresasCadastro.ams.editarJustificativa', {
                            solucao: codigo,
                          })}
                          className="-mt-1 grid h-6 w-6 shrink-0 place-items-center rounded text-ds-fg-accent hover:bg-ds-bg-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-focus"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <p className="min-w-0 flex-1">{s.justificativaProjeto}</p>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm text-ds-fg-muted">{t('empresasCadastro.ams.nenhumaSolucao')}</p>
          )}
          {semAms && inicialComAms && (
            <Callout tom="warning">{t('empresasCadastro.ams.semAmsAviso')}</Callout>
          )}
          <Callout tom="info">{t('empresasCadastro.ams.incluirSolucao')}</Callout>
        </div>
      </Secao>

      <ConfirmDialog
        aberto={!!projeto}
        onOpenChange={(v) => !v && setProjeto(null)}
        titulo={t('empresasCadastro.ams.projetoTitulo', {
          solucao: projeto ? codigoDe(projeto.id) : '',
        })}
        descricao={t('empresasCadastro.ams.projetoDescricao')}
        rotuloConfirmar={
          projeto?.editando ? t('ds.formulario.salvar') : t('empresasCadastro.ams.colocarEmProjeto')
        }
        confirmarDesabilitado={!projeto?.texto.trim()}
        onConfirmar={() => {
          if (!projeto) return;
          alterar(projeto.id, { emProjeto: true, justificativaProjeto: projeto.texto.trim() });
          setProjeto(null);
        }}
      >
        <div>
          <label htmlFor="justificativa-projeto" className="mb-1.5 block text-sm font-medium">
            {t('empresasCadastro.ams.justificativa')}{' '}
            <span className="text-ds-danger-fg" aria-hidden>
              *
            </span>
          </label>
          <textarea
            id="justificativa-projeto"
            aria-required
            rows={3}
            maxLength={LIMITE_JUSTIFICATIVA}
            value={projeto?.texto ?? ''}
            onChange={(e) => setProjeto((p) => (p ? { ...p, texto: e.target.value } : p))}
            placeholder={t('empresasCadastro.ams.justificativaPlaceholder')}
            className="w-full rounded-lg border border-ds-border-strong bg-ds-bg-surface px-3 py-2 text-base text-ds-fg placeholder:text-ds-fg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-focus md:text-sm"
          />
          <p className="mt-1 text-right text-xs tabular-nums text-ds-fg-muted">
            {projeto?.texto.length ?? 0}/{LIMITE_JUSTIFICATIVA}
          </p>
        </div>
      </ConfirmDialog>
    </TelaEdicao>
  );
}
