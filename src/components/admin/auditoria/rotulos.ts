// Textos da Auditoria que dependem do idioma: quem alterou, como o registro é chamado, a área e a data.
import { useTranslation } from 'react-i18next';
import { AREAS } from '@/services/auditoriaService';
import { rotuloMesLocal } from '@/utils/controleTela';
import { identificacaoDoRegistro } from '@/utils/auditoriaTela';
import type { RegistroAuditoria } from '@/types/auditoria';

export function useRotulosAuditoria() {
  const { t, i18n } = useTranslation();
  const a = (chave: string, valores?: Record<string, unknown>) =>
    t(`auditoriaBancosHoras.${chave}`, valores);

  const dataHora = (iso: string) =>
    new Intl.DateTimeFormat(i18n.language, {
      dateStyle: 'short',
      timeStyle: 'short',
      timeZone: 'America/Sao_Paulo',
    }).format(new Date(iso));

  /** Sem nome (sem usuário ou sem permissão para ler o nome): pela origem */
  const quem = (r: RegistroAuditoria) => r.usuario ?? a(`quemAutomatico.${r.origem}`);

  const registro = (r: RegistroAuditoria) => {
    const id = identificacaoDoRegistro(r.dados);
    if (!id) return a('registro.semNome', { id: r.registroId.slice(0, 8) });
    if (id.tipo === 'nome') return id.texto;
    if (id.tipo === 'mes') return rotuloMesLocal(id.mes, i18n.language);
    return a('registro.desde', {
      data: new Intl.DateTimeFormat(i18n.language, { dateStyle: 'short', timeZone: 'UTC' }).format(
        new Date(`${id.data}T12:00:00Z`)
      ),
    });
  };

  /** Tabela sem área conhecida aparece pelo próprio nome */
  const area = (chave: string) => (AREAS.includes(chave) ? a(`areas.${chave}`) : chave);

  return { a, dataHora, quem, registro, area };
}
