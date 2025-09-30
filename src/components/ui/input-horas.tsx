import React, { useState, useEffect, forwardRef } from 'react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { 
  validarFormatoHoras, 
  normalizarEntradaHoras, 
  formatarHorasParaExibicao,
  converterParaHorasDecimal 
} from '@/utils/horasUtils';

interface InputHorasProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  value?: string | number;
  onChange?: (value: string, horasDecimal: number) => void;
  placeholder?: string;
  showFormat?: boolean;
  formatoExibicao?: 'HHMM' | 'decimal' | 'completo';
}

export const InputHoras = forwardRef<HTMLInputElement, InputHorasProps>(
  ({ 
    value = '', 
    onChange, 
    placeholder = 'Ex: 111:30 ou 120',
    showFormat = true,
    formatoExibicao = 'HHMM',
    className,
    ...props 
  }, ref) => {
    const [inputValue, setInputValue] = useState<string>('');
    const [isValid, setIsValid] = useState<boolean>(true);
    const [isFocused, setIsFocused] = useState<boolean>(false);

    // Sincronizar com valor externo
    useEffect(() => {
      if (typeof value === 'number') {
        // Se receber número, converte para formato HH:MM
        if (value === 0) {
          setInputValue('');
        } else {
          const horas = Math.floor(value);
          setInputValue(`${horas}:00`);
        }
      } else {
        setInputValue(value || '');
      }
    }, [value]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const novoValor = e.target.value;
      setInputValue(novoValor);

      // Validar formato
      const valido = validarFormatoHoras(novoValor);
      setIsValid(valido);

      // Chamar onChange se válido
      if (valido && onChange) {
        try {
          const horasDecimal = converterParaHorasDecimal(novoValor);
          onChange(novoValor, horasDecimal);
        } catch (error) {
          setIsValid(false);
        }
      }
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(false);
      
      // Normalizar formato ao perder foco
      if (inputValue && isValid) {
        try {
          const normalizado = normalizarEntradaHoras(inputValue);
          setInputValue(normalizado);
          
          if (onChange) {
            const horasDecimal = converterParaHorasDecimal(normalizado);
            onChange(normalizado, horasDecimal);
          }
        } catch (error) {
          setIsValid(false);
        }
      }

      // Chamar onBlur original se existir
      if (props.onBlur) {
        props.onBlur(e);
      }
    };

    const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
      setIsFocused(true);
      
      // Chamar onFocus original se existir
      if (props.onFocus) {
        props.onFocus(e);
      }
    };

    // Formatação para exibição quando não está focado
    const valorExibicao = isFocused ? inputValue : (
      inputValue && isValid ? formatarHorasParaExibicao(inputValue, formatoExibicao) : inputValue
    );

    return (
      <div className="space-y-1">
        <Input
          ref={ref}
          {...props}
          value={valorExibicao}
          onChange={handleInputChange}
          onBlur={handleBlur}
          onFocus={handleFocus}
          placeholder={placeholder}
          className={cn(
            className,
            !isValid && 'border-red-500 focus:border-red-500',
            isValid && inputValue && 'border-green-500'
          )}
        />
      </div>
    );
  }
);

InputHoras.displayName = 'InputHoras';