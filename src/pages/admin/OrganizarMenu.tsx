// Tela Organizar Menu (Modelagem_Fase3.md, seção 12.1): ordem, agrupamento e cores do menu lateral,
// iguais para todos os usuários. O menu do código é a ordem padrão; a tela guarda só o que mudou. Tudo
// fica pendente até Salvar, na barra do rodapé. Nas cores, a aba de tema é o tema da página.
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { RotateCcw } from 'lucide-react';
import AdminLayout from '@/components/admin/LayoutAdmin';
import { DsPage } from '@/components/ds/DsPage';
import { FaixaPagina } from '@/components/ds/FaixaPagina';
import { BarraRodape, DicaDoRotulo, TituloFaixa } from '@/components/ds/Formulario';
import { DicasContext } from '@/components/ds/Dicas';
import { SegmentedTabs } from '@/components/ds/SegmentedTabs';
import { Callout } from '@/components/ds/Callout';
import { Button } from '@/components/ds/Button';
import { ConfirmDialog } from '@/components/ds/ConfirmDialog';
import { OrdemDoMenu } from '@/components/admin/organizarMenu/OrdemDoMenu';
import { CoresDoMenu } from '@/components/admin/organizarMenu/CoresDoMenu';
import { PreviaMenu } from '@/components/admin/organizarMenu/PreviaMenu';
import { useMenuOrganizado } from '@/hooks/useMenuOrganizado';
import { mudarTemaDaPagina, useTemaDoDocumento } from '@/hooks/useTemaDoDocumento';
import { usePermissions } from '@/hooks/usePermissions';
import { MENU_PADRAO } from '@/config/menuPadrao';
import { APARENCIA_PADRAO } from '@/config/aparenciaPadrao';
import { aplicarOrdemSalva, diferencaAparencia } from '@/services/menuOrganizadoService';
import { cn } from '@/lib/utils';
import { plural } from '@/utils/plural';
import {
  PARTES_DO_MENU,
  menusVazios,
  mesmaEstrutura,
  mudancasDaAparencia,
  mudancasDaOrdem,
  posicoes,
} from '@/utils/organizarMenuTela';
import type { AparenciaMenu, NoMenu, TemaMenu } from '@/types/menuOrganizado';

type Aba = 'ordem' | 'cores';

