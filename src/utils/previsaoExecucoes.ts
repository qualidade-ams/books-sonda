const JANELA_MS = 24 * 60 * 60 * 1000;
const QUANTIDADE_FALLBACK = 5;

/**
 * Escolhe o que mostrar na pré-visualização do agendamento: todas as execuções
 * das próximas 24 horas (um dia inteiro da regra). Se não houver nenhuma nesse
 * período — comum em agendamento semanal ou mensal —, mostra as próximas 5.
 */
export function execucoesParaPrevisao(
  execucoes: string[],
  agora: Date = new Date()
): { periodo: '24h' | 'proximas'; execucoes: string[] } {
  const limite = agora.getTime() + JANELA_MS;
  const noDia = execucoes.filter((iso) => new Date(iso).getTime() <= limite);

  if (noDia.length > 0) return { periodo: '24h', execucoes: noDia };
  return { periodo: 'proximas', execucoes: execucoes.slice(0, QUANTIDADE_FALLBACK) };
}
