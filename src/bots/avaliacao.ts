import { criarBaralho, duplaDe, forca, mesmaCarta, nomeCarta, outraDupla } from '../engine/index.ts';
import type { Assento, Carta, Dupla, ResultadoRodada, VisaoMesa } from '../engine/index.ts';

/** Gerador de números em [0, 1). Injetado para que simulações sejam reproduzíveis. */
export type Aleatorio = () => number;

export interface MinhaCarta {
  indice: number;
  carta: Carta;
  forca: number;
}

/** Cartas da mão do bot com força, da mais fraca para a mais forte. Vazio na mão de ferro. */
export function minhasCartas(visao: VisaoMesa): MinhaCarta[] {
  const lista: MinhaCarta[] = [];
  visao.minhasCartas.forEach((carta, indice) => {
    if (carta) lista.push({ indice, carta, forca: forca(carta, visao.manilha) });
  });
  return lista.sort((a, b) => a.forca - b.forca);
}

/** Força normalizada em [0, 1]: comuns de 0 a 0,8; manilhas de 0,85 (picafumo) a 1 (zap). */
export function forcaNormalizada(f: number): number {
  if (f >= 100) return 0.85 + (f - 100) * 0.05;
  return (f / 9) * 0.8;
}

export interface SituacaoRodada {
  numero: number;
  jogadas: number;
  /** Maior força aberta na mesa nesta rodada (-1 se nenhuma). */
  maior: number;
  assentoMaior?: Assento;
  /** As maiores cartas da mesa são de duplas diferentes. */
  empatada: boolean;
  parceiroGanhando: boolean;
  adversarioGanhando: boolean;
  souUltimo: boolean;
  resultadosAnteriores: ResultadoRodada[];
  vitorias: number;
  derrotas: number;
}

export function situacaoDaRodada(visao: VisaoMesa): SituacaoRodada {
  const rodada = visao.rodadas[visao.rodadas.length - 1]!;
  const abertas = rodada.jogadas.filter((j) => j.carta && !j.encoberta);
  let maior = -1;
  let assentoMaior: Assento | undefined;
  const duplasNoMaior = new Set<Dupla>();
  for (const j of abertas) {
    const f = forca(j.carta!, visao.manilha);
    if (f > maior) {
      maior = f;
      assentoMaior = j.assento;
      duplasNoMaior.clear();
    }
    if (f === maior) duplasNoMaior.add(duplaDe(j.assento));
  }
  const empatada = duplasNoMaior.size > 1;
  const ganhando = !empatada && assentoMaior !== undefined ? duplaDe(assentoMaior) : undefined;
  const resultadosAnteriores = visao.rodadas.slice(0, -1).map((r) => r.resultado!);
  return {
    numero: visao.rodadas.length,
    jogadas: rodada.jogadas.length,
    maior,
    assentoMaior,
    empatada,
    parceiroGanhando: ganhando === visao.dupla,
    adversarioGanhando: ganhando === outraDupla(visao.dupla),
    souUltimo: rodada.jogadas.length === 3,
    resultadosAnteriores,
    vitorias: resultadosAnteriores.filter((r) => r === visao.dupla).length,
    derrotas: resultadosAnteriores.filter((r) => r === outraDupla(visao.dupla)).length,
  };
}

/**
 * Cartas que o bot ainda não viu: baralho menos a própria mão, a vira e as cartas abertas da mão atual.
 * Usa apenas a visão do assento (RN-019).
 */
export function cartasNaoVistas(visao: VisaoMesa): Carta[] {
  const vistas: Carta[] = [visao.vira];
  for (const c of visao.minhasCartas) if (c) vistas.push(c);
  for (const r of visao.rodadas) for (const j of r.jogadas) if (j.carta) vistas.push(j.carta);
  const chaves = new Set(vistas.map(nomeCarta));
  return criarBaralho().filter((c) => !chaves.has(nomeCarta(c)));
}

/** Total de cartas que os dois adversários ainda têm na mão. */
export function cartasDosAdversarios(visao: VisaoMesa): number {
  return visao.quantidadeCartas.filter((_, a) => duplaDe(a as Assento) !== visao.dupla).reduce((s, n) => s + n, 0);
}

/**
 * Probabilidade de nenhuma carta dos adversários superar `carta`, supondo que as cartas não vistas
 * estão distribuídas ao acaso: P = C(U−k, h) / C(U, h), com k cartas mais fortes entre U não vistas
 * e h cartas nas mãos adversárias.
 */
export function probabilidadeImbativel(carta: Carta, visao: VisaoMesa): number {
  const naoVistas = cartasNaoVistas(visao).filter((c) => !mesmaCarta(c, carta));
  const minha = forca(carta, visao.manilha);
  const k = naoVistas.filter((c) => forca(c, visao.manilha) > minha).length;
  const U = naoVistas.length;
  const h = Math.min(cartasDosAdversarios(visao), U);
  let p = 1;
  for (let i = 0; i < h; i++) p *= Math.max(0, U - k - i) / (U - i);
  return p;
}

/** Pontos que a dupla adversária ganha se a nossa correr agora. */
export function adversarioVenceSeCorrermos(visao: VisaoMesa): boolean {
  return visao.placar[outraDupla(visao.dupla)] + visao.valorMao >= 12;
}
