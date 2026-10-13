/**
 * Escolha das empresas da geração automática de books: todas as liberadas
 * ou somente as selecionadas. Usado no agendamento de books e no "Gerar books agora".
 */

import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useEmpresasBook } from '@/hooks/useSyncAgendamentos';

export type ModoEmpresasBooks = 'todas' | 'selecionadas';

interface SeletorEmpresasBooksProps {
  modo: ModoEmpresasBooks;
  empresaIds: string[];
  onChangeModo: (modo: ModoEmpresasBooks) => void;
  onChangeEmpresaIds: (empresaIds: string[]) => void;
  /** Chave i18n do erro de validação */
  erro?: string;
}

export function SeletorEmpresasBooks({ modo, empresaIds, onChangeModo, onChangeEmpresaIds, erro }: SeletorEmpresasBooksProps) {
  const { t } = useTranslation();
  const [busca, setBusca] = useState('');
  const selecionadas = modo === 'selecionadas';
  const { empresas, isLoading } = useEmpresasBook(selecionadas);

  const filtradas = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return termo ? empresas.filter((e) => e.nome.toLowerCase().includes(termo)) : empresas;
  }, [empresas, busca]);

  const alternar = (id: string, marcado: boolean) =>
    onChangeEmpresaIds(marcado ? [...empresaIds, id] : empresaIds.filter((e) => e !== id));

  return (
    <div className="space-y-3">
      <Label>{t('sincronizacaoSql.empresas.titulo')}</Label>
      <RadioGroup value={modo} onValueChange={(v) => onChangeModo(v as ModoEmpresasBooks)} className="gap-2">
        <div className="flex items-center gap-2">
          <RadioGroupItem value="todas" id="empresas-books-todas" />
          <Label htmlFor="empresas-books-todas" className="font-normal cursor-pointer">
            {t('sincronizacaoSql.empresas.todas')}
          </Label>
        </div>
        <div className="flex items-center gap-2">
          <RadioGroupItem value="selecionadas" id="empresas-books-selecionadas" />
          <Label htmlFor="empresas-books-selecionadas" className="font-normal cursor-pointer">
            {t('sincronizacaoSql.empresas.selecionadas')}
          </Label>
        </div>
      </RadioGroup>

      {selecionadas && (
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-gray-500">{t('sincronizacaoSql.empresas.ajuda')}</p>
            <span className="text-xs text-gray-500 shrink-0">
              {t('sincronizacaoSql.empresas.contagem', { count: empresaIds.length })}
            </span>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder={t('sincronizacaoSql.empresas.buscar')}
              className="pl-10 focus:ring-sonda-blue focus:border-sonda-blue"
            />
          </div>
          {/* relative: contém os inputs ocultos (absolutos) dos Checkbox do Radix */}
          <div className="relative max-h-56 overflow-y-auto rounded-md border border-gray-200 divide-y">
            {isLoading ? (
              <div className="flex justify-center py-4">
                <Loader2 className="h-5 w-5 animate-spin text-sonda-blue" />
              </div>
            ) : filtradas.length === 0 ? (
              <p className="py-4 text-center text-sm text-gray-500">{t('sincronizacaoSql.empresas.nenhuma')}</p>
            ) : (
              filtradas.map((empresa) => (
                <label key={empresa.id} className="flex items-center gap-2 px-3 py-2 text-sm cursor-pointer hover:bg-gray-50">
                  <Checkbox
                    checked={empresaIds.includes(empresa.id)}
                    onCheckedChange={(v) => alternar(empresa.id, !!v)}
                    aria-label={empresa.nome}
                  />
                  <span className="flex-1">{empresa.nome}</span>
                </label>
              ))
            )}
          </div>
        </div>
      )}
      {erro && <p className="text-sm text-red-500">{t(erro)}</p>}
    </div>
  );
}
