// Edição de um mapeamento do de-para (nível a mais na tela): grupo do Aranda, Grupo do Book e
// para onde vão as horas. Mudar o Grupo do Book ou o destino de um grupo existente pede confirmação.
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StatusBadge } from '@/components/ds/StatusBadge';
import { Callout } from '@/components/ds/Callout';
import { ConfirmDialog } from '@/components/ds/ConfirmDialog';
import { Ajuda, Rotulo, Secao, TelaEdicao } from '@/components/ds/Formulario';
import { campo } from '@/components/ds/estilos';
import { cn } from '@/lib/utils';
import { plural } from '@/utils/plural';
import { useUltimaAlteracao } from '@/hooks/useUltimaAlteracao';
import { classificar } from '@/services/deParaService';
import { destinoMudou, grupoJaMapeado, gruposDoBook } from '@/utils/deParaTela';
import type { Catalogo } from '@/types/catalogo';
import type {
  DestinoGrupo,
  GrupoNaoMapeado,
  MapeamentoGrupo,
  MapeamentoInput,
  UsoGrupo,
} from '@/types/dePara';
import { EscolhaDestino } from './EscolhaDestino';
import { useTextoDestino } from './textoDestino';

const VAZIO: DestinoGrupo = { solucaoId: null, produtoId: null, moduloId: null };

