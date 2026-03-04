import { useState } from 'react';
import { Plus, Users, Filter, Search, Loader2, Edit, Trash2, X, ArrowUpDown, Eye } from 'lucide-react';
import AdminLayout from '@/components/admin/LayoutAdmin';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FormPessoa } from '@/components/admin/organograma/FormPessoa';
import { OrganoTree } from '@/components/admin/organograma/OrganoTree';
import { GerenciadorOrdemSimples } from '@/components/admin/organograma/GerenciadorOrdemSimples';
import { useOrganograma } from '@/hooks/useOrganograma';
import type { PessoaOrganograma } from '@/types/organograma';

export default function Organograma() {
  const { pessoas, loading, construirArvoreHierarquica, fetchPessoas } = useOrganograma();
  const [modalOpen, setModalOpen] = useState(false);
  const [modoVisualizacao, setModoVisualizacao] = useState(false);
  const [pessoaEditando, setPessoaEditando] = useState<PessoaOrganograma | undefined>();
  const [mostrarGerenciadorOrdem, setMostrarGerenciadorOrdem] = useState(false);
  const [abaAtiva, setAbaAtiva] = useState('arvore');
  const [showFilters, setShowFilters] = useState(false);
  const [produtoSelecionado, setProdutoSelecionado] = useState<'TODOS' | 'COMEX' | 'FISCAL' | 'GALLERY'>('TODOS');
  const [filtros, setFiltros] = useState({
    busca: '',
    departamento: 'all',
    cargo: 'all',
  });

  // Função para verificar se há filtros ativos
  const hasActiveFilters = () => {
    return filtros.busca !== '' || 
           filtros.departamento !== 'all' || 
           filtros.cargo !== 'all' ||
           produtoSelecionado !== 'TODOS';
  };

  // Função para limpar filtros
  const limparFiltros = () => {
    setFiltros({
      busca: '',
      departamento: 'all',
      cargo: 'all',
    });
    setProdutoSelecionado('TODOS');
  };

  const handleNovaPessoa = () => {
    setPessoaEditando(undefined);
    setModoVisualizacao(false);
    setModalOpen(true);
  };

  const handleEditarPessoa = (pessoa: PessoaOrganograma) => {
    setPessoaEditando(pessoa);
    setModoVisualizacao(false);
    setModalOpen(true);
  };

  const handleVisualizarPessoa = (pessoa: PessoaOrganograma) => {
    setPessoaEditando(pessoa);
    setModoVisualizacao(true);
    setModalOpen(true);
  };

  const handleSuccess = () => {
    fetchPessoas();
  };

  const arvoreHierarquica = construirArvoreHierarquica(
    produtoSelecionado === 'TODOS' ? undefined : produtoSelecionado
  );

  // Filtrar e ordenar pessoas por nome (A-Z) e produto selecionado
  const pessoasFiltradas = pessoas
    .filter((pessoa) => {
      const matchBusca = pessoa.nome.toLowerCase().includes(filtros.busca.toLowerCase()) ||
                         pessoa.email.toLowerCase().includes(filtros.busca.toLowerCase()) ||
                         pessoa.cargo.toLowerCase().includes(filtros.busca.toLowerCase());
      const matchDepartamento = filtros.departamento === 'all' || pessoa.departamento === filtros.departamento;
      const matchCargo = filtros.cargo === 'all' || pessoa.cargo === filtros.cargo;
      const matchProduto = produtoSelecionado === 'TODOS' || 
                           pessoa.produto === produtoSelecionado || 
                           pessoa.produtos?.includes(produtoSelecionado);
      
      return matchBusca && matchDepartamento && matchCargo && matchProduto;
    })
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

  // Obter departamentos únicos
  const departamentos = Array.from(new Set(pessoas.map(p => p.departamento))).sort();

  // Estatísticas filtradas por produto
  const stats = {
    total: pessoasFiltradas.length,
    diretores: pessoasFiltradas.filter(p => p.cargo === 'Diretor').length,
    gerentes: pessoasFiltradas.filter(p => p.cargo === 'Gerente').length,
    coordenadores: pessoasFiltradas.filter(p => p.cargo === 'Coordenador').length,
    centralEscalacao: pessoasFiltradas.filter(p => p.cargo === 'Central Escalação').length,
  };

  return (
    <AdminLayout>
      <div className="min-h-screen bg-bg-secondary">
        <div className="px-6 py-6 space-y-8">
          {/* Cabeçalho */}
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
                Organograma
              </h1>
              <p className="text-muted-foreground mt-1">
                Visualize e gerencie a estrutura organizacional da empresa
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                className="bg-sonda-blue hover:bg-sonda-dark-blue"
                onClick={handleNovaPessoa}
              >
                <Plus className="h-4 w-4 mr-2" />
                Nova Pessoa
              </Button>
            </div>
          </div>

          {/* Cards de Estatísticas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 lg:gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs lg:text-sm font-medium text-gray-600 dark:text-gray-400">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Total de Pessoas
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-white">
                  {stats.total}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs lg:text-sm font-medium text-purple-600">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Diretores
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-xl lg:text-2xl font-bold text-purple-600">
                  {stats.diretores}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs lg:text-sm font-medium text-blue-600">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Gerentes
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-xl lg:text-2xl font-bold text-blue-600">
                  {stats.gerentes}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs lg:text-sm font-medium text-green-600">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Coordenadores
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-xl lg:text-2xl font-bold text-green-600">
                  {stats.coordenadores}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs lg:text-sm font-medium text-orange-600">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Central Escalação
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-xl lg:text-2xl font-bold text-orange-600">
                  {stats.centralEscalacao}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Card Principal */}
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Estrutura Organizacional
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
                  
                  {/* Botão Limpar Filtro - só aparece se há filtros ativos */}
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

              {/* Área de filtros */}
              {showFilters && (
                <div className="space-y-4 pt-4 border-t">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    {/* Campo de busca */}
                    <div>
                      <div className="text-sm font-medium mb-2">Buscar</div>
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <Input
                          placeholder="Buscar por nome, email ou cargo..."
                          value={filtros.busca}
                          onChange={(e) => setFiltros({...filtros, busca: e.target.value})}
                          className="pl-10 focus:ring-sonda-blue focus:border-sonda-blue"
                        />
                      </div>
                    </div>

                    {/* Filtro Produto */}
                    <div>
                      <div className="text-sm font-medium mb-2">Produto</div>
                      <Select value={produtoSelecionado} onValueChange={(value: any) => setProdutoSelecionado(value)}>
                        <SelectTrigger className="focus:ring-sonda-blue focus:border-sonda-blue">
                          <SelectValue placeholder="Todos os produtos" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="TODOS">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full bg-gray-400"></div>
                              <span>Todos</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="COMEX">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full bg-blue-600"></div>
                              <span>Comex</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="FISCAL">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full bg-cyan-400"></div>
                              <span>Fiscal</span>
                            </div>
                          </SelectItem>
                          <SelectItem value="GALLERY">
                            <div className="flex items-center gap-2">
                              <div className="w-3 h-3 rounded-full bg-pink-600"></div>
                              <span>Gallery</span>
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Filtro Departamento */}
                    <div>
                      <div className="text-sm font-medium mb-2">Departamento</div>
                      <Select 
                        value={filtros.departamento} 
                        onValueChange={(value) => setFiltros({...filtros, departamento: value})}
                      >
                        <SelectTrigger className="focus:ring-sonda-blue focus:border-sonda-blue">
                          <SelectValue placeholder="Todos os departamentos" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos os departamentos</SelectItem>
                          {departamentos.map((dept) => (
                            <SelectItem key={dept} value={dept}>
                              {dept}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Filtro Cargo */}
                    <div>
                      <div className="text-sm font-medium mb-2">Cargo</div>
                      <Select 
                        value={filtros.cargo} 
                        onValueChange={(value) => setFiltros({...filtros, cargo: value})}
                      >
                        <SelectTrigger className="focus:ring-sonda-blue focus:border-sonda-blue">
                          <SelectValue placeholder="Todos os cargos" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos os cargos</SelectItem>
                          <SelectItem value="Diretor">Diretor</SelectItem>
                          <SelectItem value="Gerente">Gerente</SelectItem>
                          <SelectItem value="Coordenador">Coordenador</SelectItem>
                          <SelectItem value="Central Escalação">Central Escalação</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )}
            </CardHeader>

            <CardContent>
              {loading ? (
                <div className="flex justify-center items-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-sonda-blue" />
                </div>
              ) : (
                <Tabs value={abaAtiva} onValueChange={setAbaAtiva} className="w-full">
                  <div className="flex items-center justify-between mb-4">
                    <TabsList className="bg-gray-100 p-1 rounded-lg">
                      <TabsTrigger 
                        value="arvore"
                        className="data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm text-gray-500 font-medium"
                      >
                        Visualização em Árvore
                      </TabsTrigger>
                      <TabsTrigger 
                        value="lista"
                        className="data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm text-gray-500 font-medium"
                      >
                        Lista de Pessoas
                      </TabsTrigger>
                    </TabsList>
                    
                    {/* Botão Gerenciar Ordem - só aparece na aba Árvore */}
                    {abaAtiva === 'arvore' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setMostrarGerenciadorOrdem(true)}
                        className="flex items-center gap-2"
                      >
                        <ArrowUpDown className="h-4 w-4" />
                        Gerenciar Ordem
                      </Button>
                    )}
                  </div>

                  <TabsContent value="arvore" className="mt-4">
                    <OrganoTree 
                      pessoas={arvoreHierarquica} 
                      onEdit={handleEditarPessoa}
                      onDelete={handleSuccess}
                      isFiltered={produtoSelecionado !== 'TODOS'}
                    />
                  </TabsContent>

                  <TabsContent value="lista" className="mt-4">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="text-xs sm:text-sm py-2">Foto</TableHead>
                            <TableHead className="text-xs sm:text-sm py-2">Nome</TableHead>
                            <TableHead className="text-center text-xs sm:text-sm py-2">Cargo</TableHead>
                            <TableHead className="text-xs sm:text-sm py-2">Departamento</TableHead>
                            <TableHead className="text-xs sm:text-sm py-2">Email</TableHead>
                            <TableHead className="text-center text-xs sm:text-sm py-2">Telefone</TableHead>
                            <TableHead className="text-xs sm:text-sm py-2">Superior</TableHead>
                            <TableHead className="text-center text-xs sm:text-sm py-2 w-32">Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {pessoasFiltradas.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={8} className="text-center py-8">
                                <div className="flex flex-col items-center justify-center text-gray-500">
                                  <Users className="h-12 w-12 mb-2 text-gray-400" />
                                  <p>Nenhuma pessoa encontrada</p>
                                </div>
                              </TableCell>
                            </TableRow>
                          ) : (
                            pessoasFiltradas.map((pessoa) => {
                              const superior = pessoa.superior_id 
                                ? pessoas.find(p => p.id === pessoa.superior_id)
                                : null;
                              
                              return (
                                <TableRow key={pessoa.id} className="hover:bg-gray-50">
                                  <TableCell>
                                    {pessoa.foto_url ? (
                                      <img
                                        src={pessoa.foto_url}
                                        alt={pessoa.nome}
                                        className="h-10 w-10 rounded-full object-cover border-2 border-gray-200"
                                      />
                                    ) : (
                                      <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center border-2 border-gray-300">
                                        <Users className="h-5 w-5 text-gray-400" />
                                      </div>
                                    )}
                                  </TableCell>
                                  <TableCell className="font-medium">{pessoa.nome}</TableCell>
                                  <TableCell>
                                    <Badge 
                                      className={
                                        pessoa.cargo === 'Diretor' 
                                          ? 'bg-purple-100 text-purple-800 text-xs'
                                          : pessoa.cargo === 'Gerente'
                                          ? 'bg-blue-100 text-blue-800 text-xs'
                                          : pessoa.cargo === 'Coordenador'
                                          ? 'bg-green-100 text-green-800 text-xs'
                                          : 'bg-orange-100 text-orange-800 text-xs'
                                      }
                                    >
                                      {pessoa.cargo}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>{pessoa.departamento}</TableCell>
                                  <TableCell className="text-sm">{pessoa.email}</TableCell>
                                  <TableCell className="text-sm">{pessoa.telefone || '-'}</TableCell>
                                  <TableCell className="text-sm">
                                    {superior ? superior.nome : '-'}
                                  </TableCell>
                                  <TableCell className="text-center">
                                    <div className="flex justify-center gap-1">
                                      <Button 
                                        variant="outline" 
                                        size="sm" 
                                        className="h-8 w-8 p-0"
                                        onClick={() => handleVisualizarPessoa(pessoa)}
                                        title="Visualizar"
                                      >
                                        <Eye className="h-4 w-4 text-blue-600" />
                                      </Button>
                                      <Button 
                                        variant="outline" 
                                        size="sm" 
                                        className="h-8 w-8 p-0"
                                        onClick={() => handleEditarPessoa(pessoa)}
                                        title="Editar"
                                      >
                                        <Edit className="h-4 w-4" />
                                      </Button>
                                      <Button 
                                        variant="outline" 
                                        size="sm" 
                                        className="h-8 w-8 p-0 text-red-600 hover:text-red-800"
                                        onClick={() => {
                                          if (confirm(`Tem certeza que deseja excluir ${pessoa.nome}?`)) {
                                            // TODO: Implementar exclusão
                                            console.log('Excluir pessoa:', pessoa.id);
                                          }
                                        }}
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
                  </TabsContent>
                </Tabs>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <FormPessoa
        open={modalOpen}
        onOpenChange={setModalOpen}
        pessoa={pessoaEditando}
        modoVisualizacao={modoVisualizacao}
        onSuccess={handleSuccess}
      />

      <GerenciadorOrdemSimples
        open={mostrarGerenciadorOrdem}
        onOpenChange={setMostrarGerenciadorOrdem}
        pessoas={arvoreHierarquica}
        onSave={handleSuccess}
      />
    </AdminLayout>
  );
}
