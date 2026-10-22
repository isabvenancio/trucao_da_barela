import type { Assento, Dupla } from './tipos.ts';

export const ASSENTOS: readonly Assento[] = [0, 1, 2, 3];

/** RN-005: parceiros frente a frente — 0 e 2 formam a dupla 0; 1 e 3, a dupla 1. */
export function duplaDe(assento: Assento): Dupla {
  return (assento % 2) as Dupla;
}

export function parceiroDe(assento: Assento): Assento {
  return ((assento + 2) % 4) as Assento;
}

/** RN-005: o próximo a jogar, no sentido anti-horário. */
export function proximoAssento(assento: Assento): Assento {
  return ((assento + 1) % 4) as Assento;
}

export function outraDupla(dupla: Dupla): Dupla {
  return (1 - dupla) as Dupla;
}

/** Assentos na ordem de jogo a partir de `inicio`. */
export function ordemAPartirDe(inicio: Assento): Assento[] {
  return [0, 1, 2, 3].map((i) => ((inicio + i) % 4) as Assento);
}
