// Aba Cores de Organizar Menu: fundo e texto de cada parte do menu e o logo, por tema. A aba de tema
// é o próprio tema da página. O selecionado, depois de salvo, vira o destaque do sistema no tema.
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle } from 'lucide-react';
import { SegmentedTabs } from '@/components/ds/SegmentedTabs';
import { StatusBadge } from '@/components/ds/StatusBadge';
import { DicaDoRotulo } from '@/components/ds/Formulario';
import { campo } from '@/components/ds/estilos';
import { useLogoMenu } from '@/hooks/useMenuOrganizado';
import { cn } from '@/lib/utils';
import { contraste, logoClaroSobre } from '@/utils/aparenciaMenu';
import { PARTES_DO_MENU, corMudou, type ParteDoMenu } from '@/utils/organizarMenuTela';
import type { AparenciaMenu, TemaMenu } from '@/types/menuOrganizado';

const SUGESTOES: Record<TemaMenu, string[]> = {
  claro: ['#FAFBFC', '#FFFFFF', '#EEF1F4', '#2563EB', '#1D4ED8', '#00D4E8'],
  escuro: ['#1C1C1C', '#121212', '#262626', '#00D4E8', '#2563EB', '#0D2B2E'],
};
const LOGO_TIPOS = ['image/png', 'image/svg+xml', 'image/webp', 'image/jpeg'];
const LOGO_TAMANHO_MAXIMO = 500 * 1024;
const hexValido = (v: string) => /^#[0-9A-F]{6}$/i.test(v);

/** Quadrado da cor (abre o seletor do navegador) e o código; a cor só muda com o código completo */
function CampoHex({
  rotulo,
  parte,
  valor,
  podeEditar,
  onChange,
}: {
  rotulo: string;
  parte: string;
  valor: string;
  podeEditar: boolean;
  onChange: (cor: string) => void;
}) {
  const { t } = useTranslation();
  const [texto, setTexto] = useState(valor);
  useEffect(() => setTexto(valor), [valor]);
  const invalido = !hexValido(texto);
  return (
    <div className="flex items-center gap-2">
      <span className="w-12 shrink-0 text-xs text-ds-fg-muted">{parte}</span>
      <span
        className="relative h-9 w-9 shrink-0 overflow-hidden rounded-md ring-1 ring-ds-border-strong"
        style={{ background: valor }}
      >
        {podeEditar && (
          <input
            type="color"
            aria-label={t('organizarMenu.cores.escolher', { parte, rotulo })}
            value={valor.toLowerCase()}
            onChange={(e) => onChange(e.target.value.toUpperCase())}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          />
        )}
      </span>
      <input
        aria-label={t('organizarMenu.cores.codigo', { parte, rotulo })}
        value={texto}
        readOnly={!podeEditar}
        maxLength={7}
        onChange={(e) => {
          const v = `#${e.target.value.replace(/[^0-9a-f]/gi, '').slice(0, 6)}`.toUpperCase();
          setTexto(v);
          if (hexValido(v)) onChange(v);
        }}
        onBlur={() => setTexto(valor)}
        aria-invalid={invalido || undefined}
        className={cn(campo, 'w-28 font-mono uppercase', invalido && 'border-ds-danger-fg')}
      />
    </div>
  );
}

