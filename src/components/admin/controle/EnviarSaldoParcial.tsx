// Envio manual do Saldo Parcial pelo Controle (nível a mais na tela): um e-mail com um bloco por
// banco que o cliente vê e o Excel com os chamados. Destinatários: os contatos ativos com a
// finalidade Saldo Parcial; o idioma é o do template da empresa.
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FileSpreadsheet } from 'lucide-react';
import { Button } from '@/components/ds/Button';
import { Callout } from '@/components/ds/Callout';
import { ConfirmDialog } from '@/components/ds/ConfirmDialog';
import { Chip, Rotulo, Secao, TelaEdicao } from '@/components/ds/Formulario';
import { areaTexto, campo } from '@/components/ds/estilos';
import { mesAtual } from '@/services/bancosHoras/periodos';
import { gerarHtmlTabelasBancos } from '@/services/saldoParcial/conteudoBancos';
import {
  gerarAssuntoSaldoParcial,
  gerarHtmlCorpoComTabelas,
  getTextoPadraoParcial,
} from '@/services/saldoParcial/emailSaldoParcial';
import type { SaldoParcialBanco } from '@/services/controleSaldoParcialService';
import { plural } from '@/utils/plural';

const EMAIL = /^[^\s@;,]+@[^\s@;,]+\.[^\s@;,]+$/;

const separar = (texto: string) =>
  texto
    .split(/[;,]/)
    .map((e) => e.trim())
    .filter(Boolean);

export interface DadosEnvioSaldo {
  destinatarios: string[];
  copia: string[];
  assunto: string;
  texto: string;
}

