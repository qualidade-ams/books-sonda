/**
 * Componentes de Alerta para Banco de Horas
 * 
 * Alertas inline que aparecem na interface para situações que requerem
 * atenção contínua do usuário (não são dismissíveis como toasts).
 * 
 * Requisitos: 18.1-18.10
 */

import React from 'react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  AlertCircle, 
  AlertTriangle, 
  Info, 
  TrendingDown, 
  DollarSign,
  Calendar,
  CheckCircle
} from 'lucide-react';

interface SaldoNegativoAlertProps {
  empresaNome: string;
  saldoNegativo: string;
  mesAno: string;
  onVerDetalhes?: () => void;
}

/**
 * Requirement 18.1: Alerta inline para saldo negativo
 * 
 * Exibe alerta de aviso quando o saldo mensal está negativo.
 */
export const SaldoNegativoAlert: React.FC<SaldoNegativoAlertProps> = ({
  empresaNome,
  saldoNegativo,
  mesAno,
  onVerDetalhes
}) => {
  return (
    <Alert className="border-orange-200 bg-orange-50">
      <TrendingDown className="h-5 w-5 text-orange-600" />
      <AlertTitle className="text-orange-800 font-semibold">
        Saldo Negativo Detectado
      </AlertTitle>
      <AlertDescription className="text-orange-700">
        <p className="mb-2">
          <strong>{empresaNome}</strong> apresentou saldo negativo de{' '}
          <strong className="text-orange-900">{saldoNegativo}</strong> no período{' '}
          <strong>{mesAno}</strong>.
        </p>
        <p className="text-sm">
          O consumo excedeu o baseline disponível. Verifique se será necessário gerar excedente.
        </p>
        {onVerDetalhes && (
          <button
            onClick={onVerDetalhes}
            className="mt-3 text-sm font-medium text-orange-800 hover:text-orange-900 underline"
          >
            Ver detalhes do cálculo →
          </button>
        )}
      </AlertDescription>
    </Alert>
  );
};

interface TaxaAusenteAlertProps {
  empresaNome: string;
  mesAno: string;
  onCadastrarTaxa?: () => void;
}

/**
 * Requirement 18.3: Alerta inline para taxa ausente
 * 
 * Exibe alerta de erro quando não há taxa cadastrada para o período.
 */
export const TaxaAusenteAlert: React.FC<TaxaAusenteAlertProps> = ({
  empresaNome,
  mesAno,
  onCadastrarTaxa
}) => {
  return (
    <Alert className="border-red-200 bg-red-50">
      <AlertCircle className="h-5 w-5 text-red-600" />
      <AlertTitle className="text-red-800 font-semibold">
        Taxa Não Encontrada
      </AlertTitle>
      <AlertDescription className="text-red-700">
        <p className="mb-2">
          Não foi encontrada taxa cadastrada para <strong>{empresaNome}</strong> no período{' '}
          <strong>{mesAno}</strong>.
        </p>
        <p className="text-sm font-medium text-red-800">
          O excedente não pode ser calculado sem a taxa vigente.
        </p>
        {onCadastrarTaxa && (
          <button
            onClick={onCadastrarTaxa}
            className="mt-3 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 transition-colors"
          >
            Cadastrar Taxa
          </button>
        )}
      </AlertDescription>
    </Alert>
  );
};

interface FimPeriodoAlertProps {
  empresaNome: string;
  mesAno: string;
  periodoApuracao: number;
  possuiRepasseEspecial: boolean;
  saldoAtual: string;
  onVerConfiguracao?: () => void;
}

/**
 * Requirement 18.4: Alerta inline para fim de período
 * 
 * Exibe lembrete quando o período de apuração está terminando.
 */
