/**
 * Campo de Grupo com busca do formulário de pesquisas
 *
 * Extraído do render do FormField em PesquisaForm: o estado da busca precisa
 * viver num componente, não dentro do callback de render.
 *
 * @module components/admin/pesquisas-satisfacao/CampoGrupoComBusca
 */

import { useMemo, useState } from 'react';
import type { ControllerFieldState, ControllerRenderProps } from 'react-hook-form';
import { Check, ChevronsUpDown } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { FormControl, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { cn } from '@/lib/utils';

interface CampoGrupoComBuscaProps {
  field: ControllerRenderProps<any, any>;
  fieldState: ControllerFieldState;
  categorias: Array<{ value: string; label: string }>;
  label: string;
}

export function CampoGrupoComBusca({
  field,
  fieldState,
  categorias,
  label,
}: CampoGrupoComBuscaProps) {
  // Estado local para controlar a busca
  const [searchGrupo, setSearchGrupo] = useState('');

  // Filtrar grupos baseado na busca
  const gruposFiltrados = useMemo(() => {
    if (!searchGrupo.trim()) {
      return categorias;
    }

    const termoBusca = searchGrupo.toLowerCase().trim();

    return categorias.filter((grupo) => {
      const labelLower = grupo.label.toLowerCase();

      // Busca genérica: verifica se o termo aparece em qualquer parte do label
      if (labelLower.includes(termoBusca)) return true;

      // Buscar por início de palavras individuais
      const palavras = labelLower.split(/[\s\-&]+/);

      return palavras.some((palavra) => palavra.startsWith(termoBusca));
    });
  }, [searchGrupo, categorias]);

  return (
    <FormItem className="flex flex-col">
      <FormLabel>
        {label} <span className="text-foreground">*</span>
      </FormLabel>
      <Popover>
        <PopoverTrigger asChild>
          <FormControl>
            <Button
              variant="outline"
              role="combobox"
              className={cn(
                'w-full justify-between',
                !field.value && 'text-muted-foreground',
                fieldState.error && 'border-red-500 focus:border-red-500'
              )}
            >
              {field.value
                ? categorias.find((grupo) => grupo.value === field.value)?.label
                : 'Selecione o grupo'}
              <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </Button>
          </FormControl>
        </PopoverTrigger>
        <PopoverContent className="w-full p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Buscar grupo..."
              value={searchGrupo}
              onValueChange={setSearchGrupo}
            />
            <CommandList>
              <CommandEmpty>Nenhum grupo encontrado</CommandEmpty>
              <CommandGroup>
                {gruposFiltrados.map((grupo) => (
                  <CommandItem
                    key={grupo.value}
                    value={grupo.value}
                    onSelect={() => {
                      field.onChange(grupo.value);
                      setSearchGrupo('');
                    }}
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4',
                        grupo.value === field.value ? 'opacity-100' : 'opacity-0'
                      )}
                    />
                    {grupo.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      <FormMessage />
    </FormItem>
  );
}