export function EnviarSaldoParcial({
  empresaNome,
  bancos,
  idioma,
  tEmail,
  carregando,
  erro,
  destinatariosPadrao,
  onTentarNovamente,
  onFechar,
  onEnviar,
}: {
  empresaNome: string;
  bancos: SaldoParcialBanco[];
  idioma: 'pt-BR' | 'en';
  /** Textos no idioma do e-mail, para a prévia */
  tEmail: (chave: string, valores?: Record<string, unknown>) => string;
  carregando: boolean;
  erro: Error | null;
  /** Contatos ativos da empresa com a finalidade Saldo Parcial */
  destinatariosPadrao: string[];
  onTentarNovamente: () => void;
  onFechar: () => void;
  /** Sem tratar o erro aqui: o aviso vem do hook e a tela continua aberta */
  onEnviar: (dados: DadosEnvioSaldo) => Promise<void>;
}) {
  const { t } = useTranslation();
  const e = (chave: string, valores?: Record<string, unknown>) =>
    t(`controleBancoHoras.enviarSaldo.${chave}`, valores);
  const isEnglish = idioma === 'en';

  // Enquanto não há edição, valem os contatos e o texto padrão (que chegam depois de abrir)
  const [lista, setLista] = useState<string[] | null>(null);
  const [novo, setNovo] = useState('');
  const [novoInvalido, setNovoInvalido] = useState(false);
  const [copia, setCopia] = useState('');
  const [assunto, setAssunto] = useState(() => gerarAssuntoSaldoParcial(empresaNome, mesAtual()));
  const [texto, setTexto] = useState<string | null>(null);
  const [confirmando, setConfirmando] = useState(false);
  const [enviando, setEnviando] = useState(false);

  const destinatarios = lista ?? destinatariosPadrao;
  const textoAtual = texto ?? getTextoPadraoParcial(isEnglish);
  const emailsCopia = separar(copia);
  const copiaInvalida = emailsCopia.some((c) => !EMAIL.test(c));
  const pode =
    destinatarios.length > 0 &&
    !!assunto.trim() &&
    !copiaInvalida &&
    bancos.length > 0 &&
    !carregando &&
    !erro;

  const previa = useMemo(
    () =>
      gerarHtmlCorpoComTabelas(
        textoAtual,
        isEnglish,
        gerarHtmlTabelasBancos(bancos, { t: tEmail, idioma })
      ),
    [textoAtual, isEnglish, bancos, tEmail, idioma]
  );

  const adicionar = () => {
    const email = novo.trim();
    if (!email) return;
    if (!EMAIL.test(email)) {
      setNovoInvalido(true);
      return;
    }
    if (!destinatarios.includes(email)) setLista([...destinatarios, email]);
    setNovo('');
    setNovoInvalido(false);
  };

  const confirmar = async () => {
    setEnviando(true);
    try {
      await onEnviar({
        destinatarios,
        copia: emailsCopia,
        assunto: assunto.trim(),
        texto: textoAtual,
      });
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
      voltarPara={t('controleBancoHoras.titulo')}
      titulo={e('titulo')}
      subtitulo={empresaNome}
      podeSalvar={pode}
      rotuloSalvar={e('enviar')}
      onFechar={onFechar}
      onSalvar={() => setConfirmando(true)}
    >
      <Secao titulo={e('secaoEmail')}>
        <div className="space-y-4">
          <div>
            <Rotulo obrigatorio>{e('destinatarios')}</Rotulo>
            <div className="flex flex-wrap gap-1.5">
              {destinatarios.map((d) => (
                <Chip key={d} onRemover={() => setLista(destinatarios.filter((x) => x !== d))}>
                  {d}
                </Chip>
              ))}
              {!destinatarios.length && (
                <span className="text-sm text-ds-danger-fg">{e('semDestinatario')}</span>
              )}
            </div>
            <div className="mt-2 flex gap-2 sm:max-w-md">
              <input
                id="novo-destinatario"
                type="email"
                aria-label={e('novoDestinatario')}
                placeholder={e('novoDestinatario')}
                value={novo}
                onChange={(ev) => {
                  setNovo(ev.target.value);
                  setNovoInvalido(false);
                }}
                onKeyDown={(ev) => {
                  if (ev.key === 'Enter') {
                    ev.preventDefault();
                    adicionar();
                  }
                }}
                className={campo}
              />
              <Button onClick={adicionar}>{e('adicionar')}</Button>
            </div>
            {novoInvalido && <p className="mt-1 text-xs text-ds-danger-fg">{e('emailInvalido')}</p>}
          </div>
          <div>
            <Rotulo htmlFor="copia-saldo">{e('copia')}</Rotulo>
            <input
              id="copia-saldo"
              value={copia}
              onChange={(ev) => setCopia(ev.target.value)}
              placeholder={e('copiaPlaceholder')}
              className={campo}
            />
            {copiaInvalida && (
              <p className="mt-1 text-xs text-ds-danger-fg">{e('emailInvalido')}</p>
            )}
          </div>
          <div>
            <Rotulo obrigatorio htmlFor="assunto-saldo">
              {e('assunto')}
            </Rotulo>
            <input
              id="assunto-saldo"
              value={assunto}
              onChange={(ev) => setAssunto(ev.target.value)}
              className={campo}
            />
          </div>
          <div>
            <Rotulo htmlFor="texto-saldo">{e('texto')}</Rotulo>
            <textarea
              id="texto-saldo"
              rows={8}
              value={textoAtual}
              onChange={(ev) => setTexto(ev.target.value)}
              className={areaTexto}
            />
            <p className="mt-1 text-xs text-ds-fg-muted">
              {e('idioma', { idioma: e(`idiomas.${idioma}`) })}
            </p>
          </div>
          <div className="flex items-center gap-3 rounded-lg border border-ds-border bg-ds-bg-subtle px-3 py-2.5 text-sm">
            <FileSpreadsheet className="h-5 w-5 shrink-0 text-ds-fg-accent" aria-hidden />
            <span className="min-w-0 flex-1">{e('excel')}</span>
          </div>
        </div>
      </Secao>

      <Secao titulo={e('secaoPrevia')}>
        {erro ? (
          <div className="space-y-3">
            <Callout tom="danger" titulo={e('erro')}>
              {t('fase3Comum.verifiqueConexao')}
            </Callout>
            <Button onClick={onTentarNovamente}>{t('fase3Comum.tentarNovamente')}</Button>
          </div>
        ) : carregando ? (
          <div
            className="h-96 animate-pulse rounded-lg bg-ds-bg-subtle"
            role="status"
            aria-label={t('controleBancoHoras.carregando')}
          />
        ) : !bancos.length ? (
          <Callout tom="warning">{e('semBancos')}</Callout>
        ) : (
          // sandbox vazio: a prévia não roda script nem navega
          <iframe
            title={e('previa')}
            sandbox=""
            srcDoc={previa}
            className="h-[640px] w-full rounded-lg border border-ds-border bg-white"
          />
        )}
      </Secao>

      <ConfirmDialog
        aberto={confirmando}
        onOpenChange={setConfirmando}
        titulo={e('confirmarTitulo')}
        consequencias={[
          plural(
            t,
            'controleBancoHoras.enviarSaldo.confirmarDestinatarios',
            destinatarios.length + emailsCopia.length
          ),
          e('confirmarHistorico'),
        ]}
        rotuloConfirmar={e('enviar')}
        processando={enviando}
        onConfirmar={confirmar}
      />
    </TelaEdicao>
  );
}
