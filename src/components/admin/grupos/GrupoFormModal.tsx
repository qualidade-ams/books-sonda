import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { GrupoForm } from './GrupoForm';
import { GrupoFormData, GrupoResponsavelCompleto } from '@/types/clientBooksTypes';

interface GrupoFormModalProps {
  grupo?: GrupoResponsavelCompleto | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: GrupoFormData) => Promise<void>;
  isLoading?: boolean;
}

export function GrupoFormModal({ 
  grupo, 
  open, 
  onOpenChange, 
  onSubmit,
  isLoading = false 
}: GrupoFormModalProps) {
  const handleSubmit = async (data: GrupoFormData) => {
    await onSubmit(data);
    onOpenChange(false);
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {grupo ? 'Editar Grupo' : 'Novo Grupo de Responsáveis'}
          </DialogTitle>
        </DialogHeader>

        <GrupoForm
          grupo={grupo}
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isLoading={isLoading}
        />
      </DialogContent>
    </Dialog>
  );
}