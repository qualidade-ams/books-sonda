import React, { useState } from 'react';
import { 
  HelpCircle, 
  Info, 
  AlertCircle, 
  CheckCircle, 
  X,
  ChevronDown,
  ChevronUp,
  FileText,
  Clock,
  DollarSign,
  Calendar,
  User,
  Building2,
  Code
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from '@/components/ui/tooltip';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

/**
 * Tooltip otimizado com delay configurável
 */
interface OptimizedTooltipProps {
  content: string | React.ReactNode;
  children: React.ReactNode;
  side?: 'top' | 'right' | 'bottom' | 'left';
  delay?: number;
  className?: string;
  disabled?: boolean;
}

export function OptimizedTooltip({
  content,
  children,
  side = 'top',
  delay = 300,
  className = '',
  disabled = false
}: OptimizedTooltipProps) {
  if (disabled) {
    return <>{children}</>;
  }

  return (
    <TooltipProvider delayDuration={delay}>
      <Tooltip>
        <TooltipTrigger asChild>
          {children}
        </TooltipTrigger>
        <TooltipContent side={side} className={className}>
          {typeof content === 'string' ? <p>{content}</p> : content}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Ícone de ajuda com tooltip
 */
interface HelpIconProps {
  content: string | React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'info' | 'warning' | 'success' | 'error';
  className?: string;
}

export function HelpIcon({ 
  content, 
  size = 'sm', 
  variant = 'info',
  className = '' 
}: HelpIconProps) {
  const sizeClasses = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5'
  };

  const variantClasses = {
    info: 'text-blue-500 hover:text-blue-600',
    warning: 'text-amber-500 hover:text-amber-600',
    success: 'text-green-500 hover:text-green-600',
    error: 'text-red-500 hover:text-red-600'
  };

  const Icon = variant === 'warning' ? AlertCircle : 
               variant === 'success' ? CheckCircle :
               variant === 'error' ? AlertCircle : HelpCircle;

  return (
    <OptimizedTooltip content={content}>
      <Icon 
        className={`${sizeClasses[size]} ${variantClasses[variant]} cursor-help ${className}`}
      />
    </OptimizedTooltip>
  );
}

/**
 * Campo de formulário com ajuda
 */
interface FormFieldHelpProps {
  label: string;
  helpText?: string;
  required?: boolean;
  children: React.ReactNode;
  error?: string;
  description?: string;
}

export function FormFieldHelp({
  label,
  helpText,
  required = false,
  children,
  error,
  description
}: FormFieldHelpProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
        {helpText && <HelpIcon content={helpText} />}
      </div>
      
      {children}
      
      {description && (
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {description}
        </p>
      )}
      
      {error && (
        <p className="text-xs text-red-600 dark:text-red-400 flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          {error}
        </p>
      )}
    </div>
  );
}

/**
 * Seção de ajuda expansível
 */
interface HelpSectionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  icon?: React.ReactNode;
}

export function HelpSection({ 
  title, 
  children, 
  defaultOpen = false,
  icon 
}: HelpSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          className="w-full justify-between p-3 h-auto text-left"
        >
          <div className="flex items-center gap-2">
            {icon}
            <span className="font-medium">{title}</span>
          </div>
          {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="px-3 pb-3">
        {children}
      </CollapsibleContent>
    </Collapsible>
  );
}

/**
 * Guia de ajuda completo para requerimentos
 */
export function RequerimentosHelpGuide() {
  return (
    <Card className="max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <HelpCircle className="h-5 w-5 text-blue-600" />
          Guia do Sistema de Requerimentos
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <HelpSection 
          title="Campos Obrigatórios" 
          icon={<AlertCircle className="h-4 w-4 text-red-500" />}
        >
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-2">
              <FileText className="h-4 w-4 text-blue-500 mt-0.5" />
              <div>
                <strong>Chamado:</strong> Código único do chamado (ex: RF-6017993). 
                Aceita apenas letras, números e hífen.
              </div>
            </div>
            <div className="flex items-start gap-2">
              <User className="h-4 w-4 text-green-500 mt-0.5" />
              <div>
                <strong>Cliente:</strong> Selecione o cliente da lista de empresas ativas.
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Building2 className="h-4 w-4 text-purple-500 mt-0.5" />
              <div>
                <strong>Módulo:</strong> Sistema onde o requerimento será implementado.
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Code className="h-4 w-4 text-orange-500 mt-0.5" />
              <div>
                <strong>Linguagem:</strong> Tecnologia utilizada na implementação.
              </div>
            </div>
          </div>
        </HelpSection>

        <HelpSection 
          title="Controle de Horas" 
          icon={<Clock className="h-4 w-4 text-blue-500" />}
        >
          <div className="space-y-2 text-sm">
            <p>
              <strong>Horas Funcionais:</strong> Tempo gasto em análise funcional e especificação.
            </p>
            <p>
              <strong>Horas Técnicas:</strong> Tempo gasto em desenvolvimento e implementação.
            </p>
            <p>
              <strong>Horas Total:</strong> Calculado automaticamente (Funcional + Técnico).
            </p>
            <Badge variant="outline" className="text-xs">
              💡 Valores acima de 100 horas são permitidos para projetos complexos
            </Badge>
          </div>
        </HelpSection>

        <HelpSection 
          title="Tipos de Cobrança" 
          icon={<DollarSign className="h-4 w-4 text-green-500" />}
        >
          <div className="space-y-2 text-sm">
            <div className="grid grid-cols-2 gap-2">
              <Badge className="bg-blue-100 text-blue-800">Banco de Horas</Badge>
              <Badge className="bg-green-100 text-green-800">Cobro Interno</Badge>
              <Badge className="bg-gray-100 text-gray-800">Contrato</Badge>
              <Badge className="bg-orange-100 text-orange-800">Faturado</Badge>
              <Badge className="bg-red-100 text-red-800">Hora Extra</Badge>
              <Badge className="bg-purple-100 text-purple-800">Sobreaviso</Badge>
              <Badge className="bg-slate-100 text-slate-800">Reprovado</Badge>
              <Badge className="bg-yellow-100 text-yellow-800">Bolsão Enel</Badge>
            </div>
            <p className="text-xs text-gray-600 mt-2">
              Cada tipo possui uma cor específica para facilitar a identificação visual.
            </p>
          </div>
        </HelpSection>

        <HelpSection 
          title="Fluxo de Trabalho" 
          icon={<CheckCircle className="h-4 w-4 text-green-500" />}
        >
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center text-xs font-bold">1</div>
              <span>Criar requerimento com todas as informações</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-orange-100 text-orange-800 rounded-full flex items-center justify-center text-xs font-bold">2</div>
              <span>Revisar e editar se necessário</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-green-100 text-green-800 rounded-full flex items-center justify-center text-xs font-bold">3</div>
              <span>Enviar para faturamento</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-purple-100 text-purple-800 rounded-full flex items-center justify-center text-xs font-bold">4</div>
              <span>Processar faturamento por email</span>
            </div>
          </div>
        </HelpSection>

        <HelpSection 
          title="Dicas e Atalhos" 
          icon={<Info className="h-4 w-4 text-blue-500" />}
        >
          <div className="space-y-2 text-sm">
            <p>• Use filtros para encontrar requerimentos específicos rapidamente</p>
            <p>• Selecione múltiplos requerimentos para envio em lote</p>
            <p>• O campo observação é opcional mas útil para informações extras</p>
            <p>• Datas não podem ser futuras nem muito antigas</p>
            <p>• Descrição limitada a 500 caracteres, observação a 1000</p>
          </div>
        </HelpSection>
      </CardContent>
    </Card>
  );
}

