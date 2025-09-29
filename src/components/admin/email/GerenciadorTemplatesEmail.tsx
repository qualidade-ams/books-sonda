import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Plus,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Mail,
  FileText,
  Settings,
  Send,
  Copy
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { useEmailTemplates } from '@/hooks/useEmailTemplates';
import FormularioNovoTemplate from './FormularioNovoTemplate';
import EditorTemplateCompleto from './EditorTemplateCompleto';
import TestEmailDialog from '../DialogTesteEmail';

import ProtectedAction from '@/components/auth/ProtectedAction';
import { useToast } from '@/hooks/use-toast';
import type { EmailTemplate } from '@/types/approval';

const EmailTemplateManager: React.FC = () => {
  const {
    templates,
    loading,
    deleteTemplate,
    toggleTemplateStatus,
    refreshTemplates
  } = useEmailTemplates();

  const { toast } = useToast();
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  const getModalidadeLabel = (modalidade: string | null) => {
    if (!modalidade || modalidade === 'mensal') return 'Mensal';
    return modalidade;
  };

  const getFormularioLabel = (formulario: string | null) => {
    if (!formulario || formulario === 'book') return 'Book';
    return formulario;
  };

  const handleEdit = (template: EmailTemplate) => {
    setSelectedTemplate(template);
    setIsEditDialogOpen(true);
  };

  const handleDelete = async (templateId: string) => {
    await deleteTemplate(templateId);
  };

  const handleToggleStatus = async (templateId: string, currentStatus: boolean) => {
    await toggleTemplateStatus(templateId, !currentStatus);
  };

  const handleOpenCreateDialog = () => {
    setIsCreateDialogOpen(true);
  };

  const handleCopyId = async (templateId: string, templateName: string) => {
    try {
      await navigator.clipboard.writeText(templateId);
      toast({
        title: "ID copiado!",
        description: `ID do template "${templateName}" copiado para a área de transferência.`,
      });
    } catch (error) {
      toast({
        title: "Erro ao copiar",
        description: "Não foi possível copiar o ID. Tente selecionar e copiar manualmente.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Carregando templates...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Não mostrar fallback de erro, permitir criação mesmo sem templates existentes

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-700 dark:text-gray-300">Templates de E-mail</h2>
          <p className="text-gray-600">
            Gerencie templates de e-mail. Use o ID do template na importação Excel de empresas.
          </p>
        </div>

        <ProtectedAction screenKey="email-config" requiredLevel="edit">
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="flex items-center gap-2" onClick={handleOpenCreateDialog}>
                <Plus className="h-4 w-4" />
                Novo Template
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" aria-describedby="create-template-description">
              <DialogHeader>
                <DialogTitle>Criar Novo Template</DialogTitle>
                <p id="create-template-description" className="text-sm text-gray-600">
                  Crie um novo template de e-mail personalizado para um formulário e modalidade específicos.
                </p>
              </DialogHeader>
              <FormularioNovoTemplate
                onSuccess={() => {
                  setIsCreateDialogOpen(false);
                  refreshTemplates();
                }}
              />
            </DialogContent>
          </Dialog>
        </ProtectedAction>
      </div>

      {templates.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Mail className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">
              Nenhum template encontrado
            </h3>
            <p className="text-gray-600 mb-4">
              Crie seu primeiro template de e-mail para começar
            </p>
            <ProtectedAction screenKey="email-config" requiredLevel="edit">
              <Button onClick={handleOpenCreateDialog}>
                <Plus className="h-4 w-4 mr-2" />
                Criar Template
              </Button>
            </ProtectedAction>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {templates.map((template) => (
            <Card key={template.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300">
                        {template.nome}
                      </h3>
                      <Badge
                        variant={template.ativo ? "default" : "secondary"}
                        className="flex items-center gap-1"
                      >
                        {template.ativo ? (
                          <Eye className="h-3 w-3" />
                        ) : (
                          <EyeOff className="h-3 w-3" />
                        )}
                        {template.ativo ? 'Ativo' : 'Inativo'}
                      </Badge>
                    </div>

                    {template.descricao && (
                      <p className="text-gray-600 mb-3">{template.descricao}</p>
                    )}

                    <div className="flex flex-wrap gap-2 mb-3">
                      <Badge variant="outline" className="flex items-center gap-1">
                        <FileText className="h-3 w-3" />
                        {getFormularioLabel(template.formulario)}
                      </Badge>
                      <Badge variant="outline" className="flex items-center gap-1">
                        <Settings className="h-3 w-3" />
                        {getModalidadeLabel(template.modalidade)}
                      </Badge>
                    </div>

                    <div className="text-sm text-gray-500">
                      <p><strong>Assunto:</strong> {template.assunto}</p>
                      <div className="mt-1 flex items-center gap-2">
                        <span><strong>ID para Importação:</strong></span>
                        <div className="flex items-center gap-1">
                          <code
                            className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-xs font-mono select-all"
                            title="ID do template para usar na importação Excel"
                          >
                            {template.id}
                          </code>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => handleCopyId(template.id, template.nome)}
                            title="Copiar ID"
                          >
                            <Copy className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      <p className="mt-1">
                        <strong>Criado em:</strong> {' '}
                        {template.created_at ?
                          new Date(template.created_at).toLocaleDateString('pt-BR') :
                          'N/A'
                        }
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 ml-4">
                    <ProtectedAction screenKey="email-config" requiredLevel="edit">
                      <TestEmailDialog
                        emailTemplate={{
                          assunto: template.assunto,
                          corpo: template.corpo
                        }}
                        triggerButton={
                          <Button variant="outline" size="sm" title="Enviar e-mail de teste">
                            <Send className="h-4 w-4" />
                          </Button>
                        }
                      />
                    </ProtectedAction>

                    <ProtectedAction screenKey="email-config" requiredLevel="edit">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleToggleStatus(template.id, template.ativo)}
                        title={template.ativo ? 'Desativar template' : 'Ativar template'}
                      >
                        {template.ativo ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </ProtectedAction>

                    <ProtectedAction screenKey="email-config" requiredLevel="edit">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(template)}
                        title="Editar template"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </ProtectedAction>

                    <ProtectedAction screenKey="email-config" requiredLevel="edit">
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="outline" size="sm" title="Excluir template">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                            <AlertDialogDescription>
                              Tem certeza que deseja excluir o template "{template.nome}"?
                              Esta ação não pode ser desfeita.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleDelete(template.id)}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              Excluir
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </ProtectedAction>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialog para editar template */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto" aria-describedby="edit-template-description">
          <DialogHeader>
            <DialogTitle>Editar Template</DialogTitle>
            <p id="edit-template-description" className="text-sm text-gray-600">
              Edite as configurações e conteúdo do template de e-mail selecionado.
            </p>
          </DialogHeader>
          {selectedTemplate && (
            <EditorTemplateCompleto
              template={selectedTemplate}
              onSuccess={() => {
                setIsEditDialogOpen(false);
                setSelectedTemplate(null);
                refreshTemplates();
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default EmailTemplateManager;