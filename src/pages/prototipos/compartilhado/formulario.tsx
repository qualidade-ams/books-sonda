// Peças de formulário EXPLORATÓRIAS compartilhadas pelos protótipos do DS v2 (fora do glob de
// /prototipos). Saíram do protótipo de Empresas (21/10/2026) para as demais telas da Fase 3.
// Quando aprovadas, viram componentes em src/components/ds, com teste.
import { useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { ArrowLeft, Check, ChevronDown, ChevronUp, Copy, Info, X } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ds/Button';
import { cn } from '@/lib/utils';
import { useDicas } from './dicas';
import { campo } from './estilos';
import { FaixaTopo, botaoVidro } from './shell';
import { atraso, useContador } from './visual';

/** "i" ao lado do rótulo: abre ao passar o mouse, ao focar ou ao tocar (celular) */
export function InfoDica({ texto, assunto }: { texto: string; assunto: string }) {
  const [aberta, setAberta] = useState(false);
  return (
    <Tooltip open={aberta} onOpenChange={setAberta}>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={() => setAberta((v) => !v)}
          aria-label={`Para que serve: ${assunto}`}
          className="-m-1 grid h-6 w-6 shrink-0 place-items-center rounded-full text-ds-fg-muted transition hover:text-ds-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-focus"
        >
          <Info className="h-3.5 w-3.5" aria-hidden />
        </button>
      </TooltipTrigger>
      <TooltipContent
        data-ds="v2"
        className="max-w-xs border-ds-border bg-ds-bg-raised font-ds-sans text-xs font-normal leading-5 text-ds-fg"
      >
        {texto}
      </TooltipContent>
    </Tooltip>
  );
}

/** "i" pelo dicionário da tela; não mostra nada se o rótulo não tiver texto */
export function DicaDoRotulo({ rotulo }: { rotulo: string }) {
  const dicas = useDicas();
  return dicas[rotulo] ? <InfoDica texto={dicas[rotulo]} assunto={rotulo} /> : null;
}

export function Rotulo({
  children,
  obrigatorio,
  htmlFor,
}: {
  children: ReactNode;
  obrigatorio?: boolean;
  htmlFor?: string;
}) {
  return (
    <div className="mb-1.5 flex items-center gap-1.5">
      <label htmlFor={htmlFor} className="text-sm font-medium text-ds-fg">
        {children}
        {obrigatorio && <span className="ml-0.5 text-ds-danger-fg">*</span>}
      </label>
      {typeof children === 'string' && <DicaDoRotulo rotulo={children} />}
    </div>
  );
}

/**
 * Campo numérico com setas próprias: as nativas do navegador não aceitam as cores do DS
 * (ficam claras no tema escuro). Aceita uso controlado (valor + onChange) ou com valor inicial.
 */
export function CampoNumero({
  id,
  valor,
  valorInicial,
  onChange,
  min,
  max,
  invalido,
  rotuloAcessivel,
}: {
  id?: string;
  valor?: string;
  valorInicial?: number | string;
  onChange?: (v: string) => void;
  min?: number;
  max?: number;
  invalido?: boolean;
  rotuloAcessivel?: string;
}) {
  const [interno, setInterno] = useState(String(valorInicial ?? ''));
  const atual = valor ?? interno;
  const definir = (v: string) => {
    if (valor === undefined) setInterno(v);
    onChange?.(v);
  };
  const somar = (delta: number) => {
    let novo = (atual === '' ? (min ?? 0) - delta : Number(atual)) + delta;
    if (min !== undefined) novo = Math.max(min, novo);
    if (max !== undefined) novo = Math.min(max, novo);
    definir(String(novo));
  };
  const seta =
    'grid flex-1 place-items-center text-ds-fg-muted transition hover:bg-ds-bg-raised hover:text-ds-fg focus-visible:outline-none disabled:pointer-events-none disabled:opacity-40';
  return (
    <div className="relative">
      <input
        id={id}
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        value={atual}
        aria-label={rotuloAcessivel}
        onChange={(e) => definir(e.target.value)}
        aria-invalid={invalido}
        className={cn(
          campo,
          'pr-10 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none',
          invalido && 'border-ds-danger-fg'
        )}
      />
      {/* Fora da ordem de tabulação: pelo teclado, as setas ↑ ↓ do próprio campo já ajustam o valor */}
      <div className="absolute inset-y-px right-px flex w-8 flex-col overflow-hidden rounded-r-[7px] border-l border-ds-border bg-ds-bg-subtle">
        <button
          type="button"
          tabIndex={-1}
          aria-label="Aumentar"
          disabled={max !== undefined && atual !== '' && Number(atual) >= max}
          onClick={() => somar(1)}
          className={seta}
        >
          <ChevronUp className="h-3.5 w-3.5" aria-hidden />
        </button>
        <button
          type="button"
          tabIndex={-1}
          aria-label="Diminuir"
          disabled={min !== undefined && atual !== '' && Number(atual) <= min}
          onClick={() => somar(-1)}
          className={cn(seta, 'border-t border-ds-border')}
        >
          <ChevronDown className="h-3.5 w-3.5" aria-hidden />
        </button>
      </div>
    </div>
  );
}

/** Digita só números e formata como horas: "2000" → "20:00" */
const mascaraHoras = (v: string) => {
  const d = v.replace(/\D/g, '').slice(0, 5);
  return d.length <= 2 ? d : `${d.slice(0, -2)}:${d.slice(-2)}`;
};
const HORAS_VALIDAS = /^\d{1,3}:[0-5]\d$/;

/** Horas no formato HH:MM, com um sufixo opcional dentro do campo (ex.: "/mês") */
export function CampoHoras({
  id,
  valor,
  onChange,
  sufixo = '/mês',
}: {
  id: string;
  valor: string;
  onChange: (v: string) => void;
  sufixo?: string;
}) {
  const [tocado, setTocado] = useState(false);
  const invalido = tocado && valor !== '' && !HORAS_VALIDAS.test(valor);
  return (
    <div>
      <div className="relative">
        <input
          id={id}
          inputMode="numeric"
          placeholder="00:00"
          value={valor}
          onChange={(e) => onChange(mascaraHoras(e.target.value))}
          onBlur={() => setTocado(true)}
          aria-invalid={invalido}
          className={cn(
            campo,
            'tabular-nums',
            sufixo && 'pr-14',
            invalido && 'border-ds-danger-fg'
          )}
        />
        {sufixo && (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-ds-fg-muted">
            {sufixo}
          </span>
        )}
      </div>
      {invalido && (
        <p className="mt-1.5 text-xs text-ds-danger-fg">Use HH:MM, com minutos de 00 a 59.</p>
      )}
    </div>
  );
}

export function Ajuda({ children }: { children: ReactNode }) {
  return <p className="mt-1.5 text-xs text-ds-fg-muted">{children}</p>;
}

/** Escolha única entre poucas opções visíveis (SaaS / On Premise; Sim / Não) */
export function Escolha<T extends string>({
  rotulo,
  opcoes,
  valor,
  onChange,
  umaLinha,
}: {
  rotulo: string;
  opcoes: { valor: T; rotulo: string }[];
  valor: T | null;
  onChange: (v: T) => void;
  /** Muitas opções: ficam numa linha a partir de sm, com espaçamento menor */
  umaLinha?: boolean;
}) {
  return (
    <div
      role="radiogroup"
      aria-label={rotulo}
      className={cn(
        'flex flex-wrap gap-1 rounded-xl bg-ds-bg-subtle p-1',
        umaLinha && 'sm:flex-nowrap'
      )}
    >
      {opcoes.map((o) => {
        const ativo = o.valor === valor;
        return (
          <button
            key={o.valor}
            type="button"
            role="radio"
            aria-checked={ativo}
            onClick={() => onChange(o.valor)}
            className={cn(
              'h-10 whitespace-nowrap rounded-lg text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-focus md:h-8',
              umaLinha ? 'flex-auto px-2.5' : 'flex-1 px-3',
              ativo
                ? 'bg-ds-bg-surface text-ds-fg shadow-sm ring-1 ring-ds-border'
                : 'text-ds-fg-secondary hover:text-ds-fg'
            )}
          >
            {o.rotulo}
          </button>
        );
      })}
    </div>
  );
}

/** Chave liga/desliga compacta, para listas (o Interruptor traz rótulo e descrição) */
export function ChaveCompacta({
  ligado,
  rotulo,
  onClick,
  desabilitado,
}: {
  ligado: boolean;
  rotulo: string;
  onClick: () => void;
  desabilitado?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={ligado}
      aria-label={rotulo}
      disabled={desabilitado}
      onClick={onClick}
      className={cn(
        'relative h-6 w-11 shrink-0 rounded-full transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-focus focus-visible:ring-offset-2 focus-visible:ring-offset-ds-bg-surface disabled:opacity-40',
        ligado ? 'bg-ds-accent' : 'bg-ds-border-strong'
      )}
    >
      <span
        className={cn(
          'absolute left-0 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform',
          ligado ? 'translate-x-[22px]' : 'translate-x-0.5'
        )}
      />
    </button>
  );
}

export function Interruptor({
  ligado,
  onChange,
  rotulo,
  descricao,
  desabilitado,
}: {
  ligado: boolean;
  onChange: (v: boolean) => void;
  rotulo: string;
  descricao?: ReactNode;
  desabilitado?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <p
            className={cn(
              'text-sm font-medium',
              desabilitado ? 'text-ds-fg-disabled' : 'text-ds-fg'
            )}
          >
            {rotulo}
          </p>
          <DicaDoRotulo rotulo={rotulo} />
        </div>
        {descricao && <div className="mt-0.5 text-xs text-ds-fg-muted">{descricao}</div>}
      </div>
      <div className="mt-0.5">
        <ChaveCompacta
          ligado={ligado}
          rotulo={rotulo}
          desabilitado={desabilitado}
          onClick={() => onChange(!ligado)}
        />
      </div>
    </div>
  );
}

export function Chip({
  children,
  onRemover,
  tracejado,
}: {
  children: ReactNode;
  onRemover?: () => void;
  tracejado?: boolean;
}) {
  return (
    <span
      className={cn(
        'inline-flex h-7 max-w-full items-center gap-1 rounded-full border px-2.5 text-xs font-medium text-ds-fg-secondary',
        tracejado ? 'border-dashed border-ds-border-strong' : 'border-ds-border bg-ds-bg-subtle'
      )}
    >
      <span className="truncate">{children}</span>
      {onRemover && (
        <button
          type="button"
          onClick={onRemover}
          aria-label={`Remover ${typeof children === 'string' ? children : ''}`}
          className="-mr-1 grid h-5 w-5 place-items-center rounded-full text-ds-fg-muted hover:bg-ds-bg-raised hover:text-ds-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-focus"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </span>
  );
}

/**
 * Valor com o botão de copiar, que aparece ao passar o mouse ou focar (nomes, e-mails). Mostra
 * "Copiado" por um instante depois do clique.
 */
export function ValorCopiavel({ valor, rotulo }: { valor: string; rotulo: string }) {
  const [copiado, setCopiado] = useState(false);
  useEffect(() => {
    if (!copiado) return;
    const t = setTimeout(() => setCopiado(false), 1500);
    return () => clearTimeout(t);
  }, [copiado]);
  return (
    <span className="group inline-flex max-w-full items-start gap-1.5">
      <span className="min-w-0 break-words">{valor}</span>
      <button
        type="button"
        onClick={() => {
          navigator.clipboard?.writeText(valor).catch(() => undefined);
          setCopiado(true);
        }}
        aria-label={copiado ? `${rotulo} copiado` : `Copiar ${rotulo.toLowerCase()}`}
        title={copiado ? 'Copiado' : 'Copiar'}
        className={cn(
          '-my-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-md text-ds-fg-muted transition hover:bg-ds-bg-subtle hover:text-ds-fg focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-focus',
          copiado ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
        )}
      >
        {copiado ? (
          <Check className="h-3.5 w-3.5 text-ds-success-fg" aria-hidden />
        ) : (
          <Copy className="h-3.5 w-3.5" aria-hidden />
        )}
      </button>
    </span>
  );
}

/** Ícone pequeno com dica ao passar o mouse ou focar (observação, projeto…) */
export function IconeComDica({
  dica,
  rotulo,
  children,
}: {
  dica: string;
  rotulo?: string;
  children: ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          tabIndex={0}
          aria-label={rotulo ? `${rotulo}: ${dica}` : dica}
          className="inline-grid h-5 w-5 place-items-center rounded text-ds-fg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-focus"
        >
          {children}
        </span>
      </TooltipTrigger>
      <TooltipContent
        data-ds="v2"
        className="max-w-xs border-ds-border bg-ds-bg-raised font-ds-sans text-xs text-ds-fg"
      >
        {rotulo && <p className="font-medium">{rotulo}</p>}
        <p className={rotulo ? 'text-ds-fg-secondary' : undefined}>{dica}</p>
      </TooltipContent>
    </Tooltip>
  );
}

/** Indicador flutuante sobre a faixa do topo; clicável quando filtra a lista */
export function Indicador({
  rotulo,
  valor,
  icone,
  tom = 'neutral',
  selecionado,
  onClick,
  atrasoMs = 0,
}: {
  rotulo: string;
  valor: number;
  icone: ReactNode;
  tom?: 'neutral' | 'success' | 'warning';
  selecionado?: boolean;
  onClick?: () => void;
  atrasoMs?: number;
}) {
  const animado = useContador(valor);
  const cor = {
    neutral: 'text-ds-fg',
    success: 'text-ds-success-fg',
    warning: 'text-ds-warning-fg',
  }[tom];
  const Elemento = onClick ? 'button' : 'div';
  return (
    <Elemento
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      aria-pressed={onClick ? selecionado : undefined}
      style={atraso(atrasoMs)}
      className={cn(
        'ds-surgir flex flex-col rounded-xl border bg-ds-bg-surface p-4 text-left shadow-[0_8px_24px_-12px_rgba(0,0,0,0.2)] transition duration-200',
        selecionado ? 'border-[#00D4E8]' : 'border-ds-border',
        onClick &&
          'hover:-translate-y-0.5 hover:shadow-[0_14px_32px_-12px_rgba(0,0,0,0.25)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-focus'
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium text-ds-fg-muted">{rotulo}</p>
          <p
            className={cn('mt-1 text-2xl font-semibold leading-8 tracking-tight tabular-nums', cor)}
          >
            {animado}
          </p>
        </div>
        <span
          className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-ds-accent-subtle text-ds-fg-accent [&_svg]:h-4 [&_svg]:w-4"
          aria-hidden
        >
          {icone}
        </span>
      </div>
    </Elemento>
  );
}

/**
 * Edição como um nível a mais na tela (decisão de 16/10/2026), no lugar do painel lateral: mais
 * largura, a mesma faixa do topo e a barra de salvar fixa. "Voltar" leva ao nível anterior.
 */
export function TelaEdicao({
  voltarPara,
  titulo,
  subtitulo,
  podeSalvar,
  rotuloSalvar = 'Salvar',
  onFechar,
  onSalvar,
  children,
}: {
  /** Rótulo do botão de voltar (o nível anterior) */
  voltarPara: string;
  titulo: string;
  subtitulo?: string;
  podeSalvar: boolean;
  rotuloSalvar?: string;
  onFechar: () => void;
  onSalvar: () => void;
  children: ReactNode;
}) {
  // Ao entrar no nível de edição, começa do topo
  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, []);

  return (
    <>
      <FaixaTopo>
        <div className="pb-20 pt-1 md:pb-24">
          <button type="button" onClick={onFechar} className={cn(botaoVidro, 'h-9 md:h-8')}>
            <ArrowLeft className="h-4 w-4" /> {voltarPara}
          </button>
          <div className="ds-surgir mt-4 max-w-3xl">
            <h1 className="font-ds-title text-[26px] font-semibold leading-8 tracking-tight md:text-[34px] md:leading-[42px]">
              {titulo}
            </h1>
            {subtitulo && <p className="mt-1.5 text-sm text-[#B1B1B1]">{subtitulo}</p>}
          </div>
        </div>
      </FaixaTopo>

      <div
        className="ds-surgir relative -mt-12 rounded-xl border border-ds-border bg-ds-bg-surface shadow-[0_8px_24px_-12px_rgba(0,0,0,0.2)] md:-mt-16"
        style={atraso(80)}
      >
        {children}
      </div>

      <BarraRodape>
        <div className="ml-auto flex gap-2">
          <Button onClick={onFechar}>Cancelar</Button>
          <Button variante="primario" disabled={!podeSalvar} onClick={onSalvar}>
            {rotuloSalvar}
          </Button>
        </div>
      </BarraRodape>
    </>
  );
}

/**
 * Barra fixa no rodapé da tela (salvar, descartar). Vai direto para o <body>: dentro de um bloco
 * animado (ds-surgir usa transform), um elemento fixed se prenderia ao bloco, e não à tela.
 */
export function BarraRodape({ children }: { children: ReactNode }) {
  return createPortal(
    <div
      data-ds="v2"
      className="fixed inset-x-0 bottom-0 z-30 border-t border-ds-border bg-ds-bg-surface/95 px-4 py-3 font-ds-sans text-ds-fg backdrop-blur lg:left-[92px]"
    >
      <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-3">
        {children}
      </div>
    </div>,
    document.body
  );
}

/** Seção da tela de edição: nome à esquerda e campos à direita a partir de md */
export function Secao({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <section className="border-b border-ds-border px-4 py-5 last:border-b-0 md:grid md:grid-cols-[220px_minmax(0,1fr)] md:gap-8 md:px-6 md:py-6">
      <div className="mb-4 flex items-center gap-1.5 md:mb-0 md:items-start md:pt-0.5">
        <h3 className="text-xs font-bold uppercase tracking-[0.06em] text-ds-fg-secondary">
          {titulo}
        </h3>
        <DicaDoRotulo rotulo={titulo} />
      </div>
      <div className="min-w-0 space-y-4">{children}</div>
    </section>
  );
}

export function CampoTexto({
  id,
  rotulo,
  obrigatorio,
  valor,
  onChange,
  erro,
  tipo = 'text',
  placeholder,
  maiusculas,
}: {
  id: string;
  rotulo: string;
  obrigatorio?: boolean;
  valor: string;
  onChange: (v: string) => void;
  erro?: string | null;
  tipo?: 'text' | 'email' | 'date' | 'url' | 'number';
  placeholder?: string;
  maiusculas?: boolean;
}) {
  return (
    <div>
      <Rotulo obrigatorio={obrigatorio} htmlFor={id}>
        {rotulo}
      </Rotulo>
      {tipo === 'number' ? (
        <CampoNumero id={id} valor={valor} onChange={onChange} min={0} invalido={!!erro} />
      ) : (
        <input
          id={id}
          type={tipo}
          value={valor}
          placeholder={placeholder}
          onChange={(e) => onChange(maiusculas ? e.target.value.toUpperCase() : e.target.value)}
          aria-invalid={!!erro}
          className={cn(campo, erro && 'border-ds-danger-fg')}
        />
      )}
      {erro && <p className="mt-1.5 text-xs text-ds-danger-fg">{erro}</p>}
    </div>
  );
}

/** Chave tracejada no topo, só do protótipo (momento, perfil de acesso…) */
export function ChavePrototipo<T extends string>({
  rotulo,
  opcoes,
  valor,
  onChange,
}: {
  rotulo: string;
  opcoes: [T, string][];
  valor: T;
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span>{rotulo}:</span>
      {opcoes.map(([v, r]) => (
        <button
          key={v}
          type="button"
          onClick={() => onChange(v)}
          aria-pressed={valor === v}
          className={cn(
            'rounded-full border px-3 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-focus',
            valor === v
              ? 'border-[#00D4E8] bg-ds-accent-subtle text-ds-fg-accent'
              : 'border-ds-border-strong'
          )}
        >
          {r}
        </button>
      ))}
    </div>
  );
}

/** Caixa tracejada que agrupa as chaves só do protótipo */
export function ChavesPrototipo({ children }: { children: ReactNode }) {
  return (
    <div className="mb-3 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-lg border border-dashed border-ds-border-strong px-3 py-2 text-xs text-ds-fg-secondary">
      {children}
    </div>
  );
}

export function Vazio() {
  return <span className="text-ds-fg-muted">—</span>;
}
