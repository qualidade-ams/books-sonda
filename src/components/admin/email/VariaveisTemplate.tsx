import { useState } from 'react';
import { ChevronDown, ChevronRight, Copy } from 'lucide-react';
import { obterVariaveisDisponiveis } from '@/utils/emailVariableMapping';

const TemplateVariables = () => {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set(['Dados da Empresa']));
  const variaveisDisponiveis = obterVariaveisDisponiveis();

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

  return (
    <div className="bg-blue-50 p-4 rounded-lg space-y-4">
      <h4 className="font-semibold text-blue-900">Variáveis Disponíveis para Templates</h4>

      <div className="space-y-3">
        {Object.entries(variaveisDisponiveis).map(([categoria, variaveis]) => (
          <div key={categoria} className="bg-white rounded-lg border border-blue-200">
            <div
              onClick={(e) => toggleCategory(categoria, e)}
              className="w-full flex items-center justify-between p-3 text-left hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  toggleCategory(categoria, e);
                }
              }}
            >
              <span className="font-medium text-blue-800">{categoria}</span>
              {expandedCategories.has(categoria) ? (
                <ChevronDown className="h-4 w-4 text-blue-600" />
              ) : (
                <ChevronRight className="h-4 w-4 text-blue-600" />
              )}
            </div>

            {expandedCategories.has(categoria) && (
              <div className="px-3 pb-3">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {variaveis.map((variavel) => (
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
        ))}
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
        <h5 className="font-medium text-amber-800 mb-2">📋 Descrição das Variáveis</h5>
        <div className="text-sm text-amber-700 space-y-1">
          <p><strong>Valores Mensais:</strong> Calculados automaticamente dividindo valores totais pelo tempo de contrato</p>
          <p><strong>Escopo:</strong> Múltiplos escopos são separados por vírgula + quebra de linha</p>
          <p><strong>Valores Monetários:</strong> Formatados automaticamente em Real (R$)</p>
        </div>
      </div>
    </div>
  );
};

export default TemplateVariables;