/**
 * Modal de seleção de tabelas para sincronização
 */

import { useState } from 'react';
import { Database, CheckSquare, Square } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

export interface TabelasSincronizacao {
  pesquisas: boolean;
  especialistas: boolean;
  apontamentos: boolean;
  tickets: boolean;
}

interface SyncSelectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (tabelas: TabelasSincronizacao) => void;
  isLoading?: boolean;
}

export function SyncSelectionModal({
  open,
  onOpenChange,
  onConfirm,
  isLoading = false
}: SyncSelectionModalProps) {
  const [tabelas, setTabelas] = useState<TabelasSincronizacao>({
    pesquisas: true,
    especialistas: true,
    apontamentos: true,
    tickets: true
  });

  const handleToggleTabela = (tabela: keyof TabelasSincronizacao) => {
    setTabelas(prev => ({
      ...prev,
      [tabela]: !prev[tabela]
    }));
  };

  const handleSelecionarTodos = () => {
    const todosSelecionados = Object.values(tabelas).every(v => v);
    setTabelas({
      pesquisas: !todosSelecionados,
      especialistas: !todosSelecionados,
      apontamentos: !todosSelecionados,
      tickets: !todosSelecionados
    });
  };

  const handleConfirmar = () => {
    // Verificar se pelo menos uma tabela está selecionada
    const algumaSelecionada = Object.values(tabelas).some(v => v);
    if (!algumaSelecionada) {
      return;
    }
    
    console.log('✅ [MODAL] Tabelas selecionadas para sincronização:', tabelas);
    console.log('📊 [MODAL] Detalhes da seleção:', {
      pesquisas: tabelas.pesquisas ? 'SIM' : 'NÃO',
      especialistas: tabelas.especialistas ? 'SIM' : 'NÃO', 
      apontamentos: tabelas.apontamentos ? 'SIM' : 'NÃO',
      tickets: tabelas.tickets ? 'SIM' : 'NÃO'
    });
    
    onConfirm(tabelas);
  };

  const todosSelecionados = Object.values(tabelas).every(v => v);
  const algumaSelecionada = Object.values(tabelas).some(v => v);
  const quantidadeSelecionada = Object.values(tabelas).filter(v => v).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="h-5 w-5 text-blue-600" />
            Selecionar Tabelas para Sincronizar
          </DialogTitle>
          <DialogDescription>
            Escolha quais tabelas do SQL Server deseja sincronizar
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Opção: Selecionar Todos */}
          <div className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border-2 border-gray-200 dark:border-gray-700">
            <Checkbox
              id="todos"
              checked={todosSelecionados}
              onCheckedChange={handleSelecionarTodos}
              className="h-5 w-5"
            />
            <div className="flex-1 cursor-pointer" onClick={handleSelecionarTodos}>
              <Label
                htmlFor="todos"
                className="text-sm font-semibold text-gray-900 dark:text-white cursor-pointer flex items-center gap-2"
              >
                {todosSelecionados ? (
                  <CheckSquare className="h-4 w-4 text-blue-600" />
                ) : (
                  <Square className="h-4 w-4 text-gray-400" />
                )}
                Selecionar Todos
              </Label>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Sincronizar todas as tabelas de uma vez
              </p>
            </div>
          </div>

          {/* Divisor */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-gray-200 dark:border-gray-700" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white dark:bg-gray-900 px-2 text-gray-500">
                ou selecione individualmente
              </span>
            </div>
          </div>

          {/* Opções Individuais */}
          <div className="space-y-3">
            {/* AMSpesquisa */}
            <div className="flex items-center space-x-3 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-800">
              <Checkbox
                id="pesquisas"
                checked={tabelas.pesquisas}
                onCheckedChange={() => handleToggleTabela('pesquisas')}
                className="h-5 w-5"
              />
              <div className="flex-1 cursor-pointer" onClick={() => handleToggleTabela('pesquisas')}>
                <Label
                  htmlFor="pesquisas"
                  className="text-sm font-medium text-blue-900 dark:text-blue-100 cursor-pointer"
                >
                  📊 AMSpesquisa
                </Label>
                <p className="text-xs text-blue-700 dark:text-blue-300 mt-0.5">
                  Pesquisas de satisfação dos clientes
                </p>
              </div>
            </div>

            {/* AMSespecialistas */}
            <div className="flex items-center space-x-3 p-3 bg-purple-50 dark:bg-purple-950 rounded-lg border border-purple-200 dark:border-purple-800">
              <Checkbox
                id="especialistas"
                checked={tabelas.especialistas}
                onCheckedChange={() => handleToggleTabela('especialistas')}
                className="h-5 w-5"
              />
              <div className="flex-1 cursor-pointer" onClick={() => handleToggleTabela('especialistas')}>
                <Label
                  htmlFor="especialistas"
                  className="text-sm font-medium text-purple-900 dark:text-purple-100 cursor-pointer"
                >
                  👥 AMSespecialistas
                </Label>
                <p className="text-xs text-purple-700 dark:text-purple-300 mt-0.5">
                  Cadastro de especialistas e consultores
                </p>
              </div>
            </div>

            {/* AMSapontamento */}
            <div className="flex items-center space-x-3 p-3 bg-teal-50 dark:bg-teal-950 rounded-lg border border-teal-200 dark:border-teal-800">
              <Checkbox
                id="apontamentos"
                checked={tabelas.apontamentos}
                onCheckedChange={() => handleToggleTabela('apontamentos')}
                className="h-5 w-5"
              />
              <div className="flex-1 cursor-pointer" onClick={() => handleToggleTabela('apontamentos')}>
                <Label
                  htmlFor="apontamentos"
                  className="text-sm font-medium text-teal-900 dark:text-teal-100 cursor-pointer"
                >
                  📝 AMSapontamento
                </Label>
                <p className="text-xs text-teal-700 dark:text-teal-300 mt-0.5">
                  Apontamentos de horas e atividades
                </p>
              </div>
            </div>

            {/* AMSticketsabertos */}
            <div className="flex items-center space-x-3 p-3 bg-indigo-50 dark:bg-indigo-950 rounded-lg border border-indigo-200 dark:border-indigo-800">
              <Checkbox
                id="tickets"
                checked={tabelas.tickets}
                onCheckedChange={() => handleToggleTabela('tickets')}
                className="h-5 w-5"
              />
              <div className="flex-1 cursor-pointer" onClick={() => handleToggleTabela('tickets')}>
                <Label
                  htmlFor="tickets"
                  className="text-sm font-medium text-indigo-900 dark:text-indigo-100 cursor-pointer"
                >
                  🎫 AMSticketsabertos
                </Label>
                <p className="text-xs text-indigo-700 dark:text-indigo-300 mt-0.5">
                  Tickets e chamados abertos
                </p>
              </div>
            </div>
          </div>

          {/* Resumo da Seleção */}
          {algumaSelecionada && (
            <div className="p-3 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
              <p className="text-sm font-medium text-green-900 dark:text-green-100">
                ✓ {quantidadeSelecionada} {quantidadeSelecionada === 1 ? 'tabela selecionada' : 'tabelas selecionadas'}
              </p>
              <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                A sincronização pode levar alguns minutos dependendo da quantidade de dados
              </p>
            </div>
          )}

          {/* Aviso se nenhuma selecionada */}
          {!algumaSelecionada && (
            <div className="p-3 bg-yellow-50 dark:bg-yellow-950 rounded-lg border border-yellow-200 dark:border-yellow-800">
              <p className="text-sm font-medium text-yellow-900 dark:text-yellow-100">
                ⚠️ Selecione pelo menos uma tabela
              </p>
              <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                Você precisa selecionar ao menos uma tabela para sincronizar
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancelar
          </Button>
          <Button
            onClick={handleConfirmar}
            disabled={!algumaSelecionada || isLoading}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Database className="h-4 w-4 mr-2" />
            Sincronizar {quantidadeSelecionada > 0 && `(${quantidadeSelecionada})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
