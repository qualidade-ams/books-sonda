// Aba Informações do detalhe da empresa: organizações do Aranda, perfil (ramos) e Contrato
// FISCAL (só para quem contrata FISCAIS, RN-28). Editada direto na aba, com a barra do rodapé.
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';
import { Card } from '@/components/ds/Card';
import { Button } from '@/components/ds/Button';
import { Select } from '@/components/ds/Select';
import { useDicas } from '@/components/ds/Dicas';
import {
  Ajuda,
  BarraRodape,
  CampoHoras,
  CampoNumero,
  Chip,
  Escolha,
  InfoDica,
  Rotulo,
} from '@/components/ds/Formulario';
import { campo } from '@/components/ds/estilos';
import { formatarHoras } from '@/components/ds/horas';
import { cn } from '@/lib/utils';
import {
  horasDoRascunhoValidas,
  informacoesParaSalvar,
  rascunhoInformacoes,
  type RascunhoInformacoes,
} from '@/utils/empresasTela';
import type {
  ContratoFiscal,
  EmpresaDetalhe,
  FiscalDba,
  SalvarInformacoesInput,
} from '@/types/empresas';
import type { RamoAtividade } from '@/types/ramosAtividade';

const LIMITE_DESCRICAO = 500;
const DBAS: FiscalDba[] = [
  'nao_contratado',
  'atendimento',
  'monitoramento',
  'atendimento_monitoramento',
];
const temAtendimento = (dba: FiscalDba | null) =>
  dba === 'atendimento' || dba === 'atendimento_monitoramento';
const temMonitoramento = (dba: FiscalDba | null) =>
  dba === 'monitoramento' || dba === 'atendimento_monitoramento';
const temFiscais = (e: Pick<EmpresaDetalhe, 'solucoes'>) =>
  e.solucoes.some((s) => s.codigo === 'FISCAIS');

