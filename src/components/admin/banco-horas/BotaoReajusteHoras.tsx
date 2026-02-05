/**
 * BotaoReajusteHoras Component
 * 
 * Botão que exibe a somatória das horas de reajuste e abre modal para lançamento
 * 
 * @module components/admin/banco-horas/BotaoReajusteHoras
 */

import React, { useState } from 'react';
import { Plus, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface BotaoReajusteHorasProps {
  /** Valor atual das horas de reajuste (formato HH:MM) */
  horasAtuais?: string;
  
  /** Valor atual dos tickets de reajuste */
  ticketsAtuais?: number;
  
  /** Mês do reajuste */
  mes: number;
  
  /** Ano do reajuste */
  ano: number;
  
  /** ID da empresa */
  empresaId: string;
  
  /** Nome do mês (ex: "Janeiro") */
  nomeMes: string;
  
  /** Tipo de cobrança ('ticket' ou 'banco_horas') */
  tipoCobranca?: string;
  
  /** Callback quando reajuste é salvo */
  onSalvar: (dados: {
    mes: number;
    ano: number;
    empresaId: string;
    horas: string;
    tickets: number;
    tipo: 'entrada' | 'saida';
    observacao: string;
  }) => Promise<void>;
  
  /** Se o botão está desabilitado */
  disabled?: boolean;
  
  /** Se está salvando */
  isSaving?: boolean;
}

/**
 * Formata horas de HH:MM para exibição
 * Remove o sinal de menos para valores negativos (serão exibidos em vermelho)
 */
const formatarHoras = (horas?: string): string => {
  if (!horas || horas === '0:00' || horas === '00:00') return '00:00';
  
  // Remover sinal de menos se existir
  const horasSemSinal = horas.startsWith('-') ? horas.substring(1) : horas;
  
  const parts = horasSemSinal.split(':');
  if (parts.length >= 2) {
    return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
  }
  return horasSemSinal;
};

/**
 * Determina cor do texto baseado no valor
 */
const getColorClass = (horas?: string): string => {
  if (!horas || horas === '0:00' || horas === '00:00') return 'text-gray-500';
  
  // Verificar se é negativo pelo sinal de menos
  const isNegativo = horas.startsWith('-');
  
  if (isNegativo) return 'text-red-600';
  
  // Se não tem sinal de menos, verificar se é positivo
  const horasSemSinal = horas.replace('-', '');
  const [h, m] = horasSemSinal.split(':').map(Number);
  const minutos = (h * 60) + m;
  
  if (minutos > 0) return 'text-green-600';
  return 'text-gray-500';
};

export function BotaoReajusteHoras({
  horasAtuais,
  ticketsAtuais,
  mes,
  ano,
  empresaId,
  nomeMes,
  tipoCobranca,
  onSalvar,
  disabled = false,
  isSaving = false
}: BotaoReajusteHorasProps) {
  const [modalAberto, setModalAberto] = useState(false);
  const [horas, setHoras] = useState('');
  const [tickets, setTickets] = useState('');
  const [tipo, setTipo] = useState<'entrada' | 'saida'>('entrada');
  const [observacao, setObservacao] = useState('');
  const [erro, setErro] = useState('');
  
  // Verificar se é tipo ticket (singular ou plural)
  const isTicket = tipoCobranca?.toLowerCase() === 'ticket' || tipoCobranca?.toLowerCase() === 'tickets';
  
  // Formatar valor atual para exibição
  const valorAtualFormatado = isTicket 
    ? (ticketsAtuais !== undefined && ticketsAtuais !== null ? ticketsAtuais.toString() : '0')
    : formatarHoras(horasAtuais);
  
  const colorClass = isTicket
    ? (ticketsAtuais && ticketsAtuais > 0 ? 'text-green-600' : ticketsAtuais && ticketsAtuais < 0 ? 'text-red-600' : 'text-gray-500')
    : getColorClass(horasAtuais);
  
  const temValor = isTicket
    ? (ticketsAtuais !== undefined && ticketsAtuais !== null && ticketsAtuais !== 0)
    : (horasAtuais && horasAtuais !== '0:00' && horasAtuais !== '00:00');
  
  // Abrir modal
  const handleAbrirModal = () => {
    setModalAberto(true);
    setHoras('');
    setTickets('');
    setTipo('entrada');
    setObservacao('');
    setErro('');
  };
  
  // Fechar modal
  const handleFecharModal = () => {
    setModalAberto(false);
    setHoras('');
    setTickets('');
    setTipo('entrada');
    setObservacao('');
    setErro('');
  };
  
  // Validar formato de horas
  const validarHoras = (valor: string): boolean => {
    const regex = /^\d{1,4}:[0-5]\d$/;
    return regex.test(valor);
  };
  
  // Handler para tecla Tab - autocompletar com :00
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Tab' && horas.trim() && !horas.includes(':')) {
      e.preventDefault();
      const horasComZeros = `${horas}:00`;
      setHoras(horasComZeros);
      setErro('');
    }
  };
  
  // Salvar reajuste
  const handleSalvar = async () => {
    // Validações para tickets
    if (isTicket) {
      if (!tickets.trim()) {
        setErro('Digite a quantidade de tickets');
        return;
      }
      
      const ticketsNum = parseInt(tickets);
      if (isNaN(ticketsNum) || ticketsNum <= 0) {
        setErro('Digite um número válido de tickets');
        return;
      }
      
      if (!observacao.trim()) {
        setErro('A observação é obrigatória');
        return;
      }
      
      try {
        await onSalvar({
          mes,
          ano,
          empresaId,
          horas: '0:00', // Para tickets, horas é sempre 0
          tickets: ticketsNum,
          tipo,
          observacao
        });
        
        handleFecharModal();
      } catch (error) {
        console.error('Erro ao salvar reajuste:', error);
        setErro(error instanceof Error ? error.message : 'Erro ao salvar reajuste');
      }
      return;
    }
    
    // Validações para horas
    if (!horas.trim()) {
      setErro('Digite as horas no formato HH:MM');
      return;
    }
    
    if (!validarHoras(horas)) {
      setErro('Formato inválido! Use o formato HH:MM (exemplo: 10:30)');
      return;
    }
    
    if (!observacao.trim()) {
      setErro('A observação é obrigatória');
      return;
    }
    
    try {
      await onSalvar({
        mes,
        ano,
        empresaId,
        horas,
        tickets: 0, // Para horas, tickets é sempre 0
        tipo,
        observacao
      });
      
      handleFecharModal();
    } catch (error) {
      console.error('Erro ao salvar reajuste:', error);
      setErro(error instanceof Error ? error.message : 'Erro ao salvar reajuste');
    }
  };
  
  return (
    <>
      {/* Botão que exibe a somatória */}
      <Button
        variant="outline"
        size="sm"
        onClick={handleAbrirModal}
        disabled={disabled || isSaving}
        className={`w-full max-w-[120px] mx-auto flex items-center justify-center gap-2 ${
          temValor ? 'border-sonda-blue hover:bg-sonda-blue/5' : 'border-gray-300'
        }`}
      >
        <Clock className={`h-4 w-4 ${colorClass}`} />
        <span className={`font-mono font-semibold ${colorClass}`}>
          {valorAtualFormatado}
        </span>
        <Plus className="h-3 w-3 text-gray-400" />
      </Button>
      
      {/* Modal de Lançamento */}
      <Dialog open={modalAberto} onOpenChange={setModalAberto}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-sonda-blue">
              {isTicket ? 'Lançar Reajuste de Tickets' : 'Lançar Reajuste de Horas'}
            </DialogTitle>
            <DialogDescription className="text-sm text-gray-500">
              {isTicket ? 'Adicione ou remova tickets do banco' : 'Adicione ou remova horas do banco de horas'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Informações do período */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Mês:</span>
                  <span className="ml-2 font-semibold">{nomeMes}</span>
                </div>
                <div>
                  <span className="text-gray-600">Ano:</span>
                  <span className="ml-2 font-semibold">{ano}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-gray-600">Saldo Atual:</span>
                  <span className={`ml-2 font-semibold font-mono ${colorClass}`}>
                    {valorAtualFormatado}
                  </span>
                </div>
              </div>
            </div>
            
            {/* Tipo de Reajuste */}
            <div className="space-y-2">
              <Label htmlFor="tipo-reajuste" className="text-sm font-medium text-gray-700">
                Tipo de Reajuste <span className="text-red-500">*</span>
              </Label>
              <Select value={tipo} onValueChange={(value: 'entrada' | 'saida') => setTipo(value)}>
                <SelectTrigger className="focus:ring-sonda-blue focus:border-sonda-blue">
                  <SelectValue placeholder="Selecione o tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="entrada">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-green-500" />
                      <span>Entrada (Adicionar {isTicket ? 'tickets' : 'horas'})</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="saida">
                    <div className="flex items-center gap-2">
                      <div className="h-2 w-2 rounded-full bg-red-500" />
                      <span>Saída (Remover {isTicket ? 'tickets' : 'horas'})</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {/* Campo de Horas ou Tickets */}
            {isTicket ? (
              <div className="space-y-2">
                <Label htmlFor="tickets" className="text-sm font-medium text-gray-700">
                  Quantidade de Tickets <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="tickets"
                  type="number"
                  min="1"
                  placeholder="0"
                  value={tickets}
                  onChange={(e) => {
                    setTickets(e.target.value);
                    setErro('');
                  }}
                  className={`font-mono focus:ring-sonda-blue focus:border-sonda-blue ${
                    erro && !tickets.trim() ? 'border-red-500' : ''
                  }`}
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="horas" className="text-sm font-medium text-gray-700">
                  Horas (HH:MM) <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="horas"
                  type="text"
                  placeholder="00:00"
                  value={horas}
                  onChange={(e) => {
                    setHoras(e.target.value);
                    setErro('');
                  }}
                  onKeyDown={handleKeyDown}
                  className={`font-mono focus:ring-sonda-blue focus:border-sonda-blue ${
                    erro && !horas.trim() ? 'border-red-500' : ''
                  }`}
                />
              </div>
            )}
            
            {/* Observação */}
            <div className="space-y-2">
              <Label htmlFor="observacao" className="text-sm font-medium text-gray-700">
                Observação <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="observacao"
                placeholder="Digite a justificativa para este reajuste..."
                value={observacao}
                onChange={(e) => {
                  setObservacao(e.target.value);
                  setErro('');
                }}
                rows={4}
                className={`focus:ring-sonda-blue focus:border-sonda-blue ${
                  erro && !observacao.trim() ? 'border-red-500' : ''
                }`}
              />
            </div>
            
            {/* Mensagem de erro */}
            {erro && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-600">{erro}</p>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleFecharModal}
              disabled={isSaving}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleSalvar}
              disabled={isSaving}
              className="bg-sonda-blue hover:bg-sonda-dark-blue"
            >
              {isSaving ? 'Salvando...' : 'Salvar Reajuste'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
