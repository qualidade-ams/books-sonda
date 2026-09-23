import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import AdminLayout from '@/components/admin/LayoutAdmin';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  AlertTriangle, Calendar, Clock, Filter, X, Search, Download, Eye, Send,
  ChevronLeft, ChevronRight, History, Mail, Paperclip, ClipboardList, Settings, CheckCircle, Archive
} from 'lucide-react';
import {
  useInconsistenciasChamados, useInconsistenciasEstatisticas,
  useInconsistenciasResolvidas, useEnviosEmailInconsistencias, useEnviarNotificacao,
  useArquivarInconsistencia
} from '@/hooks/useInconsistenciasChamados';
import { EmailEnviadoIndicador } from '@/components/admin/inconsistencias/EmailEnviadoIndicador';
import { listarAnalistasDaAba } from '@/utils/listarAnalistasDaAba';
import { passaFiltroEnvioEmail, type FiltroEnvioEmail } from '@/utils/filtroEnvioEmail';
import { colunasEmailPorTipo, valorColunaEmail } from '@/utils/colunasEmailInconsistencia';
import type { InconsistenciasChamadosFiltros, InconsistenciaChamado, TipoInconsistencia } from '@/types/inconsistenciasChamados';
import {
  TIPO_INCONSISTENCIA_LABELS, TIPO_INCONSISTENCIA_COLORS, TIPO_INCONSISTENCIA_ORDEM,
  TIPO_INCONSISTENCIA_COR_EMAIL_HEX, ACAO_CORRECAO_TEXTO,
} from '@/types/inconsistenciasChamados';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { isClienteEspecialBRFONSDAGUIRRE } from '@/utils/clienteEspecialUtils';
import { ClienteNomeDisplay } from '@/components/admin/requerimentos/ClienteNomeDisplay';
import { emailService } from '@/services/emailService';

const DEFAULT_ITEMS_PER_PAGE = 25;

// Empresa cadastrada (subconjunto de campos usados na resolução de nome/gestor)
export interface EmpresaCadastradaResumo {
  nome_abreviado: string | null;
  nome_completo: string | null;
  email_gestor: string | null;
}

// Especialista cadastrado (subconjunto de campos usados na resolução de email do analista)
export interface EspecialistaResumo {
  nome: string | null;
  email: string | null;
}

// Normaliza um nome de pessoa pra comparação tolerante a acentuação, caixa e espaços
// duplicados/nas pontas — dados sincronizados do Aranda frequentemente têm esses artefatos,
// o que quebra uma comparação de substring exata (ex: "Nome  Sobrenome" com espaço duplo).
const normalizarNomePessoa = (nome: string): string =>
  nome
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();

// Envelope de email: um por analista, com destinatário/CC/BCC/assunto/anexos independentes.
// Pode conter múltiplos tipos de inconsistência do mesmo analista.
export interface InconsistenciaEmailEnvelope {
  analista: string;
  itens: InconsistenciaChamado[];
  destinatario: string;
  cc: string;
  bcc: string;
  assunto: string;
  anexos: File[];
}

/**
 * Agrupa uma lista de inconsistências pelo nome do analista.
 * Itens sem analista definido são agrupados sob a chave "Sem analista".
 */
// eslint-disable-next-line react-refresh/only-export-components -- exportado para teste isolado (TDD)
export function agruparInconsistenciasPorAnalista(itens: InconsistenciaChamado[]): Map<string, InconsistenciaChamado[]> {
  const grupos = new Map<string, InconsistenciaChamado[]>();
  itens.forEach(item => {
    const chave = item.analista || 'Sem analista';
    const lista = grupos.get(chave);
    if (lista) {
      lista.push(item);
    } else {
      grupos.set(chave, [item]);
    }
  });
  return grupos;
}

/**
 * Agrupa itens por tipo de inconsistência, retornando as chaves sempre na ordem fixa
 * TIPO_INCONSISTENCIA_ORDEM (mes_diferente → tempo_excessivo → ic_999999 → sem_atualizacao),
 * omitindo tipos sem nenhum item.
 */
// eslint-disable-next-line react-refresh/only-export-components -- exportado para teste isolado (TDD)
export function agruparPorTipoOrdenado(itens: InconsistenciaChamado[]): Map<TipoInconsistencia, InconsistenciaChamado[]> {
  const grupos = new Map<TipoInconsistencia, InconsistenciaChamado[]>();
  TIPO_INCONSISTENCIA_ORDEM.forEach(tipo => {
    const doTipo = itens.filter(item => item.tipo_inconsistencia === tipo);
    if (doTipo.length > 0) {
      grupos.set(tipo, doTipo);
    }
  });
  return grupos;
}

/**
 * Resolve a empresa cadastrada correspondente a um nome de empresa vindo do chamado,
 * por match exato (nome completo ou abreviado) ou parcial (startsWith bidirecional).
 */
// eslint-disable-next-line react-refresh/only-export-components -- exportado para teste isolado (TDD)
export function encontrarEmpresaCadastrada(
  nomeEmpresa: string | null,
  empresasCadastradas: EmpresaCadastradaResumo[]
): EmpresaCadastradaResumo | null {
  if (!nomeEmpresa) return null;

  const nomeNormalizado = nomeEmpresa.toUpperCase().trim();

  const empresaExata = empresasCadastradas.find(
    e => e.nome_completo?.toUpperCase().trim() === nomeNormalizado ||
         e.nome_abreviado?.toUpperCase().trim() === nomeNormalizado
  );
  if (empresaExata) return empresaExata;

  const empresaParcial = empresasCadastradas.find(e => {
    const abrev = e.nome_abreviado?.toUpperCase().trim() || '';
    const completo = e.nome_completo?.toUpperCase().trim() || '';
    return completo.startsWith(nomeNormalizado) ||
           nomeNormalizado.startsWith(completo) ||
           abrev.startsWith(nomeNormalizado) ||
           nomeNormalizado.startsWith(abrev);
  });

  return empresaParcial || null;
}

/**
 * Resolve o email de um especialista a partir do nome do analista vindo do chamado.
 * Compara por nome normalizado (sem acento, sem espaços duplicados, case-insensitive) —
 * uma comparação de substring exata contra `especialistas.nome` falha quando os dados
 * sincronizados têm espaçamento diferente do valor do chamado, mesmo com o nome idêntico
 * visualmente. Tenta match exato primeiro; se não achar, tenta parcial bidirecional
 * (tolera um dos nomes ser um trecho contíguo do outro, ex: nome truncado sem sobrenome).
 */
// eslint-disable-next-line react-refresh/only-export-components -- exportado para teste isolado (TDD)
export function encontrarEmailEspecialista(
  nomeAnalista: string | null,
  especialistas: EspecialistaResumo[]
): string | null {
  if (!nomeAnalista) return null;
  const alvo = normalizarNomePessoa(nomeAnalista);
  if (!alvo) return null;

  const exato = especialistas.find(e => e.nome && normalizarNomePessoa(e.nome) === alvo);
  if (exato) return exato.email || null;

  const parcial = especialistas.find(e => {
    if (!e.nome) return false;
    const nomeNormalizado = normalizarNomePessoa(e.nome);
    return nomeNormalizado.includes(alvo) || alvo.includes(nomeNormalizado);
  });

  return parcial?.email || null;
}

/**
 * Agrupa uma lista de {empresa, emailGestor} (do IC 999999) por gestor: empresas com o mesmo
 * email caem no mesmo grupo; empresas sem email cadastrado geram um grupo próprio cada.
 * Faz dedupe por nome de empresa preservando a ordem de primeira aparição.
 */
// eslint-disable-next-line react-refresh/only-export-components -- exportado para teste isolado (TDD)
export function agruparGestoresIC999999(
  infos: Array<{ empresa: string; emailGestor: string | null }>
): Array<{ emailGestor: string | null; empresas: string[] }> {
  const empresasVistas = new Set<string>();
  const deduplicadas: Array<{ empresa: string; emailGestor: string | null }> = [];
  infos.forEach(info => {
    if (!empresasVistas.has(info.empresa)) {
      empresasVistas.add(info.empresa);
      deduplicadas.push(info);
    }
  });

  const gruposComEmail = new Map<string, { emailGestor: string; empresas: string[] }>();
  const gruposSemEmail: Array<{ emailGestor: null; empresas: string[] }> = [];

  deduplicadas.forEach(info => {
    const emailNormalizado = info.emailGestor?.trim();
    if (emailNormalizado) {
      const chave = emailNormalizado.toLowerCase();
      const existente = gruposComEmail.get(chave);
      if (existente) {
        existente.empresas.push(info.empresa);
      } else {
        gruposComEmail.set(chave, { emailGestor: emailNormalizado, empresas: [info.empresa] });
      }
    } else {
      gruposSemEmail.push({ emailGestor: null, empresas: [info.empresa] });
    }
  });

  return [...Array.from(gruposComEmail.values()), ...gruposSemEmail];
}

/**
 * Monta o trecho "{DETALHE}" da frase fixa do IC 999999 a partir dos grupos de gestor
 * já agrupados por agruparGestoresIC999999.
 */