/**
 * Modal de ajuda contextual
 */
interface ContextualHelpProps {
  trigger?: React.ReactNode;
  title: string;
  children: React.ReactNode;
}

export function ContextualHelp({ 
  trigger, 
  title, 
  children 
}: ContextualHelpProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="ghost" size="sm" className="p-1">
            <HelpCircle className="h-4 w-4 text-blue-500" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5 text-blue-600" />
            {title}
          </DialogTitle>
        </DialogHeader>
        {children}
      </DialogContent>
    </Dialog>
  );
}

/**
 * Indicador de progresso com ajuda
 */
interface ProgressHelpProps {
  currentStep: number;
  totalSteps: number;
  steps: Array<{
    title: string;
    description: string;
    icon?: React.ReactNode;
  }>;
}

export function ProgressHelp({ currentStep, totalSteps, steps }: ProgressHelpProps) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">
          Progresso: {currentStep} de {totalSteps}
        </span>
        <span className="text-xs text-gray-500">
          {Math.round((currentStep / totalSteps) * 100)}% concluído
        </span>
      </div>
      
      <div className="space-y-2">
        {steps.map((step, index) => {
          const stepNumber = index + 1;
          const isCompleted = stepNumber < currentStep;
          const isCurrent = stepNumber === currentStep;
          
          return (
            <div 
              key={index}
              className={`flex items-start gap-3 p-2 rounded-lg ${
                isCurrent ? 'bg-blue-50 dark:bg-blue-950' : 
                isCompleted ? 'bg-green-50 dark:bg-green-950' : 
                'bg-gray-50 dark:bg-gray-800'
              }`}
            >
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                isCompleted ? 'bg-green-500 text-white' :
                isCurrent ? 'bg-blue-500 text-white' :
                'bg-gray-300 text-gray-600'
              }`}>
                {isCompleted ? '✓' : stepNumber}
              </div>
              <div className="flex-1">
                <h4 className={`text-sm font-medium ${
                  isCurrent ? 'text-blue-700 dark:text-blue-300' :
                  isCompleted ? 'text-green-700 dark:text-green-300' :
                  'text-gray-600 dark:text-gray-400'
                }`}>
                  {step.title}
                </h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {step.description}
                </p>
              </div>
              {step.icon && (
                <div className="text-gray-400">
                  {step.icon}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Validação em tempo real com feedback visual
 */
interface ValidationFeedbackProps {
  value: string;
  rules: Array<{
    test: (value: string) => boolean;
    message: string;
    type: 'error' | 'warning' | 'success';
  }>;
  showOnlyErrors?: boolean;
}

export function ValidationFeedback({ 
  value, 
  rules, 
  showOnlyErrors = false 
}: ValidationFeedbackProps) {
  const results = rules.map(rule => ({
    ...rule,
    passed: rule.test(value)
  }));

  const visibleResults = showOnlyErrors 
    ? results.filter(r => !r.passed && r.type === 'error')
    : results;

  if (visibleResults.length === 0) return null;

  return (
    <div className="space-y-1 mt-2">
      {visibleResults.map((result, index) => {
        const Icon = result.passed ? CheckCircle : 
                    result.type === 'error' ? AlertCircle : 
                    Info;
        
        const colorClass = result.passed ? 'text-green-600' :
                          result.type === 'error' ? 'text-red-600' :
                          result.type === 'warning' ? 'text-amber-600' :
                          'text-blue-600';

        return (
          <div key={index} className={`flex items-center gap-2 text-xs ${colorClass}`}>
            <Icon className="h-3 w-3" />
            <span>{result.message}</span>
          </div>
        );
      })}
    </div>
  );
}