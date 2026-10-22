/**
 * Gerador pseudoaleatório com semente (mulberry32).
 * Com a mesma semente, a mesma sequência: testes reproduzem qualquer mão (RNF-008).
 */
export function proximo(estado: number): { valor: number; estado: number } {
  const novo = (estado + 0x6d2b79f5) | 0;
  let t = novo;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  const valor = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  return { valor, estado: novo };
}

/** Inteiro em [0, max). */
export function inteiro(estado: number, max: number): { valor: number; estado: number } {
  const r = proximo(estado);
  return { valor: Math.floor(r.valor * max), estado: r.estado };
}

/** Fisher–Yates sobre uma cópia. */
export function embaralhar<T>(itens: readonly T[], estado: number): { itens: T[]; estado: number } {
  const copia = [...itens];
  let s = estado;
  for (let i = copia.length - 1; i > 0; i--) {
    const r = inteiro(s, i + 1);
    s = r.estado;
    const j = r.valor;
    [copia[i], copia[j]] = [copia[j] as T, copia[i] as T];
  }
  return { itens: copia, estado: s };
}
