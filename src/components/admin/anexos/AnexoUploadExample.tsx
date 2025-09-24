import React, { useState } from 'react';
import { AnexoUpload, AnexoData } from './AnexoUpload';
import { Card, CardContent, CardHeader, CardTitle } from '../../ui/card';
import { Button } from '../../ui/button';
import { Badge } from '../../ui/badge';

/**
 * Exemplo de uso do componente AnexoUpload
 * Este componente demonstra como integrar o AnexoUpload em uma tela real
 */
export function AnexoUploadExample() {
  const [anexos, setAnexos] = useState<AnexoData[]>([]);
  const [empresaSelecionada] = useState('empresa-exemplo-123');

  const handleAnexosChange = (novosAnexos: AnexoData[]) => {
    setAnexos(novosAnexos);
    console.log('Anexos atualizados:', novosAnexos);
  };

  const handleEnviarDisparo = () => {
    if (anexos.length === 0) {
      alert('Nenhum anexo selecionado');
      return;
    }

    console.log('Enviando disparo com anexos:', anexos);
    alert(`Disparo enviado com ${anexos.length} anexo(s)`);
  };

  const limparAnexos = () => {
    setAnexos([]);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Exemplo de Uso - Sistema de Anexos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium">Empresa: Exemplo Ltda</h3>
                <p className="text-sm text-muted-foreground">ID: {empresaSelecionada}</p>
              </div>
              <Badge variant="secondary">
                Anexo Habilitado
              </Badge>
            </div>

            {/* Componente de Upload de Anexos */}
            <AnexoUpload
              empresaId={empresaSelecionada}
              onAnexosChange={handleAnexosChange}
              className="w-full"
            />

            {/* Ações */}
            <div className="flex justify-between items-center pt-4">
              <Button
                variant="outline"
                onClick={limparAnexos}
                disabled={anexos.length === 0}
              >
                Limpar Anexos
              </Button>

              <Button
                onClick={handleEnviarDisparo}
                disabled={anexos.length === 0}
              >
                Enviar Disparo ({anexos.length} anexo{anexos.length !== 1 ? 's' : ''})
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Debug Info */}
      {anexos.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Debug - Estado dos Anexos</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-xs bg-muted p-4 rounded overflow-auto">
              {JSON.stringify(anexos, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default AnexoUploadExample;