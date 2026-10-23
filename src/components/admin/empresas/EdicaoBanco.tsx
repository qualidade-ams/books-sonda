// Edição de um banco de horas (nível a mais na tela): identificação, contrato, regras de baseline
// e repasse, excedente, escopo e consumo entre bancos. Banco novo já nasce com baseline e repasse;
// no existente, mudar baseline ou repasse cria uma vigência nova (com histórico).
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, XCircle } from 'lucide-react';
import { Callout } from '@/components/ds/Callout';
import { Select } from '@/components/ds/Select';
import {
  Ajuda,
  CampoHoras,
  CampoNumero,
  Escolha,
  Interruptor,
  Rotulo,
  Secao,
  TelaEdicao,
} from '@/components/ds/Formulario';
import { campo } from '@/components/ds/estilos';
import { cn } from '@/lib/utils';
import { useUltimaAlteracao } from '@/hooks/useUltimaAlteracao';
import { converterHorasParaMinutos } from '@/utils/horasUtils';
import {
  cobertosPorOutros,
  deMes,
  elegiveisParaConsumo,
  escopoDaSelecao,
  novoBanco,
  paraMes,
  parametrosDoBanco,
  selecaoDoEscopo,
  type SelecaoEscopo,
} from '@/utils/bancosTela';
import type {
  BancoCadastro,
  NovaVigenciaInput,
  NovoBancoInput,
  ParametrosBanco,
  TipoContrato,
} from '@/types/bancosHorasCadastro';
import type { Catalogo } from '@/types/catalogo';
import type { EmpresaDetalhe } from '@/types/empresas';
import { ArvoreEscopo } from './ArvoreEscopo';
import { PERIODOS_COM_NOME, usePeriodoTexto } from './periodoTexto';
import { VigenciaComHistorico } from './VigenciasBanco';

const HORAS = /^\d{1,4}:[0-5]\d$/;
const percentualValido = (v: string) => v !== '' && Number(v) >= 0 && Number(v) <= 100;
const numeroOuNulo = (v: string) => (v === '' ? null : Number(v));
const TIPOS: TipoContrato[] = ['horas', 'tickets', 'ambos'];

/** Mês atual, dia 1 */
const mesDeHoje = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
};

