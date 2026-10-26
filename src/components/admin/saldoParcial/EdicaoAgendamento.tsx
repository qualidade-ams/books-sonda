// Criação e edição de um agendamento de Saldo Parcial (nível a mais na tela, no lugar do modal):
// nome, recorrência com a prévia dos próximos envios (calculada pelo sync-api), empresas e cópia.
// A recorrência é a mesma da Sincronização e é validada de novo no sync-api.
import { useEffect, useMemo, useState, type ClipboardEvent, type KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { z } from 'zod';
import { Plus, Search } from 'lucide-react';
import { Callout } from '@/components/ds/Callout';
import { Button } from '@/components/ds/Button';
import {
  Ajuda,
  CampoNumero,
  Chip,
  Escolha,
  Interruptor,
  Rotulo,
  Secao,
  TelaEdicao,
} from '@/components/ds/Formulario';
import { campo } from '@/components/ds/estilos';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import {
  useAgendamentosSaldoParcial,
  useClientesElegiveisSaldoParcial,
  usePreverExecucoesSaldoParcial,
  useSalvarAgendamentoSaldoParcial,
} from '@/hooks/useEnvioSaldoParcial';
import {
  adicionarEmailsCc,
  agendamentoSaldoParcialFormSchema,
  agendamentoSaldoParcialParaForm,
  extrairEmailsCc,
  formParaAgendamentoSaldoParcialInput,
  removerEmailsCc,
  valoresIniciaisAgendamentoSaldoParcial,
  type AgendamentoSaldoParcialFormValues,
} from '@/schemas/envioSaldoParcialSchemas';
import {
  camposRegraRecorrenciaSchema,
  regraFormParaRegra,
  validarRegraRecorrenciaForm,
} from '@/schemas/syncAgendamentoSchemas';
import { descreverRecorrencia } from '@/utils/descreverRecorrencia';
import { execucoesParaPrevisao } from '@/utils/previsaoExecucoes';
import { extrairEmailsDeTexto } from '@/utils/emailValidation';
import { plural } from '@/utils/plural';
import type {
  AgendamentoSaldoParcial,
  ClienteElegivelSaldoParcial,
} from '@/types/envioSaldoParcial';
import type { FrequenciaAgendamento, ModoHorarioAgendamento } from '@/types/syncAgendamentos';
import { dataHoraBrasilia } from './formato';

// Só os campos de recorrência, para pedir a prévia sem exigir nome e empresas
const regraSchema = z.object(camposRegraRecorrenciaSchema).superRefine(validarRegraRecorrenciaForm);
const REGEX_EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Segunda primeiro, domingo por último
const SEMANA = [1, 2, 3, 4, 5, 6, 0];
const DIAS_DO_MES = Array.from({ length: 31 }, (_, i) => i + 1);

/** Botão de dia (semana ou mês), marcado ou não */
function BotaoDia({
  marcado,
  onClick,
  children,
}: {
  marcado: boolean;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={marcado}
      onClick={onClick}
      className={cn(
        'h-9 min-w-9 rounded-lg border px-2 text-sm tabular-nums transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-focus',
        marcado
          ? 'border-[#00D4E8] bg-ds-accent-subtle font-medium text-ds-fg-accent'
          : 'border-ds-border-strong text-ds-fg-secondary hover:text-ds-fg'
      )}
    >
      {children}
    </button>
  );
}

export function EdicaoAgendamento({
  agendamento,
  onFechar,
}: {
  /** Nulo: novo agendamento */
  agendamento: AgendamentoSaldoParcial | null;
  onFechar: () => void;
}) {
  const { t, i18n } = useTranslation();
  const e = (chave: string, valores?: Record<string, unknown>) =>
    t(`rotinasSaldoParcial.edicao.${chave}`, valores);
  const { toast } = useToast();
  const { clientes } = useClientesElegiveisSaldoParcial();
  const { agendamentos } = useAgendamentosSaldoParcial();
  const salvar = useSalvarAgendamentoSaldoParcial();

  const [v, setV] = useState<AgendamentoSaldoParcialFormValues>(() =>
    agendamento
      ? agendamentoSaldoParcialParaForm(agendamento)
      : valoresIniciaisAgendamentoSaldoParcial()
  );
  const mudar = (patch: Partial<AgendamentoSaldoParcialFormValues>) =>
    setV((atual) => ({ ...atual, ...patch }));
  const [novoHorario, setNovoHorario] = useState('');
  const [busca, setBusca] = useState('');
  const [novoCc, setNovoCc] = useState('');
  const [ccInvalido, setCcInvalido] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const validacao = agendamentoSaldoParcialFormSchema.safeParse(v);
  const erros = new Map(
    validacao.success ? [] : validacao.error.issues.map((i) => [String(i.path[0]), i.message])
  );
  const erro = (campo: string) =>
    erros.get(campo) ? (
      <p className="mt-1.5 text-xs text-ds-danger-fg">{t(erros.get(campo)!)}</p>
    ) : null;

  // Prévia dos próximos envios: espera parar de mexer na regra antes de perguntar ao sync-api
  const regra = useMemo(() => regraFormParaRegra(v), [v]);
  const regraValida = regraSchema.safeParse(v).success;
  const chaveRegra = JSON.stringify(regra);
  const [regraPrevia, setRegraPrevia] = useState(regra);
  useEffect(() => {
    const id = setTimeout(() => setRegraPrevia(JSON.parse(chaveRegra)), 400);
    return () => clearTimeout(id);
  }, [chaveRegra]);
  const previa = usePreverExecucoesSaldoParcial(regraPrevia, regraValida);
  const proximos = execucoesParaPrevisao(previa.previsao).execucoes;

  // Empresa de outro agendamento: bloqueada (cada empresa fica em um só)
  const emOutro = useMemo(
    () =>
      new Map(
        agendamentos
          .filter((a) => a.id !== agendamento?.id)
          .flatMap((a) => (a.empresas ?? []).map((x) => [x.empresa_id, a.nome] as const))
      ),
    [agendamentos, agendamento?.id]
  );
  const termo = busca.trim().toLowerCase();
  const visiveis = termo ? clientes.filter((c) => c.nome.toLowerCase().includes(termo)) : clientes;
  const copia = extrairEmailsCc(v.emailsCcTexto);

  const alternarEmpresa = (cliente: ClienteElegivelSaldoParcial, marcar: boolean) => {
    setV((atual) => {
      const empresaIds = marcar
        ? [...atual.empresaIds, cliente.id]
        : atual.empresaIds.filter((x) => x !== cliente.id);
      // O gestor entra na cópia ao marcar; ao desmarcar sai, se outra marcada não tiver o mesmo
      const gestor = cliente.emailGestor;
      let emailsCcTexto = atual.emailsCcTexto;
      if (gestor && marcar) emailsCcTexto = adicionarEmailsCc(emailsCcTexto, [gestor]);
      if (gestor && !marcar) {
        const emUso = clientes.some(
          (c) => empresaIds.includes(c.id) && c.emailGestor?.toLowerCase() === gestor.toLowerCase()
        );
        if (!emUso) emailsCcTexto = removerEmailsCc(emailsCcTexto, [gestor]);
      }
      return { ...atual, empresaIds, emailsCcTexto };
    });
  };

  const incluirCc = (emails: string[]) =>
    setV((atual) => ({ ...atual, emailsCcTexto: adicionarEmailsCc(atual.emailsCcTexto, emails) }));

  const teclaNoCc = (ev: KeyboardEvent<HTMLInputElement>) => {
    if (!['Enter', ',', ';'].includes(ev.key)) return;
    ev.preventDefault();
    const digitados = extrairEmailsCc(novoCc);
    if (!digitados.length) return;
    if (digitados.some((x) => !REGEX_EMAIL.test(x))) {
      setCcInvalido(true);
      return;
    }
    incluirCc(digitados);
    setNovoCc('');
    setCcInvalido(false);
  };

  // Colado do Outlook ("Nome <email>; ..."): só os endereços
  const colarNoCc = (ev: ClipboardEvent<HTMLInputElement>) => {
    const emails = extrairEmailsDeTexto(ev.clipboardData.getData('text'));
    if (!emails.length) return;
    ev.preventDefault();
    incluirCc(emails);
    setCcInvalido(false);
  };

  const alternarDiaSemana = (d: number) =>
    mudar({
      dias_semana: v.dias_semana.includes(d)
        ? v.dias_semana.filter((x) => x !== d)
        : [...v.dias_semana, d],
    });
  const alternarDiaMes = (d: number) =>
    mudar({
      dias_mes: v.dias_mes.includes(d) ? v.dias_mes.filter((x) => x !== d) : [...v.dias_mes, d],
    });

  const gravar = async () => {
    setSalvando(true);
    try {
      await salvar.mutateAsync({
        id: agendamento?.id,
        dados: formParaAgendamentoSaldoParcialInput(v),
      });
      toast({ title: t('envioSaldoParcial.toasts.salvo') });
      onFechar();
    } catch (err) {
      toast({
        title: t('envioSaldoParcial.toasts.erroSalvar'),
        description: err instanceof Error ? err.message : undefined,
        variant: 'destructive',
      });
    } finally {
      setSalvando(false);
    }
  };

  return (
    <TelaEdicao
      voltarPara={e('voltar')}
      titulo={agendamento ? e('tituloEditar', { nome: agendamento.nome }) : e('tituloNovo')}
      podeSalvar={validacao.success && !salvando}
      rotuloSalvar={agendamento ? undefined : e('criar')}
      onFechar={onFechar}
      onSalvar={gravar}
    >
      <Secao titulo={e('secaoIdentificacao')}>
        <div>
          <Rotulo obrigatorio htmlFor="nome-agendamento-saldo">
            {e('nome')}
          </Rotulo>
          <input
            id="nome-agendamento-saldo"
            value={v.nome}
            maxLength={120}
            onChange={(ev) => mudar({ nome: ev.target.value })}
            placeholder={e('nomePlaceholder')}
            className={campo}
          />
        </div>
        <Interruptor ligado={v.ativo} onChange={(ativo) => mudar({ ativo })} rotulo={e('ativo')} />
      </Secao>

      <Secao titulo={e('secaoRecorrencia')}>
        <div className="max-w-md">
          <Rotulo obrigatorio>{e('frequencia')}</Rotulo>
          <Escolha<FrequenciaAgendamento>
            rotulo={e('frequencia')}
            opcoes={(['diario', 'semanal', 'mensal'] as const).map((f) => ({
              valor: f,
              rotulo: e(`frequencias.${f}`),
            }))}
            valor={v.frequencia}
            onChange={(frequencia) => mudar({ frequencia })}
          />
        </div>
        {v.frequencia === 'semanal' && (
          <div>
            <p className="mb-1.5 text-sm font-medium">{e('diasSemana')}</p>
            <div className="flex flex-wrap gap-1.5" role="group" aria-label={e('diasSemana')}>
              {SEMANA.map((d) => (
                <BotaoDia
                  key={d}
                  marcado={v.dias_semana.includes(d)}
                  onClick={() => alternarDiaSemana(d)}
                >
                  {t(`sincronizacaoSql.diasSemana.d${d}`)}
                </BotaoDia>
              ))}
            </div>
            {erro('dias_semana')}
          </div>
        )}
        {v.frequencia === 'mensal' && (
          <div>
            <p className="mb-1.5 text-sm font-medium">{e('diasMes')}</p>
            <div className="flex flex-wrap gap-1.5" role="group" aria-label={e('diasMes')}>
              {DIAS_DO_MES.map((d) => (
                <BotaoDia
                  key={d}
                  marcado={v.dias_mes.includes(d)}
                  onClick={() => alternarDiaMes(d)}
                >
                  {String(d)}
                </BotaoDia>
              ))}
              <BotaoDia
                marcado={v.ultimo_dia_mes}
                onClick={() => mudar({ ultimo_dia_mes: !v.ultimo_dia_mes })}
              >
                {e('ultimoDia')}
              </BotaoDia>
            </div>
            {erro('dias_mes')}
          </div>
        )}

        <div className="space-y-3">
          <div className="max-w-md">
            <Rotulo obrigatorio>{e('horarios')}</Rotulo>
            <Escolha<ModoHorarioAgendamento>
              rotulo={e('horarios')}
              opcoes={(['horarios', 'intervalo'] as const).map((m) => ({
                valor: m,
                rotulo: e(`modos.${m}`),
              }))}
              valor={v.modo_horario}
              onChange={(modo_horario) => mudar({ modo_horario })}
            />
          </div>
          {v.modo_horario === 'horarios' ? (
            <div>
              <div className="flex flex-wrap items-center gap-1.5">
                {v.horarios.map((h) => (
                  <Chip
                    key={h}
                    onRemover={() => mudar({ horarios: v.horarios.filter((x) => x !== h) })}
                  >
                    {h}
                  </Chip>
                ))}
                <input
                  type="time"
                  aria-label={e('novoHorario')}
                  value={novoHorario}
                  onChange={(ev) => setNovoHorario(ev.target.value)}
                  className={cn(campo, 'w-32')}
                />
                <Button
                  tamanho="sm"
                  disabled={!novoHorario || v.horarios.includes(novoHorario)}
                  onClick={() => {
                    mudar({ horarios: [...v.horarios, novoHorario].sort() });
                    setNovoHorario('');
                  }}
                >
                  <Plus /> {e('incluir')}
                </Button>
              </div>
              {erro('horarios')}
            </div>
          ) : (
            <div>
              <div className="flex flex-wrap items-end gap-3">
                <div>
                  <Rotulo htmlFor="saldo-intervalo-das">{e('das')}</Rotulo>
                  <input
                    id="saldo-intervalo-das"
                    type="time"
                    value={v.hora_inicio}
                    onChange={(ev) => mudar({ hora_inicio: ev.target.value })}
                    className={cn(campo, 'w-32')}
                  />
                </div>
                <div>
                  <Rotulo htmlFor="saldo-intervalo-ate">{e('ate')}</Rotulo>
                  <input
                    id="saldo-intervalo-ate"
                    type="time"
                    value={v.hora_fim}
                    onChange={(ev) => mudar({ hora_fim: ev.target.value })}
                    className={cn(campo, 'w-32')}
                  />
                </div>
                <div className="w-32">
                  <Rotulo htmlFor="saldo-intervalo-cada">{e('aCada')}</Rotulo>
                  <CampoNumero
                    id="saldo-intervalo-cada"
                    min={1}
                    max={23}
                    valor={v.intervalo_horas === null ? '' : String(v.intervalo_horas)}
                    onChange={(n) => mudar({ intervalo_horas: n === '' ? null : Number(n) })}
                  />
                </div>
              </div>
              {erro('intervalo_horas') ?? erro('hora_inicio') ?? erro('hora_fim')}
            </div>
          )}
        </div>

        {regraValida && (
          <Callout tom="info" titulo={descreverRecorrencia(regra, t)}>
            {previa.isFetching ? (
              <span role="status">{e('calculando')}</span>
            ) : previa.error ? (
              e('semPrevia')
            ) : (
              proximos.length > 0 &&
              e('proximos', {
                datas: proximos.map((p) => dataHoraBrasilia(p, i18n.language)).join(' · '),
              })
            )}
          </Callout>
        )}
      </Secao>

      <Secao titulo={e('secaoEmpresas')}>
        <label className="relative block md:w-80">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ds-fg-muted"
            aria-hidden
          />
          <input
            type="search"
            aria-label={e('buscarEmpresa')}
            placeholder={e('buscarEmpresa')}
            value={busca}
            onChange={(ev) => setBusca(ev.target.value)}
            className={cn(campo, 'pl-9')}
          />
        </label>
        <ul
          className="max-h-80 divide-y divide-ds-border overflow-y-auto rounded-lg border border-ds-border"
          aria-label={e('secaoEmpresas')}
        >
          {visiveis.map((c) => {
            const outro = emOutro.get(c.id);
            const marcado = v.empresaIds.includes(c.id);
            return (
              <li key={c.id}>
                <label
                  className={cn(
                    'flex min-h-11 items-center gap-3 px-3 py-2 text-sm',
                    outro ? 'text-ds-fg-disabled' : 'cursor-pointer hover:bg-ds-bg-subtle'
                  )}
                >
                  <input
                    type="checkbox"
                    checked={marcado}
                    disabled={!!outro}
                    onChange={() => alternarEmpresa(c, !marcado)}
                    className="h-4 w-4 accent-ds-accent"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="font-medium">{c.nome}</span>
                    <span className="block text-xs text-ds-fg-muted">
                      {c.qtdContatosSaldoParcial ? (
                        plural(t, 'rotinasSaldoParcial.sem.contatos', c.qtdContatosSaldoParcial)
                      ) : (
                        <span className="text-ds-warning-fg">
                          {t('rotinasSaldoParcial.sem.semContato')}
                        </span>
                      )}
                    </span>
                  </span>
                  {outro && (
                    <span className="shrink-0 text-xs">{e('emOutro', { nome: outro })}</span>
                  )}
                </label>
              </li>
            );
          })}
        </ul>
        <Ajuda>{plural(t, 'rotinasSaldoParcial.edicao.marcadas', v.empresaIds.length)}</Ajuda>
      </Secao>

      <Secao titulo={e('secaoEmail')}>
        <div>
          <Rotulo htmlFor="saldo-copia">{e('copia')}</Rotulo>
          <div className="flex flex-wrap items-center gap-1.5">
            <ul className="contents" aria-label={e('copia')}>
              {copia.map((email) => (
                <li key={email} className="max-w-full">
                  <Chip
                    onRemover={() =>
                      mudar({ emailsCcTexto: removerEmailsCc(v.emailsCcTexto, [email]) })
                    }
                  >
                    {email}
                  </Chip>
                </li>
              ))}
            </ul>
            <input
              id="saldo-copia"
              value={novoCc}
              onChange={(ev) => {
                setNovoCc(ev.target.value);
                setCcInvalido(false);
              }}
              onKeyDown={teclaNoCc}
              onPaste={colarNoCc}
              placeholder={e('copiaPlaceholder')}
              aria-invalid={ccInvalido || undefined}
              className={cn(campo, 'w-64')}
            />
          </div>
          {ccInvalido && <p className="mt-1.5 text-xs text-ds-danger-fg">{e('emailInvalido')}</p>}
          {erro('emailsCcTexto')}
          <Ajuda>{e('copiaAjuda')}</Ajuda>
        </div>
      </Secao>
    </TelaEdicao>
  );
}
