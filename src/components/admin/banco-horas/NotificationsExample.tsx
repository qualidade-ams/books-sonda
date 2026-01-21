/**
 * Exemplos de Uso do Sistema de Notificações do Banco de Horas
 * 
 * Este arquivo demonstra como utilizar as notificações e alertas
 * do sistema de Banco de Horas em diferentes cenários.
 * 
 * Requisitos: 18.1-18.10
 */

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useBancoHorasNotifications } from '@/hooks/useBancoHorasNotifications';
import {
  SaldoNegativoAlert,
  TaxaAusenteAlert,
  FimPeriodoAlert,
  ExcedenteGeradoAlert,
  CalculoSucessoAlert,
  CalculoErroAlert,
  InfoAlert,
  WarningAlert
} from './BancoHorasAlerts';

/**
 * Componente de exemplo para demonstrar o uso das notificações
 * 
 * Este componente NÃO deve ser usado em produção.
 * É apenas para referência e testes.
 */
export const NotificationsExample: React.FC = () => {
  const notifications = useBancoHorasNotifications();
  const [showAlerts, setShowAlerts] = useState(false);

  // Dados de exemplo
  const empresaNome = 'SOUZA CRUZ';
  const mesAno = '01/2026';

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader>
          <CardTitle>Sistema de Notificações - Banco de Horas</CardTitle>
          <CardDescription>
            Exemplos de uso das notificações toast e alertas inline
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Seção: Notificações Toast */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Notificações Toast (Dismissíveis)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Requirement 18.1 */}
              <Button
                variant="outline"
                onClick={() =>
                  notifications.saldoNegativo(empresaNome, '-10:30', mesAno, {
                    action: {
                      label: 'Ver Detalhes',
                      onClick: () => console.log('Ver detalhes do saldo negativo')
                    }
                  })
                }
              >
                Saldo Negativo
              </Button>

              {/* Requirement 18.2 */}
              <Button
                variant="outline"
                onClick={() =>
                  notifications.excedenteGerado(empresaNome, '10:30', 2500.0, mesAno, {
                    action: {
                      label: 'Gerar Faturamento',
                      onClick: () => console.log('Gerar faturamento')
                    }
                  })
                }
              >
                Excedente Gerado
              </Button>

              {/* Requirement 18.3 */}
              <Button
                variant="outline"
                onClick={() =>
                  notifications.taxaAusente(empresaNome, mesAno, {
                    action: {
                      label: 'Cadastrar Taxa',
                      onClick: () => console.log('Cadastrar taxa')
                    }
                  })
                }
              >
                Taxa Ausente
              </Button>

              {/* Requirement 18.4 */}
              <Button
                variant="outline"
                onClick={() =>
                  notifications.fimPeriodoProximo(empresaNome, mesAno, 3, true, {
                    action: {
                      label: 'Ver Configuração',
                      onClick: () => console.log('Ver configuração')
                    }
                  })
                }
              >
                Fim de Período
              </Button>

              {/* Requirement 18.5 */}
              <Button
                variant="outline"
                onClick={() =>
                  notifications.reajusteCriado(
                    empresaNome,
                    '5:00',
                    'positivo',
                    mesAno,
                    'Ajuste devido a horas extras não contabilizadas anteriormente'
                  )
                }
              >
                Reajuste Criado (Positivo)
              </Button>

              <Button
                variant="outline"
                onClick={() =>
                  notifications.reajusteCriado(
                    empresaNome,
                    '-3:30',
                    'negativo',
                    mesAno,
                    'Correção de lançamento duplicado'
                  )
                }
              >
                Reajuste Criado (Negativo)
              </Button>

              {/* Requirement 18.6 */}
              <Button
                variant="outline"
                onClick={() => notifications.calculoSucesso(empresaNome, mesAno, '15:30')}
              >
                Cálculo Sucesso
              </Button>

              {/* Requirement 18.7 */}
              <Button
                variant="outline"
                onClick={() =>
                  notifications.calculoErro(
                    empresaNome,
                    mesAno,
                    'Dados de apontamentos Aranda indisponíveis'
                  )
                }
              >
                Cálculo Erro
              </Button>

              {/* Notificações genéricas */}
              <Button
                variant="outline"
                onClick={() =>
                  notifications.info('Informação', 'Esta é uma notificação informativa')
                }
              >
                Info Genérico
              </Button>

              <Button
                variant="outline"
                onClick={() =>
                  notifications.warning('Atenção', 'Esta é uma notificação de aviso')
                }
              >
                Warning Genérico
              </Button>

              <Button
                variant="outline"
                onClick={() =>
                  notifications.success('Sucesso', 'Operação realizada com sucesso')
                }
              >
                Success Genérico
              </Button>

              <Button
                variant="outline"
                onClick={() =>
                  notifications.error('Erro', 'Ocorreu um erro ao processar a solicitação')
                }
              >
                Error Genérico
              </Button>
            </div>
          </div>

          <Separator />

          {/* Seção: Alertas Inline */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Alertas Inline (Persistentes)</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAlerts(!showAlerts)}
              >
                {showAlerts ? 'Ocultar' : 'Mostrar'} Alertas
              </Button>
            </div>

            {showAlerts && (
              <div className="space-y-4">
                {/* Requirement 18.1 */}
                <SaldoNegativoAlert
                  empresaNome={empresaNome}
                  saldoNegativo="-10:30"
                  mesAno={mesAno}
                  onVerDetalhes={() => console.log('Ver detalhes')}
                />

                {/* Requirement 18.3 */}
                <TaxaAusenteAlert
                  empresaNome={empresaNome}
                  mesAno={mesAno}
                  onCadastrarTaxa={() => console.log('Cadastrar taxa')}
                />

                {/* Requirement 18.4 */}
                <FimPeriodoAlert
                  empresaNome={empresaNome}
                  mesAno={mesAno}
                  periodoApuracao={3}
                  possuiRepasseEspecial={true}
                  saldoAtual="15:30"
                  onVerConfiguracao={() => console.log('Ver configuração')}
                />

                {/* Requirement 18.2 */}
                <ExcedenteGeradoAlert
                  empresaNome={empresaNome}
                  excedenteHoras="10:30"
                  valorExcedente={2500.0}
                  mesAno={mesAno}
                  descricaoFaturamento="Excedente de 10:30 horas no período 01/2026 - Valor: R$ 2.500,00"
                  onCopiarDescricao={() => {
                    navigator.clipboard.writeText(
                      'Excedente de 10:30 horas no período 01/2026 - Valor: R$ 2.500,00'
                    );
                    notifications.success('Copiado', 'Descrição copiada para a área de transferência');
                  }}
                />

                {/* Requirement 18.6 */}
                <CalculoSucessoAlert
                  empresaNome={empresaNome}
                  mesAno={mesAno}
                  saldo="15:30"
                  onVerDetalhes={() => console.log('Ver detalhes')}
                />

                {/* Requirement 18.7 */}
                <CalculoErroAlert
                  empresaNome={empresaNome}
                  mesAno={mesAno}
                  erro="Dados de apontamentos Aranda indisponíveis"
                  onTentarNovamente={() => console.log('Tentar novamente')}
                />

                {/* Alertas genéricos */}
                <InfoAlert
                  titulo="Informação Importante"
                  mensagem="Esta é uma mensagem informativa que permanece visível na interface."
                  onAcao={{
                    label: 'Saiba Mais',
                    onClick: () => console.log('Saiba mais')
                  }}
                />

                <WarningAlert
                  titulo="Atenção Necessária"
                  mensagem="Esta é uma mensagem de aviso que requer atenção do usuário."
                  onAcao={{
                    label: 'Resolver Agora',
                    onClick: () => console.log('Resolver')
                  }}
                />
              </div>
            )}
          </div>

          <Separator />

          {/* Seção: Documentação */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Como Usar</h3>
            <div className="space-y-4 text-sm">
              <div>
                <h4 className="font-medium mb-2">1. Importar o hook:</h4>
                <pre className="bg-gray-100 p-3 rounded-md overflow-x-auto">
                  <code>{`import { useBancoHorasNotifications } from '@/hooks/useBancoHorasNotifications';`}</code>
                </pre>
              </div>

              <div>
                <h4 className="font-medium mb-2">2. Usar no componente:</h4>
                <pre className="bg-gray-100 p-3 rounded-md overflow-x-auto">
                  <code>{`const notifications = useBancoHorasNotifications();

// Notificar saldo negativo
notifications.saldoNegativo('SOUZA CRUZ', '-10:30', '01/2026');

// Notificar excedente gerado
notifications.excedenteGerado('SOUZA CRUZ', '10:30', 2500.00, '01/2026');`}</code>
                </pre>
              </div>

              <div>
                <h4 className="font-medium mb-2">3. Usar alertas inline:</h4>
                <pre className="bg-gray-100 p-3 rounded-md overflow-x-auto">
                  <code>{`import { SaldoNegativoAlert } from '@/components/admin/banco-horas/BancoHorasAlerts';

<SaldoNegativoAlert
  empresaNome="SOUZA CRUZ"
  saldoNegativo="-10:30"
  mesAno="01/2026"
  onVerDetalhes={() => navigate('/detalhes')}
/>`}</code>
                </pre>
              </div>

              <div>
                <h4 className="font-medium mb-2">4. Adicionar ações customizadas:</h4>
                <pre className="bg-gray-100 p-3 rounded-md overflow-x-auto">
                  <code>{`notifications.taxaAusente('SOUZA CRUZ', '01/2026', {
  action: {
    label: 'Cadastrar Taxa',
    onClick: () => navigate('/taxas/nova')
  }
});`}</code>
                </pre>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