export function EdicaoBanco({
  empresa,
  banco,
  bancos,
  catalogo,
  mesAtual = mesDeHoje(),
  onFechar,
  onCriar,
  onSalvar,
  onNovaVigencia,
}: {
  empresa: Pick<EmpresaDetalhe, 'id' | 'nomeAbreviado' | 'solucoes' | 'vigenciaInicio'>;
  /** null = banco novo */
  banco: BancoCadastro | null;
  /** Bancos da empresa, para conflito de escopo, nome repetido e consumo entre bancos */
  bancos: BancoCadastro[];
  catalogo: Catalogo;
  /** Início sugerido do banco novo (AAAA-MM-01) */
  mesAtual?: string;
  onFechar: () => void;
  /** Sem tratar o erro aqui: o aviso vem do hook e a tela continua aberta */
  onCriar: (input: NovoBancoInput) => Promise<void>;
  onSalvar: (bancoId: string, parametros: ParametrosBanco) => Promise<void>;
  onNovaVigencia: (input: NovaVigenciaInput) => Promise<void>;
}) {
  const { t } = useTranslation();
  const e = (chave: string, valores?: Record<string, unknown>) =>
    t(`empresasCadastro.edicaoBanco.${chave}`, valores);
  const periodoTexto = usePeriodoTexto();
  const ultimaAlteracao = useUltimaAlteracao(banco?.atualizadoEm, banco?.atualizadoPor);
  const novo = banco === null;
  const [p, setP] = useState<ParametrosBanco>(() =>
    banco ? parametrosDoBanco(banco) : novoBanco(bancos, mesAtual)
  );
  const [selecao, setSelecao] = useState<SelecaoEscopo>(() => selecaoDoEscopo(banco?.escopo ?? []));
  const [dias, setDias] = useState({
    inicio: String(p.diaInicioApuracao),
    fim: String(p.diaFimApuracao),
  });
  const [periodo, setPeriodo] = useState({
    meses: p.duracaoPeriodoMeses === null ? '' : String(p.duracaoPeriodoMeses),
    periodos: p.periodosAteZerar === null ? '' : String(p.periodosAteZerar),
  });
  // Só no banco novo: baseline e repasse iniciais
  const [inicial, setInicial] = useState({
    horas: '',
    tickets: '',
    credito: 'mensal' as 'mensal' | 'anual',
    mensal: '100',
    dentro: '',
    entre: '',
  });
  const [salvando, setSalvando] = useState(false);
  const mudar = (mudanca: Partial<ParametrosBanco>) => setP((x) => ({ ...x, ...mudanca }));

  const porPeriodo = p.repasseEspecial === 'por_periodo';
  const comHoras = p.tipoContrato !== 'tickets';
  const comTickets = p.tipoContrato !== 'horas';
  const outros = bancos.filter((b) => b.id !== banco?.id);
  const nomeRepetido =
    !!p.nome.trim() &&
    outros.some((b) => b.nome.trim().toLowerCase() === p.nome.trim().toLowerCase());
  const escopo = p.padrao ? [] : escopoDaSelecao(selecao);
  const filtroIc = p.padrao ? null : p.filtroIc;
  const semEscopo = !p.padrao && !escopo.length && !filtroIc?.valor.trim();
  const fimAntes = !!p.fimVigencia && p.fimVigencia < p.inicioVigencia;
  const diaInicio = Number(dias.inicio);
  const diaFim = Number(dias.fim);
  const diasValidos =
    dias.inicio !== '' &&
    dias.fim !== '' &&
    diaInicio >= 1 &&
    diaInicio <= 28 &&
    diaFim >= 0 &&
    diaFim <= 28;
  const periodoFecha =
    !porPeriodo || Number(periodo.meses) * Number(periodo.periodos) === p.periodoApuracao;
  const inicialValido =
    !novo ||
    ((!comHoras || HORAS.test(inicial.horas)) &&
      (!comTickets || (inicial.tickets !== '' && Number(inicial.tickets) >= 0)) &&
      percentualValido(inicial.mensal) &&
      (!porPeriodo || (percentualValido(inicial.dentro) && percentualValido(inicial.entre))));
  const podeSalvar =
    !!p.nome.trim() &&
    !nomeRepetido &&
    !semEscopo &&
    !fimAntes &&
    diasValidos &&
    periodoFecha &&
    inicialValido &&
    (!filtroIc || !!filtroIc.valor.trim()) &&
    !salvando;

  const elegiveis = elegiveisParaConsumo(
    bancos,
    banco?.id ?? null,
    p.tipoContrato,
    p.periodoApuracao
  );
  const algumElegivel = elegiveis.some((x) => x.motivo === null);

  const salvar = async () => {
    const parametros: ParametrosBanco = {
      ...p,
      escopo,
      filtroIc,
      diaInicioApuracao: diaInicio,
      diaFimApuracao: diaFim,
      duracaoPeriodoMeses: porPeriodo ? numeroOuNulo(periodo.meses) : null,
      periodosAteZerar: porPeriodo ? numeroOuNulo(periodo.periodos) : null,
      consomeOutrosBancos: p.consomeOutrosBancos && algumElegivel,
    };
    setSalvando(true);
    try {
      if (banco) await onSalvar(banco.id, parametros);
      else
        await onCriar({
          ...parametros,
          empresaId: empresa.id,
          baseline: {
            baselineMinutos: comHoras ? converterHorasParaMinutos(inicial.horas) : null,
            baselineTickets: comTickets ? Number(inicial.tickets) : null,
            credito: inicial.credito,
          },
          repasse: {
            percentualMensal: Number(inicial.mensal),
            percentualDentroPeriodo: porPeriodo ? Number(inicial.dentro) : null,
            percentualEntrePeriodos: porPeriodo ? Number(inicial.entre) : null,
          },
        });
      onFechar();
    } finally {
      setSalvando(false);
    }
  };

  return (
    <TelaEdicao
      voltarPara={empresa.nomeAbreviado}
      titulo={banco ? e('editar', { nome: banco.nome }) : p.padrao ? e('novoPadrao') : e('novo')}
      subtitulo={ultimaAlteracao}
      podeSalvar={podeSalvar}
      rotuloSalvar={novo ? e('criar') : undefined}
      onFechar={onFechar}
      onSalvar={salvar}
    >
      <Secao titulo={e('identificacao')}>
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Rotulo obrigatorio htmlFor="nome-banco">
                {e('nome')}
              </Rotulo>
              <input
                id="nome-banco"
                value={p.nome}
                onChange={(ev) => mudar({ nome: ev.target.value })}
                aria-invalid={nomeRepetido}
                className={cn(campo, nomeRepetido && 'border-ds-danger-fg')}
              />
              {nomeRepetido && (
                <p className="mt-1.5 text-xs text-ds-danger-fg">{e('nomeRepetido')}</p>
              )}
            </div>
            <div>
              <Rotulo htmlFor="descricao-banco">{e('descricao')}</Rotulo>
              <input
                id="descricao-banco"
                value={p.descricao ?? ''}
                onChange={(ev) => mudar({ descricao: ev.target.value || null })}
                className={campo}
              />
            </div>
          </div>
          {p.padrao && <Callout tom="info">{e('padraoAviso')}</Callout>}
          {banco?.espelhaLegado && <Callout tom="warning">{e('espelhaLegadoAviso')}</Callout>}
        </div>
      </Secao>

      <Secao titulo={e('contrato')}>
        <div className="space-y-4">
          <div>
            <Rotulo obrigatorio>{e('tipoContrato')}</Rotulo>
            <Escolha
              rotulo={e('tipoContrato')}
              opcoes={TIPOS.map((x) => ({
                valor: x,
                rotulo: t(`empresasCadastro.bancos.tipo.${x}`),
              }))}
              valor={p.tipoContrato}
              onChange={(v) => mudar({ tipoContrato: v })}
            />
          </div>
          <div className="grid items-start gap-4 sm:grid-cols-3">
            <div>
              <Rotulo obrigatorio htmlFor="periodo-banco">
                {e('periodoApuracao')}
              </Rotulo>
              <Select
                id="periodo-banco"
                value={p.periodoApuracao}
                onChange={(ev) => mudar({ periodoApuracao: Number(ev.target.value) })}
                className="w-full"
              >
                {[...new Set([...PERIODOS_COM_NOME, p.periodoApuracao])]
                  .sort((a, b) => a - b)
                  .map((n) => (
                    <option key={n} value={n}>
                      {periodoTexto(n)}
                    </option>
                  ))}
              </Select>
            </div>
            <div>
              <Rotulo obrigatorio htmlFor="inicio-banco">
                {e('inicioVigencia')}
              </Rotulo>
              <input
                id="inicio-banco"
                type="month"
                value={paraMes(p.inicioVigencia)}
                min={empresa.vigenciaInicio ? paraMes(empresa.vigenciaInicio) : undefined}
                onChange={(ev) =>
                  ev.target.value && mudar({ inicioVigencia: deMes(ev.target.value)! })
                }
                className={campo}
              />
            </div>
            <div>
              <Rotulo htmlFor="fim-banco">{e('fimVigencia')}</Rotulo>
              <input
                id="fim-banco"
                type="month"
                value={paraMes(p.fimVigencia)}
                min={paraMes(p.inicioVigencia) || undefined}
                onChange={(ev) => mudar({ fimVigencia: deMes(ev.target.value) })}
                aria-invalid={fimAntes}
                className={cn(campo, fimAntes && 'border-ds-danger-fg')}
              />
              {fimAntes ? (
                <p className="mt-1.5 text-xs text-ds-danger-fg">{e('fimAntes')}</p>
              ) : (
                !p.fimVigencia && <Ajuda>{e('fimOpcional')}</Ajuda>
              )}
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Rotulo htmlFor="dia-inicio">{e('diaInicio')}</Rotulo>
              <CampoNumero
                id="dia-inicio"
                min={1}
                max={28}
                valor={dias.inicio}
                onChange={(v) => setDias((d) => ({ ...d, inicio: v }))}
              />
            </div>
            <div>
              <Rotulo htmlFor="dia-fim">{e('diaFim')}</Rotulo>
              <CampoNumero
                id="dia-fim"
                min={0}
                max={28}
                valor={dias.fim}
                onChange={(v) => setDias((d) => ({ ...d, fim: v }))}
              />
            </div>
          </div>
        </div>
      </Secao>

      <Secao titulo={e('regras')}>
        <div className="space-y-4">
          {banco ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <VigenciaComHistorico
                tipo="baseline"
                banco={{ ...banco, ...p }}
                podeEditar
                onNovaVigencia={onNovaVigencia}
              />
              <VigenciaComHistorico
                tipo="repasse"
                banco={{ ...banco, ...p }}
                podeEditar
                onNovaVigencia={onNovaVigencia}
              />
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {comHoras && (
                <div>
                  <Rotulo obrigatorio htmlFor="baseline-horas">
                    {e('baselineHoras')}
                  </Rotulo>
                  <CampoHoras
                    id="baseline-horas"
                    valor={inicial.horas}
                    onChange={(v) => setInicial((x) => ({ ...x, horas: v }))}
                  />
                </div>
              )}
              {comTickets && (
                <div>
                  <Rotulo obrigatorio htmlFor="baseline-tickets">
                    {e('baselineTickets')}
                  </Rotulo>
                  <CampoNumero
                    id="baseline-tickets"
                    min={0}
                    valor={inicial.tickets}
                    onChange={(v) => setInicial((x) => ({ ...x, tickets: v }))}
                  />
                </div>
              )}
              <div>
                <Rotulo>{e('credito')}</Rotulo>
                <Escolha
                  rotulo={e('credito')}
                  opcoes={[
                    { valor: 'mensal', rotulo: e('creditoMensal') },
                    { valor: 'anual', rotulo: e('creditoAnual') },
                  ]}
                  valor={inicial.credito}
                  onChange={(v) => setInicial((x) => ({ ...x, credito: v }))}
                />
              </div>
              <div>
                <Rotulo obrigatorio htmlFor="repasse-mensal">
                  {e('repasseMensal')}
                </Rotulo>
                <CampoNumero
                  id="repasse-mensal"
                  min={0}
                  max={100}
                  valor={inicial.mensal}
                  onChange={(v) => setInicial((x) => ({ ...x, mensal: v }))}
                />
              </div>
            </div>
          )}
          <Interruptor
            ligado={porPeriodo}
            onChange={(v) => mudar({ repasseEspecial: v ? 'por_periodo' : 'nenhum' })}
            rotulo={e('repassePorPeriodo')}
          />
          {porPeriodo && (
            <div className="grid items-end gap-4 sm:grid-cols-4">
              <div>
                <Rotulo htmlFor="meses-periodo">{e('mesesPorPeriodo')}</Rotulo>
                <CampoNumero
                  id="meses-periodo"
                  min={1}
                  max={12}
                  valor={periodo.meses}
                  onChange={(v) => setPeriodo((x) => ({ ...x, meses: v }))}
                />
              </div>
              <div>
                <Rotulo htmlFor="periodos-zerar">{e('periodosAteZerar')}</Rotulo>
                <CampoNumero
                  id="periodos-zerar"
                  min={1}
                  max={12}
                  valor={periodo.periodos}
                  onChange={(v) => setPeriodo((x) => ({ ...x, periodos: v }))}
                />
              </div>
              {novo && (
                <>
                  <div>
                    <Rotulo htmlFor="dentro-periodo">{e('dentroPeriodo')}</Rotulo>
                    <CampoNumero
                      id="dentro-periodo"
                      min={0}
                      max={100}
                      valor={inicial.dentro}
                      onChange={(v) => setInicial((x) => ({ ...x, dentro: v }))}
                    />
                  </div>
                  <div>
                    <Rotulo htmlFor="entre-periodos">{e('entrePeriodos')}</Rotulo>
                    <CampoNumero
                      id="entre-periodos"
                      min={0}
                      max={100}
                      valor={inicial.entre}
                      onChange={(v) => setInicial((x) => ({ ...x, entre: v }))}
                    />
                  </div>
                </>
              )}
            </div>
          )}
          {!periodoFecha && periodo.meses !== '' && periodo.periodos !== '' && (
            <p className="text-xs text-ds-danger-fg">
              {e('periodoNaoFecha', { n: p.periodoApuracao })}
            </p>
          )}
        </div>
      </Secao>

      <Secao titulo={e('excedente')}>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Rotulo obrigatorio htmlFor="taxa-banco">
              {e('taxa')}
            </Rotulo>
            <Select
              id="taxa-banco"
              value={p.taxaProduto}
              onChange={(ev) =>
                mudar({ taxaProduto: ev.target.value as ParametrosBanco['taxaProduto'] })
              }
              className="w-full"
            >
              <option value="OUTROS">{t('empresasCadastro.bancos.taxa.OUTROS')}</option>
              <option value="GALLERY">{t('empresasCadastro.bancos.taxa.GALLERY')}</option>
            </Select>
          </div>
          <div>
            <Rotulo obrigatorio>{e('tipoHora')}</Rotulo>
            <Escolha
              rotulo={e('tipoHora')}
              opcoes={[
                { valor: 'excedente', rotulo: e('horaExcedente') },
                { valor: 'normal', rotulo: e('horaNormal') },
              ]}
              valor={p.taxaTipoHora}
              onChange={(v) => mudar({ taxaTipoHora: v })}
            />
          </div>
        </div>
      </Secao>

      {!p.padrao && (
        <Secao titulo={e('escopo')}>
          <div className="space-y-4">
            <ArvoreEscopo
              catalogo={catalogo}
              solucoesEmpresa={empresa.solucoes}
              cobertos={cobertosPorOutros(bancos, banco?.id ?? null)}
              selecao={selecao}
              onChange={setSelecao}
            />
            <div className="grid gap-4 sm:grid-cols-[180px_minmax(0,1fr)]">
              <div>
                <Rotulo htmlFor="filtro-operador">{e('itemConfiguracao')}</Rotulo>
                <Select
                  id="filtro-operador"
                  value={p.filtroIc?.operador ?? ''}
                  onChange={(ev) =>
                    mudar({
                      filtroIc: ev.target.value
                        ? {
                            operador: ev.target.value as 'contem' | 'igual',
                            valor: p.filtroIc?.valor ?? '',
                          }
                        : null,
                    })
                  }
                  className="w-full"
                >
                  <option value="">{e('semFiltro')}</option>
                  <option value="contem">{e('contem')}</option>
                  <option value="igual">{e('igual')}</option>
                </Select>
              </div>
              {p.filtroIc && (
                <div>
                  <Rotulo htmlFor="filtro-valor">{e('valor')}</Rotulo>
                  <input
                    id="filtro-valor"
                    value={p.filtroIc.valor}
                    onChange={(ev) =>
                      mudar({ filtroIc: { ...p.filtroIc!, valor: ev.target.value } })
                    }
                    placeholder={e('valorPlaceholder')}
                    className={campo}
                  />
                </div>
              )}
            </div>
            {semEscopo ? (
              <Callout tom="warning">{e('semEscopo')}</Callout>
            ) : (
              <Callout tom="success">{e('semConflito')}</Callout>
            )}
          </div>
        </Secao>
      )}

      <Secao titulo={e('consumo')}>
        <div className="space-y-3">
          <Interruptor
            ligado={p.consomeOutrosBancos && algumElegivel}
            onChange={(v) => mudar({ consomeOutrosBancos: v })}
            desabilitado={!algumElegivel}
            rotulo={e('consome')}
            descricao={algumElegivel ? undefined : e('nenhumElegivel')}
          />
          {elegiveis.length > 0 && (
            <ul className="space-y-1.5" aria-label={e('consumo')}>
              {elegiveis.map(({ banco: b, motivo }) => (
                <li key={b.id} className="flex items-center gap-2 text-sm">
                  {motivo === null ? (
                    <CheckCircle2
                      className="h-4 w-4 shrink-0 text-ds-success-fg"
                      aria-label={e('podeCeder')}
                    />
                  ) : (
                    <XCircle
                      className="h-4 w-4 shrink-0 text-ds-fg-muted"
                      aria-label={e('naoPodeCeder')}
                    />
                  )}
                  <span className={motivo ? 'text-ds-fg-muted' : 'text-ds-fg'}>
                    {b.nome}
                    {motivo === 'tipo' && (
                      <span>
                        {' '}
                        ·{' '}
                        {e('motivoTipo', {
                          tipo: t(`empresasCadastro.bancos.tipo.${b.tipoContrato}`),
                        })}
                      </span>
                    )}
                    {motivo === 'periodo' && (
                      <span>
                        {' '}
                        · {e('motivoPeriodo', { periodo: periodoTexto(b.periodoApuracao) })}
                      </span>
                    )}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </Secao>
    </TelaEdicao>
  );
}
