// =====================================================
// COMPONENTE: TABELA DE PLANOS DE AÇÃO
// =====================================================

import { useMemo } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Clock, Edit, Eye, Trash2, FileText } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useEmpresas } from '@/hooks/useEmpresas';
import type { PlanoAcaoCompleto } from '@/types/planoAcao';
import { getCorPrioridade, getCorStatus } from '@/types/planoAcao';
import { isClienteEspecialBRFONSDAGUIRRE } from '@/utils/clienteEspecialUtils';

interface PlanosAcaoTableProps {
  planos: PlanoAcaoCompleto[];
  isLoading?: boolean;
  onEditar?: (plano: PlanoAcaoCompleto) => void;
  onVisualizar?: (plano: PlanoAcaoCompleto) => void;
  onExcluir?: (id: string) => void;
  showActions?: {
    visualizar?: boolean;
    editar?: boolean;
    excluir?: boolean;
  };
}

export function PlanosAcaoTable({
  planos,
  isLoading,
  onEditar,
  onVisualizar,
  onExcluir,
  showActions = { visualizar: true, editar: true, excluir: true },
}: PlanosAcaoTableProps) {
  // Buscar empresas cadastradas no sistema
  const { empresas: empresasCadastradas = [] } = useEmpresas();

  // Criar mapa de empresas para validação rápida
  const empresasMap = useMemo(() => {
    const map = new Map<string, { nomeCompleto: string; nomeAbreviado: string }>();
    empresasCadastradas.forEach(empresa => {
      const nomeNormalizado = empresa.nome_completo.trim().toUpperCase();
      map.set(nomeNormalizado, {
        nomeCompleto: empresa.nome_completo,
        nomeAbreviado: empresa.nome_abreviado
      });
    });
    return map;
  }, [empresasCadastradas]);

  // Função para validar e formatar nome da empresa
  const validarEmpresa = (nomeEmpresa: string) => {
    const nomeNormalizado = nomeEmpresa.trim().toUpperCase();
    const empresaEncontrada = empresasMap.get(nomeNormalizado);
    
    return {
      encontrada: !!empresaEncontrada,
      nomeExibir: empresaEncontrada?.nomeAbreviado || nomeEmpresa,
      nomeCompleto: empresaEncontrada?.nomeCompleto || nomeEmpresa
    };
  };

  if (planos.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
        <p>Nenhum plano de ação encontrado</p>
      </div>
    );
  }

  return (
    <div className="w-full overflow-x-auto">
      <Table className="w-full text-xs sm:text-sm">
        <TableHeader>
          <TableRow>
            <TableHead className="min-w-[140px] text-center text-xs sm:text-sm py-2">Chamado</TableHead>
            <TableHead className="min-w-[160px] text-center text-xs sm:text-sm py-2">Cliente</TableHead>
            <TableHead className="min-w-[200px] text-center text-xs sm:text-sm py-2 hidden lg:table-cell">Ação Corretiva</TableHead>
            <TableHead className="min-w-[100px] text-center text-xs sm:text-sm py-2 hidden md:table-cell">Prioridade</TableHead>
            <TableHead className="min-w-[120px] text-center text-xs sm:text-sm py-2">Status</TableHead>
            <TableHead className="min-w-[110px] text-center text-xs sm:text-sm py-2 hidden xl:table-cell">Data Início</TableHead>
            <TableHead className="min-w-[100px] text-center text-xs sm:text-sm py-2">Período</TableHead>
            <TableHead className="w-32 text-center text-xs sm:text-sm py-2">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {planos.map((plano) => {
            const validacao = validarEmpresa(plano.pesquisa?.empresa || '');
            
            return (
              <TableRow key={plano.id}>
                {/* Coluna Chamado */}
                <TableCell className="font-medium py-2 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <FileText className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium">
                      {plano.pesquisa?.tipo_caso && plano.pesquisa?.nro_caso
                        ? `${plano.pesquisa.tipo_caso}-${plano.pesquisa.nro_caso}`
                        : plano.pesquisa?.nro_caso || '-'
                      }
                    </span>
                  </div>
                </TableCell>
                
                {/* Coluna Cliente */}
                <TableCell className="py-2 text-center">
                  <div className="flex flex-col items-center gap-1">
                    {/* Nome da Empresa */}
                    <div className="font-medium text-xs sm:text-sm">
                      {(() => {
                        const isClienteEspecial = isClienteEspecialBRFONSDAGUIRRE(plano.pesquisa?.empresa);
                        const shouldShowAsFound = validacao.encontrada || isClienteEspecial;
                        
                        return shouldShowAsFound ? (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="cursor-help">
                                  {validacao.nomeExibir}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="text-xs">{validacao.nomeCompleto}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        ) : (
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="text-red-600 dark:text-red-400 cursor-help font-semibold">
                                  {validacao.nomeExibir}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="text-xs text-red-600 dark:text-red-400">
                                  ⚠️ Empresa não cadastrada no sistema
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        );
                      })()}
                    </div>
                    {/* Nome do Cliente (pequeno, abaixo) */}
                    {plano.pesquisa?.cliente && (
                      <div className="text-[10px] text-gray-500 dark:text-gray-400">
                        {plano.pesquisa.cliente}
                      </div>
                    )}
                  </div>
                </TableCell>
                
                {/* Coluna Ação Corretiva */}
                <TableCell className="py-2 text-center hidden lg:table-cell">
                  {(() => {
                    const descricao = plano.descricao_acao_corretiva || '';
                    const palavras = descricao.split(' ');
                    const textoTruncado = palavras.length > 6 
                      ? palavras.slice(0, 6).join(' ') + '...'
                      : descricao;
                    
                    return palavras.length > 6 ? (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="max-w-[200px] cursor-help text-xs sm:text-sm text-center">
                              {textoTruncado}
                            </div>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-md">
                            <p className="text-xs whitespace-pre-wrap">{descricao}</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ) : (
                      <div className="max-w-[200px] text-xs sm:text-sm text-center">
                        {descricao || '-'}
                      </div>
                    );
                  })()}
                </TableCell>
                
                {/* Coluna Prioridade */}
                <TableCell className="py-2 text-center hidden md:table-cell">
                  <Badge className={`${getCorPrioridade(plano.prioridade || 'baixa')} text-xs`}>
                    {plano.prioridade 
                      ? plano.prioridade.charAt(0).toUpperCase() + plano.prioridade.slice(1)
                      : 'Baixa'
                    }
                  </Badge>
                </TableCell>
                
                {/* Coluna Status */}
                <TableCell className="py-2 text-center">
                  <Badge className={`${getCorStatus(plano.status_plano || 'aberto')} text-xs`}>
                    {!plano.status_plano 
                      ? 'Aberto'
                      : plano.status_plano === 'em_andamento'
                      ? 'Em Andamento'
                      : plano.status_plano === 'aguardando_retorno'
                      ? 'Aguardando'
                      : plano.status_plano === 'concluido'
                      ? 'Concluído'
                      : plano.status_plano.charAt(0).toUpperCase() + plano.status_plano.slice(1)}
                  </Badge>
                </TableCell>
                
                {/* Coluna Data Início */}
                <TableCell className="py-2 text-center hidden xl:table-cell">
                  <span className="text-xs sm:text-sm">
                    {format(new Date(plano.data_inicio), 'dd/MM/yyyy', { locale: ptBR })}
                  </span>
                </TableCell>
                
                {/* Coluna Período (Data Resposta) */}
                <TableCell className="py-2 text-center">
                  <span className="text-xs sm:text-sm">
                    {plano.pesquisa?.data_resposta 
                      ? format(new Date(plano.pesquisa.data_resposta), 'MM/yyyy', { locale: ptBR })
                      : '-'
                    }
                  </span>
                </TableCell>

                {/* Coluna Ações */}
                <TableCell className="py-2">
                  <div className="flex justify-center gap-1">
                    {showActions.visualizar && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onVisualizar?.(plano)}
                        disabled={isLoading}
                        className="h-8 w-8 p-0"
                      >
                        <Eye className="h-4 w-4 text-blue-600" />
                      </Button>
                    )}

                    {showActions.editar && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onEditar?.(plano)}
                        disabled={isLoading}
                        className="h-8 w-8 p-0"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    )}

                    {showActions.excluir && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onExcluir?.(plano.id)}
                        disabled={isLoading}
                        className="h-8 w-8 p-0 text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
