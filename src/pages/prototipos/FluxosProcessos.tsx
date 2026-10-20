// Protótipo: controle de fluxos de processos (BPMN + mapa mental + RACI + procedimento + versões).
import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  CopyPlus,
  Download,
  FileText,
  Image,
  RotateCcw,
  Search,
  Send,
  Sheet,
  Workflow,
} from 'lucide-react';
import AdminLayout from '@/components/admin/LayoutAdmin';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import type { PrototipoProps } from '@/utils/prototipos';
import { ArvoreProcessos, caminhoDoGrupo, gruposFolha } from './fluxosProcessos/ArvoreProcessos';
import { EditorFluxo } from './fluxosProcessos/EditorFluxo';
import { gerarMapaMental, MapaMental, type NoMapa } from './fluxosProcessos/MapaMental';
import { MatrizRaci } from './fluxosProcessos/MatrizRaci';
import { Procedimento } from './fluxosProcessos/Procedimento';
import { BADGE_STATUS, formatarData, nomeCargo } from './fluxosProcessos/utils';
import {
  ARVORE_GRUPOS,
  CARGOS,
  FLUXOS_INICIAIS,
  PROCESSOS,
  type FluxoProcesso,
  type Processo,
  type StatusProcesso,
} from './mocks/fluxosProcessos';

const FLUXO_VAZIO: FluxoProcesso = { nodes: [], edges: [] };
const FOCO = 'focus:ring-sonda-blue focus:border-sonda-blue';
const CLASSE_ABA =
  'data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm text-gray-500 font-medium';

function CardEstatistica({
  titulo,
  valor,
  icone: Icone,
  cor,
}: {
  titulo: string;
  valor: number;
  icone: typeof Workflow;
  cor: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className={cn('text-xs lg:text-sm font-medium', cor)}>
          <div className="flex items-center gap-2">
            <Icone className="h-4 w-4" />
            {titulo}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div
          className={cn(
            'text-xl lg:text-2xl font-bold',
            cor === 'text-gray-600 dark:text-gray-400' ? 'text-gray-900 dark:text-white' : cor
          )}
        >
          {valor}
        </div>
      </CardContent>
    </Card>
  );
}

function proximaVersao(versao: string, major = false) {
  const [maior, menor] = versao.split('.').map(Number);
  return major ? `${maior + 1}.0` : `${maior}.${menor + 1}`;
}

