import { useState, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { excelImportService, ImportResult, ImportPreview } from '../services/excelImportService';
import { useToast } from './use-toast';

export interface UseExcelImportReturn {
  // Estados
  isLoading: boolean;
  preview: ImportPreview | null;
  importResult: ImportResult | null;

  // Ações
  parseFile: (file: File) => Promise<void>;
  importData: (updateExisting?: boolean) => Promise<void>;  // ATUALIZADO: Parâmetro opcional
  downloadTemplate: () => void;
  downloadReport: () => void;
  clearPreview: () => void;

  // Mutações
  parseFileMutation: any;
  importDataMutation: any;
}

export function useExcelImport(): UseExcelImportReturn {
  const { toast } = useToast();
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  // Mutação para fazer parse do arquivo
  const parseFileMutation = useMutation({
    mutationFn: async (file: File) => {
      return await excelImportService.parseExcelFile(file);
    },
    onSuccess: (data) => {
      setPreview(data);
      setImportResult(null);

      if (data.isValid) {
        toast({
          title: "Arquivo processado com sucesso",
          description: `${data.data.length} linhas encontradas e validadas.`,
        });
      } else {
        toast({
          title: "Arquivo processado com erros",
          description: `${data.validationErrors.length} erros de validação encontrados.`,
          variant: "destructive",
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao processar arquivo",
        description: error.message,
        variant: "destructive",
      });
      setPreview(null);
    }
  });

  // Mutação para importar os dados
  const importDataMutation = useMutation({
    mutationFn: async (updateExisting: boolean = false) => {
      if (!preview || !preview.isValid) {
        throw new Error('Nenhum dado válido para importar');
      }
      return await excelImportService.importData(preview.data, updateExisting);
    },
    onSuccess: (result) => {
      setImportResult(result);

      if (result.success) {
        const message = result.updatedCount > 0
          ? `${result.createdCount} empresas criadas e ${result.updatedCount} atualizadas.`
          : `${result.successCount} empresas importadas.`;
        
        toast({
          title: "Importação concluída com sucesso",
          description: message,
        });
      } else {
        const message = result.updatedCount > 0
          ? `${result.createdCount} criadas, ${result.updatedCount} atualizadas, ${result.errorCount} erros.`
          : `${result.successCount} sucessos, ${result.errorCount} erros.`;
        
        toast({
          title: "Importação concluída com erros",
          description: message,
          variant: "destructive",
        });
      }
    },
    onError: (error: Error) => {
      toast({
        title: "Erro na importação",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Função para fazer parse do arquivo
  const parseFile = useCallback(async (file: File) => {
    await parseFileMutation.mutateAsync(file);
  }, [parseFileMutation]);

  // Função para importar os dados
  const importData = useCallback(async (updateExisting: boolean = false) => {
    await importDataMutation.mutateAsync(updateExisting);
  }, [importDataMutation]);

  // Função para baixar template
  const downloadTemplate = useCallback(() => {
    try {
      const blob = excelImportService.generateTemplate();
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'template_empresas.xlsx';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "Template baixado",
        description: "Template Excel baixado com sucesso.",
      });
    } catch (error) {
      toast({
        title: "Erro ao baixar template",
        description: "Não foi possível gerar o template.",
        variant: "destructive",
      });
    }
  }, [toast]);

  // Função para baixar relatório
  const downloadReport = useCallback(() => {
    if (!importResult) {
      toast({
        title: "Nenhum relatório disponível",
        description: "Execute uma importação primeiro.",
        variant: "destructive",
      });
      return;
    }

    try {
      const blob = excelImportService.generateImportReport(importResult);
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `relatorio_importacao_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "Relatório baixado",
        description: "Relatório de importação baixado com sucesso.",
      });
    } catch (error) {
      toast({
        title: "Erro ao baixar relatório",
        description: "Não foi possível gerar o relatório.",
        variant: "destructive",
      });
    }
  }, [importResult, toast]);

  // Função para limpar preview
  const clearPreview = useCallback(() => {
    setPreview(null);
    setImportResult(null);
  }, []);

  return {
    // Estados
    isLoading: parseFileMutation.isPending || importDataMutation.isPending,
    preview,
    importResult,

    // Ações
    parseFile,
    importData,
    downloadTemplate,
    downloadReport,
    clearPreview,

    // Mutações
    parseFileMutation,
    importDataMutation,
  };
}