const formatadorDataHora = new Intl.DateTimeFormat('pt-BR', {
  timeZone: 'America/Sao_Paulo',
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
});

/** Formata uma data ISO como "dd/MM/yyyy HH:mm" no horário de Brasília */
export function formatarDataHoraEnvio(dataIso: string): string {
  const data = new Date(dataIso);
  if (isNaN(data.getTime())) return '-';
  return formatadorDataHora.format(data).replace(',', '');
}
