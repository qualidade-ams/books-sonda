import React from 'react';
import { CheckCircle, XCircle, Download, RotateCcw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';
import { ScrollArea } from '../../ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../ui/table';
import { ImportResult as ImportResultType } from '../../../services/excelImportService';

interface ImportResultProps {
  result: ImportResultType;
  onDownloadReport: () => void;
  onNewImport: () => void;
}

export function ImportResult({ result, onDownloadReport, onNewImport }: ImportResultProps) {
  const { success, totalRows, successCount, errorCount, errors, successfulImports } = result;

  return (
    <div className="space-y-6">
      {/* Resumo */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {success ? (
              <CheckCircle className="h-5 w-5 text-green-500" />
            ) : (
              <XCircle className="h-5 w-5 text-red-500" />
            )}
            Resultado da Importação
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-sm font-medium text-muted-foreground">Total</p>
              <p className="text-3xl font-bold">{totalRows}</p>
            </div>
            
            <div className="text-center">
              <p className="text-sm font-medium text-muted-foreground">Sucessos</p>
              <p className="text-3xl font-bold text-green-600">{successCount}</p>
            </div>
            
            <div className="text-center">
              <p className="text-sm font-medium text-muted-foreground">Erros</p>
              <p className="text-3xl font-bold text-red-600">{errorCount}</p>
            </div>
            
            <div className="text-center">
              <p className="text-sm font-medium text-muted-foreground">Status</p>
              <Badge variant={success ? "default" : "destructive"} className="text-sm">
                {success ? "Sucesso" : "Com Erros"}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Empresas Importadas com Sucesso */}
      {successfulImports.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle className="h-5 w-5" />
              Empresas Importadas ({successfulImports.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-64">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome Completo</TableHead>
                    <TableHead>Nome Abreviado</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Template</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {successfulImports.map((empresa, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{empresa.nomeCompleto}</TableCell>
                      <TableCell>{empresa.nomeAbreviado}</TableCell>
                      <TableCell>
                        <Badge variant="default">{empresa.status}</Badge>
                      </TableCell>
                      <TableCell>{empresa.templatePadrao}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Erros */}
      {errors.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <XCircle className="h-5 w-5" />
              Erros Encontrados ({errors.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-64">
              <div className="space-y-3">
                {errors.map((error, index) => (
                  <div
                    key={index}
                    className="p-4 border border-red-200 rounded-lg bg-red-50"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="font-medium text-red-800">
                          Linha {error.row}
                          {error.field && ` - Campo: ${error.field}`}
                        </p>
                        <p className="text-sm text-red-600 mt-1">{error.message}</p>
                        
                        {error.data && (
                          <div className="mt-2 text-xs text-red-500">
                            <p className="font-medium">Dados da linha:</p>
                            <pre className="mt-1 p-2 bg-red-100 rounded text-xs overflow-x-auto">
                              {JSON.stringify(error.data, null, 2)}
                            </pre>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Ações */}
      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={onNewImport}
          className="flex items-center gap-2"
        >
          <RotateCcw className="h-4 w-4" />
          Nova Importação
        </Button>
        
        <Button
          onClick={onDownloadReport}
          className="flex items-center gap-2"
        >
          <Download className="h-4 w-4" />
          Baixar Relatório
        </Button>
      </div>
    </div>
  );
}