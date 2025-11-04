import { Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import type { StatusControleMensal } from '@/types/clientBooks';

interface FiltrosStatusDisparosProps {
  statusSelecionado: StatusControleMensal | 'todos';
  onStatusChange: (status: StatusControleMensal | 'todos') => void;
  estatisticas: {
    total: number;
    enviados: number;
    pendentes: number;
    falhas: number;
    agendados: number;
  };
  mostrarFiltros: boolean;
  onToggleFiltros: () => void;
}

const FiltrosStatusDisparos = ({
  statusSelecionado,
  onStatusChange,
  estatisticas,
  mostrarFiltros,
  onToggleFiltros
}: FiltrosStatusDisparosProps) => {
  const opcoesFiltro = [
    { value: 'todos', label: 'Todos os Status', count: estatisticas.total },
    { value: 'enviado', label: 'Enviados', count: estatisticas.enviados },
    { value: 'pendente', label: 'Pendentes', count: estatisticas.pendentes },
    { value: 'falhou', label: 'Falhas', count: estatisticas.falhas },
    { value: 'agendado', label: 'Agendados', count: estatisticas.agendados },
  ] as const;

  return (
    <>
      {/* Botão de Filtros para o Header */}
      <Button
        variant="outline"
        size="sm"
        onClick={onToggleFiltros}
        className="flex items-center justify-center space-x-2"
      >
        <Filter className="h-4 w-4" />
        <span>Filtros</span>
      </Button>

      {/* Seção de Filtros Expansível */}
      {mostrarFiltros && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t">
          <div className="space-y-2">
            <label className="text-sm font-medium">Status do Disparo</label>
            <Select
              value={statusSelecionado}
              onValueChange={(value) => onStatusChange(value as StatusControleMensal | 'todos')}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o status" />
              </SelectTrigger>
              <SelectContent>
                {opcoesFiltro.map((opcao) => (
                  <SelectItem key={opcao.value} value={opcao.value}>
                    <div className="flex items-center justify-between w-full">
                      <span>{opcao.label}</span>
                      <Badge variant="secondary" className="ml-2">
                        {opcao.count}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Status Atual</label>
            <div className="flex items-center h-10 px-3 border rounded-md bg-gray-50 dark:bg-gray-800">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {opcoesFiltro.find(opcao => opcao.value === statusSelecionado)?.label || 'Nenhum filtro'}
              </span>
              <Badge variant="secondary" className="ml-2">
                {opcoesFiltro.find(opcao => opcao.value === statusSelecionado)?.count || 0}
              </Badge>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Ações</label>
            <Button
              variant="outline"
              onClick={() => onStatusChange('todos')}
              disabled={statusSelecionado === 'todos'}
              className="w-full h-10"
            >
              Limpar Filtros
            </Button>
          </div>
        </div>
      )}
    </>
  );
};

export default FiltrosStatusDisparos;