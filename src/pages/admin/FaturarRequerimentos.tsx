import { useState, useMemo, useEffect } from 'react';
import {
  Send,
  Mail,
  FileText,
  Calendar,
  Clock,
  TrendingUp,
  Filter,
  RefreshCw,
  Plus,
  X,
  AlertTriangle,
  Calculator,
  ChevronLeft,
  ChevronRight,
  Check,
  CheckSquare,
  Square,
  Search,
  Eye
} from 'lucide-react';
import AdminLayout from '@/components/admin/LayoutAdmin';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MultiSelect, Option } from '@/components/ui/multi-select';
import { MonthYearPicker } from '@/components/ui/month-year-picker';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
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

import ProtectedAction from '@/components/auth/ProtectedAction';
import { FaturamentoExportButtons } from '@/components/admin/requerimentos';
import { RequerimentoViewModal } from '@/components/admin/requerimentos';
import { ClienteNomeDisplay } from '@/components/admin/requerimentos/ClienteNomeDisplay';
import { toast } from 'sonner';

import { 
  useRequerimentosFaturamento, 
  useRejeitarRequerimento, 
  useMarcarComoFaturados,
  useRequerimentosFaturados 
} from '@/hooks/useRequerimentos';
import { faturamentoService } from '@/services/faturamentoService';
import { getBadgeClasses, getCobrancaIcon, getCobrancaColors } from '@/utils/requerimentosColors';

import {
  Requerimento,
  TipoCobrancaType,
  ModuloType,
  EmailFaturamento,
  TIPO_COBRANCA_OPTIONS,
  MODULO_OPTIONS,
  requerValorHora
} from '@/types/requerimentos';

import { formatarHorasParaExibicao, somarHoras } from '@/utils/horasUtils';

// Interface para dados agrupados por tipo de cobrança
interface RequerimentosAgrupados {
  [key: string]: {
    tipo: TipoCobrancaType;
    requerimentos: Requerimento[];
    totalHoras: string; // Mudado para string (formato HH:MM)
    totalValor: number; // Total em valor monetário
    quantidade: number;
  };
}

// Interface para estatísticas do período
interface EstatisticasPeriodo {
  totalRequerimentos: number;
  totalHoras: string; // Mudado para string (formato HH:MM)
  tiposAtivos: number;
  valorEstimado?: number;
  valorTotalFaturavel: number; // Soma dos tipos com valor monetário
}

