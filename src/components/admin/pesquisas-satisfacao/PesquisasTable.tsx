/**
 * Tabela de listagem de pesquisas
 */

import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Edit, 
  Trash2, 
  Database, 
  FileEdit,
  Send,
  ChevronDown
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle
} from '@/components/ui/alert-dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import { useEmpresas } from '@/hooks/useEmpresas';
import { useAuth } from '@/hooks/useAuth';
import { usePermissions } from '@/hooks/usePermissions';
import type { Pesquisa } from '@/types/pesquisasSatisfacao';
import { getBadgeResposta } from '@/utils/badgeUtils';
import { ClienteNomeDisplay } from '@/components/admin/requerimentos/ClienteNomeDisplay';
import { isClienteEspecialBRFONSDAGUIRRE } from '@/utils/clienteEspecialUtils';

interface PesquisasTableProps {
  pesquisas: Pesquisa[];
  selecionados: string[];
  onSelecionarTodos: (selecionado: boolean) => void;
  onSelecionarItem: (id: string) => void;
  onEditar: (pesquisa: Pesquisa) => void;
  onExcluir: (id: string) => void;
  onEnviar: (pesquisa: Pesquisa) => void;
  onEnviarParaPlanoAcao?: (pesquisa: Pesquisa) => void;
  onEnviarParaElogios?: (pesquisa: Pesquisa) => void;
  isLoading?: boolean;
}

