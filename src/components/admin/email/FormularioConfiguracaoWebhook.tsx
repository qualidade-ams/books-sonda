import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Loader2, Save, TestTube } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import ProtectedAction from '@/components/auth/ProtectedAction';
import PermissionFeedback from '@/components/auth/PermissionFeedback';

interface WebhookConfig {
  id?: string;
  webhook_url: string;
  ativo: boolean;
}

const WebhookConfigForm = () => {
  const [config, setConfig] = useState<WebhookConfig>({
    webhook_url: 'https://prod-15.westus.logic.azure.com:443/workflows/6dcbd557c39b4d74afe41a7f223caf2e/triggers/manual/paths/invoke?api-version=2016-06-01&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=cyD7xWu4TpxXXsSWcH9h8BU5NptbrLkqPVCh0WrXasU',
    ativo: true
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const { data, error } = await supabase
        .from('webhook_config')
        .select('*')
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Erro ao buscar configuração:', error);
        return;
      }

      if (data) {
        setConfig(data);
      }
    } catch (error) {
      console.error('Erro ao buscar configuração:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveConfig = async () => {
    setSaving(true);
    try {
      if (config.id) {
        const { error } = await supabase
          .from('webhook_config')
          .update({
            webhook_url: config.webhook_url,
            ativo: config.ativo
          })
          .eq('id', config.id);

        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from('webhook_config')
          .insert([{
            webhook_url: config.webhook_url,
            ativo: config.ativo
          }])
          .select()
          .single();

        if (error) throw error;
        setConfig(prev => ({ ...prev, id: data.id }));
      }

      toast({
        title: "Configuração salva",
        description: "As configurações do webhook foram atualizadas com sucesso.",
      });
    } catch (error) {
      console.error('Erro ao salvar configuração:', error);
      toast({
        title: "Erro ao salvar",
        description: "Ocorreu um erro ao salvar as configurações.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const testWebhook = async () => {
    setTesting(true);
    
    // Obter email do usuário logado ou usar fallback
    const userEmail = user?.email || 'teste@empresa.com';
    
    try {
      const response = await fetch(config.webhook_url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          nome: 'Teste do Webhook',
          email: userEmail,          
          mensagem: `
          <!DOCTYPE html>
	<html lang="pt-BR">

	<head>
		<meta charset="UTF-8" />
		<title>Book AMS</title>
	</head>

	<body style="margin: 0; padding: 0; background-color: #f4f6fb; font-family: Arial, sans-serif;">
		<table width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f4f6fb">
			<tr>
				<td align="center" style="padding: 20px 20px;">
					<table width="640" cellpadding="0" cellspacing="0" border="0" bgcolor="#ffffff" style="border-radius: 10px; box-shadow: 0 6px 20px rgba(0, 0, 0, 0.08); overflow: hidden;">
						<tr>
							<td align="center" bgcolor="#1a4eff" style="padding: 20px;">
								<!--[if gte mso 9]>
							<table width="150" border="0" cellspacing="0" cellpadding="0">
							   <tr>
								  <td>
							<![endif]-->

								<img src="https://orcamentos-snd.vercel.app/images/logo-sonda.png" alt="Logo" width="150" style="display: block; width: 100%; max-width: 150px; height: auto; border: 0; line-height: 100%; outline: none; text-decoration: none;" />

								<!--[if gte mso 9]>
								  </td>
							   </tr>
							</table>
							<![endif]-->
							</td>
						</tr>
                      <tr>
                        <td style="padding: 24px; font-size: 14px; color: #111; line-height: 1.5;">
                          <h2 style="margin-top: 0; color: #1a4eff; font-size: 18px;">Teste efetuado com sucesso!</h2><br>
                          Este é um teste do Webhook do Power Automate.
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </body>
          </html>
                  `
                }),
              });

      if (!response.ok) {
        throw new Error(`Erro HTTP: ${response.status} - ${response.statusText}`);
      }

      toast({
        title: "Teste enviado",
        description: `O teste foi enviado para ${userEmail}. Verifique se o e-mail foi recebido.`,
      });
    } catch (error) {
      console.error('Erro ao testar webhook:', error);
      toast({
        title: "Erro no teste",
        description: "Ocorreu um erro ao testar o webhook.",
        variant: "destructive",
      });
    } finally {
      setTesting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-700 dark:text-gray-300">Configuração do Webhook Power Automate</h2>
            <p className="text-gray-600">Configure a integração com o Power Automate para envio de e-mails</p>
          </div>
        </div>

        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-700 dark:text-gray-300">Configuração do Webhook Power Automate</h2>
          <p className="text-gray-600">Configure a integração com o Power Automate para envio de e-mails</p>
        </div>
      </div>

      <Card>
        <CardContent className="space-y-6 pt-6">
          <ProtectedAction 
            screenKey="email-config" 
            requiredLevel="edit"
            fallback={
              <PermissionFeedback 
                message="Você não tem permissão para editar configurações de email. Entre em contato com o administrador para solicitar acesso."
                variant="warning"
              />
            }
          >
            <div className="space-y-2">
              <Label htmlFor="webhook_url">URL do Webhook</Label>
              <Input
                id="webhook_url"
                value={config.webhook_url}
                onChange={(e) => setConfig(prev => ({ ...prev, webhook_url: e.target.value }))}
                placeholder="Digite o endereço do Webhook..."
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="ativo"
                checked={config.ativo}
                onCheckedChange={(checked) => setConfig(prev => ({ ...prev, ativo: checked }))}
              />
              <Label htmlFor="ativo">Webhook ativo</Label>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button onClick={saveConfig} disabled={saving} className="flex-1">
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Salvar Configuração
              </Button>
              <Button 
                variant="outline" 
                onClick={testWebhook} 
                disabled={testing || !config.webhook_url}
                className="flex-1"
              >
                {testing ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <TestTube className="h-4 w-4 mr-2" />
                )}
                Testar Webhook
              </Button>
            </div>
          </ProtectedAction>
        </CardContent>
      </Card>
    </div>
  );
};

export default WebhookConfigForm;