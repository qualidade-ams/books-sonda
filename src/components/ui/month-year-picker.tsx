import React, { useState } from 'react';
import { Calendar, AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface MonthYearPickerProps {
  value?: string; // Formato MM/YYYY
  onChange: (value: string | undefined) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  format?: string ;
  allowFuture?: boolean;
  /** Se true, exibe modal de confirmação quando período selecionado for diferente do atual */
  confirmDifferentPeriod?: boolean;
}

export function MonthYearPicker({
  value,
  onChange,
  placeholder,
  className,
  disabled = false,
  confirmDifferentPeriod = false,
}: MonthYearPickerProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingValue, setPendingValue] = useState<string>('');

  const defaultPlaceholder = placeholder || t('monthPicker.selectMonthYear');

  // Mês e ano correntes
  const now = new Date();
  const currentMonth = String(now.getMonth() + 1).padStart(2, '0');
  const currentYear = now.getFullYear().toString();

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

  // Ao abrir o popover, setar apenas o ano corrente se não houver valor selecionado
  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen && !selectedMonth && !selectedYear) {
      setSelectedYear(currentYear);
    }
    setOpen(isOpen);
  };

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

  // Gerar anos: apenas 2025, 2026 e 2027
  const anos = [
    { value: '2025', label: '2025' },
    { value: '2026', label: '2026' },
    { value: '2027', label: '2027' },
  ];

  // Verifica se o período selecionado é diferente do corrente
  const isDifferentFromCurrent = (month: string, year: string): boolean => {
    return month !== currentMonth || year !== currentYear;
  };

  // Confirma a seleção do período
  const confirmSelection = (newValue: string) => {
    const [month, year] = newValue.split('/');
    if (confirmDifferentPeriod && isDifferentFromCurrent(month, year)) {
      setPendingValue(newValue);
      setShowConfirmDialog(true);
    } else {
      onChange(newValue);
      setOpen(false);
    }
  };

  // Usuário confirmou no modal
  const handleConfirm = () => {
    onChange(pendingValue);
    setShowConfirmDialog(false);
    setOpen(false);
  };

  // Usuário cancelou no modal
  const handleCancelConfirm = () => {
    // Resetar para mês/ano corrente
    setSelectedMonth(currentMonth);
    setSelectedYear(currentYear);
    setPendingValue('');
    setShowConfirmDialog(false);
  };

  const handleMonthChange = (month: string) => {
    setSelectedMonth(month);
    if (month && selectedYear) {
      const newValue = `${month}/${selectedYear}`;
      confirmSelection(newValue);
    }
  };

  const handleYearChange = (year: string) => {
    setSelectedYear(year);
    if (selectedMonth && year) {
      const newValue = `${selectedMonth}/${year}`;
      confirmSelection(newValue);
    }
  };

  // Texto para exibição do período pendente no modal
  const getPendingDisplayText = () => {
    if (!pendingValue) return '';
    const [month, year] = pendingValue.split('/');
    const mesObj = meses.find(m => m.value === month);
    return mesObj ? `${mesObj.label} ${year}` : pendingValue;
  };

  const getCurrentDisplayText = () => {
    const mesObj = meses.find(m => m.value === currentMonth);
    return mesObj ? `${mesObj.label} ${currentYear}` : `${currentMonth}/${currentYear}`;
  };

  const displayText = value 
    ? (() => {
        const [month, year] = value.split('/');
        const mesObj = meses.find(m => m.value === month);
        return mesObj ? `${mesObj.label} ${year}` : value;
      })()
    : defaultPlaceholder;

  return (
    <>
      <Popover open={open} onOpenChange={handleOpenChange}>
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

      {/* Modal de confirmação para período diferente do atual */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-orange-600">
              <AlertTriangle className="h-5 w-5" />
              Atenção - Período diferente do atual
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                Você está selecionando o período <strong className="text-gray-900">{getPendingDisplayText()}</strong>, 
                que é diferente do período atual (<strong className="text-gray-900">{getCurrentDisplayText()}</strong>).
              </p>
              <p>
                Deseja confirmar a seleção deste período?
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancelConfirm}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirm}
              className="bg-sonda-blue hover:bg-sonda-dark-blue"
            >
              Sim, estou ciente
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
