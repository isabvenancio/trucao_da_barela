import type { Carta, Naipe, Valor } from './tipos.ts';

/** RN-002: força das cartas comuns, da menor para a maior. */
export const ORDEM_VALORES: readonly Valor[] = ['4', '5', '6', '7', 'Q', 'J', 'K', 'A', '2', '3'];

/** RN-004: força das manilhas por naipe, da menor (picafumo) para a maior (zap). */
export const ORDEM_NAIPES: readonly Naipe[] = ['ouros', 'espadas', 'copas', 'paus'];

/** RN-001: baralho de 40 cartas, sem 8, 9, 10 e coringas. */
export function criarBaralho(): Carta[] {
  const cartas: Carta[] = [];
  for (const naipe of ORDEM_NAIPES) {
    for (const valor of ORDEM_VALORES) cartas.push({ valor, naipe });
  }
  return cartas;
}

/** RN-003: a manilha é o valor seguinte ao da vira, em ciclo (vira 3 → manilha 4). */
export function manilhaDaVira(vira: Carta): Valor {
  const i = ORDEM_VALORES.indexOf(vira.valor);
  return ORDEM_VALORES[(i + 1) % ORDEM_VALORES.length] as Valor;
}

export function ehManilha(carta: Carta, manilha: Valor): boolean {
  return carta.valor === manilha;
}

export function ehZap(carta: Carta, manilha: Valor): boolean {
  return carta.valor === manilha && carta.naipe === 'paus';
}

/**
 * Força comparável de uma carta (RN-002 a RN-004, RN-011).
 * Comuns: 0–9 (naipe não importa). Manilhas: 100–103. Encoberta: -1.
 */
export function forca(carta: Carta, manilha: Valor, encoberta = false): number {
  if (encoberta) return -1;
  if (ehManilha(carta, manilha)) return 100 + ORDEM_NAIPES.indexOf(carta.naipe);
  return ORDEM_VALORES.indexOf(carta.valor);
}

export function mesmaCarta(a: Carta, b: Carta): boolean {
  return a.valor === b.valor && a.naipe === b.naipe;
}

const NOMES_NAIPES: Record<Naipe, string> = { ouros: 'ouros', espadas: 'espadas', copas: 'copas', paus: 'paus' };

export function nomeCarta(carta: Carta): string {
  return `${carta.valor} de ${NOMES_NAIPES[carta.naipe]}`;
}
