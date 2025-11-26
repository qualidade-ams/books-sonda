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

  if (pesquisas.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p>Nenhum pesquisa encontrado</p>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-md border">
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
              <TableHead>Origem</TableHead>
              <TableHead>Empresa</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Consultor</TableHead>
              <TableHead>Chamado</TableHead>
              <TableHead>Data Resposta</TableHead>
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
                <TableCell>
                  <Badge
                    variant={pesquisa.origem === 'sql_server' ? 'default' : 'secondary'}
                    className="gap-1"
                  >
                    {pesquisa.origem === 'sql_server' ? (
                      <>
                        <Database className="h-3 w-3" />
                        SQL
                      </>
                    ) : (
                      <>
                        <FileEdit className="h-3 w-3" />
                        Manual
                      </>
                    )}
                  </Badge>
                </TableCell>
                <TableCell className="font-medium">
                  {(() => {
                    const validacao = validarEmpresa(pesquisa.empresa);
                    
                    if (validacao.encontrada) {
                      // Empresa cadastrada - exibir nome abreviado
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
                      // Empresa NÃO cadastrada - exibir em vermelho
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
                <TableCell>{pesquisa.cliente}</TableCell>
                <TableCell>{pesquisa.categoria || '-'}</TableCell>
                <TableCell>{pesquisa.prestador || '-'}</TableCell>
                <TableCell>
                  {pesquisa.nro_caso ? (
                    <div className="flex flex-col gap-0.5">
                      {pesquisa.tipo_caso && (
                        <span className="text-xs text-muted-foreground font-medium">
                          {pesquisa.tipo_caso}
                        </span>
                      )}
                      <span className="font-mono">{pesquisa.nro_caso}</span>
                    </div>
                  ) : (
                    '-'
                  )}
                </TableCell>
                <TableCell className="text-xs">
                  {formatarData(pesquisa.data_resposta)}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEditar(pesquisa)}
                      disabled={isLoading}
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleExcluirClick(pesquisa.id)}
                      disabled={isLoading}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
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
