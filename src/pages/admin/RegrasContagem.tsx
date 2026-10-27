// Tela Regras de contagem (decisão de separação dos setores, 16/10/2026): o que conta nos bancos de
// horas. Códigos de resolução e filtros ficam pendentes até Salvar, que pede o motivo.
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, Clock, Filter, Ticket } from 'lucide-react';
import AdminLayout from '@/components/admin/LayoutAdmin';
import { DsPage } from '@/components/ds/DsPage';
import { FaixaPagina } from '@/components/ds/FaixaPagina';
import { SegmentedTabs } from '@/components/ds/SegmentedTabs';
import { Callout } from '@/components/ds/Callout';
import { Button } from '@/components/ds/Button';
import { ConfirmDialog } from '@/components/ds/ConfirmDialog';
import { DicasContext } from '@/components/ds/Dicas';
import { BarraRodape, Indicador, TituloFaixa } from '@/components/ds/Formulario';
import { atraso } from '@/components/ds/Visual';
import { MenuExportar } from '@/components/ds/MenuExportar';
import { BotaoImportar, TelaImportacao } from '@/components/ds/TelaImportacao';
import { AbaCodigos } from '@/components/admin/regras/AbaCodigos';
import { AbaSemRegra } from '@/components/admin/regras/AbaSemRegra';
import { AbaFiltros } from '@/components/admin/regras/AbaFiltros';
import { useRegrasContagem } from '@/hooks/useRegrasContagem';
import { usePermissions } from '@/hooks/usePermissions';
import { plural } from '@/utils/plural';
import { exportarTabela } from '@/utils/exportarTabela';
import {
  codigoNovo,
  codigosComImportados,
  conferirCodigos,
  exportacaoRegras,
  mudancasRegras,
  paraSalvar,
  problemasDosFiltros,
  totaisRegras,
  type RegrasEdicao,
} from '@/utils/regrasTela';

/** Rótulo (traduzido) → chave do texto do "i" */
const DICAS: [string, string][] = [
  ['regrasContagem.codigos.titulo', 'codigos'],
  ['regrasContagem.codigos.colunaHoras', 'contaHoras'],
  ['regrasContagem.codigos.colunaTickets', 'contaTickets'],
  ['regrasContagem.filtros.grupos', 'grupos'],
  ['regrasContagem.filtros.tipos', 'tipos'],
  ['regrasContagem.filtros.atividade', 'atividade'],
  ['regrasContagem.filtros.itens', 'itens'],
  ['regrasContagem.filtros.tickets', 'tickets'],
];

const primeiraMaiuscula = (texto: string) => texto.replace(/^./, (c) => c.toUpperCase());

