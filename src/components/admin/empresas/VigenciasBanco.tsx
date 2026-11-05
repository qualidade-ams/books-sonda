// Baseline e repasse do banco na edição: o valor vigente, o histórico das vigências, a vigência
// nova, que começa no dia 1 do mês escolhido e fecha a anterior, e a correção de qualquer
// vigência (valores e meses; a vizinha acompanha a fronteira). Tudo pela função do banco, com
// o motivo.
import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChevronRight, Pencil, Plus } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ds/Button';
import { ConfirmDialog } from '@/components/ds/ConfirmDialog';
import { CampoHoras, CampoNumero, Escolha, Rotulo } from '@/components/ds/Formulario';
import { campo } from '@/components/ds/estilos';
import { formatarHoras } from '@/components/ds/horas';
import { formatarDataHora } from '@/hooks/useUltimaAlteracao';
import { converterHorasParaMinutos } from '@/utils/horasUtils';
import { deMes, mesTexto, vigente } from '@/utils/bancosTela';
import type {
  BancoCadastro,
  EditarVigenciaInput,
  NovaVigenciaInput,
  VigenciaBaselineCadastro,
  VigenciaRepasseCadastro,
} from '@/types/bancosHorasCadastro';
import { useTextoVigencias } from './textoVigencias';

type TipoVigencia = 'baseline' | 'repasse';
type Vigencia = VigenciaBaselineCadastro | VigenciaRepasseCadastro;

/** Vigência em correção e a posição dela no histórico */
interface Edicao {
  vigencia: Vigencia;
  /** A primeira começa sempre no início do banco */
  primeira: boolean;
  /** A última fica em aberto */
  ultima: boolean;
}

const HORAS = /^\d{1,4}:[0-5]\d$/;
const percentualValido = (v: string) => v !== '' && Number(v) >= 0 && Number(v) <= 100;

/** Campos do diálogo: na vigência nova, pré-preenchidos com a vigente; na correção, com ela */
function useFormulario(tipo: TipoVigencia, banco: BancoCadastro, edicao: Edicao | undefined) {
  const base = (edicao?.vigencia ?? vigente(banco.baselines)) as
    VigenciaBaselineCadastro | undefined;
  const rep = (edicao?.vigencia ?? vigente(banco.repasses)) as VigenciaRepasseCadastro | undefined;
  const deBaseline = tipo === 'baseline' || !edicao;
  const deRepasse = tipo === 'repasse' || !edicao;
  return useState({
    mes: edicao ? edicao.vigencia.dataInicio.slice(0, 7) : '',
    ate: edicao?.vigencia.dataFim ? edicao.vigencia.dataFim.slice(0, 7) : '',
    horas: deBaseline && base?.baselineMinutos != null ? formatarHoras(base.baselineMinutos) : '',
    tickets: deBaseline && base?.baselineTickets != null ? String(base.baselineTickets) : '',
    credito: (deBaseline && base?.credito) || ('mensal' as 'mensal' | 'anual'),
    mensal: deRepasse && rep ? String(rep.percentualMensal) : '100',
    dentro:
      deRepasse && rep?.percentualDentroPeriodo != null ? String(rep.percentualDentroPeriodo) : '',
    entre:
      deRepasse && rep?.percentualEntrePeriodos != null ? String(rep.percentualEntrePeriodos) : '',
    tipo,
  });
}

