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
  TrendingUp,
  Database
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
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from '@/components/ui/tabs';

import ProtectedAction from '@/components/auth/ProtectedAction';
import { useToast } from '@/hooks/use-toast';
import { useCacheManager } from '@/hooks/useCacheManager';

import { useElogios, useEstatisticasElogios, useAtualizarElogio } from '@/hooks/useElogios';
import { useEmpresas } from '@/hooks/useEmpresas';
import { emailService } from '@/services/emailService';
import { elogiosTemplateService } from '@/services/elogiosTemplateService';
import type { ElogioCompleto, FiltrosElogio } from '@/types/elogios';
import { getBadgeResposta } from '@/utils/badgeUtils';
import SeletorTemplateElogios from '@/components/admin/elogios/SeletorTemplateElogios';

export default function EnviarElogios() {
  // Hook para toast
  const { toast } = useToast();
  const { clearFeatureCache } = useCacheManager();

  // Função para regenerar template quando seleção mudar
  const regenerarTemplate = async (templateId?: string) => {
    try {
      const templateParaUsar = templateId || templateSelecionado;
      console.log('🔄 Regenerando template com seleção:', templateParaUsar);
      
      const htmlTemplate = await gerarRelatorioElogios(templateParaUsar);
      setCorpoEmail(htmlTemplate);
      console.log('✅ Template regenerado com sucesso');
    } catch (error) {
      console.error('❌ Erro ao regenerar template:', error);
      toast({
        title: "Erro",
        description: "Erro ao gerar template. Tente novamente.",
        variant: "destructive"
      });
    }
  };
  
  // Estados
  const [mesAtual] = useState(new Date().getMonth() + 1);
  const [anoAtual] = useState(new Date().getFullYear());
  const [mesSelecionado, setMesSelecionado] = useState(mesAtual);
  const [anoSelecionado, setAnoSelecionado] = useState(anoAtual);

  const [modalEmailAberto, setModalEmailAberto] = useState(false);
  const [confirmacaoAberta, setConfirmacaoAberta] = useState(false);

  const [destinatariosTexto, setDestinatariosTexto] = useState('');
  const [destinatariosCCTexto, setDestinatariosCCTexto] = useState('');
  const [abaAtiva, setAbaAtiva] = useState('enviar-colaboradores');
  const [destinatarios, setDestinatarios] = useState<string[]>([]);
  const [destinatariosCC, setDestinatariosCC] = useState<string[]>([]);
  const [assuntoEmail, setAssuntoEmail] = useState('');
  const [corpoEmail, setCorpoEmail] = useState('');
  const [enviandoEmail, setEnviandoEmail] = useState(false);
  const [anexos, setAnexos] = useState<File[]>([]);

  const [filtrosExpandidos, setFiltrosExpandidos] = useState(false);
  const [elogiosSelecionados, setElogiosSelecionados] = useState<string[]>([]);
  const [templateSelecionado, setTemplateSelecionado] = useState<string>('');

  // Filtros - Buscar apenas elogios com status "compartilhado"
  const [filtros, setFiltros] = useState<FiltrosElogio>({
    mes: mesAtual,
    ano: anoAtual,
    status: ['compartilhado'] // Filtrar apenas elogios compartilhados
  });

  // Atualizar filtros baseado na aba ativa
  const filtrosComAba = useMemo(() => {
    return {
      ...filtros,
      status: abaAtiva === 'enviar-colaboradores' ? ['compartilhado'] : ['enviado']
    };
  }, [filtros, abaAtiva]);

  // Hooks
  const { data: elogios = [], isLoading, error, refetch } = useElogios(filtrosComAba);
  const atualizarElogio = useAtualizarElogio();
  
  // Estatísticas separadas para cada status (para contadores das abas)
  const { data: estatisticasColaboradores } = useEstatisticasElogios({
    ...filtros,
    status: ['compartilhado']
  });
  const { data: estatisticasEnviados } = useEstatisticasElogios({
    ...filtros,
    status: ['enviado']
  });
  
  // Estatísticas gerais (para os cards)
  const { data: estatisticas } = useEstatisticasElogios(filtros);
  const { empresas } = useEmpresas();

  // Função para obter nome abreviado da empresa e verificar se existe no cadastro
  const obterDadosEmpresa = (nomeCompleto: string | undefined): { nome: string; encontrada: boolean } => {
    if (!nomeCompleto) return { nome: '-', encontrada: false };
    
    // Buscar empresa correspondente pelo nome completo ou abreviado
    const empresaEncontrada = empresas.find(
      e => e.nome_completo === nomeCompleto || e.nome_abreviado === nomeCompleto
    );
    
    // Retornar nome abreviado se encontrado, senão retornar o nome original
    return {
      nome: empresaEncontrada ? empresaEncontrada.nome_abreviado : nomeCompleto,
      encontrada: !!empresaEncontrada
    };
  };

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
      setFiltros(prev => ({ ...prev, mes: 12, ano: novoAno, status: ['compartilhado'] }));
    } else {
      const novoMes = mesSelecionado - 1;
      setMesSelecionado(novoMes);
      setFiltros(prev => ({ ...prev, mes: novoMes, status: ['compartilhado'] }));
    }
  };

  const navegarMesProximo = () => {
    if (mesSelecionado === 12) {
      const novoAno = anoSelecionado + 1;
      setMesSelecionado(1);
      setAnoSelecionado(novoAno);
      setFiltros(prev => ({ ...prev, mes: 1, ano: novoAno, status: ['compartilhado'] }));
    } else {
      const novoMes = mesSelecionado + 1;
      setMesSelecionado(novoMes);
      setFiltros(prev => ({ ...prev, mes: novoMes, status: ['compartilhado'] }));
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

  // Função para gerar HTML do relatório de elogios usando template dinâmico
  const gerarRelatorioElogios = async (templateId?: string): Promise<string> => {
    try {
      const templateParaUsar = templateId || templateSelecionado;
      console.log('🎨 Gerando relatório de elogios com template dinâmico:', templateParaUsar);
      
      const elogiosSelecionadosData = elogios.filter(e => elogiosSelecionados.includes(e.id));
      
      console.log(`📊 Processando ${elogiosSelecionadosData.length} elogios selecionados`);
      console.log(`📅 Período: ${nomesMeses[mesSelecionado - 1]} ${anoSelecionado}`);
      
      // Processar template com os dados dos elogios
      const resultado = await elogiosTemplateService.processarTemplate(
        elogiosSelecionadosData,
        mesSelecionado,
        anoSelecionado,
        templateParaUsar || undefined
      );
      
      console.log('✅ Template processado com sucesso:', {
        elogiosProcessados: resultado.elogiosProcessados,
        linhasGeradas: resultado.linhasGeradas,
        variaveisUsadas: Object.keys(resultado.variables).length
      });
      
      return resultado.html;
    } catch (error) {
      console.error('❌ Erro ao processar template de elogios:', error);
      
      // Fallback para template hardcoded em caso de erro
      console.warn('🔄 Usando template hardcoded como fallback...');
      return gerarRelatorioElogiosFallback();
    }
  };

  // Função fallback com template hardcoded (mantida para emergências)
  const gerarRelatorioElogiosFallback = (): string => {
    const elogiosSelecionadosData = elogios.filter(e => elogiosSelecionados.includes(e.id));
    
    // Dividir elogios em grupos de 4 para criar linhas (atualizado para 4 como no template)
    const elogiosPorLinha: typeof elogiosSelecionadosData[] = [];
    for (let i = 0; i < elogiosSelecionadosData.length; i += 4) {
      elogiosPorLinha.push(elogiosSelecionadosData.slice(i, i + 4));
    }
    
    let html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f3f4f6; }
    .email-container { max-width: 1200px; margin: 0 auto; background-color: #ffffff; width: 100%; }
    .header-image { width: 100%; display: block; }
    .title-section { text-align: center; padding: 24px 48px; }
    .title-main { font-size: 16px; font-weight: bold; margin: 0 0 8px 0; color: #000000; line-height: 1.3; }
    .title-sub { font-size: 14px; font-weight: bold; margin: 0 0 8px 0; color: #000000; }
    .title-month { font-size: 18px; font-weight: bold; margin: 0; color: #000000; letter-spacing: 1px; }
    .main-content { max-width: 1200px; margin: 0 auto; padding: 40px 48px; }
    .elogios-row { display: table; width: 100%; margin-bottom: 40px; }
    .elogio-cell { display: table-cell; width: 25%; padding: 10px; vertical-align: top; }
    .elogio-card { border: 1px solid #e5e7eb; padding: 16px; border-radius: 8px; height: 100%; }
    .elogio-name { color: #0066FF; font-weight: bold; font-size: 14px; margin-bottom: 16px; text-transform: uppercase; }
    .elogio-response { font-weight: bold; margin-bottom: 8px; }
    .elogio-comment { margin-bottom: 16px; font-size: 12px; line-height: 1.5; }
    .elogio-info { font-size: 12px; color: #000000; font-weight: bold; }
    .divider-row { display: table; width: 100%; margin: 48px auto; }
    .divider-line { height: 2px; background-color: #000000; }
    .quote-cell { width: 60px; text-align: center; vertical-align: middle; }
    .quote-text { font-size: 40px; line-height: 1; font-weight: bold; }
    .quote-blue { color: #0066FF; }
    .quote-pink { color: #FF0066; }
    .footer-image { width: 100%; height: auto; display: block; }
    @media only screen and (max-width: 600px) {
      .title-section { padding: 16px; }
      .main-content { padding: 20px 16px; }
      .elogio-cell { display: block; width: 100% !important; margin-bottom: 24px; }
    }
  </style>
</head>
<body>
  <div class="email-container">
    <!-- Header -->
    <img src="http://books-sonda.vercel.app/images/header-elogios.png" alt="Header" class="header-image">
    
    <!-- Título -->
    <div class="title-section">
      <h1 class="title-main">ELOGIOS AOS COLABORADORES</h1>
      <h2 class="title-sub">DE SOLUÇÕES DE NEGÓCIOS</h2>
      <h3 class="title-month">${nomesMeses[mesSelecionado - 1].toUpperCase()}</h3>
    </div>
    
    <!-- Container de Elogios -->
    <div class="main-content">`;

    // Gerar linhas de elogios com divisores (3 por linha)
    elogiosPorLinha.forEach((linha, linhaIndex) => {
      // Linha de elogios
      html += '<div class="elogios-row">';
      
      linha.forEach((elogio) => {
        const nomeColaborador = elogio.pesquisa?.prestador || 'Colaborador';
        const comentario = elogio.pesquisa?.comentario_pesquisa || '';
        const resposta = elogio.pesquisa?.resposta || '';
        const cliente = elogio.pesquisa?.cliente || 'N/A';
        const empresa = elogio.pesquisa?.empresa || 'N/A';
        
        html += `
        <div class="elogio-cell">
          <div class="elogio-card">
            <h4 class="elogio-name">${nomeColaborador}</h4>`;
        
        if (resposta) {
          html += `<p class="elogio-response">${resposta}</p>`;
        }
        if (comentario) {
          html += `<p class="elogio-comment">${comentario}</p>`;
        }
        
        html += `
            <div class="elogio-info">
              <p><strong>Cliente:</strong> ${cliente}</p>
              <p><strong>Empresa:</strong> ${empresa}</p>
            </div>
          </div>
        </div>`;
      });
      
      html += '</div>';
      
      // Adicionar divisor entre linhas (exceto após a última linha)
      if (linhaIndex < elogiosPorLinha.length - 1) {
        const isEven = linhaIndex % 2 === 0;
        const quoteColor = isEven ? 'quote-blue' : 'quote-pink';
        
        if (isEven) {
          // Aspas à direita (azul)
          html += `
          <div class="divider-row">
            <div style="display: table-cell;"><div class="divider-line"></div></div>
            <div class="quote-cell"><span class="quote-text ${quoteColor}">"</span></div>
          </div>`;
        } else {
          // Aspas à esquerda (rosa)
          html += `
          <div class="divider-row">
            <div class="quote-cell"><span class="quote-text ${quoteColor}">"</span></div>
            <div style="display: table-cell;"><div class="divider-line"></div></div>
          </div>`;
        }
      }
    });

    html += `
    </div>
    
    <!-- Footer -->
    <img src="http://books-sonda.vercel.app/images/rodape-elogios.png" alt="Footer" class="footer-image">
  </div>
</body>
</html>`;

    return html;
  };

  // Função para abrir modal de email
  const handleAbrirModalEmail = async () => {
    if (elogiosSelecionados.length === 0) {
      toast({
        title: "Erro",
        description: "Selecione pelo menos um elogio para enviar",
        variant: "destructive"
      });
      return;
    }

    // Limpar campos e abrir modal
    setAssuntoEmail(`[ELOGIOS] - Colaboradores de Soluções de Negócios (${nomesMeses[mesSelecionado - 1]})`);
    setCorpoEmail(''); // Será gerado quando template for selecionado
    setDestinatarios([]);
    setDestinatariosCC([]);
    setDestinatariosTexto('');
    setDestinatariosCCTexto('');
    setAnexos([]);
    setModalEmailAberto(true);
    
    // Gerar template inicial se já houver um selecionado
    if (templateSelecionado) {
      await regenerarTemplate();
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

  // Disparar envio de email
  const handleDispararEmail = async () => {
    if (!validarFormularioEmail()) return;

    setEnviandoEmail(true);

    try {
      const emailsValidos = destinatarios.filter(email => email.trim() !== '');
      const emailsCCValidos = destinatariosCC.filter(email => email.trim() !== '');

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
        html: corpoEmail,
        attachments: anexosBase64.length > 0 ? anexosBase64 : undefined
      });

      if (resultado.success) {
        // Atualizar status dos elogios selecionados para "enviado"
        try {
          await Promise.all(
            elogiosSelecionados.map(async (elogioId) => {
              await atualizarElogio.mutateAsync({ 
                id: elogioId, 
                dados: { status: 'enviado' } 
              });
            })
          );
        } catch (error) {
          console.error('Erro ao atualizar status dos elogios:', error);
        }

        toast({
          title: "Sucesso",
          description: `Email enviado com sucesso para ${emailsValidos.length} destinatário(s)!`
        });
        
        setModalEmailAberto(false);
        setConfirmacaoAberta(false);
        setElogiosSelecionados([]);
        setDestinatarios([]);
        setDestinatariosCC([]);
        setDestinatariosTexto('');
        setDestinatariosCCTexto('');
        setAssuntoEmail('');
        setAnexos([]);
        
        // Limpar cache e recarregar dados para refletir as mudanças
        clearFeatureCache('pesquisas');
        await refetch();
      } else {
        toast({
          title: "Erro",
          description: `Erro ao enviar email: ${resultado.error || 'Erro desconhecido'}`,
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error('Erro ao enviar email:', error);
      toast({
        title: "Erro",
        description: 'Erro ao enviar email: ' + (error instanceof Error ? error.message : 'Erro desconhecido'),
        variant: "destructive"
      });
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
            {abaAtiva === 'enviar-colaboradores' && (
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
            )}
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

        {/* Sistema de Abas */}
        <Tabs value={abaAtiva} onValueChange={setAbaAtiva} className="w-full space-y-4 max-w-full overflow-hidden">
          <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
            <TabsList>
              <TabsTrigger value="enviar-colaboradores">
                Enviar Elogios Colaboradores ({estatisticasColaboradores?.total || 0})
              </TabsTrigger>
              <TabsTrigger value="historico-enviados">
                Histórico de Enviados ({estatisticasEnviados?.total || 0})
              </TabsTrigger>
            </TabsList>

            {/* Informação de selecionados - apenas para aba enviar colaboradores */}
            {abaAtiva === 'enviar-colaboradores' && elogiosSelecionados.length > 0 && (
              <div className="flex flex-wrap gap-4 items-center">
                <Badge variant="outline" className="text-xs sm:text-sm">
                  {elogiosSelecionados.length} selecionado{elogiosSelecionados.length !== 1 ? 's' : ''}
                </Badge>
              </div>
            )}
          </div>

          <TabsContent value="enviar-colaboradores" className="space-y-4">
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
                <CardTitle className="text-lg lg:text-xl">
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
                      <TableHead className="w-[120px] text-center">Chamado</TableHead>
                      <TableHead className="w-[180px] text-center">Empresa</TableHead>
                      <TableHead className="w-[120px] text-center">Data Resposta</TableHead>
                      <TableHead className="w-[150px] text-center">Cliente</TableHead>
                      <TableHead className="w-[200px] text-center">Comentário</TableHead>
                      <TableHead className="w-[140px] text-center">Resposta</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {elogios.map((elogio) => {
                      const { nome: nomeEmpresa, encontrada: empresaEncontrada } = obterDadosEmpresa(elogio.pesquisa?.empresa);
                      
                      return (
                        <TableRow key={elogio.id}>
                          <TableCell>
                            <Checkbox
                              checked={elogiosSelecionados.includes(elogio.id)}
                              onCheckedChange={(checked) => handleSelecionarElogio(elogio.id, checked as boolean)}
                              aria-label={`Selecionar ${elogio.pesquisa?.cliente}`}
                            />
                          </TableCell>
                          <TableCell className="text-center">
                            {elogio.pesquisa?.nro_caso ? (
                              <div className="flex items-center justify-center gap-2 whitespace-nowrap">
                                <Database className="h-4 w-4 text-blue-600 flex-shrink-0" />
                                <span className="text-xs text-muted-foreground font-medium">
                                  {elogio.pesquisa.tipo_caso && `${elogio.pesquisa.tipo_caso} `}
                                  <span className="font-mono text-foreground">{elogio.pesquisa.nro_caso}</span>
                                </span>
                              </div>
                            ) : (
                              <div className="flex items-center justify-center gap-2">
                                <Database className="h-4 w-4 text-blue-600" />
                                <span>-</span>
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="font-medium text-xs sm:text-sm max-w-[180px] text-center">
                            {(() => {
                              const isOrigemSqlServer = elogio.pesquisa?.origem === 'sql_server';
                              // Só exibe em vermelho se for do SQL Server E não encontrada
                              const deveExibirVermelho = isOrigemSqlServer && !empresaEncontrada;
                              return (
                                <span className={`font-semibold ${deveExibirVermelho ? 'text-red-600' : ''}`}>
                                  {nomeEmpresa}
                                </span>
                              );
                            })()}
                          </TableCell>
                          <TableCell className="text-center text-xs sm:text-sm text-muted-foreground">
                            {elogio.data_resposta ? formatarData(elogio.data_resposta) : '-'}
                          </TableCell>
                          <TableCell className="text-center text-xs sm:text-sm max-w-[150px]">
                            <span className="truncate block">{elogio.pesquisa?.cliente || 'N/A'}</span>
                          </TableCell>
                          <TableCell className="text-center text-xs sm:text-sm max-w-[200px]">
                            <span className="line-clamp-2">{elogio.pesquisa?.comentario_pesquisa || '-'}</span>
                          </TableCell>
                          <TableCell className="text-center">
                            {getBadgeResposta(elogio.pesquisa?.resposta) || (
                              <Badge variant="outline" className="text-xs px-2 py-1 whitespace-nowrap">
                                -
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
          </TabsContent>

          <TabsContent value="historico-enviados" className="space-y-4">
            {/* Tabela para Histórico de Enviados */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg lg:text-xl">
                  Histórico de Enviados ({elogios.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <RefreshCw className="h-6 w-6 animate-spin mr-2" />
                    <span>Carregando elogios...</span>
                  </div>
                ) : elogios.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    Nenhum elogio enviado por email encontrado
                  </div>
                ) : (
                  <div className="rounded-md overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[120px] text-center">Chamado</TableHead>
                          <TableHead className="w-[180px] text-center">Empresa</TableHead>
                          <TableHead className="w-[120px] text-center">Data Resposta</TableHead>
                          <TableHead className="w-[150px] text-center">Cliente</TableHead>
                          <TableHead className="w-[200px] text-center">Comentário</TableHead>
                          <TableHead className="w-[140px] text-center">Resposta</TableHead>
                          <TableHead className="text-center w-[120px]">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {elogios.map((elogio) => {
                          const { nome: nomeEmpresa, encontrada: empresaEncontrada } = obterDadosEmpresa(elogio.pesquisa?.empresa);
                          
                          return (
                            <TableRow key={elogio.id}>
                              <TableCell className="text-center">
                                {elogio.pesquisa?.nro_caso ? (
                                  <div className="flex items-center justify-center gap-2 whitespace-nowrap">
                                    <Database className="h-4 w-4 text-blue-600 flex-shrink-0" />
                                    <span className="text-xs text-muted-foreground font-medium">
                                      {elogio.pesquisa.tipo_caso && `${elogio.pesquisa.tipo_caso} `}
                                      <span className="font-mono text-foreground">{elogio.pesquisa.nro_caso}</span>
                                    </span>
                                  </div>
                                ) : (
                                  <div className="flex items-center justify-center gap-2">
                                    <Database className="h-4 w-4 text-blue-600" />
                                    <span>-</span>
                                  </div>
                                )}
                              </TableCell>
                              <TableCell className="font-medium text-xs sm:text-sm max-w-[180px] text-center">
                                {(() => {
                                  const isOrigemSqlServer = elogio.pesquisa?.origem === 'sql_server';
                                  const deveExibirVermelho = isOrigemSqlServer && !empresaEncontrada;
                                  return (
                                    <span className={`font-semibold ${deveExibirVermelho ? 'text-red-600' : ''}`}>
                                      {nomeEmpresa}
                                    </span>
                                  );
                                })()}
                              </TableCell>
                              <TableCell className="text-center text-xs sm:text-sm text-muted-foreground">
                                {elogio.data_resposta ? formatarData(elogio.data_resposta) : '-'}
                              </TableCell>
                              <TableCell className="text-center text-xs sm:text-sm max-w-[150px]">
                                <span className="truncate block">{elogio.pesquisa?.cliente}</span>
                              </TableCell>
                              <TableCell className="text-center text-xs sm:text-sm max-w-[200px]">
                                <span className="line-clamp-2">{elogio.pesquisa?.comentario_pesquisa || '-'}</span>
                              </TableCell>
                              <TableCell className="text-center">
                                {getBadgeResposta(elogio.pesquisa?.resposta) || (
                                  <Badge variant="outline" className="text-xs px-2 py-1 whitespace-nowrap">
                                    -
                                  </Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-center">
                                <Badge variant="secondary" className="text-xs px-2 py-1 bg-green-100 text-green-800">
                                  Enviado por Email
                                </Badge>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

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

              {/* Seletor de Template */}
              <div className="w-1/4">
                <SeletorTemplateElogios
                  templateSelecionado={templateSelecionado}
                  onTemplateChange={async (templateId) => {
                    setTemplateSelecionado(templateId);
                    // Regenerar template automaticamente quando seleção mudar
                    if (templateId) {
                      await regenerarTemplate(templateId);
                    }
                  }}
                  disabled={isLoading || enviandoEmail}
                />
              </div>

              {/* Preview do Relatório */}
              <div>
                {/* Preview do Relatório */}
                <div className="mt-2">
                  <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2">
                    Preview do Relatório
                  </h4>
                  <div className="border rounded-lg overflow-hidden bg-white dark:bg-gray-900">
                    <div className="bg-gray-100 dark:bg-gray-800 p-3 border-b">
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        <strong>Período:</strong> {nomesMeses[mesSelecionado - 1]} {anoSelecionado} |
                        <strong> Elogios:</strong> {elogiosSelecionados.length}
                      </div>
                    </div>
                    <div
                      className="max-h-[600px] overflow-y-auto p-4 email-preview-container"
                      style={{ 
                        isolation: 'isolate',
                        contain: 'style layout',
                        position: 'relative'
                      }}
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
