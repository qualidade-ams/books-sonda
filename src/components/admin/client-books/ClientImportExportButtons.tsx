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
  X,
  Users
} from 'lucide-react';
import { EmpresaClienteCompleta, ColaboradorCompleto, EmpresaFormData, ColaboradorFormData } from '@/types/clientBooksTypes';
import { 
  exportClientesToExcel, 
  exportColaboradoresToExcel,
  exportClientesToPDF, 
  processImportEmpresasExcel, 
  processImportColaboradoresExcel,
  processProdutosString,
  downloadImportEmpresasTemplate,
  downloadImportColaboradoresTemplate,
  EmpresaImportData,
  ColaboradorImportData
} from '@/utils/clientExportUtils';
import { toast } from 'sonner';

interface ClientImportExportButtonsProps {
  empresas: EmpresaClienteCompleta[];
  colaboradores?: ColaboradorCompleto[];
  onImportEmpresas?: (empresas: EmpresaFormData[]) => Promise<any>;
  onImportColaboradores?: (colaboradores: ColaboradorFormData[]) => Promise<any>;
  isImporting?: boolean;
  showColaboradores?: boolean;
}

export function ClientImportExportButtons({ 
  empresas, 
  colaboradores = [],
  onImportEmpresas,
  onImportColaboradores,
  isImporting = false,
  showColaboradores = false
}: ClientImportExportButtonsProps) {
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [importType, setImportType] = useState<'empresas' | 'colaboradores'>('empresas');
  const [importProgress, setImportProgress] = useState(0);
  const [importResults, setImportResults] = useState<{
    success: number;
    errors: string[];
    total: number;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExportClientesExcel = () => {
    try {
      exportClientesToExcel(empresas);
      toast.success('Dados de clientes exportados para Excel com sucesso!');
    } catch (error) {
      toast.error('Erro ao exportar dados de clientes para Excel');
      console.error('Erro na exportação Excel:', error);
    }
  };

  const handleExportColaboradoresExcel = () => {
    try {
      exportColaboradoresToExcel(colaboradores);
      toast.success('Dados de colaboradores exportados para Excel com sucesso!');
    } catch (error) {
      toast.error('Erro ao exportar dados de colaboradores para Excel');
      console.error('Erro na exportação Excel:', error);
    }
  };

  const handleExportClientesPDF = () => {
    try {
      exportClientesToPDF(empresas);
      toast.success('Relatório PDF de clientes gerado com sucesso!');
    } catch (error) {
      toast.error('Erro ao gerar relatório PDF de clientes');
      console.error('Erro na exportação PDF:', error);
    }
  };

  const handleImportClick = (type: 'empresas' | 'colaboradores') => {
    setImportType(type);
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

      if (importType === 'empresas') {
        await processImportEmpresas(file);
      } else {
        await processImportColaboradores(file);
      }

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

  const processImportEmpresas = async (file: File) => {
    if (!onImportEmpresas) {
      throw new Error('Função de importação de empresas não fornecida');
    }

    // Processar arquivo
    const importData = await processImportEmpresasExcel(file);
    setImportProgress(30);

    if (importData.length === 0) {
      throw new Error('Nenhuma empresa válida encontrada no arquivo');
    }

    // Converter dados para formato do formulário
    const empresasParaImportar: EmpresaFormData[] = [];
    const erros: string[] = [];

    for (let i = 0; i < importData.length; i++) {
      const item = importData[i];
      setImportProgress(30 + (i / importData.length) * 40);

      try {
        // Validar campos obrigatórios
        if (!item.nomeCompleto || item.nomeCompleto.trim().length === 0) {
          erros.push(`Linha ${i + 2}: Nome completo é obrigatório`);
          continue;
        }

        if (!item.nomeAbreviado || item.nomeAbreviado.trim().length === 0) {
          erros.push(`Linha ${i + 2}: Nome abreviado é obrigatório`);
          continue;
        }

        // Validar status
        const statusValidos = ['ativo', 'inativo', 'suspenso'];
        if (!statusValidos.includes(item.status)) {
          erros.push(`Linha ${i + 2}: Status "${item.status}" inválido. Use: ${statusValidos.join(', ')}`);
          continue;
        }

        // Processar produtos
        const produtos = processProdutosString(item.produtos || '');

        empresasParaImportar.push({
          nomeCompleto: item.nomeCompleto.trim(),
          nomeAbreviado: item.nomeAbreviado.trim(),
          status: item.status as any,
          descricaoStatus: item.descricaoStatus?.trim(),
          emailGestor: item.emailGestor?.trim(),
          linkSharepoint: item.linkSharepoint?.trim(),
          templatePadrao: (item.templatePadrao || 'portugues') as any,
          produtos: produtos as any[],
          grupos: []
        });
      } catch (error) {
        erros.push(`Linha ${i + 2}: Erro ao processar empresa "${item.nomeCompleto}": ${error}`);
      }
    }

    setImportProgress(70);

    // Importar empresas válidas
    if (empresasParaImportar.length > 0) {
      await onImportEmpresas(empresasParaImportar);
      setImportProgress(100);
    }

    // Mostrar resultados
    setImportResults({
      success: empresasParaImportar.length,
      errors: erros,
      total: importData.length
    });
  };

  const processImportColaboradores = async (file: File) => {
    if (!onImportColaboradores) {
      throw new Error('Função de importação de colaboradores não fornecida');
    }

    // Processar arquivo
    const importData = await processImportColaboradoresExcel(file);
    setImportProgress(30);

    if (importData.length === 0) {
      throw new Error('Nenhum colaborador válido encontrado no arquivo');
    }

    // Converter dados para formato do formulário
    const colaboradoresParaImportar: ColaboradorFormData[] = [];
    const erros: string[] = [];

    for (let i = 0; i < importData.length; i++) {
      const item = importData[i];
      setImportProgress(30 + (i / importData.length) * 40);

      try {
        // Validar campos obrigatórios
        if (!item.nomeCompleto || item.nomeCompleto.trim().length === 0) {
          erros.push(`Linha ${i + 2}: Nome completo é obrigatório`);
          continue;
        }

        if (!item.email || item.email.trim().length === 0) {
          erros.push(`Linha ${i + 2}: E-mail é obrigatório`);
          continue;
        }

        // Validar e-mail
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(item.email)) {
          erros.push(`Linha ${i + 2}: E-mail "${item.email}" inválido`);
          continue;
        }

        // Encontrar empresa por nome
        const empresa = empresas.find(e => 
          e.nome_completo.toLowerCase() === item.empresaNome.toLowerCase() ||
          e.nome_abreviado.toLowerCase() === item.empresaNome.toLowerCase()
        );

        if (!empresa) {
          erros.push(`Linha ${i + 2}: Empresa "${item.empresaNome}" não encontrada`);
          continue;
        }

        // Validar status
        const statusValidos = ['ativo', 'inativo'];
        if (!statusValidos.includes(item.status)) {
          erros.push(`Linha ${i + 2}: Status "${item.status}" inválido. Use: ${statusValidos.join(', ')}`);
          continue;
        }

        colaboradoresParaImportar.push({
          nomeCompleto: item.nomeCompleto.trim(),
          email: item.email.trim(),
          funcao: item.funcao?.trim(),
          empresaId: empresa.id,
          status: item.status as any,
          descricaoStatus: item.descricaoStatus?.trim(),
          principalContato: ['sim', 'yes', 'true', '1'].includes(item.principalContato.toLowerCase())
        });
      } catch (error) {
        erros.push(`Linha ${i + 2}: Erro ao processar colaborador "${item.nomeCompleto}": ${error}`);
      }
    }

    setImportProgress(70);

    // Importar colaboradores válidos
    if (colaboradoresParaImportar.length > 0) {
      await onImportColaboradores(colaboradoresParaImportar);
      setImportProgress(100);
    }

    // Mostrar resultados
    setImportResults({
      success: colaboradoresParaImportar.length,
      errors: erros,
      total: importData.length
    });
  };

  const handleDownloadTemplate = (type: 'empresas' | 'colaboradores') => {
    try {
      if (type === 'empresas') {
        downloadImportEmpresasTemplate();
        toast.success('Template de importação de empresas baixado com sucesso!');
      } else {
        downloadImportColaboradoresTemplate();
        toast.success('Template de importação de colaboradores baixado com sucesso!');
      }
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
            <DropdownMenuItem onClick={handleExportClientesExcel}>
              <FileSpreadsheet className="mr-2 h-4 w-4" />
              Clientes para Excel
            </DropdownMenuItem>
            {showColaboradores && (
              <DropdownMenuItem onClick={handleExportColaboradoresExcel}>
                <Users className="mr-2 h-4 w-4" />
                Colaboradores para Excel
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleExportClientesPDF}>
              <FileText className="mr-2 h-4 w-4" />
              Relatório PDF
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
            {onImportEmpresas && (
              <>
                <DropdownMenuItem onClick={() => handleDownloadTemplate('empresas')}>
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  Template Empresas
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleImportClick('empresas')}>
                  <Upload className="mr-2 h-4 w-4" />
                  Importar Empresas
                </DropdownMenuItem>
              </>
            )}
            {onImportColaboradores && (
              <>
                {onImportEmpresas && <DropdownMenuSeparator />}
                <DropdownMenuItem onClick={() => handleDownloadTemplate('colaboradores')}>
                  <Users className="mr-2 h-4 w-4" />
                  Template Colaboradores
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleImportClick('colaboradores')}>
                  <Upload className="mr-2 h-4 w-4" />
                  Importar Colaboradores
                </DropdownMenuItem>
              </>
            )}
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
            <DialogTitle>
              Importando {importType === 'empresas' ? 'Empresas' : 'Colaboradores'}
            </DialogTitle>
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
                  {importProgress >= 70 && importProgress < 100 && `Importando ${importType}...`}
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
                    <span>{importType === 'empresas' ? 'Empresas' : 'Colaboradores'} importados:</span>
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
