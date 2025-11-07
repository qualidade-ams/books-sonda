import { useState, useMemo } from 'react';
import AdminLayout from '@/components/admin/LayoutAdmin';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useRequerimentos } from '@/hooks/useRequerimentos';
import { 
  DollarSign, 
  Clock, 
  FileText, 
  BarChart3,
  PieChart,
  Ticket,
  TrendingUp,
  Award,
  Building2
} from 'lucide-react';
import { converterMinutosParaHoras, converterMinutosParaHorasDecimal } from '@/utils/horasUtils';
import { getHexColor } from '@/utils/requerimentosColors';
import type { TipoCobrancaType, ModuloType } from '@/types/requerimentos';
import {
  BarChart,
  Bar,
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
  Area,
  AreaChart
} from 'recharts';

const Dashboard = () => {
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  
  const [anoSelecionado, setAnoSelecionado] = useState(currentYear);
  const [filtroModulo, setFiltroModulo] = useState<ModuloType | 'todos'>('todos');

  // Buscar dados de requerimentos - buscar TODOS sem filtro
  const { data: requerimentos, isLoading: loadingRequerimentos } = useRequerimentos();



  // Calcular estatísticas de requerimentos
  const statsRequerimentos = useMemo(() => {
    console.log('Dashboard - Requerimentos recebidos:', requerimentos?.length || 0);
    
    if (!requerimentos || requerimentos.length === 0) {
      console.log('Dashboard - Nenhum requerimento disponível');
      return null;
    }

    let dados = requerimentos;

    // Filtrar por ano
    if (anoSelecionado) {
      dados = dados.filter(r => {
        if (!r.mes_cobranca) return false;
        const ano = r.mes_cobranca.split('/')[1];
        return parseInt(ano) === anoSelecionado;
      });
      console.log(`Dashboard - Após filtro de ano (${anoSelecionado}):`, dados.length);
    }

    // Aplicar filtros
    if (filtroModulo !== 'todos') {
      dados = dados.filter(r => r.modulo === filtroModulo);
      console.log(`Dashboard - Após filtro de módulo (${filtroModulo}):`, dados.length);
    }

    const total = dados.length;
    
    // Debug: verificar formato das horas
    if (dados.length > 0) {
      console.log('Dashboard - Exemplo de horas_total:', dados[0].horas_total, typeof dados[0].horas_total);
    }
    
    // horas_total pode vir como string "HH:MM" ou número (minutos)
    const totalHoras = dados.reduce((acc, r) => {
      const horas = r.horas_total;
      if (typeof horas === 'string' && horas.includes(':')) {
        // Formato HH:MM - converter para minutos
        const [h, m] = horas.split(':').map(Number);
        return acc + (h * 60 + m);
      }
      // Já é número (minutos)
      return acc + (Number(horas) || 0);
    }, 0);
    
    const totalValor = dados.reduce((acc, r) => acc + (Number(r.valor_total_geral) || 0), 0);
    const totalTickets = dados.reduce((acc, r) => acc + (Number(r.quantidade_tickets) || 0), 0);

    // Agrupar por tipo de cobrança
    const porTipoCobranca = dados.reduce((acc, r) => {
      const tipo = r.tipo_cobranca;
      if (!acc[tipo]) {
        acc[tipo] = { count: 0, horas: 0, valor: 0, tickets: 0 };
      }
      acc[tipo].count++;
      
      // Converter horas corretamente
      const horas = r.horas_total;
      if (typeof horas === 'string' && horas.includes(':')) {
        const [h, m] = horas.split(':').map(Number);
        acc[tipo].horas += (h * 60 + m);
      } else {
        acc[tipo].horas += Number(horas) || 0;
      }
      
      acc[tipo].valor += Number(r.valor_total_geral) || 0;
      acc[tipo].tickets += Number(r.quantidade_tickets) || 0;
      return acc;
    }, {} as Record<TipoCobrancaType, { count: number; horas: number; valor: number; tickets: number }>);

    // Calcular porcentagens
    const porcentagensTipo = Object.entries(porTipoCobranca).map(([tipo, data]) => ({
      tipo: tipo as TipoCobrancaType,
      porcentagem: (data.count / total) * 100,
      count: data.count,
      horas: data.horas,
      valor: data.valor,
      tickets: data.tickets
    }));

    // Agrupar por módulo
    const porModulo = dados.reduce((acc, r) => {
      const modulo = r.modulo;
      if (!acc[modulo]) {
        acc[modulo] = { count: 0, horas: 0 };
      }
      acc[modulo].count++;
      
      // Converter horas corretamente
      const horas = r.horas_total;
      if (typeof horas === 'string' && horas.includes(':')) {
        const [h, m] = horas.split(':').map(Number);
        acc[modulo].horas += (h * 60 + m);
      } else {
        acc[modulo].horas += Number(horas) || 0;
      }
      
      return acc;
    }, {} as Record<string, { count: number; horas: number }>);

    // Agrupar por mês (para gráfico de evolução mensal)
    const porMes = dados.reduce((acc, r) => {
      const mes = r.mes_cobranca || 'Sem mês';
      if (!acc[mes]) {
        acc[mes] = { count: 0, horas: 0, valor: 0, tickets: 0 };
      }
      acc[mes].count++;
      
      // Converter horas corretamente
      const horas = r.horas_total;
      if (typeof horas === 'string' && horas.includes(':')) {
        const [h, m] = horas.split(':').map(Number);
        acc[mes].horas += (h * 60 + m);
      } else {
        acc[mes].horas += Number(horas) || 0;
      }
      
      acc[mes].valor += Number(r.valor_total_geral) || 0;
      acc[mes].tickets += Number(r.quantidade_tickets) || 0;
      return acc;
    }, {} as Record<string, { count: number; horas: number; valor: number; tickets: number }>);

    // Ordenar por mês
    const porMesOrdenado = Object.entries(porMes)
      .filter(([mes]) => mes !== 'Sem mês')
      .sort((a, b) => {
        const [mesA] = a[0].split('/');
        const [mesB] = b[0].split('/');
        return parseInt(mesA) - parseInt(mesB);
      })
      .map(([mes, data]) => ({
        mes,
        mesNome: new Date(2000, parseInt(mes.split('/')[0]) - 1).toLocaleDateString('pt-BR', { month: 'short' }).replace('.', ''),
        ...data
      }));

    // Agrupar por mês e tipo de cobrança (para gráficos mensais por tipo)
    const porMesTipoCobranca = dados.reduce((acc, r) => {
      const mes = r.mes_cobranca || 'Sem mês';
      const tipo = r.tipo_cobranca;
      
      if (!acc[mes]) {
        acc[mes] = {};
      }
      
      if (!acc[mes][tipo]) {
        acc[mes][tipo] = { horas: 0, valor: 0 };
      }
      
      // Converter horas corretamente
      const horas = r.horas_total;
      if (typeof horas === 'string' && horas.includes(':')) {
        const [h, m] = horas.split(':').map(Number);
        acc[mes][tipo].horas += (h * 60 + m);
      } else {
        acc[mes][tipo].horas += Number(horas) || 0;
      }
      
      acc[mes][tipo].valor += Number(r.valor_total_geral) || 0;
      
      return acc;
    }, {} as Record<string, Partial<Record<TipoCobrancaType, { horas: number; valor: number }>>>);

    // Formatar dados para gráficos mensais por tipo
    const porMesTipoOrdenado = Object.entries(porMesTipoCobranca)
      .filter(([mes]) => mes !== 'Sem mês')
      .sort((a, b) => {
        const [mesA] = a[0].split('/');
        const [mesB] = b[0].split('/');
        return parseInt(mesA) - parseInt(mesB);
      })
      .map(([mes, tipos]) => {
        const mesNome = new Date(2000, parseInt(mes.split('/')[0]) - 1).toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
        const resultado: any = { mes, mesNome };
        
        // Adicionar cada tipo de cobrança como propriedade
        Object.entries(tipos).forEach(([tipo, data]) => {
          resultado[`${tipo}_horas`] = converterMinutosParaHorasDecimal(data.horas);
          resultado[`${tipo}_valor`] = data.valor;
        });
        
        return resultado;
      });

    const result = {
      total,
      totalHoras,
      totalValor,
      totalTickets,
      porTipoCobranca: porcentagensTipo,
      porModulo,
      porMes: porMesOrdenado,
      porMesTipo: porMesTipoOrdenado
    };

    console.log('Dashboard - Stats finais:', {
      total,
      totalHoras,
      totalValor,
      totalTickets,
      tiposCobranca: porcentagensTipo.length,
      modulos: Object.keys(porModulo).length,
      meses: porMesOrdenado.length
    });

    return result;
  }, [requerimentos, filtroModulo, anoSelecionado]);

  // Calcular estatísticas por empresa
  const statsEmpresas = useMemo(() => {
    if (!requerimentos || requerimentos.length === 0) {
      return null;
    }

    let dados = requerimentos;

    // Filtrar por ano
    if (anoSelecionado) {
      dados = dados.filter(r => {
        if (!r.mes_cobranca) return false;
        const ano = r.mes_cobranca.split('/')[1];
        return parseInt(ano) === anoSelecionado;
      });
    }

    // Aplicar filtros
    if (filtroModulo !== 'todos') {
      dados = dados.filter(r => r.modulo === filtroModulo);
    }

    // Agrupar por empresa
    const porEmpresa = dados.reduce((acc, r) => {
      const empresa = r.cliente_nome || 'Sem empresa';
      if (!acc[empresa]) {
        acc[empresa] = { 
          count: 0, 
          horas: 0, 
          valor: 0, 
          tickets: 0,
          bancoHoras: 0,
          horasBancoHoras: 0
        };
      }
      acc[empresa].count++;
      
      // Converter horas corretamente
      const horas = r.horas_total;
      let horasEmMinutos = 0;
      if (typeof horas === 'string' && horas.includes(':')) {
        const [h, m] = horas.split(':').map(Number);
        horasEmMinutos = (h * 60 + m);
      } else {
        horasEmMinutos = Number(horas) || 0;
      }
      
      acc[empresa].horas += horasEmMinutos;
      acc[empresa].valor += Number(r.valor_total_geral) || 0;
      acc[empresa].tickets += Number(r.quantidade_tickets) || 0;
      
      // Contar banco de horas
      if (r.tipo_cobranca === 'Banco de Horas') {
        acc[empresa].bancoHoras++;
        acc[empresa].horasBancoHoras += horasEmMinutos;
      }
      
      return acc;
    }, {} as Record<string, { 
      count: number; 
      horas: number; 
      valor: number; 
      tickets: number;
      bancoHoras: number;
      horasBancoHoras: number;
    }>);

    // Encontrar empresa que mais fatura
    const empresaMaisFatura = Object.entries(porEmpresa)
      .filter(([_, data]) => data.valor > 0)
      .sort((a, b) => b[1].valor - a[1].valor)[0];

    // Encontrar empresa que mais usa banco de horas
    const empresaMaisBancoHoras = Object.entries(porEmpresa)
      .filter(([_, data]) => data.bancoHoras > 0)
      .sort((a, b) => b[1].horasBancoHoras - a[1].horasBancoHoras)[0];

    return {
      porEmpresa,
      empresaMaisFatura: empresaMaisFatura ? {
        nome: empresaMaisFatura[0],
        valor: empresaMaisFatura[1].valor,
        count: empresaMaisFatura[1].count
      } : null,
      empresaMaisBancoHoras: empresaMaisBancoHoras ? {
        nome: empresaMaisBancoHoras[0],
        horas: empresaMaisBancoHoras[1].horasBancoHoras,
        count: empresaMaisBancoHoras[1].bancoHoras
      } : null
    };
  }, [requerimentos, filtroModulo, anoSelecionado]);

  const isLoading = loadingRequerimentos;

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Cabeçalho */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
            <p className="text-gray-600 dark:text-gray-400">Visão geral do sistema</p>
          </div>

          {/* Filtros */}
          <div className="flex flex-wrap gap-2">
            <Select value={String(anoSelecionado)} onValueChange={(v) => setAnoSelecionado(parseInt(v))}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Ano" />
              </SelectTrigger>
              <SelectContent>
                {[currentYear, currentYear - 1, currentYear - 2, currentYear - 3].map(ano => (
                  <SelectItem key={ano} value={String(ano)}>
                    {ano}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filtroModulo} onValueChange={(v) => setFiltroModulo(v as ModuloType | 'todos')}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Módulo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos Módulos</SelectItem>
                <SelectItem value="Comex">Comex</SelectItem>
                <SelectItem value="Comply">Comply</SelectItem>
                <SelectItem value="Comply e-DOCS">Comply e-DOCS</SelectItem>
                <SelectItem value="Gallery">Gallery</SelectItem>
                <SelectItem value="pw.SATI">pw.SATI</SelectItem>
                <SelectItem value="pw.SPED">pw.SPED</SelectItem>
                <SelectItem value="pw.SATI/pw.SPED">pw.SATI/pw.SPED</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <>
            {/* Seção de Requerimentos */}
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <FileText className="h-6 w-6 text-blue-600" />
                Requerimentos
              </h2>

              {/* Cards de Resumo - Requerimentos */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1.5 pt-3">
                    <CardTitle className="text-xs font-medium">Total de Requerimentos</CardTitle>
                    <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                  </CardHeader>
                  <CardContent className="pb-3">
                    <div className="text-xl font-bold">{statsRequerimentos?.total || 0}</div>
                    <p className="text-[10px] text-muted-foreground">
                      Ano: {anoSelecionado}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1.5 pt-3">
                    <CardTitle className="text-xs font-medium">Total de Horas</CardTitle>
                    <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                  </CardHeader>
                  <CardContent className="pb-3">
                    <div className="text-xl font-bold">
                      {converterMinutosParaHoras(statsRequerimentos?.totalHoras || 0)}
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      Horas trabalhadas
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1.5 pt-3">
                    <CardTitle className="text-xs font-medium">Valor Faturado</CardTitle>
                    <DollarSign className="h-3.5 w-3.5 text-muted-foreground" />
                  </CardHeader>
                  <CardContent className="pb-3">
                    <div className="text-xl font-bold">
                      {new Intl.NumberFormat('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0
                      }).format(statsRequerimentos?.totalValor || 0)}
                    </div>
                    <p className="text-[10px] text-muted-foreground">
                      Valor total
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-1.5 pt-3">
                    <CardTitle className="text-xs font-medium">Total de Tickets</CardTitle>
                    <Ticket className="h-3.5 w-3.5 text-muted-foreground" />
                  </CardHeader>
                  <CardContent className="pb-3">
                    <div className="text-xl font-bold">{statsRequerimentos?.totalTickets || 0}</div>
                    <p className="text-[10px] text-muted-foreground">
                      Tickets consumidos
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Cards de Destaque - Empresas */}
              {statsEmpresas && (statsEmpresas.empresaMaisFatura || statsEmpresas.empresaMaisBancoHoras) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Empresa que mais fatura */}
                  {statsEmpresas.empresaMaisFatura && (
                    <Card className="border-2 border-orange-500 dark:border-orange-600">
                      <CardHeader className="pb-2 pt-3">
                        <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                          <Award className="h-4 w-4 text-orange-500" />
                          Empresa que Mais Fatura
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pb-3">
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-1.5">
                            <Building2 className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                            <span className="font-bold text-sm truncate">{statsEmpresas.empresaMaisFatura.nome}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">Valor Total:</span>
                            <span className="text-base font-bold text-orange-600 dark:text-orange-500">
                              {new Intl.NumberFormat('pt-BR', {
                                style: 'currency',
                                currency: 'BRL'
                              }).format(statsEmpresas.empresaMaisFatura.valor)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">Requerimentos:</span>
                            <span className="font-semibold">{statsEmpresas.empresaMaisFatura.count}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Empresa que mais usa banco de horas */}
                  {statsEmpresas.empresaMaisBancoHoras && (
                    <Card className="border-2 border-blue-500 dark:border-blue-600">
                      <CardHeader className="pb-2 pt-3">
                        <CardTitle className="text-sm font-semibold flex items-center gap-1.5">
                          <Clock className="h-4 w-4 text-blue-500" />
                          Empresa que Mais Usa Banco de Horas
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="pb-3">
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-1.5">
                            <Building2 className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                            <span className="font-bold text-sm truncate">{statsEmpresas.empresaMaisBancoHoras.nome}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-xs text-muted-foreground">Total de Horas:</span>
                            <span className="text-base font-bold text-blue-600 dark:text-blue-500">
                              {converterMinutosParaHoras(statsEmpresas.empresaMaisBancoHoras.horas)}
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-muted-foreground">Requerimentos:</span>
                            <span className="font-semibold">{statsEmpresas.empresaMaisBancoHoras.count}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}

              {/* Mensagem quando não há dados */}
              {(!statsRequerimentos || statsRequerimentos.total === 0) && (
                <Card>
                  <CardContent className="p-8">
                    <div className="text-center">
                      <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                        Nenhum requerimento encontrado
                      </h3>
                      <p className="text-gray-600 dark:text-gray-400 mb-4">
                        Não há requerimentos para o ano selecionado: <strong>{anoSelecionado}</strong>
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Grid de 2 colunas para gráficos */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Gráfico de Pizza - Distribuição por Tipo de Cobrança */}
                {statsRequerimentos && statsRequerimentos.porTipoCobranca && statsRequerimentos.porTipoCobranca.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <PieChart className="h-5 w-5 text-blue-600" />
                        Distribuição por Tipo de Cobrança
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {statsRequerimentos.porTipoCobranca.length > 0 ? (
                        <ResponsiveContainer width="100%" height={350}>
                          <RechartsPieChart>
                            <Pie
                              data={statsRequerimentos.porTipoCobranca.map(item => ({
                                name: item.tipo,
                                value: item.count,
                                porcentagem: item.porcentagem
                              }))}
                              cx="50%"
                              cy="50%"
                              labelLine={false}
                              label={({ name, porcentagem }) => `${name}: ${porcentagem.toFixed(1)}%`}
                              outerRadius={100}
                              fill="#8884d8"
                              dataKey="value"
                            >
                              {statsRequerimentos.porTipoCobranca.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={getHexColor(entry.tipo)} />
                              ))}
                            </Pie>
                            <Tooltip 
                              formatter={(value: number, name: string, props: any) => [
                                `${value} requerimentos (${props.payload.porcentagem.toFixed(1)}%)`,
                                name
                              ]}
                            />
                            <Legend />
                          </RechartsPieChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="flex items-center justify-center h-[350px] text-gray-500">
                          Sem dados para exibir
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Gráfico de Barras - Horas por Tipo de Cobrança */}
                <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-blue-600" />
                    Horas por Tipo de Cobrança
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart
                      data={statsRequerimentos?.porTipoCobranca.map(item => ({
                        tipo: item.tipo,
                        horas: converterMinutosParaHorasDecimal(item.horas),
                        valor: item.valor,
                        tickets: item.tickets
                      }))}
                      margin={{ top: 20, right: 30, left: 60, bottom: 60 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="tipo" 
                        angle={-45}
                        textAnchor="end"
                        height={100}
                      />
                      <YAxis width={50} />
                      <Tooltip 
                        formatter={(value: number, name: string) => {
                          if (name === 'horas') return [`${value.toFixed(2)}h`, 'Horas'];
                          if (name === 'valor') return [new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value), 'Valor'];
                          if (name === 'tickets') return [`${value} tickets`, 'Tickets'];
                          return [value, name];
                        }}
                      />
                      <Legend />
                      <Bar dataKey="horas" fill="#2563eb" name="Horas" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

                {/* Gráfico de Barras - Valor Faturado por Tipo */}
                <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="h-5 w-5 text-blue-600" />
                    Valor Faturado por Tipo de Cobrança
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart
                      data={statsRequerimentos?.porTipoCobranca
                        .filter(item => item.valor > 0)
                        .map(item => ({
                          tipo: item.tipo,
                          valor: item.valor
                        }))}
                      margin={{ top: 20, right: 30, left: 80, bottom: 60 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis 
                        dataKey="tipo" 
                        angle={-45}
                        textAnchor="end"
                        height={100}
                      />
                      <YAxis 
                        width={70}
                        tickFormatter={(value) => `R$ ${value.toLocaleString('pt-BR')}`}
                      />
                      <Tooltip 
                        formatter={(value: number) => [
                          new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value),
                          'Valor'
                        ]}
                      />
                      <Legend />
                      <Bar dataKey="valor" fill="#2563eb" name="Valor Faturado" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              </div>

              {/* Grid de 2 colunas - Top 10 Empresas */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Gráfico de Barras - Top 10 Empresas por Faturamento */}
                {statsEmpresas && Object.keys(statsEmpresas.porEmpresa).length > 0 && (
                  <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Award className="h-5 w-5 text-orange-600" />
                      Top 10 Empresas por Faturamento
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={400}>
                      <BarChart
                        data={Object.entries(statsEmpresas.porEmpresa)
                          .filter(([_, data]) => data.valor > 0)
                          .sort((a, b) => b[1].valor - a[1].valor)
                          .slice(0, 10)
                          .map(([empresa, data]) => ({
                            empresa: empresa.length > 20 ? empresa.substring(0, 20) + '...' : empresa,
                            valor: data.valor,
                            requerimentos: data.count
                          }))}
                        layout="vertical"
                        margin={{ top: 5, right: 30, left: 150, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          type="number" 
                          tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
                        />
                        <YAxis dataKey="empresa" type="category" width={140} />
                        <Tooltip 
                          formatter={(value: number, name: string) => {
                            if (name === 'valor') return [
                              new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value),
                              'Valor Faturado'
                            ];
                            return [value, 'Requerimentos'];
                          }}
                        />
                        <Legend />
                        <Bar dataKey="valor" fill="#ea580c" name="Valor Faturado" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

                {/* Gráfico de Barras - Top 10 Empresas por Banco de Horas */}
                {statsEmpresas && Object.keys(statsEmpresas.porEmpresa).length > 0 && (
                  <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="h-5 w-5 text-blue-600" />
                      Top 10 Empresas por Banco de Horas
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={400}>
                      <BarChart
                        data={Object.entries(statsEmpresas.porEmpresa)
                          .filter(([_, data]) => data.horasBancoHoras > 0)
                          .sort((a, b) => b[1].horasBancoHoras - a[1].horasBancoHoras)
                          .slice(0, 10)
                          .map(([empresa, data]) => ({
                            empresa: empresa.length > 20 ? empresa.substring(0, 20) + '...' : empresa,
                            horas: converterMinutosParaHorasDecimal(data.horasBancoHoras),
                            requerimentos: data.bancoHoras
                          }))}
                        layout="vertical"
                        margin={{ top: 5, right: 30, left: 150, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis type="number" />
                        <YAxis dataKey="empresa" type="category" width={140} />
                        <Tooltip 
                          formatter={(value: number, name: string) => {
                            if (name === 'horas') return [`${value.toFixed(2)}h`, 'Horas'];
                            return [value, 'Requerimentos'];
                          }}
                        />
                        <Legend />
                        <Bar dataKey="horas" fill="#2563eb" name="Horas" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
                )}
              </div>

              {/* Gráfico de Barras - Por Módulo (largura completa) */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5 text-blue-600" />
                    Requerimentos por Módulo
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={350}>
                    <BarChart
                      data={Object.entries(statsRequerimentos?.porModulo || {})
                        .sort((a, b) => b[1].count - a[1].count)
                        .map(([modulo, data]) => ({
                          modulo,
                          quantidade: data.count,
                          horas: converterMinutosParaHorasDecimal(data.horas)
                        }))}
                      layout="vertical"
                      margin={{ top: 5, right: 30, left: 120, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="modulo" type="category" width={110} />
                      <Tooltip 
                        formatter={(value: number, name: string) => {
                          if (name === 'horas') return [`${value.toFixed(2)}h`, 'Horas'];
                          return [value, name === 'quantidade' ? 'Requerimentos' : name];
                        }}
                      />
                      <Legend />
                      <Bar dataKey="quantidade" fill="#2563eb" name="Requerimentos" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Gráficos de Evolução Mensal */}
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mt-8 mb-4">
                Evolução Mensal
              </h3>

              {/* Grid de 2 colunas - Evolução Mensal */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Gráfico de Linha - Evolução de Requerimentos */}
                {statsRequerimentos && statsRequerimentos.porMes && statsRequerimentos.porMes.length > 0 ? (
                  <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5 text-blue-600" />
                      Requerimentos por Mês
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={350}>
                      <LineChart data={statsRequerimentos.porMes}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="mesNome" />
                        <YAxis />
                        <Tooltip 
                          formatter={(value: number) => [`${value} requerimentos`, 'Quantidade']}
                        />
                        <Legend />
                        <Line 
                          type="monotone" 
                          dataKey="count" 
                          stroke="#2563eb" 
                          strokeWidth={3}
                          name="Requerimentos"
                          dot={{ fill: '#2563eb', r: 5 }}
                          activeDot={{ r: 7 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              ) : null}

                {/* Gráfico de Área - Evolução de Horas */}
                {statsRequerimentos && statsRequerimentos.porMes && statsRequerimentos.porMes.length > 0 ? (
                  <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="h-5 w-5 text-blue-600" />
                      Horas Trabalhadas por Mês
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={350}>
                      <AreaChart data={statsRequerimentos.porMes}>
                        <defs>
                          <linearGradient id="colorHoras" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#2563eb" stopOpacity={0.8}/>
                            <stop offset="95%" stopColor="#2563eb" stopOpacity={0.1}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="mesNome" />
                        <YAxis />
                        <Tooltip 
                          formatter={(value: number) => [`${converterMinutosParaHorasDecimal(value).toFixed(2)}h`, 'Horas']}
                        />
                        <Legend />
                        <Area 
                          type="monotone" 
                          dataKey="horas" 
                          stroke="#2563eb" 
                          strokeWidth={2}
                          fillOpacity={1} 
                          fill="url(#colorHoras)" 
                          name="Horas"
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              ) : null}

                {/* Gráfico de Barras - Valor Faturado por Mês */}
                {statsRequerimentos && statsRequerimentos.porMes && statsRequerimentos.porMes.filter(m => m.valor > 0).length > 0 ? (
                  <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <DollarSign className="h-5 w-5 text-blue-600" />
                      Valor Faturado por Mês
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={350}>
                      <BarChart data={statsRequerimentos.porMes.filter(m => m.valor > 0)}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="mesNome" />
                        <YAxis 
                          tickFormatter={(value) => `R$ ${value.toLocaleString('pt-BR')}`}
                        />
                        <Tooltip 
                          formatter={(value: number) => [
                            new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value),
                            'Valor'
                          ]}
                        />
                        <Legend />
                        <Bar dataKey="valor" fill="#2563eb" name="Valor Faturado" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              ) : null}

                {/* Gráfico de Linha - Tickets por Mês */}
                {statsRequerimentos && statsRequerimentos.porMes && statsRequerimentos.porMes.filter(m => m.tickets > 0).length > 0 ? (
                  <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Ticket className="h-5 w-5 text-blue-600" />
                      Tickets Consumidos por Mês
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={350}>
                      <LineChart data={statsRequerimentos.porMes.filter(m => m.tickets > 0)}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="mesNome" />
                        <YAxis />
                        <Tooltip 
                          formatter={(value: number) => [`${value} tickets`, 'Tickets']}
                        />
                        <Legend />
                        <Line 
                          type="monotone" 
                          dataKey="tickets" 
                          stroke="#2563eb" 
                          strokeWidth={3}
                          name="Tickets"
                          dot={{ fill: '#2563eb', r: 5 }}
                          activeDot={{ r: 7 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
                ) : null}
              </div>

              {/* Grid de 2 colunas - Gráficos Empilhados por Tipo */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Gráfico de Área Empilhada - Horas por Tipo de Cobrança por Mês */}
                {statsRequerimentos && statsRequerimentos.porMesTipo && statsRequerimentos.porMesTipo.length > 0 && (
                  <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="h-5 w-5 text-blue-600" />
                      Horas por Tipo de Cobrança - Evolução Mensal
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={400}>
                      <AreaChart data={statsRequerimentos.porMesTipo} margin={{ top: 20, right: 30, left: 60, bottom: 20 }}>
                        <defs>
                          {statsRequerimentos.porTipoCobranca.map((item, index) => (
                            <linearGradient key={item.tipo} id={`color${item.tipo.replace(/\s/g, '')}`} x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor={getHexColor(item.tipo)} stopOpacity={0.8}/>
                              <stop offset="95%" stopColor={getHexColor(item.tipo)} stopOpacity={0.3}/>
                            </linearGradient>
                          ))}
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="mesNome" />
                        <YAxis width={50} />
                        <Tooltip 
                          formatter={(value: number, name: string) => [`${value.toFixed(2)}h`, name]}
                        />
                        <Legend />
                        {statsRequerimentos.porTipoCobranca.map((item) => (
                          <Area
                            key={item.tipo}
                            type="monotone"
                            dataKey={`${item.tipo}_horas`}
                            stackId="1"
                            stroke={getHexColor(item.tipo)}
                            fill={`url(#color${item.tipo.replace(/\s/g, '')})`}
                            name={item.tipo}
                          />
                        ))}
                      </AreaChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

                {/* Gráfico de Barras Empilhadas - Valor Faturado por Tipo de Cobrança por Mês */}
                {statsRequerimentos && statsRequerimentos.porMesTipo && statsRequerimentos.porMesTipo.length > 0 && (
                  <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <DollarSign className="h-5 w-5 text-blue-600" />
                      Valor Faturado por Tipo de Cobrança - Evolução Mensal
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={400}>
                      <BarChart data={statsRequerimentos.porMesTipo} margin={{ top: 20, right: 30, left: 70, bottom: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="mesNome" />
                        <YAxis 
                          width={60}
                          tickFormatter={(value) => `R$ ${(value / 1000).toFixed(0)}k`}
                        />
                        <Tooltip 
                          formatter={(value: number, name: string) => [
                            new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value),
                            name
                          ]}
                        />
                        <Legend />
                        {statsRequerimentos.porTipoCobranca
                          .filter(item => item.valor > 0)
                          .map((item) => (
                            <Bar
                              key={item.tipo}
                              dataKey={`${item.tipo}_valor`}
                              stackId="a"
                              fill={getHexColor(item.tipo)}
                              name={item.tipo}
                            />
                          ))}
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
};

export default Dashboard;
