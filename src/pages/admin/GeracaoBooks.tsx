/**
 * Página de Geração de Books
 * Gerencia a geração e envio de relatórios de books para clientes
 */

import { useState } from 'react';
import { FileText, Download, Send, Calendar } from 'lucide-react';
import AdminLayout from '@/components/admin/LayoutAdmin';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function GeracaoBooks() {
  return (
    <AdminLayout>
      <div className="min-h-screen bg-bg-secondary">
        <div className="px-6 py-6 space-y-8">
          {/* Cabeçalho */}
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white">
                Geração de Books
              </h1>
              <p className="text-muted-foreground mt-1">
                Gere e envie relatórios de books para os clientes
              </p>
            </div>
            <div className="flex space-x-2">
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Exportar
              </Button>
              <Button size="sm" className="bg-sonda-blue hover:bg-sonda-dark-blue">
                <Send className="h-4 w-4 mr-2" />
                Gerar Book
              </Button>
            </div>
          </div>

          {/* Cards de Estatísticas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs lg:text-sm font-medium text-gray-600 dark:text-gray-400">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Total
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-xl lg:text-2xl font-bold text-gray-900 dark:text-white">24</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs lg:text-sm font-medium text-sonda-blue">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Total Horas
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-xl lg:text-2xl font-bold text-sonda-blue">455h20min</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs lg:text-sm font-medium text-green-600">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Valor Total
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-xl lg:text-2xl font-bold text-green-600">R$ 26.554,92</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs lg:text-sm font-medium text-orange-600">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Valores Selecionados
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="text-xl lg:text-2xl font-bold text-orange-600">R$ 0,00</div>
              </CardContent>
            </Card>
          </div>

          {/* Card Principal */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Geração de Books
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 mb-4">
                    Os componentes desta tela serão adicionados em breve
                  </p>
                  <Button className="bg-sonda-blue hover:bg-sonda-dark-blue">
                    <Send className="h-4 w-4 mr-2" />
                    Gerar Book
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </AdminLayout>
  );
}
