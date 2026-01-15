/**
 * Componente de seleção múltipla de especialistas - Versão Otimizada com Paginação
 * Baseado no componente MultiSelect para melhor performance
 */

import * as React from 'react';
import { Check, ChevronDown, X, User, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { useEspecialistasComPaginacao } from '@/hooks/useEspecialistasOtimizado';

export interface EspecialistaOption {
  label: string;
  value: string;
  email?: string;
}

interface MultiSelectEspecialistasProps {
  value?: string[]; // Array de IDs dos especialistas selecionados
  onValueChange?: (value: string[]) => void;
  onConsultoresManuaisChange?: (consultores: EspecialistaOption[]) => void; // Callback para consultores manuais
  initialConsultoresManuais?: EspecialistaOption[]; // Consultores manuais iniciais (para edição)
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  maxCount?: number;
}

export function MultiSelectEspecialistas({
  value = [],
  onValueChange,
  onConsultoresManuaisChange,
  initialConsultoresManuais = [],
  placeholder = "Selecione os consultores...",
  disabled = false,
  className,
  maxCount = 10
}: MultiSelectEspecialistasProps) {
  const [open, setOpen] = React.useState(false);
  const [modalNovoConsultor, setModalNovoConsultor] = React.useState(false);
  const [nomeNovoConsultor, setNomeNovoConsultor] = React.useState('');
  const [emailNovoConsultor, setEmailNovoConsultor] = React.useState('');
  const [consultoresManuais, setConsultoresManuais] = React.useState<EspecialistaOption[]>(initialConsultoresManuais);
  
  // Sincronizar consultores manuais iniciais quando mudarem
  React.useEffect(() => {
    if (initialConsultoresManuais.length > 0) {
      console.log('🔄 [MultiSelectEspecialistas] Recebendo consultores manuais iniciais:', initialConsultoresManuais);
      setConsultoresManuais(initialConsultoresManuais);
    }
  }, [initialConsultoresManuais]);
  
  // Estado interno para garantir que mudanças não sejam perdidas
  const [internalValue, setInternalValue] = React.useState<string[]>(value);
  
  // Sincronizar estado interno com prop value apenas quando necessário
  React.useEffect(() => {
    if (JSON.stringify(value) !== JSON.stringify(internalValue)) {
      console.log('🔄 [MultiSelectEspecialistas] Sincronizando valor:', value);
      console.log('🔄 [MultiSelectEspecialistas] Valor anterior (internal):', internalValue);
      console.log('🔄 [MultiSelectEspecialistas] Novo valor (prop):', value);
      setInternalValue(value);
    }
  }, [value, internalValue]);
  
  // Log quando consultores manuais mudam
  React.useEffect(() => {
    console.log('📋 [MultiSelectEspecialistas] Consultores manuais atualizados:', consultoresManuais);
    console.log('📋 [MultiSelectEspecialistas] Quantidade:', consultoresManuais.length);
  }, [consultoresManuais]);
  
  const { 
    especialistas, 
    todosEspecialistas,
    termoBusca, 
    atualizarBusca, 
    isLoading,
    total,
    filtrados,
    temMaisPaginas,
    carregarProximaPagina,
    itensCarregados,
    itensRestantes
  } = useEspecialistasComPaginacao(10); // 10 itens por "página"

  // Combinar especialistas do banco com consultores manuais
  const allOptions: EspecialistaOption[] = React.useMemo(() => {
    const especialistasDb = todosEspecialistas.map(esp => ({
      label: esp.nome,
      value: esp.id,
      email: esp.email || undefined
    }));
    
    return [...especialistasDb, ...consultoresManuais];
  }, [todosEspecialistas, consultoresManuais]);

  // Opções paginadas para exibição na lista (apenas do banco de dados)
  const options: EspecialistaOption[] = React.useMemo(() => 
    especialistas.map(esp => ({
      label: esp.nome,
      value: esp.id,
      email: esp.email || undefined
    })), [especialistas]
  );

  // Filtrar opções disponíveis (não selecionadas) - usar estado interno
  const selectables = React.useMemo(() => 
    options.filter(option => !internalValue.includes(option.value)), 
    [options, internalValue]
  );

  // Calcular se há mais itens para carregar baseado nos dados reais - usar estado interno
  const totalDisponiveis = React.useMemo(() => {
    return todosEspecialistas.filter(esp => !internalValue.includes(esp.id)).length;
  }, [todosEspecialistas, internalValue]);

  const temMaisItensDisponiveis = !termoBusca.trim() && selectables.length < totalDisponiveis;

  const handleUnselect = (item: string) => {
    console.log('🗑️ [MultiSelectEspecialistas] === INÍCIO handleUnselect ===');
    console.log('🗑️ [MultiSelectEspecialistas] Item a remover:', item);
    console.log('🗑️ [MultiSelectEspecialistas] internalValue ANTES:', internalValue);
    console.log('🗑️ [MultiSelectEspecialistas] value prop ANTES:', value);
    
    // Se for um consultor manual, remover também da lista de consultores manuais
    if (item.startsWith('manual_')) {
      const novosConsultoresManuais = consultoresManuais.filter(c => c.value !== item);
      console.log('🗑️ [MultiSelectEspecialistas] Removendo consultor manual');
      setConsultoresManuais(novosConsultoresManuais);
      // Notificar o componente pai
      onConsultoresManuaisChange?.(novosConsultoresManuais);
    }
    
    const novoValor = internalValue.filter(id => id !== item);
    console.log('🗑️ [MultiSelectEspecialistas] novoValor calculado:', novoValor);
    console.log('🗑️ [MultiSelectEspecialistas] Chamando setInternalValue...');
    setInternalValue(novoValor);
    console.log('🗑️ [MultiSelectEspecialistas] Chamando onValueChange...');
    onValueChange?.(novoValor);
    
    // Fechar o popover após remover (para não bloquear outros elementos)
    setOpen(false);
    
    console.log('🗑️ [MultiSelectEspecialistas] === FIM handleUnselect ===');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const input = e.target as HTMLInputElement;
    if (input.value === "" && internalValue.length > 0) {
      if (e.key === "Delete" || e.key === "Backspace") {
        const ultimoItem = internalValue[internalValue.length - 1];
        // Se for um consultor manual, remover também da lista de consultores manuais
        if (ultimoItem.startsWith('manual_')) {
          const novosConsultoresManuais = consultoresManuais.filter(c => c.value !== ultimoItem);
          setConsultoresManuais(novosConsultoresManuais);
          // Notificar o componente pai
          onConsultoresManuaisChange?.(novosConsultoresManuais);
        }
        const novoValor = internalValue.slice(0, -1);
        console.log('⌫ [MultiSelectEspecialistas] Removendo último item via teclado:', ultimoItem, 'Novo valor:', novoValor);
        setInternalValue(novoValor);
        onValueChange?.(novoValor);
      }
    }
    // Escape closes the popover
    if (e.key === "Escape") {
      setOpen(false);
    }
  };

  const handleAdicionarConsultorManual = () => {
    if (!nomeNovoConsultor.trim()) return;
    
    // Gerar um ID temporário único para o consultor manual
    const idTemporario = `manual_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Criar o novo consultor
    const novoConsultor: EspecialistaOption = {
      label: nomeNovoConsultor.trim(),
      value: idTemporario,
      email: emailNovoConsultor.trim() || undefined
    };
    
    // Adicionar à lista de consultores manuais
    const novosConsultoresManuais = [...consultoresManuais, novoConsultor];
    setConsultoresManuais(novosConsultoresManuais);
    
    // Notificar o componente pai sobre os consultores manuais
    onConsultoresManuaisChange?.(novosConsultoresManuais);
    
    // Adicionar à seleção
    const novoValor = [...internalValue, idTemporario];
    console.log('➕ [MultiSelectEspecialistas] Adicionando consultor manual:', novoConsultor.label, 'Novo valor:', novoValor);
    setInternalValue(novoValor);
    onValueChange?.(novoValor);
    
    // Limpar o modal
    setNomeNovoConsultor('');
    setEmailNovoConsultor('');
    setModalNovoConsultor(false);
  };

  const handleCancelarNovoConsultor = () => {
    setNomeNovoConsultor('');
    setEmailNovoConsultor('');
    setModalNovoConsultor(false);
  };

  if (isLoading) {
    return (
      <Button
        variant="outline"
        className={cn("w-full justify-between text-left font-normal", className)}
        disabled
      >
        <span className="text-muted-foreground">Carregando consultores...</span>
        <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
      </Button>
    );
  }

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn(
              "w-full justify-between text-left font-normal min-h-[40px] h-auto",
              className
            )}
            disabled={disabled}
          >
            <div className="flex gap-1 flex-wrap">
              {internalValue.length === 0 && (
                <span className="text-muted-foreground">{placeholder}</span>
              )}
              {internalValue.length > 0 && internalValue.length <= maxCount && (
                <>
                  {internalValue.map((item) => {
                    const option = allOptions.find((option) => option.value === item);
                    if (!option) return null;
                    return (
                      <Badge
                        variant="secondary"
                        key={item}
                        className={cn(
                          "mr-1 mb-1 flex items-center gap-1 hover:bg-destructive/10",
                          item.startsWith('manual_') && "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900 dark:text-blue-200"
                        )}
                        title={`${option.label}${item.startsWith('manual_') ? ' (Manual)' : ''}`}
                      >
                        <User className="h-3 w-3" />
                        <span className="max-w-[120px] truncate">{option.label}</span>
                        {item.startsWith('manual_') && (
                          <span className="text-xs opacity-75">(M)</span>
                        )}
                        <span
                          className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 hover:bg-destructive hover:text-destructive-foreground cursor-pointer inline-flex items-center justify-center"
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              e.stopPropagation();
                              handleUnselect(item);
                            }
                          }}
                          onMouseDown={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            console.log('🖱️ [MultiSelectEspecialistas] MouseDown no X:', item);
                          }}
                          onClick={(e) => {
                            console.log('🖱️ [MultiSelectEspecialistas] Click no X:', item);
                            e.preventDefault();
                            e.stopPropagation();
                            handleUnselect(item);
                          }}
                          title="Remover"
                        >
                          <X className="h-3 w-3" />
                        </span>
                      </Badge>
                    );
                  })}
                </>
              )}
              {internalValue.length > maxCount && (
                <Badge
                  variant="secondary"
                  className="mr-1 mb-1 flex items-center gap-1"
                >
                  <User className="h-3 w-3" />
                  {internalValue.length} consultores selecionados
                </Badge>
              )}
            </div>
            <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-full p-0"
          side="bottom"
          align="start"
          style={{ maxHeight: '600px' }}
        >
          <Command className="overflow-hidden" shouldFilter={false} style={{ maxHeight: '600px' }}>
            <CommandInput
              placeholder={`Buscar consultor... (${filtrados}/${total})`}
              value={termoBusca}
              onValueChange={atualizarBusca}
              onKeyDown={handleKeyDown}
            />
            <CommandList className="overflow-hidden" style={{ maxHeight: '550px' }}>
              <CommandEmpty>
                {isLoading ? "Carregando..." : "Nenhum consultor encontrado."}
              </CommandEmpty>
              
              {/* SCROLL ÚNICO para Selecionados + Disponíveis */}
              <div 
                className="overflow-auto"
                style={{
                  scrollbarWidth: 'thin',
                  scrollbarColor: '#cbd5e1 #f1f5f9',
                  maxHeight: '400px'
                }}
                onWheel={(e) => {
                  // Permitir scroll nativo do mouse
                  e.stopPropagation();
                }}
              >
                {/* Seção de consultores selecionados */}
                {internalValue.length > 0 && (selectables.length > 0 || !termoBusca.trim()) && (
                  <CommandGroup>
                    <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground border-b bg-background sticky top-0 z-10">
                      Selecionados ({internalValue.length})
                    </div>
                    <div className="p-2 space-y-1">
                      {internalValue.map((item) => {
                        const option = allOptions.find((opt) => opt.value === item);
                        if (!option) return null;
                        return (
                          <div
                            key={item}
                            className={cn(
                              "flex items-center justify-between p-2 rounded-md hover:bg-accent min-w-max",
                              item.startsWith('manual_') 
                                ? "bg-blue-50 border border-blue-200 dark:bg-blue-950 dark:border-blue-800" 
                                : "bg-accent/50"
                            )}
                          >
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                              <div className="flex flex-col">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-medium whitespace-nowrap">{option.label}</span>
                                  {item.startsWith('manual_') && (
                                    <span className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-800 rounded dark:bg-blue-900 dark:text-blue-200 whitespace-nowrap">
                                      Manual
                                    </span>
                                  )}
                                </div>
                                {option.email && (
                                  <span className="text-xs text-muted-foreground whitespace-nowrap">{option.email}</span>
                                )}
                              </div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleUnselect(item)}
                              className="h-6 w-6 p-0 hover:bg-destructive hover:text-destructive-foreground flex-shrink-0 ml-2"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  </CommandGroup>
                )}
                
                {/* Seção de disponíveis */}
                {selectables.length > 0 && (
                  <CommandGroup className="overflow-hidden">
                    <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground border-b bg-background sticky top-0 z-10">
                      Disponíveis ({selectables.length})
                    </div>
                    <div className="p-2 space-y-1">
                      {selectables.map((option) => (
                        <CommandItem
                          key={option.value}
                          onSelect={() => {
                            const novoValor = [...internalValue, option.value];
                            console.log('➕ [MultiSelectEspecialistas] Adicionando especialista:', option.label, 'Novo valor:', novoValor);
                            setInternalValue(novoValor);
                            onValueChange?.(novoValor);
                            atualizarBusca("");
                          }}
                          className="flex items-center gap-2 cursor-pointer hover:bg-accent min-w-max"
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4 flex-shrink-0",
                              internalValue.includes(option.value)
                                ? "opacity-100"
                                : "opacity-0"
                            )}
                          />
                          <User className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                          <div className="flex flex-col flex-1">
                            <span className="font-medium whitespace-nowrap">{option.label}</span>
                            {option.email && (
                              <span className="text-xs text-muted-foreground whitespace-nowrap">
                                {option.email}
                              </span>
                            )}
                          </div>
                        </CommandItem>
                      ))}
                    </div>
                    
                    {/* Botão "Carregar Mais" - dentro do scroll */}
                    {temMaisItensDisponiveis && (
                      <div className="p-2 border-t bg-background">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={carregarProximaPagina}
                          className="w-full justify-center gap-2 text-muted-foreground hover:text-foreground"
                        >
                          <Plus className="h-4 w-4" />
                          Carregar mais ({totalDisponiveis - selectables.length} restantes)
                        </Button>
                      </div>
                    )}
                    
                    {/* Indicador de fim da lista */}
                    {!temMaisPaginas && itensCarregados > 10 && (
                      <div className="p-2 text-center text-xs text-muted-foreground border-t bg-background">
                        Todos os {itensCarregados} consultores carregados
                      </div>
                    )}
                  </CommandGroup>
                )}
              </div>
              
              {/* Botão "Adicionar Consultor Manual" - FORA DO SCROLL, sempre visível */}
              <div className="p-2 border-t bg-background">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setModalNovoConsultor(true)}
                  className="w-full justify-center gap-2 text-blue-600 hover:text-blue-800 border-blue-200 hover:border-blue-300"
                >
                  <Plus className="h-4 w-4" />
                  Adicionar Consultor Manual
                </Button>
              </div>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      {/* Modal para adicionar consultor manual */}
      <Dialog open={modalNovoConsultor} onOpenChange={setModalNovoConsultor}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Adicionar Consultor Manual</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nome do Consultor *</label>
              <Input
                placeholder="Digite o nome do consultor"
                value={nomeNovoConsultor}
                onChange={(e) => setNomeNovoConsultor(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && nomeNovoConsultor.trim()) {
                    handleAdicionarConsultorManual();
                  }
                }}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Email (opcional)</label>
              <Input
                type="email"
                placeholder="email@exemplo.com"
                value={emailNovoConsultor}
                onChange={(e) => setEmailNovoConsultor(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && nomeNovoConsultor.trim()) {
                    handleAdicionarConsultorManual();
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={handleCancelarNovoConsultor}>
              Cancelar
            </Button>
            <Button 
              onClick={handleAdicionarConsultorManual}
              disabled={!nomeNovoConsultor.trim()}
            >
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}