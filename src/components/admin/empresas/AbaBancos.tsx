// Aba Bancos de Horas do detalhe da empresa: um cartão por banco, na ordem de prioridade da
// classificação das horas. O Banco padrão também entra na ordem (decisão de 15/10/2026).
import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowDown, ArrowUp, CheckCircle2, Clock, Pencil, Plus, XCircle } from 'lucide-react';
import { Button } from '@/components/ds/Button';
import { Callout } from '@/components/ds/Callout';
import { ConfirmDialog } from '@/components/ds/ConfirmDialog';
import { EmptyState } from '@/components/ds/EmptyState';
import { StatusBadge } from '@/components/ds/StatusBadge';
import { useDicas } from '@/components/ds/Dicas';
import { Chip, InfoDica } from '@/components/ds/Formulario';
import { atraso } from '@/components/ds/Visual';
import { cn } from '@/lib/utils';
import { mesTexto, vigente } from '@/utils/bancosTela';
import type { BancoCadastro } from '@/types/bancosHorasCadastro';
import type { Catalogo } from '@/types/catalogo';
import { usePeriodoTexto } from './periodoTexto';
import { useTextoVigencias } from './textoVigencias';

function Parametro({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  const dica = useDicas()[rotulo];
  return (
    <div className="min-w-0">
      <dt className="flex items-center gap-1 text-xs text-ds-fg-muted">
        {rotulo}
        {dica && <InfoDica texto={dica} assunto={rotulo} />}
      </dt>
      <dd className="mt-0.5 text-sm text-ds-fg">{children}</dd>
    </div>
  );
}

function CartaoBanco({
  banco,
  catalogo,
  posicao,
  primeiro,
  ultimo,
  podeEditar,
  atrasoMs,
  onSubir,
  onDescer,
  onEditar,
  onInativar,
  onReativar,
}: {
  banco: BancoCadastro;
  catalogo: Catalogo;
  posicao: number;
  primeiro: boolean;
  ultimo: boolean;
  podeEditar: boolean;
  atrasoMs: number;
  onSubir: () => void;
  onDescer: () => void;
  onEditar: () => void;
  onInativar: () => void;
  onReativar: () => void;
}) {
  const { t } = useTranslation();
  const b = (chave: string, valores?: Record<string, unknown>) =>
    t(`empresasCadastro.bancos.${chave}`, valores);
  const periodoTexto = usePeriodoTexto();
  const texto = useTextoVigencias(banco);
  const nome = <T extends { id: string; nome: string }>(lista: T[], id: string | null) =>
    lista.find((x) => x.id === id)?.nome ?? '';

  return (
    <article
      aria-label={banco.nome}
      style={atraso(atrasoMs)}
      className={cn(
        'ds-surgir flex gap-3 rounded-xl border bg-ds-bg-surface p-4 transition duration-200 hover:shadow-[0_10px_24px_-16px_rgba(0,0,0,0.3)] md:p-5',
        banco.padrao ? 'border-dashed border-ds-border-strong' : 'border-ds-border',
        !banco.ativo && 'opacity-70'
      )}
    >
      {podeEditar ? (
        <div className="flex flex-col gap-1">
          <Button
            tamanho="icone"
            variante="fantasma"
            aria-label={b('subir', { nome: banco.nome })}
            disabled={primeiro}
            onClick={onSubir}
          >
            <ArrowUp />
          </Button>
          <Button
            tamanho="icone"
            variante="fantasma"
            aria-label={b('descer', { nome: banco.nome })}
            disabled={ultimo}
            onClick={onDescer}
          >
            <ArrowDown />
          </Button>
        </div>
      ) : (
        <span
          aria-label={b('prioridadeN', { n: posicao })}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-ds-bg-subtle text-sm font-semibold tabular-nums text-ds-fg-secondary"
        >
          {posicao}
        </span>
      )}

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-ds-title text-lg font-semibold tracking-tight text-ds-fg">
            {banco.nome}
          </h3>
          {banco.padrao && <StatusBadge tom="neutral">{b('padrao')}</StatusBadge>}
          {banco.consomeOutrosBancos && <StatusBadge tom="info">{b('consomeOutros')}</StatusBadge>}
          {banco.espelhaLegado && <StatusBadge tom="warning">{b('espelhaLegado')}</StatusBadge>}
          {!banco.ativo && <StatusBadge tom="neutral">{b('inativo')}</StatusBadge>}
        </div>
        {banco.descricao && <p className="mt-0.5 text-sm text-ds-fg-muted">{banco.descricao}</p>}

        <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 md:grid-cols-5">
          <Parametro rotulo={b('contrato')}>
            {b(`tipo.${banco.tipoContrato}`)} · {periodoTexto(banco.periodoApuracao)}
          </Parametro>
          <Parametro rotulo={b('vigencia')}>
            {banco.fimVigencia
              ? b('vigenciaDe', {
                  inicio: mesTexto(banco.inicioVigencia),
                  fim: mesTexto(banco.fimVigencia),
                })
              : b('vigenciaDesde', { inicio: mesTexto(banco.inicioVigencia) })}
          </Parametro>
          <Parametro rotulo={b('baseline')}>
            <span className="tabular-nums">{texto.baseline(vigente(banco.baselines))}</span>
          </Parametro>
          <Parametro rotulo={b('repasse')}>
            <span className="tabular-nums">{texto.repasse(vigente(banco.repasses))}</span>
          </Parametro>
          <Parametro rotulo={b('excedente')}>
            {b(`taxa.${banco.taxaProduto}`)} · {b(`hora.${banco.taxaTipoHora}`)}
          </Parametro>
        </dl>

        <div className="mt-4 flex flex-wrap gap-1.5">
          {banco.padrao ? (
            <Chip tracejado>{b('recebeResto')}</Chip>
          ) : (
            banco.escopo.map((e) => (
              <Chip key={`${e.produtoId}|${e.moduloId ?? '*'}`}>
                {e.moduloId
                  ? b('produtoModulo', {
                      produto: nome(catalogo.produtos, e.produtoId),
                      modulo: nome(catalogo.modulos, e.moduloId),
                    })
                  : b('produtoInteiro', { produto: nome(catalogo.produtos, e.produtoId) })}
              </Chip>
            ))
          )}
          {banco.filtroIc && (
            <Chip>
              {b('filtroIc', {
                operador: b(`operador.${banco.filtroIc.operador}`),
                valor: banco.filtroIc.valor,
              })}
            </Chip>
          )}
        </div>
      </div>

      {podeEditar && (
        <div className="flex shrink-0 flex-col items-end gap-1 sm:flex-row sm:items-start">
          <Button
            tamanho="sm"
            onClick={onEditar}
            aria-label={b('editarBanco', { nome: banco.nome })}
          >
            <Pencil /> <span className="hidden sm:inline">{b('editar')}</span>
          </Button>
          {banco.ativo ? (
            <Button
              tamanho="sm"
              variante="fantasma"
              aria-label={b('inativar', { nome: banco.nome })}
              disabled={banco.padrao}
              title={banco.padrao ? b('padraoNaoInativa') : undefined}
              onClick={onInativar}
              className="text-ds-danger-fg hover:bg-ds-danger-bg"
            >
              <XCircle />
            </Button>
          ) : (
            <Button
              tamanho="sm"
              variante="fantasma"
              aria-label={b('reativar', { nome: banco.nome })}
              onClick={onReativar}
            >
              <CheckCircle2 />
            </Button>
          )}
        </div>
      )}
    </article>
  );
}

export function AbaBancos({
  bancos,
  catalogo,
  carregando,
  erro,
  podeEditar,
  onNovo,
  onEditar,
  onReordenar,
  onInativar,
  onReativar,
  onTentarNovamente,
}: {
  bancos: BancoCadastro[];
  catalogo: Catalogo;
  carregando: boolean;
  erro: Error | null;
  podeEditar: boolean;
  onNovo: () => void;
  onEditar: (b: BancoCadastro) => void;
  onReordenar: (ids: string[]) => Promise<void>;
  onInativar: (b: BancoCadastro, motivo: string) => Promise<void>;
  onReativar: (b: BancoCadastro) => Promise<void>;
  onTentarNovamente: () => void;
}) {
  const { t } = useTranslation();
  const b = (chave: string, valores?: Record<string, unknown>) =>
    t(`empresasCadastro.bancos.${chave}`, valores);
  const [inativar, setInativar] = useState<BancoCadastro | null>(null);
  const [reativar, setReativar] = useState<BancoCadastro | null>(null);
  const [processando, setProcessando] = useState(false);

  const mover = (i: number, delta: number) => {
    const ids = bancos.map((x) => x.id);
    [ids[i], ids[i + delta]] = [ids[i + delta], ids[i]];
    onReordenar(ids);
  };
  const executar = async (acao: () => Promise<void>, fechar: () => void) => {
    setProcessando(true);
    try {
      await acao();
      fechar();
    } finally {
      setProcessando(false);
    }
  };

  if (erro)
    return (
      <div className="space-y-3 rounded-xl border border-ds-border bg-ds-bg-surface p-4">
        <Callout tom="danger" titulo={b('erro')}>
          {t('fase3Comum.verifiqueConexao')}
        </Callout>
        <Button onClick={onTentarNovamente}>{t('fase3Comum.tentarNovamente')}</Button>
      </div>
    );
  if (carregando)
    return (
      <div className="space-y-3" role="status" aria-label={b('carregando')}>
        {[0, 1].map((i) => (
          <div key={i} className="h-40 animate-pulse rounded-xl bg-ds-bg-surface" />
        ))}
      </div>
    );
  if (!bancos.length)
    return (
      <div className="rounded-xl border border-ds-border bg-ds-bg-surface">
        <EmptyState
          icone={<Clock />}
          titulo={b('vazioTitulo')}
          descricao={podeEditar ? b('vazioDescricao') : undefined}
          acao={
            podeEditar ? (
              <Button variante="primario" onClick={onNovo}>
                <Plus /> {t('empresasCadastro.edicaoBanco.novoPadrao')}
              </Button>
            ) : undefined
          }
        />
      </div>
    );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-ds-fg-muted">{b('prioridade')}</p>
        {podeEditar && (
          <Button variante="primario" onClick={onNovo}>
            <Plus /> {b('novo')}
          </Button>
        )}
      </div>

      {bancos.map((banco, i) => (
        <CartaoBanco
          key={banco.id}
          banco={banco}
          catalogo={catalogo}
          posicao={i + 1}
          primeiro={i === 0}
          ultimo={i === bancos.length - 1}
          podeEditar={podeEditar}
          atrasoMs={i * 70}
          onSubir={() => mover(i, -1)}
          onDescer={() => mover(i, 1)}
          onEditar={() => onEditar(banco)}
          onInativar={() => setInativar(banco)}
          onReativar={() => setReativar(banco)}
        />
      ))}

      <ConfirmDialog
        aberto={!!inativar}
        onOpenChange={(v) => !v && setInativar(null)}
        titulo={b('inativarTitulo', { nome: inativar?.nome ?? '' })}
        consequencias={[b('inativarHoras'), b('mesesFechados')]}
        rotuloConfirmar={t('fase3Comum.inativar')}
        tom="perigo"
        justificativa={{ rotulo: b('motivo'), placeholder: b('motivoPlaceholder') }}
        processando={processando}
        onConfirmar={(motivo) =>
          inativar &&
          executar(
            () => onInativar(inativar, motivo ?? ''),
            () => setInativar(null)
          )
        }
      />
      <ConfirmDialog
        aberto={!!reativar}
        onOpenChange={(v) => !v && setReativar(null)}
        titulo={b('reativarTitulo', { nome: reativar?.nome ?? '' })}
        consequencias={[b('reativarHoras'), b('mesesFechados')]}
        rotuloConfirmar={t('fase3Comum.reativar')}
        processando={processando}
        onConfirmar={() =>
          reativar &&
          executar(
            () => onReativar(reativar),
            () => setReativar(null)
          )
        }
      />
    </div>
  );
}
