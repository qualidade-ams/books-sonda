// Aba Book do detalhe da empresa. Na transição (Fases 3 a 5) o Book é mantido na tela atual e
// chega aqui só para leitura; a edição nesta tela entra na virada (Fase 6).
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/ds/Card';
import { useDicas } from '@/components/ds/Dicas';
import { InfoDica } from '@/components/ds/Formulario';
import type { BookEmpresa } from '@/types/empresas';
import { EditarNaTelaAtual } from './IdentidadeEmpresa';

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

export function AbaBook({
  empresaId,
  book,
  temAms,
  nomeTemplate,
  podeEditar,
}: {
  empresaId: string;
  book: BookEmpresa;
  temAms: boolean;
  /** Nome do template padrão (resolvido pela tela); sem nome, mostra "Template personalizado" */
  nomeTemplate?: string;
  podeEditar: boolean;
}) {
  const { t } = useTranslation();
  const b = (chave: string) => t(`empresasCadastro.book.${chave}`);
  const vazio = <span className="text-ds-fg-muted">—</span>;
  const temBook = temAms && book.tipoBook !== 'nao_tem_book';
  const qualidade = temAms && book.tipoBook === 'qualidade';
  const simNao = (v: boolean) => (v ? b('sim') : b('nao'));

  return (
    <Card
      titulo={b('titulo')}
      acoes={podeEditar ? <EditarNaTelaAtual empresaId={empresaId} /> : undefined}
    >
      <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
        <Item rotulo={b('tipoBook')}>{temAms ? b(`tipo.${book.tipoBook}`) : b('semAms')}</Item>
        {temBook && (
          <>
            <Item rotulo={b('templatePadrao')}>
              {book.templatePadrao ? (nomeTemplate ?? b('templatePersonalizado')) : vazio}
            </Item>
            <Item rotulo={b('linkSharepoint')}>
              {book.linkSharepoint ? (
                <a
                  href={book.linkSharepoint}
                  target="_blank"
                  rel="noreferrer"
                  className="break-all text-ds-fg-accent hover:underline"
                >
                  {book.linkSharepoint}
                </a>
              ) : (
                vazio
              )}
            </Item>
          </>
        )}
        {qualidade && (
          <>
            <Item rotulo={b('personalizado')}>{simNao(book.bookPersonalizado)}</Item>
            <Item rotulo={b('anexo')}>{simNao(book.bookAnexo)}</Item>
            <Item rotulo={b('consolidadora')}>
              {book.consolidadora?.nomeAbreviado ?? b('nenhumaConsolidadora')}
            </Item>
          </>
        )}
        <Item rotulo={b('metaSla')}>
          {book.metaSlaPercentual !== null ? `${book.metaSlaPercentual}%` : vazio}
        </Item>
        <Item rotulo={b('minimoSla')}>{book.quantidadeMinimaChamadosSla ?? vazio}</Item>
      </dl>
    </Card>
  );
}
