import { useEffect, useMemo, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useBancosDoRequerimento } from '@/hooks/useBancosDoRequerimento';
import { bancosVigentesNoMes, descontaDoBanco } from '@/utils/bancoDoRequerimento';

interface CampoBancoRequerimentoProps {
  empresaId: string | undefined;
  /** Na edição: traz o banco já escolhido */
  requerimentoId?: string;
  tipoCobranca: string;
  horasAnaliseEF?: string | number;
  /** MM/AAAA; sem ele, vale o mês atual */
  mesCobranca?: string;
  valor?: string;
  onChange: (bancoId: string | undefined) => void;
  mostrarErro?: boolean;
}

/**
 * Banco que recebe o desconto do requerimento. Só aparece para empresa
 * liberada e tipo que desconta do banco; no legado, o formulário fica como antes.
 */
export function CampoBancoRequerimento({
  empresaId,
  requerimentoId,
  tipoCobranca,
  horasAnaliseEF,
  mesCobranca,
  valor,
  onChange,
  mostrarErro = false,
}: CampoBancoRequerimentoProps) {
  const { t } = useTranslation();
  const { bancos, liberada, bancoEscolhidoId } = useBancosDoRequerimento(empresaId, requerimentoId);
  const visivel = liberada && descontaDoBanco(tipoCobranca, horasAnaliseEF);
  const vigentes = useMemo(() => bancosVigentesNoMes(bancos, mesCobranca), [bancos, mesCobranca]);
  const aplicouEscolhido = useRef(false);

  useEffect(() => {
    if (!visivel) {
      if (valor) onChange(undefined);
      return;
    }
    if (valor && !vigentes.some((b) => b.id === valor)) {
      onChange(undefined);
      return;
    }
    if (!valor && !aplicouEscolhido.current && bancoEscolhidoId) {
      aplicouEscolhido.current = true;
      if (vigentes.some((b) => b.id === bancoEscolhidoId)) onChange(bancoEscolhidoId);
    }
  }, [visivel, valor, vigentes, bancoEscolhidoId, onChange]);

  if (!visivel) return null;

  const semBanco = vigentes.length === 0;

  return (
    <div className="space-y-2">
      <Label>
        {t('reqForm.bank')} <span className="text-red-500">*</span>
      </Label>
      <Select value={valor ?? ''} onValueChange={(id) => onChange(id)} disabled={semBanco}>
        <SelectTrigger
          className={cn(
            mostrarErro && !valor && 'border-red-500 focus:ring-red-500 focus:border-red-500'
          )}
        >
          <SelectValue
            placeholder={semBanco ? t('reqForm.bankNoneInMonth') : t('reqForm.bankPlaceholder')}
          />
        </SelectTrigger>
        <SelectContent>
          {vigentes.map((b) => (
            <SelectItem key={b.id} value={b.id}>
              {b.nome}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-xs text-muted-foreground">{t('reqForm.bankHelp')}</p>
      {mostrarErro && !valor && <p className="text-sm text-red-500">{t('reqForm.bankRequired')}</p>}
    </div>
  );
}
