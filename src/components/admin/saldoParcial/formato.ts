// Data e hora da aba Saldo Parcial, sempre no horário de Brasília
export const dataHoraBrasilia = (iso: string, idioma: string) =>
  new Intl.DateTimeFormat(idioma, {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'America/Sao_Paulo',
  }).format(new Date(iso));
