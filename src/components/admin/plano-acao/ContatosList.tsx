// =====================================================
// COMPONENTE: LISTA DE CONTATOS DO PLANO DE AÇÃO
// =====================================================

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ContatoForm } from './ContatoForm';
import { useContatosPlanoAcao, useCriarContato, useAtualizarContato, useDeletarContato } from '@/hooks/usePlanoAcaoContatos';
import type { PlanoAcaoContato, PlanoAcaoContatoFormData } from '@/types/planoAcaoContatos';
import { getMeioContatoLabel, getRetornoClienteLabel, getMeioContatoIcon } from '@/types/planoAcaoContatos';
import {
  Plus,
  ChevronDown,
  ChevronRight,
  Edit,
  Trash2,
  Calendar,
  MessageSquare,
  User,
  Clock,
} from 'lucide-react';

interface ContatosListProps {
  planoAcaoId: string;
  onSubModalChange?: (isOpen: boolean) => void;
  readOnly?: boolean;
}

export function ContatosList({ planoAcaoId, onSubModalChange, readOnly = false }: ContatosListProps) {
  const { t } = useTranslation();
  const [expandedContatos, setExpandedContatos] = useState<Set<string>>(new Set());
  const [modalNovoContato, setModalNovoContato] = useState(false);
  const [contatoEditando, setContatoEditando] = useState<PlanoAcaoContato | null>(null);
  const [contatoParaDeletar, setContatoParaDeletar] = useState<string | null>(null);

  // Hooks
  const { data: contatos = [], isLoading } = useContatosPlanoAcao(planoAcaoId);
  const criarContatoMutation = useCriarContato();
  const atualizarContatoMutation = useAtualizarContato();
  const deletarContatoMutation = useDeletarContato();

  // Notificar o pai quando um sub-modal abre/fecha
  const hasSubModalOpen = modalNovoContato || !!contatoEditando || !!contatoParaDeletar;
  useEffect(() => {
    onSubModalChange?.(hasSubModalOpen);
  }, [hasSubModalOpen, onSubModalChange]);



  // Funções de controle de expansão
  const toggleExpansao = (contatoId: string) => {
    const newExpanded = new Set(expandedContatos);
    if (newExpanded.has(contatoId)) {
      newExpanded.delete(contatoId);
    } else {
      newExpanded.add(contatoId);
    }
    setExpandedContatos(newExpanded);
  };

  // Função para abrir modal de novo contato
  const handleNovoContato = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setModalNovoContato(true);
  };

  // Funções de CRUD
  const handleCriarContato = (dados: PlanoAcaoContatoFormData) => {
    console.log('🚀 Tentando criar contato:', dados);
    
    criarContatoMutation.mutate(
      { planoAcaoId, dados },
      {
        onSuccess: () => {
          console.log('✅ Contato criado com sucesso!');
          // Pequeno delay para garantir que o toast seja exibido antes de fechar o modal
          setTimeout(() => {
            setModalNovoContato(false);
          }, 100);
        },
        onError: (error) => {
          console.log('❌ Erro ao criar contato:', error);
          // Modal permanece aberto em caso de erro
        }
      }
    );
  };

  const handleAtualizarContato = (dados: PlanoAcaoContatoFormData) => {
    if (!contatoEditando) return;
    
    console.log('🚀 Tentando atualizar contato:', dados);
    
    atualizarContatoMutation.mutate(
      { id: contatoEditando.id, dados },
      {
        onSuccess: () => {
          console.log('✅ Contato atualizado com sucesso!');
          // Pequeno delay para garantir que o toast seja exibido antes de fechar o modal
          setTimeout(() => {
            setContatoEditando(null);
          }, 100);
        },
        onError: (error) => {
          console.log('❌ Erro ao atualizar contato:', error);
          // Modal permanece aberto em caso de erro
        }
      }
    );
  };

  const handleDeletarContato = () => {
    if (!contatoParaDeletar) return;
    
    deletarContatoMutation.mutate(
      { id: contatoParaDeletar, planoAcaoId },
      {
        onSuccess: () => {
          // Pequeno delay para garantir que o toast seja exibido antes de fechar o modal
          setTimeout(() => {
            setContatoParaDeletar(null);
          }, 100);
        },
      }
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-semibold">{t('dashboard.plansTab.contacts.contactHistory')}</h4>
          {!readOnly && (
            <Button size="sm" disabled>
              <Plus className="h-4 w-4 mr-2" />
              {t('dashboard.plansTab.contacts.newContact')}
            </Button>
          )}
        </div>
        <div className="text-center py-8 text-muted-foreground">
          {t('dashboard.plansTab.contacts.loadingContacts')}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Cabeçalho com botão de adicionar */}
      <div className="flex items-center justify-between">
        <h4 className="font-semibold">{t('dashboard.plansTab.contacts.contactHistory')} ({contatos.length})</h4>
        {!readOnly && (
          <Button 
            size="sm" 
            onClick={handleNovoContato}
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            {t('dashboard.plansTab.contacts.newContact')}
          </Button>
        )}
      </div>

      {/* Lista de contatos */}
      {contatos.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8 text-muted-foreground">
            <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>{t('dashboard.plansTab.contacts.noContactYet')}</p>
            {!readOnly && (
              <p className="text-sm mt-1">{t('dashboard.plansTab.contacts.noContactHint')}</p>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {contatos.map((contato) => {
            const isExpanded = expandedContatos.has(contato.id);
            
            return (
              <Card key={contato.id} className="overflow-hidden">
                <Collapsible>
                  <CollapsibleTrigger asChild>
                    <CardHeader 
                      className="cursor-pointer hover:bg-muted/50 transition-colors pb-3"
                      onClick={() => toggleExpansao(contato.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {isExpanded ? (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronRight className="h-4 w-4 text-muted-foreground" />
                          )}
                          
                          <div className="flex items-center gap-2">
                            <span className="text-lg">
                              {getMeioContatoIcon(contato.meio_contato)}
                            </span>
                            <div>
                              <p className="font-medium text-sm">
                                {getMeioContatoLabel(contato.meio_contato)} - {' '}
                                {format(new Date(contato.data_contato + 'T00:00:00'), 'dd/MM/yyyy', { locale: ptBR })}
                              </p>
                              <p className="text-xs text-muted-foreground line-clamp-1">
                                {contato.resumo_comunicacao}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          {contato.retorno_cliente && (
                            <Badge variant="outline" className="text-xs">
                              {getRetornoClienteLabel(contato.retorno_cliente)}
                            </Badge>
                          )}
                          
                          {!readOnly && (
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setContatoEditando(contato);
                                }}
                              >
                                <Edit className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setContatoParaDeletar(contato.id);
                                }}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                  </CollapsibleTrigger>

                  <CollapsibleContent>
                    <CardContent className="pt-0 pb-4 border-t bg-muted/20">
                      <div className="space-y-3">
                        {/* Resumo da Comunicação */}
                        <div>
                          <p className="text-sm font-medium mb-1 flex items-center gap-1 mt-2">
                            <MessageSquare className="h-3 w-3" />
                            {t('dashboard.plansTab.contacts.communicationSummary')}
                          </p>
                          <p className="text-sm bg-background p-3 rounded-md border">
                            {contato.resumo_comunicacao}
                          </p>
                        </div>

                        {/* Retorno do Cliente */}
                        {contato.retorno_cliente && (
                          <div>
                            <p className="text-sm font-medium mb-1 flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {t('dashboard.plansTab.contacts.clientReturn')}
                            </p>
                            <Badge variant="outline">
                              {getRetornoClienteLabel(contato.retorno_cliente)}
                            </Badge>
                          </div>
                        )}

                        {/* Observações */}
                        {contato.observacoes && (
                          <div>
                            <p className="text-sm font-medium mb-1">{t('dashboard.plansTab.contacts.observations')}</p>
                            <p className="text-sm bg-background p-3 rounded-md border">
                              {contato.observacoes}
                            </p>
                          </div>
                        )}

                        {/* Metadados */}
                        <div className="flex items-center gap-4 text-xs text-muted-foreground pt-2 border-t">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {t('dashboard.plansTab.contacts.registeredOn')} {format(new Date(contato.criado_em), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                          </span>
                          {contato.atualizado_em !== contato.criado_em && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {t('dashboard.plansTab.contacts.updatedOn')} {format(new Date(contato.atualizado_em), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                            </span>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </CollapsibleContent>
                </Collapsible>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal de Novo Contato */}
      <Dialog open={modalNovoContato} onOpenChange={setModalNovoContato}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('dashboard.plansTab.contacts.registerNewContact')}</DialogTitle>
          </DialogHeader>
          <ContatoForm
            onSubmit={handleCriarContato}
            onCancel={() => setModalNovoContato(false)}
            isLoading={criarContatoMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Modal de Editar Contato */}
      <Dialog open={!!contatoEditando} onOpenChange={() => setContatoEditando(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{t('dashboard.plansTab.contacts.editContact')}</DialogTitle>
          </DialogHeader>
          {contatoEditando && (
            <ContatoForm
              contato={contatoEditando}
              onSubmit={handleAtualizarContato}
              onCancel={() => setContatoEditando(null)}
              isLoading={atualizarContatoMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog de Confirmação de Exclusão */}
      <AlertDialog open={!!contatoParaDeletar} onOpenChange={() => setContatoParaDeletar(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('dashboard.plansTab.contacts.confirmDeletion')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('dashboard.plansTab.contacts.confirmDeletionDesc')}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('dashboard.plansTab.contacts.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeletarContato}
              className="bg-red-600 hover:bg-red-700"
              disabled={deletarContatoMutation.isPending}
            >
              {deletarContatoMutation.isPending ? t('dashboard.plansTab.contacts.removing') : t('dashboard.plansTab.contacts.remove')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}