export default function FluxosProcessos({ estado }: PrototipoProps) {
  const { toast } = useToast();
  const [processos, setProcessos] = useState<Processo[]>(PROCESSOS);
  const [fluxos, setFluxos] = useState<Record<string, FluxoProcesso>>(FLUXOS_INICIAIS);
  const [mapas, setMapas] = useState<Record<string, NoMapa>>({});
  const [selecionadoId, setSelecionadoId] = useState<string>('p-2-2');
  const [aba, setAba] = useState('fluxo');
  const [busca, setBusca] = useState('');
  const [novoAberto, setNovoAberto] = useState(false);
  const [novo, setNovo] = useState({
    codigo: '',
    nome: '',
    grupoId: 'g-solicitacao',
    donoCargoId: 'coordenador',
  });
  const [tentouCriar, setTentouCriar] = useState(false);

  const lista = estado === 'dados' ? processos : [];
  const processo = lista.find((p) => p.id === selecionadoId);
  const fluxo = (processo && fluxos[processo.id]) ?? FLUXO_VAZIO;
  const somenteLeitura = processo?.status === 'publicado';

  useEffect(() => {
    if (aba === 'mapa' && processo && !mapas[processo.id]) {
      setMapas((m) => ({
        ...m,
        [processo.id]: gerarMapaMental(processo, fluxos[processo.id], CARGOS),
      }));
    }
  }, [aba, processo, mapas, fluxos]);

  const alterarProcesso = (campos: Partial<Processo>) =>
    setProcessos((ps) => ps.map((p) => (p.id === selecionadoId ? { ...p, ...campos } : p)));

  const alterarFluxo = (atualizar: (f: FluxoProcesso) => FluxoProcesso) =>
    setFluxos((fs) => ({ ...fs, [selecionadoId]: atualizar(fs[selecionadoId] ?? FLUXO_VAZIO) }));

  const mudarStatus = (status: StatusProcesso, observacao: string, novaVersao?: string) => {
    if (!processo) return;
    const agora = new Date().toISOString();
    const versao = novaVersao ?? processo.versao;
    const versoes = novaVersao
      ? [...processo.versoes, { versao, status, autor: 'Usuário Teste', data: agora, observacao }]
      : processo.versoes.map((v) =>
          v.versao === versao ? { ...v, status, data: agora, observacao } : v
        );
    alterarProcesso({
      status,
      versao,
      versoes,
      atualizadoEm: agora,
      atualizadoPor: 'Usuário Teste',
    });
    toast({ title: `Versão ${versao}: ${BADGE_STATUS[status].rotulo}`, description: observacao });
  };

  const exportar = (formato: string) =>
    toast({
      title: `Exportar ${formato}`,
      description: 'No protótipo a exportação é apenas simulada.',
    });

  const criarProcesso = () => {
    setTentouCriar(true);
    if (!novo.nome.trim() || !novo.codigo.trim()) return;
    const agora = new Date().toISOString();
    const id = `p-${crypto.randomUUID().slice(0, 8)}`;
    setProcessos((ps) => [
      ...ps,
      {
        id,
        codigo: novo.codigo.trim(),
        nome: novo.nome.trim(),
        grupoId: novo.grupoId,
        status: 'rascunho',
        versao: '0.1',
        donoCargoId: novo.donoCargoId,
        objetivo: '',
        escopo: '',
        gatilho: '',
        indicadores: [],
        regras: [],
        atualizadoEm: agora,
        atualizadoPor: 'Usuário Teste',
        versoes: [
          {
            versao: '0.1',
            status: 'rascunho',
            autor: 'Usuário Teste',
            data: agora,
            observacao: 'Processo criado',
          },
        ],
      },
    ]);
    setSelecionadoId(id);
    setAba('fluxo');
    setNovoAberto(false);
    setTentouCriar(false);
    setNovo({ codigo: '', nome: '', grupoId: 'g-solicitacao', donoCargoId: 'coordenador' });
  };

  const abrirNovo = () => setNovoAberto(true);

  const contar = (s: StatusProcesso) => lista.filter((p) => p.status === s).length;

  const conteudo = () => {
    if (estado === 'carregando') {
      return (
        <div className="grid grid-cols-1 xl:grid-cols-[300px_minmax(0,1fr)] gap-4">
          <Card>
            <CardContent className="space-y-3 pt-6">
              {Array.from({ length: 10 }).map((_, i) => (
                <Skeleton key={i} className="h-4" style={{ width: `${60 + ((i * 13) % 40)}%` }} />
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="space-y-4 pt-6">
              <Skeleton className="h-8 w-1/3" />
              <Skeleton className="h-4 w-1/2" />
              <Skeleton className="h-[560px] w-full" />
            </CardContent>
          </Card>
        </div>
      );
    }

    if (estado === 'erro') {
      return (
        <Card>
          <CardContent>
            <EmptyState
              icon={<AlertTriangle className="h-12 w-12 text-red-500" />}
              title="Erro ao carregar os processos"
              description="Não foi possível buscar os fluxos de processos. Tente novamente."
              action={<Button variant="outline">Tentar novamente</Button>}
            />
          </CardContent>
        </Card>
      );
    }

    if (lista.length === 0) {
      return (
        <Card>
          <CardContent>
            <EmptyState
              icon={<Workflow className="h-12 w-12 text-gray-400" />}
              title="Nenhum processo mapeado"
              description="Cadastre o primeiro processo para começar a desenhar o fluxo e documentar as responsabilidades."
              action={
                <Button className="bg-sonda-blue hover:bg-sonda-dark-blue" onClick={abrirNovo}>
                  <Workflow className="h-4 w-4 mr-2" />
                  Novo Processo
                </Button>
              }
            />
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="grid grid-cols-1 xl:grid-cols-[300px_minmax(0,1fr)] gap-4">
        <Card className="h-fit">
          <CardHeader className="pb-3">
            <CardTitle className="text-sonda-blue">Processos</CardTitle>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar processo"
                className={cn('pl-9', FOCO)}
              />
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <ScrollArea className="h-[720px] pr-2">
              <ArvoreProcessos
                grupos={ARVORE_GRUPOS}
                processos={lista}
                selecionadoId={selecionadoId}
                busca={busca}
                onSelecionar={(id) => setSelecionadoId(id)}
              />
            </ScrollArea>
          </CardContent>
        </Card>

        {processo ? (
          <Card className="min-w-0">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-1 text-xs text-gray-500">
                {(caminhoDoGrupo(ARVORE_GRUPOS, processo.grupoId) ?? []).map((nome, i) => (
                  <span key={nome} className="flex items-center gap-1">
                    {i > 0 && <ChevronRight className="h-3 w-3" />}
                    {nome}
                  </span>
                ))}
              </div>
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">
                      {processo.codigo} {processo.nome}
                    </h2>
                    <Badge className={BADGE_STATUS[processo.status].classe}>
                      {BADGE_STATUS[processo.status].rotulo}
                    </Badge>
                    <Badge variant="outline">v{processo.versao}</Badge>
                  </div>
                  <p className="text-sm text-gray-500">
                    Dono:{' '}
                    <span className="font-medium text-gray-700">
                      {nomeCargo(CARGOS, processo.donoCargoId)}
                    </span>{' '}
                    · Atualizado em {formatarData(processo.atualizadoEm)} por{' '}
                    {processo.atualizadoPor}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Download className="h-4 w-4 mr-2" />
                        Exportar
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => exportar('diagrama (PNG)')}>
                        <Image className="h-4 w-4 mr-2" />
                        Diagrama (PNG)
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => exportar('procedimento (PDF)')}>
                        <FileText className="h-4 w-4 mr-2" />
                        Procedimento (PDF)
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => exportar('matriz RACI (Excel)')}>
                        <Sheet className="h-4 w-4 mr-2" />
                        Matriz RACI (Excel)
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  {processo.status === 'rascunho' && (
                    <Button
                      size="sm"
                      className="bg-sonda-blue hover:bg-sonda-dark-blue"
                      onClick={() => mudarStatus('em_revisao', 'Enviado para revisão')}
                    >
                      <Send className="h-4 w-4 mr-2" />
                      Enviar para revisão
                    </Button>
                  )}
                  {processo.status === 'em_revisao' && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => mudarStatus('rascunho', 'Devolvido para ajustes')}
                      >
                        <RotateCcw className="h-4 w-4 mr-2" />
                        Devolver
                      </Button>
                      <Button
                        size="sm"
                        className="bg-sonda-blue hover:bg-sonda-dark-blue"
                        onClick={() => mudarStatus('publicado', 'Aprovado e publicado')}
                      >
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Aprovar e publicar
                      </Button>
                    </>
                  )}
                  {processo.status === 'publicado' && (
                    <Button
                      size="sm"
                      className="bg-sonda-blue hover:bg-sonda-dark-blue"
                      onClick={() =>
                        mudarStatus(
                          'rascunho',
                          'Nova versão em elaboração',
                          proximaVersao(processo.versao)
                        )
                      }
                    >
                      <CopyPlus className="h-4 w-4 mr-2" />
                      Nova versão
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <Tabs value={aba} onValueChange={setAba} className="w-full">
                <TabsList className="bg-gray-100 p-1 rounded-lg">
                  <TabsTrigger value="fluxo" className={CLASSE_ABA}>
                    Fluxo
                  </TabsTrigger>
                  <TabsTrigger value="mapa" className={CLASSE_ABA}>
                    Mapa mental
                  </TabsTrigger>
                  <TabsTrigger value="raci" className={CLASSE_ABA}>
                    Matriz RACI
                  </TabsTrigger>
                  <TabsTrigger value="procedimento" className={CLASSE_ABA}>
                    Procedimento
                  </TabsTrigger>
                  <TabsTrigger value="versoes" className={CLASSE_ABA}>
                    Versões
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="fluxo" className="mt-4">
                  <EditorFluxo
                    processo={processo}
                    processos={lista}
                    cargos={CARGOS}
                    fluxo={fluxo}
                    somenteLeitura={somenteLeitura}
                    onFluxoChange={alterarFluxo}
                    onAlterarProcesso={alterarProcesso}
                    onAbrirProcesso={(id) => setSelecionadoId(id)}
                  />
                </TabsContent>

                <TabsContent value="mapa" className="mt-4">
                  {mapas[processo.id] ? (
                    <MapaMental
                      key={processo.id}
                      arvore={mapas[processo.id]}
                      somenteLeitura={somenteLeitura}
                      onChange={(arvore) => setMapas((m) => ({ ...m, [processo.id]: arvore }))}
                      onRegerar={() =>
                        setMapas((m) => ({
                          ...m,
                          [processo.id]: gerarMapaMental(processo, fluxos[processo.id], CARGOS),
                        }))
                      }
                    />
                  ) : (
                    <Skeleton className="h-[680px] w-full" />
                  )}
                </TabsContent>

                <TabsContent value="raci" className="mt-4">
                  <MatrizRaci
                    fluxo={fluxo}
                    cargos={CARGOS}
                    somenteLeitura={somenteLeitura}
                    onAlterar={(noId, cargoId, papel) =>
                      alterarFluxo((f) => ({
                        ...f,
                        nodes: f.nodes.map((n) => {
                          if (n.id !== noId || !n.data.doc) return n;
                          const raci = { ...n.data.doc.raci };
                          if (papel) raci[cargoId] = papel;
                          else delete raci[cargoId];
                          return { ...n, data: { ...n.data, doc: { ...n.data.doc, raci } } };
                        }),
                      }))
                    }
                  />
                </TabsContent>

                <TabsContent value="procedimento" className="mt-4">
                  <Procedimento processo={processo} fluxo={fluxo} cargos={CARGOS} />
                </TabsContent>

                <TabsContent value="versoes" className="mt-4">
                  <div className="overflow-x-auto rounded-lg border border-gray-200">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-gray-50">
                          <TableHead className="font-semibold text-gray-700">Versão</TableHead>
                          <TableHead className="font-semibold text-gray-700 text-center">
                            Status
                          </TableHead>
                          <TableHead className="font-semibold text-gray-700">Autor</TableHead>
                          <TableHead className="font-semibold text-gray-700">Data</TableHead>
                          <TableHead className="font-semibold text-gray-700">Observação</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {[...processo.versoes].reverse().map((v) => (
                          <TableRow key={v.versao} className="hover:bg-gray-50">
                            <TableCell>
                              <span className="font-mono text-sm font-semibold">v{v.versao}</span>
                              {v.versao === processo.versao && (
                                <Badge className="ml-2 bg-blue-100 text-blue-800 text-xs">
                                  Atual
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge className={cn(BADGE_STATUS[v.status].classe, 'text-xs')}>
                                {BADGE_STATUS[v.status].rotulo}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-sm">{v.autor}</TableCell>
                            <TableCell className="text-sm">{formatarData(v.data)}</TableCell>
                            <TableCell className="text-sm text-gray-600">{v.observacao}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent>
              <EmptyState
                icon={<Workflow className="h-12 w-12 text-gray-400" />}
                title="Selecione um processo"
                description="Escolha um processo na árvore ao lado para ver o fluxo e a documentação."
              />
            </CardContent>
          </Card>
        )}
      </div>
    );
  };

  return (
    <AdminLayout>
      <div className="min-h-screen bg-bg-secondary">
        <div className="px-6 py-6 space-y-8">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
                Fluxos de Processos
              </h1>
              <p className="text-muted-foreground mt-1">
                Desenhe, documente e versione os processos com as responsabilidades de cada cargo
              </p>
            </div>
            <Button
              size="sm"
              className="bg-sonda-blue hover:bg-sonda-dark-blue"
              onClick={abrirNovo}
              disabled={estado !== 'dados' && estado !== 'vazio'}
            >
              <Workflow className="h-4 w-4 mr-2" />
              Novo Processo
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
            <CardEstatistica
              titulo="Processos mapeados"
              valor={lista.length}
              icone={Workflow}
              cor="text-gray-600 dark:text-gray-400"
            />
            <CardEstatistica
              titulo="Publicados"
              valor={contar('publicado')}
              icone={CheckCircle2}
              cor="text-green-600"
            />
            <CardEstatistica
              titulo="Em revisão"
              valor={contar('em_revisao')}
              icone={Send}
              cor="text-orange-600"
            />
            <CardEstatistica
              titulo="Rascunhos"
              valor={contar('rascunho')}
              icone={FileText}
              cor="text-sonda-blue"
            />
          </div>

          {conteudo()}
        </div>
      </div>

      <Dialog open={novoAberto} onOpenChange={setNovoAberto}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Novo processo</DialogTitle>
            <DialogDescription>O processo é criado como rascunho na versão 0.1.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Código *</Label>
                <Input
                  value={novo.codigo}
                  onChange={(e) => setNovo((n) => ({ ...n, codigo: e.target.value }))}
                  placeholder="2.10"
                  className={
                    tentouCriar && !novo.codigo.trim()
                      ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                      : FOCO
                  }
                />
              </div>
              <div className="col-span-2 space-y-2">
                <Label>Nome *</Label>
                <Input
                  value={novo.nome}
                  onChange={(e) => setNovo((n) => ({ ...n, nome: e.target.value }))}
                  placeholder="Nome do processo"
                  className={
                    tentouCriar && !novo.nome.trim()
                      ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                      : FOCO
                  }
                />
              </div>
            </div>
            {tentouCriar && (!novo.nome.trim() || !novo.codigo.trim()) && (
              <p className="text-sm text-red-500">Informe o código e o nome do processo.</p>
            )}
            <div className="space-y-2">
              <Label>Grupo</Label>
              <Select
                value={novo.grupoId}
                onValueChange={(grupoId) => setNovo((n) => ({ ...n, grupoId }))}
              >
                <SelectTrigger className={FOCO}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {gruposFolha(ARVORE_GRUPOS).map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      {g.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Dono do processo</Label>
              <Select
                value={novo.donoCargoId}
                onValueChange={(donoCargoId) => setNovo((n) => ({ ...n, donoCargoId }))}
              >
                <SelectTrigger className={FOCO}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CARGOS.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNovoAberto(false)}>
              Cancelar
            </Button>
            <Button className="bg-sonda-blue hover:bg-sonda-dark-blue" onClick={criarProcesso}>
              Criar processo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
