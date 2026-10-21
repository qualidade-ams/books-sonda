// Protótipo da tela nova de Empresas (Especificação v2.0, seções 5.3 e 5.4; Inventário, seção 5),
// na direção visual aprovada por enquanto no Controle (15/10/2026): menu em pílula, faixa escura com
// a foto de marca, indicadores flutuantes e cartões compactos.
//
// Chave do protótipo "Transição | Após a virada":
//  - Transição (Fase 3 a 5): a identidade da empresa (nomes, status, vigência, soluções, contatos e
//    Book) continua sendo editada na tela atual e chega aqui sincronizada, só para leitura. Aqui se
//    editam as organizações do Aranda, o ramo, o contrato FISCAL e os bancos de horas.
//  - Após a virada (Fase 6): esta passa a ser a tela oficial e edita tudo.
// Dados fictícios (mocks/empresas.ts). Sem Supabase.
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  AlertTriangle,
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Building2,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CircleSlash,
  ClipboardPen,
  Copy,
  Download,
  ExternalLink,
  Eye,
  Filter,
  FolderKanban,
  Search,
  History,
  Paperclip,
  MoreHorizontal,
  Pencil,
  Plus,
  Star,
  Upload,
  X,
  XCircle,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { SegmentedTabs } from '@/components/ds/SegmentedTabs';
import { DataTable, type ColunaTabela } from '@/components/ds/DataTable';
import { StatusBadge } from '@/components/ds/StatusBadge';
import { EmptyState } from '@/components/ds/EmptyState';
import { Callout } from '@/components/ds/Callout';
import { Button, buttonVariants } from '@/components/ds/Button';
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Select } from '@/components/ds/Select';
import { Card } from '@/components/ds/Card';
import { ConfirmDialog } from '@/components/ds/ConfirmDialog';
import { cn } from '@/lib/utils';
import type { PrototipoProps } from '@/utils/prototipos';
import { atraso } from './compartilhado/visual';
import { FaixaTopo, PaginaV2, botaoPrimarioTopo, botaoVidro } from './compartilhado/shell';
import { BotaoLimparFiltros, FiltroAlternar, FiltroMultiplo } from './compartilhado/filtros';
import { Paginacao } from './compartilhado/paginacao';
import { DicasContext } from './compartilhado/dicas';
import { campo } from './compartilhado/estilos';
import {
  Ajuda,
  BarraRodape,
  CampoHoras,
  CampoNumero,
  CampoTexto,
  ChaveCompacta,
  ChavePrototipo,
  Chip,
  Escolha,
  IconeComDica,
  Indicador,
  InfoDica,
  Interruptor,
  Rotulo,
  Secao,
  TelaEdicao,
  ValorCopiavel,
} from './compartilhado/formulario';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  BANCOS_ALFA_MOCK,
  BOOK_ALFA_MOCK,
  CONTATOS_ALFA_MOCK,
  CONTRATO_FISCAL_ALFA_MOCK,
  comPadraoFiscal,
  EMPRESAS_LISTA_MOCK,
  GRUPOS_EMPRESARIAIS_MOCK,
  GRUPOS_RESPONSAVEIS_MOCK,
  LIMITE_ANEXOS,
  HISTORICO_BASELINE_MOCK,
  IDENTIDADE_ALFA_MOCK,
  ORGANIZACOES_ALFA_MOCK,
  ORGANIZACOES_DE_OUTRAS_MOCK,
  RAMOS_MOCK,
  TEMPLATES_BOOK_MOCK,
  TOTAIS_EMPRESAS_MOCK,
  type AnexoMock,
  type BancoCadastroMock,
  type BookMock,
  type IdentidadeMock,
  type TipoBookMock,
  type ContatoMock,
  type ContratoFiscalMock,
  type EmpresaListaMock,
  type ModeloCalculo,
  type SolucaoCodigo,
} from './mocks/empresas';
import {
  MODULOS_MOCK,
  PRODUTOS_MOCK,
  SOLUCOES_MOCK,
  nomeModulo,
  nomeProduto,
} from './mocks/catalogo';

type Modo = 'transicao' | 'virada';
/** Edição (true) ou só visualização (false) em cada tela de permissão */
type Permissoes = { empresa: boolean; bancos: boolean };
type SimNao = 'sim' | 'nao';

/* ------------------------------------------------------------------ */
/* Peças de formulário (exploratórias; viram componentes ds/ depois)   */
/* ------------------------------------------------------------------ */

/**
 * Para que serve cada campo, pelo rótulo exibido. Textos a partir das descrições do Inventário
 * (seção 5) e da Especificação v2.0. Todo rótulo de campo do protótipo precisa ter entrada aqui.
 */
const DICAS: Record<string, string> = {
  // Identidade
  'Nome completo': 'Razão social da empresa, em maiúsculas.',
  'Nome abreviado': 'Nome curto, usado no assunto dos e-mails e em todas as listas e ordenações.',
  'Tem AMS':
    'Se a empresa tem contrato AMS em pelo menos uma solução. Habilita o Book e os bancos de horas.',
  AMS: 'Soluções com contrato AMS. Habilitam o Book e os bancos de horas.',
  'Em projeto':
    'Soluções em fase de projeto ou implantação, cada uma com uma breve justificativa. É só informativo: aparece como ícone na lista, com as soluções e as justificativas na dica.',
  'Vigência inicial':
    'Início do contrato. O Book só é disparado a partir deste mês; sem data, a empresa fica fora do disparo.',
  'Vigência final':
    'Fim do contrato. Ao vencer, a empresa é inativada automaticamente e gera o alerta de vencimento.',
  'Vigência do contrato':
    'Início e fim do contrato. Controlam o disparo do Book e a inativação automática no vencimento.',
  'Soluções contratadas':
    'Soluções do contrato (COMEX, FISCAIS, FINANCEIRAS) e, em cada uma, se tem AMS e se está em projeto (com a justificativa). Só os produtos de soluções com AMS podem entrar no escopo dos bancos; FISCAIS habilita o Contrato FISCAL.',
  'E-mail do Customer Success':
    'Vai em cópia em todos os Books e identifica o Customer Success no organograma do Book.',
  'E-mail do Comercial': 'Identifica o comercial no organograma do Book.',
  'E-mail do T&M': 'Identifica o responsável T&M no organograma do Book.',
  'Grupos de responsáveis':
    'Os e-mails dos grupos marcados vão em cópia em todo disparo do Book. Os grupos são mantidos em Cadastros › Grupos de Responsáveis.',
  Observação:
    'Anotação livre sobre a empresa, até 500 caracteres. Aparece no ícone ao lado do nome na lista.',
  Anexos:
    'Arquivos permanentes da empresa. Vão no disparo do Book quando a opção Anexo está ligada na aba Book.',
  // Informações
  'ID da empresa no Aranda':
    'Código da empresa no Aranda. Opcional e preenchido à mão por enquanto; ainda não é usado no cálculo.',
  'Nomes das organizações':
    'Nomes exatamente como aparecem no Aranda. É por eles que os apontamentos e tickets são ligados à empresa. Um nome pertence a uma única empresa.',
  'Grupo empresarial':
    'Nome do grupo econômico ao qual a empresa pertence, para reunir as empresas do mesmo grupo. Opcional; ao digitar, sugere os grupos já usados para não repetir com outra grafia.',
  'Ramo de atividade': 'Segmento do cliente, da lista mantida em Cadastros › Ramos de Atividade.',
  'Ramo secundário':
    'Segundo segmento em que o cliente atua, quando houver. Opcional, da mesma lista do ramo de atividade.',
  'Descrição da atividade':
    'Texto livre sobre o que o cliente faz, para complementar os ramos. Opcional, até 500 caracteres.',
  Modalidade:
    'Forma de entrega do FISCAL contratada. On Premise mostra também DBA e Banco de dados. Padrão: On Premise.',
  'e-DOCS 24x7':
    'Se o contrato inclui o e-DOCS em regime 24x7 (todos os dias, o dia todo). Padrão: Não.',
  'Atualização contratada':
    'Se o contrato inclui atualizações do FISCAL. Com Sim, informe quantas por ano. Padrão: Não.',
  'Atualizações por ano':
    'Quantidade de atualizações contratadas por ano. Número inteiro maior que zero.',
  DBA: 'Serviço de DBA contratado para o banco de dados do cliente. Padrão: Não contratado.',
  'Horas de atendimento': 'Horas de DBA contratadas por mês para atendimento, no formato HH:MM.',
  'Horas de monitoramento':
    'Horas de DBA contratadas por mês para monitoramento, no formato HH:MM.',
  'Banco de dados': 'Banco de dados em que o FISCAL do cliente roda. Padrão: SQL Server.',
  // Book
  'Tipo de Book':
    'Só o tipo Qualidade gera e dispara o Book. "Não tem Book" apaga o template e o link do SharePoint.',
  'Template padrão':
    'Modelo de e-mail do Book (português, inglês ou um template cadastrado). Também define o idioma do Saldo Parcial e do Banco de Horas.',
  'Link SharePoint': 'Pasta do cliente no SharePoint. Obrigatória quando a empresa tem Book.',
  'Book personalizado':
    'Book com template próprio. A empresa vai para Disparos Personalizados em vez do Controle de Disparos.',
  Anexo: 'Envia os anexos da empresa, cadastrados na Identidade, junto com o Book.',
  'Empresa consolidadora':
    'O Book desta empresa vai junto com o da consolidadora, e esta empresa some das telas de disparo.',
  'Meta de SLA (%)': 'Meta de SLA exibida e avaliada no Book, de 0 a 100.',
  'Mínimo de chamados para o SLA': 'Quantidade mínima de chamados no mês para o SLA ser avaliado.',
  // Banco de horas
  Nome: 'Aparece para o cliente no Book e no Saldo Parcial. Não pode repetir dentro da empresa.',
  Descrição: 'Anotação interna; não aparece para o cliente.',
  Ativo:
    'Banco inativo deixa de receber horas a partir do próximo mês aberto; elas vão para o Banco padrão.',
  'Tipo de contrato': 'O que o banco controla: horas, tickets ou os dois.',
  'Período de apuração':
    'Ciclo do banco, em meses. No fim de cada período o saldo é apurado e o que passar do contratado vira excedente.',
  'Início da vigência':
    'Mês em que o banco começa a valer; define o início dos ciclos. Não pode ser anterior ao início do contrato da empresa.',
  'Fim da vigência':
    'Último mês em que o banco vale. Opcional: sem data, vale por tempo indeterminado. Não pode ser anterior ao início da vigência.',
  'Regras banco de horas/ticket':
    'Como o saldo do banco é formado: horas ou tickets contratados por mês (baseline) e quanto do saldo passa para o mês seguinte (repasse).',
  'Dia de início da apuração':
    'Dia do mês em que a apuração começa (1 a 28). Ex.: 15 para apurar de 15 a 14. O Book só é liberado a partir desse dia.',
  'Dia de fim da apuração': 'Dia do mês em que a apuração termina (0 a 28). 0 = último dia do mês.',
  Baseline:
    'Quantidade contratada por mês, em horas ou tickets. Cada mudança cria uma vigência nova e o histórico fica guardado.',
  Repasse:
    'Percentual do saldo que passa de um mês para o seguinte. Cada mudança cria uma vigência nova e o histórico fica guardado.',
  'Repasse por período':
    'Divide a apuração em períodos com dois percentuais: o repasse entre meses do mesmo período e o repasse na virada de um período para o outro.',
  'Meses por período': 'Duração de cada período, em meses (ex.: 3 = trimestral).',
  'Períodos até zerar':
    'Quantos períodos até o saldo zerar. Duração × períodos precisa ser igual ao período de apuração.',
  '% dentro do período': 'Repasse entre meses do mesmo período.',
  '% entre períodos': 'Repasse na virada de um período para o outro.',
  'Taxa do cliente':
    'Qual taxa cadastrada do cliente usar no valor do excedente: a do Gallery ou a dos demais produtos.',
  'Tipo de hora':
    'Se o excedente é cobrado pelo valor da hora excedente ou da hora normal da taxa.',
  Escopo:
    'Produtos e módulos cujas horas caem neste banco. Um módulo pertence a um só banco; o que ficar sem banco vai para o Banco padrão.',
  'Item de configuração':
    'Filtro opcional: só entram no banco os apontamentos cujo item de configuração contém ou é igual ao valor informado.',
  Valor: 'Texto comparado com o item de configuração do apontamento.',
  'Ao zerar, consumir saldo dos outros bancos':
    'No fechamento do período, cobre o saldo negativo com o saldo positivo de outros bancos da empresa (mesmo tipo de contrato e mesma apuração) antes de gerar excedente.',
};

/**
 * Transição (Fases 3 a 5): a identidade, os contatos e o Book são mantidos na tela atual e chegam
 * aqui pela sincronização automática a cada gravação (Especificação, seção 7.3). O atalho abre a
 * empresa na tela atual; a alteração aparece aqui assim que for gravada lá.
 */
function EditarNaTelaAtual() {
  return (
    <a
      href="#"
      onClick={(e) => e.preventDefault()}
      title="Até a virada, estes dados são mantidos na tela atual e sincronizados para esta"
      className="inline-flex h-8 items-center gap-1.5 rounded-lg px-2 text-xs font-medium text-ds-fg-accent transition hover:bg-ds-accent-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-focus"
    >
      <ExternalLink className="h-3.5 w-3.5" /> Editar na tela atual
    </a>
  );
}

/** Selo em vidro, para o hero escuro */
function SeloTopo({
  tom,
  children,
}: {
  tom: 'success' | 'warning' | 'info' | 'neutral';
  children: ReactNode;
}) {
  const cores = {
    success: 'border-[#4CC77A]/35 bg-[#4CC77A]/10 text-[#4CC77A]',
    warning: 'border-[#F0A43A]/35 bg-[#F0A43A]/10 text-[#F0A43A]',
    info: 'border-[#00D4E8]/35 bg-[#00D4E8]/10 text-[#00D4E8]',
    neutral: 'border-white/20 bg-white/[0.06] text-white/80',
  }[tom];
  return (
    <span
      className={cn(
        'inline-flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-xs font-medium',
        cores
      )}
    >
      {children}
    </span>
  );
}

/**
 * Situação na primeira coluna: verde = ativa; amarela = ativa com informações pendentes (RN-35);
 * vermelha = inativa. A dica e o rótulo acessível dizem a situação em texto.
 */
function BolinhaSituacao({ empresa }: { empresa: EmpresaListaMock }) {
  const situacao =
    empresa.status === 'inativo'
      ? { dica: 'Inativa', fundo: 'var(--ds-danger-fg)' }
      : empresa.pendente
        ? {
            dica: 'Ativa, com informações pendentes',
            fundo: 'var(--ds-warning-fg)',
          }
        : { dica: 'Ativa', fundo: 'var(--ds-success-fg)' };
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          role="img"
          tabIndex={0}
          aria-label={situacao.dica}
          className="grid h-5 w-2.5 shrink-0 place-items-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-focus"
        >
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: situacao.fundo }} />
        </span>
      </TooltipTrigger>
      <TooltipContent
        data-ds="v2"
        className="border-ds-border bg-ds-bg-raised font-ds-sans text-xs text-ds-fg"
      >
        {situacao.dica}
      </TooltipContent>
    </Tooltip>
  );
}

