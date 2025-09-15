import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { 
  Mail, 
  User, 
  Calendar,
  FileText,
  Users
} from 'lucide-react';
import { GrupoResponsavelCompleto } from '@/types/clientBooksTypes';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface GrupoDetailsModalProps {
  grupo: GrupoResponsavelCompleto | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function GrupoDetailsModal({ grupo, open, onOpenChange }: GrupoDetailsModalProps) {
  if (!grupo) return null;

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", {
        locale: ptBR,
      });
    } catch {
      return 'Data inválida';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Detalhes do Grupo: {grupo.nome}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Informações básicas */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Informações Básicas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Nome</label>
                  <p className="text-sm font-medium">{grupo.nome}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Total de E-mails</label>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">
                      {grupo.emails?.length || 0} e-mail{(grupo.emails?.length || 0) !== 1 ? 's' : ''}
                    </Badge>
                  </div>
                </div>
              </div>

              {grupo.descricao && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Descrição</label>
                  <p className="text-sm">{grupo.descricao}</p>
                </div>
              )}

              <Separator />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-500">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>Criado em: {formatDate(grupo.created_at)}</span>
                </div>
                {grupo.updated_at && grupo.updated_at !== grupo.created_at && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>Atualizado em: {formatDate(grupo.updated_at)}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Lista de e-mails */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Mail className="h-5 w-5" />
                E-mails do Grupo ({grupo.emails?.length || 0})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {grupo.emails && grupo.emails.length > 0 ? (
                <div className="space-y-3">
                  {grupo.emails.map((email, index) => (
                    <div key={email.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center justify-center w-8 h-8 bg-primary/10 rounded-full">
                          <User className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{email.email}</p>
                          {email.nome && (
                            <p className="text-sm text-gray-500">{email.nome}</p>
                          )}
                        </div>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        #{index + 1}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <Mail className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">
                    Nenhum e-mail cadastrado
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Este grupo ainda não possui e-mails cadastrados.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Informações adicionais */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Informações Técnicas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <label className="font-medium text-gray-500">ID do Grupo</label>
                  <p className="font-mono text-xs bg-gray-100 p-2 rounded mt-1 break-all">
                    {grupo.id}
                  </p>
                </div>
                <div>
                  <label className="font-medium text-gray-500">Status</label>
                  <div className="mt-1">
                    <Badge variant="default">Ativo</Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}