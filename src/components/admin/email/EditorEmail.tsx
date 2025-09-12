import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface EmailEditorProps {
  template: {
    assunto: string;
    corpo: string;
  };
  onTemplateChange: (template: { assunto: string; corpo: string }) => void;
}

const EmailEditor: React.FC<EmailEditorProps> = ({ template, onTemplateChange }) => {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="assunto">Assunto do E-mail</Label>
        <Input
          id="assunto"
          value={template.assunto}
          onChange={(e) => onTemplateChange({ ...template, assunto: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="corpo">Corpo do E-mail (HTML)</Label>
        <Textarea
          id="corpo"
          rows={20}
          value={template.corpo}
          onChange={(e) => onTemplateChange({ ...template, corpo: e.target.value })}
          className="font-mono text-sm"
          placeholder="Digite o HTML do seu e-mail aqui..."
        />
      </div>
    </div>
  );
};

export default EmailEditor;