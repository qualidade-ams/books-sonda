
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface EmailLog {
  id: string;
  destinatario: string;
  assunto: string;
  status: string;
  erro?: string;
  enviado_em: string;
  created_at: string;
}

export const useEmailLogs = () => {
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('email_logs')
        .select('*')
        .order('enviado_em', { ascending: false })
        .limit(100);

      if (error) {
        console.error('Erro ao buscar logs:', error);
        return;
      }

      // Mapear os dados para o tipo EmailLog
      const mappedLogs: EmailLog[] = (data || []).map(log => ({
        id: log.id,
        destinatario: log.destinatario,
        assunto: log.assunto,
        status: log.status,
        erro: log.erro || undefined,
        enviado_em: log.enviado_em || new Date().toISOString(),
        created_at: log.created_at || new Date().toISOString()
      }));

      setLogs(mappedLogs);
    } catch (error) {
      console.error('Erro ao buscar logs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  return {
    logs,
    loading,
    refreshLogs: fetchLogs
  };
};
