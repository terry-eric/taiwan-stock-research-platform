// Supported listed/OTC products, not arbitrary six-digit warrants.
export const SECURITY_CODE_SOURCE = '(?:[0-9]{4}|00[0-9]{2,4}[A-Z]?)';
export const isSupportedSecurityCode = code => new RegExp('^' + SECURITY_CODE_SOURCE + '$').test(String(code || ''));
export function securityCodeFromInput(value) {
  const token = String(value || '').trim().toUpperCase().split(/\s+/)[0];
  return isSupportedSecurityCode(token) ? token : '';
}
