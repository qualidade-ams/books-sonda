// =====================================================
// PÁGINA: PLANO DE AÇÃO
// =====================================================

import { useState, useEffect } from 'react';
import { Plus, Filter, Download, Search, ChevronLeft, ChevronRight, X, FileText, FolderOpen, PlayCircle, Clock, CheckCircle, XCircle } from 'lucide-react';
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
import { MonthYearPicker } from '@/components/ui/month-year-picker';
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
  const { data: historicoData = [] } = useHistoricoPlano(planoSelecionado?.id || '');
  
  // Garantir que o histórico tenha o tipo correto
  const historico = historicoData as any[];

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
    const confirmacao = window.confirm(
      'Tem certeza que deseja excluir este plano de ação?\n\n' +
      'ATENÇÃO: Esta ação também excluirá a pesquisa de satisfação relacionada e não pode ser desfeita.'
    );
    
    if (confirmacao) {
      await deletarPlano.mutateAsync(id);
    }
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
    const mesVigente = hoje.getMonth() + 1;
    const anoVigente = hoje.getFullYear();
    
    setMesSelecionado(mesVigente);
    setAnoSelecionado(anoVigente);
    setFiltros({
      mes: mesVigente,
      ano: anoVigente
    });
  };

  // Função para verificar se há filtros ativos
  const hasActiveFilters = () => {
    const hoje = new Date();
    const mesVigente = hoje.getMonth() + 1;
    const anoVigente = hoje.getFullYear();
    
    const periodoAlterado = filtros.mes !== mesVigente || filtros.ano !== anoVigente;
    
    return (filtros.busca && filtros.busca !== '') || 
           (filtros.prioridade && filtros.prioridade.length > 0) || 
           (filtros.status && filtros.status.length > 0) || 
           periodoAlterado;
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

      </div>

      {/* Cards de Estatísticas */}
      {estatisticas && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <FileText className="h-4 w-4 text-gray-500" />
                <p className="text-xs font-medium text-gray-500">Total</p>
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{estatisticas.total}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <FolderOpen className="h-4 w-4 text-gray-500" />
                <p className="text-xs font-medium text-gray-500">Abertos</p>
              </div>
              <p className="text-2xl font-bold text-gray-600">{estatisticas.abertos}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <PlayCircle className="h-4 w-4 text-blue-500" />
                <p className="text-xs font-medium text-blue-500">Em Andamento</p>
              </div>
              <p className="text-2xl font-bold text-blue-600">{estatisticas.em_andamento}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-yellow-500" />
                <p className="text-xs font-medium text-yellow-500">Aguardando</p>
              </div>
              <p className="text-2xl font-bold text-yellow-600">{estatisticas.aguardando_retorno}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <p className="text-xs font-medium text-green-500">Concluídos</p>
              </div>
              <p className="text-2xl font-bold text-green-600">{estatisticas.concluidos}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <XCircle className="h-4 w-4 text-red-500" />
                <p className="text-xs font-medium text-red-500">Cancelados</p>
              </div>
              <p className="text-2xl font-bold text-red-600">{estatisticas.cancelados}</p>
            </CardContent>
          </Card>
        </div>
      )}

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

      {/* Filtros */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
            <CardTitle className="text-lg flex items-center gap-2">
              Planos de Ação ({planos.length})
            </CardTitle>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setMostrarFiltros(!mostrarFiltros)}
                className="flex items-center justify-center space-x-2"
              >
                <Filter className="h-4 w-4" />
                <span>Filtros</span>
              </Button>
              
              {/* Botão Limpar Filtro - só aparece se há filtros ativos */}
              {hasActiveFilters() && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={limparFiltros}
                  className="whitespace-nowrap hover:border-red-300"
                >
                  <X className="h-4 w-4 mr-2 text-red-600" />
                  Limpar Filtro
                </Button>
              )}
            </div>
          </div>

          {/* Área de filtros expansível - PADRÃO DESIGN SYSTEM */}
          {mostrarFiltros && (
            <div className="space-y-4 pt-4 border-t">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Campo de busca com ícone */}
                <div>
                  <div className="text-sm font-medium mb-2">Buscar</div>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Buscar..."
                      value={filtros.busca || ''}
                      onChange={(e) => setFiltros({ ...filtros, busca: e.target.value })}
                      className="pl-10 focus:ring-sonda-blue focus:border-sonda-blue"
                    />
                  </div>
                </div>

                {/* Filtro Prioridade */}
                <div>
                  <div className="text-sm font-medium mb-2">Prioridade</div>
                  <Select
                    value={filtros.prioridade?.[0] || '__todos__'}
                    onValueChange={(value) =>
                      setFiltros({
                        ...filtros,
                        prioridade: value === '__todos__' ? [] : [value as any],
                      })
                    }
                  >
                    <SelectTrigger className="focus:ring-sonda-blue focus:border-sonda-blue">
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
                </div>

                {/* Filtro Status */}
                <div>
                  <div className="text-sm font-medium mb-2">Status</div>
                  <Select
                    value={filtros.status?.[0] || '__todos__'}
                    onValueChange={(value) =>
                      setFiltros({
                        ...filtros,
                        status: value === '__todos__' ? [] : [value as any],
                      })
                    }
                  >
                    <SelectTrigger className="focus:ring-sonda-blue focus:border-sonda-blue">
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
                </div>

                {/* Filtro Data da Resposta */}
                <div>
                  <div className="text-sm font-medium mb-2">Data da Resposta</div>
                  <MonthYearPicker
                    value={`${mesSelecionado.toString().padStart(2, '0')}/${anoSelecionado}`}
                    onChange={(value) => {
                      if (value) {
                        const [mes, ano] = value.split('/');
                        const novoMes = parseInt(mes);
                        const novoAno = parseInt(ano);
                        setMesSelecionado(novoMes);
                        setAnoSelecionado(novoAno);
                        setFiltros(prev => ({ ...prev, mes: novoMes, ano: novoAno }));
                      }
                    }}
                    placeholder="Selecione o período"
                    className="focus:ring-sonda-blue focus:border-sonda-blue"
                  />
                </div>
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
