/**
 * Componente de botões de exportação para elogios
 * Seguindo o padrão do sistema
 */

import { useState } from 'react';
import { Download, FileSpreadsheet, FileText, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { exportarElogiosExcel, exportarElogiosPDF } from '@/utils/elogiosExportUtils';
import type { ElogioCompleto } from '@/types/elogios';
import type { DeParaCategoria } from '@/types/deParaCategoria';

interface ElogiosExportButtonsProps {
  elogios: ElogioCompleto[];
  periodo: string;
  deParaCategorias?: DeParaCategoria[];
  empresas?: Array<{ nome_completo: string; nome_abreviado: string }>;
  disabled?: boolean;
}

export default function ElogiosExportButtons({ 
  elogios, 
  periodo, 
  deParaCategorias = [],
  empresas = [],
  disabled = false 
}: ElogiosExportButtonsProps) {
  const [isExporting, setIsExporting] = useState(false);
  const { toast } = useToast();

  // Debug temporário
  console.log('📊 ElogiosExportButtons:', {
    totalElogios: elogios.length,
    periodo,
    disabled
  });

  const handleExportExcel = async () => {
    if (elogios.length === 0) {
      toast({
        title: "Aviso",
        description: "Não há elogios para exportar",
        variant: "destructive"
      });
      return;
    }

    setIsExporting(true);
    try {
      const resultado = exportarElogiosExcel(elogios, periodo, deParaCategorias, empresas);
      
      if (resultado.success) {
        toast({
          title: "Sucesso",
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
        description: 'Erro inesperado ao exportar para Excel',
        variant: "destructive"
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportPDF = async () => {
    if (elogios.length === 0) {
      toast({
        title: "Aviso",
        description: "Não há elogios para exportar",
        variant: "destructive"
      });
      return;
    }

    setIsExporting(true);
    try {
      const resultado = exportarElogiosPDF(elogios, periodo, deParaCategorias, empresas);
      
      if (resultado.success) {
        toast({
          title: "Sucesso",
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
        description: 'Erro inesperado ao exportar para PDF',
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
          disabled={disabled || isExporting || elogios.length === 0}
          className="flex items-center gap-2"
        >
          <Download className="h-4 w-4" />
          {isExporting ? 'Exportando...' : 'Exportar'}
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem 
          onClick={handleExportExcel}
          disabled={isExporting || elogios.length === 0}
        >
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          Exportar para Excel
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={handleExportPDF}
          disabled={isExporting || elogios.length === 0}
        >
          <FileText className="mr-2 h-4 w-4" />
          Exportar para PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}