export const FimPeriodoAlert: React.FC<FimPeriodoAlertProps> = ({
  empresaNome,
  mesAno,
  periodoApuracao,
  possuiRepasseEspecial,
  saldoAtual,
  onVerConfiguracao
}) => {
  const mensagemRepasse = possuiRepasseEspecial
    ? 'O saldo positivo será repassado para o próximo período conforme configuração de repasse especial.'
    : 'O saldo positivo será zerado ao final do período.';

  return (
    <Alert className="border-yellow-200 bg-yellow-50">
      <Calendar className="h-5 w-5 text-yellow-600" />
      <AlertTitle className="text-yellow-800 font-semibold">
        Fim de Período de Apuração
      </AlertTitle>
      <AlertDescription className="text-yellow-700">
        <p className="mb-2">
          O período de apuração de <strong>{periodoApuracao} {periodoApuracao === 1 ? 'mês' : 'meses'}</strong>{' '}
          para <strong>{empresaNome}</strong> está terminando em <strong>{mesAno}</strong>.
        </p>
        <p className="text-sm mb-2">
          Saldo atual: <strong className="text-yellow-900">{saldoAtual}</strong>
        </p>
        <p className="text-sm font-medium text-yellow-800">
          {mensagemRepasse}
        </p>
        {onVerConfiguracao && (
          <button
            onClick={onVerConfiguracao}
            className="mt-3 text-sm font-medium text-yellow-800 hover:text-yellow-900 underline"
          >
            Ver configuração de repasse →
          </button>
        )}
      </AlertDescription>
    </Alert>
  );
};

interface ExcedenteGeradoAlertProps {
  empresaNome: string;
  excedenteHoras: string;
  valorExcedente: number;
  mesAno: string;
  descricaoFaturamento?: string;
  onCopiarDescricao?: () => void;
}

/**
 * Requirement 18.2: Alerta inline para excedente gerado
 * 
 * Exibe informação quando um excedente é gerado.
 */
export const ExcedenteGeradoAlert: React.FC<ExcedenteGeradoAlertProps> = ({
  empresaNome,
  excedenteHoras,
  valorExcedente,
  mesAno,
  descricaoFaturamento,
  onCopiarDescricao
}) => {
  const valorFormatado = new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(valorExcedente);

  return (
    <Alert className="border-blue-200 bg-blue-50">
      <DollarSign className="h-5 w-5 text-blue-600" />
      <AlertTitle className="text-blue-800 font-semibold">
        Excedente Gerado
      </AlertTitle>
      <AlertDescription className="text-blue-700">
        <p className="mb-2">
          Excedente de <strong className="text-blue-900">{excedenteHoras}</strong> gerado para{' '}
          <strong>{empresaNome}</strong> no período <strong>{mesAno}</strong>.
        </p>
        <p className="text-sm mb-2">
          Valor a faturar: <strong className="text-blue-900">{valorFormatado}</strong>
        </p>
        {descricaoFaturamento && (
          <div className="mt-3 p-3 bg-white border border-blue-200 rounded-md">
            <p className="text-xs font-medium text-blue-800 mb-1">Descrição para faturamento:</p>
            <p className="text-sm text-gray-700">{descricaoFaturamento}</p>
            {onCopiarDescricao && (
              <button
                onClick={onCopiarDescricao}
                className="mt-2 text-xs font-medium text-blue-600 hover:text-blue-700 underline"
              >
                Copiar descrição
              </button>
            )}
          </div>
        )}
      </AlertDescription>
    </Alert>
  );
};

interface CalculoSucessoAlertProps {
  empresaNome: string;
  mesAno: string;
  saldo: string;
  onVerDetalhes?: () => void;
}

/**
 * Requirement 18.6: Alerta inline para cálculo bem-sucedido
 * 
 * Exibe confirmação quando o cálculo é realizado com sucesso.
 */
