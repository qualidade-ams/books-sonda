import React, { useState } from 'react';
import { Download, Upload } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../../ui/dialog';
import { Button } from '../../ui/button';
import { useExcelImport } from '../../../hooks/useExcelImport';
import { ExcelUpload } from './ExcelUpload';
import { ExcelPreview } from './ExcelPreview';
import { ImportResult } from './ImportResult';

interface ExcelImportDialogProps {
  trigger?: React.ReactNode;
  onImportComplete?: () => void;
}

export function ExcelImportDialog({ trigger, onImportComplete }: ExcelImportDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const {
    isLoading,
    preview,
    importResult,
    parseFile,
    importData,
    downloadTemplate,
    downloadReport,
    clearPreview,
  } = useExcelImport();

  const handleFileSelect = async (file: File) => {
    await parseFile(file);
  };

  const handleImport = async () => {
    await importData();
    onImportComplete?.();
  };

  const handleCancel = () => {
    clearPreview();
  };

  const handleNewImport = () => {
    clearPreview();
  };

  const handleClose = () => {
    setIsOpen(false);
    clearPreview();
  };

  const renderContent = () => {
    if (importResult) {
      return (
        <ImportResult
          result={importResult}
          onDownloadReport={downloadReport}
          onNewImport={handleNewImport}
        />
      );
    }

    if (preview) {
      return (
        <ExcelPreview
          preview={preview}
          onImport={handleImport}
          onCancel={handleCancel}
          isImporting={isLoading}
        />
      );
    }

    return (
      <div className="space-y-6">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">
            Faça o upload de um arquivo Excel com os dados das empresas para importação em lote.
          </p>
          
          <Button
            variant="outline"
            onClick={downloadTemplate}
            className="mb-6"
          >
            <Download className="h-4 w-4 mr-2" />
            Baixar Template Excel
          </Button>
        </div>

        <ExcelUpload
          onFileSelect={handleFileSelect}
          isLoading={isLoading}
        />

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 mb-2">Instruções:</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Baixe o template Excel e preencha com os dados das empresas</li>
            <li>• Certifique-se de que todos os campos obrigatórios estão preenchidos</li>
            <li>• Para produtos, use: CE_PLUS, FISCAL, GALLERY (separados por vírgula)</li>
            <li>• Para grupos, use os nomes dos grupos cadastrados (separados por vírgula)</li>
            <li>• O sistema validará os dados antes da importação</li>
          </ul>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button>
            <Upload className="h-4 w-4 mr-2" />
            Importar Excel
          </Button>
        )}
      </DialogTrigger>
      
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Importação de Empresas via Excel</DialogTitle>
          <DialogDescription>
            {importResult
              ? "Resultado da importação"
              : preview
              ? "Revise os dados antes de confirmar a importação"
              : "Selecione um arquivo Excel para importar empresas em lote"
            }
          </DialogDescription>
        </DialogHeader>

        {renderContent()}
      </DialogContent>
    </Dialog>
  );
}