/**
 * Modal para envio de dashboard por email
 * Reutiliza lógica do EnviarDashboards.tsx mas captura estado atual dos filtros
 * Inclui captura de tela do dashboard para envio visual idêntico
 */

import { useState, useEffect } from 'react';
import html2canvas from 'html2canvas';
import {
  Send,
  Mail,
  FileText,
  RefreshCw,
  X,
  Camera
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { useToast } from '@/hooks/use-toast';
import { emailService } from '@/services/emailService';

interface ModalEnvioDashboardProps {
  aberto: boolean;
  onFechar: () => void;
  abaAtiva: string;
  tituloAba: string;
  filtros: {
    ano: number;
    mes: number | 'todos';
    modulo?: string;
  };
  dadosDashboard?: any;
}

export function ModalEnvioDashboard({
  aberto,
  onFechar,
  abaAtiva,
  tituloAba,
  filtros,
  dadosDashboard
}: ModalEnvioDashboardProps) {
  const { toast } = useToast();

  // Estados para email
  const [destinatariosTexto, setDestinatariosTexto] = useState('');
  const [destinatariosCCTexto, setDestinatariosCCTexto] = useState('');
  const [destinatarios, setDestinatarios] = useState<string[]>([]);
  const [destinatariosCC, setDestinatariosCC] = useState<string[]>([]);
  const [assuntoEmail, setAssuntoEmail] = useState('');
  const [enviandoEmail, setEnviandoEmail] = useState(false);
  const [anexos, setAnexos] = useState<File[]>([]);
  const [confirmacaoAberta, setConfirmacaoAberta] = useState(false);

  // Estados para captura de tela
  const [capturandoTela, setCapturandoTela] = useState(false);
  const [imagemCapturada, setImagemCapturada] = useState<string | null>(null);
  const [previewCaptura, setPreviewCaptura] = useState<string | null>(null);

  // Nomes dos meses
  const nomesMeses = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  // Período formatado
  const periodoFormatado = filtros.mes === 'todos' 
    ? `Ano ${filtros.ano}`
    : `${nomesMeses[filtros.mes - 1]} ${filtros.ano}`;

  // Configurar assunto padrão quando modal abre
  useEffect(() => {
    if (aberto) {
      const moduloTexto = filtros.modulo && filtros.modulo !== 'todos' 
        ? ` - ${filtros.modulo.toUpperCase()}`
        : '';
      
      setAssuntoEmail(`[DASHBOARD] - ${tituloAba}${moduloTexto} (${periodoFormatado})`);
      
      // Limpar outros campos
      setDestinatarios([]);
      setDestinatariosCC([]);
      setDestinatariosTexto('');
      setDestinatariosCCTexto('');
      setAnexos([]);
      setImagemCapturada(null);
      setPreviewCaptura(null);
      
      // Capturar tela automaticamente quando modal abre
      setTimeout(() => {
        capturarTelaDashboard();
      }, 500); // Pequeno delay para garantir que o modal esteja totalmente renderizado
    }
  }, [aberto, tituloAba, periodoFormatado, filtros.modulo]);

  // Função para capturar a tela do dashboard
  const capturarTelaDashboard = async () => {
    setCapturandoTela(true);
    
    try {
      // Tentar encontrar elementos mais específicos do dashboard primeiro
      let dashboardElement = document.querySelector('[data-dashboard-content]');
      
      if (!dashboardElement) {
        // Tentar encontrar o container principal do conteúdo
        dashboardElement = document.querySelector('.container') || 
                          document.querySelector('main .space-y-6') ||
                          document.querySelector('.space-y-6') ||
                          document.querySelector('main');
      }

      if (!dashboardElement) {
        throw new Error('Elemento do dashboard não encontrado');
      }

      console.log('Elemento capturado:', dashboardElement.className, dashboardElement.tagName);
      console.log('Dimensões do elemento:', {
        offsetWidth: (dashboardElement as HTMLElement).offsetWidth,
        offsetHeight: (dashboardElement as HTMLElement).offsetHeight,
        scrollWidth: (dashboardElement as HTMLElement).scrollWidth,
        scrollHeight: (dashboardElement as HTMLElement).scrollHeight,
        clientWidth: (dashboardElement as HTMLElement).clientWidth,
        clientHeight: (dashboardElement as HTMLElement).clientHeight
      });

      // Encontrar todos os elementos filhos e forçar fundo branco
      const elementsToModify: Array<{element: HTMLElement, originalBg: string}> = [];
      
      // Modificar o elemento principal
      const mainElement = dashboardElement as HTMLElement;
      elementsToModify.push({
        element: mainElement,
        originalBg: mainElement.style.backgroundColor
      });
      mainElement.style.backgroundColor = '#ffffff';

      // Modificar elementos filhos que podem ter fundo cinza
      const childElements = mainElement.querySelectorAll('*') as NodeListOf<HTMLElement>;
      childElements.forEach(child => {
        const computedStyle = window.getComputedStyle(child);
        if (computedStyle.backgroundColor && 
            (computedStyle.backgroundColor.includes('gray') || 
             computedStyle.backgroundColor.includes('rgb(243, 244, 246)') ||
             computedStyle.backgroundColor.includes('rgb(249, 250, 251)'))) {
          elementsToModify.push({
            element: child,
            originalBg: child.style.backgroundColor
          });
          child.style.backgroundColor = '#ffffff';
        }
      });
      
      // Aguardar aplicação dos estilos
      await new Promise(resolve => setTimeout(resolve, 200));

      // Usar scrollWidth/scrollHeight para capturar conteúdo completo
      const captureWidth = Math.max(mainElement.offsetWidth, mainElement.scrollWidth, mainElement.clientWidth);
      const captureHeight = Math.max(mainElement.offsetHeight, mainElement.scrollHeight, mainElement.clientHeight);

      console.log('Dimensões de captura:', { captureWidth, captureHeight });

      // Configurações para captura da área completa
      const canvas = await html2canvas(mainElement, {
        useCORS: true,
        allowTaint: true,
        width: captureWidth,
        height: captureHeight
      });

      // Restaurar estilos originais
      elementsToModify.forEach(({element, originalBg}) => {
        element.style.backgroundColor = originalBg;
      });

      // Converter canvas para base64
      const imagemBase64 = canvas.toDataURL('image/png', 0.9);
      setImagemCapturada(imagemBase64);
      setPreviewCaptura(imagemBase64);

      toast({
        title: "Sucesso",
        description: "Captura da tela realizada com sucesso!"
      });

    } catch (error) {
      console.error('Erro ao capturar tela:', error);
      toast({
        title: "Erro",
        description: "Erro ao capturar a tela do dashboard. Tentando novamente...",
        variant: "destructive"
      });
      
      // Tentar captura alternativa
      setTimeout(() => {
        capturarTelaAlternativa();
      }, 1000);
    } finally {
      setCapturandoTela(false);
    }
  };

  // Função alternativa para captura (área visível da tela)
  const capturarTelaAlternativa = async () => {
    try {
      // Salvar estilo original do body
      const originalBodyStyle = document.body.style.backgroundColor;
      
      // Forçar fundo branco temporariamente no body
      document.body.style.backgroundColor = '#ffffff';
      
      // Aguardar um pouco para o estilo ser aplicado
      await new Promise(resolve => setTimeout(resolve, 100));

      // Capturar toda a área visível
      const canvas = await html2canvas(document.body, {
        useCORS: true,
        allowTaint: true,
        width: window.innerWidth,
        height: window.innerHeight
      });

      // Restaurar estilo original do body
      document.body.style.backgroundColor = originalBodyStyle;

      const imagemBase64 = canvas.toDataURL('image/png', 0.8);
      setImagemCapturada(imagemBase64);
      setPreviewCaptura(imagemBase64);

      toast({
        title: "Sucesso",
        description: "Captura alternativa realizada com sucesso!"
      });

    } catch (error) {
      console.error('Erro na captura alternativa:', error);
      toast({
        title: "Erro",
        description: "Não foi possível capturar a tela. O email será enviado sem a imagem.",
        variant: "destructive"
      });
    }
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

  // Gerar HTML do dashboard com imagem capturada
  const gerarHtmlDashboard = (): string => {
    const filtroTexto = filtros.modulo && filtros.modulo !== 'todos' 
      ? ` (Módulo: ${filtros.modulo.toUpperCase()})`
      : '';

    // Conteúdo com imagem capturada
    let conteudoEspecifico = '';
    let iconeAba = '';
    let corAba = '';
    let descricaoAba = '';

    switch (abaAtiva) {
      case 'requerimentos':
        iconeAba = '📋';
        corAba = 'bg-blue-600';
        descricaoAba = 'Análise detalhada de requerimentos, faturamento e performance';
        break;
      case 'planos-acao':
        iconeAba = '🎯';
        corAba = 'bg-gray-600';
        descricaoAba = 'Acompanhamento de planos de ação e metas';
        break;
      case 'elogios':
        iconeAba = '❤️';
        corAba = 'bg-green-600';
        descricaoAba = 'Análise de elogios e satisfação dos clientes';
        break;
      case 'empresas':
        iconeAba = '🏢';
        corAba = 'bg-blue-600';
        descricaoAba = 'Análise de empresas clientes e relacionamento';
        break;
      default:
        iconeAba = '📊';
        corAba = 'bg-gray-600';
        descricaoAba = 'Dashboard do sistema';
    }

    // Conteúdo principal com imagem capturada
    if (imagemCapturada) {
      conteudoEspecifico = `
        <div style="text-align: center; margin: 24px 0;">
          <div style="display: inline-block; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
            <img 
              src="${imagemCapturada}" 
              alt="Dashboard ${tituloAba} - ${periodoFormatado}" 
              style="max-width: 100%; height: auto; display: block;"
            />
          </div>
        </div>
      `;
    } else {
      conteudoEspecifico = `
        <div style="text-align: center; color: #64748b; padding: 32px; background: #f8fafc; border-radius: 8px; border: 2px dashed #cbd5e1;">
          <div style="font-size: 32px; margin-bottom: 16px;">📊</div>
          <p style="margin: 0; line-height: 1.6; font-size: 16px;">
            <strong>Dashboard ${tituloAba}</strong><br>
            Período: <strong>${periodoFormatado}</strong>${filtroTexto}
          </p>
          <p style="margin: 16px 0 0 0; font-size: 14px; color: #94a3b8;">
            A captura da tela não pôde ser realizada, mas os dados estão disponíveis no sistema.
          </p>
        </div>
      `;
    }

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Dashboard ${tituloAba} - ${periodoFormatado}</title>
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
      max-width: 900px; 
      margin: 0 auto; 
      background-color: #ffffff; 
      border-radius: 12px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
      overflow: hidden;
    }
    .main-header { 
      background: linear-gradient(135deg, ${corAba} 0%, ${corAba}CC 100%);
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
      border-left: 4px solid ${corAba};
    }
    .period-info h2 {
      color: ${corAba};
      font-size: 20px;
      font-weight: 600;
      margin-bottom: 8px;
    }
    .period-info p {
      color: #64748b;
      font-size: 14px;
      line-height: 1.6;
    }
    .dashboard-content {
      background: white;
      border-radius: 8px;
      padding: 32px;
      margin-bottom: 32px;
      border: 1px solid #e2e8f0;
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
  <!-- Logo Header -->
  <table width="1000" cellpadding="0" cellspacing="0" border="0" bgcolor="#ffffff" style="border-radius: 10px; box-shadow: 0 6px 20px rgba(0, 0, 0, 0.08); overflow: hidden; margin: 0 auto;">
    <tr>
      <td align="center" bgcolor="#1a4eff" style="padding: 20px;">
        <p style="font-size:1px; color:#1a4eff;">Prezados,</p>
        <img src="http://books-sonda.vercel.app/images/logo-sonda.png" alt="Logo Sonda" width="150" style="display: block; width: 100%; max-width: 150px; height: auto; border: 0; line-height: 100%; outline: none; text-decoration: none;" />
      </td>
    </tr>
    <tr>
      <td>
        <div class="container">
    <!-- Main Header -->
    <div class="main-header">
      <h1>${iconeAba} Dashboard ${tituloAba}</h1>
      <p>${descricaoAba}</p>
    </div>
    <!-- Content -->
    <div class="content">
      <!-- Period Info -->
      <div class="period-info">
        <h2>📅 Período do Relatório</h2>
        <p><strong>${periodoFormatado}${filtroTexto}</strong></p>
        <p>Este dashboard contém os principais indicadores e métricas de ${tituloAba.toLowerCase()} para o período selecionado, com filtros aplicados conforme visualização atual.</p>
      </div>
      
      <!-- Dashboard Content -->
      <div class="dashboard-content">
        ${conteudoEspecifico}
      </div>
    </div>
    
    <!-- Footer -->
    <div class="footer">
      <p>
        Sistema de Gestão Administrativa<br>
        Dashboard gerado automaticamente em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}
      </p>
    </div>
    </div>
        </div>
      </td>
    </tr>
  </table>
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

      // Gerar HTML do dashboard
      const htmlDashboard = gerarHtmlDashboard();

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
        html: htmlDashboard,
        attachments: anexosBase64.length > 0 ? anexosBase64 : undefined
      });

      if (resultado.success) {
        toast({
          title: "Sucesso",
          description: `Dashboard ${tituloAba} enviado com sucesso para ${emailsValidos.length} destinatário(s)!`
        });
        
        onFechar();
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
    <>
      {/* Modal de Email */}
      <Dialog open={aberto} onOpenChange={onFechar}>
        <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto bg-gray-50">
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
                    onClick={() => document.getElementById('file-input-dashboard-modal')?.click()}
                    className="flex items-center gap-2"
                  >
                    <FileText className="h-4 w-4" />
                    Adicionar Arquivos
                  </Button>
                  <input
                    id="file-input-dashboard-modal"
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

            {/* Preview do Dashboard */}
            <div>
              <Label className="text-base font-medium flex items-center gap-2">
                Preview do Dashboard
                {capturandoTela && (
                  <div className="flex items-center gap-1 text-sm text-blue-600">
                    <RefreshCw className="h-3 w-3 animate-spin" />
                    Capturando...
                  </div>
                )}
              </Label>
              
              <div className="mt-2 border rounded-lg overflow-hidden bg-white dark:bg-gray-900">
                <div className="bg-gray-100 dark:bg-gray-800 p-3 border-b flex justify-between items-center">
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    <strong>Dashboard:</strong> {tituloAba} | <strong>Período:</strong> {periodoFormatado}
                    {filtros.modulo && filtros.modulo !== 'todos' && (
                      <> | <strong>Módulo:</strong> {filtros.modulo.toUpperCase()}</>
                    )}
                  </div>
                  
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={capturarTelaDashboard}
                    disabled={capturandoTela}
                    className="flex items-center gap-1"
                  >
                    {capturandoTela ? (
                      <>
                        <RefreshCw className="h-3 w-3 animate-spin" />
                        Capturando...
                      </>
                    ) : (
                      <>
                        <Camera className="h-3 w-3" />
                        Recapturar
                      </>
                    )}
                  </Button>
                </div>
                
                <div className="p-4 max-h-[400px] overflow-y-auto bg-white rounded-lg">
                  {previewCaptura ? (
                    <div className="space-y-4">
                      {/* Preview completo do email - Exatamente como no email real */}
                      <div className="border rounded-lg overflow-hidden bg-white">
                        {/* Logo Header - Exatamente como no email */}
                        <div className="bg-blue-600 text-white p-4 text-center" style={{backgroundColor: '#1a4eff'}}>
                          <p className="text-xs opacity-0">Prezados,</p>
                          <div className="flex justify-center">
                            <img 
                              src="http://books-sonda.vercel.app/images/logo-sonda.png" 
                              alt="Logo Sonda" 
                              className="h-12 w-auto"
                              onError={(e) => {
                                // Fallback se imagem não carregar
                                const target = e.currentTarget as HTMLImageElement;
                                target.style.display = 'none';
                                const fallback = target.nextElementSibling as HTMLElement;
                                if (fallback) fallback.style.display = 'block';
                              }}
                            />
                            <div className="hidden text-white font-bold text-lg">SONDA</div>
                          </div>
                        </div>

                        {/* Container principal - como no email */}
                        <div className="bg-white">
                          {/* Main Header - como no email */}
                          <div 
                            className="text-white p-8 text-center"
                            style={{
                              background: abaAtiva === 'requerimentos' ? 'linear-gradient(135deg, #0066CC 0%, #0066CCCC 100%)' :
                                         abaAtiva === 'planos-acao' ? 'linear-gradient(135deg, #3b82f6 0%, #3b82f6CC 100%)' :
                                         abaAtiva === 'elogios' ? 'linear-gradient(135deg, #ec4899 0%, #ec4899CC 100%)' :
                                         abaAtiva === 'empresas' ? 'linear-gradient(135deg, #8b5cf6 0%, #8b5cf6CC 100%)' :
                                         'linear-gradient(135deg, #6b7280 0%, #6b7280CC 100%)'
                            }}
                          >
                            <h1 className="text-2xl font-bold mb-2" style={{fontSize: '32px', fontWeight: '700', marginBottom: '8px', letterSpacing: '-0.025em'}}>
                              {abaAtiva === 'requerimentos' && '📋 Dashboard Requerimentos'}
                              {abaAtiva === 'planos-acao' && '🎯 Dashboard Planos de Ação'}
                              {abaAtiva === 'elogios' && '❤️ Dashboard Elogios'}
                              {abaAtiva === 'empresas' && '🏢 Dashboard Empresas'}
                              {!['requerimentos', 'planos-acao', 'elogios', 'empresas'].includes(abaAtiva) && `📊 Dashboard ${tituloAba}`}
                            </h1>
                            <p className="text-lg opacity-90" style={{fontSize: '18px', opacity: '0.9', fontWeight: '400'}}>
                              {abaAtiva === 'requerimentos' && 'Análise detalhada de requerimentos, faturamento e performance'}
                              {abaAtiva === 'planos-acao' && 'Acompanhamento de planos de ação e metas'}
                              {abaAtiva === 'elogios' && 'Análise de elogios e satisfação dos clientes'}
                              {abaAtiva === 'empresas' && 'Análise de empresas clientes e relacionamento'}
                              {!['requerimentos', 'planos-acao', 'elogios', 'empresas'].includes(abaAtiva) && 'Dashboard do sistema'}
                            </p>
                          </div>

                          {/* Content */}
                          <div className="p-8">
                            {/* Informações do Período - como no email */}
                            <div 
                              className="p-6 mb-8 rounded-lg"
                              style={{
                                background: 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)',
                                borderLeft: `4px solid ${
                                  abaAtiva === 'requerimentos' ? 'bg-blue-600' :
                                  abaAtiva === 'planos-acao' ? 'bg-gray-600' :
                                  abaAtiva === 'elogios' ? 'bg-green-600' :
                                  abaAtiva === 'empresas' ? 'bg-blue-600' :
                                  'bg-gray-600'
                                }`
                              }}
                            >
                              <h2 
                                className="font-semibold mb-2 text-lg"
                                style={{
                                  color: abaAtiva === 'requerimentos' ? 'bg-blue-600' :
                                         abaAtiva === 'planos-acao' ? 'bg-gray-600' :
                                         abaAtiva === 'elogios' ? 'bg-green-600' :
                                         abaAtiva === 'empresas' ? 'bg-blue-600' :
                                         'bg-gray-600',
                                  fontSize: '20px',
                                  fontWeight: '600'
                                }}
                              >
                                📅 Período do Relatório
                              </h2>
                              <p className="font-semibold text-gray-800 mb-2">
                                {periodoFormatado}
                                {filtros.modulo && filtros.modulo !== 'todos' && (
                                  <span> (Módulo: {filtros.modulo.toUpperCase()})</span>
                                )}
                              </p>
                              <p className="text-sm text-gray-600" style={{color: '#64748b', fontSize: '14px', lineHeight: '1.6'}}>
                                Este dashboard contém os principais indicadores e métricas de {tituloAba.toLowerCase()} para o período selecionado, com filtros aplicados conforme visualização atual.
                              </p>
                            </div>

                            {/* Dashboard Content - como no email */}
                            <div className="bg-white rounded-lg p-8 mb-8 border" style={{border: '1px solid #e2e8f0'}}>
                              <div className="text-center" style={{margin: '24px 0'}}>
                                <div className="inline-block" style={{boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'}}>
                                  <img 
                                    src={previewCaptura} 
                                    alt={`Dashboard ${tituloAba} - ${periodoFormatado}`}
                                    className="w-full h-auto block"
                                    style={{maxWidth: '100%', height: 'auto', display: 'block'}}
                                  />
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Footer - como no email */}
                          <div className="bg-gray-50 p-6 text-center border-t" style={{background: '#f8fafc', borderTop: '1px solid #e2e8f0'}}>
                            <p className="text-gray-600 text-xs" style={{color: '#64748b', fontSize: '12px', lineHeight: '1.5'}}>
                              Sistema de Gestão Administrativa<br />
                              Dashboard gerado automaticamente em {new Date().toLocaleDateString('pt-BR')} às {new Date().toLocaleTimeString('pt-BR')}
                            </p>
                          </div>
                        </div>
                      </div>

                      <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                        Preview completo do email que será enviado
                      </p>
                    </div>
                  ) : capturandoTela ? (
                    <div className="text-center py-8">
                      <RefreshCw className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-3" />
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Capturando a tela do dashboard...
                      </p>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Camera className="h-8 w-8 text-gray-400 mx-auto mb-3" />
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                        Captura da tela não disponível
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={capturarTelaDashboard}
                        className="flex items-center gap-2"
                      >
                        <Camera className="h-4 w-4" />
                        Tentar Capturar Novamente
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={onFechar}
              disabled={enviandoEmail}
            >
              Cancelar
            </Button>
            <Button
              onClick={() => setConfirmacaoAberta(true)}
              disabled={enviandoEmail || destinatarios.length === 0}
              className="bg-blue-600 hover:bg-blue-700 text-white"
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
              Você está prestes a enviar o dashboard <strong>{tituloAba}</strong> referente ao período de <strong>{periodoFormatado}</strong>:
              <br /><br />
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
              O dashboard será enviado exatamente como está sendo visualizado, com todos os filtros aplicados.
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
              className="bg-blue-600 hover:bg-blue-700 text-white"
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
    </>
  );
}