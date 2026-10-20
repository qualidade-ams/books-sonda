import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Bell, CheckCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useNotificacoes } from '@/hooks/useNotificacoes';
import type { Notificacao } from '@/types/notificacoes';

/**
 * Sino do header: pendências das telas em que o usuário tem permissão de Edição.
 * Clicar numa notificação marca como lida e abre a tela da pendência.
 */
const NotificacoesSino: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [aberto, setAberto] = useState(false);
  const { notificacoes, naoLidas, marcarComoLida, marcarTodasComoLidas, isMarcando } = useNotificacoes();

  const abrirNotificacao = (notificacao: Notificacao) => {
    if (!notificacao.lida) {
      // Erro já vira toast no hook; a navegação não depende da leitura
      marcarComoLida(notificacao.id).catch(() => undefined);
    }
    if (notificacao.link) {
      setAberto(false);
      navigate(notificacao.link);
    }
  };

  return (
    <Popover open={aberto} onOpenChange={setAberto}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="relative" aria-label={t('layout.notifications.open')}>
          <Bell className="h-4 w-4" />
          {naoLidas > 0 && (
            <span
              data-testid="notificacoes-contador"
              className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold text-white"
            >
              {naoLidas > 99 ? '99+' : naoLidas}
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent align="end" className="w-[380px] p-0">
        <div className="flex items-center justify-between border-b border-gray-200 dark:border-sonda-gray2 px-4 py-3">
          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">
            {t('layout.notifications.title')}
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => marcarTodasComoLidas().catch(() => undefined)}
            disabled={naoLidas === 0 || isMarcando}
          >
            <CheckCheck className="mr-1 h-3.5 w-3.5" />
            {t('layout.notifications.markAllRead')}
          </Button>
        </div>

        {notificacoes.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-gray-500 dark:text-sonda-gray3">
            {t('layout.notifications.empty')}
          </p>
        ) : (
          <ScrollArea className="max-h-[420px]">
            <ul className="divide-y divide-gray-100 dark:divide-sonda-gray2">
              {notificacoes.map((notificacao) => (
                <li key={notificacao.id}>
                  <button
                    type="button"
                    onClick={() => abrirNotificacao(notificacao)}
                    className={`flex w-full gap-3 px-4 py-3 text-left transition-colors hover:bg-gray-50 dark:hover:bg-sonda-gray2 ${
                      notificacao.lida ? '' : 'bg-blue-50/60 dark:bg-blue-950/30'
                    }`}
                  >
                    <span
                      className={`mt-1.5 h-2 w-2 flex-shrink-0 rounded-full ${notificacao.lida ? 'bg-transparent' : 'bg-blue-600'}`}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-gray-900 dark:text-gray-100">
                        {notificacao.titulo}
                      </span>
                      <span className="mt-0.5 block text-xs text-gray-600 dark:text-sonda-gray3">
                        {notificacao.mensagem}
                      </span>
                      <span className="mt-1 block text-[11px] text-gray-400">
                        {formatDistanceToNow(new Date(notificacao.updated_at), { addSuffix: true, locale: ptBR })}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </ScrollArea>
        )}
      </PopoverContent>
    </Popover>
  );
};

export default NotificacoesSino;
