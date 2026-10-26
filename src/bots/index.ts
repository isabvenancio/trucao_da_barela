import type { Acao, Dificuldade, VisaoMesa } from '../engine/index.ts';
import type { Aleatorio } from './avaliacao.ts';
import { estrategia } from './estrategias.ts';

export type { Aleatorio } from './avaliacao.ts';
export { aplicarSinaisDosBots, comecouMao, sinaisDoBot, sinalDaCarta } from './sinais.ts';

function mesmaAcao(a: Acao, b: Acao): boolean {
  if (a.tipo !== b.tipo || a.assento !== b.assento) return false;
  if (a.tipo === 'JOGAR_CARTA' && b.tipo === 'JOGAR_CARTA') return a.indice === b.indice && !!a.encoberta === !!b.encoberta;
  if (a.tipo === 'RESPONDER_TRUCO' && b.tipo === 'RESPONDER_TRUCO') return a.resposta === b.resposta;
  if (a.tipo === 'DECIDIR_MAO_DE_ONZE' && b.tipo === 'DECIDIR_MAO_DE_ONZE') return a.decisao === b.decisao;
  return true;
}

/**
 * Ação segura quando a estratégia falha (RF-021, alternativa): carta aberta de menor índice,
 * ou correr/jogar conforme a decisão pendente.
 */
function acaoSegura(visao: VisaoMesa): Acao | undefined {
  return (
    visao.acoes.find((a) => a.tipo === 'JOGAR_CARTA' && !a.encoberta) ??
    visao.acoes.find((a) => a.tipo === 'RESPONDER_TRUCO' && a.resposta === 'correr') ??
    visao.acoes.find((a) => a.tipo === 'DECIDIR_MAO_DE_ONZE' && a.decisao === 'jogar') ??
    visao.acoes[0]
  );
}

export interface DecisaoBot {
  acao: Acao;
  /** Verdadeiro se a estratégia propôs algo inválido e a ação segura foi usada. */
  fallback: boolean;
}

/**
 * RF-021: decide a ação de um bot usando SOMENTE a visão do seu assento (RN-018, RN-019).
 * Retorna `undefined` se não houver decisão pendente para esse assento.
 */
export function decidirBot(visao: VisaoMesa, nivel: Dificuldade, aleatorio: Aleatorio = Math.random): DecisaoBot | undefined {
  if (visao.acoes.length === 0) return undefined;
  let proposta: Acao | undefined;
  try {
    proposta = estrategia(visao, nivel, aleatorio);
  } catch {
    proposta = undefined;
  }
  if (proposta && visao.acoes.some((a) => mesmaAcao(a, proposta!))) return { acao: proposta, fallback: false };
  return { acao: acaoSegura(visao)!, fallback: true };
}
