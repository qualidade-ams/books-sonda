/**
 * Modal de criação/edição de agendamento do Envio Automático de Saldo Parcial:
 * nome, clientes, e-mails em cópia e regra de recorrência (com previsão do sync-api).
 */

import { useEffect, useMemo, useState, type ClipboardEvent } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, Loader2, Search } from 'lucide-react';
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
import { Textarea } from '@/components/ui/textarea';
import { CamposRegraRecorrencia } from '@/components/admin/agendamentos/CamposRegraRecorrencia';
import { useClientesElegiveisSaldoParcial, usePreverExecucoesSaldoParcial } from '@/hooks/useEnvioSaldoParcial';
import {
  adicionarEmailsCc,
  agendamentoSaldoParcialFormSchema,
  agendamentoSaldoParcialParaForm,
  formParaAgendamentoSaldoParcialInput,
  removerEmailsCc,
  valoresIniciaisAgendamentoSaldoParcial,
  type AgendamentoSaldoParcialFormValues,
} from '@/schemas/envioSaldoParcialSchemas';
import { regraFormParaRegra, validarRegraRecorrenciaForm, camposRegraRecorrenciaSchema } from '@/schemas/syncAgendamentoSchemas';
import type {
  AgendamentoSaldoParcial,
  AgendamentoSaldoParcialInput,
  ClienteElegivelSaldoParcial,
} from '@/types/envioSaldoParcial';
import { execucoesParaPrevisao } from '@/utils/previsaoExecucoes';
import { extrairEmailsDeTexto } from '@/utils/emailValidation';

interface AgendamentoSaldoParcialFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agendamento: AgendamentoSaldoParcial | null;
  onSalvar: (dados: AgendamentoSaldoParcialInput) => Promise<void>;
  salvando: boolean;
}

// Só os campos de recorrência, para habilitar a previsão sem exigir nome/clientes
const regraSchema = z.object(camposRegraRecorrenciaSchema).superRefine(validarRegraRecorrenciaForm);

