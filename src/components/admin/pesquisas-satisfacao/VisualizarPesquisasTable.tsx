/**
 * Tabela de visualização de pesquisas (somente leitura)
 */

import { useMemo } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  Database, 
  FileEdit,
  Eye
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

import { useEmpresas } from '@/hooks/useEmpresas';
import type { Pesquisa } from '@/types/pesquisasSatisfacao';
import { getBadgeResposta } from '@/utils/badgeUtils';

interface VisualizarPesquisasTableProps {
  pesquisas: Pesquisa[];
  isLoading?: boolean;
  onVisualizarDetalhes?: (pesquisa: Pesquisa) => void;
}

export function VisualizarPesquisasTable({
  pesquisas,
  isLoading,
  onVisualizarDetalhes
}: VisualizarPesquisasTableProps) {
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
        <p>Nenhuma pesquisa encontrada</p>
      </div>
    );
  }

  return (
    <div className="rounded-md mt-4 overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[120px] text-center">Chamado</TableHead>
            <TableHead className="w-[180px] text-center">Empresa</TableHead>
            <TableHead className="w-[120px] text-center">Data Resposta</TableHead>
            <TableHead className="w-[150px] text-center">Cliente</TableHead>
            <TableHead className="w-[200px] text-center">Comentário</TableHead>
            <TableHead className="w-[140px] text-center">Resposta</TableHead>
            <TableHead className="w-[120px] text-center">Prestador</TableHead>
            <TableHead className="w-[80px] text-center">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {pesquisas.map((pesquisa) => (
            <TableRow key={pesquisa.id}>
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
                  // Só exibe em vermelho se for do SQL Server E não encontrada
                  const deveExibirVermelho = isOrigemSqlServer && !validacao.encontrada;
                  
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
                      <span>
                        {validacao.nomeExibir}
                      </span>
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

              {/* Coluna Comentário */}
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

              {/* Coluna Prestador */}
              <TableCell className="max-w-[120px] whitespace-normal text-center">
                <div className="break-words leading-tight text-[10px] sm:text-xs lg:text-sm">
                  {pesquisa.prestador || '-'}
                </div>
              </TableCell>

              {/* Coluna Ações */}
              <TableCell className="text-center">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onVisualizarDetalhes?.(pesquisa)}
                        disabled={isLoading}
                        className="h-8 w-8 p-0 text-blue-600 hover:text-blue-800"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Visualizar detalhes</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}