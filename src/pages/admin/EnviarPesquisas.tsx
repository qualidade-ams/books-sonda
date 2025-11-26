/**
 * Página para envio de pesquisas por email
 */

import { useState } from 'react';
import { Send, Mail } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

import LayoutAdmin from '@/components/admin/LayoutAdmin';
import { PesquisasTable } from '@/components/admin/pesquisas-satisfacao';
import { usePesquisasSatisfacao, useMarcarComoEnviados, useEstatisticasPesquisas } from '@/hooks/usePesquisasSatisfacao';

import type { Pesquisa, FiltrosPesquisas } from '@/types/pesquisasSatisfacao';

function EnviarPesquisas() {
  const [selecionados, setSelecionados] = useState<string[]>([]);

  // Filtrar apenas pendentes
  const filtros: FiltrosPesquisas = { status: 'pendente' };

  // Queries
  const { data: pesquisas = [], isLoading } = usePesquisasSatisfacao(filtros);
  const { data: estatisticas } = useEstatisticasPesquisas(filtros);

  // Mutations
  const marcarComoEnviados = useMarcarComoEnviados();

  const handleSelecionarTodos = (selecionado: boolean) => {
    if (selecionado) {
      setSelecionados(pesquisas.map(e => e.id));
    } else {
      setSelecionados([]);
    }
  };

  const handleSelecionarItem = (id: string) => {
    setSelecionados(prev =>
      prev.includes(id)
        ? prev.filter(s => s !== id)
        : [...prev, id]
    );
  };

  const handleEnviarSelecionados = async () => {
    if (selecionados.length === 0) return;

    // TODO: Implementar envio de email via Power Automate
    // Por enquanto, apenas marca como enviado
    await marcarComoEnviados.mutateAsync(selecionados);
    setSelecionados([]);
  };

  return (
    <LayoutAdmin>
      <div className="space-y-6">
        {/* Cabeçalho */}
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Enviar Pesquisas
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Envie pesquisas pendentes por email
            </p>
          </div>
          <Button
            onClick={handleEnviarSelecionados}
            disabled={selecionados.length === 0 || marcarComoEnviados.isPending}
          >
            <Send className="h-4 w-4 mr-2" />
            Enviar Selecionados ({selecionados.length})
          </Button>
        </div>

        {/* Cards de Estatísticas */}
        {estatisticas && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Pendentes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{estatisticas.pendentes}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Selecionados
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {selecionados.length}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Já Enviados
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {estatisticas.enviados}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Tabela */}
        <Card>
          <CardHeader>
            <CardTitle>
              Pesquisas Pendentes ({pesquisas.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pesquisas.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Mail className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Nenhum pesquisa pendente para envio</p>
              </div>
            ) : (
              <PesquisasTable
                pesquisas={pesquisas}
                selecionados={selecionados}
                onSelecionarTodos={handleSelecionarTodos}
                onSelecionarItem={handleSelecionarItem}
                onEditar={() => {}}
                onExcluir={() => {}}
                isLoading={isLoading}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </LayoutAdmin>
  );
}

export default EnviarPesquisas;