// eslint-disable-next-line react-refresh/only-export-components -- exportado para teste isolado (TDD)
export function montarTextoGestorIC999999(
  grupos: Array<{ emailGestor: string | null; empresas: string[] }>
): string {
  if (grupos.length === 0) return 'o gestor responsável pela empresa';

  if (grupos.length === 1) {
    const grupo = grupos[0];
    if (grupo.emailGestor) return grupo.emailGestor;
    return `e-mail do gestor não cadastrado para ${grupo.empresas[0]}`;
  }

  const segmentos = grupos.map(grupo => {
    if (grupo.emailGestor) {
      if (grupo.empresas.length > 1) {
        return `${grupo.emailGestor} (${grupo.empresas.join(', ')})`;
      }
      return `${grupo.emailGestor} para ${grupo.empresas[0]}`;
    }
    return `e-mail do gestor não cadastrado para ${grupo.empresas[0]}`;
  });

  return segmentos.join('; ');
}

export default function InconsistenciaChamados() {
  const { toast } = useToast();
  const { t } = useTranslation();

  const [activeTab, setActiveTab] = useState('inconsistencias_detectadas');
  const [showFilters, setShowFilters] = useState(true);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedInconsistencia, setSelectedInconsistencia] = useState<any>(null);
  
  // Estado de período (ano e mês)
  const [anoAtual, setAnoAtual] = useState(Math.max(new Date().getFullYear(), 2024));
  const [mesAtual, setMesAtual] = useState<string>('all');
  const [filtroCodResolucao, setFiltroCodResolucao] = useState<string>('all');
  const [filtroEnvioEmail, setFiltroEnvioEmail] = useState<FiltroEnvioEmail>('all');
  
  // Estado de filtros
  const [filtros, setFiltros] = useState<InconsistenciasChamadosFiltros>({
    busca: '',
    tipo_inconsistencia: 'all',
    origem: 'all',
    analista: '',
    data_inicio: `${new Date().getFullYear()}-01-01`,
    data_fim: `${new Date().getFullYear()}-12-31`
  });

  // Atualizar filtros quando ano/mês mudar
  useEffect(() => {
    let primeiroDia: string;
    let ultimoDia: string;
    if (mesAtual === 'all') {
      primeiroDia = `${anoAtual}-01-01`;
      ultimoDia = `${anoAtual}-12-31`;
    } else {
      const mesNum = parseInt(mesAtual, 10);
      primeiroDia = `${anoAtual}-${mesAtual}-01`;
      const ultimoDiaDate = new Date(anoAtual, mesNum, 0);
      ultimoDia = `${anoAtual}-${mesAtual}-${String(ultimoDiaDate.getDate()).padStart(2, '0')}`;
    }
    setFiltros(prev => ({ ...prev, data_inicio: primeiroDia, data_fim: ultimoDia }));
  }, [anoAtual, mesAtual]);

  // Estado de seleção e paginação
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(DEFAULT_ITEMS_PER_PAGE);
  const [currentPageResolvidas, setCurrentPageResolvidas] = useState(1);

  // Estado do modal de email — um envelope (destinatário/cc/bcc/assunto/anexos) por analista
  const [emailEnvelopes, setEmailEnvelopes] = useState<InconsistenciaEmailEnvelope[]>([]);
  const [enviandoEmail, setEnviandoEmail] = useState(false);

  // Hooks de dados
  const { inconsistencias, isLoading, refetch } = useInconsistenciasChamados(filtros);
  const { estatisticas, isLoading: isLoadingStats } = useInconsistenciasEstatisticas(filtros);
  const { resolvidas, isLoading: isLoadingResolvidas } = useInconsistenciasResolvidas(filtros);
  const { enviarNotificacaoAsync } = useEnviarNotificacao();
  const { arquivar, isArquivando, arquivarMultiplas, isArquivandoMultiplas } = useArquivarInconsistencia();

  // Query para empresas cadastradas (validação visual, de-para nome abreviado e email do gestor)
  const { data: empresasCadastradas } = useQuery({
    queryKey: ['empresas-nomes-cadastradas'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('empresas_clientes')
        .select('nome_abreviado, nome_completo, email_gestor')
        .order('nome_abreviado');
      if (error) throw error;
      return data || [];
    },
    staleTime: 10 * 60 * 1000,
  });

  // Função para obter nome abreviado e verificar se empresa está cadastrada
  const obterDadosEmpresa = (nomeEmpresa: string | null): { nome: string; encontrada: boolean } => {
    if (!nomeEmpresa) return { nome: '-', encontrada: false };
    if (!empresasCadastradas) return { nome: nomeEmpresa, encontrada: true };

    const match = encontrarEmpresaCadastrada(nomeEmpresa, empresasCadastradas);
    if (match) {
      return { nome: match.nome_abreviado || nomeEmpresa, encontrada: true };
    }

    return { nome: nomeEmpresa, encontrada: false };
  };

  // Retorna o email do gestor cadastrado para a empresa (usado no texto do IC 999999)
  const obterEmailGestorEmpresa = (nomeEmpresa: string | null): string | null => {
    if (!empresasCadastradas) return null;
    const match = encontrarEmpresaCadastrada(nomeEmpresa, empresasCadastradas);
    return match?.email_gestor ?? null;
  };

  // Lista de analistas únicos das inconsistências ativas (usado no handler de email)
  const analistasUnicos = Array.from(
    new Set(inconsistencias.map(inc => inc.analista).filter(a => a && a.trim() !== ''))
  ).sort() as string[];

  // Navegação de ano (mínimo: 2024)
  const navegarAnoAnterior = () => {
    if (anoAtual > 2024) { setAnoAtual(anoAtual - 1); setCurrentPage(1); }
  };
  const navegarAnoProximo = () => { setAnoAtual(anoAtual + 1); setCurrentPage(1); };

  // Filtros ativos
  const hasActiveFilters = () => {
    return filtros.busca !== '' || filtros.tipo_inconsistencia !== 'all' ||
      filtros.origem !== 'all' || filtros.analista !== '' || mesAtual !== 'all' || filtroCodResolucao !== 'all' || filtroEnvioEmail !== 'all' || (filtros.status_chamado && filtros.status_chamado !== 'all');
  };
  const limparFiltros = () => {
    setMesAtual('all');
    setFiltroCodResolucao('all');
    setFiltroEnvioEmail('all');
    setFiltros(prev => ({ ...prev, busca: '', tipo_inconsistencia: 'all', origem: 'all', analista: '', status_chamado: 'all' }));
    setCurrentPage(1);
    setCurrentPageResolvidas(1);
  };

  // Seleção múltipla
  const handleSelectAll = (checked: boolean) => {
    if (checked) { setSelectedIds(paginatedInconsistencias.map(inc => inc.id)); }
    else { setSelectedIds([]); }
  };
  const handleSelectItem = (id: string, checked: boolean) => {
    if (checked) { setSelectedIds([...selectedIds, id]); }
    else { setSelectedIds(selectedIds.filter(sid => sid !== id)); }
  };

  // Email - abrir modal — agrupa os itens selecionados por analista em envelopes independentes
  const handleAbrirModalEmail = async () => {
    const selecionadas = inconsistencias.filter(inc => selectedIds.includes(inc.id));
    if (selecionadas.length === 0) {
      toast({ title: t('inconsistencias.noInconsistencySelected'), description: t('inconsistencias.selectAtLeastOne'), variant: "destructive" });
      return;
    }

    // Busca todos os especialistas de uma vez (em vez de 1 query por analista) — a resolução
    // do email é feita em memória via encontrarEmailEspecialista, tolerante a diferenças de
    // espaçamento/acentuação nos dados sincronizados.
    let especialistas: EspecialistaResumo[] = [];
    try {
      const { data, error } = await supabase.from('especialistas').select('nome, email');
      if (error) throw error;
      especialistas = data || [];
    } catch (error) {
      console.error('Erro ao buscar especialistas:', error instanceof Error ? error.message : 'erro desconhecido');
    }

    const grupos = agruparInconsistenciasPorAnalista(selecionadas);
    const envelopes: InconsistenciaEmailEnvelope[] = Array.from(grupos.entries()).map(([analista, itensDoAnalista]) => {
      const destinatario = analista !== 'Sem analista'
        ? encontrarEmailEspecialista(analista, especialistas) || ''
        : '';
      return {
        analista,
        itens: itensDoAnalista,
        destinatario,
        cc: '',
        bcc: '',
        assunto: '[AUDITORIA ARANDA] – Regularização de Chamados e Tarefas',
        anexos: [],
      };
    });

    setEmailEnvelopes(envelopes);
    setShowEmailModal(true);
  };

  // Atualiza um campo específico de um envelope pelo índice
  const atualizarEnvelope = <K extends keyof InconsistenciaEmailEnvelope>(index: number, campo: K, valor: InconsistenciaEmailEnvelope[K]) => {
    setEmailEnvelopes(prev => prev.map((env, i) => (i === index ? { ...env, [campo]: valor } : env)));
  };

  // Arquivar individual
  const handleArquivar = (id: string) => {
    arquivar(id, {
      onSuccess: () => {
        toast({ title: 'Inconsistência arquivada', description: 'O chamado foi movido para o Histórico de Inconsistências.' });
        setSelectedIds(prev => prev.filter(sid => sid !== id));
      },
      onError: (error) => {
        toast({ title: 'Erro ao arquivar', description: error instanceof Error ? error.message : 'Erro desconhecido', variant: 'destructive' });
      }
    });
  };

  // Arquivar múltiplos selecionados
  const handleArquivarSelecionados = () => {
    if (selectedIds.length === 0) {
      toast({ title: 'Nenhum item selecionado', description: 'Selecione ao menos uma inconsistência para arquivar.', variant: 'destructive' });
      return;
    }
    arquivarMultiplas(selectedIds, {
      onSuccess: () => {
        toast({ title: 'Inconsistências arquivadas', description: `${selectedIds.length} chamado(s) movido(s) para o Histórico de Inconsistências.` });
        setSelectedIds([]);
      },
      onError: (error) => {
        toast({ title: 'Erro ao arquivar', description: error instanceof Error ? error.message : 'Erro desconhecido', variant: 'destructive' });
      }
    });
  };

  // Anexos (por envelope)
  const handleAnexoChange = (envelopeIndex: number, e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const envelope = emailEnvelopes[envelopeIndex];
      const novosAnexos = Array.from(e.target.files);
      const totalSize = [...envelope.anexos, ...novosAnexos].reduce((acc, file) => acc + file.size, 0);
      if (totalSize > 25 * 1024 * 1024) {
        toast({ title: t('inconsistencias.attachmentLimitExceeded'), description: t('inconsistencias.attachmentLimitDesc'), variant: "destructive" });
        return;
      }
      atualizarEnvelope(envelopeIndex, 'anexos', [...envelope.anexos, ...novosAnexos]);
    }
  };
  const handleRemoverAnexo = (envelopeIndex: number, anexoIndex: number) => {
    const envelope = emailEnvelopes[envelopeIndex];
    atualizarEnvelope(envelopeIndex, 'anexos', envelope.anexos.filter((_, i) => i !== anexoIndex));
  };
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024; const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  // Parsear destinatários (separados por ; ou ,)
  const parseEmails = (str: string) => str.split(/[;,]/).map(e => e.trim()).filter(Boolean);

  // Converte um File[] para o formato de anexos base64 esperado pelo emailService
  const converterAnexosParaBase64 = async (anexos: File[]) => {
    return Promise.all(
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
  };

  // Monta a ação de correção para um tipo de inconsistência dentro de um envelope
  const montarAcaoCorrecao = (tipo: TipoInconsistencia, itensDoTipo: InconsistenciaChamado[]): string => {
    if (tipo === 'ic_999999') {
      const empresasUnicas = Array.from(new Set(itensDoTipo.map(item => item.empresa).filter((e): e is string => !!e)));
      const infos = empresasUnicas.map(empresa => ({ empresa, emailGestor: obterEmailGestorEmpresa(empresa) }));
      const grupos = agruparGestoresIC999999(infos);
      const detalhe = montarTextoGestorIC999999(grupos);
      return `Substituir o IC 999999 pelo IC correspondente ao cliente atendido. Caso o IC não esteja vigente, solicitar ao Customer Success responsável a criação do IC correto para o cliente (${detalhe}) e, após a criação, atualizar o chamado.`;
    }
    return ACAO_CORRECAO_TEXTO[tipo];
  };

  // Gera o HTML do email de um envelope (compatível com Outlook), com uma tabela por tipo de inconsistência
  const gerarHtmlEmailInconsistencia = (envelope: InconsistenciaEmailEnvelope): string => {
    const primeiroNome = envelope.analista.split(' ')[0];
    const totalItens = envelope.itens.length;

    const corpoIntroducao = `Prezado(a) ${primeiroNome},<br/><br/>
Durante a auditoria dos chamados, identificamos inconsistências nos registros abaixo, sob sua responsabilidade.<br/><br/>
Solicitamos a regularização conforme a orientação indicada em cada item, o mais breve possível.<br/><br/>
Em caso de dúvidas, entre em contato com a equipe de <strong>Qualidade</strong>.<br/><br/>
Após a conclusão, confirme a realização dos ajustes.<br/><br/>
Atenciosamente.`;

    const secoesPorTipo = Array.from(agruparPorTipoOrdenado(envelope.itens).entries()).map(([tipo, itensDoTipo]) => {
      const cor = TIPO_INCONSISTENCIA_COR_EMAIL_HEX[tipo];
      const colunas = colunasEmailPorTipo(tipo);
      const cabecalho = colunas.map(col =>
        `<th style="padding: 10px 12px; text-align: center; font-size: 12px; font-weight: 600; color: #374151; border-bottom: 2px solid #e5e7eb; background-color: #f3f4f6; font-family: Arial, sans-serif;">${col.titulo}</th>`
      ).join('');
      const linhas = itensDoTipo.map(item => {
        const nomeEmpresa = encontrarEmpresaCadastrada(item.empresa, empresasCadastradas || [])?.nome_abreviado || item.empresa || '-';
        const celulas = colunas.map(col =>
          `<td style="padding: 8px 12px; border-bottom: 1px solid #e5e7eb; font-size: 13px; font-family: Arial, sans-serif;${col.destaque ? ' color: #2563eb;' : ''} text-align: center;">${valorColunaEmail(col.chave, item, { empresa: nomeEmpresa, analista: envelope.analista })}</td>`
        ).join('');
        return `
          <tr>${celulas}</tr>`;
      }).join('');

      const acaoCorrecao = montarAcaoCorrecao(tipo, itensDoTipo);

      return `
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
            <tr>
              <td style="background-color: ${cor.bg}; color: ${cor.text}; padding: 8px 16px; font-weight: 600; font-size: 13px; font-family: Arial, sans-serif;">
                ${TIPO_INCONSISTENCIA_LABELS[tipo]}
              </td>
              <td style="background-color: ${cor.bg}; color: ${cor.text}; padding: 8px 16px; font-size: 12px; font-family: Arial, sans-serif; text-align: right;">
                ${itensDoTipo.length} item${itensDoTipo.length > 1 ? 's' : ''}
              </td>
            </tr>
          </table>
          <table cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse: collapse; background-color: #ffffff; border: 1px solid #e5e7eb;">
            <thead>
              <tr>${cabecalho}</tr>
            </thead>
            <tbody>
              ${linhas}
              <tr>
                <td colspan="${colunas.length}" style="padding: 10px 12px; font-size: 13px; color: #374151; line-height: 1.6; font-family: Arial, sans-serif; background-color: #ffffff;">
                  <strong>Ação:</strong> ${acaoCorrecao}
                </td>
              </tr>
            </tbody>
          </table>`;
    }).join(
      // Spacer entre seções: margin/padding em <table> ou <div> é ignorado pelo Outlook
      // (motor Word), então usamos uma linha de tabela vazia com altura fixa.
      '<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr><td style="height:28px; line-height:28px; font-size:1px; mso-line-height-rule:exactly;">&nbsp;</td></tr></table>'
    );

    return `<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: Arial, sans-serif;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f4f4f5;">
    <tr>
      <td align="center" style="padding: 24px 16px;">
        <!--[if mso]><table role="presentation" cellpadding="0" cellspacing="0" border="0" width="700"><tr><td><![endif]-->
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width: 700px; margin: 0 auto;">

          <!-- HEADER -->
          <tr>
            <td align="center" style="background-color: #2563eb; padding: 24px 16px;">
              <h1 style="color: #ffffff; margin: 0; font-size: 20px; font-weight: bold; font-family: Arial, sans-serif;">Auditoria de Chamados e Tarefas</h1>
              <p style="color: #bfdbfe; margin: 8px 0 0 0; font-size: 14px; font-family: Arial, sans-serif;">${totalItens} inconsistência${totalItens > 1 ? 's' : ''} identificada${totalItens > 1 ? 's' : ''}</p>
            </td>
          </tr>

          <!-- CORPO DO EMAIL -->
          <tr>
            <td style="padding: 24px; background-color: #ffffff; border-left: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb;">
              <p style="margin: 0; font-size: 14px; color: #374151; line-height: 1.6; font-family: Arial, sans-serif;">${corpoIntroducao}</p>
            </td>
          </tr>

          <!-- SEÇÕES POR TIPO DE INCONSISTÊNCIA -->
          <tr>
            <td style="padding: 16px 24px; background-color: #f9fafb; border-left: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb; border-bottom: 1px solid #e5e7eb;">
              ${secoesPorTipo}
            </td>
          </tr>

        </table>
        <!--[if mso]></td></tr></table><![endif]-->
      </td>
    </tr>
  </table>
</body>
</html>`;
  };

  // Enviar email — dispara um email por envelope (analista), continuando mesmo se algum falhar
  const handleEnviarEmail = async () => {
    setEnviandoEmail(true);
    try {
      const puladosPorFaltaDeEmail: string[] = [];
      const enviosASeremTentados = emailEnvelopes.filter(envelope => {
        if (!envelope.destinatario.trim()) {
          puladosPorFaltaDeEmail.push(envelope.analista);
          return false;
        }
        return true;
      });

      const resultados = await Promise.allSettled(
        enviosASeremTentados.map(async (envelope) => {
          const html = gerarHtmlEmailInconsistencia(envelope);
          const destinatarios = parseEmails(envelope.destinatario);
          const cc = envelope.cc.trim() ? parseEmails(envelope.cc) : undefined;
          const bcc = envelope.bcc.trim() ? parseEmails(envelope.bcc) : undefined;
          const anexosBase64 = await converterAnexosParaBase64(envelope.anexos);

          const resultado = await emailService.sendEmail({
            to: destinatarios,
            cc,
            bcc,
            subject: envelope.assunto,
            html,
            attachments: anexosBase64.length > 0 ? anexosBase64 : undefined,
          });

          if (!resultado.success) {
            throw new Error(resultado.error || 'Erro ao enviar email.');
          }

          try {
            await enviarNotificacaoAsync({
              inconsistencias: envelope.itens,
              ano_referencia: anoAtual,
              email_analista: destinatarios.join(', '),
              email_cc: cc?.join(', '),
            });
          } catch (erroHistorico) {
            console.error('Erro ao gravar histórico:', erroHistorico instanceof Error ? erroHistorico.message : 'erro desconhecido');
          }

          return envelope;
        })
      );

      const envelopesComSucesso: InconsistenciaEmailEnvelope[] = [];
      const falhas: string[] = [];
      resultados.forEach((resultado, idx) => {
        if (resultado.status === 'fulfilled') {
          envelopesComSucesso.push(resultado.value);
        } else {
          const motivo = resultado.reason instanceof Error ? resultado.reason.message : 'erro desconhecido';
          falhas.push(`${enviosASeremTentados[idx].analista} (${motivo})`);
        }
      });

      if (envelopesComSucesso.length > 0) {
        toast({ title: t('inconsistencias.notificationsSent'), description: `${envelopesComSucesso.length} email(s) enviado(s) com sucesso.` });
      }
      if (falhas.length > 0) {
        toast({ title: t('inconsistencias.sendError'), description: `Falha ao enviar email para: ${falhas.join(', ')}`, variant: 'destructive' });
      }
      if (puladosPorFaltaDeEmail.length > 0) {
        toast({ title: t('inconsistencias.recipientsRequired'), description: `Pulado por falta de email cadastrado: ${puladosPorFaltaDeEmail.join(', ')}`, variant: 'destructive' });
      }

      if (envelopesComSucesso.length > 0) {
        setShowEmailModal(false);
        setSelectedIds([]);
        setEmailEnvelopes([]);
        refetch();
      }
    } catch (error) {
      console.error('Erro ao enviar email:', error instanceof Error ? error.message : 'erro desconhecido');
      toast({ title: t('inconsistencias.sendError'), description: t('common.error'), variant: 'destructive' });
    } finally {
      setEnviandoEmail(false);
    }
  };

  // Paginação - Detectadas (aplica filtros locais de cod_resolucao e status_chamado)
  // Emails enviados de todas as linhas das duas abas (bolinha verde e filtro "Email")
  const { envios: enviosPorInconsistencia } = useEnviosEmailInconsistencias([
    ...inconsistencias.map(inc => inc.id),
    ...resolvidas.map(inc => inc.id),
  ]);

  const inconsistenciasFiltradas = inconsistencias.filter(inc => {
    if (!passaFiltroEnvioEmail(inc.id, enviosPorInconsistencia, filtroEnvioEmail)) return false;
    // Filtro local de cód. resolução
    if (filtroCodResolucao !== 'all') {
      const codFormatado = inc.cod_resolucao ? inc.cod_resolucao.replace(/\s*\(Banco.*$/, '').trim() : '';
      if (codFormatado !== filtroCodResolucao) return false;
    }
    // Filtro local de status do chamado (enriquecido no frontend)
    if (filtros.status_chamado && filtros.status_chamado !== 'all') {
      if (inc.status_chamado !== filtros.status_chamado) return false;
    }
    return true;
  });
  const totalPages = Math.ceil(inconsistenciasFiltradas.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedInconsistencias = inconsistenciasFiltradas.slice(startIndex, endIndex);

  // Paginação - Resolvidas (usa os MESMOS filtros da Tab 1 - compartilhados)
  const resolvidasFiltradas = resolvidas.filter(inc => {
    if (!passaFiltroEnvioEmail(inc.id, enviosPorInconsistencia, filtroEnvioEmail)) return false;
    // Filtro de busca
    if (filtros.busca) {
      const busca = filtros.busca.toLowerCase();
      const matchBusca = (inc.nro_chamado || '').toLowerCase().includes(busca) ||
        (inc.nro_tarefa || '').toLowerCase().includes(busca) ||
        (inc.analista || '').toLowerCase().includes(busca) ||
        (inc.empresa || '').toLowerCase().includes(busca);
      if (!matchBusca) return false;
    }
    // Filtro de cód. resolução
    if (filtroCodResolucao !== 'all') {
      const codFormatado = inc.cod_resolucao ? inc.cod_resolucao.replace(/\s*\(Banco.*$/, '').trim() : '';
      if (codFormatado !== filtroCodResolucao) return false;
    }
    // Filtro de status do chamado (enriquecido)
    if (filtros.status_chamado && filtros.status_chamado !== 'all') {
      if (inc.status_chamado !== filtros.status_chamado) return false;
    }
    return true;
  });
  const totalPagesResolvidas = Math.ceil(resolvidasFiltradas.length / itemsPerPage);
  const startIndexResolvidas = (currentPageResolvidas - 1) * itemsPerPage;
  const endIndexResolvidas = startIndexResolvidas + itemsPerPage;
  const paginatedResolvidas = resolvidasFiltradas.slice(startIndexResolvidas, endIndexResolvidas);

  // Analistas do filtro: somente os da aba ativa
  const analistasDaAba = listarAnalistasDaAba(
    activeTab === 'historico_resolvidas' ? resolvidas : inconsistencias,
    filtros.analista
  );

  // Listas únicas combinadas para filtros (compartilhados entre abas)
  const statusChamadoUnicosCombinados = Array.from(
    new Set([
      ...inconsistencias.map(inc => inc.status_chamado),
      ...resolvidas.map(inc => inc.status_chamado)
    ].filter(s => s && s.trim() !== ''))
  ).sort() as string[];
  const codResolucaoUnicosCombinados = Array.from(
    new Set([
      ...inconsistencias.map(inc => inc.cod_resolucao ? inc.cod_resolucao.replace(/\s*\(Banco.*$/, '').trim() : ''),
      ...resolvidas.map(inc => inc.cod_resolucao ? inc.cod_resolucao.replace(/\s*\(Banco.*$/, '').trim() : '')
    ].filter(c => c !== ''))
  ).sort() as string[];

  const handleItemsPerPageChange = (value: string) => { setItemsPerPage(Number(value)); setCurrentPage(1); setCurrentPageResolvidas(1); };

  // Formatar data (apenas dd/MM/yyyy)
  const formatarData = (data: string | null) => {
    if (!data) return '-';
    const d = new Date(data);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  // Formatar data completa com horas (para tooltip)
  const formatarDataCompleta = (data: string | null) => {
    if (!data) return '';
    const d = new Date(data);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  // Formatar código de resolução (remove sufixo "(Banco=..." )
  const formatarCodResolucao = (cod: string | null) => {
    if (!cod) return '-';
    return cod.replace(/\s*\(Banco.*$/, '').trim() || cod;
  };

  // Render empresa cell helper
  const renderEmpresaCell = (empresa: string | null, analista: string | null) => {
    const isClienteEspecial = isClienteEspecialBRFONSDAGUIRRE(empresa);
    if (isClienteEspecial) {
      return <ClienteNomeDisplay nomeEmpresa={empresa} nomeCliente={analista} className="inline font-medium" />;
    }
    const { nome, encontrada } = obterDadosEmpresa(empresa);
    return <span className={`font-medium ${!encontrada ? 'text-red-600' : ''}`}>{nome}</span>;
  };

  // Filtros (compartilhados entre as abas) — renderizados dentro do card de cada aba
  const botoesFiltro = (
    <div className="flex gap-2">
      <Button variant="outline" size="sm" onClick={() => setShowFilters(!showFilters)} className="flex items-center justify-center space-x-2"><Filter className="h-4 w-4" /><span>Filtros</span></Button>
      {hasActiveFilters() && (<Button variant="outline" size="sm" onClick={limparFiltros} className="hover:border-red-300"><X className="h-4 w-4 mr-2 text-red-600" />{t('common.clearFilter')}</Button>)}
    </div>
  );

  const camposFiltro = showFilters && (
    <div className="space-y-4 pt-4 border-t">
      <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-8 gap-4">
        <div><div className="text-sm font-medium mb-2">{t('common.search')}</div><div className="relative"><Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" /><Input placeholder={t('inconsistencias.searchPlaceholder')} value={filtros.busca} onChange={(e) => { setFiltros({ ...filtros, busca: e.target.value }); setCurrentPage(1); setCurrentPageResolvidas(1); }} className="pl-10 focus:ring-sonda-blue focus:border-sonda-blue" /></div></div>
        <div><div className="text-sm font-medium mb-2">{t('common.type')}</div><Select value={filtros.tipo_inconsistencia} onValueChange={(value: any) => { setFiltros({ ...filtros, tipo_inconsistencia: value }); setCurrentPage(1); setCurrentPageResolvidas(1); }}><SelectTrigger className="focus:ring-sonda-blue focus:border-sonda-blue"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">{t('common.all')}</SelectItem><SelectItem value="mes_diferente">{t('inconsistencias.differentMonth')}</SelectItem><SelectItem value="tempo_excessivo">{t('inconsistencias.excessiveTime')}</SelectItem><SelectItem value="ic_999999">{t('inconsistencias.ic999999')}</SelectItem><SelectItem value="sem_atualizacao">{t('inconsistencias.noUpdate16Days')}</SelectItem></SelectContent></Select></div>
        <div><div className="text-sm font-medium mb-2">{t('inconsistencias.analyst')}</div><Select value={filtros.analista || 'all'} onValueChange={(value: any) => { setFiltros({ ...filtros, analista: value === 'all' ? '' : value }); setCurrentPage(1); setCurrentPageResolvidas(1); }}><SelectTrigger className="focus:ring-sonda-blue focus:border-sonda-blue"><SelectValue placeholder={t('inconsistencias.allAnalysts')} /></SelectTrigger><SelectContent><SelectItem value="all">{t('inconsistencias.allAnalysts')}</SelectItem>{analistasDaAba.map((a) => (<SelectItem key={a} value={a}>{a}</SelectItem>))}</SelectContent></Select></div>
        <div><div className="text-sm font-medium mb-2">{t('inconsistencias.origin')}</div><Select value={filtros.origem || 'all'} onValueChange={(value: any) => { setFiltros({ ...filtros, origem: value }); setCurrentPage(1); setCurrentPageResolvidas(1); }}><SelectTrigger className="focus:ring-sonda-blue focus:border-sonda-blue"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">{t('inconsistencias.allOrigins')}</SelectItem><SelectItem value="apontamentos">{t('inconsistencias.originAppointments')}</SelectItem><SelectItem value="tickets">{t('inconsistencias.originTickets')}</SelectItem></SelectContent></Select></div>
        <div><div className="text-sm font-medium mb-2">Mês</div><Select value={mesAtual} onValueChange={(value) => { setMesAtual(value); setCurrentPage(1); setCurrentPageResolvidas(1); }}><SelectTrigger className="focus:ring-sonda-blue focus:border-sonda-blue"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todos os meses</SelectItem><SelectItem value="01">Janeiro</SelectItem><SelectItem value="02">Fevereiro</SelectItem><SelectItem value="03">Março</SelectItem><SelectItem value="04">Abril</SelectItem><SelectItem value="05">Maio</SelectItem><SelectItem value="06">Junho</SelectItem><SelectItem value="07">Julho</SelectItem><SelectItem value="08">Agosto</SelectItem><SelectItem value="09">Setembro</SelectItem><SelectItem value="10">Outubro</SelectItem><SelectItem value="11">Novembro</SelectItem><SelectItem value="12">Dezembro</SelectItem></SelectContent></Select></div>
        <div><div className="text-sm font-medium mb-2">Cód. Resolução</div><Select value={filtroCodResolucao} onValueChange={(value) => { setFiltroCodResolucao(value); setCurrentPage(1); setCurrentPageResolvidas(1); }}><SelectTrigger className="focus:ring-sonda-blue focus:border-sonda-blue"><SelectValue placeholder="Todos" /></SelectTrigger><SelectContent><SelectItem value="all">Todos</SelectItem>{codResolucaoUnicosCombinados.map((cod) => (<SelectItem key={cod} value={cod}>{cod}</SelectItem>))}</SelectContent></Select></div>
        <div><div className="text-sm font-medium mb-2">Status</div><Select value={filtros.status_chamado || 'all'} onValueChange={(value) => { setFiltros({ ...filtros, status_chamado: value }); setCurrentPage(1); setCurrentPageResolvidas(1); }}><SelectTrigger className="focus:ring-sonda-blue focus:border-sonda-blue"><SelectValue placeholder="Todos" /></SelectTrigger><SelectContent><SelectItem value="all">Todos os status</SelectItem>{statusChamadoUnicosCombinados.map((s) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}</SelectContent></Select></div>
        <div><div className="text-sm font-medium mb-2">Email</div><Select value={filtroEnvioEmail} onValueChange={(value: FiltroEnvioEmail) => { setFiltroEnvioEmail(value); setCurrentPage(1); setCurrentPageResolvidas(1); }}><SelectTrigger className="focus:ring-sonda-blue focus:border-sonda-blue"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Todos</SelectItem><SelectItem value="enviado">Email enviado</SelectItem><SelectItem value="nao_enviado">Email não enviado</SelectItem></SelectContent></Select></div>
      </div>
    </div>
  );

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Cabeçalho */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
              {t('inconsistencias.title')}
            </h1>
            <p className="text-muted-foreground mt-1">{t('inconsistencias.subtitle')}</p>
          </div>
          <div className="flex space-x-2">
            <Button variant="outline" size="sm"><Download className="h-4 w-4 mr-2" />{t('common.export')}</Button>
            {selectedIds.length > 0 && (
              <>
                <Button size="sm" variant="outline" onClick={handleArquivarSelecionados} disabled={isArquivandoMultiplas}>
                  <Archive className="h-4 w-4 mr-2" />Arquivar ({selectedIds.length})
                </Button>
                <Button size="sm" onClick={handleAbrirModalEmail} disabled={enviandoEmail} className="bg-sonda-blue hover:bg-sonda-dark-blue">
                  <Send className="h-4 w-4 mr-2" />{t('inconsistencias.sendEmail')} ({selectedIds.length})
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Cards de Estatísticas */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 lg:gap-4">
          <Card><CardHeader className="pb-2"><CardTitle className="text-xs lg:text-sm font-medium text-gray-600 dark:text-gray-400"><div className="flex items-center gap-2"><AlertTriangle className="h-4 w-4" />{t('inconsistencias.totalInconsistencies')}</div></CardTitle></CardHeader><CardContent className="pt-0">{isLoadingStats ? <Skeleton className="h-8 w-16" /> : <div className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-white">{estatisticas?.total || 0}</div>}</CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-xs lg:text-sm font-medium text-yellow-600"><div className="flex items-center gap-2"><Calendar className="h-4 w-4" />{t('inconsistencias.differentMonth')}</div></CardTitle></CardHeader><CardContent className="pt-0">{isLoadingStats ? <Skeleton className="h-8 w-16" /> : <div className="text-xl lg:text-2xl font-bold text-yellow-600">{estatisticas?.por_tipo.mes_diferente || 0}</div>}</CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-xs lg:text-sm font-medium text-orange-600"><div className="flex items-center gap-2"><Clock className="h-4 w-4" />{t('inconsistencias.excessiveTime')}</div></CardTitle></CardHeader><CardContent className="pt-0">{isLoadingStats ? <Skeleton className="h-8 w-16" /> : <div className="text-xl lg:text-2xl font-bold text-orange-600">{estatisticas?.por_tipo.tempo_excessivo || 0}</div>}</CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-xs lg:text-sm font-medium text-purple-600"><div className="flex items-center gap-2"><Settings className="h-4 w-4" />{t('inconsistencias.ic999999')}</div></CardTitle></CardHeader><CardContent className="pt-0">{isLoadingStats ? <Skeleton className="h-8 w-16" /> : <div className="text-xl lg:text-2xl font-bold text-purple-600">{estatisticas?.por_tipo.ic_999999 || 0}</div>}</CardContent></Card>
          <Card><CardHeader className="pb-2"><CardTitle className="text-xs lg:text-sm font-medium text-sky-600"><div className="flex items-center gap-2"><Clock className="h-4 w-4" />{t('inconsistencias.noUpdate16Days')}</div></CardTitle></CardHeader><CardContent className="pt-0">{isLoadingStats ? <Skeleton className="h-8 w-16" /> : <div className="text-xl lg:text-2xl font-bold text-sky-600">{estatisticas?.por_tipo.sem_atualizacao || 0}</div>}</CardContent></Card>
        </div>

        {/* Navegação por Ano */}
        <Card><CardContent className="py-3 px-4"><div className="flex items-center justify-between">
          <Button variant="outline" size="sm" onClick={navegarAnoAnterior} disabled={anoAtual <= 2024} className="flex items-center gap-1"><ChevronLeft className="h-4 w-4" />{t('common.previous')}</Button>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{anoAtual}</h2>
          <Button variant="outline" size="sm" onClick={navegarAnoProximo} className="flex items-center gap-1">{t('common.next')}<ChevronRight className="h-4 w-4" /></Button>
        </div></CardContent></Card>

        {/* Tabs - 3 Abas */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="bg-gray-100 p-1 rounded-lg">
            <TabsTrigger value="inconsistencias_detectadas" className="data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm text-gray-500 font-medium">
              {t('inconsistencias.tabDetected')} ({inconsistenciasFiltradas.length})
            </TabsTrigger>
            <TabsTrigger value="historico_resolvidas" className="data-[state=active]:bg-white data-[state=active]:text-gray-900 data-[state=active]:shadow-sm text-gray-500 font-medium">
              Histórico de Inconsistências ({resolvidasFiltradas.length})
            </TabsTrigger>
          </TabsList>

          {/* Tab 1: Inconsistências Detectadas */}
          <TabsContent value="inconsistencias_detectadas" className="mt-4">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                  <CardTitle className="text-lg flex items-center gap-2"><AlertTriangle className="h-5 w-5" />{t('inconsistencias.detectedTitle')}</CardTitle>
                  {botoesFiltro}
                </div>
                {camposFiltro}
              </CardHeader>

              <CardContent className="overflow-x-auto">
                {isLoading ? (
                  <div className="space-y-2"><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /></div>
                ) : paginatedInconsistencias.length === 0 ? (
                  <div className="flex items-center justify-center py-12"><div className="text-center"><AlertTriangle className="h-16 w-16 text-gray-400 mx-auto mb-4" /><p className="text-gray-500 mb-2 font-medium">{t('inconsistencias.noInconsistencyFound')}</p></div></div>
                ) : (
                  <>
                    <Table className="w-full text-xs sm:text-sm">
                      <TableHeader><TableRow>
                        <TableHead className="w-12 py-2"><Checkbox checked={selectedIds.length === paginatedInconsistencias.length && paginatedInconsistencias.length > 0} onCheckedChange={handleSelectAll} /></TableHead>
                        <TableHead className="min-w-[120px] text-center text-xs sm:text-sm py-2">{t('inconsistencias.ticketNumber')}</TableHead>
                        <TableHead className="min-w-[80px] text-center text-xs sm:text-sm py-2">{t('inconsistencias.taskNumber')}</TableHead>
                        <TableHead className="min-w-[90px] text-center text-xs sm:text-sm py-2">Status</TableHead>
                        <TableHead className="min-w-[120px] text-center text-xs sm:text-sm py-2">{t('common.type')}</TableHead>
                        <TableHead className="min-w-[110px] text-center text-xs sm:text-sm py-2">{t('inconsistencias.openDate')}</TableHead>
                        <TableHead className="min-w-[110px] text-center text-xs sm:text-sm py-2">{t('inconsistencias.activityDate')}</TableHead>
                        <TableHead className="min-w-[110px] text-center text-xs sm:text-sm py-2">{t('inconsistencias.systemDate')}</TableHead>
                        <TableHead className="min-w-[80px] text-center text-xs sm:text-sm py-2">{t('inconsistencias.time')}</TableHead>
                        <TableHead className="min-w-[130px] text-center text-xs sm:text-sm py-2">Cód. Resolução</TableHead>
                        <TableHead className="min-w-[120px] text-center text-xs sm:text-sm py-2">{t('historico.company')}</TableHead>
                        <TableHead className="min-w-[120px] text-center text-xs sm:text-sm py-2">{t('inconsistencias.analyst')}</TableHead>
                        <TableHead className="w-[60px] text-center text-xs sm:text-sm py-2">{t('common.actions')}</TableHead>
                      </TableRow></TableHeader>
                      <TableBody>
                        {paginatedInconsistencias.map((inc) => (
                          <TableRow key={inc.id} className="hover:bg-gray-50">
                            <TableCell className="py-2"><Checkbox checked={selectedIds.includes(inc.id)} onCheckedChange={(checked) => handleSelectItem(inc.id, checked as boolean)} /></TableCell>
                            <TableCell className="text-center py-2"><div className="flex items-center justify-center gap-1 whitespace-nowrap"><ClipboardList className="h-3.5 w-3.5 text-blue-600 flex-shrink-0" /><span className="font-medium text-xs sm:text-sm">{inc.nro_chamado}</span><EmailEnviadoIndicador envios={enviosPorInconsistencia[inc.id]} /></div></TableCell>
                            <TableCell className="text-center py-2"><span className="text-[10px] sm:text-xs">{inc.nro_tarefa || '-'}</span></TableCell>
                            <TableCell className="text-center py-2">{inc.status_chamado && inc.status_chamado.trim() !== '' ? <Badge variant="outline" className="border-sonda-blue text-sonda-blue text-[8px] sm:text-[9px] px-1.5 py-0.5 whitespace-nowrap">{inc.status_chamado}</Badge> : <span className="text-xs text-gray-400">-</span>}</TableCell>
                            <TableCell className="text-center py-2"><Badge className={`${TIPO_INCONSISTENCIA_COLORS[inc.tipo_inconsistencia]} text-[8px] sm:text-[9px] px-1.5 py-0.5 whitespace-nowrap`}>{TIPO_INCONSISTENCIA_LABELS[inc.tipo_inconsistencia]}</Badge></TableCell>
                            <TableCell className="text-center py-2"><span className="text-[10px] sm:text-xs cursor-default" title={formatarDataCompleta(inc.data_abertura)}>{formatarData(inc.data_abertura)}</span></TableCell>
                            <TableCell className="text-center py-2"><span className="text-[10px] sm:text-xs cursor-default" title={formatarDataCompleta(inc.data_atividade)}>{formatarData(inc.data_atividade)}</span></TableCell>
                            <TableCell className="text-center py-2"><span className="text-[10px] sm:text-xs cursor-default" title={formatarDataCompleta(inc.data_sistema)}>{formatarData(inc.data_sistema)}</span></TableCell>
                            <TableCell className="text-center py-2"><span className="text-xs sm:text-sm font-medium">{inc.tempo_gasto_horas || '-'}</span></TableCell>
                            <TableCell className="text-center py-2"><span className="text-[10px] sm:text-xs" title={inc.cod_resolucao || ''}>{formatarCodResolucao(inc.cod_resolucao)}</span></TableCell>
                            <TableCell className="text-center py-2 max-w-[120px]">{renderEmpresaCell(inc.empresa, inc.analista)}</TableCell>
                            <TableCell className="text-center py-2"><span className="text-xs sm:text-sm">{inc.analista || '-'}</span></TableCell>
                            <TableCell className="text-center py-2"><div className="flex justify-center gap-1"><Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={() => { setSelectedInconsistencia(inc); setShowViewModal(true); }} title={t('inconsistencias.viewDetails')}><Eye className="h-3.5 w-3.5 text-blue-600" /></Button><Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={() => handleArquivar(inc.id)} disabled={isArquivando} title="Arquivar"><Archive className="h-3.5 w-3.5 text-orange-600" /></Button></div></TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>

                    {/* Paginação */}
                    <div className="flex items-center justify-between px-2 py-4 border-t">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-700">{t('historico.show')}</span>
                        <Select value={itemsPerPage.toString()} onValueChange={handleItemsPerPageChange}><SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="25">25</SelectItem><SelectItem value="50">50</SelectItem><SelectItem value="100">100</SelectItem><SelectItem value="500">500</SelectItem></SelectContent></Select>
                      </div>
                      {totalPages > 1 && (
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm" disabled={currentPage === 1} onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}><ChevronLeft className="h-4 w-4" /></Button>
                          <span className="text-sm px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded">{t('historico.pageOf', { current: currentPage, total: totalPages })}</span>
                          <Button variant="outline" size="sm" disabled={currentPage === totalPages} onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}><ChevronRight className="h-4 w-4" /></Button>
                        </div>
                      )}
                      <div className="text-sm text-gray-600 dark:text-gray-400">{startIndex + 1}-{Math.min(endIndex, inconsistenciasFiltradas.length)} de {inconsistenciasFiltradas.length} {t('inconsistencias.inconsistenciesCount')}</div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab 2: Histórico de Inconsistências (Resolvidas) */}
          <TabsContent value="historico_resolvidas" className="mt-4">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                  <CardTitle className="text-lg flex items-center gap-2"><CheckCircle className="h-5 w-5 text-green-600" />Histórico de Inconsistências</CardTitle>
                  {botoesFiltro}
                </div>
                {camposFiltro}
              </CardHeader>

              <CardContent className="overflow-x-auto">
                {isLoadingResolvidas ? (
                  <div className="space-y-2"><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /><Skeleton className="h-12 w-full" /></div>
                ) : paginatedResolvidas.length === 0 ? (
                  <div className="flex items-center justify-center py-12"><div className="text-center"><CheckCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" /><p className="text-gray-500 mb-2 font-medium">Nenhuma inconsistência resolvida neste período</p><p className="text-sm text-gray-400">Quando analistas corrigirem chamados com inconsistências, eles aparecerão aqui</p></div></div>
                ) : (
                  <>
                    <Table className="w-full text-xs sm:text-sm">
                      <TableHeader><TableRow>
                        <TableHead className="min-w-[120px] text-center text-xs sm:text-sm py-2">{t('inconsistencias.ticketNumber')}</TableHead>
                        <TableHead className="min-w-[80px] text-center text-xs sm:text-sm py-2">{t('inconsistencias.taskNumber')}</TableHead>
                        <TableHead className="min-w-[90px] text-center text-xs sm:text-sm py-2">Status</TableHead>
                        <TableHead className="min-w-[120px] text-center text-xs sm:text-sm py-2">{t('common.type')}</TableHead>
                        <TableHead className="min-w-[110px] text-center text-xs sm:text-sm py-2">Data Detecção</TableHead>
                        <TableHead className="min-w-[110px] text-center text-xs sm:text-sm py-2">Data Resolução</TableHead>
                        <TableHead className="min-w-[110px] text-center text-xs sm:text-sm py-2">{t('inconsistencias.activityDate')}</TableHead>
                        <TableHead className="min-w-[110px] text-center text-xs sm:text-sm py-2">{t('inconsistencias.systemDate')}</TableHead>
                        <TableHead className="min-w-[80px] text-center text-xs sm:text-sm py-2">{t('inconsistencias.time')}</TableHead>
                        <TableHead className="min-w-[130px] text-center text-xs sm:text-sm py-2">Cód. Resolução</TableHead>
                        <TableHead className="min-w-[120px] text-center text-xs sm:text-sm py-2">{t('historico.company')}</TableHead>
                        <TableHead className="min-w-[120px] text-center text-xs sm:text-sm py-2">{t('inconsistencias.analyst')}</TableHead>
                        <TableHead className="w-[60px] text-center text-xs sm:text-sm py-2">{t('common.actions')}</TableHead>
                      </TableRow></TableHeader>
                      <TableBody>
                        {paginatedResolvidas.map((inc) => (
                          <TableRow key={inc.id} className="hover:bg-gray-50">
                            <TableCell className="text-center py-2"><div className="flex items-center justify-center gap-1 whitespace-nowrap"><ClipboardList className="h-3.5 w-3.5 text-green-600 flex-shrink-0" /><span className="font-medium text-xs sm:text-sm">{inc.nro_chamado}</span><EmailEnviadoIndicador envios={enviosPorInconsistencia[inc.id]} /></div></TableCell>
                            <TableCell className="text-center py-2"><span className="text-[10px] sm:text-xs">{inc.nro_tarefa || '-'}</span></TableCell>
                            <TableCell className="text-center py-2">{inc.status_chamado && inc.status_chamado.trim() !== '' ? <Badge variant="outline" className="border-sonda-blue text-sonda-blue text-[8px] sm:text-[9px] px-1.5 py-0.5 whitespace-nowrap">{inc.status_chamado}</Badge> : <span className="text-xs text-gray-400">-</span>}</TableCell>
                            <TableCell className="text-center py-2"><Badge className={`${TIPO_INCONSISTENCIA_COLORS[inc.tipo_inconsistencia]} text-[8px] sm:text-[9px] px-1.5 py-0.5 whitespace-nowrap`}>{TIPO_INCONSISTENCIA_LABELS[inc.tipo_inconsistencia]}</Badge></TableCell>
                            <TableCell className="text-center py-2"><span className="text-[10px] sm:text-xs cursor-default" title={formatarDataCompleta(inc.data_deteccao || null)}>{formatarData(inc.data_deteccao || null)}</span></TableCell>
                            <TableCell className="text-center py-2"><span className="text-[10px] sm:text-xs text-green-600 font-medium cursor-default" title={formatarDataCompleta(inc.data_resolucao || null)}>{formatarData(inc.data_resolucao || null)}</span></TableCell>
                            <TableCell className="text-center py-2"><span className="text-[10px] sm:text-xs cursor-default" title={formatarDataCompleta(inc.data_atividade)}>{formatarData(inc.data_atividade)}</span></TableCell>
                            <TableCell className="text-center py-2"><span className="text-[10px] sm:text-xs cursor-default" title={formatarDataCompleta(inc.data_sistema)}>{formatarData(inc.data_sistema)}</span></TableCell>
                            <TableCell className="text-center py-2"><span className="text-xs sm:text-sm font-medium">{inc.tempo_gasto_horas || '-'}</span></TableCell>
                            <TableCell className="text-center py-2"><span className="text-[10px] sm:text-xs" title={inc.cod_resolucao || ''}>{formatarCodResolucao(inc.cod_resolucao)}</span></TableCell>
                            <TableCell className="text-center py-2 max-w-[120px]">{renderEmpresaCell(inc.empresa, inc.analista)}</TableCell>
                            <TableCell className="text-center py-2"><span className="text-xs sm:text-sm">{inc.analista || '-'}</span></TableCell>
                            <TableCell className="text-center py-2"><div className="flex justify-center gap-1"><Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={() => { setSelectedInconsistencia(inc); setShowViewModal(true); }} title={t('inconsistencias.viewDetails')}><Eye className="h-3.5 w-3.5 text-blue-600" /></Button></div></TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>

                    {/* Paginação */}
                    <div className="flex items-center justify-between px-2 py-4 border-t">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-700">{t('historico.show')}</span>
                        <Select value={itemsPerPage.toString()} onValueChange={handleItemsPerPageChange}><SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="25">25</SelectItem><SelectItem value="50">50</SelectItem><SelectItem value="100">100</SelectItem><SelectItem value="500">500</SelectItem></SelectContent></Select>
                      </div>
                      {totalPagesResolvidas > 1 && (
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm" disabled={currentPageResolvidas === 1} onClick={() => setCurrentPageResolvidas(prev => Math.max(1, prev - 1))}><ChevronLeft className="h-4 w-4" /></Button>
                          <span className="text-sm px-3 py-1 bg-gray-100 dark:bg-gray-800 rounded">{t('historico.pageOf', { current: currentPageResolvidas, total: totalPagesResolvidas })}</span>
                          <Button variant="outline" size="sm" disabled={currentPageResolvidas === totalPagesResolvidas} onClick={() => setCurrentPageResolvidas(prev => Math.min(totalPagesResolvidas, prev + 1))}><ChevronRight className="h-4 w-4" /></Button>
                        </div>
                      )}
                      <div className="text-sm text-gray-600 dark:text-gray-400">{startIndexResolvidas + 1}-{Math.min(endIndexResolvidas, resolvidasFiltradas.length)} de {resolvidasFiltradas.length} {t('inconsistencias.inconsistenciesCount')}</div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Modal de Visualização */}
      <Dialog open={showViewModal} onOpenChange={setShowViewModal}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-sonda-blue flex items-center gap-2"><Eye className="h-5 w-5" />{t('inconsistencias.detailsTitle')}</DialogTitle>
            <DialogDescription className="text-sm text-gray-500">{t('inconsistencias.detailsDescription')}</DialogDescription>
          </DialogHeader>
          {selectedInconsistencia && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div><Label className="text-sm font-medium text-gray-700">{t('inconsistencias.ticketNumber')}</Label><div className="flex items-center gap-2 mt-1"><ClipboardList className="h-4 w-4 text-blue-600" /><span className="font-mono text-sm">{selectedInconsistencia.nro_chamado}</span></div></div>
                <div><Label className="text-sm font-medium text-gray-700">{t('inconsistencias.inconsistencyType')}</Label><div className="mt-1"><Badge className={TIPO_INCONSISTENCIA_COLORS[selectedInconsistencia.tipo_inconsistencia]}>{TIPO_INCONSISTENCIA_LABELS[selectedInconsistencia.tipo_inconsistencia]}</Badge></div></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label className="text-sm font-medium text-gray-700">{t('inconsistencias.activityDate')}</Label><p className="text-sm mt-1">{formatarData(selectedInconsistencia.data_atividade)}</p></div>
                <div><Label className="text-sm font-medium text-gray-700">{t('inconsistencias.systemDate')}</Label><p className="text-sm mt-1">{formatarData(selectedInconsistencia.data_sistema)}</p></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {selectedInconsistencia.tempo_gasto_horas && (<div><Label className="text-sm font-medium text-gray-700">{t('inconsistencias.timeSpent')}</Label><p className="text-sm font-mono mt-1">{selectedInconsistencia.tempo_gasto_horas}</p></div>)}
                <div><Label className="text-sm font-medium text-gray-700">{t('historico.company')}</Label><p className="text-sm mt-1">{selectedInconsistencia.empresa || '-'}</p></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {selectedInconsistencia.cod_resolucao && (<div><Label className="text-sm font-medium text-gray-700">Cód. Resolução</Label><p className="text-sm mt-1" title={selectedInconsistencia.cod_resolucao}>{formatarCodResolucao(selectedInconsistencia.cod_resolucao)}</p></div>)}
              </div>
              {selectedInconsistencia.analista && (<div><Label className="text-sm font-medium text-gray-700">{t('inconsistencias.analyst')}</Label><p className="text-sm mt-1">{selectedInconsistencia.analista}</p></div>)}
              {selectedInconsistencia.status === 'resolvida' && selectedInconsistencia.data_resolucao && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-800"><strong>Resolvida em:</strong> {formatarData(selectedInconsistencia.data_resolucao)}</p>
                </div>
              )}
              <div><Label className="text-sm font-medium text-gray-700">{t('inconsistencias.inconsistencyDescription')}</Label><div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg"><p className="text-sm text-yellow-800">{selectedInconsistencia.descricao_inconsistencia}</p></div></div>
            </div>
          )}
          <DialogFooter><Button type="button" variant="outline" onClick={() => setShowViewModal(false)}>{t('common.close')}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal de Envio de Email — um envelope (cartão) por analista */}
      <Dialog open={showEmailModal} onOpenChange={setShowEmailModal}>
        <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-sonda-blue flex items-center gap-2"><Mail className="h-5 w-5" />{t('inconsistencias.emailTitle')}</DialogTitle>
            <DialogDescription className="text-sm text-gray-500">
              {emailEnvelopes.length > 1
                ? `${emailEnvelopes.length} emails serão enviados, um para cada analista.`
                : t('inconsistencias.emailDescription')}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-2">
            {emailEnvelopes.map((envelope, i) => {
              const primeiroNome = envelope.analista.split(' ')[0];
              const gruposPorTipo = Array.from(agruparPorTipoOrdenado(envelope.itens).entries());

              return (
                <div key={envelope.analista} className="border border-gray-200 rounded-lg p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-900">{envelope.analista}</h3>
                    <Badge variant="outline">
                      {envelope.itens.length} item{envelope.itens.length > 1 ? 's' : ''}
                    </Badge>
                  </div>

                  {/* Destinatário */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">{t('inconsistencias.recipients')} <span className="text-red-500">*</span></Label>
                    <Textarea
                      placeholder={t('inconsistencias.recipientsPlaceholder')}
                      value={envelope.destinatario}
                      onChange={(e) => atualizarEnvelope(i, 'destinatario', e.target.value)}
                      className="focus:ring-sonda-blue focus:border-sonda-blue min-h-[60px]"
                      rows={2}
                    />
                    {!envelope.destinatario && (
                      <p className="text-xs text-yellow-600">Email não encontrado na tabela de especialistas. Preencha manualmente.</p>
                    )}
                  </div>

                  {/* CC */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">{t('inconsistencias.ccRecipients')}</Label>
                    <Textarea
                      placeholder={t('inconsistencias.recipientsPlaceholder')}
                      value={envelope.cc}
                      onChange={(e) => atualizarEnvelope(i, 'cc', e.target.value)}
                      className="focus:ring-sonda-blue focus:border-sonda-blue min-h-[60px]"
                      rows={2}
                    />
                  </div>

                  {/* BCC */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">{t('inconsistencias.bccRecipients')}</Label>
                    <Textarea
                      placeholder={t('inconsistencias.recipientsPlaceholder')}
                      value={envelope.bcc}
                      onChange={(e) => atualizarEnvelope(i, 'bcc', e.target.value)}
                      className="focus:ring-sonda-blue focus:border-sonda-blue min-h-[60px]"
                      rows={2}
                    />
                  </div>

                  {/* Assunto */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">{t('inconsistencias.emailSubject')}</Label>
                    <Input
                      value={envelope.assunto}
                      onChange={(e) => atualizarEnvelope(i, 'assunto', e.target.value)}
                      className="focus:ring-sonda-blue focus:border-sonda-blue"
                    />
                  </div>

                  {/* Anexos */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium text-gray-700">{t('inconsistencias.attachments')}</Label>
                    <div className="flex items-center gap-2">
                      <Button type="button" variant="outline" size="sm" onClick={() => document.getElementById(`file-upload-inc-${i}`)?.click()} className="flex items-center gap-2">
                        <Paperclip className="h-4 w-4" />{t('inconsistencias.addFiles')}
                      </Button>
                      <span className="text-xs text-gray-500">{t('inconsistencias.totalLimit')}</span>
                    </div>
                    <input id={`file-upload-inc-${i}`} type="file" multiple onChange={(e) => handleAnexoChange(i, e)} className="hidden" />
                    {envelope.anexos.length > 0 && (
                      <div className="space-y-2 mt-3">
                        {envelope.anexos.map((file, anexoIndex) => (
                          <div key={anexoIndex} className="flex items-center justify-between p-2 bg-gray-50 rounded border">
                            <div className="flex items-center gap-2">
                              <Paperclip className="h-4 w-4 text-gray-500" />
                              <span className="text-sm">{file.name}</span>
                              <span className="text-xs text-gray-500">({formatFileSize(file.size)})</span>
                            </div>
                            <Button type="button" variant="ghost" size="sm" onClick={() => handleRemoverAnexo(i, anexoIndex)} className="h-6 w-6 p-0 text-red-600 hover:text-red-800">
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Preview do email */}
                  <div className="space-y-2">
                    <Label className="text-sm font-semibold text-gray-900">Preview do Email</Label>
                    <div className="border border-gray-200 rounded-lg overflow-hidden">
                      {/* Header azul */}
                      <div className="bg-gradient-to-r from-blue-600 to-blue-700 p-5 text-center">
                        <h2 className="text-white text-lg font-bold">Auditoria de Chamados e Tarefas</h2>
                        <p className="text-blue-200 text-sm mt-1">
                          {envelope.itens.length} inconsistência{envelope.itens.length > 1 ? 's' : ''} identificada{envelope.itens.length > 1 ? 's' : ''}
                        </p>
                      </div>

                      {/* Corpo introdutório */}
                      <div className="p-5 bg-white text-sm text-gray-700 leading-relaxed space-y-2">
                        <p>Prezado(a) {primeiroNome},</p>
                        <p>Durante a auditoria dos chamados, identificamos inconsistências nos registros abaixo, sob sua responsabilidade.</p>
                        <p>Solicitamos a regularização conforme a orientação indicada em cada item, o mais breve possível.</p>
                        <p>Em caso de dúvidas, entre em contato com a equipe de <strong>Qualidade</strong>.</p>
                        <p>Após a conclusão, confirme a realização dos ajustes.</p>
                        <p>Atenciosamente.</p>
                      </div>

                      {/* Seções por tipo de inconsistência */}
                      <div className="p-4 bg-gray-50 border-t space-y-4">
                        {gruposPorTipo.map(([tipo, itensDoTipo]) => {
                          const cor = TIPO_INCONSISTENCIA_COR_EMAIL_HEX[tipo];
                          let acaoCorrecao: React.ReactNode;
                          if (tipo === 'ic_999999') {
                            const empresasUnicas = Array.from(new Set(itensDoTipo.map(item => item.empresa).filter((e): e is string => !!e)));
                            const infos = empresasUnicas.map(empresa => ({ empresa, emailGestor: obterEmailGestorEmpresa(empresa) }));
                            const detalhe = montarTextoGestorIC999999(agruparGestoresIC999999(infos));
                            acaoCorrecao = `Substituir o IC 999999 pelo IC correspondente ao cliente atendido. Caso o IC não esteja vigente, solicitar ao Customer Success responsável a criação do IC correto para o cliente (${detalhe}) e, após a criação, atualizar o chamado.`;
                          } else {
                            acaoCorrecao = ACAO_CORRECAO_TEXTO[tipo];
                          }

                          return (
                            <div key={tipo}>
                              <div className="flex items-center justify-between px-4 py-2 rounded-t" style={{ backgroundColor: cor.bg, color: cor.text }}>
                                <span className="font-semibold text-sm">{TIPO_INCONSISTENCIA_LABELS[tipo]}</span>
                                <span className="text-xs">{itensDoTipo.length} item{itensDoTipo.length > 1 ? 's' : ''}</span>
                              </div>
                              <div className="overflow-x-auto">
                                <table className="w-full text-sm border border-gray-200 bg-white">
                                  <thead>
                                    <tr className="bg-gray-100">
                                      {colunasEmailPorTipo(tipo).map(col => (
                                        <th key={col.chave} className="px-3 py-2 text-center text-xs font-semibold text-gray-700 border-b-2 border-gray-200">{col.titulo}</th>
                                      ))}
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {itensDoTipo.map((item) => {
                                      const contexto = {
                                        empresa: encontrarEmpresaCadastrada(item.empresa, empresasCadastradas || [])?.nome_abreviado || item.empresa || '-',
                                        analista: envelope.analista,
                                      };
                                      return (
                                        <tr key={item.id} className="border-b border-gray-100">
                                          {colunasEmailPorTipo(tipo).map(col => (
                                            <td key={col.chave} className={`px-3 py-2 text-xs text-center ${col.destaque ? 'text-blue-600 font-medium' : 'text-gray-700'}`}>
                                              {valorColunaEmail(col.chave, item, contexto)}
                                            </td>
                                          ))}
                                        </tr>
                                      );
                                    })}
                                    <tr className="border-b border-gray-100">
                                      <td colSpan={colunasEmailPorTipo(tipo).length} className="px-3 py-2 text-xs text-gray-700 bg-white">
                                        <strong>Ação:</strong> {acaoCorrecao}
                                      </td>
                                    </tr>
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <DialogFooter className="pt-6 border-t">
            <Button type="button" variant="outline" onClick={() => setShowEmailModal(false)}>{t('common.cancel')}</Button>
            <Button
              type="button"
              onClick={handleEnviarEmail}
              disabled={enviandoEmail || emailEnvelopes.every(e => !e.destinatario.trim())}
              className="bg-sonda-blue hover:bg-sonda-dark-blue"
            >
              <Send className="h-4 w-4 mr-2" />{enviandoEmail ? t('inconsistencias.sending') : t('inconsistencias.sendEmail')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
