import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface WebhookConfig {
  id?: string;
  webhook_url: string;
  ativo: boolean;
}

export const useWebhookConfig = () => {
  const [config, setConfig] = useState<WebhookConfig | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('webhook_config')
        .select('*')
        .eq('ativo', true)
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Erro ao buscar configuração do webhook:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Erro ao buscar configuração do webhook:', error);
      return null;
    }
  };

  useEffect(() => {
    const loadConfig = async () => {
      setLoading(true);
      const data = await fetchConfig();
      setConfig(data);
      setLoading(false);
    };

    loadConfig();
  }, []);

  return {
    config,
    loading,
    fetchConfig
  };
};