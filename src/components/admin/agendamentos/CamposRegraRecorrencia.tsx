/**
 * Campos da regra de recorrência (frequência, dias, horários) e previsão das
 * próximas execuções. Usado pelos formulários de agendamento da Sincronização
 * SQL Server e do Envio Automático de Saldo Parcial.
 */

import { useTranslation } from 'react-i18next';
import type { UseFormReturn } from 'react-hook-form';
import { Loader2, Plus, X, CalendarClock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import type { FrequenciaAgendamento, ModoHorarioAgendamento } from '@/types/syncAgendamentos';

/** Campos de recorrência que o formulário precisa ter */
export interface CamposRegraForm {
  frequencia: FrequenciaAgendamento;
  dias_semana: number[];
  dias_mes: number[];
  ultimo_dia_mes: boolean;
  modo_horario: ModoHorarioAgendamento;
  horarios: string[];
  intervalo_horas: number | null;
  hora_inicio: string;
  hora_fim: string;
}

interface CamposRegraRecorrenciaProps {
  form: UseFormReturn<any>;
  previsao: { execucoes: string[]; periodo: string };
  isFetching: boolean;
  erroPrevisao: Error | null;
  regraValida: boolean;
}

const ORDEM_SEMANA = [1, 2, 3, 4, 5, 6, 0];
const DIAS_MES = Array.from({ length: 31 }, (_, i) => i + 1);

const classeOpcao = (ativo: boolean) =>
  ativo
    ? 'bg-sonda-blue text-white border-sonda-blue hover:bg-sonda-dark-blue'
    : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50';

export function CamposRegraRecorrencia({ form, previsao, isFetching, erroPrevisao, regraValida }: CamposRegraRecorrenciaProps) {
  const { t, i18n } = useTranslation();
  const { register, watch, setValue, formState } = form;
  const errors = formState.errors as Record<string, { message?: string } | undefined>;
  const valores = watch() as CamposRegraForm;

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

  return (
    <>
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

      {/* Previsão — columns-2 preenche coluna por coluna (de cima para baixo, depois a da direita) */}
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-2">
        <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
          <CalendarClock className="h-4 w-4 text-sonda-blue" />
          {previsao.periodo === '24h'
            ? t('sincronizacaoSql.form.previsao24h')
            : t('sincronizacaoSql.form.previsao')}
          {isFetching && <Loader2 className="h-3 w-3 animate-spin text-gray-400" />}
        </div>
        {erroPrevisao ? (
          <p className="text-sm text-red-500">
            {t('sincronizacaoSql.form.previsaoIndisponivel', { erro: erroPrevisao.message })}
          </p>
        ) : regraValida ? (
          <ul className="sm:columns-2 gap-x-6 space-y-1 text-sm text-gray-600">
            {previsao.execucoes.map((iso) => (
              <li key={iso} data-testid="previsao-execucao" className="font-mono break-inside-avoid">
                {formatarData(iso)}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </>
  );
}
