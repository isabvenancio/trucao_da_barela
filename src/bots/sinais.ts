import { aplicarAcao, ehManilha, forca, visaoDoAssento } from '../engine/index.ts';
import type { Assento, Carta, Dificuldade, EstadoPartida, Evento, Naipe, Sinal, VisaoMesa } from '../engine/index.ts';
import type { Aleatorio } from './avaliacao.ts';

const SINAL_DA_MANILHA: Record<Naipe, Sinal> = { paus: 'zap', copas: 'copas', espadas: 'espadilha', ouros: 'picafumo' };
const SINAL_COMUM: Partial<Record<Carta['valor'], Sinal>> = { '3': 'tres', '2': 'dois', A: 'as' };

/** O sinal que descreve uma carta (manilha pelo naipe; 3, 2 e ás pelo valor). */
export function sinalDaCarta(carta: Carta, manilha: Carta['valor']): Sinal | undefined {
  return ehManilha(carta, manilha) ? SINAL_DA_MANILHA[carta.naipe] : SINAL_COMUM[carta.valor];
}

/**
 * RN-027 / CA-024.3: sinais honestos que o bot faz no início da mão — as duas melhores cartas
 * que têm sinal, ou "nada" se não tiver nenhuma. O fácil às vezes esquece de sinalizar.
 */
export function sinaisDoBot(visao: VisaoMesa, nivel: Dificuldade, aleatorio: Aleatorio): Sinal[] {
  if (visao.meusSinais.length > 0 || visao.sinaisDisponiveis.length === 0) return [];
  // A dupla que decide a mão de onze já vê as cartas do parceiro: sinal não acrescenta nada.
  if (visao.cartasParceiro) return [];
  if (nivel === 'facil' && aleatorio() < 0.5) return [];
  const cartas = visao.minhasCartas.filter((c): c is Carta => c !== null);
  const sinais = cartas
    .sort((a, b) => forca(b, visao.manilha) - forca(a, visao.manilha))
    .map((c) => sinalDaCarta(c, visao.manilha))
    .filter((s): s is Sinal => s !== undefined);
  const escolhidos = [...new Set(sinais)].slice(0, 2);
  const lista = escolhidos.length ? escolhidos : (['nada'] as Sinal[]);
  return lista.filter((s) => visao.sinaisDisponiveis.includes(s));
}

/**
 * Aplica os sinais de início de mão dos assentos controlados por bot. Usado pela partida contra bots
 * e pelo servidor online logo depois de cada distribuição.
 */
export function aplicarSinaisDosBots(
  estado: EstadoPartida,
  nivelDoBot: (assento: Assento) => Dificuldade | undefined,
  aleatorio: Aleatorio = Math.random,
): { estado: EstadoPartida; eventos: Evento[] } {
  let atual = estado;
  const eventos: Evento[] = [];
  for (const assento of [0, 1, 2, 3] as Assento[]) {
    const nivel = nivelDoBot(assento);
    if (!nivel) continue;
    for (const sinal of sinaisDoBot(visaoDoAssento(atual, assento), nivel, aleatorio)) {
      const r = aplicarAcao(atual, { tipo: 'SINALIZAR', assento, sinal });
      if (r.ok) {
        atual = r.estado;
        eventos.push(...r.eventos);
      }
    }
  }
  return { estado: atual, eventos };
}

/** Uma mão nova acabou de começar de verdade (distribuída, ou depois da decisão da mão de onze). */
export function comecouMao(eventos: readonly Evento[]): boolean {
  return eventos.some((e) => e.tipo === 'MAO_DISTRIBUIDA' || e.tipo === 'ONZE_DECIDIDA');
}
