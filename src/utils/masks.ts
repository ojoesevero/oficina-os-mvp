// Utilitários de Máscaras Automáticas para Inputs do JS OrçaFácil

/**
 * Máscara para Placa Veicular (Mercosul ou Tradicional)
 * Padrão Mercosul: ABC1D23
 * Padrão Tradicional: ABC-1234
 */
export function maskPlaca(value: string): string {
  if (!value) return '';
  // Limpa caracteres inválidos e passa para maiúsculo
  const clean = value.toUpperCase().replace(/[^A-Z0-9]/g, '');

  // Primeiras 3 posições devem ser letras
  const letras = clean.slice(0, 3).replace(/[^A-Z]/g, '');
  const resto = clean.slice(3, 7);

  if (clean.length <= 3) {
    return letras;
  }

  // Verifica se o 5º caractere (índice 4 da placa original, índice 1 do resto) é letra (Mercosul: ABC1D23) ou número (Tradicional: ABC1234 -> ABC-1234)
  if (resto.length >= 2) {
    const char5 = resto[1]; // se letra -> Mercosul, se número -> Tradicional com hífen
    const isLetra = /[A-Z]/.test(char5);

    if (isLetra) {
      // Padrão Mercosul: ABC1D23 (sem hífen)
      return `${letras}${resto.slice(0, 4)}`;
    } else if (/[0-9]/.test(char5)) {
      // Padrão Tradicional: ABC-1234
      return `${letras}-${resto.slice(0, 4)}`;
    }
  }

  return `${letras}${resto}`;
}

/**
 * Remove formatação da placa para gravação limpa no banco (ex: ABC1D23 ou ABC1234)
 */
export function unmaskPlaca(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, '');
}

/**
 * Máscara para Telefone / Celular WhatsApp Brasileiro
 * Formatos:
 * (11) 99999-9999 (11 dígitos)
 * (11) 9999-9999  (10 dígitos)
 */
export function maskPhone(value: string): string {
  if (!value) return '';
  const digits = value.replace(/\D/g, '').slice(0, 11);

  if (digits.length === 0) return '';
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  // Celular 9 dígitos: (11) 99999-9999
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
}

/**
 * Remove formatação de telefone mantendo apenas números
 */
export function unmaskPhone(value: string): string {
  return value.replace(/\D/g, '');
}

/**
 * Máscara para Quilometragem (KM) com separador de milhar
 * Ex: 48500 -> 48.500
 */
export function maskKM(value: string | number): string {
  if (value === '' || value === null || value === undefined) return '';
  const digits = value.toString().replace(/\D/g, '');
  if (!digits) return '';
  return Number(digits).toLocaleString('pt-BR');
}

/**
 * Remove máscara de KM retornando número puro
 */
export function unmaskKM(value: string): number {
  const digits = value.replace(/\D/g, '');
  return digits ? Number(digits) : 0;
}