function CampoCor({
  rotulo,
  fundo,
  texto,
  sugestoes,
  podeEditar,
  alterada,
  onFundo,
  onTexto,
}: {
  rotulo: string;
  fundo: string;
  texto: string;
  sugestoes: string[];
  podeEditar: boolean;
  alterada: boolean;
  onFundo: (cor: string) => void;
  onTexto: (cor: string) => void;
}) {
  const { t } = useTranslation();
  const c = (chave: string, valores?: Record<string, unknown>) =>
    t(`organizarMenu.cores.${chave}`, valores);
  const razao = contraste(fundo, texto);
  return (
    <div
      className={cn('rounded-lg border border-ds-border p-3', alterada && 'bg-ds-accent-subtle/40')}
    >
      <div className="flex items-center gap-1.5">
        <span className="text-sm font-medium">{rotulo}</span>
        <DicaDoRotulo rotulo={rotulo} />
        {alterada && (
          <span className="ml-auto">
            <StatusBadge tom="info">{c('alterada')}</StatusBadge>
          </span>
        )}
      </div>
      <div className="mt-2 flex items-start gap-3">
        <div className="space-y-2">
          <CampoHex
            rotulo={rotulo}
            parte={c('fundo')}
            valor={fundo}
            podeEditar={podeEditar}
            onChange={onFundo}
          />
          <CampoHex
            rotulo={rotulo}
            parte={c('texto')}
            valor={texto}
            podeEditar={podeEditar}
            onChange={onTexto}
          />
        </div>
        {/* Amostra do texto sobre o fundo */}
        <span
          aria-hidden
          className="ml-auto hidden h-[80px] min-w-0 flex-1 place-items-center rounded-md text-sm font-medium ring-1 ring-ds-border xl:grid"
          style={{ background: fundo, color: texto }}
        >
          Aa
        </span>
      </div>
      {razao < 4.5 && (
        <p
          className="mt-2 inline-flex items-center gap-1 text-xs text-ds-warning-fg"
          title={c('contrasteDica')}
        >
          <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
          {c('contraste', { razao: razao.toFixed(1) })}
        </p>
      )}
      {podeEditar && (
        <div
          className="mt-2 flex flex-wrap gap-1.5 pl-[56px]"
          role="group"
          aria-label={c('sugestoes', { rotulo })}
        >
          {sugestoes.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => onFundo(s)}
              aria-label={s}
              aria-pressed={s === fundo.toUpperCase()}
              title={s}
              className={cn(
                'h-6 w-6 rounded-md ring-1 ring-ds-border-strong transition hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-focus',
                s === fundo.toUpperCase() &&
                  'ring-2 ring-ds-focus ring-offset-2 ring-offset-ds-bg-surface'
              )}
              style={{ background: s }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/** O logo sobre o fundo do menu, como vai aparecer, com envio e volta ao padrão */
function CampoLogo({
  rotulo,
  caminho,
  fundo,
  recolhido,
  podeEditar,
  onEnviar,
  onPadrao,
}: {
  rotulo: string;
  caminho: string | null;
  fundo: string;
  recolhido?: boolean;
  podeEditar: boolean;
  onEnviar: (arquivo: File) => Promise<void>;
  onPadrao: () => void;
}) {
  const { t } = useTranslation();
  const c = (chave: string, valores?: Record<string, unknown>) =>
    t(`organizarMenu.cores.${chave}`, valores);
  const url = useLogoMenu(caminho);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const id = `logo-${recolhido ? 'recolhido' : 'aberto'}`;

  const enviar = async (arquivo?: File) => {
    if (!arquivo) return;
    if (!LOGO_TIPOS.includes(arquivo.type)) return setErro(c('erroTipo'));
    if (arquivo.size > LOGO_TAMANHO_MAXIMO) return setErro(c('erroTamanho'));
    setErro(null);
    setEnviando(true);
    try {
      await onEnviar(arquivo);
    } catch {
      // O aviso do erro vem do hook
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="min-w-0">
      <p className="text-xs text-ds-fg-muted">{rotulo}</p>
      <div
        className="mt-1 grid h-14 place-items-center rounded-md px-2 ring-1 ring-ds-border-strong"
        style={{ background: fundo }}
      >
        <img
          src={url ?? (recolhido ? '/images/logo-sonda-16x16.png' : '/images/logo-sonda.png')}
          alt=""
          className={cn(
            'w-auto object-contain',
            recolhido ? 'h-6 max-w-6' : 'h-8 max-w-full',
            !url && !recolhido && !logoClaroSobre(fundo) && 'brightness-0'
          )}
        />
      </div>
      {podeEditar && (
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
          <label
            htmlFor={id}
            className="cursor-pointer text-xs font-medium text-ds-fg-accent hover:underline focus-within:underline"
          >
            {enviando ? c('enviando') : c('enviarImagem')}
            <input
              id={id}
              type="file"
              aria-label={c('enviarLogo', { rotulo })}
              accept={LOGO_TIPOS.join(',')}
              disabled={enviando}
              className="sr-only"
              onChange={(e) => {
                enviar(e.target.files?.[0]);
                e.target.value = '';
              }}
            />
          </label>
          {caminho && (
            <button
              type="button"
              onClick={onPadrao}
              className="text-xs font-medium text-ds-fg-secondary hover:underline"
            >
              {c('usarPadrao')}
            </button>
          )}
        </div>
      )}
      {erro && <p className="mt-1 text-xs text-ds-danger-fg">{erro}</p>}
    </div>
  );
}

export function CoresDoMenu({
  tema,
  onTema,
  salva,
  atual,
  podeEditar,
  onMudar,
  onEnviarLogo,
}: {
  tema: TemaMenu;
  onTema: (tema: TemaMenu) => void;
  salva: AparenciaMenu;
  atual: AparenciaMenu;
  podeEditar: boolean;
  onMudar: (campo: keyof AparenciaMenu, valor: string | null) => void;
  onEnviarLogo: (tipo: 'aberto' | 'recolhido', arquivo: File) => Promise<void>;
}) {
  const { t } = useTranslation();
  const c = (chave: string) => t(`organizarMenu.cores.${chave}`);
  const logoAlterado =
    atual.logoPath !== salva.logoPath || atual.logoRecolhidoPath !== salva.logoRecolhidoPath;

  return (
    <div className="space-y-4 p-4 md:p-5">
      <SegmentedTabs
        rotulo={c('tema')}
        itens={[
          { valor: 'claro', rotulo: c('temas.claro') },
          { valor: 'escuro', rotulo: c('temas.escuro') },
        ]}
        valor={tema}
        onChange={(v) => onTema(v as TemaMenu)}
      />
      <div className="grid gap-3 sm:grid-cols-2">
        {PARTES_DO_MENU.map((parte: ParteDoMenu) => (
          <CampoCor
            key={`${tema}-${parte}`}
            rotulo={c(`partes.${parte}`)}
            fundo={atual[`${parte}Fundo`]}
            texto={atual[`${parte}Texto`]}
            sugestoes={SUGESTOES[tema]}
            podeEditar={podeEditar}
            alterada={corMudou(salva, atual, parte)}
            onFundo={(cor) => onMudar(`${parte}Fundo`, cor)}
            onTexto={(cor) => onMudar(`${parte}Texto`, cor)}
          />
        ))}
        <div
          className={cn(
            'rounded-lg border border-ds-border p-3',
            logoAlterado && 'bg-ds-accent-subtle/40'
          )}
        >
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-medium">{c('logo')}</span>
            <DicaDoRotulo rotulo={c('logo')} />
          </div>
          <div className="mt-2 grid grid-cols-2 gap-3">
            <CampoLogo
              key={`${tema}-aberto`}
              rotulo={c('logoAberto')}
              caminho={atual.logoPath}
              fundo={atual.menuFundo}
              podeEditar={podeEditar}
              onEnviar={(arquivo) => onEnviarLogo('aberto', arquivo)}
              onPadrao={() => onMudar('logoPath', null)}
            />
            <CampoLogo
              key={`${tema}-recolhido`}
              rotulo={c('logoRecolhido')}
              caminho={atual.logoRecolhidoPath}
              fundo={atual.menuFundo}
              recolhido
              podeEditar={podeEditar}
              onEnviar={(arquivo) => onEnviarLogo('recolhido', arquivo)}
              onPadrao={() => onMudar('logoRecolhidoPath', null)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
