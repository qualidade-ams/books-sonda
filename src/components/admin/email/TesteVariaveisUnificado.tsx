import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Book, Award } from 'lucide-react';
import TesteVariaveisEmail from './TesteVariaveisEmail';
import TesteVariaveisClientBooks from './TesteVariaveisClientBooks';
import TesteVariaveisElogios from './TesteVariaveisElogios';
import type { FormularioData } from '@/hooks/useEmailVariableMapping';
import type { ClientBooksTemplateData } from '@/utils/clientBooksVariableMapping';

interface TesteVariaveisUnificadoProps {
  template: {
    assunto: string;
    corpo: string;
    formulario?: string;
  };
  templateId?: string;
  dadosFormularioIniciais?: FormularioData | null;
  onDadosFormularioChange?: (dados: FormularioData) => void;
  onDadosClientBooksChange?: (dados: ClientBooksTemplateData) => void;
}

const TesteVariaveisUnificado = ({ 
  template, 
  templateId,
  dadosFormularioIniciais,
  onDadosFormularioChange,
  onDadosClientBooksChange
}: TesteVariaveisUnificadoProps) => {
  const [activeTab, setActiveTab] = useState(() => {
    // Determinar aba inicial baseada no tipo de template
    if (template.formulario === 'book') {
      return 'client-books';
    }
    return 'formulario';
  });

  // Determinar quais abas mostrar baseado no template
  const mostrarFormulario = !template.formulario || template.formulario !== 'book';
  const mostrarClientBooks = !template.formulario || template.formulario === 'book';

  // Se só há um tipo disponível, mostrar com tab de elogios
  if (mostrarFormulario && !mostrarClientBooks) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Teste de Variáveis</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="formulario" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Sistema de Formulários
              </TabsTrigger>
              <TabsTrigger value="elogios" className="flex items-center gap-2">
                <Award className="h-4 w-4" />
                Sistema de Elogios
              </TabsTrigger>
            </TabsList>
            <TabsContent value="formulario" className="mt-4">
              <TesteVariaveisEmail
                template={template}
                templateId={templateId}
                dadosIniciais={dadosFormularioIniciais}
                onDadosChange={onDadosFormularioChange}
              />
            </TabsContent>
            <TabsContent value="elogios" className="mt-4">
              <TesteVariaveisElogios template={template} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    );
  }

  if (mostrarClientBooks && !mostrarFormulario) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Teste de Variáveis</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="client-books" className="flex items-center gap-2">
                <Book className="h-4 w-4" />
                Sistema de Books
              </TabsTrigger>
              <TabsTrigger value="elogios" className="flex items-center gap-2">
                <Award className="h-4 w-4" />
                Sistema de Elogios
              </TabsTrigger>
            </TabsList>
            <TabsContent value="client-books" className="mt-4">
              <TesteVariaveisClientBooks
                template={template}
                onDadosChange={onDadosClientBooksChange}
              />
            </TabsContent>
            <TabsContent value="elogios" className="mt-4">
              <TesteVariaveisElogios template={template} />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    );
  }

  // Calcular número de colunas visíveis para o grid
  const colunasVisiveis = [mostrarClientBooks, mostrarFormulario, true].filter(Boolean).length;

  // Mostrar ambos em tabs
  return (
    <Card>
      <CardHeader>
        <CardTitle>Teste de Variáveis</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className={`grid w-full grid-cols-${colunasVisiveis}`}>
            {mostrarClientBooks && (
              <TabsTrigger value="client-books" className="flex items-center gap-2">
                <Book className="h-4 w-4" />
                Sistema de Books
              </TabsTrigger>
            )}
            {mostrarFormulario && (
              <TabsTrigger value="formulario" className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Sistema de Formulários
              </TabsTrigger>
            )}
            <TabsTrigger value="elogios" className="flex items-center gap-2">
              <Award className="h-4 w-4" />
              Sistema de Elogios
            </TabsTrigger>
          </TabsList>

          {mostrarClientBooks && (
            <TabsContent value="client-books" className="mt-4">
              <TesteVariaveisClientBooks
                template={template}
                onDadosChange={onDadosClientBooksChange}
              />
            </TabsContent>
          )}

          {mostrarFormulario && (
            <TabsContent value="formulario" className="mt-4">
              <TesteVariaveisEmail
                template={template}
                templateId={templateId}
                dadosIniciais={dadosFormularioIniciais}
                onDadosChange={onDadosFormularioChange}
              />
            </TabsContent>
          )}

          <TabsContent value="elogios" className="mt-4">
            <TesteVariaveisElogios template={template} />
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default TesteVariaveisUnificado;