// Aba Requerimentos do Controle: os requerimentos da empresa no período, com o banco que recebe
// cada um. A troca de banco fica como rascunho na tela e é salva na barra, com um motivo só.
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FileSpreadsheet } from 'lucide-react';
import { DataTable, type ColunaTabela } from '@/components/ds/DataTable';
import { StatusBadge } from '@/components/ds/StatusBadge';
import { EmptyState } from '@/components/ds/EmptyState';
import { Callout } from '@/components/ds/Callout';
import { Button } from '@/components/ds/Button';
import { ConfirmDialog } from '@/components/ds/ConfirmDialog';
import { Select } from '@/components/ds/Select';
import { HoursValue } from '@/components/ds/HoursValue';
import { FiltroAlternar } from '@/components/ds/Filtros';
import { Ajuda, BarraRodape } from '@/components/ds/Formulario';
import { formatarDataHora } from '@/hooks/useUltimaAlteracao';
import { useNomesUsuarios } from '@/hooks/useNomesUsuarios';
import { chaveMes } from '@/services/controleBancoHorasService';
import { rotuloMesLocal } from '@/utils/controleTela';
import { plural } from '@/utils/plural';
import type { RequerimentoControle } from '@/types/controleBancoHoras';

export function AbaRequerimentos({
  requerimentos,
  bancos,
  bancoAtualId,
  carregando,
  erro,
  podeEditar,
  escolhas,
  onEscolher,
  onTentarNovamente,
}: {
  requerimentos: RequerimentoControle[];
  /** Bancos ativos da empresa, para a troca */
  bancos: { bancoId: string; nome: string }[];
  bancoAtualId: string;
  carregando: boolean;
  erro: Error | null;
  podeEditar: boolean;
  /** Banco escolhido por requerimento, ainda não salvo */
  escolhas: Record<string, string>;
  onEscolher: (requerimentoId: string, bancoId: string) => void;
  onTentarNovamente: () => void;
}) {
  const { t, i18n } = useTranslation();
  const r = (chave: string, valores?: Record<string, unknown>) =>
    t(`controleBancoHoras.requerimentos.${chave}`, valores);
  const nomes = useNomesUsuarios(requerimentos.map((x) => x.ajuste?.atualizadoPor ?? null));
  const [soDeste, setSoDeste] = useState(true);
  // O filtro olha o banco gravado: a linha trocada não some antes de salvar
  const linhas = soDeste ? requerimentos.filter((x) => x.bancoId === bancoAtualId) : requerimentos;
  const nomeDoBanco = (id: string | null) => bancos.find((b) => b.bancoId === id)?.nome;

  const colunas: ColunaTabela<RequerimentoControle>[] = [
    {
      id: 'requerimento',
      cabecalho: r('colunaRequerimento'),
      mobile: 'titulo',
      celula: (x) => (
        <div className="min-w-0">
          <p className="font-semibold">{x.chamado}</p>
          <p className="truncate text-xs text-ds-fg-muted">{x.titulo}</p>
        </div>
      ),
    },
    { id: 'modulo', cabecalho: r('colunaModulo'), celula: (x) => x.modulo },
    {
      id: 'cobranca',
      cabecalho: r('colunaCobranca'),
      celula: (x) => rotuloMesLocal(x.mes, i18n.language),
    },
    {
      id: 'situacao',
      cabecalho: r('colunaSituacao'),
      celula: (x) =>
        x.situacao === 'enviado' ? (
          <StatusBadge tom="success">{r('enviado')}</StatusBadge>
        ) : (
          <span className="flex flex-col items-start gap-0.5">
            <StatusBadge>{r('desenvolvimento')}</StatusBadge>
            <span className="text-[11px] text-ds-fg-muted">{r('naoConsome')}</span>
          </span>
        ),
    },
    {
      id: 'horas',
      cabecalho: r('colunaHoras'),
      alinhar: 'direita',
      celula: (x) => <HoursValue minutos={x.minutos} className="font-medium" />,
    },
    {
      id: 'banco',
      cabecalho: r('colunaBanco'),
      celula: (x) => {
        const valor = escolhas[x.id] ?? x.bancoId ?? '';
        return podeEditar ? (
          <Select
            aria-label={r('bancoDe', { chamado: x.chamado })}
            value={valor}
            className="w-full min-w-[11rem]"
            onChange={(e) => onEscolher(x.id, e.target.value)}
          >
            {!valor && <option value="">{r('semBanco')}</option>}
            {bancos.map((b) => (
              <option key={b.bancoId} value={b.bancoId}>
                {b.nome}
              </option>
            ))}
          </Select>
        ) : (
          (nomeDoBanco(x.bancoId) ?? r('semBanco'))
        );
      },
    },
    {
      id: 'classificacao',
      cabecalho: r('colunaClassificacao'),
      celula: (x) =>
        escolhas[x.id] !== undefined && escolhas[x.id] !== x.bancoId ? (
          <StatusBadge tom="warning">{r('alterado')}</StatusBadge>
        ) : x.ajuste ? (
          <span className="flex flex-col items-start gap-0.5">
            <StatusBadge tom="warning">{r('ajustada')}</StatusBadge>
            <span className="text-[11px] text-ds-fg-muted">
              {[
                x.ajuste.atualizadoPor && nomes[x.ajuste.atualizadoPor],
                formatarDataHora(x.ajuste.atualizadoEm, i18n.language),
              ]
                .filter(Boolean)
                .join(' · ')}
            </span>
            <span className="text-[11px] text-ds-fg-muted">{x.ajuste.motivo}</span>
          </span>
        ) : (
          <StatusBadge tom="info">{r('peloModulo')}</StatusBadge>
        ),
    },
  ];

  if (erro)
    return (
      <div className="space-y-3 rounded-xl border border-ds-border bg-ds-bg-surface p-4">
        <Callout tom="danger" titulo={r('erro')}>
          {t('fase3Comum.verifiqueConexao')}
        </Callout>
        <Button onClick={onTentarNovamente}>{t('fase3Comum.tentarNovamente')}</Button>
      </div>
    );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <FiltroAlternar rotulo={r('soDeste')} ativo={soDeste} onChange={setSoDeste} />
        <Ajuda>{r('origemBanco')}</Ajuda>
      </div>
      <div className="ds-surgir overflow-hidden rounded-xl border border-ds-border bg-ds-bg-surface">
        <DataTable
          rotulo={r('rotulo')}
          colunas={colunas}
          linhas={linhas}
          chaveLinha={(x) => `${x.id}-${chaveMes(x.mes)}`}
          carregando={carregando}
          vazio={
            <EmptyState
              icone={<FileSpreadsheet />}
              titulo={soDeste ? r('vazio') : r('vazioTodos')}
            />
          }
        />
      </div>
    </div>
  );
}

