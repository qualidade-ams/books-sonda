// Aba Observações do Controle: as observações do banco no período. Só as manuais são escritas,
// editadas e excluídas aqui; as de reajuste e as automáticas mudam com o reajuste ou o recálculo.
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MessageSquare, MoreHorizontal, Pencil, Plus, Trash2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { StatusBadge } from '@/components/ds/StatusBadge';
import { EmptyState } from '@/components/ds/EmptyState';
import { Callout } from '@/components/ds/Callout';
import { Button } from '@/components/ds/Button';
import { ConfirmDialog } from '@/components/ds/ConfirmDialog';
import { Select } from '@/components/ds/Select';
import { Ajuda, Rotulo } from '@/components/ds/Formulario';
import { areaTexto, itemMenu } from '@/components/ds/estilos';
import { cn } from '@/lib/utils';
import { formatarDataHora } from '@/hooks/useUltimaAlteracao';
import { useNomesUsuarios } from '@/hooks/useNomesUsuarios';
import { indiceReferencia, rotuloMesLocal, type MesDoQuadro } from '@/utils/controleTela';
import type { MesAno } from '@/services/bancosHoras/calculo';
import type { ObservacaoControle } from '@/types/controleBancoHoras';

const LIMITE = 700;
const ordem = (m: MesAno) => m.ano * 12 + m.mes;

interface Rascunho {
  id?: string;
  chave: string;
  texto: string;
}