function DialogoVigencia({
  tipo,
  banco,
  rotulo,
  edicao,
  onFechar,
  onNovaVigencia,
  onEditarVigencia,
}: {
  tipo: TipoVigencia;
  banco: BancoCadastro;
  rotulo: string;
  /** Sem ela, vigência nova */
  edicao?: Edicao;
  onFechar: () => void;
  onNovaVigencia: (input: NovaVigenciaInput) => Promise<void>;
  onEditarVigencia?: (input: EditarVigenciaInput) => Promise<void>;
}) {
  const { t } = useTranslation();
  const e = (chave: string, valores?: Record<string, unknown>) =>
    t(`empresasCadastro.edicaoBanco.${chave}`, valores);
  const id = useId();
  const [f, setF] = useFormulario(tipo, banco, edicao);
  const [processando, setProcessando] = useState(false);
  const mudar = (mudanca: Partial<typeof f>) => setF((x) => ({ ...x, ...mudanca }));
  const comHoras = banco.tipoContrato !== 'tickets';
  const comTickets = banco.tipoContrato !== 'horas';
  const porPeriodo = banco.repasseEspecial === 'por_periodo';
  const comFim = !!edicao && !edicao.ultima;

  const mesesValidos = !!f.mes && (!comFim || (!!f.ate && f.ate >= f.mes));
  const valido =
    mesesValidos &&
    (tipo === 'baseline'
      ? (!comHoras || HORAS.test(f.horas)) &&
        (!comTickets || (f.tickets !== '' && Number(f.tickets) >= 0))
      : percentualValido(f.mensal) &&
        (!porPeriodo || (percentualValido(f.dentro) && percentualValido(f.entre))));

  const registrar = async (motivo?: string) => {
    const desde = deMes(f.mes)!;
    const texto = motivo ?? '';
    const valoresBaseline = {
      baselineMinutos: comHoras ? converterHorasParaMinutos(f.horas) : null,
      baselineTickets: comTickets ? Number(f.tickets) : null,
      credito: f.credito,
    };
    const valoresRepasse = {
      percentualMensal: Number(f.mensal),
      percentualDentroPeriodo: porPeriodo ? Number(f.dentro) : null,
      percentualEntrePeriodos: porPeriodo ? Number(f.entre) : null,
    };
    setProcessando(true);
    try {
      if (edicao && onEditarVigencia) {
        const comum = {
          vigenciaId: edicao.vigencia.id,
          desde,
          ate: comFim ? deMes(f.ate) : null,
          motivo: texto,
        };
        await onEditarVigencia(
          tipo === 'baseline'
            ? { ...comum, tipo, valores: valoresBaseline }
            : { ...comum, tipo, valores: valoresRepasse }
        );
      } else {
        const comum = { bancoId: banco.id, desde, motivo: texto };
        await onNovaVigencia(
          tipo === 'baseline'
            ? { ...comum, tipo, valores: valoresBaseline }
            : { ...comum, tipo, valores: valoresRepasse }
        );
      }
      onFechar();
    } finally {
      setProcessando(false);
    }
  };

  return (
    <ConfirmDialog
      aberto
      onOpenChange={(v) => !v && onFechar()}
      titulo={
        edicao
          ? e('editarVigenciaTitulo', { rotulo: rotulo.toLowerCase() })
          : e('novaVigencia', { rotulo: rotulo.toLowerCase() })
      }
      descricao={edicao ? e('editarVigenciaDescricao') : e('novaVigenciaDescricao')}
      rotuloConfirmar={edicao ? e('salvarVigencia') : e('registrar')}
      confirmarDesabilitado={!valido}
      processando={processando}
      justificativa={{ rotulo: e('motivoVigencia'), placeholder: e('motivoVigenciaPlaceholder') }}
      onConfirmar={registrar}
    >
      {edicao && <p className="mb-4 text-xs text-ds-fg-muted">{e('edicaoMesFechado')}</p>}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Rotulo obrigatorio htmlFor={`${id}-mes`}>
            {e('aPartirDe')}
          </Rotulo>
          <input
            id={`${id}-mes`}
            type="month"
            value={f.mes}
            min={banco.inicioVigencia.slice(0, 7)}
            disabled={edicao?.primeira}
            onChange={(ev) => mudar({ mes: ev.target.value })}
            className={campo}
          />
        </div>
        {edicao &&
          (comFim ? (
            <div>
              <Rotulo obrigatorio htmlFor={`${id}-ate`}>
                {e('ateMes')}
              </Rotulo>
              <input
                id={`${id}-ate`}
                type="month"
                value={f.ate}
                min={f.mes || undefined}
                onChange={(ev) => mudar({ ate: ev.target.value })}
                className={campo}
              />
            </div>
          ) : (
            <div>
              <Rotulo>{e('ateMes')}</Rotulo>
              <p className="flex h-11 items-center text-sm text-ds-fg-muted md:h-9">
                {e('emAberto')}
              </p>
            </div>
          ))}
        {tipo === 'baseline' ? (
          <>
            {comHoras && (
              <div>
                <Rotulo obrigatorio htmlFor={`${id}-horas`}>
                  {e('baselineHoras')}
                </Rotulo>
                <CampoHoras
                  id={`${id}-horas`}
                  valor={f.horas}
                  onChange={(v) => mudar({ horas: v })}
                />
              </div>
            )}
            {comTickets && (
              <div>
                <Rotulo obrigatorio htmlFor={`${id}-tickets`}>
                  {e('baselineTickets')}
                </Rotulo>
                <CampoNumero
                  id={`${id}-tickets`}
                  min={0}
                  valor={f.tickets}
                  onChange={(v) => mudar({ tickets: v })}
                />
              </div>
            )}
            <div className="sm:col-span-2">
              <Rotulo>{e('credito')}</Rotulo>
              <Escolha
                rotulo={e('credito')}
                opcoes={[
                  { valor: 'mensal', rotulo: e('creditoMensal') },
                  { valor: 'anual', rotulo: e('creditoAnual') },
                ]}
                valor={f.credito}
                onChange={(v) => mudar({ credito: v })}
              />
            </div>
          </>
        ) : (
          <>
            <div>
              <Rotulo obrigatorio htmlFor={`${id}-mensal`}>
                {e('repasseMensal')}
              </Rotulo>
              <CampoNumero
                id={`${id}-mensal`}
                min={0}
                max={100}
                valor={f.mensal}
                onChange={(v) => mudar({ mensal: v })}
              />
            </div>
            {porPeriodo && (
              <>
                <div>
                  <Rotulo obrigatorio htmlFor={`${id}-dentro`}>
                    {e('dentroPeriodo')}
                  </Rotulo>
                  <CampoNumero
                    id={`${id}-dentro`}
                    min={0}
                    max={100}
                    valor={f.dentro}
                    onChange={(v) => mudar({ dentro: v })}
                  />
                </div>
                <div>
                  <Rotulo obrigatorio htmlFor={`${id}-entre`}>
                    {e('entrePeriodos')}
                  </Rotulo>
                  <CampoNumero
                    id={`${id}-entre`}
                    min={0}
                    max={100}
                    valor={f.entre}
                    onChange={(v) => mudar({ entre: v })}
                  />
                </div>
              </>
            )}
          </>
        )}
      </div>
    </ConfirmDialog>
  );
}

