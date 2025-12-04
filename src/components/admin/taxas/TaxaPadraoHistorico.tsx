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

  const formatarMoeda = (valor: number): string => {
    return valor.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
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
              <TableHead>Vigência Início</TableHead>
              <TableHead>Vigência Fim</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Tipo Cálculo</TableHead>
              <TableHead className="text-right">Funcional (Remota)</TableHead>
              <TableHead className="text-right">Técnico (Remota)</TableHead>
              <TableHead className="text-right">DBA (Remota)</TableHead>
              <TableHead className="text-right">Gestor (Remota)</TableHead>
              <TableHead className="text-center">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {historico.map((taxa) => {
              const status = getStatusVigencia(taxa.vigencia_inicio, taxa.vigencia_fim);
              
              return (
                <TableRow key={taxa.id}>
                  <TableCell>
                    {formatarData(taxa.vigencia_inicio)}
                  </TableCell>
                  <TableCell>
                    {formatarData(taxa.vigencia_fim)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={status.variant}>{status.label}</Badge>
                  </TableCell>
                  <TableCell>
                    {taxa.tipo_calculo_adicional === 'normal' ? 'Normal' : 'Média'}
                  </TableCell>
                  <TableCell className="text-right">R$ {formatarMoeda(taxa.valores_remota.funcional)}</TableCell>
                  <TableCell className="text-right">R$ {formatarMoeda(taxa.valores_remota.tecnico)}</TableCell>
                  <TableCell className="text-right">R$ {formatarMoeda(taxa.valores_remota.dba)}</TableCell>
                  <TableCell className="text-right">R$ {formatarMoeda(taxa.valores_remota.gestor)}</TableCell>
                  <TableCell>
                    <div className="flex items-center justify-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleVisualizar(taxa)}
                        title="Visualizar"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEditar(taxa)}
                        title="Editar"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeletar(taxa.id)}
                        title="Excluir"
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
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
            <DialogTitle>Visualizar Taxa Padrão</DialogTitle>
          </DialogHeader>
          {taxaVisualizando && (
            <div className="space-y-6">
              {/* Informações Gerais */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Tipo de Produto</label>
                  <p className="text-sm text-muted-foreground">
                    {taxaVisualizando.tipo_produto === 'GALLERY' ? 'GALLERY' : 'COMEX, FISCAL'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium">Tipo de Cálculo</label>
                  <p className="text-sm text-muted-foreground">
                    {taxaVisualizando.tipo_calculo_adicional === 'normal' ? 'Normal (Valor Base + 15%)' : 'Média (Cálculo por Média)'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium">Vigência Início</label>
                  <p className="text-sm text-muted-foreground">
                    {formatarData(taxaVisualizando.vigencia_inicio)}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium">Vigência Fim</label>
                  <p className="text-sm text-muted-foreground">
                    {formatarData(taxaVisualizando.vigencia_fim)}
                  </p>
                </div>
              </div>

              {/* Tabela de Valores Remotos */}
              <div>
                <h3 className="text-base font-semibold mb-3">Valores Hora Remota</h3>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Função</TableHead>
                        <TableHead className="text-right">Valor Base</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell>Funcional</TableCell>
                        <TableCell className="text-right">R$ {formatarMoeda(taxaVisualizando.valores_remota.funcional)}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Técnico</TableCell>
                        <TableCell className="text-right">R$ {formatarMoeda(taxaVisualizando.valores_remota.tecnico)}</TableCell>
                      </TableRow>
                      {taxaVisualizando.tipo_produto === 'OUTROS' && (
                        <TableRow>
                          <TableCell>ABAP - PL/SQL</TableCell>
                          <TableCell className="text-right">R$ {formatarMoeda(taxaVisualizando.valores_remota.abap || 0)}</TableCell>
                        </TableRow>
                      )}
                      <TableRow>
                        <TableCell>DBA</TableCell>
                        <TableCell className="text-right">R$ {formatarMoeda(taxaVisualizando.valores_remota.dba)}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Gestor</TableCell>
                        <TableCell className="text-right">R$ {formatarMoeda(taxaVisualizando.valores_remota.gestor)}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Tabela de Valores Locais */}
              <div>
                <h3 className="text-base font-semibold mb-3">Valores Hora Local</h3>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Função</TableHead>
                        <TableHead className="text-right">Valor Base</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell>Funcional</TableCell>
                        <TableCell className="text-right">R$ {formatarMoeda(taxaVisualizando.valores_local.funcional)}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Técnico</TableCell>
                        <TableCell className="text-right">R$ {formatarMoeda(taxaVisualizando.valores_local.tecnico)}</TableCell>
                      </TableRow>
                      {taxaVisualizando.tipo_produto === 'OUTROS' && (
                        <TableRow>
                          <TableCell>ABAP - PL/SQL</TableCell>
                          <TableCell className="text-right">R$ {formatarMoeda(taxaVisualizando.valores_local.abap || 0)}</TableCell>
                        </TableRow>
                      )}
                      <TableRow>
                        <TableCell>DBA</TableCell>
                        <TableCell className="text-right">R$ {formatarMoeda(taxaVisualizando.valores_local.dba)}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Gestor</TableCell>
                        <TableCell className="text-right">R$ {formatarMoeda(taxaVisualizando.valores_local.gestor)}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={() => setModalVisualizarAberto(false)}>Fechar</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

