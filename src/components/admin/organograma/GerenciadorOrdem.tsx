import { useState, useEffect } from 'react';
import { GripVertical, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import type { PessoaComSubordinados } from '@/types/organograma';

interface GerenciadorOrdemProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pessoas: PessoaComSubordinados[];
  onSave: () => void;
}

interface PessoaOrdem {
  id: string;
  nome: string;
  cargo: string;
  departamento: string;
  ordem_exibicao: number;
  superior_id: string | null;
}

export function GerenciadorOrdem({ open, onOpenChange, pessoas, onSave }: GerenciadorOrdemProps) {
  const { toast } = useToast();
  const [pessoasOrdenadas, setPessoasOrdenadas] = useState<PessoaOrdem[]>([]);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  // Converter estrutura hierárquica em lista plana
  useEffect(() => {
    if (open) {
      const flatList: PessoaOrdem[] = [];
      
      const flatten = (pessoas: PessoaComSubordinados[], superiorId: string | null = null) => {
        pessoas.forEach((pessoa) => {
          flatList.push({
            id: pessoa.id,
            nome: pessoa.nome,
            cargo: pessoa.cargo,
            departamento: pessoa.departamento,
            ordem_exibicao: pessoa.ordem_exibicao || 0,
            superior_id: superiorId,
          });
          
          if (pessoa.subordinados && pessoa.subordinados.length > 0) {
            flatten(pessoa.subordinados, pessoa.id);
          }
        });
      };
      
      flatten(pessoas);
      
      // Agrupar por superior_id e ordenar
      const grouped = flatList.reduce((acc, pessoa) => {
        const key = pessoa.superior_id || 'root';
        if (!acc[key]) acc[key] = [];
        acc[key].push(pessoa);
        return acc;
      }, {} as Record<string, PessoaOrdem[]>);
      
      // Ordenar cada grupo
      Object.keys(grouped).forEach(key => {
        grouped[key].sort((a, b) => a.ordem_exibicao - b.ordem_exibicao);
      });
      
      // Reconstruir lista plana ordenada
      const ordered: PessoaOrdem[] = [];
      Object.values(grouped).forEach(group => {
        ordered.push(...group);
      });
      
      setPessoasOrdenadas(ordered);
    }
  }, [open, pessoas]);

  // Agrupar pessoas por superior
  const pessoasPorSuperior = pessoasOrdenadas.reduce((acc, pessoa) => {
    const key = pessoa.superior_id || 'root';
    if (!acc[key]) acc[key] = [];
    acc[key].push(pessoa);
    return acc;
  }, {} as Record<string, PessoaOrdem[]>);

  const handleDragStart = (index: number, superiorId: string | null) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (targetIndex: number, superiorId: string | null) => {
    if (draggedIndex === null) return;
    
    const key = superiorId || 'root';
    const grupo = [...(pessoasPorSuperior[key] || [])];
    
    const [draggedItem] = grupo.splice(draggedIndex, 1);
    grupo.splice(targetIndex, 0, draggedItem);
    
    // Atualizar ordem_exibicao
    grupo.forEach((pessoa, idx) => {
      pessoa.ordem_exibicao = idx + 1;
    });
    
    // Atualizar estado
    const novaLista = pessoasOrdenadas.map(p => {
      const updated = grupo.find(g => g.id === p.id);
      return updated || p;
    });
    
    setPessoasOrdenadas(novaLista);
    setDraggedIndex(null);
  };

  const handleSave = async () => {
    setSaving(true);
    
    try {
      // Atualizar ordem de cada pessoa
      const updates = pessoasOrdenadas.map(pessoa => ({
        id: pessoa.id,
        ordem_exibicao: pessoa.ordem_exibicao,
      }));
      
      for (const update of updates) {
        const { error } = await supabase
          .from('organizacao_estrutura')
          .update({ ordem_exibicao: update.ordem_exibicao })
          .eq('id', update.id);
        
        if (error) throw error;
      }
      
      toast({
        title: 'Sucesso!',
        description: 'Ordem atualizada com sucesso.',
      });
      
      onSave();
      onOpenChange(false);
    } catch (error) {
      console.error('Erro ao salvar ordem:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao atualizar ordem.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const getNomeSuperior = (superiorId: string | null) => {
    if (!superiorId) return 'Nível Superior';
    const superior = pessoasOrdenadas.find(p => p.id === superiorId);
    return superior ? superior.nome : 'Desconhecido';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-sonda-blue">
            Gerenciar Ordem de Exibição
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-500">
            Arraste e solte para reordenar as pessoas no organograma
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {Object.entries(pessoasPorSuperior).map(([superiorId, grupo]) => (
            <div key={superiorId} className="space-y-2">
              <h4 className="text-sm font-semibold text-gray-700 border-b pb-2">
                {getNomeSuperior(superiorId === 'root' ? null : superiorId)}
              </h4>
              
              <div className="space-y-2">
                {grupo.map((pessoa, index) => (
                  <Card
                    key={pessoa.id}
                    draggable
                    onDragStart={() => handleDragStart(index, pessoa.superior_id)}
                    onDragOver={handleDragOver}
                    onDrop={() => handleDrop(index, pessoa.superior_id)}
                    className="cursor-move hover:shadow-md transition-shadow"
                  >
                    <CardContent className="p-3">
                      <div className="flex items-center gap-3">
                        <GripVertical className="h-5 w-5 text-gray-400" />
                        
                        <div className="flex-1">
                          <div className="font-medium text-gray-900">{pessoa.nome}</div>
                          <div className="text-sm text-gray-500">
                            {pessoa.cargo} • {pessoa.departamento}
                          </div>
                        </div>
                        
                        <div className="text-sm font-mono text-gray-400">
                          #{pessoa.ordem_exibicao}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>

        <DialogFooter className="pt-6 border-t">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            <X className="h-4 w-4 mr-2" />
            Cancelar
          </Button>
          <Button
            type="button"
            className="bg-sonda-blue hover:bg-sonda-dark-blue"
            onClick={handleSave}
            disabled={saving}
          >
            <Save className="h-4 w-4 mr-2" />
            {saving ? 'Salvando...' : 'Salvar Ordem'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
