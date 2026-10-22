import { forca } from './baralho.ts';
import { duplaDe } from './mesa.ts';
import type { Assento, Dupla, ResultadoRodada, Rodada, Valor } from './tipos.ts';

/**
 * RN-009: vence a carta mais forte. Comuns de mesmo valor e de duplas diferentes empatam.
 * Se as mais fortes forem da mesma dupla, ela vence e o vencedor é quem jogou primeiro (RN-007).
 * Carta encoberta não tem valor (RN-011); rodada só com encobertas empata.
 */
export function resultadoDaRodada(
  rodada: Pick<Rodada, 'jogadas'>,
  manilha: Valor,
): { resultado: ResultadoRodada; vencedor?: Assento } {
  const abertas = rodada.jogadas.filter((j) => !j.encoberta);
  if (abertas.length === 0) return { resultado: 'empate' };

  const maior = Math.max(...abertas.map((j) => forca(j.carta, manilha)));
  const empatadas = abertas.filter((j) => forca(j.carta, manilha) === maior);
  const duplas = new Set(empatadas.map((j) => duplaDe(j.assento)));
  if (duplas.size > 1) return { resultado: 'empate' };

  const primeira = empatadas[0]!;
  return { resultado: duplaDe(primeira.assento), vencedor: primeira.assento };
}

/** RN-007: quem inicia a próxima rodada — o vencedor, ou em empate quem iniciou a empatada. */
export function inicianteDaProxima(rodada: Rodada): Assento {
  return rodada.vencedor ?? rodada.iniciante;
}

/**
 * RN-010: vencedor da mão a partir dos resultados das rodadas já jogadas.
 * Retorna `undefined` se a mão ainda não está decidida, ou 'empate' se as três empataram.
 */
export function vencedorDaMao(resultados: readonly ResultadoRodada[]): Dupla | 'empate' | undefined {
  const vitorias = (d: Dupla) => resultados.filter((r) => r === d).length;
  if (vitorias(0) >= 2) return 0;
  if (vitorias(1) >= 2) return 1;

  const [r1, r2, r3] = resultados;
  if (r1 === undefined || r2 === undefined) return undefined;

  // 1ª empatada → quem vencer a 2ª; 1ª vencida e 2ª empatada → quem venceu a 1ª.
  if (r1 === 'empate' && r2 !== 'empate') return r2;
  if (r1 !== 'empate' && r2 === 'empate') return r1;

  if (r3 === undefined) return undefined;

  // 1ª e 2ª empatadas → a 3ª decide; três empates → ninguém pontua.
  if (r1 === 'empate' && r2 === 'empate') return r3;
  // 1–1 e 3ª empatada → quem venceu a 1ª.
  return r1;
}
