import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Eye, EyeOff } from 'lucide-react';
import { useEmailTemplates } from '@/hooks/useEmailTemplates';
import { useTemplateMappingValidation } from '@/hooks/useTemplateMappingValidation';
import EmailEditor from './EditorEmail';
import EmailPreview from './PreviewEmail';
import TemplateVariables from './VariaveisTemplate';
import TestEmailDialog from '../DialogTesteEmail';
import TesteVariaveisEmail from './TesteVariaveisEmail';
import { FormularioData } from '@/hooks/useEmailVariableMapping';

interface FormularioNovoTemplateProps {
  onSuccess: () => void;
}

const FormularioNovoTemplate: React.FC<FormularioNovoTemplateProps> = ({ onSuccess }) => {
  const { createTemplate } = useEmailTemplates();
  
  // Estado para dados de teste
  const [dadosTeste, setDadosTeste] = useState<FormularioData | null>(null);
  const [loading, setLoading] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Hook para validação de mapeamento
  const {
    validationState,
    isValidating,
    validateMapping,
    hasError: hasValidationError
  } = useTemplateMappingValidation({
    showToasts: false, // Não mostrar toasts, usar validação inline
    autoValidate: false // Validar manualmente antes de submeter
  });

  const [formData, setFormData] = useState({
    nome: '',
    descricao: '',
    assunto: 'Book | {{razaoSocial}} | {{mes}} - {{ano}}',
    corpo: `<!DOCTYPE html>
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

								<img src="http://books-sonda.vercel.app/images/logo-sonda.png" alt="Logo" width="150" style="display: block; width: 100%; max-width: 150px; height: auto; border: 0; line-height: 100%; outline: none; text-decoration: none;" />

								<!--[if gte mso 9]>
								  </td>
							   </tr>
							</table>
							<![endif]-->
							</td>
						</tr>
						<tr>
							<td style="padding: 24px; font-size: 14px; color: #111; line-height: 1.5;">
								<p>Prezados,</p>

								<p>Informamos que está disponível o <strong>Book Mensal AMS</strong>,
									<a href="#" style="color:#005baa; font-weight:bold; text-decoration:none;">CLIQUE AQUI</a>.
								</p>

								<p>Para visualizar o book, somente e-mails cadastrados vão conseguir ter acesso. Na tela de Login insira o seu e-mail corporativo e você receberá um código de autenticação. Copie o código e cole no campo indicado, para completar o Login.</p>

								<p>Caso não esteja cadastrado, envie um e-mail para <a href=mailto:qualidadeams@sonda.com style="color:#005baa; text-decoration:none;">qualidadeams@sonda.com</a>.</p>

								<p>Os dados sobre o fechamento do banco de horas serão enviados de forma separada dentro do mês corrente.</p>
							</td>
						</tr>
						<tr>
							<td align="center" style="padding: 16px; font-size: 12px; color: #777;">
								© 2025 SONDA. Todos os direitos reservados.
							</td>
						</tr>
					</table>
				</td>
			</tr>
		</table>
	</body>
	</html>`
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    // Validação básica dos campos obrigatórios
    if (!formData.nome.trim() || !formData.assunto.trim() || !formData.corpo.trim()) {
      console.log('Validação básica falhou:', {
        nome: formData.nome,
        assunto: formData.assunto,
        corpo: formData.corpo.length
      });
      setValidationError('Todos os campos obrigatórios devem ser preenchidos');
      return;
    }

    setLoading(true);

    try {
      const result = await createTemplate({
        nome: formData.nome,
        descricao: formData.descricao || null,
        assunto: formData.assunto,
        corpo: formData.corpo,
        tipo: 'book',
        ativo: true,
        vinculado_formulario: true
      });

      if (result.success) {
        onSuccess();
      } else {
        console.error('Erro ao criar template:', result.error);
        setValidationError('Erro ao criar template. Tente novamente.');
      }
    } catch (error) {
      console.error('Erro inesperado ao criar template:', error);
      setValidationError('Erro inesperado ao criar template');
    } finally {
      setLoading(false);
    }
  };

  const handleTemplateChange = (newTemplate: { assunto: string; corpo: string }) => {
    console.log('Template sendo alterado (novo):', newTemplate);
    setFormData(prev => {
      const updated = {
        ...prev,
        assunto: newTemplate.assunto,
        corpo: newTemplate.corpo
      };
      console.log('FormData atualizado (novo):', updated);
      return updated;
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Informações do Template</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nome">Nome do Template *</Label>
            <Input
              id="nome"
              value={formData.nome}
              onChange={(e) => setFormData(prev => ({ ...prev, nome: e.target.value }))}
              placeholder="Ex: Template Book"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="descricao">Descrição</Label>
            <Textarea
              id="descricao"
              value={formData.descricao}
              onChange={(e) => setFormData(prev => ({ ...prev, descricao: e.target.value }))}
              placeholder="Descrição opcional do template"
              rows={2}
            />
          </div>

          {/* Exibir erro de validação */}
          {validationError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md">
              <p className="text-sm text-red-600">{validationError}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Conteúdo do E-mail</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs defaultValue="preview" className="space-y-4">
            <TabsList className="w-full grid grid-cols-3">
              <TabsTrigger value="preview" className="flex items-center gap-2">
                <Eye className="h-4 w-4" />
                Preview
              </TabsTrigger>
              <TabsTrigger value="editor" className="flex items-center gap-2">
                <EyeOff className="h-4 w-4" />
                Editor HTML
              </TabsTrigger>
              <TabsTrigger value="teste" className="flex items-center gap-2">
                🧪 Teste Variáveis
              </TabsTrigger>
            </TabsList>

            <TabsContent value="preview">
              <EmailPreview template={formData} />
            </TabsContent>

            <TabsContent value="editor">
              <EmailEditor
                template={formData}
                onTemplateChange={handleTemplateChange}
              />
              <TemplateVariables />
            </TabsContent>

            <TabsContent value="teste">
              <TesteVariaveisEmail 
                template={formData}
                onDadosChange={setDadosTeste}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <div className="flex flex-col sm:flex-row gap-3 justify-end">
        <TestEmailDialog 
          emailTemplate={formData}
          dadosPersonalizados={dadosTeste}
        />
        <Button
          type="submit"
          disabled={loading || isValidating}
          className="flex-1 sm:flex-initial"
        >
          {loading ? 'Criando...' : isValidating ? 'Validando...' : 'Criar Template'}
        </Button>
      </div>
    </form>
  );
};

export default FormularioNovoTemplate;