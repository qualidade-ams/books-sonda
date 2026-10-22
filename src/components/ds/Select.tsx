import * as React from 'react';
import * as SelectPrimitive from '@radix-ui/react-select';
import { Check, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

/** O Radix não aceita item com valor vazio; "Selecione" e "Nenhum" usam este valor por dentro */
const VAZIO = '__ds_vazio__';

interface Opcao {
  valor: string;
  rotulo: React.ReactNode;
  desabilitada: boolean;
}

const textoDe = (no: React.ReactNode): string =>
  React.Children.toArray(no)
    .map((c) => (typeof c === 'string' || typeof c === 'number' ? String(c) : ''))
    .join('');

/** Lê as <option> dos filhos, inclusive dentro de fragmentos e listas */
function lerOpcoes(filhos: React.ReactNode): Opcao[] {
  return React.Children.toArray(filhos).flatMap((filho): Opcao[] => {
    if (!React.isValidElement(filho)) return [];
    const props = filho.props as {
      value?: string | number;
      disabled?: boolean;
      children?: React.ReactNode;
    };
    if (filho.type === React.Fragment) return lerOpcoes(props.children);
    if (filho.type !== 'option') return [];
    return [
      {
        valor: String(props.value ?? textoDe(props.children)),
        rotulo: props.children,
        desabilitada: !!props.disabled,
      },
    ];
  });
}

const paraInterno = (v: string) => (v === '' ? VAZIO : v);
const paraExterno = (v: string) => (v === VAZIO ? '' : v);

interface SelectProps extends Omit<
  React.HTMLAttributes<HTMLButtonElement>,
  'onChange' | 'defaultValue'
> {
  value?: string | number;
  disabled?: boolean;
  /** Mesmo formato do select nativo: o valor chega em `e.target.value` */
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
  /** `vidro`: sobre a faixa escura do topo */
  variante?: 'padrao' | 'vidro';
  children: React.ReactNode;
}

/**
 * Lista de seleção do DS v2. Recebe <option> como o select nativo, mas abre uma lista com o
 * visual do sistema (cantos, cores e tema), e não a caixa branca do navegador.
 */
export const Select = React.forwardRef<HTMLButtonElement, SelectProps>(
  ({ value, onChange, disabled, variante = 'padrao', className, children, ...props }, ref) => {
    const opcoes = lerOpcoes(children);
    const atual = String(value ?? '');

    const escolher = (v: string) => {
      const valor = paraExterno(v);
      onChange?.({
        target: { value: valor },
        currentTarget: { value: valor },
      } as unknown as React.ChangeEvent<HTMLSelectElement>);
    };

    return (
      <SelectPrimitive.Root value={paraInterno(atual)} onValueChange={escolher} disabled={disabled}>
        <SelectPrimitive.Trigger
          ref={ref}
          className={cn(
            'relative inline-grid h-11 items-center rounded-lg border pl-3 pr-9 text-left text-base transition focus-visible:outline-none focus-visible:ring-2 md:h-9 md:text-sm',
            variante === 'vidro'
              ? 'border-white/15 bg-white/[0.06] font-medium text-white backdrop-blur-md hover:bg-white/[0.1] focus-visible:ring-white/80'
              : 'border-ds-border-strong bg-ds-bg-surface text-ds-fg hover:border-ds-fg-muted focus-visible:ring-ds-focus disabled:border-ds-border disabled:bg-ds-bg-subtle disabled:text-ds-fg-disabled',
            className
          )}
          {...props}
        >
          {/* Todas as opções na mesma célula: a largura é a da maior, como no select nativo */}
          {opcoes.map((o) => (
            <span
              key={o.valor}
              aria-hidden={o.valor !== atual}
              className={cn('col-start-1 row-start-1 truncate', o.valor !== atual && 'invisible')}
            >
              {o.rotulo}
            </span>
          ))}
          <ChevronDown
            className={cn(
              'pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2',
              variante === 'vidro' ? 'text-white/60' : 'text-ds-fg-muted'
            )}
            aria-hidden
          />
        </SelectPrimitive.Trigger>
        <SelectPrimitive.Portal>
          <SelectPrimitive.Content
            data-ds="v2"
            position="popper"
            sideOffset={4}
            className="z-50 max-h-[min(18rem,var(--radix-select-content-available-height))] min-w-[var(--radix-select-trigger-width)] overflow-hidden rounded-lg border border-ds-border bg-ds-bg-raised p-1 font-ds-sans text-ds-fg shadow-[0_12px_32px_-12px_rgba(0,0,0,0.45)]"
          >
            <SelectPrimitive.Viewport>
              {opcoes.map((o) => (
                <SelectPrimitive.Item
                  key={o.valor}
                  value={paraInterno(o.valor)}
                  disabled={o.desabilitada}
                  className="relative flex h-11 cursor-default select-none items-center rounded-md pl-8 pr-2.5 text-sm outline-none transition data-[disabled]:pointer-events-none data-[highlighted]:bg-ds-bg-subtle data-[state=checked]:font-medium data-[disabled]:text-ds-fg-disabled md:h-9"
                >
                  <SelectPrimitive.ItemIndicator className="absolute left-2.5 grid place-items-center text-ds-fg-accent">
                    <Check className="h-3.5 w-3.5" strokeWidth={3} />
                  </SelectPrimitive.ItemIndicator>
                  <SelectPrimitive.ItemText>{o.rotulo}</SelectPrimitive.ItemText>
                </SelectPrimitive.Item>
              ))}
            </SelectPrimitive.Viewport>
          </SelectPrimitive.Content>
        </SelectPrimitive.Portal>
      </SelectPrimitive.Root>
    );
  }
);
Select.displayName = 'Select';