export default function FaturarRequerimentos() {
  // Estados
  const hoje = new Date();
  const [mesAtual] = useState(hoje.getMonth() + 1);
  const [anoAtual] = useState(hoje.getFullYear());
  const [mesSelecionado, setMesSelecionado] = useState(mesAtual);
  const [anoSelecionado, setAnoSelecionado] = useState(anoAtual);

  const [modalEmailAberto, setModalEmailAberto] = useState(false);
  const [confirmacaoAberta, setConfirmacaoAberta] = useState(false);

  const [destinatarios, setDestinatarios] = useState<string[]>([]);
  const [destinatariosCC, setDestinatariosCC] = useState<string[]>([]);
  const [destinatariosTexto, setDestinatariosTexto] = useState('');
  const [destinatariosCCTexto, setDestinatariosCCTexto] = useState('');
  const [destinatariosBCCTexto, setDestinatariosBCCTexto] = useState('');
  const [destinatariosBCC, setDestinatariosBCC] = useState<string[]>([]);
  const [assuntoEmail, setAssuntoEmail] = useState('');
  const [corpoEmail, setCorpoEmail] = useState('');
  const [enviandoEmail, setEnviandoEmail] = useState(false);
  const [anexos, setAnexos] = useState<File[]>([]);

  const [filtroTipo, setFiltroTipo] = useState<TipoCobrancaType[]>([]);
  const [filtroModulo, setFiltroModulo] = useState<ModuloType[]>([]);
  const [filtrosExpandidos, setFiltrosExpandidos] = useState(false);

  // Estados para filtros no estilo da tela Lançar Requerimentos
  const [busca, setBusca] = useState('');
  const [filtroModuloSelect, setFiltroModuloSelect] = useState<ModuloType[]>([]);
  const [filtroTipoSelect, setFiltroTipoSelect] = useState<TipoCobrancaType[]>([]);
  const [filtroPeriodo, setFiltroPeriodo] = useState<string>('all');

  // Estados para rejeição
  const [requerimentoParaRejeitar, setRequerimentoParaRejeitar] = useState<Requerimento | null>(null);
  const [confirmacaoRejeicaoAberta, setConfirmacaoRejeicaoAberta] = useState(false);

  // Estados para visualização de detalhes
  const [modalVisualizacaoAberto, setModalVisualizacaoAberto] = useState(false);
  const [requerimentoParaVisualizar, setRequerimentoParaVisualizar] = useState<Requerimento | null>(null);

  // Estados para controle de abas e seleção
  const [abaAtiva, setAbaAtiva] = useState<'para_faturar' | 'faturados'>('para_faturar');
  const [requerimentosSelecionados, setRequerimentosSelecionados] = useState<string[]>([]);
  
  // Estados para filtros da aba de histórico
  const [filtroTipoHistorico, setFiltroTipoHistorico] = useState<TipoCobrancaType[]>([]);
  const [filtroModuloHistorico, setFiltroModuloHistorico] = useState<ModuloType[]>([]);

  // Função para limpar filtros (igual à LancarRequerimentos)
  const limparFiltros = () => {
    setBusca('');
    setFiltroTipoSelect([]);
    setFiltroModuloSelect([]);
    
    // Voltar para o mês vigente e aplicar filtro
    const hoje = new Date();
    const mesVigente = hoje.getMonth() + 1;
    const anoVigente = hoje.getFullYear();
    
    setMesSelecionado(mesVigente);
    setAnoSelecionado(anoVigente);
    setFiltroPeriodo(`${String(mesVigente).padStart(2, '0')}/${anoVigente}`);
  };

  // Hooks
  const {
    data: dadosFaturamento,
    isLoading,
    error,
    refetch
  } = useRequerimentosFaturamento(mesSelecionado, anoSelecionado);

  const rejeitarRequerimento = useRejeitarRequerimento();
  const marcarComoFaturados = useMarcarComoFaturados();
  
  // Hook para buscar requerimentos faturados
  const {
    data: dadosFaturados,
    isLoading: isLoadingFaturados,
    error: errorFaturados
  } = useRequerimentosFaturados(`${mesSelecionado.toString().padStart(2, '0')}/${anoSelecionado}`);
  
  // Filtrar requerimentos faturados
  const dadosFaturadosFiltrados = useMemo(() => {
    if (!dadosFaturados) return [];
    
    let filtrados = [...dadosFaturados];
    
    // Aplicar filtros dos novos campos (estilo Lançar Requerimentos)
    if (busca.trim() !== '' || filtroTipoSelect.length > 0 || filtroModuloSelect.length > 0 || filtroPeriodo !== 'all') {
      filtrados = filtrados.filter(req => {
        // Filtro de busca (chamado, cliente, descrição)
        if (busca.trim() !== '') {
          const buscaLower = busca.toLowerCase();
          const matchBusca =
            req.chamado.toLowerCase().includes(buscaLower) ||
            req.cliente_nome?.toLowerCase().includes(buscaLower) ||
            req.descricao.toLowerCase().includes(buscaLower);
          if (!matchBusca) return false;
        }

        // Filtro por tipo de cobrança
        if (filtroTipoSelect.length > 0) {
          if (!filtroTipoSelect.includes(req.tipo_cobranca)) return false;
        }

        // Filtro por módulo
        if (filtroModuloSelect.length > 0) {
          if (!filtroModuloSelect.includes(req.modulo)) return false;
        }

        // Filtro por período de cobrança
        if (filtroPeriodo !== 'all') {
          if (req.mes_cobranca !== filtroPeriodo) return false;
        }

        return true;
      });
    } else {
      // Aplicar filtros antigos se os novos não estão sendo usados
      // Filtrar por tipo de cobrança
      if (filtroTipoHistorico.length > 0) {
        filtrados = filtrados.filter(req => filtroTipoHistorico.includes(req.tipo_cobranca));
      }
      
      // Filtrar por módulo
      if (filtroModuloHistorico.length > 0) {
        filtrados = filtrados.filter(req => filtroModuloHistorico.includes(req.modulo));
      }
    }
    
    return filtrados;
  }, [dadosFaturados, filtroTipoHistorico, filtroModuloHistorico, busca, filtroTipoSelect, filtroModuloSelect, filtroPeriodo]);

  // Dados processados
  const requerimentosAgrupados = useMemo((): RequerimentosAgrupados => {
    if (!dadosFaturamento?.requerimentos) return {};

    const grupos: RequerimentosAgrupados = {};

    dadosFaturamento.requerimentos.forEach(req => {
      const tipo = req.tipo_cobranca;

      if (!grupos[tipo]) {
        grupos[tipo] = {
          tipo,
          requerimentos: [],
          totalHoras: '0:00',
          totalValor: 0,
          quantidade: 0
        };
      }

      grupos[tipo].requerimentos.push(req);
      if (req.horas_total) {
        grupos[tipo].totalHoras = somarHoras(grupos[tipo].totalHoras, req.horas_total.toString());
      }
      if (req.valor_total_geral) {
        grupos[tipo].totalValor += req.valor_total_geral;
      }
      grupos[tipo].quantidade += 1;
    });

    return grupos;
  }, [dadosFaturamento]);

  const estatisticasPeriodo = useMemo((): EstatisticasPeriodo => {
    if (!dadosFaturamento?.requerimentos) {
      return {
        totalRequerimentos: 0,
        totalHoras: '0:00',
        tiposAtivos: 0,
        valorTotalFaturavel: 0
      };
    }

    // Somar horas corretamente usando somarHoras
    let totalHorasString = '0:00';
    let valorTotalFaturavel = 0;

    // Tipos de cobrança que têm valor monetário
    const tiposComValor = ['Faturado', 'Hora Extra', 'Sobreaviso', 'Bolsão Enel'];

    dadosFaturamento.requerimentos.forEach(req => {
      if (req.horas_total) {
        totalHorasString = somarHoras(totalHorasString, req.horas_total.toString());
      }

      // Somar valores dos tipos de cobrança monetários
      if (tiposComValor.includes(req.tipo_cobranca) && req.valor_total_geral) {
        valorTotalFaturavel += req.valor_total_geral;
      }
    });

    return {
      totalRequerimentos: dadosFaturamento.requerimentos.length,
      totalHoras: totalHorasString,
      tiposAtivos: Object.keys(requerimentosAgrupados).length,
      valorTotalFaturavel
    };
  }, [dadosFaturamento, requerimentosAgrupados]);

  // Calcular horas de banco de horas baseado na seleção
  const horasBancoDeHoras = useMemo((): string => {
    if (!dadosFaturamento?.requerimentos) return '0:00';

    // Se nenhum ou todos estão selecionados, mostrar total
    const todosRequerimentos = dadosFaturamento.requerimentos;
    const requerimentosBancoHoras = todosRequerimentos.filter(req => req.tipo_cobranca === 'Banco de Horas');
    
    if (requerimentosSelecionados.length === 0 || requerimentosSelecionados.length === todosRequerimentos.length) {
      // Mostrar total de todos os banco de horas
      let totalHoras = '0:00';
      requerimentosBancoHoras.forEach(req => {
        if (req.horas_total) {
          totalHoras = somarHoras(totalHoras, req.horas_total.toString());
        }
      });
      return totalHoras;
    }

    // Calcular apenas dos selecionados que são banco de horas
    let horasSelecionadas = '0:00';
    requerimentosBancoHoras
      .filter(req => requerimentosSelecionados.includes(req.id))
      .forEach(req => {
        if (req.horas_total) {
          horasSelecionadas = somarHoras(horasSelecionadas, req.horas_total.toString());
        }
      });
    
    return horasSelecionadas;
  }, [dadosFaturamento, requerimentosSelecionados]);

  // Calcular valor faturável baseado na seleção
  const valorFaturavel = useMemo((): number => {
    if (!dadosFaturamento?.requerimentos) return 0;

    const todosRequerimentos = dadosFaturamento.requerimentos;
    const tiposComValor = ['Faturado', 'Hora Extra', 'Sobreaviso', 'Bolsão Enel'];
    
    // Se nenhum ou todos estão selecionados, mostrar total
    if (requerimentosSelecionados.length === 0 || requerimentosSelecionados.length === todosRequerimentos.length) {
      // Calcular total de todos os requerimentos com valor
      return todosRequerimentos
        .filter(req => tiposComValor.includes(req.tipo_cobranca))
        .reduce((acc, req) => acc + (req.valor_total_geral || 0), 0);
    }

    // Calcular apenas dos selecionados que têm valor monetário
    return todosRequerimentos
      .filter(req => requerimentosSelecionados.includes(req.id) && tiposComValor.includes(req.tipo_cobranca))
      .reduce((acc, req) => acc + (req.valor_total_geral || 0), 0);
  }, [dadosFaturamento, requerimentosSelecionados]);

  // Calcular estatísticas da aba Histórico baseadas na seleção
  const estatisticasHistorico = useMemo(() => {
    if (!dadosFaturados) {
      return {
        total: 0,
        totalHoras: '0:00',
        horasBancoDeHoras: '0:00',
        horasReprovadas: '0:00',
        totalReprovados: 0,
        valorFaturavel: 0
      };
    }

    const todosRequerimentos = dadosFaturados;
    const tiposComValor = ['Faturado', 'Hora Extra', 'Sobreaviso', 'Bolsão Enel'];
    
    // Se nenhum ou todos selecionados, calcular total
    if (requerimentosSelecionados.length === 0 || requerimentosSelecionados.length === todosRequerimentos.length) {
      const requerimentosSemReprovados = todosRequerimentos.filter(req => req.tipo_cobranca !== 'Reprovado');
      const requerimentosReprovados = todosRequerimentos.filter(req => req.tipo_cobranca === 'Reprovado');
      const requerimentosBancoHoras = todosRequerimentos.filter(req => req.tipo_cobranca === 'Banco de Horas');
      
      let totalHoras = '0:00';
      requerimentosSemReprovados.forEach(req => {
        const horas = req.horas_total || somarHoras(req.horas_funcional?.toString() || '0', req.horas_tecnico?.toString() || '0');
        totalHoras = somarHoras(totalHoras, horas.toString());
      });
      
      let horasReprovadas = '0:00';
      requerimentosReprovados.forEach(req => {
        const horas = req.horas_total || somarHoras(req.horas_funcional?.toString() || '0', req.horas_tecnico?.toString() || '0');
        horasReprovadas = somarHoras(horasReprovadas, horas.toString());
      });

      let horasBancoDeHoras = '0:00';
      requerimentosBancoHoras.forEach(req => {
        const horas = req.horas_total || somarHoras(req.horas_funcional?.toString() || '0', req.horas_tecnico?.toString() || '0');
        horasBancoDeHoras = somarHoras(horasBancoDeHoras, horas.toString());
      });
      
      const totalValor = requerimentosSemReprovados.reduce((acc, req) => {
        if (tiposComValor.includes(req.tipo_cobranca)) {
          return acc + (req.valor_total_geral || 0);
        }
        return acc;
      }, 0);
      
      return {
        total: requerimentosSemReprovados.length,
        totalHoras,
        horasBancoDeHoras,
        horasReprovadas,
        totalReprovados: requerimentosReprovados.length,
        valorFaturavel: totalValor
      };
    }

    // Calcular apenas dos selecionados
    const requerimentosSelecionadosData = todosRequerimentos.filter(req => requerimentosSelecionados.includes(req.id));
    const requerimentosSemReprovados = requerimentosSelecionadosData.filter(req => req.tipo_cobranca !== 'Reprovado');
    const requerimentosReprovados = requerimentosSelecionadosData.filter(req => req.tipo_cobranca === 'Reprovado');
    const requerimentosBancoHoras = requerimentosSelecionadosData.filter(req => req.tipo_cobranca === 'Banco de Horas');
    
    let totalHoras = '0:00';
    requerimentosSemReprovados.forEach(req => {
      const horas = req.horas_total || somarHoras(req.horas_funcional?.toString() || '0', req.horas_tecnico?.toString() || '0');
      totalHoras = somarHoras(totalHoras, horas.toString());
    });
    
    let horasReprovadas = '0:00';
    requerimentosReprovados.forEach(req => {
      const horas = req.horas_total || somarHoras(req.horas_funcional?.toString() || '0', req.horas_tecnico?.toString() || '0');
      horasReprovadas = somarHoras(horasReprovadas, horas.toString());
    });

    let horasBancoDeHoras = '0:00';
    requerimentosBancoHoras.forEach(req => {
      const horas = req.horas_total || somarHoras(req.horas_funcional?.toString() || '0', req.horas_tecnico?.toString() || '0');
      horasBancoDeHoras = somarHoras(horasBancoDeHoras, horas.toString());
    });
    
    const totalValor = requerimentosSemReprovados.reduce((acc, req) => {
      if (tiposComValor.includes(req.tipo_cobranca)) {
        return acc + (req.valor_total_geral || 0);
      }
      return acc;
    }, 0);
    
    return {
      total: requerimentosSemReprovados.length,
      totalHoras,
      horasBancoDeHoras,
      horasReprovadas,
      totalReprovados: requerimentosReprovados.length,
      valorFaturavel: totalValor
    };
  }, [dadosFaturados, requerimentosSelecionados]);

  // Calcular estatísticas filtradas baseadas nos filtros aplicados
  const estatisticasPeriodoFiltradas = useMemo((): EstatisticasPeriodo => {
    // Função auxiliar para verificar se há filtros ativos
    const temFiltroAtivo = () => {
      return busca.trim() !== '' || 
             filtroTipoSelect.length > 0 || 
             filtroModuloSelect.length > 0 || 
             filtroPeriodo !== 'all';
    };

    // Se não há filtros ativos, retorna as estatísticas normais
    if (!temFiltroAtivo()) {
      return estatisticasPeriodo;
    }

    // Calcular estatísticas dos dados filtrados
    const requerimentosFiltrados = dadosFaturamento?.requerimentos?.filter(req => {
      // Debug: Log do requerimento sendo processado
      console.log('🔍 Processando requerimento:', {
        chamado: req.chamado,
        modulo: req.modulo,
        tipo_cobranca: req.tipo_cobranca,
        valor_total_geral: req.valor_total_geral,
        horas_total: req.horas_total
      });

      // Filtro de busca (chamado, cliente, descrição)
      if (busca.trim() !== '') {
        const buscaLower = busca.toLowerCase();
        const matchBusca =
          req.chamado.toLowerCase().includes(buscaLower) ||
          req.cliente_nome?.toLowerCase().includes(buscaLower) ||
          req.descricao.toLowerCase().includes(buscaLower);
        if (!matchBusca) {
          console.log('❌ Rejeitado por busca:', req.chamado);
          return false;
        }
      }

      // Filtro por tipo de cobrança
      if (filtroTipoSelect.length > 0) {
        if (!filtroTipoSelect.includes(req.tipo_cobranca)) {
          console.log('❌ Rejeitado por tipo de cobrança:', req.chamado, req.tipo_cobranca);
          return false;
        }
      }

      // Filtro por módulo (com suporte a case-insensitive)
      if (filtroModuloSelect.length > 0) {
        console.log('🔍 Verificando módulo:', {
          requerimento: req.chamado,
          moduloReq: req.modulo,
          filtroModuloSelect,
          includes: filtroModuloSelect.includes(req.modulo),
          includesLowerCase: filtroModuloSelect.some(mod => mod.toLowerCase() === req.modulo?.toLowerCase())
        });
        
        // Verificar tanto case-sensitive quanto case-insensitive
        const moduloMatch = filtroModuloSelect.includes(req.modulo) || 
                           filtroModuloSelect.some(mod => mod.toLowerCase() === req.modulo?.toLowerCase());
        
        if (!moduloMatch) {
          console.log('❌ Rejeitado por módulo:', req.chamado, req.modulo);
          return false;
        }
      }

      // Filtro por período de cobrança
      if (filtroPeriodo !== 'all') {
        if (req.mes_cobranca !== filtroPeriodo) {
          console.log('❌ Rejeitado por período:', req.chamado, req.mes_cobranca);
          return false;
        }
      }

      console.log('✅ Requerimento aceito:', req.chamado);
      return true;
    }) || [];

    console.log('📊 Resultado da filtragem:', {
      totalOriginal: dadosFaturamento?.requerimentos?.length || 0,
      totalFiltrado: requerimentosFiltrados.length,
      filtros: {
        busca: busca.trim(),
        filtroTipoSelect,
        filtroModuloSelect,
        filtroPeriodo
      }
    });

    // Calcular estatísticas dos requerimentos filtrados
    let totalHorasString = '0:00';
    let valorTotalFaturavel = 0;
    const tiposComValor = ['Faturado', 'Hora Extra', 'Sobreaviso', 'Bolsão Enel'];
    const tiposUnicos = new Set<string>();

    requerimentosFiltrados.forEach(req => {
      if (req.horas_total) {
        totalHorasString = somarHoras(totalHorasString, req.horas_total.toString());
      }

      // Somar valores dos tipos de cobrança monetários
      if (tiposComValor.includes(req.tipo_cobranca) && req.valor_total_geral) {
        valorTotalFaturavel += req.valor_total_geral;
      }

      // Contar tipos únicos
      tiposUnicos.add(req.tipo_cobranca);
    });

    return {
      totalRequerimentos: requerimentosFiltrados.length,
      totalHoras: totalHorasString,
      tiposAtivos: tiposUnicos.size,
      valorTotalFaturavel
    };
  }, [estatisticasPeriodo, dadosFaturamento, busca, filtroTipoSelect, filtroModuloSelect, filtroPeriodo]);

  // Função auxiliar para verificar se há filtros ativos (para uso nos componentes)
  const temFiltrosAtivos = busca.trim() !== '' || 
                          filtroTipoSelect.length > 0 || 
                          filtroModuloSelect.length > 0 || 
                          filtroPeriodo !== 'all';

  const gruposFiltrados = useMemo(() => {
    let grupos = Object.values(requerimentosAgrupados);

    // Aplicar filtros dos novos campos (estilo Lançar Requerimentos)
    if (busca.trim() !== '' || filtroTipoSelect.length > 0 || filtroModuloSelect.length > 0 || filtroPeriodo !== 'all') {
      grupos = grupos.map(grupo => ({
        ...grupo,
        requerimentos: grupo.requerimentos.filter(req => {
          // Filtro de busca (chamado, cliente, descrição)
          if (busca.trim() !== '') {
            const buscaLower = busca.toLowerCase();
            const matchBusca =
              req.chamado.toLowerCase().includes(buscaLower) ||
              req.cliente_nome?.toLowerCase().includes(buscaLower) ||
              req.descricao.toLowerCase().includes(buscaLower);
            if (!matchBusca) return false;
          }

          // Filtro por tipo de cobrança
          if (filtroTipoSelect.length > 0) {
            if (!filtroTipoSelect.includes(req.tipo_cobranca)) return false;
          }

          // Filtro por módulo
          if (filtroModuloSelect.length > 0) {
            if (!filtroModuloSelect.includes(req.modulo)) return false;
          }

          // Filtro por período de cobrança
          if (filtroPeriodo !== 'all') {
            if (req.mes_cobranca !== filtroPeriodo) return false;
          }

          return true;
        }),
        quantidade: 0 // Será recalculado abaixo
      })).filter(grupo => grupo.requerimentos.length > 0);

      // Recalcular totais para grupos filtrados
      grupos = grupos.map(grupo => {
        let totalHoras = '0:00';
        let totalValor = 0;

        grupo.requerimentos.forEach(req => {
          if (req.horas_total) {
            totalHoras = somarHoras(totalHoras, req.horas_total.toString());
          }
          if (req.valor_total_geral) {
            totalValor += req.valor_total_geral;
          }
        });

        return {
          ...grupo,
          totalHoras,
          totalValor,
          quantidade: grupo.requerimentos.length
        };
      });
    } else {
      // Aplicar filtros antigos se os novos não estão sendo usados
      // Filtrar por tipo de cobrança
      if (filtroTipo.length > 0) {
        grupos = grupos.filter(grupo => filtroTipo.includes(grupo.tipo));
      }

      // Filtrar por módulo
      if (filtroModulo.length > 0) {
        grupos = grupos.map(grupo => ({
          ...grupo,
          requerimentos: grupo.requerimentos.filter(req => 
            filtroModulo.includes(req.modulo)
          ),
          quantidade: grupo.requerimentos.filter(req => 
            filtroModulo.includes(req.modulo)
          ).length
        })).filter(grupo => grupo.quantidade > 0);

        // Recalcular totais para grupos filtrados por módulo
        grupos = grupos.map(grupo => {
          let totalHoras = '0:00';
          let totalValor = 0;

          grupo.requerimentos.forEach(req => {
            if (req.horas_total) {
              totalHoras = somarHoras(totalHoras, req.horas_total.toString());
            }
            if (req.valor_total_geral) {
              totalValor += req.valor_total_geral;
            }
          });

          return {
            ...grupo,
            totalHoras,
            totalValor
          };
        });
      }
    }

    // Ordenar grupos: tipos com valor primeiro (em ordem alfabética), depois os outros (em ordem alfabética)
    const tiposComValor = ['Faturado', 'Hora Extra', 'Sobreaviso', 'Bolsão Enel'];
    
    grupos = grupos.sort((a, b) => {
      const aTemValor = tiposComValor.includes(a.tipo);
      const bTemValor = tiposComValor.includes(b.tipo);
      
      // Se ambos têm valor ou ambos não têm, ordenar alfabeticamente
      if (aTemValor === bTemValor) {
        return a.tipo.localeCompare(b.tipo, 'pt-BR');
      }
      
      // Tipos com valor vêm primeiro
      return aTemValor ? -1 : 1;
    });

    return grupos;
  }, [requerimentosAgrupados, filtroTipo, filtroModulo, busca, filtroTipoSelect, filtroModuloSelect, filtroPeriodo]);

  // Funções
  const nomesMeses = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  // Opções para o MultiSelect de tipos de cobrança
  const tipoCobrancaOptions: Option[] = TIPO_COBRANCA_OPTIONS.map(option => ({
    value: option.value,
    label: option.label
  }));

  // Opções para o MultiSelect de módulos
  const moduloOptions: Option[] = MODULO_OPTIONS.map(option => ({
    value: option.value,
    label: option.label
  }));

  const handleAbrirModalEmail = async () => {
    if (requerimentosSelecionados.length === 0) {
      toast.error('Selecione pelo menos um requerimento para faturamento');
      return;
    }

    try {
      // Buscar requerimentos selecionados dependendo da aba ativa
      let requerimentosSelecionadosData: Requerimento[] = [];
      
      if (abaAtiva === 'para_faturar') {
        // Buscar na lista de requerimentos para faturar
        requerimentosSelecionadosData = dadosFaturamento?.requerimentos.filter(req => 
          requerimentosSelecionados.includes(req.id)
        ) || [];
      } else {
        // Buscar na lista de requerimentos já faturados
        requerimentosSelecionadosData = dadosFaturados?.filter(req => 
          requerimentosSelecionados.includes(req.id)
        ) || [];
      }

      if (requerimentosSelecionadosData.length === 0) {
        toast.error('Nenhum requerimento selecionado encontrado');
        return;
      }

      // Gerar relatório HTML apenas com os requerimentos selecionados
      const relatorio = await faturamentoService.gerarRelatorioFaturamentoSelecionados(
        requerimentosSelecionadosData, 
        mesSelecionado, 
        anoSelecionado
      );
      const htmlTemplate = faturamentoService.criarTemplateEmailFaturamento(relatorio);

      // Configurar dados padrão do email
      setAssuntoEmail(`Relatório de Faturamento - ${nomesMeses[mesSelecionado - 1]} ${anoSelecionado}`);
      setCorpoEmail(htmlTemplate);
      setDestinatarios([]);
      setDestinatariosCC([]);
      setDestinatariosBCC([]);
      setDestinatariosTexto(''); // Limpar campo de texto
      setDestinatariosCCTexto(''); // Limpar campo CC
      setDestinatariosBCCTexto(''); // Limpar campo BCC
      setAnexos([]); // Limpar anexos
      setModalEmailAberto(true);
    } catch (error) {
      console.error('Erro ao preparar email:', error);
      toast.error('Erro ao preparar relatório de faturamento');
    }
  };

  const handleAdicionarDestinatario = () => {
    setDestinatarios([...destinatarios, '']);
  };

  const handleRemoverDestinatario = (index: number) => {
    if (destinatarios.length > 1) {
      setDestinatarios(destinatarios.filter((_, i) => i !== index));
    }
  };

  const handleAtualizarDestinatario = (index: number, valor: string) => {
    const novosDestinatarios = [...destinatarios];
    novosDestinatarios[index] = valor;
    setDestinatarios(novosDestinatarios);
  };

  const handleAdicionarDestinatarioCC = () => {
    setDestinatariosCC([...destinatariosCC, '']);
  };

  const handleRemoverDestinatarioCC = (index: number) => {
    if (destinatariosCC.length > 0) {
      setDestinatariosCC(destinatariosCC.filter((_, i) => i !== index));
    }
  };

  const handleAtualizarDestinatarioCC = (index: number, valor: string) => {
    const novosDestinatarios = [...destinatariosCC];
    novosDestinatarios[index] = valor;
    setDestinatariosCC(novosDestinatarios);
  };

  // Função para extrair emails de texto com formato "Nome <email@exemplo.com>"
  const extrairEmails = (texto: string): string[] => {
    // Regex para extrair emails do formato "Nome <email>" ou apenas "email"
    const emailRegex = /<([^>]+)>|([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
    const emails: string[] = [];
    let match;

    while ((match = emailRegex.exec(texto)) !== null) {
      // match[1] é o email dentro de <>, match[2] é o email direto
      const email = (match[1] || match[2]).trim();
      if (email && !emails.includes(email)) {
        emails.push(email);
      }
    }

    return emails;
  };

  // Função para processar múltiplos emails colados
  const handleColarEmails = (texto: string, tipo: 'destinatarios' | 'cc' | 'bcc') => {
    // Separar por ponto e vírgula, vírgula ou quebra de linha
    const partes = texto.split(/[;\n,]+/);
    const emailsExtraidos: string[] = [];

    partes.forEach(parte => {
      const emails = extrairEmails(parte.trim());
      emailsExtraidos.push(...emails);
    });

    // Remover duplicatas e emails vazios
    const emailsUnicos = [...new Set(emailsExtraidos.filter(e => e.length > 0))];

    if (emailsUnicos.length > 0) {
      if (tipo === 'destinatarios') {
        // Obter emails já existentes no campo de texto
        const emailsAtuais = destinatariosTexto
          .split(';')
          .map(e => e.trim())
          .filter(e => e.length > 0);
        
        // Combinar e remover duplicatas
        const todosEmails = [...new Set([...emailsAtuais, ...emailsUnicos])];
        
        // Atualizar campo de texto com emails separados por ponto e vírgula
        setDestinatariosTexto(todosEmails.join('; '));
        
        // Atualizar array para validação
        setDestinatarios(todosEmails);
      } else if (tipo === 'cc') {
        // Obter emails já existentes no campo CC
        const emailsAtuais = destinatariosCCTexto
          .split(';')
          .map(e => e.trim())
          .filter(e => e.length > 0);
        
        // Combinar e remover duplicatas
        const todosEmails = [...new Set([...emailsAtuais, ...emailsUnicos])];
        
        // Atualizar campo de texto com emails separados por ponto e vírgula
        setDestinatariosCCTexto(todosEmails.join('; '));
        
        // Atualizar array para validação
        setDestinatariosCC(todosEmails);
      } else if (tipo === 'bcc') {
        // Obter emails já existentes no campo BCC
        const emailsAtuais = destinatariosBCCTexto
          .split(';')
          .map(e => e.trim())
          .filter(e => e.length > 0);
        
        // Combinar e remover duplicatas
        const todosEmails = [...new Set([...emailsAtuais, ...emailsUnicos])];
        
        // Atualizar campo de texto com emails separados por ponto e vírgula
        setDestinatariosBCCTexto(todosEmails.join('; '));
        
        // Atualizar array para validação
        setDestinatariosBCC(todosEmails);
      }
      toast.success(`${emailsUnicos.length} email(s) adicionado(s) com sucesso!`);
    }
  };

  // Função para atualizar destinatários a partir do campo de texto
  const handleAtualizarDestinatariosTexto = (texto: string) => {
    setDestinatariosTexto(texto);
    
    // Extrair emails do texto
    const emails = texto
      .split(';')
      .map(e => e.trim())
      .filter(e => e.length > 0);
    
    setDestinatarios(emails);
  };

  // Função para atualizar CC a partir do campo de texto
  const handleAtualizarCCTexto = (texto: string) => {
    setDestinatariosCCTexto(texto);
    
    // Extrair emails do texto
    const emails = texto
      .split(';')
      .map(e => e.trim())
      .filter(e => e.length > 0);
    
    setDestinatariosCC(emails);
  };

  // Função para atualizar BCC a partir do campo de texto
  const handleAtualizarBCCTexto = (texto: string) => {
    setDestinatariosBCCTexto(texto);
    
    // Extrair emails do texto
    const emails = texto
      .split(';')
      .map(e => e.trim())
      .filter(e => e.length > 0);
    
    setDestinatariosBCC(emails);
  };

  // Funções para gerenciar anexos
  const handleAdicionarAnexos = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const novosAnexos = Array.from(files);
      
      // Validar tamanho total (limite de 25MB)
      const tamanhoTotal = [...anexos, ...novosAnexos].reduce((acc, file) => acc + file.size, 0);
      const limiteBytes = 25 * 1024 * 1024; // 25MB
      
      if (tamanhoTotal > limiteBytes) {
        toast.error('O tamanho total dos anexos não pode exceder 25MB');
        return;
      }
      
      setAnexos(prev => [...prev, ...novosAnexos]);
      toast.success(`${novosAnexos.length} arquivo(s) adicionado(s)`);
    }
  };

  const handleRemoverAnexo = (index: number) => {
    setAnexos(prev => prev.filter((_, i) => i !== index));
    toast.success('Anexo removido');
  };

  const formatarTamanhoArquivo = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  // Função para fazer upload dos arquivos para Supabase Storage
  const uploadArquivosParaStorage = async (files: File[]): Promise<{
    totalArquivos: number;
    tamanhoTotal: number;
    arquivos: Array<{
      url: string;
      nome: string;
      tipo: string;
      tamanho: number;
      token: string;
    }>;
  }> => {
    const { supabase } = await import('@/integrations/supabase/client');
    const arquivosUpload = [];
    let tamanhoTotal = 0;

    for (const file of files) {
      try {
        // Gerar nome único para o arquivo
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(7);
        const nomeArquivo = `faturamento/${timestamp}_${random}_${file.name}`;

        // Upload para o bucket 'anexos-temporarios' (público)
        const { data, error } = await supabase.storage
          .from('anexos-temporarios')
          .upload(nomeArquivo, file, {
            cacheControl: '3600',
            upsert: false
          });

        if (error) {
          console.error('Erro ao fazer upload do arquivo:', error);
          throw new Error(`Erro ao fazer upload de ${file.name}: ${error.message}`);
        }

        // Obter URL pública do arquivo
        const { data: urlData } = supabase.storage
          .from('anexos-temporarios')
          .getPublicUrl(nomeArquivo);

        // Gerar token de acesso simples
        const token = `${timestamp}_${random}`;

        arquivosUpload.push({
          url: urlData.publicUrl,
          nome: file.name,
          tipo: file.type,
          tamanho: file.size,
          token: token
        });

        tamanhoTotal += file.size;
        
        console.log(`✅ Upload concluído: ${file.name} (${(file.size / 1024).toFixed(2)} KB)`);
      } catch (error) {
        console.error(`❌ Erro ao processar arquivo ${file.name}:`, error);
        throw error;
      }
    }

    return {
      totalArquivos: arquivosUpload.length,
      tamanhoTotal: tamanhoTotal,
      arquivos: arquivosUpload
    };
  };

  // Funções de navegação de mês
  const navegarMesAnterior = () => {
    let novoMes = mesSelecionado - 1;
    let novoAno = anoSelecionado;

    if (novoMes < 1) {
      novoMes = 12;
      novoAno = anoSelecionado - 1;
    }

    // Atualizar estados de navegação e aplicar filtro
    setMesSelecionado(novoMes);
    setAnoSelecionado(novoAno);
    setFiltroPeriodo(`${String(novoMes).padStart(2, '0')}/${novoAno}`);
  };

  const navegarMesProximo = () => {
    let novoMes = mesSelecionado + 1;
    let novoAno = anoSelecionado;

    if (novoMes > 12) {
      novoMes = 1;
      novoAno = anoSelecionado + 1;
    }

    // Atualizar estados de navegação e aplicar filtro
    setMesSelecionado(novoMes);
    setAnoSelecionado(novoAno);
    setFiltroPeriodo(`${String(novoMes).padStart(2, '0')}/${novoAno}`);
  };

  // Função para lidar com mudança do filtro de período (via dropdown)
  const handleFiltroPeriodoChange = (value: string | null) => {
    const novoValor = value || 'all';
    setFiltroPeriodo(novoValor);
    
    // Se não for 'all', atualizar também os estados de navegação
    if (novoValor !== 'all') {
      const [mes, ano] = novoValor.split('/');
      const mesNum = parseInt(mes);
      const anoNum = parseInt(ano);
      
      if (!isNaN(mesNum) && !isNaN(anoNum)) {
        setMesSelecionado(mesNum);
        setAnoSelecionado(anoNum);
      }
    }
  };

  // Validação silenciosa para habilitar/desabilitar botões
  const isFormularioValido = (): boolean => {
    const emailsValidos = destinatarios.filter(email => email.trim() !== '');

    if (emailsValidos.length === 0) {
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const emailsInvalidos = emailsValidos.filter(email => !emailRegex.test(email));

    // Validar CC também
    const emailsCCValidos = destinatariosCC.filter(email => email.trim() !== '');
    const emailsCCInvalidos = emailsCCValidos.filter(email => !emailRegex.test(email));

    // Validar BCC também
    const emailsBCCValidos = destinatariosBCC.filter(email => email.trim() !== '');
    const emailsBCCInvalidos = emailsBCCValidos.filter(email => !emailRegex.test(email));

    if (emailsInvalidos.length > 0 || emailsCCInvalidos.length > 0 || emailsBCCInvalidos.length > 0) {
      return false;
    }

    if (!assuntoEmail.trim()) {
      return false;
    }

    return true;
  };

  // Validação com mensagens de erro para ações do usuário
  const validarFormularioEmail = (): boolean => {
    const emailsValidos = destinatarios.filter(email => email.trim() !== '');

    if (emailsValidos.length === 0) {
      toast.error('É necessário informar pelo menos um destinatário');
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const emailsInvalidos = emailsValidos.filter(email => !emailRegex.test(email));

    // Validar CC também
    const emailsCCValidos = destinatariosCC.filter(email => email.trim() !== '');
    const emailsCCInvalidos = emailsCCValidos.filter(email => !emailRegex.test(email));

    // Validar BCC também
    const emailsBCCValidos = destinatariosBCC.filter(email => email.trim() !== '');
    const emailsBCCInvalidos = emailsBCCValidos.filter(email => !emailRegex.test(email));

    if (emailsInvalidos.length > 0 || emailsCCInvalidos.length > 0 || emailsBCCInvalidos.length > 0) {
      const todosInvalidos = [...emailsInvalidos, ...emailsCCInvalidos, ...emailsBCCInvalidos];
      toast.error(`E-mails inválidos: ${todosInvalidos.join(', ')}`);
      return false;
    }

    if (!assuntoEmail.trim()) {
      toast.error('É necessário informar o assunto do email');
      return false;
    }

    return true;
  };

  const handleDispararFaturamento = async () => {
    if (!validarFormularioEmail()) return;

    setEnviandoEmail(true);

    try {
      const emailsValidos = destinatarios.filter(email => email.trim() !== '');
      const emailsCCValidos = destinatariosCC.filter(email => email.trim() !== '');
      const emailsBCCValidos = destinatariosBCC.filter(email => email.trim() !== '');

      // Buscar requerimentos selecionados dependendo da aba ativa
      let requerimentosSelecionadosData: Requerimento[] = [];
      
      if (abaAtiva === 'para_faturar') {
        // Buscar na lista de requerimentos para faturar
        requerimentosSelecionadosData = dadosFaturamento?.requerimentos.filter(req => 
          requerimentosSelecionados.includes(req.id)
        ) || [];
      } else {
        // Buscar na lista de requerimentos já faturados
        requerimentosSelecionadosData = dadosFaturados?.filter(req => 
          requerimentosSelecionados.includes(req.id)
        ) || [];
      }

      if (requerimentosSelecionadosData.length === 0) {
        toast.error('Nenhum requerimento selecionado encontrado');
        setEnviandoEmail(false);
        return;
      }

      // Gerar relatório HTML apenas com os requerimentos selecionados
      const relatorio = await faturamentoService.gerarRelatorioFaturamentoSelecionados(
        requerimentosSelecionadosData, 
        mesSelecionado, 
        anoSelecionado
      );
      const htmlTemplate = faturamentoService.criarTemplateEmailFaturamento(relatorio);

      // Fazer upload dos anexos para Supabase Storage se houver
      let dadosAnexos = undefined;
      if (anexos.length > 0) {
        try {
          dadosAnexos = await uploadArquivosParaStorage(anexos);
          console.log('✅ Anexos enviados para storage:', dadosAnexos);
        } catch (error) {
          console.error('❌ Erro ao fazer upload dos anexos:', error);
          toast.error('Erro ao fazer upload dos anexos');
          setEnviandoEmail(false);
          return;
        }
      }

      const emailFaturamento: EmailFaturamento = {
        destinatarios: emailsValidos,
        destinatariosCC: emailsCCValidos,
        destinatariosBCC: emailsBCCValidos,
        assunto: assuntoEmail,
        corpo: htmlTemplate,
        anexos: dadosAnexos
      };

      // 1. Disparar o email
      const resultado = await faturamentoService.dispararFaturamento(emailFaturamento);

      if (resultado.success) {
        // 2. Marcar os requerimentos selecionados como faturados (apenas se estiver na aba para_faturar)
        if (abaAtiva === 'para_faturar') {
          await marcarComoFaturados.mutateAsync(requerimentosSelecionados);
        }
        
        const mensagemAnexos = anexos.length > 0 ? ` com ${anexos.length} anexo(s)` : '';
        const mensagemFaturados = abaAtiva === 'para_faturar' 
          ? ` e ${requerimentosSelecionados.length} requerimento(s) marcado(s) como faturado(s)`
          : '';
        toast.success(`Faturamento disparado${mensagemAnexos}${mensagemFaturados}!`);
        
        // Limpar estados
        setModalEmailAberto(false);
        setConfirmacaoAberta(false);
        setRequerimentosSelecionados([]);
        setDestinatarios([]);
        setDestinatariosCC([]);
        setDestinatariosBCC([]);
        setDestinatariosTexto('');
        setDestinatariosCCTexto('');
        setDestinatariosBCCTexto('');
        setAssuntoEmail('');
        setAnexos([]);
      } else {
        toast.error(resultado.error || 'Erro ao disparar faturamento');
      }
    } catch (error) {
      console.error('Erro ao disparar faturamento:', error);
      toast.error('Erro inesperado ao disparar faturamento');
    } finally {
      setEnviandoEmail(false);
    }
  };

  const formatarData = (data: string): string => {
    try {
      // Se a data está no formato YYYY-MM-DD, trata como data local
      if (data.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const [year, month, day] = data.split('-');
        const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        return date.toLocaleDateString('pt-BR');
      }
      // Para outros formatos, usa o comportamento padrão
      return new Date(data).toLocaleDateString('pt-BR');
    } catch {
      return data;
    }
  };

  const formatarHoras = (horas: string | number): string => {
    // Se for string (formato HH:MM), usar formatarHorasParaExibicao
    if (typeof horas === 'string') {
      return formatarHorasParaExibicao(horas, 'completo');
    }

    // Se for number (decimal), converter para HH:MM primeiro
    if (typeof horas === 'number') {
      const totalMinutos = Math.round(horas * 60);
      const horasInt = Math.floor(totalMinutos / 60);
      const minutosInt = totalMinutos % 60;
      const horasFormatadas = `${horasInt}:${minutosInt.toString().padStart(2, '0')}`;
      return formatarHorasParaExibicao(horasFormatadas, 'completo');
    }

    return '0:00';
  };

  const handleAbrirConfirmacaoRejeicao = (requerimento: Requerimento) => {
    setRequerimentoParaRejeitar(requerimento);
    setConfirmacaoRejeicaoAberta(true);
  };

  const handleConfirmarRejeicao = async () => {
    if (!requerimentoParaRejeitar) return;

    try {
      await rejeitarRequerimento.mutateAsync(requerimentoParaRejeitar.id);
      setConfirmacaoRejeicaoAberta(false);
      setRequerimentoParaRejeitar(null);
      refetch(); // Atualizar a lista
    } catch (error) {
      console.error('Erro ao rejeitar requerimento:', error);
    }
  };

  // Função para arquivar requerimento reprovado
  const handleArquivarRequerimento = async (requerimento: Requerimento) => {
    try {
      await marcarComoFaturados.mutateAsync([requerimento.id]);
      toast.success('Requerimento arquivado com sucesso!');
      refetch(); // Atualizar a lista
    } catch (error) {
      console.error('Erro ao arquivar requerimento:', error);
      toast.error('Erro ao arquivar requerimento');
    }
  };

  // Função para visualizar detalhes do requerimento
  const handleVisualizarRequerimento = (requerimento: Requerimento) => {
    setRequerimentoParaVisualizar(requerimento);
    setModalVisualizacaoAberto(true);
  };

  // Funções de controle de seleção
  const handleSelecionarRequerimento = (id: string, selecionado: boolean) => {
    if (selecionado) {
      setRequerimentosSelecionados(prev => [...prev, id]);
    } else {
      setRequerimentosSelecionados(prev => prev.filter(reqId => reqId !== id));
    }
  };

  const handleSelecionarTodos = (requerimentos: Requerimento[], selecionado: boolean) => {
    if (selecionado) {
      const novosIds = requerimentos.map(req => req.id);
      setRequerimentosSelecionados(prev => [...new Set([...prev, ...novosIds])]);
    } else {
      const idsParaRemover = requerimentos.map(req => req.id);
      setRequerimentosSelecionados(prev => prev.filter(id => !idsParaRemover.includes(id)));
    }
  };

  const handleMarcarComoFaturados = async () => {
    if (requerimentosSelecionados.length === 0) return;

    try {
      await marcarComoFaturados.mutateAsync(requerimentosSelecionados);
      setRequerimentosSelecionados([]);
    } catch (error) {
      console.error('Erro ao marcar como faturados:', error);
    }
  };

  // Limpar seleção ao trocar de aba
  const handleTrocarAba = (aba: 'para_faturar' | 'faturados') => {
    setAbaAtiva(aba);
    setRequerimentosSelecionados([]);
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Cabeçalho */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Enviar Requerimentos
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Visualize e processe requerimentos enviados para faturamento
            </p>
          </div>

          <div className="flex gap-2">
            {/* Botão de exportar - condicional por aba */}
            {abaAtiva === 'para_faturar' ? (
              <FaturamentoExportButtons
                requerimentosAgrupados={requerimentosAgrupados}
                estatisticas={estatisticasPeriodo}
                mesNome={nomesMeses[mesSelecionado - 1]}
                ano={anoSelecionado}
                disabled={isLoading}
              />
            ) : (
              <FaturamentoExportButtons
                requerimentosAgrupados={(() => {
                  const grupos: RequerimentosAgrupados = {};
                  dadosFaturadosFiltrados.forEach(req => {
                    const tipo = req.tipo_cobranca;
                    if (!grupos[tipo]) {
                      grupos[tipo] = {
                        tipo,
                        requerimentos: [],
                        totalHoras: '0:00',
                        totalValor: 0,
                        quantidade: 0
                      };
                    }
                    grupos[tipo].requerimentos.push(req);
                    if (req.horas_total) {
                      grupos[tipo].totalHoras = somarHoras(grupos[tipo].totalHoras, req.horas_total.toString());
                    }
                    if (req.valor_total_geral) {
                      grupos[tipo].totalValor += req.valor_total_geral;
                    }
                    grupos[tipo].quantidade += 1;
                  });
                  return grupos;
                })()}
                estatisticas={{
                  totalRequerimentos: dadosFaturadosFiltrados.length,
                  totalHoras: dadosFaturadosFiltrados.reduce((acc, req) => somarHoras(acc, req.horas_total?.toString() || '0'), '0:00'),
                  tiposAtivos: [...new Set(dadosFaturadosFiltrados.map(req => req.tipo_cobranca))].length,
                  valorTotalFaturavel: dadosFaturadosFiltrados.reduce((acc, req) => {
                    if (['Faturado', 'Hora Extra', 'Sobreaviso', 'Bolsão Enel'].includes(req.tipo_cobranca)) {
                      return acc + (req.valor_total_geral || 0);
                    }
                    return acc;
                  }, 0)
                }}
                mesNome={nomesMeses[mesSelecionado - 1]}
                ano={anoSelecionado}
                disabled={dadosFaturadosFiltrados.length === 0}
              />
            )}
            
            {/* Botão Disparar Faturamento - aparece em ambas as abas */}
            <ProtectedAction screenKey="faturar_requerimentos" requiredLevel="edit">
              <Button
                onClick={handleAbrirModalEmail}
                disabled={(abaAtiva === 'para_faturar' ? isLoading : isLoadingFaturados) || requerimentosSelecionados.length === 0}
                size="sm"
                title={requerimentosSelecionados.length === 0 ? 'Selecione requerimentos para disparar faturamento' : `Disparar faturamento de ${requerimentosSelecionados.length} requerimento(s) selecionado(s)`}
              >
                <Send className="h-4 w-4 mr-2" />
                Disparar Faturamento ({requerimentosSelecionados.length})
              </Button>
            </ProtectedAction>
          </div>
        </div>

        {/* Estatísticas - Estilo similar ao Lançar Requerimentos */}
        {abaAtiva !== 'faturados' && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {/* Card combinado: Total + Tipos Ativos */}
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xs lg:text-sm font-medium text-gray-600 dark:text-gray-400 flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Total
                  </CardTitle>
                  <CardTitle className="text-xs lg:text-sm font-medium text-purple-600 flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Tipos Ativos
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-start justify-between">
                  <div className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-white">
                    {estatisticasPeriodoFiltradas.totalRequerimentos}
                  </div>
                  <div className="text-xl lg:text-2xl font-bold text-purple-600">
                    {estatisticasPeriodoFiltradas.tiposAtivos}
                  </div>
                </div>
              </CardContent>
            </Card>
            
            {/* Card Total Horas */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs lg:text-sm font-medium text-blue-600 flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Total Horas
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-xl lg:text-2xl font-bold text-blue-600">
                  {formatarHorasParaExibicao(estatisticasPeriodoFiltradas.totalHoras, 'completo')}
                </div>
              </CardContent>
            </Card>
            
            {/* Card Banco de Horas */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs lg:text-sm font-medium text-indigo-600 flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Banco de Horas
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-xl lg:text-2xl font-bold text-indigo-600">
                  {formatarHorasParaExibicao(horasBancoDeHoras, 'completo')}
                </div>
                {requerimentosSelecionados.length > 0 && requerimentosSelecionados.length < (dadosFaturamento?.requerimentos?.length || 0) && (
                  <div className="text-xs text-muted-foreground mt-1">
                    Selecionados
                  </div>
                )}
              </CardContent>
            </Card>
            
            {/* Card Período */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs lg:text-sm font-medium text-orange-600 flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Período
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-xl lg:text-2xl font-bold text-orange-600">
                  {nomesMeses[mesSelecionado - 1]} {anoSelecionado}
                </div>
              </CardContent>
            </Card>
            
            {/* Card Valor Total Faturável */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs lg:text-sm font-medium text-green-600 flex items-center gap-2">
                  <Calculator className="h-4 w-4" />
                  Valor Faturável
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-xl lg:text-2xl font-bold text-green-600">
                  R$ {valorFaturavel.toLocaleString('pt-BR', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })}
                </div>
                {requerimentosSelecionados.length > 0 && requerimentosSelecionados.length < (dadosFaturamento?.requerimentos?.length || 0) && (
                  <div className="text-xs text-muted-foreground mt-1">
                    Selecionados
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Cards para aba Histórico de Enviados - Estilo similar ao Lançar Requerimentos */}
        {abaAtiva === 'faturados' && dadosFaturados && (
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {/* Card Total */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs lg:text-sm font-medium text-blue-600 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Total
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-xl lg:text-2xl font-bold text-blue-600">
                  {estatisticasHistorico.total}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {requerimentosSelecionados.length > 0 && requerimentosSelecionados.length < dadosFaturados.length ? 'Selecionados' : 'Excluindo reprovados'}
                </div>
              </CardContent>
            </Card>

            {/* Card Total Horas */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs lg:text-sm font-medium text-green-600 flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Total Horas
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-xl lg:text-2xl font-bold text-green-600">
                  {formatarHoras(estatisticasHistorico.totalHoras)}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {requerimentosSelecionados.length > 0 && requerimentosSelecionados.length < dadosFaturados.length ? 'Selecionados' : 'Excluindo reprovados'}
                </div>
              </CardContent>
            </Card>

            {/* Card Banco de Horas */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs lg:text-sm font-medium text-indigo-600 flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Banco de Horas
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-xl lg:text-2xl font-bold text-indigo-600">
                  {formatarHoras(estatisticasHistorico.horasBancoDeHoras)}
                </div>
                {requerimentosSelecionados.length > 0 && requerimentosSelecionados.length < dadosFaturados.length && (
                  <div className="text-xs text-muted-foreground mt-1">
                    Selecionados
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Card Horas Reprovadas */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs lg:text-sm font-medium text-red-600 flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Horas Reprovadas
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-xl lg:text-2xl font-bold text-red-600">
                  {formatarHoras(estatisticasHistorico.horasReprovadas)}
                </div>
                <div className="text-xs text-muted-foreground mt-1">
                  {estatisticasHistorico.totalReprovados} reprovado{estatisticasHistorico.totalReprovados !== 1 ? 's' : ''}
                </div>
              </CardContent>
            </Card>

            {/* Card Valor Faturável */}
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs lg:text-sm font-medium text-orange-600 flex items-center gap-2">
                  <Calculator className="h-4 w-4" />
                  Valor Faturável
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-xl lg:text-2xl font-bold text-orange-600">
                  R$ {estatisticasHistorico.valorFaturavel.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                {requerimentosSelecionados.length > 0 && requerimentosSelecionados.length < dadosFaturados.length ? (
                  <div className="text-xs text-muted-foreground mt-1">
                    Selecionados
                  </div>
                ) : (
                  <div className="text-xs text-muted-foreground mt-1">
                    Faturado + Hora Extra + Sobreaviso + Bolsão Enel
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Navegação de Período */}
        <Card>
          <CardContent className="py-3 xl:py-4">
            <div className="flex items-center justify-between gap-2 xl:gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={navegarMesAnterior}
                className="flex items-center gap-1 xl:gap-2 px-2 xl:px-3 text-xs xl:text-sm"
              >
                <ChevronLeft className="h-3.5 w-3.5 xl:h-4 xl:w-4" />
                <span className="hidden sm:inline">Anterior</span>
              </Button>

              <div className="text-center flex-1 min-w-0">
                <div className="text-base xl:text-lg font-semibold text-gray-900 dark:text-white truncate">
                  {nomesMeses[mesSelecionado - 1]} {anoSelecionado}
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={navegarMesProximo}
                className="flex items-center gap-1 xl:gap-2 px-2 xl:px-3 text-xs xl:text-sm"
              >
                <span className="hidden sm:inline">Próximo</span>
                <ChevronRight className="h-3.5 w-3.5 xl:h-4 xl:w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Conteúdo Principal */}
        {isLoading ? (
          <Card>
            <CardContent className="p-8">
              <div className="flex items-center justify-center">
                <RefreshCw className="h-6 w-6 animate-spin mr-2" />
                <span>Carregando requerimentos...</span>
              </div>
            </CardContent>
          </Card>
        ) : error ? (
          <Card>
            <CardContent className="p-8">
              <div className="text-center text-red-600">
                <p>Erro ao carregar requerimentos: {error.message}</p>
                <Button onClick={() => refetch()} className="mt-4">
                  Tentar novamente
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Tabs value={abaAtiva} onValueChange={(value) => handleTrocarAba(value as 'para_faturar' | 'faturados')} className="w-full space-y-4">
            <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
              <TabsList className="w-full sm:w-auto">
                <TabsTrigger value="para_faturar" className="flex-1 sm:flex-none text-xs sm:text-sm">
                  Enviar para Faturamento ({dadosFaturamento?.requerimentos?.length || 0})
                </TabsTrigger>
                <TabsTrigger value="faturados" className="flex-1 sm:flex-none text-xs sm:text-sm">
                  Históricos de Enviados ({dadosFaturados?.length || 0})
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="para_faturar" className="space-y-6">
              {gruposFiltrados.length === 0 ? (
                <Card>
                  <CardHeader>
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                      <CardTitle className="text-lg lg:text-xl flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        Requerimentos para Faturamento
                      </CardTitle>

                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setFiltrosExpandidos(!filtrosExpandidos)}
                          className="flex items-center justify-center space-x-2"
                          aria-expanded={filtrosExpandidos}
                          aria-controls="filters-section"
                        >
                          <Filter className="h-4 w-4" />
                          <span>Filtros</span>
                        </Button>
                        {/* Mostrar botão "Limpar Filtro" se houver filtros ativos */}
                        {(filtroTipoSelect.length > 0 || filtroModuloSelect.length > 0 || busca.trim() !== '' || filtroPeriodo !== 'all') && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={limparFiltros}
                            className="whitespace-nowrap hover:border-red-300"
                            aria-label="Limpar todos os filtros aplicados"
                          >
                            <X className="h-4 w-4 mr-2 text-red-600" />
                            Limpar Filtro
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Filtros */}
                    {filtrosExpandidos && (
                      <div className="space-y-4 pt-4 border-t">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          {/* Busca */}
                          <div>
                            <div className="text-sm font-medium mb-2">Buscar</div>
                            <div className="relative">
                              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                              <Input
                                placeholder="Buscar por chamado, cliente ou descrição..."
                                value={busca}
                                onChange={(e) => setBusca(e.target.value)}
                                className="pl-10"
                                aria-label="Campo de busca"
                              />
                            </div>
                          </div>

                          {/* Módulo */}
                          <div>
                            <div className="text-sm font-medium mb-2">Módulo</div>
                            <MultiSelect
                              options={moduloOptions}
                              selected={filtroModuloSelect}
                              onChange={(values) => setFiltroModuloSelect(values as ModuloType[])}
                              placeholder="Todos os módulos"
                              maxCount={2}
                            />
                          </div>

                          {/* Tipo de Cobrança */}
                          <div>
                            <div className="text-sm font-medium mb-2">Tipo de Cobrança</div>
                            <MultiSelect
                              options={tipoCobrancaOptions}
                              selected={filtroTipoSelect}
                              onChange={(values) => setFiltroTipoSelect(values as TipoCobrancaType[])}
                              placeholder="Todos os tipos"
                              maxCount={2}
                            />
                          </div>

                          {/* Período de Cobrança */}
                          <div>
                            <div className="text-sm font-medium mb-2">Período de Cobrança</div>
                            <MonthYearPicker
                              value={filtroPeriodo === 'all' ? '' : filtroPeriodo}
                              onChange={handleFiltroPeriodoChange}
                              placeholder="Todos os períodos"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </CardHeader>
                  <CardContent className="p-8">
                    <div className="text-center text-gray-500">
                      <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <h3 className="text-lg font-medium mb-2">
                        Nenhum requerimento encontrado
                      </h3>
                      <p>
                        {busca || filtroTipoSelect.length > 0 || filtroModuloSelect.length > 0 || filtroPeriodo
                          ? 'Tente ajustar os filtros para encontrar requerimentos.'
                          : `Não há requerimentos enviados para faturamento no período de ${nomesMeses[mesSelecionado - 1]} ${anoSelecionado}.`}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <>
                  {/* Card com filtros para quando há dados */}
                  <Card>
                    <CardHeader>
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                        <CardTitle className="text-lg lg:text-xl flex items-center gap-2">
                          <FileText className="h-5 w-5" />
                          Requerimentos para Faturamento
                        </CardTitle>

                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setFiltrosExpandidos(!filtrosExpandidos)}
                            className="flex items-center justify-center space-x-2"
                            aria-expanded={filtrosExpandidos}
                            aria-controls="filters-section"
                          >
                            <Filter className="h-4 w-4" />
                            <span>Filtros</span>
                          </Button>
                        </div>
                      </div>

                      {/* Filtros */}
                      {filtrosExpandidos && (
                        <div className="space-y-4 pt-4 border-t">
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            {/* Busca */}
                            <div>
                              <div className="text-sm font-medium mb-2">Buscar</div>
                              <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <Input
                                  placeholder="Buscar por chamado, cliente ou descrição..."
                                  value={busca}
                                  onChange={(e) => setBusca(e.target.value)}
                                  className="pl-10"
                                  aria-label="Campo de busca"
                                />
                              </div>
                            </div>

                            {/* Módulo */}
                            <div>
                              <div className="text-sm font-medium mb-2">Módulo</div>
                              <MultiSelect
                                options={moduloOptions}
                                selected={filtroModuloSelect}
                                onChange={(values) => setFiltroModuloSelect(values as ModuloType[])}
                                placeholder="Todos os módulos"
                                maxCount={2}
                              />
                            </div>

                            {/* Tipo de Cobrança */}
                            <div>
                              <div className="text-sm font-medium mb-2">Tipo de Cobrança</div>
                              <MultiSelect
                                options={tipoCobrancaOptions}
                                selected={filtroTipoSelect}
                                onChange={(values) => setFiltroTipoSelect(values as TipoCobrancaType[])}
                                placeholder="Todos os tipos"
                                maxCount={2}
                              />
                            </div>

                            {/* Período de Cobrança */}
                            <div>
                              <div className="text-sm font-medium mb-2">Período de Cobrança</div>
                              <MonthYearPicker
                                value={filtroPeriodo === 'all' ? '' : filtroPeriodo}
                                onChange={handleFiltroPeriodoChange}
                                placeholder="Todos os períodos"
                              />
                            </div>
                          </div>

                        </div>
                      )}
                    </CardHeader>
                  </Card>
                </>
              )}

              {/* Renderizar grupos filtrados */}
              {gruposFiltrados.length > 0 && (
                gruposFiltrados.map(grupo => {
              const colors = getCobrancaColors(grupo.tipo);
              const icon = getCobrancaIcon(grupo.tipo);

              return (
                <Card key={grupo.tipo} className={`${colors.border} border-l-4`}>
                  <CardHeader className={`${colors.bg} ${colors.text}`}>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-xl flex items-center gap-2">
                        <span className="text-2xl">{icon}</span>
                        {grupo.tipo}
                      </CardTitle>
                      <div className="flex items-center gap-2 text-sm flex-wrap">
                        <Badge variant="secondary" className="bg-white/90 text-gray-800 border border-white/50 font-medium">
                          {grupo.quantidade} requerimento{grupo.quantidade !== 1 ? 's' : ''}
                        </Badge>
                        <Badge variant="secondary" className="bg-white/90 text-gray-800 border border-white/50 font-medium">
                          {formatarHorasParaExibicao(grupo.totalHoras, 'completo')}
                        </Badge>
                        {requerValorHora(grupo.tipo) && grupo.totalValor > 0 && (
                          <Badge variant="secondary" className="bg-green-100 text-green-800 border border-green-200 font-medium">
                            R$ {grupo.totalValor.toLocaleString('pt-BR', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2
                            })}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-10 text-sm py-2 px-3">
                              <Checkbox
                                checked={grupo.requerimentos.length > 0 && grupo.requerimentos.every(req => requerimentosSelecionados.includes(req.id))}
                                onCheckedChange={(checked) => handleSelecionarTodos(grupo.requerimentos, checked as boolean)}
                                aria-label="Selecionar todos os requerimentos deste grupo"
                              />
                            </TableHead>
                            <TableHead className="text-center text-sm xl:text-base py-2 px-3">Chamado</TableHead>
                            <TableHead className="text-center text-sm xl:text-base py-2 px-3">Cliente</TableHead>
                            <TableHead className="text-center text-sm xl:text-base py-2 px-3">Módulo</TableHead>
                            <TableHead className="text-center text-sm xl:text-base py-2 px-3">Horas</TableHead>
                            <TableHead className="text-center text-sm xl:text-base py-2 px-3">Datas</TableHead>
                            <TableHead className="text-center text-sm xl:text-base py-2 px-3">Período</TableHead>
                            {['Faturado', 'Hora Extra', 'Sobreaviso', 'Bolsão Enel'].includes(grupo.tipo) && (
                              <TableHead className="text-center text-sm xl:text-base py-2 px-3">Valor Total</TableHead>
                            )}
                            {['Faturado', 'Hora Extra', 'Sobreaviso', 'Bolsão Enel', 'Reprovado'].includes(grupo.tipo) && (
                              <TableHead className="text-center text-sm xl:text-base py-2 px-3">Observação</TableHead>
                            )}
                            <TableHead className="text-center text-sm xl:text-base py-2 px-3">Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {grupo.requerimentos.map(req => {
                            return (
                              <TableRow key={req.id}>
                                <TableCell className="py-3 px-3">
                                  <Checkbox
                                    checked={requerimentosSelecionados.includes(req.id)}
                                    onCheckedChange={(checked) => handleSelecionarRequerimento(req.id, checked as boolean)}
                                    aria-label={`Selecionar requerimento ${req.chamado}`}
                                  />
                                </TableCell>
                                
                                {/* Coluna Chamado */}
                                <TableCell className="text-center py-3 px-3">
                                  <div className="flex items-center justify-center gap-2 min-w-[120px]">
                                    <span className="text-lg flex-shrink-0">{getCobrancaIcon(req.tipo_cobranca)}</span>
                                    <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-sm font-medium truncate" title={req.chamado}>
                                      {req.chamado}
                                    </code>
                                  </div>
                                </TableCell>

                                {/* Coluna Cliente */}
                                <TableCell className="py-3 px-3">
                                  <ClienteNomeDisplay
                                    nomeEmpresa={req.cliente_nome}
                                    className="text-center text-sm font-medium truncate block min-w-[120px]"
                                  />
                                </TableCell>

                                {/* Coluna Módulo */}
                                <TableCell className="text-center py-3 px-3">
                                  <div className="flex flex-col items-center gap-1">
                                    <Badge variant="outline" className="text-xs text-blue-600 border-blue-600 px-2 py-0.5 whitespace-nowrap">
                                      {req.modulo}
                                    </Badge>
                                    {req.autor_nome && (
                                      <span className="text-[10px] text-gray-500 truncate max-w-[100px]" title={req.autor_nome}>
                                        {(() => {
                                          const nomes = req.autor_nome.split(' ');
                                          if (nomes.length === 1) return nomes[0];
                                          return `${nomes[0]} ${nomes[nomes.length - 1]}`;
                                        })()}
                                      </span>
                                    )}
                                  </div>
                                </TableCell>

                                {/* Coluna Horas */}
                                <TableCell className="text-center py-3 px-3">
                                  <div className="flex flex-col items-center gap-1 min-w-[80px]">
                                    <span 
                                      className="text-base font-bold text-gray-900 dark:text-white whitespace-nowrap cursor-help" 
                                      title="Total de Horas"
                                    >
                                      {formatarHoras(req.horas_total)}
                                    </span>
                                    <div className="text-xs text-gray-500 flex items-center gap-1">
                                      <span 
                                        className="text-blue-600 cursor-help" 
                                        title="Horas Funcionais"
                                      >
                                        {formatarHoras(req.horas_funcional)}
                                      </span>
                                      <span>/</span>
                                      <span 
                                        className="text-green-600 cursor-help" 
                                        title="Horas Técnicas"
                                      >
                                        {formatarHoras(req.horas_tecnico)}
                                      </span>
                                    </div>
                                    {req.quantidade_tickets && req.quantidade_tickets > 0 && (
                                      <Badge 
                                        variant="secondary" 
                                        className="text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 whitespace-nowrap cursor-help"
                                        title={`${req.quantidade_tickets} ticket${req.quantidade_tickets !== 1 ? 's' : ''}`}
                                      >
                                        🎫 {req.quantidade_tickets}
                                      </Badge>
                                    )}
                                  </div>
                                </TableCell>

                                {/* Coluna Datas */}
                                <TableCell className="text-center py-3 px-3">
                                  <div className="flex flex-col gap-1 text-xs text-gray-500 min-w-[100px]">
                                    <div className="flex items-center justify-center gap-1">
                                      <span className="text-[10px] text-gray-400">Envio:</span>
                                      <span>{formatarData(req.data_envio)}</span>
                                    </div>
                                    {req.data_aprovacao && (
                                      <div className="flex items-center justify-center gap-1">
                                        <span className="text-[10px] text-gray-400">Aprov:</span>
                                        <span>{formatarData(req.data_aprovacao)}</span>
                                      </div>
                                    )}
                                  </div>
                                </TableCell>

                                {/* Coluna Período */}
                                <TableCell className="text-center py-3 px-3">
                                  <span className="text-sm text-gray-700 dark:text-gray-300 font-medium whitespace-nowrap">
                                    {req.mes_cobranca || '-'}
                                  </span>
                                </TableCell>

                                {/* Coluna Valor Total - apenas para tipos específicos */}
                                {['Faturado', 'Hora Extra', 'Sobreaviso', 'Bolsão Enel'].includes(req.tipo_cobranca) && (
                                  <TableCell className="text-center py-3 px-3">
                                    {req.valor_total_geral ? (
                                      <span className="text-sm font-semibold text-green-600 whitespace-nowrap">
                                        R$ {req.valor_total_geral.toLocaleString('pt-BR', {
                                          minimumFractionDigits: 2,
                                          maximumFractionDigits: 2
                                        })}
                                      </span>
                                    ) : (
                                      <span className="text-sm text-gray-400">-</span>
                                    )}
                                  </TableCell>
                                )}

                                {/* Coluna Observação - para tipos específicos incluindo Reprovado */}
                                {['Faturado', 'Hora Extra', 'Sobreaviso', 'Bolsão Enel', 'Reprovado'].includes(req.tipo_cobranca) && (
                                  <TableCell className="text-center py-3 px-3">
                                    <span className="text-xs text-gray-700 dark:text-gray-300 line-clamp-2 max-w-[200px] mx-auto" title={req.observacao}>
                                      {req.observacao || '-'}
                                    </span>
                                  </TableCell>
                                )}

                                {/* Coluna Ações */}
                                <TableCell className="text-center py-3 px-3">
                                  <div className="flex items-center justify-center gap-2">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleVisualizarRequerimento(req)}
                                      className="h-8 w-8 p-0"
                                      title="Visualizar detalhes do requerimento"
                                    >
                                      <Eye className="h-4 w-4 text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-200" />
                                    </Button>
                                    
                                    <ProtectedAction screenKey="faturar_requerimentos" requiredLevel="edit">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => handleAbrirConfirmacaoRejeicao(req)}
                                        disabled={rejeitarRequerimento.isPending}
                                        className="h-8 w-8 p-0"
                                        title="Rejeitar requerimento"
                                      >
                                        <X className="h-4 w-4 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200" />
                                      </Button>
                                    </ProtectedAction>
                                    
                                    {req.tipo_cobranca === 'Reprovado' && (
                                      <ProtectedAction screenKey="faturar_requerimentos" requiredLevel="edit">
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          onClick={() => handleArquivarRequerimento(req)}
                                          disabled={marcarComoFaturados.isPending}
                                          className="h-8 w-8 p-0 text-green-600 hover:text-green-700 hover:bg-green-50 border-green-200"
                                          title="Arquivar requerimento"
                                        >
                                          <Check className="h-4 w-4" />
                                        </Button>
                                      </ProtectedAction>
                                    )}
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              );
            })
              )}
            </TabsContent>

            <TabsContent value="faturados" className="space-y-6">
              {isLoadingFaturados ? (
                <Card>
                  <CardContent className="p-8">
                    <div className="text-center">
                      <RefreshCw className="h-8 w-8 mx-auto mb-4 animate-spin text-blue-500" />
                      <p>Carregando requerimentos faturados...</p>
                    </div>
                  </CardContent>
                </Card>
              ) : errorFaturados ? (
                <Card>
                  <CardContent className="p-8">
                    <div className="text-center text-red-500">
                      <AlertTriangle className="h-8 w-8 mx-auto mb-4" />
                      <p>Erro ao carregar requerimentos faturados</p>
                      <Button onClick={() => window.location.reload()} className="mt-4">
                        Tentar novamente
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : !dadosFaturados || dadosFaturados.length === 0 ? (
                <Card>
                  <CardHeader>
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                      <CardTitle className="text-lg lg:text-xl flex items-center gap-2">
                        <Check className="h-5 w-5" />
                        Histórico - Requerimentos Enviados
                      </CardTitle>

                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setFiltrosExpandidos(!filtrosExpandidos)}
                          className="flex items-center justify-center space-x-2"
                          aria-expanded={filtrosExpandidos}
                          aria-controls="filters-section"
                        >
                          <Filter className="h-4 w-4" />
                          <span>Filtros</span>
                        </Button>
                        {/* Mostrar botão "Limpar Filtro" se houver filtros ativos */}
                        {(filtroTipoSelect.length > 0 || filtroModuloSelect.length > 0 || busca.trim() !== '' || filtroPeriodo !== 'all') && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={limparFiltros}
                            className="whitespace-nowrap hover:border-red-300"
                            aria-label="Limpar todos os filtros aplicados"
                          >
                            <X className="h-4 w-4 mr-2 text-red-600" />
                            Limpar Filtro
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Filtros */}
                    {filtrosExpandidos && (
                      <div className="space-y-4 pt-4 border-t">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          {/* Busca */}
                          <div>
                            <div className="text-sm font-medium mb-2">Buscar</div>
                            <div className="relative">
                              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                              <Input
                                placeholder="Buscar por chamado, cliente ou descrição..."
                                value={busca}
                                onChange={(e) => setBusca(e.target.value)}
                                className="pl-10"
                                aria-label="Campo de busca"
                              />
                            </div>
                          </div>

                          {/* Módulo */}
                          <div>
                            <div className="text-sm font-medium mb-2">Módulo</div>
                            <MultiSelect
                              options={moduloOptions}
                              selected={filtroModuloSelect}
                              onChange={(values) => setFiltroModuloSelect(values as ModuloType[])}
                              placeholder="Todos os módulos"
                              maxCount={2}
                            />
                          </div>

                          {/* Tipo de Cobrança */}
                          <div>
                            <div className="text-sm font-medium mb-2">Tipo de Cobrança</div>
                            <MultiSelect
                              options={tipoCobrancaOptions}
                              selected={filtroTipoSelect}
                              onChange={(values) => setFiltroTipoSelect(values as TipoCobrancaType[])}
                              placeholder="Todos os tipos"
                              maxCount={2}
                            />
                          </div>

                          {/* Período de Cobrança */}
                          <div>
                            <div className="text-sm font-medium mb-2">Período de Cobrança</div>
                            <MonthYearPicker
                              value={filtroPeriodo === 'all' ? '' : filtroPeriodo}
                              onChange={handleFiltroPeriodoChange}
                              placeholder="Todos os períodos"
                            />
                          </div>
                        </div>

                      </div>
                    )}
                  </CardHeader>
                  <CardContent className="p-8">
                    <div className="text-center text-gray-500">
                      <Check className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <h3 className="text-lg font-medium mb-2">
                        Nenhum requerimento faturado
                      </h3>
                      <p>
                        Não há requerimentos faturados no período de{' '}
                        <strong>{nomesMeses[mesSelecionado - 1]} {anoSelecionado}</strong>.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ) : dadosFaturadosFiltrados.length === 0 ? (
                <Card>
                  <CardHeader>
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                      <CardTitle className="text-lg lg:text-xl flex items-center gap-2">
                        <Check className="h-5 w-5" />
                        Histórico - Requerimentos Enviados
                      </CardTitle>

                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setFiltrosExpandidos(!filtrosExpandidos)}
                          className="flex items-center justify-center space-x-2"
                          aria-expanded={filtrosExpandidos}
                          aria-controls="filters-section"
                        >
                          <Filter className="h-4 w-4" />
                          <span>Filtros</span>
                        </Button>
                        {/* Mostrar botão "Limpar Filtro" se houver filtros ativos */}
                        {(filtroTipoSelect.length > 0 || filtroModuloSelect.length > 0 || busca.trim() !== '' || filtroPeriodo !== 'all') && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={limparFiltros}
                            className="whitespace-nowrap hover:border-red-300"
                            aria-label="Limpar todos os filtros aplicados"
                          >
                            <X className="h-4 w-4 mr-2 text-red-600" />
                            Limpar Filtro
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Filtros */}
                    {filtrosExpandidos && (
                      <div className="space-y-4 pt-4 border-t">
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          {/* Busca */}
                          <div>
                            <div className="text-sm font-medium mb-2">Buscar</div>
                            <div className="relative">
                              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                              <Input
                                placeholder="Buscar por chamado, cliente ou descrição..."
                                value={busca}
                                onChange={(e) => setBusca(e.target.value)}
                                className="pl-10"
                                aria-label="Campo de busca"
                              />
                            </div>
                          </div>

                          {/* Módulo */}
                          <div>
                            <div className="text-sm font-medium mb-2">Módulo</div>
                            <MultiSelect
                              options={moduloOptions}
                              selected={filtroModuloSelect}
                              onChange={(values) => setFiltroModuloSelect(values as ModuloType[])}
                              placeholder="Todos os módulos"
                              maxCount={2}
                            />
                          </div>

                          {/* Tipo de Cobrança */}
                          <div>
                            <div className="text-sm font-medium mb-2">Tipo de Cobrança</div>
                            <MultiSelect
                              options={tipoCobrancaOptions}
                              selected={filtroTipoSelect}
                              onChange={(values) => setFiltroTipoSelect(values as TipoCobrancaType[])}
                              placeholder="Todos os tipos"
                              maxCount={2}
                            />
                          </div>

                          {/* Período de Cobrança */}
                          <div>
                            <div className="text-sm font-medium mb-2">Período de Cobrança</div>
                            <MonthYearPicker
                              value={filtroPeriodo === 'all' ? '' : filtroPeriodo}
                              onChange={handleFiltroPeriodoChange}
                              placeholder="Todos os períodos"
                            />
                          </div>
                        </div>

                      </div>
                    )}
                  </CardHeader>
                  <CardContent className="p-8">
                    <div className="text-center text-gray-500">
                      <Filter className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <h3 className="text-lg font-medium mb-2">
                        Nenhum requerimento encontrado
                      </h3>
                      <p>
                        {busca || filtroTipoSelect.length > 0 || filtroModuloSelect.length > 0 || filtroPeriodo
                          ? 'Tente ajustar os filtros para encontrar requerimentos.'
                          : 'Não há requerimentos que correspondam aos filtros selecionados.'}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                    <CardHeader>
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                        <CardTitle className="text-lg lg:text-xl flex items-center gap-2">
                          <Check className="h-5 w-5" />
                          Histórico - Requerimentos Enviados
                        </CardTitle>

                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setFiltrosExpandidos(!filtrosExpandidos)}
                            className="flex items-center justify-center space-x-2"
                            aria-expanded={filtrosExpandidos}
                            aria-controls="filters-section"
                          >
                            <Filter className="h-4 w-4" />
                            <span>Filtros</span>
                          </Button>
                          {/* Mostrar botão "Limpar Filtro" se houver filtros ativos */}
                          {(filtroTipoSelect.length > 0 || filtroModuloSelect.length > 0 || busca.trim() !== '' || filtroPeriodo !== 'all') && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={limparFiltros}
                              className="whitespace-nowrap hover:border-red-300"
                              aria-label="Limpar todos os filtros aplicados"
                            >
                              <X className="h-4 w-4 mr-2 text-red-600" />
                              Limpar Filtro
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Filtros */}
                      {filtrosExpandidos && (
                        <div className="space-y-4 pt-4 border-t">
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            {/* Busca */}
                            <div>
                              <div className="text-sm font-medium mb-2">Buscar</div>
                              <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <Input
                                  placeholder="Buscar por chamado, cliente ou descrição..."
                                  value={busca}
                                  onChange={(e) => setBusca(e.target.value)}
                                  className="pl-10"
                                  aria-label="Campo de busca"
                                />
                              </div>
                            </div>

                            {/* Módulo */}
                            <div>
                              <div className="text-sm font-medium mb-2">Módulo</div>
                              <MultiSelect
                                options={moduloOptions}
                                selected={filtroModuloSelect}
                                onChange={(values) => setFiltroModuloSelect(values as ModuloType[])}
                                placeholder="Todos os módulos"
                                maxCount={2}
                              />
                            </div>

                            {/* Tipo de Cobrança */}
                            <div>
                              <div className="text-sm font-medium mb-2">Tipo de Cobrança</div>
                              <MultiSelect
                                options={tipoCobrancaOptions}
                                selected={filtroTipoSelect}
                                onChange={(values) => setFiltroTipoSelect(values as TipoCobrancaType[])}
                                placeholder="Todos os tipos"
                                maxCount={2}
                              />
                            </div>

                            {/* Período de Cobrança */}
                            <div>
                              <div className="text-sm font-medium mb-2">Período de Cobrança</div>
                              <MonthYearPicker
                                value={filtroPeriodo === 'all' ? '' : filtroPeriodo}
                                onChange={handleFiltroPeriodoChange}
                                placeholder="Todos os períodos"
                              />
                            </div>
                          </div>

                        </div>
                      )}
                    </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-10 text-sm py-2 px-3">
                              <Checkbox
                                checked={dadosFaturadosFiltrados.length > 0 && dadosFaturadosFiltrados.every(req => requerimentosSelecionados.includes(req.id))}
                                onCheckedChange={(checked) => handleSelecionarTodos(dadosFaturadosFiltrados, checked as boolean)}
                                aria-label="Selecionar todos os requerimentos faturados"
                              />
                            </TableHead>
                            <TableHead className="text-sm xl:text-base py-2 px-3 text-center">Chamado</TableHead>
                            <TableHead className="text-sm xl:text-base py-2 px-3 text-center">Cliente</TableHead>
                            <TableHead className="text-sm xl:text-base py-2 px-3 text-center">Módulo</TableHead>
                            <TableHead className="text-sm xl:text-base py-2 px-3 text-center">Horas</TableHead>
                            <TableHead className="text-sm xl:text-base py-2 px-3 text-center">Data Faturamento</TableHead>
                            <TableHead className="text-sm xl:text-base py-2 px-3 text-center">Período</TableHead>
                            <TableHead className="text-sm xl:text-base py-2 px-3 text-center">Valor Total</TableHead>
                            <TableHead className="text-sm xl:text-base py-2 px-3 text-center">Observação</TableHead>
                            <TableHead className="text-sm xl:text-base py-2 px-3 text-center">Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {dadosFaturadosFiltrados.map(req => (
                            <TableRow key={req.id}>
                              <TableCell className="py-3 px-3">
                                <Checkbox
                                  checked={requerimentosSelecionados.includes(req.id)}
                                  onCheckedChange={(checked) => handleSelecionarRequerimento(req.id, checked as boolean)}
                                  aria-label={`Selecionar requerimento ${req.chamado}`}
                                />
                              </TableCell>
                              
                              {/* Coluna Chamado */}
                              <TableCell className="text-center py-3 px-3">
                                <div className="flex items-center justify-center gap-2 min-w-[120px]">
                                  <span className="text-lg flex-shrink-0">{getCobrancaIcon(req.tipo_cobranca)}</span>
                                  <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-sm font-medium truncate" title={req.chamado}>
                                    {req.chamado}
                                  </code>
                                </div>
                              </TableCell>

                              {/* Coluna Cliente */}
                              <TableCell className="py-3 px-3">
                                <ClienteNomeDisplay
                                  nomeEmpresa={req.cliente_nome}
                                  className="text-sm font-medium truncate block min-w-[120px]"
                                />
                              </TableCell>

                              {/* Coluna Módulo */}
                              <TableCell className="text-center py-3 px-3">
                                <div className="flex flex-col items-center gap-1">
                                  <Badge variant="outline" className="text-xs text-blue-600 border-blue-600 px-2 py-0.5 whitespace-nowrap">
                                    {req.modulo}
                                  </Badge>
                                  {req.autor_nome && (
                                    <span className="text-[10px] text-gray-500 truncate max-w-[100px]" title={req.autor_nome}>
                                      {(() => {
                                        const nomes = req.autor_nome.split(' ');
                                        if (nomes.length === 1) return nomes[0];
                                        return `${nomes[0]} ${nomes[nomes.length - 1]}`;
                                      })()}
                                    </span>
                                  )}
                                </div>
                              </TableCell>

                              {/* Coluna Horas */}
                              <TableCell className="text-center py-3 px-3">
                                <div className="flex flex-col items-center gap-1 min-w-[80px]">
                                  <span 
                                    className="text-base font-bold text-gray-900 dark:text-white whitespace-nowrap cursor-help" 
                                    title="Total de Horas"
                                  >
                                    {formatarHoras(req.horas_total || somarHoras(req.horas_funcional?.toString() || '0', req.horas_tecnico?.toString() || '0'))}
                                  </span>
                                  <div className="text-xs text-gray-500 flex items-center gap-1">
                                    <span 
                                      className="text-blue-600 cursor-help" 
                                      title="Horas Funcionais"
                                    >
                                      {formatarHoras(req.horas_funcional)}
                                    </span>
                                    <span>/</span>
                                    <span 
                                      className="text-green-600 cursor-help" 
                                      title="Horas Técnicas"
                                    >
                                      {formatarHoras(req.horas_tecnico)}
                                    </span>
                                  </div>
                                  {req.quantidade_tickets && req.quantidade_tickets > 0 && (
                                    <Badge 
                                      variant="secondary" 
                                      className="text-[10px] px-1.5 py-0.5 bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 whitespace-nowrap cursor-help"
                                      title={`${req.quantidade_tickets} ticket${req.quantidade_tickets !== 1 ? 's' : ''}`}
                                    >
                                      🎫 {req.quantidade_tickets}
                                    </Badge>
                                  )}
                                </div>
                              </TableCell>

                              {/* Coluna Data Faturamento */}
                              <TableCell className="text-center text-sm text-gray-500 py-3 px-3 whitespace-nowrap">
                                {req.data_faturamento ? new Date(req.data_faturamento).toLocaleDateString('pt-BR') : '-'}
                              </TableCell>

                              {/* Coluna Período */}
                              <TableCell className="text-center py-3 px-3">
                                <span className="text-sm text-gray-700 dark:text-gray-300 font-medium whitespace-nowrap">
                                  {req.mes_cobranca || '-'}
                                </span>
                              </TableCell>

                              {/* Coluna Valor Total */}
                              <TableCell className="text-center text-sm py-3 px-3">
                                {req.valor_total_geral ? (
                                  <span className="font-semibold text-green-600 whitespace-nowrap">
                                    R$ {req.valor_total_geral.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </span>
                                ) : '-'}
                              </TableCell>

                              {/* Coluna Observação */}
                              <TableCell className="text-center py-3 px-3">
                                {['Faturado', 'Hora Extra', 'Sobreaviso', 'Bolsão Enel', 'Reprovado'].includes(req.tipo_cobranca) ? (
                                  <span className="text-xs text-gray-700 dark:text-gray-300 line-clamp-2 max-w-[200px] mx-auto" title={req.observacao}>
                                    {req.observacao || '-'}
                                  </span>
                                ) : (
                                  <span className="text-xs text-gray-400">-</span>
                                )}
                              </TableCell>

                              {/* Coluna Ações */}
                              <TableCell className="text-center py-3 px-3">
                                <div className="flex items-center justify-center gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleVisualizarRequerimento(req)}
                                    className="h-8 w-8 p-0"
                                    title="Visualizar detalhes do requerimento"
                                  >
                                    <Eye className="h-4 w-4 text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-200" />
                                  </Button>
                                  
                                  <ProtectedAction screenKey="faturar_requerimentos" requiredLevel="edit">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleAbrirConfirmacaoRejeicao(req)}
                                      disabled={rejeitarRequerimento.isPending}
                                      className="h-8 w-8 p-0"
                                      title="Rejeitar requerimento"
                                    >
                                      <X className="h-4 w-4 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200" />
                                    </Button>
                                  </ProtectedAction>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>
        )}

        {/* Modal de Visualização de Detalhes */}
        <RequerimentoViewModal
          requerimento={requerimentoParaVisualizar}
          open={modalVisualizacaoAberto}
          onClose={() => setModalVisualizacaoAberto(false)}
        />

        {/* Modal de Email */}
        <Dialog 
          key={modalEmailAberto ? 'modal-open' : 'modal-closed'} 
          open={modalEmailAberto} 
          onOpenChange={setModalEmailAberto}
        >
          <DialogContent className="max-w-7xl max-h-[95vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Disparar Faturamento por Email
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-6">
              {/* Destinatários */}
              <div>
                <Label className="text-base font-medium">Destinatários</Label>
                
                {/* Campo único para emails separados por ponto e vírgula */}
                <div className="mt-2">
                  <textarea
                    placeholder="Cole ou digite emails separados por ponto e vírgula (;)&#10;Ex: joao@exemplo.com; maria@exemplo.com; pedro@exemplo.com"
                    className="w-full p-3 border rounded-md text-sm min-h-[100px] bg-white dark:bg-gray-800 font-mono"
                    value={destinatariosTexto}
                    onChange={(e) => handleAtualizarDestinatariosTexto(e.target.value)}
                    onPaste={(e) => {
                      e.preventDefault();
                      const texto = e.clipboardData.getData('text');
                      handleColarEmails(texto, 'destinatarios');
                    }}
                  />               
                  {destinatarios.length > 0 && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                      ✓ {destinatarios.length} email(s) adicionado(s)
                    </p>
                  )}
                </div>
              </div>

              {/* Campo CC */}
              <div>
                <Label className="text-base font-medium">Destinatários em Cópia (CC) - Opcional</Label>
                
                {/* Campo único para emails CC separados por ponto e vírgula */}
                <div className="mt-2">
                  <textarea
                    placeholder="Cole ou digite emails em cópia separados por ponto e vírgula (;)&#10;Ex: joao@exemplo.com; maria@exemplo.com; pedro@exemplo.com"
                    className="w-full p-3 border rounded-md text-sm min-h-[100px] bg-white dark:bg-gray-800 font-mono"
                    value={destinatariosCCTexto}
                    onChange={(e) => handleAtualizarCCTexto(e.target.value)}
                    onPaste={(e) => {
                      e.preventDefault();
                      const texto = e.clipboardData.getData('text');
                      handleColarEmails(texto, 'cc');
                    }}
                  />
                  {destinatariosCC.length > 0 && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                      ✓ {destinatariosCC.length} email(s) em cópia adicionado(s)
                    </p>
                  )}
                </div>
              </div>

              {/* Campo BCC */}
              <div>
                <Label className="text-base font-medium">Destinatários em Cópia Oculta (BCC) - Opcional</Label>
                
                {/* Campo único para emails BCC separados por ponto e vírgula */}
                <div className="mt-2">
                  <textarea
                    placeholder="Cole ou digite emails em cópia oculta separados por ponto e vírgula (;)&#10;Ex: joao@exemplo.com; maria@exemplo.com; pedro@exemplo.com"
                    className="w-full p-3 border rounded-md text-sm min-h-[100px] bg-white dark:bg-gray-800 font-mono"
                    value={destinatariosBCCTexto}
                    onChange={(e) => handleAtualizarBCCTexto(e.target.value)}
                    onPaste={(e) => {
                      e.preventDefault();
                      const texto = e.clipboardData.getData('text');
                      handleColarEmails(texto, 'bcc');
                    }}
                  />
                  {destinatariosBCC.length > 0 && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                      ✓ {destinatariosBCC.length} email(s) em cópia oculta adicionado(s)
                    </p>
                  )}
                </div>
              </div>

              {/* Assunto */}
              <div>
                <Label htmlFor="assunto" className="text-base font-medium">
                  Assunto
                </Label>
                <Input
                  id="assunto"
                  value={assuntoEmail}
                  onChange={(e) => setAssuntoEmail(e.target.value)}
                  placeholder="Assunto do email"
                  className="mt-2"
                />
              </div>

              {/* Anexos */}
              <div>
                <Label className="text-base font-medium">Anexos</Label>
                <div className="mt-2">
                  {/* Botão para adicionar anexos */}
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => document.getElementById('file-input')?.click()}
                      className="flex items-center gap-2"
                    >
                      <FileText className="h-4 w-4" />
                      Adicionar Arquivos
                    </Button>
                    <input
                      id="file-input"
                      type="file"
                      multiple
                      className="hidden"
                      onChange={handleAdicionarAnexos}
                      accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.jpg,.jpeg,.png"
                    />
                    <span className="text-xs text-gray-500">
                      Limite: 25MB total
                    </span>
                  </div>

                  {/* Lista de anexos */}
                  {anexos.length > 0 && (
                    <div className="mt-3 space-y-2">
                      <div className="flex items-center justify-between text-sm font-medium text-gray-700 dark:text-gray-300">
                        <span>{anexos.length} arquivo(s) anexado(s)</span>
                        <span className="text-xs text-gray-500">
                          Total: {formatarTamanhoArquivo(anexos.reduce((acc, file) => acc + file.size, 0))}
                        </span>
                      </div>
                      <div className="border rounded-lg divide-y dark:divide-gray-700">
                        {anexos.map((file, index) => (
                          <div key={index} className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-800">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <FileText className="h-5 w-5 text-blue-600 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                  {file.name}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {formatarTamanhoArquivo(file.size)}
                                </p>
                              </div>
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleRemoverAnexo(index)}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Preview do Relatório */}
              <div>
                <Label className="text-base font-medium">Preview do Relatório</Label>
                {/* Preview do Relatório */}
                <div className="mt-2">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                    Preview do Relatório
                  </h4>
                  <div className="border rounded-lg overflow-hidden bg-white dark:bg-gray-900">
                    <div className="bg-gray-100 dark:bg-gray-800 p-3 border-b">
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {(() => {
                          // Calcular estatísticas dos requerimentos selecionados
                          const allReqs = abaAtiva === 'para_faturar'
                            ? dadosFaturamento?.requerimentos || []
                            : dadosFaturados || [];
                          const selReqs = allReqs.filter(req => requerimentosSelecionados.includes(req.id));
                          const tiposComValor = ['Faturado', 'Hora Extra', 'Sobreaviso', 'Bolsão Enel'];
                          let totalH = '0:00';
                          let totalV = 0;
                          selReqs.forEach(req => {
                            if (req.horas_total) totalH = somarHoras(totalH, req.horas_total.toString());
                            if (tiposComValor.includes(req.tipo_cobranca) && req.valor_total_geral) totalV += req.valor_total_geral;
                          });
                          return (
                            <>
                              <strong>Período:</strong> {nomesMeses[mesSelecionado - 1]} {anoSelecionado} |
                              <strong> Requerimentos:</strong> {selReqs.length} |
                              <strong> Horas:</strong> {formatarHorasParaExibicao(totalH, 'completo')} |
                              <strong> Valor:</strong> R$ {totalV.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </>
                          );
                        })()}
                      </div>
                    </div>
                    <div
                      className="max-h-[600px] overflow-y-auto p-4"
                      dangerouslySetInnerHTML={{ __html: corpoEmail }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setModalEmailAberto(false)}
              >
                Cancelar
              </Button>
              <Button
                onClick={() => setConfirmacaoAberta(true)}
                disabled={!isFormularioValido()}
              >
                <Send className="h-4 w-4 mr-2" />
                Enviar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Confirmação de Envio */}
        <AlertDialog open={confirmacaoAberta} onOpenChange={setConfirmacaoAberta}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <Send className="h-5 w-5 text-blue-600" />
                Confirmar Disparo de Faturamento
              </AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja disparar o faturamento para{' '}
                <strong>{destinatarios.filter(e => e.trim()).length} destinatário(s)</strong>?
                <br /><br />
                <strong>Período:</strong> {nomesMeses[mesSelecionado - 1]} {anoSelecionado}
                <br />
                <strong>Requerimentos selecionados:</strong> {requerimentosSelecionados.length}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={enviandoEmail}>
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDispararFaturamento}
                disabled={enviandoEmail}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {enviandoEmail ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Processando...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Confirmar Disparo
                  </>
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Confirmação de Rejeição */}
        <AlertDialog open={confirmacaoRejeicaoAberta} onOpenChange={setConfirmacaoRejeicaoAberta}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                Confirmar Rejeição de Requerimento
              </AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja rejeitar este requerimento?
                <br /><br />
                <strong>Chamado:</strong> {requerimentoParaRejeitar?.chamado}
                <br />
                <strong>Cliente:</strong> <ClienteNomeDisplay nomeEmpresa={requerimentoParaRejeitar?.cliente_nome} className="inline" />
                <br />
                <strong>Horas Total:</strong> {requerimentoParaRejeitar ? formatarHorasParaExibicao(requerimentoParaRejeitar.horas_total?.toString() || '0', 'completo') : '0:00'}
                <br /><br />
                <span className="text-amber-600">
                  ⚠️ O requerimento voltará para a tela "Lançar Requerimentos" e precisará ser enviado novamente para faturamento.
                </span>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={rejeitarRequerimento.isPending}>
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleConfirmarRejeicao}
                disabled={rejeitarRequerimento.isPending}
                className="bg-red-600 hover:bg-red-700"
              >
                {rejeitarRequerimento.isPending ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Rejeitando...
                  </>
                ) : (
                  <>
                    <X className="h-4 w-4 mr-2" />
                    Confirmar Rejeição
                  </>
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

      </div>
    </AdminLayout>
  );
}
