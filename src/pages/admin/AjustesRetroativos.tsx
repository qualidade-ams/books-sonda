/**
 * Página de Ajustes Retroativos do Banco de Horas
 * 
 * Permite visualizar, aprovar ou descartar atualizações que chegaram
 * após o fechamento do período (geração do book).
 * 
 * @module pages/admin/AjustesRetroativos
 */

import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  Clock,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Filter,
  X,
  FileText,
  Building2,
  ChevronRight,
  Send,
  Mail,
  Download,
  ChevronDown
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import AdminLayout from '@/components/admin/LayoutAdmin';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import {
  useAjustesRetroativos,
  useAjustesPendentesCount,
  useAprovarAjuste,
  useDescartarAjuste
} from '@/hooks/useAjustesRetroativos';
import { useEmpresas } from '@/hooks/useEmpresas';
import { bancoHorasQuarentenaService } from '@/services/bancoHorasQuarentenaService';
import type { AjusteRetroativo } from '@/services/bancoHorasQuarentenaService';
import { emailService } from '@/services/emailService';
import { supabase } from '@/integrations/supabase/client';

// Interface para item de detalhe selecionável
interface DetalheItem {
  id: string; // unique key: ajusteId-idx
  ajusteId: string;
  chamado: string;
  tarefa: string | null;
  consultor: string | null;
  empresa: string;
}

