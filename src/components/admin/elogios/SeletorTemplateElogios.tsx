import React from 'react';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useElogiosTemplates } from '@/hooks/useElogiosTemplates';

interface SeletorTemplateElogiosProps {
  templateSelecionado?: string;
  onTemplateChange: (templateId: string) => void;
  disabled?: boolean;
}

const SeletorTemplateElogios: React.FC<SeletorTemplateElogiosProps> = ({
  templateSelecionado,
  onTemplateChange,
  disabled = false
}) => {
  const { elogiosTemplateOptions, loading } = useElogiosTemplates();
  
  // Debug: log das opções de template
  React.useEffect(() => {
    console.log('🎨 [SeletorTemplateElogios] Opções carregadas:', {
      loading,
      optionsCount: elogiosTemplateOptions.length,
      options: elogiosTemplateOptions,
      templateSelecionado
    });
  }, [elogiosTemplateOptions, loading, templateSelecionado]);

  if (loading) {
    return (
      <div className="space-y-2">
        <Label>Template de Elogios</Label>
        <div className="h-10 bg-gray-100 animate-pulse rounded-md"></div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Label htmlFor="template-elogios">Template de Elogios</Label>
      <Select
        value={templateSelecionado || ''}
        onValueChange={onTemplateChange}
        disabled={disabled}
      >
        <SelectTrigger>
          <SelectValue placeholder="Selecione um template de elogios" />
        </SelectTrigger>
        <SelectContent>
          {elogiosTemplateOptions.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              <div className="flex items-center justify-between w-full">
                <div className="flex flex-col">
                  <span className="font-medium">{option.label}</span>
                </div>
                {option.isDefault && (
                  <Badge variant="outline" className="ml-2 text-xs">
                    Padrão
                  </Badge>
                )}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      {elogiosTemplateOptions.length === 0 && (
        <p className="text-sm text-amber-600">
          ⚠️ Nenhum template de elogios encontrado. Será usado o template padrão.
        </p>
      )}
    </div>
  );
};

export default SeletorTemplateElogios;