/** Barra das trocas de banco ainda não salvas; o motivo é pedido uma vez, no salvar */
export function BarraAjustesRequerimentos({
  quantidade,
  onDescartar,
  onSalvar,
}: {
  quantidade: number;
  onDescartar: () => void;
  onSalvar: (motivo: string) => Promise<void>;
}) {
  const { t } = useTranslation();
  const r = (chave: string) => t(`controleBancoHoras.requerimentos.${chave}`);
  const [confirmando, setConfirmando] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const salvar = async (motivo?: string) => {
    setSalvando(true);
    try {
      await onSalvar(motivo ?? '');
      setConfirmando(false);
    } finally {
      setSalvando(false);
    }
  };

  return (
    <BarraRodape>
      <span className="text-sm text-ds-fg-secondary">
        <span className="font-medium text-ds-fg">
          {plural(t, 'controleBancoHoras.requerimentos.alterados', quantidade)}
        </span>{' '}
        · {r('valeProximo')}
      </span>
      <div className="flex gap-2">
        <Button onClick={onDescartar}>{t('fase3Comum.descartar')}</Button>
        <Button variante="primario" onClick={() => setConfirmando(true)}>
          {t('fase3Comum.salvar')}
        </Button>
      </div>
      <ConfirmDialog
        aberto={confirmando}
        onOpenChange={setConfirmando}
        titulo={r('salvarTitulo')}
        consequencias={[r('motivoTodos')]}
        rotuloConfirmar={t('fase3Comum.salvar')}
        justificativa={{ rotulo: r('motivo'), placeholder: r('motivoPlaceholder') }}
        processando={salvando}
        onConfirmar={salvar}
      />
    </BarraRodape>
  );
}
