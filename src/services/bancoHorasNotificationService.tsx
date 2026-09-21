/**
 * Serviço de Notificações para Banco de Horas
 * 
 * Centraliza todas as notificações e alertas do sistema de Banco de Horas,
 * garantindo consistência visual e mensagens padronizadas.
 * 
 * Requisitos: 18.1-18.10
 */

import { toast } from '@/hooks/use-toast';
import { AlertCircle, CheckCircle, Info, AlertTriangle, TrendingDown, TrendingUp, DollarSign, Calendar } from 'lucide-react';

export interface NotificationOptions {
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

/**
 * Classe de serviço para notificações do Banco de Horas
 */
export class BancoHorasNotificationService {
  /**
   * Requirement 18.1: Alerta quando saldo se torna negativo
   * 
   * Exibe alerta de aviso (amarelo) quando o saldo mensal fica negativo,
   * indicando que há consumo acima do baseline disponível.
   */
  static saldoNegativo(
    empresaNome: string,
    saldoNegativo: string,
    mesAno: string,
    options?: NotificationOptions
  ): void {
    toast({
      title: (
        <div className="flex items-center gap-2">
          <TrendingDown className="h-5 w-5 text-orange-600" />
          <span>Saldo Negativo Detectado</span>
        </div>
      ),
      description: (
        <div className="space-y-2">
          <p className="text-sm">
            <strong>{empresaNome}</strong> apresentou saldo negativo de{' '}
            <strong className="text-orange-600">{saldoNegativo}</strong> no período{' '}
            <strong>{mesAno}</strong>.
          </p>
          <p className="text-xs text-gray-500">
            O consumo excedeu o baseline disponível. Verifique se será necessário gerar excedente.
          </p>
        </div>
      ),
      variant: 'default',
      duration: options?.duration || 8000,
      action: options?.action,
      className: 'border-l-4 border-orange-500 bg-orange-50'
    });
  }

  /**
   * Requirement 18.2: Notificação quando excedente é gerado
   * 
   * Exibe notificação informativa (azul) quando um excedente é gerado
   * ao final do período de apuração com saldo negativo.
   */
  static excedenteGerado(
    empresaNome: string,
    excedenteHoras: string,
    valorExcedente: number,
    mesAno: string,
    options?: NotificationOptions
  ): void {
    const valorFormatado = new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(valorExcedente);

    toast({
      title: (
        <div className="flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-blue-600" />
          <span>Excedente Gerado</span>
        </div>
      ),
      description: (
        <div className="space-y-2">
          <p className="text-sm">
            Excedente de <strong className="text-blue-600">{excedenteHoras}</strong> gerado para{' '}
            <strong>{empresaNome}</strong> no período <strong>{mesAno}</strong>.
          </p>
          <p className="text-sm">
            Valor a faturar: <strong className="text-blue-600">{valorFormatado}</strong>
          </p>
          <p className="text-xs text-gray-500">
            O excedente foi calculado com base na taxa vigente do período.
          </p>
        </div>
      ),
      variant: 'default',
      duration: options?.duration || 10000,
      action: options?.action,
      className: 'border-l-4 border-blue-500 bg-blue-50'
    });
  }

  /**
   * Requirement 18.3: Alerta de erro quando taxa está ausente
   * 
   * Exibe alerta de erro (vermelho) quando não há taxa cadastrada
   * para o período, impedindo o cálculo de excedentes.
   */
  static taxaAusente(
    empresaNome: string,
    mesAno: string,
    options?: NotificationOptions
  ): void {
    toast({
      title: (
        <div className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-red-600" />
          <span>Taxa Não Encontrada</span>
        </div>
      ),
      description: (
        <div className="space-y-2">
          <p className="text-sm">
            Não foi encontrada taxa cadastrada para <strong>{empresaNome}</strong> no período{' '}
            <strong>{mesAno}</strong>.
          </p>
          <p className="text-sm text-red-600 font-medium">
            O excedente não pode ser calculado sem a taxa vigente.
          </p>
          <p className="text-xs text-gray-500">
            Cadastre a taxa do período antes de calcular o banco de horas.
          </p>
        </div>
      ),
      variant: 'destructive',
      duration: options?.duration || 12000,
      action: options?.action
    });
  }