export function AgendamentoSaldoParcialFormModal({
  open,
  onOpenChange,
  agendamento,
  onSalvar,
  salvando,
}: AgendamentoSaldoParcialFormModalProps) {
  const { t } = useTranslation();
  const { clientes, isLoading: carregandoClientes } = useClientesElegiveisSaldoParcial();
  const [busca, setBusca] = useState('');

  const form = useForm<AgendamentoSaldoParcialFormValues>({
    resolver: zodResolver(agendamentoSaldoParcialFormSchema),
    defaultValues: agendamento ? agendamentoSaldoParcialParaForm(agendamento) : valoresIniciaisAgendamentoSaldoParcial(),
  });

  const { register, watch, setValue, getValues, handleSubmit, reset, formState } = form;
  const { errors } = formState;

  useEffect(() => {
    if (open) {
      reset(agendamento ? agendamentoSaldoParcialParaForm(agendamento) : valoresIniciaisAgendamentoSaldoParcial());
      setBusca('');
    }
  }, [open, agendamento, reset]);

  const valores = watch();

  const regra = useMemo(() => regraFormParaRegra(valores), [valores]);
  const regraValida = useMemo(() => regraSchema.safeParse(valores).success, [valores]);

  // Espera o usuário parar de digitar antes de pedir a previsão
  const [regraPrevisao, setRegraPrevisao] = useState(regra);
  const chaveRegra = JSON.stringify(regra);
  useEffect(() => {
    const id = setTimeout(() => setRegraPrevisao(JSON.parse(chaveRegra)), 400);
    return () => clearTimeout(id);
  }, [chaveRegra]);

  const { previsao, isFetching, error: erroPrevisao } = usePreverExecucoesSaldoParcial(regraPrevisao, open && regraValida);
  const previsaoExibida = useMemo(() => execucoesParaPrevisao(previsao), [previsao]);

  const clientesFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return termo ? clientes.filter((c) => c.nome.toLowerCase().includes(termo)) : clientes;
  }, [clientes, busca]);

  const atualizarCc = (texto: string) =>
    setValue('emailsCcTexto', texto, { shouldValidate: formState.isSubmitted });

  const alternarCliente = (cliente: ClienteElegivelSaldoParcial, marcado: boolean) => {
    const atual = getValues('empresaIds');
    const empresaIds = marcado ? [...atual, cliente.id] : atual.filter((e) => e !== cliente.id);
    setValue('empresaIds', empresaIds, { shouldValidate: formState.isSubmitted });

    // O gestor do cliente entra no CC ao marcar; ao desmarcar sai, a menos que outro cliente marcado tenha o mesmo gestor
    const gestor = cliente.emailGestor;
    if (!gestor) return;
    if (marcado) {
      atualizarCc(adicionarEmailsCc(getValues('emailsCcTexto'), [gestor]));
      return;
    }
    const gestorEmUso = clientes.some(
      (c) => empresaIds.includes(c.id) && c.emailGestor?.toLowerCase() === gestor.toLowerCase()
    );
    if (!gestorEmUso) atualizarCc(removerEmailsCc(getValues('emailsCcTexto'), [gestor]));
  };

  // Colado do Outlook ("Nome <email>; ..."): mantém só os endereços
  const colarEmailsCc = (e: ClipboardEvent<HTMLTextAreaElement>) => {
    const emails = extrairEmailsDeTexto(e.clipboardData.getData('text'));
    if (emails.length === 0) return;
    e.preventDefault();
    atualizarCc(adicionarEmailsCc(getValues('emailsCcTexto'), emails));
  };

  const erro = (mensagem?: string) =>
    mensagem ? <p className="text-sm text-red-500">{t(mensagem)}</p> : null;

  const onSubmit = async (v: AgendamentoSaldoParcialFormValues) => {
    await onSalvar(formParaAgendamentoSaldoParcialInput(v));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold text-sonda-blue">
            {agendamento ? t('envioSaldoParcial.form.tituloEditar') : t('envioSaldoParcial.form.tituloNovo')}
          </DialogTitle>
          <DialogDescription className="text-sm text-gray-500">{t('envioSaldoParcial.form.descricao')}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Nome + ativo */}
          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-4 items-end">
            <div className="space-y-2">
              <Label htmlFor="saldo-parcial-nome">{t('envioSaldoParcial.form.nome')}</Label>
              <Input
                id="saldo-parcial-nome"
                placeholder={t('envioSaldoParcial.form.nomePlaceholder')}
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
              <Switch id="saldo-parcial-ativo" checked={valores.ativo} onCheckedChange={(v) => setValue('ativo', v)} />
              <Label htmlFor="saldo-parcial-ativo">{t('envioSaldoParcial.form.ativo')}</Label>
            </div>
          </div>

          {/* Clientes */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>{t('envioSaldoParcial.form.clientes')}</Label>
              <span className="text-xs text-gray-500">
                {t('envioSaldoParcial.form.clientesSelecionados', { count: valores.empresaIds.length })}
              </span>
            </div>
            <p className="text-xs text-gray-500">{t('envioSaldoParcial.form.clientesAjuda')}</p>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder={t('envioSaldoParcial.form.buscarCliente')}
                className="pl-10 focus:ring-sonda-blue focus:border-sonda-blue"
              />
            </div>
            {/* relative: contém os inputs ocultos (absolutos) dos Checkbox do Radix; sem ele
                os itens fora da área visível esticam a rolagem do modal com espaço em branco */}
            <div className="relative max-h-56 overflow-y-auto rounded-md border border-gray-200 divide-y">
              {carregandoClientes ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="h-5 w-5 animate-spin text-sonda-blue" />
                </div>
              ) : clientesFiltrados.length === 0 ? (
                <p className="py-4 text-center text-sm text-gray-500">{t('envioSaldoParcial.form.nenhumCliente')}</p>
              ) : (
                clientesFiltrados.map((cliente) => (
                  <label key={cliente.id} className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-gray-50">
                    <Checkbox
                      checked={valores.empresaIds.includes(cliente.id)}
                      onCheckedChange={(v) => alternarCliente(cliente, !!v)}
                      aria-label={cliente.nome}
                    />
                    <span className="flex-1">{cliente.nome}</span>
                    {cliente.qtdContatosSaldoParcial > 0 ? (
                      <span className="text-xs text-gray-500">
                        {t('envioSaldoParcial.form.qtdContatos', { count: cliente.qtdContatosSaldoParcial })}
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs text-yellow-700">
                        <AlertTriangle className="h-3 w-3" />
                        <span>{t('envioSaldoParcial.form.semContatos')}</span>
                      </span>
                    )}
                  </label>
                ))
              )}
            </div>
            {erro(errors.empresaIds?.message)}
          </div>

          {/* CC */}
          <div className="space-y-2">
            <Label htmlFor="saldo-parcial-cc">{t('envioSaldoParcial.form.emailsCc')}</Label>
            <Textarea
              id="saldo-parcial-cc"
              rows={2}
              placeholder={t('envioSaldoParcial.form.emailsCcPlaceholder')}
              className="font-mono text-sm focus:ring-sonda-blue focus:border-sonda-blue"
              {...register('emailsCcTexto')}
              onPaste={colarEmailsCc}
            />
            <p className="text-xs text-gray-500">{t('envioSaldoParcial.form.emailsCcAjuda')}</p>
            {erro(errors.emailsCcTexto?.message)}
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
              {t('envioSaldoParcial.form.cancelar')}
            </Button>
            <Button type="submit" disabled={salvando} className="bg-sonda-blue hover:bg-sonda-dark-blue">
              {salvando && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {salvando ? t('envioSaldoParcial.form.salvando') : t('envioSaldoParcial.form.salvar')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