export function EdicaoMapeamento({
  mapeamento,
  grupoNovo,
  mapeamentos,
  catalogo,
  uso,
  onFechar,
  onSalvar,
}: {
  /** null = mapeamento novo */
  mapeamento: MapeamentoGrupo | null;
  /** Grupo vindo de "Mapear" na aba de não mapeados */
  grupoNovo?: GrupoNaoMapeado;
  mapeamentos: MapeamentoGrupo[];
  catalogo: Catalogo;
  uso: Record<string, UsoGrupo>;
  onFechar: () => void;
  /** Sem tratar o erro aqui: o aviso vem do hook e a tela continua aberta */
  onSalvar: (input: MapeamentoInput) => Promise<void>;
}) {
  const { t } = useTranslation();
  const textoDestino = useTextoDestino(catalogo);
  const ultimaAlteracao = useUltimaAlteracao(mapeamento?.atualizadoEm, mapeamento?.atualizadoPor);
  const novo = mapeamento === null;
  const [grupo, setGrupo] = useState(mapeamento?.grupoAranda ?? grupoNovo?.grupoAranda ?? '');
  const [grupoBook, setGrupoBook] = useState(mapeamento?.grupoBook ?? '');
  const [destino, setDestino] = useState<DestinoGrupo>(
    mapeamento
      ? {
          solucaoId: mapeamento.solucaoId,
          produtoId: mapeamento.produtoId,
          moduloId: mapeamento.moduloId,
        }
      : VAZIO
  );
  const [confirmar, setConfirmar] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const erroGrupo = !grupo.trim()
    ? t('fase3Comum.obrigatorio')
    : novo && grupoJaMapeado(grupo, mapeamentos)
      ? t('deParaGrupos.edicao.repetido')
      : null;
  const erroBook = !grupoBook.trim() ? t('fase3Comum.obrigatorio') : null;
  const mudouBook = !novo && grupoBook.trim() !== mapeamento.grupoBook;
  const mudouDestino = !novo && destinoMudou(mapeamento, destino);
  const usoAtual = mapeamento ? uso[mapeamento.id] : grupoNovo;
  const consumo = (usoAtual?.apontamentos ?? 0) + (usoAtual?.tickets ?? 0);
  const afetadas = mapeamento ? (uso[mapeamento.id]?.empresasMultiplos ?? []) : [];
  const classificacao = classificar(destino);

  const salvar = async () => {
    setSalvando(true);
    try {
      await onSalvar({
        ...(mapeamento ? { id: mapeamento.id } : {}),
        grupoAranda: grupo.trim(),
        grupoBook: grupoBook.trim(),
        destino,
      });
      setConfirmar(false);
      onFechar();
    } finally {
      setSalvando(false);
    }
  };

  return (
    <TelaEdicao
      voltarPara={t('deParaGrupos.titulo')}
      titulo={novo ? t('deParaGrupos.edicao.novo') : mapeamento.grupoAranda}
      subtitulo={ultimaAlteracao}
      podeSalvar={!erroGrupo && !erroBook && !salvando}
      rotuloSalvar={novo ? t('deParaGrupos.edicao.mapear') : undefined}
      onFechar={onFechar}
      onSalvar={() =>
        mudouBook || mudouDestino ? setConfirmar(true) : novo ? salvar() : onFechar()
      }
    >
      <Secao titulo={t('deParaGrupos.edicao.grupos')}>
        <div className="grid items-start gap-4 sm:grid-cols-2">
          <div>
            <Rotulo obrigatorio htmlFor="grupo-aranda">
              {t('deParaGrupos.edicao.grupoAranda')}
            </Rotulo>
            <input
              id="grupo-aranda"
              value={grupo}
              disabled={!novo}
              placeholder={t('deParaGrupos.edicao.exatamente')}
              onChange={(e) => setGrupo(e.target.value)}
              aria-invalid={!!(grupo && erroGrupo)}
              className={cn(campo, 'font-mono', grupo && erroGrupo && 'border-ds-danger-fg')}
            />
            {novo && grupo && erroGrupo && (
              <p className="mt-1.5 text-xs text-ds-danger-fg">{erroGrupo}</p>
            )}
            {!novo && <Ajuda>{t('deParaGrupos.edicao.outroGrupo')}</Ajuda>}
          </div>
          <div>
            <Rotulo obrigatorio htmlFor="grupo-book">
              {t('deParaGrupos.edicao.grupoBook')}
            </Rotulo>
            <input
              id="grupo-book"
              list="grupos-book"
              value={grupoBook}
              onChange={(e) => setGrupoBook(e.target.value)}
              aria-invalid={!novo && !!erroBook}
              className={campo}
            />
            <datalist id="grupos-book">
              {gruposDoBook(mapeamentos).map((g) => (
                <option key={g} value={g} />
              ))}
            </datalist>
            <Ajuda>{t('deParaGrupos.edicao.tabelaAtual')}</Ajuda>
          </div>
        </div>
      </Secao>

      <Secao titulo={t('deParaGrupos.edicao.paraOnde')}>
        <EscolhaDestino
          idBase="mapeamento"
          catalogo={catalogo}
          destino={destino}
          onChange={setDestino}
        />
        <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
          <StatusBadge tom={classificacao === 'modulo' ? 'info' : 'neutral'}>
            {t(`deParaGrupos.classificacao.${classificacao}`)}
          </StatusBadge>
          <span className="text-ds-fg-secondary">{textoDestino(destino)}</span>
        </div>
      </Secao>

      <Secao titulo={t('deParaGrupos.edicao.uso')}>
        <p className="text-sm">{plural(t, 'deParaGrupos.edicao.usoTexto', consumo)}</p>
        {afetadas.length > 0 && (
          <p className="mt-1 text-sm text-ds-fg-secondary">
            {t('deParaGrupos.edicao.usoEmpresas', { empresas: afetadas.join(', ') })}
          </p>
        )}
        {(mudouBook || mudouDestino) && (
          <div className="mt-4">
            <Callout tom="warning" titulo={t('deParaGrupos.edicao.impacto')}>
              <ul className="list-disc space-y-1 pl-4">
                {mudouBook && <li>{t('deParaGrupos.edicao.impactoBook')}</li>}
                {mudouDestino && <li>{t('deParaGrupos.edicao.impactoDestino')}</li>}
              </ul>
            </Callout>
          </div>
        )}
      </Secao>

      <ConfirmDialog
        aberto={confirmar}
        onOpenChange={setConfirmar}
        titulo={t('deParaGrupos.edicao.confirmarTitulo')}
        consequencias={[
          ...(mudouBook ? [t('deParaGrupos.edicao.confirmarBook')] : []),
          ...(mudouDestino
            ? [
                afetadas.length
                  ? t('deParaGrupos.edicao.confirmarMover', { empresas: afetadas.join(', ') })
                  : t('deParaGrupos.edicao.confirmarNenhuma'),
                t('deParaGrupos.edicao.mesesFechados'),
              ]
            : []),
        ]}
        rotuloConfirmar={t('ds.formulario.salvar')}
        processando={salvando}
        onConfirmar={salvar}
      />
    </TelaEdicao>
  );
}
