/**
 * Página para envio de dashboards por email
 * Baseada na estrutura de EnviarElogios
 */

import { useState, useMemo } from 'react';
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
  RefreshCw
} from 'lucide-react';
import AdminLayout from '@/components/admin/LayoutAdmin';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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

export default function EnviarDashboards() {
  // Hook para toast
  const { toast } = useToast();

  // Estados
  const [mesAtual] = useState(new Date().getMonth() + 1);
  const [anoAtual] = useState(new Date().getFullYear());
  const [mesSelecionado, setMesSelecionado] = useState(mesAtual);
  const [anoSelecionado, setAnoSelecionado] = useState(anoAtual);

  const [modalEmailAberto, setModalEmailAberto] = useState(false);
  const [confirmacaoAberta, setConfirmacaoAberta] = useState(false);

  const [destinatariosTexto, setDestinatariosTexto] = useState('');
  const [destinatariosCCTexto, setDestinatariosCCTexto] = useState('');
  const [destinatarios, setDestinatarios] = useState<string[]>([]);
  const [destinatariosCC, setDestinatariosCC] = useState<string[]>([]);
  const [assuntoEmail, setAssuntoEmail] = useState('');
  const [enviandoEmail, setEnviandoEmail] = useState(false);
  const [anexos, setAnexos] = useState<File[]>([]);

  // Nomes dos meses
  const nomesMeses = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

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

  // Função para abrir modal de email
  const handleAbrirModalEmail = () => {
    // Limpar campos e abrir modal
    setAssuntoEmail(`[DASHBOARD] - Relatório Mensal (${nomesMeses[mesSelecionado - 1]} ${anoSelecionado})`);
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

  // Gerar HTML do dashboard
  const gerarHtmlDashboard = (): string => {
    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Dashboard - ${nomesMeses[mesSelecionado - 1]} ${anoSelecionado}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      margin: 0; 
      padding: 20px; 
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
      background-color: #f8fafc; 
      color: #1e293b;
    }
    .container { 
      max-width: 800px; 
      margin: 0 auto; 
      background-color: #ffffff; 
      border-radius: 12px;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
      overflow: hidden;
    }
    .header { 
      background: linear-gradient(135deg, #0066CC 0%, #004499 100%);
      color: white; 
      padding: 32px; 
      text-align: center; 
    }
    .header h1 { 
      font-size: 28px; 
      font-weight: 700; 
      margin-bottom: 8px;
      letter-spacing: -0.025em;
    }
    .header p { 
      font-size: 16px; 
      opacity: 0.9;
      font-weight: 400;
    }
    .content { 
      padding: 32px; 
    }
    .period-info {
      background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
      border-radius: 8px;
      padding: 24px;
      margin-bottom: 32px;
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
    .dashboard-placeholder {
      background: #f8fafc;
      border: 2px dashed #cbd5e1;
      border-radius: 8px;
      padding: 48px 24px;
      text-align: center;
      margin: 24px 0;
    }
    .dashboard-placeholder .icon {
      width: 64px;
      height: 64px;
      background: #e2e8f0;
      border-radius: 50%;
      margin: 0 auto 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
      color: #64748b;
    }
    .dashboard-placeholder h3 {
      color: #475569;
      font-size: 18px;
      font-weight: 600;
      margin-bottom: 8px;
    }
    .dashboard-placeholder p {
      color: #64748b;
      font-size: 14px;
      max-width: 400px;
      margin: 0 auto;
      line-height: 1.6;
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
      .header { padding: 24px 20px; }
      .header h1 { font-size: 24px; }
      .content { padding: 24px 20px; }
      .period-info { padding: 20px; }
      .footer { padding: 20px; }
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div class="header">
      <h1>📊 Dashboard Mensal</h1>
      <p>Relatório de Performance e Indicadores</p>
    </div>
    
    <!-- Content -->
    <div class="content">
      <!-- Period Info -->
      <div class="period-info">
        <h2>📅 Período do Relatório</h2>
        <p><strong>${nomesMeses[mesSelecionado - 1]} de ${anoSelecionado}</strong></p>
        <p>Este relatório contém os principais indicadores e métricas de performance do período selecionado.</p>
      </div>
      
      <!-- Dashboard Placeholder -->
      <div class="dashboard-placeholder">
        <div class="icon">📈</div>
        <h3>Dashboard em Desenvolvimento</h3>
        <p>
          O conteúdo do dashboard será inserido aqui. Esta área pode incluir gráficos, 
          tabelas de dados, métricas de performance e outros indicadores relevantes 
          para o período de <strong>${nomesMeses[mesSelecionado - 1]} ${anoSelecionado}</strong>.
        </p>
      </div>
      
      <!-- Additional Info -->
      <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 16px; margin-top: 24px;">
        <p style="color: #92400e; font-size: 14px; margin: 0;">
          <strong>💡 Nota:</strong> Este é um template base para envio de dashboards. 
          O conteúdo específico do dashboard deve ser integrado conforme necessário.
        </p>
      </div>
    </div>
    
    <!-- Footer -->
    <div class="footer">
      <p>
        <strong>Sonda - Books SND</strong><br>
        Sistema de Gestão Administrativa<br>
        Gerado automaticamente em ${new Date().toLocaleDateString('pt-BR')}
      </p>
      <div class="logo">
        <p style="font-size: 10px; color: #94a3b8;">📊 Dashboard System</p>
      </div>
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
          description: `Dashboard enviado com sucesso para ${emailsValidos.length} destinatário(s)!`
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

        {/* Cards de Informação */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-blue-700 truncate">
                    Período Selecionado
                  </p>
                  <p className="text-2xl font-bold text-blue-900">
                    {nomesMeses[mesSelecionado - 1]}
                  </p>
                  <p className="text-sm text-blue-600">
                    {anoSelecionado}
                  </p>
                </div>
                <Calendar className="h-8 w-8 text-blue-600 flex-shrink-0" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-green-50 to-green-100 border-green-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-green-700 truncate">
                    Status do Dashboard
                  </p>
                  <p className="text-2xl font-bold text-green-900">
                    Pronto
                  </p>
                  <p className="text-sm text-green-600">
                    Para envio
                  </p>
                </div>
                <BarChart3 className="h-8 w-8 text-green-600 flex-shrink-0" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-r from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-purple-700 truncate">
                    Tipo de Relatório
                  </p>
                  <p className="text-2xl font-bold text-purple-900">
                    Mensal
                  </p>
                  <p className="text-sm text-purple-600">
                    Dashboard
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-purple-600 flex-shrink-0" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Preview do Dashboard */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-sonda-blue" />
              Preview do Dashboard - {nomesMeses[mesSelecionado - 1]} {anoSelecionado}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-6 border-2 border-dashed border-gray-300 dark:border-gray-600">
              <div className="text-center">
                <BarChart3 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Dashboard Template
                </h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Este é um template base para envio de dashboards por email.
                </p>
                <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700 max-w-md mx-auto">
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    <strong>Período:</strong> {nomesMeses[mesSelecionado - 1]} {anoSelecionado}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                    O conteúdo específico do dashboard será inserido aqui conforme necessário.
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

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
                Você está prestes a enviar o dashboard de <strong>{nomesMeses[mesSelecionado - 1]} {anoSelecionado}</strong> para:
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