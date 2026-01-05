// =====================================================
// PÁGINA: PLANO DE AÇÃO
// =====================================================

import { useState, useEffect } from 'react';
import { Plus, Filter, Download, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import LayoutAdmin from '@/components/admin/LayoutAdmin';
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
import { useCacheManager } from '@/hooks/useCacheManager';
import type { PlanoAcaoCompleto, PlanoAcaoFormData, FiltrosPlanoAcao } from '@/types/planoAcao';
import { PRIORIDADE_OPTIONS, STATUS_PLANO_OPTIONS } from '@/types/planoAcao';

export default function PlanoAcao() {
  const { clearFeatureCache } = useCacheManager();
  
  // Limpar cache ao entrar na tela
  useEffect(() => {
    clearFeatureCache('planos');
  }, [clearFeatureCache]);

  // Estados de navegação de mês/ano
  const [mesAtual] = useState(new Date().getMonth() + 1);
  const [anoAtual] = useState(new Date().getFullYear());
  const [mesSelecionado, setMesSelecionado] = useState(mesAtual);
  const [anoSelecionado, setAnoSelecionado] = useState(anoAtual);

  const [filtros, setFiltros] = useState<FiltrosPlanoAcao>({
    mes: mesAtual,
    ano: anoAtual
  });
  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [modalAberto, setModalAberto] = useState(false);
  const [modalDetalhes, setModalDetalhes] = useState(false);
  const [planoSelecionado, setPlanoSelecionado] = useState<PlanoAcaoCompleto | null>(null);

  // Nomes dos meses
  const nomesMeses = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  // Navegação de mês
  const navegarMesAnterior = () => {
    if (mesSelecionado === 1) {
      const novoAno = anoSelecionado - 1;
      setMesSelecionado(12);
      setAnoSelecionado(novoAno);
      setFiltros(prev => ({ ...prev, mes: 12, ano: novoAno }));
    } else {
      const novoMes = mesSelecionado - 1;
      setMesSelecionado(novoMes);
      setFiltros(prev => ({ ...prev, mes: novoMes }));
    }
  };

  const navegarMesProximo = () => {
    if (mesSelecionado === 12) {
      const novoAno = anoSelecionado + 1;
      setMesSelecionado(1);
      setAnoSelecionado(novoAno);
      setFiltros(prev => ({ ...prev, mes: 1, ano: novoAno }));
    } else {
      const novoMes = mesSelecionado + 1;
      setMesSelecionado(novoMes);
      setFiltros(prev => ({ ...prev, mes: novoMes }));
    }
  };

  // Queries
  const { data: planos = [], isLoading } = usePlanosAcao(filtros);
  const { data: estatisticas } = useEstatisticasPlanos(filtros);
  const { data: historico = [] } = useHistoricoPlano(planoSelecionado?.id || '');

  // Debug: Log dos dados
  console.log('🔍 Debug Plano de Ação:', {
    filtros,
    totalPlanos: planos.length,
    planos: planos.slice(0, 3), // Primeiros 3 planos
    estatisticas,
    isLoading
  });

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

  // Função para limpar todos os filtros
  const limparFiltros = () => {
    const hoje = new Date();
    setFiltros({
      mes: hoje.getMonth() + 1,
      ano: hoje.getFullYear()
    });
  };

  return (
    <LayoutAdmin>
      <div className="space-y-6">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900 dark:text-white">Plano de Ação</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Gerenciamento de planos de ação para pesquisas de satisfação
          </p>
        </div>
        <Button onClick={handleNovo} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Novo Plano
        </Button>
      </div>

      {/* Navegação de Período */}
      <Card>
        <CardContent className="py-3">
          <div className="flex items-center justify-between gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={navegarMesAnterior}
              className="flex items-center gap-2"
            >
              <ChevronLeft className="h-4 w-4" />
              Anterior
            </Button>

            <div className="text-center">
              <div className="text-lg font-semibold text-gray-900 dark:text-white">
                {nomesMeses[mesSelecionado - 1]} {anoSelecionado}
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={navegarMesProximo}
              className="flex items-center gap-2"
            >
              Próximo
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

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
            <CardTitle>Planos de Ação ({planos.length})</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setMostrarFiltros(!mostrarFiltros)}
            >
              <Filter className="h-4 w-4 mr-2" />
              Filtros
            </Button>
          </div>
          {mostrarFiltros && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4 pt-4 border-t">
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
              <div className="flex gap-2">
                <Input
                  placeholder="Filtrar por empresa"
                  value={filtros.empresa || ''}
                  onChange={(e) => setFiltros({ ...filtros, empresa: e.target.value })}
                  className="flex-1"
                />
                
                {/* Botão Limpar Filtros */}
                <Button
                  variant="outline"
                  onClick={limparFiltros}
                  disabled={
                    !filtros.busca && 
                    (!filtros.prioridade || filtros.prioridade.length === 0) && 
                    (!filtros.status || filtros.status.length === 0) && 
                    !filtros.empresa
                  }
                  className="h-10 px-3"
                >
                  Limpar
                </Button>
              </div>
            </div>
          )}
        </CardHeader>
        <CardContent>
          <PlanosAcaoTable
            planos={planos}
            onEditar={handleEditar}
            onExcluir={handleDeletar}
            onVisualizar={handleVisualizar}
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
    </LayoutAdmin>
  );
}
