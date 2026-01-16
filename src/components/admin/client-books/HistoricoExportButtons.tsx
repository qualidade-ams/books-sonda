import React, { useState } from 'react';
import { Download, FileSpreadsheet, FileText, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { exportarHistoricoExcel, exportarHistoricoPDF } from '@/utils/historicoExportUtils';
import type { HistoricoDisparoCompleto } from '@/types/clientBooks';

interface HistoricoExportButtonsProps {
  historico: HistoricoDisparoCompleto[];
  disabled?: boolean;
}

export function HistoricoExportButtons({
  historico,
  disabled = false
}: HistoricoExportButtonsProps) {
  const { toast } = useToast();
  const [isExporting, setIsExporting] = useState(false);

  const handleExportExcel = async () => {
    if (disabled || historico.length === 0) {
      toast({
        title: "Erro",
        description: "Não há dados para exportar",
        variant: "destructive"
      });
      return;
    }

    setIsExporting(true);
    try {
      const resultado = exportarHistoricoExcel(historico);
      
      if (resultado.success) {
        toast({
          title: "Sucesso!",
          description: resultado.message
        });
      } else {
        toast({
          title: "Erro",
          description: resultado.error || 'Erro ao exportar para Excel',
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Erro na exportação Excel:', error);
      toast({
        title: "Erro",
        description: "Erro inesperado ao exportar para Excel",
        variant: "destructive"
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportPDF = async () => {
    if (disabled || historico.length === 0) {
      toast({
        title: "Erro",
        description: "Não há dados para exportar",
        variant: "destructive"
      });
      return;
    }

    setIsExporting(true);
    try {
      const resultado = exportarHistoricoPDF(historico);
      
      if (resultado.success) {
        toast({
          title: "Sucesso!",
          description: resultado.message
        });
      } else {
        toast({
          title: "Erro",
          description: resultado.error || 'Erro ao exportar para PDF',
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Erro na exportação PDF:', error);
      toast({
        title: "Erro",
        description: "Erro inesperado ao exportar para PDF",
        variant: "destructive"
      });
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
          disabled={disabled || isExporting || historico.length === 0}
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

export default HistoricoExportButtons;