export function PesquisasTable({
  pesquisas,
  selecionados,
  onSelecionarTodos,
  onSelecionarItem,
  onEditar,
  onExcluir,
  onEnviar,
  onEnviarParaPlanoAcao,
  onEnviarParaElogios,
  isLoading
}: PesquisasTableProps) {
  const [pesquisaParaExcluir, setPesquisaParaExcluir] = useState<string | null>(null);

  // Buscar empresas cadastradas no sistema
  const { empresas: empresasCadastradas = [] } = useEmpresas();
  
  // Buscar usuário logado e permissões
  const { user } = useAuth();
  const { hasPermission } = usePermissions();

  // Verificar se usuário tem permissões completas (3 telas)
  const temPermissoesCompletas = useMemo(() => {
    const temLancarPesquisas = hasPermission('lancar_pesquisas', 'view');
    const temPlanoAcao = hasPermission('plano_acao', 'view');
    const temVisualizarPesquisas = hasPermission('visualizar_pesquisas', 'view');
    
    return temLancarPesquisas && temPlanoAcao && temVisualizarPesquisas;
  }, [hasPermission]);

  // Função para verificar se usuário pode editar/excluir uma pesquisa
  const podeEditarExcluir = (pesquisa: Pesquisa): boolean => {
    // Se tem permissões completas, pode editar/excluir qualquer pesquisa
    if (temPermissoesCompletas) {
      return true;
    }
    
    // Se tem apenas permissão de "Lançar Pesquisas", só pode editar/excluir se for o autor
    const temLancarPesquisas = hasPermission('lancar_pesquisas', 'view');
    if (temLancarPesquisas) {
      const ehAutor = pesquisa.autor_id === user?.id;
      return ehAutor;
    }
    
    // Sem permissão
    return false;
  };

  // Função para verificar se usuário pode enviar uma pesquisa
  const podeEnviar = (pesquisa: Pesquisa): boolean => {
    // Apenas usuários com permissões completas podem enviar
    return temPermissoesCompletas;
  };

  // Criar mapa de empresas para validação rápida
  const empresasMap = useMemo(() => {
    const map = new Map<string, { nomeCompleto: string; nomeAbreviado: string }>();
    empresasCadastradas.forEach(empresa => {
      // Normalizar nome para comparação (remover espaços extras, maiúsculas)
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
    
    // SONDA INTERNO é sempre considerada válida (não precisa estar cadastrada)
    if (nomeNormalizado === 'SONDA INTERNO') {
      return {
        encontrada: true,
        nomeExibir: 'SONDA INTERNO',
        nomeCompleto: 'SONDA INTERNO'
      };
    }
    
    const empresaEncontrada = empresasMap.get(nomeNormalizado);
    
    return {
      encontrada: !!empresaEncontrada,
      nomeExibir: empresaEncontrada?.nomeAbreviado || nomeEmpresa,
      nomeCompleto: empresaEncontrada?.nomeCompleto || nomeEmpresa
    };
  };

  const todosSelecionados = pesquisas.length > 0 && selecionados.length === pesquisas.length;
  const algunsSelecionados = selecionados.length > 0 && selecionados.length < pesquisas.length;

  const handleExcluirClick = (id: string) => {
    setPesquisaParaExcluir(id);
  };

  const handleConfirmarExclusao = () => {
    if (pesquisaParaExcluir) {
      onExcluir(pesquisaParaExcluir);
      setPesquisaParaExcluir(null);
    }
  };

  const formatarData = (data: string | null) => {
    if (!data) return '-';
    try {
      return format(new Date(data), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
    } catch {
      return '-';
    }
  };



  if (pesquisas.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>Nenhum pesquisa encontrado</p>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-md mt-4 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={todosSelecionados}
                  onCheckedChange={onSelecionarTodos}
                  aria-label="Selecionar todos"
                  className={algunsSelecionados ? "data-[state=checked]:bg-primary" : ""}
                />
              </TableHead>
              <TableHead className="w-[120px] text-center">Chamado</TableHead>
              <TableHead className="w-[180px] text-center">Empresa</TableHead>
              <TableHead className="w-[120px] text-center">Data Resposta</TableHead>
              <TableHead className="w-[150px] text-center">Cliente</TableHead>
              <TableHead className="w-[200px] text-center">Comentário</TableHead>
              <TableHead className="w-[140px] text-center">Resposta</TableHead>
              <TableHead className="text-center w-[120px]">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pesquisas.map((pesquisa) => {
              const podeEditarExcluirPesquisa = podeEditarExcluir(pesquisa);
              const podeEnviarPesquisa = podeEnviar(pesquisa);
              const ehAutor = pesquisa.autor_id === user?.id;
              
              return (
                <TableRow 
                  key={pesquisa.id}
                  className={ehAutor ? "bg-blue-50 hover:bg-blue-100 border-l-4 border-l-blue-500" : "hover:bg-gray-50"}
                >
                  <TableCell>
                    <Checkbox
                      checked={selecionados.includes(pesquisa.id)}
                      onCheckedChange={() => onSelecionarItem(pesquisa.id)}
                      aria-label={`Selecionar ${pesquisa.cliente}`}
                    />
                  </TableCell>
                {/* Coluna Chamado com ícone de origem + tipo + número */}
                <TableCell className="text-center">
                  {pesquisa.nro_caso ? (
                    <div className="flex items-center justify-center gap-2 whitespace-nowrap">
                      {/* Ícone de origem (SQL/Manual) */}
                      {pesquisa.origem === 'sql_server' ? (
                        <Database className="h-4 w-4 text-blue-600 flex-shrink-0" />
                      ) : (
                        <FileEdit className="h-4 w-4 text-gray-600 flex-shrink-0" />
                      )}
                      {/* Tipo e número do chamado em uma linha */}
                      <span className="text-xs text-muted-foreground font-medium">
                        {pesquisa.tipo_caso && `${pesquisa.tipo_caso} `}
                        <span className="font-mono text-foreground">{pesquisa.nro_caso}</span>
                      </span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-2">
                      {pesquisa.origem === 'sql_server' ? (
                        <Database className="h-4 w-4 text-blue-600" />
                      ) : (
                        <FileEdit className="h-4 w-4 text-gray-600" />
                      )}
                      <span>-</span>
                    </div>
                  )}
                </TableCell>
                {/* Coluna Empresa */}
                <TableCell className="font-medium text-xs sm:text-sm max-w-[180px] text-center">
                  {(() => {
                    const validacao = validarEmpresa(pesquisa.empresa);
                    const isOrigemSqlServer = pesquisa.origem === 'sql_server';
                    const isClienteEspecial = isClienteEspecialBRFONSDAGUIRRE(pesquisa.empresa);
                    
                    // Só exibe em vermelho se for do SQL Server E não encontrada E não for cliente especial
                    const deveExibirVermelho = isOrigemSqlServer && !validacao.encontrada && !isClienteEspecial;
                    
                    // Se for cliente especial, usa ClienteNomeDisplay
                    if (isClienteEspecial) {
                      return (
                        <ClienteNomeDisplay
                          nomeEmpresa={pesquisa.empresa}
                          nomeCliente={pesquisa.cliente}
                          className="inline"
                        />
                      );
                    }
                    
                    // Para outras empresas, usa a lógica original
                    if (validacao.encontrada) {
                      return (
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
                      );
                    } else if (deveExibirVermelho) {
                      return (
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
                    } else {
                      // Lançamento manual - exibe normalmente sem vermelho
                      return (
                        <span>{validacao.nomeExibir}</span>
                      );
                    }
                  })()}
                </TableCell>
                {/* Coluna Data Resposta */}
                <TableCell className="text-xs sm:text-sm text-gray-500 text-center">
                  {formatarData(pesquisa.data_resposta)}
                </TableCell>
                {/* Coluna Cliente */}
                <TableCell className="max-w-[120px] whitespace-normal text-center">
                  <div className="break-words leading-tight text-[10px] sm:text-xs lg:text-sm">
                    {pesquisa.cliente}
                  </div>
                </TableCell>
                {/* Coluna Comentário (substituiu Categoria) */}
                <TableCell className="max-w-[200px] text-center">
                  {pesquisa.comentario_pesquisa ? (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="cursor-help line-clamp-2 text-xs sm:text-sm break-words">
                            {pesquisa.comentario_pesquisa}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-md">
                          <p className="text-xs whitespace-pre-wrap">{pesquisa.comentario_pesquisa}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ) : (
                    <span className="text-xs sm:text-sm">-</span>
                  )}
                </TableCell>
                {/* Coluna Resposta */}
                <TableCell className="text-center">
                  {getBadgeResposta(pesquisa.resposta) || '-'}
                </TableCell>
                {/* Coluna Ações */}
                <TableCell className="text-center">
                  {podeEditarExcluirPesquisa || podeEnviarPesquisa ? (
                    <div className="flex justify-center gap-1">
                      {/* Botão Editar - Só exibe se tiver permissão */}
                      {podeEditarExcluirPesquisa && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onEditar(pesquisa)}
                          disabled={isLoading}
                          className="h-8 w-8 p-0"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      )}
                      
                      {/* Botão Excluir - Só exibe se tiver permissão */}
                      {podeEditarExcluirPesquisa && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleExcluirClick(pesquisa.id)}
                          disabled={isLoading}
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                      
                      {/* Botão de Envio - Só exibe se tiver permissão */}
                      {podeEnviarPesquisa && (
                        pesquisa.resposta?.toLowerCase() === 'neutro' ? (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                disabled={isLoading || !pesquisa.resposta}
                                className="h-8 w-8 p-0 text-blue-600 hover:text-blue-800"
                              >
                                <Send className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem 
                                onClick={() => onEnviarParaPlanoAcao?.(pesquisa)}
                                className="cursor-pointer"
                              >
                                <Send className="h-4 w-4 mr-2" />
                                Enviar para Plano de Ação
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => onEnviarParaElogios?.(pesquisa)}
                                className="cursor-pointer"
                              >
                                <Send className="h-4 w-4 mr-2" />
                                Enviar para Elogios
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onEnviar(pesquisa)}
                            disabled={isLoading || !pesquisa.resposta}
                            className="h-8 w-8 p-0 text-blue-600 hover:text-blue-800"
                            title="Enviar pesquisa"
                          >
                            <Send className="h-4 w-4" />
                          </Button>
                        )
                      )}
                    </div>
                  ) : (
                    <span className="text-xs text-gray-400">-</span>
                  )}
                </TableCell>
              </TableRow>
            );
            })}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={!!pesquisaParaExcluir} onOpenChange={() => setPesquisaParaExcluir(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este pesquisa? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleConfirmarExclusao}
              className="bg-red-600 hover:bg-red-700"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
