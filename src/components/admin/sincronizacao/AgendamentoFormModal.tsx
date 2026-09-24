/**
 * Modal de criação/edição de agendamento de sincronização SQL Server.
 * Mostra a previsão das próximas execuções calculada pelo sync-api.
 */

import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { Loader2, Plus, X, CalendarClock } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { usePreverExecucoes } from '@/hooks/useSyncAgendamentos';
import {
  agendamentoFormSchema,
  agendamentoParaForm,
  formParaAgendamentoInput,
  valoresIniciaisAgendamento,
  TABELAS_SYNC,
  type AgendamentoFormValues,
} from '@/schemas/syncAgendamentoSchemas';
import type { SyncAgendamento, SyncAgendamentoInput } from '@/types/syncAgendamentos';

interface AgendamentoFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agendamento: SyncAgendamento | null;
  onSalvar: (dados: SyncAgendamentoInput) => Promise<void>;
  salvando: boolean;
}

const ORDEM_SEMANA = [1, 2, 3, 4, 5, 6, 0];
const DIAS_MES = Array.from({ length: 31 }, (_, i) => i + 1);

const classeOpcao = (ativo: boolean) =>
  ativo
    ? 'bg-sonda-blue text-white border-sonda-blue hover:bg-sonda-dark-blue'
    : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50';

