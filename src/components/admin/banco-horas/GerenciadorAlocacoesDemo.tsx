/**
 * Demo/Test component for GerenciadorAlocacoes
 * 
 * This component demonstrates the GerenciadorAlocacoes functionality
 * with sample data and state management.
 * 
 * @module components/admin/banco-horas/GerenciadorAlocacoesDemo
 */

import React, { useState } from 'react';
import { GerenciadorAlocacoes } from './GerenciadorAlocacoes';
import type { Alocacao } from '@/types/bancoHoras';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

/**
 * Demo component for GerenciadorAlocacoes
 * 
 * Shows how to use the component with state management and callbacks.
 */
export function GerenciadorAlocacoesDemo() {
  const { toast } = useToast();
  
  // Sample allocations
  const [alocacoes, setAlocacoes] = useState<Alocacao[]>([
    {
      id: '1',
      empresa_id: 'empresa-123',
      nome_alocacao: 'Departamento TI',
      percentual_baseline: 60,
      ativo: true,
      created_at: new Date(),
      updated_at: new Date()
    },
    {
      id: '2',
      empresa_id: 'empresa-123',
      nome_alocacao: 'Departamento RH',
      percentual_baseline: 40,
      ativo: true,
      created_at: new Date(),
      updated_at: new Date()
    }
  ]);
  
  const [loading, setLoading] = useState(false);
  
  /**
   * Handle allocation updates
   */
  const handleUpdate = (novasAlocacoes: Partial<Alocacao>[]) => {
    console.log('Alocações atualizadas:', novasAlocacoes);
    
    // Simulate API call
    setLoading(true);
    setTimeout(() => {
      // Update state with new allocations
      const updated = novasAlocacoes.map((a, index) => ({
        id: a.id || `new-${index}`,
        empresa_id: 'empresa-123',
        nome_alocacao: a.nome_alocacao || '',
        percentual_baseline: a.percentual_baseline || 0,
        ativo: true,
        created_at: new Date(),
        updated_at: new Date()
      }));
      
      setAlocacoes(updated);
      setLoading(false);
      
      toast({
        title: 'Alocações atualizadas',
        description: 'As alocações foram salvas com sucesso.',
      });
    }, 1000);
  };
  
  /**
   * Reset to sample data
   */
  const handleReset = () => {
    setAlocacoes([
      {
        id: '1',
        empresa_id: 'empresa-123',
        nome_alocacao: 'Departamento TI',
        percentual_baseline: 60,
        ativo: true,
        created_at: new Date(),
        updated_at: new Date()
      },
      {
        id: '2',
        empresa_id: 'empresa-123',
        nome_alocacao: 'Departamento RH',
        percentual_baseline: 40,
        ativo: true,
        created_at: new Date(),
        updated_at: new Date()
      }
    ]);
    
    toast({
      title: 'Dados resetados',
      description: 'As alocações foram restauradas para os valores de exemplo.',
    });
  };
  
  /**
   * Clear all allocations
   */
  const handleClear = () => {
    setAlocacoes([]);
    
    toast({
      title: 'Alocações removidas',
      description: 'Todas as alocações foram removidas.',
    });
  };
  
  return (
    <div className="space-y-6">
      {/* Demo Controls */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Controles de Demonstração</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleReset}
            >
              Resetar para Exemplo
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleClear}
            >
              Limpar Todas
            </Button>
          </div>
        </CardContent>
      </Card>
      
      {/* GerenciadorAlocacoes Component */}
      <GerenciadorAlocacoes
        empresaId="empresa-123"
        alocacoes={alocacoes}
        onUpdate={handleUpdate}
        loading={loading}
      />
      
      {/* Current State Display */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Estado Atual (Debug)</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="bg-gray-50 p-4 rounded-lg overflow-auto text-xs">
            {JSON.stringify(alocacoes, null, 2)}
          </pre>
        </CardContent>
      </Card>
    </div>
  );
}

export default GerenciadorAlocacoesDemo;
