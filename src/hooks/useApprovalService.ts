import { useState, useEffect, useCallback } from 'react';
import { approvalService } from '@/services/approvalService';
import type { PendingQuote, ApprovalNotification } from '@/types/approval';

export const useApprovalService = () => {
  const [pendingQuotes, setPendingQuotes] = useState<PendingQuote[]>([]);
  const [notifications, setNotifications] = useState<ApprovalNotification[]>([]);
  const [approvalHistory, setApprovalHistory] = useState<PendingQuote[]>([]);
  const [loading, setLoading] = useState(true);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [notificationsPagination, setNotificationsPagination] = useState({
    page: 1,
    hasMore: false,
    total: 0
  });
  const [historyPagination, setHistoryPagination] = useState({
    page: 1,
    hasMore: false,
    total: 0
  });

  const loadPendingQuotes = useCallback(async () => {
    setLoading(true);
    try {
      const quotes = await approvalService.getPendingQuotes();

      // Filtrar emails @sonda.com - eles devem aparecer apenas na tela de Aprovações CRM
      const filteredQuotes = quotes.filter(quote => {
        const formData = quote.form_data as any;
        const email = formData?.email || '';
        return !email.toLowerCase().endsWith('@sonda.com');
      });

      setPendingQuotes(filteredQuotes);
    } catch (error) {
      console.error('Erro ao carregar orçamentos pendentes:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadNotifications = useCallback(async (page: number = 1, append: boolean = false) => {
    setNotificationsLoading(true);
    try {
      const result = await approvalService.getNotifications(page, 20);

      if (append) {
        setNotifications(prev => [...prev, ...result.notifications]);
      } else {
        setNotifications(result.notifications);
      }

      setNotificationsPagination({
        page,
        hasMore: result.hasMore,
        total: result.total
      });
    } catch (error) {
      console.error('Erro ao carregar notificações:', error);
    } finally {
      setNotificationsLoading(false);
    }
  }, []);

  const loadApprovalHistory = async (page: number = 1, append: boolean = false) => {
    setHistoryLoading(true);
    try {
      // Se não é append, carregar TODOS os registros de uma vez
      if (!append) {
        console.log('🔄 Carregando TODOS os registros do histórico de aprovações...');
        
        let allQuotes: any[] = [];
        let currentPage = 1;
        let hasMore = true;
        
        // Loop para buscar todas as páginas
        while (hasMore) {
          console.log(`📄 Buscando página ${currentPage} do histórico...`);
          const result = await approvalService.getApprovalHistory(currentPage, 50);
          
          allQuotes = [...allQuotes, ...result.quotes];
          hasMore = result.hasMore;
          currentPage++;
          
          console.log(`✅ Página ${currentPage - 1}: ${result.quotes.length} registros encontrados`);
        }
        
        console.log(`🎯 Total de registros carregados: ${allQuotes.length}`);
        
        setApprovalHistory(allQuotes);
        setHistoryPagination({
          page: 1,
          hasMore: false, // Não há mais páginas pois carregamos tudo
          total: allQuotes.length
        });
      } else {
        // Se é append, usar a lógica antiga (para compatibilidade)
        const result = await approvalService.getApprovalHistory(page, 50);

        setApprovalHistory(prev => [...prev, ...result.quotes]);
        
        setHistoryPagination({
          page,
          hasMore: result.hasMore,
          total: approvalHistory.length + result.quotes.length
        });
      }
    } catch (error) {
      console.error('Erro ao carregar histórico de aprovações:', error);
      if (!append) {
        setApprovalHistory([]);
        setHistoryPagination({
          page: 1,
          hasMore: false,
          total: 0
        });
      }
    } finally {
      setHistoryLoading(false);
    }
  };

  const loadMoreNotifications = () => {
    if (notificationsPagination.hasMore && !notificationsLoading) {
      loadNotifications(notificationsPagination.page + 1, true);
    }
  };

  const loadMoreHistory = () => {
    if (historyPagination.hasMore && !historyLoading) {
      loadApprovalHistory(historyPagination.page + 1, true);
    }
  };

  const submitForApproval = async (formData: any, productType: 'comply_edocs' | 'comply_fiscal') => {
    try {
      const quoteId = await approvalService.submitForApproval(formData, productType);
      await loadPendingQuotes(); // Recarregar lista
      return quoteId;
    } catch (error) {
      console.error('Erro ao submeter para aprovação:', error);
      throw error;
    }
  };

  const approveQuote = async (quoteId: string, approvedBy: string) => {
    try {
      const success = await approvalService.approveQuote(quoteId, approvedBy);
      if (success) {
        await loadPendingQuotes(); // Recarregar lista
        await loadNotifications(); // Recarregar notificações
        await loadApprovalHistory(); // Recarregar histórico
      }
      return success;
    } catch (error) {
      console.error('Erro ao aprovar orçamento:', error);
      return false;
    }
  };

  const rejectQuote = async (quoteId: string, rejectedBy: string, reason: string) => {
    try {
      const success = await approvalService.rejectQuote(quoteId, rejectedBy, reason);
      if (success) {
        await loadPendingQuotes(); // Recarregar lista
        await loadNotifications(); // Recarregar notificações
        await loadApprovalHistory(); // Recarregar histórico
      }
      return success;
    } catch (error) {
      console.error('Erro ao rejeitar orçamento:', error);
      return false;
    }
  };

  const markNotificationAsRead = useCallback(async (notificationId: string) => {
    try {
      await approvalService.markNotificationAsRead(notificationId);
      // Atualizar o estado local imediatamente para melhor UX
      setNotifications(prev => prev.map(n =>
        n.id === notificationId ? { ...n, read: true } : n
      ));
    } catch (error) {
      console.error('Erro ao marcar notificação como lida:', error);
      // Em caso de erro, recarregar as notificações
      await loadNotifications();
    }
  }, [loadNotifications]);

  const markAllPendingNotificationsAsRead = useCallback(async () => {
    try {
      await approvalService.markAllPendingNotificationsAsRead();
      // Atualizar o estado local imediatamente
      setNotifications(prev => prev.map(n =>
        n.type === 'new_quote_pending' && !n.read ? { ...n, read: true } : n
      ));
    } catch (error) {
      console.error('Erro ao marcar todas as notificações pendentes como lidas:', error);
      // Em caso de erro, recarregar as notificações
      await loadNotifications();
    }
  }, [loadNotifications]);

  useEffect(() => {
    const initializeData = async () => {
      if (initialized) return;

      try {
        await loadPendingQuotes();
        await loadNotifications();
        await loadApprovalHistory();
        setInitialized(true);
      } catch (error) {
        console.error('Erro ao inicializar dados:', error);
        setLoading(false);
      }
    };

    initializeData();
  }, [initialized]); // Remove the callback dependencies to prevent infinite loops

  return {
    pendingQuotes,
    notifications,
    approvalHistory,
    loading,
    notificationsLoading,
    historyLoading,
    notificationsPagination,
    historyPagination,
    submitForApproval,
    approveQuote,
    rejectQuote,
    markNotificationAsRead,
    markAllPendingNotificationsAsRead,
    loadPendingQuotes,
    loadNotifications,
    loadApprovalHistory,
    loadMoreNotifications,
    loadMoreHistory
  };
};