/** "Sim"/"Não" na lista; ao passar o mouse ou focar, diz em quais soluções há AMS */
function AmsDaEmpresa({ empresa }: { empresa: EmpresaListaMock }) {
  if (!empresa.solucoesAms.length) return <span className="text-ds-fg-muted">Não</span>;
  const sem = empresa.solucoes.filter((p) => !empresa.solucoesAms.includes(p));
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          tabIndex={0}
          className="cursor-help underline decoration-ds-border-strong decoration-dotted underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-focus"
        >
          Sim
        </span>
      </TooltipTrigger>
      <TooltipContent
        data-ds="v2"
        className="border-ds-border bg-ds-bg-raised font-ds-sans text-xs leading-5 text-ds-fg"
      >
        <p>AMS em {empresa.solucoesAms.join(', ')}</p>
        {sem.length > 0 && <p className="text-ds-fg-muted">Sem AMS: {sem.join(', ')}</p>}
      </TooltipContent>
    </Tooltip>
  );
}

/** Ícone pequeno ao lado do nome, com dica ao passar o mouse ou focar */
/**
 * Mostra o nome do responsável; o clique copia o e-mail (sem abrir a empresa).
 * Sem cadastro de usuário para o e-mail, mostra o próprio e-mail.
 */
function NomeCopiaEmail({ nome, email }: { nome: string; email: string }) {
  const [copiado, setCopiado] = useState(false);
  useEffect(() => {
    if (!copiado) return;
    const t = setTimeout(() => setCopiado(false), 1500);
    return () => clearTimeout(t);
  }, [copiado]);

  if (!email) return vazio;
  const copiar = (e: { stopPropagation: () => void }) => {
    e.stopPropagation();
    navigator.clipboard?.writeText(email).catch(() => undefined);
    setCopiado(true);
  };
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={copiar}
          onKeyDown={(e) => e.stopPropagation()}
          aria-label={`${nome || email}: copiar e-mail ${email}`}
          className="group inline-flex max-w-[14rem] items-center gap-1.5 rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-focus"
        >
          <span className="truncate">{nome || email}</span>
          {copiado ? (
            <Check className="h-3.5 w-3.5 shrink-0 text-ds-success-fg" />
          ) : (
            <Copy className="h-3.5 w-3.5 shrink-0 text-ds-fg-muted opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100" />
          )}
        </button>
      </TooltipTrigger>
      <TooltipContent
        data-ds="v2"
        className="border-ds-border bg-ds-bg-raised font-ds-sans text-xs text-ds-fg"
      >
        {copiado ? 'E-mail copiado' : `${email} · clique para copiar`}
      </TooltipContent>
    </Tooltip>
  );
}

const PERIODOS: Record<number, string> = {
  1: 'Mensal',
  2: 'Bimestral',
  3: 'Trimestral',
  4: 'Quadrimestral',
  6: 'Semestral',
  12: 'Anual',
};
const periodoTexto = (n: number) => PERIODOS[n] ?? `${n} meses`;

/* ------------------------------------------------------------------ */
/* Lista                                                               */
/* ------------------------------------------------------------------ */

/**
 * Menu "⋯" da linha (só para quem edita). Na transição a identidade, inclusive o status, é mantida
 * na tela atual, então as duas ações abrem a empresa lá. Não há exclusão: a tela nova só inativa.
 */
