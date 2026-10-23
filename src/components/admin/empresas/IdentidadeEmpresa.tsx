// Identidade da empresa no detalhe. Na transição (Fases 3 a 5) vem da tela atual só para
// leitura; aqui só AMS e projetos por solução são editados.
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ExternalLink, FolderKanban, Paperclip, Pencil } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ds/Button';
import { useDicas } from '@/components/ds/Dicas';
import { InfoDica, ValorCopiavel } from '@/components/ds/Formulario';
import { formatarDia } from '@/hooks/useUltimaAlteracao';
import { TELA_ATUAL_EMPRESAS } from '@/utils/empresasTela';
import type { Anexo, EmpresaDetalhe } from '@/types/empresas';

const Vazio = () => <span className="text-ds-fg-muted">—</span>;

/** Rótulo e valor empilhados, com o "i" do rótulo */
function Item({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  const dica = useDicas()[rotulo];
  return (
    <div className="min-w-0">
      <dt className="flex items-center gap-1 text-xs text-ds-fg-muted">
        {rotulo}
        {dica && <InfoDica texto={dica} assunto={rotulo} />}
      </dt>
      <dd className="mt-0.5 break-words text-sm text-ds-fg">{children}</dd>
    </div>
  );
}

function Grupo({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <div className="min-w-0 xl:px-6 xl:first:pl-0 xl:last:pr-0">
      <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-ds-fg-secondary">
        {titulo}
      </h3>
      <dl className="space-y-3">{children}</dl>
    </div>
  );
}

/** Atalho para a tela atual, onde a identidade é mantida até a virada */
export function EditarNaTelaAtual() {
  const { t } = useTranslation();
  return (
    <Link
      to={TELA_ATUAL_EMPRESAS}
      title={t('empresasCadastro.telaAtualDica')}
      className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2 text-xs font-medium text-ds-fg-accent transition hover:bg-ds-accent-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-focus"
    >
      <ExternalLink className="h-3.5 w-3.5" /> {t('empresasCadastro.editarNaTelaAtual')}
    </Link>
  );
}

export function IdentidadeEmpresa({
  empresa,
  podeEditar,
  onEditarAms,
  onBaixarAnexo,
}: {
  empresa: EmpresaDetalhe;
  podeEditar: boolean;
  onEditarAms: () => void;
  onBaixarAnexo: (anexo: Anexo) => void;
}) {
  const { t, i18n } = useTranslation();
  const r = (chave: string) => t(`empresasCadastro.identidade.${chave}`);
  const copiavel = (valor: string | null, rotulo: string) =>
    valor ? <ValorCopiavel valor={valor} rotulo={rotulo} /> : <Vazio />;

  return (
    <section
      className="ds-surgir relative -mt-16 rounded-xl border border-ds-border bg-ds-bg-surface p-4 shadow-[0_8px_24px_-12px_rgba(0,0,0,0.2)] md:-mt-20 md:p-5"
      aria-labelledby="titulo-identidade"
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2
          id="titulo-identidade"
          className="text-xs font-bold uppercase tracking-[0.06em] text-ds-fg"
        >
          {r('titulo')}
        </h2>
        {podeEditar && (
          <div className="flex flex-wrap items-center gap-1">
            <Button tamanho="sm" variante="fantasma" onClick={onEditarAms}>
              <Pencil /> {r('amsEProjetos')}
            </Button>
            <EditarNaTelaAtual />
          </div>
        )}
      </div>
      <div className="grid gap-x-6 gap-y-6 md:grid-cols-2 xl:grid-cols-4 xl:gap-x-0 xl:divide-x xl:divide-ds-border">
        <Grupo titulo={r('grupoEmpresa')}>
          <Item rotulo={r('nomeCompleto')}>
            {copiavel(empresa.nomeCompleto, r('nomeCompleto'))}
          </Item>
          <Item rotulo={r('nomeAbreviado')}>
            {copiavel(empresa.nomeAbreviado, r('nomeAbreviado'))}
          </Item>
          <Item rotulo={r('grupoEmpresarial')}>
            {copiavel(empresa.grupoEmpresarial, r('grupoEmpresarial'))}
          </Item>
        </Grupo>

        <Grupo titulo={r('grupoContrato')}>
          <Item rotulo={r('vigencia')}>
            {empresa.vigenciaInicio ? (
              t('empresasCadastro.identidade.vigenciaAte', {
                inicio: formatarDia(empresa.vigenciaInicio, i18n.language),
                fim: empresa.vigenciaFim
                  ? formatarDia(empresa.vigenciaFim, i18n.language)
                  : r('semFim'),
              })
            ) : (
              <Vazio />
            )}
          </Item>
          <Item rotulo={r('solucoes')}>
            {empresa.solucoes.length ? (
              <ul className="mt-1 space-y-2" aria-label={r('solucoes')}>
                {empresa.solucoes.map((s) => (
                  <li key={s.id}>
                    <span className="flex flex-wrap items-center gap-1.5">
                      <span className="font-medium">{s.codigo}</span>
                      {s.temAms ? (
                        <span className="rounded-full bg-ds-accent-subtle px-1.5 text-[11px] font-medium text-ds-fg-accent">
                          {r('ams')}
                        </span>
                      ) : (
                        <span className="text-xs text-ds-fg-muted">{r('semAms')}</span>
                      )}
                      {s.emProjeto && (
                        // A justificativa aparece ao passar o mouse (ou focar) no selo
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span
                              tabIndex={0}
                              aria-label={t('empresasCadastro.identidade.emProjetoDe', {
                                justificativa: s.justificativaProjeto ?? '',
                              })}
                              className="inline-flex cursor-default items-center gap-1 rounded-full border border-ds-border bg-ds-bg-subtle px-1.5 text-[11px] text-ds-fg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-focus"
                            >
                              <FolderKanban className="h-3 w-3" aria-hidden /> {r('emProjeto')}
                            </span>
                          </TooltipTrigger>
                          <TooltipContent
                            data-ds="v2"
                            className="max-w-xs border-ds-border bg-ds-bg-raised font-ds-sans text-xs text-ds-fg"
                          >
                            {s.justificativaProjeto}
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <Vazio />
            )}
          </Item>
        </Grupo>

        <Grupo titulo={r('grupoResponsaveis')}>
          <Item rotulo={r('emailCs')}>{copiavel(empresa.emailCs, r('emailCs'))}</Item>
          <Item rotulo={r('emailComercial')}>
            {copiavel(empresa.emailComercial, r('emailComercial'))}
          </Item>
          <Item rotulo={r('emailTm')}>{copiavel(empresa.emailTm, r('emailTm'))}</Item>
        </Grupo>

        <Grupo titulo={r('grupoObservacao')}>
          <Item rotulo={r('observacao')}>{empresa.observacao || <Vazio />}</Item>
          <Item rotulo={r('anexos')}>
            {empresa.anexos.length ? (
              <span className="mt-0.5 flex flex-col gap-1">
                {empresa.anexos.map((a) => (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => onBaixarAnexo(a)}
                    aria-label={t('empresasCadastro.identidade.baixar', { nome: a.nome })}
                    className="inline-flex max-w-full items-center gap-1.5 rounded text-left text-ds-fg-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-focus"
                  >
                    <Paperclip className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    <span className="truncate">{a.nome}</span>
                  </button>
                ))}
              </span>
            ) : (
              <Vazio />
            )}
          </Item>
        </Grupo>
      </div>
    </section>
  );
}
