import { useState } from 'react';
import { Plus, Users, Filter, Search, Loader2, Edit, Trash2, X } from 'lucide-react';
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
import { useOrganograma } from '@/hooks/useOrganograma';
import type { PessoaOrganograma } from '@/types/organograma';

export default function Organograma() {
  const { pessoas, loading, construirArvoreHierarquica, fetchPessoas } = useOrganograma();
  const [modalOpen, setModalOpen] = useState(false);
  const [pessoaEditando, setPessoaEditando] = useState<PessoaOrganograma | undefined>();
  const [showFilters, setShowFilters] = useState(false);
  const [filtros, setFiltros] = useState({
    busca: '',
    departamento: 'all',
    cargo: 'all',
  });

  // Função para verificar se há filtros ativos
  const hasActiveFilters = () => {
    return filtros.busca !== '' || 
           filtros.departamento !== 'all' || 
           filtros.cargo !== 'all';
  };

  // Função para limpar filtros
  const limparFiltros = () => {
    setFiltros({
      busca: '',
      departamento: 'all',
      cargo: 'all',
    });
  };

  const handleNovaPessoa = () => {
    setPessoaEditando(undefined);
    setModalOpen(true);
  };

  const handleEditarPessoa = (pessoa: PessoaOrganograma) => {
    setPessoaEditando(pessoa);
    setModalOpen(true);
  };

  const handleSuccess = () => {
    fetchPessoas();
  };

  const arvoreHierarquica = construirArvoreHierarquica();

  // Filtrar pessoas
  const pessoasFiltradas = pessoas.filter((pessoa) => {
    const matchBusca = pessoa.nome.toLowerCase().includes(filtros.busca.toLowerCase()) ||
                       pessoa.email.toLowerCase().includes(filtros.busca.toLowerCase()) ||
                       pessoa.cargo.toLowerCase().includes(filtros.busca.toLowerCase());
    const matchDepartamento = filtros.departamento === 'all' || pessoa.departamento === filtros.departamento;
    const matchCargo = filtros.cargo === 'all' || pessoa.cargo === filtros.cargo;
    
    return matchBusca && matchDepartamento && matchCargo;
  });

  // Obter departamentos únicos
  const departamentos = Array.from(new Set(pessoas.map(p => p.departamento))).sort();

  // Estatísticas
  const stats = {
    total: pessoas.length,
    diretores: pessoas.filter(p => p.cargo === 'Diretor').length,
    gerentes: pessoas.filter(p => p.cargo === 'Gerente').length,
    coordenadores: pessoas.filter(p => p.cargo === 'Coordenador').length,
    centralEscalacao: pessoas.filter(p => p.cargo === 'Central Escalação').length,
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
            <Button
              size="sm"
              className="bg-sonda-blue hover:bg-sonda-dark-blue"
              onClick={handleNovaPessoa}
            >
              <Plus className="h-4 w-4 mr-2" />
              Nova Pessoa
            </Button>
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
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                <Tabs defaultValue="arvore" className="w-full">
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

                  <TabsContent value="arvore" className="mt-4">
                    <OrganoTree 
                      pessoas={arvoreHierarquica} 
                      onEdit={handleEditarPessoa}
                      onDelete={handleSuccess}
                    />
                  </TabsContent>

                  <TabsContent value="lista" className="mt-4">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="bg-gray-50">
                            <TableHead className="font-semibold text-gray-700">Foto</TableHead>
                            <TableHead className="font-semibold text-gray-700">Nome</TableHead>
                            <TableHead className="font-semibold text-gray-700">Cargo</TableHead>
                            <TableHead className="font-semibold text-gray-700">Departamento</TableHead>
                            <TableHead className="font-semibold text-gray-700">Email</TableHead>
                            <TableHead className="font-semibold text-gray-700">Telefone</TableHead>
                            <TableHead className="font-semibold text-gray-700">Superior</TableHead>
                            <TableHead className="font-semibold text-gray-700 text-center w-24">Ações</TableHead>
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
                                        onClick={() => handleEditarPessoa(pessoa)}
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
        onSuccess={handleSuccess}
      />
    </AdminLayout>
  );
}
