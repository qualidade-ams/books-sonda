import React, { useState } from 'react';
import { Download, FileSpreadsheet, FileText, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { exportarFaturamentoExcel, exportarFaturamentoPDF } from '@/utils/faturamentoExportUtils';

interface RequerimentosAgrupados {
  [key: string]: {
    tipo: string;
    requerimentos: any[];
    totalHoras: string;
    totalValor: number;
    quantidade: number;
  };
}

interface EstatisticasPeriodo {
  totalRequerimentos: number;
  totalHoras: string;
  tiposAtivos: number;
  valorTotalFaturavel: number;
}

interface FaturamentoExportButtonsProps {
  requerimentosAgrupados: RequerimentosAgrupados;
  estatisticas: EstatisticasPeriodo;
  mesNome: string;
  ano: number;
  disabled?: boolean;
}

export function FaturamentoExportButtons({
  requerimentosAgrupados,
  estatisticas,
  mesNome,
  ano,
  disabled = false
}: FaturamentoExportButtonsProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExportExcel = async () => {
    if (disabled || estatisticas.totalRequerimentos === 0) {
      toast.error('Não há dados para exportar no período selecionado');
      return;
    }

    setIsExporting(true);
    try {
      const resultado = exportarFaturamentoExcel(requerimentosAgrupados, estatisticas, mesNome, ano);
      
      if (resultado.success) {
        toast.success(resultado.message);
      } else {
        toast.error(resultado.error || 'Erro ao exportar para Excel');
      }
    } catch (error) {
      console.error('Erro na exportação Excel:', error);
      toast.error('Erro inesperado ao exportar para Excel');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportPDF = async () => {
    if (disabled || estatisticas.totalRequerimentos === 0) {
      toast.error('Não há dados para exportar no período selecionado');
      return;
    }

    setIsExporting(true);
    try {
      const resultado = exportarFaturamentoPDF(requerimentosAgrupados, estatisticas, mesNome, ano);
      
      if (resultado.success) {
        toast.success(resultado.message);
      } else {
        toast.error(resultado.error || 'Erro ao exportar para PDF');
      }
    } catch (error) {
      console.error('Erro na exportação PDF:', error);
      toast.error('Erro inesperado ao exportar para PDF');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="outline" 
          size="sm"
          disabled={disabled || isExporting || estatisticas.totalRequerimentos === 0}
        >
          <Download className="h-4 w-4 mr-2" />
          {isExporting ? 'Exportando...' : 'Exportar'}
          <ChevronDown className="h-4 w-4 ml-2" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem 
          onClick={handleExportExcel}
          disabled={isExporting}
        >
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          Exportar para Excel
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={handleExportPDF}
          disabled={isExporting}
        >
          <FileText className="mr-2 h-4 w-4" />
          Exportar para PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default FaturamentoExportButtons;