export const CalculoSucessoAlert: React.FC<CalculoSucessoAlertProps> = ({
  empresaNome,
  mesAno,
  saldo,
  onVerDetalhes
}) => {
  return (
    <Alert className="border-green-200 bg-green-50">
      <CheckCircle className="h-5 w-5 text-green-600" />
      <AlertTitle className="text-green-800 font-semibold">
        Cálculo Realizado com Sucesso
      </AlertTitle>
      <AlertDescription className="text-green-700">
        <p className="mb-2">
          Banco de horas calculado para <strong>{empresaNome}</strong> no período{' '}
          <strong>{mesAno}</strong>.
        </p>
        <p className="text-sm">
          Saldo mensal: <strong className="text-green-900">{saldo}</strong>
        </p>
        {onVerDetalhes && (
          <button
            onClick={onVerDetalhes}
            className="mt-3 text-sm font-medium text-green-800 hover:text-green-900 underline"
          >
            Ver detalhes completos →
          </button>
        )}
      </AlertDescription>
    </Alert>
  );
};

interface CalculoErroAlertProps {
  empresaNome: string;
  mesAno: string;
  erro: string;
  onTentarNovamente?: () => void;
}

/**
 * Requirement 18.7: Alerta inline para erro no cálculo
 * 
 * Exibe erro quando o cálculo falha.
 */
export const CalculoErroAlert: React.FC<CalculoErroAlertProps> = ({
  empresaNome,
  mesAno,
  erro,
  onTentarNovamente
}) => {
  return (
    <Alert className="border-red-200 bg-red-50">
      <AlertCircle className="h-5 w-5 text-red-600" />
      <AlertTitle className="text-red-800 font-semibold">
        Erro ao Calcular Banco de Horas
      </AlertTitle>
      <AlertDescription className="text-red-700">
        <p className="mb-2">
          Não foi possível calcular o banco de horas para <strong>{empresaNome}</strong> no período{' '}
          <strong>{mesAno}</strong>.
        </p>
        <p className="text-sm font-medium text-red-800 mb-2">
          {erro}
        </p>
        <p className="text-xs text-red-600">
          Verifique os dados de entrada e tente novamente. Se o problema persistir, contate o suporte.
        </p>
        {onTentarNovamente && (
          <button
            onClick={onTentarNovamente}
            className="mt-3 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 transition-colors"
          >
            Tentar Novamente
          </button>
        )}
      </AlertDescription>
    </Alert>
  );
};

interface InfoAlertProps {
  titulo: string;
  mensagem: string;
  onAcao?: {
    label: string;
    onClick: () => void;
  };
}

/**
 * Alerta informativo genérico
 */
export const InfoAlert: React.FC<InfoAlertProps> = ({
  titulo,
  mensagem,
  onAcao
}) => {
  return (
    <Alert className="border-blue-200 bg-blue-50">
      <Info className="h-5 w-5 text-blue-600" />
      <AlertTitle className="text-blue-800 font-semibold">
        {titulo}
      </AlertTitle>
      <AlertDescription className="text-blue-700">
        <p className="text-sm">{mensagem}</p>
        {onAcao && (
          <button
            onClick={onAcao.onClick}
            className="mt-3 text-sm font-medium text-blue-800 hover:text-blue-900 underline"
          >
            {onAcao.label} →
          </button>
        )}
      </AlertDescription>
    </Alert>
  );
};

interface WarningAlertProps {
  titulo: string;
  mensagem: string;
  onAcao?: {
    label: string;
    onClick: () => void;
  };
}

/**
 * Alerta de aviso genérico
 */
export const WarningAlert: React.FC<WarningAlertProps> = ({
  titulo,
  mensagem,
  onAcao
}) => {
  return (
    <Alert className="border-yellow-200 bg-yellow-50">
      <AlertTriangle className="h-5 w-5 text-yellow-600" />
      <AlertTitle className="text-yellow-800 font-semibold">
        {titulo}
      </AlertTitle>
      <AlertDescription className="text-yellow-700">
        <p className="text-sm">{mensagem}</p>
        {onAcao && (
          <button
            onClick={onAcao.onClick}
            className="mt-3 text-sm font-medium text-yellow-800 hover:text-yellow-900 underline"
          >
            {onAcao.label} →
          </button>
        )}
      </AlertDescription>
    </Alert>
  );
};
