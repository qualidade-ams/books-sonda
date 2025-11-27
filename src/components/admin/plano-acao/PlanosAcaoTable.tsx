// =====================================================
// COMPONENTE: TABELA DE PLANOS DE AÇÃO
// =====================================================

import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Edit, Trash2, Eye, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useEmpresas } from '@/hooks/useEmpresas';
import type { PlanoAcaoCompleto } from '@/types/planoAcao';
import { getCorPrioridade, getCorStatus } from '@/types/planoAcao';

interface PlanosAcaoTableProps {
  planos: PlanoAcaoCompleto[];
  onEdit: (plano: PlanoAcaoCompleto) => void;
  onDelete: (id: string) => void;
  onView: (plano: PlanoAcaoCompleto) => void;
  isLoading?: boolean;
}

export function PlanosAcaoTable({
  planos,
  onEdit,
  onDelete,
  onView,
  isLoading,
}: PlanosAcaoTableProps) {
  const [planoParaDeletar, setPlanoParaDeletar] = useState<string | null>(null);
  
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

  const handleConfirmarDelecao = () => {
    if (planoParaDeletar) {
      onDelete(planoParaDeletar);
      setPlanoParaDeletar(null);
    }
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
    <>
      <div className="rounded-md mt-4 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[120px] text-center">Chamado</TableHead>
              <TableHead className="w-[200px] text-center">Empresa</TableHead>
              <TableHead className="text-center hidden lg:table-cell">Ação Corretiva</TableHead>
              <TableHead className="w-[100px] text-center hidden md:table-cell">Prioridade</TableHead>
              <TableHead className="w-[120px] text-center">Status</TableHead>
              <TableHead className="w-[110px] text-center hidden xl:table-cell">Data Início</TableHead>
              <TableHead className="w-[100px] text-center">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {planos.map((plano) => {
              const validacao = validarEmpresa(plano.pesquisa?.empresa || '');
              
              return (
                <TableRow key={plano.id}>
                  {/* Coluna Chamado */}
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1 whitespace-nowrap">
                      {plano.pesquisa?.tipo_caso && (
                        <span className="text-xs text-muted-foreground">
                          {plano.pesquisa.tipo_caso}
                        </span>
                      )}
                      {plano.pesquisa?.nro_caso && (
                        <span className="font-mono text-xs">
                          {plano.pesquisa.nro_caso}
                        </span>
                      )}
                      {!plano.pesquisa?.nro_caso && '-'}
                    </div>
                  </TableCell>
                  
                  {/* Coluna Empresa (com Cliente abaixo) */}
                  <TableCell className="text-center">
                    <div className="flex flex-col gap-1">
                      {/* Nome da Empresa */}
                      <div className="font-medium text-xs sm:text-sm">
                        {validacao.encontrada ? (
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
                        )}
                      </div>
                      {/* Nome do Cliente (pequeno, abaixo) */}
                      {plano.pesquisa?.cliente && (
                        <div className="text-[10px] text-gray-500 dark:text-gray-400 break-words leading-tight">
                          {plano.pesquisa.cliente}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  
                  {/* Coluna Ação Corretiva */}
                  <TableCell className="text-center hidden lg:table-cell">
                    {(() => {
                      const palavras = plano.descricao_acao_corretiva.split(' ');
                      const textoTruncado = palavras.length > 5 
                        ? palavras.slice(0, 5).join(' ') + '...'
                        : plano.descricao_acao_corretiva;
                      
                      return palavras.length > 5 ? (
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="max-w-[300px] cursor-help text-xs sm:text-sm">
                                {textoTruncado}
                              </div>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-md">
                              <p className="text-xs whitespace-pre-wrap">{plano.descricao_acao_corretiva}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : (
                        <div className="max-w-[300px] text-xs sm:text-sm">
                          {plano.descricao_acao_corretiva}
                        </div>
                      );
                    })()}
                  </TableCell>
                  
                  {/* Coluna Prioridade */}
                  <TableCell className="text-center hidden md:table-cell">
                    <Badge className={`${getCorPrioridade(plano.prioridade)} text-xs px-2 py-1`}>
                      {plano.prioridade.charAt(0).toUpperCase() + plano.prioridade.slice(1)}
                    </Badge>
                  </TableCell>
                  
                  {/* Coluna Status */}
                  <TableCell className="text-center">
                    <Badge className={`${getCorStatus(plano.status_plano)} text-xs px-2 py-1`}>
                      {plano.status_plano === 'em_andamento'
                        ? 'Em Andamento'
                        : plano.status_plano === 'aguardando_retorno'
                        ? 'Aguardando'
                        : plano.status_plano.charAt(0).toUpperCase() + plano.status_plano.slice(1)}
                    </Badge>
                  </TableCell>
                  
                  {/* Coluna Data Início */}
                  <TableCell className="text-xs sm:text-sm text-gray-500 text-center hidden xl:table-cell">
                    {format(new Date(plano.data_inicio), 'dd/MM/yyyy', { locale: ptBR })}
                  </TableCell>
                  
                  {/* Coluna Ações */}
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onView(plano)}
                        className="h-8 w-8 p-0"
                        title="Visualizar detalhes"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onEdit(plano)}
                        className="h-8 w-8 p-0"
                        title="Editar"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPlanoParaDeletar(plano.id)}
                        className="h-8 w-8 p-0 text-red-600 hover:text-red-800"
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

      {/* Dialog de confirmação de exclusão */}
      <AlertDialog open={!!planoParaDeletar} onOpenChange={() => setPlanoParaDeletar(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este plano de ação? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmarDelecao} className="bg-red-500 hover:bg-red-600">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
