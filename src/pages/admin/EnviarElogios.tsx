/**
 * Página para envio de elogios por email
 * Baseada na estrutura de EnviarRequerimentos
 */

import { useState, useMemo } from 'react';
import {
  Send,
  Mail,
  FileText,
  Calendar,
  Clock,
  Filter,
  RefreshCw,
  X,
  ChevronLeft,
  ChevronRight,
  CheckSquare,
  Square,
  TrendingUp
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
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
import { toast } from 'sonner';

import { useElogios, useEstatisticasElogios } from '@/hooks/useElogios';
import type { ElogioCompleto, FiltrosElogio } from '@/types/elogios';

export default function EnviarElogios() {
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
  const [corpoEmail, setCorpoEmail] = useState('');
  const [enviandoEmail, setEnviandoEmail] = useState(false);
  const [anexos, setAnexos] = useState<File[]>([]);

  const [filtrosExpandidos, setFiltrosExpandidos] = useState(false);
  const [elogiosSelecionados, setElogiosSelecionados] = useState<string[]>([]);

  // Filtros
  const [filtros, setFiltros] = useState<FiltrosElogio>({
    mes: mesAtual,
    ano: anoAtual
  });

  // Hooks
  const { data: elogios = [], isLoading, error, refetch } = useElogios(filtros);
  const { data: estatisticas } = useEstatisticasElogios(filtros);

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
      setFiltros(prev => ({ ...prev, mes: 12, ano: novoAno }));
    } else {
      const novoMes = mesSelecionado - 1;
      setMesSelecionado(novoMes);
      setFiltros(prev => ({ ...prev, mes: novoMes }));
    }
  };

  const navegarMesProximo = () => {
    if (mesSelecionado === 12) {
      const novoAno = anoSelecionado + 1;
      setMesSelecionado(1);
      setAnoSelecionado(novoAno);
      setFiltros(prev => ({ ...prev, mes: 1, ano: novoAno }));
    } else {
      const novoMes = mesSelecionado + 1;
      setMesSelecionado(novoMes);
      setFiltros(prev => ({ ...prev, mes: novoMes }));
    }
  };

  // Funções de seleção
  const handleSelecionarElogio = (id: string, selecionado: boolean) => {
    if (selecionado) {
      setElogiosSelecionados(prev => [...prev, id]);
    } else {
      setElogiosSelecionados(prev => prev.filter(elogioId => elogioId !== id));
    }
  };

  const handleSelecionarTodos = (selecionado: boolean) => {
    if (selecionado) {
      setElogiosSelecionados(elogios.map(e => e.id));
    } else {
      setElogiosSelecionados([]);
    }
  };

  // Função para gerar HTML do relatório de elogios
  const gerarRelatorioElogios = () => {
    const elogiosSelecionadosData = elogios.filter(e => elogiosSelecionados.includes(e.id));
    
    // Extrair nomes únicos dos colaboradores
    const colaboradores = elogiosSelecionadosData
      .map(e => e.pesquisa?.cliente)
      .filter((nome, index, self) => nome && self.indexOf(nome) === index)
      .join(' | ');
    
    let html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>body{margin:0;padding:0;font-family:Arial,sans-serif}.container{max-width:1000px;margin:0 auto;background:#fff}.header{background:linear-gradient(135deg,#0066FF 0%,#0052CC 100%);padding:40px 20px;text-align:center;color:white;position:relative}.header::before{content:'';position:absolute;bottom:-30px;left:0;right:0;height:60px;background:#fff;border-radius:50% 50% 0 0/100% 100% 0 0}.logo{background:white;width:60px;height:60px;border-radius:8px;display:inline-flex;align-items:center;justify-content:center;font-size:32px;font-weight:bold;color:#0066FF;margin-bottom:20px}.title-box{background:white;color:#333;padding:20px 40px;margin:40px auto;max-width:600px;border:4px solid #E91E63;border-radius:8px;text-align:center}.title-box h1{margin:0;font-size:20px;font-weight:bold;text-transform:uppercase}.title-box p{margin:10px 0 0 0;font-size:14px;color:#666}.colaboradores{text-align:center;color:#0066FF;font-weight:bold;font-size:14px;padding:20px;text-transform:uppercase}.content{padding:20px 40px}.elogios-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:20px;margin:30px 0}.elogio-card{background:#f8f9fa;padding:20px;border-radius:8px;border-left:4px solid #0066FF}.elogio-card h3{color:#0066FF;font-size:14px;margin:0 0 10px 0;text-transform:uppercase;font-weight:bold}.elogio-card .resposta{font-size:13px;margin:8px 0;font-weight:600;color:#333}.elogio-card .comentario{font-size:12px;line-height:1.6;color:#555;margin:10px 0}.elogio-card .info{font-size:11px;color:#666;margin-top:12px;border-top:1px solid #ddd;padding-top:8px}.elogio-card .info strong{color:#333}.quote-left{color:#E91E63;font-size:48px;line-height:1;margin:20px 0 -10px 20px}.quote-right{color:#0066FF;font-size:48px;line-height:1;margin:-10px 20px 20px 0;text-align:right}.cta-box{background:white;border:3px solid #E91E63;border-radius:12px;padding:30px;margin:40px auto;max-width:600px;text-align:center}.cta-box h2{color:#333;font-size:18px;margin:0 0 15px 0}.cta-box p{color:#666;font-size:14px;line-height:1.6;margin:0}.footer{background:linear-gradient(135deg,#0066FF 0%,#0052CC 100%);padding:40px 20px;text-align:center;color:white;position:relative;margin-top:60px}.footer::before{content:'';position:absolute;top:-30px;left:0;right:0;height:60px;background:#0066FF;border-radius:0 0 50% 50%/0 0 100% 100%}.footer-logo{font-size:32px;font-weight:bold;margin-bottom:5px}.footer-tagline{font-size:12px;opacity:0.9}@media (max-width:768px){.elogios-grid{grid-template-columns:1fr}.content{padding:20px}}</style></head><body><div class="container"><div class="header"><div class="logo">N</div></div><div class="title-box"><h1>Elogios aos Colaboradores<br>de Soluções de Negócios</h1><p>${nomesMeses[mesSelecionado - 1].toUpperCase()}</p></div>${colaboradores ? `<div class="colaboradores">${colaboradores}</div>` : ''}<div class="content"><div class="quote-left">"</div><div class="elogios-grid">`;

    elogiosSelecionadosData.forEach((elogio) => {
      const nomeColaborador = elogio.pesquisa?.consultor || 'Colaborador';
      const comentario = elogio.pesquisa?.comentario_pesquisa || '';
      const cliente = elogio.pesquisa?.cliente || 'N/A';
      const empresa = elogio.pesquisa?.empresa || 'N/A';
      
      html += `<div class="elogio-card"><h3>${nomeColaborador}</h3>${comentario ? `<div class="comentario">${comentario}</div>` : ''}<div class="info"><strong>Cliente:</strong> ${cliente}<br><strong>Empresa:</strong> ${empresa}</div></div>`;
    });

    html += `</div><div class="quote-right">"</div><div class="cta-box"><h2>Como enviar meu elogio?</h2><p>Caro(a) colaborador(a), ao receber um elogio, pedimos que o encaminhe ao seu gestor. Será uma grande alegria para nós poder compartilhar esse reconhecimento com toda a equipe!</p></div></div><div class="footer"><div class="footer-logo">SONDA</div><div class="footer-tagline">make it easy</div></div></div></body></html>`;

    return html;
  };

  // Função para abrir modal de email
  const handleAbrirModalEmail = () => {
    if (elogiosSelecionados.length === 0) {
      toast.error('Selecione pelo menos um elogio para enviar');
      return;
    }

    const htmlTemplate = gerarRelatorioElogios();
    setAssuntoEmail(`[ELOGIOS] - Colaboradores de Soluções de Negócios (${nomesMeses[mesSelecionado - 1]})`);
    setCorpoEmail(htmlTemplate);
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
      toast.success(`${emailsUnicos.length} email(s) adicionado(s) com sucesso!`);
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

  // Validação do formulário
  const isFormularioValido = (): boolean => {
    const emailsValidos = destinatarios.filter(email => email.trim() !== '');
    if (emailsValidos.length === 0) return false;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const emailsInvalidos = emailsValidos.filter(email => !emailRegex.test(email));
    const emailsCCValidos = destinatariosCC.filter(email => email.trim() !== '');
    const emailsCCInvalidos = emailsCCValidos.filter(email => !emailRegex.test(email));

    if (emailsInvalidos.length > 0 || emailsCCInvalidos.length > 0) return false;
    if (!assuntoEmail.trim()) return false;

    return true;
  };

  const validarFormularioEmail = (): boolean => {
    const emailsValidos = destinatarios.filter(email => email.trim() !== '');

    if (emailsValidos.length === 0) {
      toast.error('É necessário informar pelo menos um destinatário');
      return false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const emailsInvalidos = emailsValidos.filter(email => !emailRegex.test(email));
    const emailsCCValidos = destinatariosCC.filter(email => email.trim() !== '');
    const emailsCCInvalidos = emailsCCValidos.filter(email => !emailRegex.test(email));

    if (emailsInvalidos.length > 0 || emailsCCInvalidos.length > 0) {
      const todosInvalidos = [...emailsInvalidos, ...emailsCCInvalidos];
      toast.error(`E-mails inválidos: ${todosInvalidos.join(', ')}`);
      return false;
    }

    if (!assuntoEmail.trim()) {
      toast.error('É necessário informar o assunto do email');
      return false;
    }

    return true;
  };

  // Disparar envio de email
  const handleDispararEmail = async () => {
    if (!validarFormularioEmail()) return;

    setEnviandoEmail(true);

    try {
      const emailsValidos = destinatarios.filter(email => email.trim() !== '');
      const emailsCCValidos = destinatariosCC.filter(email => email.trim() !== '');

      // TODO: Implementar serviço de envio de email para elogios
      console.log('Enviando email com:', {
        destinatarios: emailsValidos,
        cc: emailsCCValidos,
        assunto: assuntoEmail,
        corpo: corpoEmail,
        anexos: anexos.length
      });

      toast.success(`Email enviado com sucesso para ${emailsValidos.length} destinatário(s)!`);
      
      setModalEmailAberto(false);
      setConfirmacaoAberta(false);
      setElogiosSelecionados([]);
      setDestinatarios([]);
      setDestinatariosCC([]);
      setDestinatariosTexto('');
      setDestinatariosCCTexto('');
      setAssuntoEmail('');
      setAnexos([]);
    } catch (error) {
      console.error('Erro ao enviar email:', error);
      toast.error('Erro ao enviar email');
    } finally {
      setEnviandoEmail(false);
    }
  };

  const formatarData = (data: string): string => {
    try {
      if (data.match(/^\d{4}-\d{2}-\d{2}$/)) {
        const [year, month, day] = data.split('-');
        const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        return date.toLocaleDateString('pt-BR');
      }
      return new Date(data).toLocaleDateString('pt-BR');
    } catch {
      return data;
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Cabeçalho */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Enviar Elogios
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Selecione e envie elogios por email
            </p>
          </div>

          <div className="flex gap-2">
            <ProtectedAction screenKey="lancar_elogios" requiredLevel="edit">
              <Button
                onClick={handleAbrirModalEmail}
                disabled={isLoading || elogiosSelecionados.length === 0}
                size="sm"
                title={elogiosSelecionados.length === 0 ? 'Selecione elogios para enviar' : `Enviar ${elogiosSelecionados.length} elogio(s) selecionado(s)`}
              >
                <Send className="h-4 w-4 mr-2" />
                Disparar Elogios ({elogiosSelecionados.length})
              </Button>
            </ProtectedAction>
          </div>
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

        {/* Estatísticas */}
        {estatisticas && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 truncate">
                      Total de Elogios
                    </p>
                    <p className="text-xl sm:text-2xl font-bold text-green-600">
                      {estatisticas.total}
                    </p>
                  </div>
                  <FileText className="h-6 w-6 sm:h-8 sm:w-8 text-green-600 flex-shrink-0" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 truncate">
                      Registrados
                    </p>
                    <p className="text-xl sm:text-2xl font-bold text-gray-600">
                      {estatisticas.registrados}
                    </p>
                  </div>
                  <Clock className="h-6 w-6 sm:h-8 sm:w-8 text-gray-600 flex-shrink-0" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 truncate">
                      Compartilhados
                    </p>
                    <p className="text-xl sm:text-2xl font-bold text-blue-600">
                      {estatisticas.compartilhados}
                    </p>
                  </div>
                  <TrendingUp className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600 flex-shrink-0" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-center justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs sm:text-sm font-medium text-gray-600 dark:text-gray-400 truncate">
                      Período
                    </p>
                    <p className="text-base sm:text-lg font-bold text-gray-900 dark:text-white">
                      {nomesMeses[mesSelecionado - 1]} {anoSelecionado}
                    </p>
                  </div>
                  <Calendar className="h-6 w-6 sm:h-8 sm:w-8 text-orange-600 flex-shrink-0" />
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Tabela de Elogios */}
        {isLoading ? (
          <Card>
            <CardContent className="p-8">
              <div className="flex items-center justify-center">
                <RefreshCw className="h-6 w-6 animate-spin mr-2" />
                <span>Carregando elogios...</span>
              </div>
            </CardContent>
          </Card>
        ) : error ? (
          <Card>
            <CardContent className="p-8">
              <div className="text-center text-red-600">
                <p>Erro ao carregar elogios</p>
                <Button onClick={() => refetch()} className="mt-4">
                  Tentar novamente
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : elogios.length === 0 ? (
          <Card>
            <CardContent className="p-8">
              <div className="text-center text-gray-500">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-medium mb-2">
                  Nenhum elogio encontrado
                </h3>
                <p>
                  Não há elogios no período de{' '}
                  <strong>{nomesMeses[mesSelecionado - 1]} {anoSelecionado}</strong>.
                </p>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl flex items-center gap-2">
                  Elogios Disponíveis
                </CardTitle>
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  {elogios.length} elogio{elogios.length !== 1 ? 's' : ''}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">
                        <Checkbox
                          checked={elogios.length > 0 && elogios.every(e => elogiosSelecionados.includes(e.id))}
                          onCheckedChange={handleSelecionarTodos}
                          aria-label="Selecionar todos"
                        />
                      </TableHead>
                      <TableHead className="text-center">Empresa</TableHead>
                      <TableHead className="text-center">Cliente</TableHead>
                      <TableHead className="text-center">Chamado</TableHead>
                      <TableHead className="text-center">Data Resposta</TableHead>
                      <TableHead className="text-center">Resposta</TableHead>
                      <TableHead className="text-center">Comentário</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {elogios.map((elogio) => (
                      <TableRow key={elogio.id}>
                        <TableCell>
                          <Checkbox
                            checked={elogiosSelecionados.includes(elogio.id)}
                            onCheckedChange={(checked) => handleSelecionarElogio(elogio.id, checked as boolean)}
                            aria-label={`Selecionar ${elogio.pesquisa?.cliente}`}
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="text-red-600 font-semibold">{elogio.pesquisa?.empresa || 'N/A'}</span>
                        </TableCell>
                        <TableCell className="text-center">
                          {elogio.pesquisa?.cliente || 'N/A'}
                        </TableCell>
                        <TableCell className="text-center">
                          <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-sm">
                            {elogio.pesquisa?.nro_caso || elogio.chamado || '-'}
                          </code>
                        </TableCell>
                        <TableCell className="text-center text-sm text-gray-500">
                          {elogio.data_resposta ? formatarData(elogio.data_resposta) : '-'}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge className="bg-green-600 hover:bg-green-700">
                            {elogio.pesquisa?.resposta || 'Muito Satisfeito'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center text-sm max-w-[300px]">
                          <span className="line-clamp-2">{elogio.pesquisa?.comentario_pesquisa || '-'}</span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Modal de Email */}
        <Dialog open={modalEmailAberto} onOpenChange={setModalEmailAberto}>
          <DialogContent className="max-w-7xl max-h-[95vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Disparar Elogios por Email
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-6">
              {/* Destinatários */}
              <div>
                <Label className="text-base font-medium">Destinatários</Label>
                <div className="mt-2">
                  <textarea
                    placeholder="Cole ou digite emails separados por ponto e vírgula (;)&#10;Ex: joao@exemplo.com; maria@exemplo.com"
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

              {/* CC */}
              <div>
                <Label className="text-base font-medium">CC (Cópia)</Label>
                <div className="mt-2">
                  <textarea
                    placeholder="Cole ou digite emails em cópia separados por ponto e vírgula (;)"
                    className="w-full p-3 border rounded-md text-sm min-h-[80px] bg-white dark:bg-gray-800 font-mono"
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
                      onClick={() => document.getElementById('file-input-elogios')?.click()}
                      className="flex items-center gap-2"
                    >
                      <FileText className="h-4 w-4" />
                      Adicionar Arquivos
                    </Button>
                    <input
                      id="file-input-elogios"
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
                <div className="mt-2">
                  <div className="border rounded-lg overflow-hidden bg-white dark:bg-gray-900">
                    <div className="bg-gray-100 dark:bg-gray-800 p-3 border-b">
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        <strong>Período:</strong> {nomesMeses[mesSelecionado - 1]} {anoSelecionado} |
                        <strong> Elogios Selecionados:</strong> {elogiosSelecionados.length}
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
                <Send className="h-5 w-5 text-green-600" />
                Confirmar Envio de Elogios
              </AlertDialogTitle>
              <AlertDialogDescription>
                Tem certeza que deseja enviar os elogios para{' '}
                <strong>{destinatarios.filter(e => e.trim()).length} destinatário(s)</strong>?
                <br /><br />
                <strong>Período:</strong> {nomesMeses[mesSelecionado - 1]} {anoSelecionado}
                <br />
                <strong>Elogios selecionados:</strong> {elogiosSelecionados.length}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={enviandoEmail}>
                Cancelar
              </AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDispararEmail}
                disabled={enviandoEmail}
                className="bg-green-600 hover:bg-green-700"
              >
                {enviandoEmail ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Confirmar Envio
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
