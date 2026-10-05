/**
 * Modal de criação/edição de agendamento de sincronização SQL Server.
 * Mostra a previsão das próximas execuções calculada pelo sync-api.
 */

import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
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
import { CamposRegraRecorrencia } from '@/components/admin/agendamentos/CamposRegraRecorrencia';
import { usePreverExecucoes } from '@/hooks/useSyncAgendamentos';
import { execucoesParaPrevisao } from '@/utils/previsaoExecucoes';
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

export function AgendamentoFormModal({ open, onOpenChange, agendamento, onSalvar, salvando }: AgendamentoFormModalProps) {
  const { t } = useTranslation();

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
  // Dia inteiro (próximas 24h); semanal/mensal sem nada nesse período mostra as próximas 5
  const previsaoExibida = useMemo(() => execucoesParaPrevisao(previsao), [previsao]);

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

          <CamposRegraRecorrencia
            form={form}
            previsao={previsaoExibida}
            isFetching={isFetching}
            erroPrevisao={erroPrevisao}
            regraValida={regraValida}
          />

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