export default function OrganizarMenu() {
  const { t } = useTranslation();
  const o = (chave: string, valores?: Record<string, unknown>) =>
    t(`organizarMenu.${chave}`, valores);
  const { hasPermission } = usePermissions();
  const podeEditar = hasPermission('organizar_menu', 'edit');
  const { menu, isLoading, error, recarregar, salvar, enviarLogo, isSalvando } =
    useMenuOrganizado();
  const [aba, setAba] = useState<Aba>('ordem');
  const tema = useTemaDoDocumento();

  // O salvo é a ordem do código com o que foi mudado; a tela mostra todas as telas, sem permissão
  const salvo = useMemo(() => aplicarOrdemSalva(MENU_PADRAO, menu?.itens ?? []), [menu]);
  const [rascunho, setRascunho] = useState<NoMenu[] | null>(null);
  const arvore = rascunho ?? salvo;
  /** Itens que o usuário mexeu: só eles ganham o selo, não os que andaram uma casa por tabela */
  const [arrastados, setArrastados] = useState<Set<string>>(new Set());
  const aparenciaSalva = menu?.aparencia ?? APARENCIA_PADRAO;
  const [rascunhoAparencia, setRascunhoAparencia] = useState<Record<
    TemaMenu,
    AparenciaMenu
  > | null>(null);
  const aparencia = rascunhoAparencia ?? aparenciaSalva;
  const [confirmando, setConfirmando] = useState(false);

  const posSalvas = useMemo(() => posicoes(salvo), [salvo]);
  const posAtuais = useMemo(() => posicoes(arvore), [arvore]);
  const movidos = new Set(
    [...arrastados].filter((k) => {
      const a = posAtuais.get(k);
      const s = posSalvas.get(k);
      return a?.pai !== s?.pai || a?.i !== s?.i;
    })
  );

  const nome = (chave: string) => t(arvore.find((n) => n.chave === chave)?.rotuloI18n ?? chave);
  /** "a", "a e b", "a, b e c" */
  const juntar = (nomes: string[]) =>
    nomes.length <= 1
      ? nomes.join('')
      : `${nomes.slice(0, -1).join(', ')} ${t('sincronizacaoSql.recorrencia.e')} ${nomes[nomes.length - 1]}`;
  /** Um tema ou os dois */
  const dosTemas = (temas: TemaMenu[]) => (temas.length > 1 ? 'ambos' : temas[0]);

  const ordemMudou = !mesmaEstrutura(salvo, arvore);
  const m = mudancasDaOrdem(salvo, arvore);
  const a = mudancasDaAparencia(aparenciaSalva, aparencia);
  const mudou = ordemMudou || a.cores.length > 0 || a.logo.length > 0;
  const resumo = [
    m.ordemDosMenus && o('mudancas.ordemDosMenus'),
    m.menusCriados > 0 && plural(t, 'organizarMenu.mudancas.menusCriados', m.menusCriados),
    m.telasMovidas > 0 && plural(t, 'organizarMenu.mudancas.telasMovidas', m.telasMovidas),
    m.menusReordenados.length > 0 &&
      o('mudancas.menusReordenados', { menus: juntar(m.menusReordenados.map(nome)) }),
    a.cores.length > 0 && o(`mudancasCores.cores.${dosTemas(a.cores)}`),
    a.logo.length > 0 && o(`mudancasCores.logo.${dosTemas(a.logo)}`),
  ]
    .filter(Boolean)
    .join(' · ');
  const vazios = menusVazios(arvore).map(nome);

  const mover = (nova: NoMenu[], chave: string) => {
    setRascunho(nova);
    setArrastados((x) => new Set([...x, chave]));
  };
  const restaurarOrdem = () => {
    setRascunho(MENU_PADRAO);
    setArrastados(new Set(posicoes(MENU_PADRAO).keys()));
  };
  const mudarAparencia = (campo: keyof AparenciaMenu, valor: string | null) =>
    setRascunhoAparencia((r) => {
      const base = r ?? aparenciaSalva;
      return { ...base, [tema]: { ...base[tema], [campo]: valor } };
    });
  const restaurarCores = () =>
    setRascunhoAparencia((r) => ({ ...(r ?? aparenciaSalva), [tema]: APARENCIA_PADRAO[tema] }));
  const enviarLogoDoTema = async (tipo: 'aberto' | 'recolhido', arquivo: File) => {
    const caminho = await enviarLogo({ tema, tipo, arquivo });
    mudarAparencia(tipo === 'aberto' ? 'logoPath' : 'logoRecolhidoPath', caminho);
  };
  const descartar = () => {
    setRascunho(null);
    setRascunhoAparencia(null);
    setArrastados(new Set());
  };
  const gravar = async () => {
    try {
      await salvar({
        // Na ordem do código, apaga a salva: tela nova volta a entrar onde o código a coloca
        arvore: mesmaEstrutura(arvore, MENU_PADRAO) ? null : arvore,
        aparenciaAtual: aparenciaSalva,
        aparenciaNova: aparencia,
      });
      descartar();
      setConfirmando(false);
    } catch {
      // O aviso do erro vem do hook; o diálogo continua aberto para tentar de novo
    }
  };

  const conteudo = () => {
    if (error)
      return (
        <div className="space-y-3 p-4">
          <Callout tom="danger" titulo={o('erro')}>
            {t('fase3Comum.verifiqueConexao')}
          </Callout>
          <Button onClick={() => recarregar()}>{t('fase3Comum.tentarNovamente')}</Button>
        </div>
      );
    if (isLoading || !menu)
      return (
        <div className="space-y-2 p-3" role="status" aria-label={o('carregando')}>
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="h-14 animate-pulse rounded-xl bg-ds-bg-subtle" />
          ))}
        </div>
      );
    if (aba === 'cores')
      return (
        <CoresDoMenu
          tema={tema}
          onTema={mudarTemaDaPagina}
          salva={aparenciaSalva[tema]}
          atual={aparencia[tema]}
          podeEditar={podeEditar}
          onMudar={mudarAparencia}
          onEnviarLogo={enviarLogoDoTema}
        />
      );
    return (
      <OrdemDoMenu arvore={arvore} movidos={movidos} podeEditar={podeEditar} onMover={mover} />
    );
  };

  const comPrevia = aba === 'cores' && !!menu;
  const dicas = {
    [o('ordem.titulo')]: o('ordem.dica'),
    [o('cores.logo')]: o('cores.dicas.logo'),
    ...Object.fromEntries(
      PARTES_DO_MENU.map((p) => [o(`cores.partes.${p}`), o(`cores.dicas.${p}`)])
    ),
  };

  return (
    <AdminLayout>
      <div className="min-h-screen bg-ds-bg-page">
        <DsPage className="px-4 py-4 md:px-6">
          <DicasContext.Provider value={dicas}>
            <FaixaPagina>
              <div className="pb-24 pt-3 md:pb-28 md:pt-4">
                <div className="ds-surgir max-w-2xl">
                  <TituloFaixa texto={o('titulo')} />
                  <p className="mt-1.5 text-sm text-[#B1B1B1] md:text-[15px]">{o('subtitulo')}</p>
                </div>
              </div>
            </FaixaPagina>

            <div
              className={cn(
                'ds-surgir relative mx-auto -mt-16 grid items-start gap-4 md:-mt-20',
                comPrevia ? 'max-w-6xl lg:grid-cols-[minmax(0,1fr)_280px]' : 'max-w-3xl'
              )}
            >
              <section className="overflow-hidden rounded-xl border border-ds-border bg-ds-bg-surface">
                <header className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-ds-border px-4 py-3 md:px-5">
                  <span className="flex items-center gap-1.5">
                    <SegmentedTabs
                      rotulo={o('abas.rotulo')}
                      itens={[
                        { valor: 'ordem', rotulo: o('abas.ordem') },
                        { valor: 'cores', rotulo: o('abas.cores') },
                      ]}
                      valor={aba}
                      onChange={(v) => setAba(v as Aba)}
                    />
                    {aba === 'ordem' && <DicaDoRotulo rotulo={o('ordem.titulo')} />}
                  </span>
                  {podeEditar && menu && (
                    <Button
                      tamanho="sm"
                      className="ml-auto"
                      onClick={aba === 'ordem' ? restaurarOrdem : restaurarCores}
                      disabled={
                        aba === 'ordem'
                          ? mesmaEstrutura(arvore, MENU_PADRAO)
                          : !diferencaAparencia(aparencia[tema], APARENCIA_PADRAO[tema])
                      }
                    >
                      <RotateCcw /> {o(aba === 'ordem' ? 'ordem.padrao' : 'cores.padrao')}
                    </Button>
                  )}
                </header>
                {conteudo()}
              </section>

              {comPrevia && (
                <aside className="space-y-2 lg:sticky lg:top-16" aria-label={o('cores.previa')}>
                  <p className="px-1 text-xs font-bold uppercase tracking-[0.06em] text-ds-fg-muted lg:text-white/70">
                    {o('cores.previaTema', { tema: o(`cores.temas.${tema}`) })}
                  </p>
                  <PreviaMenu arvore={arvore} aparencia={aparencia[tema]} />
                </aside>
              )}
            </div>

            {podeEditar && mudou && (
              <BarraRodape>
                <span className="text-sm text-ds-fg-secondary">
                  <span className="font-medium text-ds-fg">{resumo}</span> ·{' '}
                  {o('mudancas.naoSalvo')}
                </span>
                <div className="flex gap-2">
                  <Button onClick={descartar}>{o('descartar')}</Button>
                  <Button variante="primario" onClick={() => setConfirmando(true)}>
                    {o('salvar')}
                  </Button>
                </div>
              </BarraRodape>
            )}

            <ConfirmDialog
              aberto={confirmando}
              onOpenChange={setConfirmando}
              titulo={o('confirmar.titulo')}
              descricao={resumo ? `${resumo}.` : undefined}
              consequencias={[
                o('confirmar.todos'),
                ...(vazios.length
                  ? [
                      plural(t, 'organizarMenu.confirmar.vazios', vazios.length, {
                        menus: juntar(vazios),
                      }),
                    ]
                  : []),
              ]}
              rotuloConfirmar={o('salvar')}
              processando={isSalvando}
              onConfirmar={gravar}
            />
          </DicasContext.Provider>
        </DsPage>
      </div>
    </AdminLayout>
  );
}
