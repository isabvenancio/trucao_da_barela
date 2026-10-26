import { aplicarAcao, assentoDaVez, criarPartida, visaoDoAssento } from '../engine/index.ts';
import type { Dificuldade, Dupla, EstadoPartida } from '../engine/index.ts';
import { decidirBot } from './index.ts';
import { aplicarSinaisDosBots, comecouMao } from './sinais.ts';

/** Gerador reproduzível (mulberry32) para simulações. */
export function criarAleatorio(semente: number): () => number {
  let s = semente | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), s | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface ResultadoSimulacao {
  partidas: number;
  vitorias: [number, number];
  acoesInvalidas: number;
  fallbacks: number;
  maos: number;
  maiorTempoDecisaoMs: number;
}

export interface OpcoesSimulacao {
  /** Quais duplas trocam sinais (RN-027). Padrão: as duas. */
  sinais?: [boolean, boolean];
}

/**
 * Joga partidas inteiras bot × bot (fase 3 do plano). `niveis[i]` é o nível do assento i;
 * dupla 0 = assentos 0 e 2, dupla 1 = assentos 1 e 3.
 */
export function simular(
  niveis: [Dificuldade, Dificuldade, Dificuldade, Dificuldade],
  partidas: number,
  semente = 1,
  opcoes: OpcoesSimulacao = {},
): ResultadoSimulacao {
  const comSinais = opcoes.sinais ?? [true, true];
  const resultado: ResultadoSimulacao = {
    partidas,
    vitorias: [0, 0],
    acoesInvalidas: 0,
    fallbacks: 0,
    maos: 0,
    maiorTempoDecisaoMs: 0,
  };
  const aleatorio = criarAleatorio(semente);

  for (let p = 0; p < partidas; p++) {
    const participantes = niveis.map((dificuldade, i) => ({
      nome: `Bot ${i}`,
      avatar: 'padrao',
      tipo: 'bot' as const,
      dificuldade,
    })) as EstadoPartida['participantes'];
    const sinalizar = (e: EstadoPartida) =>
      aplicarSinaisDosBots(e, (a) => (comSinais[(a % 2) as Dupla] ? niveis[a] : undefined), aleatorio).estado;
    let estado = sinalizar(criarPartida({ participantes, semente: semente * 100_003 + p }).estado);
    let passos = 0;

    while (estado.fase === 'jogando') {
      const assento = assentoDaVez(estado)!;
      const inicio = performance.now();
      const decisao = decidirBot(visaoDoAssento(estado, assento), niveis[assento], aleatorio)!;
      resultado.maiorTempoDecisaoMs = Math.max(resultado.maiorTempoDecisaoMs, performance.now() - inicio);
      if (decisao.fallback) resultado.fallbacks++;
      const r = aplicarAcao(estado, decisao.acao);
      if (!r.ok) {
        resultado.acoesInvalidas++;
        break;
      }
      resultado.maos += r.eventos.filter((e) => e.tipo === 'MAO_ENCERRADA').length;
      estado = comecouMao(r.eventos) ? sinalizar(r.estado) : r.estado;
      if (++passos > 10_000) throw new Error('Partida simulada não terminou');
    }
    if (estado.vencedora !== undefined) resultado.vitorias[estado.vencedora as Dupla]++;
  }
  return resultado;
}
