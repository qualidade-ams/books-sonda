import { useEffect, useId, useMemo, useRef, useState } from 'react';
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
import {
  useDestinosDoRequerimento,
  useProdutosDosModulosLegados,
} from '@/hooks/useDestinosDoRequerimento';
import {
  chaveDestino,
  descontaDoBanco,
  lerDestino,
  produtosDoRequerimento,
  type ProdutoDoRequerimento,
} from '@/utils/bancoDoRequerimento';
import type { Destino } from '@/services/requerimentoBancoService';

interface CampoBancoRequerimentoProps {
  empresaId: string | undefined;
  /** Na edição: traz o produto/módulo já escolhido */
  requerimentoId?: string;
  tipoCobranca: string;
  horasAnaliseEF?: string | number;
  /** MM/AAAA; sem ele, vale o mês atual */
  mesCobranca?: string;
  /** Campo Módulo antigo (Comex, Comply…): sugere o produto no lançamento novo */
  moduloLegado?: string;
  /** "produto|módulo" (ver chaveDestino); só vem preenchido com a escolha completa */
  valor?: string;
  onChange: (destino: string | undefined) => void;
  mostrarErro?: boolean;
}

/** O destino existe entre os produtos do mês: produto e, se ele pedir, um dos módulos */
function destinoValido(produtos: ProdutoDoRequerimento[], d: Destino | null): boolean {
  const p = d && produtos.find((x) => x.produtoId === d.produtoId);
  if (!p) return false;
  if (d.moduloId === null) return !p.precisaModulo;
  return p.modulos.some((m) => m.moduloId === d.moduloId);
}

/**
 * Produto (e módulo, quando o banco do produto é por módulo) do requerimento.
 * O banco que recebe o desconto sai dessa escolha e nunca é o Banco padrão.
 * Só aparece para empresa liberada e tipo que desconta do banco; no legado, o
 * formulário fica como antes.
 */
export function CampoBancoRequerimento({
  empresaId,
  requerimentoId,
  tipoCobranca,
  horasAnaliseEF,
  mesCobranca,
  moduloLegado,
  valor,
  onChange,
  mostrarErro = false,
}: CampoBancoRequerimentoProps) {
  const { t } = useTranslation();
  const id = useId();
  const { opcoes, liberada, escolhido } = useDestinosDoRequerimento(empresaId, requerimentoId);
  const visivel = liberada && descontaDoBanco(tipoCobranca, horasAnaliseEF);
  const dePara = useProdutosDosModulosLegados(visivel && !requerimentoId && !!moduloLegado);
  const produtos = useMemo(
    () => produtosDoRequerimento(opcoes, mesCobranca),
    [opcoes, mesCobranca]
  );

  // Produto escolhido que ainda espera o módulo (o valor só sai com a escolha completa)
  const [produtoLocal, setProdutoLocal] = useState<string | undefined>();
  const aplicouInicial = useRef(false);

  const destino = lerDestino(valor);
  const produtoId = destino?.produtoId ?? produtoLocal;
  const produto = produtos.find((p) => p.produtoId === produtoId);

  useEffect(() => {
    if (!visivel) {
      if (valor) onChange(undefined);
      return;
    }
    if (valor) {
      if (!destinoValido(produtos, lerDestino(valor))) onChange(undefined);
      return;
    }
    if (aplicouInicial.current || produtoLocal || produtos.length === 0) return;

    // Edição: o que foi escolhido antes
    if (escolhido) {
      aplicouInicial.current = true;
      if (destinoValido(produtos, escolhido))
        onChange(chaveDestino(escolhido.produtoId, escolhido.moduloId));
      return;
    }
    // Lançamento novo: o produto que o campo Módulo antigo indica
    const sugerido = moduloLegado ? dePara[moduloLegado] : undefined;
    if (!sugerido) return;
    aplicouInicial.current = true;
    const p = produtos.find((x) => x.produtoId === sugerido.produtoId);
    if (!p) return;
    if (!p.precisaModulo) onChange(chaveDestino(p.produtoId, null));
    else if (destinoValido(produtos, sugerido))
      onChange(chaveDestino(p.produtoId, sugerido.moduloId));
    else setProdutoLocal(p.produtoId);
  }, [visivel, valor, produtos, produtoLocal, escolhido, moduloLegado, dePara, onChange]);

  if (!visivel) return null;

  const semProduto = produtos.length === 0;
  // Nenhum banco não padrão com produto cadastrado, em mês nenhum
  const semCadastro = opcoes.length === 0;

  const escolherProduto = (novo: string) => {
    const p = produtos.find((x) => x.produtoId === novo);
    setProdutoLocal(novo);
    if (!p || p.precisaModulo) onChange(undefined);
    else onChange(chaveDestino(novo, null));
  };

  const banco =
    destino && produto
      ? produto.precisaModulo
        ? produto.modulos.find((m) => m.moduloId === destino.moduloId)?.banco
        : produto.banco
      : undefined;
  const erro = mostrarErro && !valor;

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor={`${id}-produto`}>
          {t('reqForm.bankProduct')} <span className="text-red-500">*</span>
        </Label>
        <Select value={produtoId ?? ''} onValueChange={escolherProduto} disabled={semProduto}>
          <SelectTrigger
            id={`${id}-produto`}
            aria-label={t('reqForm.bankProduct')}
            className={cn(
              erro && !produto && 'border-red-500 focus:ring-red-500 focus:border-red-500'
            )}
          >
            <SelectValue
              placeholder={
                semProduto ? t('reqForm.bankNoneInMonth') : t('reqForm.bankProductPlaceholder')
              }
            />
          </SelectTrigger>
          <SelectContent>
            {produtos.map((p) => (
              <SelectItem key={p.produtoId} value={p.produtoId}>
                {p.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {produto?.precisaModulo && (
        <div className="space-y-2">
          <Label htmlFor={`${id}-modulo`}>
            {t('reqForm.bankModule')} <span className="text-red-500">*</span>
          </Label>
          <Select
            value={destino?.moduloId ?? ''}
            onValueChange={(modulo) => onChange(chaveDestino(produto.produtoId, modulo))}
          >
            <SelectTrigger
              id={`${id}-modulo`}
              aria-label={t('reqForm.bankModule')}
              className={cn(erro && 'border-red-500 focus:ring-red-500 focus:border-red-500')}
            >
              <SelectValue placeholder={t('reqForm.bankModulePlaceholder')} />
            </SelectTrigger>
            <SelectContent>
              {produto.modulos.map((m) => (
                <SelectItem key={m.moduloId} value={m.moduloId}>
                  {m.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {semCadastro ? (
        // Só o Banco padrão (ou bancos sem escopo): o requerimento nunca vai para o padrão
        <p role="alert" className="text-sm text-amber-700">
          {t('reqForm.bankNotRegistered')}
        </p>
      ) : banco ? (
        <p className="text-xs text-muted-foreground">
          {t('reqForm.bankDiscountsFrom', { banco: banco.nome })}
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">{t('reqForm.bankHelp')}</p>
      )}
      {erro && !semCadastro && (
        <p className="text-sm text-red-500">
          {produto?.precisaModulo ? t('reqForm.bankModuleRequired') : t('reqForm.bankRequired')}
        </p>
      )}
    </div>
  );
}
