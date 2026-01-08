import React, { useState } from 'react';
import { Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface MonthYearPickerProps {
  value?: string; // Formato MM/YYYY
  onChange: (value: string | undefined) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  format?: string ;
  allowFuture?: boolean;
}

export function MonthYearPicker({
  value,
  onChange,
  placeholder = "Selecione mês/ano",
  className,
  disabled = false,
}: MonthYearPickerProps) {
  const [open, setOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<string>('');

  // Inicializar valores se value estiver definido
  React.useEffect(() => {
    if (value && value.includes('/')) {
      const [month, year] = value.split('/');
      setSelectedMonth(month);
      setSelectedYear(year);
    } else {
      setSelectedMonth('');
      setSelectedYear('');
    }
  }, [value]);

  const meses = [
    { value: '01', label: 'Janeiro' },
    { value: '02', label: 'Fevereiro' },
    { value: '03', label: 'Março' },
    { value: '04', label: 'Abril' },
    { value: '05', label: 'Maio' },
    { value: '06', label: 'Junho' },
    { value: '07', label: 'Julho' },
    { value: '08', label: 'Agosto' },
    { value: '09', label: 'Setembro' },
    { value: '10', label: 'Outubro' },
    { value: '11', label: 'Novembro' },
    { value: '12', label: 'Dezembro' },
  ];

  // Gerar anos (a partir de 2024 até 5 anos à frente do ano atual)
  const currentYear = new Date().getFullYear();
  const startYear = 2024; // Ano inicial fixo
  const endYear = currentYear + 5; // 5 anos à frente do ano atual
  const totalYears = endYear - startYear + 1;
  
  const anos = Array.from({ length: totalYears }, (_, i) => {
    const year = startYear + i;
    return { value: year.toString(), label: year.toString() };
  });

  const handleMonthChange = (month: string) => {
    setSelectedMonth(month);
    if (month && selectedYear) {
      const newValue = `${month}/${selectedYear}`;
      onChange(newValue);
      setOpen(false);
    }
  };

  const handleYearChange = (year: string) => {
    setSelectedYear(year);
    if (selectedMonth && year) {
      const newValue = `${selectedMonth}/${year}`;
      onChange(newValue);
      setOpen(false);
    }
  };

  const displayText = value 
    ? (() => {
        const [month, year] = value.split('/');
        const mesObj = meses.find(m => m.value === month);
        return mesObj ? `${mesObj.label} ${year}` : value;
      })()
    : placeholder;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-between h-10 text-left font-normal",
            !value && "text-muted-foreground",
            className
          )}
          disabled={disabled}
        >
          <span className="truncate">{displayText}</span>
          <Calendar className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-4" align="start">
        <div className="space-y-4">
          <div className="text-sm font-medium">Selecionar Mês/Ano</div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-600">Mês</label>
              <Select value={selectedMonth} onValueChange={handleMonthChange}>
                <SelectTrigger className="h-8">
                  <SelectValue placeholder="Mês" />
                </SelectTrigger>
                <SelectContent>
                  {meses.map((mes) => (
                    <SelectItem key={mes.value} value={mes.value}>
                      {mes.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-600">Ano</label>
              <Select value={selectedYear} onValueChange={handleYearChange}>
                <SelectTrigger className="h-8">
                  <SelectValue placeholder="Ano" />
                </SelectTrigger>
                <SelectContent>
                  {anos.map((ano) => (
                    <SelectItem key={ano.value} value={ano.value}>
                      {ano.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}