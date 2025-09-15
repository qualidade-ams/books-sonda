import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileSpreadsheet, AlertCircle } from 'lucide-react';
import { Button } from '../../ui/button';
import { Card, CardContent } from '../../ui/card';
import { cn } from '../../../lib/utils';

interface ExcelUploadProps {
  onFileSelect: (file: File) => void;
  isLoading?: boolean;
  className?: string;
}

export function ExcelUpload({ onFileSelect, isLoading = false, className }: ExcelUploadProps) {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      onFileSelect(acceptedFiles[0]);
    }
  }, [onFileSelect]);

  const { getRootProps, getInputProps, isDragActive, fileRejections } = useDropzone({
    onDrop,
    accept: {
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls']
    },
    maxFiles: 1,
    disabled: isLoading
  });

  const hasRejectedFiles = fileRejections.length > 0;

  return (
    <Card className={cn("border-2 border-dashed transition-colors", className)}>
      <CardContent className="p-6">
        <div
          {...getRootProps()}
          className={cn(
            "flex flex-col items-center justify-center space-y-4 p-8 rounded-lg cursor-pointer transition-colors",
            isDragActive && "bg-primary/5 border-primary",
            hasRejectedFiles && "border-destructive bg-destructive/5",
            isLoading && "opacity-50 cursor-not-allowed"
          )}
        >
          <input {...getInputProps()} />
          
          <div className="flex flex-col items-center space-y-2">
            {hasRejectedFiles ? (
              <AlertCircle className="h-12 w-12 text-destructive" />
            ) : (
              <FileSpreadsheet className="h-12 w-12 text-muted-foreground" />
            )}
            
            <div className="text-center">
              <p className="text-lg font-medium">
                {isDragActive
                  ? "Solte o arquivo aqui"
                  : hasRejectedFiles
                  ? "Arquivo inválido"
                  : "Arraste um arquivo Excel ou clique para selecionar"
                }
              </p>
              
              <p className="text-sm text-muted-foreground mt-1">
                {hasRejectedFiles
                  ? "Apenas arquivos .xlsx e .xls são aceitos"
                  : "Formatos aceitos: .xlsx, .xls"
                }
              </p>
            </div>
          </div>

          {hasRejectedFiles && (
            <div className="text-sm text-destructive">
              {fileRejections.map(({ file, errors }) => (
                <div key={file.name}>
                  {errors.map(error => (
                    <p key={error.code}>{error.message}</p>
                  ))}
                </div>
              ))}
            </div>
          )}

          <Button
            type="button"
            variant="outline"
            disabled={isLoading}
            className="mt-4"
          >
            <Upload className="h-4 w-4 mr-2" />
            {isLoading ? "Processando..." : "Selecionar Arquivo"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}