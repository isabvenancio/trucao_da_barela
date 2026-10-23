/** Utilitários de credencial e código de sala, com a Web Crypto padrão (Node 20+ e navegadores). */

/** RN-020: sem caracteres ambíguos (O/0, I/1/L). */
export const ALFABETO_CODIGO = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

function bytesAleatorios(n: number): Uint8Array {
  const b = new Uint8Array(n);
  crypto.getRandomValues(b);
  return b;
}

export function gerarCodigo(): string {
  return Array.from(bytesAleatorios(6), (b) => ALFABETO_CODIGO[b % ALFABETO_CODIGO.length]).join('');
}

export function normalizarCodigo(codigo: string): string {
  return codigo.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
}

/** RNF-002: credencial de assento com 128 bits aleatórios. */
export function gerarToken(): string {
  return Array.from(bytesAleatorios(16), (b) => b.toString(16).padStart(2, '0')).join('');
}

/** A credencial é guardada só como hash SHA-256. */
export async function hashToken(token: string): Promise<string> {
  const dados = new TextEncoder().encode(token);
  const digest = await crypto.subtle.digest('SHA-256', dados);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}
