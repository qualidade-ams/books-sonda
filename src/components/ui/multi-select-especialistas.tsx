/**
 * Componente de seleção múltipla de especialistas - Versão Otimizada com Paginação
 * Baseado no componente MultiSelect para melhor performance
 */

import * as React from 'react';
import { Check, ChevronDown, X, User, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
import { useEspecialistasComPaginacao } from '@/hooks/useEspecialistasOtimizado';

export interface EspecialistaOption {
  label: string;
  value: string;
  email?: string;
}

interface MultiSelectEspecialistasProps {
  value?: string[]; // Array de IDs dos especialistas selecionados
  onValueChange?: (value: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  maxCount?: number;
}

export function MultiSelectEspecialistas({
  value = [],
  onValueChange,
  placeholder = "Selecione os consultores...",
  disabled = false,
  className,
  maxCount = 2
}: MultiSelectEspecialistasProps) {
  const [open, setOpen] = React.useState(false);
  
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

  // Converter TODOS os especialistas para formato de opções (não apenas os paginados)
  // Isso garante que especialistas selecionados sempre apareçam, mesmo se não estiverem na página atual
  
  const allOptions: EspecialistaOption[] = React.useMemo(() => 
    todosEspecialistas.map(esp => ({
      label: esp.nome,
      value: esp.id,
      email: esp.email || undefined
    })), [todosEspecialistas]
  );

  // Opções paginadas para exibição na lista
  const options: EspecialistaOption[] = React.useMemo(() => 
    especialistas.map(esp => ({
      label: esp.nome,
      value: esp.id,
      email: esp.email || undefined
    })), [especialistas]
  );

  // Filtrar opções disponíveis (não selecionadas)
  const selectables = React.useMemo(() => 
    options.filter(option => !value.includes(option.value)), 
    [options, value]
  );

  // Calcular se há mais itens para carregar baseado nos dados reais
  const totalDisponiveis = React.useMemo(() => {
    return todosEspecialistas.filter(esp => !value.includes(esp.id)).length;
  }, [todosEspecialistas, value]);

  const temMaisItensDisponiveis = !termoBusca.trim() && selectables.length < totalDisponiveis;

  const handleUnselect = (item: string) => {
    onValueChange?.(value.filter(id => id !== item));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const input = e.target as HTMLInputElement;
    if (input.value === "" && value.length > 0) {
      if (e.key === "Delete" || e.key === "Backspace") {
        onValueChange?.(value.slice(0, -1));
      }
    }
    // Escape closes the popover
    if (e.key === "Escape") {
      setOpen(false);
    }
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
            {value.length === 0 && (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
            {value.length > 0 && value.length <= maxCount && (
              <>
                {value.map((item) => {
                  const option = allOptions.find((option) => option.value === item);
                  if (!option) return null;
                  return (
                    <Badge
                      variant="secondary"
                      key={item}
                      className="mr-1 mb-1 flex items-center gap-1 hover:bg-destructive/10 cursor-pointer"
                      title={`Clique para remover ${option.label}`}
                    >
                      <User className="h-3 w-3" />
                      <span className="max-w-[120px] truncate">{option.label}</span>
                      <button
                        className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 hover:bg-destructive hover:text-destructive-foreground"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            handleUnselect(item);
                          }
                        }}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                        }}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          handleUnselect(item);
                        }}
                        title="Remover"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  );
                })}
              </>
            )}
            {value.length > maxCount && (
              <Badge
                variant="secondary"
                className="mr-1 mb-1 flex items-center gap-1"
              >
                <User className="h-3 w-3" />
                {value.length} consultores selecionados
              </Badge>
            )}
          </div>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-full p-0 max-h-96 overflow-hidden"
        side="bottom"
        align="start"
      >
        <Command className="overflow-hidden">
          <CommandInput
            placeholder={`Buscar consultor... (${filtrados}/${total})`}
            value={termoBusca}
            onValueChange={atualizarBusca}
            onKeyDown={handleKeyDown}
          />
          <CommandList className="max-h-80 overflow-hidden">
            <CommandEmpty>
              {isLoading ? "Carregando..." : "Nenhum consultor encontrado."}
            </CommandEmpty>
            
            {/* Seção de consultores selecionados */}
            {value.length > 0 && (
              <CommandGroup>
                <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground border-b">
                  Selecionados ({value.length})
                </div>
                <div className="p-2 space-y-1">
                  {value.map((item) => {
                    const option = allOptions.find((opt) => opt.value === item);
                    if (!option) return null;
                    return (
                      <div
                        key={item}
                        className="flex items-center justify-between p-2 rounded-md bg-accent/50 hover:bg-accent"
                      >
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <div className="flex flex-col">
                            <span className="text-sm font-medium">{option.label}</span>
                            {option.email && (
                              <span className="text-xs text-muted-foreground">{option.email}</span>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleUnselect(item)}
                          className="h-6 w-6 p-0 hover:bg-destructive hover:text-destructive-foreground"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              </CommandGroup>
            )}
            
            <CommandGroup className="overflow-hidden">
              {selectables.length > 0 && (
                <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground border-b">
                  Disponíveis ({selectables.length})
                </div>
              )}
              <div 
                className="max-h-64 overflow-y-auto overflow-x-hidden"
                style={{
                  scrollbarWidth: 'thin',
                  scrollbarColor: '#cbd5e1 #f1f5f9',
                  overflowY: 'scroll'
                }}
                onWheel={(e) => {
                  // Permitir scroll nativo
                  e.stopPropagation();
                }}
              >
                {/* Opções paginadas */}
                {selectables.map((option) => (
                  <CommandItem
                    key={option.value}
                    onSelect={() => {
                      onValueChange?.([...value, option.value]);
                      atualizarBusca("");
                    }}
                    className="flex items-center gap-2 cursor-pointer hover:bg-accent"
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        value.includes(option.value)
                          ? "opacity-100"
                          : "opacity-0"
                      )}
                    />
                    <User className="h-4 w-4 text-muted-foreground" />
                    <div className="flex flex-col flex-1">
                      <span className="font-medium">{option.label}</span>
                      {option.email && (
                        <span className="text-xs text-muted-foreground">
                          {option.email}
                        </span>
                      )}
                    </div>
                  </CommandItem>
                ))}
              </div>
              
              {/* Botão "Carregar Mais" - fora da área de scroll */}
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
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}