// Prévia do menu lateral com a ordem e as cores do rascunho, no tema em uso: o menu desta tela fica
// aberto, com Organizar Menu selecionada.
import { useTranslation } from 'react-i18next';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { iconeDoMenu } from '@/components/admin/iconesMenu';
import { useLogoMenu } from '@/hooks/useMenuOrganizado';
import { cn } from '@/lib/utils';
import { logoClaroSobre } from '@/utils/aparenciaMenu';
import { menuDaRota, menuVisivel } from '@/utils/menuLateral';
import type { AparenciaMenu, NoMenu } from '@/types/menuOrganizado';

const TELA_ATUAL = '/admin/organizar-menu';

export function PreviaMenu({ arvore, aparencia }: { arvore: NoMenu[]; aparencia: AparenciaMenu }) {
  const { t } = useTranslation();
  const logo = useLogoMenu(aparencia.logoPath);
  // Menu sem telas não aparece; a prévia mostra todas as telas
  const itens = menuVisivel(arvore, () => true);
  const aberto = menuDaRota(itens, TELA_ATUAL);
  const selecionado = { background: aparencia.selecionadoFundo, color: aparencia.selecionadoTexto };

  return (
    <div
      className="overflow-hidden rounded-xl p-2 shadow-[0_16px_40px_rgba(0,0,0,0.12)] ring-1 ring-black/5 dark:ring-white/10"
      style={{ background: aparencia.menuFundo, color: aparencia.menuTexto }}
    >
      <div className="mb-2 flex h-14 items-center justify-center">
        {logo ? (
          <img src={logo} alt="" className="h-10 max-w-[180px] object-contain" />
        ) : (
          <img
            src="/images/logo-sonda.png"
            alt=""
            className={cn('h-10 w-auto', !logoClaroSobre(aparencia.menuFundo) && 'brightness-0')}
          />
        )}
      </div>
      <ul className="space-y-1">
        {itens.map((no) => {
          const Icone = iconeDoMenu(no.icone);
          const ativo = no.chave === TELA_ATUAL;
          const expandido = no.chave === aberto;
          return (
            <li key={no.chave}>
              <div
                className="flex h-9 items-center gap-2.5 rounded-md px-3 text-sm font-medium"
                style={
                  ativo
                    ? selecionado
                    : { background: aparencia.itemFundo, color: aparencia.itemTexto }
                }
              >
                <Icone className="h-4 w-4 shrink-0" aria-hidden />
                <span className="min-w-0 flex-1 truncate">{t(no.rotuloI18n)}</span>
                {no.tipo === 'menu' &&
                  (expandido ? (
                    <ChevronUp className="h-3 w-3 shrink-0" aria-hidden />
                  ) : (
                    <ChevronDown className="h-3 w-3 shrink-0" aria-hidden />
                  ))}
              </div>
              {expandido && (
                <ul className="mt-1 space-y-0.5 pl-4">
                  {(no.filhos ?? []).map((f) => {
                    const IconeTela = iconeDoMenu(f.icone);
                    return (
                      <li
                        key={f.chave}
                        className="flex h-8 items-center gap-2 rounded-md px-3 text-[13px]"
                        style={
                          f.chave === TELA_ATUAL
                            ? selecionado
                            : { background: aparencia.subitemFundo, color: aparencia.subitemTexto }
                        }
                      >
                        <IconeTela className="h-3 w-3 shrink-0" aria-hidden />
                        <span className="truncate">{t(f.rotuloI18n)}</span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
