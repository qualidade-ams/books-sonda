// Tela Organizar Menu (Modelagem_Fase3.md, seção 12.1): ordem e agrupamento do menu lateral, iguais
// para todos os usuários. O menu do código é a ordem padrão; a tela guarda só o que mudou. Tudo fica
// pendente até Salvar, na barra do rodapé.
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { RotateCcw } from 'lucide-react';
import AdminLayout from '@/components/admin/LayoutAdmin';
import { DsPage } from '@/components/ds/DsPage';
import { FaixaPagina } from '@/components/ds/FaixaPagina';
import { BarraRodape, DicaDoRotulo, TituloFaixa } from '@/components/ds/Formulario';
import { DicasContext } from '@/components/ds/Dicas';
import { Callout } from '@/components/ds/Callout';
import { Button } from '@/components/ds/Button';
import { ConfirmDialog } from '@/components/ds/ConfirmDialog';
import { OrdemDoMenu } from '@/components/admin/organizarMenu/OrdemDoMenu';
import { useMenuOrganizado } from '@/hooks/useMenuOrganizado';
import { usePermissions } from '@/hooks/usePermissions';
import { MENU_PADRAO } from '@/config/menuPadrao';
import { aplicarOrdemSalva } from '@/services/menuOrganizadoService';
import { plural } from '@/utils/plural';
import { menusVazios, mesmaEstrutura, mudancasDaOrdem, posicoes } from '@/utils/organizarMenuTela';
import type { NoMenu } from '@/types/menuOrganizado';

export default function OrganizarMenu() {
  const { t } = useTranslation();
  const o = (chave: string, valores?: Record<string, unknown>) =>
    t(`organizarMenu.${chave}`, valores);
  const { hasPermission } = usePermissions();
  const podeEditar = hasPermission('organizar_menu', 'edit');
  const { menu, isLoading, error, recarregar, salvar, isSalvando } = useMenuOrganizado();

  // O salvo é a ordem do código com o que foi mudado; a tela mostra todas as telas, sem permissão
  const salvo = useMemo(() => aplicarOrdemSalva(MENU_PADRAO, menu?.itens ?? []), [menu]);
  const [rascunho, setRascunho] = useState<NoMenu[] | null>(null);
  const arvore = rascunho ?? salvo;
  /** Itens que o usuário mexeu: só eles ganham o selo, não os que andaram uma casa por tabela */
  const [arrastados, setArrastados] = useState<Set<string>>(new Set());
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
  const mudou = !mesmaEstrutura(salvo, arvore);
  const m = mudancasDaOrdem(salvo, arvore);
  const resumo = [
    m.ordemDosMenus && o('mudancas.ordemDosMenus'),
    m.menusCriados > 0 && plural(t, 'organizarMenu.mudancas.menusCriados', m.menusCriados),
    m.telasMovidas > 0 && plural(t, 'organizarMenu.mudancas.telasMovidas', m.telasMovidas),
    m.menusReordenados.length > 0 &&
      o('mudancas.menusReordenados', { menus: juntar(m.menusReordenados.map(nome)) }),
  ]
    .filter(Boolean)
    .join(' · ');
  const vazios = menusVazios(arvore).map(nome);

  const mover = (nova: NoMenu[], chave: string) => {
    setRascunho(nova);
    setArrastados((a) => new Set([...a, chave]));
  };
  const restaurar = () => {
    setRascunho(MENU_PADRAO);
    setArrastados(new Set(posicoes(MENU_PADRAO).keys()));
  };
  const descartar = () => {
    setRascunho(null);
    setArrastados(new Set());
  };
  const gravar = async () => {
    try {
      await salvar({
        // Na ordem do código, apaga a salva: tela nova volta a entrar onde o código a coloca
        arvore: mesmaEstrutura(arvore, MENU_PADRAO) ? null : arvore,
        aparenciaAtual: menu!.aparencia,
        aparenciaNova: menu!.aparencia,
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
    return (
      <OrdemDoMenu arvore={arvore} movidos={movidos} podeEditar={podeEditar} onMover={mover} />
    );
  };

  return (
    <AdminLayout>
      <div className="min-h-screen bg-ds-bg-page">
        <DsPage className="px-4 py-4 md:px-6">
          <DicasContext.Provider value={{ [o('ordem.titulo')]: o('ordem.dica') }}>
            <FaixaPagina>
              <div className="pb-24 pt-3 md:pb-28 md:pt-4">
                <div className="ds-surgir max-w-2xl">
                  <TituloFaixa texto={o('titulo')} />
                  <p className="mt-1.5 text-sm text-[#B1B1B1] md:text-[15px]">{o('subtitulo')}</p>
                </div>
              </div>
            </FaixaPagina>

            <section className="ds-surgir relative mx-auto -mt-16 max-w-3xl overflow-hidden rounded-xl border border-ds-border bg-ds-bg-surface md:-mt-20">
              <header className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-ds-border px-4 py-3 md:px-5">
                <span className="flex items-center gap-1.5 text-sm font-semibold">
                  {o('ordem.titulo')}
                  <DicaDoRotulo rotulo={o('ordem.titulo')} />
                </span>
                {podeEditar && menu && (
                  <Button
                    tamanho="sm"
                    className="ml-auto"
                    onClick={restaurar}
                    disabled={mesmaEstrutura(arvore, MENU_PADRAO)}
                  >
                    <RotateCcw /> {o('ordem.padrao')}
                  </Button>
                )}
              </header>
              {conteudo()}
            </section>

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
