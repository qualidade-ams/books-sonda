/**
 * Página para gerenciamento de taxas de clientes
 */

import { useState } from 'react';
import { Plus, Edit, Trash2, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';

import LayoutAdmin from '@/components/admin/LayoutAdmin';
import { TaxaForm } from '@/components/admin/taxas';
import { useTaxas, useCriarTaxa, useAtualizarTaxa, useDeletarTaxa } from '@/hooks/useTaxasClientes';
import type { TaxaClienteCompleta, TaxaFormData } from '@/types/taxasClientes';
import { calcularValores, getFuncoesPorProduto } from '@/types/taxasClientes';

function CadastroTaxasClientes() {
  const [modalAberto, setModalAberto] = useState(false);
  const [taxaEditando, setTaxaEditando] = useState<TaxaClienteCompleta | null>(null);
  const [taxaVisualizando, setTaxaVisualizando] = useState<TaxaClienteCompleta | null>(null);
  const [modalVisualizarAberto, setModalVisualizarAberto] = useState(false);

  // Queries e mutations
  const { data: taxas = [], isLoading, refetch } = useTaxas();
  const criarTaxa = useCriarTaxa();
  const atualizarTaxa = useAtualizarTaxa();
  const deletarTaxa = useDeletarTaxa();

  const handleNovaTaxa = () => {
    setTaxaEditando(null);
    setModalAberto(true);
  };

  const handleEditarTaxa = (taxa: TaxaClienteCompleta) => {
    setTaxaEditando(taxa);
    setModalAberto(true);
  };

  const handleVisualizarTaxa = (taxa: TaxaClienteCompleta) => {
    setTaxaVisualizando(taxa);
    setModalVisualizarAberto(true);
  };

  const handleDeletarTaxa = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir esta taxa?')) {
      try {
        await deletarTaxa.mutateAsync(id);
        await refetch();
      } catch (error) {
        console.error('Erro ao deletar taxa:', error);
      }
    }
  };

  const handleSubmit = async (dados: TaxaFormData) => {
    try {
      if (taxaEditando) {
        await atualizarTaxa.mutateAsync({ id: taxaEditando.id, dados });
      } else {
        await criarTaxa.mutateAsync(dados);
      }
      setModalAberto(false);
      setTaxaEditando(null);
      await refetch();
    } catch (error) {
      console.error('Erro ao salvar taxa:', error);
    }
  };

  const verificarVigente = (vigenciaInicio: string, vigenciaFim?: string) => {
    const hoje = new Date().toISOString().split('T')[0];
    const inicioValido = vigenciaInicio <= hoje;
    const fimValido = !vigenciaFim || vigenciaFim >= hoje;
    return inicioValido && fimValido;
  };

  return (
    <LayoutAdmin>
      <div className="space-y-6">
        {/* Cabeçalho */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Cadastro de Taxas dos Clientes
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Gerenciamento de taxas por cliente e vigência
            </p>
          </div>
          <Button onClick={handleNovaTaxa} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Nova Taxa
          </Button>
        </div>

        {/* Tabela de Taxas */}
        <Card>
          <CardHeader>
            <CardTitle>Taxas Cadastradas ({taxas.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Tipo Produto</TableHead>
                    <TableHead>Vigência Início</TableHead>
                    <TableHead>Vigência Fim</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-center">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                        Carregando...
                      </TableCell>
                    </TableRow>
                  ) : taxas.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                        Nenhuma taxa cadastrada
                      </TableCell>
                    </TableRow>
                  ) : (
                    taxas.map((taxa) => {
                      const vigente = verificarVigente(taxa.vigencia_inicio, taxa.vigencia_fim);
                      
                      return (
                        <TableRow key={taxa.id}>
                          <TableCell className="font-medium">
                            {taxa.cliente?.nome_abreviado || '-'}
                          </TableCell>
                          <TableCell>
                            <Badge variant={taxa.tipo_produto === 'GALLERY' ? 'default' : 'secondary'}>
                              {taxa.tipo_produto}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {format(new Date(taxa.vigencia_inicio + 'T00:00:00'), 'dd/MM/yyyy', { locale: ptBR })}
                          </TableCell>
                          <TableCell>
                            {taxa.vigencia_fim 
                              ? format(new Date(taxa.vigencia_fim + 'T00:00:00'), 'dd/MM/yyyy', { locale: ptBR })
                              : 'Indefinida'}
                          </TableCell>
                          <TableCell>
                            <Badge variant={vigente ? 'default' : 'secondary'} className={vigente ? 'bg-green-600' : ''}>
                              {vigente ? 'Vigente' : 'Não Vigente'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-center gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleVisualizarTaxa(taxa)}
                                title="Visualizar"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                onClick={() => handleEditarTaxa(taxa)}
                                title="Editar"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={() => handleDeletarTaxa(taxa.id)}
                                title="Excluir"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Modal de Criar/Editar */}
        <Dialog open={modalAberto} onOpenChange={setModalAberto}>
          <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{taxaEditando ? 'Editar Taxa' : 'Nova Taxa'}</DialogTitle>
            </DialogHeader>
            <TaxaForm
              taxa={taxaEditando}
              onSubmit={handleSubmit}
              onCancel={() => {
                setModalAberto(false);
                setTaxaEditando(null);
              }}
              isLoading={criarTaxa.isPending || atualizarTaxa.isPending}
            />
          </DialogContent>
        </Dialog>

        {/* Modal de Visualização */}
        <Dialog open={modalVisualizarAberto} onOpenChange={setModalVisualizarAberto}>
          <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Detalhes da Taxa</DialogTitle>
            </DialogHeader>
            {taxaVisualizando && (
              <div className="space-y-6">
                {/* Informações Gerais */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Cliente</p>
                    <p className="text-lg font-semibold">{taxaVisualizando.cliente?.nome_completo}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Tipo de Produto</p>
                    <Badge variant={taxaVisualizando.tipo_produto === 'GALLERY' ? 'default' : 'secondary'}>
                      {taxaVisualizando.tipo_produto}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Vigência Início</p>
                    <p className="text-lg">
                      {format(new Date(taxaVisualizando.vigencia_inicio + 'T00:00:00'), 'dd/MM/yyyy', { locale: ptBR })}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Vigência Fim</p>
                    <p className="text-lg">
                      {taxaVisualizando.vigencia_fim 
                        ? format(new Date(taxaVisualizando.vigencia_fim + 'T00:00:00'), 'dd/MM/yyyy', { locale: ptBR })
                        : 'Indefinida'}
                    </p>
                  </div>
                </div>

                {/* Tabela de Valores Remotos */}
                <div>
                  <h3 className="text-base font-semibold mb-3 text-gray-900 dark:text-white">Valores Hora Remota</h3>
                  <div className="overflow-x-auto rounded-lg border-gray-200 dark:border-gray-700">
                    <table className="w-full border-collapse table-fixed">
                      <colgroup>
                        <col style={{ width: '200px' }} />
                        <col style={{ width: '150px' }} />
                        <col style={{ width: '150px' }} />
                        <col style={{ width: '150px' }} />
                        <col style={{ width: '150px' }} />
                        <col style={{ width: '150px' }} />
                        <col style={{ width: '130px' }} />
                      </colgroup>
                      <thead>
                        <tr className="bg-[#0066FF] text-white">
                          <th className="border-r border-white/20 px-3 py-2.5 text-left text-xs font-semibold">Função</th>
                          <th className="border-r border-white/20 px-3 py-2.5 text-center text-xs font-semibold">Seg-Sex<br/>08h30-17h30</th>
                          <th className="border-r border-white/20 px-3 py-2.5 text-center text-xs font-semibold">Seg-Sex<br/>17h30-19h30</th>
                          <th className="border-r border-white/20 px-3 py-2.5 text-center text-xs font-semibold">Seg-Sex<br/>Após 19h30</th>
                          <th className="border-r border-white/20 px-3 py-2.5 text-center text-xs font-semibold">Sáb/Dom/<br/>Feriados</th>
                          <th className="border-r border-white/20 px-3 py-2.5 text-center text-xs font-semibold">Hora Adicional <br/>(Excedente do Banco)</th>
                          <th className="px-3 py-2.5 text-center text-xs font-semibold">Stand<br/>By</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-800">
                        {getFuncoesPorProduto(taxaVisualizando.tipo_produto).map((funcao, index) => {
                          const valorBase = taxaVisualizando.valores_remota?.find(v => v.funcao === funcao);
                          if (!valorBase) return null;

                          const todasFuncoes = taxaVisualizando.valores_remota?.map(v => ({
                            funcao: v.funcao,
                            valor_base: v.valor_base
                          })) || [];

                          const valores = calcularValores(valorBase.valor_base, funcao, todasFuncoes);

                          return (
                            <tr key={funcao} className={index % 2 === 0 ? 'bg-gray-50 dark:bg-gray-900/50' : 'bg-white dark:bg-gray-800'}>
                              <td className="border-r border-gray-200 dark:border-gray-700 px-3 py-2 text-xs font-medium text-gray-900 dark:text-white">{funcao}</td>
                              <td className="border-r border-gray-200 dark:border-gray-700 px-3 py-2 text-center text-xs font-semibold text-gray-900 dark:text-white">
                                R$ {valores.valor_base.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                              <td className="border-r border-gray-200 dark:border-gray-700 px-3 py-2 text-center text-xs text-gray-700 dark:text-gray-300 bg-blue-50 dark:bg-blue-900/20">
                                R$ {valores.valor_17h30_19h30.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                              <td className="border-r border-gray-200 dark:border-gray-700 px-3 py-2 text-center text-xs text-gray-700 dark:text-gray-300 bg-blue-50 dark:bg-blue-900/20">
                                R$ {valores.valor_apos_19h30.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                              <td className="border-r border-gray-200 dark:border-gray-700 px-3 py-2 text-center text-xs text-gray-700 dark:text-gray-300 bg-blue-50 dark:bg-blue-900/20">
                                R$ {valores.valor_fim_semana.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                              <td className="border-r border-gray-200 dark:border-gray-700 px-3 py-2 text-center text-xs text-gray-700 dark:text-gray-300 bg-blue-50 dark:bg-blue-900/20">
                                R$ {valores.valor_adicional.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                              <td className="px-3 py-2 text-center text-xs text-gray-700 dark:text-gray-300 bg-blue-50 dark:bg-blue-900/20">
                                R$ {valores.valor_standby.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Tabela de Valores Locais */}
                <div>
                  <h3 className="text-base font-semibold mb-3 text-gray-900 dark:text-white">Valores Hora Local</h3>
                  <div className="rounded-lg border-gray-200 dark:border-gray-700 overflow-hidden">
                    <table className="w-full border-collapse table-fixed">
                      <colgroup>
                        <col style={{ width: '200px' }} />
                        <col style={{ width: '150px' }} />
                        <col style={{ width: '150px' }} />
                        <col style={{ width: '150px' }} />
                        <col style={{ width: '150px' }} />
                        <col style={{ width: '150px' }} />
                        <col style={{ width: '130px' }} />
                      </colgroup>
                      <thead>
                        <tr className="bg-[#0066FF] text-white">
                          <th className="border-r border-white/20 px-3 py-2.5 text-left text-xs font-semibold rounded-tl-lg">Função</th>
                          <th className="border-r border-white/20 px-3 py-2.5 text-center text-xs font-semibold">Seg-Sex<br/>08h30-17h30</th>
                          <th className="border-r border-white/20 px-3 py-2.5 text-center text-xs font-semibold">Seg-Sex<br/>17h30-19h30</th>
                          <th className="border-r border-white/20 px-3 py-2.5 text-center text-xs font-semibold">Seg-Sex<br/>Após 19h30</th>
                          <th className="px-3 py-2.5 text-center text-xs font-semibold rounded-tr-lg">Sáb/Dom/<br/>Feriados</th>
                          <th className="px-3 py-2.5 text-center text-xs font-semibold invisible"></th>
                          <th className="px-3 py-2.5 text-center text-xs font-semibold invisible"></th>
                        </tr>
                      </thead>
                      <tbody className="bg-white dark:bg-gray-800">
                        {getFuncoesPorProduto(taxaVisualizando.tipo_produto).map((funcao, index) => {
                          const valorBase = taxaVisualizando.valores_local?.find(v => v.funcao === funcao);
                          if (!valorBase) return null;

                          const todasFuncoes = taxaVisualizando.valores_local?.map(v => ({
                            funcao: v.funcao,
                            valor_base: v.valor_base
                          })) || [];

                          const valores = calcularValores(valorBase.valor_base, funcao, todasFuncoes);

                          return (
                            <tr key={funcao} className={index % 2 === 0 ? 'bg-gray-50 dark:bg-gray-900/50' : 'bg-white dark:bg-gray-800'}>
                              <td className="border-r border-gray-200 dark:border-gray-700 px-3 py-2 text-xs font-medium text-gray-900 dark:text-white">{funcao}</td>
                              <td className="border-r border-gray-200 dark:border-gray-700 px-3 py-2 text-center text-xs font-semibold text-gray-900 dark:text-white">
                                R$ {valores.valor_base.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                              <td className="border-r border-gray-200 dark:border-gray-700 px-3 py-2 text-center text-xs text-gray-700 dark:text-gray-300 bg-blue-50 dark:bg-blue-900/20">
                                R$ {valores.valor_17h30_19h30.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                              <td className="border-r border-gray-200 dark:border-gray-700 px-3 py-2 text-center text-xs text-gray-700 dark:text-gray-300 bg-blue-50 dark:bg-blue-900/20">
                                R$ {valores.valor_apos_19h30.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                              <td className={`px-3 py-2 text-center text-xs text-gray-700 dark:text-gray-300 bg-blue-50 dark:bg-blue-900/20 ${index === getFuncoesPorProduto(taxaVisualizando.tipo_produto).length - 1 ? 'rounded-br-lg' : ''}`}>
                                R$ {valores.valor_fim_semana.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>
                              <td className="px-3 py-2 invisible"></td>
                              <td className="px-3 py-2 invisible"></td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button onClick={() => setModalVisualizarAberto(false)}>
                    Fechar
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </LayoutAdmin>
  );
}

export default CadastroTaxasClientes;