  /**
   * Requirement 18.4: Lembrete quando período de apuração está terminando
   * 
   * Exibe notificação de lembrete (amarelo) quando o período de apuração
   * está chegando ao fim, alertando sobre fechamento e repasses.
   */
  static fimPeriodoProximo(
    empresaNome: string,
    mesAno: string,
    periodoApuracao: number,
    possuiRepasseEspecial: boolean,
    options?: NotificationOptions
  ): void {
    const mensagemRepasse = possuiRepasseEspecial
      ? 'O saldo positivo será repassado para o próximo período conforme configuração de repasse especial.'
      : 'O saldo positivo será zerado ao final do período.';

    toast({
      title: (
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-yellow-600" />
          <span>Fim de Período de Apuração</span>
        </div>
      ),
      description: (
        <div className="space-y-2">
          <p className="text-sm">
            O período de apuração de <strong>{periodoApuracao} {periodoApuracao === 1 ? 'mês' : 'meses'}</strong>{' '}
            para <strong>{empresaNome}</strong> está terminando em <strong>{mesAno}</strong>.
          </p>
          <p className="text-sm text-yellow-700">
            {mensagemRepasse}
          </p>
          <p className="text-xs text-gray-500">
            Verifique o saldo atual e confirme se há necessidade de ajustes antes do fechamento.
          </p>
        </div>
      ),
      variant: 'default',
      duration: options?.duration || 10000,
      action: options?.action,
      className: 'border-l-4 border-yellow-500 bg-yellow-50'
    });
  }

  /**
   * Requirement 18.5: Confirmação quando reajuste é criado
   * 
   * Exibe mensagem de sucesso (verde) quando um reajuste manual
   * é aplicado com sucesso ao cálculo mensal.
   */
  static reajusteCriado(
    empresaNome: string,
    valorReajuste: string,
    tipoReajuste: 'positivo' | 'negativo',
    mesAno: string,
    observacao: string,
    options?: NotificationOptions
  ): void {
    const icone = tipoReajuste === 'positivo' ? TrendingUp : TrendingDown;
    const cor = tipoReajuste === 'positivo' ? 'text-green-600' : 'text-red-600';
    const corBorda = tipoReajuste === 'positivo' ? 'border-green-500' : 'border-red-500';
    const corFundo = tipoReajuste === 'positivo' ? 'bg-green-50' : 'bg-red-50';

    toast({
      title: (
        <div className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-green-600" />
          <span>Reajuste Aplicado com Sucesso</span>
        </div>
      ),
      description: (
        <div className="space-y-2">
          <p className="text-sm">
            Reajuste <span className={`font-medium ${cor}`}>{tipoReajuste}</span> de{' '}
            <strong className={cor}>{valorReajuste}</strong> aplicado para{' '}
            <strong>{empresaNome}</strong> no período <strong>{mesAno}</strong>.
          </p>
          {observacao && (
            <p className="text-xs text-gray-600 italic border-l-2 border-gray-300 pl-2">
              "{observacao.length > 100 ? observacao.substring(0, 100) + '...' : observacao}"
            </p>
          )}
          <p className="text-xs text-gray-500">
            O cálculo foi recalculado automaticamente, incluindo meses subsequentes.
          </p>
        </div>
      ),
      variant: 'default',
      duration: options?.duration || 8000,
      action: options?.action,
      className: `border-l-4 ${corBorda} ${corFundo}`
    });
  }