export function AbaObservacoes({
  observacoes,
  meses,
  carregando,
  erro,
  podeEditar,
  onSalvar,
  onExcluir,
  onTentarNovamente,
}: {
  observacoes: ObservacaoControle[];
  meses: MesDoQuadro[];
  carregando: boolean;
  erro: Error | null;
  podeEditar: boolean;
  /** Sem id, observação nova */
  onSalvar: (input: { id?: string; mes: MesAno; texto: string }) => Promise<void>;
  onExcluir: (o: ObservacaoControle) => Promise<void>;
  onTentarNovamente: () => void;
}) {
  const { t, i18n } = useTranslation();
  const o = (chave: string, valores?: Record<string, unknown>) =>
    t(`controleBancoHoras.observacoes.${chave}`, valores);
  const rotulo = (m: MesAno) => rotuloMesLocal(m, i18n.language);
  const nomes = useNomesUsuarios(observacoes.map((x) => x.criadoPor));
  const [rascunho, setRascunho] = useState<Rascunho | null>(null);
  const [excluir, setExcluir] = useState<ObservacaoControle | null>(null);
  const [processando, setProcessando] = useState(false);

  // Observação só em mês já iniciado
  const iniciados = meses.filter((m) => m.situacao !== 'futuro');
  const lista = [...observacoes].sort(
    (a, b) => ordem(b.mes) - ordem(a.mes) || b.criadoEm.localeCompare(a.criadoEm)
  );
  const escolhido = rascunho && meses.find((m) => m.chave === rascunho.chave);

  const salvar = async () => {
    if (!rascunho || !escolhido || !rascunho.texto.trim()) return;
    setProcessando(true);
    try {
      await onSalvar({
        ...(rascunho.id ? { id: rascunho.id } : {}),
        mes: escolhido.mes,
        texto: rascunho.texto.trim(),
      });
      setRascunho(null);
    } finally {
      setProcessando(false);
    }
  };

  const confirmarExclusao = async () => {
    if (!excluir) return;
    setProcessando(true);
    try {
      await onExcluir(excluir);
      setExcluir(null);
    } finally {
      setProcessando(false);
    }
  };

  if (erro)
    return (
      <div className="space-y-3 rounded-xl border border-ds-border bg-ds-bg-surface p-4">
        <Callout tom="danger" titulo={o('erro')}>
          {t('fase3Comum.verifiqueConexao')}
        </Callout>
        <Button onClick={onTentarNovamente}>{t('fase3Comum.tentarNovamente')}</Button>
      </div>
    );

  return (
    <div className="space-y-3">
      {podeEditar && !rascunho && iniciados.length > 0 && (
        <div className="flex justify-end">
          <Button
            variante="primario"
            onClick={() =>
              setRascunho({ chave: meses[indiceReferencia(meses)]?.chave ?? '', texto: '' })
            }
          >
            <Plus /> {o('nova')}
          </Button>
        </div>
      )}
      {rascunho && (
        <div className="ds-surgir space-y-3 rounded-xl border border-[#00D4E8] bg-ds-bg-surface p-4">
          <div className="sm:w-1/3">
            <Rotulo htmlFor="mes-observacao">{o('mes')}</Rotulo>
            <Select
              id="mes-observacao"
              value={rascunho.chave}
              onChange={(e) => setRascunho({ ...rascunho, chave: e.target.value })}
              className="w-full"
            >
              {iniciados.map((m) => (
                <option key={m.chave} value={m.chave}>
                  {rotulo(m.mes)}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Rotulo obrigatorio htmlFor="texto-observacao">
              {o('texto')}
            </Rotulo>
            <textarea
              id="texto-observacao"
              autoFocus
              rows={3}
              maxLength={LIMITE}
              value={rascunho.texto}
              onChange={(e) => setRascunho({ ...rascunho, texto: e.target.value })}
              className={areaTexto}
            />
            <p className="mt-1 text-right text-xs tabular-nums text-ds-fg-muted">
              {rascunho.texto.length}/{LIMITE}
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <Button onClick={() => setRascunho(null)}>{o('cancelar')}</Button>
            <Button
              variante="primario"
              disabled={!rascunho.texto.trim() || !escolhido || processando}
              onClick={salvar}
            >
              {t('fase3Comum.salvar')}
            </Button>
          </div>
        </div>
      )}
      {carregando ? (
        <div
          className="h-40 animate-pulse rounded-xl bg-ds-bg-surface"
          role="status"
          aria-label={t('controleBancoHoras.carregando')}
        />
      ) : lista.length === 0 ? (
        <div className="rounded-xl border border-ds-border bg-ds-bg-surface">
          <EmptyState icone={<MessageSquare />} titulo={o('vazio')} />
        </div>
      ) : (
        <ul className="space-y-2" aria-label={o('rotulo')}>
          {lista.map((x) => (
            <li
              key={x.id}
              className="ds-surgir rounded-xl border border-ds-border bg-ds-bg-surface px-4 py-3"
            >
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 text-xs text-ds-fg-muted">
                    <StatusBadge tom={x.origem === 'manual' ? 'neutral' : 'info'}>
                      {o(`origem.${x.origem}`)}
                    </StatusBadge>
                    <span className="font-medium text-ds-fg">{rotulo(x.mes)}</span>
                    <span>
                      {[
                        x.criadoPor && nomes[x.criadoPor],
                        formatarDataHora(x.criadoEm, i18n.language),
                        x.editada && o('editada'),
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </span>
                  </p>
                  <p className="mt-1.5 whitespace-pre-line text-sm">{x.texto}</p>
                </div>
                {podeEditar && x.origem === 'manual' && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        tamanho="icone"
                        variante="fantasma"
                        aria-label={o('acoesDe', { mes: rotulo(x.mes) })}
                      >
                        <MoreHorizontal />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      data-ds="v2"
                      align="end"
                      className="min-w-40 border-ds-border bg-ds-bg-raised p-1 font-ds-sans text-ds-fg"
                    >
                      <DropdownMenuItem
                        className={itemMenu}
                        onSelect={() =>
                          setRascunho({
                            id: x.id,
                            chave: meses.find((m) => ordem(m.mes) === ordem(x.mes))?.chave ?? '',
                            texto: x.texto,
                          })
                        }
                      >
                        <Pencil className="h-4 w-4" /> {t('fase3Comum.editar')}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className={cn(itemMenu, 'text-ds-danger-fg focus:bg-ds-danger-bg')}
                        onSelect={() => setExcluir(x)}
                      >
                        <Trash2 className="h-4 w-4" /> {o('excluir')}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      {podeEditar && lista.some((x) => x.origem !== 'manual') && (
        <Ajuda>{o('somenteManuais')}</Ajuda>
      )}
      <ConfirmDialog
        aberto={!!excluir}
        onOpenChange={(v) => !v && setExcluir(null)}
        titulo={o('excluirTitulo')}
        descricao={excluir ? `${rotulo(excluir.mes)}: ${excluir.texto}` : undefined}
        consequencias={[o('excluirAuditoria')]}
        rotuloConfirmar={o('excluir')}
        tom="perigo"
        processando={processando}
        onConfirmar={confirmarExclusao}
      />
    </div>
  );
}
