import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Download,
  Upload,
  FileSpreadsheet,
  FileText,
  ChevronDown,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { EmpresaClienteCompleta } from '@/types/clientBooks';
import { exportEmpresasToExcel, exportEmpresasToPDF } from '@/utils/empresasExportUtils';
import { useExcelImport } from '@/hooks/useExcelImport';
import { toast } from 'sonner';

interface EmpresaImportExportButtonsProps {
  empresas: EmpresaClienteCompleta[];
  onImportComplete?: () => void;
  isImporting?: boolean;
}

export function EmpresaImportExportButtons({
  empresas,
  onImportComplete,
  isImporting = false
}: EmpresaImportExportButtonsProps) {
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [updateExisting, setUpdateExisting] = useState(false); // NOVO: Estado para controlar modo de atualização
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    isLoading,
    preview,
    importResult,
    parseFile,
    importData,
    downloadTemplate,
    clearPreview,
  } = useExcelImport();

  // Mostrar dialog quando há preview ou resultado
  useEffect(() => {
    if (preview || importResult) {
      setShowImportDialog(true);
    } else if (!isLoading) {
      // Fechar dialog se não há preview, resultado e não está carregando
      setShowImportDialog(false);
    }
  }, [preview, importResult, isLoading]);

  // Chamar onImportComplete quando a importação for bem-sucedida
  useEffect(() => {
    if (importResult && importResult.successCount > 0) {
      onImportComplete?.();
    }
  }, [importResult, onImportComplete]);

  const handleExportExcel = async () => {
    try {
      if (empresas.length === 0) {
        toast.warning('Nenhuma empresa encontrada para exportar');
        return;
      }
      await exportEmpresasToExcel(empresas);
      toast.success('Dados de empresas exportados para Excel com sucesso!');
    } catch (error) {
      toast.error('Erro ao exportar dados de empresas para Excel');
      console.error('Erro na exportação Excel:', error);
    }
  };

  const handleExportPDF = async () => {
    try {
      if (empresas.length === 0) {
        toast.warning('Nenhuma empresa encontrada para exportar');
        return;
      }
      await exportEmpresasToPDF(empresas);
      toast.success('Relatório PDF gerado com sucesso!');
    } catch (error) {
      toast.error('Erro ao gerar relatório PDF');
      console.error('Erro na exportação PDF:', error);
    }
  };

  const handleDownloadTemplate = () => {
    try {
      downloadTemplate();
      toast.success('Template de importação baixado com sucesso!');
    } catch (error) {
      toast.error('Erro ao baixar template');
      console.error('Erro no download do template:', error);
    }
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Verificar se é um arquivo Excel
    if (!file.name.match(/\.(xlsx|xls)$/i)) {
      toast.error('Por favor, selecione um arquivo Excel (.xlsx ou .xls)');
      return;
    }

    try {
      // Usar o hook de importação existente
      await parseFile(file);

      // Limpar input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

    } catch (error) {
      toast.error(`Erro ao processar arquivo: ${error}`);
      console.error('Erro na importação:', error);
    }
  };

  const handleImport = async () => {
    try {
      await importData(updateExisting); // ATUALIZADO: Passar parâmetro updateExisting
      onImportComplete?.();
      //toast.success('Empresas importadas com sucesso!');
    } catch (error) {
      toast.error('Erro ao importar empresas');
      console.error('Erro na importação:', error);
    }
  };

  const handleCancel = () => {
    clearPreview();
    setShowImportDialog(false);
  };



  const closeImportDialog = () => {
    clearPreview();
    setShowImportDialog(false);
  };

  const renderImportContent = () => {
    if (importResult) {
      const hasUpdates = importResult.updatedCount && importResult.updatedCount > 0;
      
      return (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-500" />
            <span className="font-medium">Importação concluída!</span>
          </div>

          <div className="bg-gray-50 p-4 rounded-lg space-y-2">
            <div className="flex justify-between">
              <span>Total processado:</span>
              <span className="font-medium">{importResult.totalRows}</span>
            </div>
            {hasUpdates ? (
              <>
                <div className="flex justify-between">
                  <span>Empresas criadas:</span>
                  <span className="font-medium text-green-600">{importResult.createdCount}</span>
                </div>
                <div className="flex justify-between">
                  <span>Empresas atualizadas:</span>
                  <span className="font-medium text-blue-600">{importResult.updatedCount}</span>
                </div>
              </>
            ) : (
              <div className="flex justify-between">
                <span>Sucessos:</span>
                <span className="font-medium text-green-600">{importResult.successCount}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span>Erros:</span>
              <span className="font-medium text-red-600">{importResult.errorCount}</span>
            </div>
          </div>

          {importResult.errors && importResult.errors.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-red-600">
                <AlertCircle className="h-4 w-4" />
                <span className="font-medium">Erros encontrados:</span>
              </div>
              <div className="bg-red-50 p-3 rounded-lg max-h-32 overflow-y-auto">
                {importResult.errors.map((error, index) => (
                  <div key={index} className="text-sm text-red-700">
                    Linha {error.row}: {error.message}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => {
              clearPreview();
              // Não fechar o dialog para permitir nova importação
            }}>
              Nova Importação
            </Button>
            <Button onClick={closeImportDialog}>
              Fechar
            </Button>
          </div>
        </div>
      );
    }

    if (preview) {
      const hasDuplicates = preview.duplicates && preview.duplicates.length > 0;
      
      return (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">Preview dos dados:</h4>
            <p className="text-sm text-blue-800">
              {preview.data.length} linhas encontradas
              {preview.validationErrors.length > 0 && ` (${preview.validationErrors.length} erros)`}
            </p>
          </div>

          {/* NOVO: Aviso sobre duplicatas */}
          {hasDuplicates && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-orange-600 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-medium text-orange-900 mb-1">
                    {preview.duplicates.length} {preview.duplicates.length === 1 ? 'empresa já existe' : 'empresas já existem'} no sistema
                  </h4>
                  <p className="text-sm text-orange-800 mb-3">
                    Você pode optar por atualizar os dados dessas empresas ou apenas criar as novas.
                  </p>
                  
                  {/* Lista de duplicatas (máximo 5) */}
                  <div className="bg-white rounded p-2 mb-3 max-h-24 overflow-y-auto">
                    {preview.duplicates.slice(0, 5).map((dup, index) => (
                      <div key={index} className="text-xs text-gray-700 py-1">
                        • Linha {dup.row}: <span className="font-medium">{dup.nomeCompleto}</span>
                      </div>
                    ))}
                    {preview.duplicates.length > 5 && (
                      <div className="text-xs text-gray-500 py-1">
                        ... e mais {preview.duplicates.length - 5} {preview.duplicates.length - 5 === 1 ? 'empresa' : 'empresas'}
                      </div>
                    )}
                  </div>

                  {/* NOVO: Checkbox para atualizar empresas existentes */}
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={updateExisting}
                      onChange={(e) => setUpdateExisting(e.target.checked)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-900">
                      Atualizar empresas existentes com os dados do Excel
                    </span>
                  </label>
                  
                  {updateExisting && (
                    <p className="text-xs text-orange-700 mt-2 ml-6">
                      ⚠️ Os dados atuais dessas empresas serão sobrescritos pelos dados do Excel.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {preview.validationErrors && preview.validationErrors.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-red-600">
                <AlertCircle className="h-4 w-4" />
                <span className="font-medium">Erros de validação:</span>
              </div>
              <div className="bg-red-50 p-3 rounded-lg max-h-32 overflow-y-auto">
                {preview.validationErrors.map((error, index) => (
                  <div key={index} className="text-sm text-red-700">
                    Linha {error.row}: {error.message}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleCancel}>
              Cancelar
            </Button>
            <Button
              onClick={handleImport}
              disabled={isLoading || !preview.isValid || preview.data.length === 0}
            >
              {isLoading ? 'Importando...' : (
                hasDuplicates && updateExisting
                  ? `Importar e Atualizar ${preview.data.length} empresas`
                  : `Importar ${preview.data.length - (preview.duplicates?.length || 0)} empresas`
              )}
            </Button>
          </div>
        </div>
      );
    }

    // Loading state
    return (
      <div className="space-y-4 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
        <p className="text-sm text-gray-600">Processando arquivo Excel...</p>
      </div>
    );
  };

  return (
    <>
      <div className="flex gap-2">
        {/* Botão de Exportação */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Exportar
              <ChevronDown className="h-4 w-4 ml-2" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleExportExcel}>
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Exportar para Excel
            </DropdownMenuItem>
            <DropdownMenuItem onClick={handleExportPDF}>
              <FileText className="mr-2 h-4 w-4" />
              Exportar para PDF
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Botão de Importação */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" disabled={isImporting || isLoading}>
              <Upload className="h-4 w-4 mr-2" />
              {isImporting || isLoading ? 'Importando...' : 'Importar'}
              <ChevronDown className="h-4 w-4 ml-2" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={handleDownloadTemplate}>
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Baixar Template Excel
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleImportClick}>
              <Upload className="mr-2 h-4 w-4" />
              Importar do Excel
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Input de arquivo oculto */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".xlsx,.xls"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Dialog de importação */}
      <Dialog open={showImportDialog} onOpenChange={closeImportDialog}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Importação de Empresas via Excel</DialogTitle>
            <DialogDescription>
              {importResult
                ? "Resultado da importação"
                : preview
                  ? "Revise os dados antes de confirmar a importação"
                  : "Processando arquivo Excel..."
              }
            </DialogDescription>
          </DialogHeader>

          {renderImportContent()}
        </DialogContent>
      </Dialog>
    </>
  );
}