/** Rótulo e valor, no modo só leitura */
function Valor({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  const dica = useDicas()[rotulo];
  return (
    <div className="min-w-0">
      <dt className="flex items-center gap-1 text-xs text-ds-fg-muted">
        {rotulo}
        {dica && <InfoDica texto={dica} assunto={rotulo} />}
      </dt>
      <dd className="mt-0.5 text-sm text-ds-fg">{children}</dd>
    </div>
  );
}

function Leitura({ empresa, ramos }: { empresa: EmpresaDetalhe; ramos: RamoAtividade[] }) {
  const { t } = useTranslation();
  const r = (chave: string) => t(`empresasCadastro.informacoes.${chave}`);
  const f = empresa.informacoes.fiscal;
  const nomeRamo = (id: string | null) => ramos.find((x) => x.id === id)?.nome;
  const vazio = <span className="text-ds-fg-muted">—</span>;
  const simNao = (v: boolean | null) => (v === null ? vazio : v ? r('sim') : r('nao'));
  const horas = (minutos: number | null) =>
    minutos === null
      ? vazio
      : t('empresasCadastro.informacoes.porMes', { horas: formatarHoras(minutos) });
  const ramo = nomeRamo(empresa.informacoes.ramoId);

  return (
    <div className="grid gap-4 xl:grid-cols-2">
      <div className="space-y-4">
        <Card titulo={r('organizacoes')} aria-label={r('organizacoes')}>
          <dl className="space-y-4">
            <Valor rotulo={r('idAranda')}>{empresa.idAranda || vazio}</Valor>
            <Valor rotulo={r('nomesOrganizacoes')}>
              {empresa.organizacoes.length ? (
                <span className="mt-1 flex flex-wrap gap-1.5">
                  {empresa.organizacoes.map((o) => (
                    <Chip key={o.id}>{o.nome}</Chip>
                  ))}
                </span>
              ) : (
                vazio
              )}
            </Valor>
          </dl>
        </Card>
        <Card titulo={r('perfil')} aria-label={r('perfil')}>
          <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
            <Valor rotulo={r('ramo')}>
              {ramo ?? <span className="text-ds-warning-fg">{r('naoInformado')}</span>}
            </Valor>
            <Valor rotulo={r('ramoSecundario')}>
              {nomeRamo(empresa.informacoes.ramoSecundarioId) ?? vazio}
            </Valor>
            {empresa.informacoes.descricaoAtividade && (
              <div className="sm:col-span-2">
                <Valor rotulo={r('descricaoAtividade')}>
                  {empresa.informacoes.descricaoAtividade}
                </Valor>
              </div>
            )}
          </dl>
        </Card>
      </div>
      {temFiscais(empresa) && (
        <Card titulo={r('fiscal')} aria-label={r('fiscal')}>
          <dl className="grid gap-x-6 gap-y-4 sm:grid-cols-2">
            <Valor rotulo={r('modalidade')}>
              {f.modalidade === 'saas'
                ? r('saas')
                : f.modalidade === 'on_premise'
                  ? r('onPremise')
                  : vazio}
            </Valor>
            <Valor rotulo={r('edocs')}>{simNao(f.edocs24x7)}</Valor>
            <Valor rotulo={r('atualizacao')}>
              {f.atualizacaoContratada && f.atualizacoesPorAno
                ? t('empresasCadastro.informacoes.porAno', { n: f.atualizacoesPorAno })
                : simNao(f.atualizacaoContratada)}
            </Valor>
            {f.modalidade === 'on_premise' && (
              <>
                <Valor rotulo={r('dba')}>
                  {f.dba ? t(`empresasCadastro.informacoes.dbaOpcoes.${f.dba}`) : vazio}
                </Valor>
                {temAtendimento(f.dba) && (
                  <Valor rotulo={r('horasAtendimento')}>{horas(f.minutosAtendimento)}</Valor>
                )}
                {temMonitoramento(f.dba) && (
                  <Valor rotulo={r('horasMonitoramento')}>{horas(f.minutosMonitoramento)}</Valor>
                )}
                <Valor rotulo={r('bancoDados')}>
                  {f.bancoDados === 'sql_server'
                    ? r('sqlServer')
                    : f.bancoDados === 'oracle'
                      ? r('oracle')
                      : vazio}
                </Valor>
              </>
            )}
          </dl>
        </Card>
      )}
    </div>
  );
}

export function AbaInformacoes({
  empresa,
  ramos,
  podeEditar,
  onSalvar,
}: {
  empresa: EmpresaDetalhe;
  ramos: RamoAtividade[];
  podeEditar: boolean;
  /** Sem tratar o erro aqui: o aviso vem do hook e o rascunho continua na tela */
  onSalvar: (input: SalvarInformacoesInput) => Promise<void>;
}) {
  const { t } = useTranslation();
  const r = (chave: string) => t(`empresasCadastro.informacoes.${chave}`);
  const inicial = useMemo(() => rascunhoInformacoes(empresa), [empresa]);
  const [rascunho, setRascunho] = useState<RascunhoInformacoes>(inicial);
  // A empresa recarregada depois de salvar vira o novo ponto de partida
  useEffect(() => setRascunho(inicial), [inicial]);
  const [novaOrg, setNovaOrg] = useState('');
  const [erroOrg, setErroOrg] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  if (!podeEditar) return <Leitura empresa={empresa} ramos={ramos} />;

  const mudou = JSON.stringify(rascunho) !== JSON.stringify(inicial);
  const horasValidas = horasDoRascunhoValidas(rascunho);
  const alterar = (mudanca: Partial<RascunhoInformacoes>) =>
    setRascunho((x) => ({ ...x, ...mudanca }));
  const alterarFiscal = <K extends keyof ContratoFiscal>(k: K, v: ContratoFiscal[K]) =>
    setRascunho((x) => ({ ...x, fiscal: { ...x.fiscal, [k]: v } }));
  const { fiscal } = rascunho;

  const adicionarOrg = () => {
    const nome = novaOrg.trim().toUpperCase();
    if (!nome) return;
    if (rascunho.organizacoes.includes(nome)) {
      setErroOrg(r('organizacaoRepetida'));
      return;
    }
    alterar({ organizacoes: [...rascunho.organizacoes, nome] });
    setNovaOrg('');
    setErroOrg(null);
  };
  // Ativos para escolher; o ramo atual continua visível mesmo inativo
  const opcoesRamo = (excetoId?: string | null) =>
    ramos.filter(
      (x) =>
        x.id !== excetoId &&
        (x.ativo || x.id === rascunho.ramoId || x.id === rascunho.ramoSecundarioId)
    );
  const salvar = async () => {
    setSalvando(true);
    try {
      await onSalvar(informacoesParaSalvar(rascunho));
    } finally {
      setSalvando(false);
    }
  };
  const simNao = [
    { valor: 'sim' as const, rotulo: r('sim') },
    { valor: 'nao' as const, rotulo: r('nao') },
  ];
  const paraSimNao = (v: boolean | null) => (v === null ? null : v ? 'sim' : 'nao');

  return (
    <>
      <div className="grid gap-4 xl:grid-cols-2">
        <div className="space-y-4">
          <Card titulo={r('organizacoes')} aria-label={r('organizacoes')}>
            <div className="mb-5 sm:w-1/2 sm:pr-2">
              <Rotulo htmlFor="id-aranda">{r('idAranda')}</Rotulo>
              <input
                id="id-aranda"
                inputMode="numeric"
                placeholder={r('idArandaPlaceholder')}
                value={rascunho.idAranda}
                onChange={(e) => alterar({ idAranda: e.target.value })}
                className={campo}
              />
            </div>
            <Rotulo obrigatorio htmlFor="nova-org">
              {r('nomesOrganizacoes')}
            </Rotulo>
            <div className="flex flex-wrap gap-1.5">
              {rascunho.organizacoes.map((o) => (
                <Chip
                  key={o}
                  onRemover={() =>
                    alterar({ organizacoes: rascunho.organizacoes.filter((x) => x !== o) })
                  }
                >
                  {o}
                </Chip>
              ))}
              {!rascunho.organizacoes.length && (
                <span className="text-sm text-ds-fg-muted">{r('nenhumaOrganizacao')}</span>
              )}
            </div>
            <div className="mt-3 flex gap-2">
              <input
                id="nova-org"
                aria-label={r('novaOrganizacao')}
                placeholder={r('novaOrganizacaoPlaceholder')}
                value={novaOrg}
                onChange={(e) => {
                  setNovaOrg(e.target.value);
                  setErroOrg(null);
                }}
                onKeyDown={(e) => e.key === 'Enter' && adicionarOrg()}
                aria-invalid={!!erroOrg}
                className={cn(campo, erroOrg && 'border-ds-danger-fg')}
              />
              <Button onClick={adicionarOrg} className="shrink-0">
                <Plus /> {r('adicionar')}
              </Button>
            </div>
            {erroOrg && <p className="mt-1.5 text-xs text-ds-danger-fg">{erroOrg}</p>}
          </Card>

          <Card titulo={r('perfil')} aria-label={r('perfil')}>
            <div className="space-y-4">
              <div className="grid items-start gap-4 sm:grid-cols-2">
                <div>
                  <Rotulo obrigatorio htmlFor="ramo">
                    {r('ramo')}
                  </Rotulo>
                  <Select
                    id="ramo"
                    value={rascunho.ramoId ?? ''}
                    onChange={(e) => {
                      const ramoId = e.target.value || null;
                      // O secundário não pode repetir o principal
                      alterar({
                        ramoId,
                        ramoSecundarioId:
                          rascunho.ramoSecundarioId === ramoId ? null : rascunho.ramoSecundarioId,
                      });
                    }}
                    className="w-full"
                  >
                    <option value="">{r('selecione')}</option>
                    {opcoesRamo().map((x) => (
                      <option key={x.id} value={x.id}>
                        {x.nome}
                      </option>
                    ))}
                  </Select>
                  {!rascunho.ramoId && <Ajuda>{r('ramoPendente')}</Ajuda>}
                </div>
                <div>
                  <Rotulo htmlFor="ramo-secundario">{r('ramoSecundario')}</Rotulo>
                  <Select
                    id="ramo-secundario"
                    value={rascunho.ramoSecundarioId ?? ''}
                    onChange={(e) => alterar({ ramoSecundarioId: e.target.value || null })}
                    className="w-full"
                  >
                    <option value="">{r('nenhum')}</option>
                    {opcoesRamo(rascunho.ramoId).map((x) => (
                      <option key={x.id} value={x.id}>
                        {x.nome}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>
              <div>
                <Rotulo htmlFor="descricao-atividade">{r('descricaoAtividade')}</Rotulo>
                <textarea
                  id="descricao-atividade"
                  rows={3}
                  maxLength={LIMITE_DESCRICAO}
                  placeholder={r('descricaoPlaceholder')}
                  value={rascunho.descricaoAtividade}
                  onChange={(e) => alterar({ descricaoAtividade: e.target.value })}
                  className="w-full rounded-lg border border-ds-border-strong bg-ds-bg-surface px-3 py-2 text-base text-ds-fg placeholder:text-ds-fg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ds-focus md:text-sm"
                />
                <p className="mt-1 text-right text-xs tabular-nums text-ds-fg-muted">
                  {rascunho.descricaoAtividade.length}/{LIMITE_DESCRICAO}
                </p>
              </div>
            </div>
          </Card>
        </div>

        {temFiscais(empresa) && (
          <Card titulo={r('fiscal')} aria-label={r('fiscal')}>
            <div className="space-y-5">
              <div>
                <Rotulo obrigatorio>{r('modalidade')}</Rotulo>
                <Escolha
                  rotulo={r('modalidade')}
                  opcoes={[
                    { valor: 'saas', rotulo: r('saas') },
                    { valor: 'on_premise', rotulo: r('onPremise') },
                  ]}
                  valor={fiscal.modalidade}
                  onChange={(v) => alterarFiscal('modalidade', v)}
                />
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <Rotulo obrigatorio>{r('edocs')}</Rotulo>
                  <Escolha
                    rotulo={r('edocs')}
                    opcoes={simNao}
                    valor={paraSimNao(fiscal.edocs24x7)}
                    onChange={(v) => alterarFiscal('edocs24x7', v === 'sim')}
                  />
                </div>
                <div>
                  <Rotulo obrigatorio>{r('atualizacao')}</Rotulo>
                  <Escolha
                    rotulo={r('atualizacao')}
                    opcoes={simNao}
                    valor={paraSimNao(fiscal.atualizacaoContratada)}
                    onChange={(v) => alterarFiscal('atualizacaoContratada', v === 'sim')}
                  />
                </div>
              </div>
              {fiscal.atualizacaoContratada && (
                <div className="sm:w-1/2 sm:pr-2.5">
                  <Rotulo obrigatorio htmlFor="atualizacoes">
                    {r('atualizacoesAno')}
                  </Rotulo>
                  <CampoNumero
                    id="atualizacoes"
                    min={1}
                    valor={
                      fiscal.atualizacoesPorAno === null ? '' : String(fiscal.atualizacoesPorAno)
                    }
                    onChange={(v) => alterarFiscal('atualizacoesPorAno', v ? Number(v) : null)}
                  />
                </div>
              )}
              {fiscal.modalidade === 'on_premise' && (
                <div className="space-y-5 border-t border-ds-border pt-5">
                  <div>
                    <Rotulo obrigatorio>{r('dba')}</Rotulo>
                    <Escolha
                      rotulo={r('dba')}
                      umaLinha
                      opcoes={DBAS.map((d) => ({
                        valor: d,
                        rotulo: t(`empresasCadastro.informacoes.dbaOpcoes.${d}`),
                      }))}
                      valor={fiscal.dba}
                      onChange={(v) => alterarFiscal('dba', v)}
                    />
                  </div>
                  {(temAtendimento(fiscal.dba) || temMonitoramento(fiscal.dba)) && (
                    <div className="grid items-end gap-4 sm:grid-cols-2">
                      {temAtendimento(fiscal.dba) && (
                        <div>
                          <Rotulo obrigatorio htmlFor="horas-atendimento">
                            {r('horasAtendimento')}
                          </Rotulo>
                          <CampoHoras
                            id="horas-atendimento"
                            valor={rascunho.horasAtendimento}
                            onChange={(v) => alterar({ horasAtendimento: v })}
                          />
                        </div>
                      )}
                      {temMonitoramento(fiscal.dba) && (
                        <div>
                          <Rotulo obrigatorio htmlFor="horas-monitoramento">
                            {r('horasMonitoramento')}
                          </Rotulo>
                          <CampoHoras
                            id="horas-monitoramento"
                            valor={rascunho.horasMonitoramento}
                            onChange={(v) => alterar({ horasMonitoramento: v })}
                          />
                        </div>
                      )}
                    </div>
                  )}
                  <div>
                    <Rotulo obrigatorio>{r('bancoDados')}</Rotulo>
                    <Escolha
                      rotulo={r('bancoDados')}
                      opcoes={[
                        { valor: 'sql_server', rotulo: r('sqlServer') },
                        { valor: 'oracle', rotulo: r('oracle') },
                      ]}
                      valor={fiscal.bancoDados}
                      onChange={(v) => alterarFiscal('bancoDados', v)}
                    />
                  </div>
                </div>
              )}
            </div>
          </Card>
        )}
      </div>

      {mudou && (
        <BarraRodape>
          <span
            className={cn(
              'text-sm',
              horasValidas ? 'text-ds-fg-secondary' : 'font-medium text-ds-danger-fg'
            )}
          >
            {horasValidas ? r('naoSalvo') : r('horasInvalidas')}
          </span>
          <div className="flex flex-1 justify-end gap-2 sm:flex-none">
            <Button disabled={salvando} onClick={() => setRascunho(inicial)}>
              {t('fase3Comum.descartar')}
            </Button>
            <Button variante="primario" disabled={salvando || !horasValidas} onClick={salvar}>
              {t('fase3Comum.salvar')}
            </Button>
          </div>
        </BarraRodape>
      )}
    </>
  );
}