export function VigenciaComHistorico({
  tipo,
  banco,
  podeEditar,
  onNovaVigencia,
  onEditarVigencia,
}: {
  tipo: TipoVigencia;
  banco: BancoCadastro;
  podeEditar: boolean;
  onNovaVigencia: (input: NovaVigenciaInput) => Promise<void>;
  /** Sem ela, as vigências não são corrigidas aqui */
  onEditarVigencia?: (input: EditarVigenciaInput) => Promise<void>;
}) {
  const { t, i18n } = useTranslation();
  const e = (chave: string, valores?: Record<string, unknown>) =>
    t(`empresasCadastro.edicaoBanco.${chave}`, valores);
  const texto = useTextoVigencias(banco);
  const [aberto, setAberto] = useState(false);
  // undefined = fechado; null = vigência nova; Edicao = correção
  const [dialogo, setDialogo] = useState<Edicao | null | undefined>(undefined);
  const rotulo = e(tipo);
  const lista: Vigencia[] = tipo === 'baseline' ? banco.baselines : banco.repasses;
  const historico = [...lista].sort((a, b) => b.dataInicio.localeCompare(a.dataInicio));
  const atual = vigente(lista);
  const valorDe = (v: Vigencia | undefined) =>
    tipo === 'baseline'
      ? texto.baseline(v as VigenciaBaselineCadastro)
      : texto.repasse(v as VigenciaRepasseCadastro);
  const corrige = podeEditar && !!onEditarVigencia;

  return (
    <div>
      <Rotulo>{rotulo}</Rotulo>
      <div className="flex h-11 items-center justify-between gap-3 rounded-lg border border-ds-border bg-ds-bg-subtle px-3 md:h-9">
        <span className="min-w-0 truncate whitespace-nowrap text-sm text-ds-fg">
          <span className="font-medium tabular-nums">{valorDe(atual)}</span>
          {atual && (
            <span className="text-xs text-ds-fg-muted">
              {' '}
              {e('desde', { mes: mesTexto(atual.dataInicio) })}
            </span>
          )}
        </span>
        <Popover open={aberto} onOpenChange={setAberto}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className="inline-flex shrink-0 items-center gap-0.5 text-xs font-medium text-ds-fg-accent hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-focus"
            >
              {e('gerenciar')} <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </PopoverTrigger>
          <PopoverContent
            data-ds="v2"
            align="end"
            className="w-80 border-ds-border bg-ds-bg-raised p-0 font-ds-sans text-ds-fg"
          >
            <div className="flex items-center justify-between border-b border-ds-border px-4 py-3">
              <p className="text-sm font-medium">
                {e('vigenciasDe', { rotulo: rotulo.toLowerCase() })}
              </p>
              {podeEditar && (
                <Button
                  tamanho="sm"
                  variante="fantasma"
                  onClick={() => {
                    setAberto(false);
                    setDialogo(null);
                  }}
                >
                  <Plus /> {e('nova')}
                </Button>
              )}
            </div>
            <ol
              className="max-h-72 divide-y divide-ds-border overflow-y-auto"
              aria-label={e('vigenciasDe', { rotulo })}
            >
              {historico.map((v, i) => (
                <li key={v.id} className="flex items-start justify-between gap-2 px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-sm">
                      <span className="font-medium tabular-nums">{valorDe(v)}</span>
                      <span className="text-ds-fg-muted">
                        {' · '}
                        {v.dataFim
                          ? e('ate', { inicio: mesTexto(v.dataInicio), fim: mesTexto(v.dataFim) })
                          : e('emDiante', { inicio: mesTexto(v.dataInicio) })}
                      </span>
                    </p>
                    <p className="mt-0.5 text-xs text-ds-fg-muted">
                      {e('registradaPor', {
                        motivo: v.motivo || e('semMotivo'),
                        quando: formatarDataHora(v.atualizadoEm, i18n.language),
                      })}
                    </p>
                  </div>
                  {corrige && (
                    <button
                      type="button"
                      aria-label={e('editarVigencia', { inicio: mesTexto(v.dataInicio) })}
                      title={e('editarVigencia', { inicio: mesTexto(v.dataInicio) })}
                      onClick={() => {
                        setAberto(false);
                        setDialogo({
                          vigencia: v,
                          primeira: i === historico.length - 1,
                          ultima: i === 0,
                        });
                      }}
                      className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-ds-fg-muted hover:bg-ds-bg-subtle hover:text-ds-fg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-focus"
                    >
                      <Pencil className="h-3.5 w-3.5" aria-hidden />
                    </button>
                  )}
                </li>
              ))}
            </ol>
          </PopoverContent>
        </Popover>
      </div>
      {dialogo !== undefined && (
        <DialogoVigencia
          key={dialogo?.vigencia.id ?? 'nova'}
          tipo={tipo}
          banco={banco}
          rotulo={rotulo}
          edicao={dialogo ?? undefined}
          onFechar={() => setDialogo(undefined)}
          onNovaVigencia={onNovaVigencia}
          onEditarVigencia={onEditarVigencia}
        />
      )}
    </div>
  );
}
