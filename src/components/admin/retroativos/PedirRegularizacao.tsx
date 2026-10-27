// Pedido de regularização aos consultores (nível a mais na tela): um e-mail por consultor, com o
// texto do aviso atual. O e-mail vem do cadastro de especialistas; quem não tem é avisado e pulado.
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StatusBadge } from '@/components/ds/StatusBadge';
import { Callout } from '@/components/ds/Callout';
import { ConfirmDialog } from '@/components/ds/ConfirmDialog';
import { Ajuda, Chip, Rotulo, Secao, TelaEdicao } from '@/components/ds/Formulario';
import { campo } from '@/components/ds/estilos';
import { formatarHoras } from '@/components/ds/horas';
import { cn } from '@/lib/utils';
import { plural } from '@/utils/plural';
import { rotuloMesLocal } from '@/utils/controleTela';
import { montarEnvelopes } from '@/utils/retroativosTela';
import {
  ASSUNTO_REGULARIZACAO,
  textoRegularizacao,
} from '@/services/retroativos/emailRegularizacao';
import type { EnvelopeRegularizacao } from '@/services/retroativos/envioRegularizacao';

const EMAIL = /^[^\s@;,]+@[^\s@;,]+\.[^\s@;,]+$/;

export function PedirRegularizacao({
  itens,
  emails,
  carregandoEmails,
  onFechar,
  onEnviar,
}: {
  /** Apontamentos selecionados na lista */
  itens: (EnvelopeRegularizacao['itens'][number] & { id: string })[];
  /** E-mail de cada consultor pelo cadastro de especialistas */
  emails: Record<string, string | null>;
  carregandoEmails: boolean;
  onFechar: () => void;
  /** Sem tratar o erro aqui: o aviso vem do hook e a tela continua aberta */
  onEnviar: (input: { envelopes: EnvelopeRegularizacao[]; copia: string[] }) => Promise<void>;
}) {
  const { t, i18n } = useTranslation();
  const r = (chave: string, valores?: Record<string, unknown>) =>
    t(`apontamentosRetroativos.regularizacao.${chave}`, valores);
  const p = (chave: string, n: number) =>
    plural(t, `apontamentosRetroativos.regularizacao.${chave}`, n);

  const [copia, setCopia] = useState('');
  const [confirmando, setConfirmando] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const semConsultor = r('semConsultor');
  const envelopes = useMemo(
    () => montarEnvelopes(itens, emails, semConsultor),
    [itens, emails, semConsultor]
  );
  const comEmail = envelopes.filter((e) => e.email).length;
  const semEmail = envelopes.filter((e) => !e.email).map((e) => e.consultor);
  const emailsCopia = copia
    .split(/[;,]/)
    .map((e) => e.trim())
    .filter(Boolean);
  const copiaInvalida = emailsCopia.some((e) => !EMAIL.test(e));

  const confirmar = async () => {
    setEnviando(true);
    try {
      await onEnviar({ envelopes, copia: emailsCopia });
      setConfirmando(false);
      onFechar();
    } catch {
      // O aviso do erro vem do hook; a tela continua aberta para tentar de novo
    } finally {
      setEnviando(false);
    }
  };

  return (
    <TelaEdicao
      voltarPara={t('apontamentosRetroativos.titulo')}
      titulo={r('titulo')}
      subtitulo={r('subtitulo', {
        apontamentos: plural(t, 'apontamentosRetroativos.cartao.apontamentos', itens.length),
        consultores: p('consultores', envelopes.length),
      })}
      podeSalvar={comEmail > 0 && !copiaInvalida && !carregandoEmails}
      rotuloSalvar={p('emails', comEmail)}
      onFechar={onFechar}
      onSalvar={() => setConfirmando(true)}
    >
      <Secao titulo={r('secaoEnvio')}>
        <div className="space-y-4">
          <div>
            <Rotulo htmlFor="copia-consultores">{r('copia')}</Rotulo>
            <input
              id="copia-consultores"
              value={copia}
              onChange={(e) => setCopia(e.target.value)}
              placeholder={r('copiaPlaceholder')}
              className={campo}
            />
            {copiaInvalida && (
              <p className="mt-1 text-xs text-ds-danger-fg">{r('emailInvalido')}</p>
            )}
          </div>
          {!carregandoEmails && semEmail.length > 0 && (
            <Callout tom="warning" titulo={p('semEmailTitulo', semEmail.length)}>
              {r('semEmailTexto', { nomes: semEmail.join(', ') })}
            </Callout>
          )}
        </div>
      </Secao>

      <Secao titulo={r('secaoMensagem')}>
        {carregandoEmails ? (
          <div
            className="h-40 animate-pulse rounded-lg bg-ds-bg-subtle"
            role="status"
            aria-label={r('carregandoEmails')}
          />
        ) : (
          <div className="space-y-3">
            {envelopes.map((env) => (
              <div
                key={env.consultor}
                className={cn(
                  'rounded-lg border p-3',
                  env.email
                    ? 'border-ds-border'
                    : 'border-dashed border-ds-border-strong opacity-70'
                )}
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-semibold">{env.consultor}</span>
                  {env.email ? (
                    <Chip>{env.email}</Chip>
                  ) : (
                    <StatusBadge tom="warning">{r('semEmail')}</StatusBadge>
                  )}
                </div>
                <p className="mt-2 text-sm text-ds-fg-secondary">
                  {r('assunto')}: <span className="text-ds-fg">{ASSUNTO_REGULARIZACAO}</span>
                </p>
                <p className="mt-1 max-h-40 overflow-y-auto whitespace-pre-line text-sm text-ds-fg-secondary">
                  {textoRegularizacao(env.consultor, env.itens.length)}
                </p>
                <ul className="mt-2 space-y-0.5 text-sm">
                  {env.itens.map((i) => (
                    <li key={`${i.retroativoId}-${i.itemId}`} className="tabular-nums">
                      {[
                        i.empresa,
                        i.chamado,
                        i.tarefa,
                        rotuloMesLocal(i.mes, i18n.language),
                        formatarHoras(i.minutos),
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            <Ajuda>{r('avisados')}</Ajuda>
          </div>
        )}
      </Secao>

      <ConfirmDialog
        aberto={confirmando}
        onOpenChange={setConfirmando}
        titulo={p('confirmarTitulo', comEmail)}
        consequencias={[r('umPorConsultor'), r('ficamMarcados')]}
        rotuloConfirmar={r('enviar')}
        processando={enviando}
        onConfirmar={confirmar}
      />
    </TelaEdicao>
  );
}
