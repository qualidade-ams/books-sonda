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
import { exportarPesquisasExcel, exportarPesquisasPDF } from '@/utils/pesquisasExportUtils';
import { Pesquisa, EstatisticasPesquisas } from '@/types/pesquisasSatisfacao';

interface PesquisasExportButtonsProps {
  pesquisas: Pesquisa[];
  estatisticas: EstatisticasPesquisas;
  disabled?: boolean;
}

export function PesquisasExportButtons({
  pesquisas,
  estatisticas,
  disabled = false
}: PesquisasExportButtonsProps) {
  const [isExporting, setIsExporting] = useState(false);

  const handleExportExcel = async () => {
    if (disabled || pesquisas.length === 0) {
      toast.error('Não há dados para exportar');
      return;
    }

    setIsExporting(true);
    try {
      const resultado = exportarPesquisasExcel(pesquisas, estatisticas);
      
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
    if (disabled || pesquisas.length === 0) {
      toast.error('Não há dados para exportar');
      return;
    }

    setIsExporting(true);
    try {
      const resultado = exportarPesquisasPDF(pesquisas, estatisticas);
      
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
          disabled={disabled || isExporting || pesquisas.length === 0}
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

export default PesquisasExportButtons;
