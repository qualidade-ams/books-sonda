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
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface GerenciadorOrdemSimplesProps {
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

interface GrupoPessoas {
  superiorId: string | null;
  superiorNome: string;
  pessoas: PessoaOrdem[];
}

function SortableItem({ pessoa }: { pessoa: PessoaOrdem }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: pessoa.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      className="cursor-move hover:shadow-md transition-shadow"
    >
      <CardContent className="p-3">
        <div className="flex items-center gap-3">
          <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing">
            <GripVertical className="h-5 w-5 text-gray-400" />
          </div>
          
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
  );
}

export function GerenciadorOrdemSimples({ open, onOpenChange, pessoas, onSave }: GerenciadorOrdemSimplesProps) {
  const { toast } = useToast();
  const [grupos, setGrupos] = useState<GrupoPessoas[]>([]);
  const [saving, setSaving] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Converter estrutura hierárquica em grupos por superior
  useEffect(() => {
    if (open) {
      const flatList: PessoaOrdem[] = [];
      
      // Função para verificar se é um UUID válido
      const isValidUUID = (id: string): boolean => {
        const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        return uuidRegex.test(id);
      };
      
      const flatten = (pessoas: PessoaComSubordinados[], superiorId: string | null = null) => {
        pessoas.forEach((pessoa) => {
          // Extrair ID real (remover sufixo _PRODUTO se existir)
          let idReal = pessoa.id.includes('_') ? pessoa.id.split('_')[0] : pessoa.id;
          
          // Se o ID não for um UUID válido, pular esta pessoa (é um nó virtual como root-cs)
          if (!isValidUUID(idReal)) {
            console.log(`⚠️ Pulando pessoa com ID inválido: ${idReal}`);
            
            // Mas processar seus subordinados
            if (pessoa.subordinados && pessoa.subordinados.length > 0) {
              flatten(pessoa.subordinados, superiorId); // Manter o superior original
            }
            return;
          }
          
          let superiorIdReal = superiorId && superiorId.includes('_') ? superiorId.split('_')[0] : superiorId;
          
          // Se o superior não for um UUID válido, definir como null
          if (superiorIdReal && !isValidUUID(superiorIdReal)) {
            superiorIdReal = null;
          }
          
          flatList.push({
            id: idReal,
            nome: pessoa.nome,
            cargo: pessoa.cargo,
            departamento: pessoa.departamento,
            ordem_exibicao: pessoa.ordem_exibicao || 0,
            superior_id: superiorIdReal,
          });
          
          if (pessoa.subordinados && pessoa.subordinados.length > 0) {
            flatten(pessoa.subordinados, pessoa.id);
          }
        });
      };
      
      flatten(pessoas);
      
      // Remover duplicatas (mesma pessoa pode aparecer em múltiplos produtos)
      const pessoasUnicas = new Map<string, PessoaOrdem>();
      flatList.forEach(pessoa => {
        if (!pessoasUnicas.has(pessoa.id)) {
          pessoasUnicas.set(pessoa.id, pessoa);
        }
      });
      
      const flatListUnico = Array.from(pessoasUnicas.values());
      
      // Agrupar por superior_id
      const gruposMap = new Map<string, PessoaOrdem[]>();
      
      flatListUnico.forEach(pessoa => {
        const key = pessoa.superior_id || 'root';
        if (!gruposMap.has(key)) {
          gruposMap.set(key, []);
        }
        gruposMap.get(key)!.push(pessoa);
      });
      
      // Ordenar cada grupo
      gruposMap.forEach(grupo => {
        grupo.sort((a, b) => a.ordem_exibicao - b.ordem_exibicao);
      });
      
      // Converter para array de grupos
      const gruposArray: GrupoPessoas[] = [];
      gruposMap.forEach((pessoas, superiorId) => {
        const superior = flatListUnico.find(p => p.id === superiorId);
        gruposArray.push({
          superiorId: superiorId === 'root' ? null : superiorId,
          superiorNome: superior ? superior.nome : 'Nível Superior',
          pessoas,
        });
      });
      
      setGrupos(gruposArray);
    }
  }, [open, pessoas]);

  const handleDragEnd = (event: DragEndEvent, grupoIndex: number) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      setGrupos((grupos) => {
        const novosGrupos = [...grupos];
        const grupo = novosGrupos[grupoIndex];
        
        const oldIndex = grupo.pessoas.findIndex((p) => p.id === active.id);
        const newIndex = grupo.pessoas.findIndex((p) => p.id === over.id);
        
        grupo.pessoas = arrayMove(grupo.pessoas, oldIndex, newIndex);
        
        // Atualizar ordem_exibicao
        grupo.pessoas.forEach((pessoa, idx) => {
          pessoa.ordem_exibicao = idx + 1;
        });
        
        return novosGrupos;
      });
    }
  };

  const handleSave = async () => {
    setSaving(true);
    
    try {
      // Atualizar ordem de cada pessoa
      for (const grupo of grupos) {
        for (const pessoa of grupo.pessoas) {
          const { error } = await (supabase as any)
            .from('organizacao_estrutura')
            .update({ ordem_exibicao: pessoa.ordem_exibicao })
            .eq('id', pessoa.id);
          
          if (error) throw error;
        }
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
          {grupos.map((grupo, grupoIndex) => (
            <div key={grupo.superiorId || 'root'} className="space-y-2">
              <h4 className="text-sm font-semibold text-gray-700 border-b pb-2">
                {grupo.superiorNome}
              </h4>
              
              <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={(event) => handleDragEnd(event, grupoIndex)}
              >
                <SortableContext
                  items={grupo.pessoas.map(p => p.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-2">
                    {grupo.pessoas.map((pessoa) => (
                      <SortableItem key={pessoa.id} pessoa={pessoa} />
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
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
