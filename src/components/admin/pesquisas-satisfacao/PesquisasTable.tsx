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
  FileEdit
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

import { useEmpresas } from '@/hooks/useEmpresas';
import type { Pesquisa } from '@/types/pesquisasSatisfacao';

interface PesquisasTableProps {
  pesquisas: Pesquisa[];
  selecionados: string[];
  onSelecionarTodos: (selecionado: boolean) => void;
  onSelecionarItem: (id: string) => void;
  onEditar: (pesquisa: Pesquisa) => void;
  onExcluir: (id: string) => void;
  isLoading?: boolean;
}

export function PesquisasTable({
  pesquisas,
  selecionados,
  onSelecionarTodos,
  onSelecionarItem,
  onEditar,
  onExcluir,
  isLoading
}: PesquisasTableProps) {
  const [pesquisaParaExcluir, setPesquisaParaExcluir] = useState<string | null>(null);

  // Buscar empresas cadastradas no sistema
  const { empresas: empresasCadastradas = [] } = useEmpresas();

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

  // Função para obter badge de resposta (do pior para o melhor)
  const getBadgeResposta = (resposta: string | null) => {
    if (!resposta) return null;

    const respostaNormalizada = resposta.trim().toLowerCase();

    // Muito Insatisfeito (Pior)
    if (respostaNormalizada.includes('muito insatisfeito')) {
      return (
        <Badge variant="destructive" className="text-xs px-2 py-1 bg-red-600 hover:bg-red-700 whitespace-nowrap">
          Muito Insatisfeito
        </Badge>
      );
    }

    // Insatisfeito
    if (respostaNormalizada.includes('insatisfeito') && !respostaNormalizada.includes('muito')) {
      return (
        <Badge variant="destructive" className="text-xs px-2 py-1 bg-orange-500 hover:bg-orange-600 whitespace-nowrap">
          Insatisfeito
        </Badge>
      );
    }

    // Neutro
    if (respostaNormalizada.includes('neutro')) {
      return (
        <Badge variant="secondary" className="text-xs px-2 py-1 bg-yellow-500 hover:bg-yellow-600 text-white whitespace-nowrap">
          Neutro
        </Badge>
      );
    }

    // Satisfeito
    if (respostaNormalizada.includes('satisfeito') && !respostaNormalizada.includes('muito')) {
      return (
        <Badge variant="default" className="text-xs px-2 py-1 bg-blue-500 hover:bg-blue-600 whitespace-nowrap">
          Satisfeito
        </Badge>
      );
    }

    // Muito Satisfeito (Melhor)
    if (respostaNormalizada.includes('muito satisfeito')) {
      return (
        <Badge variant="default" className="text-xs px-2 py-1 bg-green-600 hover:bg-green-700 whitespace-nowrap">
          Muito Satisfeito
        </Badge>
      );
    }

    // Resposta não reconhecida
    return (
      <Badge variant="outline" className="text-xs px-2 py-1 whitespace-nowrap">
        {resposta}
      </Badge>
    );
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
              <TableHead>Chamado</TableHead>
              <TableHead>Empresa</TableHead>
              <TableHead>Data Resposta</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Comentário</TableHead>
              <TableHead>Resposta</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {pesquisas.map((pesquisa) => (
              <TableRow key={pesquisa.id}>
                <TableCell>
                  <Checkbox
                    checked={selecionados.includes(pesquisa.id)}
                    onCheckedChange={() => onSelecionarItem(pesquisa.id)}
                    aria-label={`Selecionar ${pesquisa.cliente}`}
                  />
                </TableCell>
                {/* Coluna Chamado com ícone de origem + tipo + número */}
                <TableCell>
                  {pesquisa.nro_caso ? (
                    <div className="flex items-center gap-2 whitespace-nowrap">
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
                    <div className="flex items-center gap-2">
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
                <TableCell className="font-medium">
                  {(() => {
                    const validacao = validarEmpresa(pesquisa.empresa);
                    
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
                    } else {
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
                    }
                  })()}
                </TableCell>
                {/* Coluna Data Resposta */}
                <TableCell className="text-sm text-gray-500">
                  {formatarData(pesquisa.data_resposta)}
                </TableCell>
                {/* Coluna Cliente */}
                <TableCell className="text-sm">{pesquisa.cliente}</TableCell>
                {/* Coluna Comentário (substituiu Categoria) */}
                <TableCell>
                  {pesquisa.comentario_pesquisa ? (
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="cursor-help line-clamp-2 text-sm">
                            {pesquisa.comentario_pesquisa}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-md">
                          <p className="text-xs whitespace-pre-wrap">{pesquisa.comentario_pesquisa}</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ) : (
                    '-'
                  )}
                </TableCell>
                {/* Coluna Resposta */}
                <TableCell>
                  {getBadgeResposta(pesquisa.resposta) || '-'}
                </TableCell>
                {/* Coluna Ações */}
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onEditar(pesquisa)}
                      disabled={isLoading}
                      className="h-8 w-8 p-0"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleExcluirClick(pesquisa.id)}
                      disabled={isLoading}
                      className="h-8 w-8 p-0 text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
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
            <AlertDialogAction onClick={handleConfirmarExclusao}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