export default function RegrasContagem() {
  const { t } = useTranslation();
  const { hasPermission } = usePermissions();
  const podeEditar = hasPermission('regras_contagem', 'edit');
  const { regras, isLoading, error, recarregar, salvar, isSalvando } = useRegrasContagem();

  const salvo = useMemo<RegrasEdicao | null>(
    () => (regras ? { codigos: regras.codigos, filtros: regras.filtros } : null),
    [regras]
  );
  /** Rascunho; volta ao salvo quando as regras recarregam */
  const [edicao, setEdicao] = useState<RegrasEdicao | null>(salvo);
  useEffect(() => setEdicao(salvo), [salvo]);
  const [aba, setAba] = useState('codigos');
  const [confirmar, setConfirmar] = useState(false);
  const [importando, setImportando] = useState(false);

  const dicas = useMemo(
    () =>
      Object.fromEntries(
        DICAS.map(([rotulo, dica]) => [t(rotulo), t(`regrasContagem.dicas.${dica}`)])
      ),
    [t]
  );

  // O código incluído sai da lista dos sem regra
  const semRegra = (regras?.codigosSemRegra ?? []).filter(
    (c) => !edicao?.codigos.some((x) => x.codigo === c.codigo)
  );
  const mudancas = edicao && salvo ? mudancasRegras(edicao, salvo) : null;
  const problemas = edicao
    ? problemasDosFiltros(edicao.filtros)
    : { semGrupos: false, semTipos: false };
  const podeSalvar = !problemas.semGrupos && !problemas.semTipos;
  const totais = edicao
    ? totaisRegras(edicao.codigos, edicao.filtros, semRegra.length)
    : { horas: 0, tickets: 0, filtros: 0, semRegra: 0 };
  const itens = mudancas
    ? [
        ...(mudancas.incluidos
          ? [plural(t, 'regrasContagem.mudancas.incluidos', mudancas.incluidos)]
          : []),
        ...(mudancas.retirados
          ? [plural(t, 'regrasContagem.mudancas.retirados', mudancas.retirados)]
          : []),
        ...(mudancas.alterados
          ? [plural(t, 'regrasContagem.mudancas.alterados', mudancas.alterados)]
          : []),
        ...(mudancas.filtrosAlterados ? [t('regrasContagem.mudancas.filtros')] : []),
      ]
    : [];

  const gravar = async (motivo?: string) => {
    if (!edicao || !mudancas) return;
    await salvar(paraSalvar(motivo ?? '', edicao, mudancas));
    setConfirmar(false);
  };

  const conteudo = () => {
    if (error)
      return (
        <div className="space-y-3 rounded-xl border border-ds-border bg-ds-bg-surface p-4">
          <Callout tom="danger" titulo={t('regrasContagem.erro')}>
            {t('fase3Comum.verifiqueConexao')}
          </Callout>
          <Button onClick={recarregar}>{t('fase3Comum.tentarNovamente')}</Button>
        </div>
      );
    if (isLoading || !edicao)
      return (
        <div
          className="grid gap-4 lg:grid-cols-2"
          role="status"
          aria-label={t('regrasContagem.carregando')}
        >
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-40 animate-pulse rounded-xl bg-ds-bg-surface" />
          ))}
        </div>
      );
    if (aba === 'sem-regra')
      return (
        <AbaSemRegra
          semRegra={semRegra}
          carregando={false}
          podeEditar={podeEditar}
          onIncluir={(c) => {
            setEdicao((e) => ({ ...e, codigos: [codigoNovo(c.codigo, c), ...e.codigos] }));
            setAba('codigos');
          }}
        />
      );
    if (aba === 'filtros')
      return (
        <AbaFiltros
          filtros={edicao.filtros}
          podeEditar={podeEditar}
          onChange={(filtros) => setEdicao((e) => ({ ...e, filtros }))}
        />
      );
    return (
      <AbaCodigos
        codigos={edicao.codigos}
        carregando={false}
        podeEditar={podeEditar}
        onChange={(codigos) => setEdicao((e) => ({ ...e, codigos }))}
      />
    );
  };

  return (
    <AdminLayout>
      <DicasContext.Provider value={dicas}>
        <div className="min-h-screen bg-ds-bg-page">
          <DsPage className="px-4 py-4 md:px-6">
            {importando && regras ? (
              <TelaImportacao
                voltarPara={t('regrasContagem.titulo')}
                titulo={t('regrasContagem.importar.titulo')}
                colunas={[
                  {
                    id: 'codigo',
                    rotulo: t('regrasContagem.codigos.colunaCodigo'),
                    obrigatoria: true,
                  },
                  {
                    id: 'horas',
                    rotulo: t('regrasContagem.codigos.colunaHoras'),
                    obrigatoria: true,
                  },
                  {
                    id: 'tickets',
                    rotulo: t('regrasContagem.codigos.colunaTickets'),
                    obrigatoria: true,
                  },
                ]}
                regras={[
                  t('regrasContagem.importar.regras.exato'),
                  t('regrasContagem.importar.regras.simNao'),
                  t('regrasContagem.importar.regras.existentes'),
                ]}
                modelo={{
                  arquivo: t('regrasContagem.importar.modelo'),
                  exemplo: [
                    {
                      codigo: t('regrasContagem.importar.exemplo'),
                      horas: t('regrasContagem.codigos.sim'),
                      tickets: t('regrasContagem.codigos.sim'),
                    },
                  ],
                }}
                aviso={<Callout tom="info">{t('fase3Comum.valeMesesAbertos')}</Callout>}
                conferir={(linhas) => conferirCodigos(linhas, regras.codigos, t)}
                onImportar={(linhas, { arquivo }) =>
                  salvar({
                    motivo: t('regrasContagem.importar.motivo', { arquivo }),
                    codigos: codigosComImportados(regras.codigos, linhas),
                  })
                }
                onFechar={() => setImportando(false)}
              />
            ) : (
              <>
                <FaixaPagina>
                  <div className="pb-24 pt-3 md:pb-28 md:pt-4">
                    <div className="ds-surgir max-w-2xl">
                      <TituloFaixa texto={t('regrasContagem.titulo')} />
                      <p className="mt-1.5 text-sm text-[#B1B1B1] md:text-[15px]">
                        {t('regrasContagem.subtitulo')}
                      </p>
                    </div>
                    {regras && (
                      <div className="ds-surgir mt-5 flex flex-wrap gap-2" style={atraso(100)}>
                        {podeEditar && (
                          <span
                            title={
                              mudancas?.algo ? t('regrasContagem.importar.salveAntes') : undefined
                            }
                          >
                            <BotaoImportar
                              onClick={() => setImportando(true)}
                              desabilitado={!!mudancas?.algo}
                            />
                          </span>
                        )}
                        <MenuExportar
                          descricao={t('regrasContagem.exportar.descricao')}
                          onExportar={(formato) =>
                            exportarTabela(exportacaoRegras(regras, t), formato)
                          }
                        />
                      </div>
                    )}
                  </div>
                </FaixaPagina>

                <div className="relative !-mt-16 grid grid-cols-2 gap-3 md:!-mt-20 lg:grid-cols-4">
                  <Indicador
                    rotulo={t('regrasContagem.indicadores.horas')}
                    valor={totais.horas}
                    icone={<Clock />}
                  />
                  <Indicador
                    rotulo={t('regrasContagem.indicadores.tickets')}
                    valor={totais.tickets}
                    icone={<Ticket />}
                    atrasoMs={60}
                  />
                  <Indicador
                    rotulo={t('regrasContagem.indicadores.filtros')}
                    valor={totais.filtros}
                    icone={<Filter />}
                    atrasoMs={120}
                    selecionado={aba === 'filtros'}
                    onClick={() => setAba('filtros')}
                  />
                  <Indicador
                    rotulo={t('regrasContagem.indicadores.semRegra')}
                    valor={totais.semRegra}
                    icone={<AlertTriangle />}
                    tom="warning"
                    atrasoMs={180}
                    selecionado={aba === 'sem-regra'}
                    onClick={() => setAba('sem-regra')}
                  />
                </div>

                <div className="mt-6 space-y-4">
                  <div className="sticky top-0 z-[5] -mx-1 flex justify-center bg-ds-bg-page px-1 py-1.5">
                    <SegmentedTabs
                      rotulo={t('regrasContagem.abas.rotulo')}
                      itens={[
                        { valor: 'codigos', rotulo: t('regrasContagem.abas.codigos') },
                        {
                          valor: 'sem-regra',
                          rotulo: t('regrasContagem.abas.semRegra'),
                          contador: totais.semRegra,
                        },
                        { valor: 'filtros', rotulo: t('regrasContagem.abas.filtros') },
                      ]}
                      valor={aba}
                      onChange={setAba}
                    />
                  </div>
                  <div key={aba} className="ds-surgir" style={atraso(240)}>
                    {conteudo()}
                  </div>
                </div>

                {mudancas?.algo && (
                  <BarraRodape>
                    <span className="text-sm text-ds-fg-secondary">
                      {podeSalvar ? (
                        <>
                          <span className="font-medium text-ds-fg">
                            {primeiraMaiuscula(itens.join(', '))}
                          </span>
                          . {t('fase3Comum.valeMesesAbertos')}
                        </>
                      ) : (
                        <span className="font-medium text-ds-danger-fg">
                          {t('regrasContagem.mudancas.naoPode')}
                        </span>
                      )}
                    </span>
                    <div className="flex gap-2">
                      <Button disabled={isSalvando} onClick={() => setEdicao(salvo)}>
                        {t('fase3Comum.descartar')}
                      </Button>
                      <Button
                        variante="primario"
                        disabled={isSalvando || !podeSalvar}
                        onClick={() => setConfirmar(true)}
                      >
                        {t('fase3Comum.salvar')}
                      </Button>
                    </div>
                  </BarraRodape>
                )}

                <ConfirmDialog
                  aberto={confirmar}
                  onOpenChange={setConfirmar}
                  titulo={t('regrasContagem.confirmar.titulo')}
                  descricao={t('regrasContagem.confirmar.descricao')}
                  consequencias={[
                    ...itens.map(primeiraMaiuscula),
                    t('fase3Comum.valeMesesAbertos'),
                  ]}
                  rotuloConfirmar={t('ds.formulario.salvar')}
                  justificativa={{
                    rotulo: t('regrasContagem.confirmar.motivo'),
                    placeholder: t('regrasContagem.confirmar.motivoPlaceholder'),
                  }}
                  processando={isSalvando}
                  onConfirmar={gravar}
                />
              </>
            )}
          </DsPage>
        </div>
      </DicasContext.Provider>
    </AdminLayout>
  );
}
