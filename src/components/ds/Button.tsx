import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

// Altura: 44 px no celular (área de toque), 36 px a partir de 768 px
export const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg font-ds-sans text-sm font-medium transition-colors ' +
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-focus focus-visible:ring-offset-2 focus-visible:ring-offset-ds-bg-surface ' +
    'disabled:pointer-events-none disabled:border-ds-border disabled:bg-ds-bg-subtle disabled:text-ds-fg-disabled [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variante: {
        primario:
          'bg-ds-accent text-ds-fg-on-accent hover:bg-ds-accent-hover active:bg-ds-accent-pressed',
        secundario:
          'border border-ds-border-strong bg-ds-bg-surface text-ds-fg hover:bg-ds-bg-subtle',
        fantasma: 'text-ds-fg-accent hover:bg-ds-accent-subtle',
        perigo: 'bg-ds-danger-solid text-ds-fg-on-danger hover:opacity-90',
      },
      tamanho: {
        sm: 'h-8 px-3',
        md: 'h-11 px-4 md:h-9',
        icone: 'h-11 w-11 md:h-9 md:w-9',
      },
    },
    defaultVariants: { variante: 'secundario', tamanho: 'md' },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variante, tamanho, type = 'button', ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(buttonVariants({ variante, tamanho }), className)}
      {...props}
    />
  )
);
Button.displayName = 'Button';
