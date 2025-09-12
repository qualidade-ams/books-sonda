import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Save, Loader2, Database, Trash2, Plus } from 'lucide-react';
import { FormularioData, useEmailVariableMapping } from '@/hooks/useEmailVariableMapping';
import { useTestData } from '@/hooks/useTestData';

interface TesteVariaveisEmailProps {
  template: {
    assunto: string;
    corpo: string;
  };
  templateId?: string;
  dadosIniciais?: FormularioData | null;
  onDadosChange?: (dados: FormularioData) => void;
}

const TesteVariaveisEmail: React.FC<TesteVariaveisEmailProps> = ({ template, templateId, dadosIniciais, onDadosChange }) => {
  // Hook para gerenciar dados de teste
  const {
    testDataSets,
    currentTestData,
    loading: loadingTestData,
    saving: savingTestData,
    loadTestDataById,
    saveTestData,
    updateCurrentData,
    deleteTestData,
    resetToDefault
  } = useTestData();

  // Estados locais
  const [dadosFormulario, setDadosFormulario] = useState<FormularioData>(currentTestData);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [nomeConjunto, setNomeConjunto] = useState('');
  const [conjuntoSelecionado, setConjuntoSelecionado] = useState<string>('');

  // Sincronizar com dados do hook quando mudarem
  useEffect(() => {
    setDadosFormulario(currentTestData);
  }, [currentTestData]);

  // Atualizar dados locais quando os dados iniciais mudarem
  useEffect(() => {
    if (dadosIniciais) {
      setDadosFormulario(dadosIniciais);
      updateCurrentData(dadosIniciais);
    }
  }, [dadosIniciais, updateCurrentData]);

  const { validarTemplate } = useEmailVariableMapping({
    dadosFormulario
  });

  const handleEscopoChange = (value: string) => {
    const escopos = value.split(',').map(e => e.trim()).filter(e => e);
    updateDados({ escopo: escopos });
  };

  // Ref para controlar o debounce
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Função com debounce para salvar dados (5 segundos)
  const debouncedSave = useCallback((dados: FormularioData) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => {
      if (onDadosChange) {
        console.log('💾 Salvando dados com debounce (5s):', dados);
        onDadosChange(dados);
      }
    }, 5000); // Salva após 5 segundos de inatividade
  }, [onDadosChange]);

  // Função para salvar imediatamente (onBlur/Tab)
  const saveImmediately = useCallback((dados: FormularioData) => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }

    if (onDadosChange) {
      console.log('💾 Salvando dados imediatamente (onBlur):', dados);
      onDadosChange(dados);
    }
  }, [onDadosChange]);

  // Função para atualizar os dados e salvar
  const updateDados = useCallback((novosDados: Partial<FormularioData>, salvarAgora = false) => {
    // Atualiza o estado local
    setDadosFormulario(prevState => {
      const dadosAtualizados = { ...prevState, ...novosDados };

      // Atualizar também no hook de dados de teste
      updateCurrentData(dadosAtualizados);

      // Se for para salvar agora ou se for um evento de blur
      if (salvarAgora && onDadosChange) {
        console.log('💾 Salvando dados imediatamente:', dadosAtualizados);
        onDadosChange(dadosAtualizados);
      } else if (onDadosChange) {
        // Se não for para salvar agora, usa o debounce
        if (debounceRef.current) {
          clearTimeout(debounceRef.current);
        }

        debounceRef.current = setTimeout(() => {
          console.log('⏱️  Salvando com debounce:', dadosAtualizados);
          onDadosChange(dadosAtualizados);
        }, 5000);
      }

      return dadosAtualizados;
    });
  }, [onDadosChange, updateCurrentData]);

  // Função para lidar com mudanças nos campos
  const handleChange = useCallback((campo: keyof FormularioData, valor: string | number) => {
    updateDados({ [campo]: valor });
  }, [updateDados]);

  // Função para lidar com o evento de blur
  const handleBlur = useCallback((campo: keyof FormularioData, valor: string | number) => {
    console.log(`🔵 onBlur no campo ${campo}:`, valor);
    updateDados({ [campo]: valor }, true);
  }, [updateDados]);

  // Funções para gerenciar conjuntos de dados de teste
  const handleSalvarConjunto = async () => {
    if (!nomeConjunto.trim()) return;
    
    await saveTestData(nomeConjunto, dadosFormulario);
    setNomeConjunto('');
    setSaveDialogOpen(false);
  };

  const handleCarregarConjunto = async (id: string) => {
    await loadTestDataById(id);
    setConjuntoSelecionado(id);
  };

  const handleExcluirConjunto = async (id: string) => {
    await deleteTestData(id);
    if (conjuntoSelecionado === id) {
      setConjuntoSelecionado('');
    }
  };

  const handleResetarDados = () => {
    resetToDefault();
    setConjuntoSelecionado('');
  };

  const validacao: { valido: boolean; variaveisNaoEncontradas: string[] } = template ? validarTemplate(template.assunto + '\n\n' + template.corpo) : { valido: true, variaveisNaoEncontradas: [] };

  // Cleanup do debounce quando o componente for desmontado
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  return (
    <div className="space-y-6">
      {/* Gerenciamento de Conjuntos de Dados de Teste */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Conjuntos de Dados de Teste
          </CardTitle>
          <p className="text-sm text-gray-500">
            Salve e reutilize conjuntos de dados para testar diferentes cenários
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="flex items-center gap-2">
                  <Save className="h-4 w-4" />
                  Salvar Conjunto Atual
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Salvar Conjunto de Dados</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="nomeConjunto">Nome do Conjunto</Label>
                    <Input
                      id="nomeConjunto"
                      value={nomeConjunto}
                      onChange={(e) => setNomeConjunto(e.target.value)}
                      placeholder="Ex: Empresa Teste 1, Cenário Completo..."
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
                      Cancelar
                    </Button>
                    <Button 
                      onClick={handleSalvarConjunto}
                      disabled={!nomeConjunto.trim() || savingTestData}
                    >
                      {savingTestData ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin mr-2" />
                          Salvando...
                        </>
                      ) : (
                        'Salvar'
                      )}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <Button 
              variant="outline" 
              size="sm" 
              onClick={handleResetarDados}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Novo Conjunto
            </Button>
          </div>

          {loadingTestData ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin" />
              <span className="ml-2">Carregando conjuntos...</span>
            </div>
          ) : testDataSets.length > 0 ? (
            <div className="space-y-2">
              <Label>Conjuntos Salvos</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                {testDataSets.map((conjunto) => (
                  <div
                    key={conjunto.id}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      conjuntoSelecionado === conjunto.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div 
                        className="flex-1 min-w-0"
                        onClick={() => handleCarregarConjunto(conjunto.id)}
                      >
                        <p className="font-medium truncate">{conjunto.nome}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(conjunto.created_at).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleExcluirConjunto(conjunto.id);
                        }}
                        className="ml-2 h-8 w-8 p-0 text-red-500 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    {conjuntoSelecionado === conjunto.id && (
                      <Badge variant="secondary" className="mt-2 text-xs">
                        Selecionado
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-4 text-gray-500">
              <Database className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>Nenhum conjunto salvo ainda</p>
              <p className="text-sm">Preencha os dados e clique em "Salvar Conjunto Atual"</p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Teste de Variáveis - Dados do Formulário</CardTitle>
          <p className="text-sm text-gray-500">
            Os dados são salvos automaticamente após 5 segundos de inatividade ou ao sair do campo (Tab/clique fora)
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="razaoSocial">Razão Social</Label>
              <Input
                id="razaoSocial"
                value={dadosFormulario.razaoSocial || ''}
                onChange={(e) => handleChange('razaoSocial', e.target.value)}
                onBlur={(e) => handleBlur('razaoSocial', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cnpj">CNPJ</Label>
              <Input
                id="cnpj"
                value={dadosFormulario.cnpj || ''}
                onChange={(e) => handleChange('cnpj', e.target.value)}
                onBlur={(e) => handleBlur('cnpj', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="responsavel">Responsável</Label>
              <Input
                id="responsavel"
                value={dadosFormulario.responsavel || ''}
                onChange={(e) => handleChange('responsavel', e.target.value)}
                onBlur={(e) => handleBlur('responsavel', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                value={dadosFormulario.email || ''}
                onChange={(e) => handleChange('email', e.target.value)}
                onBlur={(e) => handleBlur('email', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="localizacao">Localização</Label>
              <Input
                id="localizacao"
                value={dadosFormulario.localizacao || ''}
                onChange={(e) => handleChange('localizacao', e.target.value)}
                onBlur={(e) => handleBlur('localizacao', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="segmento">Segmento</Label>
              <Select
                value={dadosFormulario.segmento || ''}
                onValueChange={(value) => handleChange('segmento', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o segmento" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="industria">Indústria, Varejo ou Outros</SelectItem>
                  <SelectItem value="utilities">Utilities (Serviços Públicos)</SelectItem>
                  <SelectItem value="servico">Serviço</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="escopo">Escopo (separado por vírgulas)</Label>
              <Input
                id="escopo"
                value={dadosFormulario.escopo?.join(', ') || ''}
                onChange={(e) => handleEscopoChange(e.target.value)}
                onBlur={(e) => handleEscopoChange(e.target.value)}
                placeholder="Ex: NFe, NFCe, CTe"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="modalidade">Modalidade</Label>
              <Select
                value={dadosFormulario.modalidade || ''}
                onValueChange={(value) => handleChange('modalidade', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a modalidade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mensal">Mensal</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="qtdEmpresas">Quantidade de Empresas</Label>
              <Input
                id="qtdEmpresas"
                type="number"
                value={dadosFormulario.qtdEmpresas || ''}
                onChange={(e) => handleChange('qtdEmpresas', parseInt(e.target.value) || 0)}
                onBlur={(e) => handleBlur('qtdEmpresas', parseInt(e.target.value) || 0)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="qtdUfs">Quantidade de UFs</Label>
              <Input
                id="qtdUfs"
                type="number"
                value={dadosFormulario.qtdUfs || ''}
                onChange={(e) => handleChange('qtdUfs', parseInt(e.target.value) || 0)}
                onBlur={(e) => handleBlur('qtdUfs', parseInt(e.target.value) || 0)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="volumetria">Volumetria</Label>
              <Input
                id="volumetria"
                value={dadosFormulario.volumetria || ''}
                onChange={(e) => handleChange('volumetria', e.target.value)}
                onBlur={(e) => handleBlur('volumetria', e.target.value)}
                placeholder="Ex: 1000 documentos/mês"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tempoContrato">Tempo de Contrato (meses)</Label>
              <Input
                id="tempoContrato"
                type="number"
                value={dadosFormulario.tempoContrato || ''}
                onChange={(e) => handleChange('tempoContrato', parseInt(e.target.value) || 0)}
                onBlur={(e) => handleBlur('tempoContrato', parseInt(e.target.value) || 0)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="valorLicencaUso">Valor Licença de Uso (R$)</Label>
              <Input
                id="valorLicencaUso"
                type="number"
                step="0.01"
                value={dadosFormulario.valorLicencaUso || ''}
                onChange={(e) => handleChange('valorLicencaUso', parseFloat(e.target.value) || 0)}
                onBlur={(e) => handleBlur('valorLicencaUso', parseFloat(e.target.value) || 0)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="valorManutencao">Valor Manutenção (R$)</Label>
              <Input
                id="valorManutencao"
                type="number"
                step="0.01"
                value={dadosFormulario.valorManutencao || ''}
                onChange={(e) => handleChange('valorManutencao', parseFloat(e.target.value) || 0)}
                onBlur={(e) => handleBlur('valorManutencao', parseFloat(e.target.value) || 0)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="valorSuporte">Valor Suporte (R$)</Label>
              <Input
                id="valorSuporte"
                type="number"
                step="0.01"
                value={dadosFormulario.valorSuporte || ''}
                onChange={(e) => handleChange('valorSuporte', parseFloat(e.target.value) || 0)}
                onBlur={(e) => handleBlur('valorSuporte', parseFloat(e.target.value) || 0)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="horasAtendimento">Horas de Atendimento</Label>
              <Input
                id="horasAtendimento"
                type="number"
                value={dadosFormulario.horasAtendimento || ''}
                onChange={(e) => handleChange('horasAtendimento', parseInt(e.target.value) || 0)}
                onBlur={(e) => handleBlur('horasAtendimento', parseInt(e.target.value) || 0)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="mensagemBuscaAtiva">Mensagem Busca Ativa</Label>
              <Input
                id="mensagemBuscaAtiva"
                value={dadosFormulario.mensagemBuscaAtiva || ''}
                onChange={(e) => handleChange('mensagemBuscaAtiva', e.target.value)}
                onBlur={(e) => handleBlur('mensagemBuscaAtiva', e.target.value)}
                placeholder="Mensagem personalizada para busca ativa"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Validação */}
      {!validacao.valido && (
        <Card>
          <CardHeader>
            <CardTitle className="text-red-600">Variáveis Não Encontradas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-red-600">
              As seguintes variáveis estão sendo usadas no template mas não foram encontradas:
              <ul className="list-disc list-inside mt-2">
                {validacao.variaveisNaoEncontradas.map(variavel => (
                  <li key={variavel}><code>{`{{${variavel}}}`}</code></li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>
      )}


    </div>
  );
};

export default TesteVariaveisEmail;