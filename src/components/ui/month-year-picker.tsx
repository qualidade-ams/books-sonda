import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface MonthYearPickerProps {
  value?: string | number; // Formato: "YYYY-MM", "MM/YYYY" ou number
  onChange?: (value: string | number) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  format?: 'YYYY-MM' | 'MM/YYYY'; // Formato de saída
  allowFuture?: boolean; // Permitir meses/anos futuros
}

const MESES = [
  { value: 1, label: 'Janeiro' },
  { value: 2, label: 'Fevereiro' },
  { value: 3, label: 'Março' },
  { value: 4, label: 'Abril' },
  { value: 5, label: 'Maio' },
  { value: 6, label: 'Junho' },
  { value: 7, label: 'Julho' },
  { value: 8, label: 'Agosto' },
  { value: 9, label: 'Setembro' },
  { value: 10, label: 'Outubro' },
  { value: 11, label: 'Novembro' },
  { value: 12, label: 'Dezembro' }
];

export function MonthYearPicker({
  value,
  onChange,
  placeholder = "Selecione mês e ano",
  disabled = false,
  className,
  format = 'MM/YYYY',
  allowFuture = true
}: MonthYearPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  // Parse do valor atual
  const parseValue = (val?: string | number) => {
    if (!val) return { mes: undefined, ano: undefined };
    
    // Se é número, assumir que é o mês e usar ano atual
    if (typeof val === 'number') {
      return { mes: val, ano: new Date().getFullYear() };
    }
    
    if (format === 'YYYY-MM') {
      const [ano, mes] = val.split('-');
      return { mes: parseInt(mes), ano: parseInt(ano) };
    } else {
      const [mes, ano] = val.split('/');
      return { mes: parseInt(mes), ano: parseInt(ano) };
    }
  };

  const { mes: mesAtual, ano: anoAtual } = parseValue(value);
  const [mesSelecionado, setMesSelecionado] = useState<number | undefined>(mesAtual || undefined);
  const [anoSelecionado, setAnoSelecionado] = useState<number | undefined>(anoAtual || undefined);

  // Sincronizar estados quando o valor externo mudar
  React.useEffect(() => {
    const { mes, ano } = parseValue(value);
    setMesSelecionado(mes || undefined);
    setAnoSelecionado(ano || undefined);
  }, [value, format]);

  // Gerar anos (5 anos para trás e 10 para frente se allowFuture for true)
  const anoCorrente = new Date().getFullYear();
  const anosDisponiveis = [];
  
  for (let i = anoCorrente - 5; i <= (allowFuture ? anoCorrente + 10 : anoCorrente); i++) {
    anosDisponiveis.push(i);
  }

  // Formatar valor para exibição
  const formatarParaExibicao = (mes?: number, ano?: number) => {
    if (!mes || !ano) return placeholder;
    const nomesMes = MESES.find(m => m.value === mes)?.label || '';
    return `${nomesMes} ${ano}`;
  };

  // Formatar valor para onChange
  const formatarParaOnChange = (mes: number, ano: number) => {
    if (format === 'YYYY-MM') {
      return `${ano}-${String(mes).padStart(2, '0')}`;
    } else {
      return `${String(mes).padStart(2, '0')}/${ano}`;
    }
  };

  const handleConfirmar = () => {
    if (mesSelecionado && anoSelecionado && onChange) {
      const valorFormatado = formatarParaOnChange(mesSelecionado, anoSelecionado);
      onChange(valorFormatado);
      setIsOpen(false);
    }
  };

  const handleLimpar = () => {
    setMesSelecionado(undefined);
    setAnoSelecionado(undefined);
    if (onChange) {
      onChange('');
    }
    setIsOpen(false);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal",
            !value && "text-muted-foreground",
            className
          )}
          disabled={disabled}
        >
          <Calendar className="mr-2 h-4 w-4" />
          {formatarParaExibicao(mesAtual, anoAtual)}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-4" align="start">
        <div className="space-y-4">
          <div className="text-sm font-medium text-center">
            Selecionar Mês e Ano
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            {/* Seletor de Mês */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Mês</label>
              <Select
                value={mesSelecionado?.toString()}
                onValueChange={(value) => setMesSelecionado(parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Mês" />
                </SelectTrigger>
                <SelectContent>
                  {MESES.map((mes) => (
                    <SelectItem key={mes.value} value={mes.value.toString()}>
                      {mes.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Seletor de Ano */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Ano</label>
              <Select
                value={anoSelecionado?.toString()}
                onValueChange={(value) => setAnoSelecionado(parseInt(value))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Ano" />
                </SelectTrigger>
                <SelectContent>
                  {anosDisponiveis.map((ano) => (
                    <SelectItem key={ano} value={ano.toString()}>
                      {ano}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Botões de ação */}
          <div className="flex justify-between gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleLimpar}
            >
              Limpar
            </Button>
            <Button
              size="sm"
              onClick={handleConfirmar}
              disabled={!mesSelecionado || !anoSelecionado}
            >
              Confirmar
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}