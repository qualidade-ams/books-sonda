import React, { useState, useRef } from 'react';
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { 
  Download, 
  Upload, 
  FileSpreadsheet, 
  FileText,
  ChevronDown,
  AlertCircle,
  CheckCircle,
  X
} from 'lucide-react';
import { GrupoResponsavelCompleto, GrupoFormData } from '@/types/clientBooksTypes';
import { 
  exportGruposToExcel, 
  exportGruposToPDF, 
  processImportExcel, 
  processEmailString,
  downloadImportTemplate,
  GrupoImportData 
} from '@/utils/exportUtils';
import { toast } from 'sonner';

interface ImportExportButtonsProps {
  grupos: GrupoResponsavelCompleto[];
  onImportGrupos: (grupos: GrupoFormData[]) => Promise<any>;
  isImporting?: boolean;
}

export function ImportExportButtons({ 
  grupos, 
  onImportGrupos, 
  isImporting = false 
}: ImportExportButtonsProps) {
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResults, setImportResults] = useState<{
    success: number;
    errors: string[];
    total: number;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExportExcel = () => {
    try {
      exportGruposToExcel(grupos);
      toast.success('Dados exportados para Excel com sucesso!');
    } catch (error) {
      toast.error('Erro ao exportar dados para Excel');
      console.error('Erro na exportação Excel:', error);
    }
  };

  const handleExportPDF = () => {
    try {
      exportGruposToPDF(grupos);
      toast.success('Relatório PDF gerado com sucesso!');
    } catch (error) {
      toast.error('Erro ao gerar relatório PDF');
      console.error('Erro na exportação PDF:', error);
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
      setShowImportDialog(true);
      setImportProgress(10);
      setImportResults(null);

      // Processar arquivo
      const importData = await processImportExcel(file);
      setImportProgress(30);

      if (importData.length === 0) {
        throw new Error('Nenhum grupo válido encontrado no arquivo');
      }

      // Converter dados para formato do formulário
      const gruposParaImportar: GrupoFormData[] = [];
      const erros: string[] = [];

      for (let i = 0; i < importData.length; i++) {
        const item = importData[i];
        setImportProgress(30 + (i / importData.length) * 40);

        try {
          // Validar nome obrigatório
          if (!item.nome || item.nome.trim().length === 0) {
            erros.push(`Linha ${i + 2}: Nome do grupo é obrigatório`);
            continue;
          }

          // Processar e-mails
          const emails = processEmailString(item.emails || '');
          
          // Validar se tem pelo menos um e-mail válido
          if (emails.length === 0) {
            erros.push(`Linha ${i + 2}: Grupo "${item.nome}" não possui e-mails válidos`);
            continue;
          }

          gruposParaImportar.push({
            nome: item.nome.trim(),
            descricao: item.descricao?.trim() || undefined,
            emails: emails
          });
        } catch (error) {
          erros.push(`Linha ${i + 2}: Erro ao processar grupo "${item.nome}": ${error}`);
        }
      }

      setImportProgress(70);

      // Importar grupos válidos
      if (gruposParaImportar.length > 0) {
        await onImportGrupos(gruposParaImportar);
        setImportProgress(100);
      }

      // Mostrar resultados
      setImportResults({
        success: gruposParaImportar.length,
        errors: erros,
        total: importData.length
      });

      // Limpar input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

    } catch (error) {
      toast.error(`Erro ao processar arquivo: ${error}`);
      setShowImportDialog(false);
      console.error('Erro na importação:', error);
    }
  };

  const handleDownloadTemplate = () => {
    try {
      downloadImportTemplate();
      toast.success('Template de importação baixado com sucesso!');
    } catch (error) {
      toast.error('Erro ao baixar template');
      console.error('Erro no download do template:', error);
    }
  };

  const closeImportDialog = () => {
    setShowImportDialog(false);
    setImportProgress(0);
    setImportResults(null);
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
            <Button variant="outline" size="sm" disabled={isImporting}>
              <Upload className="h-4 w-4 mr-2" />
              {isImporting ? 'Importando...' : 'Importar'}
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

      {/* Dialog de progresso da importação */}
      <Dialog open={showImportDialog} onOpenChange={closeImportDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Importando Grupos</DialogTitle>
            <DialogDescription>
              Processando arquivo Excel...
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {!importResults && (
              <>
                <Progress value={importProgress} className="w-full" />
                <p className="text-sm text-gray-600 text-center">
                  {importProgress < 30 && "Lendo arquivo..."}
                  {importProgress >= 30 && importProgress < 70 && "Validando dados..."}
                  {importProgress >= 70 && importProgress < 100 && "Importando grupos..."}
                  {importProgress === 100 && "Concluído!"}
                </p>
              </>
            )}

            {importResults && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  <span className="font-medium">Importação concluída!</span>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                  <div className="flex justify-between">
                    <span>Total de linhas:</span>
                    <span className="font-medium">{importResults.total}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Grupos importados:</span>
                    <span className="font-medium text-green-600">{importResults.success}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Erros:</span>
                    <span className="font-medium text-red-600">{importResults.errors.length}</span>
                  </div>
                </div>

                {importResults.errors.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-red-600">
                      <AlertCircle className="h-4 w-4" />
                      <span className="font-medium">Erros encontrados:</span>
                    </div>
                    <div className="bg-red-50 p-3 rounded-lg max-h-32 overflow-y-auto">
                      {importResults.errors.map((erro, index) => (
                        <div key={index} className="text-sm text-red-700">
                          {erro}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button onClick={closeImportDialog}>
              {importResults ? 'Fechar' : 'Cancelar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
