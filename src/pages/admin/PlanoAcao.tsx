// =====================================================
// PÁGINA: PLANO DE AÇÃO
// =====================================================

import { useState } from 'react';
import { Plus, Filter, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { PlanoAcaoForm, PlanosAcaoTable, PlanoAcaoDetalhes } from '@/components/admin/plano-acao';
import {
  usePlanosAcao,
  useCriarPlanoAcao,
  useAtualizarPlanoAcao,
  useDeletarPlanoAcao,
  useEstatisticasPlanos,
  useHistoricoPlano,
} from '@/hooks/usePlanosAcao';
import type { PlanoAcaoCompleto, PlanoAcaoFormData, FiltrosPlanoAcao } from '@/types/planoAcao';
import { PRIORIDADE_OPTIONS, STATUS_PLANO_OPTIONS } from '@/types/planoAcao';
import { Search } from 'lucide-react';

export default function PlanoAcao() {
  const [filtros, setFiltros] = useState<FiltrosPlanoAcao>({});
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [modalAberto, setModalAberto] = useState(false);
  const [modalDetalhes, setModalDetalhes] = useState(false);
  const [planoSelecionado, setPlanoSelecionado] = useState<PlanoAcaoCompleto | null>(null);

  // Queries
  const { data: planos = [], isLoading } = usePlanosAcao(filtros);
  const { data: estatisticas } = useEstatisticasPlanos();
  const { data: historico = [] } = useHistoricoPlano(planoSelecionado?.id || '');

  // Mutations
  const criarPlano = useCriarPlanoAcao();
  const atualizarPlano = useAtualizarPlanoAcao();
  const deletarPlano = useDeletarPlanoAcao();

  const handleSubmit = async (dados: PlanoAcaoFormData) => {
    if (planoSelecionado) {
      await atualizarPlano.mutateAsync({ id: planoSelecionado.id, dados });
    } else {
      await criarPlano.mutateAsync(dados);
    }
    setModalAberto(false);
    setPlanoSelecionado(null);
  };

  const handleEditar = (plano: PlanoAcaoCompleto) => {
    setPlanoSelecionado(plano);
    setModalAberto(true);
  };

  const handleVisualizar = (plano: PlanoAcaoCompleto) => {
    setPlanoSelecionado(plano);
    setModalDetalhes(true);
  };

  const handleDeletar = async (id: string) => {
    await deletarPlano.mutateAsync(id);
  };

  const handleNovo = () => {
    setPlanoSelecionado(null);
    setModalAberto(true);
  };

  const handleFecharModal = () => {
    setModalAberto(false);
    setPlanoSelecionado(null);
  };

  const handleFecharDetalhes = () => {
    setModalDetalhes(false);
    setPlanoSelecionado(null);
  };

  return (
    <div className="space-y-6 p-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Plano de Ação</h1>
          <p className="text-muted-foreground">
            Gerenciamento de planos de ação para pesquisas de satisfação
          </p>
        </div>
        <Button onClick={handleNovo}>
          <Plus className="h-4 w-4 mr-2" />
          Novo Plano
        </Button>
      </div>

      {/* Cards de Estatísticas */}
      {estatisticas && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{estatisticas.total}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Abertos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-600">{estatisticas.abertos}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Em Andamento
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{estatisticas.em_andamento}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Aguardando
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {estatisticas.aguardando_retorno}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Concluídos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{estatisticas.concluidos}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Cancelados
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{estatisticas.cancelados}</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filtros */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Filtros</CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMostrarFiltros(!mostrarFiltros)}
            >
              <Filter className="h-4 w-4 mr-2" />
              {mostrarFiltros ? 'Ocultar' : 'Mostrar'} Filtros
            </Button>
          </div>
        </CardHeader>
        {mostrarFiltros && (
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {/* Busca */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar..."
                  value={filtros.busca || ''}
                  onChange={(e) => setFiltros({ ...filtros, busca: e.target.value })}
                  className="pl-9"
                />
              </div>

              {/* Prioridade */}
              <Select
                value={filtros.prioridade?.[0] || '__todos__'}
                onValueChange={(value) =>
                  setFiltros({
                    ...filtros,
                    prioridade: value === '__todos__' ? [] : [value as any],
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todas as prioridades" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__todos__">Todas as prioridades</SelectItem>
                  {PRIORIDADE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Status */}
              <Select
                value={filtros.status?.[0] || '__todos__'}
                onValueChange={(value) =>
                  setFiltros({
                    ...filtros,
                    status: value === '__todos__' ? [] : [value as any],
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Todos os status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__todos__">Todos os status</SelectItem>
                  {STATUS_PLANO_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Empresa */}
              <Input
                placeholder="Filtrar por empresa"
                value={filtros.empresa || ''}
                onChange={(e) => setFiltros({ ...filtros, empresa: e.target.value })}
              />
            </div>
          </CardContent>
        )}
      </Card>

      {/* Tabela */}
      <Card>
        <CardHeader>
          <CardTitle>Planos de Ação ({planos.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <PlanosAcaoTable
            planos={planos}
            onEdit={handleEditar}
            onDelete={handleDeletar}
            onView={handleVisualizar}
            isLoading={isLoading}
          />
        </CardContent>
      </Card>

      {/* Modal de Formulário */}
      <Dialog open={modalAberto} onOpenChange={setModalAberto}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {planoSelecionado ? 'Editar Plano de Ação' : 'Novo Plano de Ação'}
            </DialogTitle>
          </DialogHeader>
          <PlanoAcaoForm
            plano={planoSelecionado || undefined}
            pesquisaId={planoSelecionado?.pesquisa_id || ''}
            onSubmit={handleSubmit}
            onCancel={handleFecharModal}
            isLoading={criarPlano.isPending || atualizarPlano.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Modal de Detalhes */}
      <Dialog open={modalDetalhes} onOpenChange={setModalDetalhes}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes do Plano de Ação</DialogTitle>
          </DialogHeader>
          {planoSelecionado && (
            <PlanoAcaoDetalhes plano={planoSelecionado} historico={historico} />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
