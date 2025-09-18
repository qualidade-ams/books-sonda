import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { RefreshCw, TestTube } from 'lucide-react';
import { useClientBooksVariables } from '@/hooks/useClientBooksVariables';
import PreviewEmailClientBooks from './PreviewEmailClientBooks';
import type { ClientBooksTemplateData } from '@/utils/clientBooksVariableMapping';
import type { EmpresaClienteCompleta, ClienteCompleto } from '@/types/clientBooks';

interface TesteVariaveisClientBooksProps {
  template: {
    assunto: string;
    corpo: string;
  };
  onDadosChange?: (dados: ClientBooksTemplateData) => void;
}

const TesteVariaveisClientBooks = ({ 
  template, 
  onDadosChange 
}: TesteVariaveisClientBooksProps) => {
  const [usarDadosPersonalizados, setUsarDadosPersonalizados] = useState(false);
  const [dadosPersonalizados, setDadosPersonalizados] = useState<ClientBooksTemplateData | null>(null);

  const { dadosExemplo } = useClientBooksVariables();

  // Inicializar dados personalizados com dados de exemplo
  const inicializarDadosPersonalizados = () => {
    setDadosPersonalizados(dadosExemplo);
    setUsarDadosPersonalizados(true);
  };

  const resetarParaDadosExemplo = () => {
    setDadosPersonalizados(null);
    setUsarDadosPersonalizados(false);
  };

  const atualizarEmpresa = (campo: string, valor: any) => {
    if (!dadosPersonalizados) return;

    setDadosPersonalizados({
      ...dadosPersonalizados,
      empresa: {
        ...dadosPersonalizados.empresa,
        [campo]: valor
      }
    });
  };

  const atualizarCliente = (campo: string, valor: any) => {
    if (!dadosPersonalizados) return;

    setDadosPersonalizados({
      ...dadosPersonalizados,
      cliente: {
        ...dadosPersonalizados.cliente,
        [campo]: valor
      }
    });
  };

  const atualizarDisparo = (campo: string, valor: any) => {
    if (!dadosPersonalizados) return;

    setDadosPersonalizados({
      ...dadosPersonalizados,
      disparo: {
        ...dadosPersonalizados.disparo,
        [campo]: valor
      }
    });
  };

  // Notificar mudanças para o componente pai
  const dadosParaUsar = usarDadosPersonalizados ? dadosPersonalizados : null;
  
  return (
    <div className="space-y-6">
      {/* Controles */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TestTube className="h-5 w-5" />
            Teste de Variáveis - Sistema de Books
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="usar-personalizados"
              checked={usarDadosPersonalizados}
              onCheckedChange={(checked) => {
                if (checked) {
                  inicializarDadosPersonalizados();
                } else {
                  resetarParaDadosExemplo();
                }
              }}
            />
            <Label htmlFor="usar-personalizados">
              Usar dados personalizados para teste
            </Label>
          </div>

          {!usarDadosPersonalizados && (
            <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-800">
                Usando dados de exemplo padrão. Marque a opção acima para personalizar os dados de teste.
              </p>
            </div>
          )}

          {usarDadosPersonalizados && dadosPersonalizados && (
            <div className="space-y-6">
              <div className="flex justify-end">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={resetarParaDadosExemplo}
                  className="flex items-center gap-2"
                >
                  <RefreshCw className="h-4 w-4" />
                  Resetar para Exemplo
                </Button>
              </div>

              {/* Dados da Empresa */}
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900">Dados da Empresa</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="empresa-nome-completo">Nome Completo</Label>
                    <Input
                      id="empresa-nome-completo"
                      value={dadosPersonalizados.empresa.nome_completo}
                      onChange={(e) => atualizarEmpresa('nome_completo', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="empresa-nome-abreviado">Nome Abreviado</Label>
                    <Input
                      id="empresa-nome-abreviado"
                      value={dadosPersonalizados.empresa.nome_abreviado}
                      onChange={(e) => atualizarEmpresa('nome_abreviado', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="empresa-email-gestor">E-mail do Gestor</Label>
                    <Input
                      id="empresa-email-gestor"
                      type="email"
                      value={dadosPersonalizados.empresa.email_gestor || ''}
                      onChange={(e) => atualizarEmpresa('email_gestor', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="empresa-template-padrao">Template Padrão</Label>
                    <Select
                      value={dadosPersonalizados.empresa.template_padrao}
                      onValueChange={(value) => atualizarEmpresa('template_padrao', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="portugues">Português</SelectItem>
                        <SelectItem value="ingles">Inglês</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="md:col-span-2">
                    <Label htmlFor="empresa-link-sharepoint">Link SharePoint</Label>
                    <Input
                      id="empresa-link-sharepoint"
                      value={dadosPersonalizados.empresa.link_sharepoint || ''}
                      onChange={(e) => atualizarEmpresa('link_sharepoint', e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              {/* Dados do Cliente */}
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900">Dados do Cliente</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="cliente-nome">Nome Completo</Label>
                    <Input
                      id="cliente-nome"
                      value={dadosPersonalizados.cliente.nome_completo}
                      onChange={(e) => atualizarCliente('nome_completo', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="cliente-email">E-mail</Label>
                    <Input
                      id="cliente-email"
                      type="email"
                      value={dadosPersonalizados.cliente.email}
                      onChange={(e) => atualizarCliente('email', e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="cliente-funcao">Função</Label>
                    <Input
                      id="cliente-funcao"
                      value={dadosPersonalizados.cliente.funcao || ''}
                      onChange={(e) => atualizarCliente('funcao', e.target.value)}
                    />
                  </div>
                  <div className="flex items-center space-x-2 pt-6">
                    <Checkbox
                      id="cliente-principal"
                      checked={dadosPersonalizados.cliente.principal_contato}
                      onCheckedChange={(checked) => atualizarCliente('principal_contato', checked)}
                    />
                    <Label htmlFor="cliente-principal">
                      Principal contato
                    </Label>
                  </div>
                </div>
              </div>

              <Separator />

              {/* Dados do Disparo */}
              <div className="space-y-4">
                <h4 className="font-medium text-gray-900">Dados do Disparo</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="disparo-mes">Mês</Label>
                    <Select
                      value={String(dadosPersonalizados.disparo.mes)}
                      onValueChange={(value) => atualizarDisparo('mes', parseInt(value))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 12 }, (_, i) => i + 1).map(mes => (
                          <SelectItem key={mes} value={String(mes)}>
                            {mes.toString().padStart(2, '0')}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="disparo-ano">Ano</Label>
                    <Input
                      id="disparo-ano"
                      type="number"
                      value={dadosPersonalizados.disparo.ano}
                      onChange={(e) => atualizarDisparo('ano', parseInt(e.target.value))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="disparo-data">Data do Disparo</Label>
                    <Input
                      id="disparo-data"
                      type="date"
                      value={dadosPersonalizados.disparo.dataDisparo.toISOString().split('T')[0]}
                      onChange={(e) => atualizarDisparo('dataDisparo', new Date(e.target.value))}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Preview */}
      <PreviewEmailClientBooks
        template={template}
        dadosTemplate={dadosParaUsar || undefined}
      />
    </div>
  );
};

export default TesteVariaveisClientBooks;