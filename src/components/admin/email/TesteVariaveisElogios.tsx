import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Award, Eye } from 'lucide-react';

interface TesteVariaveisElogiosProps {
  template: {
    assunto: string;
    corpo: string;
  };
}

const TesteVariaveisElogios = ({ template }: TesteVariaveisElogiosProps) => {
  const [dados, setDados] = useState({
    mesNomeAno: 'FEVEREIRO 2026',
    primeiro: 'CLEONAN SANTOS DA VISITACAO',
    qtd1: '7',
    segundo: 'MARIA CELIA MORAIS FERNANDES',
    qtd2: '5',
    terceiro: 'ALMIR DE SOUZA BATISTA',
    qtd3: '5',
  });

  const handleChange = (campo: string, valor: string) => {
    setDados(prev => ({ ...prev, [campo]: valor }));
  };

  // Substituir variáveis no template para preview
  const preview = useMemo(() => {
    let assunto = template.assunto || '';
    let corpo = template.corpo || '';

    const mapa: Record<string, string> = {
      'elogio.mesNomeAno': dados.mesNomeAno,
      'elogio.primeiro': dados.primeiro,
      'elogio.qtd1': dados.qtd1,
      'elogio.segundo': dados.segundo,
      'elogio.qtd2': dados.qtd2,
      'elogio.terceiro': dados.terceiro,
      'elogio.qtd3': dados.qtd3,
    };

    Object.entries(mapa).forEach(([key, value]) => {
      const regex = new RegExp(`\\{\\{${key.replace('.', '\\.')}\\}\\}`, 'g');
      assunto = assunto.replace(regex, value);
      corpo = corpo.replace(regex, value);
    });

    return { assunto, corpo };
  }, [template, dados]);

  // Verificar quais variáveis de elogios estão presentes no template
  const variaveisUsadas = useMemo(() => {
    const texto = (template.assunto || '') + (template.corpo || '');
    const todas = [
      'elogio.mesNomeAno', 'elogio.primeiro', 'elogio.qtd1',
      'elogio.segundo', 'elogio.qtd2', 'elogio.terceiro', 'elogio.qtd3'
    ];
    return todas.filter(v => texto.includes(`{{${v}}}`));
  }, [template]);

  if (variaveisUsadas.length === 0) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-gray-500">
            <Award className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p className="font-medium">Nenhuma variável de elogios encontrada</p>
            <p className="text-sm mt-1">
              Use variáveis como <code className="text-green-700 bg-gray-100 px-1 rounded">{'{{elogio.primeiro}}'}</code> no template para testar aqui.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Campos de teste */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Award className="h-5 w-5 text-orange-600" />
            Dados de Teste - Ranking de Elogios
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="mesNomeAno" className="text-sm font-medium text-gray-700">
                Mês/Ano <Badge variant="outline" className="ml-1 text-xs font-mono">{'{{elogio.mesNomeAno}}'}</Badge>
              </Label>
              <Input
                id="mesNomeAno"
                value={dados.mesNomeAno}
                onChange={(e) => handleChange('mesNomeAno', e.target.value)}
                placeholder="FEVEREIRO 2026"
              />
            </div>
          </div>

          {/* 1º Lugar */}
          <div className="border-t pt-4">
            <p className="text-sm font-semibold text-yellow-600 mb-3">🥇 1º Lugar</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="primeiro" className="text-sm font-medium text-gray-700">
                  Nome <Badge variant="outline" className="ml-1 text-xs font-mono">{'{{elogio.primeiro}}'}</Badge>
                </Label>
                <Input
                  id="primeiro"
                  value={dados.primeiro}
                  onChange={(e) => handleChange('primeiro', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="qtd1" className="text-sm font-medium text-gray-700">
                  Quantidade <Badge variant="outline" className="ml-1 text-xs font-mono">{'{{elogio.qtd1}}'}</Badge>
                </Label>
                <Input
                  id="qtd1"
                  type="number"
                  value={dados.qtd1}
                  onChange={(e) => handleChange('qtd1', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* 2º Lugar */}
          <div className="border-t pt-4">
            <p className="text-sm font-semibold text-gray-500 mb-3">🥈 2º Lugar</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="segundo" className="text-sm font-medium text-gray-700">
                  Nome <Badge variant="outline" className="ml-1 text-xs font-mono">{'{{elogio.segundo}}'}</Badge>
                </Label>
                <Input
                  id="segundo"
                  value={dados.segundo}
                  onChange={(e) => handleChange('segundo', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="qtd2" className="text-sm font-medium text-gray-700">
                  Quantidade <Badge variant="outline" className="ml-1 text-xs font-mono">{'{{elogio.qtd2}}'}</Badge>
                </Label>
                <Input
                  id="qtd2"
                  type="number"
                  value={dados.qtd2}
                  onChange={(e) => handleChange('qtd2', e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* 3º Lugar */}
          <div className="border-t pt-4">
            <p className="text-sm font-semibold text-orange-700 mb-3">🥉 3º Lugar</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="terceiro" className="text-sm font-medium text-gray-700">
                  Nome <Badge variant="outline" className="ml-1 text-xs font-mono">{'{{elogio.terceiro}}'}</Badge>
                </Label>
                <Input
                  id="terceiro"
                  value={dados.terceiro}
                  onChange={(e) => handleChange('terceiro', e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="qtd3" className="text-sm font-medium text-gray-700">
                  Quantidade <Badge variant="outline" className="ml-1 text-xs font-mono">{'{{elogio.qtd3}}'}</Badge>
                </Label>
                <Input
                  id="qtd3"
                  type="number"
                  value={dados.qtd3}
                  onChange={(e) => handleChange('qtd3', e.target.value)}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Preview */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Preview com Dados de Teste
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="bg-gray-50 p-3 rounded-lg">
            <Label className="text-sm font-medium text-gray-600">Assunto:</Label>
            <p className="font-semibold mt-1">{preview.assunto}</p>
          </div>
          <div className="border rounded-lg bg-white overflow-hidden">
            <Label className="text-sm font-medium text-gray-600 block px-4 pt-3">Corpo (variáveis de elogios substituídas):</Label>
            <iframe
              srcDoc={`<!DOCTYPE html><html><head><meta charset="utf-8"/><style>body{margin:0;padding:8px;font-family:Arial,sans-serif;font-size:14px;color:#333;}</style></head><body>${preview.corpo}</body></html>`}
              title="Preview Elogios"
              className="w-full border-0"
              style={{ height: '300px', minHeight: '200px' }}
              sandbox="allow-same-origin"
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TesteVariaveisElogios;
