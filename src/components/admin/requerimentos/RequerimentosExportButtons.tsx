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
import { exportarRequerimentosExcel, exportarRequerimentosPDF } from '@/utils/requerimentosExportUtils';
import { Requerimento } from '@/types/requerimentos';

interface EstatisticasRequerimentos {
  total: number;
  totalHoras: string;
  horasSelecionados: string;
  valorSelecionados: number;
  selecionados: number;
  porTipo: Record<string, { quantidade: number; horas: string }>;
}

interface RequerimentosExportButtonsProps {
  requerimentos: Requerimento[];
  requerimentosEnviados: Requerimento[];
  estatisticas: EstatisticasRequerimentos;
  disabled?: boolean;
}

export function RequerimentosExportButtons({
  requerimentos,
  requerimentosEnviados,
  estatisticas,
  disabled = false
}: RequerimentosExportButtonsProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExportExcel = async () => {
    if (disabled || (requerimentos.length === 0 && requerimentosEnviados.length === 0)) {
      toast.error('Não há dados para exportar');
      return;
    }

    setIsExporting(true);
    try {
      const resultado = exportarRequerimentosExcel(requerimentos, requerimentosEnviados, estatisticas);
      
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
    if (disabled || (requerimentos.length === 0 && requerimentosEnviados.length === 0)) {
      toast.error('Não há dados para exportar');
      return;
    }

    setIsExporting(true);
    try {
      const resultado = exportarRequerimentosPDF(requerimentos, requerimentosEnviados, estatisticas);
      
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
          disabled={disabled || isExporting || (requerimentos.length === 0 && requerimentosEnviados.length === 0)}
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

export default RequerimentosExportButtons;