export function AgendamentoFormModal({ open, onOpenChange, agendamento, onSalvar, salvando }: AgendamentoFormModalProps) {
  const { t, i18n } = useTranslation();

  const form = useForm<AgendamentoFormValues>({
    resolver: zodResolver(agendamentoFormSchema),
    defaultValues: agendamento ? agendamentoParaForm(agendamento) : valoresIniciaisAgendamento(),
  });

  const { register, watch, setValue, handleSubmit, reset, formState } = form;
  const { errors } = formState;

  useEffect(() => {
    if (open) reset(agendamento ? agendamentoParaForm(agendamento) : valoresIniciaisAgendamento());
  }, [open, agendamento, reset]);

  const valores = watch();

  // Regra normalizada (com nome/tabela fictícios) para validar só a recorrência
  const regra = useMemo(() => formParaAgendamentoInput({ ...valores, nome: valores.nome || '-' }), [valores]);
  const regraValida = useMemo(
    () =>
      agendamentoFormSchema.safeParse({
        ...valores,
        nome: '-',
        tabelas: { ...valores.tabelas, pesquisas: true },
      }).success,
    [valores]
  );

  // Espera o usuário parar de digitar antes de pedir a previsão
  const [regraPrevisao, setRegraPrevisao] = useState(regra);
  const chaveRegra = JSON.stringify(regra);
  useEffect(() => {
    const id = setTimeout(() => setRegraPrevisao(JSON.parse(chaveRegra)), 400);
    return () => clearTimeout(id);
  }, [chaveRegra]);

  const { previsao, isFetching, error: erroPrevisao } = usePreverExecucoes(regraPrevisao, open && regraValida);

  const formatarData = (iso: string) =>
    new Date(iso).toLocaleString(i18n.language || 'pt-BR', {
      timeZone: 'America/Sao_Paulo',
      weekday: 'short',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  const alternarLista = (campo: 'dias_semana' | 'dias_mes', valor: number) => {
    const atual = valores[campo];
    setValue(campo, atual.includes(valor) ? atual.filter((v) => v !== valor) : [...atual, valor], {
      shouldValidate: formState.isSubmitted,
    });
  };

  const alterarHorario = (indice: number, hora: string) => {
    const lista = [...valores.horarios];
    lista[indice] = hora;
    setValue('horarios', lista, { shouldValidate: formState.isSubmitted });
  };

  const erro = (mensagem?: string) =>
    mensagem ? <p className="text-sm text-red-500">{t(mensagem)}</p> : null;

  const onSubmit = async (v: AgendamentoFormValues) => {
    await onSalvar(formParaAgendamentoInput(v));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-sonda-blue">
            {agendamento ? t('sincronizacaoSql.form.tituloEditar') : t('sincronizacaoSql.form.tituloNovo')}
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-500">{t('sincronizacaoSql.form.descricao')}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Nome + ativo */}
          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4 items-end">
            <div className="space-y-2">
              <Label htmlFor="agendamento-nome">{t('sincronizacaoSql.form.nome')}</Label>
              <Input
                id="agendamento-nome"
                placeholder={t('sincronizacaoSql.form.nomePlaceholder')}
                className={
                  errors.nome
                    ? 'border-red-500 focus:ring-red-500 focus:border-red-500'
                    : 'focus:ring-sonda-blue focus:border-sonda-blue'
                }
                {...register('nome')}
              />
              {erro(errors.nome?.message)}
            </div>
            <div className="flex items-center gap-2 pb-2">
              <Switch
                id="agendamento-ativo"
                checked={valores.ativo}
                onCheckedChange={(v) => setValue('ativo', v)}
              />
              <Label htmlFor="agendamento-ativo">{t('sincronizacaoSql.form.ativo')}</Label>
            </div>
          </div>

          {/* Tabelas */}
          <div className="space-y-3">
            <Label>{t('sincronizacaoSql.form.tabelas')}</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {TABELAS_SYNC.map((tabela) => (
                <label key={tabela} className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox
                    checked={valores.tabelas[tabela]}
                    onCheckedChange={(v) => setValue(`tabelas.${tabela}`, !!v, { shouldValidate: formState.isSubmitted })}
                  />
                  {t(`sincronizacaoSql.tabelas.${tabela}`)}
                </label>
              ))}
            </div>
            {erro(errors.tabelas?.message)}

            <Label className="block pt-2">{t('sincronizacaoSql.form.posProcessamento')}</Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox
                  checked={valores.tabelas.detectarInconsistencias}
                  onCheckedChange={(v) => setValue('tabelas.detectarInconsistencias', !!v)}
                />
                {t('sincronizacaoSql.tabelas.detectarInconsistencias')}
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox
                  checked={valores.tabelas.ajustesRetroativos}
                  disabled={!valores.tabelas.apontamentos}
                  onCheckedChange={(v) => setValue('tabelas.ajustesRetroativos', !!v)}
                />
                <span>
                  {t('sincronizacaoSql.tabelas.ajustesRetroativos')}
                  <span className="block text-xs text-gray-500">{t('sincronizacaoSql.form.ajustesRetroativosAjuda')}</span>
                </span>
              </label>
            </div>
          </div>

          {/* Frequência */}
          <div className="space-y-3">
            <Label>{t('sincronizacaoSql.form.frequencia')}</Label>
            <div className="flex flex-wrap gap-2">
              {(['diario', 'semanal', 'mensal'] as const).map((f) => (
                <Button
                  key={f}
                  type="button"
                  variant="outline"
                  size="sm"
                  aria-pressed={valores.frequencia === f}
                  className={classeOpcao(valores.frequencia === f)}
                  onClick={() => setValue('frequencia', f, { shouldValidate: formState.isSubmitted })}
                >
                  {t(`sincronizacaoSql.form.${f}`)}
                </Button>
              ))}
            </div>

            {valores.frequencia === 'semanal' && (
              <div className="space-y-2">
                <p className="text-sm text-gray-600">{t('sincronizacaoSql.form.diasSemana')}</p>
                <div className="flex flex-wrap gap-2">
                  {ORDEM_SEMANA.map((d) => (
                    <Button
                      key={d}
                      type="button"
                      variant="outline"
                      size="sm"
                      aria-pressed={valores.dias_semana.includes(d)}
                      className={`w-14 capitalize ${classeOpcao(valores.dias_semana.includes(d))}`}
                      onClick={() => alternarLista('dias_semana', d)}
                    >
                      {t(`sincronizacaoSql.diasSemana.d${d}`)}
                    </Button>
                  ))}
                </div>
                {erro(errors.dias_semana?.message)}
              </div>
            )}

            {valores.frequencia === 'mensal' && (
              <div className="space-y-2">
                <p className="text-sm text-gray-600">{t('sincronizacaoSql.form.diasMes')}</p>
                <div className="grid grid-cols-7 gap-1 max-w-sm">
                  {DIAS_MES.map((d) => (
                    <Button
                      key={d}
                      type="button"
                      variant="outline"
                      size="sm"
                      aria-pressed={valores.dias_mes.includes(d)}
                      className={`h-8 p-0 ${classeOpcao(valores.dias_mes.includes(d))}`}
                      onClick={() => alternarLista('dias_mes', d)}
                    >
                      {d}
                    </Button>
                  ))}
                </div>
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <Checkbox
                    checked={valores.ultimo_dia_mes}
                    onCheckedChange={(v) => setValue('ultimo_dia_mes', !!v, { shouldValidate: formState.isSubmitted })}
                  />
                  {t('sincronizacaoSql.form.ultimoDiaMes')}
                </label>
                <p className="text-xs text-gray-500">{t('sincronizacaoSql.form.diasMesAjuda')}</p>
                {erro(errors.dias_mes?.message)}
              </div>
            )}
          </div>

          {/* Horário */}
          <div className="space-y-3">
            <Label>{t('sincronizacaoSql.form.modoHorario')}</Label>
            <div className="flex flex-wrap gap-2">
              {(['horarios', 'intervalo'] as const).map((m) => (
                <Button
                  key={m}
                  type="button"
                  variant="outline"
                  size="sm"
                  aria-pressed={valores.modo_horario === m}
                  className={classeOpcao(valores.modo_horario === m)}
                  onClick={() => setValue('modo_horario', m, { shouldValidate: formState.isSubmitted })}
                >
                  {m === 'horarios' ? t('sincronizacaoSql.form.horariosFixos') : t('sincronizacaoSql.form.intervalo')}
                </Button>
              ))}
            </div>

            {valores.modo_horario === 'horarios' ? (
              <div className="space-y-2">
                <div className="flex flex-wrap gap-2">
                  {valores.horarios.map((hora, i) => (
                    <div key={i} className="flex items-center gap-1">
                      <Input
                        type="time"
                        value={hora}
                        onChange={(e) => alterarHorario(i, e.target.value)}
                        className="w-32 focus:ring-sonda-blue focus:border-sonda-blue"
                        aria-label={`${t('sincronizacaoSql.form.horariosFixos')} ${i + 1}`}
                      />
                      {valores.horarios.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-red-600 hover:text-red-800"
                          aria-label={t('sincronizacaoSql.form.removerHorario')}
                          onClick={() => setValue('horarios', valores.horarios.filter((_, j) => j !== i))}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setValue('horarios', [...valores.horarios, '12:00'])}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {t('sincronizacaoSql.form.adicionarHorario')}
                </Button>
                {erro(errors.horarios?.message)}
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="agendamento-intervalo">{t('sincronizacaoSql.form.intervaloHoras')}</Label>
                  <Input
                    id="agendamento-intervalo"
                    type="number"
                    min={1}
                    max={23}
                    className="focus:ring-sonda-blue focus:border-sonda-blue"
                    {...register('intervalo_horas', { setValueAs: (v) => (v === '' || v === null ? null : Number(v)) })}
                  />
                  {erro(errors.intervalo_horas?.message)}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="agendamento-inicio">{t('sincronizacaoSql.form.horaInicio')}</Label>
                  <Input
                    id="agendamento-inicio"
                    type="time"
                    className="focus:ring-sonda-blue focus:border-sonda-blue"
                    {...register('hora_inicio')}
                  />
                  {erro(errors.hora_inicio?.message)}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="agendamento-fim">{t('sincronizacaoSql.form.horaFim')}</Label>
                  <Input
                    id="agendamento-fim"
                    type="time"
                    className="focus:ring-sonda-blue focus:border-sonda-blue"
                    {...register('hora_fim')}
                  />
                  {erro(errors.hora_fim?.message)}
                </div>
              </div>
            )}
          </div>

          {/* Previsão */}
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
              <CalendarClock className="h-4 w-4 text-sonda-blue" />
              {t('sincronizacaoSql.form.previsao')}
              {isFetching && <Loader2 className="h-3 w-3 animate-spin text-gray-400" />}
            </div>
            {erroPrevisao ? (
              <p className="text-sm text-red-500">
                {t('sincronizacaoSql.form.previsaoIndisponivel', { erro: erroPrevisao.message })}
              </p>
            ) : regraValida ? (
              <ul className="text-sm text-gray-600 space-y-1">
                {previsao.map((iso) => (
                  <li key={iso} data-testid="previsao-execucao" className="font-mono">
                    {formatarData(iso)}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>

          <DialogFooter className="pt-6 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t('sincronizacaoSql.form.cancelar')}
            </Button>
            <Button type="submit" disabled={salvando} className="bg-sonda-blue hover:bg-sonda-dark-blue">
              {salvando && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {salvando ? t('sincronizacaoSql.form.salvando') : t('sincronizacaoSql.form.salvar')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
