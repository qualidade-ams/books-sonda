export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const isValid = emailRegex.test(email);
  console.log(`Validando e-mail "${email}": ${isValid ? 'VÁLIDO' : 'INVÁLIDO'}`);
  return isValid;
};

export const isSondaEmail = (email: string): boolean => {
  return email.toLowerCase().endsWith('@sonda.com');
};

export const requiresApproval = (email: string): boolean => {
  return !isSondaEmail(email);
};

/**
 * Extrai os endereços de um texto colado (ex.: do Outlook), aceitando "Nome <email>" ou só "email",
 * separados por ";", "," ou quebra de linha. Mesma regex do modal de Faturamento por E-mail.
 */
export const extrairEmailsDeTexto = (texto: string): string[] => {
  const emailRegex = /<([^>]+)>|([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
  const emails: string[] = [];
  let match;

  while ((match = emailRegex.exec(texto)) !== null) {
    const email = (match[1] || match[2]).trim();
    if (email && !emails.includes(email)) emails.push(email);
  }

  return emails;
};
