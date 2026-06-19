// =====================================================
// COMPONENTE: DETALHES DO PLANO DE AÇÃO
// =====================================================

import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ContatosList } from './ContatosList';
import { useEspecialistasPesquisa } from '@/hooks/useEspecialistasRelacionamentos';
import { useCoordenador } from '@/hooks/useCoordenadores';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import type { PlanoAcaoCompleto, PlanoAcaoHistorico } from '@/types/planoAcao';
import { getCorPrioridade, getCorStatus, TIPO_ACAO_OPTIONS } from '@/types/planoAcao';
import {
  Calendar,
  User,
  Phone,
  Mail,
  MessageSquare,
  CheckCircle2,
  Clock,
  FileText,
  MessageCircle,
  Target,
  History,
} from 'lucide-react';

interface PlanoAcaoDetalhesProps {
  plano: PlanoAcaoCompleto;
  historico?: PlanoAcaoHistorico[];
}

export function PlanoAcaoDetalhes({ plano, historico }: PlanoAcaoDetalhesProps) {
  const { t } = useTranslation();
  // Buscar especialistas salvos na tabela de relacionamento (pesquisa_especialistas)
  const { data: especialistasPesquisa = [] } = useEspecialistasPesquisa(plano.pesquisa_id);
  
  // Buscar dados do coordenador
  const { data: coordenador } = useCoordenador(plano.pesquisa?.coordenador_id);

  // Buscar nome abreviado da empresa (por empresa_id ou pelo nome completo da pesquisa)
  const { data: empresa } = useQuery({
    queryKey: ['empresa-abreviado', plano.empresa_id, plano.pesquisa?.empresa],
    queryFn: async () => {
      if (plano.empresa_id) {
        const { data } = await supabase
          .from('empresas_clientes')
          .select('nome_abreviado')
          .eq('id', plano.empresa_id)
          .single();
        return data;
      }
      if (plano.pesquisa?.empresa) {
        const { data } = await supabase
          .from('empresas_clientes')
          .select('nome_abreviado')
          .eq('nome_completo', plano.pesquisa.empresa)
          .maybeSingle();
        return data;
      }
      return null;
    },
    enabled: !!plano.empresa_id || !!plano.pesquisa?.empresa,
  });
  
  return (
    <Tabs defaultValue="informacoes" className="w-full">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="informacoes">
          <FileText className="h-4 w-4 mr-2" />
          {t('dashboard.plansTab.detail.tabInfo')}
        </TabsTrigger>
        <TabsTrigger value="contato">
          <MessageCircle className="h-4 w-4 mr-2" />
          {t('dashboard.plansTab.detail.tabContact')}
        </TabsTrigger>
        <TabsTrigger value="resultado">
          <Target className="h-4 w-4 mr-2" />
          {t('dashboard.plansTab.detail.tabResult')}
        </TabsTrigger>
        <TabsTrigger value="historico">
          <History className="h-4 w-4 mr-2" />
          {t('dashboard.plansTab.detail.tabHistory')}
        </TabsTrigger>
      </TabsList>

      {/* Aba: Informações */}
      <TabsContent value="informacoes" className="space-y-6 mt-6">
      {/* Informações da Pesquisa */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t('dashboard.plansTab.detail.surveyInfo')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">{t('dashboard.plansTab.detail.company')}</p>
              <p className="font-medium">{empresa?.nome_abreviado || plano.pesquisa?.empresa || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('dashboard.plansTab.detail.client')}</p>
              <p className="font-medium">{plano.pesquisa?.cliente || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('dashboard.plansTab.detail.ticket')}</p>
              <p className="font-medium">
                {plano.pesquisa?.tipo_caso} {plano.pesquisa?.nro_caso}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('dashboard.plansTab.detail.response')}</p>
              <p className="font-medium">{plano.pesquisa?.resposta || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('dashboard.plansTab.detail.consultants')}</p>
              {especialistasPesquisa.length > 0 ? (
                <p className="font-medium">
                  {especialistasPesquisa.map(esp => esp.nome).join(', ')}
                </p>
              ) : plano.pesquisa?.prestador ? (
                <p className="font-medium">{plano.pesquisa.prestador}</p>
              ) : (
                <p className="font-medium text-muted-foreground">-</p>
              )}
            </div>
            <div>
              <p className="text-sm text-muted-foreground">{t('dashboard.plansTab.detail.coordinator')}</p>
              <p className="font-medium">{coordenador?.nome || '-'}</p>
            </div>
          </div>
          
          {(plano.comentario_cliente || plano.pesquisa?.comentario_pesquisa) && (
            <>
              <Separator className="my-4" />
              <div>
                <p className="text-sm text-muted-foreground mb-1">{t('dashboard.plansTab.detail.clientComment')}</p>
                <p className="text-sm bg-muted p-3 rounded-md">
                  {plano.comentario_cliente || plano.pesquisa?.comentario_pesquisa}
                </p>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Ação Corretiva e Preventiva */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t('dashboard.plansTab.detail.plannedActions')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Tipo de Ação */}
          {plano.tipo_acao && (
            <div>
              <p className="text-sm font-medium mb-2">{t('dashboard.plansTab.detail.actionType')}</p>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-sm">
                  {plano.tipo_acao}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {TIPO_ACAO_OPTIONS.find(opt => opt.value === plano.tipo_acao)?.description}
                </span>
              </div>
            </div>
          )}
          
          <div>
            <p className="text-sm font-medium mb-2">{t('dashboard.plansTab.detail.correctiveAction')}</p>
            <p className="text-sm bg-muted p-3 rounded-md">
              {plano.descricao_acao_corretiva}
            </p>
          </div>
          {plano.acao_preventiva && (
            <div>
              <p className="text-sm font-medium mb-2">{t('dashboard.plansTab.detail.preventiveAction')}</p>
              <p className="text-sm bg-muted p-3 rounded-md">{plano.acao_preventiva}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Status e Prioridade */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t('dashboard.plansTab.detail.planStatus')}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground mb-2">{t('dashboard.plansTab.detail.priority')}</p>
              <Badge className={getCorPrioridade(plano.prioridade)}>
                {t(`dashboard.plansTab.priorities.${plano.prioridade}`)}
              </Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-2">{t('dashboard.plansTab.detail.status')}</p>
              <Badge className={getCorStatus(plano.status_plano)}>
                {t(`dashboard.plansTab.statuses.${plano.status_plano}`)}
              </Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-2">{t('dashboard.plansTab.detail.startDate')}</p>
              <p className="text-sm font-medium flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {format(new Date(plano.data_inicio), 'dd/MM/yyyy', { locale: ptBR })}
              </p>
            </div>
            {plano.data_conclusao && (
              <div>
                <p className="text-sm text-muted-foreground mb-2">{t('dashboard.plansTab.detail.conclusionDate')}</p>
                <p className="text-sm font-medium flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  {format(new Date(plano.data_conclusao), 'dd/MM/yyyy', { locale: ptBR })}
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>



      </TabsContent>

      {/* Aba: Contato */}
      <TabsContent value="contato" className="space-y-6 mt-6">
        <ContatosList planoAcaoId={plano.id} readOnly />
      </TabsContent>

      {/* Aba: Resultado */}
      <TabsContent value="resultado" className="space-y-6 mt-6">
        {plano.status_final ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t('dashboard.plansTab.detail.finalResult')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">{t('dashboard.plansTab.detail.finalStatus')}</p>
                  <p className="text-sm font-medium capitalize">
                    {t(`dashboard.plansTab.finalStatuses.${plano.status_final}`, { defaultValue: plano.status_final.replace(/_/g, ' ') })}
                  </p>
                </div>
                {plano.data_fechamento && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">{t('dashboard.plansTab.detail.closingDate')}</p>
                    <p className="text-sm font-medium">
                      {format(new Date(plano.data_fechamento), "dd/MM/yyyy 'às' HH:mm", {
                        locale: ptBR,
                      })}
                    </p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <Target className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>{t('dashboard.plansTab.detail.planNotCompleted')}</p>
          </div>
        )}
      </TabsContent>

      {/* Aba: Histórico */}
      <TabsContent value="historico" className="space-y-6 mt-6">
        {historico && historico.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">{t('dashboard.plansTab.detail.updateHistory')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {historico.map((item, index) => (
                  <div key={item.id}>
                    {index > 0 && <Separator className="my-4" />}
                    <div className="flex gap-3">
                      <div className="flex-shrink-0">
                        <Clock className="h-4 w-4 text-muted-foreground mt-1" />
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium">{item.descricao_atualizacao}</p>
                          <Badge variant="outline" className="text-xs">
                            {item.tipo_atualizacao?.replace(/_/g, ' ')}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {item.usuario_nome || 'Sistema'}
                          </span>
                          <span>
                            {format(new Date(item.data_atualizacao), "dd/MM/yyyy 'às' HH:mm", {
                              locale: ptBR,
                            })}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="text-center py-12 text-muted-foreground">
            <History className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>{t('dashboard.plansTab.detail.noUpdatesYet')}</p>
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}
