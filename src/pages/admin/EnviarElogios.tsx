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
  Database,
  Eye,
  Search,
  Loader2
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
import { MonthYearPicker } from '@/components/ui/month-year-picker';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
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
import { useElogiosTemplates } from '@/hooks/useElogiosTemplates';
import { useDeParaCategoria } from '@/hooks/useDeParaCategoria';
import { ClienteNomeDisplay } from '@/components/admin/requerimentos/ClienteNomeDisplay';
import { emailService } from '@/services/emailService';
import { elogiosTemplateService } from '@/services/elogiosTemplateService';
import { supabase } from '@/integrations/supabase/client';
import * as elogiosService from '@/services/elogiosService';
import type { ElogioCompleto, FiltrosElogio } from '@/types/elogios';
import { getBadgeResposta } from '@/utils/badgeUtils';
import SeletorTemplateElogios from '@/components/admin/elogios/SeletorTemplateElogios';
import ElogiosExportButtons from '@/components/admin/elogios/ElogiosExportButtons';

export default function EnviarElogios() {
  // Hook para toast
  const { toast } = useToast();
  const { clearFeatureCache } = useCacheManager();
  const { data: deParaCategorias = [] } = useDeParaCategoria();

  // Função para regenerar template quando seleção mudar
  const regenerarTemplate = async (templateId?: string) => {
    try {
      const templateParaUsar = templateId || templateSelecionado;
      console.log('🔄 Regenerando template com seleção:', templateParaUsar);
      
      const htmlTemplate = await gerarRelatorioElogios(templateParaUsar);
      setCorpoEmail(htmlTemplate);
      
      // Renderizar HTML como imagem via Puppeteer
      setGerandoImagem(true);
      setCorpoEmailImagem(null);
      setCorpoEmailImagemUrl(null);
      try {
        const response = await fetch('/api/email/render-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ html: htmlTemplate, width: 1300 })
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.image) {
            setCorpoEmailImagem(data.image);
            
            // Upload da imagem para Supabase Storage e obter URL pública
            try {
              const byteCharacters = atob(data.image);
              const byteNumbers = new Array(byteCharacters.length);
              for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
              }
              const byteArray = new Uint8Array(byteNumbers);
              const blob = new Blob([byteArray], { type: 'image/png' });
              
              const fileName = `elogios-${Date.now()}.png`;
              const { data: uploadData, error: uploadError } = await supabase.storage
                .from('email-images')
                .upload(fileName, blob, {
                  contentType: 'image/png',
                  upsert: false
                });
              
              if (uploadError) {
                console.warn('⚠️ Erro ao fazer upload da imagem:', uploadError.message);
              } else {
                const { data: urlData } = supabase.storage
                  .from('email-images')
                  .getPublicUrl(fileName);
                
                if (urlData?.publicUrl) {
                  setCorpoEmailImagemUrl(urlData.publicUrl);
                  console.log('✅ Imagem salva no Storage, URL pública:', urlData.publicUrl);
                }
              }
            } catch (uploadErr) {
              console.warn('⚠️ Erro ao salvar imagem no Storage:', uploadErr);
            }
            
            console.log('✅ Imagem do email gerada com sucesso');
          }
        } else {
          console.warn('⚠️ Falha ao gerar imagem, email será enviado como HTML');
        }
      } catch (imgError) {
        console.warn('⚠️ Erro ao gerar imagem do email, será enviado como HTML:', imgError);
      } finally {
        setGerandoImagem(false);
      }
      
      console.log('✅ Template regenerado com sucesso');
    } catch (error) {
      console.error('❌ Erro ao regenerar template:', error);
      setGerandoImagem(false);
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
  const [modalVisualizarAberto, setModalVisualizarAberto] = useState(false);
  const [elogioParaVisualizar, setElogioParaVisualizar] = useState<ElogioCompleto | null>(null);

  const [destinatariosTexto, setDestinatariosTexto] = useState('');
  const [destinatariosCCTexto, setDestinatariosCCTexto] = useState('');
  const [destinatariosBCCTexto, setDestinatariosBCCTexto] = useState('');
  const [abaAtiva, setAbaAtiva] = useState('enviar-colaboradores');
  const [destinatarios, setDestinatarios] = useState<string[]>([]);
  const [destinatariosCC, setDestinatariosCC] = useState<string[]>([]);
  const [destinatariosBCC, setDestinatariosBCC] = useState<string[]>([]);
  const [assuntoEmail, setAssuntoEmail] = useState('');
  const [corpoEmail, setCorpoEmail] = useState('');
  const [corpoEmailImagem, setCorpoEmailImagem] = useState<string | null>(null);
  const [corpoEmailImagemUrl, setCorpoEmailImagemUrl] = useState<string | null>(null);
  const [gerandoImagem, setGerandoImagem] = useState(false);
  const [enviandoEmail, setEnviandoEmail] = useState(false);
  const [preparandoEnvio, setPreparandoEnvio] = useState(false);
  const [anexos, setAnexos] = useState<File[]>([]);

  const [filtrosExpandidos, setFiltrosExpandidos] = useState(false);
  const [elogiosSelecionados, setElogiosSelecionados] = useState<string[]>([]);
  const [elogiosEnviadosSelecionados, setElogiosEnviadosSelecionados] = useState<string[]>([]);
  const [templateSelecionado, setTemplateSelecionado] = useState<string>('');
  const [filtroBusca, setFiltroBusca] = useState('');
  const [filtroResposta, setFiltroResposta] = useState<string>('todas');
  const [filtroMesPeriodo, setFiltroMesPeriodo] = useState<number | null>(mesAtual);
  const [filtroAnoPeriodo, setFiltroAnoPeriodo] = useState<number | null>(anoAtual);

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
      status: abaAtiva === 'enviar-colaboradores' ? ['compartilhado' as const] : ['enviado' as const]
    };
  }, [filtros, abaAtiva]);

  // Hooks
  const { data: elogios = [], isLoading, error, refetch } = useElogios(filtrosComAba);
  const atualizarElogio = useAtualizarElogio({ silent: true }); // Silenciar toasts individuais
  const { elogiosTemplateOptions } = useElogiosTemplates();
  
  // Filtrar elogios com base na busca
  const elogiosFiltrados = useMemo(() => {
    let resultado = [...elogios];
    
    // Filtro de busca
    if (filtroBusca) {
      const buscaLower = filtroBusca.toLowerCase();
      resultado = resultado.filter(elogio => 
        elogio.pesquisa?.empresa?.toLowerCase().includes(buscaLower) ||
        elogio.pesquisa?.cliente?.toLowerCase().includes(buscaLower) ||
        elogio.pesquisa?.prestador?.toLowerCase().includes(buscaLower) ||
        elogio.pesquisa?.nro_caso?.toLowerCase().includes(buscaLower) ||
        elogio.pesquisa?.comentario_pesquisa?.toLowerCase().includes(buscaLower)
      );
    }
    
    // Filtro de resposta
    if (filtroResposta && filtroResposta !== 'todas') {
      resultado = resultado.filter(elogio => 
        elogio.pesquisa?.resposta === filtroResposta
      );
    }
    
    // Filtro de período (data da resposta)
    if (filtroMesPeriodo !== null && filtroAnoPeriodo !== null) {
      resultado = resultado.filter(elogio => {
        if (!elogio.data_resposta) return false;
        
        const dataResposta = new Date(elogio.data_resposta + 'T00:00:00');
        const mesResposta = dataResposta.getMonth() + 1;
        const anoResposta = dataResposta.getFullYear();
        
        return mesResposta === filtroMesPeriodo && anoResposta === filtroAnoPeriodo;
      });
    }
    
    return resultado;
  }, [elogios, filtroBusca, filtroResposta, filtroMesPeriodo, filtroAnoPeriodo]);
  
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
    
    const nomeNormalizado = nomeCompleto.trim().toUpperCase();
    
    // SONDA INTERNO é sempre considerada válida (não precisa estar cadastrada)
    if (nomeNormalizado === 'SONDA INTERNO') {
      return {
        nome: 'SONDA INTERNO',
        encontrada: true
      };
    }
    
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

  // Função para limpar todos os filtros
  const limparFiltros = () => {
    const hoje = new Date();
    const mesVigente = hoje.getMonth() + 1;
    const anoVigente = hoje.getFullYear();
    
    setFiltroBusca('');
    setFiltroResposta('todas');
    setFiltroMesPeriodo(mesVigente);
    setFiltroAnoPeriodo(anoVigente);
    
    // Sincronizar navegação de meses
    setMesSelecionado(mesVigente);
    setAnoSelecionado(anoVigente);
    setFiltros(prev => ({ ...prev, mes: mesVigente, ano: anoVigente }));
  };

  // Função para verificar se há filtros ativos
  const hasActiveFilters = () => {
    const hoje = new Date();
    const mesVigente = hoje.getMonth() + 1;
    const anoVigente = hoje.getFullYear();
    
    const periodoAlterado = filtroMesPeriodo !== mesVigente || filtroAnoPeriodo !== anoVigente;
    
    return filtroBusca !== '' || 
           (filtroResposta && filtroResposta !== 'todas') ||
           periodoAlterado;
  };

  // Funções de navegação de mês
  const navegarMesAnterior = () => {
    if (mesSelecionado === 1) {
      const novoAno = anoSelecionado - 1;
      setMesSelecionado(12);
      setAnoSelecionado(novoAno);
      setFiltros(prev => ({ ...prev, mes: 12, ano: novoAno, status: ['compartilhado'] }));
      // Sincronizar com filtro de período
      setFiltroMesPeriodo(12);
      setFiltroAnoPeriodo(novoAno);
    } else {
      const novoMes = mesSelecionado - 1;
      setMesSelecionado(novoMes);
      setFiltros(prev => ({ ...prev, mes: novoMes, status: ['compartilhado'] }));
      // Sincronizar com filtro de período
      setFiltroMesPeriodo(novoMes);
      setFiltroAnoPeriodo(anoSelecionado);
    }
  };

  const navegarMesProximo = () => {
    if (mesSelecionado === 12) {
      const novoAno = anoSelecionado + 1;
      setMesSelecionado(1);
      setAnoSelecionado(novoAno);
      setFiltros(prev => ({ ...prev, mes: 1, ano: novoAno, status: ['compartilhado'] }));
      // Sincronizar com filtro de período
      setFiltroMesPeriodo(1);
      setFiltroAnoPeriodo(novoAno);
    } else {
      const novoMes = mesSelecionado + 1;
      setMesSelecionado(novoMes);
      setFiltros(prev => ({ ...prev, mes: novoMes, status: ['compartilhado'] }));
      // Sincronizar com filtro de período
      setFiltroMesPeriodo(novoMes);
      setFiltroAnoPeriodo(anoSelecionado);
    }
  };

  // Funções de seleção para aba "Enviar Colaboradores"
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

  // Funções de seleção para aba "Histórico de Enviados"
  const handleSelecionarElogioEnviado = (id: string, selecionado: boolean) => {
    if (selecionado) {
      setElogiosEnviadosSelecionados(prev => [...prev, id]);
    } else {
      setElogiosEnviadosSelecionados(prev => prev.filter(elogioId => elogioId !== id));
    }
  };

  const handleSelecionarTodosEnviados = (selecionado: boolean) => {
    if (selecionado) {
      setElogiosEnviadosSelecionados(elogios.map(e => e.id));
    } else {
      setElogiosEnviadosSelecionados([]);
    }
  };

  // Função para obter todos os elogios selecionados (de ambas as abas)
  const getTodosElogiosSelecionados = () => {
    return [...elogiosSelecionados, ...elogiosEnviadosSelecionados];
  };

  // Função para limpar todas as seleções
  const limparTodasSelecoes = () => {
    setElogiosSelecionados([]);
    setElogiosEnviadosSelecionados([]);
  };

  // Função para buscar todos os elogios selecionados (de ambas as abas)
  const buscarTodosElogiosSelecionados = async (): Promise<ElogioCompleto[]> => {
    const todosIds = getTodosElogiosSelecionados();
    
    // Se não há seleções, retornar array vazio
    if (todosIds.length === 0) return [];
    
    // Buscar elogios de ambos os status
    const [elogiosCompartilhados, elogiosEnviados] = await Promise.all([
      // Buscar elogios compartilhados (se houver selecionados)
      elogiosSelecionados.length > 0 
        ? elogiosService.buscarElogios({ ...filtros, status: ['compartilhado'] })
        : Promise.resolve([]),
      // Buscar elogios enviados (se houver selecionados)
      elogiosEnviadosSelecionados.length > 0
        ? elogiosService.buscarElogios({ ...filtros, status: ['enviado'] })
        : Promise.resolve([])
    ]);
    
    // Filtrar apenas os selecionados
    const elogiosFiltrados = [
      ...elogiosCompartilhados.filter(e => elogiosSelecionados.includes(e.id)),
      ...elogiosEnviados.filter(e => elogiosEnviadosSelecionados.includes(e.id))
    ];
    
    return elogiosFiltrados;
  };

  // Função para gerar HTML do relatório de elogios usando template dinâmico
  const gerarRelatorioElogios = async (templateId?: string): Promise<string> => {
    try {
      const templateParaUsar = templateId || templateSelecionado;
      console.log('🎨 Gerando relatório de elogios com template dinâmico:', templateParaUsar);
      
      // Buscar todos os elogios selecionados (de ambas as abas)
      const elogiosSelecionadosData = await buscarTodosElogiosSelecionados();
      
      console.log(`📊 Processando ${elogiosSelecionadosData.length} elogios selecionados`);
      console.log(`📅 Período: ${nomesMeses[mesSelecionado - 1]} ${anoSelecionado}`);
      console.log(`🔄 Incluindo elogios já enviados: ${elogiosEnviadosSelecionados.length > 0 ? 'Sim' : 'Não'}`);
      
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
    // Para fallback, usar apenas os elogios da aba atual (limitação da função síncrona)
    const elogiosSelecionadosData = elogios.filter(e => 
      abaAtiva === 'enviar-colaboradores' 
        ? elogiosSelecionados.includes(e.id)
        : elogiosEnviadosSelecionados.includes(e.id)
    );
    
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

  // Função para visualizar elogio
  const handleVisualizarElogio = (elogio: ElogioCompleto) => {
    setElogioParaVisualizar(elogio);
    setModalVisualizarAberto(true);
  };

  // Função para abrir modal de email
  const handleAbrirModalEmail = async () => {
    const todosElogiosSelecionados = getTodosElogiosSelecionados();
    if (todosElogiosSelecionados.length === 0) {
      toast({
        title: "Erro",
        description: "Selecione pelo menos um elogio para enviar",
        variant: "destructive"
      });
      return;
    }

    setPreparandoEnvio(true);

    try {
      // Limpar campos e abrir modal
      setAssuntoEmail(`[ELOGIOS] - Colaboradores de Soluções de Negócios (${nomesMeses[mesSelecionado - 1]})`);
      setCorpoEmail(''); // Será gerado quando template for selecionado
      setCorpoEmailImagem(null);
      setCorpoEmailImagemUrl(null);
      setDestinatarios([]);
      setDestinatariosCC([]);
      setDestinatariosBCC([]);
      setDestinatariosTexto('');
      setDestinatariosCCTexto('');
      setDestinatariosBCCTexto('');
      setAnexos([]);
      
      // Auto-selecionar primeiro template disponível se nenhum estiver selecionado
      if (!templateSelecionado && elogiosTemplateOptions.length > 0) {
        const primeiroTemplate = elogiosTemplateOptions[0];
        console.log('🎯 Auto-selecionando template:', primeiroTemplate);
        setTemplateSelecionado(primeiroTemplate.value);
        
        // Gerar template automaticamente
        await regenerarTemplate(primeiroTemplate.value);
      } else if (templateSelecionado) {
        // Gerar template inicial se já houver um selecionado
        await regenerarTemplate();
      }
      
      setModalEmailAberto(true);
    } finally {
      setPreparandoEnvio(false);
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
  const handleColarEmails = (texto: string, tipo: 'destinatarios' | 'cc' | 'bcc') => {
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
      } else if (tipo === 'cc') {
        const emailsAtuais = destinatariosCCTexto.split(';').map(e => e.trim()).filter(e => e.length > 0);
        const todosEmails = [...new Set([...emailsAtuais, ...emailsUnicos])];
        setDestinatariosCCTexto(todosEmails.join('; '));
        setDestinatariosCC(todosEmails);
      } else if (tipo === 'bcc') {
        const emailsAtuais = destinatariosBCCTexto.split(';').map(e => e.trim()).filter(e => e.length > 0);
        const todosEmails = [...new Set([...emailsAtuais, ...emailsUnicos])];
        setDestinatariosBCCTexto(todosEmails.join('; '));
        setDestinatariosBCC(todosEmails);
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

  const handleAtualizarBCCTexto = (texto: string) => {
    setDestinatariosBCCTexto(texto);
    const emails = texto.split(';').map(e => e.trim()).filter(e => e.length > 0);
    setDestinatariosBCC(emails);
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
    const emailsBCCValidos = destinatariosBCC.filter(email => email.trim() !== '');
    const emailsBCCInvalidos = emailsBCCValidos.filter(email => !emailRegex.test(email));

    if (emailsInvalidos.length > 0 || emailsCCInvalidos.length > 0 || emailsBCCInvalidos.length > 0) return false;
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
    const emailsBCCValidos = destinatariosBCC.filter(email => email.trim() !== '');
    const emailsBCCInvalidos = emailsBCCValidos.filter(email => !emailRegex.test(email));

    if (emailsInvalidos.length > 0 || emailsCCInvalidos.length > 0 || emailsBCCInvalidos.length > 0) {
      const todosInvalidos = [...emailsInvalidos, ...emailsCCInvalidos, ...emailsBCCInvalidos];
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
      const emailsBCCValidos = destinatariosBCC.filter(email => email.trim() !== '');

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
      // Se temos URL pública da imagem, usar no email; senão fallback para base64 ou HTML
      let htmlParaEnvio = corpoEmail;
      let attachmentsParaEnvio = anexosBase64.length > 0 ? [...anexosBase64] : [];

      if (corpoEmailImagemUrl) {
        // Usar URL pública do Supabase Storage (solução ideal - payload leve)
        // Usa tabela com largura fixa + MSO conditional para forçar 1300px no Outlook desktop
        htmlParaEnvio = `<!DOCTYPE html>
<html xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<!--[if gte mso 9]>
<xml>
<o:OfficeDocumentSettings>
<o:AllowPNG/>
<o:PixelsPerInch>96</o:PixelsPerInch>
</o:OfficeDocumentSettings>
</xml>
<style>
table { border-collapse: collapse; }
img { -ms-interpolation-mode: bicubic; }
</style>
<![endif]-->
</head>
<body style="margin:0;padding:0;width:100%;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
<div style="font-size:2px;line-height:2px;color:#ffffff;max-height:0;overflow:hidden;mso-hide:all;">ELOGIO AOS COLABORADORES DE SOLUÇÕES DE NEGÓCIO</div>
<!--[if gte mso 9]><table cellpadding="0" cellspacing="0" border="0" width="1300"><tr><td><![endif]-->
<table cellpadding="0" cellspacing="0" border="0" width="1300" style="width:1300px;min-width:1300px;max-width:1300px;">
<tr>
<td style="padding:0;margin:0;line-height:0;font-size:0;">
<img src="${corpoEmailImagemUrl}" alt="Elogios aos Colaboradores" width="1300" style="display:block;width:1300px;min-width:1300px;max-width:1300px;height:auto;border:0;outline:none;text-decoration:none;" />
</td>
</tr>
</table>
<!--[if gte mso 9]></td></tr></table><![endif]-->
</body>
</html>`;
        console.log(`📸 Enviando email com imagem via URL pública: ${corpoEmailImagemUrl}`);
      } else if (corpoEmailImagem) {
        // Fallback: base64 inline (pode falhar com muitos elogios)
        const MAX_BASE64_SIZE = 25 * 1024 * 1024; // 25MB
        if (corpoEmailImagem.length <= MAX_BASE64_SIZE) {
          htmlParaEnvio = `<!DOCTYPE html>
<html xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
<meta charset="UTF-8">
<!--[if gte mso 9]>
<xml>
<o:OfficeDocumentSettings>
<o:AllowPNG/>
<o:PixelsPerInch>96</o:PixelsPerInch>
</o:OfficeDocumentSettings>
</xml>
<style>
table { border-collapse: collapse; }
img { -ms-interpolation-mode: bicubic; }
</style>
<![endif]-->
</head>
<body style="margin:0;padding:0;width:100%;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
<!--[if gte mso 9]><table cellpadding="0" cellspacing="0" border="0" width="1300"><tr><td><![endif]-->
<table cellpadding="0" cellspacing="0" border="0" width="1300" style="width:1300px;min-width:1300px;max-width:1300px;">
<tr>
<td style="padding:0;margin:0;line-height:0;font-size:0;">
<img src="data:image/png;base64,${corpoEmailImagem}" alt="Elogios aos Colaboradores" width="1300" style="display:block;width:1300px;min-width:1300px;max-width:1300px;height:auto;border:0;outline:none;text-decoration:none;" />
</td>
</tr>
</table>
<!--[if gte mso 9]></td></tr></table><![endif]-->
</body>
</html>`;
          console.log(`📸 Fallback: enviando email com imagem base64 inline (${(corpoEmailImagem.length / 1024).toFixed(0)}KB)`);
        } else {
          console.warn(`⚠️ Imagem muito grande (${(corpoEmailImagem.length / 1024 / 1024).toFixed(1)}MB), enviando como HTML`);
        }
      } else {
        console.log('📧 Enviando email como HTML (sem imagem renderizada)');
      }

      const resultado = await emailService.sendEmail({
        to: emailsValidos,
        cc: emailsCCValidos.length > 0 ? emailsCCValidos : undefined,
        bcc: emailsBCCValidos.length > 0 ? emailsBCCValidos : undefined,
        subject: assuntoEmail,
        html: htmlParaEnvio,
        attachments: attachmentsParaEnvio.length > 0 ? attachmentsParaEnvio : undefined
      });

      if (resultado.success) {
        // Atualizar status dos elogios selecionados para "enviado"
        // Apenas elogios que estavam com status "compartilhado" precisam ser atualizados
        // Elogios já "enviados" mantêm o mesmo status (reenvio)
        try {
          if (elogiosSelecionados.length > 0) {
            await Promise.all(
              elogiosSelecionados.map(async (elogioId) => {
                await atualizarElogio.mutateAsync({ 
                  id: elogioId, 
                  dados: { status: 'enviado' } 
                });
              })
            );
          }
        } catch (error) {
          console.error('Erro ao atualizar status dos elogios:', error);
        }

        const totalElogios = getTodosElogiosSelecionados().length;
        const elogiosReenviados = elogiosEnviadosSelecionados.length;
        
        let mensagemSucesso = `Email enviado com sucesso para ${emailsValidos.length} destinatário(s)!`;
        if (elogiosReenviados > 0) {
          mensagemSucesso += ` (${elogiosReenviados} elogio(s) reenviado(s))`;
        }

        toast({
          title: "Sucesso",
          description: mensagemSucesso
        });
        
        setModalEmailAberto(false);
        setConfirmacaoAberta(false);
        limparTodasSelecoes(); // Limpar seleções de ambas as abas
        setDestinatarios([]);
        setDestinatariosCC([]);
        setDestinatariosBCC([]);
        setDestinatariosTexto('');
        setDestinatariosCCTexto('');
        setDestinatariosBCCTexto('');
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
            <ElogiosExportButtons 
              elogios={elogios}
              periodo={`${nomesMeses[mesSelecionado - 1]} ${anoSelecionado}`}
              deParaCategorias={deParaCategorias}
              disabled={isLoading}
            />
            <ProtectedAction screenKey="lancar_elogios" requiredLevel="edit">
              <Button
                onClick={handleAbrirModalEmail}
                disabled={isLoading || preparandoEnvio || getTodosElogiosSelecionados().length === 0}
                size="sm"
                title={getTodosElogiosSelecionados().length === 0 ? 'Selecione elogios para enviar' : `Enviar ${getTodosElogiosSelecionados().length} elogio(s) selecionado(s)`}
              >
                {preparandoEnvio ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Send className="h-4 w-4 mr-2" />
                )}
                {preparandoEnvio ? 'Preparando...' : `Disparar Elogios (${getTodosElogiosSelecionados().length})`}
              </Button>
            </ProtectedAction>
          </div>
        </div>

        {/* Cards de Estatísticas */}
        {estatisticas && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <FileText className="h-4 w-4 text-green-500" />
                  <p className="text-xs font-medium text-green-500">Total de Elogios</p>
                </div>
                <p className="text-3xl font-bold text-green-600">{estatisticas.total}</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="h-4 w-4 text-gray-500" />
                  <p className="text-xs font-medium text-gray-500">Registrados</p>
                </div>
                <p className="text-3xl font-bold text-gray-600">{estatisticas.registrados}</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="h-4 w-4 text-blue-500" />
                  <p className="text-xs font-medium text-blue-500">Compartilhados</p>
                </div>
                <p className="text-3xl font-bold text-blue-600">{estatisticas.compartilhados}</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-1">
                  <Calendar className="h-4 w-4 text-orange-500" />
                  <p className="text-xs font-medium text-orange-500">Arquivados</p>
                </div>
                <p className="text-3xl font-bold text-orange-600">{estatisticas.arquivados}</p>
              </CardContent>
            </Card>
          </div>
        )}

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

            {/* Informação de selecionados - mostra total de ambas as abas */}
            {getTodosElogiosSelecionados().length > 0 && (
              <div className="flex flex-wrap gap-4 items-center">
                <Badge variant="outline" className="text-xs sm:text-sm">
                  {getTodosElogiosSelecionados().length} selecionado{getTodosElogiosSelecionados().length !== 1 ? 's' : ''}
                </Badge>
              </div>
            )}
          </div>

          <TabsContent value="enviar-colaboradores" className="space-y-4">
            {/* Card de Filtros - sempre visível */}
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Elogios Disponíveis ({elogiosFiltrados.length})
                  </CardTitle>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setFiltrosExpandidos(!filtrosExpandidos)}
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

                {/* Área de filtros expansível - PADRÃO DESIGN SYSTEM */}
                {filtrosExpandidos && (
                  <div className="space-y-4 pt-4 border-t">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Campo de busca com ícone */}
                      <div>
                        <div className="text-sm font-medium mb-2">Buscar</div>
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <Input
                            placeholder="Buscar por empresa, cliente..."
                            value={filtroBusca}
                            onChange={(e) => setFiltroBusca(e.target.value)}
                            className="pl-10 focus:ring-sonda-blue focus:border-sonda-blue"
                          />
                        </div>
                      </div>

                      {/* Filtro Resposta */}
                      <div>
                        <div className="text-sm font-medium mb-2">Resposta</div>
                        <Select
                          value={filtroResposta}
                          onValueChange={(value) => setFiltroResposta(value)}
                        >
                          <SelectTrigger className="focus:ring-sonda-blue focus:border-sonda-blue">
                            <SelectValue placeholder="Todas as Respostas" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="todas">Todas as Respostas</SelectItem>
                            <SelectItem value="Muito Insatisfeito">Muito Insatisfeito</SelectItem>
                            <SelectItem value="Insatisfeito">Insatisfeito</SelectItem>
                            <SelectItem value="Neutro">Neutro</SelectItem>
                            <SelectItem value="Satisfeito">Satisfeito</SelectItem>
                            <SelectItem value="Muito Satisfeito">Muito Satisfeito</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Filtro Período (Data da Resposta) */}
                      <div>
                        <div className="text-sm font-medium mb-2">Data da Resposta</div>
                        <MonthYearPicker
                          value={
                            filtroMesPeriodo !== null && filtroAnoPeriodo !== null
                              ? `${filtroMesPeriodo.toString().padStart(2, '0')}/${filtroAnoPeriodo}`
                              : ''
                          }
                          onChange={(value) => {
                            if (value) {
                              const [mes, ano] = value.split('/');
                              const novoMes = parseInt(mes);
                              const novoAno = parseInt(ano);
                              
                              setFiltroMesPeriodo(novoMes);
                              setFiltroAnoPeriodo(novoAno);
                              
                              // Sincronizar com navegação de meses
                              setMesSelecionado(novoMes);
                              setAnoSelecionado(novoAno);
                              setFiltros(prev => ({ ...prev, mes: novoMes, ano: novoAno }));
                            } else {
                              setFiltroMesPeriodo(null);
                              setFiltroAnoPeriodo(null);
                            }
                          }}
                          placeholder="Todos os períodos"
                          className="focus:ring-sonda-blue focus:border-sonda-blue"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </CardHeader>

              <CardContent>
                {/* Estados de loading, erro e vazio */}
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <RefreshCw className="h-6 w-6 animate-spin mr-2" />
                    <span>Carregando elogios...</span>
                  </div>
                ) : error ? (
                  <div className="text-center text-red-600 py-12">
                    <p>Erro ao carregar elogios</p>
                    <Button onClick={() => refetch()} className="mt-4">
                      Tentar novamente
                    </Button>
                  </div>
                ) : elogiosFiltrados.length === 0 ? (
                  <div className="text-center text-gray-500 py-12">
                    <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <h3 className="text-lg font-medium mb-2">
                      Nenhum elogio encontrado
                    </h3>
                    <p>
                      Não há elogios no período de{' '}
                      <strong>{nomesMeses[mesSelecionado - 1]} {anoSelecionado}</strong>.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">
                        <Checkbox
                          checked={elogiosFiltrados.length > 0 && elogiosFiltrados.every(e => elogiosSelecionados.includes(e.id))}
                          onCheckedChange={handleSelecionarTodos}
                          aria-label="Selecionar todos"
                        />
                      </TableHead>
                      <TableHead className="w-[120px] text-center">Chamado</TableHead>
                      <TableHead className="w-[180px] text-center">Empresa</TableHead>
                      <TableHead className="w-[120px] text-center">Data Resposta</TableHead>
                      <TableHead className="w-[150px] text-center">Cliente</TableHead>
                      <TableHead className="w-[150px] text-center">Consultor</TableHead>
                      <TableHead className="w-[200px] text-center">Comentário</TableHead>
                      <TableHead className="w-[140px] text-center">Resposta</TableHead>
                      <TableHead className="w-[100px] text-center">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {elogiosFiltrados.map((elogio) => {
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
                                  <ClienteNomeDisplay
                                    nomeEmpresa={elogio.pesquisa?.empresa}
                                    nomeCliente={elogio.pesquisa?.cliente}
                                    className={`inline ${deveExibirVermelho ? 'text-red-600' : ''}`}
                                  />
                                </span>
                              );
                            })()}
                          </TableCell>
                          <TableCell className="text-center text-xs sm:text-sm text-muted-foreground">
                            {elogio.data_resposta ? formatarData(elogio.data_resposta) : '-'}
                          </TableCell>
                          <TableCell className="text-center text-xs sm:text-sm max-w-[150px]">
                            <span className="truncate block">
                              {elogio.pesquisa?.cliente || 'N/A'}
                            </span>
                          </TableCell>
                          <TableCell className="text-center text-xs sm:text-sm max-w-[150px]">
                            <span className="truncate block">
                              {elogio.pesquisa?.prestador || '-'}
                            </span>
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
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleVisualizarElogio(elogio)}
                              className="h-8 w-8 p-0"
                              title="Visualizar detalhes do elogio"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
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

          <TabsContent value="historico-enviados" className="space-y-4">
            {/* Tabela para Histórico de Enviados */}
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Histórico de Enviados ({elogiosFiltrados.length})
                  </CardTitle>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setFiltrosExpandidos(!filtrosExpandidos)}
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

                {/* Área de filtros expansível - PADRÃO DESIGN SYSTEM */}
                {filtrosExpandidos && (
                  <div className="space-y-4 pt-4 border-t">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Campo de busca com ícone */}
                      <div>
                        <div className="text-sm font-medium mb-2">Buscar</div>
                        <div className="relative">
                          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                          <Input
                            placeholder="Buscar por empresa, cliente..."
                            value={filtroBusca}
                            onChange={(e) => setFiltroBusca(e.target.value)}
                            className="pl-10 focus:ring-sonda-blue focus:border-sonda-blue"
                          />
                        </div>
                      </div>

                      {/* Filtro Resposta */}
                      <div>
                        <div className="text-sm font-medium mb-2">Resposta</div>
                        <Select
                          value={filtroResposta}
                          onValueChange={(value) => setFiltroResposta(value)}
                        >
                          <SelectTrigger className="focus:ring-sonda-blue focus:border-sonda-blue">
                            <SelectValue placeholder="Todas as Respostas" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="todas">Todas as Respostas</SelectItem>
                            <SelectItem value="Muito Insatisfeito">Muito Insatisfeito</SelectItem>
                            <SelectItem value="Insatisfeito">Insatisfeito</SelectItem>
                            <SelectItem value="Neutro">Neutro</SelectItem>
                            <SelectItem value="Satisfeito">Satisfeito</SelectItem>
                            <SelectItem value="Muito Satisfeito">Muito Satisfeito</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Filtro Período (Data da Resposta) */}
                      <div>
                        <div className="text-sm font-medium mb-2">Data da Resposta</div>
                        <MonthYearPicker
                          value={
                            filtroMesPeriodo !== null && filtroAnoPeriodo !== null
                              ? `${filtroMesPeriodo.toString().padStart(2, '0')}/${filtroAnoPeriodo}`
                              : ''
                          }
                          onChange={(value) => {
                            if (value) {
                              const [mes, ano] = value.split('/');
                              const novoMes = parseInt(mes);
                              const novoAno = parseInt(ano);
                              
                              setFiltroMesPeriodo(novoMes);
                              setFiltroAnoPeriodo(novoAno);
                              
                              // Sincronizar com navegação de meses
                              setMesSelecionado(novoMes);
                              setAnoSelecionado(novoAno);
                              setFiltros(prev => ({ ...prev, mes: novoMes, ano: novoAno }));
                            } else {
                              setFiltroMesPeriodo(null);
                              setFiltroAnoPeriodo(null);
                            }
                          }}
                          placeholder="Todos os períodos"
                          className="focus:ring-sonda-blue focus:border-sonda-blue"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <RefreshCw className="h-6 w-6 animate-spin mr-2" />
                    <span>Carregando elogios...</span>
                  </div>
                ) : elogiosFiltrados.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    Nenhum elogio enviado por email encontrado
                  </div>
                ) : (
                  <div className="rounded-md overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-10">
                            <Checkbox
                              checked={elogiosFiltrados.length > 0 && elogiosFiltrados.every(e => elogiosEnviadosSelecionados.includes(e.id))}
                              onCheckedChange={handleSelecionarTodosEnviados}
                              aria-label="Selecionar todos"
                            />
                          </TableHead>
                          <TableHead className="w-[120px] text-center">Chamado</TableHead>
                          <TableHead className="w-[180px] text-center">Empresa</TableHead>
                          <TableHead className="w-[120px] text-center">Data Resposta</TableHead>
                          <TableHead className="w-[150px] text-center">Cliente</TableHead>
                          <TableHead className="w-[150px] text-center">Consultor</TableHead>
                          <TableHead className="w-[200px] text-center">Comentário</TableHead>
                          <TableHead className="w-[140px] text-center">Resposta</TableHead>
                          <TableHead className="text-center w-[120px]">Status</TableHead>
                          <TableHead className="w-[100px] text-center">Ações</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {elogiosFiltrados.map((elogio) => {
                          const { nome: nomeEmpresa, encontrada: empresaEncontrada } = obterDadosEmpresa(elogio.pesquisa?.empresa);
                          
                          return (
                            <TableRow key={elogio.id}>
                              <TableCell>
                                <Checkbox
                                  checked={elogiosEnviadosSelecionados.includes(elogio.id)}
                                  onCheckedChange={(checked) => handleSelecionarElogioEnviado(elogio.id, checked as boolean)}
                                  aria-label={`Selecionar ${elogio.pesquisa?.cliente} para reenvio`}
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
                                  const deveExibirVermelho = isOrigemSqlServer && !empresaEncontrada;
                                  return (
                                    <span className={`font-semibold ${deveExibirVermelho ? 'text-red-600' : ''}`}>
                                      <ClienteNomeDisplay
                                        nomeEmpresa={elogio.pesquisa?.empresa}
                                        nomeCliente={elogio.pesquisa?.cliente}
                                        className={`inline ${deveExibirVermelho ? 'text-red-600' : ''}`}
                                      />
                                    </span>
                                  );
                                })()}
                              </TableCell>
                              <TableCell className="text-center text-xs sm:text-sm text-muted-foreground">
                                {elogio.data_resposta ? formatarData(elogio.data_resposta) : '-'}
                              </TableCell>
                              <TableCell className="text-center text-xs sm:text-sm max-w-[150px]">
                                <span className="truncate block">
                                  {elogio.pesquisa?.cliente}
                                </span>
                              </TableCell>
                              <TableCell className="text-center text-xs sm:text-sm max-w-[150px]">
                                <span className="truncate block">
                                  {elogio.pesquisa?.prestador || '-'}
                                </span>
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
                              <TableCell className="text-center">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleVisualizarElogio(elogio)}
                                  className="h-8 w-8 p-0"
                                  title="Visualizar detalhes do elogio"
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
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
        <Dialog 
          key={modalEmailAberto ? 'modal-open' : 'modal-closed'} 
          open={modalEmailAberto} 
          onOpenChange={setModalEmailAberto}
        >
          <DialogContent className="max-w-7xl max-h-[95vh] overflow-hidden flex flex-col">
            <DialogHeader className="flex-shrink-0">
              <DialogTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Disparar Elogios por Email
              </DialogTitle>
            </DialogHeader>

            <div className="flex flex-col flex-1 min-h-0 gap-4">
              {/* Campos do formulário - com scroll próprio */}
              <div className="flex-shrink-0 max-h-[35vh] overflow-y-auto space-y-4 pr-2">
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
                <Label className="text-base font-medium">Destinatários em Cópia Oculta (Cco) - Opcional</Label>
                
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
              </div>

              {/* Preview do Relatório - ocupa espaço restante com scroll */}
              <div className="flex-1 min-h-0 flex flex-col">
                <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2 flex-shrink-0 flex items-center gap-2">
                  Preview do Relatório
                  {gerandoImagem && (
                    <span className="text-xs text-blue-600 flex items-center gap-1">
                      <RefreshCw className="h-3 w-3 animate-spin" />
                      Gerando imagem...
                    </span>
                  )}
                  {corpoEmailImagem && !gerandoImagem && (
                    <>
                      <Badge variant="secondary" className="text-xs bg-green-100 text-green-700">
                        Imagem pronta
                      </Badge>
                    </>
                  )}
                  {!corpoEmailImagem && !gerandoImagem && corpoEmail && (
                    <Badge variant="secondary" className="text-xs bg-yellow-100 text-yellow-700">
                      Modo HTML
                    </Badge>
                  )}
                </h4>
                <div className="border rounded-lg overflow-hidden bg-white dark:bg-gray-900 flex flex-col flex-1 min-h-0">
                  <div className="bg-gray-100 dark:bg-gray-800 p-3 border-b flex-shrink-0">
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      <strong>Período:</strong> {nomesMeses[mesSelecionado - 1]} {anoSelecionado} |
                      <strong> Elogios:</strong> {getTodosElogiosSelecionados().length}
                    </div>
                  </div>
                  <div
                    className="flex-1 overflow-auto p-4 email-preview-container"
                    style={{ 
                      isolation: 'isolate',
                      contain: 'style layout',
                      position: 'relative'
                    }}
                  >
                    {corpoEmailImagem ? (
                      <img 
                        src={corpoEmailImagemUrl || `data:image/png;base64,${corpoEmailImagem}`} 
                        alt="Preview do email de elogios"
                        style={{ width: '100%', maxWidth: '1300px', display: 'block' }}
                      />
                    ) : (
                      <div dangerouslySetInnerHTML={{ __html: corpoEmail }} />
                    )}
                  </div>
                </div>
              </div>
            </div>

            <DialogFooter className="flex-shrink-0 flex items-center gap-2">
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
                <strong>Total de elogios:</strong> {getTodosElogiosSelecionados().length}
                {elogiosSelecionados.length > 0 && (
                  <>
                    <br />
                    <strong>Novos elogios:</strong> {elogiosSelecionados.length}
                  </>
                )}
                {elogiosEnviadosSelecionados.length > 0 && (
                  <>
                    <br />
                    <strong className="text-orange-600">Reenvios:</strong> {elogiosEnviadosSelecionados.length}
                  </>
                )}
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

        {/* Modal de Visualização do Elogio */}
        <Dialog open={modalVisualizarAberto} onOpenChange={setModalVisualizarAberto}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Detalhes do Elogio
              </DialogTitle>
            </DialogHeader>

            {elogioParaVisualizar && (
              <div className="space-y-6">
                {/* Informações Básicas */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium text-gray-600">Informações do Chamado</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div>
                        <Label className="text-xs text-gray-500">Número do Caso</Label>
                        <p className="font-mono text-sm">{elogioParaVisualizar.pesquisa?.nro_caso || '-'}</p>
                      </div>
                      <div>
                        <Label className="text-xs text-gray-500">Tipo do Caso</Label>
                        <p className="text-sm">{elogioParaVisualizar.pesquisa?.tipo_caso || '-'}</p>
                      </div>
                      <div>
                        <Label className="text-xs text-gray-500">Data da Resposta</Label>
                        <p className="text-sm">
                          {elogioParaVisualizar.data_resposta ? formatarData(elogioParaVisualizar.data_resposta) : '-'}
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium text-gray-600">Informações do Cliente</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div>
                        <Label className="text-xs text-gray-500">Cliente</Label>
                        <p className="text-sm font-medium">
                          {elogioParaVisualizar.pesquisa?.cliente || '-'}
                        </p>
                      </div>
                      <div>
                        <Label className="text-xs text-gray-500">Empresa</Label>
                        <p className="text-sm">
                          <ClienteNomeDisplay
                            nomeEmpresa={elogioParaVisualizar.pesquisa?.empresa || '-'}
                            nomeCliente={elogioParaVisualizar.pesquisa?.cliente || '-'}
                            className="inline"
                          />
                        </p>
                      </div>
                      <div>
                        <Label className="text-xs text-gray-500">Grupo</Label>
                        <p className="text-sm font-medium">
                          {(() => {
                            const categoria = elogioParaVisualizar.pesquisa?.categoria || '';
                            // Para o modal de visualização, vamos mostrar o grupo original
                            // pois é mais informativo para o usuário ver o grupo completo
                            return elogioParaVisualizar.pesquisa?.grupo || '-';
                          })()}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Informações do Colaborador */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-gray-600">Colaborador Elogiado</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div>
                      <Label className="text-xs text-gray-500">Nome do Prestador</Label>
                      <p className="text-sm font-medium">{elogioParaVisualizar.pesquisa?.prestador || '-'}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-gray-500">Categoria</Label>
                      <p className="text-sm">{elogioParaVisualizar.pesquisa?.categoria || '-'}</p>
                    </div>
                  </CardContent>
                </Card>

                {/* Avaliação */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-gray-600">Avaliação</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <Label className="text-xs text-gray-500">Resposta</Label>
                      <div className="mt-1">
                        {getBadgeResposta(elogioParaVisualizar.pesquisa?.resposta) || (
                          <Badge variant="outline" className="text-xs">-</Badge>
                        )}
                      </div>
                    </div>
                    {elogioParaVisualizar.pesquisa?.comentario_pesquisa && (
                      <div>
                        <Label className="text-xs text-gray-500">Comentário</Label>
                        <div className="mt-1 p-3 bg-gray-50 dark:bg-gray-800 rounded-md border">
                          <p className="text-sm leading-relaxed whitespace-pre-wrap">
                            {elogioParaVisualizar.pesquisa.comentario_pesquisa}
                          </p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Status e Informações Técnicas */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-gray-600">Status e Informações</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <Label className="text-xs text-gray-500">Status</Label>
                        <div className="mt-1">
                          <Badge 
                            variant={elogioParaVisualizar.status === 'enviado' ? 'default' : 'secondary'}
                            className="text-xs"
                          >
                            {elogioParaVisualizar.status === 'enviado' ? 'Enviado por Email' : 
                             elogioParaVisualizar.status === 'compartilhado' ? 'Compartilhado' : 
                             'Registrado'}
                          </Badge>
                        </div>
                      </div>
                      <div>
                        <Label className="text-xs text-gray-500">Data de Criação</Label>
                        <p className="text-sm">
                          {elogioParaVisualizar.criado_em ? formatarData(elogioParaVisualizar.criado_em) : '-'}
                        </p>
                      </div>
                      <div>
                        <Label className="text-xs text-gray-500">Origem</Label>
                        <p className="text-sm capitalize">
                          {elogioParaVisualizar.pesquisa?.origem?.replace('_', ' ') || '-'}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setModalVisualizarAberto(false)}
              >
                Fechar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
