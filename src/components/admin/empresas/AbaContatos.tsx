// Aba Contatos do detalhe da empresa. Na transição (Fases 3 a 5) os contatos são mantidos na
// tela atual e chegam aqui só para leitura.
import { useTranslation } from 'react-i18next';
import { Star } from 'lucide-react';
import { Card } from '@/components/ds/Card';
import { DataTable, type ColunaTabela } from '@/components/ds/DataTable';
import { StatusBadge } from '@/components/ds/StatusBadge';
import type { Contato } from '@/types/empresas';
import { EditarNaTelaAtual } from './IdentidadeEmpresa';

export function AbaContatos({
  empresaId,
  contatos,
  podeEditar,
}: {
  empresaId: string;
  contatos: Contato[];
  podeEditar: boolean;
}) {
  const { t } = useTranslation();
  const c = (chave: string) => t(`empresasCadastro.contatos.${chave}`);
  const colunas: ColunaTabela<Contato>[] = [
    {
      id: 'contato',
      cabecalho: c('colunaContato'),
      mobile: 'titulo',
      celula: (x) => (
        <div className="flex items-center gap-2">
          {x.principal && (
            <Star
              className="h-4 w-4 shrink-0 fill-[#00D4E8] text-[#00D4E8]"
              aria-label={c('principal')}
            />
          )}
          <div className="min-w-0">
            <p className="font-medium">{x.nome}</p>
            <p className="text-xs text-ds-fg-muted">{x.email}</p>
          </div>
        </div>
      ),
    },
    { id: 'recebe', cabecalho: c('colunaRecebe'), celula: (x) => x.finalidade },
    {
      id: 'situacao',
      cabecalho: c('colunaSituacao'),
      celula: (x) =>
        x.ativo ? (
          <StatusBadge tom="success">{t('fase3Comum.ativo')}</StatusBadge>
        ) : (
          <StatusBadge tom="neutral">{t('fase3Comum.inativo')}</StatusBadge>
        ),
    },
  ];
  return (
    <Card
      semPadding
      titulo={c('titulo')}
      acoes={podeEditar ? <EditarNaTelaAtual empresaId={empresaId} /> : undefined}
    >
      <DataTable
        rotulo={c('titulo')}
        colunas={colunas}
        linhas={contatos}
        chaveLinha={(x) => x.id}
        vazio={<p className="px-4 py-6 text-sm text-ds-fg-muted md:px-5">{c('nenhum')}</p>}
      />
    </Card>
  );
}
