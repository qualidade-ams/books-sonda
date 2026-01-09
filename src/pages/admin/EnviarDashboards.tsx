/**
 * Página para envio de dashboards por email
 * Sistema completo de seleção e filtragem de dashboards
 */

import { useState, useMemo, useCallback } from 'react';
import {
  Send,
  Mail,
  FileText,
  Calendar,
  ChevronLeft,
  ChevronRight,
  BarChart3,
  TrendingUp,
  Database,
  RefreshCw,
  CheckSquare,
  Square,
  Filter
} from 'lucide-react';
import AdminLayout from '@/components/admin/LayoutAdmin';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
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
import { useToast } from '@/hooks/use-toast';
import { emailService } from '@/services/emailService';
import { useDashboardsFiltrados, useEstatisticasDashboards } from '@/hooks/useDashboards';
import { DashboardCard, DashboardFilters, DashboardPreview } from '@/components/admin/dashboards';
import { FiltrosDashboard, Dashboard } from '@/types/dashboards';

export default function EnviarDashboards() {
  // Hook para toast
  const { toast } = useToast();

  // Estados para navegação temporal
  const [mesAtual] = useState(new Date().getMonth() + 1);
  const [anoAtual] = useState(new Date().getFullYear());
  const [mesSelecionado, setMesSelecionado] = useState(mesAtual);
  const [anoSelecionado, setAnoSelecionado] = useState(anoAtual);

  // Estados para filtros e seleção de dashboards
  const [filtros, setFiltros] = useState<FiltrosDashboard>({});
  const [showFilters, setShowFilters] = useState(false);
  const [dashboardsSelecionados, setDashboardsSelecionados] = useState<string[]>([]);

  // Estados para modais
  const [modalEmailAberto, setModalEmailAberto] = useState(false);
  const [confirmacaoAberta, setConfirmacaoAberta] = useState(false);

  // Estados para email
  const [destinatariosTexto, setDestinatariosTexto] = useState('');
  const [destinatariosCCTexto, setDestinatariosCCTexto] = useState('');
  const [destinatarios, setDestinatarios] = useState<string[]>([]);
  const [destinatariosCC, setDestinatariosCC] = useState<string[]>([]);
  const [assuntoEmail, setAssuntoEmail] = useState('');
  const [enviandoEmail, setEnviandoEmail] = useState(false);
  const [anexos, setAnexos] = useState<File[]>([]);

  // Hooks para dados
  const { data: dashboards, isLoading, estatisticas } = useDashboardsFiltrados(filtros);
  const estatisticasGerais = useEstatisticasDashboards();

  // Nomes dos meses
  const nomesMeses = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  // Período formatado
  const periodoFormatado = `${nomesMeses[mesSelecionado - 1]} ${anoSelecionado}`;

  // Dashboards selecionados para preview
  const dashboardsParaEnvio = useMemo(() => {
    return dashboards.filter(d => dashboardsSelecionados.includes(d.id));
  }, [dashboards, dashboardsSelecionados]);

  // Funções de navegação de mês
  const navegarMesAnterior = () => {
    if (mesSelecionado === 1) {
      const novoAno = anoSelecionado - 1;
      setMesSelecionado(12);
      setAnoSelecionado(novoAno);
    } else {
      const novoMes = mesSelecionado - 1;
      setMesSelecionado(novoMes);
    }
  };

  const navegarMesProximo = () => {
    if (mesSelecionado === 12) {
      const novoAno = anoSelecionado + 1;
      setMesSelecionado(1);
      setAnoSelecionado(novoAno);
    } else {
      const novoMes = mesSelecionado + 1;
      setMesSelecionado(novoMes);
    }
  };

  // Handlers para filtros
  const handleFiltroChange = useCallback((key: keyof FiltrosDashboard, value: any) => {
    setFiltros(prev => ({
      ...prev,
      [key]: value || undefined
    }));
  }, []);

  const limparFiltros = () => {
    setFiltros({});
  };

  // Handlers para seleção de dashboards
  const handleDashboardSelection = (dashboardId: string, selected: boolean) => {
    setDashboardsSelecionados(prev => 
      selected 
        ? [...prev, dashboardId]
        : prev.filter(id => id !== dashboardId)
    );
  };

  const selecionarTodos = () => {
    const dashboardsAtivos = dashboards.filter(d => d.status === 'ativo');
    setDashboardsSelecionados(dashboardsAtivos.map(d => d.id));
  };

  const limparSelecao = () => {
    setDashboardsSelecionados([]);
  };

  // Função para abrir modal de email
  const handleAbrirModalEmail = () => {
    if (dashboardsSelecionados.length === 0) {
      toast({
        title: "Erro",
        description: "Selecione pelo menos um dashboard para enviar",
        variant: "destructive"
      });
      return;
    }

    // Configurar assunto padrão
    const nomesDashboards = dashboardsParaEnvio.map(d => d.nome).join(', ');
    setAssuntoEmail(`[DASHBOARDS] - ${nomesDashboards} (${periodoFormatado})`);
    
    // Limpar outros campos
    setDestinatarios([]);
    setDestinatariosCC([]);
    setDestinatariosTexto('');
    setDestinatariosCCTexto('');
    setAnexos([]);
    
    setModalEmailAberto(true);
  };

  // Função para extrair emails
  const extrairEmails = (texto: string): string[] => {
    const emailRegex = /<([^>]+)>|([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
    const emails: string[] = [];
    let match;

    while ((match = emailRegex.exec(texto)) !== null) {
      const email = (match[1] || match[2]).trim();
      if (email && !emails.includes(email)) {
        emails.push(email);
      }
    }

    return emails;
  };

  // Função para colar emails
  const handleColarEmails = (texto: string, tipo: 'destinatarios' | 'cc') => {
    const partes = texto.split(/[;\n,]+/);
    const emailsExtraidos: string[] = [];

    partes.forEach(parte => {
      const emails = extrairEmails(parte.trim());
      emailsExtraidos.push(...emails);
    });

    const emailsUnicos = [...new Set(emailsExtraidos.filter(e => e.length > 0))];

    if (emailsUnicos.length > 0) {
      if (tipo === 'destinatarios') {
        const emailsAtuais = destinatariosTexto.split(';').map(e => e.trim()).filter(e => e.length > 0);
        const todosEmails = [...new Set([...emailsAtuais, ...emailsUnicos])];
        setDestinatariosTexto(todosEmails.join('; '));
        setDestinatarios(todosEmails);
      } else {
        const emailsAtuais = destinatariosCCTexto.split(';').map(e => e.trim()).filter(e => e.length > 0);
        const todosEmails = [...new Set([...emailsAtuais, ...emailsUnicos])];
        setDestinatariosCCTexto(todosEmails.join('; '));
        setDestinatariosCC(todosEmails);
      }
      toast({
        title: "Sucesso",
        description: `${emailsUnicos.length} email(s) adicionado(s) com sucesso!`
      });
    }
  };

  // Atualizar destinatários
  const handleAtualizarDestinatariosTexto = (texto: string) => {
    setDestinatariosTexto(texto);
    const emails = texto.split(';').map(e => e.trim()).filter(e => e.length > 0);
    setDestinatarios(emails);
  };

  const handleAtualizarCCTexto = (texto: string) => {
    setDestinatariosCCTexto(texto);
    const emails = texto.split(';').map(e => e.trim()).filter(e => e.length > 0);
    setDestinatariosCC(emails);
  };

  // Gerenciar anexos
  const handleAdicionarAnexos = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      const novosAnexos = Array.from(files);
      const tamanhoTotal = [...anexos, ...novosAnexos].reduce((acc, file) => acc + file.size, 0);
      const limiteBytes = 25 * 1024 * 1024;
      
      if (tamanhoTotal > limiteBytes) {
        toast({
          title: "Erro",
          description: "O tamanho total dos anexos não pode exceder 25MB",
          variant: "destructive"
        });
        return;
      }
      
      setAnexos(prev => [...prev, ...novosAnexos]);
      toast({
        title: "Sucesso",
        description: `${novosAnexos.length} arquivo(s) adicionado(s)`
      });
    }
  };

  const handleRemoverAnexo = (index: number) => {
    setAnexos(prev => prev.filter((_, i) => i !== index));
    toast({
      title: "Sucesso",
      description: "Anexo removido"
    });
  };

  const formatarTamanhoArquivo = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  // Validação do formulário
  const validarFormularioEmail = (): boolean => {
    const emailsValidos = destinatarios.filter(email => email.trim() !== '');

    if (emailsValidos.length === 0) {
      toast({
        title: "Erro",
        description: "É necessário informar pelo menos um destinatário",
        variant: "destructive"
      });
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const emailsInvalidos = emailsValidos.filter(email => !emailRegex.test(email));
    const emailsCCValidos = destinatariosCC.filter(email => email.trim() !== '');
    const emailsCCInvalidos = emailsCCValidos.filter(email => !emailRegex.test(email));

    if (emailsInvalidos.length > 0 || emailsCCInvalidos.length > 0) {
      const todosInvalidos = [...emailsInvalidos, ...emailsCCInvalidos];
      toast({
        title: "Erro",
        description: `E-mails inválidos: ${todosInvalidos.join(', ')}`,
        variant: "destructive"
      });
      return false;
    }

    if (!assuntoEmail.trim()) {
      toast({
        title: "Erro",
        description: "É necessário informar o assunto do email",
        variant: "destructive"
      });
      return false;
    }

    return true;
  };

  // Gerar HTML dos dashboards selecionados
  const gerarHtmlDashboards = (): string => {
    const dashboardsHtml = dashboardsParaEnvio.map(dashboard => {
      // Conteúdo específico baseado no tipo de dashboard
      let conteudoEspecifico = '';
      
      switch (dashboard.id) {
        case 'requerimentos':
          conteudoEspecifico = `
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin: 24px 0;">
              <div style="background: #f8fafc; padding: 16px; border-radius: 8px; text-align: center;">
                <div style="font-size: 24px; font-weight: 600; color: #0066CC;">📋</div>
                <div style="font-size: 14px; color: #64748b; margin-top: 8px;">Total de Requerimentos</div>
                <div style="font-size: 18px; font-weight: 600; color: #1e293b; margin-top: 4px;">Dados do período</div>
              </div>
              <div style="background: #f8fafc; padding: 16px; border-radius: 8px; text-align: center;">
                <div style="font-size: 24px; font-weight: 600; color: #10b981;">💰</div>
                <div style="font-size: 14px; color: #64748b; margin-top: 8px;">Valor Faturado</div>
                <div style="font-size: 18px; font-weight: 600; color: #1e293b; margin-top: 4px;">R$ --</div>
              </div>
              <div style="background: #f8fafc; padding: 16px; border-radius: 8px; text-align: center;">
                <div style="font-size: 24px; font-weight: 600; color: #8b5cf6;">⏱️</div>
                <div style="font-size: 14px; color: #64748b; margin-top: 8px;">Horas Trabalhadas</div>
                <div style="font-size: 18px; font-weight: 600; color: #1e293b; margin-top: 4px;">-- horas</div>
              </div>
            </div>
            <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 16px; margin-top: 16px;">
              <p style="color: #92400e; font-size: 14px; margin: 0;">
                <strong>📊 Conteúdo:</strong> Análise detalhada de requerimentos, faturamento por tipo de cobrança, 
                evolução mensal, top módulos e relatórios de performance.
              </p>
            </div>
          `;
          break;
          
        case 'elogios':
          conteudoEspecifico = `
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin: 24px 0;">
              <div style="background: #f8fafc; padding: 16px; border-radius: 8px; text-align: center;">
                <div style="font-size: 24px; font-weight: 600; color: #ec4899;">❤️</div>
                <div style="font-size: 14px; color: #64748b; margin-top: 8px;">Elogios Recebidos</div>
                <div style="font-size: 18px; font-weight: 600; color: #1e293b; margin-top: 4px;">Dados do período</div>
              </div>
              <div style="background: #f8fafc; padding: 16px; border-radius: 8px; text-align: center;">
                <div style="font-size: 24px; font-weight: 600; color: #10b981;">⭐</div>
                <div style="font-size: 14px; color: #64748b; margin-top: 8px;">Satisfação Média</div>
                <div style="font-size: 18px; font-weight: 600; color: #1e293b; margin-top: 4px;">-/5</div>
              </div>
              <div style="background: #f8fafc; padding: 16px; border-radius: 8px; text-align: center;">
                <div style="font-size: 24px; font-weight: 600; color: #3b82f6;">👥</div>
                <div style="font-size: 14px; color: #64748b; margin-top: 8px;">Colaboradores Destacados</div>
                <div style="font-size: 18px; font-weight: 600; color: #1e293b; margin-top: 4px;">--</div>
              </div>
            </div>
            <div style="background: #ecfdf5; border: 1px solid #10b981; border-radius: 8px; padding: 16px; margin-top: 16px;">
              <p style="color: #065f46; font-size: 14px; margin: 0;">
                <strong>💝 Conteúdo:</strong> Análise de elogios por empresa, colaboradores em destaque, 
                evolução da satisfação, mapeamento por áreas e pesquisas de qualidade.
              </p>
            </div>
          `;
          break;
          
        case 'planos-acao':
          conteudoEspecifico = `
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin: 24px 0;">
              <div style="background: #f8fafc; padding: 16px; border-radius: 8px; text-align: center;">
                <div style="font-size: 24px; font-weight: 600; color: #0066CC;">🎯</div>
                <div style="font-size: 14px; color: #64748b; margin-top: 8px;">Planos Ativos</div>
                <div style="font-size: 18px; font-weight: 600; color: #1e293b; margin-top: 4px;">Dados do período</div>
              </div>
              <div style="background: #f8fafc; padding: 16px; border-radius: 8px; text-align: center;">
                <div style="font-size: 24px; font-weight: 600; color: #10b981;">✅</div>
                <div style="font-size: 14px; color: #64748b; margin-top: 8px;">Metas Alcançadas</div>
                <div style="font-size: 18px; font-weight: 600; color: #1e293b; margin-top: 4px;">--%</div>
              </div>
              <div style="background: #f8fafc; padding: 16px; border-radius: 8px; text-align: center;">
                <div style="font-size: 24px; font-weight: 600; color: #f59e0b;">📈</div>
                <div style="font-size: 14px; color: #64748b; margin-top: 8px;">Progresso Médio</div>
                <div style="font-size: 18px; font-weight: 600; color: #1e293b; margin-top: 4px;">--%</div>
              </div>
            </div>
            <div style="background: #eff6ff; border: 1px solid #3b82f6; border-radius: 8px; padding: 16px; margin-top: 16px;">
              <p style="color: #1e40af; font-size: 14px; margin: 0;">
                <strong>🚀 Conteúdo:</strong> Acompanhamento de planos de ação, progresso de metas, 
                análise de resultados, cronogramas e indicadores de performance.
              </p>
            </div>
          `;
          break;
          
        case 'empresas':
          conteudoEspecifico = `
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; margin: 24px 0;">
              <div style="background: #f8fafc; padding: 16px; border-radius: 8px; text-align: center;">
                <div style="font-size: 24px; font-weight: 600; color: #0066CC;">🏢</div>
                <div style="font-size: 14px; color: #64748b; margin-top: 8px;">Empresas Ativas</div>
                <div style="font-size: 18px; font-weight: 600; color: #1e293b; margin-top: 4px;">Dados do período</div>
              </div>
              <div style="background: #f8fafc; padding: 16px; border-radius: 8px; text-align: center;">
                <div style="font-size: 24px; font-weight: 600; color: #10b981;">📊</div>
                <div style="font-size: 14px; color: #64748b; margin-top: 8px;">Contratos Ativos</div>
                <div style="font-size: 18px; font-weight: 600; color: #1e293b; margin-top: 4px;">--</div>
              </div>
              <div style="background: #f8fafc; padding: 16px; border-radius: 8px; text-align: center;">
                <div style="font-size: 24px; font-weight: 600; color: #8b5cf6;">💼</div>
                <div style="font-size: 14px; color: #64748b; margin-top: 8px;">Relacionamento</div>
                <div style="font-size: 18px; font-weight: 600; color: #1e293b; margin-top: 4px;">Excelente</div>
              </div>
            </div>
            <div style="background: #f3e8ff; border: 1px solid #8b5cf6; border-radius: 8px; padding: 16px; margin-top: 16px;">
              <p style="color: #6b21a8; font-size: 14px; margin: 0;">
                <strong>🤝 Conteúdo:</strong> Análise de empresas clientes, contratos vigentes, 
                histórico de relacionamento, métricas comerciais e oportunidades de negócio.
              </p>
            </div>
          `;
          break;
          
        default:
          conteudoEspecifico = `
            <div style="text-align: center; color: #64748b; padding: 32px;">
              <div style="font-size: 32px; margin-bottom: 16px;">📊</div>
              <p style="margin: 0; line-height: 1.6;">
                Conteúdo do dashboard será inserido aqui conforme necessário para o período de <strong>${periodoFormatado}</strong>.
              </p>
            </div>
          `;
      }

      return `
        <div class="dashboard-section" style="margin-bottom: 40px; page-break-inside: avoid;">
          <div class="dashboard-header" style="background: linear-gradient(135deg, #0066CC 0%, #004499 100%); color: white; padding: 24px; border-radius: 8px 8px 0 0;">
            <h2 style="margin: 0; font-size: 24px; font-weight: 700;">${dashboard.nome}</h2>
            <p style="margin: 8px 0 0 0; opacity: 0.9; font-size: 14px;">${dashboard.descricao}</p>
            <div style="margin-top: 12px; display: flex; gap: 8px; flex-wrap: wrap;">
              <span style="background: rgba(255,255,255,0.2); padding: 4px 8px; border-radius: 4px; font-size: 12px;">
                ${dashboard.categoria.charAt(0).toUpperCase() + dashboard.categoria.slice(1)}
              </span>
              <span style="background: rgba(255,255,255,0.2); padding: 4px 8px; border-radius: 4px; font-size: 12px;">
                ${dashboard.tipo.charAt(0).toUpperCase() + dashboard.tipo.slice(1)}
              </span>
            </div>
          </div>
          
          <div class="dashboard-content" style="background: white; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px; padding: 32px;">
            ${conteudoEspecifico}
            
            ${dashboard.metricas ? `
            <div style="margin-top: 32px; padding: 20px; background: #f8fafc; border-radius: 8px; border: 1px solid #e2e8f0;">
              <h4 style="margin: 0 0 16px 0; color: #374151; font-size: 16px; font-weight: 600;">📈 Métricas de Uso</h4>
              <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; text-align: center;">
                <div>
                  <div style="font-size: 20px; font-weight: 600; color: #0066CC;">${dashboard.metricas.total_visualizacoes}</div>
                  <div style="font-size: 12px; color: #64748b;">Visualizações</div>
                </div>
                <div>
                  <div style="font-size: 20px; font-weight: 600; color: #10b981;">${dashboard.metricas.total_envios}</div>
                  <div style="font-size: 12px; color: #64748b;">Envios</div>
                </div>
                <div>
                  <div style="font-size: 20px; font-weight: 600; color: #8b5cf6;">${dashboard.metricas.taxa_abertura?.toFixed(1)}%</div>
                  <div style="font-size: 12px; color: #64748b;">Taxa Abertura</div>
                </div>
              </div>
            </div>
            ` : ''}
          </div>
        </div>
      `;
    }).join('');

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Dashboards - ${periodoFormatado}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      margin: 0; 
      padding: 20px; 
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
      background-color: #f8fafc; 
      color: #1e293b;
      line-height: 1.6;
    }
    .container { 
      max-width: auto; 
      margin: 0 auto; 
      background-color: #ffffff; 

      overflow: hidden;
    }
    .main-header { 
      background: linear-gradient(135deg, #0066CC 0%, #004499 100%);
      color: white; 
      padding: 40px 32px; 
      text-align: center; 
    }
    .main-header h1 { 
      font-size: 32px; 
      font-weight: 700; 
      margin-bottom: 8px;
      letter-spacing: -0.025em;
    }
    .main-header p { 
      font-size: 18px; 
      opacity: 0.9;
      font-weight: 400;
    }
    .content { 
      padding: 40px 32px; 
    }
    .period-info {
      background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
      border-radius: 8px;
      padding: 24px;
      margin-bottom: 40px;
      border-left: 4px solid #0066CC;
    }
    .period-info h2 {
      color: #0066CC;
      font-size: 20px;
      font-weight: 600;
      margin-bottom: 8px;
    }
    .period-info p {
      color: #64748b;
      font-size: 14px;
      line-height: 1.6;
    }
    .dashboards-summary {
      background: #fef3c7;
      border: 1px solid #f59e0b;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 32px;
      text-align: center;
    }
    .dashboards-summary p {
      color: #92400e;
      font-size: 14px;
      margin: 0;
    }
    .footer {
      background: #f8fafc;
      padding: 24px 32px;
      border-top: 1px solid #e2e8f0;
      text-align: center;
    }
    .footer p {
      color: #64748b;
      font-size: 12px;
      line-height: 1.5;
    }
    .footer .logo {
      margin-top: 16px;
      opacity: 0.6;
    }
    @media only screen and (max-width: 600px) {
      body { padding: 10px; }
      .main-header { padding: 24px 20px; }
      .main-header h1 { font-size: 24px; }
      .content { padding: 24px 20px; }
      .period-info { padding: 20px; }
      .footer { padding: 20px; }
      .dashboard-content { padding: 20px !important; }
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Main Header -->
    <div class="main-header">
      <h1>📊 Dashboards Corporativos</h1>
      <p>Relatórios e Indicadores de Performance</p>
    </div>
    
    <!-- Content -->
    <div class="content">
      <!-- Period Info -->
      <div class="period-info">
        <h2>📅 Período dos Relatórios</h2>
        <p><strong>${periodoFormatado}</strong></p>
        <p>Este envio contém ${dashboardsParaEnvio.length} dashboard${dashboardsParaEnvio.length > 1 ? 's' : ''} com os principais indicadores e métricas de performance do período selecionado.</p>
      </div>
      
      <!-- Dashboards Summary -->
      <div class="dashboards-summary">
        <p>
          <strong>📋 Dashboards Inclusos:</strong> ${dashboardsParaEnvio.map(d => d.nome.replace('Dashboard de ', '')).join(' • ')}
        </p>
      </div>
      
      <!-- Dashboards Content -->
      ${dashboardsHtml}
    </div>
    
    <!-- Footer -->
    <div class="footer">
      <p>
        Sistema de Gestão Administrativa<br>
        Gerado automaticamente em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}
      </p>
    </div>
  </div>
</body>
</html>`;
  };

  // Disparar envio de email
  const handleDispararEmail = async () => {
    if (!validarFormularioEmail()) return;

    setEnviandoEmail(true);

    try {
      const emailsValidos = destinatarios.filter(email => email.trim() !== '');
      const emailsCCValidos = destinatariosCC.filter(email => email.trim() !== '');

      // Gerar HTML dos dashboards selecionados
      const htmlDashboards = gerarHtmlDashboards();

      // Converter anexos File[] para base64
      const anexosBase64 = await Promise.all(
        anexos.map(async (file) => {
          return new Promise<{ filename: string; content: string; contentType: string }>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
              const base64 = (reader.result as string).split(',')[1]; // Remover prefixo data:...;base64,
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

      // Enviar email usando o serviço
      const resultado = await emailService.sendEmail({
        to: emailsValidos,
        cc: emailsCCValidos.length > 0 ? emailsCCValidos : undefined,
        subject: assuntoEmail,
        html: htmlDashboards,
        attachments: anexosBase64.length > 0 ? anexosBase64 : undefined
      });

      if (resultado.success) {
        toast({
          title: "Sucesso",
          description: `${dashboardsParaEnvio.length} dashboard${dashboardsParaEnvio.length > 1 ? 's' : ''} enviado${dashboardsParaEnvio.length > 1 ? 's' : ''} com sucesso para ${emailsValidos.length} destinatário(s)!`
        });
        
        setModalEmailAberto(false);
        setConfirmacaoAberta(false);
        setDestinatarios([]);
        setDestinatariosCC([]);
        setDestinatariosTexto('');
        setDestinatariosCCTexto('');
        setAssuntoEmail('');
        setAnexos([]);
      } else {
        toast({
          title: "Erro",
          description: `Erro ao enviar dashboard: ${resultado.error || 'Erro desconhecido'}`,
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Erro ao enviar dashboard:', error);
      toast({
        title: "Erro",
        description: 'Erro ao enviar dashboard: ' + (error instanceof Error ? error.message : 'Erro desconhecido'),
        variant: "destructive"
      });
    } finally {
      setEnviandoEmail(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Cabeçalho */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Enviar Dashboards
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Configure e envie dashboards por email
            </p>
          </div>

          <ProtectedAction screenKey="dashboard" requiredLevel="edit">
            <Button
              onClick={handleAbrirModalEmail}
              size="sm"
              className="bg-sonda-blue hover:bg-sonda-dark-blue"
            >
              <Send className="h-4 w-4 mr-2" />
              Enviar Dashboard
            </Button>
          </ProtectedAction>
        </div>

        {/* Cards de Estatísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs lg:text-sm font-medium text-blue-600 flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Total Dashboards
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-xl lg:text-2xl font-bold text-blue-600">
                {estatisticasGerais?.total || 0}
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                Disponíveis
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs lg:text-sm font-medium text-green-600 flex items-center gap-2">
                <CheckSquare className="h-4 w-4" />
                Selecionados
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-xl lg:text-2xl font-bold text-green-600">
                {dashboardsSelecionados.length}
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                Para envio
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs lg:text-sm font-medium text-purple-600 flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Período
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-xl lg:text-2xl font-bold text-purple-600">
                {nomesMeses[mesSelecionado - 1]}
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                {anoSelecionado}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs lg:text-sm font-medium text-orange-600 flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Filtrados
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-xl lg:text-2xl font-bold text-orange-600">
                {dashboards.length}
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                Resultados
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Navegação de Período */}
        <Card>
          <CardContent className="py-3">
            <div className="flex items-center justify-between gap-4">
              <Button
                variant="outline"
                size="sm"
                onClick={navegarMesAnterior}
                className="flex items-center gap-2"
              >
                <ChevronLeft className="h-4 w-4" />
                Anterior
              </Button>

              <div className="text-center">
                <div className="text-lg font-semibold text-gray-900 dark:text-white">
                  {nomesMeses[mesSelecionado - 1]} {anoSelecionado}
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={navegarMesProximo}
                className="flex items-center gap-2"
              >
                Próximo
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Filtros de Dashboards */}
        <DashboardFilters
          filtros={filtros}
          onFiltroChange={handleFiltroChange}
          onLimparFiltros={limparFiltros}
          isOpen={showFilters}
          onToggle={() => setShowFilters(!showFilters)}
          totalResultados={dashboards.length}
        />

        {/* Ações de Seleção */}
        {dashboards.length > 0 && (
          <Card>
            <CardContent className="py-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={selecionarTodos}
                      disabled={isLoading}
                      className="flex items-center gap-2"
                    >
                      <CheckSquare className="h-4 w-4" />
                      Selecionar Todos Ativos
                    </Button>
                    {dashboardsSelecionados.length > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={limparSelecao}
                        className="flex items-center gap-2"
                      >
                        <Square className="h-4 w-4" />
                        Limpar Seleção
                      </Button>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  {dashboardsSelecionados.length > 0 && (
                    <Badge variant="secondary">
                      {dashboardsSelecionados.length} selecionado{dashboardsSelecionados.length > 1 ? 's' : ''}
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Lista de Dashboards */}
        {isLoading ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <RefreshCw className="h-8 w-8 animate-spin text-sonda-blue mx-auto mb-4" />
                <p className="text-gray-600">Carregando dashboards...</p>
              </div>
            </CardContent>
          </Card>
        ) : dashboards.length === 0 ? (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <BarChart3 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-700 mb-2">
                  Nenhum dashboard encontrado
                </h3>
                <p className="text-gray-600 mb-4">
                  Não há dashboards que correspondam aos filtros aplicados.
                </p>
                <Button
                  variant="outline"
                  onClick={limparFiltros}
                  className="flex items-center gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Limpar Filtros
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {dashboards.map((dashboard) => (
              <DashboardCard
                key={dashboard.id}
                dashboard={dashboard}
                isSelected={dashboardsSelecionados.includes(dashboard.id)}
                onSelectionChange={(selected) => handleDashboardSelection(dashboard.id, selected)}
              />
            ))}
          </div>
        )}

        {/* Modal de Email */}
        <Dialog open={modalEmailAberto} onOpenChange={setModalEmailAberto}>
          <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Enviar Dashboard por Email
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-6">
              {/* Destinatários */}
              <div>
                <Label className="text-base font-medium">Destinatários</Label>
                
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
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => document.getElementById('file-input-dashboard')?.click()}
                      className="flex items-center gap-2"
                    >
                      <FileText className="h-4 w-4" />
                      Adicionar Arquivos
                    </Button>
                    <input
                      id="file-input-dashboard"
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
                              ×
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Preview do Email */}
              <div>
                <Label className="text-base font-medium">Preview do Dashboard</Label>
                <div className="mt-2 border rounded-lg overflow-hidden bg-white dark:bg-gray-900">
                  <div className="bg-gray-100 dark:bg-gray-800 p-3 border-b">
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      <strong>Período:</strong> {nomesMeses[mesSelecionado - 1]} {anoSelecionado}
                    </div>
                  </div>
                  <div className="p-4 max-h-[300px] overflow-y-auto">
                    <div className="text-center">
                      <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6 rounded-lg mb-4">
                        <h2 className="text-xl font-bold mb-2">📊 Dashboard Mensal</h2>
                        <p>Relatório de Performance e Indicadores</p>
                      </div>
                      <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-lg">
                        <h3 className="font-semibold mb-2">📅 {nomesMeses[mesSelecionado - 1]} de {anoSelecionado}</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          Dashboard template pronto para envio
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setModalEmailAberto(false)}
                disabled={enviandoEmail}
              >
                Cancelar
              </Button>
              <Button
                onClick={() => setConfirmacaoAberta(true)}
                disabled={enviandoEmail || destinatarios.length === 0}
                className="bg-sonda-blue hover:bg-sonda-dark-blue"
              >
                {enviandoEmail ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Enviar Dashboard
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Modal de Confirmação */}
        <AlertDialog open={confirmacaoAberta} onOpenChange={setConfirmacaoAberta}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmar Envio do Dashboard</AlertDialogTitle>
              <AlertDialogDescription>
                Você está prestes a enviar <strong>{dashboardsParaEnvio.length} dashboard{dashboardsParaEnvio.length > 1 ? 's' : ''}</strong> referente{dashboardsParaEnvio.length > 1 ? 's' : ''} ao período de <strong>{periodoFormatado}</strong>:
                <br /><br />
                <strong>Dashboards:</strong>
                <ul className="list-disc list-inside ml-4 space-y-1">
                  {dashboardsParaEnvio.map(dashboard => (
                    <li key={dashboard.id} className="text-sm">
                      {dashboard.nome} ({dashboard.categoria})
                    </li>
                  ))}
                </ul>
                <br />
                <strong>Destinatários:</strong> {destinatarios.length} email(s)
                {destinatariosCC.length > 0 && (
                  <>
                    <br />
                    <strong>Cópia (CC):</strong> {destinatariosCC.length} email(s)
                  </>
                )}
                {anexos.length > 0 && (
                  <>
                    <br />
                    <strong>Anexos:</strong> {anexos.length} arquivo(s)
                  </>
                )}
                <br /><br />
                Deseja continuar?
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={enviandoEmail}>
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDispararEmail}
                disabled={enviandoEmail}
                className="bg-sonda-blue hover:bg-sonda-dark-blue"
              >
                {enviandoEmail ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  'Confirmar Envio'
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </AdminLayout>
  );
}