import React, { useState } from 'react';
import { Calendar } from 'lucide-react';
import { useTranslation } from 'react-i18next';
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
  placeholder,
  className,
  disabled = false,
}: MonthYearPickerProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<string>('');

  const defaultPlaceholder = placeholder || t('monthPicker.selectMonthYear');

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
    { value: '01', label: t('monthPicker.months.january') },
    { value: '02', label: t('monthPicker.months.february') },
    { value: '03', label: t('monthPicker.months.march') },
    { value: '04', label: t('monthPicker.months.april') },
    { value: '05', label: t('monthPicker.months.may') },
    { value: '06', label: t('monthPicker.months.june') },
    { value: '07', label: t('monthPicker.months.july') },
    { value: '08', label: t('monthPicker.months.august') },
    { value: '09', label: t('monthPicker.months.september') },
    { value: '10', label: t('monthPicker.months.october') },
    { value: '11', label: t('monthPicker.months.november') },
    { value: '12', label: t('monthPicker.months.december') },
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
    : defaultPlaceholder;

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
          <div className="text-sm font-medium">{t('monthPicker.title')}</div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-600">{t('monthPicker.month')}</label>
              <Select value={selectedMonth} onValueChange={handleMonthChange}>
                <SelectTrigger className="h-8">
                  <SelectValue placeholder={t('monthPicker.month')} />
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
              <label className="text-xs font-medium text-gray-600">{t('monthPicker.year')}</label>
              <Select value={selectedYear} onValueChange={handleYearChange}>
                <SelectTrigger className="h-8">
                  <SelectValue placeholder={t('monthPicker.year')} />
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
