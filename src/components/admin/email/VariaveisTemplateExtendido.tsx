import { useState } from 'react';
import { ChevronDown, ChevronRight, Copy, Book, FileText } from 'lucide-react';
import { obterVariaveisDisponiveis } from '@/utils/emailVariableMapping';
import { obterVariaveisClientBooksDisponiveis } from '@/utils/clientBooksVariableMapping';

interface VariaveisTemplateExtendidoProps {
  mostrarVariaveisBooks?: boolean;
  mostrarVariaveisFormulario?: boolean;
}

const VariaveisTemplateExtendido = ({ 
  mostrarVariaveisBooks = true,
  mostrarVariaveisFormulario = true 
}: VariaveisTemplateExtendidoProps) => {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(['Dados da Empresa'])
  );
  
  const variaveisFormulario = obterVariaveisDisponiveis();
  const variaveisBooks = obterVariaveisClientBooksDisponiveis();

  const toggleCategory = (categoria: string, event: React.MouseEvent | React.KeyboardEvent) => {
    event.preventDefault();
    event.stopPropagation();
    event.nativeEvent.stopImmediatePropagation();

    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoria)) {
      newExpanded.delete(categoria);
    } else {
      newExpanded.add(categoria);
    }
    setExpandedCategories(newExpanded);
  };

  const copyToClipboard = (variavel: string, event: React.MouseEvent | React.KeyboardEvent) => {
    event.preventDefault();
    event.stopPropagation();
    navigator.clipboard.writeText(`{{${variavel}}}`);
  };

  const renderVariaveisSection = (
    titulo: string,
    icone: React.ReactNode,
    variaveis: { [categoria: string]: string[] },
    prefixo: string = ''
  ) => (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-3">
        {icone}
        <h5 className="font-semibold text-gray-800">{titulo}</h5>
      </div>
      
      {Object.entries(variaveis).map(([categoria, variaveisLista]) => {
        const categoriaKey = `${prefixo}${categoria}`;
        return (
          <div key={categoriaKey} className="bg-white rounded-lg border border-gray-200">
            <div
              onClick={(e) => toggleCategory(categoriaKey, e)}
              className="w-full flex items-center justify-between p-3 text-left hover:bg-gray-50 rounded-lg transition-colors cursor-pointer"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  toggleCategory(categoriaKey, e);
                }
              }}
            >
              <span className="font-medium text-gray-700">{categoria}</span>
              {expandedCategories.has(categoriaKey) ? (
                <ChevronDown className="h-4 w-4 text-gray-600" />
              ) : (
                <ChevronRight className="h-4 w-4 text-gray-600" />
              )}
            </div>

            {expandedCategories.has(categoriaKey) && (
              <div className="px-3 pb-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {variaveisLista.map((variavel) => (
                    <div
                      key={variavel}
                      className="flex items-center justify-between bg-gray-50 px-3 py-2 rounded border group hover:bg-gray-100 transition-colors"
                    >
                      <code className="text-sm font-mono text-green-700">
                        {`{{${variavel}}}`}
                      </code>
                      <div
                        onClick={(e) => copyToClipboard(variavel, e)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-200 rounded cursor-pointer"
                        title="Copiar variável"
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            copyToClipboard(variavel, e);
                          }
                        }}
                      >
                        <Copy className="h-3 w-3 text-gray-600" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  return (
    <div className="bg-blue-50 p-4 rounded-lg space-y-6">
      <h4 className="font-semibold text-blue-900">Variáveis Disponíveis para Templates</h4>

      {mostrarVariaveisBooks && (
        <div className="bg-green-50 p-4 rounded-lg border border-green-200">
          {renderVariaveisSection(
            'Sistema de Books (Empresas e Colaboradores)',
            <Book className="h-5 w-5 text-green-600" />,
            variaveisBooks,
            'books-'
          )}
        </div>
      )}

      {mostrarVariaveisFormulario && (
        <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
          {renderVariaveisSection(
            'Sistema de Formulários (Comply)',
            <FileText className="h-5 w-5 text-blue-600" />,
            variaveisFormulario,
            'form-'
          )}
        </div>
      )}

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
        <h5 className="font-medium text-amber-800 mb-2">📋 Descrição das Variáveis</h5>
        <div className="text-sm text-amber-700 space-y-1">
          {mostrarVariaveisBooks && (
            <>
              <p><strong>Sistema de Books:</strong> Variáveis relacionadas a empresas clientes, colaboradores e disparos mensais</p>
              <p><strong>Dados da Empresa:</strong> Informações cadastrais da empresa cliente (nome, produtos, status, etc.)</p>
              <p><strong>Dados do Colaborador:</strong> Informações do destinatário do e-mail (nome, função, contato principal)</p>
              <p><strong>Dados do Disparo:</strong> Informações sobre o envio atual (mês, ano, data de disparo)</p>
            </>
          )}
          {mostrarVariaveisFormulario && (
            <>
              <p><strong>Sistema de Formulários:</strong> Variáveis do sistema Comply para propostas comerciais</p>
              <p><strong>Valores Mensais:</strong> Calculados automaticamente dividindo valores totais pelo tempo de contrato</p>
              <p><strong>Escopo:</strong> Múltiplos escopos são separados por vírgula + quebra de linha</p>
            </>
          )}
          <p><strong>Valores Monetários:</strong> Formatados automaticamente em Real (R$)</p>
          <p><strong>Uso:</strong> Clique no ícone de cópia para copiar a variável para a área de transferência</p>
        </div>
      </div>
    </div>
  );
};

export default VariaveisTemplateExtendido;