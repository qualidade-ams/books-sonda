/**
 * Hook customizado para notificações do Banco de Horas
 * 
 * Fornece interface simplificada para disparar notificações
 * específicas do domínio de Banco de Horas.
 * 
 * Requisitos: 18.1-18.10
 */

import { useCallback } from 'react';
import { bancoHorasNotifications, type NotificationOptions } from '@/services/bancoHorasNotificationService';

/**
 * Hook para gerenciar notificações do Banco de Horas
 * 
 * @example
 * ```tsx
 * const notifications = useBancoHorasNotifications();
 * 
 * // Notificar saldo negativo
 * notifications.saldoNegativo('SOUZA CRUZ', '-10:30', '01/2026');
 * 
 * // Notificar excedente gerado
 * notifications.excedenteGerado('SOUZA CRUZ', '10:30', 2500.00, '01/2026');
 * ```
 */
export const useBancoHorasNotifications = () => {
  /**
   * Requirement 18.1: Notifica quando saldo se torna negativo
   */
  const saldoNegativo = useCallback(
    (
      empresaNome: string,
      saldoNegativo: string,
      mesAno: string,
      options?: NotificationOptions
    ) => {
      bancoHorasNotifications.saldoNegativo(
        empresaNome,
        saldoNegativo,
        mesAno,
        options
      );
    },
    []
  );

  /**
   * Requirement 18.2: Notifica quando excedente é gerado
   */
  const excedenteGerado = useCallback(
    (
      empresaNome: string,
      excedenteHoras: string,
      valorExcedente: number,
      mesAno: string,
      options?: NotificationOptions
    ) => {
      bancoHorasNotifications.excedenteGerado(
        empresaNome,
        excedenteHoras,
        valorExcedente,
        mesAno,
        options
      );
    },
    []
  );

  /**
   * Requirement 18.3: Notifica quando taxa está ausente
   */
  const taxaAusente = useCallback(
    (
      empresaNome: string,
      mesAno: string,
      options?: NotificationOptions
    ) => {
      bancoHorasNotifications.taxaAusente(empresaNome, mesAno, options);
    },
    []
  );

  /**
   * Requirement 18.4: Notifica quando período está terminando
   */
  const fimPeriodoProximo = useCallback(
    (
      empresaNome: string,
      mesAno: string,
      periodoApuracao: number,
      possuiRepasseEspecial: boolean,
      options?: NotificationOptions
    ) => {
      bancoHorasNotifications.fimPeriodoProximo(
        empresaNome,
        mesAno,
        periodoApuracao,
        possuiRepasseEspecial,
        options
      );
    },
    []
  );

  /**
   * Requirement 18.5: Notifica quando reajuste é criado
   */
  const reajusteCriado = useCallback(
    (
      empresaNome: string,
      valorReajuste: string,
      tipoReajuste: 'positivo' | 'negativo',
      mesAno: string,
      observacao: string,
      options?: NotificationOptions
    ) => {
      bancoHorasNotifications.reajusteCriado(
        empresaNome,
        valorReajuste,
        tipoReajuste,
        mesAno,
        observacao,
        options
      );
    },
    []
  );

  /**
   * Requirement 18.6: Notifica sucesso no cálculo
   */
  const calculoSucesso = useCallback(
    (
      empresaNome: string,
      mesAno: string,
      saldo: string,
      options?: NotificationOptions
    ) => {
      bancoHorasNotifications.calculoSucesso(
        empresaNome,
        mesAno,
        saldo,
        options
      );
    },
    []
  );

  /**
   * Requirement 18.7: Notifica erro no cálculo
   */
  const calculoErro = useCallback(
    (
      empresaNome: string,
      mesAno: string,
      erro: string,
      options?: NotificationOptions
    ) => {
      bancoHorasNotifications.calculoErro(empresaNome, mesAno, erro, options);
    },
    []
  );

  /**
   * Notificação informativa genérica
   */
  const info = useCallback(
    (titulo: string, mensagem: string, options?: NotificationOptions) => {
      bancoHorasNotifications.info(titulo, mensagem, options);
    },
    []
  );

  /**
   * Notificação de aviso genérica
   */
  const warning = useCallback(
    (titulo: string, mensagem: string, options?: NotificationOptions) => {
      bancoHorasNotifications.warning(titulo, mensagem, options);
    },
    []
  );

  /**
   * Notificação de sucesso genérica
   */
  const success = useCallback(
    (titulo: string, mensagem: string, options?: NotificationOptions) => {
      bancoHorasNotifications.success(titulo, mensagem, options);
    },
    []
  );

  /**
   * Notificação de erro genérica
   */
  const error = useCallback(
    (titulo: string, mensagem: string, options?: NotificationOptions) => {
      bancoHorasNotifications.error(titulo, mensagem, options);
    },
    []
  );

  return {
    // Notificações específicas do domínio
    saldoNegativo,
    excedenteGerado,
    taxaAusente,
    fimPeriodoProximo,
    reajusteCriado,
    calculoSucesso,
    calculoErro,
    
    // Notificações genéricas
    info,
    warning,
    success,
    error
  };
};
