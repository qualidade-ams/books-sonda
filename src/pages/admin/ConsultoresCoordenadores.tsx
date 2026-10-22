import { useMemo, useState } from 'react';
import AdminLayout from '@/components/admin/LayoutAdmin';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { EmptyState } from '@/components/ui/empty-state';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Filter,
  Network,
  Search,
  UserCheck,
  UserX,
  Users,
  X,
} from 'lucide-react';
import { useConsultoresCoordenadores } from '@/hooks/useConsultoresCoordenadores';
import { usePermissions } from '@/hooks/usePermissions';
import {
  filtrarConsultoresCoordenadores,
  FILTROS_CONSULTORES_PADRAO,
  type FiltrosConsultoresCoordenadores,
} from '@/utils/filtrarConsultoresCoordenadores';
import { CARGOS_RESPONSAVEL } from '@/types/consultoresCoordenadores';

const ITENS_POR_PAGINA = 25;
// Radix Select não aceita value vazio
const SEM_COORDENADOR = '__sem__';

function ConsultoresCoordenadores() {
  const { consultores, responsaveis, isLoading, error, definirCoordenador, isSalvando } =
    useConsultoresCoordenadores();
  const { hasPermission } = usePermissions();
  const podeEditar = hasPermission('consultores_coordenadores', 'edit');

  const [showFilters, setShowFilters] = useState(false);
  const [filtros, setFiltros] = useState<FiltrosConsultoresCoordenadores>(
    FILTROS_CONSULTORES_PADRAO
  );
  const [paginaAtual, setPaginaAtual] = useState(1);

  const responsavelPorId = useMemo(
    () => new Map(responsaveis.map((r) => [r.id, r])),
    [responsaveis]
  );

  const filtrados = useMemo(
    () => filtrarConsultoresCoordenadores(consultores, filtros),
    [consultores, filtros]
  );

  const ativos = consultores.filter((c) => c.status === 'ativo');
  const ativosComCoordenador = ativos.filter((c) => c.coordenadorId).length;

  const totalPaginas = Math.max(1, Math.ceil(filtrados.length / ITENS_POR_PAGINA));
  const pagina = Math.min(paginaAtual, totalPaginas);
  const inicio = (pagina - 1) * ITENS_POR_PAGINA;
  const visiveis = filtrados.slice(inicio, inicio + ITENS_POR_PAGINA);

  const atualizarFiltros = (novos: Partial<FiltrosConsultoresCoordenadores>) => {
    setFiltros((atual) => ({ ...atual, ...novos }));
    setPaginaAtual(1);
  };

  const hasActiveFilters = () =>
    filtros.busca !== FILTROS_CONSULTORES_PADRAO.busca ||
    filtros.coordenador !== FILTROS_CONSULTORES_PADRAO.coordenador ||
    filtros.status !== FILTROS_CONSULTORES_PADRAO.status;

  const limparFiltros = () => atualizarFiltros(FILTROS_CONSULTORES_PADRAO);

  const handleDefinirCoordenador = (especialistaId: string, valor: string) => {
    definirCoordenador({
      especialistaId,
      coordenadorId: valor === SEM_COORDENADOR ? null : valor,
    }).catch(() => undefined); // erro já vira toast no hook
  };

  const opcoesResponsaveis = CARGOS_RESPONSAVEL.map((cargo) => ({
    cargo,
    pessoas: responsaveis.filter((r) => r.cargo === cargo),
  })).filter((g) => g.pessoas.length > 0);

  return (
    <AdminLayout>
      <div className="min-h-screen bg-bg-secondary">
        <div className="px-6 py-6 space-y-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
                Consultores x Coordenadores
              </h1>
              <p className="text-muted-foreground mt-1">
                O coordenador de cada consultor vai em cópia (CC) no email de inconsistências de
                chamados
              </p>
            </div>
          </div>

          {/* Estatísticas (consultores ativos) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 lg:gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs lg:text-sm font-medium text-gray-600 dark:text-gray-400">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Consultores ativos
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-white">
                  {isLoading ? <Skeleton className="h-8 w-12" /> : ativos.length}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs lg:text-sm font-medium text-green-600">
                  <div className="flex items-center gap-2">
                    <UserCheck className="h-4 w-4" />
                    Com coordenador
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-xl lg:text-2xl font-bold text-green-600">
                  {isLoading ? <Skeleton className="h-8 w-12" /> : ativosComCoordenador}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs lg:text-sm font-medium text-orange-600">
                  <div className="flex items-center gap-2">
                    <UserX className="h-4 w-4" />
                    Sem coordenador
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-xl lg:text-2xl font-bold text-orange-600">
                  {isLoading ? (
                    <Skeleton className="h-8 w-12" />
                  ) : (
                    ativos.length - ativosComCoordenador
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Card principal */}
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Network className="h-5 w-5" />
                  Consultores
                </CardTitle>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowFilters(!showFilters)}
                    className="flex items-center justify-center space-x-2"
                  >
                    <Filter className="h-4 w-4" />
                    <span>Filtros</span>
                  </Button>

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

              {showFilters && (
                <div className="space-y-4 pt-4 border-t">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <div className="text-sm font-medium mb-2">Buscar</div>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          placeholder="Buscar por nome ou email do consultor..."
                          value={filtros.busca}
                          onChange={(e) => atualizarFiltros({ busca: e.target.value })}
                          className="pl-10 focus:ring-sonda-blue focus:border-sonda-blue"
                        />
                      </div>
                    </div>

                    <div>
                      <div className="text-sm font-medium mb-2">Coordenador</div>
                      <Select
                        value={filtros.coordenador}
                        onValueChange={(valor) => atualizarFiltros({ coordenador: valor })}
                      >
                        <SelectTrigger className="focus:ring-sonda-blue focus:border-sonda-blue">
                          <SelectValue placeholder="Todos os coordenadores" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos os coordenadores</SelectItem>
                          <SelectItem value="sem">Sem coordenador</SelectItem>
                          {responsaveis.map((r) => (
                            <SelectItem key={r.id} value={r.id}>
                              {r.nome}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <div className="text-sm font-medium mb-2">Status do consultor</div>
                      <Select
                        value={filtros.status}
                        onValueChange={(valor) =>
                          atualizarFiltros({
                            status: valor as FiltrosConsultoresCoordenadores['status'],
                          })
                        }
                      >
                        <SelectTrigger className="focus:ring-sonda-blue focus:border-sonda-blue">
                          <SelectValue placeholder="Todos os status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos os status</SelectItem>
                          <SelectItem value="ativo">Ativo</SelectItem>
                          <SelectItem value="inativo">Inativo</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )}
            </CardHeader>

            <CardContent className="overflow-x-auto">
              {error ? (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    Não foi possível carregar os consultores: {error.message}
                  </AlertDescription>
                </Alert>
              ) : isLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : filtrados.length === 0 ? (
                <EmptyState
                  icon={<Users className="h-12 w-12" />}
                  title="Nenhum consultor encontrado"
                  description={
                    hasActiveFilters()
                      ? 'Ajuste ou limpe os filtros para ver outros consultores.'
                      : 'Os consultores vêm da sincronização com o Aranda.'
                  }
                />
              ) : (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead className="font-semibold text-gray-700">Consultor</TableHead>
                        <TableHead className="font-semibold text-gray-700 text-center">
                          Status
                        </TableHead>
                        <TableHead className="font-semibold text-gray-700 w-[360px]">
                          Coordenador
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {visiveis.map((consultor) => {
                        const coordenador = consultor.coordenadorId
                          ? responsavelPorId.get(consultor.coordenadorId)
                          : undefined;
                        return (
                          <TableRow key={consultor.especialistaId} className="hover:bg-gray-50">
                            <TableCell>
                              <span className="font-medium">{consultor.nome}</span>
                              <div className="text-xs text-gray-500 mt-1">
                                {consultor.email || 'Sem email cadastrado'}
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              {consultor.status === 'ativo' ? (
                                <Badge className="bg-green-100 text-green-800 text-xs">Ativo</Badge>
                              ) : (
                                <Badge className="bg-gray-100 text-gray-800 text-xs">Inativo</Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <Select
                                value={consultor.coordenadorId ?? SEM_COORDENADOR}
                                onValueChange={(valor) =>
                                  handleDefinirCoordenador(consultor.especialistaId, valor)
                                }
                                disabled={!podeEditar || isSalvando}
                              >
                                <SelectTrigger className="focus:ring-sonda-blue focus:border-sonda-blue">
                                  <SelectValue placeholder="Sem coordenador" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value={SEM_COORDENADOR}>Sem coordenador</SelectItem>
                                  {consultor.coordenadorId && !coordenador && (
                                    // Vínculo com pessoa que mudou de cargo no organograma
                                    <SelectItem value={consultor.coordenadorId}>
                                      Responsável fora de Coordenador/Gerente/Diretor
                                    </SelectItem>
                                  )}
                                  {opcoesResponsaveis.map((grupo) => (
                                    <SelectGroup key={grupo.cargo}>
                                      <SelectLabel>{grupo.cargo}</SelectLabel>
                                      {grupo.pessoas.map((r) => (
                                        <SelectItem key={r.id} value={r.id}>
                                          {r.nome}
                                        </SelectItem>
                                      ))}
                                    </SelectGroup>
                                  ))}
                                </SelectContent>
                              </Select>
                              {coordenador && (
                                <div className="text-xs text-gray-500 mt-1">
                                  {coordenador.email}
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>

                  {/* Paginação */}
                  <div className="flex items-center justify-between px-2 py-4 border-t">
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {inicio + 1}-{Math.min(inicio + ITENS_POR_PAGINA, filtrados.length)} de{' '}
                      {filtrados.length} consultores
                    </div>
                    {totalPaginas > 1 && (
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={pagina === 1}
                          onClick={() => setPaginaAtual(Math.max(1, pagina - 1))}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <span className="text-sm px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded">
                          Página {pagina} de {totalPaginas}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={pagina === totalPaginas}
                          onClick={() => setPaginaAtual(Math.min(totalPaginas, pagina + 1))}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}

export default ConsultoresCoordenadores;
