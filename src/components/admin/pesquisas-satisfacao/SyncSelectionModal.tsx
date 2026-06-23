/**
 * Modal de seleção de tabelas para sincronização
 */

import { useState } from 'react';
import { Database, CheckSquare, Square, CalendarDays, Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
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
import { Input } from '@/components/ui/input';
import { useUltimasSincronizacoesPorTabela } from '@/hooks/usePesquisasSqlServer';

export interface TabelasSincronizacao {
  pesquisas: boolean;
  especialistas: boolean;
  apontamentos: boolean;
  tickets: boolean;
  dataInicial?: string; // formato YYYY-MM-DD
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
  const [dataInicial, setDataInicial] = useState<string>('');
  const { t } = useTranslation();
  // Buscar última sincronização de cada tabela
  const { data: ultimasSincronizacoes } = useUltimasSincronizacoesPorTabela();

  const formatarDataSync = (isoDate: string | null | undefined) => {
    if (!isoDate) return null;
    const date = new Date(isoDate);
    return date.toLocaleString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

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
    
    const dadosSincronizacao: TabelasSincronizacao = {
      ...tabelas,
      dataInicial: dataInicial || undefined
    };
    
    console.log('✅ [MODAL] Tabelas selecionadas para sincronização:', dadosSincronizacao);
    console.log('📊 [MODAL] Detalhes da seleção:', {
      pesquisas: tabelas.pesquisas ? 'SIM' : 'NÃO',
      especialistas: tabelas.especialistas ? 'SIM' : 'NÃO', 
      apontamentos: tabelas.apontamentos ? 'SIM' : 'NÃO',
      tickets: tabelas.tickets ? 'SIM' : 'NÃO',
      dataInicial: dataInicial || 'automática (incremental)'
    });
    
    onConfirm(dadosSincronizacao);
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
            {t('lancarPesquisas.syncTitle')}
          </DialogTitle>
          <DialogDescription>
            {t('lancarPesquisas.syncDescription')}
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
                {t('lancarPesquisas.selectAll')}
              </Label>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                {t('lancarPesquisas.syncAllTables')}
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
                {t('lancarPesquisas.orSelectIndividually')}
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
                  {t('lancarPesquisas.amsPesquisaDesc')}
                </p>
              </div>
              {ultimasSincronizacoes?.pesquisas && (
                <div className="flex items-center gap-1 text-[10px] text-blue-600 dark:text-blue-400 whitespace-nowrap">
                  <Clock className="h-3 w-3" />
                  <span>{formatarDataSync(ultimasSincronizacoes.pesquisas)}</span>
                </div>
              )}
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
                  {t('lancarPesquisas.amsEspecialistasDesc')}
                </p>
              </div>
              {ultimasSincronizacoes?.especialistas && (
                <div className="flex items-center gap-1 text-[10px] text-purple-600 dark:text-purple-400 whitespace-nowrap">
                  <Clock className="h-3 w-3" />
                  <span>{formatarDataSync(ultimasSincronizacoes.especialistas)}</span>
                </div>
              )}
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
                  {t('lancarPesquisas.amsApontamentoDesc')}
                </p>
              </div>
              {ultimasSincronizacoes?.apontamentos && (
                <div className="flex items-center gap-1 text-[10px] text-teal-600 dark:text-teal-400 whitespace-nowrap">
                  <Clock className="h-3 w-3" />
                  <span>{formatarDataSync(ultimasSincronizacoes.apontamentos)}</span>
                </div>
              )}
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
                  {t('lancarPesquisas.amsTicketsDesc')}
                </p>
              </div>
              {ultimasSincronizacoes?.tickets && (
                <div className="flex items-center gap-1 text-[10px] text-indigo-600 dark:text-indigo-400 whitespace-nowrap">
                  <Clock className="h-3 w-3" />
                  <span>{formatarDataSync(ultimasSincronizacoes.tickets)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Campo de Data Inicial */}
          <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2 mb-2">
              <CalendarDays className="h-4 w-4 text-gray-600 dark:text-gray-400" />
              <Label htmlFor="dataInicial" className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('lancarPesquisas.startDate')}
              </Label>
            </div>
            <Input
              id="dataInicial"
              type="date"
              value={dataInicial}
              onChange={(e) => setDataInicial(e.target.value)}
              className="focus:ring-sonda-blue focus:border-sonda-blue"
              placeholder="dd/mm/aaaa"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1.5">
              {dataInicial 
                ? t('lancarPesquisas.syncFromDate', { date: new Date(dataInicial + 'T00:00:00').toLocaleDateString() })
                : t('lancarPesquisas.leaveEmptyForIncremental')
              }
            </p>
          </div>

          {/* Resumo da Seleção */}
          {algumaSelecionada && (
            <div className="p-3 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
              <p className="text-sm font-medium text-green-900 dark:text-green-100">
                ✓ {quantidadeSelecionada === 1 ? t('lancarPesquisas.tablesSelected', { count: quantidadeSelecionada }) : t('lancarPesquisas.tablesSelectedPlural', { count: quantidadeSelecionada })}
              </p>
              <p className="text-xs text-green-700 dark:text-green-300 mt-1">
                {t('lancarPesquisas.syncMayTakeMinutes')}
              </p>
            </div>
          )}

          {/* Aviso se nenhuma selecionada */}
          {!algumaSelecionada && (
            <div className="p-3 bg-yellow-50 dark:bg-yellow-950 rounded-lg border border-yellow-200 dark:border-yellow-800">
              <p className="text-sm font-medium text-yellow-900 dark:text-yellow-100">
                ⚠️ {t('lancarPesquisas.selectAtLeastOneTable')}
              </p>
              <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                {t('lancarPesquisas.needSelectOneTable')}
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
            {t('common.cancel')}
          </Button>
          <Button
            onClick={handleConfirmar}
            disabled={!algumaSelecionada || isLoading}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <Database className="h-4 w-4 mr-2" />
            {t('lancarPesquisas.syncButton')} {quantidadeSelecionada > 0 && `(${quantidadeSelecionada})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