function MenuLinha({
  empresa,
  modo,
  onEditar,
  onAlterarStatus,
}: {
  empresa: EmpresaListaMock;
  modo: Modo;
  onEditar: () => void;
  onAlterarStatus: () => void;
}) {
  const ativa = empresa.status === 'ativo';
  const naTelaAtual = modo === 'transicao';
  const item =
    'flex h-10 cursor-pointer items-center gap-2.5 rounded-md px-2.5 text-sm outline-none transition focus:bg-ds-bg-subtle md:h-9';
  return (
    // O menu fica dentro da linha clicável: o clique nele não pode abrir a empresa
    <div
      className="flex justify-end"
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            tamanho="icone"
            variante="fantasma"
            aria-label={`Ações de ${empresa.nomeAbreviado}`}
          >
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          data-ds="v2"
          align="end"
          className="min-w-52 border-ds-border bg-ds-bg-raised p-1 font-ds-sans text-ds-fg"
        >
          <DropdownMenuItem className={item} onSelect={naTelaAtual ? undefined : onEditar}>
            {naTelaAtual ? <ExternalLink className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
            {naTelaAtual ? 'Editar na tela atual' : 'Editar'}
          </DropdownMenuItem>
          <DropdownMenuItem
            className={cn(item, ativa && 'text-ds-danger-fg focus:bg-ds-danger-bg')}
            onSelect={naTelaAtual ? undefined : onAlterarStatus}
          >
            {naTelaAtual ? (
              <ExternalLink className="h-4 w-4" />
            ) : ativa ? (
              <XCircle className="h-4 w-4" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            {`${ativa ? 'Inativar' : 'Reativar'}${naTelaAtual ? ' na tela atual' : ''}`}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function Lista({
  estado,
  modo,
  podeEditar,
  onAbrir,
  onEditar,
}: {
  estado: PrototipoProps['estado'];
  modo: Modo;
  podeEditar: boolean;
  onAbrir: (id: string) => void;
  /** Abre a empresa já com o painel de edição da identidade */
  onEditar: (id: string) => void;
}) {
  const [busca, setBusca] = useState('');
  const [status, setStatus] = useState<EmpresaListaMock['status'][]>([]);
  const [alterarStatus, setAlterarStatus] = useState<EmpresaListaMock | null>(null);
  // Só ilustrativo: as linhas fictícias são as mesmas em qualquer página
  const [pagina, setPagina] = useState(1);
  const [porPagina, setPorPagina] = useState(50);
  const [produto, setProduto] = useState<SolucaoCodigo[]>([]);
  const [modelo, setModelo] = useState<ModeloCalculo[]>([]);
  const [temAms, setTemAms] = useState<SimNao[]>([]);
  const [emProjeto, setEmProjeto] = useState<SimNao[]>([]);
  const [soPendentes, setSoPendentes] = useState(false);
  const [filtrosAbertos, setFiltrosAbertos] = useState(false);

  const casaSimNao = (filtro: SimNao[], valor: boolean) =>
    !filtro.length || filtro.includes(valor ? 'sim' : 'nao');

  // Seleção múltipla: dentro de um filtro vale qualquer opção marcada; entre filtros, todos
  const filtradas = useMemo(
    () =>
      EMPRESAS_LISTA_MOCK.filter(
        (e) =>
          (!busca ||
            `${e.nomeAbreviado} ${e.nomeCompleto}`.toLowerCase().includes(busca.toLowerCase())) &&
          (!status.length || status.includes(e.status)) &&
          (!produto.length || e.solucoes.some((p) => produto.includes(p))) &&
          casaSimNao(temAms, e.temAms) &&
          casaSimNao(emProjeto, e.emProjeto) &&
          (!modelo.length || modelo.includes(e.modelo)) &&
          (!soPendentes || e.pendente)
      ),
    [busca, status, produto, temAms, emProjeto, modelo, soPendentes]
  );
  const filtrosAtivos =
    [status, produto, temAms, emProjeto, modelo].filter((f) => f.length).length +
    (soPendentes ? 1 : 0);
  const limpar = () => {
    setBusca('');
    setStatus([]);
    setProduto([]);
    setTemAms([]);
    setEmProjeto([]);
    setModelo([]);
    setSoPendentes(false);
  };
  const linhas = estado === 'vazio' ? [] : filtradas;

  const colunas: ColunaTabela<EmpresaListaMock>[] = [
    {
      id: 'empresa',
      cabecalho: 'Empresa',
      mobile: 'titulo',
      celula: (e) => (
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 font-semibold">
            <BolinhaSituacao empresa={e} />
            {e.nomeAbreviado}
            {e.emProjeto && (
              <IconeComDica
                rotulo="Em projeto"
                dica={Object.entries(e.projetos)
                  .map(([p, justificativa]) => `${p}: ${justificativa}`)
                  .join(' · ')}
              >
                <FolderKanban className="h-3.5 w-3.5" />
              </IconeComDica>
            )}
            {e.observacao && (
              <IconeComDica dica={e.observacao} rotulo="Observação">
                <ClipboardPen className="h-3.5 w-3.5" />
              </IconeComDica>
            )}
          </p>
          <p className="max-w-[18rem] truncate pl-4 text-xs text-ds-fg-muted">{e.nomeCompleto}</p>
        </div>
      ),
    },
    {
      id: 'produtos',
      cabecalho: 'Soluções',
      celula: (e) => (
        <div className="flex gap-1">
          {e.solucoes.map((p) => (
            <Chip key={p}>{p}</Chip>
          ))}
        </div>
      ),
    },
    {
      id: 'ams',
      cabecalho: 'AMS',
      celula: (e) => <AmsDaEmpresa empresa={e} />,
    },
    {
      id: 'email-cs',
      cabecalho: 'Customer Success',
      celula: (e) => <NomeCopiaEmail nome={e.nomeCs} email={e.emailCs} />,
    },
    {
      id: 'email-comercial',
      cabecalho: 'Comercial',
      celula: (e) => <NomeCopiaEmail nome={e.nomeComercial} email={e.emailComercial} />,
    },
    {
      id: 'abrir',
      cabecalho: '',
      mobile: podeEditar ? 'acoes' : 'oculta',
      celula: (e) =>
        podeEditar ? (
          <MenuLinha
            empresa={e}
            modo={modo}
            onEditar={() => onEditar(e.id)}
            onAlterarStatus={() => setAlterarStatus(e)}
          />
        ) : (
          <ChevronRight className="ml-auto h-4 w-4 text-ds-fg-muted" aria-hidden />
        ),
    },
  ];

  return (
    <>
      <FaixaTopo>
        <div className="pb-24 pt-3 md:pb-28 md:pt-4">
          <div className="ds-surgir max-w-2xl">
            <h1 className="font-ds-title text-[26px] font-semibold leading-8 tracking-tight md:text-[34px] md:leading-[42px]">
              <span className="bg-gradient-to-r from-[#00D4E8] to-[#7CEBF5] bg-clip-text text-transparent">
                Empresas
              </span>
            </h1>
            <p className="mt-1.5 text-sm text-[#B1B1B1] md:text-[15px]">
              Clientes, organizações do Aranda e bancos de horas.
            </p>
          </div>
          <div className="ds-surgir mt-5 flex flex-wrap gap-2" style={atraso(100)}>
            {podeEditar && modo === 'virada' && (
              <button type="button" className={botaoVidro}>
                <Upload className="h-4 w-4" /> Importar
              </button>
            )}
            <button type="button" className={botaoVidro}>
              <Download className="h-4 w-4" /> Exportar
            </button>
            {podeEditar &&
              (modo === 'virada' ? (
                <button type="button" className={botaoPrimarioTopo}>
                  <Plus className="h-4 w-4" /> Nova empresa
                </button>
              ) : (
                <button type="button" className={botaoVidro}>
                  <ExternalLink className="h-4 w-4" /> Nova empresa na tela atual
                </button>
              ))}
          </div>
        </div>
      </FaixaTopo>

      <div className="relative -mt-16 grid grid-cols-2 gap-3 md:-mt-20 lg:grid-cols-4">
        <Indicador rotulo="Empresas" valor={TOTAIS_EMPRESAS_MOCK.total} icone={<Building2 />} />
        <Indicador
          rotulo="Ativas"
          valor={TOTAIS_EMPRESAS_MOCK.ativas}
          icone={<CheckCircle2 />}
          tom="success"
          atrasoMs={60}
        />
        <Indicador
          rotulo="Inativas"
          valor={TOTAIS_EMPRESAS_MOCK.inativas}
          icone={<CircleSlash />}
          atrasoMs={120}
        />
        <Indicador
          rotulo="Informações pendentes"
          valor={TOTAIS_EMPRESAS_MOCK.pendentes}
          icone={<AlertTriangle />}
          tom="warning"
          atrasoMs={180}
          selecionado={soPendentes}
          onClick={() => setSoPendentes((v) => !v)}
        />
      </div>

      <section
        className="ds-surgir mt-6 overflow-hidden rounded-xl border border-ds-border bg-ds-bg-surface"
        style={atraso(240)}
      >
        <div className="border-b border-ds-border p-3 md:p-4">
          {/* Filtro à esquerda; os filtros abrem na mesma linha, depois da busca */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setFiltrosAbertos((v) => !v)}
              aria-expanded={filtrosAbertos}
              aria-controls="filtros-empresas"
              aria-label={filtrosAtivos ? `Filtros (${filtrosAtivos} ativos)` : 'Filtros'}
              title="Filtros"
              className={cn(
                'relative grid h-11 w-11 shrink-0 place-items-center rounded-lg border transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-focus md:h-9 md:w-9',
                filtrosAbertos || filtrosAtivos
                  ? 'border-[#00D4E8] bg-ds-accent-subtle text-ds-fg-accent'
                  : 'border-ds-border-strong bg-ds-bg-surface text-ds-fg-secondary hover:text-ds-fg'
              )}
            >
              <Filter className="h-4 w-4" />
              {filtrosAtivos > 0 && (
                <span className="absolute -right-1.5 -top-1.5 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-ds-accent px-1 text-[11px] font-semibold text-ds-fg-on-accent tabular-nums">
                  {filtrosAtivos}
                </span>
              )}
            </button>
            {(filtrosAtivos > 0 || busca) && <BotaoLimparFiltros onClick={limpar} />}
            <label className="relative block min-w-0 flex-1 md:w-72 md:flex-none">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ds-fg-muted"
                aria-hidden
              />
              <input
                type="search"
                aria-label="Buscar por nome"
                placeholder="Buscar por nome"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className={cn(campo, 'pl-9')}
              />
            </label>
            {filtrosAbertos && (
              <div
                id="filtros-empresas"
                className="ds-surgir flex w-full flex-wrap gap-2 md:w-auto [&>*]:flex-1 sm:[&>*]:flex-none"
              >
                <FiltroMultiplo
                  rotulo="Status"
                  opcoes={[
                    { valor: 'ativo', rotulo: 'Ativas' },
                    { valor: 'inativo', rotulo: 'Inativas' },
                  ]}
                  selecionados={status}
                  onChange={setStatus}
                />
                <FiltroMultiplo
                  rotulo="Solução"
                  opcoes={SOLUCOES.map((x) => ({ valor: x, rotulo: x }))}
                  selecionados={produto}
                  onChange={setProduto}
                />
                <FiltroMultiplo
                  rotulo="Tem AMS"
                  opcoes={[
                    { valor: 'sim', rotulo: 'Sim' },
                    { valor: 'nao', rotulo: 'Não' },
                  ]}
                  selecionados={temAms}
                  onChange={setTemAms}
                />
                <FiltroMultiplo
                  rotulo="Em projeto"
                  opcoes={[
                    { valor: 'sim', rotulo: 'Sim' },
                    { valor: 'nao', rotulo: 'Não' },
                  ]}
                  selecionados={emProjeto}
                  onChange={setEmProjeto}
                />
                <FiltroMultiplo
                  rotulo="Modelo de cálculo"
                  opcoes={[
                    { valor: 'legado', rotulo: 'Legado' },
                    { valor: 'multiplo', rotulo: 'Bancos múltiplos' },
                    { valor: 'liberada', rotulo: 'Liberadas' },
                  ]}
                  selecionados={modelo}
                  onChange={setModelo}
                />
                <FiltroAlternar
                  rotulo="Só pendentes"
                  ativo={soPendentes}
                  onChange={setSoPendentes}
                />
              </div>
            )}
          </div>
        </div>

        {estado === 'erro' ? (
          <div className="space-y-3 p-4">
            <Callout tom="danger" titulo="Não foi possível carregar as empresas">
              Verifique a conexão e tente novamente.
            </Callout>
            <Button>Tentar novamente</Button>
          </div>
        ) : (
          <DataTable
            rotulo="Empresas"
            colunas={colunas}
            linhas={linhas}
            chaveLinha={(e) => e.id}
            carregando={estado === 'carregando'}
            onLinhaClick={(e) => onAbrir(e.id)}
            vazio={
              <EmptyState
                icone={<Building2 />}
                titulo="Nenhuma empresa encontrada"
                descricao={
                  filtrosAtivos || busca ? 'Nenhuma empresa atende aos filtros.' : undefined
                }
                acao={
                  filtrosAtivos || busca ? (
                    <Button onClick={limpar}>Limpar filtros</Button>
                  ) : undefined
                }
              />
            }
          />
        )}

        {estado === 'dados' && linhas.length > 0 && (
          <Paginacao
            total={TOTAIS_EMPRESAS_MOCK.total}
            pagina={pagina}
            porPagina={porPagina}
            onPagina={setPagina}
            onPorPagina={setPorPagina}
          />
        )}
      </section>

      <ConfirmDialog
        aberto={!!alterarStatus}
        onOpenChange={(v) => !v && setAlterarStatus(null)}
        titulo={`${alterarStatus?.status === 'ativo' ? 'Inativar' : 'Reativar'} ${alterarStatus?.nomeAbreviado ?? ''}?`}
        consequencias={
          alterarStatus?.status === 'ativo'
            ? [
                'Ela sai dos books e do cálculo dos bancos a partir do próximo mês aberto',
                'Histórico, meses fechados e faturamento continuam guardados',
                'Pode ser reativada depois',
              ]
            : ['Ela volta para os books e para o cálculo dos bancos a partir do próximo mês aberto']
        }
        rotuloConfirmar={alterarStatus?.status === 'ativo' ? 'Inativar' : 'Reativar'}
        tom={alterarStatus?.status === 'ativo' ? 'perigo' : 'padrao'}
        justificativa={{ rotulo: 'Motivo', placeholder: 'Ex.: fim do contrato' }}
        onConfirmar={() => setAlterarStatus(null)}
      />
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Detalhe: identidade                                                  */
/* ------------------------------------------------------------------ */

const dataBr = (iso: string) => (iso ? iso.split('-').reverse().join('/') : '');
const simNaoTexto = (v: boolean) => (v ? 'Sim' : 'Não');
const vazio = <span className="text-ds-fg-muted">—</span>;
const EMAIL_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Rótulo e valor empilhados, com o "i" do rótulo */
function ItemIdentidade({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="flex items-center gap-1 text-xs text-ds-fg-muted">
        {rotulo}
        {DICAS[rotulo] && <InfoDica texto={DICAS[rotulo]} assunto={rotulo} />}
      </dt>
      <dd className="mt-0.5 break-words text-sm text-ds-fg">{children}</dd>
    </div>
  );
}

/** Um bloco da identidade: título curto e os campos um abaixo do outro */
function GrupoIdentidade({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <div className="min-w-0 xl:px-6 xl:first:pl-0 xl:last:pr-0">
      <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.06em] text-ds-fg-secondary">
        {titulo}
      </h3>
      <dl className="space-y-3">{children}</dl>
    </div>
  );
}

function Identidade({
  modo,
  podeEditar,
  dados,
  onEditar,
  onEditarAms,
}: {
  modo: Modo;
  podeEditar: boolean;
  dados: IdentidadeMock;
  onEditar: () => void;
  /** Transição: AMS e Em projeto por solução já são editados aqui */
  onEditarAms: () => void;
}) {
  return (
    <section
      className="ds-surgir relative -mt-16 rounded-xl border border-ds-border bg-ds-bg-surface p-4 shadow-[0_8px_24px_-12px_rgba(0,0,0,0.2)] md:-mt-20 md:p-5"
      aria-labelledby="titulo-identidade"
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2
          id="titulo-identidade"
          className="text-xs font-bold uppercase tracking-[0.06em] text-ds-fg"
        >
          Identidade
        </h2>
        {podeEditar &&
          (modo === 'transicao' ? (
            <div className="flex flex-wrap items-center gap-1">
              <Button tamanho="sm" variante="fantasma" onClick={onEditarAms}>
                <Pencil /> AMS e projetos
              </Button>
              <EditarNaTelaAtual />
            </div>
          ) : (
            <Button tamanho="sm" variante="fantasma" onClick={onEditar}>
              <Pencil /> Editar
            </Button>
          ))}
      </div>
      <div className="grid gap-x-6 gap-y-6 md:grid-cols-2 xl:grid-cols-4 xl:gap-x-0 xl:divide-x xl:divide-ds-border">
        <GrupoIdentidade titulo="Empresa">
          <ItemIdentidade rotulo="Nome completo">
            {dados.nomeCompleto ? (
              <ValorCopiavel valor={dados.nomeCompleto} rotulo="Nome completo" />
            ) : (
              vazio
            )}
          </ItemIdentidade>
          <ItemIdentidade rotulo="Nome abreviado">
            {dados.nomeAbreviado ? (
              <ValorCopiavel valor={dados.nomeAbreviado} rotulo="Nome abreviado" />
            ) : (
              vazio
            )}
          </ItemIdentidade>
          <ItemIdentidade rotulo="Grupo empresarial">
            {dados.grupoEmpresarial ? (
              <ValorCopiavel valor={dados.grupoEmpresarial} rotulo="Grupo empresarial" />
            ) : (
              vazio
            )}
          </ItemIdentidade>
        </GrupoIdentidade>

        <GrupoIdentidade titulo="Contrato">
          <ItemIdentidade rotulo="Vigência do contrato">
            {dados.vigenciaInicio
              ? `${dataBr(dados.vigenciaInicio)} – ${dados.vigenciaFim ? dataBr(dados.vigenciaFim) : 'sem data de fim'}`
              : vazio}
          </ItemIdentidade>
          <ItemIdentidade rotulo="Soluções contratadas">
            <ul className="mt-1 space-y-2">
              {dados.solucoes.map((p) => {
                const projeto = dados.projetos[p];
                return (
                  <li key={p}>
                    <span className="flex flex-wrap items-center gap-1.5">
                      <span className="font-medium">{p}</span>
                      {dados.solucoesAms.includes(p) ? (
                        <span className="rounded-full bg-ds-accent-subtle px-1.5 text-[11px] font-medium text-ds-fg-accent">
                          AMS
                        </span>
                      ) : (
                        <span className="text-xs text-ds-fg-muted">sem AMS</span>
                      )}
                      {projeto && (
                        // A justificativa aparece ao passar o mouse (ou focar) no selo
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span
                              tabIndex={0}
                              aria-label={`Em projeto: ${projeto}`}
                              className="inline-flex cursor-default items-center gap-1 rounded-full border border-ds-border bg-ds-bg-subtle px-1.5 text-[11px] text-ds-fg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-focus"
                            >
                              <FolderKanban className="h-3 w-3" aria-hidden /> Em projeto
                            </span>
                          </TooltipTrigger>
                          <TooltipContent
                            data-ds="v2"
                            className="max-w-xs border-ds-border bg-ds-bg-raised font-ds-sans text-xs text-ds-fg"
                          >
                            {projeto}
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </span>
                  </li>
                );
              })}
            </ul>
          </ItemIdentidade>
        </GrupoIdentidade>

        <GrupoIdentidade titulo="Responsáveis">
          <ItemIdentidade rotulo="E-mail do Customer Success">
            {dados.emailCustomerSuccess ? (
              <ValorCopiavel
                valor={dados.emailCustomerSuccess}
                rotulo="E-mail do Customer Success"
              />
            ) : (
              vazio
            )}
          </ItemIdentidade>
          <ItemIdentidade rotulo="E-mail do Comercial">
            {dados.emailComercial ? (
              <ValorCopiavel valor={dados.emailComercial} rotulo="E-mail do Comercial" />
            ) : (
              vazio
            )}
          </ItemIdentidade>
          <ItemIdentidade rotulo="E-mail do T&M">
            {dados.emailTm ? <ValorCopiavel valor={dados.emailTm} rotulo="E-mail do T&M" /> : vazio}
          </ItemIdentidade>
        </GrupoIdentidade>

        <GrupoIdentidade titulo="Observação e anexos">
          <ItemIdentidade rotulo="Observação">{dados.observacao || vazio}</ItemIdentidade>
          <ItemIdentidade rotulo="Anexos">
            {dados.anexos.length ? (
              <span className="mt-0.5 flex flex-col gap-1">
                {dados.anexos.map((a) => (
                  <a
                    key={a.id}
                    href="#"
                    onClick={(e) => e.preventDefault()}
                    className="inline-flex max-w-full items-center gap-1.5 text-ds-fg-accent hover:underline"
                  >
                    <Paperclip className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    <span className="truncate">{a.nome}</span>
                  </a>
                ))}
              </span>
            ) : (
              vazio
            )}
          </ItemIdentidade>
        </GrupoIdentidade>
      </div>
    </section>
  );
}

const SOLUCOES: SolucaoCodigo[] = ['COMEX', 'FISCAIS', 'FINANCEIRAS'];

const tamanhoTexto = (bytes: number) =>
  bytes >= 1024 * 1024
    ? `${(bytes / 1024 / 1024).toFixed(1).replace('.', ',')} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;

/** Anexos permanentes da empresa (vão no disparo do Book quando "Anexo" está ligado na aba Book) */
function EditorAnexos({
  anexos,
  onChange,
}: {
  anexos: AnexoMock[];
  onChange: (a: AnexoMock[]) => void;
}) {
  const [erro, setErro] = useState<string | null>(null);
  const cheio = anexos.length >= LIMITE_ANEXOS.quantidade;

  const adicionar = (arquivos: FileList | null) => {
    if (!arquivos) return;
    const novos: AnexoMock[] = [];
    let mensagem: string | null = null;
    Array.from(arquivos).forEach((f) => {
      if (anexos.length + novos.length >= LIMITE_ANEXOS.quantidade) {
        mensagem = `Limite de ${LIMITE_ANEXOS.quantidade} arquivos.`;
      } else if (f.size > LIMITE_ANEXOS.megabytes * 1024 * 1024) {
        mensagem = `${f.name} passa de ${LIMITE_ANEXOS.megabytes} MB.`;
      } else {
        novos.push({ id: `${f.name}-${f.size}`, nome: f.name, tamanho: tamanhoTexto(f.size) });
      }
    });
    setErro(mensagem);
    if (novos.length) onChange([...anexos, ...novos]);
  };

  return (
    <div className="space-y-3">
      {anexos.length > 0 && (
        <ul className="divide-y divide-ds-border rounded-lg border border-ds-border">
          {anexos.map((a) => (
            <li key={a.id} className="flex items-center gap-3 px-3 py-2">
              <Paperclip className="h-4 w-4 shrink-0 text-ds-fg-muted" aria-hidden />
              <span className="min-w-0 flex-1 truncate text-sm text-ds-fg">{a.nome}</span>
              <span className="shrink-0 text-xs tabular-nums text-ds-fg-muted">{a.tamanho}</span>
              <Button
                tamanho="icone"
                variante="fantasma"
                aria-label={`Remover ${a.nome}`}
                onClick={() => {
                  onChange(anexos.filter((x) => x.id !== a.id));
                  setErro(null);
                }}
                className="text-ds-fg-secondary"
              >
                <X />
              </Button>
            </li>
          ))}
        </ul>
      )}
      <label
        className={cn(
          'flex flex-col items-center gap-1 rounded-lg border border-dashed px-4 py-5 text-center transition',
          cheio
            ? 'cursor-not-allowed border-ds-border text-ds-fg-disabled'
            : 'cursor-pointer border-ds-border-strong text-ds-fg-secondary hover:border-[#00D4E8] hover:bg-ds-accent-subtle focus-within:ring-2 focus-within:ring-ds-focus'
        )}
      >
        <Upload className="h-5 w-5" aria-hidden />
        <span className="text-sm font-medium">
          {cheio ? 'Limite de arquivos atingido' : 'Escolher arquivos'}
        </span>
        <span className="text-xs text-ds-fg-muted">
          {anexos.length} de {LIMITE_ANEXOS.quantidade} · até {LIMITE_ANEXOS.megabytes} MB cada ·{' '}
          {LIMITE_ANEXOS.tipos}
        </span>
        <input
          type="file"
          multiple
          disabled={cheio}
          className="sr-only"
          onChange={(e) => {
            adicionar(e.target.files);
            e.target.value = '';
          }}
        />
      </label>
      {erro && <p className="text-xs text-ds-danger-fg">{erro}</p>}
    </div>
  );
}

const LIMITE_JUSTIFICATIVA_PROJETO = 200;

/** Caixa que pede a justificativa ao colocar uma solução em projeto (ou ao editá-la) */
function DialogoProjeto({
  produto,
  inicial,
  onFechar,
  onConfirmar,
}: {
  produto: SolucaoCodigo | null;
  inicial: string;
  onFechar: () => void;
  onConfirmar: (justificativa: string) => void;
}) {
  const [texto, setTexto] = useState(inicial);
  useEffect(() => {
    if (produto) setTexto(inicial);
  }, [produto, inicial]);
  const editando = !!inicial;

  return (
    <AlertDialog open={!!produto} onOpenChange={(v) => !v && onFechar()}>
      <AlertDialogContent
        data-ds="v2"
        className={cn(
          'border-ds-border bg-ds-bg-raised font-ds-sans text-ds-fg shadow-[var(--ds-shadow-lg)] sm:rounded-xl',
          'max-sm:bottom-0 max-sm:top-auto max-sm:translate-y-0 max-sm:rounded-t-2xl'
        )}
      >
        <AlertDialogHeader>
          <AlertDialogTitle className="text-lg font-medium text-ds-fg">
            {produto} em projeto
          </AlertDialogTitle>
          <AlertDialogDescription className="text-sm text-ds-fg-secondary">
            Explique brevemente o projeto. A justificativa aparece na dica do ícone de projeto, na
            lista de empresas.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div>
          <label htmlFor="justificativa-projeto" className="mb-1.5 block text-sm font-medium">
            Justificativa{' '}
            <span className="text-ds-danger-fg" aria-hidden>
              *
            </span>
          </label>
          <textarea
            id="justificativa-projeto"
            aria-required
            autoFocus
            rows={3}
            maxLength={LIMITE_JUSTIFICATIVA_PROJETO}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            placeholder="Ex.: implantação em andamento, previsão de conclusão em 03/2027."
            className="w-full rounded-lg border border-ds-border-strong bg-ds-bg-surface px-3 py-2 text-base text-ds-fg placeholder:text-ds-fg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-focus md:text-sm"
          />
          <p className="mt-1 text-right text-xs tabular-nums text-ds-fg-muted">
            {texto.length}/{LIMITE_JUSTIFICATIVA_PROJETO}
          </p>
        </div>
        <AlertDialogFooter className="gap-2">
          <AlertDialogCancel className={cn(buttonVariants({ variante: 'secundario' }), 'mt-0')}>
            Cancelar
          </AlertDialogCancel>
          <Button
            variante="primario"
            disabled={!texto.trim()}
            onClick={() => onConfirmar(texto.trim())}
          >
            {editando ? 'Salvar' : 'Colocar em projeto'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

type SolucoesDaEmpresa = Pick<IdentidadeMock, 'solucoes' | 'solucoesAms' | 'projetos'>;

/**
 * Soluções contratadas, com AMS e Em projeto em cada uma. Na transição (podeMarcar = false) as
 * soluções vêm da tela atual e só AMS e projeto são ajustados aqui (decisão de 21/10/2026).
 */
function ListaSolucoes({
  opcoes,
  podeMarcar,
  valor,
  inicialComAms,
  erro,
  onChange,
}: {
  opcoes: SolucaoCodigo[];
  podeMarcar: boolean;
  valor: SolucoesDaEmpresa;
  inicialComAms: boolean;
  erro?: string | null;
  onChange: (v: Partial<SolucoesDaEmpresa>) => void;
}) {
  // Solução cuja justificativa de projeto está sendo escrita
  const [projetoDe, setProjetoDe] = useState<SolucaoCodigo | null>(null);
  const { solucoes, solucoesAms, projetos } = valor;

  const alternarSolucao = (p: SolucaoCodigo) => {
    const marcado = solucoes.includes(p);
    // Solução desmarcada sai também do AMS e do projeto
    const semProjeto = { ...projetos };
    if (marcado) delete semProjeto[p];
    onChange({
      solucoes: marcado ? solucoes.filter((y) => y !== p) : [...solucoes, p],
      solucoesAms: marcado ? solucoesAms.filter((y) => y !== p) : solucoesAms,
      projetos: semProjeto,
    });
  };
  const tirarDoProjeto = (p: SolucaoCodigo) => {
    const semProjeto = { ...projetos };
    delete semProjeto[p];
    onChange({ projetos: semProjeto });
  };

  return (
    <div>
      <Rotulo obrigatorio={podeMarcar}>Soluções contratadas</Rotulo>
      <ul
        aria-label="Soluções contratadas"
        className="divide-y divide-ds-border rounded-lg border border-ds-border"
      >
        {opcoes.map((p) => {
          const marcado = solucoes.includes(p);
          const ams = solucoesAms.includes(p);
          const projeto = projetos[p];
          return (
            <li
              key={p}
              className="grid min-h-12 grid-cols-2 items-center gap-x-3 gap-y-2 px-3 py-2 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]"
            >
              {podeMarcar ? (
                <button
                  type="button"
                  role="checkbox"
                  aria-checked={marcado}
                  onClick={() => alternarSolucao(p)}
                  className="col-span-2 flex items-center gap-2.5 justify-self-start rounded-md py-1 text-sm font-medium text-ds-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-focus sm:col-span-1"
                >
                  <span
                    aria-hidden
                    className={cn(
                      'grid h-4 w-4 shrink-0 place-items-center rounded border transition',
                      marcado
                        ? 'border-ds-accent bg-ds-accent text-ds-fg-on-accent'
                        : 'border-ds-border-strong'
                    )}
                  >
                    {marcado && <Check className="h-3 w-3" strokeWidth={3} />}
                  </span>
                  {p}
                </button>
              ) : (
                <span className="col-span-2 py-1 text-sm font-medium sm:col-span-1">{p}</span>
              )}
              {marcado && (
                <>
                  <span className="flex items-center gap-2 text-sm text-ds-fg-secondary sm:justify-self-center">
                    AMS
                    <ChaveCompacta
                      ligado={ams}
                      rotulo={`AMS em ${p}`}
                      onClick={() =>
                        onChange({
                          solucoesAms: ams
                            ? solucoesAms.filter((y) => y !== p)
                            : [...solucoesAms, p],
                        })
                      }
                    />
                  </span>
                  <span className="flex items-center gap-2 justify-self-end text-sm text-ds-fg-secondary">
                    Em projeto
                    <ChaveCompacta
                      ligado={!!projeto}
                      rotulo={`${p} em projeto`}
                      onClick={() => (projeto ? tirarDoProjeto(p) : setProjetoDe(p))}
                    />
                  </span>
                  {projeto && (
                    <div className="col-span-full -mt-1 flex items-start gap-1.5 pl-5 text-xs text-ds-fg-muted">
                      <button
                        type="button"
                        onClick={() => setProjetoDe(p)}
                        aria-label={`Editar justificativa do projeto de ${p}`}
                        className="-mt-1 grid h-6 w-6 shrink-0 place-items-center rounded text-ds-fg-accent hover:bg-ds-bg-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-focus"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <p className="min-w-0 flex-1">{projeto}</p>
                    </div>
                  )}
                </>
              )}
            </li>
          );
        })}
      </ul>
      <DialogoProjeto
        produto={projetoDe}
        inicial={projetoDe ? (projetos[projetoDe] ?? '') : ''}
        onFechar={() => setProjetoDe(null)}
        onConfirmar={(texto) => {
          onChange({ projetos: { ...projetos, [projetoDe]: texto } });
          setProjetoDe(null);
        }}
      />
      {!solucoesAms.length && inicialComAms && (
        <div className="mt-2">
          <Callout tom="warning">Sem AMS em nenhuma solução, a empresa deixa de ter Book.</Callout>
        </div>
      )}
      {erro && <p className="mt-1.5 text-xs text-ds-danger-fg">{erro}</p>}
    </div>
  );
}

/**
 * Transição: as soluções contratadas vêm da tela atual (COMEX; FISCAL e GALLERY viram FISCAIS),
 * mas AMS e Em projeto por solução já são ajustados aqui. FINANCEIRAS só existe depois da virada.
 */
function PainelAmsProjetos({
  inicial,
  onFechar,
  onSalvar,
}: {
  inicial: IdentidadeMock;
  onFechar: () => void;
  onSalvar: (dados: IdentidadeMock) => void;
}) {
  const [d, setD] = useState(inicial);
  return (
    <TelaEdicao
      voltarPara={inicial.nomeAbreviado}
      titulo="AMS e projetos"
      subtitulo="As soluções contratadas vêm da tela atual; aqui se ajustam o AMS e os projetos de cada uma."
      podeSalvar
      onFechar={onFechar}
      onSalvar={() =>
        onSalvar({
          ...d,
          temAms: d.solucoesAms.length > 0,
          emProjeto: Object.keys(d.projetos).length > 0,
        })
      }
    >
      <Secao titulo="Contrato">
        <ListaSolucoes
          opcoes={d.solucoes}
          podeMarcar={false}
          valor={d}
          inicialComAms={inicial.solucoesAms.length > 0}
          onChange={(v) => setD((x) => ({ ...x, ...v }))}
        />
        <Callout tom="info">
          Para incluir ou tirar uma solução, edite a empresa na tela atual. FINANCEIRAS entra no
          contrato depois da virada do cadastro.
        </Callout>
      </Secao>
    </TelaEdicao>
  );
}

function PainelIdentidade({
  inicial,
  onFechar,
  onSalvar,
}: {
  inicial: IdentidadeMock;
  onFechar: () => void;
  onSalvar: (dados: IdentidadeMock) => void;
}) {
  const [d, setD] = useState(inicial);
  const set = <K extends keyof IdentidadeMock>(k: K, v: IdentidadeMock[K]) =>
    setD((x) => ({ ...x, [k]: v }));

  const erroEmail = (v: string, obrigatorio: boolean) =>
    !v.trim()
      ? obrigatorio
        ? 'Obrigatório.'
        : null
      : EMAIL_VALIDO.test(v.trim())
        ? null
        : 'E-mail inválido.';
  const erros = {
    nomeCompleto: d.nomeCompleto.trim().length < 2 ? 'Obrigatório.' : null,
    nomeAbreviado: !d.nomeAbreviado.trim() ? 'Obrigatório.' : null,
    vigenciaFim:
      d.vigenciaInicio && d.vigenciaFim && d.vigenciaFim < d.vigenciaInicio
        ? 'A vigência final não pode ser anterior à inicial.'
        : null,
    solucoes: d.solucoes.length === 0 ? 'Escolha pelo menos uma solução.' : null,
    cs: erroEmail(d.emailCustomerSuccess, true),
    comercial: erroEmail(d.emailComercial, false),
    tm: erroEmail(d.emailTm, false),
  };
  const podeSalvar = Object.values(erros).every((e) => !e);

  return (
    <TelaEdicao
      voltarPara={inicial.nomeAbreviado}
      titulo="Editar identidade"
      subtitulo="Última alteração em 01/07/2026 por Usuário Teste"
      podeSalvar={podeSalvar}
      onFechar={onFechar}
      onSalvar={() =>
        onSalvar({
          ...d,
          temAms: d.solucoesAms.length > 0,
          emProjeto: Object.keys(d.projetos).length > 0,
        })
      }
    >
      <Secao titulo="Identificação">
        <div className="grid items-end gap-4 sm:grid-cols-2 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)]">
          <CampoTexto
            id="nome-completo"
            rotulo="Nome completo"
            obrigatorio
            maiusculas
            valor={d.nomeCompleto}
            onChange={(v) => set('nomeCompleto', v)}
            erro={erros.nomeCompleto}
          />
          <CampoTexto
            id="nome-abreviado"
            rotulo="Nome abreviado"
            obrigatorio
            maiusculas
            valor={d.nomeAbreviado}
            onChange={(v) => set('nomeAbreviado', v)}
            erro={erros.nomeAbreviado}
          />
          <div>
            <Rotulo htmlFor="grupo-empresarial">Grupo empresarial</Rotulo>
            <input
              id="grupo-empresarial"
              list="grupos-empresariais"
              placeholder="Opcional"
              value={d.grupoEmpresarial}
              onChange={(e) => set('grupoEmpresarial', e.target.value.toUpperCase())}
              className={campo}
            />
            <datalist id="grupos-empresariais">
              {GRUPOS_EMPRESARIAIS_MOCK.map((g) => (
                <option key={g} value={g} />
              ))}
            </datalist>
          </div>
        </div>
      </Secao>

      <Secao titulo="Contrato">
        <div className="grid gap-4 sm:grid-cols-2">
          <CampoTexto
            id="vigencia-inicio"
            rotulo="Vigência inicial"
            tipo="date"
            valor={d.vigenciaInicio}
            onChange={(v) => set('vigenciaInicio', v)}
          />
          <CampoTexto
            id="vigencia-fim"
            rotulo="Vigência final"
            tipo="date"
            valor={d.vigenciaFim}
            onChange={(v) => set('vigenciaFim', v)}
            erro={erros.vigenciaFim}
          />
        </div>
        <ListaSolucoes
          opcoes={SOLUCOES}
          podeMarcar
          valor={d}
          inicialComAms={inicial.solucoesAms.length > 0}
          erro={erros.solucoes}
          onChange={(v) => setD((x) => ({ ...x, ...v }))}
        />
      </Secao>

      <Secao titulo="Responsáveis">
        <CampoTexto
          id="email-cs"
          rotulo="E-mail do Customer Success"
          obrigatorio
          tipo="email"
          placeholder="nome@sonda.com"
          valor={d.emailCustomerSuccess}
          onChange={(v) => set('emailCustomerSuccess', v)}
          erro={erros.cs}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <CampoTexto
            id="email-comercial"
            rotulo="E-mail do Comercial"
            tipo="email"
            placeholder="nome@sonda.com"
            valor={d.emailComercial}
            onChange={(v) => set('emailComercial', v)}
            erro={erros.comercial}
          />
          <CampoTexto
            id="email-tm"
            rotulo="E-mail do T&M"
            tipo="email"
            placeholder="nome@sonda.com"
            valor={d.emailTm}
            onChange={(v) => set('emailTm', v)}
            erro={erros.tm}
          />
        </div>
      </Secao>

      <Secao titulo="Grupos de responsáveis">
        <div role="group" aria-label="Grupos de responsáveis" className="grid gap-1 sm:grid-cols-2">
          {GRUPOS_RESPONSAVEIS_MOCK.map((g) => {
            const marcado = d.grupos.includes(g.id);
            return (
              <button
                key={g.id}
                type="button"
                role="checkbox"
                aria-checked={marcado}
                onClick={() =>
                  set('grupos', marcado ? d.grupos.filter((x) => x !== g.id) : [...d.grupos, g.id])
                }
                className="flex items-start gap-2.5 rounded-lg px-2.5 py-2 text-left transition hover:bg-ds-bg-subtle focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-focus"
              >
                <span
                  aria-hidden
                  className={cn(
                    'mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded border transition',
                    marcado
                      ? 'border-ds-accent bg-ds-accent text-ds-fg-on-accent'
                      : 'border-ds-border-strong'
                  )}
                >
                  {marcado && <Check className="h-3 w-3" strokeWidth={3} />}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm text-ds-fg">{g.nome}</span>
                  {g.descricao && (
                    <span className="block text-xs text-ds-fg-muted">{g.descricao}</span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      </Secao>

      <Secao titulo="Observação">
        <div>
          <textarea
            aria-label="Observação"
            value={d.observacao}
            maxLength={500}
            rows={3}
            onChange={(e) => set('observacao', e.target.value)}
            className={cn(campo, 'h-auto py-2 md:h-auto')}
          />
          <p className="mt-1 text-right text-xs tabular-nums text-ds-fg-muted">
            {d.observacao.length}/500
          </p>
        </div>
      </Secao>

      <Secao titulo="Anexos">
        <EditorAnexos anexos={d.anexos} onChange={(a) => set('anexos', a)} />
      </Secao>
    </TelaEdicao>
  );
}

/* ------------------------------------------------------------------ */
/* Aba Informações                                                      */
/* ------------------------------------------------------------------ */

function AbaInformacoes({ onAlterar }: { onAlterar: () => void }) {
  const [organizacoes, setOrganizacoes] = useState(ORGANIZACOES_ALFA_MOCK);
  const [novaOrg, setNovaOrg] = useState('');
  const [erroOrg, setErroOrg] = useState<string | null>(null);
  const [ramo, setRamo] = useState('');
  const [ramoSecundario, setRamoSecundario] = useState('');
  const [descricaoAtividade, setDescricaoAtividade] = useState('');
  const [fiscal, setFiscal] = useState<ContratoFiscalMock>(() =>
    comPadraoFiscal(CONTRATO_FISCAL_ALFA_MOCK)
  );

  const alterar = <K extends keyof ContratoFiscalMock>(chave: K, valor: ContratoFiscalMock[K]) => {
    setFiscal((f) => ({ ...f, [chave]: valor }));
    onAlterar();
  };

  const adicionarOrg = () => {
    const nome = novaOrg.trim().toUpperCase();
    if (!nome) return;
    if (organizacoes.includes(nome)) {
      setErroOrg('Esta organização já está na lista.');
      return;
    }
    const outra = ORGANIZACOES_DE_OUTRAS_MOCK[nome];
    if (outra) {
      setErroOrg(`Esta organização já pertence à ${outra}.`);
      return;
    }
    setOrganizacoes((l) => [...l, nome]);
    setNovaOrg('');
    setErroOrg(null);
    onAlterar();
  };

  const onPremise = fiscal.modalidade === 'on_premise';

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <div className="space-y-4">
        <Card titulo="Organizações no Aranda">
          <div className="mb-5 sm:w-1/2 sm:pr-2">
            <Rotulo htmlFor="id-aranda">ID da empresa no Aranda</Rotulo>
            <input
              id="id-aranda"
              inputMode="numeric"
              placeholder="Opcional"
              defaultValue=""
              onChange={onAlterar}
              className={campo}
            />
          </div>
          <Rotulo obrigatorio htmlFor="nova-org">
            Nomes das organizações
          </Rotulo>
          <div className="flex flex-wrap gap-1.5">
            {organizacoes.map((o) => (
              <Chip
                key={o}
                onRemover={() => {
                  setOrganizacoes((l) => l.filter((x) => x !== o));
                  onAlterar();
                }}
              >
                {o}
              </Chip>
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            <input
              id="nova-org"
              aria-label="Nova organização"
              placeholder="Nome exatamente como no Aranda"
              value={novaOrg}
              onChange={(e) => {
                setNovaOrg(e.target.value);
                setErroOrg(null);
              }}
              onKeyDown={(e) => e.key === 'Enter' && adicionarOrg()}
              aria-invalid={!!erroOrg}
              className={cn(campo, erroOrg && 'border-ds-danger-fg')}
            />
            <Button onClick={adicionarOrg} className="shrink-0">
              <Plus /> Adicionar
            </Button>
          </div>
          {erroOrg && <p className="mt-1.5 text-xs text-ds-danger-fg">{erroOrg}</p>}
        </Card>

        <Card titulo="Perfil da empresa">
          <div className="space-y-4">
            <div className="grid items-start gap-4 sm:grid-cols-2">
              <div>
                <Rotulo obrigatorio htmlFor="ramo">
                  Ramo de atividade
                </Rotulo>
                <Select
                  id="ramo"
                  value={ramo}
                  onChange={(e) => {
                    setRamo(e.target.value);
                    // O secundário não pode repetir o principal
                    if (e.target.value === ramoSecundario) setRamoSecundario('');
                    onAlterar();
                  }}
                  className="w-full"
                >
                  <option value="">Selecione</option>
                  {RAMOS_MOCK.map((r) => (
                    <option key={r}>{r}</option>
                  ))}
                </Select>
                {!ramo && (
                  <Ajuda>Pendente: passa a ser exigido na próxima edição da empresa.</Ajuda>
                )}
              </div>
              <div>
                <Rotulo htmlFor="ramo-secundario">Ramo secundário</Rotulo>
                <Select
                  id="ramo-secundario"
                  value={ramoSecundario}
                  onChange={(e) => {
                    setRamoSecundario(e.target.value);
                    onAlterar();
                  }}
                  className="w-full"
                >
                  <option value="">Nenhum</option>
                  {RAMOS_MOCK.filter((r) => r !== ramo).map((r) => (
                    <option key={r}>{r}</option>
                  ))}
                </Select>
              </div>
            </div>
            {(ramo || ramoSecundario) && (
              <div>
                <Rotulo htmlFor="descricao-atividade">Descrição da atividade</Rotulo>
                <textarea
                  id="descricao-atividade"
                  rows={3}
                  maxLength={500}
                  placeholder="Opcional. Ex.: fabrica e exporta autopeças para montadoras."
                  value={descricaoAtividade}
                  onChange={(e) => {
                    setDescricaoAtividade(e.target.value);
                    onAlterar();
                  }}
                  className="w-full rounded-lg border border-ds-border-strong bg-ds-bg-surface px-3 py-2 text-base text-ds-fg placeholder:text-ds-fg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-focus md:text-sm"
                />
                <p className="mt-1 text-right text-xs tabular-nums text-ds-fg-muted">
                  {descricaoAtividade.length}/500
                </p>
              </div>
            )}
          </div>
        </Card>
      </div>

      <Card titulo="Contrato FISCAL">
        <div className="space-y-5">
          <div>
            <Rotulo obrigatorio>Modalidade</Rotulo>
            <Escolha
              rotulo="Modalidade"
              opcoes={[
                { valor: 'saas', rotulo: 'SaaS' },
                { valor: 'on_premise', rotulo: 'On Premise' },
              ]}
              valor={fiscal.modalidade}
              onChange={(v) => alterar('modalidade', v)}
            />
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <Rotulo obrigatorio>e-DOCS 24x7</Rotulo>
              <Escolha
                rotulo="e-DOCS 24x7"
                opcoes={[
                  { valor: 'sim', rotulo: 'Sim' },
                  { valor: 'nao', rotulo: 'Não' },
                ]}
                valor={fiscal.edocs24x7 === null ? null : fiscal.edocs24x7 ? 'sim' : 'nao'}
                onChange={(v) => alterar('edocs24x7', v === 'sim')}
              />
            </div>
            <div>
              <Rotulo obrigatorio>Atualização contratada</Rotulo>
              <Escolha
                rotulo="Atualização contratada"
                opcoes={[
                  { valor: 'sim', rotulo: 'Sim' },
                  { valor: 'nao', rotulo: 'Não' },
                ]}
                valor={fiscal.atualizacao === null ? null : fiscal.atualizacao ? 'sim' : 'nao'}
                onChange={(v) => alterar('atualizacao', v === 'sim')}
              />
            </div>
          </div>
          {fiscal.atualizacao && (
            <div className="sm:w-1/2 sm:pr-2.5">
              <Rotulo obrigatorio htmlFor="atualizacoes">
                Atualizações por ano
              </Rotulo>
              <CampoNumero
                id="atualizacoes"
                min={1}
                valor={fiscal.atualizacoesAno === null ? '' : String(fiscal.atualizacoesAno)}
                onChange={(v) => alterar('atualizacoesAno', v ? Number(v) : null)}
              />
            </div>
          )}
          {onPremise && (
            <div className="space-y-5 border-t border-ds-border pt-5">
              <div>
                <Rotulo obrigatorio>DBA</Rotulo>
                <Escolha
                  rotulo="DBA"
                  umaLinha
                  opcoes={[
                    { valor: 'nao_contratado', rotulo: 'Não contratado' },
                    { valor: 'atendimento', rotulo: 'Atendimento' },
                    { valor: 'monitoramento', rotulo: 'Monitoramento' },
                    { valor: 'ambos', rotulo: 'Atendimento + Monitoramento' },
                  ]}
                  valor={fiscal.dba ?? 'nao_contratado'}
                  onChange={(v) => alterar('dba', v)}
                />
              </div>
              {fiscal.dba !== 'nao_contratado' && (
                <div className="grid items-end gap-4 sm:grid-cols-2">
                  {(fiscal.dba === 'atendimento' || fiscal.dba === 'ambos') && (
                    <div>
                      <Rotulo obrigatorio htmlFor="horas-atendimento">
                        Horas de atendimento
                      </Rotulo>
                      <CampoHoras
                        id="horas-atendimento"
                        valor={fiscal.horasAtendimento}
                        onChange={(v) => alterar('horasAtendimento', v)}
                      />
                    </div>
                  )}
                  {(fiscal.dba === 'monitoramento' || fiscal.dba === 'ambos') && (
                    <div>
                      <Rotulo obrigatorio htmlFor="horas-monitoramento">
                        Horas de monitoramento
                      </Rotulo>
                      <CampoHoras
                        id="horas-monitoramento"
                        valor={fiscal.horasMonitoramento}
                        onChange={(v) => alterar('horasMonitoramento', v)}
                      />
                    </div>
                  )}
                </div>
              )}
              <div>
                <Rotulo obrigatorio>Banco de dados</Rotulo>
                <Escolha
                  rotulo="Banco de dados"
                  opcoes={[
                    { valor: 'sql_server', rotulo: 'SQL Server' },
                    { valor: 'oracle', rotulo: 'Oracle' },
                  ]}
                  valor={fiscal.bancoDados}
                  onChange={(v) => alterar('bancoDados', v)}
                />
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}

/** Modo "ver": os mesmos dados como texto, sem campos desabilitados */
function AbaInformacoesLeitura() {
  const f = comPadraoFiscal(CONTRATO_FISCAL_ALFA_MOCK);
  const simNao = (v: boolean | null) => (v === null ? '—' : v ? 'Sim' : 'Não');
  const dba = {
    atendimento: 'Atendimento',
    monitoramento: 'Monitoramento',
    ambos: 'Atendimento + Monitoramento',
    nao_contratado: 'Não contratado',
  };
  const itensFiscal: [string, ReactNode][] = [
    [
      'Modalidade',
      f.modalidade === 'saas' ? 'SaaS' : f.modalidade === 'on_premise' ? 'On Premise' : '—',
    ],
    ['e-DOCS 24x7', simNao(f.edocs24x7)],
    [
      'Atualização contratada',
      f.atualizacao ? `Sim · ${f.atualizacoesAno} por ano` : simNao(f.atualizacao),
    ],
    ...(f.modalidade === 'on_premise'
      ? ([
          ['DBA', dba[f.dba]],
          ...(f.dba === 'atendimento' || f.dba === 'ambos'
            ? ([
                ['Horas de atendimento', f.horasAtendimento ? `${f.horasAtendimento}/mês` : '—'],
              ] as [string, ReactNode][])
            : []),
          ...(f.dba === 'monitoramento' || f.dba === 'ambos'
            ? ([
                [
                  'Horas de monitoramento',
                  f.horasMonitoramento ? `${f.horasMonitoramento}/mês` : '—',
                ],
              ] as [string, ReactNode][])
            : []),
          [
            'Banco de dados',
            f.bancoDados === 'sql_server'
              ? 'SQL Server'
              : f.bancoDados === 'oracle'
                ? 'Oracle'
                : '—',
          ],
        ] as [string, ReactNode][])
      : []),
  ];
  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <div className="space-y-4">
        <Card titulo="Organizações no Aranda">
          <dl className="mb-4">
            <dt className="flex items-center gap-1 text-xs text-ds-fg-muted">
              ID da empresa no Aranda
              <InfoDica
                texto={DICAS['ID da empresa no Aranda']}
                assunto="ID da empresa no Aranda"
              />
            </dt>
            <dd className="mt-0.5 text-sm text-ds-fg-muted">—</dd>
          </dl>
          <p className="mb-1.5 flex items-center gap-1 text-xs text-ds-fg-muted">
            Nomes das organizações
            <InfoDica texto={DICAS['Nomes das organizações']} assunto="Nomes das organizações" />
          </p>
          <div className="flex flex-wrap gap-1.5">
            {ORGANIZACOES_ALFA_MOCK.map((o) => (
              <Chip key={o}>{o}</Chip>
            ))}
          </div>
        </Card>
        <Card titulo="Perfil da empresa">
          <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
            {(
              [
                [
                  'Ramo de atividade',
                  <span key="r" className="text-ds-warning-fg">
                    Não informado
                  </span>,
                ],
                ['Ramo secundário', vazio],
              ] as [string, ReactNode, string?][]
            ).map(([r, v, classe]) => (
              <div key={r} className={classe}>
                <dt className="flex items-center gap-1 text-xs text-ds-fg-muted">
                  {r}
                  <InfoDica texto={DICAS[r]} assunto={r} />
                </dt>
                <dd className="mt-0.5 text-sm text-ds-fg">{v}</dd>
              </div>
            ))}
          </dl>
        </Card>
      </div>
      <Card titulo="Contrato FISCAL">
        <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
          {itensFiscal.map(([r, v]) => (
            <div key={r}>
              <dt className="flex items-center gap-1 text-xs text-ds-fg-muted">
                {r}
                {DICAS[r] && <InfoDica texto={DICAS[r]} assunto={r} />}
              </dt>
              <dd className="mt-0.5 text-sm text-ds-fg">{v}</dd>
            </div>
          ))}
        </dl>
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Aba Bancos de Horas                                                  */
/* ------------------------------------------------------------------ */

function Parametro({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="flex items-center gap-1 text-xs text-ds-fg-muted">
        {rotulo}
        {DICAS[rotulo] && <InfoDica texto={DICAS[rotulo]} assunto={rotulo} />}
      </dt>
      <dd className="mt-0.5 text-sm text-ds-fg">{children}</dd>
    </div>
  );
}

function textoEscopo(banco: BancoCadastroMock): string[] {
  return banco.escopo.flatMap((e) =>
    e.modulos.length === 0
      ? [`${nomeProduto(e.produtoId)} inteiro`]
      : e.modulos.map((m) => `${nomeProduto(e.produtoId)} › ${nomeModulo(m)}`)
  );
}

function CartaoBanco({
  banco,
  primeiro,
  ultimo,
  onSubir,
  onDescer,
  onEditar,
  onInativar,
  atrasoMs,
  podeEditar,
  posicao,
}: {
  banco: BancoCadastroMock;
  podeEditar: boolean;
  posicao: number;
  primeiro: boolean;
  ultimo: boolean;
  onSubir: () => void;
  onDescer: () => void;
  onEditar: () => void;
  onInativar: () => void;
  atrasoMs: number;
}) {
  const escopo = textoEscopo(banco);
  return (
    <article
      style={atraso(atrasoMs)}
      className={cn(
        'ds-surgir flex gap-3 rounded-xl border bg-ds-bg-surface p-4 transition duration-200 hover:shadow-[0_10px_24px_-16px_rgba(0,0,0,0.3)] md:p-5',
        banco.padrao ? 'border-dashed border-ds-border-strong' : 'border-ds-border'
      )}
    >
      {podeEditar ? (
        <div className="flex flex-col gap-1" aria-label="Prioridade">
          <Button
            tamanho="icone"
            variante="fantasma"
            aria-label={`Subir ${banco.nome}`}
            disabled={primeiro}
            onClick={onSubir}
          >
            <ArrowUp />
          </Button>
          <Button
            tamanho="icone"
            variante="fantasma"
            aria-label={`Descer ${banco.nome}`}
            disabled={ultimo}
            onClick={onDescer}
          >
            <ArrowDown />
          </Button>
        </div>
      ) : (
        <span
          aria-label={`Prioridade ${posicao}`}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-ds-bg-subtle text-sm font-semibold tabular-nums text-ds-fg-secondary"
        >
          {posicao}
        </span>
      )}

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-ds-title text-lg font-semibold tracking-tight text-ds-fg">
            {banco.nome}
          </h3>
          {banco.padrao && <StatusBadge tom="neutral">padrão</StatusBadge>}
          {banco.consomeOutros && <StatusBadge tom="info">Consome outros bancos</StatusBadge>}
          {!banco.ativo && <StatusBadge tom="neutral">Inativo</StatusBadge>}
        </div>
        {banco.descricao && <p className="mt-0.5 text-sm text-ds-fg-muted">{banco.descricao}</p>}

        <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 md:grid-cols-5">
          <Parametro rotulo="Contrato">
            {banco.tipoContrato === 'horas'
              ? 'Horas'
              : banco.tipoContrato === 'tickets'
                ? 'Tickets'
                : 'Horas e tickets'}{' '}
            · {periodoTexto(banco.periodoApuracao).toLowerCase()}
          </Parametro>
          <Parametro rotulo="Vigência">
            {banco.fimVigencia
              ? `${banco.inicioVigencia} a ${banco.fimVigencia}`
              : `desde ${banco.inicioVigencia}`}
          </Parametro>
          <Parametro rotulo="Baseline">
            <span className="tabular-nums">{banco.baseline.valor}</span>
            <span className="text-ds-fg-muted"> /mês</span>
          </Parametro>
          <Parametro rotulo="Repasse">
            <span className="tabular-nums">{banco.repasse.percentual}%</span>
          </Parametro>
          <Parametro rotulo="Excedente">
            {banco.taxaProduto === 'GALLERY' ? 'Gallery' : 'Outros'} ·{' '}
            {banco.taxaTipoHora === 'normal' ? 'hora normal' : 'hora excedente'}
          </Parametro>
        </dl>

        <div className="mt-4 flex flex-wrap gap-1.5">
          {banco.padrao ? (
            <Chip tracejado>Recebe o que não se encaixa nos outros bancos</Chip>
          ) : (
            escopo.map((e) => <Chip key={e}>{e}</Chip>)
          )}
          {banco.filtroIc && (
            <Chip>
              Item de configuração {banco.filtroIc.operador === 'contem' ? 'contém' : 'igual a'} “
              {banco.filtroIc.valor}”
            </Chip>
          )}
        </div>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-1 sm:flex-row sm:items-start">
        {podeEditar && (
          <Button tamanho="sm" onClick={onEditar}>
            <Pencil /> <span className="hidden sm:inline">Editar</span>
          </Button>
        )}
        <Button tamanho="sm" variante="fantasma" aria-label={`Histórico de ${banco.nome}`}>
          <History />
        </Button>
        {podeEditar && (
          <Button
            tamanho="sm"
            variante="fantasma"
            aria-label={`Inativar ${banco.nome}`}
            disabled={banco.padrao}
            title={
              banco.padrao
                ? 'O Banco padrão não pode ser inativado enquanto houver outros bancos ativos'
                : undefined
            }
            onClick={onInativar}
            className="text-ds-danger-fg hover:bg-ds-danger-bg"
          >
            <XCircle />
          </Button>
        )}
      </div>
    </article>
  );
}

function AbaBancos({
  podeEditar,
  onEditar,
}: {
  podeEditar: boolean;
  onEditar: (banco: BancoCadastroMock | null) => void;
}) {
  const [bancos, setBancos] = useState(BANCOS_ALFA_MOCK);
  const [inativar, setInativar] = useState<BancoCadastroMock | null>(null);
  // O Banco padrão também entra na ordem (decisão de 15/10/2026). Na classificação ele continua
  // recebendo o que sobra em qualquer posição; a ordem pesa no consumo entre bancos.
  const mover = (id: string, delta: number) =>
    setBancos((lista) => {
      const ordem = [...lista];
      const i = ordem.findIndex((b) => b.id === id);
      const j = i + delta;
      if (j < 0 || j >= ordem.length) return lista;
      [ordem[i], ordem[j]] = [ordem[j], ordem[i]];
      return ordem;
    });

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-ds-fg-muted">
          A ordem define a prioridade na classificação das horas.
        </p>
        {podeEditar && (
          <Button variante="primario" onClick={() => onEditar(null)}>
            <Plus /> Novo banco
          </Button>
        )}
      </div>

      {bancos.map((b, i) => (
        <CartaoBanco
          key={b.id}
          banco={b}
          podeEditar={podeEditar}
          posicao={i + 1}
          primeiro={i === 0}
          ultimo={i === bancos.length - 1}
          onSubir={() => mover(b.id, -1)}
          onDescer={() => mover(b.id, 1)}
          onEditar={() => onEditar(b)}
          onInativar={() => (b.padrao ? undefined : setInativar(b))}
          atrasoMs={i * 70}
        />
      ))}

      <ConfirmDialog
        aberto={!!inativar}
        onOpenChange={(v) => !v && setInativar(null)}
        titulo={`Inativar ${inativar?.nome ?? ''}?`}
        consequencias={[
          'A partir do próximo mês aberto, as horas dele vão para o Banco padrão',
          'Meses fechados não mudam',
        ]}
        rotuloConfirmar="Inativar"
        tom="perigo"
        justificativa={{ rotulo: 'Motivo', placeholder: 'Ex.: fim do contrato COMEX' }}
        onConfirmar={() => setInativar(null)}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Painel de edição do banco                                            */
/* ------------------------------------------------------------------ */

function ValorComHistorico({
  rotulo,
  valor,
  desde,
}: {
  rotulo: string;
  valor: string;
  desde: string;
}) {
  return (
    <div>
      <Rotulo>{rotulo}</Rotulo>
      <div className="flex h-11 items-center justify-between gap-3 rounded-lg border border-ds-border bg-ds-bg-subtle px-3 md:h-9">
        <span className="min-w-0 truncate whitespace-nowrap text-sm text-ds-fg">
          <span className="font-medium tabular-nums">{valor}</span>
          <span className="text-xs text-ds-fg-muted"> desde {desde}</span>
        </span>
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="inline-flex shrink-0 items-center gap-0.5 text-xs font-medium text-ds-fg-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-focus"
            >
              Gerenciar <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </PopoverTrigger>
          <PopoverContent
            data-ds="v2"
            align="end"
            className="w-80 border-ds-border bg-ds-bg-raised p-0 font-ds-sans text-ds-fg"
          >
            <div className="flex items-center justify-between border-b border-ds-border px-4 py-3">
              <p className="text-sm font-medium">Vigências de {rotulo.toLowerCase()}</p>
              <Button tamanho="sm" variante="fantasma">
                <Plus /> Nova
              </Button>
            </div>
            <ol className="divide-y divide-ds-border">
              {HISTORICO_BASELINE_MOCK.map((h) => (
                <li key={h.desde} className="px-4 py-3">
                  <p className="text-sm">
                    <span className="font-medium tabular-nums">{h.valor}</span>
                    <span className="text-ds-fg-muted">
                      {' '}
                      · {h.desde}
                      {h.ate ? ` a ${h.ate}` : ' em diante'}
                    </span>
                  </p>
                  <p className="mt-0.5 text-xs text-ds-fg-muted">
                    {h.motivo} · {h.por}, {h.em}
                  </p>
                </li>
              ))}
            </ol>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}

/**
 * Árvore Solução › Produto › Módulos (decisão de 21/10/2026): a solução só agrupa; marca-se o
 * produto inteiro (inclui módulos criados no futuro) ou módulos dele. Itens que outro banco já
 * cobre ficam bloqueados (RN-05), e soluções sem AMS não entram em banco.
 */
function ArvoreEscopo({
  solucoes,
  semAms,
  usados,
  selecao,
  onChange,
}: {
  /** Soluções contratadas pela empresa */
  solucoes: SolucaoCodigo[];
  /** Soluções contratadas sem AMS: aparecem bloqueadas, sem poder entrar em banco */
  semAms: SolucaoCodigo[];
  /** "produtoId|*" (produto inteiro) ou "produtoId|moduloId" → banco que já o cobre */
  usados: Record<string, string>;
  /** produtoId → 'todos' (produto inteiro) ou ids dos módulos */
  selecao: Record<string, string[] | 'todos'>;
  onChange: (s: Record<string, string[] | 'todos'>) => void;
}) {
  const [abertos, setAbertos] = useState<string[]>([]);
  return (
    <div className="space-y-3">
      {SOLUCOES_MOCK.filter((x) => solucoes.includes(x.codigo)).map((sol) => {
        const bloqueadaSolucao = semAms.includes(sol.codigo);
        const produtos = PRODUTOS_MOCK.filter((p) => p.solucaoId === sol.id && p.ativo);
        return (
          <section key={sol.id}>
            <h4 className="mb-1.5 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.06em] text-ds-fg-secondary">
              {sol.nome}
              {bloqueadaSolucao && (
                <span className="font-normal normal-case tracking-normal text-ds-fg-muted">
                  · sem AMS
                </span>
              )}
            </h4>
            <ul className="divide-y divide-ds-border overflow-hidden rounded-xl border border-ds-border">
              {produtos.map((p) => {
                const modulos = MODULOS_MOCK.filter((x) => x.produtoId === p.id && x.ativo);
                const bloqueioProduto = bloqueadaSolucao ? 'sem AMS' : usados[`${p.id}|*`];
                const total = selecao[p.id] === 'todos';
                const marcados = total
                  ? modulos.map((x) => x.id)
                  : ((selecao[p.id] as string[]) ?? []);
                const parcial = !total && marcados.length > 0;
                const aberto = abertos.includes(p.id);
                return (
                  <li key={p.id}>
                    <div className="flex items-center gap-3 px-3 py-2.5">
                      <input
                        type="checkbox"
                        aria-label={`${p.nome} inteiro`}
                        checked={total}
                        ref={(el) => el && (el.indeterminate = parcial)}
                        disabled={!!bloqueioProduto}
                        onChange={(e) =>
                          onChange({ ...selecao, [p.id]: e.target.checked ? 'todos' : [] })
                        }
                        className="h-4 w-4 accent-ds-accent"
                      />
                      <button
                        type="button"
                        disabled={!modulos.length}
                        onClick={() =>
                          setAbertos((a) =>
                            a.includes(p.id) ? a.filter((x) => x !== p.id) : [...a, p.id]
                          )
                        }
                        aria-expanded={modulos.length ? aberto : undefined}
                        className="flex flex-1 items-center justify-between gap-2 text-left text-sm font-medium text-ds-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-focus disabled:cursor-default"
                      >
                        <span className={bloqueioProduto ? 'text-ds-fg-disabled' : undefined}>
                          {p.nome}
                          {bloqueioProduto && !bloqueadaSolucao && (
                            <span className="font-normal text-ds-fg-muted">
                              {' '}
                              · em {bloqueioProduto}
                            </span>
                          )}
                        </span>
                        <span className="flex items-center gap-2 text-xs font-normal text-ds-fg-muted">
                          {modulos.length ? (
                            <>
                              <span className="tabular-nums">
                                {total
                                  ? 'todos os módulos'
                                  : `${marcados.length} de ${modulos.length}`}
                              </span>
                              <ChevronDown
                                className={cn(
                                  'h-4 w-4 transition-transform',
                                  aberto && 'rotate-180'
                                )}
                              />
                            </>
                          ) : (
                            'sem módulos'
                          )}
                        </span>
                      </button>
                    </div>
                    {aberto && modulos.length > 0 && (
                      <ul className="grid gap-x-4 bg-ds-bg-subtle px-3 py-2 sm:grid-cols-2">
                        {modulos.map((x) => {
                          const bloqueio = usados[`${p.id}|${x.id}`] ?? bloqueioProduto;
                          return (
                            <li key={x.id}>
                              <label
                                className={cn(
                                  'flex min-h-11 items-center gap-3 py-1 text-sm md:min-h-9',
                                  bloqueio ? 'text-ds-fg-disabled' : 'text-ds-fg'
                                )}
                                title={bloqueio ? `Já está em ${bloqueio}` : undefined}
                              >
                                <input
                                  type="checkbox"
                                  disabled={!!bloqueio || total}
                                  checked={total || marcados.includes(x.id)}
                                  onChange={(e) =>
                                    onChange({
                                      ...selecao,
                                      [p.id]: e.target.checked
                                        ? [...marcados, x.id]
                                        : marcados.filter((y) => y !== x.id),
                                    })
                                  }
                                  className="h-4 w-4 accent-ds-accent"
                                />
                                <span className="min-w-0 flex-1 truncate">{x.nome}</span>
                                {bloqueio && bloqueio !== 'sem AMS' && (
                                  <span className="shrink-0 text-xs text-ds-fg-muted">
                                    em {bloqueio}
                                  </span>
                                )}
                              </label>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

function PainelBanco({
  empresa,
  solucoes,
  solucoesAms,
  banco,
  onFechar,
}: {
  empresa: string;
  solucoes: SolucaoCodigo[];
  /** Só os produtos das soluções com AMS podem entrar no escopo de um banco */
  solucoesAms: SolucaoCodigo[];
  banco: BancoCadastroMock | null;
  onFechar: () => void;
}) {
  const novo = banco === null;
  const base = banco ?? {
    ...BANCOS_ALFA_MOCK[0],
    id: 'novo',
    nome: '',
    descricao: '',
    escopo: [],
    consomeOutros: false,
    baseline: { valor: '00:00', desde: '—' },
    repasse: { percentual: 100, desde: '—' },
  };
  const [nome, setNome] = useState(base.nome);
  const [descricao, setDescricao] = useState(base.descricao);
  const [ativo, setAtivo] = useState(base.ativo);
  const [tipo, setTipo] = useState(base.tipoContrato);
  const [periodo, setPeriodo] = useState(base.periodoApuracao);
  // "MM/AAAA" do cadastro → "AAAA-MM" do input month
  const mesInput = (v: string) => (v ? `${v.slice(3)}-${v.slice(0, 2)}` : '');
  const [inicioVigencia, setInicioVigencia] = useState(mesInput(base.inicioVigencia));
  const [fimVigencia, setFimVigencia] = useState(mesInput(base.fimVigencia));
  const erroFimVigencia =
    fimVigencia && inicioVigencia && fimVigencia < inicioVigencia
      ? 'O fim não pode ser anterior ao início da vigência.'
      : null;
  const [porPeriodo, setPorPeriodo] = useState(!!base.repassePorPeriodo);
  const [taxaProduto, setTaxaProduto] = useState(base.taxaProduto);
  const [taxaHora, setTaxaHora] = useState(base.taxaTipoHora);
  const [consome, setConsome] = useState(base.consomeOutros);
  const [filtroOperador, setFiltroOperador] = useState(base.filtroIc?.operador ?? '');
  const [filtroValor, setFiltroValor] = useState(base.filtroIc?.valor ?? '');
  const [selecao, setSelecao] = useState<Record<string, string[] | 'todos'>>(() => {
    const s: Record<string, string[] | 'todos'> = {};
    base.escopo.forEach((e) => (s[e.produtoId] = e.modulos.length === 0 ? 'todos' : e.modulos));
    return s;
  });

  // O que os outros bancos já cobrem (RN-05)
  const usados: Record<string, string> = {};
  BANCOS_ALFA_MOCK.filter((b) => b.id !== base.id && !b.padrao && b.ativo).forEach((b) =>
    b.escopo.forEach((e) =>
      e.modulos.length === 0
        ? (usados[`${e.produtoId}|*`] = b.nome)
        : e.modulos.forEach((m) => (usados[`${e.produtoId}|${m}`] = b.nome))
    )
  );

  // Elegíveis para ceder saldo (RN-19): ativos, mesmo tipo e mesmo período
  const outros = BANCOS_ALFA_MOCK.filter((b) => b.id !== base.id && b.ativo);
  const elegibilidade = outros.map((b) => ({
    banco: b,
    motivo:
      b.tipoContrato !== tipo
        ? `contrato de ${b.tipoContrato}`
        : b.periodoApuracao !== periodo
          ? `apuração ${periodoTexto(b.periodoApuracao).toLowerCase()}`
          : null,
  }));
  const algumElegivel = elegibilidade.some((e) => e.motivo === null);

  const temEscopo = Object.values(selecao).some((v) => v === 'todos' || v.length > 0);
  const semEscopoNemFiltro = !base.padrao && !temEscopo && !filtroValor.trim();
  const podeSalvar = nome.trim().length > 0 && !semEscopoNemFiltro && !erroFimVigencia;

  return (
    <TelaEdicao
      voltarPara={empresa}
      titulo={novo ? 'Novo banco' : `Editar ${base.nome}`}
      subtitulo={novo ? undefined : 'Última alteração em 01/07/2026 por Usuário Teste'}
      podeSalvar={podeSalvar}
      rotuloSalvar={novo ? 'Criar banco' : 'Salvar'}
      onFechar={onFechar}
      onSalvar={onFechar}
    >
      <Secao titulo="Identificação">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Rotulo obrigatorio htmlFor="nome-banco">
              Nome
            </Rotulo>
            <input
              id="nome-banco"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className={campo}
            />
          </div>
          <div>
            <Rotulo htmlFor="descricao-banco">Descrição</Rotulo>
            <input
              id="descricao-banco"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              className={campo}
            />
          </div>
        </div>
        {base.padrao ? (
          <Callout tom="info">
            Banco padrão: recebe tudo o que não se encaixa nos outros bancos.
          </Callout>
        ) : (
          <Interruptor ligado={ativo} onChange={setAtivo} rotulo="Ativo" />
        )}
      </Secao>

      <Secao titulo="Contrato">
        <div>
          <Rotulo obrigatorio>Tipo de contrato</Rotulo>
          <Escolha
            rotulo="Tipo de contrato"
            opcoes={[
              { valor: 'horas', rotulo: 'Horas' },
              { valor: 'tickets', rotulo: 'Tickets' },
              { valor: 'ambos', rotulo: 'Horas e tickets' },
            ]}
            valor={tipo}
            onChange={(v) => setTipo(v as typeof tipo)}
          />
        </div>
        <div className="grid items-start gap-4 sm:grid-cols-3">
          <div>
            <Rotulo obrigatorio htmlFor="periodo">
              Período de apuração
            </Rotulo>
            <Select
              id="periodo"
              value={periodo}
              onChange={(e) => setPeriodo(Number(e.target.value))}
              className="w-full"
            >
              {Object.entries(PERIODOS).map(([n, r]) => (
                <option key={n} value={n}>
                  {r}
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Rotulo obrigatorio htmlFor="vigencia">
              Início da vigência
            </Rotulo>
            <input
              id="vigencia"
              type="month"
              value={inicioVigencia}
              onChange={(e) => setInicioVigencia(e.target.value)}
              min="2026-01"
              className={campo}
            />
          </div>
          <div>
            <Rotulo htmlFor="vigencia-fim-banco">Fim da vigência</Rotulo>
            <input
              id="vigencia-fim-banco"
              type="month"
              value={fimVigencia}
              onChange={(e) => setFimVigencia(e.target.value)}
              min={inicioVigencia || undefined}
              aria-invalid={!!erroFimVigencia}
              className={cn(campo, erroFimVigencia && 'border-ds-danger-fg')}
            />
            {erroFimVigencia ? (
              <p className="mt-1.5 text-xs text-ds-danger-fg">{erroFimVigencia}</p>
            ) : (
              !fimVigencia && <Ajuda>Opcional: sem data, vale por tempo indeterminado.</Ajuda>
            )}
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Rotulo htmlFor="dia-inicio">Dia de início da apuração</Rotulo>
            <CampoNumero id="dia-inicio" min={1} max={28} valorInicial={base.diaInicioApuracao} />
          </div>
          <div>
            <Rotulo htmlFor="dia-fim">Dia de fim da apuração</Rotulo>
            <CampoNumero id="dia-fim" min={0} max={28} valorInicial={base.diaFimApuracao} />
          </div>
        </div>
      </Secao>

      <Secao titulo="Regras banco de horas/ticket">
        <div className="grid gap-4 sm:grid-cols-2">
          <ValorComHistorico
            rotulo="Baseline"
            valor={`${base.baseline.valor}/mês`}
            desde={base.baseline.desde}
          />
          <ValorComHistorico
            rotulo="Repasse"
            valor={`${base.repasse.percentual}%`}
            desde={base.repasse.desde}
          />
        </div>
        <Interruptor ligado={porPeriodo} onChange={setPorPeriodo} rotulo="Repasse por período" />
        {porPeriodo && (
          <div className="grid gap-4 items-end sm:grid-cols-4">
            {[
              ['Meses por período', 3],
              ['Períodos até zerar', 2],
              ['% dentro do período', 100],
              ['% entre períodos', 70],
            ].map(([r, v]) => (
              <div key={r as string}>
                <Rotulo>{r}</Rotulo>
                <CampoNumero
                  rotuloAcessivel={r as string}
                  min={0}
                  max={(r as string).startsWith('%') ? 100 : 12}
                  valorInicial={v as number}
                />
              </div>
            ))}
          </div>
        )}
      </Secao>

      <Secao titulo="Excedente">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Rotulo obrigatorio htmlFor="taxa">
              Taxa do cliente
            </Rotulo>
            <Select
              id="taxa"
              value={taxaProduto}
              onChange={(e) => setTaxaProduto(e.target.value as 'OUTROS' | 'GALLERY')}
              className="w-full"
            >
              <option value="OUTROS">Outros</option>
              <option value="GALLERY">Gallery</option>
            </Select>
          </div>
          <div>
            <Rotulo obrigatorio>Tipo de hora</Rotulo>
            <Escolha
              rotulo="Hora do excedente"
              opcoes={[
                { valor: 'excedente', rotulo: 'Excedente' },
                { valor: 'normal', rotulo: 'Normal' },
              ]}
              valor={taxaHora}
              onChange={(v) => setTaxaHora(v as typeof taxaHora)}
            />
          </div>
        </div>
      </Secao>

      {!base.padrao && (
        <Secao titulo="Escopo">
          <ArvoreEscopo
            solucoes={solucoes}
            semAms={solucoes.filter((x) => !solucoesAms.includes(x))}
            usados={usados}
            selecao={selecao}
            onChange={setSelecao}
          />
          <div className="grid gap-4 sm:grid-cols-[180px_minmax(0,1fr)]">
            <div>
              <Rotulo htmlFor="filtro-op">Item de configuração</Rotulo>
              <Select
                id="filtro-op"
                value={filtroOperador}
                onChange={(e) => setFiltroOperador(e.target.value)}
                className="w-full"
              >
                <option value="">Sem filtro</option>
                <option value="contem">Contém</option>
                <option value="igual">Igual a</option>
              </Select>
            </div>
            {filtroOperador && (
              <div>
                <Rotulo htmlFor="filtro-valor">Valor</Rotulo>
                <input
                  id="filtro-valor"
                  value={filtroValor}
                  onChange={(e) => setFiltroValor(e.target.value)}
                  placeholder="Ex.: NIQUEL"
                  className={campo}
                />
              </div>
            )}
          </div>
          {semEscopoNemFiltro ? (
            <Callout tom="warning">Escolha ao menos um produto, módulo ou filtro.</Callout>
          ) : (
            <Callout tom="success">Sem conflito com os outros bancos.</Callout>
          )}
        </Secao>
      )}

      <Secao titulo="Consumo entre bancos">
        <Interruptor
          ligado={consome && algumElegivel}
          onChange={setConsome}
          desabilitado={!algumElegivel}
          rotulo="Ao zerar, consumir saldo dos outros bancos"
          descricao={
            algumElegivel
              ? undefined
              : 'Nenhum outro banco tem o mesmo tipo de contrato e a mesma apuração.'
          }
        />
        <ul className="space-y-1.5">
          {elegibilidade.map(({ banco: b, motivo }) => (
            <li key={b.id} className="flex items-center gap-2 text-sm">
              {motivo === null ? (
                <CheckCircle2
                  className="h-4 w-4 shrink-0 text-ds-success-fg"
                  aria-label="Pode ceder"
                />
              ) : (
                <XCircle
                  className="h-4 w-4 shrink-0 text-ds-fg-muted"
                  aria-label="Não pode ceder"
                />
              )}
              <span className={motivo ? 'text-ds-fg-muted' : 'text-ds-fg'}>
                {b.nome}
                {motivo && <span> · {motivo}</span>}
              </span>
            </li>
          ))}
        </ul>
      </Secao>
    </TelaEdicao>
  );
}

/* ------------------------------------------------------------------ */
/* Abas Contatos e Book                                                 */
/* ------------------------------------------------------------------ */

function AbaContatos({ modo, podeEditar }: { modo: Modo; podeEditar: boolean }) {
  const colunas: ColunaTabela<ContatoMock>[] = [
    {
      id: 'nome',
      cabecalho: 'Contato',
      mobile: 'titulo',
      celula: (c) => (
        <div className="flex items-center gap-2">
          {c.principal && (
            <Star
              className="h-4 w-4 shrink-0 fill-[#00D4E8] text-[#00D4E8]"
              aria-label="Principal"
            />
          )}
          <div className="min-w-0">
            <p className="font-medium">{c.nome}</p>
            <p className="text-xs text-ds-fg-muted">{c.email}</p>
          </div>
        </div>
      ),
    },
    { id: 'finalidade', cabecalho: 'Recebe', celula: (c) => c.finalidade },
    {
      id: 'status',
      cabecalho: 'Status',
      celula: (c) =>
        c.ativo ? (
          <StatusBadge tom="success">Ativo</StatusBadge>
        ) : (
          <StatusBadge tom="neutral">Inativo</StatusBadge>
        ),
    },
    ...(podeEditar && modo === 'virada'
      ? [
          {
            id: 'acoes',
            cabecalho: '',
            mobile: 'acoes' as const,
            celula: () => (
              <Button tamanho="sm" variante="fantasma">
                <Pencil /> Editar
              </Button>
            ),
          },
        ]
      : []),
  ];
  return (
    <Card
      semPadding
      titulo="Contatos"
      acoes={
        !podeEditar ? undefined : modo === 'virada' ? (
          <Button tamanho="sm" variante="primario">
            <Plus /> Novo contato
          </Button>
        ) : (
          <EditarNaTelaAtual />
        )
      }
    >
      <DataTable
        rotulo="Contatos"
        colunas={colunas}
        linhas={CONTATOS_ALFA_MOCK}
        chaveLinha={(c) => c.id}
      />
    </Card>
  );
}

const TIPOS_BOOK: { valor: TipoBookMock; rotulo: string }[] = [
  { valor: 'nao_tem_book', rotulo: 'Não tem Book' },
  { valor: 'qualidade', rotulo: 'Qualidade' },
  { valor: 'outros', rotulo: 'Outros' },
];
const rotuloTipoBook = (t: TipoBookMock) => TIPOS_BOOK.find((x) => x.valor === t)?.rotulo ?? '—';
const rotuloTemplate = (t: string) => TEMPLATES_BOOK_MOCK.find((x) => x.valor === t)?.rotulo ?? '—';
const nomeEmpresa = (id: string) => EMPRESAS_LISTA_MOCK.find((e) => e.id === id)?.nomeAbreviado;

function AbaBook({
  modo,
  podeEditar,
  temAms,
  dados,
  onEditar,
}: {
  modo: Modo;
  podeEditar: boolean;
  temAms: boolean;
  dados: BookMock;
  onEditar: () => void;
}) {
  const temBook = temAms && dados.tipoBook !== 'nao_tem_book';
  const itens: [string, ReactNode][] = [
    ['Tipo de Book', temAms ? rotuloTipoBook(dados.tipoBook) : 'Sem AMS, sem Book'],
    ...(temBook
      ? ([
          ['Template padrão', rotuloTemplate(dados.template)],
          [
            'Link SharePoint',
            <a
              key="s"
              href="#"
              onClick={(e) => e.preventDefault()}
              className="break-all text-ds-fg-accent hover:underline"
            >
              {dados.sharepoint}
            </a>,
          ],
        ] as [string, ReactNode][])
      : []),
    ...(temAms && dados.tipoBook === 'qualidade'
      ? ([
          ['Book personalizado', simNaoTexto(dados.bookPersonalizado)],
          ['Anexo', simNaoTexto(dados.anexo)],
          [
            'Empresa consolidadora',
            nomeEmpresa(dados.consolidadoraId) ?? 'Nenhuma (aparece nos disparos)',
          ],
        ] as [string, ReactNode][])
      : []),
    ['Meta de SLA', dados.metaSla ? `${dados.metaSla}%` : vazio],
    ['Mínimo de chamados para o SLA', dados.qtdMinimaSla || vazio],
  ];
  return (
    <Card
      titulo="Book"
      acoes={
        !podeEditar ? undefined : modo === 'virada' ? (
          <Button tamanho="sm" variante="fantasma" onClick={onEditar}>
            <Pencil /> Editar
          </Button>
        ) : (
          <EditarNaTelaAtual />
        )
      }
    >
      <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
        {itens.map(([r, v]) => (
          <div key={r}>
            <dt className="flex items-center gap-1 text-xs text-ds-fg-muted">
              {r}
              {DICAS[r] && <InfoDica texto={DICAS[r]} assunto={r} />}
            </dt>
            <dd className="mt-0.5 text-sm text-ds-fg">{v}</dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}

function PainelBook({
  empresa,
  inicial,
  temAms,
  onFechar,
  onSalvar,
}: {
  empresa: string;
  inicial: BookMock;
  temAms: boolean;
  onFechar: () => void;
  onSalvar: (dados: BookMock) => void;
}) {
  const [d, setD] = useState(inicial);
  const set = <K extends keyof BookMock>(k: K, v: BookMock[K]) => setD((x) => ({ ...x, [k]: v }));
  const temBook = temAms && d.tipoBook !== 'nao_tem_book';
  const qualidade = temAms && d.tipoBook === 'qualidade';

  const meta = d.metaSla === '' ? null : Number(d.metaSla);
  const erros = {
    template: temBook && !d.template ? 'Obrigatório.' : null,
    sharepoint: !temBook
      ? null
      : !d.sharepoint.trim()
        ? 'Obrigatório.'
        : /^https?:\/\/\S+$/.test(d.sharepoint.trim())
          ? null
          : 'Informe um endereço que comece com https://',
    metaSla: meta !== null && (meta < 0 || meta > 100) ? 'Entre 0 e 100.' : null,
    qtdMinimaSla:
      d.qtdMinimaSla !== '' &&
      (!Number.isInteger(Number(d.qtdMinimaSla)) || Number(d.qtdMinimaSla) < 0)
        ? 'Número inteiro, zero ou maior.'
        : null,
  };
  const podeSalvar = Object.values(erros).every((e) => !e);

  return (
    <TelaEdicao
      voltarPara={empresa}
      titulo="Editar Book"
      podeSalvar={podeSalvar}
      onFechar={onFechar}
      onSalvar={() =>
        // Mesma normalização do legado: sem Book, limpa template e SharePoint
        onSalvar(temBook ? d : { ...d, template: '', sharepoint: '' })
      }
    >
      <Secao titulo="Book">
        {!temAms ? (
          <Callout tom="info">
            Empresa sem AMS não tem Book. Para mudar, edite a identidade.
          </Callout>
        ) : (
          <>
            <div>
              <Rotulo obrigatorio>Tipo de Book</Rotulo>
              <Escolha
                rotulo="Tipo de Book"
                opcoes={TIPOS_BOOK}
                valor={d.tipoBook}
                onChange={(v) => set('tipoBook', v)}
              />
            </div>
            {temBook && (
              <>
                <div>
                  <Rotulo obrigatorio htmlFor="template">
                    Template padrão
                  </Rotulo>
                  <Select
                    id="template"
                    value={d.template}
                    onChange={(e) => set('template', e.target.value)}
                    className="w-full"
                  >
                    <option value="">Selecione</option>
                    {TEMPLATES_BOOK_MOCK.map((t) => (
                      <option key={t.valor} value={t.valor}>
                        {t.rotulo}
                      </option>
                    ))}
                  </Select>
                  {erros.template && (
                    <p className="mt-1.5 text-xs text-ds-danger-fg">{erros.template}</p>
                  )}
                </div>
                <CampoTexto
                  id="sharepoint"
                  rotulo="Link SharePoint"
                  obrigatorio
                  tipo="url"
                  placeholder="https://"
                  valor={d.sharepoint}
                  onChange={(v) => set('sharepoint', v)}
                  erro={erros.sharepoint}
                />
              </>
            )}
            {inicial.tipoBook !== 'nao_tem_book' && d.tipoBook === 'nao_tem_book' && (
              <Callout tom="warning">
                Ao salvar, o template e o link do SharePoint são apagados.
              </Callout>
            )}
          </>
        )}
      </Secao>

      {qualidade && (
        <Secao titulo="Opções do Book de Qualidade">
          <Interruptor
            rotulo="Book personalizado"

            ligado={d.bookPersonalizado}
            onChange={(v) => set('bookPersonalizado', v)}
          />
          <Interruptor rotulo="Anexo" ligado={d.anexo} onChange={(v) => set('anexo', v)} />
          <div>
            <Rotulo htmlFor="consolidadora">Empresa consolidadora</Rotulo>
            <Select
              id="consolidadora"
              value={d.consolidadoraId}
              onChange={(e) => set('consolidadoraId', e.target.value)}
              className="w-full"
            >
              <option value="">Nenhuma (aparece nos disparos)</option>
              {EMPRESAS_LISTA_MOCK.filter((e) => e.id !== 'alfa' && e.status === 'ativo').map(
                (e) => (
                  <option key={e.id} value={e.id}>
                    {e.nomeAbreviado}
                  </option>
                )
              )}
            </Select>
          </div>
        </Secao>
      )}

      <Secao titulo="SLA">
        <div className="grid gap-4 sm:grid-cols-2">
          <CampoTexto
            id="meta-sla"
            rotulo="Meta de SLA (%)"
            tipo="number"
            valor={d.metaSla}
            onChange={(v) => set('metaSla', v)}
            erro={erros.metaSla}
          />
          <CampoTexto
            id="qtd-sla"
            rotulo="Mínimo de chamados para o SLA"
            tipo="number"
            valor={d.qtdMinimaSla}
            onChange={(v) => set('qtdMinimaSla', v)}
            erro={erros.qtdMinimaSla}
          />
        </div>
      </Secao>
    </TelaEdicao>
  );
}

/* ------------------------------------------------------------------ */
/* Detalhe                                                              */
/* ------------------------------------------------------------------ */

function Detalhe({
  estado,
  modo,
  permissoes,
  editarAoAbrir,
  onVoltar,
}: {
  estado: PrototipoProps['estado'];
  modo: Modo;
  permissoes: Permissoes;
  /** Veio do "Editar" do menu da lista: abre com o painel da identidade */
  editarAoAbrir: boolean;
  onVoltar: () => void;
}) {
  const [aba, setAba] = useState('informacoes');
  const [inativarEmpresa, setInativarEmpresa] = useState(false);
  const soLeitura = !permissoes.empresa && !permissoes.bancos;
  const [alterado, setAlterado] = useState(false);
  const [painel, setPainel] = useState<{ aberto: boolean; banco: BancoCadastroMock | null }>({
    aberto: false,
    banco: null,
  });
  const [identidade, setIdentidade] = useState(IDENTIDADE_ALFA_MOCK);
  const [book, setBook] = useState(BOOK_ALFA_MOCK);
  const [editando, setEditando] = useState<'identidade' | 'ams' | 'book' | null>(
    editarAoAbrir ? 'identidade' : null
  );

  const abas = [
    { valor: 'informacoes', rotulo: 'Informações' },
    { valor: 'bancos', rotulo: 'Bancos de Horas', contador: BANCOS_ALFA_MOCK.length },
    {
      valor: 'contatos',
      rotulo: 'Contatos',
      contador: CONTATOS_ALFA_MOCK.filter((c) => c.ativo).length,
    },
    { valor: 'book', rotulo: 'Book' },
  ];

  const conteudo = () => {
    if (estado === 'carregando')
      return (
        <div
          className="h-80 animate-pulse rounded-xl bg-ds-bg-surface"
          role="status"
          aria-label="Carregando"
        />
      );
    if (estado === 'erro')
      return (
        <div className="space-y-3">
          <Callout tom="danger" titulo="Não foi possível carregar a empresa">
            Verifique a conexão e tente novamente.
          </Callout>
          <Button>Tentar novamente</Button>
        </div>
      );
    if (aba === 'informacoes')
      return permissoes.empresa ? (
        <AbaInformacoes onAlterar={() => setAlterado(true)} />
      ) : (
        <AbaInformacoesLeitura />
      );
    if (aba === 'bancos') {
      if (estado === 'vazio')
        return (
          <div className="rounded-xl border border-ds-border bg-ds-bg-surface">
            <EmptyState
              icone={<Building2 />}
              titulo="Nenhum banco de horas"
              descricao={
                permissoes.bancos
                  ? 'Comece pelo Banco padrão, copiando a parametrização atual da empresa.'
                  : undefined
              }
              acao={
                permissoes.bancos ? (
                  <Button variante="primario">Criar a partir dos parâmetros atuais</Button>
                ) : undefined
              }
            />
          </div>
        );
      return (
        <AbaBancos
          podeEditar={permissoes.bancos}
          onEditar={(banco) => setPainel({ aberto: true, banco })}
        />
      );
    }
    if (aba === 'contatos') return <AbaContatos modo={modo} podeEditar={permissoes.empresa} />;
    return (
      <AbaBook
        modo={modo}
        podeEditar={permissoes.empresa}
        temAms={identidade.temAms}
        dados={book}
        onEditar={() => setEditando('book')}
      />
    );
  };

  // Um nível a mais: a edição ocupa a tela; "voltar" retorna para a empresa
  if (editando === 'identidade')
    return (
      <PainelIdentidade
        inicial={identidade}
        onFechar={() => setEditando(null)}
        onSalvar={(d) => {
          setIdentidade(d);
          setEditando(null);
        }}
      />
    );
  if (editando === 'ams')
    return (
      <PainelAmsProjetos
        inicial={identidade}
        onFechar={() => setEditando(null)}
        onSalvar={(d) => {
          setIdentidade(d);
          setEditando(null);
        }}
      />
    );
  if (editando === 'book')
    return (
      <PainelBook
        empresa={identidade.nomeAbreviado}
        inicial={book}
        temAms={identidade.temAms}
        onFechar={() => setEditando(null)}
        onSalvar={(d) => {
          setBook(d);
          setEditando(null);
        }}
      />
    );
  if (painel.aberto)
    return (
      <PainelBanco
        key={painel.banco?.id ?? 'novo'}
        empresa={identidade.nomeAbreviado}
        solucoes={identidade.solucoes}
        solucoesAms={identidade.solucoesAms}
        banco={painel.banco}
        onFechar={() => setPainel({ aberto: false, banco: null })}
      />
    );

  return (
    <>
      <FaixaTopo>
        <div className="pb-24 pt-1 md:pb-28">
          <button type="button" onClick={onVoltar} className={cn(botaoVidro, 'h-9 md:h-8')}>
            <ArrowLeft className="h-4 w-4" /> Empresas
          </button>
          <div className="ds-surgir mt-4 max-w-3xl">
            <h1 className="font-ds-title text-[26px] font-semibold leading-8 tracking-tight md:text-[34px] md:leading-[42px]">
              {identidade.nomeAbreviado}
            </h1>
          </div>
          <div className="ds-surgir mt-3 flex flex-wrap gap-2" style={atraso(100)}>
            <SeloTopo tom="success">
              <CheckCircle2 className="h-3.5 w-3.5" /> Ativa
            </SeloTopo>
            <SeloTopo tom="warning">
              <AlertTriangle className="h-3.5 w-3.5" /> Legado (em validação)
            </SeloTopo>
            {soLeitura && (
              <SeloTopo tom="neutral">
                <Eye className="h-3.5 w-3.5" /> Somente visualização
              </SeloTopo>
            )}
            {permissoes.empresa && modo === 'transicao' && (
              <a
                href="#"
                onClick={(e) => e.preventDefault()}
                className={cn(botaoVidro, 'h-7 rounded-full px-2.5 text-xs md:h-7')}
              >
                <ExternalLink className="h-3.5 w-3.5" /> Abrir na tela atual
              </a>
            )}
            {permissoes.empresa && modo === 'virada' && (
              <button
                type="button"
                onClick={() => setInativarEmpresa(true)}
                className={cn(botaoVidro, 'h-7 rounded-full px-2.5 text-xs text-[#FF8A80] md:h-7')}
              >
                <XCircle className="h-3.5 w-3.5" /> Inativar empresa
              </button>
            )}
          </div>
        </div>
      </FaixaTopo>

      <ConfirmDialog
        aberto={inativarEmpresa}
        onOpenChange={setInativarEmpresa}
        titulo={`Inativar ${identidade.nomeAbreviado}?`}
        consequencias={[
          'Ela sai dos books e do cálculo dos bancos a partir do próximo mês aberto',
          'Histórico, meses fechados e faturamento continuam guardados',
          'Pode ser reativada depois',
        ]}
        rotuloConfirmar="Inativar"
        tom="perigo"
        justificativa={{ rotulo: 'Motivo', placeholder: 'Ex.: fim do contrato' }}
        onConfirmar={() => setInativarEmpresa(false)}
      />

      <Identidade
        modo={modo}
        podeEditar={permissoes.empresa}
        dados={identidade}
        onEditar={() => setEditando('identidade')}
        onEditarAms={() => setEditando('ams')}
      />

      <div className="mt-6 space-y-4">
        <div className="sticky top-0 z-[5] -mx-1 flex justify-center bg-ds-bg-page px-1 py-1.5">
          <SegmentedTabs rotulo="Seções da empresa" itens={abas} valor={aba} onChange={setAba} />
        </div>
        <div key={aba}>{conteudo()}</div>
      </div>

      {alterado && aba === 'informacoes' && (
        <BarraRodape>
          <span className="hidden text-sm text-ds-fg-secondary sm:inline">
            Alterações não salvas
          </span>
          <div className="flex flex-1 justify-end gap-2 sm:flex-none">
            <Button onClick={() => setAlterado(false)}>Descartar</Button>
            <Button
              variante="primario"
              className="flex-1 sm:flex-none"
              onClick={() => setAlterado(false)}
            >
              Salvar
            </Button>
          </div>
        </BarraRodape>
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Tela                                                                 */
/* ------------------------------------------------------------------ */

export default function Empresas({ estado }: PrototipoProps) {
  const [menuExpandido, setMenuExpandido] = useState(false);
  const [modo, setModo] = useState<Modo>('transicao');
  const [aberta, setAberta] = useState<string | null>(null);
  const [editarAoAbrir, setEditarAoAbrir] = useState(false);
  const [perfil, setPerfil] = useState<'edicao' | 'misto' | 'leitura'>('edicao');
  // Duas telas em screen_permissions (Modelagem Fase 1, P4): `empresas` e `bancos_horas_parametros`
  const permissoes: Permissoes = { empresa: perfil !== 'leitura', bancos: perfil === 'edicao' };

  return (
    <DicasContext.Provider value={DICAS}>
      <PaginaV2
        menuAtivo="Empresas"
        menuExpandido={menuExpandido}
        onToggleMenu={() => setMenuExpandido((v) => !v)}
      >
        {/* Só do protótipo: momento (transição = Fases 3 a 5; virada = Fase 6) e perfil de acesso */}
        <div className="mb-3 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-lg border border-dashed border-ds-border-strong px-3 py-2 text-xs text-ds-fg-secondary">
          <ChavePrototipo<Modo>
            rotulo="Momento"
            opcoes={[
              ['transicao', 'Transição'],
              ['virada', 'Após a virada'],
            ]}
            valor={modo}
            onChange={setModo}
          />
          <ChavePrototipo<typeof perfil>
            rotulo="Perfil"
            opcoes={[
              ['edicao', 'Edita tudo'],
              ['misto', 'Edita a empresa, só vê os bancos'],
              ['leitura', 'Só visualiza'],
            ]}
            valor={perfil}
            onChange={setPerfil}
          />
        </div>

        {aberta ? (
          <Detalhe
            estado={estado}
            modo={modo}
            permissoes={permissoes}
            editarAoAbrir={editarAoAbrir}
            onVoltar={() => setAberta(null)}
          />
        ) : (
          <Lista
            estado={estado}
            modo={modo}
            podeEditar={permissoes.empresa}
            onAbrir={(id) => {
              setEditarAoAbrir(false);
              setAberta(id);
            }}
            onEditar={(id) => {
              setEditarAoAbrir(true);
              setAberta(id);
            }}
          />
        )}
      </PaginaV2>
    </DicasContext.Provider>
  );
}
