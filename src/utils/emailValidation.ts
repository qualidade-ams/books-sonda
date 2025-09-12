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
