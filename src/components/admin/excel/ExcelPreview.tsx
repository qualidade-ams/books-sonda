import React from 'react';
import { CheckCircle, XCircle, AlertTriangle, Eye } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Badge } from '../../ui/badge';
import { Button } from '../../ui/button';
import { ScrollArea } from '../../ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../../ui/table';
import { ImportPreview, ImportError } from '../../../services/excelImportService';
import { cn } from '../../../lib/utils';

interface ExcelPreviewProps {
  preview: ImportPreview;
  onImport: () => void;
  onCancel: () => void;
  isImporting?: boolean;
}

export function ExcelPreview({ preview, onImport, onCancel, isImporting = false }: ExcelPreviewProps) {
  const { data, validationErrors, isValid } = preview;

  return (
    <div className="space-y-6">
      {/* Resumo */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Preview dos Dados
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm font-medium">Total de Linhas</p>
                <p className="text-2xl font-bold">{data.length}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {isValid ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500" />
              )}
              <div>
                <p className="text-sm font-medium">Status</p>
                <Badge variant={isValid ? "default" : "destructive"}>
                  {isValid ? "Válido" : "Com Erros"}
                </Badge>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="text-sm font-medium">Erros</p>
                <p className="text-2xl font-bold text-red-500">{validationErrors.length}</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Erros de Validação */}
      {validationErrors.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <XCircle className="h-5 w-5" />
              Erros de Validação ({validationErrors.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-48">
              <div className="space-y-2">
                {validationErrors.map((error, index) => (
                  <div
                    key={index}
                    className="p-3 border border-red-200 rounded-lg bg-red-50"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-red-800">
                          Linha {error.row}
                          {error.field && ` - Campo: ${error.field}`}
                        </p>
                        <p className="text-sm text-red-600">{error.message}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Preview dos Dados */}
      <Card>
        <CardHeader>
          <CardTitle>Dados a Serem Importados</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-96">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Linha</TableHead>
                  <TableHead>Nome Completo</TableHead>
                  <TableHead>Nome Abreviado</TableHead>
                  <TableHead>Template</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Produtos</TableHead>
                  <TableHead className="text-center">Válido</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.map((row, index) => {
                  const hasError = validationErrors.some(error => error.row === row._rowIndex);
                  
                  return (
                    <TableRow
                      key={index}
                      className={cn(
                        hasError && "bg-red-50 border-red-200"
                      )}
                    >
                      <TableCell className="font-medium">{row._rowIndex}</TableCell>
                      <TableCell>{row['Nome Completo'] || '-'}</TableCell>
                      <TableCell>{row['Nome Abreviado'] || '-'}</TableCell>
                      <TableCell>{row['Template Padrão'] || 'portugues'}</TableCell>
                      <TableCell>
                        <Badge variant={row['Status'] === 'ativo' ? 'default' : 'secondary'}>
                          {row['Status'] || 'ativo'}
                        </Badge>
                      </TableCell>
                      <TableCell>{row['Produtos'] || '-'}</TableCell>
                      <TableCell className="text-center">
                        {hasError ? (
                          <XCircle className="h-4 w-4 text-red-500 mx-auto" />
                        ) : (
                          <CheckCircle className="h-4 w-4 text-green-500 mx-auto" />
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Ações */}
      <div className="flex justify-end gap-4">
        <Button
          variant="outline"
          onClick={onCancel}
          disabled={isImporting}
        >
          Cancelar
        </Button>
        
        <Button
          onClick={onImport}
          disabled={!isValid || isImporting}
          className="min-w-32"
        >
          {isImporting ? "Importando..." : "Confirmar Importação"}
        </Button>
      </div>
    </div>
  );
}