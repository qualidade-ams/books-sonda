// =====================================================
// COMPONENTE: DETALHES DO PLANO DE AÇÃO
// =====================================================

import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ContatosList } from './ContatosList';
import type { PlanoAcaoCompleto, PlanoAcaoHistorico } from '@/types/planoAcao';
import { getCorPrioridade, getCorStatus } from '@/types/planoAcao';
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
  return (
    <Tabs defaultValue="informacoes" className="w-full">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="informacoes">
          <FileText className="h-4 w-4 mr-2" />
          Informações
        </TabsTrigger>
        <TabsTrigger value="contato">
          <MessageCircle className="h-4 w-4 mr-2" />
          Contato
        </TabsTrigger>
        <TabsTrigger value="resultado">
          <Target className="h-4 w-4 mr-2" />
          Resultado
        </TabsTrigger>
        <TabsTrigger value="historico">
          <History className="h-4 w-4 mr-2" />
          Histórico
        </TabsTrigger>
      </TabsList>

      {/* Aba: Informações */}
      <TabsContent value="informacoes" className="space-y-6 mt-6">
      {/* Informações da Pesquisa */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Informações da Pesquisa</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Empresa</p>
              <p className="font-medium">{plano.pesquisa?.empresa || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Cliente</p>
              <p className="font-medium">{plano.pesquisa?.cliente || '-'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Chamado</p>
              <p className="font-medium">
                {plano.pesquisa?.tipo_caso} {plano.pesquisa?.nro_caso}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Resposta</p>
              <p className="font-medium">{plano.pesquisa?.resposta || '-'}</p>
            </div>
          </div>
          {(plano.comentario_cliente || plano.pesquisa?.comentario_pesquisa) && (
            <div>
              <p className="text-sm text-muted-foreground mb-1">Comentário do Cliente</p>
              <p className="text-sm bg-muted p-3 rounded-md">
                {plano.comentario_cliente || plano.pesquisa?.comentario_pesquisa}
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Ação Corretiva e Preventiva */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Ações Planejadas</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm font-medium mb-2">Ação Corretiva</p>
            <p className="text-sm bg-muted p-3 rounded-md">
              {plano.descricao_acao_corretiva}
            </p>
          </div>
          {plano.acao_preventiva && (
            <div>
              <p className="text-sm font-medium mb-2">Ação Preventiva</p>
              <p className="text-sm bg-muted p-3 rounded-md">{plano.acao_preventiva}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Status e Prioridade */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Status do Plano</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-muted-foreground mb-2">Prioridade</p>
              <Badge className={getCorPrioridade(plano.prioridade)}>
                {plano.prioridade.charAt(0).toUpperCase() + plano.prioridade.slice(1)}
              </Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-2">Status</p>
              <Badge className={getCorStatus(plano.status_plano)}>
                {plano.status_plano === 'em_andamento'
                  ? 'Em Andamento'
                  : plano.status_plano === 'aguardando_retorno'
                  ? 'Aguardando'
                  : plano.status_plano.charAt(0).toUpperCase() + plano.status_plano.slice(1)}
              </Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-2">Data Início</p>
              <p className="text-sm font-medium flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                {format(new Date(plano.data_inicio), 'dd/MM/yyyy', { locale: ptBR })}
              </p>
            </div>
            {plano.data_conclusao && (
              <div>
                <p className="text-sm text-muted-foreground mb-2">Data Conclusão</p>
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
        <ContatosList planoAcaoId={plano.id} />
      </TabsContent>

      {/* Aba: Resultado */}
      <TabsContent value="resultado" className="space-y-6 mt-6">
        {plano.status_final ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Resultado Final</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Status Final</p>
                  <p className="text-sm font-medium capitalize">
                    {plano.status_final.replace(/_/g, ' ')}
                  </p>
                </div>
                {plano.data_fechamento && (
                  <div>
                    <p className="text-sm text-muted-foreground mb-1">Data de Fechamento</p>
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
            <p>Plano de ação ainda não foi concluído</p>
          </div>
        )}
      </TabsContent>

      {/* Aba: Histórico */}
      <TabsContent value="historico" className="space-y-6 mt-6">
        {historico && historico.length > 0 ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Histórico de Atualizações</CardTitle>
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
            <p>Nenhuma atualização registrada ainda</p>
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}
