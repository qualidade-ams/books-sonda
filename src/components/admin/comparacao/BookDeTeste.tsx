// Book de teste da liberação (Fase 5, P7): a seção de consumo por banco como sairia no Book,
// calculada agora pelo modelo novo, sem fechar o mês nem gravar nada.
import { useTranslation } from 'react-i18next';
import { SearchX } from 'lucide-react';
import { TelaEdicao } from '@/components/ds/Formulario';
import { Callout } from '@/components/ds/Callout';
import { Button } from '@/components/ds/Button';
import { EmptyState } from '@/components/ds/EmptyState';
import BookConsumoBancos from '@/components/admin/books/BookConsumoBancos';
import { useBookDeTeste } from '@/hooks/useComparacao';
import { rotuloMesLocal } from '@/utils/controleTela';
import type { MesAno } from '@/services/bancosHoras/calculo';

export function BookDeTeste({
  empresaId,
  empresa,
  mes,
  onFechar,
}: {
  empresaId: string;
  empresa: string;
  mes: MesAno;
  onFechar: () => void;
}) {
  const { t, i18n } = useTranslation();
  const a = (chave: string, valores?: Record<string, unknown>) =>
    t(`comparacaoBancosHoras.bookTeste.${chave}`, valores);
  const { bancos, isLoading, error, recarregar } = useBookDeTeste(empresaId, mes);

  const conteudo = () => {
    if (error)
      return (
        <div className="space-y-3">
          <Callout tom="danger" titulo={a('erro')}>
            {t('fase3Comum.verifiqueConexao')}
          </Callout>
          <Button onClick={() => recarregar()}>{t('fase3Comum.tentarNovamente')}</Button>
        </div>
      );
    if (isLoading)
      return (
        <div className="space-y-4" aria-busy aria-label={a('carregando')}>
          <div className="h-64 animate-pulse rounded-lg bg-ds-bg-subtle" />
          <div className="h-64 animate-pulse rounded-lg bg-ds-bg-subtle" />
        </div>
      );
    if (bancos.length === 0) return <EmptyState icone={<SearchX />} titulo={a('vazio')} />;
    return (
      <div className="space-y-6">
        {bancos.map((banco) => (
          <div key={banco.banco_id} className="overflow-x-auto rounded-lg bg-white">
            <BookConsumoBancos banco={banco} empresaDoBook={empresaId} />
          </div>
        ))}
      </div>
    );
  };

  return (
    <TelaEdicao
      voltarPara={a('voltar')}
      titulo={empresa}
      subtitulo={a('subtitulo', { mes: rotuloMesLocal(mes, i18n.language) })}
      onFechar={onFechar}
    >
      <div className="space-y-4 px-4 py-5 md:px-6">
        <Callout tom="info">{a('aviso')}</Callout>
        {conteudo()}
      </div>
    </TelaEdicao>
  );
}