  /**
   * Requirement 18.6: Mensagem de sucesso após cálculo bem-sucedido
   * 
   * Exibe mensagem de sucesso (verde) quando o cálculo mensal
   * é realizado com sucesso.
   */
  static calculoSucesso(
    empresaNome: string,
    mesAno: string,
    saldo: string,
    options?: NotificationOptions
  ): void {
    toast({
      title: (
        <div className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-green-600" />
          <span>Cálculo Realizado com Sucesso</span>
        </div>
      ),
      description: (
        <div className="space-y-2">
          <p className="text-sm">
            Banco de horas calculado para <strong>{empresaNome}</strong> no período{' '}
            <strong>{mesAno}</strong>.
          </p>
          <p className="text-sm">
            Saldo mensal: <strong className="text-green-600">{saldo}</strong>
          </p>
        </div>
      ),
      variant: 'default',
      duration: options?.duration || 5000,
      action: options?.action,
      className: 'border-l-4 border-green-500 bg-green-50'
    });
  }

  /**
   * Requirement 18.7: Mensagem de erro quando cálculo falha
   * 
   * Exibe mensagem de erro (vermelho) quando ocorre falha
   * durante o cálculo mensal.
   */
  static calculoErro(
    empresaNome: string,
    mesAno: string,
    erro: string,
    options?: NotificationOptions
  ): void {
    toast({
      title: (
        <div className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-red-600" />
          <span>Erro ao Calcular Banco de Horas</span>
        </div>
      ),
      description: (
        <div className="space-y-2">
          <p className="text-sm">
            Não foi possível calcular o banco de horas para <strong>{empresaNome}</strong> no período{' '}
            <strong>{mesAno}</strong>.
          </p>
          <p className="text-sm text-red-600 font-medium">
            {erro}
          </p>
          <p className="text-xs text-gray-500">
            Verifique os dados de entrada e tente novamente. Se o problema persistir, contate o suporte.
          </p>
        </div>
      ),
      variant: 'destructive',
      duration: options?.duration || 10000,
      action: options?.action
    });
  }

  /**
   * Notificação informativa genérica
   * 
   * Exibe notificação informativa (azul) para mensagens gerais.
   */
  static info(
    titulo: string,
    mensagem: string,
    options?: NotificationOptions
  ): void {
    toast({
      title: (
        <div className="flex items-center gap-2">
          <Info className="h-5 w-5 text-blue-600" />
          <span>{titulo}</span>
        </div>
      ),
      description: <p className="text-sm">{mensagem}</p>,
      variant: 'default',
      duration: options?.duration || 5000,
      action: options?.action,
      className: 'border-l-4 border-blue-500 bg-blue-50'
    });
  }

  /**
   * Notificação de aviso genérica
   * 
   * Exibe notificação de aviso (amarelo) para alertas gerais.
   */
  static warning(
    titulo: string,
    mensagem: string,
    options?: NotificationOptions
  ): void {
    toast({
      title: (
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-yellow-600" />
          <span>{titulo}</span>
        </div>
      ),
      description: <p className="text-sm">{mensagem}</p>,
      variant: 'default',
      duration: options?.duration || 6000,
      action: options?.action,
      className: 'border-l-4 border-yellow-500 bg-yellow-50'
    });
  }

  /**
   * Notificação de sucesso genérica
   * 
   * Exibe notificação de sucesso (verde) para confirmações gerais.
   */
  static success(
    titulo: string,
    mensagem: string,
    options?: NotificationOptions
  ): void {
    toast({
      title: (
        <div className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-green-600" />
          <span>{titulo}</span>
        </div>
      ),
      description: <p className="text-sm">{mensagem}</p>,
      variant: 'default',
      duration: options?.duration || 5000,
      action: options?.action,
      className: 'border-l-4 border-green-500 bg-green-50'
    });
  }

  /**
   * Notificação de erro genérica
   * 
   * Exibe notificação de erro (vermelho) para erros gerais.
   */
  static error(
    titulo: string,
    mensagem: string,
    options?: NotificationOptions
  ): void {
    toast({
      title: (
        <div className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-red-600" />
          <span>{titulo}</span>
        </div>
      ),
      description: <p className="text-sm">{mensagem}</p>,
      variant: 'destructive',
      duration: options?.duration || 8000,
      action: options?.action
    });
  }
}

// Exportar instância singleton para uso direto
export const bancoHorasNotifications = BancoHorasNotificationService;
