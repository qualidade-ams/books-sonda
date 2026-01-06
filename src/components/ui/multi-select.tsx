import * as React from "react"
import { Check, ChevronDown, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export interface Option {
  label: string
  value: string
}

interface MultiSelectProps {
  options: Option[]
  selected: string[]
  onChange: (selected: string[]) => void
  placeholder?: string
  className?: string
  disabled?: boolean
  maxCount?: number
  modalPopover?: boolean
  asChild?: boolean
  side?: "top" | "bottom" | "left" | "right"
}

export function MultiSelect({
  options,
  selected,
  onChange,
  placeholder = "Selecione itens...",
  className,
  disabled = false,
  maxCount = 3,
  modalPopover = false,
  asChild = false,
  side = "bottom",
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false)
  const [search, setSearch] = React.useState("")

  const handleUnselect = (item: string) => {
    onChange(selected.filter((i) => i !== item))
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const input = e.target as HTMLInputElement
    if (input.value === "" && selected.length > 0) {
      if (e.key === "Delete" || e.key === "Backspace") {
        onChange(selected.slice(0, -1))
      }
    }
    // Escape closes the popover
    if (e.key === "Escape") {
      setOpen(false)
    }
  }

  const selectables = options.filter((option) => !selected.includes(option.value))

  return (
    <Popover open={open} onOpenChange={setOpen} modal={modalPopover}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "w-full justify-between text-left font-normal",
            className
          )}
          disabled={disabled}
        >
          <div className="flex gap-1 flex-wrap">
            {selected.length === 0 && (
              <span className="text-muted-foreground">{placeholder}</span>
            )}
            {selected.length > 0 && selected.length <= maxCount && (
              <>
                {selected.map((item) => {
                  const option = options.find((option) => option.value === item)
                  if (!option) return null
                  return (
                    <Badge
                      variant="secondary"
                      key={item}
                      className="mr-1 mb-1"
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        handleUnselect(item)
                      }}
                    >
                      {option.label}
                      <button
                        className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            handleUnselect(item)
                          }
                        }}
                        onMouseDown={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                        }}
                        onClick={(e) => {
                          e.preventDefault()
                          e.stopPropagation()
                          handleUnselect(item)
                        }}
                      >
                        <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                      </button>
                    </Badge>
                  )
                })}
              </>
            )}
            {selected.length > maxCount && (
              <Badge
                variant="secondary"
                className="mr-1 mb-1"
              >
                {selected.length} selecionados
              </Badge>
            )}
          </div>
          <ChevronDown className="h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-full p-0"
        side={side}
        align="start"
      >
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Buscar..."
            value={search}
            onValueChange={setSearch}
            onKeyDown={handleKeyDown}
          />
          <CommandList>
            <CommandEmpty>Nenhum item encontrado.</CommandEmpty>
            <CommandGroup className="max-h-64 overflow-auto">
              {/* Opção "Todos" */}
              <CommandItem
                onSelect={() => {
                  if (selected.length === options.length) {
                    // Se todos estão selecionados, desselecionar todos
                    onChange([])
                  } else {
                    // Se nem todos estão selecionados, selecionar todos
                    onChange(options.map(option => option.value))
                  }
                  setSearch("")
                }}
              >
                <Check
                  className={cn(
                    "mr-2 h-4 w-4",
                    selected.length === options.length
                      ? "opacity-100"
                      : "opacity-0"
                  )}
                />
                Todos os {placeholder.toLowerCase().includes('status') ? 'status' : 'produtos'}
              </CommandItem>
              
              {/* Separador visual */}
              <div className="px-2 py-1">
                <div className="h-px bg-border" />
              </div>
              
              {/* Opções individuais */}
              {selectables.map((option) => (
                <CommandItem
                  key={option.value}
                  onSelect={() => {
                    onChange([...selected, option.value])
                    setSearch("")
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      selected.includes(option.value)
                        ? "opacity-100"
                        : "opacity-0"
                    )}
                  />
                  {option.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}