export default function AjustesRetroativos() {
  const { t } = useTranslation();

  // Nomes dos meses via i18n
  const monthKeys = [
    'january', 'february', 'march', 'april', 'may', 'june',
    'july', 'august', 'september', 'october', 'november', 'december'
  ];
  const getMonthName = (monthIndex: number) => t(`monthPicker.months.${monthKeys[monthIndex]}`);

  // Estado de filtros
  const [showFilters, setShowFilters] = useState(false);
  const [filtros, setFiltros] = useState({
    empresaId: 'all',
    consultor: 'all',
  });

  // Estado de modais
  const [modalAprovar, setModalAprovar] = useState<AjusteRetroativo | null>(null);
  const [modalDescartar, setModalDescartar] = useState<AjusteRetroativo | null>(null);
  const [motivoDecisao, setMotivoDecisao] = useState('');

  // Estado de linhas expandidas
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

  // Estado de seleção de itens para email
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
  const [sentItems, setSentItems] = useState<Set<string>>(new Set());

  // Estado do modal de email
  const [modalEmailAberto, setModalEmailAberto] = useState(false);
  const [emailDestinatario, setEmailDestinatario] = useState('');
  const [emailCC, setEmailCC] = useState('');
  const [emailBCC, setEmailBCC] = useState('');
  const [emailAssunto, setEmailAssunto] = useState('Ajuste de Apontamento - Banco de Horas');
  const [emailCorpo, setEmailCorpo] = useState('');
  const [enviandoEmail, setEnviandoEmail] = useState(false);
  const [anexos, setAnexos] = useState<File[]>([]);
  const [mesAplicacao, setMesAplicacao] = useState<number>(() => {
    const hoje = new Date();
    return hoje.getMonth() + 1;
  });
  const [anoAplicacao, setAnoAplicacao] = useState<number>(() => {
    return new Date().getFullYear();
  });

  // Dados
  const { empresas } = useEmpresas();
  const pendentesCount = useAjustesPendentesCount();
  const { ajustes, isLoading, refetch: refetchAjustes } = useAjustesRetroativos({
    empresaId: filtros.empresaId !== 'all' ? filtros.empresaId : undefined,
  });

  // Mutations
  const aprovarMutation = useAprovarAjuste();
  const descartarMutation = useDescartarAjuste();

  // Detecção automática ao abrir a tela
  const deteccaoExecutada = useRef(false);
  const [isDetectando, setIsDetectando] = useState(false);

  useEffect(() => {
    if (deteccaoExecutada.current) return;
    deteccaoExecutada.current = true;

    const executarDeteccaoAutomatica = async () => {
      try {
        setIsDetectando(true);
        console.log('🔍 Executando detecção automática (últimos 2 meses)...');
        const ajustes = await bancoHorasQuarentenaService.executarDeteccaoRecente(2);
        console.log('✅ Detecção automática concluída:', ajustes.length, 'ajustes');
        if (ajustes.length > 0) {
          // Forçar refetch dos dados da tela
          refetchAjustes();
        }
      } catch (error) {
        console.error('⚠️ Erro na detecção automática:', error);
      } finally {
        setIsDetectando(false);
      }
    };

    executarDeteccaoAutomatica();
  }, []);

  // Empresas ativas com AMS
  const empresasAtivas = useMemo(() => {
    if (!empresas) return [];
    return empresas.filter(e => e.status === 'ativo' && e.tem_ams === true);
  }, [empresas]);

  // Mapa de empresas para exibir nomes
  const empresasMap = useMemo(() => {
    const map = new Map<string, string>();
    empresas?.forEach(e => {
      map.set(e.id, e.nome_abreviado || e.nome_completo);
    });
    return map;
  }, [empresas]);

  // Handlers
  const hasActiveFilters = () => {
    return filtros.empresaId !== 'all' || filtros.consultor !== 'all';
  };

  const limparFiltros = () => {
    setFiltros({ empresaId: 'all', consultor: 'all' });
  };

  const toggleExpandRow = (id: string) => {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Toggle seleção de item de detalhe
  const toggleItemSelection = (itemId: string) => {
    setSelectedItems(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  };

  // Lista de consultores únicos para filtro
  const consultoresUnicos = useMemo(() => {
    const consultores = new Set<string>();
    ajustes.forEach(ajuste => {
      const detalhes = ajuste.detalhes_mudanca;
      if (!detalhes) return;
      const processarLista = (lista: any[]) => {
        lista.forEach(item => {
          if (item.analista_tarefa) {
            consultores.add(item.analista_tarefa);
          }
        });
      };
      if (detalhes.novos && Array.isArray(detalhes.novos)) processarLista(detalhes.novos);
      if (detalhes.removidos && Array.isArray(detalhes.removidos)) processarLista(detalhes.removidos);
    });
    return Array.from(consultores).sort();
  }, [ajustes]);

  // Filtrar ajustes por consultor
  const ajustesFiltrados = useMemo(() => {
    if (filtros.consultor === 'all') return ajustes;
    return ajustes.filter(ajuste => {
      const detalhes = ajuste.detalhes_mudanca;
      if (!detalhes) return false;
      const verificarLista = (lista: any[]) => lista.some(item => item.analista_tarefa === filtros.consultor);
      const temNovos = detalhes.novos && Array.isArray(detalhes.novos) && verificarLista(detalhes.novos);
      const temRemovidos = detalhes.removidos && Array.isArray(detalhes.removidos) && verificarLista(detalhes.removidos);
      return temNovos || temRemovidos;
    });
  }, [ajustes, filtros.consultor]);

  // Obter itens selecionados como objetos DetalheItem
  const getItensSelecionados = (): DetalheItem[] => {
    const itens: DetalheItem[] = [];
    ajustesFiltrados.forEach(ajuste => {
      const detalhesItensBruto = extrairDetalhesAgrupados(ajuste);
      const detalhesItens = filtros.consultor !== 'all'
        ? detalhesItensBruto.filter(item => item.consultor === filtros.consultor)
        : detalhesItensBruto;
      detalhesItens.forEach((item, idx) => {
        const itemId = `${ajuste.id}-${idx}`;
        if (selectedItems.has(itemId)) {
          itens.push({
            id: itemId,
            ajusteId: ajuste.id,
            chamado: item.chamado,
            tarefa: item.tarefa,
            consultor: item.consultor,
            empresa: empresasMap.get(ajuste.empresa_id) || 'N/A',
          });
        }
      });
    });
    return itens;
  };

  // Buscar email do consultor na tabela especialistas
  const buscarEmailConsultor = async (nomeConsultor: string): Promise<string | null> => {
    try {
      const { data } = await supabase
        .from('especialistas')
        .select('email')
        .ilike('nome', `%${nomeConsultor}%`)
        .eq('status', 'ativo')
        .limit(1);
      if (data && data.length > 0 && data[0].email) {
        return data[0].email;
      }
      return null;
    } catch (error) {
      console.error('Erro ao buscar email do consultor:', error);
      return null;
    }
  };

  // Gerar corpo do email (texto para edição)
  const gerarCorpoEmail = (itens: DetalheItem[]): string => {
    if (itens.length === 0) return '';

    // Pegar primeiro nome do consultor
    const nomeConsultor = itens[0]?.consultor || 'Consultor';
    const primeiroNome = nomeConsultor.split(' ')[0];

    const plural = itens.length > 1;

    // Calcular horas totais dos apontamentos selecionados
    const totalMinutos = calcularHorasItensSelecionados(itens);
    const horas = Math.floor(totalMinutos / 60);
    const minutos = totalMinutos % 60;
    const horasFormatadas = `${horas}h${minutos > 0 ? String(minutos).padStart(2, '0') + 'min' : ''}`;

    // Obter período de referência
    const periodoInfo = obterPeriodoReferencia(itens);

    const corpo = `Prezado(a) ${primeiroNome},

Identificamos que ${plural ? 'foram realizados apontamentos incorretos em tarefas' : 'foi realizado um apontamento incorreto em uma tarefa'}. Em função ${plural ? 'desses apontamentos' : 'desse apontamento'}, as horas registradas não serão contabilizadas no banco de horas do cliente.

Período: ${periodoInfo} | Requerimentos: ${itens.length} | Horas: ${horasFormatadas}

Caso ${plural ? 'os chamados ainda estejam Abertos ou com status Resolved' : 'o chamado ainda esteja Aberto ou com status Resolved'}, solicitamos que seja realizado o ajuste da seguinte forma:

- Excluir ${plural ? 'as tarefas com os apontamentos incorretos' : 'a tarefa com o apontamento incorreto'};
- Criar ${plural ? 'novas tarefas' : 'uma nova tarefa'} para que o desconto das horas ocorra no período vigente.

Essa ação é necessária para garantir que as horas sejam contabilizadas corretamente no banco do cliente.

Em caso de dúvidas, por favor, entre em contato.

Obrigado.`;

    return corpo;
  };

  // Calcular total de horas (minutos) dos itens selecionados
  const calcularHorasItensSelecionados = (itens: DetalheItem[]): number => {
    let totalMinutos = 0;
    ajustesFiltrados.forEach(ajuste => {
      const detalhes = ajuste.detalhes_mudanca;
      if (!detalhes) return;

      const processarLista = (lista: any[]) => {
        lista.forEach((item, idx) => {
          const itemId = `${ajuste.id}-${idx}`;
          // Verificar se este item está na lista de selecionados
          if (itens.some(i => i.id === itemId) && item.tempo_gasto_minutos) {
            totalMinutos += item.tempo_gasto_minutos;
          }
        });
      };

      if (detalhes.novos && Array.isArray(detalhes.novos)) processarLista(detalhes.novos);
      if (detalhes.removidos && Array.isArray(detalhes.removidos)) processarLista(detalhes.removidos);
    });
    return totalMinutos;
  };

  // Obter período de referência dos itens selecionados
  const obterPeriodoReferencia = (itens: DetalheItem[]): string => {
    const mesesAnos = new Set<string>();
    ajustesFiltrados.forEach(ajuste => {
      // Verificar se algum item deste ajuste está na seleção
      const temItemSelecionado = itens.some(i => i.ajusteId === ajuste.id);
      if (temItemSelecionado) {
        const nomeMes = getMonthName(ajuste.mes_referencia - 1);
        mesesAnos.add(`${nomeMes} ${ajuste.ano_referencia}`);
      }
    });
    return Array.from(mesesAnos).join(', ') || 'N/A';
  };

  // Gerar HTML do email com tabela de apontamentos
  const gerarHtmlEmail = (itens: DetalheItem[], corpoTexto: string): string => {
    // Calcular horas totais
    const totalMinutos = calcularHorasItensSelecionados(itens);
    const horas = Math.floor(totalMinutos / 60);
    const minutos = totalMinutos % 60;
    const horasFormatadas = `${horas}h${minutos > 0 ? String(minutos).padStart(2, '0') + 'min' : ''}`;
    const periodoInfo = obterPeriodoReferencia(itens);

    const tabelaRows = itens.map(item => `
      <tr>
        <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; font-size: 13px;">${item.empresa}</td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; font-size: 13px;">${item.chamado}</td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; font-size: 13px; color: #2563eb;">${item.tarefa || '-'}</td>
        <td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; font-size: 13px;">${item.consultor || '-'}</td>
      </tr>`).join('');

    const corpoHtml = corpoTexto
      .replace(/\n\n/g, '</p><p style="margin: 12px 0;">')
      .replace(/\n- /g, '<br/>• ')
      .replace(/\n/g, '<br/>');

    return `
    <div style="font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto;">
      <div style="background: linear-gradient(135deg, #2563eb, #1d4ed8); padding: 24px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 20px;">Ajuste de Apontamento</h1>
        <p style="color: #bfdbfe; margin: 8px 0 0 0; font-size: 14px;">Banco de Horas - ${itens.length} apontamento${itens.length > 1 ? 's' : ''}</p>
      </div>
      
      <div style="padding: 24px; background: #ffffff; border: 1px solid #e5e7eb; border-top: none;">
        <p style="margin: 12px 0; font-size: 14px; color: #374151; line-height: 1.6;">${corpoHtml}</p>
      </div>

      <div style="padding: 12px 24px; background: #f0f9ff; border: 1px solid #e5e7eb; border-top: none;">
        <div style="display: flex; gap: 24px; font-size: 13px; color: #1e40af;">
          <span><strong>Período:</strong> ${periodoInfo}</span>
          <span style="margin-left: 16px;"><strong>Requerimentos:</strong> ${itens.length}</span>
          <span style="margin-left: 16px;"><strong>Horas:</strong> ${horasFormatadas}</span>
        </div>
      </div>

      <div style="padding: 16px 24px; background: #f9fafb; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
        <div style="background: #f59e0b; color: white; padding: 8px 16px; border-radius: 4px; margin-bottom: 12px; display: flex; justify-content: space-between; align-items: center;">
          <span style="font-weight: 600; font-size: 13px;">Apontamentos Identificados</span>
          <span style="font-size: 12px;">${itens.length} item${itens.length > 1 ? 's' : ''}</span>
        </div>
        <table style="width: 100%; border-collapse: collapse; background: white; border-radius: 4px; overflow: hidden; border: 1px solid #e5e7eb;">
          <thead>
            <tr style="background: #f3f4f6;">
              <th style="padding: 10px 12px; text-align: left; font-size: 12px; font-weight: 600; color: #374151; border-bottom: 2px solid #e5e7eb;">Empresa</th>
              <th style="padding: 10px 12px; text-align: left; font-size: 12px; font-weight: 600; color: #374151; border-bottom: 2px solid #e5e7eb;">Chamado</th>
              <th style="padding: 10px 12px; text-align: left; font-size: 12px; font-weight: 600; color: #374151; border-bottom: 2px solid #e5e7eb;">Tarefa</th>
              <th style="padding: 10px 12px; text-align: left; font-size: 12px; font-weight: 600; color: #374151; border-bottom: 2px solid #e5e7eb;">Consultor</th>
            </tr>
          </thead>
          <tbody>
            ${tabelaRows}
          </tbody>
        </table>
      </div>
    </div>`;
  };

  // Abrir modal de email
  const handleAbrirModalEmail = async () => {
    const itens = getItensSelecionados();
    if (itens.length === 0) {
      toast.error('Selecione ao menos um apontamento para enviar email.');
      return;
    }

    // Buscar email do consultor
    const consultor = itens[0]?.consultor;
    let email = '';
    if (consultor) {
      const emailEncontrado = await buscarEmailConsultor(consultor);
      email = emailEncontrado || '';
    }

    setEmailDestinatario(email);
    setEmailCC('');
    setEmailBCC('');
    setAnexos([]);
    setEmailCorpo(gerarCorpoEmail(itens));
    setEmailAssunto('Ajuste de Apontamento - Banco de Horas');
    setModalEmailAberto(true);
  };

  // Gerenciar anexos
  const handleAdicionarAnexos = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const novosAnexos = Array.from(files);
      const tamanhoTotal = [...anexos, ...novosAnexos].reduce((acc, file) => acc + file.size, 0);
      const limiteBytes = 25 * 1024 * 1024;

      if (tamanhoTotal > limiteBytes) {
        toast.error('O tamanho total dos anexos não pode exceder 25MB');
        return;
      }

      setAnexos(prev => [...prev, ...novosAnexos]);
    }
  };

  const handleRemoverAnexo = (index: number) => {
    setAnexos(prev => prev.filter((_, i) => i !== index));
  };

  const formatarTamanhoArquivo = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  // Enviar email
  const handleEnviarEmail = async () => {
    if (!emailDestinatario.trim()) {
      toast.error('Informe o email do destinatário.');
      return;
    }

    setEnviandoEmail(true);
    try {
      const itens = getItensSelecionados();
      const htmlEmail = gerarHtmlEmail(itens, emailCorpo);

      // Parsear destinatários (separados por ; ou ,)
      const parseEmails = (str: string) => str.split(/[;,]/).map(e => e.trim()).filter(Boolean);
      const destinatarios = parseEmails(emailDestinatario);
      const cc = emailCC.trim() ? parseEmails(emailCC) : undefined;
      const bcc = emailBCC.trim() ? parseEmails(emailBCC) : undefined;

      // Converter anexos File[] para base64
      const anexosBase64 = await Promise.all(
        anexos.map(async (file) => {
          return new Promise<{ filename: string; content: string; contentType: string }>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
              const base64 = (reader.result as string).split(',')[1];
              resolve({
                filename: file.name,
                content: base64,
                contentType: file.type
              });
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });
        })
      );

      const resultado = await emailService.sendEmail({
        to: destinatarios,
        cc,
        bcc,
        subject: emailAssunto,
        html: htmlEmail,
        attachments: anexosBase64.length > 0 ? anexosBase64 : undefined,
      });

      if (resultado.success) {
        toast.success(`Email enviado com sucesso para ${destinatarios.length} destinatário(s)!`);
        // Marcar itens como enviados
        setSentItems(prev => {
          const next = new Set(prev);
          selectedItems.forEach(id => next.add(id));
          return next;
        });
        setModalEmailAberto(false);
        setSelectedItems(new Set());
        setAnexos([]);
      } else {
        toast.error(resultado.error || 'Erro ao enviar email.');
      }
    } catch (error) {
      console.error('Erro ao enviar email:', error);
      toast.error('Erro ao enviar email.');
    } finally {
      setEnviandoEmail(false);
    }
  };

  // Exportar para Excel
  const handleExportarExcel = async () => {
    try {
      const XLSX = await import('xlsx-js-style');
      const dados: any[][] = [];

      // Cabeçalho
      const headers = [
        'Empresa', 'Período Ref.', 'Valor Anterior', 'Valor Novo',
        'Diferença', 'Status', 'Data', 'Consultor', 'Chamado', 'Tarefa'
      ];
      dados.push(headers);

      // Dados
      ajustesFiltrados.forEach(ajuste => {
        const detalhesItensBruto = extrairDetalhesAgrupados(ajuste);
        const detalhesItens = filtros.consultor !== 'all'
          ? detalhesItensBruto.filter(item => item.consultor === filtros.consultor)
          : detalhesItensBruto;

        detalhesItens.forEach(item => {
          dados.push([
            empresasMap.get(ajuste.empresa_id) || 'N/A',
            `${getMonthName(ajuste.mes_referencia - 1)}/${ajuste.ano_referencia}`,
            ajuste.valor_anterior || '-',
            ajuste.valor_novo || '-',
            ajuste.diferenca || '-',
            ajuste.status,
            new Date(ajuste.created_at).toLocaleDateString('pt-BR'),
            item.consultor || '-',
            item.chamado || '-',
            item.tarefa || '-',
          ]);
        });
      });

      const ws = XLSX.utils.aoa_to_sheet(dados);

      // Estilo do cabeçalho: fundo azul com texto branco
      const headerStyle = {
        font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 11 },
        fill: { fgColor: { rgb: '2563EB' } },
        alignment: { horizontal: 'center', vertical: 'center' },
        border: {
          top: { style: 'thin', color: { rgb: '1D4ED8' } },
          bottom: { style: 'thin', color: { rgb: '1D4ED8' } },
          left: { style: 'thin', color: { rgb: '1D4ED8' } },
          right: { style: 'thin', color: { rgb: '1D4ED8' } },
        }
      };

      // Aplicar estilo ao cabeçalho
      for (let col = 0; col < headers.length; col++) {
        const cellRef = XLSX.utils.encode_cell({ r: 0, c: col });
        if (ws[cellRef]) {
          ws[cellRef].s = headerStyle;
        }
      }

      // Ajustar largura das colunas
      ws['!cols'] = [
        { wch: 20 }, // Empresa
        { wch: 14 }, // Período Ref.
        { wch: 14 }, // Valor Anterior
        { wch: 14 }, // Valor Novo
        { wch: 10 }, // Diferença
        { wch: 12 }, // Status
        { wch: 12 }, // Data
        { wch: 25 }, // Consultor
        { wch: 15 }, // Chamado
        { wch: 15 }, // Tarefa
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Ajustes Retroativos');
      XLSX.writeFile(wb, `ajustes_retroativos_${new Date().toISOString().slice(0, 10)}.xlsx`);
      toast.success('Excel exportado com sucesso!');
    } catch (error) {
      console.error('Erro ao exportar Excel:', error);
      toast.error('Erro ao exportar Excel.');
    }
  };

  // Exportar para PDF
  const handleExportarPDF = async () => {
    try {
      const { default: jsPDF } = await import('jspdf');
      const { default: autoTable } = await import('jspdf-autotable');

      const doc = new jsPDF({ orientation: 'landscape' });
      doc.setFontSize(16);
      doc.text('Ajustes Retroativos - Banco de Horas', 14, 15);
      doc.setFontSize(10);
      doc.text(`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`, 14, 22);

      const dados: string[][] = [];

      ajustesFiltrados.forEach(ajuste => {
        const detalhesItensBruto = extrairDetalhesAgrupados(ajuste);
        const detalhesItens = filtros.consultor !== 'all'
          ? detalhesItensBruto.filter(item => item.consultor === filtros.consultor)
          : detalhesItensBruto;

        detalhesItens.forEach(item => {
          dados.push([
            empresasMap.get(ajuste.empresa_id) || 'N/A',
            `${getMonthName(ajuste.mes_referencia - 1)}/${ajuste.ano_referencia}`,
            ajuste.valor_anterior || '-',
            ajuste.valor_novo || '-',
            ajuste.diferenca || '-',
            ajuste.status,
            new Date(ajuste.created_at).toLocaleDateString('pt-BR'),
            item.consultor || '-',
            item.chamado || '-',
            item.tarefa || '-',
          ]);
        });
      });

      autoTable(doc, {
        startY: 28,
        head: [['Empresa', 'Período', 'V. Anterior', 'V. Novo', 'Diferença', 'Status', 'Data', 'Consultor', 'Chamado', 'Tarefa']],
        body: dados,
        styles: { fontSize: 7 },
        headStyles: { fillColor: [37, 99, 235] },
      });

      doc.save(`ajustes_retroativos_${new Date().toISOString().slice(0, 10)}.pdf`);
      toast.success('PDF exportado com sucesso!');
    } catch (error) {
      console.error('Erro ao exportar PDF:', error);
      toast.error('Erro ao exportar PDF.');
    }
  };

  const handleAprovar = async () => {
    if (!modalAprovar || !motivoDecisao.trim()) return;

    await aprovarMutation.mutateAsync({
      ajusteId: modalAprovar.id,
      motivo: motivoDecisao,
      mesAplicacao: modalAprovar.mes_referencia,
      anoAplicacao: modalAprovar.ano_referencia
    });

    setModalAprovar(null);
    setMotivoDecisao('');
  };

  const handleDescartar = async () => {
    if (!modalDescartar || !motivoDecisao.trim()) return;

    await descartarMutation.mutateAsync({
      ajusteId: modalDescartar.id,
      motivo: motivoDecisao
    });

    setModalDescartar(null);
    setMotivoDecisao('');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pendente':
        return <Badge className="bg-yellow-100 text-yellow-800">{t('ajustesRetroativos.statusPending')}</Badge>;
      case 'aprovado':
        return <Badge className="bg-green-100 text-green-800">{t('ajustesRetroativos.statusApproved')}</Badge>;
      case 'descartado':
        return <Badge className="bg-red-100 text-red-800">{t('ajustesRetroativos.statusDiscarded')}</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const getTipoDadoLabel = (tipo: string) => {
    switch (tipo) {
      case 'apontamento_horas': return t('ajustesRetroativos.typeHours');
      case 'apontamento_tickets': return t('ajustesRetroativos.typeTickets');
      case 'requerimento': return t('ajustesRetroativos.typeRequirements');
      default: return tipo;
    }
  };

  // Extrair detalhes agrupados por chamado/tarefa/consultor
  const extrairDetalhesAgrupados = (ajuste: AjusteRetroativo) => {
    const detalhes = ajuste.detalhes_mudanca;
    if (!detalhes) return [];

    const itens: Array<{ chamado: string; tarefa: string | null; consultor: string | null }> = [];

    const processarItens = (lista: any[]) => {
      for (const item of lista) {
        let chamado = item.nro_chamado || '';
        let tarefa: string | null = null;
        const consultor = item.analista_tarefa || null;

        // Extrair chamado e tarefa do id_externo (formato: AMSapontamento|{chamado}|{tarefa})
        if (item.id_externo) {
          const partes = item.id_externo.split('|');
          if (partes.length >= 2 && !chamado) {
            chamado = partes[1];
          }
          if (partes.length >= 3) {
            tarefa = partes[2];
          }
        }

        // nro_solicitacao para tickets
        if (item.nro_solicitacao) {
          chamado = chamado || item.nro_solicitacao;
        }

        if (chamado) {
          itens.push({ chamado, tarefa, consultor });
        }
      }
    };

    if (detalhes.novos && Array.isArray(detalhes.novos)) {
      processarItens(detalhes.novos);
    }
    if (detalhes.removidos && Array.isArray(detalhes.removidos)) {
      processarItens(detalhes.removidos);
    }

    return itens;
  };

  return (
    <AdminLayout>
      <div className="min-h-screen bg-bg-secondary">
        <div className="px-6 py-6 space-y-8">
          {/* Cabeçalho */}
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
                {t('ajustesRetroativos.title')}
              </h1>
              <p className="text-muted-foreground mt-1">
                {t('ajustesRetroativos.subtitle')}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="flex items-center gap-2">
                    <Download className="h-4 w-4" />
                    <span>Exportar</span>
                    <ChevronDown className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={handleExportarExcel}>
                    <FileText className="h-4 w-4 mr-2" />
                    Exportar para Excel
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleExportarPDF}>
                    <FileText className="h-4 w-4 mr-2" />
                    Exportar para PDF
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              {selectedItems.size > 0 && (
                <Button
                  size="sm"
                  className="bg-sonda-blue hover:bg-sonda-dark-blue"
                  onClick={handleAbrirModalEmail}
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Enviar Email ({selectedItems.size})
                </Button>
              )}
            </div>
          </div>

          {/* Cards de Estatísticas */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 lg:gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs lg:text-sm font-medium text-yellow-600">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    {t('ajustesRetroativos.pending')}
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-xl lg:text-2xl font-bold text-yellow-600">
                  {pendentesCount}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs lg:text-sm font-medium text-green-600">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    {t('ajustesRetroativos.approved')}
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-xl lg:text-2xl font-bold text-green-600">
                  {ajustes.filter(a => a.status === 'aprovado').length}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs lg:text-sm font-medium text-red-600">
                  <div className="flex items-center gap-2">
                    <XCircle className="h-4 w-4" />
                    {t('ajustesRetroativos.discarded')}
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-xl lg:text-2xl font-bold text-red-600">
                  {ajustes.filter(a => a.status === 'descartado').length}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabela Principal */}
          <Card className="w-full">
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  {t('ajustesRetroativos.tableTitle')}
                </CardTitle>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowFilters(!showFilters)}
                    className="flex items-center justify-center space-x-2"
                  >
                    <Filter className="h-4 w-4" />
                    <span>{t('common.filter')}</span>
                  </Button>

                  {hasActiveFilters() && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={limparFiltros}
                      className="whitespace-nowrap hover:border-red-300"
                    >
                      <X className="h-4 w-4 mr-2 text-red-600" />
                      {t('common.clearFilter')}
                    </Button>
                  )}
                </div>
              </div>

              {/* Filtros expansíveis */}
              {showFilters && (
                <div className="space-y-4 pt-4 border-t">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm font-medium mb-2">{t('ajustesRetroativos.company')}</div>
                      <Select
                        value={filtros.empresaId}
                        onValueChange={(value) => setFiltros({ ...filtros, empresaId: value })}
                      >
                        <SelectTrigger className="focus:ring-sonda-blue focus:border-sonda-blue">
                          <SelectValue placeholder={t('ajustesRetroativos.allCompanies')} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">{t('ajustesRetroativos.allCompanies')}</SelectItem>
                          {empresasAtivas.map(e => (
                            <SelectItem key={e.id} value={e.id}>
                              {e.nome_abreviado || e.nome_completo}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <div className="text-sm font-medium mb-2">Consultor</div>
                      <Select
                        value={filtros.consultor}
                        onValueChange={(value) => setFiltros({ ...filtros, consultor: value })}
                      >
                        <SelectTrigger className="focus:ring-sonda-blue focus:border-sonda-blue">
                          <SelectValue placeholder="Todos os consultores" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Todos os consultores</SelectItem>
                          {consultoresUnicos.map(c => (
                            <SelectItem key={c} value={c}>{c}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )}
            </CardHeader>

            <CardContent className="space-y-4 overflow-x-auto">
              {(isLoading || isDetectando) ? (
                <div className="space-y-3">
                  {isDetectando && (
                    <div className="text-sm text-sonda-blue flex items-center gap-2 mb-2">
                      <Clock className="h-4 w-4 animate-spin" />
                      {t('ajustesRetroativos.checkingExtemporaneous')}
                    </div>
                  )}
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              ) : ajustesFiltrados.length === 0 ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <CheckCircle className="h-16 w-16 text-green-400 mx-auto mb-4" />
                    <p className="text-gray-500 mb-2 font-medium">
                      {t('ajustesRetroativos.noAdjustmentsFound')}
                    </p>
                    <p className="text-sm text-gray-400">
                      {t('ajustesRetroativos.allPeriodsUpdated')}
                    </p>
                  </div>
                </div>
              ) : (
                <Table className="w-full text-xs sm:text-sm min-w-[900px]">
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10 py-2"></TableHead>
                      <TableHead className="min-w-[140px] text-center text-xs sm:text-sm py-2">{t('ajustesRetroativos.company')}</TableHead>
                      <TableHead className="min-w-[120px] text-center text-xs sm:text-sm py-2">{t('ajustesRetroativos.refPeriod')}</TableHead>
                      <TableHead className="min-w-[100px] text-center text-xs sm:text-sm py-2">{t('ajustesRetroativos.previousValue')}</TableHead>
                      <TableHead className="min-w-[100px] text-center text-xs sm:text-sm py-2">{t('ajustesRetroativos.newValue')}</TableHead>
                      <TableHead className="min-w-[100px] text-center text-xs sm:text-sm py-2">{t('ajustesRetroativos.difference')}</TableHead>
                      <TableHead className="min-w-[90px] text-center text-xs sm:text-sm py-2">{t('common.status')}</TableHead>
                      <TableHead className="min-w-[100px] text-center text-xs sm:text-sm py-2">{t('ajustesRetroativos.date')}</TableHead>
                      <TableHead className="w-24 text-center text-xs sm:text-sm py-2">{t('common.actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ajustesFiltrados.map((ajuste) => {
                      const isExpanded = expandedRows.has(ajuste.id);
                      const detalhesItensBruto = extrairDetalhesAgrupados(ajuste);
                      const detalhesItens = filtros.consultor !== 'all'
                        ? detalhesItensBruto.filter(item => item.consultor === filtros.consultor)
                        : detalhesItensBruto;
                      return (
                      <React.Fragment key={ajuste.id}>
                        <TableRow
                          className="cursor-pointer hover:bg-gray-50"
                          onClick={() => toggleExpandRow(ajuste.id)}
                        >
                          <TableCell className="py-3 w-10">
                            <ChevronRight className={`h-4 w-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                          </TableCell>
                          <TableCell className="py-3">
                            <div className="flex items-center gap-2">
                              <Building2 className="h-4 w-4 text-gray-400 flex-shrink-0" />
                              <span className="font-medium text-xs sm:text-sm lg:text-base">
                                {empresasMap.get(ajuste.empresa_id) || 'N/A'}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-center py-3">
                            <span className="text-xs sm:text-sm lg:text-base">
                              {getMonthName(ajuste.mes_referencia - 1)}/{ajuste.ano_referencia}
                            </span>
                          </TableCell>
                          <TableCell className="text-center py-3">
                            <span className="text-xs sm:text-sm lg:text-base font-medium">
                              {ajuste.valor_anterior || '-'}
                            </span>
                          </TableCell>
                          <TableCell className="text-center py-3">
                            <span className="text-xs sm:text-sm lg:text-base font-medium">
                              {ajuste.valor_novo || '-'}
                            </span>
                          </TableCell>
                          <TableCell className="text-center py-3">
                            <span className={`text-xs sm:text-sm lg:text-base font-bold ${
                              ajuste.diferenca?.startsWith('+') ? 'text-red-600' : 'text-green-600'
                            }`}>
                              {ajuste.diferenca || '-'}
                            </span>
                          </TableCell>
                          <TableCell className="text-center py-3">
                            {getStatusBadge(ajuste.status)}
                          </TableCell>
                          <TableCell className="text-center py-3">
                            <span className="text-[10px] sm:text-xs lg:text-sm text-gray-500">
                              {new Date(ajuste.created_at).toLocaleDateString('pt-BR')}
                            </span>
                          </TableCell>
                          <TableCell className="text-center py-3" onClick={(e) => e.stopPropagation()}>
                            {ajuste.status === 'pendente' && (
                              <div className="flex items-center justify-center gap-1">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 w-7 sm:h-8 sm:w-8 lg:h-9 lg:w-9 p-0 text-green-600 hover:text-green-800"
                                  title={t('ajustesRetroativos.approveTooltip')}
                                  onClick={() => {
                                    setModalAprovar(ajuste);
                                    setMotivoDecisao('');
                                  }}
                                >
                                  <CheckCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 lg:h-5 lg:w-5" />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 w-7 sm:h-8 sm:w-8 lg:h-9 lg:w-9 p-0 text-red-600 hover:text-red-800"
                                  title={t('ajustesRetroativos.discardTooltip')}
                                  onClick={() => {
                                    setModalDescartar(ajuste);
                                    setMotivoDecisao('');
                                  }}
                                >
                                  <XCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 lg:h-5 lg:w-5" />
                                </Button>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>

                        {/* Linha expandida com árvore de detalhes */}
                        {isExpanded && (
                          <TableRow className="bg-gray-50/50 hover:bg-gray-50/50">
                            <TableCell colSpan={9} className="py-3 px-6">
                              <div className="ml-8 space-y-2">
                                <div className="text-[10px] sm:text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                                  Detalhes dos Apontamentos
                                </div>
                                {detalhesItens.length > 0 ? (
                                  <div className="space-y-1.5">
                                    {detalhesItens.map((item, idx) => {
                                      const itemId = `${ajuste.id}-${idx}`;
                                      const foiEnviado = sentItems.has(itemId);
                                      return (
                                      <div key={idx} className={`flex items-center gap-4 py-2 px-3 rounded-md border ${foiEnviado ? 'bg-green-50 border-green-200' : 'bg-white border-gray-100'}`}>
                                        <Checkbox
                                          checked={selectedItems.has(itemId)}
                                          onCheckedChange={() => toggleItemSelection(itemId)}
                                          className="h-4 w-4 flex-shrink-0"
                                        />
                                        {foiEnviado && (
                                          <Mail className="h-3.5 w-3.5 text-green-600 flex-shrink-0" title="Email enviado" />
                                        )}
                                        <div className="flex items-center gap-2">
                                          <FileText className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                                          <span className="text-[10px] sm:text-xs lg:text-sm font-medium text-gray-700">
                                            {item.chamado}
                                          </span>
                                        </div>
                                        {item.tarefa && (
                                          <div className="flex items-center gap-2">
                                            <span className="text-gray-300">—</span>
                                            <span className="text-[10px] sm:text-xs lg:text-sm text-blue-600 font-medium">
                                              {item.tarefa}
                                            </span>
                                          </div>
                                        )}
                                        <div className="flex items-center gap-2">
                                          <span className="text-[10px] sm:text-xs lg:text-sm text-gray-600">
                                            {item.consultor || '-'}
                                          </span>
                                        </div>
                                        {foiEnviado && (
                                          <Badge className="bg-green-100 text-green-700 text-[10px] ml-auto">
                                            Enviado
                                          </Badge>
                                        )}
                                      </div>
                                      );
                                    })}
                                  </div>
                                ) : (
                                  <p className="text-xs text-gray-400 italic">Sem detalhes disponíveis para este ajuste.</p>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Modal Aprovar */}
          <Dialog open={!!modalAprovar} onOpenChange={() => setModalAprovar(null)}>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle className="text-xl font-semibold text-sonda-blue">
                  {t('ajustesRetroativos.approveTitle')}
                </DialogTitle>
                <DialogDescription className="text-sm text-gray-500">
                  {t('ajustesRetroativos.approveDescription')}
                </DialogDescription>
              </DialogHeader>

              {modalAprovar && (
                <div className="space-y-4 py-4">
                  <div className="bg-gray-50 p-3 rounded-lg space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">{t('ajustesRetroativos.company')}:</span>
                      <span className="font-medium">
                        {empresasMap.get(modalAprovar.empresa_id) || 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">{t('ajustesRetroativos.refPeriod')}:</span>
                      <span>{getMonthName(modalAprovar.mes_referencia - 1)}/{modalAprovar.ano_referencia}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">{t('ajustesRetroativos.difference')}:</span>
                      <span className={`font-mono font-semibold ${
                        modalAprovar.diferenca?.startsWith('+') ? 'text-red-600' : 'text-green-600'
                      }`}>
                        {modalAprovar.diferenca}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">{t('ajustesRetroativos.action')}:</span>
                      <span className="text-sm">
                        {t('ajustesRetroativos.actionDescription', { 
                          period: `${getMonthName(modalAprovar.mes_referencia - 1)}/${modalAprovar.ano_referencia}`,
                          from: modalAprovar.valor_anterior,
                          to: modalAprovar.valor_novo
                        })}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">
                      {t('ajustesRetroativos.justification')} <span className="text-red-500">*</span>
                    </Label>
                    <Textarea
                      placeholder={t('ajustesRetroativos.justificationPlaceholder')}
                      value={motivoDecisao}
                      onChange={(e) => setMotivoDecisao(e.target.value)}
                      className="focus:ring-sonda-blue focus:border-sonda-blue"
                      rows={3}
                    />
                  </div>
                </div>
              )}

              <DialogFooter>
                <Button variant="outline" onClick={() => setModalAprovar(null)}>
                  {t('common.cancel')}
                </Button>
                <Button
                  className="bg-green-600 hover:bg-green-700 text-white"
                  onClick={handleAprovar}
                  disabled={!motivoDecisao.trim() || aprovarMutation.isPending}
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {aprovarMutation.isPending ? t('ajustesRetroativos.approving') : t('ajustesRetroativos.approveAndGenerate')}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Modal Descartar */}
          <Dialog open={!!modalDescartar} onOpenChange={() => setModalDescartar(null)}>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle className="text-xl font-semibold text-sonda-blue">
                  {t('ajustesRetroativos.discardTitle')}
                </DialogTitle>
                <DialogDescription className="text-sm text-gray-500">
                  {t('ajustesRetroativos.discardDescription')}
                </DialogDescription>
              </DialogHeader>

              {modalDescartar && (
                <div className="space-y-4 py-4">
                  <div className="bg-gray-50 p-3 rounded-lg space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">{t('ajustesRetroativos.company')}:</span>
                      <span className="font-medium">
                        {empresasMap.get(modalDescartar.empresa_id) || 'N/A'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">{t('ajustesRetroativos.refPeriod')}:</span>
                      <span>{getMonthName(modalDescartar.mes_referencia - 1)}/{modalDescartar.ano_referencia}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">{t('ajustesRetroativos.difference')}:</span>
                      <span className="font-mono font-semibold">
                        {modalDescartar.diferenca}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">
                      {t('ajustesRetroativos.discardJustification')} <span className="text-red-500">*</span>
                    </Label>
                    <Textarea
                      placeholder={t('ajustesRetroativos.discardPlaceholder')}
                      value={motivoDecisao}
                      onChange={(e) => setMotivoDecisao(e.target.value)}
                      className="focus:ring-sonda-blue focus:border-sonda-blue"
                      rows={3}
                    />
                  </div>
                </div>
              )}

              <DialogFooter>
                <Button variant="outline" onClick={() => setModalDescartar(null)}>
                  {t('common.cancel')}
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDescartar}
                  disabled={!motivoDecisao.trim() || descartarMutation.isPending}
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  {descartarMutation.isPending ? t('ajustesRetroativos.discarding') : t('ajustesRetroativos.discardAdjustment')}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          {/* Modal Enviar Email */}
          <Dialog open={modalEmailAberto} onOpenChange={setModalEmailAberto}>
            <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-xl font-semibold flex items-center gap-2">
                  <Mail className="h-5 w-5 text-sonda-blue" />
                  Disparar Ajuste por Email
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-5 py-2">
                {/* Destinatários */}
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-gray-900">Destinatários</Label>
                  <Textarea
                    placeholder="Cole ou digite emails separados por ponto e vírgula (;) Ex: joao@exemplo.com; maria@exemplo.com"
                    value={emailDestinatario}
                    onChange={(e) => setEmailDestinatario(e.target.value)}
                    className="focus:ring-sonda-blue focus:border-sonda-blue min-h-[60px]"
                    rows={2}
                  />
                  {!emailDestinatario && (
                    <p className="text-xs text-yellow-600">
                      Email não encontrado na tabela de especialistas. Preencha manualmente.
                    </p>
                  )}
                </div>

                {/* CC */}
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-gray-900">
                    Destinatários em Cópia (CC) - Opcional
                  </Label>
                  <Textarea
                    placeholder="Cole ou digite emails em cópia separados por ponto e vírgula (;) Ex: joao@exemplo.com; maria@exemplo.com"
                    value={emailCC}
                    onChange={(e) => setEmailCC(e.target.value)}
                    className="focus:ring-sonda-blue focus:border-sonda-blue min-h-[60px]"
                    rows={2}
                  />
                </div>

                {/* BCC */}
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-gray-900">
                    Destinatários em Cópia Oculta (BCC) - Opcional
                  </Label>
                  <Textarea
                    placeholder="Cole ou digite emails em cópia oculta separados por ponto e vírgula (;) Ex: joao@exemplo.com; maria@exemplo.com"
                    value={emailBCC}
                    onChange={(e) => setEmailBCC(e.target.value)}
                    className="focus:ring-sonda-blue focus:border-sonda-blue min-h-[60px]"
                    rows={2}
                  />
                </div>

                {/* Assunto */}
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-gray-900">Assunto</Label>
                  <Input
                    value={emailAssunto}
                    onChange={(e) => setEmailAssunto(e.target.value)}
                    className="focus:ring-sonda-blue focus:border-sonda-blue"
                  />
                </div>

                {/* Anexos */}
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-gray-900">Anexos</Label>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => document.getElementById('file-input-ajustes')?.click()}
                      className="flex items-center gap-2"
                    >
                      <FileText className="h-4 w-4" />
                      Adicionar Arquivos
                    </Button>
                    <input
                      id="file-input-ajustes"
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

                  {anexos.length > 0 && (
                    <div className="mt-2 space-y-2">
                      <div className="flex items-center justify-between text-sm font-medium text-gray-700">
                        <span>{anexos.length} arquivo(s) anexado(s)</span>
                        <span className="text-xs text-gray-500">
                          Total: {formatarTamanhoArquivo(anexos.reduce((acc, file) => acc + file.size, 0))}
                        </span>
                      </div>
                      <div className="border rounded-lg divide-y">
                        {anexos.map((file, index) => (
                          <div key={index} className="flex items-center justify-between p-3 hover:bg-gray-50">
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                              <FileText className="h-5 w-5 text-blue-600 flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 truncate">
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

                {/* Preview do Relatório */}
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-gray-900">Preview do Relatório</Label>
                  <div className="border border-gray-200 rounded-lg overflow-hidden">
                    {/* Header azul */}
                    <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-5 text-center">
                      <h2 className="text-white text-lg font-bold">Ajuste de Apontamento</h2>
                      <p className="text-blue-200 text-sm mt-1">
                        Banco de Horas - {getItensSelecionados().length} apontamento{getItensSelecionados().length > 1 ? 's' : ''}
                      </p>
                    </div>

                    {/* Corpo da mensagem */}
                    <div className="p-5 bg-white text-sm text-gray-700 leading-relaxed whitespace-pre-line">
                      {emailCorpo}
                    </div>

                    {/* Resumo: Período, Requerimentos, Horas */}
                    <div className="px-5 py-3 bg-blue-50 border-t border-blue-100">
                      <div className="flex gap-6 text-sm text-blue-800">
                        <span><strong>Período:</strong> {obterPeriodoReferencia(getItensSelecionados())}</span>
                        <span><strong>Requerimentos:</strong> {getItensSelecionados().length}</span>
                        <span><strong>Horas:</strong> {(() => { const m = calcularHorasItensSelecionados(getItensSelecionados()); const h = Math.floor(m / 60); const min = m % 60; return `${h}h${min > 0 ? String(min).padStart(2, '0') + 'min' : ''}`; })()}</span>
                      </div>
                    </div>

                    {/* Tabela de apontamentos */}
                    <div className="p-4 bg-gray-50 border-t">
                      <div className="bg-amber-500 text-white px-4 py-2 rounded-t flex items-center justify-between">
                        <span className="font-semibold text-sm">Apontamentos Identificados</span>
                        <span className="text-xs">{getItensSelecionados().length} item{getItensSelecionados().length > 1 ? 's' : ''}</span>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm border border-gray-200 bg-white">
                          <thead>
                            <tr className="bg-gray-100">
                              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 border-b-2 border-gray-200">Empresa</th>
                              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 border-b-2 border-gray-200">Chamado</th>
                              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 border-b-2 border-gray-200">Tarefa</th>
                              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 border-b-2 border-gray-200">Consultor</th>
                            </tr>
                          </thead>
                          <tbody>
                            {getItensSelecionados().map((item, idx) => (
                              <tr key={idx} className="border-b border-gray-100">
                                <td className="px-3 py-2 text-xs text-gray-700">{item.empresa}</td>
                                <td className="px-3 py-2 text-xs text-gray-700">{item.chamado}</td>
                                <td className="px-3 py-2 text-xs text-blue-600 font-medium">{item.tarefa || '-'}</td>
                                <td className="px-3 py-2 text-xs text-gray-700">{item.consultor || '-'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <DialogFooter className="pt-4 border-t">
                <Button variant="outline" onClick={() => setModalEmailAberto(false)}>
                  Cancelar
                </Button>
                <Button
                  className="bg-sonda-blue hover:bg-sonda-dark-blue"
                  onClick={handleEnviarEmail}
                  disabled={enviandoEmail || !emailDestinatario.trim()}
                >
                  <Send className="h-4 w-4 mr-2" />
                  {enviandoEmail ? 'Enviando...' : 'Enviar'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </AdminLayout>
  );
}
