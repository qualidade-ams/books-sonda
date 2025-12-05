import { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Edit, Trash2, Eye } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog';
import { TaxaPadraoForm } from './TaxaPadraoForm';
import type { TaxaPadraoData } from './TaxaPadraoForm';
import { useHistoricoTaxasPadrao, useAtualizarTaxaPadrao, useDeletarTaxaPadrao } from '@/hooks/useTaxasPadrao';
import type { TaxaPadraoCompleta } from '@/services/taxaPadraoService';
import { calcularValores, getFuncoesPorProduto } from '@/types/taxasClientes';

interface TaxaPadraoHistoricoProps {
  tipoProduto: 'GALLERY' | 'OUTROS';
}

export function TaxaPadraoHistorico({ tipoProduto }: TaxaPadraoHistoricoProps) {
  const [taxaEditando, setTaxaEditando] = useState<TaxaPadraoCompleta | null>(null);
  const [taxaVisualizando, setTaxaVisualizando] = useState<TaxaPadraoCompleta | null>(null);
  const [modalEditarAberto, setModalEditarAberto] = useState(false);
  const [modalVisualizarAberto, setModalVisualizarAberto] = useState(false);

  const { data: historico = [], isLoading } = useHistoricoTaxasPadrao(tipoProduto);
  const atualizarTaxa = useAtualizarTaxaPadrao();
  const deletarTaxa = useDeletarTaxaPadrao();

  const handleEditar = (taxa: TaxaPadraoCompleta) => {
    setTaxaEditando(taxa);
    setModalEditarAberto(true);
  };

  const handleVisualizar = (taxa: TaxaPadraoCompleta) => {
    setTaxaVisualizando(taxa);
    setModalVisualizarAberto(true);
  };

  const handleDeletar = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir esta taxa padrão?')) {
      await deletarTaxa.mutateAsync(id);
    }
  };

  const handleSubmitEdicao = async (dados: TaxaPadraoData) => {
    if (taxaEditando) {
      await atualizarTaxa.mutateAsync({ id: taxaEditando.id, dados });
      setModalEditarAberto(false);
      setTaxaEditando(null);
    }
  };

  const getStatusVigencia = (vigenciaInicio: Date | string | undefined, vigenciaFim: Date | string | null | undefined) => {
    try {
      const hoje = new Date();
      
      let inicio: Date;
      if (typeof vigenciaInicio === 'string') {
        inicio = new Date(vigenciaInicio.includes('T') ? vigenciaInicio : vigenciaInicio + 'T00:00:00');
      } else if (vigenciaInicio instanceof Date) {
        inicio = vigenciaInicio;
      } else {
        return { label: 'Indefinido', variant: 'outline' as const };
      }
      
      let fim: Date | null = null;
      if (vigenciaFim) {
        if (typeof vigenciaFim === 'string') {
          fim = new Date(vigenciaFim.includes('T') ? vigenciaFim : vigenciaFim + 'T00:00:00');
        } else if (vigenciaFim instanceof Date) {
          fim = vigenciaFim;
        }
      }

      // Verificar se as datas são válidas
      if (isNaN(inicio.getTime())) {
        return { label: 'Indefinido', variant: 'outline' as const };
      }

      if (inicio > hoje) {
        return { label: 'Futura', variant: 'secondary' as const };
      } else if (!fim || isNaN(fim.getTime()) || fim >= hoje) {
        return { label: 'Vigente', variant: 'default' as const };
      } else {
        return { label: 'Expirada', variant: 'outline' as const };
      }
    } catch (error) {
      console.error('Erro ao calcular status de vigência:', error);
      return { label: 'Indefinido', variant: 'outline' as const };
    }
  };

  const formatarData = (data: Date | string | undefined): string => {
    if (!data) return 'Indefinida';
    
    try {
      let dataObj: Date;
      
      if (typeof data === 'string') {
        // Se for string, adicionar horário para evitar problemas de timezone
        dataObj = new Date(data.includes('T') ? data : data + 'T00:00:00');
      } else {
        dataObj = data;
      }
      
      // Verificar se a data é válida
      if (isNaN(dataObj.getTime())) {
        return 'Data inválida';
      }
      
      return format(dataObj, 'dd/MM/yyyy', { locale: ptBR });
    } catch (error) {
      console.error('Erro ao formatar data:', error, data);
      return 'Data inválida';
    }
  };

  if (isLoading) {
    return <div className="text-center py-8">Carregando histórico...</div>;
  }

  if (historico.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        Nenhuma taxa padrão cadastrada para {tipoProduto === 'GALLERY' ? 'GALLERY' : 'COMEX, FISCAL'}
      </div>
    );
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tipo</TableHead>
              <TableHead>Tipo Produto</TableHead>
              <TableHead>Vigência Início</TableHead>
              <TableHead>Vigência Fim</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-center">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {historico.map((taxa) => {
              const status = getStatusVigencia(taxa.vigencia_inicio, taxa.vigencia_fim);
              
              return (
                <TableRow key={taxa.id}>
                  <TableCell className="font-medium">
                    Taxa Padrão
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant={taxa.tipo_produto === 'GALLERY' ? 'default' : 'outline'}
                      className={taxa.tipo_produto === 'GALLERY' 
                        ? 'bg-[#0066FF] text-white hover:bg-[#0052CC]' 
                        : 'border-[#0066FF] text-[#0066FF] bg-white hover:bg-blue-50'
                      }
                    >
                      {taxa.tipo_produto === 'GALLERY' ? 'GALLERY' : 'COMEX, FISCAL'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {formatarData(taxa.vigencia_inicio)}
                  </TableCell>
                  <TableCell>
                    {formatarData(taxa.vigencia_fim)}
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant={status.variant}
                      className={status.label === 'Vigente' ? 'bg-green-600' : ''}
                    >
                      {status.label}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleVisualizar(taxa)}
                        title="Visualizar"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleEditar(taxa)}
                        title="Editar"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleDeletar(taxa.id)}
                        title="Excluir"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Modal de Edição */}
      <Dialog open={modalEditarAberto} onOpenChange={setModalEditarAberto}>
        <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Taxa Padrão</DialogTitle>
          </DialogHeader>
          <TaxaPadraoForm
            taxaPadrao={taxaEditando}
            onSubmit={handleSubmitEdicao}
            onCancel={() => {
              setModalEditarAberto(false);
              setTaxaEditando(null);
            }}
            isLoading={atualizarTaxa.isPending}
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
                  <p className="text-lg font-semibold">Taxa Padrão</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Tipo de Produto</p>
                  <Badge 
                    variant={taxaVisualizando.tipo_produto === 'GALLERY' ? 'default' : 'outline'}
                    className={taxaVisualizando.tipo_produto === 'GALLERY' 
                      ? 'bg-[#0066FF] text-white hover:bg-[#0052CC]' 
                      : 'border-[#0066FF] text-[#0066FF] bg-white hover:bg-blue-50'
                    }
                  >
                    {taxaVisualizando.tipo_produto === 'GALLERY' ? 'GALLERY' : 'COMEX, FISCAL'}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Vigência Início</p>
                  <p className="text-lg">
                    {formatarData(taxaVisualizando.vigencia_inicio)}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Vigência Fim</p>
                  <p className="text-lg">
                    {formatarData(taxaVisualizando.vigencia_fim)}
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
                        // Mapear função para o campo correto
                        let valorBase = 0;
                        if (funcao === 'Funcional') {
                          valorBase = taxaVisualizando.valores_remota.funcional;
                        } else if (funcao === 'Técnico / ABAP' || funcao === 'Técnico (Instalação / Atualização)') {
                          valorBase = taxaVisualizando.valores_remota.tecnico;
                        } else if (funcao === 'ABAP - PL/SQL') {
                          valorBase = taxaVisualizando.valores_remota.abap || 0;
                        } else if (funcao === 'DBA / Basis' || funcao === 'DBA') {
                          valorBase = taxaVisualizando.valores_remota.dba;
                        } else if (funcao === 'Gestor') {
                          valorBase = taxaVisualizando.valores_remota.gestor;
                        }

                        // Preparar array com todas as funções para cálculo
                        const todasFuncoes = getFuncoesPorProduto(taxaVisualizando.tipo_produto).map(f => {
                          let vb = 0;
                          if (f === 'Funcional') vb = taxaVisualizando.valores_remota.funcional;
                          else if (f === 'Técnico / ABAP' || f === 'Técnico (Instalação / Atualização)') vb = taxaVisualizando.valores_remota.tecnico;
                          else if (f === 'ABAP - PL/SQL') vb = taxaVisualizando.valores_remota.abap || 0;
                          else if (f === 'DBA / Basis' || f === 'DBA') vb = taxaVisualizando.valores_remota.dba;
                          else if (f === 'Gestor') vb = taxaVisualizando.valores_remota.gestor;
                          return { funcao: f, valor_base: vb };
                        });

                        const valores = calcularValores(
                          valorBase, 
                          funcao, 
                          todasFuncoes, 
                          taxaVisualizando.tipo_calculo_adicional || 'media',
                          taxaVisualizando.tipo_produto
                        );

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
                        // Mapear função para o campo correto
                        let valorBase = 0;
                        if (funcao === 'Funcional') {
                          valorBase = taxaVisualizando.valores_local.funcional;
                        } else if (funcao === 'Técnico / ABAP' || funcao === 'Técnico (Instalação / Atualização)') {
                          valorBase = taxaVisualizando.valores_local.tecnico;
                        } else if (funcao === 'ABAP - PL/SQL') {
                          valorBase = taxaVisualizando.valores_local.abap || 0;
                        } else if (funcao === 'DBA / Basis' || funcao === 'DBA') {
                          valorBase = taxaVisualizando.valores_local.dba;
                        } else if (funcao === 'Gestor') {
                          valorBase = taxaVisualizando.valores_local.gestor;
                        }

                        // Preparar array com todas as funções para cálculo
                        const todasFuncoes = getFuncoesPorProduto(taxaVisualizando.tipo_produto).map(f => {
                          let vb = 0;
                          if (f === 'Funcional') vb = taxaVisualizando.valores_local.funcional;
                          else if (f === 'Técnico / ABAP' || f === 'Técnico (Instalação / Atualização)') vb = taxaVisualizando.valores_local.tecnico;
                          else if (f === 'ABAP - PL/SQL') vb = taxaVisualizando.valores_local.abap || 0;
                          else if (f === 'DBA / Basis' || f === 'DBA') vb = taxaVisualizando.valores_local.dba;
                          else if (f === 'Gestor') vb = taxaVisualizando.valores_local.gestor;
                          return { funcao: f, valor_base: vb };
                        });

                        const valores = calcularValores(
                          valorBase, 
                          funcao, 
                          todasFuncoes, 
                          taxaVisualizando.tipo_calculo_adicional || 'media',
                          taxaVisualizando.tipo_produto
                        );

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
    </>
  );
}

